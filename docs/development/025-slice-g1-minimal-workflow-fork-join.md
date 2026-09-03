# Slice G.1 — minimal system-defined Workflow fork/join

> **Status:** implemented on the long-lived branch `slice-g-structured-concurrency`, continuing
> directly from the independently-accepted G.0 checkpoint. **Not merged. Awaiting independent
> architecture review.** This record covers **G.1 only** — the narrowest honest proof of
> system-defined parallel Workflow branches with an explicit join.
>
> **Starting SHA:** `5fb2aab47a6d2238f8e2185dd785c81de7770925` (G.0 — "feat(memory): G.0 optimistic
> WriteMemory precondition + explicit conflict observation"), whose parent is
> `cadf1f19eb38a5541c303f9fe4aa4a870855d2b7` (merge of the reviewed Slice F, PR #12).
> **Branch:** `slice-g-structured-concurrency`.
>
> **Canonical documentation change:** none. `../composition.md` §8 ("Parallel Workflow branches" /
> "structured parallelism" / "Parallel branches must not silently race on shared state"),
> `../execution-runtime.md` §4 ("Serialize controller-state mutation; parallelize independent work"),
> and `../mental-model.md` already own this space and already establish structured parallelism,
> separate branch progress, one controller writer, and explicit join. `../future-plan.md` §1.3 gains
> a one-line pointer to this record as reference-implementation evidence; every open question stays
> open.

This is an engineering record, not a new owner of runtime or composition semantics. The canonical
documents named by [`../README.md`](../README.md) remain authoritative.

## 1. Why G.1 exists

The v0.6 Structured Concurrency target is:

```text
structured parallel Workflow branches
  + branch-local progress
  + explicit join
  + deterministic merge/conflict behavior
  + first optimistic shared-state concurrency primitive
```

G.0 delivered the last item (optimistic Structured Memory `expectedRevision`). G.1 delivers the
first honest slice of the first three: an authored fork/join topology, branch-local controller
state, and an explicit join — for the single narrow shape below, and nothing wider.

Core principle preserved:

> **Serialize controller-state mutation; parallelize independent work.**

## 2. The implemented topology shape

```text
Stage A
   ↓  transitions: { kind: "always", next: { to: "fork", fork: "p" } }
 fork P
  ├─ branch "b" → Function Stage B → { to: "join", fork: "p" } → result B
  └─ branch "c" → Function Stage C → { to: "join", fork: "p" } → result C
   ↓  explicit join P
 Stage D   (join successor; ordinary Function Stage)
   ↓
 complete
```

Exported shapes (`packages/core/src/workflow/spec.ts`):

```ts
type TransitionTarget =
  | { readonly to: "stage"; readonly stage: StageId }
  | { readonly to: "complete"; readonly terminal?: TerminalProposal }
  | { readonly to: "fork"; readonly fork: ForkId }      // G.1
  | { readonly to: "join"; readonly fork: ForkId };     // G.1

interface WorkflowForkBranch { readonly id: BranchId; readonly stage: StageId; }

interface WorkflowForkDefinition {
  readonly id: ForkId;
  readonly branches: readonly WorkflowForkBranch[];      // >= 2
  readonly join: { readonly next: StageId };             // exactly one downstream Function Stage
}

interface WorkflowSpec {
  readonly entryStage: StageId;
  readonly stages: readonly StageDefinition[];
  readonly forks?: readonly WorkflowForkDefinition[];    // absent => pre-G.1 behaviour, unchanged
}
```

`ForkId` and `BranchId` are branded authored-identity strings (same pattern as `StageId`): not
`ExecutionId`s, not runtime-minted, nothing addressed to them, no lifecycle. Fork and join are
Workflow **topology** — graph edges resolved by the controller — not Stage bodies and not Effects.

### No new Stage / Effect / Event vocabulary

```text
STAGE_KINDS   ["function", "llm", "agent", "workflow"]        unchanged
EFFECT_KINDS  the existing five                               unchanged
EVENT_KINDS   unchanged - branch completion is controller-local computation, not a
              runtime-boundary observation, so it needs no Event
```

`fork` / `join` / `branch` / `parallel` are **not** Stage kinds, not Effect kinds, and not Event
kinds. There is no fork/join Effect and no fork/join `PendingOperation`.

## 3. WorkflowControlState evolution

`WORKFLOW_CONTROL_STATE_VERSION` **2 → 3** (`packages/core/src/workflow/control-state.ts`).

New persisted shapes (plain JSON only — no `Promise`, `AbortController`, executor, closure, Harness,
or store handle anywhere; `JSON.parse(JSON.stringify(progress))` preserves an active fork exactly):

```ts
interface WorkflowParallelBranchState {
  readonly branchId: BranchId;
  readonly stageId: StageId;
  readonly visit: number;               // this branch's own Stage visit, distinct per branch
  readonly input: StageResult;          // the fork-input snapshot, per branch
  readonly progress: JsonObject;        // branch-local, owned by the branch Function body
  readonly status: "ready" | "completed";
  readonly result: StageResult | null;
}

interface WorkflowParallelState {
  readonly forkId: ForkId;
  readonly forkVisit: number;           // fork-invocation coordinate (see §5)
  readonly input: StageResult;          // the post-Stage-A result that entered this fork
  readonly branches: readonly WorkflowParallelBranchState[];   // authored order, never completion order
  readonly joinReady: boolean;
}

interface WorkflowControlState {
  // ... existing fields unchanged ...
  readonly forks: number;                        // monotone fork-entry counter (like `transitions`)
  readonly parallel: WorkflowParallelState | null;   // the active fork, between entry and join
  readonly join: WorkflowJoinContext | null;         // the join snapshot for the current Stage visit
}
```

While `parallel !== null`, `currentStage` names the Stage whose transition entered the fork — the
Workflow is **between** that Stage and the join, not executing `currentStage`. The controller routes
on `parallel` before it looks at `currentStage`, `barrier`, or `boundary`. There is no ambient
branch-shared `stageProgress`: every branch owns its own `progress`, `visit`, `status`, and
`result`.

`initialWorkflowControlState` seeds `forks: 0, parallel: null, join: null`; `readWorkflowControlState`
tolerates their absence in a pre-v3 record; `enterStage` threads `forks` forward exactly like
`transitions` (entering an ordinary Stage clears `parallel`/`join` but never rewinds the fork count).

## 4. Branch identity and fork invocation identity

- **Branch identity** is the authored `BranchId`, carried on every `WorkflowParallelBranchState` and
  every `WorkflowJoinedBranchResult`. Array index is never used as semantic identity — G.2 will need
  branch identity in Effect/resumption correlation, so it is explicit now.
- **Fork invocation identity** is `WorkflowParallelState.forkVisit`, taken from
  `WorkflowControlState.forks + 1` at fork entry. `forks` is monotone over the whole Execution and
  survives loops, so a future revisit of the same authored `ForkId` gets a distinct `forkVisit`.
  G.1 does **not** implement the G.2 correlation changes; it only refuses to make branch/fork
  identity implicit.

## 5. Supported G.1 branch subset

A branch body is **exactly one Function Stage**. Static validation
(`packages/core/src/workflow/validation.ts`, `forkTopologyIssues` + fork-aware `targetIssues` /
`transitionsIssues`) rejects everything else at definition time:

```text
fork id: valid portable identifier, unique
fork: >= 2 branches
branch ids: valid, unique within the fork
every branch Stage exists
a Stage belongs to at most one branch (across all forks)
a branch Stage is a `function` Stage
a branch Stage is not the entryStage
a branch Stage is reached only through its fork (no ordinary { to: "stage" } edge into it)
a branch Stage's topology is exactly { kind: "always", next: { to: "join", fork: <own fork> } }
  - no labelled routing, no loop, no nested fork, no other fork's join
a non-branch Stage must not transition to { to: "join" }
a { to: "fork" } target names a declared fork
a { to: "join" } target names the fork that owns that branch Stage
the join successor exists, is a `function` Stage, and is not one of the fork's own branch Stages
a branch Stage declares no input/output Adapters
```

Runtime branch outcomes (`WorkflowController.classifyBranchOutcome`):

```text
status: "completed"   → branch-local result + returned progress recorded
status: "failed"      → prevents the join, fails the Workflow (see §8)
status: "awaitEffects" → parallel_branch_effects_unsupported, fail closed (see §7)
```

Also refused for G.1, rather than given timing-sensitive semantics: branch emissions
(`parallel_branch_emissions_unsupported`) and a branch returning a transition label
(`parallel_branch_transition_unsupported`). No `ControllerResumption` support is added to branch
execution.

## 6. How independent Function work overlaps without concurrent controller-state mutation

```text
Activation N     Stage A completes → installFork(...) installs WorkflowParallelState → persist → continue
Activation N+1   for each branch: build a StageExecutionContext from that branch's own immutable
                 snapshot, invoke implementation.run(context) NOW (starts the body), collect the
                 Promise; then `await Promise.all([...])` — the bodies overlap in wall-clock time.
                 Fold outcomes in AUTHORED branch order into one new WorkflowParallelState.
                 → persist joinReady = true → continue   (Stage D has NOT run)
Activation N+2   the explicit join: enterStage(D) with the fork input as D's ordinary input, splice
                 the immutable WorkflowJoinContext onto the entered state, clear `parallel`
Activation N+3   D's body runs (entering a Stage and running its body are separate Activations, as
                 for every ordinary transition)
```

`Promise.all` is used only around independent local Function execution and only after branch-local
state exists. No branch Promise mutates a shared `WorkflowControlState` as it resolves — the single
serialized commit happens after every branch has settled. `Promise.all` over already-started
wrappers (each wrapper catches its own throw and returns a `BranchRun`) means no sibling body is
left unobserved when another fails.

## 7. What happens if a branch returns `awaitEffects`

The Workflow fails with code `parallel_branch_effects_unsupported` and a message identifying the
fork and the branch. No Effect is proposed, no barrier entry is created, no `PendingOperation` is
opened, and the Effect journal stays empty. Silently supporting branch Effects without
branch-scoped barrier/correlation state would implement the unsafe half of G.2; the refusal is
deliberate.

## 8. Explicit join semantics

Completing the branch bodies is **not** the downstream transition. The join is a separate semantic
controller step (Activation N+2 above):

```text
fork  !=  branch completion  !=  join  !=  downstream Stage execution
```

- There is a persisted state (`parallel.joinReady === true`, both branches `completed`,
  `state.join === null`, `currentStage` still the forking Stage) in which the branches are done and
  Stage D has not executed. A conformance case inspects exactly this state.
- The join enters Stage D through the ordinary `enterStage` path, counts as one `transitions`
  increment (subject to `maxTransitions`), and is the only place `parallel` is cleared.
- D is never executed inside whichever branch finished last — timing is not the join mechanism.

### Join-result surface

```ts
interface WorkflowJoinedBranchResult { readonly branchId: BranchId; readonly stageId: StageId; readonly result: StageResult; }
interface WorkflowJoinContext { readonly forkId: ForkId; readonly branches: readonly WorkflowJoinedBranchResult[]; }

interface StageExecutionContext {
  // ... existing fields ...
  readonly join: WorkflowJoinContext | null;
}
```

- `context.join` is `null` for every ordinary Stage visit; present only on the visit a join created.
- `branches` is in **authored branch order**, carrying each branch's final `text | none` result —
  never branch progress, never a handle to branch state.
- B and C are **not** merged into one `StageResult`, not concatenated, not "last result", not an
  object serialized into the text edge.
- `D.input` stays the fork's original incoming `StageResult`; `D.join` carries the parallel results
  alongside it. A conformance case asserts `D.input === "seed"` while `D.join.branches` carry the
  branch outputs.
- The join snapshot is persisted with D's visit and survives an Activation boundary: a conformance
  case has D issue an ordinary required `UseCapability`, wait, and re-enter — `context.join` is
  still present on re-entry. It is cleared when the Workflow leaves D through an ordinary
  transition.

## 9. Deterministic ordering rule

```text
persisted branch results  → always authored branch order (b, then c), never Promise resolution order
primary failure           → the earliest authored branch that failed, never the first to fail in wall-clock time
```

Conformance cases force C to complete/fail before B and assert the persisted order and the reported
failure are still B-first.

## 10. Same-Execution / no-child proof

The pure fork/join proof creates **exactly one Execution** (the Workflow itself):

```text
store.listExecutions().length             === 1
harness.childExecutionLinksOf(id)          === []
harness.effectJournalOf(id)                === []        (no Effect for a fork or a join)
harness.pendingOperationsOf(id)            === []
harness.controllerResumptionsOf(id)        === []        (branch work is not a ControllerResumption)
```

No `ExecutionId`, mailbox, lifecycle, `EffectiveOperationAuthority` record, `PendingOperation`,
child link, or spawn-budget consumption is created for a branch. No new Harness/runtime-store facet
was added.

## 11. Serialization / reconstruction proof

- `JSON.parse(JSON.stringify(progress))` deep-equals `progress` at the join-ready snapshot
  (conformance).
- A second `Harness` with a brand-new `WorkflowController` over the same persisted store/scheduler
  reads the identical active-fork state byte for byte, then drives the join and downstream
  progression to `COMPLETED` from the persisted branch results (conformance, analogous to the
  existing Workflow barrier-persistence test). This is reconstructability from persisted semantic
  state — **not** a Slice-I crash-recovery claim.

## 12. Files changed

Core:

- `workflow/spec.ts` — `ForkId` / `BranchId` brands + guards; `TransitionTarget` / `TransitionTargetInput`
  gain `fork` / `join`; `WorkflowForkBranch`, `WorkflowForkDefinition`, `WorkflowForkDefinitionInput`;
  `WorkflowSpec.forks?`, `WorkflowSpecInput.forks?`; `findFork`.
- `workflow/validation.ts` — `invalid_fork` / `invalid_branch` issue codes; `forkTopologyIssues`;
  fork-aware `targetIssues` / `transitionsIssues` / `stageIssues` (all reduce to pre-G.1 behaviour
  when `forks` is absent).
- `workflow/observations.ts` — `WorkflowJoinedBranchResult`, `WorkflowJoinContext`.
- `workflow/control-state.ts` — version 2 → 3; `WorkflowParallelBranchState`, `WorkflowParallelState`;
  `WorkflowControlState.forks` / `.parallel` / `.join`; `installFork`, `joinContextOf`.
- `ports/stage.ts` — `StageExecutionContext.join`.
- `controllers/workflow/controller.ts` — `advanceParallel` / `runParallelBranches` /
  `classifyBranchOutcome`; `applyTransition` handles `{ to: "fork" }` (+ defensive `{ to: "join" }`);
  `enterStage` threads `forks`; `runBody` context carries `state.join`; the `complete` transition
  clears `join`.
- `execution-api.ts` — exports the new read-only shapes and guards.

Docs/tests:

- `docs/development/025-slice-g1-minimal-workflow-fork-join.md` — new (this file).
- `docs/future-plan.md` §1.3 — one-line pointer.
- `docs/development/008-v0.4-to-v1.0-development-roadmap.md`, `docs/development/README.md` — narrow
  status updates (G.0 independently accepted; G.1 implemented, awaiting review).
- `tests/conformance/workflow/parallel-fork-join.test.ts` — new (12 cases, §13).

## 13. Regression / conformance tests

`tests/conformance/workflow/parallel-fork-join.test.ts`:

1. `A → fork(B,C) → join → D` succeeds — four Function Stages, one Execution.
2. No child Execution / no child link.
3. No Effect journalled, no `PendingOperation`, no `ControllerResumption` for the local proof.
4. Both branches receive the same fork-input snapshot (`parallel.input`, both `branches[].input`).
5. Branch progress is separate persisted JSON — B's and C's `progress` differ and survive a round trip.
6. Local async branch work overlaps — deferred branch bodies, both started before either finishes.
7. Completion order is not semantic order — C finishes first, persisted results stay `[B, C]`.
8. The explicit join is a distinct boundary — a persisted `joinReady` state with D not run.
9. D receives branch results only at the join — `context.join` = both results, authored order.
10. D's ordinary input is the fork input, not a branch result.
11. Join context persists through a D re-entry driven by an ordinary required `UseCapability`.
12. Branch `awaitEffects` fails closed (`parallel_branch_effects_unsupported`), Effect journal empty.
13. A branch failure prevents the join and downstream execution (D never runs).
14. Multiple branch failures — reported by authored branch order, not completion timing.
15. Malformed fork topology rejected statically — duplicate fork ids, `< 2` branches, duplicate
    branch ids, unknown branch Stage, non-Function branch Stage, a Stage in two forks, wrong-fork
    join, ordinary Stage → join, ordinary Stage → branch Stage, nested-fork attempt, labelled branch
    Stage, unknown fork target, missing join successor, join successor is a branch Stage, entry
    Stage as a branch, branch Stage with Adapters, and `defineWorkflow` refusing to publish.
16. Existing linear Workflow behaviour unchanged; `parallel`/`join`/`forks` stay null/null/0.
17. Closed vocabularies stay closed — `STAGE_KINDS`, `EFFECT_KINDS` pinned; `WORKFLOW_CONTROL_STATE_VERSION === 3`.
18. Parallel control progress is plain serializable data.
19. Branch-local state reconstructs under a fresh `WorkflowController` over the same store.

Existing suites unchanged and still green — the full pre-G.1 Workflow topology / barrier /
resumption / adapter / stage / child-stage suites are the byte/behaviour-compatibility evidence for
"a Workflow with no `forks` is exactly as before".

## 14. Local validation (local, not CI)

```text
npm test                        1045 pass, 0 fail   (was 1033 at G.0)
npm run test:conformance         794 pass, 0 fail   (was 782)
npm run test:mcp                  68 pass, 0 fail
npm run test:evals               12 pass, 0 fail    (unchanged)
npm run test:benchmark-subjects   8 pass, 0 fail
npm run typecheck               pass
git diff --check                clean
```

## 15. Explicit deferred list for G.2 / G.3

Not implemented in G.1, each remains later G.x / future-plan work:

```text
LLM / Agent / Workflow branch bodies
branch Effects / branch Effect barriers / branch-local PendingOperation ownership
branch-qualified Effect correlation ids / branch-qualified ControllerResumption keys
branch ControllerResumptions
branch cancellation / failure-cancellation propagation to siblings
multi-Stage branch subgraphs / branch loops / labelled branch routing
nested forks / concurrently active forks
join reducers / automatic merge / join LLM synthesis / automatic retry
Working Notes branch sharing or merge; any ambient shared mutable branch object
Structured Memory parallel conflict handling at the join / G.0 optimistic writes inside branches
field-level memory revisions; transactions; locks / leases / semaphores / fencing / CRDTs
branch emission ordering semantics
Slice-H / I durability machinery for the active-fork record
```

## 16. Scope check (diff inspected before commit)

```text
no new Stage kind / Effect kind / Event kind
no child Execution for branch B or C
no new RuntimeStore / Harness facet
no branch Effects / branch ControllerResumptions
no LLM / Agent / Workflow branch support
no nested fork
no reducer / merge framework
no Working Notes merge
no G.3 Structured Memory parallel integration
no locks / leases / semaphores / fencing
one small canonical pointer only (future-plan.md §1.3), no canonical rewrite
```

## 17. Status

Implemented, committed, and pushed to `slice-g-structured-concurrency`. **Not merged. Not
self-approved.** Awaiting independent architecture review before any G.2 work begins.
