# K1.1 independent review — round 5 (candidate H6)

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-14  
**Role:** independent reviewer; I did not implement this candidate.  
**Session identifier:** not exposed to me.

## Candidate binding and access

This review binds only to:

- **Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
- **Round-6 payload C6:** `b3d0d59f18f6c2b1d0a49746428123d84dd80df2`
- **Round-6 candidate H6:** `417798a3e540acce78d73c7a0fdb92ebfd69faf8`
- **Branch:** `codex/k1.1-create-reserve-async-dispatch`
- **Contract:** `docs/development/work/K1.1/contract.md`, revision 4
- **Previous review handoff:** `docs/development/work/K1.1/review-04.md`
- **Prerequisite implementation integration:** PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`
- **Integrated prerequisite/status reconciliation:** PR #26 / `05f48c204d1eae021b3464c206e5c11e84bb3505`

The cumulative B→H6 comparison has B as the merge base and H6 23 commits ahead. C6→H6 is exactly one administrative commit containing only the K1.1 status transcription, `implementation-06.md`, and `validation-06/` evidence; no production source, test, script, fixture, threshold or configuration changed after clean-C6 validation.

During this review the remote branch advanced to `d1f85e55d4d90173c1316fc6dbabca3c2b0f931f` (`all-doc`), whose parent is H6. That later administrative/doc commit is **not** this review's candidate and is not accepted or certified here. Acceptance, if it ever occurs, remains bound only to an exact reviewed H.

I had immutable GitHub source/ref/commit access and inspected the governing baseline, cumulative source, correction delta, contract/status/report records, prior findings, relevant tests, the exact H6 validation manifest/ablations and the affected Kernel source.

I did **not** independently rerun repository npm commands: this session had no usable repository checkout with outbound GitHub access. I independently ran only small isolated Node probes for ordinary JavaScript semantics behind the two new counterexamples below. Those probes are not repository tests or validation evidence. The committed validation-06 outputs are therefore treated as inspected implementer runs on clean C6, not reviewer reruns.

## Governing baseline and independent coverage

I read the B-pinned repository instructions, mental-model front door, development front door, 006, 008 and 012 before using `implementation-06.md` as an explanation. I then checked the K1.1 contract and its canonical owners for creation/input, identity, values, dispatch, lifecycle/progress and evidence.

My independently derived interacting coverage was:

- caller-owned value/envelope observation → validation/canonical identity → atomic creation/input storage → replay/conflict;
- immutable retained values/evidence → Activation → redelivery → inspection;
- caller-triggered side effects → every downstream observable consulted before commit;
- batch-bound observation → reservation → dispatch intent → Driver;
- hidden/missing authorization paths;
- unsupported later-packet surfaces;
- target-zone dependency policy/import surface;
- B/C/H ancestry, prerequisite integration, release hold and evidence availability.

The H5→C6 correction delta is correctly bounded to `review-04.md`, four source files (`values`, `coordinator`, `identity`, `refusal`) and four tests. The round-6 evidence is materially present: clean-C6 control 172/0 and all eight declared ablations are recorded as rejected.

The named H5 defects are materially corrected. The JCS call now runs behind the safe clone plus a 19-slot restored execution environment and an exception-to-refusal boundary. Dispatch `bound` is observed once, validated from that observation and used from that same observation for batch selection. Those are real corrections and the ablations distinguish them.

## Findings

### K11-R5-STATE-01 — P1 — caller-observation side effects still escape into the Kernel commit/projection path

**Affected:** `packages/kernel/src/coordinator.ts`, with the accepted-value path in `values.ts`.  
**Criteria:** K1.1-C1, C2, C4, C5, C6 and C9.

Round 6 reconstructs the serializer execution environment, but semantic-correction closure stops at canonical bytes. An accepted caller value can still mutate ambient JavaScript state during the capture pass, and the coordinator subsequently uses live mutable built-ins and prototype methods to commit or expose accepted state.

A concrete creation counterexample is `Map.prototype.set`. A coherent Proxy member can have descriptor value `1` and ordinary-read value `1`, so it satisfies H6's one-value agreement, while that ordinary read replaces `Map.prototype.set` with a no-op. `canonicalize` then succeeds with the correct logical value and canonical bytes. `Map` is not a serializer dependency slot and therefore is not restored by the JCS sandbox. After validation, `createExecution` performs live calls to `this.#executions.set(...)` and `this.#byCreationKey.set(...)`.

I independently checked the underlying JavaScript semantics in isolation:

```text
descriptor = 1
ordinary read = 1
Map.prototype.set replaced with no-op
m.set("x", 1)
m.has("x") = false
```

Applied to the H6 source ordering, creation can return an accepted Execution ID and creation receipt while the Execution/key binding was never retained. That violates creation's atomic accepted decision, lost-response handling and replay binding.

The defect is broader than `Map.prototype.set`. H6 still performs post-capture live `mailbox.push`, `receipts.push`, `selected.map`, `Object.freeze`, `new Set`, `map/filter`, and related operations. A second concrete path is an accepted input whose coherent read replaces live `Object.freeze`. The serializer does not need or restore `Object.freeze`; a later `dispatch` constructs its Activation and Activation Events with live `Object.freeze`. The exchange handed to the Driver can therefore be mutable, and a Driver mutation can reappear on ordinary redelivery under the same Activation ID. That violates C4's immutable dispatch intent and C5's preserved exchange.

This also invalidates the report/handoff residual claim that persistent cross-call coordinator pollution outside the audited serializer path cannot affect identity/accepted truth. It need not alter JCS bytes to violate Kernel identity/evidence semantics: it can change whether the accepted fact is retained, whether a returned receipt has a retained decision behind it, whether an Event is actually queued, or whether an Activation remains immutable.

**Required outcome:** reconstruct the whole caller-observation → canonicalization → atomic state mutation → replay/redelivery → inspection chain. Once caller code has run during boundary observation, no mutable ambient operation subsequently consulted by an acceptance/dispatch/inspection invariant may allow that side effect to change the accepted observable result. Treat `Map.prototype.set` and `Object.freeze` as distinguishing examples, not an exhaustive method blacklist. Re-audit all producers/consumers and add tests/ablations that prove the class is closed.

### K11-R5-VAL-03 — P1 — plain-object validation itself still consults caller-mutated ambient `Object.prototype`

**Affected:** `packages/kernel/src/values.ts`, `captureObject`.  
**Criterion:** K1.1-C3, with dependent C1/C2/C4/C9 projections.

The round-6 adapter captures `PrimordialGetPrototypeOf`, but the acceptance comparison is still logically:

```ts
const prototype = PrimordialGetPrototypeOf(container);
if (prototype !== Object.prototype && prototype !== null) ...
```

The left side may invoke a caller-controlled Proxy `getPrototypeOf` trap. The right side then reads the **live** global `Object.prototype`, not the module-load primordial object prototype.

I independently checked this JavaScript ordering: a `getPrototypeOf` trap can replace `globalThis.Object` with another constructor and return that constructor's prototype. The result then compares equal to live `Object.prototype` while being unequal to the module-load `Object.prototype`.

Therefore a caller-controlled representation can make a non-plain prototype pass the plain-object check. H6 then retains a snapshot created with that prototype while its serialization-safe clone deliberately removes the prototype before JCS. The K1.1 contract requires non-plain objects to be refused rather than normalized into an acceptable representation.

This is another manifestation of the same correction-family boundary: the implementation audited mutable ambient reads around the JCS dependency but missed a live ambient read inside the acceptance pass itself.

**Required outcome:** the definition of an acceptable plain object must not be steerable by a side effect triggered while asking the candidate object what its prototype is. Add a distinguishing regression where the prototype observation mutates the live global used by the subsequent comparison, and re-audit remaining capture-time ambient reads rather than patching only this expression.

## Prior finding dispositions

- **K11-R4-DISP-01 — CLOSED.** H6 observes the dispatch bound once, validates/reports/selects from that one observation, uses the load-time integer predicate and refuses a non-object envelope. N3 distinguishes the H5 three-read implementation.
- **K11-R4-PROC-01 — CLOSED.** `implementation-06.md` records the self-found provenance and claims review readiness only after correction and clean-C6 validation.
- **K11-R3-ID-03 — remains CLOSED.** Scope is observed once, validated as text before authorization and reused for binding.
- **K11-R3-LIMIT-01 — remains CLOSED.** Over-limit sparse arrays refuse before length-proportional allocation/traversal; the retained ablation demonstrates the weaker form crashes/aborts.
- **K11-R3-DOC-02 — remains CLOSED.** Export/package/guard documentation still agrees.
- **K11-R3-PROC-02 — remains CLOSED.** H6 contains the raw validation outputs named by its manifest.
- **K11-R2-EVID-01 — remains CLOSED on its original invariant.** Receipt/refusal mint sites are primordial-frozen. K11-R5-STATE-01 is different: it shows a returned immutable receipt can lack the retained accepted decision it purports to evidence because the commit path itself is still ambient-mutable.
- **K11-R1-VAL-01 — remains CLOSED.** Ordinary-read/descriptor disagreement is rejected.
- **K11-R1-ID-01, K11-R1-SCOPE-01, K11-R1-JCS-01, K11-R1-PROC-01, K11-R1-DOC-01, K11-R3-ID-02 — remain CLOSED** on their original obligations.
- **K11-R2-VAL-02 — the named H5 serializer-environment witnesses are corrected, but the broader defect family is not semantically closed.** K11-R5-STATE-01 and K11-R5-VAL-03 are new concrete manifestations of the same underlying trust-boundary problem: caller-executed observation can mutate ambient state that remains semantically relevant after the layer currently being audited.

No raw-evidence external blocker remains. There is also no unresolved architecture decision: the required semantics are settled by the existing contract and canonical sources.

## Per-criterion verdicts

| Criterion | Verdict | Independent rationale |
|---|---|---|
| **K1.1-C1** | **FAIL** | Scoped key/content logic is otherwise coherent, but an accepted value can alter live `Map.prototype.set` before the creation commit, allowing success/receipt without retained Execution/key state. K11-R5-STATE-01. |
| **K1.1-C2** | **FAIL** | Input triple/replay/capacity ordering remains coherent, but the same post-observation ambient channel reaches `byInputId.set`, mailbox/receipt mutation and therefore atomic input retention/replay. |
| **K1.1-C3** | **FAIL** | The JCS execution-environment correction is real, but `captureObject`'s live `Object.prototype` comparison lets the caller steer what counts as a plain object during prototype observation. K11-R5-VAL-03. |
| **K1.1-C4** | **FAIL** | DISPATCH-01 is corrected, but accepted caller-side pollution can reach live `Object.freeze`/array operations used to construct the immutable dispatch intent and Activation. |
| **K1.1-C5** | **FAIL** | Redelivery reuses the same exchange structurally, but that exchange need not actually be immutable if an earlier accepted boundary changed live `Object.freeze`; Driver mutation can then alter what is redelivered under the same Activation ID. |
| **K1.1-C6** | **FAIL** | Minted receipts/refusals are immutable, but C6 requires retained evidence. The create counterexample can return a receipt while the accepted decision it evidences was not retained. |
| **K1.1-C7** | **PASS** | K1.2/K1.3-owned surfaces still explicitly refuse without implementing their semantics. |
| **K1.1-C8** | **PASS** | No Agent/Workflow discriminator is carried into the target boundary; exact approved `canonicalize@3.0.0` remains the sole third-party reach. |
| **K1.1-C9** | **FAIL** | Ordinary inspection is scoped/read-only, but the state it is supposed to inspect can fail to be atomically retained; inspection construction also still depends on live mutable collection/prototype operations after caller-triggered pollution. |
| **K1.1-C10** | **PASS** | The private target-zone/import/export/inventory boundary remains consistent; no round-6 structural-policy regression was found. |

## Evidence interpretation and access limits

I inspected rather than reran the clean-C6 validation record. The manifest records: typecheck clean; full suite 2,230 tests / 332 suites / 0 failures; conformance 1,949 / 283 / 0; Kernel 172 / 31 / 0; SDK 22 / 0; builder-docs 26 files / 286 links+anchors / 38 imports; architecture 362 / 37 / 0; packet inventory 172 / 31 / 0. `test:evals` was appropriately excluded because K1.1 changes no Agent/model behavior.

The 8/8 ablations are useful mechanical evidence. They establish that the tests reject the named weaker implementations. They cannot establish semantic completeness against a counterexample outside their matrix, and neither the `Map.prototype.set` commit-path witness nor the capture-time live-`Object.prototype` witness is covered there.

The prerequisite ancestry is intact and no E1, successor-release or K1-closure claim is accepted here.

## Compact correction handoff

Correct the same released packet **K1.1** on `codex/k1.1-create-reserve-async-dispatch`.

Base B `777b9955fb3a443f700b4f3d1f4f2aef1869345b`; reviewed H6 `417798a3e540acce78d73c7a0fdb92ebfd69faf8`. Open findings are **K11-R5-STATE-01** and **K11-R5-VAL-03**. Their required outcomes and counterexamples are above. Preserve all previously closed findings and the actual H6 corrections; re-review the whole cumulative packet after correcting the affected subsystem. The branch advanced beyond H6 before this review record was committed; do not treat that later administrative/doc commit as this review's accepted candidate. Apply 008 for the next C/H report/evidence handoff. Do not release K1.2.

### Coding-agent correction prompt

Read **`docs/development/work/K1.1/review-05.md` in full first**. It is the authoritative independent-review handoff for H6 and owns the open findings **K11-R5-STATE-01** and **K11-R5-VAL-03**. Correct the same released K1.1 packet; do not release or begin K1.2, and do not weaken the contract or previously closed findings.

Reconstruct the complete semantic chain rather than patching named JavaScript methods:

`caller-owned observation → accepted immutable value → canonical bytes → identity → atomic creation/input/dispatch mutation → retained evidence → Activation/redelivery → inspection`.

For K11-R5-STATE-01, an accepted caller value may perform a side effect during the Kernel's required observation. H6 isolates the exact JCS invocation, but mutable ambient operations used after canonicalization remain semantically relevant. Use at least these distinguishing examples while treating them as representatives of the class, not a method blacklist:

1. During a coherent accepted member read, replace `Map.prototype.set` with a no-op. The request must never return successful creation/receipt unless the complete creation decision is actually retained and replayable.
2. During a coherent accepted input read, replace live `Object.freeze`. A later dispatch must still produce an actually immutable Activation/Event exchange; Driver mutation must not alter redelivery or inspection under the same Activation ID.

Audit every caller-triggerable ambient/runtime read from the first caller observation until the atomic decision is completely recorded, and the operations needed to preserve/project that decision on replay, redelivery and inspection. Close the class rather than enumerating `Map.set`, `push`, `map`, `filter`, `Set`, `Object.freeze`, etc. individually.

For K11-R5-VAL-03, `captureObject` currently performs a primordial `getPrototypeOf` observation but compares the result with live `Object.prototype`. A `getPrototypeOf` trap can mutate `globalThis.Object` and return the replacement constructor's prototype, causing a non-primordial/non-null prototype to pass as plain. Make the plain-object acceptance decision independent of such side effects, add a distinguishing regression for this ordering, and re-audit equivalent live ambient reads in the capture path.

Preserve the valid H6 corrections: exact unmodified `canonicalize@3.0.0`, safe serialization clone, restored serializer execution environment, encode-failure containment, primordial evidence minting, identity-packing correction, single-observation dispatch bound, bounded over-limit rejection, scope ordering, and all prior closed finding outcomes.

Apply 006/012 semantic-correction closure. Derive the invariant first; trace producers, consumers, mutation points, replay paths, refusals and projections; add distinguishing positive/negative tests and useful ablations; then rerun the whole K1.1 validation plan on a clean payload commit. Report actual residual assumptions and do not claim `WAITING_FOR_REVIEW` while any mandatory in-scope defect is known.

Use 008 for the next implementation report and provide new exact C/H identities plus immutable raw evidence. Do not prescribe or claim a successor release.

## Owner note — repeated defect family / local-minimum risk

The implementation has made substantial real progress: H6 genuinely fixes the H5 live-JCS-environment witness, contains serializer failures, adds discriminating ablations and fixes the dispatch-bound observation defect.

However, **the K11-R2-VAL-02 defect family has survived enough correction rounds that there is now a local-minimum risk**. The recurring mistake is the boundary chosen for the audit: earlier rounds stopped at caller object → snapshot, then snapshot → clone, then clone → JCS environment; H6 now stops at JCS bytes, while caller-triggered ambient state still flows into following Kernel commit/projection operations. The implementation agent is improving, not stationary, but it is repeatedly proving one layer rather than closing the complete causal subsystem. Switching or escalating the implementation agent would be reasonable now, especially to get an independent reconstruction of the post-observation trust boundary rather than another method-by-method hardening pass.

CHANGES REQUIRED
