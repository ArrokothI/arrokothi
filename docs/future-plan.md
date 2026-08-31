# Future Plan

> **Status: roadmap and open design questions, not canonical semantics.**
>
> Read [`mental-model.md`](mental-model.md), [`composition.md`](composition.md), [`runtime-architecture.md`](runtime-architecture.md), [`security-guarantees.md`](security-guarantees.md), and [`implementation-guide.md`](implementation-guide.md) first.

The immediate goal is to validate the current architecture through implementation rather than add more abstractions.

## 1. What is considered stable enough to build against

The following are the current target invariants:

```text
Execution = independently managed runtime identity

v0.4 Execution kinds:
  Agent
  Workflow

Workflow:
  system-defined semantic topology

Agent:
  model-directed open-ended semantic progression

Interaction:
  Events in
  Effects out

Runtime:
  one logical Harness manages many ExecutionContexts
```

Also preserve:

```text
Definition       ≠ Execution
Event            ≠ Effect
response         ≠ terminal result
authority        ≠ exposure
memory           ≠ context
ownership        ≠ communication
semantic control ≠ operational control
Stage            ≠ Execution
request          ≠ authorization
Execution        ≠ process/sandbox
```

Function calls, LLM inference, and Adapters normally remain local computation inside an enclosing Execution.

A useful decision rule is:

> **Create an Execution boundary only when the unit needs independently meaningful runtime management.**

Signals include independent identity/addressability, lifecycle or waiting, authority/budget, mailbox/Events, cancellation/supervision, durability/recovery, or child ownership. Internal complexity alone is not sufficient.

The security direction is also stable enough to build against:

> **An Execution receives authority, not ambient privilege. Application policy decides what should be allowed; the kernel enforces Arrokoth authority/visibility semantics; hostile-code containment requires an execution-isolation substrate.**

Prompt/model/retrieved/tool content may influence what an Agent requests, but must not grant new authority by itself.

---

## 2. Near-term implementation sequence

The preferred sequence is intentionally incremental.

### 2.1 Execution substrate

Build or normalize:

```text
ExecutionDefinition
AgentDefinition
WorkflowDefinition
ExecutionContext
LifecycleState
Activation
owner/root relationships
in-memory scheduler/store
```

The first conformance target is a long-lived Execution that can:

```text
RUNNING → WAITING
receive Event
WAITING → READY → RUNNING
respond without terminating
```

Terminal results should remain typed/schema-bound at the Execution interface and independent from the Workflow Stage-result experiment.

### 2.2 Event / Effect substrate

Normalize:

```text
Events
EffectRequests
Effect authorization
pending operations
correlation / causation
mailbox delivery
wake-up
```

Initial Effects:

```text
UseCapability
WriteMemory
SpawnExecution
SendMessage
RequestUserInput
```

Test both Effect completion paths early:

```text
fast Effect
  → result observed within current Activation

slow Effect
  → pending operation
  → Execution WAITING
  → Event
  → later Activation
```

The inline/Activation wait budget must remain distinct from the Effect's actual timeout/deadline. Reaching the former should normally yield the Activation rather than cancel the operation.

### 2.3 Workflow controller

Implement:

```text
Function Stage
LLM Stage
Agent Stage
Workflow Stage
predefined transitions
Stage completion barrier
Adapters
text | none Stage result
Stage-local computation environment
```

Do not create child Executions for ordinary function/LLM Stage computation.

Treat Effects as attributed to the enclosing Workflow Execution. The Stage completion barrier tracks only which pending work is required for the current Stage to settle.

Allow local computation over already-exposed/materialized data without manufacturing Effects solely for uniformity. Live external resources should still be accessed through the capability/resource boundary.

### 2.4 Agent controller

Align the Agent executor boundary around:

```text
context compilation
input Adapter
LLM/model-directed decision
output Adapter
Effect requests
result Events
repeated semantic continuation
```

The current primary Agent implementation may remain Strands where useful, but framework-specific semantics must stay behind an explicit Agent executor boundary.

Test the security invariant that prompt-injected or malicious retrieved/tool content may produce a bad request but cannot alter the Execution's authority or bypass the Effect gateway.

### 2.5 Recursive composition

Implement:

```text
spawn
call
Agent Stage
Workflow Stage
child authority/budget derivation
child memory/context visibility derivation
child result Events
cancellation/supervision
```

### 2.6 Memory

Implement/test:

```text
Structured Memory views
Artifacts / Files
Working Note frames
Working Note visibility/delegation filtering
provenance
Stage note handoff policy
context compilation
```

The key rule is:

```text
note ancestry ≠ note visibility
```

A child may receive selected parent scratch context, but ownership ancestry alone must not expose all parent notes.

### 2.7 Messaging and human interaction

Implement:

```text
send
ask
peer Message Events
RequestUserInput
mechanical Effect confirmation
authorization evidence
```

### 2.8 Trusted-local security profile

Before building hostile-code infrastructure, make the baseline security claim explicit:

```text
trusted application process
  ↓
Arrokoth runtime
  enforces authority / memory / messaging / Effect semantics
```

This profile should not pretend to contain arbitrary code written by the owner of the host process.

Add enough structure now that a stronger runner can be substituted later:

```text
ExecutionEnvironment / Sandbox port
explicit resource/capability handles
no assumption that BoundResource = raw credential
security-profile diagnostics/metadata
```

The v0.4 Studio should remain the simplest profile: one process, one logical Harness, multiple in-process Executions.

### 2.9 Durability

After in-memory semantics are stable, add/reconcile:

```text
durable ExecutionContext
mailboxes
pending operations
Effect journal/idempotency
restart recovery
```

Avoid coupling the semantic refactor to distributed infrastructure too early.

### 2.10 Hosted declarative profile

Before accepting arbitrary executable uploads, a useful intermediate platform may allow users to create stored Agent/Workflow definitions from prompts, graphs, resource requests, and configuration while executable controllers/Stages remain platform-owned.

```text
client
  ↓ authenticated API
untrusted definition/configuration
  ↓
trusted Arrokoth runtime implementation
  ↓
Harness / Effects / authority
```

This profile should establish application/tenant authentication and resource ownership without requiring every Execution to run in a container.

### 2.11 First isolated hosted profile

Only after the kernel semantics are working should we claim hostile uploaded-code containment.

Implement one reviewed isolation backend with at least:

```text
deny-by-default ambient privilege
scoped filesystem/workspace
scoped or disabled network
no raw production secrets in sandbox
CPU/memory/time/process/output limits
controlled Effect/capability bridge
per-principal isolation appropriate to the threat model
```

Do not build all low-level isolation machinery from scratch if an existing backend can satisfy the contract behind an Arrokoth-owned interface.

---

## 3. Required conformance programs

Before declaring the model stable, implement and evaluate at least these programs:

1. **Simple RAG Workflow** — `LLM Stage → retrieval Effect → next LLM Stage`.
2. **Local-corpus RAG Stage** — query/rerank an already-exposed read-only corpus without manufacturing an external Effect.
3. **Bounded multi-LLM Stage** — `LLM → retrieval → LLM` remains a Workflow Stage because continuation is predefined.
4. **Agentic research loop** — the model repeatedly chooses retrieve/tool/inspect/stop.
5. **Workflow containing child Agent** — child is an Agent Execution hidden behind one Agent Stage; Stage waits for required completion.
6. **Parent Agent spawning multiple children** — tests ownership, authority, typed results, explicitly delegated Working Note visibility, and parallel pending work.
7. **Long-lived conversational Agent** — response does not imply terminal completion; Agent can wait and wake.
8. **Fast/slow Effect pair** — same Effect completes inline under low latency and yields to `WAITING` under higher latency without changing its semantic meaning or deadline.
9. **Peer Agents** — messaging is independent from ownership and does not expose memory/cancellation rights.
10. **User-input + confirmation case** — semantic free-form user input and exact mechanical confirmation remain distinct.
11. **Memory visibility/confidentiality case** — explicit Structured Memory survives; a child sees only delegated parent notes; popped child Working Notes do not silently become parent memory.
12. **Prompt-injected Agent** — untrusted retrieved/tool/message content may cause an unauthorized request, but the Harness still rejects it and authority remains unchanged.
13. **Hostile Stage case** — under an isolated profile, direct ambient filesystem/network/secret/peer-state access fails while the same authorized action succeeds through an Effect.
14. **Hosted control-plane case** — knowledge of another user's Execution/session identifier does not authorize inspection, messaging, cancellation, or reconfiguration.
15. **Minimal runtime profile** — the same semantics run in-process without durable/distributed/sandbox machinery for trusted applications.

Architecture changes should be justified against these scenarios rather than aesthetics alone.

---

## 4. Open design questions

### 4.1 Non-blocking Effects

Current semantics are strongest for blocking dependencies:

```text
Effect → wait → Event → continue
```

Future Agents may continue while Effects remain pending. We need to test:

```text
how results enter future context
which pending work blocks Agent step completion
which pending work blocks Stage completion
cancellation and timeout behavior
ordering/correlation
what happens when Agent decides to finish with work still pending
```

Do not expose a broad non-blocking API until these semantics are clear.

### 4.2 `fork()`

Working Notes stack ancestry was partly chosen because it offers a natural path to fork:

```text
current visible note view
        ↓ fork
branch A local frame
branch B local frame
```

Fork inheritance must remain subject to the new branch's authority and memory/context visibility policy. Open questions:

```text
snapshot vs reference vs copy-on-write
visibility/delegation across branches
Structured Memory behavior across branches
authority/budget inheritance
branch merge semantics
cancellation
trace representation
```

`spawn` remains the canonical primitive until fork proves necessary.

### 4.3 Explicit Working Note commit

v0.4 does not automatically merge child notes into parent notes.

Current recommendation:

```text
important information
  → terminal result
  → Structured Memory field
  → Artifact/File
  → explicit message
```

A future `commit note` mechanism may be useful, but it should be tested against the risk of making Working Notes a second implicit shared-memory system.

### 4.4 Stage result type

The current Workflow hypothesis is:

```text
StageResult = text | none
```

This keeps graph edges simple and pushes durable structure into explicit memory/resources.

This constraint applies only to Workflow Stage transitions. It does **not** constrain Execution terminal results.

Test whether real applications need richer typed Stage results. If so, prefer a small explicit extension rather than an unconstrained object graph.

### 4.5 More Adapter attachment points

v0.4 focuses on:

```text
Stage input/output
Agent-loop model input/output
```

Possible future boundaries:

```text
Event Adapter
memory-read Adapter
memory-write Adapter
Effect Adapter
```

Only add these after concrete use cases demonstrate value.

### 4.6 Adapter permissions

Current v0.4 policy is deliberately narrow:

```text
read selected memory
no Effects
no writes
no spawn/message
```

This should be validated with safety, translation, normalization, and structured-output examples.

### 4.7 Dynamic Workflow topology

Model-driven graph mutation is out of v0.4.

Prefer:

```text
model changes data
predefined graph reacts to data
```

Revisit only if fixed topology becomes a demonstrated limitation rather than an aesthetic constraint.

### 4.8 Workflow Stage messaging

`SendMessage` is a shared Execution-level Effect, so there is no architectural rule that peer messaging belongs only to Agents. The open question is narrower: whether v0.4 should expose convenient Stage-level APIs for arbitrary peer messaging from Function/LLM Stages, or keep that surface conservative until real Workflow programs require it.

Any such API must preserve the fixed semantics:

```text
message permission ≠ ownership
message permission ≠ cancellation
message permission ≠ memory access
```

### 4.9 Execution kinds beyond Agent/Workflow

The mental model defines Execution by independent runtime identity, not permanently by a closed two-kind ontology.

Possible future examples:

```text
TrainingJob
BatchInference
RemoteBuild
Simulation
```

Use the same Execution-boundary test: add such a kind only when the unit needs independently meaningful identity/lifecycle/authority/state and cannot be naturally represented as an Agent or Workflow.

### 4.10 `ExecutionDefinition` naming

`ExecutionDefinition` may be clearer than `ExecutableDefinition` now that ordinary functions/LLM calls are not members of the top-level runtime union.

Treat this as a naming/API migration to validate after the semantic boundary is implemented.

### 4.11 Information-flow policy

v0.4 requires explicit child memory/context visibility, but does not attempt a full information-flow security system.

Future work may test whether applications need:

```text
visibility labels on note frames
provenance-aware delegation
resource-derived confidentiality labels
taint propagation
policy checks on explicit result/message handoff
```

Do not build this machinery speculatively. The immediate requirement is only that Working Note ancestry cannot silently bypass an intended child visibility boundary.

### 4.12 Activation wait budget vs Effect deadline

The current implementation hypothesis is:

```text
Effect dispatched
  ↓
wait briefly inside current Activation
  ↓
fast result → continue same Activation
slow result → persist pending + WAITING
```

Open questions:

```text
fixed vs adaptive inline wait budget
per-capability vs global budget
scheduler load/fairness interaction
whether result delivery inside the same Activation uses the same internal Event envelope
how to measure latency saved vs occupied-worker cost
behavior when the Effect completes concurrently with the yield transition
```

The invariant to preserve is:

```text
Activation wait budget ≠ Effect deadline
```

Crossing the first should normally change scheduling state, not operation semantics.

### 4.13 Resource exposure modes

A `BoundResource` may be exposed in different forms:

```text
materialized read-only snapshot/index
mediated capability handle
isolated writable workspace
future transactional/shared resource view
```

We need concrete APIs for expressing exposure mode without confusing resource authority with raw access.

Questions include:

```text
when a local materialized view is safe enough for direct Stage computation
who refreshes/snapshots local views
whether local views carry provenance/version metadata
how writes are represented
how a hosted sandbox receives a handle without receiving the backing credential
```

### 4.14 Uploaded-code validation and AI rewriting

A future hosted UI may allow users to upload Function Stage code.

Useful developer-experience layers may include:

```text
syntax/type checks
restricted import analysis
AST policy linting
clear violation diagnostics
AI suggestions that rewrite direct external access into Effect requests
```

Open questions:

```text
supported languages/runtime subset
package/dependency policy
deterministic validation vs probabilistic AI suggestions
how rewritten code is reviewed/accepted
how to explain runtime-denied operations
whether uploaded code is signed/versioned/reproducible
```

None of these should become the hostile-code security boundary. Isolation must remain effective even when validation misses a path.

### 4.15 Isolation backend contract

We need to test the smallest Arrokoth-owned port that can support multiple existing isolation mechanisms without inheriting their semantics.

Potential implementations/references include:

```text
OpenClaw sandbox mechanisms
Hermes execution environments / programmatic tool RPC
Dify Sandbox
container or remote worker implemented directly
managed sandbox providers
VM/microVM/WASM/isolate backends where appropriate
```

Questions:

```text
process execution API
filesystem/workspace API
network policy
resource limits
Effect/capability bridge
secret injection policy
sandbox reuse vs one-shot environments
per-Execution vs per-Activation vs pooled sandbox scope
crash/recovery semantics
observability
```

Do not make Docker, Hermes, OpenClaw, Dify, or any managed provider part of kernel semantics. Reuse mechanisms behind Arrokoth interfaces after threat-model, security, maintenance, and license review.

### 4.16 Multi-tenant principal model

A public Agent/RPG/social ecosystem introduces principals beyond parent/child ancestry:

```text
human/user account
application/world
tenant/organization
Agent/Workflow Execution
plugin/skill publisher
resource owner
```

The kernel currently has Execution authority and owner/root relationships, not a complete tenant identity system.

Open questions:

```text
where tenant/user identity attaches to Execution creation
who may grant authority to whom
cross-tenant messaging defaults
resource ownership and sharing
revocation
quota/budget accounting
moderation/admin authority
whether principals belong in kernel contracts or an application policy layer
```

The likely direction is that applications define principal/domain policy while the kernel provides reusable enforcement hooks and Execution-scoped authority.

### 4.17 Network egress and SSRF policy

A sandbox and a network policy solve different problems. A sandboxed process with unrestricted egress may still reach internal services, metadata endpoints, localhost-bound control planes, or user-supplied URLs that should not be reachable.

Future hosted profiles should evaluate:

```text
deny-by-default egress vs allowlists
HTTP proxy/broker vs raw socket access
DNS rebinding/private-IP handling
redirect validation
cloud metadata endpoints
localhost/internal service access
per-capability destination policy
request size/time/rate limits
```

Dify's separation of code sandboxing and an SSRF-proxy layer is a useful reference pattern. This is not required for the v0.4 trusted-local Studio, but it is critical before claiming safe arbitrary URL/network access in a hostile hosted deployment.

### 4.18 Control-plane authentication vs runtime identifiers

Execution authority is not a replacement for authenticating the caller of an Internet-facing API.

A future hosted service needs an explicit answer for:

```text
who may create this Execution?
who may inspect it?
who may send it a message?
who may cancel/reconfigure it?
which tenant/resource owner pays for it?
```

Do not treat `ExecutionId`, session ids, mailbox refs, trace ids, or other routing identifiers as bearer authorization unless intentionally designed as protected capability tokens. OpenClaw's explicit separation between session/routing identifiers and authorization is a useful warning here.

### 4.19 Filesystem/path/mount safety

Once isolated environments support host/project mounts, workspace persistence, or user-supplied paths, path handling itself becomes security-sensitive.

Future work should test:

```text
canonical path resolution
symlink escape
path traversal
read-only vs read-write mounts
protected host paths
container runtime sockets
workspace ownership
cross-Execution workspace isolation
mount inheritance into children
```

OpenClaw's sandbox configuration validates dangerous bind mounts and canonicalized paths; Hermes also applies path/file-write restrictions. These are useful implementation references, but v0.4 only needs to avoid baking raw-path assumptions into BoundResource semantics.

### 4.20 Plugin/skill supply chain

Runtime isolation does not answer whether third-party code/package contents are authentic or trustworthy before execution.

Future public distribution may need:

```text
publisher identity
package signatures
checksums/content addressing
version pinning
reproducible manifests
requested-authority declarations
security/profile requirements
malware/static scanning
revocation/blocklists
provenance and audit
```

Dify's plugin signature verification is a useful reference. This is future ecosystem work rather than a blocker for the v0.4 kernel, where Skills remain separate from ExecutionDefinition and executable code is trusted by the local developer.

### 4.21 Security audit and configuration diagnostics

Misconfiguration can destroy otherwise-correct security boundaries. Future hosted tooling should make dangerous states visible, for example:

```text
hostile code running in trusted-local profile
raw credentials injected into sandbox env
unrestricted network enabled
sensitive writable host mount
sandbox backend disabled/fallback occurred
resource limits absent
cross-tenant messaging broadly enabled
```

A future `security audit`/diagnostics surface similar in spirit to OpenClaw's configuration/security checks could report the effective deployment profile and why a stronger guarantee is or is not active.

### 4.22 Cryptographic identity, integrity, and distributed trust

Cryptography should appear when trust crosses a physical or administrative boundary, not merely because an Execution exists.

For the v0.4 trusted single-process Studio, signing every Event/Effect or assigning a public/private key pair to every Execution would add complexity without creating a meaningful containment boundary. The Harness already acts as the trust anchor for runtime identity and authority.

Keep these concepts separate:

```text
authority
  → may this Execution perform the operation?

authentication
  → who is making the request?

cryptographic integrity
  → was this content changed?

signature / MAC
  → who produced or approved this content,
    and was it changed?
```

Useful future applications include:

```text
content hashes
  → exact-payload mechanical confirmation
  → Definition / Artifact / package fingerprints
  → sandbox image/version identity
  → idempotency/audit fingerprints

hosted control-plane authentication
  → API key / OAuth / session / workload identity
  → tenant/user authorization remains separate

Harness ↔ remote worker communication
  → TLS / mTLS / workload identity
  → authenticated encrypted channels

resource access
  → keep production secrets in trusted adapters/secret stores
  → give Executions capability/resource handles rather than raw credentials

public Agent/Skill ecosystem
  → publisher signatures
  → package provenance
  → signed manifests

federated Agent platforms
  → cross-platform Agent/service identity
  → signed messages or attestations where trust is not shared

distributed capability enforcement
  → short-lived signed/MACed capability tokens
  → resource gateway verifies delegated scope without redefining authority semantics
```

A cryptographic hash alone must never be confused with authentication or authorization: an attacker who can modify data can usually compute a new hash as well.

Per-Execution keypairs should not be a default assumption. They introduce lifecycle, storage, rotation, revocation, recovery, and compromise questions and are unnecessary while the Harness remains the trusted runtime mediator.

The invariant to preserve is:

> **Cryptographic identity and authorization are transport/enforcement mechanisms; they must not redefine Arrokoth's semantic authority model. A valid signature can prove who sent a request, but does not imply that the sender is authorized to perform the requested Effect.**

---

## 5. Security evolution: v0.4 vs future

The security roadmap should remain progressive rather than blocking the semantic kernel on a full multi-tenant sandbox platform.

```text
v0.4 / first implementation
───────────────────────────
trusted-local Studio/profile is explicit
one logical Harness may run many Executions in one process
Harness authorizes Effects
child authority narrows correctly
memory/context views are explicit
peer messaging does not grant memory/cancellation
prompt/tool/retrieved content cannot grant authority
BoundResource does not imply raw credentials
ExecutionEnvironment/Sandbox boundary remains replaceable
static checks are treated as diagnostics, not containment
no unnecessary per-Execution crypto protocol

nearer hosted declarative profile
────────────────────────────────
authenticated API/control plane
untrusted prompts/graphs/configuration
platform-owned executable controllers/Stages
tenant/resource ownership rules
Execution/session identifiers are not implicit bearer auth
standard service/API authentication rather than custom crypto

later hosted arbitrary-code profile
─────────────────────────────────
one or more reviewed isolation backends
hostile uploaded Stage/plugin code
no ambient credentials
network/filesystem/process isolation
resource quotas
controlled Effect bridge
network egress/SSRF policy
filesystem/mount hardening
security-profile conformance suite
per-principal/tenant policies
remote-worker authenticated transport where distributed

possible advanced ecosystem future
──────────────────────────────────
information-flow labels / taint
provenance-aware declassification
cross-tenant policy language
fine-grained revocation
sandbox attestation
plugin/Skill signing and publisher identity
content-addressed/signed packages
federated Agent identity
short-lived cryptographic capability tokens
supply-chain scanning/revocation
security audit/diagnostics
```

The first implementation should make the later hosted profiles possible without forcing every local developer to pay their infrastructure cost.

---

## 6. Authority and confirmation research

### Semantic authorization evidence

An Effect may reference evidence such as:

```text
user Event
Structured Memory preference
application policy fact
```

The Harness decides whether this is sufficient.

Potential policy modes:

```text
none
semantic
mechanical
```

For consequential actions, exact-payload mechanical confirmation remains the least ambiguous baseline.

### Concurrency and Structured Memory

Once parallel child Executions become common, test:

```text
concurrent writes
optimistic versioning
field-level conflict policy
transactions
provenance-preserving merge
```

Do not solve distributed consistency before actual concurrency examples require it.

---

## 7. Scaling after semantics stabilize

Later work may include:

```text
persistent distributed scheduler
remote workers
large dormant Agent populations
capability/resource discovery
Active View retrieval
large knowledge collections
heterogeneous models/executors
MCP and additional tool transports
remote sandbox/computer use
OpenTelemetry/exporters
production databases/brokers
multi-tenant policy/accounting
workload identity / authenticated worker transport
```

The requirement is that none of these change the application mental model.

```text
logical Harness
  ├── worker A
  ├── worker B
  └── worker C
```

must still behave like the same Harness/Execution/Event/Effect system.

---

## 8. Skills

Skills remain deliberately separate from ExecutionDefinition for now.

A future Skill may package:

```text
instructions/prompts
resources/references
scripts/assets
recommended capabilities
root Agent/Workflow Definition
```

A Skill should not become another controller or alternate execution substrate.

For public Skill/Agent ecosystems, packaging may later need security metadata such as requested authority, resource requirements, sandbox profile, provenance/signatures, or publisher identity. Keep those questions separate from the core semantic meaning of Skill until real distribution use cases are tested.

---

## 9. Evidence before abstraction

Architecture work should be evaluated with:

```text
conformance tests
failure/recovery tests
latency/cost measurements
Agent task quality
Workflow correctness
authority isolation
memory provenance
messaging isolation
context selection quality
retrieval quality
sandbox escape/containment tests
resource-limit tests
denied-Effect mutation tests
control-plane authorization tests
network/SSRF tests for hosted profiles
filesystem/mount escape tests for hosted profiles
signature/provenance verification tests when ecosystem signing is introduced
remote-worker identity/transport tests when the Harness becomes distributed
```

For the Effect inline-wait strategy, explicitly measure:

```text
end-to-end latency
worker occupancy
percentage of Effects completing inline
scheduler churn
WAITING/resume overhead
race/failure behavior near the yield threshold
```

For any advertised hosted isolation backend, rerun the same security conformance suite rather than assuming that backend choice alone provides the guarantee.

A new kernel abstraction should normally require at least one concrete application where existing primitives are awkward or semantically wrong.

> **Add runtime machinery only when it makes real applications easier to express, operate, secure, or reason about.**
