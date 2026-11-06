# K1.4 progress

The resume point for any session continuing this packet. Newest facts first within each list.

- **Phase:** IN_PROGRESS (2026-11-06), build, range A. [Owner choices 02](owner-choices-02.md) and
  [design 02](design-02.md) are pushed (`13893791`). Range A (the bridge and the switch, K14-1..3) is built:
  - `packages/sdk/src/legacy-bridge/`: `driver.ts` (the only SDK file that constructs a `Harness`),
    `lineage-scheduler.ts`, `root-ids.ts`, `codec.ts`, `classify.ts` (the D01-CHK-02 predicate),
    `harness-view.ts` (Q2 refusals);
  - `packages/sdk/src/host.ts` (the coordinator, dispatch, timer pumping, known-state ledger) and the
    rewritten `application.ts` (`start` creates the root synchronously, owner choice A; `input`,
    `resolveConfirmation`, `cancel`, `inspect`); option dispositions; `"private": true` (owner choice D);
  - K14-3: `legacy-bridge` zone and `zoneOf` (longest prefix), `bridgeBoundaryViolations` with
    rejected-edge controls (`legacy-bridge-boundaries.test.ts`), the quarantine and builder-docs admission
    lists (`SDK_KERNEL_IMPORTERS`), and `kernel-ownership.md`'s tables;
  - migrated tests: `packages/sdk/tests/application.test.ts`, the examples and their `settle.ts`, and two
    restated `binding-surface.test.ts` assertions (D01-CHK-06);
  - the bridge corpus `packages/sdk/tests/bridge-*.test.ts` (design 02 §3, range-A items).
  Next: commit C, regenerate the adoption table in a fresh clone, local fixture checks, then the Packet verify
  CI dispatch. Range B follows.
- Range-A notes for the review:
  - The legacy effect processor already abandons a spawn or capability dispatch once the native cancellation
    request is recorded (`abandonIfCancellationPending`, inside the commit). The Driver's post-step cascade
    covers the window before that record lands; B-CANCEL-MIDSTEP-CHILD holds that window open with a gated
    store read, and an ablation of the post-step cascade fails it.
  - A full local SDK suite once timed out the `capture-continuations.mjs small` child (900 s) under parallel
    load; run alone it takes 43 s with 0 violations (the L-16 pattern).
- Design history: [design 01](design-01.md) pushed `e06e6e71`; [owner choices 01](owner-choices-01.md) and the
  decision-02 amendment note pushed `6831b112`.
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
