# K1.1 validation-09 — raw output for clean payload C9

**Payload C9:** `5ac76207a05b61f918a1efd2313c25b7108d775c`. **Candidate:** H9, the commit containing
[implementation-09.md](../implementation-09.md).

**Read this first.** C9 and H9 are the *same correction attempt* as C8/H8 — there is no intervening
review. Before handoff, self-review found that one behaviour the serializer window documents (a
position it cannot remove) was inspection-only, so it became a committed case. Under 006 a payload
change requires a new C and fresh clean validation, so C8 `79151afc77533d5d542918515d8809773ff61809`
and its candidate H8 `c1e7d78afc9aebb89410ff55892adcfb37e9e973` are **superseded and are not the
candidate**; they were never pushed and never reviewed, and are preserved in ancestry rather than
rewritten. `validation-08/` is likewise preserved as what it was — the clean-C8 run — and is **not**
claimed as this candidate's evidence. Everything below was rerun on C9. The reviewer binds to H9.

**Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (integrated `main`, 006/007/008/012/015 as they stand there).
**Reviewed candidate this attempt corrects — H7:** `ae02c32ae575c70326cd7d2a91aa5c268671d92f`.
**Authoritative review:** [review-06-supplement-01.md](../review-06-supplement-01.md), recorded at `7eca0641ed984d1141a147e9e2464baf893f63d8`.
**Concurrent review record, same two findings, also CHANGES REQUIRED:** [review-06.md](../review-06.md) at `9f2954104f92c27f2631b881712e5ba61e9114ad`. Neither it, nor `613bad94ae0d09bd16c772139d0e945461df53da` (`update-doc`, an owner-side `mental-model/` edit whose four files therefore appear in an `H7..C9` file listing without being this attempt's payload), nor any other post-H7 documentation commit is treated as acceptance of anything.
**Round-1 payload C:** `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`; **H:** `0f345b3c9ab49f6c5d9e09b162641cda78f96356`; **review:** `1489227b4c80a2d059e8e71f92b233ed76bff8d5` (`review-01.md`, preserved).
**Round-2 payload C2:** `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f`; **H2:** `297cc56ff186638817e0edfba7a3ce9f103d561e` (preserved).
**Round-3 payload C3:** `615cdf884ac560aec659162353680e55f732804c` / H3 `b3cdf33732df1f0645e0d773917b4f82444208c5` / [review-02](../review-02.md) at `3012b3c3328c49cfa15b2d4330f1bb871f53162a` (CHANGES REQUIRED, preserved).
**Round-4 payload C4:** `1d4e4867b748f9e0b2f4041e17ded836ebc25a75`; **H4:** `156f13530fc01883608407948d320d12ba4821ca`; **reviews:** `e9a31ff` (`review-03.md`) and `09eca2a6e4b1a923539ea76865772b0499ee6210` (`review-03-supplement-01.md`, preserved).
**Round-5 payload C5:** `e0660effc729b968c528943220d9ba6fbc561c18`; **H5:** `bd2dab6d91e0af2328aa39fe74de831bffb27818`; **review:** `8c26ffe` (`review-04.md`, CHANGES REQUIRED, preserved).
**Round-6 payload C6:** `b3d0d59f18f6c2b1d0a49746428123d84dd80df2`; **H6:** `417798a3e540acce78d73c7a0fdb92ebfd69faf8`; **review:** `24ff6b0` (`review-05.md`, CHANGES REQUIRED, preserved).
**Round-7 payload C7:** `e59bd312373ca7afacd507a73717b16dfaa0a8f0`; **H7:** `ae02c32ae575c70326cd7d2a91aa5c268671d92f`; evidence [validation-07](../validation-07/MANIFEST.md) (preserved, not rerun here).
**Integrated main (PR #26):** `05f48c204d1eae021b3464c206e5c11e84bb3505`.
**Prerequisite:** K1.0 with corrections 01–02, integrated as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`,
with [parent receipt](../../K1.0/integration-01.md) and [correction-02 receipt](../../K1.0-correction-02/integration-01.md).

`01-tree-and-environment.log` shows every one of those commits — including C8 and H8 — is an ancestor
of C9: nothing was amended, rebased, squashed, force-pushed or reset away.

**Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Date:** 2026-09-14.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory for validation runs:** `/tmp/k11-c9-validation` (detached `git worktree` at exactly C9,
`node_modules` symlinked from the main checkout; `git status` there shows only `?? node_modules`).
Logs are stored here in `docs/development/work/K1.1/validation-09/` and committed with `git add -f`
(because root `.gitignore` ignores `*.log`).

Declared output-only attachments under [006](../../../006-development-process.md). Every command below ran
against the clean payload tree C9, whose only uncommitted content in the worktree was the symlinked
`node_modules` (which the run does not write). Nothing here introduces or changes a script, fixture,
evaluator rule, threshold or configuration; those are payload in C9 (including the unchanged
`canonicalize@3.0.0` dependency and lockfile). The ablations in `09b` modify the detached worktree
checkout of C9 in place, running only the packet suite per ablation, each reverted via
`git checkout -- .` before the next; the worktree's HEAD stays `5ac7620` throughout (verified after
the last revert; see the end of the `09b` log).

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, `H8..C9` and `H7..C9` deltas, cumulative diffstat, dependency pin, zone file and export inventory | 0 | every prior C/H/review commit and both prerequisite integrations are ancestors of C9; `H8..C9` is exactly two payload files; `canonicalize` stays pinned at exact `3.0.0` with the same integrity; the zone measures 11 `.ts` files and 17 runtime exports | `0ad7eb5b06f5a13d681907785c35538d2e5c4f769bbd9d1fd695e87aedbdf5ec` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2,252 tests, 340 suites, 0 fail, 0 skipped | `4d3ea3458985efd0b18e19255a5f2ce8947da8127dd44180ad5300b46b1a8a20` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail, 0 skipped | `2e6a288d31d8238fe10513263e32b4bd400638a7901871924e5de57556b790fa` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `734c26027b8fbd1a49675b9ed0bbde16e385fef04fd5adf8c88c3d52b140444b` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 194 tests, 39 suites, 0 fail, 0 skipped | `c2e1786eeb1af944a77746e49b814b5ada597bae7fb5447848a4ebd78153030a` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail — the public host path is unchanged | `36d62b185f7fee8318e0dc4e331da2495749bc6689ce8c2a70253e10f72fddec` |
| [08-architecture-suite.log](08-architecture-suite.log) | `node --test --test-reporter=tap` over `tests/conformance/architecture/*.test.ts` | 0 | 362 tests, 37 suites, 0 fail | `438e167c1f78efb0a10237e3e27cd1e1ef2ba0b20d249f804ed0fb2fb2feb03a` |
| [09-k1.1-case-inventory.log](09-k1.1-case-inventory.log) | `node --test --test-reporter=tap` over `packages/kernel/tests/*.test.ts` | 0 | 194 tests, 39 suites, 0 fail; every case named in TAP order | `faf287c81fdf8aad3412d2c0af01c6951fe010ba9068d0e42e79bf0090700a51` |
| [09b-distinguishing-ablations.log](09b-distinguishing-ablations.log) | control + 15 one-behaviour ablations of C9 in the detached worktree, packet cases run against each | 0 | control clean (194/0); **15 of 15 rejected** by named cases | `1879ed71cfa6c8809d49efce73c1fa77ca105d0fc465598e5a432c2c630eb55c` |

## What the ablations establish

Each row removes exactly one behaviour and is rejected by cases that name the invariant it removed.
X1–X8 are new for this attempt's findings; S1/S2/V3/N1/N3/P1/JCS re-prove representative prior guards
still discriminate after the reconstruction. Case names are in the `09b` log.

| Ablation | Guard it removes | Result |
|---|---|---|
| **X1** `defineAt` reverts to ordinary indexed assignment — the exact H7 operation | K11-R6-STATE-02 / VAL-04 | REJECTED by 11 cases across dispatch, ingress, creation, inspection and values |
| **X2** `captureArray` reinstates the holey scratch it writes and reads back — the exact H7 VAL-04 shape | K11-R6-VAL-04 | REJECTED by 4 cases (value capture, creation binding, canonical bytes) |
| **X3** serializer window keeps the named slots but stops removing inherited index shadows | K11-R6-VAL-05 | REJECTED by 3 cases — the dependency's own `parts.push`/`join` channel is load-bearing on its own |
| **X4** one ordinary indexed write reintroduced at a site with **no runtime witness** | the mechanical control | REJECTED by the source-text control alone — this is what makes the completeness claim checkable rather than argued |
| **X5** both serializer layers removed (no shadow removal, and the clone's `map` shadow writes ordinarily) | K11-R6-VAL-04/05 | REJECTED by 5 cases; contrast with X3 shows the two layers overlap rather than one carrying everything |
| **X6** the exported decision vocabulary is left unfrozen | self-found (`TERMINAL_STATES`, `BOUNDARY_LIMITS`) | REJECTED by the 2 new evidence cases |
| **X7** `appendOwn` uses the captured primordial `Array.prototype.push` | K11-R6-STATE-02 | REJECTED by 12 cases — a captured method is **not** the fix, which is the point of the finding |
| **X8** the window stops handing back the prototype positions it borrowed | K11-R6-VAL-05 restoration | REJECTED by 6 cases — borrowing host state without returning it is caught, not assumed |
| **S1** creation commit uses live `Map.prototype.set` | K11-R5-STATE-01 | REJECTED (1 case) |
| **S2** the Activation is frozen through live `Object.freeze` | K11-R5-STATE-01 | REJECTED (1 case) |
| **V3** plain-object acceptance compares against live `Object.prototype` | K11-R5-VAL-03 | REJECTED (2 cases) |
| **N1** the exact JCS call runs with live ambient intrinsics | K11-R2-VAL-02 round 6 | REJECTED (6 cases) |
| **N3** `options.bound` read three times instead of once | K11-R4-DISP-01 | REJECTED (2 cases) |
| **P1** a member's value comes from an ordinary read with no agreement check | K11-R2-VAL-02 | REJECTED (4 cases) |
| **JCS** `JSON.stringify` substituted for the approved substrate | K11-R1-JCS-01 | REJECTED (8 cases) |

X1 and X7 together are the specific answer to the review's governing point: reverting only the
*operation* (X1), and replacing it with the captured primordial `push` the previous round's
discipline would have reached for (X7), are both rejected — by 11 and 12 cases respectively. The
defect is the property operation, not which function object performs it.

The K11-R3-LIMIT-01 traversal ablation is not rerun this attempt: `captureArray`'s bounded over-limit
refusal is unchanged between H7 and C9 apart from the scratch removal below it, its guard and both
cases are untouched, and the round-7 run (`validation-07/09b`) remains committed as that round's
evidence. EVID-01 (unfrozen mint) and ID-03 (scope ordering) are likewise not rerun: `refusal.ts` is
byte-identical to H7, and `identity.ts` changes only by capturing a load-time `TypeError` and adding
two comments, with the scope-ordering block untouched.

## Counts this packet changes

| Figure | At base `777b995` | At C6 | At C7 | At C9 (this attempt) |
|---|---|---|---|---|
| `npm test` | 2,060 tests, 302 suites | 2,230 / 332 | 2,234 / 332 | 2,252 tests, 340 suites |
| `npm run test:conformance` | 1,947 / 283 | 1,949 / 283 | 1,949 / 283 | 1,949 / 283 (unchanged) |
| `npm run test:kernel` | 4 tests | 172 / 31 | 176 / 31 | 194 tests, 39 suites |
| Architecture suite | 360 tests | 362 / 37 | 362 / 37 | 362 / 37 (unchanged) |
| `packages/kernel/src` `.ts` files | 2 | 10 | 10 | **11** (`own-array.ts`, internal) |
| `@arrokothi/kernel` runtime exports | 2 | 17 | 17 | 17 (unchanged) |
| Target-zone third-party reach | nothing | `canonicalize` (exact `3.0.0`) | unchanged | unchanged |

Conformance and architecture counts are unchanged from C7: this attempt's controls are packet cases
(176 → 194, +18), and the architecture guard's edits are to *expected values* — the reachable-module
set, the inventory's file-count row and the fixture rows that mirror it — not to assertions. No
agreement check was weakened and no schema relaxed.

## What was rerun, inspected, or not run (006/008)

- **Reran on clean C9** (detached worktree above): `typecheck`, `test` (full), `test:conformance`,
  `check:builder-docs`, `test:kernel`, `test:sdk`, the architecture TAP suite, the packet TAP
  inventory, and the control + 15 distinguishing ablations. Exits, counts and digests are the table
  above; raw outputs are the ten `.log` files committed alongside this manifest.
- **Inspected historical evidence (not rerun):** prior payload/report/review commits and the K1.0
  prerequisite integrations via `merge-base --is-ancestor` in `01-tree-and-environment.log`; prior
  `validation-01/.../08` logs, which remain committed as their own rounds' evidence and are **not**
  claimed as this candidate's reruns — `validation-08/` in particular is the superseded C8 run.
- **Implementer-only auxiliary probes (not validation evidence):** small isolated `node` probes of
  JavaScript `[[Set]]` prototype-chain behaviour (ordinary assignment, `push`, `defineProperty`), of
  the unmodified `canonicalize@3.0.0` object branch under an inherited indexed accessor, and of a
  non-configurable *non-writable data* shadow (which kills Node's own internals before any Kernel
  boundary is reached, and is therefore explicitly not claimed as Kernel behaviour). They are not
  repository tests and are not counted above; every claim they motivated is now carried by a
  committed case in the table.
- **Not run:** `npm run test:evals` (no Agent behaviour, no model path, no eval fixture in this
  correction; the eval suite is unchanged from base), process-kill/persistence runs (no such claim),
  native Driver fidelity, packaging/release checks, and any E-gate.

## What these logs do not show

They are deterministic Kernel-local evidence. They contain no E1 result, no persistence or
process-failure evidence, no native Driver observation and no packaging or release check. A green
suite is not acceptance: the per-criterion assessment in [implementation-09](../implementation-09.md)
is the implementer's, and the verdict is an independent reviewer's, bound to the exact candidate H9.
