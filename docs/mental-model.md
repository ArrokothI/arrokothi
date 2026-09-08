# Mental model

ArrokothI coordinates **Executions** whose work is performed by opaque **Execution Runtimes**.
Its product hypothesis is that a shared execution and action boundary reduces coordination failures
across independently useful runtimes. That advantage remains to be demonstrated.

> **Kernel owns execution. Execution Runtime owns how the work is done.**

```text
Application: principals, business rules, resources, user interface
                         │ create / input / inspect / cancel
                         ▼
Kernel: Execution lifecycle, accepted inputs, governed actions, recovery evidence
                         │ Activation ↓  ↑ Outcome
                  Execution Driver
                         │
Execution Runtime: Agent, Workflow, native framework, or ordinary code
```

The Driver is an adapter, not another execution engine. It can disappear into an in-process function
when no translation is needed. A Runtime need not adopt ArrokothI's Agent loop, graph, memory format,
or tools. One native run is an Execution only when the application chooses to manage it here.
A provider session may span several runs; a process may host several Executions.

## The useful vocabulary

| Term | Meaning | Detailed owner |
|---|---|---|
| Kernel | Coordinator that accepts and records Execution state changes and mediates declared actions | [Kernel](kernel.md) |
| Execution | Independently addressable work with a lifecycle, authority, accepted progress, and eventual result or failure | [Kernel](kernel.md) |
| Activation | A bounded protocol exchange asking a Runtime to advance one Execution; computation can take arbitrarily longer than dispatch | [Kernel](kernel.md#activation-and-outcome) |
| Outcome | A proposal ending an Activation with progress, output, action requests, and a next step | [Kernel](kernel.md#activation-and-outcome) |
| Event | An accepted observation addressed to an Execution | [Kernel](kernel.md#events-and-waits) |
| Effect | A proposal for a Kernel-mediated interaction | [Kernel](kernel.md#effects-and-authority) |
| Authority | The permitted Kernel-mediated operations and resources, subject to current policy | [Kernel](kernel.md#effects-and-authority) |
| Execution History | Evidence of Kernel decisions and observations; not an Agent transcript | [Kernel](kernel.md#history-and-retention) |
| Execution Runtime | Code or service that performs the work | [Execution](execution.md) |
| Execution Driver | Adapter that preserves the Runtime's behavior across the Kernel protocol | [Execution](execution.md#driver-contract) |
| Progress | Runtime-owned continuation data accepted by the Kernel; a checkpoint is a resumable snapshot, not any session identifier | [Execution](execution.md#progress-and-native-recovery) |
| Kernel Worker / Execution Host | Operational roles that coordinate Kernel state / run Runtime code; not required services | [Deployment](deployment.md) |
| Trusted / Isolated Execution | Deployment permits ambient native powers / physically contains them according to an explicit profile | [Deployment](deployment.md#trust-and-containment) |

“Exposure” is ordinary filtered visibility of authorized operations. It does not need another durable
object or ontology. Definition means the versioned code/configuration to run. Model, Agent, Workflow,
context, memory, tool, queue, lease, checkpoint and process retain their ordinary meanings.

## Progress without understanding cognition

An Execution is `READY`, `RUNNING`, `WAITING`, or terminal (`COMPLETED`, `FAILED`, `CANCELLED`).
Creating it atomically makes it `READY`; a separate externally visible `CREATED` phase is unnecessary.
`RUNNING` means an Activation is unresolved, including when its host is lost and recovery is held.
`WAITING` means an accepted Outcome registered a Kernel-visible dependency. A model call or native
polling promise stays inside the Runtime. A held recovery is visible operationally; it is not an
invented human wait or a successful result.

One Execution has at most one **current Activation authorized to commit progress**. Unrelated
Executions can compute concurrently. An obsolete host can remain physically alive; Kernel fencing
rejects its writes but cannot undo its native actions or protect an unfenced native session.

An Outcome commits accepted progress and the intent for its Effects together. The Effects execute
later and can succeed, fail, or remain unknown independently. There is no transaction that rolls
back arbitrary external actions. Events arriving during computation wait in the mailbox; accepting
a wait checks already accepted Events so that an early result cannot become a lost wake.

## Where opacity stops

The Kernel may ignore internal algorithms, but it cannot assume their work is replayable. The Driver
must declare whether an unresolved Activation can be reattached, replayed safely, or only stopped
for reconciliation. A durable outer Execution does not manufacture a durable native Runtime.
Native actions, model cost, mutable sessions and missing checkpoints constrain safe recovery even
when their internal representation remains opaque.

For mediated work, the Kernel validates and authorizes the exact action, binds any required consent,
and records the dispatch and observed result. Trusted native tools may use ambient access; those
paths are outside that claim. The application still owns business correctness and principals.
Isolation, transport credentials and physical termination are deployment responsibilities.

## What stays outside the Kernel

Agent reasoning, Workflow graphs/joins, context compaction, Working Notes, inferred memory, native
checkpoints, local asynchronous tasks, tool discovery strategies and typed local dataflow belong to
Runtimes. Shared application state and artifact stores are ordinary services; their access may be
mediated as Effects without a Kernel memory product. Create a child Execution only when it needs
independent management. A human form, graph node or internal delegated worker need not become one.

The legacy model's useful distinctions survive: proposals versus observations, consent versus
permission, output versus completion, ownership versus messaging, and asserted state versus inferred
content. Its Kernel-owned `ControllerResumption`, closed Agent/Workflow kind union, Stage barriers,
model budgets and mandatory memory vocabulary do not. Required external work still needs an owner;
removing Stage semantics does not permit terminal completion to silently discard action obligations.

## Design depth

The [detail-design layer](detail-design/README.md) expands protocol races, action obligations, native
recovery, composition, memory/context, resources and evidence. Optional Runtime concepts have useful
current homes there without becoming mandatory Kernel types. [Future questions](future-plan.md)
remain hypotheses; only [development](development/README.md) owns implementation sequence.

## Evidence and scope

[Execution](execution.md#prior-art-navigation) links the concrete CrewAI, OpenClaw, Hermes and Dify
mechanisms behind these decisions. Their code is prior art, not evidence that an ArrokothI Driver
already exists. [The review](development/004-architecture-review.md) records changes and counterexamples.

The [development roadmap](development/001-current-status-and-roadmap.md) tests Kernel correctness
with deterministic Runtimes, then native fidelity, process failure, and application value. Agent and
Workflow quality hold the Kernel fixed. Driver, application, deployment and laboratory failures get
separate attribution. No benchmark should credit ArrokothI for protection supplied by the laboratory.

These documents define a target. The [implemented baseline](development/002-implemented-kernel-baseline.md)
still has the 0.8.x `Harness`, synchronous controller invocation and live-promise resumptions.
