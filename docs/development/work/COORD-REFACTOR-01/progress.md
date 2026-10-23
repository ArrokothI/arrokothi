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
- Build checkpoint 2 (`30bc94b6`): zone-analysis models getters (D01-CHK-2); `control-commits.test.ts` ported
  (planner hand-over/basis/refusal checks, per-arm commit table, per-field arm writers, 37 negative controls incl.
  getter, basis and dropped-field mutants) 68/68; ambient-reads 47/47 unchanged; kernel suite 1,819/1,819.
- Checkpoint 3 (WIP, this commit): `KERNEL_STATE_RULES` R1–R4 + `zoneImportViolations` in `boundary-policy.ts`;
  `kernel-state-ownership.test.ts` 9/9; landing-zone file list +3; kernel-ownership.md count 16 → 19.
  **Open:** the landing-zone doc-table negative controls (K10-R3/R4/R5/R6 fixtures) anchor on the literal
  `| \`target-kernel\` | 16 |` row text in `kernel-landing-zone.test.ts`; update those anchors to 19 (or derive
  them) and rerun. Then remaining build items, in order: `state-plans.test.ts` (plan witness per operation,
  reader + inspection alias witnesses), `state-types.test.ts` (pinned TS codes, runtime brand), owner choice 01
  fault-path tests (`fault-paths-child.ts`/`fault-paths.test.ts`), CR1-4 registry cases + `state-owner-probe.mjs`,
  value-cost mutant path re-pointing + `value-cost-source-files.json` +3, Layer 3 (rewrite-index §4, BASELINE
  incl. owner-choice exception, 017 limit), `verification.json`, adoption regeneration in a fresh clone, full
  fresh-clone verify, one CI dispatch.
- Session change, 2026-10-23: the same Claude Code desktop session (`claude-opus-5-5`) resumed after a usage
  limit stopped it at checkpoint 3 (`8eaef358`); the owner's resume prompt lists items 1–9 below.
- Item 1 done: the landing-zone dependency-table controls derive the `target-kernel` row and its file count from
  the inventory (`targetKernelDependencyRow`, `targetKernelFileCount`, appended at the file's end so no pinned
  line moves) instead of restating `16`. Architecture conformance 367/367.
- Item 2 done: `state-plans.test.ts` 10/10 — plan witness (kinds per operation, frozen data-only plans, data-only
  answer returned as-is, first plan meets the pre-operation state) for creation, input, dispatch/delivery/settlement
  (incl. late report after resolution and a throwing Driver), redelivery, Outcome, takeover, recovery and protocol
  failure, with their refusals; reader witness with a recipe per member (unclassified member fails); inspection
  freshness witness; runtime brand. Spot check: a live `recoveryHistory` in `viewOf` and a live-mailbox getter are
  both killed.
- Item 3 done: `state-types.test.ts` 10/10 — in-memory fixtures with codes pinned per line: function member TS2322,
  unknown kind TS2322, missing coupled field TS2741, data-only proof TS2344, reader write TS2540, reader import as
  value TS1485 + construction TS1362, private records TS18013, absent mutator TS2339; plus a clean control.
- Item 4 done: `fault-paths-child.ts` + `fault-paths.test.ts` 4/4 — one case per owner-choice-01 path (dispatch,
  input, failed(), delivered()); each pins the fault fired once in the chosen build, the new outcome, the documented
  historical outcome, and equality of view, receipts, IDs and next decisions with the run without the faulting call.
  Poison sweep over the three new kernel test files passes in all four modes.
- Item 5 done: `mutations.json` gains four CR1-4 cases (`state-owner.*`, in the determinism sample) run by
  `tests/tooling/state-owner-probe.mjs` with `state-owner-controls.json`; the registry now copies TypeScript's lib
  declarations and `@types/node`/`undici-types` (entries copied from `value-cost.json`) so the zone analysis
  typechecks in its temporary copy. Fresh-clone run of the four cases: `selected_cases_passed`, 10/10 killed at the
  named killers, determinism passed. Their V-ENV hold-register entries come with item 8.
- Item 6 done: 8 `value-cost.json` mutant edits and 7 `value-cost-c1-ports.json` `at_c` edits re-pointed from
  `coordinator.ts` to `state.ts` (each anchor absent from the coordinator and unique in the owner; `before`/`after`,
  IDs, `at_b` and `original_at_c` unchanged); `value-cost-source-files.json` gains the three modules.
- Item 7 done: rewrite-index §4 transaction-mechanism entry records the binding's plan/owner choice (no `OPEN(`
  marker changes); BASELINE adds the "Plans and one state owner" bullet with the owner-choice-01 exception and
  updates the static-guard sentence; 017 adds L-15 (plan selection stays semantic). Builder docs pass.
- Item 8: `verification.json` written from BINDING-01's (base B, administrative files, preserve list incl. the
  Kernel `index.ts`, `packages/sdk`, brief/release at B and check/owner choice at `dde21bd8`); `coverage.json` gains
  the `state-owner` family and category. Fresh-clone C1 value-cost run exposed one non-assertion failure: under
  C-MAPSET-CREATION-KEY the owner's absence check threw on the executions map; a creation plan's basis is now the
  creation-key index the planner read (`432d4c76`), and c1.creation is 14/14 killed.
  Adoption regenerated in a fresh clone with a scratch driver (not payload): 966 register entries (186 landing-zone
  keys shifted +3 by the file list carry their stored entries; 11 new control-commits and 4 new case keys are
  owner-choice-08 rule-1 holds; 9 dropped), preserved table recomputed: 1,212 rows change only mechanical fields
  (reads, read/production change lists, current positions, reasons) and 9 rows move held → refused (7
  control-commits, 2 fault-oracle spans changed); no row gains `preserved`. Tool-tests 614 OK in a fresh clone;
  refusal census 322/322; oracle census 29/29.
- Item 8 done. Two further mechanical relocations the adoption check required: nine held-witness counterexamples
  whose spans changed are retired to `design-01/reopened-bindings.json`, and the fault-oracle origin is reopened and
  transferred to TOOLS-02 under design 01 (`design-01/revalidation-origins.json`, `transfer_lists`, `transferred`);
  17 landing-zone suite-target declarations follow the +3 file-list shift. Fresh-clone `corpus` at `32a44c5c`:
  `revalidation_complete`; against BINDING-01's accepted CI run: suite credit 3 = 3, preserved 30 = 30, target
  counts equal; counterexamples 603 → 594 (the nine), origins complete 34 → 33 / pending_revalidation 120 → 121.
- Item 9 in progress. Fresh clone at `758b5514`: tool-tests 614 OK (after `test_transfer_limits.py` named design
  01's transfer list), `mutations.json` 119/119 and `value-cost.json` 238/238 killed; the full verify returned
  `attention_required` with one failing check, `refusal-mutants` (255 killed, 67 `invalid_baseline`). Cause: item 5
  enlarged the TypeScript subset `mutations.json` pins, which `pinned_toolchain()` and the source-facts toolchain
  both read, but `refusal-guards.json` copied the old four-file subset into its mutant copies
  (`lib.decorators.d.ts` missing). Fix: `refusal-guards.json` copies the pinned subset, and a tool test requires
  every registry that copies TypeScript or runs the tool tests to copy exactly that subset (it fails on the old
  registry).
- Item 9: C `71e2ddfe3fb246bdc7c0a3c74d6178598e1dc846`. Fresh clone (`git clone --no-local`, `npm ci`, nothing
  untracked before or after; Mac arm64, Node v26.10.0), 07:43–09:27Z: tool-tests 615 OK; `mutations.json` 119/119,
  `value-cost.json` 238/238 and `refusal-guards.json` 322/322 killed (`selected_cases_passed`); full verify
  `checks_passed` (repository tests 4,405, archive 4, example 18; adoption `revalidation_complete`; sweeps,
  censuses, typecheck and builder docs finished).
- CI dispatched once at C `71e2ddfe`: `packet-verify.yml` run `39932022363`
  (https://github.com/ArrokothI/arrokothi/actions/runs/39932022363). Not polled; H waits for its result.
- CI run `39932022363` succeeded (owner-reported). H: [implementation report 01](implementation-01.md) and the 007 row
  WAITING_FOR_REVIEW. Next: independent review by Codex GPT-6.

## Round 2 (review 01)

- 2026-10-23: [review 01](review-01.md) (GPT-6, `7f9b89d1`, parent H `276cbea4`): CHANGES REQUIRED. CR1-R1-CREATION-01
  (P2) blocks; CR1-R1-TOOLS-01 (P3) goes to TOOLS-02 and is listed, not fixed. The packet branch is fast-forwarded to
  the review; 007 records CHANGES_REQUESTED. Owner direction: fix CREATION-01 preserving B's behaviour, no new
  exception; check every arm for the same pattern; fault each creation publication in turn and pin B's outcome
  (thrown error, inspect, listing, retry with the same and a different key). Same session continues (Claude Code
  desktop, `claude-opus-5-5`).
- CR1-R1-CREATION-01 fixed (`58388239`, `2c2c42de`): the Execution map is the listing again. The owner's
  `visibleExecutionIds(caller)` walks it with B's `Map.forEach` statement; the creation links (`next`,
  `#first`/`#last`, `nextExecution`) are removed, and the creation arm commits B's two `mapSet` calls in B's order.
  Moving the links up would not have been enough: after a creation-key fault a same-key retry publishes the same ID
  again, which `Map.set` keeps in place and a link list would append. Every other arm was compared with B's
  statement order; creation was the only instance. The DEC-9 effect analysis split captured provenance into a
  binding's own object and its reach, since the walk's append to its fresh list was reported as a state change; five
  new negative controls, one killing the ablation that drops the split. `creation-faults.test.ts` and its child pin
  B's outcome for each publication fault (pass at B, fail at H, pass at the fix). Design 01 revision 2; BASELINE.
- Mechanical follow-ups: `state-owner-controls.json` family test counts 83/73/92 (`b7ac50f3`); the CR1-4c
  import-line mutant follows the owner's `identity.ts` import, ID recomputed by `mutation_key` (`db9aa211`);
  adoption regenerated (`1257c167`): 11 control-commits rule-1 holds shift lines, 40 preserved rows change reads
  and 2 positions, no status changes; corpus `revalidation_complete` with suite credit 3, preserved 30 and origins
  33/121 as in round 1 (no new credit). Repository tests 4,412; both sweeps pass.
