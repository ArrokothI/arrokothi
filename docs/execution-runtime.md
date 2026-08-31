# Execution Runtime

> **Status: canonical runtime semantics for ArrokothI v0.4.**
>
> Read [`mental-model.md`](mental-model.md) first. This document deepens only the runtime concepts behind `Execution`, `Harness`, lifecycle, Activation, Events, Effects, pending work, wake-up, cancellation, supervision, durability, and recovery. It intentionally does not redefine Agent/Workflow composition, authority policy, memory taxonomy, interoperability protocols, or implementation APIs.

## 1. One logical Harness

Arrokoth has one logical **Harness** managing many Executions.

```text
                 Harness
          ┌────────┼────────┐
          ▼        ▼        ▼
       exec-A   exec-B   exec-C
```

An Execution does not own a private Harness. The Harness is the shared operational authority that turns controller intent into managed runtime behavior.

It is responsible for things such as:

```text
lifecycle
scheduling
Event delivery
Effect authorization/coordination
pending work
wake-up
cancellation/supervision
budgets/deadlines
persistence/recovery
routing
mechanical confirmation
```

A simple application may implement the Harness in one process. A larger deployment may spread it across workers, stores, queues, and remote environments.

> **The Harness is one logical runtime boundary; physical distribution is an implementation detail.**

---

## 2. Execution identity is logical, not physical

An Execution is not the same thing as a thread, process, worker, container, Promise, or currently loaded object.

```text
Execution
  logical identity + runtime truth

Activation
  one period of active computation

worker/process/sandbox
  physical place where that Activation happens
```

A long-lived Execution may spend most of its lifetime with no compute occupied at all.

```text
Execution lifetime
──────────────────────────────────────────────>

 [Activation]       [Activation]        [Activation]
      │                  │                   │
    idle/wait          idle/wait            ...
```

The runtime may unload/passivate all in-memory implementation state between Activations and recreate what is needed later. The logical Execution still exists if its durable/runtime identity exists.

This makes large dormant populations possible without changing the programming model.

> **Execution existence ≠ a continuously resident physical activation.**

---

## 3. Runtime state and controller state are different

The Harness needs enough runtime truth to manage an Execution independently from the controller's own semantic progress.

Conceptually, an Execution has runtime concerns such as:

```text
identity / Definition reference
owner / root relationships
lifecycle
mailbox / delivered Events
pending-operation references
effective runtime constraints
memory/resource/view references
terminal result when completed
trace / causation metadata
```

and controller-specific progress such as:

```text
Workflow current Stage / barrier state
Agent continuation/progression state
```

These should remain separate concepts even if one implementation stores them in one record.

The runtime should never require a controller-specific opaque object to decide whether an Execution exists, may be scheduled, is waiting, or has terminally completed.

---

## 4. Lifecycle and Activation

The basic v0.4 lifecycle is:

```text
CREATED
   ↓
READY
   ↓
RUNNING
   ├── WAITING
   ├── COMPLETED
   ├── FAILED
   └── CANCELLED
```

An **Activation** is one scheduled period during which an Execution's controller actively computes.

Typical transitions are:

```text
creation accepted
  CREATED → READY

scheduler selects
  READY → RUNNING

runtime-mediated required work remains unresolved
  RUNNING → WAITING

relevant Event arrives
  WAITING → READY

controller reports successful terminal completion
  RUNNING → COMPLETED

unrecoverable controller/runtime failure
  → FAILED

cancellation accepted
  → CANCELLED
```

The exact state-machine representation can vary, but these meanings should remain stable.

A controller does not decide `WAITING` by emitting a semantic “yield” action. The Harness derives waiting from runtime conditions: no runnable local continuation exists and required runtime-mediated work remains unresolved.

---

## 5. Events are delivered observations

An **Event** is an observation delivered to an Execution through the runtime boundary.

Examples:

```text
start input
user input
capability result/failure
child terminal result
peer message
confirmation decision
timer/timeout
cancellation/control observation
```

A normal local function return or ordinary model inference result does not become an Event merely because it produced data. Local computation can return directly to the controller inside the same Activation.

The distinction is about the boundary:

```text
local computation
  returns directly

runtime/external observation
  is delivered as Event
```

If an operation that is normally local is instead dispatched as independently managed remote work that outlives the current Activation, its eventual completion may legitimately re-enter through an Event.

So source technology does not determine Event-ness; runtime semantics do.

---

## 6. Effects cross the runtime boundary

An **Effect** is a controller's proposal for a runtime-mediated interaction.

```text
controller
   ↓
Effect proposal
   ↓
Harness
  authorize
  validate
  coordinate
  correlate
   ↓
executor / resource / child / peer / user
```

The v0.4 Effect vocabulary is:

```text
UseCapability
WriteMemory
SpawnExecution
SendMessage
RequestUserInput
```

The Effect belongs to the requesting Execution even when it originated from a local Workflow Stage or Agent step.

The Harness may:

```text
deny it
require confirmation
execute it immediately
dispatch it asynchronously
create child/runtime state
route a message
record pending work
```

A proposal never proves permission or success.

> **Effect request ≠ authorization ≠ completion.**

Authority semantics are owned by the authority document; this runtime document only requires that the decisive authorization happen at the Harness boundary.

---

## 7. Fast and slow Effects have the same semantic meaning

An Effect boundary does not require an immediate transition to `WAITING`.

A useful runtime strategy is:

```text
Effect proposed
     ↓
Harness dispatches
     ↓
result becomes available quickly?
  ├── yes → observe result and continue current Activation
  └── no  → persist pending work and yield
```

The important invariant is:

> **Whether an Effect completes inside the current Activation or after a later wake-up does not change the Effect's semantic meaning.**

Authorization, correlation, consequence/idempotency policy, trace identity, and result meaning must remain equivalent across both paths.

### Activation wait budget vs operation deadline

Keep two time concepts separate:

```text
Activation / inline wait budget
  how long the current worker is willing to stay occupied

operation deadline
  how long the requested operation is allowed to remain unresolved
```

If the inline budget expires, the normal consequence is:

```text
yield current Activation
persist pending work
Execution waits
```

not:

```text
cancel/fail the underlying operation
```

unless the actual operation deadline or cancellation policy says so.

---

## 8. PendingOperation is runtime waiting/correlation state

A **PendingOperation** records unresolved runtime-mediated work that an Execution may need to correlate with a later observation.

Examples include waiting for:

```text
capability completion
child terminal result
peer reply
user input
confirmation
timer
remote job completion
```

Conceptually:

```text
runtime-mediated work
      ↓ unresolved
PendingOperation
      ↓
Execution may WAIT
      ↓
trusted settlement / observation
      ↓
correlated Event
      ↓
mailbox / READY
```

A PendingOperation is **not necessarily the work itself**.

For example:

```text
external provider job: job-123
Arrokoth waiting record: pending-77
```

The runtime may correlate them, but their identities and meanings are different.

Likewise:

```text
external async handle ≠ PendingOperation
Execution              ≠ PendingOperation
```

An exported long-running service handle may refer to an entire Execution that creates many PendingOperations during its lifetime.

### Completion dependency

Pending work may also carry the semantic boundary that currently depends on it, for example:

```text
current Agent progression
current Workflow Stage
Execution terminal completion
nothing / non-blocking
```

This dependency does not make the local Stage or Agent step the owner of the Effect. The Effect remains attributed to the enclosing Execution.

Broad detached/non-blocking semantics remain intentionally conservative until real programs justify them.

---

## 9. Settlement and correlation

A runtime-mediated operation may be initiated in one Activation and complete much later. The runtime therefore needs stable correlation.

```text
Effect / awaited operation
        ↓
correlation identity
        ↓
external/runtime work
        ↓
trusted settlement
        ↓
Event for the correct Execution
```

Settlement should preserve distinctions such as:

```text
success
definite failure
cancellation
unknown/indeterminate outcome
```

Unknown is not success and is not necessarily the same as definite failure. This matters for consequential/idempotent operations where the external system may have acted even though the caller lost the response.

Duplicate external completion must not settle the same pending dependency twice.

Correlation identifiers help preserve integrity and causation; they are not authority credentials.

---

## 10. Mailbox, wake-up, and scheduling

Persistence by itself does not wake an Execution.

The logical wake-up path is:

```text
result / message / timer / user input
             ↓
           Event
             ↓
     route to Execution
             ↓
          mailbox
             ↓
      WAITING → READY
             ↓
         scheduler
             ↓
         Activation
```

A mailbox is the runtime-owned delivery boundary for observations relevant to an Execution. It should support enough identity/correlation/deduplication semantics that restart/retry does not silently duplicate semantic observations.

Scheduling strategy is not kernel semantics. Deployments may use FIFO, priority, fairness, deadlines, worker affinity, distributed queues, or other policies as long as lifecycle meaning is preserved.

---

## 11. Response and terminal completion

An Execution can communicate without terminating.

```text
message / response
  → communication

terminal result
  → final result of COMPLETED Execution
```

A long-lived conversational Agent may repeatedly:

```text
receive Event
run Activation
send response
wait
```

without reaching `COMPLETED`.

Terminal completion is explicit semantic completion reported by the controller and recorded by the Harness. The terminal result, when present, belongs to the Definition's interface and may be typed/schema-bound.

A waiting parent `call` normally receives the child's terminal result through a correlated Event.

---

## 12. Spawned children are independent Executions

`SpawnExecution` creates another Execution under the same logical Harness.

The child receives its own:

```text
Execution identity
lifecycle
controller state
mailbox
pending operations
runtime constraints
trace identity
effective delegated authority
memory/context/resource views
```

The owner/parent relationship is runtime metadata used for concerns such as:

```text
authority delegation
budget allocation
cancellation propagation
supervision
trace ancestry
```

but ownership does not imply direct memory access or arbitrary control outside the powers the runtime grants.

Composition-level `call`, Agent Stage, Workflow Stage, and messaging semantics belong in [`composition.md`](composition.md).

---

## 13. Cancellation and supervision

Cancellation is operational runtime control, not ordinary peer messaging.

An Execution may be cancelled by an authorized controller/owner/application/runtime policy without treating cancellation as model-authored semantic text.

Cancellation should distinguish at least:

```text
request to stop future progression
cancellation of unresolved pending work where possible
terminal CANCELLED lifecycle
```

Some external operations cannot be reliably cancelled after dispatch. In those cases the Execution can stop depending on or waiting for them while the runtime continues to track late/unknown outcomes as required for audit or safety.

### Supervision

Ownership creates a natural place for supervision, but v0.4 should not assume one universal failure policy.

Possible later policies include:

```text
child failure reported to parent
cancel siblings
retry/restart child
isolate failure and continue
propagate cancellation downward
```

The important current rule is:

> **Ownership provides a supervision relationship; it does not mean every child failure automatically fails the parent.**

Detailed restart/supervision strategies remain future policy unless a v0.4 composition case requires them.

---

## 14. Budgets and deadlines

Runtime limits are distinct from semantic authority.

Examples:

```text
deadline
model/token budget
cost budget
max children
parallelism
retry limit
resource limits
```

Authority answers whether an action is permitted. Budgets and runtime policy constrain how much work may occur or how long it may continue.

A child may receive narrowed budgets independently from narrowed authority.

The Harness should be able to enforce limits even when the Agent would prefer to continue.

---

## 15. Failure semantics

A failed operation does not automatically mean a failed Execution.

```text
UseCapability
   ↓
external service fails
   ↓
CapabilityFailure Event
   ↓
controller may retry / choose alternative / report limitation
```

An Execution reaches `FAILED` when semantic/runtime progression cannot validly continue according to the controller and runtime contract.

Keep these responsibilities separate:

```text
infrastructure retry / transport recovery
  → Harness/executor policy

semantic retry / alternative strategy
  → Agent or Workflow logic
```

For consequential operations, uncertainty must also remain distinguishable from definite failure.

---

## 16. Durability and recovery

Durability is a capability of the same runtime semantics, not a second programming model.

A durable implementation persists enough truth to reconstruct the logical runtime, including as applicable:

```text
Execution identity and lifecycle
controller progress
mailboxes / Event cursors
pending operations
Effect records and settlement state
owner/child relationships
budgets/deadlines
confirmation state
terminal result
correlation / causation metadata
references to memory/resources/views
```

After restart, the runtime should rebuild ordinary state rather than invent a special recovery mode:

```text
restore runtime truth
      ↓
reconstruct READY vs WAITING
      ↓
resume through normal scheduler/Activation semantics
```

A minimal trusted deployment may keep everything in memory. A durable SQLite/Postgres/distributed backend should preserve the same observable semantics.

Existing durable execution systems may later implement these ports, but their own workflow/object models must not redefine Arrokoth's Execution or Workflow meanings.

---

## 17. Idempotency, consequence, and recovery

Effects that may be retried across crashes or uncertain network outcomes need explicit consequence/idempotency semantics.

The runtime should not assume:

```text
retrying is always safe
```

For example, “read document” and “charge card” have very different duplicate-execution consequences.

A capability/operation may describe intrinsic facts needed by the Harness/executor to choose a safe strategy, such as whether an operation is consequential and what idempotency mechanisms it supports.

The runtime may then use techniques such as:

```text
idempotency keys
Effect journal
settlement deduplication
provider reconciliation
manual/mechanical confirmation
unknown-outcome reporting
```

These are runtime safety mechanisms around the same Effect semantics.

---

## 18. Provenance and trace causation

Runtime history should preserve enough causation to answer questions such as:

```text
Which Event triggered this Activation?
Which Execution proposed this Effect?
Which Effect caused this result Event?
Which child was spawned by which parent request?
Which message caused a later action?
```

Useful logical edges include:

```text
ownership edges
Event → Activation causation
Activation → Effect causation
Effect → result Event correlation
message sender → receiver
child spawn → child Execution
```

This history is useful for audit, debugging, memory provenance, evaluation, and recovery.

Trace/journal truth belongs to Arrokoth semantics/storage. Observability systems such as OpenTelemetry should be projections of it, not the source of truth.

---

## 19. External protocols do not redefine runtime objects

Protocol adapters may initiate or expose long-running work, but external names should remain separate from kernel concepts.

Examples:

```text
MCP Task
A2A Task
remote provider job
HTTP job handle
```

may correlate to:

```text
an Arrokoth Execution
an Arrokoth PendingOperation
an external capability job
another remote runtime object
```

Similarly, a protocol notification may only invalidate a discovery cache and never become an Execution Event.

The runtime owns Event/Effect/Execution/PendingOperation semantics. [`interoperability.md`](interoperability.md) owns how external protocols map to them.

---

## 20. Runtime invariants

The runtime should preserve these distinctions:

```text
Execution          ≠ physical worker/process
Execution          ≠ Activation
Activation         ≠ Execution lifetime
Event              ≠ local function/model return
Effect proposal    ≠ authorization
Effect proposal    ≠ completion
PendingOperation   ≠ underlying external work
PendingOperation   ≠ Execution
external handle    ≠ PendingOperation
response/message   ≠ terminal result
operation failure  ≠ automatic Execution failure
authority          ≠ budget/runtime limit
ownership          ≠ universal failure propagation
persistence        ≠ wake-up
correlation id     ≠ authority credential
```

And these positive rules summarize the runtime:

> **One logical Harness operationally manages many independent Executions.**

> **An Execution is a durable/logical identity; an Activation is temporary compute.**

> **Events enter through the runtime boundary; Effects request runtime-mediated interaction.**

> **Fast and slow completion paths must preserve the same Effect meaning.**

> **PendingOperation represents unresolved waiting/correlation, not the identity of the work itself.**

> **The Harness derives waiting, wake-up, cancellation, budgets, and terminal lifecycle from runtime truth rather than model preference.**

> **Durability and distribution may change mechanisms without changing application semantics.**

This document owns those runtime meanings. Other canonical documents should reference them rather than restating them.