# Slice F.1.1 — Model-Directed Structured Memory Write Exposure

> **Status:** accepted and merged to `main` (PR #11, merge commit
> `3598c88cb999000b3dd6a631524199a180e509b0`). It is part of the baseline for Slice F.2a (Working
> Notes local scratch, doc [`021`](021-slice-f2a-working-notes-local-scratch.md)), which continues
> the remaining Slice F work on the long-lived branch `slice-f-memory-completion`. F.2a generalises
> the heterogeneous `ActiveModelActionView` this checkpoint introduced with a third
> (`working_notes_set`) arm and preserves every projection-integrity regression below.
> **Scope:** authorized model visibility and selection of Execution-local Structured Memory write
> interfaces in the reference Agent, translated into the existing F.0 `WriteMemory` Effect.
> **Canonical documentation change:** none.

This is an engineering record. The canonical semantics remain in [`../../authority.md`](../../authority.md),
[`../../memory.md`](../../memory.md), and the other documents named by [`../../README.md`](../../README.md).

## 1. Audit and implementation choice

The pre-edit audit found:

- `ActiveOperationView` was correctly limited to capability operations;
- `ModelOperationProjection` projected only that view and persisted exact alias-to-target bindings;
- `ModelActionTarget` was already discriminated, but had only the capability-operation arm;
- F.0 already owned authorization, confirmation, schema validation, atomic commit, and
  `memory.written` settlement for `WriteMemory`;
- F.1 already provided the correct authority-before-view-resolution pattern for reads and froze
  compiled information across controller resumption;
- the reference Agent had no write-exposure resolver or model-to-`WriteMemory` arm.

F.1.1 therefore adds a separate controller-neutral authorized write-view resolver, composes its
output with the existing operation view into a typed heterogeneous `ActiveModelActionView`, and
generalizes the immutable projection to that combined view. It does not put memory fields into
`ActiveOperationView`, and it does not append memory bindings after projection.

Names that falsely implied every model-visible action was a capability operation were generalized
before v1: `ModelActionProjection`, `ModelActionBinding`, `ModelActionCall`,
`AgentActionObservation`, `AgentActionProposalRecord`, `exposedActions`, and `actionProposed`.
Provider-facing `call_operations` and `ModelCapabilitySpec` remain because they are existing
provider/tool-call protocol vocabulary; their kernel binding is now explicitly a model action.

## 2. Authored request

The Agent request surface is:

```ts
interface AgentStructuredMemorySpec {
  read?: { keys: readonly string[] };
  write?: { keys: readonly string[] };
}
```

`structuredMemory.write.keys` says only which fields the author would like exposed as write
interfaces. It grants nothing and does not prove that a field is declared. Validation independently
requires each present read or write request to contain a non-empty array of unique non-empty keys;
unknown properties are rejected and the enclosing Definition remains plain JSON. There is no
restored top-level `AgentSpec.memoryWrite`.

## 3. Write-exposure authority seam and ordering

The controller holds only this port:

```ts
interface ActiveStructuredMemoryWriteViewResolver {
  resolve({ executionId, keys }):
    ActiveStructuredMemoryWriteView | Promise<ActiveStructuredMemoryWriteView>;
}
```

The reference resolver takes deny-by-default exposure configuration:

```ts
type StructuredMemoryWriteExposureGrantRule =
  | boolean
  | { writableKeys: readonly string[] };
```

This is exposure policy, not an `EffectAuthorizer` decision. A deployment may derive exposure and
dispatch policy from the same immutable application configuration, but the evaluations remain
separate and occur at different times. The reference resolver store dependency is structurally
narrowed to `readExecution` and `readStructuredMemoryView`; mutation methods are not in its type.

The reference resolver orders its work as:

```text
authored requested keys
  ∩ current write-exposure grant
    empty -> return empty view; no Execution or Structured Memory view read
    non-empty -> resolve Execution binding -> resolve declarations -> retain declared keys
```

Consequently a denied declared key and a denied unknown key both produce an empty result with zero
memory-view reads. An authorized unknown key is removed only after declaration resolution and cannot
widen exposure.

The resolver returns data only. It has no dispatch, mutation, confirmation, settlement, or
authorization-decision path. The Agent controller receives no `RuntimeStore`, `Harness`,
`EffectAuthorizer`, slots, or `StructuredMemoryViewRef`.

## 4. Structured Memory write Active View

The authorized memory branch returns deterministic, key-ordered metadata:

```ts
interface ActiveStructuredMemoryWriteEntry {
  kind: "structured_memory_write";
  key: string;
  description: string;
  valueSchema: ValueSchema;
}

interface ActiveStructuredMemoryWriteView {
  viewId: string; // content-derived correlation identity, never authority
  entries: readonly ActiveStructuredMemoryWriteEntry[];
}
```

No entry carries a current value, memory-view id, revision, credential, or store handle. A missing
field description receives the deterministic description `Write Structured Memory field "<key>"`.

## 5. Heterogeneous Active Model Action View

Capability operations and memory writes remain typed branches:

```text
ActiveOperationView --------------------\
                                         -> ActiveModelActionView
ActiveStructuredMemoryWriteView --------/
```

```ts
type ActiveModelActionEntry =
  | CapabilityOperationActionEntry
  | StructuredMemoryWriteActionEntry;

interface ActiveModelActionView {
  viewId: string;
  sources: {
    operations: string;
    structuredMemoryWrites: string;
  };
  entries: readonly ActiveModelActionEntry[];
}
```

The combined view is deterministically ordered and its id is derived from both source ids and all
canonical entries. It is a visibility snapshot, not permission.

> **F.2a note:** this `ActiveModelActionView` is and remains the **authority-governed** model-action
> view - `Projection ⊆ Active View ⊆ Effective Authority ⊆ Catalog`. Slice F.2a
> ([`021`](021-slice-f2a-working-notes-local-scratch.md)) deliberately did **not** add a third arm
> to it: the controller-local `working_notes_set` control is a separate category
> (`LocalModelControlProjection`), merged with this view into one provider callable namespace only
> at `ModelInvocationInterface`, where each binding keeps its provenance. The two source arms and
> the `amav_` view id here are unchanged by F.2a.

## 6. Projection generalization and integrity

`ModelActionProjection` is cut only from an `ActiveModelActionView`:

```ts
interface ModelActionProjection {
  projectionId: string;
  viewId: string;
  bindings: readonly ModelActionBinding[];
}
```

The former operation-authority `viewRevision` was removed because it could not honestly describe a
heterogeneous view. The combined content-derived `viewId` is the single source-view correlation.

Optional per-invocation narrowing is now `actions?: readonly ModelActionTarget[]`. These are
identity-only selectors. Every selector is resolved back through the supplied combined view, and
every binding copies its target, description, and schema from the canonical matching entry. An
off-view target fails projection construction. Duplicate aliases are rejected across the complete
heterogeneous binding set, including capability-to-memory collisions; no iteration-order winner or
implicit suffix exists.

Thus the construction rule is:

```text
ModelActionProjection.bindings ⊆ ActiveModelActionView.entries
```

There is no projection API accepting an Agent write request or caller-supplied entry metadata.

## 7. Target, alias, and input schema

The second actual target arm is identity only:

```ts
interface StructuredMemoryWriteTarget {
  kind: "structured_memory_write";
  key: string;
}
```

It contains no value, view identity, revision, or authority. A field `profile` receives the stable
provider-facing alias `memory_write_profile`; the alias is never parsed back into identity. The
persisted binding target is the identity.

The provider-facing input schema is derived from the declaration:

```ts
{
  kind: "object",
  fields: {
    value: { required: true, schema: field.valueSchema }
  },
  additionalProperties: false
}
```

The model supplies only `{ value }`. The exact key belongs to the binding.

## 8. Agent selection and the F.0 runtime

For a resolved `structured_memory_write` binding, the Agent controller structurally accepts exactly
one JSON `value` property and proposes:

```ts
writeMemory({
  key: target.key,
  value: call.input.value,
  requestKey: agentCallCorrelationId(step, callIndex),
})
```

It does not resolve memory or validate the field schema. The ordinary Harness path remains the sole
owner of fresh concrete-Effect authorization, optional exact-payload confirmation, current
binding/declaration resolution, authoritative schema validation, atomic commit, journal records,
and runtime-established `memory.written` delivery. A stale projected binding can therefore preserve
its historical meaning while current dispatch authority denies the write.

The capability arm remains unchanged and produces `UseCapability`. One invocation may contain and
select both action families without sharing their authority semantics.

## 9. Settlement and model observation

`memory.written` rejoins the Agent's existing correlation-based Effect-result collection. The source
Event remains runtime truth and retains its runtime metadata. The semantic result projected for the
next model invocation is deliberately smaller:

```json
{ "key": "profile", "written": true }
```

Neither `memoryViewId` nor whole-view `revision` reaches the model. Confirmation decline continues
to settle the pending call as `declined`; approval dispatches the same stored proposal, and a
successful `memory.written` settles it as completed. No Agent-specific confirmation mechanism was
added.

## 10. Snapshot and re-entry semantics

The combined projection, including the exact `StructuredMemoryWriteTarget`, is stored in the
existing `AgentInvocationState`. If model work suspends, re-entry replays that projection and never
calls either exposure resolver. A returned alias resolves only through that historical snapshot.

Exposure and final authorization may change while the call is outstanding:

```text
old persisted projection gives the returned alias its old key meaning
current Harness authorization decides whether the resulting exact WriteMemory executes
```

A later genuinely new invocation resolves both active-view branches again. No Active View cache was
introduced.

## 11. Read/write independence and optional cost

The invocation remains two semantic branches:

```text
information: instructions + transcript + authorized Structured Memory read snapshot
actions:     authorized capability view + authorized Structured Memory write view
```

They meet only in the provider request. Read grants do not expose write actions, write exposure does
not expose values, and final write permission implies neither.

When `structuredMemory.write` is absent, the controller does not call the write-view resolver. An
Agent may still have a memory binding, a configured resolver, and final write permission and incur:

```text
zero write-exposure resolver calls
zero Execution or Structured Memory view reads for write exposure
zero added provider actions
zero extra model calls
```

F.1-only readers therefore pay no F.1.1 write-exposure cost.

## 12. Workflow scope and explicit deferrals

The existing deterministic Workflow Function-Stage path is untouched: a Function Stage may propose
the typed `WriteMemory` Effect directly and needs no model Active View. F.1.1 wires only the
reference Agent. A later Workflow LLM Stage may consume the same controller-neutral resolver before
building its own model projection; no Workflow-specific memory authority implementation was added.

Explicitly deferred:

```text
Derived Semantic Memory, Working Notes, Artifacts
memory search/retrieval/promotion
CAS, expected revisions, transactions, reducers, leases, shared-state conflict semantics
Workflow LLM write exposure, adapter redesign, MCP memory mappings
generic user/org/world scope ontology
model-directed spawn, messaging, or user input
Active View caching
```

## 13. Conformance evidence

The F.1.1 suites cover:

- request validation and read/write independence;
- request ∩ exposure grant ∩ bound declaration derivation;
- denial before any Execution/view read and authorized-unknown removal after view resolution;
- no request, no binding, and no exposure-authority cases;
- canonical heterogeneous projection membership and identity-only narrowing;
- cross-family alias collision refusal;
- exact-key ownership, malformed wrapper refusal, and runtime-authoritative schema validation;
- successful write, fresh dispatch denial after suspension, and minimal `memory.written` observation;
- exact-payload confirmation approval and decline through the existing F.0 path;
- persisted projection reuse with zero write-exposure resolution on re-entry, followed by fresh
  exposure on the next invocation;
- mixed capability and memory action selection;
- child non-inheritance;
- explicitly instrumented no-feature resolver/store-read cost;
- architecture import-graph boundaries and unchanged information/compiler separation.

Local validation at the review-ready branch tip:

- `npm test` — 866 passed, 0 failed;
- `npm run test:conformance` — 615 passed, 0 failed;
- `npm run test:mcp` — 68 passed, 0 failed;
- `npm run test:evals` — 12 passed, 0 failed;
- `npm run test:benchmark-subjects` — 8 passed, 0 failed;
- `npm run typecheck` — passed;
- `git diff --check` — passed.
