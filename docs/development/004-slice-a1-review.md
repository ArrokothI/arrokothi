# Slice A.1 Implementation Review

> **Status: accepted for continuation to Slice B.**
>
> This is a review note for the implemented Slice A.1 runtime substrate. It does not override the canonical architecture documents, `002-architecture-decisions.md`, or `003-implementation-audit-and-migration-plan.md`.

## 1. Review conclusion

Slice A.1 is accepted as the implementation baseline for Slice B.

The implemented path is a genuinely new v0.4 semantic runtime path rather than renamed legacy Session/Turn machinery.

The important ownership boundaries are present:

```text
Definition
    ↓ create
ExecutionContext
    ↓ scheduled
Activation
    ↓
ExecutionController
    ↓ semantic outcome
Harness
    ↓ operational lifecycle / persistence / scheduling
```

The new path keeps:

```text
Definition != Execution
Agent / Workflow = Execution kinds
response/emission != terminal completion
controller semantic control != Harness operational control
runtime Event != lifecycle/audit record
Stage != Execution
```

No human architectural decision blocks Slice B.

---

## 2. Verified strengths

### New runtime is isolated from legacy semantics

The v0.4 implementation and architecture tests explicitly prevent the new path from importing Session, Flow/Phase, planning/preflight, old Harness/AgentRuntime, legacy provider/retrieval/tool ownership, or external integration packages.

Continue treating this zero-legacy-import rule as a migration invariant.

### ExecutionContext ownership is clear

Identity, definition ref, ownership/root identity, lifecycle, controller progress, wake dependency, terminal result, failure, mailbox ref, and revision are separately represented.

Controller progress is opaque to the kernel but tagged by Execution kind.

The controller-facing `ExecutionView` intentionally excludes persistence revision, mailbox handles, and deferred authority/memory/resource slots.

### Harness/controller boundary is correct

Controllers receive read-only data and return semantic outcomes.

They cannot directly:

- persist runtime state;
- access a mutable store or scheduler;
- set lifecycle state;
- grant authority;
- dispatch capabilities.

The Harness validates outcomes and owns all lifecycle transitions.

### WAIT/Event/wake semantics are strong enough for Slice A

The implementation handles both relevant races:

1. a matching Event arriving while an Execution is already WAITING wakes it and schedules the next Activation;
2. a matching Event arriving during an Activation is noticed before the Harness derives WAITING, so runnable work is not stranded.

The Event envelope is intentionally minimal and Slice B must replace the open `kind: string` body protocol with the closed v0.4 Event vocabulary.

### RuntimeStore direction is sound

The current transaction boundary uses focused facets inside one atomic runtime transaction rather than independently transactional micro-stores.

Slice B should extend that transaction with pending-operation, Effect-journal, and outbox-related reference semantics without turning the store into an untyped bag.

---

## 3. Accepted temporary deviations

### Temporary `@agent-sdk/core/execution` surface

The target v0.4 semantic API currently lives at:

```text
@agent-sdk/core/execution
```

because the legacy root exports occupy several of the same names.

This is an acceptable migration device, not the intended final v1 surface.

Do not design new semantics around the existence of this subpath. When legacy root APIs are deleted, the target semantic API can become the primary root surface.

### Generic Slice-A Agent/Workflow specs

`AgentSpec` and `WorkflowSpec` remain generic JSON objects in Slice A so the substrate does not prematurely freeze Slice C/D authoring APIs.

Slice C and D should replace/narrow these specs deliberately rather than preserving generic JSON as the final design.

### Deferred slots are placeholders, not frozen APIs

The current `DeferredSlots` values for authority, active view, memory, resources, pending work, and policy only reserve ownership locations.

Slice B and later slices may replace their string/null placeholder shapes with proper typed refs/contracts.

Do not preserve the current placeholder representation for compatibility.

---

## 4. Slice B guardrails

### Event consumption vs future wake dependency

Events passed into an Activation are already delivered/consumed observations for that Activation.

If a controller consumes those Events and then returns a new `await_event` condition, that condition is **prospective**: it describes what is still needed after the controller's semantic work.

The Harness should not reinterpret already-consumed Events as satisfying a newly reported dependency. Only Events still pending in the mailbox after the Activation should prevent WAITING.

This preserves the ownership rule:

```text
controller decides whether delivered observations were semantically sufficient
Harness decides whether a reported remaining dependency is already satisfied by newly pending work
```

Slice B should encode this explicitly in Event/mailbox contract tests.

### Delivery is not the same as controller consumption

An Event may be accepted into a nonterminal Execution's mailbox while an Activation is running and the controller may subsequently complete before consuming that Event.

Slice B should distinguish clearly among:

```text
accepted/routed
persisted in mailbox
consumed by Activation
acknowledged/settled where applicable
```

Do not make an API receipt claim that an Event was semantically observed by a controller merely because it was durably accepted by the mailbox.

### Do not extend the legacy hash helper into a security boundary

The current dependency-free `hashValue`/FNV helper is acceptable for the Slice-A definition-integrity checksum because that checksum is explicitly not a security signature.

Do **not** automatically reuse it for new authority, confirmation, security-sensitive payload binding, or adversarial identity guarantees.

For Slice B Effect identity/idempotency, prefer explicit stable IDs (`EffectId`, `PendingOperationId`, etc.) and persisted correlation records where possible rather than treating a weak content hash as identity.

If a content digest becomes security-relevant in a later slice, introduce an explicitly reviewed collision-resistant mechanism/port instead of silently upgrading the meaning of the legacy helper.

### Keep durability claims scoped

Slice A still has known crash windows around scheduler enqueue/claim recovery and no durable Activation lease.

Slice B may add reference pending/effect semantics, but it must not claim Slice-I restart/durability guarantees early.

The reference runtime should preserve semantic equivalence between fast and slow Effect completion while leaving production crash recovery to the durability slice.

---

## 5. Required Slice B direction

Slice B should build on the new substrate and introduce:

```text
closed Event vocabulary
EffectRequest vocabulary
EffectId / PendingOperationId
PendingOperation
Effect journal
CapabilityExecutor boundary
minimal authority decision boundary
mailbox/router correlation and deduplication
fast vs slow Effect completion equivalence
inline wait budget != Effect operation deadline
failure Event before semantic Execution failure
```

Only `UseCapability` needs a complete real dispatch path in Slice B. Other accepted v0.4 Effect kinds may be represented in the closed union but should remain explicitly unsupported until their owning slices rather than implemented prematurely.

The controller must propose Effects through a narrow requester/outcome mechanism. It must never receive the capability executor or Effect journal directly.

The Harness remains the sole operational owner of authorization, pending-operation creation, dispatch, correlation, result Event creation, wake-up, and persistence.

---

## 6. Review gate after Slice B

Before beginning Workflow Stages, review the actual implementation of:

- Event and Effect envelopes;
- PendingOperation;
- Effect journal/idempotency records;
- controller Effect-request boundary;
- Harness Effect processor;
- CapabilityExecutor port;
- reference fast/slow execution paths;
- Event/mailbox delivery/consumption semantics;
- Slice-B conformance tests.

The question at that gate is not API polish. It is whether all external action still crosses one inspectable, authorized, correlated Harness boundary.
