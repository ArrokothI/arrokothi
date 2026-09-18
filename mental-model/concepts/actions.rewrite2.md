# Actions, authority and observations

A Runtime can write the report's draft on its own. Publishing it, asking the editor, spawning a helper, reading governed data — all of that it has to ask for. This page defines the canonical vocabulary of that asking: what is asked for, who may ask, who must approve this exact one, what actually happened, and what remains owed afterwards. Each term is defined here and nowhere else; how the pieces interact in time is owned by [authority](../mechanisms/authority.md), [actions](../mechanisms/actions.md) and [output](../mechanisms/output.md).

## The life of one mediated action

Return to the weekly report. The Runtime has finished a draft and cannot finish the job alone: distribution goes through an application-controlled service whose credentials the Runtime does not hold. So its [Outcome](core.md#outcome) carries, alongside its saved progress, an [Effect](#effect) — a proposal for the Kernel to [mediate](#exposure-and-mediation) one action: publish this draft to that list.

Accepting that Outcome installs the progress and the request in one decision. The request is now an accepted fact — a [logical action](#logical-action-and-intent) the Kernel owes — and it is still only a fact about what was asked. Nothing has been sent, approved or performed.

Before anything is sent, the Kernel answers the permission questions it owns. May this Execution publish at all — measured against the [authority](#principal-and-authority) it was created with and the application's current policy. Must a person decide this one — for a publication that emails forty real people, likely yes, and an eligible approver's [exact consent](#exact-consent) becomes part of what authorizes the send.

Only then does the Kernel [admit](#admission-and-physical-action-attempt) one concrete attempt and hand the exact request to a trusted adapter, which invokes the service. When the adapter's authenticated report returns, [settlement](#settlement-and-reconciliation) records what it actually establishes — and if no report ever returns, settlement records that nothing can be established, which is a different fact from failure.

The sections below define each piece, roughly in the order the story used them:

- **The request** — the [Operation](#operation) contract that existed before the story started, the [Effect](#effect) that proposes one action, and the [logical action and intent](#logical-action-and-intent) that acceptance creates.
- **Permission** — [principal and authority](#principal-and-authority), and [exact consent](#exact-consent).
- **Doing and knowing** — [admission and the physical action attempt](#admission-and-physical-action-attempt), and [settlement and reconciliation](#settlement-and-reconciliation).
- **Changing course, and the boundary of all this** — [withdrawal and compensation](#withdrawal-and-compensation), and [exposure and mediation](#exposure-and-mediation).
- **What the work produced** — [emission, result and output obligation](#emission-result-and-output-obligation), which are not actions at all.

One habit of thought makes all of these necessary, so it is worth naming at the start. *What was asked*, *what was permitted*, *what actually happened* and *what is still owed* are separate facts, and real systems get burned when a single field carries all four. An action can be permitted and never attempted. It can have succeeded while its receipt is unreadable. It can have failed while its record still says pending. Giving each fact its own term — request, permission, evidence, obligation — is what lets the Kernel record the world as it is rather than as a status column would like it to be.

## Operation

An **Operation** is a named, versioned, pre-declared contract for one kind of invocable action.

"Pre-declared" is the load-bearing word: the contract must exist, with its meaning fixed, before any request invokes it. Two later decisions cannot work without that. A person's [consent](#exact-consent) binds to what this operation revision means, not to whatever the code happens to do at the moment of sending. And [settlement](#settlement-and-reconciliation) records results with the certainty this operation promised, not with whatever certainty the adapter felt like reporting. If "publish" meant something different each time it ran, neither an approval nor a result record would state anything checkable.

The contract has five parts, all of which must be settled somewhere before mediation relies on them:

1. An **identity**, stable across revisions and across friendly labels.
2. An input/output **schema**.
3. Which parts of that schema are actually enforced <!-- TODO: rewrite once K2.2 selects the validator and enforced subset --> — an unknown property on an argument is refused instead of silently dropped, and a missing field gets no substituted default.
4. The **exact input meaning** — what the arguments say about the world, not just their shape.
5. **Result-certainty behavior** — what a result is allowed to claim: that the service performed the action, that it accepted the action for later, or something the evidence must qualify before anyone repeats it.

Identity stability is what lets approvals and results survive change. An Operation can be revised — a stricter schema, a new certainty behavior — and each invocation pins the revision it used (operation revision is one of the named [revision kinds](identity.md#revision)). What does not change is *which* operation was invoked. A [projection](roles.md#projection-and-invocation-binding) may render the operation under a friendlier label for a model to read, but the friendly label is not the identity, and a late reply resolves through the binding the invocation saw, never through today's catalog. If identity moved with revisions, "the action that person approved" and "the action this result describes" would each become two operations instead of one.

Operations and [Activations](core.md#activation) vary independently: one Activation may invoke several Operations, and one Operation serves many Activations over time. Neither number constrains the other. Three neighbors are easy to run together with Operation and are not it: a [resource](state.md#resource-binding-and-attachment) is acted on rather than invoked; a [service](roles.md#service-and-interaction-template) is an implementation that may sit behind operations; a [Skill](roles.md#skill-and-package) is instructions that may reference operations. None of them carries the five parts above.

## Effect

An **Effect** is a proposal for one Kernel-mediated action, carried in an [Outcome](core.md#outcome).

The word *one* is load-bearing. Each Effect names a single request, and each accepted Effect becomes one [logical action](#logical-action-and-intent) with its own identity. An Outcome may carry several Effects, and several together are unordered, independent intent — not a transaction and not an execution sequence. Proposing reserve, charge and publish in one Outcome says only that three requests are wanted; for charge to depend on reserve's result, the Runtime proposes charge in a later Outcome, after reserve's result has arrived. [Retrying an action](../mechanisms/actions.md#retrying-an-action) owns that rule together with the confusion it prevents.

Effects come in two kinds of shape. Invoking a service and reading governed data point at a named [Operation](#operation) — by identity and pinned revision, with arguments validated under it. Requesting human input, creating a child Execution and sending a message use their own shapes and point at no Operation: these are interactions the Kernel itself coordinates, and their contracts are owned by [communication](../mechanisms/communication.md) rather than declared by an application.

Each Effect carries a **proposal key**: a name the Runtime chooses, unique among that Outcome's proposals. Acceptance binds the proposal key to an **Effect ID** — the immutable identity of the accepted logical request. Two names exist because each party can only name what it controls: the Runtime names what it proposed, and the Kernel numbers what it accepted. The proposal key is also how a [wait](core.md#wait-subscription-and-generation) declared in the same Outcome can refer to the action it is waiting for, before any Effect ID exists. The Effect ID, for its part, is the identity of the logical request only — no physical send has that identity; each physical attempt gets its own record under [admission](#admission-and-physical-action-attempt).

Two boundaries finish the term. An Effect is not an [Emission](#emission-result-and-output-obligation): an Effect asks for something to happen, while an Emission is output the Runtime produced. And reads are not excluded from Effects: a governed read is an Effect when mediation is claimed for the read, as [the state service contract](../mechanisms/state.md#state-service-contract) states. An Effect whose whole Outcome is rejected becomes nothing at all — no Effect ID, no action record, no admission.

## Logical action and intent

Accepting an Effect creates a **logical action**: an immutable record of one mediated request — which operation, which arguments, for which Execution. Together with it the Kernel holds an **intent**: an accepted obligation to perform work later.

The intent is a fact about what the Kernel owes, not a claim about what the world has done. "The request exists, approval pending" and "the service may have acted" are both honest statements an intent makes possible; "it ran" is not among them. That honesty is why acceptance creates the record before anything is dispatched, in the same atomic decision as the progress that proposed it ([outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) owns the commit).

The placement is what survives a crash between acceptance and dispatch. Suppose the record were written only when the adapter is called: a process dying in between would silently erase an obligation the Runtime had already paid for with its saved progress, and no recovery could tell "never asked" from "asked but lost". Binding the record to the progress in one decision makes the obligation exactly as durable as the accepted state — and exactly as recoverable.

In these pages, an unqualified **action** means mediated work. Work a Runtime performs with its own tools and host capabilities is **native action**, and nothing on this page records or bounds it; [exposure and mediation](#exposure-and-mediation) draws that boundary.

## Principal and authority

A **principal** is an authenticated application identity: a user, a service, or one party acting on behalf of another, within a tenant or application scope. Authentication is established at trusted ingress, from the path a request arrived through — never from content. A model-generated `user_id` inside a payload authenticates nothing, however convincing the surrounding prose.

An Execution is not a principal. It holds an **authority binding**, which bounds what may be done on the principal's behalf during that lifetime; it is work with limits, not an accountable party. The distinction fails quietly in one direction: a Runtime proposing an Effect may report "the user asked for this," and that report is a claim inside a payload, not an identity at an ingress ([content is not authority](../mechanisms/authority.md#content-is-not-authority) extends the rule to everything that merely resembles permission).

**Authority** is the upper bound of what an Execution may do through mediated actions: which operations, which resources. **Policy** is the application's permit-now decision that narrows that bound per request. Two layers, because the two move at different speeds: authority is bound at creation and changes only by explicit decision, while policy changes all the time. Collapse them and either every policy change has to rebuild Executions, or nothing can ever be narrowed. When grants are used, a **grant** records the authority it conveys and the constraints on delegating it further.

Delegation is an intersection, not a copy: a [child](operations.md#child-and-ownership) receives the overlap of what the request asks for, what the parent can pass on, and what current policy permits. A parent that may email one address cannot give a child the power to email any address by asking for it — the child gets that one address, or nothing ([check the concrete request](../mechanisms/authority.md#check-the-concrete-request) owns the ordered questions). And ancestry is responsibility, not permission: creating a child hands over work to account for, never powers the parent holds.

## Exact consent

**Exact consent** is one human's yes to one unchangeable action.

The consent binds: the specific [logical action](#logical-action-and-intent); the exact validated arguments in [canonical form](values.md#canonical-form), under the pinned operation revision; the real-world targets — destination or account, and the resource revision or immutable content digest where meaningful; and the approval itself — which authenticated approver, under what decision identity, valid until when.

Every clause exists to close one gap: the gap between what a person was shown and what the adapter sends. "Approve Plan A" is not approval of this recipient and this payload; a model's reassuring summary of a draft is not the draft. [Exact action consent](../mechanisms/authority.md#exact-action-consent) owns what must be shown and the rule that follows from it: after approval, only meaning-preserving transport encoding may touch the request. Any change to arguments, account, resource or operation revision needs a new action and a new consent, and argument-mutating hooks must not run after the person said yes.

Several neighbors routinely arrive inside an Execution looking like approval, and none of them is it: ordinary feedback, a reply in a conversation, standing intent, a person's habit of approving, retrieved text, notes, inferred memory, a Skill manifest, a provider's description of a tool. Each can influence a proposal; none can supply the decision. Approval is also separate from disposition — an approved action can still be denied at admission, [withdrawn](#withdrawal-and-compensation), or expire unused.

## Admission and physical action attempt

**Admission** is the ordered decision that authorizes one concrete attempt under the Execution's [authority](#principal-and-authority), current policy and required [consent](#exact-consent). A **physical action attempt** is one invocation of the logical action through a trusted adapter. Waiting for consent consumes no attempt: the attempt begins when the Kernel authorizes it, not while its prerequisites are being checked.

Admission is a sequence, owned by [admission and sending](../mechanisms/actions.md#admission-and-sending): validate the operation and input — an unknown operation or invalid input is refused before anything is invoked; decide policy and consent; record the attempt; send the exact request through the adapter. The record is written before the send, deliberately. It names the adapter and operation revision, the account and resource, the policy and consent decision, the exact payload, and the attempt's identity and order — so a crash between writing and sending leaves evidence that something may be running out in the world, rather than a silent gap.

Admission has two limits that read like weaknesses and are not. It can precede sending — authorizing an attempt before the adapter is ready is fine — but it cannot prove receipt: an admitted attempt may never have reached anything, and the honest record of that is [unknown](#settlement-and-reconciliation), not failed. And its dispatch ownership is fenced independently of the Runtime's [writer epoch](identity.md#writer-epoch) <!-- TODO: if a dispatcher is ever defined as its own concept, link "action dispatch" to it -->: the Runtime attempt that proposed an action and the action dispatch that performs it are fenced separately, because a stale Runtime attempt cannot commit progress, but that fact alone decides nothing about whether an action's own dispatch record is current.

Admission is also the Kernel's last point of control. From here on, the Kernel records: what actually happened becomes a question of evidence, not of authority.

## Settlement and reconciliation

**Settlement** is the act of accepting authenticated evidence about a physical attempt and recording what it establishes, as an observation the Runtime can account for. **Reconciliation** is the act of finding out what actually happened by asking, through a trusted path, the systems that would know.

Reconciliation queries; it never re-executes. Blindly resubmitting a request to see what happens is how a payment gets made twice; [retrying an action](../mechanisms/actions.md#retrying-an-action) owns the rare conditions under which a second attempt is safe at all.

Settlement keeps four conceptual dimensions apart — conceptual, deliberately not an enum cross-product to instantiate. **Request disposition**: what happened to the request — admitted, refused, withdrawn, expired. **Attempt evidence and certainty**: what is known about a physical attempt, and how firmly. **Result validity**: whether the result content is itself well-formed and trustworthy. **Responsibility and obligation**: who still owes what, whatever the other three say.

The four are kept apart because they vary independently, and a single status field forces them to lie about one another. "Payment succeeded, receipt body is malformed" and "we cannot tell whether payment ran" are different worlds, and neither justifies submitting a new payment — but both fit in a field called `status: problem`. The four-dimension record keeps them distinguishable: evidence authenticates against the adapter, the provider account and the original attempt; an exact duplicate returns its original [receipt](identity.md#acceptance-boundary-and-receipt); and two trusted sources that disagree are both retained and flagged for reconciliation, because a disagreement is a real fact about the world that someone must resolve — quietly keeping the later report hides it behind a record that looks certain and is not.

Absence of evidence is not evidence of failure. A report that never came back is evidence the Kernel did not get, not evidence that the service did not act — so **unknown** is a disposition, and an honest one. It can also be refined later: authorized reconciliation may establish observed success or definite failure, appending a new immutable evidence revision rather than editing one the Runtime already acknowledged ([settlement and refinement](../mechanisms/actions.md#settlement-and-refinement)). [What evidence proves](../mechanisms/evidence.md#what-evidence-proves) lists, per record kind, exactly how far each one reaches.

## Withdrawal and compensation

**Withdrawal** is the explicit control decision that prevents future admission of a named request. **Compensation** is a new authorized action that counteracts one that may already have happened. Neither verb reaches backward in time, and that is the point of both.

Before admission, withdrawal atomically blocks the named request and records a refusal. After admission, the request may already be with a remote service: withdrawal can at most attempt cancellation where the operation supports it, and the action must still be treated as possibly executed. [Withdrawal and remaining responsibility](../mechanisms/actions.md#withdrawal-and-remaining-responsibility) owns the sequence.

The distinction has a classic failure. A user typing "wait, not that recipient" into the conversation is sending ordinary input — the Runtime may not read it for another second, and the send may already have been admitted. A correction message does not retract an action; it is an observation for the Runtime to interpret. To actually stop the send, someone must withdraw the named pending action, or invalidate its consent, before admission wins — [the ordering of revocation against admission](../mechanisms/authority.md#order-revocation-against-admission) decides that race.

Compensation is not rollback, because there is nothing to roll back to: external history is not unwritable, and undoing a publication is itself a second publication. What compensation is, is a fresh mediated action, authorized on its own merits like any other. The policy that chains compensations — what to undo when an earlier step failed — belongs to the application or its Workflow, not to the Kernel.

One thing survives all of it: responsibility. An accepted action stays this Execution's obligation until a known disposition is accounted for, or responsibility is explicitly transferred or abandoned under policy. Stopping the retries changes what this Execution will do next, never what the service did.

## Exposure and mediation

**Exposure** is filtered visibility of operation metadata and choices — what a model or caller can be shown. **Mediation** is a property of a path: an action is mediated when it goes through Kernel [admission](#admission-and-physical-action-attempt) and [settlement](#settlement-and-reconciliation).

Exposure is a view, not a grant. Showing a model that a publish operation exists authorizes nothing; a catalog entry, a friendly label and a projected binding each make an operation findable, and none makes it permitted. Permission is decided at admission, against [authority](#principal-and-authority) and current policy. [View and disclosure](roles.md#view-and-disclosure) owns the rendering rules — scope labels locate, they never grant.

Mediation has an outside, and it is large. A Runtime that already holds filesystem, network or process capabilities can act without asking; that is ambient — **native** — action, and no Kernel decision stops it. The Kernel's records simply never see it. Telemetry can observe a native action, and observation neither mediates nor prevents: a log of an unmediated action is evidence about the world, not enforcement over it. What actually contains native action is physical isolation under a deployment's tested claim ([containment claims](../mechanisms/resources.md#containment-claims)), and isolation and mediation are independent in both directions — a well-contained Runtime can still make an unmediated call, and a well-mediated one may run with no isolation at all. Neither substitutes for the other, and every "on mediated paths" guarantee in these pages is qualified by exactly that word.

## Emission, result and output obligation

Three terms cover output, and none of them is an action. An **Emission** is accepted nonterminal output — a draft, a status note — recorded by Outcome acceptance with a stable identity. The **result** is the terminal output that completion records. **Provisional output** is everything unaccepted: streaming tokens, diagnostics, a progress line printed to a console. Provisional output can be shown, clearly labeled as unaccepted; it cannot certify consent, action success or a terminal result, and a failed attempt's stream must not be spliced into a transcript that reads as accepted.

Accepting output creates an **output obligation**: make this output available for authorized, retention-bounded observation and replay. The obligation is about availability and nothing else. The retained record itself discharges it — no publisher queue is mandatory — and "available to read" and "sent somewhere" are different questions with different owners: [acceptance makes output observable](../mechanisms/output.md#acceptance-makes-output-observable) owns the first, [external delivery](../mechanisms/output.md#external-delivery) owns the second.

An older name for the obligation was *publication intent*, and the rename is worth knowing because the old name misled: the obligation was never about publishing to a channel. Getting output to a person or another service is external delivery — an ordinary mediated action performed by a channel adapter, with all the uncertainty [actions](../mechanisms/actions.md) implies. Delivery can remain pending or unknown after `COMPLETED`; if business success requires a delivery receipt, the Runtime must request that Effect, observe its result, and only then complete.

Reading output sends no input: an observer draining an Execution's output — a UI, a parent — changes nothing about that Execution's [mailbox](core.md#mailbox), wait or progress ([observation does not send input](../mechanisms/output.md#observation-does-not-send-input)). And the boundary opened two sections ago closes here: an Emission is what the Runtime produced; an [Effect](#effect) is what it asked for. Produced and wanted are different facts, and the two words keep them from being traded for each other.
