# Core coordination vocabulary

These are the canonical definitions of the terms every other page assumes. Each one is defined here and nowhere else: when [the execution cycle](../mechanisms/execution-cycle.md) or [waits](../mechanisms/waits.md) uses *Activation* or *Event*, it links back to this page rather than restating what the word means. What these terms *do together* — the order in which the Kernel validates a proposal, which Event may wake which wait — belongs to those mechanism pages, and this page points at them instead of duplicating them.

The entries below are longer than a glossary's. That is deliberate. A one-line definition tells you how to recognize a thing; it does not tell you why the design needed it, and a reader who has only the recognition rule cannot predict what happens in the cases no page enumerates. Each entry therefore gives three things: what the term means, why the architecture has it at all, and where its edges are — in particular, which nearby idea it is most often mistaken for. Read the whole page once in order; afterwards, come back to single entries.

Everything here is target specification. Naming a term commits nothing to building it, which is why concept pages carry no status line; [Target, not shipped](../README.md#target-not-shipped) says where the current build status actually lives. [Actions, authority and observations](actions.md) is the page to read next, because its first term is defined in terms of this page's Outcome.

## A first example

An application wants a weekly report prepared, and hands that request to ArrokothI. ArrokothI records it as one piece of work with an identity of its own: an **Execution**. From now on the application can address that work — ask about it, send it something, stop it — without knowing anything about who is doing it or how far along they are.

Something has to actually write the report, and that something is a **Runtime**: ordinary code, an agent framework, a workflow engine, whatever the application chose. The Runtime is not part of ArrokothI. It keeps its own model loop, its own graph, its own memory, and ArrokothI never looks inside any of them.

So there are two parties who are deliberately ignorant of each other, and the gap between them is this page's whole subject. On one side, the **Kernel** knows what has been accepted about the report — who asked for it, how far it has got, what it is waiting for — and knows nothing about how a report gets written. On the other, the Runtime knows how to write a report and needs to be told when to continue and with what.

The Kernel bridges that gap by asking, one question at a time. Its question is an **Activation**: advance this Execution, starting from exactly this saved state, taking exactly these observations into account. The Kernel does not call the Runtime's native API itself — it hands the Activation to a **Driver**, a small adapter that knows this particular Runtime's interface and translates in both directions.

The Runtime's answer is an **Outcome**: here is my new saved state, here is anything I produced, and here is what should happen next. Suppose our Runtime drafts the report and then cannot go further until the editor approves it. It says exactly that: progress saved, and now waiting for the editor. Crucially, none of this is true yet. An Outcome is a proposal, and it becomes accepted state only when the Kernel accepts it — in one decision, all of it or none of it.

The Kernel accepts, and the Execution settles into waiting. Later the editor replies. That reply arrives through a trusted path, the Kernel accepts it, and it becomes an **Event**: an observation addressed to this Execution. It does not go straight to the Runtime, because there is no Activation in flight to carry it; it sits in the Execution's **mailbox** until the Kernel pins it into a **batch** and sends a second Activation. The Runtime picks up from its saved state, reads the editor's answer, and finishes the report.

That is the entire loop, and the fifteen terms below name its pieces precisely. They fall into four groups, in the order the story used them:

- **Who is involved** — [Kernel](#kernel), [Execution](#execution), [Execution Runtime](#execution-runtime) and [Execution Driver](#execution-driver), plus the [Definition](#definition) that pins *which program* an Execution runs and the [Runtime contract](#runtime-contract) that separately pins *how the exchange is read*.
- **One exchange** — [Activation](#activation) asks; [Outcome](#outcome) answers.
- **What arrives** — an [Event](#event), the [mailbox](#mailbox) that holds it, and the [batch](#batch-reservation-and-acknowledgment) that pins some of it into an Activation.
- **Waiting for what arrives** — a [wait](#wait-subscription-and-generation), the [readiness](#readiness) that survives it, and the [timeout Event](#timeout-event) that ends it when nothing else does.

The same report appears throughout as the running example. [The overview](../README.md#example-a-report-that-needs-publication) tells a fuller version in which the report is also published through a service, and [the worked trace](../mechanisms/execution-cycle.md#worked-trace) adds the identities, lost replies and retries that this page's version leaves out.

## Kernel

The **Kernel** is the provider-neutral coordinator that accepts and records Execution state changes, addressed observations and mediated action requests. It owns lifecycle, authority enforcement on mediated paths, scheduling semantics, communication and recovery of accepted truth. It does not own the work's algorithm.

The verbs in that definition are narrow on purpose. The Kernel *accepts* and *records*; it does not compute, and it does not supervise. Its authority is the authority to decide what counts as having happened. When the Runtime says "I made progress and I need the editor," that is a claim; when the Kernel accepts it, it becomes the state of the world, and every later question — what should be dispatched, what is still owed, what must be reconstructed after a crash — is answered from the accepted record rather than from anyone's memory or from a live connection.

Making that the Kernel's only job is what lets the two sides stay ignorant of each other. Two parties who share no model of the work still need to agree on what is true so far, and that is a small enough contract to write down. A coordinator that also understood the work — model loops, graph nodes, context compaction, provider checkpoints — would have to be correct about semantics it cannot observe, and would have to change every time a framework it did not write changed. [The Kernel page](../kernel.md) develops that division; [the Runtime page](../runtime.md) develops the other half.

Two boundaries on the Kernel are worth installing now, because both are easy to over-read.

The Kernel is not a process, a service or a deployment unit. It is a set of responsibilities. A single backend process can perform them alongside the Driver and the Runtime; a deployment can equally split them across machines. The operational role that actually executes Kernel transitions is a [Kernel Worker](operations.md#kernel-worker), and [deployment](../deployment.md) owns the question of where anything runs.

"Authority enforcement on mediated paths" is also a deliberately small claim rather than a hedge. A **mediated** path is one that goes through Kernel admission and settlement; a Runtime with ambient filesystem or network access can still act without asking, and no Kernel decision stops it. Preventing that requires either [mediation or physical isolation](actions.md#exposure-and-mediation), which are different guarantees with different owners. Telemetry that observes an unmediated action neither mediates nor prevents it.

## Execution

An **Execution** is one independently addressable logical lifetime of work, with an authority binding, accepted progress and an eventual result, failure or cancellation. Its ID is never reused, even after deletion.

"Independently addressable" is the load-bearing phrase, and it cashes out as four things the application can do: create the Execution, submit input to it, inspect it, and cancel it. Anything the application needs to name, steer or account for separately therefore deserves its own Execution; anything it is content to treat as an implementation detail of some larger piece of work does not.

Which is why the application chooses the granularity, and no rule here can choose it for them. A chat session can contain several Executions — one per request worth tracking on its own — while an entire multi-agent workflow can be a single Execution whose internal structure the Kernel never sees. Both are correct. The question is not how big the work is but whether it needs its own identity, its own authority and its own recovery decision.

The never-reused rule exists to keep late messages from landing in the wrong lifetime. Observations, settlements and routed results can arrive long after the work they concern has ended — a service answering an hour later, a person answering next week. If an ID could be recycled, one of those late arrivals could be delivered, correctly by its own address, into a piece of work that had nothing to do with it. Never reissuing an ID makes "this is for an Execution that no longer exists" a fact the Kernel can always establish. A store that recycles primary keys therefore needs a separate logical ID that it never recycles.

Several familiar things are not Executions, and each one tempts for a different reason. A native session is not: it belongs to the Runtime and can outlive or predate the work. A process is not: processes die and are replaced while the Execution continues. A user or a tenant is not: those are [principals](actions.md#principal-and-authority), the identities work is done *on behalf of*. That last distinction runs the other way too — an Execution is not itself a principal. It holds an authority binding, which bounds what it may do; it is not someone to whom authority can be granted.

The states an Execution moves through, and the transitions between them, belong to [lifecycle](../mechanisms/lifecycle.md). How one comes into being belongs to [creation](../mechanisms/creation.md#one-atomic-creation).

## Execution Runtime

An **Execution Runtime**, shortened to **Runtime**, is code or a service that performs an Execution's work and owns the meaning of its continuation data. Native algorithms and internal workers stay opaque to the Kernel.

"Owns the meaning of its continuation data" is the clause that makes the whole boundary work, and it is worth spelling out. The Runtime's saved state — its [progress](state.md#progress) — is stored by the Kernel and handed back unchanged at the next Activation. The Kernel never reads it. So the Runtime can put in it whatever its own code needs: a small structured value like `{phase: "await-editor", draftRef}`, a reference to a native [checkpoint](state.md#checkpoint-and-locator), a locator for a job still running somewhere else. The Kernel owns the accepted *version* of that value and its retention; the Runtime owns what it says.

That opacity buys the architecture its reach and charges a specific price. The reach: a Runtime can be a fifty-line function, an [Agent](roles.md#agent) whose model decides its own control flow, a [Workflow](roles.md#workflow) following a predefined graph, or an entire third-party framework kept whole. None of those needs to be rewritten in Kernel vocabulary, and Agent and Workflow are patterns for building a Runtime rather than kinds the Kernel can see. The price: because the Kernel cannot read progress, it cannot tell whether a saved value is still resumable. Something else has to answer that, which is exactly what the Driver below exists for.

The word *Runtime* carries associations that do not apply here, so two of them are worth cancelling explicitly. This Runtime is not the JavaScript VM, and it is not the deployment host — the machine or container that happens to run the code is an [Execution Host](operations.md#execution-host), a different concept with a different owner. Where a page needs to talk about internal parallelism inside a Runtime, it says [local worker](roles.md#local-worker), which is not a child Execution and not a Kernel Worker.

## Execution Driver

An **Execution Driver**, shortened to **Driver**, adapts a Runtime to the Kernel protocol and declares which native continuation and action guarantees it can preserve.

The definition has two halves, and the second is the surprising one. Adapting is the obvious job: turn an Activation into whatever native call this Runtime understands, and turn the native response back into an Outcome. Declaring is the job that follows from the Kernel's own ignorance. The Kernel cannot discover, by inspection or by asking nicely, whether a particular native system can be resumed after a crash, whether repeating a submission would create a second job, or whether a stale host can still mutate a session that has been handed to someone else. Only something that knows this Runtime can say. That is the Driver, and because the Kernel's recovery behaviour depends on the answer, the declaration is part of what a Driver *is* rather than optional documentation attached to one.

Declaring honestly includes declaring nothing. "This integration cannot prove safe resumption" and "this works only within one process" are useful, supported answers, and a Driver that answers every question affirmatively is either unusually complete or untested. [The support record](../mechanisms/integration.md#support-record) owns the dimensions a Driver answers on.

A Driver is an adapter and not a second scheduler, a required service or a necessary process boundary. It can be an in-process function, a subprocess client or a remote-job adapter, and the logical route Kernel → Driver → Runtime does not imply two physical hops. Nor is its identity mapping one-to-one: one native session may span several Executions' worth of work, and one Activation is not automatically one conversation turn.

One further consequence of the Driver being an adapter rather than a participant: it does not answer an Activation. It delivers one, reports whether the hand-off succeeded, and nothing more. The Outcome comes from the Runtime through its own boundary, and confusing "I delivered it" with "the work finished" is precisely what [the delivery reporting boundary](../mechanisms/execution-cycle.md#delivery-reporting-boundary) exists to prevent. [The Driver page](../driver.md) covers what translation must preserve.

## Definition

A **Definition** is the versioned executable code or configuration <!-- TODO: pin down the exact form a Definition takes --> selected for an Execution. What the Kernel holds is the pinned revision; it does not interpret the code. It answers *which program*, not just a friendly name.

The pin is the point. A friendly name resolves to whatever that name points at when someone looks — which is fine for a call that returns in a second, and wrong for an Execution that may live for a week across several restarts. Between the first Activation and the last, the code behind a name can be redeployed, renamed or replaced. Pinning a [revision](identity.md#revision) at creation means every later Activation can say which program this exchange belongs to, and recovery can ask whether that exact program is still available rather than hoping the current one is close enough.

Creation binds that revision together with the Execution's authority and its initial input in one accepted decision. Binding them together rather than in sequence is what stops an Execution from existing in a state with no accepted meaning — a lifetime that has an ID but no answer yet to who may act for it or which code reads its progress. [One atomic creation](../mechanisms/creation.md#one-atomic-creation) owns that rule.

The pin also decides what a retried creation request means. Retrying with the same caller-scoped key but different Definition content is a conflict that creates nothing — not an update to the program. The key is a promise that this is the same request as before; letting different content through under it would turn the retry path into a way of changing what an Execution runs without anyone deciding to.

What form the pinned revision actually takes — a digest, a registry coordinate, a version string — is not fixed on this page. What is fixed is that the Kernel holds it and does not interpret it.

## Runtime contract

A **Runtime contract** is the separate versioned agreement through which the Driver interprets an Activation into a native call and a native result into an Outcome and progress. The Kernel holds only its pinned revision. Compatibility is decided by this pin, never by an Agent or Workflow tag.

Two different questions hide in "can this code still run this work," and the Definition answers only the first. *Which program* is one question. *How this exchange is read* — how an Activation becomes a native invocation, how a native response becomes progress the Runtime will recognize later — is another, and the same program can be driven by different adapters with different conventions. Giving each question its own pin means a change to either can be detected rather than inferred.

The second clause of the definition matters more than its length suggests: compatibility is decided by this pin and never by a type tag. It is tempting to believe that knowing an Execution is "an Agent" or "a Workflow" tells you something about whether its saved state can be read. It does not. Those are patterns for structuring a Runtime, shared freely between implementations; two Agents can disagree completely about their progress format, and an Agent and a Workflow can share one. The pinned contract revision is the only thing that answers the question, which is why no such tag appears anywhere in the Kernel's model.

A Runtime contract is also not the progress [codec](values.md#codec), and the two are easy to run together because both are versioned and both are about reading saved state. The codec decodes stored bytes into a value. The contract interprets what that value *means* for resumption. The gap between them is real and has a concrete failure case: the same bytes under a newer contract that renamed a progress field decode perfectly and mean something different. That state must be held rather than resumed, and only a separate contract pin makes the situation detectable at all.

## Activation

An **Activation** is one immutable semantic exchange asking a Runtime to advance an Execution from pinned progress and a fixed [Event](#event) batch — a fixed set of observations the Kernel has already accepted on this Execution's behalf, defined two sections below. It carries a finite batch and [bounded values](values.md#fixed-semantic-limits); the computation it requests is not time-bounded. An [Activation ID](identity.md#runtime-attempt) names this exchange.

Immutability is the property everything else rests on, and the reason is short: an accepted answer has to correspond to a fixed question. If new mailbox arrivals could be slipped into an Activation that was already in flight, the Outcome that eventually came back would have been computed from one set of inputs and accepted against another, and no later reader could tell which. So the exchange is fixed when it is created, and new semantic input requires a new Activation after this one resolves. What the Kernel pins before sending — progress and its base revision, the reserved batch, the codec, the Definition and contract revisions, the authorized [execution view](roles.md#view-and-disclosure) — is owned by [before sending](../mechanisms/execution-cycle.md#before-sending).

An Activation is not a request-response call that the caller blocks on. The Kernel hands it over and stops waiting; the Runtime may answer in a millisecond or in an hour, and the Kernel's own loop is free the whole time. If you are picturing a synchronous function call, replace that picture. Two useful consequences follow. Slow work stays inside the Runtime, where it belongs, rather than occupying the coordinator. And different Executions can be worked on concurrently — though that concurrency comes from the protocol and not from the operating system, so a tight synchronous loop in one Runtime can still starve everything sharing its process.

Because the exchange is a *semantic* object rather than a physical send, its identity survives things that look like they should change it. An ordinary delivery retry — the same dispatch sent again because the first attempt may not have arrived — keeps the Activation ID and the pinned input, and keeps the [writer epoch](identity.md#writer-epoch) that says which attempt may commit. An authorized takeover, where recovery has decided the original attempt may no longer commit, keeps the same Activation ID and the same pinned input and advances only the writer epoch: a new attempt at the same question, not a new question. This is exactly what lets a late Outcome be checked against the pins and then either recognized as a harmless duplicate or [rejected as stale](../mechanisms/execution-cycle.md#outcome-acceptance). [Retry versus takeover](../mechanisms/execution-cycle.md#retry-versus-takeover) shows the three cases side by side.

One Execution has at most one current Activation allowed to have an Outcome accepted. That is a statement about who may commit, not about how much work can be in flight anywhere: a disconnected old attempt may still be computing, and a native job may still be running. What the rule guarantees is that when two answers to the same question arrive, exactly one of them can become accepted state.

Finally, an Activation is not a conversation turn, a model call or a native run. A Driver may map one Activation onto several native calls, or several Activations onto one long-lived session. The mapping is the Driver's to declare.

## Outcome

An **Outcome** is the Runtime's proposal ending an Activation: progress, [emissions](actions.md#emission-result-and-output-obligation), [Effects](actions.md#effect) and one next step — `continue`, `await`, `complete` or `fail`.

It is a proposal, and that is the most important word in the definition. Nothing in an Outcome is true because the Runtime said it. It becomes accepted state only through [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance), where the Kernel validates the whole envelope and then commits every part of it in one step. The gap between submission and acceptance is where staleness, duplication and cancellation are decided, and collapsing it would remove the only place those questions can be answered.

Committing the parts together, rather than one at a time, is what makes the accepted record coherent. An Outcome's progress, the acknowledgment of the Events it accounted for, the output it produced and the [action intents](actions.md#logical-action-and-intent) it proposed all describe one decision the Runtime made; accepting some of them would produce a record in which the Runtime appears to have acted on input it never saw, or to have requested work that its own saved state knows nothing about. So the rule is all or nothing: a rejected proposal advances none of those facts.

The four next steps say what should happen to the Execution, and each means something the others do not:

- `continue` — there is more to do and nothing to wait for. The Execution becomes eligible for another Activation right away.
- `await` — the Runtime cannot go further until something the Kernel can observe arrives. The proposal carries the [wait](#wait-subscription-and-generation) that says what.
- `complete` — the work is finished, with a result. This is a claim the Kernel checks rather than takes on trust; [completion is an accounting check](../mechanisms/lifecycle.md#completion-is-an-accounting-check) says what it is checked against.
- `fail` — the work ended without a result. Like completion, it ends this logical lifetime and does not by itself say anything about work still running elsewhere.

Several things that travel between Kernel and Runtime are emphatically not Outcomes. Dispatch acknowledgments, heartbeats, cancellation signals and diagnostic or streaming output are [operational traffic](../mechanisms/execution-cycle.md#before-sending): useful, sometimes necessary, and incapable of writing progress. One Activation is answered by at most one accepted Outcome, and everything else that flows across the boundary is a report about the exchange rather than a move within it.

## Event

An Outcome often ends by asking for something the Runtime cannot produce by itself: an editor's answer, a service's result, a reply from another Execution. What eventually arrives is an Event.

An **Event** is an immutable accepted observation addressed to an Execution. It has [identity](identity.md#request-key-and-input-id), a destination, a kind, a payload and trusted ingress provenance; <!-- TODO: give trusted ingress provenance its own defining section --> correlation is included when needed.

"Accepted" is doing real work in that sentence. Things arrive at a system constantly; an Event is what one of those arrivals becomes once the Kernel has authenticated its path, checked it and recorded it. Something refused at ingress never becomes an Event at all — it is not a rejected Event, it is nothing. This is why an Event can be treated as fact everywhere downstream: by the time any other rule mentions one, the question of whether to believe it has already been answered.

Once accepted, an Event takes its place in that Execution's own [accepted order](identity.md#acceptance-boundary-and-receipt). That order is local and says nothing about another Execution's order, and nothing about which of two independent deliveries "really" happened first. There is no global clock here, and asking for one would mean promising an ordering the Kernel cannot observe.

Every Event also has a **source category**, which comes from the trusted path that accepted or minted it: application input, a Kernel timeout, or another trusted result or routed observation. The category is decided by the ingress path and never by the payload. A payload that describes itself as a settlement does not become one, and a kind string can be spelled any way the sender likes without changing anything.

That rule reads like bureaucratic caution until you see what it protects. [Wait eligibility](../mechanisms/waits.md#eligibility-comes-from-trusted-source-category) — which arriving Events are allowed to wake a paused Execution — is decided by source category. Application input is untrusted and freely shaped: anyone who learned a correlation identifier could compose input that looks exactly like a service's settlement. If eligibility were decided by what a payload claimed about itself, that imitation would work. Deciding by the path it came in on keeps the two apart even when the payloads are identical.

## Mailbox

Accepted Events do not go straight into an Activation. They wait in the mailbox until the Kernel pins some of them into a batch.

The **mailbox** is the accepted Events addressed to an Execution, each with an independent processing disposition.

The independence of those dispositions is the design decision, and the alternative it rules out is the one most systems reach for first: a single cursor, a position meaning "everything before here has been handled." A cursor is compact and wrong, because the Events addressed to an Execution are not uniformly relevant to it. An Execution waiting for a publication result may be sent an unrelated correction; a batch is bounded and may not carry everything queued. Under a cursor, moving past the Event the Runtime did use silently marks the ones it did not as handled. Per-entry disposition makes that impossible: an Event that was never carried to the Runtime is still visibly unacknowledged, however much has happened around it.

The same property is what lets an early result survive. Suppose the service publishes the report and answers while the Execution is still busy computing, before it has even declared that it is waiting for that answer. The result is accepted and sits in the mailbox; when the Runtime later says it is waiting for exactly that, the answer is already there. Nothing is lost because something newer arrived after it, and nothing had to be replayed to notice it.

The mailbox is not a transport queue and not a delivery mechanism. It is the accepted record of what has been addressed to this Execution, which is why it survives restarts in a deployment whose storage does, and why reading it changes nothing. Which Events leave it and when is decided by [batch selection](../mechanisms/waits.md#selecting-the-batch).

## Batch, reservation and acknowledgment

Three terms cover one Event's passage from the mailbox into an Activation and out again, and they are separated because each names a different moment with different consequences.

A **batch** is the finite, enumerable set of accepted Event references pinned in one Activation. Finite and enumerable, rather than "everything since position N": the Activation carries a set the Kernel can list, and a later Outcome can be checked against it exactly.

**Reservation** is the Kernel decision that fixes that batch as part of dispatch intent. The implementation picks a finite bound of at least one — a bound of zero would dispatch a Runtime that cannot learn why it was activated — but an ordinary continuation can still carry an empty batch, which is correct when the Runtime was asked to keep going rather than to read something. Which Events a batch carries is decided by [the batch selection rules](../mechanisms/waits.md#selecting-the-batch), not by arrival order alone.

Reservation acknowledges nothing, and that separation is what makes a crash between dispatch and answer survivable. Reserving records the Kernel's intent to send these exact Events; if the sending fails, or the host dies, or the Runtime never answers, those Events are still unacknowledged and the same exchange can be delivered again unchanged. Had reservation counted as acknowledgment, the Events would look accounted for by a Runtime that never saw them.

**Acknowledgment** records that the Runtime accounted for an Event. An accepted Outcome acknowledges the whole reserved batch, not only the members the Runtime happened to use.

Whole-batch acknowledgment sounds blunt, and it follows from a distinction worth making explicit. Two different questions hide inside "did the Runtime handle this Event?" One is *accounting*: has the Runtime taken this Event into its accepted state? The Kernel answers that, and only that, by accepting the Outcome. The other is *compliance*: did the Runtime do what the Event asked? The Kernel does not answer that at all, because it cannot — judging compliance would mean reading progress it does not interpret, or parsing a model's prose, and being wrong about either would be worse than not answering.

So a Runtime that does not want to act on an Event yet has two honest options, both recorded in its own progress: carry the Event forward, for example as `{phase: "draft", pendingCorrection: eventId}`, or record a decision to refuse what the Event asked for. Neither changes the Event's acknowledgment. It is accounted for either way, and there is no separate per-Event "rejected" disposition for the Kernel to record.

That leaves exactly two dispositions an Event can end up with, and no others. **Acknowledgment** is one. A **terminal disposition** is the other: it records that the Execution [ended](../mechanisms/lifecycle.md) before this input was processed. A terminal disposition must not masquerade as acknowledgment, because the two describe opposite situations — one says the Runtime accounted for this, the other says nobody ever will.

## Wait, subscription and generation

When a Runtime cannot continue until something arrives, its Outcome says so. Three terms describe that pause: what it declares, the identity of one declaration, and the rules that decide what matches.

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

The word "Kernel-visible" in the definition draws the boundary that gives waits their meaning. A wait is not "the Runtime is blocked" — it is "the Runtime has told the Kernel it needs something the Kernel can actually observe and deliver." A Runtime awaiting its own model API is not waiting in this sense at all; that call is not mediated, the Kernel was never asked to coordinate it, and it has no record of it. The practical consequence is that `WAITING` is the Kernel's bookkeeping about dispatch and not a report about a process: it means the Kernel will not send another Activation until the declared observation arrives.

A **generation** belongs to the wait, not to the work being awaited, and that is the distinction this term exists to make. If the Runtime registers a similar wait again later, that is a new generation even though the publication it is waiting on is the same external thing. Generations identify registrations so that artifacts created for one — a timer, above all — can be recognized as belonging to a registration that has since been retired and replaced. Without that, a timer set for an earlier, long-finished wait could expire and appear to answer the current one. [Ending a wait](../mechanisms/waits.md#ending-a-wait) owns retirement and the fencing that depends on it.

## Readiness

**Readiness** is accepted state from which a scheduler can reconstruct the need for dispatch.

The concept exists because waking and dispatching are two different moments with a gap between them. An Event arrives and ends a wait at one instant; the Activation that carries it is prepared at another, possibly after a restart, possibly on another worker. Something has to carry "this Execution now needs to be dispatched, and here is why" across that gap. Making it *accepted state* rather than an in-memory note or a queue entry is what lets the gap include a crash: the reason survives with everything else the Kernel accepted, and no wake is lost because a notification was.

**Wait-ended readiness** is the one-dispatch selection information retained when a wait ends: the retired selector and, for expiry, its mandatory [timeout Event](#timeout-event).

Retaining the retired selector is what stops an Execution from being woken for one thing and then handed something else. Once a wait has ended, the wait itself is gone — but the next batch still has to be assembled under the rule that wait spelled out, so the Events the Execution was actually waiting for travel rather than whatever backlog happens to be oldest. Readiness is how that rule outlives the registration that wrote it.

A **selector** retires when a matching Event is accepted — one already queued when the wait was registered, or one arriving while the Execution is waiting — or when the deadline expires. Retirement is a property of readiness, not another addressable object and not a live wait. There is nothing to send to a retired selector and nothing to inspect that would answer "is this dependency still outstanding"; if the Runtime still needs something, its next Outcome says so again.

Readiness is consumed by the one dispatch it describes. It does not accumulate, does not span two exchanges, and does not re-arm on redelivery or takeover, because those reuse the batch that was already pinned. [Selecting the batch](../mechanisms/waits.md#selecting-the-batch) owns how a readiness becomes an actual batch, and [the small distinguishing examples](../mechanisms/waits.md#small-distinguishing-examples) there are worth reading once, because several plausible-sounding selection rules produce the wrong answer in cases a single example does not separate.

## Timeout Event

A **timeout Event** is a Kernel-minted observation that one wait generation expired. It has stable Event identity, a destination, a distinct timeout class, exact generation correlation and trusted timer provenance.

It is an Event, and that is a design decision rather than a formality. Every member of a batch is an accepted Event — one kind of member, not two — so the object that tells a Runtime "your deadline passed" has to be an Event too, or batches would need a second kind of member with its own acknowledgment rules, its own disposition and its own place in the accepted order. Minting it as an ordinary Event means it is acknowledged, disposed and ordered exactly like every other member, and nothing about batches needs a special case.

It is carried as a mandatory next-batch member rather than selected by a dependency alternative or a subscription. Nothing matches it, and nothing needs to: the Kernel knows which wait expired because it minted the timeout for that generation, and correlating the Event to the generation is what makes a timer for a superseded registration recognizable as stale. [Wait expiry](../mechanisms/waits.md#ending-a-wait) owns its creation, including the rule that one generation produces at most one timeout however many times a timer fires.

A timeout Event says that a deadline passed, and nothing else. In particular it says nothing about whether the external work succeeded. If the report's publication had a deadline that expired, the publication may have succeeded a moment later, may have failed, or may be in an unknown state that only [settlement or reconciliation](actions.md#settlement-and-reconciliation) can resolve. The wait ended; the world did not report in. Treating expiry as evidence of failure is how a system comes to record a confident answer it never actually obtained — and the [three clocks](operations.md#three-clocks) section makes the same point about the other two deadlines an Execution lives under, each of which expires for its own unrelated reason.
