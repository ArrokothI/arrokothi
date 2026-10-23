# Cleanup 01 — BINDING-01

- **Owner instruction (2026-10-22):** "Independent review 01 (Codex GPT-6, a separate session from the
  implementer): ACCEPT of exact H, no findings", with instructions to preserve the CI evidence, merge main,
  correct 014 and open the PR. The owner merges manually.
- **Role:** the owner's Claude Code desktop session (`claude-opus-5-5`), not the implementer's or the reviewer's
  session. It transcribes the independent verdict and does not supply it.
- **Identities:**

  | Item | Commit |
  |---|---|
  | B | `af9e3b0ece4786ec41940f1dfa5f0468d83ddd08` |
  | C | `da945d3f8ba42f6d1ec6d5e3bcd74ae6a604502f` |
  | Accepted H | `b7a24c79d547958c419b01e615e859f94ca3132b` |
  | Review 01 recorded | `0bf0df206ed6c375707609926b65b9e5fc417989` |
  | A (CI evidence and 007 ACCEPTED) | `b700178b0b444b757f4cbca308a9a43a84ec4c3a` |
  | Remote main | `8f487f8159e17c1af790f3a235b167ed23b2a0fa` (PR #52) |

- **Post-review changes:** all administrative, with no payload. H..cleanup touches only `docs/`.
  - The merge of main (`a586917e`). It had no conflicts, and its tree equals `git merge-tree` of the review
    commit and main. It brings only TOOLS-02A's records.
  - A: the [review 01 evidence](review-01/README.md), byte-identical to a fresh `gh run download`, and the
    007 row.
  - This record, 014's BINDING-01 account and next steps, 007's TOOLS-02 intake, and progress.
- **Checks:** the composed verify was not rerun, because the payload is C's. CI run `39868378094` at C returned
  `checks_passed`, 18/18. `check:builder-docs` passes.
- **V-ENV:** not released. Acceptance makes the narrowed core claim eligible; release is a separate owner
  decision.
- **To TOOLS-02:** the 853 rule-1 V-ENV hold-register entries and the reopened origins (brief 01, without new
  credit), and three P3 items:
  1. The import-scanner, kernel-landing-zone and mcp-boundaries census rows store every repository read, so
     any new test file invalidates them.
  2. `corpus` regeneration has no `clean_payload` preflight.
  3. The bookkeeping-trace case hits its 900 s child timeout locally under machine load. It has not appeared
     in CI.
- **Process retro:**
  - One review round; ACCEPT on the first review, with no findings.
  - The owner moved the implementer from GPT-6 to Opus 5.5 on 2026-10-22 (Codex quota).
  - Three failed CI rounds before the green one (`39699916222`, `39704481161`, `39818820449`). All were
    evidence-fixture relocation defects; none was a product defect.
  - One owner direction: the C1 snapshot obligation moved to a direct SDK wrapper test.
  - The brain session did the design check and diagnosed the CI failures.
  - No verdict flips.
  - Change to try: when a packet moves code between packages, audit every fixture, probe and census route
    for the old paths before the first CI dispatch.
- **Disposition:** cleanup complete. Integration is pending the owner's merge, and the receipt follows it.
  `next_release: none`.
