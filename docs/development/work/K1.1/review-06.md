# K1.1 independent review — round 6 (candidate H7)

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-14  
**Role:** independent reviewer; I did not implement this candidate.  
**Session identifier:** not exposed to me.

## Candidate binding and access

This review binds only to:

- **Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
- **Round-7 payload C7:** `e59bd312373ca7afacd507a73717b16dfaa0a8f0`
- **Round-7 candidate H7:** `ae02c32ae575c70326cd7d2a91aa5c268671d92f`
- **Branch:** `codex/k1.1-create-reserve-async-dispatch`
- **Contract:** `docs/development/work/K1.1/contract.md`, revision 4
- **Previous review handoff:** `docs/development/work/K1.1/review-05.md`
- **Prerequisite implementation integration:** PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`
- **Integrated prerequisite/status reconciliation:** PR #26 / `05f48c204d1eae021b3464c206e5c11e84bb3505`

The cumulative B→H7 comparison has B as the merge base and H7 27 commits ahead. `24ff6b0ef2ea47eb1a85acad604d8a3b8030c2a1` (review-05)→C7 is exactly one payload commit changing six files: `coordinator.ts`, `lifecycle.ts`, `values.ts` and the three corresponding creation/dispatch/value test files. C7→H7 is exactly one administrative commit containing only the K1.1 status transcription, `implementation-07.md`, and `validation-07/` evidence; no production source, test, script, fixture, evaluator rule, threshold or configuration changed after clean-C7 validation.

During this review the remote branch advanced beyond H7 to `613bad94ae0d09bd16c772139d0e945461df53da` (`update-doc`), whose parent is H7. That later commit changes only `mental-model/deployment.md`, `mental-model/driver.md`, `mental-model/kernel.md` and `mental-model/runtime.md`. It is **not** this review's candidate and is not accepted or certified here. This review therefore does not use those later edits to change the semantics governing H7.

I had immutable GitHub access to the full pinned source files, commit comparisons, contract/process records, prior reviews/reports, the round-7 report, manifest and raw logs. I did **not** independently rerun repository npm commands: this session has no usable local repository checkout with outbound GitHub access. I independently ran only small isolated Node probes of ordinary JavaScript property-write semantics underlying the new counterexamples below. Those probes are not repository tests or validation evidence. The committed validation-07 outputs are therefore treated as inspected implementer runs on clean C7, not reviewer reruns.

## Governing baseline and independent coverage

I applied B-pinned `AGENTS.md`, the mental-model/development front doors, 006, 007, 008 and 012, then revision-4 K1.1 and its canonical owners. The correction was reviewed as a repeated semantic-correction family, not as a checklist of the report's named JavaScript methods.

Independent interacting coverage for this round was:

- caller-owned observation → immutable snapshot → canonical bytes → identity → atomic create/input commit;
- caller-triggered ambient mutation → Kernel-owned scratch construction → accepted state/evidence;
- dispatch-bound observation → exact batch selection → frozen Activation → redelivery;
- retained state/evidence → replay, listing and inspection projection;
- prior correction layers: capture agreement, safe clone, restored exact-JCS environment, primordial prototype decision, retained evidence, scoped identity, limits and dispatch-bound single observation;
- unsupported later-packet surfaces and target-zone structural boundary.

The strongest new challenge was not another live named method. It was whether H7's replacement mechanism — array index assignment in loops — is itself independent of mutable ambient prototypes. It is not: JavaScript ordinary `[[Set]]` on an array index may consult an inherited numeric accessor when that index is not already an own property. That invalidates the report's class-closure claim that index assignment is ambient-free.

## Findings

### K11-R6-STATE-02 — P1 — loop/index accumulation remains caller-steerable through inherited numeric array accessors

**Affected candidate locations:**

- `packages/kernel/src/coordinator.ts`: `copyArray`, `copyMapped`, `appendIssue`, `appendIssues`; creation/input receipt and mailbox accumulation; dispatch `selected`, carried-event and batch construction; refusal/delivery accumulation; `visibleExecutions`; `viewOf` projection arrays.
- Dependent criteria: **C2, C4, C6, C9**; C1 is also reached through the value/projection family described in K11-R6-VAL-04.

H7 correctly removes live `Map.get/set`, `Object.freeze`, `Array.prototype.map/filter/push`, iterator use and live Promise machinery from the named post-observation paths. The new proof, however, repeatedly substitutes expressions of the form:

`array[array.length] = value`

and treats that as a language-only write. For a fresh/holey array with no own property at that index, ordinary assignment uses JavaScript `[[Set]]`; an inherited setter on `Array.prototype["<index>"]` can receive the write instead of an own array element being created. This is an ambient prototype dependency even though no prototype method appears in source text.

A distinguishing dispatch counterexample is sufficient to violate C4:

1. Create an Execution with a queued initial Event normally.
2. Dispatch it with an `options.bound` getter that installs a configurable setter on `Array.prototype["0"]` which ignores writes, then returns `1`.
3. H7 correctly observes and validates `bound === 1` once.
4. Batch selection starts with `selected = []`, then executes `selected[selected.length] = entry` at index `0`.
5. The inherited setter receives and drops that write. `selected` still has no own element and remains length `0`.
6. H7 accepts a dispatch intent and receipt with an empty batch despite a non-empty queued mailbox and validated bound 1.

I independently confirmed the relevant JavaScript semantics in an isolated Node process: installing an inherited numeric setter at index 0 and assigning `a[a.length] = "wanted"` on `a = []` invoked the setter, created no own index, and left `a.length === 0`. This is a language-semantics probe, not a repository rerun.

The same defect class is not limited to dispatch selection. For example, the input commit uses index assignment for `record.mailbox` and `record.receipts`; dispatch appends its receipt the same way; inspection/listing and `copyArray`/`copyMapped` build result arrays the same way. An inherited numeric accessor can therefore drop or substitute a mailbox/event/receipt/projection fact after caller code has run. Even applying the load-time `Array.prototype.push` is not in itself a class-closing substitute: an isolated probe confirmed that primordial/captured `push` still reaches inherited numeric setters through the array's element-setting semantics.

**Required outcome:** reconstruct the post-observation state/evidence/projection subsystem around the actual semantic operation, not around a list of source-level method names. Once caller observation can mutate ambient prototypes, every Kernel-owned scratch/retained array write on the affected causal chain must have semantics that cannot be intercepted, substituted or dropped through inherited indexed accessors. Preserve exact atomicity, batch selection, evidence retention, replay/redelivery and inspection. Add distinguishing positive/negative regressions that exercise inherited numeric setter/getter pollution across at least dispatch selection, accepted input/evidence retention and projection. Audit internal `[[Set]]`/prototype-chain effects as well as explicit method/global lookups. The counterexample above is representative, not an instruction to special-case index 0.

### K11-R6-VAL-04 — P1 — array capture can retain/canonicalize a value different from the caller's coherent observation

**Affected candidate location:** `packages/kernel/src/values.ts`, especially `captureArray`'s `captured` scratch array and equivalent internal array-write mechanisms in the serialization adapter.

**Governing criterion/source:** **C3**, with dependent consequences in **C1/C2**. Revision 4 requires one caller observation to determine validation, canonical bytes and the retained structure; an unsupported representation must be refused rather than normalized into a different accepted value.

H7's `captureArray` correctly requires the caller array's actual prototype to be the load-time `Array.prototype`, checks descriptors/read agreement, and later constructs the final retained array with primordial `defineProperty`. But between those two steps it stores recursively captured members in a holey scratch array using ordinary index assignment:

`captured[index] = item`

The caller's `getPrototypeOf` trap runs before that scratch loop and is allowed by H7's own threat model to mutate ambient prototype state. It can install a numeric setter/getter on the genuine `Array.prototype` while returning that same genuine prototype, so the plain-array check still passes.

A distinguishing counterexample is:

1. Supply a Proxy over a genuine 21-element array whose element 20 is ordinary own data `20` and whose other observations remain coherent.
2. Its `getPrototypeOf` trap installs `Array.prototype["20"]` as a configurable inherited accessor whose setter ignores writes and getter returns `999`, then returns the genuine primordial Array prototype.
3. H7 accepts the prototype and coherently observes the caller's own element 20 as `20`.
4. Internal `captured[20] = 20` is intercepted by the inherited setter, so the scratch array has no own index 20.
5. When H7 later reads `captured[20]` to `defineProperty` the final frozen snapshot, the inherited getter returns `999`.
6. The accepted snapshot and canonical bytes therefore contain `999` where the caller's one coherent observation was `20`.

I independently confirmed the underlying scratch-array behavior in an isolated Node process: with an inherited accessor at index 20, assignments into `new Array(21)` left index 20 non-own and a later read returned the inherited `999`; copying by `defineProperty` then retained `999`. Again, this demonstrates JavaScript semantics only; it is not a repository test.

This reopens the broader K11-R2-VAL-02 semantic family even though the specific H5/H6 serializer witnesses remain corrected. The failure occurs before JCS: the immutable snapshot itself has already diverged from the accepted observation. The round-7 VAL-03 correction — comparing against `PrimordialObjectPrototype` and replacing descriptor-chain `in` checks with primordial own checks — is valid for its named defect and does not close this array-scratch path.

The serialization adapter contains the same assumption in its custom `safeMap`, which builds a result array and assigns `result[innerIndex] = callback(...)`. The serializer sandbox restores named globals/prototype methods but does not neutralize arbitrary inherited numeric accessors on `Array.prototype`; this must be included in the subsystem audit rather than left as a report assertion.

**Required outcome:** ensure that every internal scratch structure participating in caller observation → immutable snapshot → exact JCS input/canonical bytes is constructed and read without allowing caller-installed inherited indexed accessors to alter, drop or substitute captured data. Re-establish the invariant that accepted canonical bytes and retained content are functions only of the one coherent caller observation. Add a distinguishing regression based on this ordering and re-audit equivalent internal array constructions in capture, clone/serializer adaptation and issue bookkeeping. Do not fix only index 20 or only `captureArray`; close the semantic mechanism.

## Prior-finding reconciliation

The named H7 corrections are real and remain useful:

- **K11-R5-STATE-01:** the prior `Map.prototype.set` dropped-commit witness and live-`Object.freeze` mutable-Activation witness are corrected by load-time collection/freeze/Promise references and the stronger S1/S2 tests. The broader ambient-state closure is not complete because inherited indexed property semantics remain on the same causal paths.
- **K11-R5-VAL-03:** the live-`Object.prototype` comparison is corrected with `PrimordialObjectPrototype`; the seven descriptor `"value" in ...` checks are replaced by a primordial own-property test; V3 is distinguishing for that defect.
- **K11-R4-DISP-01:** single observation of `options.bound` remains intact. The new dispatch failure occurs after that correct observation during batch construction, so it is not a reopening of the triple-read bug.
- **K11-R4-PROC-01:** H7 claimed review readiness only after its own clean-C7 validation; no chronology defect found in this round.
- The specific guards for K11-R3-ID-03, K11-R3-LIMIT-01, K11-R3-DOC-02, K11-R3-PROC-02, K11-R2-EVID-01, K11-R1-VAL-01, K11-R1-ID-01, K11-R1-SCOPE-01, K11-R1-JCS-01, K11-R1-PROC-01, K11-R1-DOC-01 and K11-R3-ID-02 remain either re-proved by round-7 evidence or unchanged on the inspected correction delta. No independent contrary evidence was found for those specific prior dispositions.

The important distinction is therefore: H7 fixes the prior named witnesses, but its stated *class-closing mechanism* is incomplete. The new findings are not a demand to restore the old mechanisms or to enumerate more banned methods; they identify a semantic dependency the reconstruction did not model.

## Per-criterion result

| Criterion | Result | Independent rationale |
|---|---|---|
| **C1** | **FAIL** | K11-R6-VAL-04 permits initial-input accepted/retained content to differ from the caller's one coherent observation, so the atomic creation decision can bind the wrong logical value even though the later commit map is primordial. |
| **C2** | **FAIL** | The same C3 capture defect reaches input content, and K11-R6-STATE-02 leaves mailbox/evidence array commits interceptable after content observation. Acceptance can therefore fail to record exactly the immutable mailbox fact it returns. |
| **C3** | **FAIL** | `captureArray` scratch index writes can be redirected by an inherited numeric accessor installed during the same caller observation, producing retained/canonical content different from that observation. |
| **C4** | **FAIL** | A bound getter can install `Array.prototype["0"]` setter pollution; H7 then validates bound 1 but drops the first `selected` write and can accept an empty/wrong batch. The single-read bound fix and primordial freeze remain correct but do not save batch selection. |
| **C5** | **PASS** | Once H7 has recorded an Activation, ordinary redelivery reuses the same primordial-frozen Activation/intent and does not re-select. I found no new path that changes an already-recorded exchange across redelivery. The C4 defect is that the exchange may be formed incorrectly, not that redelivery mutates it. |
| **C6** | **FAIL** | Receipt objects themselves remain primordial-frozen, but receipt retention/projection still uses prototype-steerable array index writes. A returned accepted receipt can therefore be omitted/substituted in the retained receipt list/inspection path. |
| **C7** | **PASS** | Outcome, takeover, recovery and cancellation remain explicit refusing surfaces with the same packet ownership; no round-7 payload change weakens them. |
| **C8** | **PASS** | No Agent/Workflow discriminator or new exported cognition boundary was introduced; exact `canonicalize@3.0.0` remains the only target-zone third-party reach. |
| **C9** | **FAIL** | `viewOf`, `copyArray`, `copyMapped` and visible-list construction use the same ordinary index-assignment assumption, so persistent inherited indexed accessors can make inspection/listing misproject retained state/evidence. |
| **C10** | **PASS** | Round 7 adds no source files, runtime exports or dependency reach; the K1.0 structural boundary/inventory controls remain green and the correction delta does not weaken them. |

No criterion is DEFERRED. The stated lack of Agent evals, process-kill, native Driver and packaging evidence is consistent with this packet's exclusions and does not create an external blocker for K1.1 review.

## Evidence interpretation and gaps

I inspected `validation-07/MANIFEST.md`, the raw round-7 kernel log and `09b-distinguishing-ablations.log`. They are internally consistent with the report: clean detached C7, 2,234 full tests / 332 suites / 0 failures, 176 Kernel tests / 31 suites / 0 failures, the stated conformance/SDK/builder-doc/architecture counts, and 9/9 named ablations rejected. S1/S2/V3 are useful distinguishing evidence for the exact round-5 review witnesses.

Those runs are implementer evidence, not my reruns. The new counterexamples are not represented by the nine ablations. In particular, the report's static search for explicit `.get/.set/.push/.map/...`, iterators, live `new Map/Set/Promise` and live `Object.freeze` cannot establish absence of ambient dependencies hidden inside ordinary JavaScript property assignment semantics. This is why green mechanical validation and the static check do not prove the stronger closure assertion.

I found no missing required source or raw evidence, so there is no `BLOCKED_EXTERNAL`. I found no conflicting or missing architecture rule: the contract already says what the observable result must be. Therefore this is a coding defect, not `BLOCKED — ARCHITECTURE DECISION`.

## Correction handoff

Correct the same released packet **K1.1** on `codex/k1.1-create-reserve-async-dispatch`.

Base `777b9955fb3a443f700b4f3d1f4f2aef1869345b`; reviewed H `ae02c32ae575c70326cd7d2a91aa5c268671d92f`; authoritative review record `docs/development/work/K1.1/review-06.md` (recording commit supplied in the external handoff after this review is pushed).

Open findings **K11-R6-STATE-02** and **K11-R6-VAL-04**; required outcomes and distinguishing counterexamples are in this record. Owner supplemental decisions: none. Unresolved authority: none.

Apply 006 and 012: reconstruct the affected semantic subsystem and its dependencies, including language-level `[[Set]]`/prototype-chain behavior rather than only named builtin calls; then re-review the whole cumulative packet. Preserve valid H7 corrections and prior closed outcomes. Fix additional in-scope defects with separate provenance. Use 008 for the next report and 006 for new C/H plus clean evidence/push handoff. Do not release K1.2.

**Status for transcription:** `CHANGES_REQUESTED` for K1.1, with H7 `ae02c32ae575c70326cd7d2a91aa5c268671d92f` rejected by this review pending correction of K11-R6-STATE-02 and K11-R6-VAL-04.

CHANGES REQUIRED