# Execution Runtime

> **Status: canonical runtime semantics for ArrokothI v0.4.**
>
> Read [`mental-model.md`](mental-model.md) first. This document deepens only the runtime concepts behind `Execution`, `Harness`, lifecycle, Activation, Events, Effects, pending work, wake-up, structural bounds, cancellation, supervision, durability, and recovery. Agent/Workflow composition belongs in [`composition.md`](composition.md).

## 1. One logical Harness

Arrokoth has one logical **Harness** managing many Executions.

```text
                 Harness
          ┌────────┼────────┐
          ▼        ▼        ▼
       exec-A   exec-B   exec-C
```

An Execution does not own a private Harness. The Harness is the shared operational boundary that turns controller intent into managed runtime behavior.

It owns concerns such as:

```text
lifecycle and scheduling
Event delivery
Effect authorization / coordination
pending work and wake-up
structural/runtime budgets
cancellation / supervision
persistence / recovery
routing
mechanical confirmation
```

A simple application may implement the Harness in one process. A larger deployment may spread it across workers, stores, queues, and isolated environments.

> **The Harness is one logical runtime boundary; physical distribution is an implementation detail.**

---

## 2. Execution identity is logical, not physical

An Execution is not a thread, process, worker, container, Promise, or currently loaded object.

```text
Execution
  logical identity + runtime truth

Activation
  one scheduled period of active computation

worker / process / sandbox
  physical place where an Activation happens
```

A long-lived Execution may spend most of its lifetime with no compute occupied.

```text
Execution lifetime
──────────────────────────────────────────────>

 [Activation]       [Activation]        [Activation]
      │                  │                   │
    idle/wait          idle/wait            ...
```

The runtime may unload/passivate implementation state between Activations and reconstruct it later. The logical Execution still exists.

> **Execution existence ≠ continuously resident compute.**

Unless a future execution model explicitly says otherwise, one Execution should have at most one active controller Activation at a time. Interleaving happens between Activations, not through uncontrolled concurrent mutation of one Execution's controller state.

---

## 3. Runtime state and controller state are different

The Harness needs enough runtime truth to manage an Execution independently from its controller's semantic progress.

Runtime concerns include:

```text
identity / Definition reference
owner / root relationships
lifecycle
mailbox
pending-operation references
runtime and structural budgets
memory/resource/view references
terminal result
trace / causation metadata
```

Controller-specific progress includes things such as:

```text
Workflow current Stage / barrier state
Agent continuation/progression state
```

These remain separate concepts even if one implementation stores them together.

The runtime should not need to interpret an opaque controller object merely to know whether an Execution exists, can run, is waiting, or has terminally completed.

---

## 4. Lifecycle, runnable work, and Activation

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

no runnable continuation remains,
but unresolved work may later enable progress
  RUNNING → WAITING

processable Event makes work runnable
  WAITING → READY

controller reports terminal success
  RUNNING → COMPLETED

unrecoverable controller/runtime failure
  → FAILED

cancellation accepted
  → CANCELLED
```

The key meaning is:

> **WAITING means “nothing is runnable now,” not “this Execution refuses all Events until one particular wait completes.”**

A controller does not enter `WAITING` by emitting a semantic `yield`. The Harness derives it from runtime truth.

---

## 5. Events are delivered observations

An **Event** is an observation delivered to an Execution through the runtime boundary.

Examples:

```text
start input
user input
capability result / failure
child terminal result
peer message
confirmation decision
timer / timeout
cancellation / control observation
```

Ordinary local function returns and normal model inference results do not become Events merely because they produced data.

```text
local computation
  returns directly inside the Activation

runtime/external observation
  is delivered as Event
```

If normally local work is instead dispatched as independently managed remote work that outlives the current Activation, its later completion may legitimately return as an Event.

Event-ness follows the runtime boundary, not the technology that produced the data.

---

## 6. Effects cross the runtime boundary

An **Effect** is a controller's proposal for runtime-mediated interaction.

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

The Effect belongs to the requesting Execution even when a local Workflow Stage or Agent step originated it.

The Harness may deny it, require confirmation, execute it immediately, dispatch it asynchronously, create runtime state, route a message, or record unresolved work.

> **Effect request ≠ authorization ≠ completion.**

The decisive authorization remains at the Harness boundary.

---

## 7. Fast and slow completion have the same meaning

An Effect boundary does not imply an immediate transition to `WAITING`.

```text
Effect proposed
     ↓
Harness dispatches
     ↓
result becomes available quickly?
  ├── yes → observe result and continue this Activation
  └── no  → record pending work and yield
```

Whether completion occurs now or after a later wake-up must not change authorization, correlation, consequence/idempotency policy, trace identity, or result meaning.

### Activation wait budget vs operation deadline

Keep two time concepts separate:

```text
Activation / inline wait budget
  how long current compute stays occupied

operation deadline
  how long the operation may remain unresolved
```

Exhausting the inline budget normally means:

```text
yield current Activation
record pending work
```

not “cancel the underlying operation.” Cancellation follows the operation deadline or explicit cancellation policy.

---

## 8. PendingOperation records unresolved dependency/correlation

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
trusted settlement / observation
      ↓
correlated Event
```

A PendingOperation is not necessarily the work itself.

```text
external provider job: job-123
Arrokoth waiting record: pending-77
```

Likewise:

```text
external async handle ≠ PendingOperation
Execution              ≠ PendingOperation
```

An exported long-running handle may track an entire Execution that creates many PendingOperations.

### A pending dependency does not globally close the Execution

A pending operation blocks the continuation or completion boundary that depends on it. It does **not** automatically make every other incoming Event unprocessable.

For example:

```text
A calls B
A waits for B's terminal result

B sends A a clarification request
        ↓
Message Event reaches A
        ↓
if A's controller can handle it safely,
A becomes READY and runs another Activation
        ↓
A replies to B
        ↓
A may return to WAITING for B's result
```

This is controlled **interleaving between Activations**, not concurrent execution of A.

Not every Event must make an Execution runnable. A Workflow blocked at a Stage barrier may have no semantic handler for an unrelated message. The rule is only that one suspended continuation does not automatically lock the whole mailbox.

### Completion dependency

Pending work may record which semantic boundary currently depends on it, for example:

```text
current Agent progression
current Workflow Stage
Execution terminal completion
nothing / non-blocking
```

This does not make the Stage or Agent step the owner of the Effect. The Effect remains attributed to the enclosing Execution.

Broad detached/non-blocking semantics remain intentionally conservative until real programs justify them.

---

## 9. Wait-for dependencies and deadlock

Cross-Execution waits create a graph different from both ownership and communication.

```text
A ── waits for ──▶ B
B ── waits for ──▶ A
```

When the dependency target is known, the Harness should retain enough information to represent this **wait-for relationship** for diagnostics, tracing, timeout/cancellation policy, and future deadlock detection.

A cycle is not automatically a deadlock.

```text
A waits for B
B waits for A
```

may still make progress if, for example, A can process B's incoming request in another Activation, a timer fires, a user responds, or another external dependency resolves.

A true deadlock requires the stronger condition that the participants have no runnable or externally escapable path that can break the cycle.

The runtime should therefore treat cycles as **deadlock candidates**, not automatically kill them.

At minimum, a durable/diagnostic runtime should be able to surface suspicious required-wait cycles. More advanced implementations may detect strongly connected blocked components and apply configured timeout, cancellation, or failure policy.

### Runtime locks must not create hidden deadlocks

Harness-owned implementation locks—scheduler mutexes, store locks, worker-local critical sections, and similar machinery—must not remain semantically held by an Execution across an Activation yield/`WAITING` boundary.

```text
Activation
  acquire internal lock
  perform bounded critical work
  release lock
  yield
```

If exclusive ownership genuinely must persist across Activations, it should be represented as explicit runtime/application resource state such as a lease with defined expiry/cancellation semantics, not as an invisible host lock held by a sleeping Execution.

This rule prevents the runtime implementation itself from creating deadlocks that the Execution model cannot observe or recover from.

---

## 10. Settlement, correlation, mailbox, and wake-up

Runtime-mediated work may begin in one Activation and finish much later, so stable correlation is required.

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
unknown / indeterminate outcome
```

Unknown is not success and is not necessarily definite failure. This matters when an external system may have acted even though its response was lost.

Duplicate completion must not settle the same pending dependency twice. Correlation identifiers are integrity/causation data, not authority credentials.

The logical wake-up path is:

```text
result / message / timer / user input
             ↓
           Event
             ↓
          mailbox
             ↓
processable work exists?
  ├── yes → WAITING → READY → scheduler → Activation
  └── no  → remain non-runnable until something relevant changes
```

Scheduling strategy—FIFO, priority, fairness, deadlines, worker affinity, distributed queues—is implementation policy as long as these lifecycle meanings hold.

---

## 11. Spawned children and structural budgets

`SpawnExecution` creates an independent child Execution under the same logical Harness.

The child receives its own:

```text
identity and lifecycle
controller state
mailbox and pending work
trace identity
effective delegated authority
memory/context/resource views
runtime budgets
```

The owner/parent relationship supports delegation, budget allocation, cancellation, supervision, and trace ancestry. Ownership does not imply unrestricted access to the child's private state.

### Recursive composition is legal

The runtime must not reject a child solely because its Definition appears earlier in its ancestry.

These may be legitimate:

```text
Agent A → Agent B → Agent A
Workflow A → Workflow B → Workflow A
recursive divide-and-conquer
recursive search/planning
```

Static Definition-cycle detection may be useful as a warning or authoring diagnostic, but **a cycle in the Definition dependency graph is not itself invalid runtime semantics**.

### Per-Execution child limits are not enough

A local `maxChildren` prevents one Execution from spawning unlimited direct children, but does not prevent exponential recursive expansion:

```text
A spawns 2 B
  each B spawns 2 A
    each A spawns 2 B
      ...
```

Every Execution can obey its own limit while the ownership tree grows without bound.

Therefore autonomous child creation must also consume **lineage/root-scoped structural budget** that descendants cannot mint for themselves.

Conceptually this may constrain some combination of:

```text
maximum direct children
maximum total descendants / spawn credits
maximum active descendants
maximum spawn depth
parallel child creation
```

The exact representation is runtime policy, but the invariant is:

> **Delegation may subdivide remaining structural budget; a child cannot enlarge the finite structural budget of its lineage.**

This permits legitimate recursion and divide-and-conquer while preventing an autonomous spawn loop from creating unbounded work.

---

## 12. Response, terminal completion, cancellation, and supervision

An Execution can communicate without terminating.

```text
message / response
  → communication

terminal result
  → final result of COMPLETED Execution
```

A long-lived Agent may repeatedly receive an Event, run an Activation, respond, and wait without reaching `COMPLETED`.

Terminal completion is explicit semantic completion reported by the controller and recorded by the Harness. A waiting parent `call` normally receives the child's terminal result through a correlated Event.

### Cancellation

Cancellation is runtime control, not ordinary peer messaging.

It should distinguish:

```text
stop future progression
attempt cancellation of unresolved work where possible
terminal CANCELLED lifecycle
```

Some external operations cannot be reliably cancelled after dispatch. The Execution may stop depending on them while the runtime continues to track late/unknown outcomes when required for audit or safety.

### Supervision

Ownership provides a natural supervision relationship, but v0.4 does not assume one universal child-failure policy.

Possible policies include:

```text
report child failure to parent
cancel siblings
retry/restart child
isolate failure and continue
propagate cancellation downward
```

> **Ownership provides a supervision relationship; it does not mean every child failure automatically fails the parent.**

Restart loops, like spawn loops, must remain bounded by runtime retry/restart policy rather than creating unlimited autonomous work.

---

## 13. Budgets and deadlines

Runtime limits are distinct from semantic authority.

Examples include:

```text
deadline
model/token/cost budget
structural spawn budget
parallelism
retry/restart budget
resource limits
```

Authority answers whether an action is permitted. Budgets constrain how much autonomous work may occur or how long it may continue.

A child may receive narrower authority and narrower budgets independently.

The Harness must be able to enforce these limits even when an Agent would prefer to continue.

A long-lived Execution may intentionally wait indefinitely for external input. Therefore Arrokoth does not require every PendingOperation to have a short timeout. Deadlock safety comes from explicit dependencies, bounded autonomous work, absence of hidden cross-wait locks, diagnostics, and configured deadlines where the application requires liveness.

---

## 14. Failure, durability, and idempotent recovery

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

Keep infrastructure retry/transport recovery in the Harness/executor layer and semantic retry/alternative strategy in Agent or Workflow logic.

### Durability

Durability is a capability of the same runtime semantics, not another programming model.

A durable implementation persists enough truth to reconstruct, as applicable:

```text
Execution identity and lifecycle
controller progress
mailboxes / Event cursors
pending operations and wait-for dependencies
Effect records and settlement state
owner/child relationships
structural/runtime budgets
confirmation state
terminal result
correlation / causation metadata
memory/resource/view references
```

After restart:

```text
restore runtime truth
      ↓
reconstruct runnable vs waiting Executions
      ↓
resume through ordinary scheduler / Activation semantics
```

### Idempotency and uncertain outcome

Effects retried across crashes or uncertain networks need explicit consequence/idempotency semantics. The runtime must not assume retry is always safe.

Useful mechanisms include:

```text
idempotency keys
Effect journal
settlement deduplication
provider reconciliation
mechanical confirmation
unknown-outcome reporting
```

Existing durable execution systems may later implement runtime ports, but their own Workflow/object models must not redefine Arrokoth's Execution semantics.

---

## 15. Provenance and external handles

Runtime history should preserve enough causation to answer questions such as:

```text
Which Event triggered this Activation?
Which Execution proposed this Effect?
Which Effect caused this result Event?
Which child was spawned by which request?
Which Execution waits for which child/peer/resource?
Which message caused a later action?
```

Useful logical edges include:

```text
ownership edges
wait-for edges
Event → Activation causation
Activation → Effect causation
Effect → result Event correlation
message sender → receiver
spawn request → child Execution
```

This history supports audit, debugging, deadlock diagnostics, memory provenance, evaluation, and recovery. Observability systems such as OpenTelemetry should project this truth rather than define it.

External protocol objects remain separate from runtime identities:

```text
MCP Task
A2A Task
remote provider job
HTTP job handle
```

may correlate to an Arrokoth Execution, PendingOperation, external job, or another runtime object.

```text
external handle ≠ Execution ≠ PendingOperation
```

[`interoperability.md`](interoperability.md) owns those mappings.

---

## 16. Runtime invariants

The runtime should preserve these distinctions:

```text
Execution          ≠ physical worker/process
Execution          ≠ Activation
Activation         ≠ Execution lifetime
Event              ≠ local function/model return
Effect proposal    ≠ authorization
Effect proposal    ≠ completion
PendingOperation   ≠ underlying work
PendingOperation   ≠ global mailbox lock
wait-for graph     ≠ ownership graph
wait-for cycle     ≠ automatic deadlock
Definition cycle   ≠ invalid Execution
external handle    ≠ PendingOperation
response/message   ≠ terminal result
operation failure  ≠ automatic Execution failure
authority          ≠ runtime/structural budget
persistence        ≠ wake-up
correlation id     ≠ authority credential
```

And these positive rules summarize the runtime:

> **One logical Harness operationally manages many independent Executions.**

> **An Execution is logical identity; an Activation is temporary compute.**

> **WAITING means no work is runnable now, not that the mailbox is closed.**

> **A PendingOperation blocks its dependent continuation/completion boundary, not automatically every future Event.**

> **The Harness may interleave safe work between Activations while preserving single-Execution controller consistency.**

> **Recursive child composition is legal, but descendants cannot create unbounded structural budget.**

> **Known waits form explicit runtime dependencies so cycles can be diagnosed without confusing them with ownership.**

> **Harness-internal locks do not survive an Execution yield; cross-Activation exclusivity must be explicit state.**

> **Fast and slow completion paths preserve the same Effect meaning.**

> **Durability and distribution may change mechanisms without changing application semantics.**

This document owns these runtime meanings. Other canonical documents should reference them rather than restating them.