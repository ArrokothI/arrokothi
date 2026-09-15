# K1.1 validation-10 — raw output for clean payload C10

**Payload C10:** `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14`. **Candidate:** H10, the commit containing
[implementation-10.md](../implementation-10.md).

**Read this first.** This attempt corrects the one mandatory finding of the H9 independent review,
[K11-R7-STATE-03](#what-the-ablations-establish) in [review-07.md](../review-07.md), which returned
`CHANGES REQUIRED` for H9. The reviewed H9 payload was C9
`5ac76207a05b61f918a1efd2313c25b7108d775c` (candidate H9
`5dddc2ad3cfd616b38c062380e450873cbc4c132`). C9/H9 and every prior C/H/review commit are preserved
as ancestors of C10; nothing was amended, rebased, squashed, force-pushed or reset. `validation-09/`
is preserved as what it was — the clean-C9 run — and is **not** claimed as this candidate's evidence.
Everything below was rerun on C10. The reviewer binds to H10.

**Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (integrated `main`, 006/007/008/012/015 as they stand there).
**Reviewed candidate this attempt corrects — H9:** `5dddc2ad3cfd616b38c062380e450873cbc4c132`.
**Authoritative review:** [review-07.md](../review-07.md) (OpenAI ChatGPT, GPT-5.6 Sol, High reasoning).
**Later documentation commit outside H9 acceptance:** `fa5cba36a2a0ebcde2659f8a01dc85864b06b2ff`
(`improve-kernel.md`, parent H9) is an ancestor of C10 through normal branch history and receives no
acceptance from any review; it is not this attempt's payload (see the `H9..C10` delta in
`01-tree-and-environment.log`). **This review-record commit** `e5759ce1a80379da37863cd4a59c15326a387c75`
(`docs: record independent K1.1 H9 review`) is likewise ancestry, not payload.
**Round-1 payload C:** `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`; **H:** `0f345b3c9ab49f6c5d9e09b162641cda78f96356`.
**Round-2 payload C2:** `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f`; **H2:** `297cc56ff186638817e0edfba7a3ce9f103d561e`.
**Round-3 payload C3:** `615cdf884ac560aec659162353680e55f732804c` / H3 `b3cdf33732df1f0645e0d773917b4f82444208c5`.
**Round-4 payload C4:** `1d4e4867b748f9e0b2f4041e17ded836ebc25a75`; **H4:** `156f13530fc01883608407948d320d12ba4821ca`.
**Round-5 payload C5:** `e0660effc729b968c528943220d9ba6fbc561c18`; **H5:** `bd2dab6d91e0af2328aa39fe74de831bffb27818`.
**Round-6 payload C6:** `b3d0d59f18f6c2b1d0a49746428123d84dd80df2`; **H6:** `417798a3e540acce78d73c7a0fdb92ebfd69faf8`.
**Round-7 payload C7:** `e59bd312373ca7afacd507a73717b16dfaa0a8f0`; **H7:** `ae02c32ae575c70326cd7d2a91aa5c268671d92f`.
**Round-8 payload C8:** `79151afc77533d5d542918515d8809773ff61809` / H8 `c1e7d78afc9aebb89410ff55892adcfb37e9e973`
(superseded before review, preserved).
**Round-9 payload C9:** `5ac76207a05b61f918a1efd2313c25b7108d775c` / H9 `5dddc2ad3cfd616b38c062380e450873cbc4c132`
(reviewed, CHANGES REQUIRED, preserved).
**Integrated main (PR #26):** `05f48c204d1eae021b3464c206e5c11e84bb3505`.
**Prerequisite:** K1.0 with corrections 01–02, integrated as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`,
with [parent receipt](../../K1.0/integration-01.md) and [correction-02 receipt](../../K1.0-correction-02/integration-01.md).

`01-tree-and-environment.log` shows every one of those commits is an ancestor of C10: nothing was
amended, rebased, squashed, force-pushed or reset away.

**Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Date:** 2026-09-15.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory for validation runs:** `/tmp/k11-c10-validation` (detached `git worktree` at exactly C10,
`node_modules` symlinked from the main checkout; `git status` there shows only `?? node_modules`).
Logs are stored here in `docs/development/work/K1.1/validation-10/` and committed with `git add -f`
(because root `.gitignore` ignores `*.log`).

Declared output-only attachments under [006](../../../006-development-process.md). Every command below ran
against the clean payload tree C10, whose only uncommitted content in the worktree was the symlinked
`node_modules` (which the run does not write). Nothing here introduces or changes a script, fixture,
evaluator rule, threshold or configuration; those are payload in C10 (including the unchanged
`canonicalize@3.0.0` dependency and lockfile). The ablations in `09b` modify the detached worktree
checkout of C10 in place, running only the packet suite per ablation, each reverted via
`git checkout -- .` before the next; the worktree's HEAD stays `d1fcffd` throughout (verified after
the last revert; see the end of the `09b` log's provenance in [implementation-10](../implementation-10.md)).

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, `H9..C10` delta, cumulative diffstat, dependency pin, zone file and export inventory | 0 | B and every prior C/H/review commit plus both prerequisite integrations are ancestors of C10; the payload commit's own file set is exactly nine `packages/kernel` source/test files; `canonicalize` stays pinned at exact `3.0.0` with the same integrity; the zone measures 11 `.ts` files and 17 runtime exports | `39c3b87e6dbfda9fee91542f40ea2f37ab5d8d36b89748f515fb194f2d66d721` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2,265 tests, 345 suites, 0 fail, 0 skipped | `bf595f105db79ed54924b1bec7084fe43cef7a086c173346180e01c1f3fc2ecd` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail, 0 skipped | `168cf43bbeedfb4fa4b7eb832de85180d7fc6be3e08e271d2956ebf4a8c3fdb7` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `734c26027b8fbd1a49675b9ed0bbde16e385fef04fd5adf8c88c3d52b140444b` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 207 tests, 44 suites, 0 fail, 0 skipped | `8f1a796c11d408194121307b443603cacf51c730579c528f5602251d0c0b82ae` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail — the public host path is unchanged | `36104e79c1abf76bbab135a185c560e6d3e4d7d720b82665c855b73fe9824a01` |
| [08-architecture-suite.log](08-architecture-suite.log) | `node --test --test-reporter=tap` over `tests/conformance/architecture/*.test.ts` | 0 | 362 tests, 37 suites, 0 fail | `dca7f871c76327c8dfe281f9b120d8c72a043fee93170c462bd876e3820425ef` |
| [09-k1.1-case-inventory.log](09-k1.1-case-inventory.log) | `node --test --test-reporter=tap` over `packages/kernel/tests/*.test.ts` | 0 | 207 tests, 44 suites, 0 fail; every case named in TAP order | `e8ddd392be347a0f8d74cc4233df6ac8c590ad9b8a715082a71b74bcdb79aa0e` |
| [09b-distinguishing-ablations.log](09b-distinguishing-ablations.log) | control + 7 one-behaviour ablations of C10 in the detached worktree, packet cases run against each | 0 | control clean (207/0); **7 of 7 rejected** by named cases | `4594c1a0b44091ddd510f9716991054e788b639c4f6cd40aad8` |

## What the ablations establish

Each row removes exactly one behaviour and is rejected by cases that name the invariant it removed.
XA/XB are new for this round's finding; X1/X7/X3/X4/X8 re-prove the own-data family guards after the
descriptor-hardening reconstruction. Case names are in the `09b` log.

| Ablation | Guard it removes | Result |
|---|---|---|
| **XA** `defineData` builds an ordinary descriptor literal — the exact H9 install shape | K11-R7-STATE-03 install direction | REJECTED by 11 cases across dispatch, ingress, creation, inspection and values |
| **XB** `restoreDescriptor` passes the saved ordinary descriptor through — the exact H9 restore shape | K11-R7-STATE-03 restore direction | REJECTED by 6 cases across creation, ingress and values |
| **X1** `defineAt` reverts to ordinary indexed assignment — the exact H7 operation | K11-R6-STATE-02 / VAL-04 | REJECTED by 15 cases |
| **X7** `appendOwn` uses the captured primordial `Array.prototype.push` | K11-R6-STATE-02 | REJECTED by 14 cases — a captured method is **not** the fix |
| **X3** serializer window keeps the named slots but stops removing inherited index shadows | K11-R6-VAL-05 | REJECTED by 3 cases |
| **X4** one ordinary indexed write reintroduced at a site with no prior runtime witness | the mechanical control | REJECTED by the source-text control **and** one runtime case the write now crosses |
| **X8** the window stops handing back the prototype positions it borrowed | K11-R6-VAL-05 restoration | REJECTED by 9 cases — borrowing host state without returning it is caught, not assumed |

XA and XB together are the specific answer to the review's governing point: weakening only the
*descriptor* (XA), and weakening only the *restoration* (XB), are each rejected — by 11 and 6 cases
respectively — while the surrounding implementation stays intact. The defect is the descriptor
conversion the captured function performs, not which function object performs it. X1 and X7 re-prove
that the older operation shapes stay rejected after the reconstruction (15 and 14 cases, up from 11
and 12 on C9 because the new descriptor-pollution cases also cross those operations).

Guards for code this round does not touch (holey scratch X2, dual serializer layers X5, frozen
vocabulary X6, Map/freeze S1/S2, primordial prototype V3, exact-JCS-call N1, single bound observation
N3, descriptor agreement P1, JCS pin JCS, over-limit traversal) are unchanged between C9 and C10 apart
from the descriptor they convert through; their round-9 runs (`validation-09/09b`) remain committed as
their own round's evidence and are **not** claimed as this candidate's reruns.

## Counts this packet changes

| Figure | At base `777b995` | At C9 | At C10 (this attempt) |
|---|---|---|---|
| `npm test` | 2,060 tests, 302 suites | 2,252 / 340 | 2,265 tests, 345 suites |
| `npm run test:conformance` | 1,947 / 283 | 1,949 / 283 | 1,949 / 283 (unchanged) |
| `npm run test:kernel` | 4 tests | 194 / 39 | 207 tests, 44 suites |
| Architecture suite | 360 tests | 362 / 37 | 362 / 37 (unchanged) |
| `packages/kernel/src` `.ts` files | 2 | **11** | 11 (unchanged) |
| `@arrokothi/kernel` runtime exports | 2 | 17 | 17 (unchanged) |
| Target-zone third-party reach | nothing | `canonicalize` (exact `3.0.0`) | unchanged |

Conformance and architecture counts are unchanged from C9: this attempt's cases are packet cases
(194 → 207, +13) in five suites (+5), and no guard assertion changed. No agreement check was weakened
and no schema relaxed.

## What was rerun, inspected, or not run (006/008)

- **Reran on clean C10** (detached worktree above): `typecheck`, `test` (full), `test:conformance`,
  `check:builder-docs`, `test:kernel`, `test:sdk`, the architecture TAP suite, the packet TAP
  inventory, and the control + 7 distinguishing ablations. Exits, counts and digests are the table
  above; raw outputs are the ten `.log` files committed alongside this manifest.
- **Inspected historical evidence (not rerun):** prior payload/report/review commits and the K1.0
  prerequisite integrations via `merge-base --is-ancestor` in `01-tree-and-environment.log`; prior
  `validation-01/.../09` logs, which remain committed as their own rounds' evidence and are **not**
  claimed as this candidate's reruns.
- **Implementer-only auxiliary probes (not validation evidence):** isolated `node` probes of
  `ToPropertyDescriptor` prototype-chain behaviour (ordinary literal vs null-prototype descriptor,
  both conversion directions, getter-execution counting) and of Proxy handler trap lookup under the
  same pollution, used to derive the counterexamples before writing the cases. They are not
  repository tests and are not counted above, and every claim they motivated is now carried by a
  committed case — including the handler-lookup containment, which is a committed refusal case
  rather than a claim.
- **Not run:** `npm run test:evals` (no Agent behaviour, no model path, no eval fixture in this
  correction; the eval suite is unchanged from base), process-kill/persistence runs (no such claim),
  native Driver fidelity, packaging/release checks, and any E-gate.

## What these logs do not show

They are deterministic Kernel-local evidence. They contain no E1 result, no persistence or
process-failure evidence, no native Driver observation and no packaging or release check. A green
suite is not acceptance: the per-criterion assessment in [implementation-10](../implementation-10.md)
is the implementer's, and the verdict is an independent reviewer's, bound to the exact candidate H10.
