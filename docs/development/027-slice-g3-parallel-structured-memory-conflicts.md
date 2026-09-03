# Slice G.3 — concurrent Structured Memory branch writes + explicit optimistic conflict handling

> **Status:** implemented on the long-lived branch `slice-g-structured-concurrency`, continuing
> directly from the (still-unmerged, independently-reviewed) G.2 checkpoint. **Not merged. Awaiting
> independent architecture review.** This record covers **G.3 only**.
>
> **Starting SHA:** `5b943450c2950ae565b017e1cdc4510d87d32382` ("fix(runtime): make dependency-set
> acceptance race-safe") — the G.2 checkpoint *with its independent-review correction applied* (the
> preflight-before-Effects + race-safe final-transaction fix on top of the reviewed G.2 HEAD
> `a9ad428`; see 026 §0). Its parent is `a9ad42832ce341d6689f06e442472cce0082caf3` ("feat(workflow):
> G.2 parallel branch dependencies + runtime dependency-set union wait"). G.3 was first drafted on
> `a9ad428` and then rebased onto `5b94345` when the correction landed on the branch; the only
> rebase conflict was one status paragraph in `008-…roadmap.md` (merged, not overwritten).
> **Branch:** `slice-g-structured-concurrency`.
>
> **Canonical documentation change:** none. `../execution-runtime.md` §11 (shared-resource
> concurrency; "prefer explicit conflict semantics over timing-dependent last-write-wins"),
> `../memory.md` §15 (memory writes and concurrency), `../composition.md` §8 ("Parallel branches must
> not silently race on shared state"), and `../future-plan.md` §1.3 / §1.4 / §3.4 already own this
> space and deliberately leave the exact API evidence-driven. `../future-plan.md` §1.3 / §1.4 / §3.4
> gain a one-line pointer to this record as reference-implementation evidence; every open question
> stays open.

This is an engineering record, not a new owner of runtime or memory semantics. The canonical
documents named by [`../README.md`](../README.md) remain authoritative.

## 1. Why G.3 exists

G.2 let a parallel Workflow branch hold a real asynchronous dependency (a `UseCapability` Effect, a
child `call`, a slow model call) while staying a branch of one Workflow Execution. It deliberately
kept one door closed: a branch that returned `{ status: "awaitEffects", effects: [{ kind:
"write_memory", … }] }` failed the Workflow with `parallel_branch_memory_write_deferred` — because
supporting concurrent Structured Memory branch writes without deterministic conflict handling would
implement the unsafe half.

G.3 opens that door, using **only** two already-proven pieces and no new merge system:

```text
G.0   optimistic whole-view WriteMemoryProposal.expectedRevision; memory.written / memory.write_conflict;
      whole-view revision compare-and-set; authority-before-lookup; confirmation-time revision recheck
G.2   branch-local Effect barriers; branch-qualified Effect correlations; authored proposal folding;
      the one Workflow Execution owning every branch Effect; the dependency-set union wait
```

Architectural rule preserved verbatim:

> **Parallel branches may mutate a shared versioned resource only through its explicit concurrency
> semantics. A stale write becomes an observable conflict; it never silently overwrites newer state.**

## 2. What did **not** change

```text
a G.3 branch is still exactly one adapter-free Stage inside one Workflow Execution -> explicit join
no branch Execution, no multi-Stage branch subgraph, no nested fork, no branch loop, no reducer
no new Stage / Effect / Event / Execution / wait kind
no BranchMemory, no branch-specific memory store path, no memory-specific branch correlation namespace
no automatic retry, no automatic merge, no "pick the other branch", no LLM conflict-synthesis pass
WORKFLOW_CONTROL_STATE_VERSION stays 4 — the G.2 branch `BarrierEntry` already represents `write_memory`
```

The ordinary `write_memory` Effect and the existing `memory.written` / `memory.write_conflict` Events
are sufficient. `EFFECT_RESULT_EVENT_KINDS` already contains both, so a branch barrier waiter and the
dependency-set `event` member already wake on them.

## 3. The one production change — the branch `awaitEffects` rule

`controllers/workflow/controller.ts`, `attemptBranch`, the `outcome.status === "awaitEffects"` arm.
The G.2 blanket prohibition:

```ts
const memoryWrite = outcome.effects.find((r) => r.kind === "write_memory");
if (memoryWrite !== undefined) return { kind: "fail", code: "parallel_branch_memory_write_deferred", … };
```

is replaced by an **optimistic-write requirement**:

```ts
const unversioned = outcome.effects.find(
  (r) => r.kind === "write_memory" && r.expectedRevision === undefined,
);
if (unversioned !== undefined) {
  return { kind: "fail", code: "parallel_branch_memory_write_requires_revision", … };
}
// versioned writes fall through to the ordinary buildEffectBarrier(...) path
```

- **A branch `WriteMemory` with an `expectedRevision`** flows through the *same* `buildEffectBarrier`
  helper every other branch Effect uses. `buildEffectBarrier` already forwards `expectedRevision`
  onto the `writeMemory(...)` proposal (G.0 plumbing), builds an ordinary `write_memory`
  `BarrierEntry` (`effectKind: "write_memory"`, `memoryKey`), and correlates it with the G.2
  branch-qualified id. Nothing new.
- **A branch `WriteMemory` without an `expectedRevision`** fails closed *before* the proposal reaches
  the Harness — `runParallelBranches` sees the branch `fail`, returns `{ kind: "fail" }` with no
  proposals, and `finish` emits `next: { status: "fail" }` with no `effects`. No Effect journal
  entry, no PendingOperation, no ConfirmationRequest, no revision advance. Exact code name:
  **`parallel_branch_memory_write_requires_revision`**.
- **The scope is exactly "emitted from a parallel branch Stage".** `expectedRevision` is *not* made
  globally mandatory. An ordinary non-parallel Function-Stage `WriteMemory` and every Agent /
  non-parallel model-directed write keep the accepted G.0 / F.0 unconditional semantics, byte for
  byte. The F.1.1 model-facing write callable's input schema stays `{ value }` with
  `additionalProperties: false` — G.3 exposes no `expectedRevision` to any model-facing surface.

The reason for the asymmetry is architectural: an ordinary unconditional write has no sibling that
could have advanced the view underneath it during the same Activation; a parallel branch write does.

Doc-comment touch-ups in the same file (the `## Parallel branches` class header and the
`attemptBranch` docstring) describe the new rule; the `attemptBranch` `awaitEffects` block is the
only behavioural change.

## 4. The ordinary WriteMemory path, reused end to end

A valid versioned branch request such as

```ts
{ kind: "write_memory", key: "save", memoryKey: "count", value: 10, expectedRevision: 0 }
```

takes exactly this route, all of it pre-existing:

```text
branch Stage body -> awaitEffects
  -> attemptBranch: expectedRevision present -> buildEffectBarrier(branch-qualified correlationFor)
  -> WriteMemory EffectProposal (requestKey = branch correlation), folded in authored branch order
  -> Harness.processActivationEffects (proposals processed sequentially, in order)
  -> structural validation -> current authority -> optional exact-payload confirmation
  -> ONE RuntimeStore transaction: resolve the bound view, schema/key validation,
       view.revision === proposal.expectedRevision ?  commit (revision N -> N+1)  :  conflict
  -> memory.written  OR  memory.write_conflict  (correlationId = the branch correlation)
  -> routed to the Workflow Execution's mailbox
  -> next Activation: collectBranchEvents folds it into THIS branch's barrier by exact correlation
  -> branch barrier settles -> branch Stage re-enters with its observation -> decides its result
```

The Effect belongs to the enclosing Workflow Execution and uses that Execution's current effective
authority, its bound `StructuredMemoryView`, and the ordinary confirmation / PendingOperation
machinery. Branch identity is correlation only — no `BranchAuthority`, no branch grant, no
revision lookup before authorization.

## 5. Branch-qualified correlation is the only correlation change

Unchanged from G.2:

```text
wf/fork/<forkId>#<forkVisit>/branch/<branchId>/stage/<stageId>#<visit>/request/<requestKey>
e.g.  wf/fork/p#1/branch/b/stage/b#2/request/save
```

Two sibling branches may both use `key: "save"` for their writes; the branch-qualified correlations
differ, `collectBranchEvents` folds each result only into the branch that proposed it, and a
stale/duplicate Event or a result from an earlier fork invocation settles nothing. Proved directly
(matrix case **G**): the two `requested` journal entries carry
`…/branch/b/stage/b#2/request/save` and `…/branch/c/stage/c#3/request/save`.

## 6. Conflict is an observation, not an automatic failure

A stale versioned branch write settles its branch barrier with the existing G.0 vocabulary:

```text
StageObservation.outcome = "conflicted"
error.code = "structured_memory_write_conflict"
```

It does **not** automatically fail the branch, the fork, or the Workflow. The branch Stage
re-enters with the `conflicted` observation and decides what result to produce — a Function branch
may deterministically return `"B:completed"` after `memory.written` or `"B:conflicted"` after
`memory.write_conflict`, and the fork proceeds to its explicit join normally (matrix cases **H**,
**P**). No automatic retry, no hidden retry, no automatic merge.

## 7. Deterministic arbitration of simultaneously-ungated branch writes

G.2 already folds branch Effect proposals in **authored branch order, then Stage request order
within a branch**, and `Harness.processActivationEffects` processes one Activation's proposals
sequentially in that order. G.3 adds nothing here; it relies on it.

For two branches authored `B`, `C`, both proposing a versioned write against revision `0` in the
same Activation with no confirmation gate:

```text
proposals folded  = [ B.write(expectedRevision 0), C.write(expectedRevision 0) ]
B processed first -> view.revision 0 === 0 -> commit -> revision 1
C processed next  -> view.revision 1 !== 0 -> memory.write_conflict
```

Matrix proofs:

- **C** — authored `[b, c]`: `note` ends as `"from-B"`, revision 1, `writes.length === 1`; join
  results `["B:completed", "C:conflicted"]`; one `completed` + one `conflicted` journal phase.
- **D** — authored `[c, b]` (reverse): `note` ends as `"from-C"`; join results
  `["C:completed", "B:conflicted"]`. Authored order alone flipped the winner.
- **E** — authored `[b, c]` but branch B sleeps 25 ms before proposing its write, so branch C's
  local computation finishes first in wall-clock time (`order === ["C", "B"]`). The winner is still
  **B** (`note === "from-B"`), because proposal folding is authored-order, not completion-order.
- **F** — B writes `note` (`expectedRevision 0`), C writes `count` (`expectedRevision 0`). B commits
  (revision 1); C conflicts **even though the keys are disjoint**. The whole-view revision is
  deliberately coarse — inherited from G.0 §8, documented as intentional conservative concurrency,
  not a bug. Per-key / field-level revisions remain future work (`future-plan.md` §1.4 / §3.4).
- **O** — one branch proposes two versioned writes (`note` then `alt`, both `expectedRevision 0`).
  The first commits (revision 1), the second conflicts on the view revision. The branch barrier
  waits until **both** requests have terminal observations, then the Stage re-enters and sees
  `["first=completed", "second=conflicted"]` in request/barrier order, not settlement order.

Proposal ordering is semantic/audit determinism only; it implies nothing about external completion
order.

## 8. Confirmation-gated branch writes

No reservation, lock, lease, or "winner slot" was invented to preserve authored order while a human
confirmation is pending. The G.0 rule stands: on approval the write **re-checks current authority
and re-checks the current Structured Memory revision**, then commits if still current or conflicts
if stale.

Therefore, if two versioned branch writes are both gated and confirmation **C** is approved before
confirmation **B**, C's write passes the revision check and commits (revision 0 → 1), and B's later
approval finds the view at revision 1, returns `{ status: "conflicted" }`, settles its gated
PendingOperation `conflicted` / `not_dispatched`, and routes one `memory.write_conflict`. The branch
re-enters `conflicted`. This is acceptable for G.3: there is no silent last-writer-wins, no hidden
merge, the exact stale write gets an explicit conflict observation, and the external confirmation
decision is a real semantic event, not an invisible scheduler race. Matrix case **L** asserts
exactly this ordering (`bReceipt.status === "conflicted"`, `note === "from-C"`, B's operation
`dispatch === "not_dispatched"`). Authored branch order is **not** claimed to determine the winner
across independently-delayed confirmation decisions.

## 9. Authority remains fail-closed

Every G.0 authorization property is preserved for a versioned branch write. Matrix proofs:

```text
J  denied branch WriteMemory      -> effect.denied  -> branch observes "denied"   -> no mutation, revision 0
K  declined confirmation           -> confirmation.declined -> branch observes "declined" -> no mutation
L  approved but stale               -> memory.write_conflict -> branch observes "conflicted" -> no overwrite
```

A denied write performs no memory-view lookup (G.0's conformance already instruments this), and its
`effect.denied` body carries no `actualRevision` oracle. A denied / declined / conflicted branch
completes normally — the branch decides; the Workflow does not fail.

## 10. Failure atomicity (unchanged G.2 behaviour, now over a real WriteMemory)

In one Activation: branch B proposes a versioned `WriteMemory` and branch C fails. The earliest
authored failing branch fails the Workflow (`parallel_branch_failed:c_broke`), and B's proposal is
discarded by `runParallelBranches` returning `{ kind: "fail" }` with no proposals — it never reaches
the Harness. Matrix case **M** asserts: memory revision unchanged (0), value unchanged, empty Effect
journal, no PendingOperation, no ConfirmationRequest. The "unversioned sibling + well-formed
versioned sibling" variant (**B (mixed)**) asserts the same: the unversioned branch fails closed and
the versioned sibling's proposal is discarded with it.

## 11. Mixed dependency proof (matrix case N)

`B` = a Function branch whose gated versioned `WriteMemory` result is an **Event** dependency; `C` =
an LLM branch mid a slow model call, a **ControllerResumption** dependency. One Workflow Execution,
one honest `await_dependencies` union wait (`event !== null` for B, `resumptions.length === 1` for
C, one PendingOperation for B, zero for C). Approving B's confirmation commits its write, wakes the
set, and leaves C's resumption `pending` — not invalidated (this is not `interleave`). C settling
later drives the ordinary path; `beta.invocationCount === 1` throughout. Both branches complete, the
explicit join fires afterwards, `note === "B"`, revision 1.

## 12. Reconstruction (matrix case Q)

A persisted active fork with branch B `awaiting_effects` on a gated versioned `WriteMemory`
(`barrier[0].effectKind === "write_memory"`) and branch C already `completed` is read byte-for-byte
identical by a brand-new `Harness` + `WorkflowController` over the same store / scheduler / records,
including the durable `ExecutionWait`. `JSON.parse(JSON.stringify(state))` deep-equals the state — no
Promise, no memory client in controller state. The rebuilt runtime resolves B's confirmation and
drives to `COMPLETED`. The branch's durable information is ordinary G.2 data (branch coordinates,
progress, barrier, correlation, status). This is reconstructability from persisted semantic state —
**not** a Slice-I crash-durability claim.

## 13. Closed vocabularies (matrix case S)

```text
STAGE_KINDS   ["function", "llm", "agent", "workflow"]                                       unchanged
EFFECT_KINDS  ["use_capability","write_memory","spawn_execution","send_message","request_user_input"]  unchanged
EVENT_KINDS   unchanged — memory.written / memory.write_conflict already present since G.0
              no memory.conflict_resolved, no parallel_write, no branch_memory, no merge, no retry
WAIT kinds    unchanged — the G.2 `dependencies` union wait already covers a branch WriteMemory result
WORKFLOW_CONTROL_STATE_VERSION === 4                                                          unchanged
```

## 14. Files changed

Core:

- `controllers/workflow/controller.ts` — `attemptBranch`: the `awaitEffects` arm replaces
  `parallel_branch_memory_write_deferred` with the
  `parallel_branch_memory_write_requires_revision` fail-closed for an *unversioned* branch write; a
  versioned branch write now falls through to the shared `buildEffectBarrier` path. Two
  doc-comments updated (`## Parallel branches` header, `attemptBranch` docstring). No other change —
  `buildEffectBarrier`, `collectBranchEvents`, `outcomeOf` (`memory.write_conflict` →
  `conflicted`), the branch `BarrierEntry` shape, and `advanceParallel` were already G.3-ready.

Docs/tests:

- `docs/development/027-slice-g3-parallel-structured-memory-conflicts.md` — new (this file).
- `docs/future-plan.md` §1.3 / §1.4 / §3.4, `docs/development/008-…roadmap.md`,
  `docs/development/README.md` — narrow status updates.
- `tests/conformance/workflow/parallel-branch-structured-memory.test.ts` — new (21 cases; the G.3
  conformance matrix A–T).
- `tests/conformance/workflow/parallel-fork-join.test.ts` — the one branch-memory case updated:
  an *unversioned* branch write is the fail-closed case, now `parallel_branch_memory_write_requires_revision`.
- `tests/conformance/workflow/parallel-branch-effects.test.ts` — same one-case update; header
  comment adjusted.

## 15. Required conformance matrix → test map

| # | Case | Test |
|---|---|---|
| A | one versioned branch write succeeds | `g3-a` |
| B | branch write without `expectedRevision` fails before Harness/journal/mutation | `g3-b`, `g3-b-mixed`, + the two updated G.2 files |
| C | sibling same-key writes from same revision → authored-first commit, other conflict | `g3-c` |
| D | reverse authored order reverses the ungated winner | `g3-d` |
| E | reverse wall-clock branch completion does **not** reverse the proposal winner | `g3-e` |
| F | disjoint keys still conflict on whole-view revision | `g3-f` |
| G | same Stage-local request key in sibling branches routes independently | `g3-g` |
| H | conflicted branch sees `"conflicted"` and may complete normally | `g3-h` |
| I | no automatic retry; exactly one write attempt per proposal | `g3-i` |
| J | denied write mutates nothing and branch sees `denied` | `g3-j` |
| K | declined confirmation mutates nothing and branch sees `declined` | `g3-k` |
| L | approved stale gated write conflicts | `g3-l` |
| M | branch WriteMemory + sibling failure in same Activation mutates nothing | `g3-m` |
| N | WriteMemory Event + sibling LLM resumption use one G.2 dependency set | `g3-n` |
| O | two writes in one branch preserve request order and view-level conflict | `g3-o` |
| P | join waits for every branch and exposes authored branch-result order | `g3-p` |
| Q | reconstruction from persisted branch memory barrier | `g3-q` |
| R | `currentStage` + visit / visits / forkVisit G.1 invariants unchanged | `g3-r` |
| S | no new Stage/Effect/Event/wait vocabulary | (assertions) |
| T | ordinary non-parallel unconditional WriteMemory remains G.0-compatible | `g3-t` |

## 16. Local validation (local, not CI)

```text
npm test                        1099 pass, 0 fail   (was 1078 at the corrected G.2 checkpoint 5b94345)
npm run test:conformance         848 pass, 0 fail   (was 827)
npm run test:mcp                  68 pass, 0 fail
npm run test:evals               12 pass, 0 fail    (unchanged: default wiring authors no branch write)
npm run test:benchmark-subjects   8 pass, 0 fail
npm run typecheck               pass
git diff --check                clean
```

GitHub CI: not observed from this environment.

## 17. Scope check (diff inspected before commit)

```text
no new Stage kind / Effect kind / Event kind / Execution kind / wait kind
no BranchMemory / branch-specific memory store path / memory-specific branch correlation namespace
no reducer / merge / automatic retry / conflict-resolution pass / winner slot / reservation / lock / lease
no field-level or per-key revision; whole-view revision unchanged from G.0
no model-facing expectedRevision; F.1.1 write callable schema unchanged
no canonical-doc rewrite (future-plan.md §1.3 / §1.4 / §3.4 pointers only)
WORKFLOW_CONTROL_STATE_VERSION unchanged (4)
```

## 18. Explicit deferred list after G.3

```text
automatic optimistic retry / conflict retry policy
join reducer / memory merge function / LLM conflict synthesis
field-level or per-key revisions; multi-key atomic transactions; commutative update algebra; CRDTs
locks / leases / semaphores / fencing tokens / reservation of future revisions / winner slots
Working Notes branch sharing or merge
multi-Stage branch subgraphs / branch loops / nested or concurrent forks / branch Adapters / branch emissions
failed-sibling cancellation propagation; detached branch work
Slice-H / I crash-durability machinery for the active-fork record and the branch memory barrier
```

## 19. Status

Implemented, committed, and pushed to `slice-g-structured-concurrency`. **Not merged. Not
self-approved.** Awaiting independent G.3 architecture review.
