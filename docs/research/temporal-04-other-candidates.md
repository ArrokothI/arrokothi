# Restate, DBOS and Temporal SDK: comparison and proposed design-document changes

Research date: 2026-09-22. This replaces the initial repository shortlist with a source-based follow-up. It is **non-canonical research**: suggestions below do not change `mental-model`, select a dependency, release a work packet, or claim implemented support.

**Temporal remains the primary durability comparator; Restate adds a useful service-protocol comparison, and DBOS challenges the amount of infrastructure required.** The Temporal TypeScript SDK also supplies a concrete Agent integration baseline. None of these findings removes the plan to build ArrokothI's own Agent and Workflow systems after the Kernel/Driver foundation.

Distinguish an established boundary from an unfinished implementation/design choice. `mental-model` already specifies substantial rules for acceptance, uncertain actions, continuation, context bindings, local composition and output. Native Runtime APIs, recovery granularity and several concrete representations remain open. “Not implemented” and “not designed” should therefore be recorded separately.

## Source scope and confidence

| Local repository | Examined HEAD | Focus |
|---|---|---|
| `restate` | `eda4cf97ec8794614329d97078a3c8c3a8701c4f` | Service protocol, invocation handling, acknowledgment, retry metadata and module terms |
| `dbos-transact-ts` | `7bf4c184241db75f16e479647fe69e4dc911966a` | Step replay/result recording, timeout/cancellation, recovery and lifecycle APIs |
| `sdk-typescript` (`temporalio/sdk-typescript`) | `7ae5c7fb6728fe93696e1fc2f0da97018f6f20cc` | Strands Agent integration, Activity-backed model calls, handler completion and Workflow streams |

All three checkouts were clean when inspected. Links below pin these revisions; checkout contents are not assertions about a published release. Selected upstream tests were read, **not run**. No service was deployed or benchmarked. The Temporal SDK's Core submodule was uninitialized at `2deeab98d64a6bc1fac4eab5a942e7889acf8077`; this follow-up does not claim a local Core implementation audit. Restate's TypeScript SDK was not part of these three additions.

The ArrokothI source/status baseline remains in [report 1](temporal-01-architecture-comparison.md). Canonical ownership comes from the [reference index](../../mental-model/reference.md), with unfinished choices tracked in the [rewrite index](../../mental-model/rewrite-index.md#4-explicitly-undecided--implementation-owned). The existing `roles.rewrite.md` working edit was left untouched and was not substituted for the canonical page.

## What each repository adds

### Restate: study the durable service boundary without importing its programming model

The protocol gives an invocation a stable ID across journal replay and exchanges commands and notifications. It distinguishes a proposed `run` result from the later stored result; the acknowledgment contract describes storage and replication, with ordering relative to notifications preserved on replay. This is useful evidence for separating computation, proposal and acceptance. It does not establish equivalence with ArrokothI's complete Outcome/receipt contract. [StartMessage][r-start], [run completion proposal and acknowledgment][r-completion].

The protocol also represents nested future combinators and distinguishes a suspension message from an advisory report of what user code is awaiting. The advisory information becomes stale when a relevant notification is sent. The version enum assigns the future-tree and revised acknowledgment features to V7; deployment/SDK support must be checked for a selected release. [Future and suspension][r-future], [await observation][r-await], [version definitions][r-versions].

**Implication for ArrokothI:** a Runtime can have a rich internal waiting model without making it the Kernel's waiting language. Preserve finite Kernel dependency semantics and accepted-Outcome transitions; keep joins, model calls and local promises on the Runtime side. The existing distinction between `RUNNING` with internal work and Kernel-visible `WAITING` is valuable.

Another useful detail: retry count since the last stored entry is not durable and may reset after a crash or leader change. Elapsed duration can vary across replicas. Such operational observations cannot alone establish a durable business budget. [Retry metadata][r-retry]. This motivates P4 below without requiring a new Kernel token-accounting system.

### DBOS: durable step results are compact, but external execution remains separate

The executor looks up a recorded result by Workflow and function ID, checks the stored function name, and returns the recorded value/error. Otherwise it runs the step, with retries only when configured, and records the outcome afterward. This provides a concrete small execution model to compare with a service-based substrate. It also exposes the window between an external action and recording its result: a durable step result does not itself make arbitrary external effects exactly once. [Replay lookup][d-replay], [attempt loop][d-attempt], [result recording][d-record].

The timeout implementation races the step against a timer and supplies an abort signal. A timed-out step loses its route to record a result, but an uncooperative function can continue running. An upstream test lets the first attempt finish after a retry has returned and checks that the retained result belongs to the retry. That is evidence about result ownership, not physical termination. [Timeout implementation][d-timeout], [uncooperative-attempt test][d-zombie].

DBOS is useful for asking how small ArrokothI's transactional persistent path can be, and how clearly our Runtime distinguishes accepted progress from ongoing physical work. No throughput, operating-cost or recovery-safety superiority was measured here.

Its lifecycle API includes in-place rewind: discard recorded history from a step onward and re-enqueue the same Workflow ID, after terminalization. That native facility cannot be exposed as reopening a terminal ArrokothI Execution or erasing accepted action evidence. A Driver must refuse it or translate it into explicitly new logical work with retained provenance. [Rewind contract][d-rewind], [ArrokothI recovery/lifecycle](../../mental-model/concepts/state.md#recovery-and-re-execution).

### Temporal SDK: the Agent comparison is already concrete

The SDK contains an **experimental** Strands integration routing model/tool/MCP operations through Activities. `TemporalAgent` extends Strands' Agent but disables its native snapshot methods and retry strategy, substituting Temporal-managed persistence and retries. This is stronger evidence than saying Temporal can theoretically run an Agent. It also shows that preserving an Agent loop does not mean preserving every native execution feature. [Package status and scope][t-strands-readme], [Agent implementation][t-agent].

The model wrapper awaits an Activity result containing model events and then yields those events to the Agent. The streaming Activity can publish events live while collecting the returned array. Live observation and the result used by the replaying Workflow therefore follow different paths. An upstream test captures Agent Workflow history and replays it with a fresh Worker; it was inspected, not executed here. [Model wrapper][t-model], [streaming Activity][t-model-activity], [replay test][t-replay-test].

**Temporal plus its Agent integration** is consequently a useful later comparison for our native Agent system, alongside direct use of the underlying Agent framework. Evaluate changed snapshots, retries, interruptions, context and tool behavior; fidelity is more than similar final text. Experimental status and the untested version pair limit this evidence.

The SDK also offers two precise lessons:

- `allHandlersFinished()` tracks in-progress Signal/Update handlers. The stream helper drains pollers and waits for those handlers before Continue-As-New: a concrete Runtime completion barrier. [Handler completion][t-handlers], [stream rotation][t-rotate].
- The stream subscription helper catches `TruncatedOffset`, resets its offset to zero and continues from retained data. It does not surface that error through that branch; item offsets still permit additional consumer checks. ArrokothI requires an explicit retention gap, so an adapter cannot blindly inherit this convenience behavior. [Subscription implementation][t-truncation], [existing retention rule](../../mental-model/mechanisms/output.md#bounded-retention).

## Proposed changes to mental-model, for later review

These are suggestions, not specification edits. **Clarification** means the boundary already exists. **Design choice** means a Runtime/profile decision still needs evidence. Each proposal names its owner and a counterexample; none adds a prerequisite for the next K1 packet.

| ID | Suggested action | Owner | Kind and later evidence |
|---|---|---|---|
| P1 | Clarify “optional reference Runtime”; retain native Agent/Workflow depth | `runtime.md`, `concepts/roles.md`, composition introduction | Editorial clarification; product sequence stays outside protocol semantics |
| P2 | Add a native continuation/replay decision table | `mechanisms/recovery.md`, `mechanisms/composition.md`, `mechanisms/context.md` | Runtime design choice; R1/K3 obligations, later R2 native implementation |
| P3 | Specify responsibility for work crossing a completion/rotation boundary | `mechanisms/composition.md`, `mechanisms/recovery.md` | Existing barrier rule made concrete; R2 and relevant K3/K5 cases |
| P4 | Expand retry ownership and budget-reset declarations | `mechanisms/integration.md`, `mechanisms/resources.md` | Support-record clarification plus profile-specific budget choices; R1/K3/K5 |
| P5 | Add an uncooperative losing-branch counterexample | `mechanisms/composition.md`, `mechanisms/resources.md` | Existing rule reinforced; Runtime/Driver/resource evidence |
| P6 | Add explicit stream-gap and failed-attempt mapping cases | `mechanisms/output.md`, `mechanisms/integration.md` | Existing rule reinforced; K4.4/K5 and Driver evidence |
| P7 | Record fidelity changes when native features are replaced | `mechanisms/integration.md`, `mechanisms/evidence.md` | Existing comparison requirement sharpened; R1 and native R2 comparisons |
| P8 | Add lifecycle/replay counterexamples without importing foreign lifecycle APIs | `concepts/state.md`, `mechanisms/recovery.md` | Existing terminality/compatibility rules reinforced; Driver/K3/K5 evidence |

### P1 — Make optional precise without deleting our native system

The [roles introduction](../../mental-model/concepts/roles.md) calls these optional reference facilities; [Runtime](../../mental-model/runtime.md#state-and-quality-remain-runtime-concerns) and [composition](../../mental-model/mechanisms/composition.md) make the same distinction. This correctly means other Runtimes need not implement our abstractions. It can be read too broadly as saying ArrokothI will only wrap other products.

Suggested explanatory wording for later review:

> These facilities describe ArrokothI's native Agent/Workflow design. They are optional for Kernel conformance: another Runtime can supply its own control flow, state and context machinery. Their design and implementation belong to the Runtime layer.

Retain Agent versus Workflow, Stage/local branch, context bindings, notes and composition detail. Record the user's product sequence—Kernel/Driver foundation, then our native Agent/Workflow systems—in planning material. This does not select a particular SDK, release date or already-shipped feature, and requires no change to the central boundary.

### P2 — Choose the native recovery unit before choosing a shared engine

The [recovery owner](../../mental-model/mechanisms/recovery.md) already permits reattachment, checkpointing and safe replay. What remains useful to design is the unit at which **our** Agent/Workflow implementation can actually resume:

| Candidate unit | Benefit to test | Information or obligation to preserve |
|---|---|---|
| Model/tool invocation result journal | Avoid repeating completed nondeterministic calls | Invocation bindings, results, ordering and compatible code; unresolved external action still needs evidence |
| Runtime checkpoint at selected boundaries | Preserve native state without replaying the whole loop | Exact state/codec/resources, in-flight request disposition and recovery behavior between checkpoints |
| Coarse native job with reattachment | Smaller Driver surface | Stable submission identity, retained native job and safe takeover; job ID alone is insufficient |

These are candidate Runtime designs, not new Kernel progress variants. A hybrid may be useful but is not selected. Temporal's Agent adapter demonstrates the first approach; DBOS demonstrates step-result replay. They justify an experiment, not a mandatory journal for every Runtime.

Extend the existing [context binding](../../mental-model/mechanisms/context.md#fix-bindings-for-each-invocation) example: a model reply arrives after an alias changed and the process restarted. Recovery uses the original invocation's bindings and input/state version, preserves the needed snapshot, or holds. Recomputing today's context cannot reconstruct the original request by assertion. This obligation is already designed; native representation and recovery granularity remain choices.

### P3 — Define what survives a boundary while handlers are active

[Stage barriers](../../mental-model/mechanisms/composition.md#typed-work-and-completion-barriers) already reject “function returned, therefore all work finished.” Add a continuation-boundary table for in-flight input handlers, model requests, branches, human pauses, invocation snapshots and provisional output. For each selected native implementation, specify **drain, retain with a continuation owner, or refuse the transition**.

Temporal's handler/stream rotation sequence is useful prior art, not a mandated implementation. The counterexample is a user correction or branch result arriving between snapshot creation and rotation: it must be accounted for on one side, explicitly rejected, or retained—not silently vanish or mutate a completed Stage. R2 tests the local boundary; claimed durable rotation also needs process-fault evidence. Kernel need not understand local graph handlers.

### P4 — Name the retry owner at every layer

The [support record](../../mental-model/mechanisms/integration.md#support-record) already asks about retries and repeat cost. Expand that row with a map: transport delivery, substrate task/Activity, Driver submission, native Runtime, provider SDK. State which layer retries which logical operation, whether identity survives recovery, and which counters reset. Temporal's Strands adapter disabling native retries is one possible policy, not the only permissible one.

For [resource accounting](../../mental-model/mechanisms/resources.md#capacity-cancellation-and-retention), distinguish operational counters from a claimed hard budget. Restate explicitly labels some retry metadata non-durable. A bound across recovery needs evidence from the enforcing owner's durable admission/reservation/accounting contract, including uncertain consumption. An in-memory loop counter cannot prove it. This does **not** add universal token metering or extend Kernel governance to unmediated provider calls.

Counterexample: provider retries, Activity retries, then process restart resets a local allowance. Verify physical calls and independent billing/action evidence, rather than reporting one logical attempt. Keep advisory estimates advisory.

### P5 — Keep cancellation and mutation ownership separate inside our Runtime

The [fork/join rules](../../mental-model/mechanisms/composition.md#forks-joins-and-corrections) already isolate branch scratch/results and require a declared join policy. Preserve them. Add the DBOS-style counterexample: a losing or timed-out branch continues writing after the winning result is selected.

Dropping its return value protects the selected result but not a shared file, session or external account. Our Runtime needs branch-local mutation boundaries, service preconditions, enforced native ownership, or a policy that waits/refuses replacement when safe separation is unavailable. Do not turn every branch into a child Execution or imply Kernel fencing solves this. Test accepted results and external mutation independently; containment remains a separate deployment claim.

### P6 — Preserve an explicit gap through output adapters

Keep the [accepted/provisional distinction](../../mental-model/mechanisms/output.md#acceptance-makes-output-observable) and [retention rule](../../mental-model/mechanisms/output.md#bounded-retention). Add an adapter example where the underlying stream automatically moves an expired cursor forward, as the Temporal helper does. ArrokothI observers must receive the required gap/reset disposition; the adapter may need lower-level access or its own checked mapping.

Test retention gaps, provisional output from a failed/retried attempt, and replay-to-live handoff during rotation. Transport delivery or a token on screen is not accepted Kernel output. This adds a conformance example without adding a general stream-processing engine to Kernel.

### P7 — Record feature replacements as fidelity changes

The [fidelity requirement](../../mental-model/mechanisms/integration.md#evidence-before-support) already compares direct native use against a thin Driver. Explicitly record **preserved, replaced, disabled, unsupported**, with consequences for snapshots, retries, hooks, interruption, streaming and context/state.

Temporal's Strands integration retains Agent behavior while replacing persistence/retry facilities: a meaningful tradeoff, neither perfect native preservation nor no preservation. Our Agent/Workflow systems may choose differently. Compare verified task outcomes, recovery, repeat cost and developer work. Keep Kernel, Agent quality, Workflow behavior, Driver fidelity and isolation failures separate, as the [evidence owner](../../mental-model/mechanisms/evidence.md) requires.

### P8 — Reject misleading analogies for rewind and replay compatibility

Add DBOS's in-place rewind under [recovery and re-execution](../../mental-model/concepts/state.md#recovery-and-re-execution). A native repair operation does not authorize reopening a terminal Execution, deleting accepted evidence, reusing consent or silently replaying consequential work. New work needs its own identity and authority; recovery follows the current contract.

Under [compatibility and migration](../../mental-model/mechanisms/recovery.md#compatibility-and-migration), contrast changed step names/order with unchanged names but changed semantics. DBOS's inspected replay path checks the function name; that check alone does not prove equivalent arguments, policy, bindings or code behavior. Preserve ArrokothI's version/codec and migration obligations. Matching strings or successful deserialization cannot establish compatibility alone.

## What to remove, retain and leave undecided

**Remove or rephrase ambiguity**, especially an implication that “optional for Kernel conformance” means “no native Agent/Workflow product.” Replace the obsolete request to clone these three repositories in this research series. Do not delete detailed Runtime design because foreign frameworks can supply alternatives.

**Retain** asynchronous Activation/Outcome, opaque Runtime progression, explicit unknown-action handling, independent native ownership, exact invocation bindings, typed local dataflow and separate containment evidence. This review strengthens the reasons for those rules.

**Do not add yet:** a universal Runtime replay language, Restate's future tree as Kernel wait syntax, DBOS step decorators as Kernel concepts, a Kernel Agent/Workflow kind union, or a mandatory context IR/shared interpreter. Decide shared implementation machinery within our Runtime using concrete cases. The existing open Definition/revision, Driver cardinality and representation choices remain unresolved by this comparison.

## Timing and the native-system comparison

Follow the requested sequence: finish the concept-document rewrite, implement the next intended Kernel packet, then revisit these proposals. This research adds no rewrite or substrate experiment as an entry condition. A naming discrepancy remains: the user referred to K1.1, while the current [ledger](../development/007-work-packets.md#authoritative-status) records K1.1 accepted and K1.2 released for implementation. This report changes neither the ledger nor the requested sequence.

Later, keep two evaluations separate:

1. **Kernel/Driver and substrate:** use [report 3's](temporal-03-integration-and-experiments.md#a-comparison-that-can-reject-our-preferred-design) deterministic fake Runtime and process-fault fixture. Compare a narrow transactional path with one selected mature substrate under the existing K3 process. Restate and DBOS remain candidates, not commitments to build three production backends.
2. **Our native Agent/Workflow:** hold Kernel fixed and test context binding, correction handling, typed local dataflow, concurrent branch ownership, pause/resume and the chosen recovery unit. Then compare the whole useful application against direct framework use and Temporal plus an appropriate Agent/Workflow implementation. Disclose changed persistence/retry/context policies; do not attribute a stronger model to a better Kernel.

A compact later task set is extraction → typed validation → parallel analysis → human correction → approval → publication. Include a late model reply, a losing branch ignoring cancellation, a process crash after publication and an expired output cursor. Measure verified result quality, lost input, duplicated actions, repeat cost, latency, retained state and application code. This spans several roadmap owners and is not a demand to implement it in K1.

The strongest potential product combines reusable execution/action contracts with a capable native Agent/Workflow experience. It should earn both claims independently. There is enough local material for this round; no additional clone is needed before choosing an experiment.

## Reuse and license scope

This follow-up learns from implementation and links evidence; it copies no code/tests/assets and adds no dependency or service. DBOS and Temporal TypeScript SDK root licenses are MIT, with notice-preservation requirements for covered copies. Dependencies, modules and service terms still need exact-version review for an actual integration. [DBOS LICENSE][d-license], [Temporal SDK LICENSE][t-license].

Restate requires module-specific treatment. Its root is BSL 1.1 with an additional-use grant excluding the defined Public Restate Platform Service, listing permitted application/internal scenarios, and stating a change to Apache 2.0 four years after release. Separately, the inspected service-protocol file declares MIT terms in its header. These facts do not establish clearance for a future hosted ArrokothI service: review the selected version, module, actual API exposure and applicable terms before incorporation. [Root terms, lines 1–40][r-license], [protocol header, lines 1–8][r-protocol-license].

[r-start]: https://github.com/restatedev/restate/blob/eda4cf97ec8794614329d97078a3c8c3a8701c4f/service-protocol/dev/restate/service/protocol.proto#L55-L71
[r-completion]: https://github.com/restatedev/restate/blob/eda4cf97ec8794614329d97078a3c8c3a8701c4f/service-protocol/dev/restate/service/protocol.proto#L213-L264
[r-future]: https://github.com/restatedev/restate/blob/eda4cf97ec8794614329d97078a3c8c3a8701c4f/service-protocol/dev/restate/service/protocol.proto#L109-L156
[r-await]: https://github.com/restatedev/restate/blob/eda4cf97ec8794614329d97078a3c8c3a8701c4f/service-protocol/dev/restate/service/protocol.proto#L229-L237
[r-versions]: https://github.com/restatedev/restate/blob/eda4cf97ec8794614329d97078a3c8c3a8701c4f/service-protocol/dev/restate/service/protocol.proto#L17-L49
[r-retry]: https://github.com/restatedev/restate/blob/eda4cf97ec8794614329d97078a3c8c3a8701c4f/service-protocol/dev/restate/service/protocol.proto#L80-L90
[r-license]: https://github.com/restatedev/restate/blob/eda4cf97ec8794614329d97078a3c8c3a8701c4f/LICENSE#L1-L40
[r-protocol-license]: https://github.com/restatedev/restate/blob/eda4cf97ec8794614329d97078a3c8c3a8701c4f/service-protocol/dev/restate/service/protocol.proto#L1-L8
[d-replay]: https://github.com/dbos-inc/dbos-transact-ts/blob/7bf4c184241db75f16e479647fe69e4dc911966a/src/dbos-executor.ts#L950-L962
[d-attempt]: https://github.com/dbos-inc/dbos-transact-ts/blob/7bf4c184241db75f16e479647fe69e4dc911966a/src/dbos-executor.ts#L1021-L1097
[d-record]: https://github.com/dbos-inc/dbos-transact-ts/blob/7bf4c184241db75f16e479647fe69e4dc911966a/src/dbos-executor.ts#L1099-L1119
[d-timeout]: https://github.com/dbos-inc/dbos-transact-ts/blob/7bf4c184241db75f16e479647fe69e4dc911966a/src/dbos-executor.ts#L974-L1014
[d-zombie]: https://github.com/dbos-inc/dbos-transact-ts/blob/7bf4c184241db75f16e479647fe69e4dc911966a/tests/step_timeout.test.ts#L258-L277
[d-rewind]: https://github.com/dbos-inc/dbos-transact-ts/blob/7bf4c184241db75f16e479647fe69e4dc911966a/src/dbos.ts#L1125-L1157
[d-license]: https://github.com/dbos-inc/dbos-transact-ts/blob/7bf4c184241db75f16e479647fe69e4dc911966a/LICENSE
[t-strands-readme]: https://github.com/temporalio/sdk-typescript/blob/7ae5c7fb6728fe93696e1fc2f0da97018f6f20cc/contrib/strands/README.md#L1-L5
[t-agent]: https://github.com/temporalio/sdk-typescript/blob/7ae5c7fb6728fe93696e1fc2f0da97018f6f20cc/contrib/strands/src/temporal-agent.ts#L8-L88
[t-model]: https://github.com/temporalio/sdk-typescript/blob/7ae5c7fb6728fe93696e1fc2f0da97018f6f20cc/contrib/strands/src/temporal-model.ts#L54-L79
[t-model-activity]: https://github.com/temporalio/sdk-typescript/blob/7ae5c7fb6728fe93696e1fc2f0da97018f6f20cc/contrib/strands/src/model-activity.ts#L96-L122
[t-replay-test]: https://github.com/temporalio/sdk-typescript/blob/7ae5c7fb6728fe93696e1fc2f0da97018f6f20cc/contrib/strands/src/__tests__/test-strands.ts#L723-L758
[t-handlers]: https://github.com/temporalio/sdk-typescript/blob/7ae5c7fb6728fe93696e1fc2f0da97018f6f20cc/packages/workflow/src/workflow.ts#L1944-L1958
[t-rotate]: https://github.com/temporalio/sdk-typescript/blob/7ae5c7fb6728fe93696e1fc2f0da97018f6f20cc/contrib/workflow-streams/src/workflow.ts#L208-L279
[t-truncation]: https://github.com/temporalio/sdk-typescript/blob/7ae5c7fb6728fe93696e1fc2f0da97018f6f20cc/contrib/workflow-streams/src/client.ts#L446-L477
[t-license]: https://github.com/temporalio/sdk-typescript/blob/7ae5c7fb6728fe93696e1fc2f0da97018f6f20cc/LICENSE
