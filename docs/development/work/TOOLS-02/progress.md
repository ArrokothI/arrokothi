# TOOLS-02 progress

The resume point for any session continuing this packet. Newest facts first within each list.

- **Phase:** IN_PROGRESS, design. [Design 01](design-01.md) is pushed and awaits the Codex GPT-6 design check.
  No code is written before the check answers its §10 questions.
- **Branch:** `claude/tools-02`, from B `b5daf35aeee37305c1ee41bb626c97d26db94ab2` (main after PR #58, which merged
  [release 01](release-01.md) and [brief 01](brief-01.md), scope B).
- **Implementer:** Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), Mac arm64, 2026-10-23 America/New_York.
  The design checker and the reviewer are Codex GPT-6 sessions.
- **Setup:** prepend `/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin` to PATH; `node --version`
  is `v26.10.0`. The owner's main checkout holds ignored files (`.env`, `docs/development/work/K1.1/`), so run the census,
  `corpus` and `verify` only in a fresh clone (`git clone --no-local`, `npm ci`, nothing untracked).
- **B baseline** (fresh clone, local): `npm run typecheck` exit 0; `npm test` 4,412/4,412 pass.
- **Command plan:** `verification.json` (written in range 1, modelled on COORD-REFACTOR-01's) runs the composed verify in
  [Packet verify](../../../../.github/workflows/packet-verify.yml).
  1. Before each dispatch, in a fresh clone: `tool-tests`, both mutation registries (`mutations.json`, `value-cost.json`)
     and the full verify.
  2. Dispatch: `gh workflow run packet-verify.yml -f revision=<full C> -f spec=docs/development/work/TOOLS-02/verification.json`.
  3. Record the run ID here and end the turn. Never poll.
- **Build order after the check** (design 01 §9):
  1. Range 1: T2-1 and T2-2. It is self-contained, verified at C1, and K1.3 waits on it.
  2. Range 2: T2-3.
  3. Range 3: T2-4.
  4. Range 4: T2-5's triage, extraction and P3 items.
- **Declared before any triage** (design 01 §5.4–§5.5):
  - the rule S1–S6;
  - the classes `not_a_counterexample`, `covered_elsewhere`, `superseded` and `recorded_limit` (the last proposed);
  - the audit: n = 150, seed 20261023, bound of at most 3 unsafe errors;
  - relevance samples of 10 + 10, seeds 20261024 and 20261025;
  - a self-audit of n = 50, seed 20261026, bound of at most 1.
- **Measurement scripts** live in the session scratchpad and are not committed. Design 01 §1.1 and §4.1 state their
  results.
