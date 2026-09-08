# ArrokothI architecture

This directory separates the **current architecture** from implementation plans, research, guides, and the previous mental model.

Start with [`mental-model.md`](mental-model.md).

## Canonical documents

| Document | Owns |
|---|---|
| [`mental-model.md`](mental-model.md) | Whole-system picture, vocabulary, boundaries, and strongest invariants |
| [`kernel.md`](kernel.md) | Kernel-owned Execution semantics: Activation/Outcome protocol, Events, Effects, lifecycle, authority, scheduling, history, recovery |
| [`execution.md`](execution.md) | Execution-side semantics: Execution Runtime and Driver, Agent, Workflow, native context/memory/tools, internal computation, provider integration |
| [`deployment.md`](deployment.md) | Process topology, Kernel Workers, Execution Hosts, trusted vs isolated execution, embedding, services, MCP placement, observability |

A concept should have one canonical owner. Other canonical documents may reference it but should not redefine it.

## Supporting material

| Directory | Role |
|---|---|
| [`development/`](development/README.md) | Current implementation baseline, active roadmap, and engineering findings; not architecture truth |
| [`architecture-strategy-study/`](architecture-strategy-study/README.md) | Architecture diagnosis and comparative study that motivated the current redesign; research, not canonical semantics |
| [`research/`](research/README.md) | Longer-horizon hypotheses and experiments |
| [`agent-engineering/`](agent-engineering/README.md) | Framework-neutral Agent engineering guidance |
| [`guides/`](guides/README.md) | Application/developer guidance for the currently implemented SDK |
| [`mental-model-legacy/`](mental-model-legacy/) | Exact snapshot of the previous root-level mental model and concept documents |

The old root filenames such as `authority.md`, `composition.md`, `execution-runtime.md`, `memory.md`, and `security-guarantees.md` are compatibility links to the legacy snapshot. They are **not current architecture owners**.

## Vocabulary

Use these terms consistently.

| Term | Definition |
|---|---|
| **Kernel** | ArrokothI's execution coordinator. It owns Execution identity, lifecycle, authority, scheduling, communication, governed actions, history, and recovery semantics. The previous docs and current 0.8.x implementation often call the concrete coordinator `Harness`; new architecture uses **Kernel**. |
| **Execution** | A logical unit of independently managed work with identity, lifecycle, authority, input/output, history, and recovery obligations. |
| **Execution Runtime** | The black-box implementation that performs the semantic work of an Execution. It may be an ArrokothI Agent, ArrokothI Workflow, Hermes, OpenClaw, Dify, CrewAI, or another runtime. |
| **Execution Driver** | The boundary adapter between the Kernel protocol and one Execution Runtime. It delivers Activations and returns Outcomes without exposing runtime internals to the Kernel. |
| **Activation** | One Kernel-issued unit of work for an Execution. It contains delivered Events and the Kernel-owned view needed to continue. |
| **Outcome** | The Execution Runtime's response to an Activation: progress/checkpoint, emissions, Effect proposals, and what should happen next. |
| **Event** | A semantic observation delivered by the Kernel to an Execution. |
| **Effect** | A proposal from an Execution for a Kernel-mediated interaction with the governed world. |
| **Progress** | Execution-Runtime-owned continuation data that the Kernel stores opaquely or in a declared portable form. |
| **Execution History** | Kernel-owned evidence of accepted inputs, Activations, Effects, settlements, lifecycle transitions, communication, and recovery decisions. |
| **Kernel Worker** | A process or worker that performs Kernel coordination/state-transition work. |
| **Execution Host** | A process or service that runs an Execution Runtime and accepts Activations. It may be the same process as a Kernel Worker. |
| **Authority** | The bounded set of Kernel-mediated actions an Execution is permitted to request. |
| **Exposure View** | The subset of already-authorized operations/resources that the Kernel exposes to an Execution for the current boundary or Activation. Exposure never creates authority. |

Conventional terms such as process, thread, HTTP, JSON, database, sandbox, and queue keep their conventional meanings.

## Kernel and Execution boundary

| Kernel owns | Execution Runtime owns |
|---|---|
| Execution identity and lifecycle | Reasoning, graph traversal, planning, model loops |
| Event delivery and mailboxes | Internal context construction and native memory |
| Activation dispatch and Outcome acceptance | Internal asynchronous work such as model calls |
| Authority and governed Effect dispatch | Native tools and ambient behavior allowed by its trust profile |
| Parent/child and peer routing | Internal substeps that do not need independent Execution identity |
| Execution History and recovery evidence | Native checkpoints/session state, surfaced through the Driver only as needed |
| Worker/host liveness, fencing, stale-result rejection | How an Outcome is produced |

The Kernel is intentionally ignorant of Agent and Workflow internals. The Execution Runtime is intentionally unable to redefine Kernel-owned lifecycle, authority, or history merely by reporting an Outcome.

## Precedence

When documentation disagrees:

1. Use the canonical owner above for the concept being discussed.
2. `development/` describes what the current code implements and what work is planned. It does not override the architecture.
3. `architecture-strategy-study/`, `research/`, guides, and external-system comparisons are evidence or guidance, not architecture authority.
4. `mental-model-legacy/` is historical and never overrides current documents.

The current code still implements parts of the previous model, including the `Harness` name, synchronous `ExecutionController.activate(...)`, and `ControllerResumption`. That mismatch is deliberate during migration. The architecture documents describe the target contract; the development documents must identify what has and has not moved yet.

## Documentation rule

Prefer subtraction. Add a Kernel concept only when Kernel correctness depends on knowing it exists. If the Kernel can remain correct while an Agent, Workflow, model call, planner, context engine, or native checkpoint changes internally, that concept belongs on the Execution side.
