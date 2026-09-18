# Actions, authority and observations

These are the canonical definitions of the terms an Execution uses to ask the world for things — and to learn what its asking came to. Like every concept page, each term is defined here and nowhere else.

The vocabulary follows one proposal through its whole life: the [operation](#operation) it invokes, the [Effect](#effect) that carries the proposal, the [logical action and intent](#logical-action-and-intent) created when the proposal is accepted, the [admission](#admission-and-physical-action-attempt) that decides whether an attempt may run, and the [settlement](#settlement-and-reconciliation) that records what is known afterward. Along the way, [authority](#principal-and-authority) and [exact consent](#exact-consent) decide what is permitted, [exposure](#exposure-and-mediation) and [withdrawal](#withdrawal-and-compensation) qualify what visibility means and how a request retreats, and the last section names what an Outcome carries that is not a request at all: the Runtime's own [output](#emission-result-and-output-obligation). The [authority](../mechanisms/authority.md) and [actions](../mechanisms/actions.md) mechanisms compose these terms into ordered behavior; this page owns their meanings.

Three questions run underneath every section, and confusing any two of them is how a system comes to report work it never verified. **What was asked for?** — the request, described but neither permitted nor performed. **May it happen?** — a decision made against current authority, policy and consent. **What is known about it now?** — evidence, which will often honestly answer *unknown*. The running example is the weekly report from [the readme](../README.md#example-a-report-that-needs-publication): the Runtime has drafted the report and wants it published through an application-controlled service. Everything below happens to that one request.

## Operation

An **operation** is a named, versioned, pre-declared contract describing one kind of mediated action. `publish_report` is this page's standing member.

*Pre-declared* is the load-bearing word. Before any Runtime may ask for a publication, the contract already exists, and every later stage of the action's life points back at it rather than at a description produced in the moment. Admission checks the concrete request against permission keyed on this operation. A human's approval pins this operation and its revision. Settlement interprets whatever evidence comes back through this operation's declared behavior. A request about a named, stable thing can be permitted, approved and judged; a request conjured mid-Outcome with no such anchor could be none of the three.

The contract has five parts:

1. **Identity.** A name that stays stable across every revision, so `publish_report` remains `publish_report` while its schema moves from revision 2 to revision 3. Permission, approval and evidence all key on this name plus a pinned revision.
2. **Input/output schema.** The shape of arguments and results — `publish_report` accepts something like `{ reportRef }` and returns something like `{ publishedAt }`.
3. **Supported schema features.** Which parts of that shape are actually enforced: an unexpected argument property is refused rather than silently dropped, and a missing field receives no quietly substituted default. <!-- TODO: rewrite once K2.2 selects the validator and enforced subset -->
4. **Exact input meaning.** What a validly shaped argument genuinely asks for: `reportRef` must name the exact reviewed revision of the report, not any string of the right shape.
5. **Result-certainty behavior.** What an attempt is capable of proving afterward: whether "definitely failed to publish" is a state this service can ever attest, or whether every failed attempt necessarily remains *unknown*.

The middle parts repay a second look, because they are easy to skim past. Schema validation confirms shape only, so anything that depends on what an argument *means* — above all, a human being asked to approve the action — needs part four; a contract without it cannot support an honest approval. Part five quietly sets the ceiling on everything [settlement](#settlement-and-reconciliation) can ever say: an operation with no way to probe the service or re-ask safely can never advance past *unknown*, no matter how carefully the Kernel records.

An operation is invocable, and that is what separates it from its neighbors. A [resource](state.md#resource-binding-and-attachment) is acted on rather than called. A [service](roles.md#service-and-interaction-template) is an implementation kept private behind the operations it chooses to expose. A [Skill](roles.md#skill-and-package) packages instructions; it does not expose a call.

An operation's identity also survives its presentation. A model may meet `publish_report` under a friendlier label through a [projection](roles.md#projection-and-invocation-binding) — "Publish this week's report" — and the label may change between requests, but a late reply naming that label still invokes the operation the caller was shown, not whatever wears the label today. Permission and evidence are recorded against the stable identity precisely because display text is free to drift.

Finally, operations and [Activations](core.md#activation) vary independently. One Activation can propose uses of many operations, and many Activations can name the same operation over time; neither side of that relationship constrains the other.

## Effect

An **Effect** is a proposal for one Kernel-mediated action, carried inside an [Outcome](core.md#outcome).

It inherits the Outcome's standing: a proposal, nothing more. Nothing about the requested action has been permitted, recorded as an obligation, or performed merely because the Runtime wrote the Effect down — all of that waits on [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) and then on admission. An Effect states what the Runtime would like done — publish the report at exactly this reference — with the same provisional status as the progress sitting next to it.

Effects come in two families. The first names an operation. Invoking a service, such as the publication, and reading governed data both point at a pre-declared [operation](#operation) by identity and pinned revision, and the Effect's arguments are validated against that operation's schema. Notice that the read belongs here: governed data is data whose access needs admitting, and "it only reads" is not a permission. Each Effect points to at most one operation, while many Effects across many Activations may point to the same operation over time.

The second family names no operation at all. Requesting human input, creating a [child Execution](operations.md#child-and-ownership) and sending a [message](operations.md#message-request-and-correlation) are proposed through their own shapes, because what they ask for is already fixed by the protocol's own coordination vocabulary rather than by an application-declared contract. [Communication](../mechanisms/communication.md) owns their creation, closure and routing.

Within one Outcome the Runtime labels each proposal with a **proposal key** — its own local name for that proposal. Acceptance binds the key to an **Effect ID**: the proposal's immutable logical identity inside the Execution, formed from the Activation and the local key. The Effect ID is the identity of a *request*, not of a dispatch; no physical send carries it. A [wait](core.md#wait-subscription-and-generation) registered by the same Outcome may name the proposal key as its dependency, which is how "wake me when the publication answers" stays attached to the right question.

Two boundaries close the definition. An [Emission](#emission-result-and-output-obligation) is not an Effect: output is something the Runtime has *produced*, while an Effect is something it wants *done*. And several Effects in one Outcome form a list of independent wishes, not a sequence and not a transaction — proposing the publication alongside two other requests says nothing about order or conditionality. The [action mechanism](../mechanisms/actions.md#retrying-an-action) owns what may and may not be inferred from grouping.

## Logical action and intent

A **logical action** is the immutable action record that [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) creates from an accepted Effect. An **intent** is the accepted obligation to perform or route that specified work later.

The most important clause in this section is the one the intent lacks: it is not evidence that the work ran. Keeping the request-record apart from the performance-evidence is what lets the system survive its own crashes. Outcome acceptance commits the Runtime's new progress and the intent in one decision, so a crash a millisecond later — before any adapter has been invoked — leaves a recorded obligation that recovery can find and account for, rather than a request that existed only in a dying process's memory. The next two sections are, in a sense, the care of that promise: admission decides whether it may be kept, and settlement writes down what keeping it looked like.

One vocabulary rule applies throughout these pages: *action* means mediated work unless explicitly qualified as native. A Runtime's own filesystem write is not an action in this sense — it never became an Effect, an intent or an attempt record, and nothing on this page records it.

## Admission and physical action attempt

An accepted intent is a request that exists. Whether it may run is a separate question, asked later, against facts that hold *now*: the Execution's [authority](#principal-and-authority), the application's current policy, and any consent the operation requires. **Admission** is the ordered decision that authorizes one concrete action attempt under all three.

*Ordered* because admission runs in a crowd. Permission can be revoked and consent withdrawn while a request is mid-flight, so the Kernel records admission against the decisions it races, under current dispatch ownership. [Ordering revocation against admission](../mechanisms/authority.md#order-revocation-against-admission) owns the exact rule; what matters here is that admission is a recorded, ordered event, not a prevailing mood. The attempt record is written before anything is sent, so that a crash in the gap leaves evidence that something may already be running out in the world — a fact [settlement](#settlement-and-reconciliation) will need. [Admission and sending](../mechanisms/actions.md#admission-and-sending) owns the record's contents.

A **physical action attempt** is one invocation of the logical action through a trusted adapter — in the report's case, the actual call to the publication service. Admission can precede sending, and it cannot prove receipt: it establishes that an attempt was authorized and recorded, not that any bytes arrived anywhere.

Admission's fence is also its own. Dispatch ownership is fenced independently of the Runtime's [writer epoch](identity.md#writer-epoch), because the two answer different questions: the epoch decides which Runtime attempt may commit an Outcome, while dispatch ownership decides which action dispatch may proceed. The attempt that *proposed* the publication and the dispatch that *performs* it can change hands independently, and neither fence may borrow the other's answer. <!-- TODO: if a dispatcher is ever defined as its own concept, link "action dispatch" to it -->

## Settlement and reconciliation

Admission is the last point at which the Kernel can prevent anything. From the first send onward it is a recorder, and this section names its only two instruments.

**Settlement** accepts authenticated evidence about one particular action attempt and records what that evidence establishes for the Runtime. Authentication belongs to the path, not to the payload: evidence is checked against the adapter, the provider, the account and the original attempt it claims to describe, and a body that merely *says* the publication succeeded establishes nothing by itself. [Settlement and refinement](../mechanisms/actions.md#settlement-and-refinement) owns those checks.

**Reconciliation** resolves uncertainty by querying or inspecting the external work through a trusted path. It is emphatically not blind re-execution. When the answer to "did the publish run?" has gone missing, reconciliation asks the service; publishing again to find out would manufacture the very duplicate publication everyone is trying to rule out.

What settlement records cannot be flattened into one status field, because "how did it go?" is really four independent questions:

| Dimension | The question it answers |
|---|---|
| Request disposition | What may happen next with this request: awaiting approval, denied, withdrawn, no further attempts. |
| Attempt evidence / certainty | What is known of the external world: no attempt made; an attempt may have run; observed success; definite failure; unknown. |
| Result validity | Whether the value that came back satisfies the operation's result contract — a question that survives even when the action provably ran. |
| Responsibility / obligation | Who still owes settlement or required results: this Execution, a named durable owner the work was transferred to, or explicit abandonment under policy. |

These are conceptual dimensions, not a mandated enumeration of states, and any two of them move independently. Flattening them loses real facts: "the service confirmed the publication ran" and "the receipt body it returned fails the contract" must be sayable in the same breath, and a single `status` value cannot do it.

Three consequences are worth memorizing, because each contradicts a tempting shortcut. *Unknown* is an explicit certainty, not an absence: a missing receipt and a reported failure are different facts, and treating absence as failure records a confident answer nobody obtained. Stopping retries changes the request's disposition — no more attempts — while certainty stays exactly where it was. And acknowledging that an observation is unknown lifts no obligation: responsibility remains until something known discharges it or ownership explicitly moves.

## Principal and authority

Admission measured the request against authority. This section defines what that authority is, whose it is, and how it shrinks but never grows through delegation.

A **principal** is an authenticated *application* identity — a user, a service, or an acting-on-behalf-of identity — with tenant or application scope where applicable. The application authenticates principals; the Kernel receives the authenticated facts through trusted ingress. Note who is missing from the cast: an [Execution](core.md#execution) is not a principal. An Execution is a lifetime of work — it holds an authority binding, and it is not anyone. "The Execution asked" is always shorthand for "the Runtime proposed, within this Execution's bound."

**Authority** is the upper bound of the Kernel-mediated operations and resources available to an Execution — a ceiling that nothing inside the Execution can exceed. **Policy** decides whether a concrete request is permitted *now*, and it can only narrow the bound, never widen it. The separation is what makes both useful: authority is the ceiling set for the work, while policy tracks the world — the frozen account, the incident in progress, the business hour — and can tighten tomorrow without anyone renegotiating the ceiling. A **grant** records authority together with its delegation constraints, where delegation is involved.

**Delegation** passes power downward to a [child](operations.md#child-and-ownership), and it passes only what survives three simultaneous limits: what was requested for the child, what the parent's own delegable bound contains, and what current policy permits at this moment. The intersection is computed, not wished into being. A parent that may email exactly one address cannot produce a child empowered to email any address, however the request is phrased — the child gets that one address, or it gets nothing.

One asymmetry closes the section: ancestry is responsibility, not permission. Creating an Execution says who is accountable for its work; it says nothing about what the child may do. Being someone's creator grants, by itself, nothing at all. [Checking the concrete request](../mechanisms/authority.md#check-the-concrete-request) owns the ordered decision procedure.

## Exact consent

Most requests are decided by policy alone. A few are consequential enough that a human being must decide this one, and **exact consent** is that decision: one human's yes to one unchangeable action.

Both words earn their place. *One* action: consent attaches to the specific thing that will run — this publication, of this reviewed draft, to this destination — not to the plan that produced it. An editor who approved "Plan A" has not thereby approved whatever recipient and payload Plan A eventually assembles, and a system that treats plan approval as action approval will someday send something the approver never saw. *Unchangeable*: the approval binds what will actually be sent, and the binding therefore lists exactly that:

- the specific action — which Execution, which [logical action](#logical-action-and-intent);
- the exact request — fully validated arguments under a pinned operation revision;
- the real-world targets — the account, resource or content the action will touch;
- the approval itself — who may approve, and how long the yes lasts.

Change any of these afterward — an argument, the destination account, the draft's revision, the operation's revision — and the request in hand is no longer the one the human approved, however small the edit looks. The [consent mechanism](../mechanisms/authority.md#exact-action-consent) owns the full binding and mutation rules.

What exact consent is *not* is equally load-bearing, because its impostors arrive constantly. Ordinary feedback — "looks good to me" in a comment thread — is input a Runtime may interpret, not a bound approval. Standing intent — "I usually want these published on Fridays" — is policy-shaped information, not a decision about this action. Neither binds an arguments-and-targets pair, and neither survives the question: what exactly did the human say yes to?

## Exposure and mediation

The two terms in this section answer two different questions that are routinely asked as one.

**Exposure** is filtered visibility: an operation's metadata, or a menu of callable choices, shown to a Runtime or model. It answers *what can be named here?* — and nothing more. Showing a model that `publish_report` exists authorizes no publication; the display is information about a permission landscape, not permission itself, and exposure is not even a durable object the Kernel must keep — it is a filtering decision made when the choices are assembled. [Projection and invocation binding](roles.md#projection-and-invocation-binding) keep the displayed names honest on the Runtime side.

**Mediation** is a property of a path, answering *did this request pass through the Kernel's checkpoint?* On a mediated path the action travels through [admission](#admission-and-physical-action-attempt) and [settlement](#settlement-and-reconciliation), and authority, policy and consent all get their say.

The contrast that makes both definitions necessary is **ambient (native) action**: work that uses powers the Runtime's host or native system supplies directly — an open file, an outbound call, a subprocess — without passing through admission at all. An Execution can be exposed to exactly the right vocabulary, denied by policy, and still perform the ambient equivalent, because no Kernel decision stands in a native call's way. Two different guarantees cover that gap, and neither substitutes for the other: mediation governs the requests that travel the Kernel's path, while [physical isolation](operations.md#trusted-execution) contains the powers the host provides. Telemetry sits outside both — observing an ambient action after the fact neither mediates nor prevents it, and a clean log is not evidence of a prevented action.

## Withdrawal and compensation

Two controls apply after a request already exists. They act on different objects — one on the request's future, one on the world the request may already have changed — and confusing them is how a system comes to believe it stopped something it merely discussed.

**Withdrawal** is an explicit control that prevents future admission of a *named* request: named by identity, aimed at the intent record, not described in prose. And it works strictly forward — it stops an admission that has not yet happened. What withdrawal is *not* is a message. An editor typing "actually, don't publish it" has produced ordinary input: the Runtime may not read it for another second, and admission may already have won the race. Input asks the work to reconsider; withdrawal instructs the admission path to refuse. [Ordering revocation against admission](../mechanisms/authority.md#order-revocation-against-admission) decides which accepted decision came first.

**Compensation** is a new, separately authorized action taken to counter an earlier action's effects. It is not rollback, because external history does not unhappen: a retraction notice is a second publication, not the un-publication of the first. Which compensation a regretted or failed action calls for is application policy, not a Kernel rule.

## Emission, result and output obligation

Not everything an Outcome carries is a request. These last terms name what the Runtime *produces* — output — which the Kernel records but does not perform.

An **Emission** is accepted, nonterminal output from an Outcome: a draft section, a progress summary — anything the Runtime offers as visible product short of the end. A **terminal result** is the output accepted with completion: the finished report. **Provisional output** is unaccepted diagnostic or streaming content, such as tokens from a still-running attempt. It may be shown under a clear unaccepted label, but it certifies nothing — not consent, not action success, and least of all the result.

What the Kernel owes for accepted output is the **output obligation**: accepted Emissions and the terminal result remain available for authorized, retention-bounded observation and replay. Read that obligation narrowly. It promises that output *can be read*, by whoever is allowed to read it, for as long as the retention contract promises — it does not promise that output was *sent* anywhere. Pushing the report to a subscriber or a channel is external delivery, ordinary adapter work with its own admission and its own uncertainty; [external delivery](../mechanisms/output.md#external-delivery) owns that, and [output](../mechanisms/output.md) owns the availability and replay rules. The obligation's older name, *publication intent*, survives only in [the former-names table](../reference.md#former-names-and-common-search-terms): the old name suggested automatic public disclosure, and nothing here promises that.

If this page has one discipline, it is the refusal to let the three opening questions merge: a request is not a permission, a permission is not a performance, and a performance is not a proof. Every term above exists to keep one of those seams visible.