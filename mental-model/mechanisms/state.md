# Shared state, inferred memory and handoff

[Information roles](../concepts/state.md) have different owners: Runtime continuation,
Kernel History, asserted application state, inferred claims, scratch notes and artifacts.
This page specifies optional Runtime/service behavior, not a Kernel memory product.

**Status:** Optional Runtime and service design, R2. Its authority, recovery and retention
limits are required at K2/K3/K5. This is target specification, not shipped behavior.

## State service contract

A supported operation declares schema/version, readable/writable fields, owner,
revision/preconditions, exact update semantics and result certainty. Reads and writes
have separate permissions. Use Effects when Kernel mediation is claimed; a trusted
native read can stay native with its access owner declared. Reads are not categorically
excluded from Effects.

For snapshot read plus compare-and-set, “write if revision 17” either atomically writes
value/provenance and a new revision or conflicts without mutation. Reread/recompute
or fail; no implicit last-write-wins, merge or renewed consent. Changed payload after
conflict resolution is a new action. Owning database transactions protect multi-field
invariants; independent Effects do not create multi-resource transactions.

One global view revision may reveal hidden-field changes. Keep internal preconditions
out of field-limited model context or use view/field-specific versions and trusted
internal bindings. A token being opaque does not make its changes nondisclosing.
Use field-level preconditions, commutative updates or leases only where the service
invariant permits. Kernel progress ownership does not serialize other Executions'
shared-state writes. Never keep a Kernel mutex during a human wait.

## Claims, promotion and correction

A useful optional inferred claim records identity, statement, source/version references,
derivation method/version and observation/derivation times. Domain confidence, valid
time, contradiction and supersession links may help; there is no universal claim graph
or Kernel confidence meaning.

```text
verified source → explicit application assertion
documents → inferred claim → optional validated promotion → assertion
corrected source → attributable new claim, with earlier claim still explainable
```

There is no required raw → derived → structured pipeline. A deterministic Workflow
can assert a verified value directly. Promotion requires application validation,
authority and provenance; an extracted “user approves payments” cannot grant permission.
Source references resolve under access policy. Even asserted state becomes authority
evidence only under a trusted policy contract.

Distinguish observation time, derivation time and the time described by a claim.
“Taipei in 2025” and “New York in 2026” may both be true. Prefer attributable correction
or supersession when useful; retrieval must not erase contradictions accidentally.
Flag affected promoted state for application review, without automatic rollback of
accepted actions/consent. Privacy deletion may remove payload while retaining permitted
provenance and explicit unavailable-source status.

## Views and retrieval

Memory form and scope are independent: organization assertions, user artifacts and
Execution-local notes are all possible. Scope labels, common folders and ancestry
do not authorize views. Authorize retrieval and query disclosure before invoking
remote embedding/ranking providers. Filter returned content and provenance metadata;
counts, snippets and ranking influence must respect any non-disclosure claim.

Cached indexes need freshness/access contracts; final reads recheck permission.
Revocation cannot retract text already disclosed. Lexical, vector, graph and temporal
ranking are replaceable Runtime choices. Native scoped retrieval alone is not proof
of security; test its actual access behavior and fidelity.

## Notes and handoff

Notes are optional bounded scratch, with separate read/write enablement. Store concise
task state/evidence rather than requiring private internal reasoning. Child handoff
selects authorized immutable inherited information plus a separate writable frame.
No implicit child-to-parent note copy occurs. Sequential Stages and parallel branches
default to separate scratch frames; handoff/join explicitly selects retained facts.
Snapshots need not be copied into every model request or Activation.

If notes are recovery-critical, include them in the native checkpoint contract.
Otherwise losing them is a declared quality limitation, not loss of Kernel truth.

## Artifacts and files

Use the [artifact-reference contract](../concepts/state.md#artifact-reference), with
immutable version/digest where an action or result relies on exact content. Publish,
verify and pin durable content before use. Resolve signed links through an authorized
service; expiring credential-bearing URLs cannot be the only recovery reference.

A copied reference neither transfers ownership nor extends lifetime. Check child access
and retention before handoff. Local temporary files can stay native. Missing objects
are unavailable evidence, not empty valid artifacts. Git workspace undo is neither
a full Execution checkpoint nor remote-action rollback. [Resources](resources.md)
owns deletion and surviving access.
