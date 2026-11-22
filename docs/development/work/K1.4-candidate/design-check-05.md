# K1.4-candidate — design check 05

**Verdict: APPROVED WITH REQUIRED CHANGES.** Design 05 supplies a sound answer gate and a feasible
callback-inclusive recorder. Its declared matrix reconciles without using the oracle or the planner's
prototype. Two bounded corrections remain: distinguish the missing-value and report-arity predicates
in the controls, and account for the existing search's typed count fixtures when extending the counts.
Neither requires a different oracle mechanism, a narrower claim, or a production change.

## Identity, authority and access

- Checker: independent Codex desktop session, GPT-6 family as exposed to this session; exact serving
  variant not independently exposed. Date: 2026-11-20. This session did not plan or build the packet.
  No subagents and no planner notes directory (`~/.claude/projects/...`) were used.
- Fresh remote clone of `https://github.com/ArrokothI/arrokothi.git` at
  `/private/tmp/arrokothi-k14-design-check-05`. Branch `codex/k1.4-candidate-design-check-05`
  starts directly at **228732be831e664d3fddf9dd6df9da7ab3465f29**. Nothing was merged; the
  owner's checkout was not changed.
- Subject: [design 05](https://github.com/ArrokothI/arrokothi/blob/228732be831e664d3fddf9dd6df9da7ab3465f29/docs/development/work/K1.4-candidate/design-05.md),
  with [owner choice 06](owner-choice-06.md) and [owner choice 07](owner-choice-07.md), all at that
  commit. The retained portions of design 04 and design 03 addendum 01 were also read.
- Governing [design check 04](https://github.com/ArrokothI/arrokothi/blob/99d411e00049ae87b781a7c1e1008161409ec983/docs/development/work/K1.4-candidate/design-check-04.md)
  was read at **99d411e00049ae87b781a7c1e1008161409ec983**. Governing
  [review 03](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03.md),
  [brief 04](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03/brief-04.md)
  and [oracle-probes.mjs](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03/oracle-probes.mjs)
  were read at **3e86a8c0f7a310c53810f2ced0533165b1844b54**, without merging.
- B: **c1951226338de6ccd3e4e6289259549551268f61**. Reviewed H:
  **ddc53bd132fde4f71bc989ccec7f4d0e430a45dc**. H is an ancestor of the design commit.
  H..design changes six documentation files only. The inspected `identity-lab.ts`,
  `kernel-candidate.ts`, `fake-driver.ts`, `identity-search.test.ts`, and the packages/, scripts/
  and tests/tooling/ trees are identical at H and the design commit.
- Policy: AGENTS.md, 006, 008, 009 and 012. The four numbered policy files have identical blobs at
  B, H and the design commit. Used the architecture and slice-audit skills. Read the development
  front door/baseline, packet scope, and canonical overview/reference, Kernel, Driver, delivery
  reporting and evidence owners. The research map's evidence-tooling material was background,
  not acceptance evidence.

This is a design check under 006/009, not acceptance of H or of an unbuilt correction. PASS below
means the design-level argument was checked. No packet implementation, oracle prototype, dependency
installation, runtime suite, typecheck or Packet verify run was performed. The prototype's reported
passes and timings in §11 are not this checker's evidence.

## Disposition of the requested checks

| Check | Result | Basis |
|---|---|---|
| 1. D04-CHK-01: Table 3/B2 and projection eligibility | **PASS mechanism; required evidence correction** | Every Table 1 slot has an answer rule. A swallowed control refusal reaches `answer` before call-list or Observation checks. Projectable create/input/Outcome refusals continue. Add the missing-value controls in D05-CHK-01. |
| 2. D04-CHK-02: settlement recording, D2 and attribution | **PASS mechanism; required evidence correction** | The supplied-class constructor can wrap the original Driver and every supplied settlement. Entry recording plus nested call/delivery stacks supplies the declared attribution. D2 is complete for the fake Driver's immediate, single, bare `delivered()` contract. Add the isolated arity control in D05-CHK-01. |
| 3. D04-CHK-03: declaration, counts, domains and failed records | **PASS declared matrix and prior isolated dimensions** | 75 cases, 31 N cases, 62 row keys, 26 slots, 3 delivery slots and 2,708 mutations reconcile. The specified writer epoch, five fields, fire kind/generation/Execution, preliminary/final targets and J-1 dimensions are isolated. The new predicates need the additional controls below. §6 stops after one failed record and makes the remainder explicit. |
| 4. Expected codes and oracle independence | **PASS design contract** | Expected codes follow from the declared operators and preconditions, before judgment. No expected code needs an oracle result. The oracle's relation and A1 evaluation use public records, not the adapter's ledger/helpers. |
| 5. L-39 and retained D03/R03 scope | **PASS design contract** | §9 correctly describes the conditional registration-time offer and retention of the string actually assigned. §8 preserves D03-CHK-03 and R03-1/3 and includes callbacks as owner choice 06 requires. It does not promise validation of every argument or every Observation field. |
| 6. §10 and 12 PASS / 3 REFUSED | **PASS with bounded scope correction** | Add the count-type maintenance in `identity-search.test.ts` described in D05-CHK-02. No adapter, fake-Driver, Kernel, fixture or packet-tool change, and no change to 12 PASS / 3 REFUSED, is needed. |

## Answer gate and exits

The twelve rows still have the sequences checked in design check 04: eight two-call kinds, three
three-call kinds (`deliver_timer`, `recover`, `takeover`), and the one-call `inspect` kind: 26 slots.
Table 3 covers their eleven distinct coordinator methods. The other two prototype methods,
`visibleExecutions` and `reportProtocolFailure`, have no permitted slot and fail C.

The answer gate is independent of the adapter's exit. For the swallowed-refusal trace, the known x
reference passes B; the second dispatch's recorded `ok: false` fails B2 as `answer`, whether the
record contains the genuine throw, a subsequent valid inspection/Observation, or just a previous
Observation. Its accepted-dispatch neighbor has a continuing answer and completes the row. The same
argument applies to refused controls, refused/missing inspections, a same-Execution preliminary view
without an Activation, a create/input/Outcome refusal naming no Execution, a non-list pending-timer
answer, and a fire result outside the four listed results. This is an eligibility test, not a
prediction of which answer the Kernel should produce.

The distinctions remain important:

- A projectable creation refusal supplies T from its answer. For input and Outcome refusals T stays
  R, from the oracle's prior relation; a refusal naming y that makes the adapter inspect y fails D
  as `inspection`. M4, M11 and M30 preserve genuine projectable-refusal neighbors.
- A preliminary view of another Execution permits the one-inspection early contradiction, even
  if that other view has no Activation: `viewOf` checks Execution before `openExchange` reads the
  Activation. A preliminary view of R without an Activation instead fails `answer`.
- A final view of another Execution is a whole-row A1 `execution` contradiction, not an early exit.
  A missing call is not a missing *answer*: absent/wrong-position methods stop B2 and let C decide.
- Unknown references still require no calls. B must proceed to C after recognizing the correct
  unknown-reference throw, so insertion into a U record fails `call-extra`.
- The inherited Table 1 distinction remains: retargeting the sole `inspect` operation is `target`;
  retargeting another command's trailing inspection is `inspection`.

Table 3 and B2 therefore remove D04-CHK-01's unsound default. The finite controls do not yet
distinguish every newly stated predicate; that is D05-CHK-01, not a reason to replace this mechanism.

## Recorder, nested attribution and D2

The seam is present in H: `kernel-candidate.ts` constructs its original fake Driver and calls
`new Coordinator({ driver, clock })`; `ExecutionCoordinator` stores that supplied Driver.
The adapter continues to use the original fake Driver's `grantFor`. Forwarding delivery to that
same original Driver preserves its grant store. The Kernel supplies a fresh settlement at each
physical delivery (`coordinator.ts:2719`); the wrapper can retain its delivery owner in a closure
and forward to that exact settlement. No adapter/fake-Driver/Kernel edit is required.

Recording a coordinator call before forwarding, then filling that same entry's answer on return,
fixes H's return-order reversal. Separate nested call and delivery stacks, restored on every exit,
give the promised semantics. For example, an outer call C0/delivery D0, a reentrant call C1/delivery
D1 and its report, followed by D0's report, must record:

```text
call C0
  delivery D0 (call C0)
    call C1
      delivery D1 (call C1)
        report (owner D1, during D1, call C1)
    report (owner D0, during D0, call C0)
```

The nested-order test in §10 must distinguish this from return order and check restoration after
the inner invocation, including an exceptional exit. Such a reentrant control may itself fail C
for an extra coordinator call; recording assertions establish its order separately from that
oracle verdict. A reference to D0's settlement used while D1 is open retains owner D0, rather than
being relabeled D1, and fails `report-delivery`. A saved settlement used outside a delivery fails
`report-extra`. Run-wide delivery numbers distinguish successive deliveries of the same Activation.

D2 first rejects reports outside a delivery, then owner/during mismatch, then wrong method/arity.
After those checks, every remaining report belongs to its current delivery; counting them per
delivery detects both zero and more than one. It need not infer whether dispatch should deliver,
which Execution the Kernel should deliver, or whether the Kernel accepted the report internally.
In particular, the second callback is recorded even when the Kernel's first-report-wins rule makes
it inert. `calls` remains the coordinator-call count; deliveries and reports are separate counts.

This is the deterministic fake Driver's contract. The canonical delivery protocol also permits
late reports and `failed(reason)`; D2 does not redefine those as invalid for real Drivers. The fake
Driver deliberately reports `delivered()` synchronously once, as `fake-driver.ts:49` and the
unit controls in `conventions.test.ts:475` establish.

§8's limits are honest at this scope: five scalar copies do not uniquely identify every inspection;
whole-result/paired-fault comparisons remain separate evidence. Kernel delivery decisions and its
other Driver calls are not inferred by this oracle. The single-constructor test is a regression
guard, not proof against bypasses. The alias limitation refers to bypassing the wrapped methods
(for example invoking an unwrapped base-prototype method); an alias of an already wrapped function
still records. No general unobserved-route guarantee is credited.

Grant attribution is now correct. `submitOutcome`'s grant is an argument, not a callback. In
`ablations.test.ts:291`, the latest-grant adapter passes the same twelve schedules; the subsequent
ABL-2 witness distinguishes it. Encoder tests and fifteen verdict comparisons alone cannot do so.

## Declaration, domains and counts

These quantities were derived from the written schedule and row lengths, with standard-library
Python arithmetic as a cross-check. No case generator or oracle was executed.

| Quantity | Derivation | Result |
|---|---|---:|
| O cases / calls | M1–M17, M29–M30; sum their declared lengths | 19 / 39 |
| X cases / calls | One full row per kind | 12 / 26 |
| P cases / calls | Preliminary inspection of recover and takeover | 2 / 2 |
| U cases / calls | Ten referring kinds, timer twice | 11 / 0 |
| N cases | One per slot, plus G1–G5 | 26 + 5 = 31 |
| N calls | Eight two-slot rows: 8×(1+2); three three-slot rows: 3×(1+2+3); inspect: 1; G calls: 1+1+2+1+1 | 43 + 6 = 49 |
| All cases | 19+12+2+11+31 | 75 |
| Row keys | 12 Observation + 12 contradiction + 10 unknown + 2 preliminary + 26 answer-slot | 62 |
| Coordinator slots | 8×2 + 3×3 + 1 | 26 |
| Delivery slots / O-X occurrences | dispatch@0, redeliver_dispatch@0, takeover@1; each in O and X | 3 / 6 |

| Operator, in §5 order | Independently derived count |
|---|---:|
| Drop | 39+26+2+49 = 116 |
| Replace | 12×65 = 780 |
| Insert | 13×(65+31+2+11) = 1,417 |
| Execution retarget | 65−6 createExecution−3 pendingTimers = 56 = 29 target + 27 inspection |
| pendingTimers argument; fire generation; fire kind | 3 each |
| Exchange Activation; takeover epoch | 4; 2 |
| Other Execution's final inspection/Observation | 19−3 sole-inspect cases = 16 |
| One copied field | 5×19 = 95 |
| Wrong exit | 19×3 + (12+2)×3 + 11×2 = 121 |
| Two swallow operators | 31 each |
| Five report operators | 5×6 = 30 |
| **Total** | **2,708** |

The domains make the codes decidable without consulting the oracle:

- In N, a drop either removes the failing answer or shifts a different method into its position.
  In every included class the shortened sequence is a proper subsequence of the selected list;
  this includes the one-call P records.
- Equal-length replacements in O/X stop positional classification at their changed method and fail
  C as `call-method`. Insertions have continuing donors, except the deliberately chosen y inspection
  at x's preliminary slot, which selects the one-call early list; that list is still a proper
  subsequence of the inserted sequence. P insertions occur only at the end, and U insertions face
  the empty expected list. Both forbidden-method donors are explicitly constructed.
- Retargeting excludes createExecution and pendingTimers. It changes arguments, not the recorded
  answers that choose B2's list. Preliminary-target mutations therefore reach D, and final-target
  mutations reach the intended D code. pendingTimers arity has its own operator.
- N/P/U exclusions from replacement and broad insertion avoid interacting failures whose first
  code would no longer be the table's single uniform code. The exclusion's phrase “depend on the
  oracle” should be understood as depending on the changed selection/preconditions, not permission
  to discover an expectation from a run. No included case needs that shortcut.
- The five copied-field mutations each change only one field to a distinct value. The exchange
  epoch, fire kind/generation/Execution, four preliminary targets, 27 trailing targets and two
  live J-1 refusal families distinguish their own predicates.

The 62 keys are coarse command/exit rows, not 62 distinct answer classifications or A1 codes.
Existing association, replay, payload and first-exposure controls remain necessary. The new named
controls required below are additional evidence, not a retroactive recount of these 2,708 mutations.

§6's first-failure policy is sound: a failing record makes the run non-clean, later records are
`unjudged`, and they cannot supply relation state or count as successful continuation. The omitted
list control consequently has one `shape` failure and one unjudged successor. Legal contradictions
and unknown-reference exits remain judged exits, not failures that truncate an otherwise legal run.
Each mutation's passing prefix and `unjudged: 0` assertion prevent a failed earlier record from
being credited as detection of the intended mutation.

## Required bounded corrections

### D05-CHK-01 — P2: distinguish missing values and report arity in the controls

**Location:** design 05 Table 3, §3 D2/live controls, §4 A1–A26, §5 report operator and isolated
dimensions. Governing obligations: D04-CHK-01's missing/refused-inspection classes, owner choice 06's
control-per-answer-class instruction, and D04-CHK-03/012's distinguishing-predicate requirement.

The rules are correct, but two finite predicates can be omitted while the specified controls
still give their expected codes:

1. Every A-slot inspection fault is a refusal. G4/G5 supply an actual view with no Activation.
   None supplies an accepted inspection answer with its view absent. Similarly, the create/input/
   Outcome A faults exercise refusals naming no Execution, not `ok: true` without a value.
   An implementation that tests refusal alone can pass those controls but dereference a missing
   value, or report `exit` instead of the required `answer`. An oracle exception is not a kill.
2. `failed("lab")` changes both method and arguments. An implementation that checks only
   `method === "delivered"` and forgets the zero-argument predicate rejects every specified report
   mutant but accepts `delivered("lab")`. The Kernel ignores that extra argument, so ordinary
   result comparisons do not supply the missing discrimination.

**Required outcome:** add named, independently expected controls in the allowed test files:

| Control | Required result |
|---|---|
| A required createExecution/submitInput/submitOutcome answer changed to `{ ok: true }` | `answer`, with the complete valued answer as its passing neighbor |
| A preliminary recover/takeover inspection, a trailing inspection, and the sole inspect-command answer changed to `{ ok: true }` or `{ ok: true, value: null }` | `answer`; exercise absent and null views, without dereferencing either |
| Those answer faults after the adapter throws, and with a plausible prior/genuine Observation substituted and the throw cleared | Still `answer`; no successful Observation/contradiction count and no exception credited as rejection |
| A correct in-delivery report retaining method `delivered`, owner, during and call, but receiving one argument | `report-method`; bare `delivered()` is its passing neighbor |

The report control can use the settlement hook to forward `delivered("lab")` beneath the recorder,
or splice just the recorded argument list. Preserve the other report fields, so it distinguishes
arity alone. These tests implement already-written rules. Keep the declared 75-case/2,708-mutation
matrix intact and report these named controls separately; no new design round or count adjustment
from observed oracle output is needed.

### D05-CHK-02 — P2: include the existing search's count-type maintenance in §10

**Location:** design 05 §10 and H's `identity-search.test.ts:122`, `:272`, `:378`, `:391`.

The search imports `OracleCounts`. `CalibrationE.counts` has that type, but the calibration seed
at line 272 explicitly supplies only the five old fields. The totals object at line 378 also has
those five fields, while line 391 indexes it with `keyof OracleCounts`. Extending that interface
with required `calls`, `deliveries`, `reports` and `unjudged` therefore requires maintaining these
consumers: the seed is incomplete and the key union is wider than the totals object. The root
tsconfig includes tests and enables strict checking. This is a source/type dependency, not a
claimed observed compiler run.

**Required outcome:** include `tests/conformance/k0-candidate/identity-search.test.ts` in the
build's explicit file scope for this mechanical adjustment. Supply complete zero counts where
the full count type is required, and type the aggregation keys against the fields actually being
aggregated (or deliberately initialize/aggregate the full count object). Do not make required
counts optional, weaken typechecking, or change the search to accommodate the new oracle.

Keep its skeletons, domains, 3,282 + 344 + 500 = 4,126 runs, existing exit/Observation totals and
fault-site assertions unchanged. Check the resulting types and run the same search during the
normal build validation. This is within the already authorized test-side correction, but it is
one file beyond §10's positive edit list and should be named rather than silently worked around.

## Preserved claim, L-39 and handoff

The independent oracle still derives pre-command references itself, checks all permitted
coordinator calls and their designated inspections, evaluates A1 from recorded answers, checks
shape and both directions of the identity relation, and checks first naming. The lab necessarily
constructs the candidate; that does not authorize the Oracle logic to use its factory, ledger,
translation or expected-result helpers. Only the two error classes are shared for recognizing
the declared exits. Code review at the next H must enforce that separation.

The four review-03 probes retain `inspection`, `call-method`, `call-extra`, `call-extra`. The five
D03 controls retain `shape`, `target`, `exit`, `relation`, `exit`, with §6's explicit unjudged
successor on the first control. The corrected five-field claim and the separate whole-result /
paired-fault checks preserve the original obligation; they do not claim full inspection provenance.
Adding settlement reports satisfies owner choice 06 rather than selecting the rejected
coordinator-only alternative. D03-CHK-03, R03-1 and R03-3 can close on a conforming build and its
independent review; they are not retrospectively marked implemented at H by this design check.

§9's L-39 replacement matches `submit` and `Ledger.assign`: offer the label at the registration
answer only when that generation took its offered name; an occupied label falls back; an
unannounced first exposure gets a fresh string; an already assigned ID retains its actual string,
including a fallback. A1 checks the answer/inspection association. The first-exposure limitation
and fixture-revision root fix remain. K14C-R03-02 needs no behavior change.

After D05-CHK-01/02, R04-1..3 have a finishable design and evidence plan. R04-4 remains the full
cumulative build/review obligation: 12 PASS / 3 REFUSED, ABL-1..5 and latest-grant, seven identity
mutants, the 4,126-run search, preserved review witnesses and exact-C verification plus C/H/base
scope checks. No change to owner choices 01–04, D01-CHK-04's K2/E2 deferral, unread holds or
`semantic_credit: none` follows. No production, fixture or packet-tool correction was found
necessary. No Layer-3 semantics change is proposed.

Checks performed: exact-commit and ancestry/blob inspection; all adapter command arms and their
projection/refusal/open-exchange helpers; recorder, Driver, Kernel delivery/settlement and grant
paths; governing probe/control bodies; symbolic B2/C/D/D2/E traversal; independent declaration
arithmetic; count-type consumer inspection; review-file diff and link checks. No third-party
source, dependency, asset or service integration was incorporated.

Only this design-check record is added. Under owner choice 07, this verdict takes the ordinary
owner-disposition-then-build route; the refined-finishable-claim fallback is not triggered. The
two required corrections are bounded build changes, not a request for design 06. This grants no
packet acceptance, merge, E1 result or successor release.

APPROVED WITH REQUIRED CHANGES
