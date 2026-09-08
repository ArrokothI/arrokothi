# Detail-design and future-plan review — 2026-09-08

> Subsequent repository cleanup removed the legacy mental-model directory. Preservation statements
> below describe the review snapshot; retained design is now in current detail pages and Git history.

This review changes documentation/planning, not runtime implementation. The twelve-page
[detail-design map](../detail-design/README.md) expands the same three canonical owners. All roadmap
slices remain planned. It supersedes the four-page layer's insufficient detail, not the useful 0.8.x
implementation recorded in [002](002-implemented-kernel-baseline.md).

## Evidence and limits

Read the five current architecture documents, all eleven files in `mental-model-legacy/`, current
four-topic detail layer and future plan, active development baseline/findings/roadmap/review, and
strategy-study reports and evidence index. The legacy snapshot identifies source commit
`9fc2b4472d41e35402bfbfb24f7a62ee21c2e2f3`; its contents remain unchanged by this review.
Current source/test inspection checked ingress/cancellation, memory read-view disclosure, confirmation
refusal of the same pending request, and MCP schema/result paths alongside the baseline's migration gaps.

| Checkout inspected | Revision |
|---|---|
| agent-kernel | `6bca7eeb2d335dc478f25ab1bd228e10541bcfce` |
| CrewAI | `1f3e6113d75cd12b2899943faffbc729130d200b` |
| OpenClaw | `7cabf654ef59339b9dd3cf9a7993a9cb26725d0d` |
| Hermes | `50d7a756d8feebff4d0e8c2de8c59d9c7ed75b83` |
| Dify | `8fc11b2927fb8b2957cdde7bf805614370d2d50a` |

Prior-art links in detail pages point to these checkouts. Selected code/tests/docs were inspected;
upstream suites, native integrations and live-model campaigns were not run. Dify's imported Graphon
internals were not audited. No empirical superiority, protocol currency, legal conclusion or native
crash guarantee is inferred from source names or comments. The benchmark roadmap is referenced as
the existing E0–E6 evidence sequence; this review does not change its implementation or frozen artifacts.

## Chosen structure and contract corrections

The old pages mixed several different owners and often ended at “application-specific” precisely where
an implementer needed a failure rule. The new layer separates protocol, authority, action lifecycle,
recovery, child communication, Runtime composition, memory/state, context/projection, Driver fidelity,
protocol mapping, resource/isolation and evidence. Cross-links replace duplicate definitions.

The most important corrections are:

- Input accounting specifies eligible bounded batches, acknowledgment of the whole reserved batch,
  retained unmatched inputs and generation-scoped timers. A timeout is not external failure.
- Request disposition, attempt certainty, result validity and responsibility are distinct. Unknown
  evidence can be refined without editing consumed Events; acknowledging unknown does not permit completion.
- Exact approval binds final arguments/resource/account identity. A correction requires explicit
  action withdrawal or consent invalidation to win an admission race. Remote policy ordering needs
  a freshness contract, not a synchronous-looking interface around stale facts.
- Delegation retains transitive grant constraints; parent terminal state does not silently define
  grant lifetime. Children default to required owned work; notify, reply and child-result receipts differ.
- Checkpoint publication must coordinate pinning with deletion. Native allocation can also lose its
  returned handle. Resource loss, temporary unavailability, cleanup debt and recovery refusal stay distinct.
- Replaying immutable input may conflict with revoked disclosure. Refuse/hold or explicitly start a
  new exchange; never call silently changed input the same replay. Deletion can explicitly end recovery.
- Optional Runtime design preserves Stage barriers, typed branches/joins, Working Notes and provenance
  without restoring Kernel graphs, model-call journals or mandatory memory types.

Conceptual additions are evidence revisions, wait generations, scoped receipt/equality rules and an
explicit multidimensional action record. These clarify existing obligations; they are not new Engines,
services or execution kinds. Arbitrary detachment, multi-approver policy, universal context IR and
cross-resource transactions remain optional or research. No portable wire schema is frozen here.

## Legacy knowledge disposition

Source filenames/section numbers identify the reviewed snapshot, not required reading or current
routing. Every retained idea has a current home below; no important rationale requires that directory
to remain in the active checkout.

| Legacy source / idea | Decision and current home |
|---|---|
| mental-model §§1–5; execution-runtime §§1–5: logical identity, locality, shared coordinator | Retain opaque execution and one current progress writer in [protocol](../detail-design/execution-protocol.md); remove CREATED/closed Agent-Workflow union. |
| execution-runtime §§6,9–10,13: resumption/pending split, fast/slow behavior | Remove Kernel live-promise resumption hierarchy; preserve async locality and honest native recovery in [integration](../detail-design/runtime-integration.md). |
| execution-runtime §§8,17: Effects, confirmation, retries | Strengthen intent/admission/settlement and unknown responsibility in [actions](../detail-design/action-lifecycle.md). No rollback or external exactly-once by local ledger. |
| execution-runtime §§11–12: concurrency, permits, wait cycles, locks | Resource-specific conflicts in [state](../detail-design/memory-and-state.md); native fencing in [resources](../detail-design/resources-and-isolation.md); cyclic-wait limits in [composition](../detail-design/composition-and-communication.md). |
| execution-runtime §§14–16: recursion, budgets, supervision, deadlines | Preserve finite root credits and explicit supervision in [composition](../detail-design/composition-and-communication.md); separate three clocks in [protocol](../detail-design/execution-protocol.md); native model costs stay Runtime-side. |
| execution-runtime §§17–18: persistence/causation/external handles | [Recovery](../detail-design/recovery-and-compatibility.md), [evidence](../detail-design/evidence-and-observability.md) and [protocol mapping](../detail-design/interoperability.md); no universal append-only replay engine. |
| authority §§2,6–7,11–13: principals, attenuation, policy, revocation, auth | Preserve and deepen [authority](../detail-design/authority-and-actions.md); grants are replaceable representations with explicit transitive constraints/freshness. |
| authority §§3–5,8–9: catalogs/exposure/local controls/projection/discovery | Optional Runtime pipeline in [context](../detail-design/context-and-projections.md); metadata visibility and exact binding retained, mandatory four-layer ontology retired. |
| authority §10: semantic evidence vs exact confirmation | Preserve final-action binding and trusted approver in [authority](../detail-design/authority-and-actions.md); native feedback alone is not consent. |
| memory §§1–7,11–12,16: forms, scope and trust | Preserve optional asserted/derived/scratch/artifact vocabulary in [state/memory](../detail-design/memory-and-state.md); no Kernel memory product or ancestry-based visibility. |
| memory §§8–10,14–15: provenance, promotion, temporal claims, retrieval and concurrency | Preserve direct assertion paths, explicit promotion/correction and resource-specific conflict in [state/memory](../detail-design/memory-and-state.md); universal claim schema stays Q5. |
| memory §13: context compiler; old read-not-Effect restriction | Preserve information selection in [context](../detail-design/context-and-projections.md); authorize external reads at their real boundary, including Effects when governance is required. |
| composition §§1–6,9–10,13–14,17: local Stages/control/Adapters/retrieval | Preserve optional authoring and local required-work barriers in [Runtime composition](../detail-design/runtime-composition.md); remove text-only edges and compulsory child for every Agent wrapper. |
| composition §§7–8,11–12: independent work, joins, recursion/interleaving | Split Kernel children/replies into [composition](../detail-design/composition-and-communication.md) and native branch/revision rules into [Runtime composition](../detail-design/runtime-composition.md). |
| composition §§15–16: notes and Skills | Explicit note handoff in [memory](../detail-design/memory-and-state.md); instruction/composition package profiles in [Runtime composition](../detail-design/runtime-composition.md). No hidden shared state or manifest grants. |
| interoperability §§1–12: operations/resources/services/templates/tasks/schema/signals | Preserve useful distinctions as narrow [adapter contracts](../detail-design/interoperability.md), not mandatory portable hierarchy. |
| interoperability §§13–20: MCP/A2A/Skills/HTTP/UI mappings | Current [mapping worksheet](../detail-design/interoperability.md); broad protocol/version support needs Q11 evidence, never wire-status equality with Kernel truth. |
| security §§1–14,17–21: layered controls, data/credential trust, containment | [Authority](../detail-design/authority-and-actions.md), [resources](../detail-design/resources-and-isolation.md), [evidence](../detail-design/evidence-and-observability.md). Retain two trust modes, remove hosted-declarative as third mode. |
| security §§15–16: signatures and supply chain | Preserve provenance-not-permission and package pinning; mature mechanisms and federation demand in future Q10–Q12. No mandatory per-Execution keys. |
| product-vision §§1–8: heterogeneity, adoption/integration spectrum | Preserve application outcome hypothesis and per-dimension assurance in [integration](../detail-design/runtime-integration.md); no ranked Native badge or duty to build a best-in-class native engine. |
| product-vision §§9–17: Studio, channels, product family, ecosystem/business | Preserve operator/adoption questions Q1/Q13; reuse native channels/services. No Studio/Cloud/marketplace, repository split, pricing or partnership commitment. |
| future-plan §§1–9: concurrency, policy/memory/protocol/recovery/security ecosystem | Accepted parts moved to current pages above; remaining alternatives and negative gates in Q2–Q5/Q7/Q10–Q12. |
| future-plan §§10–12: effectiveness, ACI, context/history/IR, long horizons, scaffolds/evals | Preserve concrete experiments and equal-budget/simple baselines in Q5–Q9; invocation evidence now has its own current page. |
| future-plan §§13–14: terminology, SDK/preflight, artifacts/authoring and packaging | Q13 plus R2/S1; separate concept/API/model/protocol vocabulary and retain implementation matrix. No symmetric stock API or artifact store by decree. |
| ROOT-README/README and all invariant summaries | Replace old ownership/reading routes with the current [map](../README.md); historical text remains unchanged. |

## Implementation and evidence loop

[Roadmap](001-current-status-and-roadmap.md) order is retained. K0/K1 gain batch/equality/timer decisions;
K2 gains correction/withdrawal and multidimensional action evidence; R1/K3 gain pin/delete, disclosure
and allocation windows; K4 gains transitive revocation, required-child and request-closure proof;
K5/S1 gain cleanup/deletion/cursor/compatibility limits. R2 holds Kernel fixed for native quality.
[F20–F27](003-evidence-and-findings.md#detail-design-review-findings--target-contract-debt) track the gaps.

E1/E2/E4 fixtures extend within their existing benchmark questions; no new benchmark family or paid
campaign blocks deterministic proof. Only claimed interfaces need complete implementations. A thin
native job plus existing durable substrate may still eliminate the need for a custom lifecycle engine.

## Reuse and unresolved decisions

Seriously consider native Crew/Flow state/feedback, Hermes context/tool search/jobs/environment,
OpenClaw scoped task/channel delivery, and published Dify applications/forms/binding backends.
Dify's use of independent runtime libraries is a reason to inspect those libraries before extracting
platform internals. The cited code has global configuration, resource ownership and lifecycle coupling;
prefer supported APIs/service boundaries to copying an executor class. Schema validation, storage,
workload authentication, physical isolation and telemetry should reuse established implementations.

Still open: exact wire/receipt codec; provider support for lost-submit and native writer exclusion;
transactional versus mature durable substrate choice; remote policy freshness; practical retention/
deletion windows; supported protocol versions; native quality margins; and actual application value.
The [future plan](../future-plan.md) preserves thirteen question families with tests and negative
outcomes rather than another release checklist.

## Validation

- `npm run check:builder-docs`: passed (21 Markdown files, 229 local links/anchors, 38 public package imports).
- `npm run typecheck`: passed.
- A temporary documentation scan checked 101 active/front-door Markdown files across agent-kernel
  and benchmark and 716 local links/anchors. A separate changed-document/inbound-anchor check passed
  with 476 changed-document links. Eight historical source paths were verified against local Git
  objects; hosted availability was not tested.
  Remaining links to the legacy mental-model directory are explicitly historical front-door navigation;
  none of the twelve detail pages or future-plan contracts requires it.
- `git diff --check`: passed. Runtime code, tests, legacy mental-model contents and raw strategy-study
  evidence are unchanged. Changes to historical study/development text only repair navigation to
  source-revision documents. Benchmark and the four prior-art checkouts are unchanged.

These checks validate documentation routing and existing TypeScript compatibility. No runtime suite,
upstream suite, live-model campaign or target K/E semantic gate was executed by this documentation review.
