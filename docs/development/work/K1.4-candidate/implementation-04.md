# Implementation report — K1.4-candidate, round 4

The identity oracle's redesign after independent review 03. Rounds 1 to 3 are
[implementation report 01](implementation-01.md), [02](implementation-02.md) and [03](implementation-03.md); this
report covers what changed since round 3's candidate and does not repeat what stands.

## Identity

- **Packet:** K1.4-candidate. Records for this round:
  - [review 03](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03.md),
    CHANGES REQUIRED of H3 `ddc53bd132fde4f71bc989ccec7f4d0e430a45dc` (Codex GPT-6, `codex/k1.4-candidate-review-03`
    at `3e86a8c0f7a310c53810f2ced0533165b1844b54`). It closes K14C-R02-01 and opens K14C-R03-01 (P2) and K14C-R03-02
    (P3). 006's stop-and-redesign rule fired. Owner choice 05, "Redesign the oracle's command/call/inspection checks,
    with a new design check (recommended)"
    ([record](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03/owner-choice.md));
    [brief 04](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03/brief-04.md)
    governs;
  - [design 04](design-04.md) at `06e60dd81921946094a6f2323ec8831d61308320`;
  - [design check 04](https://github.com/ArrokothI/arrokothi/blob/99d411e00049ae87b781a7c1e1008161409ec983/docs/development/work/K1.4-candidate/design-check-04.md),
    NOT APPROVED, D04-CHK-01..03 (Codex GPT-6, `codex/k1.4-candidate-design-check-04` at
    `99d411e00049ae87b781a7c1e1008161409ec983`);
  - [owner choice 06](owner-choice-06.md), "Judge settlement callbacks too (recommended)", and
    [owner choice 07](owner-choice-07.md), "Yes, set stop rule";
  - [design 05](design-05.md) at `228732be831e664d3fddf9dd6df9da7ab3465f29`;
  - [design check 05](https://github.com/ArrokothI/arrokothi/blob/44d9091f6db6d1f382841cd822befcd80e374f7b/docs/development/work/K1.4-candidate/design-check-05.md),
    APPROVED WITH REQUIRED CHANGES, D05-CHK-01 and D05-CHK-02 (Codex GPT-6, `codex/k1.4-candidate-design-check-05` at
    `44d9091f6db6d1f382841cd822befcd80e374f7b`). Owner choice 07's stop rule did not fire. The owner's instruction of
    2026-11-21 took the ordinary route and opened no new owner choice;
  - [design 05 addendum 01](design-05-addendum-01.md), which disposes the two required changes.

  The review, the brief, the probes and both design checks were read by commit. Nothing was merged from those
  branches. Process: [006](../../006-development-process.md), [008](../../008-implementation-report.md),
  [012](../../012-review-methods.md), [017](../../017-known-limitations.md).
- **Release and prerequisite:** [release 01](release-01.md). K1.4 is accepted and integrated in B (`eb8472e5`,
  PR #67).
- **Implementer:** Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), on the owner's Mac (arm64, Apple M1,
  8 cores). It wrote designs 04 and 05 on 2026-11-20, and the addendum, C and this H on 2026-11-21. It is the session
  that built rounds 1 to 3, on Claude Fable 5.2 until round 3's H. Node v26.10.0, npm 11.19.1, Python 3 and `gh`. It
  used no subagents. It is not the planner, the design checker or the reviewer.
- **Branch:** `claude/k1.4-candidate`.
  - Base B: `c1951226338de6ccd3e4e6289259549551268f61`, main after PR #69.
  - Reviewed candidate: H3 `ddc53bd132fde4f71bc989ccec7f4d0e430a45dc` over C3
    `41bd3aaa5cf83c51e93d41da567558d34f943410`.
  - Round-4 records: `06e60dd81921946094a6f2323ec8831d61308320` (review 03 in 007, design 04) and
    `228732be831e664d3fddf9dd6df9da7ab3465f29` (design check 04 in 007, owner choices 06 and 07, design 05).
  - Payload C: `848b1957ae9e598bb256712c07a3cc22c39fbaf7`, which also adds the addendum.
- **Candidate H:** the commit containing this report. C..H changes exactly the spec's administrative allowlist:
  this report, the 007 row and `progress.md`.
- **Push:** C was pushed before the CI dispatch. H is pushed after this report is committed; its SHA goes in the
  external handoff.

## Changes (H3 `ddc53bd1`..C)

`packages/`, `scripts/`, `tests/tooling/`, `package.json`, `package-lock.json` and `tsconfig.json` are
byte-identical to B: **no Kernel source and no packet tool changed**, and no dependency was added. Unchanged since
H3: the adapter `kernel-candidate.ts` with its ledger, `canonical-json.ts`, `fake-driver.ts`, the ablations and
the latest-grant witness, the identity mutants, witnesses and probe, the registry data under `tests/fixtures/`, and
the fixture under `tests/conformance/k0/`.

| Group | Files |
|---|---|
| **The laboratory.** Its coordinator subclass records each call of the coordinator's 13 own methods when the call starts, at any depth. It wraps the Driver it is constructed with, so it also records each delivery and each settlement report when it starts, in nested order, with the delivery and the call it belongs to. Records gain `deliveries`, `reports` and an entry-order `trace`. `Tamper.delivery` replaces design 05's `Tamper.settlement` (addendum §A3) | `tests/conformance/k0-candidate/identity-lab.ts` |
| **The oracle.** Table 1's rows (26 slots), Table 3's answer classes, and steps A to G with B2 and D2. New counts: `calls`, `deliveries`, `reports` and `unjudged`. The first failing record stops judgment of its run | `identity-lab.ts` |
| **The joins and their controls.** Review 03's four probes as rejecting controls; the swallowed-refusal trace; J-1's live controls; the failed-record control; the live settlement controls; the nested-order and reentrant recording tests; the 13-method census. The structure test is now labelled a regression guard. The counts test gains the new fields | `identity.test.ts` (67 → 78 tests) |
| **The declared matrix.** Design 05 §4's 75 cases and declared sets. §5's operators, with their counts and codes written before the oracle runs. Addendum §A1's eleven missing-value controls and its arity control | `identity-oracle.test.ts` (new, 15 tests) |
| **The search's count types.** A complete zero `OracleCounts` for the calibration seed and for skeleton X's totals (addendum §A2) | `identity-search.test.ts` |
| **Claims and guards.** The README's oracle paragraph, timeout-label bullet and file table; 017 L-39 (K14C-R03-02); one boundary-list entry; one mapping row | `README.md`, `boundary.test.ts`, `docs/development/017-known-limitations.md`, `tests/conformance/legacy-mapping.json` |
| **Packet records and spec.** Designs 04 and 05, the addendum, owner choices 06 and 07, the 007 row and `progress.md`. In the verification spec: the administrative file, the round-4 limits, and the repository-test minimum raised from 5,296 to 5,322 | `docs/development/work/K1.4-candidate/`, `docs/development/007-work-packets.md` |

**Ownership.** The test-side laboratory and oracle, their evidence and the current claims. No Kernel, Runtime,
Driver or deployment semantics change.

**012 methods.** Deterministic execution with controlled fakes, plus "oracles are claims too": design 05 §8 states
what the oracle checks, the exits it accepts and what it does not judge. The mutation matrix is a test-side
declaration that runs inside `identity-oracle.test.ts`. It adds no case to the mutation registry, as design 05
§10 and the addendum scope it.

## The result

- **The verdicts are unchanged: 12 PASS and 3 REFUSED** through the fixture's unmodified runner, pinned exactly.
  This is the candidate's own report, **not an E1 result**.
- **The matrix matched its declaration on its first real run.** Each of the 2,708 mutations got exactly its declared
  code, and each operator count equals design 05 §5's written table. The 31 N cases fail as `answer`. **No stop
  condition of design 05 §12 fired**, and no count or code was changed.
- **The 4,126-run search, ABL-1 to ABL-5, the latest-grant witness and the seven identity mutants are unchanged**,
  and all pass.

## K14C-R03-01: the oracle joins command, calls, answers and reports

### The steps (designs 04 and 05)

| Step | Checks | Code |
|---|---|---|
| A | Resolve the references through the oracle's own relation as it stood before the command | none |
| B | An unknown reference throws `UnknownLaboratoryReference` and a known one does not; on an unknown reference B2 is skipped and C still runs | `exit` |
| B2 | Each recorded answer at its slot, by position (Table 3) | `answer` |
| C | The method list against the row, by the subsequence test | `call-missing`, `call-extra`, `call-method` |
| D | Each call's target | `target`; `inspection` at a final slot |
| D2 | Settlement reports first, then deliveries | `report-extra`, `report-delivery`, `report-method`, `report-missing` |
| E | The exit (design 05's Table 2) | `exit` |
| F | The five fields the Observation copies from the final inspection's recorded answer | `inspection` |
| G | Shape, relation, first naming | `shape`, `relation`, `naming` |

One code per record: the first failing step's. The final view is read from the last call's recorded answer, never
from `StepRecord.view`.

### D04-CHK-01: answers decide the exit

`classifyAnswer` is Table 3. Under it a swallowed fail-visible answer fails as `answer`, whatever Observation
follows. That covers a refused control, a refused inspection, no open exchange, a refusal that names no
Execution, and an unsupported fire result.

- **The swallowed-refusal trace.** Create x, dispatch x; then the second dispatch's refused call, followed by a
  genuine inspection of x and its Observation, with the throw cleared. The genuine refusal and the swallowed one
  each give `answer`, and neither adds an Observation or a contradiction. The accepted dispatch passes.
- **In the matrix:** 31 N cases and 62 swallow mutations. G1 to G5 are genuine refusals: `exchange_unresolved`,
  `no_unresolved_exchange`, `recovery_held`, and no open exchange for `recover y` and `takeover y`. No genuine schedule
  refuses a cancellation, a recovery or an inspection, names no Execution in a refusal, or answers a fire outside the
  four results. A1 to A26 cover those classes by faults (design 05 §4).

### D04-CHK-02 and owner choice 06: settlement reports

- **The seam.** The adapter constructs its coordinator from the class the laboratory passes. The subclass constructor
  replaces `driver` with a forwarding Driver before calling `super`, so the adapter does not change. The fake Driver
  receives each delivery's recording settlement. Reports are recorded when they start, then forwarded to the
  Kernel's settlement with their arguments.
- **Live controls**, on one run of create, dispatch, redeliver:

  | Settlement handed to the fake Driver | Code |
  |---|---|
  | The recording one, unchanged (also the default) | none |
  | One that reports nothing | `report-missing` |
  | One whose `delivered` reports twice | `report-extra` |
  | One whose `delivered` reports `failed("lab")` | `report-method` |
  | At the redelivery, the dispatch's recording settlement | `report-delivery` |

- **In the matrix:** 30 report mutations, five operators on each of the six cases that hold a delivery.
- **Nested order.** First, the entry-order test: call, delivery, report, call. Second, addendum §A3's reentrant trace:
  a dispatch whose first delivery calls `redeliver`, and the redelivery's delivery throws. The test asserts:
  - the trace is call 0, delivery 1, call 1, delivery 2, report 0, call 2;
  - the report is delivery 1's, made during delivery 1, inside call 0;
  - the next command's delivery and report are attributed `[3, 0]` and `[3, 3, 0]`, so both stacks were restored.

  The oracle's verdict on that record is a separate assertion: `call-extra`.
- **Evidence attribution, corrected.** ABL-2 and the latest-grant witness judge the submission grant. The
  one-`new Coordinator(` structure test is a regression guard (012), not a proof.

### D04-CHK-03: the declared matrix

`identity-oracle.test.ts` builds design 05 §4's corpus from the declaration: the main run M1 to M30, F1 to F14, A1
to A26 and G1 to G5. It computes each operator's count from the declared cases and asserts that the computed counts
equal the written table. It asserts that its own copy of Table 1 equals the oracle's `ROWS`, and that every case
reaches its declared row, calls and exit with a passing prefix. Codes are never read from the oracle.

| Operator | Code | Count |
|---|---|---:|
| Drop one call | `call-missing` | 116 |
| Replace a method by each of the 12 others | `call-method` | 780 |
| Insert a donor of each of the 13 methods | `call-extra` | 1,417 |
| Retarget to the other Execution | `target` / `inspection` | 29 / 27 |
| `pendingTimers` given an argument | `target` | 3 |
| `fireTimer` generation + 7; kind `execution_deadline` | `target` | 3; 3 |
| Exchange Activation changed; takeover writer epoch + 1 | `target` | 4; 2 |
| The other Execution's final inspection and Observation | `inspection` | 16 |
| One copied field changed | `inspection` | 95 |
| Wrong exit | `exit` | 121 |
| Swallow: append a genuine inspection; return the previous Observation | `answer` | 31; 31 |
| Report: drop; duplicate; `failed("lab")`; another delivery's owner; outside any delivery | `report-missing`; `report-extra`; `report-method`; `report-delivery`; `report-extra` | 6 each, 30 |
| **Total** | | **2,708** |

For each mutation the test asserts, before it uses the code:

- the case's prefix passes;
- the pristine case reaches its declared row;
- the mutated record differs from the pristine one in exactly the operator's components;
- every record was judged (`unjudged` 0).

Then it asserts exactly one problem, with the declared code.

**Failed-record policy** (design 05 §6). A new test repeats design 03's omitted-list control and pins the policy: the
control gives `shape`, and its second command counts as `unjudged`.

### D05-CHK-01: missing values and report arity (addendum §A1)

- **Missing values, V1 to V11.** Each control is a valueless answer at one slot: create, input and Outcome
  answers, and absent and null views at the preliminary, final and sole-inspection slots. Three records are judged
  for each control: as thrown, with the previous Observation substituted, and with a genuine inspection of x
  appended. All three give exactly `answer`, judging never throws, and the Observation and contradiction counts do
  not move. The passing neighbor is the same command with its genuine, valued answer.
- **Arity.** `delivered("lab")`, with method, owner, delivery and call kept, gives `report-method`. The neighbor
  is the bare `delivered()`, which is clean, and a test checks that the two recorded reports differ only in `args`.
- **Reported separately:** 33 judged records and one arity control. The matrix stays 75 cases, 2,708 mutations and
  31 declared failures.

### D05-CHK-02: the search's count types (addendum §A2)

`zeroCounts()` returns a complete `OracleCounts`. No count is optional and no type is weakened. The skeletons,
domains, 4,126 runs and their assertions are unchanged.

## K14C-R03-02: 017 L-39

L-39's opening sentences are design 05 §9's text. The label is offered at the registration answer only when the
generation took its offered name. An occupied label, or a refused generation name, gives a fresh string, and so
does an unannounced timeout. The timeout keeps the string actually assigned to it, fallback included. The "why
acceptable" column now cites the §A1 answer check. The README's bullet says the same. No behavior changed.

## Brief 04's criteria (implementer's assessment, not acceptance)

| ID | Assessment |
|---|---|
| R04-1 | Met. Table 1 (26 slots, including preliminary inspections and `pendingTimers`), Table 3 and steps A to G judge every recorded call, answer and report against the command, from the oracle's own relation. The oracle uses only the two error classes from the adapter. The census and nested-order tests pin what is recorded. |
| R04-2 | Met. Review 03's four probes are rejecting controls with honest neighbors: `inspection`, `call-method`, `call-extra`, `call-extra`. The declared matrix varies command, call, preliminary and final inspection, answer, report and exit: 75 cases, 2,708 mutations and 31 declared failures, over 62 rows, 26 slots and 3 delivery slots. Addendum §A1's controls are reported separately. |
| R04-3 | Met. The oracle header, the README and 017 L-39 state design 05 §8's claim and its table of what is not judged. Design check 05 found §8 to preserve D03-CHK-03 and found no narrowed claim. This report states it too. |
| R04-4 | Met for this round's evidence. KC-1 to KC-6, R02-1 to R02-4 and R03-1 to R03-4 hold as reports 01 to 03 gave them: 12 PASS and 3 REFUSED pinned, ABL-1 to ABL-5 and the latest-grant witness, the seven identity mutants, and the 4,126-run search. Packet verify passed at exact C. B..C scope is checked above. C..H runs through `packet_tools.py candidate` after H is committed, and its result goes in the handoff. D01-CHK-04 stays with K2.4/E2. |

## Deviations and points for the reviewer

1. **The matrix and the controls passed on their first real run.** Their power to discriminate rests on the declared
   mutations and named controls, not on a defect they caught during the build.
2. **The oracle and the adapter have one author.** Design check 05 asks this review to enforce the separation. In
   `identity-lab.ts`, the section after the "The oracle" banner (`ROWS`, `classifyAnswer`, `Oracle`, `judge`) uses
   only `AnswerContradiction` and `UnknownLaboratoryReference` from the adapter. Only `startLab` calls
   `createKernelCandidate`. `identity-oracle.test.ts` writes Table 1 out again and compares it with `ROWS`.
3. **The build reused this session's design-05 prototype.** Unlike round 3's prototype, this one was not thrown
   away. It lay outside the repository, and most of its laboratory and about half of its oracle lines are in
   `identity-lab.ts`. The matrix test was rewritten around the declaration. All of it is this session's own code.
   The written counts were copied from design 05 §5, not from a run.
4. **`Tamper.delivery` is wider than design 05's `Tamper.settlement`** (addendum §A3). It receives the coordinator and
   a `forward` function, so a test can reenter or throw. It sits beneath the recorder, and the candidate does not
   use it.
5. **D2's scope is the fake Driver's contract:** one synchronous, bare `delivered()` per delivery. Late reports and
   `failed(reason)` are legal for real Drivers, and D2 would reject them.
6. **The census pins the 13 own methods of `ExecutionCoordinator.prototype`**, which the laboratory enumerates at
   load. A Kernel that adds a method would have it wrapped and recorded, and the census test would fail until it is
   updated. `visibleExecutions` and `reportProtocolFailure` are recorded, but no row allows them.
7. **The seven identity witnesses are unchanged but call `judge`, whose behavior changed.** In CI each mutant is
   still killed by its first named assertion. The witnesses' "oracle" failure lines now come from the new oracle.
8. **A run now reports one problem.** No maintained test depended on several; only the counts test changed among
   the existing tests.
9. **Faulted answers stand in for refusals the Kernel does not produce in these runs** (design 05 §4). Their codes
   follow from Table 3, not from Kernel behavior.
10. **Found by me while building, and fixed before C.** These were mistakes in my own code, not defects in the
    candidate:
    - I first placed the oracle's input bookkeeping after the `execution` check. Unlike H's oracle, it would then
      not have remembered a refused input that names another Execution. I moved it before the contradiction check.
    - In my tests, a leftover call in the V-control loop and an awkward J-1 expression; both are fixed.

## Validation

- **Packet verify (CI), at clean C:** run
  [`44876502133`](https://github.com/ArrokothI/arrokothi/actions/runs/44876502133), `packet-verify.yml`, revision
  `848b1957ae9e598bb256712c07a3cc22c39fbaf7`, spec `docs/development/work/K1.4-candidate/verification.json`. Result
  `checks_passed`, 19 of 19:
  - repository tests 5,322 of 5,322, with no failure, skip, cancellation or todo;
  - tool tests 777, archive tests 4, example tests 18;
  - the registry: 315 cases and 351 kills, the same as round 3. Each of the twelve candidate cases passed its
    control and was killed, with `semantic_credit: none`;
  - refusal guards 358 of 358; value-cost 18 cases and 238 kills;
  - adoption `mappings_complete` (register 1,199 entries, 315 cases);
  - dimensions `coverage_reported`, with the `k14-candidate` (5) and `k14-candidate-identity` (7) families
    complete;
  - the advisory area gate `reported`: 54 changed paths and no open origin.

  `run.txt` records revision = head = C: Node v26.10.0, npm 11.19.1, Python 3.13.18, Linux x86_64 with 4 CPUs,
  2026-11-21 06:38:51 to 08:01:27 UTC, exit 0. The artifact is `packet-verify-848b1957ae9e598bb256712c07a3cc22c39fbaf7`
  (sha256 `ef13b4a3063cddd07e445dfacb7a845ecaee93a62c9ec2c80e2aa42d46873c97`), which GitHub keeps until 2027-02-19.
- **Local, Node v26.10.0, at the working tree that became C:** `npm run typecheck` exit 0; `npm test` 5,322 of
  5,322 with no skip (5,296 plus 26). The identity probe's control runs for M1, M4 and M7 passed.
- **Local, at C after CI (2026-11-21):** the candidate's eight test files ran 268 tests in 26 suites, all passing, in
  about 3.8 s (the matrix about 0.26 s, the addendum's controls about 6 ms, the search about 2.6 s).
  `npm run check:builder-docs` passed (75 Markdown files, 2,368 local links and anchors, 58 public package
  imports). The scope comparisons above were made then.
- **After H is committed:** `packet_tools.py candidate` over C and H. Its result goes in the external handoff with H.
- **Not run locally:** the fresh-clone corpus and coverage, and the registry's runner; CI ran them at clean C. Also
  not run: the benchmark's E1, and any credentialed or live-provider profile.
- **Claim limits:** every verdict above is this repository's run. The three refused schedules are not evidence of
  anything about the Kernel. The registry kills are mechanism witnesses with no semantic credit. The identity claim is
  about Kernel IDs within one run (017 L-39). The oracle's claim is design 05 §8. It does not judge the other call
  arguments, the submission grant, the other Observation fields, the Kernel's delivery decisions, or calls that
  bypass the wrapped methods; the tests §8 names judge the first four, and nothing observes the last.

## Reference maintenance

- Accepted semantic sources: owner choices 02 to 04, unchanged. Owner choices 05 to 07 are route and test-scope
  decisions, not semantics.
- Layer 1 to 3: no change in this round.
- 017: L-39 reworded (K14C-R03-02). Not changed: L-38, L-40 to L-44 (L-44's seven identity rows stand), BASELINE §15,
  both roadmaps and `mental-model/mechanisms/evidence.md`. This round changes no Kernel or mechanism claim they state.

## Third-party review

None needed. No third-party code, test, asset or dependency was copied, adapted, vendored or added. Review 03's
probes and the design checks' traces are this repository's own review evidence. The maintained tests were written
from their descriptions against the approved outcomes.

## Handoff

- Ready for independent review of the cumulative candidate by a Codex GPT-6 session (owner choice 01).
- Strongest remaining risks:
  - the oracle and the adapter have one author (point 2);
  - what the oracle does not judge (design 05 §8);
  - faults standing in for refusals no genuine schedule makes (point 9);
  - D2's fake-Driver scope (point 5);
  - the first-exposure limit (017 L-39);
  - the 51 steps not run (L-38).
- Base, C and H, with the verified remote SHA, are supplied in the external handoff.
- No self-acceptance. K1.4-gate and the benchmark's E1 round 3 remain the owner's and the benchmark owner's to
  release.
