# Future Plan

> **Status: roadmap and open design questions, not canonical semantics.**
>
> This document records unresolved or post-v0.4 questions. Current runtime truth belongs in [`execution-runtime.md`](execution-runtime.md); current composition truth belongs in [`composition.md`](composition.md).

## Open questions

### Controller-local resumption vs `PendingOperation`

Current v0.4 direction deliberately keeps two semantic roles separate:

```text
PendingOperation
  runtime-mediated semantic dependency
  settlement normally produces/delivers an Event

ControllerResumption
  controller-local asynchronous dependency
  settlement makes controller work runnable
  does not by itself enter the semantic Event mailbox
```

Typical `ControllerResumption` use includes a model-provider invocation that is semantically local to an Agent/Workflow controller but slow enough that the current Activation should yield rather than occupy a worker.

This is currently preferred over generalizing `PendingOperation` to every kind of asynchronous suspension because it preserves:

```text
Event ≠ every asynchronous completion
runtime-mediated semantic dependency ≠ controller implementation dependency
```

The implementation may still share lower-level storage, correlation, queues, futures, durability machinery, and scheduler wake-up paths between the two.

Questions to test through implementation:

```text
Does keeping two semantic types materially simplify Event/Effect reasoning?

Does durability become awkward because both need almost identical
settlement/recovery state?

Should there eventually be a more general internal Suspension/WaitingRecord
with typed semantic projections such as PendingOperation and
ControllerResumption?

Can a unified mechanism remain invisible to application semantics without
turning model/local completions into Events?

How are cancellation, deadline, deduplication, crash recovery, and unknown
outcome represented for controller-local provider calls?

How does a resumed model continuation prove that the controller/context
revision it was computed against is still applicable after interleaving?
```

Do not generalize merely for implementation uniformity. Change the semantic model only if real implementations show that the current separation is artificial or prevents correct recovery/composition.

### Interleaving and stale continuations

Single-writer Activations prevent simultaneous mutation but not logical races across suspension points.

```text
A1 computes from controller revision N
A1 suspends
A2 handles another Event and commits revision N+1
A1 result returns
```

Open questions:

```text
controller revision/version binding
re-evaluation vs rejection of stale results
which Agent/Workflow continuations permit interleaving
whether model invocation snapshots bind context/projection/controller revision
how cancellation of obsolete in-flight model calls works
```

### Parallel Workflow branches

Parallel Stages should eventually use structured concurrency rather than concurrent free mutation of Workflow controller state.

Open questions:

```text
branch snapshot semantics
branch-local delta representation
join/reducer API
ordering guarantees
conflict handling
parallel Effects and child calls
cancellation/failure propagation
when a branch should instead become a child Execution
```

The invariant to preserve is that ambiguous concurrent writes do not silently become timing-dependent last-write-wins.

### Shared mutable resources

Parallel Executions and Effects require explicit resource concurrency semantics.

Future APIs may need some combination of:

```text
optimistic versions / preconditions
commutative/reducer operations
transactions
conflict Events/failures
leases / semaphores / permits
fencing tokens
provider-defined conflict semantics
```

Do not impose a universal global mutex. Prefer the least powerful concurrency mechanism that preserves the resource's correctness contract.

### Recursive expansion and deadlock diagnostics

Recursive composition is legal, but implementation still needs to validate practical policies for:

```text
lineage/root-scoped structural spawn budget
spawn depth / active-descendant bounds
restart intensity / retry bounds
wait-for graph diagnostics
deadlock-candidate detection
resource-wait edges
configured timeout/cancellation recovery
```

A Definition cycle is not itself an error, and a wait cycle is not automatically a deadlock.

### Non-blocking work

Broad detached/non-blocking semantics remain intentionally conservative.

Questions include:

```text
which pending work blocks Stage completion
which pending work blocks Agent progression or terminal completion
how late results enter later context
ordering/correlation
cancellation
what happens when an Execution completes with work still in flight
```

### Memory concurrency

Parallel child Executions and Workflow branches will require concrete memory consistency tests:

```text
Structured Memory concurrent writes
optimistic versioning
field-level conflict/merge policy
transactions
provenance-preserving merge
Derived Semantic Memory concurrent extraction/supersession
```

Memory form and memory scope must remain separate from the chosen consistency mechanism.

### Durability backend

After in-memory semantics stabilize, evaluate durable implementations for:

```text
Execution runtime state
mailboxes
PendingOperations
ControllerResumptions
Effect journal / idempotency
wait-for dependencies
restart recovery
```

Existing durable execution systems may implement Arrokoth-owned ports, but must not redefine Execution, Event, Effect, Agent, or Workflow semantics.

### Isolation and hosted profiles

The trusted-local profile should remain simple. Hosted arbitrary-code profiles later need reviewed isolation with:

```text
deny-by-default ambient privilege
filesystem/workspace isolation
network/egress policy
no raw production secrets
CPU/memory/time/process/output limits
controlled Effect bridge
per-principal/tenant isolation
```

The isolation backend is replaceable mechanism, not kernel semantics.

### Principal/policy model

Execution identity is not sufficient as application security identity.

Future hosted/federated systems need to validate how policy context represents:

```text
application actor
user / on-behalf-of principal
tenant / organization
resource owner
task/session context
```

Applications define domain policy; the kernel should expose reusable authority enforcement hooks rather than hard-code one principal ontology.

### Progressive discovery and Active View

The current direction is deterministic authorized narrowing before model projection. Future scale may justify:

```text
lexical/BM25 descriptor search
embedding/hybrid retrieval
progressive discovery operations
cached expansion/contraction
catalog-change invalidation
provider-aware top-N packing
```

Discovery may cover heterogeneous descriptors—Operations, Resources, Agent/Workflow services, Skills, memory interfaces—without collapsing their types or granting authority.

### Memory model details

The dedicated memory design still needs to settle:

```text
Structured Memory provenance links
Derived Semantic Memory provenance and confidence
source observations / episodes
supersession and temporal validity
scope/view inheritance
Working Note handoff
context-selection rules
```

Structured Memory may cite raw observations, Artifacts, other structured state, or Derived Semantic Memory as provenance. Derived Semantic Memory is not a required intermediary for explicit writes and is not automatically authoritative state.

### Interoperability evolution

Continue evaluating MCP, A2A, Agent Skills, HTTP/OpenAPI, UI/message protocols, and future standards through the existing admission rule:

```text
changes kernel runtime truth?
  → consider semantic-kernel evolution

portable cross-protocol concept?
  → Arrokoth-owned intermediate abstraction

implementation mechanism only?
  → port/backend
```

External Task/Message/Agent Card/Skill/protocol objects must not silently replace Arrokoth runtime identities.

### Skills

A future native Skill may package instructions, resources, assets/scripts, requested capabilities, and a root Agent/Workflow Definition.

Keep:

```text
Skill ≠ Execution
allowed/recommended tools ≠ authority grant
```

Instruction-only Skills and composition-backed Skills may be profiles of the same broader package abstraction.

## Evidence before abstraction

Future machinery should be justified with concrete conformance cases and measurements rather than architectural uniformity alone.

Important tests include:

```text
slow model invocation yields worker and later resumes correctly
controller-local resumption survives restart
Event and ControllerResumption remain distinguishable in traces
stale model result after interleaving is detected/handled
parallel Workflow branches merge deterministically
parallel Executions conflict safely on Structured Memory/resource writes
recursive spawn cannot exceed lineage structural budget
wait cycles can be diagnosed without rejecting legal recursion
shared-resource lease survives crash/expiry correctly
```

> **Add runtime machinery only when it makes real applications easier to express, operate, secure, or reason about.**