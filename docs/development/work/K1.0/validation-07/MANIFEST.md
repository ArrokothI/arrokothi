# K1.0 validation-07 — raw output for clean payload C

**Payload C:** `249c7a8b04f4a724926efd9ba0c67782a30286ce`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Reviewed round-6 H:** `5dd570002c082872914291ef0b3cc244bf9bc205`; **review record:** [review-06.md](../review-06.md), recorded by `3e9779e64305f87b48e773b102d4d1523e7ea4cb`.
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
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, correction delta and cumulative diffstat | 0 | correction delta 3 files changed, 361 insertions(+), 50 deletions(-); cumulative 79 files changed; parent of C is exactly the review-06 record; `tests/conformance/k0` byte-identical to base; no legacy source touched; H6's `cells[0] === spec.headerFirstCell` replaced by structural discovery | `8a44cb207fcc3b53459a5d6b603c6936bd1fea11a007fe0ee17cab9f4a6143f9` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `58cf30ef12aea8911fe955c776770fd519528bf55a00a86f4ce5191ebc893dd7` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 1926 tests, 286 suites, 0 fail, 0 skipped | `066d7229a303db8c65f0a90ec603af16f65dadc5ebd188f1c474468836d1a831` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1813 tests, 267 suites, 0 fail, 0 skipped | `5296c9537c413872e3168c896e9ce08e4ee8ac0875481750c36550c04b5a147e` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `9a3071de1752f40ebf39533477499c4f4075a0d01622e19ab677992b63c92b4f` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `c8c820c2eb741dd428d21bff912f62e043382f415338b390611be8c6a0f647f9` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `07bb0ac8b0844d8a39cfc82d17100b14c9899c5d01de8239e0be04a05ca92432` |
| [08-r601-demonstration.log](08-r601-demonstration.log) | inline demonstration, source quoted in the log | 0 | 32 cases; 18 newly distinguishing (review-06 literal, 16 header-label variants, K1.0-SELF-12); 0 regressions; every round-2/-3/-5/-6 control still reported; baseline green under both readers | `184f38195f5407e1fa340b80afdea4f69334fa81a58cbe3c2ffd57baa5159e3c` |
| [09-silent-exit-audit.log](09-silent-exit-audit.log) | inline audit, source quoted in the log | 0 | every branch of section selection → table discovery → header/delimiter recognition → row splitting → header/body classification → key extraction → duplicate handling → value parsing → map insertion → propagation → relation comparison driven with a reaching input; three branches legitimately quiet, each accounted for below | `29b20e992259c4630442adaf297c7d6e41c5ecdc2939b3a67f7c149706eb4838` |

`npm run test:evals` was not run. This packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. Recorded as not run, with that limit.

## Reading 08 — K10-R6-01

The H6 column is the reviewed candidate's `inventory-oracle.ts` taken byte-for-byte with
`git show 5dd5700:…`; both of its imports are `import type` and are erased by
`--experimental-strip-types`, so it runs standalone and is the reviewed code rather than a
paraphrase. The C column is the committed production parser imported from its real path. Both are
read end to end through `inventoryDisagreements` plus `parseDependencyTable`.

| Case | H6 (reviewed) | C (committed) |
|---|---|---|
| baseline, unmutated document | 0 messages | 0 messages; zones 4, deferred 12, packages 7, dependency 4, unreadable 0 |
| review-06 literal (`\| Zone id \| …` before the correct Zones row) | SILENT | reported |
| 4 governed tables × full/omitted-both edge pipes × before/after (16) | SILENT in all 16 | reported in all 16 |
| K1.0-SELF-12, repeated `## Zones` heading with a contradictory table under it | SILENT | reported (2 rows) |
| K1.0-SELF-13, contradictory row promoted to a further table's header | reported | reported |
| renamed structural header | reported | reported |
| governed table not discoverable at all | reported | reported |
| round-6 omitted trailing/leading/both × before/after (6) | reported | reported |
| round-6 pipe-less continuation; escaped pipe | reported | reported |
| round-5 malformed keyed dependency row | reported | reported |
| round-3 duplicate export row | reported | reported |
| round-2 relational, two zones' roots swapped | reported | reported |

K1.0-SELF-13 and the renamed header are reported under **both** readers. They are not H6 defects.
They are the silent exits a naive structural fix would have opened — skipping "the header" by
position is only safe while a section holds one governed table, and a label that stops selecting the
header must not stop checking it — so they are recorded as regression controls on this correction,
not as newly found H6 holes. The demonstration fails if either one stops being reported.

The 21 committed controls covering these cases live in C
(`kernel-landing-zone.test.ts`, "header identity is structural, not textual (K10-R6-01)"):
16 header-label body rows, the real-headers-accepted case, the renamed-header case,
K1.0-SELF-13, K1.0-SELF-12 and the missing-governed-table case. All 24 round-6 omitted-edge
controls, the pipe-less continuation, the alignment-delimiter and edge-less header/delimiter
variants, the escaped-pipe control, the round-5 malformed/short-row controls, the round-3
duplicate controls and the 16 round-2 relational controls are unchanged and still pass.

## Reading 09 — the three branches that are legitimately quiet

Every other branch in the pipeline returns at least one message for a reaching input; 09 shows the
whole observable result for each. Three produce none, and each drops material that is structurally
not part of the governed table, or drops nothing at all:

1. **A fenced block appended after the last body row.** Under GFM the fence starts a code block, so
   those lines render as code. The document does not assert them as rows, and a reader sees a code
   block rather than an inventory row. Excluding them is GFM fidelity, not a row disappearing.
2. **Excess cells beyond the header's cell count.** The *row* is recorded — it has its one outcome.
   GFM Example 204 drops the excess in rendering too, so the ignored text asserts nothing. The
   invariant is stated over rows; this is a cell-level reading rule.
3. **A second backticked token inside the key cell.** The row is recorded. The key is the first
   backticked token in that cell, which is a recorded reading rule rather than an exit: a duplicate
   first token is still a duplicate, and keying to a different zone still produces a wrong-roots or
   undeclared-zone disagreement.

Two branches that used to be quiet are no longer. A missing governed table is now reported as such
instead of being read as an empty relation that only the reverse-direction comparison noticed, and a
repeated section heading no longer truncates its own section (K1.0-SELF-12).
