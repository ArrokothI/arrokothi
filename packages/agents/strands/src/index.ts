/**
 * ArrokothI integrations for the Strands Agents SDK.
 *
 * Two surfaces live here, and they are not the same generation of the architecture.
 *
 * `createStrandsAgentExecutor` is the v0.4 bridge: it satisfies the ArrokothI `AgentExecutor`
 * contract, resolves its model through an ArrokothI `ModelProvider`, and pauses the framework
 * before any native tool execution so that every operation still crosses the Harness. See
 * [`agent-executor.ts`](agent-executor.ts).
 *
 * `StrandsLoopEngine` is the pre-v0.4 `AgentLoopEngine`, retained while its consumers - the
 * benchmark subjects, the examples, and Studio - are still on the legacy Session path. It routes
 * capability requests through the old gateway callback and constructs a first-party Google model
 * when no model is supplied; neither is acceptable under the v0.4 boundary, which is why it is
 * being replaced rather than extended. It is deleted once those consumers migrate.
 */

export { createStrandsAgentExecutor } from "./agent-executor.ts";
export type { StrandsAgentExecutorOptions } from "./agent-executor.ts";
export { ArrokothStrandsModel } from "./model.ts";
export type { ArrokothModelOptions } from "./model.ts";

import type {
  AgentLoopCapabilityRequest,
  AgentLoopCapabilityResult,
  AgentLoopEngine,
  AgentLoopInput,
  AgentLoopMetrics,
  AgentLoopResult,
  CapabilityDefinition,
  ModelPolicy,
  RuntimeDecision,
} from "@agent-sdk/core";
import { toJsonSchema } from "@agent-sdk/core";
import {
  Agent,
  AfterInvocationEvent,
  AfterModelCallEvent,
  AfterToolCallEvent,
  BeforeInvocationEvent,
  BeforeModelCallEvent,
  BeforeToolCallEvent,
  FunctionTool,
  InterventionActions,
  InterventionHandler,
  InvokeModelStage,
  SummarizingConversationManager,
  type InvocationState,
  type JSONValue,
  type LocalAgent,
  type MessageData,
  type Model,
} from "@strands-agents/sdk";
import { GoogleModel, type GoogleModelOptions } from "@strands-agents/sdk/models/google";

export const STRANDS_INTEGRATION_VERSION = "0.37.0";
export const SUPPORTED_STRANDS_SDK_VERSION = "1.14.0";

const STATE_KEY = "agentSdk";

interface AgentSdkInvocationData {
  executionContext: AgentLoopInput["executionContext"];
  currentIteration: number;
  guideRetries: number;
  modelCalls: number;
  toolRequests: number;
  mutationVersion: number;
  runtimeContextKeysRead: string[];
  outcomes: Map<string, AgentLoopCapabilityResult>;
  preliminary: Map<string, RuntimeDecision>;
  confirmPrompt?: string;
  terminalOverride?: string;
}

export interface StrandsLoopEngineOptions {
  /** Explicit Strands model or factory. Credentials/configuration remain outside AgentDefinition. */
  model?: Model | ((policy: ModelPolicy) => Model);
  /** Conservative inner-loop history settings. Proactive compression is disabled by default. */
  conversation?: {
    preserveRecentMessages?: number;
    summaryRatio?: number;
    pinFirst?: number;
    proactiveCompression?: boolean;
  };
}

export interface StrandsGeminiOptions extends Omit<StrandsLoopEngineOptions, "model"> {
  /** Omit to use GEMINI_API_KEY. */
  apiKey?: string;
  /** Optional Google-model overrides; AgentDefinition.model remains the default model id. */
  google?: Omit<GoogleModelOptions, "apiKey" | "modelId">;
}

/** Convenience wiring for Gemini through Strands' first-party Google model implementation. */
export function createStrandsGeminiEngine(options: StrandsGeminiOptions = {}): StrandsLoopEngine {
  return new StrandsLoopEngine({
    ...options,
    model: (policy) => new GoogleModel({
      ...options.google,
      apiKey: options.apiKey,
      modelId: policy.model,
      params: {
        ...options.google?.params,
        ...(policy.temperature !== undefined ? { temperature: policy.temperature } : {}),
        ...(policy.maxOutputTokens !== undefined ? { maxOutputTokens: policy.maxOutputTokens } : {}),
      },
    }),
  });
}

/** Canonical production agentic engine. Strands types remain contained in this package. */
export class StrandsLoopEngine implements AgentLoopEngine {
  readonly name = "strands-loop";
  private readonly options: StrandsLoopEngineOptions;

  constructor(options: StrandsLoopEngineOptions = {}) {
    this.options = options;
  }

  async run(input: AgentLoopInput): Promise<AgentLoopResult> {
    const model = this.resolveModel(input.modelPolicy);
    const metrics: AgentLoopMetrics = {
      iterations: 0,
      modelCalls: 0,
      guideRetryCalls: 0,
      conversationSummaryCalls: 0,
      toolRequests: 0,
    };
    const conversationManager = new TracedSummarizingConversationManager(
      {
        preserveRecentMessages: this.options.conversation?.preserveRecentMessages ?? 10,
        summaryRatio: this.options.conversation?.summaryRatio ?? 0.3,
        pinFirst: this.options.conversation?.pinFirst ?? 1,
        proactiveCompression: this.options.conversation?.proactiveCompression ?? false,
      },
      (beforeMessages, afterMessages, usedModel) => {
        metrics.conversationSummaryCalls += usedModel ? 1 : 0;
        input.onTrace?.({
          kind: "conversation_compacted",
          strategy: "strands:summarizing-conversation-manager",
          beforeMessages,
          afterMessages,
          summaryModelCalls: usedModel ? 1 : 0,
        });
      },
    );
    const invocationState: InvocationState = {
      [STATE_KEY]: {
        executionContext: input.executionContext,
        currentIteration: 0,
        guideRetries: 0,
        modelCalls: 0,
        toolRequests: 0,
        mutationVersion: 0,
        runtimeContextKeysRead: [],
        outcomes: new Map<string, AgentLoopCapabilityResult>(),
        preliminary: new Map<string, RuntimeDecision>(),
      } satisfies AgentSdkInvocationData,
    };
    const data = stateData(invocationState);
    const agent = new Agent({
      id: `${input.context.agentId}:${input.context.agentVersion}`,
      name: input.context.agentId,
      model,
      printer: false,
      systemPrompt: input.context.system,
      messages: initialMessages(input),
      tools: makeTools(input.capabilities().capabilities),
      interventions: [
        new AgentSdkEvaluationIntervention(input),
        new AgentSdkGatewayIntervention(input),
        new AgentSdkTerminalIntervention(input),
      ],
      conversationManager,
    });

    this.installHooks(agent, input, metrics);
    agent.addMiddleware(InvokeModelStage.Input, (context) => {
      const refreshed = input.refreshContext?.(stateData(context.invocationState).currentIteration);
      return {
        ...context,
        ...(refreshed ? { systemPrompt: refreshed.system } : {}),
        toolSpecs: input.capabilities().capabilities.map((capability) => capabilitySpec(capability)),
      };
    });

    let result;
    try {
      result = await agent.invoke(invocationPrompt(input), {
        invocationState,
        cancelSignal: input.signal,
        limits: {
          turns: Math.max(1, input.limits.maxIterations),
          outputTokens: input.limits.maxOutputTokens,
        },
      });
    } catch (error) {
      const stopReason = input.signal?.aborted ? "cancelled" : "error";
      const providerStopReason = error instanceof Error ? error.message : String(error);
      input.onTrace?.({ kind: "lifecycle", event: "execution_error", detail: { providerStopReason } });
      input.onTrace?.({ kind: "execution_terminated", stopReason });
      return {
        replyText: stopReason === "cancelled"
          ? "The execution was cancelled before this turn completed. Nothing unconfirmed was executed."
          : "The execution engine stopped safely before completing this turn. Nothing unconfirmed was executed.",
        stopReason,
        metrics,
        providerStopReason,
      };
    }

    metrics.iterations = Math.max(data.currentIteration, result.metrics?.latestAgentInvocation?.cycles.length ?? 0);
    metrics.modelCalls = data.modelCalls;
    metrics.guideRetryCalls = data.guideRetries;
    metrics.toolRequests = data.toolRequests;
    const providerStopReason = result.stopReason;
    const stopReason = mapStopReason(providerStopReason, data);
    const replyText = (data.confirmPrompt ?? data.terminalOverride ?? result.toString().trim())
      || "The agent ended without a usable response. Nothing unconfirmed was executed.";
    input.onTrace?.({ kind: "execution_terminated", stopReason });
    return { replyText, stopReason, metrics, providerStopReason };
  }

  private resolveModel(policy: ModelPolicy): Model {
    if (typeof this.options.model === "function") return this.options.model(policy);
    if (this.options.model) return this.options.model;
    if (policy.providerId === "gemini" || policy.providerId === "google") {
      return new GoogleModel({
        modelId: policy.model,
        params: {
          ...(policy.temperature !== undefined ? { temperature: policy.temperature } : {}),
          ...(policy.maxOutputTokens !== undefined ? { maxOutputTokens: policy.maxOutputTokens } : {}),
        },
      });
    }
    throw new Error(`no Strands model resolver configured for providerId=${policy.providerId}`);
  }

  private installHooks(agent: Agent, input: AgentLoopInput, metrics: AgentLoopMetrics): void {
    agent.addHook(BeforeInvocationEvent, (event) => {
      stateData(event.invocationState).mutationVersion++;
      input.onTrace?.({ kind: "lifecycle", event: "before_invocation" });
    });
    agent.addHook(AfterInvocationEvent, (event) => {
      const data = stateData(event.invocationState);
      input.onTrace?.({
        kind: "lifecycle",
        event: "after_invocation",
        detail: { mutationVersion: data.mutationVersion, runtimeContextKeysRead: data.runtimeContextKeysRead },
      });
    });
    agent.addHook(BeforeModelCallEvent, (event) => {
      const data = stateData(event.invocationState);
      data.currentIteration++;
      syncTools(event.agent, input.capabilities().capabilities);
      input.onTrace?.({ kind: "lifecycle", event: "before_model", iteration: data.currentIteration });
      input.onTrace?.({
        kind: "iteration_started",
        iteration: data.currentIteration,
        capabilityNames: input.capabilities().capabilities.map((capability) => capability.name),
      });
    });
    agent.addHook(AfterModelCallEvent, (event) => {
      const data = stateData(event.invocationState);
      data.modelCalls++;
      metrics.modelCalls = data.modelCalls;
      const usage = event.stopData?.message.metadata?.usage;
      input.onTrace?.({ kind: "lifecycle", event: "after_model", iteration: data.currentIteration });
      input.onTrace?.({
        kind: "model_call_completed",
        iteration: data.currentIteration,
        providerId: `strands:${input.modelPolicy.providerId}`,
        model: event.model.modelId ?? input.modelPolicy.model,
        usage: usage ? { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens } : undefined,
        stopReason: event.stopData?.stopReason,
        durationMs: event.stopData?.message.metadata?.metrics?.latencyMs,
      });
    });
    agent.addHook(BeforeToolCallEvent, (event) => {
      input.onTrace?.({ kind: "lifecycle", event: "before_tool", iteration: stateData(event.invocationState).currentIteration, capabilityName: event.toolUse.name });
    });
    agent.addHook(AfterToolCallEvent, (event) => {
      const data = stateData(event.invocationState);
      input.onTrace?.({
        kind: "lifecycle",
        event: "after_tool",
        iteration: data.currentIteration,
        capabilityName: event.toolUse.name,
        detail: { mutationVersion: data.mutationVersion, runtimeContextKeysRead: data.runtimeContextKeysRead },
      });
    });
  }
}

/** First intervention pass: application/runtime guidance and conservative transforms. */
class AgentSdkEvaluationIntervention extends InterventionHandler {
  readonly name = "agent-sdk:evaluation";
  private readonly input: AgentLoopInput;
  constructor(input: AgentLoopInput) {
    super();
    this.input = input;
  }

  override async beforeToolCall(event: BeforeToolCallEvent) {
    if (!this.input.evaluateCapability) return InterventionActions.proceed();
    const data = stateData(event.invocationState);
    const proposed = await this.input.evaluateCapability(requestFromEvent(event, data.currentIteration));
    const decision: RuntimeDecision = proposed.kind === "confirm"
      ? {
          kind: "deny",
          code: "confirmation_not_gateway_owned",
          reason: "Only CapabilityGateway may request confirmation because it must first persist an authoritative PendingAction.",
        }
      : proposed;
    data.preliminary.set(event.toolUse.toolUseId, decision);
    this.input.onTrace?.({ kind: "runtime_decision", iteration: data.currentIteration, name: event.toolUse.name, decision });
    return actionForDecision(decision, event, data, this.input);
  }
}

/** Second pass: the sole bridge to Agent_SDK CapabilityGateway/ToolExecutor authority. */
class AgentSdkGatewayIntervention extends InterventionHandler {
  readonly name = "agent-sdk:gateway";
  private readonly input: AgentLoopInput;
  constructor(input: AgentLoopInput) {
    super();
    this.input = input;
  }

  override async beforeToolCall(event: BeforeToolCallEvent) {
    const data = stateData(event.invocationState);
    const preliminary = data.preliminary.get(event.toolUse.toolUseId);
    if (preliminary && preliminary.kind !== "proceed" && preliminary.kind !== "transform") {
      return InterventionActions.proceed({ reason: "Agent_SDK preliminary intervention already resolved this request" });
    }
    const request = requestFromEvent(event, data.currentIteration);
    data.toolRequests++;
    data.mutationVersion++;
    this.input.onTrace?.({ kind: "capability_requested", iteration: data.currentIteration, name: request.name });
    const result = await this.input.requestCapability(request);
    data.outcomes.set(event.toolUse.toolUseId, result);
    this.input.onTrace?.({ kind: "runtime_decision", iteration: data.currentIteration, name: request.name, decision: result.decision });
    return actionForDecision(result.decision, event, data, this.input);
  }
}

/** Mechanically checkable terminal rules reuse Strands' after-model Guide retry. */
class AgentSdkTerminalIntervention extends InterventionHandler {
  readonly name = "agent-sdk:terminal-validation";
  private readonly input: AgentLoopInput;
  constructor(input: AgentLoopInput) {
    super();
    this.input = input;
  }

  override async afterModelCall(event: AfterModelCallEvent) {
    const data = stateData(event.invocationState);
    if (!this.input.validateTerminalResponse || !event.stopData || hasToolUse(event.stopData.message.content)) {
      return InterventionActions.proceed();
    }
    const text = textFromContent(event.stopData.message.content);
    const decision = await this.input.validateTerminalResponse(text);
    if (decision.kind === "guide" && data.guideRetries < this.input.limits.maxGuideRetries) {
      data.guideRetries++;
      this.input.onTrace?.({ kind: "guide_retry", iteration: data.currentIteration, retry: data.guideRetries, feedback: decision.feedback });
      return InterventionActions.guide(decision.feedback, { reason: decision.code });
    }
    if (decision.kind === "deny") data.terminalOverride = decision.reason;
    if (decision.kind === "transform") data.terminalOverride = String(decision.input["text"] ?? text);
    return InterventionActions.proceed();
  }
}

function actionForDecision(
  decision: RuntimeDecision,
  event: BeforeToolCallEvent,
  data: AgentSdkInvocationData,
  input: AgentLoopInput,
) {
  switch (decision.kind) {
    case "proceed":
      return InterventionActions.proceed();
    case "deny":
      return InterventionActions.deny(`${decision.code}: ${decision.reason}`);
    case "guide":
      if (data.guideRetries >= input.limits.maxGuideRetries) {
        return InterventionActions.deny(`guide_retry_limit: ${decision.feedback}`);
      }
      data.guideRetries++;
      input.onTrace?.({ kind: "guide_retry", iteration: data.currentIteration, retry: data.guideRetries, feedback: decision.feedback });
      return InterventionActions.guide(decision.feedback, { reason: decision.code });
    case "confirm":
      data.confirmPrompt = decision.promptText;
      return InterventionActions.confirm(decision.promptText, { reason: `pending_action:${decision.requestId}` });
    case "transform":
      return InterventionActions.transform(() => {
        event.toolUse.input = asJsonValue(decision.input);
      }, { reason: `${decision.reason}; revalidate=true; fresh_confirmation=${decision.requiresFreshConfirmation}` });
  }
}

class TracedSummarizingConversationManager extends SummarizingConversationManager {
  private readonly onReduced: (beforeMessages: number, afterMessages: number, usedModel: boolean) => void;
  constructor(
    config: ConstructorParameters<typeof SummarizingConversationManager>[0],
    onReduced: (beforeMessages: number, afterMessages: number, usedModel: boolean) => void,
  ) {
    super(config);
    this.onReduced = onReduced;
  }

  override async reduce(options: Parameters<SummarizingConversationManager["reduce"]>[0]): Promise<boolean> {
    const before = options.agent.messages.length;
    const reduced = await super.reduce(options);
    const after = options.agent.messages.length;
    if (reduced || after !== before) this.onReduced(before, after, reduced);
    return reduced;
  }
}

function makeTools(capabilities: CapabilityDefinition[]): FunctionTool[] {
  return capabilities.map((capability) => new FunctionTool({
    name: capability.name,
    description: capability.modelSpec.description,
    inputSchema: toJsonSchema(capability.modelSpec.input),
    callback: (_args, context) => {
      const data = stateData(context.invocationState);
      data.mutationVersion++;
      // Deliberately dereference the out-of-band values to prove adapters can use them, while
      // recording and returning only key names so secrets never enter model context or trace data.
      data.runtimeContextKeysRead = Object.values(data.executionContext.invocationHostContext)
        .filter((entry) => entry.value !== undefined)
        .map((entry) => entry.key)
        .sort();
      const result = data.outcomes.get(context.toolUse.toolUseId);
      if (!result || result.decision.kind !== "proceed") {
        return { ok: false, code: "missing_gateway_authorization" };
      }
      return asJsonValue(result.observation ?? { ok: true });
    },
  }));
}

function syncTools(agent: LocalAgent, capabilities: CapabilityDefinition[]): void {
  const wanted = new Set(capabilities.map((capability) => capability.name));
  for (const tool of agent.toolRegistry.list()) {
    if (!wanted.has(tool.name)) agent.toolRegistry.remove(tool.name);
  }
  agent.toolRegistry.addOrReplace(makeTools(capabilities));
}

function capabilitySpec(capability: CapabilityDefinition) {
  return {
    name: capability.name,
    description: capability.modelSpec.description,
    inputSchema: toJsonSchema(capability.modelSpec.input),
  };
}

function requestFromEvent(event: BeforeToolCallEvent, iteration: number): AgentLoopCapabilityRequest {
  return { name: event.toolUse.name, input: asRecord(event.toolUse.input), iteration: Math.max(1, iteration) };
}

function stateData(state: InvocationState): AgentSdkInvocationData {
  const data = state[STATE_KEY];
  if (!data || typeof data !== "object") throw new Error("Agent_SDK InvocationState was not initialized");
  return data as AgentSdkInvocationData;
}

function initialMessages(input: AgentLoopInput): MessageData[] {
  return input.context.messages.slice(0, -1)
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({ role: message.role as "user" | "assistant", content: [{ text: message.content }] }));
}

function invocationPrompt(input: AgentLoopInput): string {
  const latest = input.context.messages.at(-1);
  return latest?.role === "user" ? latest.content : "Continue this turn using the authoritative context above.";
}

function mapStopReason(reason: string, data: AgentSdkInvocationData): AgentLoopResult["stopReason"] {
  if (data.confirmPrompt || reason === "interrupt") return "awaiting_confirmation";
  if (reason === "cancelled") return "cancelled";
  if (reason === "limitTurns") return "max_iterations";
  if (["endTurn", "stopSequence"].includes(reason)) return "end_turn";
  return "error";
}

function hasToolUse(content: readonly { type: string }[]): boolean {
  return content.some((block) => block.type === "toolUseBlock");
}

function textFromContent(content: readonly unknown[]): string {
  return content
    .map((block) => block && typeof block === "object" && "type" in block && block.type === "textBlock" && "text" in block ? String(block.text) : "")
    .filter(Boolean)
    .join("\n");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asJsonValue(value: unknown): JSONValue {
  return JSON.parse(JSON.stringify(value)) as JSONValue;
}
