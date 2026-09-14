# K1.0 validation-16 — raw output for clean payload C

**Payload C:** `d693d59aefe5335c8950d57cec6d6b57e375cadc`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Reviewed round-15 H:** `d3d614f6cee4393d4ac63ecc2f29045b205505ff`, over clean payload C15 `2ef6f9803ff6f529ed5ffac0709299b49ebf904c`.
**Deciding review record:** [review-16.md](../review-16.md) — K10-R14-01 CLOSED, K10-R15-01 opened, C4 FAIL and every other criterion PASS. Preserved with [review-14.md](../review-14.md) and [review-15.md](../review-15.md), all three byte-unchanged.
**Parent of C:** `6e08fabb90766dbdcf9cf1a2dc6bfc4215dc8037`, the advertised branch head at session start.
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Date:** 2026-09-13.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../006-development-process.md). Every command ran
against the committed payload tree, whose only uncommitted content was this directory, which the run
itself writes. Nothing here introduces or changes a script, fixture, evaluator rule, threshold or
configuration; those are payload in C. The three programs in 08 and 09 are quoted in full inside
their own logs and enter no tracked path.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, correction delta, cumulative diffstat, preserved-record and ledger checks, whitespace-class call-site inventory | 0 | correction delta 4 files changed, 436 insertions(+), 128 deletions(-); base and reviewed H15 are both ancestors of C; review-14/15/16 byte-unchanged; 007 still 385 lines with 35 `###` packet headings including K5.2; `tests/conformance/k0` byte-identical to base; remote `main` still exactly base; advertised branch still exactly the parent of C; the §2.1 six appears only inside `parseCompleteTag` and the type-1/6 start boundaries; no `trim()`/`trimStart`/`trimEnd` call site; one `split(` | `e2c68f46966d3df8e092ade873fc0bfc609a006a07cf8551e3c84aa62b95ab0b` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `e31a2f79e9afd6c92f5fb661feec203be70f9ecea86f89549e47f824970c245d` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2030 tests, 299 suites, 0 fail, 0 skipped | `2fa82e49d806d819810e2cb23aee6a24384c562aca5844616394b06d576c19af` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1917 tests, 280 suites, 0 fail, 0 skipped | `d8ad47dc653443df6567dbce813f91c5e933e49fbf9a09ae4395743dfabb2257` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `ab556a5c9002ebbd53be946263622277ec92b7e457e967927afb8248a4428f0f` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `f08315dbf653f749d1c6c87dd4fe6c5a8f33559d0db64b9348c08348a0299c35` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `fe4c6d7316d7335664ceff55b6e4661f51798f7de7e4b8fe6949701d2f6ae59c` |
| [08-r1501-demonstration.log](08-r1501-demonstration.log) | inline demonstration, source quoted in the log | 0 | 29 cases; 10 distinguishing (H15 ≠ C), 19 agreeing as required, 0 where C fails its own expectation | `25c37d20a6a7462c75d54364791d095f858d68be318cb9b72ed2ca7af34ac075` |
| [09-whitespace-class-audit.log](09-whitespace-class-audit.log) | inline audit against an independent reference, both sources quoted in the log | 0 | 36 ATX cases: C wrong 0, H15 wrong 5, both-wrong-together 0; 11 table row cases, H15 ≠ C on 4; non-vacuity 117 real inventory lines, 7 headings, 0 reference/C mismatches | `d0e72fa53a056f596d2eb6b405d3300daf4dfec2d55547e2ab052db53714ee2a` |
| [10-c4-control-inventory.log](10-c4-control-inventory.log) | `node --test --test-reporter=tap tests/conformance/architecture/kernel-landing-zone.test.ts` | 0 | 186 tests, 19 suites, 0 fail, 0 skipped; every control block named in TAP order | `42c3f0d6558ad96e192322c68acef45e56ce02adbba1018325fb140ab9c5c6d6` |

`npm run test:evals` was not run. The correction is confined to the C4 evidence parser and its
controls and reaches no Agent or model-facing behaviour, so nothing in the diff is reachable from an
eval. Recorded as not run, with that limit. There is no lint or build script in this repository; the
relevant static check is `npm run typecheck` and the relevant link/import check is
`npm run check:builder-docs`, both run and green.

## Reading 08 — K10-R15-01, reviewed H15 vs C

The H column is the reviewed candidate's `inventory-oracle.ts` taken byte-for-byte with
`git show d3d614f6cee4393d4ac63ecc2f29045b205505ff:tests/conformance/architecture/inventory-oracle.ts`
(git blob `292c6a587125d84028769e0f6f31d20bc3ba7f23`, SHA-256
`de0d8d6ac26cb1be1bd9031c22b726624eff77d5640ddc8c9efd7aa98d08c628`); its imports are type-only and
erased by `--experimental-strip-types`, so it runs standalone and is the reviewed code rather than a
paraphrase. The C column is the committed production parser imported from its real path (git blob
`cdb06c345f4841faa70e1668c1830e5bce92786d`, SHA-256
`628a9cc7617e2a2577c6161404ca770709f66fed8c77ad6fe932e5108752d2f8`). Both are read end to end
through `parseInventory` → `inventoryDisagreements` against the real ownership inventory, mutated one
way per case. GREEN = zero messages; RED(n) = n messages.

| Case | H15 (reviewed) | C (committed) |
|---|---|---|
| baseline, unmutated inventory | GREEN | GREEN |
| **VT before the closing hash run — review-16's counterexample** | **GREEN (planted contradictory table hidden)** | **RED(2) exact further table** |
| FF before the closing hash run | GREEN | RED(2) |
| VT after the closing hash run | GREEN | RED(2) |
| FF after the closing hash run | GREEN | RED(2) |
| VT at the end of the content | GREEN | RED(2) |
| FF at the end of the content | GREEN | RED(2) |
| SPACE before the closing run terminates normally | GREEN | GREEN |
| TAB before the closing run terminates normally | GREEN | GREEN |
| SPACE after the closing run terminates normally | GREEN | GREEN |
| TAB after the closing run terminates normally | GREEN | GREEN |
| trailing SPACE terminates normally | GREEN | GREEN |
| trailing TAB terminates normally | GREEN | GREEN |
| plain exact heading terminates normally | GREEN | GREEN |
| VT in a key cell | GREEN | RED(2) |
| FF in a key cell | GREEN | RED(2) |
| VT in a value cell | GREEN | RED(1) |
| FF in a value cell | GREEN | RED(1) |
| VT row indentation | RED(2) | RED(2) |
| SPACE/TAB cell padding still parses | GREEN | GREEN |
| three spaces of row indentation still parses | GREEN | GREEN |
| review-15: NBSP after the separator | RED(2) | RED(2) |
| review-15: NBSP at the end of the title | RED(2) | RED(2) |
| review-15: NBSP in a key cell | RED(2) | RED(2) |
| round-12: a VT type-7 opener still hides the heading | RED(2) | RED(2) |
| round-12: `<div<NBSP>x>` stays ordinary | GREEN | GREEN |
| round-13: whole inventory recoded LF → lone CR | GREEN | GREEN |
| round-13: whole inventory recoded LF → CRLF | GREEN | GREEN |
| round-15: whole inventory re-separated with TAB | GREEN | GREEN |

The six SPACE/TAB twins are the other side of the class boundary: they would fail if the correction
had narrowed too far, so the controls pin the class rather than blacklisting two characters. The last
eight rows are the preserved prior corrections, identical in both columns — including the round-12
row, which shows that VT is still §6.10 tag whitespace and that this round narrowed two productions
rather than the file.

## Reading 09 — the independent reference, and why round 15's oracle was wrong

Round 15's audit had two columns and a hand-typed "expected" one. The author of the parser typed
those expectations from the same reading that produced the code, so when that reading was wrong —
the §2.1 six admitted before an ATX closing hash run — the oracle agreed with the bug and the report
claimed "C matches the derived GFM value on all 27 cases". An oracle that restates the
implementation's intent cannot detect the implementation's misreading.

09 replaces that column with a third **executed** column. `gfm-reference.mts`, quoted in full in the
log, transliterates published GFM 0.29 sentences one at a time, in the sentences' own order, as a
left-to-right index walk over the whole physical line; it imports nothing from the parser and shares
no helper. The sentences it implements are printed above the table, so each rule can be checked
against the published text without reading `inventory-oracle.ts`. The log reports, per row, the
reference value, H15's value and C's value, and counts rows where H15 and C agree while the reference
differs — the shape that would indicate a shared assumption — of which there are **0**.

Results: 36 ATX cases, **C wrong 0**, H15 wrong 5 (all VT/FF: before a closing run, after one, and at
the end of content). 11 table row cases, H15 ≠ C on 4 (VT/FF key cells and VT/FF value cells).
Non-vacuity: the reference and C are run over all 117 physical lines of the real ownership inventory
and agree on every line, including which 7 are ATX headings and their exact content.

Residual risk, stated rather than hidden: one author still wrote both the parser and the reference,
so a misreading of a quoted sentence could in principle be duplicated. The quotes are printed
precisely so that the part which does not depend on the author — the published text — is what a
reviewer checks.
