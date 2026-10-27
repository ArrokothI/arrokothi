# Independent review 01 — K1.3

**Verdict: CHANGES REQUIRED.** Three P2 findings below falsify current claims in BASELINE/017 (and, for the clock claim, Layer 3). The ordinary K1.3 scenarios, attack probes, registered mutants and declared race search pass. The two guard findings use deliberately incorrect internal plans, as the maintained owner-guard tests do; they are not claims that an unmodified public-call schedule produces those plans.

## Identity, authority and access

Reviewer: Codex desktop, GPT-6 per this session's instructions; serving variant not exposed. Review date: 2026-10-27, per client date. This session is independent of the Claude implementation session; no subagents were used. Local evidence was produced on Node **v26.10.0**, Darwin arm64. CI timestamps remain their original UTC values.

| Identity | Verified value |
|---|---|
| Base B | `22c8c1db9958049eb8693dd5aa4d7005f2d565db` |
| Payload C | `db0d0fee95466edc7a527ef234a2170fb6fedebb` |
| Reviewed H | `d05af3476b1523dadee0858373c0713610103419` |
| Candidate remote | `origin/claude/k1.3`, fetched and resolved to H |
| Review branch | `codex/k1.3-review-01`, created directly from H |
| Packet verification | [Run 40387031804](https://github.com/ArrokothI/arrokothi/actions/runs/40387031804), head C, successful job `121797929923` |

B is an ancestor of C; C is H's parent. C..H changes exactly the declared administrative files: `007-work-packets.md`, `work/K1.3/implementation-01.md`, and `work/K1.3/progress.md`. The cumulative B..H diff has 81 paths. Full pinned Git objects and source were available locally; review used surrounding source and the cumulative diff, not a remote truncated patch. The unrelated primary checkout was left on its existing branch. No implementation, governing contract, prior record or ledger status is changed by this review.

Policy is [006](../../006-development-process.md), [008](../../008-implementation-report.md) and [012](../../012-review-methods.md) at B; those files and AGENTS.md are unchanged through H. This follows [Prompt B](../../009-universal-prompts.md#prompt-b--independent-reviewer), with the owner's explicit instruction to inspect the supplied Packet verify run **instead of rerunning full verify locally**. The narrower gate in [brief 01](brief-01.md) and the review request controls: only a concrete K13-1..9 defect or false current claim in 007, BASELINE, 017 or Layer 3 blocks. An undecided schedule outside the declared search is not promoted into a blocking requirement.

The contract is brief 01 with its owner answers, [release 01](release-01.md), [design 01 and addendum](design-01.md), [attack 01](attack-01.md) and its three probes, [design check 01](design-check-01.md), [owner choice 01](owner-choice-01.md), [owner choice 02](owner-choice-02.md), and the K1.3 row in 007. There is no separate `contract.md`. [Implementation report 01](implementation-01.md) was read after deriving coverage from these governing sources.

Release 01's prerequisites are ancestors of B: TOOLS-02 range 1 `4015599e` and its receipt `c3b45a64`; K1.2-correction-01 integration `ed509e11dc39`; COORD-REFACTOR-01 integration `d17ea6d1`. B contains the merged release record. No predecessor hold or successor release is silently inferred from acceptance.

Architecture traversal included the whole-system/reference and Kernel/Runtime/Driver/deployment model, the brief's waits/lifecycle/core/operations/recovery owners, and the affected creation, execution-cycle, authority and identity contracts. Rewrite-index §§4–5 and the research reading map's waits/timers, plan/apply and evidence sections were checked. Research was background only: no third-party claim supplies an acceptance expectation, no third-party source was copied/adapted, and no dependency was added. These changes belong to the Kernel's in-process binding and its Driver boundary, not provider runtime logic or physical containment.

## Evidence and interpretation

The [evidence directory](review-01/) contains commands, original local output, reproducible reviewer probes, run metadata, and the downloaded full CI result compressed without altering its decompressed bytes. [SHA256SUMS](review-01/SHA256SUMS) identifies the retained artifacts; [README](review-01/README.md) describes decompression and reruns. This review commit retains the long-run evidence, rather than depending on temporary local paths or CI artifact retention.

| Evidence | Result | What it establishes |
|---|---|---|
| Downloaded Packet verify at C | 19 checks passed; `result_reuse: false`; `acceptance: not evaluated` | Inspected raw per-check outputs and metadata, not just the implementation report's summary. Node 26.10.0, Python 3.13.16, Linux x64. |
| CI repository/type/tool checks | 4,653 repository tests, 671 tool tests, 4 archive tests, 18 example tests; no repository failures/skips; typecheck passed | Broad regression evidence at C, carried to H only because the payload is unchanged. |
| CI mutations | 153 registered, 330 refusal and 238 value-cost mutants killed | Existing registry coverage. Held mechanism witnesses remain held; these counts are not universal semantic proof. |
| CI sweeps | Fault: 72 scenarios / 16,680 runs / 0 violations; poison: 60 files / 2,072 tests per mode / 400 names / 0 zone firings | Inspected the raw sweep output. No full sweep was rerun locally. |
| Local K1.3 suites and attack probes | **211 passed**, 0 failed/skipped; exit 0 | All waits suites, cancellation, Execution deadline, losing Outcomes, ambient time, race-search tests, and the 11 original attack-probe tests. |
| Local K1.3 registry cases | **12/12 killed**, clean controls passed; no invalid mutations | H's unchanged registry/runner, selecting `k13.*`. Named assertion/declared-guard failures, not loader failures. |
| Local new oracle registry case | **1/1 killed**, clean control passed | `oracle.losingWindowAt`, also introduced by K1.3; a refusal-only state outside its declared apply window is rejected. |
| Local full K13-9 search | **456,976** exhaustive runs; **20,000** supplementary words; **20 classes / 37 witnesses**; 0 failures | Declared depth, seeds, bounds, counts, skip reporting and all 65 exercised letter/state transitions reproduced. |
| Independent extra assertions in that same search | **456,976** runs; 2,856,100 inspected snapshots; 2,741,856 timer listings; 269,100 post-terminal comparisons; 0 failures | Adds progress content, immutable creation facts, result content/causation, mailbox projections, timer Execution identity and logical terminal stability. Two corruption controls fail as expected. |
| Owner choice 02 comparison rerun | Race: 17 source files; other scenarios: 18; **0 source offsets unique to race**; reverse difference in 13 files | Independently reproduced the decision's code-coverage premise. The actual other-scenario count is 60 files / 2,072 tests. |
| New guard/documentation probes | **3 passed / 3 failed**, exit 1 as expected at H | Two positive controls pass; S2 duplicate-position and overlap probes and S4 generation-reuse probe fail with missing expected guard exceptions. Due-at-registration expiry without a host fire passes. |

Full verify, the full repository command, full registry, typecheck and full poison/fault sweeps were **not rerun locally**. Their evidence is the downloaded C run, as requested. The targeted mutation run used a temporary detached copy at H with physical locked dependencies, because the runner correctly rejects symlinked dependency trees; it is a selected registry execution, not a fresh-clone full-verify claim. No paid/provider profile, persistence test or isolation test was run or claimed.

The CI adoption result is `revalidation_complete`, with 1,549 origins and 592 counterexamples, but `full_corpus_complete: false`; the existing held claims are not accepted by this review. I inspected the updated inventory/coverage records, owner/commit guards, fault oracle, registry anchor changes, unsupported-surface replacements and the poison exclusion. The mutation registry adds twelve semantic cases plus `oracle.losingWindowAt`, removes no case, and reanchors three existing cases. The two removed adoption entries were held ambient-read witnesses; the corresponding tests still exist and ran. This is not treated as new semantic credit or as grounds to waive the review gate.

## Findings

### K13-R01-S2-01 — Terminal-completeness guard counts positions without proving coverage (P2)

**Location at H:** [state.ts](../../../../packages/kernel/src/state.ts), `disposesEveryQueued`, lines 941–954; callers at lines 701 and 866. The false current claim is [BASELINE](../../002-implemented-kernel-baseline.md), “State owner,” lines 575–580, and [017](../../017-known-limitations.md), L-15, line 89. Governing rule: B-5 and CX-1; claimed mechanism: design §12 S2, also relied on by K13-6 and the shared K13-7 cancellation path.

The helper checks that the combined list length equals the number of queued entries and that each named entry is queued. It never checks uniqueness within a list or disjointness between the two lists. Equal cardinality does not prove that every queued position was named.

The [attached probe](review-01/guard-probe.test.mjs) starts from two queued Events. Replacing a cancellation plan's `endAt` with `[0, 0]` passes the guard and commits `CANCELLED`, leaving position 1 queued. A complete Outcome with `acknowledgeAt: [0]` and `endAt: [0]` likewise commits `COMPLETED`, overwrites position 0's acknowledgment with a terminal disposition, and leaves position 1 queued. The [raw output](review-01/guard-probe.log) prints these resulting mailboxes. The corresponding ordinary cancellation control disposes both Events.

The injection is at `KernelState.prototype.apply`, the same internal-plan seam the maintained `state-plans.test.ts` uses. No unmodified public-call schedule was found to generate these plans. The blocking defect is narrower and concrete: BASELINE/017 say the **owner refuses a plan** that breaks terminal completeness, but these plans are accepted. The guard is new in K1.3; the accepted plan/apply decomposition did not prove this new predicate.

**Required outcome:** make the promised terminal-completeness guarantee true for both terminal Outcome and cancellation writers, with direct negative controls for duplicates within a list and overlap across lists, plus valid-partition controls. A deliberate reduction of the approved structural claim needs an explicit design/owner disposition and truthful dependent prose; passing ordinary scenario tests alone cannot validate the present claim.

### K13-R01-S4-02 — Outcome registration can reuse a retired generation through the claimed owner guard (P2)

**Location at H:** [state.ts](../../../../packages/kernel/src/state.ts), lines 696–699, and the Outcome commit's timeout/retirement appends. False current claim: BASELINE “State owner” lines 575–580 and 017 L-15 line 89. Governing rule: W-9/K13-4; claimed mechanism: design §12 S4, “the Outcome arm mints only for the generation it creates.”

The Outcome guard permits `plan.registrations` to equal the existing count or the count plus one. It checks that a retirement and timeout agree with that supplied count, but does not require a new count when this Outcome creates/retires a wait. Agreement among supplied fields does not prove a fresh generation.

After an immediate expiry of g1 and reservation of T1, the probe submits another immediate-expiry Outcome. At the plan seam it substitutes the existing count 1 and consistent g1 retirement/readiness/timeout facts. The owner accepts it: inspection has retired generations `[1, 1]` and two timeout entries with the same Event ID and generation 1. The positive control, without substitution, produces generations `[1, 2]`.

Again, the current coordinator planner increments correctly; this is not a demonstrated ordinary API race. It is a counterexample to the separately advertised S4 owner guarantee and to the design's stated closing mechanism. The existing negative control checks disagreement with a generation, not a mutually consistent reuse of an old generation.

**Required outcome:** establish freshness at the owner boundary for every Outcome path that creates a registration, whether it stays live or retires immediately, and make the timeout/retirement uniqueness argument cover all writers. Keep duplicate host fires as legitimate recorded duplicates. Add the attached reuse case and valid successive-generation controls; reconcile BASELINE/017 with the mechanism actually enforced.

### K13-R01-CLOCK-03 — Fire-only wording incorrectly includes due-at-registration waits (P2)

**Location at H:** [BASELINE](../../002-implemented-kernel-baseline.md), “Timers,” lines 521–522; [017](../../017-known-limitations.md), L-22, line 95; [operations](../../../../mental-model/concepts/operations.md), binding-choice comment at line 126. The same wording appears in rewrite-index's clock choice and the coordinator clock option comment. Governing rule: W-2/K13-3 and owner choice 01's **Execution-deadline** admission policy.

L-22 says “Wait and Execution deadlines take effect only when the host calls `fireTimer`.” The attached ordinary public-API probe uses clock 0, dispatches, and accepts `await` with deadline 0 and no eligible queued Event. It returns `wait.result: "expired"`, creates T1 and deadline readiness, and leaves `READY`, with **zero timer fires** and an empty pending-timer listing. That is the required W-2 behavior, also pinned by `waits-registration.test.ts`.

The implementation is correct here. The claim broadened the owner's fire-only Execution-deadline choice to all wait deadlines. A reader would incorrectly conclude that delaying the host pump also delays registration-time expiry.

**Required outcome:** distinguish (1) a due wait evaluated during registration, (2) expiry of an already-live wait via host fire, and (3) the fire-only Execution deadline. Keep the owner's past-due creation/dispatch/Outcome policy and the operations `OPEN(implementation)` marker. Correct the current descriptions together; do not “fix” this by removing W-2's due-at-registration branch.

## Criterion closure against the stated mechanisms

PASS is bounded by the criterion and the supported in-process binding. FAIL below includes a failed *advertised structural mechanism*, even where ordinary behavior passes; it does not assert an unobserved public-API failure. No K13 criterion is deferred.

| Criterion | Result | Independent mechanism and evidence assessment |
|---|---|---|
| K13-1 | PASS | Closed own-field capture in `outcome.ts`, finite alternatives/subscriptions, AND/ANY-OF matching shape, aggregate selector limit and canonical identity. Valid/invalid table covers empty wait/alternative/kind set, unknown fields at each level, inert/duplicate/empty-text forms, 256/257 and whole refusal. Replay/conflict and authority-before-diagnostics are preserved. |
| K13-2 | PASS | `waits.ts` branches first on Kernel-supplied source category. Input uses only subscriptions; timeout is always ineligible; synthetic trusted facts exercise every dependency field and conjunction/disjunction. Live spoofed kind/ID/correlation tests cannot upgrade input. No live K2 ingress is claimed. |
| K13-3 | PASS | One captured clock observation before basis/state revalidation; accepted batch excluded before scanning remaining queued Events; eligible backlog wins before due-time comparison; otherwise immediate expiry or WAITING. Branch/tie, bounds 1/2, D−1/D/D+1, clock failure and reentrant input/cancel cases pass. CLOCK-03 concerns descriptions of this correct behavior. |
| K13-4 | FAIL | Ordinary current-generation resolution, whole retirement, duplicate/stale fires, retained late input and immediate-expiry keys pass. The extra S4 owner mechanism the design and current docs claim is false: S4-02 reproduces two timeouts for a reused generation through the Outcome arm. |
| K13-5 | PASS | Reservation-time eligible candidates, exact mandatory member, earliest capacity fill, acceptance-order presentation and one-reservation readiness are implemented. Five examples and wrong-rule controls distinguish ignored eligibility, frozen-at-wake candidates and omitted timeout membership. Correct-union sorting is recorded as equivalent on reachable states, not misreported as killed. Synthetic R-before-T checks the literal selector only. |
| K13-6 | FAIL | Public cancellation ordering, all four Outcome steps in both orders, retained acknowledgments, losing-content index/reference retry, OA-2 before fence, scope/cancel power, holds, terminal no-op and late delivery ownership pass. S2-01 disproves the separately promised structural terminal-completeness guard. |
| K13-7 | FAIL | Explicit and deadline cancellation use the same builder/owner arm, narrow comparison masks agree, both causes request Driver cancellation, and deadline creation identity/immutability/fire-only ordering pass. Shared S2-01 prevents the stated owner mechanism closing; CLOCK-03 is a false current description associated with the deadline policy. |
| K13-8 | PASS | `time.ts` resolves the injected host clock; source inspection, bounded executable-source census, planted-reference control and runtime poison windows cover current time reads. `fireTimer` reads once then resolves current state after callbacks. No ambient fallback or scheduler was found. Owner choice 02 remains a bounded, explicit code-versus-data coverage tradeoff. |
| K13-9 | PASS | The corrected model and comparator, all oracle controls, full exhaustive run, schedule witnesses and independent extra assertions pass within the declared alphabet/depth. This is no arbitrary-schedule guarantee. The guard injections above are separate tests of the explicit structural claims, not invented K13-9 schedules. |

## Design-check and attack closure

| Design-check item | Disposition at H |
|---|---|
| D01-CHK-01 | Closed: brief addendum, design A1, current waits explanation, five tests and `k13-controls.json` explicitly distinguish correct-union equivalence from missing T membership. The original selection probe still reproduces the equivalence. |
| D01-CHK-02 | Closed for the required corrections: nonempty expected input payloads are kept independently and compared in views/Activations; INV-7 permits only the exact mandatory timeout exception; model-derived pending timers are compared; stable injective names and receipt/refusal references are checked. All five negative controls and S5 `d` positive control pass. The maintained projection is not a literal comparison of every view field; the added reviewer assertions cover further content/identity fields in the same space. |
| D01-CHK-03 | Closed: explicit A01–A24 map below; seed validation; exhaustive versus supplementary reporting; fixed xorshift seeds; skip/transition counts; `x` without a deadline does not poison the clock; named mutant failures. Longer/changing-content attack cases are deterministic tests, not credited to depth four. |
| D01-CHK-04 | Closed: CANCELLED redelivery returns `no_unresolved_exchange`; COMPLETED/FAILED retain their old tokens; fresh cancelled Outcomes use the cancellation fence after accepted replay/conflict. |
| D01-CHK-05 | Closed: key identity is Execution/kind/generation; descriptive deadline ignored; persisted deadline decides; malformed/unknown keys, unissued/no-deadline generations, once-only observations and immediately expired keys are tested. IDs pack a decimal generation string. |
| D01-CHK-06 | Closed under owner choice 01: optional Execution-scoped request, current attempt or null, both causes and nonterminal states, once after commit, contained lookup/invocation throws, absent/inherited-only member refusal, no thenable observation, reentrant Outcome/report behavior. This requests native cancellation and proves no physical stop. |
| D01-CHK-07 | Policy and behavioral tests closed under owner choice 01; dependent documentation **not fully closed**, CLOCK-03. Past-due creation and pre-fire Outcome/dispatch remain permitted; accepted expiry cancels without a wait timeout. |

The check's additional S1–S5 requirements in its “Representations” discussion and design A7 are not all closed: S2-01 and S4-02 are the missing direct owner-guard counterexamples. S1/S3/S5's existing controls and all writer/commit-table checks remain useful; their passing does not prove the two failed predicates.

Every attack-map item has a maintained destination at H, checked against the actual assertions and the local run. Paths in this table are under `packages/kernel/tests/`; the equivalent entry is under `tests/fixtures/packet-tools/`.

| Attack item | Maintained evidence and result |
|---|---|
| A01 / F1 | `waits-selection.test.ts`, `k13-controls.json`: five examples, equivalence, timeout-membership control; PASS |
| A02 | `cancellation.test.ts`: first delivered/failed report wins, contradictory repeats and second delivery capability; PASS |
| A03 | `waits-timers.test.ts`: middle g2 retired by Event/timeout cannot affect live g3; PASS |
| A04 | `waits-selection.test.ts`: s→x and x→s selectors, alternative plus subscription; PASS |
| A05 / F2 | `race-search.test.ts`: nonempty payload corruption control rejected; PASS |
| A06 | `cancellation.test.ts`: explicit S4 `e d q p p p`, cancelled exchange's third report retained; PASS |
| A07 | `losing-outcomes.test.ts`: equal fresh loser, different loser, original retry; PASS |
| A08 | `losing-outcomes.test.ts`: distinct progress/Emission/epoch/base content keys; PASS |
| A09 | `losing-outcomes.test.ts`: accepted A1 replay/conflict after losing A2; PASS |
| A10 | `cancellation.test.ts`: continue/await/complete/fail in both orders, nonempty content and backlog; PASS |
| A11 | `cancellation.test.ts`: old acknowledgment retained, queued/reserved terminal, input replay/conflict/fresh refusal; PASS |
| A12 | `waits-registration.test.ts`: S0 `e d z`, bounds 1/2, absent/future/due deadline; PASS |
| A13 | `waits-timers.test.ts`: repeated g1 fires through reservation/continue/g2/cancel, and immediately expired key; PASS |
| A14 | `waits-selection.test.ts`: T with ineligible backlog at bound 3, excess eligible candidates; PASS |
| A15 | `waits-registration.test.ts`, `cancellation.test.ts`: clock/authority/hook reentrancy with nested decision first; PASS |
| A16 | `execution-deadline.test.ts`: same prefixes including holds and T, only declared cause/actor/reason/fire differences masked; PASS |
| A17 | `execution-deadline.test.ts`: canonical deadline identity, added/removed/changed value, numeric edges, absent-field compatibility; PASS |
| A18 | `waits-registration.test.ts`: D−1/D/D+1, unusable/absent clocks, replay, queued eligibility and read counts; PASS |
| A19 | `waits-declaration.test.ts`: complete grammar table, 256/257 aggregate bound, duplicate-heavy lists; PASS |
| A20 | `waits-eligibility.test.ts`: spoofing contrasts, AND/ANY-OF units, timeout exclusion; PASS |
| A21 | `race-search.test.ts`: omitted timer, renamed Event, copied retry receipt, corrupted cancellation record controls; PASS |
| A22 | `cancellation.test.ts`: post-cancel controls plus preserved COMPLETED/FAILED answers; PASS |
| A23 | `losing-outcomes.test.ts`: visibility, grant-less caller, two Executions, unusable identity/content; PASS |
| A24 | `execution-deadline.test.ts`: 10/25, 10/5, 10/10 in both fire orders; PASS |

F3 closes through this map and the deterministic cases, not through an expanded search claim. Attack owner questions O1–O7 have the dispositions recorded by design check 01, design addendum and owner choice 01. The three attack probes were preserved and rerun; they demonstrate evidence distinctions, not implementation conformance by themselves.

## Owner choice 02, broader search and reference maintenance

The changed exclusion is exactly `race-search.test.ts`, alongside the pre-existing fault sweep and poison catalog exclusions. Name inventory, four modes, verdict logic and scenario selection otherwise remain intact. The downloaded successful run independently confirms that all 60 remaining files ran in every mode. I reran V8 coverage with the exact H source and compared both directions using the attached comparison driver and the owner's script: no executed Kernel source offset was unique to the race search; the reverse comparison is nonempty in 13 files. Owner choice 02's prose says “59” other files, while its 2,072-test count and the successful run correspond to **60**. That count typo is not a gate failure.

This justifies removing redundant *source-reach* coverage, not asserting identical poison coverage for every value/order. The owner decision explicitly retains that gap; the static member-read rules and retained scenario contrasts constrain it without eliminating it. I found no concrete poison-sensitive path uniquely exercised by the removed file, and no exclusion wider than the owner's decision. The decision is therefore supported at its stated strength, not upgraded to a data-coverage proof.

Beyond the maintained examples and registry, I traced every new state-writer family and challenged the structural guards with duplicate versus distinct disposition positions, cross-list overlap and consistent versus fresh generation facts. Those checks found S2-01 and S4-02. The due-at-registration public probe discriminates the documentation's all-fire-only statement from the accepted Execution-only choice.

For K13-9, the search stayed at exactly four letters over `i e d c w z k r t s x q p`, from all eight validated seeds, at bounds 1 and 2; every shorter suffix is checked as a prefix. The additional observation wrapper preserves the maintained driver/model/actions and adds assertions for accepted progress, fixed creation fields, terminal result content/causation, mailbox summary lists, timer Execution IDs and logical terminal stability. It masks only refusals, losing-proposal records, timer-fire evidence and delivery rows for the terminal-stability comparison. It does not mutate plans or production state. All 456,976 schedules passed. The separate 20,000 length-12 walks are supplementary, outside the exhaustive claim. Fail Outcomes, arbitrary historical submissions, changing selectors/content, holds, takeover, hostile callbacks, arbitrary depths and persistent deployments are not universally searched; the named deterministic tests cover their declared K1.3 cases. No undecided outside-search schedule is used as a blocker.

Layer-3 review found the creation deadline's source/immutability properly stated, the waits selection explanation corrected without changing W-2/W-9, and representation choices kept binding-specific with the clock marker retained. No Layer-1/2 change is needed. No current acceptance/release state was added to spec pages. The pre-existing `**Status:** Required ... contract / Introduced by ... / target specification` lines remain unchanged, including creation/waits/lifecycle: they describe contract scope and introducing gates, as rewrite-index §2 directs, not the packet's current implementation/acceptance state. Literal removal of every heading named “Status” is not claimed. Current status remains in 007, and available APIs remain in BASELINE. The concrete current-reference defects are the three findings above; unsupported K2/K3/native-stop/isolation claims were not found.

This is the first implementation review of H. The earlier design check was conditional and reviewed unbuilt design, not an accepted implementation of these guards; the new predicates are K1.3 additions. No second corrective implementation review or accepted-H flip is present, so 006's automatic stop-and-redesign threshold is not triggered. The shared cause of S2/S4 is still worth addressing: local count/field-consistency checks were promoted to global structural guarantees without an argument for uniqueness/freshness. The correction must audit that boundary, not just add these three failing examples. The older sole-writer architecture remains useful; it alone never proved the new predicates.

## Handoff

For transcription: packet state **CHANGES_REQUESTED**; exact reviewed H is `d05af3476b1523dadee0858373c0713610103419`; open findings are **K13-R01-S2-01**, **K13-R01-S4-02**, **K13-R01-CLOCK-03**. [Correction brief 02](brief-02.md) states the required outcomes, design questions and corpus additions. There is no architecture blocker and no permission to change the owner's accepted deadline policy. The review is evidence-only; correction implementation, owner integration and successor release remain separate.

CHANGES REQUIRED
