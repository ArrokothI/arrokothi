# K1.1 validation-14 — raw output for unchanged payload C11

**Payload C11:** `f117e6b47c4930af6735aaa3668b8b4c242fd76d` (unchanged, byte-for-byte).
**Candidate:** H14, the commit containing [implementation-14.md](../implementation-14.md).

**Read this first.** This round makes **no production source, test, fixture, evaluator, threshold,
configuration or contract change**: the independent cumulative review of H13
([review-12.md](../review-12.md)) closed K11-R12-ID-01 and passed K1.1-C1 through C10
semantically, returning `CHANGES REQUIRED` on exactly one remaining finding, reopened
K11-R10-EVID-01 (P2): H13's fresh `01-tree-and-environment.log` lists eleven target filenames
but displays a count of `12` beside a tautological `test 11 = 11`, contradicting the report's
and manifest's claims of a fail-closed tracked-set measurement. The semantic payload therefore
remains C11 exactly. `validation-13/` is preserved untouched as the evidence attached to rejected
H13 and is **not** claimed as this candidate's evidence. Everything below was rerun on C11 with a
corrected evidence-generation mechanism. The reviewer binds to H14.

**Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (integrated `main`, 006/007/008/012/015 as they stand there).
**Rejected candidate this attempt corrects — H13:** `7f34e5c135b119983a682e639f3d4d6da3bff7e5`
(payload C11 `f117e6b47c4930af6735aaa3668b8b4c242fd76d`).
**Authoritative review:** [review-12.md](../review-12.md) (OpenAI ChatGPT, GPT-5.6 Sol, High reasoning),
recorded at `9d5256ebabf218a5ba11552326d0ec93bce10858` (CHANGES REQUIRED: K11-R12-ID-01 CLOSED,
C1–C10 PASS, K11-R10-EVID-01 REOPENED on the H13 evidence contradiction).
Prior review: [review-11.md](../review-11.md), recorded at
`e2d62d1459fe662d8f0ef936f46216bde66eab3f` (CHANGES REQUIRED, K11-R12-ID-01 — now closed by C11).
**Prior history, all preserved as ancestors of C11:** C `8cd9e269` / H `0f345b3c` / review-01;
C2 `6b7e5fb0` / H2 `297cc56f`; C3 `615cdf88` / H3 `b3cdf337` / review-02; C4 `1d4e4867` / H4 `156f1353` /
review-03 + supplement-01; C5 `e0660eff` / H5 `bd2dab6d` / review-04; C6 `b3d0d59f` / H6 `417798a3` /
review-05; C7 `e59bd312` / H7 `ae02c32a` / review-06-supplement-01 + review-06; C8 `79151afc` / H8
`c1e7d78a` (superseded before review, preserved); C9 `5ac76207` / H9 `5dddc2ad` / review-07 (CHANGES
REQUIRED, preserved); C10 `d1fcffd` / H10 `2cdb1e2` / review-08 (CHANGES REQUIRED, preserved);
H11 `ccc0140` / review-09 (CHANGES REQUIRED, preserved); H12 `a0472835` / review-10 (ACCEPT for H12
only, preserved); C11 `f117e6b4` / H13 `7f34e5c1` / review-11 (CHANGES REQUIRED, preserved) /
review-12 (CHANGES REQUIRED, preserved; recorded after H13 and therefore a branch descendant of
the C11 checkout, inspected as history rather than re-asserted as its ancestor — see `01`).
**Integrated main (PR #26):** `05f48c204d1eae021b3464c206e5c11e84bb3505`.
**Prerequisite:** K1.0 with corrections 01–02, integrated as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`,
with [parent receipt](../../K1.0/integration-01.md) and [correction-02 receipt](../../K1.0-correction-02/integration-01.md).

`01-tree-and-environment.log` shows B and every prior C/H/review commit through review-11 are
ancestors of the C11 checkout. H13 and the review-12 record postdate the C11 checkout, so `01`
does not re-assert them; they are preserved branch history — review-12 itself binds H13, and the
branch log shows the full chain — recorded here as history, not as re-verified ancestry.
The log shows the `C10..C11` payload file set, the dependency pin with integrity, the zone file
listing with the corrected fail-closed count gate, the measured runtime export surface (17 names,
asserted), and the distinct import specifiers.

**Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Date:** 2026-09-15.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory for validation runs:** `/tmp/k11-c14-validation` (detached `git worktree` at exactly C11,
`node_modules` symlinked from the main checkout; `git status` there shows only `?? node_modules`).
Logs are stored here in `docs/development/work/K1.1/validation-14/` and committed with `git add -f`
(because root `.gitignore` ignores `*.log`).

Declared output-only attachments under [006](../../../006-development-process.md). Every command below ran
against the clean payload tree C11, whose only uncommitted content in the worktree was the symlinked
`node_modules` (which the run does not write). Nothing here introduces or changes a script, fixture,
evaluator rule, threshold or configuration; those are payload in C11 (including the unchanged
`canonicalize@3.0.0` dependency and lockfile). The ablations in `09b` modify the detached worktree
checkout of C11 in place, running only the packet suite per ablation, each reverted via
`git checkout -- .` before the next; the worktree's HEAD stays `f117e6b4` throughout (verified after
every revert inside the log, together with a clean-status check).

## What K11-R10-EVID-01 required here, and what now holds

The round-13 generator had two compounding defects, both in the evidence-generation mechanism
rather than the payload: (1) its command-echo helper's own `$ ...` line was piped into `wc -l`,
so eleven filenames plus one echo line printed `12`; (2) its self-check operands were expanded by
the generator shell before the log recorded them, so the raw record shows the tautology
`test 11 = 11`, which can never fail. The `01` log therefore states its definition up front —
**tracked `.ts` files directly under `packages/kernel/src`** — and then replaces the helper with
a gate script **shown verbatim in the log before it runs**: the script lists the set with
`git ls-files 'packages/kernel/src/*.ts'` (a git-tracked-set query, immune to worktree dirt),
prints the same listing through `tee` into a file, derives the observed count from that same file
(`wc -l`), prints `observed count: <live value>`, and asserts it against the expected structural
invariant with the expected value as the **only** literal in the assertion. The log therefore
shows, in order: the exact script bytes, the eleven filenames, the live-derived count, and the
pass line that only a true comparison can reach; under `set -euo pipefail` a disagreeing tree
aborts nonzero with no PASS line. The manifest and report claim 11 because the raw attachment
shows the measured 11 three consistent ways — definition, filenames, live-derived count — with no
tautological comparison anywhere in the record.

**Mechanical self-checks (this class cannot silently recur).** Evidence generation runs under
`set -euo pipefail`: the inventory-gate script itself, the `17`-export assertion (live measurement
against the invariant, `process.exit(1)` otherwise), the control-green check (`ℹ fail 0` or
abort), the per-ablation rejection check (`ℹ fail >= 1` parsed from that ablation's own run
output, or abort), and the post-revert HEAD-plus-cleanliness checks are commands whose nonzero
exit aborts generation before any candidate exists — there is no later manual step at which a
mismatch could be transcribed past. No command-echo is piped into any measurement anywhere in the
generator. After finalization, every digest token below was programmatically re-verified against a
fresh SHA-256 recomputation over the exact staged file, length-checked at 64 hex characters (see
implementation-14).

**Failure-path verification (auxiliary probes, disclosed, no repo mutation).** Before finalizing,
the gate's failure path was deliberately exercised in `/tmp` against the same C11 worktree: (F0)
the true gate exits 0 printing `observed count: 11` plus PASS; (F1) the same script with the
expected value altered to 10 exits 1 with no PASS line; (F2) the count assertion run against a
file list with one extra line appended (`observed count: 12`) exits 1. None of these probes
touched any repository file; their scratch outputs live only in `/tmp` and are claimed here as
mechanism verification, not as candidate evidence.

**The `09b` battery is unchanged in method.** Per ablation the log records the exact edit script,
the full `git diff`, the full run output, the parsed `ℹ fail` verdict with de-duplicated
rejecting case names, and the revert with cleanliness checks. The seven legacy batteries
(XA/XB/X1/X7/X3/X4/X8) rerun their round-12 scripts unchanged and reject with **byte-identical
case-name sets** to H12/H13 (verified programmatically during report authoring; cardinalities
11/6/15/14/3/2/9 reproduce exactly). X9 reintroduces one shared coordinator-global visible
position for receipts and refusals and is REJECTED with 26 failing cases, led by the
nondisclosure oracle — the standing proof that K11-R12-ID-01 remains closed on C11.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry (B + all prior C/H/reviews through review-11 as ancestors of C11), `C10..C11` payload file set + `C11` stat, dependency pin with integrity, zone file listing through the verbatim gate script with live-derived count and fail-closed assertion, measured runtime export surface (17 names, asserted), distinct import specifiers | 0 | C11 checkout clean at `f117e6b4`; 11 tracked `.ts` files, script bytes + filenames + `observed count: 11` + PASS agree in the log; 17 named runtime exports printed in the log; `canonicalize` exact `3.0.0` with pinned tarball + integrity; imports are `./` internals, `node:buffer`, exactly `canonicalize` | `5b67582a56fd59902d9c2e972c348829fb3b4e9dea33dd561ab753b64079c2bb` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `5ee874308ff351a4f0c91877e58af37aa6af314ee6b2e0c6772de50a272b3d44` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2,279 tests, 346 suites, 0 fail, 0 skipped | `1ee4848de510ae735219248340cdcbcaa27813cb4f826467feaffa03db7f2cc3` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail, 0 skipped | `3e46677d72bc9be8e943f1c85b5225f5d7ae2177ecdb35be9ee677434fceab89` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `67c7d355007cbd5dcd262043220cdf27751b14050a38930a1a00de7d4fae34b6` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 221 tests, 45 suites, 0 fail, 0 skipped | `191db56c3005b38f400c86603c21f312d2ce4e6ecf66657092fda5914bab5c65` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail — the public host path is unchanged | `1dd49d78bd493d3fcb6602e0fac2fbb8ef4fdaa1fec6e37e31b98463af3e497b` |
| [08-architecture-suite.log](08-architecture-suite.log) | `node --test --test-reporter=tap --experimental-strip-types` over `tests/conformance/architecture/*.test.ts` | 0 | 362 tests, 37 suites, 0 fail | `9776944c095f93c2b5621b6c7ac46cf0bbf1382ac5b7fb854e4d09819d9fcd2b` |
| [09-k1.1-case-inventory.log](09-k1.1-case-inventory.log) | `node --test --test-reporter=tap --experimental-strip-types` over `packages/kernel/tests/*.test.ts` | 0 | 221 tests, 45 suites, 0 fail; every case named in TAP order | `25034ef37270422ae8b5a69b1470b25c0d146622f21616185417d200748c3baf` |
| [09b-distinguishing-ablations.log](09b-distinguishing-ablations.log) | control + 8 one-behaviour ablations of C11 in the detached worktree (exact edit script + full diff + full run output per ablation), packet cases run against each | 0 | control clean (221/0); **8 of 8 rejected** by named cases | `9786353a32a9097f7f173f57bab880acae268371080412fa7b08aa3bc1957987` |

## What the ablations establish (rerun on C11)

Each row removes exactly one behaviour and is rejected by cases that name the invariant it removed.
Edit commands, diffs, full outputs and rejecting case names are in the `09b` log. The seven legacy
batteries reproduce their H12/H13 rejection sets byte-identically; X9 is the global-sequence
battery proving the K11-R12-ID-01 closure still holds.

| Ablation | Guard it removes | Result |
|---|---|---|
| **XA** `defineData` builds an ordinary descriptor literal | K11-R7-STATE-03 install direction | REJECTED by 11 cases (identical set to H12/H13) |
| **XB** `restoreDescriptor` passes the saved ordinary descriptor through | K11-R7-STATE-03 restore direction | REJECTED by 6 cases (identical set to H12/H13) |
| **X1** `defineAt` reverts to ordinary indexed assignment | K11-R6-STATE-02 / VAL-04 | REJECTED by 15 cases (identical set to H12/H13) |
| **X7** `appendOwn` uses the captured primordial `Array.prototype.push` | K11-R6-STATE-02 | REJECTED by 14 cases (identical set to H12/H13) |
| **X3** serializer window keeps named slots but stops removing inherited index shadows | K11-R6-VAL-05 | REJECTED by 3 cases (identical set to H12/H13) |
| **X4** one ordinary indexed write reintroduced at the mailbox-append site | the mechanical control + the mailbox site's dedicated runtime witness | REJECTED by 2 (source-text control and `an inherited setter at the next mailbox index cannot make an accepted Event go unretained`, as in H12/H13) |
| **X8** the window stops handing back the prototype positions it borrowed | K11-R6-VAL-05 restoration | REJECTED by 9 cases (identical set to H12/H13) |
| **X9** one shared coordinator-global visible position for receipts and refusals | K11-R12-ID-01 scoped non-disclosure | REJECTED by 26 cases: the 14-case nondisclosure oracle plus the rewritten null-record refusal case and the position-pinning creation/ingress/dispatch/inspection cases |

## Counts (payload unchanged C11)

| Figure | At base `777b995` | At C11 (round-13 rerun) | At C11 (this rerun) |
|---|---|---|---|
| `npm test` | 2,060 tests, 302 suites | 2,279 tests, 346 suites | **2,279 / 346** (identical) |
| `npm run test:conformance` | 1,947 / 283 | 1,949 / 283 | **1,949 / 283** (identical) |
| `npm run test:kernel` | 4 tests | 221 tests, 45 suites | **221 / 45** (identical) |
| Architecture suite | 360 tests | 362 / 37 | **362 / 37** (identical) |
| `packages/kernel/src` tracked `.ts` files | 2 | **11** (tautological check — the defect) | **11** (verbatim gate script, live-derived count, fail-closed assertion) |
| `@arrokothi/kernel` runtime exports | 2 | **17** (named and asserted) | **17** (same measurement and assertion) |
| Target-zone third-party reach | nothing | `canonicalize` (exact `3.0.0`) | `canonicalize` (exact `3.0.0`, unchanged) |

## What was rerun, inspected, or not run (006/008)

- **Reran on clean C11** (detached worktree above): `typecheck`, `test` (full), `test:conformance`,
  `check:builder-docs`, `test:kernel`, `test:sdk`, the architecture TAP suite, the packet TAP
  inventory, and the control + 8 distinguishing ablations. Exits, counts and digests are the table
  above; raw outputs are the ten `.log` files committed alongside this manifest. The rerun
  reproduces every round-13 count exactly — as it must, since the payload is unchanged — while the
  `01` inventory is now established by the corrected gate rather than the defective one.
- **Inspected historical evidence (not rerun):** prior payload/report/review commits and the K1.0
  prerequisite integrations via `merge-base --is-ancestor` in `01-tree-and-environment.log`; prior
  `validation-01/.../13` logs, which remain committed as their own rounds' evidence and are **not**
  claimed as this candidate's reruns.
- **Implementer-only auxiliary probes (not validation evidence):** the F0/F1/F2 gate failure-path
  probes described above — disclosed, `/tmp`-only, no repository mutation, claimed solely as
  mechanism verification for the corrected gate.
- **Not run:** `npm run test:evals` (no Agent behaviour, no model path, no eval fixture in this
  correction — nothing in C11 touches Agent/model/eval behavior), process-kill/persistence runs (no
  such claim), native Driver fidelity, packaging/release checks, and any E-gate.

## What these logs do not show

They are deterministic Kernel-local evidence for the unchanged C11 payload described above. They contain no E1 result, no
persistence or process-failure evidence, no native Driver observation and no packaging or release
check. A green suite is not acceptance: the per-criterion assessment in
[implementation-14](../implementation-14.md) is the implementer's, and the verdict is an independent
reviewer's, bound to the exact candidate H14.
