# Implementation report — K1.1, round 11

## Identity

- **Packet / parent:** K1.1 / K1. **Contract:** [contract.md](contract.md), **revision 5 (unchanged).**
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (B), including
  006/007/008/012/015 as they stand there.
- **State:** correction loop `IN_PROGRESS`; `WAITING_FOR_REVIEW` is claimed on the basis below, only
  after both mandatory findings were closed and the clean payload revalidated. No self-acceptance.
  **Owner release:** explicit instruction on 2026-09-14 ("Let's release K1.1") through
  [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent); correction rounds on a released
  packet need no renewed permission under 006. **Do not release or begin K1.2.**
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, integrated as `main` PR #21 /
  `9baff3a03662720af6eefe1ecfabc41fde99298f`, receipts [K1.0](../K1.0/integration-01.md) and
  [K1.0-correction-02](../K1.0-correction-02/integration-01.md), ledger-reconciled by `main` PR #26 /
  `05f48c204d1eae021b3464c206e5c11e84bb3505`. Both verified as ancestors of the C10 checkout in
  [`01-tree-and-environment.log`](validation-11/01-tree-and-environment.log).
- **Branch / remote:** `codex/k1.1-create-reserve-async-dispatch` on `origin`.
- **Base commit B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Payload C10 (UNCHANGED):** `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14`, byte-for-byte. No
  production source, test, fixture, evaluator, threshold, configuration or contract change was
  required or made: the review found C1–C10 PASS and closed K11-R7-STATE-03, and both mandatory
  findings are evidence/status-record defects. No C11 exists; manufacturing one merely to increment
  a round number would violate 006's payload identity it is meant to serve. The rerun below is
  itself the check that no payload defect was hiding: every round-10 count and ablation rejection
  reproduces exactly.
- **Reviewed candidate this round corrects:** H10 `2cdb1e22f0391079619e97a0fe49bf09c7855ca6`.
- **Authoritative review record:** [review-08.md](review-08.md) (OpenAI ChatGPT, GPT-5.6 Sol, High;
  `CHANGES REQUIRED`: C1–C10 PASS, K11-R7-STATE-03 CLOSED, two mandatory P2 findings below),
  recorded at `fbba168b638840cecc871ce4e787bc29ddc04b5d`.
- **Previously reviewed candidates and reviews, all preserved as ancestors of C10:** C `8cd9e269` /
  H `0f345b3c` / review-01; C2 `6b7e5fb0` / H2 `297cc56f`; C3 `615cdf88` / H3 `b3cdf337` / review-02;
  C4 `1d4e4867` / H4 `156f1353` / review-03 + supplement-01; C5 `e0660eff` / H5 `bd2dab6d` /
  review-04; C6 `b3d0d59f` / H6 `417798a3` / review-05; C7 `e59bd312` / H7 `ae02c32a` /
  review-06-supplement-01 + review-06; C8 `79151afc` / H8 `c1e7d78a` (superseded before review,
  preserved); C9 `5ac76207` / H9 `5dddc2ad` / review-07 (CHANGES REQUIRED, preserved);
  C10 `d1fcffd` / H10 `2cdb1e2` / review-08 (CHANGES REQUIRED, preserved).
  Nothing was amended, rebased, squashed, force-pushed or reset this round.
- **Candidate H11:** the commit containing this report. Its full SHA and the verified advertised
  remote SHA are in the external handoff, not here: a report cannot certify its own future push.
- **Exact C10..H11 administrative file allowlist:**
  `docs/development/work/K1.1/implementation-11.md` (this report),
  `docs/development/work/K1.1/validation-11/` (MANIFEST plus ten declared output-only logs,
  force-added with `git add -f` because root `.gitignore` ignores `*.log`), and the K1.1 prose/row
  corrections in `docs/development/007-work-packets.md`. No production source, test, script,
  fixture, evaluator rule, threshold or configuration is in that interval; the payload stays C10.
- **Working-tree state:** validation ran in a detached `git worktree` at exactly C10
  (`/tmp/k11-c11-validation`, `node_modules` symlinked), where `git status` showed only
  `?? node_modules`. In the main checkout, pre-existing uncommitted user modifications under
  `mental-model/` (wording only, not this packet) remain **unstaged and uncommitted** in H11;
  H10/review-08 ancestry is preserved normally.

## Changes and coverage

### K11-R10-EVID-01 (P2) — validation record integrity: corrected, evidence regenerated

Two defects, both in the record rather than the implementation, corrected as the review required —
by correcting the evidence, not by explaining the inconsistency away.

1. **The 51-character digest token.** The `validation-10` manifest's token for
   `09b-distinguishing-ablations.log` is not a truncation that can be relabeled: verified
   programmatically, the exact committed attachment hashes to the full 64-character
   `4594c1a0b44091ddd510f9716991054e788b639c4f6cd1bccee1eb05cd40aad8`, while the recorded token
   is `real[0:45] + real[58:64]` — 13 middle hex characters (`1bccee1eb05cd`) dropped in
   transcription. The attachment itself was and is intact (every other `validation-10` digest
   re-verifies against its committed file, confirmed in the same pass), but the token as recorded
   could not be a SHA-256 digest. This round's manifest records only digests recomputed from the
   exact files committed alongside it, and the digest table was independently re-verified after
   finalization (procedure below).
2. **The inventory mismatch.** The `validation-10` `01` log measured the export surface with
   `grep -c "export" packages/kernel/src/index.ts` (= `15`) while the summary claimed the log
   establishes 17 runtime exports. Both numbers were measured, but they measure different things:
   `15` counts *source lines containing the substring "export"* — 7 value-export lines plus 8
   `export type` lines, the latter erased at compile time — while `17` is the runtime surface
   (2 + 1 + 4 + 2 + 1 + 2 + 5 value names across the 7 value-export lines). A line count cannot
   substantiate a runtime-surface claim, and it was not relabeled as one here. The `01` log in
   `validation-11/` measures the surface directly — it imports the barrel and prints all 17 names —
   alongside the 11-file listing, the exact `canonicalize` pin (version, resolved tarball,
   integrity), and the distinct import specifiers reachable from the zone (`./` internals,
   `node:buffer`, exactly `canonicalize`).

### K11-R10-DOC-01 (P2) — stale current-state prose in 007: reconciled

The K1.1 table row already reached C10/H10, but the live explanatory prose above it still described
the round-4 state (three review rounds, fourth candidate C4, contract revision 4). The prose now
states the round-10 position (payload C10, contract revision 5) and points to the authoritative row
for the full candidate/review history; no prior candidate or review was removed — the row retains
every one of them. The row itself now records that H10 received `CHANGES REQUIRED` from review-08
(C1–C10 PASS, K11-R7-STATE-03 closed, the two P2 findings) followed by this correction's H11
candidacy. 006 policy is untouched; no review condition was reinterpreted.

### K11-R7-STATE-03 remains closed (no payload work this round)

The round-10 null-prototype descriptor reconstruction, restore direction, prior `[[Set]]`
protections, serializer-window protections, dispatch semantics and cumulative Kernel behavior are
preserved byte-for-byte: C10 is the payload. The preservation is proven rather than asserted — the
full round-10 standard set plus the complete directional ablation battery were rerun against the
clean C10 checkout, and every count and every rejection reproduces exactly (control 207/0; XA 11,
XB 6, X1 15, X7 14, X3 3, X4 2, X8 9). Had any payload semantic drifted, a count or a rejection
would have moved.

### Tests added, changed and retired

None. No test was added, removed, weakened or retired, and no threshold moved. Packet suite stands
at 207 tests / 44 suites; `npm test` at 2,265 / 345; conformance at 1,949 / 283; architecture at
362 / 37 — all identical to round 10.

### Prior findings

| ID | Disposition |
|---|---|
| **K11-R10-EVID-01** | **Corrected this round** (forensics + regenerated substantiating evidence, above). |
| **K11-R10-DOC-01** | **Corrected this round** (prose reconciled, H10 verdict + H11 recorded, above). |
| **K11-R7-STATE-03** | Remains closed; reconstruction untouched, directional ablations rerun green-on-control/reject-on-weakening. |
| K11-R6-STATE-02 / VAL-04 / VAL-05, K11-R5-STATE-01 / VAL-03, K11-R4-DISP-01 / PROC-01, K11-R2-VAL-02 / EVID-01, K11-R1-* | Remain closed; the rerun re-proves the suites that guard them with zero failures. |

## Validation and interpretation

Every command ran in the detached worktree `/tmp/k11-c11-validation` at exactly
C10 `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14` (`node_modules` symlinked; otherwise clean), on
Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64, from that worktree's repository
root. Exit codes, counts, raw paths and SHA-256 digests are in
[`validation-11/MANIFEST.md`](validation-11/MANIFEST.md).

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
detached worktree; none of it is carried over, including from `validation-10/`. **Inspected, not
rerun:** the prior payload/report/review commits and the K1.0 prerequisite integrations, checked by
`git merge-base --is-ancestor` in `01-tree-and-environment.log` (H10 and the review-08 record are
verified as C10 *descendants*, i.e. administrative children rather than payload ancestors); prior
`validation-01/.../10` logs, which remain committed as their own rounds' evidence and are **not**
claimed as this candidate's reruns — except that the `validation-10` 09b attachment was
hash-verified intact as part of the EVID-01 forensics (only its manifest token was corrupt).
**Digest verification procedure (new this round, applied to the new table):** after the
`validation-11/` files were finalized, every manifest token was programmatically compared against a
fresh SHA-256 recomputation over the exact committed file — length-checked at 64 hex characters —
rather than eyeballed. That procedure is also what proved the precise shape of the round-10
corruption (`real[0:45] + real[58:64]`).
**Implementer-only auxiliary probes (not validation evidence):** none this round; no semantic
question arose.
**Checks not run, and the resulting limits.** `npm run test:evals` was not run: 006 requires it for
Agent behaviour, and neither C10 nor this administrative round touches any Agent, model path or eval
fixture. No process-kill run: this packet makes no persistence or process-failure claim. No native
Driver, packaging or release check. So nothing here supports a durability, isolation,
native-fidelity, release or E-gate claim.

**External fixture / gate / decision:** none prepared, none executed, none claimed. E0–E6 are the
benchmark repository's.

### Why the evidence supports each criterion — implementer assessment, not acceptance

The independent review already returned PASS for K1.1-C1 through C10 on this exact payload, and the
payload is unchanged. The rerun's contribution is that every count reproduces exactly, so the
evidence now truthfully substantiates what it claims: atomic creation/replay/conflict (C1), triple
identity and ingress order (C2), one-capture values with exact JCS bytes and limits (C3), single-
observation dispatch with exact reservation and asynchrony (C4), exact redelivery (C5), immutable
per-boundary evidence with scoped reads (C6), named refusals of unlanded surfaces (C7), no
discriminator with the exact dependency boundary (C8), inert truthful projection (C9), and the
11-file / 17-export / exact-`canonicalize` structural boundary (C10 — now visibly established in
the `01` log rather than summarized past it). Per-criterion verdicts remain the next independent
reviewer's to give; nothing here is marked ACCEPTED.

### Design choices, assumptions and the strongest remaining risk

Routine choices under 007: (a) **no new payload candidate** — the findings are record defects on an
accepted-semantics payload, and a gratuitous C11 would obscure the identity chain rather than
strengthen it; (b) **regeneration over in-place repair** — `validation-10/` stays sealed as its
round's record (corrupt token included, now documented), and `validation-11/` is a fresh rerun, so
no log is ever claimed rerun when it was only inspected; (c) **measurement over relabeling** — the
`15` was explained (source-line count, derived exactly) and replaced by a direct runtime-surface
measurement, not reinterpreted into agreement; (d) **prose reconciliation by updating, not by
deleting history** — the stale paragraph now states the current position and defers to the row that
retains every candidate and review.

Trust boundaries are unchanged from round 10. The strongest remaining risk is the process-level one
this round itself demonstrates: transcription between a raw artifact and its manifest is a manual
step where a 13-character drop passed unnoticed through authoring. The countermeasure applied here
is to make digest verification programmatic and post-finalization (length-checked recomputation over
committed bytes), and to record that procedure in the manifest so the next reviewer can repeat it
rather than trust it.

### Third-party review under AGENTS.md

**No new third-party code, test, script, asset, dependency or service was copied, adapted, vendored
or added this round.** `packages/kernel/package.json` still declares exactly `"canonicalize": "3.0.0"`
with the same pinned tarball and integrity; neither file is touched by this round at all. The
Apache-2.0 record and round-3 owner approval stand unchanged.

### Reference maintenance ([008](../../008-implementation-report.md))

**No Layer-3 owner changed, and none needed to.** The only documentation touched besides this
packet's own records is the K1.1 prose/row in `007-work-packets.md`, which 007 owns. The sealed
records ([review-08](review-08.md), [implementation-10](implementation-10.md),
`validation-10/`) are not altered. No contract change, no policy change, no placeholder resolution.

## Handoff

- **Ready for independent review** on the corrected candidate. Both mandatory P2 findings from
  [review-08](review-08.md) are closed with regenerated substantiating evidence, the payload stands
  byte-for-byte with every round-10 count and ablation rejection reproduced, the digest table is
  programmatically verified, and no known mandatory defect, unresolved owned semantic case or
  missing result remains. That is the basis for `WAITING_FOR_REVIEW`; it is not acceptance.
- Base B, unchanged payload C10 and candidate H11 with the verified advertised remote SHA are
  supplied in the external owner handoff after the push, not in this report. H10 is superseded as a
  candidate and must not be reviewed in place of H11; it is preserved as an ancestor.
- **No self-acceptance.** Every criterion assessment above is the implementer's. The verdict is an
  independent reviewer's, bound to the exact candidate.
- **No successor release.** K1.2 is not begun and is not released; `next_release: none`.
