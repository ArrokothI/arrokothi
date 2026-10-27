# Implementation report — K1.3, round 2 (correction 1)

## Identity

- **Packet:** K1.3, correction round 1. Records:
  - [review 01](review-01.md): CHANGES REQUIRED of H `d05af3476b1523dadee0858373c0713610103419`;
  - [brief 02](brief-02.md);
  - [owner choice 03](owner-choice-03.md): brief 02's design check waived under 006, design 02 checked by review 02;
  - [design 02](design-02.md), answering brief 02's Q1–Q4.

  Owner choices [01](owner-choice-01.md) and [02](owner-choice-02.md) stay in force. Process:
  [006](../../006-development-process.md), [008](../../008-implementation-report.md), [012](../../012-review-methods.md).
- **Implementer:** Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), owner's Mac (arm64), 2026-10-27. It is
  the same session as round 1, and it is not the reviewer.
- **Branch:** `claude/k1.3`, fast-forwarded to review 01's commit `72e6f5ec51a83476967623b263365fb682a1ead6` before
  any change.
  - Base B: `22c8c1db9958049eb8693dd5aa4d7005f2d565db`.
  - Payload C: `2454e8b702ea1bb2b12d9e0fe0f8b83f0f5e0d7c`.
  - Previous reviewed H: `d05af347…` (review 01).
- **Candidate H:** the commit containing this report. C..H changes only this report, the 007 row and
  `progress.md`, which is the spec's administrative allowlist for this round.

## Changes since the reviewed H (H1..C)

| Group | Files |
|---|---|
| Owner choice 03, design 02 | `work/K1.3/owner-choice-03.md`, `work/K1.3/design-02.md` |
| **Owner guards** (design 02 Q1–Q3). S2 `coversQueuedOnce`: an exact cover. S4: a fresh generation for every Outcome that creates a registration, and timeout/retirement agreement (`expiresAs`). S3: `retiresLive` and `registeredBy`; an Outcome never both live and retired. S5: `belongsTo`. S1: explicit terminal checks in the delivery, takeover and control arms. The guard documentation is restated | `packages/kernel/src/state.ts` |
| Clock comment (CLOCK-03) | `packages/kernel/src/coordinator.ts` |
| **Maintained cases** under the review IDs, with positive controls and the three-path comparison | `packages/kernel/tests/owner-guards.test.ts` (22 tests) |
| **Current descriptions.** BASELINE "Timers" and "State owner"; 017 L-15 and L-22; the operations binding note (the `OPEN` marker kept); rewrite-index's clock choice | `docs/development/{002,017}-*.md`, `mental-model/concepts/operations.md`, `mental-model/rewrite-index.md` |
| **Verification spec.** The allowlist names this report. The round-1 records are preserved at their commits. Review 01's raw `coverage-comparison.log` gets a whitespace exception (two excerpt lines end in spaces; the sealed evidence is kept byte for byte). The repository-test floor is 4,675 | `work/K1.3/verification.json` |

No public answer, behaviour or plan the coordinator forms changes. No production module was added, and no
dependency changed.

## Findings

| Finding | Disposition and evidence |
|---|---|
| **K13-R01-S2-01** (P2) | **Fixed.** A terminal plan's position lists must be an exact cover of the queued Events: every named position is queued, none is named twice within or across the lists, and the distinct count equals the queued count. Equal length alone failed because a repeated position stands in for one left queued. The check runs before any write in the Outcome arm (`complete`, `fail`) and the shared cancellation arm (explicit and Execution-deadline cause). Tests: duplicate cancellation positions, by explicit cancel and by deadline fire; acknowledge/end overlap and a repeat within one list, for `complete` and `fail`; a non-queued position at the right count. **Positive controls:** a valid acknowledged/ended split, and a cancellation of two queued Events. |
| **K13-R01-S4-02** (P2) | **Fixed.** An Outcome creates a registration exactly when it carries a live or a retired wait. It must then set the count to old + 1 and name that generation; otherwise it keeps the count. A timeout is minted exactly for a deadline retirement, with matching generation, Event and deadline. Only creation and the Outcome arm write the count, so generations are fresh. Retired generations never become live again, so each expires at most once (design 02 Q2). Tests: review 01's consistent reuse of g1; reuse through a live registration and through an immediate wake; a count that does not move under a registration, or moves without one. **Positive controls:** generations 1, 2 and 3 expire, wake and stay live; a duplicate host fire stays a recorded `duplicate` with one timeout. |
| **K13-R01-CLOCK-03** (P2) | **Fixed.** Every current description names three paths. Due at registration: expires in the Outcome's decision with no host fire (W-2). Live wait: expires only through an accepted host fire. Execution deadline: fire-only (owner choice 01). The optional clock, the host's pumping duty, the absence of instant enforcement for paths 2 and 3, and operations' `OPEN` marker are kept. A bounded source search finds no other current all-fire-only statement. `owner-guards.test.ts` compares the three paths: zero fires and no pending timer at registration; no expiry until the fire for a live wait; a past Execution deadline is `READY` at creation, an earlier Outcome wins, and the fire cancels. The original tests still pass. |

**Additional audit, same mechanism (design 02 Q3).** The S1, S3 and S5 predicates are stated in full and enforced.
None is narrowed:
- **S1:** delivery, takeover and control refuse a terminal record directly. Before, they refused only
  transitively, through the closed exchange.
- **S3:** a wake, expiry or cancellation must retire the live wait with its own registration facts and its arm's
  cause, and an Outcome cannot carry both a live and a retired wait.
- **S5:** readiness must belong to its retirement: generation, cause, selector and timeout Event. Before, only
  co-presence was checked.

The new negative controls were run against H1's `state.ts`. Every one failed there, except the non-queued-position
case, which H1 already refused and which stays as a regression guard. All positive controls passed there too.
Review 01's own probe, `review-01/guard-probe.test.mjs`, now passes 6/6.

**What stays semantic (L-15):** whether a wait wakes, expires or stays live; eligibility; batch selection; a
non-terminal Outcome's acknowledged positions; acceptance positions; and which plan an operation forms.

**Owner choice 02's count.** Its narrative says 59 other scenario files. The verified scope at that time was **60**
files and 2,072 tests, as review 01 found. The record is left unchanged. With `owner-guards.test.ts` the poison
sweep now covers 61 files.

## Validation

**Packet verify CI run `40456276499`** ran at C with spec `docs/development/work/K1.3/verification.json`: `checks_passed`,
19/19.
- tool tests 671;
- registered mutants 153 killed, refusal mutants 330, value-cost mutants 238;
- repository tests 4,675;
- fault sweep: 72 scenarios, 16,696 runs, 0 violations;
- poison sweep: 61 files, 2,094 tests in all four modes.

It was dispatched with `--ref claude/k1.3`; main is still B, and the workflow file at C is identical to main's.

**Before dispatch, local runs.** These were targeted: no full composed verify ran locally this round.
- Typecheck, builder-docs and `npm test` (4,675) passed.
- The full K13-9 search passed (456,976 exhaustive runs, 20,000 supplementary words, 20 classes).
- The fault sweep passed (16,696 runs), and the poison sweep passed on `owner-guards` and `state-plans`.
- The unchanged mutation runner killed all 46 `k13.*`, `state-owner.*` and `oracle.*` cases at the correction
  commit.
- Every registered mutant anchor still occurs exactly once.
- `regenerate` reported the adoption table current, and the corpus returned `revalidation_complete` in a fresh
  clone at C.

**Not run:** the `live-provider` and `large-memory-timing` profiles.

**Cumulative criteria.** K13-1 to K13-9, D01-CHK-01 to -07 and all A01–A24 destinations are unchanged in their
tests and still pass. K13-4, K13-6 and K13-7, which review 01 failed only on the advertised owner mechanisms, now
have those mechanisms enforced and directly tested. This is the implementer's assessment, not acceptance.

**Strongest remaining risk.** The guards check what a plan says against the record, not why a planner chose it.
Plan selection remains semantic, checked by the suites, the oracle and the declared search (L-15, L-26).

**Third-party material:** none.

## Handoff

Ready for independent review 02 of H over C and B. Review 02 covers design 02, per owner choice 03, and cites CI
`40456276499`. The pushed H SHA is supplied externally. There is no self-acceptance and no successor release.
