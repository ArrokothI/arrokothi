# P01 builder notes — genuine SDK/DX friction

Recorded per the builder guide. These are ergonomics observations, not requests to change kernel
semantics.

## 1. Structured Memory wiring is a five-part chain with no single failure signal

Getting the model to see and write three fields required, in concert: the `createExecution`
`structuredMemory` binding, `spec.structuredMemory.read/write` keys, `structuredMemoryReadView` and
`structuredMemoryWriteView` resolvers on the controller, **and** an `authorizer` `memory` grant.
Omitting any one produces the same silent outcome (no memory in context / no write action), with
nothing logged to say which link failed. `current-authoring-surface.md` §3 documents this well, but
during assembly a "resolver configured but authorizer grant missing" diagnostic would have saved a
debugging pass. Classification: ergonomics / observability.

## 2. Multi-turn Agent orchestration is host-assembled with a hand-rolled settle loop

There is no stock "run one conversational turn" helper. The subject drains
`runUntilIdle` + `drainResumptions` in a bounded loop and treats
`WAITING` + `waitingFor.kind === "event"` as "turn done". This is the documented shape, but every
multi-turn subject will re-implement the same loop and the same newest-text-emission extraction.
An optional `@arrokothi/core/reference` conversational-turn helper would remove a recurring source
of subtle bugs (off-by-one on emission indexing, drain-round ceilings). Classification: ergonomics /
possible reference-layer addition. Tracked area: `future-plan.md` §14.1.

## 3. The deterministic calculation cannot read committed memory directly

Per the guide, a `CapabilityExecutor` gets no memory handle, so `hempcrete.estimate_volume` receives
`area_sq_ft` / `thickness_in` as model-supplied input rather than reading the committed fields
itself. The model takes those values from its authorized read snapshot, so they are the current
committed values in practice, but the arithmetic's inputs are one model hop away from the source of
record. A fully host-side calculation (host reads `structuredMemoryOf`, computes, delivers the
number as `external.input`) would close that gap but needs the host to also own turn segmentation.
For P01 the capability path is the better cost/benefit; noting the seam. Classification: documented
design constraint, not a gap.

## 4. `maxOperationCallsPerStep` must cover writes + capability calls in one step

A fully-specified opening turn ("300 sq ft exterior wall, 3-inch interior layer, what volume?")
needs the model to emit three `memory_write` calls (context, area, thickness) **and** the single
`hempcrete.estimate_volume` call in one step — 4 actions. The initial ceiling of `3` made the
reference agent executor hard-fail that step with `agent_action_fanout_exceeded`, aborting the
scenario. Raised to `5` (4 real actions + one slot of slack). Unlike the silent truncation P02 hit
(§4 of `p02/BUILDER_NOTES.md`), this one *did* surface as a step failure that reached the runner, so
the observability is better here; the ergonomic point is that the per-step ceiling has to be sized
against `|memory writes| + |capability calls|` for the busiest single turn, not just the number of
distinct operations. Classification: ergonomics / example-coverage.

## 5. `GeminiModelProviderOptions` has no `model` field

The concrete model name is only carried through the `StaticModelResolver` mapping and reaches the
provider per-request. Passing `model` to `createGeminiModelProviderFromEnv` is a type error. This is
consistent with "the definition names a logical model", but the benchmark protocol hands us a
concrete model string and the natural instinct is to give it to the provider constructor.
Classification: minor documentation / example-coverage.
