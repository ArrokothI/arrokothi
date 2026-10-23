# COORD-REFACTOR-01 — independent review 01

2026-10-23, Codex GPT-6; independent of the implementer and the earlier design checker.

**Verdict: CHANGES REQUIRED** on exact H `276cbea492385a4d773369bba679564ba7da052e`,
over payload C `71e2ddfe3fb246bdc7c0a3c74d6178598e1dc846` and
B `7626a623dad8acfc73584e08212c126b5b6daefc`.
Gate: brief 01 and the owner's review instruction; production defects or false current claims block,
evidence-tooling gaps go to TOOLS-02 as P3.

Confirmed C..H changes **only** `implementation-01.md`, `docs/development/007-work-packets.md`
and this packet's `progress.md`. Reviewed the requested source/document scope. C's
[Packet verify run 39932022363](https://github.com/ArrokothI/arrokothi/actions/runs/39932022363)
succeeded: downloaded artifact `12494747748` binds `verify.json` to C and reports
`checks_passed`, **18/18**, including 4,405 repository tests. The composed verify was **not rerun**.

1. **CR1-R1-CREATION-01 — P2, blocking (CR1-3 / owner-choice-01 bounds).**
   `packages/kernel/src/state.ts:444–448`: the Execution lookup is published before the creation-key
   insertion, but the new listing links are published after it. Injecting a throw immediately before
   the second `Map.set` leaves an inspectable Execution absent from `visibleExecutions` at H; B lists
   it because listing traverses the first map. Reproduced against unmodified B and H with a pre-load
   `Reflect.apply` wrapper, armed only for the two creation publications:

   | Observation after the injected second-insert fault | B | H |
   |---|---|---|
   | Creation throws the injected error | yes | yes |
   | `inspect` succeeds for the captured Execution ID | yes | yes |
   | `visibleExecutions` contains that ID | yes | **no** |

   This is a new creation fault outcome, outside the three approved exceptions. The cause is already
   in `design-01.md:434–436`: non-faulting link writes **after** two fallible publications do not preserve
   the old listing/lookup relationship. Make listing publication follow the Execution-map publication
   at the same fault cut, and pin insertion failures and retry/listing consistency. A broader change to
   creation atomicity requires an owner decision. The isolated comparison used local Node v25.2.1;
   CI acceptance evidence above used v26.10.0. The discrepancy follows directly from statement order.

2. **CR1-R1-TOOLS-01 — P3, non-blocking; TOOLS-02.**
   `tests/fixtures/packet-tools/state-owner-controls.json:14–18` runs only `control-commits.test.ts`
   for the four dropped-field mutants. Their retained reads and intended commit-table assertion kills
   are confirmed, but the additional resulting-state mutation killers promised by
   `design-01.md:430–432` are not recorded by this probe. Complete that evidence in TOOLS-02;
   this does not invalidate the demonstrated CR1-4 kills.

| Check | Assessment |
|---|---|
| CR1-1 | **PASS.** Closed data-only union, frozen plans and prebuilt answers; basis bound before state-dependent builds, including takeover revalidation and the basis passed to `#accept` (D01-CHK-3). |
| CR1-2 | **PASS.** Mutable records stay in `state.ts`; runtime `#private` brands, non-vacuous R1–R4 rules, failing bypass fixtures, and distinct value/type imports. Getter bodies, effects and aliases are modeled and have targeted negative controls (D01-CHK-2). |
| CR1-3 | **FAIL:** CREATION-01. Oracle expectations, scenarios and golden vectors are unedited; fault-oracle changes relocate anchors/windows and preserve comparisons. The three authorized fault-path rows have dedicated tests. |
| CR1-4 | **PASS.** CI artifact records all 10 mutants across the four families killed at their intended named assertions, twice deterministically, with clean baselines and no load/compile-failure credit. Four dropped commits retain their reads; per-arm commit and writer checks close D01-CHK-4's structural gap. Its extra behavioral evidence is **DEFERRED** under finding 2 above. |
| Current claims / K1.3 | No separate false current claim found in the requested Layer-3, BASELINE, 017 or 007 diffs. K1.3 can extend `Plan` with a wait variant and a private apply arm, keeping the existing mutation interface. |

No implementation change, acceptance, integration, hold release or successor release is made by this review.
