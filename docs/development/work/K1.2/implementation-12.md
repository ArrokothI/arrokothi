# Implementation report — K1.2, round 12

## Identity

- Packet/parent: K1.2 / K1; [contract](contract.md) revision 7 (distinguishing-power row updated 29 → 30 to name B14; no criterion, threshold, or obligation added, relaxed, or reworded). Governing 006/007/008/012 and B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Author: Muse Spark, implementer, 2026-09-25. This is not a reviewer session, not an acceptance, and not an integration or release.
- State: **WAITING_FOR_REVIEW**. This round is a narrow evidence/test correction against review 10. Independent review decides acceptance.
- Prerequisites unchanged: K1.1 accepted H `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; correction-02 accepted H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integrated `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. All precede B. No successor release. No K1.3 release.
- Branch: `claude/k1.2-outcome-acceptance-receipts`.
- Base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Previous payload C9: `ca0dc2b15b9b276175fe6f48893bc6231ee528a3`. Previous candidate H11: `870720c9731b6e72da55c616c06bf0f3187f6cee`. Review-10 record head: `35e8c9eac24338064c48963189e0d07998004bee` (review 10, CHANGES_REQUESTED; branch verified there before editing, no drift).
- New payload C10: `b1c2e3bdad1ab9352e8a95307593cce654bc3e3c` (`K1.2 C10: genuine lone-surrogate fixture, strengthened entitled-control oracle, B14 claim-only mutation`).
- Candidate H12: the commit containing this report; the external handoff supplies its full SHA and advertised remote identity after non-force push.
- H12 contains only this `docs/development/work/K1.2/implementation-12.md`, the `docs/development/work/K1.2/validation-12/` raw-evidence attachments (`01–12` plus `MANIFEST.txt`), and the K1.2 status-row update in `docs/development/007-work-packets.md`. H12 introduces no scripts, fixtures, configuration, contract, canonical, test, threshold, or other payload changes. No runtime implementation or semantic correction is smuggled into H.
- Push pending at report creation; it cannot certify its own future push.
- Owner supplemental decision: `decision-01.md` (carrier extension, 2026-09-25) only. No unresolved architecture authority question. No malformed-claim exemption encoded.

## Correction delta and cumulative packet

Correction delta `35e8c9e..b1c2e3b` (review-10 head to new payload) is exactly 3 payload paths:

| Path | Change |
|---|---|
| `packages/kernel/tests/submission-authority.test.ts` | Replace U+0001 fixture with genuine lone surrogate `\ud800` (2 occurrences: Case B badContent, Case C envelope); strengthen Case C oracle from writerEpoch-only to four concrete diagnostics plus retained-equality. No oracle weakened; no other test touched. |
| `docs/development/work/K1.2/ablations.mjs` | Add B14 claim-only-after-authority mutation. |
| `docs/development/work/K1.2/contract.md` | Distinguishing-power row 29 → 30, naming B14. |

`packages/kernel/src/coordinator.ts` is intentionally untouched in C10: per review-10's static finding the C9 refusal ordering (scope → replay/conflict → currency → reference-identity submission authority → content → atomic acceptance) is structurally sound and is preserved byte-for-byte (`faec31543686c02e416ecdcc531cc0bfec1e1f3a5d14ee0c6c9f8324bc413562` at C9 and C10).

Cumulative `B..C10` is the full K1.2 payload (prior kernel, tests, contract, decision, BASELINE, Layer-3 maintenance plus the R9 correction and this evidence correction). Cumulative `B..H12` adds the administrative range (H8/H9/H10/review-09/review-10 history plus new H12 report/status/evidence). The exact `C10..H12` allowlist is: `work/K1.2/implementation-12.md`, `work/K1.2/validation-12/*` (13 files), and the K1.2 row of `007-work-packets.md` only. Verified with `git diff --name-only C10 H12` after H12 exists; `git diff C10 H12 -- packages mental-model docs/development/002-implemented-kernel-baseline.md docs/development/work/K1.2/ablations.mjs docs/development/work/K1.2/contract.md` must be empty.

## Disposition of K12-R10-EVID-01

**Corrected.** Three parts:

1. **Genuine malformed fixture.** The Case B/C `next.error` fixture was the literal control character U+0001, which is a valid Unicode scalar and never produces `lone_surrogate`. Both occurrences are now the reviewer probe's unpaired surrogate `\ud800` (`submission-authority.test.ts:426,487`). Verified on clean C10: grant-holding missing-epoch + deep + duplicate + `\ud800` reports `writerEpoch not_a_count`, `too_deep` (depth limit 32), `duplicate_key`, and `next.error lone_surrogate` together; the same proposal grant-less returns `unauthorized_submission` with none of them in returned or retained reason. Case B's `lone_surrogate` negative assertions, previously vacuous, are now meaningful.

2. **Strengthened entitled-control oracle.** Case C previously asserted only classification `malformed_envelope` plus `/writerEpoch/`. It now asserts all four representative later diagnostics — `/writerEpoch not_a_count/`, `/too_deep/`, `/duplicate_key/`, `/next\.error lone_surrogate/` — plus whole-refusal state equality and retained-equals-returned. The pair is now explicit: absent/forged authority + malformed claim + representative invalid content → authority refusal with none of those diagnostics returned or retained (Case B); valid current authority + materially the same proposal → content refusal affirmatively reporting the malformed claim and the selected content defects (Case C).

3. **B14 claim-only mutation.** New packet ablation `B14 malformed claim reports only claim defects after authority` filters the post-authority content refusal to `writerEpoch`/`baseProgressRevision` paths, silently dropping content defects. It is REJECTED (457 → 428/29 on clean C10). The strengthened Case C fails under it; the previous writerEpoch-only oracle would have passed the malformed-claim arm (the claim path survives the filter), which is exactly the insufficiently distinguished behavior review-10 identified. (B14 also breaks well-formed-claim content tests since the filter empties their reasons; the targeted proof is Case C's new content assertions failing while its claim assertion still passes.)

## Corrections to implementation-11 overclaims

Implementation-11 remains sealed history; the following statements in it are superseded by the corrections above and must not be cited as established:

- Any description of the Case B/C fixture as `lone_surrogate`, `deep+dup+lone-surrogate`, or `triple-bad`: the fixture used U+0001 and established no lone-surrogate behavior. The genuine triple is established only by C10 evidence.
- The coverage-matrix claim that Case C proves "the same suppressed content becomes visible" and that "paired fixtures establish those concrete codes": C10 Case C now establishes it with four asserted diagnostics; implementation-11's oracle established only `writerEpoch`.
- Validation summary counts from C9 runs remain C9 evidence, not C10 evidence; the reviewable C10 evidence is `validation-12/` below. No C9 result is claimed as a C10 or H12 result.

## Disposition of K12-R10-VAL-01

**Corrected.** `validation-12/` (13 files) retains accessible raw output plus digests for the exact clean C10, in 006/008 permitted H evidence form (raw output-only attachments with manifest/digests):

| File | Command on exact clean C10 | Result |
|---|---|---|
| `01-tree-and-environment.txt` | status/rev-parse/branch/versions/date | C `b1c2e3b`, detached worktree, Node v25.2.1, npm 11.6.2, TS 5.9.3, macOS 26.6.2 arm64 |
| `02-typecheck.txt` | `npm run typecheck` | exit 0 |
| `03-test-full.txt` | `npm test` | exit 0; 2511/2511, 0 fail/cancelled/skipped/todo |
| `04-test-kernel.txt` | `npm run test:kernel` | exit 0; 457/457 |
| `05-test-conformance.txt` | `npm run test:conformance` | exit 0; 1945/1945 |
| `06-test-sdk.txt` | `npm run test:sdk` | exit 0; 22/22 |
| `07-check-builder-docs.txt` | `npm run check:builder-docs` | exit 0; 72 files, 1784 links/anchors, 38 imports |
| `08-ablations.txt` | `node docs/development/work/K1.2/ablations.mjs` | control 457/457; **30/30 REJECTED** incl. B10 (2 fails), B11 (1 fail), B12 (4 fails), B13 (1 fail), B14 (29 fails) |
| `09-reviewer-ablations.txt` | `node docs/development/work/K1.2/review-09/ablations-reviewer.mjs` | control 457/457; R1 REJECTED (4 fails incl. capacity + malformed variants); R2 NOT APPLICABLE (span superseded by C9 reordering; equivalent currency-before-authority pinned by Case D and A3); R3–R12 REJECTED |
| `10-probes.txt` | reviewer `probe-order.ts` + `probe-race.ts` (copies with absolute import rewritten to this checkout; logic otherwise byte-identical) | P1/P2/P2b/P2c all `unauthorized_submission` with no content in returned or retained reason; P3–P7 and race probes hold |
| `11-preservation-and-links.txt` | `checks-07.mjs` + `git diff --check`, Layer-3 allowlist, legacy-source emptiness, correction-delta listing, sealed review-09 untouched | checks-07 fails only on its two intentionally superseded pins (runtime bytes unchanged from H5; ablations/test-syntax unchanged — both superseded by the R9 correction and its evidence, recorded here); Layer-3 diff is exactly the 7 authorized paths; no legacy/SDK/agents/models/retrieval/interop change; `35e8c9e..C10` is the 3 payload files; `review-09/` untouched since C9 |
| `12-authority-and-candidate-context.txt` | sealed KC1-ARCH-1 decision excerpt, H6 stat/status, K1.2 range status, `B..HEAD` stat tail, authority-term grep | single canonical owner `execution-cycle.md#submission-authority`; no stale two-arg `deliver` outside sealed history; no per-delivery authority or universal token wording; `OPEN(K3.2)` in prose + §4 |
| `MANIFEST.txt` | `sha256sum` of the 12 evidence files + `git show C:path \| sha256sum` of payload/config files | all digests listed; each evidence file's `output-sha256` independently re-verifiable from its output section (spot-checked) |

Each evidence file records candidate C, base B, branch, cwd (`/tmp/k12-c10-valid`, a `git worktree` detached at C10 with copied `node_modules`; pre/post porcelain empty), exact commands with per-command exit codes, environment and config-sha256, UTC timestamps, output bytes and sha256. Clean-C validation is distinct from exact-H verification: the documentation gate on exact H12 (after H12 exists) is reported in the external handoff — exact H12 SHA, pre/post empty porcelain, exact `npm run check:builder-docs` command, exit, counts, digest — and is not embedded in H12.

## Refusal ordering and coverage (unchanged, re-verified)

Runtime graph is C9's, preserved: scope → replay/conflict (grant-free, generic reason) → currency (terminal, Activation, well-formed epoch/base `stale_exchange`) → reference-identity authority (`unauthorized_submission`, fixed text) → content (`capacity_exhausted`, then `malformed_envelope` covering `claim === null` plus all content defects) → atomic acceptance. Eager capture stays before replay for DEC-10 single observation; only claim numbers and identity-equality are used before authority. Review-10's static finding concurs; no redesign was performed.

Coverage matrix changes versus implementation-11: the `lone_surrogate` column is now genuinely exercised (fixture `\ud800`, asserted present in Case C and absent in Case B); Case C asserts four diagnostics instead of one; B14 adds the claim-only row. All other matrix rows (A/A-cap/B/D/replay) unchanged and re-passing.

## Prior findings

- `K12-R9-ORDER-01`: structurally corrected in C9; preserved byte-for-byte in C10; re-verified by probes and 30/30 ablations.
- `K12-R9-EVID-01`: improved by C9 coverage; its remaining gap (false fixture/overclaimed oracle) is closed by K12-R10-EVID-01 above.
- `K12-R8-DOC-01`, `K12-R7-PROC-01`, `K12-R6-DOC-01`, `K12-R6-EVID-01`, `K12-R6-LAYER3-01`: no new contrary evidence in the correction range; builder-docs gate green on C10.
- R1–R5 historical findings: closures stand by reference; re-exercised by the packet ablations.

Why earlier passes missed R10-EVID-01: the U+0001 character is invisible in review and valid under `values.md`, so the vacuous `lone_surrogate` assertions passed without exercising the intended path; Case C's writerEpoch-only oracle passed any post-authority malformed classification including claim-only filtering.

## Independent checks on the finished candidate

After tests and before packaging: verified B14 span uniqueness (1 occurrence), B14 rejection with Case C among the failures, R1 rejection with the genuine-fixture coverage among its 4 failures, `C10..H12` administrative allowlist (report + validation-12 + 007 row only; `git diff C10 H12 -- packages mental-model 002* ablations.mjs contract.md` empty), per-file digest re-verification, and sealed `review-09/`/`review-10.md` untouched. No new counterexample found; no runtime change required. A credible new defect would have been fixed with separate provenance before packaging.

## Handoff

K1.2 evidence correction is ready for independent review: base B `a20d278185eaffc7f8b7489345a3624231ff6e6d`, new payload C10 `b1c2e3bdad1ab9352e8a95307593cce654bc3e3c`, candidate H12 (commit containing this report; full SHA and verified advertised branch SHA in external handoff after non-force push), prior H11/review-10 history preserved. Reviewer: recheck cumulative B..H12, verify the C10..H12 allowlist, the MANIFEST digests against `validation-12/`, and the exact-H12 gate result in the handoff. No self-acceptance. No integration. No K1.3 release.
