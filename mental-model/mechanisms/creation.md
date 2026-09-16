# Creating an Execution and retrying the request

The application needs to distinguish a repeated request from a second intentional run. Use a [caller-scoped creation key](../concepts/identity.md#request-key-and-input-id) and immutable creation content. This page owns creation and input ingress semantics.

**Status:** Required Kernel contract. Introduced by K1.1. This is target specification, not shipped behavior.

## One atomic creation

Authenticate the caller and authorize its scope. Creation binds an Execution ID, Runtime contract, [Definition](../concepts/core.md#definition) [revision](../concepts/identity.md#revision), authority context and initial input in one accepted decision. It becomes `READY`; there is no externally visible intermediate `CREATED` state. The binding is one decision because every later question — who may act for this Execution, which code reads its progress, what its first Activation carries — is answered by these facts together; an Execution that existed before its authority or Definition was fixed would be a lifetime with no accepted meaning. No bare ID or model-supplied principal can replace authentication.

## The lost-response cases

Suppose application account A sends key `report-17` with “report for week 37.”

| What happened to the first call? | Same scope + key + content on retry |
|---|---|
| No creation committed | Creation may commit now |
| Creation committed, response lost | Return the already-created Execution and retained decision |
| Response arrived, caller repeats it anyway | Return that same Execution; do not create another |

Changing “week 37” to “week 38” under `report-17` is a conflict, not an update: the key promises "this is the same request as before", and different content breaks that promise — silently accepting it would make the retry path a way to change what an Execution is doing without anyone deciding to. Creating another intentional run requires a fresh key even with identical input. Another authenticated caller may use the same key text without colliding with A. These rules prevent duplicate logical creation; they do not prove native work ran once.

## Later input has a destination

After creation, input identity is the [Input ID triple](../concepts/identity.md#request-key-and-input-id). Acceptance records its immutable content, trusted provenance, [mailbox](../concepts/core.md#mailbox) entry and any applicable [readiness](../concepts/core.md#readiness) together. Same identity and same [logical value](../concepts/values.md#canonical-form) returns the recorded disposition; different content conflicts.

For example, A creates E with creation key `report-17`. A then sends ordinary input to E with request key `report-17`. Under the [separate identity domains](../concepts/identity.md#request-key-and-input-id), this first ingress gets its own [Event](../concepts/core.md#event) and ingress [receipt](../concepts/identity.md#acceptance-boundary-and-receipt) even if its content equals the initial input. Retrying that ingress with equal content returns its ingress receipt; changing its content under that same Input ID conflicts. Retrying creation still returns the creation decision. Capacity, authority and terminal checks continue to apply.

Reject ordinary input to a terminal Execution. Previously accepted unprocessed input has a [terminal disposition](lifecycle.md), while authenticated late action evidence still belongs to its [action ledger](actions.md). Capacity limits refuse ingress before acknowledgment.

Deduplication and receipt lookup respect the [retention contract](evidence.md#retention-and-deletion). An expired key must never silently become another consequential request — deduplication is not unlimited. The exact expired-key policy must be published.

For child creation, this same retry principle additionally covers parent [correlation](../concepts/operations.md#message-request-and-correlation) and budget reservation; [child creation](communication.md#children) owns those rules.
