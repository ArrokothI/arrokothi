# Evidence, benchmark fitness, and falsifiable hypotheses

[Study home](README.md). Architectural cleanliness is not an outcome measure. This report separates what was executed, what the existing benchmark demonstrates, and what must still be tested before investment.

## Evidence obtained in this study

| Check | Result | Meaning and limit |
|---|---|---|
| `npm test` | 965 passed, 0 failed. | Current deterministic semantic/package suite passes on this checkout. It is not a production durability or security campaign. |
| `npm run test:evals` | 12 passed, 0 failed. | Deterministic reference Agent behavioral baseline; no live model quality or comparative superiority claim. |
| `npm run test:example:execution-kernel` | 18 passed after local SDK link repair. | Public examples run in the available environment. Initial missing-link failure retained. |
| `npm run typecheck` | Passed after the same repair. | Types compile using installed dependencies plus the restored workspace link. A fresh install was not proved. |
| `npm run check:builder-docs` | Passed: 20 Markdown files, 218 links/anchors, 38 public imports. | Existing builder documentation checks; separate from this study's link verification. |
| Reference-store copy probe | Median no-op transaction: 0.019 / 0.479 / 7.528 / 47.310 ms at 0 / 100 / 1,000 / 5,000 retained 8 KiB emissions. | Direct diagnostic of global snapshot copying. One local run, 20 measured samples per point; not throughput, a stable percentile estimate, or a comparison. |
| Upstream tests | Inspected selected test source; not run. | Coverage intent and mechanism evidence, not verified upstream test results. |
| Live model and cross-framework campaigns | Not run. | No measured ArrokothI competitive advantage is established by this study. |

Commands, raw output, setup repair, and limitations are in [the evidence directory](evidence/README.md). No major architecture or implementation change was made to turn these checks green.

## What the benchmark gets right

The [benchmark architecture](../../../benchmark/docs/benchmark-v3-architecture.md) separates task requirements, cases, frozen subjects, repeat-level generation, and evaluation. That prevents a convenient score from becoming the only retained fact. Its [generation identity](../../../benchmark/src/identity/generation-unit.ts) keys generation-affecting inputs independently from evaluator settings, allowing new judgments over the same generated evidence.

The builder path exposes public requirements and an exact framework surface while separating evaluator/private material. It tracks isolation and construction identity. That is valuable for asking whether an ordinary coding agent can build on a framework under a bounded budget, rather than rewarding a hand-tuned benchmark-specific demo. Keep this discipline for sealed comparative claims.

The [runtime harness](../../../benchmark/src/runtime/harness.ts) distinguishes proposed operations, confirmation, authorization, dispatched payloads, external outcomes, and dispatch counts. Provider requests are distinct from token usage. Those distinctions align with a serious evaluation principle: prose is not evidence of committed state, successful action, or safe information flow.

[Runtime checkpoints](../../../benchmark/src/runtime/checkpoint.ts) conservatively distinguish safe resumption from an attempt whose external effect is unresolved. This is good laboratory behavior. It does not establish that a subject framework can itself survive process death.

## What the inspected canary actually establishes

The [third neutral canary artifact](../../../benchmark/docs/benchmark-v3-neutral-change-request-canary-v3.md) records a successful real coding-agent build on a non-canonical host. It follows earlier construction-path failures and introduces an identity-bearing local package-link policy instead of asking the builder to bypass public packages. The accepted run used one real coding-agent invocation with no repair and passed its declared validation. The artifact still distinguishes that result from a canonical Linux/AppArmor environment run.

This establishes that the frozen ArrokothI release can be used by a real coding agent through the tested construction path. It does **not** establish live runtime model quality, hidden-case superiority, better native Agent behavior, production isolation of ArrokothI, or comparative advantage over any upstream system. The benchmark checkpoint is a laboratory checkpoint, not an ArrokothI recovery test.

The framework used by that artifact predates the current SDK HEAD even though the package version remains 0.8.1. The root benchmark README/readiness narrative and ArrokothI's [external validation note](../development/008-external-validation-gates.md) do not fully reflect the later artifact. Consult exact build/commit evidence rather than inferring a campaign result from a routing document. This study deliberately does not reproduce evaluator-private cases or turn hidden judgments into implementation advice.

## Where the current protocol is insufficient

The [subject process protocol](../../../benchmark/src/runtime/subject-process.ts) centers on conversational turns, operation proposals, and state inspection. It is a useful native benchmark protocol. The architecture also permits external adapters, so the correct response is to add suitable protocols/tracks, not declare the whole benchmark conversation-only.

For the core question, additional evidence is needed:

- true subject worker process death, restart, and lease takeover;
- callbacks arriving independently of conversational turns, out-of-order and duplicate inputs, and durable human waiting;
- internal invocation attempts, consumed-input recovery, model cost after crashes, and readiness repair;
- native engine checkpoint fidelity, direct/indirect action paths, and control-plane ownership;
- physical resource loss, artifact access and retention, streaming/delivery recovery;
- multi-tenant principal restoration and authority revocation at the relevant boundary;
- application integration effort, adapter maintenance, and the cost of the extra runtime itself.

Some of these belong in deterministic kernel conformance, others in deployment tests, and others in comparative application experiments. Do not expand one hidden conversation corpus until it pretends to answer all of them.

### The critical attribution problem

The benchmark harness can supply confirmation, authorization, and controlled-effect behavior. If it blocks an unsafe request, a final-world-state score may make two subjects look equally safe even when one proposed the unsafe action and the other did not. Conversely, a framework shouldn't be penalized for delegating policy to the application when that is its advertised design.

Record **raw subject proposals, subject-native decisions, harness interventions, and final observed effects** separately. Run an instrumented native boundary track where the framework/application's real action gateway is exercised against controlled external services. The lab may physically prevent real harm, but its test double should record an unauthorized attempted dispatch as a failure, not silently repair the subject's behavior. Publish the protection ownership for every scored requirement.

Apply the same discipline to state adapters: an `inspect` response is not automatically independently observed committed state. Identify whether it reads a real datastore, an application field, a reconstructed transcript, or a test fixture. Preserve the distinction when normalizing evidence.

## Two evidence tracks

**Diagnostic track:** cheap, public, deterministic fixtures and a few deliberately selected live tasks. It exists to falsify architecture quickly, can run before a canonical container campaign, and is labeled non-comparative unless baselines and controls justify more. Process-kill and transaction tests need no paid models. Do not let perfect benchmark infrastructure delay discovering an invalid recovery contract.

**Sealed comparative track:** exact framework/build/model/config identities, bounded construction, isolated evaluation, immutable evidence, and multiple repeats. Use it after deciding which claim to measure. Keep a coding-agent construction experiment separate from an expert-reviewed best-native runtime experiment. Equal build budgets answer usability under those budgets; they do not reveal each framework's attainable best performance.

A very small team should run the next discriminating experiment, not construct an exhaustive permanent league table. One direct baseline and one serious alternative often suffice to reject an expensive direction.

## Proposed experiments and decision gates

The numerical margins below are **proposed starting criteria**, not measured wins or universal SLAs. Freeze application requirements, margins, failure model, and sample plan before examining comparison results. Report paired results, confidence intervals where appropriate, failure severity, and all exclusions. A pilot calibrates variance and run count; an underpowered inconclusive result is not a pass.

### E0 — Does the proposed product remove a repeated problem?

**Claim:** developers need a common governed boundary across independently valuable engines.

Choose two application shapes: (a) a specialist produces an artifact that a deterministic process validates before a human-authorized action; (b) a long-lived request coordinates two separately owned services across a wait and restart. Use public synthetic domain fixtures independent of sealed benchmark cases. Obtain concrete user or operator requirements if possible; do not substitute enthusiasm for the “Agent machine” metaphor.

Build the smallest direct/native implementation first or alongside the candidate boundary. Track application-specific glue, authoritative stores, retry/lifecycle owners, supported failures, setup time, maintenance points, and verified outcomes. Line counts are diagnostics, not the objective.

**Gate:** a recurring failure or integration obligation is reduced in both applications without discarding useful native behavior. If only one narrowly specified action path benefits, narrow to an action/authority library. If neither benefits, stop broad kernel development. User demand remains unvalidated until actual teams choose to use the result.

### E1 — Can the core recover truthfully from process death?

**Claim:** a coherent ArrokothI contract removes common recovery errors rather than merely serializing objects.

Run a deterministic controller and controllable external service with independent durable records. Kill the worker after input acceptance, after consumption/reservation, during controller-local work, after action intent, after remote success before local receipt, after local settlement before wake publication, and during progress commit. Restart in a new process. Add duplicate and late callbacks, corrupted/stale checkpoint version, lease takeover, and revocation before dispatch. Repeat each boundary under different timing schedules; distinguish process crash from host/storage-loss guarantees.

Assertions: no lost accepted input; no two accepted progress writers; no invented successful outcome; no unauthorized dispatch; no automatic retry of an unresolved non-idempotent action; reconcilable actions use authoritative external evidence; idempotent actions preserve one logical result; all waits have a recoverable wake or explicit terminal/manual state. Measure detection/recovery latency and repeated model/operation cost.

Compare a narrow transactional implementation with **one** existing durable-runtime implementation of the same policy. If the latter supplies the mechanism more simply, adopt it. Zero violations in the declared deterministic fault matrix is an entry requirement for durable claims, not statistical proof of universal reliability. A single invariant breach blocks layering until explained and repaired.

### E2 — Is heterogeneity preserved, or normalized away?

**Claim:** one native engine can retain its strengths while a shared boundary governs the application's consequential actions.

Use one mature engine in its normal task mode, with a representative native context/tool workflow. Compare native-only, external-task integration, and a limited mediated adapter. Only then repeat with a second independently designed engine. Measure task completion, native feature retention, checkpoint/resume, usage, startup/bridge latency, adapter size/dependencies, and upgrade effort. Test direct tools, bridge tools, nested delegation, fallback paths, cancellation, and restored identity.

**Gate:** every advertised mediation/recovery claim passes conformance; useful native capabilities remain usable; no undisclosed bypass. Provisional performance criterion: task success within 5 percentage points of the paired native baseline and less than 10% added end-to-end cost/latency on the chosen workload, unless a documented correctness benefit justifies the tradeoff. A pass requires enough evidence to assess those margins, not three lucky runs. If external-task integration meets the need, delete the deep adapter stage.

### E3 — Is typed composition a simpler common boundary?

**Claim:** typed local results and artifact references reduce builder friction without bloating kernel semantics.

Have a coding agent build two small applications through public imports: structured extraction → deterministic validation → computed child result; and parallel bounded analyses → deterministic join → final artifact. Compare the current text/null workaround with the proposed minimal typed result path. Tests assert values and ownership, not a prescribed implementation. Include malformed outputs, schema version mismatch, stale shared-state revisions, and cross-owner artifact access.

**Gate:** no JSON-as-text parsing convention, model call, or shared-memory detour is needed solely to transfer a typed value. Public examples produce computed results naturally and validation fails at the actual boundary. If this can be solved cleanly in the SDK without a kernel semantic change, keep it there. Do not add a general dataflow language merely because JSON values are useful.

### E4 — Does JIT discovery improve useful work per budget?

**Claim:** authorized progressive discovery scales better than eager or flat retrieval.

Vary catalogs from small to large, include ambiguous and rare operations, change permissions and descriptor revisions, and preserve essential controls in all arms. Compare eager projection, deterministic top-k retrieval, native search/describe/call, hierarchy, and optional scout. Use at least two model capability levels; separate warm/cold cache measurements and distinguish reported provider tokens from estimated prompt size.

Measure task success, tool-selection errors, unauthorized metadata/content exposure, number of discovery turns, total model/scout cost, and wall time. **Gate:** zero observed access-boundary violations; success non-inferior within a predeclared margin; a practical win such as at least 20% lower total token cost at similar latency on large-catalog tasks, with no compulsory overhead for small catalogs. If native flat search matches it, reuse that strategy and stop namespace/Scout product expansion.

### E5 — Do bounded programs beat simpler ways to reduce model turns?

**Claim:** a small suspendable Program adds value beyond tool batching or deterministic application code.

Compare ordinary tool calls, a developer-written function/Workflow, a native code execution facility under equivalent powers, and a bounded logical program. Use tasks with dependent reads, deterministic transformations, and one governed action. Inject failure at each host call, mutate an operation schema, revoke authority between calls, and test budget exhaustion and partial completion.

Measure model turns, total tokens/cost, task success, program construction/repair rate, state size, debugging time, and recovery behavior. **Gate:** substantial end-to-end savings (provisionally 25% fewer total model tokens or calls) without weaker correctness, and an advantage over the simpler batching/function baseline. A safe subset with poor model usability is not a win. If only code execution helps, integrate existing computation and abandon the new language. A shared Agent/Workflow IR requires a further simplification result; E5 success alone does not authorize it.

### E6 — Are multi-Agent gains more than extra budget?

**Claim:** heterogeneous collaboration adds complementary capability.

Compare a single strong native Agent, a single Agent with the same total budget, a deterministic fan-out of tools, homogeneous workers, and a heterogeneous pair. Use independent task partitions with verifiable merged output; separately test tasks requiring shared mutable resources where coordination can hurt. Track duplicated work, handoff loss, join errors, external action conflicts, elapsed time, and total cost.

**Gate:** repeatable improvement in verified outcomes or latency at comparable cost, with explicit cancellation/ownership and no additional safety regressions. If improvement comes only from spending more, report it as budget scaling and do not build a coordination platform. Keep simple fan-out if it accounts for the benefit.

### E7 — Can the deployment deliver its declared guarantees economically?

Run increasing dormant executions and retained history, bursty wakeups, slow services, large artifacts, tenant contention, cancellation storms, and provider throttling. Measure memory, bytes copied, reads/writes per accepted transition, queue delay, fairness, recovered work, and cost per active versus dormant task. Add environment binding loss, secret rotation, and restart on another worker. Target measured application requirements, not arbitrary ecosystem scale.

**Gate:** the selected deployment meets a declared operating budget and failure model; disabled optional features do not impose unbounded work; retention/deletion and migration preserve necessary truth. If a managed substrate is cheaper and adequate, use it. If the only apparent market requires a large distributed platform team, reassess the market before scaling the implementation.

## Claim ledger

| Hypothesis | Current status | Next evidence | Disconfirming result |
|---|---|---|---|
| Cleaner semantics improve application correctness. | Plausible; local conformance only. | E0/E1 with a competent direct baseline. | Same outcomes and equal or lower application effort without ArrokothI. |
| Heterogeneous engines need a new common runtime. | Unproven; strong upstream analogues. | E2 plus one durable baseline. | Opaque jobs/API calls suffice, or deep mediation destroys native value. |
| Durable waiting is a differentiator. | Planned implementation; mature alternatives exist. | E1/E7. | Existing runtime supplies equivalent behavior with less work. |
| Authority/projection separation is reusable value. | Implemented meaningful boundary, no comparative advantage. | E0/E2 native action conformance. | Shared application policy library captures all benefit. |
| Logical namespaces help models. | Research. | E4. | Flat search/retrieval matches or beats hierarchy. |
| Scouts make smaller models more effective. | Research. | E4 with full scout cost and provenance. | Omission/latency/cost erases savings. |
| Suspendable Programs simplify execution. | Research. | E5 plus two control implementations. | Existing code tools/functions deliver the same benefit. |
| A broad Studio/Cloud is worth building. | Product hypothesis. | Repeated adoption and operator needs after core gates. | No recurring users or no need beyond a small inspector. |

No row is currently a proven comparative advantage. The purpose of the next development work is to change that evidence state, or to stop spending on a claim that does not survive.
