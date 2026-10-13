# Implementation report — K1.1-correction-03, round 3

This round answers [review 01](review-01.md) (Codex, `gpt-6-astra`), which returned CHANGES REQUIRED on H
`5f586b176089987fa3667e4c03f26b3dac0a5bfb` with findings KC3-R1-STOP-01 (P1), KC3-R1-EVID-02 (P2) and
KC3-R1-DOC-03 (P2), under [brief 02](review-01/brief-02.md). [Design 02](design-02.md) states the mechanism.
[Implementation 01](implementation-01.md) and [implementation 02](implementation-02.md) remain the record for
everything this round does not change:
- the change groups;
- the KC3-9 conversions and their authority;
- condition C1's [ablation](c1-ablation-01.md);
- the owner-choice-01 adoption work;
- the earlier self-found defects.

This report gives the current state of every criterion.

## Identity

- **Packet:** K1.1-correction-03, metered value refusal cost.
  - Governing records:
    - [release 01](release-01.md), [brief 01](brief-01.md), [design 01](design-01.md) and its
      [design check](design-01-check.md);
    - [owner choice 01](owner-choice-01.md);
    - [review 01](review-01.md) and [brief 02](review-01/brief-02.md);
    - the owner's 2026-10-12 supplement quoted in review 01;
    - the owner's round-2 direction below.
  - Process baseline: 006, 008, 009 and 012 as at B.
- **Owner direction for round 2 (2026-10-13).** Relayed in this session. The owner direction, verbatim:

  ```text
  Owner direction for round 2 (2026-10-13):
  - Correct in this packet, under brief 02. Write design-02.md answering its questions, then continue
    to build without waiting for a design check. These are corrections inside the approved design.
    Stop and ask only if a fix would raise B, add a residual or accepted limit, or change accepted
    bytes or diagnostic meaning.
  - STOP-01: fix the mechanism, not the call site. Give the stop-propagation invariant for every
    stop-producing operation (byte stop, work stop, diagnostics) and every continuation after it, and
    enforce it in both the static check and the runtime oracle, including near-budget shapes. Add the
    reviewer's stop-boundary family and consumer schedules as maintained tests, with post-stop bypass
    mutants.
  - EVID-02: the adapter must separate setup, parse, load, timeout and no-selection failures from a
    reached failing assertion. Add both negative controls and a positive control, then requalify the
    value-cost kills and the C1 registrations, reporting any downgrade.
  - DOC-03: bring the roadmap, and any other current summary, within Q6's detectable-kind scope.
  - Re-audit the whole cumulative packet: a second CHANGES REQUIRED in this subsystem fires 006
    stop-and-redesign. Then make a new clean C, run the full verify detached, write H with
    implementation-03.md, push, set 007 to WAITING_FOR_REVIEW and hand off B/C/H.
  ```

  None of the owner's stop conditions arose (§5 of design 02, and below), so no question was put.
- **State:** WAITING_FOR_REVIEW, recorded in H.
- **Branch:** `claude/k1.1-correction-03` on `origin` (`https://github.com/ArrokothI/arrokothi`).
  - Base B: `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b`.
  - Reviewed H: `5f586b176089987fa3667e4c03f26b3dac0a5bfb`.
  - The review's recording commit: `c91b82d0fe6c2db04f2683d71873eec7618b643b`.
  - Payload C: `ad9bc8640d261ace8af5e75c47aad1bad3ca84d7`. This round's commits from
    `35177b28258fcfb38d73012ae46089f6d766539e` (design 02) to C are:
    - `2d9a1d86`, `735a99b5`, `9772c53e`, `c8add082` and `d3b087c7`, all work in progress;
    - `c705126e`, the payload;
    - C itself, which adds one environment declaration that verify asked for (below).
- **Candidate H:** the commit that contains this report. Its full SHA is in the external handoff.
- **C..H administrative allowlist** (exactly): `docs/development/007-work-packets.md` and this report.
- **Session:** a Claude Code cloud session (`claude-opus-5-5`).
  - Anthropic-hosted Linux VM with 4 vCPUs.
  - Node v26.10.0 (`/opt/node-v26.10.0-linux-x64`), npm 11.19.1 and Python 3.13.16.
  - Outbound HTTPS only, through the environment's agent proxy.
  - `git fetch` and `git push` to `origin` for this branch only. No `gh` CLI, and no pull request.
  - The clone started shallow. It was unshallowed with `git fetch --unshallow`, because the adoption
    corpus reads pinned historical blobs.
  - No subagents were used in this round.
- **Working tree:** clean at C and at H. Push status is in the handoff.

## Findings and their disposition

### KC3-R1-STOP-01 (P1): fixed by a stop-propagation mechanism

**Changed invariant.** Design 01 enforced the stop inside the charging helpers. Two things escaped it:
- a listing helper ran its native listing before testing anything;
- `record` returned `void`.

A diagnostic that passed B therefore stopped the root without telling its caller, and the caller went on.
Design 02 §1.1 makes the stop a reported result:
- only `spend` and `charge` change the stop state, and each returns it;
- every function that calls one of them reports the stop as `STOPPED` (distinct from `REFUSED`) or as
  `false`;
- every caller tests that result where it stands and returns.

After a stop, the only code that runs is:
- the stop-issue record;
- each active frame's test-and-return;
- the frame's `finally` (one cycle-set delete);
- the freezing of the counts.

The one operation past B is a listing whose own charge crossed it, so residual R1 is at most one listing per
root, structurally.

**Code** (`packages/kernel/src/values.ts`):
- `record` returns `boolean`, and a new `refuse` returns `REFUSED` or `STOPPED`;
- the traversal returns `Visited = BoundaryValue | REFUSED | STOPPED`, and every container loop tests
  `STOPPED` first;
- a failed charge returns `STOPPED`;
- both listing helpers, and `capture`, begin with `if (state.stopped) return STOPPED;`;
- `acceptMetered` maps the root's `STOPPED` to its refusal.

**Dependent paths walked.** The paths below were walked, and SC10 checks them all statically:
- every `record`, `charge` and helper call site in `capture`, `captureArray`, `captureObject` and
  `checkMember`;
- each continuation: the next helper, the per-name loops, path building, allocation, a nested return, a
  refused or stopped sibling, the finish step;
- the root `acceptMetered`;
- every root consumer, which goes through `canonicalize`.

Two continuations besides the reviewer's had the same flaw without a native observation:
- an array's index-name classification loop ran after an extra-name diagnostic had stopped the root;
- a parent went on to its next sibling after a stopped child returned `REFUSED`.

Both are listed under self-found defects below.

**Unchanged results.** At H every later `record` and `charge` after a stop was already refused, so the
issue list, units, bytes, stop kind and messages are the same. Only post-stop work disappears. No accepted
value, byte, diagnostic decision, B or residual changes.

**Static enforcement** (`packages/kernel/tests/capture-metering.ts`):
- **SC10.** It computes the stop-capable set by call-graph fixpoint from `spend` and `charge`, with the
  root `acceptMetered` excluded. Every call of a member must be one of:
  - the returned expression;
  - the test of a returned conditional whose stop branch is `STOPPED` or `false`;
  - `if (!call) return STOPPED;`;
  - a `const` followed at once by `if (x === STOPPED) return STOPPED;`.
- **SC11.** Only `spend` and `charge` write the stop state.
- **SC2, extended.** A listing helper must test the stop before it lists.

There are seven new seeded bypasses in `capture-metering.test.ts`. The stated gaps grow by one: a
stop-capable function reached through an alias.

**Runtime enforcement** (`packages/kernel/tests/capture-stop.test.ts`, new, 26 tests):
- **Review 01's real-B family.** It runs in a child in which only the two listings are wrapped:
  - offsets −2…+2 with 257 names;
  - names 0, 1, 4,096 and 65,536;
  - wrappers 1, 15 and 29;
  - a null prototype;
  - distinct rows.

  It asserts Σ(1 + length) over every native listing equal to the charged listing units, plus the exact
  units, the crossing kind, and the target's names and symbols listing counts. At offset 0 the names are
  never listed. At −1 and −2 the names listing crosses B after it returns and is charged. At +1 and +2 the
  symbols listing crosses.
- **The same boundary through all 14 consumer schedules.** The 14 schedules are:
  - the three exports;
  - both creation roots and ingress;
  - the three recovery lists;
  - progress, Emission, result and error;
  - the eight eager roots of a visible caller's unauthorized Outcome.

  Each schedule has a classification and whole-state assertions. Each root lists the target's symbols
  once and its names never, which also shows that each of the eight roots keeps its own budget.
- **An exhaustive stop-position search**, declared in the file. It covers 21 shapes over every refusal
  family, mixed siblings at depth, aliases and an accepted document. Each shape is captured at every work
  budget from 0 to its full cost and every byte limit from 0 to its full size. That is exhaustive up to
  2,000 units and 4,000 bytes, and sampled above (0–256, every 61st, the last 256). Every run must:
  - account exactly for its native listings and its caller-object descriptors, allowing for an element or
    descriptor unit that itself crossed;
  - end with exactly one stop issue;
  - record nothing outside the unstopped run's details and counts;
  - grow monotonically with the threshold.

  This uses an evidence-only seam: `captureWithWork(value, workBudget, byteLimit)` starts the meter, or the
  size count, that far along. It can only lower B and the size limit, and its checks pin that.
  `canonicalize` and every consumer pass head starts of 0. Two tests pin the seam: it only lowers, and no
  Kernel module but `values.ts` names it.
- **Mutants.**
  - `value-cost.static` has eight single-layer bypasses, each invisible at run time while the other layer
    holds:
    - a bare symbol `record`;
    - a `REFUSED` stop branch;
    - a nested stop folded into a refused element;
    - a `refuse` that drops the stop;
    - an unpropagated array charge;
    - both listing gates removed (one mutant per gate);
    - a stop write outside `spend` and `charge`.
  - The new `value-cost.stop` case has four mutants:
    - H's own shape, a two-layer post-stop listing;
    - `record` always reporting success with an ungated listing;
    - an element descriptor taken before its charge (a late charge);
    - a member descriptor taken before its charge (a late charge).

  All twelve are killed.

### KC3-R1-EVID-02 (P2): fixed by an evidence contract in the adapter

**Changed invariant.** A registry kill now means a selected test failed at an assertion that a test-side
module imported. A failed process or TAP total no longer counts. TOOLS-01's runner and F3 are unchanged:
the adapter now gives them an honest observation.

**Mechanism** (design 02 §1.2):
- **One process.** `tests/tooling/value-cost-probe.mjs` runs the case's file in one process, without
  `--test` isolation, with `--test-name-pattern`.
- **The witness.** `value-cost-witness.mjs` is loaded with `--import`. Its synchronous module hooks give
  every module under `packages/kernel/tests/` a wrapping `node:assert`. The wrapper remembers each
  `AssertionError` that one of its functions throws, including async rejections.
- **The harness unwrappers.** Test files that import the harness get a wrapper of `harness.ts` instead.
  Its `accepted` and `refused` are remembered only when their own condition failed: `ok !== true`, or
  `ok === true`.
- **What is never credited.** The subject and the dependencies get the real modules. An exception raised
  while an assertion's arguments are evaluated never enters a wrapper. No stack frame or error-class name is
  read (TOOLS-01 owner choice 09).
- **Load failures.** An uncaught-exception monitor records them.
- **The reporter.** `value-cost-reporter.mjs` writes each test event with its failure type and whether
  the cause was witnessed.
- **The states.** The probe reports one of 13 states. Only `assertion_failed` exits with the case's
  `failure_exit` while reached, which the runner calls `killed`. `no_selection` is reported unreached
  (`uncovered`), and a hang is the runner's own `timeout`. Everything else exits 3, which TOOLS-01's
  parser refuses as `setup_error`. The probe's JSON names the precise state. `tests/tooling/README.md`
  documents the contract.

**Controls** (`tests/tooling/test_value_cost_probe.py`, 18 tool tests). They use the real probe and the real
`command` and `execution_outcome`.
- On a copy of the capture code with the real `value-cost.unit-table` case:
  - the passing control;
  - a genuine kill (the registered "visit unit uncharged" mutant, `assertion_failed` and `killed`);
  - review 01's two negative controls: `const = ;` is `parse_error` and a top-level throw is
    `load_error`, both runner `setup_error` with zero leaves.
- On synthetic cases, these are kills:
  - a test-side assertion;
  - a helper's `assert.fail`;
  - each harness unwrapper on its own condition;
  - an async assertion.
- These are not kills:
  - a harness error outside its condition;
  - a subject exception while arguments are evaluated (the reviewer's `O-DEFINEDATA-LITERAL` shape);
  - a subject-internal `AssertionError`;
  - a subject-built `AssertionError` rethrown by the test (owner choice 09's objection);
  - a hook failure;
  - a cancelled subtest;
  - no selection (`uncovered`);
  - a hang (runner `timeout`);
  - an inner output overflow.

**Requalification.** The whole registry ran under the new probe. In H's 227 registrations:

| Result | Registrations |
|---|---|
| Qualify as before (witnessed selected assertion) | 187 unchanged + 29 whose anchors were ported to the new code (22 distinct edits, same meaning) = 216 |
| Equivalent under stop propagation; ported | 2 (`COST-byte-stop-not-sticky + MB1-byte-stop-does-not-stop`, in two groups) |
| Withdrawn: a subject exception, not an assertion | 9 |

- **The equivalent mutant.** Its single edit removes `state.stopped = true` from the byte stop. Every frame
  now returns on `charge`'s `false`, so the flag alone has no observable role. The mutant's own name means
  "the byte stop does not stop", so its faithful analogue also makes the crossing `charge` report success.
  The two-edit analogue is killed in both groups.
- **The nine withdrawn registrations:**
  - `O-APPENDOWN-PUSH` in `c1.creation` and `c1.ingress`;
  - `O-DEFINEDATA-LITERAL` in `c1.ingress`;
  - `RC-CATCH-RETHROW`, `V-CATCH` and `VAL-catch-rethrows` in `c1.value-diagnostic-work` and
    `c1.value-refusal-cost`. Their wrapped child crashes, and the parent sees `Command failed`.

  Every one of these mutants is still killed by a witnessed assertion in another registered case:
  - `O-APPENDOWN-PUSH` in `c1.values`;
  - `O-DEFINEDATA-LITERAL` in `c1.creation`;
  - the three catch mutants in `c1.creation`, `c1.outcome-hostile` and `c1.values`.
- **Added:** the 12 stop mutants above, and `MV3-array-symbols-listing-skipped` (next item).

The registry now holds 231 registrations. All of them are killed at C (verify, below).

**C1 at B and at C by the same rule.** [`c1-requalification-02/`](c1-requalification-02/requalify.py) runs
each withdrawn or ported registration, and each group's control, through the same probe. At C it uses the
group's converted tests. At B it uses a B worktree with the group's original tests and the mutant's B edit.
[`result.json`](c1-requalification-02/result.json) gives these results:

| Group / mutant | B (original tests) | C (converted tests) | C1 reading |
|---|---|---|---|
| every group's control | passed | passed | — |
| creation `O-APPENDOWN-PUSH` | subject exception | subject exception | Unchanged at the qualifying level: no witnessed kill on either side |
| ingress `O-DEFINEDATA-LITERAL` | subject exception | subject exception | Unchanged |
| value-diagnostic-work and value-refusal-cost: `RC-CATCH-RETHROW`, `V-CATCH`, `VAL-catch-rethrows` | subject exception | subject exception | Unchanged |
| **ingress `O-APPENDOWN-PUSH`** | **witnessed kill** (`harness.accepted`) | subject exception | **A group-level loss.** The converted ingress test now crashes in the Kernel instead of reaching its assertion. Like implementation 01's 37 "replaced elsewhere" pairs, the mutant stays killed by a witnessed assertion at C, in `c1.values` |
| value-diagnostic-work and values `COST-byte-stop-not-sticky` | witnessed kill | passes (equivalent under stop propagation) | Not a conversion loss. Its faithful analogue is killed in both groups |

The C1 ablation's "replaced elsewhere" claims rest on four mutant meanings. Each was checked for a witnessed
kill at C:
- `MV1`/`VAL-object-read-from-descriptor`: five groups;
- `RC-ELEMENT-READ-TWICE`: `c1.value-refusal-cost`;
- `V-FOREIGN-PROTO`: four groups;
- `MV3-array-symbols-listing-skipped`: it was not registered at C, so it is now registered in
  `value-cost.byte-charges`, where the exact charge of 4,096 symbol members kills it with `assert.equal`.

C1-provenance registrations: 162 at H, 153 in the `value-cost.c1.*` cases plus MV3 now. That is 154, with
the 9 withdrawn ones accounted for above.

[`registry-changes.json`](c1-requalification-02/registry-changes.json) maps every H registration to its
successor, port or withdrawal, so review 01's audit IDs stay traceable.

### KC3-R1-DOC-03 (P2): fixed

A search for current restatements found five in scope. Each now names the detectable-kind scope and points
to the declared limit, without restating it:
- `mental-model/roadmap.md`, the finding;
- the summary sentence of BASELINE `002-implemented-kernel-baseline.md`;
- the module comment and the `unsupported_form` comment in `values.ts`;
- 007's scope and acceptance bullets for this packet.

The rest need no change:
- `values.md` (the canonical owner) and BASELINE's detailed section already carried Q6;
- `sources.md`'s provenance paragraph names the undetectable kinds in the same paragraph;
- the `mutations.json` and `adoption.json` texts describe the ten witnessed kinds, all detectable, or
  decision-01's historical requirement;
- `014-owner-progress-summary.md` line 172 describes brief 01's scope and claims no refusal. Verify pins it
  at B as the owner's summary, so it is left for the owner.

Review 01's WeakRef and FinalizationRegistry witnesses, given `Object.prototype`, are maintained in
`capture-refusals.test.ts`, asserting the permitted `{}`.

## Self-found defects in this round (separate provenance)

| ID | Defect | Disposition |
|---|---|---|
| SELF-R3-CONT-01 | After an array's extra-name or symbol diagnostic stopped the root, its index-name loop still classified every listed name (Kernel work after the stop; visible only through `charCodeAt`). | Fixed by stop propagation; SC10 |
| SELF-R3-CONT-02 | A stopped child returned `REFUSED`, so its parent went on to its next sibling and relied on that helper's gate. | Fixed: `STOPPED` is distinct; SC10 |
| SELF-R3-EQUIV-01 | The registered `COST-byte-stop-not-sticky` mutant became equivalent once the stop propagates. | Ported to its faithful two-edit analogue; the equivalence argument is above |
| SELF-R3-MV3-01 | `MV3`, a C1 "replaced elsewhere" mutant, had no registration at C. | Registered and killed |
| SELF-R3-DEC9-01 | The first form of the evidence seam passed thresholds as parameters into the capture state. DEC-9's type-free effect analysis then read every consumer path as mutating module state, and `control-commits.test.ts` failed. | Never in a candidate. Redesigned as a head start, so the consumer path passes literal zeros and its effect summaries equal H's |
| SELF-R3-ENV-01 | The witness reads `ARROKOTHI_VALUE_COST_LOAD`, and verify's environment census refused the first C (`c705126e`) at once. | Declared as absent, with the probe's spread as a computed read, in C |

## Deviations from design 02

1. **The seam.** It is a head start on the meter and the size count, not threshold parameters
   (SELF-R3-DEC9-01). Because of that, the stop messages still name B and the size limit on the evidence
   path, and a byte stop's reported size includes the head start. The consumer path is unchanged.
2. **The harness.** `harness.ts` is not changed. Design 02 proposed making `accepted` and `refused` fail
   through `assert.fail`. That would have unbound five recorded helper reviews of that module
   (`review.harness.*` in `adoption.json`). The witness wraps the two unwrappers instead, keyed to their own
   failure condition.
3. **Separate exhaustive bounds.** The byte sweep is exhaustive up to 4,000 bytes, separately from the
   work sweep's 2,000 units. The long-string shape has a short work cost and a 332,000-byte size.

## Criteria (current state)

| ID | State at this C | Evidence |
|---|---|---|
| KC3-1 | **Met**, now including every continuation after a stop | Stop propagation, SC1–SC11, the exact unit tests, and the runtime oracle with the stop search; 231 registered mutants |
| KC3-2 | **Met.** The derivation is unchanged. The first-over-budget stop now holds at every continuation | The derivation tests, the real-B family, the stop search |
| KC3-3 | Met (R1–R4). R1 is now structurally one listing per root | `values.md`, BASELINE |
| KC3-4 | Met, unchanged | `capture-work.test.ts` |
| KC3-5 | **Met** under the evidence contract | Every registered kill is a witnessed selected assertion; the controls are in `test_value_cost_probe.py` |
| KC3-6 | Met; closes with KC3-1/2 | Design 01 §7.1 mapping |
| KC3-7, KC3-8 | Met, unchanged; KC3-8 within Q6 | `capture-refusals.test.ts` |
| KC3-9 | Met. No accepted value, byte, diagnostic decision or stop position changes (design 02 §5). No existing assertion is changed in this round. The conversions' authority line is implementation 01's | The suite and the sweeps |
| KC3-10 | **Met**, with the DOC-03 corrections | `check:builder-docs` keeps only its failure that predates this packet |
| KC3-11 | **Met** | Verify below |

## Adoption corpus

- **The census.** Only the census changed. 40 preserved members read the whole repository directory, and
  each gained `packages/kernel/tests/capture-stop.test.ts` in `repository_read_changed`, with a new `reads`
  digest. The rows were recomputed with `packet_tools`' own `preserved_table` at a WIP commit, and only those
  40 rows differ. No member's status changed.
- **The standing rule.** No origin member, suite target, counterexample or helper review names a test file
  changed in this round, so the owner-choice-01 standing rule reopens nothing.
- **The result.** `corpus` reports `revalidation_complete`.

## Validation

### Verify on clean C

```text
Command (detached, the only verify job running), at C ad9bc8640d261ace8af5e75c47aad1bad3ca84d7:
  python3 -B scripts/packet_tools.py verify --revision ad9bc8640d261ace8af5e75c47aad1bad3ca84d7 \
    --spec docs/development/work/K1.1-correction-03/verification.json
Node v26.10.0, npm 11.19.1, Python 3.13.16, LANG=C.UTF-8, NODE_OPTIONS unset.
Exit 0, 12:26:39 to 13:36:17 UTC on 2026-10-13. Raw output sha256 39d89b8557b5789294f4e51437433cb6cb6e7701e3961d3e22d5beafc9393fe1
(not attached; the run is reproducible with the command above).

result: checks_passed   (result_reuse: false; acceptance: not evaluated)
tool-tests           passed   599 tests
inventory            provenance_verified   artifact 208, mention 1333, additional 8
adoption             revalidation_complete   origins 1549, counterexamples 1125, families 26, members 415,
                                             suite_targets 52, preserved 37
dimensions           coverage_reported
registered-mutants   selected_cases_passed   109 killed
refusal-mutants      selected_cases_passed   321 killed
value-cost-mutants   selected_cases_passed   231 killed
refusal-census       passed   (refusal_checks 321, registered_mutations 321)
oracle-census        passed   (oracle_comparisons 29, registered_mutants 29)
typecheck            passed
repository-tests     passed   tests 4114, fail 0, cancelled 0, skipped 0, todo 0
archive-tests        passed   tests 4, fail 0, cancelled 0, skipped 0, todo 0
kernel-sweeps        passed   exit inventory 57/57, 0 violations; fault sweep 66 scenarios, 54314 runs,
                              0 violations; poison sweep 48 files, 347 names, 2052 tests per mode:
                              off 77 s, count 341 s, throw 333 s, reenter 345 s; POISON SWEEP PASSED
area-gate            reported (advisory)
```

An earlier launch at `c705126e` stopped at its environment census (SELF-R3-ENV-01), and one launch at C
stopped after its first step because this report's draft was an untracked file in the checkout (verify
requires a clean payload checkout). Neither produced a result; C was then verified as above.

**Advisory area report (copied from the verify output).**
- **Scope.** 145 changed paths and 35 behaviour paths since B. The touched areas are `packages/kernel` and
  `tooling`, out of 68.
- **Open origins in the touched areas:** 342 of the 1,457 open origins (296 `pending`, 46
  `pending_revalidation`), with 0 prose items pending. There are 664 ungated origins.
  - `packages/kernel` has 341 and `tooling` has 10. Both lists are identical to
    [implementation 02](implementation-02.md#advisory-area-report-verify-output-copied)'s, which lists them.
- **Tool limits, verbatim:** "Advisory (owner choice 07): the report fails nothing and requires no triage";
  "Areas are derived lexically from minimum contexts and over-include; they are not a semantic impact analysis";
  "Origins that name no path are ungated and counted, not listed by area".

### Runs before C, and the reviewer's own probes

| Run | Result |
|---|---|
| Kernel tests, `node --test packages/kernel/tests/*.test.ts` | 2,060/2,060 |
| `npm test` | 4,114/4,114. The new floor in `verification.json` is 4,114, up from 4,080 |
| Tool tests | 599, OK. The floor was raised from 581 |
| `test:kernel-sweeps` | Exit inventory 57/57. Fault sweep: 66 scenarios, 54,314 runs, 0 violations. Poison sweep: 48 files, 347 names. Off/count/throw/reenter: 2,052 passing each, in 81, 374, 372 and 352 s |
| `mutations` over `value-cost.json` (230 then; MV3 checked alone) | `selected_cases_passed`, 230 killed |
| `mutations` over `mutations.json` | `selected_cases_passed`, 109 killed |
| `corpus`, `inventory`, `coverage`, both censuses | `revalidation_complete`, `provenance_verified`, `coverage_reported`, `{"refusal_checks": 321, "registered_mutations": 321}`, `{"oracle_comparisons":29,"registered_mutants":29}` |
| Review 01's `search-dimensions.mjs` against this tree, with a B worktree as baseline | Exit 0. 5,460 refused cases with no listing mismatch and 72 byte stops; 1,543 accepted with B's bytes. The same counts as the review |
| Review 01's `probe-stop-boundary.mjs` | Now fails its own "violation reproduced" assertion: the target's names listing at offset 0 is `[]` |
| Review 01's `probe-declared-limit.mjs` | Both acceptances hold, and it then fails to find the roadmap's broad sentence, which is gone |
| Review 01's `probe-evidence-attribution.py` | As shipped, its copy lacks the two support files the case now declares, so all three runs are `setup_error` (a correctly refused run). With those files copied, the control is `passed`, the syntax variant `parse_error` and the throw variant `load_error`. Every one is runner `setup_error`, and its "killed" assertion fails |

### Checks not run

- The live-provider and large-memory/timing profiles, which `verification.json` declares as not run.
- `check:builder-docs` as a gate (`known-base-failure`). Its only failure is the pre-existing
  `014-owner-progress-summary.md` → `work/DESIGN-AUDIT-01/` link.
- No independent review of this candidate has taken place.

### Third-party review (AGENTS.md)

None. No third-party code, dependency or service was added, copied or adapted. `registerHooks` and the
`node:test` reporter interface are Node built-ins. Review 01's probes were run as evidence, and their family
is reimplemented in the maintained tests with provenance. No probe file was copied into the payload.

## Strongest remaining risk

The runtime stop search is a declared bounded search: 21 shapes, exhaustive only below 2,000 units and 4,000
bytes. Statically, SC10 covers every call written in its forms, but not a stop-capable function reached
through an alias. A future change that aliases a helper would rely on the runtime search's shapes to show
the gap.

## Handoff

- **Ready for independent review.** 007 moves to WAITING_FOR_REVIEW in H.
- **Requested on acceptance (not lifted here):**
  - the [invalidation-02](../K1.2/invalidation-02.md) V-D1 hold, under the metered meaning with R1–R4;
  - the [invalidation-01](../DESIGN-AUDIT-01/invalidation-01.md) classification hold, against the
    detectable-kind claim (design check Q6).
- **External handoff:** B, C and H, with the verified push SHA.
- **No self-acceptance.** Successor release stays with the owner.
