# K1.1 validation-04 — raw output for clean payload C4

**Payload C4:** `1d4e4867b748f9e0b2f4041e17ded836ebc25a75`.
**Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (integrated `main`, 006/007/008/012/015 as they stand there).
**Round-1 payload C:** `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`; **H:** `0f345b3c9ab49f6c5d9e09b162641cda78f96356`; **review:** `1489227b4c80a2d059e8e71f92b233ed76bff8d5` (`review-01.md`, preserved).
**Round-2 payload C2:** `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f`; **H2:** `297cc56ff186638817e0edfba7a3ce9f103d561e` (preserved).
**Round-3 payload C3:** `615cdf884ac560aec659162353680e55f732804c`; **H3:** `b3cdf33732df1f0645e0d773917b4f82444208c5`; **review:** `3012b3c3328c49cfa15b2d4330f1bb871f53162a` (`review-02.md`, CHANGES REQUIRED, preserved).
**Integrated main (PR #26):** `05f48c204d1eae021b3464c206e5c11e84bb3505`; **main-merge into branch:** `87ee39c2832f9ebd41aa8e5b084b76af0d14ff8c`.
**Prerequisite:** K1.0 with corrections 01–02, integrated as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`,
with [parent receipt](../K1.0/integration-01.md) and [correction-02 receipt](../K1.0-correction-02/integration-01.md).
`01-tree-and-environment.log` shows every one of those commits is an ancestor of C4: nothing was
amended, rebased or reset away.
**Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Date:** 2026-09-14.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../../006-development-process.md). Every command ran
against the committed payload tree C4, whose only uncommitted content was this directory, which the
run itself writes. Nothing here introduces or changes a script, fixture, evaluator rule, threshold or
configuration; those are payload in C4 (including the unchanged `canonicalize@3.0.0` dependency and
lockfile). The ablations in `09b` modify a detached `git worktree` checkout of C4 in a temporary
directory, with `node_modules` symlinked from this checkout, never this checkout; each is reverted
before the next, and the worktree's HEAD and status are printed at the end of that log.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, cumulative and correction diffstats | 0 | every prior C/H/review commit and both prerequisite integrations are ancestors of C4; `canonicalize` stays pinned at `3.0.0` | `f0a6817615605856e0e9969086c8d7652e753e3e198f0e9c3a808b4d77a2eff7` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `63a116b091197e91fd114cc638cd44d3f170f7425b98d5183d6ec26be39ba699` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2,209 tests, 329 suites, 0 fail, 0 skipped | `5194b1a57e6ca907d332915fb3bacfb89a026c638630a9481b1fa5eb995cb9e8` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail, 0 skipped | `922c828a84ab72590f15ba1b8f51d5a42ef6302374029430ca44e792f77042e4` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `25caf90e5ec4d494f7d4f3a001e2dfe9ff19659d834f5cdd81e6c356489b3252` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 151 tests, 28 suites, 0 fail, 0 skipped | `5209ec36af442c6c6f0b35d5103ac31bbfb4297432648ee969f962a8a20790e5` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail — the public host path is unchanged | `a710faed8582644d4b0791cae2b48524fc5cbaeb62dc9e9834b5b05970c2273f` |
| [08-architecture-suite.log](08-architecture-suite.log) | `node --test --test-reporter=tap` over `tests/conformance/architecture/*.test.ts` | 0 | 362 tests, 37 suites, 0 fail | `5038f4d72283e970337a8400a1dc318a0bd68806a6866335bcbb9701ce2cbee0` |
| [09-k1.1-case-inventory.log](09-k1.1-case-inventory.log) | `node --test --test-reporter=tap` over `packages/kernel/tests/*.test.ts` | 0 | 151 tests, 28 suites, 0 fail; every case named in TAP order | `25c06c651fd0c04cbab8dbdd130b84054baa520c62fb89142c4df9009bf6071d` |
| [09b-distinguishing-ablations.log](09b-distinguishing-ablations.log) | 15 one-behaviour ablations of C4 in a detached worktree, packet cases run against each | 0 | control clean; **15 of 15 rejected** by named cases | `85ce8c88348db4c1405aca0851819ba5a9a3d52e679ea54759141dbbe65730ab` |

## What the ablations establish

Each row removes exactly one behaviour and is rejected by cases that name the invariant it removed.
Four target this round's value reconstruction, three its evidence rule, two the self-found identity
rule, and six re-check that the earlier rounds' guards are still discriminating after the rewrite.

| Ablation | Guard | Rejected by |
|---|---|---|
| member value from an ordinary read, no descriptor agreement | K11-R2-VAL-02 | 6 cases across values, creation, ingress and dispatch |
| canonical bytes from the caller's object, not the snapshot | K11-R2-VAL-02 | the changing-reads case |
| an unowned array position falls back to a dynamic read | K11-R2-VAL-02 | 2 cases (values, ingress) |
| an observation that throws escapes the boundary | K11-R2-VAL-02 | the unobservable-structure case |
| `mintReceipt` unfrozen | K11-R2-EVID-01 | 6 cases across every receipt family |
| `mintRefusal` unfrozen | K11-R2-EVID-01 | 5 cases across returned and inspected refusals |
| retained `queued` disposition mutable | K11-R2-EVID-01 | 2 cases |
| identity fields accept any boundary value | K11-R3-ID-02 | 2 cases (creation, ingress) |
| `packIdentity` joins non-text parts | K11-R3-ID-02 | the packing-injectivity case |
| snapshot members installed by assignment | K11-R1-VAL-01 | 10 cases |
| array-index test widened so `"01"` escapes | K11-R1-VAL-01 | 3 cases |
| missing ID returns before the scope scan | K11-R1-ID-01 | 4 cases |
| scope check via `includes` with an early exit | K11-R1-ID-01 | 1 case |
| `cancelExecution` accepts | K11-R1-SCOPE-01 | 3 cases |
| `JSON.stringify` substituted for the JCS substrate | K11-R1-JCS-01 | 3 cases |

The canonical-bytes-from-the-caller ablation is rejected by one case rather than many, and that is
the honest result: once capture refuses a value whose readings disagree, the *only* accepted value
that can still distinguish where the bytes were taken from is one that agrees on the reading capture
took and diverges afterwards. That case exists for exactly this reason.

## Counts this packet changes

| Figure | At base `777b995` | At C2 | At C3 | At C4 (this correction) |
|---|---|---|---|---|
| `npm test` | 2,060 tests, 302 suites | 2,172 / 324 | 2,175 / 324 | 2,209 tests, 329 suites |
| `npm run test:conformance` | 1,947 / 283 | 1,947 / 283 | 1,949 / 283 | 1,949 tests, 283 suites |
| `npm run test:kernel` | 4 tests | 116 / 23 | 117 / 23 | 151 tests, 28 suites |
| Architecture suite | 360 tests | 360 | 362 / 37 | 362 tests, 37 suites |
| `packages/kernel/src` `.ts` files | 2 | 10 | 10 | 10 (unchanged) |
| `@arrokothi/kernel` runtime exports | 2 | 18 | 18 | 17 (`sealBoundaryValue` removed, K1.1-DEC-3) |
| Target-zone third-party reach | nothing | nothing | `canonicalize` (exact `3.0.0`) | `canonicalize` (exact `3.0.0`, unchanged) |

Conformance and architecture counts are unchanged from C3: this round's controls are packet cases and
the one export-surface assertion, which lives in both the packet suite and the architecture guard.

`npm run test:evals` was not run. 006 requires it for Agent behaviour, and this correction adds no
Agent, no model path and no eval fixture; the eval suite is unchanged from base.

## What these logs do not show

They are deterministic Kernel-local evidence. They contain no E1 result, no persistence or
process-failure evidence, no native Driver observation and no packaging or release check. A green
suite is not acceptance: the per-criterion assessment in [implementation-04](../implementation-04.md)
is the implementer's, and the verdict is an independent reviewer's.
