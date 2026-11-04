# K1.4 — owner release 01

Recorded 2026-11-03 by the owner's Claude Code desktop session (`claude-opus-5-5`), which drafted
[brief 01](brief-01.md). The owner's words, verbatim, answering brief 01's five decisions:

```text
yes, but opus implement, and GPT6 verify.
```

- **Prerequisites met.** K1.3 is accepted and integrated at `71f9b048` (PR #62). TOOLS-02 is accepted and
  integrated: range 1 at `4015599e` (PR #59), ranges 2–4 at `3475d5d6` (PR #64), with
  [receipt 02](../TOOLS-02/integration-02.md) merged at `92af6e39` (PR #65).
- **Released:** K1.4, the legacy bridge (K14-1 to K14-6), with brief 01 and the owner's answers recorded there as
  its brief. The release takes effect when the owner merges this record to main. The coding agent's base B is main
  after that merge.
- **Split (decision 1).** K14-G moves to a new packet, `K1.4-gate`, which this record does not release. It depends
  on K1.4 accepted and integrated and on the benchmark's E1 release.
- **Roles (decision 5):**
  - a fresh Claude Opus 5.5 session implements;
  - Codex GPT-6 sessions do the Prompt E adversary attack on the design note before the build, the design check,
    and the independent review;
  - a fresh session does the Prompt C cleanup.
- **Lifecycle:** design note, Prompt E attack, design check, then build (006). Packet verify runs in CI from the
  first C.
- **Not released:** K1.4-gate and later packets.
