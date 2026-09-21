# Operational and communication terms

The vocabulary so far has lived mostly inside one Execution: what it runs, what it asks the world to do, and how sameness is decided when requests repeat. This page answers the three wider questions around that Execution. **Where does the system run, and what may it touch?** — the two process roles, the two trust modes, and the operating profile that says which guarantees a deployment actually claims. **What time limits apply?** — the three clocks, which must never be folded into one. **How do Executions relate to each other and to observers?** — children and ownership, messages and correlation, observation and routing, and the debt that remains when work ends but its traces do not.

Those are three independent families, and the sections below follow them in that order:

- **Running the system** — [Kernel Worker](#kernel-worker), [Execution Host](#execution-host), [Trusted Execution](#trusted-execution), [Isolated Execution](#isolated-execution), [Operating profile and durability](#operating-profile-and-durability).
- **Time** — [Three clocks](#three-clocks).
- **Relating Executions** — [Child and ownership](#child-and-ownership), [Message, request and correlation](#message-request-and-correlation), [Observation, cursor and routing](#observation-cursor-and-routing), [Backpressure and cleanup debt](#backpressure-and-cleanup-debt).

Each term is defined here and nowhere else. How the terms behave together belongs to their mechanisms: [deployment](../deployment.md) summarizes the first family as an operating view, while [communication](../mechanisms/communication.md), [output](../mechanisms/output.md) and [resources](../mechanisms/resources.md) specify the interactions behind the third. The weekly report and its cast — the application, the editor, the publication service — return as the running example.

## Kernel Worker

A **Kernel Worker** is the process role that performs Kernel state transitions and coordinates accepted work.

Role, not service, is the load-bearing part of that sentence. Naming a responsibility rather than a machine leaves every deployment free to place it where it fits: a command-line tool can carry the worker's duties inside its own process, while a larger deployment can run dedicated worker processes apart from the code that performs Runtime work. Had the architecture instead defined "the worker service," every deployment — including a script that prepares one report and exits — would owe the reader an explanation for why it has no such service. The question this term answers is *who does the Kernel's transitions here*, never *which box on the diagram runs them*.

A worker is not the Kernel. The [Kernel](core.md#kernel) is a set of responsibilities — accepting and recording Execution state changes, addressed observations and mediated action requests. The worker is whatever process currently carries those responsibilities out. That distinction matters the moment there is more than one worker: two processes cannot both advance the same Execution unchecked, so the right to advance one is held under a bounded exclusive claim, the [scheduler lease](#three-clocks), whose expiry makes a worker's claim eligible for inspection and reassignment. What a replacement worker reconstructs after a crash — and what it must refuse to guess — belongs to [recovery](../mechanisms/recovery.md).

## Execution Host

An **Execution Host** is the process role that runs Runtime code.

One process may be both host and Kernel Worker, and a host may run several Executions. The logical separation between coordinating work and performing it needs no process boundary: the report's Runtime can run in the same process that accepts its Outcomes, and five report Executions can share one host. Sharing is cheap and also shared-fate — a process that dies takes both roles with it — which is exactly the kind of failure assumption an [operating profile](#operating-profile-and-durability) records rather than this page.

A host is not a Runtime. The [Runtime](core.md#execution-runtime) is the code or service performing an Execution's work; the host is where that code runs. Keeping those apart is what lets a deployment change one without redesigning the other: the same Runtime can move from an in-process host to a pool of worker machines, and a host can be replaced without the Runtime's accepted progress changing meaning. Where no ArrokothI-managed host fits, a remote native provider may supply a job API instead — submitting work to someone else's machines through an adapter rather than running it on one's own.

## Trusted Execution

**Trusted Execution** is the choice to let Runtime code use the ambient filesystem, network and process powers its host supplies.

The word *trusted* names a placement of trust, not a safety proof. Choosing it says: this code is permitted to reach what the host can reach, and no Kernel mechanism stands between the two. That is often the right choice — a personal CLI tool, a single-tenant backend whose Runtime was written by the same team — and making it explicit is what stops such a deployment from implying a containment it never built. The Kernel's guarantees in this mode cover only the [mediated paths](actions.md#exposure-and-mediation): actions the Runtime actually routes through admission and settlement. Everything the Runtime does with its ambient powers stays outside those verbs.

An interface contract alone does not change that. An interface tells cooperating code how it is meant to be called; code that is not cooperating — hostile, compromised, or merely buggy — is under no obligation to use it. Same-process code holding the same credentials and objects cannot be contained by a type signature, however carefully written. Where the threat model needs more than trust, the answer is the next section, not a stricter interface.

## Isolated Execution

**Isolated Execution** is the choice to physically contain what a Runtime can reach, under a tested threat model, using a sandbox, container, virtual machine or equivalent backend.

*Tested threat model* does the real work in that definition. It states who the contained party is assumed to be and what reach remains permitted to it — a Runtime that may call one approved external API is still isolated if the model says so and the enforcement holds. A container label alone establishes none of this: containment is a claim about what was actually prevented, and it is earned by running the attacks — inherited credentials, path traversal, egress tricks, subprocess bypass, resource exhaustion — against the real backend, not by reviewing a design. [Containment claims](../mechanisms/resources.md#containment-claims) owns the evidence such a claim has to rest on.

Isolation and mediation are independent in both directions, and each direction needs its own example because each surprises a different reader. An isolated Execution can still make an unmediated native call that its policy permits: the call stays inside the sandbox, reaches the one approved API, and never passes through Kernel admission — contained, but not mediated. A fully mediated Execution can run on a bare host with no sandbox at all: every governed action goes through admission and settlement, while the Runtime's ambient powers remain whatever the host supplies — mediated, but not isolated. Choosing one therefore never answers the other, and a deployment that needs both must build and test both. Telemetry, which merely observes, is neither.

## Operating profile and durability

An **operating/support profile** is the deployment's published claim sheet: the tested storage, Runtime and host versions, the failure assumptions, the recovery modes, the limits, and the retention windows.

*Published* matters as much as *tested*. A guarantee that exists only in an operator's head cannot be relied on by anyone building against the deployment, and cannot be checked when it breaks. The profile is where "this deployment survives a process crash" stops being folklore and becomes a statement with versions and conditions attached — which storage, which failure, which recovery procedure, for how long. [Deployment](../deployment.md) shows what such a profile looks like for the common shapes, from an in-memory CLI to separate worker fleets.

**Durable** therefore never stands alone. It means that the specified accepted facts survive the specified failures during the promised period — durable *against what*, *of which facts*, *for how long*. Asked "is this deployment durable?", the only honest answer points at the profile. An unqualified yes would have to cover every fact against every failure forever, which no deployment provides.

The first persistent profile is deliberately narrow: a process crash with surviving storage. That covers the backend whose process dies while its database lives — the common case — and explicitly nothing wider: not a destroyed disk, not staying up when a whole site goes down, not safety between mutually distrusting tenants. Each wider promise needs its own machinery and its own tests, so the profile grows by stating more, never by implying more. What inspection must show at each gate, and what a benchmark result may actually be credited with, belongs to [evidence](../mechanisms/evidence.md).

## Three clocks

Three different questions about an Execution have a time limit, and each is answered by its own clock. They expire for unrelated reasons, and their expiries mean different things.

| Clock | The question it bounds | What expiry does |
|---|---|---|
| Wait deadline | How long one wait registration stays open | Ends that wait and produces a [timeout Event](core.md#timeout-event) |
| Execution deadline | How long the logical Execution may live | Sends the Execution into ordered [cancellation](../mechanisms/lifecycle.md) |
| Scheduler lease | How long a worker's exclusive claim on advancing it lasts | Makes the claim eligible for recovery inspection and reassignment |

Two of those expiries are routinely misread, so both are worth stating negatively. A lease expiring proves that time passed — nothing about whether the previous holder died, stalled, or is still writing. A slow worker and a dead worker look identical to a clock. A wait deadline expiring proves that the registration's time ran out — nothing about whether the awaited external work succeeded, failed, or is still running. The wait ended; the world did not report in. Each expiry answers its own question and must not be borrowed as evidence for another.

The three clocks therefore keep independent identities and must never share one timer or field. An Execution waiting a week for the editor holds a week-long wait deadline and, at the same time, a scheduler lease measured in seconds, renewed again and again by whichever worker currently holds it. Folding those into one "timeout" would either expire the wait every few seconds or leave a dead worker's claim standing for a week — there is no single duration that is correct for both, because they bound unrelated things. What happens when each one fires belongs to its owner: [wait expiry](../mechanisms/waits.md#ending-a-wait), [cancellation](../mechanisms/lifecycle.md), and [recovery](../mechanisms/recovery.md). The units, precision, instant source and lease renewal mechanism stay implementation-owned; the architecture fixes only that there are three clocks, what each bounds, and that they are not each other.

## Child and ownership

A **child Execution** is independently managed work created through an owning Execution's mediated request — the report Execution asking for a research Execution of its own, with its own authority, lifecycle, recovery and inspection.

*Independently managed* is why a child exists at all. Work the application is content to treat as part of a larger unit stays inside one Execution's Runtime; work that needs its own addressability, its own authority bound, or its own recovery decision becomes a child. A parallel function call, a model invocation, or a foreign framework's internal task is none of those by itself, and creating a child for one buys bookkeeping without buying anything the bookkeeping is for.

**Ownership** means responsibility for required work, not universal access. The parent stays answerable for what the child was asked to do; the parent does not gain the right to rummage through the child's mailbox, credentials, or private notes. Information passes between them by explicit handoff — selected values or authorized references, plus a separate writable frame for the child — and results do not implicitly copy the child's scratch work back. Ancestry is a duty of care, not a master key.

**Required work** stays an obligation until its result is accounted for or responsibility is explicitly transferred or abandoned under policy. That default is deliberately safe: work that was started stays somebody's problem, and ceasing to be responsible for it has to be a decision rather than an oversight. The parent may do other things while the child runs, but it cannot [complete](../mechanisms/lifecycle.md#completion-is-an-accounting-check) while required child results are still unaccounted for — completion is checked against the Kernel's own records, not against the Runtime's memory of what it spawned. A child that fails or is cancelled does not automatically fail its parent; the parent's Runtime decides what the failure means.

Two helpers combine creation with different expectations, and neither sheds the obligation. A **call** creates a child and handles its terminal result as part of the plan. A **spawn** creates a child without waiting for it immediately — without *waiting*, not without *owing*. **Detachment** transfers responsibility to a named durable owner that explicitly accepts it; a transfer with no recipient named is abandonment by another name, and the minimum profile may refuse detachment outright rather than accept vague ones. **Supervision** — what to do about child failures, retries and cancellation — is application or Runtime policy, not an automatic ancestry rule: being created by someone implies neither cascade kill nor immunity. [Communication](../mechanisms/communication.md) owns creation, budgets, routing of terminal results, and the durable question put to a human when a child needs one.

## Message, request and correlation

A **message** is addressed input routed to an Execution by a mediated Effect. Where a child is created by its parent, a message's destination already exists — with its own lifetime, its own mailbox, and its own idea of what it is waiting for, none of which the sender controls. That is what makes sending a different promise from creating: the sender can put input in the destination's mailbox, and can promise nothing about what happens next.

Send success therefore means destination-**mailbox acceptance**, not processing and not a reply. The message is in the mailbox either way; whether anything happens next depends on what the destination is waiting for. An unmatched message simply waits there, accepted and unread. Delivery and attention are different achievements, and only the first is the sender's to claim.

A **correlation** associates observations with the request or dependency they concern — this publication result answers that publication request. But knowing a correlation ID is not permission to reply or settle. Identifiers locate; authority permits. A caller that learned an ID can name the request in conversation and can do nothing else with that knowledge: no reply accepted, no dependency settled, no consent manufactured.

Multi-step exchanges need their terms written down, which is what the two records do. A **request/reply record** binds the requester, the allowed responder, the destination, the expected reply contract, the open-or-closed state, and an optional expiry. A **human input request** similarly binds a response contract, the eligible human, and the one resume owner — one owner, so that showing the same durable question twice costs nothing while answering it twice is refused. A reply that arrives is an observation: it is not automatically consent, and it is not automatically action settlement. A wrong peer, a guessed ID, or a new reply after closure or expiry is refused. Expiry closes the request; like every other expiry on these pages, it proves nothing about whether the peer did any work. [Communication](../mechanisms/communication.md) owns creation, closure, routing, and the interleaved questions that retire a whole wait rather than one alternative.

## Observation, cursor and routing

**Output observation** reads accepted output without submitting an Event and without changing Runtime progress. A dashboard showing "3 sources checked" for the report's child needs no permission from the child, wakes nothing, and leaves the parent's mailbox, wait and progress exactly as they were. Reading is not sending, and an observer draining output changes nothing about the Execution being observed. Where a parent Runtime must actually *react* to a child's output, the reaction arrives as an explicit message — or not at all.

An **output cursor** names an Execution or output view plus a replay position, so a disconnected reader can resume without missing or repeating anything. A cursor is a position, not authority: holding a place in a stream is not permission to keep reading it. Reconnecting is authorized afresh under current disclosure rules, and access revoked in the meantime ends at the cursor too. If a changed view cannot safely resume its old cursor, the reader rebinds or is refused — explicitly, rather than silently seeing the wrong stream.

A **routing obligation** records a durable duty to deliver addressed input later. It is a source-side promise, not destination acceptance: the duty exists, and the destination mailbox has not accepted anything yet. The gap between those two facts is bridged by durable routing — retrying under the same identity until the destination accepts or the obligation's policy says otherwise — and only the destination's acceptance applies the [wait wake rules](../mechanisms/waits.md#ending-a-wait). A child-result routing obligation alone cannot wake the parent; the wake starts when the parent's mailbox actually holds the result Event. [Output](../mechanisms/output.md) owns replay, retention windows, and the explicit gaps a reader sees when retention has lapsed.

## Backpressure and cleanup debt

**Backpressure** bounds admitted and queued work when capacity runs out. Its ordering rule is the whole point: it applies *before* the system promises an acceptance it cannot actually retain. A Kernel that accepts an Outcome and then drops its output for lack of room has made a promise and broken it; backpressure refuses or holds the work ahead of the commit instead, so every acceptance on the record is one the system can keep. Bounded buffers, refused ingress, held dispatch — the mechanism varies, but the refusal always precedes the promise.

**Cleanup debt** is known remaining resource cleanup with a responsible owner and lifetime or cost consequences. Ending the logical lifetime does not end the physical traces: the report Execution can be `COMPLETED` while its workspace is still allocated, its remote GPU job still running, its retained output still occupying storage, and its delivery obligation still unsettled. Terminal state describes the Execution's lifecycle; it says nothing about whether any of those still exist, and must never be read as "everything is gone."

Each item of debt therefore names who owes the cleanup and what happens while it waits — retention deadlines, cost accrual, resource holds. Workspaces outlive the clients that used them, remote jobs outlive the hosts that submitted them, and retained output outlives the readers that asked for it, until someone with the duty closes each one out. [Resource lifetime](../mechanisms/resources.md) and [retention and deletion](../mechanisms/evidence.md#retention-and-deletion) own those policies; this page needs only the vocabulary that keeps "finished" from being mistaken for "cleaned up."