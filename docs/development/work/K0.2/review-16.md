# K0.2 independent review — round 16

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-12  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted H15:

- governing base: `c079237ee7aff428481426f93e87a68b79f170d4`;
- previous reviewer record A15: `8dce735fab6012fb562cfe2d73787a74de2c9d17`;
- clean payload C15: `839f1619bc9a628c55a9c60eeef01992727cc613`;
- submitted handoff H15: `31b9b5fbcf60f9cee5627d82773435663ebd1141`.

I inspected exact repository source, commits, reports and immutable logs through the GitHub connector. I did not have a local executable checkout and did not independently rerun the validation commands. I independently inspected the benchmark E0 acceptance chain and its pinned evidence rather than relying only on H15's report.

A15→C15 is exactly one payload commit. C15→H15 is exactly one administrative/evidence commit containing only the K0.2 ledger row, `implementation-15.md`, six clean-C15 validation logs and two read-only benchmark-evidence logs. I found no C/H allowlist violation.

## Review method

Round 15 required two corrections: isolate selector counterexamples from W-3/B-8, and apply the independently-distinguishable-assertion split test across the complete cited-decision inventory. I therefore checked the correction delta and cumulative dependent surface rather than treating the new audit, hashes or green tests as semantic proof.

I inspected the corrected selector candidates and isolation tests, the 51-decision independence audit, authored clause refinements, the cited-decision inventory, representative assignments and corpus owners, the governing K0.1 worksheet's wait-ended batch rules, the new/retained scenarios and counterexamples, H15 validation outputs, and the external E0 source/review/integration chain.

## Round-15 finding dispositions

### K02-R15-01 — CLOSED

The three selector-level counterexamples now take coherent state-machine branches for the candidate's mistaken eligibility decision:

- ignoring exact Event identity produces the normal eligible-event result: `READY`, no live generation, Event readiness;
- checking only the first kind-set member produces the normal ineligible result: `WAITING`, live generation, no readiness;
- the second-alternative ANY-OF case is held to the same isolation rule.

`selector-isolation.test.ts` independently checks W-3's live-generation equivalence, B-8 readiness/lifecycle consistency, retirement provenance, and that only the lifecycle/readiness coordinates move. It also proves the two old C14 contaminated constructions fail that independent coherence check. This closes the Round-15 selector finding without weakening W-1, W-3 or B-8.

### K02-R15-02 — NOT CLOSED

C15 materially improves the full reconstruction. The two examples named in Round 15 are correctly split: B-1 accepted-Event membership is separate from the positive dispatch bound, and W-9's timeout identity/destination/class/generation coordinates have separate owners. The audit also performs many further justified splits with explicit failure models.

However, one independently violable B-2 grouping remains and leaves C9 incomplete, as described below. Because Round 15 required the split test over the **complete** inventory, this is a residual of K02-R15-02 rather than a new unrelated subsystem.

## Finding

### K02-R16-01 — P1 — B-2 wait-ended batch selection still combines independently violable membership/mandatory rules

The accepted K0.1 B-2 decision fixes more than "old ineligible backlog cannot take the mandatory slot."

For a wait-ended batch it states that:

1. **ineligible backlog is never a candidate at any bound**;
2. for B-6, truncation retains the species' mandatory member and at bound 1 the B-6 batch is the **earliest-accepted eligible Event**;
3. after the mandatory member, only eligible Events fill remaining slots, while presentation remains in per-Execution acceptance order.

C15's explicit source inventory still combines two of those facts in `B-2.2`:

> Event-triggered readiness excludes ineligible backlog and reserves at least the earliest eligible member.

That combined clause maps to `R5-e1`. But `R5-e1` is narrower: it says older ineligible backlog cannot **displace what the Execution was woken for**, and its counterexample is `k0-trace/backlog-displaces-the-wake` at a bound-1 schedule with only one eligible wake Event.

That transcript cannot distinguish at least two plausible implementation defects:

- **wrong eligible mandatory member:** with two eligible Events available at reservation, choose the later accepted eligible Event at bound 1. No ineligible Event is selected, W-3/B-8 stay coherent, and a one-member batch has no presentation-order difference for `R5-j3b` to catch. The implementation gets exclusion right and the B-6 earliest-eligible mandatory rule wrong.
- **ineligible extra member:** retain the correct mandatory member, then admit ineligible backlog into remaining capacity. Nothing displaces the mandatory member. The implementation gets the mandatory rule right and the "ineligible backlog is never a candidate at any bound" rule wrong. `R5-j3` can catch some instances where an ineligible Event replaces an eligible Event, but that is not the same assertion: the defect also exists when spare capacity remains or no further eligible member exists.

The same exclusion issue exists for the B-7 species: `R5-e2` proves that backlog cannot take the timeout's bound-1 slot, but does not by itself prove that ineligible backlog cannot be appended after the mandatory timeout when capacity remains.

This is exactly C9's split test: one implementation can satisfy one clause while violating the other. A shared source paragraph, common selector routine or common owner cannot make those facts one observable assertion.

**Required correction:** finish the B-2 decomposition. Give the B-6 earliest-eligible mandatory rule its own truthful assertion-level discriminator, and give wait-ended ineligible-backlog exclusion evidence that still fails when the mandatory member is preserved and capacity remains. Cover both B-6/B-7 entry species separately unless one candidate-level construction genuinely demonstrates the same genus-level selector defect across both without assuming shared implementation code. Preserve the separate presentation-order, fill-eligible, bound and nonempty owners already added. Re-audit the directly dependent B-2/B-4 references after the split, but do not manufacture new protocol concepts.

## C8 external gate — PASS

C8 is no longer `BLOCKED_EXTERNAL`.

I independently verified the benchmark chain:

- E0 payload C `516e77ff2f3cd93eb407990040259a7524802372`;
- accepted E0 H `26d274fad53b2aa4fc2c7f596cae52e072cd24b5`;
- independent review A `ac1445fb8144ffab8a9153b243d4b9237d1927b0`, whose `review-04.md` ends `ACCEPT` and explicitly accepts that H;
- owner integration receipt `9b816d47e83ff210fa32400aa91994f8055138d5`, which separately records **"Owner decision: ACCEPT E0 and integrate the independently accepted H"**;
- current benchmark main `4d83c245c8f6bb0886c1035ec1c6bba3f91f0ddd` descends A, so the accepted E0 lineage is integrated.

Pinned H supplies the external evidence C8 requires:

- fixture `e0-public-controls/4`, protocol `e0-public-controls-v1`, fixture-set SHA-256;
- `e0-observation-policy-v1` configuration/observation-policy identity;
- `e0-private-corpus-v1` freshness reference identity;
- evaluator `e0-gate-v1` and freshness check `e0-freshness-v3`;
- declared raw observation material/reproduction commands plus the committed round-4 raw-output manifest and immutable validation attachments;
- mechanical gate PASS, kept distinct from the later independent ACCEPT and owner decision.

The accepted H's historical `ownerDecision: pending` field is not rewritten, which is correct provenance: E0's independent review explicitly says the owner action must come later, and `integration-04.md` is that later owner decision. H15 binds both layers rather than reading mechanical PASS as acceptance.

Therefore **C8 PASS** for H15.

## Criteria

| Criterion | Round-16 result | Basis |
|---|---|---|
| C1 | **PASS** | Prior deterministic public trace remains intact; C15 adds no semantic weakening. |
| C2 | **PASS** | Delayed-Runtime/non-blocking evidence is preserved. |
| C3 | **PASS** | Independent sink/ledger attribution remains intact. |
| C4 | **PASS** | Shared laboratory/direct-baseline contract remains intact. |
| C5 | **PASS** | Both public application shapes remain prepared and are now backed by accepted E0 evidence without being mistaken for K1 success. |
| C6 | **PASS** | Unsafe/state-loss controls remain intact; C15 does not weaken prior controls. |
| C7 | **PASS** | Exchange-local epoch relation, Activation-ID/epoch adaptation, refusal behavior and representation freedom remain intact. |
| C8 | **PASS** | Accepted benchmark E0 H, independent ACCEPT, owner integration and pinned evidence independently verified. |
| C9 | **FAIL** | K02-R16-01: B-2 wait-ended batch selection still lacks independently discriminating ownership for mandatory-member choice versus ineligible-candidate exclusion. |

## Validation evidence

I inspected immutable H15 clean-C15 logs rather than rerunning them. They report:

- `npm run typecheck`: exit 0;
- `npm test`: **1,753 / 1,753 pass**, 270 suites, zero fail/skipped;
- `npm run test:conformance`: **1,644 / 1,644 pass**, zero fail/skipped;
- K0 fixture: **788 / 788 pass**, 59 suites, zero fail/skipped;
- SDK: 22 / 22 pass;
- builder-docs: 26 Markdown files / 280 links+anchors / 38 public imports.

The K0 log includes all three corrected selector-isolation checks and the regression proving the old contaminated mutations independently violate W-3. The green logs validate the declared corpus; they do not cure K02-R16-01 because that finding concerns a missing assertion-level discriminator.

## Non-blocking documentation drift

H15 correctly updates the authoritative 007 K0.2 row to `WAITING_FOR_REVIEW` and records the accepted E0 chain. Two older current-prose snapshots still say C8 is blocked: contract revision 15's introductory status sentence and 007's introductory paragraph above the authoritative row. The latter explicitly says the row is authoritative. Because E0 owner acceptance occurred after clean C15 and H15 validly binds that later external evidence administratively, this drift does **not** invalidate C8. Correct it opportunistically in the next required payload rather than cutting a standalone candidate for prose.

## Verdict

**CHANGES REQUIRED**

Fix forward. Do not revert C15/H15. C1–C8 now pass, including the formerly external C8 gate. The only blocking criterion is C9 through K02-R16-01.

The next correction should be narrowly focused on finishing the B-2 assertion split and dependent coverage reconciliation, while preserving the accepted E0 binding and all prior closed corrections. Re-run the affected/full deterministic validation on a clean payload and submit the next C/H candidate for accountable Round 17 review.

Do not self-accept, merge K0.2, close K0, release K1.0 or begin successor implementation before an independent ACCEPT.