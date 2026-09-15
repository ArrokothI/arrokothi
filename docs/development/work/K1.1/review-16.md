# K1.1 reconciliation review — H17 invalidation and corrective handoff

**Reviewer/session:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning, owner-requested reconciliation of the Opus review and the supplied Arena.ai review.
**Date:** 2026-09-15, America/New_York.
**Role:** independent verification/reconciliation. I did not implement H17 or the post-H17 branch changes.

## 1. Identity, source access and limits

- **Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Payload C13:** `98d6cebcd5861e42c843fab65516829c8818bff8`.
- **Reviewed candidate H17:** `d93d7d2a0a59b31b3d74ceebfb036837150f729e`.
- **Historical ACCEPT record:** `review-14.md`, recorded at `4309c3bd87380ad965fb7096c4f20da7e85f0ec8`; preserved as historical acceptance of H17 only.
- **Second independent contrary review:** `review-15.md` (Claude Opus 5), committed at branch tip parent lineage and reaching `CHANGES REQUIRED`.
- **Third-review material supplied by owner:** Arena.ai report titled `K1.1 independent review — third-review request, exact H17`, also reaching `CHANGES REQUIRED`.
- **Current packet branch observed before this record:** `codex/k1.1-create-reserve-async-dispatch` at `f9ebbcbe05041991a65aea7ad215a7f1520d9d0f` (`opus-find`).
- **Contract:** `docs/development/work/K1.1/contract.md`, revision 5 at H17.
- **Policy:** 006/007/008/012/015 as pinned by the packet.

I inspected the pinned H17 source and current branch through authenticated GitHub access, including `packages/kernel/src/coordinator.ts`, `packages/kernel/src/values.ts`, the K1.1 contract, the relevant mental-model pages, the 006/007/008 process records, H17→A scope and B→C13 scope. I did **not** independently rerun Node/npm tests or the Arena probe programs. The Arena report references `review-15-evidence/*`, but those files are not present on the packet branch and were not separately supplied with the pasted report. Therefore this review does not claim its exact subprocess exit codes or raw logs as independently rerun evidence. The defect mechanisms below are nevertheless established directly by the pinned source and governing contract.

## 2. Reconciliation result

All substantive findings from `review-15.md` and all four Arena findings are valid. The two reviews used the same internal finding prefix `K11-R15-*` independently; in particular they both used `K11-R15-ID-01` for different defects. To keep repository provenance unambiguous, the Opus IDs remain unchanged and the Arena findings are re-keyed below as round-16 findings.

### Carried from `review-15.md` (Opus) — confirmed

#### K11-R15-ID-01 — P2 — creation consumes an ingress Input-ID key

**Confirmed.** `createExecution` constructs the initial `InputId` as `(caller.namespace, executionId, creationKeyText)`, inserts that entry into `record.byInputId`, and attaches the **creation** receipt. `submitInput` later constructs exactly the same triple from `(caller.namespace, destination, requestKey)`. A producer that legitimately submits `requestKey === creationKeyText` therefore collides with an initial Event it never submitted through ingress. Equal content replays a creation-boundary receipt through the ingress boundary; different content is refused as a conflict.

This contradicts K1.1-C2's post-creation Input-ID identity and K1.1-C6's explicit rule that no receipt from one boundary is returned for another. The correction should separate initial-event identity from producer-constructible post-creation ingress identity rather than weaken C6.

#### K11-R15-DOC-01 — P1 — cumulative Layer-1/2 documentation was undeclared

**Confirmed.** B→C13 contains changes to six `mental-model/**` paths, including `kernel.md`, `runtime.md` and `deployment.md`, while `implementation-17.md` states that no Layer-3 owner changed and that the only documentation touched besides packet records is the K1.1 007 prose/row plus the retained `driver.md`. The cumulative candidate therefore contains documentation payload not honestly accounted for by the active report. This violates 006/008 cumulative review and reference-maintenance requirements even where the prose is otherwise correct.

#### K11-R15-DOC-02 — P2 — broken canonical cross-reference

**Confirmed for H17 and still present in the current branch.** `mental-model/concepts/core.md` links to `../README.md#a-report-that-needs-publication`, while the target heading is `## Example: A report that needs publication`, whose anchor is `#example-a-report-that-needs-publication`. `check:builder-docs` does not cover this tree. The link must be repaired and mental-model link/anchor validation added or extended so the class is mechanically checked.

#### K11-R15-PROC-01 — P1 — H17→A contains payload and the authoritative status is stale

**Confirmed.** H17→A `4309c3bd...` changes both `review-14.md` and `mental-model/driver.md`, so the acceptance administrative window contains substantive documentation payload contrary to 006. The current `docs/development/007-work-packets.md` still records K1.1 as `WAITING_FOR_REVIEW` and its surrounding prose says none of the candidates is accepted, despite historical `review-14.md` ACCEPT and the later contrary reviews. The branch also contains additional post-H17 documentation commits; they are not covered by H17 acceptance and must be treated as declared payload in the correction, not smuggled into an administrative window.

### Arena findings — confirmed and assigned unique round-16 IDs

#### K11-R16-VAL-01 — P1 — serializer window leaves Array iterator `next` caller-steerable

**Source:** Arena `K11-R15-VAL-01`; re-keyed here to avoid collision.

**Confirmed.** `values.ts` audits the exact JCS dependency and restores `Array.prototype[Symbol.iterator]`, but does not capture, restore or otherwise neutralize the `next` method on the Array iterator prototype returned by that function. The dependency's `for (const key of Object.keys(object).sort())` obtains `next` from that iterator object/prototype. Caller observation earlier in the same acceptance can therefore mutate the iterator prototype's `next`; the later serializer window restores the iterator-producing function but leaves the mutated `next` active.

That violates K1.1-C3's one-observation invariant: canonical bytes/size can describe a different logical value from the retained snapshot. Because creation/input identity, replay/conflict, dispatch projection and inspection depend on those bytes, closure must trace all dependent paths, not only direct `canonicalize` output. Preserve the approved unmodified `canonicalize@3.0.0` dependency and host-state restoration.

#### K11-R16-ID-01 — P2 — malformed non-text identity diagnostics can throw on revoked Proxy

**Source:** Arena `K11-R15-ID-01`; re-keyed here to avoid collision with Opus `K11-R15-ID-01`.

**Confirmed.** `acceptIdentityText` classifies non-string values with `PrimordialArrayIsArray(value)` before recording the malformed-value issue. Capturing `Array.isArray` does not make the operation total: `Array.isArray(revokedProxy)` throws `TypeError`. `createExecution` and `submitInput` call this function without a surrounding containment boundary for that operation, so caller-owned malformed identity fields can escape as exceptions rather than the contract-required located `malformed_value` refusal.

Fix the diagnostic/observation family, not only one Proxy spelling. Preserve scope-before-authorization ordering, hidden/missing behavior, zero accepted-state/receipt mutation, and retained refusal evidence when an Execution is reachable.

#### K11-R16-DISP-01 — P1 — captured Promise methods still expose `@@species` before rejection handling

**Source:** Arena `K11-R15-DISP-01`; re-keyed here.

**Confirmed.** `#deliver` uses captured `Promise.resolve` and `Promise.prototype.then`, but a native `then` still performs `SpeciesConstructor` for the result promise. A caller-observation side effect can install a throwing `Promise[Symbol.species]` getter. If the trusted Driver returns an already-rejected native Promise, the captured `then` can throw while constructing the chained promise **before** attaching the rejection handler. The coordinator catches the synchronous species error and marks the delivery failed, but the original rejected Driver promise remains unhandled.

K1.1-C4 requires Driver throw/rejection to remain an operational delivery failure with the accepted intent/reservation intact, not process-level unhandled rejection. Close the complete promise-observation operation for initial dispatch and redelivery; preserve Activation/epoch/base/batch/receipt and no-acknowledgment guarantees.

#### K11-R16-DOC-01 — P2 — atomic acceptance is stated as durability

**Source:** Arena `K11-R15-DOC-01`; re-keyed here.

**Confirmed and still present on the current branch.** `mental-model/kernel.md` says that because progress/output/action intents commit atomically, "there is always a well-defined, durable state to reconstruct after a crash." Atomicity does not imply persistence/durability, and the very next section correctly narrows crash survival to a persistent deployment. K1.1 itself explicitly makes no persistence/process-failure claim.

Correct the prose so atomic acceptance guarantees a coherent accepted state **if the storage profile preserves it**; crash reconstruction/durability belongs only to persistent deployment assumptions. Do not implement persistence in this correction.

## 3. Combined affected criteria and closure expectations

The executable findings affect at least C1/C2/C3/C4/C6/C9 as described by the two source reviews; C5/C7/C8/C10 remain independently plausible but must be re-reviewed cumulatively because 006 does not grant immunity to previously passed subsystems. The documentation/process findings are separately blocking under 006/008.

Required correction work must therefore cover, as one semantic reconstruction rather than narrow patches:

1. boundary-value snapshot → canonical bytes/size → identity/replay/conflict → retained/projection consistency, including indirect iterator abstract operations;
2. every identity-text diagnostic/refusal path reachable from caller-owned request fields;
3. Driver delivery observation under ambient Promise-construction hooks, for first dispatch and redelivery;
4. separation of creation's initial Event identity from producer-constructible post-creation Input IDs and receipt boundaries;
5. cumulative B→new-C documentation accounting, correct durability wording, repaired canonical links and an actual mental-model link/anchor check;
6. C/H/A/status discipline, including explicit treatment of post-H17 documentation as payload and a truthful 007 status/history row.

Add distinguishing regressions for each concrete counterexample and nearby family, then rerun the full packet evidence required by 006/008/012. Do not weaken the contract or approved JCS substrate to make tests pass.

## 4. Accepted-work invalidation and corrective-packet decision

`review-14.md` remains a historical ACCEPT of exact H17. This record does not rewrite or erase it. New contrary evidence establishes that H17 did not in fact satisfy mandatory K1.1 obligations. Under 006's accepted-work invalidation rule, affected K1.1 claims/integration are therefore **on hold**, no dependent K1.2 release follows, and correction must proceed through a linked corrective packet before implementation is treated as a new review candidate.

The next coding session should establish `K1.1-correction-01` (contract/status/handoff) and a scoped correction branch from the preserved current history, then implement the combined open findings above. The corrective contract must preserve original K1.1-C1…C10 and their governing sources; it may add coverage/provenance but must not weaken them. The new cumulative review must be anchored at the original K1.1 base B as well as the correction delta.

## 5. Compact 008 handoff

```text
Correct accepted-work invalidation for K1.1 through a new linked corrective packet K1.1-correction-01.
Original K1.1 base 777b9955fb3a443f700b4f3d1f4f2aef1869345b; reviewed H17 d93d7d2a0a59b31b3d74ceebfb036837150f729e.
Historical ACCEPT review-14.md is preserved; contrary reviews are review-15.md and review-16.md.
Open findings: K11-R15-ID-01, K11-R15-DOC-01, K11-R15-DOC-02, K11-R15-PROC-01,
K11-R16-VAL-01, K11-R16-ID-01, K11-R16-DISP-01, K11-R16-DOC-01.
Required outcomes/counterexamples are in review-15.md and review-16.md. Owner supplemental decisions: none.
Unresolved semantic authority: none; do not weaken C1-C10 or replace the approved unmodified canonicalize@3.0.0 substrate.
Apply 006/008/012: reconstruct affected semantic families and dependencies, add distinguishing regressions,
validate a fresh payload C, report a fresh H, and re-review the whole cumulative packet from original base B plus correction delta.
Account for all post-H17 documentation as payload, repair 007 status/provenance, and keep K1.2 unreleased. No successor release.
```

## 6. Verdict

**CHANGES REQUIRED for H17; historical review-14 ACCEPT retained but invalidated for current claims.**

Corrective packet required before the next implementation candidate.
