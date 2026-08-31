# Interoperability Decisions Before Agent Slice D

> **Status: accepted implementation guidance after Slice C and before Agent Slice D.**
>
> This note records the implementation consequences of the canonical interoperability model after
> reviewing Slice C at commit `547007f2d44ad0677389f360c39d41875c21e1b7`. It is intentionally a
> development note rather than new canonical architecture. [`../mental-model.md`](../mental-model.md),
> [`../interoperability.md`](../interoperability.md), [`../composition.md`](../composition.md),
> [`../runtime-architecture.md`](../runtime-architecture.md), and
> [`../security-guarantees.md`](../security-guarantees.md) remain authoritative.

## Review conclusion

Slice C does **not** need an interoperability retrofit before Slice D.

The following Slice-C choices already align with the canonical direction:

```text
WorkflowSpec
  → portable authored data
  → logical refs rather than executable/provider objects

ModelCallableDeclaration
  → model-facing vocabulary explicitly mapped to capability/operation identity
  → description + input schema are exposure metadata
  → no executor or authority grant

ModelCapabilitySpec
  → provider-facing projection only
  → no executor or authority grant

LocalResource / LocalResourceView
  → already-materialized local computation boundary
  → explicitly not a live-resource transport or sandbox

live retrieval
  → UseCapability Effect
  → Harness authorization/dispatch
  → result returns as observation/Event
```

Those boundaries should be preserved.

The main risk now moves to Slice D: an open-ended Agent needs a dynamic action surface, and it would
be easy to accidentally make an Agent-specific tool registry, `ModelCallableDeclaration`, provider
function schema, or MCP shape become the new source of truth. Slice D must avoid that.

---

## DEC-I01 — Do not retrofit Slice C into the portable interoperability layer

**Decision: Accepted.**

Slice C's `ModelCallableDeclaration` is a valid **Workflow LLM-Stage authored exposure declaration**.
It is not the universal portable Operation descriptor promised by the canonical interoperability
model.

Likewise:

```text
ModelCallableDeclaration ≠ portable Operation descriptor
ModelCapabilitySpec      ≠ portable Operation descriptor
LocalResource            ≠ portable Resource descriptor
CapabilityOperationDescriptor ≠ complete public service descriptor
```

Do not rename these types to more general names merely to make the new architecture appear
implemented.

Reasoning:

- `ModelCallableDeclaration` contains Workflow-stage-specific binding choices such as authored
  model-facing name, capability/operation mapping, resources, and deadline.
- `ModelCapabilitySpec` is intentionally provider-facing and should remain tiny.
- `LocalResource` represents an already-materialized local read API, not a discoverable external
  resource contract.
- `CapabilityOperationDescriptor` currently owns only the operation-intrinsic facts required by the
  Effect gateway. Growing it should remain driven by concrete portable semantics rather than by a
  desire for one registry immediately.

Slice C therefore remains valid as implemented.

---

## DEC-I02 — Slice D must not make AgentSpec the master operation catalog

**Decision: Accepted.**

An Agent needs an open-ended model action surface, but `AgentSpec` must not become a large embedded
copy of every operation's description/schema/backend metadata.

The intended direction is:

```text
portable operation/resource/interface information
        +
effective authority
        +
Active/Exposed View
        ↓
Agent model-facing action projection
        ↓
ModelCapabilitySpec[]
        ↓
model chooses
        ↓
controller resolves the exposed binding
        ↓
typed Effect proposal
        ↓
Harness authorization/dispatch
```

Slice D may introduce the **smallest** projection/view contract required to make this real, but it
must not freeze a complete MCP/OpenAPI/service-descriptor system merely because the Agent needs tools.

A useful Agent definition may request or configure exposure policy, logical capability groups, or
other portable references. Concrete provider tool schemas, executors, credentials, application
identity, and transport objects do not belong in `AgentSpec`.

---

## DEC-I03 — Model-facing callable metadata is a projection, not authority or implementation

**Decision: Accepted.**

Keep the provider boundary established in Slice C and the provider-foundation slice:

```text
ModelCapabilitySpec
  name
  description
  input schema
```

It remains model vocabulary only.

A model call result remains:

```text
ModelCapabilityCall
  ↓
resolve against the currently exposed binding
  ↓
Effect proposal
```

The Agent controller must not dispatch directly from a provider-returned string and must not infer
permission from the fact that an operation was exposed.

The same operation may later be projected to:

```text
model function/tool calling
MCP Tool
HTTP/OpenAPI
SDK function
Studio UI
```

without changing the Effect semantic that ultimately occurs inside ArrokothI.

---

## DEC-I04 — Preserve `CapabilityCatalog` ownership; enrich only when a concrete portable fact is needed

**Decision: Accepted.**

Slice B deliberately made `CapabilityCatalog` own portable **operation-intrinsic semantics** rather
than authorization, exposure, backend implementation, credentials, or application identity.

That decision remains correct after the interoperability work.

Do not move these into `CapabilityCatalog`:

```text
who may invoke
whether currently exposed
MCP server/client handles
HTTP clients
credentials/secrets
tenant/user identity
concrete resource bindings
settlement authority
```

Possible future additions remain appropriate only when required by a concrete slice and genuinely
portable/intrinsic, for example:

```text
input schema
output schema
stable description/title
idempotency semantics
abstract resource requirements
version/compatibility metadata
```

Slice D should not add all of these pre-emptively. If it needs descriptive metadata to build the
Agent Active View, introduce the minimum descriptor/projection boundary that can later converge with
this catalog rather than duplicating a second permanent ontology.

---

## DEC-I05 — Workflow `ModelCallableDeclaration` may be projected from richer descriptors later

**Decision: Accepted.**

Slice C currently authors callable description/schema/binding directly inside an LLM Stage. This is
acceptable for v0.4 bounded Workflow composition.

A future authoring layer may allow:

```text
portable Operation descriptor
        ↓
Workflow LLM Stage exposure policy / alias / deadline / resource binding
        ↓
ModelCallableDeclaration-like resolved declaration
```

That future direction should not invalidate existing explicit authored declarations.

The important separation is:

```text
operation's reusable semantic description
        ≠
this Stage's decision to expose/alias/bind it now
```

Do not force Slice D to redesign Workflow specs before a concrete shared-descriptor API exists.

---

## DEC-I06 — `LocalResource` stays local; portable Resource semantics remain a separate future layer

**Decision: Accepted.**

`LocalResource` / `LocalResourceView` from Slice C are specifically the boundary for computation over
already-materialized read-only data.

They should not be expanded into an MCP-like resource registry by adding fields just because MCP
Resources have URIs, descriptions, templates, MIME types, or subscriptions.

Future portable Resource descriptors may describe things such as:

```text
logical identity / URI-like reference
name / description
content/media type
schema
version/provenance
parameterization
change-observation capability
```

and then bind to one of several runtime forms:

```text
materialized LocalResource
live capability-backed resource
artifact/file
memory view
remote protocol resource
```

The Slice-C port remains one implementation/runtime form, not the whole resource ontology.

---

## DEC-I07 — MCP is first-class, but no MCP SDK/wire types enter core Slice D contracts

**Decision: Accepted.**

Slice D should be written so an Agent's active operation view can later be imported from or exported
to MCP naturally. It should not import MCP SDK types into `packages/core`.

Dependency direction remains:

```text
MCP SDK / protocol implementation
        ↓
future MCP adapter package
        ↓
Arrokoth portable descriptors / capability executor / service ingress
        ↓
@arrokoth/core semantics
```

Not:

```text
@arrokoth/core
  ↓
MCP Tool / Task / Resource wire types
```

MCP-specific behavior such as current discovery messages, task wire shapes, protocol versioning,
transport headers, or subscription frames belongs in adapters.

---

## DEC-I08 — Agent action selection should exercise the interoperability boundary, even before MCP exists

**Decision: Accepted.**

Slice D is the first place where the new interoperability architecture should become visible in
implementation behavior.

At minimum, conformance should prove:

1. the model-facing callable list is derived from an exposed operation view rather than from an
   executor registry;
2. the model-facing view contains descriptions/schemas but no credentials, backend clients, authority
   grants, or settlement functions;
3. a model-selected action produces only a typed Effect proposal;
4. Harness authorization can still deny an exposed action;
5. changing model providers does not change operation identity or Effect semantics;
6. provider-returned names that are not in the current exposed binding resolve to nothing;
7. Agent controller/runtime code does not depend on MCP, HTTP/OpenAPI, or any concrete tool transport;
8. the same portable operation can later be projected to a non-model protocol without rewriting the
   Agent's kernel semantics.

The eighth item may initially be an architecture/type-boundary assertion rather than a complete MCP
integration test.

---

## DEC-I09 — Do not expose raw Effects as the public Agent service interface

**Decision: Accepted.**

Future Agent-as-a-Service export must be explicit.

An Agent may internally use:

```text
UseCapability
WriteMemory
SpawnExecution
SendMessage
RequestUserInput
```

without automatically exporting public operations named:

```text
use_capability
write_memory
spawn_execution
send_message
```

A declared external interface may instead expose domain operations such as:

```text
research(...)
request_review(...)
continue_conversation(...)
```

which compile into one or more internal Effects.

Slice D does not need to implement service export, but it must avoid APIs that make internal Effects
the unavoidable public contract.

---

## DEC-I10 — Event interoperability does not require new Event kinds in Slice D

**Decision: Accepted.**

The canonical interoperability model maps external results, async completion, notifications, and
input requirements into Arrokoth runtime observations only when they have semantic meaning for an
Execution.

Slice D therefore does **not** need MCP-notification, MCP-task, or protocol-progress Event kinds.

Continue using semantic Events such as capability result/failure, messages, user input, timers, and
control observations. A future protocol adapter may translate:

```text
protocol result/task completion
        → settle pending operation
        → semantic Event

protocol catalog/resource notification
        → cache/view refresh
        → Event only when an Execution explicitly depends on that observation
```

Protocol maintenance noise must not become kernel Event vocabulary merely for completeness.

---

## DEC-I11 — Definition/service input interfaces remain a later explicit decision

**Decision: Accepted / deferred.**

Slice C correctly identified that Workflow start input still needs a first-class contract. This is
also relevant to future MCP/HTTP/SDK export because an Agent or Workflow service needs a stable input
interface.

Do not solve this inside Slice D by coupling Agent input to one provider's message shape or one
protocol request.

The likely future direction is a portable Execution Definition invocation interface containing at
least:

```text
name / description
input schema or input contract
terminal-result schema
optional explicit export/service metadata
```

but the exact shape should be decided with the first child-composition/service-export slice that
requires it. The current Workflow input Event convention may remain temporary until then.

---

## Slice D implementation guidance

Before coding Slice D, preserve these existing boundaries:

```text
ModelResolver / ModelProvider
  → provider-neutral model access

ModelCapabilitySpec
  → model-facing projection only

Effect gateway
  → runtime action/authority boundary

CapabilityExecutor
  → concrete implementation/transport boundary

CapabilityCatalog
  → portable operation-intrinsic facts only

LocalResourceView
  → already-materialized local computation boundary
```

Add only the Agent-specific structures required for open-ended progression:

```text
AgentSpec
AgentControlState
AgentController
AgentExecutor / reference executor
context selection/compiler inputs
Active operation/capability exposure projection
model-directed continue/stop interpretation
```

The exact name of the new exposure/projection contract is not frozen by this note. Prefer a narrow
name that describes what Slice D actually needs. Avoid prematurely publishing generic names such as
`UniversalTool`, `McpOperation`, or `ServiceDescriptor` unless the implementation already supports
those semantics.

A healthy dependency path should look like:

```text
portable/intrinsic operation information
        ↓
Agent Active/Exposed View
        ↓
ModelCapabilitySpec
        ↓
ModelCapabilityCall
        ↓
Agent controller resolves exposed binding
        ↓
UseCapability Effect (or another explicit typed Effect when the selected action is not a capability)
        ↓
Harness
```

For v0.4 Agent tool use, `UseCapability` is the primary concrete path. Future projections of
`WriteMemory`, `SpawnExecution`, `SendMessage`, and `RequestUserInput` should reuse the same portable
action/projection philosophy without forcing every Effect to masquerade as an MCP Tool.

---

## Deferred interoperability implementation work

Do **not** pull the following into Slice D merely because the architecture now names them:

```text
MCP client adapter
MCP server adapter
MCP Tasks integration
MCP subscriptions/notifications
MCP Prompt import/export
HTTP/OpenAPI generation
SDK code generation
portable Resource descriptor registry
full public service/export manifest
persistent external Agent handles
protocol version negotiation
```

These are later vertical slices. Slice D should leave clean seams for them.

---

## Review checkpoint after Slice D

After Slice D lands, review specifically:

```text
AgentSpec
Agent Active/Exposed View
model-facing callable projection
capability/operation descriptor ownership
context compiler inputs
Effect proposal resolution
Strands interception/bridge
```

The review question is not "does Slice D support MCP?".

It is:

> **Can the Agent kernel consume a portable operation view and produce typed Effects without knowing whether the same operation came from native code, MCP, HTTP, or another future protocol?**

If yes, Slice D is aligned. If not, fix the ownership boundary before implementing concrete MCP
integration.
