import type { CapabilityCatalogSnapshot } from "../capabilities/types.ts";
import type { CompiledContext } from "../compiler/context-compiler.ts";
import type { HostContextState } from "../context/types.ts";
import type { ModelPolicy, ModelProvider, ModelUsage } from "../provider/types.ts";
import type { RuntimeDecision } from "../runtime/decision.ts";

export interface AgentLoopExecutionContext {
  sessionId: string;
  turn: number;
  requestId: string;
  traceId: string;
  tenantId?: string;
  /** Restricted values transported out-of-band. The engine must never add them to model messages. */
  invocationHostContext: HostContextState;
}

export interface AgentLoopCapabilityRequest {
  name: string;
  input: Record<string, unknown>;
  iteration: number;
}

export interface AgentLoopCapabilityResult {
  decision: RuntimeDecision;
  /** Authoritative ToolResult/Knowledge result, or a compact deterministic denial observation. */
  observation?: Record<string, unknown>;
}

export interface AgentLoopLimits {
  maxIterations: number;
  maxGuideRetries: number;
  maxOutputTokens?: number;
}

export type AgentLoopTraceEvent =
  | {
      kind: "lifecycle";
      event: "before_invocation" | "after_invocation" | "before_model" | "after_model" | "before_tool" | "after_tool" | "execution_error";
      iteration?: number;
      capabilityName?: string;
      detail?: Record<string, unknown>;
    }
  | { kind: "iteration_started"; iteration: number; capabilityNames: string[] }
  | {
      kind: "model_call_completed";
      iteration: number;
      providerId: string;
      model: string;
      usage?: ModelUsage;
      stopReason?: string;
      durationMs?: number;
    }
  | { kind: "capability_requested"; iteration: number; name: string }
  | { kind: "runtime_decision"; iteration: number; name?: string; decision: RuntimeDecision }
  | { kind: "guide_retry"; iteration: number; retry: number; feedback: string }
  | { kind: "conversation_compacted"; strategy: string; beforeMessages?: number; afterMessages?: number; summaryModelCalls?: number }
  | { kind: "execution_terminated"; stopReason: AgentLoopStopReason };

export type AgentLoopStopReason =
  | "end_turn"
  | "max_iterations"
  | "awaiting_confirmation"
  | "cancelled"
  | "denied"
  | "error";

export interface AgentLoopMetrics {
  iterations: number;
  modelCalls: number;
  guideRetryCalls: number;
  conversationSummaryCalls: number;
  toolRequests: number;
}

export interface AgentLoopInput {
  /** Initial authoritative ArrokothI projection. It is not durable storage or engine history. */
  context: CompiledContext;
  /**
   * Recompile authoritative state immediately before a model iteration. Engines must prefer this
   * projection when present so Phase, memory, host context, and action results cannot drift from
   * the capability catalog after an in-loop state transition.
   */
  refreshContext?(iteration: number): CompiledContext;
  modelPolicy: ModelPolicy;
  /** Used only by provider-neutral/reference engines; Strands resolves its own model implementation. */
  modelProvider?: ModelProvider;
  capabilities(): CapabilityCatalogSnapshot;
  /**
   * Optional application intervention before the authoritative Gateway request. It cannot create
   * confirmation truth; `confirm` is valid only as a result of `requestCapability`/Gateway.
   */
  evaluateCapability?(request: AgentLoopCapabilityRequest): RuntimeDecision | Promise<RuntimeDecision>;
  requestCapability(request: AgentLoopCapabilityRequest): Promise<AgentLoopCapabilityResult>;
  executionContext: AgentLoopExecutionContext;
  limits: AgentLoopLimits;
  signal?: AbortSignal;
  onTrace?: (event: AgentLoopTraceEvent) => void;
  /** Optional deterministic terminal-output policy. No semantic judge model is implied. */
  validateTerminalResponse?: (text: string) => RuntimeDecision | Promise<RuntimeDecision>;
}

export interface AgentLoopResult {
  replyText: string;
  stopReason: AgentLoopStopReason;
  metrics: AgentLoopMetrics;
  providerStopReason?: string;
}

/** ArrokothI-owned seam protecting core semantics from any particular loop framework. */
export interface AgentLoopEngine {
  readonly name: string;
  run(input: AgentLoopInput): Promise<AgentLoopResult>;
}
