# Implementation report — K1.1, round 14

## Identity

- **Packet / parent:** K1.1 / K1. **Contract:** [contract.md](contract.md), **revision 5 (unchanged).**
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (B), including
  006/007/008/012/015 as they stand there.
- **State:** correction loop `IN_PROGRESS`; `WAITING_FOR_REVIEW` is claimed on the basis below, only
  after the single open P2 finding was corrected against regenerated evidence. No self-acceptance.
  **Owner release:** explicit instruction on 2026-09-14 ("Let's release K1.1") through
  [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent); correction rounds on a released
  packet need no renewed permission under 006. **Do not release or begin K1.2.**
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, integrated as `main` PR #21 /
  `9baff3a03662720af6eefe1ecfabc41fde99298f`, receipts [K1.0](../K1.0/integration-01.md) and
  [K1.0-correction-02](../K1.0-correction-02/integration-01.md), ledger-reconciled by `main` PR #26 /
  `05f48c204d1eae021b3464c206e5c11e84bb3505`. Both verified as ancestors of the C11 checkout in
  [`01-tree-and-environment.log`](validation-14/01-tree-and-environment.log).
- **Branch / remote:** `codex/k1.1-create-reserve-async-dispatch` on `origin`.
- **Base commit B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Payload C11 (UNCHANGED):** `f117e6b47c4930af6735aaa3668b8b4c242fd76d`, byte-for-byte. No
  production source, test, fixture, evaluator, threshold, configuration or contract change was
  required or made: the review closed K11-R12-ID-01 and passed C1–C10 semantically, and the single
  remaining finding is an evidence-generation defect. No C12 exists; manufacturing one merely to
  increment a payload number would violate 006's payload identity it is meant to serve. The rerun
  below reproduces every round-13 count exactly, which is itself the check that no payload defect
  is hiding behind the evidence correction: had C11's semantics differed from what round 13 proved,
  the counts or the ablation rejections would have moved.
- **Reviewed candidate this round corrects:** H13 `7f34e5c135b119983a682e639f3d4d6da3bff7e5`
  (payload C11 `f117e6b47c4930af6735aaa3668b8b4c242fd76d`).
- **Authoritative review record:** [review-12.md](review-12.md) (OpenAI ChatGPT, GPT-5.6 Sol, High
  reasoning; `CHANGES REQUIRED`: K11-R12-ID-01 CLOSED, K1.1-C1 through C10 PASS semantically,
  K11-R10-EVID-01 REOPENED on the H13 evidence contradiction), recorded at
  `9d5256ebabf218a5ba11552326d0ec93bce10858`.
- **Previously reviewed candidates and reviews, all preserved as ancestors of C11 except where
  noted:** C `8cd9e269` / H `0f345b3c` / review-01; C2 `6b7e5fb0` / H2 `297cc56f`;
  C3 `615cdf88` / H3 `b3cdf337` / review-02; C4 `1d4e4867` / H4 `156f1353` / review-03 +
  supplement-01; C5 `e0660eff` / H5 `bd2dab6d` / review-04; C6 `b3d0d59f` / H6 `417798a3` /
  review-05; C7 `e59bd312` / H7 `ae02c32a` / review-06-supplement-01 + review-06;
  C8 `79151afc` / H8 `c1e7d78a` (superseded before review, preserved);
  C9 `5ac76207` / H9 `5dddc2ad` / review-07 (CHANGES REQUIRED, preserved);
  C10 `d1fcffd` / H10 `2cdb1e2` / review-08 (CHANGES REQUIRED, preserved);
  H11 `ccc0140` / review-09 (CHANGES REQUIRED, preserved); H12 `a0472835` / review-10 (ACCEPT for
  H12 only, preserved); C11 `f117e6b4` / H13 `7f34e5c1` / review-11 (CHANGES REQUIRED, preserved).
  Review-12 and its record postdate the C11 checkout and live on as preserved branch history, not
  as C11 ancestors. Nothing was amended, rebased, squashed, force-pushed or reset this round.
- **Candidate H14:** the commit containing this report. Its full SHA and the verified advertised
  remote SHA are in the external handoff, not here: a report cannot certify its own future push.
- **Exact C11..H14 administrative file allowlist for this commit:** this report
  (`docs/development/work/K1.1/implementation-14.md`), `docs/development/work/K1.1/validation-14/`
  (MANIFEST plus ten declared output-only logs, force-added with `git add -f` because root
  `.gitignore` ignores `*.log`), and the K1.1 row corrections in
  `docs/development/007-work-packets.md`. (The C11..H14 range also spans the C11 payload commit,
  the H13 report/evidence commit and the review-12 record; those are ancestry, not this commit.)
  No production source, test, script, fixture, evaluator rule, threshold or configuration is in
  this commit; the payload stays C11.
- **Working-tree state:** validation ran in a detached `git worktree` at exactly C11
  (`/tmp/k11-c14-validation`, `node_modules` symlinked), where `git status` showed only
  `?? node_modules` before, during (between ablations, after each revert) and after the runs.
  The main checkout is clean at H14. H13/review-12 ancestry is preserved normally.

## Changes and coverage

### K11-R10-EVID-01 (P2, reopened) — the evidence-generation mechanism: corrected, not the numeral

The review's defect is quoted exactly: H13's fresh `01` log records eleven target filenames, a
displayed count of `12`, and then `test 11 = 11` with a claimed self-check PASS — contradicting
the report's and manifest's claims of a fail-closed tracked-set measurement. Root-caused by the
implementer to two compounding mechanism defects in the round-13 generator (both in the
evidence-generation path, neither in the payload):

1. Its command-echo helper printed its own `$ ...` line to stdout, and that stdout was piped into
   `wc -l` — so eleven filenames plus one echo line measured `12`.
2. Its self-check operands were expanded by the generator shell before the log recorded them, so
   the raw record shows the tautology `test 11 = 11`, which no disagreeing tree could ever fail.

The correction therefore reconstructs the mechanism rather than retyping the numeral:

1. **The target set is defined precisely** in the log before measurement: tracked `.ts` files
   directly under `packages/kernel/src`.
2. **The gate is a script shown verbatim in the log before it runs** (`cat` heredoc, then
   execution). It lists the set with `git ls-files 'packages/kernel/src/*.ts'` — a tracked-set
   query, immune to worktree dirt — and prints the same listing through `tee` into a file.
3. **The observed count is derived from that same file** (`wc -l`) and printed as
   `observed count: <live value>`.
4. **The assertion's only literal is the expected structural invariant** (`EXPECTED_COUNT=11`);
   the observed operand is the live recomputation. Under `set -euo pipefail` a disagreeing tree
   aborts nonzero with no PASS line.
5. **No command-echo is piped into any measurement anywhere in the generator**: logged `$ ...`
   lines are literal transcriptions executed by separate statements with no shared pipe.
6. **The failure path was deliberately exercised before finalizing** (auxiliary F0/F1/F2 probes in
   `/tmp` against the same C11 worktree, no repository mutation, disclosed in the manifest): the
   true gate exits 0; the same script with the expectation altered to 10 exits 1 with no PASS
   line; the count assertion against a file list with one extra line appended (`observed count:
   12`) exits 1.
7. **The report and manifest state exactly what the raw record demonstrates**: script bytes,
   filenames, live-derived count and pass line — with no tautological comparison anywhere in the
   record and no claim beyond it.

### Tests added, changed and retired

None. No test was added, removed, weakened or retired, and no threshold moved. Packet suite stands
at 221 tests / 45 suites (including the 14-case K11-R12-ID-01 nondisclosure oracle, rerun
unchanged); `npm test` at 2,279 / 346; conformance at 1,949 / 283; architecture at 362 / 37 —
identical to round 13, as an unchanged payload requires.

### Prior findings

| ID | Disposition |
|---|---|
| **K11-R10-EVID-01** | **Corrected this round** (reconstructed fail-closed inventory gate + failure-path probes, above). |
| K11-R12-ID-01 | Remains closed; C11 ownership correction and class oracle untouched and rerun (X9 still rejected by 26 cases). |
| K11-R7-STATE-03, K11-R6-STATE-02 / VAL-04 / VAL-05, K11-R5-STATE-01 / VAL-03, K11-R4-DISP-01 / PROC-01, K11-R2-VAL-02 / EVID-01, K11-R1-*, K11-R3-*, K11-R4-*, K11-R10-DOC-01 | Remain closed; the rerun re-proves the suites that guard them with zero failures, and all seven legacy ablations reject with byte-identical case-name sets to H12/H13. |
| review-12 ACCEPT-state | No acceptance exists to retain: review-12 returned CHANGES REQUIRED (semantic PASS, evidence FAIL). Its K11-R12-ID-01 closure and C1–C10 PASS assessments stand as review history; the verdict on H14 belongs to the next independent reviewer. |

## Validation and interpretation

Every command ran in the detached worktree `/tmp/k11-c14-validation` at exactly
C11 `f117e6b47c4930af6735aaa3668b8b4c242fd76d` (`node_modules` symlinked; otherwise clean), on
Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64, from that worktree's repository
root. Exit codes, counts, raw paths and SHA-256 digests are in
[`validation-14/MANIFEST.md`](validation-14/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
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
detached worktree; none of it is carried over, including from `validation-13/`. **Inspected, not
rerun:** the prior payload/report/review commits and the K1.0 prerequisite integrations, checked by
`git merge-base --is-ancestor` in `01-tree-and-environment.log` (H13 and the review-12 record
postdate the C11 checkout and are preserved branch history, not re-asserted as its ancestors);
prior `validation-01/.../13` logs, which remain committed as their own rounds' evidence and are
**not** claimed as this candidate's reruns.
**Mechanical self-checks (and why they bind).** Generation runs under
`set -euo pipefail`, so the verbatim inventory-gate script, the `17`-export assertion, the
control-green check, the per-ablation rejection check (parsed `ℹ fail >= 1` from that ablation's
own output) and the post-revert HEAD-plus-cleanliness checks abort the run before any candidate
exists — a mismatch cannot reach a manifest by transcription slip. After finalization, every
manifest token was programmatically compared against a fresh SHA-256 recomputation over the exact
staged file, length-checked at 64 hex characters. Both procedures are recorded in the manifest so
the next reviewer can repeat them rather than trust them.
**Implementer-only auxiliary probes (not validation evidence):** the F0/F1/F2 gate failure-path
probes described above and in the manifest — disclosed, `/tmp`-only, no repository mutation,
claimed solely as mechanism verification for the corrected gate.
**Checks not run, and the resulting limits.** `npm run test:evals` was not run: 006 requires it for
Agent behaviour, and neither C11 nor this administrative round touches any Agent, model path or eval
fixture. No process-kill run: this packet makes no persistence or process-failure claim. No native
Driver, packaging or release check. So nothing here supports a durability, isolation,
native-fidelity, release or E-gate claim.

**External fixture / gate / decision:** none prepared, none executed, none claimed. E0–E6 are the
benchmark repository's.

### Why the evidence supports each criterion — implementer assessment, not acceptance

The independent review already returned semantic PASS for K1.1-C1 through C10 on this exact payload
(review-12, on H13 over unchanged C11), and the payload is unchanged: every count reproduces
exactly (2,279/346, 1,949/283, 221/45, 22, 362/37), the 14-case nondisclosure oracle passes
unchanged, the seven legacy ablation rejections reproduce their H12/H13 case-name sets
byte-identically, and X9 still rejects the reintroduced global sequence with 26 cases. The rerun's
contribution is the corrected structural inventory the review faulted — definition, verbatim gate
script, filenames, live-derived count and fail-closed assertion in agreement inside the raw
attachment — plus the deliberately exercised failure path. Per-criterion verdicts remain the next
independent reviewer's to give; nothing here is marked ACCEPTED.

### Design choices, assumptions and the strongest remaining risk

Routine choices under 007: (a) **no new payload candidate** — the finding is an evidence-generation
defect on a semantically passed payload; (b) **mechanism reconstruction over numeral repair** — the
verbatim-gate-script pattern removes the echo-into-measurement and pre-expansion classes rather
than re-typing `12` as `11` under the same generator; (c) **regeneration over in-place repair** —
`validation-13/` stays sealed as its round's record (the `12` included, now documented), and
`validation-14/` is a fresh rerun, so no log is ever claimed rerun when it was only inspected;
(d) **auxiliary failure-path probes instead of a committed failing case** — a deliberately failing
inventory gate cannot be a committed passing-suite member; the F0/F1/F2 probes verify the mechanism
without polluting the evidence they verify.

Trust boundaries are unchanged from round 13. The strongest remaining risk is the one this round
demonstrates: any manual step between a raw artifact and its summary (an echoed command that is
not the executed command, a transcribed digest, an expanded-away operand) can pass unnoticed
through authoring. The countermeasure applied here is to make each such step either mechanical
(generation aborts on mismatch) or recorded verbatim (exact script bytes, full diffs, full
outputs), to verify digests programmatically against staged bytes, and to record the verification
procedures themselves so the next reviewer repeats rather than trusts them. The owner note in
review-12 is acknowledged: a further recurrence in this evidence path should trigger
reconstruction or reassignment of the evidence-generation step rather than another repair round.

### Third-party review under AGENTS.md

**No new third-party code, test, script, asset, dependency or service was copied, adapted, vendored
or added this round.** `packages/kernel/package.json` still declares exactly `"canonicalize": "3.0.0"`
with the same pinned tarball and integrity; neither file is touched by this round at all. The
Apache-2.0 record and round-3 owner approval stand unchanged.

### Reference maintenance ([008](../../008-implementation-report.md))

**No Layer-3 owner changed, and none needed to.** The only documentation touched besides this
packet's own records is the K1.1 prose/row in `007-work-packets.md`, which 007 owns. The sealed
records ([review-11](review-11.md), [review-12](review-12.md), [implementation-13](implementation-13.md),
`validation-13/`) are not altered. No contract change, no policy change, no placeholder resolution.

## Handoff

- **Ready for independent review** on the corrected candidate. C11 stands byte-for-byte with
  K11-R12-ID-01 closed and every round-13 count reproduced; the single reopened P2 finding is
  corrected with a reconstructed fail-closed inventory gate whose failure path was deliberately
  exercised; the digest table is programmatically verified; and no known mandatory defect,
  unresolved owned semantic case or missing result remains. That is the basis for
  `WAITING_FOR_REVIEW`; it is not acceptance.
- Base B, unchanged payload C11 and candidate H14 with the verified advertised remote SHA are
  supplied in the external owner handoff after the push, not in this report. H13 is superseded as a
  candidate and must not be reviewed in place of H14; it is preserved as an ancestor.
- **No self-acceptance.** Every criterion assessment above is the implementer's. The verdict is an
  independent reviewer's, bound to the exact candidate.
- **No successor release.** K1.2 is not begun and is not released; `next_release: none`.
