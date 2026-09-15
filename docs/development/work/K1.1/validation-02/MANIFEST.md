# K1.1 validation-02 — raw output for clean payload C2

**Payload C2:** `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f`.
**Base:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (integrated `main`).
**Reviewed payload C:** `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`.
**Reviewed H:** `0f345b3c9ab49f6c5d9e09b162641cda78f96356`.
**Review record:** `1489227b4c80a2d059e8e71f92b233ed76bff8d5` (`docs/development/work/K1.1/review-01.md`, preserved).
**Prerequisite:** K1.0 with corrections 01–02, integrated as `4f02e6cad2dbc9d5444fededbdc27f0dc695060d`,
verified an ancestor of C2 in `01-tree-and-environment.log`.
**Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Date:** 2026-09-14.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../../006-development-process.md). Every command ran
against the committed payload tree C2, whose only uncommitted content was this directory, which the run
itself writes. Nothing here introduces or changes a script, fixture, evaluator rule, threshold or
configuration; those are payload in C2. The ablations in `09b` modify a detached `git worktree`
checkout of C2 in a temporary directory (with `node_modules` symlinked from this checkout), never this
checkout, and each is reverted before the next; the worktree's status is printed at the end of that log.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, cumulative diffstat, correction delta | 0 | base and the K1.0 integration are ancestors of C2; base..C2 cumulative plus H..C2 correction delta recorded | `c9439995c1872cbca778cce10e4432a52efd63b53fb085558ce889e06db738c2` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2,172 tests, 324 suites, 0 fail, 0 skipped | `4e55047129fc81d118a0123bd078f1f8ffcdc9c7b3b9806ac9e0172b8573391e` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1,947 tests, 283 suites, 0 fail, 0 skipped | `be962ebb5bed8796b5d1f2729626f05d7f5314ddc427f916fb0bc3f57f77759b` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `734c26027b8fbd1a49675b9ed0bbde16e385fef04fd5adf8c88c3d52b140444b` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 116 tests, 23 suites, 0 fail, 0 skipped | `1c62f700a705a02e9ee55191dea3078decb92c1796eefda91523e7018acd1445` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail — the public host path is unchanged | `b3bd6feef6c0ac6017fa1638bfadb5cbf788f7e02c27985563bb82a2abf3f374` |
| [08-architecture-suite.log](08-architecture-suite.log) | `node --test --test-reporter=tap` over `tests/conformance/architecture/*.test.ts` | 0 | 360 tests, 37 suites, 0 fail — K1.0's guard still passes at the same count | `26059eaf78ddf2d2054d6ad387b4b62a5fdbf3eeaae0674ccfa7d5c9e9567fe2` |
| [09-k1.1-case-inventory.log](09-k1.1-case-inventory.log) | `node --test --test-reporter=tap` over `packages/kernel/tests/*.test.ts` | 0 | 116 tests, 23 suites, 0 fail, every case named in TAP order | `a4d264fdc979e8ea2d2e04833537e3e652d5512437ddab8cb9b78b772ee45fba` |
| [09b-distinguishing-ablations.log](09b-distinguishing-ablations.log) | 5 one-behaviour ablations of C2 in a detached worktree, packet cases run against each | 0 | every ablation is rejected by named cases (seal-assignment by 8 VAL cases, 01-regex by 3 VAL cases, missing-fast-path by 4 ID cases, includes-early-exit by 1 ID case, cancel-accept by 3 SCOPE/C7 cases); worktree clean after reverts apart from symlinked `node_modules` | `c4f7c80c226fad2652490973730f4475ec832a09e06af489e876a98aa5f38d58` |

## Counts this packet changes

| Figure | At base `777b995` | At C (round 1) | At C2 (this correction) |
|---|---|---|---|
| `npm test` | 2,060 tests, 302 suites | 2,161 tests, 323 suites | 2,172 tests, 324 suites |
| `npm run test:conformance` | 1,947 tests, 283 suites | 1,947 tests, 283 suites | 1,947 tests, 283 suites (unchanged) |
| `npm run test:kernel` | 4 tests | 105 tests | 116 tests, 23 suites |
| Architecture suite | 360 tests | 360 tests | 360 tests (unchanged count; one prose comment updated, no assertion weakened) |
| `packages/kernel/src` `.ts` files | 2 | 10 | 10 (unchanged; no src file added or removed) |

`npm run test:evals` was not run. It is required by 006 for Agent behaviour, and this correction adds no
Agent, no model path and no eval fixture; the eval suite is unchanged from base.

## What these logs do not show

They are deterministic Kernel-local evidence. They contain no E1 result, no persistence or
process-failure evidence, no native Driver observation and no packaging or release check. A green
suite is not acceptance: the per-criterion assessment is the implementer's in
[implementation-02](../implementation-02.md), and the verdict is an independent reviewer's. This
correction remains non-review-ready on owner blockers K11-R1-JCS-01 and K11-R1-PROC-01; see that report.
