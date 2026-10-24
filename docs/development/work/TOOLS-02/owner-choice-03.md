# TOOLS-02 — owner choice 03: reopen the two mcp-boundaries origins

**Record type:** owner decision on a question from the range 1 correction. It was recorded on 2026-10-24 by the
implementer's Claude Code desktop session (`claude-opus-5-5`), from the owner's message in this conversation. It is
not a review, an acceptance or a release.

**The question.** At C3 `df80badc6502aa9da6315367032fb211a1bf0232`, design 04's correction refuses seven members of
`tests/conformance/architecture/mcp-boundaries.test.ts` that were preserved before it. Their recursive listings of
`tests` observe changed `tests/fixtures` entries (review 01, T2-R1-READ-01). Two complete origins hold those
members, and the full verify refused them: "a refused member of this origin has no linked target". The two origins
are:
- `artifact-a1391856426919155dd8d776`, pinned at `9fd2faa7`;
- `artifact-accb88d01d3c1bd7a07f7a37`, pinned at `66bc0411`.

The corpus does not let a revision-2 mapping return to `pending`. So the choice was between two routes:
- reopen both origins for revalidation;
- keep them complete by adding a suite target for each of the seven members.

**The owner's words**, verbatim:

```text
Reopen both mcp-boundaries origins as pending_revalidation, transferred to TOOLS-02 range 4 under a short owner choice 03 with a pinned list; then build C4.
```

## Effects

1. **Both origins move from `complete` to `pending_revalidation`.** Their `legacy` mapping and recorded closure
   stay as history. The closure's three linked held witnesses (members 102, 112 and 143) are unchanged.
2. **They are transferred to TOOLS-02 range 4** under this record. The pinned list is
   [transferred-origins.json](owner-choice-03/transferred-origins.json); `transfer_lists` in the adoption manifest
   pins its SHA-256, and `transferred` names each origin with this decision.
3. **No credit changes.** The seven members stay refused and earn nothing. Range 4 triages the two origins like any
   other open origin.

## Not decided here

- Range 4's disposition of these origins.
- Any other origin. The implementer found no other complete origin with an unlinked refused member at C3.
- Any acceptance, hold release or successor release. TOOLS-02 stays IN_PROGRESS.
