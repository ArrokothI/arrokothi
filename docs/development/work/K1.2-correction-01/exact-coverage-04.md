# Exact-coordinate correction — round 4

## Pre-implementation coverage

This map was derived before changing the maintained oracle. It addresses
[K12C1-R6-EVID-01](review-06.md)
under [contract revision 4](contract.md), DEC-4/DEC-6 and C2/C4/C8–C12. The invariant is
exact retained and returned identity even when its diagnostic rendering is omitted. Receipt
reference equality and two views built by the same projection cannot establish exact spelling.

The governing owners are [identity](../../../../mental-model/concepts/identity.md),
[creation](../../../../mental-model/mechanisms/creation.md),
[execution cycle](../../../../mental-model/mechanisms/execution-cycle.md),
[evidence](../../../../mental-model/mechanisms/evidence.md) and
[output](../../../../mental-model/mechanisms/output.md). Kernel owns these accepted identities;
the fake Driver records its arguments and does not decide the expected identity. No production
coordinate defect or architectural change was found in this reconstruction.

K1.1 creation, ingress and carried Event coordinates **are included**: they are inputs to the
K1.2 exchange and the inspection surfaces DEC-4/DEC-6 promise remain exact. Their older producer
does not justify leaving them outside the correction's evidence. This adds tests of the existing
binding, without changing creation semantics or introducing a universal receipt spelling.

| Producer / consumer | Distinguishing schedule | Exact facts and forbidden changes | Oracle / mutation |
|---|---|---|---|
| `createExecution`: Execution, initial Event, creation receipt; replay and mailbox/view | Two long keys at one namespace/scope; non-ASCII and lone-surrogate namespace variants | Independent Execution/Event/receipt spelling; creation replay keeps the same receipt and changes no view | Existing four exact-coordinate schedules expanded; Z2, Z13, Z15 |
| `submitInput`, `#mint(input_ingress)`: Event, Input ID, receipt; answer, mailbox, queued list | Input before dispatch and outside the later terminal batch | Independent Event ID and Input ID triple, position/token; exact retry after terminal; no replay mutation | Same schedules; Z1, Z14, Z15 |
| `dispatch`, `#mint(dispatch_intent)`: Activation, grant, batch, receipt; delivered Event and view | Initial two-Event batch, second empty batch after continue | Independent Activation ID and receipt; delivered Event destination/ID, batch, view and grant exact | Same schedules; Z1, Z3, Z4, Z7, Z9, Z12 |
| `redeliver`: answer, Driver call, delivery row | Retry epoch 1 before takeover and epoch 2 after takeover | Whole answer has exact ID/batch/original receipt and pinned epoch; same Activation/grant references; only one delivery row added | Same schedules; Z8 |
| `requestTakeover`, `#mint(dispatch_intent)`: replacement Activation/grant, answer, view/history | Protocol-held epoch 1 → epoch 2 | Exact unchanged Activation/batch, new exact receipt; old receipt retained; new grant, exact history actors | Same schedules; Z1, Z5, Z11 |
| `recoverExecution`, `reportProtocolFailure`, hold clearing | Code/protocol hold and clear, takeover clear, Outcome ends both holds | Exact answer/hold/history coordinates and actor namespace/scope; duplicate report changes nothing | Existing direct hold/history assertions retained; Z16 and X11–X20 |
| `#accept`: Outcome receipt, output IDs, acknowledgment, terminal disposition, accepted lookup key | Continue then complete/fail; same local Emission key in two exchanges; outside input | Independent receipt/output IDs; exact acknowledgment and terminal lists; receipt/output uniqueness; replay without grant changes nothing | Same schedules; Z6, Z10 and X8–X10/X21–X23 |
| `viewOf` and projections: Execution, Activation, Event/Input IDs, receipt lists, exchanges/output/dispositions | Before dispatch, open, after takeover, terminal and late report | Direct expected coordinates at each state, then whole-view forbidden-change checks; all acceptance positions contiguous with exact tokens | Same schedules; Z12–Z16 and X8–X23 |
| `visibleExecutions`, `#refusal` | Both Executions visible; accepted-ID conflicting Outcome | Exact visible IDs and refusal `executionId`; conflict appends only its refusal; accepted state unchanged | Same schedules; direct expectation and existing refusal fixture |

Selected 012 methods: deterministic execution, controlled delivery-report ordering, independent
value oracles, source inventory and single-span mutation discrimination. The clean control and
all Z1–Z16 run against the full Kernel suite. X8–X23 remain covered by the existing runner;
no historical evidence is edited. Native fidelity, durable restart, isolation and external gates
are excluded by the packet contract and no such claim follows from these tests.

## Closure and result

The four maintained schedules now derive Execution, Event, Activation and output identities from
the selected namespace/scope/keys, and receipt records from the documented binding's boundary,
owning Execution and position. Creation, ingress, both dispatches, takeover and both Outcomes
occupy eight independently asserted positions. Each corresponding receipt in a second Execution
has the same boundary/position and a different token. Creation/ingress/Outcome retry after terminal
returns the original receipts without changing the view. Ordinary redelivery is checked before
and after takeover, including its complete returned answer and the Driver's pinned arguments.

Inspection now has direct expected Execution IDs, Event IDs, Input ID triples and receipt records
at queued, open, replacement and terminal states. Mailbox, current/resolved exchanges, Emissions,
result and receipt inventory retain their exact receipt aliases. Existing recovery/hold/history,
late-report and refusal-only mutation assertions remain. Direct expected coordinates establish
the identities first; before/after view comparisons then establish the permitted changes.

No production coordinate code changed, no old regression was removed and no new architecture
choice was settled. The new oracle closes the review's evidence gap rather than repairing an
observed coordinate corruption. Adjacent assertions for visible Executions, receipt positions,
empty subsequent batch and terminal creation/input replay came from this source inventory; they
are implementer-added coverage, not additional findings attributed to review 06.

Iteration results on the working tree: the expanded maintained oracle passed 4/4; an all-Z run
passed its full Kernel control (1,258/1,258) and rejected Z1–Z16, with actual failures in the
exact-coordinate oracle, zero cancelled/skipped/todo tests and all other executed tests counted.
Receipt-alias/whole-Outcome assertions and one-snapshot runner protection were then strengthened;
the final oracle again passed 4/4. These are iteration results, **not clean-C validation**. The
final [runner](ablations-04.mjs) pins one package snapshot, verifies the sealed reviewer runner's
digest, requires exact-once spans, and requires every mutant to run the same full suite as its
clean control. No missing anchor, timeout, skipped test or setup error counts as a rejection.

Final clean-C command: `node docs/development/work/K1.2-correction-01/ablations-04.mjs`.
Its result, raw attachment, exact C identity and digest belong to the round-4 implementation
report. Whole-packet readiness remains separate, including the value-cost obligation and any
owner blocker. This note is an implementer assessment and cannot self-accept the candidate.
