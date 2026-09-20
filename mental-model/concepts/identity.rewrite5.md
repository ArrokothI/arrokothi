# Identity, attempts and accepted versions

The Kernel keeps deciding, for one thing after another, whether it is looking at the same thing it has seen before. Is this the same request the caller sent us a moment ago? Is this the same effort at answering that request? Is this the same accepted state we already committed? Is this proof that the answer has been recorded? Each of those is a different question with a different scope and a different answer, and each answer has its own name. This page defines those names, and its whole subject is why they cannot borrow each other's meanings without breaking something specific.

## A running example

Follow one Execution through the terms once before the definitions themselves.

Application account A creates an Execution E for the weekly report. A picks the caller-scoped creation key `report-17` for the request, so that if the create call is retried, the Kernel can tell it is the same request. The creation is accepted; E now exists, and the accepted decision leaves behind a creation receipt.

E's first Activation A1 goes out. It carries pinned progress at revision 0 under writer epoch 1, and the Runtime attempt working under that epoch is the one currently authorized to commit an answer. The Runtime drafts the report and submits an Outcome. The Kernel accepts it; progress advances to revision 1, and that acceptance leaves behind an Outcome-acceptance receipt at its own boundary.

Now the attempt goes quiet. An operator investigates, decides the original host may no longer commit, and authorizes takeover. The Activation ID does not change — the question is still the same question — but the writer epoch advances to 2, and a new Runtime attempt is authorized under that new epoch. Suppose the original host now reconnects and submits its Outcome after all. The submission arrives against Activation A1, which is correct, but at epoch 1, which is no longer the authorized epoch, and the whole Outcome is rejected. Nothing about its content decides that; the epoch does.

The epoch-2 attempt eventually returns an Outcome. The Kernel accepts it. Progress moves to a new accepted revision — a fact about the Kernel's own record, decided by the Kernel, not by any counter the Runtime keeps. The next dispatch is a genuinely new question — new inputs, new pinned progress — so it is a new Activation A2 with a fresh Activation ID.

Later, A sends ordinary input to E and reuses the string `report-17` as the request key on that input. The text collides with the creation key, but no rule is violated: creation and post-creation input belong to separate identity domains, so this is a fresh ingress request with an ingress receipt of its own, not a replayed creation.

Every remaining section on this page is about one of those moves. The examples specialize; the terms do not.

## Request key and Input ID

Two questions this section keeps separate: whether the caller is retrying an existing request, and whether two different callers who chose the same short label are talking about the same thing.

A **request key** is a caller-chosen identifier the caller reuses when retrying one intended request. `report-17` in the running example is one. Its whole purpose is to let the Kernel tell a retry from a second intentional request.

A request key is not a content hash. Two intentional requests can carry identical content — two different reports, each 400 words, each about the same subject, each phrased the same way — and must still be distinguishable. Deriving the key from content would collapse them into one accepted request and lose the second entirely. So the caller picks the key, deliberately, and the caller's decision to reuse it is the promise "this is the same request I sent last time."

An **Input ID** is the triple `(authenticated producer namespace, destination Execution ID, producer request key)`. It is what the Kernel actually uses to decide whether two ingress arrivals are the same request; the request key alone is not enough.

Each field of the triple is doing something the others cannot. The namespace comes from the trusted principal context — who authenticated as the sender, in whatever scope authentication uses. That is where it must come from and nowhere else: a `user_id` in a payload is text a model or a caller wrote, and pretending it authenticates anyone is exactly the confusion this whole triple exists to prevent. The destination Execution ID is what stops two producers from colliding when they send to different Executions: the same producer sending `17` to Execution E and to Execution F names two different inputs. And the request key is what stops the same producer's retry to the same Execution from being read as a second intentional request.

A **caller-scoped creation key** applies the same idea before an Execution exists. There is no destination Execution ID yet, so the scope is the authenticated caller plus the request key, and the whole immutable creation content participates in the record so that a retry with the same key but different content can be recognized as a conflict rather than an update. [One atomic creation](../mechanisms/creation.md#one-atomic-creation) owns what the record looks like and what a conflict does.

Creation and later input are separate identity domains, and that separation is the one thing on this page most easily missed. The initial Event delivered as part of creation belongs to the creation domain: it retains creation provenance and its evidence is the creation receipt. A later ingress from the same producer, even reusing the exact same key text, belongs to the post-creation domain: it is a new request with its own ingress record and its own receipt.

The running example is deliberately designed to exercise this. A creates E with creation key `report-17`, and later sends ordinary input to E using the same string as the request key. Under one domain those two would collide and one of them would have to lose. Under separate domains they do not talk to each other at all: the first is the atomic decision that created E, the second is an ordinary ingress into E's mailbox with its own accepted content and its own receipt. Retrying the ingress with equal content returns the ingress receipt; retrying the creation returns the creation decision. [Later input has a destination](../mechanisms/creation.md#later-input-has-a-destination) gives the full statement.

An Input ID is never a global cross-tenant deduplication ID. That would be an entirely different object with an entirely different scope, and none of the fields above are the right ingredients for it. Two producers using the text `17` are not deduplicated; they are naming different inputs, correctly.

## Runtime attempt

The next question is about efforts at answering a question already asked. Two names cover it: one for the question, one for the currently authorized effort at that question.

An **Activation ID** names one immutable semantic exchange — the pinned progress, the fixed Event batch, and the input the [Activation](core.md#activation) definition owns — for as long as that exchange remains unresolved. A new Activation ID is minted only when the exchange has resolved and a genuinely new one begins.

The word *semantic* matters. The Activation ID names a question, not a delivery of a question. Bytes may cross the wire twice; the Activation is the same Activation both times, because the question is the same question. Bytes may cross once and then be retried under a replacement Runtime attempt after recovery decided the old one may no longer commit; the Activation is still the same Activation, because the question — the pinned progress and the fixed batch — is still the same. A new Activation ID appears only when the question itself changes, which happens after the current exchange has an accepted answer and a fresh dispatch, with new pinned progress and possibly a new batch, is being prepared.

A **Runtime attempt** is the currently authorized effort at performing one unresolved Activation exchange. Ordinary re-sending to the Driver is still the same attempt: the same effort trying, again, to be received. Authorized takeover creates a replacement attempt of that same exchange: a new effort, at the same question, authorized to commit an answer that the previous one is now forbidden to.

There is a nearby word that means something else and must not be confused with this one. A **physical action attempt** is one invocation of a mediated action against an outside service — a real send, once, with its own record. Runtime attempts and physical action attempts have different owners, different lifecycles and different retry conditions; the fact that the word *attempt* fits both is a language accident, not a shared concept. [Admission and physical action attempt](actions.md#admission-and-physical-action-attempt) owns the second word.

An Activation ID does not survive a takeover being confused for a resolution. The rule that a new Activation ID is minted "only for a genuinely new exchange" exists specifically because an earlier draft of this design got it wrong: it minted a new Activation ID on takeover, which had the effect of making the takeover indistinguishable from a new question. A late Outcome from the old attempt then either had to be accepted, having been computed against the old input under the old ID, or rejected, but no rule was left to say which. The current rule — same ID, advanced epoch, rejection on epoch mismatch — is what makes that decision unambiguous, and the next section names the epoch that decides it.

## Writer epoch

A takeover produced two attempts at one question and only one of them is allowed to commit. The Kernel needs a decidable, storable answer to "which one." The writer epoch is that answer.

A **writer epoch** identifies which Runtime attempt's Outcome may be accepted for the current Activation. It is a monotonically increasing integer, or an equivalent total order, within that exchange. Only an authenticated takeover advances it; ordinary re-sending preserves it.

The word *writer* is not a compliment about which attempt is actually working; it is a label for the one currently allowed to write to accepted state. When an authorized takeover advances the epoch from 1 to 2, epoch 1's Outcome, if it arrives after that decision, is rejected. That rejection is total, not partial: it does not accept the parts that happen to look reasonable and reject only the fields that look stale. This is the property the section on takeover in the previous term rests on.

The epoch fences the *entire* Outcome acceptance, not progress alone. Everything that accepting an Outcome commits — the batch acknowledgment, the installed progress, the emissions the Runtime produced, the Effect intents it proposed, the wait or deadline it declared, the readiness the Kernel records, the next state — is fenced under the same epoch. That comprehensiveness is what closes a subtle loophole: an attempt that could sneak in an Effect intent after being fenced out of installing progress would still cause an action to happen in the world under the authority of a superseded attempt. Fencing progress in isolation would allow exactly that. Fencing the whole acceptance forbids it. [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) owns the exact commit and its ordering.

Several things the writer epoch is often assumed to be, and is not, are worth naming.

It is not authentication. It says which attempt may commit, given that the attempt has already authenticated as itself; it does not itself decide who anyone is. Advancing an epoch is the outcome of an authorization decision made elsewhere, not a claim of authority in its own right.

It is not a lock on a native session, a filesystem or an external resource. A stale attempt fenced by an advanced epoch may still be computing, may still have a live native session, may still have a file open. The epoch stops that attempt's Outcome from becoming accepted state; it does not stop the attempt itself from running or from touching things outside the Kernel's own record. Preventing that is a separate job with a separate owner; [shared mutation](../mechanisms/resources.md#shared-mutation) covers what still needs doing.

Its representation is deliberately unspecified on this page. An integer is a convenient mental model, but the protocol requires only a total order within the exchange and rejection of a stale value; how that order is encoded, how big the identifier is, and how it appears on the wire are implementation choices. <!-- OPEN(implementation): the concrete writer-epoch representation is not fixed here. rewrite-index.md §4 -->

Whether the epoch resets or continues across a later, genuinely new Activation is also deliberately open. Both an implementation that starts each new exchange at 1 and one that carries the counter forward satisfy the protocol, provided a stale epoch for the *current* exchange is always rejected. Prose or a fixture that quietly assumes one of the two options over-constrains the design. <!-- OPEN(implementation): whether the epoch resets across a later Activation. rewrite-index.md §4 -->

A former name, "attempt epoch," referred to the writer epoch. Use *writer epoch* consistently. A separate concept called an **attempt envelope** — the transport-level wrapper carrying attempt metadata around the immutable exchange — is not another epoch, another identity or another recovery mechanism. Takeover can replace attempt metadata without changing the exchange's semantic input; the envelope is what that metadata travels in.

## Dispatch and delivery

Two words describe what happens when the Kernel decides to send an Activation. One is precise; the other is generic and must always name what and to whom.

**Activation dispatch** is the Kernel's preparation and sending of one Activation through a Driver toward a Runtime. It is a single named operation with a single record: the Kernel decides to send this exact exchange, records the intent, and hands it to the Driver. Creating an Execution is not this. Choosing which Runtime implements this Execution is not this either. Both happen at other moments and belong to other decisions.

The record attached to that operation is the **dispatch intent**: an accepted record fixing the exchange input, the reserved batch and the current attempt, written before anything crosses to the Driver. Fixing those facts before the send is what makes a crash between "decided to dispatch" and "the Runtime heard about it" survivable. On restart the Kernel finds a pinned exchange it can redeliver unchanged, rather than having to guess what it had been about to hand over.

**Delivery** is a plain transport word, and its rule is that every use has to name what is delivered and to whom. "Delivery of the Activation to the Driver" is one operation; that hop may be an in-process function call. "Delivery of the Runtime request from the Driver to the native Runtime" is a different operation; that hop may be a remote submission. Bare *delivery*, unqualified, is meaningless in this vocabulary, because it does not say which of those two hops is being talked about, and the rules for the two hops are different.

Receipt of bytes at either hop is emphatically not Outcome acceptance. Bytes arrived; that is transport. Whether the Runtime's answer is going to be accepted as state is a separate decision made later, by the Kernel, against the whole Outcome envelope. The two get confused because both look, casually, like something being "received," and one of the recurring hazards on this page is a diagram that draws them as the same arrow.

A single narrow fact about delivery still has to travel back to the Kernel: did the hand-off to the Runtime succeed? The Kernel supplies a small reporting capability for exactly that fact and nothing more. Its rules — first report wins, no retroactive change to accepted state, `delivered` does not mean the work finished, `failed` does not prove native work never started — are owned in one place. [The delivery reporting boundary](../mechanisms/execution-cycle.md#delivery-reporting-boundary) is that place.

Three neighbours use the word *delivery* for other operations and their meanings do not carry over. **Action dispatch** is the Kernel's decision to send a mediated action to an outside service; that is owned by [admission](actions.md#admission-and-physical-action-attempt). **Destination-mailbox acceptance** is what happens when a routed observation is accepted into another Execution's mailbox; that is owned by [messages and correlation](operations.md#message-request-and-correlation). **External output delivery** is what an adapter does when it pushes accepted output to a channel; that is owned by [output](../mechanisms/output.md#external-delivery). Each of those has its own record and its own success condition, and treating them as one subsystem called *delivery* would let a claim about one be casually transferred to another where it is not true.

## Revision

An accepted state changes over time, and more than one kind of state does. Talking about "the revision" of an Execution as if there were one number for it is where confusion begins.

A **revision** identifies a particular version of a named value or contract. The name is load-bearing: there is no global "the revision," and using the word without saying which revision is where two different facts get accidentally identified.

The revision kinds this page uses appear below. Each has its own creator and its own change point, and they do not share a counter.

| Revision | Who advances it, and when |
|---|---|
| Accepted progress revision | The Kernel, whenever it accepts replacement progress in an Outcome |
| Base progress revision | The Kernel, whenever it prepares an Activation; it copies the accepted revision the exchange starts from |
| Definition revision | The Definition's publisher, when they publish a new version |
| Runtime contract revision | The Runtime-integration publisher, when they publish a new agreement about how Activations and Outcomes are read |
| Progress codec version | The Runtime or Driver publisher, when they change how continuation bytes are interpreted |
| Operation/schema revision | The operation's owner, when they change the operation's schema or exact-input meaning |
| Resource/state revision | The resource service, when the value it holds changes |
| Action evidence revision | A trusted settlement or reconciliation path, when it appends a new evidence record |

Each one is a version of a *different named thing*, and knowing one says nothing about the others. Progress revision 4 under writer epoch 2 says only that the current attempt is working from accepted progress 4; it says nothing about a revision 5, and it says nothing about attempt 1 having produced anything at all.

Base and accepted progress revisions are the same *kind*, and they are still worth naming apart. The **base** revision is what an Activation was prepared against: the copy the exchange started from, pinned into the dispatch intent. The **accepted** revision is what the Kernel has recorded so far. When an Outcome arrives, comparing its declared base against the current accepted revision is what catches an Outcome that was computed from a state the Kernel has since replaced. A run-together phrase like "the progress revision" would hide exactly that comparison.

Two revision kinds are especially easy to run together and worth stating apart. The **Runtime contract revision** decides how a saved value is interpreted for resumption — how bytes become continuation. The **progress codec version** decides how bytes become a value in the first place. Under a new codec but the same contract, the same bytes decode into the same continuation, and resumption is fine. Under the same codec but a new contract that renamed a progress field, the same bytes decode into a value whose meaning has changed, and that state has to be held rather than resumed. Different revisions catch different mismatches; conflating them would blind the check for the second case.

The labels here are conceptual. They need not all be integers, they need not share a counter, they need not appear identically on the wire. What they need is to be pinned in the accepted record so that any later question — "is this Outcome stale?", "can this progress still be resumed?", "does this evidence apply to this action?" — has an exact answer.

## Acceptance, boundary and receipt

The page's last three terms are about what "accepted" is and what evidence of it looks like.

**Acceptance** is an authoritative decision to record a request or fact under a specific contract. Bytes arriving at the network is not this. Successful validation is not this either — validation is a check performed as part of acceptance, not itself the accepted decision. Admission of an external action is a different decision under a different contract, and the word *acceptance* is not a general umbrella that covers it.

An **atomic acceptance boundary** is a named place where a set of facts must commit together or not at all. It is a consistency requirement about a decision, not necessarily a machine boundary, a process boundary or a transport boundary. The word *boundary* is used elsewhere for those other things, and where a page is talking about a machine, a process or an interface, it should say so; this page uses *boundary* only for the atomic-commit sense.

A **receipt** is retained evidence that one specific request was accepted at one named acceptance boundary and at a particular accepted revision or position. It can be returned to a caller — the "yes, we recorded that" a submitter often gets — but a receipt is not inherently a Kernel-to-Runtime acknowledgment, and it is not a bearer permission for future access.

An **acceptance position** orders accepted facts within the record that owns them. An Execution's mailbox has one, an Execution's history has one, a receipt lookup can locate a record by one. Positions are always local to the record that maintains them; there is no global clock, and no cross-Execution position anything on this page implies exists.

The receipts this page recognizes appear below. Each answers a *different* question.

| Receipt scope | Question it answers |
|---|---|
| Creation / input ingress | Was this creation, or this later ingress request, accepted? |
| Activation dispatch intent | Was this exact dispatch intent recorded? |
| Outcome acceptance | Was this Runtime proposal accepted as state? |
| Effect admission | Was this physical action attempt authorized and recorded? |
| Effect settlement | Was this evidence about an attempt accepted? |
| Child / message operation | Was this child creation or message routing operation accepted? |

There is no single receipt per Execution. Asking "does E have a receipt?" is malformed; the meaningful questions are the six above, and each has its own retained record and its own semantics.

A receipt proves nothing beyond the decision it names. An Outcome-acceptance receipt is not proof that an Effect the Outcome proposed was ever admitted, let alone that it ran. An Effect-admission receipt is not proof that the external service acted; that is what settlement is for. An ingress receipt is not proof that the Runtime processed the input; the Runtime's own progress, once it has accepted the input, is the only place that lives.

Timeout acceptance is a Kernel-internal fact; it does not create a seventh caller-facing receipt kind. A wait's expiry mints a [timeout Event](core.md#timeout-event) inside the exchange, and that Event is treated the same as every other accepted Event. The caller-facing surface is unchanged, and no external API for "get me the timeout receipt" is implied.

Receipt lookup authenticates and scopes the caller before revealing content or existence. The refusal shape and timing for "you cannot see this record" and for "no such record exists" must not distinguish the two, because a distinction there would leak the existence of records to callers who are not allowed to know about them. Under a stated retention contract, an exact duplicate submission returns the same receipt it did the first time; after retention has expired, that promise is over, and the exact expired-key policy is published rather than left to be discovered.

Two things this page does not fix, and does not need to fix, appear only here. Receipt serialization — whether a receipt travels as an opaque token or a structured tuple — is an implementation choice. Request-key hashing — whether keys are stored or compared as strings or as hashes — is an implementation choice. <!-- OPEN(implementation): receipt serialization / token representation and request-key hashing remain implementation-owned. rewrite-index.md §4 -->

The names on this page are conceptual throughout. They do not freeze API spellings, wire formats or storage schemas; they fix which questions have to be answerable, and which answers must not be confused for each other.
