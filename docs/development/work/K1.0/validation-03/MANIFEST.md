# K1.0 validation-03 — raw output for clean payload C

**Payload C:** `839b32d085306b96358295edf86fec85836ce462`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Reviewed round-2 H:** `d4347837699b80e5cbffa83d48dd7a8c9e53f7e6`; **review record:** [review-02.md](../review-02.md).
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Date:** 2026-09-13.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../006-development-process.md). Every command
ran against the committed payload tree, whose only uncommitted content was this directory,
which the run itself writes. Nothing here introduces or changes a script, fixture, evaluator
rule, threshold or configuration; those are payload in C.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, correction delta and cumulative diffstat | 0 | correction delta 9 files changed, 967 insertions(+), 164 deletions(-); cumulative 42 files changed, 13433 insertions(+), 36 deletions(-); `tests/conformance/k0` byte-identical to base | `eefea9fe4552868f7b0f353312cbbdf12a0c3d4fc5141e5eb8646cfb5b88614b` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `464434671be974afa49649ead3a6bbd02e20f49dfb9d956796e28539c2f377fe` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 1885 tests, 284 suites, 0 fail, 0 skipped | `2e824f9c35aab421c93308961ea1c6610f82721abc5ebbe9f4f35f271b836cad` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1772 tests, 265 suites, 0 fail, 0 skipped | `4ecdaba633536a4bc8e8aba36c56f9bcfad3abe5458179880c77f442a7e530ef` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `eed6ec8a73bb78f4025ac24978b74ab791b85e01bf957ca4851959c473746e92` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `4144dd1363f4e9e32b5675159cb3f8f726f2087ba2d86d26072d8c90a255388b` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `a955fd7d89e40e097375cd2357c01713f531af9f9e28d623019815ce3de2cd94` |
| [08-two-extractor-comparison.log](08-two-extractor-comparison.log) | inline comparison, source quoted in the log | 0 | matrix and 326 repository sources: nothing is visible only to the second extractor | `6dd360951e874ac03fc15c0768e34bd664ad53901dc9c396ade4577b84db203b` |
| [09-r201-demonstration.log](09-r201-demonstration.log) | inline demonstration, source quoted in the log | 0 | seven counterexamples 0 → 1 violation; two working forms unchanged; 326/326 repository sources extract identically | `2a08d191aae7b436a463dc1162ba43dbab3b423aecd9754c5bffe2c355e9f2a3` |
| [10-r202-demonstration.log](10-r202-demonstration.log) | inline demonstration, source quoted in the log | 0 | round-2 checks miss 5 of 10 wrong associations; the rebuilt oracle names all 10 | `6fcf3ba3b27092686570b55e5f1f0d70e918dc65e0128176ebea7025a64d40ac` |

`npm run test:evals` was not run. This packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. Recorded as not run, with that limit.

## Reading 09 — K10-R2-01

Each row is a source in the target zone that names `@arrokothi/core`, or a file inside it,
driven through the real `loadWorkspace` → `walkModuleGraph` → `boundaryViolations` path. The
round-2 column uses that round's extractor, quoted in the log from the reviewed H2. Seven
forms were invisible to it: the review's `import("…").T` counterexample, `typeof import`,
import types in a parameter and inside a generic, both triple-slash reference directives, and
an ambient module declaration. The two forms that already worked still report one violation,
so the rebuild added coverage without disturbing what was already correct.

The corpus line is the re-audit of both shared-scanner consumers: across all 326 repository
sources the rebuilt extractor extracts exactly what round 2 extracted, 0 changed. That is why
no pre-existing guard result moves, and why the legacy suite still reports its own 13
assertions.

## Reading 10 — K10-R2-02

Ten plausible wrong row associations applied to the real inventory. The round-2 column is
that round's agreement checks reduced to what they actually compared — independent token sets
and global substring presence — quoted in the log.

Round 2 misses five: the review's own two-sided zone-root swap, a reassigned deferred owner,
a changed deferred disposition, and publishability claims in both directions. It catches the
other five only incidentally, because those mutations happen to remove a token from the page.
The rebuilt oracle names all ten and says which relation is wrong. Round 2 caught five of
ten rather than none; the finding is about the claim of exact bidirectional agreement, and
that claim is what the five misses refute.
