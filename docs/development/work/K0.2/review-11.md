# Independent review — K0.2, round 11

## Reviewer, date, identity

- **Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning.
- **Role:** independent reviewer. I did not implement C11/H11.
- **Review date:** 2026-09-12 (America/New_York).
- **Governing base:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Previously reviewed H10:** `54a0bda358960b049800d8856128eaea90fc6fd1` — round 10 `CHANGES REQUIRED`.
- **Round-10 review record:** `a0e034d6acd2e6c541dacb5848da41a0404bab86` (`review-10.md`).
- **Corrected clean payload C11:** `faac6a1813b7956a286cec3325c6391bfed579f0`.
- **Reviewed candidate H11:** `0bcea0c08943c355d53541b54f3def8c91b1a237`.
- **Branch reviewed:** `codex/k0.2-public-controls-e0-gate`.
- **Benchmark revision inspected read-only:** `98756f8c10bd806125da8318f1a129bc030aca61`.

This review is bound to H11 exactly. The reviewer-record commit containing this file is administrative provenance and is not part of H11.

## Access and validation limits

I reviewed through the authorized GitHub connector: exact refs/commits, A10→C11 correction delta, C11→H11 administrative delta, cumulative source reached by the correction, the governing 001/006/007/012 sources at the pinned base, the accepted K0.1 worksheet and canonical Kernel/execution protocol, C11 contract/specification, fixture command/observation and protocol vocabulary, scenarios, coverage/candidates/regressions, implementation-11, prior review findings and the benchmark repository.

I had no local checkout and did not independently rerun the implementer's commands. GitHub exposes no combined status checks and no pull-request workflow runs for C11 through the available connector. The report's typecheck/test/conformance/SDK/builder-doc results are therefore implementer-reported validation rather than reviewer-rerun evidence.

## Identity and correction-delta verification

The round-11 history is clean and linear:

- `a0e034d6acd2e6c541dacb5848da41a0404bab86` → C11 is one correction commit touching exactly ten K0.2 contract/specification/conformance files.
- C11 → H11 is one administrative commit containing only `docs/development/007-work-packets.md` and `docs/development/work/K0.2/implementation-11.md`. No payload rides in H11.
- H11's direct parent is C11.
- Repository `main` remains `c079237ee7aff428481426f93e87a68b79f170d4`.

I do **not** recommend reverting C11. Fix forward from C11.

## Prior finding dispositions

### K02-R9-01 — malformed-rejection deadline inertness — **CLOSED, unchanged**

R3-c4 remains intact and still isolates the accepted-deadline partial under a correct malformed-envelope rejection. The B-6 path-B `g3`/`res-3` correction, all six accepted-deadline lifecycle transcripts and the logical-deadline/physical-timer distinction remain intact.

### K02-R10-02 — row 2 / ID-3, ID-4 and ID-9 — **CLOSED**

C11 supplies the missing distinctions cleanly.

The identity scenario now accepts `in-2` after the original dispatch, which gives redelivery and takeover a concrete later mailbox fact they must not repin. `redeliver_dispatch` makes ID-9 case 1 representable; R2-d1/d2/d3 separately own same Activation ID, same writer epoch and same pinned input. R2-c3 separately owns takeover input immutability while R2-c1/c2 retain the ID/epoch halves. R2-c4's `shared` link to R10-a is honest: one stale authority read after takeover is exactly the observable ID-9 case-3 / LP-1 failure. The later accepted Outcome acknowledges only the original pinned batch, leaves `in-2` for the next exchange, and the next dispatch pins that retained input under a new Activation ID.

I found no new row-2 overconstraint in that correction. `writerEpoch` is explicitly a fixture-port ordinal for ID-4's permitted total order rather than a claim that every implementation must expose literal integers.

### K02-R10-01 — OA-5 whole-envelope rejection family — **NOT FULLY CLOSED**

R3-c5 (wait/lifecycle) and R3-c6 (next-state) are sound corrections. R3-c7 is not yet an honest single-fault readiness partial; see K02-R11-01.

### K02-R10-03 — producer scope and receipt surface — **NOT FULLY CLOSED**

C11 materially improves the surface: producer is now represented on create/retry, the raw-key-global bug is caught, opaque receipt spelling remains relational, and later Effect/settlement/composition receipt boundaries are explicitly assigned. But the producer component of ID-2 is still not independently discriminated at an input boundary; see K02-R11-02.

## Round-11 findings

### K02-R11-01 — P1 — R3-c7's readiness-only transcript requires a second readiness bug, so it does not isolate OA-5

**Affected material:** `tests/conformance/k0/scenarios.ts` (`control-whole-envelope-validation`, `validWaitInMalformedEnvelope`), `candidate.ts` (`envelope/valid-wait-in-malformed-envelope-arms-readiness`), R3-c7 in `coverage.ts`, round-10 regression guards, contract/specification C7/C9 claims.

Review-10 required the remaining OA-5 readiness partial to be distinguished honestly and explicitly said to add the smallest sharper schedule if the existing corpus could not do so.

C11's new step submits a structurally valid subscription-only wait `g-good` inside an envelope malformed for an unrelated duplicate-emission key. That is a good outer-rejection shape. But the schedule contains **no Event eligible under `g-good` and no deadline**. If the wait were accepted and W-2 executed correctly, it would persist `WAITING`; it would not end, and B-8 would create no wait-ended readiness.

The violating transcript nevertheless changes only `waitEndedReadiness`, arming Event-triggered readiness for `g-good` while correctly keeping `RUNNING`, no live wait, no deadline and the malformed rejection. A writer merely running before whole-envelope validation cannot produce that observation while otherwise following W-2/B-6/B-8: it must additionally invent readiness for a wait that has not ended. That is a second semantic defect, not the isolated OA-5 partial the entry claims to model.

This matters under the packet's own C9 evidence rule. A counterexample must represent a plausible candidate breaking **this** assertion; a neighbouring-rule failure cannot substitute for the missing discrimination. The earlier readiness reviews are why `waitEndedReadiness` is deliberately ungrouped in the first place.

**Required outcome:** keep R3-c5 and R3-c6. Replace R3-c7's schedule/evidence with the smallest case where, if the Outcome were accepted, correct wait processing would actually create wait-ended readiness — while an independent malformed-envelope error still requires the whole Outcome to be rejected. One clean shape is an already-accepted, unacknowledged Event eligible under the otherwise-valid proposed wait, outside the current reserved batch, plus the unrelated duplicate-emission error. Under conforming OA-5 the rejection leaves no readiness; the violating transcript should preserve the correct `malformed_envelope` rejection, `RUNNING`, pinned Activation/batch, no committed wait/deadline/progress/emissions/acknowledgment, and change **only** `waitEndedReadiness` to the readiness that premature W-2/B-6 path-A evaluation would have produced.

Do not use CX-6, and do not repair this by bundling readiness with lifecycle/deadline.

**Impact:** C7 FAIL, C9 FAIL.

### K02-R11-02 — P1 — the producer component of ID-2 is still not independently exercised

**Affected material:** `fixture.ts` create/input command surface, `protocol-vocabulary.ts` `FixtureEvent`, `identity-producer-scope` in `scenarios.ts`, R1-c1/c2 in `coverage.ts`, the two `identity-producer/global-dedup-*` transcripts, receipt/identity claims in contract/specification.

ID-2 defines input identity as the triple **producer namespace + destination Execution ID + producer request key**. C11's new producer scenario changes two components at once:

- `prod-a`, destination `exec-pa`, key `req-shared`; then
- `prod-b`, destination `exec-pb`, key `req-shared`.

That correctly catches the very broad bug C11 models — an index keyed on the raw request-key text alone. It does **not** catch a narrower and entirely plausible wrong implementation keyed on `(destination, requestKey)` while omitting the producer namespace. Because the destinations differ, that implementation accepts both C11 creates correctly and passes R1-c1/c2 despite violating ID-2.

The sharper case belongs to subsequent input ingress, where two authenticated producers can address the **same destination** using the same raw producer request-key text and must remain distinct identities. C11 cannot express that case: `accept_event` carries only a `FixtureEvent`, and `FixtureEvent` has destination/Event ID/category/correlation/subscription data but no producer namespace or producer request key. The new producer field exists only on create/create_retry.

Thus K02-R10-03's missing input surface is only partly repaired. The correction demonstrates “raw key is not globally unique”, but it does not independently demonstrate “producer namespace is part of the ID-2 key”. C9's independently-distinguishable-assertion rule requires the latter because a candidate can get destination scoping right and producer scoping wrong.

**Required outcome:** preserve the create producer case, but add the smallest truthful application-input ingress representation for ID-2. Exercise two different authenticated producers sending to the **same Execution** with the same raw producer request-key text and distinct content/fixture Event identities; both must be accepted as distinct inputs in acceptance order. Add a plausible wrong candidate that keys input deduplication on `(destination, requestKey)` and therefore collapses/refuses/drops the second producer's input while otherwise behaving correctly. Also prove same-producer/same-destination/same-key exact replay is stable and same identity with conflicting content is a conflict if that behavior is part of the chosen ingress command's accepted identity surface.

Keep opaque receipt serialization implementation-owned. Use the boundary's accepted receipt/acceptance position representation the worksheet permits; do not invent a new wire receipt merely to satisfy the fixture.

**Impact:** C7 FAIL, C9 FAIL.

### K02-R11-03 — P3 — two round-11 self-descriptions are stale

**Affected material:** `tests/conformance/k0/scenarios.ts` file header; `docs/development/work/K0.2/contract.md` revision-history lead sentence.

The scenario file still opens with “Twelve scenarios” and “Six of the twelve” although C11 now exports 13 scenarios and the report/specification/counts correctly say 13. Separately, the contract is marked revision 11 but says “Revision 10 corrected revision 9 after round-10 review”; the round-10 findings were corrected by **revision 11 over revision 10**. The immutable commit history itself is clear, so this is documentation/provenance drift rather than a semantic ambiguity.

**Required outcome:** correct those two live self-descriptions forward while preserving historical review/report text unchanged.

**Impact:** no additional criterion failure beyond the semantic findings; fix with the next correction.

## Additional cumulative audit notes

I rechecked the new row-2 redelivery/takeover paths, row-8 completion assignment, the accepted-deadline lifecycle, the per-family token normalization and the later-boundary receipt assignments. I found no reason to reopen K02-R10-02, K02-R8-01, K02-R9-01 or the timer-mechanism correction.

C11's receipt model is acceptable as a **fixture observation model** only to the extent that it uses the worksheet's “receipt / acceptance position” abstraction: opaque receipt spellings for create/Outcome, per-Execution accepted input order for input ingress, and the Activation exchange identity for dispatch. This review does not require every semantic boundary to mint a separate opaque string; ID-6 leaves opaque token versus structured tuple implementation-owned. The unresolved problem is the missing producer dimension on subsequent input identity, not the spelling of its acceptance evidence.

I also rechecked the decisions cited by rows 1–3 rather than mechanically creating an obligation for every sentence in ID-1 or OA-1–OA-6. The packet's §11 map defines the K0.2 observable assertions; cited decisions constrain their meaning. This review therefore does not broaden K0.2 into authentication/authorization testing or OA-6 recovery-policy implementation that the row does not itself assert.

## Per-criterion verdicts

| Criterion | Verdict | Review basis |
|---|---|---|
| K0.2-C1 | **PASS** | The deterministic K0 trace remains coherent. |
| K0.2-C2 | **PASS** | Delayed-Runtime/non-blocking scenario remains coherent. |
| K0.2-C3 | **PASS** | Independent operation ledger protections remain intact. |
| K0.2-C4 | **PASS** | Direct-baseline/shared-laboratory specification remains intact. |
| K0.2-C5 | **PASS** | Both public application shapes remain prepared without claiming E0 acceptance. |
| K0.2-C6 | **PASS** | Named unsafe/state-loss controls remain semantically correct; the new defects are assertion-discrimination/input-scope issues outside those controls. |
| K0.2-C7 | **FAIL** | K02-R11-01/-02: one new counterexample is not an isolated plausible OA-5 partial, and producer-scoped input identity remains under-represented. |
| K0.2-C8 | **FAIL — BLOCKED_EXTERNAL** | Benchmark `main` remains `98756f8c10bd806125da8318f1a129bc030aca61`; its roadmap still says E0–E6 are planned, not implemented. |
| K0.2-C9 | **FAIL** | K02-R11-01/-02: the assertion-granular map still does not discriminate two accepted decision-level facts honestly. |

## External blocker

C8 remains a genuine external blocker, not an architecture ambiguity and not a reason to stop reviewing independent local fixture work.

- **Responsible actor:** benchmark repository owner.
- **Unavailable input:** accepted E0 fixture/config identities, raw observations, evaluator version and actual E0 decision at a pinned benchmark revision.
- **Unblock condition:** an accepted E0 deliverable/evidence record at a pinned benchmark revision, recordable in this repository and independently inspectable.

Arrokothi `main` remains `c079237ee7aff428481426f93e87a68b79f170d4`. Benchmark `main` remains `98756f8c10bd806125da8318f1a129bc030aca61`, whose `docs/roadmap.md` still states that E0–E6 are planned rather than implemented. No E0 acceptance is claimed or inferred. K0 remains open and K1.0 remains unreleased.

## Validation evidence

The implementation report records clean-C11 validation: typecheck exit 0; `npm test` 1501/1501 across 261 suites; conformance 1392; SDK 22; builder-docs 26 files / 280 links / 38 imports; 536 K0 tests across 50 suites; architecture guards passing; `git diff --check` clean. It also records H11 typecheck/builder-doc/coverage rechecks. I inspected those claims but did **not** rerun them. The GitHub connector exposes neither combined statuses nor pull-request workflow runs for C11.

## Verdict

**CHANGES REQUIRED**

K02-R10-02 is closed. K02-R10-01 and K02-R10-03 are not fully closed; their residuals are tracked as K02-R11-01 and K02-R11-02. Fix forward from C11; do not revert C11/H11.

Preserve all sound C11 work: `redeliver_dispatch`; late-`in-2` takeover/redelivery discrimination; R2-c3/d1/d2/d3/c4; R3-c5/c6; the producer field and cross-producer create case; receipt-family normalization/assignments; R3-c4; the `g3`/`res-3` B-6 path-B correction; all accepted-deadline lifecycle transcripts; prior assertion splits; and the semantic-deadline/physical-timer distinction.

Correct the readiness schedule so R3-c7 is a genuine single-fault OA-5 partial, and finish ID-2 at subsequent application-input ingress with producer independently varied while destination and raw key stay fixed. Re-run the dependent row/receipt/interaction sweep after changing that input surface. Correct the two stale live self-descriptions, reconcile counts, validate a new clean payload, and produce the next administrative candidate/report.

Keep C8 `BLOCKED_EXTERNAL`. Do not self-accept, merge, close K0, or release K1.0.

## Corrective prompt supplied with this review

Fetch the latest `codex/k0.2-public-controls-e0-gate` and read `docs/development/work/K0.2/review-11.md` at the reviewer commit containing this file.

**Fix forward from C11. Do not revert C11/H11.**

Preserve the sound round-11 corrections, especially `redeliver_dispatch`, the late-`in-2` redelivery/takeover schedule, R2-c3/d1/d2/d3/c4, R3-c5/c6, the producer field and cross-producer create case, the receipt-family normalization/assignments, R3-c4, `g3`/`res-3`, all accepted-deadline lifecycle transcripts and the logical-deadline/physical-timer distinction.

Address `K02-R11-01`: replace R3-c7's readiness evidence with a schedule where correct wait processing **would actually create readiness if the Outcome were accepted**, while an independent malformed-envelope condition still requires rejection. The cleanest shape is an already-accepted eligible Event outside the current reserved batch plus an otherwise-valid proposed wait and an unrelated duplicate-emission error. The conforming result is the correct `malformed_envelope` rejection with no accepted mutation. The violating transcript must change only `waitEndedReadiness`, representing premature W-2/B-6 path-A readiness commit before the outer validation refusal. Do not borrow CX-6 or bundle readiness with lifecycle/deadline.

Address `K02-R11-02`: finish ID-2 on application-input ingress. Represent producer namespace and producer request key on the actual ingress command/event boundary sufficiently to schedule two different producers sending to the **same destination Execution** with the same raw key text. Both must remain distinct accepted inputs. Add a plausible wrong candidate keyed on `(destination, requestKey)` that omits producer scope and therefore collapses the second input. Preserve/establish exact same-producer replay and same-identity conflict behavior as applicable to the chosen ingress identity surface. Keep acceptance evidence relational/semantic and do not invent opaque receipt spelling.

After changing input ingress, re-run the assertion-granular and interaction sweep across rows 1, 5, 6 and any receipt/terminal paths that consume accepted application input. Do not assume existing input schedules remain sufficient merely because they still compile.

Also correct the two P3 live-document drifts: `scenarios.ts` must say 13 scenarios, and contract revision 11 must say revision 11 corrected revision 10 after round-10 review. Do not edit immutable historical reports/reviews.

Reconcile obligation/transcript/scenario/step counts, contract/specification claims and finding dispositions. Validate a new clean payload and produce the next administrative candidate/report.

Keep C8 `BLOCKED_EXTERNAL`. Do not self-accept, merge, close K0, or release K1.0.
