# K1.4-candidate owner choice 06 — judge the settlement callbacks too

Recorded 2026-11-20 by the K1.4-candidate coding agent (Claude Code desktop, `claude-opus-5-5`). The owner's
words are quoted verbatim.

## Context

[Design 04](design-04.md) at `06e60dd81921946094a6f2323ec8831d61308320` claimed that the laboratory records every
call into the Kernel by recording the coordinator's public methods.
[Design check 04](https://github.com/ArrokothI/arrokothi/blob/99d411e00049ae87b781a7c1e1008161409ec983/docs/development/work/K1.4-candidate/design-check-04.md)
(Codex GPT-6, `codex/k1.4-candidate-design-check-04` at `99d411e00049ae87b781a7c1e1008161409ec983`) is NOT APPROVED
of that design, with D04-CHK-01..03. D04-CHK-02 found that the Driver's settlement reports reach the Kernel through
closures that are not coordinator methods, so the recorder cannot see them. The check asked the owner whether the
oracle should judge those callbacks or accept a coordinator-method-only limit, and recorded the answer. It is read by
commit and not merged here.

## Choice

The owner's answer, verbatim, as design check 04 records it:

```text
Judge settlement callbacks too (recommended)
```

The owner's message that started round 5, verbatim:

```text
Design check 04 (Codex GPT-6, codex/k1.4-candidate-design-check-04 at
99d411e00049ae87b781a7c1e1008161409ec983) is NOT APPROVED of design 04 at 06e60dd8: D04-CHK-01..03 (all P2,
test-side). Read it by commit; merge nothing. It records owner choice 06 verbatim: "Judge settlement
callbacks too (recommended)". Record that as owner-choice-06.md, citing the check commit.

Design only this round. Write design-05.md, superseding the parts of design 04 the check rejects, keeping
the rest:
- CHK-01: decide from the recorded answer whether a normal Observation is allowed (the finite list of
  unprojectable answers), with its step, precedence and code. Include the swallowed-refusal trace with an
  accepted-dispatch neighbor, plus a control per answer class.
- CHK-02: record the Driver's settlement reports inside the laboratory's constructor seam, attributed to
  their delivery and enclosing command in true nested order. Judge missing, extra, wrong-method and
  wrong-delivery reports with honest neighbors. Define what `calls` counts. Attribute grant evidence to
  ABL-2 and the latest-grant witness, call the structure test a regression guard, and drop the
  exclusive-route claim.
- CHK-03: publish the exact 30-command schedule, the fault placements and the declared row/slot sets.
  Fix the insertion and target domains and recompute counts from the declaration. Add isolated controls
  for writerEpoch, each of the five copied fields and fireTimer's kind and targets. Define the policy
  after a failed record. Expected codes are assigned before the oracle runs.
- Fix the L-39 wording per the check: a timeout keeps the string actually assigned, fallback included.
Keep it compact: tables, not prose. If any item needs a change outside the test-side lab, oracle, tests
and claims, stop and ask me. Push design 05 and give me its commit. No code, no C/H.
```

## Consequences

1. **The oracle judges the Driver's settlement reports** as well as the coordinator calls. A coordinator-only limit
   is not the selected solution. This settles the choice brief 04 R04-3 and design 04 §6 left open.
2. **Scope stays test-side.** The choice does not approve design 04's recorder, waive a finding, broaden production
   scope or authorize a change to the Kernel, the fake Driver's intended behavior, the adapter, the fixture or the
   packet tools.
3. **Lifecycle.** [Design 05](design-05.md) disposes D04-CHK-01..03 and goes to a new design check before any code.
   [Owner choice 07](owner-choice-07.md) sets what happens if that check does not approve it.
