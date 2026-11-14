# K1.4-candidate — owner release 01

Recorded 2026-11-14 by the owner's Claude Code desktop session (`claude-opus-5-5`), which drafted
[brief 01](brief-01.md). The owner's words, verbatim, answering brief 01's five decisions:

```text
Accept all
```

- **Prerequisite met.** K1.4 is accepted at H `e307943d` (review 05), with its round 6 documentation
  correction accepted at H `64c505bf` (review 06), and integrated at `eb8472e5` (PR #67), with
  [receipt 01](../K1.4/integration-01.md) merged at `a1702d75` (PR #68).
- **Released:** K1.4-candidate, a real-Kernel candidate for the K0 public fixture (KC-1 to KC-6), with brief 01
  and the owner's answers recorded there as its brief. The release takes effect when the owner merges this record
  to main. The coding agent's base B is main after that merge.
- **Order (decision 1).** K1.4-gate now depends on this packet accepted and integrated and on the benchmark
  owner's E1 release that pins it. This record releases neither K1.4-gate nor any benchmark work: E1 round 3
  (re-pin, load the new candidate, capture) needs its own release in the benchmark repository.
- **Roles (decision 5):**
  - a fresh Claude Opus 5.5 session implements;
  - a session that has not worked on the packet and does not read the planner's notes directory does the design
    check and the independent review: the owner's teammate's Codex GPT-6, or a Claude Fable 5.2 session;
  - a fresh session does the Prompt C cleanup.
- **Lifecycle:** design note, design check, then build (006); no Prompt E. Packet verify runs in CI from the
  first C.
- **Not released:** K1.4-gate and later packets.
