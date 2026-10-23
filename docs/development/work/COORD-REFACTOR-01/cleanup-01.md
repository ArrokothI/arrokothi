# Cleanup 01 — COORD-REFACTOR-01

- **Owner instruction (2026-10-23):** "Independent review 02 (Codex GPT-6, not the implementer): ACCEPT of
  exact H", with instructions to preserve the CI evidence, merge main, record both reviews, check owner choice
  01's statement, list the TOOLS-02 items, update 014 and open the PR. The owner merges manually.
- **Role:** the owner's Claude Code desktop session (`claude-opus-5-5`), not the implementer's or the reviewer's
  session. It transcribes the independent verdict and does not supply it.
- **Identities:**

  | Item | Commit |
  |---|---|
  | B | `7626a623dad8acfc73584e08212c126b5b6daefc` |
  | C | `9f1412d1b3f6f41120609a4886a51b4c32c69880` |
  | Accepted H | `23c8919f949b932b67567a6ee3f54d8b77b76449` |
  | Review 01 recorded (CHANGES REQUIRED of `276cbea4`) | `7f9b89d12af08d526b44a7801845c287739bea90` |
  | Review 02 recorded (ACCEPT of H) | `a4e40d2202429b451f31b42dc06f8e94ffe7d3a7` |
  | A (CI evidence and 007 ACCEPTED) | `79793f03ac6c0e8365009d30f8ad2592cccc2c0e` |
  | Remote main | `7626a623dad8acfc73584e08212c126b5b6daefc` (PR #55, equal to B) |

- **Post-review changes:** all administrative, with no payload. H..cleanup touches only `docs/`.
  - Review 01 was already on the packet branch. Review 02 was fast-forwarded in. The merge of main was a no-op,
    because main is still B, so 014 and 007 had no conflicts.
  - A: the [review 02 evidence](review-02/README.md), byte-identical to a fresh `gh run download`, and the 007 row.
  - This record, 014's account and next steps, 007's TOOLS-02 intake and progress. 002's opening paragraph no
    longer calls BINDING-01 a candidate (stale since PR #53).
- **Checks:** the composed verify was not rerun, because the payload is C's. CI run `39996755805` at C returned
  `checks_passed`, 18/18. `check:builder-docs` passes. No other check reads 002; `adoption.json` names it only
  as an advisory area.
- **Owner choice 01:** a standing behaviour exception. BASELINE states it under "Plans and one state owner".
  A search of `mental-model/` and 002 found no remaining description of the old partial effects.
- **To TOOLS-02:** three P3 items, plus the fault-oracle origin reopened and transferred under design 01, without
  new credit:
  1. CR1-R1-TOOLS-01: `state-owner-controls.json` records only commit-table killers for the dropped coupled
     fields, not the resulting-state killers design 01 promised.
  2. `design-01.md:488` says only the coordinator's call site sees the captured-map mutation. The writer guard
     also reports it (review 02, item 3).
  3. The scanner census churned again: 40 preserved rows were re-digested because two new test files changed
     their read lists. This is BINDING-01 [cleanup 01](../BINDING-01/cleanup-01.md)'s first item, seen again.
- **Process retro:**
  - Two review rounds. Review 01 found CR1-R1-CREATION-01, a real fault-path defect. Design 01 (lines 434–436)
    had foreseen the listing/lookup split, but closed it by argument, not by a test. Review 02 accepted.
  - The implementer changed mid-build from the first Opus session to a fresh Opus session. (Progress records
    this as the same session resuming. This record follows the owner's account.)
  - The design check and both reviews were by GPT-6.
  - One owner choice (01) and one owner direction (fix CREATION-01 keeping B's outcome, with no new exception).
  - Both CI rounds passed on their first dispatch.
  - Change to try: when a design argues that a fault cannot produce a state B lacks, the design check asks for
    the fault test before the build.
- **Disposition:** cleanup complete. Integration is pending the owner's merge, and the receipt follows it.
  `next_release: none`.
