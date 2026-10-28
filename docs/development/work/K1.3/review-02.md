# Independent review 02 — K1.3 correction round 1

## Identity and authority

- Reviewer: independent Codex desktop session, GPT-6 per the session instructions; an exact serving-model identifier is not exposed. 2026-10-27. No subagents or implementer-authored verdict were used.
- Base B: `22c8c1db9958049eb8693dd5aa4d7005f2d565db`.
- Payload C: `2454e8b702ea1bb2b12d9e0fe0f8b83f0f5e0d7c`.
- Candidate H: **`87db3c40c379d0d2186b16cfee9cc2b16d989a73`**, fetched from `origin/claude/k1.3` and checked out exactly. This review judges H, not its own recording commit.
- Previous reviewed H: `d05af3476b1523dadee0858373c0713610103419`. [Review 01](review-01.md) and [brief 02](brief-02.md) are present at `72e6f5ec51a83476967623b263365fb682a1ead6`, an ancestor of C and H.
- Review branch: `codex/k1.3-review-02`, newly created from H. Only this review and its evidence are added. The commit and verified push identity are supplied in the external handoff.
- Governing process: AGENTS.md, [006](../../006-development-process.md), [007](../../007-work-packets.md), [008](../../008-implementation-report.md), [009 Prompt B](../../009-universal-prompts.md#prompt-b--independent-reviewer), and [012](../../012-review-methods.md). The process documents do not change in B..H. The architecture and slice-audit skills were applied.
- Contract: [brief 01 including owner answers](brief-01.md), [release 01](release-01.md), [design 01 and addendum](design-01.md), [attack 01](attack-01.md), [design check 01](design-check-01.md), owner choices [01](owner-choice-01.md) and [02](owner-choice-02.md), review 01, brief 02, [owner choice 03](owner-choice-03.md), [design 02](design-02.md), and [implementation 02](implementation-02.md). Owner choice 03 waives the separate design check; this review performs it.
- Release/prerequisites: B contains the release merged by PR #61. Verified ancestry for TOOLS-02 range 1 `4015599e6178202541e0091f99b6196adaff0430`, its receipt `c3b45a64b0a16fb19342950377a3e13568a03ac8`, K1.2/correction integration `ed509e11dc39ff24e10c1ace68189776c4270919`, and COORD-REFACTOR-01 integration `d17ea6d11bbab977f0c8b7693b3391924b9c815b`. [Identity evidence](review-02/identities.json).

Full pinned Git objects, source, cumulative B..H diff, surrounding implementation/tests and the required raw CI artifact were accessible. C..H changes exactly `007-work-packets.md`, `work/K1.3/implementation-02.md`, and `work/K1.3/progress.md`, matching the administrative allowlist. No executable, evaluator, fixture or architecture change is hidden in that interval. Inspection of C's verification therefore applies to H's identical executable/test payload, with the administrative prose reviewed separately.

The gate is the owner's: a concrete defect against K13-1..9 or K13-C2-1..4, or a false current claim in 007, BASELINE, 017 or Layer 3. An undecided schedule outside the declared search is not a blocker. The findings below are direct counterexamples to brief 02's expressly required **internal owner-plan guarantee**, not such schedules and not claims of hostile Runtime access to `KernelState`.

## Result

Two P2 defects remain in S2's terminal-completeness mechanism. The previous duplicate/overlap examples now reject, but an exact position cover does not establish that the committed terminal state has no queued Events. The owner accepts both a queued disposition written back to covered positions and a new queued timeout appended after checking the old mailbox. Design 02 Q1's claimed implication and Q3's “None is narrowed” answer do not hold.

S4's freshness correction and the clock-description correction pass this review. The required targeted suites, original attack probes, K1.3 mutants and declared K13-9 search pass. They do not establish the missing structural guarantee. There is no demonstrated ordinary public-call schedule producing either malformed plan.

This is the second CHANGES REQUIRED in the already corrected S2 subsystem. [006's stop-and-redesign rule](../../006-development-process.md#stop-and-redesign) applies; the root-cause note and owner options below replace another patch-round brief. No further patch round is authorized before the owner's decision.

## Evidence obtained and rerun

The user explicitly required inspection of Packet verify CI **40456276499 at C**, without a local full verify. I downloaded it with `gh run download 40456276499 --repo ArrokothI/arrokothi` and inspected the run metadata, raw verification output, nested check results and limits. [CI run](https://github.com/ArrokothI/arrokothi/actions/runs/40456276499) completed successfully; its `headSha`, `run.txt` and verification revision all name C. Verification ran 2026-10-27 05:36:46–06:42:57 UTC, exit 0. No local composed verify was run.

The downloaded bytes are retained here, including [compressed full raw output](review-02/ci-verify.json.gz), [stderr](review-02/ci-verify.stderr.log), [run metadata](review-02/ci-run.json), [run environment](review-02/ci-run.txt), [summary](review-02/ci-summary.json), and [original-file hashes](review-02/download-manifest.json). This does not rely on artifact retention at GitHub. [README](review-02/README.md) gives reproduction commands; [SHA256SUMS](review-02/SHA256SUMS) seals the attachments.

| Evidence | Observation | Attribution/limit |
|---|---|---|
| CI composed verify at C | `checks_passed`, 19/19; `result_reuse: false`; acceptance not evaluated | Inspected pinned raw output, not independently rerun full verify |
| CI environment | Node 26.10.0, npm 11.19.1, Python 3.13.16, Linux x86_64; verification records Git 2.55.0 and child environment policy | Local reruns used Node 26.10.0 on Darwin arm64 |
| CI tool tests / provenance / adoption | 671 tests; 1,549 origins; `provenance_verified`, `revalidation_complete`; 592 counterexamples, 26 families, 415 members, 52 suite targets, 23 preserved | `full_corpus_complete: false`; adoption earns no new mutation kills; do not equate the labels to closure of all historical material |
| CI mutation checks | Registered: 153 kills in 147 cases; refusal: 330; value-cost: 238; clean controls pass | Existing evidence holds and witness-credit limits remain in force |
| CI censuses, typecheck, repository tests | Refusal 330/330; oracle 30/30; typecheck exit 0; 4,675 tests, 0 failed/cancelled/skipped/todo | Broad regression evidence |
| CI other checks | Archive 4 tests; examples 18; builder docs 74 Markdown files, 2,173 links, 38 imports; remaining dimension/continuation/area checks pass | Area gate reports, not acceptance |
| CI fault sweep | 72 scenarios, 16,696 runs, 0 violations; 60/60 exits taken | Does not inject cancellation/fire as controls: 017 L-27 remains material |
| CI poison sweep | 61 files, 2,094 tests in each of off/count/throw/reenter; 400 names; zero zone firings; 13,051 windows / 13,104 calls | Excludes exactly `poison-catalog`, `fault-sweep`, `race-search`; preserves owner choice 02. Its original narrative count 59 was 60; the new owner-guard file makes 61 |
| Local required tests at H | **239/239**, 42 suites, no failures/skips; exit 0 ([log](review-02/targeted.log)) | `owner-guards`, review-01 `guard-probe`, all five `waits-*` suites, cancellation, Execution deadline, losing Outcomes, ambient time, race-search tests, all three attack probes |
| Local K1.3 registry at H | **12 clean controls and 12 kills**; every mutant fails its named assertion, exit 17, `invalid: false` ([raw](review-02/mutants.json)) | Maintained runner and registry blobs; the attached selector only chooses `k13.*`. Mechanism witnesses retain V-ENV holds / `semantic_credit: none`; no conformance/correction credit is invented |
| Local new oracle mutant | `oracle.losingWindowAt`: clean control passes, named negative control kills it; exit 17, not invalid ([raw](review-02/oracle-mutant.json)) | Tests the location-bounded refusal-only fault window, not cancellation atomicity |
| Local full K13-9 search at H | **456,976 exhaustive runs**, 20,000 supplementary words; 20 classes / 37 witnesses; 65 exercised letter/state transitions; zero failures, exit 0 ([log](review-02/race-search.log)) | Exactly the declared 13-letter alphabet, depth 4, 8 seeds and bounds 1/2. Supplementary words are outside the exhaustive claim |
| New owner matrix | 2 tests pass: **2,257** position-list cases (12 accept, 2,245 refuse); **15** generation cases (3 accept, 12 refuse) ([source](review-02/owner-matrix.test.mjs), [log](review-02/owner-matrix.log)) | Bounded typed-plan search described below, with unchanged-view checks on refusal |
| New terminal controls | **8 negative controls fail to obtain the required refusal**, 1 positive control passes; exit 1 ([source](review-02/guard-search.test.mjs), [log](review-02/guard-search.log)) | Reproduces the two findings; expected red evidence, not a test-infrastructure failure |

Not rerun locally: full verify, full repository suite, full poison/fault sweeps, adoption regeneration, or the remaining registry cases. Their exact-C raw evidence was inspected. Neither CI nor this review ran the `live-provider` or `large-memory-timing` profiles. K3 persistence/leases, K2 trusted result ingress, physical interruption, containment, unbounded fairness and memory guarantees remain outside this packet with their existing owners. Nothing here lifts TOOLS-01/02 evidence holds.

## Design 02 review and prior finding dispositions

### Q1–Q4

| Question | Result | Reason |
|---|---|---|
| Q1 — exact cover in every terminal arm, structural versus semantic | **FAIL** | `coversQueuedOnce` correctly proves a relation over the pre-decision queued positions. Its distinctness plus membership plus cardinality proof is sound. But Q1 then claims “a terminal decision leaves no queued Event,” which additionally needs facts about written dispositions and entries appended by that decision. Those are unchecked; R02-S2-01/02 below are counterexamples. |
| Q2 — fresh registration and one retirement/timeout | **PASS** | Creation initializes count 0; only Outcome changes it. A live or immediately retired registration requires old count + 1; no registration requires unchanged count; the new record names that count and the accepting Activation. Input/expiry/cancellation can retire only the live generation, clear it, and preserve its registration facts. No writer revives a retired generation. |
| Q3 — S1–S5, every writer, no narrowing | **FAIL** | The writer list and individual S1/S3/S4/S5 predicates are useful and match their checks. S2's predicate is narrower than the approved terminal-completeness guarantee; neither brief 02 nor owner choice 03 authorizes that narrowing. “Which plan an operation forms” under L-15 cannot absorb the specifically promised S2 owner guarantee. |
| Q4 — three clock paths | **PASS** | Registration-time due wait with no eligible queued Event expires in the Outcome; live wait requires an accepted host fire; Execution deadline is fire-only. Optional injection, host pumping, no instant enforcement for the latter paths, and operations' OPEN marker survive. |

### S1–S5 writer audit

| Guard | What was independently checked | Result |
|---|---|---|
| S1 | Creation starts nonterminal. Input, dispatch, delivery, Outcome, takeover, control, expiry and cancellation reject terminal logical work; dispatch requires READY, Outcome RUNNING. Settlement, timer-discard and losing/refusal evidence remain allowed in their distinct operational fields. | **PASS** for the stated logical-field scope |
| S2 | Both disposition writers (`#applyOutcome`, `#applyCancellation`), both list resolutions and the mailbox append writers (input, immediate-expiry Outcome, expiry). The shared cancellation arm covers both causes. | **FAIL**: correct pre-state cover is insufficient for terminal completeness |
| S3 | All state/live-wait writers; WAITING iff live; input/expiry/cancellation retirement agrees with generation, Activation, declaration identity, deadline, cause and ending Event. Live and retired are mutually exclusive in an Outcome. | **PASS** for the stated predicate; it does not connect an immediate retirement's readiness to READY |
| S4 | Count writers, registration identity, immediate Event/deadline retirement and live retirement; timeout co-presence and `expiresAs`; duplicates go through timer-discard. | **PASS**: freshness is checked against stored count, not mere agreement among supplied fields |
| S5 | Input/Outcome/expiry are the only setters, only over null, with matching retirement generation/species/selector/timeout; dispatch/cancellation clear. | **PASS** for its stated local predicate. Matching readiness can still coexist with a terminal next state in R02-S2-02; this is not proof of the whole terminal post-state |

The new `Map` uses captured primitives. Its key is the same string coercion as `readAt`: numeric `0` and `-0` cannot evade duplicate detection. The matrix enumerated every sequence of length 0–3 over `[-1, -0, 0, 1, 2, NaN, Infinity, 0.5]`, every split into acknowledge/end lists, on two queued positions. Only exact covers of positions 0 and 1 passed, including both orders and all valid partitions. Maintained owner-guard cases additionally reject naming a nonqueued position at the correct count. Thus the finding is not another alleged duplicate bypass of the corrected set helper.

For the agreement-versus-freshness search, the matrix started after g1 had expired and been reserved, then supplied mutually consistent counts/generations 0, 1, 2, 3 or 4 to each of live, immediate-Event and immediate-deadline registration. Only g2 passed; every other candidate refused before mutation. The maintained tests cover no increment with a registration, increment without one, old generation reuse, rewritten retirement facts and mismatching readiness. Source tracing checked creation, input, dispatch, Outcome, expiry and cancellation; no additional freshness counterexample was found within this search.

| Review-01 finding | Disposition at H |
|---|---|
| **K13-R01-S2-01** | **Specific examples fixed; required terminal-completeness closure remains open.** Duplicate cancellation positions and overlapping acknowledgment/end lists now reject for complete/fail and explicit/deadline cancellation. Valid disjoint partitions and two-Event cancellation pass. The same promised guarantee is defeated by R02-S2-01/02. Do not transcribe this as full S2 closure. |
| **K13-R01-S4-02** | **Closed** in the examined owner mechanism. Old g1 cannot be consistently reused through live, immediate wake or immediate expiry; generations 1→2→3 and duplicate host fires pass. |
| **K13-R01-CLOCK-03** | **Closed.** The original zero-fire positive case still passes, alongside live-wait fire and Execution-deadline fire-only controls. |

For CLOCK-03, the bounded current-source search covered `mental-model/`, 002, 007, 017, the development front door, `docs/guides/`, Kernel source and the SDK README; [matches](review-02/clock-search.log) are attached. I also read the multi-line rewrite-index clock entry. BASELINE's numbered paths are explicit; 017 L-22, the operations binding note, rewrite-index and `CoordinatorOptions.clock` distinguish the same paths. Execution-deadline-specific comments remain correctly fire-only. The concise binding notes are read with W-2's earlier eligible-Event branch; no contrary all-deadlines-fire-only statement was found. Historical design/review prose is not current shipped guidance.

## New findings

### K13-R02-S2-01 — P2 — an exact cover can write queued dispositions

**Candidate locations:** `packages/kernel/src/state.ts:716`, `:755`–`:770`, `:883`–`:898`; plan types `packages/kernel/src/plan.ts:409`–`:410` and `:494`. Contract: **K13-C2-1**, brief 02 Q1/Q3 and goal; design 01 §12 S2; design 02 Q1's structural claim; B-5 and K13-6/7's promised terminal disposition mechanism.

Start with two queued Events. Leave the genuine cancellation plan's `endAt` exact and unchanged; replace only `ending` with frozen `{ kind: "queued" }`. The owner accepts, changes state to `CANCELLED`, and leaves both Events queued. The same result occurs through the Execution-deadline cancellation arm. For a complete or fail Outcome at batch bound 1, replacing either `acknowledgment` or `ending` with that value leaves one of the two Events queued in `COMPLETED`/`FAILED`.

These are data-only plans allowed by the declared field types: both fields use `MailboxDisposition`, whose union includes `queued`. No callback, Proxy, malformed position or source mutation is involved. `coversQueuedOnce` validates **where** the writes go; no owner check establishes that the values actually dispose those entries. The commit assigns them verbatim. The new probe has six named negative cases and ordinary complete/fail positive controls; existing owner-guard positives cover both valid partitioning and cancellation.

**Required outcome:** the approved terminal-completeness guarantee must hold over the values written by every terminal disposition writer, or be explicitly revised by the owner under 006. It cannot be described as established by position coverage alone. Retain these counterexamples and require refusal before any mutation, with valid terminal decisions still succeeding, if the structural guarantee is retained.

### K13-R02-S2-02 — P2 — terminal Outcome appends a queued timeout after coverage

**Candidate locations:** `packages/kernel/src/state.ts:709`–`:716`, `:717`–`:734`, `:779`–`:785`; `packages/kernel/src/plan.ts:417`–`:428`. Contract: **K13-C2-1/C2-4**, brief 02 goal/Q1/Q3; design 02 Q1; B-5's terminal accounting and the retirement/readiness interaction.

Start with one input, dispatch it, and form a genuine due-at-registration `await` plan. Change only `nextState` from `READY` to `COMPLETED` (or `FAILED`). All old queued positions are correctly covered and written with a genuine acknowledgment. S3 accepts because there is no live wait and the next state is not WAITING; S4 accepts the genuinely fresh generation; S5 accepts readiness that genuinely belongs to the retirement. The owner then appends its constructed timeout with `disposition: QUEUED`, installs deadline readiness, and commits the terminal state.

The inspected terminal record has dispositions `[acknowledged, queued]`, one queued timeout and non-null deadline readiness. This case does not depend on the first finding's broad disposition types. `OutcomePlan` also permits this combination: `nextState: ExecutionState` is independent of the optional retirement/readiness/timeout fields. The public planner forms the correct READY plan; the absent guard is precisely why the asserted owner guarantee remains planner-dependent.

The probe includes both terminal states and a positive ordinary due-await control, which stays READY with one queued timeout. This is a finite, current owner-plan counterexample, not a race invented outside K13-9. Checking only the mailbox as it existed before the decision misses a writer included in design 02's own writer table.

**Required outcome:** any retained terminal-completeness proof must cover the **entire resulting mailbox**, including entries created by the same decision, and its terminal/readiness combination. Keep valid registration-time expiry and complete/fail decisions as positive controls; retain both terminal mutations as negative controls. The owner must decide the revised design/claim before another patch round.

## Cumulative B..H re-audit

The cumulative review covered both implementation ranges and the correction, not just H1..H. Coverage was derived from waits W-1/W-2/W-3/W-7/W-9 and B-1..B-8, lifecycle CX-1..CX-6, operations CL-1..CL-3, creation/identity, execution-cycle OA ordering and delivery, authority and recovery. Kernel/Runtime/Driver/deployment boundaries remain provider-neutral. The new logic belongs to Kernel logical execution; the optional Driver request remains a post-commit request and establishes no native stop or containment guarantee.

### K13-1..9 and correction criteria

| Criterion | Result | Independent assessment |
|---|---|---|
| **K13-1** | **PASS** | Closed nested grammar, bounded 256-selector aggregate, eager own-field capture, required/unknown/empty/type/numeric cases; complete malformed refusal and pre-authority diagnostic ordering. Wait identity participates in exact replay/conflict. `waits-declaration` and preserved Outcome/refusal tests. |
| **K13-2** | **PASS** | Category is fixed by accepting/minting path. Application input reaches subscriptions only; timeout reaches neither list. Synthetic alternative tests establish equality/AND/ANY-OF; live spoof cases cannot reach trusted dependency matching. K2 inactivity remains L-21. |
| **K13-3** | **PASS** | Planner excludes acknowledged batch, searches remaining eligible queue before comparing one captured clock observation, otherwise installs WAITING. Bound-1/2 branch contrast, eligible/due tie, unusable clock and reentrant input/cancel/Outcome cases discriminate order. Owner S2 overclaim is separately failed below. |
| **K13-4** | **PASS** | Fresh registration induction, live retirement, one timeout per generation, old middle-generation and duplicate classifications, late input retained for a later selector. Direct owner and matrix controls establish the corrected S4 predicate. |
| **K13-5** | **PASS** | Five separate live examples, membership/filtering/order/truncation and reservation-time re-evaluation pass. Ignore-eligibility, freeze-at-wake and missing-timeout wrong rules are distinguished. Correct sort-union is equivalent on reachable histories and receives no invented kill. |
| **K13-6** | **FAIL** | Public cancel/Outcome ordering, whole losing refusal, separate authority, held exchange, late delivery rows, retries, terminal controls and Driver requests all pass. The claimed S2 owner mechanism for complete terminal disposition still fails R02-S2-01; this is the approved mechanism/claim failure, not a newly demonstrated public cancellation bug. |
| **K13-7** | **FAIL** | Creation deadline identity, fire-only admission and shared cancellation-builder behavior pass, including whole-view comparison with explicit cancellation. The shared owner terminal-completeness claim fails for the deadline cause too (R02-S2-01). |
| **K13-8** | **PASS** | Zone source inspection, bounded syntactic time census and poisoned boundary windows agree with injected clock reads only. No ambient scheduler/clock fallback added. Census is not promoted to a universal static proof (L-26). |
| **K13-9** | **PASS** | Declared exhaustive domain, independently expected projection, twelve invariants and all class witnesses pass at H; actual alphabet/depth/seeds unchanged. Named deterministic cases cover the attack destinations outside that alphabet. No claim of all schedules or arbitrary plan mutations. |
| **K13-C2-1** | **FAIL** | Duplicate/overlap counterexamples reject, but both new owner counterexamples defeat the promised terminal-completeness guarantee. |
| **K13-C2-2** | **PASS** | Stored-count freshness, registration facts and retirement/timeout coupling; negative and positive controls above. |
| **K13-C2-3** | **PASS** | Three-path current descriptions and behavior agree; OPEN marker and host obligations retained. |
| **K13-C2-4** | **FAIL** | Required cumulative execution evidence exists and the prior public corpus passes; design/implementation assertions of full S2 closure and no narrowed claim are unsupported. |

No required in-packet criterion is marked DEFERRED. The failures share the two findings; they are not additional separately counted defects.

### D01-CHK-01..07

| Obligation | Result | Destination checked |
|---|---|---|
| **D01-CHK-01** | **PASS** | Brief correction, design addendum A1, normative waits examples, `waits-selection` and `k13-controls.json`: missing timeout membership is discriminated; sort-union equivalence is retained. |
| **D01-CHK-02** | **PASS** | Race model imports no production semantics. Harness keeps submitted payload expectations, stable injective ID correspondence, independent pending timers, reference-equal retry receipts/refusals, and separates cancellation facts from delivery rows. Corrected INV-7 admits mandatory ineligible T; S5 d/B1 is positive; all five A05/A21 corruptions are negative. |
| **D01-CHK-03** | **PASS** | Every A01..A24 has the explicit maintained destination below. Seed prefixes validated; skips and transitions reported; full exhaustive and supplementary output separate. |
| **D01-CHK-04** | **PASS** | Cancelled and completed/failed redelivery preserves `no_unresolved_exchange`; other terminal control tokens remain their established values. |
| **D01-CHK-05** | **PASS** | Timer key captures only own executionId/kind/generation once; ignores descriptive deadline; malformed/unknown is unrecorded unknown; immediate-expiry key can be built from accepted decision. Timeout ID packing and generation/deadline projections inspected. |
| **D01-CHK-06** | **PASS** | Owner choice 01: optional Execution-scoped request, current attempt or null, once after commit for both causes in READY/RUNNING/WAITING. Absent/inherited-only/throwing/thenable/reentrant member tests pass; no physical-stop claim. |
| **D01-CHK-07** | **PASS** | Owner-approved Execution fire-only rule: no creation read, past deadline creates READY, earlier Outcome/dispatch wins; exact/add/remove/change creation deadline behavior and no-clock refusal pass. |

### Attack A01..A24 destinations

Each row is **PASS for the named attack obligation**, by the inspected test assertions and the targeted H run. The attack's original three probe files also pass; the production tests, rather than those design-only probes, supply behavioral closure.

| ID | Destination and distinguishing assertion |
|---|---|
| A01 | `waits-selection`: five live examples, three wrong-rule contrasts, sort-union equivalence and explicitly synthetic older-R/T control |
| A02 | `cancellation`: pending report delivered/failed/contradictory repeat, failed-first, redelivery capability; each settles only its own row |
| A03 | `waits-timers`: fire middle g2 after Event/timeout retirement while g3 lives; duplicate/stale retained, g3 unchanged |
| A04 | `waits-selection`: s→x and x→s, alternative-plus-subscription, old selector input queued |
| A05 | `race-search.test`: reject retained nonempty payload replaced with null after cancellation |
| A06 | `cancellation`: explicit S4 e d q p p p; third capability still finds cancelled exchange's row |
| A07 | `losing-outcomes`: fresh-equal loser retry after another loser returns same retained refusal |
| A08 | `losing-outcomes`: progress-only and Emission-only changes produce separate full-content identities |
| A09 | `losing-outcomes`: accepted A1 replay/conflict wins OA-2 after cancelled A2 has recorded a loser |
| A10 | `cancellation`: both orders for continue/await/complete/fail, nonempty progress/Emissions, reserved batch plus backlog; no partial acceptance |
| A11 | `cancellation`: old acknowledgment survives; reserved/backlog terminal; exact input retry, changed retry and fresh terminal ingress distinguished |
| A12 | `waits-registration`: S0 e d z at bounds 1/2 with no/future/due deadline, decision/disposition/readiness asserted |
| A13 | `waits-timers`, `cancellation`: repeated expiry across reservation/new registration/terminal state, including never-listed immediate expiry; one timeout |
| A14 | `waits-selection`: bound-3 T travels without two ineligible backlog entries; later eligible candidates beyond bound stay queued |
| A15 | `waits-registration`, `cancellation`: nested clock input/cancel/Outcome, completing cancelScopes getter, post-commit request reentry and delivery report; nested decision first |
| A16 | `execution-deadline`: explicit/deadline cancellation views compared across same prefixes, including holds and queued T; only declared cause/actor/reason/fire differences masked |
| A17 | `execution-deadline`: immutable deadline participates in canonical creation content; numeric edges, absent-field identity, exact retry and add/remove/change conflicts |
| A18 | `waits-registration`, `waits-timers`, `execution-deadline`: D−1/D/D+1, unusable/no clock, replay/fence priority and exactly stated read points |
| A19 | `waits-declaration`: valid/invalid grammar table, 256/257 aggregate including duplicates, entire proposal refused |
| A20 | `waits-eligibility`: source-category spoof contrasts, synthetic AND/ANY-OF, timeout exclusion |
| A21 | `race-search.test`/harness: missing timer, renamed Event, copied replay receipt, corrupted cancellation beside intact delivery; independent expectations reject all |
| A22 | `cancellation`: terminal dispatch/redelivery/takeover/recovery/protocol tokens and unchanged accepted state |
| A23 | `losing-outcomes`: scope before retry/fence, visible caller without grant, malformed coordinates, distinct Executions without rejection aliasing |
| A24 | `execution-deadline`: 10/25, 10/5 and 10/10 with both accepted-fire orders; wait-first T terminal-disposed, Execution-first creates no T |

### Preservation, architecture and evidence changes

- Checked the cumulative capture, eligibility/selection, registration/fire, cancellation builder, OA-2-before-fence, full-content losing index and delivery ownership paths; all have explicit deterministic or declared-search evidence above. This review does not infer target semantics from the legacy SDK.
- Existing wait-unsupported pins are replaced by real wait acceptance or malformed-wait whole refusal. Unsupported-surface tests now use the later Effect boundary and preserve refusal/no-state-change properties. Exact-coordinate expectations add `wait: null`; input-only receipt casts follow the new timeout union. Legacy SDK application tests remain because they exercise legacy Harness behavior.
- The owner arm/field inventories and plan witnesses extend to thirteen variants, new wait/readiness/timeout records and cancellation/loser writers. `zone-analysis` admits only the declared post-commit Driver cancellation call and losing-refusal recorder; conditional provenance handling supports optional timeout records. These layout controls do not validate every relation among plan fields, as the new probes demonstrate.
- The fault oracle adds wait registration commit steps and the losing-index window with a named location-negative control. It permits only its declared partial-commit/contained-fault classes; its limits are retained rather than presented as a transaction proof. Cancellation/fire injection remains L-27. The new losing-window mutant was independently rerun.
- Registry comparison found twelve new K1.3 cases and one new oracle case, no removed registered cases. Existing oracle reference/answer anchors and the owner-callback import anchor change with the new fields. Value-cost cases are retained with localized input/Activation/view anchors. Adoption/provenance and complete registry evidence are in CI; no manual census rewrite was done for this review.
- Layer-3 payload is appropriate: creation's optional immutable seventh fact has owner authority; operations links that fact to cancellation and records implementation clock choices while retaining OPEN; waits corrects the false discrimination claim without changing mandatory membership. Rewrite-index records binding choices, not a universal wire contract. Related core/identity/authority/execution-cycle/lifecycle/recovery and Kernel/Runtime/Driver/deployment descriptions were checked for the affected contracts. No Layer-1/2 change is needed, no provider type enters Kernel semantics, and no §5 limit is used to claim a new guarantee.
- Current 007 remains WAITING_FOR_REVIEW and names the exact correction C; it does not self-accept. BASELINE and 017's narrowed S2 position predicate accurately describes the check in isolation, but cannot discharge brief 02's stronger approved terminal-completeness claim. That distinction is the blocking design/contract issue; the clock prose itself is corrected.
- Read the prior-art map and its relevant timers/cancellation, plan/apply and evidence sections as background. No third-party code, test, asset or new dependency was copied, adapted, vendored or added. Review probes use this repository's existing test helpers and independently written assertions; no license-clearance claim is made about background references.

## Root cause and owner decision required

**Recurring mechanism.** The owner has a closed writer set and prepare/commit phases, but the design infers a post-state invariant from only some facts supplied to those writers. Round 1 checked cardinality without set identity and agreement without freshness. Round 2 fixes those relations, yet still treats a cover of old positions as proof of terminal completeness. It neither constrains the values written there nor includes a newly appended entry in the terminal proof. Independent optional fields also permit a terminal state together with a fresh timeout and its readiness.

**Why earlier checks missed it.** The previous S2 probes mutated position lists while retaining genuine nonqueued dispositions and a genuine complete/cancel plan shape. The corrected tests add repeated/overlapping/nonqueued positions but keep those same assumptions. Public suites and the race model exercise the coordinator's correct plan construction, so they never supply the two inconsistent combinations. Static commit inventories prove writer ownership and sequencing; they do not prove the semantic relation among a field's value, an append and the next state. Design 02's writer table lists Outcome's timeout append, but Q1's argument never accounts for it. The audit therefore needed to vary both the **written value** and the **same-decision mailbox growth**, not only list membership.

This is a K1.3 guard/design defect layered onto COORD-REFACTOR-01's accepted owner layout. It does **not** demonstrate that the older sole-writer layout itself is unfit: that packet explicitly retained plan-selection semantics under L-15. The unsound step is K1.3's stronger assertion that these checks establish terminal completeness independently of the planner. “Only what they check” cannot silently replace the finishable claim brief 02 expressly preserved.

Under 006, the owner now chooses one of:

1. **Redesign the terminal owner contract and its proof.** Retain the intended strong invariant, with a new design note and design check accounting for every disposition value, existing entry, same-decision append and terminal/readiness relation. Types, construction constraints and runtime preflight checks are possible mechanisms, but the required proof is over all accepted plans in the declared domain.
2. **Refine the finishable claim or record an explicit limit.** Deliberately specify which terminal properties the owner establishes and which remain planner/test obligations, with corresponding brief/design/BASELINE/017 changes and evidence. This needs an explicit owner disposition; it cannot weaken B-5's public terminal behavior or be inferred from this failed review.
3. **Split the unresolved structural guarantee from the demonstrated behavior.** Define the dependency and acceptance consequences explicitly; preserve the counterexamples and the current public corpus. A split is not acceptance of H or permission to present the unproved invariant as shipped.

No new ordinary patch-round brief is issued because Prompt B's stop-and-redesign branch applies. The eight new negative controls, their positive counterpart, the bounded matrix and the original corpus are the decision's evidence inputs. The required outcome is an owner-selected, finishable contract/design followed by review of its actual implementation and all dependent claims.

For status transcription: **CHANGES REQUIRED for H `87db3c40c379d0d2186b16cfee9cc2b16d989a73`; K13-R01-S2-01 remains open at the guarantee level, with new P2 findings K13-R02-S2-01 and K13-R02-S2-02; K13-R01-S4-02 and K13-R01-CLOCK-03 closed; 006 stop-and-redesign requires owner disposition before another patch round.** No merge, successor release, evidence-hold release or acceptance is authorized by this review.

CHANGES REQUIRED
