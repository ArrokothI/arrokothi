# K1.1 validation-11 — raw output for unchanged payload C10

**Payload C10:** `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14` (unchanged, byte-for-byte).
**Candidate:** H11, the commit containing [implementation-11.md](../implementation-11.md).

**Read this first.** This round makes **no production source, test, fixture, evaluator, threshold,
configuration or contract change**: the independent review of H10 ([review-08.md](../review-08.md))
found K1.1-C1 through C10 semantically PASS and explicitly closed K11-R7-STATE-03, returning
`CHANGES REQUIRED` only for two P2 evidence/status-record findings (K11-R10-EVID-01,
K11-R10-DOC-01). The semantic payload therefore remains C10 exactly, and this directory regenerates
the evidence against C10 rather than editing `validation-10/` in place. `validation-10/` is
preserved as what it was — the clean-C10 run with one corrupt manifest token and one unsubstantiated
inventory summary — and is **not** claimed as this candidate's evidence. Everything below was rerun
on C10. The reviewer binds to H11.

**Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (integrated `main`, 006/007/008/012/015 as they stand there).
**Rejected candidate this attempt corrects — H10:** `2cdb1e22f0391079619e97a0fe49bf09c7855ca6`
(payload C10 `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14`).
**Authoritative review:** [review-08.md](../review-08.md) (OpenAI ChatGPT, GPT-5.6 Sol, High reasoning),
recorded at `fbba168b638840cecc871ce4e787bc29ddc04b5d` (CHANGES REQUIRED: C1–C10 PASS, K11-R7-STATE-03
CLOSED, K11-R10-EVID-01 + K11-R10-DOC-01 mandatory).
**Prior history, all preserved as ancestors of C10:** C `8cd9e269` / H `0f345b3c` / review-01;
C2 `6b7e5fb0` / H2 `297cc56f`; C3 `615cdf88` / H3 `b3cdf337` / review-02; C4 `1d4e4867` / H4 `156f1353` /
review-03 + supplement-01; C5 `e0660eff` / H5 `bd2dab6d` / review-04; C6 `b3d0d59f` / H6 `417798a3` /
review-05; C7 `e59bd312` / H7 `ae02c32a` / review-06-supplement-01 + review-06; C8 `79151afc` / H8
`c1e7d78a` (superseded before review, preserved); C9 `5ac76207` / H9 `5dddc2ad` / review-07 (CHANGES
REQUIRED, preserved).
**Integrated main (PR #26):** `05f48c204d1eae021b3464c206e5c11e84bb3505`.
**Prerequisite:** K1.0 with corrections 01–02, integrated as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`,
with [parent receipt](../../K1.0/integration-01.md) and [correction-02 receipt](../../K1.0-correction-02/integration-01.md).

`01-tree-and-environment.log` shows B and every prior C/H/review commit are ancestors of the C10
checkout; H10 and the review-08 record descend from C10 (administrative children, not payload) and
are verified as such rather than as ancestors.

**Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Date:** 2026-09-15.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory for validation runs:** `/tmp/k11-c11-validation` (detached `git worktree` at exactly C10,
`node_modules` symlinked from the main checkout; `git status` there shows only `?? node_modules`).
Logs are stored here in `docs/development/work/K1.1/validation-11/` and committed with `git add -f`
(because root `.gitignore` ignores `*.log`).

Declared output-only attachments under [006](../../../006-development-process.md). Every command below ran
against the clean payload tree C10, whose only uncommitted content in the worktree was the symlinked
`node_modules` (which the run does not write). Nothing here introduces or changes a script, fixture,
evaluator rule, threshold or configuration; those are payload in C10 (including the unchanged
`canonicalize@3.0.0` dependency and lockfile). The ablations in `09b` modify the detached worktree
checkout of C10 in place, running only the packet suite per ablation, each reverted via
`git checkout -- .` before the next; the worktree's HEAD stays `d1fcffd` throughout (verified after
the last revert).

## What K11-R10-EVID-01 corrected here (and what it did not change)

1. **The 09b digest token.** The `validation-10` manifest recorded a 51-character token for
   `09b-distinguishing-ablations.log`. The exact committed attachment hashes (SHA-256) to the full
   64-character `4594c1a0b44091ddd510f9716991054e788b639c4f6cd1bccee1eb05cd40aad8` (see implementation-11 for the
   precise corruption: 13 middle hex characters dropped in transcription). The attachment itself was
   and is intact — every other digest in the `validation-10` table re-verifies against its committed
   file — but the token as recorded could not be a SHA-256 digest. This manifest records only
   digests recomputed from the exact files committed alongside it (independently re-verified after
   finalization; see implementation-11).
2. **The zone inventory.** The `validation-10` `01` log measured the export surface with
   `grep -c "export" packages/kernel/src/index.ts` (= `15`) while the manifest/report claimed the
   log establishes 17 runtime exports. Both numbers are real measurements of different things: `15`
   is the count of *source lines containing the substring "export"* in `index.ts` — 7 value-export
   lines plus 8 `export type` lines, the latter erased at compile time — while `17` is the runtime
   surface (2 + 1 + 4 + 2 + 1 + 2 + 5 value names across the 7 value-export lines). A line count
   cannot substantiate a runtime-surface claim. The `01` log in this directory therefore measures
   the surface directly: it imports the barrel and prints all 17 names, alongside the 11-file
   listing, the exact `canonicalize` pin (version, resolved tarball, integrity), and the distinct
   import specifiers reachable from the zone (`./` internals, `node:buffer`, exactly `canonicalize`).

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry (B + all prior C/H/reviews as ancestors; H10/review-08 verified as C10 descendants), `H9..C10` payload file set, dependency pin with integrity, zone file listing + count, measured runtime export surface (17 names), distinct import specifiers | 0 | C10 checkout clean at `d1fcffd`; 11 `.ts` files; 17 named runtime exports printed in the log; `canonicalize` exact `3.0.0` with pinned tarball + integrity; imports are `./` internals, `node:buffer`, exactly `canonicalize` | `b38fc5fe4e730ad0f2619fd0218af38c0a0b775c5288738de7a94ad24da8e775` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2,265 tests, 345 suites, 0 fail, 0 skipped | `2909ac4d0bdf8fbd73e0527ffd0c1c63ad5be9de7d6abca4c98b276a5f8dbc1c` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail, 0 skipped | `24bc3515f875e4691fa80a341019fbb9b93119c07889fc1703c08ccab0a5c1f0` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `734c26027b8fbd1a49675b9ed0bbde16e385fef04fd5adf8c88c3d52b140444b` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 207 tests, 44 suites, 0 fail, 0 skipped | `77a71f5a4ed268462f72d12e6ea9b65e357a7cd3b654843b5c627117c8aa2c4b` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail — the public host path is unchanged | `84ec4d88549276e8f41ea097199896938569f56d718088dd2f8fdd8146eb42b1` |
| [08-architecture-suite.log](08-architecture-suite.log) | `node --test --test-reporter=tap` over `tests/conformance/architecture/*.test.ts` | 0 | 362 tests, 37 suites, 0 fail | `559cbf084203930b60d5611d08dc3e349a303a5f02af2e314a202de2e46d1634` |
| [09-k1.1-case-inventory.log](09-k1.1-case-inventory.log) | `node --test --test-reporter=tap` over `packages/kernel/tests/*.test.ts` | 0 | 207 tests, 44 suites, 0 fail; every case named in TAP order | `0cebf6713943390451edbccd37427c64de78acf930801fa1ce93210e0704cd1b` |
| [09b-distinguishing-ablations.log](09b-distinguishing-ablations.log) | control + 7 one-behaviour ablations of C10 in the detached worktree, packet cases run against each | 0 | control clean (207/0); **7 of 7 rejected** by named cases | `97d8a6237e5467841d5a2f7d098965cab57497dec04c2e5f6ace75ab083dc50c` |

## What the ablations establish (rerun, unchanged semantics)

Each row removes exactly one behaviour and is rejected by cases that name the invariant it removed.
XA/XB preserve the round-10 descriptor-direction correction; X1/X7/X3/X4/X8 preserve the own-data
family. Case names are in the `09b` log. Results reproduce the round-10 battery exactly.

| Ablation | Guard it removes | Result |
|---|---|---|
| **XA** `defineData` builds an ordinary descriptor literal | K11-R7-STATE-03 install direction | REJECTED by 11 cases |
| **XB** `restoreDescriptor` passes the saved ordinary descriptor through | K11-R7-STATE-03 restore direction | REJECTED by 6 cases |
| **X1** `defineAt` reverts to ordinary indexed assignment | K11-R6-STATE-02 / VAL-04 | REJECTED by 15 cases |
| **X7** `appendOwn` uses the captured primordial `Array.prototype.push` | K11-R6-STATE-02 | REJECTED by 14 cases |
| **X3** serializer window keeps the named slots but stops removing inherited index shadows | K11-R6-VAL-05 | REJECTED by 3 cases |
| **X4** one ordinary indexed write reintroduced at a site with no prior runtime witness | the mechanical control | REJECTED by the source-text control and one runtime case |
| **X8** the window stops handing back the prototype positions it borrowed | K11-R6-VAL-05 restoration | REJECTED by 9 cases |

## Counts (unchanged payload: identical to round 10)

| Figure | At base `777b995` | At C10 (round 10 and this rerun) |
|---|---|---|
| `npm test` | 2,060 tests, 302 suites | 2,265 tests, 345 suites |
| `npm run test:conformance` | 1,947 / 283 | 1,949 / 283 |
| `npm run test:kernel` | 4 tests | 207 tests, 44 suites |
| Architecture suite | 360 tests | 362 / 37 |
| `packages/kernel/src` `.ts` files | 2 | **11** (listed in `01`) |
| `@arrokothi/kernel` runtime exports | 2 | **17** (named in `01`) |
| Target-zone third-party reach | nothing | `canonicalize` (exact `3.0.0`) |

## What was rerun, inspected, or not run (006/008)

- **Reran on clean C10** (detached worktree above): `typecheck`, `test` (full), `test:conformance`,
  `check:builder-docs`, `test:kernel`, `test:sdk`, the architecture TAP suite, the packet TAP
  inventory, and the control + 7 distinguishing ablations. Exits, counts and digests are the table
  above; raw outputs are the ten `.log` files committed alongside this manifest. The rerun
  reproduces every round-10 count exactly, which is itself the check that no payload defect was
  hiding behind the evidence correction: had C10's semantics differed from what round 10 proved,
  the counts or the ablation rejections would have moved.
- **Inspected historical evidence (not rerun):** prior payload/report/review commits and the K1.0
  prerequisite integrations via `merge-base --is-ancestor` in `01-tree-and-environment.log`; prior
  `validation-01/.../10` logs, which remain committed as their own rounds' evidence and are **not**
  claimed as this candidate's reruns. The `validation-10` 09b attachment was hash-verified intact;
  only its manifest token was corrupt (see above).
- **Implementer-only auxiliary probes (not validation evidence):** none this round. No semantic
  question arose; the work was transcription, measurement and rerun.
- **Not run:** `npm run test:evals` (no Agent behaviour, no model path, no eval fixture in this
  correction — nothing in C10 or in this administrative round touches Agent/model/eval behavior),
  process-kill/persistence runs (no such claim), native Driver fidelity, packaging/release checks,
  and any E-gate.

## What these logs do not show

They are deterministic Kernel-local evidence for an unchanged payload. They contain no E1 result, no
persistence or process-failure evidence, no native Driver observation and no packaging or release
check. A green suite is not acceptance: the per-criterion assessment in
[implementation-11](../implementation-11.md) is the implementer's, and the verdict is an independent
reviewer's, bound to the exact candidate H11.
