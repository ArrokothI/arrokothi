# Architecture review — 2026-09-08

This review changes the target documentation and development sequence, not implementation. The
[canonical owners](../README.md) define the resulting contract. No new runtime, upstream adapter,
benchmark campaign or production guarantee is implemented here.

## Evidence inspected

| Repository | Checkout inspected |
|---|---|
| agent-kernel | `a5f426f77820166368a67bf4161a548b2751a3a7` |
| benchmark | `04148be7e4419a340293d7b76161e173e93ee936` |
| CrewAI | `1f3e6113d75cd12b2899943faffbc729130d200b` |
| OpenClaw | `7cabf654ef59339b9dd3cf9a7993a9cb26725d0d` |
| Hermes | `50d7a756d8feebff4d0e8c2de8c59d9c7ed75b83` |
| Dify | `8fc11b2927fb8b2957cdde7bf805614370d2d50a` |

All six working trees were clean at entry. Review covered the new canonical architecture, legacy
mental model and relevant detailed lifecycle/authority/composition/security contracts, strategy-study
reports and evidence, active/previous development plans, current core/controller/store/SDK source
and representative conformance tests. The benchmark review inventoried the full checkout (active
source/tests/scripts/schemas/catalog/evaluators, construction/freeze/configuration, canaries/runs,
subjects/suites and all documentation roles); it sampled mechanisms and test implementations rather
than auditing every line or deriving Kernel changes from private cases. Frozen artifacts were read
as historical evidence, not current target behavior.

The upstream review inspected the specific implementations and tests linked in
[Execution](../execution.md#prior-art-navigation), [Kernel](../kernel.md) and [Deployment](../deployment.md).
Upstream tests and live models were not run. Dify API imports `graphon==0.7.0`; `dify-agent` separately
pins `graphon==0.5.2` and Pydantic AI dependencies. The absent dependency internals were not audited.
This is architectural source evidence, not a current upstream compatibility or performance claim.
The [strategy-study evidence](../architecture-strategy-study/evidence/README.md) remains pinned to
its original capture and was not rewritten to imply a fresh test run.

## Decisions and strongest counterexamples

| Decision | Reason / evidence | What could overturn it |
|---|---|---|
| Keep Execution, Event/Effect and authority; make Agent/Workflow execution-side | Current conformance distinguishes observation from action; CrewAI's `AgentExecutor` subclasses Flow. Semantic control style need not affect accepted progress. | A demonstrated Kernel guarantee needs a control-style distinction, rather than just an implementation convenience. |
| Keep asynchronous Activation/Outcome; specify atomic acceptance | Current `harness.ts` consumes Events before computation and processes Effects before later progress commit. New prose previously lacked a commit contract. | A mature substrate provides a simpler equivalent boundary; use it behind or instead of a custom coordinator. |
| Opacity requires a recovery declaration | Native submit can succeed before a handle is recorded; a stale host may mutate a shared session despite Kernel fencing. Hermes explicitly classifies abandoned delegation as unknown. | A concrete provider proves idempotent submit, immutable checkpoints and exclusive resume; enable those guarantees for that Driver. |
| Keep Progress; distinguish snapshot from locator | Dify saves graph plus response-stream state; CrewAI restore reconstructs runtime associations. A session ID alone says little about safe continuation. | Provider-specific lookup/reconciliation may avoid copied checkpoints; do not force all providers to snapshot. |
| Remove separate CREATED state from target | Create, initial input and readiness can be accepted together; partial allocation is an operation attempt. | Externally meaningful provision/approval lifetime demands its own modeled work, not a ceremonial state. |
| Keep WAITING for registered dependencies; use finite any-of waits | Preserves early-result/interleaving behavior without Kernel graph/all-of logic. Runtime accumulates join results in progress. | Measured wake overhead or a real correctness obligation warrants a bounded all-of optimization. |
| Restore completion obligations, without Stage barriers | Legacy required-work semantics prevented disappearance of outstanding work. Removing graph knowledge must not allow complete+unsettled action to look safely finished. | A demonstrated detached use case provides another durable owner; add explicit transfer, not implicit fire-and-forget. |
| Separate result acceptance from delivery | OpenClaw has distinct task and delivery state; Hermes restores only owner-matching completions. | A small embedded app can collapse physical storage, but it still must distinguish meanings. |
| Keep two trust modes; remove compulsory environment taxonomy | Dify bindings/leases demonstrate resource lifetimes; they do not require Kernel-native home/workspace objects. | A shared resource across independent consumers needs a portable contract; add only the proven subset. |
| Move model budgets and local attempt ledgers out of Kernel | Kernel cannot count opaque native calls or prevent ambient spend. | All calls cross a hard metering boundary; declare that deployment rather than infer it from Runtime telemetry. |

The black-box principle is necessary but insufficient: if retry, authority, terminal obligations or
an irreversible interaction crosses the boundary, the Kernel needs its **contract**, while still
remaining ignorant of the native representation. This is the principal correction to the redesign.

## Vocabulary disposition

| Treatment | Concepts |
|---|---|
| Retain and sharpen | Execution; Activation/Outcome; Event/Effect; authority; History; Runtime-owned Progress |
| Ordinary implementation roles | Driver (may be identity adapter), Worker, Host; exposure as filtered visibility; attempt and lease as normal operational records |
| Restore from legacy in narrower form | Required external-work ownership; addressed interleaving; exact consent and settlement provenance; inferred data is not authority |
| Move to Runtime / optional library | Agent/Workflow definitions, Stage graph/barriers/joins, model provider/executor, invocation projection, local resumptions, context compiler, Working Notes, inferred memory, model budgets |
| Move to application or ordinary service | Asserted business state, artifacts, forms, resource ownership, user sessions, delivery policies |
| Remove from mandatory Kernel model | CREATED lifecycle stage; closed Agent/Workflow union; Exposure View entity; universal PendingOperation hierarchy; Kernel memory categories and per-model-attempt recovery |
| Remain research, not scheduled requirements | Machine/Program/ABI, universal graph import, capability hierarchy/scouts, broad protocol taxonomy, Studio/Cloud, custom sandbox/database/channel platform |

These decisions do not delete legacy files or claim existing features are broken. They change what
future Kernel code and supported profiles must know. Package relocation alone does not establish this.

## Previous roadmap disposition

| Old item | Problem still worth solving | New owner / change |
|---|---|---|
| P1 concrete action contract | Schema asymmetry, exact consent, unknown outcomes | K2 + E2; follows minimal asynchronous acceptance, reuses mature validation |
| P2 typed composition | Text-only edges/literal results obstruct applications | Boundary JSON values in K1; native Stage/child/join fixes in R2, not a prerequisite for durable Kernel semantics |
| P3 accepted work / recovery | Lost input, partial Effects, wake gaps, stale writers | K0–K2 acceptance then K3; delete Kernel local-model-resumption ledger, require Driver recovery declaration |
| P4 durable substrate | Persistence alone does not recover | K3 + E4; test native submit/checkpoint gaps too; compare one mature substrate and retire losing mechanism |
| P5 lifetime/operations | Deadlines, cancellation, state growth, upgrades | K4/K5; Runtime owns transcript/model budget, deployment owns termination/resources |
| P6 native/application proof | Does heterogeneity add value? | R1/E3 moves early to falsify protocol; final two-application E5 after K4/K5 |
| P7 release | Distribution and usable supported surface | Packaging prototypes after K2; S1 + E6; no full native engine or all-framework obligation |
| B1 attribution | Harness protection can masquerade as subject assurance | E0 ownership first, E2 unsafe/lost-state controls before comparison |
| B2 construction/readiness | Real build, freeze, runtime/evaluator wiring | E6; preserve prior canary, create final-surface identity; do not gate cheap faults on canonical builder host |
| B3 campaign | Attributable value versus alternatives | E3 fidelity, E4 recovery, E5 application value; selected P0X only for a stated conversational/DX question |

Old H–N feature inventories and speculative 1.x/2.0 sequences are not inherited release obligations.
The [active roadmap](001-current-status-and-roadmap.md) defines gates, dependencies and deletion branches.

## Reuse before building

Prefer native Crew/Flow, Hermes jobs, scoped OpenClaw services and published Dify applications over
executor extraction or graph translation. Native state, forms and context remain native. Existing
code is coupled to global configuration, session ownership, registries and cleanup; copying a class
is rarely a small integration. Inspect actual component dependencies and distribution terms when
selecting one; no legal conclusion or adoption decision follows from this review.

For durability, trial a transactional database against one established durable runtime. Use mature
schema validators, provider/protocol SDKs, application storage and physical sandbox backends.
Dify's use of Graphon/Pydantic AI suggests checking the original independent library before copying
Dify platform machinery. OpenClaw delivery recovery and Hermes environment lifecycle are navigation
references for native integration, not new ArrokothI product backlogs.

## Open questions and decision points

- **K0/K1:** exact protocol schema, receipt representation and legacy-data refusal/migration. The
  semantic atomicity requirements are settled here; the storage/wire layout is not.
- **R1/K3:** which native boundary safely reattaches after lost submit acknowledgment, and which
  session ownership guarantees can be maintained across stale hosts? Reject unsupported claims.
- **K3:** which substrate achieves the contract with less maintenance and acceptable deployment cost?
- **K4:** is basic addressed input enough, or is peer request/reply sugar repeatedly useful?
- **K5:** retention/deduplication windows, resource-loss behavior and operating envelope must come
  from actual workloads; do not invent production SLAs in architecture prose.
- **E3/E5:** predeclared quality/cost margins, comparative sample sizes, and whether the shared
  boundary earns its additional state/latency. A coherent design is not evidence of demand.
- **D1:** whether any early user needs physical isolation beyond native provider facilities.

## Verification scope

This revision preserves `docs/mental-model-legacy/`, strategy raw evidence, benchmark cases/matrices,
frozen framework/canary/run artifacts and runtime source bytes. The superseded roadmap is preserved
with only its archive banner and relocated links changed.

Validation on 2026-09-08:

- `agent-kernel`: `npm run typecheck` and `npm run check:builder-docs` passed; the latter checked
  21 Markdown files, 221 local links/anchors and 38 imports.
- `benchmark`: `npm run check` passed all validation stages and 450 tests in 92 suites, with no
  failures or skips. Local Docker containment and gateway-egress fixtures were physically exercised.
  The full check ran with local networking permitted after the restricted run could not bind test
  servers. This is laboratory-fixture evidence, not subject isolation or a canonical Linux/AppArmor
  builder-canary rerun.
- A separate scan checked 284 local links in changed/new Markdown documents, including cross-repository
  prior-art and roadmap links. Both repositories passed `git diff --check`.

No live-model campaign, new provider canary or proposed Kernel acceptance gate was executed. Passing
current checks validates this documentation revision and existing fixtures; it does not implement or
prove the target architecture.
