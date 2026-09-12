# Implementation report — K0.2, round 6

Correction round for the CHANGES REQUIRED verdict on H5, recorded in
[review-05.md](review-05.md). Rounds 1–5 are unchanged and remain as history.

The correction is **forward from C5**, as review-05.md directs. Nothing from rounds 2–5 is reverted:
the R5-a4 assignment, the valid round-4 splits, the readiness/Effect-intent observation surfaces and
the non-canonical free-text handling are all preserved, and §5 re-checks them.

## Identity

- **Packet / parent:** K0.2 — public controls and the K0/E0 gate; parent milestone K0.
- **Contract:** [`contract.md`](contract.md), **revision 6**, at C6 below.
- **Governing process baseline:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **State: `BLOCKED_EXTERNAL`,** unchanged. C1–C7 and C9 are corrected and independently reviewable;
  C8 cannot be satisfied from this repository. See §6.
- **Owner release:** the original explicit release of 2026-09-11 still stands; corrections on a
  released packet need no renewed permission. No successor is started or released.
- **Branch:** `codex/k0.2-public-controls-e0-gate`. **Configured remote:** `origin`
  `https://github.com/ArrokothI/Agent_SDK.git`, unchanged.
- **Base commit:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **Previously reviewed H5:** `053bca6c77ad37aa3f3a4816765639707b662a4d` (CHANGES REQUIRED).
- **Reviewer record on the branch:** `c3fcef35c2de577edad8cebf451afad99f9c2bf7` ([review-05.md](review-05.md)).
  Prior reviewer records `9c63b2c`, `a057a12`, `cec6674`, `55f11858` remain historical provenance.
  None is modified here.
- **Clean payload C6:** `66dd526534bcbb737143d47c00e65e5eda9509e3`. Final validation ran on this tree.
- **Candidate H6:** the commit containing this report. Full SHA in the external handoff.
- **Exact C6..H6 administrative allowlist:** `docs/development/work/K0.2/implementation-06.md` (this
  file) and the K0.2 row in `docs/development/007-work-packets.md`. **No payload rides in H6.**
- **Correction delta:** `c3fcef35..66dd526` is 10 files, +578/−80.
- **Cumulative scope:** `c079237e..66dd526` is 29 files, +10541/−6.
- **Working tree:** clean at C6 and at H6.

## 1. K02-R5-01 — one TokenRelation imposed cross-namespace uniqueness — **CLOSED**

**The finding is correct.** C5 replaced literal receipt/Activation-ID comparison with a relational
bijection, but constructed one shared `TokenRelation` for both families. ID-3/ID-9 constrain
Activation IDs against Activation IDs; ID-6/ID-7 constrain receipts against receipts and accepted
boundaries. Nothing requires the raw spellings to be disjoint across families — they are different
typed protocol concepts — so a conforming adapter exposing receipt `"opaque-1"` alongside Activation
ID `"opaque-1"` was rejected for an implementation-owned representation choice. The permanent tests
covered consistent respelling and collapse *within* each family and never exercised cross-family
reuse, so the over-constraint survived green tests.

**What was done.** `runScenario` now holds one bijection per family (`receiptTokens`,
`activationTokens`); `compareRepresentations` checks each family against its own relation and
`normalizeRepresentations` rewrites each family's spelling to its own expected token independently.
The `TokenRelation` class itself is unchanged — the fix is scoping, not comparison logic — and its
documentation now states the namespace rule with the governing decisions. Other normalization state
was swept field by field: rejection keying (canonical CX-6 verbatim vs. non-canonical free text),
per-family rewrite (never keyed on the other family's observed value), recovery-hold
presence-plus-non-empty-reason (PC-5), and fixture-supplied timer generations compared literally.
The single shared relation was the only cross-domain coupling; the sweep and its result are recorded
in `fixture.ts` rather than left implicit.

**The probe.** `oracle-discrimination.test.ts` adds the distinguishing conforming case the review
requires: on `identity-create-and-activation`, receipts map distinctly to `opaque-1`/`opaque-2` and
Activation IDs map distinctly to the *same* two spellings. Cross-family reuse passes; collapsing two
receipts onto `"r"` or two Activation IDs onto `"the-activation"` within their own family still fails
(pre-existing tests, unchanged). The probe was verified against the old logic: a single shared
relation reports `opaque-1 already receipt:create:req-x for act-1` at the first activation step, so
the test fails before the fix and passes after it. Relational comparison is preserved — spelling
still buys nothing — and same-family collapse still fails exactly as ID-3/ID-6 require.

## 2. K02-R5-02 — atomicity guard circular/incomplete; row-7 deadline unobservable — **CLOSED**

**The finding is correct, in both halves.** C5 grouped fields a *conforming* accepted transaction
writes together and used the grouping as evidence a broken implementation cannot split them. A
normative atomicity requirement is evidence a partial-write candidate is *wrong*, not evidence such
a candidate is implausible — and the packet already models partial writers elsewhere (malformed
envelopes, cancellation, completion). `COUPLED_FIELD_GROUPS` is now documented as a review heuristic
only. Every retained composite was re-audited against plausible broken writers/transactions; the two
concrete cases the review names are split and observed, the lifecycle grouping that suppressed the
wake/retirement/readiness signal is narrowed, and all notes name writers instead of invoking
coupling.

### 2a. R3-b's atomicity note was false — split

R3-b kept "same-identity/different-content is rejected, not merged" as one entry with a note claiming
record-and-merge is "not plausible". OA-5 exists to prohibit exactly that: the conflict check
(recording the rejection) and the progress writer (installing accepted state) are different writers,
and a progress writer that ran too early leaves the conflicting progress installed while the
rejection is correctly recorded. The entry splits into R3-b (recorded `duplicate_conflict`
rejection, not silent absorption; transcript drops only the rejection) and R3-b2 (no merge beside a
correct rejection; the prior transcript narrowed to leak only progress/progressRevision with the
rejection intact). The two move different field sets at the same step, so the split is not cosmetic.

### 2b. R7-a6 claimed more than the fixture could observe — now scheduled and observed

The obligation requires zero wait/deadline/readiness/next-state mutation for a cancellation-losing
Outcome. The schedule submitted losing `continue`/`complete` only — never a losing `await` carrying
a wait with a deadline — and `Observation` exposed lifecycle/readiness plus a live generation but no
persisted deadline/timer fact. A broken implementation could keep `CANCELLED`, report the correct
CX-6 rejection with null live generation, and still leak a deadline/timer registration from the
losing `await` path.

Three changes, all required and all present:

1. **Schedule.** `control-cancel-versus-complete` gains step 11: a well-formed subscription-only wait
   with deadline 5000 under generation `g-lose`, submitted for the cancelled Execution X. Accepted,
   it would persist `WAITING` under `g-lose` with a timer; rejected under CX-6, it must leave
   `CANCELLED` with null live generation, empty timers, empty readiness and the CX-6 rejection.
   Placed after the reverse-order steps so existing Y indices (including R7-d at step 9) do not shift.
   `controls.test.ts` now asserts the fence covers `continue`, `complete` **and** a deadline-bearing
   `await`.
2. **Observation.** `Observation.pendingTimers` observes retained accepted timer registrations
   (fixture-supplied wait generations, compared literally). It is empty in every fenced step and
   `["g2"]`/`["gd1"]` while those deadline waits are live; the two deadline transcripts that omitted
   their timers (`timeout-withheld`, `past-deadline-persisted`) now carry them. Its limit is stated
   in code like its siblings: retained accepted registration only; a timer built and discarded inside
   one rejected transaction leaves no accepted record. Deadline absence is never inferred from
   terminal state or `liveWaitGeneration` — the leak that keeps both correct is a one-field
   `pendingTimers` difference the oracle rejects by name.
3. **Splits.** R7-a6 (next-state; existing transcript) gains R7-a6b (no wait; live generation),
   R7-a6c (no deadline/timer; `pendingTimers`, the sharp orphaned-timer case) and R7-a6d (no
   readiness), each with a single-field transcript at step 11. The three move distinct field sets, so
   no split is cosmetic.

### 2c. Lifecycle grouping narrowed; all notes re-audited against writers

The `lifecycle` group placed `state`, `liveWaitGeneration` and `waitEndedReadiness` together because
conforming W-2/W-3/B-6/B-7/B-8 transactions write them together — suppressing the exact signal that
exposed wake-without-retirement, retirement-without-wake and phantom readiness. `state` and
`liveWaitGeneration` stay grouped solely for W-3's definitional link (a live generation exists
exactly while `WAITING`, via the same registration/retirement writer); `waitEndedReadiness` and
`pendingTimers` are deliberately ungrouped, each its own group, so any joint movement needs a note
or a split. The table header now states the heuristic status explicitly: disagreeing with it makes
the guard *more* sensitive, never less.

Re-audit outcome per entry (16 retained notes plus 4 new, 20 total):

- **New notes for full-wake transactions** R5-b2/b3/c1/d3: one upstream misclassification or ordering
  swap (eligibility grammar-before-category, kind-without-correlation, W-2 steps 1–2 swapped,
  satisfaction flag carried across generations) plus one downstream B-6 retirement that correctly
  retires, creates readiness and moves to `READY`. Partial writers that retire without readiness or
  arm readiness without retiring are different writers (timer handler, ingress path), separately
  covered by R5-f1a/f1a2, R6-b1/b2 and R7-a6d.
- **R5-b4** (timeout withheld): upstream ingress router sends the timeout through the ordinary test,
  so path-B never runs (no mint, no retire, no readiness, timer stays); mint-without-retire partials
  are the expiry-handler writer, separately R5-d2. **R5-c3** (past deadline persisted): acceptance
  writer persists before the deadline evaluator, so path-A never runs; live alone already
  discriminates the swap, and orphaned-timer partials via other writers are R7-a6c.
- **R5-a1/a1b/a2/a3** (malformed registers): validator misclassifies (one upstream decision), then the
  correct acceptance writer persists, resolves and receipts. Recording *and* registering would be two
  opposite validator decisions; committer partials that record correctly but leak are the separate
  OA-3 writer evidenced by R3-c1/R3-c1b. **R5-a5/a6** (valid refused): satisfiability auditor refuses;
  all writers idle plus a rejection — the multi-field difference is the absence of the one
  acceptance; auditor-plus-committer combined would be two writers.
- **R4-a3** (Effect stripped, remainder accepted): splitter strips before validation (one upstream
  decision), then acceptance commits progress+emission together via one OA-4 transaction; splitter
  plus committer-partial combined would be two failures, with committer partials for the shared OA-3
  writer at R3-c1/R3-c1b. **R8-a** (completion accepted): checker deferred to cleanup (one placement
  bug), then correct commit runs terminal+progress+ack+exchange+receipt; checker-plus-commit-partial
  combined would be two failures, with correct-refusal partials split as R8-a2–a5 by their own
  writers. **R7-a7** (complete loser escapes): fence placed on `continue` only (one placement bug by
  the terminal-decision writer), then correct completion commit runs; bypass-plus-commit-partial would
  be two failures, with correct-refusal partials at R8-a3/a4. **R7-c1** (cancel deferred): control
  writer defers the fence to the next answer (one placement bug), so lifecycle/dispatch/B-5 writers
  all idle; fence-plus-B-5 combined would be two failures, with disposition-vs-ack split as R7-c2.
  **R9-a2** (fresh start presented as restored): recovery path selector takes fresh-start (one
  selection bug), whose branch writers fabricate progress and omit the hold; both-branches would be
  two selections, and silent-neither is the separate R9-a1. **R10-a** (stale LP-1 read): policy reader
  outside the transaction reads a cached exchange (one staleness bug), then correct commit runs
  progress+receipt; admission-plus-commit-partial would be two failures. **R10-c** (correction
  retracts): input handler misreads correction as withdrawal authority (one handler bug), then the
  retraction writer reverses the one OA-4 commit whole; half-retraction would be handler plus
  retraction-atomicity failure, with progress vs. emission writers already recognised as separable in
  row 7. **R7-a8** (M-1 named composite) stays composite *because M-1 names it*, with its parts
  separately R7-a2/a3/a4 — unchanged.

No retained note now claims a candidate is implausible because the protocol requires atomicity. Each
claims one specific bug construction moves these fields via these writers, names where a second
writer's partial is independently covered, and is therefore falsifiable by exhibiting a single-writer
partial it overlooked.

## 3. Mutation-checking the new splits and the new observation

Round 3's blind spots were **invisible** (no field, no step); round 4's were **visible but
unattributed** (complete observation would reject, but the map had one transcript for two
assertions). Round 5 has one of each, and each is claimed accordingly:

- **R3-b split is visible-but-unattributed, now divided.** C5's bundled transcript moved progress,
  progressRevision and rejection together. `blind-spot-regression.test.ts` transcribes that C5 set
  and asserts the halves divide it: merge-only moves progress/progressRevision with the rejection
  intact; absorption-only moves rejection alone. `coverage.test.ts` separately enforces that no two
  transcripts at the step move the same field set.
- **CX-6 deadline coverage was invisible, now genuinely added.** Under C5's surface (no
  `pendingTimers`, no losing-`await` step) the orphaned-timer candidate — `CANCELLED`, correct CX-6
  rejection, null live generation, `pendingTimers: ["g-lose"]` — passed. It now fails on
  `pendingTimers` alone, with live generation and state held correct to prove the observation (not
  the inference) does the work. The regression suite pins the schedule (a losing `await` with a
  deadline exists and expects the fenced observation), the single-field timer leak, and its
  distinctness from the wait/readiness halves.
- **Token-namespace separation is over-constraint removed, pinned in both directions.** The shared
  spelling passes now and demonstrably collided before (single-relation replay reports `opaque-1
  already receipt:create:req-x for act-1`); same-family collapse still fails. Both directions are in
  `oracle-discrimination.test.ts` with a shape guard in the regression suite.

## 4. Self-found defects this round

- **K0.2-SELF-13 — two deadline transcripts omitted their timers.** While adding `pendingTimers` I
  found `timeout-withheld` and `past-deadline-persisted` asserted `WAITING` with a live deadline
  generation but empty timers — a wait without its timer, which is itself a partial writer the new
  observation exists to catch. Both now carry `["gd1"]`/`["gd2"]` with the timer in their
  `mustNameFields`. The defect was in new material under construction, not in a reviewed payload, and
  is recorded here rather than silently fixed.
- **K0.2-SELF-14 — four full-wake entries crossed the newly ungrouped readiness.** Narrowing the
  lifecycle grouping (state/live vs. readiness) correctly flagged R5-b2/b3/c1/d3, each moving
  lifecycle plus readiness without a note. Each gained a writer-model note for its one-upstream plus
  one-downstream construction rather than a split, since the assertion in each is the upstream
  decision (eligibility, ordering, flag) and the downstream B-6 transaction is its single
  consequence. A split there would be mechanical grammar splitting, which review-04 warns against.

**K0.2-SELF-01 remains open and unfixed, deliberately**, for the same reason as round 5: the
architecture guard's raw-text import scanner treats certain prose as a bare import;
`specifiersIn` also backs the live kernel import-graph guard, so changing it inside K0.2 risks
weakening a real guard for a cosmetic gain. Separate corrective packet. Re-verified: architecture
tests pass, zero false positives.

## 5. Whole-packet re-audit

- **Rounds 2–5 corrections preserved.** K02-R2-01: the completion control still pins the EF-2 reason
  and asserts only what the protocol fixes. K02-R2-02: `defineProperty`/`Reflect.ownKeys` intact, all
  ledger tests pass. K02-R3-01's concrete fixes: `waitEndedReadiness` and `effectIntents` still
  observed with their corpus invariants (plus the new timer invariants beside them), the LP-1
  schedule intact, W-1's grammar still submitted through the candidate port, reason-text handling
  intact and unchanged. K02-R4-01: R5-a4 stays assigned to K1.3 with the W-9 quotation; the empty
  subscription identity stays well formed and no scenario requires rejecting one (regression suite).
  K02-R4-02's valid splits (progress/emissions, retire/wake, completion five, terminal two,
  duplicate acceptance/emission, W-4 lifecycle/record, retry receipt/rejection) are all intact and
  their field-set distinctness re-verified; R7-a8 stays composite because M-1 names it, with its
  parts separately covered.
- **All ten rows re-derived** against the writer-model rule, not only the entries the review named;
  the sweep found SELF-13/SELF-14 above.
- **Every scenario still refused** by the refusing candidate: 12 of 12.
- **Corpus invariants re-run**: readiness lifetime, Effect-intent emptiness, timer lifetime
  (timers exactly while a deadline wait is live; every timer a submitted deadline generation; a live
  deadline wait and a fenced losing await both present so the rule is not vacuous), wait/batch/
  disposition interactions, sink attribution, fenced-submission stability (now including empty timers
  and empty readiness alongside null live generation).
- **Contract and specification reconciled**: contract revision 6, specification §12, all counts
  re-derived from source (87 obligations: 81 scenario + 3 shared + 1 corpus + 2 assigned; 20
  atomicity notes; 81 violating transcripts over 12 scenarios / 90 steps; rows
  5, 6, 9, 4, 28, 5, 16, 9, 2, 3).
- **32 internal K0.2 doc links resolve**; no trailing whitespace or tabs; zero `@arrokothi/*` imports
  in the fixture; no document or test claims K0, E0 or E1 status.

## 6. K0.2-C8 — still externally blocked

Re-checked read-only posture: this packet writes nothing outside its own repository. The benchmark
repository state entering this round (`98756f8c10bd806125da8318f1a129bc030aca61`, E0–E6 planned not
implemented, per the round-5 review record) is not re-asserted as a new inspection here; the
criterion's status does not depend on one. The packet's obligation is the blocker record, which is
unchanged:

- **Responsible actor:** benchmark repository owner.
- **Unblock condition:** an accepted E0 deliverable at a pinned benchmark revision, with artifact
  identities recordable here and inspectable by an independent reviewer.

No E0 acceptance is claimed, implied or self-granted. Because C8 cannot pass, the packet is **not
review-ready as a whole**, and because K0.2 is K0's final gate packet, **K0 stays open**.

## 7. Validation

Run on committed C6, clean tree.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | **1405 tests / 254 suites / 1405 pass / 0 fail / 0 skipped** |
| `npm run test:conformance` | 1296 pass / 0 fail |
| `npm run test:sdk` | 22 pass / 0 fail |
| `npm run check:builder-docs` | 26 files, 280 links/anchors, 38 imports |
| k0 fixture directory | 440 pass / 43 suites / 0 fail |
| architecture guards | 79 pass / 0 fail |

**The pre-existing suite is unchanged: 1405 − 440 = 965**, the same figure as rounds 1–5. The k0
directory grew 419 → 440 (+21: four new violating transcripts and their obligation/structural tests,
one oracle probe, four regression tests, four timer interaction tests, plus per-obligation coverage
rows for the four new assertions).

`npm run test:evals` is not run: it requires provider credentials and network, and this packet adds no
eval. Third-party review: no third-party code, dependency, asset or service was added, copied or
adapted this round; the fixture remains dependency-free and the repository's dependency set is
untouched.

## 8. Limitations, stated plainly

- **This is a prepared fixture, not a result.** The only candidate speaking for the real tree refuses
  every scenario. Every `PASS` here is a hand-authored transcript proving the oracle works.
- **The atomicity notes do not prove atomicity.** Each proves that one specific bug construction via
  named writers moves these fields, with a pointer to where a second writer's partial is covered. If
  a note names the wrong writers, the guard passes and the entry is still bundled. The table is a
  prompt for the reviewer to attack, not a derivation from the protocol.
- **Five rounds have now found defects in my reading of the worksheet**, not in code implementing it.
  That remains the packet's dominant residual risk, and the guards added since round 3 make wrong
  readings *visible to a reviewer who checks* rather than impossible.
- **The three `shared` entries are judgements** that two §11 rows name one observable fact.
- **`effectIntents` and `pendingTimers` cannot see a value constructed and discarded inside a rejected
  transaction.** Both observe retained accepted state; a value leaving no accepted record is
  unobservable by any means, since 001's K0 exit asks for an observable result and nothing
  unobservable was committed.
- **Contract revision 6 is my own wording**, not owner-approved; it corrects claims to match what the
  packet establishes and does not widen scope.

## 9. Where review effort is best spent

1. **Attack the twenty `atomicity` notes via their writers.** Each now names a bug construction and
   the writers it moves. The question is never "does the protocol commit these together" but "can one
   broken writer move only some of them" — exhibit the single-writer partial the note overlooked.
2. **Re-derive §11 independently against the 87 entries**, particularly R4-a3 (Effect-strip plus
   full-remainder commit, with committer partials at R3-c1/c1b on a different envelope shape) and
   R10-c (whole-retraction, with progress/emission writers separable in row 7). Those two rely on a
   shared-writer argument across envelope shapes; a reviewer who finds a shape-specific partial has
   found a real gap.
3. **Check the per-family bijection against ID-3/ID-6.** It is now two relations; if some decision
   does fix more than the within-family relation, the oracle is under-constrained there.
4. **Check the losing-`await` schedule against CX-6/OA-4/W-2.** If a reviewer reads the fenced `await`
   as fixing something observable beyond wait/timer/readiness/next-state plus the recorded rejection
   (e.g. a progress or acknowledgment consequence this schedule omits), the step needs widening.
5. **Check `blind-spot-regression.test.ts`'s transcribed C5 field set for R3-b against `159f3dc`.**

## 10. Handoff

- **Base:** `c079237ee7aff428481426f93e87a68b79f170d4` (unchanged).
- **Previously reviewed H5:** `053bca6c77ad37aa3f3a4816765639707b662a4d` (CHANGES REQUIRED).
- **Reviewer record:** `c3fcef35c2de577edad8cebf451afad99f9c2bf7` ([review-05.md](review-05.md)).
- **Clean validated payload C6:** `66dd526534bcbb737143d47c00e65e5eda9509e3`.
- **Candidate H6:** this commit.
- **Verdict sought:** independent review of C1–C7 and C9. C8 is `BLOCKED_EXTERNAL` and is not offered
  for acceptance. **Not self-accepted, not merged, K0 not closed, K1.0 not released.**
