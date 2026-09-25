# Activation → Runtime attempt → Outcome acceptance

An [Activation](../concepts/core.md#activation) fixes the input for one exchange. A [Runtime attempt](../concepts/identity.md#runtime-attempt) performs it. An [Outcome](../concepts/core.md#outcome) proposes the next accepted state. This page owns dispatch and acceptance; [waits](waits.md) owns input selection.

**Status:** Required Kernel contract. Introduced by K1.1–K1.2; Effect intents by K2.1. This is target specification, not shipped behavior.

## A first example

Before the protocol details: the application creates Execution E for a weekly report. The Kernel sends Activation A1, writer epoch 1, base progress revision 0. The Runtime drafts the report and returns an Outcome proposing progress 1 and `await` for the editor's correction. The Kernel accepts progress, the wait registration and the next state together, as one decision. When the correction later arrives as an Event, the Kernel dispatches Activation A2 carrying it, still under epoch 1. The sections below cover retries, takeover and the exact validation order; the [worked trace](#worked-trace) extends this same scenario with a lost reply and an epoch takeover.

## Before sending

As one decision, the Kernel atomically reserves the exact Event [batch](../concepts/core.md#batch-reservation-and-acknowledgment) and records: [dispatch intent](../concepts/identity.md#dispatch-and-delivery), the current [writer epoch](../concepts/identity.md#writer-epoch), accepted [progress](../concepts/state.md#progress) and base revision, the progress [codec](../concepts/values.md#codec), pinned Runtime/[Definition](../concepts/core.md#definition) revisions, and the supplied authorized [execution view](../concepts/roles.md#view-and-disclosure). It also establishes the current Runtime attempt and its Outcome-submission authority: the writer epoch that may commit, and the unforgeable attempt-bound authority the Driver must present back with the Outcome. This makes the Execution `RUNNING`. The accepted intent is reconstructible even if notification is lost. Recording all of this before sending is what makes a crash between "decided to dispatch" and "the Runtime heard about it" recoverable: on restart the Kernel finds a pinned exchange it can redeliver unchanged, rather than having to guess which Events it had meant to hand over.

Sending proceeds through the [Driver](../concepts/core.md#execution-driver) without synchronously waiting for native work in the coordinator loop. The Kernel hands the Driver the Activation together with the current attempt's Outcome-submission authority; the Driver presents that authority back when the Runtime answers. The Driver may call a local function or submit a remote job. Dispatch acknowledgment, heartbeat, cancellation signals and diagnostic streaming are operational traffic, not extra progress-writing Outcomes.

Conceptual data shape (not a frozen wire schema):

```text
Activation: execution_id, activation_id, writer_epoch, base_progress_revision,
            runtime_contract_revision, definition_revision, progress codec,
            accepted_progress, events[], permitted execution view, optional limits
Outcome:    execution_id, activation_id, writer_epoch, base_progress_revision,
            progress, emissions[], effects[], next
next:       continue | await(wait) | complete(result) | fail(error)
```

A fresh Outcome must also present the current attempt's submission authority alongside its envelope. Inspected Activation coordinates alone authorize nothing; the acceptance section below owns that check and its order.

## Delivery reporting boundary

Between "the Kernel handed an Activation to the Driver" and "the Runtime answered with an Outcome" there is one small fact the Kernel still needs: did the hand-off itself succeed? This section defines how the Driver reports that one fact and nothing else. The design question it settles is whether the Driver should report by returning a Promise the Kernel then observes; the answer is no, because a returned Promise blurs "I delivered it" with "the work finished", and lets a Driver's unhandled rejection become the Kernel's problem. The rules below are exact because the in-process binding cannot rely on a network boundary to keep the two sides apart.

**Introduced by:** K1.1-correction-01; extended for K1.2 by the 2026-09-25 owner decision ([decision-01](../../docs/development/work/K1.2/decision-01.md)), which alone authorizes the third delivery argument. Implementation status belongs to the [status ledger](../../docs/development/007-work-packets.md); this page states the contract. Nothing here establishes persistence, native fidelity or isolation.

The Kernel owns delivery-attempt evidence and the current attempt's Outcome-submission authority. The Driver owns its asynchronous work and handles its internal Promise rejections. For the in-process TypeScript binding, delivery uses two Kernel-supplied capabilities and returns only `undefined`:

```ts
interface DeliverySettlement {
  delivered(): void;
  failed(reason: unknown): void;
}
// SubmissionGrant is an opaque unforgeable reference to the current Runtime attempt,
// supplied by the Kernel and required back with a fresh Outcome. Its in-process shape
// is recorded in BASELINE; it fixes no wire format, serialized token, or remote credential.
// No Outcome or Promise is returned through this call.
deliver(activation: Activation, settlement: DeliverySettlement, submission: SubmissionGrant): undefined;
```

The settlement capability reports one physical delivery; the submission authority answers one Runtime attempt. They are independent powers with different lifetimes, stated below. All other KC1-ARCH-1 guarantees stand unchanged.

`undefined` is intentional: TypeScript's `void` return assignability alone does not exclude an async implementation. A conforming Driver returns promptly and explicitly reports delivery, either during the call or later. Returning normally is not a delivery acknowledgment. No report leaves that delivery attempt `pending`; it neither blocks another Execution nor creates a Kernel-visible wait. CPU preemption remains a deployment concern. Remote Drivers translate authenticated operational reports to these local capabilities; neither capability is a serialized callback, a new wire protocol, or a universal token.

The Kernel records the attempt before invoking the Driver. It supplies a fresh, immutable per-delivery reporting capability bound to that exact physical delivery, and separately supplies the current attempt's submission authority. The reporting capability's methods work without a receiver and expose no mutable Kernel record. Each method returns normally with no Promise. The first report wins: `pending` becomes `delivered` or `failed` once. A synchronous invocation throw is an implicit failure report through the same first-report rule. Thus a report followed by a throw retains the report; a throw followed by a late report retains the failure. Repeated or contradictory calls are inert, including calls reentering during diagnostics. Claim the attempt before inspecting a reason. Diagnostic handling must be total and must not execute caller-owned getters, coercions or thenables; retain at most the first 1,024 UTF-16 code units of a primitive string reason, or the fixed text `Driver delivery failed` for any other value. Use captured string operations, and retain no caller-owned error object. This is an operational diagnostic limit, independent of canonical boundary-value limits.

Ordinary redelivery supplies a fresh per-delivery reporting capability for the new physical delivery while preserving the exact Activation, the writer epoch, and the same Outcome-submission authority. A late report can settle only its original retained pending attempt, even after a newer delivery attempt reports; it cannot overwrite that newer attempt. After exchange resolution, cancellation or takeover, a report may only update that original retained operational record, never the current exchange or logical state. If its record has been retired, the capability is inert and cannot recreate it. These latter lifecycle interactions belong to K1.2/K1.3 and retention to K5; this rule does not bring those implementations into K1.1.

Reporting or throwing changes no dispatch receipt, accepted progress/revision, writer epoch, submission authority, reservation, acknowledgment, mailbox disposition or Execution lifecycle. `delivered` reports the Driver's delivery acknowledgment, not native completion or Outcome acceptance. `failed` does not prove that native work never started and does not authorize repeating it. Outcome acceptance and safe native retry retain their separate owners.

The Kernel does not read, classify, assimilate or subscribe to the return value of `deliver`, even if a nonconforming Driver returns an object. It creates no Promise for reporting and does not sanitize Promise constructor/species state to invoke the Driver. There is no Promise-return compatibility path. Drivers must handle rejections of every Promise they create or use, including asynchronous reporting work. Returning an already unhandled Promise violates this authoring contract; ignoring its return does not make that Promise handled. The Kernel guarantees no unhandled rejection from its delivery reporting mechanism for conforming Drivers, not process survival against arbitrary same-process Driver code. Physical containment remains a deployment guarantee.

## Retry versus takeover

Three operations look the same from outside — the Runtime is asked to work on something again — and they differ only in which identities they keep. Read the table as a statement about what a late answer can still be recognized as. **Ordinary delivery retry** changes nothing, so a reply produced by the first send is still a valid reply to the current exchange. **Authorized takeover** keeps the question and replaces who may answer it, so the earlier attempt's answer is now stale and is rejected in full even if its content is correct. **A new exchange** replaces the question itself, so nothing computed against the old one applies.

Conflating the first two removes the fence that stops a disconnected attempt from overwriting the work of the attempt that replaced it. Conflating either with the third lets fresh input be slipped into an exchange whose answer was already computed from different input, so an accepted Outcome would no longer correspond to any fixed question.

| Operation | Activation ID | Writer epoch | Pinned semantic input |
|---|---|---|---|
| Ordinary delivery retry | Same | Same | Same |
| Authorized takeover | Same | Advances | Same |
| Next exchange after resolution | New | Implementation chooses starting epoch | Newly selected |

Each operation also decides two independent capabilities. Ordinary delivery retry keeps the Activation, the writer epoch, and the same Outcome-submission authority, and receives a fresh per-delivery reporting capability. Authorized takeover keeps the Activation ID and the pinned input, advances the writer epoch, replaces the Outcome-submission authority, and receives a fresh per-delivery reporting capability. The next exchange mints a new Activation according to the existing rules, with a new attempt and its own submission authority under the implementation's recorded starting epoch. A submission capability therefore never has a per-delivery lifetime, and a per-delivery report never carries proposal power.

Retrying delivery is not permission to repeat native work. [Recovery](recovery.md) establishes phase-specific permission before takeover/replay. New mailbox arrivals cannot replace the batch under an existing Activation ID. If fresh policy forbids redisclosing the pinned view, hold/refuse or explicitly abandon the exchange; do not silently sanitize it and call it identical replay.

## Outcome acceptance

The Outcome is a proposal until this procedure accepts it. The order matters: authentication comes before anything is read so an unauthenticated caller learns nothing; the duplicate lookup comes before fresh validation so a retried Outcome gets the same answer it got the first time even if policy has since changed; exchange currency is decided before submission authority so a stale proposal is refused as stale rather than unauthorized; submission authority is decided before content so only the current attempt still needs to prove it may answer; and the commit is a single atomic step so no observer can ever see acknowledged Events without the progress that accounted for them, or progress without the intents it proposed.

Perform these steps in order:

1. Authenticate and scope access to the Execution before inspecting or disclosing content. Visibility is necessary but insufficient for a fresh proposal: the submission authority below never substitutes for scope, and explicit controls need the separate control power owned by [authority](authority.md) and [evidence](evidence.md).
2. Look for an already accepted matching Outcome. An exact duplicate returns its original [receipt](../concepts/identity.md#acceptance-boundary-and-receipt) without repeating any mutation or publication, and without requiring submission authority. Different content under the accepted identity conflicts. This lookup precedes all fresh validation, including exchange currency, submission authority, content, later policy changes, and cancellation.
3. For a new proposal, validate the whole envelope in this order: terminal state, current Activation, writer epoch, and base progress revision; then the current attempt's submission authority; then bounded values, unique proposal/emission keys, supported next step, wait references and completion obligations. A proposal that no longer answers the current exchange keeps its stale-exchange vocabulary, so takeover fencing is unchanged: only a current-yet-grant-less proposal is refused for lacking submission authority. Authority is the unforgeable attempt-bound capability supplied with the Activation, compared by identity and never by inspected fields, and never exposed through inspection. Bind any same-Outcome [Effect](../concepts/actions.md#effect) reference by its local proposal key.
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
| 4 | The submitter loses the response. Its exact Outcome retry returns the original receipt; it creates no second intent to publish the report. |
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
