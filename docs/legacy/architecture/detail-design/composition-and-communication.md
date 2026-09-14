# Child Executions and addressed communication

> **Superseded architecture, retired 2026-09-14.** The current architecture is the [mental model](../../../../mental-model/README.md) and its [reference index](../../../../mental-model/reference.md). Phrases below such as "target contract", "current design" or "this page owns" describe this document as it stood then, not current authority; some rules here were later corrected. [What replaced it](../../README.md).

**Owner:** Kernel relationships, routing and obligations; application supervision policy.
**Status:** target K4, with K2 action foundations and K5 output-retention hardening; [protocol](execution-protocol.md) and [authority](authority-and-actions.md) are
prerequisites. Local graphs, branches, Agents and Skills live in [Runtime composition](runtime-composition.md).

## Choosing an Execution boundary

Independent addressability, authority, lifecycle, recovery, cancellation or result inspection can
justify a child Execution. Complexity, a model call, a parallel function or foreign implementation
alone does not. A whole Crew or Dify application can be one Execution. A remote service call may be
an ordinary Effect with a provider task handle rather than a child.

Keep three graphs distinct: ownership (who created/owns work), communication (who sends to whom),
and waits (which observation permits progress). An ownership tree can have arbitrary peer messaging
and cyclic waits. The application's principal relationship graph is a fourth, separately authenticated
source. No edge grants every permission represented by the others.

## Child creation and required results

Child creation is an immutable mediated request. Pin definition/Runtime revision, explicit input,
delegated authority, requested limits and selected resource/context handoff. The Kernel binds a stable
request to one child ID, parent correlation and root budget reservation. Creation receipt means the
child exists; it does not mean the child completed. A `call` helper combines creation with required
terminal-result handling; a `spawn` helper omits immediate waiting, not ownership obligations.

First K4 profile should keep these records in one transactional authority domain. If fulfillment is
asynchronous, atomically record the creation/link/budget obligation, then fulfill it idempotently with
the preallocated child ID. Neither timeout nor retry may create another child or double-charge the
budget. Do not promise sharded atomic creation before a real cross-domain protocol exists.

Children default to required owned work until their terminal result is accounted for. A parent may
continue other work but cannot complete while the required child remains unresolved. Child failure
or cancellation is an observation; it does not automatically fail the parent. Any optional detachment
must name a durable owner with accepted responsibility before releasing the parent's obligation.
The minimum release can refuse arbitrary detachment. Parent failure/cancellation still leaves
application reconciliation/supervision responsible for live children and their actions.

Terminal child result and Kernel-to-parent routing obligation commit together. A lost notification
is retried; it does not cause child execution again. If the parent is already terminal, preserve the
result and record terminal delivery disposition under the declared policy. Do not route it into the
next unrelated parent/user session. Late results cannot reopen either lifetime.

## Structural limits and supervision

Recursion is legal: a Definition appearing in ancestry is not a semantic error. Bound autonomous
expansion with root-scoped finite total spawn credits, plus optional maximum active descendants and
depth. Total credits are consumed once per accepted child creation and are not refunded when that
child finishes; otherwise infinite sequential spawning evades the bound. Active slots are released
exactly once on the relevant terminal/resource disposition. Rejected creation releases reservations
without minting credits. Descendants subdivide the same root allowance rather than resetting it.

Supervision policy specifies report/continue, cancel siblings, request child cancellation or start a
new retry Execution. Retry intensity and total work are bounded; restarting does not reopen terminal
identity or renew grants/budgets automatically. Keep policy in application/Runtime composition until
repeated use justifies a helper. Defaults must be explicit at creation; ancestry alone implies neither
a cascade kill nor immunity from one. Native grandchildren remain the native Runtime's responsibility.

## Messages and replies

Message send is an ordinary mediated Effect, not another top-level Outcome concept. It needs the
existing immutable intent, admission, denial, obligation and settlement machinery; addressed routing
specializes that machinery without adding another progress-acceptance boundary. An addressed message
carries stable sender/destination, input identity, immutable content, causation and optional request
correlation. The Kernel binds sender identity to authenticated Execution context. Authorize
destination-scoped send before exposing target/request details; ancestry and output-read permission
grant no send authority.

Accepted Effect intent creates a recoverable routing obligation; it is not send success. Success is
recorded only when the destination mailbox durably accepts the input. Retry routing with the same
input identity/content; a lost receipt must not create another mailbox entry. Destination acceptance
and sender settlement use one transaction or a recoverable idempotent obligation. Refused destination
input (including terminal or full mailbox) cannot yield a success receipt. This is one logical mailbox
acceptance, not exactly-once transport delivery or Runtime execution. The destination receives the
Event in a later eligible Activation under its wait/batch rules; an unmatched message need not wake it.
A sender requiring processing, related work or a reply must request that evidence explicitly.

For request/reply, retain a correlation record scoped to requester, permitted responder, destination,
expected reply contract, open/closed state and optional deadline. This can be a narrow record behind
ordinary Effects/Events rather than a general conversation service. `expectsReply` is valid only when
that record exists. A reply references the open request and authenticated responder; guessed IDs,
wrong peers and new replies after closure cannot settle it. An authenticated exact retry returns its
original receipt without settling twice; conflicting reuse of its identity is refused. A reply is a
reply observation, not an action settlement or a grant of authority.

Acceptance of the valid reply, closure of its request dependency and recoverable requester delivery
must be atomic or backed by an idempotent durable routing obligation. `send` completion and `ask`
completion are therefore different. A notify-only message settles at mailbox acceptance; an ask
remains required until reply, explicit expiry or abandonment. Expiry does not prove the peer did no
work. Reply content may still be untrusted or semantically wrong.

A compound `reply_and_ask` is optional library convenience. It must not advertise a second reply
expectation without creating a new correlation. Two ordered operations are the baseline. If an
atomic compound form is demanded, test close-old/open-new/deliver under one idempotent command;
do not add a Kernel session ontology to conceal missing request records.

## Child-output observation

A child can emit “Searching site A”, candidate counts or structured findings as accepted nonterminal
output. Authorized application/UI/operator observers, including a parent-facing UI, use the ordinary
[output subscription](action-lifecycle.md#authorized-output-subscriptions). Child status grants no
implicit read permission: check the observer principal's access to that Execution and disclosed
content, including on replay after restart. The Kernel supplies accepted identity/retention truth;
the output layer supplies the connection. No parent-child subscription-routing record is required.

Emission observation leaves the parent's mailbox, wait and progress unchanged. If a parent Runtime
must react, the child explicitly sends a message, or an explicitly configured application adapter
reads output and submits addressed input through authenticated ingress. Such a bridge requires both
source read/disclosure permission and destination send/input permission, including permission to
redisclose the content there. Bind its actual producer provenance and causation to the source output
ID; do not impersonate the child or turn content into trusted settlement evidence. A bridge promising
durable forwarding owns its cursor/routing checkpoint and stable destination input key across retries,
within declared retention/deduplication windows. Read authorization alone never creates that promise.
Automatic forwarding and a general output-to-input broker are outside the minimum profile.

Child completion independently creates the terminal-result routing obligation. Retried result routing
preserves one logical result input identity; parent Runtime delivery may repeat until acknowledged.
Neither observing child progress nor receiving a terminal notification means the parent processed
that result. No universal conversation, session or pub/sub abstraction follows from these boundaries.

## Waits, interleaving and human participation

A parent waiting for B can explicitly subscribe to addressed clarification input from B. Then:

```text
A creates B and waits for B result + declared clarification input
B asks A about a missing parameter
A accepts a new Activation, answers, retains B as unresolved, waits again
B completes; A accounts for the result and can complete
```

Only one current Activation writes A's progress. Runtime continuation assumptions must be revalidated
against new input; storing an old promise does not make its answer current. General all-of joins
retain seen results in Runtime progress and wait on remaining correlations. A wait cycle is a diagnostic
candidate, not proof of deadlock; timeouts, human replies or eligible messages may break it.

A human input request remains an Effect with a narrow request record, not an Emission or a separate
Outcome field. Accept its immutable intent and `await(request-key)` together under the existing
protocol; subsequent authorized admission opens one durably discoverable request. Denial/refusal
produces a correlated action observation so the wait cannot hang on a request that never opened.
The request binds stable Effect/request identity, requesting Execution, recipient eligibility,
response schema/revision, optional request expiry and one resume owner. Request disclosure and
request-creation authority are separate from responder eligibility. The application owns form UI,
notifications and external authentication; trusted ingress supplies authenticated responder facts.

```text
accepted input-request Effect + wait → authorized durable open request → application displays it
→ authenticated/schema-valid correlated response → request closure + result Event + recoverable wake
→ later eligible Activation → accepted Outcome acknowledges processing
```

Response acceptance atomically binds a stable response identity/content to the request, closes it,
settles the dependency and records the Event/readiness (or a durable idempotent routing obligation).
Restart must reconstruct the same open request and wait without redisplaying it as a new request.
Exact authenticated retries return the original receipt/disposition within the declared deduplication
window; conflicting responses, invalid schema, wrong responders and new submissions after request
expiry/closure are refused. Knowing the request ID or submitting ordinary input cannot settle it.
Displaying/delivering the form is neither a response nor Runtime processing of one.

Request expiry closes the request under ordered acceptance and yields an expiry observation; it is
separate from a wait deadline. A wait timeout alone does not close the request. The accepted response
can wake only a current wait eligible for that correlation, including a later wait deliberately
reusing the still-open dependency; it cannot revive a replaced unrelated wait generation. Preserve
early responses in the mailbox for atomic wait matching. Cancellation/terminal disposition closes or
abandons outstanding requests under policy without reopening the Execution on a late response.

Typed feedback is distinct from [exact action consent](authority-and-actions.md#exact-consent):
choosing Plan A does not approve an unbound consequential action. Native forms should retain their
native owner; a Driver maps one dependency, not a second independently resumable form.

Long-lived conversational Executions can emit many responses and wait without completing. Applications
may instead create one Execution per job/turn and keep session grouping outside the Kernel. Choose
lifetime deliberately; never reset authority/spend merely because a chat turn ended.

## Handoff and cancellation

A child receives explicit values or authorized resource references, not the parent's RuntimeStore,
private mailbox, transcript or credentials. Notes are selected copies/read-only views with a separate
child writable frame. Returned output is a contract, not implicit copying of child memory back into the
parent. [Memory/state](memory-and-state.md) owns visibility and revision semantics.

Cancelling a wait, asking to cancel a child and physically stopping it are independent operations.
Cancellation control fences future parent progress/admission; the chosen supervision policy decides
what happens to descendants and peer requests. Already admitted external work remains potentially
live. Preserve receipts, cleanup and unknown obligations after terminal cancellation.

## Prior art and K4 proof

Hermes [async delegation](../../../../../hermes-agent/tools/async_delegation.py) separates child completion,
parent-turn delivery and owner-loss uncertainty. Its
[restored ownership tests](../../../../../hermes-agent/tests/tools/test_restored_delegation_ownership.py)
are concrete counterexamples to routing by a remembered session string alone. OpenClaw
[task records](../../../../../openclaw/src/tasks/task-registry.types.ts) similarly distinguish owner,
requester, run identity and delivery status. Preserve native routing when integrating those products.

K4/E4 tests crash between intent and child fulfillment, completion before parent wait, clarification
while waiting, duplicate/wrong-owner replies, expired request plus late reply, transitive grant
revocation, terminal parent delivery, recursive credit exhaustion and cancellation with a live child.
Failures must identify routing, authority, Runtime interpretation or native cleanup as the owner.
