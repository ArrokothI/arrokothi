# Kernel: deciding what counts as accepted work

The [Kernel](concepts/core.md#kernel) coordinates independently addressable [Executions](concepts/core.md#execution). It exists so an application can rely on durable Execution coordination, including interactions and recovery, without building that machinery itself.

## What it owns

For each Execution, the Kernel keeps its identity, current lifecycle state, accepted [Progress](concepts/state.md#progress), its [queued observations](concepts/core.md#mailbox), [mediated action](concepts/actions.md#exposure-and-mediation) records and eventual result. Its accepted decisions and observations form the [Execution History](concepts/state.md#execution-history).

It also records the [Definition](concepts/core.md#definition) that pins which code/configuration this Execution runs, the [Runtime contract](concepts/core.md#definition) that separately pins how the [Driver](concepts/core.md#execution-driver) reads its [Activation](concepts/core.md#activation), [Outcome](concepts/core.md#outcome) and progress, and the [Authority](concepts/actions.md#principal-and-authority) that bounds what the Execution may access or do through **mediated actions**.

It does not need a model transcript, Workflow graph or Agent/Workflow type tag to do
this job. Those belong to the [Runtime](concepts/core.md#execution-runtime). The saved continuation can be opaque to the
Kernel while its identity, compatibility and retention requirements remain explicit.

## What it exchanges

The application asks the Kernel to create an Execution, submit input to it, inspect it or cancel it. To advance an Execution, the Kernel sends an Activation — a fixed request built from pinned progress and a fixed [Event](concepts/core.md#event) batch — through a Driver to the Runtime. The Runtime does its work and returns an Outcome: proposed Progress, any [Emissions](concepts/actions.md#emission-result-and-output-obligation) or [Effects](concepts/actions.md#effect), and one next step (`continue`, `await`, `complete` or `fail`). The Kernel checks that Outcome and accepts it as one decision: until it does, an Outcome is only a proposal. An accepted Event later supplies an observation — such as application input or the trusted result of a **mediated action** — for a following Activation to carry back to the Runtime.

For example: the application creates an Execution for “prepare the weekly report.” The Kernel sends an Activation carrying that input. The Runtime drafts the report and returns an Outcome proposing progress and `await` for the editor's answer. The Kernel accepts it: the Execution enters `WAITING`, and the Kernel simply remembers what it is waiting for — it does not keep a model call or JavaScript promise alive on the editor's behalf. When the editor's answer later arrives as an accepted Event, the Kernel sends a new Activation carrying it; the Runtime accounts for the answer and returns an Outcome proposing `complete`. Once the Kernel accepts that Outcome, the Execution is `COMPLETED`.

## Lifecycle is about coordination

| State | What the reader should infer |
|---|---|
| `READY` | Eligible for another Activation; scheduling capacity can still delay it |
| `RUNNING` | An Activation is unresolved, even if its host is lost |
| `WAITING` | An accepted Outcome asked for a Kernel-visible observation |
| `COMPLETED`, `FAILED`, `CANCELLED` | This logical lifetime has ended |

A Runtime awaiting a model API remains `RUNNING`; the Kernel has not been asked to
coordinate that internal wait. If native recovery is unsafe, inspection shows a held
`RUNNING` Execution and its reason. It does not invent a business wait or successful result.
The exact [lifecycle and cancellation rules](mechanisms/lifecycle.md) own transitions.

## Why acceptance matters

An Outcome is a proposal until the Kernel accepts it. Acceptance installs progress,
accounts for its input batch and records its output, action intents and next state
together. A rejected proposal cannot partially advance any of those facts.

An Effect asks for a mediated operation, such as publishing
a file or creating a child Execution. Accepting the request is distinct from admitting
the concrete action and from observing its result. That separation lets the Kernel
report “the request exists, but approval is pending” or “the service may have acted.”
It also makes lost acknowledgments recoverable without inventing another request.

Acceptance is also what makes durability possible: because the Kernel commits progress,
output and action intents as one atomic decision, there is always a well-defined accepted
state to reconstruct after a crash — which is exactly what recovery does next.

## Recovering after a crash

A persistent deployment does not lose accepted work when a process dies. [Recovery](concepts/state.md#recovery-and-re-execution) has two
separate duties, done in order: first reconstruct every accepted record for the affected
Executions — identity, progress, queued Events, any unresolved Activation — exactly as they
stood before the crash. Only then ask the Driver whether the Runtime's native computation can
actually continue: reattach to a live job, resume from a checkpoint, safely replay the same
exchange, or hold the Execution visibly rather than guess.

That second question is never answered automatically. A lease expiring, or a host going quiet,
proves neither that the Runtime died nor that its last action failed — so the Kernel does not
invent an answer either way. When the Driver cannot establish that continuing is safe, the
Execution stays `RUNNING` but [Recovery-held](concepts/state.md#recovery-and-re-execution), with
its reason inspectable, rather than silently resumed or silently abandoned.

Recovery's [exact procedure](mechanisms/recovery.md) covers what each kind of crash window
requires, how a checkpoint gets published and garbage-collected, and how a takeover fences a
stale writer before it can mutate a native session twice.

## Exact rules when needed

- [Creation retries](mechanisms/creation.md): one caller request, one Execution.
- [Execution cycle](mechanisms/execution-cycle.md): dispatch and Outcome acceptance.
- [Waits and batches](mechanisms/waits.md): early results, selectors and deadlines.
- [Authority and consent](mechanisms/authority.md), then [actions](mechanisms/actions.md).
- [Children and messages](mechanisms/communication.md): independent work and routing.
- [Output](mechanisms/output.md) and [inspection](mechanisms/evidence.md): what observers can learn.

The [roadmap mapping](roadmap.md) locates the implementation gates. The Kernel may use
a mature durable substrate; owning these semantics does not require a custom database,
queue, scheduler or consensus layer. Check what such a substrate
[re-runs on its own](deployment.md#check-what-a-durable-substrate-retries-on-its-own)
before letting it drive a step that performs an external action.
