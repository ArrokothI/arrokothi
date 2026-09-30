# Core coordination vocabulary

These are the canonical definitions of the terms every other page assumes. Each one is defined here and nowhere else.

## A first example

An application wants a weekly report prepared, and hands that request to ArrokothI. ArrokothI records it as one piece of work with an identity of its own: an **Execution**. From now on the application can address that work — ask about it, send it something, stop it — without knowing anything about who is doing it or how far along they are.

Something has to actually write the report, and that something is a **Runtime**: ordinary code, an agent framework, a workflow engine, whatever the application chose. The Runtime is not the Kernel. It keeps its own model loop, its own graph, its own memory, and the Kernel never looks inside any of them.

So there are two parties who are deliberately ignorant of each other, and the gap between them is this page's whole subject. On one side, the **Kernel** knows what has been accepted about the report — who asked for it, how far it has got, what it is waiting for — and knows nothing about how a report gets written. On the other, the Runtime knows how to write a report and needs to be told when to continue and with what.

The Kernel bridges that gap by asking, one question at a time. Its question is an **Activation**: advance this Execution, starting from exactly this saved state, taking exactly these observations into account. The Kernel does not call the Runtime's native API itself — it hands the Activation to a **Driver**, a small adapter that knows this particular Runtime's interface and translates in both directions.

The Runtime's answer is an **Outcome**: here is my new saved state, here is anything I produced, and here is what should happen next. Suppose our Runtime drafts the report and then cannot go further until the editor approves it. It says exactly that: progress saved, and now waiting for the editor. None of this is true yet. An Outcome is a proposal, and it becomes accepted state only when the Kernel accepts it — in one decision, all of it or none of it.

The Kernel accepts, and the Execution settles into waiting. Later the editor replies. That reply arrives through a trusted path, the Kernel accepts it, and it becomes an **Event**: an observation addressed to this Execution. An Event never goes straight to the Runtime. It sits in the Execution's **mailbox** until the Kernel pins it into a **batch** and carries it to the Runtime in a new Activation. The Runtime picks up from its saved state, reads the editor's answer, and finishes the report.

That is the entire loop, and the fourteen terms below name its pieces precisely. They fall into four groups, in the order the story used them:

- **Who is involved** — [Kernel](#kernel), [Execution](#execution), [Execution Runtime](#execution-runtime) and [Execution Driver](#execution-driver), plus the [Definition](#definition) that pins *which program* an Execution runs and the [Runtime contract](#runtime-contract) that separately pins *how the exchange is read*.
- **One exchange** — [Activation](#activation) asks; [Outcome](#outcome) answers.
- **What arrives** — an [Event](#event), the [mailbox](#mailbox) that holds it, and the [batch](#batch-reservation-and-acknowledgment) that pins some of it into an Activation.
- **Waiting for what arrives** — a [wait](#wait-subscription-and-generation), the [readiness](#readiness) that survives it, and the [timeout Event](#timeout-event) that ends it when nothing else does.

The same report appears throughout as the running example. [The worked trace](../mechanisms/execution-cycle.md#worked-trace) adds the identities, lost replies and retries that this page's version leaves out.

## Who is involved

Six terms name the parties and what an Execution is bound to: the Kernel that accepts, the Execution it accepts things about, the Runtime that does the work, the Driver between them, and the Definition and Runtime contract, whose revisions an Execution pins when it is created.

### Kernel

The **Kernel** is the provider-neutral coordinator that accepts and records Execution state changes, addressed observations and mediated action requests. It owns lifecycle, authority enforcement on mediated paths, scheduling semantics, communication and recovery of accepted state. It does not own the work's algorithm.

The verbs in that definition are narrow on purpose. The Kernel accepts and records. The Kernel does not compute, and the Kernel does not supervise. What the Kernel decides is what counts as having happened. When the Runtime reports "I made progress and I need the editor," that report is only a claim. Once the Kernel accepts the claim, the claim is accepted state, and every later question — what to dispatch next, what work is still owed, what to reconstruct after a crash — is answered from the accepted record rather than from anyone's memory or from a live connection.

The Kernel's job stays this small for a practical reason. The Kernel and the Runtime have to agree on one thing only: what has been accepted so far. How the report actually gets written never has to be agreed, because the Kernel never asks.

A larger job would not pay for itself. Suppose the Kernel also understood model loops, graph nodes, context compaction and provider checkpoints. The Kernel would then have to be correct about behavior inside code the Kernel cannot see, and would need changing whenever any of those frameworks changed its own internals. Leaving those details to the Runtime avoids both costs. [The Kernel page](../kernel.md) says more about what the Kernel owns; [the Runtime page](../runtime.md) says more about what the Runtime keeps.

Two limits on the Kernel are worth stating now, because both are easy to read too broadly.

First, the Kernel is not a process, a service or a deployment unit. The Kernel is a set of responsibilities. One backend process can carry those responsibilities alongside the Driver and the Runtime; another deployment can split them across machines. The operational role that actually executes Kernel transitions is a [Kernel Worker](operations.md#kernel-worker), and [deployment](../deployment.md) owns the question of where anything runs.

Second, "authority enforcement on mediated paths" is a deliberately narrow claim, not loose wording. A path is mediated when the Kernel is actually asked to authorize it, and a Runtime that already holds filesystem or network access need never ask — no Kernel decision reaches what it does then. Stopping that takes mediation or physical isolation, two different guarantees with two different owners, and telemetry is neither. [Exposure and mediation](actions.md#exposure-and-mediation) owns all three.

### Execution

An **Execution** is one independently addressable logical lifetime of work, with an authority binding, accepted progress and an eventual result, failure or cancellation. Its ID is never reused, even after deletion.

"Independently addressable" means four concrete things the application can do: create the Execution, submit input to it, inspect it, and cancel it. Anything the application needs to name, steer, inspect, cancel, or account for independently is a candidate for its own Execution. Work the application is content to treat as part of a larger unit can remain internal to that Execution's Runtime.

The application therefore chooses the granularity, and no rule on this page can choose it on the application's behalf. A chat session can contain several Executions — one per request worth tracking on its own — while an entire multi-agent workflow can be a single Execution whose internal structure the Kernel never sees. Both are correct. The question is not how big the work is but whether it needs its own identity, its own authority and its own recovery decision.

The never-reused rule keeps late arrivals from landing in the wrong lifetime. A service's result, a person's answer or a result routed back from another Execution can reach the Kernel long after the work it concerns has ended — a service answering an hour later, a person answering next week. If an Execution ID could be recycled, one of those late arrivals could be delivered, correctly by its own address, into a piece of work that had nothing to do with it. Never reissuing an ID makes "this is for an Execution that no longer exists" a fact the Kernel can always establish. A store that recycles primary keys therefore has to remap through a separate logical ID that is never reused.

Several familiar things are not Executions, and each one tempts for a different reason. A native session is not: it belongs to the Runtime and can outlive or predate the work. A process is not: processes die and are replaced while the Execution continues. A user or a tenant is not: those are [principals](actions.md#principal-and-authority), the identities work is done *on behalf of*. That last distinction runs the other way too: an Execution is not itself a principal. What it holds is an [authority binding](actions.md#principal-and-authority), defined with principals on the next page.

The states an Execution moves through, and the transitions between them, belong to [lifecycle](../mechanisms/lifecycle.md). How one comes into being belongs to [creation](../mechanisms/creation.md#one-atomic-creation).

### Execution Runtime

An **Execution Runtime**, shortened to **Runtime**, is code or a service that performs an Execution's work and owns the meaning of its continuation data. Native algorithms and internal workers stay opaque to the Kernel.

"Owns the meaning of its continuation data" is the clause the whole boundary rests on. The Runtime's saved state — its [progress](state.md#progress) — is stored by the Kernel and handed back unchanged at the next Activation. The Kernel never interprets it. So the Runtime can put in it whatever its own code needs: a small structured value like `{phase: "await-editor", draftRef}`, a reference to a native [checkpoint](state.md#checkpoint-and-locator), a locator for a job still running somewhere else. The Kernel's side of that is custody only, set out under [progress](state.md#progress); the Runtime owns what it says.

That opacity buys the architecture its reach and charges a specific price. The reach: a Runtime can be a fifty-line function, an [Agent](roles.md#agent) whose model decides its own control flow, a [Workflow](roles.md#workflow) following a predefined graph, or an entire third-party framework kept whole. None of those needs to be rewritten in Kernel vocabulary, and Agent and Workflow are patterns for building a Runtime rather than kinds the Kernel can see. The price: because the Kernel does not interpret progress, it cannot tell whether a saved value is still resumable. Something else has to answer that, which is exactly what the Driver below exists for.

The word *Runtime* carries associations that do not apply here, so two of them need cancelling explicitly. This Runtime is not the JavaScript VM, and it is not the deployment host — the machine or container that happens to run the code is an [Execution Host](operations.md#execution-host), a different concept with a different owner. Where a page needs to talk about work managed inside a Runtime, it says [local worker](roles.md#local-worker), which is not a child Execution and not a Kernel Worker.

### Execution Driver

An **Execution Driver**, shortened to **Driver**, adapts a Runtime to the Kernel protocol and declares which native continuation and action guarantees it can preserve.

The definition has two halves, and the second is the surprising one. Adapting is the obvious job: turn an Activation into whatever native call this Runtime understands, and turn the native response back into an Outcome. Declaring is the job that follows from the Kernel's own ignorance. The Kernel cannot discover, by inspection or by asking, whether a particular native system can be resumed after a crash, whether repeating a submission would create a second job, or whether a stale host can still mutate a session that has been handed to someone else. Only something that knows this Runtime can say. That is the Driver, and because the Kernel's recovery behavior depends on the answer, the declaration is part of what a Driver *is* rather than optional documentation attached to one.

Declaring honestly includes declaring nothing. "This integration cannot prove safe resumption" and "this works only within one process" are useful, supported answers, and a Driver that answers every question affirmatively is either unusually complete or untested. [The support record](../mechanisms/integration.md#support-record) owns the dimensions a Driver answers on.

A Driver is an adapter, not a second scheduler, a required service or a necessary process boundary. A Driver can be an in-process function, a subprocess client or a remote-job adapter, and the logical route Kernel → Driver → Runtime does not imply two physical hops.

The Driver translates in both directions, but the two directions are not mirror images. They happen at different moments, and they travel by different routes.

Outbound is the simple one. The Kernel hands the Driver an Activation; the Driver forwards its exact input to the Runtime by whatever route reaches that Runtime, calling a local function or submitting a remote job, and the call ends. Whatever that call returns, the Kernel does not read it, inspect it or wait on it. Nothing here is the Driver deciding anything, either: the Activation it was handed already fixes which program this is and what state the work resumes from, and the Runtime is what then does the work.

Inbound comes later, by its own route. When the native side eventually produces a result, the Driver turns that result into an Outcome — a separate act, at a time nobody fixed in advance. It submits the Outcome with the [submission authority](../mechanisms/execution-cycle.md#submission-authority) it was handed with the Activation, which shows the answer comes from the attempt allowed to give it. What it produces is still only a proposal until [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) rules on it. No part of the outbound call is held open waiting for it.

Between those two moments the Kernel is missing exactly one fact: did the hand-off reach the Runtime? The Driver answers that explicitly, through a reporting capability the Kernel supplies alongside the Activation, rather than by returning an answer the Kernel would then have to watch — which would blur "I delivered it" into "the work finished."

That answer stays deliberately small. It says the hand-off was acknowledged, or that it was not. It does not say the Runtime finished, it does not say any Outcome was accepted, and a reported failure does not prove that native work never started. [The delivery reporting boundary](../mechanisms/execution-cycle.md#delivery-reporting-boundary) owns the exact rule, including what an unreported or late report means; [the Driver page](../driver.md) covers what a Driver's translation must preserve.

The identities on the two sides do not line up one-to-one either. Each Driver declares, in [the support record](../mechanisms/integration.md#support-record), how Execution and Activation identities line up with the Runtime's native runs, sessions and jobs. One native session may span several native runs, and one Activation is not automatically one conversation turn.

How many Executions one Driver serves is not yet established. <!-- OPEN(unassigned): how many Executions one Driver serves. Only the two facts below are settled. Whoever assigns an owner: state the rule here and delete this marker; until then prose must not imply an arrangement. rewrite-index.md §4 -->

Two facts bound the question without answering it. A Driver adapts one particular Runtime, not one particular Execution. And what an Execution pins at [creation](../mechanisms/creation.md#one-atomic-creation) are revisions, the [Runtime contract](#runtime-contract)'s among them, not an adapter — that binding names no Driver at all — so it neither requires nor forbids a Driver per Execution.

Whether a deployment shares one Driver across many Executions, builds one per Execution, or replaces the Driver behind a long-lived Execution, is not decided here. The absence of a rule is an open question, not permission to assume whichever arrangement is convenient.

### Definition

A **Definition** is the versioned executable code or configuration <!-- OPEN(unassigned): the exact form a Definition and its pinned revision take. When an owner fixes the form: replace "code or configuration" here, rewrite this entry's closing paragraph, and delete this marker. rewrite-index.md §4 --> selected for an Execution. What the Kernel holds is the pinned revision; it does not interpret the code. It answers *which program*, not just a friendly name.

Two things are named in that first sentence, and keeping them apart makes the rest of this entry easier to follow. The Definition is the program itself: the code or configuration that prepares the weekly report. A Definition [revision](identity.md#revision) is one exact version of that program. The revision is enough to say which program an Execution runs without the Kernel knowing anything about what the program does.

Pinning one revision, rather than resolving a name whenever the program is needed, is what makes that answer survive time. A name resolves to whatever it points at the moment someone looks, which is fine for a call that returns in a second and wrong for an Execution that may live for a week across several restarts. Between the first Activation and the last, the code behind a name can be redeployed, renamed or replaced. A pinned revision lets every later Activation say which program this exchange belongs to, and lets recovery ask whether that exact program is still available rather than hoping the current one is close enough.

Creation binds that revision together with the Execution's authority and its initial input in one accepted decision. Binding them together rather than in sequence is what stops an Execution from existing in a state with no accepted meaning — a lifetime that has an ID but no answer yet to who may act for it or which code reads its progress. [One atomic creation](../mechanisms/creation.md#one-atomic-creation) owns that rule.

Because the revision is bound at creation, a retried creation request cannot quietly change it. Retrying with the same [Creation request ID](identity.md#request-key-and-input-id) but different Definition content is a conflict that creates nothing, not an update to the program. The complete identity includes the caller's creation key and its caller context; letting different content through under that identity would turn the retry path into a way of changing what an Execution runs without anyone deciding to.

What form a pinned Definition revision actually takes is still open, as the first sentence of this entry marks. What is fixed is that the Kernel holds it and does not interpret it.

### Runtime contract

A **Runtime contract** is the separate versioned agreement through which the Driver interprets an Activation into a native call and a native result into an Outcome and progress. The Kernel holds only its pinned revision. Compatibility is decided by this pin, never by an Agent or Workflow tag.

Two different questions hide in "can this code still run this work," and the Definition answers only the first. *Which program* is one question. *How this exchange is read* — how an Activation becomes a native invocation, how a native response becomes progress the Runtime will recognize later — is another. Giving each question its own pin means a change to either can be detected rather than inferred.

The definition's last clause rules out a tempting shortcut. It is easy to believe that knowing an Execution is "an Agent" or "a Workflow" tells you something about whether its progress can be read. It does not. Those are patterns for structuring a Runtime, shared freely between implementations; two Agents can disagree completely about their progress format, and an Agent and a Workflow can share one. That is why no such tag appears anywhere in the Kernel's model.

A Runtime contract is also not the progress [codec](values.md#codec), and the two are easy to run together because both are versioned and both are about reading accepted progress. The codec decodes stored bytes into a value. The contract interprets what that value *means* for resumption. The gap between them is real and has a concrete failure case: the same bytes under a newer contract that renamed a progress field decode perfectly and mean something different. That state must be held rather than resumed, and only a separate contract pin makes the situation detectable at all.

## One exchange

The Kernel and a Runtime never share a call stack. They trade one question and one answer at a time: an Activation asks, and an Outcome answers.

### Activation

An **Activation** is one immutable semantic exchange asking a Runtime to advance an Execution from pinned progress and a fixed [Event](#event) batch — a fixed set of observations the Kernel has already accepted on this Execution's behalf, defined two sections below. It carries a [finite batch](#batch-reservation-and-acknowledgment) and [bounded values](values.md#fixed-semantic-limits); the computation it requests is not time-bounded. An [Activation ID](identity.md#runtime-attempt) names this exchange.

Immutability is the property everything else rests on, and the reason is short: an accepted answer has to correspond to a fixed question. If new mailbox arrivals could be slipped into an Activation that was already in flight, the Outcome that eventually came back would have been computed from one set of inputs and accepted against another, and no later reader could tell which. So the exchange is fixed when it is created, and new semantic input requires a new Activation after this one resolves.

Everything that fixes the exchange is recorded before anything is sent. [Before sending](../mechanisms/execution-cycle.md#before-sending) owns the full list, which includes:

- the [dispatch intent](identity.md#dispatch-and-delivery) and the current [writer epoch](identity.md#writer-epoch);
- the pinned progress and its [base revision](identity.md#revision);
- the reserved batch;
- the progress codec, and the Definition and Runtime contract revisions;
- the authorized [execution view](roles.md#view-and-disclosure).

An Activation is not a request-response call that the caller blocks on. The Kernel hands it over and stops waiting; the Runtime may answer in a millisecond or in an hour, and the Kernel's own loop is free the whole time. If you are picturing a synchronous function call, replace that picture. Two useful consequences follow. Slow work stays inside the Runtime, where it belongs, rather than occupying the Kernel. And different Executions can be worked on concurrently — though that concurrency comes from the protocol and not from the operating system, so a tight synchronous loop in one Runtime can still starve everything sharing its process.

Because the exchange is a *semantic* object rather than a physical send, its identity survives things that look like they should change it. An ordinary delivery retry — the same dispatch sent again because the first attempt may not have arrived — keeps the Activation ID and the pinned input, and keeps the [writer epoch](identity.md#writer-epoch) that says which attempt may commit. An authorized takeover, where recovery has decided the original attempt may no longer commit, keeps the same Activation ID and the same pinned input and advances only the writer epoch: a new attempt at the same question, not a new question. This is exactly what lets a late Outcome be checked against the pins and then either recognized as a harmless duplicate or [rejected as stale](../mechanisms/execution-cycle.md#outcome-acceptance). [Retry versus takeover](../mechanisms/execution-cycle.md#retry-versus-takeover) shows the three cases side by side.

One Execution has at most one current Activation allowed to have an Outcome accepted. That is a statement about who may commit, not about how much work can be in flight anywhere: a disconnected old attempt may still be computing, and a native job may still be running. What the rule guarantees is that when two answers to the same question arrive, at most one of them becomes accepted state.

Finally, an Activation is not a conversation turn, a model call or a native run. A Driver may map one Activation onto several native calls, or several Activations onto one long-lived session. The mapping is the Driver's to declare.

### Outcome

An **Outcome** is the Runtime's proposal ending an Activation: progress, [Emissions](actions.md#emission-result-and-output-obligation), [Effects](actions.md#effect) and one next step — `continue`, `await`, `complete` or `fail`.

It is a proposal, and that is the most important word in the definition. Nothing in an Outcome is true because the Runtime said it. It becomes accepted state only through [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance), where the Kernel validates the whole envelope and then commits every part of it in one step. The gap between submission and acceptance is where staleness, duplication and cancellation are decided, and collapsing it would remove the only place those questions can be answered.

Committing the parts together, rather than one at a time, is what makes the accepted record coherent. An Outcome's progress, the acknowledgment of the Events it accounted for, the output it produced and the [action intents](actions.md#logical-action-and-intent) it proposed all describe a single decision the Runtime made, so the rule is all or nothing: an accepted proposal advances every one of those facts, and a rejected proposal advances none of them.

Two examples show what partial acceptance would cost. Suppose the Kernel accepted the acknowledgment of the editor's correction but not the progress that took that correction into account. The correction is now marked as accounted for, so it will never be carried to the Runtime again, and the state that accounted for it has been discarded. Suppose instead the Kernel accepted an intent to publish the report but not the progress that decided to publish it. The Kernel is now holding an obligation to publish, while the Runtime's progress has no record of ever having asked for publication. Neither record describes a decision anyone actually made.

Rejection is not an undo. When the Kernel rejects an Outcome, it records none of it. But the Runtime has already done whatever it did while computing — called a model, written a file, moved a native session forward — and rejecting its proposal does not undo any of that. The Kernel decides what counts as accepted. It cannot reverse what has already happened. [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) owns what a rejection records.

The four next steps say what should happen to the Execution, and each means something the others do not:

- `continue` — there is more to do and nothing to wait for. The Execution becomes eligible for another Activation right away.
- `await` — the Runtime cannot go further until something the Kernel can observe arrives. The proposal carries the [wait](#wait-subscription-and-generation) that says what.
- `complete` — the work is finished, with a result. This is a claim the Kernel checks rather than takes on trust; [completion is an accounting check](../mechanisms/lifecycle.md#completion-is-an-accounting-check) says what it is checked against.
- `fail` — the work ended without a result. Like completion, it ends this logical lifetime and does not by itself say anything about work still running elsewhere.

Several things that travel between Kernel and Runtime are not Outcomes. Dispatch acknowledgments, heartbeats, cancellation signals and diagnostic or streaming output are [operational traffic](../mechanisms/execution-cycle.md#before-sending): useful, sometimes necessary, and incapable of writing progress. One Activation is answered by at most one accepted Outcome, but everything else that flows across the boundary is a report about the exchange rather than a move within it.

## What arrives

Whatever the Runtime needs from outside — an editor's answer, a service's result — reaches it the same way: accepted as an Event, held in the mailbox, and carried to the Runtime in a batch.

### Event

An Outcome often ends by asking for something the Runtime cannot produce by itself: an editor's answer, a service's result, a reply from another Execution. What eventually arrives is an Event.

An **Event** is an immutable accepted observation addressed to an Execution. It has [identity](identity.md#request-key-and-input-id), a destination, a kind, a payload and trusted ingress provenance; <!-- OPEN(unassigned): trusted ingress provenance has no defining section of its own. Whoever writes one: define it there, reduce this clause to a link, and delete this marker. rewrite-index.md §4 --> correlation is included when needed.

Each of those fields answers a different question. The **destination** says which Execution the observation is addressed to. The **kind** is a short label naming what sort of observation this is — an editor's correction, a publication result — which a Runtime can branch on and a [wait](#wait-subscription-and-generation) can select by. The **payload** carries the content. **Trusted ingress provenance** records the path the observation arrived through, and is the subject of the rest of this entry. **Correlation**, where it is present, ties the observation to the request or dependency it concerns.

The word *accepted* does most of the work in that definition. Things arrive at a system constantly; an Event is what one of those arrivals becomes once the Kernel has authenticated its path, checked it and recorded it. Something refused at ingress never becomes an Event at all — it is not a rejected Event, it is nothing. This is why an Event can be treated as fact everywhere downstream: by the time any other rule mentions one, the question of whether to believe it has already been answered.

Once accepted, an Event takes its place in that Execution's own [accepted order](identity.md#acceptance-boundary-and-receipt). That order is local and says nothing about another Execution's order, and nothing about which of two independent deliveries "really" happened first. There is no global clock here, and asking for one would mean promising an ordering the Kernel cannot observe.

Every Event also has a **source category**, which comes from the trusted path that accepted or minted it: application input, a Kernel timeout, or another trusted result or routed observation. The category is decided by the ingress path and never by the payload or the kind. A payload that describes itself as a settlement does not become one, and an Event whose kind is spelled to look like a Kernel timeout is still ordinary application input when application input is how it arrived.

That rule reads like bureaucratic caution until you see what it protects. [Wait eligibility](../mechanisms/waits.md#eligibility-comes-from-trusted-source-category) — which arriving Events are allowed to wake a paused Execution — is decided by source category. Application input is untrusted and freely shaped: anyone who learned a correlation identifier could compose input that looks exactly like a service's settlement. If eligibility were decided by what a payload claimed about itself, that imitation would work. Deciding by the path it came in on keeps the two apart even when the payloads are identical.

### Mailbox

Accepted Events do not go straight into an Activation. They wait in the mailbox until the Kernel pins some of them into a batch.

The **mailbox** is the accepted Events addressed to an Execution, each with an independent processing disposition.

Each Event in the mailbox carries its own record of what has happened to it. An Event can be waiting with no disposition recorded yet, still unacknowledged and available for a later batch; acknowledged, because an accepted Outcome accounted for it; or given a [terminal disposition](#batch-reservation-and-acknowledgment), because the Execution ended before anything processed it. Each of those is a fact about one Event, recorded against that Event alone.

That independence rules out the arrangement most systems reach for first: a single cursor, one position meaning "everything before here has been handled." Suppose two things arrive while the report is being prepared — first an editor's correction, then the publication result the Execution is waiting for. The next Activation carries the publication result. A cursor advancing to that result would drag the correction along with it, marking as handled an Event no Runtime has ever been shown. With a per-Event disposition the correction simply stays unacknowledged, and a later batch can still carry it.

The same property is what lets an early result survive. Suppose the service publishes the report and answers while the Execution is still busy computing, before it has even declared that it is waiting for that answer. The result is accepted and sits in the mailbox; when the Runtime later says it is waiting for exactly that, the answer is already there. Nothing is lost because something newer arrived after it, and nothing had to be replayed to notice it.

The mailbox is not a transport queue and not a delivery mechanism. It is the accepted record of what has been addressed to this Execution, which is why it survives restarts in a deployment whose storage does, and why reading it acknowledges nothing and changes nothing. Which Events leave it and when is decided by [batch selection](../mechanisms/waits.md#selecting-the-batch).

### Batch, reservation and acknowledgment

Three terms cover one Event's passage from the mailbox into an Activation and out again, and they are separated because each names a different moment with different consequences.

A **batch** is the finite, enumerable set of accepted Event references pinned in one Activation. Finite and enumerable, rather than "everything since position N": the Activation carries a set the Kernel can list, and a later Outcome can be checked against it exactly.

**Reservation** is the Kernel decision that fixes that batch as part of [dispatch intent](identity.md#dispatch-and-delivery). Which Events get fixed is decided by [the batch selection rules](../mechanisms/waits.md#selecting-the-batch), not by arrival order alone.

Two numbers meet at reservation, and they are easy to confuse. The **bound** is the largest number of Events any one batch may carry; the implementation chooses that number, and it must be at least one. The **size of a particular batch** is whatever selection actually produced, never above the bound and sometimes zero.

Each number has its own rule. A bound of zero is forbidden, because a batch that could never carry an Event could never tell a woken Execution which Event woke it. An empty batch, by contrast, is ordinary in one particular case: when the Runtime proposes `continue` and nothing is queued, the next Activation carries no Events at all, because the Runtime asked to keep going rather than to read something. A batch that follows a wait is never empty. It always carries the Event or the timeout that ended that wait, unless an accepted terminal decision suppresses the dispatch entirely.

Reservation acknowledges nothing, and that separation is what makes a crash between dispatch and answer survivable. Reserving records the Kernel's intent to send these exact Events; if the sending fails, or the host dies, or the Runtime never answers, those Events are still unacknowledged and the same exchange can be delivered again unchanged. Had reservation counted as acknowledgment, the Events would look accounted for by a Runtime that never saw them.

**Acknowledgment** records that the Runtime accounted for an Event. An accepted Outcome acknowledges the whole reserved batch, not only the members the Runtime happened to use.

Whole-batch acknowledgment sounds blunt, but it follows from keeping two questions apart. Both hide inside "did the Runtime handle this Event?" One is *accounting*: has the Runtime taken this Event into its accepted state? The Kernel answers that, and only that, by accepting the Outcome. The other is *compliance*: did the Runtime do what the Event asked? The Kernel does not answer that at all, because it cannot — judging compliance would mean reading progress it does not interpret, or parsing a model's prose, and being wrong about either would be worse than not answering.

So a Runtime that does not want to act on an Event yet has two honest options, both recorded in its own progress: carry the Event forward, for example as `{phase: "draft", pendingCorrection: eventId}`, or record a decision to refuse what the Event asked for. Neither changes the Event's acknowledgment. It is accounted for either way, and there is no separate per-Event "rejected" disposition for the Kernel to record.

That leaves exactly two dispositions an Event can end up with, and no others. **Acknowledgment** is one. A **terminal disposition** is the other: it records that the Execution [ended](../mechanisms/lifecycle.md) before this input was processed. A terminal disposition must not masquerade as acknowledgment, because the two describe opposite situations — one says the Runtime accounted for this, the other says nobody ever will.

## Waiting for what arrives

A Runtime that cannot continue until something arrives says so in its Outcome. Three entries cover that pause: the wait it declares, the readiness that carries a woken Execution to its next dispatch, and the timeout Event that ends a wait when nothing else does.

### Wait, subscription and generation

This entry describes the pause itself: what a wait declares, the rules that decide what matches it, and the identity of one registration.

A **wait** is a Runtime-declared need for a Kernel-visible observation, registered by an accepted Outcome. It contains finite dependency alternatives and declared input subscriptions, an optional deadline, and a **generation** identifying this registration.

Sketched, not as a wire schema:

```text
wait
  dependency alternatives      [ { correlation: "publish-P" } ]      any one may match
  declared input subscriptions [ "editor-correction" ]               a class of application input
  deadline                     optional
  generation                   this registration
```

A **dependency alternative** selects non-application, non-timeout Events by envelope identity, kind or correlation. A **declared input subscription** names a class of ordinary application input eligible to wake this wait. Each is a **selector** — a rule for testing Events against the wait. In the report example, "the publication result for intent P" is a dependency alternative and "any editor correction" is a declared input subscription, and one wait can hold both.

The two lists are distinct kinds rather than one generic facility, and the reason is the trust asymmetry from the [Event](#event) section: Kernel-minted and routed Events are already trusted, so a selector may safely match them by identity, kind or correlation, while application input is untrusted and needs its own explicitly declared class. This is not a general pub/sub service, and [waits](../mechanisms/waits.md#declare-what-can-wake-the-execution) owns the exact grammar, the source-category rules and what makes a declaration well-formed.

The word "Kernel-visible" in the definition draws the boundary that gives waits their meaning. A wait is not "the Runtime is blocked" — it is "the Runtime has told the Kernel it needs something the Kernel can actually observe and deliver." A Runtime awaiting its own model API is not waiting in this sense at all; that call is not mediated, the Kernel was never asked to coordinate it, and it has no record of it. The practical consequence is that [`WAITING`](../mechanisms/lifecycle.md) is the Kernel's bookkeeping about dispatch and not a report about a process: it means the Kernel will not send another Activation until the declared observation arrives or the wait's deadline expires. A wait whose answer is already in the mailbox never reaches that state at all — the Execution is ready again immediately, and [registering a wait](../mechanisms/waits.md#registering-a-wait) owns which of the two happens.

A **generation** belongs to the wait, not to the work being awaited, and that is the distinction this term exists to make. If the Runtime registers a similar wait again later, that is a new generation even though the publication it is waiting on is the same external thing. Generations identify registrations so that artifacts created for one — a timer, above all — can be recognized as belonging to a registration that has since been retired and replaced. Without that, a timer set for an earlier, long-finished wait could expire and appear to answer the current one. [Ending a wait](../mechanisms/waits.md#ending-a-wait) owns retirement and the fencing that depends on it.

### Readiness

**Readiness** is accepted state from which a scheduler can reconstruct the need for dispatch.

Put plainly: readiness is the Kernel's record that an Execution is due for another Activation, together with enough information to say why. It is written at the moment something makes the Execution dispatchable, and it is read later, when the Kernel actually prepares that Activation.

Those two moments are not the same moment, and that gap is the whole reason the concept exists. An Event arrives and ends a wait at one instant. The Activation carrying that Event is prepared at another — perhaps a moment later, perhaps after a restart, perhaps on a different [Kernel Worker](operations.md#kernel-worker). Something has to cross the gap carrying "this Execution is due, and here is why." Readiness is that something, and it is accepted state rather than merely a scheduler notification. It survives a crash inside the gap under a [persistent operating profile](operations.md#operating-profile-and-durability) whose storage survives that failure.

An Execution can become ready in more than one way, and the ways are not equally simple. An Execution whose Runtime just proposed `continue` is ready in [the ordinary way](../mechanisms/waits.md#selecting-the-batch), and its next batch is drawn from whatever happens to be queued. An Execution that was waiting needs more care, and that case has its own term.

**Wait-ended readiness** is the one-dispatch selection information retained when an eligible Event or wait expiry ends a wait and makes the Execution ready: the retired selector and, for expiry, its mandatory [timeout Event](#timeout-event).

Retaining the retired selector stops an Execution from being woken for one thing and then handed another. Return to the report. The Execution is waiting for the publication result, and an unrelated editor correction has been sitting in the mailbox since before that wait was registered. The publication result arrives, ends the wait, and the Execution becomes ready.

The Kernel now prepares the next Activation — and the wait that explained what this Execution needed is gone, because ending a wait retires it. The obvious rule at this point, oldest Events first, would hand the Runtime the old correction and leave the publication result queued. Wait-ended readiness prevents that by carrying the retired selector forward, so the next batch is assembled under the rule the wait actually stated, and the publication result is what arrives.

A **selector** — one of the rules a wait used for testing arriving Events — retires with its registration. Two paths create wait-ended readiness: a matching Event is accepted, whether that Event was already queued when the wait was registered or arrived while the Execution was waiting, or the wait's deadline expires. Accepted [cancellation](../mechanisms/lifecycle.md#cancellation-order), including Execution-deadline cancellation, also ends a live wait, but creates no wait-ended readiness and permits no further Activation.

Retirement takes the whole registration with it, not only the rule that matched. A wait naming both the publication result and an editor correction is entirely over once either one arrives, and the other selector retires unsatisfied. [Ending a wait](../mechanisms/waits.md#ending-a-wait) owns that rule.

A retired selector is finished, not paused. After a wake or wait expiry, it survives only inside the wait-ended readiness above, where its one remaining job is to filter the next batch, and it is consumed along with that readiness. If the Runtime still needs what it did not get — the publication result that never came before the deadline expired — its next Outcome registers a new wait under a new generation. The need can be word for word the same; the registration is a new one regardless. So there is nothing to send to a retired selector, nothing to re-arm, and nothing to inspect that would answer "is this dependency still outstanding": that answer lives in whatever the Runtime most recently registered.

Readiness is consumed by the one dispatch it describes. It does not accumulate, it does not span two exchanges, and it does not re-arm when an Activation is redelivered or taken over, because both of those reuse the batch that was already pinned. [Selecting the batch](../mechanisms/waits.md#selecting-the-batch) owns how readiness becomes an actual batch, and the [small distinguishing examples](../mechanisms/waits.md#small-distinguishing-examples) there are worth reading once: several plausible-sounding selection rules give the wrong answer, and one example cannot tell them apart.

### Timeout Event

A **timeout Event** is a Kernel-minted observation that one wait generation expired. It has stable Event identity, a destination, a distinct timeout class, exact generation correlation and trusted timer provenance.

It is an Event, and that is a design decision rather than a formality. Every member of a batch is an accepted Event — one kind of member, not two — so the object that tells a Runtime "your deadline passed" has to be an Event too, or batches would need a second kind of member with its own acknowledgment rules, its own disposition and its own place in the accepted order. Minting it as an ordinary Event means it is acknowledged, disposed and ordered exactly like every other member, and nothing about batches needs a special case.

It is carried as a mandatory next-batch member rather than selected by a dependency alternative or a subscription. Nothing matches it, and nothing needs to: the Kernel knows which wait expired because it minted the timeout for that generation, and correlating the Event to the generation is what makes a timer for a superseded registration recognizable as stale. [Wait expiry](../mechanisms/waits.md#ending-a-wait) owns its creation, including the rule that one generation produces at most one timeout however many times a timer fires.

A timeout Event says that a deadline passed, and nothing else. In particular it says nothing about whether the external work succeeded. If the report's publication had a deadline that expired, the publication may have succeeded a moment later, may have failed, or may be in an unknown state that only [settlement or reconciliation](actions.md#settlement-and-reconciliation) can resolve. The wait ended; the world did not report in. Treating expiry as evidence of failure is how a system comes to record a confident answer it never actually obtained — and the [three clocks](operations.md#three-clocks) section makes the same point about the other two deadlines an Execution lives under, each of which expires for its own unrelated reason.

Next in the reading order: [actions](actions.md) — what an Execution can ask the world to do, and what decides whether it may.
