# K1.0-correction-01 validation-02 — raw output for clean payload C

**Payload C:** `36460438e95e968beec0b354b07a616b53981256`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Historically accepted H:** `f3aa29d7ecba2a23aa85788b7efdebdd383cab24`, over clean payload C16 `d693d59aefe5335c8950d57cec6d6b57e375cadc`.
**Acceptance record A:** `36595f57d1f8cec8c4bf8a6293e888ca27750fab` ([review-17](../../K1.0/review-17.md)), preserved byte-unchanged.
**Round-1 records:** clean payload C `76ce938074ffa910fbd74374e388ba8d226af4c6`, candidate H `61133e9c8fd6fc80c6995fd26495e11e9f7f2e57`, independent review [review-01](../review-01.md) (`2d50fa3b3d7e23b01823f6d93e80952f70c0c5cc`), CHANGES REQUIRED on **K10-CORR1-R1-01**; all preserved byte-unchanged.
**Deciding record for this round:** [review-01](../review-01.md) — SELF-29 measures excess cells against the document's mutable header, so a widened header can authorize an unread body cell. Historical ACCEPT preserved and C4 claims/integration held.
**Parent of C:** `2d50fa3b3d7e23b01823f6d93e80952f70c0c5cc`, the review-01 record and advertised branch head at session start.
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Date:** 2026-09-13.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../../006-development-process.md). Every command ran
against the committed payload tree, whose only uncommitted content was this directory, which the run
itself writes. Nothing here introduces or changes a script, fixture, evaluator rule, threshold or
configuration; those are payload in C. The two programs in 08 and 09 are quoted in full inside
their own logs and enter no tracked path.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, correction delta, cumulative diffstat, preserved-record and ledger checks, schema-ownership call-site inventory | 0 | correction delta 4 files changed, 478 insertions(+), 39 deletions(-); base, accepted C16/H, acceptance record A, cleanup head, round-1 C/H and review-01 are all ancestors of C; review-17, cleanup-01, implementation-16, every prior raw-evidence file, the owner's handoff, round-1 report/evidence and review-01 are byte-unchanged; 007 packet headings intact; `tests/conformance/k0` byte-identical to base; remote `main` still exactly base; advertised branch still exactly the parent of C; the correction touches four files and no legacy, provider, SDK, example, script, benchmark or configuration path; `expectedHeaderFirstCell` and the `governed.header.length` authority are gone from the parser | `66b3c18845245a51853d365ca878de65e8b0244a80b4f52c718f3662cb9c4ace` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `e31a2f79e9afd6c92f5fb661feec203be70f9ecea86f89549e47f824970c245d` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2051 tests, 301 suites, 0 fail, 0 skipped | `c8b406ec5909d25b43d604c100f71d9f4cd2602c6515e774a5e42bac481136fa` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1938 tests, 282 suites, 0 fail, 0 skipped | `d7198118e54e2ae3de7a6c240477ad08582fc9fb3068348dece434ce7061660d` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `4e0fd9f1e22eb9cfbc83a145ac251407f71a018dcda9c9ce086265f5c00792b1` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `b976f74b1503a6d047b6ac75d0b7407524121bee24b927a1a5b00cbef1856a0a` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `b7d845e48dc96d3ab8875822f6f044320b1ba22dda5a2700faa30e3f19bfc32c` |
| [08-corr1-demonstration.log](08-corr1-demonstration.log) | inline demonstration, source quoted in the log | 0 | the review's exact counterexample plus six schema-family cases on both parsers; 5 old-silent/new-loud distinctions, 0 where new C fails its requirement | `d11a54f5f66b7cdc87e6e3403ec2bffac12341ea10ad78695b965394cfd02c58` |
| [09-schema-ownership-audit.log](09-schema-ownership-audit.log) | inline audit against an independent reference, both sources quoted in the log | 0 | 29 documents across all four tables: reference-vs-new disagreements 0 (loudness and recorded relations, even on loud documents); old-vs-reference misses 10, all in the header family; real-doc downstream clean and a decoded-but-false owner still reaches its consumer | `d9216cce67c0fb5b3eea264b9b96c05aef00110c53a550babb4ac507ebcdb6f3` |
| [10-c4-control-inventory.log](10-c4-control-inventory.log) | `node --test --test-reporter=tap` on the C4 control file and on the evidence-record guard | 0 | 207 tests, 21 suites, 0 fail, 0 skipped, every control block named in TAP order; guard 4 tests, 0 fail | `82202be5773f68bb6ae84dfabe21a4ea4f4c20ddec9c4bdb961a2a192a6c0419` |

`npm run test:evals` was not run. The correction is confined to the C4 evidence parser, its controls
and contract prose, and reaches no Agent or model-facing behaviour, so nothing in the diff
is reachable from an eval. Recorded as not run, with that limit. There is no lint or build script in
this repository; the relevant static check is `npm run typecheck` and the relevant link/import check
is `npm run check:builder-docs`, both run and green.

When 10 ran, this directory held no `MANIFEST.md` yet — the run itself writes the logs it is about —
so the evidence guard's mid-capture rule skipped this directory and checked the seventeen settled ones.
Its coverage of *this* directory is asserted after the manifest exists; that post-manifest run and
its output are recorded in [implementation-02](../implementation-02.md). The guard's work roots
already cover this packet's directory from round 1, so no guard change was needed.

## Reading 08 — K10-CORR1-R1-01, reviewed C vs new C

The reviewed column is the round-1 candidate's `inventory-oracle.ts` taken byte-for-byte with
`git show 76ce938074ffa910fbd74374e388ba8d226af4c6:tests/conformance/architecture/inventory-oracle.ts`
(git blob `014a07dbcfcf04679602fd5ab1493e0fe566f5c1`, SHA-256
`22a822a46a1eac786b2d0190c25d4fada3685b306f23b676dd825b1ded2dd6b2`); its imports are type-only and
erased by `--experimental-strip-types`, so it runs standalone and is the reviewed code rather than a
paraphrase. The new column is the committed production parser imported from its real path (git blob
`1305b0873cc77c393d50a8a5513b989626f17eeb`, SHA-256
`a4a4bcbadf434fca685382646b682b5560e3f261cc662bf0b3c17fc27e82d256`).

| Document | Reviewed C | New C |
|---|---|---|
| baseline, unmutated | clean, 4 dependency rows | clean, 4 dependency rows |
| exact review counterexample (widened header+delimiter+`evil-package` cell) | **silent, relation == baseline** | LOUD: header must-be + excess (schema allows 4), row not recorded |
| widened header+delimiter+extra cell in Zones/Export/Deferred | **silent** | LOUD: header must-be + excess (schema allows 3/3/5), row not recorded |
| renamed middle dependency header cell | **silent** | LOUD: header must-be, bodies still decode |
| narrowed dependency header, schema-correct bodies | LOUD but wrong: all four bodies excess, target dropped | LOUD and right: header must-be only, target still files=2 |
| ordinary excess body cell, correct header | LOUD | LOUD (preservation) |

Cases 7; old-silent/new-loud distinguishing 5; new fails its requirement on 0. The narrowed-header
row is the reverse distinction: the reviewed C trusted the narrowed header and deleted schema-correct
bodies as excess, while the new C judges bodies by the schema.

The review counterexample's verbatim messages from the new C:

- `Dependency table header must be "Zone | `.ts` files | Reaches `legacy-core` via | Reaches third-party" but the document has "Zone | `.ts` files | Reaches `legacy-core` via | Reaches third-party | Extra claim"`
- ``Dependency row for target-kernel carries 5 cells but its header declares 5; the excess is read by no column (governed schema allows 4): `target-kernel` | 2 | nothing | nothing | `evil-package` ``

Same document under the reviewed C: nothing unreadable; the row is recorded as
`files=2, reaches=[], thirdParty=[]`, indistinguishable from baseline.

## Reading 09 — the independent reference

Round 1's audit was cell-local by construction: it replaced one cell at a time and asked an
independent reference what that cell means. K10-CORR1-R1-01 occurs *before* any cell reaches a
decoder — the document first widens its own header, which the reviewed implementation then trusts
when deciding what counts as excess — so no per-cell oracle can reveal it. This audit replaces the
oracle's authority rather than its cells.

Independence from the implementation: the reference imports nothing from `inventory-oracle.ts` and
shares no helper with it; its four schemas are verbatim header lines read out of
`ownership-inventory.md` at run time (each required exactly once, so the quoting step is beyond any
author's reach); it splits cells, discovers tables, checks headers, judges arity and decodes cells
with separately written code (whole-cell regular expressions plus a decimal round trip, where the
implementation uses left-to-right index walks); and it assembles its own keyed relations for
comparison.

Results over 29 documents in all four governed tables — baseline, the exact attack, widened-header-only,
narrowed-header, rename, reorder, ordinary excess, short-minus-ungoverned, short-minus-governed and
one whole-cell decoder case per table: **reference and the new C agree on loudness and on the full
recorded relation on all 29, including on loud documents** (loudness alone would hide a parser that
reports the header while still recording the attacked row; the relation check forbids that). The
reviewed C misses 10 of the 29 — every document in the header family (four attacks, one
widened-header-only, four renames, one reorder) — and agrees everywhere else, which is exactly the
shape of a subsystem the prior audit could not see. Non-vacuity: the reference and the new C agree
on every recorded row of the real document, the real document reports nothing unreadable, and its
downstream disagreements are empty; a decoded-but-false Deferred owner still reaches its consumer
as a disagreement rather than vanishing.

Residual risk, stated rather than hidden. One author still wrote both the parser and the reference,
and the *inference* from the document's header lines to per-position ownership (which trailing
positions are ungoverned prose) is still one person's — though it is now written as a checked-in
table in `RowSpec` rather than as an unwritten assumption, and the audit asserts the short-row
twins that pin it. The narrowed-header twin is the guard against a schema that is merely stricter:
a header narrower than the schema stays loud, but schema-correct bodies still decode.
