# TOOLS-01 — design 05 step 7: family census and target-set mutants

2026-10-04. Implementer: Claude Code (`claude-opus-5-5`), by owner assignment; not the design author
and not a reviewer. This is incremental evidence for design 05 §6 step 7. It is not clean-C packet
verification, independent acceptance, conformance credit, a kill or a hold release. TOOLS-01 remains
IN_PROGRESS.

**Result.** The tooling now does three things:
- recomputes every mutation-runner family from pinned bytes;
- cross-checks each family with the runner's own count assertions and with a complete sealed run
  output where one exists;
- runs multi-edit and target-set mutants, counting a kill only when a leaf in the mutant's declared
  target set fails.

The census of the 20 runner families and 6 mixed origins reproduces design 05 §5.2 exactly: **390**
occurrences in the 19 censused runners, **117** inheritances and reuses, **273** distinct members.
No member has a route yet: every member is `pending` until steps 8–10 register mutants or record
other closures.

## What runs

- **Runner (F3, D05-04).** Multi-edit mutants apply atomically; a stale, ambiguous or overlapping
  edit writes nothing. Target-set cases check that the control passes every leaf, including each
  mutant's expected targets. Edit sites the control never executed make a mutant `uncovered`. A kill
  is a failing leaf in the declared target set; any other failure is `wrong_kill`. A `discovery`
  field is metadata with `credit: none`.
- **Census (P1-M).** The kinds are `structural`, `generator`, `filter`, `inherits`, `python_ast`,
  `loop`, `bindings` and `census: reading`. The runner's count assertions are declared and checked.
  `observed` sealed outputs are cross-checked (D05-CHK-09). Routes and reuse links are validated, and
  counts are kept per role. The [tooling README](../../../../tests/tooling/README.md) has the rules.

## The 26 families

| Runner (pinned `66bc0411`) | Role | Census | Members | Count assertions | Complete sealed output (K1.2-correction-01 unless noted) |
|---|---|---|---:|---:|---|
| `K1.2-correction-01/ablations.mjs` | runner | structural + generator | 67 | 0 | `validation-09/08-correction-ablations.txt` |
| `K1.2-correction-01/ablations-07.mjs` | runner | structural | 28 | 0 | `validation-09/47-round7-ablations.txt` |
| `K1.2-correction-01/ablations-06.mjs` | runner | structural | 22 | 0 | `validation-09/37-round6-ablations.txt` |
| `K1.2-correction-01/diagnostic-ablations-04.mjs` | runner | structural | 4 | 0 | `validation-09/31-diagnostic-work-ablations.txt` |
| `K1.2-correction-01/review-04/reviewer-ablations.mjs` | runner | structural | 19 | 0 | none qualifies |
| `K1.2-correction-01/review-06/mutants.py` | runner | python_ast | 24 | 0 | none qualifies |
| `K1.2-correction-01/ablations-03.mjs` | runner | structural + filter (review-04, X8–X23) | 21 | 1 | `validation-05/27-revision4-ablations.txt` |
| `K1.2-correction-01/ablations-03-rebound-06.mjs` | runner | inherits (ablations-03) | 21 | 1 | `validation-09/38-revision4-ablations-rebound.txt` |
| `K1.2-correction-01/ablations-04.mjs` | runner | structural + filter (review-06 lines, Z1–Z16) | 16 | 1 | `validation-09/30-review6-exact-ablations.txt` |
| `K1.2/ablations.mjs` | runner | structural | 36 | 0 | `validation-01/07-original-ablations.txt` |
| `K1.2-correction-01/original-ablations-02.mjs` | runner | inherits (K1.2 ablations) | 36 | 1 | `validation-09/14-original-ablations-adapted.txt` |
| `K1.2-correction-01/sweeps-08.mjs` | runner | structural (`faults`, `reads`) | 34 | 0 | `validation-09/56-sweep-negative-controls.txt` |
| `K1.2-correction-01/sweeps-09.mjs` | runner | structural | 5 | 0 | `validation-09/63-round9-production-controls.txt` |
| `K1.2-correction-01/review-02/reviewer-ablations.mjs` | runner | structural | 12 | 0 | none qualifies |
| `K1.2-correction-01/review-03/reviewer-ablations-h2.mjs` | runner | structural | 10 | 0 | none qualifies |
| `K1.2-correction-01/review-08/mutants.mjs` | runner | structural | 20 | 0 | none qualifies |
| `K1.2-correction-01/review-11/run-mutants.mjs` | runner | structural | 2 | 0 | none qualifies |
| `K1.2-correction-01/review-11/run-read-mutant.mjs` | runner | bindings | 1 | 0 | none qualifies |
| `K1.2/review-09/ablations-reviewer.mjs` | runner | structural | 12 | 0 | none qualifies |
| `K1.2-correction-01/review-04/oracle-vs-mutants.mjs` | runner | census: reading | 11 | 0 | — |
| `K1.2-correction-01/review-10/probe-enforcement.mjs` | mixed | loop | 2 | 0 | — |
| `K1.2-correction-01/probe-enforcement-rebound-07.mjs` | mixed | inherits (review-10 probe) | 2 | 0 | — |
| `K1.2-correction-01/review-11/run-faults.mjs` | mixed | census: reading | 2 | 0 | — |
| `K1.2-correction-01/probe-reviewed-h-07.mjs` | mixed | census: reading | 2 | 0 | — |
| `K1.2-correction-01/probe-reviewed-h-08.mjs` | mixed | census: reading | 3 | 0 | — |
| `K1.2-correction-01/review-12-evidence/build-oracle-probe.py` | mixed | census: reading | 3 | 0 | — |

Each family with a complete output has it checked against its full member list:
- the output names its payload tree and command;
- the runner's bytes at that tree equal the pinned origin;
- its last runner line, before the wrapper's `exit:` trailer, is the runner's own summary, with the
  census total;
- its verdict lines name exactly the census members.

The generator of `ablations.mjs` (31 `diagnosticIdentity` sites) uses the input revision of its
complete output, `e19d8e7f`, which is D05-06. `ablations-03` uses `validation-05/27`, because its
later runs crashed at a stale anchor (`validation-08/27` is the partial output D05-CHK-09 names). A
test pins its refusal.

"None qualifies" means the pinned tree holds no complete output under D05-CHK-09:
- review-02, -03 and -04 outputs and K1.2 review-09's name neither the command nor the tree, and
  review-04's are argv subsets;
- review-06 recorded JSON results;
- review-11 wrote to `/tmp` only.

These families rest on the structural census alone.

## Figures against design 05 §5.2

| Figure | Design 05 | At C | Note |
|---|---:|---:|---|
| Mutation-runner origins | 20 | 20 | 19 censused structurally, 1 `census: reading` |
| Occurrences in the 19 | 390 | 390 | |
| Inheritances and reuses | 117 | 117 | 89 inherited: rebound-06 21, original-ablations-02 36, ablations-03's filter 16, ablations-04's filter 16. 28 reused: `sweeps-08` repeats `ablations-07`'s R and C members. |
| Distinct before equivalence review | about 273 | 273 | |
| `oracle-vs-mutants.mjs` | `census: reading` | 11 members, by reading | Its sealed output `review-04/probe-p4-vs-mutants.txt` names eleven of X8–X23, the mutants that survived review-04's full-suite runs. All 11 are reuses of review-04 members. |
| Mixed origins | 6 | 6 | 14 members. review-10's two regressions are censused structurally, and the rebound inherits them. `run-faults`, the two reviewed-H probes and `build-oracle-probe.py` (3 observations) are `census: reading`. review-10's six forms are probe scenarios, not family members; they close with the counterexamples. |

## Ran and not run

**Ran**, Node v26.10.0, Python 3.13.5, macOS 26.6.2 arm64:
- the tooling tests: 413, OK in 272 s, including 24 runner and census tests and 59 new refusal
  tests;
- the refusal registry census (247/247);
- the real `corpus` at the local work-in-progress commit squashed into this one (`extraction_pending`,
  families as above);
- the composed verify at this commit's C (see the commit message).

**Not run:**
- no family mutant was registered or executed, so there are no kills;
- discovery runs (tooling only);
- V5's equivalence route (D05-CHK-06) is left to its family batch, so V5 stays `pending`;
- nothing historical ran.
