# COORD-REFACTOR-01 — owner choice 01: atomic decisions on engine-fault paths

**Record type:** owner decision. It answers [design check](design-01-check.md) D01-CHK-1 (design 01,
question 5). Recorded on 2026-10-22 by the owner's Claude Code desktop session (`claude-opus-5-5`), the
planning session. The owner's words, verbatim:

```text
Approve the atomic fault behaviour as an owner exception, bounded by fault-injection tests. Record it and give me the paste-ready message for the implementer.
```

## The exception

CR1-3 ("behaviour is identical") is amended for these engine-fault paths only. An engine fault is a throw
while a decision or report is being built, before the owner applies it. Fault-free behaviour stays
identical.

| Path | Today | After the refactor |
|---|---|---|
| `dispatch`, `submitInput` | The acceptance index and `activationsMinted` advance before the decision is built. A construction fault consumes a receipt position and an Activation ID with no decision behind it, so later positions and IDs shift. | Nothing changes until the commit. A faulting build consumes nothing. |
| Delivery report `failed(reason)` | The row is marked failed, then the reason is bounded. A fault while bounding leaves the row failed. | The faulting report changes nothing. The row stays pending, and a later report can settle it. |
| Every other settlement plan, including `delivered()` | The success path is a plain status write. | A plan is built first. A fault while building it changes nothing. |

**Why:** a decision that faults while it is being built commits nothing. That follows the atomic-decision
rule in [execution cycle](../../../../mental-model/mechanisms/execution-cycle.md). Today's partial
effects are a latent deviation, not a contract. Keeping them would need an extra pre-build step in
every operation, against the plan/apply shape that K1.3 builds on.

## Bounds

- **Each row above gets a fault-injection test.** The test faults the build at a chosen point, then pins
  three things: the old outcome, documented as the historical behaviour; the new outcome; and that state,
  receipts, IDs and the next decision equal those of a run without the faulting call.
- **No other path changes.** Any further behaviour difference found during the build, fault-only or not,
  stops for the owner.
- **The oracle is not edited.** The complete-decision oracle, the sweeps and their expectations do not
  change. The new tests sit beside them.
- **Layer 3:** if a current page describes the old partial effect, the candidate corrects it. BASELINE
  states the exception.
