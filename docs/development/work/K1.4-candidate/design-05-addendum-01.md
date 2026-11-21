# K1.4-candidate design 05, addendum 01 — design check 05's two corrections

Written 2026-11-21 by the K1.4-candidate coding agent (Claude Code desktop, `claude-opus-5-5`).

- **Subject:** D05-CHK-01 and D05-CHK-02 (both P2, bounded and test-side) of
  [design check 05](https://github.com/ArrokothI/arrokothi/blob/44d9091f6db6d1f382841cd822befcd80e374f7b/docs/development/work/K1.4-candidate/design-check-05.md)
  (Codex GPT-6, `codex/k1.4-candidate-design-check-05` at `44d9091f6db6d1f382841cd822befcd80e374f7b`), APPROVED WITH
  REQUIRED CHANGES of [design 05](design-05.md) at `228732be831e664d3fddf9dd6df9da7ab3465f29`. Read by commit;
  nothing merged.
- **Route:** the owner's instruction of 2026-11-21: owner choice 07's stop rule does not fire, the ordinary route
  applies and no owner choice is open. The build follows design 04's kept parts, design 05 and this addendum.
- **Changes nothing else.** Design 05's mechanism, its 75-case declaration and its 2,708 mutations stay exactly as
  written. The new controls below are reported separately from the matrix and add nothing to its counts.

## A1. D05-CHK-01: missing values and report arity

Table 3 already fails these answers as `answer` and D2 already requires a bare `delivered()`. The controls below
distinguish those predicates, which the matrix's faults did not isolate. They are named tests in
`identity-oracle.test.ts`, in their own `describe`, each with its expected code written before the oracle runs.

**Missing-value controls.** The laboratory's answer fault replaces one answer of the command, on a per-kind run of
design 05 §4:

| # | Slot | Replacement |
|---|---|---|
| V1 | `create`: `createExecution` | `{ ok: true }` |
| V2 | `accept_event`: `submitInput` | `{ ok: true }` |
| V3 | `submit_outcome`: `submitOutcome` | `{ ok: true }` |
| V4, V5 | `recover`: preliminary `inspect` | `{ ok: true }`; `{ ok: true, value: null }` |
| V6, V7 | `takeover`: preliminary `inspect` | `{ ok: true }`; `{ ok: true, value: null }` |
| V8, V9 | `dispatch`: final `inspect` | `{ ok: true }`; `{ ok: true, value: null }` |
| V10, V11 | `inspect`: its one `inspect` | `{ ok: true }`; `{ ok: true, value: null }` |

Each control asserts, for three records with the same calls and answers:

| Record | Expected |
|---|---|
| As the adapter left it (it threw) | exactly `answer` |
| The throw cleared and the previous Observation substituted | exactly `answer` |
| The throw cleared, the prefix's last genuine final inspection of x appended and its Observation substituted | exactly `answer` |

In all three, judging does not throw, and the Observation and contradiction counts do not move from the prefix's.
The passing neighbor is the same command with its genuine, valued answer, judged clean.

**Arity control.** A live run of `create x`, `dispatch x`, in which the dispatch's delivery hands the fake Driver a
settlement whose `delivered()` calls the recording settlement's `delivered("lab")`. The recorded report keeps method
`delivered`, its owner, its delivery and its call, and carries one argument: `report-method`. The neighbor, the
same run with the recording settlement forwarded unchanged, is clean; a test also checks that the two recorded
reports differ only in `args`.

**Reported separately:** 11 missing-value controls with three records each (33 judged records) and one arity
control. The matrix remains 75 cases, 2,708 mutations and 31 declared failures.

## A2. D05-CHK-02: the search's count types

`identity-search.test.ts` joins design 05 §10's file scope for one mechanical change, so that the extended
`OracleCounts` typechecks:

- the calibration seed passes complete zero counts, every field of `OracleCounts`;
- skeleton X's totals are a complete `OracleCounts`, initialized to zero, aggregated over all its fields.

No count becomes optional and no type is weakened. The skeletons, domains, the 3,282 + 344 + 500 = 4,126 runs, the
existing exit and Observation totals and the fault-site assertions do not change.

## A3. Notes from the check, adopted

- **Nested order.** The nested-order test includes the check's reentrant trace: a dispatch (C0) whose delivery D0
  calls `redeliver` (C1); C1's delivery D1 exits by a Driver throw, which the Kernel contains; then D0's report. It
  asserts the entry order, every `during`, `owner` and call attribution, and that the stacks are restored after D1's
  exceptional exit, separately from the oracle's verdict on that record (which is `call-extra`).
- **The test hook.** To reenter and to throw, design 05's `Tamper.settlement` becomes `Tamper.delivery`: it receives
  the delivery number, the Activation, the coordinator, the recording settlement, the earlier recording
  settlements and a `forward(settlement)` that calls the fake Driver. By default it forwards the recording
  settlement. The recorder sits between the Kernel and this hook, as design 05 §3 requires. Reports are forwarded
  to the Kernel's settlement with their arguments.
- **D2's scope** is the fake Driver's contract: one synchronous, bare `delivered()` per delivery
  (`fake-driver.ts`; `conventions.test.ts`). Late reports and `failed(reason)` stay legal for real Drivers.
- **The alias limit** in design 05 §8 means a call that bypasses the wrapped methods, such as an unwrapped base
  method invoked directly. An alias of a wrapped method still records.
- **Separation.** The oracle code uses the two error classes and nothing else from the adapter; the laboratory
  alone constructs the candidate.

## A4. File scope and stop conditions

Design 05 §10 plus `identity-search.test.ts` for A2. Design 05 §12's stop conditions apply unchanged: a declared
count or code that differs, or a needed change outside this scope, stops the build for a report before any patch,
and no count is changed to match the oracle's output. The Kernel, the adapter, the fake Driver, the fixture and the
packet tools stay unchanged; 12 PASS and 3 REFUSED.
