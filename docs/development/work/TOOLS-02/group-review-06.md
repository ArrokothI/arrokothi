# Group review 06 — K1.2's live mutation-family remainder

Read on 2026-10-29 by the implementing Codex GPT-6 session under owner choice 07.
This is a triage reading, not independent acceptance or a claim of fresh mutation kills.

Checked revision: `91175053bc28c679155f958b997dc6b590a11a9c`.
Source: `K1.2/ablations.mjs` at `66bc041175e6fc191c2e7cf88de198111e7d97c9`,
origin `artifact-fb7a16748e389543ef6bf980`. Read its complete 344-line runner and the
family's sealed `K1.2-correction-01/validation-01/07-original-ablations.txt` at the
same pin, including all A1–A16/B1–B20 labels and the 36/36 summary. That summary is
historical evidence only.

## Why these groups need adoption work

Design 01 §5.4's family rule allows S5 when current registries or the complete-decision
oracle mutate the same decision. An ordinary passing behavior leaf alone is not that
family disposition. Each group below already has a maintained behavior test; the proposed
work is to adopt the live mutation against that test and bind its P1-M route, not to add a
duplicate behavior test. A finite equivalence argument cannot retire these mutants as
behavior-equivalent: each changes the specified decision. No product defect is alleged.

The bounded search covered both declared registries (`mutations.json`, `value-cost.json`),
all their production mutation edits, the complete-decision oracle's `CHECKS` and scenario
inventory, its negative controls in `fault-oracle.test.ts`, and the maintained tests named
by the sealed failures. The existing SDK traversal/catch/diagnostic mutations and state-owner
mutation cases do not mutate these eleven decisions. No new mutation was run.

In `/private/tmp/tools02-range4-20261029`, created with `git clone --no-local` and installed
with `npm ci` (exit 0), Node v26.10.0, `packet_tools.apply_edits` was applied to each
member's separate temporary target-file copy. **23 of 36 apply; 13 have absent anchors.**
The working product tree was untouched. [Machine-readable observations](family-applicability-06.json)
record each result and the ordinary passing leaf used for each proposed group.

## Eleven distinct live groups

| Member/group | Required distinction | Why the complete-decision oracle does not close it |
|---|---|---|
| A6 / `k12-mutation-a6` | Effect-bearing Outcome refuses whole | No Effect-bearing scenario; the malformed-content arm supplies invalid progress bytes |
| A9 / `k12-mutation-a9` | Recovery hold prevents redelivery | The sweep does not exercise `redeliver` |
| A11 / `k12-mutation-a11` | Unknown envelope fields refuse | No unknown-field scenario; existing cost mutations concern different traversal decisions |
| A12 / `k12-mutation-a12` | Emission identity is independent of other scopes' activity | Answer/retained-Emission agreement can hold when both use a shared counter; no cross-scope counterfactual |
| A13 / `k12-mutation-a13` | Progress envelope field is observed once | Scenarios prepare ordinary byte roots; they do not count envelope getter observations |
| A14 / `k12-mutation-a14` | Over-capacity Emissions refuse before element reads | The capacity arm checks refusal of ordinary elements, not the observation count |
| B9 / `k12-mutation-b9` | Hold-ending History attributes `attempt_submission` | Apply-model History comes from the reference; no control changes that authority field |
| B10 / `k12-mutation-b10` | Grant saved at the initial send survives redelivery | No redelivery schedule in the sweep |
| B11 / `k12-mutation-b11` | Grant saved at takeover delivery survives later redelivery | Epoch>1 conditional rotation can coexist with correct epoch-1 behavior; retain this distinct schedule |
| B15 / `k12-mutation-b15` | One stale numeric coordinate still fences when the other is malformed | Sweep crosses stale coordinates with unusable Activation identity, not the other numeric coordinate malformed |
| B20 / `k12-mutation-b20` | Pre-authority refusal does not render unusable Activation identity | Named-refusal checks use the returned reason when comparing the retained refusal; no independently specified undisclosing reason |

These are distinct input/environment/operation/result obligations under P1-G, not one group
merely because one runner owns them. B10 and B11 deliberately distinguish a conditional
incomplete repair. The exact ordinary leaf pointers, gaps and planned cases are in
`triage-05.json`'s `extraction_groups`; the family origin points to all eleven.

## Remainder of the family

No final family closure is claimed. A1/A3/A4/A5/A10/B1/B8/B16/B17/B18/B19 have relevant
current complete-decision checks (acknowledged batch; stale/currency/control/submission
refusals; takeover identity/epoch); their exact P1 routes still require reconciliation.
A15 applies textually but its old always-refuse-await subject was replaced by accepted K1.3.
The thirteen absent anchors require individual superseding/relocation readings; absence
alone is not a proof that their behavior is obsolete. They contribute no additional group
to this lower bound. No family routes or derived adoption tables were rewritten here.

The earlier 27-origin count-gate group stays removed for the reasons in group-review-05.
The three remaining earlier groups stay counted. **Current lower bound: 3 + 11 = 14 groups.**
Owner choice 07's cap therefore fires without waiting for further origins. See projection 06.
