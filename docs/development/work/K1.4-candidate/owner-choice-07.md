# K1.4-candidate owner choice 07 — a stop rule for design check 05

Recorded 2026-11-20 by the K1.4-candidate coding agent (Claude Code desktop, `claude-opus-5-5`). The owner's
words are quoted verbatim.

## Context

The packet has had three CHANGES REQUIRED reviews (006 stop-and-redesign fired at review 03), owner choice 05 chose
a redesign, and [design check 04](https://github.com/ArrokothI/arrokothi/blob/99d411e00049ae87b781a7c1e1008161409ec983/docs/development/work/K1.4-candidate/design-check-04.md)
did not approve design 04. Round 5 writes [design 05](design-05.md) for another design check. The owner set what
happens if that check also fails.

## Choice

The owner's message, verbatim:

```text
Owner choice 07 (2026-11-20), verbatim: "Yes, set stop rule". Record it as owner-choice-07.md, with this
effect: if design check 05 is not APPROVED or APPROVED WITH REQUIRED CHANGES, the packet takes 006's
"refined finishable claim" route, not another redesign. Then you propose the narrower oracle claim
(what it judges, what is a recorded limit in 017, and what its effect on acceptance is) for my approval,
with no further design check loop. Say this in design 05 so the checker knows the stakes.
```

## Consequences

1. **If design check 05 is APPROVED or APPROVED WITH REQUIRED CHANGES,** the packet continues as usual: the owner
   disposes the check, then the build.
2. **Otherwise the packet takes 006's "refined finishable claim" route,** not another redesign. The coding agent
   proposes a narrower oracle claim for the owner's approval, stating:
   - what the oracle judges;
   - what becomes a recorded limit in [017](../../017-known-limitations.md);
   - the effect on acceptance.
3. **No further design-check loop** follows in that case; the owner approves or rejects the proposal.
4. **Design 05 states these stakes** for the checker.
