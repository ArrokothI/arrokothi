# Slice F.0 — Structured Memory Write Foundation

> **Status:** F.0 runtime implemented on `slice-f-memory` and accepted by the F.0.1 architecture
> review. The F.0.1 correction removed the reference Agent's direct `memoryWrite` model-exposure
> path; model-directed memory-operation exposure is deferred to F.1. Not merged; do not begin F.1.
> **Scope:** one schema-bound Execution-local Structured Memory write through the existing Effect
> gateway.
> **Canonical documentation change:** none.

This note records what the F.0 checkpoint became in code, as corrected by the F.0.1 review
(§13). It is an engineering record, not a new owner of memory semantics.
[`../memory.md`](../memory.md), using the precedence map in [`../README.md`](../README.md), remains
authoritative.

## 1. Baseline

Work began from clean `main` at:

```text
e0ba59bd82fd4c8f6b52aecaae5b89f8d70fa0b0
```

Accepted Slice E commit `660a4127d294e96d8119355360bac33b2d9f9209` was verified reachable
from that baseline. Work was isolated on `slice-f-memory`.

Before modification, the required local baseline was green:

```text
npm test                         810 pass
npm run test:conformance        559 pass
npm run test:mcp                 68 pass
npm run test:evals               12 pass
npm run test:benchmark-subjects   8 pass
npm run typecheck                pass
```

These are local runs, not CI evidence.

## 2. Canonical invariants applied

F.0 preserves the distinctions it depends on:

```text
memory != context
Structured Memory != Derived Semantic Memory != Working Notes
memory form != memory scope
view identity / ownership != authorization
context compilation != operation projection
controller proposes; Harness authorizes and coordinates
Effect request != authorization != completion
confirmation != authorization
approval never widens authority
```

`WriteMemory` remains one of the existing five Effects. No `ReadMemory` or sixth Effect was added.

> **F.0.1 correction:** F.0 also added a model-facing `write_memory` action target and an authored
> `AgentSpec.memoryWrite` request that appended a `write_memory` binding straight onto the
> `ModelOperationProjection`. That bypassed the canonical `Model Invocation Projection ⊆
> Active/Exposed View ⊆ Effective Authority` chain in [`../authority.md`](../authority.md): the
> operation became model-visible because the Definition requested it, and the projection's
> `viewId` / `viewRevision` no longer described all of its bindings. The final Harness
> authorization still prevented an unauthorized write, so this was an exposure/projection defect,
> not an authority escalation. F.0.1 removes that path (§13); the runtime write foundation below is
> unchanged.

## 3. Legacy memory audit and reconciliation

The existing `packages/core/src/memory/*`, Session state/store, and
`compiler/context-compiler.ts` were audited before implementation.

That surface substantially belongs to the older Session/Flow architecture:

- its Structured Memory schema is flat and primitive-oriented;
- memory is Session-owned and tied to the legacy turn/event stream;
- fields carry legacy `authority`, `advisory`, `writableBy`, and inference behavior;
- provenance names legacy Session events and turn sources;
- the legacy context compiler automatically projects that memory into model context.

Those assumptions were not imported into the Execution kernel. The legacy API remains intact; F.0
does not migrate or delete it.

F.0 reuses only the provider-neutral serializable `ValueSchema` vocabulary and its strict value
validator. New Execution-kernel state lives separately in
`packages/core/src/execution/structured-memory.ts`. It permits nested schema-bound JSON through
`ValueSchema`, rejects unbounded `any` declarations for committed fields, rejects malformed schema
configuration, and performs no coercion on writes.

## 4. Runtime state and binding shape

A trusted application may supply this minimum binding when creating an Execution:

```ts
{
  fields: [
    { key: "profile", schema: { kind: "object", fields: { /* ... */ } }, description: "..." }
  ]
}
```

The Harness validates the declaration, mints one view identity, inserts the view in the same
RuntimeStore transaction as the Execution, and stores only a typed `StructuredMemoryViewRef` in
`ExecutionContext.slots.memoryView`.

The runtime-owned `StructuredMemoryView` contains:

```text
memoryViewId
executionId
declared fields and schemas
current committed values by field
append-only committed-write attribution history
monotonic revision
createdAt / updatedAt
```

Each committed value records the runtime-established view/field identity, value, writer Execution,
Effect id, Activation causation when available, timestamp, and resulting revision. Controller
`authorizationEvidence` is not copied into this provenance.

No configured view means an authorized write is rejected. A child created by autonomous
`SpawnExecution` receives `memoryView: null`; parent ownership does not imply memory visibility.
F.0 defines no ambient or process-global memory.

## 5. Authorization and existence-oracle ordering

The reference allow-list authorizer now has a deny-by-default memory rule:

```ts
memory: true
// or
memory: { writableKeys: ["profile"] }
```

Dispatch ordering is fixed:

```text
structural Effect validation
  -> authorization
  -> optional exact-payload confirmation
  -> current Execution/view resolution
  -> declared field/schema validation
  -> write
```

The policy evaluates only the proposed key and its configured grant; it does not resolve the
runtime view. Therefore a denied request receives `effect.denied` with the same bounded answer for
a declared or unknown key. Only an authorized request can receive runtime `effect.rejected` for no
view, unavailable view, unknown field, or schema violation.

## 6. WriteMemory settlement

`write_memory` is now in the runtime-dispatchable subset of the closed Effect vocabulary.

An ordinary valid local write performs one RuntimeStore transaction containing:

```text
fresh context/view read
schema validation
view revision update + provenance history
authorized / dispatch_started / completed journal records
one correlated memory.written Event route
```

No `PendingOperation` is manufactured for this locally atomic work. If any write in that transaction
fails—including mailbox delivery of the success observation—the memory state, terminal journal
records, and Event all roll back together.

`memory.written` is a runtime-established Effect-result Event. It carries the Effect correlation,
`effectKind = write_memory`, view id, field key, and committed revision. It deliberately omits the
committed value and all unrelated memory contents. It is included in `EFFECT_RESULT_EVENT_KINDS` and
cannot be minted through external Event delivery. Memory history/journal records are not Events.

Applications and tests may inspect a cloned `StructuredMemoryView` through
`Harness.structuredMemoryOf(executionId)`. This is read-only data, not a mutable store facet, model
capability, or `ReadMemory` Effect.

## 7. Confirmation composition

`ConfirmationPolicy` applies to `WriteMemory` like every dispatchable Effect:

```text
allow + confirmation required
  -> exact proposal + digest + one gated PendingOperation

decline
  -> same operation settles declined
  -> confirmation.declined
  -> no memory mutation

approve
  -> dispatch exact stored proposal, no model regeneration
  -> fresh authorization
  -> current view/field/schema revalidation
```

A fresh denial or runtime rejection settles the same gated operation as denied/rejected and writes
nothing. Success marks that same operation dispatched and successful in the atomic memory/result
transaction, produces exactly one `memory.written`, and creates no second operation. Approval is not
a memory credential.

## 8. Agent and Workflow behavior

**F.0.1:** the reference Agent exposes *no* model-directed memory operation. `AgentSpec.memoryWrite`,
the `write_memory` model action target, `CreateProjectionInput.memoryWrite`, and the controller arm
that turned an injected target into `WriteMemory` are all removed (§13). Every
`ModelOperationProjection.binding` again comes from the `ActiveOperationView` named by that
projection. A model-directed memory operation returns in F.1, and only through an authorized
memory-interface Active View.

The reference Workflow Function Stage may return a discriminated `StageMemoryWriteRequest`. The
Workflow records it as a typed effect-barrier entry, proposes `WriteMemory`, and maps
`memory.written` to a completed Stage observation.

The Workflow controller includes `memory.written` in result collection, settles its required
barrier entry, and may re-enter/continue the Stage. **F.0.1:** the Agent controller no longer maps
`memory.written` — with no memory operation exposed, it can never correlate one — and the passive
arm was removed rather than left as unreachable code. No memory contents are added to Agent
information context in F.0.

## 9. Revision semantics

Every view starts at revision zero. Each committed write advances it exactly once. A later valid
write to the same field replaces the current value, retains both runtime-attributed history entries,
and has the newer revision.

The RuntimeStore facet uses an expected-revision update internally so a backend cannot silently
accept a stale writer. This is persistence preparation, not a public CAS/precondition Effect API.
F.0 adds no shared cross-Execution writable view, reducer, lease, mutex, transaction language, or
conflict policy; those remain Slice G work.

## 10. Efficiency and optionality

The no-memory path adds no retrieval, scan, provider, embedding, index, context-compilation, or model
work. An Execution with no binding and no `WriteMemory` does not touch the Structured Memory store
facet or inspection surface during its Activation. **F.0.1:** the reference Agent projects no
memory action at all, so there is no authored-request path that adds model-facing surface.

## 11. Conformance coverage

Focused coverage proves:

- authorized commit, exactly one result, revision/provenance, and no duplicate state;
- deny-by-default and declared/unknown-key oracle equivalence;
- no-view, unknown-field, and schema-invalid runtime rejection;
- overwrite/current value plus retained attributable history;
- no parent-to-child view inheritance;
- external spoof rejection;
- confirmation decline, approve + fresh deny, approve + runtime rejection, and approve + success;
- real Workflow barrier continuation;
- RuntimeStore CAS/rollback and memory/result atomicity;
- no-feature Activation performs no Structured Memory work;
- **F.0.1:** every `ModelOperationProjection` binding originates in the Active View it names, the
  projection builder has no side channel that appends one, and authored Agent data plus a bound
  memory view still produce no model-visible `write_memory`;
- existing Slice A-E, MCP, eval, benchmark-subject, and typecheck regression suites.

## 12. Explicit deferrals

F.0 intentionally does not implement:

```text
Derived Semantic Memory or a provider seam/backend
semantic extraction, graph/vector retrieval, or promotion
Working Notes or note handoff
Artifacts/files
controller/model memory reads or memory context compilation
memory search
parallel Workflow branches
shared cross-Execution writable memory
public CAS/precondition, reducers, transactions, mutexes, or leases
principal/user/org scope ontology
MCP/A2A memory/resource mappings
Mem0/Graphiti
automatic child view inheritance
controller-authored authority/trust/provenance flags
model-directed memory-operation exposure (removed in F.0.1; deferred to F.1)
```

No unresolved canonical contradiction was found during F.0.

## 13. F.0.1 architecture-review correction

An independent review of the F.0 checkpoint accepted the Structured Memory runtime and the
`WriteMemory` Effect implementation, and found one blocking issue: the reference Agent's
model-facing `write_memory` exposure.

### What was wrong

Canonical [`../authority.md`](../authority.md) requires

```text
Model Invocation Projection ⊆ Active/Exposed View ⊆ Effective Authority
```

and authored exposure declarations are requests, never grants. F.0 instead let an authored
`AgentSpec.memoryWrite` request cause the controller to append a `write_memory` binding directly
onto the immutable `ModelOperationProjection`, after and outside the authorized
`ActiveOperationView`. Consequences:

- `write_memory` could be model-visible merely because the Definition requested it, with no
  current memory-write authority or memory-interface Active View involved;
- the projection's `viewId` / `viewRevision` no longer truthfully described all of its bindings.

The final Harness authorization still denied an unauthorized write, so this was an
exposure/projection-semantics defect, not an authority escalation.

### What F.0.1 changed

Model-directed `WriteMemory` exposure is deferred to F.1 rather than introducing a premature
heterogeneous memory Active View now. Removed:

1. `AgentSpec.memoryWrite` / `AgentSpecInput.memoryWrite` and the `invalid_memory_write`
   validation support.
2. The `MemoryWriteTarget` / `write_memory` arm of `ModelActionTarget` (it had no other authorized
   source; the Workflow `StageMemoryWriteRequest` path never used a model action target).
3. `CreateProjectionInput.memoryWrite` and the projection code that appended a `write_memory`
   binding.
4. The `AgentController` arm that converted an injected `write_memory` target into a `WriteMemory`
   proposal, and the unreachable passive `memory.written` observation mapping.
5. Test assertions that blessed a "view-neutral" model action, and the F.0 conformance case
   asserting the reference Agent can select `write_memory`.

Restored invariant: every `ModelOperationProjection.binding` originates in the `ActiveOperationView`
identified by that projection's `viewId` / `viewRevision`.

### What was preserved unchanged

The entire F.0 runtime: Execution-local Structured Memory binding/view, `WriteMemory` Effect
dispatch, deny-before-view-resolution ordering, runtime schema validation, revision/provenance,
the `memory.written` Event, the atomic RuntimeStore transaction, confirmation settlement, Workflow
Effect-barrier support, read-only Harness inspection, child non-inheritance, and the no-feature
cost path. The generic runtime Event vocabulary keeps `memory.written`.

### Future direction (F.1, not started here)

```text
authorized memory interface / memory authority
  ↓ Active/Exposed View
  ↓ immutable model projection
  ↓ model selects WriteMemory operation
  ↓ typed WriteMemory Effect
  ↓ fresh Harness authorization
```

F.1 may establish the minimum honest shape for that path. F.0.1 only stops the premature bypass.
No canonical document changed.
