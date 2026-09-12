# K0.2 cited-decision reconciliation — Round 14

This is the review guide for the correction to **K02-R14-01**, not an independent acceptance.
The source is the accepted [K0.1 worksheet](../K0.1/protocol-worksheet.md), all ten §11 rows and
the complete decisions those rows cite. The immutable Round-14 review is
[review-14.md](review-14.md), A14 `61732c2f18e6806bcecf83c85e6ad28f26f083ff`.

The executable, explicit inventory is [cited-decisions.ts](../../../../tests/conformance/k0/cited-decisions.ts):
51 decisions, 366 clause references, each naming exactly one assertion owner in
[coverage.ts](../../../../tests/conformance/k0/coverage.ts). The references are **not 366 distinct
obligations**: decisions repeatedly cite the same facts. There are 208 obligation entries. References
reuse the existing owner when the assertion is semantically identical; they do not create extra
`shared` evidence records or pretend a neighbouring transcript proves a different assertion.
The four existing justified `shared` entries remain unchanged.

## All ten rows

| Row | Cited decisions audited | Reconciliation and important limits |
|---|---|---|
| 1 | ID-1, ID-2, ID-6, ID-7 | Preserve create/input replay, conflict, producer scope and receipt distinctions. Add destination-scope input discrimination. ID-1 deletion remains K5.2. Dispatch receipt is K1.1; admission K2.2, settlement K2.3, children K4.1, messages K4.2. A receipt cannot prove later action success (K2.3). |
| 2 | ID-3, ID-4, ID-9, B-1, B-2 | Preserve all C13 exchange-local epoch/Activation adaptation and pinned-batch evidence. Runtime-side pinned payload and authenticated takeover permission are not observed by this port (K1.1). Old-exchange changed-content refusal gains an explicit progress counterexample. Ordinary/empty reservation and wait-ended union/order receive owners without choosing token representation. |
| 3 | OA-1–OA-6, ID-6 | Preserve every prior rejection partial writer and receipt owner. Authentication and scope before inspection are independently assigned to K1.2; typed envelopes cannot exercise unclassifiable responses or autonomous retry loops. Updated-policy replay ordering is K1.2. Successful Effect binding/atomic intents and no redispatch of accepted intents are K2.1. A current exchange with a stale base revision now has its own progress discriminator. |
| 4 | EF-1–EF-4 | Preserve K1 whole-envelope refusal, no intent/key/ID and independent zero attempts. Separately assign request disposition to K2.2, attempt evidence to K2.1, result validity and responsibility to K2.3. EF-4's no-attempt denial, consent, unknown, acknowledgment and stopping-retry clauses are individually recorded. K0 refusal creates none of these later action facts. |
| 5 | W-1–W-9, B-1–B-8, CL-1–CL-3 | Reconcile shape, source-category eligibility, selector equality/ANY-OF, ordered registration, retirement, batching, lifetime, replay, terminal exception and all three clocks. Preserve R5-c2/c2b/c2c and accepted-time assignments. Add missing exact-identity/kind-set/last-alternative, reservation acknowledgment, union/order and terminal-timeout discrimination. Negative corpus shape invariants have corpus guards. Real clock reads/minting/generation allocation are K1.3; crash readiness is K3.2; action certainty/settlement K2.3; child routing K4.1; message acceptance K4.2. |
| 6 | B-2, B-4, B-8, W-2, W-3 | Existing arrival/pinned batch, queued retention and no-readiness owners stand. The inventory routes repeated registration/batch/clock clauses to the same owners, including explicit crash/clock assignments. Terminal ordinary input refusal is not confused with late settlement acceptance. |
| 7 | CX-1, CX-2, CX-5, CX-6, OA-3–OA-5 | Preserve the complete cancellation-loser field family and rejected replay. Driver cancellation request is K1.3; new admission fence K2.2; each late-settlement fact K2.3; persistent rejection/fence K3.2. Accepted nonterminal Outcome replay after later cancellation gains a schedule and discriminator. The existing interaction guard was corrected to respect OA-2-before-CX-6 for that accepted identity. |
| 8 | CX-3, CX-4, CX-6, B-3, B-5 | Preserve completing-envelope refusal and input dispositions. Split prior R8-c aggregate: required Effects first belong to K2.3, not the K2.4 aggregate gate; child accounting belongs to K4.1. Unknown bars completion, permits cancellation and retains reconciliation evidence are separately assigned to K2.3. |
| 9 | PC-1–PC-5 | Existing missing-compatible-code hold/fabrication discrimination stands. Inline dispatch/pinning and removal of legacy kind-based compatibility belong to K1.1. Native form distinctions and locator recovery declarations/refusal first belong to R1.1; they earn no durable safety credit. Publish/pin/rejection-pin/versioned checkpoint and separately missing checkpoint/resource triggers belong to K3.3. |
| 10 | LP-1–LP-3 | Preserve immediate local accepted-state check, corpus prohibition on remote freshness claims and correction-not-retraction of accepted progress. Accepted Effect intent and admission halves of corrective-input non-withdrawal are separately assigned to K2.1/K2.2. |

## How to challenge an assignment

Every assigned entry in `coverage.ts` states both the absent K0 port surface and the first actual
[007 owner](../../007-work-packets.md). A missing schedule alone is **not** an absent surface. That
is why the expressible clauses found in this audit gained counterexamples rather than assignments.
The port still has no submitting principal/access relation, policy update, dispatch receipt,
Runtime-received progress payload, native locator/capability declaration, checkpoint publication/pin,
Effect admission/settlement, child/message operation, actual clock-read trace, lease, process kill
or surviving store. No new port operation or observation field is introduced to simulate those facts.

In particular, K1.3 owns Execution-deadline-to-cancellation behavior, whereas the full three-clock
identity distinction and lease-expiry recovery first become testable in K3.2's persistent worker
profile. K3.1 prepares its real kill harness; it is not the implementation owner. R1.1 owns native
recovery capability declarations/refusal; K3.3 owns actual old-host-alive and checkpoint two-store
proof. K2.4 is a gate, not the first implementation of K2.3's required-work accounting. These are
ownership distinctions, not chronological proximity.

Assignments cover later implementation/evidence, not new release commitments. K0.2 still ships no
Kernel. Where a corpus check states a negative fixture-shape invariant, it is not evidence that an
arbitrary candidate's unscheduled internal activity, authentication or crash behavior is correct.

## Dependent observable defects found during the audit

The 14 new single-field counterexamples preserve all previous scenarios' commands and expectations.
`cited-decision-edges` adds 25 steps using the existing port, and two existing observation points
receive newly explicit owners: empty ordinary batch and the timeout/result union. The concrete missing conditions were:

- ID-2 destination namespace, with producer/raw key held fixed;
- W-7 early match in the second alternative, W-1 exact Event identity and second kind-set member;
- B-2 retained ordinary backlog order, allowed empty ordinary batch, and wait-ended union/presentation;
- B-3 reservation without acknowledgment;
- OA-3 stale base revision despite current exchange/epoch, and ID-9 changed old-exchange content;
- W-9 cancellation after timeout retirement before reservation (disposition and readiness separately);
- CX-6 accepted nonterminal replay after cancellation, which is not a cancellation loser.

The new scenario is a dependent coverage repair, not a protocol redesign. All exchange attempts begin
at ordinal 1, no takeover is added, and no cross-exchange epoch relation is inferred. The original
110 counterexamples, R5-c2/c2b split, empty-dependency candidate discrimination, R5-c2c, and the
Activation-ID adaptation remain intact. Source-derived fixture guards and all conforming candidate
policies are rerun across the expanded corpus.

## Mechanical protection and its limit

[cited-decisions.test.ts](../../../../tests/conformance/k0/cited-decisions.test.ts) checks:

- the exact accepted normative source and all row citation sets;
- the sealed explicit clause inventory, each clause's single real obligation owner, and actual 007
  packet headings for assignments;
- deletion of a clause while retaining its decision label fails, and deletion of an obligation fails
  independently of the inventory seal;
- declared negative corpus invariants, including batch membership/bounds, WAITING dispatch, generation
  and readiness lifetime, exchange-local epochs and the target declarative wait shape.

Existing coverage guards still resolve every scenario/step/counterexample and run the violating
candidate, prohibit shared transcripts and colliding field sets, require coupled-field explanations,
and verify row attribution both ways. The new data does not bypass those checks.

The seal forces a visible review decision when source or inventory changes; it is **not semantic
proof**, and updating it blindly would defeat its purpose. A human must still challenge decomposition,
condition ownership, identical-observation claims and later assignments. This explicitly reviewable
inventory addresses the repeated omission mechanism without pretending prose can be decomposed by a
label-presence test.

C8 is separate: benchmark main `98756f8c10bd806125da8318f1a129bc030aca61` and E0 branch
`5f921f9b415407fe3bdff43a545878437ac31a93` remain unchanged; its pinned evidence record still says
`ownerDecision.state: "pending"`. Mechanical PASS is not acceptance. Round 15 must review H14;
this reconciliation does not self-accept C9 or unblock C8.
