# K1.1 validation-06 — raw output for clean payload C6

**Payload C6:** `b3d0d59f18f6c2b1d0a49746428123d84dd80df2`.
**Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (integrated `main`, 006/007/008/012/015 as they stand there).
**Round-1 payload C:** `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`; **H:** `0f345b3c9ab49f6c5d9e09b162641cda78f96356`; **review:** `1489227b4c80a2d059e8e71f92b233ed76bff8d5` (`review-01.md`, preserved).
**Round-2 payload C2:** `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f`; **H2:** `297cc56ff186638817e0edfba7a3ce9f103d561e` (preserved).
**Round-3 payload C3:** `615cdf884ac560aec659162353680e55f732804c` / H3 `b3cdf33732df1f0645e0d773917b4f82444208c5` / [review-02](review-02.md) at `3012b3c3328c49cfa15b2d4330f1bb871f53162a` (CHANGES REQUIRED, preserved).
**Round-4 payload C4:** `1d4e4867b748f9e0b2f4041e17ded836ebc25a75`; **H4:** `156f13530fc01883608407948d320d12ba4821ca`; **reviews:** `e9a31ff` (`review-03.md`) and `09eca2a6e4b1a923539ea76865772b0499ee6210` (`review-03-supplement-01.md`, preserved).
**Round-5 payload C5:** `e0660effc729b968c528943220d9ba6fbc561c18`; **H5:** `bd2dab6d91e0af2328aa39fe74de831bffb27818`; **review:** `8c26ffe` (`review-04.md`, CHANGES REQUIRED, preserved).
**Integrated main (PR #26):** `05f48c204d1eae021b3464c206e5c11e84bb3505`.
**Prerequisite:** K1.0 with corrections 01–02, integrated as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`,
with [parent receipt](../K1.0/integration-01.md) and [correction-02 receipt](../K1.0-correction-02/integration-01.md).
`01-tree-and-environment.log` shows every one of those commits is an ancestor of C6: nothing was
amended, rebased or reset away.
**Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Date:** 2026-09-14.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory for validation runs:** `/tmp/k11-c6-validation` (detached `git worktree` at exactly C6,
`node_modules` symlinked from the main checkout; `git status` there shows only `?? node_modules`).
Logs are stored here in `docs/development/work/K1.1/validation-06/` and committed with `git add -f`
(because root `.gitignore` ignores `*.log`; without `-f` only the MANIFEST would land —
K11-R3-PROC-02 — while validation-01/02/03/05 were force-added).

Declared output-only attachments under [006](../../../006-development-process.md). Every command below ran
against the clean payload tree C6, whose only uncommitted content in the worktree was the symlinked
`node_modules` (which the run does not write). Nothing here introduces or changes a script, fixture,
evaluator rule, threshold or configuration; those are payload in C6 (including the unchanged
`canonicalize@3.0.0` dependency and lockfile). The ablations in `09b` modify the detached worktree
checkout of C6 in place, running only the packet suite per ablation, each reverted via
`git checkout -- <file>` before the next; the worktree's HEAD stays `b3d0d59` throughout
(verified after the last revert; see the `09b` summary).

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, cumulative and correction diffstats | 0 | every prior C/H/review commit and both prerequisite integrations are ancestors of C6; `canonicalize` stays pinned at `3.0.0` | `7c92bddd8bd274adf9d24071564af94cf9959f30a91ca235a2d367da0ef2022e` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2,230 tests, 332 suites, 0 fail, 0 skipped | `c98824b619fa5a048a0495d132ab2b777f6cc85a983bf9d35cff3b01d0843e1a` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail, 0 skipped | `e7ec78aeef4aaff28e4101fc891ba6d99fa1f1aa844e1216afb6d1eb0b26179e707` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `734c26027b8fbd1a49675b9ed0bbde16e385fef04fd5adf8c88c3d52b140444b` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 172 tests, 31 suites, 0 fail, 0 skipped | `93102c37f2a576b0d7facc7a854e6df820cf031e42561241f70edcd9b41dba3e` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail — the public host path is unchanged | `cdb9924574dc85ea73502e2da9167d0dc40a082b96a1e3e108879162bedb9b82` |
| [08-architecture-suite.log](08-architecture-suite.log) | `node --test --test-reporter=tap` over `tests/conformance/architecture/*.test.ts` | 0 | 362 tests, 37 suites, 0 fail | `e01becea469ecacd88b55bc8c46bfca5dc606843af55d875eb1bb0b26179e707` |
| [09-k1.1-case-inventory.log](09-k1.1-case-inventory.log) | `node --test --test-reporter=tap` over `packages/kernel/tests/*.test.ts` | 0 | 172 tests, 31 suites, 0 fail; every case named in TAP order | `3376c15131959691911019fe8d044fce67b5f269fd191198035ab5d1ebc56215` |
| [09b-distinguishing-ablations.log](09b-distinguishing-ablations.log) | control + 8 one-behaviour ablations of C6 in the detached worktree, packet cases run against each | 0 | control clean (172/0); **8 of 8 rejected** by named cases | `1bc28c0f284060ca3c96804581a60faf5f41af50d750f8c4238988c2909ffe89` |

## What the ablations establish

Each row removes exactly one behaviour and is rejected by cases that name the invariant it removed.
The round-6 pair (N1/N3) targets the two reopened P1s; the remaining six re-prove representative
prior guards still discriminate after the reconstruction. The N1/P6 contrast is the class proof for
VAL-02: N1 removes the restored environment while keeping the safe clone (only the five new
environment cases fail; round-5 `toJSON` cases still pass), while P6 removes the clone while keeping
the environment (only the four round-5 `toJSON` cases fail; the new environment cases still pass).
Neither layer alone covers the other.

| Ablation | Guard | Rejected by |
|---|---|---|
| N1 serializer runs with live ambient intrinsics (no restored environment; safe clone kept) | K11-R2-VAL-02 round-6 | 5 cases (one-shot Object.keys, throwing Object.keys, Array join; creation + ingress identity/replay) |
| N3 `options.bound` read three times (H5 shape) | K11-R4-DISP-01 | 2 cases (1,1,0 shifting getter; non-object envelope) |
| member value from an ordinary read (no descriptor agreement) | K11-R2-VAL-02 | 6 cases |
| `mintReceipt` unfrozen | K11-R2-EVID-01 | 6 cases |
| scope text validation skipped | K11-R3-ID-03 | 1 case |
| `JSON.stringify` substituted for the JCS substrate | K11-R1-JCS-01 | 10 cases |
| serializer sees the snapshot directly without the safe clone (environment kept) | K11-R2-VAL-02 round-5 | 4 cases (round-5 toJSON) |
| over-limit length traverses its full extent before refusing | K11-R3-LIMIT-01 | abort (values.test.ts native crash after ~16s on the 20M traversal vs ~1ms bounded refusal) |

## Counts this packet changes

| Figure | At base `777b995` | At C4 | At C5 | At C6 (this correction) |
|---|---|---|---|---|
| `npm test` | 2,060 tests, 302 suites | 2,209 tests, 329 suites | 2,221 tests, 331 suites | 2,230 tests, 332 suites |
| `npm run test:conformance` | 1,947 / 283 | 1,949 tests, 283 suites | 1,949 tests, 283 suites | 1,949 tests, 283 suites |
| `npm run test:kernel` | 4 tests | 151 tests, 28 suites | 163 tests, 30 suites | 172 tests, 31 suites |
| Architecture suite | 360 tests | 362 tests, 37 suites | 362 tests, 37 suites | 362 tests, 37 suites |
| `packages/kernel/src` `.ts` files | 2 | 10 | 10 | 10 (unchanged) |
| `@arrokothi/kernel` runtime exports | 2 | 17 | 17 | 17 (unchanged) |
| Target-zone third-party reach | nothing | `canonicalize` (exact `3.0.0`) | `canonicalize` (exact `3.0.0`, unchanged) | `canonicalize` (exact `3.0.0`, unchanged) |

Conformance and architecture counts are unchanged from C5: this round's controls are packet cases
(163 → 172, +9: three serializer-environment value cases, one creation identity/replay case, one
ingress identity/replay case, one dispatch Activation/redelivery/inspection case, three dispatch
bound cases) and no export-surface change.

`npm run test:evals` was not run. 006 requires it for Agent behaviour, and this correction adds no
Agent, no model path and no eval fixture; the eval suite is unchanged from base. No process-kill
run: this packet makes no persistence or process-failure claim. No native Driver or packaging check.

## What was rerun, inspected, or not run (006/008)

- **Reran on clean C6** (detached worktree above): `typecheck`, `test` (full), `test:conformance`,
  `check:builder-docs`, `test:kernel`, `test:sdk`, the architecture TAP suite, the packet TAP
  inventory, and the control + 8 distinguishing ablations. Exits, counts and digests are the table above;
  raw outputs are the ten `.log` files committed alongside this manifest.
- **Inspected historical evidence (not rerun):** prior payload/report/review commits and K1.0
  prerequisite integrations via `merge-base --is-ancestor` in `01-tree-and-environment.log`; prior
  `validation-01/02/03/05` logs (which remain committed and are not claimed as this round's reruns).
- **Implementer-only auxiliary probes (not validation evidence):** small isolated `node -e`
  probes of `canonicalize@3.0.0` ordering and of the H5 witnesses (one-shot `Object.keys`,
  throwing `Object.keys`, shifting `bound` getter), run in the main checkout during implementation
  to derive counterexamples. They are not repository tests and are not counted above.
- **Not run:** `npm run test:evals` (no Agent behaviour; see above), process-kill/persistence runs
  (no such claim), native Driver fidelity, packaging/release checks, and any E-gate.

## What these logs do not show

They are deterministic Kernel-local evidence. They contain no E1 result, no persistence or
process-failure evidence, no native Driver observation and no packaging or release check. A green
suite is not acceptance: the per-criterion assessment in [implementation-06](../implementation-06.md)
is the implementer's, and the verdict is an independent reviewer's.
