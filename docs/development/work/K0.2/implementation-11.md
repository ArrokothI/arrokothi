# Implementation report — K0.2, round 11

Correction round for the CHANGES REQUIRED verdict on H10, recorded in
[review-10.md](review-10.md). Rounds 1–10 are unchanged and remain as history.

The correction is **forward from C10**, as review-10.md directs. `K02-R9-01` stays closed:
R3-c4, the `g3`/`res-3` B-6 path-B schedule, R5-d6, R5-d4's path-A narrowing, all six
accepted-deadline lifecycle transcripts, the per-family receipt/Activation-ID token relations, all
prior splits and the logical-deadline/physical-timer distinction are preserved unchanged. §4 re-checks
what was kept.

All three round-10 findings are against the fixture's assertion inventory and observation surface —
not against the deterministic trace, the delayed-Runtime shape, the ledger independence, the baseline
contract or the application shapes — and all three are correct. The correction applies C10's own
decision-level rule (read the governing decision a row cites, never the row's illustrative
parenthetical) as a cumulative method across rows 1–3, not as another isolated one-field patch.

## Identity

- **Packet / parent:** K0.2 — public controls and the K0/E0 gate; parent milestone K0.
- **Contract:** [`contract.md`](contract.md), **revision 11**, at C11 below.
- **Governing process baseline:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **State: `BLOCKED_EXTERNAL`,** unchanged. C1–C7 and C9 are corrected and independently reviewable;
  C8 cannot be satisfied from this repository. See §5.
- **Owner release:** the original explicit release of 2026-09-11 still stands; corrections on a
  released packet need no renewed permission. No successor is started or released.
- **Branch:** `codex/k0.2-public-controls-e0-gate`. **Configured remote:** `origin`
  `https://github.com/ArrokothI/Agent_SDK.git`, unchanged.
- **Base commit:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **Previously reviewed H10:** `54a0bda358960b049800d8856128eaea90fc6fd1` (CHANGES REQUIRED).
- **Reviewer record on the branch:** `a0e034d6acd2e6c541dacb5848da41a0404bab86` ([review-10.md](review-10.md)).
  Prior reviewer records `269ed51`, `9c63b2c`, `a057a12`, `cec6674`, `55f11858`, `c3fcef35`, `3377a8c`,
  `1f3a439`, `adb2b77` remain historical provenance. None is modified here.
- **Clean payload C11:** `faac6a1813b7956a286cec3325c6391bfed579f0`. Final validation ran on this tree.
- **Candidate H11:** the commit containing this report. Full SHA in the external handoff.
- **Exact C11..H11 administrative allowlist:** `docs/development/work/K0.2/implementation-11.md` (this
  file) and the K0.2 row in `docs/development/007-work-packets.md`. **No payload rides in H11.**
- **Correction delta:** `a0e034d..faac6a1` is 10 files, +1038/−50.
- **Cumulative scope:** `c079237e..faac6a1` is 39 files, +14292/−6.
- **Working tree:** clean at C11 and at H11.

## 1. K02-R10-01 — OA-5's whole-envelope-validation family, completed — **CLOSED**

**The finding is correct.** C10 closed the deadline member (R3-c4) and stopped, reading its own
correction as one field. OA-5 — which row 3 cites — forbids a rejected Outcome from creating Effects,
acknowledging Events, committing progress, accepting emissions **and** creating any
wait/deadline/readiness/next-state transition. The inventory owned progress (R3-c1), emissions (R3-c1b),
acknowledgment (R3-c2), Effect intent (R3-c3, `shared` with row 4) and deadline (R3-c4), but no row-3
owner for wait/lifecycle, readiness or next-state under a correct rejection. Each is independently
plausible via its own writer running before or outside whole-envelope validation. The CX-6 fence has its
own full family (R7-a2/a3/a4/a5/a6/a6b/a6c/a6d) at a different writer and cannot stand in for this one.

**What was done.** Three obligations, three transcripts, one new minimal schedule. No existing
expectation was changed except by insertion.

- **R3-c5** owns wait/lifecycle at the malformed future-deadline `await` (step 4): correct
  `malformed_envelope` refusal with pinned Activation/batch, no deadline and no readiness, but `WAITING`
  under `g-bad`. Its transcript, `envelope/malformed-await-installs-a-wait`, moves `state` +
  `liveWaitGeneration` together (one lifecycle group per W-3's definitional link), distinct from the
  acceptance failure at the same step (which removes the rejection and resolves the exchange) and from
  R3-c4's deadline-only move.
- **R3-c6** owns next-state at the duplicate-emission envelope (step 2), which already carries a valid
  `next: continue`: correct refusal with no progress/emissions/acknowledgment, but `READY`. Its
  transcript, `envelope/rejected-continue-commits-its-next-state`, moves only `state`, distinct from
  every other half there.
- **R3-c7** owns readiness-only on a new minimal step (step 7): a valid subscription-only wait
  (`g-good`) inside an envelope malformed for an unrelated reason (duplicate emission key). Correct
  refusal with no wait, no deadline and `RUNNING`, but a wait-ended readiness for `g-good`. No existing
  rejected schedule could distinguish this honestly — every other await here is malformed or absent, so
  arming a readiness for `g-bad` or for no wait would model a doubly-wrong candidate — hence the new
  step rather than a bundled move. Its transcript,
  `envelope/valid-wait-in-malformed-envelope-arms-readiness`, moves only `waitEndedReadiness`.
  `waitEndedReadiness` is deliberately ungrouped since round 5, so no atomicity note is owed.

**Regression guards** (`blind-spot-regression.test.ts`, round-10 block) pin: the wait half moves
lifecycle together under a correct refusal with deadline/readiness/exchange correct; the next-state
schedule carries a valid `next: continue` and moves only `RUNNING` to `READY`; the readiness schedule
submits a helper-valid wait inside a duplicate-emission envelope and moves only readiness for `g-good`;
and none of the three reuses the CX-6 fence (different scenarios and classifications).

## 2. K02-R10-02 — row 2 / ID-3, ID-4 and ID-9, finished — **CLOSED**

**The finding is correct.** Takeover is three facts (same ID in R2-c1, advanced epoch in R2-c2, same
immutable input), but only the first two were owned; ordinary redelivery (ID-9 case 1 / ID-3) was
unrepresentable (no `redeliver_dispatch` command); and ID-9 case 3's stale rejection was evidenced only
by row 10 with no declared row-2 relationship, which C9's own rules do not count.

**What was done.**

- `in-2` is accepted after dispatch but before redelivery/takeover, queued but never reserved, so a
  wrong repin has deterministic new content to include while the conforming batch stays `["in-1"]`. The
  already-pinned original batch is preserved in every conforming observation.
- **R2-c3** owns takeover input immutability at the takeover step: correct ID and epoch with the batch
  repinned to `["in-1", "in-2"]`. Its transcript, `identity-activation/takeover-repins-the-pinned-batch`,
  moves only `dispatchedBatch` (one activation-group field).
- **`redeliver_dispatch`** is the smallest new command for ID-9 case 1: same unresolved dispatch
  delivered again with no takeover decided. **R2-d1/d2/d3** own its three preserved facts at the
  redelivery step (same ID, same epoch, same input), each a single-field transcript with distinct sets
  (`identity-activation/redelivery-mints-a-new-activation-id`,
  `identity-activation/redelivery-advances-the-writer-epoch`,
  `identity-activation/redelivery-repins-the-pinned-batch`).
- **R2-c4** gives row 2 an honest owner for ID-9 case 3 as a justified `shared` link to R10-a: one
  stale-read bug admits the superseded epoch and violates LP-1's no-staleness-window rule and ID-9 case
  3's epoch-fencing rule at once; a second transcript moving the same fields is forbidden, so two prose
  variants would be worse evidence.
- The stale step, the taken-over acceptance (now acknowledging only `["in-1"]` with `in-2` retained for
  the next exchange) and the next dispatch (now pinning `["in-2"]` under `act-2`) are updated for the new
  mailbox content; R2-a and R10-a shift indices with them. No other schedule changed.

## 3. K02-R10-03 — producer scope and accepted receipts, representable — **CLOSED**

**The finding is correct.** ID-2 scopes input identity by producer namespace + destination + producer
request key, but the vocabulary carried no producer dimension — every create occurred in one implicit
scope, so global raw-key deduplication passed. `Observation.receipt` was documented as the most recent
accepted **Outcome** receipt while scenarios used it for create and silently retained it across
dispatch/ingress, with no candidate-visible place for the dispatch-intent or input-ingress acceptance
identity the runner claimed its bijection enforced.

**What was done.**

- `create`/`create_retry` gain an optional `producer` namespace (ID-2's triple). Pre-round-10 schedules
  stay in one implicit scope with unchanged meaning; new schedules set it explicitly.
- The new `identity-producer-scope` scenario reuses one raw key text (`req-shared`) across `prod-a` and
  `prod-b` for different Executions without colliding, with same-producer retry still returning the same
  identity and receipt. **R1-c1/c2** own the ID and receipt halves with separate single-field
  globally-deduplicating transcripts, preserving K02-R5-01's per-family separation.
- `receipt` is clarified as the most recent opaque acceptance receipt among K0.2's
  opaque-receipt-bearing boundaries — creation and Outcome acceptance. Dispatch intent's identity is the
  Activation ID + epoch + pinned batch (ID-3/ID-4/ID-9; row 2 cites those, not ID-6/ID-7). Subsequent
  input-ingress position is the per-Execution acceptance order (B-4, fixture-supplied Event IDs via
  `queued`). Neither mints a separate opaque receipt in K0.2, so retention across
  `accept_event`/`dispatch`/`redeliver_dispatch`/`takeover` is correct absence, not omission.
  Effect-admission, Effect-settlement and child/message-operation receipts have no observable K0 case
  while K1 refuses Effects and has no composition surface, and are explicitly assigned to K2.2/K2.3/K4.1
  as **R4-b1/b2/b3** rather than fabricated.
- ID-6/ID-7 are re-derived at the actual opaque boundaries: same on replay (R1-a2 for create, R3-a1 for
  Outcome, pre-existing), distinct on new (R1-c2 across producers, **R1-d1** across keys in the
  delayed-Runtime schedule, **R3-d1** across Activations in the K0 trace), and none on reject (**R1-b3**
  for create conflict, **R3-b3** for duplicate conflict, **R3-c8** for malformed envelope, **R7-a9** for
  the cancellation loser itself, **R10-a2** for the stale writer) — each a single receipt-only move
  beside a correct rejection, distinct from every other half at its step. The delayed-Runtime scenario
  now declares row 1 and the K0 trace now declares row 3 for those distinctness halves. Spelling stays
  implementation-owned with per-family bijections unchanged.
- After the surface change the assertion-granular sweep was re-run across all dependent rows, including
  row 8's shared rejection paths: `coverage.test.ts` re-enforces no-shared-transcript,
  no-shared-field-set and bidirectional row attribution over the new corpus, and the round-10
  `blind-spot-regression` block pins the producer splits and every receipt-narrowing half.

## 4. What was preserved from C10/H10

- **K02-R9-01 stays closed.** R3-c4, its single-field malformed-rejection deadline transcript, and its
  distinction from the older W-1 acceptance failure and from R7-a6c are untouched.
- **`g3`/`res-3` B-6 path-B schedule, R5-d6, R5-d4's path-A narrowing and all six accepted-deadline
  lifecycle transcripts intact**, re-verified by the no-shared-transcript and no-shared-field-set guards.
- **K02-R6-01 stays closed:** `acceptedDeadline` remains accepted logical deadline state with no physical
  timer-registration or cancellation lifetime requirement anywhere.
- **K02-R5-01 stays closed:** per-family receipt/Activation-ID bijections and the cross-family-reuse
  probe are untouched; new receipt halves collapse within the receipt family, never across families.
- **R3-b split, losing-`await` schedule, all prior splits intact.**
- **Heuristic-only coupling intact:** still twenty `atomicity` notes — every new transcript is
  single-field (or single lifecycle-group for R3-c5), so none owes a note.
- **C8 stays `BLOCKED_EXTERNAL`** and is not offered for acceptance. Nothing is self-accepted or
  merged; K0 is not closed and K1.0 is not released.
- **Counts reconciled from source**, not transcribed: 114 obligations (104 scenario + 4 shared + 1
  corpus + 5 assigned), 104 violating transcripts, 20 atomicity notes, 13 scenarios / 98 steps, rows
  9, 11, 16, 7, 34, 5, 17, 9, 2, 4.

## 5. K0.2-C8 — still externally blocked

Same posture as rounds 6–10: this packet writes nothing outside its own repository, and the criterion's
status does not depend on a new inspection. The blocker record is unchanged:

- **Responsible actor:** benchmark repository owner.
- **Unavailable input:** accepted E0 fixture/config identities, raw observations, evaluator version
  and the actual E0 decision at a pinned benchmark revision.
- **Unblock condition:** an accepted E0 deliverable at a pinned benchmark revision, with artifact
  identities recordable here and inspectable by an independent reviewer — standing as recorded in
  [review-10.md](review-10.md) at revision `98756f8c10bd806125da8318f1a129bc030aca61` (E0 planned,
  not implemented).

No E0 acceptance is claimed, implied or self-granted. Because C8 cannot pass, the packet is **not
review-ready as a whole**, and because K0.2 is K0's final gate packet, **K0 stays open**.

## 6. Whole-packet re-audit

- **Rounds 2–10 corrections preserved**, as listed in §4, except by addition.
- **All ten rows re-derived**, with rows 1–3's parenthetical-shaped obligations completed against the
  decisions they cite (OA-5, ID-2/ID-3/ID-4/ID-6/ID-7/ID-9) rather than the illustrative lists.
- **Every scenario still refused** by the refusing candidate: 13 of 13.
- **Corpus invariants re-run**: readiness lifetime, accepted-deadline pairing, stale-after-retirement
  no-op delivery, wait/batch/disposition interactions, timeout-generation minting, sink attribution,
  fenced-submission stability, Effect-intent emptiness, plus the new producer/receipt/field-division
  guards.
- **Contract and specification reconciled**: contract revision 11, specification §17, and §§1–2's counts
  re-derived from source (114/104/4/1/5, 13 scenarios / 98 steps). Every count above was computed from
  `coverage.ts`/`candidate.ts`/`scenarios.ts`, not transcribed.
- **Doc links resolve**: builder-docs inventory passes (26 files, 280 links/anchors, 38 imports). No
  trailing whitespace or tabs in changed files (`git diff --check` clean); zero `@arrokothi/*` imports
  in the fixture; no document or test claims K0, E0 or E1 status.

## 7. Validation

Run on committed C11, clean tree.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | **1501 tests / 261 suites / 1501 pass / 0 fail / 0 skipped** |
| `npm run test:conformance` | 1392 pass / 0 fail |
| `npm run test:sdk` | 22 pass / 0 fail |
| `npm run check:builder-docs` | 26 files, 280 links/anchors, 38 imports |
| k0 fixture directory | 536 pass / 50 suites / 0 fail |
| architecture guards | pass (Execution-kernel, Agent, Workflow boundary suites in `npm test`) |

**The pre-existing suite is unchanged: 1501 − 536 = 965**, the same figure as rounds 1–10. The k0
directory grew 473 → 536 (+63: sixteen new violating transcripts with their obligation-evidence and
defended-by tests, four new shared/assigned obligations with usability tests, one new scenario with its
conforming/refusal coverage, and nine round-10 regression tests).

`npm run test:evals` is not run: it requires provider credentials and network, and this packet adds no
eval. Third-party review: no third-party code, dependency, asset or service was added, copied or
adapted this round; the fixture remains dependency-free and the repository's dependency set is
untouched.

## 8. Self-found defects this round

- None beyond the findings. The one judgement this round still declines — dispatch intent and
  subsequent input ingress bearing separate opaque receipts in K0.2 — is stated against the accepted
  decisions (§11 rows 1–2 cite ID-3/ID-4/ID-9/B-4 for those identities, not ID-6/ID-7 opaque tokens;
  kernel.md's six boundaries include them generally but K0.2's §11 obligations require opaque receipts
  only for creation and Outcome acceptance) rather than against a row's illustrative list, which is the
  specific error round 9 made. If a later reading finds such a decision, the remedy is a new opaque
  field plus single-field transcripts, exactly as here.

**K0.2-SELF-01 remains open and unfixed, deliberately**, for the same reason as rounds 5–10: the
architecture guard's raw-text import scanner treats certain prose as a bare import; `specifiersIn`
also backs the live kernel import-graph guard, so changing it inside K0.2 risks weakening a real guard
for a cosmetic gain. Separate corrective packet. Re-verified: architecture tests pass, zero false
positives.

## 9. Limitations, stated plainly

- **This is a prepared fixture, not a result.** The only candidate speaking for the real tree refuses
  every scenario. Every `PASS` here is a hand-authored transcript proving the oracle works.
- **The atomicity notes do not prove atomicity.** Each proves that one specific bug construction via
  named writers moves these fields, with a pointer to where a second writer's partial is covered.
- **Ten rounds have now found defects in my reading of the worksheet**, not in code implementing it.
  Rounds 7, 8, 9 and 10 were the same shape at increasing depth: a fact the observation could already
  see, at a boundary the inventory had not enumerated — and in round 10's case, three such families at
  once plus two surfaces (producer dimension, redelivery command) the vocabulary could not say at all.
  That remains the packet's dominant residual risk.
- **The four `shared` entries are judgements** that two §11 rows name one observable fact (R3-c3/R4-a2,
  R6-a1/R2-b1, R8-b2/R7-c2, and now R2-c4/R10-a).
- **The five `assigned` entries are judgements** that K0 has no observable case (R5-a4 to K1.3, R8-c to
  K2.4, R4-b1/b2/b3 to K2.2/K2.3/K4.1), each with the governing source that permits the deferral.
- **`effectIntents` and `acceptedDeadline` observe retained accepted state only**, and neither sees a
  conforming physical timer a retired wait leaves behind — the latter by design.
- **Contract revision 11 is my own wording**, not owner-approved; it corrects claims to match what the
  packet establishes and does not widen scope.

## 10. Where review effort is best spent

1. **Attack §6's new receipt reconciliation by naming a K0.2 decision that mints an opaque
   dispatch/ingress receipt.** The claim is that §11 rows 1–2 cite ID-3/ID-4/ID-9/B-4 for those
   identities rather than ID-6/ID-7 opaque tokens, and that retention across those commands is correct
   absence. A governing decision stating otherwise reopens R10-03's surface, not its producer half.
2. **Check that R2-c4/R10-a really are one writer.** The claim is that the takeover write in the
   previous step is the write both LP-1's freshness check and ID-9 case 3's epoch fence read, so one
   stale-read bug violates both at once.
3. **Check that R3-c5/c6/c7 and R7-a6/a6b/a6d really are two fences.** The claim is that
   whole-envelope validation (OA-3/OA-5) and the cancellation/terminal-conflict fence (CX-6) are
   separately orderable relative to wait/deadline/readiness/next-state/receipt commits.
4. **Re-derive §11 independently against the 114 entries**, particularly R4-a3 and R10-c, whose
   shared-writer arguments are unchanged and still the softest justifications.

## 11. Handoff

- **Base:** `c079237ee7aff428481426f93e87a68b79f170d4` (unchanged).
- **Previously reviewed H10:** `54a0bda358960b049800d8856128eaea90fc6fd1` (CHANGES REQUIRED).
- **Reviewer record:** `a0e034d6acd2e6c541dacb5848da41a0404bab86` ([review-10.md](review-10.md)).
- **Clean validated payload C11:** `faac6a1813b7956a286cec3325c6391bfed579f0`.
- **Candidate H11:** this commit.
- **Verdict sought:** independent review of C1–C7 and C9. C8 is `BLOCKED_EXTERNAL` and is not offered
  for acceptance. **Not self-accepted, not merged, K0 not closed, K1.0 not released.**
