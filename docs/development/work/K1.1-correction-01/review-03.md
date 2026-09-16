# K1.1-correction-01 independent review — round 3

**Verdict:** CHANGES REQUIRED  
**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-15  
**Original K1.1 base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`  
**Round-3 payload C2:** `fa8e092555c3835155d76b9ced5dc34c58bf4d70`  
**Round-3 candidate H2:** `9e3969c1106719b5ac2616778dbcf3613b972417`  
**Prior review:** `docs/development/work/K1.1-correction-01/review-02.md`  
**Owner architecture decision:** `docs/development/work/K1.1-correction-01/decision-01.md` (`KC1-ARCH-1`)  
**Correction contract:** revision 2

This review is an independent cumulative review of exact H2 against the original K1.1 base, the preserved correction history, correction contract revision 2, and the owner-delegated architecture decision. It does not self-accept later branch content and it does not release K1.2.

## 1. Review target and concurrent owner documentation

The review target is exact candidate H2 `9e3969c1106719b5ac2616778dbcf3613b972417`, whose parent is exact validated payload C2 `fa8e092555c3835155d76b9ced5dc34c58bf4d70`.

At review time the packet branch had advanced three commits beyond H2 through owner-authored `mental-model/**` edits. The owner explicitly instructed this review to ignore those later mental-model updates. An independent H2→then-current-head comparison showed only `mental-model/**` changes after H2; no package, test, script, correction contract, implementation report or validation artifact changed. Those post-H2 owner edits are therefore outside this candidate review. This review binds H2, not the later branch tip.

That exclusion does **not** exclude the four mental-model files intentionally carried by C2 under `decision-01`: those are part of exact H2 and remain reviewable candidate payload.

The reviewer inspected pinned GitHub source, diffs and committed validation evidence. No repository shell commands were independently rerun by the reviewer.

## 2. Run-to-run assessment

**Substantial improvement from round 2: YES.**

Round 2 was correctly stopped as `BLOCKED_ARCHITECTURE`: the old `void | Promise<void>` Driver return boundary admitted already-rejected Promise values whose construction slots could make every legal post-return handler attachment fail before the rejection reaction was installed. Round 3 no longer tries to sanitize that impossible family. It implements the owner-selected replacement boundary instead.

The semantic P1 has materially moved from unresolved architecture conflict to a narrow Kernel-owned reporting mechanism with deterministic tests and distinguishing ablations. The remaining problem found by this review is P2 current-state documentation/provenance only; it does not reopen the delivery mechanism.

## 3. Architecture decision and implementation

`KC1-ARCH-1` selects Kernel-owned delivery reporting. Exact C2 implements that decision:

- `ExecutionDriver.deliver` takes `(activation, settlement)` and returns `undefined`, not `void | Promise<void>`;
- the Kernel records the delivery attempt before Driver invocation;
- a fresh frozen `DeliverySettlement` is bound to that exact attempt;
- `delivered()` and `failed(reason)` are first-report-wins;
- synchronous Driver throw is an implicit failure only if no report already won;
- ordinary return without a report leaves the attempt `pending`;
- redelivery creates a new attempt/capability while preserving the exact Activation;
- a late capability can settle only the attempt it captured;
- the Kernel never reads, classifies, assimilates or subscribes to the Driver return value;
- no Promise-return compatibility path remains;
- delivery diagnostics are bounded and do not invoke arbitrary object getters/coercions/thenables.

The type boundary is deliberate: `undefined` rejects an ordinary async implementation that would still be assignable to a `void` return. The committed test has a valid synchronous Driver and an `@ts-expect-error` async Driver.

The coordinator implementation matches the decision's ordering. The `DeliveryAttempt` is appended before `driver.deliver` executes. The capability closes over that attempt, changes it only while `pending`, and is frozen. A report followed by a throw therefore preserves the report; a throw followed by a late report preserves the failure. The Driver return is intentionally ignored.

The architecture-specific regression suite covers delayed/no report, synchronous report and throw, duplicate/conflicting reports, capability integrity, hostile reasons, overlapping redelivery, Promise-construction pollution independence, inert hostile returned objects, strict-process Driver-internal async failure, and the compile-time async-return boundary.

### `K11-R16-DISP-01`

**CLOSED on exact H2 under contract revision 2 / `KC1-ARCH-1`.**

The prior finding was against the now-superseded Promise-observation requirement. The owner decision explicitly replaces that requirement rather than adding an exception to it. The exact H2 boundary contains no rejected Driver Promise observation path for the old hostile species/constructor family to exploit.

The strict subprocess oracle is directionally correct for the new ownership model: a conforming Driver handles its internal Promise rejection, reports failure through the capability on dispatch and redelivery, exits successfully under `--unhandled-rejections=strict`, and records zero `unhandledRejection` events. This is no longer an attempted proof that the Kernel can rescue arbitrary already-unhandled Driver-authored Promise objects; such objects are outside the new return contract.

## 4. Cumulative K1.1 criteria

Against correction contract revision 2 and the owner decision:

| Criterion | Verdict | Review basis |
|---|---|---|
| K1.1-C1 | PASS | Creation atomicity/scoped replay remains unchanged and cumulative cases remain green. |
| K1.1-C2 | PASS | Creation/ingress identity domains remain separated; retained R1 ablation rejects re-seeding the creation Event into ingress. |
| K1.1-C3 | PASS | Value/canonicalization hardening remains present; retained iterator-prototype ablation is RED. |
| K1.1-C4 | PASS | Kernel-owned reporting implements nonblocking dispatch, intent-before-invoke, failure evidence and decision-authorized async ownership. |
| K1.1-C5 | PASS | Redelivery preserves exchange identity/batch and creates attempt-local reporting capability; overlap oracle distinguishes wrong binding. |
| K1.1-C6 | PASS | Receipt/boundary separation remains intact; no delivery report acknowledges input. |
| K1.1-C7 | PASS | Refusal/inspection behavior remains cumulatively green. |
| K1.1-C8 | PASS | Boundary still carries no Agent/Workflow discriminator; inventory case remains green. |
| K1.1-C9 | PASS | Scoped inspection/evidence invariants remain intact. |
| K1.1-C10 | PASS | Landing-zone/dependency controls remain green; exact `canonicalize@3.0.0` remains the approved external. |

These semantic PASS results do not make H2 independently ACCEPTED because the candidate contains a current-state documentation contradiction described in §7.

## 5. Prior finding disposition

The seven findings independently closed in round 1 remain closed on H2:

- `K11-R15-ID-01` — CLOSED.
- `K11-R15-DOC-01` — CLOSED with the revision-2 authorized documentation scope replacing the earlier B-only rule where explicitly decided.
- `K11-R15-DOC-02` — CLOSED.
- `K11-R15-PROC-01` — CLOSED for the exact C/H lineage reviewed here.
- `K11-R16-VAL-01` — CLOSED.
- `K11-R16-ID-01` — CLOSED.
- `K11-R16-DOC-01` — CLOSED.

Round-2 findings:

- `K11-R16-DISP-01` — **CLOSED** under revision 2 / `KC1-ARCH-1` as described above.
- `KC1-R2-PROC-01` — **CLOSED**. The H2 status row no longer claims that all eight historical findings had already closed before DISP-01; it records seven historical closures and the revision-2 candidate separately.

New finding:

- `KC1-R3-DOC-01` — **OPEN, P2**. Exact H2 contains stale current-state documentation saying the architecture migration is still pending even though exact C2 already implements it.

## 6. Validation and distinguishing evidence

The committed validation-02 manifest binds immutable logs to exact C2 `fa8e092555c3835155d76b9ced5dc34c58bf4d70`.

Implementer evidence records all exit 0 / zero skips where applicable:

- typecheck clean;
- full suite: 2,322 tests / 356 suites / 0 fail;
- conformance: 1,949 / 283 / 0 fail;
- kernel: 264 / 55 / 0 fail;
- SDK: 22 / 0 fail;
- architecture: 362 / 37 / 0 fail;
- builder-docs: 57 files / 791 links+anchors / 38 imports;
- KC1-ARCH-1 focused cases green, including strict subprocess dispatch+redelivery;
- exact K1.1 case inventory green.

The distinguishing ablation battery is useful and directionally strong. All four new reporting-boundary mutations are RED:

- M1 normal-return-implies-delivered: 8 failing;
- M2 second-report-overwrites-first: 2 failing;
- M3 capability-targets-latest-attempt: 2 failing;
- M4 observe-returned-thenable: 1 failing.

Five retained non-delivery correction mutations also remain RED:

- R1 creation Event re-enters ingress domain: 3 failing;
- R2 inherited envelope read: 3 failing;
- R3 uncontained malformed-identity classification: 1 failing;
- R4 iterator `next` left hostile: 4 failing;
- R5 unfrozen receipt: 6 failing.

This is meaningful evidence that round 3 changed the intended mechanism rather than merely relabeling the old Promise path.

Independent C2→H2 comparison shows one administrative commit only: `implementation-02.md`, `validation-02/**`, and the one-row 007 WAITING_FOR_REVIEW transcription. No source, test, contract, threshold, configuration or script changed between validated C2 and H2.

The committed B-anchored scope guard for C2 records exactly the four decision-authorized mental-model paths and confirms `mental-model/deployment.md` restored to B. Later owner mental-model commits after H2 are outside this review by explicit owner instruction.

## 7. `KC1-R3-DOC-01` — current candidate says its completed migration is still pending (P2)

This is one current-state documentation consistency finding, not three separate semantic defects.

### 7.1 `docs/development/002-implemented-kernel-baseline.md`

The document says it describes the packet's candidate tree, then says the owner decision selects Kernel-owned delivery reporting but **the current candidate source still uses `void | Promise<void>` and Promise observation**, with migration outstanding and no executable behavior change.

That statement was correct at the decision-only point, but it is false on exact C2/H2. Exact C2 has `ExecutionDriver.deliver(...): undefined` and the coordinator no longer observes a returned Promise or thenable.

This also contradicts `implementation-02.md`, which says the 002 note records the target decision with its implementation gap closed by this payload.

### 7.2 `mental-model/mechanisms/execution-cycle.md`

The decision-authorized canonical delivery section still opens with:

> **Target revision:** selected for K1.1-correction-01; the current Promise-returning implementation must migrate before this contract is claimed as implemented.

Exact C2 already performed that migration. The remainder of the section correctly specifies the new boundary, but this current-state sentence incorrectly describes the candidate implementation beneath it.

This file is not excluded by the owner's instruction to ignore later mental-model edits: it is one of the four mental-model files deliberately included in C2 and therefore part of exact H2.

### 7.3 `mental-model/sources.md`

The decision provenance paragraph says the authorized target change is **pending implementation and independent acceptance**. On H2, implementation is no longer pending; independent acceptance/integration still are.

### 7.4 Why this blocks ACCEPT

These are not harmless historical quotations. `decision-01.md` itself is the historical decision record and should remain untouched. The contradictory sentences above live in current-state/canonical candidate documentation and describe the current implementation status incorrectly.

This repository's process has repeatedly treated current-state record fidelity as part of candidate review. Accepting H2 while its baseline/canonical sources say the implemented boundary is still the old one would recreate exactly the distinction the C/H/A discipline is intended to prevent: executable candidate and documentation candidate would describe different states.

The defect is P2 because the executable semantics and decision mapping are otherwise correct, but the exact H2 record is not internally truthful enough for independent ACCEPT.

## 8. Required correction

Do **not** reopen or redesign KC1-ARCH-1. No Kernel code/test semantic change is requested by this review.

Create a fresh docs-only payload because these current-state documentation paths are payload, not C→H review metadata:

1. correct `docs/development/002-implemented-kernel-baseline.md` to say the current correction candidate implements Kernel-owned delivery reporting / undefined-only Driver return, while independent acceptance and integration remain pending;
2. correct `mental-model/mechanisms/execution-cycle.md` so the delivery-reporting section no longer says the current implementation still must migrate; preserve the distinction that candidate implementation is not yet independently accepted/integrated;
3. correct `mental-model/sources.md` from “pending implementation and independent acceptance” to current truth: implemented in the correction candidate, pending independent acceptance/integration;
4. audit the K1.1-correction-01 paragraph in `mental-model/roadmap.md` for the same decision-session wording and change it only if it materially implies implementation is still outstanding;
5. leave `decision-01.md`, blocker-01 and historical reviews unchanged;
6. preserve the exact semantic source/test tree from C2 unless a genuinely new independent defect is found;
7. preserve the owner's later post-H2 mental-model rewrite commits as owner history, but do not silently fold those unrelated rewrites into the correction payload or claim they were validated as H2.

Because the corrected files are part of the payload/canonical documentation, produce a fresh C3, fresh pinned validation and a fresh H3 administrative wrapper. Re-run the full revision-2 validation plan, including the nine distinguishing ablations, so the next review can bind one exact cumulative candidate without relying on inferred tree equivalence.

## 9. Handoff

**Verdict: CHANGES REQUIRED.**

Semantic status is materially better than the previous round: all K1.1-C1…C10 pass under correction contract revision 2, `K11-R16-DISP-01` is closed by the owner-authorized boundary replacement, and `KC1-R2-PROC-01` is closed. The only open review finding is `KC1-R3-DOC-01` (P2 current-state documentation inconsistency).

No integration, E1 result, K1 close or K1.2 release follows. `next_release: none`.
