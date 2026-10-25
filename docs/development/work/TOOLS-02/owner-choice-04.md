# TOOLS-02 — owner choice 04: the 006 route after review 02

**Record type:** owner decision under 006's stop-and-redesign rule. It answers Codex GPT-6's
[review 02](review-02.md) of range 1, which fired the rule (a second CHANGES REQUIRED in the read-identity
subsystem, with findings T2-R2-READ-01 and T2-R2-PATTERN-01). It was recorded on 2026-10-24 by the implementer's
Claude Code desktop session (`claude-opus-5-5`), from the owner's message in this conversation. It is not a review,
an acceptance or a release.

**The owner's words**, verbatim:

```text
Refined finishable claim: an explicit supported matrix; any traced call outside it, or a recursive listing that crosses a symlink, refuses preservation. Write design 05, get a short GPT-6 design check, then build.
```

## Effects

1. **Route:** 006's refined finishable claim, not a full redesign, a split or an accepted limit.
2. **Claim:** T2-1's read record covers an explicit, finite matrix of traced calls. Any traced call outside it
   refuses preservation of its file, instead of being dropped. A recursive listing that crosses a symlink also
   refuses preservation.
3. **Process:** [design 05](design-05.md) states the matrix. A short Codex GPT-6 design check precedes the build.
   No patch round starts before that check.

## Not decided here

- The matrix itself. Design 05 proposes it, and the design check reviews it.
- Any further origin disposition. If the rebuilt census refuses another member of a complete origin, the
  implementer asks the owner, as for [owner choice 03](owner-choice-03.md).
- Any acceptance, hold release or successor release. TOOLS-02 stays IN_PROGRESS.
