# Group review 07 — K1.2 family reconciliation under owner choice 08

Read on 2026-10-29 by the implementing Codex GPT-6 session. Checked product/test
revision: `bd0220b5a0f0517d0e48600e6c4b4cf237410743` (those bytes are unchanged
from `91175053`). Source and sealed output remain the pins in group-review-06.
This is a reading and build plan, not independent acceptance or a fresh kill claim.

**Counts after reconciling origin 431: three new-test groups and eighteen mutation
adoptions.** Seven live obligations were added to the eleven in group-review-06.
No additional origin has been triaged. The next projection remains origin 731;
owner choice 08's caps are 12 test groups and 60 mutation adoptions.

## Each absent anchor

Absence of the historical spelling is not retirement evidence by itself. The full
historical edit and the current mechanism were read for each of these thirteen.
The numbered tests below are existing passing leaves in the catalog recorded in
progress.md; fresh controls and qualified kills are still required.

| Member | Current mechanism and reading | Disposition/build |
|---|---|---|
| A2 | `ExecutionReader.acceptedOutcome` replaces direct `mapGet`; coordinator still consults it before terminal/currency/content validation. The sweep's exact replay is a continue replay before another exchange, so it does not distinguish the historical conditional gate. | One adoption, re-anchored at `const already = record.acceptedOutcome(activationId)`. Existing outcome-acceptance leaf at 148 opens the next exchange before replay. |
| A7 | Coordinator's terminal branch is now `isTerminal(nextState)`, because K1.3 introduced WAITING. Complete/fail still dispose outside-batch Events. | Existing complete-decision coverage: the complete-with-outside-batch scenario and the oracle's post-state P1 check reject a terminal state with a queued Event. The state owner's P1 also prevents that plan. The live terminal obligation is not superseded merely because the branch changed. |
| A8 | The disposition write moved into state.ts's Outcome apply arm. | Existing complete-decision `outcomeAnswer` compares the added acknowledged IDs with the exact reserved batch. Marking outside-batch Events acknowledged violates that independent equality. |
| A16 | The Outcome state-owner arm installs the computed `activation` rather than writing literal null in coordinator. | Existing `outcomeAnswer` requires `after.activation === null`; P1/P3 constrain the post-state. Keeping the resolved exchange violates the same decision. |
| B2 | Control History appends moved into the state-owner control arm. | Existing `state-owner.dropped-coupled-field` registry mutation drops that exact control History append. Its structural/mechanism attribution remains unchanged; this reading grants no additional conformance credit. |
| B3 | `permittedForHold` moved into plan.ts; protocol-only hold still returns takeover plus submission. | One adoption at that current return. Existing hold-permitted leaf at 113 independently names both permitted actions. The complete-decision oracle's agreement with retained lists alone is insufficient. |
| B4 | Delivery-attempt construction moved into state.ts's delivery arm; the coordinator supplies `plan.writerEpoch`. | One adoption at the stored delivery row. Existing delivery-attribution leaf at 32 checks mixed redeliveries across takeover. The sweep does not exercise redelivery. |
| B5 | Outcome's acceptance-position advance moved into state.ts. | Existing `outcomeAnswer` requires the receipt at the previous next position and exactly one increment for a continuing/waiting Outcome; `nextAcceptance` also observes it. Moving the write did not remove the obligation. |
| B6 | Post-safety-callback checks use current readers and bounded diagnostic identity, followed by a version-bound plan. | Existing callback scenarios independently require terminal/no-exchange/stale/held refusals after callback state changes; the oracle's named refusal and callback checks cover that decision. No retirement on spelling alone. |
| B7 | Outcome History append moved into state.ts. | One adoption at the current append. Existing transaction leaf at 270 asserts the hold-ending History. The oracle's apply model copies reference History and does not independently require the append. |
| B12 | Authority block now uses `diagnosticIdentity`; final accept has reading/basis arguments. | One adoption, moving the current grant block after content validation. Existing submission-authority leaf at 338 crosses no authority with invalid content. |
| B13 | Same moved authority block, distinct capacity ordering boundary. | One adoption, moving the grant block after the capacity refusal. Existing submission-authority leaf at 384 crosses no authority with excess capacity. |
| B14 | Malformed-claim reason uses `diagnosticIdentity`; unusable-identity arm remains. | One adoption editing both current reason sites to drop independent content defects. Existing submission-authority leaf at 477 requires claim, depth, duplicate-key and malformed fail-error diagnostics together. |

## Remaining member readings

The eleven prior adoptions remain one each: A6, A9, A11–A14, B9–B11, B15 and B20.
Their bounded gaps and leaf pointers remain in group-review-06 and triage-05.json.
A textually matching B10/B11 edit would now assign to a read-only `ExchangeReader`
getter. That would test a TypeError, not grant lifetime. Both are re-anchored in the
state owner's delivery arm: for a later delivery at the same epoch, replace the grant
with a new frozen object of the same fields. B11 adds the epoch>1 condition. This
preserves each historical counterexample without counting a second adoption.

The other applicable members have these existing complete-decision distinctions:
A1 exact reserved-batch acknowledgment; A3 stale writer epoch; A4 same Activation ID
across takeover; A5 exactly one epoch advance; A10 pinned-code hold both before and
after the callback; B1 control authority independent of visibility; B8 attempt grant
independent of visibility; B16 stale base coordinate; B17 unusable identity with stale
currency; B18/B19 unusable identity without submission authority. The scenario's
expected refusal is independent of the returned classification in those refusal arms;
`takeoverAnswer` independently states identity and epoch equalities. These readings
retain the existing oracle's declared evidence limits and do not claim new kills.

A15's historical required result was unconditional refusal of `await`. Accepted K1.3
replaced that subject with wait registration; its current contract is tested under K1.3.
Use the accepted K1.3 design row for that supersession, not anchor absence.

The eighteen proposed cases are additions to the existing mutations.json registry.
They use target sets and exact existing leaf paths, with current mutation anchors and
family-member obligations. Each case's complete static test import closure is included.
No new behavior test, product edit, historical evidence edit or third-party code is
included. Family routes remain pending until their executable or attributed links have
been validated; no mappings_complete claim is made here.
