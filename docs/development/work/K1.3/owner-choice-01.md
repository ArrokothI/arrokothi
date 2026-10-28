# K1.3 — owner choice 01: the Driver cancellation request and Execution-deadline enforcement

**Record type:** owner decision. It answers [design check 01](design-check-01.md)'s two owner questions,
D01-CHK-06 (design 01 question Q2, attack O2) and D01-CHK-07 (design 01 question Q3, attack O3). Recorded on
2026-10-25 by the K1.3 implementer's Claude Code desktop session (`claude-opus-5-5`), at the owner's instruction.
The owner's words, verbatim:

```text
Owner choice 01 for K1.3: approve D01-CHK-06 as an optional Execution-scoped Driver cancellation hook
with optional current-attempt coordinates, and D01-CHK-07 fire-only Execution-deadline enforcement.
Proceed to build without a new design check.
```

## D01-CHK-06: an Execution-scoped Driver cancellation request

The Kernel requests Driver cancellation (lifecycle § Cancellation order, CX-1) through one optional, additive
Driver member:

- **Scope.** The request names the Execution. It carries the current attempt's coordinates when an attempt
  exists, and none otherwise.
- **When.** It is invoked after the cancellation decision commits, from every nonterminal state the
  cancellation ended: `RUNNING`, `WAITING`, and `READY`, including `READY` after a resolved exchange. Both causes
  invoke it: explicit cancellation and Execution-deadline expiry.
- **Contract.** It returns `undefined` and is never awaited. Its return value is not observed, and no thenable
  is read from it. A throw from looking up the member or from invoking it is contained. A throw cannot change the
  committed cancellation.
- **No repeat.** A repeated cancellation, which answers with no change, makes no repeated request.
- **Claim.** It is a request, never a physical stop or a safe takeover.
- **Records.** The Driver type and its authoring contract, BASELINE and 017 change together.

## D01-CHK-07: fire-only Execution-deadline enforcement

An Execution deadline takes effect only when the host fires its timer and the Kernel accepts that fire:

- Creation never reads the clock. An Execution created with a deadline already in the past is `READY`.
- An Outcome or a dispatch accepted before the fire may win, even after the deadline instant.
- The host's duty to fire timers, and the absence of instant enforcement, are recorded in BASELINE and 017.
- Whatever the order, accepted expiry creates no timeout Event, accepts no later progress, and cannot reopen
  `COMPLETED` or `FAILED`. This is not described as a consequence of W-9 alone.

## Effect on the process

The build starts without a new design check. [Design 01's addendum](design-01.md#addendum-01--design-check-01-and-owner-choice-01)
records the corrections of D01-CHK-01 to -05, the attack corpus map and the tests these two choices require.
Implementation acceptance still needs the later independent C/H review.
