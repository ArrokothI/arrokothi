# Implementation report — K0.2, round 8

Correction round for the CHANGES REQUIRED verdict on H7, recorded in
[review-07.md](review-07.md). Rounds 1–7 are unchanged and remain as history.

The correction is **forward from C7**, as review-07.md directs. `K02-R6-01` is closed and stays
closed; everything the review lists as preserved is preserved. Only the accepted-deadline lifecycle
is newly owned assertion by assertion. §5 re-checks what was kept.

## Identity

- **Packet / parent:** K0.2 — public controls and the K0/E0 gate; parent milestone K0.
- **Contract:** [`contract.md`](contract.md), **revision 8**, at C8 below.
- **Governing process baseline:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **State: `BLOCKED_EXTERNAL`,** unchanged. C1–C7 and C9 are corrected and independently reviewable;
  C8 cannot be satisfied from this repository. See §6.
- **Owner release:** the original explicit release of 2026-09-11 still stands; corrections on a
  released packet need no renewed permission. No successor is started or released.
- **Branch:** `codex/k0.2-public-controls-e0-gate`. **Configured remote:** `origin`
  `https://github.com/ArrokothI/Agent_SDK.git`, unchanged.
- **Base commit:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **Previously reviewed H7:** `a9ea3d532c25e9074b7ce11bc102196058a6a41d` (CHANGES REQUIRED).
- **Reviewer record on the branch:** `1f3a4393756dda659559f9153844240e8e5830af` ([review-07.md](review-07.md)).
  Prior reviewer records `9c63b2c`, `a057a12`, `cec6674`, `55f11858`, `c3fcef35`, `3377a8c` remain
  historical provenance. None is modified here.
- **Clean payload C8:** `7206dbd64003d3bd32e220cf9ccefced0c9c1d4f`. Final validation ran on this tree.
- **Candidate H8:** the commit containing this report. Full SHA in the external handoff.
- **Exact C8..H8 administrative allowlist:** `docs/development/work/K0.2/implementation-08.md` (this
  file) and the K0.2 row in `docs/development/007-work-packets.md`. **No payload rides in H8.**
- **Correction delta:** `1f3a439..7206dbd` is 5 files, +211/−8.
- **Cumulative scope:** `c079237e..7206dbd` is 33 files, +11738/−6.
- **Working tree:** clean at C8 and at H8.

## 1. K02-R7-01 — the neutral deadline field owned three of its lifecycle transitions — **CLOSED**

**The finding is correct.** C7's `acceptedDeadline` was the right observation at the right layer,
but the inventory stayed at 87 obligations / 81 transcripts by renaming rather than re-deriving:
no assertion owned a durably registered wait dropping its deadline, or a correctly retired wait
leaving the deadline fact behind. The complete structural observation would incidentally reject such
transcripts — which the contract explicitly says does not count — the visible-but-unattributed mode
round 4 corrected. `forbids` prose and corpus invariants likewise do not substitute for
candidate-level evidence, per C7/C9's own rules.

**What was done.** Re-derived the accepted-deadline lifecycle against §11 row 5(c)/(d) at the
packet's independently-distinguishable-assertion granularity — registration paths, both retirement
species, and stale fencing — splitting wherever one writer can get one transition right and another
wrong. Five new obligations, five new single-field transcripts, no schedule or expectation changed
(the expectations already stated every deadline fact; only the owning counterexamples were missing):

- **Persistence (W-2 step 4): R5-c4** — a durably registered future-deadline wait carries its
  deadline. Transcript parks `WAITING` under the right generation with the fact dropped
  (`subscription step 3`, `1000` → null): the scheduler-only-hint misreading of W-9 in the other
  direction.
- **Registration-time immediate retirements:** R5-c5 (B-7 path A already-due at `subscription step
  6`: correct immediate retirement, `1` left behind) and R5-d4 (B-6 eligible Event at registration
  at `stale step 3`: correct immediate retirement, `1000` left behind). Each is the narrow partial
  of its path's full transaction — the walk commits the deadline before the check/retire clears
  bookkeeping but not the fact.
- **Current-expiry retirement (second row-5(d) species, B-7 path B): R5-d5** — timeout minted,
  generation retired, readiness committed at `stale step 7`, `2000` left live: the missed
  deadline-clearing write, narrower than lazy retirement (R5-d2 leaves the generation live outright).
- **Stale fencing (W-3): R5-f4** — a fenced delivery for a retired generation wipes the live
  deadline at `stale step 6` while retiring nothing, completing the f1a/f1a2/f1b wake/retire/Event
  halves for the deadline fact.

Every new transcript moves *only* `acceptedDeadline` at its step — five distinct
(scenario, step) points — so no split is cosmetic and no new `atomicity` note is owed (single field
group each). The path-A leftover additionally narrows R5-c3's five-field ordering-swap transcript to
its one-field partial, pinned as a proper subset. The cancellation-loser leak (R7-a6c) is untouched.

**What was deliberately not added.** No spurious-clearing-while-live transcript beyond the fencing
case (no writer story distinguishes it from R5-f4), no resurrection-on-redelivery transcript (a
redelivered timer re-committing a deadline without retiring would be expiry-handler plus
commit-ordering failures combined, not a single transition), and no step-1 acknowledgment entry (no
deadline involvement). The lifecycle now owned is: persist, clear-on-B-6, clear-on-path-A,
clear-on-path-B, fence-stale-clears-nothing, never-create-on-reject — the complete transition set
with one owner each.

## 2. What was preserved from C7/H7

- **K02-R6-01 stays closed:** `acceptedDeadline` remains the accepted logical deadline fact; no
  scheduler/timer-registration lifetime requirement was reintroduced. The W-3 stale-permissiveness
  regression and the no-mechanism-field guard pass unchanged (44 k0 suites, including the two
  round-6 tests).
- **K02-R5-01 stays closed:** per-family receipt/Activation-ID bijections and the cross-family-reuse
  probe are untouched (113 oracle-discrimination tests pass).
- **R3-b split, losing-`await` schedule, all existing splits intact:** conflict rejection/merge,
  cancel next-state/wait/deadline/readiness, and every round-2–6 split keep distinct field sets,
  re-verified by the no-shared-transcript and no-shared-field-set guards.
- **Heuristic-only coupling intact:** the twenty notes keep their writer-model constructions; the
  R5-c3 note now points at R5-c4/c5/d4/d5/f4 for the registration sub-partials it does not own.
- **Counts reconciled:** 92 obligations (86 scenario + 3 shared + 1 corpus + 2 assigned), 86
  violating transcripts, 20 atomicity notes, 12 scenarios / 90 steps, rows
  5, 6, 9, 4, 33, 5, 16, 9, 2, 3 — each re-derived from source (`node --experimental-strip-types`
  inventory check in §5's reconciliation, matching the contract and specification).

## 3. Mutation-checking, stated in the round's own terms

Round 7's defect is visible-but-unattributed, so the claims here mirror round 4's narrower form —
not "C7 passed these" (its full observation would incidentally reject them) but per-assertion
ownership:

- Each of the five transcripts carries exactly one assertion's worth of difference (one field), and
  the five (scenario, step) points are pairwise distinct — proven in `blind-spot-regression.test.ts`,
  not merely asserted.
- The path-A leftover is proven narrower than R5-c3's bundled swap (proper subset of moved fields
  at the same step), so the split cannot be cosmetic.
- `coverage.test.ts` independently enforces, corpus-wide, that no counterexample defends two
  obligations and no two transcripts at one step move the same field set — the two guards that make
  a split real.

## 4. Self-found defects this round

- None in the payload. The co-located field-set survey before drafting (script over all five target
  steps) confirmed every new single-field move is distinct from its neighbors; no transcript needed
  narrowing after the fact.

**K0.2-SELF-01 remains open and unfixed, deliberately**, for the same reason as rounds 5–7: the
architecture guard's raw-text import scanner treats certain prose as a bare import;
`specifiersIn` also backs the live kernel import-graph guard, so changing it inside K0.2 risks
weakening a real guard for a cosmetic gain. Separate corrective packet. Re-verified: architecture
tests pass, zero false positives.

## 5. Whole-packet re-audit

- **Rounds 2–7 corrections preserved**, as listed in §2. Reason-text, hold-text, per-family token
  relations, readiness/Effect-intent/deadline surfaces and the losing-`await` schedule are unchanged
  except by addition.
- **All ten rows re-derived** against the writer-model rule with the deadline lifecycle completed;
  no further independently-violable deadline transition was found (see §1's deliberately-not-added).
- **Every scenario still refused** by the refusing candidate: 12 of 12.
- **Corpus invariants re-run**: readiness lifetime, Effect-intent emptiness, accepted-deadline
  pairing and stale-after-retirement no-op delivery, wait/batch/disposition interactions, sink
  attribution, fenced-submission stability.
- **Contract and specification reconciled**: contract revision 8, specification §14, all counts
  re-derived from source rather than transcribed.
- **32 internal K0.2 doc links resolve**; no trailing whitespace or tabs; zero `@arrokothi/*` imports
  in the fixture; no document or test claims K0, E0 or E1 status.

## 6. K0.2-C8 — still externally blocked

Same posture as rounds 6–7: this packet writes nothing outside its own repository, and the
criterion's status does not depend on a new inspection. The blocker record is unchanged:

- **Responsible actor:** benchmark repository owner.
- **Unblock condition:** an accepted E0 deliverable at a pinned benchmark revision, with artifact
  identities recordable here and inspectable by an independent reviewer — standing as recorded in
  [review-07.md](review-07.md) at revision `98756f8c10bd806125da8318f1a129bc030aca61` (E0 planned,
  not implemented).

No E0 acceptance is claimed, implied or self-granted. Because C8 cannot pass, the packet is **not
review-ready as a whole**, and because K0.2 is K0's final gate packet, **K0 stays open**.

## 7. Validation

Run on committed C8, clean tree.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | **1424 tests / 256 suites / 1424 pass / 0 fail / 0 skipped** |
| `npm run test:conformance` | 1315 pass / 0 fail |
| `npm run test:sdk` | 22 pass / 0 fail |
| `npm run check:builder-docs` | 26 files, 280 links/anchors, 38 imports |
| k0 fixture directory | 459 pass / 45 suites / 0 fail |
| architecture guards | 79 pass / 0 fail |

**The pre-existing suite is unchanged: 1424 − 459 = 965**, the same figure as rounds 1–7. The k0
directory grew 442 → 459 (+17: five violating transcripts with their five obligation-evidence and
five defended-by tests, plus two blind-spot regression tests).

`npm run test:evals` is not run: it requires provider credentials and network, and this packet adds no
eval. Third-party review: no third-party code, dependency, asset or service was added, copied or
adapted this round; the fixture remains dependency-free and the repository's dependency set is
untouched.

## 8. Limitations, stated plainly

- **This is a prepared fixture, not a result.** The only candidate speaking for the real tree refuses
  every scenario. Every `PASS` here is a hand-authored transcript proving the oracle works.
- **The atomicity notes do not prove atomicity.** Each proves that one specific bug construction via
  named writers moves these fields, with a pointer to where a second writer's partial is covered.
- **Seven rounds have now found defects in my reading of the worksheet**, not in code implementing
  it. That remains the packet's dominant residual risk.
- **The three `shared` entries are judgements** that two §11 rows name one observable fact.
- **`effectIntents` and `acceptedDeadline` observe retained accepted state only**, and neither sees a
  conforming physical timer a retired wait leaves behind — the latter by design.
- **Contract revision 8 is my own wording**, not owner-approved; it corrects claims to match what the
  packet establishes and does not widen scope.

## 9. Where review effort is best spent

1. **Attack the five new single-field transcripts.** Each claims one writer fails exactly one
   deadline transition. A reviewer who exhibits a single-writer bug moving *less* than the transcript
   (impossible — it moves one field) or a plausible two-transition bug the five do not factor has
   found a real gap; §1 names the three deliberately excluded.
2. **Re-derive §11 independently against the 92 entries**, particularly R4-a3 and R10-c, whose
   shared-writer arguments across shapes are unchanged and still the softest justifications.
3. **Check the per-family bijection, the losing-`await` schedule, and the C5 R3-b transcription.**
   All unchanged.
4. **Check `acceptedDeadline`'s neutrality once more.** Unchanged since round 6; the new entries
   widen what it must distinguish, which is also what would expose a non-neutral reading.

## 10. Handoff

- **Base:** `c079237ee7aff428481426f93e87a68b79f170d4` (unchanged).
- **Previously reviewed H7:** `a9ea3d532c25e9074b7ce11bc102196058a6a41d` (CHANGES REQUIRED).
- **Reviewer record:** `1f3a4393756dda659559f9153844240e8e5830af` ([review-07.md](review-07.md)).
- **Clean validated payload C8:** `7206dbd64003d3bd32e220cf9ccefced0c9c1d4f`.
- **Candidate H8:** this commit.
- **Verdict sought:** independent review of C1–C7 and C9. C8 is `BLOCKED_EXTERNAL` and is not offered
  for acceptance. **Not self-accepted, not merged, K0 not closed, K1.0 not released.**
