/**
 * WorkflowControlState: the Workflow controller's serializable semantic progress.
 *
 * This replaces the generic Slice-A progress bag. It holds exactly what is needed to re-enter a
 * Workflow where it left off - which Stage is current, which invocation of it this is, what it was
 * given, what it has computed so far, which required operations it is still waiting on, and what
 * they observed - and it holds nothing else.
 *
 * What is deliberately absent is the whole point: no provider clients, no promises, no
 * `AbortSignal`s, no executors, no LangChain instances, no closures, no raw provider payloads, no
 * Harness or store handles. Everything here survives `JSON.parse(JSON.stringify(x))` unchanged,
 * because that is the difference between controller progress the runtime can persist and a
 * process-local object graph pretending to be state.
 *
 * ## Stage visits
 *
 * A Workflow may loop, so a Stage id identifies a *StageDefinition* and cannot identify one
 * invocation of it. `visit` is a monotone counter over Stage entries for the whole Execution: the
 * first Stage entered is visit 1, and coming back to `evaluate` a second time is a different visit
 * from the first. Correlations are scoped to it, which is what makes a stale result from an earlier
 * loop iteration unable to settle a barrier in a later one.
 *
 * `visit` is Workflow controller progress and nothing more. It is not an ExecutionId, it does not
 * appear in a mailbox, nothing is addressed to it, and no lifecycle attaches to it.
 *
 * ## The barrier
 *
 * `barrier` is the Stage completion barrier as data: one entry per required operation, each
 * carrying the correlation the controller chose, whether it has settled, and - once it has - what
 * it observed. A Stage transitions only when every entry is settled. `BarrierEntry` is a
 * discriminated union: an `effect` entry carries capability/operation and a capability observation;
 * a `child` entry (Slice E.2 - Agent Stage / Workflow Stage) carries the child Definition identity,
 * the operations the call requested, and the child's terminal outcome. Child data is never stuffed
 * into the effect entry's capability/operation fields.
 *
 * ## The Stage boundary
 *
 * `boundary` exists because an Adapter may now suspend on slow controller-local work, and the
 * Activation that resumes must not redo what the previous one finished. Restarting the chain at
 * index zero would re-run Adapters that already ran; re-entering through the Stage body would run
 * a body that already completed and duplicate its emissions; re-entering through the transition
 * would re-resolve a transition that was already resolved.
 *
 * ```text
 * output boundary   the body is done: its result and chosen transition are already recorded here,
 *                   and the resuming Activation skips the body entirely
 * input boundary    the predecessor transition is done: the target Stage, its new visit, and the
 *                   partially adapted value are already installed, and the resuming Activation
 *                   neither re-runs the predecessor nor re-resolves the transition
 * ```
 *
 * Both are re-enterable serializable positions, not continuations. Nothing in here is a closure, a
 * promise, or a resumption handle: the Activation that resumes reconstructs the model call from
 * these coordinates and recovers the settled result by key.
 */

import type { JsonObject, JsonValue } from "../util/json.ts";
import type { StageId } from "./spec.ts";
import type { StageObservation, StageObservationOutcome } from "./observations.ts";
import type { StageResult } from "./stage-result.ts";

/**
 * Version 2 adds the re-enterable Stage boundary.
 *
 * Bumped rather than back-fitted: a pre-v1 shape that could not express "the body already ran"
 * would have to be simulated by re-running it, which is precisely the defect this slice removes.
 */
export const WORKFLOW_CONTROL_STATE_VERSION = 2;

/** What a barrier entry is waiting for. */
export type BarrierEntryKind = "effect" | "child";

interface BarrierEntryBase {
  /** Stage-local request name. */
  readonly key: string;
  /** The controller-chosen correlation the matching result Event will carry. */
  readonly correlationId: string;
  readonly settled: boolean;
  readonly error: { readonly code: string; readonly message: string } | null;
}

/** One required capability operation. Pre-F.0 persisted entries have this exact shape. */
export interface CapabilityBarrierEntry extends BarrierEntryBase {
  readonly kind: "effect";
  readonly capability: string;
  readonly operation: string;
  readonly outcome: StageObservationOutcome | null;
  readonly observation: JsonValue | null;
}

/** One required Structured Memory write. */
export interface MemoryWriteBarrierEntry extends BarrierEntryBase {
  readonly kind: "effect";
  readonly effectKind: "write_memory";
  readonly memoryKey: string;
  readonly outcome: StageObservationOutcome | null;
  readonly observation: JsonValue | null;
}

export type EffectBarrierEntry = CapabilityBarrierEntry | MemoryWriteBarrierEntry;

/** How a required child call settled. */
export type ChildBarrierOutcome =
  | "completed"
  | "failed"
  | "cancelled"
  /** The `SpawnExecution` request was refused by policy - no child exists. */
  | "spawn_denied"
  /** The `SpawnExecution` request was never dispatchable (bad ref, kind mismatch) - no child exists. */
  | "spawn_rejected"
  /**
   * A human declined the exact-payload mechanical confirmation for the child `SpawnExecution`
   * (Slice E.2.1) - no child exists. Distinct from `spawn_denied` (policy refused) and
   * `spawn_rejected` (request/runtime could not dispatch): the human declined the exact payload.
   */
  | "spawn_declined";

/**
 * One required child call - an Agent Stage or a Workflow Stage (Slice E.2).
 *
 * The whole Stage body is this one call. On the first visit the controller proposes it and records
 * this entry; on a later Activation it correlates the child result, settles this entry, derives the
 * Stage result, and continues. It never re-proposes the call merely because the Workflow controller
 * re-entered.
 */
export interface ChildBarrierEntry extends BarrierEntryBase {
  readonly kind: "child";
  readonly childDefinitionId: string;
  readonly childDefinitionVersion: number;
  /** The Stage kind, which is also the child Definition kind the call requires. */
  readonly childKind: "agent" | "workflow";
  /** The operations the call requested (attenuated against the parent's current authority). */
  readonly requestedOperations: readonly { readonly capability: string; readonly operation: string }[];
  readonly outcome: ChildBarrierOutcome | null;
  /**
   * The child's terminal value adapted to the cross-Stage contract, present only when the child
   * `completed` with a `string` value (text) or `null` value (none). A structured/non-string
   * terminal value settles the entry as `failed` - it is never JSON-stringified through the edge.
   */
  readonly childResult: StageResult | null;
}

export type BarrierEntry = EffectBarrierEntry | ChildBarrierEntry;

/**
 * Where inside a Stage boundary an Activation stopped, when it suspended on controller-local work.
 *
 * `null` in the ordinary case: a Workflow that is between Stages, or running a Stage body, has no
 * boundary position to remember.
 */
export interface WorkflowBoundaryState {
  readonly position: "input" | "output";
  /** The Adapter to run next. Everything before it already ran and must not run again. */
  readonly adapterIndex: number;
  /** The value as transformed by the Adapters that already ran. */
  readonly value: StageResult;
  /**
   * Output boundaries only: the transition label the completed Stage body chose.
   *
   * Recorded here because the body will not run again to choose it a second time.
   */
  readonly transitionLabel: string | null;
}

export interface WorkflowControlState {
  readonly version: number;
  readonly currentStage: StageId;
  /** Monotone Stage-entry counter. Identifies this invocation, never an Execution. */
  readonly visit: number;
  /** What this Stage was given, after its input Adapters ran. */
  readonly stageInput: StageResult;
  /** Stage-local progress, owned by the Stage body, opaque to the controller. */
  readonly stageProgress: JsonObject;
  /** Required operations for the current visit. Empty means nothing is outstanding. */
  readonly barrier: readonly BarrierEntry[];
  /**
   * The Stage result the transition currently being resolved is carrying.
   *
   * Null while a Stage body is still running, and reset when a new Stage is entered - a successor's
   * copy of that value is its `stageInput`. After completion this holds the last Stage's result,
   * which is emphatically *not* the Execution's terminal result.
   */
  readonly provisionalResult: StageResult | null;
  /** How many Stage transitions this Workflow has resolved. Useful for traces and loop bounds. */
  readonly transitions: number;
  /** Where inside a Stage boundary this Workflow suspended, if it did. */
  readonly boundary: WorkflowBoundaryState | null;
}

export function initialWorkflowControlState(entryStage: StageId, stageInput: StageResult): WorkflowControlState {
  return {
    version: WORKFLOW_CONTROL_STATE_VERSION,
    currentStage: entryStage,
    visit: 1,
    stageInput,
    stageProgress: {},
    barrier: [],
    provisionalResult: null,
    transitions: 0,
    boundary: null,
  };
}

/**
 * The correlation identifier for one required operation.
 *
 * ```text
 * stage = research, visit = 3, request = retrieval
 *   -> "wf/research#3/retrieval"
 * ```
 *
 * Three properties matter, and the encoding is chosen for them rather than for looking tidy:
 * looping back to a Stage produces a new visit, so an old result cannot settle a new barrier; two
 * required operations in one visit carry different keys, so their results stay distinguishable; and
 * the value is derived entirely from controller-known facts, so Stage logic never needs a
 * runtime-minted `EffectId`.
 *
 * It is not a credential. Knowing a correlation authorizes nothing - it names a record so a result
 * can be reported against it, exactly like every other identifier in the runtime.
 */
export function stageCorrelationId(stage: StageId, visit: number, key: string): string {
  return `wf/${stage}#${visit}/${key}`;
}

export function isWorkflowControlState(value: unknown): value is WorkflowControlState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate["currentStage"] === "string" &&
    typeof candidate["visit"] === "number" &&
    Array.isArray(candidate["barrier"])
  );
}

/**
 * Reads persisted progress back, tolerating the empty progress a freshly created Execution has.
 *
 * Returns `null` when there is nothing to read, so the controller can distinguish a Workflow that
 * has not started from one that is between Stages, without inventing a status field.
 */
export function readWorkflowControlState(progress: JsonObject): WorkflowControlState | null {
  if (!isWorkflowControlState(progress)) return null;
  const state = progress as unknown as WorkflowControlState;
  return {
    version: state.version ?? WORKFLOW_CONTROL_STATE_VERSION,
    currentStage: state.currentStage,
    visit: state.visit,
    stageInput: state.stageInput ?? null,
    stageProgress: state.stageProgress ?? {},
    barrier: state.barrier ?? [],
    provisionalResult: state.provisionalResult ?? null,
    transitions: state.transitions ?? 0,
    boundary: state.boundary ?? null,
  };
}

/** Control state as the `JsonObject` the kernel persists. Structural proof that it is data. */
export function toControllerProgress(state: WorkflowControlState): JsonObject {
  return state as unknown as JsonObject;
}

export function unsettledEntries(state: WorkflowControlState): readonly BarrierEntry[] {
  return state.barrier.filter((entry) => !entry.settled);
}

/**
 * Applies one settled capability outcome to an `effect` barrier entry.
 *
 * Idempotent by construction: an entry that has already settled is left exactly as it was, so a
 * duplicate result Event cannot settle the same requirement twice or overwrite the authoritative
 * first answer. An outcome whose correlation matches no `effect` entry of this visit changes
 * nothing, which is what makes a stale result from a previous loop iteration harmless.
 */
export function settleBarrierEntry(
  state: WorkflowControlState,
  correlationId: string,
  outcome: StageObservationOutcome,
  detail: { readonly observation?: JsonValue; readonly error?: { readonly code: string; readonly message: string } },
): { readonly state: WorkflowControlState; readonly settled: boolean } {
  let settled = false;
  const barrier = state.barrier.map((entry) => {
    if (entry.kind !== "effect" || entry.correlationId !== correlationId || entry.settled) return entry;
    settled = true;
    return {
      ...entry,
      settled: true,
      outcome,
      observation: detail.observation ?? null,
      error: detail.error ?? null,
    };
  });
  return settled ? { state: { ...state, barrier }, settled } : { state, settled };
}

/** Applies one settled child-call outcome to a `child` barrier entry. Idempotent, correlation-exact. */
export function settleChildBarrierEntry(
  state: WorkflowControlState,
  correlationId: string,
  detail: {
    readonly outcome: ChildBarrierOutcome;
    readonly childResult?: StageResult;
    readonly error?: { readonly code: string; readonly message: string };
  },
): { readonly state: WorkflowControlState; readonly settled: boolean } {
  let settled = false;
  const barrier = state.barrier.map((entry) => {
    if (entry.kind !== "child" || entry.correlationId !== correlationId || entry.settled) return entry;
    settled = true;
    return {
      ...entry,
      settled: true,
      outcome: detail.outcome,
      childResult: detail.childResult ?? null,
      error: detail.error ?? null,
    };
  });
  return settled ? { state: { ...state, barrier }, settled } : { state, settled };
}

/** The settled `effect` barrier entries as Stage-facing observations. Child entries are not these. */
export function observationsOf(state: WorkflowControlState): readonly StageObservation[] {
  return state.barrier
    .filter((entry): entry is EffectBarrierEntry => entry.kind === "effect" && entry.settled && entry.outcome !== null)
    .map((entry): StageObservation =>
      "effectKind" in entry
        ? {
            key: entry.key,
            outcome: entry.outcome as StageObservationOutcome,
            effectKind: "write_memory",
            memoryKey: entry.memoryKey,
            ...(entry.observation !== null ? { observation: entry.observation } : {}),
            ...(entry.error !== null ? { error: entry.error } : {}),
          }
        : {
            key: entry.key,
            outcome: entry.outcome as StageObservationOutcome,
            capability: entry.capability,
            operation: entry.operation,
            ...(entry.observation !== null ? { observation: entry.observation } : {}),
            ...(entry.error !== null ? { error: entry.error } : {}),
          },
    );
}

/** The single `child` barrier entry for the current visit, if this is an Agent/Workflow Stage. */
export function childBarrierEntry(state: WorkflowControlState): ChildBarrierEntry | undefined {
  return state.barrier.find((entry): entry is ChildBarrierEntry => entry.kind === "child");
}
