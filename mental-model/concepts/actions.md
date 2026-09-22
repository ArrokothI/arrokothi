# Actions, authority and observations

The [Kernel](core.md#kernel) records what has been accepted about an [Execution](core.md#execution). This page names the terms that appear when that Execution asks the world to do something — publish a report, read governed data, create a child, put a question to a person — and the terms that appear when it produces output that is not a request at all.

Each term is defined here and nowhere else. How they interact is specified elsewhere: [authority](../mechanisms/authority.md) owns the order in which permission is checked, [actions](../mechanisms/actions.md) owns how an accepted request becomes an attempt and then evidence, and [output](../mechanisms/output.md) owns how produced content becomes available to read. This page says what the pieces are.

## A first example

Return to the weekly report. The Runtime has drafted it. Drafting happened inside the Runtime: model calls, files, whatever the application chose. None of that asked the Kernel to do anything in the world.

Publishing is different. The application controls a publication service, and it wants the Kernel to mediate the send — to check that this Execution may publish, to record that it asked, and to retain whatever evidence comes back. The Runtime cannot do that by calling the service on its own and reporting the call afterwards. A native call the Kernel never saw is not a Kernel-mediated action, and no later story about it becomes one.

So the Runtime proposes, in its [Outcome](core.md#outcome): please publish this draft. That proposal is an **Effect**. It points at a named **operation** that already exists — `publish_report` — because the Kernel cannot admit, and a person cannot approve, a request that has no stable contract. The Outcome also carries the saved progress and a wait for the publication result. None of this is true yet. An Outcome is still a proposal.

The Kernel accepts it as one decision. The progress and the request are now accepted together: there is a **logical action** with an **intent** — an obligation to try the publication, not evidence it ran. Before anything is sent, **admission** checks the request against the Execution's **authority**, current **policy**, and, if the operation requires it, a human's **exact consent**. A **physical action attempt** may then go out through a trusted adapter. **Settlement** records what is known about that attempt, along four dimensions that must not be collapsed into one status field.

Two further terms qualify the middle of that story. **Exposure** is showing a model that `publish_report` exists; it is not permission to publish. **Mediation** is the path going through admission and settlement; a Runtime that already holds network access can still publish without asking, and no Kernel decision stops that. After a request exists, **withdrawal** can prevent a future attempt, and **compensation** can try to counter one that already happened — a retraction notice, not an undo of the first publication.

The last section is about what is not an action at all. The draft itself is an **Emission**: output the Runtime produced. Making it available to read is an **output obligation**. Sending it to a channel is a separate mediated action.

The terms below follow that order. The same report is the running example.

- **What can be asked** — [Operation](#operation), then [Effect](#effect).
- **What acceptance creates** — [Logical action and intent](#logical-action-and-intent).
- **Permission to try, and trying** — [Admission and physical action attempt](#admission-and-physical-action-attempt).
- **Evidence of what happened** — [Settlement and reconciliation](#settlement-and-reconciliation).
- **Who may act, and when a person must** — [Principal and authority](#principal-and-authority), [Exact consent](#exact-consent).
- **What the path is, and is not** — [Exposure and mediation](#exposure-and-mediation).
- **After a request exists** — [Withdrawal and compensation](#withdrawal-and-compensation).
- **What is not an action** — [Emission, result and output obligation](#emission-result-and-output-obligation).

On these pages, **action** means Kernel-mediated work unless a sentence explicitly qualifies it as native.

## Operation

An **operation** is a named, versioned, pre-declared contract for one kind of Kernel-mediated work. The Kernel will not admit a request, a person will not be asked to approve one, and later evidence will not be interpreted, against a call that has no such contract.

Pre-declaration is the property that makes the rest of this page possible, and it is worth saying why a name invented at the moment of the call would not do. Admission has to measure a request against a bound that already exists. Consent has to bind to arguments whose meaning is already fixed. Settlement has to interpret a result through a certainty rule that was declared before anyone needed it. A contract invented in the Outcome that proposes the work would let the Runtime choose, at the last moment, what "publish" is allowed to mean. The operation has to exist first.

The contract has five parts, and they answer five different questions:

1. **Identity.** The stable name across every revision, so `publish_report` remains `publish_report` when its schema moves from revision 2 to revision 3. Admission, approval and evidence all point at this name plus a pinned [revision](identity.md#revision).
2. **Input and output schema.** The shape of arguments and results: `publish_report` takes `{ reportRef }` and returns `{ publishedAt }`.
3. **Supported schema features.** Which parts of that shape are actually enforced, and how strictly — whether an argument carrying a property the schema does not name is refused or ignored, and whether a missing field can be filled in. <!-- OPEN(K2.2): the validator and the enforced schema subset. When K2.2 selects them: restate part 3 and the closing paragraph of this section in their terms, and delete this marker. rewrite-index.md §4 -->
4. **Exact input meaning.** What a valid-looking argument truly asks for. `reportRef` must name the exact reviewed revision, not any string of the right shape.
5. **Result-certainty behaviour.** What an attempt can ever prove afterwards: whether "definitely failed to publish" is even reachable, or whether every failed attempt stays [unknown](#settlement-and-reconciliation).

The middle two parts are the ones a reader is most likely to skip, and they are the ones that do the work. A schema check only confirms shape. A human approving the action needs the meaning behind a valid shape, which is why [exact consent](#exact-consent) binds the validated arguments and not the plan that produced them. And the certainty declaration determines what evidence can establish on settlement's certainty axis, one of its four dimensions. An operation with no safe query or retry can still establish success or failure through authenticated evidence from the original attempt, even if it arrives late. Without trustworthy evidence, the result remains "unknown," however the Kernel records it.

A model chooses from names it can read. Permission and evidence need names that do not drift. So an operation keeps its identity when it is shown under a friendlier label. A [projection](roles.md#projection-and-invocation-binding) may display `publish_report` as "Publish this week's report," but the caller still invoked the same operation. That matters because the label can change between requests, while a late reply must still resolve to the operation the caller actually saw, not to whatever the catalog offers under that label now.

Nearby contracts are easy to confuse with an operation because they also have names. A [resource](state.md#resource-binding-and-attachment) is acted on rather than called. A [service](roles.md#service-and-interaction-template) is a private implementation behind selected operations. A [Skill](roles.md#skill-and-package) packages instructions rather than exposing a call. None of those is an operation, and treating any of them as one would put permission and evidence on the wrong object.

Operations and [Activations](core.md#activation) vary independently. One Activation can propose many operations. Many Activations can name the same operation over time. The Activation is the exchange; the operation is the kind of work.

Part 3 is where an operation declares its own enforcement, because that is a property of the operation. Which schema features the protocol supports at all, and which validator enforces them, are not settled on this page.

## Effect

An **Effect** is a proposal for one Kernel-mediated action, carried in an [Outcome](core.md#outcome).

"One" is load-bearing. Three Effects in one Outcome are three independent requests, not a transaction and not an order. Proposing "reserve, then charge, then publish" in a single array says only that three requests are wanted; it says nothing about sequence, and nothing about one depending on another. An Effect never implies a sibling. How a Runtime gets a real sequence instead, and why the failure of the second cannot roll back the first, belongs to [retrying an action](../mechanisms/actions.md#retrying-an-action).

Not every Effect points at an [operation](#operation). Two families exist, and mixing them is how a page starts treating every request as a service call.

Invoking a service and reading governed data do point at an operation. The proposal names the operation's identity and pinned revision, and its arguments are validated against that operation's schema. Each Effect points at at most one operation; many Effects over time can point at the same one. The rest of this page — admission, consent, settlement — resolves through both the Effect and the operation it named.

A read is not exempt from any of this. A read of governed data can be an Effect like any other, admitted and settled the same way, and [the state service contract](../mechanisms/state.md#state-service-contract) is explicit that reads are not excluded. What it does not say is that every read must be one. A read the deployment chooses to leave native stays native, with its access owner declared, and is then outside this page's verbs entirely.

Requesting [human input](operations.md#message-request-and-correlation), creating a [child](operations.md#child-and-ownership) and sending a [message](operations.md#message-request-and-correlation) use their own shapes instead, and point at no operation. A person is not a service. A child is not a function call. A message is not an invocation. Each of those binds facts an operation schema has no place for — who is eligible to answer, who remains answerable for the new work, what counts as send success — and [communication](../mechanisms/communication.md) owns those bindings. Forcing them through an operation schema would flatten them into argument fields.

An [Emission](#emission-result-and-output-obligation) is not an Effect. Output is something the Runtime has produced. An Effect is something it wants done. The draft of the report is an Emission; asking the publication service to send it is an Effect. Collapsing those two would make "I wrote this" look like "please publish this," and the Kernel would then try to admit a request that was never made.

A **proposal key** is the Runtime's stable local name for that proposal within the Activation. Acceptance binds it to an **Effect ID** — the immutable logical request identity within the Execution. The Effect ID is not the identity of a physical send. A wait registered in the same Outcome may refer to the proposal by its local key, because at the moment the Outcome is submitted the Effect ID does not yet exist.

Until the Kernel accepts the Outcome, the Effect is only a proposal. Nothing about it is an obligation, a permission or a send. [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) is the decision that turns it into the next term.

## Logical action and intent

A **logical action** is the immutable action record created when an Effect is accepted. An **intent** is an accepted obligation to perform or route specified work later. It is not evidence that the work already ran.

The gap between those two is the whole point of having both words. Accepting the Outcome commits the Runtime's [progress](state.md#progress) and this intent in one decision. A crash between that acceptance and the first attempt therefore leaves a recorded obligation rather than a lost request. The Kernel still knows that publication was asked for. It does not yet know whether publication happened.

That is also why progress and requested actions have to agree, and why [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) takes all of it or none of it. [The Outcome entry](core.md#outcome) shows what an intent accepted without its progress would cost; the reverse matters here, because it is the one that leaves an action unaccounted for. Progress that decided to publish, with no intent recorded: the Runtime believes it asked, and nothing will ever try. The request exists only inside continuation data the Kernel does not read, so there is nothing to admit, nothing to settle, and nothing for [completion](../mechanisms/lifecycle.md#completion-is-an-accounting-check) to notice is missing.

An intent is a request that now exists. Whether it may run is a later, separate question. That question is admission.

## Admission and physical action attempt

**Admission** is the ordered decision that authorizes a concrete attempt under the Execution's [authority](#principal-and-authority), current policy, and required [consent](#exact-consent). It records that intent under current dispatch ownership. A **physical action attempt** is one invocation of that logical action through a trusted adapter.

An accepted intent is a request that exists. Admission is whether that request may run *now*. The two must not be run together. An Execution that is allowed, in general, to publish is not therefore allowed to publish this draft to this account under today's policy, and a human's standing willingness to approve publications is not a yes to this one.

Admission can precede sending, and it cannot prove receipt at the far end. The attempt is therefore recorded before the adapter sends, so that a process dying in between still leaves evidence that something may be running out in the world. What is missing afterwards is a receipt the Kernel did not get, never proof that the service did not act — and treating absence as failure is how a system comes to retry a payment it cannot see.

Dispatch ownership for an action is fenced independently of the Runtime's [writer epoch](identity.md#writer-epoch). The Runtime attempt that proposed the action and the action dispatch that performs it are two different efforts, with two different fences. The writer epoch fences the whole of an Outcome acceptance, so a stale Runtime Outcome cannot sneak a second intent through by arriving after a replacement attempt has taken over the exchange. <!-- OPEN(unassigned): whether an action dispatcher is its own concept. If one is ever defined: link "action dispatch" to it here and delete this marker. rewrite-index.md §4 -->

Admission also keeps the line between *a request exists* and *something went out to the world* crisp. A request refused at validation never crosses that line: no attempt is made, and none ever will be. A request parked waiting for a human yes has not crossed it either, but its case is open rather than closed — it is waiting, not half-sent, and it costs no attempt while it waits. If the yes arrives, admission carries on from there and an attempt can go out. Past the line, a service's own refusal — it will not publish to that account — is an observation the Runtime can handle, not necessarily the end of the Execution. [Admission and sending](../mechanisms/actions.md#admission-and-sending) lists what refuses on which side, and [authority](../mechanisms/authority.md) owns the ordered permission check itself.

Who performs the send, and whether that role is its own concept, is not decided on this page. What is decided is that admission is a Kernel decision, that it records the attempt before the send, and that a recorded attempt does not mean the request reached the service.

## Settlement and reconciliation

After an attempt, the Kernel needs evidence of what happened. It gets that evidence in one of two ways, and they are not interchangeable.

**Settlement** accepts authenticated evidence for a particular action attempt and records its observation for the Runtime. **Reconciliation** queries or inspects existing external work through a trusted path to resolve uncertainty. Reconciliation is not blind re-execution. When the answer to "did the publish run?" went missing, reconciliation asks the service, rather than publishing again to find out. Publishing again to find out is how a report appears twice.

What settlement records has more than one axis. Keep four dimensions distinct:

| Dimension | Meaning, on the report |
|---|---|
| Request disposition | The fate of the request itself: waiting for approval, denied, withdrawn, or no more attempts |
| Attempt evidence / certainty | What is known externally: no attempt, may have run, observed success, definite failure, unknown |
| Result validity | Whether the returned value satisfies the result contract, even if the action ran |
| Responsibility / obligation | Who still owes settlement or required results: this Execution, another named durable owner that explicitly accepted it, or an explicit policy decision to abandon it — which ending the Execution does not by itself make |

These are conceptual dimensions, not a mandated enum cross-product. An implementation is not required to store a cell for every combination. It is required not to collapse any two of them into one field that cannot tell them apart.

Collapsing any two loses a real fact. "The service confirmed it ran" and "the value it returned is unusable" can both be true of one publication, and an application must act differently on each. Stopping retries moves the disposition and leaves the certainty exactly where it was: an operator's "stop trying" says what this Execution will do next, not what the service did. Acknowledging an unknown observation changes neither the certainty nor the obligation — the Runtime has seen the uncertainty, the work is still owed, and [completion](../mechanisms/lifecycle.md#completion-is-an-accounting-check) will not accept "we noted that we do not know" as accounting.

On the certainty axis, **unknown** is an answer, not a failure, and not a gap waiting to be filled in with a guess. Until something proves otherwise, a lost admitted attempt may have executed. Waiting longer does not settle that. Neither does an Agent writing a confident summary of what it believes happened: the summary is text the Runtime produced, not evidence from the service. The Kernel records what it knows, including that it does not know.

What can change an unknown is authorized reconciliation. It changes it by adding rather than editing: a new evidence revision, and a new observation for the Runtime, with the evidence the Runtime already acknowledged left as it was. [Settlement and refinement](../mechanisms/actions.md#settlement-and-refinement) owns those rules, including what to do when two trusted sources disagree — which is to keep the disagreement, because a record that quietly resolves it looks certain and is not.

Denial without a physical attempt is not evidence of external failure either. Work that was admitted and never confirmed one way or the other is unknown, not a coin flip weighted towards success.

## Principal and authority

Admission asked whether a request is permitted. The next three sections define what "permitted" is measured against: who is asking, what bound applies, and when a human must decide.

A **principal** is an authenticated application identity — a user, a service, or an acting-on-behalf-of identity — with tenant or application scope where that applies. An Execution is not a principal. It holds an authority binding, which bounds what may be done *on behalf of* a principal. Confusing the two is how a page starts treating "this work" as "this person," and then wonders why late results addressed to an Execution ID cannot be treated as that person's consent.

**Authority** is the upper bound of Kernel-mediated operations and resources available to an Execution. **Policy** decides whether a concrete request is permitted now, and can only narrow that bound. A **grant** records authority and, when applicable, the constraints on passing it on.

Those three are not three words for permission. Authority is the ceiling. Policy is the present. A grant is the record. An Execution whose authority includes `publish_report` can still be refused today because policy has narrowed the allowed accounts, and a grant that is still on file is not therefore current permission — signatures authenticate origin, they do not prove that the bound still holds.

**Delegation** gives a child only what survives three simultaneous limits: what was requested for it, what the parent was allowed to pass on, and what current policy permits now. A parent that may publish to one account cannot give a child the power to publish anywhere by asking for it. The child gets that one account, or nothing. Being created by someone never by itself grants what the creator has. Ancestry is responsibility, not permission: owning a [child](operations.md#child-and-ownership) means remaining answerable for required work, not inheriting the parent's bound. [Checking the concrete request](../mechanisms/authority.md#check-the-concrete-request) owns how those three limits are applied.

Permission is not one thing, either. Sending, inspecting, cancelling, delegating, reading, writing and impersonating are separate powers, and holding one says nothing about holding another. Knowing a correlation identifier is not permission to reply or settle. Holding a cursor is not permission to keep reading. A `user_id` that a model wrote authenticates nobody.

## Exact consent

**Exact consent** is one human's yes to one unchangeable action.

It binds four things at once, and a yes that is missing any of them is not this decision:

- the specific action — which Execution, which logical action;
- the exact request — validated arguments under a pinned operation version;
- the real-world targets — the account, resource, or content it will touch;
- the approval itself — who may approve, and how long the yes lasts.

Ordinary feedback is not that decision. Standing intent is not that decision. Approving "Plan A" need not approve its eventual recipient and payload. An editor writing "looks good" into the Execution's [mailbox](core.md#mailbox) is input the Runtime must interpret; it is not a yes to `publish_report` against this draft, this account, this operation revision.

The gap this term exists to close is the gap between what a person was shown and what the adapter sends. Once the yes is given, the request is frozen: anything that changes what it means — different arguments, a different account, different content under the same name, a different operation revision, a default quietly filled in on the way out — makes it a different request, and a different request needs its own decision. [Exact action consent](../mechanisms/authority.md#exact-action-consent) owns the full binding and the mutation rules, down to why a hash of the draft does not prove that anyone read the draft.

One yes covers one logical action — the logical action, not each physical attempt at it — and not the next action that happens to look the same. Whether a person approved an action and what then becomes of it are two different facts. Even with the yes in hand, the action can still be denied, [withdrawn](#withdrawal-and-compensation) or expire. Multi-approver policy is optional, not required for the idea to make sense.

A reply to a human input request is an observation, not this. Settling "which region should I search?" does not publish the report.

## Exposure and mediation

**Exposure** is filtered visibility of authorized operation metadata or callable choices. It is not a grant, and it is not a mandatory durable object. Showing a model that `publish_report` exists does not authorize any particular publication. A [Skill](roles.md#skill-and-package) manifest that *requests* publication is still a request. Retrieved text, [working notes](state.md#working-notes) and [inferred memory](state.md#derived-semantic-memory) can influence what a Runtime proposes; they cannot supply grants, approvals or settlement facts. [Content is not authority](../mechanisms/authority.md#content-is-not-authority) is the general form of this rule.

**Mediation** means the specific action path goes through Kernel admission and settlement. That is the path this page has been describing. It is also a narrower claim than it is often read as.

**Ambient native action** uses powers the Runtime's host or native system already provides — filesystem, network, a provider SDK, a subprocess. A Runtime that already holds those powers can publish without asking the Kernel at all. No Kernel decision stops such an action. Telemetry that observes it neither mediates it nor prevents it, and neither a model's refusal nor a log of a native call is evidence that anything was prevented.

Stopping ambient action takes one of two things, and they do not substitute for each other. Mediation, if the Runtime actually uses the mediated path. Physical [isolation](operations.md#isolated-execution), under a tested threat model, if the host must be prevented from acting even when the Runtime does not ask. A well-isolated Execution can still make an unmediated native call that isolation permits, and a well-mediated Execution may have no isolation at all. [Isolated Execution](operations.md#isolated-execution) owns that independence and [containment claims](../mechanisms/resources.md#containment-claims) owns the evidence an isolation claim has to rest on. This page needs only the vocabulary: exposure is not permission, mediation is a path, telemetry is neither, and native action is outside the Kernel's verbs.

## Withdrawal and compensation

Two controls apply after a request exists, and they act on different things. One acts on the request's future. The other acts on the world the request already changed.

**Withdrawal** is an explicit control preventing future admission of a named request. It is something the application applies to that intent, which is exactly what a correction message is not. An editor writing "actually, don't publish" is ordinary input: the Runtime may not read it for another second, and the send may already have been admitted. Ordinary correction cannot retract an action, invalidate consent, or count as a second person's yes. A promise of retraction has to come from an explicit control — withdrawing the named request, or invalidating the consent or resource binding it rests on.

Whether that promise can be kept is therefore a question of order, and [ordering revocation against admission](../mechanisms/authority.md#order-revocation-against-admission) owns it: the Kernel asks which of the two decisions it accepted first, because that is the only question it can actually answer. Win that race and the request never runs. Lose it and the request may still execute, because nothing the Kernel accepts afterwards can catch a request already on its way to a remote service. Cancelling the attempt at that point — where the provider supports cancellation at all — still leaves an action that may have gone through, and so does an expiry that lands after the send rather than before it. A wait deadline expiring is a different clock again, and says nothing about any of this.

**Compensation** is a new authorized action intended to counter an earlier one. It is not rollback of external history. A retraction notice is a second publication, not the unpublishing of the first. Compensation goes through admission like any other action, and can fail like any other action. [Retrying an action](../mechanisms/actions.md#retrying-an-action) owns how it sits against retry and changed arguments. Application or [Workflow](roles.md#workflow) saga policy owns whether to attempt compensation; the Kernel does not invent a compensating Effect because the original one settled badly.

What neither control can do is unsay a send, and that is the gap [responsibility](#settlement-and-reconciliation) exists to cover: stopping a request leaves the original attempt's evidence on the ledger, and evidence arriving later updates that ledger without reopening the Execution.

## Emission, result and output obligation

Not everything a Runtime produces is a request. The remaining terms name its output, which the Kernel records but does not perform.

An **Emission** is accepted nonterminal output from an Outcome: the draft, a progress note, a partial table. A **terminal result** is output accepted with completion. **Provisional output** is unaccepted diagnostic or streaming content — stdout tokens from a still-running attempt, or a model's reasoning trace. A token stream and an accepted Emission can look identical in a terminal, and only the Emission still counts for anything once that attempt is replaced. Provisional streams cannot certify consent, action success or a terminal result, and they must not be spliced into an apparently accepted transcript.

An **output obligation** makes accepted Emissions and results available for authorized, retention-bounded observation and replay. Nothing has to be pushed anywhere for it to be discharged: available-to-read is the whole promise, and the retained record itself keeps it.

External delivery is a separate application-adapter responsibility. Getting the draft to a person or another service is ordinary mediated action work, with all the uncertainty that implies, and it can still be pending after the Execution has completed. If business completion depends on a delivery receipt, that receipt has to be requested and observed as an Effect like any other before completing. [Output](../mechanisms/output.md) owns acceptance, replay, retention and the line between observation and sending; [external delivery](../mechanisms/output.md#external-delivery) is the last of those, not a side effect of the first.
