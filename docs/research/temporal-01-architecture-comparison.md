# ArrokothI and Temporal: architecture and actual implementation

Research date: 2026-09-22. Non-canonical research; no architecture, dependency, or roadmap decision is made here.

**Temporal is a strong primary reference for ArrokothI's coordination and durability layer.** Its separation between a durable service and application Workers closely resembles ArrokothI's separation between Kernel and Runtime. The important difference is the contract imposed on computation and recovery, rather than whether either system supports Agents.

Temporal already coordinates nondeterministic work through Activities. ArrokothI's proposed platform advantage is a common execution and action-governance contract across independently designed native Runtimes. ArrokothI also intends to build its own Agent and Workflow systems after the Kernel/Driver foundation. These are complementary product directions: interoperability needs Driver evidence, while the native systems need their own behavior, quality and usability evidence.

Read the four reports in order:

1. This report: architecture, source scope, and implementation gap.
2. [Protocol and failure semantics](temporal-02-protocol-and-failure-semantics.md).
3. [Integration choices and experiments](temporal-03-integration-and-experiments.md).
4. [Restate, DBOS, Temporal SDK and proposed design-document changes](temporal-04-other-candidates.md).

## Evidence and limits

| Subject | Examined snapshot | What this establishes |
|---|---|---|
| ArrokothI | Local HEAD `b1bd37074d528e346b4abf8fe02c294a52ff852a`, dated 2026-09-22; package version 0.8.1 | Canonical target, current status, source, and selected tests |
| Temporal Server | Local HEAD `543367eec690da3c23e536cf5dfe76928af11b2c`, dated 2026-09-21 | Server architecture, persistence, task completion, authorization, CHASM, and Nexus implementation |
| Temporal SDK behavior | Official documentation and online Core SDK architecture; follow-up local TypeScript SDK HEAD `7ae5c7fb6728fe93696e1fc2f0da97018f6f20cc` | Public contract plus selected Agent/stream implementation paths; not a tested integration or local Core audit |
| Restate and DBOS | Initial official-documentation screening, followed by the pinned local source review in [report 4](temporal-04-other-candidates.md#source-scope-and-confidence) | Selected protocol, replay, cancellation and lifecycle evidence; no benchmark |

ArrokothI had an existing modification in `mental-model/concepts/roles.rewrite.md`. It was neither edited nor treated as canonical evidence. Temporal's checkout was clean. These HEADs identify source revisions, not published releases or Temporal Cloud behavior. Source links for Temporal below pin the examined commit; online documentation can move independently and is not proof that every described feature exists in this server snapshot.

This study inspected selected implementation paths, not every subsystem. No Temporal cluster, cross-system benchmark, native Driver, or crash-recovery experiment was run. “Closer” below is an architectural judgment, not a measured performance or product ranking.

## The real architectural overlap

Temporal's service owns Workflow history, mutable execution state, durable tasks, timers, and task acceptance. Application Workers execute Workflow and Activity code outside the service. A Workflow Task returns Commands; the service records their consequences and arranges subsequent work. Temporal therefore already separates coordination from application computation. [Server architecture][t-architecture], [History Service][t-history].

ArrokothI's target Kernel owns Execution identity, accepted progress, input accounting, lifecycle, mediated actions, authority, and recovery coordination. A Runtime advances opaque work through a Driver and submits an Outcome. Agent loops and Workflow graphs stay behind that boundary. [Kernel](../../mental-model/kernel.md), [Runtime](../../mental-model/runtime.md), [Driver](../../mental-model/driver.md).

| Question | ArrokothI target | Temporal Workflow model |
|---|---|---|
| What is the managed unit? | An Execution, independent of Agent/Workflow implementation | A Workflow Execution; Workflow ID can span a chain of runs |
| Who decides application control flow? | A native Runtime behind a Driver | Application Workflow code executing under an SDK |
| How does progress cross the boundary? | Activation → proposed Outcome, including opaque progress and requested Effects | Workflow Task → completion carrying Commands and protocol messages |
| What reconstructs computation? | Driver-declared reattachment, checkpoint, safe replay, or visible hold | Compatible Workflow code replaying recorded history |
| Where does nondeterminism belong? | Inside the Runtime; it need not become a Kernel operation | Outside Workflow replay, ordinarily in Activities |
| How are consequential actions governed? | Explicit intent, admission, exact consent where required, attempt, and evidence contracts | Activities/Nexus provide execution machinery; application code supplies domain policy and consent |
| What can persist without a dedicated worker? | Target persisted waits and readiness | Recorded Workflow state and outstanding timers/tasks |
| Does coordination prevent arbitrary native actions? | Only mediated actions are governed; containment is separate | Worker-side external code still needs appropriate credentials and containment |

The table compares contracts, not feature parity. ArrokothI's [execution cycle](../../mental-model/mechanisms/execution-cycle.md), [recovery](../../mental-model/mechanisms/recovery.md), and [authority](../../mental-model/mechanisms/authority.md) are target specifications. Temporal's [Workflow constraints](https://docs.temporal.io/workflow-definition) and [execution identity/status](https://docs.temporal.io/workflow-execution) define its public model.

## Recovery is the central tradeoff

Temporal constrains Workflow code so that it can reconstruct orchestration from durable history. Activity implementations can perform arbitrary I/O; completed results are used during replay. This buys a standardized recovery mechanism, while requiring applications to choose appropriate Activity boundaries and maintain compatible Workflow code. [Server architecture][t-architecture].

ArrokothI does not require every Runtime to adopt the same replay model. Its accepted progress can describe inline continuation, an immutable checkpoint, or a native job locator, with different guarantees. A Driver may itself use deterministic replay, but ArrokothI's history does not thereby become a replay log for arbitrary native code. This preserves integration freedom while moving proof of safe continuation to each Driver. [Recovery and checkpoint publication](../../mental-model/mechanisms/recovery.md).

Neither approach makes an unrecorded external side effect safe to repeat. That question is examined in [report 2](temporal-02-protocol-and-failure-semantics.md).

## Compare the implementation that exists

ArrokothI currently has two distinct implementation surfaces:

| Surface | Evidence at this snapshot | Limitation |
|---|---|---|
| Supported SDK over legacy core | Harness; Agent/Workflow controllers; Effects; waits; confirmation; attenuation; reference providers and in-memory stores | Process-local resumptions and no complete durable RuntimeStore |
| Private target Kernel | Atomic in-memory creation/input, scoped receipts, fixed batch reservation, asynchronous dispatch, ordinary redelivery, inspection | Outcome acceptance, takeover/recovery hold, cancellation, waits, and Effects remain assigned to later packets |
| Target persistent profile | Canonical recovery rules and planned K3 comparison | Specification and planned evidence, not a shipped backend |

These are recorded in the [implemented baseline](../development/002-implemented-kernel-baseline.md) and [status ledger](../development/007-work-packets.md). The target [coordinator](../../packages/kernel/src/coordinator.ts) explicitly refuses `submitOutcome`, `recoverExecution`, and `cancelExecution`; the [Driver interface](../../packages/kernel/src/driver.ts) distinguishes delivery reporting from work completion.

The following focused check passed: **54 tests, 0 failures**.

```bash
node --test --experimental-strip-types packages/kernel/tests/dispatch.test.ts packages/kernel/tests/unsupported.test.ts
```

It verifies the examined dispatch/refusal behavior, not durability or full protocol conformance. Temporal has concrete [SQL persistence][t-sql], task-processing services, and [Activity token validation tests][t-activity-tests]. Those paths were inspected, not executed here. It would be misleading to compare ArrokothI's full target with Temporal's implemented system and report equivalent readiness.

## Further parts of Temporal that make the comparison closer

**Core SDK Activations.** Temporal's Core-based SDKs also exchange `WorkflowActivation` and `WorkflowActivationCompletion` between Core and the language layer. This is a second boundary inside a Worker, distinct from the server's Workflow Task boundary. Similar vocabulary is not evidence of an identical protocol. The architecture link formerly under `sdk-core` now redirects to [sdk-rust](https://github.com/temporalio/sdk-rust/blob/main/ARCHITECTURE.md).

**CHASM.** This server checkout includes a framework for heterogeneous application state machines, with component state, atomic transitions, deferred tasks, and versioned references. It reuses Temporal infrastructure without making each component a user-authored Workflow. This is especially relevant prior art for Kernel implementation mechanics. It is also a server framework with registered component types, not automatically a public provider-neutral Runtime protocol or a supported embeddable dependency. [CHASM design][t-chasm], [task interfaces][t-chasm-task].

**Agent integration.** The subsequently added TypeScript SDK contains an experimental Strands integration that runs model/tool work through Activities and replaces native snapshot/retry facilities. Temporal is therefore also a concrete Agent-runtime baseline, with explicit fidelity tradeoffs. [Report 4](temporal-04-other-candidates.md#temporal-sdk-the-agent-comparison-is-already-concrete) provides pinned implementation evidence and its limits.

## What could make ArrokothI valuable?

The promising platform combination is explicit action governance, honest uncertainty after failures, and a shared lifecycle across native engines that keep their own behavior. Temporal can host implementations of these policies; the possible advantage is making them reusable across applications and Runtimes. Our own Agent/Workflow layer can add context construction, typed composition and useful application behavior above that foundation. Those Runtime facilities are optional for Kernel conformance, not evidence that the native product direction has been abandoned.

That value needs a demanding baseline: the same useful application implemented directly with Temporal and directly with the native Runtime. If ArrokothI merely adds another status record, callback layer, or retry loop, direct use is preferable. If it removes repeated policy/recovery code while preserving native behavior, the extra layer has a defensible purpose. This is a research inference, consistent with the [Driver fidelity contract](../../mental-model/mechanisms/integration.md), rather than an accepted product claim.

Evaluate our native Runtime separately with Kernel held fixed. Stronger model output does not prove a better Kernel, and a mature durable substrate does not settle the design of our Agent/Workflow experience. The follow-up [document proposals](temporal-04-other-candidates.md#proposed-changes-to-mental-model-for-later-review) retain that design depth while keeping it outside Kernel semantics.

## Reuse scope

This work learns from prior art and links evidence. It copies no implementation, tests, or assets and adds no dependency/service. Temporal's examined root [LICENSE][t-license] is MIT and requires preserving its copyright and permission notice with covered copies/substantial portions. This is not blanket clearance for all submodules, SDKs, dependencies, or hosted services; any later incorporation needs exact-version review under repository policy.

[t-architecture]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/docs/architecture/README.md
[t-history]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/docs/architecture/history-service.md
[t-sql]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/common/persistence/sql/execution.go
[t-activity-tests]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/service/history/api/activity_util_test.go
[t-chasm]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/docs/architecture/chasm.md
[t-chasm-task]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/chasm/task.go
[t-license]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/LICENSE
