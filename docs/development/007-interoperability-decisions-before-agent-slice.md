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

## DEC-I12 — Freeze four distinct exposure layers

**Decision: Accepted.**

Agent interoperability, large catalogs, and model context should use four distinct conceptual layers:

```text
1. Catalog
   What exists?

2. Effective Authority
   What could this Execution legally use/access?

3. Active/Exposed View
   What authorized subset is currently useful/appropriate to expose?

4. Model Invocation Projection
   What does this particular model call actually receive, and under what model-facing names/shapes?
```

The subset notation is conceptual rather than a requirement that every layer be materialized as one
large in-memory set:

```text
Model Invocation Projection
        ⊆
Active/Exposed View
        ⊆
Effective Authority
        ⊆
Catalog universe
```

The Catalog is also a conceptual layer, not a requirement for one universal mega-registry. Different
portable domains may have typed catalogs/registries for capability operations, resources,
Definitions/services, memory interfaces, or peers. Do not collapse them merely to satisfy the diagram.

### Catalog

Catalog metadata describes portable semantic things that exist. It does not imply permission,
current relevance, model exposure, or a concrete backend implementation.

### Effective Authority

Authority is the legal/runtime ceiling. It may be represented through grants, rules, refs, resource
bindings, and policy rather than by copying thousands of complete descriptors into each Execution.

Authority remains enforceable at the Harness even if exposure code is buggy or stale.

### Active/Exposed View

The Active View is the currently eligible exposure set for an Execution/controller. Changing it
inside already-granted authority is context/exposure policy, not privilege escalation.

The Active View is **not** itself an authority grant and must not be able to enlarge effective
authority. An implementation should derive/intersect it against effective authority rather than trust
a caller-supplied list as permission.

For Slice D, only an **active operation view** needs to become concrete. Resource/memory/peer views can
continue to use their owning slices and later converge under the same conceptual model.

### Model Invocation Projection

The per-model-call projection is ephemeral provider/model vocabulary. It may narrow the Active View
again for token cost, provider tool limits, relevance, or context packing and may alias operation
names for that invocation.

A model-returned callable name must resolve against the **same projection/binding snapshot that was
shown to that model invocation**. Catalog/view refresh, alias reuse, or descriptor change must not
silently rebind an old model response to a different operation.

Use a projection/view revision, binding identity, or equivalent deterministic mechanism; the exact
v0.4 representation is implementation detail. These identifiers are correlation/integrity aids, not
authority credentials.

The Harness still authorizes the resulting typed Effect.

---

## DEC-I13 — Slice D needs the seam, not an expensive dynamic selector

**Decision: Accepted.**

Large-catalog selection is a real scaling/context-quality problem, but Slice D must not solve it by
adding a mandatory extra LLM call before every Agent model turn.

The Slice-D requirement is only:

```text
portable/intrinsic operation information
        +
effective authority
        ↓
deterministic Active Operation View
        ↓
per-call model projection
```

A valid first implementation may use deterministic/static inputs such as:

```text
explicit operation refs
authored logical capability groups
tags/categories
application-provided task scope
simple metadata filters
bounded top-N policy
cached prior Active View
```

No additional model inference is required merely to construct the view.

Future large/dynamic-catalog strategies may include:

```text
lexical/BM25 descriptor search
embedding retrieval
provider-aware top-N packing
progressive discovery/search operations
cached view expansion/contraction
catalog-change invalidation
an optional learned/LLM selector when measurements justify its cost
```

Those strategies belong behind the same view/projection seam and should be benchmarked rather than
made kernel semantics.

A model may later request discovery/expansion through a deliberately exposed operation, but discovery
still cannot enlarge authority. Returned descriptors are information, not grants.

Protocol catalog/resource change signals should normally invalidate discovery/view caches or trigger
a view refresh. They should become Execution Events only when an Execution explicitly depends on the
change itself.

---

## DEC-I14 — Enrich the existing capability-operation catalog; do not create a second ontology

**Decision: Accepted after post-Slice-C implementation audit.**

The implemented `CapabilityCatalog` already owns the stable capability/operation pair and baseline
consequentiality. Slice D should extend that same operation-intrinsic source with only the reusable
facts needed to build an Agent operation view:

```text
stable identity: capability + operation
title/name
description
input schema
existing consequentiality
minimal tags/group metadata only if the first deterministic resolver consumes it
```

Output schema, generalized version negotiation, abstract resource requirements, rich idempotency
descriptions, icons, protocol annotations, and every other plausible field remain deferred until a
real consumer needs them.

This catalog remains the semantic source of operation truth. An MCP import adapter may translate a
Tool into it; an MCP export adapter may project from it; an Agent may derive a model view from it.
None of those creates a parallel `AgentTool`, `McpTool`, or service-operation ontology with a second
identity/consequentiality/schema record.

Workflow `ModelCallableDeclaration` remains an authored Stage-specific exposure/binding. A later
helper may resolve reusable description/schema data from the catalog and then apply the Stage alias,
resources, and deadline. Slice D does not rewrite existing Workflow definitions.

---

## DEC-I15 — Harness owns effective operation authority; exposure policy only narrows it

**Decision: Accepted after post-Slice-C implementation audit.**

The implemented Slice-B `EffectAuthorizer` provides the decisive per-dispatch authorization check,
but it is not an enumerable effective-authority view and must not become a tool selector.

Slice D needs the smallest explicit operation-authority representation that can safely feed exposure:

```text
application/runtime grant policy at root creation
        ↓
Harness-owned effective operation authority record/ref
        ↓ read-only input
ActiveOperationViewResolver
```

This record may contain compact operation/resource grants, rules, or refs. It need not contain
complete descriptors or materialize a large set. Slice E extends the same ownership with child
delegation and monotonic narrowing; D does not pre-implement general spawn authority.

The clean responsibility split is:

```text
application/deployment policy
  supplies root grants, task/exposure hints, and resolver configuration

Harness/runtime
  computes/stores effective authority
  supplies it read-only to exposure resolution
  performs current Effect authorization at dispatch

context/exposure resolver
  intersects Agent request + task policy + catalog with effective authority
  returns an Active Operation View
  cannot grant or dispatch

Agent controller
  decides when to resolve/refresh a view and when to make a model call
  cannot mutate authority
```

Both view derivation and dispatch authorization must read consistent authority truth, but dispatch is
always decisive. A stale or buggy Active View can therefore cause a denied request, never an
authority bypass. Changing the view within authority remains context policy, not authority mutation.

---

## DEC-I16 — Information context and operation projection are independent inputs

**Decision: Accepted after post-Slice-C implementation audit.**

Do not make one `ModelContext` or context compiler own instructions, memory visibility, resource
snippets, tool relevance, operation authority, model aliases, and provider limits.

Slice D should implement two branches:

```text
eligible information
    ↓
information context compilation
    ↓
instructions / messages / selected Events / snippets

Active Operation View
    ↓
operation projection
    ↓
ModelCapabilitySpec[] + immutable bindings
```

They meet only when the controller/executor assembles one provider request. The information compiler
does not choose callable operations. The operation resolver/projector does not select memory,
Working Notes, resource snippets, or message history.

This preserves all three distinctions:

```text
memory != context
authority != exposure
operation exposure != information visibility
```

---

## DEC-I17 — Projection binding is invocation-local integrity state

**Decision: Accepted after post-Slice-C implementation audit.**

Slice D must implement projection snapshot stability now, not defer it to MCP or durability.

A minimum snapshot contains:

```text
projection identity/revision
source Active View identity/revision
bindings:
  binding identity
  model-facing name
  stable operation identity
  projected input schema/description as needed
```

The object handed to the provider is immutable. A returned name is resolved only through these
bindings. The controller must not consult the latest catalog or Active View after the response
arrives, even if a catalog refresh reused the same alias for another operation.

When model inference starts and finishes inside one Activation, closing over the immutable snapshot
is sufficient. When an AgentExecutor continuation crosses an Activation, the necessary projection
and binding data is persisted as plain JSON in Agent control state.

Projection, binding, tool-use, task, correlation, and Execution identifiers are not authority or
settlement credentials. They explain which meaning the model saw. The resolved Effect still crosses
the current Harness authorization boundary.

---

## DEC-I18 — AgentExecutor returns semantic calls; it receives no Effect requester

**Decision: Accepted after post-Slice-C implementation audit.**

The original migration plan allowed the executor to receive an Effect requester. The implemented
A-C controller contract makes a narrower boundary both possible and clearer.

Use:

```text
AgentExecutor
  input:
    compiled information
    observations
    resolved model
    one Model Operation Projection
    bounded semantic config / continuation
  output:
    response
    operation call(s) tied to that projection
    continue/stop/failure proposal

AgentController
  resolves returned calls against the same projection
  returns typed Effect proposal(s) in ActivationOutcome

Harness
  authorizes / journals / dispatches / correlates / settles
```

The executor receives no Effect requester, `CapabilityExecutor`, MCP/HTTP client, authorizer,
settlement function, runtime store, lifecycle mutator, or mutable authority. This makes the reference
executor and Strands executor share the same semantic contract and prevents a framework-native tool
loop from becoming an alternate gateway.

The minimum `AgentSpec` is correspondingly small:

```text
logical model request
instructions
bounded Agent semantic limits
effect-free input/output Adapter declarations when used
portable operation-exposure request (refs/groups/tags/bound, only as needed)
```

It contains neither the catalog nor the authority grant nor the active view nor the invocation
projection.

---

## DEC-I19 — Strands must pause before native tool execution and resume with an observation

**Decision: Accepted after installed-package audit.**

The installed Strands 1.14 package is bridgeable without allowing native tool dispatch to bypass the
Effect gateway:

```text
Arrokoth Active Operation View
        ↓ immutable invocation projection
Strands FunctionTool specs
        ↓ model returns tool use
BeforeToolCall interception
        ↓ capture name/input/tool-use id + interrupt before execution
Strands executor returns semantic operation call + JSON snapshot
        ↓
Agent controller resolves original binding and proposes Effect
        ↓
Harness result Event
        ↓
resume Strands snapshot with observation
        ↓
observation-only FunctionTool callback returns the result to Strands/model
```

The Strands package must also provide a `ModelProvider`-backed Strands `Model`; it may not infer a
vendor or default to Google from Agent definition data.

Use `BeforeToolCallEvent.interrupt()` plus `takeSnapshot`/`loadSnapshot` for the first spike. Do not
base correctness on the experimental `afterModel` checkpoint because the current JavaScript SDK may
re-invoke the model when resuming that boundary. Prove serializable pause/resume, one and multiple
calls, exact observation correlation, cancellation, context/view refresh, and that no FunctionTool
callback imports or calls the Arrokoth gateway/executor. If this cannot be made reliable, limit the
optional Strands executor instead of weakening the kernel contract.

---

## DEC-I20 — Keep D-I ordering; add two staged MCP proofs

**Decision: Accepted after roadmap audit.**

Interoperability changes seams and validation points, not the semantic dependency order:

```text
D Agent
E composition
F memory
G interaction
H environment/security profile
I durability
```

Add two deliberately narrow vertical proofs:

```text
after D:
  import one synchronous MCP Tool into the portable capability-operation surface
  run it through authority -> Active View -> model projection -> UseCapability
  export one native portable capability operation as an MCP Tool

after E/G:
  export a declared Agent/Workflow service operation
  map a long-running call to an external Task/handle without equating identities
  map input_required/MRTR to RequestUserInput and correlated resume
  map selected change notifications to cache/view invalidation or a declared Event

after I:
  rerun the long-running proof with restart durability
```

The first proof excludes Resources, Prompts, Tasks, MRTR, persistent Agents, subscriptions, and broad
service export. The second excludes claims of durable recovery until I. Both live in an external MCP
adapter package and use official current SDK/wire types only at that edge.

This staged sequence gives the operation seam early architectural feedback without making MCP
fashion drive kernel ordering or forcing all protocol features into one slice.

---

## DEC-I21 — No Effect or A-C retrofit follows from interoperability

**Decision: Accepted after post-Slice-C implementation audit.**

> **Partly superseded (2026-08-31).** The conclusion below is correct *about interoperability* and
> still stands: nothing in the portable/protocol layer requires an A-C source change. But the
> sentence "Slices A-C need no source retrofit" is now read out of context, because the canonical
> rewrite made `ControllerResumption` current runtime semantics **after** this note was written. One
> A-C retrofit is required, for a reason unrelated to interoperability: Workflow model invocation
> occupies its Activation. See
> [`008-v0.4-to-v1.0-development-roadmap.md`](008-v0.4-to-v1.0-development-roadmap.md) §2.5.1 and
> [`003-implementation-audit-and-migration-plan.md`](003-implementation-audit-and-migration-plan.md)
> §18.1. The four preserved boundaries listed below are unaffected and remain accepted.

The closed Effect union remains:

```text
UseCapability
WriteMemory
SpawnExecution
SendMessage
RequestUserInput
```

No protocol symmetry exposes a missing runtime invariant. Portable Operations map to these Effects
or to local computation as appropriate. No MCP Event/Task/notification kinds are added.

Slices A-C need no source retrofit. In particular, preserve:

```text
ModelCallableDeclaration as Workflow Stage exposure/binding
ModelCapabilitySpec as provider-facing projection
LocalResource as materialized local-computation form
live access through UseCapability and Harness authorization
```

Only the D-and-later implementation plan changes.

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
information context compiler inputs
effective operation-authority ref/record
deterministic Active Operation View resolver
per-invocation operation projection + binding snapshot
model-directed continue/stop interpretation
```

The exact name of the new exposure/projection contract is not frozen by this note. Prefer a narrow
name that describes what Slice D actually needs. Avoid prematurely publishing generic names such as
`UniversalTool`, `McpOperation`, or `ServiceDescriptor` unless the implementation already supports
those semantics.

A healthy dependency path should look like:

```text
portable/intrinsic operation information
        +
effective operation authority
        ↓
Agent Active/Exposed View
        ↓
ModelCapabilitySpec
        ↓
ModelCapabilityCall
        ↓
Agent controller resolves exposed binding from the same invocation snapshot
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
large-catalog learned/LLM selector
```

These are later vertical slices. Slice D should leave clean seams for them.

---

## Review checkpoint after Slice D

> **Slice D.0 landed 2026-09-01.** The implemented shapes for every item below are recorded in
> [`009-slice-d0-implementation-decisions.md`](009-slice-d0-implementation-decisions.md). DEC-I02
> through DEC-I20 were followed as accepted; DEC-I19's cautions about the experimental checkpoint
> boundary proved to be the right call, and the bridge's remaining limitations are listed there.

After Slice D lands, review specifically:

```text
AgentSpec
effective operation-authority ownership
Agent Active/Exposed View
model-facing callable projection
projection/binding snapshot stability
capability/operation descriptor ownership
information context compiler inputs vs operation projection
Effect proposal resolution
Strands interception/bridge
```

The review question is not "does Slice D support MCP?".

It is:

> **Can the Agent kernel consume a portable operation view and produce typed Effects without knowing whether the same operation came from native code, MCP, HTTP, or another future protocol?**

If yes, Slice D is aligned. If not, fix the ownership boundary before implementing concrete MCP
integration.
