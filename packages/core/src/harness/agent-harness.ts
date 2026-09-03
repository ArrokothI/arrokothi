import type { AgentLoopEngine, AgentLoopTraceEvent } from "../loop/types.ts";
import type { RuntimeDecision } from "../runtime/decision.ts";
import type { AuthorizeDeps } from "../tools/authorize.ts";
import type { CapabilityDefinition, CapabilityOutcome } from "../capabilities/types.ts";
import type {
  HarnessImplementation,
  HarnessServices,
  HarnessTurnInput,
  HarnessTurnResult,
  TurnModelCallMetrics,
  TurnStopReason,
} from "./types.ts";
import { CapabilityGateway } from "../capabilities/gateway.ts";
import { attemptToolCall, resolvePendingConfirmation } from "../tools/authorize.ts";
import { compileContext } from "../compiler/context-compiler.ts";
import { WorkflowCoordinator, type WorkflowOptions } from "./workflow.ts";

export type AgentHarnessStrategy = "agentic" | "workflow";

export type AgentPreflightOptions = WorkflowOptions;

export interface AgentHarnessOptions {
  strategy?: AgentHarnessStrategy;
  /** Required for the primary agentic strategy; StrandsLoopEngine is the canonical implementation. */
  engine?: AgentLoopEngine;
  preflight?: AgentPreflightOptions;
  /**
   * Deterministic/application-owned policy seam evaluated before CapabilityGateway.
   * It may proceed, deny, guide, or transform. Confirmation is Gateway-owned because only the
   * Gateway can create the authoritative PendingAction.
   */
  evaluateCapability?: (input: {
    name: string;
    input: Record<string, unknown>;
    iteration: number;
    capability?: CapabilityDefinition;
  }) => RuntimeDecision | Promise<RuntimeDecision>;
  validateTerminalResponse?: (text: string) => RuntimeDecision | Promise<RuntimeDecision>;
}

/**
 * ArrokothI's one primary control-plane Harness for an external user turn.
 *
 * It owns PendingAction resolution, semantic Preflight, state/Phase coordination, context
 * compilation, the CapabilityGateway boundary, and terminal accounting. An injected
 * AgentLoopEngine owns only the temporary iterative mechanics inside the turn.
 */
export class AgentHarness extends WorkflowCoordinator implements HarnessImplementation {
  override readonly name = "agent-harness";
  readonly strategy: AgentHarnessStrategy;
  private readonly primaryOptions: AgentHarnessOptions;

  constructor(options: AgentHarnessOptions) {
    super({ ...options.preflight, preflightRetrieval: options.strategy === "workflow" });
    this.strategy = options.strategy ?? "agentic";
    if (this.strategy === "agentic" && !options.engine) {
      throw new Error("AgentHarness strategy=agentic requires an AgentLoopEngine; use StrandsLoopEngine for canonical execution");
    }
    this.primaryOptions = options;
  }

  override async runTurn(input: HarnessTurnInput, services: HarnessServices): Promise<HarnessTurnResult> {
    if (this.strategy === "workflow") {
      const start = input.journal.events.length;
      const result = await super.runTurn(input, services);
      return { ...result, metrics: metricsFromEvents(input.journal.events.slice(start)) };
    }

    const engine = this.primaryOptions.engine!;
    const grants = new Set<string>();
    const deps: AuthorizeDeps = {
      definition: services.definition,
      tools: services.tools,
      journal: input.journal,
      confirmationResolver: services.confirmationResolver,
      ids: services.ids,
      clock: services.clock,
      durability: services.durability,
      grants,
    };
    const gateway = new CapabilityGateway({ services, deps, harnessName: this.name, turn: input.turn });

    const confirmation = resolvePendingConfirmation(deps, input.userMessage, input.turn);
    if (confirmation.resolved && confirmation.decision === "confirm") {
      const outcome = await attemptToolCall(deps, confirmation.action.toolName, confirmation.action.args, input.turn, "runtime");
      if (outcome.kind === "executed" || outcome.kind === "replayed") {
        await this.applyTransitions(input, services, "action_result");
      }
    }

    const beforePreflight = input.journal.events.length;
    await this.interpretAndPlan(input, services, { includeRetrievalPlanning: false });
    const preflightEvents = input.journal.events.slice(beforePreflight);
    await this.applyTransitions(input, services, "pre_response");

    const compileAgentLoopContext = () => compileContext({
      definition: services.definition,
      state: input.journal.state,
      now: services.clock.now(),
      instructionMode: "agent_loop",
      taskInstruction: AGENT_LOOP_TASK,
    });
    const context = compileAgentLoopContext();
    services.onContextCompiled?.(context, "agent-loop:start");

    const restrictedHostContext = Object.fromEntries(
      Object.entries(input.journal.state.hostContext).filter(([, value]) => value.visibility !== "model"),
    );
    let requested = 0;
    let completed = 0;
    let rejected = 0;
    let latestIteration = 0;

    const result = await engine.run({
      context,
      refreshContext: (iteration) => {
        const refreshed = compileAgentLoopContext();
        services.onContextCompiled?.(refreshed, `agent-loop:iteration:${iteration}`);
        return refreshed;
      },
      modelPolicy: services.definition.model,
      modelProvider: services.model,
      capabilities: () => gateway.catalog(),
      evaluateCapability: this.primaryOptions.evaluateCapability
        ? async (request) => preGatewayDecision(await this.primaryOptions.evaluateCapability!({
              ...request,
              capability: gateway.catalog().capabilities.find((candidate) => candidate.name === request.name),
            }))
        : undefined,
      requestCapability: async (request) => {
        requested++;
        const outcome = await gateway.requestByName(request.name, request.input, request.iteration);
        if (outcome.kind === "rejected") rejected++;
        else completed++;
        if (outcome.kind === "completed" && outcome.toolOutcome) {
          await this.applyTransitions(input, services, "action_result");
        }
        return capabilityResult(outcome);
      },
      executionContext: {
        sessionId: input.journal.state.sessionId,
        turn: input.turn,
        requestId: services.ids.next("inv"),
        traceId: services.ids.next("trace"),
        invocationHostContext: restrictedHostContext,
      },
      limits: {
        maxIterations: services.definition.policies.maxAgentIterations,
        maxGuideRetries: services.definition.policies.maxAgentIterations,
        maxOutputTokens: services.definition.model.maxOutputTokens,
      },
      signal: input.signal,
      validateTerminalResponse: this.primaryOptions.validateTerminalResponse,
      onTrace: (event) => {
        latestIteration = Math.max(latestIteration, "iteration" in event ? event.iteration ?? 0 : 0);
        this.recordTrace(input, services, event);
      },
    });

    const pending = input.journal.state.pendingAction;
    const stopReason = pending ? "awaiting_confirmation" : mapStopReason(result.stopReason);
    const replyText = pending?.promptText ?? result.replyText;
    if (result.stopReason === "max_iterations") {
      input.journal.append({
        type: "RuntimeError",
        turn: input.turn,
        payload: {
          code: "max_agent_iterations_exceeded",
          message: `agent stopped after maxAgentIterations=${services.definition.policies.maxAgentIterations}`,
          detail: `engine=${engine.name}`,
        },
      });
    }
    if (result.stopReason === "error" || result.stopReason === "cancelled") {
      input.journal.append({
        type: "RuntimeError",
        turn: input.turn,
        payload: {
          code: result.stopReason === "cancelled" ? "agent_loop_cancelled" : "agent_loop_failed",
          message: result.stopReason === "cancelled"
            ? "agent-loop execution was cancelled"
            : "agent-loop execution stopped before producing a successful terminal result",
          detail: `engine=${engine.name}; providerStopReason=${result.providerStopReason ?? "unavailable"}`,
        },
      });
    }
    input.journal.append({
      type: "AgentIterationCompleted",
      turn: input.turn,
      payload: {
        harness: this.name,
        iteration: Math.max(1, latestIteration || result.metrics.iterations),
        requested,
        completed,
        rejected,
        stopReason,
      },
    });

    const preflightModelCalls = preflightEvents.filter((event) => event.type === "ModelCallCompleted" && event.payload.purpose === "plan").length;
    const metrics: TurnModelCallMetrics = {
      preflightModelCalls,
      agentLoopModelCalls: result.metrics.modelCalls,
      conversationSummaryModelCalls: result.metrics.conversationSummaryCalls,
      guideRetryModelCalls: result.metrics.guideRetryCalls,
      totalModelCalls: preflightModelCalls + result.metrics.modelCalls + result.metrics.conversationSummaryCalls,
    };
    const emitted = this.emit(input, replyText, stopReason, result.metrics.iterations);
    return { ...emitted, metrics };
  }

  private recordTrace(input: HarnessTurnInput, services: HarnessServices, event: AgentLoopTraceEvent): void {
    if (event.kind === "lifecycle") {
      input.journal.append({
        type: "ExecutionLifecycleObserved",
        turn: input.turn,
        payload: {
          engine: this.primaryOptions.engine?.name ?? "workflow",
          event: event.event,
          iteration: event.iteration,
          capabilityName: event.capabilityName,
          detail: event.detail,
        },
      });
      return;
    }
    if (event.kind === "iteration_started") {
      input.journal.append({
        type: "AgentIterationStarted",
        turn: input.turn,
        payload: {
          harness: this.name,
          iteration: event.iteration,
          phaseId: input.journal.state.phaseId,
          capabilityNames: event.capabilityNames,
        },
      });
      return;
    }
    if (event.kind === "model_call_completed") {
      input.journal.append({
        type: "ModelCallCompleted",
        turn: input.turn,
        payload: {
          purpose: `agent_loop:${event.iteration}`,
          providerId: event.providerId,
          model: event.model,
          usage: event.usage,
          finishReason: event.stopReason,
          durationMs: event.durationMs,
        },
      });
      return;
    }
    if (event.kind === "conversation_compacted") {
      input.journal.append({
        type: "ExecutionLifecycleObserved",
        turn: input.turn,
        payload: {
          engine: this.primaryOptions.engine?.name ?? "workflow",
          event: "conversation_compacted",
          detail: {
            strategy: event.strategy,
            beforeMessages: event.beforeMessages,
            afterMessages: event.afterMessages,
            summaryModelCalls: event.summaryModelCalls ?? 0,
          },
        },
      });
      for (let index = 0; index < (event.summaryModelCalls ?? 0); index++) {
        input.journal.append({
          type: "ModelCallCompleted",
          turn: input.turn,
          payload: {
            purpose: "conversation_summary",
            providerId: "strands-conversation-manager",
            model: services.definition.model.model,
          },
        });
      }
      return;
    }
    if (event.kind === "capability_requested") {
      input.journal.append({
        type: "ExecutionLifecycleObserved",
        turn: input.turn,
        payload: {
          engine: this.primaryOptions.engine?.name ?? "workflow",
          event: "capability_requested",
          iteration: event.iteration,
          capabilityName: event.name,
        },
      });
      return;
    }
    if (event.kind === "runtime_decision") {
      input.journal.append({
        type: "ExecutionLifecycleObserved",
        turn: input.turn,
        payload: {
          engine: this.primaryOptions.engine?.name ?? "workflow",
          event: "runtime_decision",
          iteration: event.iteration,
          capabilityName: event.name,
          detail: safeDecisionDetail(event.decision),
        },
      });
      return;
    }
    if (event.kind === "guide_retry") {
      input.journal.append({
        type: "ExecutionLifecycleObserved",
        turn: input.turn,
        payload: {
          engine: this.primaryOptions.engine?.name ?? "workflow",
          event: "guide_retry",
          iteration: event.iteration,
          detail: { retry: event.retry, feedback: event.feedback },
        },
      });
      return;
    }
    if (event.kind === "execution_terminated") {
      input.journal.append({
        type: "ExecutionLifecycleObserved",
        turn: input.turn,
        payload: {
          engine: this.primaryOptions.engine?.name ?? "workflow",
          event: "execution_terminated",
          detail: { stopReason: event.stopReason },
        },
      });
    }
  }
}

const AGENT_LOOP_TASK = [
  "Choose the next safe step using the current observations and available capabilities, or provide the final user-facing response.",
  "Treat authoritative capability observations as truth for what that operation observed. Do not claim facts the observations do not establish.",
  "A denial is final for that request. Guidance describes a safe alternative. A confirmation pause is not a completed action.",
].join("\n\n");

function safeDecisionDetail(decision: RuntimeDecision): Record<string, unknown> {
  if (decision.kind === "proceed") return { kind: decision.kind };
  if (decision.kind === "deny") return { kind: decision.kind, code: decision.code, reason: decision.reason };
  if (decision.kind === "guide") return { kind: decision.kind, code: decision.code, feedback: decision.feedback };
  if (decision.kind === "confirm") return { kind: decision.kind, requestId: decision.requestId };
  return {
    kind: decision.kind,
    reason: decision.reason,
    requiresFreshConfirmation: decision.requiresFreshConfirmation,
    transformedKeys: Object.keys(decision.input).sort(),
  };
}

function preGatewayDecision(decision: RuntimeDecision): RuntimeDecision {
  if (decision.kind !== "confirm") return decision;
  return {
    kind: "deny",
    code: "confirmation_not_gateway_owned",
    reason: "Only CapabilityGateway may request confirmation because it must first persist an authoritative PendingAction.",
  };
}

function capabilityResult(outcome: CapabilityOutcome): { decision: RuntimeDecision; observation?: Record<string, unknown> } {
  if (outcome.kind === "rejected") {
    return { decision: { kind: "deny", code: outcome.code, reason: outcome.reason } };
  }
  if (outcome.kind === "awaiting_confirmation") {
    return { decision: { kind: "confirm", requestId: outcome.requestId, promptText: outcome.promptText } };
  }
  return { decision: { kind: "proceed" }, observation: outcome.observation };
}

function mapStopReason(reason: string): TurnStopReason {
  if (reason === "end_turn") return "completed";
  if (reason === "max_iterations") return "max_iterations";
  if (reason === "awaiting_confirmation") return "awaiting_confirmation";
  if (reason === "cancelled") return "cancelled";
  return "error";
}

function metricsFromEvents(events: HarnessTurnInput["journal"]["events"]): TurnModelCallMetrics {
  const preflightModelCalls = events.filter((event) => event.type === "ModelCallCompleted" && event.payload.purpose === "plan").length;
  const conversationSummaryModelCalls = events.filter((event) => event.type === "ModelCallCompleted" && event.payload.purpose === "conversation_summary").length;
  const agentLoopModelCalls = events.filter((event) => event.type === "ModelCallCompleted" && event.payload.purpose.startsWith("agent_loop")).length;
  const totalModelCalls = events.filter((event) => event.type === "ModelCallCompleted").length;
  return { preflightModelCalls, agentLoopModelCalls, conversationSummaryModelCalls, guideRetryModelCalls: 0, totalModelCalls };
}
