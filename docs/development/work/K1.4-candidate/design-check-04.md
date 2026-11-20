# K1.4-candidate — design check 04

**Verdict: NOT APPROVED.** The command/inspection joins are a sound correction of the four
review-03 examples, but the written exit rule still accepts a swallowed control refusal. The
matrix's declared domain and counts disagree, and the “every call” claim exceeds its recorder.
Resolve D04-CHK-01..03 below in the design before building. These are design/evidence findings,
not newly demonstrated defects in the candidate adapter or Kernel.

## Identity, authority and access

- Checker: independent Codex desktop session, GPT-6 family per the exposed session identity;
  exact serving variant not independently exposed. Date: 2026-11-20. This session did not plan
  or build the packet. No subagents or planner notes directory (`~/.claude/projects/...`) were used.
- Fresh remote clone of `https://github.com/ArrokothI/arrokothi.git` at
  `/private/tmp/arrokothi-k14-design-check-04`. Review branch
  `codex/k1.4-candidate-design-check-04` starts directly at design commit
  **06e60dd81921946094a6f2323ec8831d61308320**. Nothing was merged; the owner's checkout was not changed.
- Subject: [design 04 at that commit](https://github.com/ArrokothI/arrokothi/blob/06e60dd81921946094a6f2323ec8831d61308320/docs/development/work/K1.4-candidate/design-04.md).
  B: **c1951226338de6ccd3e4e6289259549551268f61**. Previous reviewed H:
  **ddc53bd132fde4f71bc989ccec7f4d0e430a45dc**. H is the design commit's sole parent;
  H..design changes only design-04.md, progress.md and 007. The inspected implementation is H's.
- Governing [review 03](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03.md),
  [brief 04](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03/brief-04.md),
  [owner choice 05](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03/owner-choice.md)
  and [oracle-probes.mjs](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03/oracle-probes.mjs)
  were read by exact commit **3e86a8c0f7a310c53810f2ced0533165b1844b54**, without merging.
  Choice 05 authorizes redesign and a new design check, not a narrower claim.
- Policy: AGENTS.md, 006, 008, 009 and 012; the four numbered policy files have identical Git
  blobs at B and the design commit. Used the architecture and slice-audit skills. Read the
  development front door/baseline, packet scope and prior design/check dispositions. Canonical
  ownership was traced through the overview/reference to Kernel, Driver, identity, execution-cycle
  and evidence. The research map's evidence-tooling material was background, not acceptance evidence.

This is a design check under 006/009. PASS below means a design-level argument was checked; it does
not certify an implementation or rerun previous acceptance. The planner's uncommitted prototype,
2,470 results and timings were not available as pinned evidence and are not this checker's results.

**Owner decision in this check, 2026-11-20.** Asked whether the oracle should judge settlement
callbacks or accept a coordinator-method-only limit, the owner answered verbatim:

> Judge settlement callbacks too (recommended)

This selects the callback-inclusive correction in D04-CHK-02. It does not approve the unbuilt
recording design, waive any finding, or authorize a Kernel/fixture/tool change.

## Coverage and answers to the six requested checks

| Check | Result | Answer |
|---|---|---|
| 1. Twelve kinds, exits, four probes and five D03 controls | **FAIL as a complete rule** | All twelve normal coordinator sequences are correct, and all nine named controls have the stated first failure. Table 2's unconditional “Otherwise” admits a swallowed refusal: D04-CHK-01. |
| 2. Three joins without predicting Kernel state | **PASS for the stated projections** | Independent pre-command references, recorded answers and final-view equality close the wrong-Execution join. Five fields do not uniquely identify every view or prove provenance of an entire Observation. |
| 3. Every public call / callback boundary | **FAIL as claimed; owner selected inclusion** | Settlement methods enter the Kernel outside the recorder and must now be judged. SubmissionGrant is a recorded argument, not another entry call. D04-CHK-02 requires the missing recording and judgment design. |
| 4. 2,470 traces, 36 rows / 26 slots, J-1..3 | **FAIL as specified** | Finite and potentially useful, but the insertion domain gives a different count, pendingTimers has no Execution to retarget, and required dimensions lack distinguishing controls: D04-CHK-03. |
| 5. D03-CHK-03, R03-1/3 and L-39 | **FAIL overall; L-39 correction sound in substance** | The joins preserve the identity obligation. Exit completeness and callback coverage remain incomplete. The registration-time conditional offer is the right L-39 correction; retain the assigned string, including a fallback. |
| 6. Work outside §7 / matrix change | **PASS at design level** | No Kernel, fixture or packet-tool change, ledger repair, or 12 PASS / 3 REFUSED change is needed. The review requires a revised design and test-side evidence. A callback extension needs its own explicit recording plan before build. |

### Command and exit traversal

I compared every `apply` arm and `submit`, `observeRefusal`, `openExchange` and `observe` with Table 1.
Here `I` is the final inspection; `P` is a preliminary inspection. Counts expand the grouped rows
into the twelve actual command kinds.

| Kind | Full coordinator sequence | Slots |
|---|---|---:|
| create | createExecution, I | 2 |
| create_retry | createExecution, I | 2 |
| accept_event | submitInput, I | 2 |
| dispatch | dispatch, I | 2 |
| redeliver_dispatch | redeliver, I | 2 |
| submit_outcome | submitOutcome, I | 2 |
| resubmit_outcome | submitOutcome, I | 2 |
| accept_cancellation | cancelExecution, I | 2 |
| deliver_timer | pendingTimers, fireTimer, I | 3 |
| recover | P, recoverExecution, I | 3 |
| takeover | P, requestTakeover, I | 3 |
| inspect | I | 1 |
| **Total** | | **26** |

The prescribed targets are correct: create/retry take T from their answer; other kinds use R from
the prior relation; fire also uses G and `kind: "wait_deadline"`; recover/takeover take the exchange
from P, with writerEpoch additionally required for takeover. The final inspection is positional,
not whichever inspection happens to be found last after extra calls have been ignored.

Unknown Execution references, and a known Execution with an unknown timer generation, have the
empty sequence. A contradictory preliminary Execution view permits only P. A final A1 contradiction
uses the complete row. An ordinary successful projection uses the complete row. These cover the
legal exits declared for E/X. Refused controls, refused inspections, missing open exchanges and
unprojectable answers remain failures, not additional successful search exits. D04-CHK-01 explains
why the latter distinction must depend on the recorded answer, not only on whether an error escaped.

### The nine existing rejection controls

These are symbolic applications of A–G to the pinned probe/control bodies, not executions of an
unbuilt oracle. Each honest neighbor has the prescribed sequence, targets, answer/view association,
exit and identity projection, so the new rules give it no failure.

| Broken control | First failure | Why |
|---|---|---|
| dispatch-x-observe-y | D: inspection | I's argument is native y, while R is native x. |
| wrong-primary-method | C: call-method | cancelExecution replaces dispatch at equal sequence length. |
| extra-cancellation-after-dispatch | C: call-extra | The expected dispatch/inspect list is a proper subsequence. |
| extra-cancellation-before-declared-throw | C: call-extra | The full fire row is a proper subsequence even though the final exit is a contradiction. |
| Omitted Event-list suffix | G: shape | Length is checked before pairing; the five copied scalars are unchanged. |
| Reference sent to another Execution | D: target | This control changes the inspect command's sole operation, not just a trailing I. |
| Known displayed fresh reference refused as unknown | B: exit | The independent prior relation resolves it. |
| Changed established ID printed under its old string | G: relation | Scalars and shape agree; the old string already denotes another native ID. |
| Answer-only contradiction returns the previous Observation | E: exit | A1 requires timeout_generation before F compares the returned Observation. |

For the multi-record omitted-list control, preserving its complete expected code set also depends
on the failed-prefix policy described in D04-CHK-03. The table identifies the first offending record;
it does not assume that short-circuiting G leaves the later reference relation unchanged.

### The joins and J-1, J-2, J-3

**J-1: agree.** For refused input/Outcome commands T remains R. Kernel `submitInput` and
`submitOutcome` look up that destination before constructing a record-bearing refusal. A fault
that names another Execution makes the adapter inspect that Execution and D rejects it. Add a
direct control for each command family and its correct-R neighbor; there is no need to change the
adapter to throw a new contradiction for this unobserved Kernel behavior. Creation has no prior
reference: its answer is necessarily the source of T. This does not certify that the Kernel minted
the intended opaque identity before first exposure.

**J-2: agree with a precise limit.** Comparing state, progressRevision, activationId, writerEpoch
and acceptedDeadline to the successful final inspection is copying with the documented defaults,
not a Kernel simulator. Pairing the identity positions with that same view closes the represented
Execution/Event/generation associations. Read the answer of the designated inspection, never
`StepRecord.view`, and reject a missing/failed inspection rather than dereferencing it unchecked.

These fields do **not** uniquely pin a complete inspection. For example: create x, dispatch x,
then recover x with `availableDefinitionRevisions: []`. Recovery adds a code-availability hold;
state, progressRevision, activationId, writerEpoch, acceptedDeadline and the translated identity
lists need not change. Returning the preceding Observation loses `recoveryHold` but passes F/G.
That is within §6's explicit non-identity-field limit, not an identity-rule counterexample.
Replace “the Observation must be that view's” / “these five fields pin one inspection” with equality
of the enumerated projections. Preserve D03's whole-result fixture comparison and paired fault-run
comparison of every other field. Do not credit an unrelated state/receipt change as identity detection.

**J-3: agree.** A deterministic first failing step is useful. Expected codes must be assigned from
the declared mutation and its preconditions, before invoking the oracle. For an unknown-reference
record with the right throw but an inserted call, B must continue to C's empty expected list:
`call-extra`. Retaining H's early return on that branch would defeat the intended sequence check.
Make the early-exit list selection positional and safe when P is absent or malformed. An oracle
exception is a failed test, never a rejection credited to a mutant.

## Required corrections

### D04-CHK-01 — P2: reject swallowed fail-visible answers

**Location:** design 04 §4 Table 2, “An Observation … Otherwise,” and step E.
**Sources:** the retained design-01 addendum §A8; adapter
[`kernel-candidate.ts:622`](../../../../tests/conformance/k0-candidate/kernel-candidate.ts#L622);
[`conventions.test.ts:387`](../../../../tests/conformance/k0-candidate/conventions.test.ts#L387),
“a refused dispatch throws; it is never shown as unchanged state.”

A concrete broken trace survives every written step:

1. Create x and dispatch x successfully. Keep these records as the prefix.
2. Dispatch x again. The genuine answer is `ok: false`, `exchange_unresolved`; the adapter throws.
   Kernel source at H is `coordinator.ts:1295–1302`.
3. Inspect x through the genuine laboratory. Form a broken second-dispatch record from the refused
   dispatch call followed by this inspection, returning that inspection's Observation and clearing
   the thrown error. This models an adapter swallowing the refusal and calling `observe(x)`.

Reproduction recipe using H's existing laboratory, with no new oracle implementation:

```js
const lab = startLab();
lab.apply(createCommand("x", "kx"));
lab.apply(dispatchCommand("x"));
const prefix = [...lab.records];
const refused = lab.attempt(dispatchCommand("x"));
const inspected = lab.attempt({ kind: "inspect", executionId: "x" });
const broken = {
  ...refused,
  calls: [...refused.calls, ...inspected.calls],
  view: inspected.view,
  observation: inspected.observation,
  thrown: undefined,
};
// Apply design 04 A–G to [...prefix, broken].
// Control: the initial successful dispatch is a legal Observation;
// refused itself must remain a reported failure, not a successful search case.
```

A resolves x; B sees no unknown-reference throw; C sees exactly dispatch/inspect; D sees R twice.
The final view describes R and all retained input associations agree, so A1 gives no contradiction.
Table 2's “Otherwise” therefore accepts the Observation at E. F copies the five fields correctly;
G sees the same established identities, shapes and names. The adapter behavior is wrong even though
the proposed oracle accepts it. This is distinct from changing the primary method or inserting a
third call, and is not covered by the four review-03 controls.

**Required outcome:** define successful-projection eligibility from the actual recorded answer.
An unprojectable answer must make the record fail even when a broken adapter supplies a plausible
Observation. Enumerate the finite answer predicates: refused dispatch/redelivery/cancellation/
recovery/takeover; missing or refused required inspection; no preliminary open exchange; a refusal
with no Execution where projection needs one; and an unsupported fire result. Keep projectable
create/input/Outcome refusals distinct. This checks an answer's discriminant, not whether the Kernel
ought to have refused. Specify precedence with C/D/E and a deterministic failure code.

**Closure:** add the swallowed-refusal trace and an accepted dispatch neighbor, plus representative
controls for the other answer/inspection classes above. Assert both that genuine fail-visible
records are reported as failures and that swallowing them cannot turn them into a pass. They must
not inflate the count of successful Observations or declared legal contradictions. Update Tables
1–2/steps and the corpus before deriving the new counts.

### D04-CHK-02 — P2: settle the public-call claim and correct evidence attribution

**Location:** §2's “calls the Kernel only through that instance,” its one-constructor/prototype
structure test, and §6's “every call” / “None of these is a guarantee H claimed.”

`fake-driver.ts:49–55` calls `settlement.delivered()`. Kernel `coordinator.ts:2731–2740` implements
the settlement object's methods as closures calling `settle` and then the state owner; they are
not methods on `ExecutionCoordinator.prototype`. Enumerating all thirteen prototype methods and
finding exactly one constructor cannot observe them. The canonical
[delivery-reporting boundary](../../../../mental-model/mechanisms/execution-cycle.md#delivery-reporting-boundary)
explicitly separates these reports from coordinator Outcome submission.

Replace the fake Driver's delivered report with no report or with `failed("probe")`: delivery
evidence differs, but the coordinator list, A1 associations, five copied fields and identity pairs
can all agree. A–G cannot distinguish these traces. The existing fake-Driver unit controls are
separate evidence; their existence does not make a settlement call part of this recorder.

**SubmissionGrant is different.** It has no callable method. The adapter obtains a grant from
`driver.grantFor` and passes it as `submitOutcome`'s third argument (`kernel-candidate.ts:534–549`).
That submission is already in Table 1. The oracle deliberately does not validate grant selection;
no new callback row is needed for it. Its exclusion may remain a declared argument limit, but §6
misattributes its coverage: `ablations.test.ts:291–320` explicitly demonstrates a latest-grant
adapter that passes all twelve schedules and is distinguished by the ABL-2/latest-grant witness.
Encoder tests plus the fifteen whole-result comparisons are not sufficient grant evidence.

The historical A3 recorder explicitly said **coordinator calls**. Thus the old identity oracle did
not prove all callback behavior. Conversely, brief 04 asks for permitted public calls and design 04
now asserts **every call** and no remaining gap. Treating those as interchangeable silently chooses
the disputed scope. As an unqualified public-entry claim, §6 is a narrowing, not proof that the
claim is retained. A coordinator-only claim can be honest if its limits and separate Driver/grant
evidence are stated and the owner approves that disposition.

**Owner disposition:** the owner selected “Judge settlement callbacks too (recommended)” in this
check chat, as recorded above. A coordinator-only limit is therefore not the selected solution.
This resolves the choice reserved by brief 04 R04-3 and design 04 §6; it does not broaden production
scope. The callback-inclusive design must preserve D03-CHK-03, R03-1/3 and R04-1/3.

**Closure:** specify how the lab wraps the supplied Driver/settlement capabilities,
attributes each report to its delivery and enclosing command, and records nested order. H records
coordinator calls after return, so merely appending callback entries to that flat list reverses the
enclosing-call order. Include missing, extra, wrong-settlement-method and wrong-delivery controls
with honest neighbors; compare recorded deliveries/reports without predicting Kernel state.
Define whether `calls` counts coordinator invocations, settlement reports or both, and update the
row/slot coverage accordingly. Retain the fake-Driver tests and latest-grant witness, correct the
grant evidence attribution, and remove the false exclusive-route claim. Describe the lexical
structure guard as a regression guard under 012, not
a sound proof against other call routes or aliases.

### D04-CHK-03 — P2: make the matrix specification reproducible and discriminating

**Location:** §5.3 and R04-2's 2,470 / 36 / 26 closure claim.

The aggregate arithmetic exposes an exact domain mismatch:

| Quantity derived from the written plan | Count |
|---|---:|
| Unknown-reference cases: ten referring kinds, timer twice | 11 |
| Observation cases in the 30-command run | 19 |
| Whole-row cases: 44 minus 11 unknown minus 2 early | 31 |
| Whole-row call occurrences: 780 replacements / 12 alternatives | 65 |
| Drops including the two early preliminary inspections | 67 |
| Insertions as written: (65 calls + 31 whole-row positions-at-end + 2 early ends) × 13 | **1,274** |
| Additional insertions if all eleven empty unknown cases are included | **143** |
| Insertions with that additional domain | **1,417** |
| Wrong exits: 19 × 3 + 14 × 3 + 11 × 2 | 121 |

The published row totals sum to 2,470, but using its stated insertion domain gives **2,327** before
other corrections. Include the unknown cases explicitly if 1,417 is intended; they are valuable
tests of zero calls before UnknownLaboratoryReference. Do not merely change a count to whatever
the oracle or generator happened to accept.

The Execution-retarget operator also needs a precise domain: “every call but createExecution”
includes `pendingTimers`, which has no target or arguments. Retargeting it is not an Execution
retarget. Exclude it or declare a separate unexpected-argument/arity operator and its rule. The
32 + 27 total cannot substitute for that specification.

Finally, visiting a slot is weaker than exercising its predicates. The current list changes
recover/takeover Activation but does not separately change takeover writerEpoch, although D checks
both. Nor does “previous Observation where a verbatim field differs” guarantee a negative test for
each of the five fields. A checker that omits one equality may still reject all three selected
stale Observations because another field changed.

**Required outcome and closure:**

1. Publish the actual ordered 30-command schedule and the fourteen fault placements, identifying
   each case's prefix, expected exit/reason and row key independently of the oracle. State which
   inspection is faulted in recover/takeover. Provide declared row/slot sets rather than infer the
   denominator from whatever the run reaches. 36 is a count of coarse command/exit classes, not
   all answer outcomes or A1 codes; retain the existing association-fault tests for those codes.
2. Correct the insertion and target domains, then regenerate/assert counts from that declaration.
   Preserve unknown-reference insertions and document the early-method/insertion exclusions.
   The two constructed forbidden-method donors are sufficient for method-list tests; describe
   them as constructed records, not genuine calls. More traces may be needed after D04-CHK-01/02.
3. Add isolated negative/positive controls for takeover writerEpoch and each of F's five fields;
   also pin fireTimer's kind and both preliminary/final targets. Keep J-1's wrong-refusal-destination
   controls. These are finite independent dimensions of Table 1/F, not a request for state-space
   simulation or a custom analyzer.
4. Assert that every pristine control passes its declared legal exit before mutation, that each
   operator changes its intended dimension, that the advertised number of mutations actually
   reaches judgment, and that exactly the externally assigned code is returned. No oracle imports
   of adapter translation helpers or ledger; no expected code copied from the oracle result.
5. Specify the relation/count policy after a failed record. The unchanged omitted-list control
   tampers with the create Observation and then accepts another input to x. H still learns the
   valid Execution pair while reporting the list-shape defect. An implementation that now returns
   immediately from G before learning x reports an additional `exit` on the next command, contrary
   to the promised unchanged control/code set. Preserve the intended diagnostic contract explicitly;
   do not silently treat a truncated run as complete or use a failed prefix as pristine evidence.

The 36-class / 26-slot coordinator component is finishable and can be non-vacuous **after** these
corrections; it is not the complete coverage denominator once callback and failure predicates are
added. A few thousand short record splices is a reasonable finite plan; prototype timings remain
unverified capacity claims. Build-time results must report the actual count and environment.
Existing E/X totals (3,282 + 344 + 500 = 4,126) are a separate search and need not change.

## L-39, preserved scope and handoff

The proposed L-39 correction addresses K14C-R03-02: the label is an **offer at the registration
answer**, conditional on the generation having taken its offered name, checked against the
inspection's association. An occupied offer or a newly exposed unannounced timeout gets a fresh
string. Keep the within-run first-exposure limitation. When editing the remaining “timeout keeps
it” phrase, say that it keeps **the string actually assigned**, including a fallback; it cannot
keep a rejected label. An already named ID retains its string rather than acquiring a fresh one
on each rendering. No convention change is needed.

The required corrections belong to the test-side laboratory, oracle, tests and current claims.
There is no evidence requiring a change to the Kernel, fake Driver's intended behavior, adapter
ledger, fixture scenarios/runner/oracle, or packet-tool implementation. A recording wrapper can
be designed inside the laboratory's existing constructor seam; its feasibility is not approval of
an unspecified callback protocol. Update the design before touching code and stop if the selected
solution requires expanding §7. No change to the **12 PASS / 3 REFUSED** capability matrix follows
from these evidence corrections.

Keep all prior owner choices, ABL-1..5/latest-grant, seven identity mutants, review-01/02 collision
witnesses, four review-03 probes, five D03 controls, association/replay/payload checks, first-exposure
control, ingressRefused/exact-retry controls and eventIdentity refusals. D03-CHK-03 and R03-1/3 cannot
be marked closed by the current design; R04-4 remains the cumulative build/review obligation.
No new disposition of D01-CHK-04, K2/E2, unread holds or semantic_credit none is authorized.

Checks performed: pinned source/policy/ancestry inspection; all twelve command arms and their
helpers; original four probe bodies and five maintained controls; symbolic A–G evaluation;
callback/grant call-path inspection; independent arithmetic using Python's standard library;
review artifact diff and link checks. No candidate/prototype was built, no dependency installed,
no runtime suite or Packet verify run performed, and no third-party source/dependency incorporated.
The counterexamples above are reproducible substitutions into the pinned records/design, not
claims to have executed an unavailable design-04 oracle.

Only this design-check record is added. The owner requires callback judgment; the concrete
exit/matrix defects also require revision. A corrected design must dispose
these findings and return for design checking before implementation. This grants no packet
acceptance, merge, E1 result or successor release.

NOT APPROVED
