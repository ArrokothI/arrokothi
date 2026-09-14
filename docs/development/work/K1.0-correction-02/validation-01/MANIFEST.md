# K1.0-correction-02 validation-01 — raw output for clean payload C

**Payload C:** `95d74530f37c7af8706ef92d29574425a39afcf1`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**K1.0's own accepted H:** `f3aa29d7ecba2a23aa85788b7efdebdd383cab24`, over clean payload C16 `d693d59aefe5335c8950d57cec6d6b57e375cadc`, acceptance record A `36595f57d1f8cec8c4bf8a6293e888ca27750fab` ([review-17](../../K1.0/review-17.md)).
**Correction-01's accepted H:** `1295c68b03ae5d8eb0bbb86e974353402ff9a518`, over clean payload C `36460438e95e968beec0b354b07a616b53981256`, acceptance record A `41728edfc3cfc5c745e4293c511a740942f7b631` ([review-02](../../K1.0-correction-01/review-02.md)). Both ACCEPTs are preserved byte-unchanged; their C4 claims and integration are held.
**Deciding record for this round:** [cleanup-01](../../K1.0-correction-01/cleanup-01.md) — **K10-CORR1-CLEANUP-01**, P2, C4: zone-root and export-subpath comparison serialized each side with `join(",")`, so different collections agreed whenever they rendered the same. Owner-delegated cleanup finding, with [raw reproduction](../../K1.0-correction-01/cleanup-evidence-01/relation-counterexamples.log).
**Parent of C:** `968d74605cd34b30541bfd868b30bb1d0868cc41`, the cleanup/invalidation record and the advertised branch head at session start.
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Date:** 2026-09-14.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../../006-development-process.md). Every command ran
against the committed payload tree, whose only uncommitted content was this directory, which the run
itself writes. Nothing here introduces or changes a script, fixture, evaluator rule, threshold or
configuration; those are payload in C. The program in 08 is quoted in full inside its own log and
enters no tracked path. The ablations in 09 modify a detached `git worktree` checkout of C in a
temporary directory, never this checkout, and each is reverted before the next; the worktree's
status is printed in the log.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, correction delta, cumulative diffstat, preserved-record and ledger checks, comparison call-site inventory | 0 | correction delta 6 files changed, 695 insertions(+), 69 deletions(-); base, K1.0's accepted C16/H and record A, both cleanup heads, correction-01's round-1 and round-2 C/H, review-01 and record A are all ancestors of C; review-17, both cleanup records, correction-01's contract/reports/reviews, the owner's correction-02 handoff and the ownership inventory itself are byte-unchanged; no prior round's raw evidence is touched; 007's 37 packet headings intact; `tests/conformance/k0` byte-identical to base; the only production paths changed since base are `packages/kernel` and its two manifest entries, created by K1.0 itself; remote `main` still exactly base; advertised branch still exactly the parent of C; `join(",")`, `ReadonlySet` and `new Set(tokens)` survive only as prose in the comments that explain the defect, and all eight comparison call sites go through `collectionDisagreement` | `b1ad9bef66e2f4d4c87766fdd6112e50ee9e08876e364a007bef3d152656283a` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `c475b2ae23554485a94a8d3300078667c2ed32fc6aebe05cc778de2d75fb5617` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2060 tests, 302 suites, 0 fail, 0 skipped | `fce4b5f57136907a34d7d0bd664aef646cfb9a846a2f595b9d4d73fe076be7b1` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1947 tests, 283 suites, 0 fail, 0 skipped | `4728d3ebad45e5dde7f418f91f548ec8dabb552f8f8d10587ec635d75ca4ce92` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `4b117380728d9819e24c8dc7bae85cbf305bbe09f07bd7fc1d0d0ccc571e6203` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `f61d76f5f237811f82c62911f843db012bfb3151bd9f282096d52351a19e84c0` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `28a6ba453e3fa9761a5bd1567756a77270a0492eac58f2a95c43a80455110ae2` |
| [08-corr2-demonstration.log](08-corr2-demonstration.log) | inline demonstration against both parsers, source quoted in the log | 0 | the reviewed parser at C `36460438e95e968beec0b354b07a616b53981256` accepts 22 of 22 false collections and C accepts 0; the real inventory agrees under both, so the correction adds no false report; six other-separator merges, the two-sided split against an injected comma-bearing policy root with its honest twin, two reordering twins accepted by both, both dependency columns through the shared rule with their decoded-member representation, and two Deferred scalar re-assertions | `2c9870d67ac8d8d92a15a4bbf5be65b63848778850930b7fc6bd8bda74ce6239` |
| [09-distinguishing-ablation.log](09-distinguishing-ablation.log) | six one-behaviour ablations of C in a detached worktree, C4 control file run against each | 0 | pre-correction equality → 4 controls fail; the forbidden separator-blacklist fix → 3 fail, decided by the two-sided control; ambiguous diagnostic → 7 fail, three of them pre-existing controls; cardinality removed → 2 fail; member identity removed → 3 fail; `Set` representation → 5 fail. Recorded limit: a de-duplicating array passes every control, so the `Set` removal is defence in depth, not a reproduced defect | `ecf2ada931470c23e19b23301a090795ebcefcd34e717c9a021997deb9e3f118` |
| [10-c4-control-inventory.log](10-c4-control-inventory.log) | `node --test --test-reporter=tap` on the C4 control file and on the evidence-record guard | 0 | 216 tests, 0 fail, 0 skipped, every control block named in TAP order; guard 4 tests, 0 fail | `fa999d6f738a5444870b7cbf45acdb3b244aaa82568cb115bce32ca3cf9000d3` |

## Counts this round changes

| Figure | At correction-01's accepted H | At this C |
|---|---|---|
| `npm test` | 2051 tests, 301 suites | 2060 tests, 302 suites |
| `npm run test:conformance` | 1938 tests, 282 suites | 1947 tests, 283 suites |
| Architecture suite (`tests/conformance/architecture/*.test.ts`) | 351 | 360 |
| C4 group, `describe("K1.0 policy and inventory agree")` | 161 cases plus 16 mutated-document controls | 170 cases plus 16 mutated-document controls |

`npm run test:evals` was not run; the correction reaches no Agent or model-facing behaviour. No E1
schedule was executed and no E1 result is claimed. Nothing here is an acceptance.
