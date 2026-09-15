# Children, messages and human replies

Use a [child Execution](../concepts/operations.md#child-and-ownership) when work needs independent authority, addressability, lifecycle, recovery or inspection. A parallel function, model call or foreign framework alone is not a reason. This page owns K4 interaction semantics; actions/input requests begin with K2's Effect foundations.

Keep ownership, communication and waits distinct. An ownership tree can contain peer messages and cyclic waits. None of those edges replaces authenticated application relationships or grants every permission.

**Status:** Required Kernel contract. Introduced by K4.1–K4.3. This is target specification, not shipped behavior.

## Children

Child creation is an immutable Effect binding Runtime/Definition, explicit input, delegated authority, limits and selected resource/context handoff. Bind its stable request to one child ID, parent correlation and root budget reservation. A creation receipt proves existence, not completion. `spawn` skips immediate waiting, not obligation.

The first profile uses one transactional authority domain. If fulfillment is async, record the creation/link/budget obligation atomically and fulfill it with a preallocated child ID. Retry/timeout cannot create a second child or debit twice. Cross-shard atomic creation needs a real protocol and is not promised here.

Children default to required owned work. The parent can continue other work but must account for required child results before completing. Child failure/cancellation does not automatically fail the parent. Transfer/detachment requires a named durable owner accepting responsibility; the minimum profile may refuse it. Parent failure/cancellation leaves application supervision/reconciliation responsible for live children/actions.

Commit child terminal result with parent routing or a durable routing obligation. Retrying routing does not run the child again. Destination Event acceptance, rather than source intent creation, applies the [wait wake rules](waits.md#ending-a-wait). A terminal parent receives a recorded terminal routing disposition; never redirect the result into a later unrelated session or reopen either lifetime.

## Finite expansion and supervision

Recursive Definitions are legal. Bound total autonomous expansion by root-scoped finite spawn credits; optionally also bound active descendants/depth. Consume total credit once per accepted creation and do not refund it when a child finishes. Otherwise sequential recursion can evade the bound. Descendants subdivide the root allowance. Release active slots exactly once at their terminal/resource disposition; rejected creation releases reservations without minting credit.

Creation declares supervision defaults: report/continue, cancel siblings, request child cancellation or start a new retry Execution. Bound retry intensity and total work. Retries cannot reopen terminal identity or automatically renew grants/budgets. Ancestry alone implies neither cascade kill nor immunity. Native grandchildren stay under their native Runtime owner. [Authority](authority.md) owns transitive grant revocation.

## Addressed messages and replies

Message send is an Effect carrying stable sender/destination, input identity, immutable content, causation and optional request correlation. Bind sender from authenticated Execution context and authorize destination-scoped send before exposing target details. Output-read permission and ancestry grant no send authority.

Accepted intent creates a routing obligation. Success occurs only on durable destination mailbox acceptance. Retry with the same input identity/content; lost receipts cannot create a second mailbox entry. Sender settlement and destination acceptance use a transaction or recoverable idempotent obligation. Full/terminal/refused destinations cannot yield success. An unmatched message need not wake the destination; send success does not prove processing or reply.

For request/reply, retain the [request/reply record](../concepts/operations.md#message-request-and-correlation). `expectsReply` is valid only with that record. A valid reply names the open request and authenticated permitted responder. Wrong peers, guessed IDs and new replies after closure are refused. Exact authenticated retry returns its original receipt; changed content conflicts. Accept reply, close its dependency and create requester delivery atomically or by an idempotent durable routing obligation.

A notify-only send settles at mailbox acceptance; an ask stays required until reply, explicit expiry or abandonment. Expiry is not proof the peer did no work. Reply content can still be semantically wrong. `reply_and_ask` is optional: two ordered operations are the baseline. A compound atomic API would need tested close-old/open-new/deliver semantics and cannot invent a reply expectation without a new request record.

## Interleaving a question

```text
A creates B, waits for B's result and a peer-question dependency
B asks A for a missing parameter
A handles the question, answers, and waits again for B's still-required result
B completes; A accounts for the result and may complete
```

The question retires A's whole wait, not just one alternative. A's next Outcome registers what is still needed. Local continuation assumptions must be revalidated after new input. Runtime-owned all-of joins retain seen results and wait for the rest. Cycles are diagnosable, not automatically deadlocks; deadlines or replies may break them.

## Human input requests

A human request is an Effect with immutable response schema/revision, recipient eligibility, expiry if used, requesting Execution and one resume owner. Accept its intent and same-Outcome wait together. Authorized admission then opens one durably discoverable request; denial/refusal creates a correlated observation so the wait cannot hang on a request that never opened. Request creation/disclosure permission is separate from responder eligibility. Application UI/auth owns presentation.

An authenticated, schema-valid response binds stable response identity/content, closes the request, settles its dependency and records Event/readiness atomically or through an idempotent routing obligation. Restart reconstructs the same request; displaying it again is not creating a new one. Exact retry returns the original receipt/disposition within retention. Invalid schema, wrong responder, changed reuse and new responses after closure/expiry are refused. Ordinary input cannot settle it.

Request expiry closes that request and yields an observation. Wait timeout alone does not close it. A later accepted response may wake a current wait deliberately correlated to the still-open request, but cannot revive an unrelated generation. Cancellation/terminal disposition closes or abandons pending requests under policy without reopening the Execution on a late response. Showing a form is neither a response nor acknowledgment of Runtime processing.

Human feedback is not [exact consent](authority.md#exact-action-consent). Native forms keep one owner; a Driver maps the dependency instead of creating a second form that can independently resume the same run. A conversational Execution can emit and wait many times; an application may instead create one job per turn with session grouping outside Kernel. Neither choice silently renews authority or spending limits.

## Handoff and observation

Children receive explicit values or authorized references, not private parent mailboxes, credentials, RuntimeStore or transcripts. [State handoff](state.md#notes-and-handoff) selects inherited information and a separate writable frame. Results do not implicitly copy child notes back. Parent-facing UI reads use the normal [output contract](output.md) and do not wake the parent. Cancel-wait, child-cancel request and physical stop are independent; retain receipts, unknown obligations and cleanup after cancellation.
