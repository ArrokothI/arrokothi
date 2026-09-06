/**
 * WorkflowControlState: the Workflow controller's serializable semantic progress.
 *
 * It holds exactly what is needed to re-enter a
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
 * invocation of it. `visit` identifies *this* Stage invocation, and `currentStage` + `visit`
 * together are one truthful ordinary Stage invocation coordinate - the first Stage entered is
 * `currentStage = entry`, `visit = 1`, and coming back to `evaluate` a second time is a different
 * `visit` from the first. Correlations are scoped to `visit`, which is what makes a stale result
 * from an earlier loop iteration unable to settle a barrier in a later one.
 *
 * `visits` is the separate allocation coordinate: the highest Stage visit number handed out so far.
 * In a linear Workflow it equals `visit` at every step. They diverge only while a fork is active -
 * two branches are two more Stage invocations, but `currentStage` + `visit` still name the single
 * Stage that forked. The join then allocates its successor from `visits`, so Stage visit
 * numbers stay globally unique and monotone even across a fork or a loop back through one.
 *
 * `visit`/`visits` are Workflow controller progress and nothing more. Neither is an ExecutionId,
 * neither appears in a mailbox, nothing is addressed to them, and no lifecycle attaches to them.
 *
 * ## The barrier
 *
 * `barrier` is the Stage completion barrier as data: one entry per required operation, each
 * carrying the correlation the controller chose, whether it has settled, and - once it has - what
 * it observed. A Stage transitions only when every entry is settled. `BarrierEntry` is a
 * discriminated union: an `effect` entry carries capability/operation and a capability observation;
 * a `child` entry (Agent Stage / Workflow Stage) carries the child Definition identity,
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
import type { BranchId, ForkId, StageId, WorkflowForkDefinition } from "./spec.ts";
import type { StageObservation, StageObservationOutcome, WorkflowJoinContext } from "./observations.ts";
import type { StageResult } from "./stage-result.ts";

/**
 * Persisted version compatibility:
 *
 * ```text
 * 2  the re-enterable Stage boundary
 * 3  active-fork branch-local state + the persisted explicit-join snapshot + the `visits`
 *    allocation coordinate
 * 4  each active-fork branch carries its own completion barrier and its own local wait status
 *    (`awaiting_effects` / `awaiting_resumption`), so a branch may hold a real asynchronous
 *    dependency - an Effect or a slow model call - while remaining a branch of one Workflow
 *    Execution
 * ```
 *
 * Bumped rather than back-fitted each time: a shape that cannot represent "two branches are active,
 * each with its own progress, its own barrier, and its own wait state" would have to fake it by
 * mutating one current Stage's fields, which is exactly the ambiguity structured parallelism forbids.
 *
 * Version 4 stores per-branch barriers and an independent `visits` allocation counter so the
 * top-level `visit` remains the current Stage invocation. `readWorkflowControlState` can read a
 * version-3 active fork: a branch with no `barrier` field defaults to `[]`, and `ready` /
 * `completed` retain their meaning.
 */
export const WORKFLOW_CONTROL_STATE_VERSION = 4;

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

/** One required capability operation. */
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
   * - no child exists. Distinct from `spawn_denied` (policy refused) and
   * `spawn_rejected` (request/runtime could not dispatch): the human declined the exact payload.
   */
  | "spawn_declined";

/**
 * One required child call - an Agent Stage or a Workflow Stage.
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

// -- active fork state --------------------------------------------

/**
 * How one active-fork branch is currently blocked, or that it is done.
 *
 * ```text
 * ready               installed, its Stage body has not run (or is runnable again now)
 * awaiting_effects    its Stage body proposed Effects / a child call; `barrier` is outstanding
 * awaiting_resumption its Stage body is mid slow model call; re-entry reconstructs it by stable key
 * completed           its Stage body reached a local `text | none` result
 * ```
 *
 * A branch whose Stage body *fails* does not persist a status - the earliest authored failing branch
 * fails the whole Workflow Execution before any new branch state is written.
 */
export type WorkflowParallelBranchStatus =
  | "ready"
  | "awaiting_effects"
  | "awaiting_resumption"
  | "completed";

/**
 * One branch of an active fork, as serializable controller progress.
 *
 * Every branch owns its own `visit`, its own `input` snapshot, its own `progress`, its own
 * completion `barrier`, its own wait `status`, and its own final `result`. There is no ambient
 * branch-shared progress object, no branch-shared barrier, and no branch-shared boundary: a branch
 * cannot read or write another branch's fields, and a JSON round trip of the enclosing state
 * preserves each branch's data exactly.
 *
 * `barrier` is this branch's Stage completion barrier - the same `BarrierEntry` shape an ordinary
 * Stage uses, with branch-qualified correlation ids (`branchStageCorrelationId`) so a delivered
 * result Event settles only the branch that requested it. It is `[]` for a `ready` or `completed`
 * branch, and for a compatible version-3 record without branch barriers.
 */
export interface WorkflowParallelBranchState {
  readonly branchId: BranchId;
  readonly stageId: StageId;
  /**
   * This branch's own Stage invocation number - `stageId` + `visit` is the branch's Stage
   * invocation coordinate. Allocated from the enclosing state's `visits` high-water at fork entry,
   * so it is distinct from every other branch, from the forking Stage, and from the join successor.
   * It never changes the meaning of the top-level `currentStage` + `visit`.
   */
  readonly visit: number;
  /** The fork input, snapshotted per branch. Every branch receives the same immutable value. */
  readonly input: StageResult;
  /** Branch-local Stage progress, owned by the branch Stage body, opaque to the controller. */
  readonly progress: JsonObject;
  readonly status: WorkflowParallelBranchStatus;
  /** This branch's own Stage completion barrier. `[]` unless `status` is `awaiting_effects`. */
  readonly barrier: readonly BarrierEntry[];
  /** The branch's final `text | none` result, present once `status` is `completed`. */
  readonly result: StageResult | null;
}

/**
 * The active fork.
 *
 * Present in `WorkflowControlState.parallel` exactly while a fork is between its entry and its
 * explicit join. While it is present the Workflow is *not* "in" `currentStage` - it is between the
 * Stage that forked and the fork's join - and the controller routes on `parallel` before it looks at
 * `currentStage`, `barrier`, or `boundary`.
 *
 * the branches may be *independently blocked*. One branch can be `awaiting_effects` on a
 * slow capability while a sibling is `awaiting_resumption` on a slow model call and a third has
 * already `completed` - all at once, all inside this one Workflow Execution. The enclosing Execution
 * waits on the union of those dependencies: an Event dependency plus a set of
 * ControllerResumption ids.
 */
export interface WorkflowParallelState {
  readonly forkId: ForkId;
  /**
   * Stable identity for this invocation of the fork, distinct from the authored `ForkId` because a
   * Workflow may (later) revisit a fork. Monotone over fork entries for the whole Execution.
   */
  readonly forkVisit: number;
  /** The post-Stage-A result that entered this fork. Also becomes the join successor's ordinary input. */
  readonly input: StageResult;
  /** Definition/authored branch order. Never completion order. */
  readonly branches: readonly WorkflowParallelBranchState[];
  /** Every branch has reached a local terminal result and the explicit join step has not run yet. */
  readonly joinReady: boolean;
}

export interface WorkflowControlState {
  readonly version: number;
  /**
   * The Stage the Workflow is at.
   *
   * While `parallel` is non-null this names the Stage whose transition entered the active fork - the
   * Workflow is between that Stage and the fork's join, not executing `currentStage`. `currentStage`
   * + `visit` still name that one Stage invocation truthfully; the branches' invocation coordinates
   * live in `parallel.branches[].stageId` / `.visit`. Read `parallel` first.
   */
  readonly currentStage: StageId;
  /**
   * This Stage invocation's number. `currentStage` + `visit` is one truthful ordinary Stage
   * invocation coordinate, including while a fork is active. Correlations are scoped to it.
   */
  readonly visit: number;
  /**
   * The highest Stage visit number allocated so far - allocation bookkeeping, not a Stage
   * coordinate. Equals `visit` in a linear Workflow; larger than `visit` while a fork is active
   * (its branches consumed visit numbers that `visit` did not advance to). The join and every later
   * Stage entry allocate from here, so Stage visits stay globally unique and monotone across forks
   * and loops.
   */
  readonly visits: number;
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
  /** How many forks this Workflow has entered. The next `forkVisit`. Monotone, survives loops. */
  readonly forks: number;
  /** Where inside a Stage boundary this Workflow suspended, if it did. */
  readonly boundary: WorkflowBoundaryState | null;
  /** The active fork, while one is between its entry and its explicit join. */
  readonly parallel: WorkflowParallelState | null;
  /**
   * The explicit-join snapshot for the current Stage visit.
   *
   * Non-null only on the visit a fork's join created, and on that Stage's re-entries until it
   * transitions away. It is the immutable branch results the downstream Function Stage reads through
   * `StageExecutionContext.join`; it is never the Stage's ordinary `stageInput`.
   */
  readonly join: WorkflowJoinContext | null;
}

export function initialWorkflowControlState(entryStage: StageId, stageInput: StageResult): WorkflowControlState {
  return {
    version: WORKFLOW_CONTROL_STATE_VERSION,
    currentStage: entryStage,
    visit: 1,
    visits: 1,
    stageInput,
    stageProgress: {},
    barrier: [],
    provisionalResult: null,
    transitions: 0,
    forks: 0,
    boundary: null,
    parallel: null,
    join: null,
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

/**
 * The correlation identifier for one required operation of a *parallel branch* Stage.
 *
 * ```text
 * fork = p, forkVisit = 2, branch = research, stage = b, visit = 7, request = search
 *   -> "wf/fork/p#2/branch/research/stage/b#7/request/search"
 * ```
 *
 * It is `stageCorrelationId` with the fork invocation and the branch identity spliced in front, and
 * it has the same three properties plus one more:
 *
 * ```text
 * stable across Activation reconstruction   built only from persisted branch coordinates
 * unique between sibling branches           the branch id is in the string
 * unique between repeated fork invocations  the forkVisit is in the string
 * unique between a branch's own requests    the Stage-local request key is in the string
 * ```
 *
 * So two sibling branches may both use the Stage-local request key `"search"` and still receive
 * only their own observations. It is not a credential, not authority, and not a runtime owner -
 * exactly like every other identifier in the runtime.
 */
export function branchStageCorrelationId(
  forkId: ForkId,
  forkVisit: number,
  branchId: BranchId,
  stage: StageId,
  visit: number,
  requestKey: string,
): string {
  return `wf/fork/${forkId}#${forkVisit}/branch/${branchId}/stage/${stage}#${visit}/request/${requestKey}`;
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
    // Absent in a version-2 record: a linear Workflow's high-water equals its current visit.
    visits: state.visits ?? state.visit ?? 1,
    stageInput: state.stageInput ?? null,
    stageProgress: state.stageProgress ?? {},
    barrier: state.barrier ?? [],
    provisionalResult: state.provisionalResult ?? null,
    transitions: state.transitions ?? 0,
    forks: state.forks ?? 0,
    boundary: state.boundary ?? null,
    parallel: normalizeParallel(state.parallel ?? null),
    join: state.join ?? null,
  };
}

/**
 * Backfills the per-branch `barrier` a version-3 active-fork record predates.
 *
 * A version-3 branch is only ever `ready` or `completed` and carried no barrier, so a missing
 * `barrier` field reads as `[]` - which is exactly its meaning for those two statuses.
 */
function normalizeParallel(parallel: WorkflowParallelState | null): WorkflowParallelState | null {
  if (parallel === null) return null;
  return {
    ...parallel,
    branches: parallel.branches.map((branch) => ({ ...branch, barrier: branch.barrier ?? [] })),
  };
}

/** Control state as the `JsonObject` the kernel persists. Structural proof that it is data. */
export function toControllerProgress(state: WorkflowControlState): JsonObject {
  return state as unknown as JsonObject;
}

export function unsettledEntries(state: WorkflowControlState): readonly BarrierEntry[] {
  return unsettledBarrierEntries(state.barrier);
}

/** The unsettled entries of any barrier - the top-level Stage's or a parallel branch's. */
export function unsettledBarrierEntries(barrier: readonly BarrierEntry[]): readonly BarrierEntry[] {
  return barrier.filter((entry) => !entry.settled);
}

/**
 * Applies one settled capability outcome to an `effect` entry of a barrier.
 *
 * Idempotent by construction: an entry that has already settled is left exactly as it was, so a
 * duplicate result Event cannot settle the same requirement twice or overwrite the authoritative
 * first answer. An outcome whose correlation matches no `effect` entry changes nothing, which is
 * what makes a stale result from a previous loop iteration - or from a sibling branch - harmless.
 */
export function settleBarrier(
  barrier: readonly BarrierEntry[],
  correlationId: string,
  outcome: StageObservationOutcome,
  detail: { readonly observation?: JsonValue; readonly error?: { readonly code: string; readonly message: string } },
): { readonly barrier: readonly BarrierEntry[]; readonly settled: boolean } {
  let settled = false;
  const next = barrier.map((entry) => {
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
  return settled ? { barrier: next, settled } : { barrier, settled };
}

/** Applies one settled child-call outcome to a `child` entry of a barrier. Idempotent, correlation-exact. */
export function settleChildBarrier(
  barrier: readonly BarrierEntry[],
  correlationId: string,
  detail: {
    readonly outcome: ChildBarrierOutcome;
    readonly childResult?: StageResult;
    readonly error?: { readonly code: string; readonly message: string };
  },
): { readonly barrier: readonly BarrierEntry[]; readonly settled: boolean } {
  let settled = false;
  const next = barrier.map((entry) => {
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
  return settled ? { barrier: next, settled } : { barrier, settled };
}

/** Applies one settled capability outcome to the top-level Stage barrier. */
export function settleBarrierEntry(
  state: WorkflowControlState,
  correlationId: string,
  outcome: StageObservationOutcome,
  detail: { readonly observation?: JsonValue; readonly error?: { readonly code: string; readonly message: string } },
): { readonly state: WorkflowControlState; readonly settled: boolean } {
  const applied = settleBarrier(state.barrier, correlationId, outcome, detail);
  return applied.settled ? { state: { ...state, barrier: applied.barrier }, settled: true } : { state, settled: false };
}

/** Applies one settled child-call outcome to the top-level Stage barrier. */
export function settleChildBarrierEntry(
  state: WorkflowControlState,
  correlationId: string,
  detail: {
    readonly outcome: ChildBarrierOutcome;
    readonly childResult?: StageResult;
    readonly error?: { readonly code: string; readonly message: string };
  },
): { readonly state: WorkflowControlState; readonly settled: boolean } {
  const applied = settleChildBarrier(state.barrier, correlationId, detail);
  return applied.settled ? { state: { ...state, barrier: applied.barrier }, settled: true } : { state, settled: false };
}

/** The settled `effect` entries of a barrier as Stage-facing observations. Child entries are not these. */
export function observationsOfBarrier(barrier: readonly BarrierEntry[]): readonly StageObservation[] {
  return barrier
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

/** The settled `effect` barrier entries of the top-level Stage as observations. */
export function observationsOf(state: WorkflowControlState): readonly StageObservation[] {
  return observationsOfBarrier(state.barrier);
}

/** The single `child` entry of a barrier, if this Stage is an Agent/Workflow Stage / branch. */
export function childBarrierEntryOf(barrier: readonly BarrierEntry[]): ChildBarrierEntry | undefined {
  return barrier.find((entry): entry is ChildBarrierEntry => entry.kind === "child");
}

/** The single `child` barrier entry for the current top-level Stage visit. */
export function childBarrierEntry(state: WorkflowControlState): ChildBarrierEntry | undefined {
  return childBarrierEntryOf(state.barrier);
}

// -- fork/join -----------------------------------------------------

/**
 * Installs an active fork: a fresh `WorkflowParallelState` with one `ready` branch per authored
 * branch, each branch handed the same immutable fork-input snapshot and its own Stage visit.
 *
 * The top-level `currentStage` and `visit` are left **unchanged** - the Workflow is still at the
 * Stage that forked, and `currentStage` + `visit` stay a truthful invocation coordinate. Branch
 * visits are allocated from `visits` (the high-water) in authored order, and `visits` advances by
 * the branch count so the join successor and every later Stage get fresh, monotone numbers. The
 * caller owns the `transitions` counter (a fork entry is one transition, like any other edge);
 * `forkVisit` comes from `forks` and identifies this fork invocation, independent of visit
 * allocation.
 */
export function installFork(
  state: WorkflowControlState,
  fork: WorkflowForkDefinition,
  forkInput: StageResult,
): WorkflowControlState {
  const forkVisit = state.forks + 1;
  const branches: WorkflowParallelBranchState[] = fork.branches.map((branch, index) => ({
    branchId: branch.id,
    stageId: branch.stage,
    visit: state.visits + 1 + index,
    input: forkInput,
    progress: {},
    status: "ready",
    barrier: [],
    result: null,
  }));
  return {
    ...state,
    // currentStage and visit unchanged: the Workflow is still at the Stage that forked.
    visits: state.visits + fork.branches.length,
    forks: forkVisit,
    barrier: [],
    boundary: null,
    // The forking Stage's body is done; its Stage-local scratch is not part of the fork, and each
    // branch carries its own `progress`.
    stageProgress: {},
    provisionalResult: forkInput,
    join: null,
    parallel: { forkId: fork.id, forkVisit, input: forkInput, branches, joinReady: false },
  };
}

/** The immutable join snapshot for an active fork whose branches have all completed, authored order. */
export function joinContextOf(parallel: WorkflowParallelState): WorkflowJoinContext {
  return {
    forkId: parallel.forkId,
    branches: parallel.branches.map((branch) => ({
      branchId: branch.branchId,
      stageId: branch.stageId,
      result: branch.result,
    })),
  };
}
