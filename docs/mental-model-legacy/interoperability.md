# Interoperability Model

> **Status: canonical interoperability semantics for ArrokothI 0.8.x.**
>
> Read [`mental-model.md`](mental-model.md) first. This document owns the portable service/interface layer and the mappings between ArrokothI semantics and external protocols such as MCP, A2A, Agent Skills, HTTP/OpenAPI, SDKs, and future standards.
>
> Agent/Workflow/Skill composition belongs in [`composition.md`](composition.md). Runtime Event/Effect/lifecycle/PendingOperation/ControllerResumption semantics belong in [`execution-runtime.md`](execution-runtime.md). Authority/Active View/model projection belongs in [`authority.md`](authority.md). Memory/context/provenance belongs in [`memory.md`](memory.md). Protocol/control-plane/trust/containment guarantees belong in [`security-guarantees.md`](security-guarantees.md). Unresolved binding/schema/protocol work belongs in [`future-plan.md`](future-plan.md).

## 1. Kernel semantics and interoperability semantics are separate but mappable

ArrokothI uses three layers:

```text
1. Kernel Semantic Interface
   Execution / Event / Effect / authority / memory / lifecycle

2. Portable Interoperability Interface
   Operation / Resource / service / Skill / template /
   async handle / input requirement / change signal

3. Protocol/API Bindings
   MCP / A2A / Agent Skills / HTTP+OpenAPI /
   local SDK / generated functions / future standards
```

The central rule is:

> **Kernel semantics and interoperability semantics are separate but intentionally mappable.**

This prevents two opposite mistakes:

```text
wire protocol object becomes kernel truth
```

or:

```text
same semantic service is redefined separately for
model tools, MCP, HTTP, SDKs, Studio, and Agent-to-Agent APIs
```

The portable layer is ArrokothI-owned. External standards bind to it; they do not define it.

---

## 2. Mapping is not identity

Several concepts are related without being equivalent:

```text
Effect                ≠ portable Operation
Event                 ≠ protocol notification
Execution             ≠ external task/job
Capability            ≠ MCP Tool
bound resource        ≠ MCP Resource
Definition            ≠ A2A Agent Card
SendMessage           ≠ A2A Message
Skill                 ≠ Agent Skills directory
RequestUserInput      ≠ one protocol's elicitation wire shape
```

Useful mappings still exist:

```text
Capability operation        ↔ portable Operation ↔ MCP Tool / HTTP operation
exposed information         ↔ portable Resource  ↔ MCP Resource
interaction template        ↔ portable template  ↔ MCP Prompt
exported Agent/Workflow     ↔ portable service   ↔ A2A Agent Card / API service
long-running external work  ↔ async handle       ↔ MCP/A2A task/job representation
input requirement           ↔ protocol elicitation / input-required state
change signal               ↔ notification/subscription mechanism
Skill instruction profile   ↔ Agent Skills package
```

A binding must preserve the stronger ArrokothI semantics instead of flattening them into protocol terminology.

---

## 3. Portable Operation

A **portable Operation** describes an invocable semantic action independent of one transport or model provider.

Typical metadata may include:

```text
stable reference
name / title
description
input schema
optional output schema
consequentiality/idempotency metadata
resource/interface requirements
tags/groups/version metadata when useful
```

An Operation descriptor does not carry:

```text
caller authorization
active exposure decision
credentials/secrets
concrete backend client
current tenant/user identity
runtime settlement authority
```

Those belong to authority/runtime/application layers.

One portable Operation may resolve to:

```text
UseCapability
WriteMemory
SpawnExecution
SendMessage
RequestUserInput
```

or, when genuinely local, to ordinary computation with no Effect.

Example:

```text
portable Operation:
  github.create_issue
      ↓ bound invocation
UseCapability {
  capability: "github",
  operation: "create_issue",
  input: ...
}
```

The descriptor explains the interface. The Effect records the concrete requested runtime action. Concrete Effect authorization belongs to [`authority.md`](authority.md), and dispatch/settlement belongs to [`execution-runtime.md`](execution-runtime.md).

---

## 4. Portable Resource

A **portable Resource** describes information/state addressable through a service interface.

Useful metadata may include:

```text
stable logical reference / URI-like identity
name / title
description
media/content type
schema where applicable
version/provenance metadata
parameterized/template form when useful
change-observation capability
```

Resource description is not Resource Authority.

```text
knowing resource ref ≠ permission to read/write it
```

A bound ArrokothI resource may be exported as a portable Resource. An imported protocol Resource may become:

```text
materialized local view
capability-backed read
remote handle
indexed/retrieval source
```

depending on its semantics.

The portable descriptor should not expose backing credentials. Resource/memory trust and provenance belong in [`memory.md`](memory.md); permission/exposure belongs in [`authority.md`](authority.md); hostile-code credential isolation belongs in [`security-guarantees.md`](security-guarantees.md).

---

## 5. Portable service interface

An Agent or Workflow Definition may expose an explicit service interface without exposing its internals.

A service description may contain:

```text
stable service identity
name / description
input interface
terminal-result/output interface
supported interaction patterns
selected operations/resources/templates
long-running capability if relevant
version/authentication metadata when needed
```

The caller does not need to know the internal:

```text
Stages
Effects
memory
child Executions
model provider
authority envelope
```

This supports:

```text
ArrokothI Definition
      ↓ explicit exported service
portable service descriptor
      ↓
A2A / MCP / HTTP / SDK / other binding
```

> **Exported service interface ≠ Definition internals.**

Composition semantics for the underlying Definition remain in [`composition.md`](composition.md).

---

## 6. Interaction templates

A reusable **interaction template** describes a parameterized way to begin or guide an interaction.

Examples:

```text
starter prompt
Workflow invocation recipe
few-shot task template
domain interaction pattern
recommended operation/resource combination
```

Instantiation is normally local composition/context construction, not an Effect by itself.

MCP Prompt is a natural binding for this category, but the portable concept is not defined by MCP.

---

## 7. Async handles are external correlation identities

External protocols often represent long-running work with a Task/job/handle.

That handle may correlate to:

```text
an ArrokothI Execution
an ArrokothI PendingOperation
an external provider job
another remote runtime object
```

It is not automatically any one of them.

```text
external async handle ≠ Execution ≠ PendingOperation
```

Adapters preserve enough correlation to translate:

```text
status
completion
failure
cancellation
progress
```

into the appropriate ArrokothI runtime/service behavior.

An exported long-running Agent service may map one external Task/handle to one long-lived Execution. A capability adapter may instead map it to one PendingOperation. Both are valid.

The internal runtime meanings of Execution/PendingOperation are defined in [`execution-runtime.md`](execution-runtime.md).

---

## 8. Input and continuation requirements

An in-progress external interaction may require additional information before continuing.

Examples:

```text
user/external input required
external authentication/credential refresh required
other externally satisfied prerequisite
```

These should not be collapsed into authority denial.

```text
external auth required ≠ Harness authority denied
external auth succeeds  ≠ new ArrokothI authority grant
user input required     ≠ exact mechanical confirmation
```

`RequestUserInput` is the current kernel Effect for semantic user input. Protocol adapters may project it to MCP/A2A/HTTP/UI-specific mechanisms.

A future broader `ContinuationRequirement` abstraction may be useful if concrete adapters need to represent non-user prerequisites consistently; it is not required as a new kernel Effect. This remains tracked in [`future-plan.md`](future-plan.md).

---

## 9. Change signals and notifications

External protocols may provide notifications/subscriptions such as:

```text
operation catalog changed
resource catalog changed
resource content changed
remote task status changed
service availability changed
```

A protocol notification is not automatically an ArrokothI Event.

It may only:

```text
invalidate descriptor cache
refresh discovery index
refresh Active View candidate universe
update external task adapter state
```

It becomes an Execution Event only when there is an explicit semantic reason to deliver that observation to that Execution.

Similarly, progress updates may remain UI/telemetry data unless controller semantics actually depend on them.

> **Protocol maintenance/change traffic does not automatically enter Execution mailboxes.**

Event/mailbox semantics belong in [`execution-runtime.md`](execution-runtime.md).

---

## 10. Portable schema language and provider projection

Portable service interfaces should prefer a mature general schema vocabulary instead of growing an unnecessary proprietary one.

The likely portable boundary is:

```text
portable Operation / service input-output
  → JSON Schema 2020-12 or declared compatible dialect

model-provider invocation
  → provider-supported constrained ObjectSchema subset
```

Provider limitations do not redefine the portable interface.

Projection may:

```text
restrict unsupported keywords
rename/bind operations
flatten schemas where required
validate before/after provider invocation
```

Schema compatibility does not grant authority or exposure.

When the portable schema contract should become a concrete implementation requirement remains in [`future-plan.md`](future-plan.md).

---

## 11. Authority and Active View sit before model/protocol invocation

Portable descriptors describe what can be exposed; [`authority.md`](authority.md) decides what an Execution may actually use.

The model-facing path is:

```text
Catalog / portable descriptors
      ↓
Effective Authority
      ↓
Active/Exposed View
      ↓
provider-specific Model Invocation Projection
      ↓
model selects operation
      ↓
resolve against exact projection snapshot
      ↓
typed Effect proposal
      ↓
Harness authorizes concrete Effect
```

The same principle applies to external clients: discovering or importing a descriptor does not grant authority to the local Execution.

```text
protocol discovery ≠ authority
schema visibility    ≠ authority
external identifier ≠ bearer credential
```

Control-plane/application authorization for exported services is a separate deployment boundary defined in [`security-guarantees.md`](security-guarantees.md).

---

## 12. Progressive heterogeneous discovery

Large systems may contain thousands of descriptors:

```text
Operations
Resources
Agent services
Workflow services
memory interfaces
Skills
interaction templates
```

The portable layer should support compact typed summaries without pretending all descriptors are one semantic kind.

Conceptually:

```text
DiscoverableSummary
  kind
  stableRef
  name/title
  short description
  tags/groups
  compact interface hints
```

Discovery pipeline:

```text
registered typed descriptors
      ↓ authority filtering/enumeration
already-authorized universe
      ↓ deterministic search/ranking
small Active View
      ↓ lazy full descriptor/schema hydration
model/protocol projection
```

Ranking may use BM25, embeddings, hybrid retrieval, application scope, cached manifests, or other mechanisms.

The first pass should normally avoid an extra LLM routing call. A model-visible discovery/search operation can be added when the initial view is insufficient, but it searches only already-authorized descriptors.

> **Progressive discovery scales descriptor exposure; it does not enlarge authority.**

The authority invariant belongs in [`authority.md`](authority.md); exact ranking/caching/search mechanics are future work in [`future-plan.md`](future-plan.md).

---

## 13. MCP binding

MCP is a first-class interoperability target because its major concepts map naturally to the portable layer.

```text
MCP Tool         ↔ portable Operation
MCP Resource     ↔ portable Resource
MCP Prompt       ↔ interaction template
MCP Task         ↔ external async handle when appropriate
MCP elicitation  ↔ input requirement
MCP notification ↔ change signal / selected Event
```

### Import

```text
MCP server
  ↓ discovery
MCP adapter
  ↓
portable typed descriptors
  ↓
authority + Active View
  ↓
model/authored invocation
  ↓
typed Effect/local action
  ↓
MCP request
```

Imported MCP metadata never grants authority by itself.

### Export

```text
explicit ArrokothI service/resource/template interface
  ↓
portable descriptor layer
  ↓
MCP server adapter
  ↓
non-ArrokothI client
```

The export is explicit. Private memory, private peer topology, undeclared Effects, and internal capabilities are not automatically published.

MCP SDK/wire types remain outside kernel/core semantics.

Concrete MCP import/export implementation work belongs in [`future-plan.md`](future-plan.md) and [`development/`](development/).

---

## 14. A2A binding

A2A is a first-class target for **opaque Agent-to-Agent service interoperability**.

Useful mappings are:

```text
exported Agent/Workflow service
      ↔ portable service descriptor
      ↔ A2A Agent Card

A2A Task
      ↔ external async/stateful work handle

A2A Message
      ↔ protocol communication turn

A2A Artifact
      ↔ exported task deliverable / Artifact

A2A contextId
      ↔ external interaction/session grouping when useful
```

Important non-equivalences:

```text
A2A Task       ≠ ArrokothI Execution
A2A Message    ≠ SendMessage Effect
A2A Agent Card ≠ Agent/Workflow Definition
A2A contextId  ≠ mandatory runtime identity
```

A remote A2A Agent is intentionally opaque. Its internal tools, memory, topology, and runtime are not part of the local kernel model.

A local ArrokothI `call/spawn/send/ask` remains stronger because it may carry ownership, delegation, supervision, memory visibility, cancellation, and runtime correlation semantics unavailable to a generic remote protocol.

Use A2A when crossing a service/implementation boundary; do not replace internal composition with A2A merely for uniformity. Internal composition belongs in [`composition.md`](composition.md).

---

## 15. Agent Skills binding

ArrokothI `Skill` is defined in [`composition.md`](composition.md) as a reusable package/composition abstraction, not an Execution kind.

The Agent Skills standard is an important compatibility profile for instruction-oriented Skills.

Conceptually:

```text
ArrokothI Skill
  ├── instruction-only profile
  │      ↕ Agent Skills SKILL.md + refs/assets/scripts
  │
  └── composition-backed profile
         root Agent/Workflow Definition
         input bindings
         richer resource/authority requirements
```

A composition-backed Skill may not losslessly fit an instruction-only external package. It can instead export a service operation that conventional clients invoke.

External fields such as `allowed-tools` map only to requested/recommended exposure requirements:

```text
Skill declares requested/recommended operations
      ↓
intersect with Effective Authority
      ↓
Active View
```

Never:

```text
SKILL.md says allowed
      ↓
authority granted
```

Progressive disclosure of Skill metadata/instructions/resources is compatible with ArrokothI's broader descriptor/context-discovery principles.

Native Skill packaging questions remain in [`future-plan.md`](future-plan.md).

---

## 16. HTTP/OpenAPI and local SDK bindings

Programmers and non-Agent clients should be able to use ordinary APIs.

```text
portable Operation
      ↓
HTTP/OpenAPI endpoint
local/generated typed function
CLI/Studio action
```

Example author-facing call:

```text
await github.createIssue(...)
```

may internally resolve to:

```text
UseCapability {
  capability: github
  operation: create_issue
}
```

while ordinary local code remains ordinary code:

```text
JSON.parse
sorting
validation
local transformation
computation over already exposed/materialized data
```

> **Developer ergonomics may hide Effect boilerplate; they must not bypass the Effect boundary.**

---

## 17. Agent/Workflow service patterns

### One-shot service

```text
external client
  ↓ invoke exported operation
adapter
  ↓ create/call Execution
Execution completes
  ↓ terminal result
external result
```

### Long-running service

```text
external client
  ↓ invoke
adapter creates Execution
  ↓
return external Task/job handle
  ↓
Execution continues independently
  ↓
poll/subscribe/cancel through supported binding
```

### Persistent conversational service

```text
agent.start(...) → external handle
agent.send(handle, message)
agent.status(handle)
```

The external handle resolves through application policy to an ArrokothI service/Execution.

It is not implicit authorization. Hosted control-plane authorization is defined in [`security-guarantees.md`](security-guarantees.md).

---

## 18. External protocols may reuse runtime mechanisms without redefining them

A protocol adapter may need:

```text
PendingOperation
correlation IDs
RequestUserInput
message routing
Execution creation
cancellation
resource change subscriptions
```

That does not make protocol objects kernel objects.

For example:

```text
MCP/A2A external task
      ↓ adapter correlation
PendingOperation or Execution
```

and:

```text
protocol task completes
      ↓ adapter settles runtime state
Event delivered when semantically relevant
```

Controller-local asynchronous work such as an LLM provider call remains a `ControllerResumption` concern from [`execution-runtime.md`](execution-runtime.md), not an interoperability task merely because both involve asynchronous waiting.

---

## 19. Observability and frontend protocols are projections

Protocols such as:

```text
AG-UI
A2UI
MCP Apps
ACP
CloudEvents
AsyncAPI
OpenTelemetry GenAI
```

may be useful projections for UI, editor, message, event, or telemetry surfaces.

They do not define ArrokothI runtime truth.

Examples:

```text
CloudEvent ≠ ArrokothI Event
OTel span  ≠ Execution lifecycle record
AG-UI event ≠ automatic mailbox Event
```

ArrokothI should define semantic/runtime truth once and export the projection needed by the product surface. Which optional bindings to implement is tracked in [`future-plan.md`](future-plan.md).

---

## 20. Protocol evolution rule

External standards will evolve. For each useful new concept, ask:

```text
Does it change actual runtime truth?
  → consider kernel semantic admission

Is it a reusable portable service/interface concept?
  → add/refine portable layer

Is it transport/provider/storage machinery?
  → adapter/backend only
```

Do not preserve a proprietary ArrokothI abstraction merely because it existed first if an external standard reveals a more general semantic distinction.

Conversely, do not promote a wire feature into the kernel merely because a popular protocol exposes it.

---

## 21. Interoperability invariants

Preserve these distinctions:

```text
kernel Effect          ≠ portable Operation
kernel Event           ≠ protocol notification
Execution              ≠ external task/job
Definition             ≠ public service descriptor
portable descriptor    ≠ authority grant
external handle        ≠ bearer authorization
MCP Tool               ≠ Capability
A2A Task               ≠ Execution
A2A Message            ≠ SendMessage Effect
Agent Skills package   ≠ all ArrokothI Skill semantics
CloudEvent             ≠ ArrokothI Event
provider schema subset ≠ portable schema language
```

And these positive rules summarize the model:

> **ArrokothI owns a portable interoperability layer between kernel semantics and protocol bindings.**

> **MCP is a first-class operation/resource/template interoperability target, not a kernel dependency.**

> **A2A is a first-class opaque Agent/service interoperability target, not a replacement for internal Execution composition.**

> **Agent Skills is an important instruction-oriented Skill compatibility profile, while ArrokothI Skills may also be composition-backed.**

> **Large descriptor universes may be discovered progressively after authority filtering and lazily hydrated into Active Views/projections.**

> **External async handles, tasks, notifications, and protocol identities remain distinct from Execution/Event/PendingOperation semantics.**

> **Ordinary API/SDK ergonomics can project the same semantic interface without bypassing Effects or authority.**

> **When external standards reveal a better general abstraction, adopt it at the correct layer rather than copying the protocol object model into the kernel.**

This document owns these interoperability meanings. Use [`README.md`](README.md) to locate adjacent canonical owners instead of redefining them here.
