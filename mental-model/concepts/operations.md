# Operational and communication terms

The [core vocabulary](core.md) names what the [Kernel](core.md#kernel) decides. This page names what happens to those decisions once they leave the Kernel.

The gap between the two is real, and it is the reason this page exists. The Kernel accepts an [Outcome](core.md#outcome) atomically; whether that acceptance survives a power cut is a separate question with a separate answer. The Kernel accepts a cancellation; whether the container running the work actually stopped is another. The Kernel authorizes a mediated action; whether the code could have taken that action anyway, without asking, is a third. Each of these gaps gets a word here, because a gap without a name is quietly assumed to be shut.

The terms fall into three families:

- **Where code runs and what it may touch** — two process roles, two trust modes, and the published profile that says which failures a deployment actually survives.
- **Time** — three clocks that expire for unrelated reasons and mean unrelated things.
- **Executions talking to each other and to observers** — children, messages, observation, and the costs left over afterwards.

They share a page because none is large enough to carry its own, not because they add up to something. Do not look for structure across them: knowing what a scheduler lease bounds tells you nothing about what a routing obligation is. The things themselves interact all the time: a child Execution runs on an Execution Host like any other. But the *definitions* do not build on one another, so the three families can be read in any order.

## A first example

The application that produces the weekly report from the [core vocabulary](core.md) is deployed twice — once on the laptop it is written on, once in production. Watching a report [Execution](core.md#execution) run under each puts most of the terms on this page to work. They are two different Executions, one per deployment; nothing here moves between them.

On the developer's laptop the application runs as a single process. That process performs the Kernel's transitions and also runs the report's own code, so it is both a **Kernel Worker** and an **Execution Host**. The report's code can open any file the developer can open: it is a **Trusted Execution**. Nothing is written to a database, so this deployment's **operating profile** promises nothing about surviving a crash. Kill the process and the report is gone.

In production the same application runs across a pool of Kernel Workers backed by Postgres, and a report's code is confined to a container that can reach one approved API and nothing else — an **Isolated Execution**. The laptop's profile could promise nothing about surviving a crash; production's profile can: a report's accepted state outlives the process that was advancing it, because the storage does.

Between the two deployments, nothing in the protocol changed: the same [Activations](core.md#activation), Outcomes, [batches](core.md#batch-reservation-and-acknowledgment) and [writer epoch](identity.md#writer-epoch) rules, running the same [Definition](core.md#definition). What changed is which promises can honestly be made about them. Naming the things that vary while the protocol holds still is the first family's job.

Take the production deployment for the rest of the tour. The second family appears as soon as a report has to wait. The editor is on holiday, so the Runtime declares a wait with a one-week **wait deadline**, which the Kernel registers when it accepts the Outcome carrying it. The application separately insists the report be finished this quarter — an **Execution deadline**. Both of those persist for as long as they say, whether or not anyone is touching the report. The **scheduler lease** does not: it exists only in the moments some process is actually advancing the report, and lasts thirty seconds each time. Three numbers, three clocks, three meanings — two of them standing durations, one of them a claim that comes and goes.

The third family appears as soon as the report stops being alone. It creates a **child Execution** to gather last quarter's figures, and **owning** that child means the report must account for it before it can finish. It sends a **message** to a peer Execution that already holds the headcount numbers, and matches the answer to its question through a **correlation**. A dashboard follows the report's output through a **cursor**, resuming where it left off when the browser tab reconnects — without waking the report or changing anything about it. When the dashboard's reader falls behind, **backpressure** decides what gives. And when the report is cancelled halfway through, the container it was running in does not vanish on its own; what remains is **cleanup debt**.

The rest of this page says what each of those words actually promises, and adds the few the report has not needed yet.

## Where code runs and what it may touch

The Kernel, the [Execution Runtime](core.md#execution-runtime) and the [Execution Driver](core.md#execution-driver) are responsibilities. None of them is a process, and the architecture deliberately never says how many processes there are. But deployments are made of processes — things that start, crash, restart, hold memory and scale — and every sentence about restarting or scaling needs words for them. The first two terms supply those words. The next two name the one fact no protocol can establish for itself: what a Runtime can physically reach. The last term is the sheet where a deployment writes down which guarantees it is actually making. Three of the five — *trusted*, *isolated*, *durable* — are words that sound like reassurances, and a reassurance is exactly what none of them is here. Each names a claim somebody has to be able to check, which is why the sections below spend most of their length on what would count as evidence.

### Kernel Worker

A **Kernel Worker** is a process role that performs Kernel transitions: accepting Outcomes, accepting ingress, minting [timeout Events](core.md#timeout-event), preparing [dispatches](identity.md#dispatch-and-delivery).

*Role*, not *service*, is the important word. "Kernel" names a set of responsibilities and nothing you can restart, so without a second word, "restart the Kernel" and "the Kernel crashed" are ambiguous between the responsibility and the process hosting it — and the two behave completely differently. Killing a Kernel Worker destroys no accepted record if the deployment's storage survives; the responsibility simply continues in another process that can reach the same records. That is what makes horizontal scaling coherent — given a shared store and an agreement about who may advance what — and it raises the obvious next question: if the responsibility can move between processes, what stops two of them advancing the same Execution at once? A [scheduler lease](#three-clocks) bounds one process's claim to be the one advancing it. But a lease is a scheduling device, and it is not what decides which answer commits. That is the [writer epoch](identity.md#writer-epoch)'s job, and running the two together is an expensive mistake.

A Kernel Worker is not a required standalone service. In the laptop deployment, the process performing the role is the developer's script. Nor does performing the role require building a scheduler, a queue or a database: [the Kernel page](../kernel.md) is explicit that owning the semantics does not mean owning the machinery.

*Worker* is badly overloaded in this vocabulary, and it is better to say so once than trip over it repeatedly. A Kernel Worker performs Kernel transitions. A [local or delegated worker](roles.md#local-worker) is internal work a Runtime manages inside itself, invisible to the Kernel. An Execution Host, next, runs Runtime code. A sentence using the bare word *worker* is almost always underspecified — say which one.

### Execution Host

An **Execution Host** is a process role that runs Runtime code.

It is not the Runtime: the Runtime is the code and its algorithm, the host is the process the code executes inside. It is not the Driver either, though the two may share a process: the Driver adapts the protocol, the host supplies the CPU and memory. They may equally be kept apart, and a deployment that wants its adapter outside the Runtime's isolation boundary will keep them apart on purpose. Where no host of your own fits, a remote provider's service can play the part, reached through an adapter — the work runs on someone else's machines, but it is still Runtime code running somewhere.

One process may be both Kernel Worker and Execution Host, and for many applications that is the right answer. Sharing is cheap, and it is also shared fate: a process that dies takes both roles with it. Two names exist anyway because the roles fail for different reasons and are bounded by different limits. Separate them into two processes and the difference is visible. Runtime code that tries to allocate twelve gigabytes exhausts the Execution Host's memory and kills that process — while the accepted record, which lives in storage the Kernel Worker owns, sits untouched. That holds only as far as something enforces it: two processes on one machine share that machine's memory, so the separation is real when the host imposes a limit per process, and decorative when it does not. A storage outage does the reverse: Kernel transitions stop while native jobs carry on running, unaware. Keeping the roles apart is what lets each be limited and restarted alone — and the moment they run as separate services rather than as two processes of one application, the connection between them has to be authenticated, so neither can be impersonated.

Put both roles in one process with nothing persistent behind it and those two failures collapse into one. The same allocation kills the single process, and the accepted record goes with it, because it never lived anywhere except that process's memory. Note what decided that: not the roles, which behaved exactly as before, but the deployment's choice to colocate them and keep no storage. It is a property of the profile.

Splitting buys less than it appears to. It makes nothing durable and nothing idempotent; it only moves where a failure lands. And it doubles the failure cases to test, because a Runtime can now outlive its Kernel Worker and a Kernel Worker can outlive its Runtime. [Deployment](../deployment.md#roles-are-not-required-services) owns which arrangements are sensible.

### Trusted Execution

A **Trusted Execution** is one whose Runtime intentionally holds ambient host capabilities — filesystem, network, the ability to start processes — and uses them directly, without asking the Kernel.

*Trusted* is a declaration, not an assessment. It does not mean "we reviewed this code and think it is fine." It means the deployment has stated, on purpose, that this Runtime's reach is not physically bounded, and that the Kernel's guarantees apply only to the [mediated paths](actions.md#exposure-and-mediation) that actually run through the Kernel. Read as a scoping statement, the mode stops sounding like an admission of weakness.

It is frequently the correct choice: a personal CLI tool, a single-tenant backend whose Runtime was written by the same team. Choosing Trusted is not a failure to isolate; choosing it *silently* is, because a reader then assumes containment that was never built.

One piece of code is worth naming here, because it has no mode of its own: *Trusted* and *Isolated* classify an Execution's Runtime, never a [Driver](core.md#execution-driver). A Driver holds whatever powers the deployment handed it. So the rule the modes supply is a boundary rather than a placement. A credential broad enough to act for the whole service — as opposed to a narrow per-request token — stays out of isolated Runtime code. Isolation bounds what that code can reach, and such a credential hands the reach straight back. Which component does hold it is something the deployment writes down, in the Driver's [support record](../mechanisms/integration.md#support-record) and its own [containment claims](../mechanisms/resources.md#containment-claims), rather than something either mode decides.

Two things do not turn Trusted into something stronger. An interface contract does not: an interface tells cooperating code how it is meant to be called, and hostile, compromised or merely buggy code in the same process, holding the same credentials, is under no obligation to use it. And Kernel authority does not: the Kernel governs the mediated paths, and a Trusted Runtime by definition also holds an unmediated one. Where the threat model needs more, the answer is the next term, not a stricter interface.

### Isolated Execution

An **Isolated Execution** is one whose Runtime is physically restricted in what it can reach — by a sandbox, container, virtual machine or equivalent — under a threat model the deployment has declared and tested.

*Tested threat model* carries the weight of that definition, in three ways.

First, a threat model can permit things. Isolation is not a synonym for "reaches nothing." An isolated profile may deliberately allow one approved external API, one mounted directory, one egress host. Isolation bounds *reach*; the Kernel's [admission](actions.md#admission-and-physical-action-attempt) bounds what may be done with a reach that exists. The two are independent in both directions, and each direction surprises a different reader. An isolated Execution can make an unmediated native call to the one API it is allowed to reach — contained, not mediated. A fully mediated Execution can run on a bare host with no sandbox at all — mediated, not isolated. A deployment that needs both must build and test both.

Second, this term — alone on these pages — cannot be earned by writing a design. A container image, an orchestration label, a sandbox dependency in a manifest, a policy document: none of these is evidence that anything is restricted, because none of them records an escape that was tried and blocked. *Isolated* is a claim about a test result: inherited credentials, path traversal, egress tricks, subprocess bypass, resource exhaustion, run against the real backend.

A deployment without such a result does not have an Isolated Execution. What it has is an untested claim, and an untested claim is not the same thing as a Trusted one — Trusted is a decision somebody made on purpose, and nobody decided this.

Third, the claim has to name its scope, because the word covers a Runtime and sandboxes are usually fitted to tools. Putting the one tool that runs shell commands inside a container leaves the process around it — plugins, model clients, network — exactly as reachable as before, and that process is the Runtime. One contained tool is not an Isolated Execution. [Containment claims](../mechanisms/resources.md#containment-claims) owns what has to be tested and what counts as passing.

Telemetry deserves one sentence, because it is the thing most often offered in place of both isolation and mediation. Logging a call, scanning a prompt, alerting afterwards — all of that is evidence about the past, none of it is prevention, and a record that something happened is the opposite of the thing not happening.

### Operating profile and durability

An **operating/support profile** is a deployment's published statement of what it was tested against and what it therefore promises: supported storage, Runtime and host versions; assumed failure modes; available recovery modes; capacity limits; retention windows; and who is responsible for cleanup.

The profile exists because every other guarantee on these pages is conditional on one, and an implicit condition is how a correct architecture produces a false promise. The Kernel commits an Outcome's progress, acknowledgments, [Emissions](actions.md#emission-result-and-output-obligation) and action intents as one atomic decision — but atomicity stores nothing. It guarantees the accepted state is coherent rather than half-applied. Whether that coherent state is still there tomorrow is decided entirely by the profile's storage. Both deployments in the example accept Outcomes under the very same all-or-nothing rule; only the one with surviving storage behind it can add that the result outlives the process.

A published profile also decides what a later loss can be blamed on. With one, a lost Execution is attributable: the profile said this would happen and it did, or the storage broke a guarantee it gave, or a Kernel, Driver or deployment defect broke an assumption the profile was resting on. With none, all of those look identical from outside, and [telling failure domains apart](../mechanisms/evidence.md#attribution-and-gates) is its own concern.

**Durable** is the word for a claim of that shape, and it never stands alone. It has three parts: *which* facts survive, *which* failures they survive, and *for how long*. "Durable" with no failure and no period named cannot be checked, so it cannot be wrong, so it is not a promise. Asked "is this deployment durable?", the only honest answer points at the profile. And a profile grows by stating more, never by implying more: the first persistent profile in [Deployment](../deployment.md) covers process failure with surviving storage, and that is all it covers. Not a destroyed disk. Not another data center. Not mutually distrusting tenants sharing one deployment. And not the Runtime's own work: surviving storage brings back what the Kernel accepted, never the half-finished native computation behind it, which is the [Driver](core.md#execution-driver)'s question and not the database's.

These pages also use the adjective in a second, narrower sense. A *durable* request, record or routing obligation is one kept as accepted state rather than only in some process's memory, and a *named durable owner* is a party that persists independently of the Execution handing it work — an application service or an operator queue, say. That sense says where a fact is kept, not how long it lasts: whether it survives a given failure is still the profile's claim.

Retention belongs to the profile for the same reason. Keeping accepted output, receipts and action evidence forever has unbounded cost; deleting them silently has a correctness problem, because a reader can no longer tell "this never happened" from "the evidence expired." The resolution is a published period with explicit behavior at its edges, owned by [retention and deletion](../mechanisms/evidence.md#retention-and-deletion).

## Time

Three different questions in this architecture have a time limit, and each is answered by its own clock.

### Three clocks

| Clock | The question it bounds | What expiry does |
|---|---|---|
| Wait deadline | How long one wait registration stays open | Ends that wait and produces a [timeout Event](core.md#timeout-event) |
| Execution deadline | How long the logical Execution may live | Sends the Execution into ordered [cancellation](../mechanisms/lifecycle.md#cancellation-order) |
| Scheduler lease | How long one worker's exclusive claim on advancing it lasts | Lets [recovery](../mechanisms/recovery.md) inspect the claim and, if warranted, reassign it |

These are the three clocks the Kernel's own semantics turn on, not an inventory of every timer in a deployment. A Driver's heartbeat, a provider's call timeout, a request's expiry, a cleanup schedule: all of those can run alongside, and none of them is one of these three or inherits what these three mean.

The report example shows why they stay apart. Its wait for the editor is measured in days, its Execution deadline in months, and each lease any process holds while advancing it is measured in seconds. Nothing renews that lease across the dormant week: while the report sits waiting for the editor, no process needs to hold a claim on it, and a stored wait needs no worker standing over it. The lease is short because a claim to be working on something now should lapse quickly when the claimant goes quiet. Fold these into one "timeout" field and something breaks immediately: either the editor's week-long wait expires every thirty seconds, or a dead worker's claim stands unchallenged for a week while nothing advances the report. There is no single duration correct for both, because they bound unrelated things.

Each expiry also proves less than it looks, and the three non-inferences below are the ones that cause real defects.

**A wait deadline expiring proves that one [wait](core.md#wait-subscription-and-generation) generation ran out of time — nothing else.** Not that the editor refused, not that the publication service failed, not that the external work is dead. Only the Execution's side of the arrangement has changed. What expiry produces is an ordinary Event, carried as a mandatory member of the next batch, and the Runtime decides what that means, because the Kernel has no way to know. [Ending a wait](../mechanisms/waits.md#ending-a-wait) owns what the Runtime may conclude.

**An Execution deadline expiring is a cancellation, not a wake.** Expiry runs through the same control path as an application's cancellation request, so it is ordered against [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) the same way, with the same referee: whichever decision the Kernel accepted first wins outright. Unlike a wait deadline, it mints no timeout Event and leads to no further Activation — an Execution that was `WAITING` ends up [cancelled](../mechanisms/lifecycle.md#cancellation-order) rather than runnable.

**A scheduler lease expiring proves that time passed.** A lease lapses when its term runs out, which is equally consistent with a dead worker and a slow one still writing — to a clock the two look identical. So expiry makes recovery inspection and reassignment *eligible*, and decides nothing by itself. It does not move the [writer epoch](identity.md#writer-epoch); only an accepted takeover does that. And it does not license replacing native work, because [deciding permission before replacing work](../mechanisms/recovery.md#decide-permission-before-replacing-work) needs a guarantee from the Driver that a lapsed timer cannot supply. Treating either as proof is a guess about a process that may still be running, and [shared mutation](../mechanisms/resources.md#shared-mutation) owns what a wrong guess costs.

How the clocks are spelled — units, precision, where the instant comes from, whether a lease is renewed by heartbeat or simply runs a fixed term — is left to the implementation. The architecture fixes only that these three are distinct, that they mean different things, and that no implementation may serve two of them from one field.

<!-- OPEN(implementation): clock units, precision, the instant source, and the lease expiry model (heartbeat renewal or a fixed TTL; WS §4 "Left open"). The architecture fixes only the three clocks' separate identities and expiry consequences; all four representations are settled by each implementation for itself. The durations used in this section (a week, a quarter, thirty seconds) are illustrative and fix no unit, precision, lease term or renewal interval. An implementation that settles any of them: record its answer here as that implementation's choice, with a pointer to where it is written down, and leave this marker in place — the architecture still fixes nothing. Only a later decision to fix a representation architecturally deletes it. rewrite-index.md §4 -->

## Executions talking to each other and to observers

An Execution that never reaches outside itself needs none of the words below. As soon as it creates a child, sends a message, or is watched by a dashboard, three relationships appear, and the most useful fact about them is that they are **three independent axes**:

- **Ownership** is responsibility for required work.
- **Communication** is addressed input travelling between Executions.
- **Waiting** is a declared dependency the Kernel can see.

They cross freely. A parent can own a child it is not waiting for, and wait for a peer it does not own; two Executions can wait on each other while neither owns the other. Drawing one edge says nothing about the other two, and none of the three is a permission. Nearly every confusion in this family starts by reading one edge as if it implied another.

### Child and ownership

A **child Execution** is an ordinary [Execution](core.md#execution) created by another one, through an [Effect](actions.md#effect) the Kernel accepted. It gets its own ID, its own [mailbox](core.md#mailbox), its own authority and its own lifecycle, exactly like an Execution the application created directly. Being a child makes it no lesser kind of thing.

That is the first boundary to draw, because the obvious reading of "child" is *subroutine*, and a subroutine is the one thing it is not. A child buys separation — a second lifetime the Kernel can address, authorize, recover and inspect on its own — and costs that second lifetime, which someone now has to coordinate and account for. Work that merely needs to run in parallel, or inside some other framework, gains nothing for that cost: a Runtime can hold [parallel branches and delegated workers](roles.md#stage-and-local-branch) inside itself, and those have no Kernel mailbox, authority or lifecycle at all. [Children](../mechanisms/communication.md#children) owns the test for when the separation is worth it.

**Ownership** is responsibility for required work, not universal access. Both halves matter. Responsibility means the parent must account for the child before it can [complete](../mechanisms/lifecycle.md#completion-is-an-accounting-check) — and completion is checked against the Kernel's records, not the Runtime's memory of what it spawned, so a parent that forgot a child cannot finish by declaring success. Not-access means the parent does not get to read the child's [working notes](state.md#working-notes), mailbox or credentials by virtue of being its parent. What a child receives and what a parent may see are disclosure decisions owned by [handoff and observation](../mechanisms/communication.md#handoff-and-observation). Ancestry is responsibility, not permission.

**Required work** names something concrete rather than a category: the [mediated actions](actions.md#logical-action-and-intent) and the child Executions this Execution owns and must have a disposition for before it can finish. In the running example that is the child gathering last quarter's figures, and the request the report sent to the publication service.

Each piece of it stays an obligation until exactly one of three things happens: this Execution accounts for it, a named durable owner explicitly accepts it, or an explicit policy decision abandons it. Reaching a terminal state is not one of the three. Cancelling the report ends the report — it does not publish anything, retract anything, or settle what the service did with the request already sent, and the obligation and its evidence keep the owner they had.

Two helper shapes get names because the difference between them is the one most often misread. A **call** creates a child and handles its terminal result as required work. A **spawn** creates a child without waiting for it right now — without *waiting*, not without *owing*. "Fire and forget" is exactly the picture the word invites and exactly the wrong one: a spawned child is still owned and still required.

**Detachment** is the operation that genuinely transfers responsibility, and it needs a named durable owner that has accepted it. The child is not that owner — the child is the work, not the party answering for it. A transfer with nobody on the receiving end is indistinguishable from dropping the obligation, so supporting arbitrary detachment is not required: an implementation may refuse it outright rather than pretend to perform it.

**Supervision** is the declared policy for what happens when a child fails, and for what happens to a live child when its parent ends. The application or Runtime chooses that policy; ancestry does not choose it for them. Ancestry implies neither cascade kill nor immunity: a child's failure does not automatically fail its parent, and a parent's failure does not automatically stop its children — which is why a failed parent leaves live children to application reconciliation rather than to a rule. What the Kernel supplies is not the policy but the things a policy needs in order to still mean something afterwards: the child links, the required-work accounting and the authorized control paths, none of which depend on the parent's Runtime still being there. [Finite expansion and supervision](../mechanisms/communication.md#finite-expansion-and-supervision) owns the declarable policies and the credits that keep recursive creation from running away.

### Message, request and correlation

A **message** is input one Execution addresses to a peer that already exists.

The difference from a child is in what the sender got to decide. A parent fixes its child's code, input and delegated authority at creation, because the child did not exist before. A peer's lifetime, mailbox and current dependencies were settled before the sender showed up, and sending to it confers control over none of them. A send therefore promises much less than a call does — exactly this much:

**Destination-mailbox acceptance.** The message became an accepted [Event](core.md#event) in the destination's mailbox. That is the whole promise. It does not promise the destination processed the message, replied, or even noticed, and it promises nothing about timing. Whether an arriving Event wakes anything depends entirely on what the destination is waiting for; a message matching no dependency sits in the mailbox, accepted and unacknowledged, until something asks for it. Delivery and attention are different achievements, and only the first is the sender's to claim.

A **request/reply record** is the durable object that makes a reply checkable. It binds a requester to an eligible responder, holds whether the question is still open, and may carry an expiry. Without one, "this is a reply to that" is a claim on the wire with nothing behind it; with one, there is a specific open question that an arriving reply either matches or does not, which is what lets a wrong peer or a guessed identifier be refused rather than believed. [Addressed messages and replies](../mechanisms/communication.md#addressed-messages-and-replies) owns what makes a particular reply valid.

That expiry is a fourth duration, and it belongs to the record rather than to any of the [three clocks](#three-clocks). A wait timing out does not close the request, and the request expiring does not by itself end a wait. Nor does expiry prove the peer did nothing: it bounds how long this Execution keeps treating the answer as still owed, which is a statement about the asker's patience and not about the other side's work.

**Correlation** is an identifier linking related facts — a reply to its request, a result to the wait generation that asked for it, a child's outcome to the parent that owns it. Its most important property is negative: **knowing a correlation identifier is not permission to use it.** Identifiers locate; authority permits. A caller holding an identifier has exactly the authority it had before it learned the number, which is why the responder is authenticated separately and why [content is never authority](../mechanisms/authority.md#content-is-not-authority).

A **human input request** is a durable question put to a person, with one owner and one path back into the Execution.

It gets its own term rather than being modeled as a slow service call because a person differs from a service in exactly the ways that break naive designs. The answer may come in seconds, next week, or never. The process holding the question will very probably restart in between. And the same question must never become two forms that can each independently resume the run. Making the request a durable object with a single resume owner resolves all three at once: a restart reconstructs the same request wherever the profile's storage survives it; showing the form again creates no second request, because the form is a *view* of the request rather than the request itself; and a second answer is refused by the request's own closure.

One boundary closes the term: an answer is an observation. It is not [exact consent](actions.md#exact-consent), which binds one named person's yes to one unchangeable action under a pinned operation version. It is not [settlement](actions.md#settlement-and-reconciliation), which is trusted evidence about what an action actually did. A person typing "yes, looks good" into a text box has produced input, and input is all it is. [Human input requests](../mechanisms/communication.md#human-input-requests) owns the mechanism, including what a restart may show that person again.

### Observation, cursor and routing

**Output observation** is an authorized read of an Execution's accepted output.

One rule makes observation coherent, and it is why the term sits with routing rather than with messages: **observation does not send input.** The direction that matters is the one that surprises people. When the report reads its child's [Emissions](actions.md#emission-result-and-output-obligation) — "3 sources checked" — the report's own [mailbox](core.md#mailbox), wait, progress and [readiness](core.md#readiness) are exactly as they were. The reader learns something; the reader is not thereby woken, and nothing was delivered to it. So a Runtime that must *react* to what it read cannot rely on having read it — reacting needs something explicitly addressed to it, and arranging that needs more permission than reading did. Being allowed to see an Execution's output is not being allowed to put anything into another Execution's mailbox; a bridge between the two holds both permissions or it is not allowed to exist. Reading is never quietly upgraded into sending. [Observation does not send input](../mechanisms/output.md#observation-does-not-send-input) owns the rule and the bridge's obligations.

An **output cursor** identifies an Execution and output [view](roles.md#view-and-disclosure) together with a position in it, so a reader that disconnects can come back and pick up where it stopped — an ordinary requirement for any UI attached to work that runs for days. What resuming promises is that retained output comes back in order from that position, not that each item arrives exactly once: delivery may repeat, and a consumer that cares deduplicates by the output's own stable identity.

A cursor is a position, never an authority. Holding one is not permission to keep reading; a reconnecting reader is authorized afresh, not on the strength of the position it presents — otherwise a revoked reader could keep reading by never throwing its cursor away. If a view changed so that its old position can no longer be safely resumed, the answer is to rebind or refuse explicitly, never to quietly return a filtered stream that looks continuous. [Authorized subscriptions and replay](../mechanisms/output.md#authorized-subscriptions-and-replay) owns resumption, and [bounded retention](../mechanisms/output.md#bounded-retention) owns what happens once a position has aged past the promised window: an explicit expired-cursor answer, never a successful-looking empty stream.

A **routing obligation** is an accepted duty to deliver a fact to a destination later.

It is what makes a cross-Execution hand-off survivable when the two sides cannot commit in one transaction: the child's terminal result has to reach the parent, and something durable has to hold that duty across a restart. What makes the term worth defining precisely is what it is *not*. An obligation is a source-side promise, not destination acceptance. The source promising to deliver and the destination's mailbox actually holding an Event are two different facts, and only the second can wake anything: a child's routing obligation alone never wakes its parent; the parent's readiness starts when the destination Event exists. Nor is retrying an obligation re-running the work — a redelivered result is the same result, not a second execution of the child.

### Backpressure and cleanup debt

The last two terms name costs. Both describe something accumulating under somebody's name while every individual decision looked locally fine, which is why they need words at all: an unnamed cost has no owner.

**Backpressure** is what a system does when a consumer cannot keep up with what it is being given.

The report's dashboard is the concrete case: a browser on a bad connection reading Emissions more slowly than the report produces them. The permitted responses are to buffer within a bound, or to disconnect the reader and hand it a resumable cursor and an honest gap. Two responses are forbidden, and they are the two that happen by default when nobody decides. A slow consumer may not pin accepted records indefinitely, turning one stalled browser tab into unbounded storage. And a slow consumer may not block the Runtime's progress, turning a reader into something that can halt the work it is merely watching.

At the producing end the same pressure meets a harder rule, because that end is where a promise gets made rather than kept. An accepted Outcome commits an [output obligation](actions.md#emission-result-and-output-obligation) along with everything else in it, so a deployment that cannot store what it is about to promise has to refuse or hold that Outcome *before* the commit rather than accept it and discard the output afterwards. The mechanism varies; the refusal always precedes the promise, because accepting is the promise. [Bounded retention](../mechanisms/output.md#bounded-retention) owns where the line sits.

**Cleanup debt** is resource cleanup still owed after a logical decision has already been recorded, together with the owner answerable for it and the cost it keeps running up until somebody does it.

Cancel the report and the Kernel's record reaches a terminal state immediately. Meanwhile the container is still running, the provider is still holding a slot, and the workspace is still allocated. None of that is a bug in cancellation. It is the ordinary consequence of the Kernel deciding what has been accepted while a world outside it keeps its own state, and cleanup debt is the name for that particular remainder.

Two other remainders fall out of the same cancellation, and the word deliberately does not stretch to cover them. The model call already in flight will still be billed: that is cost already incurred, and no amount of cleanup recovers it. The publication request already sent may still go through: that is an unsettled action, and its evidence and owner belong to [settlement and reconciliation](actions.md#settlement-and-reconciliation). Keeping the three apart is what makes each of them actionable. Releasing the container settles neither of the other two, and a system that files all three under one word will believe it has finished when it has only released the container.

It is comfortable to assume a terminal Execution state settles all of this. **It does not: the debt has not disappeared, and the remote work has not stopped.** Logical cancellation, native interruption and physical cleanup are three separate things that each succeed or fail on their own, and a remote job can outlive the host that started it. The architecture does not ask for a guarantee that cleanup happened — it cannot offer one. It asks that the remainder be recorded with an owner and a deadline instead of assumed away. The opposite error is equally wrong: deleting resources that admitted work or reconciliation still needs. Between leaking and destroying there is a third verb, and it is the safe one — [release is not destruction](state.md#resource-binding-and-attachment). Closing a client ends *this* Execution's attachment and leaves the backing resource exactly where it was, for whoever still needs it. [Capacity, cancellation and retention](../mechanisms/resources.md#capacity-cancellation-and-retention) owns how these costs are measured and bounded.

That last point generalizes to the whole page. Every term here sits where a Kernel decision meets a world that did not necessarily obey it: a crash the storage may not survive, a native call the authority never saw, a timer that proves less than it looks, a container that outlives its cancellation. The Kernel's job is to be exact about what it accepted. This vocabulary's job is to keep anyone from reading that exactness as a claim about everything else.

Next in the reading order: [roles](roles.md) — what is commonly built inside a Runtime, none of which the Kernel sees.
