# Implementation report — K1.1, round 17

## Identity

- **Packet / parent:** K1.1 / K1. **Contract:** [contract.md](contract.md), **revision 5 (unchanged).**
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (B), including
  006/007/008/012/015 as they stand there.
- **State:** correction loop `IN_PROGRESS`; `WAITING_FOR_REVIEW` is claimed on the basis below, only
  after the mid-round owner push was converged with the docs retained and the resulting fresh
  payload validated exactly. No self-acceptance. **Owner release:** explicit instruction on
  2026-09-14 ("Let's release K1.1") through
  [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent); the single-branch direction and
  the docs-retention direction ("make sure that it survive in the branch", docs frozen) are
  explicit owner instructions this round. **Do not release or begin K1.2.**
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, integrated as `main` PR #21 /
  `9baff3a03662720af6eefe1ecfabc41fde99298f`, receipts [K1.0](../K1.0/integration-01.md) and
  [K1.0-correction-02](../K1.0-correction-02/integration-01.md), ledger-reconciled by `main` PR #26 /
  `05f48c204d1eae021b3464c206e5c11e84bb3505`. All verified as ancestors of the C13 checkout in
  [`01-tree-and-environment.log`](validation-17/01-tree-and-environment.log).
- **Branch (single):** `codex/k1.1-create-reserve-async-dispatch`. The round-15 scoped branch's
  records were merged into it (via C12) and the scoped branch is deleted afterwards (local and
  remote); the branch list at handoff shows this one packet branch only. No force-push, no amend,
  no rebase, no reset, no deletion of any packet commit anywhere. The H16 push was correctly
  refused as non-fast-forward when the owner's `imp` landed mid-round; this round converges that
  push by merge, not by force.
- **Base commit B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Payload C13 (NEW, one retained doc file):** `98d6cebcd5861e42c843fab65516829c8818bff8`,
  a merge with exactly two parents — H16 records `41dd2fb14e4744eb71070cab0997225b96a86afc`
  and owner imp `e94ee6b1e087309eea1a825d33b9293275ec5490`. C13 differs from C11
  `f117e6b47c4930af6735aaa3668b8b4c242fd76d` by exactly 54 paths: 53 packet-admin records plus
  the single declared retained file `mental-model/driver.md`, byte-identical to the imp blob
  `28d24710e76a6232ddbd8371362a57f782170ef1`. Nothing differs outside `docs/` and
  `mental-model/`; zero `packages`/`tests`/`scripts` bytes differ. Justification for retention
  (review-13's retained-payload path): explicit owner direction that the docs survive in the
  branch, frozen for the round; documentation-only prose with mechanically proven zero code
  impact; contract revision 5 unchanged. The rerun below reproduces every round-13–16 count
  exactly with all eight ablation rejections intact.
- **Authoritative review record:** review-13 (OpenAI ChatGPT, GPT-5.6 Sol, High reasoning,
  2026-09-15; `CHANGES REQUIRED` on K11-R14-PROC-01 only), recorded at
  `45402e0837b303a5724314f5d5f2721a6da6f257`, an ancestor on the single branch with its record
  at [`review-13.md`](review-13.md).
- **History, all preserved as ancestors on the one branch:** C `8cd9e269` / H `0f345b3c` /
  review-01; C2 `6b7e5fb0` / H2 `297cc56f`; C3 `615cdf88` / H3 `b3cdf337` / review-02;
  C4 `1d4e4867` / H4 `156f1353` / review-03 + supplement-01; C5 `e0660eff` / H5 `bd2dab6d` /
  review-04; C6 `b3d0d59f` / H6 `417798a3` / review-05; C7 `e59bd312` / H7 `ae02c32a` /
  review-06-supplement-01 + review-06; C8 `79151afc` / H8 `c1e7d78a` (superseded before review,
  preserved); C9 `5ac76207` / H9 `5dddc2ad` / review-07; C10 `d1fcffd` / H10 `2cdb1e2` /
  review-08; H11 `ccc0140` / review-09; H12 `a0472835` / review-10 (ACCEPT for H12 only) /
  review-11 (CHANGES REQUIRED, K11-R12-ID-01); C11 `f117e6b4` / H13 `7f34e5c1` /
  review-11-record `e2d62d1` / review-12-record `9d5256e` (CHANGES REQUIRED, evidence only);
  `ddf24de` (doc-improve, preserved) / merge `620954d` (preserved) / H14 `6eaccb4` (CHANGES
  REQUIRED, preserved) / review-13-record `45402e0`; owner imp `e94ee6b` (preserved, retained
  at tip); revert `2f931c1` / H15 `7851595` (scoped branch, merged in, branch retired) /
  C12 `37ee8c3` / H16 `41dd2fb` (unpushed local line, merged in as C13's first parent).
- **Candidate H17:** the commit on the single packet branch containing this report. Its full SHA
  and the verified advertised remote SHA are in the external handoff, not here: a report cannot
  certify its own future push.
- **Exact C13→H17 allowlist (whole range, not only the final commit):** the committed
  `C11..C13` range is exactly the 54 known paths — H13/review-12 records (14), H14/review-13
  records (13), H15 records (13), H16 records (13: implementation-16 plus validation-16's
  twelve files), and the retained `mental-model/driver.md` — proven byte-exact by the scope
  guard; the H17 commit itself adds exactly these 14 paths — the K1.1 row edit in
  `docs/development/007-work-packets.md`, this report, and
  `docs/development/work/K1.1/validation-17/` (MANIFEST plus eleven logs). No other path
  differs between C11 and H17.
- **Working-tree state:** validation ran in a detached `git worktree` at exactly C13
  (`/tmp/k11-c17-validation`, `node_modules` symlinked), where `git status` showed only
  `?? node_modules` before, during (between ablations, after each revert) and after the runs.
  Convergence assembly ran in a second detached worktree (`/tmp/k11-c16-unify`). The main
  checkout was never used for packet commits this round. A caution for the docs owner: the
  packet branch tip now carries the frozen `imp` driver.md; any further docs edit on this
  branch will reopen the candidate-identity question and needs its own round or, preferably, a
  dedicated docs branch — the packet branch is the wrong home for live documentation work.

## Changes and coverage

### K11-R14-PROC-01 (P1) — convergence with the retained docs on one branch

While round 16 was validating, the owner pushed `e94ee6b` (`imp`, `mental-model/driver.md`
only) to the packet branch; the H16 push was refused as non-fast-forward, correctly, with no
force applied. On the owner's direction (docs survive in the branch, frozen; implementer has
full control of the mechanics), the convergence is a merge, not a rewrite:

1. **Merge C13 `98d6ceb`** — owner's `imp` merged into the H16 line (parents `41dd2fb` +
   `e94ee6b`, both verified in `01` and the guard). The single conflict (`driver.md`, both
   sides having touched it since `45402e0`) was resolved to the imp side byte-identically
   (`28d24710...` verified at resolution and re-verified in `01`/guard). All other
   doc-improve files remain at their reverted review-12 state; every doc commit remains a
   reachable ancestor.
2. **Retained-payload declaration** — the file is named (`mental-model/driver.md`), its
   justification is the owner's explicit retention direction, the payload is fresh (C13), its
   semantic effect was inspected (prose documentation; zero `packages`/`tests`/`scripts` bytes
   differ, proven under `set -euo pipefail`), and validation ran on the exact C13 tree. This
   is review-13 §3's retained-payload path, not an exception to it.
3. **No Kernel churn** — review-13's instruction stands: the Kernel implementation is byte-
   identical to the semantically passed C11; the only payload delta in the world is one prose
   file plus packet-admin records.
4. **Branch retirement** — after H17 is pushed, the scoped branch is deleted locally and on the
   origin, leaving the single packet branch. H15 stays reachable as C12's second parent, so no
   record is lost.

### Tests added, changed and retired

None. No test was added, removed, weakened or retired, and no threshold moved. Packet suite stands
at 221 tests / 45 suites (including the 14-case K11-R12-ID-01 nondisclosure oracle, rerun
unchanged); `npm test` at 2,279 / 346; conformance at 1,949 / 283; architecture at 362 / 37 —
identical to rounds 13–16, as a code-identical payload requires.

### Prior findings

| ID | Disposition |
|---|---|
| **K11-R14-PROC-01** | **Corrected this round** (converged single branch + retained-payload declaration + fresh-C exact validation + guard, above). |
| K11-R10-EVID-01 | Remains closed; the round-14 inventory-gate mechanism is retained byte-identical and re-exercised on C13, including fresh failure-path probes. |
| K11-R12-ID-01 | Remains closed; ownership correction and class oracle untouched and rerun (X9 still rejected by 26 cases; all 38 rejecting case names identical to round 14 modulo timings). |
| K11-R7-STATE-03, K11-R6-STATE-02 / VAL-04 / VAL-05, K11-R5-STATE-01 / VAL-03, K11-R4-DISP-01 / PROC-01, K11-R2-VAL-02 / EVID-01, K11-R1-*, K11-R3-*, K11-R4-*, K11-R10-DOC-01 | Remain closed; the rerun re-proves the suites that guard them with zero failures, and all seven legacy ablations reject with case-name sets identical to round 14. |
| review-13 ACCEPT-state | No acceptance exists to retain: review-13 returned CHANGES REQUIRED (semantic PASS on the code-identical tree, candidate FAIL on H14's undeclared tree). Its C1–C10 PASS assessments stand as review history; the verdict on H17 belongs to the next independent reviewer. |

## Validation and interpretation

Every command ran in the detached worktree `/tmp/k11-c17-validation` at exactly
C13 `98d6cebcd5861e42c843fab65516829c8818bff8` (`node_modules` symlinked; otherwise clean), on
Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64, from that worktree's repository
root. Exit codes, counts, raw paths and SHA-256 digests are in
[`validation-17/MANIFEST.md`](validation-17/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| scope guard (`00`) | 0 | PASS: 54 known paths; sole delta is retained driver.md; staged is attachments only |
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2,279 tests, 346 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail |
| `npm run test:kernel` | 0 | 221 tests, 45 suites, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| `npm run check:builder-docs` | 0 | 26 files, 286 links/anchors, 38 imports |
| architecture suite (TAP) | 0 | 362 tests, 37 suites, 0 fail |
| packet case inventory (TAP) | 0 | 221 tests, 45 suites, 0 fail, every case named |
| control + 8 one-behaviour ablations | 0 | control clean (221/0); **8 of 8 rejected** by named cases |

**Reran versus inspected history.** Everything in the table above was **rerun on clean C13** in the
detached worktree; none of it is carried over, including from `validation-13/14/15/16`. The
code-equivalence is not assumed: the outside-`docs/`+`mental-model/` emptiness, the
exactly-`driver.md` mental-model scope, the imp-blob identity and the zero-byte
`packages`/`tests`/`scripts` diff are themselves asserted under `set -euo pipefail`, and the
identical counts plus identical ablation case-name sets are the behavioural confirmation.
**Inspected, not rerun:** the prior payload/report/review commits and the K1.0 prerequisite
integrations, checked by `git merge-base --is-ancestor` in `01`; prior `validation-01/.../16`
logs, which remain committed as their own rounds' records and are **not** claimed as this
candidate's reruns.
**Mechanical self-checks (and why they bind).** Generation runs under
`set -euo pipefail`, so the verbatim inventory-gate script, the `17`-export assertion, the C13
parentage checks, the 54-path count assertion, the retention-shape assertions (scope, blob
identity, zero code bytes), the control-green check, the per-ablation rejection check (parsed
`ℹ fail >= 1` from that ablation's own output) and the post-revert HEAD-plus-cleanliness checks
abort the run before any candidate exists. The scope guard adds the pre-commit allowlist proof.
After finalization, every manifest token was programmatically compared against a fresh SHA-256
recomputation over the exact staged file, length-checked at 64 hex characters.
**Implementer-only auxiliary probes (not validation evidence):** the F0/F1/F2 gate failure-path
probes, re-run this round against the same C13 worktree and disclosed in the manifest —
`/tmp`-only, no repository mutation, claimed solely as mechanism verification for the retained
gate.
**Checks not run, and the resulting limits.** `npm run test:evals` was not run: 006 requires it for
Agent behaviour, and no round-17 tree operation touches any Agent, model path or eval fixture.
No process-kill run: this packet makes no persistence or process-failure claim. No native
Driver, packaging or release check. So nothing here supports a durability, isolation,
native-fidelity, release or E-gate claim.

**External fixture / gate / decision:** none prepared, none executed, none claimed. E0–E6 are the
benchmark repository's.

### Why the evidence supports each criterion — implementer assessment, not acceptance

Review-13 returned semantic PASS for K1.1-C1 through C10 on the C11 code tree, and C13's code
tree is that tree byte-for-byte: every count reproduces exactly (2,279/346, 1,949/283, 221/45,
22, 362/37), the 14-case nondisclosure oracle passes unchanged, all eight ablation rejections
reproduce their round-14 case-name sets, and X9 still rejects the reintroduced global sequence
with 26 cases. The retained prose file cannot change any of these (proven zero code bytes, and
the green rerun confirms it). Per-criterion verdicts nevertheless require fresh independent
cumulative review of H17; nothing here is marked ACCEPTED and no prior PASS is claimed as
binding on H17.

### Design choices, assumptions and the strongest remaining risk

Routine choices under 007: (a) **merge over force or rebase** — the owner's mid-round push is
published history; convergence is additive, and the refused H16 push stays refused rather than
retried with force; (b) **conflict resolved to the imp side** — the owner's retention direction
names the winner, verified byte-identical rather than eyeballed; (c) **fresh C13 with exact
validation over asserting docs-inertness** — a prose file cannot fail a test suite, but the
review's retained-payload path requires the exact-tree rerun and it is cheap; (d) **H16 kept
as C13's first parent rather than dropped** — the refused push's records stay reachable and
auditable instead of becoming dangling local commits.

Trust boundaries are unchanged from round 13. The strongest remaining risk is now explicit
rather than latent: the packet branch tip carries live documentation the owner may edit again.
The guard pins the retained file's exact blob, so any future docs edit fails closed at the
next handoff instead of slipping in — but the durable fix is a dedicated docs branch, as noted
above. A further recurrence in this process path should trigger reassignment of the
handoff-assembly step rather than another repair round.

### Third-party review under AGENTS.md

**No new third-party code, test, script, asset, dependency or service was copied, adapted, vendored
or added this round.** `packages/kernel/package.json` still declares exactly `"canonicalize": "3.0.0"`
with the same pinned tarball and integrity; neither file is touched by this round at all. The
Apache-2.0 record and round-3 owner approval stand unchanged.

### Reference maintenance ([008](../../008-implementation-report.md))

**No Layer-3 owner changed by this packet**, and none needed to: the retained `driver.md`
iteration is the documentation owner's own commit, taken byte-identically, not a packet edit.
The only documentation touched besides this packet's own records is the K1.1 prose/row in
`007-work-packets.md`, which 007 owns. All sealed records are unaltered. No contract change, no
policy change, no placeholder resolution.

## Handoff

- **Ready for independent cumulative review** on the corrected candidate, on the single packet
  branch with the owner's docs retained as directed. C13 is C11 plus 53 admin paths plus the
  declared `driver.md` retention, with K11-R12-ID-01 and K11-R10-EVID-01 closed on review-13's
  own assessment; K11-R14-PROC-01 is corrected by convergence + retained-payload declaration +
  fresh-C exact validation — the committed range is exactly the 54 known paths, zero code bytes
  differ, the digest table is programmatically verified, and no known mandatory defect,
  unresolved owned semantic case or missing result remains. That is the basis for
  `WAITING_FOR_REVIEW`; it is not acceptance.
- Base B, fresh payload C13 and candidate H17 with the verified advertised remote SHA on
  `codex/k1.1-create-reserve-async-dispatch` are supplied in the external owner handoff after
  the push, not in this report. H14, H15 and H16 are superseded as candidates and must not be
  reviewed in place of H17; all are preserved as ancestors.
- **No self-acceptance.** Every criterion assessment above is the implementer's, and prior
  C1–C10 PASS verdicts are explicitly NOT claimed as binding on H17. The verdict is an
  independent reviewer's, bound to the exact candidate.
- **No successor release.** K1.2 is not begun and is not released; `next_release: none`.
