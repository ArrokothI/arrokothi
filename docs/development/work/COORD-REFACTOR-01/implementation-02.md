# Implementation report — COORD-REFACTOR-01, round 2

## Identity

- **Packet:** COORD-REFACTOR-01, coordinator plan/apply refactor. [Brief 01](brief-01.md) is the contract; the
  governing process baseline is [006](../../006-development-process.md) at B.
- **State:** WAITING_FOR_REVIEW.
  - Previous round: [report 01](implementation-01.md), H `276cbea492385a4d773369bba679564ba7da052e`.
  - [Review 01](review-01.md) (Codex GPT-6, `7f9b89d1`): CHANGES REQUIRED on CR1-R1-CREATION-01 (P2).
    CR1-R1-TOOLS-01 (P3) goes to TOOLS-02.
  - Owner direction for this round: fix CREATION-01 preserving B's behaviour, with no new exception.
    Check every arm for the same pattern. Fault each creation publication in turn and pin B's outcome.
- **Branch:** `claude/coord-refactor-01` on `origin`.
  - B `7626a623dad8acfc73584e08212c126b5b6daefc`.
  - Payload C `9f1412d1b3f6f41120609a4886a51b4c32c69880`.
- **Candidate H:** the commit containing this report.
- **C..H administrative allowlist:** `docs/development/007-work-packets.md`, this report, `progress.md`.
- **Working tree:** clean. The push is verified in the external handoff.

## CR1-R1-CREATION-01

- **Cause.** At B the Execution map was the listing (`Map.forEach`), so lookup and listing were one
  publication. Round 1 kept separate links on the records and wrote them after both `mapSet` publications.
  Moving the links earlier would not have been enough. After a creation-key fault the key is not indexed, so a
  same-key retry publishes the same ID again. `Map.set` keeps that ID's place; a link list would append it a
  second time.
- **Fix.** The owner's `visibleExecutionIds(caller)` walks the Execution map with B's own `Map.forEach`
  statement, and `visibleExecutions` delegates to it. The links (`next`, `#first`/`#last`, `nextExecution`) are
  removed. The creation arm commits B's two `mapSet` calls, in B's order.
- **Same pattern elsewhere.** Every arm's commit phase was compared with B's statement order. Every fallible
  publication keeps B's order, and no write follows one unless B had that write too. The owner's only added
  write is `version`: first in each arm, before any fallible publication, and in no view or answer. Creation
  was the only instance.
- **Analysis precision.** With B's walk in the owner, the DEC-9 effect analysis reported the coordinator's
  delegating call as a change to accepted state. A captured binding was always taken with everything reachable
  from it. Captured provenance now splits like parameter provenance: `capturedExact`, a binding's own object, and
  `captured`, its reach. Five new negative controls in `control-commits.test.ts`, listed in
  [design 01](design-01.md) revision 2. One fails if the split is dropped; the old rule fails the clean control.
- **Tests.** `creation-faults.test.ts` and `creation-faults-child.ts` fault the Execution-map publication and
  the creation-key publication in turn. For each they pin B's outcome: the thrown error, `inspect`, the listing,
  a retry with the same key, and a creation with a different key followed by the same-key retry. The same files
  pass at B, fail at H `276cbea4` on the creation-key case, and pass at C.
- **Behaviour:** B's outcome on these paths, with no new exception. No public export, request or answer type,
  receipt, ID, refusal classification, reason or precedence changes. No oracle expectation, scenario or golden
  vector is edited.

## Changes

| Group | Files |
|---|---|
| Owner and planner | `state.ts`, `state-records.ts`, `coordinator.ts` |
| Structural checks | `zone-analysis.ts` (`capturedExact`; the unused `link` commit form removed), `control-commits.test.ts` (creation table, writer table, five controls), `state-plans.test.ts` (reader recipe) |
| Witness | `creation-faults.test.ts`, `creation-faults-child.ts` (new) |
| Registry upkeep | `state-owner-controls.json` (family test counts 83/73/92); `mutations.json` (the CR1-4c import-line mutant follows the owner's `identity.ts` import; its ID recomputed by `mutation_key`) |
| Evidence churn | `adoption.json` regenerated mechanically: 11 control-commits rule-1 holds move lines, 40 preserved rows change reads, 2 change positions; no status changes and no new credit |
| Docs | design 01 revision 2 (two superseded passages marked), BASELINE |

## Validation

**Packet verify CI run `39996755805`** at C, spec `docs/development/work/COORD-REFACTOR-01/verification.json`:
job `verify` succeeded (17:38–18:29Z). The implementer did not download the artifact.

- **Fresh clone at C** (`git clone --no-local`, `npm ci`, nothing untracked before or after; Mac arm64, Node
  v26.10.0):
  - tool-tests: 615 pass;
  - `mutations.json`: 119/119 killed;
  - `value-cost.json`: 238/238 killed;
  - `refusal-guards.json`: 322/322 killed;
  - full verify: `checks_passed`, 18/18. Repository tests 4,412; archive 4; examples 18. Adoption
    `revalidation_complete`: suite credit 3, preserved 30, origins complete 33 and pending revalidation 121, as
    in round 1. The sweeps (66 fault scenarios, 0 violations; poison sweep over 51 files), censuses, typecheck,
    continuations, builder docs and area gate all passed.
- **First full verify at the same C:** `attention_required`. Three repository tests in untouched files
  (`byte-shadows.test.ts` and two SDK capture tests) hit their `spawnSync` timeouts at load average ~169. The
  killed children had already printed their correct answers. Rerun in the same clean clone at normal load:
  passed, as above.
- **Criteria (implementer assessment):** CR1-3 now closes with B's creation-fault outcome pinned. CR1-1, CR1-2
  and CR1-4 are as review 01 assessed; CR1-4's kills hold at C.

## Findings for TOOLS-02

1. **CR1-R1-TOOLS-01 (P3, from review 01).** The dropped-field mutants' resulting-state killers promised by
   design 01 are not recorded by `state-owner-probe.mjs`. Not fixed here.
2. **Local load timeouts (implementer).** At high machine load, child-process tests can exceed their
   `spawnSync` timeouts and fail a clean verify. BINDING-01's report records the same kind of flake.

## Handoff

Ready for independent review (Codex GPT-6) of H over C and B, citing CI `39996755805`. The pushed H SHA is
supplied externally. No self-acceptance; no hold is lifted and no successor is released.
