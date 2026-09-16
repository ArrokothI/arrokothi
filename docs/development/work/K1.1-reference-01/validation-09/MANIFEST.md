# Validation manifest — K1.1-reference-01 round 9

Payload C9 `a117b2983278f09c03027e2b3553a9a644d18986`. Captured 2026-09-16T05:43:50Z UTC on Node v25.2.1, npm 11.6.2, git 2.39.5, Darwin 25.6.0.

All three logs carry the same seven-line header as round 8's, and every result is preceded
by its command.

| File | SHA-256 | What it proves |
|---|---|---|
| `00-scope-and-auth.log` | `8631a23d0ab52b5345ff2dc4c92a24822946de30ecd9079033a076770ec19d46` | `REF1-DEC-4` present with the owner's verbatim instruction and its stated residual; `decision-01.md` append-only prefix check; round-9 delta H8→C9 is exactly 3 paths; executable, Layer-2 and sealed-record identity; whitespace census with the change from round 8 named |
| `01-typecheck.log` | `00b39a4b2476ee9df414c5a99f60dec1cecd81535668d2e55b60a88d29c2fa8b` | `npm run typecheck` exit 0 |
| `02-builder-docs.log` | `fe0c9130fdabcf2b6a478c2e59bcb6e2051a62e8b03c540a2588ec41c4438e14` | `npm run check:builder-docs` 57/848/38, exit 0 |

Not rerun this round: `test:kernel`, `test:conformance`, `test:sdk`, `test:evals`.
Justification, checkable in `00` §3: no executable byte or dependency manifest differs
A→C9, and the round-9 delta touches three documentation paths only. Review-07 reran the
full gate at H7a and reproduced 2322/356 with 0 failures.

**Node limitation, restated.** Two legacy Effect tests cancel on Node v22.22.3 (OP1),
pre-existing at original B, reproduced by five reviewers. This machine has Node 18 and 25
only and has never reproduced it. **No all-supported-Node green claim is made.**
