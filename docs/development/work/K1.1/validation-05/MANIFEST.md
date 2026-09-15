# K1.1 validation-05 — raw output for clean payload C5

**Payload C5:** `e0660effc729b968c528943220d9ba6fbc561c18`.
**Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (integrated `main`, 006/007/008/012/015 as they stand there).
**Round-1 payload C:** `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`; **H:** `0f345b3c9ab49f6c5d9e09b162641cda78f96356`; **review:** `1489227b4c80a2d059e8e71f92b233ed76bff8d5` (`review-01.md`, preserved).
**Round-2 payload C2:** `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f`; **H2:** `297cc56ff186638817e0edfba7a3ce9f103d561e` (preserved).
**Round-3 payload C3:** `615cdf884ac560aec659162353680e55f732804c`; **H3:** `b3cdf33732df1f0645e0d773917b4f82444208c5`; **review:** `3012b3c3328c49cfa15b2d4330f1bb871f53162a` (`review-02.md`, CHANGES REQUIRED, preserved).
**Round-4 payload C4:** `1d4e4867b748f9e0b2f4041e17ded836ebc25a75`; **H4:** `156f13530fc01883608407948d320d12ba4821ca`; **reviews:** `e9a31ff` (`review-03.md`) and `09eca2a6e4b1a923539ea76865772b0499ee6210` (`review-03-supplement-01.md`, preserved).
**Integrated main (PR #26):** `05f48c204d1eae021b3464c206e5c11e84bb3505`.
**Prerequisite:** K1.0 with corrections 01–02, integrated as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`,
with [parent receipt](../K1.0/integration-01.md) and [correction-02 receipt](../K1.0-correction-02/integration-01.md).
`01-tree-and-environment.log` shows every one of those commits is an ancestor of C5: nothing was
amended, rebased or reset away.
**Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Date:** 2026-09-14.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
**Working directory for validation runs:** `/tmp/k11-c5-validation` (detached `git worktree` at exactly C5,
`node_modules` symlinked from the main checkout; `git status` there shows only `?? node_modules`).
Logs are stored here in `docs/development/work/K1.1/validation-05/` and committed with `git add -f`
(because root `.gitignore` ignores `*.log`; without `-f` the H4 round committed only its MANIFEST —
K11-R3-PROC-02 — while validation-01/02/03 had been force-added).

Declared output-only attachments under [006](../../../006-development-process.md). Every command below ran
against the clean payload tree C5, whose only uncommitted content in the worktree was the symlinked
`node_modules` (which the run does not write). Nothing here introduces or changes a script, fixture,
evaluator rule, threshold or configuration; those are payload in C5 (including the unchanged
`canonicalize@3.0.0` dependency and lockfile). The ablations in `09b` modify the detached worktree
checkout of C5 in place (with `node_modules` symlinked), running only the packet suite per ablation,
each reverted via `git checkout -- <file>` before the next; the worktree's HEAD and status are printed
at the end of that log.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, ancestry, cumulative and correction diffstats | 0 | every prior C/H/review commit and both prerequisite integrations are ancestors of C5; `canonicalize` stays pinned at `3.0.0` | `378001af790fe2840e8f76a45188f8829b716169f91de707ea763b222512ee01` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `8bfb26c6add9661d5af9ec43b3a66b0c6ae8359cdfb9c400d04baefcd871e47b` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 2,221 tests, 331 suites, 0 fail, 0 skipped | `132c7634c965d737c0e72a3eebf82944e9e0779cfa872183b381bdbc91a32af8` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail, 0 skipped | `2833588815b71dc42540358a0bfe8d0ea125b59f84a6ef495d690a793963e176` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports | `a044782c0af7b62ec40d770a04aae62ae20d758bd3c392756280b357a593af30` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 163 tests, 30 suites, 0 fail, 0 skipped | `0d2143d4a877c8ef9b4380015a69ec1b6d1fb71de3ffe0ce6872c651c289475e` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail — the public host path is unchanged | `582802bcff80f428e8ef45f665d453f4c3fa28778aa9fce6e3ff529a79c66739` |
| [08-architecture-suite.log](08-architecture-suite.log) | `node --test --test-reporter=tap` over `tests/conformance/architecture/*.test.ts` | 0 | 362 tests, 37 suites, 0 fail | `a19d68df0355888cefee4b16257542691b2be7212ec4e07e6f70bd777ec41cf3` |
| [09-k1.1-case-inventory.log](09-k1.1-case-inventory.log) | `node --test --test-reporter=tap` over `packages/kernel/tests/*.test.ts` | 0 | 163 tests, 30 suites, 0 fail; every case named in TAP order | `3fb253e77cee962b788d1bbfeeb98c5a50f8aed9174a59d04783ce24b29d2fdb` |
| [09b-distinguishing-ablations.log](09b-distinguishing-ablations.log) | 20 one-behaviour ablations of C5 in the detached worktree, packet cases run against each | 0 | control clean (163/0); **20 of 20 rejected** by named cases (LIMIT-01 old path aborts values.test.ts after ~19s native stack/OOM on the 20M traversal vs 1ms bounded refusal) | `9216c27fd4d601bcff0ee7ebcd0edf8cd77fe915ec0eff92178736fe27e26c9f` |

## What the ablations establish

Each row removes exactly one behaviour and is rejected by cases that name the invariant it removed.
Fifteen re-prove the round-4 guards still discriminate after the round-5 reconstruction; five target
this round's corrections (serializer safe-clone, outside-length index, hostile-throw formatter,
bounded over-limit refusal, scope-before-auth ordering).

| Ablation | Guard | Rejected by |
|---|---|---|
| member value from an ordinary read, no descriptor agreement | K11-R2-VAL-02 | 6 cases across values, creation, ingress and dispatch |
| canonical bytes directly from the caller's object via unmodified JCS (no capture, no safe clone) | K11-R2-VAL-02 | 5 cases (shifting-read binding) |
| an unowned array position falls back to a dynamic read | K11-R2-VAL-02 | 2 cases (values, ingress) |
| an observation that throws escapes the boundary | K11-R2-VAL-02 | 2 cases (unobservable-structure) |
| `mintReceipt` unfrozen | K11-R2-EVID-01 | 6 cases across every receipt family |
| `mintRefusal` unfrozen | K11-R2-EVID-01 | 5 cases across returned and inspected refusals |
| retained `queued` disposition mutable | K11-R2-EVID-01 | 2 cases |
| identity fields accept any boundary value | K11-R3-ID-02 | 3 cases (creation, ingress) |
| `packIdentity` joins non-text parts | K11-R3-ID-02 | the packing-injectivity case |
| snapshot members installed by assignment | K11-R1-VAL-01 | 10 cases |
| array-index test widened to accept `01` (regex plus String-check dropped) | K11-R1-VAL-01 | 2 cases |
| missing ID returns before the scope scan | K11-R1-ID-01 | 4 cases |
| scope check via `includes` with an early exit | K11-R1-ID-01 | 1 case |
| `cancelExecution` accepts | K11-R1-SCOPE-01 | 3 cases |
| `JSON.stringify` substituted for the JCS substrate | K11-R1-JCS-01 | 10 cases |
| serializer sees the snapshot directly without the safe clone (ambient toJSON diverts) | K11-R2-VAL-02 round-5 | 4 cases (new ambient/side-effect toJSON) |
| outside-length canonical index check disabled | K11-R2-VAL-02 supplement round-5 | 2 cases (new outside-index) |
| hostile thrown-value inspection escapes instead of refusing | K11-R2-VAL-02 round-5 | 1 case (new hostile-throw) |
| over-limit length allocates/traverses its full extent before refusing | K11-R3-LIMIT-01 round-5 | bounded case plus native abort (20M traversal) |
| scope authorization precedes scope text validation | K11-R3-ID-03 round-5 | 1 case (new non-text scope ordering) |

## Counts this packet changes

| Figure | At base `777b995` | At C2 | At C3 | At C4 | At C5 (this correction) |
|---|---|---|---|---|---|
| `npm test` | 2,060 tests, 302 suites | 2,172 / 324 | 2,175 / 324 | 2,209 tests, 329 suites | 2,221 tests, 331 suites |
| `npm run test:conformance` | 1,947 / 283 | 1,947 / 283 | 1,949 / 283 | 1,949 tests, 283 suites | 1,949 tests, 283 suites |
| `npm run test:kernel` | 4 tests | 116 / 23 | 117 / 23 | 151 tests, 28 suites | 163 tests, 30 suites |
| Architecture suite | 360 tests | 360 | 362 / 37 | 362 tests, 37 suites | 362 tests, 37 suites |
| `packages/kernel/src` `.ts` files | 2 | 10 | 10 | 10 | 10 (unchanged) |
| `@arrokothi/kernel` runtime exports | 2 | 18 | 18 | 17 (`sealBoundaryValue` removed, K1.1-DEC-3) | 17 (unchanged) |
| Target-zone third-party reach | nothing | nothing | `canonicalize` (exact `3.0.0`) | `canonicalize` (exact `3.0.0`, unchanged) | `canonicalize` (exact `3.0.0`, unchanged) |

Conformance and architecture counts are unchanged from C4: this round's controls are packet cases
(151 → 163, +12: seven serializer-boundary/outside-index/hostile-throw/bounded value cases, two
creation scope-ordering cases, one creation ambient-replay case, one dispatch ambient-Activation case,
plus the LIMIT-01 at-limit/one-over split) and no export-surface change.

`npm run test:evals` was not run. 006 requires it for Agent behaviour, and this correction adds no
Agent, no model path and no eval fixture; the eval suite is unchanged from base. No process-kill
run: this packet makes no persistence or process-failure claim. No native Driver or packaging check.

## What was rerun, inspected, or not run (006/008)

- **Reran on clean C5** (detached worktree above): `typecheck`, `test` (full), `test:conformance`,
  `check:builder-docs`, `test:kernel`, `test:sdk`, the architecture TAP suite, the packet TAP
  inventory, and the 20 distinguishing ablations. Exits, counts and digests are the table above;
  raw outputs are the ten `.log` files committed alongside this manifest.
- **Inspected historical evidence (not rerun):** prior payload/report/review commits and K1.0
  prerequisite integrations via `merge-base --is-ancestor` in `01-tree-and-environment.log`; prior
  `validation-01/02/03` logs (which remain committed and are not claimed as this round's reruns);
  `validation-04` raw logs are absent from H4's tree (only its MANIFEST is committed) — that gap is
  K11-R3-PROC-02 and is not represented as evidence here.
- **Implementer-only auxiliary probes (not validation evidence):** small isolated `node -e`
  probes of `canonicalize@3.0.0` ordering (`toJSON`/`map`/`Object.keys` reads), prototype-pollution
  shaping, and Proxy-invariant shaping, run in the main checkout during implementation to derive
  counterexamples. They are not repository tests and are not counted above.
- **Not run:** `npm run test:evals` (no Agent behaviour; see above), process-kill/persistence runs
  (no such claim), native Driver fidelity, packaging/release checks, and any E-gate.

## What these logs do not show

They are deterministic Kernel-local evidence. They contain no E1 result, no persistence or
process-failure evidence, no native Driver observation and no packaging or release check. A green
suite is not acceptance: the per-criterion assessment in [implementation-05](../implementation-05.md)
is the implementer's, and the verdict is an independent reviewer's.
