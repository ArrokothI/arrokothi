# Actions, authority and observations

The [Kernel](core.md#kernel) records what has been accepted about an [Execution](core.md#execution). This page names the terms that appear when that Execution asks the world to do something — publish a report, read governed data, create a child, put a question to a person — and the terms that appear when it produces output that is not a request at all.

Each term is defined here and nowhere else. How they interact is specified elsewhere: [authority](../mechanisms/authority.md) owns the order in which permission is checked, [actions](../mechanisms/actions.md) owns how an accepted request becomes an attempt and then evidence, and [output](../mechanisms/output.md) owns how produced content becomes available to read. This page says what the pieces are.

## A first example

Return to the weekly report. The Runtime has drafted it. Drafting happened inside the Runtime: model calls, files, whatever the application chose. None of that asked the Kernel to do anything in the world.

Publishing is different. The application controls a publication service, and it wants the Kernel to mediate the send — to check that this Execution may publish, to record that it asked, and to retain whatever evidence comes back. The Runtime cannot do that by calling the service on its own and mentioning it later. A native call the Kernel never saw is not a Kernel-mediated action, and no later story about it becomes one.

So the Runtime proposes, in its [Outcome](core.md#outcome): please publish this draft. That proposal is an **Effect**. It points at a named **operation** that already exists — `publish_report` — because the Kernel cannot admit, and a person cannot approve, a request that has no stable contract. The Outcome also carries the saved progress and a wait for the publication result. None of this is true yet. An Outcome is still a proposal.

The Kernel accepts it as one decision. The progress and the request are now accepted together: there is a **logical action** with an **intent** — an obligation to try the publication, not evidence it ran. Before anything is sent, **admission** checks the request against the Execution's **authority**, current **policy**, and, if the operation requires it, a human's **exact consent**. A **physical attempt** may then go out through a trusted adapter. **Settlement** records what is known about that attempt, along four dimensions that must not be collapsed into one status field.

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
3. **Supported schema features.** Which parts of that shape are actually enforced. An unknown property on the argument is refused instead of silently dropped, and a missing field gets no substituted default. <!-- TODO: rewrite once K2.2 selects the validator and the enforced subset -->
4. **Exact input meaning.** What a valid-looking argument truly asks for. `reportRef` must name the exact reviewed revision, not any string of the right shape.
5. **Result-certainty behaviour.** What an attempt can ever prove afterwards: whether "definitely failed to publish" is even reachable, or whether every failed attempt stays [unknown](#settlement-and-reconciliation).

The middle two parts are the ones a reader is most likely to skip, and they are the ones that do the work. A schema check only confirms shape. A human approving the action needs the meaning behind a valid shape, which is why [exact consent](#exact-consent) binds the validated arguments and not the plan that produced them. And the certainty declaration decides, afterwards, which of settlement's four dimensions an attempt can even reach. An operation with no way to query or retry safely can never move past "unknown," however the Kernel records it.

A model chooses from names it can read. Permission and evidence need names that do not drift. So an operation keeps its identity when it is shown under a friendlier label. A [projection](roles.md#projection-and-invocation-binding) may display `publish_report` as "Publish this week's report," but the caller still invoked the same operation. That matters because the label can change between requests, while a late reply must still resolve to the operation the caller actually saw, not to whatever the catalog offers under that label now.

Nearby contracts are easy to confuse with an operation because they also have names. A [resource](state.md#resource-binding-and-attachment) is acted on rather than called. A [service](roles.md#service-and-interaction-template) is a private implementation behind selected operations. A [Skill](roles.md#skill-and-package) packages instructions rather than exposing a call. None of those is an operation, and treating any of them as one would put permission and evidence on the wrong object.

Operations and [Activations](core.md#activation) vary independently. One Activation can propose many operations. Many Activations can name the same operation over time. The Activation is the exchange; the operation is the kind of work.

What validator an implementation uses, and which subset of a schema it actually enforces, is not decided on this page. What is decided is that those are properties of the operation, not of the call.

## Effect

An **Effect** is a proposal for one Kernel-mediated action, carried in an Outcome.

"One" is load-bearing. Three Effects in one Outcome are three independent requests, not a transaction and not an order. Proposing "reserve, then charge, then publish" in a single array says only that three requests are wanted. It does not say they run in that order, and it does not say any of them is conditional on another. For a sequence, the Runtime proposes charge only after reserve's result, and publication only after charge's result. Failure of the second cannot roll back the first. [Retrying an action](../mechanisms/actions.md#retrying-an-action) owns that consequence; the concept-level fact is that an Effect never implies a sibling.

Not every Effect points at an [operation](#operation). Two families exist, and mixing them is how a page starts treating every request as a service call.

Invoking a service and reading governed data do point at an operation. The proposal names the operation's identity and pinned revision, and its arguments are validated against that operation's schema. Each Effect points at at most one operation; many Effects over time can point at the same one. The rest of this page's life cycle — admission, consent, settlement — resolves through both the Effect and the operation it named. Reads are not a special exemption. A governed read is still a Kernel-mediated action, still admitted, still settled; [the state service](../mechanisms/state.md#state-service-contract) is explicit that they are Effects.

Requesting [human input](operations.md#message-request-and-correlation), creating a [child](operations.md#child-and-ownership) and sending a [message](operations.md#message-request-and-correlation) use their own shapes instead, and point at no operation. A person is not a service. A child is not a function call. A message is not an invocation. Each of those has a contract of its own — who may answer, who owns the new work, what send success means — and forcing them through an operation schema would flatten those contracts into argument fields.

An [Emission](#emission-result-and-output-obligation) is not an Effect. Output is something the Runtime has produced. An Effect is something it wants done. The draft of the report is an Emission; asking the publication service to send it is an Effect. Collapsing those two would make "I wrote this" look like "please publish this," and the Kernel would then try to admit a request that was never made.

A **proposal key** is the Runtime's stable local name for that proposal within the Activation. Acceptance binds it to an **Effect ID** — the immutable logical request identity within the Execution. The Effect ID is not the identity of a physical send. A wait registered in the same Outcome may refer to the proposal by its local key, because at the moment the Outcome is submitted the Effect ID does not yet exist.

Until the Kernel accepts the Outcome, the Effect is only a proposal. Nothing about it is an obligation, a permission or a send. [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) is the decision that turns it into the next term.

## Logical action and intent

A **logical action** is the immutable action record created when an Effect is accepted. An **intent** is an accepted obligation to perform or route specified work later. It is not evidence that the work already ran.

The gap between those two is the whole point of having both words. Accepting the Outcome commits the Runtime's [progress](state.md#progress) and this intent in one decision. A crash between that acceptance and the first attempt therefore leaves a recorded obligation rather than a lost request. The Kernel still knows that publication was asked for. It does not yet know whether publication happened.

That is also why progress and requested actions have to agree. Suppose the Kernel accepted an intent to publish the report but not the progress that decided to publish it. The Kernel is now holding an obligation to publish, while the Runtime's saved state has no record of ever having asked. Suppose the reverse: progress that decided to publish, but no intent. The Runtime believes it asked, and nothing will try. Neither record describes a decision anyone actually made. [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) therefore takes all of it or none of it.

An intent is a request that now exists. Whether it may run is a later, separate question. That question is admission.

## Admission and physical action attempt

**Admission** is the ordered decision that authorizes a concrete attempt under the Execution's [authority](#principal-and-authority), current policy, and required [consent](#exact-consent). It records that intent under current dispatch ownership. A **physical action attempt** is one invocation of that logical action through a trusted adapter.

An accepted intent is a request that exists. Admission is whether that request may run *now*. The two must not be run together. An Execution that is allowed, in general, to publish is not therefore allowed to publish this draft to this account under today's policy, and a human's standing willingness to approve publications is not a yes to this one.

Admission can precede sending. It cannot prove receipt. Writing the attempt record before the adapter sends is what leaves evidence that something may be running out in the world if the process dies in between. The missing receipt is then evidence the Kernel did not get, not evidence the service did not act. Treating absence as failure is how a system comes to retry a payment it cannot see.

Dispatch ownership for an action is fenced independently of the Runtime's [writer epoch](identity.md#writer-epoch). The Runtime attempt that proposed the action and the action dispatch that performs it are two different efforts, with two different fences. A takeover that advances the writer epoch does not, by itself, cancel a publication that has already been admitted, and a stale Runtime Outcome cannot sneak a second intent through by arriving after a replacement attempt has taken over the exchange. <!-- TODO: if a dispatcher is ever defined as its own concept, link "action dispatch" to it -->

Unknown operations, invalid input and unsupported schema constructs refuse before any executor is invoked. A business refusal — the service will not publish to that account — is an observation the Runtime can handle, not necessarily the end of the Execution. Waiting for consent consumes no physical attempt: the request is parked, not half-sent.

Who performs the send, and whether that role is its own concept, is not decided on this page. What is decided is that admission is a Kernel decision, that it records the attempt before the send, and that a recorded attempt is not a received one. [Admission and sending](../mechanisms/actions.md#admission-and-sending) owns the sequence; [authority](../mechanisms/authority.md) owns the ordered permission check.

## Settlement and reconciliation

After an attempt, the Kernel needs evidence of what happened. It gets that evidence in one of two ways, and they are not interchangeable.

**Settlement** accepts authenticated evidence for a particular action attempt and records its observation for the Runtime. **Reconciliation** queries or inspects existing external work through a trusted path to resolve uncertainty. Reconciliation is not blind re-execution. When the answer to "did the publish run?" went missing, reconciliation asks the service, rather than publishing again to find out. Publishing again to find out is how a report appears twice.

What settlement records has more than one axis. Keep four dimensions distinct:

| Dimension | Meaning, on the report |
|---|---|
| Request disposition | What may happen next: waiting for approval, denied, withdrawn, no more attempts |
| Attempt evidence / certainty | What is known externally: no attempt, may have run, observed success, definite failure, unknown |
| Result validity | Whether the returned value satisfies the result contract, even if the action ran |
| Responsibility / obligation | Who still owes settlement or required results: this Execution, a named durable owner, or explicit policy abandonment |

These are conceptual dimensions, not a mandated enum cross-product. An implementation is not required to store a cell for every combination. It is required not to collapse any two of them into one field that cannot tell them apart.

Collapsing any two loses a real fact. "The service confirmed it ran" and "the value it returned is unusable" can both be true of one publication; an application must act differently on each. Stopping retries changes disposition, not certainty: an operator choosing "stop trying" is a decision about what this Execution will do next, not a discovery about what the service did. Acknowledging an unknown observation does not remove the obligation: the Runtime has seen the uncertainty, and the work is still owed. [Completion](../mechanisms/lifecycle.md#completion-is-an-accounting-check) will not accept "we noted that we do not know" as accounting.

**Unknown** is a disposition, not a failure, and not a gap waiting to be filled in with a guess. Until proved otherwise, a lost admitted attempt may have executed. Elapsed time, Agent prose and weakly consistent absence cannot establish success or failure. The Kernel records what it knows, including that it does not know.

Unknown may later refine to observed success or definite failure through authorized reconciliation. That refinement appends a new immutable evidence revision and a new action-observation Event. It does not edit evidence the Runtime already acknowledged. Two trusted sources disagreeing is itself a fact; last-write-wins hides it and produces a record that looks certain and is not.

Denial without a physical attempt is not evidence of external failure. Work that was admitted but not yet confirmed one way or the other is unknown, not a coin-flip at success. [Settlement and refinement](../mechanisms/actions.md#settlement-and-refinement) gives worked cases along each axis.

## Principal and authority

Admission asked whether a request is permitted. The next three sections define what "permitted" is measured against: who is asking, what bound applies, and when a human must decide.

A **principal** is an authenticated application identity — a user, a service, or an acting-on-behalf-of identity — with tenant or application scope where that applies. An Execution is not a principal. It holds an authority binding, which bounds what may be done *on behalf of* a principal. Confusing the two is how a page starts treating "this work" as "this person," and then wonders why late results addressed to an Execution ID cannot be treated as that person's consent.

**Authority** is the upper bound of Kernel-mediated operations and resources available to an Execution. **Policy** decides whether a concrete request is permitted now, and can only narrow that bound. A **grant** records authority and, when applicable, the constraints on passing it on.

Those three are not three words for permission. Authority is the ceiling. Policy is the present. A grant is the record. An Execution whose authority includes `publish_report` can still be refused today because policy has narrowed the allowed accounts, and a grant that is still on file is not therefore current permission — signatures authenticate origin, they do not prove that the bound still holds.

**Delegation** gives a child only what survives three simultaneous limits: what was requested for it, what the parent was allowed to pass on, and what current policy permits now. A parent that may email one address cannot give a child the power to email any address by asking for it. The child gets that one address, or nothing. Being created by someone never by itself grants what the creator has. Ancestry is responsibility, not permission: owning a [child](operations.md#child-and-ownership) means remaining answerable for required work, not inheriting the parent's bound. [Checking the concrete request](../mechanisms/authority.md#check-the-concrete-request) owns how those three limits are applied.

Send, inspect, cancel, delegate, read, write and impersonate are separate powers. Knowing a correlation identifier is not permission to reply or settle. Holding a cursor is not permission to keep reading. A model-generated `user_id` cannot authenticate a caller.

## Exact consent

**Exact consent** is one human's yes to one unchangeable action.

It binds four things at once, and a yes that is missing any of them is not this decision:

- the specific action — which Execution, which logical action;
- the exact request — validated arguments under a pinned operation version;
- the real-world targets — the account, resource, or content it will touch;
- the approval itself — who may approve, and how long the yes lasts.

Ordinary feedback is not that decision. Standing intent is not that decision. Approving "Plan A" need not approve its eventual recipient and payload. An editor writing "looks good" in the report's mailbox is input the Runtime must interpret; it is not a yes to `publish_report` against this draft, this account, this operation revision.

The gap this term exists to close is the gap between what a person was shown and what the adapter sends. After approval, only meaning-preserving transport encoding is allowed. Changing arguments, account, resource content or version, or operation revision means the request is no longer the thing they agreed to, however small the change looks. Hidden defaults, coercions and argument-mutating hooks must not run after approval. A hash of the draft does not prove the person saw the draft.

Consent normally covers one logical action, including safe physical retries while the yes is still valid, not all future equal-looking actions. An approved action can later be denied, [withdrawn](#withdrawal-and-compensation) or expire: approval state and action disposition are different dimensions, for the same reason settlement keeps four. [Exact action consent](../mechanisms/authority.md#exact-action-consent) owns the full binding and the mutation rules. Multi-approver policy is optional, not required for the idea to make sense.

A reply to a human input request is an observation, not this. Settling "which region should I search?" does not publish the report.

## Exposure and mediation

**Exposure** is filtered visibility of authorized operation metadata or callable choices. It is not a grant, and it is not a mandatory durable object. Showing a model that `publish_report` exists does not authorize any particular publication. A [Skill](roles.md#skill-and-package) manifest that *requests* publication is still a request. Retrieved text, [working notes](state.md#working-notes) and [inferred memory](state.md#derived-semantic-memory) can influence what a Runtime proposes; they cannot supply grants, approvals or settlement facts. [Content is not authority](../mechanisms/authority.md#content-is-not-authority) is the general form of this rule.

**Mediation** means the specific action path goes through Kernel admission and settlement. That is the path this page has been describing. It is also a narrower claim than it is often read as.

**Ambient native action** uses powers the Runtime's host or native system already provides — filesystem, network, a provider SDK, a subprocess. A Runtime that already holds those powers can publish without asking the Kernel at all. No Kernel decision stops such an action. Telemetry that observes it neither mediates it nor prevents it. An LLM refusing a request, and a log of a native call, are not evidence of prevention.

Stopping ambient action takes one of two things, and they do not substitute for each other. Mediation, if the Runtime actually uses the mediated path. Physical [isolation](operations.md#isolated-execution), under a tested threat model, if the host must be prevented from acting even when the Runtime does not ask. A well-isolated Execution can still make an unmediated native call that isolation permits. A well-mediated Execution may have no isolation at all. [Trust and containment](../deployment.md#trust-and-containment) owns that independence; this page only needs the vocabulary: exposure is not permission, mediation is a path, telemetry is neither, and native action is outside the Kernel's verbs.

## Withdrawal and compensation

Two controls apply after a request exists, and they act on different things. One acts on the request's future. The other acts on the world the request already changed.

**Withdrawal** is an explicit control preventing future admission of a named request. It is a control the application applies to that intent. A correction message is not withdrawal. An editor writing "actually, don't publish" is ordinary input. The Runtime may not read it for another second, and the send may already have been admitted. Ordinary correction cannot itself retract an action, invalidate consent, or be read as a second person's yes. To promise retraction, the application must withdraw the named pending action, or invalidate its consent or resource binding, before admission. [Ordering revocation against admission](../mechanisms/authority.md#order-revocation-against-admission) decides which accepted decision came first, because that is the only question the Kernel can actually answer. Revocation accepted first blocks admission. An already admitted request may still execute after revocation. Once a request has left for a remote service, nothing the Kernel accepts afterwards can reach it.

If admission already won, attempt cancellation only where the provider supports it, and still treat the action as possibly having executed. Expiry before admission closes the request. Expiry after send does not prove non-execution. A wait deadline expiring is a different clock entirely, and says nothing about this.

**Compensation** is a new authorized action intended to counter an earlier one. It is not rollback of external history. A retraction notice is a second publication, not the unpublishing of the first. Changed arguments form a new action; compensation forms a new action too. Both go through admission, and both can fail. Application or [Workflow](roles.md#workflow) saga policy owns whether to attempt compensation; the Kernel does not invent a compensating Effect because the original one settled badly.

Withdrawal before admission can atomically prevent the future attempt and record a refusal. It cannot unsay a send that already happened. That remaining uncertainty is why [responsibility](#settlement-and-reconciliation) outlives withdrawal, and why an operator's "stop trying" still leaves the original attempt's evidence on the ledger. Late authenticated evidence after failure or cancellation updates that ledger without reopening the Execution.

## Emission, result and output obligation

Not everything a Runtime produces is a request. The remaining terms name its output, which the Kernel records but does not perform.

An **Emission** is accepted nonterminal output from an Outcome: the draft, a progress note, a partial table. A **terminal result** is output accepted with completion. **Provisional output** is unaccepted diagnostic or streaming content — stdout tokens from a still-running attempt, a reasoning trace that will vanish if that attempt is replaced. A token stream and an accepted Emission can look identical in a terminal. Only one of them survives the attempt being replaced. Provisional streams cannot certify consent, action success or a terminal result, and they must not be spliced into an apparently accepted transcript.

An **output obligation** makes accepted Emissions and results available for authorized, retention-bounded observation and replay. The retained output record itself can fulfill that obligation. Nothing has to be pushed anywhere for the obligation to be discharged: available-to-read is the promise, and it is discharged by having the content available. The older name **publication intent** meant this obligation. Do not reuse it. It sounded like automatic public disclosure, or like sending to a channel, and it was neither.

External delivery is a separate application-adapter responsibility. Getting the draft to a person or another service is ordinary mediated action work, with the uncertainty that implies. Delivery can remain pending or unknown after the Execution has completed. If business completion requires a delivery receipt, the Runtime must request that Effect, observe the result, and only then complete. A timeout cannot prove the message was not sent. [Output](../mechanisms/output.md) owns acceptance, replay, retention and the line between observation and sending; [external delivery](../mechanisms/output.md#external-delivery) is the last of those, not a side effect of the first.

A UI can show the draft without publishing it. Observation does not send input, does not acknowledge an Event, and does not wake a parent waiting on a child. Reading is not acting. Acting is what the rest of this page was about.