# K1.1-correction-03 — owner release 01

Recorded 2026-10-08 by a Claude Code session (`claude-opus-5-5`, desktop Code tab, local checkout) from
the owner's chat messages in that session. This is an administrative release record. It is not a brief
decision, a design check, a review or an acceptance. The owner's words, verbatim:

```text
Let's release K1.1-correction-03! I want the first implementor to be claude opus 5.5, can I use the Claude cloud session to run this?
```

```text
1. Setup everything for cloud session to run, including push/branch if needed.
2. Give me the starting prompt to run the code. I'll select ultracode.
```

## What is released

- **Packet:** K1.1-correction-03, metered value refusal cost, with the scope and acceptance in its
  [007 section](../../007-work-packets.md#k11-correction-03--metered-value-refusal-cost), including the
  2026-10-02 owner amendment ([DESIGN-AUDIT-01 decision-01](../DESIGN-AUDIT-01/decision-01.md) item 3).
- **First implementer:** a Claude Code cloud session (Anthropic-hosted VM) on `claude-opus-5-5`, chosen
  by the owner. The implementation report records the actual session, model and access, as 006 requires.
- **Base B:** integrated `main` at `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b` (merge of PR #46, the
  TOOLS-01 integration receipt).
- **Branch:** `claude/k1.1-correction-03`. This release record, [brief 01](brief-01.md) and the 007
  release lines are the branch's first, administrative commit. The candidate's C and H follow it.

## Prerequisites, resolved

| Dependency (007) | State |
|---|---|
| [Decision-05](../K1.2/decision-05.md) | Owner-adopted 2026-09-28 |
| DESIGN-AUDIT-01 threat-model outcome | Settled by [owner decision-01](../DESIGN-AUDIT-01/decision-01.md), 2026-10-02 (CORE adopted, every Proxy refused) |
| K1.2-correction-01 | Accepted at H `b7191dbf630defeff7756122a6798e15d0b73dd3`; integrated at `ed509e11dc39ff24e10c1ace68189776c4270919` (PR #38) |
| TOOLS-01 | Accepted at H `a50c38867c93c63094f271d099cec71624382577`; integrated at `8f82900337e38dfdb93026b04de2066df75b175c` (PR #45); [receipt](../TOOLS-01/integration-01.md) |

TOOLS-01's receipt records `next_release: none` and says this packet still needs an owner release. The
owner message above supplies it, for this packet only. The receipt stays unchanged.

## Not released or decided here

- No other packet. TOOLS-02, BINDING-01, COORD-REFACTOR-01 and K1.3 stay unreleased.
- No hold is lifted. [Invalidation-02](../K1.2/invalidation-02.md)'s V-D1 hold and
  [invalidation-01](../DESIGN-AUDIT-01/invalidation-01.md)'s classification hold are released only by this
  packet's independent acceptance. [Invalidation-03](../DESIGN-AUDIT-01/invalidation-03.md)'s V-ENV hold
  stays with BINDING-01.
- No design check is pre-approved. The packet changes Kernel semantics, so 006 requires a design check
  before code. The owner names the design checker and the independent reviewer.
- The brief was written by the same session that records this release. The owner may edit it before
  forwarding. No semantic decision beyond the records it links is made by it.
