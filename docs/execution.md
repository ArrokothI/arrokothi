# Execution Runtime

An Execution Runtime performs the work of an Execution. It may be ordinary code, an ArrokothI
Agent or Workflow, or a native Hermes, OpenClaw, Dify or CrewAI runtime. It owns algorithms, local
state, tools, internal asynchronous work and the meaning of its continuation data. The [Kernel](kernel.md)
owns whether an Outcome is accepted. This document owns execution-side behavior and Driver fidelity.

## Agent and Workflow

An Agent's progression is substantially chosen by a model at runtime. A Workflow's allowed
progression is primarily system-defined. Both can combine functions, models, parallel work and
human interaction. These are useful authoring styles, not Kernel kinds, separate schedulers, or
mutually exclusive runtime implementations.

ArrokothI's existing controllers can become optional Runtimes. Preserve useful behavior while
moving dependencies: model resolution, context compiler, Working Notes, inferred-memory helpers,
Stage graphs and joins belong here. Internal values should pass directly between functions/nodes;
typed JSON results and application-owned artifact references cross the Kernel boundary. A native
Runtime may use richer types internally. No memory write or model call should be necessary merely
to transfer an object to the next step.

Local graph nodes, model calls, compaction, retries and delegated workers remain inside the Runtime.
Create a child Kernel Execution only for independent authority, addressability, lifecycle or recovery.
A whole Crew or Dify application can therefore be one Execution without flattening its internals.

## Driver contract

An Execution Driver translates the [Activation/Outcome protocol](kernel.md#activation-and-outcome)
to a specific Runtime. It may be a function, subprocess client or remote-job adapter. It is not a
second scheduler or mandatory deployable component. Keep provider-specific identifiers/configuration
in the Driver's versioned data, not in Kernel unions.

Every supported integration needs a small tested declaration:

| Dimension | Declare before use |
|---|---|
| Identity | Mapping of Execution, Activation and native run/session/job; whether sessions are shared and who serializes them |
| Input acceptance | How duplicate dispatch and lost submit acknowledgment are detected; exact native input/config pinned |
| Progress | Codec/version, checkpoint or live-job reference, retention owner, compatible code, missing-state behavior |
| Recovery | Reattach, safe replay, same-process continuation only, or unsupported; internal action/cost uncertainty |
| Actions | Concrete mediated paths, native paths, credentials and hook coverage |
| Interaction/output | Pause versus completion, correlated input, typed results, provisional versus accepted output, delivery owner |
| Cancellation | Logical cancellation, native interrupt/termination support, lost-host and late-result behavior |
| Resources | Native workspace/session ownership, restoration, cleanup and resource-loss detection |
| Upgrade | Versions exercised; explicit migration or refusal on incompatible state |

Declarations are claims to test, not a new generic capability registry. An application preflight must
refuse unsupported durability or mediation requirements. Start with one useful Driver; stabilize a
portable extension only after a second independently designed Runtime needs it.

## Progress and native recovery

Progress is Runtime-owned continuation information. It can be inline structured data, an immutable
checkpoint blob/reference, or a reference to a still-running native job. These have different guarantees.

A **checkpoint** identifies a specific resumable state and compatible code. A mutable session ID is
only a locator. If the native Runtime advances that session outside the Kernel's accepted revision,
Kernel compare-and-set does not protect it. Use native exclusive ownership, immutable checkpoint
versions, or a demonstrated reconciliation protocol. Otherwise refuse automatic takeover.

The Kernel need not inspect native messages or graph state, but the Driver must answer:

1. Could dispatch have started a native job even though its handle was never reported?
2. Can the same Activation be re-delivered without starting a duplicate job or repeating a native action?
3. Can accepted progress be resumed if the old process, workspace or provider checkpoint is gone?
4. Can an old host continue writing the same native state after a newer attempt starts?

Pin a stable submit identity before remote work starts, and use native idempotent submission/query
when available. A private Driver ledger may map that identity to a native job; a ledger written only
after submission still has a lost-acknowledgment gap. If the provider cannot close it, expose unknown
and reconcile or require explicit restart-from-input. Do not advertise seamless recovery.

For stored checkpoints, make the checkpoint durable before proposing its reference; Kernel acceptance
then pins it. Failed/unaccepted proposals may leave orphan blobs for later cleanup. Never delete the
last accepted checkpoint while an Activation/recovery obligation can still reference it. If native
persistence and Kernel acceptance cannot commit together, test the two-store crash windows rather
than assuming a distributed transaction. Missing versions/resources cause explicit refusal.

Runtime retry policy owns internal model calls and their possible repeated billing. Kernel recovery
chooses whether an Activation may be retried at all; the Driver supplies the proof. Do not build a
Kernel ledger for every LLM call to compensate for a Runtime that cannot recover. A same-process-only
Driver is useful when honestly restricted to an ephemeral profile.

## Native tools and human interaction

A native tool can either remain ambient under the deployment's trust policy or be explicitly mediated.
For a mediated call, the Runtime/Driver yields an Outcome containing the Effect and continuation,
then consumes the result Event in a later Activation. The Kernel does not call back into a partially
committed Runtime while it is accepting that Outcome.

A native tool API that awaits a callback may be bridged by a live coroutine between Activations, but
that is same-process continuation unless the provider also supplies a durable suspension mechanism.
If the Runtime cannot yield/checkpoint faithfully, retain its tools as native and govern the outer
artifact/action handoff, or reject the stronger integration claim. Do not add an unversioned second
Effect RPC during an Activation just to make an adapter appear complete.

Human feedback is not automatically exact-action consent. A native Dify form or CrewAI feedback step
can keep its native owner. The Driver may represent the enclosing pause as a correlated Kernel wait
when a durable callback/subscription exists. A polling implementation can remain inside a `RUNNING`
Activation; the Kernel does not inspect native pause details. Never duplicate the form and let both
systems independently resume the same native run. Authenticate and bind forwarded replies.

Cancellation is signaled separately from immutable Activation input. The Runtime should cooperate,
but Kernel cancellation does not imply physical termination or undo. A correct native result that
arrives after cancellation may remain diagnostic evidence without becoming accepted progress.

## Context, memory and resources

Context is selected information for a computation; memory is retained Runtime information. Kernel
History is evidence of Kernel decisions. None is a substitute for the others. Inferred notes and
retrieved content do not become authorization, consent or asserted business state automatically.

Keep native transcripts, compaction state, graph position, output filters and provider caches native.
When a resource is shared, the application defines access, versions, conflicts and retention; the
Kernel may mediate reads/writes through ordinary Effects. It need not implement a vector store,
claim ontology, shared notes system or universal artifact repository.

Native model budgets require Runtime enforcement or a metered provider boundary. Report estimates
as estimates. Moving cost tracking out of the Kernel does not make unobserved consumption zero.

## Prior-art navigation

These are observations of the sibling checkouts pinned in [the architecture review](development/004-architecture-review.md).
Selected tests were inspected, not executed. Paths are practical entry points, not adopted dependencies.

| System and source | Lesson and reuse decision |
|---|---|
| CrewAI [AgentExecutor](../../crewAI/lib/crewai/src/crewai/experimental/agent_executor.py), [Flow runtime](../../crewAI/lib/crewai/src/crewai/flow/runtime/__init__.py) | `AgentExecutor` subclasses Flow. Share machinery if it simplifies native Agent/Workflow implementation; do not force foreign graphs into a common IR. Use the Crew/Flow API before extracting its executor. |
| CrewAI [SQLite persistence](../../crewAI/lib/crewai/src/crewai/flow/persistence/sqlite.py), [checkpoint runtime](../../crewAI/lib/crewai/src/crewai/state/runtime.py) | State and pending feedback are saved together; checkpoint restoration includes runtime associations/version migration. Reuse native persistence and feedback. A saved snapshot alone does not prove atomic external side effects. |
| OpenClaw [harness types](../../openclaw/src/agents/harness/types.ts), [host capabilities](../../openclaw/src/agents/harness/host-capability-types.ts) | Native model/auth ownership can coexist with host-fixed tool/approval facilities and compatibility refusal. Treat this as a reference for a scoped bridge, not a portable Kernel ABI. |
| OpenClaw [task access](../../openclaw/src/tasks/task-owner-access.ts), [delivery recovery](../../openclaw/src/infra/outbound/delivery-queue-recovery.ts) | Preserve the gateway's session/channel ownership. Integrate a scoped task/service and correlate results instead of mirroring its control plane. |
| Hermes [context engine](../../hermes-agent/agent/context_engine.py), [Agent](../../hermes-agent/run_agent.py), [tool dispatch](../../hermes-agent/model_tools.py) | Session lifecycle and request-only context selection differ from transcript mutation. Tool middleware resolves underlying bridge calls. Preserve native context/tools; audit indirect paths before claiming mediation. |
| Hermes [async delegation](../../hermes-agent/tools/async_delegation.py), [filesystem checkpoints](../../hermes-agent/tools/checkpoint_manager.py) | Abandoned delegates can be unknown while recorded partial results survive. A shadow Git workspace snapshot is file undo, not general Execution recovery. Use native jobs and their explicit limits. |
| Dify [pause persistence](../../dify/api/core/app/layers/pause_state_persist_layer.py), [human-input service](../../dify/api/services/human_input_service.py) | Persist graph and response-stream filter together; map engine pause IDs to application-owned forms. Preserve published application/graph and form semantics. |
| Dify [Agent runner](../../dify/dify-agent/src/dify_agent/runtime/runner.py), [dependencies](../../dify/dify-agent/pyproject.toml) | A successful run can return deferred human work plus a snapshot, rather than final output. Translate meaning, not a status string. Dify itself reuses Pydantic AI; investigate the independent library before recreating cognition. |

## Migration and tests

The current `AgentExecutor`/Strands bridge supplies resolved model/context/operation projections.
It is a useful step adapter, not proof of whole-native-runtime fidelity. Preserve its documented
scope while adding the generic boundary. `ControllerResumption` can remain a private compatibility
mechanism inside a legacy Runtime adapter; it must cease to drive Kernel wait types and stores.
Do not rename files and call that an asynchronous migration.

Kernel tests use fakes. Runtime tests check reasoning/graph behavior with Kernel contracts fixed.
Driver tests compare native input/output/pause/cancellation before and after translation and inject
lost acknowledgments and stale native writers. Test tool fallback/delegation and one upstream upgrade
for every strong supported claim. The [roadmap](development/001-current-status-and-roadmap.md) sets
when a native comparison should delete unnecessary ArrokothI machinery.
