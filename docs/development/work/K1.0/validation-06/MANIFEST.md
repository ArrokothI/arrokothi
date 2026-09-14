# K1.0 validation-06 — raw output for clean payload C

**Payload C:** `459be4e51370ebb8e859a46b29a966944bbd755a`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Reviewed round-5 H:** `2b274e6ecbaa8cdcc4600d8574234fc027c2b37e`; **review record:** [review-05.md](../review-05.md), recorded by `86fbd8423bf6fbfda1febcab6a9d3c59f0115f4b`.
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Date:** 2026-09-13.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../006-development-process.md). Every command
ran against the committed payload tree, whose only uncommitted content was this directory,
which the run itself writes. Nothing here introduces or changes a script, fixture, evaluator
rule, threshold or configuration; those are payload in C.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, correction delta and cumulative diffstat | 0 | correction delta 3 files changed, 324 insertions(+), 9 deletions(-); cumulative 79 files changed, 31346 insertions(+), 36 deletions(-); `tests/conformance/k0` byte-identical to base; `readKeyedTable` signature unchanged | `0d016f735bb4649d27952cbbefc7d00d35c1589db9c440a6743bbe1ec649398e` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `daf2d0a0b4e0848a8e225084d545b65ff20eb17537cd6453a5d02baba947774d` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 1905 tests, 285 suites, 0 fail, 0 skipped | `8f94cafed008ce3a84a0f79f8958003f30c9bdfbecd3a8d23fba62f1831ad4a2` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1792 tests, 266 suites, 0 fail, 0 skipped | `8f4347c76e490f8cfa9ad722ba47d588941ffba6061548a3ef16255d88be9bb1` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `b966d0a19ea1cee6e16788f14921cb7c435bf9dcf0c1796d37c18b19fb4f2423` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `8bc0f9569818631d9257f1017a9f17f40c601500feb0270f6e441cec62384e84` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `e5c6c5eb681b7cf0c91f29c4aeaf110f7411a4e9dd8446e729807b8bdfae0340` |
| [08-r501-demonstration.log](08-r501-demonstration.log) | inline demonstration, source quoted in the log | 0 | review-05 literal silent on H5 row discovery and flagged on the committed parser; all 24 omitted-edge variants (4 tables × trailing/leading/both × before/after) H5-miss vs committed-flag; pipe-less challenger H5-miss vs committed-flag; baseline green | `341b11613783520cc2c37e88190de68a5f1b4f7ab652b0bed8ac0ac91df2fb98` |

`npm run test:evals` was not run. This packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. Recorded as not run, with that limit.

## Reading 08 — K10-R5-01

Every candidate data row in every keyed table must reach the shared keyed accounting path and
end as recorded, duplicate, or unreadable. The H5 column is that round's `tableRows` front door,
quoted in the log from the reviewed H5; its `readKeyedTable` is identical to the committed one,
so row-discovery counts decide silence.

| Case | H5 row discovery | Committed |
|---|---|---|
| baseline, unmutated document | 5 Zones rows, 0 unreadable | 0 unreadable, 0 disagreements |
| review-05 literal (Zones omitted trailing, before) | misses bad row | 1 unreadable, 2 disagreements (duplicate + wrong-roots mismatch) |
| Zones/Deferred/Export/Dependency × omitted trailing/leading/both × before/after (24) | misses bad row in all 24 | flagged duplicate in all 24 |
| pipe-less single-cell row (GFM Example 202, before/after) | misses (5 rows, pipeless absent) | 2 / 1 unreadable, names `target-kernel` |
| alignment delimiter / edgeless header+delimiter | valid variants stay green (0 unreadable, 4 zones) | same, plus edge-less contradictory beside alignment still duplicate |
| escaped pipe `\|` in a cell (GFM Example 200) | — | still one row, duplicate key |

The six committed controls covering these cases live in C (`kernel-landing-zone.test.ts`):
four omitted-edge-pipe tables, one pipe-less continuation (K1.0-SELF-11), and one
delimiter/header/escaped-pipe variant case (K1.0-SELF-11). The six round-3 duplicate controls,
three round-4 malformed/short controls, and all ten round-2 relational controls are unchanged
and still pass.
