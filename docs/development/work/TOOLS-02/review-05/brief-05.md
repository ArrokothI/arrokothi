# Correction brief 05 — TOOLS-02 ranges 2–4

```text
Correct the same released packet TOOLS-02 on codex/tools-02, after the owner chooses the 006 route.
Base 335ae7e6b6ddf7fa3c32a8605559268ed8a4e39b; reviewed H 19c1f43f2989acc1a501c96ca0f0f08dbba339b9 over
C 302fee9de7dc857ce58cf1e86d7fbb223af7c5fb; review record docs/development/work/TOOLS-02/review-05.md on
claude/tools-02-review-05 (verdict commit 3e478016747b890f3de5abd3806ab7c65ea8f29f; this brief, the root-cause
note and the owner answer were added by the next commit on that branch).
Open finding T2-R5-CLAIM-01 (P2); its required outcome and counterexample are in that record. The P3
observations (T2-R5-WITNESS-01, -TRIAGE-01, -RELEVANCE-01) are not part of this round.
Owner supplemental decisions: owner choices 01–14 at H, plus the owner's "Bounded delta review" answer in
review 05's "Owner answer" section. Unresolved authority: the 006 route after this fourth CHANGES REQUIRED.
Review 05 recommends a refined finishable claim, and this brief is written for that route.
Read the brief below first. Answer its questions in implementation 06. This change stays inside design 03 §6's
approved register, so 006 needs no new design note or design check. Apply 006 and 012: fix the mechanism as
well as the two lines. Use 008 for the report and 006 for the new C/H plus evidence and push handoff. No
successor release.
```

## Goal

BASELINE (002) and 017 L-17 state the hold register's unread count as a hand-copied figure, 983. The corpus
changed after that figure was copied, and at H the count is 1,174. Make the claim one that cannot go stale
silently, without touching anything else the review accepted, so the bounded review can close it.

## Criteria (finishable)

| ID | Criterion | Closes by | Evidence expected |
|---|---|---|---|
| T2-R5-CLAIM-01 | 002 (lines 190–192 at H) and 017 L-17 make no false current claim about the register's unread entries ([review 05](../review-05.md), "T2-R5-CLAIM-01 in detail"; brief 01's review gate) | Mechanism: either the text cites the corpus report's `register.by_classification` unread rows and copies no figure, or it gives a figure together with the revision it was measured at, and that figure equals the report at that revision | The C..C2 diff of the two passages; the report's `register.by_classification` at C2 |
| T2-R5-BOUND | The correction changes nothing that review 05 accepted | Check: `git diff --name-only C H2` lists only 002, 017 and the packet's administrative records. These are `verification.json` (only its `administrative_files`), `progress.md`, the new implementation report, any new self-audit file and 007's TOOLS-02 row. Every other path under `tests/`, `scripts/`, `packages/`, `docs/` and `mental-model/` is byte-identical | That list in implementation 06. **Any other path ends the bounded review, and the next review is cumulative under 006.** |
| T2-R5-VERIFY | Packet verify passes at C2 | Check: the CI run at C2, dispatched without polling, as owner choice 12 requires | Run ID and artifact digest |

## Known counterexamples

- At H, `scripts/packet_tools.py corpus` reports these unread rows: 1,100 V-ENV, 41 Proxy, 21 V-D1 and 12
  re-prototyped built-in, 1,174 in total. It also reports 11 `not_held` entries and 1 `superseded`, out of
  1,186. 002 and 017 L-17 both say 983. Corpus fixtures are unchanged from C to C2, so C2 must report the same
  counts. If it does not, stop.
- Keep every counterexample, control and mutant at C. This round adds no corpus item: the defect is in prose,
  and the owner chose no check, so no deterministic test pins it. If the owner instead chooses redesign, that
  check becomes this round's corpus item.

## Suspect design

None in accepted tooling design. The cause is a process gap. A count derived from the corpus was copied into
current-claim documents at range 3's checkpoint (`d45c971e`). Range 4's recompute (extraction build 03 §4) then
changed the count, and no step revisited the prose. 002's earlier "853 rule-1 held entries" drifted the same way.

Review 05 searched for the same mechanism elsewhere. TOOLS-02 changed three current-claim documents from B to H:
002, 007 and 017. The 983 in 002 and 017 is the only figure they add that derives from the corpus. 007's
TOOLS-02 row holds dated status entries, so its figures are dated rather than current. progress.md:701 keeps
the 983 inside its dated 2026-10-28 entry, which is historical and stays as it is.

## Questions before code

1. Which finishable form will the two passages use, a reference with no figure or a figure pinned to a
   revision? 017 L-17's "Scope" cell should still tell a reader roughly how many entries carry no credit. Say
   how the chosen form does that.
2. Does any other current-claim text at C2 state a corpus-derived TOOLS-02 figure? Review 05 found none. A
   second instance belongs in this round only if fixing it stays inside the T2-R5-BOUND file list. If it would
   not, stop and ask.

## Bounds

- Edit 002 and 017 L-17 only, plus the administrative records.
- Do not regenerate the corpus or edit any fixture, test, script or product file.
- Do not fix the P3s in this round. Each of them would change fixtures or triage records and break the bound.
  They can go to cleanup, or to a later packet if the owner wants them.
- Owner choices 07–14 keep their caps. No hold release, triage change, credit change or historical deletion.
- Push to `codex/tools-02` as the implementer. Do not rewrite H or any review commit.

## Stop conditions

- The owner has not yet chosen the 006 route. Under a route other than the refined finishable claim, this
  brief needs revising before work starts.
- The correction needs a path outside T2-R5-BOUND's list.
- At C2, `corpus` reports different register counts from H, or Packet verify fails.
