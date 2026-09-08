# Mental model

ArrokothI is an **execution kernel**. Its job is to manage long-lived Executions while allowing the code that performs each Execution to remain a black box.

An Execution may be implemented by an ArrokothI Agent, an ArrokothI Workflow, Hermes, OpenClaw, Dify, CrewAI, or another provider. The Kernel does not need to understand the runtime's reasoning loop, graph, context engine, model calls, native tools, or checkpoint format.

The boundary is simple:

```text
                    ArrokothI Kernel
              ┌─────────────────────────┐
              │ Execution identity      │
              │ lifecycle               │
              │ Events and mailboxes    │
              │ authority and Effects   │
              │ scheduling              │
              │ communication           │
              │ history and recovery    │
              └────────────┬────────────┘
                           │
                    Execution Driver
                           │
          ExecutionActivation ↓  ↑ ExecutionOutcome
                           │
              ┌────────────┴────────────┐
              │   Execution Runtime     │
              │                         │
              │ Agent / Workflow        │
              │ model / graph / code    │
              │ context / native memory │
              │ internal async work     │
              └─────────────────────────┘
```

The central design rule is:

> **The Kernel owns execution. The Execution Runtime owns how the work is done.**

## 1. Execution

An **Execution** is a logical unit of independently managed work.

It has:

- an `execution_id`;
- a lifecycle;
- accepted inputs and Events;
- bounded authority for Kernel-mediated actions;
- progress needed to continue;
- a terminal result or failure when finished;
- Kernel-owned history and recovery obligations.

An Execution is not a process. One process may host many Executions; one Execution may survive the loss of a process and continue on another host.

An Agent run is an Execution. A Workflow run is an Execution. When one Execution creates or calls another independently managed Agent or Workflow, the child is another Execution with its own identity and lifecycle.

Internal functions, model calls, graph nodes, context compaction, and other local substeps do not become Executions merely because they are asynchronous or complex.

## 2. Execution Runtime

The **Execution Runtime** is the implementation behind one Execution.

It owns semantic progression. For an Agent, that may include model-directed reasoning, context construction, tools, skills, delegation, and native memory. For a Workflow, that may include graph traversal, branching, joins, deterministic computation, and human steps.

The Kernel treats these details as opaque. It only needs the Runtime to speak the Execution protocol through an **Execution Driver**.

This allows a provider runtime to retain behavior that contributes to its quality. Hermes may retain its context and environment lifecycle. OpenClaw may retain its native session/runtime machinery. Dify may retain its application graph and human-pause state. CrewAI may retain its Crew/Flow programming model.

## 3. Activation and Outcome

The Execution protocol is repeated and asynchronous, not a one-shot request/response.

A conceptual Activation is:

```text
ExecutionActivation
  execution_id
  activation_id
  writer_epoch / base_progress_revision
  events[]
  execution_view
  authority/exposure_view
  cancellation
  deadline/budget
  pinned_definition/runtime_identity
```

A conceptual Outcome is:

```text
ExecutionOutcome
  execution_id
  activation_id
  writer_epoch / base_progress_revision
  progress/checkpoint
  emissions[]
  effects[]
  next:
    continue
    await(condition)
    complete(result)
    fail(error)
```

The exact wire schema is an implementation/API decision. The semantic requirements are more important:

- an Outcome belongs to one specific Activation;
- stale Outcomes can be rejected after takeover or newer progress;
- progress needed for continuation is durable for profiles that claim recovery;
- the Execution Runtime cannot directly mutate Kernel lifecycle or authority;
- Kernel-mediated actions are proposals until the Kernel accepts them.

## 4. Running and waiting

`RUNNING` means an Activation has been dispatched and an accepted Outcome has not yet ended that Activation.

The Kernel does not need to know whether the Runtime is currently:

- waiting on an LLM request;
- executing Python;
- traversing a native graph;
- compacting context;
- running an internal tool;
- sleeping inside provider code.

Those are internal Runtime facts.

`WAITING` has a narrower semantic meaning: the Runtime has returned an Outcome saying it has no runnable local work and needs a Kernel-visible condition before it can continue.

Example:

```text
Outcome.next = await(human_approval_42)
```

The Kernel records that dependency and makes the Execution `WAITING`. When the matching Event arrives, the Kernel makes it `READY` and can dispatch another Activation.

## 5. Kernel event loop

A simple Kernel may process Kernel-owned state transitions one at a time.

Conceptually it has three structures:

| Structure | Purpose |
|---|---|
| Kernel inbound queue | Outcomes, external inputs, Effect settlements, timers, cancellation, host/worker liveness signals |
| Per-Execution mailbox | Semantic Events waiting for delivery to that Execution |
| Ready queue | Executions eligible for another Activation |

These may share one physical implementation at first.

The important concurrency rule is not “the whole system is single threaded.” It is:

> **At most one accepted in-flight Activation writes progress for one Execution at a time. Different Executions may compute concurrently.**

A first Kernel implementation may use one coordinator loop because it is easier to test. Future Kernel Workers may process independent Executions in parallel without changing Execution semantics.

If Events arrive while an Execution is `RUNNING`, the Kernel stores them in its mailbox. It does not dispatch another concurrent Activation for that same Execution. After the current Outcome is accepted, the next Activation can receive the queued Events.

## 6. Event

An **Event** is a semantic observation delivered by the Kernel to an Execution.

Examples include:

- application input;
- an Effect result;
- a human response;
- a child result;
- a peer message;
- a timer or deadline observation when modeled semantically.

The Kernel owns Event acceptance, routing, correlation, and delivery history. The Runtime decides what an Event means to its internal logic.

Worker heartbeats and transport-level liveness are not Events. They belong to the operational hosting plane and should not enter Agent context or Workflow semantics unless an application deliberately exposes them.

## 7. Effect

An **Effect** is a proposal for a Kernel-mediated interaction.

An Execution may propose an Effect, but the proposal does not make the action happen. The Kernel validates the concrete request, checks current authority, obtains exact consent when policy requires it, records the attempt, dispatches through a trusted boundary, and later delivers the observed outcome as an Event.

This is the main path through which the Kernel can make a strong action-governance claim.

If trusted native code directly uses its filesystem, network, terminal, or credentials without crossing the Kernel, that action is outside Kernel mediation. This is allowed in the **Trusted Execution** deployment mode, but the Kernel must not claim it authorized or prevented the native action.

## 8. Authority and exposure

**Authority** is what Kernel-mediated actions an Execution may request.

An **Exposure View** is what part of that already-authorized universe is shown to the Runtime for the current boundary or Activation.

The Runtime can request narrower access or choose not to use what it sees. It cannot create additional authority by changing its prompt, graph, native configuration, or Outcome.

Current authorization is checked again at concrete action dispatch. An old Activation or old exposure snapshot is not a permanent grant.

## 9. History, progress, and memory

The Kernel and the Execution Runtime retain different kinds of information.

| Kernel | Execution Runtime |
|---|---|
| Execution History: accepted input, Activation, Effect, settlement, lifecycle, communication, recovery evidence | Context, conversation state, Working Notes, native memory, planning state, provider-native checkpoints |
| Governed resource bindings and access decisions | How retrieved information is selected or transformed for reasoning |
| Opaque or declared progress/checkpoint needed to resume | Meaning and internal structure of native progress |

Execution History is evidence about what happened. It is not automatically Agent memory or model context.

The Kernel may expose governed memory/resource services when applications need them. The Runtime uses those services through the declared boundary; it may also keep private/native memory that the Kernel does not interpret.

## 10. Agent and Workflow

Agent and Workflow are execution-side concepts.

| Agent | Workflow |
|---|---|
| Semantic progression is substantially model/intelligence directed at runtime | Allowed semantic progression/topology is primarily system defined |
| Often owns context, model loop, tools, planning | Often owns graph/state, branching, deterministic transforms, joins |
| May be ArrokothI-native or provided by another framework | May be ArrokothI-native or provided by another framework |

Both use the same Kernel Execution semantics. The Kernel does not need separate fundamental runtime machines for Agent and Workflow.

CrewAI is useful evidence here: its current Agent execution path uses Flow infrastructure, showing that different semantic control styles can share execution machinery. Dify shows that substantial Workflow state and human pause/resume can remain native. Hermes shows that Agent context/environment lifecycle can be part of cognition rather than Kernel glue. OpenClaw shows that host/runtime capability and delivery ownership can be separated from native cognition.

## 11. Driver

An **Execution Driver** adapts the Kernel protocol to one Runtime.

A Driver may be:

- an in-process function adapter;
- a subprocess protocol;
- an HTTP/gRPC service adapter;
- a queue/worker adapter;
- a provider-specific remote-job adapter.

The Driver is responsible for faithful translation. It must not silently invent stronger guarantees than the Runtime provides.

For example, if a Hermes integration cannot mediate native terminal/network actions, the Driver may still expose Hermes as a trusted Execution, but ArrokothI cannot advertise those ambient actions as Kernel-authorized Effects.

## 12. Worker and host failure

A **Kernel Worker** performs Kernel coordination work. An **Execution Host** runs an Execution Runtime. They may be the same process, but they are different roles.

A host can disappear while an Execution remains logically alive.

The durable model therefore treats liveness operationally:

```text
Execution E1: RUNNING
Activation A14: assigned to host H3
H3 lease expires
A14 attempt becomes lost/stale
Kernel fences H3
Kernel reconciles or safely retries according to recorded evidence
Execution E1 continues, waits, fails, or enters an explicit unknown/manual-recovery condition
```

“Worker died” is not automatically “Execution died.”

Heartbeats or lease renewal may be used to observe host liveness. They do not replace action reconciliation: a lost host may have completed an external action immediately before disappearing.

## 13. Trust modes

There are two primary execution trust modes:

| Mode | Meaning |
|---|---|
| **Trusted Execution** | Runtime code may use host capabilities that the deployment intentionally makes ambient, such as filesystem, terminal, or network. Kernel guarantees apply to Kernel-mediated paths. |
| **Isolated Execution** | Runtime code is placed behind an isolation boundary that restricts filesystem, network, process, secret, and resource access according to the deployment claim. |

Trust mode is separate from the interaction path. In either mode an operation may be **Kernel-mediated**; Trusted Execution may additionally perform **native/ambient** operations that the Kernel does not govern.

## 14. What this subtracts from the previous model

The current 0.8.x code calls the coordinator `Harness` and synchronously awaits `ExecutionController.activate(...)`. Because a model call or other controller-local operation can be slow, it introduced `ControllerResumption` so the Kernel can stop waiting on a live Promise and later resume the controller.

The new boundary removes that reason from Kernel semantics.

An Activation is dispatched asynchronously to an Execution Runtime. The Kernel does not care whether the Runtime spends ten milliseconds or ten minutes on internal model calls. When the Runtime reaches a semantic boundary, it returns an Outcome. Native async work, model calls, context compaction, and similar resumptions stay inside the Runtime.

The migration therefore preserves the useful parts—Execution identity, Events, Effects, lifecycle, authority, scheduling, history, correlation, recovery—and moves controller-local asynchronous machinery out of the Kernel contract.

## 15. Benchmark attribution

The architecture should make failures attributable.

| Domain | Typical failure |
|---|---|
| Kernel | lost accepted input, stale Outcome accepted, unauthorized Effect dispatched, bad recovery, wrong lifecycle/history |
| Agent Runtime | wrong reasoning, tool choice, context management, planning, answer |
| Workflow Runtime | wrong route, branch, join, deterministic transform, workflow-level state decision |
| Driver | correct Runtime behavior translated incorrectly across the Kernel boundary |
| Isolation | supposedly isolated Runtime bypasses the Kernel through filesystem/network/process access |

Kernel conformance should use deterministic fake Executions whenever possible. Agent and Workflow quality benchmarks should hold the Kernel fixed. This prevents a safe laboratory harness from receiving credit for an unsafe Agent, or an Agent from receiving blame for a Kernel recovery failure.

## 16. Invariants

1. The Kernel owns Execution identity, lifecycle, authority, communication, governed Effects, history, and recovery semantics.
2. The Execution Runtime owns semantic progression and may remain internally opaque.
3. One Execution has at most one accepted progress-writing Activation in flight at a time; unrelated Executions may compute concurrently.
4. Internal Runtime delay is `RUNNING`; Kernel `WAITING` begins only after an accepted `await(...)` Outcome.
5. Events go into an Execution; Effects are proposals coming out for Kernel mediation.
6. An Outcome is accepted only for the Activation/progress epoch it was issued against.
7. Kernel action guarantees cover Kernel-mediated actions. Native/ambient actions require trust or isolation and must be labeled honestly.
8. Worker or host failure does not erase Execution identity; recovery is based on durable Kernel evidence, not on assuming unfinished work did nothing.
