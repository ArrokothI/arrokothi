# Operational and communication terms

An [Execution](core.md#execution) has a lifetime of its own. The process doing its work may stop before that lifetime ends. A remote job may keep running after the Execution is cancelled. Another Execution may owe it an answer, even though nobody is currently waiting on a connection between them.

To reason about those situations, we need more than the Execution's current state. We need to know where the code runs, which failures the deployment can recover from, and who remains responsible for unfinished work. This page develops that vocabulary. “Operational” here concerns running and coordinating the system; it is not another name for the callable [operations](actions.md#operation) an Effect can request.

The weekly report from [core](core.md) remains our example. Its Runtime prepares a draft, may ask another Execution to check the figures, and may need an editor's answer before publishing. The report gives us three connected sets of questions:

- **Where does the work run, and what can it actually reach?** Kernel Worker and Execution Host name process roles. Trusted and Isolated Execution describe the access the deployment permits.
- **What survives an interruption, and what does an expiry mean?** An operating profile bounds recovery promises. Three separate clocks govern a wait, the Execution's lifetime, and a worker's claim.
- **Who owes work to whom, and what has really been delivered?** Children, messages, observations and routing obligations describe different relationships. Backpressure and cleanup debt account for responsibilities before and after the useful computation.

These are terms of the target design, not a list of shipped facilities. [Target, not shipped](../README.md#target-not-shipped) explains that distinction and points to the implementation and status owners.

## Kernel Worker

A **Kernel Worker** is a process acting in the role of carrying out Kernel transitions and coordinating accepted work. The Kernel names the responsibilities; Kernel Worker names the role that executes them.

When the application submits the report's initial input, a Kernel Worker can carry out the creation decision. When the report is ready to advance, a Kernel Worker can record the dispatch and send the resulting Activation through a Driver. Neither task requires the worker to understand how the report is written. It handles the coordination decision, not the Runtime's model loop or document-generation algorithm.

That distinction matters when the computation is slow. After handing off an Activation, the coordinator need not wait for the draft to finish before handling another Execution. The eventual Outcome arrives through its own acceptance boundary. A delivery acknowledgment only concerns the handoff; it is not a substitute for that Outcome. The [execution cycle](../mechanisms/execution-cycle.md) explains how dispatch and acceptance remain separate.

A Kernel Worker need not be a separately deployed service. The application's backend can perform this role alongside ordinary request handling. A deployment can instead dedicate processes to Kernel work. Calling something a Kernel Worker does not select either arrangement, require a new process for every Execution, or require the Kernel to own a custom queue or database.

Nor does a particular worker become the Execution's identity. If the worker is replaced, the replacement needs the accepted records, not the old process's private recollection of what it was doing. Where the deployment's storage preserves those records, they provide the basis for reconstructing coordination. Whether native computation may then continue is a separate recovery question, addressed below under [operating profiles](#operating-profile-and-durability).

## Execution Host

An **Execution Host** is the process role that runs Runtime code. A Runtime supplies the computation and interprets its saved continuation; the host supplies the place where that computation executes.

The same process can be both a Kernel Worker and an Execution Host. In an embedded application, the code that accepts the report's input and the code that drafts the report may run in one backend process. Their responsibilities remain different even though a process monitor shows only one process. Separating them later changes deployment and failure handling; it does not turn the drafting algorithm into Kernel behavior.

A host can also run work for several Executions. The number of processes is therefore not a count of logical lifetimes. Conversely, a remote Runtime may be accessible only through a provider's job API. The Driver can submit and inspect a job without ArrokothI owning the provider's host machinery. The [deployment arrangements](../deployment.md#roles-are-not-required-services) describe these possibilities without choosing one as mandatory.

Independent placement makes independent failures easier to see. The backend coordinating the report might restart while the remote drafting job continues. Or the drafting host might disappear while the Kernel's accepted records remain available. In the first case, losing the coordinator's connection is not evidence that the job stopped. In the second, retaining the Kernel record is not evidence that the Runtime's native continuation survived.

Sharing a process creates a different concern: asynchronous coordination is not CPU preemption. A Runtime that enters a tight synchronous loop can prevent other work in that process from running, even though the protocol does not require the Kernel to await its result. The host or deployment must supply whatever execution separation and physical limits the application needs. A nonblocking API cannot supply those guarantees by itself.

Use the qualified names when discussing failures. A **Kernel Worker** advances Kernel state; an **Execution Host** runs Runtime code. A [local worker](roles.md#local-worker) is work organized inside a Runtime, such as one of the report's internal research tasks. Creating such a local worker does not automatically create a new host, a new Kernel Worker, or a child Execution.

## Trusted Execution

**Trusted Execution** is an execution mode in which the deployment intentionally allows the Runtime to use ambient host capabilities. Filesystem access, network access and subprocess creation are examples of capabilities the Runtime may already possess without asking the Kernel for each use.

Suppose the report Runtime reads source files from a workspace supplied by the application. It may do so directly if the deployment permits that native access. No Effect is required merely to make the read look like other work in the system. The important limit is that the Kernel cannot claim to have admitted or governed a read that never passed through its action boundary.

The same reasoning applies to more consequential work. If the Runtime holds credentials and network access sufficient to publish the report itself, denying a proposed publication Effect does not disable those credentials. The denial governs the mediated request. It does not prevent a second, native request made through the host's capabilities.

“Trusted” therefore describes a deployment decision, not a judgment that the Runtime is always correct. Its inputs can still contain false claims or hostile instructions. Its code can still contain bugs. The deployment is accepting that this code can exercise the ambient powers it has been given; the Kernel's action checks are not a physical barrier around it.

A Trusted Execution can nevertheless use Kernel mediation for important actions. The application might deliberately keep publication behind a governed service while allowing native access to local drafting files. The claim must name the path: publication through that service is mediated; native workspace activity has its own access owner. A log of the latter does not turn it into mediated work after the fact.

[Exposure and mediation](actions.md#exposure-and-mediation) explains the action-side distinction. The next section explains the separate deployment claim needed when access must be prevented even if the Runtime does not cooperate.

## Isolated Execution

**Isolated Execution** is an execution mode in which the deployment physically restricts Runtime access under a declared, tested threat model. The restriction must be enforced by the environment, rather than depending on the Runtime choosing to follow an interface.

For the report, the application might allow the Runtime to read one supplied workspace while preventing it from reading the backend's credentials. That requires a real boundary around the files, credentials and paths the Runtime can reach. Naming the Runtime “isolated,” or putting it in a container with broad host mounts, establishes no such result. The claim rests on what the environment actually permits and prevents.

Credentials that grant broader powers than the Runtime should exercise belong outside the isolated code, with the application or a narrowly scoped trusted adapter. Giving those credentials to the Runtime and asking it not to misuse them changes the trust assumption. Restrictions on unrelated host files do not recover the authority already handed over.

A threat model makes the claim specific. It identifies the protected resources, the access an uncooperative Runtime might attempt, and the assumptions under which the boundary is expected to hold. A sandbox, container or VM may supply parts of that boundary. Which backend is adequate depends on the claim and its tests; the term does not select a universal isolation product.

Isolation and mediation answer different questions:

- **Isolation:** can this Runtime reach the resource or service at all, given the deployment's restrictions?
- **Mediation:** does this particular action pass through Kernel admission and settlement?

An isolated Runtime may be permitted to contact a research API directly. That call remains native even though the surrounding environment is contained. In the other direction, a Trusted Runtime may route every publication request through a mediated operation while retaining broad native access elsewhere. Neither arrangement is contradictory. The two properties must be described independently.

This is also why evidence of observation is insufficient for a prevention claim. Seeing an unauthorized attempt in telemetry proves that the attempt was observed. To claim containment, the deployment must show that the prohibited access was blocked, including relevant bypass paths. [Containment claims](../mechanisms/resources.md#containment-claims) gives the physical tests and their owners. Kernel protocol tests do not replace them.

## Operating profile and durability

An **operating profile**, also called a **support profile**, states the tested environment and the limits of the guarantees offered in that environment. It connects the logical design to a particular combination of storage, Runtime, Driver and host behavior.

“Can this report survive a restart?” is not answerable from the word *Execution* alone. We need to know what restarted, where the accepted records were kept, whether the native work still exists, and what the supported recovery path can do. A profile makes those assumptions explicit instead of letting every reader supply a different meaning for “restart.”

A useful profile answers several kinds of question together:

- **Versions and environment:** which storage, Runtime and host versions were tested?
- **Failures:** which components may disappear, and which backing resources are assumed to survive?
- **Continuation:** can the Driver reattach, resume a checkpoint or safely replay this phase of work? When must it hold or refuse instead?
- **Bounds:** what capacity and retention limits apply, and who owns remaining cleanup?

These answers describe support; they do not require a new universal Kernel object or a particular configuration format. An explicit unsupported case is more useful than a broad promise whose failure assumptions are unknown.

### Durable facts are not immortal facts

**Durable** means that specified facts survive specified failures for the promised period. All three parts matter. A profile can preserve accepted Kernel records across process loss without promising survival of destroyed storage, and it can retain completed output for a stated period without promising that output forever.

Atomicity answers a different question. If accepting an Outcome installs its progress and action intents together, the accepted record is coherent: it does not say publication was requested while retaining progress from before that request. An in-memory implementation can satisfy that all-or-nothing rule and still lose the entire record when its process exits. Atomic acceptance is not itself a storage-survival guarantee.

The first persistent profile in the design covers process failure with surviving storage. It does not extend that promise to storage disaster, multi-region failover or safety between mutually distrusting tenants. Moving the same code behind a remote API does not enlarge the claim; the remote arrangement adds transport and ownership questions that need their own evidence.

### Recovering the record is not recovering the computation

Consider a report that has saved its draft and is waiting for the editor. If the profile preserves the accepted Kernel records, a replacement worker can recover that accepted progress and the recorded wait. That answers what the Kernel had accepted before the process failed.

It does not answer whether the Runtime can use the progress. An immutable native checkpoint may still be available with compatible code. A reference to a running job may instead lead to a job that is unreachable or gone. A live coroutine pause may have existed only in the lost host's memory. These are different continuation guarantees even when the Kernel stores a small reference for each of them.

The [recovery mechanism](../mechanisms/recovery.md#decide-permission-before-replacing-work) keeps those questions in order: reconstruct accepted records, then establish permission and ability to continue native work. When safe continuation cannot be established, the system must report that limitation rather than present a fresh Runtime as if it had been restored. A profile can honestly preserve evidence while refusing automatic resumption.

The same discipline applies at the end of retention. If required data has expired or been deleted, an explicit gap or unavailable-recovery result tells the caller what promise ended. An empty answer that looks like “nothing ever happened” would erase the distinction between missing evidence and evidence of absence. [Retention and deletion](../mechanisms/evidence.md#retention-and-deletion) develops that boundary.

## Three clocks

Time limits are easy to collapse into one `timeout` because their implementations may all compare an instant with a deadline. Their meanings are different. One concerns an observation the Runtime needs, another the whole logical lifetime, and another a worker's temporary claim.

| Clock | What it bounds | What expiry means |
|---|---|---|
| **Wait deadline** | One registered wait | End that wait and produce its timeout Event |
| **Execution deadline** | The permitted lifetime of the Execution | Enter the ordered cancellation path |
| **Scheduler lease** | A worker's exclusive claim | Make recovery inspection or reassignment eligible |

### The wait deadline: how long to await this observation

A wait deadline belongs to a [wait registration](core.md#wait-subscription-and-generation): the Runtime's accepted declaration that it needs a Kernel-visible observation. The deadline ends that registration, not necessarily the activity that might eventually produce the observation.

If the report is waiting for a publication result and the wait expires, the Kernel can tell the Runtime that the deadline passed. It cannot conclude that publication failed. The service may still be processing the request, or it may have published the report and lost its response. Those possibilities require action evidence, not a stronger interpretation of the clock.

The deadline also belongs to one registration rather than to every future wait for the same result. If the Runtime later waits again, that is a new generation. A timer left over from the earlier registration must not expire the later one. [Wait expiry](../mechanisms/waits.md#ending-a-wait) specifies the generation checks and the timeout Event carried to the Runtime.

### The Execution deadline: how long this lifetime may continue

An Execution deadline bounds the work's logical lifetime. Its expiry uses the same ordered cancellation path as an explicit cancellation request. It is not an ordinary Event that a busy Runtime may choose to read later.

This lets an application place an overall limit on the report independently of any particular wait. The editor's answer might still be timely under its wait deadline, while the application has already ended the report's lifetime. Conversely, a short wait can expire while the Execution still has time to decide what to do next.

Logical cancellation does not prove physical interruption. A remote job can continue after the Kernel has fenced further progress, and an already admitted action may still execute. The [cancellation rules](../mechanisms/lifecycle.md#cancellation-order) determine which accepted decision wins a race; the Driver and deployment separately determine what can actually be stopped.

### The scheduler lease: when a claim needs reconsideration

A **scheduler lease** limits how long a worker's exclusive claim lasts. Expiry permits the system to investigate or reassign that claim. It does not establish that the worker died.

Suppose the drafting host becomes unreachable. A network partition and a dead process can look the same to the coordinator, but only one guarantees the old process is no longer writing. Starting a replacement merely because time passed could leave two native workers modifying the same session.

A lease is therefore not the [writer epoch](identity.md#writer-epoch) that fences accepted Outcomes. Lease expiry does not itself advance the epoch. An authorized takeover changes which attempt may commit, after the Driver's native-continuation requirements have been satisfied. Where those requirements cannot be established, holding the work is safer than treating silence as permission to repeat it.

The three clocks need independent identities and expiry consequences; they must not be collapsed into one timer or field. For example, an editor may be allowed to reply by Friday while the Execution has a separate overall deadline. A worker's lease, while it holds a claim, can operate on a much shorter timescale. Renewing that lease must not extend either deadline, and ending the wait must not be mistaken for loss of worker ownership. Units, precision, time sources and renewal machinery remain implementation choices rather than promises made by these examples.

## Child and ownership

A **child Execution** is a separate logical lifetime created through another Execution's mediated request. The creating Execution is its parent. The child has its own addressability, authority binding and lifecycle; it is not merely the next function the parent's Runtime happens to call.

The report may need a statistical check. If the check is just an internal step, the Runtime can run a function or a local worker and incorporate the answer into its own progress. If the application needs to address, inspect, cancel or recover that check independently, it can be a child Execution. Neither parallelism nor the use of another agent framework makes that decision automatically.

**Ownership** means responsibility for the work that was started. It does not mean that parent and child share every permission or every piece of state. The report may be responsible for obtaining the check's result without being entitled to read the child's private native transcript. The child receives explicitly delegated authority, not all the powers of whoever created it. [Delegation](actions.md#principal-and-authority) explains how the requested powers are limited by the parent's delegable bound and current policy.

### Required work must be accounted for

**Required work** is work whose obligation remains until its result has been accounted for, or responsibility has been explicitly transferred or abandoned under policy. Children default to required owned work. The parent need not spend the interval waiting idly, but continuing with other work does not remove the obligation.

A required result need not be a successful result. The statistical check might fail, and the report Runtime might decide that the report can still be useful if it states that the figures could not be verified. That is a decision about the meaning of the result. Forgetting that the check exists is not such a decision.

This distinction explains the two helper patterns, **call** and **spawn**. A call combines child creation with handling the required terminal result. A spawn creates the child without arranging immediate waiting for that result. Spawn changes when the parent attends to the child; it does not make the child nobody's responsibility. These names describe coordination patterns, not a requirement to express them as synchronous function calls or a particular API spelling.

Before accepting completion, the Kernel checks the required obligations it knows about. The parent must have accounted for their results, or made an explicit policy-permitted disposition of responsibility. The [completion accounting rule](../mechanisms/lifecycle.md#completion-is-an-accounting-check) owns that check. It prevents “the parent has reached its last line of code” from silently meaning “all work the parent started is finished.”

### Detachment changes responsibility; supervision decides the response

**Detachment** transfers responsibility to a named durable owner that accepts it. The transfer matters because the original parent may no longer be present when a result or a problem arrives. Merely removing a parent link, returning an identifier to a caller, or ceasing to wait does not identify who will account for that later work. The minimum profile may refuse detachment rather than offer a transfer it cannot support.

**Supervision** is application or Runtime policy for responding to child failures, retries and cancellation. It might let the report continue with a failed check, request cancellation of related work, or authorize a new retry Execution. The parent-child relationship alone does not choose among those policies. The policy also needs explicit limits: a child failure cannot authorize an unbounded series of replacements or an unspecified cancellation cascade.

Parent cancellation consequently does not prove that the child stopped. Parent failure does not erase responsibility for a live child. Terminal work never reopens merely to try again; a retry that needs a new lifetime is a new Execution. [Children and supervision](../mechanisms/communication.md#children) describes how the ownership record, result routing and declared policies preserve accountability across these cases.

## Message, request and correlation

A **message** is addressed input sent to another Execution through a mediated Effect. Sending one does not create the destination or make the sender its owner. A peer can already exist, have its own work in progress, and be waiting for something unrelated.

This gives message sending a deliberately limited success condition: the destination's mailbox accepted the input. That is stronger than “the sender recorded an intention to send” and weaker than “the destination Runtime processed it.” A message can be safely retained without waking its destination, because only input eligible under the destination's current wait can end that wait.

Acceptance also does not establish payload truth. The statistical checker can receive a message containing incorrect figures; accepting it records the admitted input and its actual source, not a verdict on the numbers.

Stable send and delivery identities make retry compatible with that promise. If the destination accepted a message but its acknowledgment was lost, repeating the same send must recover the earlier acceptance rather than add another mailbox entry. A sender-side routing intention alone is not enough to report that success: the destination still has to accept the input.

Suppose the statistical-check child asks the report for a missing parameter. If the report's wait permits that question, the report can handle it and then return to waiting for the check's terminal result. Receiving the question changes what the report needs to do next, not who owns the check. Ownership, communication and waiting are separate relationships, which is why a child can ask its parent a question without either becoming the other's supervisor.

Permission to send is separate too. Knowing the destination's Execution ID, owning a related child, or being able to read its output does not grant message-send authority. The [addressed-message mechanism](../mechanisms/communication.md#addressed-messages-and-replies) binds the actual sender and authorizes the destination before accepting the operation.

### Correlation connects records; it does not authorize a reply

A **correlation** associates an observation with the request or dependency it concerns. It answers “which question is this answer about?” rather than “may this caller answer?”

The report might have two open questions about different datasets, both answered with the word “Europe.” Content cannot tell which question was answered. A correlation lets the system keep those observations separate even when their payloads are identical. It also keeps a delayed answer attached to its original question instead of whatever question is newest when the answer arrives.

Knowing that correlation is not permission to use it. An unauthorized peer that copies the right identifier has supplied an addressable claim, not an authorized response. A result attributed to an external action likewise needs its trusted settlement path; the identifier alone cannot establish that the action ran.

A **request/reply record** carries the agreement that a correlation alone cannot carry. It binds the requester and permitted responder, the delivery destination and expected reply contract, whether the request is still open, and an expiry when one is used. An incoming reply can then be checked against a particular open request rather than accepted merely because its shape looks plausible.

An `expectsReply` declaration therefore needs a real request/reply record, not just a correlation attached to an ordinary message. Repeating the same authenticated request can recover the same accepted record; reusing its identity with changed request content is a conflict, not a way to edit an agreement already in flight.

The **notify** and **ask** patterns differ at this boundary. Notify finishes its obligation when the destination mailbox accepts the message. Ask leaves a required reply obligation open until a valid reply, expiry or policy-permitted abandonment closes it. Delivery of the question is only the beginning of an ask. If the request later expires, that closes the question's lifetime; it does not prove that the peer did no work in response.

Closure belongs to that request. A new answer after closure is not another opportunity to satisfy it. An exact authenticated retry of an already accepted answer can instead recover the original receipt or disposition within retention. The record distinguishes those cases without requiring the Runtime to guess whether the sender meant “again” or “something different.”

### A human input request is not just a form

A **human input request** is a recorded question with a response contract, an eligible human respondent and one resume owner. The form or chat view is how the application presents that question; it is not the question's identity.

A single resume owner means one path is responsible for turning the accepted answer into resumed work. The Kernel and a native framework must not each treat their own question record as independent permission to resume the same computation.

The editor may close the browser and return later. In a profile supporting durable human interaction, the request remains the same request across that interruption. Rendering the form twice must not create two independent opportunities to resume the same work. The record, not the lifetime of a browser connection or an in-memory callback, binds the answer to the waiting computation.

Accepting the response requires authentication, eligibility and validation against the bound response contract. Sending identical text as ordinary Execution input does not close the request. The words may be the same, but only the proper response path establishes who answered which owned question.

Request expiry and wait expiry are distinct. A wait deadline ends one registration of interest in an observation. It does not by itself close the underlying human request. Keeping them separate allows the Runtime to respond to a timeout without falsely recording that the person answered or that the question ceased to exist. [Human input lifecycle](../mechanisms/communication.md#human-input-requests) owns closure, late responses and the single-resume-owner rule.

An answer also proves only what that response contract establishes. “Use the European dataset” can settle a parameter question without approving publication of the resulting report. Even “looks good” sent as ordinary input is not automatically [exact consent](actions.md#exact-consent) to a bound publication action. The human-input, consent and action-settlement paths must not be substituted for one another because their messages happen to look alike.

## Observation, cursor and routing

**Output observation** is reading accepted output without supplying new input or changing the Runtime's progress. It neither consumes mailbox input nor fulfills a wait. An editor looking at the statistical check's partial table is observing it. The report Execution has not thereby received that table as an Event, and its Runtime has not thereby accounted for it.

That separation keeps a UI from becoming an accidental participant in the protocol. Opening a second browser tab must not make the Runtime process the same result twice. Disconnecting an output reader is not, by itself, cancellation of the work. If the application wants an observation to cause input elsewhere, it needs an explicit authorized message or output-to-input bridge, not an implicit consequence of reading.

An **output cursor** identifies a position in an Execution's output view. It lets a reader ask where to resume without making the connection itself the record of what was available. The application owns its consumer connections and cursor storage; the Kernel supplies authorized access to retained output.

A cursor is useful only together with current access and available history. Holding yesterday's position does not preserve yesterday's permission to read, and it cannot recover output beyond the retained window. Reconnection and disclosure are authorized again; the cursor is not a credential. A changed view may require rebinding or refusal, while an expired position needs an explicit gap rather than a successful empty result.

Replay may overlap with output the reader has already seen. Stable output identities let the reader recognize those repeats without demanding exactly one network delivery. Positions order output within the selected Execution and view; they do not create a global order between the report and its child. [Authorized output replay](../mechanisms/output.md#authorized-subscriptions-and-replay) develops these rules.

### Forwarding is a new input path

An output-to-input bridge does two different jobs: it reads a producer's output and sends addressed input to a destination. It needs authority for both, including permission to disclose the output to that destination. Permission to view the statistical check's table does not alone permit injecting it into the report's mailbox.

The bridge must also preserve the real producer's provenance, distinguish repeated deliveries through stable identities, and own its forwarding checkpoint and retention requirements. Otherwise reconnecting can duplicate accepted input, or falling behind can silently skip source output that has expired. Reading a subscription does not implicitly create this machinery; the minimum profile does not promise automatic forwarding.

### A duty to deliver is not a completed delivery

A **routing obligation** is a durable responsibility to deliver addressed input later. It records work still owed between a source-side decision and acceptance at the destination. It is not evidence that the destination already has the Event.

This distinction matters when the statistical check finishes. Its terminal result may be accepted before the parent mailbox accepts the corresponding input. The system must not forget the delivery in between. Committing the result with a routing obligation lets the responsibility survive according to the supported durability contract, even if notification fails or routing must be retried.

The parent can wake only when the Event actually reaches its accepted mailbox state. Recording the child's routing obligation cannot wake the parent early with input that does not yet exist there. Nor does retrying the delivery mean rerunning the child. [Child-result routing](../mechanisms/communication.md#children) owns that separation and the handling of a parent that has already become terminal.

Observation, routing and external sending therefore make different promises. Retaining the draft can fulfill the obligation to make accepted output available to authorized readers. Delivering a message to another Execution requires destination-mailbox acceptance. Sending the report through an external publication channel is separate action work, with its own permission and outcome uncertainty. The [output mechanism](../mechanisms/output.md#external-delivery) explains why that delivery may remain pending after logical completion when the application has not made it a prerequisite for business success.

## Backpressure and cleanup debt

**Backpressure** bounds the work a system accepts or queues when a capacity limit is reached. In this design, the important decision occurs before the system promises an acceptance it cannot retain or fulfill under its contract.

Suppose the report's mailbox has reached its declared capacity. Refusing a new input tells the producer that the Kernel did not accept responsibility for that input. Accepting it and then dropping an older unprocessed Event would tell two callers that their input was accepted while preserving only one of those promises. Backpressure avoids creating that contradiction in the first place.

Capacity is not one number shared by every layer. The Kernel may bound queued input or admitted mediated work. The Runtime or provider must bound internal model calls. The host must enforce physical resource limits. A quiet Kernel can coexist with an expensive native job, just as an Execution waiting for a person can retain storage and native resources without doing useful computation. The [capacity rules](../mechanisms/resources.md#capacity-cancellation-and-retention) separate those costs and their enforcement owners.

A slow output reader needs bounded buffering or disconnection with a chance to resume within retention. It cannot indefinitely block Runtime progress or force records to be kept without limit. This is different from being unable to retain the output promised by an Outcome. If that required retention cannot be provided, the system must hold or refuse the Outcome before accepting it, not commit the new progress and quietly discard its output.

Backpressure is also not a Runtime-declared wait. A full ingress path has not accepted an Outcome asking for a dependency, and it must not invent `WAITING` merely to describe overload. A lifecycle label cannot substitute for the decision to admit less work.

**Cleanup debt** is known unfinished resource cleanup with a responsible owner and consequences for lifetime or cost. It remains visible work even when the useful computation has ended.

If the report is cancelled while a remote job is still alive, recording `CANCELLED` does not stop that job or remove its charges. If a workspace must be retained for recovery or an outstanding action, deleting it immediately would destroy something still needed. Keeping it indefinitely without an owner or retention policy would create a different failure. Cleanup debt names the remaining responsibility rather than pretending either terminal state or elapsed time discharged it.

Cleanup must also distinguish access from existence. Releasing a worker's client connection does not destroy the workspace behind it, and destroying a workspace is not an appropriate substitute for releasing one worker's access. The [resource binding and attachment](state.md#resource-binding-and-attachment) concepts explain that distinction; [resource operations](../mechanisms/resources.md#resource-operations) specify how cleanup respects ownership and retained references.

Backpressure and cleanup debt meet at opposite ends of the same promise. Before accepting work, the system needs capacity to honor it. After the Execution ends, somebody must still account for obligations the terminal decision did not discharge. A complete operational picture therefore asks more than whether the report says `COMPLETED` or `CANCELLED`: which accepted facts remain available, which native work may still be running, which deliveries are still owed, and who is responsible for the resources left behind?