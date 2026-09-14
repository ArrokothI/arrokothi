# Implementation report — K1.1, round 5

## Identity

- **Packet / parent:** K1.1 / K1. **Contract:** [contract.md](contract.md), **revision 4** (unchanged this round; the five open findings are implementation defects against it, not contract amendments).
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (B), including
  006/007/008/012/015 as they stand there.
- **State:** `WAITING_FOR_REVIEW` (claimed on the basis below; no self-acceptance). **Owner release:** explicit instruction on 2026-09-14
  ("Let's release K1.1") through [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent);
  the correction rounds need no renewed permission under 006. This round is a correction of the same
  released packet; no successor is released or begun.
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, integrated as `main` PR #21 /
  `9baff3a03662720af6eefe1ecfabc41fde99298f`, receipts [K1.0](../K1.0/integration-01.md) and
  [K1.0-correction-02](../K1.0-correction-02/integration-01.md), ledger-reconciled by `main` PR #26 /
  `05f48c204d1eae021b3464c206e5c11e84bb3505`, brought into this branch by the ordinary merge
  `87ee39c2832f9ebd41aa8e5b084b76af0d14ff8c`.
- **Branch / remote:** `codex/k1.1-create-reserve-async-dispatch` on `origin`.
- **Base commit B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Round-5 payload C5:** `e0660effc729b968c528943220d9ba6fbc561c18`.
- **Previously reviewed candidates and reviews, all preserved as ancestors of C5:**
  C `8cd9e269b1c08f166dec1b567aedf7d1b4810b34` / H `0f345b3c9ab49f6c5d9e09b162641cda78f96356` /
  [review-01](review-01.md) at `1489227b4c80a2d059e8e71f92b233ed76bff8d5`;
  C2 `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f` / H2 `297cc56ff186638817e0edfba7a3ce9f103d561e`;
  C3 `615cdf884ac560aec659162353680e55f732804c` / H3 `b3cdf33732df1f0645e0d773917b4f82444208c5` /
  [review-02](review-02.md) at `3012b3c3328c49cfa15b2d4330f1bb871f53162a` (CHANGES REQUIRED);
  C4 `1d4e4867b748f9e0b2f4041e17ded836ebc25a75` / H4 `156f13530fc01883608407948d320d12ba4821ca` /
  [review-03](review-03.md) at `e9a31ff` and [review-03-supplement-01](review-03-supplement-01.md) at
  `09eca2a6e4b1a923539ea76865772b0499ee6210` (CHANGES REQUIRED, the authoritative handoff for this round).
  Nothing was amended, rebased, squashed or force-pushed;
  [`01-tree-and-environment.log`](validation-05/01-tree-and-environment.log) proves the ancestry.
- **Candidate H5:** the commit containing this report. Its full SHA and the verified advertised
  remote SHA are in the external handoff, not here: a report cannot certify its own future push.
- **Exact C5..H5 administrative file allowlist:**
  `docs/development/work/K1.1/implementation-05.md` (this report),
  `docs/development/work/K1.1/validation-05/` (MANIFEST plus ten declared output-only logs, force-added
  with `git add -f` because root `.gitignore` ignores `*.log`), and the
  K1.1 status transcription in `docs/development/007-work-packets.md`. No production source, test,
  script, fixture, evaluator rule, threshold or configuration is in that interval; all of those are
  payload in C5.
- **Working-tree state:** clean at C5 apart from (a) `validation-05/`, which the validation run itself
  writes and which H5 commits with `-f`, and (b) one pre-existing uncommitted `mental-model/README.md`
  modification made by the user before this round, explicitly instructed to ignore: it is neither
  staged nor committed in C5 or H5 and is not part of this packet's diff. Validation itself ran in a
  detached `git worktree` at exactly C5 (`/tmp/k11-c5-validation`, `node_modules` symlinked), where
  `git status` shows only `?? node_modules`.

## Changes and coverage

### Change groups

| Group | Files | Ownership and governing source |
|---|---|---|
| Value/serializer boundary reconstructed end-to-end (VAL-02 family) | `packages/kernel/src/values.ts` | Kernel; [values](../../../../mental-model/concepts/values.md) |
| Request-envelope single observation, scope-before-auth ordering, failure-formatter hardening | `packages/kernel/src/coordinator.ts` | Kernel; [identity](../../../../mental-model/concepts/identity.md), [creation](../../../../mental-model/mechanisms/creation.md), [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md) |
| Target entry docs agree with guarded dependency rule (DOC-02) | `packages/kernel/src/index.ts` | 006 reference maintenance; [015](../../015-structural-evidence-rules.md), K1.1-C10 |
| Distinguishing regressions for this round | `packages/kernel/tests/{values,creation,dispatch}.test.ts` | this packet |
| Contract | unchanged at revision 4 | 006/012 (no semantic amendment; findings are implementation defects) |

Cumulative `B..C5` and the round-5 delta `H4..C5` are in
[`01-tree-and-environment.log`](validation-05/01-tree-and-environment.log). The `H4..C5` interval is
exactly the six payload files above plus the two review records (`review-03.md`,
`review-03-supplement-01.md`); no other production/test/config change is in it.

### Selected 012 methods, and material exclusions

Unchanged from the contract: **deterministic execution** (primary), **normative decisions** for the
identity/equality/receipt rules, **race and fault** narrowly for dispatch asynchrony and
ingress-versus-reservation ordering, and **process/documentation** for the K1.0 inventory and guard.
This round leans hardest on deterministic execution with adversarial fixtures and on
**semantic-correction closure** (006/012: a subsystem with repeated findings is reconstructed with its
producers/consumers, not patched counterexample-by-counterexample). Materially excluded, as before:
native Runtime/Driver fidelity (no real Driver exists; R1 owns it), external evidence/gate methods (no
E gate is claimed), and packaging/release (the zone stays private). No persistence or process-death
claim is made or implied.

### Semantic correction closure — K11-R2-VAL-02 family (REOPENED, P1)

**Invariant changed.** *One observation, one value, across the actual serializer boundary.* For every
accepted root, the canonical bytes that decide identity **are** bytes derivable solely from the retained
immutable snapshot — never from inherited/ambient prototype hooks, capture-time-installed hooks, trap
supplied reads, or formatter-observed hostile state. `values.md` supplies both halves: equality is
canonical-byte equality, and unsupported/unstable values are refused rather than repaired. The round-4
reconstruction closed the descriptor-vs-read class but left the JCS call itself observing outside the
snapshot; this round closes the serializer as part of the same subsystem.

**What was actually wrong (three holes plus two adjacent, all in one subsystem).** `values.ts` captured
once into a frozen snapshot inheriting `Object.prototype`/`Array.prototype`, then passed that snapshot
directly to unmodified `canonicalize@3.0.0`, which reads `object.toJSON` (inherited included) before
array/object serialization, `object.map` for arrays, and `object[key]` for objects. `Object.freeze`
does not freeze the prototype chain, so: (a) ambient `Object.prototype.toJSON`/`Array.prototype.toJSON`
diverts bytes to `42`/`99` while retained state stays `{a:1}`/`[1,2]`; (b) a Proxy that agrees on
descriptor/read for `a` while installing `Object.prototype.toJSON=()=>42` as a side effect accepts
`{a:1}` then binds `42` (review-03's witness, reproduced: `{desc:1,read:1,snapA:1,canon:'42'}`);
(c) `captureArray` partitions own names into `extra` vs positions `<length`, so a listed canonical index
`10` with `length 0` (whether unbacked or backed) disappears into accepted `[]` (supplement witness,
reproduced); (d) `describe(error)` reads `error.constructor?.name`, so a thrown Proxy whose
`constructor` access throws escapes the boundary instead of refusing; (e) `captureArray` records
`too_many_entries` for `length>4096` but then allocates `new Array(length)` and loops to `length-1`,
so a sparse `length 20M` forces unbounded work after the limit already failed (K11-R3-LIMIT-01, same
subsystem's rejection path).

**Producers, validators, commit point, consumers, replay and read paths traced together.**

| Role | Where | Disposition after reconstruction |
|---|---|---|
| Producer | caller's request envelope/value | read once per position (capture) and once per envelope field (coordinator, see ID-03); never again |
| Validator/snapshotter | `capture`/`captureArray`/`captureObject`/`describedValue` | also produces the frozen snapshot; refuses incoherent/unowned/throwing/extra/outside-index/limit shapes with located codes instead of normalizing |
| Serializer input | `toSerializationSafe` (new) + `encode` | builds a transient clone solely from the snapshot's own descriptors via load-time primordials: objects → `Object.create(null)` with same enumerable members; arrays → fresh array with same indices plus own non-enumerable `toJSON:undefined` and a minimal own `map` iterating only own indices via primordials. Both shadows are non-enumerable so JCS bytes ignore them; valid snapshots never carry own enumerable `toJSON`/`map` (array extras refused), so no collision; legitimate `{"toJSON":1}` preserved as data. Unmodified JCS sees only the clone |
| Byte limit | `accept` | measured from the clone's bytes, which equal the snapshot's logical bytes |
| Commit point | `createExecution`/`submitInput` | store `CanonicalValue.value` (the snapshot); identity packs `payload.value.canonical` (clone bytes) |
| Content identity | `packIdentity` over `CanonicalValue.canonical` + text parts | bytes now describe what was stored by construction |
| Replay/conflict | `creationIdentity`/`contentIdentity` comparison | decided by bytes that cannot name another value |
| Driver projection | `toActivationEvent`, `Activation.executionView` | the retained snapshot, frozen; verified `===` across redelivery and inspection under pollution |
| Inspection | `viewOf`/`toMailboxView` | the retained snapshot, frozen; re-canonicalizes to bound bytes even under ambient pollution |
| Failure naming | `describe`/`describeFailure` | total (try/catch): hostile `constructor`/`name`/`message`/`String()` degrades to `uninspectable value` / `delivery failed with an uninspectable reason`, never escapes |

**Why not a narrower patch.** Freezing harder, deleting the hook at encode time, or adding one more
descriptor check would each close one witness and leave the class: the next hook (`map`), the next
listing shape, the next formatter read. The reconstruction removes the class — after capture nothing
reads caller state, and the serializer cannot reach outside the snapshot because its input is built
only from the snapshot's own data with prototype hooks shadowed/absent. The dependency is still exact
unmodified `canonicalize@3.0.0` (see Third-party review); what changed is only what it is called with.

**Forbidden mutations, now structural.** No post-capture read of caller state; no exported seal-without-
validate entry; `encode` never receives caller state nor a bare snapshot; every array own name observed
is either coherent content or a refusal; every structural-throw path (including formatter throws)
returns `unstable_representation`.

**Distinguishing oracle.** Seven new `values.test.ts` cases (ambient `Object`/`Array` `toJSON`, side-effect
install, legitimate own `toJSON` data, outside-length unbacked/backed indices, hostile-throw-with-hostile-
inspection), two new `LIMIT-01` cases (at/one-over plus huge-sparse bounded with index-read counting:
`20M` refuses in ~1ms with `<100` index reads), one creation ambient-replay case, one dispatch
ambient-Activation/redelivery/inspection case. Every prior VAL-02/EVID-01/VAL-01/ID-01/SCOPE-01/JCS-01
regression retained; 20/20 ablations rejected including five new round-5 ablations for exactly these
holes (see manifest).

### Semantic correction closure — K11-R3-ID-03 (P2)

**Invariant.** Contract revision 4 C1: every request-naming field including `scope` is text before packing;
non-text is `malformed_value` naming the field. The old `createExecution` ran `mayReachScope` before
`acceptIdentityText(scope)`, so `scope=17` returned `unauthorized_scope` and never validated.

**Correction.** `scope` is observed once, validated as identity text first (`malformed_value` on
non-text/lone-surrogate/over-limit), and that same observation is reused for authorization, the
creation-key triple, content identity packing and the record — never re-read. Only scope moves before
auth: remaining identity fields stay after auth so an unauthorized caller gains no field-validity oracle
beyond the scope it named. Auth still precedes the key lookup (execution-cycle step 1;
hidden/missing indistinguishability preserved). The envelope hardening (single observation per
`kind`/`payload`/`subscriptionClass`, per `definitionRevision`/`runtimeContractRevision`/`progressCodec`/
`authorityContext`/`initialInput`, per `creationKey`/`requestKey`; `AcceptedCreation` now carries
validated `scope`/`definitionRevision`/`runtimeContractRevision`/`progressCodec` for the record instead
of re-reading `request.*`) closes the same TOCTOU class for the request envelope: validation, auth,
packing and retention cannot see three scopes/keys.

**Oracle.** New `creation.test.ts` ID-03 case asserts the ordering explicitly: non-text scope →
`malformed_value`/`scope unsupported_form` (even when unauthorized), malformed-Unicode scope →
`malformed_value`/`scope lone_surrogate`, well-formed unauthorized scope → `unauthorized_scope`, and
nothing created. Scope-ordering ablation (auth-first restored) is rejected by it.

### Semantic correction closure — K11-R3-LIMIT-01 (P2)

**Invariant.** `values.md` fixed entry limit bounds accepted values; the rejection path for hostile
invalid input must itself stay bounded. Old `captureArray` pushed `too_many_entries` then allocated
`new Array(length)` and looped `length` times (up to 2³²−1).

**Correction.** Once the trusted stable `length` exceeds `containerEntries`, push the issue and
`return REFUSED` immediately: no allocation, no own-names scan, no position loop. Exactly-at-limit
proceeds; one-over refuses here. Normal sparse rules (holes → `undefined_member`, unowned positions →
refusal) unchanged for within-limit arrays.

**Oracle.** At/one-over retained; new huge-sparse case (`length 20M`, counting Proxy asserting
`<100` index descriptor reads) proves boundedness. Old-path ablation (late refusal after
allocation/loop) aborts `values.test.ts` after ~19s native stack/OOM on the same root vs 1ms bounded
refusal — itself proof the old path was unbounded.

### Semantic correction closure — K11-R3-DOC-02 (P2)

**Invariant.** 015: written inventory and executable guard agree. `index.ts` said "no third-party
package; `node:` builtins only", contradicting `package.json` (`canonicalize@3.0.0`), `values.ts`
import, `boundary-policy.ts` (`ALLOWED_EXTERNAL_SPECIFIERS=["canonicalize"]`), the landing-zone guard
and the ownership inventory (all: `node:` + exact `canonicalize`).

**Correction.** `index.ts` header now states the guarded rule exactly: in-zone modules, `node:`
builtins, plus exactly the single owner-approved specifier `canonicalize` (exact `3.0.0`); no other
third-party permitted. No allowlist broadening: `boundary-policy.ts`, inventory, `package.json`,
lockfile and both import-surface controls unchanged and still pass.

### Semantic correction closure — K11-R3-PROC-02 (P1 / BLOCKED_EXTERNAL)

**What was wrong.** H4's `validation-04/MANIFEST.md` named ten `.log` attachments, but H4's tree
contained only the manifest: root `.gitignore` ignores `*.log` (`*.log` line 3), validation-01/02/03
had been force-added (`git add -f`) while validation-04 had not (`git ls-files` shows only its
MANIFEST; `git check-ignore` confirms the ignore). Digests without accessible payloads are not
evidence under 006.

**Correction.** `validation-05/` was produced in a detached worktree at exactly C5 and committed with
`git add -f docs/development/work/K1.1/validation-05/`. Before handoff the H5 tree is inspected with
`git ls-tree -r --name-only H5 -- docs/development/work/K1.1/validation-05/` to confirm every raw file
the new manifest names actually exists at H5 (see Handoff). The manifest distinguishes rerun /
inspected-historical / auxiliary / not-run (see Validation) and never claims a rerun not performed.

### Tests added, changed and retired

| Change | Reason |
|---|---|
| **+ 7 cases** in `values.test.ts` (serializer-boundary describe block) | VAL-02 inherited/side-effect `toJSON`, legitimate own `toJSON`, outside-index unbacked/backed, hostile-throw-hostile-inspection |
| **+ 2 cases** in `values.test.ts` (LIMIT-01 block) | at/one-over retained plus huge-sparse bounded with read counting |
| **+ 2 cases** in `creation.test.ts` | ID-03 ordering triple; ambient-`toJSON` creation+replay end-to-end |
| **+ 1 case** in `dispatch.test.ts` | ambient-`toJSON` Activation/redelivery/inspection agreement |
| **~ 0 retired** | No regression retired. Prior VAL-02/EVID-01/VAL-01/ID-01/SCOPE-01/JCS-01/ID-02 cases intact and re-proved discriminating by 20 ablations |

Kernel cases 151 → 163 (+12). Full suite 2,209 → 2,221 (+12). No other suite count moves, as expected:
conformance 1,949, architecture 362, SDK 22 unchanged.

**Compatibility, refusal and baseline impact.** Zone stays private/unadvertised; no consumer routed
through it; SDK host path unchanged (`test:sdk` green). Baseline `002` untouched (0.8.x architecture).
No export-surface change (17 runtime exports, 10 `src` files, `canonicalize` exact): K1.0 inventory and
both export-surface controls unchanged and green. No new refusal classification; all new refusals use
the specified `malformed_value`/`unstable_representation`/`undefined_member`/`unrepresentable_member`/
`too_many_entries` codes.

### Prior findings

| Finding | Disposition at C5 | Evidence |
|---|---|---|
| **K11-R2-VAL-02 (P1, reopened + supplement)** | **Corrected by reconstruction.** Serializer can no longer derive bytes outside the snapshot (safe clone + shadows + primordials); outside-length indices refuse; hostile-throw formatting total; bounded over-limit path in same subsystem. End-to-end re-audited: creation/ingress identity, replay/conflict, Activation/redelivery, inspection all share the one retained snapshot and its bytes. | new values/creation/dispatch cases; ablations 1–4 + 16–18 (round-5 serializer/outside/hostile) |
| **K11-R3-ID-03 (P2)** | **Corrected.** Scope text validation precedes auth; same observation reused for auth/binding/record; auth still precedes lookup. | new ID-03 ordering case; scope-ordering ablation |
| **K11-R3-LIMIT-01 (P2)** | **Corrected.** Over-limit length returns before allocation/traversal; at/one-over preserved. | new bounded huge-sparse case; over-limit ablation (abort vs 1ms) |
| **K11-R3-DOC-02 (P2)** | **Corrected.** `index.ts` now states `node:` + exact `canonicalize` only. | source docs vs `package.json`/policy/guard/inventory agreement; architecture + boundary suites green |
| **K11-R3-PROC-02 (P1/BLOCKED_EXTERNAL)** | **Corrected.** `validation-05/` committed with `-f`; H5 tree verified to contain every manifest-named raw file (see Handoff). | `MANIFEST.md` + ten `.log` files at H5; `git ls-tree` check |
| K11-R2-EVID-01 | Closed round-4, **re-proved** (frozen mints, shared queued, 3 ablations rejected). | `evidence.test.ts`; ablations 5–7 |
| K11-R1-VAL-01 | Closed, **re-proved** (`__proto__`, `01`, assignment/index ablations rejected). | ablations 10–11 |
| K11-R1-ID-01 | Closed, **re-proved** (equal-work ablations rejected). | ablations 12–13 |
| K11-R1-SCOPE-01 | Closed, **re-proved** (cancel-accepts ablation rejected). | ablation 14 |
| K11-R1-JCS-01 | Closed as dependency decision, **re-proved** (`JSON.stringify` ablation rejected; exact `3.0.0` pin/lockfile/guard unchanged). | ablation 15 |
| K11-R1-PROC-01 | Closed, re-verified on ancestry. | `01-tree-and-environment.log` |
| K11-R1-DOC-01 | Closed, untouched. | — |
| K11-R3-ID-02 | Substantially corrected round-4; ordering remainder closed by ID-03 above; packing/injectivity ablations rejected. | ablations 8–9 |

### Additional self-found defects (separate provenance)

None beyond the review handoff. The request-envelope single-observation hardening (coordinator
`kind`/`scope`/`key` re-reads, `AcceptedCreation` validated scalars, total `describeFailure`) was found
while re-auditing producers/consumers for VAL-02/ID-03 under 012 and is recorded here as part of those
closures, not as a new reviewer finding. No additional in-scope defect was found that is not covered above.

### Unresolved obligations

`K1.1-OPEN-3` (accepted progress trivially absent until K1.2), `OPEN-4` (empty batch unreachable),
`OPEN-5` (published never-expires key policy), `OPEN-6` (no durability/isolation/Driver-fidelity claim)
and `OPEN-7` (unbounded delivery-attempt log) stand exactly as contract revision 4 states them. None is a
defect in this packet's claim. `OPEN-1`/`OPEN-2` remain closed. **No owner blocker is open, and no owned
semantic case is left for the reviewer to decide.** The `mental-model/README.md` working-tree
modification predates this round, was instructed to ignore, and is excluded from C5/H5.

## Validation and interpretation

Every command ran in the detached worktree `/tmp/k11-c5-validation` at exactly
C5 `e0660effc729b968c528943220d9ba6fbc561c18` (`node_modules` symlinked; otherwise clean), on
Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64, from the repository root of that
worktree. Exit codes, counts, raw paths and SHA-256 digests are in
[`validation-05/MANIFEST.md`](validation-05/MANIFEST.md) (force-added raw logs; hashes verified
against the files).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2,221 tests, 331 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail |
| `npm run test:kernel` | 0 | 163 tests, 30 suites, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| `npm run check:builder-docs` | 0 | 26 files, 286 links/anchors, 38 imports |
| architecture suite (TAP) | 0 | 362 tests, 37 suites, 0 fail |
| packet case inventory (TAP) | 0 | 163 tests, 30 suites, 0 fail, every case named |
| 20 one-behaviour ablations | 0 | control clean; **20 of 20 rejected** by named cases |

**Cumulative re-check (not only new tests).** The full surface above re-proves the whole packet after
the reconstruction: atomic creation/retry identity, initial input and post-create ingress identity,
replay vs conflict, capacity-before-ack, reservation vs acknowledgement, asynchronous dispatch,
redelivery identity, late-Event exclusion from the reserved batch, frozen receipts/refusals/dispositions,
hidden/missing scope equal work, unsupported K1.2/K1.3 surfaces, inspection purity/inertness/scoping,
and target-zone imports/exports — via the retained suites plus the 20 ablations (15 prior guards +
5 round-5 holes). Prior PASS criteria were not exempted.

**External fixture / gate / decision:** none prepared, none executed, none claimed. E0–E6 are the
benchmark repository's.

**Checks not run, and the resulting limits.** `npm run test:evals` was not run: 006 requires it for
Agent behaviour, and this correction adds no Agent, no model path and no eval fixture. No process-kill
run: this packet makes no persistence or process-failure claim. No native Driver or packaging check.
So nothing here supports a durability, isolation, native-fidelity, release or E-gate claim. See the
manifest's rerun/inspected/auxiliary/not-run split; no rerun is claimed that was not performed.

### Why the evidence supports each criterion — implementer assessment, not acceptance

Every criterion was re-derived from its governing source; no prior PASS was carried forward.

| Criterion | Assessment | Why, and what would have failed |
|---|---|---|
| **C1** | met | Atomic bind, `READY`, lost-response rows, conflict, fresh key, cross-caller text and principal-not-from-payload hold. Creation identity now binds bytes that can only come from the retained snapshot (safe clone), scope ordering fixed (malformed before unauthorized with same-observation reuse), receipt immutable. Without the fix, ambient `toJSON` binds `42` for `{a:1}` and non-text scope misclassifies. |
| **C2** | met | Triple identity, replay/conflict, cross-producer/destination, unknown-vs-invisible, capacity-before-ack, per-root limits hold. Payload identity same serializer guarantee as C1; request-key single observation; hostile/outside-index values refused before queueing. |
| **C3** | met | Rules 1–6 byte-for-byte, four limits at/one-over, per-root measurement, no repair. New half: inherited/side-effect `toJSON` cannot divert (safe clone + shadows), outside-length indices refuse, hostile-throw total, over-limit bounded (early return + counting proof), all via unmodified JCS. |
| **C4** | met | Intent-before-send, pinned fields (now from validated scope/scalars, not re-reads), reservation-acknowledges-nothing, bound, throwing/rejecting/never-settling survival, non-blocking dispatch, one unresolved Activation. Activation carries the one retained snapshot; incoherent values never reach a Driver (ablation). |
| **C5** | met | Redelivery preserves ID/epoch/base/batch/receipt, re-sends the same frozen Activation, late Events stay out. Re-checked under pollution (ambient case shares `===` Activation/payload). |
| **C6** | met | Three boundaries/three receipts, replay returns original, refusals mint none, reads authenticate/scope first with hidden==missing. Frozen mints re-proved. |
| **C7** | met | Outcome/takeover/recovery refuse as K1.2, cancellation as K1.3, state untouched. Untouched, re-proved via ablation. |
| **C8** | met | No Agent/Workflow discriminator in code or exports; JCS pin structurally held. Re-scanned. |
| **C9** | met | Snapshot carries every fact, reads ack/mutate nothing, scoped as C6, exposes the retained structure itself (not a re-derived copy) with immutable evidence; re-canonicalizes to bound bytes even under pollution. |
| **C10** | met | Zone imports only in-zone + `node:` + exact `canonicalize`; leaf list empty; private; no legacy. Entry docs now agree with the guarded rule; export surface unchanged (17); inventory/guard green. |

### Design choices, assumptions and the strongest remaining risk

Routine choices under 007, recorded for ruling rather than inference: (a) serialization-safe clone with
null-prototype objects and own non-enumerable `toJSON:undefined` + minimal own `map` (defense beyond
`toJSON` includes `map` hardening; both non-enumerable so bytes ignore them); primordials captured at
load so capture-time global overwrites cannot steer cloning; (b) scope-only pre-auth validation (other
fields stay post-auth to minimize oracle); envelope single-observation reuse (validation/auth/packing/
record see one scope/key/kind); (c) total formatters degrading to `uninspectable value` /
`delivery failed with an uninspectable reason`; (d) over-limit early return (no sibling-issue sweep on
that path — refusal is refusal); (e) docs fix with no allowlist change.

Assumptions stated plainly: capture observes own-names once; a representation lying differently on a
second listing is accepted as the one listing taken (still one value: identity/retention/projections agree
on that observation). No finite check detects every dishonest object; a second listing would only move the
question. Ambient pollution predating module load that overwrites globals (`Object.keys` itself) is outside
the required threat (which names prototype `toJSON`/`map` and capture-time installs, all neutralized);
deployment hygiene owns pre-load integrity. The `map` shadow assumes load-time `Array.prototype.map` is
not needed — the shadow implements iteration via primordials, so even a pre-polluted `map` is bypassed.

**Strongest remaining risk:** this subsystem has now been corrected three times, and each round found a
deeper layer (reads → snapshot → serializer boundary). The honest statement is that the reconstruction is
new code whose most likely residual defect is a JCS-observable channel not yet named (beyond
`toJSON`/`map`/`keys`/index reads) or an envelope TOCTOU outside the hardened fields. The 20-ablation
sweep and the retained-shape re-canonicalization sweep exist to catch that class; they are not a proof of
absence.

### Third-party review under AGENTS.md

**No new third-party code, test, script, asset, dependency or service was copied, adapted, vendored
or added this round.** `packages/kernel/package.json` still declares exactly `"canonicalize": "3.0.0"`
and `package-lock.json` still pins the same registry tarball and integrity
`sha512-yYLfHyDMIXRyRqsKBRLX023riFLpXY2YOfdtqKXZRZy9qsfOJ9U+4F9YZL7MEzL5+ziN2x2nlBvY/Voi3EBljA==`;
neither file is in the `H4..C5` delta. The Apache-2.0 record and round-3 owner approval in the
contract's Third-party review section stand unchanged and are not reopened. The dependency is still
used unmodified via its default export and only to serialize already-validated plain data; what changed
is only that it is handed a safe clone built solely from the captured snapshot rather than the snapshot
itself (narrowing its input, adding no obligation) plus the same byte-limit measurement. RFC 8785
remains a normative reference, no text/vectors copied. No legal-clearance claim beyond that record is made.

## Handoff

- **Ready for independent review.** No known mandatory defect, no unresolved owned semantic case, no
  owner blocker and no missing required evidence. `WAITING_FOR_REVIEW` is claimed on that basis.
- Base B, payload C5 and candidate H5 with the verified advertised remote SHA are supplied in the
  external owner handoff after the push. The reviewer should bind to the cumulative `B..H5` diff and the
  exact `C5..H5` administrative allowlist above, and re-check C1–C10 cumulatively. `review-01.md`,
  `review-02.md`, `review-03.md` and `review-03-supplement-01.md` are preserved and unmodified.
- **No self-acceptance.** No criterion is accepted here. Nothing is merged. Successor release stays
  owner-controlled; `next_release: none`.
