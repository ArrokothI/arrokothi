# K1.2-correction-01 amendment 03 — prove DEC-8/9 at runtime; the analyzer is a guard, not a proof

Owner scope amendment, 2026-09-29 UTC, under 006. Drafted by the Claude Code session (`claude-opus-5-5`)
that wrote review 08 and the round-6 fix prompt, and adopted by the owner as drafted (see the adoption record at the end). It is not a
review verdict and accepts nothing.

## Why

[Review 11](review-11.md) (GPT-6) finds the current runtime correct in every case it examined:
- C1–C7, C11 and C14 pass.
- C8–C10, C12, C13 and C15 fail **only** because the enforcement of correction DEC-8 (no read of an
  unowned member) and DEC-9 (prebuilt control commits) is not sound.

Here is how that enforcement grew:
- **Round 6 prompt.** The drafter of this amendment wrote it, and it asked how the rules would be
  "enforced mechanically, so that a new optional read fails a maintained check".
- **Revision 7.** It made enforcement part of DEC-8/9.
- **Review 10.** It showed that the syntactic scan was incomplete.
- **Revision 8.** It replaced the scan with a 1,634-line TypeScript analyzer: a closed syntax
  allowlist, checker classification and a provenance effect analysis.
- **Review 11.** It shows three mutants that pass the analyzer and all 1,411 Kernel tests: a member
  introduced through a `Pick` cast, a default parameter that calls `#mint`, and a local named
  `undefined`.

The reviewer is right under the contract as written. The contract, however, asks for a static
analysis that is **sound against any code a future author could write**. That is an open research
problem, not a correction task, and no reviewer can finish it: each round can construct one more
evasive program. It is the same pattern as V-D1 before [decision-05](../K1.2/decision-05.md), in
two respects:
- **Scope.** What the analyzer protects against is future Kernel code written by trusted
  maintainers, whose changes are reviewed anyway. It does not protect against caller input.
- **Missing tool.** No sound off-the-shelf tool exists for this property.

## Amendment

1. **DEC-8 and DEC-9 stay binding as coding rules.** Kernel code reads no member its object may not
   own, and recovery controls build every retained or returned value before their first mutation.
   Their runtime behavior remains an acceptance criterion.
2. **Their acceptance evidence becomes runtime-based and finishable.** It closes by the declared
   bounded method in [012](../../012-review-methods.md). There are two sweeps:
   - **Poisoned-prototype sweep (DEC-8).** The maintained scenarios run with `Object.prototype` and
     `Function.prototype` carrying counting, throwing and reentrant accessors for every member name
     the zone uses. The poisoned accessors must receive no call, and all results must match an
     unpoisoned run.
   - **Fault-injection sweep (DEC-9).** An exception is injected at each call between a control's
     first observation and its apply phase. For every injection point, the whole view and the
     **next accepted receipt position** must equal a run without the call.
   Both sweeps state their scope: the paths the maintained scenarios reach. Review 09's matrix,
   review 10's whole-view comparisons and review 11's fault and reentrancy probes on clean code
   become maintained tests.
3. **The static analyzer is demoted to a regression guard.** Its role is to catch plausible
   accidental forms. It is not a soundness proof.
   - It may be kept, simplified or replaced. Simplifying it is preferred.
   - BASELINE and the contract must describe exactly what it detects and its known gaps, including
     review 11's three forms, and must not claim comprehensive enforcement.
   - Deliberately evasive programs that no maintainer would plausibly write are outside its
     acceptance. Examples are shadowing `undefined`, and introducing a member through an unrelated
     narrow type.
4. **Structural enforcement "by construction" is deferred to the owner's DESIGN-AUDIT-01 decisions.**
   - It means that runtime mechanisms make the rules hold regardless of code shape. Examples are
     null-prototype Kernel records, and accepted state writable only through one commit function.
   - The audit's threat-model decision can change how much of this is needed.
   - No sound-analyzer obligation is transferred.
5. **Unchanged:** every other criterion, amendments 01–02, decision-05, the V-D1 transfer and both
   invalidation holds. The next candidate carries contract revision 9, and production code may
   change only for the runtime obligations above.

## Owner adoption

Adopted as drafted by explicit owner answer in the Claude Code session on 2026-09-29 UTC
(question "Adopt amendment-03 …", answer "Adopt as drafted"). In the same exchange the owner
directed that review 11 and its owner note be recorded first (`d005dc6`).
