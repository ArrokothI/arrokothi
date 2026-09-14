# Agent and Workflow Runtime design

> **Superseded architecture, retired 2026-09-14.** The current architecture is the [mental model](../../../../mental-model/README.md) and its [reference index](../../../../mental-model/reference.md). Phrases below such as "target contract", "current design" or "this page owns" describe this document as it stood then, not current authority; some rules here were later corrected. [What replaced it](../../README.md).

**Owner:** Execution Runtime/SDK. **Status:** optional ArrokothI Runtime design for R2; foreign Runtimes
retain their own authoring model. [Execution](../execution.md) owns the boundary, and
[child composition](composition-and-communication.md) owns independent Kernel management.

## Shared machinery, different progression

An Agent permits a model/policy to choose open-ended next work. A Workflow specifies allowed topology,
including branches/loops that models may select. Neither call count nor use of functions decides the
category. A planner, evaluator, router or retriever is a role in an application, not an Execution kind.
Both styles can share context handling, tool adapters, typed values, retry policies and native storage.

CrewAI's [AgentExecutor](../../../../../crewAI/lib/crewai/src/crewai/experimental/agent_executor.py) subclasses
`Flow[AgentExecutorState]`; its [Flow runtime](../../../../../crewAI/lib/crewai/src/crewai/flow/runtime/__init__.py)
is concrete evidence for shared machinery. Reuse Crew/Flow as a whole when its authoring model fits.
This does not justify a universal IR or translating every foreign graph into ArrokothI nodes.

## Local values and authored boundaries

A Stage/node is a bounded local unit with input, computation, output and authored transition. It has
no separate Kernel mailbox, authority or lifecycle. Local function/model/validation/retrieval logic
can remain inside a Stage; not every operation deserves a graph node. Introduce a child only for the
independently managed properties in the child design. An Agent-call wrapper need not always create
a child if a native Runtime already owns the entire composition and its guarantees are sufficient.

Local values flow directly as typed values; small boundary results are schema-checked JSON and large
results use explicit references. Remove the old text/none edge convention and memory-as-data-bus
workaround. Define Stage output separately from computed terminal result. A validation transform
rejects or transforms values; the enclosing Runtime chooses retry/branch/failure.

For example:

```text
extract source → {claims: [...], sourceRef}
  → deterministic validation → two branch-local analyses
  → authored-order join → validated report reference
  → governed publication action → verified receipt → terminal result
```

No JSON-as-text convention, extra model call or shared memory write is needed merely to transfer an
object. Runtime internals may use richer types, but the Driver must refuse unsupported boundary values.

## Required-work barriers

Retain Stage completion barriers **inside** the Workflow Runtime. Before transitioning, settle required
local work, account for required Effect/child results, finish transforms and commit the selected output.
A branch's late callback cannot mutate a later Stage's assumptions. Nonblocking work is allowed only
with an explicit continuation/result owner; pending Kernel actions still obey Execution completion
obligations. A library must not equate “function returned” with “all required work completed.”

Independent Effects can be proposed together. Dependent Effects need later Activations after evidence.
Fast/slow completion uses the same continuation contract, even if the native Runtime optimizes local
scheduling. Native-only async work remains inside one unresolved Activation unless it yields an Outcome;
do not restore Kernel `ControllerResumption` or a second ad-hoc Effect RPC.

## Parallel branches and stale assumptions

Useful reference semantics for an authored fork:

1. Capture immutable branch input and explicit read views at fork time.
2. Give each branch its own progress, scratch frame and result slot; qualify local action keys by
   branch identity/visit so retries and loops cannot collide.
3. Allow computation and external work to overlap. Serialize commits into the Runtime's aggregate
   or use a native mechanism with equivalent ownership; Kernel fencing covers only accepted progress.
4. Join required terminal branch results in authored order, including explicit failures/conflicts.
   Mechanical collection is not semantic synthesis; a deterministic function/model may perform the latter.
5. Apply an explicit merge/reducer or reject conflict. Launch downstream work only after required
   results and merge complete. Never choose the winner by callback timing accidentally.

Use resource-specific preconditions for shared external writes. Authored-order result presentation
does not establish authored-order remote mutations. Associative/commutative reducers can tolerate
reordering only when those properties actually hold; side-effecting reducers require normal action
contracts. Failure policy (wait-all, cancel siblings, return partial) is authored, not inferred.
Cancel-remaining requests are not proof the losers stopped or performed no action.

Interleaving corrections changes logical assumptions even with one progress writer. Native continuations
must bind the relevant input/state revision and either re-evaluate, discard obsolete results, merge
under an explicit rule or restrict interleaving. A late model answer cannot overwrite corrected state
just because its callback finished last. Opaque Driver fidelity must include this behavior.

## Context, notes and local controls

Use [context/projections](context-and-projections.md) for model inputs and
[memory/state](memory-and-state.md) for retained information. Sequential Stages and parallel branches
do not implicitly inherit all scratch notes. Select a handoff into a new writable frame; preserve
important information in ordinary typed results or explicit application state. No indefinitely growing
ancestry stack is required for every model request.

A local model control can update local notes/planner state. Distinguish it from an operation that reads
external data, writes shared state, starts a child or sends a message. A provider tool namespace may
contain both; aliases retain typed origin in the exact invocation binding. Calling a model for a
transform remains billable Runtime work even if the transform performs no external business action.

## Skills and packages

A Skill packages instructions, references, assets/scripts and optional root composition. Instruction-only
use enriches the current Runtime; composition-backed use may invoke a function or a child depending on
lifetime needs. Skill is neither Execution nor authority. Preserve native package formats by default.

A useful package manifest can pin publisher/source/version, entry points, input/default bindings,
requested operations/resources and supported Runtime/isolation requirements. These are preflight inputs,
not grants. Imported `allowed-tools` cannot widen authority. Descriptions and reference documents remain
untrusted content; scripts require the declared execution profile. Pin exact content for reproducible
runs without copying credentials, local sessions or private memory into a package.

Progressive loading can select metadata first, instructions on use and assets on demand. This is a
context strategy. Composition-backed export to an instruction-only format must report lost execution
semantics or expose an explicit service instead. A registry, package signing service and universal
Skill schema are not prerequisites for R2/S1.

## Effectiveness and evidence

Preserve useful reference Agent behavior during migration; API symmetry across all Stage kinds is
not a goal by itself. Keep a supported authoring matrix: direct, helper-only, host/custom-Runtime,
or unsupported. Preflight can detect missing static bindings but cannot grant permission or predict
all dynamic policy decisions. Stable public SDK imports must exercise the selected examples.

R2 tests typed extraction/validation/child/join/computed result, stale branch conflicts, scratch isolation,
late obsolete results and required-work barriers with a fixed Kernel. Agent quality experiments compare
ACI wording, observation shaping, retrieval, planning and context separately from Kernel conformance.
Count failed attempts, repeated native billing and evaluator cost; verify outcomes in the environment.
An LLM self-evaluation is not exact consent or independent validation.

[Future plan](../../../future-plan.md) preserves context IR, code-mediated operations, richer joins and
multi-Agent strategy experiments with simpler comparison arms. A native Flow/graph or ordinary code
that meets the application more simply is a reason to retire the corresponding ArrokothI machinery.
