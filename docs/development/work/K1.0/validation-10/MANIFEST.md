# K1.0 validation-10 — raw output for clean payload C

**Payload C:** `549e215abba1b9e8737d29c6800af07c8406b8ff`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Reviewed round-9 H:** `4d7ebb9590c4a0a8da8fff4f5fa79c753eff2120`; **review record:** [review-09.md](../review-09.md), recorded by `784ab871d868693a1984c021b1f23392065cb79e`.
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
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, correction delta and cumulative diffstat | 0 | correction delta 3 files changed, 834 insertions(+), 55 deletions(-); parent of C is exactly the review-09 record; `tests/conformance/k0` byte-identical to base; no legacy source touched; container-aware `scanTransitions` plus complete-tag recognizer replace the leaf-only scan | `21b196752cb229bc51f7a6b4f4f097dfb64c949b36d075921b6666f3b86ad7b8` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 1977 tests, 291 suites, 0 fail, 0 skipped | `a1fb5295a8156cecaed6fe8396b250d653eba62186469709fc613ded2d14e180` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1864 tests, 272 suites, 0 fail, 0 skipped | `93c9456bad249aca46a39a660f9036f367f09524c6973d710f0f4919448a894b` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `30f35822692d0e07dda300d94aea66b5f7ac85c30479c311dcb705f793ca5835` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `c66970f4f37f301748b2ce6295d560a92498d331f2471e918fcb74c08764f33f` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `b72f3a4a3f7c5bb4c3de5cca7616782f15cc97097edea5479c50a44a8f2d22bb` |
| [08-r901-r902-demonstration.log](08-r901-r902-demonstration.log) | inline demonstration, source quoted in the log | 0 | 17 cases; 11 newly distinguishing (bullet/ordered/pop-to-outer/task-list containers H9 GREEN-silent → C RED; wide-bullet table pair split H9 RED/RED → C RED/GREEN; closing-with-attrs and lowercase-declaration H9 RED-spurious → C GREEN; paragraph-exception H9 RED-spurious → C GREEN; quoted type-7 and CRLF H9 GREEN-silent → C RED); 6 agree as required | `ca96e43bb14d289dfb9ea751754cd9b51244c843a27fa83dc969704aa8f3e3f3` |
| [09-structural-transition-audit.log](09-structural-transition-audit.log) | inline audit, source quoted in the log | 0 | 14 windows with depth/state/classification/once/eligibility/observable per line and lines == transitions everywhere; nested headings shown container-local with later tables surfaced; denied mid-paragraph tags/markers shown ordinary with normal termination | `643884c08ec2479f022da5ffe73daaf0093919f38e0bf5e0043be6a381ae41ab` |

`npm run test:evals` was not run. This packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. Recorded as not run, with that limit.

## Reading 08 — K10-R9-01/K10-R9-02

The H9 column is the reviewed candidate's `inventory-oracle.ts` taken byte-for-byte with
`git show 4d7ebb9590c4a0a8da8fff4f5fa79c753eff2120:…` (SHA-256 `dfaa9aa14abe92a20e1318300b9eb594409d15f31c34b51cf9333dd40afb1f37`);
its imports are type-only and erased by `--experimental-strip-types`, so it runs standalone
and is the reviewed code rather than a paraphrase. The C column is the committed production
parser imported from its real path. Both are read end to end through `inventoryDisagreements`.

| Case | H9 (reviewed) | C (committed) |
|---|---|---|
| baseline, unmutated document | 0 messages | 0 messages |
| bullet/ordered/pop-to-outer/task-list nested heading + later table | GREEN (silent truncation) | RED (further table, exact) |
| wide marker + 3sp table vs bullet + 3sp table | RED / RED | RED (top-level) / GREEN (nested) |
| wide marker + 3sp heading | GREEN (truncation) | GREEN (normal termination) |
| thematic break + indented heading + table | GREEN | GREEN |
| double/single-quoted delimiter in type-7 opener + heading + table | GREEN (silent truncation) | RED (further table, exact) |
| unquoted/ordinary attributes | RED | RED |
| bare closing tag as opener | RED | RED |
| closing tag with attributes (malformed) | RED (spurious block) | GREEN (ordinary, normal termination) |
| mid-paragraph tag + real heading + later table | RED (spurious block) | GREEN (normal termination) |
| tag directly after a table row | RED | RED |
| uppercase multi-line declaration | RED | RED |
| lowercase declaration | RED (spurious block) | GREEN (ordinary) |
| CRLF type-7 opener / CRLF bullet container | GREEN (silent) | RED |

The 23 committed controls covering these cases live in C
(`kernel-landing-zone.test.ts`, "list containers (K10-R9-01)" with 12 tests,
"complete type-7 tags (K10-R9-02)" with 10 tests, and the CRLF control K1.0-SELF-20).
All 110 round-9 and earlier controls — fence single-consumption, script/comment/pre/div and
inline-HTML, SELF-18/19, the round-8 ATX/fence matrix with SELF-14…17, SELF-12/13, the
round-7 header-label bodies, round-6 edge-pipe/pipe-less/alignment/escaped-pipe variants,
malformed/short rows, duplicate orders and relational mutations — are unchanged and pass.

## Reading 09 — the structural-transition audit

09 extends the round-9 transition audit with container depth. Each window prints one row per
physical line — depth before/after with content indents, fence/HTML state, structural
classification, `once`, heading/table eligibility — plus the whole-parser observable result
and a `lines == transitions` check, which holds in every window. Shown: bullet/ordered/wide
markers opening `c2`/`c3`/`c4` with nested headings container-local and later tables surfaced
exactly; the wide-vs-bullet 3sp-table split; the d2→d1 pop staying nested; restricted
markers and thematic breaks staying prose; denied mid-paragraph tags staying ordinary with
normal termination; the quoted-attribute opener hiding its heading; the malformed close
staying prose; the multi-line uppercase declaration spanning its block; the preserved
fence/script/indented-code windows; and a clean-document spot check (only the real
"What the target zone may import" list lives in containers, all outside governed sections,
whole document green).
