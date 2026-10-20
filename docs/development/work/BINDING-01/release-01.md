# BINDING-01 — owner release 01

Recorded 2026-10-20 by the owner's Claude Code desktop session (`claude-opus-5-5`), which drafted
[brief 01](brief-01.md). The owner's words, verbatim:

```text
release BINDING-01, use Uint8Array, GPT6 implements.
```

- **Released:** BINDING-01, from main `af9e3b0e` on `claude/binding-01`, with brief 01 as its brief.
- **Owner answer to brief question 1:** the Kernel's value input is a `Uint8Array`, copied into Kernel-owned
  storage on entry. The design note still decides what each reader gets back.
- **Implementer:** a Codex GPT-6 session. Work may continue across sessions and machines, through pushed commits
  and the packet's `progress.md`.
- **Design check:** required before code (006), by a session other than the implementer. The owner names it.
- **Review gate and verification:** as brief 01 states. Packet verify runs in CI.
- **Prerequisites:** TOOLS-01 (integrated `8f829003`) and K1.1-correction-03 (integrated `b976f3a3`), both
  accepted and integrated. TOOLS-02A (integrated `af9e3b0e`) restored a reproducible composed verify.
- **Not released:** COORD-REFACTOR-01, TOOLS-02, K1.3 and later packets. No hold is lifted by this release.
