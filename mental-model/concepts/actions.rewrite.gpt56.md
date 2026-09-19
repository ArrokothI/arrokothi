# Actions, authority and observations

The [Kernel](core.md#kernel) can decide that work has been requested, decide that an attempt is permitted, and record evidence about what happened. Those are three different facts. Most of the vocabulary on this page exists to keep them different.

The distinction matters because the Kernel's control ends before the world's uncertainty does. Before an external request leaves through a trusted adapter, the Kernel can validate it, refuse it, require consent, or withdraw it. After the request has left, the Kernel cannot make the remote service unhappen. It can only record what trusted evidence establishes — including, sometimes, that the answer is unknown.

[Authority](../mechanisms/authority.md) owns the order in which permission is decided. [Actions](../mechanisms/actions.md) owns attempts, retry, settlement and remaining responsibility. [Output](../mechanisms/output.md) owns the separate question of how accepted Runtime output becomes observable.

## A first example

Return to the weekly report from [core](core.md#a-first-example). The Runtime has drafted the report, and now the application wants it published through a service it controls.

Writing the draft was ordinary Runtime work. Publishing is different because it asks something outside the Runtime to act. The Runtime therefore proposes an **Effect** in its [Outcome](core.md#outcome): publish this particular report through the pre-declared **operation** `publish_report`.

Nothing has been published yet. An Outcome is still a proposal. When the Kernel accepts that Outcome, the Effect becomes a **logical action** and installs an **intent**: an accepted obligation to try or route that work later. Acceptance records that the request exists. It does not say the request may run, and it does not say the service has received anything.

Permission comes next. **Admission** checks this concrete request against the Execution's **authority**, current **policy**, and, if publication requires a person to approve it, **exact consent** for this particular action. Only after admission may a **physical action attempt** go out through the trusted adapter.

From that point on, the Kernel is no longer deciding what the publisher did. It is recording what can be established about the attempt. **Settlement** accepts authenticated evidence about that attempt. If the evidence is incomplete, **reconciliation** may later ask the external system what already happened. Reconciliation asks; it does not publish again merely to discover whether the first publication ran.

Three neighboring distinctions complete the picture. **Exposure** only determines which capabilities a Runtime can see; visibility is not permission. **Withdrawal** can stop a named request that has not yet won admission; after a request may already have acted, only a new **compensation** action can try to counter it. And the draft itself was never an action at all: it is an **Emission**, accepted output that the Kernel makes available to read.

The sections below follow that story in order:

- **What can be requested** — [Operation](#operation) and [Effect](#effect).
- **What acceptance creates** — [Logical action and intent](#logical-action-and-intent).
- **Whether an attempt may run** — [Admission and physical action attempt](#admission-and-physical-action-attempt).
- **What is known afterward** — [Settlement and reconciliation](#settlement-and-reconciliation).
- **Who may authorize the attempt** — [Principal and authority](#principal-and-authority) and [Exact consent](#exact-consent).
- **What visibility and control do not imply** — [Exposure and mediation](#exposure-and-mediation).
- **What can still be changed after a request exists** — [Withdrawal and compensation](#withdrawal-and-compensation).
- **What the Runtime produces instead of requests** — [Emission, result and output obligation](#emission-result-and-output-obligation).

On this page, **action** means Kernel-mediated work unless the sentence explicitly qualifies it as native or ambient.

## Operation

An **operation** is a named, versioned, pre-declared contract for one kind of Kernel-mediated work.

The important word is *pre-declared*. Admission has to decide whether a concrete request is permitted against a contract that already exists. A human approval has to bind values whose meaning is already fixed. Settlement has to interpret a result according to a certainty rule that was chosen before anyone knew which result would arrive.

If the Runtime could invent the meaning of `publish_report` inside the same Outcome that asks to invoke it, none of those later decisions would have a stable target. Validation would check a contract supplied by the requester. Approval could bind a shape whose meaning changed before dispatch. Settlement could reinterpret an inconvenient response after the fact. The operation has to exist first.

An operation contract has five parts:

1. **Identity.** A stable operation name across revisions. `publish_report` remains the same operation when its schema moves from revision 2 to revision 3. Admission, consent and evidence refer to that identity together with a pinned [operation revision](identity.md#revision).
2. **Input and output schema.** The shape of arguments and results. For example, `publish_report` may take `{ reportRef }` and return `{ publishedAt }`.
3. **Supported schema features.** Which parts of that schema the operation actually enforces. Unknown properties are refused rather than silently dropped, and missing fields receive no undeclared defaults. <!-- TODO: rewrite once K2.2 selects the validator and enforced subset -->
4. **Exact input meaning.** What a valid value actually asks the service to do. A syntactically valid `reportRef` must still identify the exact reviewed revision, not merely any string with the right shape.
5. **Result-certainty behavior.** What evidence from an attempt can ever establish. Some operations can prove definite failure or query later for the real outcome. Others can only say that an attempt may have run.

The third and fourth parts explain why schema validity is not the same as semantic identity. A schema can prove that `reportRef` is a string. It cannot prove that the string names the draft the editor actually reviewed. Exact consent therefore binds the validated request *and its fixed meaning*, not merely an object that passed a validator.

The fifth part constrains settlement before the first request is ever sent. An operation with no reliable query and no safe retry path cannot manufacture certainty later. If the external system can only say "request sent" and then disappear, an interrupted attempt may remain unknown forever. Recording that limitation in the contract is more honest than discovering it during recovery and filling the gap with a guess.

An operation is also narrower than several nearby concepts:

- A [resource](state.md#resource-binding-and-attachment) is something work acts on rather than something invoked.
- A [service](roles.md#service-and-interaction-template) is a private implementation that may sit behind one or several operations.
- A [Skill](roles.md#skill-and-package) packages Runtime instructions and assets; it can request operations but is not itself callable as one.

A model need not see an operation under its stable identity. A [projection](roles.md#projection-and-invocation-binding) can show `publish_report` as "Publish this week's report." That friendly label may change, but the operation identity does not. A late model reply is resolved through the invocation binding it actually saw, not through whatever today's catalog happens to place under the same label.

Operations and [Activations](core.md#activation) vary independently. One Activation can propose several operations. The same operation can be proposed by many Activations over the lifetime of one Execution or across many Executions.

## Effect

An **Effect** is a proposal for one Kernel-mediated action, carried in an [Outcome](core.md#outcome).

"Proposal" separates Runtime intent from accepted truth. The Runtime can say "publish this report," but until the Outcome is accepted there is no Kernel obligation to publish, no admission to send, and no action record to settle later.

"One" separates an Effect from a workflow. Several Effects in one Outcome are several independent requests. Their position in an array does not create an execution order, transaction or dependency. If a workflow requires "reserve, then charge, then publish," it observes the reservation result before proposing the charge, and observes the charge result before proposing publication. Failure of a later action cannot roll back an earlier action that already changed the world. [Retrying an action](../mechanisms/actions.md#retrying-an-action) owns the consequences.

Five kinds of mediated work are proposed as Effects:

- invoking a service;
- reading governed data;
- requesting human input;
- creating a [child Execution](operations.md#child-and-ownership);
- sending a [message](operations.md#message-request-and-correlation).

Service invocation and governed reads point at an existing [operation](#operation), by stable identity and pinned revision, and carry arguments validated against that operation's contract. Reads are not exempt merely because they do not mutate the resource: if the application claims Kernel mediation for a governed read, the read is still an Effect.

Human input, child creation and message sending use their own proposal shapes and point at no operation. A person is not a service, a child is not a function call, and destination-mailbox acceptance is not an operation result. Their contracts live with the communication mechanisms that know what those requests mean.

An [Emission](#emission-result-and-output-obligation) is not an Effect. The difference is direction. An Emission is output the Runtime has already produced and asks the Kernel to accept. An Effect is work the Runtime wants someone else to perform. "I wrote the report" and "publish the report" may appear in the same Outcome, but they are different facts with different consequences.

Before acceptance, the Runtime needs a local way to refer to the request it is proposing. A **proposal key** is that stable local name within the Activation. The same Outcome can use the key in a [wait](core.md#wait-subscription-and-generation), so "request this publication and wait for its result" can be accepted as one decision.

Acceptance binds the proposal key to an **Effect ID**, the immutable logical request identity within the Execution. The Effect ID names the request, not a particular network send. One logical action may have more than one physical attempt when the retry contract permits it, while the Effect ID remains the same.

## Logical action and intent

A **logical action** is the immutable action record created when an Effect is accepted. An **intent** is the accepted obligation to perform or route that work later.

The distinction between intent and execution closes a crash window that otherwise has no truthful state.

Suppose the weekly-report Outcome is accepted, and the process dies before publication is attempted. If the system records only completed external work, the request disappears even though the Runtime's accepted progress says it asked to publish. If the system treats acceptance as evidence of publication, it records something that may never have happened. The intent gives the system the honest third state: the request exists and is owed, but no attempt has yet been established.

That is why [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) commits Runtime progress and Effect intents together. The saved progress cannot say "I requested publication" while the action ledger has no request, and the action ledger cannot contain a publication obligation that the accepted Runtime state never asked for.

The logical action is immutable because later facts bind to it. Consent identifies one action. Withdrawal names one action. Settlement evidence accumulates under one action. If the original request could be edited in place after those facts were recorded, yesterday's approval could silently become approval for today's different request.

Immutability does not mean nothing about the action changes. What changes is the Kernel's knowledge and disposition around the fixed request: whether an attempt is admitted, what evidence has arrived, whether the result is valid, and who remains responsible. Those facts accumulate around the logical action rather than rewriting what the action originally meant.

An accepted intent is therefore a request that exists. Whether it may run is a later question.

## Admission and physical action attempt

**Admission** is the ordered Kernel decision that authorizes one concrete attempt of a logical action under the Execution's [authority](#principal-and-authority), current policy, and any required [exact consent](#exact-consent). A **physical action attempt** is one invocation of that admitted logical action through a trusted adapter.

Acceptance and admission answer different questions:

- acceptance asks, **does this request exist as an obligation?**
- admission asks, **may this particular attempt run now?**

Keeping them separate lets the Kernel retain legitimate work that is not presently allowed to run. A publication can exist while waiting for an editor's approval. A request can remain accepted while current policy temporarily refuses the destination. Neither case requires the system to forget the request or pretend it already ran.

Admission also happens per physical attempt. Permission that was valid for yesterday's attempt is not automatically permission for today's retry. [Authority](../mechanisms/authority.md#order-revocation-against-admission) owns the ordering of the current policy and consent decision.

The attempt record is written before the adapter sends. That ordering creates an important asymmetry. If the process fails after recording admission but before receiving a trustworthy result, the Kernel knows that an authorized attempt may have escaped into the world. It does **not** know that the remote service failed to act. Missing evidence is evidence the Kernel did not receive, not evidence of non-execution.

Admission records the attempt under current **dispatch ownership**. That fence is independent of the Runtime's [writer epoch](identity.md#writer-epoch). The Runtime attempt that proposed the Effect and the action dispatch that later performs an admitted attempt are different efforts with different lifetimes. Replacing a stale Runtime attempt does not retroactively cancel an action already admitted for dispatch, and action-dispatch fencing does not grant a stale Runtime permission to commit a new Outcome. <!-- TODO: if a dispatcher is ever defined as its own concept, link "action dispatch" to it -->

Unknown operations, invalid arguments and unsupported schema constructs refuse before any executor is invoked. Waiting for human consent consumes no physical attempt. A business-level refusal from the service, by contrast, is an observation about an attempted action and can be delivered back to the Runtime without implying that the whole Execution failed.

Retry is deliberately harder than first admission. Repeating local computation is cheap; repeating an external action may charge twice, publish twice, or send twice. A physical retry is safe only when the operation's contract provides enough evidence or provider-enforced idempotency to make it safe. A Kernel-local key can stop this Kernel from issuing the same send twice; it cannot force a provider to deduplicate two requests that both arrived.

## Settlement and reconciliation

Once a physical attempt may have left the trusted adapter, the Kernel's role changes. Before that boundary it can prevent an unauthorized attempt. After that boundary it can only record what trusted evidence establishes.

**Settlement** accepts authenticated evidence for a particular physical action attempt and records the resulting observation. **Reconciliation** uses a trusted query or inspection path to refine uncertainty about work that may already have happened.

Reconciliation is not re-execution. If the publication response disappeared, reconciliation asks the publisher whether that publication exists. Sending the report again to discover whether the first send worked creates another external event and therefore answers a different question.

Settlement cannot be represented faithfully by one generic status. Four dimensions remain independent:

| Dimension | Question it answers |
|---|---|
| **Request disposition** | What may happen next for the request: waiting for approval, denied, withdrawn, no more attempts? |
| **Attempt evidence / certainty** | What is known about the external attempt: no attempt, may have run, observed success, definite failure, unknown? |
| **Result validity** | Is the returned value usable under the operation's result contract, even if the external work happened? |
| **Responsibility / obligation** | Who still owes settlement or required results: this Execution, a named durable owner, or an explicit policy abandonment? |

These are conceptual dimensions, not a required enum cross-product. An implementation may store them however it likes, as long as it does not erase one by collapsing it into another.

The reason for keeping them separate appears whenever two apparently contradictory facts are both true. A publisher can confirm that the report went live and return a malformed `publishedAt` value. Attempt certainty is then observed success while result validity is failure. Calling the whole thing simply "failed" invites a second publication; calling it simply "successful" hides that the Runtime cannot use the result it expected.

The same separation applies to control decisions. "Stop retrying" changes what the system will do next; it does not discover what the previous attempt did. Acknowledging an Event that says an action is unknown records that the Runtime has seen the uncertainty; it does not discharge the underlying responsibility. [Completion](../mechanisms/lifecycle.md#completion-is-an-accounting-check) therefore cannot treat "we know that we do not know" as the same thing as settlement.

**Unknown** is a real statement about evidence. It is not a synonym for failure and not an empty cell waiting for optimism. An admitted request with a lost result may have executed. Elapsed time, model prose and weakly consistent absence do not prove otherwise.

Later trusted evidence may refine unknown to observed success or definite failure. That refinement appends a new action-evidence [revision](identity.md#revision) and a new observation; it does not rewrite evidence a Runtime already consumed. Contradictory trusted reports remain contradictory until reconciliation resolves them. Last-write-wins would make the record look more certain precisely when the world became less certain.

## Principal and authority

Admission needs to know whether a concrete request is permitted. Three concepts answer different parts of that question: who the application authenticated, what the Execution may ever ask the Kernel to do, and whether this request is permitted now.

A **principal** is an authenticated application identity — a user, service, or acting-on-behalf-of identity — with tenant or application scope where relevant.

An Execution is not a principal. The Execution is work. It carries an authority binding that limits what may be done on behalf of a principal. Treating the work itself as the identity would make possession of an Execution ID look like authentication and would let relationships such as parenthood stand in for application identity. Neither is valid.

**Authority** is the upper bound of Kernel-mediated operations and resources available to an Execution. **Policy** decides whether a concrete request is permitted now and may only narrow that bound. A **grant** records authority and, when applicable, the constraints under which some of it may be delegated.

The distinction between authority and policy is temporal as well as conceptual. Authority says what this Execution is allowed to be capable of in principle. Policy answers whether this request may proceed under current facts. An Execution can have authority to publish reports while current policy refuses publication to one suspended account. The authority ceiling did not change merely because today's answer is no.

A grant is a record, not current permission by itself. A signature can authenticate where a grant came from; it cannot prove that the grant has not expired or been revoked. Admission checks the concrete request against the current authority and policy state rather than treating possession of an old token as the final answer.

**Delegation** gives a child only the intersection of three limits:

1. what was requested for the child;
2. what the parent is allowed to delegate;
3. what current policy permits.

A parent allowed to email one address cannot create a child that may email every address by simply asking for broader authority. The child receives the surviving intersection, or nothing.

Creation also does not imply permission inheritance. A parent remains responsible for required child work, but responsibility and authority are different edges. **Ancestry is responsibility, not permission.**

Send, inspect, cancel, delegate, read, write and impersonate are likewise separate powers. Knowing a resource ID, correlation ID or model-generated `user_id` does not authenticate the caller or widen the Execution's authority.

## Exact consent

Most admitted actions need no human approval beyond application policy. Some actions are consequential enough that a person must decide *this particular one*.

**Exact consent** is one human's yes to one unchangeable action.

The approval binds four things together:

- **The specific action.** Which Execution and which logical action the person is approving.
- **The exact request.** The validated arguments under a pinned operation revision.
- **The real-world targets.** The account, resource, destination or immutable content the action will touch.
- **The approval itself.** Who is eligible to approve, which decision was made, and how long it remains valid.

All four close the same gap: the distance between what the person was shown and what the adapter eventually sends.

An approval that says only "publication approved" could be reused for a different report. Approval of arguments without the destination could be redirected to another account. Approval before validation could bind text that a later default or coercion silently changes. Approval without a validity bound could be replayed long after the circumstances that justified it disappeared.

For that reason, validation and normalization finish before the person is asked. After approval, only meaning-preserving transport encoding may change. A different argument, account, resource revision, content revision or operation revision is no longer the thing the person approved and requires a new action or new consent decision.

Ordinary feedback is not exact consent. An editor writing "looks good" in a conversation is input that the Runtime may interpret. A retained note that the editor usually approves publication is standing intent that policy may consider. Neither is a human decision bound to the exact logical action the adapter will send.

Approving a plan is not the same thing either. "Draft, review, then publish" describes a workflow. The eventual publication has a concrete recipient, payload and operation revision that may not have existed when the plan was approved.

Approval state is also separate from action disposition. An approved action can later be denied by newer policy, [withdrawn](#withdrawal-and-compensation), or expire. Consent answers the human question. It does not guarantee that the action will run.

A reply to a human input request remains an observation under the communication contract. It does not become exact consent merely because a person supplied it.

## Exposure and mediation

Three questions about a capability are easy to hear as one:

1. can the Runtime see that the capability exists?
2. does the action path go through Kernel authority and settlement?
3. can the Runtime act through host powers that bypass that path?

The answers are independent.

**Exposure** is filtered visibility of authorized operation metadata or callable choices. A projection may show a model `publish_report`, hide it, or present it under another alias. Exposure matters because descriptors themselves can disclose information. But exposure is not a grant. Seeing an operation does not authorize any invocation of it, and a stale catalog cannot preserve permission that current policy removed.

**Mediation** means that a particular action path goes through Kernel admission and settlement. The subject is the path, not the Runtime as a whole. One Runtime can have a mediated publication path and, in the same process, an ordinary HTTP client that can reach the same service directly.

**Ambient** or **native action** uses powers the Runtime's host or native system already provides: filesystem access, network access, provider SDKs, subprocesses and similar capabilities. Those actions are outside the Kernel's action lifecycle unless the deployment removes the ambient path and routes access through mediation.

Telemetry does not change that boundary. Logging a native HTTP request can tell an observer that the request happened. It cannot authorize the request before the fact, and it cannot prevent the request merely by observing it.

Stopping ambient action therefore requires a different guarantee:

- **mediation**, if the Runtime actually uses the mediated path; or
- physical [isolation](operations.md#isolated-execution), if the deployment must prevent the Runtime from reaching a capability without asking.

The two do not imply each other. An isolated Runtime can still perform native actions that the sandbox deliberately permits. A mediated Runtime can run with broad ambient host access. Any claim stronger than "the mediated path is governed" has to come from the deployment's tested containment model, not from Kernel bookkeeping.

## Withdrawal and compensation

Once a request exists, two controls apply at different moments.

**Withdrawal** acts on the request's future. It prevents future admission of one named pending logical action.

**Compensation** acts on a world an earlier action may already have changed. It is a new authorized action intended to counter the earlier one.

Withdrawal is deliberately not the same thing as conversational correction. If an editor sends "actually, don't publish," that message is ordinary input. The Runtime may not read it before the publication is admitted. To make "do not publish" a reliable control, the application has to withdraw the specific pending action, or invalidate its consent or resource binding, before admission wins the ordering race.

That boundary is hard. Revocation accepted before admission blocks the attempt. An attempt already admitted may still execute after revocation. Once the request has left for a remote service, no later Kernel decision can reach into that service and make the send not have happened.

Provider cancellation, where supported, can be attempted after admission, but cancellation itself does not prove non-execution. Expiry before admission can close a request cleanly. Expiry after send says nothing about whether the remote work already occurred. A wait deadline is a different clock again and does not settle the action.

Compensation exists because withdrawal eventually runs out of time. A retraction notice is a second publication, not deletion of the first publication from history. A refund is a second transfer, not an erasure of the original charge. The compensating action has its own logical identity, authority check, possible consent requirement, physical attempt and settlement uncertainty.

The Kernel does not invent compensation automatically because an earlier action settled badly. Application or [Workflow](roles.md#workflow) policy decides whether compensation is appropriate and what it should request.

Withdrawal also does not erase responsibility for an already uncertain attempt. If publication may have happened, stopping future attempts leaves that evidence exactly as uncertain as before. The original ledger remains responsible for the unresolved external fact until it is reconciled, transferred to a named durable owner, or explicitly abandoned under policy.

## Emission, result and output obligation

Not everything a Runtime produces is a request. Output travels through the Kernel without asking the Kernel to perform it.

An **Emission** is accepted nonterminal output from an Outcome: a draft, progress summary or partial table that the Runtime has already produced.

A **terminal result** is output accepted together with completion.

**Provisional output** is content produced before acceptance, such as diagnostic stdout or streamed model tokens from a still-running Runtime attempt. It may be useful to display, but it is not accepted truth. A replacement attempt can make that stream irrelevant. Provisional output therefore cannot certify consent, action success or a terminal result, and it must not be spliced into the accepted transcript as if the Kernel had committed it.

An **output obligation** is the promise to make accepted Emissions and results available for authorized, retention-bounded observation and replay. The retained output record itself can satisfy that promise. Nothing has to be pushed to another person or service merely because the output was accepted.

The older term **publication intent** referred to this availability obligation. Do not reuse it. The name suggests public disclosure or channel delivery, and neither is implied.

External delivery is a separate action. Sending the weekly report to a chat channel, email recipient or publication service requires its own destination/account authorization and carries the same uncertainty as other external work. Delivery can remain pending or unknown even after the Execution that produced the content has completed.

If business completion requires proof of delivery, the Runtime requests that delivery as an [Effect](#effect), waits for its result, accounts for the result, and only then completes. A timeout cannot prove that the message was not delivered.

Observation is different again. A UI can read and display accepted output without sending input to the Execution, acknowledging one of its Events, or waking a parent that owns it. Reading is observation. Sending is action. [Output](../mechanisms/output.md) owns acceptance, replay, retention and the boundary between the two.
