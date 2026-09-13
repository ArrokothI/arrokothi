# Implementation report — K0.2, round 16

Fix forward from C15/H15 under [review-16.md](review-16.md). Historical reports and reviews are
unchanged. Round 16 found C1–C8 passing and C9 failing on one finding; this round closes that finding
and preserves every prior closure, including the accepted benchmark E0 binding.

## Identity

- Packet/parent: K0.2 / K0. Contract: [contract.md](contract.md), revision 16.
- Governing process baseline and base commit: `c079237ee7aff428481426f93e87a68b79f170d4`.
- State: **WAITING_FOR_REVIEW**. C1–C9 are offered for accountable Round-17 independent review.
- Owner release: explicit owner instruction of 2026-09-11. This round is a correction on a released
  packet and needs no renewed permission (006, "Corrections on a released packet need no renewed
  permission"). No successor is released.
- Prerequisite accepted K0.1 H12 `bab7bf6635781e6d2f9b0e8e333f58440ae0b047`; acceptance record
  `679734a1777ce087c62305d7665071687d8f1cb6`; integration `42731300266eea00a9a24d867d5e82d9887c280d`,
  [receipt](../K0.1/integration-01.md).
- Branch: `codex/k0.2-public-controls-e0-gate`. Observed configured remote: `origin`,
  `https://github.com/ArrokothI/Agent_SDK.git`.
- Preserved C15: `839f1619bc9a628c55a9c60eeef01992727cc613`.
- Previously reviewed H15: `31b9b5fbcf60f9cee5627d82773435663ebd1141`, CHANGES REQUIRED.
- Reviewer record A16 / fetched starting HEAD: `96de003c89681b5904c85747bdd03c42c1e4b98d`
  ([review-16.md](review-16.md)).
- Clean payload C16: `9821cc27dbe5990f86028846b07edfb31cb65380`. Final validation was run on that exact
  tree, after committing it, with a clean working tree.
- Candidate H16: the commit containing this report. A commit cannot name its own SHA; 006 supplies H
  and the verified advertised remote SHA in the handoff.
- Exact C16..H16 administrative allowlist: this report; `docs/development/007-work-packets.md` (its
  K0.2 status row, and the introduction's stale `BLOCKED_EXTERNAL` sentence under round 16's
  documentation-drift note); and the seven output-only `.log` files under
  [validation-16/](validation-16/), added with `git add -f` because `.gitignore` excludes `*.log`.
  The attachments introduce no script, fixture, evaluator rule, threshold or configuration.
- Working-tree state at C16: clean. Push status: pending external handoff.

## Changes and coverage

### Change groups and ownership

All K0.2 fixture and record material. No Kernel, SDK, package or example source is touched, no port
field or command is added, and the published protocol, observation shape, selector grammar, epoch
relations and port adaptation are unchanged.

**Group 1 — the B-2 decomposition (K02-R16-01, C9).** `coverage.ts`, `candidate.ts`, `scenarios.ts`,
`cited-decisions.ts`, `clause-refinements.ts`, `cited-decisions.test.ts`,
`blind-spot-regression.test.ts`. Governing source: worksheet B-2's wait-ended batch rule and its three
determinacy details, with B-4, B-6, B-7, W-7 case 5, W-8 cases 4/6 and W-9 cases 1/3.

**Group 2 — dependent re-audit (self-found).** `coverage.ts`, `candidate.ts`, `cited-decisions.ts`,
`clause-refinements.ts`. See *Additional self-found defects*.

**Group 3 — records.** `contract.md` (revision 16; C8's status and C9's ownership rule),
`public-fixture-specification.md` (§6 rewritten from "why this criterion is blocked" to how it was
satisfied, plus new §22), `007-work-packets.md` (K0.2 row and the introduction's stale sentence).

### The finding, and why the corpus could not see it

B-2's wait-ended batch is `{ the species' mandatory member, if it has one } ∪ { Events eligible under
the retired wait's rule }` over the Events unacknowledged **at reservation**, with truncation retaining
the mandatory member and then filling from the earliest-accepted remaining candidates, ineligible
backlog "never a candidate at any bound, however old it is", and presentation in per-Execution
acceptance order. Four facts; one observation.

Every wait-ended reservation in the corpus was one of two shapes. Four were **bound 1 with a single
candidate** (`k0-trace` 7, `control-subscription-wait-deadline` 5, `cited-decision-edges` 10,
`wait-structure-not-satisfiability` 6): the batch is full, so retention and exclusion are the same
observation and a one-member batch has no presentation order to disagree with. Four had **no ineligible
Event queued** (`control-stale-timer-and-lost-wake` 4 and 10, `cited-decision-edges` 6,
`identity-producer-scope` 9): there is nothing to exclude. So two wrong selectors passed everything —
one that keeps the right mandatory member and tops the batch up from the whole mailbox while the bound
has room, and one that collects the eligible candidates correctly and truncates from the wrong end.

### The decomposition, and who owns what

| Assertion | Owner | Schedule | Counterexample |
|---|---|---|---|
| B-6 mandatory retention at bound 1 | `R5-e1` | `k0-trace` 7, unchanged; text narrowed to displacement | `k0-trace/backlog-displaces-the-wake` |
| B-6 truncation keeps the earliest-accepted eligible candidate | `R5-e1b` | `identity-producer-scope` 9 | `identity-producer/wait-ended-bound-1-takes-the-later-eligible-member` |
| B-6 candidacy with room to spare | `R5-e1c` | `control-stale-timer-and-lost-wake` 14 (new) | `control-stale-timer/spare-capacity-admits-ineligible-backlog` |
| B-7 mandatory retention at bound 1 | `R5-e2` | `control-subscription-wait-deadline` 5, unchanged | `subscription-deadline/backlog-takes-the-slot-from-the-timeout` |
| B-7 candidacy with room to spare, backlog older than the mandatory member | `R5-e2b` | `control-stale-timer-and-lost-wake` 17 (new) | `control-stale-timer/deadline-batch-appends-older-ineligible-backlog` |
| Remaining slots are filled by eligible Events | `R5-j3` | unchanged; text narrowed to the fill half | `clauses/r5-j3` |
| Presentation in acceptance order | `R5-j3b` | unchanged | `clauses/r5-j3b` |
| Bound, nonempty, ordinary selection, empty ordinary batch | `R5-j10/j11/j2/j2b` | unchanged | unchanged |

`identity-producer-scope` step 9 is the corpus's only wait-ended reservation offered more eligible
candidates than its bound holds; it already existed for row 1, and row 5 is attributed to it rather
than duplicated, exactly as the finding permits. The two species are evidenced separately because
their mandatory members arrive differently: a B-6 member is chosen *from* the mailbox, while a B-7
timeout is Kernel-minted at expiry and is therefore **younger** than the backlog beside it — so a
top-up in acceptance order presents the ineligible Event second in one case and first in the other.
That is a different observable shape from a different branch, not an assumption about shared code.

### The five appended steps

`control-stale-timer-and-lost-wake` previously ended with a B-6 path-B readiness it never consumed.
The tail consumes it and reuses one Event for both species. `res-off` is an `effect.result` like the
wakes themselves, so the only reason it is never a candidate is the retired wait's selector — W-1's
source-category rule does none of the work here, and R5-b1's application-input arm is not re-proved.

1. `res-off` accepted while `READY`: a mailbox fact creating no readiness (B-8, §3 row 6).
2. Bound-4 B-6 reservation: three slots stay unused rather than taking it.
3. A fourth wait parks durably under `g4`, leaving `res-off` as backlog older than any timeout.
4. `g4`'s deadline expires (B-7 path B), minting `to-g4` behind `res-off` in acceptance order.
5. Bound-4 B-7 reservation: the mandatory timeout is retained, `res-off` is still not appended.

**Every existing step in the corpus is byte-identical.** A structural fingerprint over
`[command, expected observation]` for all 142 steps was compared against C15: only the five appended
steps are new, no other scenario changed, and every step index referenced by an existing coverage entry
is stable.

### Selected 012 methods, and material exclusions

- **Deterministic execution** — the primary evidence. The finding is an oracle defect, so the proof is
  candidates driven through the corpus with assertions derived from the retired wait and the mailbox
  rather than from the expectation being judged.
- **Normative decisions** — reading B-2's rule and its three determinacy details clause by clause,
  with both species, the empty/spare-capacity cases and the exact bound edge walked explicitly.
- **External evidence/gate** — for C8: the accepted decision is re-inspected read-only and reported,
  never re-derived or re-run.
- **Process/documentation** — contract revision, ledger row, C/H identity, the drift correction.
- **Excluded: race and fault** (no concurrency or persistence claim; the fixture is a deterministic
  schedule with no clock, process or store); **native Runtime/Driver** and **packaging/release** (no
  Driver, package or consumer surface is touched).

### Independence demonstrated, not asserted

Each new bug is written once as a rule over any schedule and run across the whole corpus — the
construction round 13 introduced for the empty-dependency shortcut:

| Candidate | Must fail | Must be accepted by |
|---|---|---|
| `waitEndedTopUpCandidate` — keep what the conforming batch keeps, then fill remaining slots from the mailbox in acceptance order | `control-stale-timer-and-lost-wake` 14 and 17, and nothing else | every bound-1 schedule, including `k0-trace` 7 and `control-subscription-wait-deadline` 5 — which is what makes R5-e1c/R5-e2b independent rather than restatements |
| `waitEndedLateTruncationCandidate` — keep the latest candidates instead of the earliest | `identity-producer-scope` 9, and nothing else | every reservation whose bound already holds all candidates |

Neither reproduces the other's failures, which is C9's split test applied to the constructions
themselves. Structural regressions separately check that each owning schedule genuinely presents its
separating condition — spare capacity with ineligible backlog queued, or more eligible candidates than
the bound holds — and that the deadline case's backlog really does precede its mandatory member in
acceptance order. `cited-decisions.test.ts` gains a named guard so the three B-2 owners cannot be
re-bundled by editing the inventory and recomputing its seal, mirroring the timeout-envelope guard.

### Tests added, ported or removed

Added: three violating transcripts, one self-found transcript, two generic selector candidates, seven
tests in `blind-spot-regression.test.ts` and one guard in `cited-decisions.test.ts`. Narrowed in text
only: `R5-e1`, `R5-e2`, `R5-j3`, clauses `B-2.2`, `B-2.9-r5-j3`, `B-4.4`, `B-6.4`, `W-7.8`.
**Nothing was removed, weakened or skipped.** The clause-inventory seal is recomputed because the
inventory legitimately changed, which is the workflow its own failure message prescribes; the worksheet
source seal is untouched because no accepted source changed. K0 fixture tests went from 788 to 810 and
the whole suite from 1753 to 1775, with the non-K0 baseline unchanged at 965.

### Semantic correction closure (012)

**Invariant — B-2's wait-ended batch is four rules, not one.** Authoritative source: B-2's normative
paragraph plus its three determinacy details; dependants B-4 (retention of excluded Events), B-6 (the
Event species' mandatory member), B-7 (the timeout species'), W-7 case 5, W-8 cases 4/6, W-9 cases 1/3.
Original counterexample: two conforming-looking selectors, one topping up from the mailbox with room to
spare, one truncating from the wrong end, both passing the whole corpus.

Dependent paths walked by role: who *creates* the candidate set (the retired wait's rule, re-derived in
`protocol-vocabulary.ts` and used by the new candidates), who *selects* (the reservation step of every
wait-ended dispatch), who *presents* (acceptance order, R5-j3b), who *retains* what is excluded (B-4,
R6-a2), and which clauses and examples describe it (the B-1/B-2/B-4/B-6/B-7/W-7/W-8/W-9 clause blocks,
the contract's C9, and the specification's §22). Conceptual aliases were followed as well as the
identifiers: "mandatory member", "backlog", "displace", "candidate", "truncate", "top up", "fill".

That sweep produced the self-found items below. It also re-checked the neighbouring entries the finding
named and found them sound: R5-j10 (bound), R5-j11 (nonempty), R5-j2 (ordinary selection) and R5-j2b
(empty ordinary batch) are each one fact with one transcript — and R5-j2 is worth naming, because the
*ordinary* species already had an earliest-accepted-at-bound owner while the wait-ended species did
not, which is the asymmetry the finding describes.

**Why the prior passes missed it.** C15's audit split clauses by re-reading the *source text* for
independently violable facts, and B-2.2's sentence — "excludes ineligible backlog and reserves at least
the earliest eligible member" — was read as one fact because on every schedule in the corpus it *was*
one observation. The audit had no way to notice that the corpus made two rules coincide, because it
compared clauses against clauses rather than against the discriminating power of the schedules
underneath. The guard added here is of the shape that would have caught it: a bug written as a rule
over any schedule, required to fail somewhere and to be accepted elsewhere.

### Prior findings

- **K02-R16-01** — closed by Group 1. Evidence above.
- **Round-16 documentation drift (non-blocking)** — corrected with this payload, as the review
  permits: §6 of the specification and the introduction of `007-work-packets.md` no longer describe
  C8 as blocked. The accepted benchmark evidence itself is untouched.
- **K02-R15-01** — closed at round 15 and unchanged; `selector-isolation.test.ts` still passes.
- **K02-R15-02** — round 16 recorded K02-R16-01 as its residual; that residual is now closed. No other
  part of the round-15 audit is reopened.
- **K02-R14-01 and all findings from rounds 1–13** — closed, with their prior dispositions unchanged.
  The dependent re-audit produced no evidence to reopen any of them.
- **K0.2-SELF-01** — unchanged and still assigned to its own separate packet.

### Additional self-found defects (separate provenance)

Found by this round's dependent re-audit, not by the reviewer.

1. **B-6.4 bundled retirement with readiness; R5-d1b added.** The clause asserted that a path-B wake
   "retires the live registration **and** becomes ready", and only retirement had a transcript.
   Readiness is not a flag: §3 distinguishes wait-ended readiness, which names the retired generation
   and its species, from ordinary `READY`, which carries none — and that distinction is the input to
   B-2's choice between the wait-ended rule and acceptance-order selection. A handler that retires
   perfectly and then marks the Execution plainly `READY` is a coherent §3 row 5 state; it is the
   failure R5-e1's batch transcript sees only one step later and only sometimes. Single-field
   counterexample on `waitEndedReadiness` at `k0-trace` step 6, distinct from the existing
   `liveWaitGeneration` transcript at the same step.
2. **R5-j3's text overclaimed.** "Includes **both** its mandatory timeout and the later eligible
   result" is two facts; its transcript exercises only the fill half. The mandatory half is R5-e2's bug
   model and is capacity-independent, so restating it here would have added a second name for one
   construction rather than a second assertion. Narrowed to the fill half, with the source clause
   `B-2.9-r5-j3` brought into agreement.
3. **B-4.4's genus-level clause covered both species and two facts.** Split by species — the mandatory
   members differ — and trimmed to exclusion alone; the retention half it also mentioned is already
   owned by R6-a2, and W-7 case 5's unbounded exclusion statement is re-bound to the capacity owner
   that actually proves it.

**Foreclosed rather than manufactured.** B-2's "at bound 1 a B-7 batch is exactly the timeout Event
even if a result was accepted before it" has no constructible form in which the earlier Event is
*eligible under the retired rule*: while the wait was live, such an Event would have ended it through
B-6 path B, so it can never still be pending at the expiry. The ineligible reading is owned by
R5-e2/R5-e2b. Recorded rather than invented, per C9 and the finding's "do not manufacture new protocol
concepts".

**Checked and found already owned**, so the re-audit is reviewable rather than asserted: B-7's positive
readiness commit sits inside R5-b4's declared atomicity note at `control-subscription-wait-deadline`
step 4, where one timeout-routing bug produces the whole absent transaction; and B-2's bound, nonempty,
ordinary-selection and empty-ordinary-batch owners are unchanged and each single-fact.

## Validation and interpretation

All commands run from `/Users/rex-shih/Documents/Codex/projects/agent-kernel` on clean C16
(`9821cc27dbe5990f86028846b07edfb31cb65380`), working tree clean, after the payload commit.

| Command | Exit | Result | Raw log | SHA-256 |
|---|---|---|---|---|
| `npm run typecheck` | 0 | `tsc --noEmit -p tsconfig.json`, no diagnostics | [01](validation-16/01-typecheck.log) | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| `npm test` | 0 | 1775 tests / 271 suites / 1775 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo | [02](validation-16/02-npm-test.log) | `9451ec1164b6778cffeaae586f37245f91566905cdc7b60944addd2fbd8e61f3` |
| `npm run test:conformance` | 0 | 1666 / 253 / 1666 pass / 0 fail / 0 skipped | [03](validation-16/03-conformance.log) | `2ad0cd42fda38b206bf0c2e5bfdb683e20852f84b537411e87d50365f5821291` |
| `node --test --experimental-strip-types tests/conformance/k0/*.test.ts` | 0 | 810 / 60 / 810 pass / 0 fail / 0 skipped | [04](validation-16/04-k0.log) | `6c3c3e125a2c0c666df6eb1bc9a5eb15a0f5f1b9939b7e8680e89667c4256dcd` |
| `npm run test:sdk` | 0 | 22 / 22 pass / 0 fail / 0 skipped | [05](validation-16/05-sdk.log) | `cbd7bf70b6b3917e6cfbf74e52e4637071d997c9078f058dd6b7f2e731073d8f` |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 280 local links/anchors, 38 public package imports | [06](validation-16/06-builder-docs.log) | `58177978157b75991d6e958fd6b9714579faf6d02f2a733536acf2f47434f94a` |

Environment: Node `v25.2.1`, npm `11.6.2`, TypeScript `5.9.3`, macOS (darwin 25.6.0). No dependency was
installed, added, removed or changed. `npm test` implies 965 non-K0 tests (1775 − 810), matching the
baseline every prior round recorded.

### External fixture, gate execution and external decision — separately

- **Prepared here:** the K0.2 public fixture. Preparation only; the sole candidate shipped against the
  real supported entry refuses every scenario, and no K0, E0 or E1 status is claimed by it.
- **Gate executed:** none by this packet, at this round or any earlier one. No benchmark run, model
  call or provider request occurred.
- **External decision: it exists, and it is not this packet's.** C8 is satisfied by the benchmark
  owner's own ACCEPT, bound in full by [implementation-15.md](implementation-15.md) and independently
  verified by round-16 review against the benchmark repository. Round 16 re-inspected that chain
  read-only — [07](validation-16/07-benchmark-e0-recheck.log), SHA-256
  `7d82181f35d4f177bc26d6bcd607fbce9ee5a2c34f18e1543a980f6a279eab66` — confirming accepted E0 H
  `26d274fad53b2aa4fc2c7f596cae52e072cd24b5`, independent ACCEPT A
  `ac1445fb8144ffab8a9153b243d4b9237d1927b0` whose `review-04.md` ends `ACCEPT`, the owner's
  integration receipt `9b816d47e83ff210fa32400aa91994f8055138d5` recording the explicit owner
  instruction of 2026-09-12, and benchmark `main` `4d83c245c8f6bb0886c1035ec1c6bba3f91f0ddd` with both
  H and A as ancestors. **Nothing in the benchmark repository was written, changed or rerun**; its
  working tree was left untouched, and the accepted H's historical `ownerDecision: pending` field is
  deliberately not edited, because a later receipt supersedes a status rather than rewriting reviewed
  evidence. The mechanical gate verdict remains a statement about the benchmark's fixtures and is not
  the decision.

### Checks not run, and the resulting limits

- `npm run test:evals` — not run. It exercises Agent behaviour against model-backed paths; this packet
  changes no Agent, Runtime or provider code and makes no behavioural quality claim.
- No live or paid provider run, and no benchmark execution. No owner budget or credential was used.
- No process-death, persistence or concurrency test. Nothing here supports a durability, isolation or
  recovery claim.

### Cumulative criterion self-review (implementer, not acceptance)

| Criterion | Assessment | Basis |
|---|---|---|
| C1 | offered PASS | The K0 trace is byte-identical; its W-8 selectivity, §11 attribution and bound-1 evidence are untouched. One counterexample is added at step 6 (R5-d1b) at a step the trace already owned. |
| C2 | offered PASS | `delayed-runtime-non-blocking` is unchanged in every step and every attribution. |
| C3 | offered PASS | Sink, ledger and attribution material unchanged; the fail-closed ledger guard still runs. |
| C4 | offered PASS | §4's shared-laboratory contract unchanged. |
| C5 | offered PASS | Both shapes unchanged and still specified as preparation; §6 no longer describes the gate as blocked, which is a status correction rather than a new claim. |
| C6 | offered PASS | M-1's controls are unchanged; the row-5 control gains five steps that consume a readiness it previously left outstanding, and asserts nothing about mechanism. |
| C7 | offered PASS | The refusing candidate still refuses everything; the oracle still discriminates in both directions; no representation the protocol leaves open is pinned — the new assertions are about candidacy and order, both of which B-2 fixes. |
| C8 | offered PASS | The accepted external decision above, re-inspected read-only and unchanged. |
| C9 | offered PASS | Every assertion resolves to a scenario/step/counterexample, a declared `shared` link, a corpus check or an explicit assignment; B-2's four facts are now owned separately in both species, each proved independent by exclusion across the corpus; three further clauses found bundled in the dependent re-audit are split or narrowed; and one clause the protocol forecloses is recorded rather than manufactured. |

**Current totals:** 51 decisions / 460 clause references / 273 obligations = 130 scenario + 4 shared +
20 corpus + 119 assigned; 130 violating transcripts; 26 atomicity notes; 15 scenarios / 142 steps;
36 refinement groups. Per-row: 20, 22, 27, 21, 104, 5, 28, 14, 26, 6.

### Design choices, assumptions and the strongest remaining risk

- **Choice: extend one existing scenario rather than add another.** The finding said not to add
  redundant scenarios if existing schedules can truthfully own the assertions. `identity-producer-scope`
  already had the truncation shape; the row-5 control already had an unconsumed readiness and both wake
  species, so five appended steps reach both candidacy cases with one new Event. Appending also leaves
  every existing step index stable, which the fingerprint check verifies.
- **Choice: an off-correlation `effect.result` rather than application input as the excluded Event.**
  It is the same category as the wake, so only the retired selector excludes it; using application
  input would have re-proved W-1's source-category rule instead of B-2's candidacy rule.
- **Choice: evidence both species separately.** One genus-level construction would have assumed the two
  selectors share code. Their mandatory members arrive from different writers and in different
  acceptance positions, and the observable wrong batches differ accordingly.
- **Choice: narrow R5-j3 rather than add a mandatory-with-room owner.** Its missing half is R5-e2's bug
  model and capacity-independent; a second owner would have been a second name for one construction.
- **Assumption:** the corpus-wide "must fail here, must be accepted there" proof treats acceptance by
  other scenarios as evidence of independence. That is sound for the constructions shipped, but it is
  evidence about *these* bug models, not a proof that no other selector defect exists.
- **Strongest remaining risk:** this is the second consecutive round whose defect was invisible to every
  mechanical check the fixture had, and both were of the same kind — the *schedules* lacked
  discriminating power while the clause inventory looked complete. C15 compared clauses against clauses;
  round 13 and round 16 both needed a bug run across the corpus to expose the gap. The guard added here
  is that shape, but it exists only where an author thought to write one. The nearest known soft spot is
  the remaining bound-1 schedules: four wait-ended reservations still prove retention and exclusion in
  one observation, and they are correct as far as they go, but any further B-2 clause discovered later
  will need its own separating schedule rather than one of theirs.

### Third-party review under AGENTS.md

**None.** No third-party code, test, script, asset or dependency was copied, adapted, vendored or
added. No dependency or service terms were newly relied on. Everything in C16 is repository-authored
material derived from the accepted K0.1 worksheet.

## Handoff

- **Ready for accountable Round-17 independent review** on C1–C9.
- Base `c079237ee7aff428481426f93e87a68b79f170d4`; preserved C15
  `839f1619bc9a628c55a9c60eeef01992727cc613`; reviewer record A16
  `96de003c89681b5904c85747bdd03c42c1e4b98d`; clean payload C16
  `9821cc27dbe5990f86028846b07edfb31cb65380`; candidate H16 is the commit containing this report, whose
  full SHA and verified advertised remote SHA are supplied in the external handoff after pushing.
- Review the cumulative base→H16 diff as well as the C15→C16 correction delta, and verify the
  C16..H16 allowlist is exactly this report, the `007-work-packets.md` row plus its introduction
  sentence, and the seven output-only logs.
- **No self-acceptance, no merge, no K0 closure, no K1 start.** Successor release stays owner-controlled.
