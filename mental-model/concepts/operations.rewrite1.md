# Operational and communication terms

The [core vocabulary](core.md) describes what the [Kernel](core.md#kernel) decides. This page describes what the world does with those decisions.

That distinction is the whole reason the page exists. The Kernel accepts an [Outcome](core.md#outcome) atomically, and whether that acceptance survives a power cut is a different question with a different answer. The Kernel accepts a cancellation, and whether the container running the work actually stopped is a different question again. The Kernel authorizes a mediated action, and whether the code could have taken that action anyway, without asking, is a third. Each of those gaps between a decision and the world is real, and each has a word here to name it — because a gap without a name gets silently assumed shut.

Three families live on this page, and they are genuinely independent of one another:

- **Where code runs and what it may touch** — the process roles, the two trust modes, and the published profile that says which failures a deployment actually survives.
- **Time** — the three clocks, which expire for unrelated reasons and mean unrelated things.
- **Executions talking to each other and to observers** — children, messages, observation and the costs left over after all of it.

They share a page because none is large enough to need its own, not because they compose into a fourth thing. Reading across the families for hidden structure will find patterns that are not there: a child Execution has nothing to do with an Execution Host, and a scheduler lease has nothing to do with a routing obligation.

One warning about method before the terms themselves. Elsewhere in this vocabulary the hard words are invented — Activation, Outcome, writer epoch — and an invented word arrives in a reader's head empty, waiting to be filled. Almost every word on *this* page is one English already assigned a meaning to: worker, host, trusted, durable, clock, child, ownership, message, cursor, backpressure, debt. Each of those arrives already full, carrying assumptions from wherever the reader met it last — a thread pool, a container runtime, a process supervisor, an actor framework. Most of those assumptions are close enough to be dangerous and wrong enough to matter. So the definitions below spend as much effort on what a term does *not* carry over as on what it means.

## A first example

The weekly report from [the core vocabulary](core.md) runs in two places over its life, and watching it move is the fastest way to see what this page names.

During development it runs on one laptop, inside one process. That process performs the Kernel's transitions and also runs the report's own code, so it is both a **Kernel Worker** and an **Execution Host** at once. The report's code can open any file the developer can open, which makes it a **Trusted Execution**. Nothing is written to a database, so the deployment's published **operating profile** promises nothing about surviving a crash: kill the process and the report is gone.

In production the same report runs across a pool of Kernel Workers backed by Postgres, with the report's own code confined to a container that can reach one approved API and nothing else — an **Isolated Execution**. The profile now promises that a process crash is survivable, because the storage survives it.

Here is the part worth pausing on: between those two deployments, **nothing in the protocol changed**. The same [Activations](core.md#activation), the same Outcomes, the same [batches](core.md#batch-reservation-and-acknowledgment), the same [writer epoch](identity.md#writer-epoch) rules. What changed is which promises a reader may honestly make about them. That is exactly the first family's job — it names the things that vary while the protocol holds still.

The second family shows up as soon as the report has to wait. The report needs the editor's approval, and the editor is on holiday, so the Runtime registers a **wait deadline** of one week. The application separately insists that the whole report be finished this quarter, which is an **Execution deadline**. And whichever Kernel Worker currently holds the right to advance the report renews a thirty-second **scheduler lease** the entire time. Three numbers, three clocks, three unrelated meanings — and folding any two of them into one timer field breaks something, as the section on the three clocks shows.

The third family shows up as soon as the report stops being alone. It creates a **child Execution** to gather last quarter's figures, and owning that child means the report must account for it before it can finish. It sends a **message** to a peer Execution that already holds the headcount numbers, and gets an answer back under a **correlation** the request record made checkable. A dashboard watches the report's output through a **cursor**, resuming where it left off after the browser tab reconnects — without ever waking the report or changing anything about it. When the dashboard's reader falls behind, **backpressure** decides what gives. And when the report is cancelled halfway through, the container it was running in does not vanish on its own; what is left behind is **cleanup debt**.

Every term below appears in that paragraph. The rest of this page is what each of them actually promises.

## Where code runs and what it may touch

The Kernel, the [Execution Runtime](core.md#execution-runtime) and the [Execution Driver](core.md#execution-driver) are responsibilities. None of them is a process, and the architecture deliberately never says how many processes there are. But deployments are made of processes — things that start, crash, get restarted, hold memory, and can be scaled independently — and every sentence about restarting or scaling needs words that name those. This family supplies them, plus the two claims about physical access that no amount of protocol design can establish on its own.

### Kernel Worker

A **Kernel Worker** is a process role that performs Kernel transitions: accepting Outcomes, accepting ingress, minting [timeout Events](core.md#timeout-event), preparing [dispatches](identity.md#dispatch-and-delivery).

It exists as a separate word because "Kernel" names a set of responsibilities and nothing you can restart. Without the second word, "restart the Kernel", "scale the Kernel" and "the Kernel crashed" are all ambiguous between the responsibility and the thing hosting it — and the two behave completely differently. Killing a Kernel Worker destroys no accepted record if the deployment's storage survives; the responsibility continues in another process, which is what makes horizontal scaling coherent at all.

A Kernel Worker is not a required standalone service. It is a role that some process performs, and in the laptop deployment above, the process performing it is the developer's script. Nor does performing this role require building a scheduler, a queue or a database: [the Kernel page](../kernel.md) is explicit that owning the semantics does not mean owning the machinery.

The word *worker* is badly overloaded in this vocabulary, and the overloading is worth naming once rather than tripping over repeatedly. A Kernel Worker performs Kernel transitions. A [local or delegated worker](roles.md#local-worker) is internal work a Runtime manages inside itself, invisible to the Kernel. An Execution Host, below, runs Runtime code. These are three different things, and a sentence using the bare word *worker* is almost always underspecified — say which one.

### Execution Host

An **Execution Host** is a process role that runs Runtime code.

It is not the Runtime. The Runtime is the code and its algorithm; the Execution Host is the process that code executes inside. It is not the Driver either, though the Driver usually runs in the same place: the Driver adapts the protocol, the host supplies the CPU and the memory.

One process may perform both the Kernel Worker and the Execution Host roles, and for a great many applications that is the right answer. Two names exist anyway, because the roles fail for different reasons and get bounded by different limits. A Runtime that allocates a twelve-gigabyte tensor threatens the Execution Host; nothing about it threatens the accepted record. A storage outage stops Kernel transitions while native jobs keep running. Separating the roles into separate processes lets each be limited and restarted on its own — and the moment they *are* separate, the connection between them has to be authenticated, so neither can be impersonated by something claiming to be the other.

Splitting processes is a deployment choice with real costs, and it buys less than it appears to. A Runtime can outlive its coordinator and a coordinator can outlive its Runtime, so both directions need testing; and moving a role into another process makes nothing durable and nothing safe to repeat. [Deployment](../deployment.md#roles-are-not-required-services) owns which arrangements are sensible.

### Trusted Execution

A **Trusted Execution** is one whose Runtime intentionally holds ambient host capabilities — the filesystem, the network, the ability to start processes — and uses them directly, without asking the Kernel.

The word *trusted* here is a declaration, not an assessment. It does not mean "we looked at this code and think it is fine." It means the deployment has stated, on purpose, that this Runtime's access is not physically bounded, and that any guarantee the Kernel offers applies only to the paths that actually run through the Kernel. Read it as a scoping statement about what the architecture is claiming, and the mode stops sounding like an admission of weakness.

It is frequently the correct choice. The Driver is the clearest case: a Driver holding credentials broad enough to act for the whole service belongs in Trusted Execution precisely so those credentials never enter Runtime code that a model can steer. Choosing Trusted is not a failure to isolate; choosing it *silently* is, because a reader then assumes containment that was never built.

What must never follow from Trusted Execution is a claim that Kernel authority prevents native action. It does not, and it was never designed to: the Kernel governs [mediated](actions.md#exposure-and-mediation) paths, and a Trusted Runtime is by definition also holding an unmediated one.

### Isolated Execution

An **Isolated Execution** is one whose Runtime is physically restricted in what it can reach, under a threat model the deployment has declared and tested.

Two properties of that definition carry all of its weight, and both are routinely lost.

The first is that a threat model can permit things. Isolation is not a synonym for "reaches nothing." An isolated profile may deliberately allow one approved external API, one mounted directory, one egress host. What isolation bounds is *reach*; what the Kernel's [admission](actions.md#admission-and-physical-action-attempt) bounds is what may be done with a reach that exists. The two are independent in both directions, and the pair of counterexamples is worth memorizing: a perfectly isolated Execution can still make an unmediated native call inside what it is permitted to reach, and a perfectly mediated Execution may have no isolation at all.

The second is that this term, alone among the terms on these pages, cannot be earned by writing a design. A container image, an orchestration label, a sandbox dependency in a manifest, a policy document — none of them is evidence that anything is restricted, because none of them is an attempt that failed. The word *Isolated* is therefore a claim about a test result, and a deployment with no such result has a Trusted profile whatever its manifest says. [Containment claims](../mechanisms/resources.md#containment-claims) owns what an isolated profile has to have tested and what counts as passing.

Telemetry deserves its own sentence, because it is the most common thing offered in place of both isolation and mediation. Observing that a Runtime made a call, logging it, scanning its prompts, alerting on it afterwards — all of that is evidence about the past and none of it is prevention. A record that something happened is the opposite of the thing not happening.

### Operating profile and durability

An **operating/support profile** is a deployment's published statement of what it was tested against and what it therefore promises: supported storage, Runtime and host versions; assumed failure modes; available recovery modes; capacity limits; retention windows; and who is responsible for cleanup.

The profile exists because every other guarantee on these pages is conditional on one, and leaving the condition implicit is how a correct architecture produces a false promise. The Kernel commits an Outcome's progress, acknowledgments, [emissions](actions.md#emission-result-and-output-obligation) and action intents as one atomic decision — but atomicity by itself stores nothing. It guarantees that the accepted state is coherent rather than half-applied. Whether that coherent state is still there tomorrow is decided entirely by the profile's storage, which is why the in-memory laptop deployment and the Postgres deployment run identical protocol logic and make completely different promises.

**Durable** is the word for a claim of that shape, and it has three parts, none of which may be left out: *which* facts survive, *which* failures they survive, and *for how long*. "Durable" with no failure named and no period named cannot be checked, which means it cannot be wrong, which means it is not a promise. And the parts have to stay honest about their own edges — the first persistent profile covers process failure with surviving storage, and that is all. A destroyed disk is not covered. Another data centre is not covered. Mutually distrusting tenants sharing one deployment are not covered.

Retention belongs to the profile for the same reason. A deployment that keeps accepted output, receipts and action evidence forever has an unbounded cost; one that deletes them silently has a correctness problem, because a reader cannot distinguish "this never happened" from "the evidence expired." The resolution is a published period with explicit behaviour at its edges, owned by [retention and deletion](../mechanisms/evidence.md#retention-and-deletion).

[Deployment](../deployment.md) describes the three profile shapes and what each may honestly claim. What belongs here is only the vocabulary: a profile is a published claim, and *durable* is a three-part promise rather than an adjective.

## Time

Three different questions in this architecture have a time limit, and each is answered by its own clock. They expire for unrelated reasons, their expiries mean unrelated things, and they must never share a timer or a field.

### Three clocks

| Clock | Exact purpose | Expiry consequence |
|---|---|---|
| Wait deadline | Bound one wait registration | End that wait and produce a [timeout Event](core.md#timeout-event) |
| Execution deadline | Bound the logical Execution lifetime | Enter ordered [cancellation](../mechanisms/lifecycle.md#cancellation-order) |
| Scheduler lease | Bound a worker's exclusive claim | Trigger recovery inspection and reassignment eligibility |

The report makes the case for keeping them apart better than an argument does. Its wait for the editor is measured in days. Its Execution deadline is measured in months. Its scheduler lease is measured in seconds, renewed continuously by whichever Kernel Worker currently holds the claim. Collapse those into one "timeout" field and one of two things breaks immediately: either the editor's week-long wait expires every thirty seconds, or a dead worker's exclusive claim stands unchallenged for a week while nothing advances the report.

Each clock also fails differently, and the three non-inferences below are the ones that cause real defects.

**A wait deadline expiring proves that one [wait](core.md#wait-subscription-and-generation) generation expired, and nothing else.** It does not prove that the editor refused, that the publication service failed, or that the external work is dead. What it produces is an ordinary Event, carried as a mandatory member of the next batch, saying that this generation is over — and [ending a wait](../mechanisms/waits.md#ending-a-wait) owns what the Runtime may conclude from it. The Runtime decides what expiry means, because the Kernel has no way to know.

**An Execution deadline expiring is a cancellation, not a wake.** It runs through the same control path as an application's cancellation request, which means it is ordered against [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) in the same way, with the same unambiguous referee: whichever decision the Kernel accepted first wins outright. It does not gently end a wait and let the Runtime continue.

**A scheduler lease expiring proves that time passed.** It bounds a claim, not a process. A lease lapses because nobody renewed it, which is equally consistent with a dead worker and a slow one still writing — so the expiry makes recovery inspection and reassignment *eligible*, and decides nothing by itself. Two further things it does not do: it does not move the [writer epoch](identity.md#writer-epoch), which only an accepted takeover moves; and it does not license replacing native work, because [deciding permission before replacing work](../mechanisms/recovery.md#decide-permission-before-replacing-work) needs a guarantee from the Driver that a lapsed timer cannot supply. Treating either signal as proof is a guess about a process that may still be running, and [shared mutation](../mechanisms/resources.md#shared-mutation) owns what a wrong guess costs.

How these clocks are spelled — their units, their precision, where the instant comes from, and how a lease is renewed — is left to an implementation. The architecture fixes only that there are three of them, that they mean different things, and that no implementation may serve two of them from one field.

<!-- OPEN(unassigned): clock units, precision, the instant source, and the lease renewal mechanism. All four are deliberately implementation-owned rather than awaiting an owner; the architecture fixes only the three clocks' separate identities and expiry consequences. The durations used in this section (a week, a quarter, thirty seconds) are illustrative and fix no unit, precision or renewal interval. If an owner ever fixes a representation: restate this paragraph in those terms and delete this marker. rewrite-index.md §4 -->

## Executions talking to each other and to observers

An Execution that never reaches outside itself needs none of the words below. As soon as it creates a child, sends a message, or is watched by a dashboard, three relationships appear — and the single most useful fact about them is that they are **three independent axes**:

- **Ownership** is responsibility for required work.
- **Communication** is addressed input travelling between Executions.
- **Waiting** is a declared dependency that the Kernel can see.

They cross each other freely. A parent can own a child it is not waiting for, and wait for a peer it does not own; two Executions can wait on each other in a cycle while neither owns the other. Drawing one of the three edges tells you nothing about whether the other two are there — and none of them, on its own, is a permission. Nearly every confusion in this family starts by reading one edge as if it implied another.

### Child and ownership

A **child Execution** is an ordinary [Execution](core.md#execution) created by another one. It gets its own ID, its own [mailbox](core.md#mailbox), its own authority binding and its own lifecycle — the same as any Execution the application created directly. Nothing about being a child makes it a lesser kind of thing.

That is the first boundary to draw, because the obvious reading of "child" is a subroutine, and a subroutine is the one thing it is not. What a child buys is separation — a second lifetime the Kernel can address, authorize, recover and inspect on its own — and what it costs is that second lifetime, which someone now has to coordinate and account for. Work that merely needs to run in parallel, or inside some other framework, has bought nothing with that cost: a Runtime can hold [parallel branches and delegated workers](roles.md#stage-and-local-branch) inside itself, and those internal structures have no Kernel mailbox, authority or lifecycle at all. [Children](../mechanisms/communication.md#children) owns the test for when the separation is worth it.

**Ownership** is responsibility for required work, and not universal access. Both halves are load-bearing. The responsibility half means the parent must account for the child before it can [complete](../mechanisms/lifecycle.md#completion-is-an-accounting-check) — a parent that has forgotten about a child it spawned cannot finish by declaring success. The access half is what ownership does *not* include: a parent does not get to read the child's [working notes](state.md#working-notes), its mailbox, or its credentials by virtue of being its parent. What a child receives and what a parent may see are disclosure decisions with their own owner in [handoff and observation](../mechanisms/communication.md#handoff-and-observation). Ancestry is responsibility, not permission.

**Required work** stays an obligation until one of exactly three things happens to it: this Execution accounts for it, a named durable owner explicitly accepts it, or an explicit policy decision abandons it. Reaching a terminal state is not one of the three. Cancelling the report does not discharge what the report still owed; it records a terminal result while the obligation, and its evidence, keep their owner.

Two helper shapes get their own names because the difference between them is the one most often misread:

- A **call** combines creating a child with handling its terminal result as required work.
- A **spawn** omits the immediate waiting. It does not omit the responsibility.

"Fire and forget" is the wrong picture for spawn, and it is the exact picture the word invites. A spawned child is still owned and still required. What spawn buys is that the parent need not stop and wait right now; what it does not buy is any reduction in what the parent remains answerable for.

**Detachment** is the operation that genuinely transfers responsibility, and it needs a named durable owner that has accepted it. A child is not that owner — the child is the work, not the party taking responsibility for it. Because a transfer with nobody on the receiving end is indistinguishable from dropping the obligation, the minimum profile may refuse arbitrary detachment outright rather than pretend to perform it.

**Supervision** is the policy that decides what happens when a child fails. The word names a decision the application or the Runtime has to make and declare — not a behaviour the Kernel supplies on its own, and emphatically not something ancestry decides. Ancestry implies neither cascade kill nor immunity: a child's failure does not automatically fail its parent, and a parent's failure does not automatically stop its children, which is why a failed parent leaves live children to application reconciliation rather than to a rule. [Finite expansion and supervision](../mechanisms/communication.md#finite-expansion-and-supervision) owns the declarable policies and the credits that keep recursive creation from running away.

### Message, request and correlation

A **message** is input one Execution addresses to a peer that already exists.

The difference from a child is a difference in what the sender got to decide. A parent fixes its child's code, input and delegated authority at the moment of creation, because the child did not exist until then. A peer's lifetime, mailbox and current dependencies were all settled before the sender showed up, and the sender has no say over any of them. A send therefore promises far less than a call does, and the next paragraph is exactly how much less.

What a send promises, exactly, is **destination-mailbox acceptance**. The message became an accepted [Event](core.md#event) in the destination's mailbox. That is the whole promise, and four things it deliberately excludes are worth stating flatly: it does not promise the destination processed the message, it does not promise a reply, it does not promise the destination *noticed*, and it does not promise anything about timing. Delivery and attention are different achievements — whether an arriving Event wakes anything depends entirely on what the destination is waiting for, and a message that matches no dependency sits in the mailbox until something asks for it.

A **request/reply record** is the durable object that makes a reply checkable. Without one, "this is a reply to that" is a claim on the wire with nothing behind it; with one, there is a specific open question, with a specific eligible responder, that an arriving reply either matches or does not. [Addressed messages and replies](../mechanisms/communication.md#addressed-messages-and-replies) owns what makes a particular reply valid and what happens to the ones that are not.

**Correlation** is an identifier that links related facts — a reply to its request, a result to the wait generation that asked for it, a child's outcome to the parent that owns it. Its single most important property is negative: **knowing a correlation identifier is not permission to use it.** A correlation identifier is a label, not a bearer token, and a caller holding one has exactly the authority it had before it learned the number. Guessable identifiers must not become a way to inject a reply into somebody else's conversation, which is why the responder is authenticated separately and why [content is never authority](../mechanisms/authority.md#content-is-not-authority).

A **human input request** is a durable question put to a person, with one owner and one path back into the Execution.

It gets its own term rather than being modelled as a slow service call, because a person differs from a service in the ways that break naive designs. The answer may come in seconds or next week or never. The process holding the question will very probably restart in between. And the same question must never turn into two forms that can each independently resume the run. Making the request a durable object with a single resume owner is what resolves all three at once: restart reconstructs the same request, showing the form again costs nothing because the form is a *view* of the request rather than the request itself, and answering twice is refused by the request's own closure.

One boundary closes the term, and it is the one most worth stating flatly: an answer is an observation. It is not [exact consent](actions.md#exact-consent), which binds one named person's yes to one unchangeable action under a pinned operation version. It is not [settlement](actions.md#settlement-and-reconciliation), which is trusted evidence about what an action actually did. A person typing "yes, looks good" into a text box has produced input, and input is all it is. [Human input requests](../mechanisms/communication.md#human-input-requests) owns the mechanism, including what a restart is allowed to show that person again.

### Observation, cursor and routing

**Output observation** is an authorized read of an Execution's accepted output.

The rule that makes observation coherent, and the reason it is grouped with routing rather than with messages, is this: **observation does not send input.** A dashboard draining the report's [Emissions](actions.md#emission-result-and-output-obligation) changes nothing about the report — not its mailbox, not its wait, not its progress, not its [readiness](core.md#readiness). A parent reading its child's output is in exactly the same position: it learns something, and the child does not find out. When the report's progress genuinely needs to reach another Execution, that takes an explicit message or an application bridge with both read permission and destination send authority — reading is never quietly upgraded into sending. [Observation does not send input](../mechanisms/output.md#observation-does-not-send-input) owns the rule and the bridge's obligations.

An **output cursor** identifies an Execution and output [view](roles.md#view-and-disclosure) together with a position in it. It exists so a reader that disconnects can come back without missing or repeating output, which is an ordinary requirement for any UI attached to work that runs for days.

A cursor is a position and never an authority. Holding one is not permission to keep reading, so a reconnecting reader is authorized afresh rather than on the strength of the cursor it presents — otherwise a revoked reader could keep reading by simply never throwing away the position it already had. If a view changed such that its old position can no longer be safely resumed, the right answer is to rebind or refuse explicitly, never to quietly return a filtered stream that looks continuous. [Authorized subscriptions and replay](../mechanisms/output.md#authorized-subscriptions-and-replay) owns resumption, and [bounded retention](../mechanisms/output.md#bounded-retention) owns what happens once a position has aged past the promised window: an explicit expired-cursor answer, never a successful-looking empty stream.

A **routing obligation** is an accepted duty to deliver a fact to a destination later.

It is the thing that makes a cross-Execution hand-off survivable when the two sides cannot commit in one transaction — the child's terminal result has to reach the parent, and something durable has to hold that duty across a restart. What makes the term worth defining precisely is what it is *not*: an obligation is not destination acceptance. The source promising to deliver and the destination's mailbox actually holding an Event are two different facts, and only the second one can wake anything. A child's routing obligation alone never wakes its parent; the parent's readiness starts when the destination Event exists. Retrying a routing obligation is also not re-running the work — a redelivered result is the same result, not a second execution of the child.

### Backpressure and cleanup debt

The last two terms name costs. Both describe something accumulating under somebody's name while every individual decision looked locally fine, which is why they need words at all — an unnamed cost has no owner.

**Backpressure** is what a system does when a consumer cannot keep up with what it is being given.

The report's dashboard is the concrete case: a browser on a bad connection reading Emissions more slowly than the report produces them. The permitted responses are to buffer within a bound, or to disconnect the reader and hand it a resumable cursor and an honest gap. Two responses are forbidden, and they are the two that happen by default when nobody decides. A slow consumer may not pin accepted records indefinitely, turning one stalled browser tab into unbounded storage. And a slow consumer may not block the Runtime's progress, turning a reader into something that can halt the work it is merely watching.

At the producing end the same pressure meets a harder rule, because that end is where a promise gets made rather than merely kept. An accepted Outcome commits an [output obligation](actions.md#emission-result-and-output-obligation) along with everything else in it, so a deployment that cannot store what it is about to promise has to decline *before* the commit rather than discard afterwards — and [bounded retention](../mechanisms/output.md#bounded-retention) owns where that line sits.

**Cleanup debt** is work, cost or storage still owed after a logical decision has already been recorded.

Cancel the report and the Kernel's record reaches a terminal state immediately. Meanwhile the container is still running, the provider is still holding a slot, the model call already in flight will still be billed, the workspace is still allocated, and the publication request that was already sent may still go through. None of that is a bug in cancellation. It is the ordinary consequence of the Kernel deciding what has been accepted while a world outside it keeps its own state — and cleanup debt is the name for the remainder.

The inference to refuse is the comfortable one: **a terminal Execution state does not mean the debt disappeared, and it does not mean the remote work stopped.** Logical cancellation, native interruption and physical cleanup are three separate things that can each succeed or fail on their own, and a remote job can outlive the host that started it. What the architecture asks for is not a guarantee that cleanup happened — it cannot offer one — but that the remainder is recorded with an owner and a deadline instead of being assumed away. Deleting resources that admitted work or reconciliation still needs is equally wrong in the other direction, and [release is not destruction](state.md#resource-binding-and-attachment): closing a client ends an attachment and leaves the backing resource exactly where it was. [Capacity, cancellation and retention](../mechanisms/resources.md#capacity-cancellation-and-retention) owns how these costs are measured and bounded.

That closing note generalizes to the whole page. Every term here sits at a place where a Kernel decision meets a world that did not necessarily obey it — a crash the storage may not survive, a native call the authority never saw, a timer that proves less than it looks, a container that outlives its cancellation. The Kernel's job is to be exact about what it accepted. This vocabulary's job is to keep anyone from reading that exactness as a claim about everything else.
