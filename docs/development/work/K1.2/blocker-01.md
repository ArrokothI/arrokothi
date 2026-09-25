# K1.2 architecture blocker — canonical delivery signature

Recorded by Codex (GPT-6), 2026-09-25, during the owner-requested review-06 correction.
Inspected head: `0a063aa418b449a7d0c07f16f0c82cb9a9c9bc8b`; B:
`a20d278185eaffc7f8b7489345a3624231ff6e6d`. This is an implementer blocker, not a decision or acceptance.

## Conflicting authority

[K12-R6-LAYER3-01](review-06.md) requires the canonical delivery contract to account for the
attempt-submission grant required by DEC-20. The implementation passes a third argument on
`ExecutionDriver.deliver` and requires the same current-attempt reference on fresh Outcome acceptance.

The accepted [KC1-ARCH-1 decision and its superseding note](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1-correction-01/decision-01.md)
select `deliver(activation, settlement): undefined` and explicitly say that signature stands
unchanged. The canonical owner is `mental-model/mechanisms/execution-cycle.md#delivery-reporting-boundary`.
K1.1 acceptance at H `52b1600f3b42e3a360fdc3395178f1d147edf304` is recorded by its
[pinned review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1-correction-01/review-08.md).

K1.2 owns Outcome acceptance, and [review-03-merged](review-03-merged.md) explicitly permits an
attempt-bound capability supplied with the Activation as one representation. That supports the
submission-authority requirement, but a reviewer correction and an implementation decision cannot
silently supersede the owner's exact earlier binding selection. The owner's current instruction
specifically requires the 006 blocker path if the canonical correction extends that decision.

## Smallest owner decision requested

Authorize K1.2 to extend only the in-process call to
`deliver(activation, settlement, submission): undefined`, carrying DEC-20's existing frozen,
reference-identity submission grant separately from the per-delivery reporting capability.
Ordinary redelivery keeps the Runtime attempt and its grant; takeover replaces both attempt
authority and epoch; fresh Outcome acceptance requires the current grant alongside visibility,
after replay/conflict and currency checks. Scope remains separate from explicit control authority.
No reporting guarantee, return-value rule, receipt boundary, Driver safety prerequisite, general
wire/token format or remote backend is changed. No acceptance or successor release is requested.

If authorized, the canonical owner will state the complete call and distinguish the two capability
lifetimes; its Outcome-acceptance section will own the grant check's ordering. The binding-specific
representation will remain explicitly in-process. BASELINE and decision/reference navigation will
point to that owner rather than maintain competing rules. The historical KC1-ARCH-1 record stays sealed.

Alternative: retain the architecture block and defer the canonical correction to an explicit owner
choice of another carrier. Do not remove the working grant check or make visibility sufficient.

## Work allowed while blocked

The canonical change is stopped. The independent EVID-01 test/ablation correction and helper/oracle
audit can proceed against existing DEC-20, preserving runtime behavior. R5's draft removal remains in
the current tree. No WAITING_FOR_REVIEW/ACCEPTED claim while the authority question is unresolved.
Resolution must be recorded by a later owner decision; elapsed time or green tests do not resolve it.
