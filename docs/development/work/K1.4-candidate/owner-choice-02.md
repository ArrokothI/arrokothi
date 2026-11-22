# K1.4-candidate owner choice 02 — design 01 Q1–Q6 and the K1 gate's scope

Recorded 2026-11-14 by the K1.4-candidate coding agent (Claude Code desktop, `claude-fable-5-2`). The owner
answered in the session after reading design check 01. The owner's selections are quoted verbatim; the
explanations beside them are the owner's message as forwarded.

## Context

[Design 01](design-01.md) at `c237db58441eccfa6d59e59779068ab9b93a203d` stopped for the owner under brief 01's stop
conditions (S1–S4) and asked Q1–Q7. [Owner choice 01](owner-choice-01.md) answered Q7.
[Design check 01](https://github.com/ArrokothI/arrokothi/blob/e06984a9573efd1524692ab74332eb7744941bcf/docs/development/work/K1.4-candidate/design-check-01.md)
(Codex GPT-6, `codex/k1.4-candidate-design-check-01` at `e06984a9573efd1524692ab74332eb7744941bcf`) is APPROVED
WITH REQUIRED CHANGES D01-CHK-01..09 of that design. It is read by commit and not merged here.

## Choices

The owner's message, verbatim:

```text
Record owner choice 02. The owner's selections (2026-11-14), verbatim:
- Q1–Q6: "Accept check's answers (Recommended)". That is Q1a (refuse by command capability, not scenario
  IDs); Q2b as an explicit representation exception, with Q2a recorded as the root fix for the next fixture
  revision; Q3b with the check's precise per-Execution convention (episode key (state, activationId, writerEpoch));
  Q4 as a recorded limit; Q5 yes (start at 1 as a convention only); Q6 yes. KC-3 becomes "12 PASS, 3 REFUSED,
  pinned exactly".
- Gate: "Predeclared K1 matrix (Recommended)". K1.4-gate and the K1 milestone row change to E1's predeclared K1
  matrix (the 12 runnable schedules). The 3 dependency-alternative schedules and D01-CHK-04 move to K2's E2 gate.
  The benchmark's E1 round 3 must predeclare that exclusion before capturing; refusals stay visible. Amend 007
  (K1.4-candidate KC-3, the K1.4-gate section and row, the K1 milestone row) and the roadmap to match.
```

The owner's instructions for what follows, verbatim:

```text
Then write a design-01 addendum disposing D01-CHK-01..09, including CHK-09's named ablation plan (site, unmutated
witness, target step, changed field) on supported schedules only. Push it, then build in the same packet with no
new design check (006 routine corrections). Add 017 entries for the limits (Q1a scope and its 51 lost steps,
Q2a root fix, effectIntents, bounded projections, fake-Driver takeover). Write the candidate README for E1 with
CHK-08's pin contract. Kernel source unchanged. New C, Packet verify via `gh workflow run packet-verify.yml`
(check REVISION), implementation-01.md per 008, new H with 007 WAITING_FOR_REVIEW. No self-acceptance.
```

## Consequences

1. **Q1: a.** The candidate refuses a schedule in `begin` when one of its commands has no Kernel surface. The
   decision reads command capability discriminants only (the command kind and an Event's category), never a
   scenario ID and never an expectation. Three schedules are refused today:
   `control-stale-timer-and-lost-wake`, `wait-structure-not-satisfiability` and `cited-decision-edges`.
2. **Q2: b.** A Kernel timeout Event that no `deliver_timer` command named is reported as
   `to-<laboratory name of its generation>`. This is a declared representation exception to the rule that the
   candidate never guesses a fixture name. **Q2 a is the root fix**, recorded for the next fixture revision: let
   the laboratory name a wait's timeout Event.
3. **Q3: b.** `rejection` follows a per-Execution observation convention. The candidate keeps the most recent
   Kernel refusal for each Execution and clears it when that Execution's episode key
   `(state, activationId, writerEpoch)` changes. This is a fixture observation convention the owner adopts. It is
   not a Kernel lifecycle rule.
4. **Q4.** `effectIntents` as a constant, and what the ledger assertions cannot prove before K2, are recorded
   limits. `ExecutionView` gains no field.
5. **Q5: yes.** The laboratory clock starts at 1 as a reproducibility convention only.
6. **Q6: yes.** The fake Driver reports `delivered()` at once and answers `isSafeToReplace` with `true`.
7. **KC-3** of brief 01 becomes: **12 PASS and 3 REFUSED, pinned exactly.** A REFUSED scenario is still not a
   pass.
8. **Gate.** K1.4-gate and the K1 milestone close on **E1's predeclared K1 matrix**: the 12 schedules the
   candidate can run. The three dependency-alternative schedules, and D01-CHK-04 (the fixture's
   acknowledgment-order convention), move to K2's E2 gate (K2.4). The benchmark's E1 round 3 must predeclare the
   exclusion before it captures, and the three refusals stay visible in its results. This record changes
   ArrokothI's own gate text only; it releases neither K1.4-gate nor any benchmark work.
9. **Lifecycle.** A design-01 addendum disposes D01-CHK-01..09 and is pushed before the build. The build follows
   in this packet with no new design check (006: routine corrections inside an approved design). Kernel source
   stays unchanged. No self-acceptance.
