# K1.0 validation-11 — raw output for clean payload C

**Payload C:** `6880b4825ed1aa2363f8366431052f88d6955be8`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Reviewed round-10 H:** `a0a4988b8f4b38709700e1fc38cd0f08de74e3fa`; **review record:** [review-10.md](../review-10.md), recorded by `74aee7aa5585fb036bc413a8591b6dbb428ffc1f`.
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
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, correction delta and cumulative diffstat | 0 | correction delta 3 files changed, 390 insertions(+), 139 deletions(-); parent of C is exactly the review-10 record; `tests/conformance/k0` byte-identical to base; remote `main` still exactly base; advertised branch still exactly the review-10 record | `630ddb7857a4c61cf281ed2194d6fa39f67d748aecf5185342415dc3750ad1c5` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 1990 tests, 293 suites, 0 fail, 0 skipped | `9eb30e02cafac6f6786f285aa9699b1ad15abe6ccbcdc16a47ffac3f8ade962e` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1877 tests, 274 suites, 0 fail, 0 skipped | `88dca038dd16dadc2671933dd763e47132ebe41fa8ce44c90c5eb7dff2b4bdeb` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `30f35822692d0e07dda300d94aea66b5f7ac85c30479c311dcb705f793ca5835` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `d871607b6549f4ff43240626ecec7ada2aed905b1d2e67e5148cc2703889df16` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `c67cbd7e63ae74b0e1969293de4714ddbdeb26abe94087f88132a9ef16cb7369` |
| [08-r1001-r1002-r1003-demonstration.log](08-r1001-r1002-r1003-demonstration.log) | inline demonstration, source quoted in the log | 0 | 31 cases; 11 newly distinguishing, 20 agreeing as required, 0 regressions | `14b1dd5012af6ddb6c7ca5ba097b85ac092037dd48eee36e2877399ef4fa5c39` |
| [09-structural-transition-audit.log](09-structural-transition-audit.log) | inline audit, source quoted in the log | 0 | 11 windows with owner depth/closure/eligibility per line and lines == transitions everywhere; nested and top-level leaf lifetimes shown; clean-document spot check 117 == 117 | `dc5dc6c36b6d347b383cd48305390d089aa5c9499a87c621831d32224ef319ad` |

`npm run test:evals` was not run. This packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. Recorded as not run, with that limit.
There is no lint or build script in this repository; the relevant static check is
`npm run typecheck` (clean) and the relevant link/import check is `npm run check:builder-docs`.

## Reading 08 — K10-R10-01/-02/-03, H10 vs C

The H10 column is the reviewed candidate's `inventory-oracle.ts` taken byte-for-byte with
`git show a0a4988b8f4b38709700e1fc38cd0f08de74e3fa:…` (SHA-256 `20a31b44cb549df8fe826d4d7f9239a60b08854a0f9ce797ceb81ab58af3cd1e`);
its imports are type-only and erased by `--experimental-strip-types`, so it runs standalone
and is the reviewed code rather than a paraphrase. The C column is the committed production
parser imported from its real path (git blob `8782dbf461907c6a5f0934816cfd28a3568fbc3`).
Both are read end to end through `inventoryDisagreements`. GREEN = zero messages (valid
document accepted); RED(n) = n messages.

| Case | H10 (reviewed) | C (committed) |
|---|---|---|
| baseline, unmutated document | GREEN | GREEN |
| R10-01 bullet unclosed fence + real Zones heading (review literal) | RED(21) cascade, Deferred missing | GREEN (fence dies with item, heading delimits) |
| R10-01 ordered unclosed fence + real Zones heading | RED(21) cascade | GREEN |
| R10-01 wide-marker item + real Zones heading | GREEN | GREEN (lock: absolute-indent-4 fence bytes are indented code under both grammars, so no leaf opens in either; see SELF-21) |
| R10-01 list-local type-7 without blank end + heading (review literal) | RED(2) manufactured further table | GREEN (heading real, planted table outside) |
| R10-01 list-local script/comment without closer, contradiction after the leaf | GREEN (silence: swallows the table) | RED(2) exact further table |
| R10-01 properly closed list-local fence | GREEN | GREEN |
| R10-01 top-level unclosed fence | GREEN | GREEN (run-to-document-end preserved in both) |
| R10-01 nested inner dedent stays nested | RED(2) | RED(2) |
| R10-01 nested outer dedent delimits | GREEN | GREEN |
| R10-01 blockquote analogue (quoted fence never owns state) | GREEN | GREEN |
| R10-02 exact GFM `<a href='bar'title=title>` | RED(2) manufactured | GREEN (ordinary text) |
| R10-02 missing whitespace after single/double-quoted values, before valueless name | RED(2) each | GREEN each |
| R10-02 valid multi-attribute / boolean / spaced-`=` / self-closing tags | RED(2) each | RED(2) each (raw blocks intact) |
| R10-02 malformed `<Warning a=>` | GREEN | GREEN |
| R10-03 `<textarea>` with blank after opener | RED(2) manufactured | GREEN (type 7 ends at blank) |
| R10-03 `<textarea>` without blank | RED(2) | RED(2) (raw continues) |
| R10-03 `script` / `style` remain type 1 | RED(2) each | RED(2) each |
| R10-03 `<search> trailing prose` | RED(2) manufactured | GREEN (ordinary) |
| R10-03 complete `<search>` alone | RED(2) | RED(2) (type 7) |
| R10-03 single-line uppercase declaration | GREEN | GREEN (closes on its own line) |
| R10-03 `div` type 6 | RED(2) | RED(2) |
| R9 bullet nested heading + later table | RED(2) | RED(2) (preserved) |
| R9 quoted type-7 opener | RED(2) | RED(2) (preserved) |

The 13 committed controls covering the three findings live in C
(`kernel-landing-zone.test.ts`: "container-owned leaf lifetime (K10-R10-01)" with 8 tests,
"attribute separators (K10-R10-02)" with 4 tests, and the textarea/search replacement pair
for K10-R10-03). All 133 round-10 and earlier controls — list containers, complete type-7
tags, fence single-consumption, script/comment/pre/div and inline-HTML, SELF-12…20, the
round-8 ATX/fence matrix, round-7 header-label bodies, round-6 edge-pipe/pipe-less variants,
malformed/short rows, duplicate orders and relational mutations — are unchanged and pass.

## Reading 09 — the container/leaf ownership audit

09 shows the corrected ordering directly: container continuation resolves before any open
leaf state. Each window prints one row per physical line — depth before/after with content
indents, fence/HTML state with the owning depth (`@n`), structural classification,
`CLOSED-BY-CONTAINER` where the line ended an owned leaf, heading/table eligibility on that
same line — plus the whole-parser observable and a `lines == transitions` check, which holds
in every window. Shown: bullet/ordered unclosed fences dying with their items (`open(`x3)@1`
→ null, `CLOSED-BY-CONTAINER`, heading eligible same line); list-local type-7/type-1 deaths
at a heading and at a dedented table (table eligible same line); the closed-fence locality
(`fence-closer`, no kill); the top-level `@0` leaf running on; the nested inner boundary
staying outer-item content vs the outer kill delimiting; the missing-whitespace literal
staying `ordinary` (never opens) beside a valid multi-attribute `html-open html7@0`; the
textarea blank split (`html-end-blank` vs `html-raw`); search trailing prose vs the complete
alone line; and a clean-document spot check (117 == 117; only the real "What the target zone
may import" list lives in containers, all outside governed sections, whole document green,
no container kill fires on the clean tree).

Window G additionally records a shared pre-existing corner honestly (K1.0-SELF-21): fence
and indented-code detection use absolute indentation, so a fence marker at absolute indent 4
inside a wide-marker item (`10.`, content indent 4) reads as indented code in both H10 and C
and never opens a leaf in either. The observable on the pinned controls coincides with GFM
truth (green), and no committed behavior changes there; container-relative fence/code
disambiguation is left for a future packet if a real governed document ever needs it.
