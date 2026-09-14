# K1.0-correction-01 validation-01 — raw output for clean payload C

**Payload C:** `76ce938074ffa910fbd74374e388ba8d226af4c6`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Historically accepted H:** `f3aa29d7ecba2a23aa85788b7efdebdd383cab24`, over clean payload C16 `d693d59aefe5335c8950d57cec6d6b57e375cadc`.
**Acceptance record A:** `36595f57d1f8cec8c4bf8a6293e888ca27750fab` ([review-17](../../K1.0/review-17.md)), preserved byte-unchanged.
**Deciding record for this round:** [cleanup-01](../../K1.0/cleanup-01.md) — owner-delegated cleanup finding **K10-CLEANUP-01**, historical ACCEPT preserved and C4 claims/integration held. Its [counterexample log](../../K1.0/cleanup-evidence-01/cell-decoding-counterexamples.log) is the reproduced defect.
**Parent of C:** `b8e394dd2a58b839b131943f4ca9b250abff94af`, the advertised branch head at session start.
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Date:** 2026-09-13.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../../006-development-process.md). Every command ran
against the committed payload tree, whose only uncommitted content was this directory, which the run
itself writes. Nothing here introduces or changes a script, fixture, evaluator rule, threshold or
configuration; those are payload in C. The three programs in 08 and 09 are quoted in full inside
their own logs and enter no tracked path.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, correction delta, cumulative diffstat, preserved-record and ledger checks, whole-cell decoder call-site inventory | 0 | correction delta 5 files changed, 721 insertions(+), 46 deletions(-); base, accepted C16/H and the acceptance record A are all ancestors of C; review-14/15/16/17, cleanup-01, implementation-16, every prior raw-evidence file and the owner's handoff are byte-unchanged; 007 still 399 lines with 36 `###` packet headings including K5.2; `tests/conformance/k0` byte-identical to base; remote `main` still exactly base; advertised branch still exactly the parent of C; the correction touches five files and no legacy, provider, SDK, example, script, benchmark or configuration path; the substring and prefix sentinels are gone from the parser | `48f02515ca9d29e78ae2addf84ddc69edcd775cdc964d43525d42d3cfb27cea9` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `e31a2f79e9afd6c92f5fb661feec203be70f9ecea86f89549e47f824970c245d` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2044 tests, 300 suites, 0 fail, 0 skipped | `20393218ef2a2f7811fba763fdde68012f436ac2e49a1fae83cb7b9df6a17d2e` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1931 tests, 281 suites, 0 fail, 0 skipped | `6a24a5fdc6a0d29aa8064a12f0f4a2c09033b161740086ef46148b3d688435aa` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `4e0fd9f1e22eb9cfbc83a145ac251407f71a018dcda9c9ce086265f5c00792b1` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `505629f11c2c85a6ef648104f3c88330f12c90dc0f0634d85aa5623bfebb74aa` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `191e74291d0a834a996da8edc1f10b38d05d688e1a63edd4d2fa1b6ae6cbe1b0` |
| [08-cleanup01-demonstration.log](08-cleanup01-demonstration.log) | inline demonstration, source quoted in the log | 0 | the cleanup's own reproduction re-run on both parsers; 18 further cases, 9 distinguishing (H ≠ C), 0 where C fails its own requirement | `cf73a336f51ea09a54ed29baf3c0f9c65be54f2627ab760f707bcb734c049155` |
| [09-whole-cell-audit.log](09-whole-cell-audit.log) | inline audit against an independent reference, both sources quoted in the log | 0 | 89 cells across 7 governed columns: C disagrees with the reference 0, H disagrees 56, H-and-C-agree-while-the-reference-differs 0; non-vacuity 93 governed cells of the real inventory, 0 mismatches | `2d476d1213430ca16e9d209b995127a28f5f074dc97365da99342d2a1c7322f6` |
| [10-c4-control-inventory.log](10-c4-control-inventory.log) | `node --test --test-reporter=tap` on the C4 control file and on the evidence-record guard | 0 | 200 tests, 20 suites, 0 fail, 0 skipped, every control block named in TAP order; guard 4 tests, 0 fail | `75595ce8fca32cde3fb9850e34105d68e0c603f223f4a9eb83a50c30c79799f4` |

`npm run test:evals` was not run. The correction is confined to the C4 evidence parser, its controls
and the evidence-record guard, and reaches no Agent or model-facing behaviour, so nothing in the diff
is reachable from an eval. Recorded as not run, with that limit. There is no lint or build script in
this repository; the relevant static check is `npm run typecheck` and the relevant link/import check
is `npm run check:builder-docs`, both run and green.

When 10 ran, this directory held no `MANIFEST.md` yet — the run itself writes the logs it is about —
so the evidence guard's mid-capture rule skipped this directory and checked the sixteen settled ones.
Its coverage of *this* directory is asserted after the manifest exists; that post-manifest run and
its output are recorded in [implementation-01](../implementation-01.md). The guard's work roots are
widened in C precisely so this directory cannot sit outside the check.

## Reading 08 — K10-CLEANUP-01, accepted H vs C

The H column is the accepted candidate's `inventory-oracle.ts` taken byte-for-byte with
`git show f3aa29d7ecba2a23aa85788b7efdebdd383cab24:tests/conformance/architecture/inventory-oracle.ts`
(git blob `cdb06c345f4841faa70e1668c1830e5bce92786d`, SHA-256
`628a9cc7617e2a2577c6161404ca770709f66fed8c77ad6fe932e5108752d2f8`); its imports are type-only and
erased by `--experimental-strip-types`, so it runs standalone and is the accepted code rather than a
paraphrase. The C column is the committed production parser imported from its real path (git blob
`014a07dbcfcf04679602fd5ab1493e0fe566f5c1`, SHA-256
`22a822a46a1eac786b2d0190c25d4fada3685b306f23b676dd825b1ded2dd6b2`).

**Part 1** re-runs the cleanup's own reproduction unchanged in substance — the same anchor, the same
four mutations, the same two assertions — on both parsers.

| Document | Accepted H | C |
|---|---|---|
| baseline, unmutated | indistinguishable from baseline (correctly) | indistinguishable from baseline (correctly) |
| `2.5` | **indistinguishable from baseline**, `files=2`, 0 unreadable | distinguished, row rejected, 1 unreadable |
| `2oops` | **indistinguishable from baseline**, `files=2`, 0 unreadable | distinguished, row rejected, 1 unreadable |
| `nothing, @arrokothi/core` | **indistinguishable from baseline**, `reaches=[]`, 0 unreadable | distinguished, row rejected, 1 unreadable |
| `nothing, evil-package` | **indistinguishable from baseline**, `thirdParty=[]`, 0 unreadable | distinguished, row rejected, 1 unreadable |

**Part 2** carries the same four documents into the downstream consumer the finding named: under H
the dependency table still reports nothing unreadable and still covers all four declared zones, so
the measured-tree comparison cannot see the false claim; under C the row is rejected, which both
assertions in `kernel-landing-zone.test.ts` observe.

**Part 3** is the family rather than the four reported strings — subset extraction in three tables,
the publishability prefix in both directions, the two arity cases — beside the permitted spellings
(one code span, a comma list with and without padding, the bare `No`, a short row missing only the
ungoverned prose column) and three preserved prior corrections. 18 cases, 9 distinguishing, and C
fails its own requirement on none. The permitted half is what stops this from being a correction that
merely rejects more.

## Reading 09 — the independent reference

Round 15 of this packet produced an audit whose "expected" column was hand-typed by the author of the
parser, from the same reading that produced the parser, so it agreed with the parser's own bug and
reported a clean sheet; review-16 rejected that, and round 16 replaced the column with an executed
transliteration of quoted specification sentences. This audit keeps that device and hardens the
quoting step: the governing sentences are **not retyped in the reference at all**. Each is a verbatim
substring read out of the repository file that owns it at run time — six from
[`ownership-inventory.md`](../../K1.0/ownership-inventory.md) and two from
[K1.0's contract](../../K1.0/contract.md) — and the reference throws if any is absent or not unique
there. The log prints each sentence with its source file and byte offset.

Independence from the implementation: the reference imports nothing from `inventory-oracle.ts` and
shares no helper with it; it recognises each cell language with a whole-cell regular expression plus
a canonical re-render equality (decode, print the document's canonical spelling, require the cell
back), where the implementation uses a left-to-right index walk; and it decides the count language by
the round trip `String(n) === cell`, which is a statement about decimal rendering rather than a
transcription of the implementation's pattern.

Results over 89 cells in 7 governed columns, every one driven through the production entry points on
the real inventory with exactly one cell replaced: **C disagrees with the reference on 0**, the
accepted H disagrees on 56, and the count that would indicate a shared authorial assumption — H and C
agreeing while the reference differs — is **0**. Non-vacuity: the reference and C are run over all 93
governed cells of the real document and agree on every one.

Residual risk, stated rather than hidden. One author still wrote both the parser and the reference.
Two of the eight sentences are now beyond that author's reach in the sense that matters — they are
read from files an independent reviewer can open — but the *inference* from sentence to language is
still one person's. The `Published?` column is weaker still: it is a closed three-word vocabulary, so
any correct reading contains the same three spellings, and the log labels that column as such rather
than counting it as independent evidence.
