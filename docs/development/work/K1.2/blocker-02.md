# K1.2 architecture blocker — malformed Activation identity precedence

Recorded by ChatGPT (GPT-5.6 Sol), 2026-09-26 UTC, during independent
[review-12](review-12.md).

Reviewed candidate H13: `54c65a7289e90385e01643422d57a015b66c2025`; payload C11: `ad219a5cf8940d0379bda9b16d693c901931a4b5`; governing base B:
`a20d278185eaffc7f8b7489345a3624231ff6e6d`.

This is an architecture blocker record, not an implementation decision, acceptance, integration or
successor release.

## What is blocked

K1.2 has a fully implemented and tested current behavior for malformed `activationId`, but the
candidate itself states that the Layer-3 ordering which would authorize that behavior is undecided.

Today `submitOutcome` validates `activationId` as identity text before it can perform the
accepted-Outcome lookup. Therefore a non-text or otherwise malformed Activation identity is refused
as `malformed_envelope` before:

- replay/conflict lookup under an accepted Activation ID;
- terminal-state fencing;
- comparison with the unresolved Activation;
- writer-epoch/base-revision currency;
- submission authority;
- the rest of content validation.

This creates an observable distinction. For example, after an Execution is terminal, a fresh
well-formed Activation identity reaches `terminal_destination`, while a non-text
`activationId` currently returns `malformed_envelope`.

The numeric epoch/base ordering is **not** the blocker. Round 13 correctly repairs
K12-R11-ORDER-01 with per-coordinate currency and that correction should be preserved.

## Why this blocks instead of becoming another code patch

The current contract records this case as **K1.2-OPEN-5** and says its exact Layer-3 position
“awaits an owner decision under 006.” That makes it an unresolved semantic choice, not a known
implementation defect with a uniquely authorized repair.

Governing 006 requires `WAITING_FOR_REVIEW` to have no unresolved owned semantic case and says a
required unresolved semantic case cannot be left for the reviewer. An actual semantic ambiguity uses
`BLOCKED_ARCHITECTURE`. Green tests cannot resolve it because the tests currently pin one side of
the undecided choice.

Accordingly, review-12 does not choose a behavior. The packet has one overall state:
**BLOCKED_ARCHITECTURE**. C3/C15 are marked FAIL in the review because their requirements cannot be
shown complete while this semantic position is undecided; those FAIL rows are evidence for the
block, not a simultaneous `CHANGES_REQUESTED` state.

## Smallest owner decision requested

Decide the total position of a missing, malformed or unobservable `activationId` relative to these
groups:

1. accepted-Outcome replay/conflict lookup;
2. terminal-state fence;
3. current-Activation identity and epoch/base currency;
4. current-attempt submission authority;
5. ordinary content validation.

The decision should answer at least these distinguishing schedules:

| Schedule | Question the owner must settle |
|---|---|
| terminal Execution + malformed `activationId` | `malformed_envelope` first, or terminal fence first? |
| accepted Activation + malformed/unobservable identity | can replay/conflict be addressed at all before identity validity is established? |
| unresolved exchange + malformed identity + stale numeric coordinate | does malformed identity prevent the proposal from naming an exchange, or may a well-formed stale coordinate still dominate? |
| unresolved exchange + malformed identity + absent/forged grant | identity/exchange classification or submission-authority classification first? |
| malformed identity + otherwise malformed content | which group owns the refusal and what diagnostics, if any, may be returned/retained? |

The owner need not redesign the whole Outcome protocol. A short rule in the canonical
`execution-cycle.md#outcome-acceptance` owner that makes the above ordering total is sufficient,
provided the contract, BASELINE and binding are then aligned to it.

## Options and tradeoffs

One coherent option is to keep the current binding behavior: an Activation identity must be valid
before the accepted-Outcome index or fresh exchange can be addressed, so malformed identity is
`malformed_envelope` before replay and terminal. This makes addressing explicit, but means a
terminal Execution can reveal a different refusal class depending on identity shape.

Another coherent option is to make an already-resolved execution-level fence such as terminal state
dominate malformed fresh identity after scope, while still requiring a valid identity for replay.
That reduces some shape-dependent terminal classification, but requires a precise split between
“can address replay” and “fresh proposal” and may change current tests/code.

Other orderings are possible. The reviewer expresses no preference; the owner should select the rule
that matches the intended protocol semantics and disclosure model.

## Required follow-through after owner decision

After the owner records the decision:

- update the single Layer-3 owner, not a competing development-only rule;
- update K1.2 contract DEC-2 / OPEN-5 and the implemented BASELINE;
- update `submitOutcome` only if the selected rule differs from current behavior;
- update/add distinguishing tests for the schedules above;
- preserve the C11 per-coordinate epoch/base currency repair and its B15/B16 evidence;
- reconcile the contract revision identity (review-12 K12-R13-REC-01);
- reconcile the canonical “no content diagnostic is produced” wording with intentionally eager
  capture unless the decision intentionally changes DEC-10 (review-12 K12-R13-DOC-01);
- create a fresh payload C and candidate H with applicable validation, then perform a fresh
  cumulative review.

## Work allowed while blocked

Do not merge K1.2, mark it `WAITING_FOR_REVIEW` or `ACCEPTED`, or release K1.3 while this owner
decision is unresolved.

Safe work may continue on non-semantic administration and evidence preparation: contract revision
bookkeeping, preserving/rechecking the C11 evidence, preparing distinguishing tests/probes that do
not encode a preferred answer, and documenting the decision surface. Do not change the
`activationId` precedence or canonical rule until the owner decides it.

Elapsed time, existing implementation behavior, or green tests do not resolve the blocker.
