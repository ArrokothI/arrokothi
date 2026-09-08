# Core boundary and architectural review

[Study home](README.md). These are recommendations, not accepted changes to canonical semantics. Finding priorities mean **when a decision must be resolved before layering**, not a claim that a current production deployment is exploitable.

## Is the current kernel fundamentally sound?

**Its semantic starting point is sound enough to preserve, but its current decomposition is not yet validated as the smallest useful kernel.** The strongest distinctions stop common category mistakes: a proposal is not an action; output is not completion; a discovered operation is not permission; a transcript is not committed business state; a subroutine is not an independent execution. The local conformance suite provides meaningful evidence for those distinctions within the current implementation profile.

The central unresolved issue is closure: can the execution boundary account for all work whose lifetime, cost, or uncertainty matters after the worker disappears? Today controller-local work can hold live promises, the scheduler has no explicit fencing contract, and progress is not committed together with the input-consumption decision and all dispatch intent. Those are substantial design decisions for a durable runtime, not finishing touches to a storage adapter.

A second issue is scope. The core combines lifecycle and authority machinery with stock Agent information/model concepts, Workflow graph representation, and a closed Agent/Workflow discriminator. Some of that is convenient implementation, not a necessary semantic foundation. The system can remain coherent while those authoring choices move upward.

### Existing invariants used as the starting state

The owners are [execution runtime](../execution-runtime.md), [authority](../authority.md), [composition](../composition.md), [memory](../memory.md), [security guarantees](../security-guarantees.md), and [interoperability](../interoperability.md). The [mental model](../mental-model.md) provides the strongest shared distinctions.

- An Execution has independent identity, lifecycle, pinned definition, progress, and addressed interaction. An Activation is temporary work advancing it. One controller writes progress at a time; multiple dependencies may be in flight.
- Controllers propose Effects and report progress. The Harness decides authorization and coordinates outcomes; executors and external systems establish what happened.
- Events are semantic observations delivered to a controller. Controller resumptions concern local work and need not become public Events or Effects.
- Authority is distinct from the model-visible operation projection. Actual dispatch requires authorization of the concrete action; identifiers are not permissions.
- Explicit structured state, inferred semantic memory, working notes, and invocation context have different truth and trust roles.
- Stage boundaries do not acquire independent execution identity merely because they call code or an LLM. Communication does not grant ownership or state access.
- Trusted local interfaces describe ownership, not hostile-code containment. Physical execution and protocol mappings cannot silently redefine kernel guarantees.

Nothing in the recommendations requires collapsing these meanings. Several recommendations do challenge whether their present types and subsystems need to remain distinct implementations.

## What the current implementation already establishes

The implementation is more than a taxonomy. Its useful evidence should survive a narrowing decision:

| Implemented mechanism | Representative executed conformance | What the evidence does not establish |
|---|---|---|
| Stable logical identity, valid lifecycle transitions, data-shaped records, and one scheduled controller writer. | [Serialization](../../tests/conformance/execution/serialization.test.ts), [scheduler exclusion](../../tests/conformance/execution/scheduler-exclusion.test.ts). | JSON round trips and live-worker exclusion are not restart recovery or distributed fencing. |
| Effect proposals pass through authorization, journal/pending state, and correlated outcomes; duplicate logical requests can recover prior outcomes. | [Duplicate recognition](../../tests/conformance/effects/duplicate-recognition.test.ts), [fast/slow equivalence](../../tests/conformance/effects/fast-slow-equivalence.test.ts). | A local idempotency record cannot guarantee exactly-once behavior at an arbitrary remote service after an unobserved success. |
| Exact-action confirmation and settlement are distinct from conversational assent or an LLM's claim of success. | [Mechanical confirmation](../../tests/conformance/interaction/mechanical-confirmation.test.ts). | A secure UI, trustworthy principal mapping, or complete mediation of ambient native code. |
| A waiting Execution can accept addressed Events and opt into controlled interleaving or multiple dependency waits without concurrent progress writers. | [Controlled interleaving](../../tests/conformance/execution/controlled-interleaving.test.ts), [dependency waits](../../tests/conformance/execution/multi-dependency-wait.test.ts). | A production scheduler, fair admission, or recovery of outstanding live promises after process death. |
| Delegation attenuates operation authority; shared asserted state uses explicit authorized reads/writes and optimistic versions. | [Authority attenuation](../../tests/conformance/composition/authority-attenuation.test.ts), [optimistic state writes](../../tests/conformance/memory/structured-memory-optimistic-write.test.ts). | A multi-tenant identity service, general shared-resource concurrency control, or a mature semantic memory engine. |
| A supported SDK assembles explicit policy, stock controllers, models, and handlers; public examples exercise state, confirmation, and children. | [SDK package](../../packages/sdk), [example suite output](evidence/examples.txt), [builder checks](evidence/builder-docs.txt). | A published packaging matrix, broad independent adoption, or parity with mature native Agent engines. |

The [implemented baseline](../development/002-implemented-kernel-baseline.md) explicitly lists durable recovery, broader discovery, and hosted isolation as deferrals. The review agrees with that status separation. The concern is the amount of contract work those deferrals require and their position in the investment sequence, not an accusation that an acknowledged plan is a failed implemented feature.

## The minimum candidate contract

| Responsibility | Own in ArrokothI | Leave replaceable or outside |
|---|---|---|
| Identity and progress | Stable logical execution ID; pinned runner/definition revision; accepted checkpoint revision; one current writer; explicit lifecycle and result. | Definition authoring syntax, graph editor, runner language, native engine's internal checkpoint format. |
| Input and waiting | Addressing, accepted input identity, correlation, consumption/recovery rules, terminal/late input handling, durable wake intent. | Channel transports, polling/webhook clients, user-facing conversation layout. |
| Actions | Concrete operation identity/version, validated payload, policy and consent binding, attempt identity, outcome/unknown distinction, reconciliation authority. | Vendor tool SDK, business authorization rules, credential store, physical side-effect implementation. |
| Authority | Principal binding, attenuated delegation, bounded scope, current dispatch decision, no implicit privilege from discovery. | Policy language/backend, organizational directory, authentication product. |
| Communication | Who can address whom; correlation and result contract; child/peer ownership and cancellation obligations where promised. | Planner, swarm strategy, team roles, work decomposition and reward mechanisms. |
| State and resources | Small runtime checkpoint; explicit access boundary for shared asserted state and artifact references; revision/provenance necessary for decisions. | Whole application database, vector store, summarization, filesystem implementation, media pipeline. |
| Operational evidence | Causal IDs and authoritative decisions/outcomes; replay and migration identity; explicit capability claims. | Telemetry vendor, dashboards, logs retention backend, billing UI. |

“Own” means define and test the meaning. An existing durable runtime can implement substantial parts of the execution row while ArrokothI remains the semantic facade. Conversely, a wrapper that lets an upstream engine independently decide policy and then labels its result “authorized” has outsourced the meaning, not merely implementation.

A smaller fallback product may own only the action/authority rows plus their correlation and conformance requirements, using an upstream execution identity throughout. Test this alternative before insisting that every application needs a new ArrokothI Execution ID.

## Preserve, strengthen, move, or remove

| Current idea | Proposed treatment | Why / cost of changing |
|---|---|---|
| Definition ≠ Execution; Activation ≠ Execution | Preserve. Add runner/version identity sufficient to interpret old progress. | Strong basis for waiting, inspection, and migration. Avoid “definition JSON exists” being mistaken for executable code availability. |
| Agent ≠ Workflow | Preserve as control/authoring distinction; reconsider hard kernel union. | CrewAI demonstrates shared machinery. A generic runner should not pretend to be a stock Agent just to participate. Migrate stored discriminators explicitly. |
| Effect ≠ Event | Preserve. Strengthen attempt/outcome and recovery semantics. | The distinction carries authority and evidentiary meaning. No need to turn every internal transition into a public Event. |
| ControllerResumption vs PendingOperation | Preserve different visibility and authorization roles; investigate a common private durable attempt mechanism. | A model call is nondeterministic and billable even if controller-local. Two meanings do not justify two incompatible recovery engines. |
| One logical Harness | Preserve exclusive responsibility; avoid one-process or one-global-lock interpretation. | Federation and native tasks can have nested owners, but overlapping admission and lifecycle writers create conflicts. |
| Authority / active view / invocation binding | Preserve and strengthen freshness, revision, non-disclosure, and adapter evidence. | Arguably the most reusable part of the design. Final denial cannot repair a descriptor or context leak that already occurred. |
| Structured Memory | Keep explicit asserted-state semantics; expose a modest typed state facility, avoid making “memory” the universal data bus. | Business records and local function values need not become Agent memory. A state provider can remain replaceable. |
| Working Notes and context compilation | Keep as optional Agent-engine facilities. | They do not belong in a generic execution boundary; native engines may already own them. |
| Stage text/null dataflow | Replace or generalize after a minimal typed composition experiment. | Current limitation imposes application encodings without a demonstrated benefit. Use typed JSON values and artifact references; avoid a general tensor/table ontology. |
| Stock graph, LLM Stage, Agent model configuration | Move toward optional controller/SDK ownership. | Useful defaults and conformance fixtures; not necessary for all hosted native runners. Preserve public facade while extracting only real dependency seams. |
| Skills and heterogeneous descriptor taxonomy | Defer mandatory kernel taxonomy. | Packaging reusable behavior is useful; operations, resources, services, and skills need not all be first-class runtime objects before applications work. |
| Rich multi-Agent orchestration | Keep minimal ownership/correlation primitives; defer strategy layers. | Parallelism and messaging are mechanisms, not evidence that a swarm improves outcomes. |
| Universal Program IR / POSIX-like machine | Experimental only; remove any implied obligation to complete it. | Could reduce model round trips; could instead add compiler and debugging costs with little benefit. |

## Source review register

### R1 — Durable activation acceptance is not yet a closed protocol

**Observation; critical before durable claims.** In [Harness activation](../../packages/core/src/runtime/harness.ts), the transaction around `mailboxes.consume` advances the consumption cursor and marks execution running before controller computation. `applyOutcome` processes Effects before its later progress/lifecycle transaction. Several readiness paths enqueue after store commit. [RuntimeStore](../../packages/core/src/ports/runtime-store.ts) provides atomic facets, but not an explicit persisted activation input receipt/outcome commit protocol or scheduler outbox facet.

**Inference:** installing a durable database under this unchanged lifecycle does not, by itself, tell a new worker which consumed inputs to replay, how to recover a running activation, or how to recreate a wake lost between commit and enqueue. Existing in-process tests do not establish process-death recovery. This is not a finding that the current documented in-memory profile falsely promises production durability; the development baseline acknowledges the gap.

**Required decision:** define activation identity, input reservation/acknowledgment, writer epoch, accepted progress, and effect-intent linearization together. The implementation may use transactionally persisted intent plus a dispatcher/outbox, or an existing durable runtime's equivalent. Then kill actual worker processes at each boundary. Do not solve this with a startup rule that blindly reruns all `RUNNING` work.

### R2 — Resumption is JSON-shaped at the boundary but live-promise-backed in operation

**Observation; critical before hosted/restart work.** [The resumption processor](../../packages/core/src/runtime/resumption-processor.ts) starts thunk work, races for an inline result, and holds continuation promises in memory. A persisted pending record can be found on re-entry, but that lookup does not reconstruct the original work in a new process. The [controller resumption port](../../packages/core/src/ports/controller-resumption.ts) accepts local executable work, rather than a durable remote work envelope.

**Inference:** pending model work can become unrecoverable after process death without a new dispatch/reconciliation policy. An unrecorded inline result can also imply a repeated billable invocation after replay. “No unknown outcome” at this semantic layer cannot mean “no uncertainty about operational attempt/cost.”

**Required decision:** define stable invocation identity, exact materialized input or a pinned immutable reference, code/provider version, retry policy, attempt state, and budget accounting. Share low-level durable transport mechanics with other work where useful while keeping controller-local settlement out of public Effect/Event semantics. A live closure must not be serialized as though it were a portable program.

### R3 — Scheduler exclusion lacks an explicit durable fencing contract

**Observation; critical before multiple workers.** [Scheduler](../../packages/core/src/ports/scheduler.ts) supplies claim/ack/release, but the claim includes no epoch, expiry, or renewal protocol. Mutual exclusion is required in prose. A backend could internally add leases; the Harness still needs a way to reject a stale writer or late dispatch after ownership has moved.

**Required decision:** couple writer fencing to the store and dispatch path, specify crash ownership recovery, and test lease loss during controller work and external dispatch. OpenClaw's lease-loss behavior is a practical comparison. Do not advertise distributed execution based only on queue mutual exclusion in a live process.

### R4 — Generic heterogeneous execution is narrower than the product aspiration

**Observation plus product/implementation gap; high priority.** [AgentExecutor](../../packages/core/src/ports/agent-executor.ts) receives a resolved model, compiled information, projections, and model-shaped observations. [Execution progress](../../packages/core/src/execution/context.ts) and [definitions](../../packages/core/src/definitions/types.ts) are closed around Agent/Workflow. The [Strands executor](../../packages/agents/strands/src/agent-executor.ts) intercepts native tool calls and resumes from supplied observations. That is substantive integration evidence, but it proves a constrained step bridge.

The [product vision](../product-vision.md) permits engines retaining their own cognition and context behavior. Treat this as an intended integration level, not a shipped property of every adapter.

**Proposal:** retain `AgentExecutor` for its current purpose and test a separate versioned native-runner envelope with opaque progress, optional mediation, and explicit capabilities. Only generalize the kernel discriminator if a concrete independent runner cannot be represented honestly. Do not add a second universal interface merely to repair marketing language.

### R5 — Dataflow is an early core/SDK decision, not late ergonomics

**Observation; high priority.** [Function Stage](../../packages/core/src/ports/stage.ts) accepts and returns text/null, exposes progress and resources but no committed structured-memory read view. [Workflow specification](../../packages/core/src/workflow/spec.ts) supplies authored terminal proposals; the [builder guide](../guides/agent-workflow-composition/workflow-agent-and-stages.md) explicitly says terminal output is a literal rather than the latest computed result. Child returns and branch results inherit these restrictions. [Existing builder findings](../development/legacy/2026-09-baseline/007-application-builder-ergonomics-findings.md) already recognize the friction.

**Proposal:** prove a typed deterministic transform → child → validation → computed result path. Prefer JSON/schema or an artifact reference with explicit ownership and revision. Preserve ordinary local values as local values; use shared state only where shared truth is needed. The canonical text-edge hypothesis should be evaluated and, if rejected, changed with docs and tests. This is not a small silent implementation fix.

### R6 — Portable schemas must be authoritative at the actual boundary

**Observation grounded in the [builder findings](../development/legacy/2026-09-baseline/007-application-builder-ergonomics-findings.md) and [SDK findings](../development/legacy/2026-09-baseline/009-sdk-bootstrap-design-and-findings.md); high priority before open integration.** Provider/model validation covers some paths, but the operation catalog is not yet a universal payload validation guarantee across custom controllers, function proposals, and executor adapters.

**Required decision:** one selected schema dialect and validation meaning at concrete dispatch; explicit unknown-operation handling; versioned operation identity; validation of outputs used as authoritative facts; faithful provider projection or clear rejection of unsupported features. Reuse a mature validator. Do not build a proprietary general schema engine or require all descriptor categories before this path works. Validation is necessary but does not establish principal authority or informed consent.

### R7 — Reference storage makes unrelated history part of every transaction's cost

**Observed source and executed diagnostic; medium priority for reference defaults, high before scale claims.** [InMemoryRuntimeStore.transact](../../packages/core/src/reference/in-memory-runtime-store.ts) ignores the scope argument, serializes globally, and `structuredClone`s the whole store. [Interleaving cost tests](../../tests/conformance/execution/interleaving-cost.test.ts) count facet calls; they cannot detect this physical work.

The [probe](evidence/store-copy-probe.mjs) seeds emissions once and runs transactions with empty callbacks. In this single local run, median transaction duration grows from **0.019 ms** with no emissions to **47.31 ms** with 5,000 emissions containing approximately 41 MB of text. See [raw measurements](evidence/store-copy-results.json). This is a reference-store diagnostic, not realistic throughput or an upstream comparison; concurrent checks and garbage collection can affect timings.

**Recommendation:** keep a clearly labeled small deterministic reference; instrument physical costs and bounded retention. Select copy-on-write/scoped transaction behavior or the chosen durable backend after the transaction boundary is decided. Do not optimize the old global aggregate and inadvertently make it the permanent distributed contract. Cross-execution operations currently span parent, child, root budget, or sender/receiver; a “scope” label alone does not define a safe shard boundary.

### R8 — A transaction comment overstates activation-wide atomicity

**Direct documentation inconsistency; medium priority, no implementation changed.** The catch in `Harness.applyOutcome` says nothing partial was committed if effect processing throws. [Effect processing](../../packages/core/src/runtime/effect-processor.ts), `processActivationEffects`, iterates proposals and processes them separately. A later failure does not imply earlier effects were rolled back. [Transaction atomicity tests](../../tests/conformance/effects/transaction-atomicity.test.ts) protect particular transactions, not an all-or-nothing multi-effect activation.

Correct the comment and add a focused failure-between-effects case when implementing R1. Do not change behavior into a fictitious transaction over external actions. Persist a truthful partial outcome and recover deterministically. This finding does not claim an observed duplicate action; it identifies misleading reasoning at a recovery-critical site.

### R9 — Deadlines and cancellation need a profile-specific end-to-end contract

**Observed limitation; high before long-lived external jobs.** Activation budgets in [Harness](../../packages/core/src/runtime/harness.ts) are advisory, and [child deadline conformance](../../tests/conformance/composition/child-call-deadline.test.ts) pins a limited behavior. Cancellation is checked at defined safe boundaries; trusted native code is not forcibly preempted by a TypeScript field. Cancellation of a waiter, cancellation of a child, stopping new actions, terminating physical work, and undoing completed work must remain distinct.

Specify inherited deadlines, independent child lifetime choices, expiry wakeups, late completion handling, and which backend can actually terminate work. Preserve explicit unknown side effects when termination interrupts a dispatch. Avoid treating every cancellation as a cascading kill or as proof of rollback.

### R10 — State retention, authority freshness, and code migration deserve earlier treatment

**Partly considered, incompletely operationalized; decision debt.** The [future plan](../future-plan.md) already discusses policy, memory scopes, information flow, durability, context, and SDK gaps. These are not newly discovered absent concepts. However, persistent deployment needs concrete policies for historical transcript growth, invocation snapshots, replay-compatible code/schema versions, revoked grants, credential rotation, artifact garbage collection, and tombstones.

The [caching research](../research/agent-caching-semantics-and-strategy.md) correctly distinguishes removable caches from invocation/recovery truth. Keep that distinction. A descriptor cache can leak existence even if later action authorization denies access. An authority ceiling persisted at creation does not eliminate the current final authorizer; conversely, current final authorization does not automatically refresh all exposed context. Define freshness at the owning read and dispatch boundaries.

### R11 — Local setup and evidence pointers require care

**Executed environment observation; low priority.** The SDK was listed as a workspace but its `node_modules/@arrokothi/sdk` link was absent. An offline install failed resolving a cached AWS dependency. Restoring the local workspace symlink made typecheck, examples, and builder checks pass without tracked source changes. This does not establish a reproducible clean installation; add one to release verification.

The benchmark README/readiness narratives and ArrokothI's external gate note trail the later non-canonical-host canary artifact. The same package version also spans a newer SDK HEAD than the frozen benchmark framework. Use commit/build identities rather than treating “0.8.1” as an exact experimental subject. Update routing summaries when the next evidence decision is accepted.

## Missing or underdeveloped areas, assigned to the right layer

| Area exposed by mature systems | Existing ArrokothI consideration | Proper next owner |
|---|---|---|
| Process loss, stale workers, outbox repair, retry/reconcile | Durability and unknown effects acknowledged; no shipped restart proof. | Core acceptance contract + durable implementation. |
| Native runtime ownership and honest partial mediation | Product integration spectrum; constrained executor proof. | Adapter contract and conformance manifest. |
| Result delivery independent of task completion; stream replay/cursors | Emissions separated from completion, transport details limited. | Core output identity; product delivery service and channel adapters. |
| Environment lost vs suspended; resource cleanup vs workspace persistence | Logical resources and containment research. | Small binding/lifetime contract if shared; backend implementation. |
| Tenant/principal mapping, authority on restored work, credential rotation | Canonical distinction and future questions. | Core authority context; deployment authentication/secret service. |
| Typed dataflow and computed results | Explicitly limited and documented. | Shared payload contract + controller/SDK authoring. |
| Context compaction, tool pruning, discoverability and native cache behavior | Extensive research, limited current strategies. | Replaceable Agent engine; measured independently. |
| Retention/deletion, artifacts, state version migration | Partial research and placeholders. | Minimal reference/provenance semantics; storage and product policy. |
| Fairness, admission/backpressure, quotas, stuck-task diagnosis | Spawn credits and some activation limits. | Scheduler/admission implementation under clear budget semantics. |
| Business verification, compensation, acceptance of generated artifacts | Engineering guidance includes verification. | Application protocols; kernel records evidence and actions without inventing universal compensation. |

The objective is fewer mandatory concepts with stronger guarantees at the seams. Adding every row as a kernel class would repeat the very expansion this study recommends avoiding.
