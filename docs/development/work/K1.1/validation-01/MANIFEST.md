# K1.1 validation-01 — raw output for clean payload C

**Payload C:** `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`.
**Base:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (integrated `main`).
**Prerequisite:** K1.0 with corrections 01–02, integrated as `4f02e6cad2dbc9d5444fededbdc27f0dc695060d`,
verified an ancestor of C in `01-tree-and-environment.log`.
**Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Date:** 2026-09-14.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../../006-development-process.md). Every command ran
against the committed payload tree, whose only uncommitted content was this directory, which the run
itself writes. Nothing here introduces or changes a script, fixture, evaluator rule, threshold or
configuration; those are payload in C. The ablations in `09b` modify a detached `git worktree`
checkout of C in a temporary directory, never this checkout, and each is reverted before the next;
the worktree's status is printed at the end of that log.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, cumulative diffstat, unrelated-path checks, zone contents and vocabulary scan | 0 | base and the K1.0 integration are ancestors of C; 26 files changed, 4,104 insertions, 61 deletions; `packages/core`, `packages/sdk`, every provider package, `examples/`, `docs/guides/`, `tests/conformance/k0` and 006/007/008/012/015 are untouched; the only K1.0 record changed is the live `ownership-inventory.md`; the zone holds 10 `.ts` files and imports only relative paths and `node:buffer`; the manifests are unchanged, so the package is still `private` with one export; no Agent/Workflow or legacy controller vocabulary in executable text | `4e4aa4696c28fafbd2d72fa4d22400d1fa5aa882eec810f1946935f85eebdca0` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `01307edcae7d96c62f88a1e2978488c499431d0784d3e0de4ddb518de8778f3b` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2,161 tests, 323 suites, 0 fail, 0 skipped | `6ca820a478b619d17634cede828145f787dbf26e2de87ad1c1fbcae057dc065a` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1,947 tests, 283 suites, 0 fail, 0 skipped | `2c03f549319e86d4533c0012f693307890cbb3e7c9a276d366809646df2debb9` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `cf9c2d9c29ec03dd7f5cdbfa8a01f0d74a4803140a73f5760ebf5ada64400c00` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 105 tests, 0 fail, 0 skipped | `2654bd3210be46e6055ae6fed3732b8e0a15e77d1f8f70dc412abb70f6d05c83` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail — the public host path is unchanged | `f9031e43556c3bbb054033e6eeff702cb0a64eb6af355470fe01114f93352050` |
| [08-architecture-suite.log](08-architecture-suite.log) | `node --test --test-reporter=tap` over `tests/conformance/architecture/*.test.ts` | 0 | 360 tests, 0 fail, 0 skipped — K1.0's guard still passes against the changed tree, at the same count it had at its own acceptance | `071ff38bc36cf035a145f352056d5c3b771b666d1714b3ca4ec1102b498956a3` |
| [09-k1.1-case-inventory.log](09-k1.1-case-inventory.log) | `node --test --test-reporter=tap` over `packages/kernel/tests/*.test.ts` | 0 | 105 tests, 22 suites, 0 fail, 0 skipped, every case named in TAP order so coverage can be read rather than counted | `8e551a8dfb477ae413add505aa4fd111d10fa8eb533ec0d79817f3026c1b5dab` |
| [09b-distinguishing-ablations.log](09b-distinguishing-ablations.log) | 16 one-behaviour ablations of C in a detached worktree, this packet's cases run against each | 0 | every ablation is rejected, by 1 to 7 named cases each; the worktree is clean after the last revert | `2433696c99f14dc67577b6d309245dd0f05e228296701c67456b712b12853fa3` |

## Counts this packet changes

| Figure | At base `777b995` | At this C |
|---|---|---|
| `npm test` | 2,060 tests, 302 suites | 2,161 tests, 323 suites |
| `npm run test:conformance` | 1,947 tests, 283 suites | 1,947 tests, 283 suites (unchanged) |
| `npm run test:kernel` | 4 tests | 105 tests |
| Architecture suite | 360 tests | 360 tests (unchanged; assertions updated to the measured tree, none removed) |
| `packages/kernel/src` `.ts` files | 2 | 10 |

`npm run test:evals` was not run. It is required by 006 for Agent behaviour, and this packet adds no
Agent, no model path and no eval fixture; the eval suite is unchanged from base.

## What these logs do not show

They are deterministic Kernel-local evidence. They contain no E1 result, no persistence or
process-failure evidence, no native Driver observation and no packaging or release check. A green
suite is not acceptance: the per-criterion assessment is the implementer's in
[implementation-01](../implementation-01.md), and the verdict is an independent reviewer's.
