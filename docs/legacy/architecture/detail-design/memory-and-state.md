# State, memory, artifacts and provenance

> **Superseded architecture, retired 2026-09-14.** The current architecture is the [mental model](../../../../mental-model/README.md) and its [reference index](../../../../mental-model/reference.md). Phrases below such as "target contract", "current design" or "this page owns" describe this document as it stood then, not current authority; some rules here were later corrected. [What replaced it](../../README.md).

**Owner:** application/resource services for shared truth; Runtime for continuation, memory and scratch;
Kernel for accepted progress and History only. **Status:** optional Runtime/service design for R2,
with authority/recovery requirements in K2/K3/K5. Foreign Runtimes do not adopt this taxonomy.

## Information roles

| Role | Meaning | Typical owner and lifetime |
|---|---|---|
| Accepted progress | Runtime continuation accepted at a Kernel revision | Runtime meaning; Kernel reference and retention pin |
| Execution History | Accepted decisions, inputs, action evidence and routing | Kernel; declared audit/recovery period |
| Structured state / Structured Memory | Deliberately asserted schema-bound application values | Application service; explicit revisions/retention |
| Derived Semantic Memory | Inferred claims, potentially wrong, conflicting or stale | Runtime/provider; provenance and correction policy |
| Working Notes | Bounded scratch plans, hypotheses and continuity notes | Runtime/branch; limited visibility/lifetime |
| Artifact/file | Durable source material or work product too large for ordinary values | Application/native store; immutable version when relied on |
| Context | Selection for one computation | Runtime; not retained information by default |

“Structured” means intentionally asserted with application meaning, not merely JSON. A schema-valid
model inference remains an inference until the application explicitly accepts it. History is not a
business database or an automatically searchable transcript. Artifacts may be authoritative objects,
but reading a file does not automatically promote its contents into application truth.

## Structured state service contract

Use ordinary state services before a new Kernel memory product. A supported state operation declares
schema/version, readable/writable fields, owner, revision/preconditions, exact update semantics and
result certainty. Reads and writes have separate permissions. Govern them through Effects where a
Kernel action claim is needed; a native trusted read can remain native with its access owner declared.
The old “a read is never an Effect” rule is not a target restriction.

A useful baseline is snapshot read + compare-and-set write. Given revision 17, a write conditional on
17 either commits the value/provenance and new revision together or returns conflict without mutation.
The Runtime can reread/recompute or fail; no automatic last-write-wins, merge or new consent. If the
payload changes after conflict resolution, it is a new action. Multi-field invariants use the owning
database's transaction; independent Effects do not supply a multi-resource transaction.

A whole-view revision can reveal that hidden fields changed. Keep internal preconditions out of
field-limited model context, and use selected-field/view-scoped versions or a trusted internal binding
when needed. Do not pass opaque tokens to a model merely because they are called metadata; their
changes may disclose private activity. The reference 0.8.x read-view tests already protect this case.

Allow commutative updates, field-level preconditions or resource leases only where they preserve the
actual service invariant. Per-Execution single-writer progress never serializes other Executions'
writes to a shared store. Long-lived exclusivity requires service-enforced fencing, not a mutex held
while an Agent waits for a human.

## Derived claims and provenance

A minimum useful claim has stable claim identity, statement, one or more source/version references,
derivation method/version and observed/derived time. Application-specific fields can add subject,
confidence, valid time, contradiction and supersession links. These are useful optional provider
features, not a universal graph or confidence semantics in the Kernel.

Source observation, derived claim and asserted state are separate nodes in a provenance graph:

```text
trusted API result ───────────────→ explicit application assertion
messages/documents → inferred claim → optional verified promotion → assertion
raw source ───────────→ corrected extraction (old claim remains attributable)
```

There is no mandatory raw → derived → structured pipeline. A deterministic Workflow can directly
assert a verified source value; an inferred claim may remain useful indefinitely without promotion.
Source IDs must resolve under access policy; they are not authority evidence simply because they exist.

Promotion is an explicit application decision with validation, authority and provenance. It may require
human review or independent verification. Do not treat a memory extractor's “user approves all payments”
as a grant. Even promoted state becomes policy evidence only under a separate trusted policy contract.
Correction of a source/claim does not silently rewrite already accepted business actions or past consent.

Prefer additive correction/supersession history when useful: “lived in Taipei in 2025” and “moved to
New York in 2026” may both be valid. Distinguish observation time, derivation time and the time the
claim describes. Retrieval chooses current relevant evidence without deleting conflicting history by
accident. A corrected claim should identify affected promoted values for application review; automatic
rollback is not implied. Deletion policy can remove payloads while retaining permitted provenance
metadata and an explicit unavailable-source state.

## Views, retrieval and disclosure

Memory form is orthogonal to scope: organization-scoped asserted state, user-scoped artifacts and
Execution-local notes are all possible. Scope labels locate data; they do not authorize it. A view
selects readable fields/collections/objects and writable targets under current principal policy.
Children, shared sessions and matching folder prefixes do not automatically share a view.

Authorize retrieval scope before calling a provider, including query disclosure to remote embedding/
ranking services. Filter results and provenance metadata before returning them; avoid unauthorized
counts, snippets or ranking influence where claiming non-disclosure. A cached index needs an access/
freshness contract and final resource reads must recheck permission. Revocation cannot retract text
already disclosed; retention and model-provider data handling are separately declared.

Lexical, embedding, graph, temporal and hybrid ranking are replaceable. CrewAI's
[MemoryScope/MemorySlice](../../../../../crewAI/lib/crewai/src/crewai/memory/memory_scope.py) demonstrate scoped
views and runtime rebinding; [memory types/scoring](../../../../../crewAI/lib/crewai/src/crewai/memory/types.py)
combine semantic relevance, recency and importance. Those are useful Runtime mechanisms, not proof
of a security boundary or one correct retrieval strategy. Test native memory fidelity before imposing
ArrokothI's terms on an integrated Crew.

## Working Notes and handoff

Notes are optional local scratch, not required reasoning transcripts. Bound size and lifetime; separate
read enablement from write enablement. Do not persist private internal reasoning merely to fill an
observability schema. Store concise task state/evidence where that suffices for continuity.

Parent/child handoff selects authorized information into an immutable inherited view plus the child's
own writable frame. No implicit child-to-parent note copy occurs on completion. Sequential Stages
and parallel branches default to separate scratch frames; explicit handoff/join selects retained facts.
Important data flows through typed results or application state, not a hidden growing notes stack.
A retained snapshot need not be copied into every model request or Activation transport.

If notes are recovery-critical, the Runtime includes them in its native checkpoint contract; otherwise
losing them is an explicit quality limitation, not loss of Kernel truth. Hermes'
[memory tool](../../../../../hermes-agent/tools/memory_tool.py) distinguishes persistent file writes from a
frozen session-start prompt snapshot. Learn the lifetime distinction; ArrokothI should not require
that particular prompt-cache strategy or adopt those files as asserted policy state.

## Artifacts and files

A cross-boundary reference declares store/namespace, object identity, immutable version or digest when
required, media/schema hint, size bounds, owner/access method and retention responsibility. These are
contract requirements, not a mandatory universal Artifact class. A URL, path or content hash alone
neither grants access nor guarantees availability. Resolve signed access links freshly through an
authorized service; do not persist expiring credential-bearing URLs as the only recovery reference.

Keep local temporary files native. Before a result or action relies on durable content, publish it,
verify availability/integrity and pin its version under [resource lifetime](resources-and-isolation.md).
Check retention before transferring a reference to a child. A copied reference does not transfer
ownership or prolong lifetime automatically. A missing object is unavailable evidence, not an empty
valid artifact. Workspace Git undo is not an Execution checkpoint or remote action rollback.

## Acceptance examples

R2: direct assertion from verified source; inferred claim refused as approval; explicit promotion with
provenance; two writers at revision 17 yield one conflict; hidden-field changes do not alter permitted
model context; branch notes do not leak; typed dataflow requires no memory detour. K3/K5: referenced
object deleted during recovery, access revoked before retrieval, source correction after promotion,
child handoff after parent cleanup and native memory binding missing on restore. Attribution separates
resource-service behavior, Runtime quality, Kernel action admission and physical containment.
