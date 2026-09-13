# K1.0 validation-15 — raw output for clean payload C

**Payload C:** `2ef6f9803ff6f529ed5ffac0709299b49ebf904c`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Reviewed round-14 H:** `0a9333faa7ea9cdf742f01b16af1069357b88bad`; **review records:** [review-14.md](../review-14.md) (historical ACCEPT, recorded by `9d66313ddc3b90503b666efb4f0079775e7fe9ff`) and the authoritative second [review-15.md](../review-15.md) (CHANGES REQUIRED, recorded by `d21dc58`), which invalidates that ACCEPT for integration.
**Parent of C:** `3616031dfdacafbc85d15bcf9e3c416638212ef7`, the advertised branch head at session start.
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Date:** 2026-09-13.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../006-development-process.md). Every command ran
against the committed payload tree, whose only uncommitted content was this directory, which the run
itself writes. Nothing here introduces or changes a script, fixture, evaluator rule, threshold or
configuration; those are payload in C. The two demonstration programs in 08 and 09 are quoted in
full inside their own logs and enter no tracked path.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, correction delta, cumulative diffstat and identity checks | 0 | correction delta 4 files changed, 768 insertions(+), 61 deletions(-); base is an ancestor of C; `tests/conformance/k0` byte-identical to base; remote `main` still exactly base; advertised branch still exactly the parent of C; no `trim()`/`trimStart`/`trimEnd` call site remains in the C4 parser (5 matches, all prose in doc comments); one `split(` (the §2.1 physical-line tokenizer); H14 oracle git blob `43b23d18b790dd5595acb2924be665a0e10905d8`, C oracle git blob `292c6a587125d84028769e0f6f31d20bc3ba7f23` | `eb8400a4c7ac312a10852e7b5955bffe47a774951a65b0bbe01b50f4d6754ef0` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `e31a2f79e9afd6c92f5fb661feec203be70f9ecea86f89549e47f824970c245d` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2021 tests, 298 suites, 0 fail, 0 skipped | `0778db503877347e7a9e90c7c5b0efec86752d482bbdf09cc53b44f0e3d9989b` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1908 tests, 279 suites, 0 fail, 0 skipped | `e4798d156a01c06ea6e8a0df99d351ad328ef4f4208169bd67c9fbde93d37afa` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `ab556a5c9002ebbd53be946263622277ec92b7e457e967927afb8248a4428f0f` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `b99dbf949656d8cf64fbf277de88d0b1756eec4a07b12380613a7c0e844889b4` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `f87f1c8751624dff5324f0d1383e7f2075ac904d8808ab014037d11d9f1a27b4` |
| [08-r1401-demonstration.log](08-r1401-demonstration.log) | inline demonstration, source quoted in the log | 0 | 27 cases; 14 distinguishing (H14 ≠ C), 13 agreeing as required, 0 where C fails its own expectation | `582e2b951eddf149274482470eee20a8f4568df647a82e81d29c0d7a38c7b3fc` |
| [09-atx-whitespace-audit.log](09-atx-whitespace-audit.log) | inline audit, source quoted in the log | 0 | 27 ATX content cases, C matches the derived GFM 0.29 value in all 27, H14 differs on 11; 9 table row/cell cases, H14 differs on 3 | `ff392af72f1795e1dfae1a2d94097d9576f36a4b69929fa47e7f330bf62cfbbb` |
| [10-c4-control-inventory.log](10-c4-control-inventory.log) | `node --test --test-reporter=tap tests/conformance/architecture/kernel-landing-zone.test.ts` | 0 | 177 tests, 18 suites, 0 fail, 0 skipped; every control block named in TAP order | `f01b4f8deeef3b542de731f904b8cb203ac1b2728c7f30f08bcf8d09e2139aa1` |

`npm run test:evals` was not run. This packet changes no Agent or model-facing behaviour and nothing
in the diff is reachable from an eval. Recorded as not run, with that limit. There is no lint or
build script in this repository; the relevant static check is `npm run typecheck` (clean) and the
relevant link/import check is `npm run check:builder-docs`.

## Reading 08 — K10-R14-01, reviewed H14 vs C

The H column is the reviewed candidate's `inventory-oracle.ts` taken byte-for-byte with
`git show 0a9333faa7ea9cdf742f01b16af1069357b88bad:tests/conformance/architecture/inventory-oracle.ts`
(git blob `43b23d18b790dd5595acb2924be665a0e10905d8`, SHA-256
`a3cb3ebceb36be36b161865bdd6fdd999f77a3d22f7e4099c47f19e6fee7ca36`); its imports are type-only and
erased by `--experimental-strip-types`, so it runs standalone and is the reviewed code rather than a
paraphrase. The C column is the committed production parser imported from its real path (git blob
`292c6a587125d84028769e0f6f31d20bc3ba7f23`, SHA-256
`de0d8d6ac26cb1be1bd9031c22b726624eff77d5640ddc8c9efd7aa98d08c628`). Both are read end to end
through `parseInventory` → `inventoryDisagreements`. GREEN = zero messages (the document is
accepted); RED(n) = n messages.

| Case | H14 (reviewed) | C (committed) |
|---|---|---|
| baseline, unmutated inventory | GREEN | GREEN |
| **NBSP after the ATX separator — review-15's counterexample** | **GREEN (planted contradictory table hidden)** | **RED(2) exact further table** |
| NBSP at the end of the title | GREEN | RED(2) |
| NBSP after a closing `##` run | GREEN | RED(2) |
| U+3000 ideographic space, leading | GREEN | RED(2) |
| U+FEFF zero-width no-break space, leading | GREEN | RED(2) |
| U+2009 thin space, trailing | GREEN | RED(2) |
| leading vertical tab is content | GREEN | RED(2) |
| leading form feed is content | GREEN | RED(2) |
| exact-heading twin terminates normally | GREEN | GREEN |
| exact title, TAB separator | GREEN | GREEN |
| exact title with a closing `##` run | GREEN | GREEN |
| exact title, VT before the closing `##` run | RED(2) — H14 over-extends the section | GREEN |
| exact title with trailing VT | GREEN | GREEN |
| `##<NBSP>Title` is no heading at all | RED(2) | RED(2) |
| NBSP in the **current** heading opens no section | GREEN | RED(13) governed table missing |
| TAB separator on the current heading still opens it | GREEN | GREEN |
| padded key cell `DX-1<NBSP>` (K1.0-SELF-24) | GREEN | RED(2) |
| padded value cell `<NBSP>migratable` | GREEN | RED(1) |
| padded publishability `<U+3000>Yes` | GREEN | RED(2) |
| NBSP-indented row has no leading edge pipe | GREEN | RED(2) |
| ASCII space/tab padding around cells is still trimmed | GREEN | GREEN |
| whole inventory re-separated with TAB | GREEN | GREEN |
| round-12: a VT type-7 opener still hides the heading | RED(2) | RED(2) |
| round-12: `<div<NBSP>x>` stays ordinary | GREEN | GREEN |
| round-13: whole inventory recoded LF → lone CR | GREEN | GREEN |
| round-13: whole inventory recoded LF → CRLF | GREEN | GREEN |

The last four rows are the preserved prior corrections, unchanged in both columns. The twelve
committed controls covering this round live in C (`kernel-landing-zone.test.ts`: "GFM ATX heading
identity and structural whitespace (K10-R14-01)", 7 tests, and "GFM table row and cell whitespace
(K1.0-SELF-24)", 5 tests). Nine of those twelve fail against the reviewed H14 parser; the other
three are preservation controls that must pass in both. Every prior accepted control — the round-14
line-ending matrix, round-13 whitespace/blank-line matrix, round-12 type-6 token matrix, round-11
container-owned leaves, attribute separators, GFM-0.29 `textarea`/`search`, round-10 list/container
depth, round-9 fence/raw-HTML single-consumption, round-8 heading/fence grammar, SELF-12…23,
structural header/body cases, all GFM row forms, malformed/short rows, duplicate-order controls and
relational mutations — is unchanged and passes: 2021/2021 full, 1908/1908 conformance, zero skipped.

## Reading 09 — the ATX and table structural-whitespace audit

09 derives the expected value for each line from published GFM 0.29 (§2.1 whitespace, §2.2 tabs and
block structure, §4.2 ATX headings with Examples 41–47, and the tables extension) and prints it
beside what each parser produces. C matches the derived value on all 27 heading cases; H14 differs
on 11 of them, in both directions — it erased NBSP, U+3000, U+FEFF, U+2009, and leading VT/FF from
heading content, and it failed to recognise a VT-preceded closing `#` run or to empty an all-`#`
content. The nine table cases show the same substitution in row and cell normalization: a
Unicode-padded key reaches C as a row with no recognisable key, a Unicode-padded value reaches C as
a different disposition token, and a Unicode-indented row loses its leading edge pipe, while ASCII
space/tab padding and up-to-three-space indentation behave identically in both columns.

## Reading 01 — the 007 ledger restoration (K1.0-SELF-25)

The inbound branch head `3616031` truncated `docs/development/007-work-packets.md` from 378 lines to
142 while transcribing review-15's status, deleting every packet definition from K2.1 onward. The
frozen K0 conformance test `tests/conformance/k0/cited-decisions.test.ts` asserts that each assigned
obligation names a real 007 packet heading, and `R1-f` is assigned to K5.2, so that suite was red at
the branch head — before any change in this round. 01 shows the truncating commit, that
`### K5.2 —` is absent at `3616031` and present in C, and that C's ledger differs from `9d66313`'s
only by the owner's CHANGES_REQUESTED paragraph and the K1.0 status row.
