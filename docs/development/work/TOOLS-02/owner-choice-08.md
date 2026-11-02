# TOOLS-02 — owner choice 08: separate test and mutation-adoption caps

Recorded on 2026-10-29 by the implementing Codex GPT-6 session, from the owner's
instructions in this chat. This is an owner direction, not review or acceptance.

The owner's words, verbatim:

> Owner choice 08 for TOOLS-02: option A. The cap of 12
> counts only groups that need a new test. Mutation adoptions (a registry case against an existing passing leaf)
> count separately: stop and ask if projected adoptions exceed 60. Re-estimate both after origin 731.

This answers [projection 06](projection-06.md) at
`8acfc06ecd0711d1a3eea8d163fd067bbde13837` and amends owner choice 07's cap.
Two counts replace the single group count:

- **Test groups:** distinct P1-G groups requiring a new maintained test; projected cap **12**.
- **Mutation adoptions:** registry cases added against an existing passing leaf; projected cap **60**.

Stop and ask if either projection exceeds its cap, or early if either observed count
already exceeds its cap. The family rule in design 01 §5.4, S1–S6, the dispositions,
all other stop conditions and the audit parameters are unchanged.

The fourteen groups in [group review 06](group-review-06.md) now count as **three test
groups and eleven mutation adoptions**. The original projection-06 stop is preserved.

Resume at `K1.2/ablations.mjs:1`, `artifact-fb7a16748e389543ef6bf980`.
Reconcile every remaining family route: read each absent anchor individually for
supersession or relocation. An adoption with an absent anchor remains one adoption,
re-anchored, unless a superseding reading retires it. Continue in source order.

After origin **731**, record `projection-07.md` with both counts so far, new counts
per 300 origins, both projected totals, and projected added registry runtime.
Add adopted mutants to the existing registries only. Run each mutant's control and
confirm its kill in a fresh clone. The handover's P3 builds, self-audit,
`mappings_complete`, final fresh-clone verification, CI dispatch with no polling,
and subsequent H remain required. Implementers mark review-ready, never acceptance.
