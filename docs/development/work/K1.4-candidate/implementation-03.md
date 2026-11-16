# Implementation report — K1.4-candidate, round 3

The identity-rendering redesign after independent review 02. Rounds 1 and 2 are
[implementation report 01](implementation-01.md) and [implementation report 02](implementation-02.md); this
report covers what changed since round 2's candidate and does not repeat what stands.

## Identity

- **Packet:** K1.4-candidate. Records for this round:
  - [review 02](https://github.com/ArrokothI/arrokothi/blob/2a95a49a6e7ff46242a137f9d9ca6835e70ed946/docs/development/work/K1.4-candidate/review-02.md),
    CHANGES REQUIRED of H `14a7ef485282ab2c16d08702be5d61cfeb9997e7` (Codex GPT-6,
    `codex/k1.4-candidate-review-02` at `2a95a49a6e7ff46242a137f9d9ca6835e70ed946`). It closes K14C-R01-02 and
    K14C-R01-03 and opens K14C-R02-01, which continues K14C-R01-01. 006's stop-and-redesign rule fired and the
    owner chose a redesign with a design check;
  - [design 03](design-03.md) at `3745cb4bcf12eb36af797b582d5132dc5c0a6ea1`, answering
    [brief 03](https://github.com/ArrokothI/arrokothi/blob/2a95a49a6e7ff46242a137f9d9ca6835e70ed946/docs/development/work/K1.4-candidate/review-02/brief-03.md);
  - [design check 03](https://github.com/ArrokothI/arrokothi/blob/62092a70fec6e82ef4dcec17ce27195debf6b5ca/docs/development/work/K1.4-candidate/design-check-03.md),
    APPROVED WITH REQUIRED CHANGES D03-CHK-01..05 (Codex GPT-6, `codex/k1.4-candidate-design-check-03` at
    `62092a70fec6e82ef4dcec17ce27195debf6b5ca`);
  - [owner choice 04](owner-choice-04.md) ("Accept OQ-1, OQ-2 and OQ-3 as recommended.") and
    [design 03 addendum 01](design-03-addendum-01.md), which disposes the five required changes.

  The review, the brief, the probes and the design check were read by commit. Nothing was merged from those
  branches. Process: [006](../../006-development-process.md), [008](../../008-implementation-report.md),
  [012](../../012-review-methods.md), [017](../../017-known-limitations.md).
- **Implementer:** Claude Code desktop, Claude Fable 5.2 (`claude-fable-5-2`), on the owner's Mac (arm64, Apple
  M1, 8 cores), 2026-11-15. Node v26.10.0, npm 11.19.1, Python 3 and `gh`. It used no subagents. It is not the
  planner, the design checker or the reviewer. The same session switched to Claude Opus 5.5 (`claude-opus-5-5`)
  on 2026-11-16, after C and the CI dispatch, and wrote H: it read the CI artifact and filled this report's
  validation results. C was built entirely by Fable 5.2.
- **Branch:** `claude/k1.4-candidate`.
  - Base B: `c1951226338de6ccd3e4e6289259549551268f61`, main after PR #69.
  - Reviewed candidate: H `14a7ef485282ab2c16d08702be5d61cfeb9997e7` over C
    `7392e4a640c07c9a2989464cd2a979938c37ee25`.
  - Round-3 records: `3745cb4bcf12eb36af797b582d5132dc5c0a6ea1` (review 02 in 007, design 03) and
    `e11870f02956832cbda2a5326011bb9532fe50d7` (design check 03 in 007, owner choice 04, addendum 01).
  - Payload C: `41bd3aaa5cf83c51e93d41da567558d34f943410`.
- **Candidate H:** the commit containing this report. C..H changes exactly the spec's administrative allowlist:
  this report, the 007 row and `progress.md`.
- **Push:** C was pushed before the CI dispatch. H is pushed after this report is committed; its SHA goes in the
  external handoff.

## Changes (H `14a7ef48`..C)

`packages/`, `scripts/` and `tests/tooling/` are byte-identical to B: **no Kernel source and no packet tool
changed**, and no dependency was added. The fixture's scenarios, runner and oracle are untouched.

| Group | Files |
|---|---|
| **The rule.** One name ledger per scope replaces the alias table and round 2's timeout name table. Names are offered at Kernel answers; references resolve through the ledger; each answer is checked against the inspection after it; `eventIdentity` is refused by capability. Two declared errors are exported | `tests/conformance/k0-candidate/kernel-candidate.ts` |
| **The lab and the oracle.** A recording coordinator, fault and tamper hooks, and an oracle that judges the records without reading the candidate's ledger | `identity-lab.ts` (new) |
| **The tests.** Transitions; review 01's and review 02's counterexamples and design 03's own; the association traces; the first-exposure control; the oracle's rejection controls; the census controls; the mutants | `identity.test.ts` (new) |
| **The search.** 4,126 runs over two skeletons | `identity-search.test.ts` (new) |
| **The mechanism mutants.** Seven rows, their witnesses and the registry's runner | `identity-mutants.ts`, `identity-witnesses.ts`, `identity-probe.mjs` (new) |
| **The registry.** Seven cases, their coverage family and category, seven hold-register entries | `tests/fixtures/packet-tools/{mutations,coverage,adoption}.json` |
| **Changed tests.** Three convention tests state OQ-1; the locator test lists two more exports; the ablation test's registry filter is narrowed to its own rows | `conventions.test.ts`, `boundary.test.ts`, `ablations.test.ts` |
| **Claims and guards.** The README's conventions section and file table; 017 L-38, L-39, L-42 and L-44; five mapping rows; one more named Kernel importer on the K1.0 guard's existing list line | `README.md`, `docs/development/017-known-limitations.md`, `tests/conformance/legacy-mapping.json`, `tests/conformance/architecture/kernel-landing-zone.test.ts` |
| **Packet records and spec.** Design 03, its addendum 01, owner choice 04, the 007 row, `progress.md`, the verification spec | `docs/development/work/K1.4-candidate/`, `docs/development/007-work-packets.md` |

**Ownership.** Test-side adapter code and its evidence. No Kernel, Runtime, Driver or deployment semantics
change.

## The result

- **The verdicts are unchanged: 12 PASS and 3 REFUSED** through the fixture's unmodified runner, pinned exactly,
  with the same first unsupported steps. This is the candidate's own report, **not an E1 result**.
- **The search found no case the rule does not cover.** All 4,126 runs reached their declared end with no
  oracle problem. Neither stop condition of owner choice 04 fired.
- **ABL-1 to ABL-5 and the latest-grant witness are unchanged** and pass.

## K14C-R02-01 and the five required changes

### The rule (design 03 §3 and §4)

- **Mechanism at H.** Identity strings had four unrelated sources: a table of laboratory names, a label built
  when printing, a "Kernel spelling" built when printing, and an input Event's name read from its payload. Only
  the first was checked for collisions.
- **Now.** Every translated identity position is the value of a `Ledger`: one for Executions over the run, and
  per native Execution one for wait generations and one for Events. Input and timeout Events share the Event
  ledger. `assign` is the only writer, records a string only after finding that it denotes nothing, and never
  changes a pair. A fresh string is `kernel-<family>:<id>` or its first variant that denotes nothing.
- **Names attach at answers.** Five offers, each for the ID the Kernel's answer names: the Execution, the input
  Event, the wait generation, the Q2 b label for a timeout the registration answer announces, and a fired
  timeout. Printing offers nothing.
- **References** to an Execution or a generation resolve through the same ledger.
- **Owner choice 04.** A shown string never changes (OQ-1). An `await` that selects an Event by `eventIdentity`
  is refused in `begin`, for both Outcome commands, and `apply` keeps the guard (OQ-2). The version stays `/1`
  (OQ-3).

### D03-CHK-01: answers checked against what they claim

Addendum §A1's table is in the adapter as three claim functions and the printing check, and each row throws
`AnswerContradiction` with its own code. The replay case reads `retiredWaits`, so the `replayed` flag is not
read. The offered input name is kept apart from the shown string and is never overwritten.

Tests: the check's three fault traces (trace 1 in both directions); an absent ID; a missing ID on a duplicate
fire; a missing wait on a replayed `await`; an expired registration with no ID; a wrong category; payload
drift; a replay answered under another name; an input entry no answer named; an inspection of another
Execution. Honest neighbours complete: duplicate and replayed answers after the readiness was consumed and
after cancellation, and two inputs under one name in one Execution and in two.

### D03-CHK-02: the changed-ID claim

The README and 017 L-39 now say the claim is about IDs within one run, and that an ID which is wrong but
consistent from its first appearance takes the offered name. The first-exposure control asserts exactly that:
two runs with different native timeout IDs and equal Observations. The kept drift witnesses fault only IDs
already shown, in ordinary and adversarial spellings.

### D03-CHK-03: the oracle

`Oracle` in `identity-lab.ts` builds its own relation from the recorded answers and inspections. It checks, per
command: the one legal exit; the Kernel call's target against the relation as it stood before the command; the
Observation's fields and list lengths; that the relation stays one-to-one for the run; and the first-naming
rule. It counts what it judged. Its five rejection controls each have an honest control:

| Broken behavior | Reported |
|---|---|
| The last member of an Event list omitted | `shape` |
| A reference sent to another Execution | `target` |
| A known displayed fresh string refused as unknown | `exit` |
| A changed, already-shown ID printed under its old string | `relation` |
| An answer-only contradiction returning the previous Observation | `exit` |

### D03-CHK-04: the search and the registry

| Part | Runs | Asserted |
|---|---|---|
| Skeleton E, honest | 3,282 | 45,948 Observations; every run has the calibration run's counts and native IDs |
| Skeleton E, faults | 344 | 344 fault sites reached: 172 shown under a new string with every other field equal to the honest run, 172 ending in `timeout_generation` |
| Skeleton X, honest | 500 | 5,500 commands: 5,089 Observations and 411 unknown-reference throws, each of them at X9 |
| **Total** | **4,126** | The generator's counts equal the addendum's formula |

- **Measured time at C, this machine:** about 1.4 seconds for the three searches alone (E honest about 1.15 s, E faults about 0.13 s, X about 0.06 s), and about 4.5 seconds inside the full suite (3,912 ms, 359 ms and 223 ms). The addendum's budget was 120 seconds.
- **Seven registry cases**, `k14-candidate.identity-m1` to `-m7`, through the existing workflow: one probe file,
  registry rows, a coverage family and category, and seven `unread` hold-register entries. **No packet tool
  changed, so that stop condition did not fire.** They are `mechanism_witness` records with
  `semantic_credit: none`.
- **Kill evidence before C.** The registry's own runner, restricted to the twelve candidate cases at a local
  commit: twelve controls passed and twelve mutants were killed, each mechanism row by its named assertion.
  A maintained test applies each edit to a copy and requires the same kill.

### D03-CHK-05: the census

Addendum §A5 is the census by path. The candidate's header and the README state the invariant over the
translated positions only, and name what is outside it. J-3's two controls are tests: a new input under a used
name after the end is echoed in `ingressRefused` and adds no Event; an exact retry after the end is the Kernel's
replay.

## Brief 03's criteria (implementer's assessment, not acceptance)

| ID | Assessment |
|---|---|
| R03-1 | Met: one rule across the three families and the Event lists; the structural argument is design 03 §4; each transition and failure path has a deterministic test; both collision orders and names copied from earlier outputs are in the search. |
| R03-2 | Met: every review 01 and review 02 probe and design 03's six collisions are maintained tests with the approved outcome, with distinct real native IDs; the changed-ID fault and its ordinary-name control are kept. |
| R03-3 | Met: the header, the README and 017 L-38, L-39, L-42 and L-44 describe the rule and its limits. Design 01's addendum and design 02 stay as records; design 03 says what it supersedes. |
| R03-4 | KC-1 to KC-6, R02-1 to R02-4 and the non-deferred D01 checks hold as reports 01 and 02 gave them, with the identity items now closed by this round. 12 PASS and 3 REFUSED stay pinned. K14C-R01-02 and K14C-R01-03 stay closed: the five ablation cases, their hold records and the gate sentence are unchanged. D01-CHK-04 stays with K2.4/E2. |

## Deviations and points for the reviewer

1. **The search passed on its first run.** It never produced a failing run during the build, so its power to
   discriminate rests on the five rejection controls and the seven mutants, not on a defect it caught. The
   mutants are killed by targeted witnesses, as design check 03 specified, not by the search.
2. **The oracle and the adapter have one author.** They share no code and the oracle reads no ledger, but
   addendum §A1's table and the first-naming rule are each written twice by the same hand. A reviewer may want
   to read the oracle's two private methods against the table.
3. **Three-way name interactions are outside the search.** It runs every assignment with at most two
   non-ordinary slots, as the addendum declares. A fresh string whose `~2` variant is also taken is covered by
   witness M2 only.
4. **Skeleton X's exit split is pinned from the run** (5,089 and 411). The test also asserts, per run, that a
   throw can only be X9's and that Observations plus throws equal the commands.
5. **A witness treats one kind of throw as a failed assertion.** Where an Observation is expected, the
   candidate's own `UnknownLaboratoryReference` or `AnswerContradiction` is reported by name as a failure. Any
   other error crashes the probe, which is an invalid run. M5's kill is of this kind.
6. **M3 is a two-edit mutant** that adds an unchecked write to the ledger and uses it for the label. The
   registry's multi-edit form carries it.
7. **Rule 4's timer row is exact.** It holds because the Kernel answers a wait fire with the timeout ID for
   `expired` and `duplicate` only. A Kernel that changed that would make every such fire throw.
8. **Three round-2 tests changed their expectations** for OQ-1: a labelled timeout keeps its label when a
   command names it or offers it another timeout's name.
9. **The probe writes one link into the registry's temporary copy**, as round 2's probe does and review 02
   accepted. The two probes repeat about ten lines instead of sharing a helper, so round 2's probe is
   untouched.
10. **`identity-lab.ts` imports the Kernel package root**, to subclass the coordinator. The K1.0 guard names it
    on the list's existing last line, with no line added.
11. **The prototype of design 03 was thrown away.** The build was written again in the tree; nothing was copied
    from the copy outside the repository.
12. **Self-found while building, fixed before C.** Two of my own tests were wrong, not the candidate: one
    forgot that the laboratory clock is shared by two Executions, and one expected the oracle to report a
    relation problem for a call that only went to the wrong Execution.

## Validation

- **Packet verify (CI), at clean C:** run [`43798331633`](https://github.com/ArrokothI/arrokothi/actions/runs/43798331633),
  `packet-verify.yml`, revision `41bd3aaa5cf83c51e93d41da567558d34f943410`, spec
  `docs/development/work/K1.4-candidate/verification.json`: `checks_passed`, 19 of 19; repository tests 5,296 of 5,296 with no skip; the registry 315 cases and 351 kills, each of the twelve candidate cases killed with `semantic_credit: none`; adoption `mappings_complete` (1,199 entries, 315 cases); `run.txt` records revision = head = C (Node v26.10.0, Linux x86_64, 2026-11-16 03:28 to 05:47 UTC).
- **Local, Node v26.10.0, at the working tree that became C:** `npm run typecheck` exit 0; `npm test`
  5,296 of 5,296, no skip; `npm run check:builder-docs` passed (75 Markdown files, 2,361 links and anchors); the packet tool tests pass (777). The candidate's seven
  test files: 242 tests (171 in round 2, plus 67 identity tests and 4 search tests).
- **Local, fresh clone at C:** `packet_tools.py corpus` reports `mappings_complete`; `coverage` reports
  `coverage_reported`. `packet_tools.py candidate` over B, C and H reports `facts_verified`.
- **Local, the registry's runner on the twelve candidate cases only:** `selected_cases_passed`, twelve killed.
- **Not run:** the benchmark's E1. No credentialed or live-provider profile.
- **Claim limits:** every verdict above is this repository's run. The three refused schedules are not evidence
  of anything about the Kernel. The registry kills are mechanism witnesses with no semantic credit. The identity
  claim is about Kernel IDs within one run (017 L-39).

## Reference maintenance

- Accepted semantic sources: owner choices 02, 03 and 04.
- Layer 1 to 3: no change in this round.
- 017: L-38 (the `eventIdentity` refusal), L-39 (the label at the answer, OQ-1, and what the identity rule does
  not show), L-42 (`ingressRefused`), L-44 (the seven mechanism rows).
- Inspected and unchanged: BASELINE §15, both roadmaps, `mental-model/mechanisms/evidence.md`, 017 L-40, L-41
  and L-43.

## Third-party review

None needed. No third-party code, test, asset or dependency was copied, adapted, vendored or added. Review 02's
probes are this repository's own review evidence; the maintained tests were written from their descriptions
against the approved outcomes.

## Handoff

- Ready for independent review of the cumulative candidate by a Codex GPT-6 session (owner choice 01).
- Strongest remaining risks: the oracle's independence (point 2); the search's two-slot bound (point 3); the
  first-exposure limit (017 L-39); the two corpus-derived conventions (L-39, L-40); the 51 steps not run (L-38).
- Base, C and H with the verified remote SHA are supplied in the external handoff.
- No self-acceptance. K1.4-gate and the benchmark's E1 round 3 remain the owner's and the benchmark owner's to
  release.
