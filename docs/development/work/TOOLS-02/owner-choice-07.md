# TOOLS-02 — owner choice 07: grouped extraction cap

Recorded on 2026-10-29 by the implementing Codex GPT-6 session, from the owner's
instructions in this chat. This is an owner direction, not review or acceptance.

The owner's words, verbatim:

> Owner choice 07 for TOOLS-02: option A. Continue grouped
> extraction; the cap counts distinct extraction groups, stop and ask if they exceed 12; re-estimate groups after
> the next 300 origins.

This answers [projection 05](projection-05.md) at checkpoint
`c357d821b4a879cbb471a3b89077d83ec22c84ef` and authorizes continuing grouped extraction.
It amends design 01 §5.6 and §9's extraction stop: the cap counts **distinct extraction
groups under P1-G, not origins**. Stop and ask when the **projected total of distinct
extraction groups exceeds 12**. The other stop conditions, dispositions, S1–S6 rule
and audit parameters are unchanged.

Resume at `K1.1/validation-15/MANIFEST.md:71`, origin
`mention-d111e6a1813ab1cfd6e935ef`, in source order. Each projection records the current
distinct-group count. The next checkpoint is after origin 600, in `projection-06.md`:
groups so far, new groups per 300 origins and projected total.

Before building any group's test, confirm that it is a live counterexample at C,
not covered elsewhere or superseded. This applies especially to the 27-origin
count-gate group. Existing P1-G grouping does not by itself establish a live gap.
P3 builds, the self-audit, `mappings_complete`, final fresh-clone verification,
Packet verify dispatch without polling, and then H remain required by the handover.
