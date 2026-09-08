# Interoperability and protocol mapping

This document preserves useful interoperability design under the current [`Kernel`](../kernel.md), [`Execution`](../execution.md), and [`Deployment`](../deployment.md) architecture.

Interoperability is projection and translation. External protocols/frameworks do not define Kernel semantics.

## Kernel side

### Small portable boundary

The Kernel needs only the portable concepts required for its guarantees:

- Execution identity and accepted inputs;
- Activation/Outcome exchange;
- Events and correlated waits;
- mediated operation identity/input/output/certainty;
- authority and consent at action admission;
- child/message operations when used;
- accepted result/history/recovery evidence.

It does not require one universal representation for every provider session, graph, prompt, resource, Skill, task, or channel.

### Operation contract

A portable mediated operation should carry enough stable information for validation and settlement, such as:

- operation identity and revision;
- input schema/dialect or declared accepted subset;
- output schema/normalization rule where relevant;
- consequentiality/idempotency/reconciliation information needed by the action gateway;
- resource identity/revision when semantically required.

Protocol metadata never grants authority. The Kernel checks the concrete action under current policy.

### Resources

A resource is an application/service object that may be referenced or accessed. Resource identity is not automatically authority or a credential.

The Kernel may mediate resource operations without defining a universal Resource object model. Add portable resource descriptors only when multiple real integrations need the same semantics.

### External async work

An external task/job handle is not automatically an ArrokothI Execution or checkpoint.

A Driver may map it to:

- a still-running native job referenced by Runtime progress;
- a child Execution when independent Kernel management is actually required;
- an application-owned external task/service.

The mapping must declare retry, reattachment, cancellation, and lost-handle behavior.

### Settlement and notifications

Only trusted integration ingress may assert an Effect settlement or other Kernel-owned observation. A protocol notification becomes an Event only when it has semantic meaning for the addressed Execution.

Transport delivery, HTTP success, or receipt of a provider message is not automatically Execution completion.

## Execution side

### Driver fidelity

The Execution Driver translates between ArrokothI and a native Runtime without flattening native cognition or graph semantics.

A supported Driver should declare the dimensions in [`../execution.md`](../execution.md#driver-contract): identity, input acceptance, progress, recovery, actions, interaction/output, cancellation, resources, and upgrade compatibility.

Prefer an identity/thin adapter when the native Runtime already exposes a useful run/task boundary.

### MCP

MCP belongs at an application/Driver/operation-adapter boundary.

Useful mappings are:

| MCP concept | ArrokothI treatment |
|---|---|
| Tool | native Runtime tool, or Kernel-mediated operation when explicitly routed through the action gateway |
| Resource | application/native resource; access may be mediated if the application requires it |
| Prompt/template | Runtime/application authoring input, not Kernel semantics |
| Task / long-running handle | native async handle or application task; only becomes a child Execution when independently managed by Kernel |
| Elicitation/input requirement | Runtime/application interaction that may be represented as a correlated Kernel wait when durable ownership is needed |
| Notification/subscription | becomes an Event only when semantically relevant to an Execution |

Import/export must preserve schema acceptance and outcome certainty. A protocol adapter must not turn a possible consequential success into definite failure simply because the wire response is malformed or lost.

Current 0.8.x synchronous MCP Tool support is implementation evidence, not a requirement to make all MCP objects Kernel primitives.

### A2A and other Agent protocols

A2A is most naturally an external Agent/service boundary. Use it when ArrokothI calls or exposes an opaque Agent service.

Do not replace internal Kernel child/message semantics with a protocol-specific Task/Message model. Map between the two at the edge when a real integration requires it.

The same principle applies to HTTP, gRPC, queues, webhooks, and SDK calls: wire syntax may vary while Kernel acceptance/action semantics remain stable.

### Skills and package manifests

A Skill/package manifest may describe instructions, code, resources, compatibility, and requested/recommended operations.

Requested capabilities are composition inputs, not grants. Importing a Skill must not widen Execution authority merely because the manifest says a tool is allowed or required.

A universal Skill packaging format is not required for 1.0. Preserve native provider packages when translation would lose behavior.

### Schemas

Prefer an established schema dialect/library rather than inventing one. JSON Schema is the current likely portable choice, but each supported boundary must state its accepted subset and rejection behavior.

Provider-facing schemas may be narrower projections. They do not replace validation at the actual governed operation boundary.

### Provider/native services

A foreign system may already own sessions, delivery, environments, forms, graphs, checkpoints, or tool registries. Reuse those mechanisms where possible.

Examples already linked from the canonical docs include:

- CrewAI Flow/Crew execution machinery;
- OpenClaw task ownership and delivery reconciliation;
- Hermes context, tool, delegation, and environment machinery;
- Dify application graph, pause state, forms, and resource bindings.

The goal is to compose useful systems, not to import every native abstraction into ArrokothI.

## Deployment placement

Protocol servers/clients run where their credentials and trust boundaries make sense:

- an MCP client inside a trusted Runtime performs native/ambient actions unless routed through Kernel mediation;
- an operation adapter outside an isolated Runtime may hold privileged credentials and expose a narrow Effect bridge;
- a server exposing Execution APIs must authenticate create/input/inspect/cancel independently;
- user/channel delivery can remain in an application or provider that already owns it.

See [`../deployment.md`](../deployment.md) for physical trust/isolation and process placement.

## Preserve vs retire from the previous model

| Previous idea | Current treatment |
|---|---|
| Kernel semantics separate from protocol objects | Preserve |
| Operation schema/identity and honest outcome certainty | Preserve |
| External auth separate from Kernel authority | Preserve |
| MCP/A2A mappings at the boundary | Preserve as integration design |
| External async handle not automatically Execution | Preserve |
| Rich universal Operation/Resource/Service/Skill taxonomy | Demand-gated; not Kernel requirement |
| General protocol-neutral service hierarchy in core | Retire from 1.0 unless multiple consumers prove it |
| Universal Agent/Workflow import IR | Retire; prefer native Driver/service boundary |

Current implementation evidence is indexed in [`../development/002-implemented-kernel-baseline.md`](../development/002-implemented-kernel-baseline.md). Historical interoperability design remains in [`../mental-model-legacy/interoperability.md`](../mental-model-legacy/interoperability.md).
