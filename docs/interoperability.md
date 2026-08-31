# Interoperability Model

> **Status: canonical interoperability semantics.**
>
> Read [`mental-model.md`](mental-model.md), [`composition.md`](composition.md), and [`runtime-architecture.md`](runtime-architecture.md) first. This document defines how ArrokothI kernel semantics relate to external protocols and service interfaces, with Model Context Protocol (MCP) as a first-class interoperability target.
>
> The goal is not to make the kernel depend on MCP. The goal is to make ArrokothI semantics project cleanly into MCP and other protocols, import them cleanly, and remain able to adopt better protocol ideas without confusing wire contracts with kernel truth.

## 1. Core principle

ArrokothI separates three layers:

```text
Kernel semantics
  Execution / Event / Effect / authority / memory / lifecycle
        ↓
Portable interoperability surface
  operations / resources / templates / async handles /
  input requirements / change signals
        ↓
Protocol and API bindings
  MCP / HTTP+OpenAPI / local SDK / generated functions /
  future agent protocols
```

The central rule is:

> **Kernel semantics and interoperability semantics are separate but intentionally mappable.**

This protects both sides of the architecture:

- ArrokothI does not freeze a changing external protocol into its kernel ontology.
- Agent and Workflow authors do not need to redefine the same service separately for model tools, MCP, HTTP, SDKs, and Studio.
- External standards can improve ArrokothI when they reveal genuinely reusable semantics.
- An ArrokothI Agent or Workflow can be packaged as a service for clients that do not use ArrokothI internally.

MCP is therefore more than an incidental `UseCapability` transport. It is a **first-class compatibility target and design reference**, while remaining outside the kernel semantic boundary.

---

## 2. Identity is not mapping

Several concepts are related without being identical:

```text
Effect              ≠ protocol operation
Event               ≠ protocol notification
Execution           ≠ external async task
Capability          ≠ MCP Tool
bound resource      ≠ MCP Resource
RequestUserInput    ≠ MCP elicitation wire shape
```

But useful projections exist:

```text
Capability Operation        ↔ MCP Tool
exposed Resource            ↔ MCP Resource
interaction template        ↔ MCP Prompt
pending external work       ↔ MCP Task when appropriate
input requirement           ↔ MCP elicitation / MRTR when appropriate
external change signal      ↔ MCP notification / subscription
Effect completion           ← protocol result / task completion
                            → Arrokoth Event
```

A protocol adapter may therefore translate between these concepts while preserving the stronger ArrokothI runtime semantics.

> **Mapping does not grant authority, collapse lifecycle boundaries, or redefine what an Event or Effect means.**

---

## 3. Portable interoperability surface

ArrokothI should support a portable descriptive layer that can be projected into model-facing tools, MCP, HTTP/OpenAPI, SDK functions, Studio UI, and future protocols.

This document defines the **semantic categories**, not a frozen v0.4 TypeScript API. Concrete descriptor types should be introduced only when an implementation slice requires them.

### 3.1 Operation

An **Operation** describes an invocable semantic action.

Typical portable metadata may include:

```text
stable identity
name / title
description
input schema
optional output schema
portable consequentiality semantics
portable idempotency semantics
abstract resource requirements
version / compatibility metadata when needed
```

An Operation descriptor does **not** contain:

```text
caller authorization
active exposure decision
credentials / secrets
concrete backend clients
tenant/application identity
runtime settlement authority
```

Those remain runtime/application concerns.

One Operation may compile to an Effect such as `UseCapability`, `SpawnExecution`, `SendMessage`, or `WriteMemory`. Some purely local authored operations may instead remain local computation and produce no Effect.

### 3.2 Resource

A **Resource** descriptor represents information or state addressable through a portable interface.

Useful portable properties may include:

```text
logical identity / URI-like reference
name / title
description
content or media type
schema where applicable
version / provenance metadata
parameterized/template form when useful
change-observation capability when useful
```

A portable Resource descriptor is not itself Resource Authority. A client knowing a resource identifier does not imply permission to read or mutate it.

ArrokothI bound resources may be projected as external Resources when explicitly exported. Imported protocol resources may become bound-resource implementations or capability-backed reads depending on their semantics.

### 3.3 Interaction template

A reusable **interaction template** describes a parameterized way to begin or guide an interaction.

Examples include:

```text
Agent starter prompts
Workflow invocation recipes
few-shot task templates
domain-specific interaction patterns
recommended combinations of operations and resources
```

MCP Prompt is a natural protocol projection for this category.

Instantiating a template is normally local composition/context construction, not an Effect by itself. If obtaining the template requires external access, that access may cross the appropriate capability/resource boundary.

The final public name for this concept may be `PromptTemplate`, `InteractionTemplate`, `Recipe`, or another term. The semantic distinction matters more than the v0.4 name.

### 3.4 Async operation handle

External protocols may represent long-running work with a task/job handle.

That handle is not an ArrokothI Execution identity by definition. It may correspond to:

```text
an external capability job
an Arrokoth PendingOperation
an exported Arrokoth Execution
another remote runtime object
```

Adapters preserve the distinction and store enough correlation to translate eventual completion, failure, cancellation, or progress into ArrokothI runtime observations.

### 3.5 Input requirement

An **input requirement** means an in-progress semantic operation needs additional information or a decision before it can continue.

Internally this often maps to `RequestUserInput` plus waiting/resumption semantics. Externally it may map to protocol-specific elicitation or multi-round-trip mechanisms.

Input requirements and mechanical Effect confirmation remain distinct. A protocol mechanism that can ask the user a question does not erase ArrokothI's confirmation policy boundary.

### 3.6 Change signal

A **change signal** says that externally observed state or an exposed catalog may have changed.

Examples:

```text
operation catalog changed
resource catalog changed
resource content changed
external job status changed
peer/service availability changed
```

A change signal is not automatically an Event delivered to every Execution. It may instead invalidate a cache, refresh an Active View, or become an Event only for Executions that explicitly subscribed to or await that semantic observation.

---

## 4. Effects and portable operations

Effects remain the small kernel vocabulary for runtime-mediated interactions:

```text
UseCapability
WriteMemory
SpawnExecution
SendMessage
RequestUserInput
```

Portable Operations sit **above** this vocabulary.

```text
portable Operation
      ↓ resolve/bind
controller or authored code
      ↓
typed Effect proposal
      ↓
Harness authorization / coordination
      ↓
executor / environment
```

This means:

- many Operations may map to the same Effect kind;
- one Effect kind does not imply one public API operation;
- protocol metadata does not need to be copied into every Effect request;
- Effect requests remain compact, durable, auditable semantic records;
- public interfaces can evolve without changing the closed Effect vocabulary unnecessarily.

For example:

```text
Operation: github.create_issue
  ↓
UseCapability {
  capability: "github",
  operation: "create_issue",
  input: ...
}
```

or:

```text
Operation: research.start
  ↓
SpawnExecution {
  definitionId: "research-agent",
  input: ...
}
```

The Operation descriptor carries description/schema/interface metadata. The Effect proposal carries the concrete requested semantic action.

> **A model selecting an Operation still only proposes an Effect. The Harness decides whether and how it may occur.**

---

## 5. Effect-specific interoperability

### 5.1 `UseCapability`

`UseCapability` has the most direct mapping to MCP and ordinary APIs.

```text
external Tool / API operation
      ↓ import
portable Operation descriptor
      ↓ exposure projection
model/tool or authored call
      ↓
UseCapability
      ↓
CapabilityExecutor
      ↓
native / MCP / HTTP / browser / retrieval / remote job / ...
```

A capability executor may therefore use MCP as its concrete protocol without the kernel importing MCP SDK types.

Knowledge retrieval follows the same rule. Live browser, database, vector, private API, or remote MCP access normally crosses `UseCapability`; computation over already materialized/exposed data may remain local.

### 5.2 `WriteMemory`

Structured Memory has both resource-like and operation-like aspects:

```text
readable memory view  → Resource projection
writable field/action → Operation projection
```

Field descriptions and schemas belong to the memory schema/interface, not to every `WriteMemory` Effect proposal.

The model or external client should only see the readable/writable subset permitted by the Active/Exposed View. A raw generic `write_memory` operation should not be exported automatically when a narrower domain interface is safer and clearer.

### 5.3 `SpawnExecution`

Agent and Workflow Definitions may expose a public invocation interface containing portable metadata such as:

```text
name / title
description
input schema
terminal-result schema
service/export metadata
```

A model-facing or external operation may then compile to `SpawnExecution` or higher-level `call` semantics.

This enables an ArrokothI Agent or Workflow to be packaged as a service without requiring the caller to use ArrokothI.

Quick execution may return an ordinary protocol result. Long-running execution may be represented externally by a protocol task/job handle while the Arrokoth Execution retains its own independent lifecycle and identity.

### 5.4 `SendMessage`

Addressable peer interactions may be represented through portable Operations.

The preferred exported API is usually domain-oriented:

```text
request_review(...)
ask_editor(...)
submit_bid(...)
```

rather than exposing raw kernel verbs such as `send_message` to every external client.

Internally those Operations may compile to `SendMessage` after target resolution and Message Authority checks.

Descriptions of available peers/roles belong to an exposed peer/service directory, not to the `SendMessage` Effect payload.

### 5.5 `RequestUserInput`

`RequestUserInput` is better understood as an input-requirement semantic than as a generic Tool.

Protocol adapters may bridge it to elicitation or multi-round-trip input mechanisms. Internally the Execution still waits for a correlated `UserInput` Event, and the Harness retains control over presentation, authorization, and resumption.

---

## 6. Events and external protocol observations

An ArrokothI **Event** is an observation delivered to an Execution. External protocols may produce several kinds of observations that can become Events after translation.

### 6.1 Direct operation results

```text
Effect
  ↓
external request
  ↓
result / error
  ↓
trusted adapter settlement
  ↓
correlated Arrokoth Event
```

This is the most direct mapping.

### 6.2 Async task/job completion

```text
Effect
  ↓
external protocol returns task/job handle
  ↓
PendingOperation stores correlation
  ↓
completion / failure / cancellation
  ↓
Event
```

The external task is provider state. The PendingOperation is Arrokoth runtime state. The resulting Event is the semantic observation delivered to an Execution.

### 6.3 Notifications and subscriptions

Protocol notifications are not automatically Arrokoth Events.

A notification may mean only:

```text
catalog changed → refresh discovery cache
resource changed → invalidate cached materialization
```

It becomes an Execution Event only when there is an explicit semantic reason to deliver it, for example:

```text
Execution subscribed to resource updates
Execution awaits an external state change
Workflow logic declared the signal relevant
Agent's active service contract includes the observation
```

This avoids flooding mailboxes with protocol-maintenance noise and preserves the stronger meaning of Event.

### 6.4 Progress

Progress is similarly separate from terminal completion. A protocol may expose progress for observability or user experience without requiring every progress update to enter controller context.

When progress is semantically relevant, an adapter may translate selected updates into Events. Otherwise it remains trace/telemetry/UI data.

---

## 7. MCP as a first-class target

MCP is an important interoperability target because its abstractions overlap strongly with agent-facing service interfaces:

```text
MCP Tool              ↔ portable Operation
MCP Resource          ↔ portable Resource
MCP Prompt            ↔ interaction template
MCP Task extension    ↔ async operation handle
MCP elicitation/MRTR  ↔ input requirement
MCP notifications     ↔ change signals / selected Events
```

As of MCP `2026-07-28`, the protocol core is stateless, requests are self-describing, discovery is optional, Tasks are an extension for long-running work, and notification delivery is subscription-based. These details are useful evidence for ArrokothI's design, but they are **not kernel invariants**.

MCP will evolve. ArrokothI should therefore target semantic compatibility rather than copy the current wire schema into core types.

### MCP import

ArrokothI may act as an MCP client through an adapter package:

```text
MCP server
   ↓ discover/list
MCP adapter
   ↓
portable descriptors
   ↓
authority + Active/Exposed View
   ↓
model/authored operation
   ↓
Effect
   ↓
MCP call/read/interaction
```

Imported MCP metadata never grants authority by itself.

### MCP export

ArrokothI may expose declared service interfaces as an MCP server:

```text
Agent / Workflow / capability / resource
        ↓
explicit exported interface
        ↓
portable descriptors
        ↓
MCP adapter
        ↓
MCP client that may know nothing about ArrokothI
```

The adapter may expose:

```text
operations as Tools
selected data as Resources
interaction templates as Prompts
long-running calls through Tasks
input requirements through MCP interaction mechanisms
selected change signals through subscriptions
```

The exported interface is explicit. Internal Effects, private memory, private peer topology, and unexposed capabilities are not automatically published.

---

## 8. Agent and Workflow as a service

A major interoperability goal is that an ArrokothI Definition can become a service boundary.

### One-shot service

```text
external client
   ↓ call exported operation
Arrokoth adapter
   ↓
create/call Execution
   ↓
terminal result
   ↓
external result
```

### Long-running service

```text
external client
   ↓ call exported operation
Arrokoth adapter
   ↓
create Execution
   ↓
return external async handle
   ↓
Execution continues independently
   ↓
client polls/subscribes/cancels as supported
```

### Persistent conversational service

A stateful Agent may mint an explicit external handle:

```text
agent.start(...) → externalHandle
agent.send(externalHandle, message)
agent.status(externalHandle)
```

The handle resolves to an Arrokoth Execution through application policy.

> **An external handle or Execution identifier is not bearer authorization.**

Authentication and application access policy govern who may use the handle. The Arrokoth Harness separately governs what the Execution itself may do.

---

## 9. Model-facing projection

Model tool/function calling is another projection of the same portable interface, not a separate source of authority.

```text
portable descriptors
      ↓
effective authority
      ↓
Active/Exposed View
      ↓
model-facing operation specs
      ↓
model chooses
      ↓
controller resolves binding
      ↓
typed Effect proposal
```

This preserves the existing rule:

> **Authority is not exposure. Exposure is not authorization. A model-facing descriptor grants neither.**

A model-facing projection may choose different shapes depending on catalog size and provider constraints:

```text
small catalog
  dedicated operation per action

larger catalog
  generic dispatcher + discovered descriptors

very large/dynamic catalog
  discovery/search + generic invocation
```

The projection strategy may evolve independently from kernel semantics.

---

## 10. Author-facing API and normal function calls

Programmers should be able to use ordinary typed APIs without manually constructing Effect records everywhere.

For example:

```text
await github.createIssue(...)
```

may be a generated/bound SDK function whose implementation inside an Arrokoth Execution becomes:

```text
UseCapability
  capability = github
  operation = create_issue
```

while ordinary local code such as:

```text
JSON.parse
sorting
validation
local transformation
computation over already exposed/materialized data
```

remains direct local computation.

The semantic boundary is whether the operation expands interaction with the runtime/environment or requires Harness guarantees such as authority, confirmation, idempotency, correlation, durability, recovery, or provenance.

> **Good developer ergonomics should hide unnecessary Effect boilerplate without bypassing the Effect gateway.**

---

## 11. Security boundary

Protocol interoperability must preserve ArrokothI's authority model.

The following are explicit non-equivalences:

```text
protocol authentication        ≠ Execution authority
operation discovery            ≠ permission to invoke
resource identifier            ≠ Resource Authority
external async handle          ≠ bearer authorization
model-facing exposure          ≠ authority grant
external input/confirmation UI ≠ automatic Effect authorization
```

Imported protocol content is untrusted input unless a stronger trust policy explicitly says otherwise. This includes:

```text
tool descriptions
resource contents
prompt templates
operation results
notification payloads
schema annotations
```

Protocol adapters must not smuggle concrete credentials, ambient host clients, application tenancy, or settlement authority into model/controller-visible descriptors.

Export adapters must publish only an explicitly authorized public surface.

See [`security-guarantees.md`](security-guarantees.md) for the general containment and authority contract.

---

## 12. Versioning and protocol evolution

ArrokothI should expect MCP and other protocols to improve.

The architecture should make upgrades mostly adapter/projection work:

```text
new protocol feature
      ↓
Does it reveal a general semantic concept?
      ├── no  → keep it in protocol adapter
      └── yes
           ↓
Does it belong to portable interop semantics?
      ├── yes → add/generalize descriptor or projection concept
      └── no
           ↓
Does it change a genuine kernel runtime invariant?
      ├── yes → evolve Event/Effect/runtime semantics deliberately
      └── no  → do not leak it into core
```

A protocol feature should not enter the kernel merely because MCP supports it. Conversely, ArrokothI should not preserve a proprietary mechanism when an external design reveals a more general semantic model.

Useful admission questions are:

1. Is the concept meaningful without MCP or another specific protocol?
2. Does it describe runtime truth, portable service/interface truth, or only wire mechanics?
3. Does it require authority/lifecycle/durability semantics stronger than the protocol supplies?
4. Can the concept survive protocol-version changes?
5. Can it be expressed through an adapter without weakening the kernel?
6. Would adopting it remove an unnecessary Arrokoth-specific concept?

This is the intended mechanism by which a maturing protocol can **empower** ArrokothI without owning ArrokothI.

---

## 13. Dependency direction

Protocol packages depend inward on stable Arrokoth interfaces.

```text
MCP SDK / HTTP framework / provider SDK
            ↓
protocol adapter package
            ↓
portable descriptor / executor / ingress ports
            ↓
@arrokoth/core
```

Never invert this into:

```text
@arrokoth/core
    ↓
MCP SDK types
```

Core semantic records should use Arrokoth-owned types. Protocol adapters translate at the edge.

This supports multiple MCP versions, alternate MCP SDKs, HTTP/OpenAPI export, local-only deployments, and future protocols without changing the Execution model.

---

## 14. Conformance targets

The interoperability model should eventually be validated by scenarios such as:

```text
import an MCP Tool as a capability operation
import an MCP Resource as an authorized resource/read path
import an MCP Prompt as an interaction template

export a capability operation through MCP
export a Workflow as an MCP Tool
export a short-lived Agent as an MCP Tool
export a long-running Agent through an MCP async Task/handle
export a persistent Agent through explicit state handles

translate external elicitation/input-required into RequestUserInput
translate external completion/failure into correlated Events
translate resource-update notifications only for explicit semantic subscribers

prove MCP authentication does not become Execution authority
prove discovery/exposure does not grant invocation permission
prove private Effects/memory/peers are not automatically exported

project the same portable operation into
  model tool calling
  MCP
  HTTP/OpenAPI or SDK
without redefining its semantic contract
```

These scenarios are architectural targets; not all are required for the first v0.4 runtime slice.

---

## 15. Interoperability invariants

> **Effects are kernel semantics; descriptors are portable interface semantics; protocols are bindings.**

> **MCP is a first-class interoperability target, not the owner of ArrokothI kernel semantics.**

> **Protocol descriptors grant no authority.**

> **An exported interface is explicit and may be narrower than an Execution's internal capabilities and Effects.**

> **An imported protocol operation must still pass ArrokothI authority, exposure, correlation, and settlement boundaries.**

> **External tasks/jobs do not replace Execution identity or PendingOperation semantics.**

> **Protocol notifications become Events only when they represent an observation semantically relevant to an Execution.**

> **Prompt/interaction templates are reusable context/interface objects, not Effects by themselves.**

> **Core does not depend on MCP SDK or wire types.**

> **When a maturing external protocol reveals a better general abstraction, ArrokothI should evaluate and adopt the abstraction at the correct layer rather than preserve unnecessary proprietary concepts.**
