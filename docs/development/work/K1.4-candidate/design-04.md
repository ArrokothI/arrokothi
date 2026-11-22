# K1.4-candidate design 04 — the oracle's command, call and inspection join

Written 2026-11-20 by the K1.4-candidate coding agent (Claude Code desktop, `claude-opus-5-5`; the same session
that built rounds 1 to 3 under `claude-fable-5-2`). This is a design note only: it changes no code, and no code
follows until a design check returns and the owner disposes it.

- **Subject:** K14C-R03-01 (P2) and K14C-R03-02 (P3) of
  [review 03](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03.md)
  (Codex GPT-6, `codex/k1.4-candidate-review-03` at `3e86a8c0f7a310c53810f2ced0533165b1844b54`), CHANGES
  REQUIRED of H `ddc53bd132fde4f71bc989ccec7f4d0e430a45dc`.
- **Governing brief:**
  [brief 04](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03/brief-04.md).
  006's stop-and-redesign rule fired, and owner choice 05 is
  ["Redesign the oracle’s command/call/inspection checks, with a new design check (recommended)"](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03/owner-choice.md).
  The review, the brief, the owner record and `oracle-probes.mjs` were read by commit; nothing was merged.
- **Supersedes:** in [design 03 addendum 01](design-03-addendum-01.md), §A3's "What it records" and "What it
  checks" lists, §A1's first table row (refined in §3 below) and §A6's D03-CHK-03 row. Those stay as records.
  Everything else in designs 01 to 03 and their addenda stands, including the ledger, rules 1 to 6, §A2, §A4 and
  §A5.
- **Ownership:** the test-side laboratory and oracle, their tests and the current claims about them (the oracle's
  header, the README and 017 L-39). The adapter `kernel-candidate.ts`, the Kernel, the fixture and the packet
  tools do not change.

**Answer in one paragraph.** The claim holds without narrowing, so I am not stopping for an owner choice. The
oracle gets one finite table: for each of the twelve command kinds, the coordinator calls in order, the target
of each call derived from the command and the oracle's own relation, and which call is the final inspection.
Every recorded call must match its row by position; a sequence that differs is a missing, extra or wrong call,
told apart by a subsequence test. The final inspection must address the command's Execution, its view must
describe that Execution or the exit is a declared contradiction, and the Observation must be that view's: five
fields it copies verbatim must equal the view's before the identity positions are paired. The legal exits and
the calls before each are listed. Nothing predicts Kernel state. A throwaway prototype of this oracle, kept out of
the repository, rejects all four review-03 probes and the five design-03 controls, rejects 2,470 spliced traces
with their predicted codes, and passes every existing identity test and the full 4,126-run search.

## 1. Root cause (012's four questions)

1. **Which mechanism produced the finding?** The oracle at H judged two calls and never related them. It chose
   a "primary" as the first call that was not an inspection or `pendingTimers`, checked that call's target
   against the reference, and separately took the last inspection and checked its view only against that
   inspection's own argument. Nothing required the primary to be the command's operation, the inspection to
   address the command's Execution, or the other calls to be absent.
2. **Which accepted design allowed it?** Design 03 addendum 01 §A3 said "the command's Kernel call", singular,
   and listed no call sequence. §A1's first row ("the Execution the adapter addressed, or the one the answer
   named") was implemented as "the view describes the Execution the inspection asked for", which is
   self-consistency, not the join the row names.
3. **Why did earlier passes miss it?** The `target` rejection control moved the primary call and the inspection
   together. No control moved only the inspection, changed only a method, or added a call. The counts the oracle
   reports cannot see any of these: a spliced trace has the same commands, Observations and pairs.
4. **What other defects does the same mechanism allow?** Beyond the review's four traces, the mechanism also
   accepts: a missing call, such as a fire without `pendingTimers`; a `recover` or `takeover` that names an
   exchange other than the one its own preliminary inspection showed; an Observation built from an earlier
   inspection of the right Execution when the identity lists happen to agree; and any call to the two public
   coordinator methods the laboratory does not record at all (`visibleExecutions`, `reportProtocolFailure`).
   Design 04 closes all of them. The owner chose the route: a redesign with a design check.

## 2. Question 1: the calls of each command

**Notation.** `R` is the native Execution the command's Execution reference denotes in the oracle's relation
**before** this command. `G` is the native generation `deliver_timer`'s generation reference denotes in the
generation scope of `R`. `T` is the Execution the final inspection must address and describe.

**Table 1. The rows.** A run that reaches the final inspection makes exactly these calls, in this order, and no
other.

| Command kind | Calls, in order | Target of each call | `T` |
|---|---|---|---|
| `create`, `create_retry` | `createExecution`; `inspect` | `createExecution` has none: it addresses the Execution its answer names | The Execution the answer names: `value.executionId`, or a refusal's `executionId` |
| `accept_event` | `submitInput`; `inspect` | `request.destination` is `R` | `R` |
| `dispatch` | `dispatch`; `inspect` | Execution argument `R` | `R` |
| `redeliver_dispatch` | `redeliver`; `inspect` | Execution argument `R` | `R` |
| `submit_outcome`, `resubmit_outcome` | `submitOutcome`; `inspect` | `envelope.executionId` is `R` | `R` |
| `accept_cancellation` | `cancelExecution`; `inspect` | Execution argument `R` | `R` |
| `deliver_timer` | `pendingTimers`; `fireTimer`; `inspect` | `pendingTimers` takes no argument; the timer key is `{ executionId: R, kind: "wait_deadline", generation: G }` | `R` |
| `recover` | `inspect` (preliminary); `recoverExecution`; `inspect` | Preliminary `R`; `recoverExecution` to `R`, with `activationId` equal to the preliminary view's open Activation | `R` |
| `takeover` | `inspect` (preliminary); `requestTakeover`; `inspect` | Preliminary `R`; `requestTakeover` to `R`, with `activationId` and `writerEpoch` equal to the preliminary view's open Activation | `R` |
| `inspect` | `inspect` | `R`: this one call is both the command's operation and its final inspection | `R` |

Every inspection argument is the Execution only; the caller argument is not judged (§6). The final inspection is
always the last call of the row. The table has 26 slots.

**Creation and retry against references.** A `create` or `create_retry` has no Execution reference, so it has no
`R`. Its answer is the only source of `T`, accepted or refused (a `duplicate_conflict` refusal names the existing
Execution). Every other command addresses `R` and has `T = R` in every branch, refused or not (§3).

**Preliminary against final.** Only `recover` and `takeover` inspect before their operation. That inspection is
the preliminary one. Its argument must be `R`, and the exchange the operation names must be the open Activation
its view shows. The Observation is never built from it: the final inspection is the last call.

**Read-only calls.** `inspect`, `pendingTimers` and `visibleExecutions` count like any other call. `inspect` and
`pendingTimers` appear only where a row lists them. `visibleExecutions` and `reportProtocolFailure` are in no
row, so any call to either fails.

**The finite rule.** Each record's list of call methods must equal its expected list: the row, or the shorter
prefix one legal early exit allows (§4). Then each call must have its slot's target. Every recorded call is
compared with exactly one slot by position, so no call is unjudged.

**What is recorded.** The laboratory's recording subclass wraps **every** own method of
`ExecutionCoordinator.prototype` except the constructor, enumerated when the laboratory loads rather than listed.
There are 13. A test pins that set, so a Kernel method added later fails the test until a row decision is made.
H wrapped 11 and missed the two methods named above. The adapter constructs one coordinator from the class it is
given and calls the Kernel only through that instance; a structure test asserts one `new Coordinator(` and no
other reference to the coordinator's prototype in `kernel-candidate.ts`.

## 3. Question 2: tying the final inspection to the command and the Observation

Three joins, each against a source the oracle owns or recorded:

1. **Command to inspection.** The final call's argument must be `T` (§2). A mismatch is `inspection`. For the
   `inspect` command the final call is also the operation, and a mismatch is `target`, as at H.
2. **Inspection to Execution.** The oracle reads the view from the final call's recorded answer, never from the
   record's `view` field. If that view describes an Execution other than `T`, the one legal exit is
   `AnswerContradiction` with code `execution`. This is §A1's first row, now evaluated against `T` and not
   against the inspection's own argument.
3. **Inspection to Observation.** Before the identity positions are paired, the Observation's five verbatim
   fields must equal the final view's: `state`; `progressRevision`; `activationId` (the open Activation's, or
   `null`); `writerEpoch` (the open Activation's, or `0`); `acceptedDeadline` (the live wait's, or `null`). A
   difference is `inspection`. The identity positions are then paired with that same view's IDs, so the
   Observation's `executionId` is paired with `T`.

The third join is what stops an Observation built from another inspection of the right Execution: identity lists
alone can agree across inspections, and these five fields pin one inspection without restating any projection
rule beyond a copy.

**The refined §A1 first row.** "The inspection describes `T`: for `create` and `create_retry` the Execution the
answer names; for every other command the addressed `R`, in every branch."

**When creation or an answer fails, or there is no Observation.**

- *Creation.* The answer is the only source of the new Execution; the oracle has none other and needs none. The
  inspection must address and describe what the answer names; the initial input must be in that view as §A1's
  second row says; the first naming offers the command's name for it.
- *A refused input or Outcome.* `T` is still `R`, from the relation. With the real Kernel a refusal to these
  calls names the Execution it looked up from `R`, or no Execution: `submitInput` and `submitOutcome` look up
  their destination first and pass that record to `#refusal` (`packages/kernel/src/coordinator.ts`). The
  adapter's `observeRefusal` inspects the Execution the refusal names, which is then `R`. See J-1 in §8 for the
  branch where they could differ.
- *No Observation.* An unknown reference has no calls, so no inspection to join. A contradiction has its
  inspections; joins 1 and 2 are checked before the throw is accepted. A preliminary contradiction stops after
  the preliminary inspection, whose argument must still be `R`.

## 4. Question 3: legal exits, and the calls before each

**Table 2. Exits.** The calls before each are exact.

| Exit | Calls before it | When |
|---|---|---|
| `UnknownLaboratoryReference` | none | The Execution reference, or `deliver_timer`'s generation reference, denotes nothing in the relation |
| `AnswerContradiction` `execution`, early | the preliminary `inspect` | `recover` or `takeover`, and the preliminary view describes an Execution other than `R` |
| `AnswerContradiction` with a code | the whole row | The oracle's own §A1 evaluation of the operation's answer and the final view returns that code |
| An Observation | the whole row | Otherwise |

Every other throw is not a legal exit in the laboratory: the adapter's fail-visible errors (a refused control
command or inspection, `recover` or `takeover` with no open exchange, a creation refusal that names no Execution,
an answer the adapter has no rule for). The fixture runner records those as FAIL; the oracle reports them.

**In the declared search** (§A4, unchanged): skeleton E's honest runs end every command in an Observation; its
answer-only fault runs end in `AnswerContradiction` `timeout_generation` after the whole `deliver_timer` row at
E7 or E12, and its answer-and-view fault runs in an Observation; skeleton X's commands X6 to X9 end in
`UnknownLaboratoryReference` with no calls when the offered name denotes nothing, and every other X command in an
Observation.

**Order of judgment.** Per record, the first failing step gives the one code:

| Step | Checks | Code |
|---|---|---|
| A | Resolve the references through the relation | (none) |
| B | An unknown reference throws `UnknownLaboratoryReference`, and a known one does not | `exit` |
| C | The method list equals the expected list | `call-missing`, `call-extra`, `call-method` |
| D | Each call's target (Table 1) | `target`; `inspection` for a final inspection that is not the operation |
| E | The exit is the legal one (Table 2), with the same contradiction code | `exit` |
| F | The five verbatim fields equal the final view's | `inspection` |
| G | Shape, relation and first naming, as at H | `shape`, `relation`, `naming` |

**Step C's three codes.** If the recorded list is a proper subsequence of the expected one, a call is missing. If
the expected list is a proper subsequence of the recorded one, a call is extra. Otherwise a call has the wrong
method. So removing one call always reads as missing, adding one as extra, and replacing one, which keeps the
length, as a wrong method.

**A mutation before a declared contradiction.** Step C runs before step E, and the expected list depends only on
the command kind and, for the one early exit, on the preliminary answer. So an extra call anywhere fails as
`call-extra` whether the record then returns or throws. Review 03's fourth trace (`pendingTimers`, `fireTimer`,
`inspect`, `cancelExecution`, `inspect`, then the declared throw) fails at step C. No step asks what state the
Kernel should be in: the oracle compares calls with a static table, targets with its relation and recorded
answers, and the Observation with a recorded view.

## 5. Question 4: the controls

All controls build broken records only by editing records of genuine laboratory calls. Expected codes come from
the operator, declared below, never from the oracle or the adapter. The oracle does not import the adapter's
ledger or any translation helper.

### 5.1 The four review-03 probes, maintained

Each is kept as a test that asserts the broken trace is **rejected** and its honest control passes.

| Probe | Broken trace | Code (step) |
|---|---|---|
| `dispatch-x-observe-y` | `dispatch(x)` with `y`'s inspection, view and Observation | `inspection` (D) |
| `wrong-primary-method` | Declared `dispatch`, recorded `cancelExecution`, `inspect` | `call-method` (C) |
| `extra-cancellation-after-dispatch` | `dispatch`, `cancelExecution`, `inspect` | `call-extra` (C) |
| `extra-cancellation-before-declared-throw` | The fire's row, then `cancelExecution`, `inspect`, then the declared `timeout_generation` throw | `call-extra` (C) |

### 5.2 The five design-03 controls, unchanged

Same bodies and same codes, now with the step that rejects each: an omitted list member, `shape` (G); a reference
sent to another Execution, `target` (D, the `inspect` command's one call); a known fresh string refused as
unknown, `exit` (B); a changed, already-shown ID under its old string, `relation` (G); an answer-only
contradiction returning the previous Observation, `exit` (E). Each honest control passes.

### 5.3 The join matrix

A new test file, `identity-oracle.test.ts`.

**The corpus: 44 honest cases**, each a laboratory run whose last record is the case.

- *One run of 30 commands* over two Executions `x` and `y`: every command kind's Observation exit, including a
  creation replay and a `duplicate_conflict` refusal, a refused Outcome, an accepted and a replayed `await`, an
  expired and a duplicate fire, and an input refused after cancellation (`ingressRefused`); and an unknown
  reference for each of the ten referring kinds, with `deliver_timer` twice (Execution, generation).
- *Fourteen fault runs:* each of the twelve kinds with a view fault that makes its final inspection describe
  another Execution (the legal exit is `execution`), and `recover` and `takeover` with the fault on their
  preliminary inspection.
- *Coverage, asserted:* the cases reach all 36 rows of Tables 1 and 2 (twelve Observation exits, twelve
  contradiction exits, ten unknown-reference exits, two early exits), and the honest calls fill all 26 slots.

**The operators.** Each is applied to every case it fits, and each mutated case must give exactly one code.
Counts are from the prototype; the build asserts the counts it generates, and the report gives the reason for
any difference.

| Operator | Applied to | Code | Count |
|---|---|---|---:|
| Drop one call | every call of every case | `call-missing` | 67 |
| Replace one call's method by each of the other 12 | every call of a case whose expected list is the whole row | `call-method` | 780 |
| Insert one genuine call of each of the 13 methods | every position of a whole-row case; the end of an early-exit case | `call-extra` | 1,417 |
| Retarget one call to the other Execution | every call but `createExecution` in a whole-row case | `target`, or `inspection` for a final inspection | 32 + 27 |
| Retarget the fire's generation | each `fireTimer` | `target` | 3 |
| Change the exchange's Activation | each `recoverExecution` and `requestTakeover` | `target` | 4 |
| The other Execution's final inspection and Observation | each Observation case whose final inspection is not its operation | `inspection` | 16 |
| The previous Observation of the same Execution | each Observation case where a verbatim field differs | `inspection` | 3 |
| Wrong exit | Observation cases: throw `timeout_generation`, `UnknownLaboratoryReference` or an error; contradiction cases: return the previous Observation, throw another code or `UnknownLaboratoryReference`; unknown cases: return an Observation, throw a contradiction | `exit` | 121 |
| **Total** | | | **2,470** |

Two operators are restricted on purpose. On an early-exit case, replacing the preliminary inspection's method or
inserting before it changes which list is expected, so the predicted code would depend on the operator's own
result; those cases take only drops, end insertions and exit changes. Donor calls are genuine recorded calls;
for `visibleExecutions` and `reportProtocolFailure`, which the adapter never calls, the donor is a constructed
call, which step C rejects by its method alone.

The four probes are the matrix's shapes on particular cases; they stay as named tests for provenance.

### 5.4 The rest, rechecked with the new oracle

The prototype ran the existing identity tests and the whole search with this oracle in place of H's.

- `identity.test.ts`: all 67 pass, except the count test, whose expected counts gain one field, `calls`
  (9 for that run).
- `identity-search.test.ts`: 3,282, 344 and 500 runs, the same Observations and legal throws, no problem; about
  1.75 seconds against 1.42 seconds with H's oracle, alone, on the owner's machine.
- The seven mechanism witnesses and their registry cases: unchanged, still killed.
- The matrix: about 90 ms.

## 6. Question 5: the claim

**Retained, not narrowed.** Addendum 01 §A3 claimed that the oracle evaluates §A1 independently and judges each
command's Kernel call. With design 04 that claim is true: the oracle binds the command, every call, the final
inspection and the Observation into one record. D03-CHK-03, R03-1 and R03-3 keep their full scope.

**What the oracle does not judge**, as at H and now stated:

- call arguments other than the targets and the `recover`/`takeover` exchange of Table 1: caller namespaces,
  creation and request keys, encoded content, the dispatch bound, the submission grant. The encoder's tests and
  the fixture runner's whole-result comparison of the fifteen schedules judge those;
- Observation fields other than the five verbatim fields and the identity positions, which the fixture runner
  compares;
- calls made other than through the one coordinator instance (§2, with its structure test).

None of these is a guarantee H claimed. If the design check finds that one of them is part of the claim, the
choice between adding it and recording a limit is the owner's, and I stop.

## 7. The build, bounded

- `identity-lab.ts`: record every public coordinator method; the oracle rewritten to Tables 1 and 2 and steps A
  to G; a `calls` count; row and slot coverage; the header states the join.
- `identity.test.ts`: the four probes as maintained rejecting tests with honest controls; the count test's new
  field; the structure test's one-coordinator check. The five design-03 controls stay as they are.
- `identity-oracle.test.ts` (new): the corpus, the coverage assertions, the matrix, and the recording census.
- `identity-search.test.ts`: unchanged; its counts include `calls` through the calibration.
- `boundary.test.ts` and `tests/conformance/legacy-mapping.json`: the new test file.
- `README.md`: the oracle paragraph and the file table.
- 017 L-39 (K14C-R03-02): the first sentence says that the label `to-<generation's string>` is **offered** at
  the registration answer that announces an already-due timeout, only when that generation took its offered
  name, and that an occupied label or an unannounced timeout gets a fresh string. The "why acceptable" column
  says the label comes from the registration answer, which §A1 checks against the inspection, instead of "the
  mailbox". The rest of the row stays.
- The verification spec, implementation report 04, the 007 row and `progress.md`.
- Unchanged: `kernel-candidate.ts`, its ledger, the ablation table and probes, the identity mutants, witnesses,
  probe and registry entries, the search's skeletons and counts, the Kernel, the fixture and the packet tools.

## 8. Judgments for the design check

- **J-1, a refusal that names another Execution.** The oracle requires `T = R` for a refused input or Outcome.
  The adapter inspects the Execution the refusal names. With the real Kernel these are the same (§3). If a fault
  made a refusal name another Execution, the oracle would report `inspection` and the run would fail; the
  adapter would not throw first. No laboratory fault reaches that branch. Recommended: leave the adapter as it
  is; the failure is visible in every judged run. The alternative is an adapter check that throws
  `AnswerContradiction` `execution` there, which adds an adapter path, a test and a mutant for a branch the
  Kernel cannot reach.
- **J-2, the verbatim binding.** Step F adds a check H did not have, over five fields. It restates no projection
  beyond a copy and a default.
- **J-3, one code per record.** The oracle stops at the first failing step. The matrix's exact codes depend on
  this; a record with two defects reports the earlier step's.

## 9. Criteria and stop conditions

| Brief 04 | Closes by |
|---|---|
| R04-1 | Tables 1 and 2 and steps A to G in the oracle; the recording census; the structure test |
| R04-2 | The four probes rejected with honest controls; the matrix's 2,470 traces, each with its predicted code; the coverage of 36 rows and 26 slots |
| R04-3 | The oracle header, README, 017 L-39 and implementation report 04 state the join and its limits (§6); no narrower D03-CHK-03 claim |
| R04-4 | Verdicts 12 PASS and 3 REFUSED; ABL-1 to ABL-5 and the latest-grant witness; the seven identity cases; the 4,126-run search; Packet verify at the new C; C/H and base scope checks |

The build stops and reports before any patch if a supported schedule or an honest case stops passing, if the
search or the matrix finds a trace the tables do not cover, or if any change outside §7 seems needed. Kernel,
fixture and packet tools stay unchanged. No self-acceptance.
