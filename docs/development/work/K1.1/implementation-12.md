# Implementation report — K1.1, round 12

## Identity

- **Packet / parent:** K1.1 / K1. **Contract:** [contract.md](contract.md), **revision 5 (unchanged).**
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (B), including
  006/007/008/012/015 as they stand there.
- **State:** correction loop `IN_PROGRESS`; `WAITING_FOR_REVIEW` is claimed on the basis below, only
  after the single remaining finding was closed against regenerated evidence. No self-acceptance.
  **Owner release:** explicit instruction on 2026-09-14 ("Let's release K1.1") through
  [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent); correction rounds on a released
  packet need no renewed permission under 006. **Do not release or begin K1.2.**
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, integrated as `main` PR #21 /
  `9baff3a03662720af6eefe1ecfabc41fde99298f`, receipts [K1.0](../K1.0/integration-01.md) and
  [K1.0-correction-02](../K1.0-correction-02/integration-01.md), ledger-reconciled by `main` PR #26 /
  `05f48c204d1eae021b3464c206e5c11e84bb3505`. Both verified as ancestors of the C10 checkout in
  [`01-tree-and-environment.log`](validation-12/01-tree-and-environment.log).
- **Branch / remote:** `codex/k1.1-create-reserve-async-dispatch` on `origin`.
- **Base commit B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Payload C10 (UNCHANGED):** `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14`, byte-for-byte. No
  production source, test, fixture, evaluator, threshold, configuration or contract change was
  required or made: the review found C1–C10 PASS with K11-R7-STATE-03 and K11-R10-DOC-01 closed, and
  the single remaining finding is an evidence-record defect. No C11 or C12 exists; manufacturing one
  merely to increment a round number would violate 006's payload identity it is meant to serve. The
  rerun below is itself the check that no payload defect was hiding: every round-10/11 count and
  (with one documented witness substitution) every ablation rejection reproduces exactly.
- **Reviewed candidate this round corrects:** H11 `ccc0140ffca7fe2196cb80e57d6eb2d767666793`.
- **Authoritative review record:** [review-09.md](review-09.md) (OpenAI ChatGPT, GPT-5.6 Sol, High;
  `CHANGES REQUIRED`: C1–C10 PASS, K11-R7-STATE-03 CLOSED, K11-R10-DOC-01 CLOSED, K11-R10-EVID-01 the
  single remaining finding), recorded at `4c03ce8b1190e4186da1407fda21951b2d32319e`.
- **Previously reviewed candidates and reviews, all preserved as ancestors of C10:** C `8cd9e269` /
  H `0f345b3c` / review-01; C2 `6b7e5fb0` / H2 `297cc56f`; C3 `615cdf88` / H3 `b3cdf337` / review-02;
  C4 `1d4e4867` / H4 `156f1353` / review-03 + supplement-01; C5 `e0660eff` / H5 `bd2dab6d` /
  review-04; C6 `b3d0d59f` / H6 `417798a3` / review-05; C7 `e59bd312` / H7 `ae02c32a` /
  review-06-supplement-01 + review-06; C8 `79151afc` / H8 `c1e7d78a` (superseded before review,
  preserved); C9 `5ac76207` / H9 `5dddc2ad` / review-07 (CHANGES REQUIRED, preserved);
  C10 `d1fcffd` / H10 `2cdb1e2` / review-08 (CHANGES REQUIRED, preserved);
  H11 `ccc0140` / review-09 (CHANGES REQUIRED, preserved).
  Nothing was amended, rebased, squashed, force-pushed or reset this round.
- **Candidate H12:** the commit containing this report. Its full SHA and the verified advertised
  remote SHA are in the external handoff, not here: a report cannot certify its own future push.
- **Exact C10..H12 administrative file allowlist for this commit:** this report
  (`docs/development/work/K1.1/implementation-12.md`), `docs/development/work/K1.1/validation-12/`
  (MANIFEST plus ten declared output-only logs, force-added with `git add -f` because root
  `.gitignore` ignores `*.log`), and the K1.1 row corrections in
  `docs/development/007-work-packets.md`. (The C10..H12 range also spans the already-reviewed H11
  and review-09 commits; those are ancestry, not this commit.) No production source, test, script,
  fixture, evaluator rule, threshold or configuration is in this commit; the payload stays C10.
- **Working-tree state:** validation ran in a detached `git worktree` at exactly C10
  (`/tmp/k11-c12-validation`, `node_modules` symlinked), where `git status` showed only
  `?? node_modules` before, during (between ablations, after each revert) and after the runs. In
  the main checkout, pre-existing uncommitted user modifications under `mental-model/` (wording
  only, not this packet) remain **unstaged and uncommitted** in H12; H11/review-09 ancestry is
  preserved normally.

## Changes and coverage

### K11-R10-EVID-01 (P2) — the remaining evidence defect: corrected by regeneration

The review's defect is quoted exactly: the H11 `01` log lists eleven files yet records `file count:
12`, and shows no command that produced the `12`. The correction therefore had to satisfy the
review's required outcome — definition, command, raw output and summary in reproducible agreement —
not merely restate 11.

1. **The inventory is now one measurement shown three consistent ways.** The `01` log states the
   definition (tracked `.ts` files directly under `packages/kernel/src`), runs `git ls-files
   'packages/kernel/src/*.ts'` (a tracked-set query, immune to worktree dirt by construction),
   prints the eleven names, counts the same command's output (`11`), and runs a self-check that
   recomputes the count from the same command and requires `11`. The manifest and this report claim
   11 because the attachment shows 11. The H11 `12` is not reinterpreted — its producing command
   was never recorded, so no reinterpretation is safe — and `validation-11/` is left sealed as
   H11's record.
2. **Two adjacent H11 commands are repaired so each reproduces its own output.** The lockfile pin
   now records `grep -A4 '"node_modules/canonicalize"'`: the H11 log's recorded pattern (with a
   trailing colon fused to the closing quote) matches no lockfile line and exits 1, so its
   displayed stanza could not have come from its recorded command. The import section keeps H11's
   full-line grep and adds a distinct-specifier extraction, so the `./` internals / `node:buffer` /
   exactly-`canonicalize` boundary is read off the log. The barrel-import export measurement is
   unchanged in method (17 names printed) and now carries an in-command assertion on 17.
3. **The ablation record is now reproducible, not just summarized.** H11's `09b` recorded diffstats
   and case names but not the edit commands, so its exact sites are unrecoverable — including X4's.
   This round's `09b` records the exact edit script, the full diff, the full run output and the
   parsed verdict per ablation. Six rejections reproduce H11's case-name sets byte-identically; X4
   rejects with the same cardinality (control + one runtime witness) at the recovered equivalent
   mailbox-append site, witnessed by that site's dedicated guard rather than incidentally by the
   inspect case. Four further scratch X4-site probes (receipts-at-activate/accept,
   dispatch-selection/deliveries), each immediately reverted, confirmed H11's exact incidental pair
   is not recoverable from an unrecorded edit; they are disclosed in the manifest and claimed as
   nothing.

### Tests added, changed and retired

None. No test was added, removed, weakened or retired, and no threshold moved. Packet suite stands
at 207 tests / 44 suites; `npm test` at 2,265 / 345; conformance at 1,949 / 283; architecture at
362 / 37 — identical to rounds 10–11.

### Prior findings

| ID | Disposition |
|---|---|
| **K11-R10-EVID-01** | **Corrected this round** (regenerated self-consistent, reproducible evidence, above). |
| K11-R10-DOC-01 | Remains closed; the 007 row now additionally records H11's review-09 verdict and the H12 candidacy. |
| **K11-R7-STATE-03** | Remains closed; reconstruction untouched, directional ablations rerun green-on-control/reject-on-weakening. |
| K11-R6-STATE-02 / VAL-04 / VAL-05, K11-R5-STATE-01 / VAL-03, K11-R4-DISP-01 / PROC-01, K11-R2-VAL-02 / EVID-01, K11-R1-* | Remain closed; the rerun re-proves the suites that guard them with zero failures. |

## Validation and interpretation

Every command ran in the detached worktree `/tmp/k11-c12-validation` at exactly
C10 `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14` (`node_modules` symlinked; otherwise clean), on
Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64, from that worktree's repository
root. Exit codes, counts, raw paths and SHA-256 digests are in
[`validation-12/MANIFEST.md`](validation-12/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2,265 tests, 345 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail |
| `npm run test:kernel` | 0 | 207 tests, 44 suites, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| `npm run check:builder-docs` | 0 | 26 files, 286 links/anchors, 38 imports |
| architecture suite (TAP) | 0 | 362 tests, 37 suites, 0 fail |
| packet case inventory (TAP) | 0 | 207 tests, 44 suites, 0 fail, every case named |
| control + 7 one-behaviour ablations | 0 | control clean (207/0); **7 of 7 rejected** by named cases |

**Reran versus inspected history.** Everything in the table above was **rerun on clean C10** in the
detached worktree; none of it is carried over, including from `validation-11/`. **Inspected, not
rerun:** the prior payload/report/review commits and the K1.0 prerequisite integrations, checked by
`git merge-base --is-ancestor` in `01-tree-and-environment.log` (H10/H11 and the review-08/review-09
records are verified as C10 *descendants*, i.e. administrative children rather than payload
ancestors); prior `validation-01/.../11` logs, which remain committed as their own rounds' evidence
and are **not** claimed as this candidate's reruns.
**Mechanical self-checks (new this round, and why they bind).** Generation runs under
`set -euo pipefail`, so the `11`-file agreement check, the `17`-export assertion, the per-ablation
`ℹ fail`-versus-parsed-names cross-check and the post-revert cleanliness checks abort the run
before any candidate exists — a mismatch cannot reach a manifest by transcription slip. After
finalization, every manifest token was programmatically compared against a fresh SHA-256
recomputation over the exact staged file, length-checked at 64 hex characters. Both procedures are
recorded in the manifest so the next reviewer can repeat them rather than trust them.
**Implementer-only auxiliary probes (not validation evidence):** the four scratch X4-site probes
described above and in the manifest — disclosed, reverted, claimed as nothing.
**Checks not run, and the resulting limits.** `npm run test:evals` was not run: 006 requires it for
Agent behaviour, and neither C10 nor this administrative round touches any Agent, model path or eval
fixture. No process-kill run: this packet makes no persistence or process-failure claim. No native
Driver, packaging or release check. So nothing here supports a durability, isolation,
native-fidelity, release or E-gate claim.

**External fixture / gate / decision:** none prepared, none executed, none claimed. E0–E6 are the
benchmark repository's.

### Why the evidence supports each criterion — implementer assessment, not acceptance

The independent review already returned PASS for K1.1-C1 through C10 on this exact payload (twice:
review-08 and review-09), and the payload is unchanged. The rerun's contribution is that every count
reproduces exactly and the one evidence claim the review faulted — the structural inventory — is
now established three consistent ways inside the raw attachment: atomic creation/replay/conflict
(C1), triple identity and ingress order (C2), one-capture values with exact JCS bytes and limits
(C3), single-observation dispatch with exact reservation and asynchrony (C4), exact redelivery (C5),
immutable per-boundary evidence with scoped reads (C6), named refusals of unlanded surfaces (C7), no
discriminator with the exact dependency boundary (C8), inert truthful projection (C9), and the
11-file / 17-export / exact-`canonicalize` structural boundary (C10 — now definition, command,
output and summary in agreement). Per-criterion verdicts remain the next independent reviewer's to
give; nothing here is marked ACCEPTED.

### Design choices, assumptions and the strongest remaining risk

Routine choices under 007: (a) **no new payload candidate** — the finding is a record defect on a
twice-semantically-passed payload; (b) **regeneration over in-place repair** — `validation-11/`
stays sealed as its round's record (the `12` included, now documented), and `validation-12/` is a
fresh rerun, so no log is ever claimed rerun when it was only inspected; (c) **tracked-set query
over filesystem listing** — `git ls-files` with a directory-scoped pathspec measures the claimed
set (tracked sources) directly, eliminating the contamination class behind the phantom `12` rather
than merely re-typing it; (d) **edit commands in the ablation record** — closing the loop H11 left
open, at the cost of a larger `09b` (full outputs included).

Trust boundaries are unchanged from round 11. The strongest remaining risk is the one this round
demonstrates twice over: any manual step between a raw artifact and its summary (an unrecorded
count command, an unrecorded edit site, a transcribed digest) can pass unnoticed through authoring.
The countermeasure applied here is to make each such step either mechanical (generation aborts on
mismatch) or recorded verbatim (exact commands, full diffs, full outputs), and to record the
verification procedures themselves so the next reviewer repeats rather than trusts them.

### Third-party review under AGENTS.md

**No new third-party code, test, script, asset, dependency or service was copied, adapted, vendored
or added this round.** `packages/kernel/package.json` still declares exactly `"canonicalize": "3.0.0"`
with the same pinned tarball and integrity; neither file is touched by this round at all. The
Apache-2.0 record and round-3 owner approval stand unchanged.

### Reference maintenance ([008](../../008-implementation-report.md))

**No Layer-3 owner changed, and none needed to.** The only documentation touched besides this
packet's own records is the K1.1 prose/row in `007-work-packets.md`, which 007 owns. The sealed
records ([review-09](review-09.md), [implementation-11](implementation-11.md),
`validation-11/`) are not altered. No contract change, no policy change, no placeholder resolution.

## Handoff

- **Ready for independent review** on the corrected candidate. The single remaining P2 finding from
  [review-09](review-09.md) is closed with regenerated substantiating evidence whose
  definition/command/output/summary visibly agree; the payload stands byte-for-byte with every
  round-10/11 count reproduced and 7 of 7 ablations rejected; the digest table is programmatically
  verified; and no known mandatory defect, unresolved owned semantic case or missing result remains.
  That is the basis for `WAITING_FOR_REVIEW`; it is not acceptance.
- Base B, unchanged payload C10 and candidate H12 with the verified advertised remote SHA are
  supplied in the external owner handoff after the push, not in this report. H11 is superseded as a
  candidate and must not be reviewed in place of H12; it is preserved as an ancestor.
- **No self-acceptance.** Every criterion assessment above is the implementer's. The verdict is an
  independent reviewer's, bound to the exact candidate.
- **No successor release.** K1.2 is not begun and is not released; `next_release: none`.
