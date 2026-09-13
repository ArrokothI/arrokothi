# K1.0 validation-01 — raw output for clean payload C

**Payload C:** `811758ee1037c3862d1ebd2ec799fad5f6c3b57f`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Date:** 2026-09-13.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../006-development-process.md). Every command
ran against the committed payload tree, whose only uncommitted content was this directory,
which the run itself writes. Nothing here introduces or changes a script, fixture, evaluator
rule, threshold or configuration; those are payload in C.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, cumulative diffstat | 0 | 14 files changed, 1608 insertions(+), 26 deletions(-) across three payload commits; `tests/conformance/k0` byte-identical to base | `05652cd5133701a9ceff0b8542d31e538bbb91a8e17d6794ce698545db9eb034` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `98159589ac683c8ca89dc201082f1068a41eb5e24bce4cb08be749687b1657a7` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 1837 tests, 280 suites, 0 fail, 0 skipped | `32359de973084d4c261ce40c1a1eb0fcc5c54c4ef9f30fffc563ed0fd9e7dd68` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1724 tests, 261 suites, 0 fail, 0 skipped | `ec90c3a176b0deba17a19fc2583ee5e1d4bb7684119d0c72c33dfed563602db0` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 282 links/anchors, 38 public package imports | `c5f93cdefc5dc67256bcb19819d0387e969ceb25d5943d5552506b2a6de34d5c` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `475f0ae6283e99f226920d5490cd58cca43128e0d26638336701938d9f1252a7` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `512c9f3ae78d028eec822786f841ad13e9aa448b52873a0b598d312c2388c4f9` |
| [08-scanner-comparison.log](08-scanner-comparison.log) | inline comparison, source quoted in the log | 0 | 325 files, 317 identical; 33 old-only specifiers, 4 of them in pre-existing files and all prose or data; 2 new-only, both real imports the old scanner lost | `faa2a8d4958b087133bdaff9fe2f77bf8ebc5ec6110aebec011aa3a8ec8bfcb3` |
| [09-self-01-demonstration.log](09-self-01-demonstration.log) | inline demonstration, source quoted in the log | 0 | K1.0-SELF-01: 4 violations before the fix, 1 after | `5d086935030ea04ea5c86e85cfbd81681b53c0a0d722088007d9cd6fa8af360e` |

`npm run test:evals` was not run. This packet changes no Agent behaviour and no model-facing
path; nothing in the diff is reachable from an eval. Recorded as not run, with that limit.

## Reading 08

Four of the 33 old-only specifiers are in files that existed at the base. Each was read in
source and confirmed to be prose or data rather than an import:

| File | Reported by the old scanner | What it actually is |
|---|---|---|
| `packages/retrieval/local/src/records.ts:10` | `nothing matched` | documentation prose |
| `packages/interoperability/mcp/src/import/result.ts:234` | `this may have happened and the answer was lost` | documentation prose |
| `packages/retrieval/local/src/lexical.ts:21` | `, ` | a stopword list containing the word `from` |
| `scripts/check-builder-docs.ts:91` | `@arrokothi/sdk` | a string used as a search needle |

The other 29 are in files K1.0 adds: the fixture text and prose the forbidden-edge controls
deliberately carry, which is why the scanner had to be corrected before those controls could
be stated at all. Both new-only specifiers — `node:test` and `node:fs/promises` — are genuine
imports the old scanner destroyed by matching across a preceding documentation block.

On files that existed at the base the committed scanner reports a strict subset: four prose
removals and no lost import. No pre-existing guard result can therefore change.
