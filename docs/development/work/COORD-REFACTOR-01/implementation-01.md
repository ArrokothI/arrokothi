# Implementation report — COORD-REFACTOR-01, round 1

## Identity

- **Packet:** COORD-REFACTOR-01, coordinator plan/apply refactor. There is no separate contract; [brief 01](brief-01.md)
  is the contract. The governing process baseline is [006](../../006-development-process.md) at B.
- **State:** WAITING_FOR_REVIEW.
  - Owner release: [release 01](release-01.md).
  - Design: [design 01](design-01.md) with revision 1. GPT-6 [checked](design-01-check.md) it: APPROVED WITH
    REQUIRED CHANGES.
  - Owner answer: [owner choice 01](owner-choice-01.md), for D01-CHK-1.
  - Prerequisite: BINDING-01, accepted (H `b7a24c79`) and integrated (`cd8d9250`, PR #53).
- **Branch:** `claude/coord-refactor-01` on `origin`.
  - B `7626a623dad8acfc73584e08212c126b5b6daefc`.
  - Payload C `71e2ddfe3fb246bdc7c0a3c74d6178598e1dc846`.
  - No earlier review.
- **Candidate H:** the commit containing this report.
- **C..H administrative allowlist:** `docs/development/007-work-packets.md`, this report, `progress.md`.
- **Working tree:** clean. The push is verified in the external handoff.

## Changes and coverage

| Group | Files |
|---|---|
| Plan union and owner | `packages/kernel/src/plan.ts`, `state-records.ts`, `state.ts` (new); `coordinator.ts` becomes planner/shell |
| Structural checks | `tests/conformance/architecture/boundary-policy.ts` (R1–R4, `zoneImportViolations`), `kernel-state-ownership.test.ts`; `zone-analysis.ts` (getter modelling, planner/arm/writer checks); ported `control-commits.test.ts` |
| Witnesses | `state-plans.test.ts` (plans, readers, inspection, brand), `state-types.test.ts` (pinned TS codes), `fault-paths(-child).ts` (owner choice 01) |
| Oracle locator | `sweep/fault-oracle.ts`, `fault-oracle.test.ts` (frame files only) |
| Registries | `mutations.json` (four CR1-4 cases; TypeScript lib and `@types/node` dependency entries), `refusal-guards.json` (same TypeScript subset), `state-owner-probe.mjs`, `state-owner-controls.json`, `coverage.json`, value-cost re-pointing, `value-cost-source-files.json` |
| Evidence churn | `adoption.json` regenerated (census, register, nine retired witnesses, one transferred origin, 17 shifted targets), `design-01/*.json`, `test_transfer_limits.py`, `test_target_tools.py` (one registry test), landing-zone file list and derived inventory row |
| Docs | rewrite-index §4, BASELINE, 017 L-15, `kernel-ownership.md` |

- **Behaviour:** no public export, request/answer type, receipt, ID, refusal classification, reason or precedence
  changes. The only difference is owner choice 01's bounded engine-fault exception, which `fault-paths.test.ts` pins
  per path.
- **Inventory fates:**
  - `ambient-reads.test.ts`: ported, with the test file unchanged.
  - `zone-inventory.ts`: ported (two entries moved to `state.ts`).
  - `zone-analysis.ts`: ported and extended.
  - `control-commits.test.ts`: ported (D01-CHK-3). Its 37 negative controls cover every old control family, plus
    the getter, basis and dropped-field mutants.
  - The fault-oracle locator: relocated, with every expectation byte-identical.
- **Accepted design found unfit:** none.
- **Self-found defects (implementer provenance):**
  1. The owner's creation guard first also checked the Execution map. Under the C-MAPSET-CREATION-KEY value-cost
     mutant this threw instead of failing an assertion. Fixed: the guard now checks only the creation-key index
     the planner read.
  2. The mutations registry did not copy TypeScript's lib declarations, so a zone analysis could not typecheck
     inside it. Fixed in the registry. That entry is also the subset the source-facts toolchain and
     `pinned_toolchain()` read, so those now copy 65 files instead of four; they only parse, and the adoption
     result is unchanged.
  3. Consequence of 2: `refusal-guards.json` still copied the four-file subset, so 67 refusal mutants had an
     invalid baseline in the first full verify. Fixed: it copies the pinned subset, and a tool test requires
     every registry that copies TypeScript or runs the tool tests to copy exactly that subset.

## Validation and interpretation

**Packet verify CI run `39932022363`** at C, spec `docs/development/work/COORD-REFACTOR-01/verification.json`: job
`verify` succeeded (09:27–10:23Z); the owner reported the pass. The implementer did not download the artifact.

- **Fresh clone at C** (`git clone --no-local`, `npm ci`, nothing untracked; Mac arm64, Node v26.10.0, Python 3.13):
  - tool-tests: 615 pass;
  - `mutations.json`: `selected_cases_passed`, 119/119 killed;
  - `value-cost.json`: `selected_cases_passed`, 238/238 killed;
  - `refusal-guards.json`: `selected_cases_passed`, 322/322 killed;
  - full verify: `checks_passed`. That included repository tests 4,405, archive 4, examples 18, adoption
    `revalidation_complete`, kernel sweeps, continuations, censuses, typecheck, builder-docs and area-gate.
  - nothing untracked before or after.
- **Criteria (implementer assessment):**
  - CR1-1: closed union, data-only proof, pinned type fixtures and a per-operation runtime witness.
  - CR1-2: module rules R1–R4 with must-fail fixtures, private-field brand, reader witness, writer and arm checks.
  - CR1-3: complete-decision oracle, sweeps and Outcome suites unchanged; 4,405 repository tests.
  - CR1-4: four families, 10 mutants, all killed at named assertions, deterministic.
- **Strongest remaining risk:** plan selection is still semantic (017 L-15).
- **Third-party:** none.

## Handoff

Ready for independent review (Codex GPT-6) of H over C and B, citing CI `39932022363`. The pushed H SHA is
supplied externally. No self-acceptance; no hold is lifted and no successor is released.
