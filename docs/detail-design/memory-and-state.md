# Memory, state, and context

This document preserves useful memory/state design under the current [`Kernel`](../kernel.md) and [`Execution`](../execution.md) split.

The Kernel does not require one universal memory ontology. ArrokothI's own Runtime may still use a richer vocabulary because it helps Agent/Workflow engineering.

## Kernel side

### Kernel History

**Execution History** is Kernel-owned evidence about managed work:

- accepted inputs;
- Activation dispatch/acceptance;
- lifecycle transitions;
- Effect intents, admission, attempts, settlement, and uncertainty;
- child/message correlation;
- cancellation and recovery decisions;
- accepted result/emission identities.

History is for correctness, audit, inspection, and recovery. It is not automatically Agent memory, user profile, model context, or a deterministic replay transcript.

### Progress

**Progress** is Runtime-owned continuation data accepted by the Kernel. The Kernel may store it as structured data or an opaque/checkpoint reference, but does not infer semantic memory from it.

A checkpoint is a resumable snapshot under a declared Runtime contract. A mutable session locator alone is not a checkpoint.

### Shared/application state

Business state, application databases, artifacts, files, indexes, and other shared resources remain ordinary application services.

When the application wants Kernel governance over their access, expose the relevant operation/resource through Effects. The Kernel does not need to turn every application database into a built-in memory subsystem.

Resource-specific correctness may require revisions, preconditions, transactions, leases, or conflict rules. Those semantics belong to the resource/service contract unless a repeated cross-resource requirement justifies a portable Kernel facility.

### Visibility and authority

Scope or ownership metadata does not itself grant read/write permission. Reads and writes must follow the application's access policy and the relevant Kernel-mediated boundary when governance is claimed.

A child Execution does not inherit private state merely because it has a parent link.

## Execution side

ArrokothI's own Agent/Workflow Runtime may use the following **optional Runtime vocabulary**. Foreign Runtimes do not need to adopt it.

| Runtime concept | Meaning |
|---|---|
| Structured state/memory | Explicitly asserted, schema-bound state whose application meaning is known |
| Derived Semantic Memory | Inferred claims retained with provenance; may be stale, wrong, or conflicting |
| Working Notes | Temporary Runtime-owned scratch state for planning/reasoning continuity |
| Artifact/File reference | Reference to larger durable application-owned content rather than forcing it through prompt/state text |

These categories are useful because they have different epistemic and lifecycle properties, not because the Kernel needs four memory types.

### Memory and context

**Memory** is retained information. **Context** is information selected for one computation.

A Runtime may compile context from:

- current Events;
- native transcript/session state;
- Structured state;
- retrieved Derived claims or documents;
- Working Notes;
- application resources;
- provider-native caches or summaries.

Context compilation may filter, retrieve, rank, summarize, redact, and format. It does not grant authority.

The Runtime should preserve the distinction between source material and conclusions derived from it. Observing text does not automatically create durable semantic memory.

### Structured state

Structured state represents explicit asserted values. Useful rules for ArrokothI's reference Runtime include:

- validate writes against the declared schema;
- preserve revision/history when concurrency matters;
- expose only fields the current read policy permits;
- reject or surface stale optimistic writes rather than silently last-write-wins;
- do not expose storage/concurrency metadata to a model unless it is semantically useful.

A Runtime may choose an application-owned state service instead of ArrokothI's current Structured Memory implementation.

### Derived Semantic Memory

Derived memory is inference, not authoritative state.

A retained claim should keep enough provenance to answer where it came from and how it was derived. Useful fields may include source references, derivation method/version, and time. Confidence, temporal validity, supersession, entity models, and graph structure remain provider/application choices until evidence justifies portability.

Derived claims do not automatically become:

- application truth;
- authority evidence;
- exact consent;
- Structured state.

Promotion into asserted state is an explicit application/Runtime action and should retain provenance.

### Working Notes

Working Notes are bounded Runtime-owned scratch state. They are useful for preserving planning state without treating every internal thought as application memory.

They should not automatically cross:

- parent/child Execution boundaries;
- independent Workflow branches;
- Runtime/provider boundaries.

When a handoff is useful, make it explicit and copy/select the intended information. The receiving Runtime owns its new writable state.

### Artifacts and large values

Local values should pass directly between Runtime steps. Do not use memory writes merely to move an object from one node to the next.

Large or durable values may cross boundaries through application-owned references. A useful reference contract identifies the object/version plus enough ownership/access/retention information to detect missing or stale data.

ArrokothI does not require one universal Artifact store.

### Scope, views, and sharing

Memory location, application scope, and permission are separate concerns.

A Runtime/application may define views such as selected fields, task-local state, organization knowledge, or child handoff. Each view should be explicit about what is visible; ancestry or shared scope must not bypass authorization.

### Concurrency

Avoid timing-dependent last-write-wins when multiple branches/Executions can update the same resource.

Use the weakest mechanism that preserves the resource contract:

- optimistic revision/precondition;
- field/key-level conflict detection;
- reducer/commutative update;
- transaction;
- resource-specific lease/fencing.

The Kernel's one-Activation-writer rule protects accepted Execution progress; it does not by itself serialize an external shared database or native session.

## Preserve vs retire from the previous model

| Previous idea | Current treatment |
|---|---|
| Memory is different from context | Preserve |
| Inferred information is different from asserted state | Preserve |
| Provenance matters for derived claims | Preserve |
| Working Notes are temporary and not authority | Preserve as optional Runtime design |
| Explicit child/view sharing | Preserve |
| Structured Memory optimistic conflict handling | Useful reference Runtime/service design |
| Four memory forms as mandatory Kernel ontology | Retire |
| Universal cross-Execution memory scope ontology | Not required; application/service-specific until proven otherwise |
| Universal graph/vector memory backend | Retire as requirement; optional integration |

Current implementation evidence is indexed in [`../development/002-implemented-kernel-baseline.md`](../development/002-implemented-kernel-baseline.md). The full historical memory design remains in [`../mental-model-legacy/memory.md`](../mental-model-legacy/memory.md).
