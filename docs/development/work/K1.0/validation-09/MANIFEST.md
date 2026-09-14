# K1.0 validation-09 — raw output for clean payload C

**Payload C:** `f2b8397eb2f8e743f937594e52f22f9d34fb1e98`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Reviewed round-8 H:** `065e864a796da6195ceca1d489201d2d687f7b8d`; **review record:** [review-08.md](../review-08.md), recorded by `f7dedc3c6fe41019665f5a93fdb29b570c59bbc4`.
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Date:** 2026-09-13.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../006-development-process.md). Every command
ran against the committed payload tree, whose only uncommitted content was this directory,
which the run itself writes. Nothing here introduces or changes a script, fixture, evaluator
rule, threshold or configuration; those are payload in C. The two demonstration programs in
08 and 09 are quoted in full inside their own logs and enter no tracked path.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, correction delta and cumulative diffstat | 0 | correction delta 3 files changed, 720 insertions(+), 78 deletions(-); cumulative 114 files changed; parent of C is exactly the review-08 record; `tests/conformance/k0` byte-identical to base; no legacy source touched; shared `scanBlocks`/`scanTransitions` layer replaces the split fence tracking | `0b2fc28d0080e5af16c12bd86cdc65894729eedfe89c1c59c49aa81054f604f7` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 1954 tests, 289 suites, 0 fail, 0 skipped | `17ee8db7c7633c1d961fe0465fea406f8075f6a2173e19202861a31a9c8a9e7a` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1841 tests, 270 suites, 0 fail, 0 skipped | `23324be38da965449f6917e5966d72ae2419fde3b09ad6e7afb96853e41b3891` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `30f35822692d0e07dda300d94aea66b5f7ac85c30479c311dcb705f793ca5835` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `b4d532f5fcf3fdf74802e98c9a6ec975df1dd76090676e6e8b25bc39b8cbf7d6` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `2ced20f25ab29c31e4dd457b0e7e6ba018b965657235167562f47c2daac44bd0` |
| [08-r801-r802-demonstration.log](08-r801-r802-demonstration.log) | inline demonstration, source quoted in the log | 0 | 11 cases; 8 newly distinguishing (bare/tilde/shorter-closer fences H8 RED → C GREEN; script/comment/pre/div blocks H8 GREEN-silent → C RED; indented-code table H8 RED → C GREEN); info-string/mismatched/unfenced cases agree as required | `765dfa3926fd17f7b31e768b86667d92dc467d4aeadf116854c4338c13a8e02d` |
| [09-state-transition-audit.log](09-state-transition-audit.log) | inline audit, source quoted in the log | 0 | every line carries exactly one recorded transition (lines == transitions in all 13 windows); fence opener as body terminator shown consumed-once with raw inner lines and a single closer; script/comment/pre/div/inline/indented/blockquote windows all show heading/table gating and whole-parser RED/GREEN | `ac7d474e54f7b29003f9d7c429982fc398090db7d618f2c0b6eb88bfb1a0b6d0` |

`npm run test:evals` was not run. This packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. Recorded as not run, with that limit.

## Reading 08 — K10-R8-01/K10-R8-02

The H8 column is the reviewed candidate's `inventory-oracle.ts` taken byte-for-byte with
`git show 065e864a796da6195ceca1d489201d2d687f7b8d:…` (SHA-256 `d25f7576307570cdee231efb0c6821175f41176902d7dde5627fcf869f14555e`);
its imports are type-only and erased by `--experimental-strip-types`, so it runs standalone
and is the reviewed code rather than a paraphrase. The C column is the committed production
parser imported from its real path. Both are read end to end through `inventoryDisagreements`.

| Case | H8 (reviewed) | C (committed) |
|---|---|---|
| baseline, unmutated document | 0 messages | 0 messages |
| bare backtick fence + complete table after the body | RED (spurious further table) | GREEN |
| info-string fence + complete table | GREEN | GREEN |
| tilde fence + complete table | RED (spurious further table) | GREEN |
| real unfenced second table at the same location | RED (further table) | RED (further table) |
| mismatched closer inside the fence | GREEN | GREEN |
| shorter closer than the opener | RED (spurious further table) | GREEN |
| script block + exact heading + contradictory table | GREEN (silent truncation) | RED (further table) |
| comment block + exact heading + contradictory table | GREEN (silent truncation) | RED (further table) |
| pre block + exact heading + contradictory table | GREEN (silent truncation) | RED (further table) |
| div block + heading + contradictory table | GREEN (silent truncation) | RED (further table) |
| indented-code table after the body | RED (spurious further table) | GREEN |

The 17 committed controls covering these cases live in C
(`kernel-landing-zone.test.ts`, "fence single-consumption (K10-R8-01)" with 10 tests and
"raw HTML blocks (K10-R8-02)" with 7 tests). All 11 round-8 structural heading controls,
SELF-14…17, SELF-12/13, all 16 round-7 header-label controls, all 24 round-6 omitted-edge
controls plus the pipe-less/alignment/edge-less/escaped-pipe variants, the malformed/short-row
controls, the duplicate-order controls and the relational controls are unchanged and still pass.

## Reading 09 — the state-transition audit

09 replaces the round-8 silent-exit audit with a transition audit over the shared layer. Each
window prints one row per physical line — state before, structural classification, state after,
`consumed-once`, heading/table gating — plus the whole-parser observable result and a
`lines == transitions` check. Thirteen windows are shown: bare/info-string/tilde/shorter-closer
fences with a complete table inside (GREEN, opener `fence-marker-open` once, inner lines
`fence-raw`, single `fence-closer`); the unfenced second table (ordinary lines, RED as a
further table); script/comment/pre/div blocks (opener `html-open`, heading line `html-raw`,
closer `html-close-line` or `html-end-blank`, later table ordinary and RED); inline HTML
(ordinary lines, later table RED; alone, GREEN); indented-code and blockquote table shapes
(`indented-code`/`blockquote`, GREEN); a real table after the quote break (RED); and the
preserved round-8 heading matrix. No line is reconsidered in any window: the fence opener
encountered as a table-body terminator advances the shared scan past itself exactly once.
