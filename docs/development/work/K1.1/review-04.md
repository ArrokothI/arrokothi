# K1.1 independent review — round 4 (candidate round 5)

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-14  
**Role:** independent reviewer; I did not implement this candidate.  
**Session identifier:** not exposed to me.

## Candidate binding and access

This review binds only to:

- **Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
- **Round-5 payload C5:** `e0660effc729b968c528943220d9ba6fbc561c18`
- **Round-5 candidate H5:** `bd2dab6d91e0af2328aa39fe74de831bffb27818`
- **Branch:** `codex/k1.1-create-reserve-async-dispatch`
- **Contract:** `docs/development/work/K1.1/contract.md`, revision 4
- **Previous review handoff:** `docs/development/work/K1.1/review-03.md` plus `review-03-supplement-01.md`, through `09eca2a6e4b1a923539ea76865772b0499ee6210`
- **Prerequisite implementation integration:** PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`
- **Integrated prerequisite/status reconciliation:** PR #26 / `05f48c204d1eae021b3464c206e5c11e84bb3505`

At review start the advertised packet branch was exactly H5 and advertised `main` was exactly `05f48c204d1eae021b3464c206e5c11e84bb3505`.

I had immutable GitHub source/ref/commit access. I inspected the governing baseline, the full cumulative B→H5 changed-file inventory, the H4-review→C5 correction delta, the exact C5→H5 administrative interval, full H5 production source for the affected Kernel boundary and its surrounding identity/evidence/inspection/unsupported/Driver code, relevant tests, contract/status/report records, prior reviews, structural policy material, the exact upstream `canonicalize@3.0.0` implementation, and the committed validation-05 raw evidence.

I did **not** independently rerun repository npm commands: this session has no usable repository checkout. I independently ran small isolated Node probes for JavaScript semantics behind the two material counterexamples below. Those probes are not repository tests and are not represented as such.

Unlike H4, H5 contains the raw validation attachments named by its manifest. I inspected the pinned outputs for typecheck, full test, conformance, Kernel, SDK, builder-docs, architecture and distinguishing ablations. I treat them as inspected implementer executions on clean C5, not reviewer reruns.

## Governing baseline and independent coverage

I re-read B's `AGENTS.md`, `mental-model/README.md`, `docs/development/README.md`, 006, 008, 012 and 015, the K1.1 contract/status, and the relevant Layer-3 owners: values, identity, core, creation and execution-cycle. Under 006/012, a repeated semantic finding requires reconstruction of the subsystem and its dependent consumers; a previous PASS or corrected witness is not immunity.

My independently derived interacting coverage was:

- creation/input identity ↔ runtime validation ↔ canonical logical equality ↔ immutable retained value;
- boundary capture ↔ serialization-safe representation ↔ exact third-party JCS observables ↔ byte limits ↔ replay/conflict ↔ Activation ↔ inspection;
- caller-owned request/dispatch envelopes ↔ single accepted observation ↔ validation ↔ atomic state mutation;
- batch selection ↔ reservation ↔ acknowledgment ↔ redelivery ↔ late arrivals;
- retained receipts/refusals/dispositions ↔ replay ↔ inspection;
- hidden/missing lookup work ↔ scoped inspection/listing;
- unsupported K1.2/K1.3 surfaces;
- target-zone dependency policy ↔ package/inventory/guard/source documentation;
- B/C/H ancestry, prerequisites, release hold and raw evidence availability.

## Candidate identity, correction delta and evidence

C5 is one payload commit over the prior review record. Its payload changes are limited to `packages/kernel/src/{coordinator,index,values}.ts` and `packages/kernel/tests/{creation,dispatch,values}.test.ts`; the prior review records are preserved in the ancestry. H5 is one administrative commit over C5. C5→H5 contains only the K1.1 007 status transcription, `implementation-05.md`, `validation-05/MANIFEST.md` and ten raw `.log` attachments. No production source, test, script, fixture, threshold or configuration changed after clean-C5 validation.

The raw evidence gap K11-R3-PROC-02 is therefore closed. The pinned logs show the claimed clean-C5 results: typecheck exit 0; full suite 2,221/331/0; conformance 1,949/283/0; Kernel 163/30/0; SDK 22/0; builder-docs 26 files / 286 links and anchors / 38 imports; architecture 362/37/0; packet inventory 163/30/0; and 20/20 declared ablations rejected. Those executions are useful evidence, but the two counterexamples below are outside the tested matrix and remain observable in H5 source.

## Findings

### K11-R2-VAL-02 — REOPENED AGAIN — P1 — canonical bytes still depend on caller-mutated ambient serializer state

**Affected:** `packages/kernel/src/values.ts`, with dependent creation/ingress identity, replay/conflict, Activation and inspection paths.  
**Criteria/sources:** K1.1-C1/C2/C3/C4/C9; `mental-model/concepts/values.md`; prior K11-R2-VAL-02.

C5 materially improves the round-4 serializer boundary: it builds null-prototype object clones, shadows array `toJSON`/`map`, captures several primordials at module load, refuses outside-length array names, hardens hostile-error formatting and returns early on oversized arrays.

The actual unmodified JCS call is still not isolated from state a caller can mutate during the capture pass. `values.ts` captures `Object.keys` for its own `toSerializationSafe` traversal, but exact `canonicalize@3.0.0` subsequently executes the live global `Object.keys(object)` inside the dependency. A caller-owned Proxy can perform a coherent ordinary read — descriptor `a=1`, ordinary read `a=1` — while setting `Object.keys = () => []` as that read's side effect. Capture accepts `{a:1}`. C5's primordial-backed safe clone still contains `a:1`. The subsequent exact JCS call sees the caller-mutated live `Object.keys`, enumerates no keys and returns `{}`. The retained frozen value remains `{a:1}`.

An isolated probe reproducing the relevant ordering produced:

```text
{"descriptor":1,"read":1,"snapshot":1,"clone":1,"canonical":"{}"}
```

That reopens the exact invariant this finding owns: canonical identity can describe a different logical value from the value retained, dispatched and inspected. It is not a pre-module-load pollution case. The mutation happens **during the boundary observation that C5 intentionally performs on caller-owned state**, before the serializer runs. The report itself treats capture-time global mutation as an in-scope threat when justifying captured primordials; the closure stops before the dependency's own live statics.

There is a second consequence in the same boundary. If the same capture-time side effect makes `Object.keys` throw (or otherwise causes the JCS invocation to throw), `encode` has no refusal boundary around `canonicalizeJcs(...)`; the exception escapes instead of producing an inspectable malformed/unstable boundary refusal. An isolated exact-order probe produced `escaped: keys boom`.

This should not be fixed only by special-casing `Object.keys`. Other implementation/dependency observables in this path must be considered as a family: any caller-triggerable ambient/runtime state consulted after the accepted snapshot must not be able to change the canonical bytes or turn accepted boundary processing into an uncaught exception.

**Required outcome:** reconstruct capture → immutable snapshot → serialization-safe representation → exact unmodified JCS invocation as one semantic subsystem. For an accepted root, canonical bytes must be a function only of the accepted immutable logical value despite side effects caused while observing caller state; downstream serializer/intrinsic failure caused by that boundary interaction must be safely refused rather than escaping. Add distinguishing regressions at least for capture-time `Object.keys` replacement that (a) returns `[]` and (b) throws, and re-audit creation, ingress, replay/conflict, Activation/redelivery and inspection after the correction. Preserve the approved unmodified JCS dependency; the finding does not authorize modifying it or substituting an almost-equivalent serializer.

### K11-R4-DISPATCH-01 — P1 — `DispatchOptions.bound` is validated from two observations and used from a third

**Affected:** `ExecutionCoordinator.dispatch` in `packages/kernel/src/coordinator.ts`; `packages/kernel/tests/dispatch.test.ts`.  
**Criterion/sources:** K1.1-C4; `mental-model/concepts/core.md` batch/reservation; `mental-model/mechanisms/execution-cycle.md` before-sending atomic decision.

`dispatch` currently evaluates caller-owned `options.bound` multiple times:

1. `Number.isInteger(options.bound)`;
2. `options.bound < 1`;
3. `slice(0, options.bound)`.

A getter returning `1`, then `1`, then `0` passes both validation reads and selects an empty batch on the third. An isolated JavaScript probe of the exact expression ordering produced:

```text
{"invalid":false,"reads":3,"selected":[]}
```

In K1.1 every newly created Execution has at least its unacknowledged initial Event, so this is not merely the later architecture's legitimate empty-continuation case. The call passes the contract's `bound >= 1` validation and then opens a `RUNNING` Activation while reserving none of the queued Event prefix the accepted bound was supposed to select. The intent, receipt and state mutation are then committed around that different observation.

This is the same general caller-owned-envelope TOCTOU class C5 correctly repaired for creation scope/key/content fields, but the dispatch envelope was omitted from that reconstruction. Current dispatch tests use ordinary numeric properties and do not distinguish a shifting getter.

**Required outcome:** the dispatch bound that is validated and the bound that selects the batch must be one accepted observation. A shifting caller-owned representation must not validate under one value and commit under another. Add a distinguishing getter/Proxy regression for the `1,1,0` witness and re-audit the complete dispatch-options boundary, batch selection, intent construction, reservation and inspection together. Do not weaken the rule that a supplied bound below one is refused.

### K11-R4-PROC-01 — P1 — H5 was handed off as WAITING_FOR_REVIEW after mandatory defects were known

**Affected:** H5 `implementation-05.md`, H5 K1.1 007 status, and the external H5 handoff.  
**Source:** governing 006 WAITING_FOR_REVIEW entry and semantic-correction rules.

H5's report says "No known mandatory defect" and "Ready for independent review", and 007 records K1.1 as `WAITING_FOR_REVIEW`. The external handoff that presented H5 for this review simultaneously disclosed both material defects above as already self-found and probe-confirmed, asking the official reviewer to rule on them.

The disclosure is candid and is preferable to hiding the defects, but 006 does not permit a known mandatory defect or owned unresolved semantic case to be left for the reviewer while retaining WAITING_FOR_REVIEW. Once the implementation agent found these P1 cases, the same packet should have returned to correction before review handoff rather than asking the reviewer to decide whether known observable failures count.

**Required outcome:** on the next correction, record these self-found cases with their actual provenance, correct all mandatory in-scope defects before entering WAITING_FOR_REVIEW, and make the report/status truthful at the time of handoff. A later-discovered defect after an immutable H is not misconduct; it simply invalidates that H as review-ready and requires the normal next C/H cycle.

## Prior finding dispositions

- **K11-R3-ID-03 — CLOSED.** C5 observes scope once, validates text before authorization, reuses that value for binding/recording, and retains authorization before lookup/disclosure.
- **K11-R3-LIMIT-01 — CLOSED.** A trusted array length above 4,096 returns immediately before own-name/index traversal or length-proportional allocation; at-limit/one-over and the huge sparse case are covered.
- **K11-R3-DOC-02 — CLOSED.** `packages/kernel/src/index.ts`, package metadata and the executable guard now agree on `node:` builtins plus exact `canonicalize` only.
- **K11-R3-PROC-02 — CLOSED.** H5 contains and exposes the ten manifest-named raw logs; the reviewer could inspect them.
- **K11-R2-EVID-01 — remains CLOSED.** Receipts/refusals are frozen at their mint sites and queued disposition is frozen; retained/shared evidence remains immutable.
- **K11-R2-VAL-02 — REOPENED AGAIN** above. The round-5 `toJSON`/`map`/outside-index/formatter witnesses are corrected, but the end-to-end serializer-observable family is not closed.
- Earlier K11-R1 identity/scope/JCS/process/documentation findings remain closed on the cumulative source and ancestry inspected here.

## Per-criterion verdicts

| Criterion | Verdict | Independent rationale |
|---|---|---|
| **K1.1-C1** | **FAIL** | Atomic creation/lost-response/scoped-key mechanics remain coherent, and ID-03 is corrected. But a capture-time live-global mutation can bind creation content to canonical bytes for `{}` while retaining `{a:1}`, so a later logically different request can collide/replay under the wrong content identity. K11-R2-VAL-02. |
| **K1.1-C2** | **FAIL** | Input-ID triple, scope, capacity-before-ack and ordinary replay mechanics remain coherent, but ingress content identity has the same canonical-vs-retained mismatch. K11-R2-VAL-02. |
| **K1.1-C3** | **FAIL** | Round-5 fixes the named inherited-`toJSON`, array-name, hostile-formatter and bounded-rejection witnesses, but exact JCS still consults caller-mutated ambient statics after capture and `encode` can propagate their exception. One accepted snapshot can therefore still yield bytes for another value or an uncaught error. K11-R2-VAL-02. |
| **K1.1-C4** | **FAIL** | Intent-before-send, asynchronous delivery and reservation-not-acknowledgment remain structured, but `options.bound` is read three times and can validate as 1 then select with 0, committing a different/empty batch. The reopened value defect also reaches Activation payload identity. K11-R4-DISPATCH-01, K11-R2-VAL-02. |
| **K1.1-C5** | **PASS** | Once an exchange is validly recorded, ordinary redelivery reuses the same immutable Activation/ID/epoch/base revision/receipt/batch and does not reselect late Events. I found no independent C5 defect. |
| **K1.1-C6** | **PASS** | Boundary-specific receipts remain distinct, replay returns retained evidence, hidden/missing reads share the scoped lookup path, and receipts/refusals/dispositions are runtime-immutable at their construction sites. |
| **K1.1-C7** | **PASS** | Outcome/takeover/recovery continue to refuse as K1.2-owned and cancellation as K1.3-owned, with no accepted mutation. |
| **K1.1-C8** | **PASS** | No Agent/Workflow discriminator or legacy controller contract is carried into the target boundary; exact `canonicalize@3.0.0` remains the sole approved third-party specifier. |
| **K1.1-C9** | **FAIL** | Inspection is inert/scoped and exposes retained state, but K11-R2-VAL-02 means that retained state can still be `{a:1}` while the identity that accepted it was bound to `{}`. The contract explicitly requires inspection to expose the same logical structure identity bound. |
| **K1.1-C10** | **PASS** | Entry documentation now agrees with package/inventory/guard policy; the target remains private with in-zone + `node:` + exact `canonicalize` reach. Raw architecture evidence is present and was inspected. |

## Evidence interpretation and access limits

The committed clean-C5 evidence is materially better than H4 and supports the passing criteria and many corrected paths. In particular, 20/20 ablations demonstrate that the named historical wrong implementations are rejected. They do not cover the live-`Object.keys` serializer channel or shifting dispatch-bound witness, so green evidence cannot establish C1–C4/C9 against those independent counterexamples.

I reran no repository command and make no claim that I did. My isolated probes establish only ordinary JavaScript evaluation semantics for the two counterexamples. The source and exact upstream JCS code establish that H5 composes those semantics in the relevant order.

No source/evidence access blocker remains, and I found no normative ambiguity requiring an architecture decision.

## Owner note — repeated defect family / local-minimum risk

The implementation has made substantial real progress: evidence immutability, scope ordering, bounded oversized arrays, raw evidence and the named serializer/prototype cases are all materially improved. This is not a case of no movement.

However, **K11-R2-VAL-02 has now survived several semantic-correction rounds**. The recurring blind spot is broader than one `toJSON` witness: proof keeps stopping at the next explicitly hardened JavaScript observable instead of closing the full causal boundary between caller-executed observation and the exact serializer's runtime dependencies. K11-R4-DISPATCH-01 shows the same single-observation principle was applied to creation fields but not generalized to another caller-owned envelope.

I recommend the owner treat this as a local-minimum signal now. Either switch/escalate the implementation pass to an agent/person with a specific JavaScript object-model/runtime-observability remit, or require the next implementation to begin from a complete inventory of caller-triggerable reads and downstream ambient intrinsics rather than another named-witness patch. Round count itself is not the concern; recurrence of the same invariant family is.

## Corrective handoff

```text
Correct the same released packet K1.1 on branch codex/k1.1-create-reserve-async-dispatch.
Base 777b9955fb3a443f700b4f3d1f4f2aef1869345b; reviewed H bd2dab6d91e0af2328aa39fe74de831bffb27818; review record docs/development/work/K1.1/review-04.md.
Open findings: K11-R2-VAL-02 (reopened P1), K11-R4-DISPATCH-01 (P1), K11-R4-PROC-01 (P1). Required outcomes and counterexamples are in this record.
Owner supplemental decisions: none. Unresolved authority: none.
Apply 006 and 012: reconstruct the affected value/serializer runtime-observable boundary and the complete caller-owned dispatch-options boundary, then re-review the whole cumulative packet. Fix additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for a new clean payload C and candidate H plus complete immutable raw evidence. Preserve history; no amend/reset/squash/force, no main change, no merge and no successor release.
```

## Verdict and state

**Verdict:** `CHANGES REQUIRED` for exact H5 `bd2dab6d91e0af2328aa39fe74de831bffb27818`.  
**Packet state for transcription:** `CHANGES_REQUESTED`.  
**Architecture blocker:** none.  
**External blocker:** none.

CHANGES REQUIRED
