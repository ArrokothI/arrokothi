# Slice G.0 — Structured Memory optimistic write preconditions and explicit conflict observations

> **Status:** implemented on the long-lived branch `slice-g-structured-concurrency`, created directly
> from the merged Slice-F baseline. **Not merged. Awaiting independent architecture review.** This
> branch is intended to carry G.0 → later G.x Structured Concurrency work; this record covers **G.0
> only**. No parallel Workflow topology, fork/join, branch state, reducers, field-level revisions,
> multi-field transactions, locks/leases, or a sixth Effect were implemented.
>
> **Baseline SHA:** `cadf1f19eb38a5541c303f9fe4aa4a870855d2b7` (merge of the independently reviewed
> and accepted Slice F, PR #12).
> **Branch:** `slice-g-structured-concurrency`.
>
> **Scope:** one optional view-level optimistic-concurrency precondition on the existing
> `WriteMemory` Effect, plus one distinct runtime conflict observation.
>
> **Canonical documentation change:** none. `../../execution-runtime.md` §11 (shared-resource
> concurrency; "prefer explicit conflict semantics over timing-dependent last-write-wins"),
> `../../memory.md` §15 (memory writes and concurrency; "version / compare-and-set"), and
> `../../future-plan.md` §1.4 / §3.4 already own this space and deliberately leave the exact API
> evidence-driven. `../../future-plan.md` §1.4 and §3.4 gain a one-line pointer to this record as
> reference-implementation evidence; every open question stays open.

This is an engineering record, not a new owner of runtime or memory semantics. The canonical
documents named by [`../../README.md`](../../README.md) remain authoritative.

## 1. Why G.0 exists

Slice F left Structured Memory with a monotonically increasing `StructuredMemoryView.revision`, a
runtime-store `StructuredMemoryFacet.update(view, expectedRevision)` physical compare-and-set, a
`StructuredMemoryConcurrencyError`, and atomic memory-view + journal + result-Event transaction
semantics. F.1 deliberately did **not** expose that revision as a semantic `WriteMemory`
precondition, and F.1/F.1.1 deliberately keep whole-view revision out of every model-facing surface.

The v0.6 Structured Concurrency target is:

```text
structured parallel Workflow branches
  + branch-local progress
  + explicit join
  + deterministic merge/conflict behavior
  + first optimistic shared-state concurrency primitive
```

G.0 implements only the last prerequisite: the first honest optimistic Structured Memory write
precondition, so later structured-branch work has an executable compare-and-set to build on and this
slice produces evidence for the exact API before it is frozen.

Core invariant preserved:

> **A stale versioned write must never silently become last-write-wins. An *unversioned*
> `WriteMemory` must preserve the accepted F.0 unconditional-write behaviour.**

## 2. The precondition — `WriteMemoryProposal.expectedRevision`

```ts
interface WriteMemoryProposal {
  readonly kind: "write_memory";
  readonly key: string;
  readonly value: JsonValue;
  readonly provenance?: MemoryWriteProvenance;   // F.3
  readonly expectedRevision?: number;            // G.0
}
```

- **absent** ⇒ the accepted F.0 unconditional semantics, byte-identical model-facing path;
- **present** ⇒ a non-negative integer referring to the **entire** bound
  `StructuredMemoryView.revision`;
- it is validated structurally (`expectedRevisionIssues` / `effectProposalIssues`) as a `number` that
  `Number.isInteger` accepts and is `>= 0` — a fractional value, `NaN`, `Infinity`, a string, `null`,
  and a negative number are each **malformed data**, refused before any authorizer or Structured
  Memory view lookup, exactly like any other malformed proposal field;
- G.0 introduces **no** per-field revision, arbitrary predicate/precondition expression, multi-field
  transaction, merge/reducer, lock, lease, semaphore, mutex, or fencing token.

Authoring helpers forward it additively:

- `writeMemory({ ..., expectedRevision })` — the plain trusted/programmatic helper;
- `StageMemoryWriteRequest.expectedRevision` — so deterministic Workflow Function-Stage code can
  exercise G.0 through the ordinary Effect path (the `WorkflowController` forwards it into
  `writeMemory(...)`, and `functionStageOutcomeIssues` validates it);
- `promoteDerivedClaim({ ..., expectedRevision })` — a one-line additive forward onto the ordinary
  `WriteMemory` proposal it already builds. **No special promotion concurrency mechanism** was
  created.

## 3. The precondition is NOT exposed to the model

F.1 keeps whole-view revision out of the model-facing read projection because a whole-view revision
can reveal that an *unreadable* field changed. G.0 holds that line:

- no `memoryViewId` added to model context;
- no whole-view revision added to `StructuredMemoryReadView` / `StructuredMemoryReadField`;
- no `expectedRevision` field added to the F.1.1 model-facing Structured Memory write callable — its
  input schema stays exactly `{ kind: "object", fields: { value }, additionalProperties: false }`;
- the reference Agent's model-directed write still proposes an **unconditional** `WriteMemory`
  (`{ kind, key, value, requestKey }`, no `expectedRevision`), so a model-directed write can never
  conflict in G.0.

G.0 is initially a **trusted/programmatic** optimistic-write primitive and a foundation for later
structured Workflow branch semantics. The Agent action-observation vocabulary still gains the
`conflicted` outcome (§4) so that a `memory.write_conflict` Event correlated to an Agent call is
never rendered as a capability failure — but the reference Agent has no path to *produce* a versioned
write, and the model-facing conflict rendering carries no revision numbers.

## 4. Conflict is a distinct semantic outcome

A revision mismatch is **not** collapsed into `effect.rejected`. The existing meanings stay distinct:

```text
denied      policy said no
rejected    request was malformed / unavailable / never dispatchable
declined    human declined exact-payload confirmation
conflicted  request was valid + authorized (+ confirmed), but its optimistic state precondition
            was no longer true  ← G.0
completed   write committed
```

One explicit conflict result was added wherever the existing Effect-result vocabularies require it:

| Surface | Added |
|---|---|
| Event kind | `memory.write_conflict`, in `EVENT_KINDS` and `EFFECT_RESULT_EVENT_KINDS` (so broad barrier/step waiters wake); **not** externally mintable (only `external.input` is), **not** in `CHILD_RESULT_EVENT_KINDS` |
| Event body | `MemoryWriteConflictBody { effectId, effectKind: "write_memory", pendingOperationId \| null, memoryViewId, key, expectedRevision, actualRevision }` — runtime facts only; **no** proposed value, **no** provenance |
| Effect journal | terminal phase `conflicted`, in `EFFECT_JOURNAL_PHASES` and `TERMINAL_EFFECT_PHASES` |
| PendingOperation | outcome state `conflicted` (`markSettled` accepts it); the gated operation settles `status: settled`, `outcome: conflicted`, `dispatch: not_dispatched` |
| `resolveConfirmation` receipt | `{ status: "conflicted", ... }` — distinct from `denied` / `rejected` / `declined` |
| Workflow Stage observation | `StageObservationOutcome` gains `conflicted`; `WorkflowController.outcomeOf` maps `memory.write_conflict` → `{ outcome: "conflicted", error: { code: "structured_memory_write_conflict", ... } }` |
| Agent action observation | `AgentObservationOutcome` gains `conflicted`; the `AgentController` maps `memory.write_conflict` for a `structured_memory_write` pending call → `conflicted` with a revision-free message |

The successful result event remains `memory.written`, unchanged and un-reinterpreted.

## 5. Conflict ordering

The accepted F.0 / F.1.1 dispatch ordering is preserved. A versioned write follows:

```text
structural validation            (effectProposalIssues, in activation.ts, before the gateway)
    ↓
current authorization            (EffectAuthorizer.authorize on the whole proposal - one decision)
    ↓
optional exact-payload confirmation   (ConfirmationPolicy; the digest covers expectedRevision - §7)
    ↓
resolve current Structured Memory binding / view   (inside the atomic transaction)
    ↓
schema / key validation          (validateStructuredMemoryWrite)
    ↓
optimistic revision check        (view.revision === proposal.expectedRevision ?)
    ↓
commit  OR  conflict
```

Two properties are asserted:

- **Authorization before memory lookup.** A denied versioned write performs **zero** Structured
  Memory view reads (`tx.structuredMemory.get` is instrumented in a conformance test and asserted at
  `0`), and its `effect.denied` body carries no `actualRevision` — the presence of `expectedRevision`
  creates no existence/revision oracle before authorization.
- **Check + commit linearize together.** The semantic revision check and the successful
  `structuredMemory.update` run inside the *same* `RuntimeStore` transaction. There is no
  "read revision outside a transaction, later open another to write" — that would merely move the
  race.

## 6. Semantic `expectedRevision` vs physical RuntimeStore CAS

They have different roles and both are kept:

```text
proposal.expectedRevision                         semantic / application optimistic precondition
StructuredMemoryFacet.update(view, expectedRev)    physical persistence CAS / implementation guard
```

The Effect gateway checks the semantic precondition inside the transaction, then calls
`structuredMemory.update(written, view.revision)` (the physical CAS, unchanged). If the physical CAS
still throws `StructuredMemoryConcurrencyError` **after** the semantic check matched (a buggy or
exotic store, or one that lost a race the reference in-memory store cannot), the gateway **fails
closed**: it catches that error and surfaces the *same* `memory.write_conflict` semantics
(`actualRevision` taken from the error) rather than retrying or letting the write become
last-write-wins. `structuredMemory.update` checks the revision before it mutates, so the transaction
draft carries no committed value / advanced revision to roll back, and the conflict journal + Event
still commit. `StructuredMemoryConcurrencyError` gained `readonly memoryViewId / expectedRevision /
actualRevision` fields (mirroring `RuntimeConcurrencyError`) so the backstop can build the Event
body.

**G.0 does not automatically retry a conflicted write.** The controller / application decides whether
to re-read, merge, retry, or fail.

## 7. Authority and confirmation behaviour

- **The confirmation digest covers the precondition.** `proposalDigest` is a canonical-JSON hash of
  the whole proposal, so `expectedRevision` is part of it: two otherwise-identical writes expecting
  revisions 4 vs 5 produce different digests (asserted).
- **Approval never means "force this write regardless of state."** A confirmed write expecting
  revision N conflicts if a legitimate commit advances the view to N+1 before confirmed dispatch —
  `resolveConfirmation({ decision: "approve" })` returns `{ status: "conflicted" }`, the gated
  PendingOperation settles `conflicted` / `not_dispatched`, and nothing reaches Structured Memory
  (asserted).
- **Current authority is still re-evaluated on the confirmed-dispatch path** exactly as F.0 did: a
  revocation during deliberation produces `{ status: "denied" }` and wins over an otherwise
  conflict-free approved write (asserted). The `denied` / `conflicted` / `declined` / `rejected`
  receipts stay distinct.

## 8. Why whole-view revision is deliberately coarse

G.0 uses the whole Structured Memory view revision. Given:

```text
revision 4:  profile = ...   status = ...
writer A:    write profile if revision == 4
writer B:    write status  if revision == 4
A commits → revision 5
B's revision-4 write → conflict   (even though the keys are disjoint)
```

B conflicts even though A and B touched different fields. **This is deliberate**, tested, and
documented as intentional G.0 view-level semantics — not a bug. G.0 first needs executable evidence
for the simplest correct optimistic primitive. Field-level conflict / merge remains later work if
realistic programs justify it (`../../future-plan.md` §1.4 / §3.4).

## 9. Exact conflict behaviour

For `current revision = N+1`, `proposal.expectedRevision = N`:

```text
no Structured Memory value change
no revision advance
no write-history append
no memory.written Event
one memory.write_conflict Event
one terminal conflicted journal outcome
```

For a confirmation-gated write:

```text
PendingOperation  status = settled   dispatch = not_dispatched   outcome = conflicted
```

because nothing reached Structured Memory mutation — the operation is **not** marked `dispatched`
merely because the confirmation was approved.

For a normal ungated local `WriteMemory`, the F.0 no-PendingOperation fast path is preserved: a
conflict routes one `memory.write_conflict` Event and creates no PendingOperation.

## 10. Files changed

Core semantics:

- `effects/types.ts` — `WriteMemoryProposal.expectedRevision`, `expectedRevisionIssues`,
  `write_memory` structural validation, `WriteMemoryInput` / `writeMemory` /
  `PromoteDerivedClaimInput` / `promoteDerivedClaim` additive forwards.
- `effects/journal.ts` — `conflicted` phase (+ terminal set).
- `effects/pending.ts` — `conflicted` outcome state.
- `interaction/events.ts` — `memory.write_conflict` kind, `MemoryWriteConflictBody`, body validator,
  `EFFECT_RESULT_EVENT_KINDS` membership.
- `ports/runtime-store.ts` — `StructuredMemoryConcurrencyError` fields; `StructuredMemoryFacet`
  docstring distinguishing the two CAS roles.
- `ports/stage.ts` — `StageMemoryWriteRequest.expectedRevision` validation.
- `runtime/effect-processor.ts` — `dispatchWriteMemory` semantic conflict path + physical-CAS
  backstop; `EffectDispatchRecord.refusal` and `ResolveConfirmationReceipt` `conflicted` variants;
  `receiptForResumedRecord` mapping.
- `workflow/observations.ts` — `StageObservationOutcome` / `StageMemoryWriteRequest`.
- `controllers/workflow/controller.ts` — `outcomeOf` conflict mapping; `expectedRevision` forward.
- `agent/observations.ts` — `AgentObservationOutcome` `conflicted`.
- `controllers/agent/controller.ts` — `collect` conflict mapping (revision-free, model-safe).
- `execution-api.ts` — `MemoryWriteConflictBody`, `effectProposalIssues`, `expectedRevisionIssues`
  exports.

Tests:

- `tests/conformance/memory/structured-memory-optimistic-write.test.ts` — new (16 cases, §11).
- `tests/conformance/interaction/event-vocabulary.test.ts`,
  `tests/conformance/architecture/mcp-boundaries.test.ts` — the closed-Event-vocabulary pins gain
  `memory.write_conflict`.

## 11. Regression / conformance tests

`tests/conformance/memory/structured-memory-optimistic-write.test.ts`:

- **unconditional compatibility** — a `WriteMemory` with no `expectedRevision` commits, advances the
  revision, emits `memory.written`, and no `conflicted` phase appears;
- **matching precondition** — `expectedRevision = N` at revision N commits once → revision N+1;
- **stale precondition** — `expectedRevision = N` at revision N+1 ⇒ one `memory.write_conflict`, one
  terminal `conflicted` journal entry, no value / history / revision change, no `dispatch_started`,
  no PendingOperation;
- **lost-update proof** — two versioned writes both `expectedRevision = 0` through the normal
  gateway: exactly one commits, the other conflicts, the final value is the winner's;
- **different-key coarse conflict** — `profile` and `count` both expecting revision 0: after the
  first commits the second conflicts; documented as intentional G.0 view-level semantics;
- **structural validation** — `expectedRevisionIssues` and `effectProposalIssues` reject negative /
  fractional / `NaN` / `Infinity` / string / `null`; an end-to-end malformed precondition fails the
  Activation `invalid_controller_outcome:invalid_effect` with **zero** authorizer calls and no
  memory mutation;
- **authorization ordering** — a denied versioned write reads the Structured Memory view **zero**
  times and its `effect.denied` body carries no `actualRevision`;
- **confirmation digest** — same key/value, `expectedRevision` 4 vs 5 vs absent ⇒ three different
  `proposalDigest` values;
- **confirmation / state race** — a confirmed write expecting revision 0, a legitimate commit
  advances the view to 1 before approval, approval ⇒ `{ status: "conflicted" }`, the newer commit
  stands, the gated operation settles `conflicted` / `not_dispatched`; and current authority is
  re-checked independently (revocation ⇒ `denied` wins);
- **physical persistence CAS backstop** — a store that throws `StructuredMemoryConcurrencyError`
  from `structuredMemory.update` ⇒ the same `memory.write_conflict` observation, no last-write-wins,
  the store's reported `actualRevision` surfaced, journal detail names the physical CAS;
- **Workflow Stage observation fidelity** — a stale required `WriteMemory` settles the barrier
  `conflicted` (not `rejected` / `failed` / `denied`), the Stage does not wait forever, only the
  seed write committed;
- **model-facing surfaces unchanged** — the F.1.1 write callable's input schema is exactly
  `{ value }` with `additionalProperties: false` and no `expectedRevision`; a model-directed write
  proposes an unconditional `WriteMemory` (`{ kind, key, value, requestKey }`).

The full pre-existing F.1 / F.1.1 model-facing read/write suites are unchanged and still pass, which
is the byte/shape-compatibility evidence for "the model surface is unchanged when G.0 is unused".

## 12. Local validation

Local runs at the branch tip, explicitly **local, not CI**:

```text
npm test                        1033 pass, 0 fail   (was 1017 at the F baseline)
npm run test:conformance         782 pass, 0 fail   (was 766)
npm run test:mcp                  68 pass, 0 fail
npm run test:evals               12 pass, 0 fail    (unchanged: default wiring authors no versioned write)
npm run test:benchmark-subjects   8 pass, 0 fail
npm run typecheck                pass
git diff --check                 clean
```

## 13. Explicit deferred list for G.1+

Not implemented in G.0, and each remains later G.x / future-plan work:

```text
parallel Workflow branches / fork-join topology / branch controller state / branch Working Notes
branch snapshot + branch-local delta representation
join / reducer / merge APIs
field-level (per-key) memory revisions
multi-field / multi-key transactions
a general transaction DSL or precondition-expression language
automatic conflict retry / re-derivation
CRDT / commutative update framework
shared cross-Execution Structured Memory scope
global mutex / lease / semaphore / permit / fencing-token system / distributed locking
a sixth Effect kind (the five stay unchanged; the new conflict result is an Event, not an Effect)
a new memory form
Derived Semantic Memory concurrency redesign
changes to Working Notes / ControllerResumption semantics
Slice-H / I durability machinery for the conflict record
model-directed versioned writes / any model-visible whole-view revision
```
