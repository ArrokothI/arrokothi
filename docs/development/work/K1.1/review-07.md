# Independent review — K1.1 round 9 (H9)

## Reviewer, session and access

- **Reviewer/session:** OpenAI ChatGPT, **GPT-5.6 Sol**, High reasoning, independent reviewer in this chat. I did not implement K1.1 and made no candidate source/test/config changes.
- **Review date:** 2026-09-14, America/New_York.
- **Repository access:** immutable GitHub commit/file/history access plus permission to append this review record. I could inspect the pinned source, cumulative history, contract, reports and committed raw evidence. The local shell environment did not have a repository checkout and earlier repository cloning from that environment was blocked by outbound DNS, so I did **not** rerun the repository npm commands. I did run an isolated Node language-semantics probe described below; it is not a candidate validation run.
- **Evidence attribution:** validation-09 logs are inspected implementer executions on clean C9, not reviewer reruns. The isolated Node probe establishes JavaScript operation semantics only.

## Exact candidate binding and process identity

This review binds **only** to:

- **B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
- **C9:** `5ac76207a05b61f918a1efd2313c25b7108d775c`
- **H9:** `5dddc2ad3cfd616b38c062380e450873cbc4c132`
- **Contract:** `docs/development/work/K1.1/contract.md`, revision 5 as present at H9
- **Report:** `docs/development/work/K1.1/implementation-09.md`
- **Evidence:** `docs/development/work/K1.1/validation-09/`

B is the merge base of the cumulative candidate and H9 is 34 commits ahead of it. C9 is an ancestor of H9. The C9→H9 interval is one administrative candidate commit: packet status/report/evidence and superseding notes, with no production source, test, fixture, evaluator rule, threshold or configuration change after C9.

The preserved C8/H8 sequence is process-consistent: C8/H8 were not reviewed; a self-found payload/test gap caused a new C9 and a fresh validation-09 run rather than retroactively treating validation-08 as evidence for C9. The committed tree/environment record shows B, the prior candidates/reviews, C8/H8, K1.0 prerequisite integration and `main` integration as C9 ancestors.

At review time the remote branch no longer points exactly at H9: it has advanced to `fa5cba36a2a0ebcde2659f8a01dc85864b06b2ff` (`improve-kernel.md`), whose parent is H9. That later documentation commit is **outside this candidate** and receives no acceptance from this review. Acceptance, if earned, would bind only to exact H9.

## Governing material read before reconciliation with the report

At governing B I read the repository instructions, `mental-model/README.md`, the development front door, 006, 008 and 012, then the applicable Layer-3 creation, core, values, identity, lifecycle/state, execution-cycle and evidence material. I treated contract revision 5 as an artifact to review, not as authority to weaken its own review.

Revision 5 is additive on inspection: its five coverage rows and K1.1-DEC-6 sharpen the already-required observable behavior around caller-steerable list operations and canonical bytes. I found no relaxation of an existing K1.1 criterion, semantic limit, refusal obligation or previously settled decision.

I derived independent coverage around these interactions before relying on `implementation-09.md`:

1. caller-owned observation → boundary validity → immutable retained value → canonical bytes → identity/replay;
2. caller-owned observation → atomic creation/input mutation → retained receipt/refusal → inspection;
3. caller-owned dispatch envelope → one bound observation → exact acceptance-order selection → reservation → immutable Activation → asynchronous Driver send;
4. accepted intent → ordinary redelivery of the same exchange;
5. persistent ambient mutation → replay, projection and evidence paths after the call that introduced it;
6. exact `canonicalize@3.0.0` execution, including its own scratch arrays and the environment it consults;
7. unsupported successor surfaces, package/import/ownership structure and the cumulative Layer-2 documentation edits present in H9.

I inspected the full 11-file `packages/kernel/src` target zone at H9, the cumulative B→H9 file set, the H7→C9 and H8→C9 correction deltas, surrounding K1.1 tests, the exact published `canonicalize@3.0.0` implementation, and the owner-side Layer-2 documentation edit that is in H9 ancestry. The Layer-2 lifecycle/recovery summaries I checked remain subordinate to and consistent with the governing Layer-3 sources; I found no separate documentation conformance defect in them.

## Evidence assessment

The validation-09 directory contains the manifest and all ten declared logs. The manifest and raw logs support the claimed clean-C9 execution: typecheck clean; `npm test` 2,252/340/0; conformance 1,949/283/0; kernel 194/39/0; SDK 22/0; builder-docs; architecture 362/37/0; and the packet inventory. `test:evals` was appropriately excluded because K1.1 changes no Agent/model path.

The ablation log is substantive evidence, not merely a green suite. Control is 194/0 and all 15 one-behavior ablations are rejected. In particular:

- X1 rejects reverting `defineAt` to ordinary indexed assignment;
- X7 rejects replacing it with the captured primordial `Array.prototype.push`;
- X2 rejects reinstating the holey capture scratch array;
- X3 independently rejects removing the serializer's inherited-index neutralization;
- X8 rejects failing to restore borrowed prototype positions;
- S1/S2/V3/N1/N3/P1/JCS re-prove representative prior guards.

Those results establish that H9 genuinely corrects the named H7 `[[Set]]`/`push` witnesses and the dependency's indexed-scratch-array witness. They do **not** establish semantic completeness against the finding below: neither the runtime cases nor the mechanical source-text control exercise the property-descriptor conversion performed by `Object.defineProperty` before the target object's `[[DefineOwnProperty]]` is invoked.

## Finding

### K11-R7-STATE-03 — P1 — the new own-data primitive still depends on caller-mutable `Object.prototype` through property-descriptor conversion

**Affected:** `packages/kernel/src/own-array.ts`; dependent paths in `packages/kernel/src/coordinator.ts` and `packages/kernel/src/values.ts`.

**Criteria:** C1, C2, C3, C4, C6 and C9.

H9 correctly identifies that ordinary indexed assignment and `push` are the wrong operations. `own-array.ts` therefore captures `Object.defineProperty` and implements `defineAt` as:

```ts
PrimordialDefineProperty(list, `${index}`, {
  value,
  writable: true,
  enumerable: true,
  configurable: true,
});
```

The target write does reach the array's `[[DefineOwnProperty]]`, but that is not the whole JavaScript operation. Before the target operation runs, `Object.defineProperty` converts its third argument with the language's property-descriptor conversion. The descriptor supplied here is an ordinary object literal whose prototype is the live `Object.prototype`. Inherited descriptor fields therefore participate in conversion.

A caller-observation side effect can install an inherited `get` or `set` field on `Object.prototype`. A descriptor literal that owns `value`/`writable` but inherits `get` is then interpreted as specifying both a data descriptor and an accessor descriptor, and the captured primordial `Object.defineProperty` throws `TypeError`. Capturing the function object does not remove this dependency.

I verified this language behavior independently in the available Node runtime. With a captured `Object.defineProperty`, installing `Object.prototype.get = undefined` and then defining an array position with the exact H9 descriptor shape throws:

```text
TypeError: Invalid property descriptor. Cannot both specify accessors and a value or writable attribute
```

A direct K1.1 witness needs no boundary-value serialization at all. `dispatch` explicitly treats `options.bound` as caller-owned and deliberately observes its getter once. Let that getter install the inherited `Object.prototype.get` data property and return the valid bound `1`. H9 validates the captured `1`, constructs `selected = []`, and calls `appendOwn(selected, entry)`. `appendOwn` reaches `defineAt`; descriptor conversion sees the inherited `get`; the call throws before the batch can be retained. There is no dispatch refusal or accepted intent to reconcile — a contract-valid bound has escaped the boundary as a raw ambient `TypeError`.

An isolated dispatch-shaped probe confirms the exact ordering: the getter returns `1`, the subsequent captured `defineProperty` throws, and the selected list remains length zero. This is a language-semantics probe, not a repository rerun.

The same hidden dependency is not confined to dispatch. `values.ts` uses `PrimordialDefineProperty` with ordinary descriptor literals while constructing snapshots/safe clones and while installing serializer-window slots. `pushIssue` also goes through `appendOwn`. A coherent caller-owned representation can therefore install the same inherited descriptor field during its permitted observation and make the supposedly hardened capture/refusal/canonicalization path depend on ambient prototype state. The report's claim that the post-observation path is now expressed solely through load-time references is consequently false at the semantic-operation level even though it is true at the direct function-reference level.

The mechanical source check cannot see this class: no ordinary indexed assignment or array prototype call needs to appear in source for `ToPropertyDescriptor` to perform inherited property lookups. X1/X7 are valuable proofs against the old operations, but they do not distinguish this weaker H9 implementation from one whose complete own-data installation operation is independent of caller-installed descriptor fields.

**Required outcome:** make the complete caller-observation → own-data installation/restoration → atomic commit/projection chain independent of caller-installed inherited property-descriptor semantics. Audit every relevant property-definition/restoration operation in the K1.1 zone, including the descriptor-conversion inputs supplied to it, rather than patching only `Object.prototype.get` or only `own-array.ts`. A valid dispatch bound whose getter installs descriptor-field pollution must still produce the contract-defined dispatch decision without a raw throw or caller-steered state; the same must hold for value capture/refusal/canonicalization, evidence retention and inspection paths that use the same primitive. Add distinguishing regression/ablation evidence for the semantic class. The implementation mechanism is not prescribed here.

## Prior-finding reconciliation

- **K11-R6-STATE-02:** the exact H7 ordinary-indexed-write defect is corrected. X1 and X7 strongly distinguish `[[DefineOwnProperty]]` from both ordinary assignment and primordial `push`.
- **K11-R6-VAL-04:** the exact holey-scratch capture defect is corrected; accepted array members are no longer written to and reread from that scratch shape.
- **K11-R6-VAL-05 (self-found):** the exact unmodified-JCS inherited-index channel is materially corrected by the call window that removes/restores own index-named positions on `Array.prototype` and `Object.prototype`; X3/X8 distinguish the behavior.
- The previously closed R1–R5 findings remain closed on their specific witnesses based on retained tests and representative round-9 ablations.
- However, the **broader ambient-operation defect family is not closed**. H7 stopped one level too early at `[[Set]]`; H9 now stops one level too early at the apparent `Object.defineProperty` call without accounting for the descriptor conversion that precedes the target's `[[DefineOwnProperty]]`.

## Per-criterion verdict

| Criterion | Verdict | Assessment |
|---|---|---|
| **K1.1-C1** | **FAIL** | Creation's boundary-value/evidence path depends on the same own-array/value-definition primitive. A caller-observed representation can make the intended accept/refuse path escape through descriptor conversion rather than produce one atomic creation decision. |
| **K1.1-C2** | **FAIL** | Input acceptance/refusal, mailbox retention and evidence use the same primitive; the complete atomic ingress result is not independent of caller-installed inherited descriptor fields. |
| **K1.1-C3** | **FAIL** | Snapshot/safe-clone/refusal construction still contains property definitions whose descriptor conversion can be steered after a valid caller observation; the boundary can raw-throw instead of deterministically accepting/refusing the observed value. |
| **K1.1-C4** | **FAIL** | Direct counterexample: a valid one-read bound getter installs `Object.prototype.get`; batch selection then throws in `appendOwn`/`defineAt` before the dispatch intent is accepted. |
| **K1.1-C5** | **PASS** | For an exchange that has actually been formed, H9 still preserves the same Activation identity/epoch/base revision/batch on ordinary redelivery. The new finding blocks formation/auxiliary list operations rather than showing reselection of an already accepted exchange. |
| **K1.1-C6** | **FAIL** | Receipt/refusal retention and projection depend on list construction that shares the defective primitive; a caller-observed request can escape rather than leave the required retained evidence. |
| **K1.1-C7** | **PASS** | Later-packet surfaces remain explicitly unsupported/refused rather than partially implemented. |
| **K1.1-C8** | **PASS** | No Agent/Workflow discriminator is reintroduced; exact approved `canonicalize@3.0.0` remains the sole third-party reach of the zone. |
| **K1.1-C9** | **FAIL** | Fresh projections use `copyOwn`/`mapOwn`/`appendOwn`; persistent pollution introduced by a supported caller observation can make inspection throw rather than inertly report retained truth. |
| **K1.1-C10** | **PASS** | The private target zone, 11-source-file inventory, 17 runtime exports and structural import boundary remain consistent. The semantic finding is inside the allowed zone, not a structural ownership escape. |

## Coverage gaps and access limits

I did not rerun the repository suite; committed validation-09 is implementer evidence that I inspected. The isolated Node probe is only independent confirmation of the JavaScript abstract-operation behavior and is not claimed as a C9 validation run. This is **not** an external blocker because immutable source, candidate history, contract and raw committed evidence were all available; 006's blocked-external path is therefore not applicable.

I found no unresolved architecture decision. The required result is already determined by the existing K1.1 contract and canonical boundary semantics. The defect is implementation-owned.

## Review verdict and compact correction handoff

H9 is not acceptable. One mandatory P1 semantic-closure defect remains: **K11-R7-STATE-03**.

Correct the same released packet K1.1 on `codex/k1.1-create-reserve-async-dispatch`. Keep B `777b9955fb3a443f700b4f3d1f4f2aef1869345b` fixed. Preserve all valid H9 corrections and every previously closed finding. Produce a new exact payload C and administrative H under 006/008 after clean full validation. Do not treat `fa5cba36a2a0ebcde2659f8a01dc85864b06b2ff` or this review-record commit as a candidate acceptance. Do not begin or release K1.2.

---

## Owner note — outside the reviewer report

There is still **substantial implementation improvement**. This agent did not merely repeat H7: it correctly established that primordial `push` is not a fix, introduced one owner for grown lists, removed the capture scratch, independently found the unmodified JCS scratch-array channel, added a real serializer window, preserved the superseded C8/H8 history, and reran clean C9 with 15 distinguishing ablations. That is meaningful progress rather than stagnation.

At the same time, the same conceptual family has now survived multiple correction rounds. The recurring local-minimum pattern is that the implementation audits the immediately visible JavaScript operation but stops before the next language-level abstract operation that can still consult caller-mutable state: earlier `[[Set]]`, now `ToPropertyDescriptor` before `[[DefineOwnProperty]]`. The static rule likewise proves source spellings, not the full semantics of the chosen primitive.

I therefore recommend the owner **consider switching or escalating the implementation agent now**, or at minimum require an independent ECMAScript-operation audit of every primitive used after caller observation before another patch round. This recommendation is not because progress is absent; it is because the progress remains concentrated on successive manifestations of the same boundary-model mistake.

## Coding-agent correction prompt

Read `docs/development/work/K1.1/review-07.md` in full first. It is the authoritative independent-review handoff for H9 and owns the open P1 finding **K11-R7-STATE-03**.

Correct the same released K1.1 packet. Do not release or begin K1.2, do not weaken contract revision 5, and do not regress any previously closed finding or the valid H9 corrections.

The central counterexample is not another indexed `[[Set]]` bug. H9's `defineAt` calls the captured load-time `Object.defineProperty`, but it passes an ordinary descriptor object literal. JavaScript converts that object to a property descriptor before invoking the target's `[[DefineOwnProperty]]`; inherited descriptor fields participate in that conversion. A valid `dispatch.options.bound` getter can install an inherited `Object.prototype.get` field and return `1`. The subsequent `appendOwn`/`defineAt` then throws because the descriptor appears to contain both data and accessor fields. The candidate therefore still lets one permitted caller observation change the later Kernel decision through ambient prototype state.

Treat that as a representative witness, not the patch specification. Reconstruct the full language-level operation chain behind every primitive used after caller observation. Audit property-definition/restoration uses in `own-array.ts`, value snapshot/safe-clone construction, the serializer environment, coordinator commit/evidence/projection paths, and any dependent replay/inspection path. The required invariant is that caller-installed inherited descriptor semantics cannot alter, execute inside, drop, substitute or make raw exceptions escape from the Kernel's accepted/refused result.

Add distinguishing tests where a supported caller observation installs descriptor-field pollution and then returns an otherwise valid value/bound. Challenge the entire observable result: exact retained state, receipt/refusal, Driver delivery, replay/redelivery and inspection as applicable. Add an ablation that removes only the new semantic protection so the new cases reject it. Do not special-case only the string `get`; close the descriptor-conversion/ambient-prototype class and inspect equivalent hidden language operations before claiming closure.

Preserve H9's correct outcomes: exact `canonicalize@3.0.0`; one-observation snapshots; inherited numeric prototype neutralization during JCS; own-index operation correction; frozen exported decision vocabulary; load-time String/Error/etc.; serializer partial-failure restoration; single-observation batch bound; all identity/evidence/scope/limit corrections; structural inventory and private export boundary.

Apply 006/012 semantic-correction closure, create a fresh payload C for any substantive change, rerun the complete validation plan from that clean C, and use 008 for the next report/evidence handoff with exact C/H identities. Do not claim `WAITING_FOR_REVIEW` while a mandatory in-scope defect is known.

CHANGES REQUIRED
