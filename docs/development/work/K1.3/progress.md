# K1.3 progress

The resume point for any session continuing this packet. Newest facts first within each list.

- **Phase:** WAITING_FOR_REVIEW (2026-10-26). Payload C `db0d0fee95466edc7a527ef234a2170fb6fedebb`; H is the commit
  of [implementation report 01](implementation-01.md). Packet verify CI run `40387031804` at C: `checks_passed`,
  19/19. The earlier run `40280293990` at `7d9be1bc` failed only on the kernel-sweeps time limit, which
  [owner choice 02](owner-choice-02.md) resolved. Next: the independent review of H. The implementer stops here.
- Work clones (2026-10-26): the first scratchpad worktree was lost; the session's scratchpad holds `wt-k13` and
  `fresh-k13`, cloned from GitHub, never the main checkout.
- Design 01 in brief: injected `KernelClock`; host entries `pendingTimers()` and `fireTimer(key)` (a fire is a hint
  resolved against the Kernel's clock and state); wait capture in `outcome.ts`, pure eligibility and selection in
  `waits.ts`; four new plan variants (expiry, cancellation, losing outcome, timer discard) and three extended ones;
  owner checks S1–S5; `cancelScopes`; optional Driver `requestInterrupt`; `executionDeadline` in creation content;
  K13-9 as an exhaustive depth-4 search over 13 letters from 8 seeds at bounds 1 and 2 (456,976 runs) against a
  reference model and invariants INV-1–INV-12.
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
