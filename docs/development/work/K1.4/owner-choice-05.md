# K1.4 — owner choice 05: narrow redesign after review 02

**Record type:** owner decision. Recorded on 2026-11-08 by the K1.4 implementer's Claude Code desktop session
(`claude-opus-5-5`) from the owner's instruction for this round. The owner put and answered the question outside
this session; this record quotes the instruction.

## Question

[Review 02](https://github.com/ArrokothI/arrokothi/blob/b655733b9b90810eca747c61b8f2095f5f201341/docs/development/work/K1.4/review-02.md)
(Codex GPT-6, `codex/k1.4-review-02` at `b655733b`) is CHANGES REQUIRED of H
`96214874577f2108a7578d1d6fcebc4af0f7173c`: K14-R2-01 and K14-R2-02. It is the second CHANGES REQUIRED in the
bridge's observation and termination subsystem, which round 2 already corrected. So
[006's stop-and-redesign rule](../../006-development-process.md#stop-and-redesign) fired, and no patch round
may start before the owner chooses. The review's root-cause note gave the four options 006 lists:

| Option | Meaning |
|---|---|
| (a) | Redesign: a new design note and a new design check |
| (b) | A refined finishable claim |
| (c) | A split, with a combined gate |
| (d) | An accepted, recorded limit |

## Answer

The owner's answer, verbatim:

```text
(a) Narrow redesign
```

## Effect

- **Scope.** Only K14-R2-01 and K14-R2-02. [Design 04](design-04.md) answers
  [brief 03](https://github.com/ArrokothI/arrokothi/blob/b655733b9b90810eca747c61b8f2095f5f201341/docs/development/work/K1.4/review-02/brief-03.md)'s
  four questions, then a new design check, bounded to those two findings and the corrections they require.
- **Fallback.** If review 03 finds a third CHANGES REQUIRED in this same subsystem, the route becomes (d), a
  recorded limit, not another patch round.
- **Unchanged.** Owner choice 04 stays in force. Kernel source and `packages/core/src` stay unchanged.
- **Not decided here:** the packet's acceptance, and the content of any limit under the fallback.
