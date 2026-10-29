# Group review 10 — Z1–Z16 coordinate routes

2026-10-29, implementing Codex GPT-6 session. Checked revision `cb2d4f3b`;
product/test bytes are unchanged from the passing repository catalog in progress.md.
Source pin: `66bc041175e6fc191c2e7cf88de198111e7d97c9`.

**At origin 695: five new-test groups and 55 mutation adoptions.** Sixteen distinct
adoptions are added; eighteen of the total have validated controls/kills and 37 are
planned. This is a reading, not a fresh kill or an independent acceptance claim.

Read the whole ablations-04 runner, its sealed review-06/mutants.py definitions,
and validation-09/30's control, all sixteen named results and 16/16 summary. The
runner explicitly selects only Z1–Z16; W1–W8 belong to the later review-06 artifact
and are not disposed or counted here. Historical full-suite failures do not earn
current target-set kill credit.

The bounded registry/oracle search is the one in group-review-09, extended to each
Z field below. Existing exact-coordinates.test.ts derives every expected spelling
from the input and asserts all these results. Use its `"actor-é" complete` leaf
as the named target and retain all four namespace/terminal variants in the file.
No new behavior test is required. The complete-decision sweep's short ASCII
identities do not distinguish these lossy projections. Its consistency checks do
not replace the exact-coordinate production mutations required by the family rule.

| Member | Current site and individual absent-anchor reading |
|---|---|
| Z1 | Old #mint is gone. Its two old callers were input ingress and initial dispatch; both now prebuild receipts in coordinator. Re-anchor both calls as one historical adoption, excluding takeover and Outcome sites. |
| Z2 | Creation receipt's Execution-ID argument remains at its unique coordinator anchor. |
| Z3 | Initial Activation's Execution-ID field remains at its unique coordinator anchor. |
| Z4 | Initial Activation's Activation-ID field remains at its unique coordinator anchor. |
| Z5 | Takeover's Activation copy remains at its unique coordinator anchor. This changes retained/delivered identity, unlike X18's answer field. |
| Z6 | Accepted-Outcome insertion moved to state.ts's Outcome apply arm. Its exact key remains live; A2's conditional lookup is a different decision. |
| Z7 | Event conversion moved to state.ts; application entries now carry destination directly. Mutate the application-input branch, retaining the historical input class; the new timeout branch is outside this member. |
| Z8 | Redelivery answer's Activation ID remains at its unique coordinator anchor. |
| Z9 | Initial grant construction moved from an object field into the prebuilt submission local. Its Execution-ID field is still handed to the Driver and checked. |
| Z10 | Outcome answer's acknowledged-ID list remains at its unique coordinator anchor. X10 instead changes the retained mailbox disposition's Activation ID. |
| Z11 | Takeover answer's receipt remains at its unique coordinator anchor. X18 instead changes that answer's Activation ID. |
| Z12 | toActivationView moved intact to state.ts; its Activation-ID projection remains current. |
| Z13 | viewOf moved to state.ts; its Execution-ID projection remains current. |
| Z14 | viewOf's queued Event-ID collection moved to state.ts and remains exact. |
| Z15 | Mailbox projection moved to state.ts, with an InputId cast in the application branch because timeout Events have no input ID. Re-anchor only the application destination projection. |
| Z16 | holdsOf moved to plan.ts; re-anchor its code-hold Activation-ID projection. X11 instead changes retained hold state. |

[Anchor observations](family-applicability-10.json) and triage-05.json contain the
exact current targets/spans and unique-count checks. A moved member stays one
adoption. Distinct observable fields and operations remain distinct under P1-G;
sharing the exact-coordinate leaf is not a reason to drop their distinguishing edits.

No registry case has been added or run for this batch. Fresh controls, qualified
kills and final P1-M bindings remain required. No product, historical evidence or
derived adoption data changed. Resume at ablations-06; stop immediately if either
observed count passes its cap, otherwise re-estimate at origin 731 as directed.
