# K1.3 — owner release 01

Recorded 2026-10-25 by the owner's Claude Code desktop session (`claude-opus-5-5`), which drafted
[brief 01](brief-01.md). The owner's words, verbatim:

```text
K1.3 decision 1: A (optional creation-request field, in canonical content, immutable). Decision 2: one packet, two ranges. Decision 3: run Prompt E. Release after TOOLS-02 range 1 lands.
```

- **Condition met.** TOOLS-02 range 1 (T2-1, T2-2) is integrated at `4015599e` (PR #59), and its
  [receipt](../TOOLS-02/integration-01.md) is merged at `c3b45a64` (PR #60).
- **Released:** K1.3, with brief 01 and the owner's answers recorded there as its brief. The release
  takes effect when the owner merges this record to main. The coding agent's base B is main after that
  merge.
- **Prerequisites:** K1.2, accepted and integrated with K1.2-correction-01 (`ed509e11dc39`, PR #38).
  COORD-REFACTOR-01's plan/apply shape is integrated (`d17ea6d1`, PR #56).
- **Roles,** following the owner's pattern:
  - a fresh Claude Opus 5.5 session implements;
  - a Prompt E adversary attacks the design note before the build (owner decision 3);
  - Codex GPT-6 sessions do the design check and the independent review;
  - a fresh Opus session does the Prompt C cleanup.
- **Shape:** one packet in two ranges, with one review at the end (owner decision 2).
- **Review gate and verification:** as brief 01 states. Packet verify runs in CI from the first C.
- **Concurrent work:** TOOLS-02 ranges 2–4 continue on `claude/tools-02`. Both packets regenerate
  `tests/fixtures/packet-tools/adoption.json` only through `regenerate` in a fresh clone, and whichever
  lands second regenerates after merging main.
- **Not released:** K1.4 and later packets.
