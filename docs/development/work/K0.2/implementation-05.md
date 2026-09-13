# Implementation report — K0.2, round 5

Correction round for the CHANGES REQUIRED verdict on H4, recorded in
[review-04.md](review-04.md). Rounds 1–4 are unchanged and remain as history.

The correction is **forward from C4**, as review-04.md directs. Nothing from rounds 2–4 is reverted:
`waitEndedReadiness`, `effectIntents`, the LP-1 schedule, the non-canonical reason-text handling and
the sound parts of the assertion reconstruction are all preserved, and §5 re-checks them.

## Identity

- **Packet / parent:** K0.2 — public controls and the K0/E0 gate; parent milestone K0.
- **Contract:** [`contract.md`](contract.md), **revision 5**, at C5 below.
- **Governing process baseline:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **State: `BLOCKED_EXTERNAL`,** unchanged. C1–C7 and C9 are corrected and independently reviewable;
  C8 cannot be satisfied from this repository. See §6.
- **Owner release:** the original explicit release of 2026-09-11 still stands; corrections on a
  released packet need no renewed permission. No successor is started or released.
- **Branch:** `codex/k0.2-public-controls-e0-gate`. **Configured remote:** `origin`
  `https://github.com/ArrokothI/Agent_SDK.git`, unchanged.
- **Base commit:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **Previously reviewed H4:** `ed438e88173e8f7306dfdfb16c290ea40fa0a0fd` (CHANGES REQUIRED).
- **Reviewer records on the branch:** `9c63b2c` (review-01), `a057a12` (review-02), `cec6674`
  (review-03), `55f11858962c5dfd9f75c20709209684e5abcbc2` (review-04). All are the reviewer's/owner's
  commits, not this round's payload, and none is modified here.
- **Clean payload C5:** `159f3dc0c13779c54a515aaffb74456bccafda09`. Final validation ran on this tree.
- **Candidate H5:** the commit containing this report. Full SHA in the external handoff.
- **Exact C5..H5 administrative allowlist:** `docs/development/work/K0.2/implementation-05.md` (this
  file) and the K0.2 row in `docs/development/007-work-packets.md`. **No payload rides in H5.**
- **Correction delta:** `55f11858..159f3dc0` is 11 files, +982/−107.
- **Cumulative scope:** `c079237e..159f3dc0` is 27 files, +9587/−6.
- **Working tree:** clean at C5 and at H5.

## 1. K02-R4-01 — the fixture invented a rule the worksheet assigns away — **CLOSED**

**The finding is correct.** I checked it against the governing text rather than taking it on the
reviewer's word, and the worksheet is more explicit than the review needed it to be.

W-1 rule 3 says a present subscription must be "a declared subscription identity in the sense of W-1
item 2", and then, in the same sentence: "This rule fixes only that the entry *is* such an identity;
its exact spelling remains implementation-owned under W-9's closing *Left open* note." That note names
the owner:

> the exact spelling of a declared subscription identity (whether a subscription names the input label
> directly or an application-declared subscription name that resolves to one) — **K1.3 owns that**, and
> W-1 constrains only that it is finite, declarative and compared by equality.

The empty string is finite, declarative and compared by equality. It satisfies every constraint W-1
imposes. C4 declared it invalid, submitted one through the candidate port, and shipped
`envelope/invalid-subscription-identity-registered` asserting that accepting it is a protocol
violation. A conforming K1 implementation whose representation admits that identity would have failed.

**This is worse than the K02-R2-01 class, not merely another instance of it.** There, an over-tight
comparison would have failed a conforming candidate. Here a *counterexample* asserted that conforming
behaviour is a violation — the fixture's most load-bearing artifact stating something false about the
protocol. And it survived a sweep: round 4 swept rejection *reason strings* for exactly this class and
never looked at validity *rules*. Sweeping one shape of a defect is not sweeping the defect.

**What I did not do.** I did not replace the empty-string rule with a different negative case, because
every candidate I considered — a registry of fixture-declared identities, a non-declarative identity,
a pattern-shaped one — requires first deciding the representation, which is the thing K1.3 owns.
Manufacturing a second rule to keep the entry "covered" would repeat the mistake with better
camouflage. Within this fixture's representation `subscriptionClass` is a `string`, so finiteness,
declarativeness and equality-comparison hold by construction and **no submittable value can fail the
property W-1 states**. R5-a4 is therefore assigned to K1.3 with the quotation above, which is the
option review-04 explicitly permits and the governing source directly supports.

The assignment is of the *concrete representation*, not of the property, and the report says so where
someone might read it as a retreat: what W-1 fixes about subscriptions independently of spelling is
still observed — R5-a6 that a subscription-only wait is first-class, R5-b1 that application input is
eligible only through a declared subscription, and R5-b2/R5-b2b that a dependency alternative matching
such input neither wakes nor acknowledges it.

`blind-spot-regression.test.ts` now guards the withdrawal in both directions: the empty identity must
stay well formed, and no scenario may require a candidate to reject one. A removed rule with nothing
stopping its return is a rule waiting to come back.

### The sweep found two more, both mine

Review-04 requires re-auditing neighbouring implementation-owned spellings. I did it by enumerating
every `Observation` field and asking *who mints this token* — the schedule, or the candidate — rather
than by recalling where I had been careless.

Most fields carry **fixture-supplied** data: Event IDs, emission IDs, wait generations, progress
values and definition revisions all arrive in the commands the schedule issues, so comparing them
literally compares the laboratory's own inputs. Two families are **candidate-minted**, and for those
the decisions fix relations only. Both were being compared literally:

- **Receipts.** §2's *Left open* note: "exact receipt serialization (opaque token vs. structured
  tuple)" is implementation-owned. ID-6 and OA-2 fix that a replay returns *the same* receipt, a new
  acceptance a *different* one, and a rejection *none*.
- **Activation IDs.** ID-3 and ID-9 are entirely relational — never shared by two different exchanges,
  kept across a takeover. No decision fixes the spelling.

`runScenario` now requires a **bijection** between expected and observed tokens within one run: the
same expected token always names the same observed token, and two expected tokens never collapse onto
one. That is "same means same, different means different" exactly, and it rejects every counterexample
in the corpus, each of which violates the relation rather than the spelling.

A third field was the same defect in the shape round 3 had already corrected once:

- **The recovery hold's reason was compared verbatim**, though PC-5 requires "an inspectable
  recovery-hold state" and fixes no wording — precisely the structure of §11 row 4's "recorded,
  inspectable reason" that round 3 corrected for rejections. I corrected one free-text field and left
  its neighbour, which is why this sweep was done by enumeration rather than memory.

**`writerEpoch` is deliberately left as an integer**, and the reason is recorded rather than assumed:
§2 leaves "integer vs. fencing token" open, but ID-4 permits the integer in terms — "a monotonically
increasing integer (or equivalent total order)" — and every assertion made of it is about advancement
and supersession, which any total order satisfies. An unstated modelling choice is how the
subscription defect got in, so this one is stated.

**Loosening an oracle is where holes open**, so all five directions are pinned by test and each was
verified before the test was written: a consistent re-spelling of receipts and Activation IDs must now
pass; collapsing two Activation IDs, collapsing two receipts, a reworded CX-6 reason and an empty
recovery-hold reason must all still fail.

## 2. K02-R4-02 — the atomicity rule was applied only to new entries — **CLOSED**

**The finding is correct, and the diagnosis is the uncomfortable part.** C4 defined the right unit —
two clauses are separate assertions when a plausible implementation can get one right and the other
wrong — re-derived the assertions it was *adding* against it, and left the entries it had inherited at
whatever granularity they already had. The review's four examples are all inherited entries, and
re-running the rule over the whole map found six more.

That is a recognisable pattern in this packet: round 2's finding was in material added to fix round 1,
round 3's in material added to fix round 2, and round 4's systemic half is a rule I wrote and then did
not apply backwards. Defining the rule felt like the work. It was not.

| | C4 | C5 |
|---|---|---|
| §11 assertions | 69 | **83** |
| with scenario evidence | 64 | **77** |
| `shared` | 3 | 3 |
| corpus / assigned | 1 / 1 | 1 / **2** |
| with an `atomicity` note | — | **17** |
| violating transcripts | 65 | **77** |
| scenarios / steps | 12 / 89 | 12 / **89** |
| k0 fixture tests | 366 | **419** |

Per row: 5, 6, 8, 4, 28, 5, 13, 9, 2, 3.

**The four named examples**, each confirmed against the writers rather than the grammar:

1. **R3-c1** bundled progress and emissions behind one transcript that committed both. Row 7 already
   splits exactly this pair (R7-a2/R7-a3) because a fence can cover the progress commit and miss the
   emission publisher. The same reasoning applies here; split, with a dedicated transcript each.
2. **R5-f1a** bundled "retires nothing" and "wakes nothing". A timer handler can wake while leaving
   the generation live, or clear the registration without producing readiness — the second leaves an
   Execution waiting on a registration that no longer exists. Split.
3. **R8-a** bundled five separately violable clauses. Split into R8-a (no terminal acceptance), R8-a2
   (a recorded reason), R8-a3 (no progress), R8-a4 (no acknowledgment) and R8-a5 (no Effect intent
   left behind), each with its own transcript.
4. **R8-b** described two forbidden alternatives — deleting the Event, or treating it as processed —
   and only ever exercised the second. Split, with a silent-deletion transcript added.

**The six the sweep found:** row 2's acknowledgment bound (it stops at the batch as well as reaching
it), row 3's duplicate (the acceptance transaction and the emission publisher are different writers),
row 5(a) rule 1 (the bare empty declaration and the deadline variant are different submissions — a new
step), row 5(b) (W-7 says "neither wakes *nor acknowledges*"; only the wake half was covered), row
5(g) (W-4 says "creates **no** waitingFor record at all and simply stays RUNNING" — the lifecycle
claim and the record's existence are separate), and row 7's retry (manufacturing a receipt and losing
the recorded rejection are different failures).

**One entry deliberately stays composite**, and now says why in writing: R7-a8 carries Decision M-1's
named failing variant — "suppressing only next state while installing losing progress is a failing
control, not a conforming variant" — because M-1 names that exact combination as something the row-7
control must reject. Its individually violable parts are separately covered by R7-a2, R7-a3 and R7-a4.

### Why the existing guard could not catch this, and what now can

Review-04 is right that the round-3 guard is structurally blind here: "no counterexample defends two
obligations" catches a transcript doing double duty and has no way to see one entry holding two
behaviours. Prose cannot be checked mechanically. **The fields a counterexample actually moves can be.**

`coverage.ts` declares `COUPLED_FIELD_GROUPS`: sets of observation fields that one accepted
transaction necessarily writes together — progress with its revision (OA-4), an Event's disposition
(B-1/B-4/B-5), a lifecycle transition with its generation and readiness (W-2/W-3, B-6/B-7/B-8), an
Activation with its pinned batch (ID-3/B-1), and the answer to one submission (OA-2/OA-5) — each
citing the decision that couples it. An entry whose counterexamples cross more than one group must
carry a written `atomicity` note saying why one plausible bug produces all of it. Seventeen do.

That table is the thing a reviewer should attack if they want to attack the guard, which is why it is
one declared table rather than the same sentence repeated in thirty entries. The guard does not prove
atomicity — as review-04 says, nothing mechanical can — but it converts a silent assumption into a
reviewable claim, which is the remedy `forbiddenBy` already applies to counterexamples.

A third guard stops a split being cosmetic: **no two counterexamples at one step may move the same set
of observation fields.** Two names for one mutation would satisfy every other check here while leaving
the second assertion exactly as unguarded as before.

## 3. Mutation-checking a split is a different claim, and is made as one

Round 3's blind spots were **invisible**: no observation field, or no step, so the old oracle genuinely
passed a violating candidate. Round 4's are **visible but unattributed** — review-04 says so directly:
"The runner would reject some such candidates because the complete expected observation contains those
fields." The defect is that the map promised a transcript per assertion and did not have one.

So I do not claim C4 passed these. The narrower, checkable claim is recorded instead: **each split
transcript used to carry more than one assertion's worth of difference and now carries one.**
`blind-spot-regression.test.ts` pins, for each split pair, the field set the single C4 transcript
moved — transcribed from `e2721dd` and checkable against it — and asserts the two halves divide it and
are not the same mutation under two names.

Every one of the 77 counterexamples is verified by `coverage.test.ts` to be rejected by the oracle at
exactly the step its assertion lives at.

## 4. Self-found defects this round

- **K0.2-SELF-11 — I swept the wrong axis in round 4.** Round 4 reported sweeping "neighbouring
  rejection reasons" and concluded none was over-specified. That sweep was along the *reason-text*
  axis and never asked whether any *validity rule* was invented, which is what K02-R4-01 turned out to
  be — and it missed the recovery hold, a free-text field of exactly the shape it was looking for.
  This round's sweep enumerates every observation field and asks who mints the token, rather than
  recalling where I had been careless.
- **K0.2-SELF-12 — a lexical atomicity detector I wrote and discarded.** My first guard flagged
  obligation text containing "and", "or", "nor" or "neither. It fired on 32 of 83 entries, mostly on
  explanatory clauses, and would have forced justifications for grammar rather than for behaviour —
  the precise thing review-04 warns against ("audit composite phrases ... against the actual
  writers/transactions rather than splitting mechanically by grammar"). Replaced with the field-group
  signal before it reached a commit.

**K0.2-SELF-01 remains open and unfixed, deliberately.** The architecture guard's raw-text import
scanner still treats certain prose as a bare import; `specifiersIn` also backs the live kernel
import-graph guard, so changing it inside K0.2 risks weakening a real guard for a cosmetic gain. It
wants a separate corrective packet and owner release. Re-verified: 79 architecture tests pass, zero
false positives.

## 5. Whole-packet re-audit

- **Rounds 2–4 corrections preserved.** K02-R2-01: the completion control still pins the EF-2 reason
  and asserts only what the protocol fixes. K02-R2-02: `defineProperty`/`Reflect.ownKeys` intact, all
  ledger tests pass. K02-R3-01's concrete fixes: `waitEndedReadiness` and `effectIntents` still
  observed with their corpus invariants, the LP-1 schedule intact, W-1's grammar still submitted
  through the candidate port, reason-text handling intact and now extended.
- **All ten rows re-derived** against the atomicity rule, not only the four the review named.
- **Every scenario still refused** by the refusing candidate: 12 of 12.
- **Corpus invariants re-run**: readiness lifetime, Effect-intent emptiness, wait/batch/disposition
  interactions, sink attribution.
- **Contract and specification reconciled**: contract revision 5, specification §11, all counts
  re-derived from the source rather than transcribed.
- **32 internal K0.2 doc links resolve**; no trailing whitespace or tabs; zero `@arrokothi/*` imports
  in the fixture; no document or test claims K0, E0 or E1 status.

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

Run on committed C5, clean tree.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | **1384 tests / 250 suites / 1384 pass / 0 fail / 0 skipped** |
| `npm run test:conformance` | 1275 pass / 0 fail |
| `npm run test:sdk` | 22 pass / 0 fail |
| `npm run check:builder-docs` | 26 files, 280 links/anchors, 38 imports |
| k0 fixture directory | 419 pass / 39 suites / 0 fail |
| architecture guards | 79 pass / 0 fail |

**The pre-existing suite is unchanged: 1384 − 419 = 965**, the same figure as rounds 1–4. The k0
directory grew 366 → 419.

`npm run test:evals` is not run: it requires provider credentials and network, and this packet adds no
eval. Third-party review: no third-party code, dependency, asset or service was added, copied or
adapted this round; the fixture remains dependency-free and the repository's dependency set is
untouched.

## 8. Limitations, stated plainly

- **This is a prepared fixture, not a result.** The only candidate speaking for the real tree refuses
  every scenario. Every `PASS` here is a hand-authored transcript proving the oracle works.
- **The atomicity guard does not prove atomicity.** It proves that an entry crossing coupled field
  groups has a written justification. If a justification is wrong, the guard passes and the entry is
  still bundled. `COUPLED_FIELD_GROUPS` is likewise a claim about the protocol's writers, not a
  derivation from it.
- **Four rounds have now found defects in my reading of the worksheet**, not in code implementing it.
  That remains the packet's dominant residual risk, and the guards added since round 3 make wrong
  readings *visible to a reviewer who checks* rather than impossible.
- **The three `shared` entries are judgements** that two §11 rows name one observable fact.
- **`effectIntents` cannot see an intent constructed and discarded inside a rejected transaction.**
- **Contract revision 5 is my own wording**, not owner-approved; it corrects claims to match what the
  packet establishes and does not widen scope.

## 9. Where review effort is best spent

1. **Attack `COUPLED_FIELD_GROUPS` and the seventeen `atomicity` notes.** They are where composite
   entries are now permitted to stay composite, and each is prose I wrote.
2. **Re-derive §11 independently against the 83 entries** — particularly whether any remaining entry
   bundles clauses that different writers can fail separately. Three rounds of defects have been here.
3. **Check the R5-a4 assignment against W-9.** If a reviewer reads W-1 rule 3 as fixing something
   about identities that this fixture's `string` representation *can* violate, the assignment is
   wrong and a real negative case is owed.
4. **Check the bijection rule against ID-3/ID-6.** It is now the only thing standing between a
   candidate and a receipt or Activation ID scheme of its choosing; if some decision does fix more
   than the relation, the oracle is under-constrained there.
5. **Check `blind-spot-regression.test.ts`'s transcribed C4 field sets against `e2721dd`.**

## 10. Handoff

- **Base:** `c079237ee7aff428481426f93e87a68b79f170d4` (unchanged).
- **Previously reviewed H4:** `ed438e88173e8f7306dfdfb16c290ea40fa0a0fd` (CHANGES REQUIRED).
- **Reviewer record:** `55f11858962c5dfd9f75c20709209684e5abcbc2` ([review-04.md](review-04.md)).
- **Clean validated payload C5:** `159f3dc0c13779c54a515aaffb74456bccafda09`.
- **Candidate H5:** this commit.
- **Verdict sought:** independent review of C1–C7 and C9. C8 is `BLOCKED_EXTERNAL` and is not offered
  for acceptance. **Not self-accepted, not merged, K0 not closed, K1.0 not released.**
