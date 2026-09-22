# Shared state, inferred memory and handoff

[Information roles](../concepts/state.md) have different owners: Runtime continuation, [Execution History](../concepts/state.md#execution-history), asserted application state, inferred claims, scratch notes and artifacts. This page specifies optional Runtime/service behavior, not a Kernel memory product.

**Status:** Optional Runtime and service design, R2. Its authority, recovery and retention limits are required at K2/K3/K5. This is target specification, not shipped behavior.

"Memory" is four different things with four different owners, and most of the trouble comes from a design that treats them as one store. **Asserted state** is what an application decided is true and stands behind. An **inferred claim** is what something concluded from a document, which may be wrong or stale. **Notes** are a Runtime's private scratch, valuable but expendable. **Artifacts** are content held elsewhere and referenced by identity. The sections follow that order, and each one's hardest question is the same: what has to be true before information from it may be trusted, handed to a child, or used to justify an action.

## State service contract

A supported [operation](../concepts/actions.md#operation) declares schema/version, readable/writable fields, owner, [revision](../concepts/identity.md#revision)/preconditions, exact update semantics and result certainty. Reads and writes have separate permissions. Use [Effects](../concepts/actions.md#effect) when Kernel [mediation](../concepts/actions.md#exposure-and-mediation) is claimed; a trusted native read can stay native with its access owner declared. Reads are not categorically excluded from Effects.

For snapshot read plus compare-and-set, “write if revision 17” either atomically writes value/provenance and a new revision or conflicts without mutation. Reread/recompute or fail; no implicit last-write-wins, merge or renewed [consent](authority.md#exact-action-consent). A conflict means the value changed under an assumption somebody made, and the only safe general answer is to make the assumption again rather than to guess which writer meant more. Changed payload after conflict resolution is a new action. Owning database transactions protect multi-field invariants; independent Effects do not create multi-resource transactions.

One global view revision may reveal hidden-field changes. Keep internal preconditions out of field-limited model context or use view/field-specific versions and trusted internal bindings. A token being opaque does not make its changes nondisclosing. Use field-level preconditions, commutative updates or leases only where the service invariant permits. Kernel progress ownership does not serialize other Executions' shared-state writes. Never keep a Kernel mutex during a human wait.

## Claims, promotion and correction

An inferred claim and an asserted value can look identical — both are structured, both have a source, both read as facts. The difference is that somebody accepted responsibility for one of them. Promotion is that act, and it is deliberately not automatic.

A useful optional [inferred claim](../concepts/state.md#derived-semantic-memory) records identity, statement, source/version references, derivation method/version and observation/derivation times. Domain confidence, valid time, contradiction and supersession links may help; there is no universal claim graph or Kernel confidence meaning.

```text
verified source → explicit application assertion
documents → inferred claim → optional validated promotion → assertion
corrected source → attributable new claim, with earlier claim still explainable
```

There is no required raw → derived → structured pipeline. A deterministic Workflow can assert a verified value directly. Promotion requires application validation, [authority](authority.md) and provenance; an extracted “user approves payments” cannot grant permission: a sentence found in a document is evidence that the document says so, never evidence that it is true or that anyone agreed to it. Source references resolve under access policy. Even [asserted state](../concepts/state.md#structured-state) becomes authority evidence only under a trusted policy contract.

Distinguish observation time, derivation time and the time described by a claim. “Taipei in 2025” and “New York in 2026” may both be true. Prefer attributable correction or supersession when useful; retrieval must not erase contradictions accidentally. Flag affected promoted state for application review, without automatic rollback of accepted actions/consent. Privacy deletion may remove payload while retaining permitted provenance and explicit unavailable-source status.

## Views and retrieval

Retrieval decides what a model gets to see, which makes it an access-control boundary wearing the costume of a search feature. The rules here exist because a ranking function has no idea who is asking.

Memory form and scope are independent: organization assertions, user artifacts and Execution-local [notes](../concepts/state.md#working-notes) are all possible. Scope labels, common folders and ancestry do not authorize views. Authorize retrieval and query disclosure before invoking remote embedding/ranking providers. Filter returned content and provenance metadata; counts, snippets and ranking influence must respect any non-disclosure claim.

Cached indexes need freshness/access contracts; final reads recheck permission. Revocation cannot retract text already disclosed: access control decides what enters a request, and nothing decides what leaves a provider that already received it. Lexical, vector, graph and temporal ranking are replaceable Runtime choices. Native scoped retrieval alone is not proof of security; test its actual access behavior and fidelity.

## Notes and handoff

Notes are the one information role where losing everything is acceptable — as long as that was decided in advance rather than discovered during recovery.

Notes are optional bounded scratch, with separate read/write enablement. Store concise task state/evidence rather than requiring private internal reasoning. [Child](../concepts/operations.md#child-and-ownership) handoff selects authorized immutable inherited information plus a separate writable frame. No implicit child-to-parent note copy occurs. Sequential Stages and parallel branches default to separate scratch frames; handoff/join explicitly selects retained facts. Snapshots need not be copied into every model request or Activation.

If notes are [recovery](recovery.md)-critical, include them in the native [checkpoint](../concepts/state.md#checkpoint-and-locator) contract. Otherwise losing them is a declared quality limitation, not loss of Kernel truth.

## Artifacts and files

An artifact reference crosses the protocol; the bytes do not. Everything below follows from that: the reference has to carry enough to find the exact content again, and holding one grants neither access nor a guarantee that it still exists.

Use the [artifact-reference contract](../concepts/state.md#artifact-reference), with immutable version/digest where an action or result relies on exact content. Publish, verify and [pin](../concepts/state.md#retention-pin-and-tombstone) durable content before use. Resolve signed links through an authorized service; expiring credential-bearing URLs cannot be the only recovery reference.

A copied reference neither transfers ownership nor extends lifetime. Check child access and retention before handoff. Local temporary files can stay native. Missing objects are unavailable evidence, not empty valid artifacts. Git workspace undo is neither a full Execution checkpoint nor remote-action rollback. [Resources](resources.md) owns deletion and surviving access.
