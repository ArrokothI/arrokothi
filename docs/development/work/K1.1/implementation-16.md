# Implementation report — K1.1, round 16

## Identity

- **Packet / parent:** K1.1 / K1. **Contract:** [contract.md](contract.md), **revision 5 (unchanged).**
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (B), including
  006/007/008/012/015 as they stand there.
- **State:** correction loop `IN_PROGRESS`; `WAITING_FOR_REVIEW` is claimed on the basis below, only
  after the open P1 finding's lineage was unified onto a single branch and the resulting fresh
  payload was validated exactly. No self-acceptance. **Owner release:** explicit instruction on
  2026-09-14 ("Let's release K1.1") through
  [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent); correction rounds on a released
  packet need no renewed permission under 006. The single-branch unification itself was an
  explicit owner instruction this round ("make them one ... push to the origin branch").
  **Do not release or begin K1.2.**
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, integrated as `main` PR #21 /
  `9baff3a03662720af6eefe1ecfabc41fde99298f`, receipts [K1.0](../K1.0/integration-01.md) and
  [K1.0-correction-02](../K1.0-correction-02/integration-01.md), ledger-reconciled by `main` PR #26 /
  `05f48c204d1eae021b3464c206e5c11e84bb3505`. All verified as ancestors of the C12 checkout in
  [`01-tree-and-environment.log`](validation-16/01-tree-and-environment.log).
- **Branch (single, as directed):** `codex/k1.1-create-reserve-async-dispatch`. The round-15 scoped
  branch's records were merged into it and the scoped branch deleted afterwards (local and
  remote); the branch list at handoff shows this one packet branch only. No force-push, no amend,
  no rebase, no reset, no deletion of any packet commit anywhere.
- **Base commit B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Payload C12 (NEW, administrative):** `37ee8c39ebfcce797bafb67faecae01e55fab89f`,
  a merge with exactly two parents — the doc-improve revert `2f931c1` (revert of `620954d`
  relative to its review-12 parent, `-m 2`) and scoped H15 `7851595`. Its substantive tree is
  byte-identical to C11 `f117e6b47c4930af6735aaa3668b8b4c242fd76d`: no non-docs path differs
  (`C11..C12 -- . ':!docs'` names nothing) and zero content bytes differ in
  `mental-model`/`packages`. No production source, test, fixture, evaluator, threshold,
  configuration or contract change exists in this round; the fresh C exists because the
  unification itself moves tracked architecture files at the tip (the revert), which under 006
  is payload and is therefore validated exactly rather than asserted equivalent. The rerun below
  reproduces every round-13/14/15 count exactly with all eight ablation rejections intact.
- **Authoritative review record:** review-13 (OpenAI ChatGPT, GPT-5.6 Sol, High reasoning,
  2026-09-15; `CHANGES REQUIRED` on K11-R14-PROC-01 only), recorded at
  `45402e0837b303a5724314f5d5f2721a6da6f257` — now an ancestor on the single branch, with its
  record file at [`review-13.md`](review-13.md) alongside all prior records.
- **Previously reviewed candidates and reviews, all preserved as ancestors on the one branch:**
  C `8cd9e269` / H `0f345b3c` / review-01; C2 `6b7e5fb0` / H2 `297cc56f`; C3 `615cdf88` /
  H3 `b3cdf337` / review-02; C4 `1d4e4867` / H4 `156f1353` / review-03 + supplement-01;
  C5 `e0660eff` / H5 `bd2dab6d` / review-04; C6 `b3d0d59f` / H6 `417798a3` / review-05;
  C7 `e59bd312` / H7 `ae02c32a` / review-06-supplement-01 + review-06; C8 `79151afc` /
  H8 `c1e7d78a` (superseded before review, preserved); C9 `5ac76207` / H9 `5dddc2ad` /
  review-07; C10 `d1fcffd` / H10 `2cdb1e2` / review-08; H11 `ccc0140` / review-09;
  H12 `a0472835` / review-10 (ACCEPT for H12 only) / review-11 (CHANGES REQUIRED,
  K11-R14-PROC-01's predecessor K11-R12-ID-01); C11 `f117e6b4` / H13 `7f34e5c1` / review-11-record
  `e2d62d1` / review-12-record `9d5256e` (CHANGES REQUIRED, evidence only);
  `ddf24de` (doc-improve, preserved in history) / merge `620954d` (preserved) /
  H14 `6eaccb4` (CHANGES REQUIRED, preserved) / review-13-record `45402e0`;
  revert `2f931c1` / H15 `7851595` (scoped branch, merged in, branch retired).
- **Candidate H16:** the commit on the single packet branch containing this report. Its full SHA
  and the verified advertised remote SHA are in the external handoff, not here: a report cannot
  certify its own future push.
- **Exact C12→H16 allowlist (whole range, not only the final commit):** the committed
  `C11..C12` range is exactly the 40 known admin paths — H13/review-12 records (14),
  H14/review-13 records (13), H15 records (13: implementation-15 plus validation-15's twelve
  files) — proven byte-exact by the scope guard, with the revert contributing zero names
  because it restores rather than adds; the H16 commit itself adds exactly these 14 paths —
  the K1.1 row edit in `docs/development/007-work-packets.md`, this report, and
  `docs/development/work/K1.1/validation-16/` (MANIFEST plus eleven logs). No other path
  differs between C11 and H16; the guard's negative probes assert the substantive prefixes
  explicitly.
- **Working-tree state:** validation ran in a detached `git worktree` at exactly C12
  (`/tmp/k11-c16-validation`, `node_modules` symlinked), where `git status` showed only
  `?? node_modules` before, during (between ablations, after each revert) and after the runs.
  Unification assembly ran in a second detached worktree (`/tmp/k11-c16-unify`). The main
  checkout never left the packet branch: it still carries the concurrent author's unstaged
  `mental-model/driver.md` edit, which is not mine, not packet, and not in any candidate —
  candidate identity is by commit tree, and validation ran detached at C12. Because the branch
  tip no longer carries the `doc-improve` tree, the documentation author should relocate that
  work (still preserved at `ddf24de` in history, plus any working-tree edits) onto its intended
  branch rather than continuing it on the packet branch.

## Changes and coverage

### K11-R14-PROC-01 (P1) — single-branch unification without rewriting history

Review-13 offered two compliant corrections: a clean lineage excluding the doc delta, or a
scoped corrective payload removing it from the effective tree. Round 15 took the first; the
owner's single-branch direction requires the second shape while keeping the first's proofs.
A plain merge of the two branches was rejected outright: it would restore the mental-model
delta to the candidate tree and re-contaminate it. The executed sequence, each step a separate
published commit, is:

1. **Revert `2f931c1`** — `git revert -m 2 620954d` (mainline = the review-12 parent) on the
   packet line. Staged exactly the 31 `mental-model/**` files and nothing else (verified before
   committing); afterwards `mental-model` at the tip is byte-empty of diff against review-12,
   and `review-12..revert` names exactly H14's 13 files plus `review-13.md`. The `doc-improve`
   commit, the merge, H14 and review-13 remain reachable ancestors — preserved, not destroyed.
2. **Unification merge C12 `37ee8c3`** — scoped H15 merged into the reverted line (parents
   `2f931c1` + `7851595`, both verified in `01` and the guard). The only conflict was the 007
   row both lines had edited; it was resolved to the H15 side, which already narrates
   H14/review-13 in full, with the unification recorded in the merge message itself.
3. **Effective-tree proof in `01` and `00`** — `C11..C12` names exactly the 40 known admin
   paths; no non-docs path differs; zero content bytes differ in `mental-model`/`packages`;
   `C11..HEAD` commit list is shown. The guard additionally pins C12's exact parents.
4. **Branch retirement** — after H16 is pushed, the scoped branch is deleted locally and on the
   origin, leaving the single packet branch. H15's commit remains reachable as C12's second
   parent, so no record is lost by the deletion.

### Tests added, changed and retired

None. No test was added, removed, weakened or retired, and no threshold moved. Packet suite stands
at 221 tests / 45 suites (including the 14-case K11-R12-ID-01 nondisclosure oracle, rerun
unchanged); `npm test` at 2,279 / 346; conformance at 1,949 / 283; architecture at 362 / 37 —
identical to rounds 13–15, as a substantively unchanged payload requires.

### Prior findings

| ID | Disposition |
|---|---|
| **K11-R14-PROC-01** | **Corrected this round** (revert + unification merge + fresh-C exact validation + guard, above), on the single branch as directed. |
| K11-R10-EVID-01 | Remains closed; the round-14 inventory-gate mechanism is retained byte-identical and re-exercised on C12, including fresh failure-path probes. |
| K11-R12-ID-01 | Remains closed; ownership correction and class oracle untouched and rerun (X9 still rejected by 26 cases; all 38 rejecting case names identical to round 14 modulo timings). |
| K11-R7-STATE-03, K11-R6-STATE-02 / VAL-04 / VAL-05, K11-R5-STATE-01 / VAL-03, K11-R4-DISP-01 / PROC-01, K11-R2-VAL-02 / EVID-01, K11-R1-*, K11-R3-*, K11-R4-*, K11-R10-DOC-01 | Remain closed; the rerun re-proves the suites that guard them with zero failures, and all seven legacy ablations reject with case-name sets identical to round 14. |
| review-13 ACCEPT-state | No acceptance exists to retain: review-13 returned CHANGES REQUIRED (semantic PASS on the C11-equivalent tree, candidate FAIL on H14's tree). Its C1–C10 PASS assessments stand as review history; the verdict on H16 belongs to the next independent reviewer. |

## Validation and interpretation

Every command ran in the detached worktree `/tmp/k11-c16-validation` at exactly
C12 `37ee8c39ebfcce797bafb67faecae01e55fab89f` (`node_modules` symlinked; otherwise clean), on
Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64, from that worktree's repository
root. Exit codes, counts, raw paths and SHA-256 digests are in
[`validation-16/MANIFEST.md`](validation-16/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| scope guard (`00`) | 0 | PASS: 40 known admin paths; zero substantive delta; staged is attachments only |
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2,279 tests, 346 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail |
| `npm run test:kernel` | 0 | 221 tests, 45 suites, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| `npm run check:builder-docs` | 0 | 26 files, 286 links/anchors, 38 imports |
| architecture suite (TAP) | 0 | 362 tests, 37 suites, 0 fail |
| packet case inventory (TAP) | 0 | 221 tests, 45 suites, 0 fail, every case named |
| control + 8 one-behaviour ablations | 0 | control clean (221/0); **8 of 8 rejected** by named cases |

**Reran versus inspected history.** Everything in the table above was **rerun on clean C12** in the
detached worktree; none of it is carried over, including from `validation-13/14/15`. The
C11-equivalence is not assumed from the file list: the non-docs emptiness and the zero-byte
`mental-model`/`packages` diff are themselves asserted under `set -euo pipefail`, and the
identical counts plus identical ablation case-name sets are the behavioural confirmation.
**Inspected, not rerun:** the prior payload/report/review commits and the K1.0 prerequisite
integrations, checked by `git merge-base --is-ancestor` in `01`; prior `validation-01/.../15`
logs, which remain committed as their own rounds' records and are **not** claimed as this
candidate's reruns.
**Mechanical self-checks (and why they bind).** Generation runs under
`set -euo pipefail`, so the verbatim inventory-gate script, the `17`-export assertion, the C12
parentage checks, the 40-path count assertion, the substantive-emptiness assertions, the
control-green check, the per-ablation rejection check (parsed `ℹ fail >= 1` from that ablation's
own output) and the post-revert HEAD-plus-cleanliness checks abort the run before any candidate
exists. The scope guard adds the pre-commit allowlist proof. After finalization, every manifest
token was programmatically compared against a fresh SHA-256 recomputation over the exact staged
file, length-checked at 64 hex characters.
**Implementer-only auxiliary probes (not validation evidence):** the F0/F1/F2 gate failure-path
probes, re-run this round against the same C12 worktree and disclosed in the manifest —
`/tmp`-only, no repository mutation, claimed solely as mechanism verification for the retained
gate.
**Checks not run, and the resulting limits.** `npm run test:evals` was not run: 006 requires it for
Agent behaviour, and no round-16 tree operation touches any Agent, model path or eval fixture.
No process-kill run: this packet makes no persistence or process-failure claim. No native
Driver, packaging or release check. So nothing here supports a durability, isolation,
native-fidelity, release or E-gate claim.

**External fixture / gate / decision:** none prepared, none executed, none claimed. E0–E6 are the
benchmark repository's.

### Why the evidence supports each criterion — implementer assessment, not acceptance

Review-13 returned semantic PASS for K1.1-C1 through C10 on the C11 tree, and C12's substantive
tree is that tree byte-for-byte: every count reproduces exactly (2,279/346, 1,949/283, 221/45,
22, 362/37), the 14-case nondisclosure oracle passes unchanged, all eight ablation rejections
reproduce their round-14 case-name sets, and X9 still rejects the reintroduced global sequence
with 26 cases. This round contributes the unified single-branch lineage the owner directed plus
the fresh-C exact validation review-13's second option requires. Per-criterion verdicts
nevertheless require fresh independent cumulative review of H16; nothing here is marked
ACCEPTED and no prior PASS is claimed as binding on H16.

### Design choices, assumptions and the strongest remaining risk

Routine choices under 007: (a) **revert over rewrite or rebase** — published history is
immutable, so the doc delta leaves the tip by a new commit, not by surgery; (b) **merge over
cherry-pick for the scoped records** — H15 stays reachable as C12's second parent, so retiring
its branch loses no record; (c) **fresh C12 with exact validation over asserting equivalence**
— a tree operation on tracked architecture files is payload under 006 even when it restores a
validated state, and a full rerun costs less than the argument; (d) **007 conflict resolved to
the H15 side** — it already narrates H14/review-13, and this report's 007 update carries the
unification story forward.

Trust boundaries are unchanged from round 13. The strongest remaining risk is the one this
whole sequence demonstrates: branch composition drifting under a finished report. The
countermeasure is unchanged in kind — aborting mechanical checks, verbatim records,
programmatic digest reconciliation — with one addition this round: the guard now pins the
payload commit's exact parents, so a moved branch tip cannot silently substitute a different
tree under the same report. A further recurrence in this process path should trigger
reassignment of the handoff-assembly step rather than another repair round.

### Third-party review under AGENTS.md

**No new third-party code, test, script, asset, dependency or service was copied, adapted, vendored
or added this round.** `packages/kernel/package.json` still declares exactly `"canonicalize": "3.0.0"`
with the same pinned tarball and integrity; neither file is touched by this round at all. The
Apache-2.0 record and round-3 owner approval stand unchanged.

### Reference maintenance ([008](../../008-implementation-report.md))

**No Layer-3 owner changed, and none needed to.** The only documentation touched besides this
packet's own records is the K1.1 prose/row in `007-work-packets.md`, which 007 owns. All sealed
records are unaltered. No contract change, no policy change, no placeholder resolution.

## Handoff

- **Ready for independent cumulative review** on the corrected candidate, on the single packet
  branch as directed. C12's substantive tree is C11 byte-for-byte with K11-R12-ID-01 and
  K11-R10-EVID-01 closed on review-13's own assessment; K11-R14-PROC-01 is corrected by
  revert + unification + fresh-C exact validation — the committed range is exactly the 40 known
  admin paths, zero substantive bytes differ, the digest table is programmatically verified,
  and no known mandatory defect, unresolved owned semantic case or missing result remains.
  That is the basis for `WAITING_FOR_REVIEW`; it is not acceptance.
- Base B, fresh payload C12 and candidate H16 with the verified advertised remote SHA on
  `codex/k1.1-create-reserve-async-dispatch` are supplied in the external owner handoff after
  the push, not in this report. H14 and H15 are superseded as candidates and must not be
  reviewed in place of H16; both are preserved as ancestors.
- **No self-acceptance.** Every criterion assessment above is the implementer's, and prior
  C1–C10 PASS verdicts are explicitly NOT claimed as binding on H16. The verdict is an
  independent reviewer's, bound to the exact candidate.
- **No successor release.** K1.2 is not begun and is not released; `next_release: none`.
