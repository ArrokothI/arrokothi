# K1.1 independent review — round 6 supplement 01 (candidate H7)

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-14  
**Role:** independent reviewer; I did not implement this candidate.  
**Session identifier:** not exposed to me.

## Why this is a supplement

I began an independent review of H7 from the owner's handoff while the branch still named H7 as its advertised tip. During the review, the branch advanced beyond H7: first an unrelated documentation commit (`613bad94ae0d09bd16c772139d0e945461df53da`), then a separate `review-06.md` commit (`9f2954104f92c27f2631b881712e5ba61e9114ad`). I did not use that later review record as governing evidence or as proof of any finding below. This file records this session's independently derived cumulative review so the owner-requested review is preserved without overwriting another concurrent review record.

This review binds only to H7. Neither `613bad94...`, `9f295410...`, this supplement's recording commit, nor any later branch tip is accepted or certified here.

## Candidate binding, process and access

- **Governing process base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Payload C7:** `e59bd312373ca7afacd507a73717b16dfaa0a8f0`.
- **Candidate H7:** `ae02c32ae575c70326cd7d2a91aa5c268671d92f`.
- **Branch:** `codex/k1.1-create-reserve-async-dispatch`.
- **Contract:** `docs/development/work/K1.1/contract.md`, revision 4.
- **Prior authoritative correction handoff:** `docs/development/work/K1.1/review-05.md`, recorded at `24ff6b0ef2ea47eb1a85acad604d8a3b8030c2a1`.
- **Round-7 report:** `docs/development/work/K1.1/implementation-07.md` at H7.
- **Round-7 evidence:** `docs/development/work/K1.1/validation-07/MANIFEST.md` plus its ten declared raw logs at H7.
- **Integrated prerequisite:** K1.0 corrections integrated as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`, ledger-reconciled by PR #26 / `05f48c204d1eae021b3464c206e5c11e84bb3505`.

I read the B-pinned repository instructions, mental-model and development front doors, 006, 008 and 012; the exact revision-4 contract; 007 at H7; review-05; the relevant Layer-3 values, creation, dispatch, identity, lifecycle and evidence owners; the cumulative and correction deltas; the affected production source and surrounding projection/replay paths; the round-7 report; the manifest; the raw Kernel output and distinguishing ablation log.

GitHub access supplied immutable source/files/commits, comparisons and write access. I did **not** have a usable local repository checkout for an independent npm rerun in this session. I therefore distinguish the committed clean-C7 command output as **inspected implementer evidence**, not reviewer reruns. I independently ran only two small isolated Node probes of JavaScript indexed-assignment semantics to test the mechanism underlying the new counterexamples. Those probes are not repository validation and are not counted as such.

Identity/diff checks are coherent:

- B is an ancestor/merge base of H7; the cumulative candidate preserves the prior K1.1 history.
- `24ff6b0...` → C7 is one payload commit changing exactly six files: `coordinator.ts`, `lifecycle.ts`, `values.ts`, and `creation.test.ts`, `dispatch.test.ts`, `values.test.ts`.
- C7 → H7 is one administrative commit containing only the K1.1 status transcription, `implementation-07.md`, and `validation-07/` evidence. No source, test, script, fixture, evaluator rule, threshold or configuration changes after clean-C7 validation.
- `05f48c2...` is an ancestor of H7; the prerequisite reconciliation remains in ancestry.

The report discloses that C7 was amended once while still local-only and before validation/review, to strengthen the freeze witness. That does not invalidate the C/H convention because all reported final validation ran on the final immutable C7 and the amendment did not rewrite a published/reviewed candidate.

## Independent coverage and correction reconciliation

From the contract and canonical owners, I challenged these interacting paths together:

1. caller observation → boundary-value capture → immutable retained structure → canonical bytes → identity;
2. accepted creation/input → atomic retention → replay/conflict → evidence;
3. caller-observable dispatch option → exact batch selection → immutable Activation → redelivery;
4. retained state/evidence → minimum inspection and visible listing;
5. hidden/missing authorization/refusal behavior;
6. unsupported later-packet surfaces and target-zone structural boundary;
7. correction closure for review-05's two P1s, including whether the replacement mechanism closes the semantic class rather than only the named witnesses.

H7 **does correct the exact H6 witnesses**. `Map` lookup/storage, `Object.freeze`, relevant Promise operations and Map listing now resolve through load-time references; the plain-object comparison now uses a captured genuine `Object.prototype`; descriptor data-ness uses a primordial own-property check. The S1/S2/V3 ablations are meaningful evidence that the new tests distinguish those exact weaker forms.

The remaining problem is the correction's new completeness assumption: the report treats ordinary array index assignment, and captured `Array.prototype.push`, as ambient-independent primitives. In JavaScript they are not. Ordinary assignment uses the object's `[[Set]]` semantics and can invoke an inherited indexed accessor; `Array.prototype.push` ultimately performs indexed writes subject to the same prototype-chain behavior. A caller-observation side effect can therefore install an indexed accessor on the genuine `Array.prototype` and steer the new scratch/commit/projection mechanism without replacing any method named by the static check.

I checked the underlying language behavior independently in isolation. With a configurable inherited setter at `Array.prototype["0"]`, `const a=[]; a[a.length]="wanted"` invokes the setter, creates no own element and leaves `a.length` at zero. With a getter as well, later reading the missing slot returns the inherited value. A captured `Array.prototype.push` applied through captured `Reflect.apply` likewise invokes an inherited indexed setter. These language probes establish the mechanism; the findings below apply it to the exact H7 source ordering.

## Findings

### K11-R6-STATE-02 — P1 — post-observation accumulation still depends on caller-mutable inherited indexed accessors

**Affected:** `packages/kernel/src/coordinator.ts` (array accumulation/projection helpers, ingress commit, dispatch selection/construction, evidence/refusal/delivery accumulation, listing and inspection).  
**Criteria:** K1.1-C2, C4, C6, C9.  
**Governing sources:** creation, execution-cycle, identity/evidence, contract revision 4.

H7 removes live `.push/.map/.filter/...` calls from the coordinator, but replaces many of them with ordinary index assignment such as:

- `record.mailbox[record.mailbox.length] = entry`;
- `record.receipts[record.receipts.length] = receipt`;
- `selected[selected.length] = entry`;
- `carriedEvents[carriedEvents.length] = ...` and `batchIds[...] = ...`;
- refusal/delivery arrays, `visibleExecutions`, and inspection/view arrays;
- `copyArray`, `copyMapped`, `appendIssue` and `appendIssues`.

Those writes are not independent of mutable ambient prototype state. A caller-controlled observation earlier in the same boundary can install an inherited numeric setter on `Array.prototype`; an assignment into a hole whose index matches that setter invokes it rather than necessarily creating the Kernel-owned array element.

A direct dispatch counterexample needs no boundary-value payload at all. Given an Execution with a queued Event, supply a caller-owned `options.bound` getter that installs a setter for `Array.prototype["0"]` which ignores the write and then returns `1`. H7 correctly reads and validates `bound` once. It then creates `selected = []` and executes `selected[selected.length] = entry`. The inherited setter receives the write, no own element need be created, and `selected.length` remains zero. H7 can therefore accept a dispatch intent with an empty batch even though the validated bound is one and a queued Event was available. That violates C4's exact reserved-batch decision; it is independent of and later than the already-corrected three-read bound defect.

The same mechanism reaches accepted input/evidence and projection. For example, after an accepted payload observation installs an indexed setter corresponding to the next mailbox/receipt slot, H7 performs ordinary indexed writes before returning success. Dropped/substituted mailbox or receipt writes can make the returned accepted result disagree with retained/projection state even though the primordial `Map.set` path is correct. Persistent pollution can likewise steer `visibleExecutions` and freshly built inspection arrays.

**Required outcome:** close the semantic operation rather than another list of method names. From caller observation through atomic commit and every replay/redelivery/inspection projection, construction of Kernel-owned array-backed facts must not be droppable, substitutable or executable through caller-installed inherited indexed accessors. Re-audit all scratch, retained and projected arrays under actual JavaScript `[[Set]]`/prototype semantics; add distinguishing regressions for dispatch selection and at least one retained/projection path. The examples above are counterexamples, not a required patch design.

### K11-R6-VAL-04 — P1 — array capture can retain/canonicalize a value different from the one coherent caller observation

**Affected:** `packages/kernel/src/values.ts`, especially `captureArray`; also the equivalent scratch-write assumption in serialization helpers/issue bookkeeping requires re-audit.  
**Criteria:** K1.1-C3, with dependent C1/C2 acceptance.  
**Governing source:** `mental-model/concepts/values.md` and contract C3's single-observation/same-retained-structure rule.

H7's capture pass verifies a genuine primordial array prototype and coherently checks each caller element's own descriptor against its ordinary read. But after observing an accepted element it stores the recursive result into a holey scratch array with ordinary assignment:

```ts
const captured: Captured[] = new PrimordialArray<Captured>(length);
...
captured[index] = item;
```

It later reads that slot and defines the final frozen snapshot from it:

```ts
PrimordialDefineProperty(out, `${index}`, {
  value: captured[index] as BoundaryValue,
  ...
});
```

A distinguishing counterexample is a genuine-array Proxy of length 21 whose own index `20` is the stable value `20`. Its `getPrototypeOf` trap installs a configurable inherited setter/getter at `Array.prototype["20"]` (setter discards writes, getter returns `999`) and returns the genuine primordial array prototype. The plain-array check therefore legitimately sees the allowed prototype. The caller element's own descriptor and ordinary read still both yield `20`, so the caller representation is coherent. But H7's holey `captured[20] = 20` is intercepted by the inherited setter and creates no own slot; the later `captured[20]` read resolves to inherited `999`, which H7 seals into the final snapshot and canonicalizes.

The boundary can therefore accept canonical bytes/retained structure for `999` after its one coherent observation of the caller yielded `20`. That is exactly what C3 forbids: validation, canonical identity, retention, Activation and inspection must derive from the one observed value; an unsupported/unstable representation is refused rather than normalized into a different accepted value.

The same assumption appears elsewhere in `values.ts`: `appendItem` invokes a load-time `Array.prototype.push`, whose internal indexed write can still reach an inherited numeric accessor, and the serialization-safe array map builds `result[innerIndex] = ...`. Those sites are part of the required re-audit; this finding does not assert every one independently produces the same observable failure.

**Required outcome:** reconstruct the value subsystem around the actual language semantics of every internal scratch/write/read between caller observation and the immutable snapshot/canonical bytes. Caller-installed inherited indexed accessors must not alter, drop or substitute captured data or validation bookkeeping. Add a distinguishing regression for a coherent caller array whose prototype observation installs an indexed accessor affecting an internal scratch slot, and re-audit capture, issue/open bookkeeping and serialization-safe array construction. Do not special-case index 20 or this exact accessor spelling.

## Prior finding dispositions

- **K11-R5-STATE-01:** the exact H6 `Map.prototype.set` commit-drop and live-`Object.freeze` mutable-exchange witnesses are **corrected** in H7. The attempted broader class closure is incomplete because ordinary indexed writes remain ambient-prototype-sensitive; K11-R6-STATE-02 is the new concrete defect.
- **K11-R5-VAL-03:** **closed** on its exact obligation. `captureObject` now compares against `PrimordialObjectPrototype`, and the descriptor-own-value re-audit is a valid strengthening. V3 distinguishes the old live comparison.
- **K11-R4-DISP-01:** remains **closed**. The new dispatch counterexample occurs after the one correct `bound` observation, in batch accumulation.
- **K11-R4-PROC-01:** remains **closed**. Round 7 records review readiness after final-C7 validation; I found no evidence that the implementer already knew these new indexed-accessor defects at H7.
- Earlier ID, scope, JCS, limit, documentation, evidence-immutability and raw-evidence findings remain closed on their specific obligations. The new findings do not rely on weakening those prior dispositions.
- **K11-R2-VAL-02 defect family:** the named serializer/capture witnesses fixed in prior rounds remain fixed, but K11-R6-VAL-04 shows the broader single-observation-to-retained-value family is still not semantically closed.

There is no unresolved architecture choice here. The existing contract/canonical sources already decide the required outcomes. There is also no external-evidence blocker: the round-7 raw validation artifacts are present and inspectable.

## Per-criterion verdict

| Criterion | Result | Independent rationale |
|---|---|---|
| **K1.1-C1** | **FAIL** | Creation's scoped-key/replay logic remains coherent, but C3 governs the initial input/authority values it accepts; K11-R6-VAL-04 permits an array root to retain/canonicalize a value different from the coherent caller observation. |
| **K1.1-C2** | **FAIL** | Input triple/replay/conflict ordering is intact, but accepted content is exposed to VAL-04 and ordinary indexed writes can drop/diverge mailbox/receipt retention after observation (STATE-02). |
| **K1.1-C3** | **FAIL** | `captureArray`'s holey scratch write/read is steerable by an inherited numeric accessor, so retained/canonical structure need not equal the one coherent caller observation. |
| **K1.1-C4** | **FAIL** | The single-observation bound correction is valid, but an accessor installed by that getter can intercept `selected[0] = entry`, allowing the accepted reserved batch to differ from the exact available prefix under the validated bound. |
| **K1.1-C5** | **PASS** | Once H7 has actually formed and retained an Activation, primordial freezing and ordinary redelivery preserve that same exchange; I found no separate redelivery mutation/reselection defect. The C4 formation defect does not by itself show a later redelivery changes an already-formed exchange. |
| **K1.1-C6** | **FAIL** | Receipt/refusal objects remain immutable at their mints, but receipt/refusal retention and projection arrays still use inherited-accessor-sensitive indexed writes; retained evidence can therefore diverge from a returned accepted/refused fact. |
| **K1.1-C7** | **PASS** | Later-packet surfaces remain explicit refusals and do not implement K1.2/K1.3 behavior. |
| **K1.1-C8** | **PASS** | The target boundary still carries no Agent/Workflow discriminator; approved `canonicalize@3.0.0` remains the sole third-party reach. |
| **K1.1-C9** | **FAIL** | Inspection/list construction uses the same vulnerable ordinary indexed accumulation, so a persistently polluted prototype can make a fresh view/list misdescribe retained truth. |
| **K1.1-C10** | **PASS** | No round-7 change weakens the private target-zone/import/export/inventory boundary; structural evidence remains consistent with the tree. |

## Evidence interpretation

The H7 manifest and raw logs are internally coherent and materially available. They record clean-C7 runs of typecheck; `npm test` 2,234 tests / 332 suites / 0 failures; conformance 1,949 / 283 / 0; Kernel 176 / 31 / 0; SDK 22 / 0; builder-docs 26 files / 286 links+anchors / 38 imports; architecture 362 / 37 / 0; packet inventory 176 / 31 / 0. `test:evals` was not run because this packet changes no Agent/model path; that exclusion is consistent with the declared scope.

The 9/9 ablations are useful **mechanical** evidence: S1, S2 and V3 prove the four new round-7 tests reject the exact H6 forms they target, and the retained N/P ablations re-prove representative earlier guards. They do not test inherited numeric accessors or prove that “index assignment” is an ambient-independent primitive. The report's static zero-live-method check is therefore weaker than its semantic closure claim.

I did not independently rerun those repository commands. My isolated Node probes only established the JavaScript mechanism used by the new counterexamples; semantic applicability comes from the pinned H7 source inspection above.

No E1, persistence, native Driver fidelity, packaging or successor-release result is claimed or accepted here.

## Compact correction handoff

Correct the same released packet **K1.1** on `codex/k1.1-create-reserve-async-dispatch`.

Base `777b9955fb3a443f700b4f3d1f4f2aef1869345b`; reviewed H `ae02c32ae575c70326cd7d2a91aa5c268671d92f`; this review record `docs/development/work/K1.1/review-06-supplement-01.md` (recording commit supplied externally). Open findings **K11-R6-STATE-02** and **K11-R6-VAL-04**; required outcomes and counterexamples are in this record. Owner supplemental decisions: none. Unresolved authority: none.

Apply 006 and 012: reconstruct the affected semantic subsystem under actual JavaScript object/prototype/write semantics, close its dependencies, then re-review the whole cumulative packet. Preserve the exact H7 fixes and all earlier closed obligations. Fix additional in-scope defects with separate provenance. Use 008 for the next report and 006 for new C/H plus immutable evidence/push handoff. No successor release.

### Coding-agent correction prompt

Read `docs/development/work/K1.1/review-06-supplement-01.md` in full first. It is this review session's authoritative H7 correction handoff. A concurrent `review-06.md` also exists later in branch history; do not infer acceptance from that file or from any post-H7 documentation commit. The reviewed candidate here is exactly H7 `ae02c32ae575c70326cd7d2a91aa5c268671d92f`.

Correct K11-R6-STATE-02 and K11-R6-VAL-04 in the same released K1.1 packet. Do not release or begin K1.2 and do not weaken contract revision 4 or any previously closed finding.

The governing failure is not “one more unsafe Array method.” H7's reconstruction assumes that index loops plus ordinary `array[index] = value`, and a captured `Array.prototype.push`, are independent of caller-mutated ambient state. They are not: JavaScript indexed writes can consult inherited numeric accessors through `[[Set]]`, and a captured `push` ultimately performs indexed writes as well.

Reconstruct the complete caller-observation → value capture/scratch state → canonical bytes/identity → atomic creation/input retention → dispatch selection/intent → evidence → replay/redelivery → inspection path under that language behavior. At minimum, distinguish these counterexamples:

1. A `dispatch(..., options)` bound getter installs an inherited `Array.prototype["0"]` setter that drops the write and returns `1`. Correct behavior must still reserve the exact available prefix under bound 1; the Kernel must not accept an empty/different batch because its scratch selection write was intercepted.
2. A coherent genuine-array boundary value installs an inherited indexed setter/getter during prototype observation; its own descriptor/read yields one value, while an internal holey scratch assignment/read would otherwise substitute a different inherited value. Accepted retained structure and canonical bytes must still be exactly the one observed caller value, or the representation must be refused under the governing value rules.
3. Exercise at least one accepted-state/evidence or inspection accumulation path so closure is not inferred solely from dispatch and direct canonicalization.

Treat those as distinguishing examples, not a blacklist or required implementation shape. Audit scratch arrays, issue/open bookkeeping, retained mailbox/receipt/refusal/delivery arrays, serialization-safe array construction and all view/list projections for inherited indexed accessor effects, including both writes and later reads. Preserve H7's valid primordial Map/freeze/Promise corrections, primordial plain-object prototype decision, descriptor own-value checks, exact JCS substrate/environment, single bound observation, prior evidence mint immutability, identity/scope/limit fixes and structural guards.

Run the complete clean-C validation profile again, add distinguishing ablations for the new semantic mechanisms, report reruns versus inspected history, and do not claim `WAITING_FOR_REVIEW` while a mandatory defect is known. Produce a new immutable C/H under 006/008. No successor release.

**Verdict:** H7 does not satisfy all mandatory K1.1 criteria. The required behavior is already settled; this is an implementation defect, not an architecture blocker.

CHANGES REQUIRED
