# Implementation report — K0.2, round 9

Correction round for the CHANGES REQUIRED verdict on H8, recorded in
[review-08.md](review-08.md). Rounds 1–8 are unchanged and remain as history.

The correction is **forward from C8**, as review-08.md directs. All five round-8 deadline transcripts
are preserved unchanged, `acceptedDeadline` remains accepted logical deadline state only, and no
physical timer-registration or cancellation lifetime requirement is reintroduced anywhere. §5
re-checks what was kept.

## Identity

- **Packet / parent:** K0.2 — public controls and the K0/E0 gate; parent milestone K0.
- **Contract:** [`contract.md`](contract.md), **revision 9**, at C9 below.
- **Governing process baseline:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **State: `BLOCKED_EXTERNAL`,** unchanged. C1–C7 and C9 are corrected and independently reviewable;
  C8 cannot be satisfied from this repository. See §6.
- **Owner release:** the original explicit release of 2026-09-11 still stands; corrections on a
  released packet need no renewed permission. No successor is started or released.
- **Branch:** `codex/k0.2-public-controls-e0-gate`. **Configured remote:** `origin`
  `https://github.com/ArrokothI/Agent_SDK.git`, unchanged.
- **Base commit:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **Previously reviewed H8:** `c254c7faa414f9046fdab8c55a06b829529d7789` (CHANGES REQUIRED).
- **Reviewer record on the branch:** `adb2b7791f674c9a7e4c988010bda60f60a15804` ([review-08.md](review-08.md)).
  Prior reviewer records `9c63b2c`, `a057a12`, `cec6674`, `55f11858`, `c3fcef35`, `3377a8c`,
  `1f3a439` remain historical provenance. None is modified here.
- **Clean payload C9:** `bba23e3c67c918510d480bc2a5df000c1d275159`. Final validation ran on this tree.
- **Candidate H9:** the commit containing this report. Full SHA in the external handoff.
- **Exact C9..H9 administrative allowlist:** `docs/development/work/K0.2/implementation-09.md` (this
  file) and the K0.2 row in `docs/development/007-work-packets.md`. **No payload rides in H9.**
- **Correction delta:** `adb2b77..bba23e3` is 6 files, +285/−14.
- **Cumulative scope:** `c079237e..bba23e3` is 35 files, +12339/−6.
- **Working tree:** clean at C9 and at H9.

## 1. K02-R8-01 — deadline cleanup unowned on B-6 path B — **CLOSED**

**The finding is correct.** Round 8 re-derived the accepted-deadline lifecycle and still treated
"eligible wake" as one boundary. B-6 reaches one state through two, and the accepted worksheet states
them separately:

- **path A** — Outcome acceptance creates the registration, W-2 step 2 finds an already-accepted
  eligible Event, and the registration, generation and readiness are settled inside that same Outcome
  transaction. The deadline-clearing writer lives in Outcome acceptance.
- **path B** — the Execution is already durably `WAITING`, and a later eligible Event retires the
  registration and creates readiness at **that Event's own acceptance boundary**, with no Outcome
  anywhere in the transaction. The deadline-clearing writer lives in Event acceptance/ingress routing.

R5-d4's evidence was path A. The corpus's only path-B wake (`k0-trace` step 6) registers a wait with
no deadline, and the two deadline-bearing waits that reached durable `WAITING` (`g2`, `gd1`) both
ended through timer expiry. So the schedule needed to construct the one-field violating transcript
did not exist, and a candidate could persist the deadline correctly, clear it on the path-A immediate
wake, clear it on expiry, and still leave it live after a path-B wake — reporting `state = READY`,
`liveWaitGeneration = null`, the correct Event-triggered readiness and the correct Event/mailbox
facts throughout.

**What was done.** One new schedule, one new obligation, one new transcript.

The two steps are appended to `control-stale-timer-and-lost-wake` rather than to the W-8 case-6
deadline control, deliberately: that scenario already owns B-6 **path A** at step 3, B-7 path B at
step 7 and W-3 stale fencing at step 6, so the path-A / path-B contrast the finding turns on is
readable within one schedule instead of across two. It also keeps the addition to two steps, since
the Execution is already `RUNNING` with an unresolved Activation after step 10.

- **step 11 (`submit_outcome`)** — `g3` is a wait on `corr-3` with a **future** deadline of 3000. This
  Outcome's own batch (`to-g2`, `res-2`) is acknowledged by W-2 step 1, so the mailbox holds nothing
  eligible at step 2 and nothing is due at step 3; step 4 persists. The observation is `WAITING`,
  `liveWaitGeneration` `g3`, `acceptedDeadline` 3000 — a *live* accepted deadline, which is what makes
  the next step able to tell forgotten cleanup apart from a deadline never accepted at all.
- **step 12 (`accept_event` `res-3`)** — path B. The conforming observation is `READY`,
  `liveWaitGeneration` null, exactly one **Event-triggered** readiness for `g3`, `res-3` queued and
  unacknowledged, `progressRevision` unadvanced and `acknowledged` unchanged (no Outcome in the
  transaction), and `acceptedDeadline` back to null.
- **R5-d6** owns that transition: "(d) A later eligible Event retires the accepted deadline at that
  Event's own acceptance boundary (B-6 path B)…". Its transcript,
  `control-stale-timer/path-B-wake-leaves-the-accepted-deadline`, leaves 3000 behind and moves
  **nothing else** — the plausible bug being that deadline cleanup was written once, in the
  Outcome-acceptance and expiry paths, and never on the path where an Event ends a parked wait.
- **R5-d4** is narrowed to name path A and the Outcome-acceptance transaction explicitly, so the two
  entries cannot be read as one. R5-c3's atomicity note now lists R5-d6 among the sub-partial owners.

Nothing about physical timers is asserted at either step. A conforming implementation may still hold
a timer registered for `g3` that never fires, or fires later and is fenced as a stale no-op exactly as
`g1`'s is at step 6.

**Regression guards** (`blind-spot-regression.test.ts`, round-8 block) pin what makes this evidence
rather than decoration: that the wait parks with a live accepted deadline *before* the wake; that the
wake is an `accept_event` and not a `deliver_timer`, with the progress revision and acknowledgment set
unchanged across it; that the transcript moves exactly `acceptedDeadline` to the retired wait's own
value; that no other transcript shares that step; that path A's step is a `submit_outcome` and path
B's an `accept_event`, so the split cannot be collapsed later; and that `k0-trace`'s path-B wake stays
deadline-less and therefore cannot absorb the assertion.

## 2. The whole accepted-deadline sweep, re-run rather than assumed

review-08.md asks explicitly that the new entry not be assumed to close neighboring transitions. The
sweep was redone from the boundary side: enumerate every point in the corpus at which a deadline is
either **submitted** (an `await` carrying one) or **live** (a `WAITING` Execution with a non-null
accepted deadline), classify the transition, and require a transcript moving only `acceptedDeadline`
for each distinct species.

| Boundary / writer | Species | Owner |
|---|---|---|
| W-2 step 4, Outcome acceptance | persist with the live registration | R5-c4 |
| W-2 step 3, Outcome acceptance | ordering: a past deadline is never persisted as live | R5-c3 |
| B-7 path A, Outcome acceptance | already-due: immediate retirement leaves no fact | R5-c5 |
| B-6 path A, Outcome acceptance | already-accepted eligible Event: immediate retirement leaves no fact | R5-d4 |
| B-7 path B, expiry handler | current-generation expiry retires the fact with the generation | R5-d5 |
| **B-6 path B, Event acceptance** | **a later eligible Event retires the fact with the registration** | **R5-d6 (new)** |
| W-3, fenced delivery | a stale timer clears nothing, including the live fact | R5-f4 |
| CX-6/OA-5, rejected Outcome | a fenced losing `await` accepts no fact | R7-a6c |

Species with more than one occurrence are owned once and re-observed elsewhere: persistence appears at
three points (`stale` 5 and 11, `subscription` 3), current-expiry retirement at two (`stale` 7,
`subscription` 4). Occurrences do not need separate owners; boundaries do.

**One point the sweep surfaces and this round deliberately does not own.** At
`control-whole-envelope-validation` step 4 a malformed wait carrying a deadline of 5000 is refused at
envelope validation; no transcript there moves only `acceptedDeadline`. It is left unowned because
§11 states a zero-deadline clause exactly once, in row 7 ("zero acknowledgment, progress, emissions,
Effect intents or wait/deadline/next-state changes"), where R7-a6c owns it. Row 3's zero-partial-state
clause enumerates progress, Effect intent and acknowledgment — which is why the row-3 family is
R3-c1/R3-c1b/R3-c2/R3-c3 and has no deadline member — and row 5(a)'s assertion at that step is that
the declaration is refused, which R5-a1b owns. Manufacturing an assertion the worksheet does not state
is the round-4 K02-R4-01 failure mode, and R5-a4's assignment is the precedent for declining it. This
is recorded so a reviewer can disagree with a stated claim rather than find a silent gap; if the
judgement is wrong, the remedy is one more single-field transcript at that step.

**Also considered and not owed:** cancellation accepted against an idle `WAITING` Execution carrying a
live deadline. §11 row 7's cell is entirely about the race with an in-flight Outcome and its reverse
order; it states no assertion about cancelling a parked Execution, and inventing a schedule for one
would widen the inventory beyond §11.

## 3. What was preserved from C8/H8

- **All five round-8 transcripts intact and unmoved:** W-2 step-4 persistence (R5-c4), B-7 path-A
  immediate cleanup (R5-c5), B-6 path-A immediate cleanup (R5-d4), B-7 path-B current-expiry cleanup
  (R5-d5) and W-3 stale-delivery preservation (R5-f4). Each still moves exactly one field at its own
  step; the round-7 regression block asserting the five distinct points and the R5-c3 narrowing passes
  unchanged.
- **K02-R6-01 stays closed:** `acceptedDeadline` is still the accepted logical deadline fact. No
  observation key names a timer, scheduler or registration; retirement never requires physical
  cancellation; the stale-after-retirement delivery guard still requires a late timer to be a harmless
  no-op. Both round-6 guards pass unchanged.
- **K02-R5-01 stays closed:** per-family receipt/Activation-ID bijections and the cross-family-reuse
  probe are untouched (119 oracle-discrimination tests pass).
- **R3-b split, losing-`await` schedule, all existing splits intact**, re-verified by the
  no-shared-transcript and no-shared-field-set guards over the enlarged corpus.
- **Heuristic-only coupling intact:** still twenty `atomicity` notes, unchanged constructions. R5-d6
  moves one field and owes none.
- **C8 stays `BLOCKED_EXTERNAL`** and is not offered for acceptance. Nothing is self-accepted or
  merged; K0 is not closed and K1.0 is not released.
- **Counts reconciled from source**, not transcribed: 93 obligations (87 scenario + 3 shared + 1
  corpus + 2 assigned), 87 violating transcripts, 20 atomicity notes, 12 scenarios / 92 steps, rows
  5, 6, 9, 4, 34, 5, 16, 9, 2, 3.

## 4. Mutation-checking, stated in the round's own terms

Round 8's defect is a missing *schedule*, not a missing label, so the claim here is narrower than
"C8 passed this": C8's corpus could not express the trace at all.

- The new transcript carries exactly one assertion's worth of difference (one field), at a
  (scenario, step) point no other transcript occupies.
- Path A and path B are pinned to different command kinds at different steps, so a later edit cannot
  reduce the split to two names for one mutation.
- `coverage.test.ts` independently re-enforces, corpus-wide, that no counterexample defends two
  obligations and that no two transcripts at one step move the same field set.
- The conforming transcript still passes all twelve scenarios, and all 87 violating transcripts still
  fail at their exact step naming their exact field.

## 5. Whole-packet re-audit

- **Rounds 2–8 corrections preserved**, as listed in §3, except by addition.
- **All ten rows re-derived** against the writer-model rule, with the sweep in §2 redone from the
  boundary side rather than from the field side.
- **Every scenario still refused** by the refusing candidate: 12 of 12.
- **Corpus invariants re-run** over the enlarged corpus: readiness lifetime (≤1 outstanding, never
  naming the live generation, only while `READY`, consumed at reservation, never fabricated),
  accepted-deadline pairing, stale-after-retirement no-op delivery, wait/batch/disposition
  interactions, timeout-generation minting, sink attribution, fenced-submission stability,
  Effect-intent emptiness.
- **Contract and specification reconciled**: contract revision 9, specification §15, every count
  re-derived from source.
- **Doc links resolve**: 19 internal relative links across the three K0.2 documents this round
  touches, and 54 across the whole K0.2 directory, all resolving. No trailing whitespace or tabs in
  changed files; zero `@arrokothi/*` imports in the fixture; no document or test claims K0, E0 or E1
  status.

## 6. K0.2-C8 — still externally blocked

Same posture as rounds 6–8: this packet writes nothing outside its own repository, and the criterion's
status does not depend on a new inspection. The blocker record is unchanged:

- **Responsible actor:** benchmark repository owner.
- **Unavailable input:** accepted E0 fixture/config identities, raw observations, evaluator version
  and the actual E0 decision at a pinned benchmark revision.
- **Unblock condition:** an accepted E0 deliverable at a pinned benchmark revision, with artifact
  identities recordable here and inspectable by an independent reviewer — standing as recorded in
  [review-08.md](review-08.md) at revision `98756f8c10bd806125da8318f1a129bc030aca61` (E0 planned,
  not implemented).

No E0 acceptance is claimed, implied or self-granted. Because C8 cannot pass, the packet is **not
review-ready as a whole**, and because K0.2 is K0's final gate packet, **K0 stays open**.

## 7. Validation

Run on committed C9, clean tree.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | **1431 tests / 257 suites / 1431 pass / 0 fail / 0 skipped** |
| `npm run test:conformance` | 1322 pass / 0 fail |
| `npm run test:sdk` | 22 pass / 0 fail |
| `npm run check:builder-docs` | 26 files, 280 links/anchors, 38 imports |
| k0 fixture directory | 466 pass / 46 suites / 0 fail |
| architecture guards | 79 pass / 0 fail |

**The pre-existing suite is unchanged: 1431 − 466 = 965**, the same figure as rounds 1–8. The k0
directory grew 459 → 466 (+7: one violating transcript with its obligation-evidence and defended-by
tests, plus four round-8 regression tests).

`npm run test:evals` is not run: it requires provider credentials and network, and this packet adds no
eval. Third-party review: no third-party code, dependency, asset or service was added, copied or
adapted this round; the fixture remains dependency-free and the repository's dependency set is
untouched.

## 8. Limitations, stated plainly

- **This is a prepared fixture, not a result.** The only candidate speaking for the real tree refuses
  every scenario. Every `PASS` here is a hand-authored transcript proving the oracle works.
- **The atomicity notes do not prove atomicity.** Each proves that one specific bug construction via
  named writers moves these fields, with a pointer to where a second writer's partial is covered.
- **Eight rounds have now found defects in my reading of the worksheet**, not in code implementing it,
  and the last two were the same shape: a fact the observation could see, at a boundary the inventory
  had not enumerated. That remains the packet's dominant residual risk, and §2's boundary-side sweep
  is the response to it.
- **The §2 judgement about the malformed-envelope deadline is mine**, stated rather than assumed.
- **The three `shared` entries are judgements** that two §11 rows name one observable fact.
- **`effectIntents` and `acceptedDeadline` observe retained accepted state only**, and neither sees a
  conforming physical timer a retired wait leaves behind — the latter by design.
- **Contract revision 9 is my own wording**, not owner-approved; it corrects claims to match what the
  packet establishes and does not widen scope.

## 9. Self-found defects this round

- None in the payload beyond the finding. The boundary-side sweep in §2 is the one new check; it
  surfaced the malformed-envelope point, which is recorded as a stated judgement rather than a
  silently closed gap.

**K0.2-SELF-01 remains open and unfixed, deliberately**, for the same reason as rounds 5–8: the
architecture guard's raw-text import scanner treats certain prose as a bare import; `specifiersIn`
also backs the live kernel import-graph guard, so changing it inside K0.2 risks weakening a real guard
for a cosmetic gain. Separate corrective packet. Re-verified: architecture tests pass, zero false
positives.

## 10. Where review effort is best spent

1. **Attack §2's boundary enumeration, not the field list.** The last two findings were both missing
   boundaries, not missing fields. A reviewer who names a ninth boundary at which a deadline is
   submitted or live, and which §11 actually asserts something about, has found a real gap.
2. **Attack the malformed-envelope judgement in §2.** It is the one place this round declines to add
   a transcript for a visible transition, and the reason is a reading of §11 rows 3 and 5(a).
3. **Check that R5-d4 and R5-d6 really are two boundaries**, not one assertion split twice: the claim
   is that path A's cleanup writer is in Outcome acceptance and path B's in Event acceptance.
4. **Re-derive §11 independently against the 93 entries**, particularly R4-a3 and R10-c, whose
   shared-writer arguments are unchanged and still the softest justifications.

## 11. Handoff

- **Base:** `c079237ee7aff428481426f93e87a68b79f170d4` (unchanged).
- **Previously reviewed H8:** `c254c7faa414f9046fdab8c55a06b829529d7789` (CHANGES REQUIRED).
- **Reviewer record:** `adb2b7791f674c9a7e4c988010bda60f60a15804` ([review-08.md](review-08.md)).
- **Clean validated payload C9:** `bba23e3c67c918510d480bc2a5df000c1d275159`.
- **Candidate H9:** this commit.
- **Verdict sought:** independent review of C1–C7 and C9. C8 is `BLOCKED_EXTERNAL` and is not offered
  for acceptance. **Not self-accepted, not merged, K0 not closed, K1.0 not released.**
