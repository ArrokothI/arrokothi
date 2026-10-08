# TOOLS-01 — Node v26.10.0 floor: A1–A11 complete

2026-10-03. Implementer: Claude Code (`claude-opus-5-5`), by owner assignment; not the design author
and not a reviewer. **The ordered floor run on exactly v26.10.0 passes all eleven assumptions
(`complete: true`). A9 records that a `t.test` subtest cannot be selected by its full path (such
targets are refused); A10's order model does not hold, so its stated fallback applies: every leaf
counts as earlier.** This is incremental floor evidence for design 05 §6 step 1, not clean-C packet
verification, independent acceptance, conformance credit or hold release. TOOLS-01 remains
IN_PROGRESS. node-floor-01 to -06 are unchanged.

## Authority and installation

[Owner choice 03](owner-choice-03.md) raised the floor to exactly v26.10.0 after
[node-floor-06](node-floor-06.md) stopped at A8, and authorized the install. It supersedes design
05 §6's v22.15.0 floor; the same files changed (commit `3a5d78dd`), and `packages/sdk` keeps
`>=22.9.0`.

- [SHASUMS256.txt](https://nodejs.org/dist/v26.10.0/SHASUMS256.txt): SHA-256
  `60588158620d74dd4b130f7ad972ad535571c476cdc4b17fcfd9c4155d3ed2e3`, 34 entries.
- Its `node-v26.10.0-darwin-arm64.tar.gz` entry, `751fdf7439f115d87ee2a8f3f18c065b6151852068e3e666ac60ac2996f75ac9`,
  matched the downloaded archive (58,175,384 bytes) **before extraction**. The manifest signature was
  not checked (no `gpg` on this host), as with the earlier installs.
- Extracted unchanged to `/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64` beside
  v22.9.0 and v22.15.0; reports `v26.10.0`, V8 14.6.202.34-node.34, npm 11.19.1. `/opt/homebrew/bin/node`
  still reports v25.2.1. No shell configuration or global link changed.

Host: macOS 26.6.2 (25G83) arm64; Python 3.13.5.

**Sweep timing first.** Before the ordered run I timed the unchanged `npm run test:kernel-sweeps` on
v26.10.0 under the floor's declared environment without a step bound
([sweep-timing.json](node-floor-07/sweep-timing.json)): exit 0 in **413 s**, inside the 900 s step
bound. Poison modes: `off` 16 s, `count` 105 s, `throw` 112 s, `reenter` 113 s; the window, call and
firing counts equal the sealed v25.2.1 run of K1.2-correction-01 validation-09. So FLOOR-06-01's
bound question did not need an owner decision on this floor; the bound stays 900 s.

## Ordered run

```sh
python3 -B tests/tooling/check-node-floor.py \
  --node /Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin/node
```

Subject `3a5d78dd`, clean tree; 17:21:33Z to 18:01:36Z. **Exit 0**, `passed: true`,
`complete: true`, nothing remaining. Declared environment: PATH, HOME and TMPDIR passed, the selected
Node's bin prepended, LANG=C.UTF-8; A8 adds the verified archive snapshot. No inherited value is
recorded.

| Check | Result on v26.10.0 |
|---|---|
| A1 | PASS. Results carry `details.type` `test` (tests) and `suite` (suites); starts carry no `details`. The v22.9.0 form (field absent) gives the same pairs. Nine pairs, five leaves, ordered parents; all eight altered-event refusals hold. |
| A2 | PASS: original UTF-16 range `[130,270)`, count 1. |
| A3 | PASS: loop 2, untaken same-line throw 0, caught throwing-call assertion 1, direct throw 0, short-circuit start 1 and call 0, template text 1. |
| A4 | PASS: one full-path leaf (anchor 2 over baseline 0, siblings 0); synthetic 1:1 baseline pair earns nothing; multiple leaves and a failing parent refused. |
| A5 | PASS: TAP and event destinations agree (5 tests, 1 suite, 5 pass). |
| A6 | PASS: pinned TypeScript 5.9.3 subset, four digests, parser and scanner. |
| A7 | PASS: exact script rendering; 173 selected and reported files; 3,774 tests, 447 suites, 3,774 pass, zero fail/cancel/skip/todo. |
| A8 | PASS: every `checks.json` step matched across the declared and inherited environments (table below). |
| A9 | PASS (capability recorded): `^parent child$` runs zero tests, so a `t.test` subtest is **not** selectable by full path and such a target is refused. `^parent$` runs both children and earns no reach. The mapped origins contain no subtest. |
| A10 | PASS for isolation: two files ran in two distinct child processes, neither the runner's, with no shared globals. **Order model does not hold**: a file without a load-time await matches it exactly, but load-time code after an `await` (module level, and in an async suite callback) ran after the first leaf started, and a registration inside a function called after a later site ran after it (`y` then `x`). Stated fallback applies: **every leaf counts as earlier** (design 05 §2.3 rule 1). |
| A11 | PASS: through `NODE_OPTIONS=--import=<absolute path>` the preload loaded once in the test child and recorded all eleven access forms, with summary counts equal to an untraced run; without a declared trace file the child refuses to start. The `--test` runner emitted no preload row. On v26.10.0 the child's trace also shows `openSync`, `readFileSync` and `realpathSync` of repository paths (module loading through public `fs`); the reads phase sets aside the static import closure. |

A8, declared and inherited profiles:

| Step | Both profiles |
|---|---|
| Tooling tests | 158 tests, exit 0 |
| Inventory | 208 artifacts, 1,333 mentions, 8 additions |
| Adoption | 1,549 origins: 116 suite, 8 case, 30 non-executable, 1,395 pending; final gate false (the admissible pending observation) |
| Dimensions | same `coverage_reported` facts |
| Registered / refusal mutations | 98 and 99 killed case/mutation pairs, matching facts |
| Refusal and oracle censuses | pass, matching facts |
| Typecheck | exit 0 |
| Repository tests | 3,774 tests, 447 suites, 3,774 pass; zero fail/cancel/skip/todo |
| Archive tests | 4 tests, 1 suite, 4 pass; snapshot `9fd2faa7` (1,238 files, 4 symlinks, manifest `89be2e07…`) verified before and after |
| Kernel sweeps | Fault sweep passed (66 scenarios, 54,288 runs, 0 violations; 57/57 exits); poison sweep passed in all four modes, 1,712 tests each, 11,532 windows and 11,578 traced calls per run, zero zone firings |

These mutation rows are the existing runner's observations, with no new semantic credit or hold
release. The live-provider, large-memory/timing and known-base-failure profiles stay not run.

## Consequences carried into the next steps

- **A10 fallback.** Design 05 §2.3 states it: when A10 fails, every leaf counts as earlier, in every
  file. Step 6's prefix census applies it. A trial of my (then unreviewed) prefix analysis gave 47 kept
  members without the fallback, matching design 05, and 33 with it, because nondisclosure's inserted
  later leaves become earlier. Step 6 records the actual figures and explains the difference.
- **A9.** A target that is a `t.test` subtest is refused.
- **A11.** `read-trace.mjs` is the reads-phase preload; the runner process is untraced (it only
  expands globs and spawns children).
- **FLOOR-06-01's bound.** The 900 s `kernel-sweeps` bound holds on this floor with 487 s of margin.
  It did not hold on v25.2.1 in the sealed K1.2-correction-01 run (928 s for poison alone); that
  history stays in node-floor-06.
- **Step 12.** `verification.json` preserves `AGENTS.md` from base `f62527e8`, which the floor edits
  change; the specification at C must re-pin it.

## Evidence

[manifest.json](node-floor-07/manifest.json) holds the subject, runtime, executed floor source digests
and attachment digests:

- `floor-a1-a11.json.gz`: the complete JSON of the ordered run (raw A1–A7 and A9–A11 events and
  coverage, selected A8 facts); read with Python's `gzip.open(path, 'rt')`.
- `sweep-timing.json`: the pre-run sweep timing; a diagnostic, not a floor result.

## Scope

Only this record and its evidence change in this commit; the floor change itself is `3a5d78dd`. No
production, Layer-3, sealed-record, 007, mapping or `fault-oracle.ts` edit; no dependency or copied
third-party source. V-D1, Proxy and re-prototyped built-ins stay with K1.1-correction-03; V-ENV stays
with BINDING-01. Step 1 is complete; steps 2–12 follow in design 05's order.
