# K1.0 validation-08 — raw output for clean payload C

**Payload C:** `b8037aa02f76716d09293fb236e51bf3da9282fb`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Reviewed round-7 H:** `2dfc6d818498263c30cb64db32a91aa0ac0543a5`; **review record:** [review-07.md](../review-07.md), recorded by `f9bb7f5144b94ac78d4e7d87c61a56f7e38b9334`.
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
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, correction delta and cumulative diffstat | 0 | correction delta 3 files changed, 404 insertions(+), 36 deletions(-); cumulative 102 files changed; parent of C is exactly the review-07 record; `tests/conformance/k0` byte-identical to base; no legacy source touched; H7's `indexOf` section cut replaced by `parseAtxHeading`/`parseFenceCandidate`/`updateFence`/`sectionLines` over exact titles | `19bff918358450879aa662c711ecac9cd8b8b541f48c498e66bf300ee954cc49` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 1937 tests, 287 suites, 0 fail, 0 skipped | `36478edbfb929255075d51f14b5f3a5716a13aee44c56cd899e18e4e21827ffb` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1824 tests, 268 suites, 0 fail, 0 skipped | `7c0319c5bbbde061dc23b2c6e9e0401b0d37222013ffdf13082078ba23318a39` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `30f35822692d0e07dda300d94aea66b5f7ac85c30479c311dcb705f793ca5835` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `989b7c5537df01dab3fc450c8b69c90e91421c3c011e42c0d3a45e857b1f0f4d` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `fb3220ed2f16135ed395c5ae5e2c6959c2ec5f85d6000756efb6daae3d74866f` |
| [08-r701-demonstration.log](08-r701-demonstration.log) | inline demonstration, source quoted in the log | 0 | 11 cases; 5 newly distinguishing (review-07 literal, fenced mention, SELF-14, SELF-16, SELF-17: H7 silent, C reported); prose-start mis-selection shown under H7 (9) vs C green; SELF-15 both report; termination green both; SELF-12/SELF-13/R6-01 preserved | `bf79de01ebe86b52163feca3c2ea03021584e09a6355e57b83c3126aafeef8d7` |
| [09-silent-exit-audit.log](09-silent-exit-audit.log) | inline audit, source quoted in the log | 0 | every branch of section selection (15 heading-context cases) → table discovery → header/delimiter recognition → row splitting → header/body classification → key extraction → duplicate handling → value parsing → map insertion → propagation → relation comparison driven with a reaching input; four branches legitimately quiet, each accounted for below | `922726cf7129f0ef95bf488519d9b8797e3bd97024f2438d59d9a885a8c90bd6` |

`npm run test:evals` was not run. This packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. Recorded as not run, with that limit.

## Reading 08 — K10-R7-01

The H7 column is the reviewed candidate's `inventory-oracle.ts` taken byte-for-byte with
`git show 2dfc6d8:…` (SHA-256 `e919b7289e7e4f3da3f0f0da3825e2ab6cff065e94d17ff8d2757dc4649fe813`);
both of its imports are `import type` and are erased by
`--experimental-strip-types`, so it runs standalone and is the reviewed code rather than a
paraphrase. The C column is the committed production parser imported from its real path. Both are
read end to end through `inventoryDisagreements` plus `parseDependencyTable`.

| Case | H7 (reviewed) | C (committed) |
|---|---|---|
| baseline, unmutated document | 0 messages | 0 messages; zones 4, deferred 12, packages 7, dependency 4, unreadable 0 |
| review-07 literal (prose next-heading mention + contradictory table) | SILENT | reported (2 rows) |
| fenced next-heading mention + contradictory table | SILENT | reported (2 rows) |
| real ATX next heading terminates (planted rows after it) | green | green |
| prose start mention + planted table before the heading | 9 false messages (section mis-selected at prose bytes) | green (outside the section) |
| K1.0-SELF-12 repeated heading | reported | reported |
| K1.0-SELF-13 promoted further-table row | reported | reported |
| K10-R6-01 header-label body row | reported | reported |
| SELF-14 escaped hash | SILENT | reported |
| SELF-15 no-whitespace hash run | reported | reported |
| SELF-16 indented code | SILENT | reported |
| SELF-17 mismatched fence closer | SILENT | reported |

The 11 committed controls covering these cases live in C
(`kernel-landing-zone.test.ts`, "structural section boundaries (K10-R7-01)"): prose,
inline-code and fenced next-heading mentions, termination at a real ATX heading, prose and
fenced start mentions, SELF-14…SELF-17, and the second-relation fenced case. All 16 round-7
header-label controls, the repeated-heading, further-table, renamed-header and missing-table
cases, all 24 round-6 omitted-edge controls, the pipe-less continuation, alignment-delimiter
and edge-less variants, the escaped-pipe control, the round-5 malformed/short-row controls,
the round-3 duplicate controls and the round-2 relational controls are unchanged and still pass.

## Reading 09 — the branches that are legitimately quiet

Every other branch in the pipeline returns at least one message for a reaching input; 09 shows the
whole observable result for each. Four produce none, and each drops material that is structurally
not part of the governed table, or drops nothing at all:

1. **Content outside the section by structure** (1c planted rows after the real next heading; 1m
   prose and 1n fenced mention before the real start heading). Nothing belonging to the section
   is dropped; the green result is the correct section-boundary reading, pinned against H7's
   mis-selection in 08.
2. **A fenced block appended after the last body row** (2e). Under GFM the fence starts a code
   block, so those lines render as code. The document does not assert them as rows, and a reader
   sees a code block rather than an inventory row. Excluding them is GFM fidelity, not a row
   disappearing.
3. **Excess cells beyond the header's cell count** (4b). The *row* is recorded — it has its one
   outcome. GFM Example 204 drops the excess in rendering too, so the ignored text asserts
   nothing. The invariant is stated over rows; this is a cell-level reading rule. The valid
   alignment-delimiter variant (3b) is likewise green because the table parses.
4. **A second backticked token inside the key cell** (unchanged from round 7; the row is
   recorded under the first-token key rule, so a duplicate first token is still a duplicate).

Two branches changed voice this round without weakening. A missing governed table is still
reported as such (2a/2b), a repeated heading still reports its table (1d/SELF-12), and an
unclosed fence before the first body row (2d) now reports the whole downstream cascade: the
unclosed fence swallows the next heading as code, so the section runs on and every later table
— plus the consequently missing Deferred/Export sections — surfaces as disagreements rather
than silence.
