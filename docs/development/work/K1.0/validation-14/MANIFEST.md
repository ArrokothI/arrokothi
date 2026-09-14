# K1.0 validation-14 — raw output for clean payload C

**Payload C:** `933e357a2d1fab9660f8af4a89b3031594dd3caa`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Reviewed round-13 H:** `d299e4215634b496e3ae8c54708b45b0c14231bf`; **review record:** [review-13.md](../review-13.md), recorded by `efb3b11354fe9acde044bad3a4d0e72807faa5d9`.
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Date:** 2026-09-14.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../006-development-process.md). Every command
ran against the committed payload tree, whose only uncommitted content was this directory,
which the run itself writes. Nothing here introduces or changes a script, fixture, evaluator
rule, threshold or configuration; those are payload in C. The two demonstration programs in
08 and 09 are quoted in full inside their own logs and enter no tracked path.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, correction delta and cumulative diffstat | 0 | correction delta 3 files changed, 200 insertions(+), 9 deletions(-); parent of C is exactly the review-13 record; `tests/conformance/k0` byte-identical to base; remote `main` still exactly base; advertised branch still exactly the review-13 record; H13 oracle git blob `9d97095a4e5e6b1a3f7acb37658117fedc592b8e`, C oracle git blob `43b23d18b790dd5595acb2924be665a0e10905d8` | `eda7aa72435acf39f00893e10234080bb130b540cc099a4a124c4540a466de7b` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2009 tests, 296 suites, 0 fail, 0 skipped | `8e94779e8ac07e548eeeabb299e2cf9c86e61454b592fc97c8f2165edef399d8` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1896 tests, 277 suites, 0 fail, 0 skipped | `5fdb4350b0445e0b5d6b5d2f1f3b2845f8c585391a4c6ceec70db824562e7a3b` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `30f35822692d0e07dda300d94aea66b5f7ac85c30479c311dcb705f793ca5835` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `8add07a2e25921f4837ee418a15248e2d680cbcd9fe37791b9e73ea05c631255` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `75aabcd7b04715f8b2abb6e0c5dabf9ea7dcde57913cf997538df96c09c55fb1` |
| [08-r1301-demonstration.log](08-r1301-demonstration.log) | inline demonstration, source quoted in the log | 0 | 9 shapes; 3 distinguishing, 6 agreeing as required, 0 regressions | `63c964551dd79679118c6a391e365e890c463e2cbb43694bc36d506a59f413ab` |
| [09-line-ending-transition-audit.log](09-line-ending-transition-audit.log) | inline audit, source quoted in the log | 0 | 8 windows with kind/depth/eligibility per line and lines == transitions everywhere; CR/CRLF/LF primitives, EOF cases, CR raw-block lifetime, mixed endings, clean-document CR/LF identity at 117 == 117 | `ef25f0673af13687395e5cf8f781a56ddad10af3b87213e3be093588535a2e0a` |

`npm run test:evals` was not run. This packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. Recorded as not run, with that limit.
There is no lint or build script in this repository; the relevant static check is
`npm run typecheck` (clean) and the relevant link/import check is `npm run check:builder-docs`.

## Reading 08 — K10-R13-01, H13 vs C

The H13 column is the reviewed candidate's `inventory-oracle.ts` taken byte-for-byte with
`git show d299e4215634b496e3ae8c54708b45b0c14231bf:…` (SHA-256 `cf3680f503739990de5f27d81454582f0f75b27f0ccf9f4ea52badfaab067bda`,
git blob `9d97095a4e5e6b1a3f7acb37658117fedc592b8e`);
its imports are type-only and erased by `--experimental-strip-types`, so it runs standalone
and is the reviewed code rather than a paraphrase. The C column is the committed production
parser imported from its real path (git blob `43b23d18b790dd5595acb2924be665a0e10905d8`,
SHA-256 `a3cb3ebceb36be36b161865bdd6fdd999f77a3d22f7e4099c47f19e6fee7ca36`).
Both are read end to end through `inventoryDisagreements` (`scanTransitions` for the three
primitives). GREEN = zero messages (valid document accepted); RED(n) = n messages.

| Case | H13 (reviewed) | C (committed) |
|---|---|---|
| baseline, unmutated LF inventory | GREEN | GREEN |
| whole inventory LF → lone CR stays baseline-green (primary) | RED(26): one scanner line, governed tables missing | GREEN (same 117 lines, headings, tables, relations) |
| whole inventory LF → CRLF stays baseline-green | GREEN | GREEN |
| LF twin catches the planted table | RED(2) exact further table | RED(2) exact further table |
| CR-only twin catches the planted table identically | RED(26): exact catch buried in missing-section noise | RED(2) exact further table |
| primitive `a<CR>b` (want 2 transitions) | 1 (no boundary) | 2 |
| primitive `a<CRLF>b` (want 2) | 2 | 2 |
| primitive `a<LF>b` (want 2) | 2 | 2 |
| round-13 VT type-7 opener stays loud | RED(2) | RED(2) |

The 8 committed controls covering the finding live in C
(`kernel-landing-zone.test.ts`: "GFM line endings (K10-R13-01)" with 8 tests: CR-only and
CRLF whole-inventory equivalence, mixed-ending boundary preservation, CR/CRLF/LF primitives,
lone-CR section termination, lone-CR raw-block lifetime twins, CR-distinct table rows, and
final-line EOF cases). Every prior accepted control — the round-13 whitespace/blank-line
matrix, round-12 type-6 token matrix, round-11 container-owned leaves, attribute separators,
GFM-0.29 `textarea`/`search`, round-10 list/container depth, round-9 fence/raw-HTML
single-consumption, round-8 heading/fence grammar, SELF-12…23, structural header/body cases,
all GFM row forms, malformed/short rows, duplicate-order controls and relational mutations —
is unchanged and passes: 2009/2009 full, 1896/1896 conformance, zero skipped.

## Reading 09 — the line-ending transition audit

09 shows the reconstructed tokenization directly: each window prints one row per physical
line — depth before/after, fence/HTML state with the kind (`html6` `@n`), structural
classification, heading/table eligibility on that line — plus a `lines == transitions` check,
which holds in every window. Shown: lone-CR, CRLF and LF primitives each delimiting into two
transitions; each trailing ending form yielding one final empty line versus none without;
lone-CR type-6 opener/heading/blank lifetime (`html-open`, `html-raw`, `html-end-blank`);
mixed LF/CRLF/lone-CR input keeping one transition per physical line through list, fence and
container-close states; and a clean-document spot check (LF 117 transitions, CR-only 117
transitions, identical texts, no container kill fires on either tree).
