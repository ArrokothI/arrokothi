import type { HostContextValue } from "../context/types.ts";
import type { MemoryPrimitive, MemoryProvenance, MemoryWriteMechanism, WorkingNote } from "../memory/types.ts";
import type { AuthoritativeFact, ToolRejectionReason } from "../tools/types.ts";
import type { ConfirmationDecision } from "../confirmation/types.ts";
import type { TransitionEvaluation, TransitionTiming } from "../flow/types.ts";
import type { ModelUsage } from "../provider/types.ts";
import type { MemoryRejectionCode } from "../memory/structured.ts";
import type { TurnPlan, TurnPlanValidationError } from "../planning/types.ts";
import type { RetrievalRequest } from "../knowledge/types.ts";

/**
 * The append-only session event stream.
 *
 * This is the durable session. It lives outside model context and outside any one runtime process:
 * a runtime loads the stream, appends to it, persists, and disappears. The snapshot in
 * `session/state.ts` is only ever a cache of `project(events)`.
 *
 * Every state write, transition, confirmation, tool attempt/result and final reply appears here.
 * If it is not an event, it did not happen.
 */

export type SessionEventType =
  | "UserMessageReceived"
  | "HostContextObserved"
  | "SemanticSignalsObserved"
  | "TurnPlanCreated"
  | "RetrievalRequestRejected"
  | "KnowledgeRetrieved"
  | "AgentIterationStarted"
  | "DelegationRequested"
  | "DelegationRejected"
  | "DelegationCompleted"
  | "AgentIterationCompleted"
  | "MemoryWriteProposed"
  | "MemoryWriteCommitted"
  | "MemoryWriteRejected"
  | "WorkingNoteRecorded"
  | "PhaseTransitioned"
  | "ToolRequested"
  | "ToolCallRejected"
  | "ConfirmationRequested"
  | "ConfirmationResolved"
  | "ToolExecutionStarted"
  | "ToolExecutionSucceeded"
  | "ToolExecutionFailed"
  | "ModelCallCompleted"
  | "AssistantMessageEmitted"
  | "RuntimeError";

interface EventBase<T extends SessionEventType, P> {
  /** 1-based, monotonic, gapless within a session. Assigned by the store on append. */
  seq: number;
  id: string;
  sessionId: string;
  /** Which user turn this belongs to. Turn 0 is session setup, before any user message. */
  turn: number;
  at: string;
  type: T;
  payload: P;
}

export type UserMessageReceivedEvent = EventBase<"UserMessageReceived", { text: string }>;

export type HostContextObservedEvent = EventBase<
  "HostContextObserved",
  { accepted: HostContextValue[]; rejected: { key: string; reason: string }[] }
>;

/** Semantic routing signals from PreflightPlan. Recorded so replay reproduces routing. */
export type SemanticSignalsObservedEvent = EventBase<"SemanticSignalsObserved", { signals: string[] }>;

export type TurnPlanCreatedEvent = EventBase<
  "TurnPlanCreated",
  {
    strategy: "llm" | "deterministic" | "hybrid";
    resolvedBy: "llm" | "deterministic" | "safe_empty";
    plan: TurnPlan;
    detail?: string;
  }
>;

export type RetrievalRequestRejectedEvent = EventBase<
  "RetrievalRequestRejected",
  { request: RetrievalRequest; error: TurnPlanValidationError }
>;

export type KnowledgeRetrievedEvent = EventBase<
  "KnowledgeRetrieved",
  {
    request: RetrievalRequest;
    sourceId: string;
    resultIds: string[];
    scores?: number[];
    returnedCount: number;
    totalMatched?: number;
  }
>;

export type AgentIterationStartedEvent = EventBase<
  "AgentIterationStarted",
  { harness: string; iteration: number; phaseId: string | null; capabilityNames: string[] }
>;

export type DelegationRequestedEvent = EventBase<
  "DelegationRequested",
  {
    harness: string;
    iteration: number;
    category: "knowledge" | "action";
    capabilityName: string;
    input: Record<string, unknown>;
  }
>;

export type DelegationRejectedEvent = EventBase<
  "DelegationRejected",
  {
    harness: string;
    iteration: number;
    category: "knowledge" | "action";
    capabilityName: string;
    code: string;
    reason: string;
  }
>;

export type DelegationCompletedEvent = EventBase<
  "DelegationCompleted",
  {
    harness: string;
    iteration: number;
    category: "knowledge" | "action";
    capabilityName: string;
    outcome: "completed" | "replayed" | "awaiting_confirmation";
    summary: Record<string, unknown>;
  }
>;

export type AgentIterationCompletedEvent = EventBase<
  "AgentIterationCompleted",
  {
    harness: string;
    iteration: number;
    requested: number;
    completed: number;
    rejected: number;
    stopReason?: string;
  }
>;

export type MemoryWriteProposedEvent = EventBase<
  "MemoryWriteProposed",
  { key: string; value: unknown; writeMechanism: MemoryWriteMechanism; provenance: MemoryProvenance; confidence?: number }
>;

export type MemoryWriteCommittedEvent = EventBase<
  "MemoryWriteCommitted",
  {
    key: string;
    value: MemoryPrimitive;
    previousValue?: MemoryPrimitive;
    writeMechanism: MemoryWriteMechanism;
    provenance: MemoryProvenance;
    authority: "authoritative" | "advisory";
    confidence?: number;
    normalized?: boolean;
    proposalEventId?: string;
  }
>;

/** Rejections are first-class. A model failure is recorded with its reason, never silently repaired. */
export type MemoryWriteRejectedEvent = EventBase<
  "MemoryWriteRejected",
  {
    key: string;
    value: unknown;
    code: MemoryRejectionCode;
    reason: string;
    writeMechanism: MemoryWriteMechanism;
    provenance: MemoryProvenance;
    proposalEventId?: string;
  }
>;

export type WorkingNoteRecordedEvent = EventBase<"WorkingNoteRecorded", { note: WorkingNote }>;

export type PhaseTransitionedEvent = EventBase<
  "PhaseTransitioned",
  { from: string | null; to: string; on: TransitionTiming | "initial"; label?: string; evaluation?: TransitionEvaluation }
>;

export type ToolRequestedEvent = EventBase<
  "ToolRequested",
  { requestId: string; toolName: string; args: Record<string, unknown>; requestedBy: "model" | "runtime" }
>;

export type ToolCallRejectedEvent = EventBase<
  "ToolCallRejected",
  { requestId: string; toolName: string; reason: ToolRejectionReason; message: string; args: Record<string, unknown> }
>;

export type ConfirmationRequestedEvent = EventBase<
  "ConfirmationRequested",
  { requestId: string; toolName: string; args: Record<string, unknown>; argsHash: string; promptText: string; supersededRequestId?: string }
>;

export type ConfirmationResolvedEvent = EventBase<
  "ConfirmationResolved",
  { requestId: string; decision: ConfirmationDecision; reason: string; rule: string; message?: string }
>;

export type ToolExecutionStartedEvent = EventBase<
  "ToolExecutionStarted",
  { requestId: string; toolName: string; args: Record<string, unknown>; idempotencyKey: string }
>;

export type ToolExecutionSucceededEvent = EventBase<
  "ToolExecutionSucceeded",
  {
    requestId: string;
    toolName: string;
    output: Record<string, unknown>;
    facts?: AuthoritativeFact[];
    idempotencyKey: string;
    /** True when a prior identical action's result was replayed rather than re-executed. */
    replayed?: boolean;
  }
>;

export type ToolExecutionFailedEvent = EventBase<
  "ToolExecutionFailed",
  { requestId: string; toolName: string; error: { code: string; message: string }; retryable?: boolean; idempotencyKey: string }
>;

/** Provider/model metadata for every model call, so traces can attribute behaviour to a model. */
export type ModelCallCompletedEvent = EventBase<
  "ModelCallCompleted",
  { purpose: string; providerId: string; model: string; usage?: ModelUsage; finishReason?: string; durationMs?: number }
>;

export type AssistantMessageEmittedEvent = EventBase<
  "AssistantMessageEmitted",
  {
    text: string;
    stopReason: "completed" | "max_steps" | "max_iterations" | "awaiting_confirmation" | "awaiting_user" | "cancelled" | "error";
  }
>;

export type RuntimeErrorEvent = EventBase<"RuntimeError", { code: string; message: string; detail?: string }>;

export type SessionEvent =
  | UserMessageReceivedEvent
  | HostContextObservedEvent
  | SemanticSignalsObservedEvent
  | TurnPlanCreatedEvent
  | RetrievalRequestRejectedEvent
  | KnowledgeRetrievedEvent
  | AgentIterationStartedEvent
  | DelegationRequestedEvent
  | DelegationRejectedEvent
  | DelegationCompletedEvent
  | AgentIterationCompletedEvent
  | MemoryWriteProposedEvent
  | MemoryWriteCommittedEvent
  | MemoryWriteRejectedEvent
  | WorkingNoteRecordedEvent
  | PhaseTransitionedEvent
  | ToolRequestedEvent
  | ToolCallRejectedEvent
  | ConfirmationRequestedEvent
  | ConfirmationResolvedEvent
  | ToolExecutionStartedEvent
  | ToolExecutionSucceededEvent
  | ToolExecutionFailedEvent
  | ModelCallCompletedEvent
  | AssistantMessageEmittedEvent
  | RuntimeErrorEvent;

/** What a caller supplies; `seq`, `id`, `sessionId` and `at` are assigned on append. */
export type SessionEventInput = {
  [T in SessionEvent as T["type"]]: { type: T["type"]; turn: number; payload: T["payload"] };
}[SessionEvent["type"]];

export function isEventOfType<T extends SessionEventType>(
  event: SessionEvent,
  type: T,
): event is Extract<SessionEvent, { type: T }> {
  return event.type === type;
}
