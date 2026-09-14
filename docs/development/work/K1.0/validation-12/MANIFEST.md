# K1.0 validation-12 — raw output for clean payload C

**Payload C:** `ec713563b8b76273411231aff6f1f3ad49e4ffb0`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Reviewed round-11 H:** `4cd711f71fcafb64ffaa7d49a715d05eaec3c2dc`; **review record:** [review-11.md](../review-11.md), recorded by `f22786173120976be7b8bdfac23c6fa1db660f30`.
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
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, correction delta and cumulative diffstat | 0 | correction delta 4 files changed, 176 insertions(+), 2 deletions(-); parent of C is exactly the review-11 record; `tests/conformance/k0` byte-identical to base; remote `main` still exactly base; advertised branch still exactly the review-11 record; H11 oracle git blob `8782dbf461907c6a5fc0934816cfd28a3568fbc3`, C oracle git blob `dabb174996df48518ad449c18dea54e212abfcb0` | `0ec3d7960720bdc75527db0e72f310f54700a215521ecbdcf1efd0b2057de11c` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 1994 tests, 294 suites, 0 fail, 0 skipped | `1b264155456a06253c75573cc272cf5a5814cadd6c861089919412af48503848` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1881 tests, 275 suites, 0 fail, 0 skipped | `eeb7f5656c6cb9237f55ce79d2da987c82869d0658515c4894b601550953cce7` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `30f35822692d0e07dda300d94aea66b5f7ac85c30479c311dcb705f793ca5835` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `8bbb0764cd2911c53d79fe203145e800f7361fb94a4a7e4df9a901463db2e539` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `d9e08497d735572ee64bb82b7b65a5263bc1b0274efbe9cf09597d6fbde4975f` |
| [08-r1101-demonstration.log](08-r1101-demonstration.log) | inline demonstration, source quoted in the log | 0 | 18 cases; 4 newly distinguishing, 14 agreeing as required, 0 regressions | `d615d38b33b6a637d964016bb991977a7778e4524921aea392fb1fdf2ad32f73` |
| [09-boundary-token-audit.log](09-boundary-token-audit.log) | inline audit, source quoted in the log | 0 | 19 windows with kind/depth/eligibility per line and lines == transitions everywhere; valid open/closing/EOL type-6 shown as html6, malformed stays ordinary, prefix guard and type-1/7 neighbors shown; clean-document spot check 117 == 117 | `5e3687d73d7bf292f30d10ffab9f82dfa7d4aa3035830ccf7cfc763479ec09d4` |

`npm run test:evals` was not run. This packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. Recorded as not run, with that limit.
There is no lint or build script in this repository; the relevant static check is
`npm run typecheck` (clean) and the relevant link/import check is `npm run check:builder-docs`.

## Reading 08 — K10-R11-01, H11 vs C

The H11 column is the reviewed candidate's `inventory-oracle.ts` taken byte-for-byte with
`git show 4cd711f71fcafb64ffaa7d49a715d05eaec3c2dc:…` (SHA-256 `8de59a310bcf795efbee1027cf4a9425accf93738b2c425a60cc2a4250ef27f6`,
git blob `8782dbf461907c6a5fc0934816cfd28a3568fbc3`);
its imports are type-only and erased by `--experimental-strip-types`, so it runs standalone
and is the reviewed code rather than a paraphrase. The C column is the committed production
parser imported from its real path (git blob `dabb174996df48518ad449c18dea54e212abfcb0`,
SHA-256 `030b65b1ffcd5da1e54464a6b12d21f0804eccb65274b95e8de4c2f539c3b01a`).
Both are read end to end through `inventoryDisagreements`. GREEN = zero messages (valid
document accepted); RED(n) = n messages.

| Case | H11 (reviewed) | C (committed) |
|---|---|---|
| baseline, unmutated document | GREEN | GREEN |
| R11-01 `<div/ x>` ordinary (review literal) | RED(2) manufactured further table | GREEN (heading real, planted table outside) |
| R11-01 `<div/foo>` ordinary | RED(2) manufactured | GREEN |
| R11-01 bare `<div/` ordinary | RED(2) manufactured | GREEN |
| R11-01 `<div$foo>` ordinary | RED(2) manufactured | GREEN |
| valid `<div/>` still type 6 | RED(2) | RED(2) |
| valid `<div>` still type 6 | RED(2) | RED(2) |
| valid `<div class=x>` still type 6 | RED(2) | RED(2) |
| valid bare `<div` at EOL still type 6 | RED(2) | RED(2) |
| closing `</div>` still type 6 | RED(2) | RED(2) |
| closing `</div/>` still type 6 | RED(2) | RED(2) |
| closing `</div class=x>` still type 6 | RED(2) | RED(2) |
| `<divfoo> trailing prose` stays ordinary (prefix guard) | GREEN | GREEN |
| complete `<divfoo>` alone still type 7 | RED(2) | RED(2) |
| textarea blank split preserved | GREEN | GREEN |
| search trailing prose preserved ordinary | GREEN | GREEN |
| missing-attribute-whitespace preserved ordinary | GREEN | GREEN |
| container-owned leaf lifetime preserved | GREEN | GREEN |

The 4 committed controls covering the finding live in C
(`kernel-landing-zone.test.ts`: "type-6 boundary tokens (K10-R11-01)" with 4 tests:
lone-slash/dollar GREEN, valid open RED, closing-plus-prefix guard, round-11 spot-check).
All 133 round-10 and earlier controls plus the 13 round-11 controls — list containers,
complete type-7 tags, fence single-consumption, script/comment/pre/div and inline-HTML,
SELF-12…20, container-owned leaves, attribute separators, textarea/search, the round-8
ATX/fence matrix, round-7 header-label bodies, round-6 edge-pipe/pipe-less variants,
malformed/short rows, duplicate orders and relational mutations — are unchanged and pass:
1994/1994 full, 1881/1881 conformance, zero skipped.

## Reading 09 — the type-6 boundary token audit

09 shows the corrected predicate directly: each opener runs in its own window so no raw
block leaks into the next case. Each window prints one row per physical line — depth
before/after, fence/HTML state with the kind (`html6`/`html7`/`html1` `@n`), structural
classification, heading/table eligibility on that line — plus the whole-parser observable
and a `lines == transitions` check, which holds in every window. Shown: lone-slash,
slash-name, bare-slash and dollar stays `ordinary` with the heading eligible (`head=Y`);
valid open/closing/EOL forms open `html-open html6@0` with the heading `html-raw`;
`<divfoo> trailing prose` stays `ordinary` while complete `<divfoo>` alone opens
`html7@0`; `<script>` and attributed mixed-case open `html1@0` while `<script/>` stays
`ordinary` (type 1 needs whitespace/`>`/EOL and type 7 excludes script); `<search>`
trailing stays `ordinary` while complete `<search>` alone opens `html7@0`;
missing-whitespace stays `ordinary`; and a clean-document spot check (117 == 117, no
container kill fires on the clean tree, `containerClosedLeaf` false throughout).
