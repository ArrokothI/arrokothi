# P02 builder notes — genuine SDK/DX friction

Recorded per the builder guide. Ergonomics observations, not requests to change kernel semantics.
P01's notes 1, 2, and 4 (the five-part Structured Memory chain with no single failure signal; the
hand-rolled multi-turn settle loop; `GeminiModelProviderOptions` carrying no `model`) all recurred
here unchanged and are not repeated.

## 1. Authoritative argument sourcing has no first-class home

The product rule "send the committed lead, not whatever the model attached to the call" has three
plausible seats and none is comfortable:

- the **capability executor** is given no memory handle by design, so it cannot read the record;
- a **Function Stage** has no memory handle either, and this is an Agent, not a Workflow;
- so it landed in the **`EffectAuthorizer`**, which the guide sanctions as "a gate the host wired",
  and which may be async — it reads `Harness.structuredMemoryOf`, checks eligibility, and calls
  `email.setPendingLead(lead)` as a side effect before returning `allow`.

That works, but an authorizer performing a staging side-effect reads as a smell, and the operation
input schema ends up near-empty (`{ analysis }` only) purely to stop the model from supplying lead
fields that would be ignored anyway. A declared "source this argument from memory key X" policy on
the operation — the shape the *legacy* `defineAgent` had as `argumentPolicies` — would express this
directly. Classification: ergonomics / possible reference-layer addition. Tracked area:
`future-plan.md` §14.

## 2. "Submit once" needs belt and braces, and the runtime layer is the weaker one

`EffectIdempotencyScope: "per_input"` only suppresses a *byte-identical* repeat
(capability+operation+input). A second `lead.submit` with a different `analysis` string is a
different payload and is not suppressed. So the real single-delivery guarantee here is (a) the
transport settling once and replaying its outcome, and (b) the authorizer denying once
`email.hasSettled()`. The forced `per_input` scope on the grant is genuine defence-in-depth but is
not the thing doing the work. This matches guide §4.3 ("use (1) *and* implement (2)"), but a builder
who reads only "idempotency scope" on the `UseCapability` proposal will over-trust it.
Classification: documented design constraint; the guide already says this, worth a louder example.

## 3. No confirmation step, deliberately — and the surface makes that feel underspecified

The historical app auto-sends after collecting contact preference and time; there is no human
approver in the benchmark protocol (it is stdin turns). So the handoff is gated by authority +
validated state + idempotency and **not** by `ConfirmationPolicy`. That is the right call, but the
authority page frames confirmation as the standard consequential-action gate, and it took a
deliberate read of §5.4 (approval fatigue) to be confident that "authority gate, no confirmation"
is a first-class answer rather than a missing piece. Classification: documentation emphasis.

## 4. `maxOperationCallsPerStep` silently caps a multi-write turn

A turn that records five freshly supplied lead fields in one model step needs the model to emit
five `memory_write_*` calls in one step. With the P01-style default of `3` not all of them were
dispatched and no error reached the runner — the symptom was an incomplete lead record a couple of
turns later. Raising `maxOperationCallsPerStep` to 8 fixed the silent-drop case, but "the step
exceeded the per-step call budget" deserves to reach the journal or the turn result the way a
rejected memory write does.

A later scenario (P02-V2-S17) then showed the other failure mode of the same ceiling: an opening
turn that supplies intent, location, budget, timeline, financing, first name, last name and phone
at once is 8 `memory_write` calls plus one `properties.search` — 9 actions in one step — and the
reference executor *hard-fails* that step with `agent_action_fanout_exceeded` rather than dropping
a call. Raised to 10 (9 real actions + one slot of slack). No kernel/semantic change; this is an
application authority budget on one benchmark example.
Classification: ergonomics / observability.
