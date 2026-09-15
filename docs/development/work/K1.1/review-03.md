# K1.1 independent review — round 3 (candidate round 4)

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-14  
**Role:** independent reviewer; I did not implement this candidate.  
**Session identifier:** not exposed to me.

## Candidate binding and access

This review binds only to:

- **Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
- **Round-4 payload C4:** `1d4e4867b748f9e0b2f4041e17ded836ebc25a75`
- **Round-4 candidate H4:** `156f13530fc01883608407948d320d12ba4821ca`
- **Branch:** `codex/k1.1-create-reserve-async-dispatch`
- **Contract:** `docs/development/work/K1.1/contract.md`, revision 4
- **Previous independent review:** `docs/development/work/K1.1/review-02.md`, record commit `3012b3c3328c49cfa15b2d4330f1bb871f53162a`
- **Prerequisite implementation integration:** PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`
- **Integrated main/status reconciliation:** PR #26 / `05f48c204d1eae021b3464c206e5c11e84bb3505`

At review time the advertised packet branch was exactly H4 and advertised `main` was exactly `05f48c204d1eae021b3464c206e5c11e84bb3505`.

I had immutable GitHub source/ref/commit access. I inspected the governing baseline, the full cumulative B→C4 changed-file interval, the round-4 correction delta from the previous review record to C4, the H4 tree and C4→H4 administrative delta, the changed production source, relevant surrounding source/tests, contract/status/report records, prior reviews, structural inventory material, the exact `canonicalize@3.0.0` implementation and the committed validation manifest.

I did **not** independently rerun the repository npm commands: this review did not have a usable repository checkout. I did independently run small isolated Node probes for the JavaScript/dependency semantics behind K11-R2-VAL-02 below. Those probes were not repository tests and are not represented as such.

The round-4 raw validation attachments are not available in H4. `docs/development/work/K1.1/validation-04/` contains only `MANIFEST.md`; attempts to read the named `.log` attachments return not found. I therefore treat the manifest's counts/digests as unverified implementer claims, not inspected raw executions. This is separately recorded as K11-R3-PROC-02.

## Governing baseline and independent coverage

I re-read B's `AGENTS.md`, `mental-model/README.md`, the development front door, 006, 008, 012 and 015, and the relevant Layer-3 owners: `values.md`, `identity.md`, `core.md`, `creation.md` and `execution-cycle.md`. Under 006, later review rounds re-check the cumulative candidate; prior closure is not immunity, and a subsystem with repeated semantic findings must be reconstructed and checked with its consumers. Missing required raw evidence is a `CHANGES REQUIRED` result with the packet recorded through the `BLOCKED_EXTERNAL` path until the evidence is available.

My independently derived interacting coverage was:

- creation/input identity ↔ runtime type validation ↔ canonical logical equality ↔ immutable retained value;
- value capture ↔ third-party JCS behavior ↔ byte limit ↔ replay/conflict ↔ Driver projection ↔ inspection;
- retained receipts/refusals/dispositions ↔ direct return ↔ replay ↔ inspection;
- reservation/dispatch intent ↔ asynchronous Driver delivery ↔ ordinary redelivery;
- hidden/missing lookup work ↔ scoped inspection/listing;
- unsupported later surfaces ↔ K1.2/K1.3 ownership;
- target-zone import policy ↔ package dependency ↔ inventory/guard/current source descriptions;
- B/C/H ancestry and required raw evidence availability.

## Identity, correction-delta and evidence assessment

The branch ref is H4. C4 is one payload commit after the review-02 administrative record. C4→H4 changes only `docs/development/007-work-packets.md`, `docs/development/work/K1.1/implementation-04.md` and `docs/development/work/K1.1/validation-04/MANIFEST.md`. No production/test/config payload appears after C4.

The round-4 semantic correction is substantial rather than a one-line special case. `values.ts` now captures a structural snapshot before serialization; receipts and refusals are frozen at their unique mint sites; the shared queued disposition is frozen; request identity fields receive explicit runtime text checks; and the tests include adversarial value/evidence cases. The correction therefore follows the intended direction of review-02 and 012.

However, the value reconstruction still lets the JCS dependency observe state outside the captured own-data snapshot, and two adjacent acceptance/refusal paths remain incomplete. The missing raw evidence additionally means H4 is not a complete review-ready evidence packet under 006.

## Findings

### K11-R2-VAL-02 — REOPENED — P1 — canonical bytes can still describe a different value from the frozen retained snapshot

**Affected:** `packages/kernel/src/values.ts`; dependent creation/ingress identity, Activation and inspection paths.  
**Criteria/sources:** K1.1-C1/C2/C3/C4/C9; `mental-model/concepts/values.md`; review-02 K11-R2-VAL-02.

C4 correctly stops re-reading caller-owned members after capture, but the snapshot is not isolated from ambient prototype behavior:

- object snapshots are created with the validated prototype, ordinarily `Object.prototype`;
- array snapshots are ordinary arrays and inherit `Array.prototype`;
- `encode` passes that frozen snapshot directly to exact `canonicalize@3.0.0`.

The approved dependency checks `typeof object.toJSON === "function"` **before** its array/object serialization and calls that method if present. That lookup includes inherited prototype members. `Object.freeze(snapshot)` freezes the snapshot's own state, not its prototype chain.

A concrete counterexample requires no mismatch between descriptor and ordinary member read. A caller can supply a Proxy over `{a: 1}` whose ordinary read of `a` returns the same value `1` as its own descriptor while, as a side effect, installing `Object.prototype.toJSON = () => 42`. C4's capture accepts that member because the descriptor/read agree and creates a frozen retained snapshot `{a: 1}` inheriting `Object.prototype`. The subsequent unmodified JCS call then sees the inherited `toJSON` and returns canonical text `42`. Identity binds `42`; retained state, Activation/inspection content and the snapshot's own data remain `{a:1}`.

An isolated Node probe reproducing the exact dependency ordering produced:

```text
{ desc: 1, read: 1, snapA: 1, canon: '42', frozen: true, inheritedToJSON: 'function' }
```

This is the same invariant review-02 rejected: canonical identity and retained content can disagree. Re-canonicalizing the retained value through the same C4 pipeline is not an independent oracle here; it inherits the same `toJSON` hook and can reproduce the same wrong canonical bytes.

There is also an adjacent throwing-observation hole in the reconstructed subsystem. `capture` catches a structural observation error but formats the caught value with `describe(error)`, and `describe` itself reads `error.constructor?.name`. A hostile thrown Proxy whose `constructor` access throws causes that second error to escape the Kernel boundary instead of becoming the promised `unstable_representation` refusal. An isolated Node probe confirmed the secondary error escapes.

**Required outcome:** restore the stated one-value invariant across the **actual serializer boundary**, not only member capture. Canonicalization must be unable to derive bytes from inherited/ambient hooks or other data outside the captured logical value, while continuing to use the approved unmodified JCS implementation. Any structural observation failure must reliably produce a refusal even when the thrown value itself is hostile. Add distinguishing regressions for inherited/prototype `toJSON` (including a side effect induced during capture) and a thrown value whose inspection also throws. Re-audit creation, ingress, replay, Activation/redelivery and inspection against the corrected invariant.

### K11-R3-ID-03 — P2 — non-text `scope` is classified before the new identity-text validation can run

**Affected:** `ExecutionCoordinator.createExecution`; contract revision 4 C1.  
**Criterion/source:** K1.1-C1; `identity.md`; contract revision 4's K11-R3-ID-02 rule.

Revision 4 says every request-naming field, explicitly including the authority scope, must be text and a non-text field is refused as `malformed_value` naming that field. The new `acceptIdentityText` machinery implements that rule for scope inside `acceptCreationContent`.

But `createExecution` first executes authorization through `mayReachScope(caller, request.scope)`. For a normal caller with string scopes and `request.scope = 17 as never`, authorization returns false and `createExecution` returns `unauthorized_scope`; `acceptIdentityText` never runs. The new tests cover several non-text identity fields but leave `scope` valid in their multi-field case.

This does not recreate the earlier packing collision because the request is refused, but it contradicts the revision-4 observable contract and leaves one member of the self-found identity family outside its correction.

**Required outcome:** make the malformed-vs-unauthorized ordering for scope agree with the accepted contract without weakening authorization/non-disclosure, and add direct non-text and malformed-Unicode scope regressions.

### K11-R3-LIMIT-01 — P2 — arrays already over the 4,096-entry limit still drive work proportional to their full declared length

**Affected:** `packages/kernel/src/values.ts`, `captureArray`.  
**Criterion/source:** K1.1-C3; `values.md` fixed semantic limits.

`captureArray` correctly records `too_many_entries` when `length > 4_096`, but it then allocates a capture array of that full length and loops from zero to `length - 1`, reading a descriptor for every position. JavaScript arrays can have a declared length up to `4_294_967_295`; a sparse over-limit input can therefore force billions of iterations even though the fixed semantic limit has already decided it cannot be accepted.

The limit is supposed to bound accepted boundary values, and the rejection path must remain usable for hostile invalid input rather than turning a known over-limit root into effectively unbounded validation work.

**Required outcome:** once an array's trusted observed length is already above the fixed entry limit, reject without allocating/iterating proportional to that oversized length. Preserve exact-at-limit and one-over semantics and add a deliberately huge sparse-array regression that returns the limit refusal without traversing its declared extent.

### K11-R3-DOC-02 — P2 — the target Kernel entry module still says third-party imports are forbidden although `canonicalize` is approved and present

**Affected:** `packages/kernel/src/index.ts`.  
**Criterion/source:** K1.1-C10; 006 reference maintenance; 015 inventory/guard agreement.

The current entry-module documentation says the target zone may not import "any third-party package" and that "`node:` builtins are the only external dependency permitted." The same H4 tree's `packages/kernel/package.json` depends on exact `canonicalize@3.0.0`, and the K1.0 ownership inventory correctly records `canonicalize` as the single approved exact third-party specifier.

The executable guard/inventory policy is the corrected one; the source entry documentation states the opposite policy.

**Required outcome:** make the current target-package description agree with the measured/guarded dependency rule: in-zone modules, `node:` builtins and exact approved `canonicalize`, with no implication that arbitrary third-party reach is allowed.

### K11-R3-PROC-02 — P1 / BLOCKED_EXTERNAL — H4 does not contain or otherwise expose the raw validation attachments its manifest/report require

**Affected:** `docs/development/work/K1.1/validation-04/`, `implementation-04.md`, H4 evidence handoff.  
**Source:** governing 006/008 evidence and C/H rules.

`implementation-04.md` describes `validation-04/` as "MANIFEST plus ten declared output-only logs". The manifest names those ten logs, commands, results and SHA-256 digests. But the H4 GitHub tree contains only `validation-04/MANIFEST.md`; for example `09b-distinguishing-ablations.log` is not present, and a directory listing confirms there are no `.log` attachments in that directory.

Therefore I cannot independently inspect the claimed typecheck/full/conformance/Kernel/SDK/builder-docs/architecture outputs or the 15 ablation executions. A digest and summary do not substitute for an inaccessible raw payload under 006. I did not independently rerun those repository commands, so there is no alternate reviewer execution that could close the gap.

**Required outcome:** provide the required raw validation evidence in an immutable accessible artifact tied to the corrected clean payload, with command/environment/counts/digests as 006/008 require. Because evidence added or changed after H requires a new candidate, do not append files and continue treating H4 as review-equivalent: produce the next C/H normally after the semantic corrections and validate that clean payload. Until then H4's evidence state is `BLOCKED_EXTERNAL`.

## Prior finding dispositions

- **K11-R2-EVID-01 — CLOSED.** `mintReceipt` and `mintRefusal` freeze retained evidence at their unique construction sites, the shared queued disposition is frozen, and the exposed paths share only immutable evidence objects. I found no new mutable-evidence escape in C4.
- **K11-R2-VAL-02 — REOPENED** above with a new serializer/prototype counterexample. The descriptor-vs-read defect from review-02 itself is corrected, but the invariant is not yet closed end-to-end.
- **K11-R1-ID-01 — remains closed** for its hidden/missing application-level work distinction: missing and hidden paths both perform the full scope scan and no early-exit membership check is reintroduced.
- **K11-R1-SCOPE-01 — remains closed.** Outcome/takeover/recovery refuse as K1.2-owned and cancellation refuses as K1.3-owned.
- **K11-R1-JCS-01 — remains closed as a dependency decision.** Exact `canonicalize@3.0.0` remains the approved unmodified substrate; the reopened value defect is how C4 feeds that dependency, not a request to replace or modify it.
- **K11-R1-PROC-01 — remains closed.** The authentic K1.0 integration receipts and PR #21 implementation integration provenance remain in ancestry.
- **K11-R1-DOC-01 — remains closed.** The earlier "protocol unimplemented" support wording is repaired; K11-R3-DOC-02 is a different, later dependency-policy inconsistency.
- **K11-R3-ID-02 — substantially corrected, with K11-R3-ID-03 above as one uncovered observable ordering case.** The non-text packing collisions for creation key, kind and request key are prevented and `packIdentity` itself now refuses non-text parts.

## Per-criterion verdicts

| Criterion | Verdict | Independent rationale |
|---|---|---|
| **K1.1-C1** | **FAIL** | Core atomic/lost-response behavior remains coherent and the new non-text packing collision is mostly corrected, but canonical bytes can still disagree with retained creation content via inherited `toJSON`, and non-text `scope` returns `unauthorized_scope` before revision-4 malformed-value validation. K11-R2-VAL-02, K11-R3-ID-03. |
| **K1.1-C2** | **FAIL** | Input-ID/replay/capacity mechanics remain strong, but logical payload identity can still be bound to JCS bytes derived from inherited `toJSON` rather than the retained Event payload. K11-R2-VAL-02. |
| **K1.1-C3** | **FAIL** | The approved exact JCS dependency is still used and the one-capture reconstruction fixes review-02's descriptor/read witness, but inherited `toJSON` can still make canonical bytes describe another value; hostile thrown values can escape the refusal formatter; and oversized sparse arrays traverse their full declared length after the entry limit has already failed. K11-R2-VAL-02, K11-R3-LIMIT-01. |
| **K1.1-C4** | **FAIL** | Intent-before-send, batch reservation and asynchronous dispatch remain correctly structured, but the Activation can carry the retained snapshot while its accepted content identity was bound to different bytes through the reopened value defect. K11-R2-VAL-02. |
| **K1.1-C5** | **PASS** | Ordinary redelivery preserves the same immutable Activation/exchange, epoch, base revision, receipt and reserved batch; late Events stay outside the existing batch. No new C5 defect found. |
| **K1.1-C6** | **PASS** | Per-boundary receipts are frozen retained evidence, exact replay returns the original receipt, refusals mint no receipt, and the prior hidden/missing work correction remains present. K11-R2-EVID-01 is closed. |
| **K1.1-C7** | **PASS** | All four later surfaces refuse by their owning packet and mutate no accepted state; cancellation remains K1.3-owned. |
| **K1.1-C8** | **PASS** | No Agent/Workflow discriminator or legacy controller contract was reintroduced; the target-zone structural guard remains intact. |
| **K1.1-C9** | **FAIL** | Inspection itself is inert and returns frozen retained value/evidence, but it can expose `{a:1}` while the acceptance identity for that same retained value was bound to `42` through inherited `toJSON`. K11-R2-VAL-02. |
| **K1.1-C10** | **FAIL** | The executable guard and ownership inventory correctly allow only exact `canonicalize` beyond `node:` and remain private/no-legacy, but the current package entry module states the contradictory dependency policy. K11-R3-DOC-02. |

The unavailable raw validation attachments are an additional process/evidence blocker across the candidate; the PASS rows above are source-level semantic assessments, not a claim that the manifest's test executions were independently verified.

## Review conclusion and compact correction handoff

H4 is not accepted. The receipt/refusal immutability reconstruction is good, and the earlier JCS dependency, K1.0 provenance, hidden/missing lookup and K1.3 cancellation corrections remain in place. The remaining work is still K1.1; no architecture decision is needed.

Correct the same released packet K1.1 on `codex/k1.1-create-reserve-async-dispatch`.
Base `777b9955fb3a443f700b4f3d1f4f2aef1869345b`; reviewed H4 `156f13530fc01883608407948d320d12ba4821ca`; review record `docs/development/work/K1.1/review-03.md`.
Open findings: reopened K11-R2-VAL-02, K11-R3-ID-03, K11-R3-LIMIT-01, K11-R3-DOC-02, K11-R3-PROC-02. No owner semantic decision is required. Apply 006/012: close the value/JCS boundary as one subsystem and re-audit all C1–C10; keep the evidence-immutability correction and prior closed findings intact. Run validation on the next clean payload and include accessible raw logs in the next H. Do not merge K1.1 or release K1.2.

**Exact verdict/status transcription:** `CHANGES REQUIRED`. For exact H4, governing 006's missing-required-evidence rule also requires the packet evidence state to use `BLOCKED_EXTERNAL` until accessible raw evidence is supplied; the semantic/code findings independently require a new corrected C/H before another review.

CHANGES REQUIRED