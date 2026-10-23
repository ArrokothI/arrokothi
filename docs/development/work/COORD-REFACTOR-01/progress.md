# COORD-REFACTOR-01 progress

The resume point for any session continuing this packet. Newest facts first within each list.

- Phase: IN_PROGRESS, building. [Design check](design-01-check.md) (GPT-6, of `b0a1e491`): APPROVED WITH REQUIRED CHANGES
  D01-CHK-1..4. [Owner choice 01](owner-choice-01.md) answers D01-CHK-1 (three engine-fault paths become atomic; one
  fault-injection test each; BASELINE states the exception). Both merged fast-forward at `dde21bd8`. Design 01 revision 1
  folds in D01-CHK-2..4 (getters modelled in zone-analysis; control-commits ported with phase/exit/basis guards;
  per-variant commit table and per-field arm table; R4 value/type split).
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
- B baseline (local, Mac arm64, Node v26.10.0): `npm run typecheck` exit 0; `npm test` 4,345/4,345 pass;
  fault sweep 66 scenarios / 13,673 runs / 57 exits, 0 violations (~2 s); poison sweep passed (228 s).
- Design summary: `plan.ts` (closed plan union), `state-records.ts` (mutable record types, imported only by
  `state.ts`), `state.ts` (`KernelState`: `#private` records, `apply(plan)`, live read-only readers),
  `coordinator.ts` (planner/shell). Basis = per-Execution version checked by `apply`. Retire
  `control-commits.test.ts` with mapping; port ambient-reads/zone-inventory/zone-analysis and the fault-oracle locator.
- Build checkpoint 1: `plan.ts`, `state-records.ts`, `state.ts` added; `coordinator.ts` is planner/shell. Typecheck
  clean; kernel suite 1,717/1,792 with only the source-located guards failing (ambient-reads, control-commits);
  fault-oracle locator ported (two files, both halves checked); fault sweep 66 scenarios / 57 exits / 0 violations;
  `fault-oracle.test.ts` + `fault-sweep.test.ts` 269/269. Next: zone-analysis getters, zone-inventory, ported
  control-commits, ownership rules, plan/reader witnesses, fault-path tests, registries, Layer 3.
