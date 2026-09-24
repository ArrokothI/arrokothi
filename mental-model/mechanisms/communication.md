# Children, messages and human replies

Use a [child Execution](../concepts/operations.md#child-and-ownership) when work needs independent authority, addressability, lifecycle, recovery or inspection. A parallel function, model call or foreign framework alone is not a reason. This page owns K4 interaction semantics; actions/input requests begin with K2's Effect foundations.

Keep ownership, communication and waits distinct. An ownership tree can contain peer messages and cyclic waits. None of those edges replaces authenticated application relationships or grants every permission.

**Status:** Required Kernel contract. Introduced by K4.1–K4.3. This is target specification, not shipped behavior.

Three ways one Execution can involve someone else, each with a different obligation attached. A **child** is work this Execution owns and must account for. A **message** is input addressed to a peer, which may or may not be waiting for it. A **human input request** is a durable question put to a person, who may answer hours later or never. The two sections between them cover what keeps children from multiplying without bound, and what a question interleaved into an existing wait does to that wait. Throughout, ownership, communication and waiting stay separate axes: owning a child does not mean waiting for it, and waiting for a peer does not mean owning it.

## Children

Child creation is an immutable [Effect](../concepts/actions.md#effect) binding Runtime/[Definition](../concepts/core.md#definition), explicit input, delegated authority, limits and selected resource/context handoff. Bind its stable request to one child ID, parent correlation and root budget reservation. A creation [receipt](../concepts/identity.md#acceptance-boundary-and-receipt) proves existence, not completion. `spawn` skips immediate waiting, not obligation.

The [first profile](../concepts/operations.md#operating-profile-and-durability) uses one transactional authority domain. If fulfillment is async, record the creation/link/budget obligation atomically and fulfill it with a preallocated child ID. Retry/timeout cannot create a second child or debit twice. Cross-shard atomic creation needs a real protocol and is not promised here.

Children default to required owned work: the safe default is that somebody is still answerable for work that was started, and detaching from it has to be a decision rather than an oversight. The parent can continue other work but must account for required child results before [completing](lifecycle.md#completion-is-an-accounting-check). Child failure/cancellation does not automatically fail the parent. Transfer/detachment requires a named durable owner accepting responsibility. Support for detachment is optional; an implementation without it refuses detachment. Parent failure/cancellation leaves application supervision/reconciliation responsible for live children and actions; that owner may be an existing application service or an operator queue, and need not be another Execution or a new supervisor service.

Commit child terminal result with parent routing or a durable [routing obligation](../concepts/operations.md#observation-cursor-and-routing). Retrying routing does not run the child again. Destination Event acceptance, rather than source intent creation, applies the [wait wake rules](waits.md#ending-a-wait). A terminal parent receives a recorded terminal routing disposition; never redirect the result into a later unrelated session or reopen either lifetime.

## Finite expansion and supervision

Recursive Definitions are legal. Bound total autonomous expansion by root-scoped finite spawn credits; optionally also bound active descendants/depth. Consume total credit once per accepted creation and do not refund it when a child finishes. Otherwise sequential recursion can evade the bound: a Definition that spawns one child, waits for it, then spawns another would return to full credit every time and run forever inside a limit that was supposed to stop it. Descendants subdivide the root allowance. Release logical active-child slots exactly once at their terminal disposition; physical compute slots require their own [resource release evidence](resources.md#capacity-cancellation-and-retention). Rejected creation releases reservations without minting credit.

Supervision separates policy choice from reliable execution of that choice. The application or Runtime decides how to respond to failure. The Kernel preserves child links, required-work accounting, accepted control decisions and their outstanding routing obligations. A policy stored only in the parent's live Runtime cannot discharge obligations after that Runtime has stopped.

Declare two decisions separately, even when both use the minimum report-and-retain behavior:

| Trigger | Policy owner and consequence |
|---|---|
| Child fails or is cancelled while the parent is live | Route its terminal observation. The parent Runtime decides whether to continue, fail, request sibling cancellation or propose a replacement child. A failure observation does not itself choose any of those actions. |
| Parent becomes terminal while a child remains live | Apply the declared parent-close disposition and preserve the responsible application reconciliation owner. Retaining the child keeps it running with an accountable owner; requesting cancellation uses the child's ordinary authorized control path. Neither proves physical termination. |

An implementation may support only reporting child results and retaining outstanding work under the responsible application owner; it must state that default and refuse unsupported automatic policies. Parent success still requires the [completion accounting check](lifecycle.md#completion-is-an-accounting-check); a parent-close policy cannot silently detach required children to make `complete` pass. Ancestry alone implies neither cascade cancellation nor permission to control a child or sibling. [Authority](authority.md) owns transitive grant revocation.

When parent closure requires follow-up control or routing, commit that obligation with the terminal transition, or retain enough committed information to reconstruct it without running the terminal parent again. Bind the trigger, policy/version, exact child identity, responsible principal and stable control request identity. Retrying fulfillment must neither create a second child nor apply control to an unrelated replacement. Record pending, accepted, refused or unresolved fulfillment separately from the child's lifecycle and native stop evidence. Recheck authority when admitting a new control; refusal leaves a visible obligation for its owner, not an invented success. An application worker may fulfill this record through existing Kernel controls; no universal policy interpreter is required inside Kernel.

A policy-driven retry of terminal child work creates a new Execution with explicit causation, authorized input and a new budget debit. Bound attempts and total work across the replacement lineage; do not reset root credits when a replacement finishes or a supervisor restarts. Driver recovery of the same unresolved Activation and native provider retries are different operations governed by [recovery](recovery.md). Retrying a child does not authorize repetition of an unknown external action from the prior child. Preserve that action's original evidence and reconciliation owner.

Native grandchildren stay under their native Runtime owner unless explicitly created as Kernel children. A native framework's stop tree or retry loop is declared in the [Driver support record](integration.md#support-record), not inferred from a matching parent ID.


## Addressed messages and replies

A child is created by its parent. A peer already exists, which changes what sending to one can promise: the destination has its own lifetime, its own mailbox and its own idea of what it is waiting for, none of which the sender controls.

[Message](../concepts/operations.md#message-request-and-correlation) send is an Effect carrying stable sender/destination, input identity, immutable content, causation and optional request correlation. Bind sender from authenticated Execution context and authorize destination-scoped send before exposing target details. Output-read permission and ancestry grant no send authority.

Accepted intent creates a routing obligation. Success occurs only on durable destination [mailbox](../concepts/core.md#mailbox) acceptance. Retry with the same input identity/content; lost receipts cannot create a second mailbox entry. Sender settlement and destination acceptance use a transaction or recoverable idempotent obligation. Full/terminal/refused destinations cannot yield success. An unmatched message need not wake the destination; send success does not prove processing or reply. Delivery and attention are different achievements: the message is in the mailbox either way, and whether anything happens next depends on what the destination is waiting for.

For request/reply, retain the [request/reply record](../concepts/operations.md#message-request-and-correlation). `expectsReply` is valid only with that record. A valid reply names the open request and authenticated permitted responder. Wrong peers, guessed IDs and new replies after closure are refused. Exact authenticated retry returns its original receipt; changed content conflicts. Accept reply, close its dependency and create requester delivery atomically or by an idempotent durable routing obligation.

A notify-only send settles at mailbox acceptance; an ask stays required until reply, explicit expiry or abandonment. Expiry is not proof the peer did no work. Reply content can still be semantically wrong. `reply_and_ask` is optional: two ordered operations are the baseline. A compound atomic API would need tested close-old/open-new/deliver semantics and cannot invent a reply expectation without a new request record.

## Interleaving a question

```text
A creates B, waits for B's result and a peer-question dependency
B asks A for a missing parameter
A handles the question, answers, and waits again for B's still-required result
B completes; A accounts for the result and may complete
```

The question retires A's whole wait, not just one alternative. A's next [Outcome](../concepts/core.md#outcome) registers what is still needed. Local continuation assumptions must be revalidated after new input. Runtime-owned all-of joins retain seen results and wait for the rest. Cycles are diagnosable, not automatically deadlocks; deadlines or replies may break them.

## Human input requests

A person is not a service. The response may come in seconds or next week, the process holding the request will probably restart in between, and the same question must not turn into two forms that can each resume the run. That is why a human request is a durable object with one owner rather than a callback.

A human request is an Effect with immutable response schema/revision, recipient eligibility, expiry if used, requesting Execution and one resume owner. Accept its intent and same-Outcome wait together. Authorized admission then opens one durably discoverable request; denial/refusal creates a correlated observation so the wait cannot hang on a request that never opened — a wait for an answer that was never going to be asked for would otherwise sit there until its deadline, or forever if it has none. Request creation/disclosure permission is separate from responder eligibility. Application UI/auth owns presentation.

An authenticated, schema-valid response binds stable response identity/content, closes the request, settles its dependency and records Event/[readiness](../concepts/core.md#readiness) atomically or through an idempotent routing obligation. Restart reconstructs the same request; displaying it again is not creating a new one. The form a person sees is a view of a durable request, so rendering it twice costs nothing and answering it twice is refused by the request's own closure. Exact retry returns the original receipt/disposition within [retention](../concepts/state.md#retention-pin-and-tombstone). Invalid schema, wrong responder, changed reuse and new responses after closure/expiry are refused. Ordinary input cannot settle it.

Request expiry closes that request and yields an observation. Wait timeout alone does not close it. A later accepted response may wake a current wait deliberately correlated to the still-open request, but cannot revive an unrelated generation. Cancellation/terminal disposition closes or abandons pending requests under policy without reopening the Execution on a late response. Showing a form is neither a response nor acknowledgment of Runtime processing.

Human feedback is not [exact consent](authority.md#exact-action-consent). Native forms keep one owner; a [Driver](../concepts/core.md#execution-driver) maps the dependency instead of creating a second form that can independently resume the same run. A conversational Execution can emit and wait many times; an application may instead create one job per turn with session grouping outside Kernel. Neither choice silently renews authority or spending limits.

## Handoff and observation

Children receive explicit values or authorized references, not private parent mailboxes, credentials, RuntimeStore or transcripts. [State handoff](state.md#notes-and-handoff) selects inherited information and a separate writable frame. Results do not implicitly copy child [notes](../concepts/state.md#working-notes) back. Parent-facing UI reads use the normal [output contract](output.md) and do not wake the parent. Cancel-wait, child-cancel request and physical stop are independent; retain receipts, unknown obligations and cleanup after cancellation.
