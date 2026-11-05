# K1.4 progress

The resume point for any session continuing this packet. Newest facts first within each list.

- **Phase:** IN_PROGRESS (2026-11-05), design. [Design 01](design-01.md) is written and pushed. Next: a Codex GPT-6
  Prompt E attack (`codex/k1.4-attack`), then a Codex GPT-6 design check (`codex/k1.4-design-check`) that also
  answers the owner questions (design 01 §16, Q1–Q8). **No code before the check.** The implementer stops here.
- Design 01 in brief: one legacy Driver privately owns the 0.8.x `Harness` as the native Runtime. Each Kernel
  Execution has one native lineage whose root shares the Kernel ID. Each exchange runs one native step: `continue`,
  `await` with input subscriptions at native quiescence, or `complete`/`fail`. A lineage scheduler gives each
  Execution its own worker. The SDK host dispatches READY Executions and pumps timers inside host calls only.
  Replies to native pauses travel as Kernel input. `app.harness` becomes a deprecated read view. The wrapper is
  exported with the L-01 startup check. Recommended shape: one packet, ranges A (bridge) and B (surface and
  migration), one review.
- Branch: `claude/k1.4` in its own worktree (`../wt-k1.4` beside the main checkout). B:
  `608f9ece44dbe42b78974bdac9e7ddcd33697705` (main after PR #66).
- Implementer: Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), Mac arm64, 2026-11-05. Not the adversary,
  design checker or reviewer.
- Setup: prepend `/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin` to PATH; `node --version`
  is `v26.10.0`.
- B baseline (fresh clone from GitHub at B, `npm install`, Node v26.10.0): `npm run typecheck` exit 0; `npm test`
  exit 0, 4,766 tests, 4,766 pass, 0 fail, 0 skipped, 523 suites.
- Command plan (build phase): a `verification.json` modelled on K1.3's runs the composed verify in
  [Packet verify](../../../../.github/workflows/packet-verify.yml) from the first C. Before each dispatch, run the
  tool tests, both mutation registries and the full verify in a fresh clone. Regenerate
  `tests/fixtures/packet-tools/adoption.json` only with TOOLS-02's `regenerate`, in a fresh clone.
