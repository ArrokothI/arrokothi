# K1.0 validation-05 — raw output for clean payload C

**Payload C:** `6fd225e0115d6b91bd5088e22d41d137088d9688`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Reviewed round-4 H:** `14cc1c1997573ac434b2491653ab4cb974abf633`; **review record:** [review-04.md](../review-04.md).
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Date:** 2026-09-13.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../006-development-process.md). Every command
ran against the committed payload tree, whose only uncommitted content was this directory,
which the run itself writes. Nothing here introduces or changes a script, fixture, evaluator
rule, threshold or configuration; those are payload in C.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, correction delta and cumulative diffstat | 0 | correction delta 6 files changed, 666 insertions(+), 96 deletions(-); cumulative 67 files changed, 25231 insertions(+), 36 deletions(-); `tests/conformance/k0` and validation-04's SDK log both byte-identical | `1241139f3f98b8c6a5574a68ec6d798a363a07653b5f6cc5bf9452de03b1538c` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `e35a843c289534b272afe62df16b671facdaf70c83a1954dad4ce6ace68c989f` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 1899 tests, 285 suites, 0 fail, 0 skipped | `dba3b61791b534b4f4719db09d957d118beb256ce90b65802c70e85165e40a24` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1786 tests, 266 suites, 0 fail, 0 skipped | `dcf3a913dd9116eec0b1b09116431a1675fd45facb98f6135c6bc7c5c4f2b951` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `f46b3efc5aa08693c0234950c328e0c3abde8e7ccf77c86829953f62ae9470ab` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `10efb1dd3d4005d5b8458d7712c3dbb899357b96adfe1e8f95346d203949267d` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `b57dc57dd073ddba8afec3820e418e87b3eb0ce329a6f3c3d0daa202df5e3b8c` |
| [08-r401-demonstration.log](08-r401-demonstration.log) | inline demonstration, source quoted in the log | 0 | round-4 parser reports 0 for all three malformed-row cases; the committed parser reports 2, 1 and 1, with both retained duplicate controls unchanged | `b7ff5a6ac4da2f052f98b1d7458ee9e1e94f54832f0dfd36362ee66e61fb7daa` |
| [09-digest-audit.log](09-digest-audit.log) | inline audit, source quoted in the log | 0 | 36 digests across validation-01…04; one defect, the one K10-R4-02 names | `f36a5872a6d74edf874a9fa15dcfdbe74735f34437ace535d058c233ef0b8910` |

`npm run test:evals` was not run. This packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. Recorded as not run, with that limit.

## Reading 08 — K10-R4-01

Every row in the cross-boundary dependency table carries a zone key. The question is what
happens to a row that carries a recognisable key and then fails to parse. The round-4 column
is that round's helper, quoted in the log from the reviewed H4.

| Case | Round 4 | Committed |
|---|---|---|
| baseline, unmutated document | 0 | 0 |
| malformed keyed row **before** the correct row | **0** | 2 |
| malformed keyed row **after** the correct row | **0** | 1 |
| row with no recognisable key | **0** | 1 |
| well-formed duplicate before (retained K10-R3-01) | 1 | 1 |
| well-formed duplicate after (retained K10-R3-01) | 1 | 1 |

The second half of the log shows the same shape closed in the three ownership tables: a short
row with a recognisable key now yields a malformed-row disagreement and a duplicate, where the
round-4 Zones loop yielded nothing (K1.0-SELF-08).

## Reading 09 — K10-R4-02

Every digest recorded in every K1.0 validation manifest, checked for well-formedness and
against the file it names: 36 across rounds 1 to 4, of which exactly one is defective — the
`07-test-sdk.log` identity K10-R4-02 found. The other 35 are well-formed SHA-256 values that
match their files. The true digest and the nature of the transcription are recorded in a
superseding note appended to [validation-04's manifest](../validation-04/MANIFEST.md), with
the original row left exactly as it was. `tests/conformance/architecture/evidence-records.test.ts`
now checks the same property mechanically.

The audit reports `validation-05` as a capture in progress: at the moment it runs, this
directory holds logs and no manifest yet. That is the same condition K1.0-SELF-09 describes.
