# TOOLS-01 design-05 check

A design check under [006](../../006-development-process.md#packet-lifecycle), by a delegated design
reviewer, advising the owner. It is not a Prompt B acceptance review: there is no candidate H.
TOOLS-01 stays IN_PROGRESS. This record answers none of the owner's questions, maps no origin,
applies no contract revision, implements nothing and marks nothing review-ready or accepted.

## Identity and access

- Reviewer: Claude Code, `claude-opus-5-5`, session `9ef81f91-9166-4d81-b1ad-3d115be709d5`,
  2026-10-02. The design author ([design 05](design-05.md), session `5eb143d3`) and the
  [design-04 check](design-04-check.md) (session `68a98635`) are other sessions of the same model.
  This reviewer wrote neither, nor any TOOLS-01 tooling. My remit was the correlated-assumption
  errors the author and the earlier checker could share.
- Access: local Git, shell and repository files; push access to `origin/codex/tools-01`. No web
  access was used. Node v25.2.1, Python 3.13.5, TypeScript 5.9.3 (repository copy), macOS arm64.
  No Node 22.x is installed here, so every runtime observation below is from 25.2.1.
- Read in full: AGENTS.md; the live [contract](contract.md); designs 04 and 05; the design-04
  check. Read in part: 006 (principles, lifecycle, stop and redesign); 012 (finishable criteria,
  corpus, oracles); pilot 01's mapping table; 007's K1.1-correction-03, BINDING-01 and TOOLS-01
  rows; DESIGN-AUDIT-01 decision-01 §§2–3; `scripts/packet_tools.py` (`origin_id`, `inventory`);
  `coverageExecuted` in `packages/kernel/tests/sweep/fault-oracle.ts`; the pinned runners, run
  outputs, tests and records cited below.

## Revisions checked

| Role | Full identity |
|---|---|
| Design-05 commit (target) | `08e0890e3a8931b96a8c6190216de83b64855ad9` |
| Its parent, the design-04 check record | `0c1d57dd10612e54188c77a1697fd88c017badb3` |
| Design 04 | `6b77416b293ec923c99f4b423707351b04bcf97e` |
| `design-05.md` blob | `623a7e111a3bee5208c975e0ecc5e429aa73fe1c` |
| `contract.md` blob (revision 2) at the target | `96c8f6342993f963a10beea8e6131aec715db737` |
| `adoption.json` blob at the target and at `0c1d57dd` | `673b68ec2a0ad7219d90465b2aa60cff09076736` |
| Pinned sources | `66bc041175e6fc191c2e7cf88de198111e7d97c9`, `9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49`, inventory catalogs at `b759d0abc01915ea5abc94b4607c6f9101bbbcc7` |

After `git fetch`, `origin/codex/tools-01` and the local head both equalled the target, with a clean
tree.

## Reruns at the target

| Check | Result | Agrees with design 05 |
|---|---|---|
| `git diff --name-status 0c1d57dd 08e0890e` | `A docs/development/work/TOOLS-01/design-05.md`, nothing else | yes |
| `git diff --check 0c1d57dd 08e0890e` | exit 0, no output | yes |
| Embedded diffs, in a scratch repository holding the target's `contract.md` | Extracted two fenced blocks (55 and 19 lines). C diff: `git apply --check` exit 0; `patch -p1 --dry-run` exit 0, no offset or fuzz. A delta after the C diff: both exit 0. `git diff --check` after both: exit 0. The live contract is unchanged. | yes |
| `npm run test:packet-tools` | exit 0; `Ran 158 tests in 46.493s`, `OK` | yes |
| `python3 -B scripts/packet_tools.py inventory --revision 08e0890e3a8931b96a8c6190216de83b64855ad9 --spec tests/fixtures/packet-tools/inventory.json` | exit 0; `provenance_verified`; artifact 208, mention 1,333, additional 8 | yes |
| `python3 -B scripts/packet_tools.py corpus --revision 08e0890e3a8931b96a8c6190216de83b64855ad9 --spec tests/fixtures/packet-tools/adoption.json` | exit 0; `extraction_pending`; 1,549 origins; suite 116, case 8, non_executable 30, pending 1,395 | yes |

## Boundaries

- **Scope.** Only `design-05.md` changed. It proposes tooling, fixtures and TOOLS-01 records. It
  proposes no Kernel, Runtime/Driver or deployment semantics, and no production, hostile-suite,
  analyzer, Layer-3, sealed-record, 007 or hold change. Its C option asks the *owner* to write the
  007 entry check; TOOLS-01 writes none.
- **Held witnesses.** V-D1, Proxy and re-prototyped built-ins stay with K1.1-correction-03, V-ENV with
  BINDING-01 (design 05 §1; P1-H). Reproduction earns no conformance, correction or release credit.
  No correction or hold-release credit is proposed. The register gap in D05-CHK-05 would grant
  *preserved* (maintenance) credit to superseded tests; it would not release a hold.
- **Third-party material.** None is copied or added. The design reuses the repository's own
  `coverageExecuted` and the pinned TypeScript 5.9.3 already in `mutations.json`. One trap:
  `fault-oracle.ts` is itself a suite origin (identical at `66bc0411`). Editing it would break its own
  preserved identity, so the count helper of D05-CHK-02 belongs in `tests/tooling/`.

## Recomputed census against design 05

All recomputation is mine. It used read-only scripts in the session scratchpad, TypeScript 5.9.3
parses over pinned blobs, and `git show`. Origin IDs come from `packet_tools.py`'s `origin_id`.

### The 116 suite origins

| Figure | Design 05 | Recomputed | Note |
|---|---:|---:|---|
| Identical / changed / absent | 96 / 10 / 10 | 96 / 10 / 10 | agrees |
| Whole-file (all line 1) / fences | 102 / 14 | 102 / 14 | Fences: 9 absent at `9fd2faa7`, 5 identical. Agrees. |
| Test-file origins; paths; pins | 71; 53; 52 + 19 | 71; 53; 52 + 19 | agrees |
| Identical / changed / moved test files | 63 / 7 / 1 | 63 / 7 / 1 | agrees |
| Other whole-file (canaries, builder-docs, helpers, sweep, probes) | 31 (6, 2, 11, 7, 5) | 31 (6, 2, 11, 7, 5) | agrees |
| Test registrations in the 71 origins | **1,590**: 1,399 literal, 57 template, 134 computed; "124 are `t.test` subtests" | **1,466**: 1,399 literal, 57 template, **10** computed; **0** `t.test` subtests; plus 275 `describe` | The 124 are `RegExp.prototype.test` calls on an identifier receiver (`pattern.test(line)`, `expect.test(message)`). A census recipe matching `<identifier>.test(` counted them as subtests. |
| Identical origins: registrations | 962 (840 / 54 / 68) | **900** (840 / 54 / 6) | Same error: 62 `expect.test(message)` calls in `kernel-landing-zone.test.ts` |
| Helper closure of the 63 identical origins | 59 unchanged, 4 differ only in `harness.ts` | same | agrees; dynamic imports in closures target production only |
| Changed or moved files: registrations | **433**: 390 span-identical, 43 not | **372**: 329 span-identical, **43** not | `kernel-landing-zone.test.ts` has 189 tests, not 250 |
| Per changed file (registrations / not span-identical / titles gone / residue) | as in its table | identical except `kernel-landing-zone` 189 / 15 / 0 / changed | Residue results agree under both readings of "registration" |
| "Templates: 2 in `kernel-landing-zone` (plus 62 computed titles)" | 2 + 62 | 2 templates + 1 computed | same error |

The registration error leaves the residue and span results unchanged, because every pseudo-
registration sits inside a real test. It matters in two ways. A step-6 implementer comparing against
these figures will stop. It is also a live instance of the failure D04-CHK-03 named: a syntactic
recipe that shares its author's error.

**Residue changes in the five files.** `values.test.ts` has insertions only (80 lines).
`nondisclosure.test.ts` changes one import and inserts 113 lines. `unsupported.test.ts` changes a
comment. `evidence-records.test.ts` changes its root to `ARROKOTHI_EVIDENCE_ROOT`.
`kernel-landing-zone.test.ts` replaces six constants. Two of them are test inputs:
`INVENTORY` moves to `kernel-ownership.md`, and `REAL_DEPENDENCY_ROW` changes `11` to `13`.

### The 82 pending artifacts and one addition

I classified 20 of the 83 from source: the 10 pilot origins, then `review-10/probe-enforcement.mjs`,
`probe-reviewed-h-07.mjs`, `review-04/oracle-vs-mutants.mjs`, `review-11/run-faults.mjs`,
`review-08/cost-probe.mjs`, `review-06/links.py`, `K1.2/review-03.md:113`, `K1.2/checks-06.mjs`,
`DESIGN-AUDIT-01/review-03/hop/frozen-graph.mjs` and `K1.2/review-09/probe-order.ts`. All 20 agree with
§5.2. I made an independent member count for the mutation runners in the sample:
- `ablations-07`: 28 elements (R1–R12, C1–C16); `RULE_TESTS` 18.
- `ablations.mjs`: 67.
- the other pilot runners: 21, 21, 16, 22 and 4.

**New fact: most families have sealed run outputs that list the members that actually ran.** Each
of these outputs prints one verdict line per member and the runner's own summary:
- `ablations.mjs`: `review-03/abl-corr.txt` at tree `312f2584`. 67/67, including D35 and D1–D30, so
  31 renderer sites at that tree.
- `ablations-07`: `validation-09/47-round7-ablations.txt`, 28.
- rebound: `validation-09/38-revision4-ablations-rebound.txt`. 21 ran; **V5 SURVIVED**, 20/21.
- `ablations-03`: `review-06/run-10-revision4-ablations.txt`, 21.
- `ablations-04`: `review-08/11-review6-exact-ablations.txt`, 16.
- `original-ablations-02`: `review-03/abl-adapted.txt`, 36.
- K1.2 `ablations.mjs`: `review-03/abl-sealed.txt`, 32/36.
- review-02 and review-03 reviewer ablations: 12 and 10.
- review-06 `mutants.py`: `mutants-1/2-results.json`.

Partial runs exist too. `validation-08/27-revision4-ablations.txt` holds four verdict lines and then
exit 1 on a stale anchor. Every count I could match agrees with §5.2. The 390 occurrences add up; the
273 distinct keys are arithmetic before equivalence review, and I accept them as such.

V5 is a disclosed **equivalent survivor**: implementation-04:111, review-08:108, and every later
round's 20/21. This bears on D05-CHK-06.

### The mention sample

I drew my own sample: a simple random sample of 60 from the 1,312 pending mentions, sorted by origin
ID, with `random.Random(20261004)`. Each mention was read with eight lines of context and classified
with design 05's definitions.

| Class | Mine (n = 60) | Design 05 (n = 128, unweighted / weighted) |
|---|---:|---:|
| N no counterexample | 26 (43%) | 36% / 32% |
| A names a member, probe or test held in an inventoried artifact or maintained test | 23 (38%) | 38% / 40% |
| A\* names a member defined only in an un-inventoried sealed record | 3 (5%) | 15% / 16% |
| P prose-only counterexample | 8 (13%) | 11% / 11% |

- **P is wider than one class shows.** Two A lines also carry a prose-only variant:
  - `review-08.md:303` links N7 but adds the `.at()` and `.codePointAt()` rope reads;
  - `review-02.md:297` links R9 but adds the 1,024-unit message edge.

  So 10 of 60 (17%) carry prose-only content. Three of the eight P lines may turn out linkable (two
  scenario lists, one runner-validity defect that an F3 control covers), so P lies between 8% and 17%,
  about 110–220 mentions.
- **Absent probes.** Three P lines cite K1.2 review-14's "probe-2 R1/R4/R7", which is not in the
  pinned tree. Those table rows are the only definition.
- **A\* is lower in my sample.** My K1.1 stratum gives 3 of 10; design 05's gives 12 of 26. Both
  samples are small.
- **A includes run results.** Five A lines and two A\* lines name members only in run results,
  audits or file lists. Under a strict "carries a counterexample" reading they are N, and N would
  be 55%.

### Hold register size

Over the 52 mapped test paths at the target (900 registrations), I counted registrations that observe
Proxy or V-D1:
- the title names V-D1 or Proxy, or the span builds a Proxy (`new Proxy`, `Proxy.revocable`): 58;
- the span reaches a Proxy only through a same-file or test-helper function (for example
  `coherentArrayTrapping`, `countingCaller`, `polluteOnPrototype`, `proxy`, or harness
  `revokedProxy`): **28 more**;
- with the two V-D1 files added: 86 candidates.

This is before any re-prototyped built-in or V-ENV recipe: `values.test.ts` alone has 44
`setPrototypeOf`/`__proto__` mentions. Design 05's E2 assumes 60–80 matches.

## Probes [R]

These ran in the session scratchpad on Node 25.2.1 and are not committed. To reproduce: run
`NODE_V8_COVERAGE=<dir> node --test --test-reporter=<events> --test-name-pattern='^<name>$' p.test.mjs`
with this file, then apply the innermost-range rule (the one `coverageExecuted` uses) at each
`ANCHOR_*` line's first token and at its `assert` call:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
function op(n) { if (n > 10) throw new RangeError('too big'); return { ok: true, charge: n }; }
test('swallowed-before', () => {
  try {
    const r = op(33554432);
    assert.equal(r.charge, 33554432); // ANCHOR_A
  } catch {}
});
test('short-circuit', () => {
  const r = op(1);
  r.ok || assert.equal(r.charge, 33554432); // ANCHOR_B
});
test('parent', async (t) => {
  await t.test('child', () => { assert.ok(true); });
  assert.equal(1, 2); // ANCHOR_C
});
test('env-gated', () => {
  if (!process.env.NEEDED) return;
  assert.equal(op(1).charge, 1); // ANCHOR_D
});
```

| Probe | Observation |
|---|---|
| `swallowed-before` | The test passes. `op` throws before the assertion, yet the assertion counts **1** at both offsets: V8 has no range boundary after a throwing call, so the innermost range is the `try` block. **False reach.** |
| `short-circuit` | Line start counts 1, the `assert` call 0. Reach depends on which offset the tool checks. |
| `^parent$` | `child` passes at nesting 1 and `parent` **fails**. The run has exactly one executed leaf, and that leaf passes. |
| `^parent child$` and `^child$` | Zero tests run. The reporter still emits one passing `test:pass` named after the file, at nesting 0. |
| `env-gated` | Passes vacuously. The anchor counts 0, so reach catches it; a `preserved` member has no reach check. |
| `--test-skip-pattern=.` | All anchors 0, plus the same synthetic file-level pass. |

## Attack table

"Mechanical" means a tool check refuses the case. "Reading" means the case is closed only by a
counted, declared reading. "Missed" means false credit is possible as designed.

| # | Attack | Design 05 | Evidence |
|---|---|---|---|
| 1 | Check's D04-CHK-01 counterexample: early return before the cited assertion | Mechanical | Coverage gives 0 after a return (the `env-gated` probe, same mechanism). |
| 2 | Assertion anchor copied from a sibling test | Mechanical | A name-filtered run gives sibling bodies 0. |
| 3 | 16,777,216 cited for 33,554,432 | Mechanical | Token values differ. |
| 4 | Assertion inside the `--eval` template (D05-02) | Mechanical → reading | The scanner sees the string token. |
| 5 | Assertion after a throwing call inside a caught region | **Missed** | Probe `swallowed-before`. 76 of 904 registrations in the mapped files contain a `try` block; 13 pass a block to `assert.throws`/`rejects`. → D05-CHK-01 |
| 6 | Assertion in the right operand of `\|\|`, `&&` or `?:` | **Ambiguous** | Probe `short-circuit`. The design never says which offset the tool checks. → D05-CHK-01 |
| 7 | Cited anchor in a failing parent whose single child leaf passes | **Missed** | Probe `^parent$`. D05-03 checks the leaf count, not other failures. → D05-CHK-02 |
| 8 | Zero-match pattern with a synthetic file-level pass | Mechanical only if the full path is compared | Probe. → D05-CHK-02 fixture |
| 9 | Helper code run only at module load | Mechanical, rule underspecified | `coverageExecuted` returns a boolean, but §4 says counts. → D05-CHK-02 |
| 10 | Table-driven input in a loop header or module constant | **Wrongly refused** | Such input runs at load in the baseline, so it is never "reached by that test alone" (e.g. `aggregate-refusal.test.ts:53`). → D05-CHK-02 |
| 11 | Token guard met by another argument or declaration of equal value in the same anchor | **Missed** | Design 05:77 claims "another argument" fails the token-value guard. It passes: `literals[]` binds values, not positions. → D05-CHK-03 |
| 12 | Literal only in a comment | Mechanical | Token kinds |
| 13 | Gross mutation of the cited operation file "discriminates" a target that asserts only `ok` | **Missed** | The operation-file rule accepts it. Design 05:78 implies a kill shows the assertion compares the required value. → D05-CHK-04 |
| 14 | `tests/evals`/`examples` file; helper module as target; script drift | Mechanical | catalog binding |
| 15 | Inherited `NODE_OPTIONS`, `KERNEL_POISON_MODE`, `NODE_TEST_CONTEXT`, `NODE_V8_COVERAGE`, `PACKET_ORACLE_CHECK` | Mechanical | allowlist plus fixtures |
| 16 | Allowlist drops a variable a test reads, so the test passes vacuously | **Missed for `preserved`** | A8 compares counts, and a vacuous pass changes none. No current instance: test-side `process.env` reads are the sweep preload and the archived evidence guard, which throws. → D05-CHK-10 |
| 17 | Family member dropped from both list and count | Mechanical | structural census |
| 18 | Wrong container, or an adding statement classed `reads` | Reading (a named fact) | Self-check counts exist for 4 of 20 families. Sealed outputs exist for most. → D05-CHK-09 |
| 19 | Generator input revision | Mechanical (D05-06) | The sealed output at `312f2584` settles 31 renderer sites. → D05-CHK-09 |
| 20 | Registration recipe counts `RegExp#test` calls | **Missed in the design's own census** | Table above. → D05-CHK-12 |
| 21 | Targets `value-diagnostic-work.test.ts:541` and `:269` | Mechanical | title recipes |
| 22 | Superseded test reached through a helper-built Proxy gets `preserved` credit | **Missed** | Coherent-Proxy acceptance with no "Proxy" in the title and no `new Proxy` in the span: `values.test.ts:1225` and `:1239` (`coherentArrayTrapping`, `assert.ok(first.result.ok)`), and `creation.test.ts:742` (`polluteOnPrototype`, "still creates the exact Execution"). Both files are identical origins. Decision-01 §2: "Every Proxy is refused at capture, at every depth". 28 registrations are missed in total. → D05-CHK-05 |
| 23 | `not_held` without a reason | Mechanical | |
| 24 | Changed byte, absent title, file not selected, skipped or todo leaf | Mechanical | |
| 25 | Changed residue | **Contradictory** | P1-P requires an unchanged residue, but E2 and step 6 "review the five residues". `kernel-landing-zone`'s replaced constants are test inputs. → D05-CHK-07 |
| 26 | `describe` treated as a registration, so describe-level code drops out of the residue | **Ambiguous** | 275 describes; no current instance differs. → D05-CHK-07 |
| 27 | Identical test whose input comes from a production export that changed since the pin | **Missed** (design 05:101 claims "same input") | `outcome-limits.test.ts` `limitCases()` reads `BOUNDARY_LIMITS`. Kernel source has not changed since `66bc0411`. It has changed since `9fd2faa7`, the pin of 11 identical origins. → D05-CHK-11 |
| 28 | Generated member with a reviewed helper | Mechanical | refused |
| 29 | Vacuous historical test stays vacuous | Declared limit | stated (design 05:102) |
| 30 | Fence-only context, missing T1 dependency, unresolved label, short range | Mechanical | range and lexical candidate checks |
| 31 | Mixed mention (link plus prose-only variant) closed as a single `link` | **Missed** | §4 makes `triage` single-valued. Instance: `review-08.md:303`. → D05-CHK-08 |
| 32 | Successor spec omits the area gate | **Missed** | The gate is a `checks.json` entry, which a spec can omit. → D05-CHK-08 |
| 33 | Wrong area tag | Reading | Conservative multi-area tags, stated |
| 34 | Equivalent survivor (V5) | **Unfinishable** | P1-M lists no equivalence route. → D05-CHK-06 |

## How each revision-3 criterion closes (012)

The C diff, after the D05-CHK changes marked below.

| Criterion | Closing method | Open-ended, or counts reading as a kill or as coverage? |
|---|---|---|
| F1 | Deterministic Git fixtures | No |
| F2 | Deterministic digests and exact-set checks, plus sealed-source digests | No |
| F3 | Deterministic runner controls (multi-edit, wrong-kill, target-set) | No |
| F4 | Deterministic fixtures. The floor checks need Node 22.9: BLOCKED_EXTERNAL until the owner answers Q7. | No |
| F5 | Deterministic summary tests | No |
| F6 | Deterministic link checks, clean checkout, and a declared reading of the diff for third-party material | No |
| P1 preamble | Structural: the tool checks that recorded ranges cover the minimum context. Declared bounded search inside that context. | Bounded: context and depth are declared. Artifact transitivity is finite inside the pinned trees. |
| P1-G | Structural reconciliation plus the bounded search | Grouping is reading, but declared. |
| P1-T | Deterministic: selection, single leaf, reach, token guard. Discrimination by kill, or by reading counted as `target_reading`. | **Reading counts as coverage, labelled.** Acceptable only with D05-CHK-01 to -04: otherwise items 5, 7, 11 and 13 above pass as machine facts. |
| P1-P | Deterministic identity, selection, catalog and closure checks; helper review counted | Not open-ended. As written it credits item 22's tests and contradicts its own plan (item 25): D05-CHK-05, -07, -11. |
| P1-H | Structural destination check, recipes recomputed, classification by counted reading | **Undeclared scope:** the recipes are unspecified, so the reviewer cannot check the register's completeness. D05-CHK-05 declares them. |
| P1-M | Deterministic census equality and fresh kills; `census: reading` counted | **Not finishable as written:** no route for equivalent or non-equivalent survivors (V5). D05-CHK-06. |
| P1-R | Deterministic reconciliation against `0c1d57dd`, then the rules above | No |
| P1-X (C) | Deterministic: triage count and area-map coverage. Gate in `verify`. 007 entry check by the owner, an external observation. | Triage is a declared bounded search. With D05-CHK-08 the gate cannot be bypassed and a mixed mention cannot lose its variant. |
| P1-X (A delta) | Adoption completeness under P1-T/P/H/M | Same as P1-T |
| P1-C | Deterministic negative controls | No |
| P2 | Process: clean-C verification and independent review | No |

No criterion is open-ended in principle. The lexical and coverage guards in P1-T, P1-P, P1-H and P1-M
are regression guards with stated gaps, not proofs. 012 permits them on that footing, as long as
every fact they produce is reported by kind and none is described as sound.

## Implementability: what would force GPT-6 to stop

Each item is resolved by the required change named.
1. Residue: the contract and the plan disagree (D05-CHK-07).
2. Reach: which offset of an anchor is checked; the count or boolean baseline rule; module-scope
   inputs; non-leaf failures (D05-CHK-01, -02).
3. Hold register recipes are not given (D05-CHK-05).
4. P1-M has no route for V5 (D05-CHK-06).
5. Triage cardinality; who runs the gate; which changed paths count; which paths the area map covers
   (D05-CHK-08).
6. A target with no operation anchor cannot meet the operation-file rule (D05-CHK-04).
7. Step 6 compared with the wrong registration figures (D05-CHK-12).
8. A4 on 22.9. On 25.2.1, a `t.test` subtest cannot be selected by its full path. Design 05 already
   stops on an A-failure. The mapped origins contain no `t.test` subtests, so the consequence is small.

## Re-estimate

The rates are design 05's, and so are the terms I did not change.
- **E1:** about +1.5 to 2.25 days for the required changes (sealed-output cross-check, register
  expansion, reach rules, routes, gate, labels).
- **E2:** +0.5 to 1.25 days. The register holds more than 86 matches, and some
  `kernel-landing-zone` members bind changed constants.
- **E4 under C:** +0.5 days for mixed mentions.
- **E4 under A:** prose-bearing mentions are 8–17% (about 110–220), so 70–150 records; adoption 6–19
  days, plus triage 4–6, plus sealed-log extraction 1–3.

| | Design 05 | Recomputed |
|---|---:|---:|
| A | 42–66 | **42–73** |
| C | 34–50 (+9–18 in successors) | **37–54** (+8–20 in successors) |

Design 05's figures sit inside my uncertainty but at its low end. A remains about 5 to 19 days dearer
than C, more than "about the same", so the design-04 check's tie-break toward A does not apply.

## Required changes

Each change applies during implementation, without another design round. Changes to contract text go
into the diff applied at step 0. Fixtures join §2's planned negative fixtures.

**D05-CHK-01 (P2): assertion reach credits an assertion that did not run.**
- *Counterexample.* Probe `swallowed-before`: the assertion counts 1 though `op` threw before it.
  Probe `short-circuit`: the result depends on the offset checked.
- *Required outcome.*
  1. An assertion anchor is one statement. Reach is measured at the start of its assertion call
     expression (`assert.*`, `t.assert.*`). For an `if (…) throw` guard it is measured at the
     condition's first token.
  2. An assertion anchor is `not_observable` (reading, counted) when either of these holds inside the
     target's registration span:
     - the anchor, or a call to the same-file helper that contains it, sits lexically inside a `try`
       block;
     - it sits inside a function passed to `assert.throws`, `rejects`, `doesNotThrow` or
       `doesNotReject`, or to a promise `.catch`.
  3. Fixtures: both probe cases, and `try { assert… } catch {}`.
  4. State the gap: an exception caught outside the span or in a deeper helper.

**D05-CHK-02 (P2): the reach run's validity and count rule are underspecified.**
- *Counterexample.* Probe `^parent$`: a failing parent with one passing child leaf. The zero-match
  file-level pass. `coverageExecuted` returns a boolean. A table-driven input such as
  `aggregate-refusal.test.ts:53` can never be "reached by that test alone".
- *Required outcome.*
  1. A reach run is valid only when all of these hold:
     - exactly one leaf event whose full path equals the target;
     - the synthetic file-level event is excluded;
     - no `test:fail` event anywhere in the run;
     - matching summary counts.
  2. `tests/tooling/reach-coverage.mjs` returns the innermost-range **count**, without editing
     `fault-oracle.ts`. "Reached by that test alone" means target count > baseline count.
  3. That rule applies to assertion anchors, operation anchors, and input anchors inside the target's
     registration span. An input anchor outside every registration span is `input_scope: module`:
     token-checked, counted separately, and its flow is reading.
  4. Fixtures for each case.

**D05-CHK-03 (P2): the token guard binds values, not positions.**
- *Counterexample.* An anchor `op('a'.repeat(16_777_216), { limit: 33_554_432 })` satisfies a stored
  input of 33,554,432. Design 05:77's claim that it fails is wrong.
- *Required outcome.*
  - An input anchor is one statement.
  - Each `literals[]` entry records its token ordinal within the anchor and its value, and the tool
    checks that token.
  - The summary documents `input_tokens_matched` as "the token at the cited position", never as
    input flow.
  - Fixture: an equal value in another argument fails.

**D05-CHK-04 (P2): mutation discrimination is not bound to the counterexample.**
- *Counterexample.* A mutation that makes the cited operation return a refusal kills a target
  asserting only `result.ok`, and the operation-file rule accepts it.
- *Required outcome.*
  - `target_mutation_discriminated` needs all of:
    - a registry mutation whose `obligation` names this counterexample, or one of its family
      members;
    - at least one cited operation anchor in the mutated file;
    - a qualifying named failure of the target leaf.
  - The summary text says "sensitive to a registered mutation of this counterexample; relevance by
    reading".
  - Delete or correct design 05:78's implication.
  - Fixture: a mutation registered to another counterexample cannot discriminate this target.

**D05-CHK-05 (P2): hold-register recipes are unspecified and miss helper-built Proxies.**
- *Counterexample.* Title and `new Proxy` body recipes miss 28 registrations in identical-origin
  files. These include superseded coherent-Proxy acceptance at `values.test.ts:1225`, `:1239` and
  `creation.test.ts:742`. Under P1-P they would get `preserved` credit.
- *Required outcome.*
  1. Before classification, record the recipes in `adoption.json` `holds.register` and in the
     report:
     - per claim, a title regex, a body regex and a file list;
     - body matching over the registration span **and** the bodies of the same-file functions and
       test-side helper exports it calls, transitively within the test-side closure.
  2. Minimum recipes:
     - Proxy: `new Proxy|Proxy\.revocable`, through helpers;
     - re-prototyped built-ins: `setPrototypeOf|__proto__|Object\.create\(`;
     - V-ENV: `\bvm\b|createContext|runInContext|frozen-intrinsics|globalThis`;
     - V-D1: the title, plus `value-diagnostic-work.test.ts` and `value-refusal-cost.test.ts`.
  3. Recipes may widen, never narrow below the fixtures.
  4. Fixtures: the three tests above and one harness `revokedProxy` user must appear in the register.
  5. Budget E2 classification at 1 to 1.5 days.

**D05-CHK-06 (P2): P1-M has no route for equivalent or non-equivalent survivors.**
- *Counterexample.* V5 (`ablations-03` and rebound-06) is a disclosed equivalent survivor, and P1-M's
  four destinations exclude it, so P1 cannot close. Design 04's P1-M had the route.
- *Required outcome.* Add these to P1-M's rule:
  - "an equivalence argument (reading, counted, never a kill)";
  - "a non-equivalent survivor recorded as an evidence finding attributed to its owner, or as an
    owner-recorded limit (counted, never a kill)".

  Fixtures: an equivalence closure and a survivor record that do not count as kills.

**D05-CHK-07 (P2): the residue rule contradicts the plan, and "registration" is undefined.**
- *Counterexample.* P1-P requires an unchanged residue, while E2 and step 6 review the five changed
  residues. In `kernel-landing-zone` the replaced constants are inputs to span-identical tests.
  `describe` as a registration would drop describe-level code from the residue.
- *Required outcome.*
  1. Residue = file bytes minus the spans of leaf-test registrations (`test`, `it`, `t.test`).
     `describe` and `suite` text stays in the residue.
  2. A span-identical member stays preservable only when every residue change is one of:
     - an inserted statement that binds new names only;
     - a changed or removed top-level declaration whose names the member's span (and the same-file
       helpers it calls) never references.

     An inserted top-level expression statement disqualifies every member of the file. Any other
     change sends the member to a structured target.
  3. Count `preserved_residue_additive` and `preserved_residue_unreferenced` separately. No free-form
     residue review substitutes for this.
  4. P1-P's text says this. If the owner rejects this narrowing under Q3, the strict text applies and
     E2 grows by about 10 days, for about 260 members.

**D05-CHK-08 (P2): option C triage loses variants and its gate can be bypassed.**
- *Counterexample.* `review-08.md:303` links N7 and adds two prose-only variants, but `triage` is
  single-valued. A successor spec without the gate check is not gated.
- *Required outcome.*
  1. `triage` is `none` (with a reason) or a non-empty **set** of links to members, records and
     `prose_pending` records.
  2. `verify` applies the area gate to every packet unconditionally, reading TOOLS-01's adoption
     manifest at C, over the B..H changed paths. A spec cannot disable it.
  3. The area map covers every path in the tree. A changed path outside it fails.
  4. Fixtures: a mixed origin; a spec that omits the gate; an unmapped test or doc path.

**D05-CHK-09 (P2): the family census is single-sourced where sealed outputs exist.**
- *Counterexample.* The container choice and the member list come from the same reading. Only 4 of
  20 runners assert their own counts.
- *Required outcome.*
  1. When the pinned tree holds a **complete** run output of the runner, the census also equals the
     set of member names on its verdict lines. A complete output names the command and tree; the
     runner's bytes at that tree equal the pinned origin; and it ends with the runner's own summary.
     Parse it with the runner's own print format.
  2. That tree is the D05-06 input revision. A mismatch requires attention.
  3. Record `census.observed` (output path, digest, tree).
  4. Fixtures: the partial `validation-08/27` output does not qualify; a dropped member fails against
     the output.

**D05-CHK-10 (P3): an environment that is too narrow can make tests vacuous unseen.**
- *Counterexample.* An early return on an absent variable passes, and A8's counts cannot see it.
- *Required outcome.*
  - Census every `process.env.<NAME>` read in selected test files and their test-side closures, at C.
  - Every name read must be passed or set by the declared environment, or listed as deliberately
    absent with its effect.
  - Fixture: an unlisted read fails.

**D05-CHK-11 (P3): `preserved` overstates "same input" when production inputs changed.**
- *Counterexample.* `limitCases()` derives its inputs from `BOUNDARY_LIMITS`. Kernel source changed
  between `9fd2faa7` and C, and 11 identical origins are pinned there.
- *Required outcome.*
  - For each preserved member, list the production modules its test-side closure imports that changed
    between the pin and C.
  - Count these members as `preserved_production_changed` and list them.
  - Correct design 05:101's claim to "same test-side input and assertion".

**D05-CHK-12 (P3): census figures and registration recognition.**
- *Counterexample.* The table above: 1,590 against 1,466; 124 "subtests" that are `RegExp#test`
  calls; 962 against 900; 433 against 372.
- *Required outcome.*
  - Recognise registrations only through bindings imported from `node:test` (`test`, `it`,
    `describe`, `suite` and their `.skip`, `.only` and `.todo` members), and through `<p>.test` where
    `<p>` is the first parameter of a registration callback.
  - Fixtures: `pattern.test(line)` and `expect.test(message)` are not registrations.
  - Use the corrected figures in steps 6–8 and the report.

## Recommendations on the owner's questions

1. **Revision-3 diff.** Approve the option-C diff, not the A delta, with these text amendments applied
   at step 0:
   - P1-T: D05-CHK-01 to -04;
   - P1-P: D05-CHK-07 and -11;
   - P1-H: D05-CHK-05;
   - P1-M: D05-CHK-06;
   - P1-X: D05-CHK-08.
2. **Title catalog.** Approve, with D05-CHK-02's run-validity rule and D05-CHK-10's environment census.
3. **Revalidation scope and budget.** Approve:
   - the preserved closure, with D05-CHK-07's binding rule rather than free-form residue reviews;
   - helper reviews, counted;
   - the register expansion and the production-change label;
   - reach-checked targets under D05-CHK-01 to -04;
   - all 154 rows.

   Budget E2 at about 6.5–10 days.
4. **Staging.** C, with K1.1-correction-03's area first (§5.3 and step 9). Recomputed: C 37–54 days
   plus 8–20 in successors; A 42–73.
5. **If C.** Approve the area map and gate only in D05-CHK-08's unconditional form. The owner records
   the 007 entry check. TOOLS-01 closes the `tooling` and `records` areas itself.
6. **Sealed logs.** Under C, keep them as `prose_pending` records with sealed-source pointers and area
   tags. The gate then makes K1.1-correction-03 adopt those in its area before it changes values code.
   Extract inside TOOLS-01 only if the owner wants K1.1-correction-03 unburdened (2–3 days, my A\*
   rate suggesting the lower end).
7. **Node 22.9.** Provide one, or authorize a user-level install of exactly v22.9.0 from nodejs.org
   with a verified checksum. F4 and A1–A8 stay BLOCKED_EXTERNAL until then. These observations are
   from 25.2.1, where `t.test` subtests cannot be selected by full path; check that first.

## Not examined

- No historical runner, mutation registry or full `npm test` ran. Probes used a scratch file only.
- 63 of the 83 artifacts were not read individually. The sample of 20 includes the 10 pilot origins.
- The mention figures come from a sample of 60, with wide intervals (P about 7–24%).
- I did not recompute §5.5's applicability figures (182/18/3) or the 86 + 41 area counts, which design
  05 reports as the design-04 check's figures.
- No Node 22.9 check was possible.

## Verdict

**APPROVED WITH REQUIRED CHANGES**: D05-CHK-01 to D05-CHK-12.

The design-05 architecture stands: preserved closure, coverage reach, structural census, hold
register and area gate. Its adaptations of D04-CHK-01, -03, -04 and -05 each leave a demonstrated
false-credit or unfinishable edge, but each has a local, mechanical remedy that needs no new design
round:
- an assertion reached after a caught throw;
- a gross mutation counted as discrimination;
- a value-only token guard;
- helper-built Proxies outside the register, which lets superseded tests earn `preserved` credit;
- the missing survivor route;
- the residue contradiction;
- single-valued triage and an optional gate.

The required changes that touch contract text must be in the diff applied at step 0. TOOLS-01 stays
IN_PROGRESS; nothing here applies the revision, maps an origin, releases a hold or answers an owner
question.
