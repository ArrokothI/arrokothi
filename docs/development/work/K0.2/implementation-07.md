# Implementation report — K0.2, round 7

Correction round for the CHANGES REQUIRED verdict on H6, recorded in
[review-06.md](review-06.md). Rounds 1–6 are unchanged and remain as history.

The correction is **forward from C6**, as review-06.md directs. `K02-R5-01` is closed and stays
closed; the good parts of the K02-R5-02 correction are preserved. Only the timer-mechanism
observation is replaced. §5 re-checks what was kept.

## Identity

- **Packet / parent:** K0.2 — public controls and the K0/E0 gate; parent milestone K0.
- **Contract:** [`contract.md`](contract.md), **revision 7**, at C7 below.
- **Governing process baseline:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **State: `BLOCKED_EXTERNAL`,** unchanged. C1–C7 and C9 are corrected and independently reviewable;
  C8 cannot be satisfied from this repository. See §6.
- **Owner release:** the original explicit release of 2026-09-11 still stands; corrections on a
  released packet need no renewed permission. No successor is started or released.
- **Branch:** `codex/k0.2-public-controls-e0-gate`. **Configured remote:** `origin`
  `https://github.com/ArrokothI/Agent_SDK.git`, unchanged.
- **Base commit:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **Previously reviewed H6:** `c9798894db6f8d844cf0abcc4365c1fa30ef71fe` (CHANGES REQUIRED).
- **Reviewer record on the branch:** `3377a8c834a07c5170b2cfdd4b76269021341733` ([review-06.md](review-06.md)).
  Prior reviewer records `9c63b2c`, `a057a12`, `cec6674`, `55f11858`, `c3fcef35` remain historical
  provenance. None is modified here.
- **Clean payload C7:** `e9c145023246cc61e8ad65405cc724dabb22c1b1`. Final validation ran on this tree.
- **Candidate H7:** the commit containing this report. Full SHA in the external handoff.
- **Exact C7..H7 administrative allowlist:** `docs/development/work/K0.2/implementation-07.md` (this
  file) and the K0.2 row in `docs/development/007-work-packets.md`. **No payload rides in H7.**
- **Correction delta:** `3377a8c..e9c1450` is 8 files, +291/−141.
- **Cumulative scope:** `c079237e..e9c1450` is 31 files, +11164/−6.
- **Working tree:** clean at C7 and at H7.

## 1. K02-R6-01 — the deadline observation measured scheduler mechanism — **CLOSED**

**The finding is correct.** C6 observed R7-a6c's deadline half as `pendingTimers`, documented as
persisted timer registrations with a corpus invariant that timers "live exactly while a deadline
wait is live". The accepted worksheet separates the layers this merges:

- W-2 step 4 persists `WAITING` "with the live registration, its generation **and its deadline**";
  OA-4 commits that wait/deadline in the atomic accepted set, and OA-5/CX-6 forbid it for rejected
  Outcomes. The accepted deadline is Kernel semantic state.
- W-3 requires a timer scheduled for a retired generation to arrive later as a stale no-op, and
  W-2 says the same for a generation retired during registration. Late delivery must be fenceable,
  not absent.
- W-9/§4 leave timer mechanism, storage layout, deadline units/precision and the instant source
  implementation-owned.

A conforming implementation retaining a physical timer after logical retirement — then fencing its
late delivery as stale — failed C6's invariant for scheduler retention. That is the same
over-constraint class as rejection text, subscription spelling and token namespaces in earlier
rounds: an implementation-owned mechanism turned into pass/fail behavior. The losing-`await`
schedule was never the problem and is unchanged.

**What was done.** `Observation.pendingTimers: string[]` is replaced by
`Observation.acceptedDeadline: number | null` — the accepted logical deadline fact, non-null
exactly while a deadline wait is live (`2000` under `g2`, `1000` under `gd1`, `1` in the
persisted-past-deadline transcript), null for a rejected losing `await`, for live waits without
deadlines, and for retired waits. Retirement clears the logical fact and requires no physical timer
cancellation or removal; a retained physical timer with a null accepted deadline is conforming and,
by construction, unobservable here. The generation key for a non-null value is the sibling
`liveWaitGeneration` — together they are the "record keyed by generation" the review permits.
Deadline values are fixture-supplied (the `deadline` of a submitted `WaitRecord`), so comparison is
literal laboratory data like Event IDs and generations — unlike the candidate-minted
receipt/Activation-ID families, whose relational comparison is untouched.

The three-way distinction the review requires falls out directly: accepted-and-live (non-null
beside the live generation), rejected-loser (null beside `CANCELLED` and the CX-6 rejection), and
retired (null beside `READY`/terminal even though a previously scheduled physical timer may still
arrive later and be fenced as stale — steps 6 and 8 of the stale-timer control still schedule
exactly such deliveries and still require harmless no-ops).

R7-a6c's transcript is renamed `control-cancel/losing-await-accepts-a-deadline` and leaks only
`5000` beside `CANCELLED`, a correct CX-6 rejection and null live generation: a leaked *accepted
fact*, not retained scheduler state. The withheld-timeout and persisted-past-deadline transcripts
now carry the live accepted deadline (`1000`, `1`) instead of timer lists, with their writer-model
notes reworded to the same semantics (upstream routing/ordering decision plus the absence of the one
downstream B-7 transaction; "nothing here constrains physical timer handles" stated in both).

**Sweep.** Every place that stated the stronger timer-mechanism rule was rewritten:
`fixture.ts` (field documentation; the fixture-supplied-data list now names deadline values),
the losing-`await` comment and step-11 `forbids`, the stale-timer and W-8-case-6 expectations and
`forbids`, the three deadline transcripts' bugs/fields, the R5-b4/R5-c3/C6-heuristic/`lifecycle`
notes (timer writers renamed to expiry/acceptance writers or to the accepted deadline), the
`TokenRelation` sweep note, and the contract C6/C9 text plus specification §1/§3/§12 (new §13
records this round). `implementation-06.md` and all review records are history and are not edited;
they still describe C6 accurately.

## 2. What was preserved from C6/H6

- **K02-R5-01 stays closed:** separate `receiptTokens`/`activationTokens` bijections and the
  cross-family-reuse probe (`opaque-1`/`opaque-2` shared across families pass; same-family collapse
  still fails) are byte-identical in behavior. No runner change this round.
- **R3-b split intact:** recorded-rejection (R3-b) vs. no-merge-beside-correct-rejection (R3-b2),
  with the dedicated conflict-path transcript and the C5 field-division pin, unchanged.
- **Losing-`await` schedule intact:** step 11 still submits the well-formed deadline-bearing `await`
  for the cancelled Execution and still expects the fenced observation (now with null accepted
  deadline). `controls.test.ts` still asserts the fence covers `continue`, `complete` and the
  deadline-bearing `await`.
- **Wait/readiness/next-state counterexamples intact:** `losing-await-registers-a-wait`,
  `losing-await-arms-a-readiness` and `losing-outcome-moves-the-execution-off-terminal` are
  unchanged; only the deadline half was redefined.
- **Heuristic status intact:** `COUPLED_FIELD_GROUPS` remains a review prompt with writer-model
  notes; the twenty notes keep their constructions, reworded only where they mentioned timers.
- **Counts unchanged:** 87 obligations (81 scenario + 3 shared + 1 corpus + 2 assigned), 81
  violating transcripts (one renamed), 20 atomicity notes, 12 scenarios / 90 steps, rows
  5, 6, 9, 4, 28, 5, 16, 9, 2, 3.

## 3. Mutation-checking the redefinition, in both directions

This round's defect runs opposite to round 3's blind spots (which passed violators) and like
round 2's and round 5's over-constraints (which failed conformers), so both directions are pinned:

- **A conforming stale-timer mechanism now passes.** Under C6 it failed the "no timers outside
  `WAITING`" invariant for retaining a physical timer after retirement. The replacement invariant
  constrains only the logical fact, and the W-3 regression in `interactions.test.ts` proves the
  schedule still delivers timers for already-retired generations (`g1` at step 6, `g2` at step 8)
  and requires them to be harmless no-ops that change no logical fact — a test that is unsatisfiable
  under an eager-cancellation reading, since the delivery must still arrive.
- **The genuine leak still fails.** The renamed transcript — `CANCELLED`, correct CX-6 rejection,
  null live generation, `acceptedDeadline: 5000` — fails on the deadline field alone, with state and
  generation held correct to prove the observation (not an inference) does the work.
- **The mechanism cannot come back silently.** `blind-spot-regression.test.ts` asserts no observation
  key constrains timer/scheduler/registration mechanism under any name, and pins retirement (step 7:
  `READY`, deadline null) preceding a still-permitted stale delivery (step 8). Reintroducing a
  handle-lifetime field fails there before it can recouple the oracle.

## 4. Self-found defects this round

- **K0.2-SELF-15 — the new stale-regression test qualified its own generation as stale.** Its first
  draft accumulated the current step's readiness before evaluating the delivery, so B-7 path B's own
  expiry delivery (step 7, which creates `g2` readiness here) counted as a stale delivery for a
  retired generation and failed on the legitimate `WAITING`→`READY` transition. Fixed before commit:
  only generations retired by *previous* steps qualify. The defect was in new material under
  construction, not in a reviewed payload, and is recorded here rather than silently fixed.
- **K0.2-SELF-16 — three normative-voice "timer writer" phrases survived the first sweep pass.**
  The `lifecycle` group rationale, the fixture-supplied-data list and a candidate comment still
  named timer persistence as a writer/mechanism in the fixture's own voice (as opposed to bug
  narratives, which may describe a violator's timer mishandling). All three now name the accepted
  deadline or the canonical expiry handler. Found by re-grepping, not by a test failure.

**K0.2-SELF-01 remains open and unfixed, deliberately**, for the same reason as rounds 5–6: the
architecture guard's raw-text import scanner treats certain prose as a bare import;
`specifiersIn` also backs the live kernel import-graph guard, so changing it inside K0.2 risks
weakening a real guard for a cosmetic gain. Separate corrective packet. Re-verified: architecture
tests pass, zero false positives.

## 5. Whole-packet re-audit

- **Rounds 2–6 corrections preserved.** R5-a4 stays assigned to K1.3 with the W-9 quotation; the
  empty subscription identity stays well formed and no scenario requires rejecting one. All valid
  splits (progress/emissions, retire/wake, completion five, terminal two, duplicate
  acceptance/emission, W-4 lifecycle/record, retry receipt/rejection, conflict rejection/merge,
  cancel next-state/wait/deadline/readiness) are intact with distinct field sets re-verified; R7-a8
  stays composite because M-1 names it. Reason-text, hold-text and per-family token handling are
  unchanged and re-exercised (113 oracle-discrimination tests pass, including the cross-family probe).
- **All ten rows re-derived** against the writer-model rule with the timer sweep applied to every
  normative-voice claim, not only the review-named files; the sweep found SELF-16 above.
- **Every scenario still refused** by the refusing candidate: 12 of 12.
- **Corpus invariants re-run**: readiness lifetime, Effect-intent emptiness, accepted-deadline
  pairing (non-null only beside the live wait; every pair a submitted one; live and fenced cases
  both present), stale-after-retirement no-op delivery, wait/batch/disposition interactions, sink
  attribution, fenced-submission stability (null deadline and empty readiness alongside null live
  generation and `CANCELLED`).
- **Contract and specification reconciled**: contract revision 7, specification §13, all counts
  re-derived from source rather than transcribed (87: 81 scenario + 3 shared + 1 corpus +
  2 assigned; 20 notes; 81 transcripts; 12 scenarios / 90 steps).
- **32 internal K0.2 doc links resolve**; no trailing whitespace or tabs; zero `@arrokothi/*` imports
  in the fixture; no document or test claims K0, E0 or E1 status.

## 6. K0.2-C8 — still externally blocked

Same posture as round 6: this packet writes nothing outside its own repository, and the criterion's
status does not depend on a new inspection. The blocker record is unchanged:

- **Responsible actor:** benchmark repository owner.
- **Unblock condition:** an accepted E0 deliverable at a pinned benchmark revision, with artifact
  identities recordable here and inspectable by an independent reviewer — standing as recorded in
  [review-06.md](review-06.md) at revision `98756f8c10bd806125da8318f1a129bc030aca61` (E0 planned,
  not implemented).

No E0 acceptance is claimed, implied or self-granted. Because C8 cannot pass, the packet is **not
review-ready as a whole**, and because K0.2 is K0's final gate packet, **K0 stays open**.

## 7. Validation

Run on committed C7, clean tree.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | **1407 tests / 255 suites / 1407 pass / 0 fail / 0 skipped** |
| `npm run test:conformance` | 1298 pass / 0 fail |
| `npm run test:sdk` | 22 pass / 0 fail |
| `npm run check:builder-docs` | 26 files, 280 links/anchors, 38 imports |
| k0 fixture directory | 442 pass / 44 suites / 0 fail |
| architecture guards | 79 pass / 0 fail |

**The pre-existing suite is unchanged: 1407 − 442 = 965**, the same figure as rounds 1–6. The k0
directory grew 440 → 442 (+2: the W-3 stale-delivery regression and the no-mechanism-field guard).

`npm run test:evals` is not run: it requires provider credentials and network, and this packet adds no
eval. Third-party review: no third-party code, dependency, asset or service was added, copied or
adapted this round; the fixture remains dependency-free and the repository's dependency set is
untouched.

## 8. Limitations, stated plainly

- **This is a prepared fixture, not a result.** The only candidate speaking for the real tree refuses
  every scenario. Every `PASS` here is a hand-authored transcript proving the oracle works.
- **The atomicity notes do not prove atomicity.** Each proves that one specific bug construction via
  named writers moves these fields, with a pointer to where a second writer's partial is covered. If
  a note names the wrong writers, the guard passes and the entry is still bundled.
- **Six rounds have now found defects in my reading of the worksheet**, not in code implementing it.
  That remains the packet's dominant residual risk, and the guards added since round 3 make wrong
  readings *visible to a reviewer who checks* rather than impossible.
- **The three `shared` entries are judgements** that two §11 rows name one observable fact.
- **`effectIntents` and `acceptedDeadline` cannot see a value constructed and discarded inside a
  rejected transaction.** Both observe retained accepted state; a value leaving no accepted record is
  unobservable by any means, since 001's K0 exit asks for an observable result and nothing
  unobservable was committed. Symmetrically, neither observes a conforming physical timer a retired
  wait leaves behind — that is the point, not a gap.
- **Contract revision 7 is my own wording**, not owner-approved; it corrects claims to match what the
  packet establishes and does not widen scope.

## 9. Where review effort is best spent

1. **Attack `acceptedDeadline`'s neutrality.** It observes a scalar beside the live generation. The
   question is whether any canonical accepted-deadline-adjacent semantic is missed: a reviewer who
   exhibits two implementations this field cannot distinguish — one conforming, one violating
   CX-6/OA-5's deadline clause — has found a real gap. The generation-pairing check in
   `interactions.test.ts` is where a divergence would have to hide.
2. **Re-derive §11 independently against the 87 entries**, particularly R4-a3 (Effect-strip plus
   full-remainder commit, with committer partials at R3-c1/c1b on a different envelope shape) and
   R10-c (whole-retraction). Those two rely on a shared-writer argument across shapes; unchanged
   this round and still the softest justification.
3. **Check the per-family bijection against ID-3/ID-6.** Two relations, unchanged; if some decision
   fixes more than the within-family relation, the oracle is under-constrained there.
4. **Check the losing-`await` schedule against CX-6/OA-4/W-2.** Unchanged except the observed field;
   if the fenced `await` fixes something observable beyond wait/deadline/readiness/next-state plus
   the recorded rejection, the step needs widening.
5. **Check `blind-spot-regression.test.ts`'s transcribed C5 field set for R3-b against `159f3dc`.**
   Unchanged.

## 10. Handoff

- **Base:** `c079237ee7aff428481426f93e87a68b79f170d4` (unchanged).
- **Previously reviewed H6:** `c9798894db6f8d844cf0abcc4365c1fa30ef71fe` (CHANGES REQUIRED).
- **Reviewer record:** `3377a8c834a07c5170b2cfdd4b76269021341733` ([review-06.md](review-06.md)).
- **Clean validated payload C7:** `e9c145023246cc61e8ad65405cc724dabb22c1b1`.
- **Candidate H7:** this commit.
- **Verdict sought:** independent review of C1–C7 and C9. C8 is `BLOCKED_EXTERNAL` and is not offered
  for acceptance. **Not self-accepted, not merged, K0 not closed, K1.0 not released.**
