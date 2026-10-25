# TOOLS-02 — owner choice 01: rulings after design check 01

**Record type:** owner decision. It answers Codex GPT-6's [design check 01](design-check-01.md) (verdict REDESIGN,
`9ca58fbe`) of [design 01](design-01.md) on four points. Recorded on 2026-10-23 by the implementer's Claude Code
desktop session (`claude-opus-5-5`), from the owner's message in this conversation. It is not a review, an
acceptance or a release. The owner's words, verbatim:

```text
Ruling on D01-CHK-01: option A. Amend T2-1 so enumerated non-fixture reads are recorded by walk root. Also yes to Q7 early integration of range 1, Q2 recorded_limit, Q9 L-16.
```

## Effects

The owner's message states these effects.

1. **T2-1 is amended.** In [brief 01](brief-01.md)'s T2-1 row, the sentence "A real change to a path a member
   depends on still invalidates it" becomes:

   > A real change to a named read, or to any fixture read, still changes the member's record. Enumerated
   > non-fixture reads are recorded by walk root, because their content cannot change a member's status and
   > every member is rerun fresh at C.

   The owner's message calls this T2-1's second sentence. It replaces the criterion's statement about real
   dependency changes, which design check 01 cites as brief line 38. The rest of T2-1, and its closing column,
   are unchanged. D01-CHK-01 is settled by this amendment. [Design 02](design-02.md) defines "named" and
   "enumerated" and the record's form under it.
2. **Range 1 lands first** (design 01, question 7). Range 1, which is T2-1 and T2-2, gets its own narrow review and
   lands on main before the rest of TOOLS-02.
3. **`recorded_limit` is the fourth retired class** of T2-5 (design 01, question 2). It is kept distinct from
   `superseded`, as design check 01 advises, so a behaviour that still exists but is not guaranteed is not
   described as removed.
4. **017 gets L-16** (design 01, question 9), for the local timeout of the `value-cost.bookkeeping-trace` registry
   case. Its wording cites the CI runs in which that case passed, rather than an unverified "never in CI".

## Not decided here

- Design check 01's findings D01-CHK-02 to D01-CHK-06, which design 02 addresses.
- Design 01 questions 4 (moves in `regenerate`), 5 (audit parameters, now under D01-CHK-06), 6 (the extraction
  cap) and 8 (the target route's process model). Design check 01 judged question 8 reasonable, given invocation
  binding.
- Any hold, credit, acceptance or successor release. TOOLS-02 stays IN_PROGRESS.

## Edits made with this record

- [brief 01](brief-01.md): its owner-answers section links this record and states the amended sentence.
- [017](../../017-known-limitations.md): L-16.
- [007](../../007-work-packets.md): the TOOLS-02 row names design check 01, this record and design 02.
