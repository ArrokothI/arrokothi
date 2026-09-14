# K1.0 validation-04 — raw output for clean payload C

**Payload C:** `0f012d4eed6ccc905236ccdafc25148d399619d6`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Reviewed round-3 H:** `bddbbc6ee8bc3ce1198c431efedcf9227d8d5cba`; **review record:** [review-03.md](../review-03.md).
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Date:** 2026-09-13.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../006-development-process.md). Every command
ran against the committed payload tree, whose only uncommitted content was this directory,
which the run itself writes. Nothing here introduces or changes a script, fixture, evaluator
rule, threshold or configuration; those are payload in C.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, correction delta and cumulative diffstat | 0 | correction delta 3 files changed, 147 insertions(+), 21 deletions(-); `tests/conformance/k0` byte-identical to base | `a00ce2208ff2eba6cb4442d6df313ec839ca37ec30ed2caedf3d029df266af3c` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 1892 tests, 284 suites, 0 fail, 0 skipped | `3cf21812ce7d74879f2eb81582cc931bc8ad5c9e13b0f4ee097f932ae6903d19` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1779 tests, 265 suites, 0 fail, 0 skipped | `2a4a0a3b88b2a33e2fa8035d476e410492d0fdaf8688b5cfe347d34e6318fb78` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `30f35822692d0e07dda300d94aea66b5f7ac85c30479c311dcb705f793ca5835` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `37eff2e3a96fdf5948505430f7765d16ffea35b52e932663c384acac368ca506` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `dd227f9ffd8ab92b4e77570cd9ea294559dbbb575a7f1cad1470` |
| [08-r301-demonstration.log](08-r301-demonstration.log) | inline demonstration, source quoted in the log | 0 | real document agrees; all six duplicate-key mutations (zone/DX/package × before/after) each report a duplicate disagreement | `b500de0f64360a2d982fbb103b2219510c322fd0b59c26a64158ee587e789df6` |

`npm run test:evals` was not run. This packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. Recorded as not run, with that limit.

## Reading 08 — K10-R3-01

Seven runs of the same `parseInventory` → `inventoryDisagreements` path the agreement test uses,
at payload C. The real document reports no disagreement. Each of the six duplicate-key mutations —
a stale contradictory zone, DX and package row inserted immediately before and immediately after
the correct row — reports a `duplicate … row` disagreement naming the key, so the result no longer
depends on duplicate-row order. In the false-before-correct order the preserved first (false) row
additionally reports the concrete relation mismatch, because the first row for a key is kept rather
than overwritten. The duplicate cross-boundary control (both orders) is exercised by the committed
test itself, which parses the mutated table through `parseDependencyTable` and requires the
duplicate zone to be reported.

Validation-03's demonstrations 08–10 cover subsystems this round does not touch; the full suite
above re-verifies them (all ten round-3 mutated-document controls and every extractor/guard-path
control still pass, 1892/1892 with nothing removed, skipped or weakened).

## Correction, round 5 (K10-R4-02)

The `07-test-sdk.log` digest recorded in the table above is **not a SHA-256 value**: it has 52
hexadecimal characters, and a hex-encoded SHA-256 has 64. Independent [review-04.md](../review-04.md)
found it. The original row is left exactly as it was recorded, so this is a superseding note rather
than a rewrite of history.

| | |
|---|---|
| Recorded above | `dd227f9ffd8ab92b4e77570cd9ea294559dbbb575a7f1cad1470` (52 characters) |
| Actual SHA-256 of `07-test-sdk.log` | `dd227f9ffd8ab92b4e77570cd9ea294559dbbbad00b172e3bb575a7f1cad1470` |
| Nature of the defect | Transcription. The recorded value is the true digest with a twelve-character run, `ad00b172e3bb`, dropped from offset 38; prefix and suffix are otherwise identical. |
| The log itself | Unchanged. `git diff 14cc1c1 <this candidate> -- 07-test-sdk.log` is empty, and the file's digest at round-4 H equals the value above. |
| What it does and does not affect | An evidence-record identity only. The pinned log records 22 SDK tests passing, 0 failing, and the full-suite log in `03-test-full.log` contains the same SDK cases. No SDK behaviour claim changes. |

Every digest recorded in every K1.0 validation manifest was re-audited when this was corrected:
36 digests across `validation-01` through `validation-04`, of which this was the only defect; the
other 35 are well-formed SHA-256 values that match the files they name. The audit and its result are
in round 5's [`09-digest-audit.log`](../validation-05/09-digest-audit.log), and
`tests/conformance/architecture/evidence-records.test.ts` now checks the same property mechanically
so the class cannot recur silently.
