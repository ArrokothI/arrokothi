# Future Plan

> **Status: unresolved and post-v0.4 work only. Not canonical current semantics.**
>
> Read the canonical documents first: [`mental-model.md`](mental-model.md), [`execution-runtime.md`](execution-runtime.md), [`composition.md`](composition.md), [`authority.md`](authority.md), [`memory.md`](memory.md), [`interoperability.md`](interoperability.md), and [`security-guarantees.md`](security-guarantees.md).
>
> Current implementation/slice decisions belong under [`development/`](development/). The research basis and external-system survey remain in [`architecture-research-dossier.md`](architecture-research-dossier.md).

This file records questions that are deliberately **not frozen** into the current architecture.

---

## 1. Runtime and concurrency

### 1.1 `ControllerResumption` vs a more general suspension record

Current v0.4 semantics keep:

```text
PendingOperation
  runtime-mediated semantic dependency
  settlement normally produces/delivers an Event

ControllerResumption
  controller-local asynchronous dependency
  settlement makes controller work runnable
```

Implementations may share lower-level correlation/storage/scheduler machinery.

Questions to validate:

```text
Does the semantic distinction remain useful in durable implementations?

Should there eventually be one internal Suspension/WaitingRecord
with typed projections such as PendingOperation and ControllerResumption?

Can such unification remain invisible to application semantics
without turning every async completion into an Event?

How should cancellation, deadline, deduplication, crash recovery,
and unknown outcome work for controller-local model/provider calls?
```

Do not generalize only for implementation uniformity.

### 1.2 Interleaving and stale continuations

Single-writer Activations prevent physical data races but not logical races across suspension points.

```text
A1 computes from controller revision N
A1 suspends
A2 handles another Event → revision N+1
A1 result returns
```

Open questions:

```text
controller/context revision binding
re-evaluate vs reject stale model result
which continuations permit interleaving
obsolete in-flight call cancellation
binding model input + operation projection + controller revision
```

### 1.3 Parallel Workflow branches

Parallel Workflow topology should use structured concurrency rather than concurrent free mutation.

Open questions:

```text
branch snapshot semantics
branch-local delta representation
join/reducer API
ordering guarantees
conflict handling
failure/cancellation propagation
parallel branch Working Notes
when branch complexity should become child Execution
```

Invariant to preserve:

> **Ambiguous shared-state writes must not silently become timing-dependent last-write-wins.**

### 1.4 Shared mutable resources

Concrete resource/memory APIs may need:

```text
optimistic versions / preconditions
commutative/reducer updates
transactions
conflict Events/failures
leases / semaphores / permits
fencing tokens
provider-defined conflict semantics
```

Prefer the weakest mechanism that preserves the resource's correctness contract. Do not impose a universal global mutex.

### 1.5 Recursive expansion, supervision, and deadlock diagnostics

Still to validate:

```text
lineage/root-scoped spawn budgets
spawn depth / active-descendant limits
restart intensity / retry budgets
explicit child supervision policies
wait-for graph diagnostics
resource-wait edges
deadlock-candidate detection
configured timeout/cancellation recovery
```

Keep:

```text
Definition cycle ≠ runtime error
wait cycle       ≠ automatic deadlock
```

### 1.6 Broad non-blocking work

Current semantics are intentionally conservative for detached/background work.

Questions:

```text
which work blocks Stage completion
which work blocks Agent progression/terminal completion
how late observations enter later context
ordering/correlation
cancellation
Execution completion with work still in flight
```

---

## 2. Authority and policy evolution

Current authority semantics are canonical in [`authority.md`](authority.md). Future work concerns richer mechanisms and scale.

### 2.1 Grant/evidence representation

Validate whether a concrete grant/evidence record needs first-class:

```text
issuer/delegator
holder/subject
scope
constraints
delegable flag
validity/expiry
provenance
revocation/consumption state
exact payload binding where applicable
receipt/outcome reference
```

Do not freeze a universal token format prematurely.

### 2.2 Policy backend capability

The conceptual policy seam supports:

```text
check
optional filterAllowed
optional enumerateAllowed
```

Evaluate Cedar, OpenFGA, and application-native implementations only after concrete policy workloads exist. Backend entity models must not redefine Arrokoth authority.

### 2.3 Progressive descriptor discovery mechanics

The semantic principle is already canonical: authority filtering precedes discovery/exposure.

Open implementation questions:

```text
BM25 vs embedding vs hybrid ranking
cache/invalidations
lazy schema hydration
per-domain tiering
provider-aware top-N packing
model-visible discover/search operation
search→describe→call without extra model turns
quality/recall/latency/token benchmarks
```

Discovery should remain heterogeneous and typed:

```text
Operation
Resource
Agent/Workflow service
memory interface
Skill
interaction template
```

---

## 3. Memory evolution

The four memory forms and provenance rules are canonical in [`memory.md`](memory.md). Future work is about exact APIs/backends.

### 3.1 Derived Semantic Memory provider contract

Still to settle:

```text
portable claim representation
minimal provenance requirements
confidence/quality metadata
derivation model/version metadata
correction/supersession links
temporal validity / reference-time support
source indexing/materialization
```

Do not require a graph representation in the kernel.

### 3.2 Promotion and trust policy

Need concrete application patterns for:

```text
when inferred claim can become Structured Memory
human vs deterministic verification
source trust classes
multi-source agreement
promotion provenance
revocation/correction of promoted state
```

Derived Semantic Memory remains non-authoritative by default.

### 3.3 Memory scope/view implementation

Validate how application-defined scopes are represented across:

```text
storage namespaces
policy relations
MemoryView resolution
cross-Execution delegation
shared organization/world memory
```

Scope must not become an authorization shortcut.

### 3.4 Memory concurrency

Test:

```text
Structured Memory compare-and-set
field-level conflict/merge
transactional writes
provenance-preserving merge
Derived Memory concurrent extraction/dedup/supersession
Working Note branch handoff/commit
```

### 3.5 Memory backends

Evaluate simple native storage first, then optional adapters such as Mem0/Graphiti or application-specific systems.

A backend must not redefine:

```text
Structured vs Derived epistemic status
memory visibility/authority
Working Note semantics
Event/Effect/runtime semantics
```

---

## 4. Interoperability evolution

Current portable concepts and MCP/A2A/Agent Skills mappings are canonical in [`interoperability.md`](interoperability.md).

Future work includes implementing and testing actual bindings.

### 4.1 MCP

Build import/export vertical slices for:

```text
Tools / Operations
Resources
Prompts/templates
long-running Tasks
elicitation/input requirements
change notifications/subscriptions
```

The goal is semantic round-trip compatibility, not merely wire compatibility.

### 4.2 A2A

Implement client/server adapters when exported Agent services become concrete.

Validate:

```text
Agent Card projection
Task ↔ external async handle
Message/Artifact mapping
input-required/auth-required continuation handling
persistent interaction/context grouping
cancellation/progress
```

Do not replace internal `call/spawn/send/ask` semantics with A2A.

### 4.3 Agent Skills and native Skill packaging

Composition owns the native Skill concept; interoperability owns the Agent Skills profile.

Open packaging questions:

```text
input/default binding format
one root Definition vs richer package roots
instruction-only vs composition-backed manifest
resource/reference packaging
requested authority/resource metadata
lossy export of composition-backed Skills
registry/versioning/distribution
```

### 4.4 Portable schema maturity

Evaluate when JSON Schema 2020-12 becomes the concrete portable service-schema contract rather than only the architectural direction.

Provider-facing schemas may remain constrained projections.

### 4.5 Optional client/projection protocols

Watch/build only when product surfaces require them:

```text
AG-UI
A2UI
MCP Apps
ACP
AsyncAPI
CloudEvents
other UI/message protocols
```

These remain projections, not kernel semantics.

---

## 5. Durability and scaling

After in-memory semantics are well tested, define durable ports/conformance for:

```text
Execution state
controller state
mailbox/Event cursors
PendingOperations
ControllerResumptions
Effect journal/idempotency
wait-for dependencies
structural/runtime budgets
projection snapshots/correlation
restart recovery
```

Candidate implementation families include:

```text
native database-backed runtime
DBOS
Temporal
other durable service/workflow runtimes
```

The selection criterion is Arrokoth semantic conformance, not feature count.

### Distributed Harness

A distributed implementation may later add:

```text
persistent scheduler queues
remote workers
large dormant Execution populations
worker affinity/placement
load/fairness controls
```

but must preserve one logical Harness and the same Execution/Event/Effect model.

---

## 6. Security evolution

Current guarantees/profiles live in [`security-guarantees.md`](security-guarantees.md).

### 6.1 Isolated hostile-code backend

Before claiming arbitrary-code containment, implement and review at least one backend satisfying the advertised profile:

```text
deny-by-default ambient access
scoped filesystem/workspace
network/egress restrictions
no raw production secrets
CPU/memory/time/process/output bounds
controlled Effect bridge
cross-principal isolation
fail-closed behavior
```

Candidate/reference mechanisms may include containers, gVisor, microVMs, WASM/isolate systems, Dify-Sandbox-like services, or managed sandbox providers.

### 6.2 Network/SSRF and filesystem hardening

Concrete hosted implementations still need APIs/policies for:

```text
private/metadata destination blocking
DNS/redirect validation
HTTP proxy/broker
path canonicalization
symlink/traversal protection
mount policy
workspace ownership
runtime-socket protection
```

### 6.3 Multi-tenant principal/control-plane model

Applications need concrete authenticated identities for:

```text
human/user
application/world
tenant/organization
Agent/service principal
resource owner
publisher
```

Validate how authenticated facts enter the authority policy seam without putting product tenancy semantics into the kernel.

### 6.4 Distributed/federated trust

When one logical system crosses administrative boundaries, evaluate:

```text
mTLS/workload identity
SPIFFE/SPIRE-like mechanisms
OAuth/OIDC service flows
signed/MACed delegated capabilities
UCAN-like attenuation proofs
remote worker attestation where useful
```

Do not add per-Execution keypairs merely for local conceptual purity.

### 6.5 Information-flow controls

Future high-security deployments may need:

```text
confidentiality labels
taint/provenance propagation
explicit declassification
message/result policy checks
resource-derived trust labels
```

This is beyond v0.4's explicit view/authority guarantees.

---

## 7. Public Skill/plugin ecosystem

A public distribution ecosystem will eventually need a supply-chain model separate from runtime authority:

```text
publisher identity
content addressing/hashes
signatures
version pinning/lockfiles
requested-authority manifests
sandbox-profile requirements
malware/static scanning
revocation/blocklists
provenance/audit
```

Keep:

```text
package provenance/integrity ≠ Effect authority
```

Recheck licenses/security posture for any reused implementation at the exact version selected.

---

## 8. Provider, telemetry, and backend reuse

Potential implementation reuse identified in research includes:

```text
ModelProvider
  native providers / Vercel AI SDK-like adapter

Policy
  Cedar / OpenFGA / application backend

Derived Semantic Memory
  Mem0 / Graphiti / application backend

Durability
  native DB / DBOS / Temporal / other

Isolation
  container/gVisor/microVM/WASM/managed backend

Telemetry
  OpenTelemetry GenAI projection
```

These are mechanisms behind Arrokoth-owned ports.

No backend should define Agent/Workflow progression, authority, memory epistemic status, Event/Effect meaning, or lifecycle semantics.

---

## 9. Conformance/evidence before abstraction

Future architecture changes should be justified by executable scenarios and measurements.

Important unresolved tests include:

```text
slow model invocation yields and resumes durably
ControllerResumption survives restart
stale model result after interleaving is detected
parallel Workflow branches merge deterministically
parallel Executions conflict safely on shared memory/resource
recursive spawn cannot exceed lineage structural budget
wait/deadlock candidates are diagnosable
lease expiry/fencing prevents stale holder mutation
Derived Memory preserves provenance/supersession
policy reverse enumeration scales Active View construction
progressive discovery improves token/latency without unacceptable recall loss
MCP/A2A round trips preserve authority/lifecycle distinctions
hostile-code profile blocks ambient filesystem/network/secret access
control-plane IDs are not bearer authorization
```

> **Add runtime machinery only when it makes real applications easier to express, operate, secure, or reason about.**

> **Prefer semantic evidence over architectural uniformity.**