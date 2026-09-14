# Protocol and service mappings

> **Superseded architecture, retired 2026-09-14.** The current architecture is the [mental model](../../../../mental-model/README.md) and its [reference index](../../../../mental-model/reference.md). Phrases below such as "target contract", "current design" or "this page owns" describe this document as it stood then, not current authority; some rules here were later corrected. [What replaced it](../../README.md).

**Owner:** application/Driver/operation adapters, under [Execution](../execution.md) and
[Deployment](../deployment.md). **Status:** integration design; only the narrow 0.8.x MCP Tool proof
is implemented. Broader protocol support is demand-gated, not a standards-compliance claim.

## Describe a boundary once where useful

An operation describes an invocable contract; an Effect is a concrete request. A resource describes
addressable content/state; its identifier is not read permission. A service exposes selected inputs,
results and interaction patterns without exposing its definition, tools or private state. An interaction
template supplies authoring/context input. A Skill packages behavior/resources. An async handle
correlates work. These ordinary distinctions remain useful without a mandatory hierarchy of Kernel types.

Reuse a shared descriptor only when it removes duplicated semantics in actual adapters. Operation
identity/version, schemas and certainty are needed for mediated actions now; a universal catalog of
Operations/Resources/Services/Skills/Templates is not. [Runtime integration](runtime-integration.md)
owns native fidelity; [action lifecycle](action-lifecycle.md) owns attempts and settlement.

## Import and export

Import authenticates the remote endpoint/account, obtains metadata under allowed discovery scope,
validates it, maps stable identities and refuses unsupported semantics. Provider descriptions/schemas
are untrusted data. Importing or discovering a service cannot grant authority, copy its credentials
into a Runtime or authorize arbitrary server-selected destinations.

Export explicitly selects public operations/resources/service contracts. Authenticate every
create/input/inspect/cancel/subscription call. Map caller policy to the bounded authority of newly
created work; never expose arbitrary Effects, private History, native tools, peer topology or memory
through reflective export. Application IDs, native handles and trace IDs are not bearer permissions.

A plain SDK function may hide Effect boilerplate while preserving admission. Ordinary local parsing,
validation and transforms stay ordinary code. Protocol servers are application-facing adapters, not
additional Kernel lifecycle writers.

## Schema and value fidelity

Declare dialect, supported keywords, value limits, input/output schema and normalization. Use mature
validators with mutation/default/coercion disabled unless explicitly part of the pre-consent contract.
Support JSON scalar/array/null results where declared; do not force every output into an object or
convert it to model prose. Large/rich content uses declared application references or explicit refusal,
not silent dropping of blocks.

For a claimed lossless projection, source and target must accept equivalent input sets and preserve
value meaning. A provider-facing narrower schema is allowed only as a documented restriction; the
actual action validator still enforces the full supported contract. For example, differing defaults
for unknown object properties can widen or narrow acceptance even when property types look identical.
Unknown keywords require an explicit supported/ignored/refused policy; security-relevant constraints
cannot be ignored. A new operation revision cannot reinterpret an old approved request.

Malformed response after possible execution preserves unknown certainty, or known execution evidence
plus invalid result where distinguishable. HTTP success is transport evidence, not semantic completion.
Native completion words are translated by meaning rather than copied as Kernel states.

The existing [MCP importer](../../../../packages/interoperability/mcp/src/import/importer.ts),
[schema translator](../../../../packages/interoperability/mcp/src/schema/from-json-schema.ts) and
[result normalizer](../../../../packages/interoperability/mcp/src/import/result.ts) are narrow implementation
evidence, indexed in [the baseline](../../../development/002-implemented-kernel-baseline.md#13-current-mcp-proof).
Keep their refusal and certainty regressions during migration; they do not prove broader Task support.

## Mapping worksheet

These are conceptual mappings to verify against the **pinned protocol version** used by an adapter,
not an assertion that every server supports every feature.

| External surface | Possible local meaning | Information that must survive |
|---|---|---|
| MCP Tool | Native tool or mediated operation | Identity, schema, actual action owner, exact arguments and certainty |
| MCP Resource | Native/application resource or mediated read | Owner/access, content version, retention; no credentials in descriptor |
| MCP Prompt | Parameterized Runtime/application context template | Untrusted content provenance, explicit parameter handling; no grant |
| MCP Task / external job | One operation's external handle or a managed native job | Submit identity, endpoint/account, state mapping, recovery/cancel limitations |
| MCP elicitation / input request | Native/application input or correlated wait | One request/resume owner, schema, expiry, authenticated respondent |
| A2A service / Agent Card | Explicit opaque service interface | Endpoint/auth, input/result and supported interactions; not definition internals |
| A2A Task / Message / Artifact | External task, conversation turn, deliverable | Task versus session grouping, typed result/pause/unknown, artifact access |
| HTTP/queue/webhook | Transport for any selected boundary | Idempotency scope, ingress authentication, acceptance receipt, retries/ordering |
| UI/event/telemetry protocol | Projection of accepted or provisional facts | Origin, cursor, version and confidence; not another source of Kernel truth |

A protocol Task need not be an Execution: a remote export operation can remain one Effect whose
adapter owns a task handle. A managed native Agent may be a whole Execution. An A2A context/session
ID groups interactions without prescribing Kernel lifetime. Use native API/protocol SDKs at these
boundaries; do not replace internal child/message semantics with remote task terminology for uniformity.

## Input, authentication and change signals

Remote authentication required, semantic input required and exact action confirmation are different
requirements. Authentication can unblock a previously authorized operation without granting new power.
Bind the resumed remote account/resource and reauthorize; a successful login to a different account
is not an interchangeable continuation.

Notifications can invalidate catalogs, update a native task cache or drive UI without entering any
Execution mailbox. Create an Event only for an authorized semantic subscription. Authenticate callbacks
and correlate the original endpoint/account/task; the payload cannot choose another settlement target.
Persist subscription/routing obligations when promising durable wake, and reconcile dropped notifications
through supported native query APIs. Polling intervals and backoff are adapter policy.

An expired/missing task or lost connection does not establish external failure. Map unsupported resume,
unknown work, incomplete result and explicit cancellation separately. Task status, task delivery and
Kernel completion are different observations.

## Packages and support gates

Instruction-only Skills can map to existing package conventions; composition-backed packages may need
an explicit service export or a declared lossy mapping. Requested tools remain requests, signatures
prove provenance rather than permission, and private state/secrets are not portable assets. See
[Runtime composition](runtime-composition.md#skills-and-packages).

Before a new binding is supported: round-trip actual values; test malformed/unsupported schemas,
non-object outputs, duplicate/out-of-order callbacks, wrong-owner handles, late/expired human replies,
reconnect/retention gaps, task-versus-final-result mapping and one version upgrade. MCP/A2A parity is
not a K1–K5 dependency. R1 uses whatever native boundary best preserves behavior; S1 states the tested
subset. Broader descriptors/protocols remain questions in [future plan](../../../future-plan.md).
