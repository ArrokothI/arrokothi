# Slice E.0 — Child Execution Foundation

> **Status: implemented checkpoint on `slice-e-composition`. Not merged to `main`.**
>
> E.0 is the first checkpoint of Slice E. It makes `SpawnExecution` operational through the existing
> Effect gateway and proves the recursive child-Execution runtime end to end: independent child
> identity and lifecycle, lineage-scoped structural budget, current-authority attenuation, and
> terminal-result correlation through the ordinary `PendingOperation`/Event path. It does **not**
> implement E.1 (safe interleaving, messaging, user input) or E.2 (Agent Stage / Workflow Stage
> authoring surfaces).
>
> **Baseline:** `main` at `847b3b8`. E.0 lands at `npm test` 691, `npm run test:evals` 12,
> `npm run test:benchmark-subjects` 8, `npm run typecheck` clean.
>
> Canonical architecture documents remain authoritative. Nothing here promotes an implementation
> choice into an architectural claim, and E.0 required **no** canonical-doc change (see §10).

---

## 1. What the slice implements

```text
controller
  ↓ proposes SpawnExecution  (spawnExecution / callExecution builders)
Effect gateway (EffectProcessor.dispatchSpawn)
  ↓ resolve Definition                 missing / no controller -> effect.rejected
  ↓ policy decision (EffectAuthorizer) deny                    -> effect.denied
  ↓ ONE transaction:
      structural spawn budget           absent / exhausted     -> effect.rejected, no writes
      attenuate authority               requested ∩ parent CURRENT effective
      spend one lineage credit          (CAS on the budget revision)
      insert child delegated authority record
      insert child ExecutionContext, CREATED -> READY
      deliver spawn input to the child (external.input, if any)
      register parent PendingOperation + ChildExecutionLink
      spawn:  settle now, route child.spawned
      call:   leave the PendingOperation open for the terminal result
  ↓ post-commit
scheduler.enqueue(child)
```

Later, when the child reaches a terminal state:

```text
child COMPLETED / FAILED  (Harness.applyOutcome / failActivation)
  ↓ Harness.settleOwnerOnChildTerminal
      ChildExecutionLink names the parent PendingOperation
      ONE transaction: journal completed/failed, markSettled, markChildLinkSettled,
                       route child.completed / child.failed
  ↓ parent WAITING -> READY if it was waiting on this
  ↓ post-commit
scheduler.enqueue(parent)
```

New/changed code:

| File | Change |
|---|---|
| `execution/structural-budget.ts` | **new** — `LineageSpawnBudget`, `createLineageSpawnBudget`, `canConsumeSpawnCredit`, `consumeSpawnCredit`, `spawnBudgetRemaining`, `spawnBudgetCapacityIssues` |
| `execution/child-link.ts` | **new** — `ChildExecutionLink`, `createChildExecutionLink`, `markChildLinkSettled`, `isAwaitingChildResult` |
| `interaction/events.ts` | added `child.spawned` / `child.completed` / `child.failed` kinds + bodies + validation; `CHILD_RESULT_EVENT_KINDS` |
| `effects/types.ts` | `SpawnExecutionProposal` gains `requestedOperations?`, `awaitTerminalResult?`; `spawn_execution` added to `DISPATCHABLE_EFFECT_KINDS`; `spawnExecution` / `callExecution` / `isSpawnExecutionProposal` |
| `operations/authority.ts` | `source: "root_grant" \| "delegated"` + optional `delegatedFrom`; `attenuateChildOperations`, `createDelegatedOperationAuthority` |
| `ports/runtime-store.ts` | `LineageSpawnBudgetFacet`, `ChildExecutionLinkFacet` on the transaction; read-surface `readLineageSpawnBudget` / `readChildExecutionLink` / `listChildExecutionLinks`; `SpawnBudgetConcurrencyError` |
| `reference/in-memory-runtime-store.ts` | facet + read-method implementations |
| `runtime/effect-processor.ts` | `dispatchSpawn`; `definitions` + `hasController` deps |
| `runtime/harness.ts` | wires the two new deps; `CreateExecutionInput.structuralSpawnBudget`; `settleOwnerOnChildTerminal`; read-only `lineageSpawnBudgetOf` / `childExecutionLinksOf` / `childExecutionLink`; `InvalidStructuralSpawnBudgetError` |
| `reference/allow-list-authorizer.ts` | `spawn?: SpawnGrantRule` (deny by default) |
| `testing/scripted-controllers.ts` | `spawn` / `call` steps |

---

## 2. `SpawnExecution` runtime path

`spawn` and `call` are the **same** Effect. The proposal carries `awaitTerminalResult`, and that is
the only difference in the runtime path:

- **`spawn`** (`awaitTerminalResult` absent/false): the parent's `PendingOperation` is settled
  immediately inside the creation transaction, and a `child.spawned` Event (correlated to the
  request key) carries the child identity and granted operations. Journal:
  `requested → authorized → dispatch_started → completed`.
- **`call`** (`awaitTerminalResult: true`): the `PendingOperation` stays `pending`; no `child.spawned`
  is delivered. Journal after creation: `requested → authorized → dispatch_started`, then later
  `completed` (or `failed`) when the child settles.

The controller never constructs a child. `dispatchSpawn` is the single mediated place a child
`ExecutionContext` is inserted outside trusted `Harness.createExecution` wiring, and the architecture
suite asserts `.executions.insert(` appears only in `runtime/effect-processor.ts` and
`runtime/harness.ts`.

---

## 3. Child identity and lineage

For a child:

```text
ownerExecutionId = the spawning Execution's id
rootExecutionId  = the spawning Execution's rootExecutionId   (persisted, not re-derived)
```

For a root: `ownerExecutionId = null`, `rootExecutionId = own id`. The child gets a fresh unique
`ExecutionId`, its own mailbox, and its own delegated authority record. Conformance
(`tests/conformance/composition/child-lineage.test.ts`):

```text
root R  (budget 5)
  → child A   A.owner == R,  A.root == R
      → child B   B.owner == A,  B.root == R  (top of the tree, not the direct owner)
```

Three distinct `ExecutionId`s, three distinct mailboxes. The `ChildExecutionLink` records the
lineage/wait-for edge (`parentExecutionId`, `rootExecutionId`, `effectId`, and — for a `call` — the
`pendingOperationId`); it is not itself an identity.

---

## 4. Structural budget

**Representation.** One root-scoped credit counter, `LineageSpawnBudget`, keyed by
`rootExecutionId`: `{ capacity, consumed, revision, grantedAt }`. `capacity` is fixed when the root
Execution is created (`CreateExecutionInput.structuralSpawnBudget`, non-negative integer) and is
never rewritten. `consumed` only ever increases, by exactly one per autonomous child, through
`dispatchSpawn`.

**Why root/lineage-scoped and finite.** A per-Execution `maxChildren` lets every Execution obey its
own limit while the ownership tree grows exponentially. Canonical
(`docs/execution-runtime.md` §14): *delegation may subdivide the remaining structural budget; a
descendant can never enlarge the finite structural budget of its lineage.* A single root counter is
the minimum honest representation of that: a descendant reads the same root record its ancestors did,
and there is no API — on the Harness, on a controller, or on a Definition — that raises `capacity` or
creates a second budget.

**Consumption + atomicity.** `dispatchSpawn` reads the budget inside the creation transaction, checks
`canConsumeSpawnCredit`, and `update`s with `consumeSpawnCredit(budget)` under compare-and-set on
`budget.revision`. In-memory `transact` serializes and each transaction re-reads, so two
near-concurrent spawns cannot both spend the last credit; the CAS is the durable-runtime contract
for the same guarantee (`SpawnBudgetConcurrencyError`, covered in the RuntimeStore contract).

**Fail closed.** A root created without `structuralSpawnBudget` has no budget record, and every
`SpawnExecution` is refused with `no_structural_spawn_budget` — an absent budget is not an unlimited
one, exactly as an absent authority record authorizes nothing.

**Recursive exhaustion proof** (`structural-budget.test.ts`): a recursive Definition (`R` spawns `R`)
with `capacity = N` produces `root + exactly N` Executions; the `(N+1)`-th `SpawnExecution` is
refused with `structural_spawn_budget_exhausted`, no child is created, and `consumed == capacity`
with `capacity` unchanged. Two descendant paths racing on a `capacity = 1` remainder produce exactly
one child.

**Deferred:** spawn depth limits, active-descendant limits, per-subtree subdivision, parallel-creation
limits. E.0 implements only the counter the mandatory recursion proof needs.

---

## 5. Authority attenuation

```text
child effective operation authority
  = requestedOperations
    ∩ the spawning Execution's CURRENT effective operation authority
```

Implemented by `attenuateChildOperations(parentAuthority, requestedOperations)`, called inside the
creation transaction against `tx.operationAuthorities.get(parentId)` — the parent's *current* record,
not a stale projection and not the authority that existed at parent creation. The result is stored
as a `createDelegatedOperationAuthority` record: `version: 1` (a fresh ceiling for a new Execution,
not a narrowing of the parent's), `source: "delegated"`, optional `delegatedFrom` provenance.

**What "delegable" means in this first implementation.** There is no separate delegability flag on
an authority record. The rule is the conservative baseline from `docs/authority.md` §6: only the
parent's current *effective* authority is delegable, and the child receives only the explicit
requested intersection of it. An **absent** `requestedOperations` yields an empty child ceiling — it
is never read as "inherit everything". A malformed `requestedOperations` fails the Activation as
data (fail closed).

**A child Definition cannot grant itself authority.** The child's `spec.operations` is an *exposure
request*, intersected against the delegated ceiling exactly as a root Agent's is; a Definition that
names an operation the spawn request did not name gets nothing
(`authority-attenuation.test.ts`).

**Current-authority timing.** The Slice-D-style regression narrows the parent's ceiling at the store
facet *between* the spawn request being prepared and the Effect being dispatched; the stale request
still names the removed operation, and the child never receives it.

**Child projection derives from the child's own ceiling.** The reference `ActiveOperationViewResolver`
resolving against the child `ExecutionId` returns only the child's delegated operations; the
parent's are omitted as `no_authority`/`not_authorized` against the child's record.

---

## 6. Spawn vs call

| | immediate semantic result | terminal-result dependency |
|---|---|---|
| `spawn` | `child.spawned` (child id + granted operations); `PendingOperation` settled `success` | none — `ChildExecutionLink.pendingOperationId == null` |
| `call` | none | `PendingOperation` stays `pending`; settled by `child.completed` / `child.failed` |

`call` is child creation **plus** a required dependency, not another kind of Execution. The child is
byte-identically the same independently managed Execution whether it was spawned or called. A plain
`spawn` whose child later completes never delivers a terminal result to the parent
(`spawn-vs-call.test.ts`).

E.0 does not invent broad detached/background semantics beyond the narrow fact that a `spawn` parent
does not block on the child. Because v0.4 keeps exclusive `ControllerResumption` suspension (§10),
the E.0 `spawn` proof is deliberately mechanical: the parent observes `child.spawned` and its script
continues; richer Agent progression after a detached spawn is E.1 work.

---

## 7. Terminal-result correlation

The child's terminal result is **runtime-mediated semantic work**, so it settles through a
`PendingOperation` and a correlated Event — never a `ControllerResumption`.

- **Exact correlation.** `settleOwnerOnChildTerminal` looks the child up in
  `ChildExecutionLink`, finds the parent `PendingOperation` id recorded there, and routes
  `child.completed` / `child.failed` with `correlationId = link.resultCorrelationId`. A result never
  reaches the wrong Execution: two callers using the same request key are separated by Execution
  identity, and the link is keyed by child id.
- **Duplicate protection.** The settlement transaction re-reads both the `ChildExecutionLink`
  (`state !== "settled"`) and the `PendingOperation` (`status === "pending"`) before writing. A child
  reaches a terminal state once, and extra scheduler turns re-deliver nothing — one `child.completed`
  Event, one `completed` journal phase, `link.state == "settled"`.
- **Result ≠ response.** `child.completed` carries the validated `TerminalResultEnvelope`
  (`schemaId`, `schemaVersion`, `value`, `valueDigest`); a child with no declared schema carries a
  `null` value. This is distinct from any emission the child made.
- **Failure vs success.** `child.failed` carries `{ code, message }`; `PendingOperation.outcome`
  is `failure`. Covered for both the `fail`-outcome path (`applyOutcome`) and the
  Harness-rejected path (`failActivation`).
- **Parent lifecycle is not the child's.** After a `call`, a parent whose script has more work
  stays alive (WAITING) once the child result is consumed — ownership provides a supervision
  relationship, not automatic failure propagation.

---

## 8. Recursive composition

The runtime adds **no** static Definition-cycle rejection. `validateDefinition` accepts a
self-referential Definition and `A → B → A` mutual recursion; `dispatchSpawn` never inspects the
ancestry for the child's Definition. Runtime expansion is bounded by the finite lineage structural
budget instead (§4). This preserves:

```text
recursive Definition graph  ≠ runtime error
Definition cycle            ≠ wait cycle ≠ deadlock
```

---

## 9. Failure atomicity

Every refusal path is proven to leave no partial child (`failure-atomicity.test.ts`):

| refusal | Event | child? | budget spent? |
|---|---|---|---|
| unknown Definition / kind with no controller | `effect.rejected` (`spawn_definition_not_found`) | no | no |
| policy deny | `effect.denied` (`spawn_not_authorized`) | no | no |
| no lineage budget | `effect.rejected` (`no_structural_spawn_budget`) | no | n/a |
| budget exhausted | `effect.rejected` (`structural_spawn_budget_exhausted`) | no | no |
| malformed `requestedOperations` | Activation FAILED (`invalid_effect`) | no | no |

Definition resolution and the policy decision happen before the creation transaction opens; the
budget/authority/child writes are one transaction that either fully commits or fully rolls back. The
budget-exhausted and no-budget checks return a refusal sentinel from the transaction body having
written nothing.

---

## 10. Boundary preservation

**Controllers cannot reach child creation.** The architecture suite
(`architecture/composition-boundaries.test.ts`) walks `ports/controller.ts` and proves its import
graph reaches neither `runtime-store`, `runtime/harness.ts`, `runtime/effect-processor.ts`,
`execution/child-link.ts`, nor `execution/structural-budget.ts`. No module under `controllers/`
names `createExecutionContext`, `createDelegatedOperationAuthority`, `createChildExecutionLink`,
`consumeSpawnCredit`, `attenuateChildOperations`, or the two new facets.

**The structural budget is written in exactly two runtime modules** (`runtime/harness.ts` fixes
capacity at the root; `runtime/effect-processor.ts` spends a credit) and nowhere else. A Definition
is plain authored data with no path to either.

**No E.1 behaviour landed.** v0.4's exclusive `ControllerResumption` suspension is untouched: E.0
adds no `await_resumption` for child waiting, no mailbox Event wakes a resumption-suspended
Execution, and `docs/development/010` §12's list of untouched Slice-C.1/Workflow semantics still
holds. No `SendMessage`/`send`/`ask`, no `RequestUserInput`, no stale-continuation machinery, no
wait-cycle progression beyond storing the child dependency.

**Event vocabulary.** `child.spawned` / `child.completed` / `child.failed` were added. This is **not**
a canonical contradiction: `docs/execution-runtime.md` §7 already lists "child terminal result" as
an Event, §15 says a waiting `call` "normally receives the child's terminal result through a
correlated Event", and `interaction/events.ts`'s own pre-existing note said these kinds "arrive with
the Effects that produce them". `child.cancelled` is deliberately **not** added — nothing cancels a
child in E.0; it joins when child cancellation lands in E.1.

**MCP / providers.** No provider, protocol, or storage package entered core. The MCP boundary suite
still passes; `docs/development/012`'s outcome/schema work is untouched.

---

## 11. Tests

| command | count | result |
|---|---|---|
| `npm test` | 691 | pass |
| `npm run typecheck` | — | clean |
| `npm run test:evals` | 12 | pass |
| `npm run test:benchmark-subjects` | 8 | pass |

New: `tests/conformance/composition/` (7 files, 34 cases) —
`child-lineage`, `structural-budget`, `authority-attenuation`, `spawn-vs-call`,
`terminal-result-correlation`, `recursive-composition`, `runtime-independence`, `failure-atomicity`;
`tests/conformance/architecture/composition-boundaries.test.ts` (8 cases); 2 added RuntimeStore
contract cases. Updated: `interaction/event-vocabulary.test.ts` and
`architecture/mcp-boundaries.test.ts` (the Event-kind lists now include the child kinds);
`effects/transaction-atomicity.test.ts` (`BreakableStore` gained the 3 new read methods).

---

## 12. Deferred to E.1

- lifting v0.4 exclusive `ControllerResumption` suspension + the minimal stale-continuation rule
- `SendMessage` / `send` / `ask`, peer request/reply routing
- `RequestUserInput` and user-input continuation
- general Event interleaving during a suspended continuation
- child cancellation (`child.cancelled` Event kind, cancellation propagation), and the
  deadline/cancellation policy for the long-lived child-result `PendingOperation`
- wait-cycle progression / deadlock-candidate diagnostics beyond storing the child dependency
- broad detached/background `spawn` semantics and late-observation context insertion

## 13. Deferred to E.2

- Agent Stage / Workflow Stage authoring surfaces (`controllers/workflow` still returns
  `stage_kind_unsupported`)
- wiring `call` into every Agent/Workflow authoring surface (E.0 exposes it through the
  `spawnExecution` / `callExecution` builders and scripted-controller fixtures)
- broad model-facing child/service discovery
- structural-budget subdivision, depth limits, active-descendant limits
- supervision/restart policy, retry intensity, cancel-all-siblings

## 14. Unresolved blockers

None. Every §23 stop condition was checked and none was hit: child waiting uses `PendingOperation`
(not `ControllerResumption`); `call` needed no relaxation of exclusive resumption; the existing
operation-authority record attenuated safely with one added `source` value and a provenance field;
the structural budget is root/lineage-finite with a small counter, no runtime redesign; recursion is
permitted with no cycle rejection; refused/failed creation leaves no partial child; the child Event
kinds are implementations of already-canonical semantics, not a casual vocabulary broadening; and no
controller mutates runtime authority/budget/store state.

---

### Answers to the acceptance questions

- **Can a child gain authority merely because its Definition requests it?** No. The child ceiling is
  `requestedOperations ∩ parent current effective authority`; the Definition's `operations` is an
  exposure request intersected against that ceiling.
- **Can recursive Definitions create unbounded Executions?** No. Recursion is legal — there is no
  cycle rejection — but the finite lineage structural budget bounds expansion, and a descendant
  cannot enlarge it.
- **Is `call` a different kind of Execution from `spawn`?** No. It is child creation plus a required
  terminal-result dependency; the child is the same independently managed Execution.
- **Does waiting for a child use `ControllerResumption`?** No. Child completion is runtime-mediated
  semantic work and settles through a `PendingOperation` and a correlated Event.
- **Did E.0 relax v0.4 stale-continuation / exclusive-resumption behaviour?** No.
