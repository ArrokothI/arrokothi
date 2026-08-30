# Runtime Architecture

> **Status: current v0.4 runtime semantics.**
>
> Read [`mental-model.md`](mental-model.md) and [`workflow-model.md`](workflow-model.md) first. This document explains how one logical Harness manages Executions, memory, pending work, messaging, confirmation, durability, and provenance.

## 1. One logical Harness

The Harness is the runtime boundary between controller intent and reality.

```text
                 one logical Harness
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      Execution    Execution    Execution
```

An Execution does **not** own its own Harness. Instead, the Harness manages one `ExecutionContext` per live Execution.

```text
Harness
  ├── ExecutionContext A
  ├── ExecutionContext B
  └── ExecutionContext C
```

This is similar to one operating-system kernel managing many processes. Parent and child Executions receive separate runtime identity/context under the same logical Harness; there is no Harness merging operation.

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
correlation cursors
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

The Runtime State Store is persistence, not a wake-up mechanism.

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

## 5. Effects and the Effect Gateway

All externally meaningful actions cross the Harness through an EffectRequest.

```text
controller / Stage
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

Effects are attributed to the enclosing Execution, even when the Effect was requested by a local Function Stage or LLM Stage.

A Stage may designate a subset of pending work as **required for the current Stage's completion**. This is completion/correlation metadata, not Stage ownership of the Effect.

This provides one place for:

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

---

## 6. Pending operations

If an Effect does not finish within the current Activation, the Harness records a pending operation.

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
EffectRequest
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

Non-blocking Effect semantics are intentionally not fully fixed in v0.4. A future Agent may continue while some Effects remain pending, with later Events folded into future Activations. The runtime must preserve correlation and make completion requirements explicit.

A pending operation may therefore carry completion metadata such as:

```text
required for current Agent step
required for current Workflow Stage
required for Execution terminal completion
not currently blocking
```

This does not change Effect ownership: the Effect remains attributed to its requesting Execution.

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
```

The child also receives explicitly derived memory/context visibility. Ownership ancestry alone does not grant access to parent memory or Working Notes.

### Call

`call` is a convenience semantic:

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

Do not hide semantic quality requirements such as "answer must cite 3 sources" in generic runtime policy. Those belong in explicit Workflow/Agent logic or evaluators.

### Resource authority vs information flow

Resource Authority answers whether an Execution may directly access a resource. It does not automatically answer whether information already derived from that resource may be passed to another Execution.

For example, a parent may have access to confidential resource A while a child deliberately does not. If the parent wrote information from A into scratch notes, automatically exposing all parent notes to the child would bypass the intended information boundary.

Therefore child creation must derive both:

```text
effective authority
memory/context visibility
```

The second is an explicit delegation/information-flow decision. v0.4 does not require a full taint-tracking system, but it must not make note ancestry equivalent to permission.

---

## 9. Memory resources and views

The current design avoids creating copied physical memory stores for every nested Execution.

Instead, memory is shared by reference with policy-controlled views:

```text
Underlying Memory Resources
          ↓
      Memory View
          ↓
Execution / Stage / Adapter
```

The default architecture contains:

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

## 10. Working Notes stack

The current v0.4 hypothesis is that Working Notes use stack-like ancestry rather than isolated per-child memory, **but ancestry does not itself grant visibility**.

### Nested Execution inheritance

When a parent calls/spawns a child:

```text
parent Working Note frames
        ↓
child visibility/delegation filter
        ↓
selected inherited read-only frames/view
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

A child may therefore use selected parent scratch context without silently mutating parent frames or receiving confidential notes merely because it is a descendant.

> **Note ancestry does not imply visibility.**

This also produces a natural future `fork()` model. A fork can inherit the currently **visible** note view, subject to the forked Execution's authority and visibility policy, then add a branch-local frame:

```text
visible stack
  A
  B
  C
   ↓ fork

branch 1: A B C D1
branch 2: A B C D2
```

The implementation can later decide whether frames use snapshots, references, or copy-on-write. v0.4 specifies intended behavior, not storage strategy.

### No automatic commit upward

A child's Working Notes should not automatically merge into the parent.

If the child discovers something that must survive, it should use an explicit channel:

```text
terminal result
Structured Memory write
Artifact/File
peer/parent message when appropriate
```

A future explicit note-commit operation can be tested, but the current recommendation is to define a Structured Memory field such as `important_note` when a durable semantic value is required.

### Bounded notes

The older global "last N rows" behavior should not allow a child to evict unrelated parent notes.

Prefer bounds per frame/view, ideally by context/token budget rather than a single global row count.

### Pop vs erase

Popping a frame means it is no longer part of active reasoning context. The runtime may still retain it in trace/debug archives according to policy.

---

## 11. Sequential Workflow Stage note handoff

Sequential Stages are not parent/child Executions, so their note behavior differs.

Current proposal:

```text
default:
  Stage A Working Notes do not flow to Stage B

optional:
  explicitly hand off selected/all notes
```

Default no-pass prevents scratch notes from becoming hidden Workflow dataflow.

When pass is enabled, treat it as a handoff into the next Stage's working frame rather than keeping an ever-growing stack of every previous Stage.

Important information should still prefer:

```text
Stage result
Structured Memory
Artifact/File
```

---

## 12. Context compilation

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

Adapters may run around this boundary as defined in [`workflow-model.md`](workflow-model.md).

The context compiler should be free to trim, rank, summarize, retrieve, or pack content as long as it respects authority/visibility and provenance requirements.

For child Executions, context compilation must begin from the child's explicitly delegated memory/context view rather than from the full parent view.

---

## 13. User input and confirmation

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

## 14. Failure semantics

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

## 15. Durability and recovery

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

## 16. Provenance and tracing

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

## 17. Simple and distributed deployments

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

The child may run on another worker, but parent/child semantics remain unchanged.

---

## 18. Runtime invariants

> **One logical Harness manages many Executions.**

> **ExecutionContext belongs to an Execution; Blocks and Adapters do not get independent ExecutionContexts.**

> **Events wake Executions through routing/scheduling; persistence alone does not wake them.**

> **Every externally meaningful action crosses the Effect gateway.**

> **Runtime authority/policy constrains controllers; controllers do not grant themselves permission.**

> **Cross-Execution memory/context visibility is explicitly delegated; ancestry alone grants no visibility.**

> **Important shared semantic information uses explicit memory/results/messages, not accidental Working Note propagation.**

> **Working Notes stack semantics are a current policy hypothesis and should be tested, especially with future `fork()`.**

> **Simple and durable/distributed deployments share the same semantics.**
