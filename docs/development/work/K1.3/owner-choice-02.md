# K1.3 — owner choice 02: the race search is a sweep, outside the poison sweep

**Record type:** owner decision. It answers the implementer's question after Packet verify run `40280293990` at
C `7d9be1bc33d719d3758cda2389d758ceb60f4690` failed on its `kernel-sweeps` check. Recorded on 2026-10-26 by the K1.3
implementer's Claude Code desktop session (`claude-opus-5-5`), at the owner's instruction. The owner's words,
verbatim:

```text
Exclude race-search.test.ts from the poison sweep as a sweep itself, citing the coverage comparison; then
re-verify and redispatch.
```

## The failure

Every check of run `40280293990` passed except `kernel-sweeps`, which reached its 2,400 s limit. The fault sweep
passed (72 scenarios, 16,680 runs, 0 violations). The poison sweep ran each Kernel test file under
`preload.ts` in four modes; each boundary call opens a window that installs the 400 poisoned names.

| CI seconds per poison mode | `off` | `count` | `throw` | `reenter` |
|---|---|---|---|---|
| TOOLS-02 run `40181329943`, before K1.3 (51 files, 327 names) | 62 | 154 | 154 | 154 |
| K1.3 run `40280293990` (61 files, 400 names) | 75 | 1,134 | 1,147 | stopped at the limit |

`race-search.test.ts` alone, in `count` mode on the implementer's Mac, took 591 s for 11 tests and 38,361
windows. The new scenario files took 3–6 s each: `cancellation` 5 s, `waits-timers` 4 s,
`execution-deadline` 3 s. The race search is a bounded search over schedules (K13-9). It drives the same Kernel
paths in many orders, as the fault sweep drives each scenario through every fault position.

## The decision

`run-poison-sweep.ts` lists `race-search.test.ts` in `EXCLUDED_FILES`, beside the two sweeps already there
(`poison-catalog.test.ts`, `fault-sweep.test.ts`). Its comment cites this record. Nothing else changes:
- The poison sweep's name set, modes and verdict rules stay as they were.
- The race search still runs in `repository-tests`, and in full as the `race-search` check.
- The poisoned scope keeps every K1.3 scenario file.

## The coverage comparison

The comparison used V8 block coverage (`NODE_V8_COVERAGE`) at C `7d9be1bc`. Its Kernel source is identical at
the next C, which changes only the sweep runner and records. It compared two runs:
- `race-search.test.ts` alone: 11 tests.
- The other 59 files of the poison sweep's scope: 2,072 tests.

A byte of `packages/kernel/src` counts as covered when the innermost block range containing it ran.

- **Race search minus scenarios:** 0 bytes. The race search reaches no Kernel source byte that the scenario
  files do not reach (17 files covered, against 18).
- **Control, scenarios minus race search:** 13 files have bytes only the scenarios reach. Examples are the
  refusal, diagnostic, delivery-failure and discarded-fire paths in `coordinator.ts` and `outcome.ts`, the
  unusable-clock branches of `time.ts`, and all of `json-transport.ts`.

**Limit of the argument.** It is code coverage, not data coverage. The same block reached with other values
could read other members. The zone guards, through `zone-analysis.ts` and `ambient-reads.test.ts`, restrict zone
reads to declared members. That bounds the gap, but the comparison does not close it.

**Reproduce.** Use [coverage-compare.py](owner-choice-02/coverage-compare.py); its docstring gives the two
coverage runs and the comparison command.

## Effect on the process

There is no new design check. The fix lands in a new C. The fresh-clone verify and Packet verify are repeated at
that C, and implementation report 01 records this choice. Acceptance still needs the independent C/H review.
