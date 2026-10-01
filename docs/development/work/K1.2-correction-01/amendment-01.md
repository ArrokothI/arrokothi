# K1.2-correction-01 amendment 01 — split value refusal cost into K1.1-correction-03

Owner scope amendment, 2026-09-28 UTC, under 006. Drafted by the Claude Code session
(`claude-opus-5-5`) that wrote [review 08](review-08.md), at the owner's request, and adopted by the owner
as drafted (see the adoption record at the end). It is not a review verdict and it accepts nothing.

## Why

The owner released this packet on 2026-09-26 for one purpose: a Kernel-minted Activation ID must be
answerable. The packet's history:

- **Revision 4** ([invalidation-02](../K1.2/invalidation-02.md)) brought the refusal cost of
  integrated K1.1 value capture into the packet.
- **Rounds since revision 4:** the identity, diagnostic and exact-coordinate obligations have
  converged:
  - [Review 08](review-08.md) passed every one of them: C1, C2, C4–C15, the DEC-4 evidence plan, the
    review-14 counterexamples, and the text-malformed identity class.
  - Its only failures are the V-D1 cost claim and that claim's evidence.
- **The V-D1 part:** it has now failed three times in a row, each time through a different
  mechanism. [Decision-05](../K1.2/decision-05.md) changes V-D1 into a metered claim that can be
  proved.
- **The cost of keeping them together:** an unrelated subsystem keeps a converged identity
  correction, and all of K1.2, unintegrated.

## Amendment

1. **This packet keeps**, in contract revision 6:
   - the release scope: `K12-R14-ID-01` and `K12-R14-EVID-01`;
   - `K12C1-R1-DIAG-01`, `K12C1-R2-AGG-01`, `K12C1-R2-EVID-01`, `K12C1-R4-EVID-01` and
     `K12C1-R6-EVID-01`;
   - DEC-1 to DEC-6;
   - DEC-7 as **diagnostic semantics** only: bounded details, exact weights, first-occurrence order,
     type-only labels, bounded paths;
   - every K1.2 criterion C1–C15, except the value-cost part of C3.
2. **Moves to the new packet K1.1-correction-03**, *metered value refusal cost*:
   - the value refusal-cost scope that invalidation-02 added;
   - DEC-7's cost claim;
   - the cost claim of SELF-R4-STRING-01;
   - the V-D1 claim scope in decisions 03 and 04;
   - the time dimension of `K12C1-R4-VALUE-COST-01`;
   - `K12C1-R8-VALUE-DEPTH-01` and `K12C1-R8-EVID-01`.
   Their review records stay where they are, and their dispositions are carried by reference.
3. **No code changes in this packet.** The production source at H `9248e56` stays. It includes
   type-only labels, the string preflight and bounded diagnostic storage. On review 08's shape it
   already refuses faster and with less memory than the base did, and nothing it contains is a
   regression.
   - Accepting this packet certifies **no** V-D1 claim.
   - Contract revision 6 must correct BASELINE's sentence "KC2-1/V-D1 remains claimed for plain data
     and every Kernel-selected lookup". Review 08 contradicts it. The corrected sentence says the
     claim is held pending K1.1-correction-03.
   - `values.md` keeps its normative text, because a rule is not an implementation claim. It
     changes only in K1.1-correction-03, under decision-05.
4. **Next candidate.** It is a new C containing contract revision 6 and the BASELINE correction,
   followed by an H containing report 05. Because its production code is byte-identical to
   `9248e56`:
   - The independent reviewer may inspect review 08's pinned reruns for the unchanged source.
   - The reviewer must still check the whole cumulative candidate against revision 6, and must
     check that nothing in the tree still claims V-D1.
5. **Criteria under revision 6.**
   - "Both review-04 findings closed" becomes: `K12C1-R4-EVID-01` closed, and
     `K12C1-R4-VALUE-COST-01` transferred.
   - "K1.1-correction-02 guarantees hold" becomes: the KC2 read bounds and accepted values are
     unchanged, and the V-D1 claim stays held.
   - Review 08's C3 FAIL concerns only the transferred value-cost part.
6. **Holds.**
   - Once the narrowed packet is accepted, the owner may lift [invalidation-01](../K1.2/invalidation-01.md)'s
     integration hold on K1.2 plus this correction.
   - [Invalidation-02](../K1.2/invalidation-02.md)'s V-D1 claim hold moves to K1.1-correction-03.
   - K1.3 is not released by this amendment.

## Seed for K1.1-correction-03 (for 007 on adoption)

**Metered value refusal cost (V-D1).**

- **Dependencies:** [decision-05](../K1.2/decision-05.md). If the owner chooses to settle the
  in-process capture threat model first, that decision (or the design audit that produces it) is
  also a dependency.
- **Scope:** implement decision-05's meter, budget and structural enforcement for `values.ts` and
  every root consumer: creation, ingress, recovery lists and eager Outcome roots.
  - Close `K12C1-R8-VALUE-DEPTH-01`, `K12C1-R8-EVID-01` and the transferred time dimension of
    `K12C1-R4-VALUE-COST-01`.
  - Turn every recorded refusal-cost counterexample into a maintained corpus test: reviews 04, 06
    and 08, and blockers 01 and 02.
  - Optionally, address O-R8-1 to O-R8-3.
- **Start with a design note** that re-examines the capture architecture rather than assuming it.
  One example: `own-array.ts` reads a descriptor on every stack step.
- **Preserve** accepted values, single observation, coherent-Proxy acceptance, the byte and scalar
  limits, and DEC-7 weights, unless the owner changes them.
- **Acceptance:** the metered bound is proved structurally and asserted on the corpus, and V-D1 and
  the invalidation-02 claim hold are released.
- **Out of scope:** O-R8-4, accepted-value classification of re-prototyped built-ins. It is a
  separate owner triage item.

## Owner adoption

Adopted as drafted by explicit owner answer in the Claude Code session on 2026-09-28 UTC
(question "Adopt amendment-01 …", answer "Adopt the split"). The owner also directed that this
session prepare the revision-6 candidate, with a different session reviewing it. The owner also
chose to settle the in-process threat model through a design audit (DESIGN-AUDIT-01) before
K1.1-correction-03 writes code, so that audit is a dependency of K1.1-correction-03.
