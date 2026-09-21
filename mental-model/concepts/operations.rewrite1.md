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
