# K1.1-correction-02 decision 01 — value obligations stated by the 2026-09-23 values rewrite

Owner: repository owner. Recorded 2026-09-23 by a Claude Code session (Claude Opus 5.5) at the
owner's instruction. This is a decision record, not a review. It sits below the canonical owner,
[values](../../../../mental-model/concepts/values.md), which states the rules; this file records
where they came from.

## Context

The owner rewrote `mental-model/concepts/values.md` on branch `document-rewrite` (draft `3ca89d5`,
reviewed at `227cd05`, incorporated in `6ef8bcd`, integrated through PR #35 at `70467f4`). The
rewrite was written from worksheet §1 (E-1–E-7), K1.1 C3 and KC1-DEC-3/4/6, and was intended to
change no rule. At the owner's request it also added security cautions for K1.2. Checking those
cautions against the accepted sources shows that three of them state obligations no accepted
decision states in those words. The owner proofread and incorporated the page, which adopts them.
This record makes that adoption explicit instead of leaving it implied by a documentation merge.

## Decisions

| ID | Obligation, as `values.md` now states it | Relation to accepted material |
|---|---|---|
| V-D1 | Refusing a value costs no more time or memory than accepting a value at the limits. Limits are checked while a value is read, and a value that stands for more than 1 MiB of canonical bytes is refused once the running size passes the limit, not after full expansion ([fixed semantic limits](../../../../mental-model/concepts/values.md#fixed-semantic-limits)). | New. E-6 fixes the four limits and K01-O12-01–03 fixes their units; neither bounds the work of refusal. Accepted K1.1 capture checked the size only on the finished canonical string, so a live object repeating one shared member was expanded in full before refusal. Implemented by this packet's payload. |
| V-D2 | Where a tombstone digest alone decides whether a later request is an exact duplicate or a conflict, the digest resists deliberate collisions and covers the full canonical bytes ([canonical form](../../../../mental-model/concepts/values.md#canonical-form)). | New precision. [State](../../../../mental-model/concepts/state.md#retention-pin-and-tombstone) already requires a tombstone to keep the permitted identity/content binding; no accepted decision fixes the digest property. No implementation exists yet: tombstones belong to retention work (K5). |
| V-D3 | Each request-envelope field is read once, and that one answer is used for validation, authorization, lookup and what is recorded ([in-process value capture](../../../../mental-model/concepts/values.md#in-process-value-capture)). | Promotes accepted K1.1 behavior to architecture wording. KC1-DEC-6 fixes own-field observation; the single-read rule is what the accepted coordinator already does (`packages/kernel/src/coordinator.ts`, the comment beginning "observe each field once"). No code change. |

The remaining cautions added by the same rewrite restate consequences of accepted rules and need no
decision: refusal instead of U+FFFD substitution and of `1e400` clamping (E-1 finite numbers and
well-formed strings, refused rather than repaired); duplicate keys compared after unescaping (E-2);
comparison per root rather than by joined bytes (E-5 roots with E-7 equality); JavaScript `length`
as the wrong unit (K01-O12 scalar-value counting); and transport bounds for Isolated Execution
(E-6's statement that the limits are semantic, not transport, limits).

## Consequences

- V-D1 required an implementation change to accepted K1.1 code. It was committed as `66e9e84` on
  `document-rewrite` and integrated with PR #35 before any review. That ordering departs from 006;
  [the contract](contract.md) makes the change reviewable after the fact, and nothing here extends the
  original K1.1 ACCEPT to it.
- V-D2 and V-D3 need no code in this packet. V-D2 is assigned to whichever packet first implements
  tombstones (K5.1/K5.2 retention and deletion); V-D3 stays covered by K1.1's existing tests.
- If the independent review rejects any of V-D1–V-D3 as an architecture change the owner did not
  intend, the outcome is BLOCKED — ARCHITECTURE DECISION for that item, not a silent revert.
