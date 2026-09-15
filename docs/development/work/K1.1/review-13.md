# K1.1 independent cumulative review — H14

**Reviewer/session:** OpenAI ChatGPT, **GPT-5.6 Sol**, High reasoning.  
**Date:** 2026-09-15, America/New_York.  
**Role:** independent reviewer of the round-14 K1.1 candidate. I did not implement C11 or H14.  
**Session identifier:** not exposed to me.

## 1. Access and exact binding

I had authenticated GitHub access to immutable repository commits, comparisons, source, tests, reports and committed validation evidence. I did **not** independently rerun repository commands in a local checkout; validation results below are inspected committed implementer runs.

The submitted identities are:

- governing base B: `777b9955fb3a443f700b4f3d1f4f2aef1869345b`;
- semantic payload claimed unchanged: C11 `f117e6b47c4930af6735aaa3668b8b4c242fd76d`;
- prior rejected candidate H13: `7f34e5c135b119983a682e639f3d4d6da3bff7e5`;
- prior independent review record: `review-12.md`, commit `9d5256ebabf218a5ba11552326d0ec93bce10858`;
- submitted H14: `6eaccb4c8dc11d7bbac5e08d9175e742e4d29b9e`;
- contract revision 5;
- branch `codex/k1.1-create-reserve-async-dispatch`.

At review start the advertised remote branch resolved exactly to H14.

H14 itself has parent `620954d4492b5b4b2a1957c774fb44318718d753` and its **direct commit diff** is the claimed 13 administrative files: `implementation-14.md`, `validation-14/` (MANIFEST plus ten logs), and the K1.1 row in `007-work-packets.md`. That narrow statement is true.

However, independent cumulative review must bind the **candidate tree and its ancestry**, not only the last commit.

## 2. Round-14 evidence correction — K11-R10-EVID-01 CLOSED

The evidence mechanism defect from H13 is corrected.

`validation-14/01-tree-and-environment.log` now records a verbatim executable gate before it runs. The gate:

1. defines the target set as tracked `.ts` files directly under `packages/kernel/src`;
2. executes `git ls-files 'packages/kernel/src/*.ts'`;
3. sends that exact listing through `tee` to a file;
4. derives `OBSERVED_COUNT` from that file with `wc -l`;
5. prints the live observed count;
6. compares the live value against the expected invariant under `set -euo pipefail`.

The raw result lists the eleven expected files, prints `observed count: 11`, and reaches the PASS line. The H13 echo-into-measurement path and the recorded `test 11 = 11` tautology are absent.

The manifest also discloses deliberate auxiliary failure-path checks: a true gate exits 0; changing the expected value to 10 exits 1 without PASS; adding one line to the measured list yields observed 12 and exits 1. These are appropriate mechanism probes rather than claimed candidate evidence.

I therefore close **K11-R10-EVID-01** on the round-14 evidence mechanism.

The fresh C11 validation also reports the same green semantic counts as round 13, and X9 still rejects the coordinator-global-sequence mutation with 26 failures. I found no reason to reopen **K11-R12-ID-01** on C11.

## 3. Mandatory finding — K11-R14-PROC-01

**Severity:** P1  
**Class:** candidate identity / branch contamination / unvalidated architecture payload  
**Affected acceptance:** exact H14 candidate.

H14 is **not** an administrative-only candidate over C11, despite the handoff/report claiming that semantic payload C11 is the complete substantive tree.

Between `review-12` (`9d5256e...`) and H14, the branch contains:

1. `ddf24de5213a000241d04e531cad7d479104a761` — commit message `doc-improve`, parent H13;
2. merge commit `620954d4492b5b4b2a1957c774fb44318718d753`, whose parents are that `doc-improve` commit and `review-12`;
3. H14 itself.

The `review-12..620954d` cumulative delta contains broad `mental-model/**` changes, including canonical Layer-3 owners directly governing K1.1: `concepts/identity.md`, `concepts/core.md`, `concepts/state.md`, `concepts/values.md`, `mechanisms/creation.md`, `mechanisms/evidence.md`, `mechanisms/execution-cycle.md`, `mechanisms/lifecycle.md`, plus many other mental-model files.

The merge therefore brought the concurrent `doc-improve` architecture/documentation payload into the K1.1 packet branch before H14.

This creates four concrete problems:

1. **The exact H14 tree is not C11 plus administrative evidence.** C11→H14 contains the broad mental-model delta in addition to H13/review/evidence history.
2. **The report's cumulative allowlist is false.** `implementation-14.md` says the C11..H14 administrative range consists of the report, validation attachments and 007 update (with historical H13/review ancestry), but omits the intervening mental-model payload.
3. **Validation is bound to the wrong substantive tree.** Round-14 validation explicitly ran in a detached worktree at exact C11. It therefore did not validate the actual H14 candidate tree containing the merged mental-model changes.
4. **The changed files are architecture owners, not incidental generated files.** Under 006, architecture/document changes are substantive candidate changes; they cannot enter an evidence-only H while the candidate still claims unchanged payload identity.

This finding does **not** assert that the `doc-improve` content is semantically wrong. It may be useful work, and some changes may be editorial. The defect is that this unrelated architecture payload is present in the exact K1.1 candidate without being declared as payload, scoped to the packet, or validated/reviewed as part of the candidate.

The candidate cannot be ACCEPTED on evidence generated for a different tree.

### Required outcome

Produce a fresh reviewable candidate whose **effective tree** is scoped and whose payload identity matches what was actually validated.

The correction must preserve all published history; do not amend, rebase or force-push the existing H13/review-12/`doc-improve`/merge/H14 commits.

The concurrent `doc-improve` work must not be destroyed. Preserve it on its intended branch/history. For K1.1, either:

- continue from a clean branch/lineage that contains H13 + review-12 but excludes the unrelated `doc-improve` tree from the candidate, then attach regenerated round evidence; or
- create a new scoped payload commit that removes the unrelated architecture delta from the **effective K1.1 candidate tree**, with a fresh C and clean validation.

Do not merely claim that H14's final commit has 13 files; the reviewer must be able to prove the cumulative payload-to-candidate tree contains no undeclared substantive files.

If any mental-model changes are intentionally retained in the K1.1 candidate, they become substantive payload: name them, justify why they are in K1.1 scope, assign a fresh C, inspect their semantic effect against the contract, and run validation on that exact payload. The simpler expected outcome is to keep concurrent documentation work outside this packet candidate.

Before the next handoff, explicitly verify:

- exact parent/ancestry of the candidate;
- exact diff from the declared payload C to H;
- exact effective tree delta from the last reviewed scoped candidate;
- no unowned `mental-model/**` or other concurrent-work files are present;
- final validation ran on the exact declared payload tree;
- advertised remote SHA equals the new H.

## 4. Cumulative semantic reconciliation

On **C11 itself**, the cumulative K1.1 semantic conclusions from review-12 remain intact:

- K11-R12-ID-01 remains closed;
- K11-R10-EVID-01 is now closed by the regenerated round-14 evidence mechanism;
- all previously closed value, state, identity, dispatch, scope, immutability and structural findings remain supported by the fresh C11 test/ablation evidence inspected here.

The new finding is not a new Kernel semantic defect. It is an exact-candidate/process defect introduced after review-12 by branch history.

## 5. Per-criterion verdicts

The criteria below assess the intended K1.1 implementation payload C11 under the fixed B/contract. They do **not** waive K11-R14-PROC-01 or certify the undeclared mental-model delta.

| Criterion | Verdict | Basis |
|---|---|---|
| **K1.1-C1** | **PASS** | C11 creation identity/atomicity behavior unchanged; fresh C11 suite green. |
| **K1.1-C2** | **PASS** | Input-ID triple, replay/conflict and destination scoping unchanged; fresh C11 suite green. |
| **K1.1-C3** | **PASS** | One-observation/JCS/value-limit machinery unchanged and guarded by legacy ablations. |
| **K1.1-C4** | **PASS** | Dispatch reservation/asynchrony and per-Execution ordering remain intact on C11. |
| **K1.1-C5** | **PASS** | Ordinary redelivery remains exact and mints no new acceptance. |
| **K1.1-C6** | **PASS** | Scoped receipt/refusal ownership correction remains intact; X9 rejects the global sequence. |
| **K1.1-C7** | **PASS** | Later-packet surfaces remain explicit refusing surfaces. |
| **K1.1-C8** | **PASS** | No Agent/Workflow discriminator introduced in the target zone. |
| **K1.1-C9** | **PASS** | Inspection remains inert/scoped and free of the H12 sequence channel on C11. |
| **K1.1-C10** | **PASS** | Corrected inventory gate proves the 11-file/17-export C11 target-zone claim; exact canonicalize pin remains unchanged. |

No criterion is deferred and no architecture ambiguity blocks interpretation. The overall candidate nevertheless fails because 006 acceptance binds the exact H tree, not only the intended implementation criteria.

## 6. Evidence interpretation

Inspected round-14 C11 evidence reports:

- typecheck clean;
- `npm test`: 2,279 tests / 346 suites / 0 fail / 0 skipped;
- conformance: 1,949 / 283 / 0;
- kernel: 221 / 45 / 0;
- SDK: 22 / 0;
- builder docs: 26 files / 286 links+anchors / 38 imports;
- architecture: 362 / 37 / 0;
- packet inventory: 221 / 45 / 0;
- control green and 8/8 ablations rejected;
- X9 rejected by 26 cases.

These runs support C11. They do not validate the later merged `doc-improve` architecture tree present at H14.

`test:evals` remains appropriately excluded for C11 because no Agent/model path is changed.

## 7. Compact corrective handoff

| Field | Value |
|---|---|
| Packet | K1.1 |
| Base | `777b9955fb3a443f700b4f3d1f4f2aef1869345b` |
| Intended semantic payload | C11 `f117e6b47c4930af6735aaa3668b8b4c242fd76d` |
| Reviewed exact candidate | H14 `6eaccb4c8dc11d7bbac5e08d9175e742e4d29b9e` |
| Closed this round | `K11-R10-EVID-01` |
| Remains closed | `K11-R12-ID-01` and prior semantic findings |
| New open finding | **K11-R14-PROC-01 — P1** |
| Semantic criteria on C11 | C1–C10 PASS |
| Candidate defect | undeclared `mental-model/**` payload merged into exact H14 tree; validation/report bind C11 instead |
| Required correction | produce a scoped exact candidate and validate the exact declared payload tree; preserve concurrent doc work separately |
| K1.2 | held / unreleased |
| Overall outcome | **CHANGES REQUIRED** |

The candidate is not accepted, merged or released by this review.

CHANGES REQUIRED
