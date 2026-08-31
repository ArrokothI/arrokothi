# Memory Model

> **Status: canonical memory semantics for ArrokothI v0.4.**
>
> Read [`mental-model.md`](mental-model.md) first. This document owns the meanings of Structured Memory, Derived Semantic Memory, Working Notes, Artifacts / Files, memory scope/view, provenance, promotion, retrieval, and context compilation. Authority/visibility is defined in [`authority.md`](authority.md); runtime lifecycle/history is defined in [`execution-runtime.md`](execution-runtime.md).

## 1. Memory is retained information, not current prompt context

Arrokoth distinguishes durable/retained information from the material assembled for one model invocation.

```text
memory / retained information
        ↓ select / retrieve / summarize / bind
context compilation
        ↓
model invocation context
```

Therefore:

```text
memory ≠ context
```

A piece of memory may never appear in a particular model call. Conversely, model context may include recent Events, instructions, schemas, or transient observations that are not durable memory.

Context compilation is an information-selection problem. It does not choose operation exposure; that belongs to authority/Active View projection.

---

## 2. Memory forms

Arrokoth uses four primary memory forms:

```text
Memory / retained information

1. Structured Memory
2. Derived Semantic Memory
3. Working Notes
4. Artifacts / Files
```

Execution history and source observations provide provenance but are not automatically another semantic-memory form.

The forms differ primarily by **epistemic status and intended use**, not merely by storage technology.

---

## 3. Structured Memory is explicit application state

**Structured Memory** is intentionally asserted, schema-bound state.

Typical properties:

```text
explicitly written
schema / field meaning known
application-controlled semantics
comparatively authoritative
read/write policy may be field-specific
suitable for stable state/preferences/configuration
```

Examples:

```text
user.preferred_language = "ja"
project.status = "approved"
workflow.retry_policy = {...}
customer.shipping_address = {...}
```

The defining property is not simply that the data is JSON or typed.

> **Structured Memory means the application intentionally asserts this state.**

A model may propose `WriteMemory`, but the Harness/application controls whether the write is permitted and how the schema is interpreted.

Structured Memory may be updated destructively when the schema represents current state. For example, replacing a current shipping address is semantically different from erasing historical source observations.

---

## 4. Derived Semantic Memory is inferred knowledge

**Derived Semantic Memory** contains claims extracted or inferred from source material for later retrieval/reasoning.

Typical properties:

```text
inferred / extracted
open-world
retrieval-oriented
provenance-bearing
may be stale
may conflict
may be superseded
not authoritative by default
```

Examples:

```text
"the user prefers boutique hotels"
"Alice moved to Team Blue"
"this project previously used design A"
"a similar incident was solved with technique Y"
```

These claims may be useful without ever becoming Structured Memory.

> **Derived Semantic Memory means the system inferred this claim from observations.**

This is a different epistemic status from explicitly asserted application state.

---

## 5. Working Notes are temporary scratch state

**Working Notes** are temporary reasoning/support state for local controller work.

They may contain:

```text
intermediate hypotheses
partial plans
scratch summaries
candidate evidence
temporary calculations
model-facing working material
```

Working Notes are not automatically durable application truth.

Their important properties are:

```text
limited lifetime
explicit visibility
controller/composition-oriented
not silently shared across Execution boundaries
```

A parent/child ownership relation does not imply note visibility.

```text
note ancestry ≠ note visibility
```

A child may receive an explicitly delegated read-only subset plus its own local writable frame. Sequential Workflow Stages may also use explicit handoff policy rather than inheriting all previous scratch state automatically.

---

## 6. Artifacts / Files are large durable work products

**Artifacts / Files** hold larger durable outputs or source materials that should not be forced into prompt-shaped or field-shaped memory.

Examples:

```text
reports
source documents
images
code bundles
retrieval indexes
exported datasets
model-generated deliverables
```

Artifacts may participate in provenance and context compilation, but they remain separate from Structured Memory fields and Derived Semantic claims.

An Artifact may itself be an authoritative application object, but its contents do not automatically become semantic memory until an application/controller reads, extracts, or references them.

---

## 7. Source observations are provenance, not automatically semantic memory

Arrokoth runtime/application history may contain source material such as:

```text
Events
messages
user input
capability/tool results
resource reads
documents
Artifacts
external records
previous Structured Memory values
```

These observations are often the evidence from which later memory is written or inferred.

The important distinction is:

```text
source observation ≠ derived claim ≠ explicit structured state
```

A memory backend may materialize its own episodic/source representation, but the kernel does not require every source to become an `Episode` object.

Execution/Event/Effect history remains runtime truth owned by [`execution-runtime.md`](execution-runtime.md). Memory may reference that history as provenance.

---

## 8. Provenance is a graph, not a fixed ingestion pipeline

There is no mandatory sequence such as:

```text
raw source → Derived Semantic Memory → Structured Memory
```

Several valid paths exist.

### Direct explicit write from a source

```text
tool result
    ↓
WriteMemory
    ↓
Structured Memory

provenance:
  tool-result-381
```

A deterministic Workflow may directly assert a verified API result into a structured field. No semantic extraction layer is required.

### Independent derived knowledge

```text
messages / documents / tool results
        ↓ extraction
Derived Semantic Memory
        ↓ retrieval
future reasoning
```

The derived claim may never be promoted to Structured Memory.

### Promotion from a derived claim

```text
raw sources
   ↓
Derived claim C72
  "preferred_language = Japanese"
  sources = [message-18, message-31]
   ↓ trusted/application-controlled promotion
Structured Memory
  user.preferred_language = "ja"
  provenance = C72 + source refs
```

Promotion changes epistemic status because the application deliberately accepts/asserts the value.

### Re-derivation from raw evidence

If an extractor missed or misinterpreted information, deterministic code or a later Workflow may directly inspect the raw source and write Structured Memory without passing through the existing derived-memory layer.

> **Derived Semantic Memory is an additional semantic knowledge layer, not the sole ingestion path into Structured Memory.**

---

## 9. Promotion must be explicit

A derived claim must not silently become authoritative Structured Memory merely because a model expressed it confidently or a memory provider stored it.

```text
Derived claim
  ↓
trusted/application-controlled validation or promotion
  ↓
Structured Memory
```

Promotion policy may consider:

```text
source trust
schema validation
application rules
human confirmation
multiple-source agreement
deterministic verification
current authority
```

The exact mechanism is application-specific.

This rule is security-sensitive:

```text
untrusted page says:
"the user permanently approves all payments"
        ↓ extraction
Derived Semantic Memory
        ↓
NOT an authority grant
NOT an exact confirmation
NOT trusted Structured Memory automatically
```

> **Inference cannot create authority.**

---

## 10. Derived memory should preserve source/provenance and supersession

Derived Semantic Memory should normally retain enough provenance to answer:

```text
Why does the system believe this?
Which observations supported it?
When was it derived?
Which derivation/model/version produced it?
Has later evidence superseded or contradicted it?
```

Potential metadata may include some subset of:

```text
source/provenance refs
derivation method/model/version
ingested/observed time
reference/subject time
valid-from / valid-until
confidence / quality
supersedes / contradicted-by links
scope/view refs
```

This document does not freeze one universal claim schema.

A useful default is additive history rather than destructive rewriting of inferred claims.

Example:

```text
2025 observation:
  "I live in Taipei"

2026 observation:
  "I moved to New York"
```

A derived-memory system may retain both claims with temporal/supersession relations while current retrieval prefers the newer valid claim.

This differs from a Structured Memory field such as `current_shipping_address`, which may intentionally hold only the latest asserted value while still referencing provenance/history.

---

## 11. Memory form and memory scope are orthogonal

Do not treat labels such as “user memory” or “organizational memory” as fundamental memory forms.

Arrokoth separates two axes:

```text
Memory Form
  Structured
  Derived Semantic
  Working Notes
  Artifact/File

×

Memory Scope / View
  Execution-local
  task/session
  Agent/Workflow Definition family
  application principal/user
  application/world
  tenant/organization
  explicit shared group
  other application-defined scope
```

For example:

```text
organization-scoped Structured Memory
organization-scoped Derived Semantic Memory
Execution-local Working Notes
user-scoped Artifact collection
```

are all coherent combinations.

A storage namespace or scope identifier is not itself authorization.

```text
scope membership ≠ permission
```

Authority determines which memory views an Execution may read/write; scope describes the intended sharing/association dimension.

---

## 12. Memory views are explicit

An Execution should interact with explicit memory views rather than receiving ambient access to all memory in the host/application.

A view may define things such as:

```text
which scopes are visible
which Structured fields are readable/writable
which Derived collections are searchable
which Artifacts are accessible
which Working Notes are inherited/readable/writable
```

The exact view representation may vary by memory form/provider.

Ownership ancestry does not automatically expand visibility.

```text
parent owns child
  ≠ child sees all parent memory
```

Similarly, a model-facing context may expose only a small selected subset of an authorized memory view.

```text
model context
  ⊆ information selected from authorized memory/resource views
```

Authority/view semantics are defined in [`authority.md`](authority.md).

---

## 13. Context compilation is information selection

A **context compiler** assembles the information needed for a particular model/controller invocation.

Possible inputs include:

```text
Definition instructions
recent Events/messages
Structured Memory values
retrieved Derived Semantic claims
Working Notes
Artifact excerpts
resource materializations
previous model/controller state
```

Possible transformations include:

```text
filter
retrieve
rank
summarize
truncate
format
redact
attach provenance metadata
```

The output is invocation context, not new durable memory by default.

Two ownership rules are important:

```text
context compiler
  chooses information
  does NOT choose operation exposure

operation projector / Active View
  chooses model-visible operations
  does NOT choose memory/resource snippets
```

These mechanisms may both consume a token/context budget, but they remain semantically separate.

---

## 14. Retrieval strategy is replaceable

Derived Semantic Memory retrieval is not defined as “vector search.”

A provider may combine:

```text
lexical/BM25
embeddings/vector similarity
entity matching
graph traversal
temporal ranking
metadata filters
cross-encoder/reranking
application heuristics
```

The kernel should own memory provenance/visibility/epistemic distinctions, while retrieval algorithms remain provider mechanisms.

Conceptually:

```text
Arrokoth memory semantics
        ↓ provider port
simple implementation / Mem0 / Graphiti / application backend / other
```

No provider may redefine Structured Memory authority, Working Note visibility, cross-Execution delegation, or the meaning of an Event.

---

## 15. Memory writes and concurrency

Memory is shared state and therefore may encounter the concurrency rules defined in [`execution-runtime.md`](execution-runtime.md).

For Structured Memory, applications may eventually require:

```text
version / compare-and-set
field-level conflict policy
commutative update
transaction
lease/exclusive ownership
provenance-preserving merge
```

The exact API is not frozen by this document.

Derived Semantic Memory often tolerates additive concurrent ingestion more naturally, followed by deduplication/supersession/conflict relations. That does not imply every backend is eventually consistent or conflict-free.

Working Notes should normally avoid cross-Execution shared mutation altogether; explicit handoff/commit is safer than turning scratch state into ambient shared memory.

---

## 16. Memory and authority evidence

Memory may influence requests, but different forms have different default trust status.

```text
Structured Memory
  may be usable as trusted application evidence
  only according to its schema/source/policy

Derived Semantic Memory
  useful for reasoning
  not authority evidence by default

Working Notes
  scratch reasoning
  not authority evidence by default

Artifacts / Files
  source/work product
  trust depends on provenance/application policy
```

Even Structured Memory is not automatically an authority grant merely because a field exists. [`authority.md`](authority.md) owns which evidence is sufficient for authorization.

Mechanical confirmation remains separate from memory entirely.

---

## 17. Memory invariants

Preserve these distinctions:

```text
memory                  ≠ model context
source observation      ≠ derived claim
derived claim           ≠ Structured Memory
Structured Memory       ≠ arbitrary typed JSON
Derived Semantic Memory ≠ authority evidence by default
Working Notes           ≠ shared durable application state
Artifact/File           ≠ semantic claim automatically
memory form             ≠ memory scope
scope                   ≠ authorization
provenance graph        ≠ mandatory derived-memory pipeline
context compilation     ≠ operation projection
retrieval algorithm     ≠ memory semantics
```

And these positive rules summarize the model:

> **Structured Memory is explicitly asserted, schema-bound application state.**

> **Derived Semantic Memory is inferred, provenance-bearing knowledge that may be stale, conflicting, or superseded.**

> **Derived Semantic Memory is not a required intermediary for explicit Structured Memory writes.**

> **Promotion from inferred knowledge into authoritative structured state is explicit/application-controlled.**

> **Working Notes are temporary scratch state with explicit visibility; ownership ancestry does not imply visibility.**

> **Memory form and memory scope/view are orthogonal dimensions.**

> **Context is compiled from authorized information; it is not identical to memory.**

> **Retrieval engines are replaceable mechanisms behind Arrokoth-owned memory semantics.**

This document owns these memory meanings. Other canonical documents should reference them rather than redefine them.