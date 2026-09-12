# Independent review — K0.2, round 3

## Reviewer, date, identity

- **Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning.
- **Role:** independent reviewer. I did not implement C3/H3.
- **Review date:** 2026-09-11 (America/New_York).
- **Governing base:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Previously reviewed H2:** `60a05f822b9415382653e286be1189ec0a01e472` — round 2 `CHANGES REQUIRED`.
- **Round-2 review record:** `a057a122318eb39508542af4b4c5d53200115259` (`review-02.md`).
- **Corrected clean payload C3:** `acb5e01c80f015ebf715f4de3e7fdb10f05f1a33`.
- **Reviewed candidate H3:** `b9b54a84393dde11b45c2395fec04f6130a3b0b2`.
- **Branch reviewed:** `codex/k0.2-public-controls-e0-gate`.
- **Benchmark revision inspected read-only:** `98756f8c10bd806125da8318f1a129bc030aca61`.

This review is bound to H3 exactly. Any later reviewer-record commit is administrative provenance and is not part of H3's candidate.

## Access and validation limits

I reviewed through the authorized GitHub connector: exact refs/commits, cumulative source, the reviewer-record→C3 correction delta, C3→H3 administrative delta, governing K0.1 worksheet, K0.2 contract/specification/source/tests, and the pinned benchmark repository. I had no local repository checkout and did not independently rerun the implementer's repository commands.

GitHub exposes no status checks or workflow runs for C3 through the available connector. The report's `1193 pass / 0 fail`, `1084` conformance and other command results are therefore implementer-reported validation rather than reviewer-rerun evidence.

For K02-R2-02 I separately reproduced the checked-in C3 `snapshot`/`deepFreeze` algorithm in a standalone Node probe over nested JSON values containing own `"__proto__"` members. The values remained own data, retained ordinary prototypes, were recursively frozen, and resisted mutation. That is a language-level reproduction of the inspected source, not a repository test run.

## Identity and correction-delta verification

The round-3 history is clean and linear:

- `a057a122318eb39508542af4b4c5d53200115259` → C3 is one correction commit touching nine K0.2 contract/specification/conformance files.
- C3 → H3 is one administrative commit containing only `docs/development/007-work-packets.md` and `docs/development/work/K0.2/implementation-03.md`. No payload rides in H3.
- Repository `main` remains the governing base `c079237ee7aff428481426f93e87a68b79f170d4`.
- The prior review records remain historical provenance and are not rewritten by the correction.

I do **not** recommend reverting C3. Both round-2 fixes below are sound forward corrections. Reverting would restore known semantic and evidence-integrity defects. The open finding is in the inherited coverage/oracle model and should be corrected forward from C3.

## Round-2 finding dispositions

### K02-R2-01 — completion control over-constrained a permitted K1 refusal — **CLOSED**

C3 removes the invented completion-specific rejection-reason requirement. `control-completion-obligations` now accepts the ordinary EF-2 whole-envelope refusal answer and asserts the observable facts the protocol actually fixes: the completing Effect-proposing envelope is refused whole, no terminal state is reached, no progress or acknowledgment is committed, and the sink remains untouched.

The invalid `completion/rejected-for-the-wrong-reason` transcript is gone. Its replacement, `completion/refused-envelope-partly-committed`, is a genuine OA-3/OA-5 violation because it reports refusal while committing progress and acknowledgment.

I independently rechecked the governing worksheet: CX-3 says previously-owned obligations are trivial at K1 and become non-trivial at K2; EF-1/EF-2 require the K1 whole-envelope Effect refusal; §11 row 4 requires a recorded inspectable reason without imposing the withdrawn completion-specific reason. CX-6 is a real exception: the accepted worksheet explicitly fixes its cancellation/terminal-conflict classification and exact reason, so continuing to pin that one is justified.

The new `forbiddenBy` field is useful review provenance. I checked the retained counterexample citations against their named decisions and found no surviving instance of K02-R2-01's false “preference as protocol rule” pattern. The field cannot itself prove a citation true, which the implementation report also acknowledges.

### K02-R2-02 — ledger snapshot mishandled valid `"__proto__"` members — **CLOSED**

C3 changes member copying from assignment to `Object.defineProperty`, so `"__proto__"` remains an ordinary own data property rather than invoking the inherited legacy setter. Recursive freezing now walks own property descriptors via `Reflect.ownKeys`, so the copied value is reached and frozen.

The new regression cases cover top-level, nested and array-embedded `"__proto__"`, returned observations, caller-held mutation and neighboring Object-prototype-shadowing names. The standalone reproduction described above independently confirmed the corrected source semantics. C3 is a sound fix here; no revert is recommended.

## Round-3 finding

### K02-R3-01 — P1 — the “obligation-granular” coverage map is still not semantically atomic; K02-R1-01 is reopened

**Affected material:** `tests/conformance/k0/coverage.ts`, `coverage.test.ts`, `candidate.ts`, `scenarios.ts`, `fixture.ts`, `rule-agreement.test.ts`, the K0.2 contract/specification, and the C1/C6/C7/C9 claims built on complete boundary observability.

Round 1 found that mapping whole §11 rows was too coarse. C2/C3 improved the representation substantially, but the new unit is still sometimes a bundle of several independently observable canonical clauses while its required counterexample exercises only one. The accepted worksheet is explicit for row 5 that **each** listed sub-obligation is separately observable. 006 likewise requires a PASS trace that can distinguish a plausible wrong implementation; prose, a green helper test, or a counterexample to a neighboring property is insufficient.

I can construct multiple plausible wrong K1 candidates that violate the accepted worksheet while passing the current prepared oracle:

1. **R5-a does not cover W-1 structural validity as claimed.** The map reduces row 5(a) to “both lists empty is malformed, and a deadline does not rescue it.” The accepted row also requires every dependency alternative to satisfy the selector grammar, every supplied kind set to be non-empty, every subscription to be structurally valid, and a structurally valid but inert alternative to remain valid because K0 promises structure rather than satisfiability. `rule-agreement.test.ts` checks some of those rules against the fixture's own helper function, but no candidate scenario submits those distinguishing waits. A K1 candidate that accepts `{dependencies:[{}], subscriptions:[]}`, accepts an empty kind set, or rejects a valid inert alternative can therefore pass every scenario. A helper agreeing with the worksheet does not prove the future candidate port enforces the rule.

2. **B-8's no-second-readiness rule is written in prose but is not observable.** The accepted B-8/§11 row 6 rule says an Event accepted while `READY`, `RUNNING` or terminal with no live generation creates no readiness, specifically preventing a second readiness from arming behind the first and re-selecting a batch. The stale-timer scenario actually reaches the sharp state: after G2 times out, the Execution is already `READY`; a duplicate timer and then a later authenticated result arrive before reservation. Its `forbids` prose says “no second readiness,” but `Observation` has no readiness identity/count/marker and `runScenario` compares only `Observation` plus optional sink count. A candidate can retain exactly one timeout Event in `queued` (so the duplicate-timer counterexample does not fire), secretly arm a second readiness behind the first, satisfy every observation through the subsequent dispatch, and leave that phantom readiness for later re-selection after the scenario ends. R5-f2's counterexample only duplicates the timeout Event; R6-b's counterexample only queues terminal ingress. Neither distinguishes the B-8 failure.

3. **Rows 3/4 claim absence of Effect intent/ID/proposal-key binding without an observation that can see those facts.** R3-c says a failed envelope leaves no partial Effect intent, and R4-a says K1 Effect refusal occurs before any Effect intent, ID or proposal-key binding exists. The candidate-facing `Observation` contains no intent/ID/proposal-binding observation, while the independent operation ledger records physical attempts, not hidden Kernel intent creation. A candidate can create and retain an Effect intent or proposal-key binding, reject the envelope with the expected visible observation, make zero sink attempts, and pass the current oracle. The existing row-4 counterexamples catch silent envelope splitting and physical dispatch, not the hidden accepted-state mutation the canonical assertion explicitly forbids.

4. **R10-a's counterexample does not distinguish LP-1 freshness.** LP-1 says a policy check against a just-accepted local write reads that exact write with no staleness window. R10-a maps that to `control-cancel/losing-progress-installed-with-next-state-suppressed`. But that transcript still reports the correct cancellation rejection and terminal state while partially committing losing progress; it demonstrates CX-6/OA-3 atomicity, not a stale local read. A candidate whose local check actually reads stale pre-cancellation or pre-takeover state is not represented by that counterexample. Reusing a failing transcript from a neighboring rule does not establish the mapped obligation.

These examples are not a request for four isolated patches. They show the same root defect that K02-R1-01 identified: the claimed coverage unit is not yet small enough to correspond to independently distinguishable canonical assertions, and some assertions have no observation surface at all. The new `forbiddenBy` citations improve the truthfulness of existing counterexamples but cannot repair obligations for which no counterexample or observable exists.

**Required outcome:** reopen K02-R1-01 and reconstruct the §11 coverage model once more from the canonical worksheet, this time at the level of independently distinguishable assertions rather than prose groupings. For every retained obligation, demonstrate how a plausible candidate violating that exact assertion is observed and rejected. If an assertion cannot be observed through the current candidate/fixture surface, add the smallest independent observation needed or explicitly and correctly assign/defer it where the governing sources allow; do not count `forbids` prose or fixture-helper self-tests as candidate evidence. Reconcile the scenario corpus, counterexamples, coverage map, contract/specification and interaction tests together. Mutation-check representative cases so the repaired machinery is shown to reject the prior blind spots.

**Impact:** K0.2-C1 FAIL (the inherited K0 exit observability that C1–C6 carry is still incomplete), K0.2-C6 FAIL (the stale-timer control claims a no-second-readiness invariant the oracle cannot distinguish), K0.2-C7 FAIL (not every retained obligation has a semantically valid discriminating wrong candidate), and K0.2-C9 FAIL (coverage is still not actually obligation-atomic).

## Per-criterion verdicts

| Criterion | Verdict | Review basis |
|---|---|---|
| K0.2-C1 | **FAIL** | The positive 001 trace itself is coherent, but the contract also carries the inherited K0 boundary-observability obligation through C1–C6; K02-R3-01 shows that coverage remains incomplete. |
| K0.2-C2 | **PASS** | The explicit scheduled delay/non-blocking scenario remains coherent and distinguishes the W-4 `RUNNING`, not Kernel-`WAITING`, behavior. |
| K0.2-C3 | **PASS** | The retained-reference and `"__proto__"` ledger defects are corrected; independent evidence is now detached and faithful over the accepted E-1 key space inspected. |
| K0.2-C4 | **PASS** | The direct-baseline/shared-laboratory specification remains intact and was not weakened by C3. |
| K0.2-C5 | **PASS** | Both public application shapes and ownership/claim preparation remain specified without claiming E0 execution or acceptance. |
| K0.2-C6 | **FAIL** | The controls exist, but at least the B-8/no-second-readiness assertion in the stale-timer path is prose-only under the current observation surface. K02-R3-01. |
| K0.2-C7 | **FAIL** | Citation provenance is improved, but the oracle still cannot reject plausible violations of several mapped canonical assertions. K02-R3-01. |
| K0.2-C8 | **FAIL — BLOCKED_EXTERNAL** | Accepted pinned E0 evidence still does not exist at the inspected benchmark revision. |
| K0.2-C9 | **FAIL** | The map is finer than round 1, but several entries still combine assertions without exact discriminating evidence. K02-R3-01. |

## External E0 blocker

The benchmark repository's `main` still points exactly to `98756f8c10bd806125da8318f1a129bc030aca61`. Its roadmap still states that E0–E6 are planned, not implemented, and describes E0 as future ownership/claim/public-control work.

K0.2-C8 therefore remains `BLOCKED_EXTERNAL`: responsible actor is the benchmark repository owner; unblock requires an accepted E0 deliverable/evidence set at a pinned benchmark revision that this repository can record and an independent reviewer can inspect. Nothing here grants or infers E0 acceptance.

This is not an architecture-decision blocker. The correct overall review verdict remains `CHANGES REQUIRED`.

## Validation-evidence distinction

`implementation-03.md` reports C3 validation including typecheck, 1193 tests with zero failures, 1084 conformance tests, builder-doc checks and discrimination probes. I did not independently rerun those repository commands, and no GitHub status/workflow evidence for C3 is exposed through the available connector.

K02-R3-01 is a source/contract counterexample, not a claim that the reported suite failed. The problem is precisely that the current suite can be green while plausible protocol-violating candidates remain indistinguishable because the necessary assertion is absent from the candidate scenario or observation surface.

## Correction handoff and revert recommendation

**Fix forward from C3. Do not revert C3/H3 to C2/H2.** The round-2 completion and ledger fixes are correct and should be preserved.

Correct the same released K0.2 packet; do not start or release a successor. Reopen K02-R1-01 through K02-R3-01, reconstruct the §11 assertion inventory at truly discriminating granularity, and close the concrete blind spots above plus comparable ones found by the reconstruction. Preserve K02-R2-01 and K02-R2-02's corrections. Preserve C8 as `BLOCKED_EXTERNAL` until accepted pinned E0 evidence actually exists. Produce a newly validated clean payload and administrative candidate/report under 006/008/012. Do not self-accept, merge, close K0 or release K1.0.

## Final outcome

H3 `b9b54a84393dde11b45c2395fec04f6130a3b0b2` is not acceptable. Both round-2 findings are correctly fixed and should not be reverted, but the cumulative re-derivation shows that the core round-1 semantic-coverage defect is not fully closed: several canonical §11 assertions still lack an exact candidate-level observation/counterexample even though the coverage map counts them as covered. C8 also remains externally blocked.

**CHANGES REQUIRED**
