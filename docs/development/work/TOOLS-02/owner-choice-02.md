# TOOLS-02 — owner choice 02: T2-4 refined after design check 02

**Record type:** owner decision. It answers Codex GPT-6's [design check 02](design-check-02.md) (`6e96639a`)
finding D02-CHK-05 on T2-4. Recorded on 2026-10-23 by the implementer's Claude Code desktop session
(`claude-opus-5-5`), from the owner's message in this conversation. It is not a review, an acceptance or a release.

**The owner's words**, verbatim, from a later message in the same conversation:

```text
my word is taking plan A: a refined finishable claim.
```

This chooses 006's stop-and-redesign option of a refined finishable claim for T2-4, instead of another
classifier redesign. The message that forwarded the decision had left its quotation slot as the placeholder
`"<owner's words>"`; the words above fill it.

The forwarding message states the effect, verbatim:

```text
Effect: T2-4 is refined. The claims table marks V-ENV (core), V-D1, Proxy and
re-prototyped-built-in as released, and a check in corpus refuses any `held` entry under a released
claim. Every affected entry becomes `unread`: no credit and no limit. An entry becomes `not_held` or
`limit` only through a recorded per-entry reading; none is required in TOOLS-02. Add a 017 entry
recording the unread count, with "fix when: a packet needs credit from these entries". Drop
design-02's environment witness. Update the BASELINE register sentence to match.
```

## Effects

1. **T2-4's closing mechanism** is the claims table's release status, together with a `corpus` check that
   refuses a `held` entry under a released claim.
2. **Every entry held under one of the four released claims becomes `unread`.** It earns no credit and names no
   limit.
3. **`not_held` and `limit` need a recorded per-entry reading.** TOOLS-02 requires no reading.
4. **Design 02's environment witness is dropped.** So are design 01's mechanical scope rules and design 02 §4's
   observation-based rules. [Design 03](design-03.md) states the replacement.
5. **The 017 entry and the BASELINE sentence** land in range 3's candidate, because the exact unread count is
   known only there.

## Not decided here

- Range 1, which design check 02's D02-CHK-01 completion governs.
- Design 01 questions 4 (moves in `regenerate`) and 6 (the extraction cap).
- Any credit, acceptance or successor release. TOOLS-02 stays IN_PROGRESS.
