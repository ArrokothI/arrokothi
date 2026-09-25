# Operational and communication terms

The [core vocabulary](core.md) follows one Execution through an Activation and its Outcome. [Actions](actions.md) explains what that Execution can ask the world to do, and [identity](identity.md) explains how the Kernel recognizes the same request or attempt when it appears again. This page follows the work beyond that exchange: into the processes that run it, across the time it spends waiting, and into its relationships with other Executions and people.

Those relationships matter because the work can outlast any one participant. The process preparing a report may stop before the report is finished. An editor may reply after the application has restarted. A child may still be gathering evidence after its parent has been cancelled. To reason about these situations, we need names for what continues, what ends, and who remains responsible.

This is an explanation of the target design. [Target, not shipped](../README.md#target-not-shipped) explains where implementation status is recorded.

## A first example

Consider the weekly report from the earlier pages. At first, one backend process can do everything: accept the application's request, record the Execution, and run the code that drafts the report. The process performs two roles. As a **Kernel Worker**, it carries out the Kernel's coordination decisions. As an **Execution Host**, it runs the Runtime's computation. Giving those roles different names lets us describe their responsibilities even while they share a process.

The report then needs some figures checked. Suppose the application wants that check to have its own identity, permissions and result, so the report requests a **child Execution** to do it. The report can continue drafting while the child checks the figures. The two pieces of work now have independent lifetimes, but the report remains responsible for accounting for the check it requested.

Later, the editor opens the draft in a browser. Reading it changes no Execution state. Sending a correction is a separate act, and answering a specific question is another: the system has to know which question the answer belongs to and whether this person may answer it. None of these relationships follows merely from two participants appearing in the same report workflow.

The sections below develop that example in three parts: the roles and guarantees of a deployment, the three clocks that limit different things, and the obligations created by children, messages and observation. The final section brings them together at the point where capacity or cleanup becomes somebody's responsibility.

## Kernel Worker

A **Kernel Worker** is the process role that carries out Kernel state transitions and coordinates work the Kernel has accepted. Creating an Execution, recording input and preparing a dispatch are examples of work in this role. The Kernel defines what those decisions mean; a Kernel Worker executes them against the deployment's accepted records.

This distinction lets an Execution have continuity without tying it to the life of one process. The application addresses the report by its Execution ID. It does not need to know which process accepted the last correction or will prepare the next Activation. In a persistent deployment, another worker can reconstruct the accepted records after a process failure, subject to the deployment's recovery guarantees.

Replacing a Kernel Worker still requires more than starting another copy of the program. Workers must agree on which decisions have been accepted and which attempt may commit. If a disconnected worker returns later, its old view cannot become a competing account of the report's progress. The [execution cycle](../mechanisms/execution-cycle.md) supplies the acceptance rules; [recovery](../mechanisms/recovery.md) explains how a replacement establishes permission to continue.

The role does not require a standalone service or a custom scheduling system. An application can execute Kernel work inside its own backend, and a deployment can use an existing storage or scheduling substrate. What matters is whether the resulting decisions preserve the Kernel contract. A new process boundary changes where work happens; it does not, by itself, make accepted state durable or competing workers safe.

## Execution Host

An **Execution Host** runs Runtime code. For the report, this is where the draft is assembled, model calls are made and native computation takes place. The Runtime supplies the algorithm; the host supplies the environment in which that algorithm runs.

One process may serve as both Execution Host and Kernel Worker. A host may also run several Executions. Alternatively, the Runtime may live behind a remote provider's job API, with the Driver submitting and inspecting work there rather than starting a process managed by ArrokothI. None of these arrangements changes the meaning of an Execution or makes its ID a process identifier.

The distinction becomes useful when one side fails independently of the other. A Kernel Worker can disappear while a remote Runtime continues drafting. A Runtime process can disappear while the Kernel's persistent records still describe an unresolved Activation. In the first case, the surviving native work must be found and assessed. In the second, accepted progress must not be mistaken for proof that a live computation still exists. The [Driver's recovery contract](../mechanisms/integration.md#support-record) says what can be established about that particular native system.

Sharing a host also means sharing some physical limits. Asynchronous dispatch allows the Kernel to proceed without awaiting a Runtime's eventual Outcome, but it does not interrupt a Runtime that occupies the entire thread. A synchronous loop can still delay every other participant in that process. Deployment chooses the process or worker arrangements needed for CPU scheduling and resource control; the protocol alone supplies neither preemption nor fairness.

A Runtime's own [local workers](roles.md#local-worker) sit inside this picture. A helper gathering sources may run on the same host without becoming a Kernel Worker or a child Execution. The useful question is which responsibility the worker performs, rather than how many things happen to be called “workers” in a stack trace.

## Trusted Execution

**Trusted Execution** permits Runtime code to use filesystem, network and process capabilities supplied by its environment. The deployment intentionally allows that access. The Runtime is expected to operate with those powers, including on paths that do not pass through the Kernel.

Suppose the report Runtime has a publication service credential and can reach the service directly. It can publish by making its own native call. The Kernel can govern a publication proposed as an [Effect](actions.md#effect), but it cannot apply that admission decision to a separate call made with ambient credentials. A log entry reporting the native call afterward adds an observation; it does not turn the call into a mediated action.

“Trusted” therefore describes an access arrangement, not a judgment that every Runtime result is correct. A trusted Runtime can produce a bad draft, mishandle a reply or violate its authoring contract. The Kernel still checks protocol proposals, but those checks are not a physical barrier around arbitrary code sharing a process, credentials or mutable objects.

This mode is useful when an application wants a native framework to retain its ordinary capabilities and accepts responsibility for them. The application needs a clear account of which actions use Kernel mediation and which remain native. That account lets it interpret a guarantee accurately: a refused mediated publication establishes what happened on that path, while any native publication path has its own access and enforcement owner. [Exposure and mediation](actions.md#exposure-and-mediation) defines the action distinction; the next section adds physical containment.

## Isolated Execution

**Isolated Execution** restricts Runtime access through a physical containment mechanism under a tested threat model. The deployment establishes which files, processes, credentials and network destinations the Runtime can reach, then enforces those limits using an appropriate sandbox, container, VM or equivalent backend.

The difference appears when Runtime code does something the application did not intend. A statement in a prompt asking the report to use only its assigned workspace cannot stop a filesystem call outside that workspace. A containment mechanism can prevent the access if that restriction is actually part of its enforced policy. The evidence for isolation is the prevented access, including attempts through relevant bypass paths, rather than the Runtime's promise to behave.

Isolation and mediation answer separate questions. Isolation determines what the Runtime can physically reach. Mediation determines whether a particular request passes through the Kernel's admission and settlement path. A sandbox may permit a native call to a source-data API without mediating that call. Conversely, an application can route every publication through the Kernel while running its Runtime in a process with broad ambient access.

For the report, a useful deployment might give the Runtime access to its draft workspace while requiring publication to pass through a controlled bridge. The workspace restriction and the publication checks would each need their own evidence. The label “isolated” cannot stand in for either an exact permission decision or a description of every permitted path.

The [containment contract](../mechanisms/resources.md#containment-claims) explains what a claimed profile must test, including inherited credentials, filesystem escape paths, network access and subprocesses. These concept names do not select a backend or promise safety between arbitrary mutually distrusting tenants. The deployment must state the actual scope of the protection it provides.

## Operating profile and durability

An **operating profile**, also called a **support profile**, describes the combination of components and assumptions under which the system's guarantees have been tested. It names the relevant storage, Runtime and host versions, the failures covered, the supported recovery modes, and the limits and retention periods that apply. It connects a design statement to the environment in which someone may rely on it.

Without that connection, “the report can recover” leaves the important questions unanswered. Does recovery cover a Runtime process dying, a Kernel Worker dying, or the disk containing accepted state being destroyed? Must a native session still be available? How long will the saved draft remain accessible? A profile makes those conditions explicit enough that recovery can be assessed for a particular failure.

**Durable** means that specified accepted facts survive specified failures for a promised period. It is a qualified property of retained state. The first persistent profile covers process failure while storage survives. It does not turn loss of that storage into a recoverable event, and it does not automatically preserve a Runtime's native session.

Atomicity and durability contribute different parts of the report's continuity. Atomic acceptance keeps its recorded progress and requested actions coherent: either the whole decision commits or none of it does. Durability determines whether that coherent decision is still available after a failure. An in-memory Kernel can make atomic decisions and lose all of them when its process exits.

Even when the Kernel's state survives, native continuation remains a separate obligation. Suppose the record says the report was waiting for an editor, but the Runtime kept its suspended computation only in a process that has now died. The record of the wait can survive without the suspended computation surviving. A Driver needs a supported way to reconstruct or resume the native work; otherwise the system must expose the limitation instead of presenting a fresh run as recovered work.

Retention gives these guarantees an end as well as a beginning. A draft reference may name the right immutable content while the store no longer retains it. Keeping the reference does not keep the draft. The profile must make the resulting loss of availability visible, so that an operator can distinguish an expired recovery opportunity from a successful restoration. [Recovery](../mechanisms/recovery.md) connects accepted records to native continuation, and [retention and deletion](../mechanisms/evidence.md#retention-and-deletion) explains what must remain explicit when required data is removed.

## Three clocks

The report can have several deadlines without having one universal timeout. The editor's response, the report's usefulness and a worker's claim to coordinate it each last for different reasons. ArrokothI names three clocks so that expiring one does not accidentally decide the other two.

| Clock | What its time limit belongs to | What expiry initiates |
|---|---|---|
| Wait deadline | One registered need for an observation | End that wait with a timeout Event |
| Execution deadline | The logical lifetime of the Execution | Ordered cancellation |
| Scheduler lease | A worker's exclusive claim | Recovery inspection and possible reassignment |

These are independent identities and responsibilities, even if a deployment uses the same clock source or timer service to implement them. They must not collapse into one shared timer or field. The distinction does not require every Execution to have all three active at every moment.

### The time allowed for an observation

A **wait deadline** limits one [wait registration](core.md#wait-subscription-and-generation). The report might wait until Thursday for an editor's correction. If that registration expires, the Kernel supplies a timeout Event so that the Runtime can account for the expiry and decide what to do next.

The timeout says only that this wait ended. The editor might answer later, and a publication the report was waiting on might already have succeeded. Expiry is not evidence of either external failure or non-execution. It also does not close a separate human input request merely because the Runtime stopped waiting for it; the request has its own lifetime, described below.

The registration's generation identifies which wait a timer belongs to. If the report wakes and later registers another wait, the old timer cannot expire the new registration. The need may sound identical to a person reading the draft, but the two registrations are different. [Waits](../mechanisms/waits.md) explains how generation checks, queued observations and expiry interact.

### The time allowed for the work

An **Execution deadline** limits the logical lifetime as a whole. Suppose the report is useful only before Friday's meeting. That limit applies whether the Runtime is drafting, waiting for an editor or waiting for a child. It is not renewed just because the Runtime moves from one phase to another.

Expiry enters the Kernel's cancellation path. Accepted cancellation fences new progress and action admission; the deployment and Driver separately handle native interruption and cleanup. The deadline therefore cannot promise that a remote process stops at that instant or that a publication already admitted never happens. The [cancellation mechanism](../mechanisms/lifecycle.md#cancellation-order) specifies how cancellation is ordered against a competing Outcome.

### The time allowed for a worker's claim

A **scheduler lease** bounds a worker's exclusive claim. It gives the system a point at which an unrenewed claim becomes eligible for recovery inspection or reassignment. The lease concerns coordination ownership, not the useful lifetime of the report or the editor's time to respond.

A lease expiring tells us that the claim was not renewed in time. It does not tell us why. The process may have died, become disconnected or simply run slowly. In particular, a Runtime reached through that worker may still be changing a native session. Expiry alone cannot prove that replacing the work is safe, and it does not itself advance the Runtime's [writer epoch](identity.md#writer-epoch). An authenticated takeover decision supplies that fence after the required recovery checks.

The report may need to wait days for an editor while a deployment uses much shorter coordination leases. If both were represented by one timeout, shortening the lease would also shorten the human wait, or extending the human wait would leave an abandoned claim effective for days. Keeping the clocks separate allows each limit to serve its own purpose. Units, precision, clock source and lease-renewal machinery remain implementation choices; [recovery](../mechanisms/recovery.md#decide-permission-before-replacing-work) owns the decision to replace work.

## Child and ownership

A **child Execution** is independently managed work created through another Execution's mediated request. The creating Execution is its parent. In the report example, checking the figures becomes a child when the application needs that check to have its own addressable lifetime, authority binding, progress and result.

Parallel computation alone does not require a child. The report Runtime could check several figures using local functions or its framework's internal workers. Making the check an Execution is useful when the application needs to inspect, steer, cancel or account for it independently. That decision adds a relationship the Kernel must retain; it does not merely label a function call.

**Ownership** is responsibility for work the parent requested. **Required work** remains an obligation until its disposition and relevant result have been accounted for, or responsibility has been explicitly transferred or abandoned under policy. The parent cannot make that obligation disappear by ceasing to wait for it.

Consider the report continuing to draft while its child verifies a total. The parent is doing useful work and owes the child's result at the same time. When the parent eventually proposes completion, the Kernel checks its required obligations. A missing child result cannot be treated as handled merely because the draft looks finished. If the child reports failure, the Runtime decides what that failure means for the report; accounting for failure need not mean that the report itself fails.

The helper names **call** and **spawn** describe two ways of using this relationship. A call combines child creation with handling its required terminal result. A spawn lets the parent proceed without immediately waiting. Spawn changes when the parent attends to the child, while leaving responsibility for required work intact. These names describe the behavior a helper combines, not a requirement that a particular API spelling exist.

Ownership also grants no general access to the child's information. The child receives explicitly delegated authority and selected input or resources. The parent does not gain permission to inspect private native state merely by having created it, and the child does not inherit every permission the parent has. [Delegation](actions.md#principal-and-authority) supplies the authority limits; the ownership relationship supplies the obligation to account for required work.

**Detachment** transfers responsibility to a named durable owner that accepts it. This is stronger than forgetting a child ID or setting a “background” flag. Someone must remain answerable for the work after the original parent ends. The minimum profile may refuse detachment when it cannot establish that recipient and transfer.

**Supervision** is the application or Runtime policy that decides how to respond to child failures, retries and cancellation. The report might continue with a warning, request cancellation of related work or start a new Execution to retry a failed check. Ancestry does not choose among those policies automatically. In particular, parent cancellation does not prove that all descendants stopped, and a retry cannot reopen a terminal child lifetime. [Child coordination](../mechanisms/communication.md#children) and [supervision](../mechanisms/communication.md#finite-expansion-and-supervision) explain how the Kernel records the resulting obligations and controls.

## Message, request and correlation

A **message** is input addressed to another Execution through a mediated Effect. The destination already has its own lifetime and [mailbox](core.md#mailbox), so sending a message does not create or acquire that Execution. The sender requests communication with work it may not own.

Send success means the destination mailbox accepted the message. The destination Runtime may not have processed it, and the message may not match anything the destination is currently waiting for. For example, a correction can be safely queued while the report continues an unresolved Activation. The sender has evidence of acceptance, but it has no evidence yet that the draft changed.

A **correlation** associates an observation with the request or dependency it concerns. If the report has asked for two figures, a reply needs to say which question it answers. That association makes the reply interpretable; it does not make the sender eligible to answer. Anyone who learns the correlation identifier must not thereby gain the ability to settle the question.

A **request/reply record** supplies the missing relationship. It binds the requester, permitted responder, destination, expected reply contract and whether the request remains open, with an expiry when one is declared. The Kernel can then assess a reply against an actual outstanding request rather than trusting a payload that calls itself an answer.

Suppose the figures-checking child asks the report which reporting period to use. Its question can wake a matching parent wait. The parent handles the question and replies, then registers a new wait if it still needs the child's final result. Answering the question has not completed the check, and the earlier wait's retirement has not discharged the parent's ownership obligation. Ownership, message exchange and waiting describe different parts of the same interaction.

A permitted reply can still contain a mistaken answer. Authentication establishes who answered, and validation establishes whether the response meets its contract. Neither proves that the figures are correct. The Runtime interprets that observation in its own work. The [message mechanism](../mechanisms/communication.md#addressed-messages-and-replies) owns request closure, authenticated retries and refusal of new replies after closure.

### Questions put to a person

A **human input request** binds a question's response contract, eligible respondent and one resume owner. It gives a question a lifetime independent of the screen displaying it. The editor can reopen the application and see the same outstanding question without the application creating another opportunity to resume the work independently.

The single owner matters when a native framework already provides a human form. A Driver must map that request into the coordination model without creating a second form with its own unrelated resumption path. Otherwise two apparently reasonable answers could each advance the same native work. In a persistent profile, reconstructing the request means recovering the same question and ownership relationship, not asking it again as a new request.

Respondent eligibility is distinct from permission to create or display the question. A person authorized to view the report is not automatically the person allowed to answer every request attached to it. Accepted response handling must bind the answer to the right open request. Ordinary input containing the right-looking text cannot substitute for that decision.

A human response is also distinct from [exact consent](actions.md#exact-consent). Choosing the reporting period answers a question about the draft. It does not authorize publication to a particular account with a particular payload. If publication needs consent, that approval binds the concrete action separately.

Request expiry and wait timeout remain separate even here. The Runtime can stop waiting while a request remains open under its own policy, and a later valid answer may become relevant to a later correlated wait. A late answer cannot reopen a terminal Execution. [Human input](../mechanisms/communication.md#human-input-requests) explains the closure and routing rules; the distinction to keep is between the question's lifetime and one period spent waiting for it.

## Observation, cursor and routing

**Output observation** reads output the Kernel has accepted. It lets an application show an Emission or terminal result without submitting input to the Runtime. The editor opening the draft is observing; the editor sending a correction is participating in the Execution through a different operation.

This separation keeps the report's behavior independent of who happens to be watching. Opening two browser windows must not make the Runtime process the same correction twice, and closing the last window must not answer a pending question. Likewise, showing a child's progress beside the parent's draft does not put that progress into the parent's mailbox. If the parent needs to react, an explicit message or authorized output-to-input bridge must supply the observation as input.

An **output cursor** identifies a position within an Execution's output view so a reader can resume observation. A view is the selection of output the reader is authorized to see. The cursor tells the application where to continue reading within that view; it does not supply the authority to read it.

For example, the editor's browser may reconnect with a cursor after losing its connection. The application must still authorize the resumed read. If access was revoked, possession of yesterday's cursor does not restore it. If retention has removed the needed output, the response must expose that gap rather than return an empty stream that looks as though nothing happened. Stable output identities let a consumer recognize repeated delivery while resuming. [Output replay](../mechanisms/output.md#authorized-subscriptions-and-replay) owns the precise continuation contract.

A **routing obligation** is a recorded duty to deliver addressed input later. It covers a different gap: the sender has committed something that must reach a destination, but the destination has not yet accepted it. A durable routing obligation preserves that duty through the failures covered by its storage profile.

Return to the figures check. The child can finish and record its result while delivery to the parent is still outstanding. A routing obligation makes that unfinished delivery visible and recoverable. Retrying the route sends the same result under the same identity; it does not run the child again. Only destination acceptance creates the Event that can wake the parent. The source's promise to route is not evidence that the parent's mailbox already contains the result.

External delivery is another distinct responsibility. Making the final report available to an authorized output reader does not establish that a publication service delivered it to an audience. If business completion requires that delivery, the Runtime must request and account for the action before completing. Otherwise external delivery may remain pending after the Execution's terminal result is recorded. [Observation and sending](../mechanisms/output.md#observation-does-not-send-input) and [external delivery](../mechanisms/output.md#external-delivery) explain those two paths.

## Backpressure and cleanup debt

**Backpressure** limits incoming or admitted work when the system lacks capacity to keep its promises. The relevant moment is before acceptance: once the Kernel has accepted input or output, silently discarding it would change the meaning of the decision it already recorded.

Suppose corrections arrive faster than the report can consume them. A deployment with a full mailbox must refuse additional ingress before accepting it. It cannot answer that a correction was accepted and later erase it to make room. The same principle applies when output cannot be retained: the system must hold or reject the proposed acceptance before committing a promise it cannot fulfill. Capacity refusal tells the caller what did not happen; silent loss leaves the caller relying on a false record.

Capacity has several owners. The Kernel bounds the mediated work it accepts. The Runtime or provider bounds internal computation such as model calls, while the host enforces physical resource limits. Slow output readers create pressure in yet another place. Limiting the number of Executions does not automatically bound every model call or byte of output they can produce, so a profile must state which limits apply at each layer.

Waiting deserves separate attention because a logically quiet Execution may still cost resources. The report might be WAITING in the Kernel while its native framework retains a process, a connection or a provider slot. Conversely, a supported Runtime may be able to remain dormant with only retained state. The lifecycle label does not distinguish those operating costs; the Runtime and deployment contracts do.

**Cleanup debt** is known resource cleanup that remains outstanding, together with its responsible owner and its lifetime or cost consequences. A failed workspace deletion, a native job still needing cancellation, or a resource retained for unresolved work can remain relevant after the report has ended. Recording that debt prevents a terminal lifecycle state from being mistaken for a completed cleanup operation.

The owner also has to know what may safely be removed. Closing a client releases an attachment; deleting the workspace destroys a resource that another attempt or child may still need. Retained data may be required to reconcile an uncertain publication even after the report is cancelled. Cleanup must respect those obligations while recording when retention or privacy decisions end a recovery guarantee. The [resource lifecycle](../mechanisms/resources.md#resource-operations) supplies the release and destruction distinctions, and [capacity, cancellation and retention](../mechanisms/resources.md#capacity-cancellation-and-retention) connects them to the work still owed.

For the person operating the report system, this means that “finished” has a precise scope. The Execution's result answers whether its logical work ended. Its routing records answer what still needs to reach another participant. Its action evidence answers what is known about publication. Its cleanup debt answers what resources still require attention. Those records can reach their conclusions at different times, and the design keeps each conclusion attached to the responsibility that can actually establish it.
