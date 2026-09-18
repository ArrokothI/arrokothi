# Actions, authority and observations

This page defines what happens when a Runtime wants something done outside itself — and who decides whether it may. The concepts here sit between the [Outcome](core.md#outcome) that proposes work and the [Event](core.md#event) that eventually reports what happened, and the page follows that path in order.

The first half covers the work itself: what a mediated action is, how the Runtime proposes one, what the Kernel records when it accepts that proposal, how the proposal becomes a real attempt, and what the Kernel can know about the result. The second half covers who may act: principal, authority, consent, and the two fundamentally different ways the system can limit what a Runtime does. A final section covers output — what the Runtime produces for its audience, which is related to but distinct from the result of an action.

The same weekly report from [core](core.md#a-first-example) is the running example throughout.

## Operation

An **operation** is a named, versioned, pre-declared contract describing one thing the system can do through a trusted adapter. It has five parts: a stable identity, an input schema, an output schema, supported schema features, and a specification of the exact input meaning and result-certainty behaviour.

"Pre-declared" is the property that distinguishes this from an ad-hoc API call, and it is worth saying why. A Runtime proposing an Effect names an operation. If the Kernel only learned what that operation meant at proposal time — from the Runtime's own description, or from whatever the service happened to advertise today — it would have no fixed contract to validate against, and the consent question ("should this happen?") would have no stable answer. The declaration has to exist before the proposal does, so the Kernel can check the proposal against something it already trusts.

The five parts each answer a different question the Kernel needs before admission:

- **Stable identity** names which operation, across revisions and across any friendly labels a model might see. An operation can be renamed in a catalogue without changing what it does; what it does is pinned to the identity, not the label. Identity and [Activation](core.md#activation) identity vary independently: one Activation can carry several Effects naming different operations, and one operation can appear across many Activations.
- **Input and output schema** bound what content the operation accepts and what it promises to return.
- **Supported schema features** declare which parts of the schema are actually enforced — an unknown property on the argument is refused rather than silently dropped, and a missing required field receives no substituted default. <!-- TODO: rewrite once K2.2 selects the validator and enforced subset -->
- **Exact input meaning** pins what the operation will do with particular argument values, and **result-certainty behaviour** declares what the operation's response actually proves. A service that returns `{"status": "ok"}` may or may not mean "the work finished." The declaration makes that interpretation explicit rather than leaving it to whoever reads the response.

An operation is not a resource, a service, or a [Skill](roles.md#skill-and-package). A resource is something the operation acts on; a service is something that provides the operation; a Skill is a package the Runtime uses internally. These are related things with different owners, and running them together produces questions like "does the Runtime have access to this service?" when the actual question is "may this Execution perform this operation on that resource under its current authority?"

## Effect

An **Effect** is a proposal for one Kernel-mediated action, carried in an [Outcome](core.md#outcome).

The word "proposal" matters as much here as it does for the Outcome that contains it. Nothing about an Effect is real until the Outcome is [accepted](../mechanisms/execution-cycle.md#outcome-acceptance). The Runtime cannot cause external work by proposing an Effect any more than it can advance its own progress by proposing it — both proposals become facts at the same moment, through the same atomic decision, or not at all.

The weekly report illustrates the shape. The Runtime has finished drafting and wants to publish through an external service. It yields an Outcome containing an Effect that names the `publish` operation, the draft's content as the argument, and the intended destination. It also saves enough progress to continue once it learns the result. None of this publishes anything; it tells the Kernel what the Runtime wants to happen next, and the Kernel decides whether to let it.

An Effect names the operation it invokes with a **proposal key** — the Runtime's local identifier for this particular request within this Outcome. The proposal key is not a global name and does not survive outside the Outcome that carries it. If the Outcome is accepted, the Kernel binds the proposal key to an **Effect ID**, an accepted identity that follows the action through its entire lifecycle: admission, attempt, settlement, and any later reconciliation. The distinction exists because the Runtime may propose several Effects in one Outcome, and the Kernel needs to track each independently from the moment it exists.

Three things that look like Effects but are not. An [emission](#emission-result-and-output-obligation) — accepted output the Runtime produces for its audience — is not an Effect. It is accepted alongside Effects in the same Outcome, but it proposes no external action and needs no admission. Creating a [child Execution](operations.md#child-and-ownership) uses its own creation shape rather than an operation, as does sending a [message](operations.md#message-request-and-correlation) or requesting human input. These have their own mechanisms because they have their own rules, and overloading Effect to cover all of them would force those rules through a pipeline designed for external service invocation.

An array of Effects within one Outcome is independent, unordered intent. Proposing three Effects together says only that three requests are wanted. It does not mean they run in that order, it does not mean any of them is conditional on another, and it is not a transaction. If the report Runtime needs to "reserve a slot, charge the account, then publish," it proposes reservation first, observes the result in a later [Activation](core.md#activation), proposes the charge, observes that result, and then proposes publication. Each step depends on evidence from the previous one, and that evidence arrives through the ordinary Activation/Outcome cycle. Application or [Workflow](roles.md#workflow) saga policy owns any [compensation](#withdrawal-and-compensation) when a later step fails; the failure of action two cannot roll back action one, because action one already happened in the world.

## Logical action and intent

When the Kernel [accepts](../mechanisms/execution-cycle.md#outcome-acceptance) an Outcome containing an Effect, it creates an immutable **logical action** record. An **intent** is that record's initial state: an accepted obligation to perform work later, not evidence that anything ran.

This separation — between what has been decided and what has been done — is the organizing principle of the rest of this page. An intent says the Kernel has accepted a request and will pursue it. Admission, below, says the Kernel has authorized an attempt. Settlement says the Kernel has learned what happened. Each is a different fact, recorded at a different moment, and the system's truthfulness depends on never collapsing any two of them.

The record is immutable in a specific sense: the request it describes — which operation, which arguments, which principal — does not change after creation. What changes is what the Kernel knows about that request: whether it has been admitted, whether an attempt was made, what evidence came back. Those facts accumulate alongside the original record rather than replacing it, which is what lets any later reader reconstruct the full history of one action from creation through whatever disposition it eventually reached.

The word "action" in this page always means mediated work — work that travels through the Kernel's admission and settlement path. A Runtime calling its own model API or reading a local file is acting, but not in this sense. That distinction is covered more fully in [exposure and mediation](#exposure-and-mediation) below.

## Admission and physical action attempt

**Admission** is the ordered Kernel decision that authorizes a concrete action attempt under the Execution's [authority](#principal-and-authority), current policy, and required [consent](#exact-consent). It records that authorization under current dispatch ownership. A **physical action attempt** is one invocation of that authorized action through a trusted adapter.

The two terms name different moments. Admission decides that the attempt may happen. The attempt is the moment it actually happens — the adapter sends the request. Between those two moments is where the Kernel writes the admission record: *before* the send, not after, so that a crash in the middle leaves evidence that something may be running in the world rather than no record at all.

That ordering matters most in the recovery case. Suppose the Kernel admits the report's publication, writes the admission record, and then crashes before the adapter sends. On recovery, the Kernel sees a recorded admission with no settlement. That action may have been sent — maybe the crash happened after the adapter wrote to the network but before the Kernel's own write completed — or it may not have. The correct disposition is *unknown*, not failure, because the Kernel has no evidence either way. This is exactly [dangerous inference #13](../rewrite-index.md): absence of a receipt is not proof of failure.

Admission's dispatch ownership is fenced independently of the Runtime's [writer epoch](identity.md#writer-epoch). The Runtime attempt that proposed the action and the action dispatch that performs it are separate concerns with separate fencing. The writer epoch protects which attempt may commit the next Outcome; dispatch ownership protects which admission sequence is current. They can advance at different times and for different reasons, and conflating them would let a stale Runtime attempt that cannot commit progress still trigger action dispatches, or prevent a valid dispatch from proceeding because the Runtime was taken over. <!-- TODO: if a dispatcher is ever defined as its own concept, link "action dispatch" to it -->

An idempotency key, when provided, can bind proposals across Activations — but only under a declared [principal](#principal-and-authority)/operation/resource scope, with immutable content and an explicit expiry contract. This prevents a retried Outcome acceptance from creating a second action for the same logical request. Equal payloads alone do not deduplicate: two intentional purchases can have identical arguments and both be wanted. The deduplication contract has to be explicitly declared, not inferred from content similarity.

Retrying an admitted action is a separate question, and the answer is almost always "don't." Retrying means possibly doing an external thing twice, and no amount of Kernel bookkeeping can undo the second one. Safe retry requires either provider-enforced idempotency valid for the relevant scope and time window, or reliable proof that the first attempt never executed. A key in the Kernel's own database is not provider deduplication: it can stop this Kernel from sending twice, but it cannot stop a provider from acting twice on two requests that both arrived. Changed arguments form a new action. [Compensation](#withdrawal-and-compensation) also forms a new action. Physical retries that are safe retain the logical identity and recheck authority and consent.

## Settlement and reconciliation

Admission is the last point at which the Kernel controls anything. Once the adapter sends a request, the Kernel is a recorder: something happened, or may have happened, and the job is to write down what can actually be established about it — including that nothing can.

**Settlement** is the Kernel's record of what is known about an attempt that already happened. It commits evidence, action state, the result [Event](core.md#event) and applicable [readiness](core.md#readiness) together. **Reconciliation** is the process by which an unknown or partially known disposition is later refined through authorized inquiry — querying, not re-executing.

Settlement is where the Kernel's honesty about what it actually knows is tested most directly, and where the most instructive failures happen. Four different dimensions of an action's state must be tracked independently, because collapsing any two of them into one field loses a real distinction the application needs:

- **Request disposition** — what has been decided about the request. Proposed, accepted, waiting for consent, eligible, denied, refused, declined, expired, withdrawn, or no further attempts. This is the lifecycle of the request itself, not the lifecycle of any attempt.
- **Attempt evidence** (certainty) — what is known about the physical attempt. No attempt was admitted; an attempt was admitted and may have run; observed external success; definite external failure; or unknown. "Unknown" is a disposition, not an error state and not a blank field waiting to be filled in. It means the Kernel sent something into the world and never got a trustworthy answer about what happened.
- **Result validity** — whether what came back is usable. A validated value; an invalid or missing value; partial evidence. An adapter can report that the publication service responded with a success code but returned a malformed body. That is "externally succeeded, result invalid" — two facts that a single status field cannot represent without losing one.
- **Responsibility** — who must answer for this action. Still required by the Execution; transferred to a named durable owner; deliberately abandoned under policy. An operator saying "stop trying" changes the responsibility dimension: it is a decision about what this Execution will do next, not a discovery about what the service did.

These are conceptual dimensions, not a mandated enumeration or a cross-product to implement literally. What matters is that the record can represent each independently — "the service confirmed it ran" and "the value it returned is unusable" can coexist; stopping retries changes disposition, not certainty; and acknowledging an Event about an unknown action does not remove the obligation. [The actions mechanism page](../mechanisms/actions.md#settlement-and-refinement) gives worked cases along each axis.

An unknown disposition may later refine to observed success or definite failure through authorized reconciliation. Reconciliation queries an external source — it does not re-execute the action. When better evidence arrives, the Kernel appends a new immutable evidence revision and an action-observation Event; it does not overwrite an evidence record the Runtime has already acknowledged. The Runtime already acted on what it was told, so rewriting that record would produce a history in which the Runtime's decision looks unexplainable. A malformed result can coexist with proven external success when the adapter distinguishes them; otherwise the Kernel keeps uncertainty rather than guessing.

Contradictory trusted reports are retained and flagged for reconciliation rather than resolved by last-write-wins. Two trusted sources disagreeing is a real fact about the world that someone needs to resolve; picking the later one hides it and produces a record that looks certain but is not. Provider sequence numbers do not make an untrusted report authoritative.

## Principal and authority

The concepts above describe what happens to an action. These describe who is allowed to cause one.

A **principal** is an authenticated application identity on whose behalf work is done. An Execution is not a principal. An Execution *holds* an authority binding — the upper bound on what it may do through mediated paths — but it is not itself the identity on whose behalf it acts. That identity is a person, a service account, a tenant: something the application authenticates, not something the Kernel creates.

**Authority** is the permission ceiling bound to an Execution at [creation](../mechanisms/creation.md#one-atomic-creation). It answers: at most, what may this Execution do? Current application **policy** can narrow that ceiling but never widen it.

The distinction between principal and authority is not just organizational tidiness. It is what makes delegation checkable rather than trusting. When the report Execution needs to spawn a child to fetch data from a restricted source, the child's authority is the *intersection* of what was requested, the parent's delegable bound, and current policy. A parent that may email one address cannot give a child the power to email any address: the child gets that one address, or nothing. That intersection is computed from declared bounds, not from a guess about what the parent "probably meant."

A **grant** is the representation of delegated authority. Grants carry the holder, the delegator, the operation and resource constraints, validity and expiry, delegability, and policy provenance. Trusted records can suffice within one trust domain; signatures authenticate origin but do not prove current permission — a signed token can be valid long after the permission it represents has been revoked.

**Delegation** preserves the dependency chain through grandchildren, so that revoking the original grant affects every downstream admission that depends on it. An explicitly surviving grant — one declared to outlive the parent's termination — is the exception, and its lifetime must be declared rather than assumed.

The Kernel records the authority binding at creation and checks each admission against it. This gives the authority model a shape worth stating explicitly: the ceiling is fixed, the policy is checked fresh at each admission, and anything between those two that narrows or delegates is constructed from explicit, inspectable records rather than from inferred relationships or ambient context. Ancestry is a responsibility fact — who created whom — not a permission fact.

## Exact consent

Most mediated actions are decided by policy alone. Some are consequential enough that a person must decide *this one* — and that decision has to bind to the action that will actually run, not to the plan that produced it.

**Exact consent** is one human's binding approval of one specific, unchangeable action: the operation identity and [revision](identity.md#revision), the fully validated [canonical](values.md#canonical-form) arguments, the destination, the account, the resource revision or immutable content digest, the eligible authenticated approver, the decision identity, the validity window, and the required approval policy.

The specificity is the point. The approval is evidence that a person agreed to one particular thing. If any of those fields changes after approval — the arguments, the account, the resource version — it is no longer the thing they agreed to, and the approval no longer applies. A new action and a new consent decision are needed, however small the change looks. Hidden defaults, coercions, and argument-mutating hooks must not run after approval, because any of them could silently turn the approved request into a different one.

The presentation is the application's responsibility: show the person the values that matter, drawn from the exact bound request. A publication approval should show the recipient and the immutable draft, not just the agent's reassuring summary. Large content needs an accessible preview plus an immutable version or digest. A hash alone does not prove the person saw the content. But whatever form the presentation takes, it is drawn from the bound request — the request whose identity the approval will carry — not from a planning artifact that might diverge before dispatch.

Approval state is separate from action disposition. An approved action can later be denied by policy, [withdrawn](#withdrawal-and-compensation), or expired. Approval does not mean the action will happen — it means the human question has been answered. Refusal closes the same dependency. Consent normally covers one logical action, including safe physical retries while that consent is still valid, not all future actions that look the same.

Ordinary feedback is not consent. A user typing "go ahead" in the chat is input the Runtime may not read for another second, and it carries no binding to a specific action. Standing intent — "always approve publications to this recipient" — is policy, not consent. The difference is that consent is bound to an inspectable, immutable request, and nothing else qualifies.

## Exposure and mediation

Two fundamentally different things can limit what a Runtime does, and the entire authority model above applies to only one of them.

**Exposure** is filtered visibility: selecting which operations, resources, or data a Runtime can see. It limits what the Runtime knows about, not what it can do. A Runtime that cannot see an operation's description in its catalogue cannot propose an Effect for it, which in practice limits its action — but the limit is informational, not enforced. If the Runtime learned the operation's identity by other means, nothing about exposure alone would stop the proposal. Exposure is an authorization decision about what to show, not a physical boundary.

**Mediation** is the path going through Kernel admission and settlement. A mediated action travels the full pipeline this page describes: Effect, acceptance, admission, physical attempt, settlement, and evidence. That pipeline is where authority, consent, and policy are enforced, and where truthful records are kept. A mediated path is the only path the Kernel can make promises about, which is why the authority model in this page is scoped to "mediated paths" and never claims more.

A Runtime operating in [Trusted Execution](operations.md#trusted-execution) mode has direct access to host filesystem, network, and process capabilities. It can call a service without proposing an Effect, read a file without going through a state operation, or start a subprocess without Kernel knowledge. No Kernel decision prevents this. The Kernel's authority enforcement covers the mediated path — the path the Runtime voluntarily uses when it yields an Effect — and says nothing about what the Runtime does through ambient access.

That is not a gap to be closed by better Kernel design. It is a statement about what mediation is for and what it cannot do. Preventing ambient action requires one of two different things, neither of which is Kernel admission:

- **Physical isolation** — placing the Runtime in a container, sandbox, or restricted execution environment where the ambient capabilities do not exist. This is a [deployment](../deployment.md) concern, not a Kernel concern, and it works whether or not the Kernel is involved.
- **Complete mediation** — routing all external access through the Kernel by removing ambient paths entirely. This makes every action mediated and brings it under the authority model, but it requires proving that no unmediated path exists — which means inspecting nested tools, fallbacks, subprocesses, and shared credentials.

Telemetry that merely observes an unmediated action neither mediates it nor prevents it. Logging that a Runtime called an API is evidence of what happened, not a mechanism for stopping it. The two trust modes — Trusted Execution and [Isolated Execution](operations.md#isolated-execution) — reflect this: Trusted acknowledges that ambient access exists and promises only on mediated paths; Isolated claims physical containment and must prove it.

## Withdrawal and compensation

Two different things can be true of a request nobody wants any more: it has not run and can still be stopped, or it may have run and can only be accounted for. These are not the same situation, and they need different words.

**Withdrawal** is the act of preventing future admission of a named pending request. If admission has not yet happened, withdrawal atomically prevents it and records a refusal. If admission already won the race, withdrawal can request cancellation of the attempt only where the adapter and provider support it — and even then, the action must be treated as possibly having executed. Expiry before admission closes the request cleanly. Expiry after the adapter has sent does not prove non-execution.

Two things that are not withdrawal:

A correction message is not withdrawal. A user typing "wait, not that recipient" is ordinary input that arrives through the [mailbox](core.md#mailbox), that the Runtime may not read for another second, and that carries no binding to any specific pending action. By the time the Runtime reads it, the send may already be admitted. If the application needs to promise retraction, it must withdraw the named pending action or invalidate its consent binding before admission under the [ordering rules](../mechanisms/authority.md#order-revocation-against-admission). After admission, the honest answer is "may have acted," and the application uses reconciliation or compensation. This is [dangerous inference #12](../rewrite-index.md): ordinary input cannot withdraw a mediated action.

A Runtime choosing to stop retrying is not withdrawal. It is a change to the responsibility dimension of the action's settlement — a decision about what this Execution will do next, not a claim about what the service did. The action's certainty is unchanged: if it was unknown before the decision, it is still unknown after.

**Compensation** is a new, separately authorized action whose purpose is to counterbalance an earlier one. It is not a rollback of external history — no Kernel mechanism can undo what a service already did — and it is not a special undo path that bypasses normal admission. A compensation action travels the same pipeline as any other: Effect, acceptance, admission, attempt, settlement. It has its own identity, its own authority check, and its own uncertainty about whether it worked. The Kernel's records connect it to the action it compensates, so the relationship is explicit and inspectable rather than implicit.

Every accepted action retains responsibility until a known disposition is accounted for or ownership changes explicitly. Late authenticated evidence that arrives after [failure or cancellation](../mechanisms/lifecycle.md#cancellation-order) updates the original ledger and the responsible owner without reopening the Execution or replacing its terminal result. Without a reliable query, the ledger retains the result as unknown and escalates to the application. Elapsed time, model prose, and weakly consistent absence cannot establish success or failure.

## Emission, result and output obligation

Everything above describes work the Runtime asks the system to do on its behalf. This section describes what the Runtime produces for its audience, which follows different rules because it is not an action — it proposes no external work and needs no admission.

An **emission** is an accepted output record produced by the Runtime in an Outcome. A **result** is the terminal output of a completed Execution. Both are committed through [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) with stable identity, alongside everything else in that Outcome.

An **output obligation** is the Kernel's commitment to make accepted output available for authorized, retention-bounded observation and replay. The obligation is discharged by having the output available — not by pushing it anywhere, not by notifying anyone, and not by ensuring a subscriber reads it. A publisher queue is not mandatory. The Kernel stores accepted output, answers authorized reads, and keeps it for the declared retention period. Everything about connections, UI, transport, and consumer cursor storage belongs to the application output layer, which [the output mechanism page](../mechanisms/output.md) covers.

The distinction between an emission and an Effect is easy to blur and worth making sharp. An emission says "I produced this." An Effect says "I want this done." One records an observation; the other proposes a mediated action. An emission is accepted alongside Effects in the same Outcome, but it needs no admission, no authority check, and no settlement — it is output, not a request. Proposing an emission that the Kernel should treat as an action — "publish this to the user's feed" — conflates producing output with requesting external work. Publishing to a feed is an action with a destination, an authorization question, and an uncertainty about whether it worked; it belongs in an Effect. An emission is what the Kernel itself holds, not what gets sent elsewhere.

External delivery — getting accepted output to a person or another service — is separately authorized adapter work with the same uncertainty as any other mediated action. A channel adapter owns that sending, and its [admission](#admission-and-physical-action-attempt) authorizes the destination and account. Prepared batching and rendering use immutable payload identity; retry cannot re-render into a changed message or choose a new recipient. Delivery can remain pending or unknown after the Execution reaches `COMPLETED`. If business [completion](../mechanisms/lifecycle.md#completion-is-an-accounting-check) requires a delivery receipt, the Runtime must request that [Effect](#effect), observe the result, and then complete. Timeout cannot prove non-delivery; unknown delivery is resolved through the [action reconciliation rules](../mechanisms/actions.md), not by assuming success or failure.

Provisional output — tokens, progress indicators, streaming text — can be shown to the user if clearly labelled as unaccepted. The label is the whole point: a token stream and an accepted emission look identical in a terminal, but only one of them survives the attempt being replaced. Provisional output from a failed or replaced attempt may be retracted or marked. It cannot certify consent, action success, or terminal result.
