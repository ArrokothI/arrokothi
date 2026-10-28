# Independent review 03 — K1.3 correction round 2

## Identity and authority

- Reviewer: independent Codex desktop session, GPT-6 per the session instructions; an exact serving-model identifier is not exposed. Review performed 2026-10-27–28, recorded 2026-10-28. No subagents were used. This session did not implement the candidate.
- Base B: `22c8c1db9958049eb8693dd5aa4d7005f2d565db`.
- Payload C: `c7abff65ceca3e3b21fd64ffee12ea2f636f5cbc`.
- Candidate H: **`47c0b7f1c089260991649a6d814ad7db22b54a2f`**, fetched from `origin/claude/k1.3` and checked out exactly. Acceptance below names H, not this review's recording commit.
- Previous reviewed H: `87db3c40c379d0d2186b16cfee9cc2b16d989a73`; [review 02](review-02.md) is at `2ee779a5c89d93091fe3a3ee87f3acfa67dba3e1`. Design check 03 is at `5605beb7f99b8938f300f1e4266cb94abe3b2023`. Both are ancestors of C and H.
- Review branch: `codex/k1.3-review-03`, newly created from H. Only this review and its evidence are added. The review commit and verified push SHA are supplied in the external handoff.
- Governing process: AGENTS.md, [006](../../006-development-process.md), [007](../../007-work-packets.md), [008](../../008-implementation-report.md), [009 Prompt B](../../009-universal-prompts.md#prompt-b--independent-reviewer), and [012](../../012-review-methods.md). AGENTS/006/008/009/012 are byte-identical at B and H; 007's candidate changes were reviewed. The architecture and slice-audit skills were applied.
- Contract: everything identified in review 02, including brief 01 and its owner answers, release 01, design 01 and addendum, attack 01, design check 01, owner choices 01–03, review 01, brief 02, design 02 and implementation 02; additionally review 02's findings/root-cause disposition, [owner choice 04](owner-choice-04.md), [design 03 and revision 1](design-03.md), [design check 03](design-check-03.md), owner choices [05](owner-choice-05.md) and [06](owner-choice-06.md), and [implementation 03](implementation-03.md). There is no separate K1.3 `contract.md`; these are its governing records.
- Release/prerequisites: B is the PR #61 release merge. Independently verified ancestry of TOOLS-02 range 1 `4015599e6178202541e0091f99b6196adaff0430`, its receipt `c3b45a64b0a16fb19342950377a3e13568a03ac8`, K1.2/correction integration `ed509e11dc39ff24e10c1ace68189776c4270919`, and COORD-REFACTOR-01 integration `d17ea6d11bbab977f0c8b7693b3391924b9c815b`. [Identity evidence](review-03/identities.json).

Full pinned Git objects, source, surrounding tests, all 147 paths in the cumulative B..H diff, and the raw requested CI artifact were accessible. [Source manifest](review-03/source-manifest.json) records B/H blobs and hashes; [full cumulative patch](review-03/cumulative.patch.gz) preserves the diff. C..H changes exactly `007-work-packets.md`, `work/K1.3/implementation-03.md` and `work/K1.3/progress.md`, matching the administrative allowlist. No code, evaluator, fixture or architecture change is hidden between C and H.

The owner's gate is applied: only a concrete defect against the named criteria, or a false current claim in 007, BASELINE, 017 or Layer 3, blocks. An undecided case outside a declared domain would be an owner question. No such question is needed to decide this candidate. Coverage was derived from the governing criteria and prior findings, then reconciled against the implementation report; that report is not the acceptance authority.

## Result

No blocking defect was found. The redesign closes **K13-R02-S2-01**, **K13-R02-S2-02**, and the guarantee-level **K13-R01-S2-01**, rather than only refusing their original position lists. D03-CHK-01..06 are closed by the mechanisms each required, with owner choice 05's full evaluation superseding the proposed incremental implementation. The cumulative K13-1..9, K13-C2-1..4, D01-CHK-01..07 and A01..A24 obligations pass within their declared domains.

The guarantee is about the enumerated successor relations and exact completed application. It does not certify all plan content, turn internal plans into a hostile-input interface, or provide rollback. Owner choice 06 is material: after an interrupted commit, a new governed call whose successor still breaks P throws without writing. Some decisions can repair such a record; repair is not universally available. An indexed Outcome retry may merely replay without repairing it. The current L-28 wording permits exactly that limitation.

## Evidence inspected and rerun

The user required the CI artifact instead of another local full verify. I downloaded [Packet verify run 40605040929](https://github.com/ArrokothI/arrokothi/actions/runs/40605040929) with `gh run download 40605040929 --repo ArrokothI/arrokothi`, and inspected its metadata, raw verification document, nested results and limitations. `headSha`, `run.txt` and verification revision all name C. The verification step ran 2026-10-27 23:52:33–2026-10-28 01:01:40 UTC and succeeded. **No local composed verify was run.**

The original downloaded bytes are preserved as [compressed raw verification](review-03/ci-verify.json.gz), [stderr](review-03/ci-verify.stderr.log), [summary](review-03/ci-summary.json), [run environment](review-03/ci-run.txt) and [run metadata](review-03/ci-run.json), with [download hashes](review-03/download-manifest.json). [README](review-03/README.md) gives reproduction commands and [SHA256SUMS](review-03/SHA256SUMS) seals the bundle.

| Evidence | Observation | Attribution and limit |
|---|---|---|
| CI composed verify at C | `checks_passed`, 19/19; `result_reuse: false`; acceptance not evaluated | Inspected raw evidence; applies to H's identical executable/test payload, with administrative prose separately reviewed |
| CI environment | Node 26.10.0, npm 11.19.1, Python 3.13.16, Linux x64; Git 2.55.0 | Local reruns used Node 26.10.0, Darwin arm64 |
| CI tools/provenance/adoption | 671 tool tests; 1,549 origins; `provenance_verified` and `revalidation_complete`; 592 counterexamples, 26 families, 415 members, 52 suite targets, 23 preserved | Both completeness flags remain false; adoption reports zero new kills |
| CI mutants and censuses | Registered 153 kills; refusal 330; value-cost 238; refusal census 330/330 and oracle census 30/30 | Retains registry evidence holds; labels are not independent acceptance |
| CI typecheck/regressions | Typecheck exit 0; repository 4,750 tests, archive 4, examples 18; no failures/cancellations/skips/todos | Broad regression evidence, not a universal invariant proof |
| CI fault sweep | 72 scenarios, **17,026 runs**, zero violations; 60/60 exits; 23 intercepted operations | Declared fault windows and owner choice 06; L-27's cancellation/fire coverage limit remains |
| CI poison sweep | 62 files, 2,169 tests in each of off/count/throw/reenter; 404 names; zero zone firings; 14,531 windows / 14,584 calls | Excludes `poison-catalog`, `fault-sweep`, `race-search`; owner choice 02 remains in force |
| CI remaining checks | Race search, dimensions, continuations and area report pass; builder docs: 74 Markdown files, 2,184 links, 38 imports | Area gate reports; live-provider and large-memory-timing profiles were not run |
| Local requested suites at H | **680/680**, 57 suites, zero failures/skips, exit 0 ([log](review-03/targeted.log)) | Owner guards, successor search, control commits, fault oracle, all `waits-*` suites, cancellation, Execution deadline, losing Outcomes, ambient time, race-search tests and attack-01 probes |
| Local post-state witness suite | **20/20**, exit 0 ([log](review-03/state-plans.log)) | All accepted plans exercised by `state-plans.test.ts` satisfy the post-state witness |
| Local K1.3 registry | **12 clean controls and 12 kills**, each named assertion fails with exit 17 and `invalid: false` ([raw](review-03/mutants.json)) | Unchanged maintained runner/registry at H; selector only chooses `k13.*`. V-ENV holds and `semantic_credit: none` remain; no conformance/correction credit is invented |
| Local oracle registry control | `oracle.losingWindowAt`: clean control passes, named control kills it, exit 17, not invalid ([raw](review-03/oracle-mutant.json)) | Retained refusal-only apply-window oracle control |
| Local maintained successor search | **11,964 variants: 105 admitted, 11,859 refused**; frozen family/seed/clause manifest matched | Full reference P/T plus separately stated preservation expectations; finite domain, not the proof for all typed plans |
| Unchanged review-01/02 probes | **17 tests: 16 pass, one obsolete expectation fails**, exit 1 ([log](review-03/historical-probes.log)) | All named defect probes pass. Historical exact-cover matrix expects 12 successes; new structural whole-batch T3 allows only 2. Explained below |
| Local full K13-9 search | **456,976 exhaustive runs**, 20,000 supplementary words; 20 classes / 37 witnesses; 65 exercised transitions; zero failures ([log](review-03/race-search.log)) | 13 letters, depth 4, 8 seeds, bounds 1/2. Inapplicable letters have recorded skips; this is not a count of all possible real schedules |
| Review-01 additional oracle rerun | 456,976 words; 2,856,100 snapshots, 2,741,856 timer listings, 269,100 terminal checks; 2 negative controls; zero failures ([log](review-03/extra-search-r01.log)) | Adds retained-value, timer and terminal checks to the declared words; does not make the domain exhaustive beyond depth 4 |
| New independent plan search | **1,615 refusals, 17 admissions**, zero failures; 13,617 public setup/follow-on plans witnessed ([source](review-03/additional-search.mjs), [log](review-03/additional-search.log)) | Larger histories and all six-entry acknowledgment/end/omit assignments, detailed below |
| New actual interrupted commits | **5 injected host faults**, all expected refusals, repairs and replay limits observed ([source](review-03/interrupted-commit.mjs), [log](review-03/interrupted-commit.log)) | Direct evidence for L-28; not fault containment or recovery certification |

The worktree used the existing locked dependencies. The mutation runner requires physical dependency files, so its successful run used a separate exact-H shared clone with those existing dependencies copied; no dependency/lockfile changed. An initial missing/linked-dependency setup failure earns no evidence credit. No provider service was exercised. Existing evidence-credit holds, incomplete historical adoption, and limitations in 017 are not lifted by this review.

Cumulative `git diff --check B..H` reports two trailing spaces in review-01's retained `coverage-comparison.log` ([output](review-03/cumulative-diff-check.log)). They are historical evidence, not a criterion defect or false current claim, and were preserved. The review's staged check reports only those same two raw lines in the saved output; authored Markdown and probes pass.

## Successor mechanism and design-check closure

The reviewed owner is [state.ts](../../../../packages/kernel/src/state.ts), especially `successor`, `admit`, `transitionViolation` and `postViolation` (H lines 1115–1424), and its creation/input/dispatch/Outcome/expiry/cancellation writers. The structural enforcement is [zone-analysis.ts](../../../../packages/kernel/tests/zone-analysis.ts), with [control-commits](../../../../packages/kernel/tests/control-commits.test.ts), [owner-guards](../../../../packages/kernel/tests/owner-guards.test.ts), [reference](../../../../packages/kernel/tests/successor-reference.ts) and [frozen search](../../../../packages/kernel/tests/owner-successor-search.json).

The overlay resolves existing position writes before mutation, rejects duplicate/overlapping targets by entry identity (including `0`/`-0`), and includes the optional appended mailbox entry and retirement. Admission evaluates T1–T6 then all P1–P9 before the first write, including the version write. Creation checks full P before either index publishes the fresh record. There is no old-P premise in the production predicate: historical facts are rescanned too.

| Clauses | Structural argument checked |
|---|---|
| P1–P5 | P scans both old entries with overlaid dispositions and the appended entry. Terminal state cannot coexist with queued mail, a live wait, readiness or an open exchange. WAITING/RUNNING/CANCELLED equivalences and terminal-disposition restrictions apply to the whole successor. This closes both the old-values and new-append holes. |
| P6 / T4 / T6 | The retired sequence is exactly generations 1..N; any live wait is N+1; their length equals count. Every wait's deadline equals its declaration. T4 retains registration facts when retiring an old wait and binds a new registration to the resolving exchange. T6 permits exactly one count increment for a new registration, including immediate retirement. Coordinated reuse cannot hide behind internally agreeing new fields. |
| P7–P8 | Every timeout maps to a unique matching deadline retirement by generation, deadline and ending ID; count equality supplies the reverse direction. Event/cancellation retirement shapes are checked separately. These are relational facts, not a derivation of the timeout ID's content or an eligibility proof. |
| P9 / T5 | P9 relates readiness to READY, the last retirement, identical selector and queued ending Event. T5 supplies the implication P9 alone lacked: this decision's Event/deadline retirement must install readiness; existing readiness persists until dispatch or cancellation. |
| T1–T3 | Per-arm preconditions prevent redispatch/incorrect exchange replacement and govern which fields may change. Disposition writes target queued entries, never write queued, and cannot duplicate. Only the resolving Outcome acknowledges its own batch; its **final** dispositions leave the whole batch acknowledged by that Activation. Cancellation acknowledges none. |
| Exact application | Each changed scalar is assigned its matching admitted member exactly once. Both disposition loops traverse the complete checked lists in order; each optional append has the matching presence guard and exact checked value. No governed commit write was found using an unchecked plan value or a transformed successor value. `ExecutionRecord.activation` is distinguished from takeover's exchange-internal `ActivationRecord.activation`. |

The writer review included operational arms: delivery, takeover and control reject terminal records; settlement, refusals, losing Outcomes and timer discards can still append operational evidence. Their version/evidence changes do not replace the governed open-exchange pointer or alter mailbox/wait relations. The source guard is the declared bounded structural mechanism under 012, not a claim to recognize every deliberately evasive equivalent JavaScript program.

| Obligation | Result and required closure actually observed |
|---|---|
| D03-CHK-01 | **PASS.** Exact-value/write-set checks, admission dominance, creation publication and qualified writers are implemented. All six writer arms and legitimate takeover are positive controls. Eleven static negatives include arithmetic on a checked value, missing/bypassed admission, omitted scalar, skipped disposition, duplicate append and plan-derived suppression. The 98 control-commit tests pass. This is equality/completeness enforcement, not merely provenance. |
| D03-CHK-02 | **PASS.** Owner choice 05 selects full evaluation. P6 checks live and retired deadline/declaration equations; P7 cannot hide a mutually agreeing retirement/timeout mismatch with the declaration. Named direct controls refuse before mutation; independent reference and additional history probes agree. No incremental-equivalence claim remains to prove. |
| D03-CHK-03 | **PASS.** T5 installs readiness with Event/deadline retirement and preserves it until dispatch/cancel. Missing-readiness controls cover immediate Event, immediate deadline and input wake independently of one-way P9. Positive wake/input/reserve/cancel sequences retain the required lifetime. |
| D03-CHK-04 | **PASS.** Explicit arm starts/field permissions remain. Empty-batch RUNNING redispatch, wrong-state/wrong-exchange Outcome and wrong-live-generation expiry refuse. RUNNING input with a nonempty reserved batch succeeds. Whole-batch T3 applies only to the resolving Outcome; terminal controls refuse and permitted evidence arms still run. |
| D03-CHK-05 | **PASS.** Frozen OA/OB/OD/OP, historical position, IN/EX/CA/RT families total 11,964; per-seed and clause counts match. Old seed validity, reference transition and post-P are checked separately, with independent preservation assertions. The 15-case generation matrix remains 3 accepted/12 refused. The 2,257-row position family is explicitly updated to 2 accepted/2,255 refused. Original probe bytes remain unchanged. |
| D03-CHK-06 | **PASS.** BASELINE/017 enumerate the projection and relations, terminal operational exceptions and semantic obligations. Full evaluation addresses continued admission from damaged old records; L-28 explicitly retains possible P-breaking host-fault prefixes, inside or outside declared windows, thrown subsequent owner refusals, and absent rollback. Owner choice 06 governs the oracle change. |

T3's final-disposition form is justified under owner choice 06: an interrupted Outcome may already have acknowledged part of the batch. A completing retry need not write those entries again, but the **entire final batch** must still be acknowledged by its own Activation. This neither admits duplicate writes nor permits ending a reserved entry instead of acknowledging it. On uninterrupted records it is equivalent to acknowledging exactly the entire current batch.

## Prior findings and continued search

| Finding | Disposition |
|---|---|
| K13-R01-S2-01, guarantee level | **CLOSED.** Resolved write uniqueness plus whole-successor P1/T2/T3 account for all queued entries, their actual dispositions, and same-decision appends. Closure is not inferred from array length or the original two probes. |
| K13-R02-S2-01 | **CLOSED.** Queued `ending`/`acknowledgment` values refuse before mutation for complete, fail and both cancellation causes. Exact position cover cannot excuse a queued resulting disposition. |
| K13-R02-S2-02 | **CLOSED.** A terminal Outcome with its genuine appended timeout/readiness fails full P1/P9. Both complete/fail variations refuse; the genuine due-await positive remains READY. |
| K13-R01-S4-02 | **Remains CLOSED.** Generation reuse fails against the retained full ledger and T6 in live/Event/deadline modes, including mutually consistent count/retirement/readiness/timeout changes. |
| K13-R01-CLOCK-03 | **Remains CLOSED.** Current descriptions retain the three paths: eligible Event first; otherwise a due deadline at registration expires in that decision; existing live-wait and Execution deadlines take effect on host fire. No all-deadlines-fire-only claim was found. |

The unchanged historical position probe's one failure is expected under the approved D03-CHK-05/T3 change, not a hidden regression. Its 12 historically accepted exact covers include ten that terminal-dispose a reserved batch entry. The maintained exhaustive 2,257-row family independently runs the revised contract and accepts only the `0`/`-0` variants of acknowledgment at 0 and terminal disposition at 1. All six review-01 tests, all nine review-02 guard-search tests, and the historical generation matrix pass unchanged.

Beyond the maintained corpus, [additional-search.mjs](review-03/additional-search.mjs) captures genuine internal plans without committing them, varies them at the owner seam, and requires a refused plan to preserve both the public view and hidden version. It imports neither the reference predicate nor its expected verdicts. Public-reachable seeds contain 0, 1, 2, 5 or 16 retired waits, mixing immediate expiry, immediate Event wake and later input wake. Live/Event/deadline registration candidates are varied with coordinated generation/count values `-1`, `0`, old count, old count+2, `MAX_SAFE_INTEGER`, NaN, Infinity and 1.5 (120 cases); additional changes cover declaration/deadline disagreement, a mutually agreeing wrong retirement/timeout deadline, missing readiness, an equal-looking but different selector, and reuse of an older timeout's ID. Genuine admissions verify consecutive ledgers, readiness retention through later inputs, mandatory membership at dispatch, consumption, and cancellation.

The same script enumerates **all 2 × 3^6 = 1,458 assignments** of six queued positions to acknowledgment, terminal ending or omission, with a two-entry reserved batch, for complete/fail. Only the correct two partitions succeed. Combined results are 1,615 refused and 17 accepted plans, all as independently expected. This extends history length and partition width; it does not claim arbitrary-history exhaustive testing or hostile JavaScript object validation. The unbounded assertion is supported by the full-state and exact-write mechanisms above.

[interrupted-commit.mjs](review-03/interrupted-commit.mjs) injects real throws through the load-time captured `Object.defineProperty`, restoring the live global after module loading; no candidate source is edited. Four complete/fail cases interrupt the resolved-exchange append after terminal dispositions: P5 is broken, subsequent input and a different continue Outcome throw without mutation, and separate runs demonstrate repair by retry or cancellation. The fifth interrupts an immediate-expiry retirement append after its timeout and accepted-Outcome index exist: P7 is broken; input and cancellation throw; the identical Outcome **replays without repair**. This last record is not promised automatic recovery by L-28. The probe establishes that “cancellation or retry can repair” must not be read as “always repairs.” The current wording and owner choice 06's Effect section state admission in terms of whether the successor satisfies P, so this observation is not a blocker.

## Cumulative B..H audit

This audit includes the original packet, not just C's redesign. Kernel owns wait/cancellation state and accepted ordering; Driver owns native cooperation and safe takeover; deployment owns physical interruption/containment. No provider/runtime concept has entered Kernel semantics. Changed tests for previously unsupported `await`/cancellation now assert their implemented contracts; the unsupported-surface mechanism remains tested on a later-packet surface. Fixture/registry anchor changes were inspected against the source and successful controls, with adoption and credit limits preserved.

| Criterion | Result and mechanism/evidence |
|---|---|
| K13-1 | **PASS.** Bounded own-field capture/validation of wait declarations, exact unknown-field rejection, alternatives/subscriptions and aggregate 256 boundary; invalid/unsupported references refuse whole. Declaration suite, A19 and registration mutants. |
| K13-2 | **PASS.** Eligibility branches on trusted source category, then the declared selector. Application input cannot spoof trusted results; timeout matches no dependency. Eligibility suite and A04/A20; K2 result ingress remains out of scope. |
| K13-3 | **PASS.** Resolve/acknowledge the batch, scan queued eligible Events excluding that batch, then decide deadline/live wait with one captured clock reading where needed. Registration suite, order/step-2 mutants, A18 and reentrancy controls. |
| K13-4 | **PASS.** Fresh generation ledger, live-key checks, one timeout, stale/duplicate handling and preserved late input. Timer suite, owner freshness controls, generation/duplicate mutants, A03/A13. |
| K13-5 | **PASS.** All five selection examples; eligibility re-evaluated at reservation, mandatory timeout retained, selected members presented in acceptance order, readiness consumed. Selection/dispatch mutants and A01/A14. Sort-union equivalence is explicitly explained; no false kill is credited. |
| K13-6 | **PASS.** Separate cancel power, shared atomic logical cancellation plan, whole queued disposition, replay precedence, losing-Outcome identity/retry and whole rejection. Optional Driver request follows commit and is never awaited or treated as physical stop. Cancellation/losing suites and A02/A07–A11/A15/A21–A23. |
| K13-7 | **PASS.** Immutable optional creation deadline participates in canonical identity; absence preserves prior identity. Expiry uses the same cancellation builder and does not mint a wait timeout or new Activation. Execution-deadline suite and A16/A17/A24. |
| K13-8 | **PASS.** Injected clock only; usable readings are safe nonnegative integers; no ambient fallback. Exact clock census and deterministic/poison controls; appropriate three-path binding wording. Census is bounded syntax, not a universal static-analysis claim. |
| K13-9 | **PASS.** Complete declared 13-letter depth-4 enumeration at all eight seeds and two bounds rerun, with owned-outcome/model checks and post-state witness. Separate long witnesses and supplementary words retained. No guarantee outside that domain is inferred. |
| K13-C2-1 | **PASS.** Full successor terminal accounting plus exact commit application closes the original guarantee over complete/fail and shared explicit/deadline cancellation, including duplicate/overlap, queued values and appended timeout. |
| K13-C2-2 | **PASS.** Stored count/full historical ledger prevents coordinated reuse; all three registration modes and second/later generations checked. |
| K13-C2-3 | **PASS.** BASELINE, L-22, operations binding note, rewrite-index and code comments agree on registration-time expiry versus host-fired existing timers. |
| K13-C2-4 | **PASS.** Whole packet and existing corpus re-audited; corrections do not narrow the approved claims. Full P/T supersedes old local S-guard reasoning; post-fault limits stay explicit. |
| D01-CHK-01 | **PASS.** Correct-candidate sorting/truncation is equivalent on reachable histories; the replacement timeout-omission mutant is genuinely distinguished. Layer 3 explains why. |
| D01-CHK-02 | **PASS.** Model/oracle retains required payload, pending timer and stable-ID expectations and the explicit timeout exception; A05/A21 and review-01 extra oracle rerun reject corrupt projections. |
| D01-CHK-03 | **PASS.** A01..A24 have explicit maintained destinations; coverage below rechecks their distinctions rather than equating file presence with closure. |
| D01-CHK-04 | **PASS.** Terminal redelivery preserves established `no_unresolved_exchange` behavior; no unjustified refusal-precedence change. |
| D01-CHK-05 | **PASS.** Timer key names Execution/kind/generation; deadline is resolved from retained state. Malformed, stale, duplicate and immediate-expiry keys covered; no caller-supplied deadline becomes authority. |
| D01-CHK-06 | **PASS.** Owner choice 01's optional Execution-scoped Driver request is after commit, once per accepted cancellation, promptly returning undefined without return-value/thenable observation; throw/reentry contained. No native-stop claim. |
| D01-CHK-07 | **PASS.** Owner choice 01's Execution-deadline policy is fire-only; no incidental call secretly enforces it. Registration-time wait expiry is separately implemented/documented. |

The original adversary coverage remains required. These are **PASS within the named controls**, not a claim that A01..A24 enumerate every interaction:

| Attack | Distinction rechecked |
|---|---|
| A01 | Five separate selection cases and honest sort-union equivalence |
| A02 | Late delivered/failed/contradictory reports change only their own delivery evidence |
| A03 | A middle generation's stale fire after Event/timeout retirement while a later generation is live |
| A04 | Changing subscription class changes eligibility, independently of kind |
| A05 | Corrupted payload is rejected by the oracle control |
| A06 | Explicit longer S4 `e d q p p p` trace, beyond the depth-4 bound |
| A07 | Equal losing proposal retried after another losing proposal returns its retained refusal |
| A08 | Changed progress or emission changes losing-content identity |
| A09 | Accepted A1 replay/conflict retains precedence after a later A2 loses to cancellation |
| A10 | Four Outcome steps in both cancellation orders, reserved batch and outside backlog |
| A11 | Earlier acknowledgments survive cancellation; current work ends; input replay/conflict versus fresh terminal input |
| A12 | S0 `e d z`, bounds 1/2, absent/future/due deadline |
| A13 | Duplicate first-generation fire across reservation, continue, later registration, cancellation and immediate expiry |
| A14 | Mandatory timeout with bound 3, unmatched backlog and excess eligible arrivals |
| A15 | Clock/cancel-scope/Driver reentry including input, cancellation, Outcome and delivery |
| A16 | Explicit versus deadline cancellation compares complete governed results with the declared narrow cause/actor masks, including holds and timeout |
| A17 | Creation deadline identity, numeric validation and absent-field compatibility |
| A18 | D−1/D/D+1, throwing/NaN clock, no clock for earlier eligible/replay paths, one observation |
| A19 | 256/257 aggregate boundary, duplicates and combined wait-declaration fields |
| A20 | Category spoofing rejected; synthetic trusted AND/ANY eligibility controls remain distinct from shipped ingress |
| A21 | Independent timer/ID/retry-reference expectations and cancellation corruption controls |
| A22 | Terminal control behavior remains consistent with existing contracts |
| A23 | Cancel scopes, other producer, grantless submission, multiple Executions and malformed coordinates remain separate checks |
| A24 | Wait/Execution deadlines 10/25, 10/5 and 10/10, including both fire orders |

## Current claims, limits and handoff

007 correctly leaves H review-ready; the implementer has not self-certified acceptance. BASELINE's State owner section enumerates P/T and exact writes, excludes result/receipt/timeout-ID/cancellation-metadata semantics, distinguishes terminal operational traffic, and points to L-28. L-15 retains semantic plan selection, eligibility, waking Event, batch choice, IDs and refusal precedence; structural whole-batch accounting does not certify that the planner chose the right batch. L-28 describes absence of rollback and refused continued admission after damaged prefixes; the fault-oracle adjustment observes that behavior rather than weakening production full admission.

Layer-3 changes keep one owner per rule: creation owns the optional immutable deadline and retry content; operations keeps the three clocks distinct; waits owns selection and its reachable-order equivalence. Rewrite-index records the chosen binding representations with their owners; it is not an alternate permission to settle unrelated open choices. The clock OPEN marker remains. No changed Layer-3 prose silently claims persistence, native stop, isolation or a universal clock representation. Implementation status stays in the ledger/baseline rather than being introduced into the changed specification prose.

No in-scope obligation remains unexamined or DEFERRED. This acceptance does not discharge later roadmap work, L-15 semantic obligations, L-19 persistence, L-27 broader fault coverage, L-28 transactional recovery, V-ENV evidence holds, or the omitted verification profiles. It does not approve a different candidate, merge the branch, release K1.4, or certify physical cancellation.

The new probes are independently written review evidence. The mutation selector adapts this repository's review-02 selector only to pin H; production sources and historical probes are unchanged. No external third-party code/test/asset was copied or adapted, no dependency/service was added, and no external prior-art claim is used as proof.

**Acceptance identity for transcription:** K1.3 correction round 2, independent review 03, **ACCEPT at H `47c0b7f1c089260991649a6d814ad7db22b54a2f` over C `c7abff65ceca3e3b21fd64ffee12ea2f636f5cbc`, base B `22c8c1db9958049eb8693dd5aa4d7005f2d565db`**. Owner integration and discussion/release remain the next process steps. The prior stop-and-redesign requirement was satisfied by owner choice 04 and the reviewed design-03 implementation; no new correction brief is warranted.

ACCEPT
