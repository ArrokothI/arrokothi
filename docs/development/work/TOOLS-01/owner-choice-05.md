# TOOLS-01 — owner decision: revalidation origins that cannot close

Recorded 2026-10-05 by Claude Code (`claude-opus-5-5`), TOOLS-01 implementer, from two questions
answered in this conversation during item 3. No hold, credit or acceptance follows from it;
TOOLS-01 remains IN_PROGRESS.

## Questions and answers

**Q1.** The P1 minimum-context rule refuses 38 of the 150 non-limited revalidation origins on the
real corpus (21 non-executable, 12 suite, 5 case). In 21 of them, the origin or a sibling record names
a record in a form the item-1 resolver refuses (for example a probe naming itself by bare filename).
The other 17 reach the wider docs graph through design 05's transitive rule and stop at broken links,
globs, `path:line` forms, external URLs and binary bundles. The options were to leave them open, to
use one-hop named records plus narrow reference forms (measured: 8 still refuse), or to keep
transitive depth and add the forms (measured: 33 refuse). Answer, verbatim:

> Leave 38 open → TOOLS-02 (Recommended)

**Q2.** `packages/kernel/tests/sweep/preload.ts` and `sweep/run-poison-sweep.ts` (pinned at
`66bc0411`) are run only by the required `kernel-sweeps` verification step. No test target imports
or spawns them, and adoption format 2 has no link to a verification step. Answer, verbatim:

> Transfer to TOOLS-02 (Recommended)

## Effect

- These 40 origins stay `pending_revalidation`, visible, and move to TOOLS-02 with the four origins
  of owner choice 04. [transferred-origins.json](owner-choice-05/transferred-origins.json) lists each
  with its path, revision, revision-2 status and one-line cause.
- The reference language and the transitive rule are unchanged. TOOLS-02 decides how to close these
  origins; the measurements above are inputs, not a decision.
- The area gate still applies to them: a packet that touches their areas must close them first,
  TOOLS-01 included (owner choice 04 §3).

## Contract diff (revision 4 to 5)

```diff
-# TOOLS-01 contract — revision 4
+# TOOLS-01 contract — revision 5
@@
 origins and four limited origins move to TOOLS-02; P1 below applies to the scope it keeps.
+[Owner choice 05](owner-choice-05.md) also transfers 40 revalidation origins that cannot close here.
@@ P1 row, closing evidence
-No revalidation origin stays pending except the four limited by owner choice 04. The 1,395 `pending` origins and those four stay open, visible and gated for TOOLS-02.
+No revalidation origin stays pending except the four limited by owner choice 04 and the 40 transferred by owner choice 05. The 1,395 `pending` origins and those 44 stay open, visible and gated for TOOLS-02.
@@ P1-R row
-Unconverted rows stay `pending_revalidation`; only the four origins of owner choice 04 may remain so at review-ready.
+Unconverted rows stay `pending_revalidation`; only the four origins of owner choice 04 and the 40 of owner choice 05 may remain so at review-ready.
```

## Proposed 007 text (owner applies; the implementer does not edit 007)

In the TOOLS-02 scope, replace "and the four origins limited by owner choice 04" with "the four
origins limited by owner choice 04, and the 40 revalidation origins transferred by
[owner choice 05](work/TOOLS-01/owner-choice-05.md)".
