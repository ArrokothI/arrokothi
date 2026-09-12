# Implementation report — K0.2, round 13

Fix forward from C12/H12 under [review-13.md](review-13.md). Historical reports and reviews are
unchanged. Round 12's closures stand except where round 13 reopened them with new evidence (C7, C9).

## Identity

- Packet/parent: K0.2 / K0. Contract: [contract.md](contract.md), revision 13.
- Governing process baseline and base commit: `c079237ee7aff428481426f93e87a68b79f170d4`.
- State: **BLOCKED_EXTERNAL**. C1–C7 and C9 are offered for independent review; C8 remains blocked.
- Owner release: explicit owner instruction of 2026-09-11, which authorizes correction of this
  packet and no successor release. This round is a correction on a released packet and needs no
  renewed permission (006, "Corrections on a released packet need no renewed permission").
- Prerequisite accepted K0.1 H12: `bab7bf6635781e6d2f9b0e8e333f58440ae0b047`;
  acceptance record `679734a1777ce087c62305d7665071687d8f1cb6`; integration
  `42731300266eea00a9a24d867d5e82d9887c280d`, [receipt](../K0.1/integration-01.md).
- Branch: `codex/k0.2-public-controls-e0-gate`.
- Observed configured remote: `origin`, `https://github.com/ArrokothI/Agent_SDK.git`. Round 12's
  report recorded `.../agent-kernel.git`; the URL observed in this working tree is the one above, and
  this record corrects it forward without altering round 12's record.
- Preserved C12: `05855f446e52e542e3e6fd52f58d7cfaa105253a`.
- Previously reviewed H12: `e7684a6905a8e406562a159b68f622a5bb528e24`, CHANGES REQUIRED.
- Prior reviewer record A12: `5b72d6d0ca420d3f58755dff8f4cb5d37fae2444` ([review-12.md](review-12.md)).
- Reviewer record / fetched starting HEAD: `452717dfb4a8d4984bbb4a709a9c8a7a3d3c4401`
  ([review-13.md](review-13.md)), a fresh accountable review of the same H12.
- Clean payload C13: `442a3b93099a193d3acef640e0ea2807497dbce1`. Final validation was run on that
  exact tree, after committing it and with a clean working tree.
- Candidate H13: the commit containing this report; full SHA and observed push identity in the
  external handoff. (A commit cannot name its own SHA; 006 supplies H in the handoff.)
- Exact C13..H13 administrative allowlist: this report; `docs/development/007-work-packets.md`
  (its K0.2 status row, and the introduction's stale round-count wording under K02-R12-01); and the
  six output-only `.log` files under [validation-13/](validation-13/), added with `git add -f`
  because `.gitignore` excludes `*.log` (the same mechanism as validation-12). The attachments
  introduce no script, fixture, evaluator rule, threshold or configuration — all of those are in C13.
- Working-tree state at C13: clean. Push status: pending external handoff; this report cannot
  certify a push that has not happened.

## Changes and coverage

### Change groups and ownership

Everything below is K0.2 fixture and record material. No Kernel, SDK, package or example source is
touched, and no architecture boundary moves: the fixture states expectations derived from the
accepted K0.1 worksheet and ships no Kernel implementation.

**Group 1 — the epoch oracle (K02-R13-01, C7/C9).** `tests/conformance/k0/fixture.ts`,
`scenarios.ts`, `protocol-vocabulary.ts`, `interactions.test.ts`, `blind-spot-regression.test.ts`,
`candidate.ts`.

Governing source: worksheet §2 ID-3, ID-4, ID-9 cases 1–4, and §2's *Left open* note.

- `EpochRelation` replaces the literal comparison. It binds the epoch **per exchange**, keyed by the
  Activation ID the step names, and enforces only the relations ID-4 fixes inside one unresolved
  exchange: the same attempt always names the same epoch, a later attempt a strictly later epoch, an
  earlier attempt a strictly earlier one, and two attempts never collapse onto one. Across exchanges
  nothing is related, because ID-4 says in terms that reset or continue "across a later, genuinely new
  Activation ID is an implementation choice ... either satisfies ID-3/ID-4".
- Where the step shows no unresolved Activation, nothing is asserted and nothing is bound. The field
  is "the writer epoch of the current exchange"; with no current exchange there is nothing for it to
  be the writer of, and ID-4 fixes no spelling for that.
- The schedules now write **exchange-local attempt ordinals**: every exchange opens at 1, and the only
  value above 1 in the corpus is `identity-create-and-activation`'s `act-1` after its authenticated
  takeover. Six scenarios changed (`k0-trace`, `identity-create-and-activation`,
  `control-stale-timer-and-lost-wake`, `control-subscription-wait-deadline`,
  `wait-structure-not-satisfiability`, `control-missing-checkpoint-code`); `identity-producer-scope`
  needed no change, which is what made the contradiction visible.
- `adaptCommandToCandidate` resolves a submitted envelope's exchange and epoch out of the
  laboratory's namespace and into the candidate's, using bindings the observations already
  established, and fails the step closed when a name cannot be resolved.
- `normalizeRepresentations` now rewrites `writerEpoch` unconditionally, so the structural comparison
  never judges it; the relation is the only judge.

**Group 2 — R5-c2's assertion owner (K02-R13-02, C9).** `coverage.ts`, `candidate.ts`, `scenarios.ts`,
`blind-spot-regression.test.ts`.

Governing source: worksheet W-2 step 2 and W-8 case 1; §11 row 5(c); C9's ownership rule.

- R5-c2 is narrowed to the general clause and keeps `control-stale-timer-and-lost-wake` step 3. Its
  transcript is renamed `control-stale-timer/lost-wake-at-registration` and its `forbiddenBy` no
  longer claims the empty-dependency case its schedule cannot exercise.
- R5-c2b owns the empty-dependency clause at `identity-producer-scope` step 8. `identity-producer-scope`
  now declares §11 row 5 as well as row 1, and `coverage.test.ts`'s bidirectional attribution check
  covers the change.
- The counterexample exists in two forms on purpose. `identity-producer/empty-dependency-list-skips-the-mailbox-check`
  is the registered transcript the coverage map requires, moving `state`, `liveWaitGeneration` and
  `waitEndedReadiness` with an `atomicity` note for the single upstream branch that produces all three.
  `emptyDependencyShortcutCandidate` is the same bug written as a rule over any schedule, so the corpus
  can assert the second half of ownership that a scenario-scoped transcript cannot state.

**Group 3 — dependent re-audit (self-found).** `coverage.ts`, `candidate.ts`. See *Additional
self-found defects*.

**Group 4 — records.** `contract.md` (revision 13; C7's representation rule extended to the epoch
family, C9's ownership rule extended to clause-condition ownership and explicit assignment),
`public-fixture-specification.md` (§19, current totals, the scenario table, and the two P3 wording
corrections), `007-work-packets.md` (K0.2 row and the introduction's stale round count).

### Full cumulative diff

`git diff c079237ee7aff428481426f93e87a68b79f170d4..442a3b93099a193d3acef640e0ea2807497dbce1` is the
payload; `git diff 442a3b93099a193d3acef640e0ea2807497dbce1..<H13>` is the administrative allowlist
above. The round-13 correction delta alone is `git diff e7684a6905a8e406562a159b68f622a5bb528e24..442a3b93099a193d3acef640e0ea2807497dbce1`,
nine files, +1090 / −60 lines.

### Selected 012 methods, and material exclusions

- **Deterministic execution** — the oracle's behaviour. Both findings are oracle defects, so the
  primary evidence is candidates driven through the corpus with derived assertions: four conforming
  epoch policies that must pass, two that must fail, the shortcut candidate that must fail at exactly
  one step and pass elsewhere, and the existing 110-transcript discrimination corpus.
- **Normative decisions** — reading ID-3/ID-4/ID-9 and W-2/W-8 clause by clause, including the
  *Left open* notes, which is where the over-constraint lived. Both orders of the interacting
  operations (redelivery before takeover, takeover before submission, stale before current) and the
  absence/empty cases (empty dependency list, no unresolved exchange) are walked explicitly.
- **Process/documentation** — the records: contract revision, ledger row, C/H identity and the P3
  wording corrections.
- **Excluded: race and fault.** Nothing here is a concurrency or persistence claim; the fixture is a
  deterministic schedule with no clock, no process and no store.
- **Excluded: native Runtime/Driver, packaging/release.** No Driver, package or consumer surface is
  touched. **External evidence/gate** applies only to C8, which is inspected and reported, not run.

### Obligation and interaction coverage

| Obligation / source | Schedule, including the negative case | Expected facts and forbidden changes | Location and result |
|---|---|---|---|
| ID-9 case 1: redelivery keeps the epoch | `identity-create-and-activation` steps 3→5, `redeliver_dispatch` after a late arrival | Same exchange, same attempt; a candidate reporting a different epoch for the bound attempt fails naming `writerEpoch` | `candidate.ts` `identity-activation/redelivery-advances-the-writer-epoch`; `blind-spot-regression.test.ts` — FAIL at step 5 as required |
| ID-4 / ID-9 case 2: takeover advances it under the same ID | same scenario, step 6 | Strictly later epoch, same Activation ID, same pinned batch; an unchanged or lower epoch fails | `identity-activation/takeover-leaves-the-writer-epoch-unchanged`; `takeover-does-not-advance` and `takeover-moves-backwards` policies — all FAIL at step 6 naming `writerEpoch` |
| ID-9 case 3 / LP-1: stale old-epoch submission is rejected | same scenario, step 7 submits the superseded attempt | `stale_exchange` recorded, no progress, no receipt, epoch not rolled back | `identity-activation/superseded-writer-epoch-accepted-from-a-stale-read`, `.../stale-rejection-mints-a-receipt` — FAIL at step 7 |
| ID-4 *Left open*: a genuinely new Activation ID imposes no reset/continue policy | whole corpus, four policies | Every scenario PASSes under reset, continue, advance-per-exchange and an opaque ascending fence; each policy mints its own Activation IDs and rejects any envelope naming an exchange it never opened or an epoch it never issued | `blind-spot-regression.test.ts`, four tests — all PASS |
| Corpus shape: no schedule states a cross-exchange epoch relation | every scenario | Each exchange opens at attempt 1; an advance occurs only at a `takeover` command and only upward; exactly one advance exists in the corpus | `interactions.test.ts` — PASS |
| Port: every submitted envelope is resolvable | every scenario | Each `submit_outcome`/`resubmit_outcome` names an exchange and attempt an earlier step observed, so the fail-closed path is never relied on | `interactions.test.ts` — PASS |
| W-2 step 2 runs (general) | `control-stale-timer-and-lost-wake` step 3, dependency wait with an already-accepted `effect.result` | READY with the generation retired in the same transaction; persisting WAITING fails | R5-c2 / `control-stale-timer/lost-wake-at-registration` — FAIL at step 3 |
| W-2 step 2 is not skipped for an empty dependency list (W-8 case 1) | `identity-producer-scope` step 8: `dependencies: []`, one `continue` subscription, `input-a`/`input-b` accepted and unacknowledged at steps 4–5 | B-6 path-A readiness, generation retired, inputs still queued and unacknowledged; persisting WAITING fails naming `state`, `liveWaitGeneration`, `waitEndedReadiness` | R5-c2b / `identity-producer/empty-dependency-list-skips-the-mailbox-check` — FAIL at step 8 |
| The empty-dependency clause is *independently* owned | the same bug as a rule over every schedule | Must FAIL at `identity-producer-scope` step 8 and **PASS every other scenario**, R5-c2's included | `emptyDependencyShortcutCandidate`, `blind-spot-regression.test.ts` — both directions PASS |
| The owning schedule really presents the condition | structural check of step 8 and of R5-c2's step 3 | Empty dependency list, well-formed subscription-only wait, an already-accepted unacknowledged eligible input, path-A conforming answer; and R5-c2's wait has a non-empty dependency list | `blind-spot-regression.test.ts` — PASS |
| W-2 step 2 mints no timeout Event (self-found) | `control-stale-timer-and-lost-wake` step 3, whose wait carries a deadline and is retired at registration | §3 row 1, not row 3: no timeout in the mailbox for the retired generation | R5-c2c / `control-stale-timer/path-A-retirement-mints-a-timeout` — FAIL at step 3, single-field on `queued` |

Interactions re-run after the change: the ID-2 ingress sweep, the wait-registration/batch/disposition
sweep, the readiness-lifetime sweep, the accepted-deadline sweep, the Effect-intent sweep, the
timeout-generation sweep and the sink-attribution sweep all pass unchanged, plus the new epoch sweep.
`coverage.test.ts`'s no-shared-transcript, no-shared-field-set-at-a-step, coupled-group-atomicity and
bidirectional row-attribution checks all pass with the two new scenario entries and the three new
assignments.

### Tests added, ported or removed

Added: four conforming and two violating epoch policies with a policy candidate that verifies the
envelopes it is handed; the empty-dependency shortcut candidate; two new violating transcripts
(`identity-producer/empty-dependency-list-skips-the-mailbox-check`,
`control-stale-timer/path-A-retirement-mints-a-timeout`); eleven new tests across
`blind-spot-regression.test.ts` and `interactions.test.ts`. Renamed and re-cited:
`control-stale-timer/lost-wake-on-empty-dependency-list` →
`control-stale-timer/lost-wake-at-registration`, same schedule, same step, same mutation, truthful
citation. **Nothing was removed or weakened.** Two round-10 assertions in
`blind-spot-regression.test.ts` were rewritten from literal epoch values to the relations they were
always making (redelivery names the dispatch's attempt; takeover names a later one); the same
schedules and the same transcripts still back them. K0 fixture tests went from 551 to 575; the whole
suite from 1516 to 1540, with the non-K0 baseline unchanged at 965.

No compatibility or refusal surface changes: the refusing candidate still refuses every scenario, and
no package export, guide or skill is affected. `check:builder-docs` covers the guides inventory and is
green.

### Semantic correction closure (012)

**Invariant 1 — what ID-4 fixes.** Authoritative source: worksheet §2 ID-4 with ID-9 cases 1–4 and
§2's *Left open* note. Original counterexample: two conforming implementations, one resetting and one
continuing the epoch at a new Activation ID, each rejected by a different part of the corpus. The
normative obligation is three within-exchange relations; the mechanism (integer versus fencing token)
and the cross-exchange policy are both implementation-owned, and the prior revision had collapsed the
obligation into one of the mechanisms.

Dependent paths walked, by role rather than by text search: who *creates* the fact (the `dispatch`,
`redeliver_dispatch` and `takeover` commands, and each scenario's expected observations), who
*validates* it (`compareRepresentations`, now via `EpochRelation`), where it *commits* (the schedule's
bound attempt ordinals), who *consumes* it (`normalizeRepresentations`, `describeDifference`, the
`submit_outcome`/`resubmit_outcome` envelopes, `mustNameFields` on two transcripts), how it survives
or is refused (the fail-closed port adaptation), and which examples and oracles describe it (the
`Observation` and `OutcomeEnvelope` doc comments, `scenarios.ts`'s header, `fixture.ts`'s
representation note, the contract's C7/C9 and the specification's §16 and §19). Conceptual aliases were
followed as well as the identifier: "attempt", "supersession", "stale writer", "fencing token".

The sweep found one dependent occurrence the review had not named: the **Activation ID in a submitted
envelope** has the same laboratory-versus-candidate namespace problem, and has had it since round 5
made ID-3/ID-9 relational. It is corrected in the same place and by the same mechanism.

**Invariant 2 — a clause is owned by a schedule that presents its condition.** Authoritative source:
W-8 case 1 with W-2 step 2; C9's requirement that an assertion resolve to a scenario, step and
counterexample the oracle rejects *at that step*, and that a neighbouring counterexample is not
assertion-level evidence. Original counterexample: a candidate whose registration writer branches on
`dependencies.length === 0`, which R5-c2's declared transcript cannot see.

Dependent paths: every registration in the corpus was enumerated by whether its wait has an empty
dependency list and whether its conforming answer is path-A readiness, which is what identified
`identity-producer-scope` step 8 as the only schedule that presents the condition, and what let the
counterexample be written as one rule instead of a hand-edited observation. Row attribution, the
coupled-field-group atomicity rule, the no-shared-transcript rule and the field-set collision rule were
re-checked for both the narrowed entry and the new one.

**Why the prior passes missed both.** Invariant 1: the prior revision *recorded* the modelling choice
in `fixture.ts` ("the epoch is deliberately left as an integer ... every assertion made of it is about
advancement and supersession") and then never tested the claim against the corpus. Writing the
assumption down made it feel discharged; no test or sweep ever asked whether a single conforming
policy could satisfy every scenario at once, and the contradiction needed two scenarios compared with
each other rather than either read alone. That is exactly the corpus-shaped defect a per-scenario
review cannot find, which is why the guard added for it is a corpus sweep. Invariant 2: R5-c2's text
named the empty-dependency case and the transcript was *named after it*, so every mechanical check —
right step, cited rule, single owner, distinct field set — passed while the schedule underneath had a
dependency alternative. The name stood in for the condition. The new regression checks the schedule's
shape rather than the entry's prose, and the shortcut candidate proves ownership by exclusion.

### Prior findings

Open findings carried into this round:

- **K02-R13-01** — closed by Group 1. Evidence above.
- **K02-R13-02** — closed by Group 2. Evidence above.
- **K02-R12-01 (P3)** — corrected with this payload as review 13 permits: `007-work-packets.md`'s
  introduction no longer states a round count, and points at the authoritative row instead.
- Round 13's two P3 wording notes — corrected: the specification's transcript count is current (110),
  and its claim that every failure names an observation field now accounts for
  `effect-refusal/refusal-claimed-while-the-sink-was-called`, whose discrimination is the independent
  ledger by design and whose `mustNameFields` is deliberately empty.
- **K0.2-SELF-01** — unchanged and still open for a separate packet; not in this packet's scope.

Closed findings from rounds 1–12 keep their prior dispositions and are unchanged; the dependent
re-audit produced no evidence to reopen any of them. Round 13 explicitly declined to promote three
supplementary observations (C2's synthesized transcript, the operation sink's frozen exotic objects,
and the decision-clause inventory) to findings; none is treated as a requirement here, and the one it
did ask to be *recorded* — the decision-clause inventory — is recorded as explicit assignment rather
than as new obligations.

### Additional self-found defects (separate provenance)

Found by this round's dependent re-audit, not by the reviewer.

1. **The Activation ID in a submitted envelope was never adapted to the candidate's namespace.** Same
   defect as the epoch half of K02-R13-01, at the same port, and unreported. A candidate minting its
   own Activation-ID spellings — which ID-3 and the round-5 correction explicitly permit — would have
   been handed envelopes naming exchanges it never opened. Corrected in `adaptCommandToCandidate`;
   evidenced by the `opaque-ascending-fence` policy candidate, which mints its own IDs and rejects any
   envelope it does not recognise.
2. **W-2 step 2's no-timeout clause was unowned.** W-2 step 2 says "**No timeout Event is created** for
   that generation" and §3 defines row 3 as "as row 1, **plus exactly one timeout Event**", so a path-A
   retirement that also mints one produces row 3 where row 5(c) requires row 1. Added as R5-c2c with a
   single-field counterexample on `queued` at `control-stale-timer-and-lost-wake` step 3, whose wait
   carries a deadline and is retired at registration.
3. **Three cited-decision clauses had no observation surface and no assignment.** W-2 step 3's "one
   accepted-time observation taken in this transaction" and its non-strict due comparison both turn on
   a clock K0.2 does not have — no command supplies or advances an accepted-time observation — and are
   assigned to K1.3, which owns the registration transaction; ID-1's non-reissue-after-deletion clause
   is assigned to K5.2, which 007 gives deletion. C9 requires such assertions to be assigned explicitly
   rather than counted covered or silently omitted, and this is the treatment round 13 asked for when
   it declined to make the ID-1 note a blocking finding. Adding a clock command or a deletion command
   to observe them would extend the released fixture vocabulary, which is not this correction's scope.

Three clauses in the same sweep were checked and found already owned, recorded in §19 so the re-audit
is reviewable rather than asserted: W-2 step 2's stale-timer clause (R5-f1a/f1a2/f1b/f4), W-2 step 4's
durable `WAITING` with its live generation (R5-c1's transcript at `k0-trace` step 4) and its accepted
deadline (R5-c4), and W-2 step 3's minting of exactly one timeout inside R5-c3's declared atomicity.

### Unresolved obligations and unblock conditions

C8 only. Nothing in C1–C7 or C9 is left for the reviewer to decide.

## Validation and interpretation

All commands run from `/Users/rex-shih/Documents/Codex/projects/agent-kernel` on clean C13
(`442a3b93099a193d3acef640e0ea2807497dbce1`), working tree clean, after the payload commit.

| Command | Exit | Result | Raw log | SHA-256 |
|---|---|---|---|---|
| `npm run typecheck` | 0 | `tsc --noEmit -p tsconfig.json`, no diagnostics | [validation-13/typecheck.log](validation-13/typecheck.log) | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| `npm test` | 0 | 1540 tests / 266 suites / 1540 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo | [validation-13/npm-test.log](validation-13/npm-test.log) | `dc08760b47d6cd4f23cca2b90f4bcc22c1cda6111f4ac039618f21dd80fb16e1` |
| `npm run test:conformance` | 0 | 1431 / 248 / 1431 pass / 0 fail / 0 skipped | [validation-13/conformance.log](validation-13/conformance.log) | `759b1845f7c0cfe16f6b63bf7fb5d2e2b25673494b536ba633c13cc7589ce540` |
| `node --test --experimental-strip-types tests/conformance/k0/*.test.ts` | 0 | 575 / 55 / 575 pass / 0 fail / 0 skipped | [validation-13/k0.log](validation-13/k0.log) | `eeebbeda96193c8b8b1976e1e5824eaf3e75f7bbf69f932c8f00698fe1ff3ed0` |
| `npm run test:sdk` | 0 | 22 / 22 pass / 0 fail / 0 skipped | [validation-13/sdk.log](validation-13/sdk.log) | `9f86b5af49a7be1cbd4838f47db227c228b106b1678b020c2dbd6c546383663c` |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 280 local links/anchors, 38 public package imports | [validation-13/builder-docs.log](validation-13/builder-docs.log) | `58177978157b75991d6e958fd6b9714579faf6d02f2a733536acf2f47434f94a` |

Environment: Node `v25.2.1`, npm `11.6.2`, TypeScript `5.9.3` (`npx tsc --version`), macOS
(darwin 25.6.0). No dependency was installed, added, removed or changed; the existing installed
lockfile dependencies were used. `npm test` implies 965 non-K0 tests (1540 − 575), matching the
baseline round 12 recorded.

### External fixture, gate execution and external decision — separately

- **Prepared here:** the K0.2 public fixture. It is preparation only. No K0, E0 or E1 status is
  claimed by it, and the only candidate shipped against the real supported entry refuses every
  scenario.
- **Gate executed:** none by this packet. No benchmark run, model call or provider request occurred.
- **External decision:** none exists. Inspected at this round, in the local benchmark checkout after
  `git fetch --all`:
  - benchmark `main` is still `98756f8c10bd806125da8318f1a129bc030aca61`, the pre-E0 revision the
    contract records;
  - branch `e0-claims-ownership-and-public-controls` exists at
    `5f921f9b415407fe3bdff43a545878437ac31a93`. Its `fixtures/e0/evidence-record.json` records
    `recordId: "e0-public-controls/1"`, `fixtureVersion: "e0-public-controls/1"`,
    `fixtureSetHash: sha256:f4f3b493…e937a0`, `observationPolicyVersion: "e0-observation-policy-v1"`,
    evaluator `e0-gate-v1` with `semanticJudgment: "none"`, and `gate.verdict: "PASS"` over 10
    advertised properties;
  - and it records `ownerDecision.state: "pending"`, with its own note that "whether this deliverable
    is accepted as E0 is the repository owner's decision ... No acceptance is claimed, implied or
    self-granted here, and no consumer of this record may read the PASS above as one."

That is in-progress evidence, not the accepted E0 decision C8 requires, so **C8 stays
`BLOCKED_EXTERNAL`** and this candidate binds no E0 identity. Review 13's instruction is followed
exactly: the mechanical PASS is not treated as acceptance, and no acceptance is manufactured to avoid
another round. Responsible actor: the benchmark repository owner. Unblock condition: an owner-accepted
E0 revision, independently inspectable, whose fixture/config identities, raw observations, evaluator
version and actual decision can be recorded here.

### Checks not run, and the resulting limits

- `npm run test:evals` — not run. It exercises Agent behaviour against model-backed paths; this packet
  changes no Agent, Runtime or provider code, and the deterministic fixture makes no behavioural
  quality claim. Nothing here is evidence about Agent quality.
- No live or paid provider run, and no benchmark execution. No owner budget or credential was
  requested or used.
- No process-death, persistence or concurrency test. The fixture is a deterministic in-memory
  schedule; nothing here supports a durability, isolation or recovery claim.

### Why the evidence supports each criterion (implementer assessment, not acceptance)

- **C1** — the K0 trace is unchanged in substance; only its epoch ordinals changed, and the
  interaction sweep plus the four policy candidates show the trace is now satisfiable by conforming
  implementations that differ on the point ID-4 leaves open. Its W-8 selectivity and §11 evidence are
  untouched.
- **C2, C3, C4, C5** — untouched by this round; no scenario, sink, specification section or
  application shape changed except the specification's §19, totals and two P3 wording corrections.
- **C6** — the controls are unchanged except that `control-stale-timer-and-lost-wake` gains one more
  counterexample (R5-c2c) at an existing step. No control asserts anything new about mechanism.
- **C7** — (a) the refusing candidate still refuses everything; (b) the oracle is proven in both
  directions, and this round strengthens the "may not pin a representation the protocol does not fix"
  clause with the epoch family, evidenced by four conforming policies accepted and two non-conforming
  ones rejected at the right step; (c) the fail-closed ledger guard is unchanged; (d) no document or
  test here claims K0, E0 or E1 status.
- **C8** — **FAIL / BLOCKED_EXTERNAL**, as recorded above. This is not offered as a pass.
- **C9** — every assertion resolves to a scenario, step and counterexample, a declared `shared` link, a
  corpus check or an explicit assignment; the empty-dependency clause now has an owner whose schedule
  presents its condition, proved in both directions; three previously absent cited-decision clauses are
  disposed of explicitly; and the over-constraint C9 calls the worse failure is removed from the epoch
  family without making either permitted policy normative.

### Design choices, assumptions and the strongest remaining risk

- **Choice: relate epochs, do not pick a policy.** The alternative — make `identity-producer-scope`
  advance its epoch so the corpus is internally consistent — would have made one implementation-owned
  policy normative, which review 13 forbids in terms. The relational oracle under-constrains the
  cross-exchange case deliberately, because the protocol fixes nothing there.
- **Choice: exchange-local ordinals in the schedules.** Not strictly required once the runner ignores
  cross-exchange relations, but it removes the corpus's ability to *state* such a claim, which is what
  let this defect survive twelve rounds of reading.
- **Choice: adapt commands rather than require the candidate to adopt laboratory names.** The opposite
  reading — the candidate maps laboratory names itself — is incoherent, because the candidate never
  learns the laboratory's name for an exchange it minted.
- **Choice: assign the clock clauses rather than add a clock command.** C9 permits either; adding an
  accepted-time command would extend the released fixture vocabulary well beyond this correction, and
  E-6's limit matrix is already assigned to K1 for the same reason.
- **Assumption:** ID-4's permitted cross-exchange behaviours are treated as *unconstrained* rather than
  as exactly the two named options. This is the safer direction — it cannot reject conforming work —
  and it keeps the fixture from adjudicating a question the worksheet leaves open. A reviewer who reads
  ID-4 as fixing exactly reset-or-continue should say so; the corresponding tightening would be a new
  obligation, not a change to what is here.
- **Strongest remaining risk:** the coverage subsystem has now produced a defect in three consecutive
  reconstructions, and both of this round's defects were invisible to every mechanical check the
  fixture had — one needed two scenarios compared with each other, the other needed the schedule
  underneath a correctly-named transcript to be inspected. The guards added here are of exactly those
  two shapes (a corpus sweep, and a structural precondition check), but a third shape may exist. The
  residual epoch representation where no exchange is unresolved is the nearest known soft spot: it is
  deliberately unasserted, and if a reviewer believes some accepted decision does fix it, that is an
  under-coverage claim this round would accept.

### Third-party review under AGENTS.md

**None.** No third-party code, test, script, asset or dependency was copied, adapted, vendored or
added. No dependency or service terms were newly relied on. Everything in C13 is repository-authored
material derived from the accepted K0.1 worksheet.

## Handoff

- **Ready for independent review** on C1–C7 and C9. C8 is not ready and is not offered: it remains
  `BLOCKED_EXTERNAL` on a benchmark-owner decision that does not exist yet.
- Base `c079237ee7aff428481426f93e87a68b79f170d4`; clean payload C13
  `442a3b93099a193d3acef640e0ea2807497dbce1`; candidate H13 is the commit containing this report, whose
  full SHA and verified advertised remote SHA are supplied in the external handoff after pushing.
- Review the cumulative base→H13 diff as well as the C12→C13 correction delta, and verify the
  C13..H13 allowlist is exactly this report, the `007-work-packets.md` row plus its introduction
  sentence, and the six output-only logs.
- **No self-acceptance.** The next accountable review is round 14. Successor release stays
  owner-controlled; K0 remains open and K1.0 unreleased.
