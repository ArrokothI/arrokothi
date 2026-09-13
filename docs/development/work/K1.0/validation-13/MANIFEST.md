# K1.0 validation-13 — raw output for clean payload C

**Payload C:** `8c7113578fcc475758e4fcbbaf5beb372385d082`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Reviewed round-12 H:** `da7db0275049a78e069a4068ca68b1b8f296e6a3`; **review record:** [review-12.md](../review-12.md), recorded by `82a79451507a239f759dbb3c22e5f3566af33a95`.
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
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, correction delta and cumulative diffstat | 0 | correction delta 3 files changed, 286 insertions(+), 34 deletions(-); parent of C is exactly the review-12 record; `tests/conformance/k0` byte-identical to base; remote `main` still exactly base; advertised branch still exactly the review-12 record; H12 oracle git blob `dabb174996df48518ad449c18dea54e212abfcb0`, C oracle git blob `9d97095a4e5e6b1a3f7acb37658117fedc592b8e` | `11325d4ebf924289b4d70e220222315af5d8c1ebcd8045b307625b89c8d4f243` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2001 tests, 295 suites, 0 fail, 0 skipped | `9ca816c2e0fc0f3a47808d22cd89d2f989b35a657d276cd210be39c211e0a05a` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1888 tests, 276 suites, 0 fail, 0 skipped | `d4a47817eceb8a02c3d77b1a0e83572c7434a2d1f242d29de6202c9e562888fd` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `30f35822692d0e07dda300d94aea66b5f7ac85c30479c311dcb705f793ca5835` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `2cafe56f14889cd035b0b6bc71e9fa990cf615da0d4424c6e01eb3734d1bac1f` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `7a34ba4faf20d77ada12dc8da48c38749f3702f7c3b4abd3d0726ed11fbdce50` |
| [08-r1201-demonstration.log](08-r1201-demonstration.log) | inline demonstration, source quoted in the log | 0 | 13 cases; 7 newly distinguishing, 6 agreeing as required, 0 regressions | `fc8e06f21f3e4179919b3366741e8003164ab2d32394698dcfcf903846a40085` |
| [09-lexical-transition-audit.log](09-lexical-transition-audit.log) | inline audit, source quoted in the log | 0 | 9 windows with kind/depth/eligibility per line and lines == transitions everywhere; VT/FF openers shown as html7, NBSP boundaries ordinary, NBSP/VT/FF-only lines raw-continuing, space-only ending, clean-document spot check 117 == 117 | `8a62670837b48d7df16e01b75c71a8a8ddfd99d807eecc83962e3816d3a0d29e` |

`npm run test:evals` was not run. This packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. Recorded as not run, with that limit.
There is no lint or build script in this repository; the relevant static check is
`npm run typecheck` (clean) and the relevant link/import check is `npm run check:builder-docs`.

## Reading 08 — K10-R12-01, H12 vs C

The H12 column is the reviewed candidate's `inventory-oracle.ts` taken byte-for-byte with
`git show da7db0275049a78e069a4068ca68b1b8f296e6a3:…` (SHA-256 `030b65b1ffcd5da1e54464a6b12d21f0804eccb65274b95e8de4c2f539c3b01a`,
git blob `dabb174996df48518ad449c18dea54e212abfcb0`);
its imports are type-only and erased by `--experimental-strip-types`, so it runs standalone
and is the reviewed code rather than a paraphrase. The C column is the committed production
parser imported from its real path (git blob `9d97095a4e5e6b1a3f7acb37658117fedc592b8e`,
SHA-256 `cf3680f503739990de5f27d81454582f0f75b27f0ccf9f4ea52badfaab067bda`).
Both are read end to end through `inventoryDisagreements`. GREEN = zero messages (valid
document accepted); RED(n) = n messages.

| Case | H12 (reviewed) | C (committed) |
|---|---|---|
| baseline, unmutated document | GREEN | GREEN |
| R12-01 VT begins a type-7 attribute (miss → catch) | GREEN (silence: heading terminates, planted table hidden outside) | RED(2) exact further table |
| R12-01 FF begins a type-7 attribute (miss → catch) | GREEN (silence) | RED(2) exact further table |
| R12-01 VT around `=` still a complete tag (miss → catch) | GREEN (silence) | RED(2) exact further table |
| R12-01 NBSP-only line does not end type 7 (miss → catch) | GREEN (block wrongly ended, heading re-enabled) | RED(2) exact further table |
| R12-01 VT-only line does not end type 7 (miss → catch) | GREEN (same) | RED(2) exact further table |
| R12-01 NBSP is not a type-6 boundary (manufactured → green) | RED(2) manufactured further table | GREEN (heading real, planted table outside) |
| R12-01 NBSP script line opens no swallowing block (manufactured → green) | RED(21) cascade, Deferred missing | GREEN (ordinary prose, later sections intact) |
| valid VT type-6 boundary still opens (agree RED) | RED(2) | RED(2) |
| space-only line still ends type 7 (agree GREEN) | GREEN | GREEN |
| ASCII attribute syntax still opens type 7 (agree RED) | RED(2) | RED(2) |
| round-12 `<div/ x>` stays ordinary (agree GREEN) | GREEN | GREEN |
| round-12 `<div/>` still opens type 6 (agree RED) | RED(2) | RED(2) |

The 7 committed controls covering the finding live in C
(`kernel-landing-zone.test.ts`: "GFM whitespace and blank-line lexical classes (K10-R12-01)"
with 7 tests: VT/FF type-7 openers, VT/FF optional/trailing positions, NBSP type-1/6
non-boundaries, the NBSP-script no-swallow Zones proof, NBSP/VT/FF-only lifetime continuation,
space/tab-only termination, and ASCII/CRLF/token-matrix preservation). Every prior accepted
control — the round-12 type-6 token matrix, round-11 container-owned leaf lifetime, attribute
separators, GFM-0.29 `textarea`/`search`, round-10 list/container depth, round-9 fence
single-consumption, structural header/body identity, GFM row discovery, key-before-value
uniqueness, relational comparison, dependency recomputation, SELF-12…23 and the C1/C2/C9
scanner reconstruction — is unchanged and passes: 2001/2001 full, 1888/1888 conformance, zero
skipped.

## Reading 09 — the whitespace/blank-line lexical and transition audit

09 shows the reconstructed lexical model directly: each opener runs in its own window so no raw
block leaks into the next case. Each window prints one row per physical line — depth
before/after, fence/HTML state with the kind (`html6`/`html7`/`html1` `@n`), structural
classification, heading/table eligibility on that line — plus the whole-parser observable and a
`lines == transitions` check, which holds in every window. Shown: VT attribute opener as
`html-open html7@0` with the heading `html-raw` and the blank `html-end-blank`; NBSP type-6
and type-1 boundaries staying `ordinary` with the heading eligible (`head=Y`); VT as a valid
type-6 boundary (`html6@0`); NBSP-only filler as `html-raw` continuation versus space-only
filler as `html-end-blank`; VT-around-`=` and FF-before-`>` openers as `html7@0`; and a
clean-document spot check (117 == 117, only the real import list lives in containers, no
container kill fires on the clean tree).
