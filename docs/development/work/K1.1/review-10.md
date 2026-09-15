# Independent review — K1.1 round 12 (H12)

**Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol (High)  
**Date:** 2026-09-15  
**Role:** independent reviewer; I did not implement this correction.

## Candidate binding and access

This review binds only to:

- **B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
- **semantic payload C10:** `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14`
- **rejected H11:** `ccc0140ffca7fe2196cb80e57d6eb2d767666793`
- **review-09 record:** `4c03ce8b1190e4186da1407fda21951b2d32319e`
- **submitted H12:** `a047283523f7487cc025f4cf58d17028caad6389`
- **branch:** `codex/k1.1-create-reserve-async-dispatch`
- **contract:** `docs/development/work/K1.1/contract.md`, revision 5
- **report:** `docs/development/work/K1.1/implementation-12.md`
- **evidence:** `docs/development/work/K1.1/validation-12/`

At review start the advertised branch was exactly H12. H12 is one commit after review-09. The exact review-09→H12 delta contains only `docs/development/007-work-packets.md`, `implementation-12.md`, and `validation-12/*`; no production source, test, fixture, evaluator, threshold, configuration or contract file changes. The semantic payload therefore remains C10 byte-for-byte.

I inspected the pinned GitHub candidate/delta, the prior independent review records, the H12 implementation report, 007 transcription, the regenerated raw structural evidence, the fresh full/conformance/kernel/architecture outputs, and the distinguishing-ablation record through authenticated GitHub access. I do not have a local candidate checkout, so repository command executions below are inspected immutable implementer runs rather than reviewer reruns. Required source and raw evidence are accessible; this is not a 006 external-access blocker.

## Correction scope and prior-review reconciliation

Round 12 is correctly administrative/evidence-only. Review-09 left exactly one mandatory finding open:

- **K11-R10-EVID-01 — P2:** H11's regenerated `01-tree-and-environment.log` listed eleven tracked target source files but reported `file count: 12`, with no recorded command capable of explaining/reproducing the `12`.

Review-09 already kept K1.1-C1 through C10 at PASS, kept **K11-R7-STATE-03 CLOSED**, and closed **K11-R10-DOC-01**. Because C10 is unchanged, this review re-reconciles those cumulative verdicts against the fresh H12 rerun/evidence rather than treating the earlier PASS as permission to ignore dependent behavior.

## K11-R10-EVID-01 — CLOSED

H12 fixes the evidence defect at the measurement/process level rather than relabeling H11's bad number.

### Tracked target-source inventory

`validation-12/01-tree-and-environment.log` now defines the measured relation explicitly as **tracked `.ts` files directly under `packages/kernel/src`** and records the exact command:

`git ls-files 'packages/kernel/src/*.ts'`

The raw output names exactly:

1. `coordinator.ts`
2. `driver.ts`
3. `identity.ts`
4. `index.ts`
5. `inspection.ts`
6. `lifecycle.ts`
7. `own-array.ts`
8. `refusal.ts`
9. `result.ts`
10. `unsupported.ts`
11. `values.ts`

The same query is then piped to `wc -l` and reports `11`. A further executable self-check recomputes that count from the same tracked set, requires `11`, and records `SELF-CHECK PASS`. The evidence definition, command, names, count and summary now agree.

### Runtime export and dependency evidence

The barrel is imported directly and all 17 runtime names are printed. The command contains an assertion that exits nonzero unless the runtime export count is exactly 17, and the raw log records the assertion passing.

The exact dependency pin is visibly reproduced as `canonicalize` `3.0.0` with resolved tarball and integrity from the lockfile. The distinct-specifier extraction visibly yields only target-zone `./` internals, `node:buffer`, and `canonicalize`.

These measurements address the two prior evidence mistakes: source-line counting is no longer used as a runtime-export proxy, and the target file count is derived from the exact tracked relation being claimed.

### Evidence-generation fail-closed behavior

The report/manifest records generation under `set -euo pipefail`; the file-count agreement check, 17-export assertion, ablation fail-count/name reconciliation and post-revert cleanliness checks are fail-fast operations rather than later prose transcription. This is a meaningful correction of the repeated evidence-record failure mode.

The ten SHA-256 tokens in the H12 manifest are each 64 lowercase hexadecimal characters. The report states they were recomputed after finalization over the exact staged attachments. I did not independently recompute those SHA-256 values in this session; the raw payloads themselves are accessible and none of the semantic acceptance depends on a digest-only inaccessible artifact.

## Fresh validation/evidence assessment

The H12 evidence is a fresh rerun on detached clean C10, not a carry-forward of H11 logs.

Inspected raw results:

- `npm run typecheck`: clean;
- `npm test`: 2,265 tests / 345 suites / 2,265 pass / 0 fail / 0 skipped;
- `npm run test:conformance`: 1,949 / 283 / 1,949 pass / 0 fail / 0 skipped;
- `npm run test:kernel`: 207 / 44 / 207 pass / 0 fail / 0 skipped;
- SDK: 22 tests / 0 fail;
- builder-docs: 26 Markdown files / 286 links+anchors / 38 public imports;
- architecture suite: 362 tests / 37 suites / 362 pass / 0 fail;
- packet inventory: 207 / 44 / 0 fail;
- control + seven one-behaviour ablations: control clean and all seven weakenings rejected by named cases.

The H12 `09b` record materially improves reproducibility over H11: each committed ablation records its exact edit script, full diff, test output, parsed rejection and revert. I specifically inspected X4: it replaces the mailbox `appendOwn(record.mailbox, entry)` operation with an ordinary indexed assignment. The source-text guard and the dedicated inherited-setter ingress witness both fail, demonstrating the intended ownership invariant rather than an unrelated incidental failure. The worktree is then reverted and recorded clean at C10 before the next ablation.

The recorded X4 witness differs from H11 because H11 did not preserve the exact edit command/site. H12 does not falsely claim byte-identical witness identity; it discloses the substitution and separately discloses four exploratory scratch probes as non-evidence. That distinction is acceptable and does not weaken the semantic claim.

`npm run test:evals` was not run. That exclusion remains appropriate: neither C10 nor H12 changes Agent/model/eval behavior. No persistence, native Driver, packaging, release or E-gate result is claimed.

## Cumulative semantic reconciliation

C10 is the exact payload independently inspected in review-08 and re-reconciled in review-09. H12 changes no payload bytes. The fresh H12 evidence continues to exercise the dependent behavior that matters to those cumulative verdicts, including:

- atomic creation and scoped replay/conflict;
- Input-ID ingress identity/order and retention;
- one-observation boundary-value capture and JCS equality/limits;
- single-observation dispatch bound, reservation-before-send and asynchronous delivery;
- exact ordinary redelivery;
- immutable/scoped receipts and refusals;
- explicit refusal of later-packet surfaces;
- no Agent/Workflow discriminator and exact target-zone import boundary;
- inert scoped inspection/projection;
- own-data/index pollution controls and both K11-R7-STATE-03 descriptor-conversion directions.

No semantic finding is reopened by the H12 correction or its fresh evidence.

## Prior finding disposition

- **K11-R10-EVID-01:** **CLOSED** by the reproducible tracked-set inventory, executable count/export checks, corrected dependency/specifier commands, recorded ablation edit scripts and regenerated evidence.
- **K11-R10-DOC-01:** remains **CLOSED**; 007 records H11's review-09 verdict and H12 candidacy without reverting to stale C4/revision-4 prose.
- **K11-R7-STATE-03:** remains **CLOSED**; XA and XB continue to distinguish the installation and restoration directions, with the unmodified control green.
- Earlier K1.1 findings remain closed on the unchanged payload and fresh cumulative runs.

## Per-criterion verdicts

| Criterion | Verdict | Independent rationale |
|---|---|---|
| **K1.1-C1** | **PASS** | Atomic creation, scoped retry/conflict, READY state and retained initial input remain correct on unchanged C10; fresh cumulative tests pass. |
| **K1.1-C2** | **PASS** | Input-ID triple, replay/conflict ordering, scoping/capacity behavior and retained ingress remain correct; X4 demonstrates the mailbox ownership guard is distinguishing. |
| **K1.1-C3** | **PASS** | One-capture retained/canonical agreement, exact JCS substrate, refusal semantics and fixed limits remain correct; descriptor install/restore ablations remain distinguishing. |
| **K1.1-C4** | **PASS** | One bound observation, acceptance-order reservation, intent-before-send, pinned facts, one unresolved Activation and non-blocking Driver delivery remain correct. |
| **K1.1-C5** | **PASS** | Redelivery preserves the unresolved exchange exactly and excludes later arrivals. |
| **K1.1-C6** | **PASS** | Per-boundary immutable retained evidence and scoped reads remain correct. |
| **K1.1-C7** | **PASS** | Unlanded successor surfaces explicitly refuse without accepted-state mutation. |
| **K1.1-C8** | **PASS** | No Agent/Workflow discriminator; target-zone dependency boundary remains exact and is now reproducibly measured in H12 evidence. |
| **K1.1-C9** | **PASS** | Inspection/listing/redelivery remain scoped, inert and truthful under the prior ambient-pollution counterexamples. |
| **K1.1-C10** | **PASS** | Structural evidence now consistently and reproducibly establishes 11 tracked target `.ts` files, 17 runtime exports, exact `canonicalize@3.0.0`, private target package and permitted import surface. |

## Findings and coverage gaps

No mandatory finding remains for H12.

I did not independently rerun repository commands or independently recompute the manifest SHA-256 values. Those are access/execution limitations, not blockers: the complete pinned candidate/source and raw evidence are directly accessible, the raw outputs substantiate the required observations, and 006 explicitly permits acceptance from adequate immutable inspected evidence without a reviewer shell rerun.

## Verdict

Every K1.1 criterion C1–C10 passes for exact candidate H `a047283523f7487cc025f4cf58d17028caad6389` over unchanged semantic payload C10 `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14`, governing base `777b9955fb3a443f700b4f3d1f4f2aef1869345b`, contract revision 5.

Acceptance is for **H12 only**. It does not accept this review-record commit, does not integrate/merge the branch, does not close parent milestone K1, supplies no E1 result, and does not release K1.2. Owner-delegated final cleanup/integration/release handling remains separate under 006.

ACCEPT