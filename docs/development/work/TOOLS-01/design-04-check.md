# TOOLS-01 design-04 check

A design check under [006](../../006-development-process.md#packet-lifecycle), by a delegated design
reviewer, advising the owner. It is not a Prompt B acceptance review: there is no candidate H.
TOOLS-01 stays IN_PROGRESS. This record answers none of the owner's questions, maps no origin,
applies no contract revision and marks nothing review-ready or accepted.

## Identity and access

- Reviewer: Claude Code, `claude-opus-5-5`, session `68a98635-8c1f-407c-9616-fa56f3a4c3b9`,
  2026-10-02. The implementer is Codex (GPT-6), a different model family. This reviewer wrote
  neither design-04 nor any TOOLS-01 tooling. [Pilot review 01](pilot-review-01.md) came from
  another session of the same model; it is read here as evidence, not authority.
- Access: local Git, shell and repository files; push access to `origin/codex/tools-01`; one web
  fetch of the pinned Node 22.9 test-runner documentation. Node v25.2.1, Python 3.13.5, macOS arm64.
- Read: AGENTS.md; 006; 012 (finishable criteria, corpus, oracles); 016 (root causes 5, 6 and 9, and
  "How to tell whether it works"); release-01, brief-01, [contract](contract.md) revision 2, designs
  01–03, owner choice 01, continuation-01, implementation-01, pilot-01, pilot-review-01 and
  [design-04](design-04.md) in full. Also the tooling README, `scripts/packet_tools.py`
  (`corpus`, `command`, `run_case`), `assertion-reporter.mjs`, `oracle-probe.mjs`, 007's TOOLS-01,
  K1.1-correction-03 and BINDING-01 rows, the research reading map and §8 of the 2026-10-02 report.

## Revisions checked

| Role | Full identity |
|---|---|
| Design-04 commit | `6b77416b293ec923c99f4b423707351b04bcf97e` |
| Its parent, the pilot review record | `c450d8a02fd55c73a9b48861b73a66e3b55c3760` |
| `contract.md` blob (revision 2), identical at both | `96c8f6342993f963a10beea8e6131aec715db737` |
| `adoption.json` blob at `60fc5bf8`, `c450d8a0` and `6b77416b` | `673b68ec2a0ad7219d90465b2aa60cff09076736` |
| Pinned source of the pilot runners | `66bc041175e6fc191c2e7cf88de198111e7d97c9` |

`origin/codex/tools-01` equalled `6b77416b` when this check started.

## Reruns at `6b77416b`

| Check | Result | Agrees with design-04 |
|---|---|---|
| `git diff --name-only c450d8a0 6b77416b` | only `docs/development/work/TOOLS-01/design-04.md` (+470) | yes |
| Embedded contract diff | Extracted the fenced 43-line diff. `git apply --check` exit 0; `patch --dry-run` applies with no offset or fuzz. Not applied. | yes |
| `npm run test:packet-tools` | exit 0; `Ran 158 tests in 48.558s`, `OK` | yes |
| `python3 -B scripts/packet_tools.py inventory --revision 6b77416b293ec923c99f4b423707351b04bcf97e --spec tests/fixtures/packet-tools/inventory.json` | exit 0; `provenance_verified`; artifact 208, mention 1,333, additional 8 | yes |
| `python3 -B scripts/packet_tools.py corpus --revision 6b77416b293ec923c99f4b423707351b04bcf97e --spec tests/fixtures/packet-tools/adoption.json` | exit 0; `extraction_pending`; 1,549 origins; suite 116, case 8, non_executable 30, pending 1,395 | yes |
| `git diff --check c450d8a0 6b77416b` | exit 0, no output | yes |

### Census

| Design-04 claim | Recomputed |
|---|---|
| 1,549 origins | 1,549 = 208 + 1,333 + 8; the mapping set equals the inventory set. |
| 82 pending artifacts; 1 pending addition | 82; `additional-1f7c2348…` (`review-03/hop/frozen-graph.mjs`). |
| 1,312 mentions in 169 documents | 1,312 in 169 revision/path pairs (169 distinct paths). |
| 244 revision/path pairs in the pending intake | 244. |
| 116 suite, 8 case, 30 non_executable | Same. |
| 120 edges to 71 files: 53 `.test.ts`, 18 other | Same; every suite ID has exactly one file. |
| 77 case IDs and 77 pairs: 29 + 1 + 10 + 37 | Same; 37 = 2 + 4 + 3 + 4 + 24. The registry has 98 cases and pairs; the 21 unmapped include `capture.current.Proxy`. |
| 179 runner-member occurrences | The arithmetic holds. The rebound runner patches 4 members and runs all 21 (its source, line 60). |
| Lexical census of 1,056 `test(`/`it(` sites, 55 templates | My regex finds 1,051 and 54. Design-04 calls its figure rough; the difference does not matter. |

This check also needed figures that design-04 does not give:

- **Whole-file suite origins.** 102 of the 116 suite origins point at line 1 of a file. 71 are
  historical test files: 53 distinct paths, 52 pinned at `66bc0411` and 19 at `9fd2faa7`. 63 of
  the 71 are byte-identical to the file at the same path today, and 1,392 of their 1,399
  literal-titled tests keep the same title. Across all 116 suite origins: 96 are identical at the
  same path, 10 changed and 10 absent.
- **Held tests already credited.** `artifact-22eb3398…` and `artifact-f468517a…` give whole-file
  suite credit to `value-diagnostic-work.test.ts` and `value-refusal-cost.test.ts`. Those files
  contain V-D1-titled tests (held) and, at `value-diagnostic-work.test.ts:269`, "decision-03
  descriptor probe: depth does not change bounded observations or coherent Proxy acceptance",
  which owner decision-01 supersedes.
- **What the pending mentions are.** A random sample of 40, seed 20261002, read once: 21 hold no
  counterexample (table headers, run results, method or process prose, log lists), 11 refer to
  members or probes held in artifacts, and 8 describe a scenario or obligation in prose (for
  example K1.1 review-04's `Object.keys`-throw boundary). This is a sample, not a census.
- **K1.1-correction-03's area.** Its named sources (K1.2-correction-01 reviews 04, 06 and 08, and
  blockers 01 and 02) hold 86 pending origins: 19 artifacts and 67 mentions. K1.1-correction-02
  holds 41 more.

## Boundaries

- **Code and semantics.** The commit changes only design-04. Its proposed paths are tooling,
  fixtures and the TOOLS-01 contract and checks (design-04:313–324). It proposes no Kernel,
  Runtime/Driver or deployment semantics, no production code, no Layer-3, sealed-record or 007
  edit, and no change to a hold.
- **Suites.** Existing Kernel suites stay unchanged (design-04:321). The analyzer and the hostile
  suite are untouched.
- **No credit for held witnesses.**
  - The holds table assigns V-D1, Proxy and re-prototyped built-ins to K1.1-correction-03, and
    V-ENV to BINDING-01 (design-04:253–257). This matches 007 and decision-01.
  - Witness results carry `semantic_credit: none`. A changed observation triggers investigation,
    never a release (259–265).
  - Superseded witnesses get no conformance or kill credit (266–272).
- **Third-party material.** None is reused. The proposal reads Node documentation and continues
  existing pinned dependencies (326–331).

## Does the mechanism close the gap?

The gap is false coverage: a plausible suite mapping that every check accepts. Design-04 closes the
*syntactic* forms mechanically:
- file-only targets;
- absent, renamed, skipped, todo or filtered titles;
- duplicate leaves;
- stale anchors;
- results from another commit;
- held records sent to suite.

The *semantic* forms remain a declared reading. These are a wrong assertion, an assertion that
never runs, an input that never reaches the operation, a helper that does the asserting, a near
input and an omitted hold tag. Design-04 says so honestly at 227–234. Its checks and summary,
however, do not separate suite credit established by a machine fact from credit established by
reading.

Three places present a manifest compared with itself as an "exact" check:
- the predicate binding (189–195);
- family membership (169–173, P1-M);
- hold classification (274–277).

A plausible but wrong mapping that cites a real title and real anchors still passes every check
the tool runs. That is the delegation scenario that prompted this revision.

Experiments marked [R] were run in a scratch directory on Node 25.2.1 and are not committed. To
reproduce, use the test below with a reporter that prints `type`, `name`, `file`, `line`,
`nesting`, `details.type`, `skip` and `todo` for `test:pass`/`test:fail`. Then run
`node --experimental-strip-types --experimental-test-coverage --test-coverage-include=<file>
--test-coverage-exclude=none --test-name-pattern='^<exact title>$' <file>` to see which lines
executed:

```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
const huge = 16_777_216;
test('cited test with early return', () => { if (huge > 0) return; assert.equal(huge, 33_554_432); });
test('swallowed', () => { try { assert.equal(1, 2); } catch {} });
describe('A', () => { test('same leaf', () => {}); });
describe('B', () => { test('same leaf', () => {}); });
for (const n of [1, 2]) test(`generated ${n}`, () => {});
test('parent', async (t) => { await t.test('child', () => {}); });
```

| # | Attack | Design-04 | Evidence |
|---|---|---|---|
| A1 | Real title, but its assertion does not check the required result | Declared reading | 227–230. The validator compares stored predicates with stored predicates, not with the anchored assertion (189–195). |
| A2 | Cited assertion never executes for that test: early return, dead branch, or an anchor copied from a sibling test | **Missed** | Anchors are only checked for one occurrence and a matching digest (197–202). [R] The title passes, and per-test coverage reports the assertion line unexecuted. → D04-CHK-01 |
| A3 | Skipped, todo, runtime `t.skip`, `--test-only` or name-pattern filtered | Closed mechanically | 216–218. [R] skip/todo flags arrive on `test:pass`. Filtered tests are omitted; the 22.9 docs say the same. |
| A4 | Vacuous body: environment-gated return, swallowed assertion | Declared reading | 227–229. The early return becomes mechanical under D04-CHK-01; a swallowed assertion stays reading. |
| A5 | Duplicate leaf names under different `describe` paths | Closed, conservatively | 215–216. [R] Both report `same leaf` at nesting 1, so both are refused. |
| A6 | Generated titles | Registration closed; row binding by reading | [R] `generated 1` and `generated 2` share one declaration location, so the declaration anchor cannot tell rows apart. The parameter-row anchor is checked only for existence (201). |
| A7 | Target is a test that has subtests | **Partly missed** | [R] A parent reports `details.type: "test"`. `assertion-reporter.mjs:6` excludes only `"suite"`. → D04-CHK-02 |
| A8 | Title present only in a helper, another file, a comment or stdout | Closed mechanically | [R] A test registered in a helper reports the helper as its file. Events, not text, are used. |
| A9 | Target file passes in the catalog but its named command never runs it | **Missed** | `tests/evals/*/*.eval.test.ts` and `examples/**/*.test.ts` are outside `npm test`. The current manifest maps 7 helper files under `repository-tests` that the command does not select. → D04-CHK-02 |
| A10 | Catalog run inherits a contaminating environment | **Missed** | `command()` passes `dict(os.environ, …)` (`packet_tools.py:426–428`). `KERNEL_POISON_MODE` (`sweep/preload.ts:47`) and `PACKET_ORACLE_CHECK` (`oracle-reach.mjs`) change test behaviour. → D04-CHK-02 |
| A11 | A helper does the asserting, possibly elsewhere | Declared reading | Real instance: `stringWorkChild` (`value-diagnostic-work.test.ts:478–505`) runs assertions as `--eval` text in a child. The parent passes only because lines 503–505 assert the child's status. Coverage of the test file cannot see them. → D04-CHK-01 label |
| A12 | Input never reaches the operation, for example refused on an earlier path | Declared reading | 227. A causal mutation is optional "where that trace is unclear", and the mapper decides that (231–233). → D04-CHK-01 counts |
| A13 | Near input: 16,777,216 cited for 33,554,432 | Rule stated; check missed | The rule is at 65–72. No tool compares the stored input with the anchor text. → D04-CHK-01 guard |
| A14 | Held defect mapped as corrected by omitting the hold tag | Declared reading | 274–277. Real targets exist: `value-diagnostic-work.test.ts:541` and `:269`. → D04-CHK-04 |
| A15 | Held or superseded record with a suite destination | Closed mechanically | 274–276 |
| A16 | Reproducing a held defect counted as correction credit | Closed mechanically | 259–265 |
| A17 | A revision-2 mapping carried over unchecked | Closed: all 124 become `pending_revalidation` | P1-R. Justified by `artifact-22eb3398…` and `artifact-f468517a…`. |
| A18 | A family member dropped, with N and the list agreeing | Declared reading | 169–173. An independent census exists only for generated members (281–284). Pilot: 19 against 18; "60+" against 67. → D04-CHK-03 |
| A19 | Kill by an unrelated failure, setup error, stale anchor or overlapping multi-edit | Closed mechanically | 286–299, with the historical extra oracles kept |
| A20 | Two variants (for example two lengths) grouped into one counterexample | Declared reading | 161–167. The content fingerprint detects identity conflicts, not lost variants. → D04-CHK-06 bounds the search |
| A21 | Catalog from another commit, or a stale cached pass | Closed mechanically | 236–241: fresh at C, no cache |

### Failure modes from pilot review 01

| Finding | Design-04 response | Status |
|---|---|---|
| Yield: 7 of 10 were mutation runners, and no `case` outcome was allowed | Families with registry destinations | Addressed |
| Misconception: asserting the historical defective counts | Rule at 63–72; examples for the V-D1 near input and the KC1-ARCH-1 replacement | Rule addressed; the near-input case is still enforced only by reading (D04-CHK-01) |
| Imprecise counts (18 against 19; 67 against "60+") | `declared_count` and an exact list, but a census for generated members only | Partly; D04-CHK-03 |
| Missed hold blocker (Proxy under decision-01) | Holds table seeded up front | Listing addressed; classification still by reading (D04-CHK-04) |
| `check-records.mjs` over-cautious | Proposed `non_executable/historical_command`; still pending | Consistent |
| Guard list: script-checked counts, held list, worked example, tool-verified titles, per-batch independent check | Held list, worked example and titles adopted; script counts not adopted; per-batch independent check unstated | D04-CHK-03; per-batch review stays an owner choice for any delegation |

## How each criterion closes (012)

| Criterion | Closing method | Counts reading as kill or coverage? |
|---|---|---|
| F2 | Deterministic: digests, locations, exact-set link integrity | No |
| F3 | Deterministic: runner fixtures for family, multi-edit and wrong-kill cases. True membership belongs to P1-M. | No |
| F5 | Deterministic: summary and CLI tests | No |
| P1-G | Structural (no origin or member can vanish) plus a declared bounded search for equivalence | Grouping by reading extends a counterexample's credit to every origin attached to it. The search's context and depth are undeclared: D04-CHK-06. |
| P1-T | Deterministic title and anchor checks plus a declared bounded search of the relation | **Yes.** A relation established by reading earns suite coverage, and the summary does not separate it: D04-CHK-01. |
| P1-H | Structural destination check, after a classification done by reading | No credit is given. The guard is incomplete: D04-CHK-04. |
| P1-M | Deterministic fresh kills; membership established by reading | Reading closures are kept out of kill totals, correctly. Membership: D04-CHK-03. |
| P1-R | Deterministic reconciliation plus bounded review | No, but the largest term is unsized: D04-CHK-05. |
| P1-C | Deterministic negative controls | No |

No criterion is open-ended in principle: every set is finite. Two still fall short of 012.
P1-T counts reading-established relations as coverage without saying so. P1-G, P1-T, P1-H and P1-M
claim a "declared bounded search" whose context and depth each mapper chooses. A reviewer facing
several hundred reading-only relations is again asking "can I find one wrong mapping?", the
open-ended question that 016 ties to verdict flips.

## Proportionality and sequencing (for the owner)

**Facts.**
- **Estimate.** Design-04 estimates 3–5 days for tooling, 3–6 for revalidation and 5–10 for
  extraction: 11–21 implementer days before review and blockers. It excludes the whole-file member
  census, the term D04-CHK-05 sizes.
- **Gating in 007.** 007 lists TOOLS-01 as a dependency of BINDING-01 only. K1.1-correction-03's
  dependency list does not name TOOLS-01; the order comes from 016's sequence and the owner's plan.
  K1.1-correction-03 does need the registry and its own area's counterexamples: its scope converts
  the refusal-cost counterexamples of reviews 04, 06 and 08 and blockers 01–02, and keeps the
  O-R8-3/O-R8-4 and Proxy witnesses as cases.
- **Pending intake by source.**

  | Source | Pending origins | Of which artifacts |
  |---|---:|---:|
  | K1.2-correction-01 | 722 | 70 |
  | K1.1 | 286 | 0 |
  | K1.2 | 262 | 10 |
  | K1.1-correction-01 | 77 | 0 |
  | K1.1-correction-02 | 41 | 2 |
  | K1.1-reference-01 | 6 | 0 |
  | DESIGN-AUDIT-01 | 1 | 0 |

**Options.**

| Option | For | Against |
|---|---|---|
| **A. Full reconciliation in TOOLS-01**, as proposed | The strictest reading of root cause 5: every recorded counterexample is adopted before any successor, under one coherent review. | One very large acceptance over hundreds of reading-established relations and 1,312 dispositions, the shape behind 016's flips (root cause 1) and record findings (root cause 6). It delays the packets that carry live holds (V-D1, Proxy, built-ins). K1.1-correction-03's area is mapped as held witnesses, then remapped by that packet. |
| **B. Staging as framed**: tooling, the 154 revalidations and the 82 + 1 artifact origins close in TOOLS-01; mentions are reconciled area by area before a successor touches the area | Fully adopts the runnable probes and mutants, which were root cause 5's concrete failure. A smaller TOOLS-01 review. | Without area tags, "touches that area" is a judgment, so the obligation is not finishable and can drift into a silent waiver. Prose-only counterexamples (about 1 in 5 of the sample) stay unextracted. Records move into successor reviews; root cause 6 moves rather than shrinks. |
| **C. Staging with a mechanical gate**: B, plus TOOLS-01 triages every mention and adopts K1.1-correction-03's area first | Every counterexample becomes a stored, owned, visible record before TOOLS-01 closes. Executable adoption is enforced before the code it protects changes, and is done by the packet with the domain context. TOOLS-01's review checks the triage and tags instead of hundreds of relations. | Still a reading pass over 1,312 lines (about half were quick noise in the sample). A wrong tag leaks; conservative multi-area tags reduce that. Needs an owner decision under AGENTS.md and entry-check text in 007 for the successors. |
| **D. Recorded limit**: mentions stay provenance only | Cheapest | Conflicts with root cause 5 and with 012 ("Every counterexample anyone finds is kept"). Not recommended. |

Option C's triage sorts each mention into one of three outcomes:
- no counterexample;
- a link to an extracted member;
- a pending prose-only counterexample record, stored with its input description and one or more
  area tags. An unknown area blocks every successor.

C's gate is a `verify` check. A successor's specification declares the areas it touches, and any
pending counterexample tagged with one of those areas fails its verification.

**Recommendation: C.** Apply D04-CHK-05 first: the `preserved` closure changes the revalidation
term for every option, since 63 of the 71 historical test-file origins are byte-identical today.
Then re-estimate. If A then costs about the same as C, prefer A as the stricter choice. Either way,
order the work so that K1.1-correction-03's area (at least the 86 + 41 pending origins and the
Proxy and built-in witnesses) is complete first. Reducing the mandatory corpus obligation inside
TOOLS-01 is the owner's decision; this is advice only.

## Required changes

Each must be reflected in a revised design and in the contract diff before revision 3 is applied.

**D04-CHK-01 (P2): suite credit has no executed-reach or discrimination fact.**
- *Counterexample.* In the [R] test above, take a target that names `cited test with early return`,
  anchors its input on the `huge` line and anchors its assertion on the `assert.equal` line. It
  passes every check design-04 specifies: the title runs and passes, each anchor occurs once with a
  matching digest, and the stored input and expected values are compared only with each other.
  Per-test coverage of the same run reports the assertion line unexecuted. An assertion anchor
  copied from a sibling test passes the same way. Registry cases cannot earn a kill without a reach
  witness (design 01; README `uncovered`), yet suite targets earn credit without one.
- *Required outcome.*
  1. **Reach.** From a fresh run of that exact test at C, record that every cited in-process
     assertion anchor executed, and any cited production operation anchor. An unexecuted anchor
     requires attention and earns no credit. [R] Per-test coverage works on real code: one
     `dispatch.test.ts` test ran in 0.36 s and reported its unreached hostile getter (lines
     1433–1434) and its executed assertions. An assertion-site recorder would also do. This is a
     runtime observation, not a static analyzer.
  2. **Unobservable assertions.** Label assertions the run cannot observe, such as `--eval` text
     in a child, `reach: reading` and cite the helper's status check.
  3. **Discrimination.** Each relation records its evidence: a registered mutation whose
     `killed_by` is that exact title, or a reading trace (input anchor → operation → assertion
     anchor). Summaries count suite credit by kind, and P1 completion reports the reading-only
     count.
  4. **Literal guard.** For `exact_input`, each stored literal, or its declared source spelling,
     must occur in the cited input anchor's text; a computed input is labeled. This mechanically
     rejects the 16,777,216-for-33,554,432 substitution. Its gaps are stated.
  5. **Labels.** P1-T's closing text and the summary fields state which relation facts are machine
     checked. `source_bindings_verified` must not read as relation verification.

**D04-CHK-02 (P2): the title catalog is not bound to the command, environment and leaf rule it
claims.**
- *Counterexamples.* Rows A7, A9 and A10 of the attack table:
  - `.test.ts` files outside `npm test`, and the 7 helper files already mapped under
    `repository-tests`;
  - an inherited environment, including `NODE_OPTIONS`;
  - a test with subtests that reports itself as `test`.
- *Required outcome.*
  - A target's result comes from its named command's own file selection and flags: that argv plus
    a reporter, or a selection the tool expands at C, which must contain the target file.
  - A helper module earns credit only through a test target that consumes it.
  - Catalog runs use a declared environment recorded in the summary, with a negative fixture for a
    contaminating variable.
  - Leaf status is decided from parent and child events.
  - The summary records the Node version, and the event fields are re-verified on the 22.9 floor.
    These observations are from 25.2.1. The fetched 22.9 page confirms that filtered tests are
    omitted, but it was truncated before the event field list.

**D04-CHK-03 (P2): family membership is self-consistent, not censused.**
- *Counterexample.* Declare `declared_count: 66` with the same 66 labels for `ablations.mjs`, which
  has 67 members. "Exact family-set checks" pass, because they compare the manifest with itself.
  The pilot made exactly this kind of count error (19 RULE_TESTS against 18).
- *Required outcome.*
  - Each family stores a census recipe over its pinned bytes and named dependencies: label patterns
    and selection, for example the `^X(?:[89]|1\d|2[0-3])` filter that `ablations-03.mjs` applies to
    review 04's runner.
  - The tool recomputes the label set and requires it to equal the member list.
  - A family that no pattern can census is labeled `census: reading` and counted.
  - Negative fixture: one member dropped from both the count and the list fails.

**D04-CHK-04 (P2): hold classification has no target-side guard.**
- *Counterexample.* A counterexample with its hold tag omitted names either of these as a suite
  target and passes every structural check:
  - `value-diagnostic-work.test.ts:541`, a held V-D1 test;
  - `value-diagnostic-work.test.ts:269`, coherent Proxy acceptance, superseded.

  The revision-2 manifest already does the whole-file version of this
  (`artifact-22eb3398…`, `artifact-f468517a…`).
- *Required outcome.*
  - The `holds` table also lists the current tests and registry cases that observe each held
    claim. The list is finite, the owner can review it, and it is seeded from the decisions and
    titles.
  - A suite destination on a listed test requires the counterexample to carry that hold, or a
    recorded `not_held` reason counted separately.
  - This is a guard with a stated gap (an unlisted test), not a proof.

**D04-CHK-05 (P2): the largest revalidation term is unestimated and has no structural closure.**
- *Counterexample.* Design-04 requires an explicit member census of whole-file origins (364–368)
  but leaves it out of the estimate (414–415), while owner question 3 asks for budget approval.
  The census is 71 historical test files holding 1,399 literal-titled tests. A structured target
  for each member would establish by reading what byte identity already shows for 63 of those
  files.
- *Required outcome.*
  1. State the census and re-estimate.
  2. Add a structural `preserved` closure. A member closes when all of these hold at C:
     - its historical bytes, whole file or the test's own source span, equal the maintained file;
     - the named command executes it;
     - its exact title passes in the catalog;
     - its declared helper closure is unchanged or reviewed.
  3. Members on the D04-CHK-04 register still route to holds; preservation gives no hold credit.
  4. Changed, absent and non-test members use structured targets or cases.
  5. The identity is rechecked fresh at every C, so this is not grandfathering.

**D04-CHK-06 (P2): the bounded search does not declare its depth.**
- *Counterexample.*
  - **Context.** The search covers "cited source contexts" and "explicitly referenced" sources
    (129–132, 335–339), but each mapper chooses its own context range (169). Design-04's line 49
    shows the cost: the `review-01.md:58` fence holds one input, and the surrounding review adds
    four. A mapper who records only the fence closes that origin with one member.
  - **Depth.** Reference depth is open too: `diagnostic-ablations-04.mjs` member T1 reads another
    pinned revision.
- *Required outcome.*
  - Declare minimum contexts:
    - artifact: the whole file plus every file it reads or imports at its pinned revision,
      transitively within the pinned tree;
    - fence: the fence plus its enclosing section;
    - prose: the enclosing paragraph or table row, plus anything it links, one hop.
  - Declare the test-side closure: test body, helpers it calls in the same file, and named fixture
    modules. Deeper helpers are labeled.
  - The tool checks that recorded ranges cover the minimum. P1-G, P1-T, P1-H and P1-M then become
    declared bounded searches under 012.

## Recommendations on the owner's questions

1. **Revision-3 diff and adoption v2.** Approve the direction, not the diff as written. That covers
   grouping, exact-input and authorized-replacement relations, holds with zero suite credit, and
   the v2 tables. Apply it after D04-CHK-01 to D04-CHK-06 change the P1-T, P1-M, P1-H and P1-R rows
   and the closing paragraph.
2. **Fresh title-catalog execution in `corpus`.** Approve it with D04-CHK-02's binding: the named
   command's own selection, under a declared environment. Consider producing it from the scheduled
   run inside `verify` to avoid running the tests twice. Keep rejecting a source-only scan.
3. **Full revalidation and the budget.**
   - Approve full revalidation with no grandfathering; A17's two mappings show why.
   - Hold the budget until D04-CHK-05's re-estimate.
   - Decide staging then; the recommendation is option C.

## Not examined

- No run of `npm test`, typecheck, the mutation registries or any historical runner. The change
  under check is a design note.
- The 72 artifacts outside the pilot set were not read individually.
- The mention figures come from a sample of 40.
- Design-04's renderer regex count (30 + 1) and the sealed dependency digests were not recomputed;
  pilot review 01 reports the 31 members.
- The check of the external research is limited to the reading map and §8.

## Verdict

**APPROVED WITH REQUIRED CHANGES**: D04-CHK-01 to D04-CHK-06.

The mechanism is the right one. Before revision 3 is applied, the revised design and its contract
diff need to:
- add the missing reach, command, environment, census and hold-guard checks;
- size and mechanize the whole-file revalidation;
- declare the search depth.

The delta should return for a short re-check, because D04-CHK-05 changes the budget the owner is
asked to approve. TOOLS-01 stays IN_PROGRESS. Nothing here applies the revision, maps an origin or
releases a hold.
