# Implementation report — K1.1, round 6

## Identity

- **Packet / parent:** K1.1 / K1. **Contract:** [contract.md](contract.md), **revision 4** (unchanged this round; the open findings are implementation defects against it, not contract amendments).
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (B), including
  006/007/008/012/015 as they stand there.
- **State:** correction loop `IN_PROGRESS`; `WAITING_FOR_REVIEW` is claimed on the basis below, only
  after both mandatory defects were corrected and the clean payload revalidated — see
  [Process correction](#process-correction-k11-r4-proc-01). No self-acceptance.
  **Owner release:** explicit instruction on 2026-09-14 ("Let's release K1.1") through
  [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent); correction rounds need no
  renewed permission under 006. This round is a correction of the same released packet; no
  successor is released or begun. **Do not release K1.2.**
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, integrated as `main` PR #21 /
  `9baff3a03662720af6eefe1ecfabc41fde99298f`, receipts [K1.0](../K1.0/integration-01.md) and
  [K1.0-correction-02](../K1.0-correction-02/integration-01.md), ledger-reconciled by `main` PR #26 /
  `05f48c204d1eae021b3464c206e5c11e84bb3505`.
- **Branch / remote:** `codex/k1.1-create-reserve-async-dispatch` on `origin`.
- **Base commit B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Round-6 payload C6:** `b3d0d59f18f6c2b1d0a49746428123d84dd80df2`.
- **Previously reviewed candidates and reviews, all preserved as ancestors of C6:**
  C `8cd9e269b1c08f166dec1b567aedf7d1b4810b34` / H `0f345b3c9ab49f6c5d9e09b162641cda78f96356` /
  [review-01](review-01.md); C2 `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f` / H2
  `297cc56ff186638817e0edfba7a3ce9f103d561e`; C3 `615cdf884ac560aec659162353680e55f732804c` /
  H3 `b3cdf33732df1f0645e0d773917b4f82444208c5` / [review-02](review-02.md) at
  `3012b3c3328c49cfa15b2d4330f1bb871f53162a` (CHANGES REQUIRED); C4
  `1d4e4867b748f9e0b2f4041e17ded836ebc25a75` / H4 `156f13530fc01883608407948d320d12ba4821ca` /
  [review-03](review-03.md) plus [review-03-supplement-01](review-03-supplement-01.md) (CHANGES
  REQUIRED); C5 `e0660effc729b968c528943220d9ba6fbc561c18` / H5
  `bd2dab6d91e0af2328aa39fe74de831bffb27818` / [review-04](review-04.md) at `8c26ffe`
  (CHANGES REQUIRED, the authoritative handoff for this round). Nothing was amended, rebased,
  squashed or force-pushed; [`01-tree-and-environment.log`](validation-06/01-tree-and-environment.log)
  proves the ancestry.
- **Candidate H6:** the commit containing this report. Its full SHA and the verified advertised
  remote SHA are in the external handoff, not here: a report cannot certify its own future push.
- **Exact C6..H6 administrative file allowlist:**
  `docs/development/work/K1.1/implementation-06.md` (this report),
  `docs/development/work/K1.1/validation-06/` (MANIFEST plus ten declared output-only logs, force-added
  with `git add -f` because root `.gitignore` ignores `*.log`), and the
  K1.1 status transcription in `docs/development/007-work-packets.md`. No production source, test,
  script, fixture, evaluator rule, threshold or configuration is in that interval; all of those are
  payload in C6.
- **Working-tree state:** clean at C6 apart from (a) `validation-06/`, which the validation run itself
  writes and which H6 commits with `-f`, and (b) one pre-existing uncommitted `mental-model/README.md`
  modification made by the user before round 5, explicitly instructed to ignore: it is neither
  staged nor committed in C6 or H6 and is not part of this packet's diff. Validation itself ran in a
  detached `git worktree` at exactly C6 (`/tmp/k11-c6-validation`, `node_modules` symlinked), where
  `git status` shows only `?? node_modules`.

## Changes and coverage

### Change groups

| Group | Files | Ownership and governing source |
|---|---|---|
| Serializer execution environment isolated end-to-end (VAL-02) | `packages/kernel/src/values.ts`, `identity.ts`, `refusal.ts` | Kernel; [values](../../../../mental-model/concepts/values.md) |
| Dispatch envelope single observation (DISP-01) + refusal-path hardening | `packages/kernel/src/coordinator.ts` | Kernel; [identity](../../../../mental-model/concepts/identity.md), [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md) |
| Distinguishing regressions for both P1s | `packages/kernel/tests/{values,creation,ingress,dispatch}.test.ts` | this packet |
| Contract | unchanged at revision 4 | 006/012 (no semantic amendment; findings are implementation defects) |

Cumulative `B..C6` and the round-6 delta `H5..C6` are in
[`01-tree-and-environment.log`](validation-06/01-tree-and-environment.log). The `H5..C6` interval is
exactly the eight payload files above plus the round-5 review record (`review-04.md`); no other
production/test/config change is in it.

### Selected 012 methods, and material exclusions

Unchanged from the contract: **deterministic execution** (primary), **normative decisions** for the
identity/equality/receipt rules, **race and fault** narrowly for dispatch asynchrony and
ingress-versus-reservation ordering, and **process/documentation** for the K1.0 inventory and guard.
This round leans hardest on deterministic execution with adversarial fixtures (capture-time global
replacement, throwing intrinsics, shifting getters) and on **semantic-correction closure**
(006/012: a subsystem with repeated findings is reconstructed with its producers/consumers, not
patched counterexample-by-counterexample). Materially excluded, as before:
native Runtime/Driver fidelity (no real Driver exists; R1 owns it), external evidence/gate methods (no
E gate is claimed), and packaging/release (the zone stays private). No persistence or process-death
claim is made or implied.

### Semantic correction closure — K11-R2-VAL-02 (REOPENED AGAIN, P1)

**Provenance (process correction).** This defect family was **implementer-self-found after H5 and
independently confirmed by the round-5 review** ([review-04](review-04.md)): the H5 handoff disclosed
both the capture-time `Object.keys` replacement witness and the dispatch triple-read witness as
already probe-confirmed, and review-04 ruled on them as K11-R2-VAL-02 (reopened) and K11-R4-DISP-01.
See [Process correction](#process-correction-k11-r4-proc-01) for the `WAITING_FOR_REVIEW` handling.

**Invariant restored.** *Once caller capture is complete, neither the caller nor any side effect
caused while observing it can influence canonical bytes except through the captured logical value
itself.* Round 5 rebuilt the serializer **argument** (capture → frozen snapshot → safe clone →
unmodified JCS) but left the exact dependency resolving mutable ambient intrinsics at execution
time. This round reconstructs the whole subsystem: caller observation → snapshot → safe serializer
representation → **serializer execution environment** → exact JCS bytes → byte limit →
creation/ingress identity → replay/conflict → Event → Activation/redelivery → inspection.

**What was actually wrong.** Exact `canonicalize@3.0.0` reads, at call time: global `isNaN`,
`isFinite`, `Error`, `JSON`/`stringify`, `Array`/`isArray`, `Object`/`keys`, `Set`, `Symbol`
(including `Symbol.iterator` for its `for...of`), `Set.prototype.has/add/delete`,
`Array.prototype.map/join/sort/push` and the array iterator, plus ordinary `toJSON`/`map`/`[key]`
reads on its input. Round 5 neutralized only the input reads (null-prototype clones, own
non-enumerable `toJSON`/`map` shadows) and captured a few primordials for its own traversal — the
dependency's own live lookups stayed exposed. H5 counterexample, reproduced before the fix:
coherent Proxy over `{a:1}` installs `Object.keys = () => []` as a read side effect → capture
accepts `{a:1}` → safe clone holds `{a:1}` → unmodified JCS calls live `Object.keys` → bytes `{}`.
The same root cause lets a throwing replacement escape `encode` (which had no refusal boundary)
as an arbitrary Kernel exception.

**Correction (three layers, one subsystem).**

1. **Adapter primordial discipline (`values.ts`).** Every ambient read on the capture → clone path
   now uses a load-time reference, because pollution can be installed *mid-pass* by an earlier trap
   in the same capture: `Array.isArray`, `Object.is/freeze/create/getOwnPropertySymbols`,
   `Number.isFinite`, `Buffer.byteLength`, `new Array/Set` (the `Set`-based cycle stack is replaced
   by an identity stack compared with `===`), issue/capture appends (load-time `push` applied via
   load-time `Reflect.apply`, never `list.push`), `names.filter`/`for...of`/destructuring iteration
   (index loops; `for...of` consults ambient `Symbol.iterator`), `isArrayIndex` (no
   `RegExp`/`Number`/`String` globals: digit scan plus length/lexicographic range check),
   string scans (load-time `charCodeAt` via load-time `Reflect.apply`, no `for...of`).
2. **Restored serializer execution environment (`withSerializerEnvironment`).** The exact
   unmodified call runs with every slot in the audit table below reinstalled to its load-time
   primordial (saved/restored through own-property descriptors, so the swap itself never invokes an
   installed getter/setter), then the previous descriptors are reinstalled. No caller code can run
   while the primordials are installed — the clone has no traps and the dependency calls no caller
   function — so the bytes are a function only of the clone. The swap is temporary (host polyfills
   outside these slots are untouched); if the swap itself fails (e.g. a slot redefined as
   non-configurable), the throw propagates to `accept`, which contains it: degraded availability,
   never wrong bytes.
3. **Exception boundary (`accept`).** Any throw from the encode window maps to an
   `unstable_representation` refusal with a generic message — a disturbed intrinsic can throw an
   attacker-influenced value, and the boundary must contain it rather than leak it.
   Identity/evidence packing is hardened in the same tick for the same reason: `packIdentity` uses
   an index loop (no `Array.prototype.map/join`), `mintReceipt`/`mintRefusal` freeze through a
   load-time reference, and coordinator refusal formatters (`located`/`explain`/issue appends,
   creation/ingress issue merges without spread iteration) avoid ambient iteration and `push`.

**Ambient-read audit (adapter + exact dependency).** The full table, with the slot or structural
neutralization for each read, is documented in code at `serializerSlots` in `values.ts`; summary:

| Read | Disposition |
|---|---|
| `isNaN`, `isFinite`, `Error`, `JSON`, `Array`, `Object`, `Set`, `Symbol` globals | 8 sandbox slots, restored per call |
| `Object.keys`, `Array.isArray`, `JSON.stringify` | 3 sandbox slots |
| `Array.prototype.map/join/sort/push`, `[Symbol.iterator]` | 5 sandbox slots |
| `Set.prototype.has/add/delete` | 3 sandbox slots |
| `object.toJSON` / `object.map` / `object[key]` | structural: null-prototype clones + own non-enumerable shadows; snapshots never passed directly |
| `typeof`/`===`/template spelling | language operators; no slot needed |
| `Number`/`String`/`Reflect`/`Buffer`/`Map`/`getOwnProperty*` | not read by the dependency; adapter uses primordials |
| `part.length`, index reads, `===` scans | operators/own data; no slot needed |

**Why this closes the class, not the witness.** The previous three rounds each stopped at the next
named observable (`toJSON`, then prototype `toJSON`/`map`, then `Object.keys`). This design does not
enumerate bad values — it enumerates *every read the serializer can perform* and severs each one
from caller-mutable state for the duration of the call, while the adapter leading into the call
uses nothing else. A new witness of the same shape (any other global or prototype method replaced
or throwing at capture time) lands in one of the three rows above: restored, structurally shadowed,
or contained as a refusal. The N1/P6 ablation contrast in validation-06 proves the layering:
removing the environment fails only the five new environment cases (round-5 `toJSON` cases still
pass); removing the clone fails only the four round-5 `toJSON` cases (new environment cases still
pass). The exact dependency is unmodified (`canonicalize@3.0.0`, same pin and integrity); only
how/where it is executed changed, which the packet handoff explicitly permits.

**Consequence trace.** Clone → bytes (sandboxed) → limit (`Buffer.byteLength` primordial) → commit
(`CanonicalValue.value` snapshot; identity packs `payload.value.canonical`) → replay/conflict
(byte equality) → Driver projection (`toActivationEvent`, frozen retained snapshot) → inspection
(`viewOf`, same structure). Creation, ingress, Activation/redelivery and inspection cases under the
one-shot-`Object.keys` witness prove each link agrees on `{a:1}`/`{"a":1}`.

**Distinguishing oracle.** Three new `values.test.ts` cases (one-shot `Object.keys → []`, throwing
`Object.keys`, `Array.prototype.join` replacement), one creation identity/replay case, one ingress
identity/replay case, one dispatch Activation/redelivery/inspection case. Ablations N1 (environment
off) and P6 (clone off) are rejected by disjoint case sets, as above.

### Semantic correction closure — K11-R4-DISP-01 (P1)

**Provenance.** Same as VAL-02 above: implementer-self-found after H5, independently confirmed by
review-04.

**Invariant.** *One dispatch request has one observed batch bound; the exact value validated is the
exact value used for refusal reporting and selection.* H5 evaluated caller-owned `options.bound`
three times (`isInteger`, `< 1`, `slice`), so a `1,1,0` getter validated as `1` and selected `0`,
reserving an empty prefix on an Execution that always has at least its initial Event queued.

**Correction (`coordinator.ts`).** The bound is observed once into a local; validation, the refusal
reason and batch selection all use that observation. The integer test is the load-time reference
(the getter can replace the global before validation runs); the refusal reason interpolates only
numbers (any other failing value may carry a throwing `toString`); a non-object envelope is refused
as `invalid_batch_bound` rather than throwing a `TypeError` out of the boundary; selection builds
the acceptance-order prefix with an index loop over the one bound (no second envelope read, no
`filter`/`slice` that a getter side effect could have replaced). `mailboxCapacity` already observed
once (noted, unchanged in shape); `executionId` is single-use (lookup, then the stored record);
`caller` is the host's authenticated boundary, not caller-owned envelope state.

**Envelope audit (TOCTOU shape).** `options.bound`: was read 3×, now 1×. `options` itself: was
assumed an object, now guarded. `executionId`: looked up once, never re-read for a second decision.
`mailboxCapacity`: read once into a local before validation. Creation/ingress envelope fields were
already single-observation (round 5); dispatch was the omitted member of that family and is now
closed.

**Distinguishing oracle.** New `dispatch.test.ts` cases: the `1,1,0` getter (asserts exactly one
observation and a one-Event batch), primordial-validator pollution (`Number.isInteger = () => true`
with a string bound still refuses), and non-object envelopes. Ablation N3 restores the H5 triple
read and is rejected by the first and third cases.

### Process correction — K11-R4-PROC-01 (P1)

H5's report claimed "no known mandatory defect" while its handoff disclosed both P1s above.
Chronology, stated plainly: the two defects were found by the implementer after H5 was cut,
disclosed candidly in the H5 handoff rather than hidden, and independently confirmed as P1 findings
by review-04. 006 does not permit `WAITING_FOR_REVIEW` with known mandatory defects outstanding, so
H5's status claim was wrong even though the disclosure was right. This round returns to the
correction loop, fixes both defects, revalidates the clean payload, and only then reclaims review
readiness. No administrative history was rewritten: H5, its report and review-04 stand as the
record of that interval.

### Tests added, changed and retired

| Change | Reason |
|---|---|
| **+ 3 cases** in `values.test.ts` (round-6 environment block) | one-shot `Object.keys → []`, throwing `Object.keys`, `Array.prototype.join` replacement |
| **+ 1 case** in `creation.test.ts` | creation identity/replay under the `Object.keys` witness (replay proves bytes, conflict proves discrimination) |
| **+ 1 case** in `ingress.test.ts` | ingress identity/replay under the same witness |
| **+ 1 case** in `dispatch.test.ts` | Activation/redelivery/inspection carry exactly the bound value under the witness |
| **+ 3 cases** in `dispatch.test.ts` | `1,1,0` single-observation, primordial-validator pollution, non-object envelopes |
| **~ 0 retired** | No regression retired. All prior VAL-02/EVID-01/VAL-01/ID-01/SCOPE-01/JCS-01/ID-02/ID-03/LIMIT-01 cases intact and re-proved by ablations |

Kernel cases 163 → 172 (+9). Full suite 2,221 → 2,230 (+9). No other suite count moves, as expected:
conformance 1,949, architecture 362, SDK 22 unchanged.

**Compatibility, refusal and baseline impact.** Zone stays private/unadvertised; no consumer routed
through it; SDK host path unchanged (`test:sdk` green). Baseline `002` untouched (0.8.x architecture).
No export-surface change (17 runtime exports, 10 `src` files, `canonicalize` exact): K1.0 inventory and
both export-surface controls unchanged and green. No new refusal classification; the serializer
failure path reuses `unstable_representation`, the dispatch path reuses `invalid_batch_bound`, and
the non-object envelope is classified under the existing bound rule rather than a new shape.

### Prior findings

| Finding | Disposition at C6 | Evidence |
|---|---|---|
| **K11-R2-VAL-02 (P1, reopened ×3)** | **Corrected by reconstruction.** Serializer execution environment restored per call (19 audited slots) + adapter primordial discipline + refusal boundary; end-to-end chain re-audited under the witness. | 6 new VAL-02 cases; ablations N1 + P6 (disjoint rejection sets) |
| **K11-R4-DISP-01 (P1)** | **Corrected.** Bound observed once; validated/reported/selected from that observation; primordial integer test; non-object guard; loop selection. | 3 new DISP-01 cases; ablation N3 |
| **K11-R4-PROC-01 (P1)** | **Corrected.** Chronology recorded above; readiness claimed only after clean-C6 validation. | this report + validation-06 |
| **K11-R3-ID-03 (P2)** | Closed round-5, **re-proved** (ordering ablation rejected). | ablation (scope validation skipped) |
| **K11-R3-LIMIT-01 (P2)** | Closed round-5, **re-proved** (traversal ablation aborts after ~16s native crash vs ~1ms bounded refusal). | ablation P5 |
| **K11-R3-DOC-02 (P2)** | Closed round-5, untouched, suites green. | architecture + boundary suites |
| **K11-R3-PROC-02 (P1/BLOCKED_EXTERNAL)** | Closed round-5, **re-proved.** `validation-06/` committed with `-f`; every manifest-named raw file verified present (see Handoff). | `MANIFEST.md` + ten `.log` files; `ls`/`shasum` record |
| K11-R2-EVID-01 | Closed round-4, **re-proved** (unfrozen-mint ablation rejected; freeze now load-time in all three mint sites). | ablation P2 |
| K11-R1-VAL-01 | Closed, **re-proved** (ordinary-read ablation rejected). | ablation P1 |
| K11-R1-ID-01 | Closed, re-verified on ancestry; lookup path untouched. | full + conformance suites |
| K11-R1-SCOPE-01 | Closed, re-verified; unlanded surfaces untouched. | refusals suite |
| K11-R1-JCS-01 | Closed as dependency decision, **re-proved** (`JSON.stringify` ablation rejected; exact `3.0.0` pin/lockfile/guard unchanged). | ablation P4 |
| K11-R1-PROC-01 | Closed, re-verified on ancestry. | `01-tree-and-environment.log` |
| K11-R1-DOC-01 | Closed, untouched. | — |
| K11-R3-ID-02 | Closed round-4/5; packing now loop-built (no `map`/`join`), ablation family retained. | full suite |

**Cumulative re-review.** C1–C10 were re-derived from their governing sources against the cumulative
`B..C6` tree; no prior PASS was carried forward without its guard re-proven by the ablation set
above. Per-criterion implementer assessment is under [Validation](#validation-and-interpretation).

### Additional self-found defects (separate provenance)

None beyond the review handoff. The adjacent hardening recorded here — adapter primordial
discipline (mid-pass `push`/`filter`/`for...of`/`Set`/regex elimination), `packIdentity` loop
packing, load-time freezing in `identity.ts`/`refusal.ts`, coordinator refusal-formatter and
capacity/selection loops, the non-object dispatch envelope guard — was found while re-auditing
producers/consumers for VAL-02/DISP-01 under 012 and is recorded as part of those closures, not as
new reviewer findings.

### Unresolved obligations

`K1.1-OPEN-3` (accepted progress trivially absent until K1.2), `OPEN-4` (empty batch unreachable),
`OPEN-5` (published never-expires key policy), `OPEN-6` (no durability/isolation/Driver-fidelity claim)
and `OPEN-7` (unbounded delivery-attempt log) stand exactly as contract revision 4 states them. None is a
defect in this packet's claim. `OPEN-1`/`OPEN-2` remain closed. **No owner blocker is open, and no owned
semantic case is left for the reviewer to decide.** The `mental-model/README.md` working-tree
modification predates round 5, was instructed to ignore, and is excluded from C6/H6.

## Validation and interpretation

Every command ran in the detached worktree `/tmp/k11-c6-validation` at exactly
C6 `b3d0d59f18f6c2b1d0a49746428123d84dd80df2` (`node_modules` symlinked; otherwise clean), on
Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64, from the repository root of that
worktree. Exit codes, counts, raw paths and SHA-256 digests are in
[`validation-06/MANIFEST.md`](validation-06/MANIFEST.md) (force-added raw logs; hashes verified
against the files).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2,230 tests, 332 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail |
| `npm run test:kernel` | 0 | 172 tests, 31 suites, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| `npm run check:builder-docs` | 0 | 26 files, 286 links/anchors, 38 imports |
| architecture suite (TAP) | 0 | 362 tests, 37 suites, 0 fail |
| packet case inventory (TAP) | 0 | 172 tests, 31 suites, 0 fail, every case named |
| control + 8 one-behaviour ablations | 0 | control clean; **8 of 8 rejected** by named cases |

**Cumulative re-check (not only new tests).** The full surface above re-proves the whole packet after
the reconstruction: atomic creation/retry identity, initial input and post-create ingress identity,
replay vs conflict, capacity-before-ack, reservation vs acknowledgement, asynchronous dispatch,
single-observation bound selection, redelivery identity, late-Event exclusion from the reserved batch,
frozen receipts/refusals/dispositions, hidden/missing scope equal work, unsupported K1.2/K1.3 surfaces,
inspection purity/inertness/scoping, and target-zone imports/exports — via the retained suites plus
the 8 ablations (6 prior guards + N1/N3 for the reopened P1s). Prior PASS criteria were not exempted.

**External fixture / gate / decision:** none prepared, none executed, none claimed. E0–E6 are the
benchmark repository's.

**Checks not run, and the resulting limits.** `npm run test:evals` was not run: 006 requires it for
Agent behaviour, and this correction adds no Agent, no model path and no eval fixture. No process-kill
run: this packet makes no persistence or process-failure claim. No native Driver or packaging check.
So nothing here supports a durability, isolation, native-fidelity, release or E-gate claim. See the
manifest's rerun/inspected/auxiliary/not-run split; no rerun is claimed that was not performed.

### Why the evidence supports each criterion — implementer assessment, not acceptance

| Criterion | Assessment | Why, and what would have failed |
|---|---|---|
| **C1** | met | Atomic bind, `READY`, lost-response rows, conflict, fresh key, cross-caller text and principal-not-from-payload hold. Creation identity now binds bytes computed in the restored environment from the retained snapshot (one-shot-`Object.keys` creation+replay case); scope ordering retained. Without the fix, identity binds `{}` for `{a:1}`. |
| **C2** | met | Triple identity, replay/conflict, cross-producer/destination, unknown-vs-invisible, capacity-before-ack (loop-counted), per-root limits hold. Ingress identity carries the same environment guarantee (new ingress witness case). |
| **C3** | met | Rules 1–6 byte-for-byte, four limits at/one-over, per-root measurement, no repair. New half: capture-time `Object.keys`/`Array.prototype.join` replacement (lying or throwing) cannot divert bytes or leak; any encode-window failure is `unstable_representation`. N1 ablation rejected by exactly the new cases. |
| **C4** | met | Intent-before-send, pinned fields, reservation-acknowledges-nothing, non-blocking dispatch, one unresolved Activation. The bound that validates is the bound that selects (1,1,0 case asserts one observation and a one-Event batch); non-object envelopes refused; selection loop hardened. N3 ablation rejected. |
| **C5** | met | Redelivery preserves ID/epoch/base/batch/receipt, re-sends the same frozen Activation, late Events stay out. Re-checked carrying the witness value end-to-end. |
| **C6** | met | Three boundaries/three receipts, replay returns original, refusals mint none, reads authenticate/scope first with hidden==missing. Frozen mints re-proved (now via load-time freeze). |
| **C7** | met | Outcome/takeover/recovery refuse as K1.2, cancellation as K1.3, state untouched. Untouched, re-proved. |
| **C8** | met | No Agent/Workflow discriminator in code or exports; JCS pin structurally held. Re-scanned. |
| **C9** | met | Snapshot carries every fact, reads ack/mutate nothing, scoped as C6, exposes the retained structure itself with immutable evidence; every projection re-canonicalizes to the bound bytes under the witness. |
| **C10** | met | Zone imports only in-zone + `node:` + exact `canonicalize`; leaf list empty; private; no legacy. Export surface unchanged (17); inventory/guard green. |

### Design choices, assumptions and the strongest remaining risk

Routine choices under 007, recorded for ruling rather than inference: (a) temporary per-call
restoration (not permanent healing, not a `vm` realm): host state outside the 19 slots is untouched,
and no new dependency or realm boundary is introduced — the dependency still executes in place, with
restored globals, which is the smallest change the handoff permits; (b) neutralization preferred
over refusal when correct bytes are computable (a configurable lying/throwing intrinsic is bypassed
and the valid value stays accepted — availability preserved; refusal is reserved for a disturbed
window that actually fails, e.g. a non-configurable slot redefinition); (c) generic refusal message
(a disturbed intrinsic can throw attacker-influenced text; it is never interpolated); (d) manual
loops/index assignment wherever bookkeeping shares the capture tick; (e) non-object dispatch
envelope refused under the existing bound rule.

Assumptions stated plainly: primordials are captured at module load, before any caller observation —
pre-load host integrity is deployment hygiene, as before. A representation lying differently on a
second *listing* is accepted as the one listing taken (still one value: identity/retention agree on
that observation). Persistent cross-call global pollution cannot change bytes or identity (both go
through the restored window and primordial packing), but coordinator bookkeeping outside the audited
serializer/identity/refusal paths (mailbox `push`, `Map` lookups, view rendering) still consults
live builtins; a side effect that permanently replaces those would degrade later calls' bookkeeping
rather than their bytes. That residual is host-global hygiene, not a second bytes channel, and no
finite check distinguishes every hostile host.

**Strongest remaining risk:** this subsystem has now been corrected four times, each round finding a
deeper layer (reads → snapshot → prototype hooks → execution environment). The honest statement is
that the audit table above is complete against the published 49-line dependency *as published* —
a future `canonicalize` major version with new global reads would need a new audit row — and that
the most likely residual defect is a caller-triggerable channel outside the serializer audit
(Map/prototype bookkeeping above) or an envelope TOCTOU outside the hardened fields. The N1/P6 and
N3 ablations exist to catch regressions in exactly these two seams; they are not a proof of absence.

### Third-party review under AGENTS.md

**No new third-party code, test, script, asset, dependency or service was copied, adapted, vendored
or added this round.** `packages/kernel/package.json` still declares exactly `"canonicalize": "3.0.0"`
and `package-lock.json` still pins the same registry tarball and integrity
`sha512-yYLfHyDMIXRyRqsKBRLX023riFLpXY2YOfdtqKXZRZy9qsfOJ9U+4F9YZL7MEzL5+ziN2x2nlBvY/Voi3EBljA==`;
neither file is in the `H5..C6` delta. The Apache-2.0 record and round-3 owner approval in the
contract's Third-party review section stand unchanged and are not reopened. The dependency is still
used unmodified via its default export and only to serialize already-validated plain data; what changed
is the execution window it runs in (restored primordials) plus the same byte-limit measurement.
`node:` builtins used (`buffer`, plus `Reflect`/`Object`/`Array`/`JSON`/`Set`/`Symbol` globals as
load-time references) introduce no new package. RFC 8785 remains a normative reference, no
text/vectors copied. No legal-clearance claim beyond that record is made.

## Handoff

- **Ready for independent review** on the corrected candidate: both mandatory defects are corrected
  with distinguishing tests, the clean payload is fully revalidated with accessible raw evidence,
  and no owned semantic case is left for the reviewer. This reclaims `WAITING_FOR_REVIEW` only now,
  after the correction loop — see the process correction above.
- Base B, payload C6 and candidate H6 with the verified advertised remote SHA are supplied in the
  external owner handoff after the push. The reviewer should bind to the cumulative `B..H6` diff and the
  exact `C6..H6` administrative allowlist above, and re-check C1–C10 cumulatively. All prior
  `review-0X.md` records are preserved and unmodified.
- Before handoff, the H6 tree is inspected with `git ls-tree -r --name-only H6 -- <validation-06>/`
  to confirm every raw file the manifest names actually exists at H6.
- **No self-acceptance.** No criterion is accepted here. Nothing is merged. `main` is untouched.
  Successor release stays owner-controlled; `next_release: none`.
