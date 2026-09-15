# Implementation report — K1.1, round 15

## Identity

- **Packet / parent:** K1.1 / K1. **Contract:** [contract.md](contract.md), **revision 5 (unchanged).**
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (B), including
  006/007/008/012/015 as they stand there.
- **State:** correction loop `IN_PROGRESS`; `WAITING_FOR_REVIEW` is claimed on the basis below, only
  after the single open P1 finding was corrected with regenerated evidence on a decontaminated
  lineage. No self-acceptance. **Owner release:** explicit instruction on 2026-09-14 ("Let's
  release K1.1") through [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent); correction
  rounds on a released packet need no renewed permission under 006. **Do not release or begin K1.2.**
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, integrated as `main` PR #21 /
  `9baff3a03662720af6eefe1ecfabc41fde99298f`, receipts [K1.0](../K1.0/integration-01.md) and
  [K1.0-correction-02](../K1.0-correction-02/integration-01.md), ledger-reconciled by `main` PR #26 /
  `05f48c204d1eae021b3464c206e5c11e84bb3505`. All verified as ancestors of the C11 checkout in
  [`01-tree-and-environment.log`](validation-15/01-tree-and-environment.log).
- **Branch (NEW — branch change is the correction):**
  `codex/k1.1-create-reserve-async-dispatch-scoped`, cut at review-12
  `9d5256ebabf218a5ba11552326d0ec93bce10858` and pushed to `origin`. The previous packet branch
  `codex/k1.1-create-reserve-async-dispatch` is preserved untouched at review-13
  `45402e0837b303a5724314f5d5f2721a6da6f257` (verified equal to the advertised remote SHA before
  and after this round; no fetch, push, amend, rebase or deletion touched it).
- **Base commit B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Payload C11 (UNCHANGED):** `f117e6b47c4930af6735aaa3668b8b4c242fd76d`, byte-for-byte. No
  production source, test, fixture, evaluator, threshold, configuration or contract change was
  required or made: review-13 closed K11-R10-EVID-01 on the round-14 mechanism, kept
  K11-R12-ID-01 closed, and passed C1–C10 semantically on this exact payload; its single new
  finding is a candidate-identity defect, and its explicit instruction is "do not redesign or
  churn the Kernel implementation merely because H14 was rejected." No C12 exists. The rerun
  below reproduces every round-13/14 count exactly with all eight ablation rejections intact,
  which is itself the check that no payload defect hides behind the lineage correction.
- **Superseded rejected candidate:** H14 `6eaccb4c8dc11d7bbac5e08d9175e742e4d29b9e`
  (payload C11) on the preserved original branch. H14 must not be reviewed in place of H15.
- **Authoritative review record:** review-13 (OpenAI ChatGPT, GPT-5.6 Sol, High reasoning,
  2026-09-15; `CHANGES REQUIRED` on K11-R14-PROC-01 only), recorded at
  `45402e0837b303a5724314f5d5f2721a6da6f257` on the preserved original branch. It is referenced
  by SHA and quoted here; it is deliberately NOT duplicated onto the scoped branch, so the
  `C11..H15` range below stays minimal and every path in it is owned by this packet round.
- **Previously reviewed candidates and reviews:** C `8cd9e269` / H `0f345b3c` / review-01;
  C2 `6b7e5fb0` / H2 `297cc56f`; C3 `615cdf88` / H3 `b3cdf337` / review-02; C4 `1d4e4867` /
  H4 `156f1353` / review-03 + supplement-01; C5 `e0660eff` / H5 `bd2dab6d` / review-04;
  C6 `b3d0d59f` / H6 `417798a3` / review-05; C7 `e59bd312` / H7 `ae02c32a` /
  review-06-supplement-01 + review-06; C8 `79151afc` / H8 `c1e7d78a` (superseded before review,
  preserved); C9 `5ac76207` / H9 `5dddc2ad` / review-07; C10 `d1fcffd` / H10 `2cdb1e2` /
  review-08; H11 `ccc0140` / review-09; H12 `a0472835` / review-10 (ACCEPT for H12 only) /
  review-11 (CHANGES REQUIRED, K11-R12-ID-01); C11 `f117e6b4` / H13 `7f34e5c1` / review-11-record
  `e2d62d1` / review-12-record `9d5256e` (CHANGES REQUIRED, evidence only); H14 `6eaccb4` /
  review-13-record `45402e0` (CHANGES REQUIRED, K11-R14-PROC-01) — all preserved on the original
  branch, reachable by SHA. Nothing was amended, rebased, squashed, force-pushed, reset or
  deleted in any round.
- **Candidate H15:** the commit on the scoped branch containing this report. Its full SHA and the
  verified advertised remote SHA are in the external handoff, not here: a report cannot certify
  its own future push.
- **Exact C11→H15 allowlist (whole range, not only the final commit):** the committed
  `C11..review-12` range is exactly these 14 paths — `docs/development/007-work-packets.md`,
  `docs/development/work/K1.1/implementation-13.md`,
  `docs/development/work/K1.1/review-12.md`, and `docs/development/work/K1.1/validation-13/`
  (MANIFEST plus ten logs) — proven byte-exact by the scope guard; the H15 commit itself adds
  exactly these 14 paths — the K1.1 row edit in `docs/development/007-work-packets.md`, this
  report, and `docs/development/work/K1.1/validation-15/` (MANIFEST plus eleven logs: the ten
  rerun logs and `00-candidate-scope-guard.log`). No other path differs between C11 and H15;
  in particular there is no `mental-model/**`, `packages/**`, test, fixture, configuration or
  contract delta. The guard's negative probes assert the substantive prefixes explicitly.
- **Working-tree state:** validation ran in a detached `git worktree` at exactly C11
  (`/tmp/k11-c15-validation`, `node_modules` symlinked), where `git status` showed only
  `?? node_modules` before, during (between ablations, after each revert) and after the runs.
  Assembly ran in a second worktree on the scoped branch (`/tmp/k11-c15-main`). The main
  checkout never left the original branch: it still carries the concurrent author's unstaged
  `mental-model/driver.md` edit, which is not mine, not packet, and not in any candidate —
  candidate identity is by commit tree, and validation ran detached at C11.

## Changes and coverage

### K11-R14-PROC-01 (P1) — how the contamination entered, and how this candidate excludes it

Review-13's mechanism account is accepted in full and repeated here so the correction binds to
it rather than to a paraphrase. After H13 (`7f34e5c`) and review-12 (`9d5256e`), concurrent
documentation work landed on the packet branch as `ddf24de5213a000241d04e531cad7d479104a761`
(`doc-improve`, parent H13): 31 `mental-model/**` files, including the canonical Layer-3
owners review-13 names (`concepts/identity.md`, `concepts/core.md`, `concepts/state.md`,
`concepts/values.md`, `mechanisms/creation.md`, `mechanisms/evidence.md`,
`mechanisms/execution-cycle.md`, `mechanisms/lifecycle.md`, among others). Merge
`620954d4492b5b4b2a1957c774fb44318718d753` (first parent `ddf24de`, second parent `9d5256e`)
then combined that documentation payload with the review-12 line, and H14 (`6eaccb4`) was cut
on top. H14's own commit held only 13 administrative files, but acceptance binds the exact
candidate tree and ancestry: `C11..H14` contained the broad mental-model delta, the
implementation-14 cumulative allowlist was therefore false, and round-14 validation — run
detached at exact C11 — never validated the effective H14 tree.

The correction is a scoped lineage, not a repair of the merged branch (repairing it would risk
either rewriting published history or silently reverting legitimate concurrent work):

1. **New continuation branch** `codex/k1.1-create-reserve-async-dispatch-scoped` created as an
   ordinary (non-force) branch pointer at review-12 `9d5256e` — the last uncontaminated K1.1
   history, containing H13 + review-12 and nothing else after C11 except the 14 known admin
   files. The original branch, including `ddf24de`, the merge, H14 and review-13, is preserved
   untouched at origin; the concurrent documentation work remains exactly where its author put
   it, reachable and unmodified.
2. **Ancestry exclusion proven mechanically in `01-tree-and-environment.log`** (same
   no-echo-into-measurement discipline as the inventory gate): review-12 resolves on the scoped
   lineage; each of `ddf24de`, `620954d`, H14 and review-13 is shown NOT to be an ancestor
   (each `merge-base --is-ancestor` must fail, and the generator aborts otherwise);
   `C11..scoped-tip` lists exactly the 14 known admin files; an explicit `grep
   '^mental-model/'` over that range must print nothing.
3. **A candidate-contamination guard** (`00-candidate-scope-guard.log`, new this round, and the
   standing counterpart to the evidence-count repair: bind the claim to observed Git state, not
   prose) verifies pre-commit that the committed `C11..HEAD` range equals the 14 known admin
   files byte-exactly, that every staged path is inside the H15 attachment allowlist, that no
   substantive prefix (`mental-model/`, `packages/`, `tests/`, `src/`, `scripts/`,
   `benchmarks/`) appears in either set, and that the worktree holds nothing else. It aborts
   nonzero with no PASS on any violation.
4. **No absorbed documentation.** No `mental-model/**` change is retained in the K1.1
   candidate, intentionally or otherwise — so no fresh payload C, no scope justification and no
   re-validation of documentation semantics is owed under review-13 §3. The expected outcome
   ("keep the unrelated `doc-improve` architecture work outside the K1.1 candidate") is exactly
   what the lineage shows.

### Tests added, changed and retired

None. No test was added, removed, weakened or retired, and no threshold moved. Packet suite stands
at 221 tests / 45 suites (including the 14-case K11-R12-ID-01 nondisclosure oracle, rerun
unchanged); `npm test` at 2,279 / 346; conformance at 1,949 / 283; architecture at 362 / 37 —
identical to rounds 13 and 14, as an unchanged payload requires.

### Prior findings

| ID | Disposition |
|---|---|
| **K11-R14-PROC-01** | **Corrected this round** (scoped lineage + ancestry-exclusion proofs + contamination guard, above). |
| K11-R10-EVID-01 | Remains closed; the round-14 inventory-gate mechanism is retained byte-identical (`/tmp/k11-zone-inventory.sh` unchanged) and re-exercised, including fresh failure-path probes. |
| K11-R12-ID-01 | Remains closed; C11 ownership correction and class oracle untouched and rerun (X9 still rejected by 26 cases; all 38 rejecting case names identical to round 14 modulo timings). |
| K11-R7-STATE-03, K11-R6-STATE-02 / VAL-04 / VAL-05, K11-R5-STATE-01 / VAL-03, K11-R4-DISP-01 / PROC-01, K11-R2-VAL-02 / EVID-01, K11-R1-*, K11-R3-*, K11-R4-*, K11-R10-DOC-01 | Remain closed; the rerun re-proves the suites that guard them with zero failures, and all seven legacy ablations reject with case-name sets identical to round 14. |
| review-13 ACCEPT-state | No acceptance exists to retain: review-13 returned CHANGES REQUIRED (semantic PASS on C11, candidate FAIL on H14's tree). Its C1–C10 PASS assessments stand as review history on the intended payload; the verdict on H15 belongs to the next independent reviewer. |

## Validation and interpretation

Every command ran in the detached worktree `/tmp/k11-c15-validation` at exactly
C11 `f117e6b47c4930af6735aaa3668b8b4c242fd76d` (`node_modules` symlinked; otherwise clean), on
Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64, from that worktree's repository
root. Exit codes, counts, raw paths and SHA-256 digests are in
[`validation-15/MANIFEST.md`](validation-15/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| scope guard (`00`) | 0 | PASS: 14 known admin files; staged is attachments only |
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2,279 tests, 346 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail |
| `npm run test:kernel` | 0 | 221 tests, 45 suites, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| `npm run check:builder-docs` | 0 | 26 files, 286 links/anchors, 38 imports |
| architecture suite (TAP) | 0 | 362 tests, 37 suites, 0 fail |
| packet case inventory (TAP) | 0 | 221 tests, 45 suites, 0 fail, every case named |
| control + 8 one-behaviour ablations | 0 | control clean (221/0); **8 of 8 rejected** by named cases |

**Reran versus inspected history.** Everything in the table above was **rerun on clean C11** in the
detached worktree; none of it is carried over, including from `validation-13/` or
`validation-14/`. **Inspected, not rerun:** the prior payload/report/review commits and the K1.0
prerequisite integrations, checked by `git merge-base --is-ancestor` in `01`; prior
`validation-01/.../14` logs, which remain committed as their own rounds' records (round-14's on
the preserved original branch) and are **not** claimed as this candidate's reruns. The round-14
ablation rejecting case-name sets were used only as a comparison oracle (all eight identical
modulo timing suffixes), not as evidence.
**Mechanical self-checks (and why they bind).** Generation runs under
`set -euo pipefail`, so the verbatim inventory-gate script, the `17`-export assertion, the
lineage-exclusion checks (each contaminating commit must fail ancestry; `mental-model/` grep
must print nothing), the control-green check, the per-ablation rejection check (parsed
`ℹ fail >= 1` from that ablation's own output) and the post-revert HEAD-plus-cleanliness checks
abort the run before any candidate exists. The scope guard adds the pre-commit allowlist proof.
After finalization, every manifest token was programmatically compared against a fresh SHA-256
recomputation over the exact staged file, length-checked at 64 hex characters. Both procedures
are recorded so the next reviewer can repeat them rather than trust them.
**Implementer-only auxiliary probes (not validation evidence):** the F0/F1/F2 gate failure-path
probes, re-run this round against the same C11 worktree and disclosed in the manifest —
`/tmp`-only, no repository mutation, claimed solely as mechanism verification for the retained
gate.
**Checks not run, and the resulting limits.** `npm run test:evals` was not run: 006 requires it for
Agent behaviour, and neither C11 nor this administrative round touches any Agent, model path or eval
fixture. No process-kill run: this packet makes no persistence or process-failure claim. No native
Driver, packaging or release check. So nothing here supports a durability, isolation,
native-fidelity, release or E-gate claim.

**External fixture / gate / decision:** none prepared, none executed, none claimed. E0–E6 are the
benchmark repository's.

### Why the evidence supports each criterion — implementer assessment, not acceptance

Review-13 already returned semantic PASS for K1.1-C1 through C10 on this exact payload, and the
payload is unchanged: every count reproduces exactly (2,279/346, 1,949/283, 221/45, 22, 362/37),
the 14-case nondisclosure oracle passes unchanged, all eight ablation rejections reproduce their
round-14 case-name sets, and X9 still rejects the reintroduced global sequence with 26 cases.
This round's contribution is the decontaminated lineage the review required — ancestry exclusion
of all four contamination commits, the exact-14-file committed range, the staged-allowlist guard
and a full rerun bound to the exact declared payload tree. Per-criterion verdicts nevertheless
require fresh independent cumulative review: the last two verdicts each found a defect the prior
round's evidence could not show, so nothing here is marked ACCEPTED and no prior PASS is claimed
as binding on H15.

### Design choices, assumptions and the strongest remaining risk

Routine choices under 007: (a) **new scoped branch over repairing the merged branch** — the
review's own first suggested option, and the only one that neither rewrites published history
nor risks reverting the concurrent author's live documentation work; (b) **no payload change** —
the review forbids Kernel churn for a candidate-identity defect; (c) **regeneration over
reference** — `validation-15/` is a fresh rerun even though the tree equals round 14's, because
round-14 evidence is bound to a rejected candidate on another branch and must not be re-claimed;
(d) **review-13 not duplicated onto the scoped branch** — its verdict is quoted and addressed,
but copying it in would widen `C11..H15` beyond packet-owned attachments.

Trust boundaries are unchanged from round 13. The strongest remaining risk is procedural, and
this round is its second demonstration: any step between a raw artifact and its summary that is
not mechanically bound — a transcribed numeral, a last-commit file list offered as a cumulative
allowlist, a branch that moved under a finished report — can pass unnoticed through authoring.
The countermeasure applied here is the same class as the evidence-count repair: make each such
step either aborting (generator, guard) or verbatim (exact ancestry proofs, full diffs, full
outputs, programmatic digest reconciliation), record the verification procedures themselves, and
keep the candidate lineage minimal so there is less to verify. A further recurrence in this
process path should trigger reassignment of the handoff-assembly step rather than another
repair round.

### Third-party review under AGENTS.md

**No new third-party code, test, script, asset, dependency or service was copied, adapted, vendored
or added this round.** `packages/kernel/package.json` still declares exactly `"canonicalize": "3.0.0"`
with the same pinned tarball and integrity; neither file is touched by this round at all. The
Apache-2.0 record and round-3 owner approval stand unchanged.

### Reference maintenance ([008](../../008-implementation-report.md))

**No Layer-3 owner changed, and none needed to.** The only documentation touched besides this
packet's own records is the K1.1 prose/row in `007-work-packets.md`, which 007 owns. All sealed
records (review-11, review-12, implementation-13/14, validation-13/14, review-13) are unaltered
on their own branch. No contract change, no policy change, no placeholder resolution.

## Handoff

- **Ready for independent cumulative review** on the corrected candidate. C11 stands byte-for-byte
  with K11-R12-ID-01 and K11-R10-EVID-01 closed on review-13's own assessment; the single open P1
  (K11-R14-PROC-01) is corrected by lineage rather than prose — the scoped branch provably
  excludes all four contamination commits, the committed range is exactly the 14 known admin
  files, the staged set is guard-verified attachments only, validation ran on the exact declared
  payload tree, the digest table is programmatically verified, and no known mandatory defect,
  unresolved owned semantic case or missing result remains. That is the basis for
  `WAITING_FOR_REVIEW`; it is not acceptance.
- Base B, unchanged payload C11 and candidate H15 with the verified advertised remote SHA on the
  scoped branch are supplied in the external owner handoff after the push, not in this report.
  H14 is superseded as a candidate and must not be reviewed in place of H15; it and review-13
  are preserved untouched on the original branch.
- **No self-acceptance.** Every criterion assessment above is the implementer's, and prior
  C1–C10 PASS verdicts are explicitly NOT claimed as binding on H15. The verdict is an
  independent reviewer's, bound to the exact candidate.
- **No successor release.** K1.2 is not begun and is not released; `next_release: none`.
