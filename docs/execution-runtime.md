# Execution Runtime

> **Status: canonical runtime semantics for ArrokothI 0.8.x.**
>
> Read [`mental-model.md`](mental-model.md) first. This document owns `Execution`, `Harness`, lifecycle, Activation, Events, Effects, pending work, controller resumption, scheduling, concurrency, wake-up, structural bounds, cancellation, supervision, durability, recovery, settlement, and runtime causation.
>
> Agent/Workflow/Stage/Skill composition belongs in [`composition.md`](composition.md). Authority/delegation/Active View/confirmation meaning belongs in [`authority.md`](authority.md). Memory forms/views/context compilation belong in [`memory.md`](memory.md). Protocol/task/handle mappings belong in [`interoperability.md`](interoperability.md). Trust/deployment guarantees belong in [`security-guarantees.md`](security-guarantees.md). Unresolved runtime/concurrency questions belong in [`future-plan.md`](future-plan.md).

## 1. One logical Harness

ArrokothI has one logical **Harness** managing many Executions.

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

The authority policy used for Effect authorization/confirmation is defined in [`authority.md`](authority.md); this document owns only the runtime act of enforcing/coordinating that decision.

A simple application may implement the Harness in one process. A larger deployment may spread it across workers, stores, queues, and isolated environments.

> **The Harness is one logical runtime boundary; physical distribution is an implementation detail.**

---

## 2. Execution identity is logical, not physical

An Execution is not a thread, process, worker, container, Promise, or currently loaded object.

```text
Execution
  logical identity + runtime truth

Activation
  one scheduled period of controller computation

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

### One controller writer does not mean one in-flight operation

Unless a future execution model explicitly defines another rule, one Execution should have at most one **controller-state-mutating Activation** at a time.

This protects controller state from uncontrolled concurrent mutation:

```text
bad:
  Activation A1 ─┐
                  ├─ concurrently mutate the same controller state
  Activation A2 ─┘

normal:
  Activation A1
      ↓
  Activation A2
```

This is a **single-writer state rule**, not a global serialization rule.

While one Execution has only one active controller writer, it may still have many things in flight:

```text
Execution A
  ├── model invocation 1
  ├── model invocation 2
  ├── capability operation
  ├── peer request
  └── child Execution B
```

Different Executions may also run in parallel on different workers.

> **Serialize controller-state mutation; parallelize independent work.**

Interleaving happens between Activations. A suspended continuation may later resume after another safe Activation has processed a different Event, but two Activations should not race while mutating the same Execution's controller state.

---

## 3. Runtime state and controller state are different

The Harness needs enough runtime truth to manage an Execution independently from its controller's semantic progress.

Runtime concerns include:

```text
identity / Definition reference
owner / root relationships
lifecycle
mailbox
pending/waiting references
runtime and structural budgets
memory/resource/view references
terminal result
trace / causation metadata
```

Controller-specific progress includes things such as:

```text
Workflow current Stage / barrier / branch progress
Agent continuation/progression state
```

These remain separate concepts even if one implementation stores them together.

The runtime should not need to interpret an opaque controller object merely to know whether an Execution exists, can run, is waiting, or has terminally completed.

This separation also allows the runtime to wake or recover an Execution before interpreting its Workflow- or Agent-specific semantic state.

---

## 4. Four levels of concurrency

ArrokothI should reason about concurrency at four different boundaries.

### 4.1 Across Executions

Independent Executions may run concurrently:

```text
Execution A ───────┐
Execution B ───────┼── parallel
Execution C ───────┘
```

This is the primary source of multi-Agent and child-Execution parallelism.

### 4.2 In-flight work initiated by one Execution

One Execution may initiate several independent operations that overlap in wall-clock time:

```text
model call A ─────────┐
model call B ─────────┤
Effect C ─────────────┤── parallel in flight
child Execution D ────┘
```

The controller need not stay physically active while these operations are unresolved.

### 4.3 Controller-state mutation inside one Execution

Commits/mutations to one Execution's controller state are serialized through Activations unless a future execution model explicitly defines safe parallel state ownership.

This avoids ordinary data races and duplicate semantic progression.

### 4.4 Shared mutable resources across Executions

Two safe single-writer Executions can still race when they act on the same external or shared resource:

```text
Execution A ─┐
             ├─→ Resource R
Execution B ─┘
```

That conflict is not solved by serializing each Execution internally. The resource/operation needs explicit concurrency semantics; see §11. Memory-specific consequences also appear in [`memory.md`](memory.md).

---

## 5. Lifecycle, runnable work, and Activation

The basic 0.8.x lifecycle is:

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

An **Activation** is one scheduled period during which an Execution's controller actively computes and may commit controller progress.

Typical transitions are:

```text
creation accepted
  CREATED → READY

scheduler selects
  READY → RUNNING

no runnable continuation remains,
but unresolved work may later enable progress
  RUNNING → WAITING

processable Event arrives
or suspended controller-local work becomes resumable
  WAITING → READY

scheduler selects again
  READY → RUNNING

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

Likewise, asynchronous completion does not jump directly from `WAITING` to `RUNNING`. Completion first makes work runnable (`READY`); the scheduler later selects the next Activation (`RUNNING`).

---

## 6. Semantic locality is not physical synchrony

Function or LLM work can be **semantically local** to one Execution without occupying one worker synchronously until completion.

For example, a model invocation normally does not deserve its own Execution identity, authority envelope, mailbox, or ownership relation. It is still controller-local work.

But a provider call may take tens of seconds:

```text
Activation A1
  prepare model request
  register controller-local resumption state
  dispatch provider request
  nothing else runnable
  → yield
  → Execution WAITING

... provider works asynchronously ...

provider response arrives
  ↓
model executor settles the suspended invocation
  ↓
result/resumption state becomes available
  ↓
Harness observes runnable controller work
  ↓
WAITING → READY
  ↓
scheduler selects Execution
  ↓
READY → RUNNING

Activation A2
  consume model result
  continue controller progression
```

No worker needs to remain occupied merely because the work is semantically local.

> **Local to the Execution means “no independent Execution identity,” not “must complete synchronously inside one Activation.”**

### Controller-local resumption is not automatically an Event

A controller-internal asynchronous result does not automatically become a public ArrokothI Event merely because the runtime suspended while waiting for it.

For 0.8.x, the preferred semantic direction is to keep a separate controller-local resumption record/mechanism—conceptually a **ControllerResumption**—for work such as a model-provider invocation:

```text
ControllerResumption
  belongs to one Execution/controller continuation
  records enough correlation/resumption state
  settlement makes controller work runnable
  does not by itself enter the semantic Event mailbox
```

The exact implementation/API is not frozen. An in-memory runtime may use a Future/Promise or scheduler task; a durable runtime may persist a resumption record. The Harness only needs generic information such as:

```text
exec-A has controller-local work that became runnable
```

It does not need to interpret what the model result means. The Agent/Workflow controller owns that semantic interpretation.

This preserves the distinction:

```text
Event
  semantic observation delivered through runtime boundary

ControllerResumption
  runtime scheduling/resumption fact for controller-local async work
```

Whether these should later share a more general internal suspension record is explicitly tracked in [`future-plan.md`](future-plan.md).

---

## 7. Events are delivered observations

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

Ordinary local function returns and model inference results do not become Events merely because they produced data.

```text
controller-local result
  settles ControllerResumption / returns to controller semantics

runtime/external observation
  is delivered as Event
```

If normally local work is instead modeled as an independently managed external/runtime operation whose completion is semantically observable, its completion may legitimately enter through an Event. Event-ness follows the semantic boundary, not latency or implementation technology.

External protocol notifications/tasks are not Events merely because they exist; their mapping belongs in [`interoperability.md`](interoperability.md).

---

## 8. Effects cross the runtime boundary

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

The 0.8.x Effect vocabulary is:

```text
UseCapability
WriteMemory
SpawnExecution
SendMessage
RequestUserInput
```

The Effect belongs to the requesting Execution even when a local Workflow Stage or Agent progression originated it.

This means the Effect is requested under the identity/authority of the enclosing Execution. The Stage or Agent progression may remain causation/provenance metadata, but it is not an independent authority holder or runtime owner. See [`composition.md`](composition.md) and [`authority.md`](authority.md).

The Harness may deny it, require confirmation, execute it immediately, dispatch it asynchronously, create runtime state, route a message, or record unresolved work.

> **Effect request ≠ authorization ≠ completion.**

The decisive authorization remains at the Harness boundary, according to [`authority.md`](authority.md).

Independent Effects from one or many Executions may execute concurrently when their operation/resource semantics permit it.

---

## 9. Fast and slow completion have the same meaning

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

The same principle applies to controller-local asynchronous work such as model-provider calls: the runtime may keep an Activation alive briefly for a fast result or suspend and resume later without changing the semantic meaning of that work.

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
record enough state to resume later
```

not “cancel the underlying operation.” Cancellation follows the operation deadline or explicit cancellation policy.

---

## 10. PendingOperation and ControllerResumption are different

A **PendingOperation** records unresolved **runtime-mediated semantic work** that an Execution may need to correlate with a later observation.

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
runtime-mediated semantic work
      ↓ unresolved
PendingOperation
      ↓
trusted settlement / observation
      ↓
correlated Event
```

Controller-local asynchronous work such as a model-provider invocation follows the separate resumption path described in §6:

```text
controller-local async work
      ↓ unresolved
ControllerResumption
      ↓
internal settlement
      ↓
controller continuation becomes runnable
```

For 0.8.x, keep these semantic roles separate even if an implementation shares lower-level storage, queues, correlation utilities, or scheduling machinery between them.

```text
PendingOperation
  runtime-mediated semantic dependency
  settlement normally produces/delivers an Event

ControllerResumption
  controller-local async dependency
  settlement resumes controller-local work
```

A future design may discover that a more general pending/suspension abstraction is useful, but that question belongs in [`future-plan.md`](future-plan.md), not current runtime truth.

A PendingOperation is not necessarily the work itself.

```text
external provider job: job-123
ArrokothI waiting record: pending-77
```

Likewise:

```text
external async handle  ≠ PendingOperation
ControllerResumption   ≠ PendingOperation
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

This is controlled **interleaving between Activations**, not concurrent controller-state mutation of A.

Not every Event must make an Execution runnable. A Workflow blocked at a Stage barrier may have no semantic handler for an unrelated message. The rule is only that one suspended continuation does not automatically lock the whole mailbox.

### Interleaving creates logical-race questions

Single-writer Activations prevent simultaneous state mutation, but they do not eliminate every logical race.

A continuation may suspend under assumptions about controller state; another Activation may then change that state before the first continuation resumes.

```text
A1 reads controller state at revision N
A1 suspends

A2 processes another Event
state becomes revision N+1

A1 later resumes
```

The resumed continuation must not silently commit stale assumptions when those assumptions are no longer valid. Exact mechanisms—controller-state revision checks, re-evaluation, restricted interleaving, or explicit merge rules—remain controller/runtime design questions tracked in [`future-plan.md`](future-plan.md).

### Completion dependency

Pending work may record which semantic boundary currently depends on it, for example:

```text
current Agent progression
current Workflow Stage / branch
Execution terminal completion
nothing / non-blocking
```

This does not make the Stage or Agent progression the owner of the Effect. The Effect remains attributed to the enclosing Execution.

Broad detached/non-blocking semantics remain intentionally conservative until real programs justify them.

---

## 11. Shared-resource concurrency is explicit

The Harness may run independent Effects in parallel, but shared mutable resources require their own concurrency contract.

For example:

```text
A reads version 17 of a document
B reads version 17 of the same document

A writes change X
B writes change Y
```

Serializing A internally and B internally does not determine whether both writes are valid.

Different resources/operations may support different semantics:

```text
read-only
  parallel reads are safe

commutative / reducible
  concurrent updates combine by a defined operation

optimistic/versioned
  commit only if expected revision still matches

transactional
  backend commits a multi-item invariant atomically

exclusive
  operation/resource is intentionally serialized

provider-defined
  external service defines its own conflict semantics
```

ArrokothI should not impose one global mutex strategy over all resources.

### Prefer explicit conflict semantics over timing-dependent last-write-wins

When concurrent writes can change correctness, the result should not silently depend on whichever network request finishes last.

A versioned write can instead produce a conflict observation:

```text
read revision 17
  ↓
write if revision == 17

another writer commits first
  ↓
revision becomes 18
  ↓
conflicting write rejected
  ↓
controller receives conflict/failure observation
```

The controller/application can then re-read, merge, retry, or deliberately fail.

Structured Memory and BoundResource APIs may eventually expose version/precondition/transaction semantics where applications require them; memory-specific design belongs in [`memory.md`](memory.md), and still-unresolved exact APIs belong in [`future-plan.md`](future-plan.md).

### Durable exclusivity should use explicit leases/permits

When true exclusivity is required across Activations or workers, use explicit durable resource state such as a lease/semaphore/permit with expiry and, where needed, fencing/version semantics.

Do not model long-lived exclusivity as an ordinary process mutex held by a sleeping Execution.

```text
Lease
  resource
  holder
  validity / expiry
  fencing/version token where required
```

This allows crash recovery and prevents an expired old holder from waking later and acting as though it still owns the resource.

---

## 12. Wait-for dependencies and deadlock

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

may still make progress if A can process B's incoming request in another Activation, a timer fires, a user responds, or another external dependency resolves.

A true deadlock requires the stronger condition that the participants have no runnable or externally escapable path that can break the cycle.

The runtime should therefore treat cycles as **deadlock candidates**, not automatically kill them.

At minimum, a durable/diagnostic runtime should be able to surface suspicious required-wait cycles. More advanced detection/policies are future work tracked in [`future-plan.md`](future-plan.md).

### Runtime locks must not create hidden deadlocks

Harness-owned implementation locks—scheduler mutexes, store locks, worker-local critical sections, and similar machinery—must not remain semantically held by an Execution across an Activation yield/`WAITING` boundary.

```text
Activation
  acquire internal lock
  perform bounded critical work
  release lock
  yield
```

Cross-Activation exclusivity belongs in explicit lease/resource semantics such as §11, not in an invisible host lock held by a sleeping Execution.

---

## 13. Settlement, correlation, mailbox, and wake-up

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

Duplicate completion must not settle the same pending dependency twice. Correlation identifiers are integrity/causation data, not authority credentials. Security requirements for who may call a settlement path are defined in [`security-guarantees.md`](security-guarantees.md).

### Two wake-up paths

An Execution may become runnable in two conceptually different ways.

Semantic observation path:

```text
result / message / timer / user input
             ↓
           Event
             ↓
          mailbox
             ↓
processable semantic work exists
             ↓
       WAITING → READY
```

Controller-local resumption path:

```text
model/local async completion
             ↓
settle ControllerResumption
             ↓
controller continuation becomes runnable
             ↓
       WAITING → READY
```

Both paths only establish **readiness**. The scheduler separately chooses when to run the Execution:

```text
READY
  ↓ scheduler selects
RUNNING
  ↓
Activation
```

The Harness need only understand that runnable work now exists. It does not need to interpret the semantic contents of a controller-local result.

Scheduling strategy—FIFO, priority, fairness, deadlines, worker affinity, distributed queues—is implementation policy as long as these lifecycle meanings hold.

---

## 14. Spawned children and structural budgets

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

Authority attenuation is defined in [`authority.md`](authority.md); child memory/context visibility is defined in [`memory.md`](memory.md); the semantic use of child composition is defined in [`composition.md`](composition.md).

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

## 15. Response, terminal completion, cancellation, and supervision

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

Ownership provides a natural supervision relationship, but 0.8.x does not assume one universal child-failure policy.

Possible policies include:

```text
report child failure to parent
cancel siblings
retry/restart child
isolate failure and continue
propagate cancellation downward
```

> **Ownership provides a supervision relationship; it does not mean every child failure automatically fails the parent.**

Restart loops, like spawn loops, must remain bounded by runtime retry/restart policy rather than creating unlimited autonomous work. Exact supervision/restart policies remain tracked in [`future-plan.md`](future-plan.md).

---

## 16. Budgets and deadlines

Runtime limits are distinct from semantic authority.

Examples include:

```text
deadline
model/token/cost budget
structural spawn budget
in-flight/parallelism budget
retry/restart budget
resource limits
```

Authority answers whether an action is permitted. Budgets constrain how much autonomous work may occur or how long it may continue.

A child may receive narrower authority and narrower budgets independently.

The Harness must be able to enforce these limits even when an Agent would prefer to continue.

A long-lived Execution may intentionally wait indefinitely for external input. Therefore ArrokothI does not require every PendingOperation to have a short timeout. Deadlock safety comes from explicit dependencies, bounded autonomous work, absence of hidden cross-wait locks, diagnostics, and configured deadlines where the application requires liveness.

---

## 17. Failure, durability, and idempotent recovery

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
PendingOperations and wait-for dependencies
ControllerResumptions or equivalent controller-local resumption state
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

Mechanical confirmation does not create a weaker dispatch path. After approval and the current
authority re-check, a capability proposal obeys the same prior-operation/idempotency contract as a
direct proposal. Its own confirmation-gated PendingOperation is the dependency being resolved, not a
prior attempt that may self-block it. Equivalent consequential proposals that are approved
concurrently must linearize duplicate recognition with dispatch intent so at most one reaches the
external executor.

Existing durable execution systems may later implement runtime ports, but their own Workflow/object models must not redefine ArrokothI's Execution semantics. Backend selection is future work in [`future-plan.md`](future-plan.md).

---

## 18. Provenance and external handles

Runtime history should preserve enough causation to answer questions such as:

```text
Which Event or ControllerResumption triggered this Activation?
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
ControllerResumption → Activation causation
Activation → Effect causation
Effect → result Event correlation
message sender → receiver
spawn request → child Execution
```

This history supports audit, debugging, deadlock diagnostics, memory provenance, evaluation, and recovery. Memory may cite runtime history as provenance according to [`memory.md`](memory.md). Observability systems such as OpenTelemetry should project this truth rather than define it.

External protocol objects remain separate from runtime identities:

```text
MCP Task
A2A Task
remote provider job
HTTP job handle
```

may correlate to an ArrokothI Execution, PendingOperation, external job, or another runtime object.

```text
external handle ≠ Execution ≠ PendingOperation
```

[`interoperability.md`](interoperability.md) owns those mappings.

---

## 19. Runtime invariants

The runtime should preserve these distinctions:

```text
Execution             ≠ physical worker/process
Execution             ≠ Activation
Activation            ≠ Execution lifetime
semantic locality     ≠ synchronous worker occupancy
one controller writer ≠ one in-flight operation
Event                 ≠ every asynchronous result
Event                 ≠ ControllerResumption
PendingOperation      ≠ ControllerResumption
Effect proposal       ≠ authorization
Effect proposal       ≠ completion
PendingOperation      ≠ underlying work
PendingOperation      ≠ global mailbox lock
wait-for graph        ≠ ownership graph
wait-for cycle        ≠ automatic deadlock
Definition cycle      ≠ invalid Execution
Execution-local serialization ≠ shared-resource serialization
external handle       ≠ PendingOperation
response/message      ≠ terminal result
operation failure     ≠ automatic Execution failure
authority             ≠ runtime/structural budget
persistence           ≠ wake-up
correlation id        ≠ authority credential
```

And these positive rules summarize the runtime:

> **One logical Harness operationally manages many independent Executions.**

> **An Execution is logical identity; an Activation is temporary controller compute.**

> **Serialize controller-state mutation, while allowing independent Executions and in-flight operations to run concurrently.**

> **Semantically local asynchronous work may suspend an Activation without becoming another Execution or semantic Event.**

> **For 0.8.x, runtime-mediated semantic waits use PendingOperation, while controller-local async waits use a separate resumption path even if implementations share low-level machinery.**

> **Asynchronous completion makes an Execution READY; the scheduler separately decides when it becomes RUNNING.**

> **WAITING means no work is runnable now, not that the mailbox is closed.**

> **A PendingOperation blocks its dependent continuation/completion boundary, not automatically every future Event.**

> **Interleaving between Activations must not silently commit stale controller assumptions.**

> **Recursive child composition is legal, but descendants cannot create unbounded structural budget.**

> **Known waits form explicit runtime dependencies so cycles can be diagnosed without confusing them with ownership.**

> **Shared mutable resources define explicit conflict/merge/version/transaction/exclusivity semantics; timing-dependent last-write-wins is not a universal concurrency model.**

> **Harness-internal locks do not survive an Execution yield; long-lived exclusivity must be explicit durable resource state.**

> **Fast and slow completion paths preserve the same semantic meaning.**

> **Durability and distribution may change mechanisms without changing application semantics.**

This document owns these runtime meanings. Use [`README.md`](README.md) to find the canonical owner of adjacent concepts rather than redefining them here.
