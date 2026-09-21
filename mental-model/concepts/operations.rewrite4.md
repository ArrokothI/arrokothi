# Operational and communication terms

The [Kernel](core.md#kernel), an [Execution](core.md#execution), an [Activation](core.md#activation) — those names describe what is coordinated. They do not say where any of it runs, how long it is allowed to, or what happens when one piece of work needs another. Those questions look operational and secondary. They are not. Confusing a process with the Kernel, a container with isolation, a wait deadline with cancellation, or a message with ownership is how a correct protocol gets deployed into something that cannot keep its promises.

This page names the terms that answer those questions. Each one is defined here and nowhere else. How several of them interact is specified elsewhere: [deployment](../deployment.md) owns where code actually runs, [lifecycle](../mechanisms/lifecycle.md) owns the transitions a clock or a cancellation can cause, [communication](../mechanisms/communication.md) owns how children, messages and human replies behave together, and [resources](../mechanisms/resources.md) owns physical enforcement. This page says what the pieces are.

They group as three independent families, and the independence is the load-bearing claim. A process role is not a trust mode. A clock is not a wait. Owning a child is not sending a message. Mixing any two families produces a sentence that sounds like architecture and is not.

- **Where it runs, and under what physical promise** — [Kernel Worker](#kernel-worker) and [Execution Host](#execution-host), then [Trusted Execution](#trusted-execution) and [Isolated Execution](#isolated-execution), then the [operating profile](#operating-profile-and-durability) that says which of those promises a deployment may actually make.
- **What "expired" means** — the [three clocks](#three-clocks) that must never share a timer.
- **How one Execution involves another** — [child and ownership](#child-and-ownership), [message, request and correlation](#message-request-and-correlation), [observation, cursor and routing](#observation-cursor-and-routing), and the [backpressure and cleanup debt](#backpressure-and-cleanup-debt) that remain after the logical lifetime ends.

The weekly report introduced in [core](core.md) is the running example. Nothing here adds a Kernel type: a child is still an Execution, a Kernel Worker is still a process role, and a cursor is still a position.

## A first example

The application that asked for the weekly report is a web backend. One process in that backend performs Kernel transitions — it accepts the create request, records the editor's later input, prepares Activations, and will one day accept the Outcome that finishes the report. That process is acting as a **Kernel Worker**. The same process also runs the Runtime that drafts the report, so it is also an **Execution Host**. Two roles, one process. Moving either role into another process later would not, by itself, make anything durable.

The Runtime is allowed to use the host's network and files. That is **Trusted Execution**, chosen because this deployment does not claim to contain the Runtime. Putting the same Runtime in a container would not automatically make it **Isolated**. Isolation is a different promise, with tests, and it would not replace the Kernel's admission checks on the publication path.

If this backend's process dies, the in-memory profile loses the report. A persistent profile would claim something narrower and more honest: the accepted records survive *process* failure because *storage* survived. A destroyed disk is a different failure. Calling the in-memory process "durable" because the Kernel accepts atomically would confuse a consistency rule with a storage rule.

While the Runtime waits for the editor, three independent timers may all be running. The wait has a deadline: if the editor has not answered by Friday, the Kernel mints a timeout Event and the Execution is ready again. The Execution itself has a deadline: if the whole report is still unfinished in two weeks, cancellation runs. The Kernel Worker holds a scheduler lease: if the Worker goes quiet, the lease expires, which proves that time passed and nothing else — not that the Worker is dead, not that publication failed, not that takeover has happened.

The Runtime also needs last week's figures, and that work needs its own identity and its own recovery. It creates a **child** Execution rather than calling a local function. Creating the child does not wait for it; spawn skips the wait, not the obligation. The parent still has to account for the child before it can complete.

The editor's correction is ordinary input. A question to the editor — "which region should this cover?" — is a **human input request**, a durable object, not a callback and not consent to publish. A **message** to a peer Execution is different again: send success is the peer's mailbox accepting it, not the peer processing it.

Meanwhile a UI is watching the draft. Its **cursor** is a position in accepted output. Holding that cursor is not permission to keep reading, and reading it does not send the parent anything.

When the report finally completes, a publication job may still be running at the service, a workspace may still exist, and the child's leftover files may still be billed. Terminal state does not mean those disappeared. That remainder is **cleanup debt**.

The sections below take the three families in that order.

## Kernel Worker

A **Kernel Worker** is a process role that performs Kernel state transitions and coordinates accepted work.

The Kernel, as [core](core.md#kernel) defines it, is a set of responsibilities: accept, record, fence, recover accepted truth. Responsibilities do not execute themselves. Something has to take an accepted create request and actually write the Execution record; something has to pin a dispatch intent and hand the Activation to a Driver; something has to notice that a scheduler lease has gone quiet. That something is a Kernel Worker. The term exists so that "the Kernel" can stay a set of responsibilities while still having a name for the process that carries them out.

It is a role, not a required standalone service. One application process can be the Kernel Worker. A deployment that wants the Worker's failures and resource limits managed independently can run it as its own process, or as several. Neither arrangement is promised by the architecture, and neither is forbidden. [Deployment](../deployment.md) owns that choice.

Because it is a role, several familiar things are not Kernel Workers, and each one tempts for a different reason. The Kernel is not: the Kernel is what the Worker performs, not the process performing it. An Execution is not: an Execution is a logical lifetime, and it can outlive every Worker that ever touched it. An [Execution Runtime](core.md#execution-runtime) is not: the Runtime does the work, and the Worker coordinates what has been accepted about it. A [local worker](roles.md#local-worker) is not: that is internal work a Runtime manages for itself, with no Kernel mailbox and no Kernel lifecycle. The word *worker* is cheap, which is why these pages qualify it every time.

One process may hold both this role and the Execution Host role below. That is the common case for a single-backend application, and it is also the case that most easily hides the distinction. The process can die in the middle of drafting the report. What dies is a host *and* a Worker. Recovery still has two separate questions — reconstruct accepted records, then ask whether native work can continue — because the two roles failed together only by accident of packaging, not because they were one thing.

A Kernel Worker is not made durable by being moved. Putting the Worker on another machine, or running several of them, adds authenticated transport, ownership of the current write, and partition behaviour to test. It does not by itself survive a destroyed disk, and it does not by itself make a Runtime's native session safe to retry. Those are profile claims, owned later on this page.

## Execution Host

An **Execution Host** is the process or machine that runs Runtime code.

The Runtime is the code or service that performs the work and owns the meaning of its continuation. The Host is where that code sits. Splitting those two is what lets a page say "the Runtime survived the coordinator's death" or "the Host is gone and the native job is still running somewhere else" without pretending those are the same sentence.

The word *Runtime* already causes trouble here, which is why [core](core.md#execution-runtime) cancelled two associations and this page has to cancel a third. The Execution Host is not the JavaScript VM. It is not "the Runtime" as a product name. It is the deployment unit whose CPU, memory, files and network the Runtime process actually uses. A container, a VM, a developer laptop and a serverless worker can all be Hosts. The architecture does not pick one.

The Host is also not the Kernel Worker, even when they are the same process. The Worker performs Kernel transitions. The Host runs the code that drafts the report. A tight synchronous loop in that code can starve every other Execution sharing the Host, because [Activation](core.md#activation) dispatch is concurrent in the protocol and not in the operating system. Dispatching an Activation does not give the underlying Runtime CPU preemption or fair scheduling. [Capacity](../mechanisms/resources.md#capacity-cancellation-and-retention) owns the consequence: the Host bounds physical resources, the Kernel bounds mediated work, and the Runtime bounds its own model calls, and none of those three substitutes for another.

A Driver can run on the Host, beside the Runtime, or in front of a remote job the Host never sees. That is the Driver's shape to declare. The Host's job is narrower: it is where Runtime code has somewhere to run, and where ambient powers — files, network, subprocesses — physically exist to be permitted or contained.

## Trusted Execution

**Trusted Execution** is a trust mode that intentionally permits ambient host powers: filesystem, network, process, whatever the Execution Host already provides.

"Intentionally" is the word that makes this a mode rather than a failure. A Runtime drafting the weekly report may read last week's files from disk and call a model provider over the network without asking the Kernel. In Trusted Execution that is allowed on purpose, because the deployment has decided that this Runtime is part of the application's trusted computing base. Kernel guarantees still apply, and they apply only to [Kernel-mediated paths](actions.md#exposure-and-mediation). The native file read was never one of those paths.

The mode exists because many useful Runtimes need host access, and pretending they do not would make the Kernel claim a prevention it cannot deliver. A Kernel decision does not stop a process that already holds a network socket. Recording that the publication Effect was never admitted does not un-send a native HTTP call the Runtime made on its own. Trusted Execution says this out loud, so a deployment that wants that ambient reach can have it without dressing it up as isolation.

Trusted is not a grant of mediated authority. An Execution running trusted may still be refused at [admission](actions.md#admission-and-physical-action-attempt) for a publication it is not allowed to make. Ambient reach and mediated permission are different ceilings. Trusted is also not "safer than Isolated in practice, because we know the code." Knowing the code is how the mode is chosen, not evidence that ambient actions were authorized.

Credentials broad enough to act on the whole service's behalf belong only in code running under Trusted Execution — the Driver, the Worker, the application's own backend — and never inside Isolated Runtime code. [Deployment](../deployment.md#trust-and-containment) owns that placement. This page needs the vocabulary: Trusted means the Host's powers are in play on purpose.

## Isolated Execution

**Isolated Execution** physically contains access under a tested threat model.

Physically, not administratively. A policy document that says the Runtime must not touch the network is not isolation. A container label is not isolation. Prompt scanning, signatures, static checks and telemetry do not establish it. Either a real backend was tested against the threat model and something was actually prevented, or the profile is Trusted and should say so. [Containment claims](../mechanisms/resources.md#containment-claims) owns the tests; this page owns the mode they would justify.

The threat model is declared, and it can still explicitly allow some native access — calling one approved external API, for example. Isolation decides what the Runtime can physically reach. It does not decide whether the Kernel is mediating and authorizing what the Runtime does with that reach.

That last sentence is the independence this term exists to protect, and it runs in both directions. A well-isolated Execution can still make an unmediated native call within what it is allowed to reach: isolation permitted the socket, and the Kernel never saw the send. A well-mediated Execution can run with no isolation at all: every publication goes through admission and settlement, and the Runtime still has the Host's filesystem. Neither arrangement is a substitute for the other. Stopping ambient action takes mediation if the Runtime actually uses the mediated path, or isolation if the Host must be prevented even when the Runtime does not ask. Telemetry that merely observes an unmediated action does neither.

Isolated Execution is not a Kernel type. The Kernel still sees an Execution. The Driver still translates Activations. What changes is the Host's physical reach, and the evidence a deployment has to produce before it may claim that reach is bounded.

The isolation backend itself is not selected here. D1 owns that choice. Until a profile has been tested, these pages do not treat a sandbox, a container or a VM as isolation merely because one of those words appears in a diagram.

## Operating profile and durability

An **operating profile** is the published claim of what a deployment actually does: tested storage, Runtime and host versions, failure assumptions, recovery modes, limits, retention, and cleanup responsibilities. A **support profile** is the same kind of claim about an integration — which Driver, which native Runtime, which protocol subset, under which failure assumptions. Both are lists of tested facts. Neither is a hope, a default, or a synonym for "production."

The term exists because a logical architecture can be described once and then run under wildly different physical promises, and those promises cannot be inferred from the architecture. The weekly report's Kernel, Runtime and Driver are the same three roles in an in-memory CLI and in a multi-worker service with a database. What the application may honestly say after a crash is not. [Deployment](../deployment.md) lists the shapes; this page names the claim each shape has to publish.

**Durable** means that specified facts survive specified failures for the promised period. Every word in that sentence is doing work. Specified facts: accepted Execution records, not "everything," not native sessions the Driver never declared. Specified failures: the first persistent profile covers **process failure with surviving storage** and nothing else. Promised period: retention is bounded, and a fact that outlives its period is no longer a durability claim.

Several failures are therefore not covered by calling a profile durable, and treating them as covered is how a page starts promising the world. A destroyed disk is not process failure. Staying up when an entire data center goes down is not process failure. Safety between mutually distrusting tenants sharing one deployment is not process failure. None of those is implied by surviving a Worker restart because the database was still there.

Atomic acceptance does not supply this. Accepting an Outcome as one decision guarantees a coherent accepted state *if the storage profile preserves it*. Atomicity by itself stores nothing. The in-memory profile that runs the weekly report in a single process can accept perfectly and still lose every record when the process dies. That is not a defect in acceptance. It is a profile that never claimed durability.

What a supported profile publishes, it has to mean. Tested versions, surviving-storage assumptions, recovery restrictions, retention windows, limits and cleanup responsibilities are the contents of the claim. A custom scheduler, database, sandbox or hosting fleet is not a default obligation of having a Kernel; using a mature one is encouraged, provided the deployment first checks what that substrate [retries on its own](../deployment.md#check-what-a-durable-substrate-retries-on-its-own). Admission fairness and load limits are operating claims of this kind, not consequences of the protocol being asynchronous.

The in-memory profile that can create an Execution and dispatch an Activation does not become a persistent profile by speaking as if it were. No bounded-retention profile may be claimed from a store in which no key ever expires. Those are implementation limits recorded elsewhere; this page needs only the rule that a profile may claim what it has tested, and nothing adjacent.

## Three clocks

An Execution lives under three clocks. They have different purposes, different owners, and different consequences when they expire. They must never share one timer or one field.

| Clock | What it is for | What expiry proves | What expiry does |
|---|---|---|---|
| Wait deadline | This [wait](core.md#wait-subscription-and-generation) generation should not block dispatch forever | One registration expired | The Kernel mints a [timeout Event](core.md#timeout-event), retires the wait, and the Execution becomes ready for another Activation |
| Execution deadline | This logical lifetime should not run forever | The lifetime as a whole has run out | Cancellation runs, along the same control path an explicit cancel uses |
| Scheduler lease | This Worker or Host currently holds exclusive scheduling of this work | Time passed with no renewal | Recovery may *consider* replacing the attempt; nothing else has been decided |

The weekly report can have all three running at once, and each one expiring means something the others do not.

The wait deadline is Friday, because the Runtime asked to wait for the editor and did not want to wait past the week. If Friday comes with no correction, the Kernel mints a timeout Event correlated to *this* wait generation, the Execution is `READY`, and the next Activation carries that Event. The editor may still answer on Saturday. The publication may already have succeeded. Expiry proves that this registration's deadline passed. It does not prove the external work failed, and it does not cancel the Execution. [Ending a wait](../mechanisms/waits.md#ending-a-wait) owns the minting, including the rule that one generation produces at most one timeout however many times a timer fires.

The Execution deadline is two weeks, because the application does not want an unfinished report occupying budget forever. If two weeks pass, cancellation is accepted, new progress is fenced, and the lifetime ends `CANCELLED`. That is a different decision from a wait expiring. A wait expiry asks the Runtime to continue; an Execution deadline asks the Kernel to stop. [Cancellation order](../mechanisms/lifecycle.md#cancellation-order) owns the control path, and Execution-deadline expiry uses it rather than inventing a fourth one.

The scheduler lease is thirty seconds, or whatever the deployment chose, on the Worker currently preparing the report. If the Worker goes quiet and the lease expires, what has been proved is that the lease was not renewed. The Worker may be dead. It may be stuck on a model call. It may be about to submit a perfectly good Outcome. Lease expiry authorizes nobody to treat the attempt as failed, and it does not by itself advance the [writer epoch](identity.md#writer-epoch). Only an accepted takeover does that. In the gap between a lease lapsing and that decision, nothing about the lease stops the original attempt's Outcome from being accepted. [Recovery](../mechanisms/recovery.md) owns whether replacement is even safe; a reused process identifier or an expired unenforced lease is not evidence the old writer stopped.

Sharing a timer across any two of these collapses decisions that have to remain independent. If the wait deadline used the Execution deadline's timer, an editor taking too long would cancel the whole report. If the lease used the wait deadline's timer, a slow Host would mint a timeout Event as if the editor had never answered. If the Execution deadline used the lease, a Worker restart would kill the lifetime instead of recovering it. The three clocks exist because those three sentences are all wrong, and one field cannot make them right.

They are also not the Runtime's own timers. A model-call timeout inside the Runtime is not a wait deadline. A provider's job-lease on a native session is not a scheduler lease. A business "file this report by Monday" reminder in application code is not an Execution deadline. Those may all be running; none of them is a Kernel clock, and none of them may be stored in a Kernel clock's field.

Units, precision, the source of "now," and how a lease is renewed are implementation-owned. The architecture requires only that the three clocks remain distinct in purpose and in consequence. <!-- OPEN(unassigned): clock units, precision, instant source, and lease renewal mechanism. Deliberately implementation-owned rather than awaiting an owner; the architecture requires only that wait deadline, Execution deadline and scheduler lease remain distinct in purpose and in expiry consequence. Whoever fixes a representation: restate this paragraph in its terms and delete this marker. rewrite-index.md §4; WS CL-1–CL-3 -->

## Child and ownership

A **child** is an Execution that another Execution — the parent — owns. **Ownership** is responsibility for required work, not universal access.

The weekly report needs last week's figures, and that work needs its own identity, its own authority binding, its own recovery and its own inspection. Those are the reasons to create a child. A parallel function, a model call, or a foreign framework running inside the parent's Runtime is not a reason. That work can stay a [local worker](roles.md#local-worker), which is not a child and not a Kernel Worker. Use a child when the application needs to address, steer, inspect, cancel or account for the work independently. [Communication](../mechanisms/communication.md) owns the rule; this page owns the terms it uses.

Creating a child is an [Effect](actions.md#effect) with its own shape, pointing at no [operation](actions.md#operation). A child is not a function call, and flattening it into an operation schema would lose the facts an operation has no place for: who remains answerable, what authority was delegated, which budget was reserved. Acceptance binds a stable request to one child ID, a parent correlation, and a root budget reservation. The creation [receipt](identity.md#acceptance-boundary-and-receipt) proves the child exists. It does not prove the child completed.

Two verbs create a child, and they differ only in whether the parent waits.

**Call** creates the child and waits for it: the same Outcome that proposes creation also registers the wait. **Spawn** creates the child and skips that immediate wait. Spawn does not skip the obligation. The parent can continue other work — draft the commentary while the figures are fetched — and it must still account for the child before it can [complete](../mechanisms/lifecycle.md#completion-is-an-accounting-check). The safe default is that somebody is still answerable for work that was started. Forgetting a spawned child is not detachment; it is an incomplete accounting.

**Detachment** is the explicit decision that transfers that responsibility to a **named durable owner** who accepts it. There is no anonymous discard. The minimum profile may refuse detachment entirely, which is a permitted limitation rather than a missing feature: refusing is how a profile keeps every started child accounted for when it has no second owner to hand them to. Abandonment, where it is allowed at all, is also explicit and sits under policy. Ending the parent does not by itself abandon the child.

**Supervision** is the declared policy for what the parent does when the child ends, fails, or needs a retry: report and continue, cancel siblings, request the child's cancellation, or start a new retry Execution. Ancestry alone implies none of those. It does not cascade-kill descendants, and it does not make them immune. Native grandchildren — work a child's Runtime started inside itself — stay under their native Runtime owner; they are not Kernel children just because a Kernel child exists.

Ownership is not permission. [Delegation](actions.md#principal-and-authority) gives the child the intersection of what was requested, what the parent was allowed to pass on, and what current policy permits now. Being created by the report does not give the figures-child the report's publication rights. Ancestry is the responsibility line, not the authority line.

A child's failure or cancellation does not automatically fail the parent. The Runtime decides what that failure means for the report. The parent that has accounted for "the figures child failed" can still complete, or can fail on purpose; the Kernel checks the accounting, not the business reading. Parent failure or cancellation leaves application supervision responsible for live children and actions. Logical cancellation cannot promise that those children stopped.

Recursive Definitions are legal. What is not legal is unbounded autonomous expansion. A root-scoped finite spawn credit is consumed once per accepted creation and is not refunded when a child finishes — otherwise a Definition that spawns one child, waits, then spawns another would run forever inside a limit that was supposed to stop it. Those bounds, and the retry intensity that supervision may not exceed, belong to [finite expansion](../mechanisms/communication.md#finite-expansion-and-supervision).

A child is still an Execution. It has a mailbox, a lifecycle, an authority binding and a never-reused ID of its own. What it does not have is the parent's mailbox, the parent's credentials, or an implicit copy of the parent's notes. Handoff is explicit.

## Message, request and correlation

A **message** is addressed input sent to an Execution that already exists. Send success is durable destination-[mailbox](core.md#mailbox) acceptance, not processing, not a reply, and not attention.

The destination already has its own lifetime, its own mailbox and its own idea of what it is waiting for, none of which the sender controls. That is the whole difference from creating a child. A child is work this Execution owns. A message is input aimed at a peer. Owning, communicating and waiting are three independent axes: owning a child does not mean waiting for it, waiting for a peer does not mean owning it, and sending a message does not make the sender the destination's parent.

The report might ask a peer "research" Execution for a citation. The send is an Effect with its own shape, again pointing at no operation. It carries stable sender and destination, input identity, immutable content, causation, and optional request correlation. The sender is bound from authenticated Execution context; destination-scoped send is authorized before target details are exposed. Output-read permission and ancestry grant no send authority. Being allowed to watch the research Execution's draft is not being allowed to write into its mailbox.

Accepted intent creates a [routing obligation](#observation-cursor-and-routing). Success occurs only when the destination mailbox accepts the message. Retry uses the same input identity and content; a lost receipt cannot create a second mailbox entry. A full, terminal, or refused destination cannot yield success. An unmatched message need not wake the destination: the message is in the mailbox either way, and whether anything happens next depends on what the destination is waiting for. Delivery and attention are different achievements.

A **request/reply record** is the retained object that makes a reply mean something. `expectsReply` is valid only with that record. A valid reply names the open request and an authenticated permitted responder. Wrong peers, guessed identifiers, and new replies after closure are refused. Exact authenticated retry returns the original receipt; changed content is a conflict. Knowing a [correlation](identity.md#request-key-and-input-id) identifier is not permission to reply or settle. A correlation names which request an observation concerns. It is not a bearer token, not a grant, and not an invitation to anyone who learned the string.

A reply is an observation. It is not [exact consent](actions.md#exact-consent), and it is not settlement of a mediated action. The editor answering "which region should this cover?" does not publish the report, and does not authorize publishing it. Notify-only sends settle at mailbox acceptance. An ask stays required until reply, explicit expiry, or abandonment. Expiry is not proof the peer did no work. Reply content can still be semantically wrong.

A **human input request** is a durable question put to a person. A person is not a service. The response may come in seconds or next week, the process holding the request will probably restart in between, and the same question must not turn into two forms that can each resume the run. That is why the request is a durable object with one owner rather than a callback. Authorized admission opens one durably discoverable request; denial creates a correlated observation so the wait cannot hang on a question that never opened. Restart reconstructs the same request; displaying it again is not creating a new one. Ordinary input cannot settle it. Human feedback is not exact consent.

`reply_and_ask` — closing one question and opening the next as one compound operation — is optional. Two ordered operations are the baseline. Arbitrary richer joins are likewise optional, and a minimum profile may refuse them. Optional means a profile can say no; it does not mean the terms above are incomplete without them.

## Observation, cursor and routing

An **observation** is an authorized read of accepted output or state. It does not send input, it does not wake anyone, and it does not settle anything.

The UI watching the weekly report's draft is observing. "3 sources checked" can appear on a screen without the parent Execution taking a step, without the child's mailbox changing, and without anyone's wait retiring. If the parent Runtime must react, that reaction needs an explicit message or an application-owned output-to-input bridge that has both read permission and destination send authority. Automatic forwarding is not part of the minimum profile. [Observation does not send input](../mechanisms/output.md#observation-does-not-send-input) is the mechanism form of this rule.

A **cursor** is a position in a stream of accepted output: this Execution, this [view](roles.md#view-and-disclosure), this far through. It is a position, not authority. Holding a cursor is not permission to keep reading. Reconnecting is authorized afresh, under current policy, rather than on the strength of a number the client remembered. An old cursor cannot preserve revoked access. If a changed view cannot safely resume its old cursor, the read rebinds or is refused — it is not silently continued from a position that now means something else.

A cursor is also not a mailbox cursor. The Execution's mailbox has no global "everything before here processed" marker; each Event carries its own disposition. Output replay positions are a different object, used by observers, and they do not acknowledge Runtime input. Mixing the two is how a page starts treating a UI scroll-back as if it had accounted for the editor's correction.

A **routing obligation** is a duty to deliver later. It is not destination acceptance, and it is not proof the destination processed anything.

When the figures-child completes, its terminal result has to reach the parent. That routing can commit with the child's completion or as a durable obligation that outlives the attempt to send. Retrying the routing does not run the child again. The parent's wait wakes when the destination Event is actually accepted in the parent's mailbox, not when the source decided to send. A source-side obligation alone cannot wake anyone. If the parent is already terminal, the result gets a recorded terminal routing disposition; it is never redirected into a later unrelated session, and it never reopens either lifetime.

The same shape carries a peer message that has been accepted as intent but has not yet landed in the destination mailbox, and an external-delivery intent that still has to reach a channel. In every case the obligation is the duty, and destination acceptance is the success. Collapsing those two reports a send that nothing received.

Carrying an identifier never implies the rest. A cursor does not authorize the next read. A correlation identifier does not authorize a reply. A routing obligation does not create the destination Event. A handle, a trace identifier, or a URL in a receipt is not a bearer permission. [Identity](identity.md#keys-ids-and-scope) stated the general form: holding an identity grants no access to what it names.

## Backpressure and cleanup debt

**Backpressure** is what a deployment does when a bounded place cannot take more work, more output, or more retained input without breaking a promise it has already made.

The places are independent, which is why metering them as one number cannot say which one is saturated. Coordinator transitions, active native compute, admission of `READY` work, provider concurrency, output queues and dormant waits each fill on their own. An Execution that looks idle in Kernel records — `WAITING` for the editor — can still be holding a connection, a process and a provider slot for the whole wait. Stored outer state does not make native waiting free.

Slow consumers of output cannot indefinitely pin records or block Runtime progress. They get a bounded buffer, or they are disconnected with a resumable cursor and an explicit gap. If capacity cannot retain newly promised output, Outcome acceptance is refused or held *before commit*. Accepting is the promise to keep the output; there is no honest way to make that promise and then drop the bytes. [Bounded retention](../mechanisms/output.md#bounded-retention) owns the output case. Admission fairness and load limits remain operating-profile claims, not something asynchrony provides for free.

A timeout field does not preempt a tight CPU loop on the Host. The Host bounds physical resources; the Kernel does not.

**Cleanup debt** is work, storage, remote jobs, children, or resource bindings that remain after the logical lifetime has ended, still under someone's name.

Terminal Execution state does not imply that debt disappeared, and it does not imply that remote work stopped. Completing the weekly report records the result and the output obligation. It does not prove that a user received the report, that the publication job exited, that the figures-child's workspace was destroyed, or that an unknown external action failed. Those facts are tracked separately and require their own evidence.

Logical cancellation, native interruption and physical cleanup are three different operations. Cancelling the Execution fences new progress and new admission. Asking the Driver to interrupt native work may happen later and may fail. Destroying a workspace is a separate resource operation, and [release is not destruction](state.md#resource-binding-and-attachment). A remote job may survive Host death. Failed cleanup retains an owner and a cost; it does not become someone else's problem by being hard.

The debt has to remain visible because completion and cancellation are accounting decisions, not vacuums. Late trusted settlements still update the original action records without reopening the Execution. Supervision still owns live children. Retention still has a period. A profile that claims the opposite — that `COMPLETED` means the world is quiet — is claiming a physical fact it has not tested.

The three families on this page stay independent all the way through this last section. Backpressure is not a clock. Cleanup debt is not ownership transferring itself. A Host that is out of memory is not an Isolated Execution. The terms are small on purpose. Each one names a fact the others cannot.