# Kernel: deciding what counts as accepted work

The [Kernel](concepts/core.md#kernel) coordinates independently addressable
[Executions](concepts/core.md#execution). It exists so an application can manage work
without teaching its coordinator how each agent or workflow computes.

## What it owns

For each Execution, the Kernel keeps its identity, current lifecycle state, accepted
continuation, queued observations, outstanding actions and result. It binds the work
to the Runtime code/configuration that can understand that continuation and to the
application's authority context. It records its decisions in
[Execution History](concepts/state.md#execution-history).

It does not need a model transcript, Workflow graph or Agent/Workflow type tag to do
this job. Those belong to the Runtime. The saved continuation can be opaque to the
Kernel while its identity, compatibility and retention requirements remain explicit.

## What it exchanges

The application asks to create, submit input, inspect or cancel. The Kernel sends an
[Activation](concepts/core.md#activation), a fixed request to advance work, through a
Driver. The Runtime returns an [Outcome](concepts/core.md#outcome), proposing progress
and a next step. An accepted [Event](concepts/core.md#event) supplies an observation
such as application input or a trusted action result.

For example, a Runtime can return “save this draft and wait for the editor's answer.”
The Kernel records the continuation and declared wait. It does not keep a model call
or JavaScript promise alive on the editor's behalf.

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

An [Effect](concepts/actions.md#effect) asks for a mediated operation, such as publishing
a file or creating a child Execution. Accepting the request is distinct from admitting
the concrete action and from observing its result. That separation lets the Kernel
report “the request exists, but approval is pending” or “the service may have acted.”
It also makes lost acknowledgments recoverable without inventing another request.

The Kernel reconstructs its accepted records after process loss in a persistent
profile. The Driver then answers the separate question of whether native computation
can continue. [Recovery](mechanisms/recovery.md) composes these two responsibilities.

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
