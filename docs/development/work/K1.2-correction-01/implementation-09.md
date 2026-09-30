# Implementation report — K1.2-correction-01, round 9 (contract revision 10)

Claude Code desktop, model `claude-opus-5-5`, 2026-09-29. The owner handed this round to a fresh
Claude Code session with a brief for contract revision 10 after [review 12](review-12.md). Rounds 6–8
were implemented by other sessions of the same model. Review 12's [owner note](owner-note-12.md)
asked the owner to consider switching or escalating the implementation agent; the choice of this
session is the owner's.

This session wrote no earlier review, report, amendment or prompt of this packet. It is not the
independent reviewer. It did record review 12 on the branch (`354caa7`), on the owner's explicit
instruction: the brief's precondition, a pushed commit recording the review, did not exist (see
Identity). The report records implementer work, not acceptance.

## Design

### The rule for this round

The brief's rule: *write the claim from the checker, not the checker from the claim.* Review 12 found
the runtime correct and DEC-8 passing. It also found two gaps in the DEC-9 fault sweep: its checker
compared less than the contract said it did (`K12C1-R12-ORACLE-01`), and its scenarios reached
fewer exits than the contract said they did (`K12C1-R12-SCOPE-01`). This round therefore changes the
evaluator and its declared scope only. Production code is unchanged.

Three structural choices follow from the rule.
- **Every comparison has a name.** The oracle (`sweep/fault-oracle.ts`) makes each comparison through
  one table, `CHECKS`. The contract names those entries, so each claim points at the comparison
  that establishes it. The mutant runner disables each entry in turn.
- **The scope is drawn from the source.** The exits the sweep must reach are found in
  `coordinator.ts` by the TypeScript parser, not listed by hand. V8 block coverage then shows which
  exits each scenario's uninjected call executes.
- **The claim text comes last.** The contract's DEC-9 evidence bullet and BASELINE were written after
  the checker, and they cite its `CHECKS` entries and scenario names.

### The oracle: one complete expected decision per permitted outcome

Each run is judged on an `Observation` with four parts:
1. the value the call returned (its answer, its refusal, or the fault it threw);
2. the whole inspection view;
3. the positions the next refusal and the next accepted input receive;
4. what the grant the Driver received at setup can still do.

Round 8's checker compared parts 2–4 on most branches, but its refusal branch omitted the grant. It
compared part 1 only as far as whether a throw was the injected fault. Now each permitted outcome
is one expected `Observation`, and a run passes only if all four parts equal it
(`CHECKS.returned`, `view`, `nextRefusal`, `nextAcceptance`, `setupGrant`). Two checks come before
that: the fault must have fired (`fired`), at the same kind of operation the reference run made at
position k (`sameOperation`).

| The call | Expected returned value | Expected state |
|---|---|---|
| threw | that run's injected fault | the no-call baseline `B` |
| refused, naming the Execution | the refusal, at `B`'s next refusal position, naming this Execution (`refusalPosition`, `refusalExecution`) | `B` plus exactly that record; the refusal index one further; acceptance index and grant as in `B` |
| refused, naming no Execution | the unknown-destination refusal, from a clean call | `B` |
| accepted | the reference answer | the reference state |
| accepted | the declared alternate call's answer | the alternate call's state |
| no fault (k = N + 1) | the reference answer or refusal (`quietRepeat`) | the reference state |

This closes review 12's first two observations:
- On the refusal branch the grant is compared. A refusal that leaves the setup grant unauthorized
  fails `setupGrant`.
- On every accepted branch, and on the no-fault repeat, the returned answer is compared. A report
  that answers `changed: false, recoveryHolds: []` while the state holds the new hold fails
  `returned`.

### Located exceptions

Review 12's third observation: round 8 admitted an Outcome apply-window fault by the name of the
method that threw. Now each exception applies only in scenarios whose uninjected call accepts
(`acceptingExit`). It also needs the fault's own stack. A thrown fault records the zone frames above
it, and one of those frames must be at a statement the parser finds in `coordinator.ts`.
- **Takeover delivery** (`deliveredAt`): the fault is in `#deliver`, which runs after the commit. The
  location decides the expected row and returned value:
  - at the row's append: the row is absent, and the fault is thrown;
  - at the capability's freeze: the row is pending, and the fault is thrown;
  - inside the Driver: the row is failed with the Kernel's fallback reason (taken from a clean call
    with a throwing Driver), and the uninjected answer is returned.
- **Takeover apply window** (`takeoverWindowAt`): the fault is at the clearing record's append. The
  fault is thrown, and the state is `B` plus exactly the receipt.
- **Outcome apply window** (`outcomeStepAt`, `outcomePrefix`): the fault is at one of `#accept`'s apply
  statements, and the state must be a prefix of the declared apply sequence `OUTCOME_APPLY` ending
  inside that statement. Two further checks cover the sequence itself:
  - it must match `#accept`'s statements one for one, in order, followed by the return
    (`applySequence`);
  - from the no-call state, applying it whole must reproduce the uninjected state (`applyModel`).

The prefix states come from a small model, `outcomeLadder`. Each step changes the view part it owns,
taking the value from the uninjected state. One step is modelled on the probes rather than on the
view:
- once the acceptance index has advanced, the acceptance probe receives the next position;
- until the accepted-Outcome record is stored, the setup grant's probe is itself accepted, one
  position later;
- after that, the probe is a conflicting replay.

The sweep observed exactly these values in all of its Outcome-window runs (entry 52).

### The uninjected decision

Round 8 took the uninjected decision as given. `checkContext` now checks it:
- *its kind:* it takes its declared kind of exit, with its declared refusal classification
  (`referenceKind`);
- *a refusal:* it leaves the no-call baseline plus exactly that record (`referenceRefusal`);
- *a refusal naming no Execution:* it leaves the no-call state (`referenceUnnamed`);
- *an idempotent answer:* it leaves the no-call state (`referenceUnchanged`);
- *an exact replay:* it leaves the no-call state and returns the accepted decision
  (`referenceReplay`);
- *an accepted answer, and the declared alternate's:* it agrees with the state it leaves:
  - `recoveryAnswer`: the holds and the attempt;
  - `takeoverAnswer`: the attempt, the epochs, the batch, the receipt, the positions and a fenced setup
    grant;
  - `outcomeAnswer`: the receipt, the next state, the revision, the acknowledged and ended Events, the
    Emissions, the result, the positions and the grant.

### Scope: 66 scenarios and a 57-exit inventory

`sweep/fault-scenarios.ts` lists the scenarios. Each names the exit its uninjected call takes, as the
method and a snippet unique to that `return`:
- `recoverExecution`: 14;
- `reportProtocolFailure`: 12;
- `requestTakeover`: 17;
- `submitOutcome`: 23.

The contract's DEC-9 evidence bullet lists every one. Review 12's 16 exits are all among them:
- the unknown and hidden Execution of all three controls;
- the stale Activation, no unresolved exchange and ended Execution of `reportProtocolFailure`;
- the stale Activation and ended Execution of `requestTakeover`;
- the five safety-callback exits.

This round also adds the 13 exits of Outcome acceptance that round 8's 10 Outcome scenarios did not
reach, so the inventory covers all four swept methods.

**The exit inventory** (`exitInventory`) counts 57 exits:
- every `return` of the four methods;
- every refusal `return` of `#openExchange` and `#requireControl`, counted once for each control that
  calls the helper.

The child starts V8 precise block coverage before it imports the Kernel. It takes a coverage snapshot
around each uninjected call, so it knows which of those returns the call executed. Three checks apply:
- each scenario must take its declared exit, and that snippet must match exactly one return
  (`declaredExit`);
- each exit must be taken by a scenario of its own control (`attributed`, `exitReached`);
- all 57 are taken (entry 52).

### The five safety-callback scenarios

The Driver's `isSafeToReplace` makes a nested decision and then returns true: it ends the Execution,
resolves the exchange, dispatches a different exchange, takes the exchange over itself, or holds its
code. The takeover's revalidation then refuses. As the brief requires, the no-call baseline after the
callback includes the callback's committed decision and nothing else:
- `Context.callback.state` is the state the callback's actions leave on a fresh coordinator with no
  outer call.
- A fault after the callback must leave exactly that state if it escapes, or that state plus only
  the outer refusal if it is contained (`referenceRefusal` checks the same for the uninjected call).

The callback is Driver code, not part of the call under test. The sweep suspends injection and
excludes coverage while it runs, so the swept operations are the takeover's own. A fault before the
callback is judged against the no-call state, and a fault after it against the callback's
baseline. The callback must run in exactly the runs whose fault lies past the reference run's
callback position (`callbackRan`).

The nested decisions are swept as scenarios of their own:
- the continue Outcome is `outcome: continue`, and the code hold is `recover: enter a code hold`, both
  from the same pre-state;
- the takeover is `takeover: accepted (review 11's seed)`, whose pre-state lacks only the
  outside-batch input;
- the completion is `outcome: complete with an Emission and a queued outside-batch input`, which
  differs by its Emission and result value;
- the nested dispatch is K1.1's, outside amendment 03's sweep.

The contract lists this under "Not fault points". It excludes none of review 12's exits.

### Negative controls, comparison mutants, production mutants

- **`fault-oracle.test.ts`** (267 tests, in `npm test`) runs the sweep with `--examples` on eight
  scenario filters. For each scenario it receives the context (no-call state, uninjected decision,
  baselines) and the first real run of every decision class. The examples reach 12 of the oracle's
  13 classes, which is every class that any run of the full sweep reaches. The 13th, a contained
  refusal after a safety callback, never occurs: after the callback the takeover only revalidates and
  refuses, and no fault there can be contained. The test then requires:
  - the example sweep has zero violations, and the whole exit inventory is clean;
  - every example reclassifies as recorded;
  - review 12's three altered observations are each a violation. Observation 1 uses the real
    malformed-report refusal whose grant changes to `unauthorized_submission`; observation 2 is the
    real report answer reversed, as a contained fault and as the no-fault repeat; observation 3 is a
    `progressRevision` of 123456 under a `Reflect.apply` fault, both unlocated and located inside the
    Outcome window;
  - for every example class, altering the returned value, the view, the next refusal position, the
    next acceptance position or the setup grant is a violation;
  - a refusal with another position or naming another Execution, consistent in the returned value
    and the view, is a violation;
  - a located exception's fault moved to another statement, a located exception in a refusing
    scenario, a fault at another kind of operation, a flipped callback position, a fault that did
    not fire, and a repeat in which one did, are violations;
  - each uninjected-decision check reports an altered context;
  - the exit inventory reports a missing scenario, an exit not taken, and an ambiguous declaration.
- **`oracle-mutants-09.mjs`** finds the `CHECKS` entries with the parser: 29 of them. For each, it
  replaces the entry with `() => true` in a disposable copy and runs `fault-oracle.test.ts`. Every
  mutant is killed (entry 62). Building this runner changed the oracle twice:
  - `callbackDecided`, a check that the callback changed something, survived. It is genuinely not
    needed: `referenceRefusal` already requires the uninjected state to be the callback baseline
    plus the outer refusal, and `referenceKind` requires the post-callback refusal. It was removed.
  - `referenceKind` and `referenceUnchanged` survived because their controls were also caught by other
    checks. Isolating controls were added: a refusal declared with another classification, and an
    idempotent answer whose holds disagree. `recoveryAnswer`'s idempotent branch no longer repeats
    `referenceUnchanged`'s state comparison.
- **`sweeps-09.mjs`** gives five production mutants to three checkers:
  - this sweep, which must reject each one;
  - reviewed H's sweep (its `fault-child.ts`, copied beside this one), which must accept each one;
  - for three of them, this sweep without the one comparison that catches them, which must accept.

  The mutants (entry 63):
  - *M1* (ORACLE item 1): a contained takeover refusal also revokes the setup grant. Rejected here
    only by `setupGrant`.
  - *M2* (item 2): a report whose diagnostic could not be read answers with no holds. Rejected only by
    `returned`, and the whole Kernel suite passes it.
  - *M3* (item 3): Outcome acceptance appends its receipt out of the declared order. Rejected by
    `applySequence` and by `outcomePrefix`. Reviewed H accepted every fault inside the window by method
    name, and the Kernel suite passes it.
  - *M4* (SCOPE): a hidden caller's recovery refusal consumes the Execution's refusal position.
    Rejected by the hidden-caller scenario.
  - *M5* (SCOPE): the post-callback terminal exit advances the refusal index before its record exists,
    which is `SELF-R8-REFUSAL-01`'s shape on a review-12 exit. Rejected only by `nextRefusal`, on the
    callback scenario.

## Identity

- **Packet and contract:** K1.2-correction-01, parent K1.2. [Contract revision 10](contract.md)
  records this round. The governing decisions are:
  - [amendment 01](amendment-01.md), [amendment 02](amendment-02.md), [amendment 03](amendment-03.md)
    and [decision-05](../K1.2/decision-05.md).
  V-D1 stays transferred to K1.1-correction-03. It is neither implemented nor certified here.
- **Governing process baseline B:** `a20d278185eaffc7f8b7489345a3624231ff6e6d`. 006, 008 and 012 are
  unchanged since B on this branch (`check-records.mjs`).
- **State:** WAITING_FOR_REVIEW, as an implementer assessment only.
- **Owner release and decisions:**
  - release `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`;
  - amendment 01 and decision-05 at `13a73ad9ad0662fe585d1453280c5ac3da4f79bb`;
  - amendment 02 at `60eebc24113eb834e5d88015ca2a196c95c60493`;
  - amendment 03 at `b93ed1df6b70569ada060481523e5b37c206e324`.

  No new amendment; both invalidation holds remain.
- **Review 12's recording:** the brief said to continue "from the pushed commit that records review
  12". The remote branch tip was still reviewed H `4a917f8`, and no commit recorded the review.
  - The review was in the Codex session's output folder, with its outer manifest. `review-12.md` has
    SHA-256 `8c8dbfc71e6b1424a4f3f1a4d7914838ac1857623101285ebf21709779810165`, as the handoff states.
    Both manifests verified.
  - Asked how the review should reach the branch, the owner chose to have this session record it.
  - It is recorded in `354caa7225446e219387afba1f67737766b38bd5` as a byte-identical transcription:
    `review-12.md`, `owner-note-12.md`, `handoff-12.md`, `REVIEW-12.sha256` and
    `review-12-evidence/` (200 files). The 007 row was set to CHANGES_REQUESTED, and nothing else
    changed.
  - The reviewer's directory name `review-12-evidence/` is kept, so the pinned review's links and both
    manifests resolve; the brief's "review-12/" means that directory. `.log` evidence files were
    force-added past `.gitignore`.
- **Branch:** `codex/k1.2-correction-01-activation-identity`, origin
  `https://github.com/ArrokothI/arrokothi.git`.
  - The existing clean checkout already named this branch at `4a917f8`, which was pushed. No
    checkout or worktree of another agent was switched.
  - The disposable worktrees used by the validation runners are removed after use.
  - Forward commits only.
- **Commits:**
  - previous reviewed H: `4a917f8caac04e7d9861e0ec3638662d52f9d3ae` (C
    `81dca4575ea56cfdde5b5f8ed72c439c7ec31821`), [review 12](review-12.md), CHANGES REQUIRED, recorded
    at `354caa7225446e219387afba1f67737766b38bd5`;
  - **payload C:** `e19d8e7f14bfe3fd661c22b3796a1eca365c3ec0`. The payload is two forward commits after
    the review-12 recording:
    - `a0137f893658365313f80a8bf116bde4c0cd63b4`, the oracle, scenarios, inventory, controls,
      runners and records;
    - C itself, which fixes `fault-oracle.test.ts` to a static test list.

    Clean-C validation of the first commit found that the file registered a data-dependent number of
    tests. Under a full-suite ablation mutant, the reached decision classes change, and with them the
    test count. The round-4, round-6 and round-7 runners require every mutant to run the control's
    complete suite, so they stopped at that assertion (entries 30, 37 and 47, exit 1) instead of
    recording a verdict. After the fix, a manual rerun of the three gave 16/16, 22/22 and 28/28, and
    the validation below ran on C. Neither commit was published before this handoff. Nothing from
    the first commit's validation is attached or used;
  - **candidate H:** the commit containing this report. The external handoff gives its full SHA.
- **C..H:** only the allowlist at the end of this report.

## Changes and coverage

**Production:** none. `git diff 4a917f8 C -- packages/kernel/src` is empty.

**Tests (C).**
- `tests/sweep/fault-oracle.ts` (new): the oracle, `CHECKS`, the source model, the Outcome apply
  ladder, the uninjected-decision checks and the exit inventory. It is pure and imports no Kernel
  code.
- `tests/sweep/fault-scenarios.ts` (new): the 66 scenarios, their setups, the observation, the
  safety-callback baseline, and the clean unnamed-refusal and delivery-failure references.
- `tests/sweep/fault-child.ts` (rewritten around the two modules): the interception is unchanged. New
  in it:
  - each fault records its zone stack;
  - V8 block coverage of each uninjected call feeds the exit inventory;
  - injection is suspended during a safety callback;
  - `--examples` and `--inventory-only` modes, and exact-name filters (`=name`);
  - the JSON gains `inventory`, and `declaredExit`, `exit`, `expect` and `details` per scenario.

  Review 11's seed assertion is unchanged.
- `tests/fault-oracle.test.ts` (new, 267 tests): the oracle's negative controls.
- `tests/fault-sweep.test.ts`: the maintained subset is now 37 scenarios (12 report, 17 takeover, and
  8 early refusals, selected by exact name where a prefix would match more). It also asserts that the
  five callback scenarios judge faults after the callback against its decision.

**Records and scripts (C).**
- [Contract revision 10](contract.md):
  - the header;
  - the revision-10 history entry;
  - the DEC-9 evidence bullet (mechanism, observation, oracle, located exceptions, uninjected
    decision, scope list, exit inventory, not-fault-points, negative controls);
  - the R11-COMMIT-01 row updated, and the R12-ORACLE-01 and R12-SCOPE-01 rows added;
  - the SELF-R8 row with revision 10's count;
  - the R11-READ-01 row's catalog wording (`SELF-R9-CATALOG-01`);
  - the revision-10 validation paragraph.
- BASELINE `#outcome-acceptance-api`: the recovery-control bullet's evidence sentences, the stated
  lines 255–263, rewritten from the checker; the ambient-read bullet's catalog wording
  (`SELF-R9-CATALOG-01`).
- `validate.mjs`: entries 60–66.
- `check-records.mjs`:
  - the three new test files;
  - sealing report 08 with validation 08 (H `4a917f8`);
  - sealing review 12 with its evidence, owner note, handoff and outer manifest (`354caa7`).
- `oracle-mutants-09.mjs`, `sweeps-09.mjs` and `probe-review12-09.mjs` (new): the comparison mutants,
  the production mutants, and review 12's two probes.

**Layer 3.** No concept or mechanism page changes, because no semantics changed.

**Selected 012 methods:**
- normative examination: DEC-9 against the oracle's decisions;
- deterministic execution: the sweep, the altered-observation controls, the comparison and
  production mutants;
- in-process race and fault: fault injection, the safety-callback reentry;
- process and documentation: records, sealed evidence, the allowlist, claim wording.

**Exclusions:**
- native fidelity (R1), process death (K3), external gates (K1.4) and packaging (S1);
- the broader in-process threat model and enforcement by construction (DESIGN-AUDIT-01);
- V-D1 (K1.1-correction-03).

No static-analysis work, per the brief.

**Obligation coverage.**

| Obligation / source | Distinguishing input | Expected facts / forbidden changes | Evidence and result |
|---|---|---|---|
| ORACLE-01 item 1; DEC-9, C12 | a refusal whose setup grant becomes `unauthorized_submission` (review 12); M1 | reported by `setupGrant`; M1 rejected here, accepted at reviewed H and without `setupGrant` | `fault-oracle.test.ts` (entry 61); `sweeps-09.mjs` (entry 63) |
| ORACLE-01 item 2; DEC-9, C10, C12 | the reversed hold answer as a contained fault, as the no-fault repeat and as the uninjected answer (review 12); M2 | reported by `returned` and `recoveryAnswer`; M2 rejected only by `returned`; the Kernel suite passes M2 | entries 61, 63 |
| ORACLE-01 item 3; DEC-9/10 | `progressRevision` 123456 under a `Reflect.apply` fault, unlocated and located in the window (review 12); window faults moved; M3 | reported by location (`outcomeStepAt`) and prefix (`outcomePrefix`); M3 rejected (`applySequence`, `outcomePrefix`), accepted at reviewed H | entries 61, 63 |
| ORACLE-01 required outcome: every comparison meaningful | each of 29 `CHECKS` entries disabled | each mutant fails a negative control | `oracle-mutants-09.mjs` (entry 62) |
| SCOPE-01; DEC-9, C8–C10, C15 | review 12's 16 exits, as scenarios; the 57 source-drawn exits | each scenario takes its declared exit; all 57 taken; review 12's scope probe reproduces its rows; M4, M5 rejected here, accepted at reviewed H | the sweep's inventory (entries 52, 60); entries 61, 63, 64 |
| DEC-9 at run time, C8–C10, C12 | an exception at each intercepted operation of 66 scenarios | every run equals a permitted complete decision | fault sweep (entries 52, 60): 54,288 runs, 0 violations |
| Review 12's defect at reviewed H | review 12's oracle probe, rebuilt from reviewed H's source | all three accepted, identical to the recorded `oracle-probe.json` | `probe-review12-09.mjs` (entry 64) |
| SELF-R8-REFUSAL-01 still detected | this round's sweep against review 11's H | violations only while a refusal record is built or appended | entry 57: 117 violations in 39 refusal-exit scenarios, every one while a refusal record is built or appended |
| DEC-8 unchanged | whole-suite poison sweep and catalog | as round 8 | entry 53; catalog in entry 02 |
| C1–C15, DEC-1–9 cumulative | every existing suite and runner | unchanged pass/reject | validation table |

## Semantic correction closure

- **Invariant.** DEC-9's rule is unchanged. What changed is its evidence contract, stated in revision
  10:
  - each permitted outcome is a complete decision over the returned value, the view, both positions
    and the grant;
  - the exceptions are located;
  - the uninjected decision is checked;
  - the scope is a source-drawn inventory with an explicit scenario list.
- **Why round 8 missed both findings (006: a subsystem corrected before and found defective again).**
  - Round 8 wrote the claim first ("complete decision", "every exit") and a checker that approximated
    it. It tested the checker only by production mutants. Those exercise the branches a mutant
    happens to reach; a branch that compared too little was never fed an observation that differed
    only in what it skipped.
  - Round 8's scenario list was not derived from the source, so nothing compared it with the exits
    the source has.
  - This round reconstructs both: every comparison is named and mutated, every branch is fed altered
    real observations, and the exit list is read from the source.
- **Dependents traced.**
  - `fault-sweep.test.ts` (its subset and count).
  - `sweeps-08.mjs`: its scenario filters `takeover: accepted`, `recover: enter a code hold` and
    `report: enter a protocol hold without` still select the same scenarios. Its JSON fields
    (`violations`, `runs`, `results[].violations`) are unchanged.
  - `probe-reviewed-h-08.mjs`: its violation regex needs the exact message "threw and left a state no
    complete decision explains" and the where-format, both kept.
  - `validate.mjs` entry 52 now carries the inventory.
  - Text: the contract, BASELINE and the sweep headers; the claim search in entry 66.
- **Counterexamples.** Review 12's three observations and 16 exits; M1–M5; the 29 comparison mutants;
  the controls that isolate each comparison.
- **Whole-packet re-audit.** The payload since review 12 is test, script and record code only.
  - Production is unchanged, so the runtime and every earlier runner are recomputed on C rather than
    re-reasoned.
  - The cumulative B..C diff was re-examined where this round reaches it: the DEC-9 and DEC-8
    evidence text, the two sweeps' shared records, and `check-records.mjs`.
  - `SELF-R9-CATALOG-01` below was found by that re-audit.

## Prior findings

- `K12C1-R12-ORACLE-01` (P2). Addressed on C, as described in Design.
  - The oracle compares all four parts on every branch.
  - The exceptions are located.
  - The uninjected decision is checked.
  - Review 12's three observations are maintained negative controls that report violations, and the
    clean run stays at zero.
  - Every comparison has a mutant, and every mutant is killed.
- `K12C1-R12-SCOPE-01` (P2). Addressed on C.
  - All 16 combinations are scenarios, and the five reentry scenarios use the callback baseline.
  - The scope is the explicit list of 66 in the contract, with nothing review 12 lists excluded.
  - The source-drawn inventory confirms every one of the 57 exits is taken.
  - "Every exit" no longer appears in the contract, BASELINE or the sweep sources (entry 66).
- Earlier findings keep the dispositions in
  [review 12's reconciliation](review-12.md#prior-finding-reconciliation-and-semantic-closure).
  Their dependent mechanisms are unchanged (no production diff), and no disposition changes.
  Transferred cost findings stay open in K1.1-correction-03.

## Additional self-found defects (implementer provenance)

- **SELF-R9-CATALOG-01 (P3-class; DEC-8 evidence wording, C15).**
  - *Defect.* BASELINE's ambient-read bullet and the contract's R11-READ-01 coverage row called the
    DEC-8 poison catalog "a catalog of every boundary exit". The catalog, `poison-catalog.test.ts`,
    calls every public boundary with accepted, idempotent and refused exits. It does not reach every
    exit: none of the five safety-callback exits, for example.
  - *Scope.* It is the same defect family as `K12C1-R12-SCOPE-01` (a scope claim wider than the
    scenarios), on DEC-8's side. Review 12 passed DEC-8 on its bounded method and did not raise it.
  - *Fix.* The wording now says what the catalog does. No DEC-8 evidence or code changed.
  - *Severity* is the implementer's assessment; the reviewer decides.

This round's own work had four weaknesses, all fixed before C; none is a defect of reviewed H.
- The comparison-mutant runner showed three of them (see Design): a redundant check, and two controls
  that did not isolate their check.
- Clean-C validation of the first payload commit found the fourth: a data-dependent test count in
  `fault-oracle.test.ts`, which stopped three earlier runners (see Identity). The lesson for later
  rounds: every full-suite runner compares a mutant's test count with its control's, so a maintained
  test file's list of tests must not depend on what a run reaches.

**Unresolved obligations:** none known in scope.

## Observations for the reviewer

- **O1. The inventory rests on V8 block coverage.** A `return` counts as executed when the innermost
  coverage range around its first character ran.
  - The child's `--inventory-only` mode prints each exit with the scenarios that take it.
  - `fault-oracle.test.ts` rebuilds the inventory from that record and alters it.
  - The coverage snapshots taken at the safety callback's boundaries keep the nested calls out. The
    nested takeover's `return answer` is not credited to the callback scenario.
- **O2. The Outcome ladder models the probes.**
  - The grant probe's answer in a partial state ("accepted at N + 1" until the accepted-Outcome record
    is stored) is derived from submission order.
  - `applyModel` checks the ladder's end against the uninjected state.
  - All of the sweep's Outcome-window runs matched a rung.
- **O3. What is still outside.** Faults inside a safety callback, and the two nested decisions swept
  from a nearby rather than identical pre-state (Design). Also engine faults, and changes invisible at
  the boundary.
- **O4. The one check outside the oracle.** The child's review-11 seed assertion (next input at 3) is
  a named regression value, not a decision rule. The seed's run is also classified by the oracle
  like every other run.
- **O5. The poison sweep now runs 43 test files.** `fault-oracle.test.ts` is a maintained Kernel test
  file. It makes no in-process Kernel call, so it adds no poison window (entry 53: the same windows as
  round 8).
- **O6. The review-12 recording was made by the implementer's session.** It is a byte-identical copy
  with verified manifests. A reviewer may prefer to compare it with the reviewer's own delivery
  (the SHA-256 is in `handoff-12.md` and `REVIEW-12.sha256`).

## Validation and interpretation

The validation ran sequentially on clean C `e19d8e7f14bfe3fd661c22b3796a1eca365c3ec0`, from the
repository root and with no manual additions:
`node docs/development/work/K1.2-correction-01/validate.mjs <scratch dir>`. The outputs are attached
under `validation-09/`.
- The environment is Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin arm64
  ([00-environment.json](validation-09/00-environment.json)).
- [13-results.json](validation-09/13-results.json) records every command, exit code and timestamp,
  and records the tree as clean after the run.
- [MANIFEST.sha256](validation-09/MANIFEST.sha256) covers the 73 other attachments. Its own
  SHA-256 is `f261accd9542ea255f4b961429986b47e8ab0e0c83c90f0579e499fbbb5dbdb7`.

**An earlier run on the same C, disclosed.** The collector ran on C once before this run. That run
matched this one in every entry but entry 61, which exited 1: 262 of the 267 controls failed.
- The cause: its child sweep hit the file's 300-second spawn timeout (`ETIMEDOUT`), so the controls
  received no examples.
- The machine was under heavy background load at the time: Spotlight indexing, and two system
  services near 100% CPU. In the same window, entry 60 took 402 seconds, against 100 seconds for the
  identical entry 52.
- Directly afterwards, entry 62 ran this test file 30 more times; its unmutated control passed
  267/267.
- Run again by hand on the same clean C, the child took 6 seconds.

The collector was then rerun in full, which is the run attached here. That earlier run's results
file and its entry-60 and entry-61 logs are attached under `validation-09/earlier-run/` for the
record. Nothing else of it is used.

**Compressed attachments.** The seven historical-range diff checks (12, 19, 22, 29, 33, 45 and 51)
are attached gzip-compressed (`gzip -9 -n`), as in round 8: each raw log is about 7–8 MB.
`gunzip -k` restores the exact bytes, which have these uncompressed SHA-256 digests and sizes:

| Entry | Uncompressed SHA-256 | Bytes |
|---|---|---:|
| 12-diff-check | `990358fdb3a5a68216853b5743c2d31767af251e9e7e3e3641a35e09b09724cb` | 7,981,378 |
| 19-round2-diff-check | `904fc09bc83b224a89d10ff5765849f73c40076bc0670b906d126a2206728f82` | 7,979,954 |
| 22-correction-diff-check | `c37d9200152892a56d0791c3442f53db21b62528faf7f803a5794af9327a326a` | 7,979,954 |
| 29-round3-diff-check | `7706ca787fab0c901691bfc217d50c7c14a7f897f3244c4d0d0ee8f1ab02adb1` | 7,978,713 |
| 33-round4-diff-check | `b87e5753b8beefc2fe2e6916a2ad97f16951254e188077b2c2baec70234d33f6` | 7,973,580 |
| 45-round6-diff-check | `552220b3ef70b18c273eb7369496c44fe035817188ab0594e6adafca8d280182` | 7,789,342 |
| 51-round7-diff-check | `1ac9e4023ec3c06a1de2fd0724593290646449fb03f0eafa71d77eacf1b786af` | 6,823,804 |

**Results.**

| Command / raw output | Exit | Observation |
|---|---:|---|
| [01-typecheck](validation-09/01-typecheck.txt) | 0 | TypeScript passed |
| [02-full](validation-09/02-full.txt) | 0 | 3,774/3,774; 0 failed, cancelled, skipped or todo. Round 8 had 3,507; the 267 new tests are the oracle's negative controls |
| [03-kernel](validation-09/03-kernel.txt) | 0 | 1,720/1,720 |
| [04-conformance](validation-09/04-conformance.txt) | 0 | 1,945/1,945 |
| [05-sdk](validation-09/05-sdk.txt) | 0 | 22/22 |
| [06-builder-docs](validation-09/06-builder-docs.txt) | 0 | 72 files; 1,845 links/anchors; 38 imports |
| [07-original-ablations](validation-09/07-original-ablations.txt) | 1 | 32/36; B6/B12/B13/B14 NOT APPLICABLE (the disclosed anchor drift, as in rounds 2–8) |
| [08-correction-ablations](validation-09/08-correction-ablations.txt) | 0 | 67/67 rejected |
| [09-r11-probe](validation-09/09-r11-probe.txt) | 0 | 8/8 `stale_exchange` |
| [10-records-links](validation-09/10-records-links.txt) | 0 | Ancestry and sealed records, now including report 08 with validation 08 and review 12 with its evidence, owner note, handoff and manifest; 26 files, 713 links/anchors |
| [11-evals](validation-09/11-evals.txt) | 0 | 12/12 |
| [14-original-ablations-adapted](validation-09/14-original-ablations-adapted.txt) | 0 | Control 1,720/1,720; 36/36 rejected |
| [15](validation-09/15-review-identity.txt)–[18](validation-09/18-diagnostics-maxlen.txt), [20](validation-09/20-review-aggregate.txt), [21](validation-09/21-review-equality.txt), [26](validation-09/26-review-aggregate-pre-authority.txt) review-01/02 probes | 0 | As in implementation 08 |
| [23](validation-09/23-review-cost-accept.txt)–[25](validation-09/25-review-cost-refuse-ctor.txt), [28](validation-09/28-review4-p4-p5.txt), [32](validation-09/32-review6-cost-and-blocker.txt), 34 (six handler runs), [35](validation-09/35-string-work.txt) | 0 | Cost and timing are observations only (V-D1 transferred); the count and logical assertions pass |
| [27-revision4-ablations](validation-09/27-revision4-ablations.txt) | 1 | Unchanged round-3 runner: control passes, X8–X11 rejected, then it stops at X12's unique-anchor assertion (span removed in round 6; disclosed since round 6) |
| [38-revision4-ablations-rebound](validation-09/38-revision4-ablations-rebound.txt) | 1 | Round 6's rebinding adapter: 20/21; V5 is the disclosed equivalent survivor |
| [30-review6-exact-ablations](validation-09/30-review6-exact-ablations.txt), [31-diagnostic-work-ablations](validation-09/31-diagnostic-work-ablations.txt) | 0 | Z1–Z16 rejected; T1–T4 rejected |
| [37-round6-ablations](validation-09/37-round6-ablations.txt) | 0 | H1–H22 rejected (22/22) |
| [39](validation-09/39-review9-probe-history.txt), [40](validation-09/40-review9-probe-history-mutable.txt) | 1 | Review 09's reproducers still fail at their first assertion because the defect does not reproduce |
| [41](validation-09/41-review9-matrix.txt), [42](validation-09/42-review9-matrix-expect-correct.txt) | 0 | 22 cases; `--expect-correct` 0 violations |
| [43-host-members-probe](validation-09/43-host-members-probe.txt), [44-claim-alias-search](validation-09/44-claim-alias-search.txt) | 0 | The host-member probe as in round 8. The alias search differs from round 8 only in the 007 status row, whose text now records review 12 and still names V-D1 as transferred; there is no new claim text |
| [47-round7-ablations](validation-09/47-round7-ablations.txt) | 0 | 28/28, each failing a named rule test |
| [48](validation-09/48-review10-enforcement-rebound.txt), [49](validation-09/49-new-oracles-and-name-probe-on-reviewed-H.txt), [50](validation-09/50-review10-probes-rerun.txt) | 0 | As in round 8 |
| **[52-fault-sweep](validation-09/52-fault-sweep.txt)** | 0 | 66 scenarios, 54,288 runs (54,222 injected operations plus 66 no-fault repeats), **0 violations**; 35 intercepted operations. **Exit inventory: 57 exits, all taken, 0 violations.** Classes: 52,324 refused, exactly one refusal recorded; 1,777 threw, no-call state; 66 completed; 57 in the Outcome apply window, a permitted prefix; 23 refusals naming no Execution; 15 threw after a safety callback, its decision only; 8 accepted after a failed Driver delivery; 6 accepted as the declared alternate; 4 accepted as the uninjected decision; 4 delivery rows absent and 2 pending after the commit; 2 in the takeover apply window. Seed: operation 25, view unchanged, next input at 3 |
| **[53-poison-sweep](validation-09/53-poison-sweep.txt)** | 0 | 43 Kernel test files (the new controls add no window) and 310 names on four prototypes; 1,712/1,712 in off, count, throw and reenter; 11,532 windows and 11,578 traced calls, identical in every mode; **0 zone firings**; 11,532 liveness probes |
| [54](validation-09/54-zone-coverage-suite.txt), [55](validation-09/55-zone-coverage-suite-and-catalog.txt) zone coverage | 0 | As in round 8 (no production change) |
| **[56-sweep-negative-controls](validation-09/56-sweep-negative-controls.txt)** | 0 | Round 8's controls against this round's sweep: the clean controls pass, 15 fault and 13 read mutants are rejected, and C8, C10, C12, R7, R9 and R10 are reported as outside |
| **[57-sweeps-on-reviewed-H](validation-09/57-sweeps-on-reviewed-H.txt)** | 0 | At review 11's H: probes and catalog 40/40; whole-suite poison clean. This round's fault sweep reports 117 violations in 39 refusal-exit scenarios, every one while a refusal record is built or appended (`SELF-R8-REFUSAL-01`) |
| [58-round8-diff-check](validation-09/58-round8-diff-check.txt) | 2 | Only whitespace quoted inside sealed `review-12-evidence/` and `validation-08/` attachments; round 8's own payload was clean at its C |
| [59-guard-claim-search](validation-09/59-guard-claim-search.txt) | 1 | No match: no live DEC-8/9 text uses "closed-world" or "comprehensive" |
| **[60-fault-sweep-summary](validation-09/60-fault-sweep-summary.txt)** | 0 | The reader's view of entry 52: one line per scenario with its exit id and classes; the inventory line |
| **[61-oracle-negative-controls](validation-09/61-oracle-negative-controls.txt)** | 0 | 267/267: the clean-run and reclassification checks; review 12's three observations; 230 part-by-part alterations of the 46 example classes, and the check that they reach every class a fault run reaches; 2 refusal pins; 13 location and fault-bookkeeping controls; 12 uninjected-decision controls; 4 inventory controls |
| **[62-oracle-comparison-mutants](validation-09/62-oracle-comparison-mutants.txt)** | 0 | Clean control 267/267; each of the 29 `CHECKS` entries, disabled, is killed by 1 to 73 controls |
| **[63-round9-production-controls](validation-09/63-round9-production-controls.txt)** | 0 | M1–M5 rejected here and accepted by reviewed H's sweep; M1, M2 and M5 accepted once `setupGrant`, `returned` or `nextRefusal` is disabled |
| **[64-review12-probes](validation-09/64-review12-probes.txt)** | 0 | Review 12's oracle probe at reviewed H is identical to its `oracle-probe.json` (all three accepted). Its builder stops against this tree, as expected. Its scope probe against this tree is identical to `scope-probe.json` (16 rows) |
| [65-round9-diff-check](validation-09/65-round9-diff-check.txt) | 0 | `354caa7..C` whitespace-clean: this round's whole payload |
| [66-dec9-scope-claim-search](validation-09/66-dec9-scope-claim-search.txt) | 1 | No match: "every exit" and "every boundary exit" are gone from the contract, BASELINE and the sweep sources |
| [12](validation-09/12-diff-check.txt.gz), [19](validation-09/19-round2-diff-check.txt.gz), [22](validation-09/22-correction-diff-check.txt.gz), [29](validation-09/29-round3-diff-check.txt.gz), [33](validation-09/33-round4-diff-check.txt.gz), [45](validation-09/45-round6-diff-check.txt.gz), [51](validation-09/51-round7-diff-check.txt.gz) historical-range diff checks | 2 | Only whitespace quoted inside sealed earlier validation and review attachments, now including review 12's recorded evidence |

The collector exits 1 because it keeps the disclosed exits above: round 8's nonzero set, plus entry
58, which now reaches sealed evidence, and entry 66, whose `git grep` finds no match. No command timed
out, was killed by a signal, or failed to load.

**Checks not run, and limits.**
- Node 22 was not run. The poison sweep uses `module.registerHooks`, which needs Node 22.15 or later.
- Cost and timing probes are observations only.
- The sweep claims no more than its stated scope (contract DEC-9 evidence bullet).

**Why the evidence supports each criterion (implementer assessment, not acceptance).**
- **ORACLE-01 / DEC-9, C8–C10, C12.**
  - Every permitted outcome is a complete expected decision, and every run of the 66 scenarios equals
    one (entry 52).
  - Every part of every reached decision class, altered, is reported (entry 61), and so are review
    12's three observations.
  - Every comparison is needed by some control (entry 62).
  - Three production mutants that reviewed H's checker accepts are rejected here, each by the
    comparison review 12 named (entry 63).
- **SCOPE-01 / DEC-9, C15.**
  - Review 12's 16 exits are scenarios, and review 12's own probe of them reproduces (entry 64).
  - All 57 exits drawn from the source are taken (entry 52).
  - Two production mutants on those new paths are rejected here and invisible to reviewed H's scenarios
    (entry 63).
  - The contract and BASELINE state the scope as the list, and the old wording is gone (entry 66).
- **Behaviour unchanged.** No production diff. Full suites pass, every earlier runner rejects as in
  round 8, and review 11's H still shows only `SELF-R8-REFUSAL-01` (entry 57).
- **DEC-8.** Unchanged, and still clean (entry 53). Its wording no longer overstates the catalog.

**Design choices, amendments, assumptions and strongest remaining risk.**
- *Authority.* Contract revision 10 is this round's evidence change under amendment 03, as the brief
  directs. No production permission was needed.
- *Choices the owner may review:*
  - extending the scenarios to all Outcome-acceptance exits, beyond review 12's list;
  - suspending injection inside the safety callback (its nested decisions are swept as scenarios);
  - modelling the Outcome window's grant probe;
  - recording review 12 from this session.
- *Strongest risk.* The oracle's located exceptions and its exit inventory both depend on source
  text: the statement anchors and the return-snippet declarations.
  - A refactor that moves or rewrites those statements makes the sweep fail loudly, through
    `applySequence`, `declaredExit` or a source-model problem. It cannot pass silently.
  - The reviewer may judge whether that maintenance cost is acceptable.
- *Second risk.* V8's block coverage and stack frames are engine behaviour. The negative controls
  and the inventory rebuild in entry 61 check them on this engine; another engine may need them
  re-established.

**Third-party use:** none new.
- The oracle uses Node built-ins (`node:inspector` precise coverage, V8 stack traces, `node:util`)
  and the repository's existing TypeScript dependency.
- Review 12's two probes are run unchanged from the recorded evidence. They are the reviewer's
  scripts, used as evidence, not incorporated into the product.
- No code was copied or adapted from another project.

## Exact C..H administrative allowlist

```text
docs/development/007-work-packets.md
docs/development/work/K1.2-correction-01/implementation-09.md
docs/development/work/K1.2-correction-01/validation-09/00-environment.json
docs/development/work/K1.2-correction-01/validation-09/01-typecheck.txt
docs/development/work/K1.2-correction-01/validation-09/02-full.txt
docs/development/work/K1.2-correction-01/validation-09/03-kernel.txt
docs/development/work/K1.2-correction-01/validation-09/04-conformance.txt
docs/development/work/K1.2-correction-01/validation-09/05-sdk.txt
docs/development/work/K1.2-correction-01/validation-09/06-builder-docs.txt
docs/development/work/K1.2-correction-01/validation-09/07-original-ablations.txt
docs/development/work/K1.2-correction-01/validation-09/08-correction-ablations.txt
docs/development/work/K1.2-correction-01/validation-09/09-r11-probe.txt
docs/development/work/K1.2-correction-01/validation-09/10-records-links.txt
docs/development/work/K1.2-correction-01/validation-09/11-evals.txt
docs/development/work/K1.2-correction-01/validation-09/12-diff-check.txt.gz
docs/development/work/K1.2-correction-01/validation-09/13-results.json
docs/development/work/K1.2-correction-01/validation-09/14-original-ablations-adapted.txt
docs/development/work/K1.2-correction-01/validation-09/15-review-identity.txt
docs/development/work/K1.2-correction-01/validation-09/16-review-maxlen.txt
docs/development/work/K1.2-correction-01/validation-09/17-review-namespace.txt
docs/development/work/K1.2-correction-01/validation-09/18-diagnostics-maxlen.txt
docs/development/work/K1.2-correction-01/validation-09/19-round2-diff-check.txt.gz
docs/development/work/K1.2-correction-01/validation-09/20-review-aggregate.txt
docs/development/work/K1.2-correction-01/validation-09/21-review-equality.txt
docs/development/work/K1.2-correction-01/validation-09/22-correction-diff-check.txt.gz
docs/development/work/K1.2-correction-01/validation-09/23-review-cost-accept.txt
docs/development/work/K1.2-correction-01/validation-09/24-review-cost-refuse-undefined.txt
docs/development/work/K1.2-correction-01/validation-09/25-review-cost-refuse-ctor.txt
docs/development/work/K1.2-correction-01/validation-09/26-review-aggregate-pre-authority.txt
docs/development/work/K1.2-correction-01/validation-09/27-revision4-ablations.txt
docs/development/work/K1.2-correction-01/validation-09/28-review4-p4-p5.txt
docs/development/work/K1.2-correction-01/validation-09/29-round3-diff-check.txt.gz
docs/development/work/K1.2-correction-01/validation-09/30-review6-exact-ablations.txt
docs/development/work/K1.2-correction-01/validation-09/31-diagnostic-work-ablations.txt
docs/development/work/K1.2-correction-01/validation-09/32-review6-cost-and-blocker.txt
docs/development/work/K1.2-correction-01/validation-09/33-round4-diff-check.txt.gz
docs/development/work/K1.2-correction-01/validation-09/34-handler-direct-0.txt
docs/development/work/K1.2-correction-01/validation-09/34-handler-direct-1000.txt
docs/development/work/K1.2-correction-01/validation-09/34-handler-direct-10000.txt
docs/development/work/K1.2-correction-01/validation-09/34-handler-outcome-0.txt
docs/development/work/K1.2-correction-01/validation-09/34-handler-outcome-1000.txt
docs/development/work/K1.2-correction-01/validation-09/34-handler-outcome-10000.txt
docs/development/work/K1.2-correction-01/validation-09/35-string-work.txt
docs/development/work/K1.2-correction-01/validation-09/37-round6-ablations.txt
docs/development/work/K1.2-correction-01/validation-09/38-revision4-ablations-rebound.txt
docs/development/work/K1.2-correction-01/validation-09/39-review9-probe-history.txt
docs/development/work/K1.2-correction-01/validation-09/40-review9-probe-history-mutable.txt
docs/development/work/K1.2-correction-01/validation-09/41-review9-matrix.txt
docs/development/work/K1.2-correction-01/validation-09/42-review9-matrix-expect-correct.txt
docs/development/work/K1.2-correction-01/validation-09/43-host-members-probe.txt
docs/development/work/K1.2-correction-01/validation-09/44-claim-alias-search.txt
docs/development/work/K1.2-correction-01/validation-09/45-round6-diff-check.txt.gz
docs/development/work/K1.2-correction-01/validation-09/47-round7-ablations.txt
docs/development/work/K1.2-correction-01/validation-09/48-review10-enforcement-rebound.txt
docs/development/work/K1.2-correction-01/validation-09/49-new-oracles-and-name-probe-on-reviewed-H.txt
docs/development/work/K1.2-correction-01/validation-09/50-review10-probes-rerun.txt
docs/development/work/K1.2-correction-01/validation-09/51-round7-diff-check.txt.gz
docs/development/work/K1.2-correction-01/validation-09/52-fault-sweep.txt
docs/development/work/K1.2-correction-01/validation-09/53-poison-sweep.txt
docs/development/work/K1.2-correction-01/validation-09/54-zone-coverage-suite.txt
docs/development/work/K1.2-correction-01/validation-09/55-zone-coverage-suite-and-catalog.txt
docs/development/work/K1.2-correction-01/validation-09/56-sweep-negative-controls.txt
docs/development/work/K1.2-correction-01/validation-09/57-sweeps-on-reviewed-H.txt
docs/development/work/K1.2-correction-01/validation-09/58-round8-diff-check.txt
docs/development/work/K1.2-correction-01/validation-09/59-guard-claim-search.txt
docs/development/work/K1.2-correction-01/validation-09/60-fault-sweep-summary.txt
docs/development/work/K1.2-correction-01/validation-09/61-oracle-negative-controls.txt
docs/development/work/K1.2-correction-01/validation-09/62-oracle-comparison-mutants.txt
docs/development/work/K1.2-correction-01/validation-09/63-round9-production-controls.txt
docs/development/work/K1.2-correction-01/validation-09/64-review12-probes.txt
docs/development/work/K1.2-correction-01/validation-09/65-round9-diff-check.txt
docs/development/work/K1.2-correction-01/validation-09/66-dec9-scope-claim-search.txt
docs/development/work/K1.2-correction-01/validation-09/MANIFEST.sha256
docs/development/work/K1.2-correction-01/validation-09/earlier-run/13-results.json
docs/development/work/K1.2-correction-01/validation-09/earlier-run/60-fault-sweep-summary.txt
docs/development/work/K1.2-correction-01/validation-09/earlier-run/61-oracle-negative-controls.txt
```

## Handoff

- **Ready for independent cumulative review** of B..H under contract revision 10.
- The external handoff supplies B, C, H and the verified remote SHA.
- No self-acceptance, integration, merge or successor release. Both invalidation holds stay under
  owner control.
