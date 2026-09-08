# Kernel

The **Kernel** is ArrokothI's execution coordinator. It manages logical Executions and treats the code performing each Execution as a black box behind the Execution protocol.

This document owns Kernel semantics. It does not define how an Agent reasons, how a Workflow traverses a graph, how a provider compacts context, or how an Execution Runtime implements its native checkpoint.

## 1. Kernel responsibilities

The Kernel owns:

- Execution identity and creation;
- accepted input and Event delivery;
- lifecycle and scheduling;
- Activation dispatch and Outcome acceptance;
- authority and exposure for Kernel-mediated actions;
- Effect validation, authorization, consent, dispatch, settlement, and uncertainty;
- parent/child and peer communication;
- deadlines, cancellation, and Kernel-visible waits;
- Execution History;
- durable recovery semantics, stale-writer rejection, and reconciliation;
- governed resource and memory access when applications choose to expose such services.

The Kernel does not own Agent cognition or Workflow orchestration internals.

## 2. Execution record

The Kernel maintains one logical record per Execution. A conceptual record contains:

```text
ExecutionRecord
  execution_id
  definition/runtime_identity
  lifecycle
  progress_revision
  authority
  owner/root relationships
  mailbox
  current_activation? 
  wait_condition?
  terminal_result/failure?
  history references
```

The exact storage layout is not architecture. A database, durable runtime, embedded in-memory store, or other substrate may implement it as long as the semantics remain true.

## 3. Lifecycle

The minimal lifecycle is:

```text
CREATED
  ↓
READY
  ↓ Activation dispatched
RUNNING
  ├─ Outcome.continue ──> READY
  ├─ Outcome.await ─────> WAITING
  ├─ Outcome.complete ──> COMPLETED
  ├─ Outcome.fail ──────> FAILED
  └─ cancellation ──────> CANCELLED

WAITING
  └─ matching Event ────> READY
```

`RUNNING` means one Activation is in flight. It does not mean the Kernel thread is synchronously executing the Runtime.

`WAITING` means the Runtime has reached a semantic boundary and declared a Kernel-visible dependency. Internal waiting inside a model call, graph engine, or native tool remains `RUNNING` from the Kernel's point of view.

Worker/host loss is not a terminal lifecycle state. It is an operational condition on an Activation attempt. Recovery may return the Execution to `READY`, preserve `WAITING`, establish an `unknown` action state requiring reconciliation, or fail/cancel the Execution according to policy.

## 4. Activation

An **Activation** is one Kernel-issued unit of semantic work for an Execution.

A conceptual shape is:

```text
ExecutionActivation
  execution_id
  activation_id
  writer_epoch
  base_progress_revision
  events[]
  execution_view
  authority/exposure_view
  cancellation
  deadline/budget
  pinned_definition/runtime_identity
```

### `execution_id`

Identifies the logical Execution. It is a routing identity, not an authorization credential.

### `activation_id`

Identifies this specific unit of dispatched work. Every Outcome must name the Activation it answers.

### `writer_epoch`

Identifies the current accepted writer/ownership epoch for a durable profile. A previous host that returns after takeover cannot commit an Outcome under an obsolete epoch.

### `base_progress_revision`

States which accepted progress the Runtime is continuing from. The Kernel rejects a stale Outcome that attempts to overwrite newer progress.

### `events[]`

The semantic observations being delivered for this Activation. Events are removed/acknowledged according to the durable acceptance protocol, not simply because a process read them.

### `execution_view`

Read-only Kernel-owned information the Runtime is allowed to know about its own Execution. Keep this small and stable; do not leak arbitrary Kernel internals.

### `authority/exposure_view`

A snapshot of currently exposed Kernel-mediated operations/resources. It is useful to the Runtime when choosing actions, but final dispatch always rechecks current authority.

### `cancellation`

A Kernel signal that cancellation has been requested. It does not imply arbitrary native work can be physically stopped unless the Execution Host supports termination.

### `deadline/budget`

Bounds or advisory limits for this Activation/Execution according to the declared deployment. Budget is not authority.

### `pinned_definition/runtime_identity`

Identifies the exact execution contract/runtime version expected to interpret progress and Events. Durable recovery must not silently resume incompatible state with arbitrary new code.

## 5. Outcome

An **Outcome** is the Runtime's response to one Activation.

```text
ExecutionOutcome
  execution_id
  activation_id
  writer_epoch
  base_progress_revision
  progress/checkpoint
  emissions[]
  effects[]
  next:
    continue
    await(condition)
    complete(result)
    fail(error)
```

An Outcome is a proposal to advance Kernel state. The Runtime cannot directly mutate the Execution record.

### `progress/checkpoint`

Continuation data needed for a later Activation. It may be a portable structure or an opaque provider/runtime reference. The Kernel must know enough to version, persist, and reject incompatible/stale progress; it does not need to understand native reasoning state.

### `emissions[]`

Nonterminal application-visible output. Emitting data does not complete the Execution.

### `effects[]`

Kernel-mediated action proposals. They are validated and authorized after the Outcome is accepted according to the action contract.

### `next`

`continue` means local semantic work remains and the Execution should become `READY` again.

`await(condition)` means no local work can proceed until a Kernel-visible condition is met.

`complete(result)` proposes semantic completion with a terminal result.

`fail(error)` proposes semantic failure.

## 6. Mailboxes and queues

The architecture distinguishes three logical queues even if one implementation combines them.

### Kernel inbound queue

Carries things the Kernel must process as state transitions:

- Execution Outcomes;
- external input;
- Effect settlements;
- timers/deadlines;
- cancellation requests;
- Execution Host or Kernel Worker liveness/lease signals.

### Per-Execution mailbox

Carries semantic Events waiting for delivery to that Execution.

### Ready queue

Carries Executions eligible for another Activation.

A simple first implementation may process Kernel transitions one at a time. This is an implementation simplification, not a permanent global-serialization requirement.

The durable concurrency invariant is:

> **One Execution has at most one accepted progress-writing Activation in flight at a time. Different Executions may run concurrently.**

If Events arrive while an Execution is `RUNNING`, they stay in the mailbox until the current Activation ends. The Kernel does not issue a second concurrent progress-writing Activation for that Execution.

## 7. Event

An **Event** is a semantic observation delivered into an Execution.

A conceptual Event envelope contains:

```text
Event
  event_id
  destination_execution_id
  kind/label
  payload
  correlation_id?
  causation_id?
  observed_at
  provenance
```

The Kernel owns acceptance, routing, deduplication/correlation where promised, mailbox persistence, and delivery history.

Typical Events include application input, Effect result, human input, child completion, peer messages, and semantic timers.

Operational heartbeat/lease traffic is not an Event and does not enter the Runtime's semantic input unless an application deliberately models it that way.

## 8. Effect and the concrete action contract

An **Effect** is a proposal for a Kernel-mediated interaction.

The action path is:

```text
Execution Outcome
  ↓ Effect proposal
Kernel validates operation identity + input
  ↓
current authority check
  ↓
exact consent if policy requires it
  ↓
record action intent/attempt
  ↓
dispatch through trusted adapter/provider
  ↓
observe success / failure / unknown
  ↓
record settlement
  ↓
Event delivered back to Execution
```

For a supported action contract, the Kernel must define:

- stable operation identity and revision;
- accepted input-schema dialect/subset;
- no silent coercion or default mutation unless explicitly part of the contract;
- output validation;
- behavior for unknown operations;
- current authorization at dispatch;
- exact consent binding when required;
- idempotency/attempt identity where available;
- truthful `success`, `failure`, and `unknown` outcomes.

A malformed response does not prove an external action failed. If the world may have changed but the Kernel cannot establish the result, the action remains `unknown` until reconciled or explicitly abandoned under policy.

## 9. Authority

**Authority** is the bounded set of Kernel-mediated operations/resources an Execution is permitted to request.

The Kernel may compute authority from application policy, parent delegation, deployment policy, authenticated principals, and resource ownership. The concrete policy backend is replaceable.

A useful narrowing model is:

```text
available catalog
  ↓ policy/delegation
Effective Authority
  ↓ deterministic exposure selection
Exposure View
  ↓ provider/runtime-specific rendering if needed
Execution-facing projection
```

Each step narrows; none enlarges authority.

The Runtime may see only an Exposure View while deciding what to request. Final Effect dispatch is checked against current authority, not merely the snapshot the Runtime saw earlier.

### Delegation

When one Execution creates a child, child authority is attenuated:

```text
requested child authority
  ∩ creator-delegable authority
  ∩ application/deployment policy
  = child effective authority
```

A child cannot mint power the parent/application did not delegate.

### Exact consent

Standing authority and exact approval are separate. When a policy requires human confirmation, consent binds the validated concrete payload and relevant operation/contract revision. If the contract changes while waiting, the Kernel must revalidate/reconfirm or reject rather than silently applying stale consent.

## 10. Communication and composition

The Kernel knows relationships between Executions without knowing their internal Agent/Workflow structure.

### Child composition

An Execution may request creation/call of another Execution. The child has its own identity, lifecycle, authority, mailbox, progress, and history.

The parent may wait for a child result, continue independently, or interact through messages according to the declared operation.

### Peer communication

Existing Executions may send/request/reply through Kernel-routed messages when authority permits it.

### Local composition

Anything that does not need independent identity/lifecycle/authority/recovery may remain internal to one Execution Runtime. A Workflow node, model call, or Agent substep is not automatically another Kernel Execution.

## 11. Memory and resources

The Kernel does not own Agent memory semantics. It may own **governed resource services** that Executions can read/write through declared boundaries.

Examples:

- asserted structured application state;
- artifact references;
- application-owned files/resources;
- shared database/service operations;
- externally maintained semantic-memory service.

The Kernel's responsibilities are boundary concerns: identity, access, schema/contract validation where promised, authority, version/conflict semantics where promised, and history/provenance of governed changes.

The Execution Runtime decides how retrieved information becomes context, notes, native memory, or reasoning state. Those execution-side concepts are defined in [`execution.md`](execution.md).

Ordinary typed dataflow between steps inside a Workflow should not require writing Kernel-governed memory merely to move a value.

## 12. History

**Execution History** is Kernel-owned operational evidence.

It should be sufficient to answer questions such as:

- what input was accepted and when;
- which Activation was issued against which progress revision;
- which Outcome was accepted or rejected;
- which Effects were proposed, authorized, denied, confirmed, dispatched, settled, or left unknown;
- which Events were routed/delivered;
- which child/peer obligations were created and settled;
- which lifecycle transitions occurred;
- which worker/host attempt owned an Activation;
- what happened during recovery or reconciliation.

History is not automatically model context or Agent memory.

A durable profile may compact/snapshot history, but retention rules must state when deletion ends replay, deduplication, or reconciliation guarantees.

## 13. Worker, host, heartbeat, and fencing

A **Kernel Worker** processes Kernel state transitions. An **Execution Host** runs Execution Runtime code. One process may perform both roles in an embedded deployment.

For durable/remote execution, Activation ownership should use leases or equivalent fencing rather than assuming a process remains alive.

Conceptually:

```text
Activation A7
  writer_epoch = 12
  assigned_host = H2
  lease_until = T
```

H2 renews the lease while it is still processing. If the lease expires, the Kernel may fence epoch 12, establish a newer owner, and reject any late Outcome from the stale epoch.

Heartbeat proves only that a host recently responded. It does not prove whether an external side effect happened immediately before host loss.

Recovery therefore relies on durable action intent/attempt/outcome evidence, not heartbeat alone.

## 14. Recovery

Recovery is a Kernel responsibility for deployment profiles that claim it.

The Kernel must have a defined answer at each important boundary:

- input accepted but Activation not dispatched;
- Activation dispatched and host lost before Outcome;
- Effect intent recorded but dispatch uncertain;
- external action succeeded but receipt was lost;
- Effect settlement recorded but wake was lost;
- progress committed but ready enqueue was lost;
- stale host completes after takeover;
- code/runtime version needed by progress is missing or incompatible.

The answer may be safe retry, replay from durable result, reconcile with the external system, wait for evidence, manual intervention, explicit `unknown`, migration, or failure. It must not fabricate certainty.

Persisted state by itself is not recovery. A supported durable profile must prove recovery through actual process/host loss tests.

## 15. Cancellation and deadlines

Keep several operations distinct:

| Operation | Meaning |
|---|---|
| Cancel Execution | Request that the logical Execution stop progressing |
| Cancel wait | Stop waiting for one dependency |
| Prevent new Effects | Refuse future governed actions |
| Cancel child | Request cancellation of another Execution under allowed ownership/control |
| Terminate host work | Physically interrupt a process/task if the hosting backend supports it |
| Undo external action | A new domain action, not a consequence of cancellation |

A late result may still arrive after logical cancellation or physical termination attempts. The Kernel records and handles it according to the action/hosting contract.

## 16. Budgets

Budgets bound consumption; authority bounds permission. They are independent.

Examples include model-call count, token/spend budget, wall-clock deadline, child-creation budget, CPU/memory limits in an isolated host, or application-specific quotas.

Recovery must not silently reset a consumed budget. Renewal or handoff to a new Execution should be explicit.

## 17. Kernel persistence and scheduling mechanism

The Kernel owns semantics, not necessarily a custom database or scheduler implementation.

A mature durable runtime may provide timers, queues, journals, leases, and replay mechanics. ArrokothI may use those mechanisms if they faithfully implement the Kernel contract.

The architecture does not require ArrokothI to build its own consensus system, database, distributed queue, or workflow runtime.

## 18. Current implementation migration

The current 0.8.x code implements many useful semantics but uses the older shape:

- the Kernel coordinator is named `Harness`;
- `Harness.runOnce()` synchronously awaits `ExecutionController.activate(...)`;
- slow controller-local work uses `ControllerResumption` and an inline wait budget;
- the scheduler is currently a claim-based in-memory reference implementation;
- durable writer epochs, host leases, and real process-death recovery are not yet the supported production path.

The target architecture changes the boundary to asynchronous Activation dispatch + Outcome delivery. `ControllerResumption` should not remain a Kernel semantic concept when the Execution Runtime can own its own internal async work.

The migration must preserve existing Kernel truths—Events, Effects, authority, lifecycle, correlation, child/peer relationships, and truthful outcomes—while subtracting Agent/Workflow-specific local execution machinery from Kernel ownership.

## 19. Kernel invariants

1. Kernel state changes come from validated Kernel inputs: accepted external input, accepted Outcomes, settlements, timers, cancellation, and operational host/worker signals.
2. The Runtime cannot directly set lifecycle, grant authority, mutate the Kernel store, or settle its own Effects merely by knowing an identifier.
3. One Execution has at most one accepted progress-writing Activation in flight at a time.
4. Different Executions may execute concurrently.
5. Internal Runtime async work is opaque to the Kernel.
6. `WAITING` requires an accepted Kernel-visible dependency; slow internal computation alone is not `WAITING`.
7. Effect proposal is not dispatch permission, and dispatch is not proof of outcome.
8. Old authority/exposure snapshots do not bypass current authorization.
9. Stale Activation Outcomes are rejected after newer progress/takeover.
10. Worker/host loss does not erase Execution identity or justify assuming external work did nothing.
