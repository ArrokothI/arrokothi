# Implementation report — K1.3, round 3 (the successor check)

## Identity

- **Packet:** K1.3, correction round 2. Records:
  - [review 02](review-02.md): CHANGES REQUIRED of H `87db3c40c379d0d2186b16cfee9cc2b16d989a73`
    (K13-R02-S2-01, K13-R02-S2-02), with 006 stop-and-redesign;
  - [owner choice 04](owner-choice-04.md): option 1, the owner relations as a predicate over the record about to
    commit;
  - [design 03](design-03.md) and [design check 03](design-check-03.md): APPROVED WITH REQUIRED CHANGES
    D03-CHK-01 to -06;
  - [owner choice 05](owner-choice-05.md): D1, full evaluation;
  - [owner choice 06](owner-choice-06.md): the fault oracle follows L-28;
  - design 03's [revision 1](design-03.md#revision-1--owner-choice-05-and-design-check-03), which the build follows.

  Owner choices [01](owner-choice-01.md)–[03](owner-choice-03.md) and brief 02's bounds stay in force. Process:
  [006](../../006-development-process.md), [008](../../008-implementation-report.md), [012](../../012-review-methods.md).
- **Implementer:** Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), owner's Mac (arm64), 2026-10-27. It is
  the same session as rounds 1 and 2, and it is not the reviewer or design checker.
- **Branch:** `claude/k1.3`, fast-forwarded to design check 03's commit `5605beb7` before any change.
  - Base B: `22c8c1db9958049eb8693dd5aa4d7005f2d565db`.
  - Payload C: `c7abff65ceca3e3b21fd64ffee12ea2f636f5cbc`. Its parent `1ea79ca29ccef646b3292f56d6447a9638546c4e`
    holds the build; C removes one environment switch from the new search test (see Validation).
  - Previous reviewed H: `87db3c40…` (review 02).
- **Candidate H:** the commit containing this report. C..H changes only this report, the 007 row and
  `progress.md`, which is the spec's administrative allowlist for this round.

## Changes since the reviewed H (H2..C)

The reviewer's and design checker's records (review 02 and its bundle, design 03, design check 03 and its
bundle) arrived by fast-forward and are not listed.

| Group | Files |
|---|---|
| Owner choices 05 and 06; design 03 revision 1 | `work/K1.3/owner-choice-05.md`, `owner-choice-06.md`, `design-03.md` |
| **The successor check.** `successor()` builds a frozen overlay from a change literal naming every governed member; `admit()` evaluates T1–T6 against the old record, then P1–P9 over the whole successor, on every decision; creation uses `admitCreated()` (P alone). Every successor arm (input, dispatch, Outcome, expiry, cancellation) binds `next` once in prepare and commits its members exactly. Delivery, takeover and control refuse terminal records (T1). Labels carry the S-tags (`"P1, S2: …"`), so the round-1/2 controls still match. `postStateViolation()` is an evidence-only reader | `packages/kernel/src/state.ts` |
| **Static rule** (D03-CHK-01): `checkSuccessorArm`, `checkCreationAdmission`, `qualifiedWriters`; `commitSource` follows `next.<member>` and `admitCreated(x)` | `packages/kernel/tests/zone-analysis.ts` |
| Static controls: per-arm changed sets, creation, governed writers and 11 negative controls | `packages/kernel/tests/control-commits.test.ts` (98 tests) |
| Owner controls: review 01/02 named controls (including the 15-case generation matrix), D03-CHK-02, -03 and -04 with positive sequences, and the witness | `packages/kernel/tests/owner-guards.test.ts` (50 tests) |
| **Declared search** (D03-CHK-05): independent reference and preservation oracle; families OA, OB, OD, OP, the R02 position matrix, IN, EX, CA, RT; a frozen manifest of 11,964 variants (105 accepted) | `packages/kernel/tests/successor-reference.ts`, `owner-successor-search.test.ts`, `owner-successor-search.json` |
| Witness after every accepted plan | `packages/kernel/tests/state-plans.test.ts`, `race-search/harness.ts` |
| **Fault oracle under L-28** (owner choice 06): `ownerRefusalIn` in the Outcome ladder; acceptance and grant probes record `owner refused (P<n>)`; the `outcome: fail` example and two controls | `packages/kernel/tests/sweep/fault-oracle.ts`, `sweep/fault-scenarios.ts`, `fault-oracle.test.ts` (320 tests) |
| **Registries:** two mutant anchors re-anchored (IDs recomputed by `mutation_key`); value-cost `C-MAILBOX-PUSH` re-anchored with its C1 port; test counts; k13-controls guards T3 and T5; the adoption register remapped and the table regenerated | `tests/fixtures/packet-tools/*.json` |
| **Current descriptions** (D03-CHK-06): BASELINE "State owner"; 017 L-15 replaced, L-28 added | `docs/development/{002,017}-*.md` |
| **Verification spec:** allowlist names this report; the round-2 records and design 03/check 03 preserved at their commits; two round-3 limits; repository-test floor 4,750 | `work/K1.3/verification.json` |

No public answer or plan the coordinator forms changes for a well-formed plan. No production module was added,
and no dependency changed.

## Findings

| Finding | Disposition and evidence |
|---|---|
| **K13-R02-S2-01** (P2) | **Fixed structurally.** The commit writes only the dispositions the admitted successor holds, and admission checks every mailbox entry of the next record, so a terminal decision that leaves any entry queued is refused before any write. Review 02's case (cancellation by both causes, and `complete`/`fail` writing `queued` in either list) is a named control in `owner-guards.test.ts`. |
| **K13-R02-S2-02** (P2) | **Fixed structurally.** A terminal next state with a queued Event, live wait, readiness or open exchange breaks P1 in the successor, so the immediate-expiry await that appended a queued timeout and readiness is refused before any write. Named control in `owner-guards.test.ts`; OA/OB/OD in the search cover the product. |
| **D03-CHK-01** | **Done** as revision 1 states: exact successor values, admission in prepare before the first write, each changed component committed exactly once, the disposition loop shape, and qualified writers. The six required negative controls plus five more (11 in all) fail at the analyser; the six arms and takeover's `ActivationRecord.activation` write are the positive controls. The analyser is not otherwise widened. |
| **D03-CHK-02** | **Done.** Full P6 checks every live and retired deadline against its declaration; P7 the timeout. Five controls, each refused before any write and named identically by the reference. |
| **D03-CHK-03, -04** | **Done.** T1 states each arm's start states, end states and changeable fields; T3, T4 and T5 as revision 1 states. **T3 restated** over the batch's next dispositions: the fault sweep showed the literal "exactly the batch" refused the coordinator's retry after an interrupted Outcome commit, though the record satisfied P. In a record no fault touched the two forms coincide. |
| **D03-CHK-05** | **Done.** The frozen manifest pins every family's size and verdict counts; the test asserts the observed results equal it. Review 01/02 cases stay named controls; the historical probes are not edited. Review 02's 2,257-word position matrix is adapted as a family: 2 accepted, not 12, under whole-batch acknowledgment. |
| **D03-CHK-06** | **Done.** BASELINE and L-15 claim exactly the enumerated relations; operational-evidence writes on terminal records are named as allowed, and result, receipt, timeout-ID and cancellation-fact content as outside P. L-28 records interrupted commits and, under owner choice 06, the owner refusal a later governed call throws, which the fault sweep observes. |

**Old probes.** Run unchanged at C: 16 of 17 tests pass. Review 02's `owner-matrix.test.mjs` exact-cover test
fails as intended: it expects 12 accepted splits, and T3 now refuses the 10 that end batch entries instead of
acknowledging them.

**What stays semantic (L-15):** whether a wait wakes, expires or stays live; eligibility; batch selection; a
non-terminal Outcome's acknowledged positions within its batch; acceptance positions; and which plan an
operation forms.

## Validation

**Packet verify CI run `40605040929`** ran at C with spec `docs/development/work/K1.3/verification.json`:
`checks_passed`, 19/19 (Linux x86_64, Node v26.10.0, 23:52Z–01:01Z).
- tool tests 671;
- registered mutants 153 killed, refusal mutants 330, value-cost mutants 238;
- repository tests 4,750; archive 4; examples 18; adoption `revalidation_complete`;
- fault sweep: 72 scenarios, 17,026 runs, 0 violations; exit inventory 60/60;
- poison sweep: 62 files, 2,169 tests in all four modes;
- K13-9: 456,976 exhaustive runs, 20,000 supplementary words, 20 classes.

**Earlier run `40600784270`** at `1ea79ca2` stopped in 4 s with spec `invalid`: the new search test read an
undeclared environment variable (`OWNER_SEARCH_MANIFEST`, a print switch used while freezing the manifest). C
removes it; on a mismatch the assertion message now prints the observed results. No check ran in that run.

**Before dispatch, local runs.** Targeted, not a full composed verify:
- typecheck, builder-docs and `npm test` (4,750) passed; tool tests 671;
- K13-9 search and the successor search (11,964 variants) passed;
- fault sweep 17,026 runs, 0 violations; poison sweep on the four changed Kernel test files in four modes;
- the 46 `k13.*`, `state-owner.*` and `oracle.*` cases and 3 value-cost cases killed;
- every mutant anchor occurs exactly once; `regenerate` reports `table_current`; corpus
  `revalidation_complete` in a fresh clone;
- at C, the verifier's spec validation and environment census passed (18 checks, 492 files).

**Not run:** the `live-provider` and `large-memory-timing` profiles.

**Cumulative criteria.** K13-1 to K13-9, D01-CHK-01 to -07, the A01–A24 destinations and the round-2 findings'
tests are unchanged in substance and pass. This is the implementer's assessment, not acceptance.

**Strongest remaining risk.** P and T are checked against an independent reference over a declared, frozen
domain, not proved for every plan. A host fault inside an apply window can still leave a record outside P
(L-28); the next governed call refuses rather than repairs it.

**Third-party material:** none.

## Handoff

Ready for independent review 03 of H over C and B, citing CI `40605040929`. The pushed H SHA is supplied
externally. There is no self-acceptance and no successor release.
