# Cleanup 02 — TOOLS-02 ranges 2–4 (T2-3, T2-4, T2-5)

- **Owner instruction (2026-11-02):** "Prompt C: owner-delegated cleanup of TOOLS-02 ranges 2–4. Follow 006's
  cleanup step and the archive policy." The message names review 06's ACCEPT of exact H2 and both review records on
  `origin/claude/tools-02-review-05` at `6f3dffb6`. It asks for:
  - a branch `claude/tools-02-cleanup-02` from H2, with that review branch merged in;
  - this record;
  - 007's TOOLS-02 row marked ACCEPTED, and progress and 002's TOOLS-02 status updated where stated;
  - the archive policy applied to closed working evidence, with no accepted code, test or fixture changed;
  - `git diff --check` and typecheck;
  - a push and a PR to main. It does not authorize a merge.
- **Role:** a fresh Claude Code desktop session (`claude-opus-5-5`). It is not the implementing session or the reviewing
  session, and it worked in its own worktree. It transcribes review 06's authentic verdict as the owner's delegate.
  This record is neither an independent acceptance nor an integration receipt.
- **Identities:**

  | Item | Commit |
  |---|---|
  | B, and current remote main | `335ae7e6b6ddf7fa3c32a8605559268ed8a4e39b` |
  | C, reviewed by review 05 | `302fee9de7dc857ce58cf1e86d7fbb223af7c5fb` |
  | H, CHANGES REQUIRED by review 05 | `19c1f43f2989acc1a501c96ca0f0f08dbba339b9` |
  | C2, the correction | `272489a0c3a6e853d17f3ba89f719a627f859847` |
  | **Accepted H2** | **`0c2573eb61b399508df49d9dad16c732d7e1fd3b`** |
  | Reviews 05 and 06 recorded, head of `origin/claude/tools-02-review-05` | `6f3dffb6b7f4da338d0362e3ffee44332f5db0d0` |
  | Merge of the review records onto H2 | `fc7613157cdd3fadf1c21487a7ae2688de84ca08` |
  | Acceptance transcription A (007 row only) | `83a87d804813b05d432022fdafac7c5cfcbe91ef` |

  This record is in a later commit. The external handoff gives that commit and the verified remote head, so this
  record does not name its own SHA.

- **Review:** [review 06](review-06.md) is the authentic independent ACCEPT. It was written by the separate Claude Opus
  session that wrote [review 05](review-05.md), under [owner choice 12](owner-choice-12.md). Its verdict line:
  "ACCEPT — H `0c2573eb61b399508df49d9dad16c732d7e1fd3b` — TOOLS-02 ranges 2–4 (T2-3, T2-4, T2-5)."
  - It is the bounded delta review the owner chose. Review 05's cumulative B..H results stand for H2, because
    T2-R5-BOUND shows that H2 differs from H only in the correction's files and administrative records.
  - It closes T2-R5-CLAIM-01 and raises no new finding.
  - The six files in [review 05's manifest](review-05/checks.json) match their SHA-256. The two CI artifact ZIPs match
    the digests their reviews state: `fa98a22d…` for run 41286444190 and `831b5b7b…` for run 41358816946.
- **Packet:** with range 1 (T2-1, T2-2), accepted by [review 04](review-04.md) at H `34ab91a5` and
  [integrated](integration-01.md) at `4015599e` (PR #59), every TOOLS-02 criterion is independently accepted.
  Ranges 2–4 are accepted at exact H2 only.

## Post-review changes and payload

- B → C → H → C2 → H2 is a single ancestry chain. C..H2 touches only the eight paths review 06 lists under
  T2-R5-BOUND. The `candidate` rerun below confirms C2..H2.
- **H2..A:**
  - The merge `fc761315` adds only review 05, review 06, brief 05 and their evidence, under
    `docs/development/work/TOOLS-02/review-05*` and `review-06*`. Their bytes equal `6f3dffb6`'s. The review branch
    started from main (`335ae7e6`), so the merge had no conflict.
  - `83a87d80` changes only 007's TOOLS-02 row: the status and one dated transcription entry quoting the verdict line.
- **The cleanup commit** adds this record and a dated entry to [progress](progress.md). It also adds a cleanup entry
  to 007's TOOLS-02 row and rewrites [014](../../014-owner-progress-summary.md). It touches no other path.
- **Payload:** B..H2 is the payload review 05 reviewed (B..C), plus the C..H2 correction review 06 reviewed. The
  payload changes:
  - `scripts/packet_tools.py`, `tests/tooling/` and `tests/fixtures/packet-tools/`;
  - five maintained Kernel test files and `tests/architecture/builder-docs-anchor.test.ts`, by added tests and
    assertions only;
  - 002, 017 L-17 and the TOOLS-02 records.

  No file under `packages/*/src`, no manifest or lockfile, and no `mental-model/` path changes.
- **No unreviewed payload was found.** Remote main equals B, so nothing on main can conflict with this branch or
  invalidate the review. Earlier records keep their bytes: the brief, designs, checks, owner choices, implementation
  reports, triage evidence and reviews.

## Checks

- **Candidate check, rerun** in this worktree with H2's tooling (Python 3.13.5, Git 2.39.5, Node v26.10.0):
  `python3 -B scripts/packet_tools.py candidate --payload 272489a0… --head 0c2573eb… --spec docs/development/work/TOOLS-02/verification.json`.
  It returns exit 0 and `facts_verified`. The administrative files are 007, implementation 06 and progress. The only
  whitespace exception is `design-04.md`, as at review 04. The command checks C2..H2 by design.
- **CI evidence, reused at C2.** Packet verify run
  [41358816946](https://github.com/ArrokothI/arrokothi/actions/runs/41358816946) tested C2 and returned
  `checks_passed`, 19 of 19. Review 06 downloaded its artifact and kept it in [review-06](review-06/).
  - The evidence still applies to this tree. C2's code, tests, fixtures and spec are unchanged through H2, the merge,
    A and this cleanup. Those later commits touch only `docs/development/`.
  - The run was not repeated.
- **`inventory` and `corpus` at the cleanup head:** the external handoff gives their results. They check that the
  added records leave the provenance inventory and the adoption corpus unchanged.
- **Rerun on this cleanup tree** (Node v26.10.0):
  - `git diff --check 0c2573eb…` over everything staged is clean;
  - `npm run typecheck` exits 0;
  - `npm run check:builder-docs` passes: 74 Markdown files, 2,225 local links and anchors, 38 public package
    imports.

## Current claims at H2

- **002** states no TOOLS-02 status, so this cleanup leaves it unchanged. Its one TOOLS-02 claim is the
  hold-register sentence. That sentence now cites the corpus report's `unread:*` rows of `register.by_classification`,
  pinning 1,174 to `302fee9d…`. Review 06 checked it against run 41286444190 and found the same register at C2.
- **017:**
  - L-17 has the same reference and pinned figure.
  - L-16 and L-18 are range 1's and unchanged.
  - L-12 still covers KC3-R3-CREDIT-03.
- **007's dependency lines** say TOOLS-02 must be accepted and integrated before K1.4 is accepted. Acceptance now
  holds. Integration waits for the owner's merge.

## Layer 3

None is needed.
- TOOLS-02 is repository evidence tooling plus regression tests. B..H2 changes no `mental-model/` path and no
  product source.
- The new Kernel tests assert existing behaviour; they define or change no Kernel, Runtime, Driver or deployment
  semantics.
- `mental-model/roadmap.md` maps no Layer-3 owner to TOOLS-02.

Reviews 05 and 06 reached the same conclusion: "No product source changes."

## Archive policy

[The archive policy](../../archive.md) archives a *closed* packet. That requires independent acceptance, integration
and owner closure, and the archiving is done by a separate maintenance change that has a verified archive locator.
TOOLS-02 is accepted but neither integrated nor owner-closed. The policy also keeps raw evidence available through
review. **So this cleanup moves or deletes nothing.** It does what the policy allows at this stage:
- **Continuing obligations are extracted** into current ledgers:
  - review 05's open P3 notes, listed below and in 014's carry-forward;
  - the unread entries (017 L-17);
  - the reading-strength limits stated in 014.
- **Live inputs stay at their maintained paths.** `owner-choice-03.md` and `owner-choice-03/transferred-origins.json`
  are read by `tests/fixtures/packet-tools/adoption.json` and `tests/tooling/test_transfer_limits.py`. They must stay
  even after closure, unless a later change extracts them.
- **Candidates for the later maintenance change**, with the pinned Git tree at the integration commit as their
  locator:

  | Item | Files | Bytes |
  |---|---:|---:|
  | Review evidence, six Packet verify CI artifact ZIPs | 6 | 13,051,282 |
  | Review evidence, all of `review-0*` | 52 | 13,441,152 |
  | Triage working evidence: triage batches and readings, family applicability, group reviews, projections, adoption ledgers, self-audit | 70 | 1,782,210 |

  No archive artifact was made here, and no upload or retention is claimed.

## Non-blocking follow-ups

Review 05 raised these, and review 06 leaves them open and non-blocking. Routing them is the owner's call.
- **T2-R5-WITNESS-01 (P3):** 540 of the 560 `unread_witness` records keep the `required_result` text "Held for
  BINDING-01 under V-ENV: Held by owner choice 08 rule 1 …". The `kind` field is authoritative, but the prose reads as
  an active hold. A later `regenerate` could rewrite it.
- **T2-R5-TRIAGE-01 (P3):** audit items 56, 121 and 144 are minor errors; all are safe.
  - Items 56 and 121 come from one mechanism: a file-level rationale applied to every mention in a K1.1
    implementation report. Other mentions in those reports may share it.
  - Item 144 is S3/L-01, but S5 fits.
- **T2-R5-RELEVANCE-01 (P3):** `K1.2-correction-01/coverage-07.md:124` links the seven READ-01 cases of the row above
  it. This is over-linking with no gap.
- **Review 05's design 06 §5 note:** §5 does not say that a plain-text relative spelling of an existing file outside
  `docs/` is neither required nor a candidate. That matches D04-CHK-06.

## Process retro (ranges 2–4, with the whole packet)

- **Rounds:** two reviews for ranges 2–4. Review 05 returned CHANGES REQUIRED, and review 06, a bounded delta review,
  returned ACCEPT. Across the packet there were six reviews: four CHANGES REQUIRED (01–03 of range 1, then 05) and two
  ACCEPTs (04 for range 1, 06 for ranges 2–4). Review 05 was the fourth CHANGES REQUIRED, so 006's stop-and-redesign
  applied. The owner chose the refined finishable claim and a bounded delta review.
- **Owner choices 06–14** set the implementer, caps and checkpoints, and design 06:
  - The triage stopped for the owner six times on projected or measured caps (projections 05, 06, 07, 08, 10 and
    12). Each stop ended with a raised or reshaped cap.
  - Choices 13 and 14 replaced accepted TOOLS-01 controls before code. The member route set left 218 of 396 members
    with no fitting route. The transitive context walk, once widened, exceeded 2,400 records.
  - Design 06 was checked in review 05, not in a separate design check.
- **Findings by family (ranges 2–4):**
  - *Records, current claims:* T2-R5-CLAIM-01 (P2). A count derived from the corpus was copied by hand into 002 and
    017 at range 3's checkpoint (983). Range 4's recompute changed it to 1,174, and nothing compared the prose with
    the report. T2-R5-WITNESS-01 (P3) is the same kind of stale prose, inside records.
  - *Evidence, triage judgement:* T2-R5-TRIAGE-01 and T2-R5-RELEVANCE-01 (P3).
  - *Design:* none from review. The §5 note concerns wording.
- **Verdict flips:** none. T2-3, T2-4's mechanism and T2-5 passed in review 05 and carried to H2. T2-4's docs claim
  was false at H and true at H2, which corrects a finding, not a flip. Range 1's criteria were not reopened.
- **Change to try:** write every corpus-derived figure in current prose as a reference to the report row, plus the
  revision it was measured at, from the first draft. This finding cost a full review round, and it was the second
  drift of its kind in 002 (the earlier one was "853 rule-1 held entries" against 891 measured).

## Disposition

Cleanup complete. TOOLS-02 ranges 2–4 are independently accepted at H2
`0c2573eb61b399508df49d9dad16c732d7e1fd3b` (review 06), and range 1 at H `34ab91a5de23beb4997cdd2ae209a3b67aac50a0`
(review 04, integrated). Integration of ranges 2–4 is pending the owner's merge, and the receipt follows it. No hold
is lifted. `next_release: none`.
