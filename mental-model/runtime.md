# Runtime: deciding how work is done

An [Execution Runtime](concepts/core.md#execution-runtime) is the code or service doing
an Execution's work. It can be a function, an Agent, a Workflow or a native framework.
It owns semantic progression: what to compute next, which internal state to keep and
how to interpret observations.

## Keep useful native behavior

An [Agent](concepts/roles.md#agent) lets a model substantially choose its progression.
A [Workflow](concepts/roles.md#workflow) primarily follows authored progression.
Both can use functions, models, branches and people. They are authoring styles, not
Kernel types. A whole Crew or Dify application can remain one Runtime with its own
graph, memory and human-feedback handling.

Passing `{claims, source}` from extraction to validation should be ordinary typed
dataflow. It should not require another model call or a write to shared memory just
to transport the value. Local graph steps and delegated workers need separate Kernel
Executions only when they need independent management.

## Continuation across Activations

The Runtime receives fixed input through the Driver and returns a proposal for what
the Kernel should accept. Its [progress](concepts/state.md#progress) tells the Runtime
how to continue later. For simple code this might be `{phase: "await-editor", draftRef}`.
For a native engine it might identify an immutable checkpoint or an existing native job.
Those forms carry different recovery requirements; a session identifier alone is not
a saved resumable snapshot.

The Runtime must account for every Event in an accepted batch. If it defers the meaning
of an input, it retains that fact in progress or explicitly rejects it. The Kernel
does not inspect prose to decide whether the Runtime followed an instruction.

## Internal work and mediated work

Model calls, native retries, compaction and local async functions stay inside the Runtime.
To request a Kernel-mediated action, the Runtime yields an Outcome containing the
Effect and continuation, then consumes a result Event in a later Activation. It does
not call an unversioned second action API while its proposal is still unaccepted.

A native API that suspends only on a live callback may support a same-process bridge.
That does not become durable suspension merely because the outer Execution is stored.
[Driver integration](mechanisms/integration.md) explains the fidelity tests and refusal options.

## State and quality remain Runtime concerns

[Context](concepts/roles.md#context) is the information selected for a computation.
Memory is retained information. Neither is Kernel History or automatic permission.
For example, a note saying “the user usually approves publication” can inform a proposal;
it cannot approve the current publication request.

Optional reference facilities are described in [local composition](mechanisms/composition.md),
[state and memory](mechanisms/state.md), and [context construction](mechanisms/context.md).
Foreign Runtimes keep their native equivalents. Test reasoning, graph behavior and
context quality with the Kernel held fixed; the Kernel's protocol tests use deterministic fakes.
