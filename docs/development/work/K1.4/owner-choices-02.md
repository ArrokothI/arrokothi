# K1.4 — owner choices 02: answers to design check 01 and attack 01

**Record type:** owner decision. It answers the owner questions that [design check 01](https://github.com/ArrokothI/arrokothi/blob/5f18c44c6e086d68311862cc95f1417a9c1f17de/docs/development/work/K1.4/design-check-01.md)
(`5f18c44c6e086d68311862cc95f1417a9c1f17de`, on `claude/k1.4-design-check`) raises about [design 01](design-01.md),
including the ones [attack 01](https://github.com/ArrokothI/arrokothi/blob/cffb2c81244f7f0955e9b20d30fac70e8a1e1e5d/docs/development/work/K1.4/attack-01.md) (`cffb2c81244f7f0955e9b20d30fac70e8a1e1e5d`, on `claude/k1.4-attack`)
routes to the check. Recorded on 2026-11-06 by the K1.4 implementer's Claude Code desktop session
(`claude-opus-5-5`), at the owner's instruction. The owner's answer, verbatim:

```text
Accept all
```

The owner's message spelled out four decisions, A to D below. "Accept all" also adopts design check 01's required
changes D01-CHK-01 to D01-CHK-14 as the check states them. [Design 02](design-02.md) disposes each one.

## Choices

| ID | Check item | Choice |
|---|---|---|
| A | D01-CHK-11 | **Option (a).** `start` creates the native root synchronously, after the Kernel accepts creation and before `start` returns. A native creation error cancels E. An exact `start` replay returns the existing E and must not fail or cancel it. |
| B | D01-CHK-13 | **The listed breaking changes are accepted, with two adjustments.** `runtime.maxActivationsPerRun` becomes **PD**: it is accepted and ignored, and preflight warns. The **N** disposition reads "preserved on `@arrokothi/core`, not routed through the Kernel". The other changes are accepted as listed: `runtime.scheduler` refused, `ownerExecutionId` refused, `start` errors moving to a failed Execution (S-START-REJECT), and `Application.harness` narrowed to `LegacyHarnessView`. This amends brief decision 3 ("No 0.9 breaking removal in K1.4") for exactly these items. |
| C | D01-CHK-05, D01-CHK-14, design 01 §15 | **The proposed 017 entries are approved.** Design 02 §4 lists them. They are added to the register in the build. |
| D | D01-CHK-14 PUB-01 | **`@arrokothi/sdk` gets `"private": true` in K1.4.** A release packet removes it. |

## Effect on the process

- Design 02 is a short delta to design 01. It disposes D01-CHK-01 to D01-CHK-14 one by one and adds the attack 01
  and design check 01 corpus to design 01 §13, with provenance. It brings no other branch content into
  `claude/k1.4`. The attack and check records stay on their own branches, and K1.4 records link to them at their
  pinned commits.
- Design check 01 says these changes stay inside the approved shape, so no new full design check runs. The
  independent review checks design 02 against design check 01 (006 "Routine corrections").
- The build starts with range A after design 02 is pushed. Packet verify runs in CI on the first C.
- Not decided here: the packet's acceptance, the SDK's publication, or K1.4-gate.
