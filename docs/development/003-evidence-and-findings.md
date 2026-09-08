# Evidence and findings register

> Current triage, 2026-09-07. The [roadmap](001-current-status-and-roadmap.md) owns sequence;
> this register owns evidence pointers and unresolved-item disposition. Add new findings here.
> No entry is an implicit canonical change. “Planned” means work accepted, solution still gated.

## Evidence boundary

Inspected `agent-kernel` at `e96e513` (SDK implementation `3bdc4f6`) and `benchmark` at `04148be`.
Both working trees were clean before this documentation change. Inspection covered canonical owners,
current development reviews, builder guides/examples, package exports, core ports/controllers/runtime,
reference store/policy, representative conformance and adapter tests, strategy-study findings and
experiments, future/product/research material, benchmark runtime/build/freeze/CLI and review records.
Historical findings were also searched in `4cc8941^:docs/development/legacy/` (29 documents), especially
projection integrity, memory revision disclosure and the Working Notes hot-path follow-up.

The study's 965 package/conformance, 18 example and 12 eval passes remain **historical executed
results**, with its setup repair recorded in [study evidence](../architecture-strategy-study/evidence/README.md).
They support the current local profile, not recovery, fresh installation or competitive superiority.
Source inspection confirms the concerns below remain relevant; this planning change implements none
of them. Current validation for the reorganization is recorded under [validation](#validation).

## Pre-1.0 findings

| ID | Current finding and source | Disposition / acceptance obligation |
|---|---|---|
| F01 | Catalog schemas do not universally validate Function/custom-controller capability payloads. [Effect processor](../../packages/core/src/runtime/effect-processor.ts), [builder review](legacy/2026-09-baseline/007-application-builder-ergonomics-findings.md#capability-schema-validation-boundary), study R6. Unknown-catalog calls have existing conservative handling. | **P1**: decide dispatch/output validation and unknown-operation policy explicitly, preserve exact payload consent and schema acceptance fidelity across all paths. |
| F02 | Reference [allow-list authorizer](../../packages/core/src/reference/allow-list-authorizer.ts) selects first capability match; later operation-specific grants can be shadowed. | **P1**: decide overlap/refusal semantics and regressions. This is surprising denial behavior, not evidence of a privilege escalation; do not merge grants blindly. |
| F03 | Colon-bearing operation tuples now survive indexing but requested model aliases can collide and fail `agent_projection_ambiguous`; SDK warns. [SDK findings](legacy/2026-09-baseline/009-sdk-bootstrap-design-and-findings.md#remaining-correctness-and-architectural-concerns), [projection](../../packages/core/src/operations/projection.ts). | **P1/P7**: explicit refusal is valid; either retain actionable diagnostics or allocate collision-safe aliases with immutable bindings. No alias becomes policy identity. |
| F04 | [Stage port](../../packages/core/src/ports/stage.ts) uses text/none; [terminal proposals](../../packages/core/src/workflow/spec.ts) are literal/none; stock Agent returns response text. Canonical composition §4 calls text edges a hypothesis. | **P2**: typed local/child/join/computed terminal proof and migration. Validate rather than silently coerce objects to text. Study R5. |
| F05 | Stock Stages cannot read committed Structured Memory; host initialization lacks a supported setter, child bindings are absent. Canonical later-Stage shared-state sketch exceeds stock API. Artifact/File is conceptual, not an executable store API. | **P2**: explicit authorized init/read view and application-owned artifact reference/lifetime. Never pass ambient RuntimeStore into Stage context or infer child sharing. |
| F06 | Stock Agents omit spawn/message/typed-user-input authoring, although generic Effects exist. Branches are single adapter-free Stages, join a Function. [authoring matrix](../guides/agent-workflow-composition/current-authoring-surface.md), [validation](../../packages/core/src/workflow/validation.ts). | **P2/P6**: supply only actions needed by reference proofs; document host/custom controller paths. Nested/multi-Stage forks, branch emissions/adapters and generic authoring symmetry go to **1.x**, demand-gated. |
| F07 | `Harness.activate` consumes mailbox and marks RUNNING before computation; `applyOutcome` processes Effects before later progress commit. [Harness](../../packages/core/src/runtime/harness.ts), study R1. | **P3/P4**: accepted input/activation/intent protocol, real death at each boundary. Existing serialization is not restart proof. |
| F08 | Several wake paths enqueue after transaction commit; [Scheduler](../../packages/core/src/ports/scheduler.ts) claims lack epoch/expiry/renewal. RuntimeStore has no scheduler-outbox facet despite forward-looking comments. | **P3/P4**: durable wake intent/repair and fenced writes/dispatch after takeover; reconcile port comments with actual accepted contract. Study R1/R3. |
| F09 | [resumption processor](../../packages/core/src/runtime/resumption-processor.ts) retains live promises and executable thunks; persisted pending record alone cannot reconstruct provider work. | **P3/P4**: immutable materialized input, attempt/code/provider identity, retry/reconcile and repeated-billing policy. Shared private machinery is optional; public Event/Effect/local-resumption meanings remain distinct. Study R2. |
| F10 | `applyOutcome` catch says nothing partial committed although [processActivationEffects](../../packages/core/src/runtime/effect-processor.ts) processes proposals separately. [atomicity tests](../../tests/conformance/effects/transaction-atomicity.test.ts) prove individual transactions. | **P3**: failure-between-effects regression and truthful comment/partial outcome; **P4** restart verification. No fictitious rollback of external work. Study R8. |
| F11 | [child deadline test](../../tests/conformance/composition/child-call-deadline.test.ts) pins null deadline; [cancellation tests](../../tests/conformance/composition/child-cancellation.test.ts) do not imply cascading kill. Activation budget is advisory. | **P5/P6**: explicit per-wait deadline/expiry, ownership, cancellation and late-result contract; physical termination only where enforced. Study R9. |
| F12 | Agent model calls accumulate across turns (default 8); retained transcript is not bounded by the compiler's message window. [Agent controller](../../packages/core/src/controllers/agent/controller.ts), [information compiler](../../packages/core/src/controllers/agent/information.ts). | **P5**: bounded continuation/budget and byte/history retention policy; no automatic authority/spend renewal. Protect in-flight snapshot truth. |
| F13 | [InMemoryRuntimeStore.transact](../../packages/core/src/reference/in-memory-runtime-store.ts) ignores scope and globally clones the aggregate. [study probe](../architecture-strategy-study/evidence/store-copy-results.json) measured ~0.019→47.31 ms with 0→5,000 retained 8 KiB emissions in one local diagnostic. Facet-call counts miss physical copying. | **P4/P5**: measure actual cost and choose bounded persistent mechanism; preserve cross-execution atomicity. Keep reference small or optimize based on measured limits. These numbers are not throughput/SLA evidence. Study R7. |
| F14 | Revocation at dispatch does not prevent earlier descriptor/context leakage; durable version/code availability, credential rotation, retention/tombstones and artifact GC lack an operational profile. [authority](../authority.md#11-revocation-and-changing-authority), [cache research](../research/agent-caching-semantics-and-strategy.md#6-snapshot-is-not-cache). | **P3/P5**: versioned checkpoints, current read/dispatch policy and principal restoration, explicit deletion/replay limits. Handoff snapshot retained for first activation; optimize transport only after measurement. Study R10 and historical 022a. |
| F15 | [AgentExecutor](../../packages/core/src/ports/agent-executor.ts) is model/context-shaped; Agent/Workflow progress is closed. [Strands](../../packages/agents/strands/src/agent-executor.ts) proves a constrained step bridge, not arbitrary native runtime preservation. | **P6**: external-task first, assurance vector and upgrade/fidelity experiment. Generic runner or discriminator change requires concrete need and migration decision; **1.x** for stable portable/deep integration. Study R4. |
| F16 | Source-only TS exports require a bundler/loader for packed consumers. Study needed local SDK workspace-link repair; that did not prove clean installation. [SDK review](legacy/2026-09-baseline/009-sdk-bootstrap-design-and-findings.md#remaining-correctness-and-architectural-concerns). | **P7**, packaging prototype after P2: compiled JS/types, fresh packed consumers, supported Node/export matrix. Keep ordinary npm local linking separate from packed npm install evidence. Study R11. |
| F17 | Same `0.8.1` label covers different source trees; external validation note and benchmark routers trail v3 results. | Routing corrected **in this task**; **B2/P7** require final exact framework/build identities and new candidate evidence. Historical v3 is not evidence for SDK HEAD. |
| F18 | Comparison can reward safety/recovery supplied by the benchmark harness; `inspect` is adapter-reported state. [benchmark harness](../../../benchmark/src/runtime/harness.ts), [authorization](../../../benchmark/src/runtime/authorization.ts), [checkpoint](../../../benchmark/src/runtime/checkpoint.ts). | **B1/B3**: native/subject/lab ownership, unsafe-control distinction and independent state/dispatch observations. Retain normalized track without relabeling it native conformance. |
| F19 | Public names and root versus `/execution` imports need a single pre-compatibility review; definitions, resource handles and ingress IDs are not credentials. [future §13–14](../future-plan.md#13-pre-v1-terminology-and-model-facing-vocabulary-review). | **P7**: comprehension-based naming/export review and migration once; **P5/P7** trusted control-plane ingress examples and supported security profile. No wholesale rename for fashion. |

## Capability schema validation boundary

Until P1 is implemented, capability implementations and application policy must validate domain input.
A projected model schema is not proof that every `UseCapability` caller was validated against it.
The current [builder guide](../guides/agent-workflow-composition/capabilities-effects-and-authority.md)
is the supported workaround. This heading preserves a discoverable explanation for builders; it
is not a new mandatory kernel contract.

## Findings already repaired: retain regressions, do not reopen as work

- Confirmation rule shadowing and approval redispatch are repaired; preserve prior-success replay,
  concurrent approvals, same-ID, unknown/unresolved, definite-failure and `none` scope regressions in
  [mechanical confirmation](../../tests/conformance/interaction/mechanical-confirmation.test.ts).
- DefinitionStore constructor discarded async validation failures; now validated synchronously.
  [Constructor regression](../../packages/core/tests/definition-store-constructor.test.ts).
- Colon-concatenated catalog/authority/view indexes collided; now full tuples are indexed.
  [Catalog tests](../../tests/conformance/agent/operation-catalog.test.ts) and
  [SDK identity tests](../../packages/sdk/tests/operation-identity.test.ts). Idempotency-key candidate
  collisions were investigated and compare full requests; no evidence justifies a format migration alone.
- Historical F0.2 off-view projection narrowing and F1 whole-view revision disclosure were repaired.
  Preserve [projection](../../tests/conformance/agent/projection.test.ts) and
  [Structured Memory read](../../tests/conformance/memory/structured-memory-read.test.ts) coverage.
  Hidden field changes must not alter authorized selected context. Memory read exposure, model write
  exposure, working-note handoff and branch version conflicts are implemented, not a new backlog.
- Builder routing, missing authored LLM requirements, child integrity option and example pump errors
  were fixed in the archived builder/SDK work. Further DX evidence targets the final P2/P5 public API,
  not a second bootstrap implementation.

## Later horizons and deliberate retirements

| Source/finding family | Disposition |
|---|---|
| Old H portable descriptors | P1 covers concrete operation schema; P2 values/artifacts. Full Resource/service/input/handle/Skill taxonomy is **1.x only when demanded**. |
| Old I/J MCP expansion and A2A | Existing synchronous Tool identity/schema/result/unknown and authority tests stay release regressions. New Resources/Tasks/input-required/service projections are **1.x**, consumer-gated. [Archived constraints](legacy/2026-09-baseline/005-interoperability-baseline-and-next-constraints.md) and [MCP research](../research/mcp-arrokothi-semantic-mapping.md) remain evidence, not protocol currency claims. |
| Old K discovery, policy reverse enumeration and native deferred tool registries | **1.x experiment** after actual catalog pressure; compare deterministic retrieval first. Metadata non-disclosure/freshness is already P1/P5, not postponed with discovery. |
| Old L hosted isolation | **1.x deployment gate** if required; 1.0 trusted-code limits explicit. Benchmark builder AppArmor protects the lab, not ArrokothI production code. No custom sandbox platform obligation. |
| Old M/N durability/integration | Replaced by P3–P7 and B1–B3. Architecture completeness is retired as release criterion. |
| Shared resources/locks, field versions, CRDT/reducers, nested branches, sibling-failure cancellation, peer `reply_and_ask`, deadlock/fairness sophistication | Basic wait diagnosis/operating bounds in P5; extensions **1.x** only for real consumers. No general cross-execution memory ontology required for 1.0. |
| Derived-memory supersession/currentness, dynamic queries, production retrieval, claim ontology and promotion policy | Explicit provenance and no automatic promotion retained. Provider/application solutions **1.x**; universal entity/time/confidence and contradiction model **post-2.0 speculative**. |
| Notes sequential/branch handoff, child scratch return, snapshot transport optimization | Existing explicit parent→child behavior retained. Optimize P5 only if measured; broader merge/handoff **1.x**, no implicit sharing or trace-dependent reconstruction. |
| Context IR, queryable history, observation projection, ACI prompts, cache hints, telemetry and provider strategy | Required retention/attempt truth in P3/P5; effectiveness optimization **1.x** via separate evals and cost measures. [Archived guidance](legacy/2026-09-baseline/003-agent-effectiveness-guidance.md), [efficiency](legacy/2026-09-baseline/004-efficiency-and-developer-ergonomics.md). No model-call tax or provider-specific core. |
| Machine/ABI, shared Program IR, hierarchy/scouts | **1.x experiments**, **post-2.0 conditional architecture** only after simplification evidence. Existing note prototype sequences are hypotheses. Universal foreign-engine compilation and POSIX clone obligations retired. |
| Federation, full information flow, advanced shared-resource ontology | **Post-2.0 research** requiring earlier deployment evidence. |
| Studio, Cloud, visual import/marketplace, operator/channel product | Small inspection needed in P5; broader products **1.x or later**, adoption-gated. Ecosystem parity and default hosting commitments retired. |
| Branding/licenses/packaging guidance | P7 actual dependency/distribution review; hosted terms reviewed only when hosting is selected. [Historical checklist](legacy/2026-09-baseline/006-ecosystem-integration-brand-and-license-checklist.md). No present legal/compatibility conclusion inferred from research. |

## Benchmark current state

This is an engineering audit of the live checkout, not a readiness-label inference.

| Status | Evidence and implication |
|---|---|
| Completed corpus | P01 25, P02 26, P03 31, P04 30 cases: 112 total (8 public / 104 evaluation); four coverage matrices (2,424 rows), evaluator mappings and sentinel definitions exist. Task manifests still say `ready-for-case-authoring`; do not redo case authoring because of that label. |
| Completed deterministic infrastructure | Evidence recorder and controlled-effect lifecycle, task adapters, provider-neutral/OpenAI-compatible gateway, quota/no-overage/429 policy, generation-unit identity, atomic artifacts and conservative resume primitives exist under `benchmark/src`. Static all-112 evidence feasibility is not all-112 execution: harness review executed 19 representative cases. |
| Completed construction infrastructure | Framework acquisition/sanitized freeze, allowlisted builder material, bounded orchestration, real OCI isolation, gateway/native model egress, credential scanning, safe npm local-package links and ephemeral node_modules projection exist and have tests/recorded physical canaries. Capability enforcement varies by host. |
| Completed, limited canary | [v3 result](../../../benchmark/docs/benchmark-v3-neutral-change-request-canary-v3.md): real Claude Code build, one invocation, zero repairs, frozen source and 11 public tests revalidated. Docker Desktop/macOS: secret-environment policy advisory, canonical readiness false. Live builder use does not establish live application-model quality. v1 exposed local-link fidelity defect; v2 passed with workaround; v3 removes workaround. |
| Exact frozen subject | Framework `arrokothi-v0.8.1-r1`, input `sha256:a4627d3a092c202f5d1b9cde58ed41958dd226929ea9d0d24497a377fc5fceec`; v3 definition construction policy `sha256:097e73c9773f3112f5cf3cf35df6ee1238c0f602e5fa224a2f5d40955b74ce98`. Accepted run at benchmark `c543087`, build `sha256:e7871bfa96edfea80112a68ca42c011705e2a496270081f85205a632803f03ec`. Framework source commit `3dc0ad293b4284f416c10fe2bfd57315b4be6f56`; uses core public APIs and predates SDK bootstrap. |
| Blocked physical claim | Exact unchanged v3 definition still requires canonical Linux/AppArmor rerun. A modified construction surface requires a new generation, not an edited old artifact. B2 owns this distinction and final-candidate canary. |
| Partial execution surface | `src/runtime/generation-runner.ts`, `subject-process.ts` and checkpoint primitives work as infrastructure. `src/cli/index.ts` returns BLOCKED/NOT_IMPLEMENTED for run/smoke, suite and evaluate. No scored P01–P04 subjects/suite/campaign exists in `subjects/`/`suites/`; real canary frozen apps live under `runs/`. |
| Remaining campaign work | B1 attribution; B2 per-selected-task BuildValidationSpecs, strong comparator/final SDK freezes, actual CLI orchestration/readiness transition, real state/provider evidence, runtime/judge calibration and evaluation/re-evaluation; B3 scoped repeated comparison. Aggregate weighting only for a declared aggregate score. |

### Benchmark review findings carried forward

Keep private cases and rubrics in benchmark; they do not become application implementation advice.
B2 must preserve the following evaluator/review boundaries, documented in the
[matrix review](../../../benchmark/docs/benchmark-v3-p01-p04-matrix-evaluator-freeze-review.md):

- P02 evidence-union residual in two cases and inconsistent R05 front-loading applicability are
  **future versioned corpus-contract questions**, not reasons to mutate frozen evidence now.
- Ten matrix exclusions remain: exact IRC appendix/hardening scope, rent/sell catalog semantics,
  P02 confirmation, P03 visitor receipt destination/historical taxonomy, P04 post-dispatch retraction,
  failure/unknown generic-follow-up wording and non-conversation surfaces. Diagnostic/contract-gap
  candidates in conversation/format stress reviews remain unscored until separately reconciled.
- P03 persistent committed-state and actual provider-request evidence and P04 committed qualification
  state need real subject adapters, not only recorder feasibility. Missing required evidence is not a pass.
- Semantic judge calibration, hybrid combination and optional numeric aggregation remain incomplete;
  preserve predicate-aware follow-up, negation/quotation/stale-value and negative non-requirement
  sentinels. Never add P02/P04 confirmation or P04 duplicate/count requirements through the harness.
- Harness confirmation-reference forgery, stale binding, future-outcome disclosure, cross-linked
  lifecycle causes and P03 cross-scope duplicate/receipt issues were repaired in the
  [harness correction review](../../../benchmark/docs/benchmark-v3-controlled-effect-normalized-evidence-harness-review.md).
  Preserve their regression controls in B1/B2; do not report them as open defects.
- v1 dependency-link failure, gateway credential/body-limit/lifecycle fixes and v3 source projection
  are completed construction repairs. v3 runner's stale generation-2 banner is cosmetic and pinned
  by construction policy; change only in a new generation, never to make an old rerun look current.
- Historical `rg`-wrapper and local-listen test failures are environment observations. Current checks
  must distinguish environmental failures from product regressions; they are not permanent backlog
  items merely because a historical review recorded them.

Full P01–P04 campaigns, extra competitors, broader model tiers, discovery/Program/multi-Agent
benchmarks and a public leaderboard wait for a concrete later decision. Deterministic P1–P5 proofs
must not wait for canonical containers, paid models or judge selection.

## Validation

This reorganization changes documentation/routing only, plus the builder check's file inventory.
No roadmap implementation, frozen benchmark artifact, upstream project or canonical semantic rule
was changed. Validation completed 2026-09-08:

| Check | Result and limit |
|---|---|
| Kernel `npm run check:builder-docs` | Passed: 21 Markdown files, 233 local links/anchors, 38 public imports after routing changes. |
| Kernel `npm run typecheck` | Passed against installed workspace dependencies. This is not the clean packed-consumer proof assigned to P7. |
| Local Markdown link/anchor scan | All in-workspace targets passed; 49 pre-existing study links require absent upstream checkouts. Every unavailable destination was checked against HEAD and already existed before this change. The study front door now explains that dependency. |
| Archive content comparison | All nine archived documents preserve original prose; only historical banners and relative link destinations changed. |
| Benchmark `npm run check` | Passed: 419 tests passed, 4 skipped (423 total), with offline schema/data/leakage/corpus/freeze/builder checks. Docker was unavailable, so physical-container validation was skipped; no new isolation claim follows. |
| Benchmark `npm run validate:neutral-canary` and `npm run bench -- validate local-p0x` | Passed after routing edits. Three pinned definitions remain consistent; all four tasks remain generation-blocked. |
| Both repositories `git diff --check` and scope audit | Passed. Benchmark changes are documentation only; study raw evidence, construction-policy source, frozen artifacts and kernel runtime code remain unchanged. |

The first sandboxed benchmark test run could not bind loopback test servers (`EPERM`). The complete
check was rerun outside that sandbox and passed; this was an environment restriction, not a kernel
repair. No live provider/judge call, canonical Linux rerun or new benchmark campaign was performed.
The study's capture-environment verifier was not treated as a present-day check: it intentionally
pins the earlier source state and expects upstream repositories that are absent here.
