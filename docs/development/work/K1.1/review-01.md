# K1.1 independent review — round 1

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-14  
**Role:** independent reviewer; I did not implement this candidate.  
**Session identifier:** not exposed to me.

## Candidate binding and access

This review binds only to:

- **Base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
- **Payload C:** `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`
- **Candidate H:** `0f345b3c9ab49f6c5d9e09b162641cda78f96356`
- **Branch:** `codex/k1.1-create-reserve-async-dispatch`
- **Prerequisite integration:** `4f02e6cad2dbc9d5444fededbdc27f0dc695060d`
- **Contract:** `docs/development/work/K1.1/contract.md`, revision 1
- **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`

At review time, advertised remote `main` was exactly B and the advertised packet branch was exactly H.

I inspected the immutable commit interval B → `b5f632877cc6886926d991b11ce348e2c25d5171` → C → H, the H tree, the cumulative changed production sources, supporting test harness and relevant tests, the contract/status/report records, structural inventory/guard material and the committed validation evidence. B→C is 26 files, 4,104 insertions and 61 deletions. C is the second payload commit and H is administrative/evidence/status material.

I did **not** independently rerun the repository's npm commands. The local execution sandbox available to this review could not obtain a GitHub checkout. I therefore distinguish the committed logs as **inspected implementer executions**, not reviewer reruns. I did independently run small JavaScript language-semantics probes for the value-copy counterexamples below; those were not repository tests.

The private Claude/Epitaxy link in the handoff was not needed: H contains the raw validation logs and manifest, so required evidence was independently readable. This is not a 006 `BLOCKED_EXTERNAL` case.

## Governing baseline and methods

I used B's `AGENTS.md`, the mental-model canonical/detail sources, the development front door, and 006, 007, 008 and 012. Under 006, canonical Layer-3 rules precede packet contract/status, and candidate records cannot authorize a semantic or process relaxation governing their own review. 006 also requires every criterion to receive a verdict and requires the cumulative pass to continue after a defect is found.

Applicable 012 methods:

- **Normative decisions:** creation/input identities, boundary values, cancellation ownership and unsupported surfaces.
- **Deterministic execution:** create/ingress/reservation/dispatch/redelivery/inspection plus forbidden mutations and plausible wrong implementations.
- **Race/fault, narrowly:** dispatch intent before send, lost/throwing Driver and non-blocking dispatch. No persistence/process-death claim was demanded.
- **Process/documentation:** B/C/H, prerequisite/release state, C→H scope and structural/status records.

Native Driver fidelity, external E-gate proof and packaging/release were correctly not claimed by this packet.

My independently derived interacting coverage was: creation ↔ input identity ↔ canonical value equality ↔ retained immutable content; reservation ↔ dispatch intent ↔ asynchronous Driver call ↔ redelivery; authority-scoped lookup ↔ receipts ↔ inspection; packet ownership ↔ explicit refusal of later surfaces; and target-zone structure ↔ inventory/guard ↔ migration/support descriptions.

## Identity, evidence and correction-delta assessment

The committed validation manifest records clean typecheck, 2,161/2,161 full tests, 1,947/1,947 conformance, 105/105 Kernel tests, 22/22 SDK tests, builder-docs success and 360/360 architecture tests. It also records sixteen one-behaviour ablations. These are useful mechanical evidence but do not override semantic counterexamples omitted from the oracle.

The ablation evidence is genuinely discriminating in several areas—identity packing, depth, reservation versus acknowledgment, batch reselection and intent-before-send—but it does not exercise the findings below. Its final worktree status is `?? node_modules`, so the prose claim that the temporary worktree was wholly clean afterward is not literal; I found no evidence that this altered the tested payload source.

The actual `b5f632… → C` correction delta modifies three test files to strengthen identity-packing and hidden/missing position controls. I inspected that delta. The report's earlier self-corrections for wrapper-root sizing and retained caller references happened before the first committed payload snapshot, so there is no immutable defective source revision in this packet to inspect for those two fixes; I assessed their final implementation and ablation evidence instead.

## Findings

### K11-R1-VAL-01 — P1 — accepted boundary values are not faithfully retained over the accepted object-key space

**Affected:** `packages/kernel/src/values.ts`, especially `sealBoundaryValue`; dependent creation, ingress, Activation and inspection paths.  
**Governing criteria/sources:** K1.1-C1/C2/C3/C4/C9; `mental-model/concepts/values.md`; `mental-model/concepts/core.md`.

`values.md` permits ordinary boundary objects with arbitrary well-formed string member names and defines equality by canonical bytes. Candidate validation/canonicalization accepts an ordinary JSON object with an own `"__proto__"` member. But `sealBoundaryValue` creates `{}` and copies each member with `sealed[name] = ...`. For `"__proto__"`, that assignment invokes the inherited legacy setter rather than installing the original member as own data. The accepted copy can therefore lose the member and acquire its value as its prototype, while the already-computed canonical bytes still describe the original object.

A concrete valid input is:

```js
JSON.parse('{"__proto__":{"admin":true},"safe":2}')
```

A standalone language probe reproducing the candidate's assignment-style copy showed that the copied object no longer had an own `"__proto__"` member while its prototype supplied `admin: true`. Creation/input can therefore bind one canonical logical value but retain, inspect and dispatch a different structural value. That violates the exact-content and immutable-record claims across C1/C2/C3/C4/C9.

This also reintroduces a previously reviewed project defect family. K0.2 finding `K02-R2-02` rejected the same `{}` + `copy[key] = ...` snapshot construction for a valid `"__proto__"` key and required own-data preservation plus a distinguishing regression.

An adjacent oracle gap shows why this subsystem should be reconstructed rather than patched by special-casing one string. Array validation classifies every all-digit own property name as an array index. An own `"01"` member therefore escapes the "extra property" rejection even though array canonicalization/copying omits it, contradicting the module's stated invariant that unsupported members are refused rather than silently dropped.

**Required outcome:** restore one value-preserving acceptance invariant across validation, canonical identity, retained state, Driver projection and inspection for every supported boundary shape; unsupported JavaScript shapes must be refused rather than silently transformed. Add distinguishing regressions covering the prior `"__proto__"` defect family and numeric-looking non-index array members. This finding specifies outcomes, not a mandatory patch mechanism.

### K11-R1-ID-01 — P1 — hidden and missing Executions remain distinguishable by lookup work

**Affected:** `ExecutionCoordinator.#visible`, `visibleExecutions`, C2/C6/C9 authority tests.  
**Governing criteria/sources:** K1.1-C2/C6/C9; `mental-model/concepts/identity.md`.

Canonical identity requires lookup to authenticate/scope before revealing existence and says refusal **shape/timing** must not distinguish a hidden record from a missing one.

The implementation first performs `#executions.get(executionId)`. A missing ID immediately returns `null`; an existing hidden ID additionally evaluates `mayReachScope(caller, record.scope)`, which performs `caller.scopes.includes(scope)`. With a caller carrying many legitimate scopes, an existing-but-hidden destination has a different control-path cost from a missing destination. `visibleExecutions` additionally walks the entire Execution map even when the answer is empty, exposing corpus-size-dependent work through a supposedly existence-scoped read.

C's new test says it checks “timing and position,” but mechanically it only verifies that the internal acceptance-position counter advances equally. It does not distinguish the missing fast path from the hidden scope-search path.

**Required outcome:** hidden and missing lookup behavior must satisfy the canonical non-disclosure requirement across every exposed lookup/listing path, and the retained oracle must actually distinguish the relevant execution-path/timing failure rather than using an unrelated position counter as a proxy.

### K11-R1-SCOPE-01 — P1 — K1.1 implements a K1.3 boundary and its own contract is contradictory

**Affected:** K1.1 contract C7/C11, `ExecutionCoordinator.cancelExecution`, cancellation/ingress/dispatch tests, report/status/baseline prose.  
**Governing criteria/sources:** governing 007 K1.1/K1.3 scope; K1.1-C7/C11.

Governing 007 at B assigns K1.1 creation/input/reservation/dispatch and says unsupported next forms refuse. It separately assigns **out-of-band cancellation and terminal disposition** to K1.3.

The submitted contract nevertheless contains both:

- **C7:** cancellation must exist as a refusing surface naming K1.3 and change no accepted state; and
- **C11:** K1.1 accepts cancellation, fences the exchange, changes lifecycle state and terminally disposes input.

The implementation follows C11: `cancelExecution` mutates input dispositions, fences the Activation and changes state to `CANCELLED`. Its source comment narrows 007 to cancellation *races*, but governing 007 assigns cancellation itself and terminal disposition to K1.3.

The C7 test also does not test the contract it states. It checks `submitOutcome`, `requestTakeover` and `recoverExecution`; cancellation is silently replaced by a K1.2 recovery surface. The separate cancellation tests then justify the scope expansion on the same narrower reading of 007.

The stated reason—K1.1 needs a reachable terminal destination to demonstrate C2—is an evidence-design problem, not authority to implement the later packet.

**Required outcome:** reconcile the packet with governing ownership before implementation is re-reviewed. Under the current governing baseline, K1.1 must not accept the K1.3 cancellation boundary; the terminal-ingress obligation must be evidenced without silently taking K1.3 ownership. If the owner intentionally wants to change packet ownership instead, that requires an explicit governing scope amendment before implementation, not a candidate-local DEC item.

### K11-R1-JCS-01 — P1 — a mandatory canonical-value implementation decision remains unresolved at review handoff

**Affected:** `mental-model/concepts/values.md`, K1.1 contract OPEN-2, `packages/kernel/src/values.ts`, ownership inventory/report.  
**Governing criteria/sources:** K1.1-C3; `mental-model/concepts/values.md`; 006 entry/review readiness; `AGENTS.md` third-party review.

The canonical value owner says to **use an unmodified conforming JCS implementation rather than an almost-equivalent serializer**.

The candidate knowingly writes a new in-zone serializer and leaves the divergence to the owner as `K1.1-OPEN-2`. The contract acknowledges the rule and then selects the bespoke implementation because introducing a third-party package needs owner review. The structural inventory likewise records that an external dependency requires an owner decision; it does not transform the canonical imperative into an optional preference.

This is not cured by the current serializer passing selected examples. Under 006, `WAITING_FOR_REVIEW` requires no unresolved owned semantic/mandatory case. A planning/dependency issue that can be resolved without changing semantics gets CHANGES REQUIRED rather than being delegated to the independent reviewer.

**Required outcome:** resolve the substrate/dependency decision under the existing canonical rule and AGENTS third-party policy before a new review candidate. If the owner instead wants to change the canonical rule, record that as the appropriate owner-approved normative amendment and review its consequences. This finding does not prescribe a particular dependency as the only correction.

### K11-R1-PROC-01 — P1 — the governing entry prerequisite was still outstanding when K1.1 was released

**Affected:** K1.0/K1.0-correction-02 integration provenance; 007 K1.1 release/status.  
**Governing sources:** 006 status transitions and integration receipts; governing 007 status ledger.

At B, 007 records K1.0 with correction-02 as integrated but explicitly states that the formal integration receipts under `work/K1.0/` and `work/K1.0-correction-02/` **remain owed before K1.1 release**, and records `next_release: none`. It also states packet entry requirements.

At H, the candidate transcribes a later owner release while expressly acknowledging those same two receipts were still outstanding. Both expected receipt paths are absent at H.

A later release instruction establishes owner intent to release; it does not silently rewrite the governing baseline's explicit “before release” prerequisite. Candidate status text cannot waive process governing its own review.

**Required outcome:** complete or explicitly resolve the prerequisite integration provenance under governing 006/007 and re-establish valid K1.1 release/review eligibility. This may be administrative rather than a code change, but exact H cannot be accepted while the precondition remains unresolved.

### K11-R1-DOC-01 — P2 — shipped-in-tree support/refusal descriptions still assert that no target protocol exists

**Affected:** `packages/kernel/package.json`, `packages/kernel/src/unsupported.ts`, related support/baseline assertions.  
**Governing sources:** 006 evidence/reference-maintenance obligations; K1.1 compatibility/refusal claims.

At H the private Kernel package description still says it is “Structural only,” contains **“no Activation/Outcome protocol implementation”**, and is waiting “until a protocol packet lands.” A protocol packet has now landed in the candidate.

`UnsupportedKernelSurfaceError` likewise tells callers that **“The target Activation/Outcome protocol is unimplemented at this revision”**, even while creation/input/Activation dispatch are implemented. Updated unsupported tests check later-surface names but do not detect that broader false statement.

The candidate's implemented-baseline note correctly says the package is no longer refusal-only, making the disagreement direct.

**Required outcome:** materially affected package/refusal/support descriptions must accurately communicate the partial K1.1 boundary without advertising unimplemented later protocol or erasing the legacy distinction.

## Per-criterion verdicts

| Criterion | Verdict | Independent rationale |
|---|---|---|
| **K1.1-C1** | **FAIL** | Common creation/replay cases are strong, but a valid own `"__proto__"` creation value is canonicalized and then retained differently. Creation therefore does not bind exact accepted content over the full boundary-value space. K11-R1-VAL-01. |
| **K1.1-C2** | **FAIL** | Replay/conflict/capacity behavior is otherwise well exercised, but accepted content is not universally preserved, hidden versus missing has a timing/control-path distinction, and the terminal case depends on an out-of-scope K1.3 cancellation. K11-R1-VAL-01, K11-R1-ID-01, K11-R1-SCOPE-01. |
| **K1.1-C3** | **FAIL** | Selected JCS/limit cases pass inspected tests, but accepted-value/retained-value fidelity has concrete counterexamples and the mandatory JCS implementation decision remains unresolved. K11-R1-VAL-01, K11-R1-JCS-01. |
| **K1.1-C4** | **FAIL** | Intent-before-send, reservation and asynchronous dispatch themselves are convincingly exercised, but the Activation can carry a retained value different from the canonical value creation/input actually bound. K11-R1-VAL-01. |
| **K1.1-C5** | **PASS** | For an already-formed exchange, ordinary redelivery preserves Activation ID, epoch, base revision, receipt and exact reserved batch and excludes later arrivals. I found no independent C5 defect. |
| **K1.1-C6** | **FAIL** | Per-boundary receipt/replay behavior is sound in inspected cases, but authority-scoped reads do not meet the canonical hidden/missing timing requirement. K11-R1-ID-01. |
| **K1.1-C7** | **FAIL** | The contract requires cancellation to refuse as K1.3-owned; the implementation instead accepts it, while the C7 test substitutes `recoverExecution`. K11-R1-SCOPE-01. |
| **K1.1-C8** | **PASS** | Target surface/import/vocabulary controls retain the no-Agent/Workflow discriminator and target-zone quarantine; no contrary executable boundary was found. |
| **K1.1-C9** | **FAIL** | Ordinary inspection is inert and copied, but it can expose accepted structural content inconsistent with canonical acceptance for `"__proto__"` and shares the hidden/missing disclosure defect. K11-R1-VAL-01, K11-R1-ID-01. |
| **K1.1-C10** | **PASS** | The mechanical target-zone import boundary, private package status, measured ten-file zone and deferred-row structural inventory remain enforced; no weakened structural assertion was found. The misleading support prose is separately K11-R1-DOC-01. |
| **K1.1-C11** | **FAIL** | Its local cancellation mechanics are tested, but C11 itself is an unauthorized packet-scope expansion contradicting governing 007 and C7. K11-R1-SCOPE-01. |

## Coverage gaps and limits

No criterion was left unexamined for lack of source. I did not independently rerun the repository test suites, and no native Runtime/Driver, external E-gate, process-death or packaging observation was performed; none is needed to establish the findings above and those claims are not made by this packet.

The semantic review does not depend on inaccessible evidence. The strongest defects are source-level counterexamples against governing rules; a green implementation-owned suite that lacks those cases cannot convert them into passes.

## Prior findings and correction-family observation

There is no prior K1.1 independent review to disposition. The implementer's self-corrections for wrapper-root size and caller-reference retention are not accepted merely because they were fixed before handoff; their dependent subsystem was re-reviewed here.

K11-R1-VAL-01 is materially important because the same `"__proto__"` value-preservation defect family was already found and corrected during K0.2 (`K02-R2-02`). This is not a reason to count turns or to reject substantial incremental progress. It is a signal that the next correction should reconstruct the value-copy/value-acceptance invariant and its dependent paths rather than patching one key or one failing test.

## Verdict application

This is **not** `BLOCKED — ARCHITECTURE DECISION`. The current governing sources already resolve the central scope questions: 007 assigns out-of-band cancellation/terminal disposition to K1.3, and `values.md` states the current JCS rule. If the owner wishes to change either rule, a future approved amendment may require architecture review, but H cannot treat the unresolved choice as permission.

It is also not an external blocker: source and raw evidence required to review H were available.

H `0f345b3c9ab49f6c5d9e09b162641cda78f96356` therefore must not be accepted, merged or used to release K1.2.

## Compact correction handoff

Correct the same released packet **K1.1** on `codex/k1.1-create-reserve-async-dispatch`.

Base `777b9955fb3a443f700b4f3d1f4f2aef1869345b`; reviewed H `0f345b3c9ab49f6c5d9e09b162641cda78f96356`; review record `docs/development/work/K1.1/review-01.md` at the immutable review-record commit containing this file.

Open findings **K11-R1-VAL-01, K11-R1-ID-01, K11-R1-SCOPE-01, K11-R1-JCS-01, K11-R1-PROC-01, K11-R1-DOC-01**; required outcomes and counterexamples are in this record.

Owner supplemental decisions: none supplied to this reviewer beyond the recorded release. Any intended change to governing cancellation ownership or canonical JCS policy must be recorded through the appropriate owner-authorized amendment rather than inferred from the failed candidate.

Apply 006 and 012: close the affected semantic subsystems and their dependencies, then re-review the whole cumulative packet, including unchanged dependent behavior. Fix additional in-scope defects with separate provenance. Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.

CHANGES REQUIRED
