# Mapping external protocols and services

Protocol adapters sit at application, [Driver](../concepts/core.md#execution-driver) or [operation](../concepts/actions.md#operation) interfaces. They do not become additional Kernel lifecycle writers. This page defines mapping obligations, not a blanket MCP/A2A standards-support claim. Which adapters exist in code today is a status question the [implemented baseline](../../docs/development/002-implemented-kernel-baseline.md) answers, not this page.

**Status:** Adapter obligation, demand-gated. No broad protocol parity before S1 states the tested subset. This is target specification, not shipped behavior.

An external protocol arrives with its own vocabulary, and the temptation is to adopt it wholesale because the words line up. They rarely mean the same thing: a remote "task" may be an action, a job or a whole Execution depending on what it actually owns. The page works outward from that problem — what may be imported and exported at all, whether values survive the round trip intact, what each external surface can legitimately map to, and how a remote system is allowed to wake an Execution. Nothing here is parity with any protocol; it is what an adapter must preserve to claim it mapped one faithfully.

## Import and export

Import authenticates endpoint/account, obtains metadata within allowed discovery, validates it and maps stable identities. Remote descriptions/schemas are untrusted: they are authored by the other side, so a tool description is a claim about what a tool does, not a reason to let it do that. Discovery cannot grant [authority](../concepts/actions.md#principal-and-authority), copy credentials into Runtime state or authorize arbitrary server-selected destinations.

Export explicitly selects public operations/resources/service contracts. Authenticate create/input/inspect/cancel/subscription and map caller policy to bounded Execution authority. Do not reflectively export arbitrary [Effects](../concepts/actions.md#effect), private [History](../concepts/state.md#execution-history), tools, peer topology or memory. Handles and trace IDs are not bearer permissions.

Reuse shared descriptors only where actual adapters need identical semantics. Operation identity/schema/certainty is required now for mediated actions; a universal hierarchy of Operations, Resources, Services, Skills and Templates is not. SDK helpers may hide Effect boilerplate while keeping ordinary parsing/transforms local.

## Value and schema fidelity

Two schemas that name the same fields can still disagree about which values they accept, and the disagreement surfaces as one side refusing what the other sent. This section is about keeping a mapping honest about what it actually preserves.

Declare schema dialect, supported keywords, [value limits](../concepts/values.md#fixed-semantic-limits) and normalization. Prefer mature validators; disable mutation/default/coercion unless part of the pre-consent contract. Support declared scalar/array/null outputs rather than forcing objects or model prose. Preserve rich blocks through references or explicitly refuse them.

A lossless mapping preserves value meaning and equivalent accepted input sets. A narrower model-facing schema is a documented restriction, not a replacement for actual action validation. Unknown-property defaults can change acceptance even when property types match: two schemas can declare the same fields and still disagree about whether `{"name": "a", "extra": 1}` is valid, so one side accepts what the other refuses. Unknown keywords need explicit supported/ignored/refused policy; security constraints cannot be ignored. New operation versions cannot reinterpret [approval](authority.md#exact-action-consent).

HTTP success is transport evidence, not semantic completion: a 200 says the request reached a server and got an answer, not that the thing the request asked for happened. A malformed response after possible execution stays uncertain, unless the adapter can separate “it ran” from “the result is invalid” — in which case record both. Native status words must be translated by meaning.

## Mapping worksheet

The middle column is deliberately plural. Each external surface has more than one honest local meaning, and choosing between them is the adapter's design decision — an MCP Tool can be a native tool the Kernel never sees or a mediated operation it governs, and those are different products. The right-hand column is what the choice must preserve either way.

Verify these possibilities against each adapter's pinned protocol version:

| External surface | Possible local meaning | Preserve |
|---|---|---|
| MCP Tool | Native tool or mediated operation | Stable identity, schema, exact arguments, owner/certainty |
| MCP Resource | Native/application resource or mediated read | Access owner, version and retention |
| MCP Prompt | Parameterized context template | Untrusted provenance and parameters; no grant |
| MCP Task / external job | Action handle or managed native job | Submit identity, endpoint/account, [recovery](recovery.md)/cancel/state mapping |
| MCP elicitation | Native/application input or correlated [request](communication.md#human-input-requests) | One resume owner, schema, expiry, authenticated respondent |
| A2A service / Agent Card | Selected opaque service | Endpoint/auth and supported interactions, not internals |
| A2A Task / Message / Artifact | Task, turn or deliverable | Lifetime/session distinction, typed result/pause/unknown, access |
| HTTP/queue/webhook | Transport | Authentication, identity scope, retries, acceptance and ordering |
| UI/telemetry protocol | Projection | Origin, version/cursor, accepted versus provisional status |

A remote export job can remain one Effect with a handle; a whole native agent job can be an Execution. An external session groups interactions without deciding Kernel lifetime. Prefer native protocol SDKs and do not rename internal messages as remote tasks merely for uniformity.

## Authentication and notifications

Remote systems want to tell an Execution that something happened. That is useful and is also the most direct route into a mailbox from outside, so the question of which notifications become Events, and on whose authority, is answered here rather than left to the transport.

Remote login, semantic input and exact action approval are different prerequisites. Reauthorize the resumed account/resource; login to another account changes the binding. Notifications can refresh metadata/UI without entering an Execution [mailbox](../concepts/core.md#mailbox). Create [Events](../concepts/core.md#event) only under authorized semantic subscriptions. Authenticate callback origin and original endpoint/account/task; payload cannot choose a different settlement target.

Promised durable wake needs retained [routing](../concepts/operations.md#observation-cursor-and-routing)/subscription obligations and supported query reconciliation for dropped notifications. Polling/backoff is adapter policy. Missing/expired handles or lost connection do not prove external failure; distinguish unsupported resume, unknown work, incomplete results and explicit cancellation.

Instruction-only [Skill](../concepts/roles.md#skill-and-package) export can preserve instructions; composition export may need a service or a declared lossy mapping. Before support, test round-trip actual values, unsupported schemas, non-object output, duplicate/out-of-order/wrong-owner callbacks, late replies, replay gaps, task versus final result and upgrades. Broader MCP/A2A parity is demand-gated, not a K1–K5 prerequisite. S1 states the tested subset.
