# K1.4-candidate design 03 addendum 01 — design check 03's required changes

Written 2026-11-15 by the K1.4-candidate coding agent (Claude Code desktop, `claude-fable-5-2`), before the
round-3 payload.

- **Subject:**
  [design check 03](https://github.com/ArrokothI/arrokothi/blob/62092a70fec6e82ef4dcec17ce27195debf6b5ca/docs/development/work/K1.4-candidate/design-check-03.md)
  (Codex GPT-6, `codex/k1.4-candidate-design-check-03` at `62092a70fec6e82ef4dcec17ce27195debf6b5ca`), APPROVED
  WITH REQUIRED CHANGES D03-CHK-01..05 of [design 03](design-03.md) at
  `3745cb4bcf12eb36af797b582d5132dc5c0a6ea1`. Read by commit; not merged.
- **Owner:** [owner choice 04](owner-choice-04.md) accepts OQ-1, OQ-2 and OQ-3 and sets the search's size.
- **Effect:** this addendum governs where it differs from design 03. It replaces design 03 §4 rules 4 and 5,
  the sentence "A changed native ID always changes the Observation" in §4, and §9's search and oracle. The
  ledger (§3), rules 1 to 3 and 6, and §6 stand. No new owner choice is needed.

Judgments J-1, J-3, J-4 and J-5 were agreed by the check. J-2 was agreed on condition of D03-CHK-01.

## A1. D03-CHK-01: an answer is checked against what it claims to name

**Accepted in full.** Design 03 rule 4 checked that an answered ID exists. It now checks the association the
answer claims. Every check compares one Kernel answer with the inspection made after that command. None decides
anything about Kernel state, repairs a view or sends another command.

**Rule 4 (replaces design 03's).** After a command's Kernel call and before its Observation is built:

| Command | The answer says | The inspection must hold |
|---|---|---|
| every command | (the Execution the adapter addressed, or the one the answer named) | Its own `executionId` is that Execution |
| `create`, `create_retry` | `initialEventId` | A mailbox entry with that ID, of the input category, whose payload carries this command's `initialInput.eventId` |
| `accept_event`, accepted | `eventId` | A mailbox entry with that ID, of the input category, whose payload carries this command's `event.eventId` |
| an accepted Outcome | `wait` present or absent | Present exactly when the Outcome's next step is `await` |
| an accepted Outcome with a wait | `wait.generation` | The live wait or a retired wait of that generation, `registeredBy` this Outcome's Activation |
| the same | `wait.timeoutEventId` set | A mailbox entry with that ID, of the timeout category, whose `waitGeneration` is that generation, and which is that retired wait's `endingEventId` |
| the same | `wait.result` is `expired` | `wait.timeoutEventId` is set |
| `deliver_timer` | `timeoutEventId`, set or `null` | The mailbox's timeout entry whose `waitGeneration` is the resolved generation has exactly that ID; `null` exactly when there is no such entry |

- **Replay needs no exception.** `ExecutionView.retiredWaits` keeps every ended generation with the Activation
  that registered it. So the generation check is the same for a first acceptance and for a replay, and the
  `replayed` flag is not read at all. J-2's condition is met this way.
- **Presence is checked too.** A duplicate fire answered with `null` while the mailbox holds that generation's
  timeout fails the last row. An accepted `await` answered without a wait fails the fourth.
- **Why the timer row is exact.** The Kernel answers a wait fire with the timeout ID exactly for `expired` and
  for `duplicate`, and a generation has a timeout entry exactly when it expired.

**Rule 5 (replaces design 03's).** For each Execution the adapter keeps, apart from the ledger, the name each
input Event was **offered**: the name in the first accepted answer that named that Event ID. It is never
overwritten.

- At every accepted input answer, the mailbox entry's payload name must equal **this command's** name (rule 4,
  rows 2 and 3). So a replay that names an Event under another name is a contradiction.
- At every printing, each input entry's payload name must equal its retained offered name, and an input entry
  with no retained offered name fails. It never takes a name from its payload.
- The comparison is with the offered name, never with the shown string. Two inputs offered `n` both carry `n`;
  the second is shown under a fresh string and still passes.

**Failure.** A contradiction throws `AnswerContradiction`, an error with a `code` naming the row. It is thrown
after the Kernel answered. The runner records the step as FAIL and stops.

**Tests** (transition tests, each with an honest control that completes):

| Trace | Fault | Expected code |
|---|---|---|
| Check trace 1, and its mirror | A duplicate fire of g2 answers with g1's timeout, in the answer only | `timeout_generation` |
| Check trace 2 | A due-at-registration timeout's mailbox entry carries another `waitGeneration` | `timeout_generation` |
| Check trace 3 | A replayed Outcome's answer names another retired generation | `wait_activation` |
| Absent ID | A fire's answer names an ID the mailbox does not hold | `timeout_generation` |
| Missing field | A duplicate fire answers `null`; a replayed `await` answers without a wait | `timeout_generation`; `wait_presence` |
| Wrong category | An answered input ID is a timeout entry | `input_entry` |
| Payload drift | An input entry's payload name changes after acceptance | `input_payload` |
| No offer | An input entry appears that no answer named | `input_unoffered` |
| Honest neighbours | Duplicate and replayed answers after the readiness was consumed and after cancellation; two inputs offered one name; the same in two Executions | No throw |

## A2. D03-CHK-02: what a changed ID can and cannot show

**Accepted in full.** The claim is limited to what the ledger can establish.

- **Claimed.** Within one run, the same string in a translated identity position of one scope means the same
  native ID, and different strings mean different native IDs. So an ID that replaces one **already shown in
  that run** appears under a string no Observation has shown. An answer that contradicts the inspection throws
  (A1). An extra Event shows as one more list member.
- **Not claimed.** An ID that differs from what a correct Kernel would have minted, consistently and before any
  Observation has shown it, takes the offered name like any first naming. The adapter cannot know which opaque
  ID was "meant", and it does not derive native IDs to find out. Two independently named runs are not compared.
- **"Exact image"** means the translated positions of A5.1. It does not mean every identity in `ExecutionView`,
  and it excludes the bounded projections of 017 L-42.

**Tests.** The kept witnesses fault only IDs already shown: review 01's and review 02's duplicate-fire drift in
ordinary and adversarial spellings, a labelled timeout whose ID changes at its first explicit naming, and the
answer-only contradictions of A1. **First-exposure control:** two runs differ only in the native ID of a
timeout at its first fire, in the answer and the view alike; the test asserts their Observations are equal and
says why that is the limit. The search injects faults only at duplicate fires (A4).

## A3. D03-CHK-03: the oracle

**Accepted in full.** The oracle is test-side code in `identity-lab.ts`. It never calls the candidate's ledger.

**What it records**, through a coordinator subclass, for every command: the command as issued; every coordinator
call with its arguments and its raw answer, in order; the result of the last inspection of that command, which
is the one the Observation was built from, kept apart from any earlier inspection `recover` or `takeover` made;
and the Observation, or the error thrown.

**What it checks, per command, in this order.**

1. **Legal exit.** It computes the one legal exit before looking at the result:
   - a reference (A5.1) whose string its own relation does not hold: the adapter must throw
     `UnknownLaboratoryReference`, having made no Kernel call;
   - an answer that fails A1's table, evaluated by the oracle's own code on the raw answer and inspection: the
     adapter must throw `AnswerContradiction`;
   - otherwise the adapter must return an Observation. Any other throw fails.
2. **Target.** The command's Kernel call went to the native Execution, and for a fire the native generation,
   that the oracle's relation held for the reference **before** this command.
3. **Shape.** The Observation has exactly the fixture's fields. Each identity list has the length of the view's
   list; `dispatchedBatch`, `liveWaitGeneration` and `waitEndedReadiness` are null or empty exactly when the
   view's member is null.
4. **Relation.** Every identity position is paired with the native ID at the same position of the view. Per
   family and native Execution, the pairs must stay one-to-one for the whole run, in both directions.
5. **First naming.** For a native ID the relation meets for the first time: if this command offered a name for
   it (design 03 rule 2, computed from the command and the raw answer) and that name denoted nothing before, the
   string is that name. Otherwise the string denoted nothing before and is not that name.
6. **Counts.** Commands attempted, Observations returned, legal throws by kind, and fault sites reached.

**Paired fault runs.** A fault run is compared with the honest run of the same assignment at the fault step.
With the ID changed in the answer and the view, every field must be equal except the strings at the positions
of the changed ID, and those strings must be new. So a difference in state or a receipt is never credited as
identity detection.

**Rejection controls.** Each wraps the real candidate so that it misbehaves in one way, and the oracle must
name the problem. Each has an honest control that passes.

| Broken behavior | The oracle reports |
|---|---|
| The last member of an Event list is omitted | `shape` |
| A reference is sent to another Execution | `target` |
| A known displayed fresh string is refused as unknown | `exit` |
| A changed, already-shown ID is printed under its old string | `relation` |
| An answer-only contradiction returns the previous Observation | `exit` |

The fifteen fixture schedules keep the fixture runner's whole-result comparison, unchanged.

## A4. D03-CHK-04: the search, counted and budgeted; the registry witnesses

**Accepted in full, with the scope shrunk as the owner directed.** Design 03 said "at most three non-ordinary
slots". **The search now runs every assignment with at most two non-ordinary slots.** Nothing is sampled.

### The two skeletons

A reference `ref(…)` is the string the registering command's Observation showed, so later steps stay reachable
after a conflict. Square brackets mark a name slot.

**Skeleton E, one Execution, 14 commands, 9 slots.** Native IDs in scope: six Events, three generations.

| # | Command | Kernel result |
|---|---|---|
| E0 | `create` `x`, initial input `initial` | |
| E1 | `accept_event` [a], class `other` | |
| E2, E3 | `dispatch`; `submit_outcome` await [g1], deadline 10 | waiting |
| E4 | `deliver_timer` ref(g1), [t1] | expired |
| E5, E6 | `dispatch`; `submit_outcome` await [g2], deadline 5 | already due: expired at registration |
| E7 | `deliver_timer` ref(g2), [t2] | duplicate |
| E8 | `accept_event` [b], class `other` | |
| E9, E10 | `dispatch`; `submit_outcome` await [g3], deadline 30 | waiting |
| E11 | `deliver_timer` ref(g3), [t3] | expired |
| E12 | `deliver_timer` ref(g3), [t4] | duplicate |
| E13 | `accept_cancellation` | |

**Skeleton X, Executions, 11 commands, 6 slots.**

| # | Command |
|---|---|
| X0 to X2 | `create` [e1], [e2], [e3] under three creation keys |
| X3 | `create_retry` [e4] under the first key: a replay of the first Execution |
| X4, X5 | `accept_event` [n1] to ref(first), [n2] to ref(second) |
| X6 to X9 | `inspect` by the name **offered** in e1, e2, e3, e4: the legal exit is its target or an unknown reference |
| X10 | `inspect` ref(third) |

### The domains

Ordinary names: `ev-a`, `ev-b`, `tm-1` to `tm-4`, `gen-1` to `gen-3`, `exec-1` to `exec-4`, `in-1`, `in-2`.
"Fresh(…)" is the predicted fresh string of a native ID, taken from a calibration run with ordinary names; the
search asserts that every run minted the same native IDs. "Copy" is read when the slot's command is issued. A
choice equal to the slot's own ordinary name is dropped. Choices are counted by position in the list, so two
choices that happen to give one string are two assignments.

| Slots | Non-ordinary choices | Count |
|---|---|---|
| Event slots a, t1, t2, b, t3, t4 | `initial`; `ev-a`; `tm-1`; `to-gen-1`; `to-gen-2`; fresh(second timeout); fresh(third timeout); fresh(third timeout)`~2`; copy of the last member of `acknowledged` then `queued` in the previous Observation; `__proto__`; `雪` | a 10, t1 10, the others 11 |
| Generation slots g1, g2, g3 | `gen-1`; `gen-2`; fresh(generation 2); fresh(generation 3); fresh(generation 3)`~2`; copy of the last generation string shown; `__proto__`; `雪` | g1 6 (no copy yet), g2 7, g3 8 |
| Execution slots e1 to e4 | `exec-1`; `exec-2`; fresh(second Execution); fresh(third Execution); fresh(third Execution)`~2`; copy of the last `executionId` shown; `__proto__`; `雪` | e1 6 (no copy yet), e2 7, e3 8, e4 8 |
| Input slots n1, n2 | `initial`; `in-1`; `__proto__` | n1 2, n2 3 |

### The counts

With slot sizes m, the number of assignments with at most two non-ordinary slots is `1 + Σm + Σ(i<j) m_i·m_j`.

| Part | Sizes | Runs |
|---|---|---|
| Skeleton E, honest | 10, 6, 10, 7, 11, 11, 8, 11, 11 (sum 85; pairs 3,196) | 3,282 |
| Skeleton E, faults | the 86 assignments with at most one non-ordinary slot × 2 duplicate fires (E7, E12) × 2 modes (answer and view; answer only); each ends at its fault step | 344 |
| Skeleton X, honest | 6, 7, 8, 8, 2, 3 (sum 34; pairs 465) | 500 |
| **Total** | | **4,126** |

The test asserts these numbers as generated and as completed, the number of Observations returned, the legal
throws by kind, and 344 fault sites reached. A run that ends early for any reason other than its declared exit
fails.

**What two slots cover and what they do not.** Two slots reach every pair of names in both arrival orders,
including review 02's chains (a collision, then a copy of the exposed string). Three-way cases, such as a fresh
string whose `~2` variant is also occupied, are not in the search. They are the named transition tests of the
mechanism witnesses below.

### Where it runs, and the budget

It is one test file, `identity-search.test.ts`, inside `npm test` and so inside the `repository-tests` check,
whose command limit is 900 seconds. It is not partitioned.

**Calibration** (2026-11-15, before the build). Skeleton E's 14 commands with a recording coordinator, run
against the prototype of design 03 kept outside the repository:

| Environment | Runs | Elapsed | Per run |
|---|---|---|---|
| Node v26.10.0, darwin arm64, Apple M1, 8 cores | 2,000 | 672 ms and 660 ms (two passes) | 0.33 ms |

The calibration did not run the oracle. Allowing ten times that for the oracle and the paired comparisons, the
4,126 runs are about 14 seconds on this machine. A CI runner five times slower would take about 70 seconds. The
report states the measured figure at C. **If the measured time at C exceeds 120 seconds on this machine, the
build stops and the scope is shrunk in this declaration first.**

### The seven registry cases

They go through the existing workflow, as ABL-1 to ABL-5 did: cases `k14-candidate.identity-m1` to `-m7` in
`mutations.json`, a coverage family, `unread` hold-register entries, `mechanism_witness` with
`semantic_credit: none`. No packet tool changes; if one would have to, the build stops for the owner.

Each case runs `identity-probe.mjs <row>`, which runs only that row's witness. A witness is a short named
function in `identity-witnesses.ts`. It reports a failed assertion by name. An expected Observation replaced by
`UnknownLaboratoryReference` or `AnswerContradiction`, or an expected throw that did not happen, is a named
assertion failure. A crash, an import failure or any other error makes the probe throw, which is an invalid
run and never a kill. A maintained test reads the same table, applies each edit to a copy and requires the
same kill.

| Row | Edit to the adapter | Witness |
|---|---|---|
| M1 | A fresh string is not recorded | A displayed fresh string is offered as another timeout's name: three distinct strings. A displayed Execution and generation fresh string is used as a reference: it resolves |
| M2 | A fresh string is not checked against the ledger | The predicted fresh string is occupied before its ID is first shown, and then its `~2` variant too |
| M3 | The label is written without the ledger | A due-at-registration label, then an input and a timeout offering that label |
| M4 | An input's string is read from its payload | Two request keys under one name; an input and a timeout under one name, both orders |
| M5 | References resolve only names that were offered and taken | After a generation conflict and an Execution conflict, the old name and the new fresh string are both used: native targets asserted, and the schedule continues |
| M6 | A shown ID takes a later free name | A due-at-registration timeout, then its first explicit name: the label stays |
| M7 | Rule 4 does nothing | An answer-only absent ID and a wrong-generation answer: `AnswerContradiction` required |

ABL-1 to ABL-5 and the latest-grant witness are unchanged.

## A5. D03-CHK-05: the census by path, and the invariant's domain

**Accepted in full.** Design 03 §2 is replaced by this section. The invariant is stated over A5.1 only.

### A5.1 Translated native-identity positions

| Family, scope | Observation positions | Names offered by | References resolved from |
|---|---|---|---|
| Execution, the run | `executionId` | `create`/`create_retry` `.executionId` | `.executionId` of `dispatch`, `redeliver_dispatch`, `accept_cancellation`, `deliver_timer`, `recover`, `takeover`, `inspect`; `accept_event.event.destination`; `outcome.executionId` |
| Wait generation, one native Execution | `liveWaitGeneration`; `waitEndedReadiness[].generation` | `outcome.next.wait.generation` | `deliver_timer.generation` |
| Event, one native Execution | every member of `acknowledged`, `queued`, `terminalDispositions`, `dispatchedBatch` | `initialInput.eventId`; `accept_event.event.eventId`; `deliver_timer.timeoutEvent.eventId`; the Q2 b label | none (`eventIdentity` is refused, OQ-2) |

**The invariant.** For each family, and for Events and generations each native Execution, the strings in these
positions are the values of one injective function of the native ID that does not change during a run. A
reference resolves through its inverse. The full identity of an Event or generation string is the triple
(family, shown Execution, shown string).

### A5.2 Every other path

| Field | Adapter path | Class |
|---|---|---|
| `Observation.ingressRefused` | Echo of `accept_event.event.eventId` when the Kernel refused the input for an ended destination | **Outside the invariant.** No Event was accepted, so no ledger entry is made (J-3) |
| `Observation.activationId`, `.receipt`, `.writerEpoch`; `outcome.activationId`, `.writerEpoch` | Verbatim, both ways | Relational families the runner relates. Not translated |
| `Observation.emissions[]` from `outcome.emissions[].emissionId` | Sent as the Kernel's `emissionKey`; the view's `emissionKey` printed | Bounded projection, 017 L-42. Not an image of Emission IDs |
| `Observation.rejection`, `.recoveryHold.reason` | The Kernel's classification and words | Diagnostics, not typed references |
| `Observation.state`, `.progressRevision`, `.progress`, `.acceptedDeadline`, `.effectIntents` | From the view; `effectIntents` constant (L-41) | Not identities |
| `create.producer`, else `initialInput.producer`; `accept_event.event.producer` | The caller namespace of the Kernel call | **Untranslated identity input.** Never emitted |
| `create.requestKey`; `accept_event.event.requestKey` | Creation key; input request key | **Untranslated identity input.** Never emitted |
| `create.definitionRevision`; `recover.availableDefinitionRevisions[]` | Verbatim to the Kernel | Untranslated identity input. Never emitted |
| `event.kind`, `.subscriptionClass`, `.correlation` (inputs) | Kind and class are input content; `correlation` travels in the payload | Content |
| `wait.subscriptions[]`, `wait.dependencies[].kinds`, `.correlation`, `wait.deadline` | Verbatim in the declaration | Content |
| `wait.dependencies[].eventIdentity` | Refused in `begin` and in `apply` (OQ-2) | Not accepted |
| `outcome.effects[]` (`proposalKey`, `operation`, `input`) | Each proposal encoded whole; K1 refuses a non-empty list | Content. No native-ID ledger |
| `outcome.progress`, `emissions[].value`, `next.result`, `next.error` | Encoded values | Opaque values; strings inside them are not references |
| `initialInput.destination`, `initialInput.requestKey`, `initialInput.waitGeneration` | Not read: creation uses the command's `executionId` and `requestKey` | Accepted and ignored |
| `deliver_timer.timeoutEvent`: every field but `eventId` (`destination`, `kind`, `category`, `correlation`, `subscriptionClass`, `waitGeneration`, and any `producer` or `requestKey`) | Not read | Accepted and ignored. They do not describe the minted timeout |
| `accept_event.event.waitGeneration` | Not read | Accepted and ignored |
| `dispatch.bound` | Verbatim | Not an identity |
| `scenario.id`, fixture and candidate version strings | Preflight diagnostics | They name the laboratory run, not a Kernel entity |

No runtime meaning is inferred from an ignored field.

### A5.3 J-3's two controls

- **A new input under a used name, after the end.** Accept an input named `n`, cancel, then submit a new input
  under a fresh request key also named `n`. Expected: `ingressRefused: "n"` beside `terminalDispositions`
  holding `n`. No second native Event exists and no ledger entry is made.
- **An exact retry after the end.** Resubmit the accepted input unchanged after cancellation. Expected: the
  Kernel replays, `ingressRefused` is `null`, and nothing changes.

## A6. Criteria and stop conditions

| Check | Closes by |
|---|---|
| D03-CHK-01 | A1's table in the adapter; the listed traces as tests; the oracle's own association check agreeing on every search run |
| D03-CHK-02 | The restated claim in the README and 017 L-39; the first-exposure control |
| D03-CHK-03 | The oracle's six checks; the five rejection controls with honest controls |
| D03-CHK-04 | The asserted counts; the measured time at C in the report; seven registry cases killed by their witnesses in Packet verify |
| D03-CHK-05 | A5 in the README and the candidate's header; J-3's two controls as tests |

The build stops and reports before any patch if the search finds a case the rule does not cover, if a supported
schedule stops passing, if the search exceeds its budget, or if registration needs a packet-tools change. The
verdicts stay 12 PASS and 3 REFUSED. Kernel, fixture and packet tools stay unchanged. No self-acceptance.
