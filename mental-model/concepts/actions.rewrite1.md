# Actions, authority and observations

These are canonical definitions. Two mechanism pages compose them: [authority](../mechanisms/authority.md) owns the order in which permission is decided, and [actions](../mechanisms/actions.md) owns what happens to a request once it has permission.

Everything here exists to keep apart three things that are easy to hear as one: a **request** for something to happen, **permission** to attempt it, and **evidence** of what actually happened. Inside an Execution the [Kernel](core.md#kernel) can afford to be strict, because it decides what is accepted and nothing else counts. Outside, it cannot. Once a request has left for a payment service or a publisher, no later Kernel decision can recall it, and no missing reply proves the service did nothing.

That asymmetry is what shapes the vocabulary below. A system that names request, permission and evidence separately can report "the request exists, but a person still has to approve it" and "the service may have published; we cannot tell." A system that folds them into one status field cannot say either sentence, and will report its best guess in the same voice it uses for a fact. Most of the definitions that follow are the result of refusing one of those collapses.

## A first example

Follow one publication through the whole page before reading any definition closely.

The Execution is preparing a weekly report, and the Runtime now has a draft it wants published through a service the application controls.

1. The Runtime cannot publish anything itself, so it proposes an **Effect** in its [Outcome](core.md#outcome), naming the **operation** `publish_report` and supplying `{ reportRef }`.
2. The Kernel accepts that Outcome. The proposal becomes a **logical action** carrying an **intent**: an accepted obligation to publish later. Nothing has been published.
3. Before anything runs, **admission** checks that exact request against the Execution's **authority**, against current **policy**, and — because publishing is consequential enough to need a person — against one editor's **exact consent**.
4. A **physical action attempt** goes out through a trusted adapter.
5. Whatever comes back, **settlement** records what is now known about that attempt, which may be less than the Runtime hoped.
6. The draft the Runtime produced along the way was never an action at all. It is an **Emission**: output the Kernel records and makes readable, not work the Kernel performs.

The [worked version in the overview](../README.md#example-a-report-that-needs-publication) shows the same story as a protocol trace, with the result arriving later as an [Event](core.md#event).

The definitions follow that order, in four groups. **What is asked for, and what it becomes**: operation, Effect, logical action and intent. **Whether it may run, and what running leaves behind**: admission and physical action attempt, then settlement and reconciliation. **What "permitted" was measured against**: principal and authority, then exact consent. **Three qualifications**: exposure and mediation, which name what resembles governance without being it; withdrawal and compensation, which act on a request that already exists; and Emission, result and output obligation, which name the thing on this page that is not an action.

The third group deliberately comes after the decision it governs. Introducing a permission ceiling before the reader knows there is a request to permit gives them a rule with nothing to attach it to. Until those sections arrive, read **authority** as "the upper bound on what this Execution may ask the Kernel to do", **policy** as "whether this particular request is allowed right now", and **exact consent** as "one person's yes to one specific action".

## Operation

An **operation** is a named, versioned contract for something that can be invoked through the Kernel. It is declared before any request can name it.

A Runtime cannot ask the Kernel to do something unnamed. Pre-declaration is what gives the rest of the lifecycle something stable to bind to: permission is checked against an operation, a human approval pins one, and later evidence is interpreted through one. Without it, admission would be checking a string a model composed, approval would pin nothing, and a reply arriving an hour later would have no contract to be valid or invalid against.

The contract has five parts.

1. **Identity.** The stable name across every revision, so `publish_report` stays `publish_report` when its schema moves from revision 2 to revision 3. Admission, approval and evidence all point at this name plus a pinned [revision](identity.md#revision).
2. **Input and output schema.** The shape of arguments and results: `publish_report` takes `{ reportRef }` and returns `{ publishedAt }`.
3. **Supported schema features.** Which parts of that shape are actually enforced: whether an unknown property on the argument is refused rather than silently dropped, and whether a missing field gets a substituted default. <!-- TODO: rewrite once K2.2 selects the validator and enforced subset -->
4. **Exact input meaning.** What a valid-looking argument truly asks for: `reportRef` must name the exact reviewed revision, not any string of the right shape.
5. **Result-certainty behavior.** What an attempt can ever prove afterwards: whether "definitely did not publish" is a reachable conclusion at all, or whether every failed attempt can only ever be recorded as unknown.

The middle two parts carry more weight than they look like they do, and both are easy to read past. Part 3 matters because a schema check confirms shape and nothing else: two schemas can declare the same fields and still disagree about whether `{ reportRef: "r-9", draft: true }` is valid, so one side accepts what the other refuses ([value and schema fidelity](../mechanisms/external-protocols.md#value-and-schema-fidelity) covers that trap where it bites hardest). Part 4 matters because a human approving a publication needs the meaning behind a valid shape — "publish revision 7, the one the editor read" — and no schema expresses that.

Part 5 decides in advance what settlement can ever record. An operation with no way to query afterwards and no safe retry can never move past "unknown", however the Kernel writes it down. Declaring that up front is more honest than discovering it during an incident.

"Invocable" is what separates an operation from three neighbours it is otherwise easy to confuse with. A [Resource](state.md#resource-binding-and-attachment) is acted on rather than called. A [Service](roles.md#service-and-interaction-template) is a private implementation sitting behind whichever operations it chooses to expose. A [Skill](roles.md#skill-and-package) packages instructions and assets rather than exposing a call at all.

An operation keeps its identity when it is shown under a friendlier label. A model chooses from names it can read, but permission and evidence need names that do not drift, so a [projection](roles.md#projection-and-invocation-binding) may display `publish_report` as "Publish this week's report" while the caller still invoked the same operation. The distinction is load-bearing rather than cosmetic: the label can change between one request and the next, and a reply that arrives after that change must still resolve to the operation the caller actually saw, not to whatever the catalog now offers under that wording.

Operations and [Activations](core.md#activation) vary independently. One Activation can propose many operations, and many Activations across an Execution's life can name the same one.

## Effect

An **Effect** is a proposal for one Kernel-mediated action, carried in an [Outcome](core.md#outcome).

Five kinds of work are requested this way: invoking a service, reading governed data, requesting human input, creating a [child](operations.md#child-and-ownership), and sending a [message](operations.md#message-request-and-correlation). The first two point at a named [operation](#operation), by operation identity and pinned revision, and their arguments are validated against that operation's schema. The last three are proposed through their own shapes and point at no operation, because there is no external contract to pin: the thing being asked is the Kernel itself, and what a child or a message means is specified by [communication](../mechanisms/communication.md#children) rather than by a published vendor schema.

An Effect is the *only* way a Runtime requests mediated work. There is no separate API it can call instead, mid-Activation, to have the Kernel do something on the side. This is not a convenience restriction. It is what makes the request and the progress that depends on it commit together, in the same accepted decision, rather than as two facts that a crash can separate.

Each Effect points to at most one operation, while many Effects over time can point to the same one. The action lifecycle then resolves through both: [admission](#admission-and-physical-action-attempt) checks the pointed operation and its arguments, [exact consent](#exact-consent) binds them together with the logical action ID into one immutable action, and [settlement](#settlement-and-reconciliation) records each attempt's evidence under that logical action, interpreted through the operation's declared certainty behavior.

A **proposal key** is the Runtime's stable local name for one proposal within the Activation — the handle it uses to talk about "the publish I am proposing" before that proposal has any Kernel identity. Acceptance binds that key to an **Effect ID**: the immutable logical request identity within the Execution, such as an Activation paired with its local key. An Effect ID names the request, not any particular send of it; a request attempted three times still has one Effect ID.

The proposal key is what lets a Runtime propose an action and wait for its result in the same breath. A [wait](core.md#wait-subscription-and-generation) in the same Outcome may refer to that Outcome's own proposal key, so "publish this, and do not activate me again until its result arrives" is one accepted decision rather than a race between two.

Effects proposed together are independent requests. Three Effects in one Outcome say that three things are wanted, not that they run in that order or that any of them is conditional on another; [retrying an action](../mechanisms/actions.md#retrying-an-action) owns what follows from that, including why a reserve-then-charge sequence must be proposed across separate Activations.

An [Emission](#emission-result-and-output-obligation) is not an Effect. The difference is direction: output is something the Runtime has already produced, and an Effect is something it wants done.

## Logical action and intent

A **logical action** is the immutable action record created when an Effect is accepted. An **intent** is an accepted obligation to perform or route specified work later.

An intent is not evidence that the work already ran, and the gap between those two facts is the entire reason the record exists. [Accepting the Outcome](../mechanisms/execution-cycle.md#outcome-acceptance) commits the Runtime's progress and its intent in one decision, so a process that dies between acceptance and the first attempt leaves behind a recorded obligation rather than a lost request. Someone — a scheduler, an operator, a reconciliation pass — can find it and finish deciding what to do with it.

Consider what is available without the separation. A system that records only "asked" and "done" has no way to describe the state it is actually in most often: a request that exists, is legitimate, and has not been attempted yet. It must either pretend the request was never made, and lose it, or pretend it succeeded, and lie. Naming the obligation is what lets the honest third answer exist.

The record is immutable because everything downstream binds to it. An approval pins a logical action ID; evidence accumulates under one; a withdrawal names one. If the record could be edited in place, an approval given yesterday would silently come to mean whatever the record says today.

Throughout these pages, **"action" means mediated work** unless it is explicitly qualified as native. A Runtime that shells out to a local command has performed something, but not an action in this sense, and nothing on this page describes it.

## Admission and physical action attempt

An accepted intent is a request that exists. Whether it may run is decided next, and separately.

**Admission** is the ordered decision that authorizes a concrete action attempt under the Execution's [authority](#principal-and-authority), current policy, and required [consent](#exact-consent). A **physical action attempt** is one invocation of that logical action through a trusted adapter.

Splitting the decision from the obligation buys two things. It lets the Kernel hold a request that is legitimate but not yet permitted — waiting on an approval, blocked by a policy that may relax — without either discarding it or running it. And it makes every attempt individually accountable: each physical attempt needs its own admission, so a retry cannot inherit yesterday's permission.

Admission records the intent under current **dispatch ownership**, which decides who is presently entitled to send this action. That fencing is separate from the Runtime's [writer epoch](identity.md#writer-epoch), and the separation is deliberate rather than incidental: the Runtime attempt that *proposed* an action and the action dispatch that *performs* it have different lifetimes. A Runtime attempt can be superseded by an authorized takeover while its already-admitted publication is still in flight, and fencing one does not fence the other. <!-- TODO: if a dispatcher is ever defined as its own concept, link "action dispatch" to it -->

Admission can precede sending, but it cannot prove receipt. It is a decision the Kernel makes on its own side of the boundary, and the request may still be lost on the way out. This is the point at which the Kernel stops controlling anything and starts recording: from here on it observes, and what it can observe is the subject of the next section. [Authority](../mechanisms/authority.md#order-revocation-against-admission) owns the exact ordering of admission against a revocation that arrives at the same moment.

## Settlement and reconciliation

After an attempt, the Kernel needs evidence of what happened. It gets that evidence in one of two ways.

**Settlement** accepts authenticated evidence for a particular action attempt and records its observation for the Runtime. **Reconciliation** queries or inspects existing external work through a trusted path to resolve uncertainty.

Reconciliation is not blind re-execution, and keeping that clear is the whole value of naming it. When the answer to "did the publish run?" goes missing, reconciliation asks the service; it does not publish again to find out. The two are easy to conflate in code, because both begin by contacting the same endpoint, and only one of them is safe.

What settlement records has more than one axis. Four dimensions stay distinct.

| Dimension | Meaning and example |
|---|---|
| Request disposition | What may happen next: waiting for approval, denied, withdrawn, no more attempts |
| Attempt evidence / certainty | What is known externally: no attempt, may have run, observed success, definite failure, unknown |
| Result validity | Whether the returned value satisfies the result contract, even if the action ran |
| Responsibility / obligation | Who still owes settlement or required results: the Execution, a named durable owner such as a child the work was transferred to, or explicit policy abandonment — a cancelled Execution whose still-unknown attempt is recorded but no longer owed |

These are conceptual dimensions, not a mandated enum cross-product. An implementation is free to represent them however its storage prefers; what it may not do is lose one by folding it into another.

Each pair is worth collapsing on purpose once, to see what disappears. Suppose the publication service confirms it published, and returns `{ publishedAt: "yesterday" }`, which fails the result contract. Certainty says *observed success*; validity says *unusable*. One status field must choose, and either choice misleads: "success" invites a Runtime to complete on a value it cannot use, and "failed" invites it to publish again, duplicating a report that is already live.

The other collapses fail the same way. Deciding to stop retrying changes the request's disposition and tells you nothing new about the world — the attempt that already went out is exactly as unknown as it was. Acknowledging an unknown observation records that the Runtime has seen it, not that the obligation is discharged, which is why acknowledgment alone cannot license [completion](../mechanisms/lifecycle.md#completion-is-an-accounting-check). And an invalid result can coexist with proven external success, which is only expressible if validity and certainty are two fields rather than one.

[Settlement and refinement](../mechanisms/actions.md#settlement-and-refinement) works each axis through in detail, including how an unknown attempt is later refined by authorized reconciliation without editing evidence a Runtime has already consumed.

## Principal and authority

Admission asked whether a request is permitted. This section and the next define what "permitted" is measured against: who is asking, what bound applies to them, and — next section — when a person has to decide personally.

A **principal** is an authenticated application identity: a user, a service, or an acting-on-behalf-of identity, with tenant or application scope where applicable. **Authority** is the upper bound of Kernel-mediated operations and resources available to an Execution. **Policy** decides whether a concrete request is permitted now, and can narrow that bound. A **grant** records authority and, when applicable, delegation constraints.

**An Execution is not a principal.** This is the sharpest rule in the section and the easiest to lose. Authority is bound *to* an Execution by whoever created it; it is never generated *by* the Execution. Work that could authorize itself by existing would make creation the only real permission check in the system, and creation is exactly the step a compromised or confused Runtime is most able to reach.

Authority and policy are two mechanisms rather than one because they answer questions on different timescales. Authority is a ceiling fixed when the Execution is created and carried with it. Policy is a decision about this request, now, under whatever rules are currently loaded. A single mechanism doing both jobs would make every temporary narrowing — an account frozen for an hour, a rate limit, a maintenance window — require re-granting the Execution's whole authority, and would leave no honest way to say "allowed in principle, refused right now."

**Delegation** gives a child only what survives three simultaneous limits: what was requested for it, what the parent was allowed to pass on, and what current policy permits now. A parent that may email one address cannot give a child the power to email any address, however the request is phrased: the child gets that one address, or nothing. The intersection is taken at creation and the delegating dependency is retained afterwards, so a later revocation reaches descendants rather than stopping at the generation that was checked.

**Ancestry is responsibility, not permission.** Being created by someone never by itself grants what the creator has. A parent remains accountable for a child's required work, and that accountability is a different edge in the graph from what the child may do — [child and ownership](operations.md#child-and-ownership) owns the first, and [current policy](../mechanisms/authority.md#check-the-concrete-request) owns the second.

## Exact consent

**Exact consent** is one human's yes to one unchangeable action.

It binds four things together: the specific action, meaning which Execution and which logical action; the exact request, meaning validated arguments under a pinned operation version; the real-world targets, meaning the account, resource or content the action will actually touch; and the approval itself, meaning who was eligible to approve and how long the yes remains valid.

All four are there to close the same gap: the distance between what a person was shown and what the adapter eventually sends. An approval that binds only "a publication was approved" is satisfied by publishing a different draft to a different destination. Each of the four closes one way that substitution happens in practice — a different action reusing the approval, a mutated argument, a redirected target, or an old approval replayed by someone who should no longer be able to use it.

The word "unchangeable" is doing real work. Consent is evidence that a person agreed to one specific thing; a request that has changed since is no longer that thing, however small the change looks and however plausible the reason. This is why the binding happens after validation and normalization rather than before, and why argument-mutating middleware has to finish its work before a person is asked anything.

Ordinary feedback and standing intent are not this decision. Approving "Plan A" need not approve its eventual recipient and payload, because the plan was approved when neither had been chosen yet. A retained note saying "the editor usually approves publication" can legitimately inform what the Runtime proposes; it cannot approve the publication in front of it. The same holds for a model reporting that a user agreed — that is [content, and content is not authority](../mechanisms/authority.md#content-is-not-authority).

Not every action needs a person. Most are settled by policy alone, and requiring human consent everywhere trains approvers to click through. Which operations demand it is a policy question; the [consent mechanism](../mechanisms/authority.md#exact-action-consent) owns the full binding and mutation rules, including what may still change after approval and what invalidates it.

## Exposure and mediation

Three questions about a capability sound alike and are independent. Can this Execution see that the capability exists? Does the Kernel govern the path that uses it? Does the work use powers the host handed the Runtime directly? These three terms answer them one at a time.

**Exposure** means filtered visibility of authorized operation metadata or callable choices. It is not a grant and not a mandatory durable object: showing a model that `publish_report` exists authorizes no particular publication. Visibility has to be authorized in its own right — a catalog that leaks the existence of operations belonging to another tenant has disclosed something real — but being visible and being permitted remain separate facts, and a stale catalog cannot authorize anything.

**Mediation** means the specific action path goes through Kernel admission and settlement. The subject of that sentence is the *path*, not the Execution and not the Runtime. One Execution can perfectly well have a mediated publication route and an unmediated native HTTP client in the same process, and "is this Execution mediated?" is therefore not a well-formed question. The well-formed one is "is this path mediated?", which a [Driver's support record](../mechanisms/integration.md#mediated-tool-sequence) has to answer per path rather than in aggregate.

**Ambient**, or **native**, **action** uses powers provided directly by the Runtime's host or native system. These are not failures of the design; [Trusted Execution](operations.md#trusted-execution) permits them intentionally, and much useful native behavior depends on them.

What they are not is governed by the Kernel. Telemetry that observes an ambient action does not mediate it and does not prevent it: a log entry is written after the fact, by which point the file is deleted or the request is sent. Only [mediation](#exposure-and-mediation) or [physical isolation](operations.md#isolated-execution) can actually stop something, and those are separate guarantees with separate owners — isolation decides what the Runtime can physically reach, while mediation decides what the Kernel is asked to authorize. [Containment claims](../mechanisms/resources.md#containment-claims) states what evidence a claim of either kind requires.

## Withdrawal and compensation

Two controls apply once a request already exists, and they act on different things: one on the request's future, the other on the world it has already changed.

**Withdrawal** is an explicit control preventing future admission of a named request. **Compensation** is a new authorized action intended to counter an earlier action.

Withdrawal is a control the application applies to a named intent, and this is what separates it from a correction. Suppose the editor sends "actually, don't publish." That message is ordinary input: it lands in the [mailbox](core.md#mailbox), and the Runtime will read it whenever it is next activated, which may be after the publication has already been admitted and sent. The message expresses a wish; withdrawal acts on the record. An application that needs "don't publish" to be reliable must withdraw the named intent, not send a sentence and hope the Runtime reads it in time.

Withdrawal also has a hard limit, which is why compensation exists at all. It can only prevent a *future* admission. Once an attempt has left, nothing the Kernel accepts afterwards can reach it, and the honest description of the request becomes "it may have run" rather than "it was stopped."

Compensation is therefore not rollback of external history. Publishing a correction does not unpublish last week's report: the archive now holds two documents, subscribers who read the first may never see the second, and a reader arriving tomorrow sees whichever the publisher shows them. The compensating action is a new action, with its own [admission](#admission-and-physical-action-attempt), its own consent requirements if it has any, and its own uncertainty about whether *it* ran. Treating it as an undo hides all three.

[Withdrawal and remaining responsibility](../mechanisms/actions.md#withdrawal-and-remaining-responsibility) owns what is left over after either control: an accepted action retains responsibility until its disposition is known or its ownership explicitly changes.

## Emission, result and output obligation

Not everything a Runtime produces is a request. The remaining terms name its output, which the Kernel records but does not perform.

An **Emission** is accepted nonterminal output from an Outcome. A **terminal result** is output accepted with completion. **Provisional output** is unaccepted diagnostic or streaming content, such as stdout tokens from a still-running attempt.

Provisional output has its own name because on a screen it is indistinguishable from the real thing. A token stream and an accepted Emission both render as text arriving in order; only one of them survives its attempt being replaced by an authorized takeover. A UI may show provisional output, and usefully should, as long as it is labelled as unaccepted rather than spliced into what looks like an accepted transcript.

An **output obligation** makes accepted Emissions and results available for authorized, retention-bounded observation and replay.

The verb is *available*, not *sent*, and that is the substance of the definition rather than a wording preference. The obligation is discharged by holding the output where an authorized reader can fetch it; no queue has to push it anywhere, and no subscriber has to exist. Delivering output to a person or another service is separate work with a separate owner: it is an ordinary mediated action, with the admission, targets and uncertainty that implies, and an Execution that has completed may still have a delivery pending. An older name for this obligation, **publication intent**, invited exactly the wrong reading — that accepting output somehow published it — and is not used on these pages.

[Output](../mechanisms/output.md) owns the exact rules for what readers can replay, how a reader resumes without gaps or duplicates, how long output is kept, and why reading a child's output does not send anything to its parent.
