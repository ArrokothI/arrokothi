# Activation → Runtime attempt → Outcome acceptance

An [Activation](../concepts/core.md#activation) fixes the input for one exchange. A [Runtime attempt](../concepts/identity.md#runtime-attempt) performs it. An [Outcome](../concepts/core.md#outcome) proposes the next accepted state. This page owns dispatch and acceptance; [waits](waits.md) owns input selection.

**Status:** Required Kernel contract. Introduced by K1.1–K1.2; Effect intents by K2.1. This is target specification, not shipped behavior.

## A first example

Before the protocol details: the application creates Execution E for a weekly report. The Kernel sends Activation A1, writer epoch 1, base progress revision 0. The Runtime drafts the report and returns an Outcome proposing progress 1 and `await` for the editor's correction. The Kernel accepts progress, the wait registration and the next state together, as one decision. When the correction later arrives as an Event, the Kernel dispatches Activation A2 carrying it, still under epoch 1. The sections below cover retries, takeover and the exact validation order; the [worked trace](#worked-trace) extends this same scenario with a lost reply and an epoch takeover.

## Before sending

As one decision, the Kernel atomically reserves the exact Event [batch](../concepts/core.md#batch-reservation-and-acknowledgment) and records: [dispatch intent](../concepts/identity.md#dispatch-and-delivery), the current [writer epoch](../concepts/identity.md#writer-epoch), accepted [progress](../concepts/state.md#progress) and base revision, the progress [codec](../concepts/values.md#codec), pinned Runtime/[Definition](../concepts/core.md#definition) revisions, and the supplied authorized [execution view](../concepts/roles.md#view-and-disclosure). This makes the Execution `RUNNING`. The accepted intent is reconstructible even if notification is lost.

Sending proceeds through the [Driver](../concepts/core.md#execution-driver) without synchronously waiting for native work in the coordinator loop. The Driver may call a local function or submit a remote job. Dispatch acknowledgment, heartbeat, cancellation signals and diagnostic streaming are operational traffic, not extra progress-writing Outcomes.

Conceptual data shape (not a frozen wire schema):

```text
Activation: execution_id, activation_id, writer_epoch, base_progress_revision,
            runtime_contract_revision, definition_revision, progress codec,
            accepted_progress, events[], permitted execution view, optional limits
Outcome:    execution_id, activation_id, writer_epoch, base_progress_revision,
            progress, emissions[], effects[], next
next:       continue | await(wait) | complete(result) | fail(error)
```

## Delivery reporting boundary

**Introduced by:** K1.1-correction-01, which selected this boundary over Driver-returned Promise observation. Which candidate implements it, what has been independently accepted and what remains to integrate are recorded in the [status ledger](../../docs/development/007-work-packets.md), which owns that question; this page states the contract, not what has shipped. Nothing here establishes Outcome acceptance, persistence, native fidelity or isolation.

The Kernel owns delivery-attempt evidence. The Driver owns its asynchronous work and handles its internal Promise rejections. For the in-process TypeScript binding, delivery uses a Kernel-created reporting capability and returns only `undefined`:

```ts
interface DeliverySettlement {
  delivered(): void;
  failed(reason: unknown): void;
}
// No Outcome or Promise is returned through this call.
deliver(activation: Activation, settlement: DeliverySettlement): undefined;
```

`undefined` is intentional: TypeScript's `void` return assignability alone does not exclude an async implementation. A conforming Driver returns promptly and explicitly reports delivery, either during the call or later. Returning normally is not a delivery acknowledgment. No report leaves that delivery attempt `pending`; it neither blocks another Execution nor creates a Kernel-visible wait. CPU preemption remains a deployment concern. Remote Drivers translate authenticated operational reports to this local capability; it is not a serialized callback or a new wire protocol.

The Kernel records the attempt before invoking the Driver and supplies a fresh, immutable capability bound to that exact attempt. Its methods work without a receiver and expose no mutable Kernel record. Each method returns normally with no Promise. The first report wins: `pending` becomes `delivered` or `failed` once. A synchronous invocation throw is an implicit failure report through the same first-report rule. Thus a report followed by a throw retains the report; a throw followed by a late report retains the failure. Repeated or contradictory calls are inert, including calls reentering during diagnostics. Claim the attempt before inspecting a reason. Diagnostic handling must be total and must not execute caller-owned getters, coercions or thenables; retain at most the first 1,024 UTF-16 code units of a primitive string reason, or the fixed text `Driver delivery failed` for any other value. Use captured string operations, and retain no caller-owned error object. This is an operational diagnostic limit, independent of canonical boundary-value limits.

Ordinary redelivery supplies a new capability for a new delivery attempt while preserving the exact Activation. A late report can settle only its original retained pending attempt, even after a newer delivery attempt reports; it cannot overwrite that newer attempt. After exchange resolution, cancellation or takeover, a report may only update that original retained operational record, never the current exchange or logical state. If its record has been retired, the capability is inert and cannot recreate it. These latter lifecycle interactions belong to K1.2/K1.3 and retention to K5; this rule does not bring those implementations into K1.1.

Reporting or throwing changes no dispatch receipt, accepted progress/revision, writer epoch, reservation, acknowledgment, mailbox disposition or Execution lifecycle. `delivered` reports the Driver's delivery acknowledgment, not native completion or Outcome acceptance. `failed` does not prove that native work never started and does not authorize repeating it. Outcome acceptance and safe native retry retain their separate owners.

The Kernel does not read, classify, assimilate or subscribe to the return value of `deliver`, even if a nonconforming Driver returns an object. It creates no Promise for reporting and does not sanitize Promise constructor/species state to invoke the Driver. There is no Promise-return compatibility path. Drivers must handle rejections of every Promise they create or use, including asynchronous reporting work. Returning an already unhandled Promise violates this authoring contract; ignoring its return does not make that Promise handled. The Kernel guarantees no unhandled rejection from its delivery reporting mechanism for conforming Drivers, not process survival against arbitrary same-process Driver code. Physical containment remains a deployment guarantee.

## Retry versus takeover

| Operation | Activation ID | Writer epoch | Pinned semantic input |
|---|---|---|---|
| Ordinary delivery retry | Same | Same | Same |
| Authorized takeover | Same | Advances | Same |
| Next exchange after resolution | New | Implementation chooses starting epoch | Newly selected |

Retrying delivery is not permission to repeat native work. [Recovery](recovery.md) establishes phase-specific permission before takeover/replay. New mailbox arrivals cannot replace the batch under an existing Activation ID. If fresh policy forbids redisclosing the pinned view, hold/refuse or explicitly abandon the exchange; do not silently sanitize it and call it identical replay.

## Outcome acceptance

Perform these steps in order:

1. Authenticate and scope access to the Execution before inspecting or disclosing content.
2. Look for an already accepted matching Outcome. An exact duplicate returns its original [receipt](../concepts/identity.md#acceptance-boundary-and-receipt) without repeating any mutation or publication. Different content under the accepted identity conflicts. This lookup precedes fresh validation, including after later policy changes or cancellation.
3. For a new proposal, validate the whole envelope: current Activation, writer epoch, base progress revision, cancellation fence/terminal state, bounded values, unique proposal/emission keys, supported next step, wait references and completion obligations. Bind any same-Outcome [Effect](../concepts/actions.md#effect) reference by its local proposal key.
4. Atomically: acknowledge the entire batch; install progress and its accepted revision; record [emissions and output obligations](../concepts/actions.md#emission-result-and-output-obligation), all Effect intents, next state, and any wait/deadline/[readiness](../concepts/core.md#readiness). The validation and commit are ordered against cancellation; a pre-cancel check cannot authorize a post-cancel commit. For `await`, follow the exact internal order in [wait registration](waits.md#registering-a-wait).
5. Return the accepted receipt. Dispatchers and output readers act on accepted records.

An envelope/reference error rejects the whole proposal: no acknowledgment, progress, emission, Effect intent, wait, deadline, readiness or next-state mutation. Record the reason; never silently drop or endlessly retry it. An invalid current Runtime response that cannot be classified instead ends or holds the exchange, under an inspectable protocol-failure/recovery decision. Rejection does not roll back native mutations.

[Cancellation](lifecycle.md#cancellation-order) owns exact replay of a cancellation-losing rejection. It must not be confused with replay of an already accepted Outcome.

When Effects are supported, operation-specific validation or policy denial can later settle an individual accepted intent without discarding the others. **K1 initially supports no Effects:** an Outcome containing one fails whole-envelope validation. No Effect ID, “denied action,” admission or settlement record is created for it.

## Worked trace

The example uses K2 target actions to connect the protocol; it is not a shipped API.

| Step | Accepted fact and consequence |
|---|---|
| 1 | Application retries a lost create response with the same scoped key. Both calls identify Execution E. |
| 2 | Kernel reserves input I for Activation A, progress 0, epoch 1. Driver delivery can repeat without changing those fields. |
| 3 | Runtime proposes draft progress, Effect `publish`, and `await(publish)`. Kernel accepts all intent/progress together at progress 1. |
| 4 | The submitter loses the response. Its exact Outcome retry returns the original receipt; it creates no second publication intent. |
| 5 | Publication is separately admitted. Trusted service evidence is accepted as result Event R with applicable readiness. |
| 6 | Activation B carries R and progress 1. Runtime accounts for R and proposes completion without new Effects. |
| 7 | Kernel accepts the terminal result and output obligation. A UI's later observation does not acknowledge any Event or send a message. |

Change step 3: if epoch 2 takeover was authorized before the old attempt submitted, epoch 1's never-accepted Outcome is rejected **in full**, even if its draft looks correct. Change step 5: if publication may have happened but the receipt is missing, the action is unknown. The Runtime cannot complete merely by acknowledging that uncertainty. The [action mechanism](actions.md) handles reconciliation.

## Atomic decisions across the system

| Decision | Facts committed together | Detailed owner |
|---|---|---|
| Create/input | Identity/content, input, applicable readiness | [Creation](creation.md) |
| Dispatch intent | Pinned exchange, batch reservation and current attempt | This page |
| Outcome | Acknowledgment, progress, output, intents and next state | This page and [wait evaluation](waits.md) |
| Action admission | Current policy/consent decision and attempt intent | [Authority](authority.md) |
| Action settlement | Evidence, action observation, Event and applicable readiness | [Actions](actions.md) |
| Child/message operation | Creation/routing responsibility, correlation, applicable budget | [Communication](communication.md) |

A transaction, journal or mature durable substrate may implement these decisions; check first [what that substrate re-runs on its own](../deployment.md#check-what-a-durable-substrate-retries-on-its-own). Derived queues are allowed; no second source of accepted truth is required. Cross-shard atomicity and exactly-once external effects are not implied.
