# Group review 08 — reviewer 09's grant and identity routes

Read on 2026-10-29 at `75e56dbc` by the implementing Codex GPT-6 session, while
triaging K1.2 implementation 09–14. Source pin is
`66bc041175e6fc191c2e7cf88de198111e7d97c9`. The complete review-09 runner,
probe-order.ts and probe-race.ts were read, including all R1–R12 and P1–P7 labels;
the complete review-11 partial-claim probe was also read. These are linked context
for these report origins, not an early disposition of their later artifact origins.

**At origin 548: five test groups and twenty mutation adoptions.** Eighteen
adoptions have controls and qualified kills in adoption-controls-08.json; two more
are planned. No new behavior test from this reading has yet been built or run.
No count projection replaces the required origin-731 checkpoint.

## New maintained tests required

- `k12-cross-execution-grant`: probe-order P3 presents a legitimate grant minted for
  Execution A to a current-coordinate Outcome for Execution B, on the same coordinator.
  B must refuse `unauthorized_submission`, append only its refusal, and remain
  answerable using B's own grant. This distinguishes accepting any previously minted
  grant from accepting only the current attempt's reference.
- `k12-next-exchange-grant`: probe-order P4 and reviewer mutation R12 retain the first
  exchange's grant, accept a continue, dispatch the next exchange, and challenge it
  with the old grant and current coordinates. The new grant must be distinct; the old
  grant must refuse without accepted-state changes, and the new grant must succeed.

The bounded search covered the current Kernel test tree's grant/submission references,
submission-authority, submission-lifetime, exact-coordinates, losing-outcomes, the
complete-decision scenarios/checks and both registries. Forged-grant tests exercise an
unminted look-alike. Saved-reference lifetime tests cover redelivery and takeover within
one exchange. Exact-coordinates starts another exchange but obtains the new grant through
`submissionFor` without challenging the old grant. That helper can adapt to a grant-reuse
bug; successful submission alone is not the P4 negative. No maintained assertions for
P3/P4 were found. These are two different input environments under P1-G.

The current mechanism is live: dispatch mints a grant for each new Activation, takeover
mints a replacement, and submission compares reference identity with the current exchange.
No accepted decision retires either input class. Before building, repeat that check at the
chosen C. The new tests must pass unchanged product code or the product-defect stop fires.

## Two additional adoptions against existing passing leaves

| Group | Current site and existing leaf | Why the current oracle is insufficient |
|---|---|---|
| `k12-review09-r5` | The old exchange-field assignment moved to coordinator's `const submission = mintSubmission(record.executionId, named.activationId, writerEpoch)` and a takeover plan. Retain the old exchange grant instead. Existing submission-lifetime takeover leaf (line 102) requires a fresh reference and fences the retired grant even with current coordinates. | The complete-decision sweep submits its old setup grant with old coordinates. The epoch fence still reports stale when a defective takeover retains the grant. `takeoverAnswer` does not independently compare grant references. |
| `k12-review09-r7` | Outcome identity still includes the string form of `claim.writerEpoch`. Remove that component's distinguishing value. Existing outcome-acceptance line 163 changes the epoch under an accepted ID and requires conflict. | The sweep's conflicting replay changes progress, not only epoch; no registry case was found mutating this identity component. |

Each moved anchor remains one adoption. These are distinct from B10/B11 redelivery
rotation and A2 conditional replay lookup: the operations, input schedules or required
results differ. R12's grant-reuse mutation belongs with the new-test group above, not
the adoption count (owner choice 08 counts adoptions against existing passing leaves).

## Other reviewer-family distinctions

R1 joins the now-validated B12 authority-after-content adoption. The following have
current complete-decision distinctions: R2 stale currency before a copied/forged grant;
R3 exact replay after resolution (no current exchange grant exists); R4 copied grant
refused despite identical fields; R6 stale base coordinate; R8 accepted Outcome ending
both holds; R9 named authority refusal retained with its refusal position; R10 no terminal
mailbox disposition in a live state (P5); R11 stale protocol-failure report. Their old
spelling is not a supersession proof. This records the reading, not fresh kills for those
members or a complete P1 family closure.

Probe P1/P2 authority/content, P5 replay/conflict, P6 terminal/B-5 and P7 saved grant/late
report behavior have current maintained counterparts. Probe-race's reentrant takeover
and resolving Outcome correspond to outcome-hostile's reentrant leaves. The R11
partial-claim probe's stale numeric/malformed-other-coordinate arms correspond to the
maintained partial-claim matrices. Counts and printed observations from historical runs
are never substituted for those assertions.
