# K1.3 — owner choice 05: the post-state predicate is evaluated in full

**Record type:** owner decision on question D1 of [design 03](design-03.md), after
[design check 03](design-check-03.md). Recorded on 2026-10-27 by the K1.3 implementer's Claude Code desktop
session (`claude-opus-5-5`), at the owner's instruction. The owner's words, verbatim:

```text
D1: full evaluation. The owner evaluates all of P on every next record, not incrementally; the test-only full
witness stays as evidence.
```

## Effect

- **Full evaluation.** The owner evaluates P1–P9 over the whole next record on every decision that builds a
  successor. Design 03's incremental forms, and the induction over held records they rested on, are
  withdrawn. Design check 03 approved incremental evaluation only with a completed-commit premise (D1); the
  owner chose design 03's stated alternative instead, at O(mailbox + retired waits) per decision.
- **Witness kept.** `postStateViolation`, the full evaluation of a record as committed, stays as evidence.
  It runs after every accepted plan in the state-plans plan witness, `owner-guards.test.ts`, the K13-9 search
  and the declared successor search.
- **L-28 narrows.** A later decision is checked in full, so the limit covers only a commit a host fault
  interrupts, not admission from a record such a commit left behind.
- **D2 and D3.** Design check 03 approved D2 (whole-batch acknowledgment becomes structural), scoped to the
  Outcome that resolves the exchange. D3's `endingAt` hint is not needed: full evaluation finds the ending
  Event in the next mailbox it already scans, so no plan field is added.
- **Scope.** Design check 03's six required changes (D03-CHK-01 to -06) apply.
  [Design 03's revision](design-03.md#revision-1--owner-choice-05-and-design-check-03) records how. The open
  findings stay open until an independent review of the new candidate.
- **Earlier choices stay in force:** owner choices 01, 02 and 04, and brief 02's bounds.
