# Independent review — K0.2, round 13

## Reviewer, trigger and reviewed identity

- **Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning.
- **Role:** accountable independent reviewer. I did not implement C12/H12.
- **Review date:** 2026-09-12 (America/New_York).
- **Governing base:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Clean payload C12:** `05855f446e52e542e3e6fd52f58d7cfaa105253a`.
- **Reviewed candidate H12:** `e7684a6905a8e406562a159b68f622a5bb528e24`.
- **Prior reviewer record A12:** `5b72d6d0ca420d3f58755dff8f4cb5d37fae2444` (`review-12.md`).
- **Branch:** `codex/k0.2-public-controls-e0-gate`.

This is a fresh accountable review of the same H12, triggered by two owner-provided supplementary independent audits produced outside the repository. Those audits are advisory evidence, not votes and not repository authority. I independently checked each material claim against the pinned K0.1 worksheet, K0.2 contract and C12 source before adopting, narrowing or rejecting it.

Round 12 remains an authentic historical review of H12 at the time it was written. This record supersedes only its current per-criterion conclusions where new evidence now demonstrates a defect.

## Access and review limits

I used the authorized GitHub connector to inspect the exact governing K0.1 worksheet, C12/H12 source, K0.2 contract, scenarios, coverage map, candidate transcripts, fixture comparison rules, current branch head and current benchmark refs/evidence. I had no local shell in this review and did not rerun the supplementary reviewers' commands. Where their reports described local probes, I treated those descriptions as leads only and verified the underlying source-level counterexample myself.

The branch still pointed to A12 before this record was written; C12/H12 payload has not changed since round 12.

## Reconciliation of the supplementary audits

The first supplementary audit correctly surfaced a blocking writer-epoch over-constraint. The second correctly surfaced a blocking assertion-ownership/discrimination defect in R5-c2, but overstated one part of its explanation: C12 *does* contain an accepted-path subscription-only wait with an empty dependency list and already-accepted eligible application input in `identity-producer-scope`. The defect is therefore not absence of the behavior from the corpus; it is that C9's declared R5-c2 owner and violating transcript do not discriminate the independently violable empty-dependency shortcut.

Other supplementary observations were either P3/documentation matters or outside the released K0.2 obligation. They are dispositioned below rather than silently inherited.

## Findings

### K02-R13-01 — P1 — `writerEpoch` over-constrains ID-4 across new Activation IDs

**Affected criteria:** C7 and C9.

The accepted K0.1 worksheet's ID-4 fixes epoch behavior for one unresolved exchange: ordinary redelivery keeps the epoch, an authenticated takeover advances it, and a stale epoch for the current exchange is rejected. It explicitly leaves implementation-owned whether the epoch counter **resets or continues across a later, genuinely new Activation ID**.

C12 nevertheless compares `writerEpoch` literally rather than relationally. Its runner documents that decision and claims every assertion is only about advancement/supersession. The corpus disproves that claim:

- `k0-trace` dispatches a later semantic Activation `act-2` with `writerEpoch: 2`, then submits its completing Outcome at epoch 2.
- `identity-create-and-activation` likewise continues from the taken-over exchange's epoch 2 to a later `act-2` at epoch 3.
- C12's new `identity-producer-scope`, however, dispatches the later semantic Activation `act-pa-2` with `writerEpoch: 1` and submits its completing Outcome at epoch 1.

There is no takeover between the earlier and later semantic Activations in either shape. A conforming implementation that consistently resets the epoch on each new Activation is rejected by the first family; a conforming implementation that consistently continues the counter is rejected by `identity-producer-scope`. This is not merely a spelling mismatch: the schedules also place the pinned epoch in submitted Outcomes, so the wrong fixture policy can turn the later submission into a stale-writer rejection and make the expected trace unreachable.

C7(b) forbids pinning a representation/value policy the protocol leaves open. C9 says over-constraint that rejects conforming work is the worse coverage failure. Both therefore FAIL.

**Required outcome:** make the fixture's epoch observation/submission convention faithful to ID-4 without choosing between the permitted reset/continue policies. Re-audit every scenario, submitted Outcome, expected observation, normalization/adaptation rule, interaction check and prose claim that carries `writerEpoch`; add distinguishing evidence that the corrected oracle accepts the protocol-permitted policy choices while still rejecting ordinary-redelivery and takeover/stale-writer violations. Do not solve this by weakening ID-4 or by declaring one implementation-owned policy normative inside K0.2.

### K02-R13-02 — P1 — R5-c2's empty-dependency W-2 clause is defended by the wrong schedule

**Affected criterion:** C9.

W-8 case 1 requires W-2 step 2's mailbox check to run for a subscription-only wait whose dependency list is empty; there is no `dependencies.length === 0` shortcut. C12's coverage entry R5-c2 states both that step 2 runs and that it is **not skipped for an empty dependency list**.

Its declared evidence does not test the second clause. R5-c2 points at `control-stale-timer-and-lost-wake` step 3 and transcript `control-stale-timer/lost-wake-on-empty-dependency-list`, but that scenario's `waitOnCorr1` has a non-empty dependency alternative for `effect.result/corr-1`. The transcript therefore discriminates a candidate that skips W-2 step 2 generally, not a candidate that runs step 2 for dependency waits while incorrectly skipping it only when `dependencies` is empty.

C12 does contain the missing semantic situation elsewhere: `identity-producer-scope` accepts two eligible `continue` application inputs while the Execution is RUNNING, then submits `producerIngressWait` with `dependencies: []` and a `continue` subscription; its expected observation is immediate B-6 path-A readiness. So the supplementary claim that the whole corpus lacks an accepted-path schedule was too broad.

That incidental scenario does **not** close C9 as written. C9 requires each independently distinguishable assertion to resolve to its own scenario/step/counterexample (or a declared shared/assigned owner), and explicitly says a neighbouring counterexample or mere prose is not assertion-level evidence. No current violating transcript owns the `empty dependencies only` shortcut at the `identity-producer-scope` registration step, while R5-c2's declared transcript exercises a different shape.

**Required outcome:** give the empty-dependency shortcut its truthful assertion-level owner and a plausible broken candidate that changes only the behavior needed to distinguish `step 2 runs normally` from `step 2 is skipped only because the dependency list is empty`. Existing C12 schedule material may be reused if it genuinely supplies the required preconditions. Re-run C9's ownership/atomicity checks and add a regression that verifies the owned schedule actually has an empty dependency list plus an already-accepted eligible Event. Because this is another defect in the repeatedly corrected coverage subsystem, apply 012 semantic-correction closure across the decision-level map rather than patching only the named entry.

## Non-blocking reconciliation notes

- **K02-R12-01 remains P3.** The stale introductory prose in `007-work-packets.md` is still non-authoritative wording drift. Correct it opportunistically with the next required payload/evidence update; do not create a candidate only for it.
- The supplementary count/prose observations are valid P3 cleanups: `public-fixture-specification.md` still says “one hundred and four violating transcripts” although C12 has 108, and its sentence saying every failure names an observation field overstates the deliberate ledger-only transcript whose discrimination is the independent ledger label rather than a changed observation field. Correct both opportunistically with the local correction.
- The supplementary C2 note about lacking a dedicated synthesized “second Execution never dispatches” transcript is **not a blocking defect**. C2's deterministic scenario itself observes Y's dispatch and a real candidate failing to dispatch it fails structurally; C9 does not require every top-level criterion to have a separate synthetic transcript outside its assertion map.
- The operation-sink observation about already-frozen exotic non-E-1 objects is outside C3's accepted E-1 plain-data scope and is not a K0.2 defect.
- A supplementary audit also raised decision-clause inventory questions such as ID-1 deletion/GC. I do not promote those to a blocking finding on this record because deletion/GC is not an observable K0.2 boundary in the released contract. However, because R13-02 reopens C9's coverage subsystem, the correction self-review must explicitly re-audit cited-decision clauses and record why any unowned clause is outside K0.2 or assigned elsewhere; do not silently add or silently omit obligations.

## C8 current external state

C8 still fails as an external gate, although the benchmark work has progressed since round 12.

Benchmark `main` remains `98756f8c10bd806125da8318f1a129bc030aca61`. A separate branch `e0-claims-ownership-and-public-controls` now exists at `5f921f9b415407fe3bdff43a545878437ac31a93`. Its `fixtures/e0/evidence-record.json` reports a deterministic mechanical gate `PASS`, fixture/config/evaluator identities and reproducible observations, but explicitly records `ownerDecision.state: "pending"` and says the mechanical result does not supply, imply or self-grant E0 acceptance.

That branch is therefore useful in-progress evidence, not the accepted E0 decision C8 requires. Until the benchmark owner accepts an exact E0 revision and that decision is independently inspectable, C8 remains `BLOCKED_EXTERNAL`.

## Per-criterion verdicts

| Criterion | Verdict | Round-13 basis |
|---|---|---|
| K0.2-C1 | **PASS** | The K0 functional trace remains present and discriminating for its stated trace semantics; R13-01 is booked against the oracle's implementation-neutrality requirement rather than duplicating it here. |
| K0.2-C2 | **PASS** | Delayed Runtime/non-blocking second Execution evidence remains sound. |
| K0.2-C3 | **PASS** | Independent sink/ledger evidence remains sound for the accepted E-1 domain. |
| K0.2-C4 | **PASS** | Direct-baseline/shared-laboratory specification remains sound. |
| K0.2-C5 | **PASS** | Both public application shapes remain prepared without claiming E0 acceptance. |
| K0.2-C6 | **PASS** | Unsafe/state-loss controls remain substantively sound; epoch over-constraint is an oracle-policy defect under C7/C9. |
| K0.2-C7 | **FAIL** | K02-R13-01: the oracle pins an implementation-owned reset/continue choice for `writerEpoch`. |
| K0.2-C8 | **FAIL — BLOCKED_EXTERNAL** | Benchmark E0 branch exists, but the owner decision is explicitly pending and `main` remains at the pre-E0 revision. |
| K0.2-C9 | **FAIL** | K02-R13-01 over-constrains a permitted implementation choice; K02-R13-02 gives one independently violable W-8 clause a counterexample whose schedule does not exercise that clause. |

## Correction direction

**Fix forward. Do not revert C12/H12.** The two P1 findings are local and bounded, and the prior round-11 corrections remain useful. Correction needs no architecture decision and no renewed release.

Work on the local correction may proceed while benchmark E0 acceptance is pending. Do not treat the current E0 branch's mechanical PASS as C8 acceptance. If the benchmark owner accepts E0 before the corrected K0.2 handoff is frozen, the eventual minimum candidate may bind that accepted evidence in the same reviewable payload; otherwise keep C8 explicitly blocked and do not manufacture acceptance to avoid another round.

The next correction must reconstruct the affected oracle/coverage subsystem under 012 because another defect has now been found after repeated semantic corrections. In particular, inspect all `writerEpoch` producers/consumers/submissions and all W-2/R5-c2 assertion ownership, then re-run dependent interactions and the full applicable validation before handoff.

## Verdict

**CHANGES REQUIRED**

H12 now has two verified local P1 defects in addition to the still-open external C8 gate. Round 12's C7/C9 PASS conclusions are reopened by new evidence; its other closed findings remain historical dispositions unless the correction's dependent re-audit uncovers a concrete reason to reopen them.

Do not self-accept, merge K0.2, close K0 or release K1.0. The next accountable review will be round 14 against the next submitted corrected candidate; the two supplementary advisory reports themselves consume no review number.