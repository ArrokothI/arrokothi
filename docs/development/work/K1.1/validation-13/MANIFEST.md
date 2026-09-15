# K1.1 validation-13 — raw output for payload C11

**Payload C11:** `f117e6b47c4930af6735aaa3668b8b4c242fd76d` (new semantic payload correcting K11-R12-ID-01).
**Candidate:** H13, the commit containing [implementation-13.md](../implementation-13.md).

**Read this first.** This round makes a **semantic payload change** over C10: the independent
second review of H12 ([review-11.md](../review-11.md)) returned `CHANGES REQUIRED` with one new
mandatory P1 finding, **K11-R12-ID-01** (C6/C9 FAIL): one coordinator-wide `#acceptancePosition`,
incremented by every accepted boundary and every refusal, was exposed as `Receipt.position` and
embedded in `Receipt.token` (with `execution-N`/`event-N` identities off further shared counters),
so one principal's own authorized receipt disclosed decisions taken in scopes it cannot observe.
Payload C11 corrects the ownership model — acceptance order lives on the owning Execution record,
refusals carry the owning Execution's own refusal index (position 0 when naming no Execution),
and Execution/Event identities plus receipt tokens are pure functions of the owning request
identity — with a new cross-principal nondisclosure oracle and unmasked hidden-vs-missing
assertions. Contract revision 5 is unchanged. `validation-12/` is preserved untouched as the
evidence attached to H12 and is **not** claimed as this candidate's evidence. Everything below was
rerun on C11. The reviewer binds to H13.

**Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (integrated `main`, 006/007/008/012/015 as they stand there).
**Corrected candidate — H12:** `a047283523f7487cc025f4cf58d17028caad6389`
(payload C10 `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14`).
**Authoritative review:** [review-11.md](../review-11.md) (OpenAI ChatGPT, GPT-5.6 Sol, High reasoning),
recorded at `e2d62d1459fe662d8f0ef936f46216bde66eab3f` (CHANGES REQUIRED: C6/C9 FAIL on the new
K11-R12-ID-01; all other prior findings reconciled as remaining closed on their narrow invariants).
Prior review: [review-10.md](../review-10.md) (same reviewer), recorded at
`0367420d8993075470e8e671e462b643e6d42f10` (ACCEPT for H12 only: K11-R10-EVID-01 closed on the
regenerated inventory; bound to H12, not to this payload).
**Prior history, all preserved as ancestors of C11:** C `8cd9e269` / H `0f345b3c` / review-01;
C2 `6b7e5fb0` / H2 `297cc56f`; C3 `615cdf88` / H3 `b3cdf337` / review-02; C4 `1d4e4867` / H4 `156f1353` /
review-03 + supplement-01; C5 `e0660eff` / H5 `bd2dab6d` / review-04; C6 `b3d0d59f` / H6 `417798a3` /
review-05; C7 `e59bd312` / H7 `ae02c32a` / review-06-supplement-01 + review-06; C8 `79151afc` / H8
`c1e7d78a` (superseded before review, preserved); C9 `5ac76207` / H9 `5dddc2ad` / review-07 (CHANGES
REQUIRED, preserved); C10 `d1fcffd` / H10 `2cdb1e2` / review-08 (CHANGES REQUIRED, preserved);
H11 `ccc0140` / review-09 (CHANGES REQUIRED, preserved); H12 `a0472835` / review-10 (ACCEPT for H12,
preserved) / review-11 (CHANGES REQUIRED, preserved).
**Integrated main (PR #26):** `05f48c204d1eae021b3464c206e5c11e84bb3505`.
**Prerequisite:** K1.0 with corrections 01–02, integrated as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`,
with [parent receipt](../../K1.0/integration-01.md) and [correction-02 receipt](../../K1.0-correction-02/integration-01.md).

`01-tree-and-environment.log` shows B and every prior C/H/review commit are ancestors of the C11
checkout, the `C10..C11` payload file set, the exact `canonicalize@3.0.0` pin with integrity, the
eleven-file tracked zone, the 17-name runtime export surface with assertion, and the distinct
import specifiers.

**Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Date:** 2026-09-15.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory for validation runs:** `/tmp/k11-c13-validation` (detached `git worktree` at exactly C11,
`node_modules` symlinked from the main checkout; `git status` there shows only `?? node_modules`).
Logs are stored here in `docs/development/work/K1.1/validation-13/` and committed with `git add -f`
(because root `.gitignore` ignores `*.log`).

Declared output-only attachments under [006](../../../006-development-process.md). Every command below ran
against the clean payload tree C11, whose only uncommitted content in the worktree was the symlinked
`node_modules` (which the run does not write). Nothing here introduces or changes a script, fixture,
evaluator rule, threshold or configuration; those are payload in C11 (including the unchanged
`canonicalize@3.0.0` dependency and lockfile). The ablations in `09b` modify the detached worktree
checkout of C11 in place, running only the packet suite per ablation, each reverted via
`git checkout -- .` before the next; the worktree's HEAD stays `f117e6b4` throughout (verified after
every revert inside the log, together with a clean-status check).

## What K11-R12-ID-01 required here, and what now holds

The `01` log states its definition up front — **tracked `.ts` files directly under
`packages/kernel/src`** — and measures exactly that set with `git ls-files
'packages/kernel/src/*.ts'`, a git-tracked-set query rather than a filesystem listing, so worktree
dirt (mounts, symlinks, strays) cannot contaminate the measurement. The log shows the command, its
eleven-name output, the count taken from the same command output (`11`), and a self-check that
recomputes the count from the same command and requires `11`. The manifest and report claim 11
because the raw attachment shows 11 three consistent ways. The runtime export surface is measured by
importing the barrel (17 names printed), with an in-command assertion that fails the run unless the
count is exactly 17, and the distinct-specifier extraction shows the boundary claim — `./`
internals, `node:buffer`, exactly `canonicalize` — read off the log rather than summarized past it.

**Mechanical self-checks (this class cannot silently recur).** Evidence generation runs under
`set -euo pipefail`: the `11`-file self-check, the `17`-export assertion, the control-green check
(`ℹ fail 0` or abort), the per-ablation rejection check (`ℹ fail >= 1` parsed from that ablation's
own run output, or abort), and the post-revert HEAD-plus-cleanliness checks are commands whose
nonzero exit aborts generation before any candidate exists — there is no later manual step at
which a mismatch could be transcribed past. After finalization, every digest token below was
programmatically re-verified against a fresh SHA-256 recomputation over the exact staged file,
length-checked at 64 hex characters (see implementation-13).

**The new X9 ablation.** `09b` records, per ablation, the exact edit script, the full `git
diff`, the full run output, the parsed `ℹ fail` verdict with de-duplicated rejecting case names,
and the revert with cleanliness checks. The seven legacy batteries (XA/XB/X1/X7/X3/X4/X8) rerun
their round-12 scripts unchanged — their anchors are untouched by the K11-R12-ID-01 correction —
and reject with **byte-identical case-name sets** to H12 (verified programmatically during report
authoring; cardinalities 11/6/15/14/3/2/9 reproduce exactly). X9 reintroduces one shared
coordinator-global visible position for receipts and refusals (`#acceptancePosition` incremented by
`#mint` and `#refusal`, exposed as `Receipt.position`) and is REJECTED with 26 failing cases, led
by the new nondisclosure oracle plus the position-pinning creation/ingress/dispatch/inspection
cases. That is the review-11-required proof that a weakened global-sequence implementation fails.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry (B + all prior C/H/reviews as ancestors of C11), `C10..C11` payload file set + `C11` stat, dependency pin with integrity, zone file listing + count from the same `git ls-files` output with self-check, measured runtime export surface (17 names, asserted), distinct import specifiers | 0 | C11 checkout clean at `f117e6b4`; 11 tracked `.ts` files, names + count + self-check agree in the log; 17 named runtime exports printed in the log; `canonicalize` exact `3.0.0` with pinned tarball + integrity; imports are `./` internals, `node:buffer`, exactly `canonicalize` | `15346712228d573a6265b5e91c2cbd4f042db64d031fba8f9c793556f2c1a13c` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `5ee874308ff351a4f0c91877e58af37aa6af314ee6b2e0c6772de50a272b3d44` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2,279 tests, 346 suites, 0 fail, 0 skipped | `56356eac36bd450221f76876bc21aabb129b23d3aabbeece2aaa519e11be7779` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail, 0 skipped | `e27081e6832161ccd70727a863a35c636e593acacaba4541d6c155a68c459b9f` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `67c7d355007cbd5dcd262043220cdf27751b14050a38930a1a00de7d4fae34b6` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 221 tests, 45 suites, 0 fail, 0 skipped | `1c082765d0108d63c533103cf89e36d45e6785112df95a6f323159639c32ae03` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail — the public host path is unchanged | `9e22fd4b73fb3757019bf59a32c24a794e75e53cd05bd0f9d13af8d525b9cd31` |
| [08-architecture-suite.log](08-architecture-suite.log) | `node --test --test-reporter=tap --experimental-strip-types` over `tests/conformance/architecture/*.test.ts` | 0 | 362 tests, 37 suites, 0 fail | `ea32d820716246ba4200b57592864d92116f2ee3c4dee75a9de69e4cd9556f98` |
| [09-k1.1-case-inventory.log](09-k1.1-case-inventory.log) | `node --test --test-reporter=tap --experimental-strip-types` over `packages/kernel/tests/*.test.ts` | 0 | 221 tests, 45 suites, 0 fail; every case named in TAP order | `d5f038a59dd8445da613b0f74bf45f9bda1d635e6f4efad354b5db7c4f0db312` |
| [09b-distinguishing-ablations.log](09b-distinguishing-ablations.log) | control + 8 one-behaviour ablations of C11 in the detached worktree (exact edit script + full diff + full run output per ablation), packet cases run against each | 0 | control clean (221/0); **8 of 8 rejected** by named cases | `f9d92b11441497a5b83a617908022964f97732acdafe0a3c794d88bca1068365` |

## What the ablations establish (rerun on C11)

Each row removes exactly one behaviour and is rejected by cases that name the invariant it removed.
Edit commands, diffs, full outputs and rejecting case names are in the `09b` log. The seven legacy
batteries reproduce their H12 rejection sets byte-identically; X9 is the new global-sequence
battery required by review-11.

| Ablation | Guard it removes | Result |
|---|---|---|
| **XA** `defineData` builds an ordinary descriptor literal | K11-R7-STATE-03 install direction | REJECTED by 11 cases (identical set to H12) |
| **XB** `restoreDescriptor` passes the saved ordinary descriptor through | K11-R7-STATE-03 restore direction | REJECTED by 6 cases (identical set to H12) |
| **X1** `defineAt` reverts to ordinary indexed assignment | K11-R6-STATE-02 / VAL-04 | REJECTED by 15 cases (identical set to H12) |
| **X7** `appendOwn` uses the captured primordial `Array.prototype.push` | K11-R6-STATE-02 | REJECTED by 14 cases (identical set to H12) |
| **X3** serializer window keeps named slots but stops removing inherited index shadows | K11-R6-VAL-05 | REJECTED by 3 cases (identical set to H12) |
| **X4** one ordinary indexed write reintroduced at the mailbox-append site | the mechanical control + the mailbox site's dedicated runtime witness | REJECTED by 2 (source-text control and `an inherited setter at the next mailbox index cannot make an accepted Event go unretained`, as in H12) |
| **X8** the window stops handing back the prototype positions it borrowed | K11-R6-VAL-05 restoration | REJECTED by 9 cases (identical set to H12) |
| **X9** one shared coordinator-global visible position for receipts and refusals | K11-R12-ID-01 scoped non-disclosure | REJECTED by 26 cases: the 14-case nondisclosure oracle (10 cross-principal schedules, same-scope refusal isolation, hidden-path coverage, capacity, hidden-vs-missing) plus the rewritten null-record refusal case and the position-pinning creation/ingress/dispatch/inspection cases |

## Counts (payload change C10 → C11)

| Figure | At base `777b995` | At C10 (round-12 rerun) | At C11 (this rerun) |
|---|---|---|---|
| `npm test` | 2,060 tests, 302 suites | 2,265 tests, 345 suites | **2,279 tests, 346 suites** (+14/+1: the new nondisclosure oracle) |
| `npm run test:conformance` | 1,947 / 283 | 1,949 / 283 | **1,949 / 283** (unchanged) |
| `npm run test:kernel` | 4 tests | 207 tests, 44 suites | **221 tests, 45 suites** (+14/+1) |
| Architecture suite | 360 tests | 362 / 37 | **362 / 37** (unchanged) |
| `packages/kernel/src` tracked `.ts` files | 2 | **11** (listed, counted from the same output, and self-checked in `01`) | **11** (same definition, command and self-check) |
| `@arrokothi/kernel` runtime exports | 2 | **17** (named and asserted in `01`) | **17** (same measurement and assertion) |
| Target-zone third-party reach | nothing | `canonicalize` (exact `3.0.0`) | `canonicalize` (exact `3.0.0`, unchanged) |

## What was rerun, inspected, or not run (006/008)

- **Reran on clean C11** (detached worktree above): `typecheck`, `test` (full), `test:conformance`,
  `check:builder-docs`, `test:kernel`, `test:sdk`, the architecture TAP suite, the packet TAP
  inventory, and the control + 8 distinguishing ablations. Exits, counts and digests are the table
  above; raw outputs are the ten `.log` files committed alongside this manifest. The rerun moves
  exactly the counts the payload change predicts (`+14` tests / `+1` suite from the new oracle file;
  every other figure identical to round 12), and the seven legacy ablation rejections reproduce
  their H12 case-name sets byte-identically — which is itself the check that the ownership
  correction disturbed no previously closed guard.
- **Inspected historical evidence (not rerun):** prior payload/report/review commits and the K1.0
  prerequisite integrations via `merge-base --is-ancestor` in `01-tree-and-environment.log`; prior
  `validation-01/.../12` logs, which remain committed as their own rounds' evidence and are **not**
  claimed as this candidate's reruns.
- **Implementer-only auxiliary probes (not validation evidence):** two sensitivity probes run in the
  main checkout during development (a module-global receipt sequence, rejected by 11 oracle cases;
  a read-only global smuggled into null-record refusals, rejected by 10 cases across six files),
  each reverted immediately with zero ablation residue verified by `git diff`. They are disclosed
  here and claimed as nothing; the committed X9 is the per-coordinator-global battery recorded in
  `09b` with its actual rejecting set.
- **Not run:** `npm run test:evals` (no Agent behaviour, no model path, no eval fixture in this
  correction — nothing in C11 touches Agent/model/eval behavior), process-kill/persistence runs (no
  such claim), native Driver fidelity, packaging/release checks, and any E-gate.

## What these logs do not show

They are deterministic Kernel-local evidence for the C11 payload described above. They contain no E1 result, no
persistence or process-failure evidence, no native Driver observation and no packaging or release
check. A green suite is not acceptance: the per-criterion assessment in
[implementation-13](../implementation-13.md) is the implementer's, and the verdict is an independent
reviewer's, bound to the exact candidate H13.
