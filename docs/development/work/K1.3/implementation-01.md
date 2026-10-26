# Implementation report — K1.3, round 1

## Identity

- **Packet:** K1.3, wait and cancellation races. Records:
  - [release 01](release-01.md) (2026-10-25) and [brief 01](brief-01.md);
  - [design 01](design-01.md) with its [addendum 01](design-01.md#addendum-01--design-check-01-and-owner-choice-01);
  - [attack 01](attack-01.md), a Prompt E adversary at `6052f0a7`;
  - [design check 01](design-check-01.md), APPROVED WITH REQUIRED CHANGES, at `3c82faff`;
  - [owner choice 01](owner-choice-01.md), D01-CHK-06 and -07, build without a new design check;
  - [owner choice 02](owner-choice-02.md), the race search outside the poison sweep.

  Process: [006](../../006-development-process.md), [008](../../008-implementation-report.md),
  [017](../../017-known-limitations.md).
- **Prerequisites:** K1.2, K1.2-correction-01, BINDING-01, COORD-REFACTOR-01 and TOOLS-02 range 1. All are accepted
  and integrated in B.
- **Implementer:** Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), on the owner's Mac (arm64), from
  2026-10-25 to 2026-10-26. It has a local checkout, a shell, Node v26.10.0, Python 3.13 and `gh`, and no
  subagents. It is not the adversary, the design checker or the reviewer.
- **Branch:** `claude/k1.3`.
  - Base B: `22c8c1db9958049eb8693dd5aa4d7005f2d565db`, main after PR #61. Main has not moved since.
  - Payload C: `db0d0fee95466edc7a527ef234a2170fb6fedebb`.
  - No earlier review.
- **Candidate H:** the commit containing this report. C..H changes only this report, the 007 row and
  `progress.md`, which is the spec's administrative allowlist.

## Changes (B..C)

The B..C diff touches 80 files: 11,572 insertions and 1,787 deletions. No dependency, lock or package manifest
changed.

| Group | Files |
|---|---|
| **Range 1, waits and timers.** Wait grammar and capture (W-1; refused whole; 256-selector limit). Eligibility by trusted source category. Registration inside Outcome acceptance (W-2 steps 1–4). B-6 path B wake on input. Wait-ended batch selection, mandatory member first. An injected `KernelClock`. A host-pumped timer port, `pendingTimers()` and `fireTimer(key)`; a fire is a hint. Generation fencing and timeout Events | `packages/kernel/src/{waits,time}.ts` (new); `outcome.ts`, `coordinator.ts`, `plan.ts`, `state.ts`, `state-records.ts`, `driver.ts` (the `ActivationEvent` timeout member), `inspection.ts`, `refusal.ts` (`not_ready`, `clock_unavailable`), `index.ts` |
| **Range 2, cancellation.** `cancelExecution(caller, executionId)` with `cancelScopes` authority. One cancellation plan shared by the explicit and Execution-deadline causes. CX-1–CX-6, including the losing-Outcome index (`cancellation_terminal_conflict`). Owner guards S1–S5. The optional Execution-scoped Driver hook `requestCancellation` (D01-CHK-06). An optional immutable `executionDeadline` on creation; it enters creation identity only when present. Fire-only enforcement (D01-CHK-07) | `coordinator.ts`, `plan.ts` (expiry, timer-discard, cancellation and losing-outcome plans; 13 variants), `state.ts` (four new arms), `identity.ts` (`cancelScopes?`), `driver.ts`, `lifecycle.ts`, `unsupported.ts` |
| **Tests.** New files: `waits-declaration` (44), `waits-eligibility` (6), `waits-registration` (23), `waits-timers` (20), `waits-selection` (17), `ambient-time` (5), `cancellation` (40), `losing-outcomes` (11), `execution-deadline` (23), `race-search` (11), plus `waits-kit.ts` and `race-search/{model,harness,run,witnesses}.ts`. The B tests that named `cancelExecution`/`registerWait` as unlanded surfaces now name a later packet's surface | `packages/kernel/tests/*` |
| **Zone and owner guards.** K1.3 planners, arms, commits and foreign calls. Analyser support for the `#requestCancellation` post-commit hand-over and the `#refuseLosing` refusal recorder. S1–S5 negative controls. Ambient-read, landing-zone and state-ownership pins | `zone-analysis.ts`, `zone-inventory.ts`, `control-commits.test.ts`, `state-plans.test.ts`, `ambient-reads.test.ts`, `tests/conformance/architecture/*` |
| **Evidence.** Fault sweep: new Outcome apply steps, a wait-aware `outcomeAnswer`, the declared losing-proposal window and six scenarios, giving 72 scenarios and 60 exits. Oracle `losingWindowAt`. 12 `k13.*` registry mutants with `k13-probe.mjs` and `k13-controls.json`. Coverage families. Mutant re-anchors. The value-cost source inventory. The adoption manifest. The poison-sweep exclusion (owner choice 02) | `packages/kernel/tests/sweep/*`, `tests/fixtures/packet-tools/*`, `tests/tooling/k13-probe.mjs` |
| **Layer 3, BASELINE, 017** | `mental-model/mechanisms/{creation,waits}.md`, `mental-model/concepts/operations.md`, `mental-model/rewrite-index.md`, `docs/development/{002,017}-*.md`, `kernel-ownership.md`, `docs/development/README.md` |

The supported SDK entry, its docs and the canonical bytes are unchanged. The whole-decision oracle keeps every B
comparison; K1.3 adds one, `losingWindowAt`, and extends `referenceRefusal` and `outcomeAnswer` to the
losing and wait states.

## Criteria (implementer assessment, not acceptance)

| ID | Closure and evidence |
|---|---|
| K13-1 | `waits-declaration.test.ts` holds §3's valid and invalid table, one row per rule. Each malformed wait is refused whole: both lists empty, an empty alternative, an empty kind set, an unknown or unsupported field, identity text, a deadline without a clock, and 256/257 selectors across all lists (K13-A19). |
| K13-2 | `waits-eligibility.test.ts`: selector units for each source category. Input imitating a dependency's kind, Event ID or correlation stays queued, and a timeout matches nothing (K13-A20). `input-wake` adds the live case. |
| K13-3 | `waits-registration.test.ts` has one case per W-2 branch: no deadline, a future deadline, a due deadline, an eligible queued Event, and the "eligible and due" tie. It also covers D−1/D/D+1 and throwing, NaN and absent clocks (K13-A12, -A18). Mutants `k13.registration-step2` and `k13.registration-order` are killed. |
| K13-4 | `waits-timers.test.ts`: a repeated fire, a stale fire after a wake and after re-registration, the S4 `e d w` schedule, and duplicates before and after reservation (K13-A03, -A13). A late result stays queued for a later wait. Mutants `k13.fire-generation` and `k13.fire-duplicate` are killed. |
| K13-5 | `waits-selection.test.ts` runs the five small distinguishing examples as separate cases, with exact batch and remaining queue (K13-A01, -A04, -A14). Mutants `k13.selection-eligibility` (ignore eligibility) and `k13.selection-timeout` (omit the timeout's membership) are killed. A test-local freeze-at-wake selector fails an example. Sort-the-union is recorded as equivalent, with addendum A1's argument, in `k13-controls.json`. |
| K13-6 | `cancellation.test.ts` covers both orders of cancel and Outcome for continue, await, complete and fail (K13-A10), and cancel in each nonterminal state. Every unprocessed Event gets its terminal disposition in B-5's shape (K13-A11). After cancellation, dispatch, redelivery, takeover and recovery all refuse (K13-A22). `losing-outcomes.test.ts`: a loser's exact retry returns the retained refusal; distinct losers keep distinct keys; OA-2 replay comes before the fence (K13-A07–A09, -A23). Mutants `k13.cancellation-*` and `k13.losing-retry` are killed. |
| K13-7 | `execution-deadline.test.ts`: explicit and deadline cancellation from identical prefixes compare equal except for their cause (K13-A16). It also covers creation identity (K13-A17) and fire-only enforcement, where an earlier Outcome or dispatch wins (D01-CHK-07). Wait and Execution deadlines are fired in both orders (K13-A24). Mutant `k13.deadline-terminal` is killed. |
| K13-8 | Structural: `readClock` and `#requestCancellation` sit in the zone inventory's foreign calls, and `ambient-reads.test.ts` pins the exact `hostMember` list, now including `clock`/`now` and `cancelScopes`. `ambient-time.test.ts` (5) has two parts. A bounded syntactic census finds no ambient time source in any zone
file. A runtime window runs the K1.3 boundary calls with every time global poisoned, and each answer and view must
equal the unpoisoned run. Both parts have non-vacuity controls. All tests drive a manual clock. |
| K13-9 | Declared bounded search: 13 letters (`i e d c w z k r t s x q p`), 8 seeds S0–S7, depth 4, bounds 1 and 2. That is 456,976 runs against a reference model and INV-1–INV-12, with every exercised (letter, state) transition reported. The 20,000-word xorshift32 walk and 20 classes with 37 witnesses are reported separately, outside the claim. Payloads are compared, and the A2 negative controls are rejected (K13-A05, -A21). It runs as the `race-search` check and as `race-search.test.ts`. |

**Owner choice 01.**
- D01-CHK-06: an optional `requestCancellation(request)` hook, Execution-scoped, carrying the current attempt's
  coordinates when an attempt exists.
  - It is invoked after the commit from `RUNNING`, `WAITING` and `READY`, for both causes.
  - It is never awaited, and its return value is not read.
  - Lookup and invocation throws are contained, and a repeated cancel makes no repeat request.
  - Tests are in `cancellation.test.ts` and `execution-deadline.test.ts`, including the reentrant hook (K13-A15).
  - The Driver type, BASELINE and 017 L-20 changed together.
- D01-CHK-07: fire-only Execution-deadline enforcement.
  - Creation with a past deadline is `READY`.
  - The host's duty to fire timers is in BASELINE and 017 L-22.

**Attack corpus.** All 24 labels of addendum A3's map, K13-A01 to K13-A24, are cited by maintained tests in the
planned files. The three attack probes stay in `attack-01/` as evidence.

**017 dispositions:**
- L-15 is narrowed: S1–S5 make five K1.3 invariants structural.
- L-19 to L-27 are new: persistence, physical interruption, dependency alternatives before K2, no instant
  enforcement, clock monotonicity, memory bounds, timer-entry principals, the search's declared space, and
  evidence-tooling gaps. L-17 stays unused.
- L-27 records the two evidence gaps:
  - The fault sweep does not inject faults into `cancelExecution` or `fireTimer` as controls.
  - The registry has no equivalence form; the sort-union entry lives in `k13-controls.json`.

## Adoption and evidence migration

The standing rule of K1.1-correction-03 owner choice 01, item 2, applies. No owner question was needed:
- **Held to refused:** 11 preserved members moved from held to refused, because K1.3 edited their spans. They are
  in `ambient-reads`, `evidence`, `exact-coordinates`, `outcome-acceptance`, `refusal-diagnostics` and
  `refusals`. Every origin of each is already `pending_revalidation`. No complete or limited origin is affected,
  so no new transfer list is needed.
- **Stale witness rows:** two V-ENV held-witness rows for `ambient-reads.test.ts:138:3` and `:160:3` named members
  that are now refused. They and their links in three open origins are dropped (`6de2f894`).
- **Moved targets:** 17 landing-zone suite-target declarations moved down three lines (`f2aca867`). Each moved line
  is identical at B and C. The hold register was regenerated with the TOOLS-02 tool, and `regenerate` and
  `corpus` agree at C.

**Defects I found and fixed in C, all in evidence tooling, none in production:**
- A stray `.oracle-reach.json` written by a local probe run had been committed. It is removed (`16d995f1`).
- Thirteen new registry cases had no coverage family. `coverage.json` now declares them (`7547c0a0`).
- K1.3 edits had made the anchors of seven B mutants absent or ambiguous at C. Each is re-anchored with the same
  fault (`f30d3037`). The `mutations.json` IDs are recomputed by `mutation_key`. The value-cost IDs are kept, as
  COORD-REFACTOR-01 kept them, and the C1 ports' `at_c` edits follow. All are still killed.
  - The `referenceRefusal` and `outcomeAnswer` oracle mutants.
  - The two CR1-4c state-owner mutants.
  - The C1 `C-MAILBOX-PUSH`, `C-ACTIVATION-PAYLOAD-COPY` and `C-VIEW-PAYLOAD-COPY` mutants.
- The value-cost source inventory lacked `time.ts` and `waits.ts`. Every value-cost control refused until they
  were added (`7d9be1bc`).

No assertion, expected result, kill requirement or mutant fault was relaxed.

## Validation

**Packet verify CI run `40387031804`** ran at C with spec `docs/development/work/K1.3/verification.json`. Result:
`checks_passed`, 19/19, exit 0, on Node v26.10.0 and Python 3.13.16. The kernel sweeps' poison modes took 73,
222, 222 and 222 s on CI.

It was dispatched with `--ref claude/k1.3`. Main is still B, and the workflow file at C is identical to main's.

**Earlier run.** Packet verify `40280293990` at `7d9be1bc` failed only on `kernel-sweeps`, which reached its
2,400 s limit. The poison sweep was running `race-search.test.ts`, with 38,361 boundary windows, in each poisoned
mode. [Owner choice 02](owner-choice-02.md) moved it into `EXCLUDED_FILES` as a sweep itself. The cited V8
block-coverage comparison found that the race search reaches no Kernel source byte that the 59 scenario files miss;
the reverse control finds 13 files. The record states the comparison's limit, which is code rather than data, and
includes its reproduction script.

**Fresh-clone verify before each dispatch.** Steps: `git clone` from GitHub, checkout C, `npm ci`, nothing
untracked before or after, Node v26.10.0, Python 3.13.5. At C the composed verify returned `checks_passed`:
- tool tests 671;
- inventory `provenance_verified`;
- adoption `revalidation_complete`;
- coverage reported;
- registered mutants 153 killed, refusal mutants 330, value-cost mutants 238;
- refusal census 330/330 and oracle census 30/30;
- typecheck;
- repository tests 4,653 (B: 4,412), archive 4, examples 18;
- kernel sweeps: fault sweep 72 scenarios, 16,680 runs, 0 violations; poison sweep 60 files, 2,072 tests, in all
  four modes;
- race search;
- value-cost dimensions and continuations;
- builder docs and the area gate.

**Not run:** the `live-provider` and `large-memory-timing` profiles (owner choice 01 of the verification spec).

**Strongest remaining risk.** K13-9 checks the declared space only (L-26). Beyond it, correctness rests on S1–S5
and the per-criterion tests. Cancellation and timer fires are not fault-injected as controls (L-27). Their
atomicity rests on the plan/apply owner and its static and plan-witness checks.

**Third-party material:** none added. No dependency changed, and no source was copied or adapted.

## Handoff

Ready for independent review of H over C and B, citing CI `40387031804`. The pushed H SHA is supplied externally.
There is no self-acceptance; no hold is lifted and no successor is released.
