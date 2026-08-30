# Runtime Architecture

> **Status: current v0.4 runtime semantics.**
>
> Read [`mental-model.md`](mental-model.md) and [`composition.md`](composition.md) first. This document explains how one logical Harness manages Executions, lifecycle, scheduling, pending work, messaging, authority, memory visibility, confirmation, durability, and provenance.

## 1. One logical Harness

The Harness is the runtime boundary between controller intent and reality.

```text
                 one logical Harness
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      Execution    Execution    Execution
```

An Execution does **not** own its own Harness. The Harness manages one `ExecutionContext` per live Execution.

```text
Harness
  ├── ExecutionContext A
  ├── ExecutionContext B
  └── ExecutionContext C
```

This is similar to one operating-system kernel managing many processes. Parent and child Executions receive separate runtime identity/context under the same logical Harness.

The logical Harness may later be distributed across multiple processes or workers. Physical placement must not change the semantics of `spawn`, `call`, Event, Effect, memory, or lifecycle.

---

## 2. ExecutionContext

A conceptual `ExecutionContext` contains the runtime data needed to manage one Execution:

```text
ExecutionContext
├── identity / metadata
├── lifecycle
├── control / execution-local data
├── effective authority
├── active/exposed view
├── bound resources
├── mailbox
├── memory view
├── Working Notes view/frame
├── pending-operation references
├── budget / deadline / runtime policy
└── optional typed/schema-bound terminal result
```

Metadata and controller progress should remain separate concepts.

Examples of metadata:

```text
execution id
definition/version
createdAt
owner
root execution id
tags
```

Examples of control data:

```text
Workflow current/completed Stage
Agent executor continuation data
correlation / event-consumption cursors
```

Avoid using one generic `state` field to blur these together.

---

## 3. Lifecycle and Activation

The basic lifecycle is:

```text
CREATED
   ↓
READY
   ↓
RUNNING
   ↓
   ├── WAITING
   ├── COMPLETED
   ├── FAILED
   └── CANCELLED
```

An **Activation** is one scheduled period in which a controller is actively RUNNING.

```text
Execution lifetime
──────────────────────────────────────────────>

 [Activation]      [Activation]       [Activation]
      │                 │                  │
   WAITING            WAITING             ...
```

Long-lived means durable/resumable identity, not continuously occupied compute.

The scheduler owns operational transitions. A model should not emit a special semantic `yield` merely to become WAITING.

Typical transitions:

```text
Event arrives:
  WAITING → READY

Scheduler selects:
  READY → RUNNING

No runnable work, required pending operation exists:
  RUNNING → WAITING

Successful terminal completion:
  RUNNING → COMPLETED
```

---

## 4. Scheduler and wake-up

Persistence is not a wake-up mechanism.

Wake-up is:

```text
external/internal result
        ↓
      Event
        ↓
   Event Router
        ↓
     mailbox
        ↓
WAITING → READY
        ↓
    Scheduler
        ↓
   Activation
```

A simple deployment can use an in-memory mailbox and FIFO queue. A richer runtime can add priorities, fairness, deadlines, distributed workers, and durable queues while keeping the same semantic transitions.

---

## 5. Effect gateway

Externally meaningful actions cross the Harness through an EffectRequest.

```text
controller / local composition
       ↓
  EffectRequest
       ↓
    Harness
  authorize
  validate
  persist as needed
  dispatch
  correlate
       ↓
 executor/environment
       ↓
      Event
```

The initial Effect vocabulary is:

```text
UseCapability
WriteMemory
SpawnExecution
SendMessage
RequestUserInput
```

Effects are attributed to the requesting Execution, even when requested by local Function Stage, LLM Stage, or Agent-step logic.

A Stage or Agent step may mark certain pending operations as **required** before that local semantic step can complete. The Effects themselves still belong to the enclosing Execution; the local step only records a completion dependency and how the eventual result should be correlated.

The Effect gateway centralizes:

```text
authorization
confirmation
idempotency
retry/timeout policy
correlation
tracing
provenance
recovery
```
* **correlation** connects an Effect to the later Event/result that resolves it.

The semantics of how Effects compose inside Stages and Agents are defined in [`composition.md`](composition.md).

---

## 6. Pending operations

If an Effect or runtime-mediated interaction does not finish within the current Activation, the Harness records a pending operation.

Examples:

```text
async capability call
knowledge retrieval
child terminal result
peer reply
user input
mechanical confirmation
remote GPU/job result
timer
```

Conceptually:

```text
EffectRequest / awaited interaction
    ↓
PendingOperation
    ↓
Execution may WAIT
    ↓
result/decision occurs
    ↓
Event correlated to pending operation
    ↓
mailbox / READY
```

The controller API may expose ordinary blocking/`await` semantics while the Harness internally suspends and resumes the Execution.

A pending operation may carry completion metadata such as:

```text
required for current Agent step
required for current Workflow Stage
required for Execution terminal completion
not currently blocking
```

The exact non-blocking model is intentionally not fixed in v0.4. The runtime requirement is correlation plus an explicit statement of which semantic boundary, if any, depends on completion.

---

## 7. `spawn`, `call`, `send`, and `ask`

### Spawn

`spawn` creates a new child Agent or Workflow Execution.

```text
Parent
  ↓ SpawnExecution
Harness
  ↓
Child ExecutionContext
```

The child receives independent:

```text
identity
lifecycle
control data
mailbox
pending operations
trace identity
effective authority / budget
memory/context view
```

Ownership ancestry alone does not grant access to parent memory or Working Notes.

### Call

`call` is conceptually:

```text
spawn child
+ wait for child's terminal result Event
```

### Send

`send` communicates with an already-existing authorized peer Execution.

### Ask

`ask` can be understood as:

```text
send
+ correlation
+ wait for reply Message Event
```

The important distinction is:

```text
call → new owned child + terminal result
ask  → existing peer + message reply
```

Ownership and communication authorization remain independent.

---

## 8. Authority and runtime policy

Definitions request authority; creation computes an effective authority envelope.

Conceptually:

```text
requested authority
∩ creator/delegable authority
∩ application/runtime constraints
        ↓
effective authority
```

Categories:

```text
Capability Authority
Resource Authority
Spawn Authority
Message Authority
```

Quantity constraints such as:

```text
max children
parallelism
cost/token budget
deadline
retry limit
```

are runtime policy/budget rather than semantic authority.

A Definition may distinguish required vs optional requests:

```text
required denied → creation fails
optional denied → create with reduced authority
```

Runtime policy may also include:

```text
persistence mode
sandbox/environment
tracing level
confirmation requirements
infrastructure retry policy
allowed authority subset
```

Do not hide **semantic quality** requirements such as "answer must cite 3 sources" in generic runtime policy. Those belong in explicit Workflow/Agent logic or evaluators.

### Resource authority vs information flow

Resource Authority answers whether an Execution may directly access a resource. It does not automatically answer whether already-derived information may be passed to another Execution.

For example, a parent may have access to confidential resource A while a child deliberately does not. If the parent wrote A-derived information into scratch notes, automatically exposing all parent notes to the child would bypass the intended information boundary.

Therefore child creation must derive both:

```text
effective authority
memory/context visibility
```

The second is an explicit delegation/information-flow decision. v0.4 does not require a full taint-tracking system, but note ancestry must not be treated as permission.

---

## 9. Memory resources and views

The architecture avoids creating copied physical memory stores for every nested Execution.

Instead, memory is shared by reference with policy-controlled views:

```text
Underlying Memory Resources
          ↓
      Memory View
          ↓
      Execution
```

The default memory forms are:

```text
Structured Memory
Artifacts / Files
Working Notes
```

### Structured Memory

Schema-defined shared application information.

A view may restrict fields:

```text
Parent can access:
  user.*
  project.*
  private.*

Child receives:
  user.language
  project.sources
```

Views should distinguish readable and writable subsets where useful.

### Artifacts / Files

Larger persistent work products or workspaces. Access is controlled through resource bindings and authority.

### Memory provenance

A Structured Memory write should be attributable to:

```text
writer Execution
WriteMemory Effect
source Event/evidence when available
```

This is especially important for correction, audit, and evaluation.

---

## 10. Working Notes

The current v0.4 hypothesis is that Working Notes use stack-like ancestry, but **ancestry does not itself grant visibility**.

### Nested Execution inheritance

When a parent calls/spawns a child:

```text
parent Working Note frames
        ↓
child visibility/delegation filter
        ↓
selected inherited read-only view
        +
child-local writable frame
        ↓
child ends
        ↓
pop child-local frame
```

The intended semantics are:

```text
ancestry
  determines what could be inherited

visibility/delegation policy
  determines what the child actually sees

child-local frame
  receives child writes
```

A child may therefore use selected parent scratch context without mutating parent frames or receiving confidential notes merely because it is a descendant.

> **Note ancestry does not imply visibility.**

### No automatic commit upward

A child's Working Notes do not automatically merge into the parent.

If the child discovers something that must survive, use an explicit channel:

```text
terminal result
Structured Memory write
Artifact/File
peer/parent message when appropriate
```

A future explicit note-commit operation can be tested, but v0.4 should not make Working Notes a second implicit shared-memory system.

### Bounded notes

Prefer bounds per frame/view, ideally by context/token budget rather than a single global row count. A child should not be able to evict unrelated parent notes from active context merely by writing heavily to its own frame.

### Pop vs erase

Popping a frame means it is no longer part of active reasoning context. The runtime may still retain it in trace/debug archives according to policy.

### Future `fork()`

The stack model leaves room for a future fork operation:

```text
visible stack
  A
  B
  C
   ↓ fork

branch 1: A B C D1
branch 2: A B C D2
```

A fork would inherit the currently visible note view subject to the new Execution's authority and visibility policy. Snapshot/reference/copy-on-write details remain implementation questions.

Stage-to-Stage Working Note handoff is a composition rule and is defined in [`composition.md`](composition.md), not here.

---

## 11. Context compilation

Memory and history are not automatically equal to model context.

Each Agent model call or LLM Stage can compile a context from eligible information:

```text
instructions
current Stage/Agent input
relevant Events
selected history
selected Structured Memory
visible Working Notes
selected Artifacts/resource snippets
Active Capability View
```

Adapters may run around model-call boundaries as defined in [`composition.md`](composition.md).

The context compiler should be free to trim, rank, summarize, retrieve, or pack content as long as it respects authority/visibility and provenance requirements.

For child Executions, context compilation begins from the child's explicitly delegated memory/context view, not the full parent view.

---

## 12. User input and confirmation

Two mechanisms must remain distinct.

### Semantic user input

When the program needs the user to provide or revise meaning:

```text
RequestUserInput Effect
        ↓
Harness presents request
        ↓
Execution WAITING
        ↓
user reply
        ↓
UserInput Event
        ↓
controller interprets meaning
```

Example:

```text
"Modify the draft to use X, then send it."
```

### Mechanical Effect confirmation

For consequential actions, the Harness may require confirmation for the exact Effect payload:

```text
proposed Effect
      ↓
Harness confirmation gate
      ↓
Confirm / Deny
```

If the payload changes, the prior exact-payload confirmation should no longer apply.

### Semantic authorization evidence

An Effect may carry evidence that an earlier user Event appears to authorize it:

```text
authorizationEvidence:
  [user_event_381]
```

But a model should not authoritatively set:

```text
user_confirmed = true
```

and bypass Harness policy.

A useful future policy model may distinguish:

```text
none
semantic   # explicit user instruction can satisfy policy
mechanical # exact Effect payload requires Confirm/Deny
```

Structured Memory can store durable preferences such as `auto_send_weekly_report = true`, but these should be treated as policy/evidence inputs, not universal proof of consent.

---

## 13. Failure semantics

An operation failure is normally an Event before it is a terminal Execution failure.

```text
UseCapability
   ↓
service fails
   ↓
CapabilityFailure Event
   ↓
controller can retry / choose alternative / report limitation
```

An Execution reaches `FAILED` when the controller/runtime determines it cannot validly continue, not merely because one Effect failed.

Infrastructure retry policy belongs to the Harness. Semantic retries/alternative strategy belong to Workflow or Agent logic.

---

## 14. Durability and recovery

Durability is a deployment capability of the same runtime semantics, not a separate programming model.

When enabled, persist enough runtime truth to reconstruct:

```text
ExecutionContexts
mailboxes / Event cursors
Effect requests and results
pending operations
child relationships
lifecycle transitions
memory commits
terminal results
confirmation state
correlation / causation metadata
```

On restart:

1. rebuild ExecutionContexts;
2. restore pending work/mailboxes;
3. determine which Executions are READY vs WAITING;
4. resume through ordinary scheduler semantics.

A simple deployment may keep all of this in memory.

---

## 15. Provenance and tracing

Provenance should separate several questions:

```text
What capability class was used?
What concrete capability was used?
What bound resource/source was accessed?
Which EffectRequest caused it?
Which Execution requested it?
Which Event/result supported a later memory write?
```

Example:

```text
Event: retrieval result
  sourceExecution: exec-17
  capabilityClass: knowledge_retrieval
  capability: knowledge_query
  resource: project-papers
  causedBy: effect-381
```

Trace structure should eventually capture both:

```text
ownership edges
communication/effect causation edges
```

rather than pretending every interaction is a parent-child call tree.

---

## 16. Simple and distributed deployments

The architecture should scale by progressively enabling runtime machinery rather than creating separate semantics.

### Minimal profile

```text
in-process Harness
in-memory ExecutionContexts
simple FIFO scheduling
synchronous/local capabilities where possible
no durability
```

### Richer profile

```text
durable store
multiple workers
remote capabilities
persistent mailboxes
budgets/deadlines
confirmation
recovery
observability
```

### Distributed profile

```text
logical Harness
  ├── worker A
  ├── worker B
  └── worker C
```

A child may run on another worker, but parent/child semantics remain unchanged.

---

## 17. Runtime invariants

> **One logical Harness manages many Executions.**

> **ExecutionContext belongs to an Execution; Stages and Adapters do not get independent ExecutionContexts.**

> **Events wake Executions through routing/scheduling; persistence alone does not wake them.**

> **Externally meaningful actions cross the Effect gateway.**

> **Effects and pending operations are attributed to the Execution; local composition boundaries only mark completion dependencies.**

> **Runtime authority/policy constrains controllers; controllers do not grant themselves permission.**

> **Cross-Execution memory/context visibility is explicitly delegated; ancestry alone grants no visibility.**

> **Important shared semantic information uses explicit memory/results/messages rather than accidental Working Note propagation.**

> **Simple and durable/distributed deployments share the same semantics.**
