# Implementation report — K0.2, round 10

Correction round for the CHANGES REQUIRED verdict on H9, recorded in
[review-09.md](review-09.md). Rounds 1–9 are unchanged and remain as history.

The correction is **forward from C9**, as review-09.md directs. `K02-R8-01` is closed and stays
closed: the `g3`/`res-3` B-6 path-B schedule, R5-d6, R5-d4's path-A narrowing and all six
accepted-deadline lifecycle transcripts are preserved unchanged, and `acceptedDeadline` remains
accepted logical deadline state with no physical timer-registration or cancellation lifetime
requirement anywhere. §4 re-checks what was kept.

Round 9's finding is against my own reasoning rather than against my correction, and it is right.

## Identity

- **Packet / parent:** K0.2 — public controls and the K0/E0 gate; parent milestone K0.
- **Contract:** [`contract.md`](contract.md), **revision 10**, at C10 below.
- **Governing process baseline:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **State: `BLOCKED_EXTERNAL`,** unchanged. C1–C7 and C9 are corrected and independently reviewable;
  C8 cannot be satisfied from this repository. See §5.
- **Owner release:** the original explicit release of 2026-09-11 still stands; corrections on a
  released packet need no renewed permission. No successor is started or released.
- **Branch:** `codex/k0.2-public-controls-e0-gate`. **Configured remote:** `origin`
  `https://github.com/ArrokothI/Agent_SDK.git`, unchanged.
- **Base commit:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **Previously reviewed H9:** `80f2c887600bd2d611a7ef120d443fe6efbcb2d8` (CHANGES REQUIRED).
- **Reviewer record on the branch:** `269ed51e1f3adce44203aff4344bffbe3733122d` ([review-09.md](review-09.md)).
  Prior reviewer records `9c63b2c`, `a057a12`, `cec6674`, `55f11858`, `c3fcef35`, `3377a8c`,
  `1f3a439`, `adb2b77` remain historical provenance. None is modified here.
- **Clean payload C10:** `94aef9fd8398723fcce63963c4655cc2ba857c4c`. Final validation ran on this tree.
- **Candidate H10:** the commit containing this report. Full SHA in the external handoff.
- **Exact C10..H10 administrative allowlist:** `docs/development/work/K0.2/implementation-10.md` (this
  file) and the K0.2 row in `docs/development/007-work-packets.md`. **No payload rides in H10.**
- **Correction delta:** `269ed51..94aef9f` is 5 files, +194/−14. **No scenario file is touched.**
- **Cumulative scope:** `c079237e..94aef9f` is 37 files, +12901/−6.
- **Working tree:** clean at C10 and at H10.

## 1. K02-R9-01 — OA-5 deadline inertness on a malformed rejected Outcome — **CLOSED**

**The finding is correct, and the defective reasoning was mine.** Implementation-09 §2 named this
transition, saw that it had no owner, and argued it was not owed because §11 writes an explicit
zero-deadline clause only in row 7. That argument reads a row's *illustrative parenthetical* as the
assertion. The assertion is in the decision the row cites: row 3 cites OA-1–OA-6, and **OA-5** states
that a rejected Outcome creates no Effects, acknowledges no Events, commits no progress, accepts no
emissions and creates **no wait/deadline/readiness/next-state transition**. A malformed envelope is a
rejected Outcome. The clause was stated for this boundary all along; only the owner was missing.

This is the same visible-but-unattributed class as rounds 4, 7 and 8 — and the worse version of it,
because round 9 *saw* the transition and wrote down a reason for leaving it. A stated wrong reason is
not better than an unnoticed gap; it just fails more legibly.

**What was done.** One obligation, one transcript, four regression guards. **No schedule, step,
expectation or scenario file was changed**, as review-09.md requires: the observation already stated
the fact.

`control-whole-envelope-validation` step 4 submits a structurally empty `await` carrying a deadline of
5000 — W-1 case 1's "a deadline does not rescue it" — and requires the whole envelope refused. The
complete expected observation is `malformed_envelope`, the Execution still `RUNNING` with `act-1` and
its pinned batch `["in-1"]`, `liveWaitGeneration` null, nothing acknowledged, and `acceptedDeadline`
null.

- **R3-c4** owns the deadline clause at that boundary, joining row 3's zero-partial-state family:
  R3-c1 (progress), R3-c1b (emissions), R3-c2 (acknowledgment), R3-c3 (Effect intent, `shared` with
  row 4) and now R3-c4 (accepted deadline).
- Its transcript, `envelope/malformed-wait-leaks-its-accepted-deadline`, is the partial under a
  **correct** refusal: rejection classification, lifecycle, live generation, Activation, pinned batch,
  acknowledgment and everything else stay exactly right, and only `acceptedDeadline` leaks as 5000 —
  the deadline parsed and committed during the envelope walk and never rolled back when validation
  refused. It moves one field.
- **R7-a6c is cross-referenced, not reused.** That entry owns the same fact at CX-6's
  cancellation/terminal-conflict fence, which is a different rejection writer: a candidate that
  commits its deadline *after* whole-envelope validation but *before* the terminal-conflict check gets
  R3-c4 right and R7-a6c wrong. This is the writer/boundary test round 8 applied to B-6's two paths,
  applied here to the two rejection paths, and both entries now name the other.

**Why it is not a restatement of what already sat at that step.** The pre-existing transcript there,
`envelope/structurally-empty-wait-registered-because-it-has-a-deadline`, is the *acceptance* failure:
the malformed wait registers, the lifecycle moves to `WAITING`, the Activation and batch clear, and
the rejection disappears. It does not move `acceptedDeadline` at all, and it models a candidate that
misreads W-1. The new transcript models a candidate that reads W-1 correctly and commits too early.
The two field sets are disjoint.

**Regression guards** (`blind-spot-regression.test.ts`, round-9 block) pin: that the step really does
submit a deadline-bearing malformed wait and require its refusal with no deadline fact; that the
transcript moves exactly `acceptedDeadline` to the refused envelope's own value; that it is a partial
under a correct refusal — rejection, state, generation and pinned batch all preserved — while the
pre-existing transcript removes the rejection, moves the lifecycle and leaves the deadline alone; and
that the two rejection writers carry different classifications (`malformed_envelope` versus
`cancellation_terminal_conflict`) in different scenarios.

## 2. The boundary sweep, re-run

The §2 sweep introduced in round 9 was rerun over C10. Every boundary at which a deadline is
**submitted** (an `await` carrying one) or **live** (a `WAITING` Execution with a non-null accepted
deadline) now carries a transcript moving only `acceptedDeadline`:

| Boundary / writer | Species | Owner |
|---|---|---|
| W-2 step 4, Outcome acceptance | persist with the live registration | R5-c4 |
| W-2 step 3, Outcome acceptance | ordering: a past deadline is never persisted as live | R5-c3 |
| B-7 path A, Outcome acceptance | already-due: immediate retirement leaves no fact | R5-c5 |
| B-6 path A, Outcome acceptance | already-accepted eligible Event: immediate retirement leaves no fact | R5-d4 |
| B-7 path B, expiry handler | current-generation expiry retires the fact with the generation | R5-d5 |
| B-6 path B, Event acceptance | a later eligible Event retires the fact with the registration | R5-d6 |
| W-3, fenced delivery | a stale timer clears nothing, including the live fact | R5-f4 |
| CX-6/OA-5, cancellation fence | a fenced losing `await` accepts no fact | R7-a6c |
| **OA-3/OA-5, whole-envelope validation** | **a refused malformed envelope accepts no fact** | **R3-c4 (new)** |

Nine boundaries, nine owners, no residual. Species with more than one occurrence are owned once and
re-observed elsewhere: persistence at three points, current-expiry retirement at two. Occurrences do
not need separate owners; boundaries do.

**Still not owed, and now on a rule rather than on a parenthetical.** Cancellation accepted against an
idle `WAITING` Execution carrying a live deadline has no entry, because §11 row 7's cell states the
race with an in-flight Outcome and its reverse order and asserts nothing about cancelling a parked
Execution, and CX-1–CX-6 state the fence relative to Outcome acceptance. The distinction from the case
round 9 got wrong is that OA-5 *does* name the deadline for rejected Outcomes, whereas no accepted
decision states an assertion about this shape at all. review-09.md explicitly excludes broadening the
correction into it. If a later reading finds such a decision, the remedy is a schedule plus one
single-field transcript, exactly as here.

## 3. Mutation-checking, stated in the round's own terms

- The new transcript carries exactly one assertion's worth of difference (one field).
- It shares its step with the pre-existing acceptance-failure transcript, and the two move **disjoint**
  field sets — checked mechanically, not asserted — so neither can be read as the other's restatement.
- `coverage.test.ts` independently re-enforces, corpus-wide, that no counterexample defends two
  obligations and that no two transcripts at one step move the same field set.
- The conforming transcript still passes all twelve scenarios, and all 88 violating transcripts still
  fail at their exact step naming their exact field.

## 4. What was preserved from C9/H9

- **K02-R8-01 stays closed.** The `g3`/`res-3` schedule is untouched — `scenarios.ts` is not in this
  round's delta at all — as are R5-d6, R5-d4's path-A narrowing and the round-8 regression block.
- **All six accepted-deadline lifecycle transcripts intact and unmoved:** W-2 step-4 persistence
  (R5-c4), B-7 path-A cleanup (R5-c5), B-6 path-A cleanup (R5-d4), B-7 path-B expiry cleanup (R5-d5),
  B-6 path-B cleanup (R5-d6) and W-3 stale-delivery preservation (R5-f4).
- **K02-R6-01 stays closed:** `acceptedDeadline` is still the accepted logical deadline fact. No
  observation key names a timer, scheduler or registration; retirement never requires physical
  cancellation; the stale-after-retirement guard still requires a late timer to be a harmless no-op.
- **K02-R5-01 stays closed:** per-family receipt/Activation-ID bijections and the cross-family-reuse
  probe are untouched (120 oracle-discrimination tests pass).
- **R3-b split, losing-`await` schedule, all prior splits intact**, re-verified by the
  no-shared-transcript and no-shared-field-set guards.
- **Heuristic-only coupling intact:** still twenty `atomicity` notes, unchanged constructions. R3-c4
  moves one field and owes none.
- **C8 stays `BLOCKED_EXTERNAL`** and is not offered for acceptance. Nothing is self-accepted or
  merged; K0 is not closed and K1.0 is not released.
- **Counts reconciled from source**, not transcribed: 94 obligations (88 scenario + 3 shared + 1
  corpus + 2 assigned), 88 violating transcripts, 20 atomicity notes, 12 scenarios / 92 steps, rows
  5, 6, 10, 4, 34, 5, 16, 9, 2, 3.

## 5. K0.2-C8 — still externally blocked

Same posture as rounds 6–9: this packet writes nothing outside its own repository, and the criterion's
status does not depend on a new inspection. The blocker record is unchanged:

- **Responsible actor:** benchmark repository owner.
- **Unavailable input:** accepted E0 fixture/config identities, raw observations, evaluator version
  and the actual E0 decision at a pinned benchmark revision.
- **Unblock condition:** an accepted E0 deliverable at a pinned benchmark revision, with artifact
  identities recordable here and inspectable by an independent reviewer — standing as recorded in
  [review-09.md](review-09.md) at revision `98756f8c10bd806125da8318f1a129bc030aca61` (E0 planned,
  not implemented).

No E0 acceptance is claimed, implied or self-granted. Because C8 cannot pass, the packet is **not
review-ready as a whole**, and because K0.2 is K0's final gate packet, **K0 stays open**.

## 6. Whole-packet re-audit

- **Rounds 2–9 corrections preserved**, as listed in §4, except by addition.
- **All ten rows re-derived**, with row 3's zero-partial-state family completed against OA-5's own
  enumeration rather than against the row's parenthetical.
- **Every scenario still refused** by the refusing candidate: 12 of 12.
- **Corpus invariants re-run**: readiness lifetime, accepted-deadline pairing, stale-after-retirement
  no-op delivery, wait/batch/disposition interactions, timeout-generation minting, sink attribution,
  fenced-submission stability, Effect-intent emptiness.
- **Contract and specification reconciled**: contract revision 10, specification §16, and §15's
  superseded paragraph corrected in place rather than left standing. Every count re-derived from
  source.
- **Doc links resolve**: 54 internal relative links across the K0.2 directory, all resolving. No
  trailing whitespace or tabs in changed files; zero `@arrokothi/*` imports in the fixture; no
  document or test claims K0, E0 or E1 status.

## 7. Validation

Run on committed C10, clean tree.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | **1438 tests / 258 suites / 1438 pass / 0 fail / 0 skipped** |
| `npm run test:conformance` | 1329 pass / 0 fail |
| `npm run test:sdk` | 22 pass / 0 fail |
| `npm run check:builder-docs` | 26 files, 280 links/anchors, 38 imports |
| k0 fixture directory | 473 pass / 47 suites / 0 fail |
| architecture guards | 79 pass / 0 fail |

**The pre-existing suite is unchanged: 1438 − 473 = 965**, the same figure as rounds 1–9. The k0
directory grew 466 → 473 (+7: one violating transcript with its obligation-evidence and defended-by
tests, plus four round-9 regression tests).

`npm run test:evals` is not run: it requires provider credentials and network, and this packet adds no
eval. Third-party review: no third-party code, dependency, asset or service was added, copied or
adapted this round; the fixture remains dependency-free and the repository's dependency set is
untouched.

## 8. Self-found defects this round

- None beyond the finding. The one judgement this round still declines (§2's cancellation of an idle
  `WAITING` Execution) is stated against the accepted decisions rather than against a row's
  illustrative list, which is the specific error round 9 made.

**K0.2-SELF-01 remains open and unfixed, deliberately**, for the same reason as rounds 5–9: the
architecture guard's raw-text import scanner treats certain prose as a bare import; `specifiersIn`
also backs the live kernel import-graph guard, so changing it inside K0.2 risks weakening a real guard
for a cosmetic gain. Separate corrective packet. Re-verified: architecture tests pass, zero false
positives.

## 9. Limitations, stated plainly

- **This is a prepared fixture, not a result.** The only candidate speaking for the real tree refuses
  every scenario. Every `PASS` here is a hand-authored transcript proving the oracle works.
- **The atomicity notes do not prove atomicity.** Each proves that one specific bug construction via
  named writers moves these fields, with a pointer to where a second writer's partial is covered.
- **Nine rounds have now found defects in my reading of the worksheet**, not in code implementing it.
  Rounds 7, 8 and 9 were the same shape at increasing depth: a fact the observation could already see,
  at a boundary the inventory had not enumerated — and in round 9's case, one it had enumerated and
  then argued away. That remains the packet's dominant residual risk.
- **The three `shared` entries are judgements** that two §11 rows name one observable fact.
- **`effectIntents` and `acceptedDeadline` observe retained accepted state only**, and neither sees a
  conforming physical timer a retired wait leaves behind — the latter by design.
- **Contract revision 10 is my own wording**, not owner-approved; it corrects claims to match what the
  packet establishes and does not widen scope.

## 10. Where review effort is best spent

1. **Attack §2's boundary table by naming a tenth boundary**, with the accepted decision that asserts
   something about it. Three consecutive findings have been missing boundaries, not missing fields.
2. **Check that R3-c4 and R7-a6c really are two writers.** The claim is that whole-envelope validation
   (OA-3/OA-5) and the cancellation/terminal-conflict fence (CX-6) are separately orderable relative
   to a deadline commit.
3. **Apply round 9's own lesson to the other rows:** wherever this map's obligation text was derived
   from a §11 parenthetical rather than from the decision the row cites, the same error may be
   present. Row 3 is now done; rows 1, 2 and 8 are the next most parenthetical-shaped.
4. **Re-derive §11 independently against the 94 entries**, particularly R4-a3 and R10-c, whose
   shared-writer arguments are unchanged and still the softest justifications.

## 11. Handoff

- **Base:** `c079237ee7aff428481426f93e87a68b79f170d4` (unchanged).
- **Previously reviewed H9:** `80f2c887600bd2d611a7ef120d443fe6efbcb2d8` (CHANGES REQUIRED).
- **Reviewer record:** `269ed51e1f3adce44203aff4344bffbe3733122d` ([review-09.md](review-09.md)).
- **Clean validated payload C10:** `94aef9fd8398723fcce63963c4655cc2ba857c4c`.
- **Candidate H10:** this commit.
- **Verdict sought:** independent review of C1–C7 and C9. C8 is `BLOCKED_EXTERNAL` and is not offered
  for acceptance. **Not self-accepted, not merged, K0 not closed, K1.0 not released.**
