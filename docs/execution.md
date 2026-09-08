# Execution Runtime

An **Execution Runtime** is the black-box implementation that performs the semantic work of an ArrokothI Execution.

The Kernel does not require one universal Agent loop or Workflow engine. An Execution Runtime may be an ArrokothI-native Agent or Workflow, Hermes, OpenClaw, Dify, CrewAI, or another provider. The Kernel interacts with it through an **Execution Driver** and the Activation/Outcome protocol defined in [`kernel.md`](kernel.md).

This document owns execution-side concepts. It does not redefine Kernel lifecycle, authority, Effect settlement, scheduling, or recovery.

## 1. Execution Runtime responsibilities

The Runtime owns everything the Kernel can safely treat as opaque, including:

- semantic progression;
- internal control logic;
- model calls and provider routing;
- graph traversal;
- context construction and compaction;
- native memory and working state;
- local tools and functions;
- internal asynchronous work;
- native checkpoints/session state;
- typed values moving between internal steps;
- local retries that do not cross a Kernel-owned action or recovery boundary.

The Runtime reports only what the Kernel needs to remain correct: accepted progress/checkpoint, emissions, Effect proposals, and what should happen next.

## 2. Execution Driver

An **Execution Driver** adapts one Runtime to the Kernel protocol.

Conceptually:

```text
Kernel
  ↓ ExecutionActivation
Execution Driver
  ↓ provider/native input
Execution Runtime
  ↑ provider/native result
Execution Driver
  ↑ ExecutionOutcome
Kernel
```

The Driver may be in-process, subprocess-based, HTTP/gRPC-based, queue-backed, or a remote-job adapter. Its implementation is not Kernel semantics.

A Driver has two jobs:

1. translate Kernel-owned Activation data into the native Runtime's input/session/resume mechanism;
2. translate the Runtime's result/progress/action requests into a valid Kernel Outcome.

The Driver should preserve provider-native behavior instead of rebuilding it in ArrokothI unless a specific Kernel guarantee requires mediation.

## 3. Agent

An **Agent** is an Execution Runtime whose semantic progression is substantially decided at runtime by a model or other intelligent decision process.

Typical Agent-owned concepts include:

- system/instruction state;
- model selection and routing;
- conversation/context construction;
- retrieval and memory selection;
- planning/reflection loops;
- tool selection;
- skills;
- delegation strategies;
- native session state.

An Agent run becomes a Kernel **Execution** when it crosses the Kernel boundary and needs independently managed identity, lifecycle, authority, communication, history, or recovery.

The Kernel does not need to know how many model calls the Agent makes, whether it uses ReAct, planner/executor, compaction, recursive prompting, code execution, or another internal strategy.

## 4. Workflow

A **Workflow** is an Execution Runtime whose allowed semantic progression is primarily system-defined.

Typical Workflow-owned concepts include:

- graph or state-machine topology;
- nodes/stages;
- routing conditions;
- deterministic transforms;
- parallel branches;
- joins/reducers;
- human steps;
- workflow-local retries and checkpoints.

A Workflow run is also a Kernel Execution. The Kernel does not need a fundamentally different lifecycle or scheduler merely because the semantic controller is a graph rather than a model.

Agent and Workflow remain useful authoring/control concepts, but they are not separate Kernel runtime machines.

## 5. Agent and Workflow comparison

| Question | Agent | Workflow |
|---|---|---|
| Who mainly decides semantic progression? | Model/intelligent controller at runtime | Authored topology/policy |
| Typical internal state | Context, plans, native memory, tool observations | Graph position, branch values, join state |
| Kernel lifecycle | Same Execution lifecycle | Same Execution lifecycle |
| Kernel protocol | Same Activation/Outcome protocol | Same Activation/Outcome protocol |
| Can provider-native implementation remain opaque? | Yes | Yes |

A Runtime may combine both styles. The Kernel does not need a third execution primitive when a provider mixes a graph with model-directed substeps.

## 6. Local computation

Internal work stays inside the Runtime unless it needs an independent Kernel Execution boundary.

Examples that normally remain local:

- an LLM call;
- a Python/TypeScript function;
- context compression;
- retrieval over Runtime-owned data;
- graph-node execution;
- deterministic validation;
- parsing and ranking;
- one Agent's internal planner;
- provider-native tool calls that the deployment intentionally treats as ambient/trusted.

Local work may be asynchronous or long-running. That alone does not make it a Kernel-visible wait.

The Runtime can spend minutes inside one Activation and remain `RUNNING`. It returns `await(condition)` only when it has reached a semantic boundary and needs a Kernel-visible Event to continue.

## 7. Child Executions

Create another Kernel Execution when the child needs independent runtime identity or management.

Typical reasons include:

- independent lifecycle;
- separate authority;
- separate cancellation;
- independent recovery;
- later addressability/messages;
- independently meaningful result/history;
- execution on another host/provider.

Example:

```text
Workflow Execution W1
  ├─ local deterministic transform
  ├─ call Agent Execution A1 [Hermes]
  ├─ call Workflow Execution W2 [Dify]
  └─ local join
```

The Kernel sees W1, A1, and W2 as independent Executions. It does not need to flatten Hermes' internal delegation or Dify's internal graph into additional ArrokothI Executions.

## 8. Values and dataflow

Execution-side composition should carry typed values directly when the Runtime needs them.

For ArrokothI-native Workflows, a reasonable value model is JSON-compatible structured data plus explicit artifact/resource references for large or external data.

```text
internal step
  ↓ typed value
next step / branch / child input
  ↓ typed value
join / final selector
```

Do not require writing Kernel-governed memory merely to move an ordinary intermediate value between local Workflow steps.

A Runtime may use a richer native type system internally. The Driver only needs to translate values that cross the Kernel boundary.

## 9. Runtime progress and checkpoints

The Runtime owns the meaning of its continuation state.

The Kernel may store:

- portable structured progress;
- an opaque checkpoint blob;
- a provider session/snapshot reference;
- an external task/job handle plus versioned metadata.

The Kernel needs enough information to know which Runtime/version can resume the progress and whether a stale Outcome should be rejected. It does not need to interpret the Runtime's reasoning state.

Provider-native checkpointing can therefore coexist with Kernel Execution recovery:

```text
Kernel owns:
  Execution identity
  accepted input
  Activation attempt
  authority
  external Effect evidence
  child/peer obligations

Runtime owns:
  native session/checkpoint semantics
  context/model state
  graph state
```

A Driver must not claim that a provider-native checkpoint gives stronger crash/external-action guarantees than it actually provides.

## 10. Context, memory, and history

Use three categories clearly.

| Category | Owner | Meaning |
|---|---|---|
| **Execution History** | Kernel | Operational evidence: inputs, Activations, Effects, settlements, lifecycle, communication, recovery |
| **Runtime memory/state** | Execution Runtime | Native information retained to continue or improve semantic work |
| **Context** | Execution Runtime | Information selected for one model/tool/internal computation |

An ArrokothI-native Agent may implement Working Notes, conversation state, structured app-memory views, retrieval, or semantic-memory helpers. These are execution-side strategies unless a particular read/write crosses a Kernel-governed resource boundary.

A Kernel-governed memory/resource service controls access and records governed changes. The Runtime decides how returned data is used in context or reasoning.

## 11. Tools and Effects

A Runtime can interact with the world in two ways.

### Kernel-mediated interaction

The Runtime returns an Effect proposal in its Outcome. The Kernel validates, authorizes, dispatches, records, and later returns the observed result as an Event.

Use this path when ArrokothI needs to claim action governance, exact consent, correlation, or recovery semantics.

### Native/ambient interaction

A Trusted Execution Runtime may directly use filesystem, terminal, network, provider tools, or native credentials made available by its deployment.

The Kernel may observe some of this through telemetry, but it does not authorize the action merely because the Runtime is an Execution.

This is a valid integration mode when trust assumptions are explicit. Strong mediation claims require routing the relevant operation through the Kernel or physically isolating ambient paths.

## 12. Runtime-internal asynchronous work

Model calls, provider jobs, compaction, local subprocesses, and other Runtime-internal asynchronous operations belong to the Runtime.

The Kernel does not need a separate semantic record for each one unless that operation itself becomes a Kernel-managed child Execution or governed Effect.

This is the major subtraction from the current 0.8.x controller model. `ControllerResumption` exists because the current Kernel synchronously awaits controller code and needs to yield long local promises. Under the asynchronous Activation/Outcome boundary, that local suspension mechanism moves inside the Runtime.

The Runtime may implement its own promises, coroutines, task ledger, native checkpoint, or polling loop. The Kernel only sees the Activation remaining in flight until an Outcome arrives or the Execution Host is considered lost.

## 13. ArrokothI-native Agent Runtime

ArrokothI may provide a reference/native Agent Runtime, but it is not the Kernel itself.

A useful native Agent Runtime may include:

- model-provider abstraction;
- context compiler;
- working notes;
- tool/Effect projection;
- retrieval/memory helpers;
- child-execution calls;
- model-directed continuation policy.

These facilities should live above the Kernel boundary so their evolution does not redefine Execution lifecycle or durability.

The native Agent is valuable for examples, testing, and users who want one integrated implementation. It is not evidence that every foreign Agent should be translated into the same internal loop.

## 14. ArrokothI-native Workflow Runtime

Likewise, ArrokothI may provide a reference/native Workflow Runtime with:

- typed local values;
- deterministic/function nodes;
- model nodes;
- child Agent/Workflow calls;
- branching and bounded parallelism;
- joins/reducers;
- terminal-value selection.

Workflow Stages/nodes remain Workflow-Runtime concepts. A Stage is not automatically a Kernel Execution.

The native Workflow should reuse Kernel Executions for independently managed children rather than reimplementing lifecycle/authority/recovery inside each Stage.

## 15. Provider runtimes

The following systems are useful conceptual references because they concentrate different responsibilities inside their native runtimes.

### Hermes

Hermes treats context construction, session history, compaction, tools, environment state, delegation, and working-directory behavior as meaningful parts of Agent quality. ArrokothI should therefore prefer a native Hermes Execution Driver that preserves those facilities instead of rebuilding the Hermes loop inside the Kernel.

Its native asynchronous/delegation facilities may remain internal unless a delegated job needs to become an independently governed ArrokothI Execution.

### OpenClaw

OpenClaw combines persistent sessions, gateway/channel behavior, native execution environments, host capabilities, policy layers, tasks, and delivery recovery. It is evidence that a native Agent product can already own substantial runtime/session semantics.

A clean ArrokothI integration should therefore define exactly which boundary ArrokothI owns. A scoped task/service or native runtime Driver is preferable to duplicating OpenClaw's whole gateway/session control plane.

### Dify

Dify owns authored applications, graph execution, tenant-scoped resources, human-input pause/resume, and newer Agent/runtime snapshot machinery. A published Dify application or Workflow can therefore participate as an opaque Execution Runtime while Dify continues to own its internal graph and application state.

ArrokothI should not reconstruct every Dify node as a Kernel Execution merely to claim integration.

### CrewAI

CrewAI's current Agent execution path uses Flow infrastructure, which is useful evidence that Agent and Workflow control styles can share one underlying execution substrate.

Crews/Flows can participate as native Runtime implementations while the Kernel provides independent Execution identity, authority, communication, and recovery at the chosen boundary.

## 16. Driver fidelity and assurance

A Driver should declare what it preserves and what ArrokothI can honestly guarantee.

Useful dimensions include:

| Dimension | Question |
|---|---|
| Identity | What native run/session/job corresponds to one Execution? |
| Resume | Can the Runtime resume after host loss, and from what checkpoint? |
| Context/model ownership | Does the provider retain its native context/model loop? |
| Actions | Which actions are Kernel-mediated and which remain ambient/native? |
| Credentials | Who owns backing secrets and how are they restored/rotated? |
| Cancellation | Can ArrokothI stop logical progress, native work, or both? |
| Results | How are values, artifacts, streaming output, and terminal results mapped? |
| Recovery | What happens after an uncertain native job/action outcome? |
| Upgrade | What happens when the provider/runtime version changes? |

The Driver is part of the assurance boundary. If translation is lossy or a native path bypasses Kernel mediation, documentation and benchmarks should say so.

## 17. Driver failure attribution

A Driver failure is distinct from a Kernel or Runtime failure.

Example:

```text
Hermes chooses the correct native action
  ↓
Driver maps its payload incorrectly
  ↓
Kernel receives the wrong Effect
```

The Kernel can correctly validate/deny what it received while the integration is still wrong.

Tests should therefore include Driver-level fixtures between native Runtime behavior and Kernel-facing protocol behavior.

## 18. Trust and isolation from the Runtime side

A Runtime does not decide its own security guarantees.

In a **Trusted Execution** deployment, Runtime code may have ambient access intentionally provided by the host. It may use that access without Kernel mediation.

In an **Isolated Execution** deployment, the hosting environment restricts ambient filesystem/network/process/secret access. Kernel-mediated operations can then be the controlled bridge to privileged systems.

The detailed deployment boundary is owned by [`deployment.md`](deployment.md).

## 19. Current implementation migration

The current 0.8.x repository places substantial Agent and Workflow implementation inside `packages/core`, including stock controllers, model access, Workflow Stage semantics, Working Notes, Derived Semantic Memory, and local-resumption machinery.

The new architecture does not declare those features wrong. It changes their ownership:

- Kernel-level semantics remain in core Kernel contracts;
- ArrokothI-native Agent/Workflow implementations become execution-side runtimes layered above those contracts;
- provider integrations should target the generic Execution Driver boundary before introducing deeper provider-specific Kernel concepts;
- `ControllerResumption` and model-provider waiting should leave the Kernel semantic surface when asynchronous Runtime execution is implemented.

Physical package movement can happen incrementally. The conceptual boundary should guide tests and future API design even before every file is relocated.

## 20. Execution Runtime invariants

1. The Runtime owns how an Outcome is produced; the Kernel owns whether that Outcome is accepted.
2. Agent and Workflow share Kernel Execution semantics even though their internal control models differ.
3. Internal async work, model calls, graph nodes, context, and native memory do not require Kernel concepts unless Kernel correctness depends on them.
4. Another Kernel Execution is created only for independently managed work, not merely for every internal substep.
5. Runtime-native progress may be opaque, but its version/identity must be sufficient for safe resume or explicit refusal.
6. Typed internal dataflow should not require Kernel-governed memory as a transport workaround.
7. Native/ambient actions are not automatically Kernel-authorized actions.
8. A Driver must preserve the guarantees it advertises and expose limitations honestly.
