# MCP 2026-07-28 ↔ ArrokothI Semantic Mapping

> **Current disposition (2026-09-08):** see [future questions](../future-plan.md) Q11 and the [detail-design map](../detail-design/README.md). The sketches and captured protocol/provider observations below remain research. Old Harness/resumption/memory ownership and prototype sequences do not override the opaque Runtime target or schedule work.

> **Status: non-canonical research note.**
>
> **Protocol baseline:** MCP `2026-07-28`, checked 2026-09-02.
>
> This document inventories the current MCP surface and records provisional ArrokothI mappings.
> `TBD` means exactly that: no support commitment, kernel admission, or rejection has been made.
> Canonical ArrokothI semantics remain in [protocol mapping](../detail-design/interoperability.md),
> [authority detail](../detail-design/authority-and-actions.md), and the other owners listed in [`../README.md`](../README.md).

## 1. Research question

The adapter-design question is not merely:

> Which familiar MCP calls should ArrokothI implement?

It is:

> For every standardized MCP capability, what problem does it solve, where would that problem
> belong in ArrokothI, what is lost if it is omitted, and does the answer differ when ArrokothI is
> the MCP client versus the MCP server?

An MCP feature does not automatically deserve a first-class ArrokothI primitive. Its presence is
nevertheless evidence that the MCP project found a recurring interoperability problem worth
standardizing. Every omission should eventually receive an explicit disposition:

```text
mapped to an existing ArrokothI concept
adapter-only protocol machinery
supported through a portable-layer addition
unsupported by design, with rationale
deprecated/legacy compatibility only
TBD pending research or experiment
```

This note begins that audit. It does not finish it.

## 2. What the four MCP project components tell us

The MCP architecture page identifies four complementary project components:

| Component | Question it answers | Why it matters to ArrokothI |
|---|---|---|
| MCP Specification | What is MCP and what must interoperable clients/servers do? | Normative source for the adapter boundary. |
| MCP SDKs | How can an implementation speak MCP without rebuilding the protocol? | Implementation machinery inside the MCP adapter; SDK types do not become kernel types. |
| MCP Inspector/development tools | What does an external MCP peer actually observe? | Candidate conformance/debug/CI boundary for future import/export work. |
| Reference servers | What do concrete implementations look like? | Executable examples and experiment fixtures, not production security guidance or architecture authority. |

The most important scope statement is that MCP standardizes context exchange but does not dictate
how an AI application manages its LLM or supplied context. Therefore:

```text
MCP discovery/capability exchange
  may feed ArrokothI Catalog and portable descriptors

but does not define
  Effective Authority
  Active/Exposed View
  Model Invocation Projection
  Effect authorization
  Execution lifecycle
  memory/context selection
```

Sources:

- [MCP architecture overview](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)
- [MCP 2026-07-28 specification](https://modelcontextprotocol.io/specification/2026-07-28)
- [MCP SDKs](https://modelcontextprotocol.io/docs/2026-07-28/sdk)
- [MCP Inspector](https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector)
- [MCP example servers](https://modelcontextprotocol.io/examples)

## 3. Existing ArrokothI boundary

Current canonical direction is:

```text
Kernel semantics
  Execution / Event / Effect / authority / memory / lifecycle
        ↓
ArrokothI-owned portable interoperability layer
  Operation / Resource / service / interaction template /
  async handle / input requirement / change signal
        ↓
MCP adapter
        ↓
MCP protocol + SDK
```

The protected distinctions include:

```text
MCP Tool                 ≠ Capability or Effect
MCP Resource             ≠ memory or authority
MCP Prompt               ≠ Agent/Workflow Definition
MCP Task                 ≠ Execution or PendingOperation
MCP notification         ≠ Event
MCP elicitation          ≠ RequestUserInput identity
protocol discovery       ≠ authority grant
protocol authentication  ≠ ArrokothI Execution authority
```

The narrow MCP-1/MCP-1.1 proof already established:

```text
MCP Tool import
  -> existing CapabilityOperationDescriptor
  -> MCP-backed CapabilityExecutor
  -> ordinary UseCapability path

explicit capability-operation export
  -> MCP Tool
  -> application-supplied service handler
```

That proof is synchronous and intentionally does **not** establish support for Resources, Prompts,
Tasks, elicitation, subscriptions, OAuth, production hosting, or general dynamic refresh.

## 4. Two compatibility directions

The same MCP feature can have different answers in the two directions.

| Direction | Question |
|---|---|
| ArrokothI as MCP client | Can an ArrokothI Execution safely consume the behavior offered by an arbitrary compatible MCP server? |
| ArrokothI as MCP server | Can an explicit ArrokothI service surface provide the behavior expected by a compatible MCP client without exposing private kernel state? |

"Supports MCP" is too ambiguous unless direction, protocol version, features, extensions,
transports, and security profile are named.

## 5. Core request/notification surface

The method inventory below comes from the MCP 2026-07-28 schema reference. "Current evidence"
describes this repository, not the entire official SDK.

### 5.1 Server-provided features

| MCP method/feature | Problem it solves | Provisional ArrokothI layer/analogue | Client direction | Server direction | Current evidence / disposition |
|---|---|---|---|---|---|
| `server/discover` | Advertise versions, server capabilities, identity, instructions, and cache hints. | Adapter connection/discovery metadata feeding typed descriptor import; never authority. | General compatibility and fallback policy TBD. | General advertised-capability policy TBD. | Official SDK participates in the narrow proof; ArrokothI-owned policy is TBD. |
| `tools/list` | Discover dynamic, described, schema-bound executable functions. | MCP Tool ↔ portable Operation ↔ capability operation. | Narrow import implemented. Dynamic refresh/pagination policy TBD. | Explicit allowlisted export implemented. Broader service export TBD. | **Implemented proof** for the narrow synchronous subset. |
| `tools/call` | Invoke a named Tool with validated arguments and receive rich/structured results. | Imported operation normally resolves to `UseCapability`; portable Operation is not Effect identity. | Narrow synchronous execution implemented with outcome-certainty normalization. | Explicit handler export implemented; inbound call does not fabricate an Execution, Effect, or grant. | **Implemented proof** for supported schema/result subset. Async/MRTR/rich-block completeness TBD. |
| `resources/list` | Discover concrete URI-addressed context/data sources. | Portable Resource candidate; not automatically memory, context, or capability. | TBD. | TBD; only explicitly exported Resources could be visible. | **TBD**. |
| `resources/read` | Retrieve text/binary contents for a URI. | Capability-backed read, remote handle, materialized view, or retrieval source depending on semantics. | TBD; provenance, size, trust, and context admission require policy. | TBD. | **TBD**; do not collapse into `UseCapability` or memory prematurely. |
| `resources/templates/list` | Discover parameterized URI templates. | Portable parameterized Resource candidate. | TBD. | TBD. | **TBD**. |
| `prompts/list` | Discover reusable interaction templates. | Portable interaction template, not Agent/Workflow/Skill identity. | TBD. | TBD. | **TBD**. |
| `prompts/get` | Instantiate a prompt with arguments and return messages/content. | Local context/template construction is the likely layer; exact trust and role semantics TBD. | TBD. | TBD. | **TBD**. |
| `completion/complete` | Suggest argument values for Prompt or Resource-template references. | Descriptor/UI/ACI assistance; probably adapter or portable discovery utility. | TBD. | TBD. | **TBD**. |

### 5.2 Client-provided features and multi-round-trip input

In MCP 2026-07-28, a server does not initiate a standalone reverse RPC. It returns
`resultType: "input_required"` with `inputRequests`, and the client retries the original request
with `inputResponses` and optional `requestState`.

| MCP feature/request | Problem it solves | Provisional ArrokothI layer/analogue | Client direction | Server direction | Current evidence / disposition |
|---|---|---|---|---|---|
| MRTR / `input_required` | Pause an in-flight request for client-provided information, then retry without relying on a server-initiated request. | Portable continuation/input requirement; may interact with PendingOperation and durable wait. Not a new Effect by itself. | TBD: translate protocol continuation into safe runtime/application continuation. | TBD: project an ArrokothI continuation requirement without leaking internal state. | **TBD**; specifically deferred beyond the narrow proof. |
| `elicitation/create` form mode | Ask the user for flat schema-bound input with accept/decline/cancel outcomes. | Related to `RequestUserInput`, but protocol shape and kernel Effect are not identical. | TBD: UI ownership, schema mapping, provenance, and response actions. | TBD: map explicit input requirements to MCP MRTR. | **TBD**. |
| `elicitation/create` URL mode | Direct the user to an out-of-band sensitive or third-party authorization interaction. | External continuation/auth prerequisite, not ArrokothI authority grant or ordinary form input. | TBD: secure consent/navigation boundary. | TBD: explicit external-auth continuation surface. | **TBD**; must preserve credential and identity boundaries. |
| `roots/list` | Give servers filesystem root scope hints. | Possible adapter configuration/resource-scope input; not authority by itself. | Legacy compatibility value TBD. | Usually not applicable to a server export. | **Deprecated in MCP 2026-07-28**; new implementations SHOULD NOT adopt. |
| `sampling/createMessage` | Let a server request model inference from the client/host. | Provider/model invocation delegation; may overlap controller/service composition but is not an ArrokothI Execution automatically. | Legacy compatibility value TBD. | Usually not applicable to a server export unless acting as client too. | **Deprecated in MCP 2026-07-28**; direct provider APIs are the migration path. |

### 5.3 Notifications, cancellation, and progress

| MCP method/feature | Problem it solves | Provisional ArrokothI treatment | Current evidence / disposition |
|---|---|---|---|
| `subscriptions/listen` | Open an opt-in long-lived stream for selected catalog/resource/extension changes. | Adapter subscription/cache-invalidation mechanism; delivery to an Execution only when semantically required. | **TBD**. |
| `notifications/subscriptions/acknowledged` | Confirm the accepted filter and establish subscription correlation. | Adapter protocol bookkeeping, not an Event. | **TBD**. |
| `notifications/tools/list_changed` | Signal that the Tool catalog changed. | Invalidate imported descriptor snapshot/index and recompute candidate views as appropriate. | **TBD**. |
| `notifications/resources/list_changed` | Signal that the Resource catalog changed. | Invalidate Resource discovery cache/index. | **TBD**. |
| `notifications/resources/updated` | Signal content change for a subscribed URI. | Invalidate/re-read or deliver a selected semantic observation; not automatically an Event. | **TBD**. |
| `notifications/prompts/list_changed` | Signal Prompt catalog change. | Invalidate template discovery cache/index. | **TBD**. |
| `notifications/cancelled` | Cooperatively cancel a request or subscription stream. | Adapter cancellation correlation; mapping to PendingOperation/Execution cancellation depends on what the request represents. | **TBD**. |
| `notifications/progress` | Report best-effort progress for an in-flight request. | UI/telemetry by default; Event only if controller semantics explicitly depend on it. | **TBD**. |
| `notifications/message` | Emit request-scoped logs selected by per-request log level. | Observability only; not an Event or memory. | **Deprecated in MCP 2026-07-28** with Logging. Compatibility need TBD. |

### 5.4 Cross-cutting protocol mechanics

| Mechanic | MCP purpose | ArrokothI question | Disposition |
|---|---|---|---|
| JSON-RPC 2.0 envelopes/errors | Request/response correlation and interoperable error categories. | Adapter-only wire machinery; normalize without losing outcome certainty. | Narrow Tool proof exists; full error/conformance audit TBD. |
| Per-request protocol version, client identity, and capabilities in `_meta` | Stateless version/capability negotiation on every request. | SDK/adaptor responsibility; self-reported identity must not drive security decisions. | General compatibility policy TBD. |
| Required `resultType` | Distinguish complete, input-required, and extension-defined results. | Adapter dispatch on protocol result shape; do not turn it into a kernel result ontology automatically. | `complete` covered narrowly; other result types TBD. |
| Pagination | Bound list responses with opaque cursors. | Descriptor ingestion/discovery policy and resource limits. | Beyond SDK auto-aggregation in narrow proof: TBD. |
| Caching (`ttlMs`, `cacheScope`) | Freshness and shared/private cache guidance for discovery/read results. | Adapter cache policy; private/public cache scope must not be confused with ArrokothI authority. | TBD. |
| `stdio` transport | Local subprocess communication. | Process lifecycle, containment, config, and stderr handling in adapter/deployment layer. | Process management TBD. |
| Streamable HTTP | Remote POST/optional SSE response streaming with headers and auth. | Hosting/client transport, retry, timeout, and lost-response semantics. | Production client/server support TBD. |
| OAuth authorization | Authorize an MCP client to a remote MCP server. | External service authentication/authorization; separate from Execution authority and application principal facts. | TBD. |
| Extensions negotiation | Add optional namespaced protocol capabilities. | Adapter must preserve unknown/unsupported behavior and explicitly select extensions. | TBD. |
| Trace context in `_meta` | Carry OpenTelemetry correlation. | Observability projection only; trace IDs are not authority credentials. | TBD. |

Official sources:

- [Schema reference and complete core method index](https://modelcontextprotocol.io/specification/2026-07-28/schema)
- [Discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [Resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)
- [Prompts](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts)
- [Elicitation](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation)
- [Multi Round-Trip Requests](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)

## 6. Official extensions

Extensions are not core MCP support and require explicit client/server negotiation. They should be
audited separately from the core protocol.

| Extension | Problem | Provisional ArrokothI relationship | Disposition |
|---|---|---|---|
| Tasks: `tasks/get`, `tasks/update`, `tasks/cancel`, `notifications/tasks`, and `resultType: "task"` | Durable asynchronous handles, polling, mid-flight input, terminal result/error, cancellation, and optional updates. | External async handle may correlate to an Execution, PendingOperation, or external provider job; it is not automatically any one of them. | **TBD**, intentionally deferred until required composition/interaction/durability semantics exist. |
| MCP Apps | Interactive UI rendered inside a host. | Product/UI projection; must not define kernel Event, Effect, authority, or memory truth. | **TBD**. |
| OAuth Client Credentials | Machine-to-machine MCP authorization. | Deployment/control-plane/service authentication mechanism, not Execution authority. | **TBD**. |
| Enterprise-Managed Authorization | Enterprise IdP policy control over MCP access. | External/control-plane policy integration; relationship to application principals and authority inputs requires design. | **TBD**. |

Other future extensions must receive the same explicit classification. Supporting core MCP does not
imply support for any extension.

Source: [MCP extensions overview](https://modelcontextprotocol.io/extensions/overview) and
[Tasks extension](https://modelcontextprotocol.io/extensions/tasks/overview).

## 7. Comparison with the five current Effects

This table compares semantic problems, not method-name resemblance.

| ArrokothI Effect | Nearby MCP concept(s) | Current observation | Open question |
|---|---|---|---|
| `UseCapability` | Tool discovery/call; possibly Resource reads exposed behind a local capability | The direct implemented mapping is imported MCP Tool → capability operation → `UseCapability`. An MCP Resource is not automatically a Tool or Effect. | Which Resource access patterns remain Resources, become capability-backed reads, or materialize locally? **TBD**. |
| `WriteMemory` | No direct core primitive; Resources can expose state/context but do not define ArrokothI memory epistemics or writes. | Structured Memory field descriptions/schema may be projected through ordinary local Operations/APIs without making memory an MCP primitive. | Should any explicit portable memory service profile exist, and how would it preserve provenance, scope, trust, and authority? **TBD**. |
| `SpawnExecution` | Tool/service invocation and Tasks extension are adjacent but not equivalent. | An inbound MCP call does not fabricate an Execution. A long-running exported Agent/Workflow service could deliberately create/call an Execution and return a Task handle. | Which service interface creates versus addresses an Execution, and how are authority, ownership, cancellation, and terminal results mapped? **TBD**. |
| `SendMessage` | No direct peer-message primitive; a Tool/service operation could model an application message. | MCP request/response and notifications are protocol traffic, not ArrokothI peer communication. A2A may be a more natural opaque-agent binding. | What, if anything, should be exported as conversational service operations versus A2A? **TBD**. |
| `RequestUserInput` | MRTR `input_required` plus `elicitation/create` form/URL modes. | Strong semantic overlap exists, but accept/decline/cancel, URL mode, retry state, and runtime durable wait are not yet mapped. | Is a broader portable `ContinuationRequirement` needed, or can adapter projection use existing Effects/PendingOperations? **TBD**. |

The portable Operation layer may eventually resolve a semantic action to any Effect, but this does
not mean every MCP Tool should map to every Effect or that Effect names should be published as
Tools.

## 8. MCP 2026-07-28 version drift to preserve

Earlier MCP versions and older examples use a materially different lifecycle. For the selected
baseline, do not accidentally design against these removed calls:

| Older surface | 2026-07-28 disposition |
|---|---|
| `initialize` / `notifications/initialized` | Removed; replaced by stateless per-request metadata plus mandatory server implementation of `server/discover`. |
| HTTP session IDs / `Mcp-Session-Id` | Removed; cross-call state uses explicit server-minted handles. |
| `resources/subscribe` / `resources/unsubscribe` | Removed; replaced by `subscriptions/listen` with resource subscription filters. |
| HTTP GET notification stream | Removed; subscriptions use a long-lived POST response stream. |
| `ping` | Removed. |
| `logging/setLevel` | Removed; request-scoped log level moved to `_meta` and Logging is deprecated. |
| `notifications/roots/list_changed` | Removed; Roots itself is deprecated. |
| Core Tasks, `tasks/list`, `tasks/result` | Moved/redesigned as an official extension; current methods are `tasks/get`, `tasks/update`, and `tasks/cancel`. |
| Server-initiated reverse RPC for roots/sampling/elicitation | Replaced by the Multi Round-Trip Request `input_required` pattern. |
| SSE resumability / redelivery with event IDs and `Last-Event-ID` | Removed; a broken in-flight request is re-issued with a new request ID. |

Roots, Sampling, Logging, Dynamic Client Registration, legacy HTTP+SSE, and certain Sampling
`includeContext` values are deprecated rather than already removed. New implementation work should
not assume support; any compatibility choice remains `TBD` and must be justified.

Sources:

- [MCP 2026-07-28 key changes](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [Deprecated feature registry](https://modelcontextprotocol.io/specification/2026-07-28/deprecated)

## 9. Research and experiment backlog

Before claiming general MCP client or server compatibility, run bounded proofs for at least:

1. **Protocol conformance surface** — Inspector CLI/official conformance checks across both
   directions, including version mismatch and per-request capability behavior.
2. **Dynamic discovery** — list changes, caching, pagination, descriptor invalidation, and immutable
   model-projection snapshots.
3. **Resources** — concrete/read/template forms, provenance, content size, binary/rich content,
   trust, authority filtering, and context admission.
4. **Prompts/completion** — template trust, roles, argument completion, and separation from Agent,
   Workflow, and Skill definitions.
5. **MRTR/elicitation** — durable pause/resume, accept/decline/cancel, URL-mode security, repeated
   retries, and identity binding.
6. **Tasks extension** — mapping separately to PendingOperation, Execution-backed exported service,
   and external provider job; restart, polling, input, completion, cancellation, and lost replies.
7. **Transport/auth** — stdio subprocess containment and Streamable HTTP OAuth/control-plane policy,
   with no token passthrough or authority confusion.
8. **Outcome fidelity** — rich content, JSON-RPC versus Tool errors, consequential unknown outcomes,
   timeouts, cancellation races, and retries.
9. **Schema fidelity** — full JSON Schema 2020-12 pressure, output schemas, `$ref` resource bounds,
   and refusal rather than silent weakening.
10. **Legacy compatibility** — whether supporting deprecated or pre-2026 servers provides enough
    value to justify its complexity and security surface.

For every experiment, record:

```text
MCP feature and exact version
direction: import/client or export/server
semantic problem
ArrokothI owner/layer
authority and identity consequences
runtime/durability consequences
what fails or becomes non-interoperable if omitted
result: mapped / adapter-only / portable addition / unsupported / TBD
conformance evidence
```

## 10. Current conclusion

The narrow Tool proof supports the current architecture: an MCP adapter can reuse the portable
operation and CapabilityExecutor seams without introducing MCP vocabulary into core.

It does **not** justify reducing MCP to `tools/list` + `tools/call`, nor does it justify redesigning
all Effects as MCP functions. The remaining MCP surface contains distinct problems—resource
addressability, reusable templates, multi-round-trip input, change signals, caching, pagination,
transport/authentication, and durable async handles—that require explicit study at their correct
layer.

The working rule is therefore:

> Every MCP core feature and intentionally considered extension receives an explicit ArrokothI
> disposition in both directions. Until evidence or an accepted decision exists, the disposition
> remains `TBD`.
