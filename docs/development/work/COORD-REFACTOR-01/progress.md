# COORD-REFACTOR-01 progress

The resume point for any session continuing this packet. Newest facts first within each list.

- Phase: IN_PROGRESS. Writing [design 01](design-01.md); then stop for the GPT-6 design check.
- Branch: `claude/coord-refactor-01`; B: `7626a623dad8acfc73584e08212c126b5b6daefc` (main after PR #55, which
  merged [release 01](release-01.md) and [brief 01](brief-01.md)).
- Implementer: Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), Mac arm64, 2026-10-22
  America/New_York. Not the design checker or reviewer (Codex GPT-6 sessions).
- Setup: prepend `/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin` to PATH; `node --version`
  is `v26.10.0`.
- Command plan: the packet's `verification.json` (written during the build, modelled on BINDING-01's) runs the
  composed verify in [Packet verify](../../../../.github/workflows/packet-verify.yml). Before each dispatch:
  tool-tests, both mutation registries (`mutations.json`, `value-cost.json`) and the full verify in a fresh
  clone (`git clone --no-local`, `npm ci`, nothing untracked). Dispatch, record the run ID, end the turn; never poll.
