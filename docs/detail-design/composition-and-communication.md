# Child Executions and addressed communication

**Owner:** Kernel relationships, routing and obligations; application supervision policy.
**Status:** target K4; [protocol](execution-protocol.md) and [authority](authority-and-actions.md) are
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

An addressed message carries stable sender/destination, input identity, content, causation and optional
request correlation. Authorize destination-scoped send before exposing target/request details.
Accepted routing means the destination mailbox accepted it, **not** that a model read it or the
application acted. A sender requiring application completion must request a reply/result explicitly.

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

## Waits, interleaving and human participation

A parent waiting for B can subscribe to clarification from B. Then:

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

A human request binds recipient eligibility, input schema, request revision, expiry and one resume
owner. The application owns form UI, notifications and external authentication. Input acceptance and
request closure are ordered; exact retries return their receipt, while conflicting or new late
submissions are refused consistently. Typed feedback
is distinct from [exact action consent](authority-and-actions.md#exact-consent). Native forms should
retain their native owner; a Driver maps one subscription, not a second independently resumable form.

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

Hermes [async delegation](../../../hermes-agent/tools/async_delegation.py) separates child completion,
parent-turn delivery and owner-loss uncertainty. Its
[restored ownership tests](../../../hermes-agent/tests/tools/test_restored_delegation_ownership.py)
are concrete counterexamples to routing by a remembered session string alone. OpenClaw
[task records](../../../openclaw/src/tasks/task-registry.types.ts) similarly distinguish owner,
requester, run identity and delivery status. Preserve native routing when integrating those products.

K4/E4 tests crash between intent and child fulfillment, completion before parent wait, clarification
while waiting, duplicate/wrong-owner replies, expired request plus late reply, transitive grant
revocation, terminal parent delivery, recursive credit exhaustion and cancellation with a live child.
Failures must identify routing, authority, Runtime interpretation or native cleanup as the owner.
