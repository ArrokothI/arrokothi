# K1.1 independent review — round 3 supplement 01

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-14  
**Role:** independent reviewer; I did not implement this candidate.  
**Session identifier:** not exposed to me.

## Binding and purpose

This supplement belongs to the independent review recorded in [`review-03.md`](review-03.md) and binds to the same immutable candidate only:

- **Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
- **Round-4 payload C4:** `1d4e4867b748f9e0b2f4041e17ded836ebc25a75`
- **Round-4 candidate H4:** `156f13530fc01883608407948d320d12ba4821ca`
- **Contract:** `docs/development/work/K1.1/contract.md`, revision 4
- **Primary review record:** `docs/development/work/K1.1/review-03.md`

It does **not** review or accept the later administrative/review commit that contains `review-03.md`, and it does not alter the primary review's verdict. It preserves that delivered record unchanged and adds one concrete counterexample found while completing the same cumulative semantic pass.

The reviewer had immutable GitHub source/ref/commit access but no usable repository checkout for trustworthy repo-level reruns. The isolated counterexample below is JavaScript object-model reasoning/probing, not a repository-test rerun.

## Supplemental finding detail

### K11-R2-VAL-02 — REOPENED P1 — additional array own-name counterexample

**Affected:** `packages/kernel/src/values.ts`, `captureArray`; dependent creation/ingress identity, Activation/redelivery and inspection paths.  
**Criteria/sources:** K1.1-C1/C2/C3/C4/C9; `mental-model/concepts/values.md`; contract revision 4's explicit rule that an own-name listing with no property behind it is refused; primary review K11-R2-VAL-02.

The primary review already reopens K11-R2-VAL-02 because the captured snapshot can still expose inherited `toJSON` to the exact JCS implementation, so canonical bytes can describe a value other than the retained snapshot. There is an additional independent hole in the same reconstructed capture subsystem.

`captureArray` does the following:

1. observes a stable own `length` descriptor/read;
2. obtains `Object.getOwnPropertyNames(container)`;
3. treats an own name as an extra member only when it is neither `"length"` nor a canonical array-index spelling;
4. descriptor-checks array positions only for integer indices `0 <= index < length`.

Therefore a canonical-index name reported by the own-name observation but numerically outside the observed array length is neither classified as an extra member nor visited by the position loop.

A concrete legal Proxy shape is an extensible empty array target whose `ownKeys` trap reports `['length', '10']`, while the target still has `length === 0` and no own property descriptor for `"10"`. The non-configurable real `length` key is included, so the Proxy invariant is satisfied; an extra key may be reported for an extensible target. The candidate observes the claimed own name `"10"`, recognizes its spelling as a canonical array index, excludes it from `extra`, then loops zero positions because `length` is `0`. It consequently accepts and snapshots `[]` instead of refusing a structure whose own-name observation claimed a member with no property behind it.

This contradicts revision 4's own observable rule:

> an own-name listing with no property behind it ... is refused

and shows that the current reconstruction does not account for every structural fact obtained during its one own-name observation.

An isolated JavaScript probe confirmed the required shape is observable without violating Proxy invariants:

```text
Array.isArray(proxy) === true
Object.getPrototypeOf(proxy) === Array.prototype
proxy.length === 0
Object.getOwnPropertyNames(proxy) === ['length', '10']
Object.getOwnPropertyDescriptor(proxy, '10') === undefined
```

The existing round-4 object own-name test does not distinguish this array case because `captureObject` iterates every listed name and checks its descriptor, while `captureArray` partitions names and later iterates only positions below `length`.

**Required outcome:** the K11-R2-VAL-02 correction must account for the complete observed array structure, not only positions below `length`. Every own name observed for an array must either correspond coherently to accepted array content or make the value refuse; a listed-but-unowned canonical index outside the stable observed length must not disappear into an accepted `[]`. Add a distinguishing direct value regression and trace the corrected invariant through creation/input acceptance, replay identity, Activation/redelivery and inspection together with the inherited-`toJSON` and hostile-thrown-value cases already required by `review-03.md`.

This is a required invariant/outcome, not a prescribed patch mechanism.

## Effect on coverage and verdict

This supplement adds no new acceptance criterion and changes no PASS to FAIL beyond the primary review: K1.1-C1, C2, C3, C4 and C9 were already FAIL under reopened K11-R2-VAL-02; C5, C6, C7 and C8 remain PASS; C10 remains FAIL for K11-R3-DOC-02 and inaccessible required raw evidence. K11-R3-ID-03, K11-R3-LIMIT-01, K11-R3-DOC-02 and K11-R3-PROC-02 remain open exactly as recorded in `review-03.md`.

The overall review verdict for exact H4 remains **CHANGES REQUIRED**, with the packet using 006's `BLOCKED_EXTERNAL` state while required raw validation evidence is unavailable. No acceptance is granted to H4 or to any later administrative/review commit.

## Updated compact correction locator

Correct the same released packet K1.1 on `codex/k1.1-create-reserve-async-dispatch`.

Base `777b9955fb3a443f700b4f3d1f4f2aef1869345b`; reviewed H `156f13530fc01883608407948d320d12ba4821ca`; primary review `docs/development/work/K1.1/review-03.md`; supplemental review detail `docs/development/work/K1.1/review-03-supplement-01.md`.

Open findings remain K11-R2-VAL-02, K11-R3-ID-03, K11-R3-LIMIT-01, K11-R3-DOC-02 and K11-R3-PROC-02. For K11-R2-VAL-02, close the entire capture -> serializer -> retained value -> identity/replay -> Activation/redelivery -> inspection subsystem, including the inherited/prototype `toJSON` counterexample, hostile thrown-value formatting, and the listed-but-unowned canonical array-index case in this supplement.

Apply governing 006 and 012, re-review the whole cumulative packet, preserve historical records, create a new clean C/H with accessible raw validation evidence, and do not merge or release a successor.

CHANGES REQUIRED
