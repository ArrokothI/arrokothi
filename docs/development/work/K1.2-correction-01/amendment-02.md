# K1.2-correction-01 amendment 02 — lift the production-code freeze for review 09

Owner scope amendment, 2026-09-28 UTC, under 006. Drafted by the Claude Code session (`claude-opus-5-5`)
that wrote review 08 and prepared the revision-6 candidate, and adopted by the owner as drafted (see the adoption record at the end).
It is not a review verdict and accepts nothing.

## Why

[Amendment 01](amendment-01.md) item 3 froze production source at `9248e56`. It did so on the
premise that only the transferred value-cost work was still failing.
[Review 09](review-09.md) (GPT-6) found two defects that the freeze prevents fixing:
- `K12C1-R9-HISTORY-01` (P1). `appendRecoveryHistory` reads an optional field of a Kernel-created
  ordinary object. The field is absent, so the read consults `Object.prototype`, which a caller's
  own getter can pollute during an authorized control request. Recovery history can then gain
  invented, mutable or causally reversed entries, or an exception can escape after a hold changed.
- `K12C1-R9-CLAIM-01` (P2). Comments in `values.ts` still present the transferred V-D1 guarantee as
  a property of this implementation.

Both violate obligations that revision 6 keeps: C9, C10, C12 and C13, the ambient-safety rules and
truthful claims. The freeze was a planning constraint, not a semantic rule, and lifting it changes
no requirement.

## Amendment

1. **Production changes are allowed for three purposes:**
   - closing `K12C1-R9-HISTORY-01`;
   - closing `K12C1-R9-CLAIM-01`;
   - closing other in-scope defects of the same mechanism that the reconstruction finds, reported
     with separate provenance.
   **What "the same mechanism" means:** a Kernel read of a field its own object may not own, or any
   other point where caller-influenced ambient state can inject a value or run code, between
   observation, mutation and retained evidence.
2. **Requirements unchanged:**
   - every revision-6 criterion and scope;
   - the transfer of V-D1 to K1.1-correction-03, and decision-05;
   - decisions 01–04 as revision 6 reads them;
   - accepted values and single observation.
   No V-D1 claim is made or released.
3. **Next candidate:**
   - It carries contract revision 7, which records this amendment.
   - It reconstructs the recovery-control/history subsystem and its adjacent optional-field reads.
     This is a reconstruction under 006, because this subsystem was already corrected in K1.2 by
     `K12-R1-HISTORY-01` and `K12-R3-HISTORY-02`.
   - Its evidence must include maintained oracles for review 09's 22-case matrix, the mutable
     foreign reference, and both safe clear paths.
4. **Holds:** both invalidation holds remain.

## Owner adoption

Adopted as drafted by explicit owner answer in the Claude Code session on 2026-09-28 UTC
(question "Adopt amendment-02 …", answer "Adopt as drafted"). The owner also stated the next round's
roles: a new Claude Code (Opus 5.5) session implements it, and GPT-6 reviews it.
