# K1.1 independent review — round 2 (correction candidate H3)

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-14  
**Role:** independent reviewer; I did not implement this candidate.  
**Session identifier:** not exposed to me.

## Candidate binding and access

This review binds only to:

- **Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
- **Round-1 payload C:** `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`
- **Round-1 reviewed H:** `0f345b3c9ab49f6c5d9e09b162641cda78f96356`
- **Round-1 review record:** `1489227b4c80a2d059e8e71f92b233ed76bff8d5` (`review-01.md`, CHANGES REQUIRED)
- **Round-2 payload C2:** `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f`
- **Round-2 candidate H2:** `297cc56ff186638817e0edfba7a3ce9f103d561e`
- **Round-3 payload C3:** `615cdf884ac560aec659162353680e55f732804c`
- **Candidate H3 under this review:** `b3cdf33732df1f0645e0d773917b4f82444208c5`
- **Branch:** `codex/k1.1-create-reserve-async-dispatch`
- **Integrated-main administrative merge into the branch:** `87ee39c2832f9ebd41aa8e5b084b76af0d14ff8c`, carrying `05f48c204d1eae021b3464c206e5c11e84bb3505` (PR #26)
- **Prerequisite implementation integration:** K1.0 correction-02 lineage integrated by PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`
- **Contract:** `docs/development/work/K1.1/contract.md`, revision 3
- **Governing process baseline:** B, including 006/007/008/012/015 as they stand there.

At review time the advertised packet branch resolved exactly to H3. I independently verified that `05f48c204d1eae021b3464c206e5c11e84bb3505` is an ancestor of C3. C3→H3 is one administrative commit containing only `implementation-03.md`, the declared `validation-03` evidence directory, and the K1.1 status transcription in 007; it contains no production source, test, evaluator, fixture or configuration change.

I inspected the cumulative B→C3 source interval, H2→C3 correction delta, C3→H3 administrative interval, the target-Kernel production sources and relevant tests, the contract/status/report, K1.0 structural guard/inventory material, both prerequisite integration receipts, the exact `canonicalize@3.0.0` package source/metadata/LICENSE, the lockfile stanza and the committed round-3 validation evidence.

I did **not** independently rerun the repository npm commands. The local execution environment available to this review still cannot resolve `github.com`, so it cannot obtain the repository checkout needed for trustworthy repo-level reruns. The committed validation logs below are therefore **inspected implementer executions**, not reviewer reruns. I did independently run a small isolated Node language-semantics probe for the Proxy/value counterexample in K11-R2-VAL-02, using the exact v3.0.0 upstream canonicalizer algorithm; that probe is not a repository test.

This is not a 006 external-blocker case: immutable source, diffs and raw evidence are readable through the repository connection, and the defects below are semantic candidate defects rather than missing review access.

## Governing baseline and selected 012 methods

I re-applied B's `AGENTS.md`, the mental-model canonical owners, development front door, 006, 007, 008, 012 and 015. The candidate's own later records cannot weaken those rules. In particular, 006 requires a cumulative review after correction, requires continued review after a defect is found, and requires every acceptance criterion to receive an independent PASS/FAIL disposition.

Applicable 012 methods were:

- **Normative decisions:** creation/input identity, boundary-value fidelity/equality, receipt evidence, scope non-disclosure, packet ownership and unsupported surfaces.
- **Deterministic execution:** create/ingress/reservation/dispatch/redelivery/inspection, exact canonical form, retained immutable state, and distinguishing wrong implementations.
- **Race/fault, narrowly:** intent-before-send, synchronous/rejected Driver delivery, non-blocking dispatch and ingress versus reservation. No persistence/process-death claim is made here.
- **Process/documentation:** B/C/H lineage, correction deltas, owner-approved third-party substrate, prerequisite receipts, status and structural inventory/guard maintenance.
- **Semantic-correction closure:** each round-1 finding was rechecked from its governing invariant rather than treated as closed by prior assertion.

Native Driver fidelity, external E-gate results, persistence and public packaging/release remain correctly outside K1.1.

My cumulative interaction coverage was: creation ↔ canonical value ↔ retained input/authority state ↔ replay; ingress ↔ Input ID ↔ immutable mailbox content; reservation ↔ pinned Activation ↔ asynchronous send ↔ redelivery; receipts/refusals ↔ retained evidence ↔ replay/inspection; scope lookup ↔ hidden/missing shape/work; packet ownership ↔ unsupported surfaces; and target-zone dependency policy ↔ exact third-party approval ↔ inventory/guard controls.

## Evidence and correction-delta assessment

The committed `validation-03/MANIFEST.md` binds the evidence to C3 and records: clean typecheck; `npm test` 2,175 tests / 324 suites / 0 failures; conformance 1,949 / 283 / 0; Kernel 117 / 23 / 0; SDK 22 / 0; builder-docs success; architecture 362 / 37 / 0; and a named 117-case packet inventory. `09b-distinguishing-ablations.log` records six one-behaviour ablations, all rejected: assignment-style sealing, widened array-index recognition, missing-ID fast path, early-exit scope check, accepted cancellation and `JSON.stringify` substituted for the approved JCS implementation.

Those logs are useful and the ablations are materially discriminating for the defects they name. They do not exercise the two counterexamples below, so the green counts do not establish the missing invariants.

The H2→C3 delta is narrow and intelligible: the two prerequisite receipts/main reconciliation plus the exact JCS dependency/lockfile, values substrate swap, structural guard/inventory and associated controls. I found no evidence that the owner-approved JCS correction weakened the canonical rules. `canonicalize` is pinned exactly to `3.0.0`; the lockfile pins the registry tarball and integrity `sha512-yYLfHyDMIXRyRqsKBRLX023riFLpXY2YOfdtqKXZRZy9qsfOJ9U+4F9YZL7MEzL5+ziN2x2nlBvY/Voi3EBljA==`; the target-zone guard treats `canonicalize` as an exact specifier rather than a prefix and rejects `canonicalize-evil`.

I inspected the exact upstream v3.0.0 `package.json`, `lib/canonicalize.js` and Apache-2.0 LICENSE. The package declares no runtime dependencies; its runtime canonicalizer is unmodified in this candidate. The implementation record captures source/version, reuse method, license/redistribution obligations and the absence of NOTICE contents. This review does not make a broader legal-clearance claim.

## Round-1 finding closure

| Round-1 finding | Round-2 review disposition |
|---|---|
| **K11-R1-VAL-01** — value-copy fidelity (`__proto__`, `"01"`) | **Specific counterexamples corrected, but subsystem not closed.** The named `__proto__` and numeric-looking non-index regressions are fixed and ablation-protected. A new same-invariant counterexample, K11-R2-VAL-02 below, shows the accepted-space/retained-value invariant is still incomplete. |
| **K11-R1-ID-01** — hidden vs missing work | **CLOSED for this packet's application-level claim.** `#visible` now always performs one lookup plus a full caller-scope scan using a missing sentinel; `mayReachScope` has no early exit; the tests use Proxy read counters across inspect/ingress/dispatch/redelivery and reject both missing-fast-path and `includes` ablations. No cryptographic constant-time claim is made. |
| **K11-R1-SCOPE-01** — K1.3 cancellation implemented in K1.1 | **CLOSED.** `cancelExecution` refuses by name as K1.3-owned; C11 is withdrawn; the ablation that accepts cancellation is rejected. Terminal-state live evidence is correctly deferred to its owner rather than manufactured here. |
| **K11-R1-JCS-01** — bespoke serializer against `values.md` | **CLOSED.** Owner-approved exact `canonicalize@3.0.0` is used unmodified after ArrokothI validation, with exact dependency/guard pins and an almost-equivalent-substrate ablation. The new VAL finding is about the validation/snapshot boundary around JCS, not the approved JCS implementation itself. |
| **K11-R1-PROC-01** — prerequisite receipts absent | **CLOSED.** Both formal receipts are present. Their stated PR #21 merge identity is independently corroborated by GitHub: `9baff3a...` has parents `c9a9ed7...` and cleanup head `07d7bee...` and tree `8ebe7a...`; the later PR #24 documentation merge is not misrepresented as the implementation integration. |
| **K11-R1-DOC-01** — stale target-protocol descriptions | **CLOSED.** Current private-package/refusal descriptions accurately distinguish landed K1.1 surfaces from K1.2/K1.3/later unsupported surfaces. |

## Findings

### K11-R2-VAL-02 — P1 — accepted Proxy-backed values can bind canonical bytes different from the retained value

**Affected:** `packages/kernel/src/values.ts`; creation and input acceptance; mailbox, Activation and inspection projections.  
**Governing criteria/sources:** K1.1-C1/C2/C3/C4/C9; `mental-model/concepts/values.md` reject/no-repair and canonical-equality rules.

Round 2 repaired the two concrete copying mistakes from review-01, but the value subsystem still validates, canonicalizes and seals the caller object in separate passes that can observe different semantics.

For arrays, `walk` accepts anything for which `Array.isArray(value)` is true and `Object.getPrototypeOf(value) === Array.prototype`. It checks an own descriptor only to reject accessors, but then validates the element by reading `container[index]`. The approved JCS implementation likewise obtains array members through ordinary array mapping/property access. `sealBoundaryValue`, however, obtains an own data descriptor and copies `descriptor.value` when one exists.

A JavaScript Proxy can therefore satisfy every current structural check while making ordinary indexed access disagree with its own data descriptor. Concrete counterexample:

```js
const target = [1];
const value = new Proxy(target, {
  get(inner, key, receiver) {
    if (key === "0") return 2;
    return Reflect.get(inner, key, receiver);
  },
});
```

For this value:

- `Array.isArray(value)` is `true`;
- its prototype is exactly `Array.prototype`;
- own property `"0"` has a data descriptor whose value is `1`;
- `walk` reads `value[0]` and validates `2`;
- unmodified `canonicalize@3.0.0` reads the array element and produces canonical `[2]`;
- `sealBoundaryValue` reads the own descriptor and retains `[1]`.

An isolated Node probe reproducing those exact language operations and the v3.0.0 canonicalizer produced:

```text
isArray: true
proto: true
descriptorValue: 1
walkItem: 2
canon: '[2]'
sealItem: 1
```

So `canonicalize(value)` can return one `CanonicalValue` whose `canonical` says `[2]` while its retained `value` is `[1]`. This is stronger than a cosmetic representation difference: creation/input identity and replay decisions bind one logical value, while inspection and Driver delivery expose another. The implementation has accepted an exotic/unsupported representation and repaired/transformed it instead of either refusing it or deriving identity and retained state from one immutable validated snapshot.

The existing ordinary-hole, exotic-prototype, accessor, `__proto__` and `"01"` cases do not distinguish this. The round-3 ablations likewise mutate known fixes but never vary repeated reads/descriptors of one accepted root.

**Required outcome:** reconstruct the acceptance/snapshot boundary so validation, canonical bytes and retained content are derived from one coherent structural snapshot, or refuse representations for which that invariant cannot be established. In particular, no accepted array position may be supplied only or differently through dynamic property access while the retained own-data member says something else. Add distinguishing regressions that exercise descriptor-versus-property-access disagreement (and absent own positions supplied by a Proxy/prototype) through direct canonicalization plus creation/ingress, Activation and inspection. The required outcome is the invariant, not a prescribed patch mechanism.

### K11-R2-EVID-01 — P1 — retained receipts and refusal evidence escape as mutable shared objects

**Affected:** `packages/kernel/src/identity.ts`, `packages/kernel/src/coordinator.ts`, replay results and inspection views.  
**Governing criteria/sources:** K1.1-C1/C6/C9, and C2 where recorded conflicts/refusals are part of the observable boundary; `mental-model/concepts/identity.md` retained-decision/receipt rules and inspection's immutable-record claims.

`Receipt` is `readonly` only at the TypeScript type level. `mintReceipt` returns an ordinary unfrozen object. `createExecution` stores that exact object simultaneously as `record.creationReceipt`, the initial mailbox entry's receipt and an element of `record.receipts`, then returns the same object to the caller. Exact replay later returns `existing.creationReceipt`. Input and dispatch follow the same pattern.

Therefore ordinary JavaScript can mutate retained acceptance evidence through a successful API result, for example conceptually:

```ts
const created = accepted(kernel.createExecution(...));
(created.receipt as any).token = "forged";
```

The mutation changes the internally retained object. A later exact creation replay returns the forged token, and inspection exposes it through `receipts`, mailbox receipt and/or activation receipt. That directly contradicts C1's retained-decision replay and C6's requirement that exact replay return the original receipt/token naming one accepted boundary/position.

The same root problem exists for refusals. `#refusal` creates one mutable plain object, pushes that exact object into `record.refusals`, and returns it to the caller. `viewOf` later returns `refusals: [...record.refusals]`, which copies only the array, not the evidence objects. A caller can therefore mutate the classification/reason/position of a refusal after it was recorded and have inspection report the edited record. `toActivationView`, `toMailboxView` and `viewOf` similarly return retained receipt references rather than immutable copies.

The current tests compare receipt/refusal values but do not attempt to mutate an exposed evidence object and then replay/inspect. Consequently the green receipt/inspection suites do not distinguish this failure.

**Required outcome:** retained evidence must not be caller-mutable. Make the internal receipt/refusal records immutable or expose detached immutable copies such that mutations through create/ingress/dispatch/redelivery/refusal/inspection results cannot alter a later replay or inspection. Add distinguishing regressions covering every exposed receipt family and a recorded refusal, with mutation attempts followed by replay/inspection checks.

## Per-criterion verdicts

| Criterion | Verdict | Independent rationale |
|---|---|---|
| **K1.1-C1** | **FAIL** | Atomic creation/key scoping/lost-response structure is otherwise strong, but K11-R2-VAL-02 lets creation bind canonical content different from retained initial/context state, and K11-R2-EVID-01 lets the caller mutate the retained creation receipt so replay need not return the original decision. |
| **K1.1-C2** | **FAIL** | Input-ID packing, replay/conflict/capacity and hidden/missing work are substantially corrected, but accepted Proxy-backed payloads can be retained differently from the logical value that decided replay. Recorded conflict/refusal evidence is also externally mutable. |
| **K1.1-C3** | **FAIL** | The JCS substrate decision itself is now correct and exact-limit/JCS evidence is strong, but the validation/snapshot wrapper can accept one observable value, canonicalize another and retain a third representation. That violates the canonical value's no-repair/coherent-value invariant. |
| **K1.1-C4** | **FAIL** | Reservation, intent-before-send, pinned revisions/view and non-blocking dispatch are well exercised, but an Activation can carry the sealed `[1]` form while the accepted input identity was bound to canonical `[2]` under K11-R2-VAL-02. The exchange therefore need not carry the exact accepted Event content. |
| **K1.1-C5** | **PASS** | For an already-formed exchange, ordinary redelivery reuses the same frozen Activation, ID, writer epoch, base revision, receipt reference and reserved batch and excludes later arrivals. I found no separate C5 defect. |
| **K1.1-C6** | **FAIL** | Boundary separation, no receipt on refusal and corrected hidden/missing work are good, but the supposedly retained receipt object is mutable through caller-visible references. Exact replay therefore need not return the original token/evidence. K11-R2-EVID-01. |
| **K1.1-C7** | **PASS** | Outcome/takeover/recovery/cancellation surfaces refuse by name under their owning later packets; the prior K1.3 scope expansion is gone and its wrong implementation is ablation-rejected. |
| **K1.1-C8** | **PASS** | No Agent/Workflow discriminator was introduced into the target protocol surface; target-zone vocabulary/import controls remain aligned. |
| **K1.1-C9** | **FAIL** | Inspection is non-acknowledging and structurally comprehensive, but it can expose retained values inconsistent with accepted canonical identity and its receipt/refusal evidence objects alias mutable internal records. It is therefore not a trustworthy immutable snapshot. |
| **K1.1-C10** | **PASS** | The package remains private; the measured target graph reaches only in-zone modules, `node:` builtins and exact `canonicalize`; exact-specifier positive/negative controls and inventory/guard updates are coherent. No structural weakening found. |

C11 remains withdrawn and is not an acceptance criterion in contract revision 3.

## Overall assessment

This correction round genuinely closes the prior JCS, process, cancellation, disclosure-work and stale-documentation blockers, and it improves the distinguishing oracle. It is nevertheless not acceptable at H3 because two independent P1 invariant failures remain in the implemented boundary:

1. the boundary-value pipeline can bind canonical identity to content different from the retained/Driver-visible value; and
2. retained acceptance/refusal evidence can be edited through caller-visible shared objects.

Both defects are local implementation/correction problems under settled architecture. Neither requires a new architecture decision, so the 006 outcome is **CHANGES REQUIRED**, not `BLOCKED — ARCHITECTURE DECISION`.

## Compact correction handoff

Keep the same K1.1 packet and preserve B/C/H history, review-01 and this review. Do not reopen the already settled `canonicalize@3.0.0` owner decision or the prerequisite receipts unless a correction actually changes them.

1. **Reconstruct value acceptance around one coherent snapshot.** Validation, canonical bytes, identity, retained state, Activation and inspection must all describe the same value. Reject dynamic/exotic representations when that cannot be guaranteed. Add a Proxy whose own descriptor says `1` while indexed read says `2`, plus an absent-own-index/prototype-or-Proxy case, and carry those through direct value acceptance, creation/ingress, Activation and inspection. Re-run the existing `__proto__`, `"01"`, limits and JCS regressions so this correction does not regress round 2/3.
2. **Make retained evidence immutable across the API boundary.** A caller's mutation attempt on creation/ingress/dispatch/redelivery receipts and on returned refusal/inspection objects must not alter any later replay or inspection. Add tests that deliberately mutate exposed objects and then verify original retained token/boundary/position/classification/reason remain unchanged.
3. Apply 012 correction closure to the whole value/evidence subsystems, not just the two examples; re-audit all C1–C10 cumulatively, keep C5/C7/C8/C10 controls intact, validate from a new clean payload C4, then create a new administrative H4 and return to `WAITING_FOR_REVIEW` only if no mandatory issue remains.
4. No self-accept, no K1.1 merge, no K1.2 release.

CHANGES REQUIRED
