# K1.1 validation-03 — raw output for clean payload C3

**Payload C3:** `615cdf884ac560aec659162353680e55f732804c`.
**Governing base:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (integrated `main` baseline for review-01).
**Reviewed payload C:** `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`.
**Reviewed H:** `0f345b3c9ab49f6c5d9e09b162641cda78f96356`.
**Review record:** `1489227b4c80a2d059e8e71f92b233ed76bff8d5` (`docs/development/work/K1.1/review-01.md`, preserved).
**Round-2 payload C2:** `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f`.
**Round-2 candidate H2:** `297cc56ff186638817e0edfba7a3ce9f103d561e` (preserved).
**Integrated main (PR #26):** `05f48c204d1eae021b3464c206e5c11e84bb3505`.
**Main-merge into branch:** `87ee39c2832f9ebd41aa8e5b084b76af0d14ff8c` (ordinary merge, no rebase/amend/reset).
**Prerequisite:** K1.0 with corrections 01–02, integrated as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`
with [parent receipt](../K1.0/integration-01.md) and [correction-02 receipt](../K1.0-correction-02/integration-01.md),
ledger-reconciled by PR #26; both in C3's ancestry (see `01-tree-and-environment.log`). K11-R1-PROC-01
closes on that ancestry.
**Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Date:** 2026-09-14.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../../006-development-process.md). Every command ran
against the committed payload tree C3, whose only uncommitted content was this directory, which the run
itself writes. Nothing here introduces or changes a script, fixture, evaluator rule, threshold or
configuration; those are payload in C3 (including the `canonicalize@3.0.0` dependency and lockfile).
The ablations in `09b` modify a detached `git worktree` checkout of C3 in a temporary directory (with
`node_modules` symlinked from this checkout), never this checkout, and each is reverted before the next;
the worktree's status is printed at the end of that log.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, cumulative diffstat, H2..C3 correction delta | 0 | integrated main `05f48c2` and both K1.0 receipts in C3's ancestry; main-merge..C3 is the 9-file JCS payload | `7f72e79c9bb4e2008dfff679ff92c61ed8cf9ce800e0902d81d637d4bf5067c8` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2,175 tests, 324 suites, 0 fail, 0 skipped | `08defa844439e5838663a95fd37bfa5034e9c52711057c852e6690c768349b24` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail, 0 skipped (1,947 at base/C2 plus 2 new guard controls) | `56a93f6f39736c29121ea25d515b86b9c52f861ea3890f1b54c8fe6c619229a1` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `734c26027b8fbd1a49675b9ed0bbde16e385fef04fd5adf8c88c3d52b140444b` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 117 tests, 23 suites, 0 fail, 0 skipped | `30fd0c804a42b53ac7cca7e0862fe0652076235f3ca0a6085bd974d59735146b` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail — the public host path is unchanged | `ff58ec006bb8afd9f472cad673df700dd0bfc0ce0e557148ecf17e2486676f3f` |
| [08-architecture-suite.log](08-architecture-suite.log) | `node --test --test-reporter=tap` over `tests/conformance/architecture/*.test.ts` | 0 | 362 tests, 37 suites, 0 fail (360 at C2 plus 2 new specifier controls) | `38cc43c735ca6c97704d10897a0e1133d14c23680daf845d059ae24550e5759c` |
| [09-k1.1-case-inventory.log](09-k1.1-case-inventory.log) | `node --test --test-reporter=tap` over `packages/kernel/tests/*.test.ts` | 0 | 117 tests, 23 suites, 0 fail, every case named in TAP order | `622928b7f717d77908cf4105cea52fceea66433be65e372ccff4c2fedf89b6a4` |
| [09b-distinguishing-ablations.log](09b-distinguishing-ablations.log) | 6 one-behaviour ablations of C3 in a detached worktree, packet cases run against each | 0 | every ablation is rejected by named cases (seal-assignment by 8 VAL cases, array-regex by 3 VAL cases, missing-fast-path by 4 ID cases, includes-early-exit by 1 ID case, cancel-accept by 3 C7 cases, JSON.stringify-substrate by canonical-form cases); worktree clean after reverts apart from symlinked `node_modules` | `252dc91ef813761ee2a7890033263fa49a211c2a8589fa48e762a39632e74065` |

## Counts this packet changes

| Figure | At base `777b995` | At C2 (round 2) | At C3 (this correction) |
|---|---|---|---|
| `npm test` | 2,060 tests, 302 suites | 2,172 tests, 324 suites | 2,175 tests, 324 suites |
| `npm run test:conformance` | 1,947 tests, 283 suites | 1,947 tests, 283 suites | 1,949 tests, 283 suites (+2 guard controls) |
| `npm run test:kernel` | 4 tests | 116 tests, 23 suites | 117 tests, 23 suites (+1 JCS pin) |
| Architecture suite | 360 tests | 360 tests | 362 tests, 37 suites (+2 specifier controls) |
| `packages/kernel/src` `.ts` files | 2 | 10 | 10 (unchanged) |
| Target-zone third-party reach | nothing | nothing | `canonicalize` (owner-approved exact `3.0.0`) |

`npm run test:evals` was not run. It is required by 006 for Agent behaviour, and this correction adds no
Agent, no model path and no eval fixture; the eval suite is unchanged from base.

## What these logs do not show

They are deterministic Kernel-local evidence. They contain no E1 result, no persistence or
process-failure evidence, no native Driver observation and no packaging or release check. A green
suite is not acceptance: the per-criterion assessment is the implementer's in
[implementation-03](../implementation-03.md), and the verdict is an independent reviewer's.
