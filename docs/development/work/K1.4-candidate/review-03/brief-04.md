# Brief 04 — K1.4-candidate command/inspection oracle correction

```text
Correct the same released packet K1.4-candidate on claude/k1.4-candidate.
Base c1951226338de6ccd3e4e6289259549551268f61;
reviewed H ddc53bd132fde4f71bc989ccec7f4d0e430a45dc.
Review record docs/development/work/K1.4-candidate/review-03.md on
codex/k1.4-candidate-review-03; pin the full recording commit in the reviewer's push handoff.
Open finding K14C-R03-01 (P2); K14C-R03-02 is a nonblocking P3 wording correction.
Owner supplemental decision: review-03/owner-choice.md; redesign with a new design check.
Unresolved authority: no corrected oracle design approved yet; the new design check is required.
Read this brief first. Answer these questions in design-04.md and obtain a new design check before building.
Apply 006 and 012: correct the mechanism, maintain every counterexample, and re-audit the cumulative packet.
Use 008 for report 04 and 006 for new C/H plus verification/push handoff. No successor release.
```

## Goal

Make the independent adapter oracle judge a command, its permitted public calls and the inspection used
for its Observation as one connected record. Preserve the now-correct identity rendering and the real-Kernel
candidate while closing the specific evidence obligation approved in D03-CHK-03.

## Suspect design

Design 03 addendum A3 records every call but checks “the command's Kernel call” in the singular. H's oracle
chooses a primary call, checks that target and independently checks the final view against the inspection's
own argument. A1 instead requires the view to belong to the Execution addressed by the command or named by
its answer. Correct primary target plus internally consistent wrong inspection passes. Undeclared mutations
also disappear from the oracle's judgment, even before an otherwise legal contradiction throw.

This is an oracle contract/composition defect, not evidence that the ledger or Kernel has those defects.
Adding more names to the search cannot repair the missing relationship. A complete call/inspection check
should use the declared command translation and public records; it need not predict Kernel state transitions.

## Finishable criteria

| ID | Required outcome | Closure and evidence |
|---|---|---|
| R04-1 | The oracle independently binds each command to permitted public call methods, order/count where required, resolved targets and its authoritative post-command inspection | New design/check after owner route choice; a finite table covering command kinds and legal exits, plus a structural check of every recorded call against it. Account explicitly for preliminary inspections and pendingTimers. No use of the candidate's ledger or translation helper as the oracle |
| R04-2 | A correct primary call cannot hide an Observation built from another Execution, a wrong primary operation or an extra mutation | Maintain all four review-03/oracle-probes.mjs cases as rejecting controls with honest neighbors. Independently vary command, primary, preliminary/final inspection and return/throw paths; report exact scope and counts |
| R04-3 | Current claims match the checked mechanism | Bounded review of design dispositions, oracle comments, implementation report, README/header and 017. Align L-39's label prose with the conditional registration-time offer. No silently narrower D03-CHK-03 claim |
| R04-4 | Entire cumulative packet preserved | KC-1..6, R02-1..4, R03-1..4 and nondeferred D01/D03 checks; exact 12 PASS / 3 REFUSED, ABL-1..5/latest-grant, seven identity mutants, full declared search, exact-C Packet verify, C/H and base scope checks |

## Questions before code

1. For each command, which calls are required/allowed, to which Execution/generation, and which answer
   identifies that Execution? Distinguish creation/retry from references and recover/takeover preliminary
   inspections from the final inspection. What finite rule validates every call, including read-only calls?
2. How is the final inspection tied to both the command's target and the Observation? What is the independent
   source of that relation when creation or an answer fails, or a command has no Observation?
3. Which exits are legal in the declared search, and which calls may precede each exit? How does the oracle
   reject a new mutation inserted before a declared contradiction without becoming a second Kernel simulator?
4. What controls establish that every row and join is exercised, independently of the adapter's helpers?
   Count methods/targets and distinguish a missing step, a wrong method, a wrong inspection and a wrong exit.
5. Does the proposed rule retain the existing claim? Any narrowed guarantee, split or limitation requires
   the owner's explicit decision and a precise effect on acceptance; it is not an implementation convenience.

## Known counterexamples and preserved controls

New, with passing honest controls, in [oracle-probes.mjs](oracle-probes.mjs):

- dispatch x / inspect and observe y, with the same command/Observation/pair counts as the honest run;
- a declared dispatch whose actual primary is cancelExecution;
- a dispatch followed by an extra cancelExecution before the final inspection;
- an extra cancellation and final inspection before the otherwise correctly declared timeout contradiction.

The file asserts that H wrongly accepts them. After correction, acceptance must assert rejection of the
broken trace, not preserve that old-bug assertion. Use the attached output for provenance.

Keep the five D03 oracle rejection controls and their honest controls, all association fault traces/replays/
payload checks, first-exposure equality control, ingressRefused/exact-retry controls, immutable labels and
eventIdentity capability refusal. Keep review 01/02's original counterexamples, both collision orders,
mixed Event lists, per-Execution scope, copied/predicted output strings and suffix chains. Preserve the
existing expectation-blindness, encoder, import/ambient, locator and K0 oracle discrimination controls.

## Bounds and stop conditions

Ownership is test-side evidence and current claims. No Kernel/Runtime/Driver semantic change, no package
source change, no fixture scenario/runner/oracle behavior change, no packet-tool implementation change and
no benchmark release. packages/, scripts/ and tests/tooling/ remain equal to B. Preserve owner choices 01–04,
017 limits, unread holds and semantic_credit none. D01-CHK-04 and the three dependency-alternative schedules
remain assigned to K2.4/E2. Do not reopen the repaired ledger merely because its oracle was incomplete.

The [owner selected redesign](owner-choice.md) on 2026-11-16. The design note and fresh independent
design check precede the build. Stop for the owner if the correction would change an approved convention,
reduce a mandatory claim or require changes outside these bounds. No self-acceptance.
