# TOOLS-01 — archive setup verified; Node floor stops at poison-sweep hooks

Date: 2026-10-03. Implementer: GPT-6. Base:
`2ae9112d2551e618107cbbae9a9888d155910c96`, branch `codex/tools-01`.

## Remote changes reviewed first

The owner asked to continue and to check the remote GPT-6 work first. Fetched the configured
`https://github.com/ArrokothI/arrokothi.git` remote and checked the complete changes since
`93eb33634159ba4ecb4bfbd16970ee83932b8c4f`:

- `89b49e53`: the authorized test prerequisite, identical to the local timer fix already made.
- `5b0a3572`: the unfinished A8 probe; superseded by the next commit's review and corrections.
- `2ae9112d`: separates pending-adoption observation from final success, retains selected A8
  facts without arbitrary inherited output, requires nonempty sweep summaries and counts, and
  records the missing archive-input stop in [node-floor-04](node-floor-04.md).

All eleven delivered-source hashes and five attachment hashes in that record match. Its A8
negative controls pass locally. The changes are suitable to continue implementation; this is
an implementer's inspection, not independent packet acceptance. The other machine's Node
v26.8.1 results remain attributed to that machine.

One local A1–A8 process was already running when the shared checkout advanced. Its archive-input
failure is diagnostic only: it mixed the previously loaded runner with changed helper bytes.
It is excluded from this record's validation. The new ordered run uses the sources identified
in this record's manifest and the unchanged base above for pinned operations.

## Owner decision and local runtime results

The owner directed the implementer to hold an ordinary referenced timer around the budget loop,
clear it in `finally`, and explain that it stands in for real host handles while the budget's
own timer remains unreferenced. No keepalive belongs in tooling or the minimal reproduction.

The fixed test is
`tests/conformance/effects/fast-slow-equivalence.test.ts`. Before editing, the local check found
no reference to that path in adoption.json; expanding both pinned catalogs and the eight
additional sources found **1,549 origins and zero matching paths**. No suite target names it.
The remote continuation independently recorded the same result. All original assertions remain.
No production file or mapping changed.

Reused the official checksum-verified Node v22.9.0 installation recorded in
[node-floor-03](node-floor-03.md):
`/Users/rex-shih/.local/share/arrokothi/node-v22.9.0-darwin-arm64/bin/node`.
The existing runtime remains `/opt/homebrew/bin/node`, v25.2.1. No reinstall or shell change.
Host: macOS 26.6.2 arm64; Python 3.14.6.

| Local run after the timer fix | Node v22.9.0 | Node v25.2.1 |
|---|---|---|
| Corrected conformance file | exit 0; 7 pass, 0 cancelled | exit 0; 7 pass, 0 cancelled |
| Unchanged `unref-budget.ts` | exit 1; 0 pass, 1 cancelled | exit 0; 1 pass, 0 cancelled |

These runs preceded the remote diff inspection; their tested file bytes equal the current
bytes. They are retained with their events and counts. The reproduction's SHA-256 remains
`831c42697736270eee56e0073ebd7d59c0790e3e59b44d98f76283539eb17695`.
Its Node 22.9 cancellation is an expected diagnostic, not a passing floor test or a kill.

## FLOOR-04-01: explicit archive setup

[Archive retention](../../archive.md) already identifies the byte-identical Git fallback at
`9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49`. Design 05 §4 allows explicit environment settings
and calls PATH/HOME/TMPDIR/LANG the **default**. The owner's continuation is implemented using
that existing setup contract; no archive threshold, command, test or design rule changes.

A8 now extracts that fixed snapshot into a temporary directory outside the checkout. It checks
the complete path set, entry kinds, and every file's bytes or symlink target against the pinned
Git blobs before use and again before cleanup. All **1,238 regular files and four symlinks**
match. A sorted manifest of paths, Git modes and SHA-256 values has digest
`89be2e0728a835c5ecd943231c18d14ea7a1d207c6aea5e659d84935101887e7`.

Both A8 profiles explicitly set `ARROKOTHI_EVIDENCE_ROOT` to the verified temporary snapshot.
An inherited root cannot choose different bytes. Records name the setting and pinned input
without serializing inherited values. This reproduces the historical source snapshot; it does
not claim possession of the owner-held tarball or its separate cleanup-validation attachments.
The archive test needs the source snapshot only. Step 2 must carry this same explicit input
into composed command execution when that implementation step is reached.

The new archive controls reject changed bytes, a missing file, an extra file and a symlink
replaced by a regular file, then verify the restored snapshot. Existing A8 controls continue
to reject changed pending counts, arbitrary output retention and empty sweep summaries.

A focused invocation of the unchanged `archive-tests` step under the declared Node v22.9.0
environment exits 0: four tests, one suite, four pass and zero fail/cancel/skip/todo. The snapshot
still matches after the command. This validates the supplied input; it does not replace A8's
ordered comparison of both environments.

## Ordered floor run

```sh
python3 -B tests/tooling/check-node-floor.py \
  --node /Users/rex-shih/.local/share/arrokothi/node-v22.9.0-darwin-arm64/bin/node --through 8
```

The command exits 1, `passed: false`, `complete: false`. A1–A7 pass again with their original
assumptions and fixtures unchanged. A7 selects/reports 173 files and records 3,774 tests,
447 suites, 3,774 pass and zero fail/cancel/skip/todo. A8 stops at its last required step,
`kernel-sweeps`, under the declared environment. It never runs the inherited sweep comparison.

| A8 step | Declared and inherited comparison |
|---|---|
| Tooling tests | Both pass; 158 tests |
| Inventory | Same facts: 208 artifacts, 1,333 mentions, eight additions |
| Adoption | Same 1,549 origins: 116 suite, eight case, 30 non-executable, 1,395 pending; final gate remains false |
| Dimensions | Same coverage facts and gaps |
| Registered mutations | Both report 98 killed case/mutation pairs with matching facts |
| Refusal mutations | Both report 99 killed case/mutation pairs with matching facts |
| Refusal and oracle censuses | Both pass with matching census facts |
| Typecheck | Both exit 0 |
| Repository tests | Both exit 0; 3,774 tests, 447 suites, 3,774 pass; zero fail/cancel/skip/todo |
| Archive tests | Both exit 0; four tests, one suite, four pass; zero fail/cancel/skip/todo |
| Kernel sweeps | **Declared fails, exit 1; inherited not run** |

The snapshot verifies unchanged after A8, including its failed sweep step. A9–A11 and steps
2–12 remain unimplemented and unrun. These observations grant no new semantic credit or hold
release. No complete floor, clean-C verification or packet acceptance is claimed.

## FLOOR-05-01: the mandatory poison sweep requires a newer Node API

The fault portion of `npm run test:kernel-sweeps` passes: 66 scenarios, 54,288 runs, zero
violations and 35 intercepted operations; all 57 inventoried exits are taken. The following
poison portion fails in **all four modes**, including `off`:

- Each mode reports 43 tests, zero pass, 43 fail and zero cancel/skip/todo.
- Every file fails to load `packages/kernel/tests/sweep/preload.ts:19` because `node:module`
  does not export `registerHooks` on Node v22.9.0.
- No per-file poison reports are written. The summary has zero windows, calls and firings,
  and `POISON SWEEP FAILED: 176 problems`. Those zeroes reflect missing instrumentation,
  not a successful poison run or evidence of absent Kernel reads.

The new independent diagnostic `tests/tooling/node-floor/register-hooks.mjs` imports only that
named export and reports its type. Under the same declared runtime environment it exits 1 on
v22.9.0 with the missing-export error, and exits 0 on v25.2.1 with type `function`. It installs
no hooks and supplies no fallback. The original unref diagnostic stays unchanged.

**Mechanism and origin.** The existing preload imports `registerHooks` unconditionally, then
uses its synchronous `resolve`/`load` hooks at line 139 to route Kernel imports through poison
windows. The import therefore fails before test registration, even in the unpoisoned control.
The API use entered in `81dca4575ea56cfdde5b5f8ed72c439c7ec31821`, K1.2-correction-01 revision 9.
The bounded search of current `packages`, `scripts` and `tests`, excluding the new diagnostic,
finds this single source user.
This is an earlier test-instrumentation/runtime-support mismatch, not a demonstrated Kernel
semantic defect. The newer-runtime tests did not establish compatibility with 22.9.

Node's [v22.15.0 module documentation](https://nodejs.org/download/release/v22.15.0/docs/api/module.html#moduleregisterhooksoptions)
dates `registerHooks` to v22.15.0. It distinguishes synchronous hooks on the loading thread
from `register()`'s asynchronous loader-thread hooks. Replacing one with the other changes
the instrumentation mechanism; simply omitting the hook loses the direct-import windows.
No such replacement is made here. Reading the documentation supplied API/version facts only;
no third-party code was copied or adapted.

**Required owner/design decision.** Design 05 A8 requires every scheduled step at exactly
22.9.0, but the existing mandatory sweep cannot load there. Choose either a revised, freshly
verified runtime floor that supplies the required API (22.15.0 is the documented introduction,
not a claim that the whole floor passes there), or an explicitly designed and authorized
22.9-compatible sweep implementation. A separate runtime profile would also require changing
the current all-steps floor rule. This continuation neither raises the floor nor weakens or
skips the sweep, changes its preload, or substitutes another runtime for it.

Design 05 §6 requires: “On any failure stop and report; never adapt a mechanism silently.”
Dependent work stops at this failure. The inherited sweep comparison, A9–A11 and steps 2–12
are the exact remainder after the runtime-support decision and revalidation.

## Evidence and scope

[manifest.json](node-floor-05/manifest.json) records the base, runtime/environment, source and
attachment SHA-256 values, and the distinction between the executed source set and the later
diagnostic. Its attachments contain:

- `floor-a1-a8.json.gz`: the new ordered run, including raw A1–A7 events/coverage and selected
  A8 facts; no arbitrary inherited child output or environment values.
- `runtime-comparison.json.gz`: the local fixed-test and unchanged-unref runs on both runtimes;
  passed environment values are omitted from the retained copy.
- `archive-focused.json`, `archive-controls.json`, `step-controls.json`, `adoption-scan.json`:
  the focused archive success, distinguishing controls and unchanged-origin check.
- `poison-off.txt.gz`, `poison-count.txt.gz`, `poison-throw.txt.gz`, `poison-reenter.txt.gz`:
  complete per-mode outputs from the failed declared run, each with 43 missing-export errors.
- `register-hooks.json`: the minimal diagnostic's argv, exits and output on both runtimes.

Read compressed attachments with Python's stdlib `gzip.open(path, 'rt')`. The source checkpoint
and final check confirm HEAD and all floor sources used in the ordered run stayed unchanged
during it. The later diagnostic and README/report edits do not change the executed checks.

Validation also includes Python syntax, Node v22.9.0 syntax checks for the floor `.mjs` files,
local record links, attachment/source digests and `git diff --check`. The missing export is a
module-link failure; a successful syntax check of its diagnostic does not establish support.

Only floor tooling, a diagnostic, README and this new record/evidence are changed from the
remote continuation. No production, Layer-3, sealed record, 007, mapping or `fault-oracle.ts`
edit; no dependency or copied third-party source. The owner-approved test fix remains exactly
as committed remotely. V-D1, Proxy and re-prototyped built-ins remain with K1.1-correction-03;
V-ENV remains with BINDING-01. The design author owns 007. No review-ready state or acceptance.
