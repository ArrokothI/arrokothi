# Implementation 02 — TOOLS-01, round 2

## Identity

- State: **WAITING_FOR_REVIEW**, entered by the implementer; this is not acceptance. Contract
  [revision 7](contract.md); the 006/008/012 policy is pinned at `b759d0ab…`, per the contract.
- Implementers:
  - Codex (GPT-6) through design 05 steps 1–7, step 8 part 1, repairs 01–02 and item 1;
  - Claude Code (`claude-opus-5-5`) for items 2–6, 2026-10-05.
- Owner authority: [release 01](release-01.md); owner choices [01](owner-choice-01.md)–[07](owner-choice-07.md).
- Base B: `f62527e8d564a6e2f63b83cbb52e24053f333540`. Branch: `codex/tools-01`.
- Payload C: `b104bab192f57c5ecf5b7eccebcfbda412a17b5d`, pushed. H is the commit containing this
  report, a direct child of C; its full SHA is in the external handoff.
- C..H allowlist: this report and `docs/development/007-work-packets.md`. The implementer does not
  edit 007; the design author applies the wording below.

## Changes and coverage (cumulative since [implementation 01](implementation-01.md))

| Group | Record |
|---|---|
| Node floor v26.10.0, A1–A11 | [owner choice 03](owner-choice-03.md), node-floor-01–07 |
| Declared environments, catalog runs, format 2 (all 1,549 origins), source facts, targets | design 05 §6 steps 2–5 commits |
| Preserved census, hold register, families and target-set mutants | [preserved-census-01](preserved-census-01.md), [families-census-01](families-census-01.md) |
| Step 8: 391 targets, 199 witnesses, 110 closures; repairs CONT-01–05 | [closure-01](closure-01.md), continuation-repair-01–03 |
| Step 9, reduced: register over 65 registry cases | [register-cases-01](register-cases-01.md) |
| Area map, derivation and advisory gate | [gate-design-01](gate-design-01.md), gate-stop-01/02, owner choices 06–07 |
| P2: P1-R's transferred origins, AGENTS.md re-pin, this report | commit `b104bab1` |

- **012 methods.** Deterministic execution for the tooling: fixtures, 281 ablated refusals, and the
  full corpus at C. Process/documentation for the owner records and handoff.
- **Exclusions.** The packet makes no Kernel, Runtime or release claim. Race and fault apply only
  to the runner's bounded processes.
- **Tests.** 489 tooling tests. No production or Layer-3 file changed. The only test-source edit is
  the floor fix in `tests/conformance/effects/fast-slow-equivalence.test.ts` (owner choice 03).
- **Self-found defects** (in the commit messages):
  - the quadratic V-ENV recipe;
  - the resolver refusing 38 contexts (owner choice 05);
  - the gate's every-area fallback (owner choices 06–07);
  - the unreachable `mappings_complete` expectation.

## Criteria (implementer assessment, not acceptance)

| Criterion | Assessment and evidence |
|---|---|
| F1 | Candidate facts: ancestry, exact C..H set and preserved paths (AGENTS.md re-pinned to the owner-choice-03 floor commit). The check runs on the committed H; see the handoff. |
| F2–F3, F5 | Inventory of 1,549 origins verified; format 2 links; runner categories unchanged. The summaries keep origins, members, targets, kills, holds and areas separate. |
| F4 | Declared environment and census; floor v26.10.0 (A1–A11 recorded); temporary copies only. |
| F6 | `tests/tooling/README.md` documents every phase, the area map and the gate; no third-party material added. |
| P1-T, P1-P, P1-H | 391 targets pass at C, each credited as a reading (`target_reading`; no mutation kills claimed). The preserved census is 766 / 125 / 74 / 307 (preserved / held / superseded / refused). The register has 226 entries, 65 of them cases; held members route to 199 witnesses. |
| P1-R | 110 of 154 revalidation origins close. Corpus result `revalidation_complete`: the open ones are exactly the 44 of owner choices 04–05 (`transferred` table). |
| P1-M | Families stay TOOLS-02's (owner choice 04); 26 censused, 415 members pending. |
| P1-X | Area map (68 areas) covering the tree; advisory gate in every `verify` (owner choice 07). Triage is TOOLS-02's. |
| P1-C | Adoption, execution, holds and acceptance stay separate. The not-run profiles are listed. |
| P2 | Composed verify at clean C below; this self-review; independent review pending. |

## Area gate at C (owner choice 07)

TOOLS-01's own B..H at C: 181 changed paths, 65 of them behaviour-bearing (owner choice 06 rule 1).
The advisory result is `reported`.

| Touched area | Open origins | `prose_pending` |
|---|---:|---:|
| `package.json` | 47 | 0 |
| `package-lock.json` | 26 | 0 |
| `tests/conformance/effects` | 17 | 0 |
| `tooling` | 10 | 0 |

That is 69 distinct origins (64 `pending`, 5 `pending_revalidation`) and 664 `ungated`. The
manifests and the effects test were changed by the owner-choice-03 floor amendment. No origin was
triaged or closed for the gate.

## Validation at clean C

`python3 -B scripts/packet_tools.py verify --revision b104bab1… --spec docs/development/work/TOOLS-01/checks.json`,
Node v26.10.0 and Python 3.13.5, under `caffeinate -i`: **`checks_passed`**, 2026-10-05
13:38:57–14:17:08Z (38 min 11 s).

| Step | Result |
|---|---|
| tool-tests | 489 tests OK |
| inventory | `provenance_verified` |
| adoption | `revalidation_complete`: 110 complete, 44 transferred, 1,395 pending; 391 targets, 0 refused; register 226 (65 cases); 110 closures with 116 context ranges |
| dimensions | `coverage_reported` |
| registered-mutants | 100 of 100 killed |
| refusal-mutants | 281 of 281 killed |
| refusal-census, oracle-census | pass |
| typecheck | pass |
| repository-tests | 3,774 tests; 0 fail, cancelled, skipped or todo |
| archive-tests | 4 tests; 0 fail |
| kernel-sweeps | pass |
| area-gate | `reported` (advisory) |

The F1 `candidate` check runs on this C/H after H is committed. Its result is in the external
handoff, not in this report.

Not run: the `live-provider`, `large-memory-timing` and `known-base-failure` (`builder-docs`)
profiles, by owner choice 01 and checks.json's limits. Not run either: any Kernel release or hold
evaluation.

## Proposed 007 wording (the design author applies)

1. **Entry check**, as a new paragraph in "How to read a packet", after the 006/012 paragraph:
   > **Corpus area report.** Every packet's `verify` runs TOOLS-01's advisory area gate
   > (`area-gate`; [owner choice 07](work/TOOLS-01/owner-choice-07.md)). The packet's report
   > quotes the gate's counts: open origins and `prose_pending` records per touched area, and the
   > `ungated` count. The gate blocks nothing and requires no triage; a reviewer may cite a listed
   > origin as a lead. TOOLS-02 is accepted and integrated before K1.4 is accepted.
2. **TOOLS-01 status row**, replacing the current one:

   ```markdown
   | TOOLS-01 | WAITING_FOR_REVIEW | Owner [release 01](work/TOOLS-01/release-01.md), 2026-10-02; branch `codex/tools-01`, base `f62527e8d564a6e2f63b83cbb52e24053f333540`; contract [revision 7](work/TOOLS-01/contract.md) (owner choices 01–07). C `b104bab192f57c5ecf5b7eccebcfbda412a17b5d`; [implementation 02](work/TOOLS-01/implementation-02.md). 110 of 154 revalidation origins closed; 44 transferred and 1,395 pending origins left to TOOLS-02; advisory area gate in every `verify`. Independent review pending; no acceptance or successor release. |
   ```

## Risks and limits

- **The strongest risk is V-ENV over-classification.** The CONT-05 recipe made 44 held entries
  without per-test review. Credit is lost, not wrongly granted.
- **Every target credit is a reading.** No target has a mutation kill.
- **Gate areas are lexical.** 664 origins name no path and are ungated until TOOLS-02; the
  enforcement is the K1.4 backstop.

## Handoff

Ready for independent review of the exact C/H, by a GPT-6 session and a Claude session.
No self-acceptance; successor release stays with the owner.
