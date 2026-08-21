import {
  CapabilityGateway,
  TwoPassHarness,
  attemptToolCall,
  compileContext,
  hashValue,
  resolvePendingConfirmation,
  type AuthorizeDeps,
  type CapabilityDefinition,
  type CapabilityOutcome,
  type HarnessServices,
  type HarnessTurnInput,
  type HarnessTurnResult,
  type KnowledgeResult,
  type ModelUsage,
  type ObjectSchema,
  type TwoPassOptions,
  type ValueSchema,
} from "@agent-sdk/core";
import {
  createSdkMcpServer,
  query,
  tool,
  type HookCallbackMatcher,
  type Options,
  type SDKMessage,
  type SDKResultMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

export type ExecutionContextPolicy = "fresh_each_turn" | "resume";

export interface ClaudeLifecycleEvent {
  event: "PreToolUse" | "PostToolUse" | "PostToolUseFailure" | "Stop" | "PreCompact" | "PostCompact";
  toolName?: string;
  toolUseId?: string;
  detail?: Record<string, unknown>;
}

export interface ClaudeAgentQueryInput {
  prompt: string;
  systemPrompt: string;
  model: string;
  maxTurns: number;
  capabilities: CapabilityDefinition[];
  signal?: AbortSignal;
  invokeCapability(name: string, args: Record<string, unknown>, iteration: number): Promise<CapabilityOutcome>;
  onLifecycleEvent?(event: ClaudeLifecycleEvent): void;
}

export interface ClaudeAgentQueryResult {
  text: string;
  model: string;
  numTurns: number;
  stopReason?: string | null;
  terminalReason?: string;
  usage?: ModelUsage;
  raw?: unknown;
}

/** Injectable seam used by automated tests; the default implementation calls the official SDK. */
export interface ClaudeExecutionAdapter {
  execute(input: ClaudeAgentQueryInput): Promise<ClaudeAgentQueryResult>;
}

export interface ClaudeAgentHarnessOptions {
  adapter?: ClaudeExecutionAdapter;
  executionContextPolicy?: ExecutionContextPolicy;
  preflight?: TwoPassOptions;
  onLifecycleEvent?: (event: ClaudeLifecycleEvent) => void;
}

/**
 * Optional Claude-specific execution Harness. Core remains provider-neutral; this package alone
 * imports Claude Agent SDK. Every custom capability still enters the core CapabilityGateway.
 */
export class ClaudeAgentHarness extends TwoPassHarness {
  override readonly name = "claude-agent-v0.3";
  readonly executionContextPolicy: ExecutionContextPolicy;
  private readonly adapter: ClaudeExecutionAdapter;
  private readonly onLifecycleEvent?: (event: ClaudeLifecycleEvent) => void;

  constructor(options: ClaudeAgentHarnessOptions = {}) {
    super(options.preflight);
    this.executionContextPolicy = options.executionContextPolicy ?? "fresh_each_turn";
    if (this.executionContextPolicy !== "fresh_each_turn") {
      throw new Error("ClaudeAgentHarness v0.3 supports only executionContextPolicy=fresh_each_turn; cross-turn resume is deferred to v0.4");
    }
    this.adapter = options.adapter ?? new ClaudeSdkExecutionAdapter();
    this.onLifecycleEvent = options.onLifecycleEvent;
  }

  override async runTurn(input: HarnessTurnInput, services: HarnessServices): Promise<HarnessTurnResult> {
    const deps: AuthorizeDeps = {
      definition: services.definition,
      tools: services.tools,
      journal: input.journal,
      confirmationResolver: services.confirmationResolver,
      ids: services.ids,
      clock: services.clock,
      grants: new Set<string>(),
    };
    const gateway = new CapabilityGateway({ services, deps, harnessName: this.name, turn: input.turn });
    const confirmation = resolvePendingConfirmation(deps, input.userMessage, input.turn);
    if (confirmation.resolved && confirmation.decision === "confirm") {
      const outcome = await attemptToolCall(deps, confirmation.action.toolName, confirmation.action.args, input.turn, "runtime");
      if (outcome.kind === "executed" || outcome.kind === "replayed") await this.applyTransitions(input, services, "action_result");
    }

    const preflight = await this.interpretAndPlan(input, services);
    await this.applyTransitions(input, services, "pre_response");
    const evidence: KnowledgeResult[] = await this.executeRetrievals(preflight.retrievalRequests, input, services, gateway);
    const catalog = gateway.catalog();
    const context = compileContext({
      definition: services.definition,
      state: input.journal.state,
      now: services.clock.now(),
      retrievedKnowledge: evidence,
      taskInstruction: [
        "Work autonomously inside the capability envelope supplied for this query.",
        "All capability results come from the application runtime and are authoritative. Never bypass a rejection or claim an action succeeded without a successful result.",
        "A deferred action means durable user confirmation is required; stop without inventing an outcome.",
      ].join("\n\n"),
    });
    services.onContextCompiled?.(context, "claude-agent:start");
    input.journal.append({
      type: "AgentIterationStarted",
      turn: input.turn,
      payload: { harness: this.name, iteration: 1, phaseId: catalog.phaseId, capabilityNames: catalog.capabilities.map((capability) => capability.name) },
    });

    let pending: Extract<CapabilityOutcome, { kind: "awaiting_confirmation" }> | undefined;
    let delegationSequence = 0;
    const before = gateway.counts;
    let result: ClaudeAgentQueryResult;
    try {
      result = await this.adapter.execute({
        prompt: input.userMessage,
        systemPrompt: context.system,
        model: services.definition.model.model,
        maxTurns: services.definition.policies.maxAgentIterations,
        capabilities: catalog.capabilities,
        signal: input.signal,
        onLifecycleEvent: this.onLifecycleEvent,
        invokeCapability: async (name, args, adapterIteration) => {
          delegationSequence++;
          const iteration = Math.max(1, adapterIteration || delegationSequence);
          const outcome = await gateway.requestByName(name, args, iteration);
          if (outcome.kind === "completed" && outcome.toolOutcome) await this.applyTransitions(input, services, "action_result");
          if (outcome.kind === "awaiting_confirmation") pending = outcome;
          return outcome;
        },
      });
    } catch (error) {
      input.journal.append({ type: "RuntimeError", turn: input.turn, payload: { code: "claude_agent_failed", message: error instanceof Error ? error.message : String(error) } });
      input.journal.append({ type: "AgentIterationCompleted", turn: input.turn, payload: { harness: this.name, iteration: 1, requested: delegationSequence, completed: 0, rejected: 0, stopReason: "error" } });
      return this.emit(input, "The Claude execution context failed before it could complete. No unconfirmed action was executed.", "error", 1);
    }

    input.journal.append({
      type: "ModelCallCompleted",
      turn: input.turn,
      payload: { purpose: "claude-agent", providerId: "claude-agent-sdk", model: result.model, usage: result.usage, finishReason: result.terminalReason ?? result.stopReason ?? undefined },
    });
    const after = gateway.counts;
    input.journal.append({
      type: "AgentIterationCompleted",
      turn: input.turn,
      payload: {
        harness: this.name,
        iteration: Math.max(1, result.numTurns),
        requested: (after.knowledgeCalls - before.knowledgeCalls) + (after.actionRequests - before.actionRequests),
        completed: pending ? Math.max(0, delegationSequence - 1) : delegationSequence,
        rejected: 0,
        stopReason: pending ? "awaiting_confirmation" : result.terminalReason ?? result.stopReason ?? "completed",
      },
    });

    // PendingAction is application truth. Ignore any speculative wrap-up text emitted after a
    // defer race and surface only the frozen runtime confirmation prompt.
    if (pending || input.journal.state.pendingAction) {
      return this.emit(input, pending?.promptText ?? input.journal.state.pendingAction!.promptText, "awaiting_confirmation", Math.max(1, result.numTurns));
    }
    if (result.terminalReason === "max_turns" || result.stopReason === "max_turns") {
      return this.emit(input, "I reached the safe agent-turn limit before completing the task. Please continue in a new turn.", "max_iterations", Math.max(1, result.numTurns));
    }
    const text = result.text.trim();
    if (!text) return this.emit(input, "Claude finished without a usable reply. Nothing unconfirmed was executed.", "error", Math.max(1, result.numTurns));
    return this.emit(input, text, "completed", Math.max(1, result.numTurns));
  }
}

/** Official @anthropic-ai/claude-agent-sdk adapter, isolated from core. */
export class ClaudeSdkExecutionAdapter implements ClaudeExecutionAdapter {
  async execute(input: ClaudeAgentQueryInput): Promise<ClaudeAgentQueryResult> {
    const queues = new Map<string, CapabilityOutcome[]>();
    let delegationSequence = 0;
    const cacheKey = (name: string, args: Record<string, unknown>) => `${name}:${hashValue(args)}`;
    const sdkName = (name: string) => `mcp__agent_sdk__${name}`;
    const localName = (name: string) => name.replace(/^mcp__agent_sdk__/, "");

    const invoke = async (name: string, args: Record<string, unknown>, toolUseId?: string): Promise<CapabilityOutcome> => {
      delegationSequence++;
      const outcome = await input.invokeCapability(localName(name), args, delegationSequence);
      const key = cacheKey(localName(name), args);
      queues.set(key, [...(queues.get(key) ?? []), outcome]);
      return outcome;
    };

    const sdkTools = input.capabilities.map((capability) => tool(
      capability.name,
      capability.modelSpec.description,
      objectSchemaToZodShape(capability.modelSpec.input),
      async (args) => {
        const normalized = args as Record<string, unknown>;
        const key = cacheKey(capability.name, normalized);
        const queue = queues.get(key) ?? [];
        const outcome = queue.shift() ?? await invoke(capability.name, normalized);
        queues.set(key, queue);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(outcomeForClaude(outcome)) }],
          ...(outcome.kind === "rejected" ? { isError: true } : {}),
        };
      },
      { annotations: { readOnlyHint: capability.readOnly, destructiveHint: !capability.readOnly }, alwaysLoad: true },
    ));
    const server = createSdkMcpServer({ name: "agent_sdk", version: "0.3.0", tools: sdkTools, alwaysLoad: true });

    const preTool: HookCallbackMatcher = {
      matcher: "mcp__agent_sdk__.*",
      hooks: [async (hookInput) => {
        if (hookInput.hook_event_name !== "PreToolUse") return { continue: true };
        const args = isRecord(hookInput.tool_input) ? hookInput.tool_input : {};
        input.onLifecycleEvent?.({ event: "PreToolUse", toolName: hookInput.tool_name, toolUseId: hookInput.tool_use_id });
        const outcome = await invoke(hookInput.tool_name, args, hookInput.tool_use_id);
        if (outcome.kind === "awaiting_confirmation") {
          return { hookSpecificOutput: { hookEventName: "PreToolUse" as const, permissionDecision: "defer" as const, permissionDecisionReason: outcome.promptText } };
        }
        if (outcome.kind === "rejected") {
          return { hookSpecificOutput: { hookEventName: "PreToolUse" as const, permissionDecision: "deny" as const, permissionDecisionReason: `${outcome.code}: ${outcome.reason}` } };
        }
        return { hookSpecificOutput: { hookEventName: "PreToolUse" as const, permissionDecision: "allow" as const } };
      }],
    };
    const lifecycle = (event: ClaudeLifecycleEvent["event"]): HookCallbackMatcher => ({
      hooks: [async (hookInput, toolUseId) => {
        const candidate = hookInput as unknown as { tool_name?: string };
        input.onLifecycleEvent?.({ event, toolName: candidate.tool_name, toolUseId });
        return { continue: true };
      }],
    });

    const abortController = new AbortController();
    const abort = () => abortController.abort();
    input.signal?.addEventListener("abort", abort, { once: true });
    if (input.signal?.aborted) abortController.abort();
    const options: Options = {
      model: input.model,
      systemPrompt: input.systemPrompt,
      maxTurns: input.maxTurns,
      mcpServers: { agent_sdk: server },
      tools: [],
      allowedTools: input.capabilities.map((capability) => sdkName(capability.name)),
      permissionMode: "default",
      settingSources: [],
      strictMcpConfig: true,
      persistSession: false,
      abortController,
      hooks: {
        PreToolUse: [preTool],
        PostToolUse: [lifecycle("PostToolUse")],
        PostToolUseFailure: [lifecycle("PostToolUseFailure")],
        Stop: [lifecycle("Stop")],
        PreCompact: [lifecycle("PreCompact")],
        PostCompact: [lifecycle("PostCompact")],
      },
    };

    let final: SDKResultMessage | undefined;
    const textBlocks: string[] = [];
    const stream = query({ prompt: input.prompt, options });
    try {
      for await (const message of stream) {
        collectAssistantText(message, textBlocks);
        if (message.type === "result") final = message;
      }
    } finally {
      input.signal?.removeEventListener("abort", abort);
    }
    if (!final) throw new Error("Claude Agent SDK query ended without a result message");
    const usage = usageFromResult(final);
    const resultText = final.subtype === "success" ? final.result : "";
    return {
      text: resultText || textBlocks.join("\n").trim(),
      model: input.model,
      numTurns: final.num_turns,
      stopReason: final.stop_reason,
      terminalReason: final.terminal_reason,
      usage,
      raw: final,
    };
  }
}

function outcomeForClaude(outcome: CapabilityOutcome): Record<string, unknown> {
  if (outcome.kind === "rejected") return { ok: false, code: outcome.code, reason: outcome.reason };
  if (outcome.kind === "awaiting_confirmation") return { ok: false, awaiting_confirmation: true, request_id: outcome.requestId };
  return { ok: true, ...outcome.observation };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function collectAssistantText(message: SDKMessage, output: string[]): void {
  if (message.type !== "assistant") return;
  const content = (message.message as unknown as { content?: unknown[] }).content ?? [];
  for (const block of content) {
    if (isRecord(block) && block["type"] === "text" && typeof block["text"] === "string") output.push(block["text"]);
  }
}

function usageFromResult(result: SDKResultMessage): ModelUsage {
  const usage = result.usage as unknown as Record<string, unknown>;
  return {
    inputTokens: typeof usage["input_tokens"] === "number" ? usage["input_tokens"] : undefined,
    outputTokens: typeof usage["output_tokens"] === "number" ? usage["output_tokens"] : undefined,
  };
}

function objectSchemaToZodShape(schema: ObjectSchema): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [name, field] of Object.entries(schema.fields)) {
    const value = valueSchemaToZod(field.schema);
    shape[name] = field.required ? value : value.optional();
  }
  return shape;
}

function valueSchemaToZod(schema: ValueSchema): z.ZodTypeAny {
  switch (schema.kind) {
    case "string": {
      let value = z.string();
      if (schema.minLength !== undefined) value = value.min(schema.minLength);
      if (schema.maxLength !== undefined) value = value.max(schema.maxLength);
      return value;
    }
    case "number": {
      let value = z.number();
      if (schema.min !== undefined) value = value.min(schema.min);
      if (schema.max !== undefined) value = value.max(schema.max);
      if (schema.integer) value = value.int();
      return value;
    }
    case "boolean": return z.boolean();
    case "enum": return schema.choices.length ? z.enum(schema.choices as [string, ...string[]]) : z.string();
    case "string_array": {
      let value = z.array(z.string());
      if (schema.maxItems !== undefined) value = value.max(schema.maxItems);
      return value;
    }
    case "array": {
      let value = z.array(valueSchemaToZod(schema.items));
      if (schema.maxItems !== undefined) value = value.max(schema.maxItems);
      return value;
    }
    case "object": {
      const value = z.object(objectSchemaToZodShape(schema));
      return schema.additionalProperties ? value.passthrough() : value.strict();
    }
    case "any": return z.unknown();
  }
}
