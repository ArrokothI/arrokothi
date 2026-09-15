# K1.1 validation-07 — raw output for clean payload C7

**Payload C7:** `e59bd312373ca7afacd507a73717b16dfaa0a8f0`.
**Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (integrated `main`, 006/007/008/012/015 as they stand there).
**Round-1 payload C:** `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`; **H:** `0f345b3c9ab49f6c5d9e09b162641cda78f96356`; **review:** `1489227b4c80a2d059e8e71f92b233ed76bff8d5` (`review-01.md`, preserved).
**Round-2 payload C2:** `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f`; **H2:** `297cc56ff186638817e0edfba7a3ce9f103d561e` (preserved).
**Round-3 payload C3:** `615cdf884ac560aec659162353680e55f732804c` / H3 `b3cdf33732df1f0645e0d773917b4f82444208c5` / [review-02](review-02.md) at `3012b3c3328c49cfa15b2d4330f1bb871f53162a` (CHANGES REQUIRED, preserved).
**Round-4 payload C4:** `1d4e4867b748f9e0b2f4041e17ded836ebc25a75`; **H4:** `156f13530fc01883608407948d320d12ba4821ca`; **reviews:** `e9a31ff` (`review-03.md`) and `09eca2a6e4b1a923539ea76865772b0499ee6210` (`review-03-supplement-01.md`, preserved).
**Round-5 payload C5:** `e0660effc729b968c528943220d9ba6fbc561c18`; **H5:** `bd2dab6d91e0af2328aa39fe74de831bffb27818`; **review:** `8c26ffe` (`review-04.md`, CHANGES REQUIRED, preserved).
**Round-6 payload C6:** `b3d0d59f18f6c2b1d0a49746428123d84dd80df2`; **H6:** `417798a3e540acce78d73c7a0fdb92ebfd69faf8`; **review:** `24ff6b0` (`review-05.md`, CHANGES REQUIRED, preserved — the authoritative handoff for this round).
**Administrative/doc ancestry between H6 and C7:** `d1f85e5` (`all-doc`, owner-side `mental-model/README.md` edit) is preserved ancestry, not this round's payload.
**Integrated main (PR #26):** `05f48c204d1eae021b3464c206e5c11e84bb3505`.
**Prerequisite:** K1.0 with corrections 01–02, integrated as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`,
with [parent receipt](../K1.0/integration-01.md) and [correction-02 receipt](../K1.0-correction-02/integration-01.md).
`01-tree-and-environment.log` shows every one of those commits is an ancestor of C7: nothing was
amended, rebased or reset away. (C7 was amended once while still local-only, before any validation
ran and before any review existed: the freeze-witness test was strengthened to keep the replacement
live through the later dispatch, as the witness requires. No published or reviewed commit was
altered; all validation below ran on the final C7.)
**Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Date:** 2026-09-14.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory for validation runs:** `/tmp/k11-c7-validation` (detached `git worktree` at exactly C7,
`node_modules` symlinked from the main checkout; `git status` there shows only `?? node_modules`).
Logs are stored here in `docs/development/work/K1.1/validation-07/` and committed with `git add -f`
(because root `.gitignore` ignores `*.log`).

Declared output-only attachments under [006](../../../006-development-process.md). Every command below ran
against the clean payload tree C7, whose only uncommitted content in the worktree was the symlinked
`node_modules` (which the run does not write). Nothing here introduces or changes a script, fixture,
evaluator rule, threshold or configuration; those are payload in C7 (including the unchanged
`canonicalize@3.0.0` dependency and lockfile). The ablations in `09b` modify the detached worktree
checkout of C7 in place, running only the packet suite per ablation, each reverted via
`git checkout -- <file>` before the next; the worktree's HEAD stays `e59bd31` throughout
(verified after the last revert; see the `09b` summary).

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, cumulative and correction diffstats | 0 | every prior C/H/review commit and both prerequisite integrations are ancestors of C7; `canonicalize` stays pinned at `3.0.0` | `be408025a751d35185280e42d93d0a2b58c13542cc7841a5db661b83a611c6a9` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2,234 tests, 332 suites, 0 fail, 0 skipped | `eb400894cb278ff228564a818ebaec39b119861860684b35f143c75b86b9a20c` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail, 0 skipped | `d9a2c90873cdc20fb729c8e1e2373ee36e75a73654a1bda2dc9034adf5a50333` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `734c26027b8fbd1a49675b9ed0bbde16e385fef04fd5adf8c88c3d52b140444b` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 176 tests, 31 suites, 0 fail, 0 skipped | `ab6c3fa6da891c7709d9deb35b620f96a29e05b5292de37c2ec4ed5212345275` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail — the public host path is unchanged | `3b532a16fbf77f3d9df50a8682de41560a4e28a589a327ce8641c402447ae7b2` |
| [08-architecture-suite.log](08-architecture-suite.log) | `node --test --test-reporter=tap` over `tests/conformance/architecture/*.test.ts` | 0 | 362 tests, 37 suites, 0 fail | `7007db3cefbd3db579c6686391e7e5f1c8e0ed203e3c1491e8d98c4afd5fc41d` |
| [09-k1.1-case-inventory.log](09-k1.1-case-inventory.log) | `node --test --test-reporter=tap` over `packages/kernel/tests/*.test.ts` | 0 | 176 tests, 31 suites, 0 fail; every case named in TAP order | `09dc915bbc5e3471b27f0d5d445a592925fd190ef998b70975b8dba1f58aec4b` |
| [09b-distinguishing-ablations.log](09b-distinguishing-ablations.log) | control + 9 one-behaviour ablations of C7 in the detached worktree, packet cases run against each | 0 | control clean (176/0); **9 of 9 rejected** by named cases | `61f41f3545a85577e3bb4d56c2b6113c93d235a01ca1d24db9ce5ebbddca28d3` |

## What the ablations establish

Each row removes exactly one behaviour and is rejected by cases that name the invariant it removed.
S1/S2/V3 are new for the two review-05 findings; N1/N3/P1/P4/P5/P6 re-prove representative prior
guards still discriminate after the reconstruction. S1/S2/V3 each fail exactly the new witness
case(s) for their finding — no prior case needed them, which is why the findings were open.

| Ablation | Guard | Rejected by |
|---|---|---|
| S1 creation commit uses live `Map.prototype.set` | K11-R5-STATE-01 | 1 case (Map.set no-op commit) |
| S2 coordinator uses live `Object.freeze` | K11-R5-STATE-01 | 1 case (freeze replacement live through dispatch) |
| V3 plain-object check against live `Object.prototype` | K11-R5-VAL-03 | 2 cases (direct + creation boundary) |
| N1 serializer runs with live ambient intrinsics (safe clone kept) | K11-R2-VAL-02 round-6 | 5 cases (round-6 environment) |
| N3 `options.bound` read three times (H5 shape) | K11-R4-DISP-01 | 2 cases (1,1,0 getter; non-object envelope) |
| member value from an ordinary read (no agreement check) | K11-R2-VAL-02 | 6 cases |
| `JSON.stringify` substituted for the JCS substrate | K11-R1-JCS-01 | 10 cases |
| serializer sees the snapshot directly without the safe clone (environment kept) | K11-R2-VAL-02 round-5 | 4 cases (round-5 toJSON) |
| over-limit length traverses its full extent before refusing | K11-R3-LIMIT-01 | abort (values.test.ts native crash after ~16s on the 20M traversal vs ~1ms bounded refusal) |

EVID-01 (unfrozen mint) and ID-03 (scope ordering) ablations were demonstrated rejected on C5/C6 and
are not rerun: `identity.ts`/`refusal.ts` are byte-identical between H6 and C7 and the
scope-ordering block is untouched (verified by diff), so the same guards and cases stand.

## Counts this packet changes

| Figure | At base `777b995` | At C5 | At C6 | At C7 (this correction) |
|---|---|---|---|---|
| `npm test` | 2,060 tests, 302 suites | 2,221 tests, 331 suites | 2,230 tests, 332 suites | 2,234 tests, 332 suites |
| `npm run test:conformance` | 1,947 / 283 | 1,949 tests, 283 suites | 1,949 tests, 283 suites | 1,949 tests, 283 suites |
| `npm run test:kernel` | 4 tests | 163 tests, 30 suites | 172 tests, 31 suites | 176 tests, 31 suites |
| Architecture suite | 360 tests | 362 tests, 37 suites | 362 tests, 37 suites | 362 tests, 37 suites |
| `packages/kernel/src` `.ts` files | 2 | 10 | 10 | 10 (unchanged) |
| `@arrokothi/kernel` runtime exports | 2 | 17 | 17 | 17 (unchanged) |
| Target-zone third-party reach | nothing | `canonicalize` (exact `3.0.0`) | `canonicalize` (exact `3.0.0`, unchanged) | `canonicalize` (exact `3.0.0`, unchanged) |

Conformance and architecture counts are unchanged from C6: this round's controls are packet cases
(172 → 176, +4: VAL-03 direct value case, VAL-03 creation-boundary case, STATE-01 Map-commit case,
STATE-01 freeze-through-dispatch case) and no export-surface change.

`npm run test:evals` was not run. 006 requires it for Agent behaviour, and this correction adds no
Agent, no model path and no eval fixture; the eval suite is unchanged from base. No process-kill
run: this packet makes no persistence or process-failure claim. No native Driver or packaging check.

## What was rerun, inspected, or not run (006/008)

- **Reran on clean C7** (detached worktree above): `typecheck`, `test` (full), `test:conformance`,
  `check:builder-docs`, `test:kernel`, `test:sdk`, the architecture TAP suite, the packet TAP
  inventory, and the control + 9 distinguishing ablations. Exits, counts and digests are the table above;
  raw outputs are the ten `.log` files committed alongside this manifest.
- **Inspected historical evidence (not rerun):** prior payload/report/review commits and K1.0
  prerequisite integrations via `merge-base --is-ancestor` in `01-tree-and-environment.log`; prior
  `validation-01/02/03/05/06` logs (which remain committed and are not claimed as this round's reruns).
- **Implementer-only auxiliary probes (not validation evidence):** small isolated `node -e`
  probes of `getPrototypeOf`-trap/global-swap ordering and of the H6 commit-path witnesses,
  run in the main checkout during implementation to derive counterexamples. They are not repository
  tests and are not counted above.
- **Not run:** `npm run test:evals` (no Agent behaviour; see above), process-kill/persistence runs
  (no such claim), native Driver fidelity, packaging/release checks, and any E-gate.

## What these logs do not show

They are deterministic Kernel-local evidence. They contain no E1 result, no persistence or
process-failure evidence, no native Driver observation and no packaging or release check. A green
suite is not acceptance: the per-criterion assessment in [implementation-07](../implementation-07.md)
is the implementer's, and the verdict is an independent reviewer's.
