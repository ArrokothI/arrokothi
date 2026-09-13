# K0.2 independent review — round 17

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-12  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted H16:

- governing base: `c079237ee7aff428481426f93e87a68b79f170d4`;
- previous reviewer record A16: `96de003c89681b5904c85747bdd03c42c1e4b98d`;
- clean payload C16: `9821cc27dbe5990f86028846b07edfb31cb65380`;
- submitted handoff H16: `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2`.

I inspected exact repository commits, source, report and immutable validation logs through the authorized GitHub connector. I did not have a local executable checkout and did not independently rerun the validation commands. I independently rechecked current benchmark `main` rather than relying only on H16's copied external-evidence log.

A16→C16 is exactly one payload commit. C16→H16 is exactly one administrative/evidence commit containing `implementation-16.md`, the K0.2 007 row plus the explicitly identified introductory drift correction, six clean-C16 validation logs and one read-only benchmark-E0 recheck log. No script, fixture, evaluator rule, threshold or configuration first appears in H16. I found no C/H allowlist defect.

## Review method

Round 16 left one blocking issue: B-2's wait-ended selection rules were still partially coincident in the available schedules, so a complete-looking clause inventory could not discriminate two independently wrong selectors. I therefore reviewed the correction as a semantic reconstruction rather than trusting the new clause count or green tests.

I checked:

1. the governing K0.1 B-2/B-4/B-6/B-7 wait-ended rules and their determinacy details;
2. the new B-6 and B-7 spare-capacity schedules;
3. the existing producer-scope schedule reused for B-6 truncation;
4. the three new single-step violating transcripts;
5. the two whole-corpus selector candidates and their cross-corpus acceptance/failure pattern;
6. the revised cited-decision inventory, coverage owners and anti-rebundling guard;
7. the self-found B-6 readiness split and nearby B-4/B-2 wording corrections;
8. preservation of the previously accepted epoch/selector/deadline/receipt/cancellation corrections;
9. the clean-C16 validation attachments; and
10. the already accepted external E0 chain and current benchmark main.

## Round-16 finding disposition

### K02-R16-01 — CLOSED

C16 now separates the wait-ended selection facts at the level C9 requires.

### B-6 mandatory retention versus B-6 truncation

`R5-e1` remains the truthful bound-1 displacement owner: older ineligible backlog cannot take the only slot from the Event the Execution was woken for.

`R5-e1b` separately owns B-6 truncation on `identity-producer-scope` step 9, where more than one eligible Event is available and the dispatch bound is one. The counterexample keeps eligibility correct and chooses the later eligible Event. That can fail while ineligible-backlog exclusion remains completely correct, so the earliest-accepted mandatory choice is no longer borrowed from the displacement case.

### Ineligible candidacy with spare capacity

`R5-e1c` and `R5-e2b` separately own the B-6 and B-7 candidacy clauses on `control-stale-timer-and-lost-wake` steps 14 and 17.

The schedule construction is sound. `res-off` is the same broad source category as the wake Events but fails the retired wait's correlation selector, so its exclusion is genuinely selector-driven rather than being supplied by the application-input category rule. On the B-6 path the correct mandatory Event is retained while three slots remain unused. On the B-7 path the off-correlation backlog is older than the newly minted timeout, so admitting it while preserving acceptance-order presentation produces the distinct wrong batch `[res-off, to-g4]`.

These steps prove "not a candidate" independently of "does not displace the mandatory member." B-4 keeps the excluded Event queued/unacknowledged, so no retention property is silently bundled into the batch-membership assertion.

### Candidate-level independence

The correction does more than add three hand-edited transcripts.

`waitEndedTopUpCandidate` retains the conforming mandatory/eligible selection and then incorrectly fills spare capacity from the whole mailbox. Across the complete corpus it fails only the two new spare-capacity steps and is accepted by the prior bound-1 displacement owners. Therefore `R5-e1c/R5-e2b` are not restatements of `R5-e1/R5-e2`.

`waitEndedLateTruncationCandidate` derives the wait-ended candidate set from the retired wait and mailbox and truncates from the wrong end. It fails only where the corpus genuinely offers more eligible candidates than the bound can hold, and it passes the spare-capacity exclusion schedule. The two candidate constructions therefore discriminate different implementation mistakes rather than two prose descriptions of one mistake.

The cited-decision inventory now records the corresponding B-2 clauses separately: mandatory displacement, earliest-eligible B-6 truncation, B-6 candidacy, B-7 mandatory displacement, B-7 candidacy, eligible fill, presentation order, bound and nonempty selection. The named guard prevents the principal B-2 owners from silently being re-bundled behind a recomputed inventory seal.

This closes the residual K02-R15-02/K02-R16-01 reconstruction failure.

## Self-found correction review

### B-6 path-B retirement versus wait-ended readiness

The implementer correctly found and split another independently violable clause while walking the dependent path.

`R5-d1` owns retirement of the live registration/generation. New `R5-d1b` owns the distinct requirement that the same eligible Event acceptance commits **Event-triggered wait-ended readiness naming that retired generation**, rather than merely leaving ordinary `READY` state.

The counterexample is coherent: the wait is retired correctly, lifecycle is `READY`, and only the wait-ended readiness record is omitted. That is not an independent W-3 violation; it is exactly the mistake that would cause the next reservation to use B-2 ordinary selection instead of the retired wait rule. The split is therefore warranted and the new transcript is a truthful discriminator.

### Nearby wording/reconciliation

The narrowing of `R5-j3` to the eligible-fill half is correct; its existing transcript does not need to claim mandatory-timeout retention as well. Splitting B-4's wait-ended exclusion reference by B-6/B-7 species is also consistent with the new evidence. Retention of excluded Events remains separately owned rather than being inferred from exclusion.

The recorded note that an *eligible* Event cannot predate a B-7 timeout while the same wait remains live is consistent with the state machine: such an Event would itself have ended the live wait through B-6. C16 does not manufacture an impossible schedule merely to mirror explanatory prose.

I found no new dependent defect in this correction.

## External E0 gate

**C8 remains PASS.**

The accepted chain previously verified in round 16 remains the relevant pinned evidence:

- E0 payload C `516e77ff2f3cd93eb407990040259a7524802372`;
- accepted E0 H `26d274fad53b2aa4fc2c7f596cae52e072cd24b5`;
- independent ACCEPT A `ac1445fb8144ffab8a9153b243d4b9237d1927b0`;
- owner ACCEPT/integration receipt `9b816d47e83ff210fa32400aa91994f8055138d5`;
- benchmark `main` currently `4d83c245c8f6bb0886c1035ec1c6bba3f91f0ddd`, still on the integrated accepted lineage.

H15/H16 preserve the fixture/configuration/raw-observation/evaluator identities already reviewed. The benchmark's historical accepted-H `ownerDecision: pending` field remains untouched, correctly preserving provenance; the later owner integration receipt is the actual owner decision. C16's documentation correction only removes stale local `BLOCKED_EXTERNAL` prose and does not rewrite external evidence.

## Validation evidence

I inspected H16's immutable clean-C16 logs rather than rerunning them. They report:

- `npm run typecheck`: exit 0;
- `npm test`: **1,775 / 1,775 pass**, 271 suites, zero fail/skipped;
- `npm run test:conformance`: **1,666 / 1,666 pass**, zero fail/skipped;
- K0 fixture: **810 / 810 pass**, 60 suites, zero fail/skipped;
- SDK: **22 / 22 pass**;
- builder-docs: **26 Markdown files**, with its declared link/import checks passing.

The K0 log includes the new B-2 schedule-shape assertions, the three direct violations, the cross-corpus top-up and late-truncation candidate checks, the independence check between those candidates, and the cited-decision anti-rebundling guard. These observations support the declared clean-C16 fixture state. Reviewer execution was not independently rerun.

## Criteria

| Criterion | Round-17 result | Basis |
|---|---|---|
| C1 | **PASS** | The deterministic public K0 trace remains intact; prior trace/selectivity evidence is preserved. |
| C2 | **PASS** | Delayed Runtime/non-blocking evidence is unchanged by the B-2 correction. |
| C3 | **PASS** | Independent operation-sink/ledger attribution remains intact. |
| C4 | **PASS** | Shared laboratory/direct-baseline contract remains intact. |
| C5 | **PASS** | Both public application shapes remain prepared and are backed by accepted E0 evidence without being represented as K1 success. |
| C6 | **PASS** | Required unsafe/state-loss controls remain intact; the correction adds discrimination rather than weakening a control. |
| C7 | **PASS** | Representation freedom, refusal behavior, exchange-local epoch relation and Activation-ID/epoch command adaptation remain unchanged and sound. |
| C8 | **PASS** | Pinned benchmark E0 H, independent ACCEPT, owner decision/integration and evidence identities remain independently inspectable and current. |
| C9 | **PASS** | K02-R16-01 is closed: B-2's independently violable wait-ended selection facts now have truthful separate ownership and discriminating schedules/candidates; the dependent B-6 readiness split is also sound. |

## Findings

No blocking or non-blocking finding is opened in this review.

`K0.2-SELF-01` remains the separately assigned historical item recorded by prior reports; this candidate does not touch or rely on that subsystem as semantic proof, so there is no new cause to reopen it here.

## Verdict

**ACCEPT**

This acceptance binds only to H16 `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2` and the exact evidence chain described above.

All K0.2 criteria C1–C9 PASS. Do not reinterpret acceptance of this fixture/gate packet as K1 implementation success, benchmark comparative success, durability/isolation evidence, or release authorization.

This review does not merge K0.2, close K0, release K1.0, release E1 work, or authorize successor implementation. The repository owner retains the post-acceptance integration/discussion/release decision required by the governing process.