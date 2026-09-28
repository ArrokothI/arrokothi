# K1.2 decision 05 — V-D1 is a metered-work bound, implemented in its own packet

Owner decision, 2026-09-28 UTC. Drafted by the Claude Code session (`claude-opus-5-5`) that wrote
[K1.2-correction-01 review 08](../K1.2-correction-01/review-08.md), at the owner's request, and adopted
by the owner as drafted (see the adoption record at the end). This is a decision record below the canonical owner,
not a review, an implementation or an acceptance. [Decision-03](decision-03.md) and
[decision-04](decision-04.md) stay unchanged as history; item 5 below states how they are read.

## Why a decision is needed

[Values V-D1](../../../../mental-model/concepts/values.md#fixed-semantic-limits) says that no value
may cost more time or memory to refuse than a value at the limits costs to accept. Read literally,
it is a universal claim about every input, compared by wall-clock time against an at-limit
acceptance that nobody has fixed. No finite review can close such a claim. Each review is a new
search for a counterexample.

The record shows the consequence:

| Later review | Same exact H was earlier judged acceptable by | What the later review found |
|---|---|---|
| K1.2 [review 14](review-14.md) | [review 13](review-13.md) ACCEPT | minted Activation IDs refused (not a cost finding; same pattern) |
| [review 04](../K1.2-correction-01/review-04.md) | [review 03](../K1.2-correction-01/review-03.md) ACCEPT | per-issue refusal memory not charged |
| [review 06](../K1.2-correction-01/review-06.md) | an unrecorded draft ACCEPT that review 06 discloses | diagnostic lookups walked caller prototype chains |
| [review 08](../K1.2-correction-01/review-08.md) | an unrecorded draft ACCEPT that review 08 discloses | uncharged refused containers pay depth-proportional stack work |

Every correction closed its counterexample and left the claim open. Review 08's finding
`K12C1-R8-VALUE-DEPTH-01` is a bounded constant factor of about 1.5× on one engine. The literal rule
cannot say whether that is a defect or measurement noise. A rule that more capable agents cannot
finish is a planning defect, not an implementation defect. This decision replaces the wall-clock
comparison with a claim that can be decided, and moves the work out of a packet that was released
for Activation identity.

This decision **narrows** what V-D1 promises for this binding, from wall-clock parity to metered
work (item 1). The owner makes that change deliberately, because of the review evidence above. It is
not a relaxation granted because an implementation failed. Choosing strict wall-clock parity instead
keeps the rule as it is, and keeps the open-ended review search that comes with it.

## Decision

1. **What V-D1 measures in the in-process binding.** Refusal cost is compared in **metered Kernel
   work**, not in wall-clock or heap samples. Capture keeps one work meter per root.
   - Every operation the Kernel chooses to perform while capturing charges the meter. This covers
     observations of a caller value, Kernel bookkeeping whose amount depends on the value, and
     diagnostic construction.
   - An operation whose engine work grows with a length charges that length. Examples are an
     engine-returned own-key listing (charged immediately after it returns) and a string
     materialization.
   - For a value with no live Proxy, the engine work behind each unit is bounded by a small constant
     that depends only on the four limits, never on the caller's input.
2. **Budget.** `B` is the largest number of units that any value within the four limits can consume
   when it is accepted. `B` is derived from the limits, and the derivation is recorded in BASELINE.
   - Capture refuses and stops once a root's meter exceeds `B`.
   - Because `B` covers every acceptable value, the meter never refuses a valid value. The four
     semantic limits alone still decide validity, and no accepted value, canonical byte or
     diagnostic weight changes.
   - Refusal therefore costs at most `B` units plus one operation, which is what an at-limit
     acceptance may cost.
3. **Structural enforcement, so the claim can be finished.**
   - Capture may observe caller values, and grow value-dependent Kernel bookkeeping, only through
     metered helpers.
   - A maintained static check fails if capture code bypasses them.
   - Tests assert that the meter stays at or below `B` across a maintained corpus that contains
     every counterexample found so far, plus a generated corpus.
   - Timing and heap measurements remain useful observations. They are not gates, and they are not
     on their own grounds for a V-D1 finding.
   - A V-D1 finding names one of three things: an unmetered operation, a unit whose engine work
     depends on caller input for a value with no live Proxy, or a value whose metered units exceed
     `B`.
4. **Memory.** DEC-7 bounds retained diagnostic storage. Each metered unit may allocate only
   constant transient memory, so the same meter bounds allocation.
5. **Unchanged.**
   - Decision-04's live-Proxy exclusion and the own-key-enumeration exclusion stay, with one
     change: each listing's length is now charged right after it returns, so repeated listings are
     bounded.
   - Eager multi-root capture keeps one meter and one budget per root, and no aggregate cap.
   - Decision-03 items 2–5 and decision-04 items 2–5 stand. Where they say "bound", read it as
     "metered and within `B`".
6. **Layer 3.** `values.md` states the metered meaning once, under fixed semantic limits. The
   binding's unit table and budget derivation are an `OPEN(implementation)` choice. They are
   recorded in BASELINE and at that marker.
7. **Where the work happens.** The meter is implemented in the new packet K1.1-correction-03
   ([amendment 01](../K1.2-correction-01/amendment-01.md)), not in K1.2-correction-01.
   - That packet starts with a design note, and it may re-examine the capture architecture itself.
     Accepted K1.1 design is evidence, not an invariant.
   - Any change to accepted values, single observation, coherent-Proxy acceptance or observable
     classification still needs the owner.
8. **Claims and holds.** Invalidation-02's hold on the V-D1 claim stays until K1.1-correction-03 is
   accepted. Review 08's `K12C1-R8-VALUE-DEPTH-01`, `K12C1-R8-EVID-01` and the time dimension of
   `K12C1-R4-VALUE-COST-01` transfer to that packet. Their records stay where they are.

## Options the owner did not take (for the record)

- **Strict wall-clock parity.** This keeps the literal text. It stays engine-dependent, and a later
  reviewer can always reopen it by searching further.
- **A fixed constant factor over wall clock (for example, at most 2×).** This can be decided only
  against a fixed reference corpus on a fixed engine, and it still needs a search for the costliest
  acceptance.

## Owner adoption

Adopted as drafted by explicit owner answer in the Claude Code session on 2026-09-28 UTC
(question "Adopt decision-05 …", answer "Adopt as drafted"). In the same exchange the owner
adopted [amendment 01](../K1.2-correction-01/amendment-01.md) and chose to settle the in-process
capture threat model through a design audit before K1.1-correction-03 writes code. No other change
was made to the draft.
