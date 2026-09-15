# K1.1 independent cumulative review — H13

**Reviewer/session:** OpenAI ChatGPT, **GPT-5.6 Sol**, High reasoning.  
**Date:** 2026-09-15, America/New_York.  
**Role:** independent reviewer of the corrected K1.1 candidate. I did not implement C11.  
**Session identifier:** not exposed to me.

## 1. Access and review binding

I had authenticated GitHub access to immutable repository files, commits, comparisons, source, tests and committed raw validation evidence. I did **not** have a usable local repository checkout in this review environment, so I did not independently rerun repository commands. Validation results below are therefore **inspected committed implementer runs**, not reviewer reruns. This is not an external-access blocker under 006 because the required source and raw evidence were available for inspection.

This review binds only to:

- **Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
- **Prior rejected candidate:** H12 `a047283523f7487cc025f4cf58d17028caad6389`
- **Prior independent review:** `review-11.md`, recorded at `e2d62d1459fe662d8f0ef936f46216bde66eab3f`
- **Corrected semantic payload C11:** `f117e6b47c4930af6735aaa3668b8b4c242fd76d`
- **Submitted candidate H13:** `7f34e5c135b119983a682e639f3d4d6da3bff7e5`
- **Contract:** `docs/development/work/K1.1/contract.md`, revision 5
- **Report:** `docs/development/work/K1.1/implementation-13.md`
- **Evidence:** `docs/development/work/K1.1/validation-13/`
- **Branch:** `codex/k1.1-create-reserve-async-dispatch`

At review start the remote branch resolved exactly to H13. C11→H13 contains only the K1.1 007-row update, `implementation-13.md` and the declared `validation-13/` attachments; it contains no source, test, contract, fixture, evaluator, threshold or configuration change. The C11 semantic correction itself changes exactly nine packet files: `coordinator.ts`, `identity.ts`, `refusal.ts`, five existing tests and new `nondisclosure.test.ts`.

K1.0 prerequisite integrations remain ancestors of C11. K1.2 is not begun/released. No merge, integration or successor release is performed by this review.

## 2. Governing interpretation and cumulative coverage

I applied the B-pinned 006/007/008/012/015 process together with the canonical Layer-3 identity, evidence, creation and execution-cycle owners. The controlling identity rule says an acceptance position orders accepted facts within the **owning record/domain** and is **not a global clock**; lookup authenticates/scopes before revealing content or existence. The evidence owner likewise requires order per accepting domain and scoped field/existence disclosure.

I reviewed the cumulative B→H13 identity, creation, ingress, value, reservation, dispatch, replay, refusal, inspection and structural obligations rather than limiting the review to the implementer's proposed correction. I reconciled the correction with all prior K1.1 findings, inspected the changed source and direct consumers, the new nondisclosure oracle, C11 diff, H13 administrative allowlist, report, manifest and relevant raw logs.

## 3. K11-R12-ID-01 — CLOSED

The H12 finding was broader than `#acceptancePosition`: authorized evidence must not become an oracle for operations confined to inaccessible records/scopes.

C11 closes that defect class in the implemented K1.1 surface.

The previous coordinator-shared observable sequences are removed:

| Former channel | C11 behavior |
|---|---|
| receipt/refusal global position | accepted positions are owned by the Execution record; recorded refusals have a separate per-Execution refusal order |
| null/hidden/missing refusal advancement | no record is named, position is `0`, no observable sequence advances |
| `execution-N` | Execution identity is an injective function of the caller-scoped creation identity |
| `event-N` | Event identity is an injective function of the complete Input ID |
| receipt token using global position | token is a function of boundary, owning Execution ID and that Execution's acceptance position |

Creation consumes acceptance position 1 on its own Execution. Later ingress and dispatch consume that Execution's next accepted position. Exact replay and ordinary redelivery consume no new position and return retained evidence. A mailbox entry shares the acceptance position of the decision that admitted it.

The replacement identity construction preserves existing retry/equality rules: the same complete request identity deterministically reproduces the same identity; changed content under an already-bound identity conflicts; fresh scoped creation keys and distinct Input-ID triples remain distinct.

The new 14-case `nondisclosure.test.ts` is class-oriented rather than token-spelling-specific. It compares the complete authorized A transcript across otherwise identical schedules with and without hidden B interposition, including IDs, receipts, tokens, positions, replay/refusal results, inspection, visible-Execution listing and serializations. It covers accepted operations, attached and null-record refusals, multiple hidden Executions, same producer across hidden scope, same-scope sibling Executions, capacity, hidden-versus-missing and pre-first-A-operation windows.

The committed kernel run reports all 14 nondisclosure cases passing together with C6/C9 suites. The X9 ablation reintroduces a coordinator-global visible sequence and is rejected; the raw failure output shows the expected cross-arm divergence in receipt positions, tokens, mailbox positions, refusals and inspection.

I found no surviving K11-R12-ID-01 caller-visible channel in K1.1. **C6 and C9 are restored to PASS.**

## 4. Mandatory finding — K11-R10-EVID-01 REOPENED

**Severity:** P2  
**Class:** process / evidence integrity  
**Affected acceptance:** H13 evidence record, not C11 semantics.

H13's fresh `validation-13/01-tree-and-environment.log` records this target-zone inventory:

```text
$ git ls-files packages/kernel/src/*.ts
packages/kernel/src/coordinator.ts
packages/kernel/src/driver.ts
packages/kernel/src/identity.ts
packages/kernel/src/index.ts
packages/kernel/src/inspection.ts
packages/kernel/src/lifecycle.ts
packages/kernel/src/own-array.ts
packages/kernel/src/refusal.ts
packages/kernel/src/result.ts
packages/kernel/src/unsupported.ts
packages/kernel/src/values.ts
      12
$ test 11 = 11
SELF-CHECK PASS: listed set and reported count agree (11 tracked .ts files directly under packages/kernel/src)
```

The raw artifact therefore presents eleven filenames, a displayed count of **12**, and then a check comparing the literal value `11` with literal `11`. It does not record the claimed recomputation of the measured tracked set.

That directly contradicts both `implementation-13.md` and `validation-13/MANIFEST.md`, which state that the count was taken from the same command output, that the check recomputes that same measurement, and that the representations agree.

This is not merely lack of reviewer rerun access: the committed evidence is internally contradictory.

It is also a direct recurrence of **K11-R10-EVID-01**. H12 had closed this defect by recording an explicit count-producing command and a self-check whose value came from the tracked-set query. H13 regresses from that observable binding to a displayed `12` plus a tautological `test 11 = 11`.

Independent inspection of H13's actual GitHub target source directory still supports the substantive structural conclusion that the zone contains eleven `.ts` files. I therefore do **not** turn this into a semantic C10 failure. The failure is that H13's mandatory evidence/report claims a fail-closed measurement that its own raw attachment does not contain.

Under 006, contradictory required evidence is a mandatory correction. Prior closure does not immunize the evidence subsystem when fresh evidence demonstrates recurrence.

### Required outcome

Produce a fresh candidate whose raw structural evidence, manifest and report are mutually consistent and reproducibly bind the claimed tracked source set to its measured count.

The raw evidence must make it possible to see that the count is derived from the same defined tracked set whose filenames are shown, and that the fail-closed check actually depends on the observed/recomputed measurement rather than hard-coded equal literals.

Do not manually repair only the displayed `12` while retaining an unverifiable provenance path. Preserve H13 and all earlier evidence/review records immutably.

If production source, tests, contract, configuration, fixtures, evaluator rules and thresholds remain untouched, C11 may remain the semantic payload. Because evidence attached after H13 creates a different candidate, the corrected handoff still requires a fresh H and independent review under 006.

## 5. Prior-finding reconciliation

- **K11-R12-ID-01:** CLOSED by C11 ownership correction and class oracle.
- Previously closed semantic families remain closed on this cumulative candidate: value-copy fidelity; one-observation/canonical-byte identity; hostile ambient operations and descriptor conversion; hidden-versus-missing lookup normalization; K1.3 cancellation scope; exact canonicalize substrate; dispatch-bound single observation; retained evidence immutability; and unlanded-surface refusal.
- Seven legacy distinguishing ablations are recorded as rejecting again, and the affected source paths are not weakened by C11.
- **K11-R10-EVID-01:** REOPENED on new H13 evidence for the contradiction above. This is a new H13 evidence failure, not a rewrite of H12's historical record.

## 6. Per-criterion verdicts

| Criterion | Verdict | Independent basis |
|---|---|---|
| **K1.1-C1** | **PASS** | Creation remains atomic and caller-scoped; deterministic derived Execution/Event IDs preserve scoped retry/conflict/fresh-key behavior without shared-counter leakage. |
| **K1.1-C2** | **PASS** | Input-ID triple, replay/conflict, destination scoping, terminal/capacity rules and retained ingress are preserved; Event identity derives from the complete triple. |
| **K1.1-C3** | **PASS** | C11 does not disturb the one-observation value/JCS/limit machinery; cumulative guards and regressions remain present and green in inspected evidence. |
| **K1.1-C4** | **PASS** | Reservation, pinned intent, one unresolved exchange, intent-before-send, bound handling and Driver nonblocking/failure behavior remain intact; dispatch consumes only its owning Execution's order. |
| **K1.1-C5** | **PASS** | Redelivery returns the exact unresolved exchange, receipt and batch without reselection or new acceptance position. |
| **K1.1-C6** | **PASS** | K11-R12-ID-01 is closed: receipts are boundary-specific, immutable, exact on replay and no longer expose cross-Execution/global activity; hidden/missing null-record refusals are indistinguishable including position. |
| **K1.1-C7** | **PASS** | Later-packet surfaces remain explicit refusals and mutate no accepted state. |
| **K1.1-C8** | **PASS** | No Agent/Workflow discriminator is introduced; the correction changes only identity/order ownership. |
| **K1.1-C9** | **PASS** | Inspection remains inert and principal-scoped; its receipts/refusals/mailbox projections no longer carry the H12 cross-scope sequence channel. |
| **K1.1-C10** | **PASS** | Independent pinned-tree inspection supports the eleven-file target zone and unchanged exact `canonicalize@3.0.0` boundary. The raw H13 inventory artifact is defective evidence and separately blocks H13 through K11-R10-EVID-01. |

No criterion is deferred and no architecture decision is blocked.

## 7. Evidence interpretation

I inspected, but did not independently rerun, the H13 validation material. The committed results report:

- typecheck clean;
- full test 2,279 tests / 346 suites / 0 fail;
- conformance 1,949 / 283 / 0;
- kernel 221 / 45 / 0;
- SDK 22 / 0;
- builder-doc checks 26 files / 286 links+anchors / 38 imports;
- architecture 362 / 37 / 0;
- packet inventory 221 / 45 / 0;
- eight of eight distinguishing ablations rejected.

Those are useful semantic evidence. They do not erase the direct contradiction in the fresh structural inventory artifact.

`test:evals` remains appropriately excluded because K1.1/C11 introduces no Agent/model behavior path.

## 8. Compact 008 corrective handoff

| Field | Value |
|---|---|
| Packet | K1.1 |
| Base | `777b9955fb3a443f700b4f3d1f4f2aef1869345b` |
| Reviewed payload | C11 `f117e6b47c4930af6735aaa3668b8b4c242fd76d` |
| Reviewed candidate | H13 `7f34e5c135b119983a682e639f3d4d6da3bff7e5` |
| Contract | revision 5, unchanged |
| Closed this review | `K11-R12-ID-01` |
| Open mandatory finding | `K11-R10-EVID-01` **REOPENED**, P2 |
| Semantic criteria | C1–C10 PASS |
| Required correction | fresh internally consistent, measurement-bound raw evidence/report/manifest |
| Payload consequence | C11 may remain unchanged if no semantic/test/config/etc. payload changes |
| Successor | K1.2 remains held |
| Overall outcome | **CHANGES REQUIRED** |

## 9. Owner note

This recurrence is localized to the evidence-generation/checking path, not the semantic implementation. The C11 nondisclosure correction is substantive and correct on this review. However, the same evidence-integrity family has now recurred after an explicit H12 closure, including the earlier eleven-names/twelve-count shape. If another attempt in this evidence path produces the same class of contradiction, independently reconstruct or switch the evidence-generation step rather than continuing transcription-level repairs.

The candidate is not accepted, merged or released by this review.

CHANGES REQUIRED
