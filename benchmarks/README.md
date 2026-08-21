# Preserved benchmark history — P01 / Craig and P02 / EstatePro

Historical adapters that run this SDK against the same scripted user turns as the frozen P01/P02 benchmarks,
project its state into the **canonical benchmark field names**, and grade with faithfully ported
assertions.

The v0.35 task rebuilds the standalone Agent_SDK P01/P02 applications; it does not produce or claim
a new comparison against original or other-builder implementations. These adapters and prior
machine-readable results are retained only so experiment history is not erased.

## What was and was not taken from the existing benchmark artifacts

**Used** (neutral evaluation contract):

- the scripted user turns, verbatim;
- the assertion semantics and detector behaviour, including the detector fixes recorded there
  (range-aware volume parsing, hurd/woody-core synonyms, the tightened jurisdiction hedge, grounding
  by price *or* title, the broadened no-match phrasing, passing the user's own budget so their
  restated figure is never scored as fabricated);
- the canonical field names (`wall_area_sq_ft`, `wall_thickness_in`, `intent`, `budget`, …);
- the grading contract: hard beats soft, unjudgeable is reported rather than guessed, a run no model
  answered is `inconclusive`;
- the normalized requirement registers (CR-xx, EST-xx) and the product's own published facts;
- the recorded source conflicts, carried over rather than quietly resolved (see CRAIG-S02).

**Not used**: any Agenerateor runtime code, configuration, prompt, or bespoke implementation. The
standalone Agent_SDK definitions live in `examples/p01-craig` and `examples/p02-estate`; benchmark
files are thin projections over those same artifacts. Existing results are retained as history.

## Modes

```bash
node --experimental-strip-types benchmarks/p01-craig/run.ts          # adapter self-check
GEMINI_API_KEY=... node --experimental-strip-types benchmarks/p01-craig/run.ts --live
```

| Mode | What it is | What it establishes |
| --- | --- | --- |
| `harness_selfcheck` (default) | No model is consulted. | The adapter works: scenarios load, state projects into canonical names, tool events are captured, every assertion executes. Every scenario grades `inconclusive`, because that is the correct grade for a run no model answered. **Not a measurement.** |
| `live` (`--live`) | A real provider answers every turn. | A measurement, comparable to the stored results. Requires a key; the runner refuses `--live` without one rather than silently degrading. |

`benchmarks/adapter.test.ts` covers what a self-check cannot: that the projections map onto the
canonical names with known inputs, that the deterministic volume tool reproduces the product's own
published figures, and that the ported detectors behave as specified.

Every historical scenario result also records legacy efficiency/routing metrics: planner model calls, response
model calls, total model calls, retrieval-request count, selected logical knowledge sources,
retrieved document chunks, and tool calls. Self-check metrics exercise the instrumentation but are
not a quality or cost measurement; live-mode metrics describe the actual provider run.

## Safety

No real email is ever delivered, in any mode. The handoff transport is injected per scenario and
only records the payload it was handed, so "the corrected budget reached the action" is a checkable
fact rather than an inference from the reply text. Everything before that final hop — extraction,
action eligibility, confirmation, payload construction, the action result, and the post-action
behaviour — is real.

## What each project stresses

**P01 / Craig**

- front-loaded facts and out-of-order facts (S01, S07);
- corrections, including one that must survive a long conversation (S08, S19);
- **the volume formula as a deterministic tool**, not prose arithmetic — `compute_wall_volume`
  computes it, the result is an authoritative fact in the event stream, and the model reports it.
  This is the direct answer to the recorded GAP-001 ("the model can answer correctly from knowledge,
  but the result has no deterministic runtime home");
- formula-backed answer quality (`vol_*` assertions, ±0.05 m³ = half the product's own display
  precision);
- safety facts under adversarial pressure (S12, S21);
- the SKU/pricing/transaction boundaries (S14, S15, S16);
- invalid dimensions, refused by a schema bound **and** by the tool (S22).

**P02 / EstatePro**

- front-loaded buy/rent/sell facts (S01, S02, S03, S07);
- buy→sell change of mind, with a deterministic pre-response phase transition (S09);
- optional email declined and not re-demanded (S10, S19);
- grounded property records, no invented listings (S01, S13);
- **deterministic record filtering** for budget/location via the `listings` record Knowledge
  capability (S01, S14);
- truthful no-match (S14);
- handoff success and failure (S19, S16);
- duplicate prevention via `once_per_session` idempotency (S17);
- corrected payload reaching the action (S16);
- **the GAP-005 adversarial confirmation regression** (S20).

## Historical comparison utility (not part of v0.35)

```bash
node --experimental-strip-types benchmarks/shared/compare.ts \
  --sdk=p02-estate-live.json \
  --baseline=/path/to/tests/benchmarks/real-agents/estate/results-controlled.json
```

This command is documented only to preserve the old experiment workflow. The baseline file is read
**read-only**; nothing is written back to it. Two rules keep the
comparison honest: a `harness_selfcheck` run is refused outright, and only assertions judged on
*both* sides are counted — an assertion one side structurally cannot have is never a win for the
other.

## Deliberate deviations from the stored runs

- **CRAIG-S17** (provider failure mid-turn) is not scripted here. This SDK's degradation path is
  covered directly by a core test (`core/tests/runtime.test.ts`), where the failure can be injected
  precisely rather than hoped for.
- **CRAIG-S18** (microphone permission) is excluded, as in the canonical artifact: no voice
  requirement exists in the source documents, and it is a browser-permission path, not an agent
  property.
- **ESTATE-S16**'s failure-path assertions are fully executable here. The stored run had to grade
  them N/A because its handoff was a hardcoded always-succeed dry run; here the transport is
  injected, so the failure path is real. This makes this side *more* strictly graded, not less.
- **ESTATE-S20** is new: a direct regression for GAP-005.
- **ESTATE-S16/S17/S19** drop the stored runs' separate "text me at 3pm" turn where it only existed
  to pad the script; the confirmation turn is retained verbatim.
