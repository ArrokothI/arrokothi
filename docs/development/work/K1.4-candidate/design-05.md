# K1.4-candidate design 05 — answers, settlement reports and a declared matrix

Written 2026-11-20 by the K1.4-candidate coding agent (Claude Code desktop, `claude-opus-5-5`). This is a design note
only: it changes no code, and no code follows until a design check returns and the owner disposes it.

- **Subject:** D04-CHK-01..03 (all P2, test-side) of
  [design check 04](https://github.com/ArrokothI/arrokothi/blob/99d411e00049ae87b781a7c1e1008161409ec983/docs/development/work/K1.4-candidate/design-check-04.md)
  (Codex GPT-6, `codex/k1.4-candidate-design-check-04` at `99d411e00049ae87b781a7c1e1008161409ec983`), NOT APPROVED
  of [design 04](design-04.md) at `06e60dd81921946094a6f2323ec8831d61308320`. Read by commit; nothing merged.
- **Owner:** [owner choice 06](owner-choice-06.md), "Judge settlement callbacks too (recommended)";
  [owner choice 07](owner-choice-07.md), "Yes, set stop rule". [Brief 04](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03/brief-04.md) still governs.
- **Stakes for this check (owner choice 07).** If design check 05 is not APPROVED or APPROVED WITH REQUIRED CHANGES,
  the packet takes 006's "refined finishable claim" route, not another redesign. I then propose a narrower oracle
  claim (what it judges, what becomes a recorded limit in 017, and the effect on acceptance) for the owner's approval,
  with no further design-check loop.
- **Keeps from design 04:** §1; Table 1 (the calls, targets and `T` of each kind); §3's three joins, with J-2's
  wording fixed in §7 below; §5.1's four probes; §5.2's five design-03 controls.
- **Supersedes in design 04:** §2's "What is recorded" paragraph; §4 (Table 2 and the order of judgment); §5.3 and
  §5.4; §6; §7; §8; §9. Those stay as records.
- **Ownership:** the test-side laboratory and oracle (`identity-lab.ts`), their tests and the current claims. The
  adapter `kernel-candidate.ts`, `fake-driver.ts`, the Kernel, the fixture and the packet tools do not change. No item
  needs a change outside these, so I am not stopping.

**Answer in one paragraph.** Whether a record may end in an Observation is now decided from its recorded answers:
one table lists, for each slot, the answers that let the row continue, and any other answer fails the record as
`answer`, before the method list is compared. The laboratory's coordinator subclass wraps the Driver it is
constructed with, so every delivery and every settlement report is recorded at entry, in nested order, attributed to
its delivery and its call. A new step judges the reports: each one inside its own delivery, a bare `delivered()`, one
per delivery. The matrix is now a declaration: 75 named cases in five classes, 62 row keys, 26 slots and 3 delivery
slots, and 15 operators whose domains and codes are fixed in advance and whose counts follow from the declaration:
2,708 mutations and 31 declared failures. The first failing record stops judgment of its run. A prototype outside the
repository reproduces every count and code.

## 1. Root causes (012)

| Finding | Mechanism | Other defects it allows | Closed by |
|---|---|---|---|
| D04-CHK-01 | Exits were read from what the record threw; "Otherwise" made an Observation the default. No recorded answer decided anything. | Any swallowed fail-visible answer with a plausible Observation: refused control, refused inspection, no open exchange, a refusal that names no Execution, an unsupported fire result | §2 |
| D04-CHK-02 | The recorder was the coordinator's prototype. The settlement capability is a second entry into the Kernel outside it, and "every call" was claimed from a prototype census. H records calls after they return. | Missing, extra, wrong-method or misattributed reports; a reentrant call from a Driver callback recorded before its caller | §3 |
| D04-CHK-03 | Counts came from the generator; operator domains were prose; a slot was visited, not each predicate isolated. | A miscounted domain; a checker that drops one equality and still rejects the selected traces | §4, §5, §6 |

## 2. Answers decide the exit (D04-CHK-01)

**Table 3. Answers at their slot.** The oracle reads the recorded answer's discriminant, never whether the Kernel ought
to have answered so. An answer outside its slot's continuing classes is unprojectable.

| Slot | Continues | Legal early exit | Fails as `answer` |
|---|---|---|---|
| `createExecution`, `submitInput`, `submitOutcome` | `ok: true` with a value; `ok: false` whose refusal names an Execution (the projectable refusal; `T` for creation) | none | a refusal naming no Execution; anything else |
| `dispatch`, `redeliver`, `cancelExecution`, `recoverExecution`, `requestTakeover` | `ok: true` | none | any refusal; anything else |
| `pendingTimers` | a list | none | anything else |
| `fireTimer` | `expired`, `duplicate`, `stale`, `not_due` | none | `cancelled`, `clock_unavailable`, `unknown`; anything else |
| preliminary `inspect` (`recover`, `takeover`) | a view of `R` with an open Activation | a view of another Execution: `AnswerContradiction` `execution` after this call | refused; no view; a view of `R` with no open Activation |
| final `inspect`, and the `inspect` command's one call | a view | none (a view of another Execution is §A1's `execution`, judged at E) | refused; no view |

**Step B2, positional.** For slot `i` of the row, from 0: if call `i` is absent or its method is not the slot's, stop
(C will report the list). Otherwise classify its answer: *continues*, go on; *legal early exit*, the expected list
is the row up to `i`; *fails*, the record fails `answer` and judgment of it ends. B2 never reads a call that does not
sit at its slot's position, so a missing or malformed preliminary inspection cannot select a list.

**Order of judgment.** One code per record: the first failing step's.

| Step | Checks | Code |
|---|---|---|
| A | Resolve the references through the oracle's relation before the command | none |
| B | An unknown reference throws `UnknownLaboratoryReference` and a known one does not. For an unknown reference the expected list is empty, B2 is skipped and C still runs | `exit` |
| B2 | Each answer at its slot (Table 3) | `answer` |
| C | The method list equals the expected list (subsequence test as in design 04) | `call-missing`, `call-extra`, `call-method` |
| D | Each call's target (Table 1) | `target`; `inspection` at a final slot |
| D2 | Settlement reports (§3) | `report-extra`, `report-delivery`, `report-method`, `report-missing` |
| E | The exit (Table 2) | `exit` |
| F | The five copied fields equal the final view's | `inspection` |
| G | Shape, relation, first naming | `shape`, `relation`, `naming` |

**Table 2, revised. Exits.**

| Exit | Calls before it | When |
|---|---|---|
| `UnknownLaboratoryReference` | none | A reference denotes nothing |
| `AnswerContradiction` `execution` | the preliminary `inspect` | B2's legal early exit |
| `AnswerContradiction` with a code | the whole row | Every answer continues; §A1 on the operation's answer and the final view gives the code |
| An Observation | the whole row | Every answer continues; §A1 gives no code |
| None: the record fails `answer` | the row up to the unprojectable answer | B2 finds one |

A genuine fail-visible record (the adapter threw) and a swallowed one (an Observation returned anyway) both fail as
`answer`. Neither is counted as an Observation or a declared contradiction. Create, input and Outcome refusals that
name an Execution stay projectable. An exception inside the oracle is a failed test, never a rejection credited to a
mutant.

## 3. Settlement reports (D04-CHK-02, owner choice 06)

**The seam.** The adapter constructs its coordinator from the class the laboratory passes, with the Driver it created
(`new Coordinator({ driver, clock })`). The laboratory's subclass constructor replaces `driver` with a forwarding
Driver before calling `super`. Nothing in the adapter changes.

**What the laboratory records, per command, in entry order.**

| Entry | Recorded when | Fields |
|---|---|---|
| Coordinator call | at entry to any of the 13 own methods of `ExecutionCoordinator.prototype` (enumerated at load and pinned by a census test), at any depth; the answer is filled in at return | method, arguments, answer |
| Delivery | at entry to the forwarding Driver's `deliver` | run-wide number from 1; the Activation's Execution, Activation ID and writer epoch; the innermost open call |
| Report | at entry to `delivered` or `failed` on the recording settlement the laboratory made for a delivery, before forwarding to the Kernel's | method; arguments; owner (the delivery whose settlement it is); during (the innermost open delivery, or none); the innermost open call |

Each delivery's own settlement is wrapped once; the fake Driver receives the wrapper. A new `Tamper.settlement` hook may
hand the fake Driver something else, so live controls can misbehave beneath the recorder. `driverId`,
`isSafeToReplace` and `requestCancellation` are forwarded unchanged and not recorded; a report or coordinator call made
inside them is still recorded and judged.

**Step D2.** Reports first, in order, then deliveries:

| Check | Code |
|---|---|
| A report made outside any delivery | `report-extra` |
| A report on another delivery's settlement (owner ≠ during) | `report-delivery` |
| A report other than `delivered()` with no argument | `report-method` |
| A delivery with no report made during it | `report-missing` |
| A delivery with more than one | `report-extra` |

D2 compares recorded reports with recorded deliveries. It does not predict whether, where or what the Kernel delivers.

**Counts.** `calls` counts coordinator calls, each compared with one slot. New: `deliveries`, `reports` (each report
compared with one delivery) and `unjudged` (§6).

**Live controls** (one run: create, dispatch, redeliver):

| Settlement handed to the fake Driver | Code |
|---|---|
| The recording one (honest neighbor) | none |
| One that reports nothing | `report-missing` |
| One whose `delivered` reports twice | `report-extra` |
| One whose `delivered` reports `failed("lab")` | `report-method` |
| At the redelivery, the dispatch's recording settlement | `report-delivery` |

**Evidence attribution, corrected.** The submission grant is a recorded argument of `submitOutcome` that the oracle
does not judge; grant selection is judged by ABL-2 and the latest-grant witness (`ablations.test.ts`), not by the
encoder tests or the fifteen whole-result comparisons. The one-`new Coordinator(` structure test is a regression guard
(012), not a proof against other routes or aliases. Design 04's exclusive-route sentence is dropped.

## 4. The corpus (D04-CHK-03 item 1)

**Classes.** O: the row ends in an Observation. X: in a contradiction after the whole row. P: in the early
contradiction. U: in `UnknownLaboratoryReference`. N: in a declared `answer` failure. Each case is a laboratory run
whose last record is the case; its row key and call count are declared here, before any run.

**The main run** (two Executions; `x` and `y` created with request keys `kx` and `ky`):

| # | Command | Class, row key | Calls |
|---|---|---|---:|
| M1 | `create x` | O `create observation` | 2 |
| M2 | `create y` | O `create observation` | 2 |
| M3 | `create_retry x`, same content (replay) | O `create_retry observation` | 2 |
| M4 | `create_retry x`, initial input `other-initial` (`duplicate_conflict` naming x) | O `create_retry observation` | 2 |
| M5 | `accept_event a` to x | O `accept_event observation` | 2 |
| M6 | `inspect y` | O `inspect observation` | 1 |
| M7 | `dispatch x`, bound 1 (one delivery) | O `dispatch observation` | 2 |
| M8 | `redeliver_dispatch x` (one delivery) | O `redeliver_dispatch observation` | 2 |
| M9 | `takeover x` (one delivery) | O `takeover observation` | 3 |
| M10 | `recover x`, available `identity-lab@1` | O `recover observation` | 3 |
| M11 | `submit_outcome` `continue` from M10, two Emissions under one key (`malformed_envelope` naming x) | O `submit_outcome observation` | 2 |
| M12 | `inspect x` | O `inspect observation` | 1 |
| M13 | `submit_outcome` `await` g1, deadline 10, from M12 | O `submit_outcome observation` | 2 |
| M14 | `resubmit_outcome`, M13's envelope (replay) | O `resubmit_outcome observation` | 2 |
| M15 | `deliver_timer x g1`, name t1 (`expired`) | O `deliver_timer observation` | 3 |
| M16 | `deliver_timer x g1`, name t1 (`duplicate`) | O `deliver_timer observation` | 3 |
| M17 | `inspect y` | O `inspect observation` | 1 |
| M18–M23 | `dispatch`, `redeliver_dispatch`, `accept_cancellation`, `recover`, `takeover`, `inspect` of `nobody` | U `<kind> unknown` | 0 |
| M24 | `accept_event b` to `nobody` | U `accept_event unknown` | 0 |
| M25, M26 | `submit_outcome`, `resubmit_outcome` of M13's envelope to `nobody` | U `<kind> unknown` | 0 |
| M27 | `deliver_timer nobody g1` | U `deliver_timer unknown` | 0 |
| M28 | `deliver_timer x nogen` | U `deliver_timer unknown` | 0 |
| M29 | `accept_cancellation x` | O `accept_cancellation observation` | 2 |
| M30 | `accept_event late` to x (`terminal_destination`: `ingressRefused`) | O `accept_event observation` | 2 |

**Per-kind runs.** Prefix: `create x`, `create y`; then `dispatch x` for `redeliver_dispatch`, `submit_outcome`,
`resubmit_outcome`, `recover` and `takeover`; `dispatch x` and `submit_outcome` `await` g1 (deadline 10) for
`deliver_timer`; and one `submit_outcome` `continue` for `resubmit_outcome`. Command: `create z`; `create_retry x`;
`accept_event a` to x; `dispatch x`; `redeliver_dispatch x`; `submit_outcome` or `resubmit_outcome` `continue` from the
dispatch; `accept_cancellation x`; `deliver_timer x g1`; `recover x` with `identity-lab@1`; `takeover x`; `inspect x`.

| Cases | Fault on the command | Class, row key | Calls |
|---|---|---|---:|
| F1–F12, one per kind | the final inspection's view names `<id>-other` | X `<kind> contradiction` | row length |
| F13, F14 | `recover`, `takeover`: the preliminary inspection's view names `<id>-other` | P `<kind> preliminary` | 1 |
| A1–A26, one per slot | the answer at slot `s` becomes `null` (`pendingTimers`), `{ result: "unknown" }` (`fireTimer`) or a refusal naming no Execution (every other method) | N `<kind> answer@s` | s + 1 |
| G1 | genuine: `dispatch x` a second time (`exchange_unresolved`) | N `dispatch answer@0` | 1 |
| G2 | genuine: `redeliver_dispatch y` (`no_unresolved_exchange`) | N `redeliver_dispatch answer@0` | 1 |
| G3 | genuine: `takeover x` after `recover x` with no definition available (`recovery_held`) | N `takeover answer@1` | 2 |
| G4, G5 | genuine: `recover y`, `takeover y` (no open exchange) | N `<kind> answer@0` | 1 |

G1 to G5 have the prefix `create x`, `create y` (and `dispatch x` for G1 and G3). No genuine schedule refuses a
cancellation, a recovery or an inspection, names no Execution in a refusal, or answers a fire outside the four
results, so those classes are covered by A1–A26 only.

**Declared sets.** Rows (62): `<kind> observation` and `<kind> contradiction` for the 12 kinds; `<kind> unknown` for the
10 referring kinds; `recover preliminary`, `takeover preliminary`; `<kind> answer@<s>` for the 26 slots. Slots (26): Table
1's, filled by O and X calls. Delivery slots (3): `dispatch@0`, `redeliver_dispatch@0`, `takeover@1`, each holding a
delivery and its report in an O or X case. Class sizes: O 19, X 12, P 2, U 11, N 31; 75 cases. Row keys are
command/exit classes, not A1 codes: the existing association-fault tests keep covering those codes.

## 5. Operators and counts (D04-CHK-03 items 2 to 4)

`n` is a case's declared call count. The O and X calls number 39 + 26 = 65, of which 6 are `createExecution` and 3
`pendingTimers`; N calls number 43 + 6 = 49.

| Operator | Domain | Code | Count |
|---|---|---|---:|
| Drop one call | every call of O, X, P, N | `call-missing` | 39 + 26 + 2 + 49 = 116 |
| Replace one call's method by each of the 12 others | every call of O, X | `call-method` | 12 × 65 = 780 |
| Insert a donor of each of the 13 methods | every position of O, X (65 + 31 = 96); the end of P (2); the one position of U (11) | `call-extra` | 13 × 109 = 1,417 |
| Retarget the Execution argument to the other Execution | O, X calls but `createExecution` and `pendingTimers` | `target`; `inspection` at a final slot | 65 − 9 = 56 (29 + 27) |
| Give `pendingTimers` an argument | its O, X calls | `target` | 3 |
| `fireTimer` generation + 7 | its O, X calls | `target` | 3 |
| `fireTimer` kind `execution_deadline` | its O, X calls | `target` | 3 |
| Exchange Activation changed | `recoverExecution`, `requestTakeover` in O, X | `target` | 4 |
| Takeover writer epoch + 1 | `requestTakeover` in O, X | `target` | 2 |
| The other Execution's final inspection and Observation (M12 or M17) | O with a final slot | `inspection` | 16 |
| One copied field changed, the rest kept | each of the five fields of each O | `inspection` | 5 × 19 = 95 |
| Wrong exit | O: throw `timeout_generation`, `UnknownLaboratoryReference`, an Error; X, P: the previous Observation, another code, `UnknownLaboratoryReference`; U: the previous Observation, a contradiction | `exit` | 57 + 42 + 22 = 121 |
| Swallow: append the prefix's last genuine final inspection of x (of y for G2, G4, G5), return its Observation | N | `answer` | 31 |
| Swallow: return the previous Observation | N | `answer` | 31 |
| Report: drop; duplicate; `failed("lab")`; owner another delivery; outside any delivery | the 6 O, X cases with a delivery | `report-missing`; `report-extra`; `report-method`; `report-delivery`; `report-extra` | 5 × 6 = 30 |
| **Total** | | | **2,708** |

The 31 N cases also assert their pristine verdict, `answer`.

- **Field values:** `state` `READY`, or `RUNNING` if it was `READY`; `progressRevision` + 1; `activationId` `null`, or a
  string if it was `null`; `writerEpoch` + 1; `acceptedDeadline` `null`, or 999 if it was `null`.
- **Donors** are the first O call of each method, with their recorded answers, all in their slot's continuing class;
  the `inspect` donor is the first inspection of y (M2's final inspection: a view of y with no open Activation, so at
  a preliminary slot of x it selects the early list and C still finds the extra call). `visibleExecutions` and `reportProtocolFailure` donors are constructed
  records, not genuine calls; C rejects them by method alone.
- **Exclusions.** Replace and insert are not applied to N, P (except an end insertion) or U, and retargeting only to O
  and X: there, the operator changes which list B2 selects, so the code would depend on the oracle. Dropping always
  shortens the record below the selected list, so it applies everywhere.
- **Per mutation the test asserts,** before using the code: the case's prefix passes and its last record makes its
  declared calls; the pristine case reaches its declared row and moves only that exit's count (an N case moves none);
  the mutated record differs from the pristine one in exactly the operator's components (`command`, `calls`,
  `deliveries`, `reports`, `observation`, `thrown`); every record was judged (`unjudged` 0). Then exactly one problem,
  with the code in this table. Codes are never read from the oracle. The oracle imports nothing from the adapter but
  the two error classes; the adapter's ledger and translation helpers are not reachable from it.

**Isolated dimensions** (D04-CHK-03 item 3; each negative has its pristine record as the honest neighbor):

| Dimension | Negatives |
|---|---|
| Takeover writer epoch | exchange epoch (2) |
| Each copied field | one field (19 each) |
| `fireTimer` kind, generation, Execution | kind (3), generation (3), retarget (3 of the 29) |
| Preliminary and final inspection targets | retarget at the preliminary slot (4), at a final slot (27) |
| A refusal naming another Execution (J-1) | live: an input refusal and an Outcome refusal faulted to name y, so the adapter inspects y: `inspection`; the genuine refusals pass |

The four review-03 probes, the swallowed-refusal trace (create x, dispatch x; then a second dispatch's refused call,
followed by the next genuine inspection of x and its Observation, with the throw cleared: `answer`; the first dispatch
passes), the live settlement controls and the five design-03 controls stay as named tests.

## 6. After a failed record (D04-CHK-03 item 5)

The first failing record stops judgment of its run. The oracle reports that record's one code, judges nothing after
it and counts the rest as `unjudged`; the other counts cover the records judged. So a truncated run is never reported
as complete (`clean` requires no problem), and a failed prefix is never pristine evidence (the matrix asserts its
prefix passes first). The design-03 omitted-list control keeps its code set, `shape`; its second command is now
`unjudged`, and a test pins that.

## 7. The joins, stated precisely (J-1, J-2, J-3)

- **J-1:** kept. `T` is `R` for every refused input or Outcome; the adapter is unchanged; the live J-1 controls of §5
  pin it.
- **J-2:** step F checks equality of the five enumerated projections (`state`, `progressRevision`, `activationId` or
  `null`, `writerEpoch` or 0, `acceptedDeadline` or `null`) and G pairs the identity positions with the same view. It
  does not claim that these fields identify one inspection: the check's `recover` example (a code hold that changes
  only `recoveryHold`) is outside them. Other fields stay judged by the fixture's whole-result comparison and design
  03's paired fault runs. The view is read from the final call's recorded answer, never from `StepRecord.view`.
- **J-3:** one code per record, the first failing step's, with B continuing to C on an unknown reference.

## 8. The claim

**Retained, in the scope owner choice 06 set.** For each command the oracle judges, against the command, its own
relation and the recorded answers:

1. every coordinator call made on the laboratory's coordinator during the command, at any depth: method, order and
   count (C), and target (D);
2. every recorded answer at its slot (B2);
3. every settlement report the Kernel's capabilities received through the laboratory's Driver: its delivery, method
   and count (D2);
4. the exit (E), the five copied fields (F) and the identity positions (G).

| Not judged by the oracle | Judged by |
|---|---|
| Caller namespaces, creation and request keys, encoded content, the dispatch bound | encoder tests; the fifteen whole-result comparisons |
| The submission grant presented to `submitOutcome` | ABL-2 and the latest-grant witness |
| Observation fields other than the five and the identity positions | the fixture's whole-result comparison; design 03's paired fault runs |
| Whether, where and what the Kernel delivers; its `isSafeToReplace` and `requestCancellation` calls | the Kernel's conformance tests; the fake Driver's unit tests |
| Calls on another coordinator instance or through an alias | not observed; the structure test is a regression guard |

The last row states the recorder's reach, as design check 04 asked. H's recorder had the same reach and claimed
coordinator calls only, so it is not a narrower D03-CHK-03 claim. If the check finds it narrower, that is a finding
against this design, and owner choice 07 governs what follows.

## 9. 017 L-39 (K14C-R03-02)

Replacement for the row's text from its first sentence to "(owner choice 04, OQ-1).":

> A laboratory name for a timeout Event the Kernel mints when a wait registers with its deadline already due. No
> fixture command names it at that point. `kernelCandidate` offers it `to-<laboratory name of its own generation>` at
> the registration answer that announces it, and only when that generation took the name its `await` offered: the
> corpus's spelling, held in the candidate as a declared representation exception. If that label already denotes
> another Event, or the generation did not take its offered name, the timeout gets a fresh string; so does a timeout
> no answer announced. The timeout keeps the string actually assigned to it, the label or a fresh string, even if a
> later command names it (owner choice 04, OQ-1); it cannot keep a label it was refused.

"Why acceptable" becomes: "One name in 142 steps; the label comes from the registration answer, which design 03
addendum 01 §A1 checks against the inspection after it, so a timeout for the wrong generation still shows." The
within-run first-exposure limitation and the rest of the row stay.

## 10. The build, bounded

- `identity-lab.ts`: the recording subclass records calls at entry, wraps the Driver and each settlement (§3), and
  takes `Tamper.settlement`; records gain `deliveries`, `reports` and an entry-order `trace`. The oracle follows Tables
  1 to 3 and steps A to G with B2 and D2, the counts `calls`, `deliveries`, `reports` and `unjudged`, and §6's policy.
  The header states the claim and the table of §8.
- `identity.test.ts`: the four probes, the swallowed-refusal trace, the live settlement and J-1 controls, the
  failed-record control, the nested-order and 13-method census tests, and the counts test's new fields. The five
  design-03 controls stay. The structure test's comment calls it a regression guard.
- `identity-oracle.test.ts` (new): §4's declared corpus and sets, §5's operators and count formulas, asserted.
- `boundary.test.ts` and `tests/conformance/legacy-mapping.json`: the new file. `README.md`: the oracle paragraph and
  the file table. 017 L-39 (§9). The verification spec, implementation report 04, the 007 row and `progress.md`.
- Unchanged: `kernel-candidate.ts`, `fake-driver.ts` and its tests, the ledger, the ablations and the latest-grant
  witness, the identity mutants, witnesses, probe and registry cases, the search's skeletons and counts, the Kernel,
  the fixture and the packet tools.

## 11. Prototype

A throwaway prototype outside the repository (Node v26.10.0, the owner's machine) implemented §2, §3 and §6 over H's
files, without touching them:

- The existing identity tests: all pass except the counts test, whose object gains `calls: 9`, `deliveries: 1`,
  `reports: 1` and `unjudged: 0`. The 4,126-run search: unchanged and passing.
- The matrix: 75 cases with their declared rows, calls, slots and delivery slots; 2,708 mutations, each with its
  declared code and exactly the declared count per operator; 31 N cases failing as `answer`. About 0.3 seconds.
- The four probes, the swallowed-refusal trace, the live settlement and J-1 controls and the failed-record control:
  as declared.

These are capacity and consistency notes, not pinned evidence. The build reports its own counts and environment.

## 12. Criteria and stop conditions

| Item | Closes by |
|---|---|
| D04-CHK-01 | Table 3, step B2, revised Table 2; the swallowed-refusal trace; 31 N cases and 62 swallow mutations |
| D04-CHK-02 | §3's seam, entries and D2; the live controls and 30 report mutations; the attribution corrections; §8 |
| D04-CHK-03 | §4's published corpus and sets; §5's domains, formulas, isolated dimensions and assertions; §6 |
| R04-1 | Tables 1 to 3, steps A to G with B2 and D2, the census and nested-order tests |
| R04-2 | The probes and named controls; the matrix's 2,708 mutations and 31 declared failures, over 62 rows, 26 slots and 3 delivery slots |
| R04-3 | The oracle header, README, 017 L-39 and implementation report 04 state §8 |
| R04-4 | 12 PASS and 3 REFUSED; ABL-1 to ABL-5 and the latest-grant witness; the seven identity cases; the 4,126-run search; Packet verify at the new C; C/H and base scope checks |

The build stops and reports before any patch if a supported schedule or an honest case stops passing, if a case's
recorded calls, row or delivery differ from §4, if an operator's count or code differs from §5, or if any change
outside §10 seems needed. A count or code is never changed to match what the oracle returned. Kernel, fixture and
packet tools stay unchanged. No self-acceptance.
