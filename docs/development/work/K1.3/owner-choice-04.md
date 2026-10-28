# K1.3 — owner choice 04: redesign S2 as a predicate over the next record

**Record type:** owner decision under [006's stop-and-redesign rule](../../006-development-process.md#stop-and-redesign).
It answers [review 02](review-02.md)'s root-cause note and the three owner options it lists. Recorded on
2026-10-27 by the K1.3 implementer's Claude Code desktop session (`claude-opus-5-5`), at the owner's instruction.
The owner's words, verbatim:

```text
option 1. Redesign S2 (and the S1-S5 state relations it can cover) as a predicate over the record the owner is
about to commit, not over plan fields. Design 03 plus a bounded design check, then build.
```

## Effect

- **Claim kept.** Review 02's option 1 is chosen. The strong terminal-completeness guarantee is kept, not refined
  or split.
- **New design and check.** [Design 03](design-03.md) states S2, and the S1–S5 relations it can cover, as a
  predicate over the record the owner is about to commit. A bounded design check runs on design 03 before any
  code changes. Owner choice 03's waiver covered brief 02 only and does not extend to design 03.
- **Findings stay open:** K13-R01-S2-01 at the guarantee level, K13-R02-S2-01 and K13-R02-S2-02. K13-R01-S4-02
  and K13-R01-CLOCK-03 stay closed as review 02 records.
- **Owner choices 01 and 02 stay in force.** Brief 02's bounds and preserved public behaviour still apply.
- **Build after the check.** The build starts only after the design check. Its implementation is reviewed as a
  new C/H under 006.
