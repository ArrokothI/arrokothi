# K1.1 validation-12 — raw output for unchanged payload C10

**Payload C10:** `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14` (unchanged, byte-for-byte).
**Candidate:** H12, the commit containing [implementation-12.md](../implementation-12.md).

**Read this first.** This round makes **no production source, test, fixture, evaluator, threshold,
configuration or contract change**: the independent review of H11 ([review-09.md](../review-09.md))
kept K1.1-C1 through C10 at PASS with K11-R7-STATE-03 CLOSED and K11-R10-DOC-01 now CLOSED,
returning `CHANGES REQUIRED` on exactly one remaining finding, K11-R10-EVID-01: the regenerated
`validation-11/01-tree-and-environment.log` lists eleven tracked target source files but records
`file count: 12`, and it does not display the exact shell command that produced the `12`, so the
result is neither internally consistent nor reproducible. The semantic payload therefore remains
C10 exactly. `validation-11/` is preserved untouched as the evidence attached to rejected H11 and
is **not** claimed as this candidate's evidence. Everything below was rerun on C10. The reviewer
binds to H12.

**Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (integrated `main`, 006/007/008/012/015 as they stand there).
**Rejected candidate this attempt corrects — H11:** `ccc0140ffca7fe2196cb80e57d6eb2d767666793`
(payload C10 `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14`).
**Authoritative review:** [review-09.md](../review-09.md) (OpenAI ChatGPT, GPT-5.6 Sol, High reasoning),
recorded at `4c03ce8b1190e4186da1407fda21951b2d32319e` (CHANGES REQUIRED: C1–C10 PASS,
K11-R7-STATE-03 CLOSED, K11-R10-DOC-01 CLOSED, K11-R10-EVID-01 the single remaining finding).
Prior review: [review-08.md](../review-08.md), recorded at
`fbba168b638840cecc871ce4e787bc29ddc04b5d`.
**Prior history, all preserved as ancestors of C10:** C `8cd9e269` / H `0f345b3c` / review-01;
C2 `6b7e5fb0` / H2 `297cc56f`; C3 `615cdf88` / H3 `b3cdf337` / review-02; C4 `1d4e4867` / H4 `156f1353` /
review-03 + supplement-01; C5 `e0660eff` / H5 `bd2dab6d` / review-04; C6 `b3d0d59f` / H6 `417798a3` /
review-05; C7 `e59bd312` / H7 `ae02c32a` / review-06-supplement-01 + review-06; C8 `79151afc` / H8
`c1e7d78a` (superseded before review, preserved); C9 `5ac76207` / H9 `5dddc2ad` / review-07 (CHANGES
REQUIRED, preserved); C10 `d1fcffd` / H10 `2cdb1e2` / review-08 (CHANGES REQUIRED, preserved);
H11 `ccc0140` / review-09 (CHANGES REQUIRED, preserved).
**Integrated main (PR #26):** `05f48c204d1eae021b3464c206e5c11e84bb3505`.
**Prerequisite:** K1.0 with corrections 01–02, integrated as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`,
with [parent receipt](../../K1.0/integration-01.md) and [correction-02 receipt](../../K1.0-correction-02/integration-01.md).

`01-tree-and-environment.log` shows B and every prior C/H/review commit are ancestors of the C10
checkout; H10, H11 and the review-08/review-09 records descend from C10 (administrative children,
not payload) and are verified as such rather than as ancestors.

**Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Date:** 2026-09-15.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory for validation runs:** `/tmp/k11-c12-validation` (detached `git worktree` at exactly C10,
`node_modules` symlinked from the main checkout; `git status` there shows only `?? node_modules`).
Logs are stored here in `docs/development/work/K1.1/validation-12/` and committed with `git add -f`
(because root `.gitignore` ignores `*.log`).

Declared output-only attachments under [006](../../../006-development-process.md). Every command below ran
against the clean payload tree C10, whose only uncommitted content in the worktree was the symlinked
`node_modules` (which the run does not write). Nothing here introduces or changes a script, fixture,
evaluator rule, threshold or configuration; those are payload in C10 (including the unchanged
`canonicalize@3.0.0` dependency and lockfile). The ablations in `09b` modify the detached worktree
checkout of C10 in place, running only the packet suite per ablation, each reverted via
`git checkout -- .` before the next; the worktree's HEAD stays `d1fcffd` throughout (verified after
every revert inside the log).

## What K11-R10-EVID-01 required here, and what now holds

The `01` log states its definition up front — **tracked `.ts` files directly under
`packages/kernel/src`** — and measures exactly that set with `git ls-files
'packages/kernel/src/*.ts'`, a git-tracked-set query rather than a filesystem listing, so worktree
dirt (mounts, symlinks, strays) cannot contaminate the measurement the way an unscoped count can.
The log shows the command, its eleven-name output, the count taken from the same command output
(`11`), and a self-check that recomputes the count from the same command and requires `11`. The
manifest and report claim 11 because the raw attachment shows 11 three consistent ways. The phantom
`12` from H11 is not reinterpreted: its producing command was never recorded, so it cannot be
reproduced or corrected in place — which is why this directory regenerates the measurement instead.

Two adjacent commands from H11 are also repaired so that every recorded command reproduces its own
displayed output: the lockfile pin now runs `grep -A4 '"node_modules/canonicalize"'` (the H11 log's
recorded `grep -A4 "node_modules/canonicalize":` pattern, with its trailing colon, matches no line
in the lockfile and exits 1 — the displayed stanza must have come from elsewhere), and the import
section is unchanged in command but is now followed by a distinct-specifier extraction
(`grep -rho 'from "[^"]*"' ... | sort -u`) so the boundary claim — `./` internals, `node:buffer`,
exactly `canonicalize` — is read off the log rather than summarized past it. The runtime export
surface is still measured by importing the barrel (17 names printed), now with an in-command
assertion that fails the run unless the count is exactly 17.

**Mechanical self-checks (this class cannot silently recur).** Evidence generation runs under
`set -euo pipefail`: the `11`-file self-check, the `17`-export assertion, the per-ablation
`ℹ fail`-versus-parsed-case-names cross-check, and the post-revert cleanliness checks are commands
whose nonzero exit aborts generation before any candidate exists — there is no later manual step at
which a mismatch could be transcribed past. After finalization, every digest token below was
programmatically re-verified against a fresh SHA-256 recomputation over the exact staged file,
length-checked at 64 hex characters (see implementation-12).

**One honest difference from H11.** H11's `09b` recorded diffstats and rejecting case names but not
the edit commands that produced them, so its exact ablation sites are not recoverable from its own
record (its `X4` site included). This round's `09b` records the exact edit script, the full `git
diff`, the full run output and the parsed verdict per ablation. Six of the seven rejections reject
with byte-identical case-name sets to H11; the seventh, X4, rejects with the same cardinality (2:
the source-text control plus one runtime witness) but a different runtime witness, because the
recovered equivalent site is the mailbox append — whose dedicated guard
(`an inherited setter at the next mailbox index cannot make an accepted Event go unretained`) is
the witness — rather than H11's unrecoverable site (witnessed incidentally by the inspect case).
The manifest table below names the actual rejecting cases; nothing is claimed identical that is
merely equal in count.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry (B + all prior C/H/reviews as ancestors; H10/H11/review-08/review-09 verified as C10 descendants), `H9..C10` payload file set, dependency pin with integrity, zone file listing + count from the same `git ls-files` output with self-check, measured runtime export surface (17 names, asserted), distinct import specifiers | 0 | C10 checkout clean at `d1fcffd`; 11 tracked `.ts` files, names + count + self-check agree in the log; 17 named runtime exports printed in the log; `canonicalize` exact `3.0.0` with pinned tarball + integrity; imports are `./` internals, `node:buffer`, exactly `canonicalize` | `670f9de643d13fe72c50039a37f7c3750ae7e88650b2e7e5ddec8289577c82ab` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `5ee874308ff351a4f0c91877e58af37aa6af314ee6b2e0c6772de50a272b3d44` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2,265 tests, 345 suites, 0 fail, 0 skipped | `6a84095df4d8efe8fc5f6857b1790ef47be52075dc78c60f81a0bdd754deb99b` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail, 0 skipped | `91b6a5beb0aa2e82a25cd31e79912055ff2f04d6a0b296b4d3d9346f40ced821` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `67c7d355007cbd5dcd262043220cdf27751b14050a38930a1a00de7d4fae34b6` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 207 tests, 44 suites, 0 fail, 0 skipped | `3eeac8881bfb3ecf54fce5d5b878a200b56284f119f79ab0aff33258324d9e84` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail — the public host path is unchanged | `ecd213124452ee7ea11186a62bff097d0662dde6a3f620acdbe21a08bbf1a1c0` |
| [08-architecture-suite.log](08-architecture-suite.log) | `node --test --test-reporter=tap --experimental-strip-types` over `tests/conformance/architecture/*.test.ts` | 0 | 362 tests, 37 suites, 0 fail | `6b67588298a39292dd9d561aaf34cd2065c97f6c768053b480bc47b7d39453c8` |
| [09-k1.1-case-inventory.log](09-k1.1-case-inventory.log) | `node --test --test-reporter=tap --experimental-strip-types` over `packages/kernel/tests/*.test.ts` | 0 | 207 tests, 44 suites, 0 fail; every case named in TAP order | `8fdeeaff24aab9090ee9ac78685253963eada55a84fa148cf003e5989218f1e2` |
| [09b-distinguishing-ablations.log](09b-distinguishing-ablations.log) | control + 7 one-behaviour ablations of C10 in the detached worktree (exact edit script + full diff + full run output per ablation), packet cases run against each | 0 | control clean (207/0); **7 of 7 rejected** by named cases | `87417e21cd82f9a28c7b79181e31ff422c1a24478bf591acafdebc3ed6a453ee` |

## What the ablations establish (rerun, unchanged semantics)

Each row removes exactly one behaviour and is rejected by cases that name the invariant it removed.
XA/XB guard the round-10 descriptor-direction correction; X1/X7/X3/X4/X8 preserve the own-data
family. Edit commands, diffs, full outputs and rejecting case names are in the `09b` log. Results
reproduce the round-11 battery exactly except for the documented X4 witness difference.

| Ablation | Guard it removes | Result |
|---|---|---|
| **XA** `defineData` builds an ordinary descriptor literal | K11-R7-STATE-03 install direction | REJECTED by 11 cases (identical set to H11) |
| **XB** `restoreDescriptor` passes the saved ordinary descriptor through | K11-R7-STATE-03 restore direction | REJECTED by 6 cases (identical set to H11) |
| **X1** `defineAt` reverts to ordinary indexed assignment | K11-R6-STATE-02 / VAL-04 | REJECTED by 15 cases (identical set to H11) |
| **X7** `appendOwn` uses the captured primordial `Array.prototype.push` | K11-R6-STATE-02 | REJECTED by 14 cases (identical set to H11) |
| **X3** serializer window keeps named slots but stops removing inherited index shadows | K11-R6-VAL-05 | REJECTED by 3 cases (identical set to H11) |
| **X4** one ordinary indexed write reintroduced at the mailbox-append site | the mechanical control + the mailbox site's dedicated runtime witness | REJECTED by 2 (source-text control and `an inherited setter at the next mailbox index cannot make an accepted Event go unretained`; H11's unrecoverable site was witnessed incidentally by the inspect case instead) |
| **X8** the window stops handing back the prototype positions it borrowed | K11-R6-VAL-05 restoration | REJECTED by 9 cases (identical set to H11) |

## Counts (unchanged payload: identical to rounds 10–11)

| Figure | At base `777b995` | At C10 (rounds 10–12 reruns) |
|---|---|---|
| `npm test` | 2,060 tests, 302 suites | 2,265 tests, 345 suites |
| `npm run test:conformance` | 1,947 / 283 | 1,949 / 283 |
| `npm run test:kernel` | 4 tests | 207 tests, 44 suites |
| Architecture suite | 360 tests | 362 / 37 |
| `packages/kernel/src` tracked `.ts` files | 2 | **11** (listed, counted from the same output, and self-checked in `01`) |
| `@arrokothi/kernel` runtime exports | 2 | **17** (named and asserted in `01`) |
| Target-zone third-party reach | nothing | `canonicalize` (exact `3.0.0`) |

## What was rerun, inspected, or not run (006/008)

- **Reran on clean C10** (detached worktree above): `typecheck`, `test` (full), `test:conformance`,
  `check:builder-docs`, `test:kernel`, `test:sdk`, the architecture TAP suite, the packet TAP
  inventory, and the control + 7 distinguishing ablations. Exits, counts and digests are the table
  above; raw outputs are the ten `.log` files committed alongside this manifest. The rerun
  reproduces every round-10/11 count exactly, which is itself the check that no payload defect was
  hiding behind the evidence correction: had C10's semantics differed from what rounds 10–11 proved,
  the counts or the ablation rejections would have moved.
- **Inspected historical evidence (not rerun):** prior payload/report/review commits and the K1.0
  prerequisite integrations via `merge-base --is-ancestor` in `01-tree-and-environment.log`; prior
  `validation-01/.../11` logs, which remain committed as their own rounds' evidence and are **not**
  claimed as this candidate's reruns.
- **Implementer-only auxiliary probes (not validation evidence):** four scratch X4-site probes in the
  detached worktree (receipts-at-activate, receipts-at-accept, dispatch-selection, dispatch-deliveries
  sites), each reverted immediately, run only to test whether H11's exact incidentally-witnessed X4
  pair was recoverable from an unrecorded edit. It was not: the pairs were (control + dispatch-trap
  case), (control + mailbox-setter case), (control alone), and (control + two dispatch cases). None
  of these probes is claimed as evidence; the committed X4 is the mailbox-append site recorded in
  `09b` with its actual rejecting pair.
- **Not run:** `npm run test:evals` (no Agent behaviour, no model path, no eval fixture in this
  correction — nothing in C10 or in this administrative round touches Agent/model/eval behavior),
  process-kill/persistence runs (no such claim), native Driver fidelity, packaging/release checks,
  and any E-gate.

## What these logs do not show

They are deterministic Kernel-local evidence for an unchanged payload. They contain no E1 result, no
persistence or process-failure evidence, no native Driver observation and no packaging or release
check. A green suite is not acceptance: the per-criterion assessment in
[implementation-12](../implementation-12.md) is the implementer's, and the verdict is an independent
reviewer's, bound to the exact candidate H12.
