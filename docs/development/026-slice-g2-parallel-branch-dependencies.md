# Slice G.2 — parallel branch dependencies, Effects, and async resumptions

> **Status:** implemented on the long-lived branch `slice-g-structured-concurrency`, continuing
> directly from the (still-unmerged, independently-reviewed) G.1 checkpoint. **Not merged. Awaiting
> independent architecture review.** This record covers **G.2 only**.
>
> **Starting SHA:** `dfe1bb8e2cf5c73050142f5fc566f4384999b773`
> ("docs(development): pin 025 §0 to the review-correction commit SHA") — the accepted G.1
> version-3 checkpoint.
> **Branch:** `slice-g-structured-concurrency`.
>
> **Canonical documentation change:** none. `../composition.md` §8 ("Parallel Workflow branches" /
> "branch progress may be represented separately"), `../execution-runtime.md` §2 / §4.2
> ("single-writer state rule … while one Execution has only one active controller writer, it may
> still have many things in flight") and §10 ("PendingOperation and ControllerResumption are
> different") already own this space. `../future-plan.md` §1.3 gains one line pointing here as
> reference-implementation evidence; every open question stays open.

This is an engineering record, not a new owner of runtime or composition semantics.

## 0. Independent-review correction after `a9ad428`

Independent review accepted the G.2 architecture in direction but found two defects in the
dependency-set acceptance boundary at reviewed HEAD
`a9ad42832ce341d6689f06e442472cce0082caf3`:

1. `Harness.applyOutcome` processed Effects before runtime identity/ownership validation of every
   reported resumption, so an invalid outcome could cross the Effect boundary before failing.
2. A legitimately recovered sibling could settle while the re-entered Activation was RUNNING.
   Settlement before `resolveMany` was misclassified as invalid, while settlement after
   `resolveMany` could be missed by the final transaction and leave a lost `WAITING` wake.

The correction is implementation-only. Dependency identity/ownership is now preflighted before any
Effect authorization, journal request, dispatch, PendingOperation creation, or external
consequence. The final transaction then derives READY versus WAITING from current mailbox and
ControllerResumption truth. Canonical composition/runtime semantics, the G.1/G.2 branch model, and
`WORKFLOW_CONTROL_STATE_VERSION = 4` are unchanged. G.2 remains unmerged and awaits independent
re-review; no G.3 work begins here.

## 1. Why G.2 exists

G.1 proved *system-defined parallel branches with an explicit join*, but only for branches that
were exactly one adapter-free Function Stage reaching a local terminal result. A branch that
returned `awaitEffects` failed closed (`parallel_branch_effects_unsupported`).

G.2 removes that restriction: a branch may hold a **real asynchronous dependency** — a
`UseCapability` Effect, an Agent/Workflow child `call`, or a slow model call — while remaining a
branch of one Workflow Execution. The central invariant is unchanged:

> **Serialize controller-state mutation; parallelize independent work.**

There is still exactly one controller-state writer per Activation. What changed is that the
Execution can now wait on a *set* of dependencies at once, and any one settling re-enters the
controller.

## 2. What did **not** change (preserved G.1 topology)

```text
a G.2 branch is still exactly one Stage
    ↓ transitions: exactly { kind: "always", next: { to: "join", fork: <own fork> } }
explicit join of its fork
```

No multi-Stage branch subgraph, no branch loop, no nested fork, no dynamically authored branch
topology, no fork/join Stage kind, no fork/join Effect. `WorkflowForkDefinition { id, branches,
join: { next } }` and `{ to: "fork" }` / `{ to: "join" }` are the whole topology model, unchanged.
The join successor is still exactly one downstream Function Stage; `D.input` is still the fork
input; `WorkflowJoinContext.branches` is still authored order.

## 3. Supported branch Stage kinds

G.1: `function` only. G.2: any **adapter-free** Stage kind —

```text
function   complete locally | fail | request UseCapability Effect(s)
llm        the existing bounded LLM Stage: model phases, UseCapability Effects between phases,
           ControllerResumption for a slow model call, a final Stage result
agent      the existing child-call Stage semantics: one SpawnExecution `call`, join after the
workflow   child's terminal result
```

This adds **no Stage kind** — `STAGE_KINDS` stays `["function", "llm", "agent", "workflow"]`. The
branch's own transition is still fixed to its fork's join; no branch transition label is accepted.

**`branch ≠ child Execution`.** An Agent/Workflow branch Stage creates its semantically-required
child through the ordinary `SpawnExecution` path — that child is a real Execution. The branch
itself is never an Execution, and G.2 never creates a child merely to simulate a branch. A fork of
two Function branches plus one Agent branch creates exactly **one** child Execution (the Agent
Stage's), not three.

## 4. Deferred (fail-closed) branch semantics

| Attempt | Code |
| --- | --- |
| branch `WriteMemory` (`{ kind: "write_memory" }` in `awaitEffects`) | `parallel_branch_memory_write_deferred` |
| branch non-empty emissions | `parallel_branch_emissions_unsupported` |
| branch transition label | `parallel_branch_transition_unsupported` |
| branch Stage with input/output Adapters | static `invalid_branch` |
| branch declares `inputAdapters` / `outputAdapters` on the branch entry | static `invalid_branch` |
| a branch Stage transition to anything but its fork's join | static `invalid_branch` |

The memory-write case is **critical**: G.0 gives the optimistic `expectedRevision` primitive, but
**G.3** is where concurrent Structured Memory branch writes and deterministic conflict handling are
proved. A branch that returns `{ status: "awaitEffects", effects: [{ kind: "write_memory", … }] }`
fails closed *before* any proposal reaches the Harness — no Effect journal entry, no
PendingOperation, no memory mutation, no revision advance. G.2 implements no reducers, retries, or
conflict resolution.

## 5. WorkflowControlState evolution — version 3 → **4**

`WORKFLOW_CONTROL_STATE_VERSION` **3 → 4** (`workflow/control-state.ts`). G.1 is now the accepted
version-3 checkpoint, so G.2's genuine per-branch shape change is a real version bump (not an
in-place revision like 025 §0 was).

```ts
type WorkflowParallelBranchStatus = "ready" | "awaiting_effects" | "awaiting_resumption" | "completed";

interface WorkflowParallelBranchState {
  readonly branchId: BranchId;
  readonly stageId: StageId;
  readonly visit: number;                       // branch-local Stage invocation number (from `visits`)
  readonly input: StageResult;                  // the fork-input snapshot, per branch
  readonly progress: JsonObject;                // branch-local Stage-body progress
  readonly status: WorkflowParallelBranchStatus;
  readonly barrier: readonly BarrierEntry[];    // NEW - this branch's own completion barrier
  readonly result: StageResult | null;
}
```

Each branch independently owns its Stage visit, input, progress, **completion barrier**, wait
status, and final result. The top-level `stageProgress` / `barrier` / `boundary` are **not** shared
between branches. There is no branch mailbox, no branch lifecycle state, no branch authority, and
no RuntimeStore branch facet — everything is JSON controller state, and a JSON round trip of an
active fork with two blocked branches preserves it exactly.

`readWorkflowControlState` reads a version-3 active fork unchanged: a branch with no `barrier` field
defaults to `[]`, and `ready` / `completed` are unchanged statuses.

`currentStage` + `visit` stay one truthful ordinary Stage invocation coordinate during a fork (the
025 §0 correction), `visits` is still the allocation high-water, `forkVisit` is still independent of
visit allocation.

## 6. The runtime dependency-set (union) wait

The central runtime change. Before G.2 a controller could report `await_event(wake)` **or**
`await_resumption(id)` — one primary wait. A parallel Workflow may legitimately have one branch
waiting on an Effect result Event and two branches mid slow model calls *at the same time*.

### `ControllerNext` gains one arm (`ports/controller.ts`)

```ts
| {
    readonly status: "await_dependencies";
    readonly event?: WakeCondition;                     // Effect/child result -> some branch runnable
    readonly resumptions?: readonly ControllerResumptionId[];  // any one settling -> some branch runnable
  }
```

Rules (structural, in `runtime/activation.ts`):

```text
at least one of `event` / a non-empty `resumptions` is present
resumption ids are unique and well-formed
Effects may accompany this arm ONLY when `event` is present (their result Events answer it)
there is NO `interleave` field on this arm
```

### `ExecutionWait` gains one kind (`execution/context.ts`)

```ts
| {
    readonly kind: "dependencies";
    readonly event: WakeCondition | null;
    readonly resumptions: readonly ControllerResumptionId[];
  }
```

built by `dependenciesWait(event, resumptions)`. The two dependency kinds stay **explicit and
distinct** inside it:

```text
event         matched through the mailbox / Event router
resumptions   settled through the ControllerResumptionProcessor
```

No generic untyped "promise handle" bag, no public resumption settlement ingress, no
ControllerResumption Event, no PendingOperation for a model call.

### Exact wake semantics

```text
waiting on { event E, resumption R1, resumption R2 }

E arrives (matches `event`)   -> WAITING -> READY;   R1, R2 stay pending and are NOT invalidated
R1 settles                    -> WAITING -> READY;   R2 stays pending; E stays semantically outstanding
R2 settles while already READY -> record R2's outcome; NO second READY transition, NO duplicate wake
a resumption-only union wait  -> an ordinary Event does not wake it (mailbox only), exactly like the
                                 plain `controller_resumption` arm
```

## 7. Why this is **not** `interleave`

E.1's `interleave` closes a still-pending resumption when an opted-in Event overtakes it, *because
an unrelated semantic continuation may have changed the assumptions under the suspended work*.

Sibling parallel branches are explicitly separate progress. Branch B's Effect result arriving does
not change the assumptions under branch C's model call. So the E.1 stale-continuation invalidation
rule **deliberately does not apply** to a `dependencies` wait: the `event` member waking the
Execution leaves every `resumptions` member valid, and vice versa. The `dependencies` arm carries
no `interleave` field, and `event-router.ts` / `resumption-processor.ts` never invalidate a sibling
when one member of the set fires. Existing E.1 `interleave` semantics on the `event` /
`controller_resumption` arms are untouched.

## 8. Fail-closed, race-safe dependency-set acceptance

Each Activation records the persisted resumption ids that its own
`ControllerResumptionScope.run()` actually returned as `suspended(id)` while pending.
`ControllerResumptionProcessor.resolveMany(ids, at)` returns:

```ts
| {
    status: "ok";
    newRecords: readonly ControllerResumption[];
    recoveredIds: readonly ControllerResumptionId[];
    alreadySatisfied: boolean;
  }
| { status: "invalid"; detail: string }
```

Classification is deliberately strict:

```text
new registration from this Activation                  -> newRecords
persisted id observed pending by this Activation       -> recoveredIds
that observed id raced pending -> settled              -> recoveredIds + alreadySatisfied
arbitrary old settled id / foreign id / invalidated id -> invalid
duplicate id                                            -> invalid
```

Knowing an old id is therefore not authority to wait on it. The special acceptance of a settled
record applies only when this Activation really received `suspended(id)` for that record while it
was pending.

`Harness.applyOutcome` uses this exact order for `await_dependencies`:

```text
1. preflight resolveMany(reported ids)
     invalid -> fail before Effect authorization/journal/dispatch/PendingOperation/external work
2. process this Activation's accepted Effects
3. ONE transaction:
     insert EVERY newRecord
     peek the mailbox for the reported event
     re-read EVERY recoveredId
     invalidated / missing / ownership-impossible -> fail closed
     matching Event OR any recovered resumption settled -> READY + requeue
     otherwise                                      -> WAITING on the dependency set
     persist controller progress and lifecycle atomically with those decisions
4. post-commit: attach every accepted newRecord on both READY and WAITING paths
```

The final re-read closes both timing windows. A record observed pending and settled before
preflight remains a legitimate satisfied member instead of failing the Workflow. A record that
settles after preflight but before the final transaction is seen settled there, so the Harness
cannot persist `WAITING` on a wake that will never recur. If settlement happens after the final
transaction, transaction serialization makes settlement observe `WAITING` and perform the
ordinary wake.

Recovery can never observe a partial set of new registrations. A recovered member is already being
followed from the Activation that first reported it; `attach` is a no-op for it. A registration
the controller did not report is abandoned by never being attached.

### The fast / mixed path (`await_dependencies` + an already-available Event)

If the controller reports `event E` + `resumption R` and E's result is already in the mailbox when
the Harness checks: the Execution stays runnable **and** R's record is still committed and attached
— never abandoned or re-dispatched merely because E won the race. R settling later, while the
Execution is READY, records R's outcome and causes no extra wake; the next Activation reconstructs
R by stable key and is handed the stored result.

## 9. Branch-qualified Effect correlation

`workflow/control-state.ts`:

```ts
branchStageCorrelationId(forkId, forkVisit, branchId, stageId, visit, requestKey)
  -> "wf/fork/<forkId>#<forkVisit>/branch/<branchId>/stage/<stageId>#<visit>/request/<requestKey>"
  e.g. "wf/fork/p#2/branch/research/stage/b#7/request/search"
```

Built from persisted semantic coordinates only, so it is stable across Activation reconstruction,
unique between sibling branches, unique between repeated fork invocations, and unique between a
branch's own requests. **Two sibling branches may both use the Stage-local request key `"search"`
and still receive only their own observations.** It is not a credential, not authority, not a
runtime owner. Event vocabulary is unchanged — the Effect still belongs to the enclosing Workflow
Execution and uses its current effective authority, the ordinary authorizer, and the ordinary
confirmation / PendingOperation machinery. Delivered result Events are folded into branch-local
barriers (`collectBranchEvents`) by exact correlation match — a stale/duplicate Event, or a result
from an earlier fork invocation, settles nothing.

## 10. Branch-qualified ControllerResumption keys

`workflow/resumption-keys.ts` refactored around a **scope** string:

```ts
stageResumptionScope(stage, visit)                    -> "wf/<stage>#<visit>"
branchStageResumptionScope(forkId, forkVisit, branchId, stage, visit)
  -> "wf/fork/<forkId>#<forkVisit>/branch/<branchId>/stage/<stage>#<visit>"
modelPhaseResumptionKey(scope, phase)                 -> "<scope>/model/phase<n>"
adapterPositionResumptionKey(scope, position, index)  -> "<scope>/adapter/<position>/<index>"
```

`stageModelResumptionKey` / `stageAdapterResumptionKey` are kept as back-compatible thin wrappers
(their exact output strings — `wf/draft#1/model/phase1`, `wf/compute#1/adapter/output/1` — are
unchanged). A branch LLM Stage's phase-1 key is
`wf/fork/p#2/branch/c/stage/c#8/model/phase1`, so two sibling LLM branches never collide by key and
each recovers only its own model call. Nothing in the key is process-local (no Promise identity, no
`ActivationId`, no array index, no completion order).

## 11. Reusing existing Stage semantics — no second interpreter

`runBody` was refactored to `runStageBodyFor(stage, coord: BodyCoordinate, view, activationFacts,
resumptions)`. Both the ordinary linear Stage step and a parallel branch step build a
`BodyCoordinate` (`{ visit, input, progress, observations, join, resumptionScope }`) and call the
**same** function — so Function-outcome validation, LLM Stage execution, child-call construction,
and model-call resumption are identical whether the coordinate is `wf/<stage>#<visit>` or the
branch-qualified form. The branch wrapper (`attemptBranch`) supplies branch-local coordinates,
progress, observations, and barrier; it never invents a different meaning for a Stage kind. Shared
helpers added: `buildEffectBarrier` (barrier + proposal construction, `correlationFor` is the only
difference), `childBarrierFailure` (child-outcome → Stage failure code, shared by `finishChildStage`
and `attemptBranch`), `collectBranchEvents`, and the barrier-level `settleBarrier` /
`settleChildBarrier` / `observationsOfBarrier` / `childBarrierEntryOf` / `unsettledBarrierEntries`
primitives.

## 12. `advanceParallel` flow (G.2)

```text
parallel.joinReady === false:
  1. collectBranchEvents(parallel, activation.events)      // fold result Events into branch barriers
  2. for each branch, in authored order:
       completed                          -> idle
       awaiting_effects, barrier complete -> re-enter its Stage body with branch observations
       awaiting_effects, barrier open     -> idle (not runnable)
       awaiting_resumption                -> reconstruct its model call by stable key
       ready                              -> run its Stage body
     runnable attempts start before any is awaited (overlap); each computes from an immutable
     branch snapshot; NO Promise mutates WorkflowControlState
  3. fold outcomes in authored branch order into ONE new WorkflowParallelState
       any branch failed  -> earliest authored failure fails the Workflow; ALL proposals + all
                             this-Activation resumption registrations discarded
       all completed       -> persist joinReady = true, yield  (Stage D has NOT run)
       otherwise           -> ONE `await_dependencies`:
                                event       = EFFECT_RESULT_EVENT_KINDS wake if any branch awaits Effects
                                resumptions = every outstanding branch resumption id
                                proposals   = flattened authored-branch-order Effect proposals
parallel.joinReady === true:
  the explicit join, exactly as G.1: enter Stage D with the fork input + the immutable
  WorkflowJoinContext, clear the fork
```

### Deterministic ordering rules

```text
Effect proposal order       authored branch order, then Stage request order within a branch
                            (B requests b1,b2 ; C requests c1  ->  [b1, b2, c1])
result settlement order     independent - C1,B2,B1 is fine and routes correctly by correlation
primary Workflow failure    the earliest authored failing branch, never the first to fail in
                            wall-clock time
```

Proposal ordering is semantic/audit determinism only; it does not imply external completion order.

## 13. Files changed

Core:

- `workflow/control-state.ts` — version 3 → 4; `WorkflowParallelBranchStatus`; `barrier` on
  `WorkflowParallelBranchState`; `branchStageCorrelationId`; barrier-level `settleBarrier` /
  `settleChildBarrier` / `observationsOfBarrier` / `childBarrierEntryOf` / `unsettledBarrierEntries`;
  `normalizeParallel` v3 backfill; `installFork` seeds `barrier: []`.
- `workflow/resumption-keys.ts` — scope refactor (`stageResumptionScope` /
  `branchStageResumptionScope` / `modelPhaseResumptionKey` / `adapterPositionResumptionKey`);
  back-compatible `stageModelResumptionKey` / `stageAdapterResumptionKey` wrappers.
- `workflow/validation.ts` — branch Stage body widened from `function` to any `STAGE_KINDS` member
  (adapter-free); branch-entry Adapter declaration rejected.
- `controllers/workflow/llm-stage.ts` — `runLLMStage` takes an explicit `resumptionScope`.
- `controllers/workflow/controller.ts` — `runStageBodyFor` / `BodyCoordinate`; `buildEffectBarrier`;
  `childBarrierFailure`; `collectBranchEvents`; `advanceParallel` / `runParallelBranches` /
  `attemptBranch` rewrite; `StepOutcome` gains `awaitDependencies`; `finish` maps it.
- `ports/controller.ts` — `ControllerNext` `await_dependencies` arm.
- `execution/context.ts` — `ExecutionWait` `dependencies` kind + `dependenciesWait`.
- `runtime/activation.ts` — `await_dependencies` structural validation.
- `runtime/harness.ts` - dependency-set preflight before Effects; atomic multi-record commit;
  transactional Event + recovered-resumption re-read; READY/WAITING decision;
  `attachDependencyResumptions`.
- `runtime/event-router.ts` — route the `dependencies` `event` member without invalidating siblings.
- `runtime/resumption-processor.ts` - `resolveMany` / `ResumptionDependencySet`;
  Activation-observed pending recovery classification; `settle` wakes a `dependencies` wait; no
  sibling invalidation.

Docs/tests:

- `docs/development/026-slice-g2-parallel-branch-dependencies.md` — new (this file).
- `docs/future-plan.md` §1.3, `docs/development/008-…roadmap.md`, `docs/development/README.md` —
  narrow status updates.
- `tests/conformance/workflow/parallel-fork-join.test.ts` — the G.1 regression suite; 3 cases
  updated for G.2 (branch body widened, version 4, branch `WriteMemory` is the fail-closed case).
- `tests/conformance/workflow/parallel-branch-effects.test.ts` — new (Function branch Effects,
  Agent/Workflow branch child calls, fail-closed deferrals).
- `tests/conformance/workflow/parallel-branch-resumptions.test.ts` - branch model resumptions,
  mixed Event + resumption, fast/mixed path, reconstruction, and deterministic settlement before
  preflight plus after-preflight/before-commit race proofs.
- `tests/conformance/execution/multi-dependency-wait.test.ts` - runtime dependency-set semantics,
  fail-closed invalid-dependency-plus-real-Effect proof, dependency validation, failure atomicity,
  and G.1 regressions under G.2.

## 14. Local validation (local, not CI)

```text
npm test                        1078 pass, 0 fail   (was 1049 at the G.1 checkpoint)
npm run test:conformance         827 pass, 0 fail   (was 798)
npm run test:mcp                  68 pass, 0 fail
npm run test:evals               12 pass, 0 fail    (unchanged)
npm run test:benchmark-subjects   8 pass, 0 fail
npm run typecheck               pass
git diff --check                clean
```

GitHub CI: not observed from this environment.

## 15. Scope check (diff inspected before commit)

```text
no new Stage kind / Effect kind / Event kind         (dependencies is a WAIT kind only)
no child Execution for a branch itself
no new RuntimeStore / Harness facet
no branch mailbox / lifecycle / authority / spawn budget
no reducer / merge framework / join synthesis
no Working Notes branch handling
no concurrent Structured Memory branch writes (G.3)
no multi-Stage branch subgraph / branch loop / nested fork / branch Adapters / branch emissions
no interleave on the dependencies arm; existing E.1 interleave semantics untouched
one canonical pointer only (future-plan.md §1.3), no canonical rewrite
```

## 16. Explicit deferred list after G.2

```text
concurrent Structured Memory branch writes / deterministic conflict handling      -> G.3
memory conflict merge / retry policy; field-level revisions
multi-Stage branch subgraphs / branch loops / labelled branch routing
nested forks / concurrently active forks
branch Adapters
branch emissions (completion-order / authored-order / partial-flush / join-time merge)
join reducers / automatic merge / join LLM synthesis / automatic retry
Working Notes branch sharing or merge
locks / leases / semaphores / fencing / CRDTs
detached / non-blocking branch work
cancellation propagation from a failed branch to its siblings
Slice-H / I durability machinery for the active-fork record and the dependency set
```

G.3 remains the first slice where two parallel branches may mutate the same Structured Memory view
and the architecture proves deterministic conflict handling.

## 17. Status

The G.2 checkpoint is implemented on `slice-g-structured-concurrency`; the independent-review
correction after reviewed HEAD `a9ad42832ce341d6689f06e442472cce0082caf3` makes dependency-set
acceptance fail-closed before Effects and race-safe at the final transaction. **Not merged. Not
self-approved.** Awaiting independent G.2 re-review before any G.3 work begins.
