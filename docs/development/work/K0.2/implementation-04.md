# Implementation report — K0.2, round 4

Correction round for the CHANGES REQUIRED verdict on H3, recorded in
[review-03.md](review-03.md). Rounds 1, 2 and 3 are unchanged and remain as history.

The correction is **forward from C3**, as review-03.md directs. Nothing from round 2 is reverted:
K02-R2-01's and K02-R2-02's fixes are preserved intact and are re-checked in §5.

## Identity

- **Packet / parent:** K0.2 — public controls and the K0/E0 gate; parent milestone K0.
- **Contract:** [`contract.md`](contract.md), **revision 4**, at C4 below.
- **Governing process baseline:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **State: `BLOCKED_EXTERNAL`,** unchanged. C1–C7 and C9 are corrected and independently reviewable;
  C8 cannot be satisfied from this repository. See §6.
- **Owner release:** the original explicit release of 2026-09-11 still stands; corrections on a
  released packet need no renewed permission. No successor is started or released.
- **Branch:** `codex/k0.2-public-controls-e0-gate`. **Configured remote:** `origin`
  `https://github.com/ArrokothI/Agent_SDK.git`, unchanged.
- **Base commit:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **Previously reviewed H3:** `b9b54a84393dde11b45c2395fec04f6130a3b0b2` (CHANGES REQUIRED).
- **Reviewer records on the branch:** `9c63b2c1064747b3c00594584d910f30852d2a18` (review-01),
  `a057a122318eb39508542af4b4c5d53200115259` (review-02), and
  `cec66740c8b749c0706ddd45a0ac0294c619f957` (review-03). All three are the reviewer's/owner's
  commits, not this round's payload, and none is modified here.
- **Clean payload C4:** `e2721ddf30416454ddba73a10ae509190e68cbc4`. Final validation ran on this tree.
- **Candidate H4:** the commit containing this report. Full SHA in the external handoff.
- **Exact C4..H4 administrative allowlist:** `docs/development/work/K0.2/implementation-04.md` (this
  file) and the K0.2 row in `docs/development/007-work-packets.md`. **No payload rides in H4.**
- **Correction delta:** `cec66740..e2721ddf` is 14 files, +2016/−153 — the correction proper.
- **Cumulative scope:** `c079237e..e2721ddf` is 25 files, +8214/−6.
- **Working tree:** clean at C4 and at H4.

## 1. Finding disposition

### K02-R3-01 — the coverage unit is still not semantically atomic — **CLOSED**

**The finding is correct and I accept it.** I re-derived it against the accepted worksheet rather than
taking it on the reviewer's word, and it holds in a way that is worth stating precisely, because the
distinction is what the whole correction turns on.

§11 row 5 opens with the standard itself: *"Each of these is **separately** observable."* The
worksheet is not describing seven paragraphs; it is asserting that each clause is its own observable
fact. C2/C3 read the row's lettered sub-parts as the unit and stopped there. But a lettered sub-part
is a *prose grouping*, and several of them state two or three things a real implementation can get
independently right or wrong. Row 5(a) alone states three well-formedness rules plus three
consequences, and C3 evidenced exactly one of them.

So the round-1 defect was not closed; it was made finer and left in place. I checked all four of the
reviewer's worked examples and confirmed each:

1. **R5-a covered one of six clauses.** The map reduced row 5(a) to "both lists empty is malformed,
   and a deadline does not rescue it". The grammar rules — at least one selector field supplied, no
   empty kind set, structurally valid subscriptions — were implemented in `checkWaitWellFormed` and
   checked by `rule-agreement.test.ts` *against the worksheet*. That is agreement between two of my
   own derivations. No scenario ever submitted such a wait, so no candidate was ever held to any of
   it. The reviewer's sentence is exactly right: "A helper agreeing with the worksheet does not prove
   the future candidate port enforces the rule."
2. **B-8's no-second-readiness rule was prose.** The stale-timer control reaches the sharp state and
   its `forbids` list said "no second readiness" — but `Observation` had no readiness of any kind, so
   `runScenario` could not see one, two, or none. A candidate could arm a phantom readiness behind the
   first, satisfy every observed field, and carry it past reservation.
3. **Rows 3 and 4 asserted the absence of things nothing could see.** "Before any Effect intent, ID or
   proposal-key binding ever exists" was checked by an operation ledger that records *physical
   attempts*. Minting an intent is not an attempt. A candidate could create and retain one, attempt
   nothing, and pass.
4. **R10-a was evidenced by a neighbouring rule.** LP-1 is about a policy check reading local state
   with no staleness window. Its counterexample was
   `control-cancel/losing-progress-installed-with-next-state-suppressed` — a CX-6/OA-3 atomicity
   failure. A candidate whose local check actually read stale state was not represented at all.

Points 2 and 3 are the sharper half of the finding, and they generalize: **an assertion with no
observation surface cannot be covered by any counterexample, however well written.** Where that was
true I added the smallest truthful observation rather than assigning the assertion away, because the
governing sources do make these facts accepted state.

#### The reconstruction

The unit is now the **independently distinguishable assertion**, and the test I applied is behavioural
rather than editorial, because an editorial test is what produced two different answers in two rounds:

> Two clauses are separate assertions when a plausible implementation can get one right and the other
> wrong — because that is precisely the candidate the oracle has to be able to fail.

Worked through all ten rows, that yields 69 entries where C3 had 33. Every one of the additions is a
real implementation getting half a cell right: a takeover that keeps the Activation ID without
advancing the epoch; a create that returns the right identity and receipt while ingesting the input
twice; a duplicate timer whose Event creation is idempotent but whose readiness commit is not; a
cancellation fence that covers the progress writer but not the emission writer.

| | C3 | C4 |
|---|---|---|
| §11 assertions | 33 | **69** |
| with scenario evidence | 31 | **64** |
| `shared` (one fact, two rows) | — | **3** |
| corpus / assigned | 1 / 1 | 1 / 1 |
| violating transcripts | 30 | **65** |
| scenarios / steps | 11 / 78 | **12 / 89** |
| k0 fixture tests | 228 | **366** |

Per row: 5, 5, 6, 4, **24**, 5, 11, 4, 2, 3.

#### Two new observations, and their limits

Both are accepted Kernel state under the governing decisions, not mechanism I invented to make a test
pass. I state what each one cannot see, because an observable whose limit is unstated invites the same
over-claim this finding is about.

**`waitEndedReadiness`.** §3's four-row table treats readiness as an accepted record with an identity
and a species: it names the generation retired, it is Event-triggered (`B-6`) or deadline-triggered
(`B-7`), it survives a crash, and it is consumed when the next batch is *durably reserved*. Ordinary
`READY` (§3 row 5) carries none, and that difference is what makes the wait-ended batch rule a
different rule from B-2's acceptance-order selection. It is observed as a **list**, deliberately: the
failure `B-8` exists to foreclose is "a second readiness arming behind the first", and a nullable
field would hide that failure by construction.

**`effectIntents`.** EF-2 is explicit — "no Effect ID is minted, no proposal key is bound" — and EF-4
adds that "no action record exists at all". At K1 this is empty at every step of every scenario, and
that is the point: a field that must always be empty is the smallest observation that turns "never
exists" into a checked fact. **Its limit:** it observes *retained accepted* intent. A candidate that
constructed an intent and discarded it inside the same rejected transaction leaves no accepted record
and is indistinguishable here — as it is by any other means, since 001's K0 exit asks for an
observable acceptance/rejection result and nothing unobservable was committed. I record that rather
than implying the field proves more than it does.

#### Two that needed scenarios instead

**W-1's grammar.** `control-whole-envelope-validation` now submits all three malformed shapes — an
alternative supplying no selector field, an empty supplied kind set, a structurally invalid
subscription. More importantly, `rule-agreement.test.ts` now **welds the helper to the corpus**: every
rule `checkWaitWellFormed` applies must be a rule some scenario makes a candidate answer for, and the
positive direction too — some scenario must register a valid-but-inert declaration, or a candidate
auditing satisfiability would pass. That is the structural fix for "helper-only enforcement"; the three
new steps alone would have closed the instances and left the class open.

**LP-1.** `identity-create-and-activation` gains a step submitting an Outcome under the writer epoch
that the immediately preceding takeover superseded. LP-1's own examples are that check — "is this
Execution's current epoch still current", "is this Activation ID still the live one" — and its content
is that the check reads the same store the acceptance algorithm just wrote to. The takeover is the
write; this submission is the read.

A twelfth scenario, **`wait-structure-not-satisfiability`**, carries row 5(a)'s positive half and row
5(b)'s two negative arms: a wait whose three alternatives are two inert ones and one live one
registers and stays `WAITING`; application input matching the inert alternative by kind does not wake
it; a Kernel Event matching no alternative does not wake it; the correlated one does; and
re-registering the same dependency waits again, because the Kernel keeps no per-alternative satisfied
flag.

One honest non-observation is recorded there rather than papered over: *"a dependency alternative
naming a timeout kind is inert"* cannot be observed behaviourally at all, because the category table
says the timeout Event cannot exist while its own wait is live. It is structurally unobservable, not
merely untested, and the scenario says so.

#### Structural guards, not just instance fixes

Round 2's finding came from material added to fix round 1; round 3's came from material added to fix
round 2. Fixing four instances would very likely produce a fifth round. Two guards now target the
*class*:

- **No counterexample may defend two assertions.** That is the exact shape of the LP-1 defect — it
  passes every other check in the map while leaving an assertion unguarded. Where two §11 rows
  genuinely name one observable fact, the `shared` evidence kind records it explicitly, must justify
  the identity, must point at an entry carrying real scenario evidence, and may not be used within a
  single row (which would be a missing split rather than one fact seen twice). Three entries use it:
  R3-c3, R6-a1, R8-b2.
- **Row attribution must agree in both directions.** The map already had to name rows the scenarios
  declare; now the scenarios must declare every row the map attributes to them. The missing direction
  is what let `control-cancel-versus-complete` go on claiming row 10 after its row-10 attribution
  moved away — a stale claim that had become false silently.

Neither guard makes a wrong reading impossible. Both make one visible to a reviewer who checks.

## 2. A second K02-R2-01-class defect, found and fixed in this round

Not reported by the review; found while welding the helper to the corpus, and in scope because the
review asked me to sweep for comparable cases.

`checkWaitWellFormed` rejected an empty declaration with "both dependency alternatives and
subscriptions are empty"; the scenario expected "wait declaration is structurally empty". Two
sentences for one condition, which is only possible because **both are arbitrary** — and the oracle
was comparing the reason text verbatim, so it would have failed a conforming K1 candidate for
reporting a permitted condition in its own words.

That is round-2 finding K02-R2-01's defect in a second place. What makes it worth calling out is that
C3 had already written the correct rule: the vocabulary note says in terms that reason strings are a
representational convention with CX-6 as the sole exception. The runner simply did not implement it.
**A stated principle an oracle does not enforce is not a safeguard** — it reads like one, which is
worse than silence.

`runScenario` now compares the **classification** exactly and always (it is a closed enum derived from
OA-2/OA-3/CX-6), requires a **non-empty reason** always (§11 row 4's "recorded, inspectable"), and
compares **reason text** only for classifications an accepted decision fixes verbatim — today CX-6
alone, which the worksheet names by name: "with reason **cancellation accepted before Outcome
acceptance**".

Loosening an oracle is where holes open, so all five directions are pinned by test: the reworded
non-canonical reason that must now pass, and the blank reason, changed classification, dropped
rejection and reworded CX-6 reason that must all still fail. I verified each before writing the test.

## 3. Discrimination, verified rather than assumed

**Every one of the 65 counterexamples is rejected by the oracle at exactly the step its assertion
lives at.** `coverage.test.ts` runs each one and asserts both, so this is not a claim about the ones I
happened to check.

More importantly — and this is the claim a coverage correction actually has to make — **the repaired
blind spots are mutation-checked**. Adding a counterexample proves the oracle rejects it *now*; it
says nothing about whether the oracle failed to reject it *before*.
[`blind-spot-regression.test.ts`](../../../../tests/conformance/k0/blind-spot-regression.test.ts)
reconstructs the C3 oracle mechanically — deleting the two observation fields C3 lacked, and pinning
C3's step labels from `acb5e01` for the scenarios that grew — and shows each repaired case passing it:

| Blind spot | Reconstruction | Result |
|---|---|---|
| Phantom readiness behind the first (review-03 §2) | C3 surface | passed C3 |
| Duplicate timer's second readiness | C3 surface | passed C3 |
| Readiness armed while `RUNNING` | C3 surface | passed C3 |
| Effect intent retained after refusal (review-03 §3) | C3 surface | passed C3 |
| Losing Outcome minting an intent | C3 surface | passed C3 |
| W-1's three grammar rules (review-03 §1) | C3 step labels | no step existed |
| Inert wait refused as unsatisfiable | C3 step labels | no step existed |
| Unmatched Kernel Event waking the wait | C3 step labels | no step existed |
| Re-registered dependency treated as satisfied | C3 step labels | no step existed |
| Stale-epoch read (review-03 §4) | C3 step labels | no step existed |

The suite also checks itself: a counterexample C3 *did* catch must fail the invisibility test, so it
cannot pass vacuously. Without that, any violation leaving the new fields alone would register as a
repaired blind spot.

## 4. Self-found defects this round

Recorded with their own provenance rather than folded into the finding, per 008.

- **K0.2-SELF-09 — my own attribution check caught two stale claims.** After moving R10-a's evidence,
  `control-cancel-versus-complete` still declared row 10, and `control-whole-envelope-validation` did
  not declare row 2 it had acquired. Both were found by the checks in `coverage.test.ts`, not by
  reading. I fixed the declarations and added the reverse-direction check rather than relaxing
  anything; the one-directional check is what had let the first survive.
- **K0.2-SELF-10 — I wrote an unreadable resolver and a wrong novelty test.** The first version of the
  `shared`-evidence scenario resolver was malformed boolean nonsense that happened to typecheck. The
  first version of the blind-spot novelty test asserted `stepIndex >= c3StepCount`, which is simply
  invalid when steps are inserted *in the middle* — an index that existed in C3 names a different step
  there. Both were caught by running the tests, and the second was replaced with pinned C3 labels,
  which is what the claim actually requires.

**K0.2-SELF-01 remains open and unfixed, deliberately.** The architecture guard's raw-text import
scanner (`tests/conformance/architecture/kernel-boundaries.test.ts:11`) treats prose ending in
"derives from" before a string literal as a bare import. `specifiersIn` also backs the real kernel
import-graph guard, so changing it inside K0.2 risks silently weakening a live guard for a cosmetic
gain. It still wants a separate corrective packet and owner release. Verified again this round: 79
architecture tests pass, zero false positives against the new file.

## 5. Whole-packet re-audit

Not a check of the four local edits. Re-derived across the packet:

- **Round-2 corrections preserved.** K02-R2-01: the completion control still pins the EF-2 reason and
  asserts only what the protocol fixes; `completion/refused-envelope-partly-committed` still present;
  R8-a still narrowed; R8-c still assigned to K2.4. K02-R2-02: `defineProperty`/`Reflect.ownKeys`
  intact, all 21 `operation-sink.test.ts` tests pass. The `forbiddenBy` citation requirement survives
  and now covers all 65 transcripts.
- **All ten rows re-derived**, not just the four the review named. The additions are spread across
  every row: rows 1 and 2 gained five between them, row 3 two, row 4 three, row 5 ten, row 6 three,
  row 7 seven, row 9 one, row 10 two.
- **Readiness lifecycle audited across the corpus**, not only where it was added.
  `interactions.test.ts` now sweeps every step of every scenario: never two outstanding, never naming
  the live generation, never outside `READY`, always consumed by a dispatch, and never named for a
  generation the scenario does not register. A new observable without invariants over it is a new
  place to make claims.
- **Effect-intent emptiness likewise**, plus a check that some scenario actually proposes an Effect —
  otherwise the invariant is vacuous.
- **Neighbouring rejection reasons swept** — the trigger for §2 above.
- **Every scenario still refused** by the refusing candidate: 12 of 12, `REFUSED`, no exemptions.
- **Contract and specification reconciled** with the code: contract revision 4, specification §10,
  scenario table, all counts re-derived from the source rather than transcribed.
- **Fixture independence:** zero `@arrokothi/*` imports in `tests/conformance/k0/` (the single grep
  hit is a comment saying so).
- **28 internal K0.2 doc links resolve**; no trailing whitespace or tabs; no document or test claims
  K0, E0 or E1 status.

## 6. K0.2-C8 — still externally blocked

Re-checked read-only. The benchmark repository is unchanged at
`98756f8c10bd806125da8318f1a129bc030aca61` on both `HEAD` and `main`; `docs/roadmap.md:3` still reads
"E0–E6 are **planned**, not implemented"; `git ls-files` matches zero E0 artifacts. **Nothing was
written to that repository.**

- **Responsible actor:** benchmark repository owner.
- **Unblock condition:** an accepted E0 deliverable at a pinned benchmark revision, with artifact
  identities recordable here and inspectable by an independent reviewer.

No E0 acceptance is claimed, implied or self-granted. Because C8 cannot pass, the packet is **not
review-ready as a whole**, and because K0.2 is K0's final gate packet, **K0 stays open**.

## 7. Validation

Run on committed C4, clean tree.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | **1331 tests / 247 suites / 1331 pass / 0 fail / 0 skipped** |
| `npm run test:conformance` | 1222 pass / 0 fail |
| `npm run test:sdk` | 22 pass / 0 fail |
| `npm run check:builder-docs` | 26 files, 280 links/anchors, 38 imports |
| k0 fixture directory | 366 pass / 36 suites / 0 fail |
| architecture guards | 79 pass / 0 fail |

**The pre-existing suite is unchanged: 1331 − 366 = 965**, the same figure as rounds 1, 2 and 3. The
k0 directory grew 228 → 366.

`npm run test:evals` is not run: it requires provider credentials and network, and this packet adds no
eval. Third-party review: no third-party code, dependency, asset or service was added, copied or
adapted this round; the fixture remains dependency-free and the repository's dependency set is
untouched.

## 8. Limitations, stated plainly

- **This is a prepared fixture, not a result.** The only candidate speaking for the real tree refuses
  every scenario. Every `PASS` in this packet is a hand-authored transcript proving the oracle works,
  never an implementation passing.
- **Two derivations of the same worksheet.** The literal expectations and the coded predicates agree,
  and are now welded so they cannot drift apart. Agreement is still not proof that the reading is
  correct — and three review rounds have now found defects in *my reading*, not in code implementing
  it. That remains the packet's highest residual risk.
- **The `shared` evidence kind is a judgement.** Three entries assert that two §11 rows name one
  observable fact. I believe each; a reviewer who disagrees with any one should treat that assertion
  as unevidenced, and the reason text is written down so that disagreement is possible.
- **`effectIntents` cannot see a discarded intent**, as stated in §1.
- **Contract revision 4 is my own**, not owner-approved wording; it corrects claims to match what the
  packet establishes and does not widen scope.

## 9. Where review effort is best spent

In order:

1. **Re-derive §11 independently and check the 69 entries against it** — particularly whether the
   behavioural splitting test was applied consistently, and whether any remaining entry still bundles
   two things one implementation could get separately wrong. This is where three rounds of defects
   have been, and the corrected map is still my reading.
2. **Audit the three `shared` entries.** They are the only places a counterexample defends more than
   one assertion, and the justification is prose.
3. **Check `CANONICAL_REASON_CLASSIFICATIONS` against the worksheet.** I claim CX-6 is the only
   decision fixing a reason text. If another does, the oracle is now under-constrained there.
4. **Check `blind-spot-regression.test.ts`'s pinned C3 labels against `acb5e01`.** They are a
   transcription, and a wrong one would overstate the repair.

## 10. Handoff

- **Base:** `c079237ee7aff428481426f93e87a68b79f170d4` (unchanged).
- **Previously reviewed H3:** `b9b54a84393dde11b45c2395fec04f6130a3b0b2` (CHANGES REQUIRED).
- **Reviewer record:** `cec66740c8b749c0706ddd45a0ac0294c619f957` ([review-03.md](review-03.md)).
- **Clean validated payload C4:** `e2721ddf30416454ddba73a10ae509190e68cbc4`.
- **Candidate H4:** this commit.
- **Verdict sought:** independent review of C1–C7 and C9. C8 is `BLOCKED_EXTERNAL` and is not offered
  for acceptance. **Not self-accepted, not merged, K0 not closed, K1.0 not released.**
