# Independent review — K0.2, round 7

## Reviewer, date, identity

- **Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning.
- **Role:** independent reviewer. I did not implement C7/H7.
- **Review date:** 2026-09-12 (America/New_York).
- **Governing base:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Previously reviewed H6:** `c9798894db6f8d844cf0abcc4365c1fa30ef71fe` — round 6 `CHANGES REQUIRED`.
- **Round-6 review record:** `3377a8c834a07c5170b2cfdd4b76269021341733` (`review-06.md`).
- **Corrected clean payload C7:** `e9c145023246cc61e8ad65405cc724dabb22c1b1`.
- **Reviewed candidate H7:** `a9ea3d532c25e9074b7ce11bc102196058a6a41d`.
- **Branch reviewed:** `codex/k0.2-public-controls-e0-gate`.
- **Benchmark revision inspected read-only:** `98756f8c10bd806125da8318f1a129bc030aca61`.

This review is bound to H7 exactly. The reviewer-record commit that contains this file is administrative provenance and is not part of H7.

## Access and validation limits

I reviewed through the authorized GitHub connector: exact refs/commits, reviewer-A6→C7 correction delta, C7→H7 administrative delta, the accepted K0.1 worksheet, C7 contract/specification, changed fixture/scenario/coverage/candidate/regression/interaction files, implementation report, and the benchmark repository.

I had no local checkout and did not independently rerun the implementer's commands. GitHub exposes no commit status checks or workflow runs for C7 through the available connector. The report's typecheck/test/conformance/SDK/architecture/builder-doc results are therefore implementer-reported validation rather than reviewer-rerun evidence.

## Identity and correction-delta verification

The round-7 history is clean and linear:

- `3377a8c834a07c5170b2cfdd4b76269021341733` → C7 is one correction commit touching exactly eight K0.2 contract/specification/conformance files.
- C7 → H7 is one administrative commit containing only `docs/development/007-work-packets.md` and `docs/development/work/K0.2/implementation-07.md`. No payload rides in H7.
- H7's direct parent is C7.
- Repository `main` remains `c079237ee7aff428481426f93e87a68b79f170d4`.
- Prior review records remain historical provenance.

I do **not** recommend reverting C7. Fix forward from C7.

## Round-6 finding disposition

### K02-R6-01 — `pendingTimers` conflated accepted deadline state with timer mechanism — **CLOSED**

C7 fixes the semantic-layer defect from round 6.

`Observation.acceptedDeadline: number | null` is now explicitly the accepted logical deadline fact committed with a live deadline-bearing wait, not a scheduler registration. Its documentation correctly permits a physical timer for a retired generation to survive and arrive later as a W-3 stale no-op. The stale-timer scenario exercises both forms: a stale G1 delivery while G2 remains live leaves G2's accepted deadline unchanged, and a re-delivered G2 timer after G2's logical retirement occurs with the accepted deadline already null.

The new regression also checks the intended distinction directly: logical retirement precedes a still-scheduled stale delivery, and the observation surface contains no timer/scheduler/registration key. This closes the over-constraint identified in review-06.

The R7-a6c cancellation transcript is also correctly redefined: it leaks only `acceptedDeadline: 5000` while `CANCELLED`, with the correct CX-6 rejection and null live generation. That is a forbidden accepted semantic fact, not physical timer retention.

## Round-7 finding

### K02-R7-01 — P1 — the new semantic deadline field is still only partially integrated into assertion-granular coverage

**Affected material:** `tests/conformance/k0/coverage.ts`, `candidate.ts`, `interactions.test.ts`, `scenarios.ts`, and the C7 C7/C9 coverage claims in `contract.md` / `public-fixture-specification.md`.

C7's `acceptedDeadline` field is the right observation, but the packet kept the inventory at **87 obligations / 81 violating transcripts** by renaming the old R7-a6c timer transcript rather than re-deriving all independently distinguishable obligations that the new semantic field makes observable.

The accepted worksheet's §11 row 5(c) says W-2 registration is one ordered transaction ending in exactly one of the wait-ended rows or a durable `WAITING`; W-2 step 4 persists `WAITING` with the live registration, generation **and deadline**. Row 5(d) separately requires eligible-wake and current-deadline retirement of the registration/generation. Because the accepted deadline is part of that accepted registration state, its presence and retirement are candidate-observable facts.

C7's scenarios do state those facts. For example, the subscription-only deadline control expects `WAITING`, `liveWaitGeneration: "gd1"`, and `acceptedDeadline: 1000`, and its prose says W-2 step 4 persists the deadline. The timer-expiry step then expects `acceptedDeadline` to return to the default `null`. Likewise the stale-timer control persists `acceptedDeadline: 2000` under live G2 and clears it when G2 retires.

But the violating-candidate corpus contains only three `acceptedDeadline` mutations:

1. `subscription-deadline/past-deadline-persisted-as-a-live-wait` — wrong W-2 ordering, which persists an already-due deadline and WAITING together;
2. `subscription-deadline/timeout-withheld-because-nothing-declared-it` — the deadline remains live because B-7 path B never runs; and
3. `control-cancel/losing-await-accepts-a-deadline` — the cancellation loser leaks an accepted deadline beside a correct rejection.

There is **no assertion-owned counterexample** for the opposite positive registration failure: a conformingly accepted future-deadline wait becomes `WAITING` with the correct live generation but accidentally drops/omits the accepted deadline fact. There is likewise no assertion-owned counterexample for retirement cleanup: a wait retires correctly to `READY`, with the generation/readiness/timeout behavior otherwise correct, but leaves the accepted deadline fact live.

Those are plausible single-field/single-writer failures. An implementation can get lifecycle/generation handling right while writing deadline state incorrectly. C7's own heuristic text recognizes `acceptedDeadline` as a separate field group for exactly this reason.

The complete structural observation would incidentally reject these transcripts if someone wrote them, and `interactions.test.ts` checks fixture self-consistency (`non-null` deadline implies a live wait). That does **not** satisfy C7/C9. The contract says explicitly that every assertion needs its own scenario-step counterexample, and that `forbids` prose or green helper/corpus checks do not substitute for candidate-level evidence.

This is therefore the same **visible-but-unattributed** failure mode round 4 corrected: the observation can see the defect, but the coverage inventory does not own it as an independently distinguishable assertion.

**Required outcome:** rederive the accepted-deadline lifecycle against §11 row 5(c)/(d), using the packet's existing independently-distinguishable-assertion rule. At minimum, add candidate-level evidence that fails specifically when:

- a valid future-deadline wait correctly persists `WAITING` / its live generation but fails to persist the accepted deadline value; and
- a deadline-bearing wait otherwise retires correctly but leaves the accepted deadline fact behind.

Do not solve this with `forbids` prose or only an `interactions.test.ts` invariant. Add/adjust `K0_OBLIGATIONS` entries and violating transcripts so the map owns the behavior explicitly. Re-check both retirement species already distinguished by row 5(d) (eligible wake and current-generation deadline expiry), plus the registration-time event/deadline paths, and split further wherever one plausible writer can get one accepted-deadline transition right and another wrong.

Preserve the round-7 semantic distinction: none of this may inspect or constrain physical timer registration/cancellation lifetime.

**Impact:**

- **K0.2-C6 PASS** — the controls now carry a truthful accepted-deadline observation and the round-6 timer-mechanism over-constraint is gone.
- **K0.2-C7 FAIL** — C7 requires at least one plausible-wrong transcript per obligation; the accepted-deadline lifecycle has observable obligations without owned violating transcripts.
- **K0.2-C9 FAIL** — the 87-entry map is not yet complete at the packet's own independently-distinguishable-assertion granularity.

## Per-criterion verdicts

| Criterion | Verdict | Review basis |
|---|---|---|
| K0.2-C1 | **PASS** | Deterministic K0 trace remains coherent. |
| K0.2-C2 | **PASS** | Delayed-Runtime / non-blocking scenario remains coherent. |
| K0.2-C3 | **PASS** | Independent ledger / retained-reference and key-space protections remain intact. |
| K0.2-C4 | **PASS** | Direct-baseline/shared-laboratory specification remains intact. |
| K0.2-C5 | **PASS** | Both public application shapes remain prepared without claiming external gate acceptance. |
| K0.2-C6 | **PASS** | `acceptedDeadline` is now semantic state; the losing-`await`, stale-delivery and W-8 deadline controls observe the right layer. |
| K0.2-C7 | **FAIL** | K02-R7-01: no plausible-wrong transcript owns the positive persistence / retirement lifecycle of the new accepted-deadline fact. |
| K0.2-C8 | **FAIL — BLOCKED_EXTERNAL** | Benchmark `main` remains `98756f8c10bd806125da8318f1a129bc030aca61`; `docs/roadmap.md` still says E0–E6 are planned, not implemented. |
| K0.2-C9 | **FAIL** | K02-R7-01: the assertion-granular inventory remains incomplete for accepted-deadline lifecycle transitions. |

## External blocker

C8 remains a genuine external blocker, not an architecture ambiguity and not a reason to stop reviewing independent local fixture work.

- **Responsible actor:** benchmark repository owner.
- **Pinned benchmark revision inspected:** `98756f8c10bd806125da8318f1a129bc030aca61`.
- **Current evidence:** benchmark `docs/roadmap.md` still states E0–E6 are planned and not implemented by that revision.
- **Unblock condition:** accepted E0 deliverable/evidence at a pinned benchmark revision, with artifact/config identities, raw observations, evaluator version and decision recordable here and inspectable independently.

## Verdict

**CHANGES REQUIRED**

This is not an architecture block. Do not revert C7. Fix forward from C7, preserving `acceptedDeadline` as semantic state, the W-3 stale-timer permissiveness, the per-family token namespaces, R3-b split, losing-`await` schedule, and the existing valid assertion splits.

Do not merge, close K0, or release K1.0. C8 remains `BLOCKED_EXTERNAL` even after the local C7/C9 defect is corrected.
