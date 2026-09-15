# K1.1-correction-01 independent cumulative review — H1

**Reviewer/session:** OpenAI ChatGPT, **GPT-5.6 Sol**, High reasoning.  
**Date:** 2026-09-15, America/New_York.  
**Role:** independent reviewer of the K1.1 accepted-work correction. I did not implement payload C.  
**Session identifier:** not exposed to me.

## 1. Access and review binding

I had authenticated GitHub access to immutable repository files, commits, comparisons, source, tests and committed raw validation evidence. I did **not** have a usable local repository checkout in this review environment, so I did not independently rerun repository commands. Validation results below are therefore **inspected committed implementer runs**, not reviewer reruns. This is not an external-access blocker under 006 because the required pinned source, diff and raw evidence were available for inspection.

This review binds only to:

- **Original governing K1.1 base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
- **Historical reviewed H17:** `d93d7d2a0a59b31b3d74ceebfb036837150f729e`
- **Preserved reconciliation point / review-16:** `a8ac787b2a766d897c7bd85311c1b2aee53a1ca8`
- **Correction payload C:** `b898ae12f51917c48fef92496ca179773c7744d9`
- **Submitted correction candidate H1:** `1fd6cd05454ea66eff61b277b7328eedb5dd0a7f`
- **Correction contract:** `docs/development/work/K1.1-correction-01/contract.md`, revision 1
- **Inherited K1.1 contract:** `docs/development/work/K1.1/contract.md`, revision 5
- **Report:** `docs/development/work/K1.1-correction-01/implementation-01.md`
- **Evidence:** `docs/development/work/K1.1-correction-01/validation-01/`
- **Branch:** `codex/k1.1-correction-01-review-findings`

At review start, and again immediately before recording this review, the remote branch resolved exactly to H1. C→H1 is one administrative commit containing only the correction report, declared `validation-01/` attachments, and the 007 status transcription; it contains no source, test, contract, fixture, evaluator, threshold, configuration or script change. The final cumulative B→H1 comparison contains no `mental-model/**` diff: the correction payload has returned the entire 31-path mental-model drift to the governing B state while preserving the intervening history.

The unauthorized `f8926066728510b6354be0f79cc6c9ec0e27dd80` documentation commit reported by the implementer remains preserved in ancestry and is reverted by C. I found no trailing remote commit beyond advertised H1 and no current-tree contamination from that incident, so it is not a separate finding in this review.

## 2. Governing interpretation and cumulative coverage

I applied the B-pinned 006/007/008/012/015 process, the unchanged K1.1-C1…C10 contract, and the correction contract created from review-16. The correction contract is explicit that it adds no new acceptance criterion and may not weaken K1.1-C1…C10. Its required Driver-observation outcome is likewise explicit: dispatch and redelivery must remain safe under caller-observable Promise machinery, including species construction before continuation installation, and **no rejected Driver promise may escape as unhandled**.

I reviewed the cumulative B→H1 creation, ingress identity, value/JCS path, malformed-field handling, dispatch/redelivery, receipt, inspection and structural/documentation obligations, then reconciled the correction delta with review-15/review-16 and the report/evidence. I did not treat green tests or the implementer's closure table as dispositive where the asserted behavior itself contradicted the contract.

## 3. Substantial-improvement assessment — YES

This is a materially improved correction, not a stalled or cosmetic rerun.

Seven of the eight review-16 handoff findings are convincingly closed on this candidate:

- **K11-R15-ID-01:** CLOSED. The initial creation Event remains in the mailbox with the creation receipt but is no longer seeded into the producer-constructible post-creation `byInputId` replay/conflict domain. Reusing the creation-key text after creation is genuine ingress, so C2 and C6 no longer cross boundary identities or receipts.
- **K11-R15-DOC-01:** CLOSED. The cumulative B→C mental-model diff is empty and the report accounts for the remaining non-record documentation paths rather than retroactively treating the old drift as reviewed architecture.
- **K11-R15-DOC-02:** CLOSED. The documentation checker is extended over `mental-model/**`, including anchor validation, while the mental-model content itself is restored to B.
- **K11-R15-PROC-01:** CLOSED for this candidate. The historical ACCEPT/invalidation is preserved, the corrective packet is explicit, C/H scope is clean, and post-H17 docs are handled as payload rather than hidden in an administrative interval.
- **K11-R16-VAL-01:** CLOSED. The serializer window now covers the Array iterator prototype's `next`, relevant iterator-result shadows, and hostile prototype-chain insertion, while the approved `canonicalize@3.0.0` remains unmodified. The new tests and D2/D2b ablations distinguish the old wrong-byte behavior.
- **K11-R16-ID-01:** CLOSED. Non-text diagnostics contain revoked-Proxy `IsArray` failure, and request-envelope observation is own-only and total. The D3a/D3b ablations distinguish both the original and same-family ambient/inherited channels.
- **K11-R16-DOC-01:** CLOSED by restoration to B. The offending atomicity/durability prose is not present in the governing cumulative candidate, and this correction adds no replacement durability claim.

The 8/8 RED distinguishing-ablation battery is useful evidence of these corrections and of the ambient/own-instance portions of the Promise work. It does not, however, close the full Promise requirement below because H1 also contains a green test that deliberately asserts the prohibited remaining behavior.

## 4. Mandatory finding — K11-R16-DISP-01 NOT CLOSED

**Severity:** P1  
**Class:** semantic / Driver rejection observation / unauthorized contract weakening  
**Affected criteria:** K1.1-C4 and the correction's C5/redelivery safety requirement

H1 substantially narrows the original defect: ambient `Promise[Symbol.species]`, `Promise.prototype.constructor`, `Object.prototype[Symbol.species]`, configurable instance construction slots, throwing-`then` classification and Proxy confirm-read cases are now handled or contained. But the required outcome in the correction contract is broader than those cases and H1 knowingly leaves one allowed Driver result outside it.

The contradiction is direct:

1. The correction contract says K1.1-C1…C10 are inherited unchanged, must not be weakened, and under required correction item 4 says that dispatch and redelivery remain safe under Promise machinery such that **no rejected Driver promise escapes as unhandled**.
2. `ExecutionDriver.deliver` continues to allow `void | Promise<void>` with no exact-native-Promise restriction. A subclass instance is a `Promise<void>` at this boundary.
3. H1's `withDeliveryEnvironment` / `sanitizeInstance` deliberately do not neutralize an inherited Driver-authored subclass constructor/species path.
4. H1's own regression `R4-F4 a Driver subclass with a throwing static species is the documented fundamental limit` constructs an already-rejected Promise subclass whose static `Symbol.species` getter throws when armed. The test installs an `unhandledRejection` collector and then **asserts that exactly one unhandled rejection occurred**, matching the Driver rejection, while the attach failure is recorded separately.
5. The correction contract's KC1-DEC-5 and the implementation report then relabel that observed escape a “fundamental JavaScript limit.” That is an implementation limitation, not authority to replace the required external behavior. The same contract expressly says it may not weaken the inherited criteria or its own required correction.

The candidate therefore makes the prohibited counterexample a passing test. That is stronger evidence of non-closure than a missing test: H1 positively demonstrates that a rejected value permitted by the Driver interface can still escape process-level handling.

This is not a demand that arbitrary hostile JavaScript state be made mutable or sanitized at any cost. If the required no-escape behavior truly cannot be implemented for the currently allowed `Promise<void>` boundary without changing the Driver contract or another governing semantic rule, the correct process is **BLOCKED — ARCHITECTURE DECISION** with the smallest owner decision stated. It is not permissible for a corrective implementation to keep the unchanged/no-weakening declarations and then add an exception that contradicts the handoff it exists to close.

### Required outcome

Reconstruct the Driver-settlement observation path around the contract outcome, not around one additional species slot.

At minimum, the existing R4-F4 counterexample must change from an expected escape into a distinguishing safety oracle:

- a Driver returns an already-rejected `Promise<void>` subclass whose static `Symbol.species` getter becomes throwing after construction;
- a subprocess running with `--unhandled-rejections=strict` survives with exit 0;
- no `unhandledRejection` is observed;
- the delivery attempt is retained as an operational failure rather than a state transition;
- the Execution remains `RUNNING` with the same accepted intent, Activation ID, writer epoch, base revision, reserved batch and dispatch receipt;
- no Event is acknowledged;
- ordinary redelivery of the same exchange has the same no-escape property and does not reselect the batch.

The old behavior should be used as an ablation: removing the actual correction must make the strict subprocess fail or otherwise make the zero-unhandled oracle fail. Do not simply rename the current `unhandled.length === 1` case as a limit.

If satisfying this outcome requires an API/semantic change not authorized by K1.1-C1…C10, stop implementation and record `BLOCKED_ARCHITECTURE` with the precise conflict and smallest owner decision. Do not weaken the correction contract to fit the current implementation.

## 5. Prior-finding reconciliation

- `K11-R15-ID-01`: **CLOSED**.
- `K11-R15-DOC-01`: **CLOSED**.
- `K11-R15-DOC-02`: **CLOSED**.
- `K11-R15-PROC-01`: **CLOSED** on exact H1; the unauthorized intermediate commit is preserved/reverted and does not contaminate C/H1.
- `K11-R16-VAL-01`: **CLOSED**, including the same-family prototype-chain insertion follow-up.
- `K11-R16-ID-01`: **CLOSED**, including the same-family own-only envelope follow-up.
- `K11-R16-DISP-01`: **OPEN / NOT CLOSED**, narrowed to the unsafely observed Driver-authored Promise subclass path above.
- `K11-R16-DOC-01`: **CLOSED**.

Previously closed K1.1 families were reviewed cumulatively rather than treated as immune. I found no separate mandatory regression in the accessible cumulative pass.

## 6. Per-criterion verdicts

| Criterion | Verdict | Independent basis |
|---|---|---|
| **K1.1-C1** | **PASS** | Atomic creation, caller-scoped creation replay/conflict, text identity validation and initial Event retention remain intact; the initial Event is now correctly separated from ingress identity. |
| **K1.1-C2** | **PASS** | Post-creation Input-ID replay/conflict is again a genuine ingress-only domain; creation-key-text reuse works as fresh ingress with its own receipt. |
| **K1.1-C3** | **PASS** | One-observation snapshot/JCS identity is preserved and the iterator-`next` plus prototype-chain channels are closed without modifying the approved canonicalizer. |
| **K1.1-C4** | **FAIL** | `K11-R16-DISP-01` remains: an allowed rejected Promise subclass can escape as process-level unhandled before a rejection continuation attaches. H1's own R4-F4 test asserts the escape. |
| **K1.1-C5** | **FAIL** | Base exchange-identity/redelivery semantics remain intact, but the corrective handoff explicitly requires the same Promise-observation safety on redelivery. The shared `#deliver` path retains the open no-escape defect and no subclass-species redelivery safety oracle closes it. |
| **K1.1-C6** | **PASS** | Boundary-specific receipts remain immutable and the initial Event no longer causes a creation receipt to be returned by ingress. |
| **K1.1-C7** | **PASS** | Unsupported later-packet surfaces remain explicit refusals with no accepted-state mutation. |
| **K1.1-C8** | **PASS** | No Agent/Workflow discriminator is introduced by the correction. |
| **K1.1-C9** | **PASS** | Inspection remains scoped/inert and projects retained correction state without the reviewed value/identity regressions. |
| **K1.1-C10** | **PASS** | Target structural boundary and exact unmodified `canonicalize@3.0.0` remain intact; documentation checking is strengthened rather than the import/guard contract weakened. |

No criterion is deferred. No architecture blocker is declared by this review because the candidate has not demonstrated that the required behavior is impossible under the existing authorized boundary; the implementer must either close it or surface the genuine normative conflict through the established blocker path.

## 7. Evidence interpretation

I inspected the committed H1 validation material but did not independently rerun it. The report records clean typecheck; full test `2318/356/0`; conformance `1949/283/0`; kernel `260/55/0`; SDK `22/0`; architecture `362/37/0`; builder-docs `57/785/38`; and an eight-of-eight RED distinguishing-ablation battery. The ablation log shows named failures for creation/ingress overlap, iterator `next`, chain shape, revoked-Proxy classification, inherited envelope steering, ambient delivery-window removal, thenable confirm-read removal and instance sanitation removal.

That is meaningful evidence and is why this review records substantial improvement. It cannot establish the complete K11-R16-DISP-01 outcome because the candidate's R4-F4 test explicitly treats one unhandled rejected Driver promise as expected success. A green suite containing an assertion of the forbidden behavior is not evidence that the behavior was closed.

`test:evals` remains appropriately excluded because this correction reaches no Agent/model path. The lack of an independent shell rerun is not the cause of the verdict; the blocker is visible directly in the pinned contract, source and committed test oracle.

## 8. Compact 008 corrective handoff

| Field | Value |
|---|---|
| Packet | `K1.1-correction-01` |
| Original base | `777b9955fb3a443f700b4f3d1f4f2aef1869345b` |
| Reviewed payload | C `b898ae12f51917c48fef92496ca179773c7744d9` |
| Reviewed candidate | H1 `1fd6cd05454ea66eff61b277b7328eedb5dd0a7f` |
| Contract | correction revision 1; inherited K1.1 revision 5 |
| Substantial improvement | **YES** — seven of eight reconciliation findings close and the remaining defect is materially narrowed |
| Closed this review | `K11-R15-ID-01`, `K11-R15-DOC-01`, `K11-R15-DOC-02`, `K11-R15-PROC-01`, `K11-R16-VAL-01`, `K11-R16-ID-01`, `K11-R16-DOC-01` |
| Open mandatory finding | `K11-R16-DISP-01` **NOT CLOSED**, P1 |
| Criterion effect | C1 PASS; C2 PASS; C3 PASS; **C4 FAIL; C5 FAIL**; C6–C10 PASS |
| Required correction | zero-unhandled observation for every Driver result allowed by the current `void | Promise<void>` boundary, including hostile Promise subclass species, on initial dispatch and redelivery; or an explicit architecture blocker if that outcome requires unauthorized semantic/API change |
| Payload consequence | source/test and likely correction-contract clarification are payload: create fresh C2, rerun affected/full validation, then fresh H2/report/evidence |
| Successor | K1.2 remains held; `next_release: none` |
| Overall outcome | **CHANGES REQUIRED** |

## 9. Owner note

The run-to-run direction is healthy. The correction moved from eight independently confirmed defects to one narrow, reproducible P1 in a single semantic family, and the candidate's own test makes the residual boundary precise. A second fixing turn is justified under the owner's multi-turn rule; this is not evidence of no progress.

The historical H17 ACCEPT, reviews 15/16, the unauthorized intermediate documentation commit and this candidate must all remain preserved. Do not merge or release K1.2 from H1.

CHANGES REQUIRED
