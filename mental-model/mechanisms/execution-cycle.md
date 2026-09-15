# Activation → Runtime attempt → Outcome acceptance

An [Activation](../concepts/core.md#activation) fixes the input for one exchange. A [Runtime attempt](../concepts/identity.md#runtime-attempt) performs it. An [Outcome](../concepts/core.md#outcome) proposes the next accepted state. This page owns dispatch and acceptance; [waits](waits.md) owns input selection.

**Status:** Required Kernel contract. Introduced by K1.1–K1.2; Effect intents by K2.1. This is target specification, not shipped behavior.

## A first example

Before the protocol details: the application creates Execution E for a weekly report. The Kernel sends Activation A1, writer epoch 1, base progress revision 0. The Runtime drafts the report and returns an Outcome proposing progress 1 and `await` for the editor's correction. The Kernel accepts progress, the wait registration and the next state together, as one decision. When the correction later arrives as an Event, the Kernel dispatches Activation A2 carrying it, still under epoch 1. The sections below cover retries, takeover and the exact validation order; the [worked trace](#worked-trace) extends this same scenario with a lost reply and an epoch takeover.

## Before sending

As one decision, the Kernel atomically reserves the exact Event batch and records: dispatch intent, the current writer epoch, accepted progress and base revision, the progress codec, pinned Runtime/Definition revisions, and the supplied authorized execution view. This makes the Execution `RUNNING`. The accepted intent is reconstructible even if notification is lost.

Sending proceeds through the Driver without synchronously waiting for native work in the coordinator loop. The Driver may call a local function or submit a remote job. Dispatch acknowledgment, heartbeat, cancellation signals and diagnostic streaming are operational traffic, not extra progress-writing Outcomes.

Conceptual data shape (not a frozen wire schema):

```text
Activation: execution_id, activation_id, writer_epoch, base_progress_revision,
            runtime_contract_revision, definition_revision, progress codec,
            accepted_progress, events[], permitted execution view, optional limits
Outcome:    execution_id, activation_id, writer_epoch, base_progress_revision,
            progress, emissions[], effects[], next
next:       continue | await(wait) | complete(result) | fail(error)
```

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
3. For a new proposal, validate the whole envelope: current Activation, writer epoch, base progress revision, cancellation fence/terminal state, bounded values, unique proposal/emission keys, supported next step, wait references and completion obligations. Bind any same-Outcome Effect reference by its local proposal key.
4. Atomically: acknowledge the entire batch; install progress and its accepted revision; record emissions and output obligations, all Effect intents, next state, and any wait/deadline/readiness. The validation and commit are ordered against cancellation; a pre-cancel check cannot authorize a post-cancel commit. For `await`, follow the exact internal order in [wait registration](waits.md#registering-a-wait).
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
