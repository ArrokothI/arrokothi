# K1.3 progress

The resume point for any session continuing this packet. Newest facts first within each list.

- **Phase:** IN_PROGRESS, design. [Design 01](design-01.md) is being written. When it is pushed, the work stops:
  a Prompt E adversary attacks it (`attack-01.md`), then a Codex GPT-6 session runs the design check, which reads
  the attack record. No production code before the check.
- Branch: `claude/k1.3`; B: `22c8c1db9958049eb8693dd5aa4d7005f2d565db` (main after PR #61, which merged
  [release 01](release-01.md) and [brief 01](brief-01.md) with the owner's answers).
- Implementer: Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), Mac arm64, 2026-10-25 America/New_York.
  Not the adversary, design checker or reviewer.
- Worktree: a separate worktree; the main checkout belongs to the TOOLS-02 implementer.
- Setup: prepend `/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin` to PATH; `node --version`
  is `v26.10.0`. The shell's default `node` (v25.2.1) fails three SDK capture tests at B; use 26.10.0.
- B baseline (local, fresh worktree, `npm ci`, Node v26.10.0): `npm run typecheck` exit 0; `npm test` 4,412/4,412.
- Command plan (build phase): a `verification.json` modelled on COORD-REFACTOR-01's runs the composed verify in
  [Packet verify](../../../../.github/workflows/packet-verify.yml) from the first C. Before each dispatch:
  tool-tests, both mutation registries and the full verify in a fresh clone. Regenerate
  `tests/fixtures/packet-tools/adoption.json` only with TOOLS-02 range 1's `regenerate` in a fresh clone; whichever
  of K1.3 and TOOLS-02 lands second regenerates after merging main.
