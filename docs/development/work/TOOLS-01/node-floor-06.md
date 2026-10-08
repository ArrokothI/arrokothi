# TOOLS-01 — Node v22.15.0 floor: A1–A7 pass; A8 stops at the kernel-sweeps step bound

2026-10-03. Implementer: Claude Code (`claude-opus-5-5`), continuing the two GPT-6 sessions by owner
assignment. Not the design author and not a reviewer. **A1–A7 pass on v22.15.0. A8 matches across
both environments for every step through the archive tests, then fails at `kernel-sweeps`: the step
cannot finish inside its declared 900 s bound (FLOOR-06-01). A9–A11 are implemented but were not
reached in the ordered run. Stopped before step 2.** This is incremental floor evidence for design 05
§6 step 1, not clean-C packet verification, independent acceptance, conformance credit or hold
release. TOOLS-01 remains IN_PROGRESS. node-floor-01 to -05 are unchanged.

## Identity and authority

Fetched origin (`https://github.com/ArrokothI/arrokothi.git`) first. Local and remote
`codex/tools-01` were clean and equal at `e35cdd1c` (the design author's floor amendment). Read
AGENTS.md, 006, 012, contract revision 3, design 05 revision 3 (§2.3, §6's floor amendment and step
order, A1–A11), design 04, the design-05 check, both step-0 reviews, owner choices 01–02,
node-floor-01 to -05, the floor probe and its fixtures, the tooling README and `packet_tools.py`.
Re-checked A8's archive input and step runner (reviewed by the last GPT-6 session) before relying on
them: the snapshot is verified against the Git tree before and after use, `check-step.py` keeps
selected facts only, and its controls cover the pending-adoption, output-retention, empty-sweep and
snapshot-corruption cases.

Owner decision applied, verbatim: "raise the floor to 22.15", as specified in design 05 §6.

## Installation

- [SHASUMS256.txt](https://nodejs.org/dist/v22.15.0/SHASUMS256.txt): SHA-256
  `42c7a78f52b6ae792d01252af908a8febc461ed6fb98be80571d303cd43ea067`, 41 entries.
- Its one `node-v22.15.0-darwin-arm64.tar.gz` entry is
  `92eb58f54d172ed9dee320b8450f1390db629d4262c936d5c074b25a110fed02`. The downloaded archive
  (47,255,175 bytes) matched it **before extraction**.
- Extracted unchanged to `/Users/rex-shih/.local/share/arrokothi/node-v22.15.0-darwin-arm64`,
  beside the existing `node-v22.9.0-darwin-arm64`. Its binary reports `v22.15.0` (V8
  12.4.254.21-node.24); the distribution keeps its LICENSE. `/opt/homebrew/bin/node` still reports
  v25.2.1. No shell configuration, symlink or global Node changed.
- The manifest's detached signature was not checked: this host has no `gpg`. The earlier installs
  checked the manifest entry only, which is what design 05 §6 requires.

Host: macOS 26.6.2 (25G83) arm64; Python 3.13.5 (`/Users/rex-shih/anaconda3/bin/python3`).

## Floor amendment applied (commit `77922d98`)

- The embedded F4 diff (design 05 lines 506–514; 7 lines, SHA-256
  `7f9615dbb0d36241c2e54f641db15abf8c8ad9d1a605815c4e37d617f5ac7197`) passed `git apply --check`
  and `patch -p1 --dry-run`, and was applied with `git apply` unchanged.
- `AGENTS.md` ("Node 22.15+."), the root `README.md` ("with Node 22.15+"), the root `package.json`
  `engines.node` (`>=22.15.0`), the root entry of `package-lock.json`, `tests/tooling/README.md`
  ("Node 22.15+") and `check-node-floor.py`'s exact-version check (`v22.15.0`).
- `packages/sdk/package.json` and its lock entry keep `>=22.9.0`. The 89b49e53 test fix stays.
- A1 reads `details.type` `test` or absent as a test and `suite` as a suite, and refuses any other
  value (the amendment's "A1 on newer releases").
- A9–A11 implemented with fixtures, and `tests/tooling/read-trace.mjs`, the reads-phase preload
  design 05 §4 names. The [node-floor README](../../../../tests/tooling/node-floor/README.md)
  describes each check.

## Ordered run

```sh
python3 -B tests/tooling/check-node-floor.py \
  --node /Users/rex-shih/.local/share/arrokothi/node-v22.15.0-darwin-arm64/bin/node
```

Subject `77922d98783d6d51eab50d158133534bd7879b20`, clean tree; 14:45:31Z to 15:28:39Z. **Exit 1**,
`passed: false`, `complete: false`, `remaining: [A9, A10, A11]`. The declared environment passes
PATH, HOME and TMPDIR, prepends the selected Node's bin directory and sets LANG=C.UTF-8; A8 adds
the verified archive snapshot. Inherited values are not recorded.

| Check | Result on v22.15.0 |
|---|---|
| A1 | PASS. v22.15.0 sets `details.type` to `test` on test results and `suite` on suite results; starts carry no `details`. An altered copy with every `test` value removed (the v22.9.0 form) gives the same pairs. Nine pairs, five leaves, ordered parents; the eight altered-event refusals hold. |
| A2 | PASS: original UTF-16 range `[130,270)`, count 1, with the astral-character discriminator. |
| A3 | PASS: loop 2, untaken same-line throw 0, caught throwing-call assertion 1, direct throw 0, short-circuit start 1 and call 0, template text 1. The source guards stay necessary. |
| A4 | PASS: the full path selects one leaf (anchor 2 over baseline 0, siblings 0); the zero-test baseline's synthetic 1:1 pair earns no reach; multiple leaves and a passing child of a failing parent are refused. |
| A5 | PASS: TAP and event destinations agree: 5 tests, 1 suite, 5 pass, zero fail/cancel/skip/todo. |
| A6 | PASS: the pinned TypeScript 5.9.3 subset (four digests) parses and scans; no extension. |
| A7 | PASS: exact script rendering; 173 selected and reported files; 3,774 tests, 447 suites, 3,774 pass, zero fail/cancel/skip/todo. |
| A8 | **FAIL at `kernel-sweeps` (declared).** Every earlier step matched (table below). |
| A9–A11 | Not reached in the ordered run. |

A8, declared and inherited profiles, same Node:

| Step | Both profiles |
|---|---|
| Tooling tests | 158 tests, exit 0 |
| Inventory | 208 artifacts, 1,333 mentions, 8 additions; provenance verified |
| Adoption | 1,549 origins: 116 suite, 8 case, 30 non-executable, 1,395 pending; **final gate false** (the admissible pending observation) |
| Dimensions | same `coverage_reported` facts |
| Registered mutations | 98 killed case/mutation pairs, matching facts |
| Refusal mutations | 99 killed case/mutation pairs, matching facts |
| Refusal and oracle censuses | pass, matching facts |
| Typecheck | exit 0 |
| Repository tests | 3,774 tests, 447 suites, 3,774 pass; zero fail/cancel/skip/todo |
| Archive tests | 4 tests, 1 suite, 4 pass; zero fail/cancel/skip/todo; snapshot `9fd2faa7` (1,238 files, 4 symlinks, manifest `89be2e07…`) verified before and after |
| Kernel sweeps | declared: exit 1, `AssertionError` (no sweep summary lines); inherited: not run |

These mutation rows describe the existing runner's observations; they grant no new semantic credit
or hold release. The live-provider, large-memory/timing and known-base-failure profiles stay not run.

## FLOOR-06-01: the kernel-sweeps step cannot finish inside its declared 900 s bound

`checks.json` gives `kernel-sweeps` (`npm run test:kernel-sweeps`: the fault sweep, then the
four-mode poison sweep) `timeout_seconds: 900`. Under A8's declared environment the step started at
15:13:38Z and ended at 15:28:38Z, 900 s later. `command()` kills the process group at the bound;
`check-step.py` then found no `FAULT SWEEP`/`POISON SWEEP` summary lines and reported only
`AssertionError` (its exception path deliberately keeps no status or output, so the record shows the
missing summaries, not the word `timeout`). When it was stopped, the poison sweep had been in its
first mode, `off`, for about 13 minutes. The registerHooks failure of node-floor-05 is gone: `register-hooks.mjs` reports
`function` on v22.15.0.

**This bound has never fitted the full sweep on any recorded runtime.** The sealed
K1.2-correction-01 run on this host
([`validation-09/53-poison-sweep.txt`](../K1.2-correction-01/validation-09/53-poison-sweep.txt),
Node v25.2.1, 2026-09-30) took 42 + 293 + 308 + 285 = 928 s for the four poison modes alone, before
the fault sweep. The 900 s value has been in `checks.json` since its first commit (`ca0f2ad6`), and
no earlier TOOLS-01 run reached this step: on v22.9.0 the poison sweep failed at module load
(node-floor-05), and the floor runs before that stopped earlier. The bound belongs to TOOLS-01's own
verification specification; this is not a Kernel defect.

**On v22.15.0 the composed poison sweep is impractically slow, whatever the bound.** Diagnostics
after the stop, on the same subject and declared environment, with the sweep, preload and tests
unchanged ([sweep-diagnostics.json](node-floor-06/sweep-diagnostics.json)):

| Run | Result |
|---|---|
| `npm run test:kernel-sweeps`, v22.15.0, no step bound | Fault sweep passed (66 scenarios, 54,288 runs, 0 violations; 57/57 exits). The poison sweep was **still in its first mode, `off`, after 30 minutes**; I stopped it. Its `--test` runner process was at 99% CPU (29:53 CPU time) and a 2 s sample showed its main thread in JavaScript calling `Buffer#indexOf`, while every test-file child sat idle at 0% CPU. |
| Full `off` mode (`run-poison-sweep.ts --modes off`), v25.2.1 | 19 s wall; 1,712 tests pass; `POISON SWEEP PASSED`. |
| Each Kernel test file alone through the same runner, `off` mode, v22.15.0 | All 43 finish; slowest 11.4 s; sum 60.5 s. |
| Each test file as the runner's child would run it (no runner parent), `off` mode, v22.15.0 | All 43 exit 0 in 43.4 s in total, writing 2.69 MB of serialized events. |

So on v22.15.0 the tests and the preload are fast; the time goes into the `--test` runner process
when all 43 files run under one runner. That is consistent with the runner's parsing of child
output (v22.15.0's `FileTest` scans child output with `Buffer#indexOf`), but I have not proven the
cause or checked which later release changes it. Even on v25.2.1 the sealed four-mode run took
928 s, so the 900 s bound fails there too; on v22.15.0 the first mode alone exceeds 30 minutes,
so no bound within `command()`'s 3,600 s cap can hold all four modes.

**Mechanism.** The step bound was set without a measured run of the composed sweep, and nothing
compared the declared bound with the sweep's recorded duration. A8 is the first execution of the
composed step, so it is the first place the gap could appear.

**Not done.** No timeout, sweep, preload, mode list or test was changed; the sweep was not split or
moved to a profile, and no other runtime was substituted. Design 05 §6: "On any failure stop and
report; never adapt a mechanism silently."

**Owner decision needed** (the verification specification is the packet's own gate):

1. **Keep v22.15.0 and make the sweep run on it.** For example, run the poison sweep with one runner
   per file (the per-file runs above finish in about a minute in total). That changes
   `run-poison-sweep.ts`, a mapped suite origin, so it is a design change with its own review, and
   it only addresses this runner path.
2. **Raise the floor again** to a release on which the full sweep runs, chosen by measurement (a
   later 22.x or 24.x). This needs a new owner decision and install authorization, and a fresh
   A1–A11 run on that exact version.
3. **Profile the poison sweep** on a newer runtime while the floor stays v22.15.0 for every other
   step. That changes design 05's rule that every scheduled step runs on the floor, so it is an
   owner decision too.

Whichever is chosen, the 900 s step bound is wrong on every recorded runtime and needs a measured
value, or a split into `fault-sweep` and `poison-sweep` with separate bounds, under `command()`'s
3,600 s cap per step.

After the owner's choice, the change lands with its own record, A8 reruns from the start with both
profiles, and A9–A11 follow in the same ordered run before step 2.

## A9–A11 outside the ordered run

The ordered run stopped at A8, so A9–A11 have **no floor result**. After the stop I ran each check
function directly on v22.15.0 against the committed subject
([a9-a11-diagnostic.json](node-floor-06/a9-a11-diagnostic.json)); all three returned without error,
but these are diagnostics, not floor passes:

- **A9.** `--test-name-pattern='^parent child$'` runs zero tests (one synthetic pass), so no valid
  reach: a `t.test` subtest is not selectable by its full path. The stated outcome is refusal of
  such targets (the mapped origins contain none). `^parent$` runs both children; no reach is earned.
- **A10.** Isolation held under the catalog flags: two files ran in two distinct child processes,
  neither the runner's, and no global crossed between them. The order model held for a file without
  an await at load time (load first, then one leaf at a time with its hooks). It **did not hold** for
  two shapes: load-time code after an `await` (at module level, or in an async suite callback) ran
  after the first leaf started, and a registration site inside a function called after a later site
  ran after it (`y` then `x`). A10's stated rule for an order failure is the fallback "every leaf
  counts as earlier", not a stop; it would apply to every file.
- **A11.** Through `NODE_OPTIONS=--import=<absolute path>`, the preload loaded once in the test child
  and recorded all eleven access forms (default, named and CommonJS `node:fs`, the `promises`
  property, named and namespace `node:fs/promises`, a callback and a stream) with the same summary
  counts as an untraced run; without a declared trace file the child refused to start. The `--test`
  runner process itself emitted no preload row, so its own reads (glob expansion) are not traced.

**Consequence of A10's fallback, for the owner (not acted on).** A trial of my step-6 prefix analysis
over the eight changed files gives 329 span-identical members, matching design 05 §5.1. Without the
fallback it keeps 47 (ingress 33, nondisclosure 14), matching §2.3; with the fallback it keeps 33,
because nondisclosure's inserted later leaves become earlier. This trial is unreviewed scratch code
and not step-6 evidence. A narrower rule (the fallback only for files with a load-time await or a
registration inside a function body) would be a design change, and is not proposed as implemented.

## Other consequences noted for later steps

- `verification.json` preserves `AGENTS.md` from base `f62527e8`. The owner-directed floor edit to
  AGENTS.md means the `candidate` check will refuse that path at step 12 unless the specification at
  C re-pins it. Recorded now so it is not discovered as a surprise; not changed here.
- Step 2 must carry the archive snapshot into composed `verify`, as node-floor-05 required.

## Evidence

[manifest.json](node-floor-06/manifest.json) records the subject, runtimes, the executed floor
sources' SHA-256 values and the attachment digests:

- `floor-a1-a8.json.gz`: the complete JSON of the ordered run (raw A1–A7 events and coverage,
  selected A8 facts); read with Python's `gzip.open(path, 'rt')`.
- `sweep-diagnostics.json`: the step's timing, the unbounded v22.15.0 run, the v25.2.1 `off` run, and
  per-file runner and child timings with output sizes; diagnostics, not floor results.
- `a9-a11-diagnostic.json`: the A9–A11 check functions run directly on v22.15.0 against the
  committed subject after the stop, with their argv and exits; diagnostics, not floor results.
- `step-controls.json`, `archive-controls.json`: A8's negative controls, rerun and passing.

Validation: Python syntax and Node v22.15.0 `--check` of the floor sources, `npm run typecheck` on
v22.15.0 (exit 0) before the commit, `git diff --check`, local links and attachment digests.

## Scope

Changes: the floor amendment files listed above, floor tooling and fixtures, `read-trace.mjs`, this
record and its evidence. No production, Layer-3, sealed-record, 007, mapping or `fault-oracle.ts`
edit. No dependency or copied third-party source; the Node distribution is the owner-authorized
runtime, and reading its documentation supplied API facts only. V-D1, Proxy and re-prototyped
built-ins stay with K1.1-correction-03; V-ENV stays with BINDING-01. The design author owns the 007
entry. No review-ready state or acceptance is claimed. Steps 2–12 are unstarted.
