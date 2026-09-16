# Runtime: deciding how work is done

An [Execution Runtime](concepts/core.md#execution-runtime) is the code or service doing an [Execution](concepts/core.md#execution)'s work. It can be a function, an [Agent](concepts/roles.md#agent), a [Workflow](concepts/roles.md#workflow) or a native framework. It owns the control flow: what to compute next, which internal state to keep and how to interpret observations.

## Keep useful native behavior

An Agent lets a model dynamically direct its own control flow. A Workflow primarily follows a predefined control flow. Both can call functions or models, split into [local branches](concepts/roles.md#stage-and-local-branch), and incorporate human input. Agent and Workflow are patterns for structuring a Runtime, not [Kernel](concepts/core.md#kernel) types — the Kernel sees only an Execution, whichever pattern built it. A whole Crew or Dify application can remain one Runtime with its own graph, memory and human-feedback handling.

This is another example of the boundary between Kernel and Runtime, at a finer grain: ordinary dataflow between a Runtime's own steps never needs to cross that boundary. In a Dify or CrewAI graph, for example, passing `{claims, source}` from an extraction step to a validation step should stay a plain function call or graph edge — it does not need to become a Kernel-mediated action, or a write to shared memory just to transport the value. The same holds for an LLM call inside that extraction step: it could in principle be modeled as a mediated Effect, but nothing about Kernel correctness requires that — it stays internal Runtime work unless the Kernel actually needs to observe or coordinate it.

## Continuation across Activations

The Runtime receives fixed input through the [Driver](concepts/core.md#execution-driver) and returns a proposal for what the Kernel should accept. Its [progress](concepts/state.md#progress) tells the Runtime how to continue later. For simple code this might be `{phase: "await-editor", draftRef}`. For a native engine it might instead be a [checkpoint](concepts/state.md#checkpoint-and-locator) or a [locator](concepts/state.md#checkpoint-and-locator) for an existing native job. Those forms carry different recovery guarantees. A checkpoint pins a specific resumable state. A locator, such as a bare session identifier, only points at a native session that can keep mutating on its own, independently of anything the Kernel has accepted — if that session is lost, the identifier alone gives the Kernel nothing to resume from.

The Runtime must account for every [Event](concepts/core.md#event) in an accepted batch: accepting an Outcome acknowledges the whole batch, not just the Events the Runtime happened to use. If the Runtime wants to defer acting on one, it records that decision in its own progress — for example `{phase: "draft", pendingCorrection: eventId}` — or explicitly rejects the Event. The Kernel does not read a model's textual explanation of what it did with an Event to find that out; only the recorded progress or explicit rejection tells it.

## Internal work and mediated work

Model calls, native retries, compaction and local async functions stay inside the Runtime. To request a Kernel-mediated action, the Runtime yields an [Outcome](concepts/core.md#outcome) containing the [Effect](concepts/actions.md#effect) and its progress, then consumes the result Event in a later [Activation](concepts/core.md#activation). The Runtime has no separate mediated-action API to call directly — an Effect inside a yielded Outcome is the only way to request one.

Some native frameworks pause their internal work mid-step by simply suspending execution and holding that paused state in their own memory, ready to pick back up once a tool result comes back — but nothing about the pause itself is written anywhere durable. Even if a Driver wires that pause to a Kernel Effect, a crash or restart still loses the paused state; the Kernel's own record of the Execution stays safely stored regardless. This is the same checkpoint-versus-locator distinction from above, applied to a framework's in-memory pause instead of a saved snapshot: the Kernel storing the Execution durably says nothing about whether the framework's own pause can survive that failure. [Driver integration](mechanisms/integration.md) says what a Driver must show before treating such a pause as actually recoverable, rather than something that only happens to work while one process stays up.

## State and quality remain Runtime concerns

[Context](concepts/roles.md#context) is the information selected for a computation. Memory is retained information. Neither is Kernel History or automatic permission. For example, a note saying "the user usually approves publication" can inform a proposal; it cannot approve the current publication request.

Optional reference facilities are described in [local composition](mechanisms/composition.md), [state and memory](mechanisms/state.md), and [context construction](mechanisms/context.md). Foreign Runtimes keep their native equivalents. Test reasoning, graph behavior and context quality with the Kernel held fixed; the Kernel's protocol tests use deterministic fakes.
