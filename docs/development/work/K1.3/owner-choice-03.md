# K1.3 — owner choice 03: brief 02's design check is waived

**Record type:** owner decision. It answers [brief 02](brief-02.md)'s instruction to get the design check that
[006](../../006-development-process.md) requires before changing Kernel semantics. Recorded on 2026-10-27 by the K1.3
implementer's Claude Code desktop session (`claude-opus-5-5`), at the owner's instruction. The owner's words,
verbatim:

```text
waive brief-02's design check under 006 (routine correction inside the approved design); design-02 is checked
by review 02.
```

## Effect

- Design 02 answers brief 02's questions Q1–Q4 before code, as 006 requires. No separate design check runs
  before the build.
- Independent review 02 checks design 02 together with the corrected candidate.
- Owner choices 01 and 02 stay in force.
- The open findings stay as review 01 records them: K13-R01-S2-01, K13-R01-S4-02 and K13-R01-CLOCK-03.
- Brief 02's stop conditions still apply. A correction that would weaken an approved S1–S5 guarantee, change
  accepted behavior or contradict an owner choice stops for the owner. This waiver does not cover those cases.
