# Agent Kernel Architecture v0.4

> Working mental model for implementation and experimentation. v0.4 keeps the kernel compact and leaves unresolved ideas for future testing.

## 1. Introduction

The architecture should support both simple and complex LLM programs without forcing every application to enable every runtime mechanism.

```text
simple
  function / LLM calls

structured
  Workflow

open-ended
  Agent

larger systems
  networks of Executions
```

A **Workflow** has system-defined semantic topology. An LLM may choose among predefined branches, but the application defines the possible paths.

An **Agent** has model-directed semantic progression. The model may repeatedly decide what to do next until it decides to finish.

```text
Workflow
  application owns the control graph

Agent
  model owns the open-ended semantic path
```

They are complementary and can be composed under one kernel.

---

## 2. Kernel Model

### 2.1 Execution and Harness

The kernel defines the contract between **Execution** and **Harness**.

```text
                 one logical Harness
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
      Execution     Execution     Execution
          │
          │ EffectRequest
          ▼
       Harness
  authorize / dispatch
   track / persist
          │
          ▼
        Event
          │
          ▼
      Execution
```

The two kernel-managed executable kinds are:

```text
ExecutableDefinition
├── AgentDefinition
└── WorkflowDefinition
```

A normal function call or LLM call is lightweight computation inside a Stage or Agent loop, not a separate Execution.

An Execution boundary is useful when work needs independent identity, lifecycle, waiting, authority, mailbox, durability, cancellation, or parent/child composition.

> **Blocks run inside an Execution. `call` or `spawn` creates a new Execution.**

### 2.2 Replaceable Mechanisms

The kernel defines semantics, not implementations.

Replaceable mechanisms include model providers, Agent executors, retrieval frameworks, MCP/HTTP/local transports, storage systems, sandboxes, message brokers, observability backends, and physical workers.

> **The kernel defines what must remain true. Implementations decide how to make it true.**

---

## 3. ExecutableDefinition

An `ExecutableDefinition` is a reusable specification from which the Harness creates an Execution.

```text
Definition
+ parameters
+ runtime policy
        ↓
     Execution
```

### 3.1 Definition Kinds

```text
AgentDefinition
  instructions / prompt
  model configuration
  Agent executor configuration
  memory declarations
  requested authority/resources
  Adapter configuration

WorkflowDefinition
  Stages
  transitions
  Adapter configuration
  memory declarations
  requested authority/resources
```

### 3.2 Runtime Policy

Runtime policy applies deployment-specific operational limits such as deadline, cost/token limits, maximum child Executions, parallelism, retry limits, persistence, confirmation requirements, and allowed authority subset.

Semantic quality requirements should normally remain explicit Agent/Workflow logic rather than generic Harness policy.

### 3.3 Required and Optional Authority

A Definition may request authority but cannot grant it to itself.

```text
required:
  read project papers

optional:
  web search
  spawn CriticAgent
```

If required authority is denied, creation fails. Optional authority may be omitted.

### 3.4 Skills

`ExecutableDefinition` and Agent Skills remain separate in v0.4. A Definition is something the kernel can instantiate; a Skill is reusable knowledge, instructions, resources, or behavior available to an Agent.

---

## 4. Execution, Workflow, Agent, and Memory

### 4.1 Execution Context

Each Execution has an `ExecutionContext` managed by the Harness.

```text
ExecutionContext
├── metadata
├── lifecycle
├── local/control data
├── effective authority
├── bound resources
├── mailbox
├── memory view
├── pending-operation references
└── terminal result
```

Blocks do not receive independent ExecutionContexts.

### 4.2 Lifecycle and Activation

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

An **Activation** is one scheduled period of `RUNNING`.

A long-lived Execution may therefore remain alive while consuming no CPU between Activations.

### 4.3 Execution I/O

```text
Input
  Start Input
  Events

Output
  EffectRequests
  Terminal Result
```

Effects request external/runtime actions. Events report what happened.

### 4.4 Workflow and Stages

A Workflow is a system-defined graph of **Stages** and transitions.

```text
Stage A → Stage B → Stage C
```

The Workflow designer defines the possible topology.

A Stage is the main encapsulation boundary. It may perform complex work internally, but it transitions only after its required work has settled.

For v0.4, the direct value crossing a Stage transition is:

```text
text | none
```

Complex shared data should normally use Structured Memory, Artifacts, or Files.

Stage types:

```text
Stage
├── Function Stage
├── LLM Stage
├── Agent Stage
└── Workflow Stage
```

#### Function Stage

Runs program code. It may programmatically request permitted Effects such as retrieval, tool use, memory writes, or child creation.

#### LLM Stage

Contains bounded LLM work. It may include one or more predetermined LLM calls and internal Effects as long as continuation remains program-defined.

Examples:

```text
LLM
 ↓
RAG Effect
 ↓
collect result
 ↓
text output
```

or:

```text
LLM
 ↓
RAG
 ↓
LLM
 ↓
text output
```

Both can remain one Stage if the internal sequence is predefined.

#### Agent Stage

Calls or spawns an Agent Execution and treats it as one Workflow Stage.

```text
Workflow
   ↓
Agent Stage
   ↓
Agent Execution
   ↓
collect result
   ↓
next Stage
```

The Agent's internal loop is hidden behind the Stage boundary.

#### Workflow Stage

Calls another Workflow Execution and similarly treats it as one Stage.

#### Stage Completion Barrier

Before a Stage transitions:

1. required internal computation is complete;
2. required blocking Effects have resolved;
3. required Events/results are collected;
4. Stage Adapters have completed;
5. the final `text | none` result is ready.

### 4.5 Agent

An Agent owns an open-ended semantic loop.

```text
context
  ↓
LLM
  ↓
decide next action
  ↓
Effects
  ↓
Events/results
  ↓
LLM again
  ↓
...
```

The defining property is not the number of LLM calls. A Workflow may contain several LLM calls and remain a Workflow if the program defines the possible continuation.

An Agent is different because the model repeatedly chooses whether and how to continue.

Blocking Effects suspend the next Agent step until required results arrive. Future non-blocking Effects may allow the Agent to continue while results arrive later as Events.

When an Agent is used inside a Workflow Stage, the Stage does not transition until all required Stage-owned work has settled.

### 4.6 Adapters

An **Adapter** is a lightweight computation attached inside a Stage boundary or Agent loop. It does not participate as a Workflow Stage.

```text
Stage
  input
    ↓
  Input Adapter
    ↓
  computation
    ↓
  Output Adapter
    ↓
  adapted result
    ↓
  transition
```

Inside an Agent loop:

```text
Agent controller
      ↓
Input Adapter
      ↓
LLM
      ↓
Output Adapter
      ↓
next Agent decision
```

v0.4 supports:

```text
Adapter
├── Function Adapter
└── LLM Adapter
```

Adapters may pass, transform, or reject a value.

They may read only an explicitly exposed subset of the enclosing memory view.

For v0.4 they have no memory-write, capability/tool, retrieval, spawn/call, or messaging authority.

> **Adapter scope ⊆ enclosing Stage/Execution scope.**

### 4.7 Authority, Capabilities, and Effects

Execution authority includes Capability Authority, Resource Authority, Spawn Authority, and Message Authority.

Capabilities fall into two broad classes:

```text
Knowledge Retrieval
  web search
  database query
  file read
  vector retrieval

Tool Usage
  execute code
  send email
  modify file
  external action API
```

The initial Effect vocabulary is:

```text
EffectRequest
├── UseCapability
├── WriteMemory
├── SpawnExecution
├── SendMessage
└── RequestUserInput
```

A Function Stage or Agent may request Effects. Effects are attributed to the enclosing Execution.

### 4.8 Call, Spawn, Messaging, and Waiting

`spawn` creates a new Agent or Workflow Execution.

```text
Parent Execution
      ↓
spawn
      ↓
Child Execution
```

`call` means:

```text
spawn
+ wait for terminal result
```

Parent/child result flow uses terminal-result Events. Peer Agent communication uses messages.

Pending external work is tracked by the Harness:

```text
Effect
  ↓
Pending Operation
  ↓
WAITING
  ↓
result Event
  ↓
READY
```

### 4.9 User Input and Confirmation

Two mechanisms are distinct.

Semantic user input:

```text
RequestUserInput
  ↓
user free-form response
  ↓
UserInput Event
  ↓
Agent / Workflow interprets it
```

Mechanical Effect confirmation:

```text
consequential Effect
      ↓
Harness
      ↓
[Confirm] [Deny]
```

Mechanical confirmation should preferably bind to the exact Effect payload.

An Effect may carry authorization evidence such as the originating user Event, but the Harness should not rely on a model-authored `user_confirmed = true` boolean for consequential actions.

### 4.10 Memory

v0.4 uses shared memory resources with scoped views rather than copied nested memory stores.

```text
Shared Memory Resources
        ↓
    Memory View
        ↓
Stage / Agent / child Workflow
```

#### Structured Memory

Explicit schema-defined shared state.

Examples:

```text
user.language
task.requirements
research.sources
important_note
```

Structured Memory is the preferred channel for important information that must survive or be visible across Stage/Execution boundaries.

#### Artifacts / Files

Persistent larger data such as reports, code, datasets, and generated assets.

#### Working Notes

Working Notes are temporary scratch memory with stack semantics.

```text
parent note frame
        ↓
push child frame
        ↓
child reads parent + own frame
child writes only own frame
        ↓
child ends
        ↓
pop child frame
```

Nested Agents/Workflows can therefore see parent notes without mutating them.

Important child information should not automatically merge upward. If a child needs to communicate something durable, it should use terminal result, Structured Memory, Artifact/File, or explicit Agent message.

A future implementation may experiment with explicit note commit, but v0.4 does not define it. If a child needs to preserve an important note today, the preferred pattern is to write it into an explicit Structured Memory field such as `important_note`.

For sequential Workflow Stages, note handoff is configurable:

```text
default:
  do not pass Stage notes

optional:
  pass notes to next Stage
```

Working Notes may be removed from active context when their frame is popped while still being archived for tracing/debugging.

> **Shared memory is explicit; scratch memory is stack-based and temporary.**

### 4.11 Provenance

Event provenance may record source Execution, capability class, capability, bound resource, user, external system, and causing EffectRequest.

Memory provenance can point back to the Event that supported a write.

---

## 5. Harness

The **Harness** is one logical runtime managing many Executions.

```text
                 Harness
          ┌────────┼────────┐
          ▼        ▼        ▼
       exec-1   exec-2   exec-3
```

An Execution owns an ExecutionContext, not a separate Harness. Blocks and Adapters own neither.

### 5.1 Creation and Registry

The Harness creates and registers Executions from Definition, parameters, creator authority, runtime policy, and resource availability.

Child creation uses the same mechanism. No Harness merging is needed.

### 5.2 Scheduler

The scheduler chooses READY Executions and creates Activations.

A simple deployment may use an in-process queue. Larger deployments may add priorities, deadlines, fairness, parallelism, and worker placement.

### 5.3 Effect Gateway

All externally meaningful actions pass through the Harness.

```text
EffectRequest
    ↓
authorize
validate
dispatch
track
```

The Harness performs mechanical checks, not semantic quality judgments.

### 5.4 Pending Operations

The Harness records outstanding external work and correlates completed results back to the requesting Execution.

This allows controller-facing `await` semantics without keeping the Execution continuously RUNNING.

### 5.5 Events and Wake-up

```text
external result
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

Wake-up is a routing/scheduling behavior.

### 5.6 Runtime State Store and Recovery

When durability is enabled, the Harness persists runtime truth such as ExecutionContexts, mailboxes, Effects, pending operations, child relationships, and terminal results.

On restart, it reconstructs Executions and resumes from recorded state.

A simple deployment may use only in-memory storage.

### 5.7 Runtime Policy

Runtime policy may constrain cost/tokens, deadlines, parallelism, child count, retry behavior, persistence, authority, and confirmation requirements.

### 5.8 One Logical Harness, Many Workers

Physical execution may be distributed without changing `spawn`, `call`, Event, or Effect semantics.

---

## 6. Summary

v0.4 can be summarized as:

```text
Kernel-managed Executions
  Agent
  Workflow

Workflow
  system-defined topology
  Stage boundaries

Stage
  Function
  LLM
  Agent
  Workflow

Adapter
  Function or single LLM
  attached inside Stage / Agent loop
  no independent runtime actions

Agent
  model-directed semantic loop

Memory
  Structured Memory
  Artifacts / Files
  Working Notes stack

Runtime
  one logical Harness
  many ExecutionContexts

Interaction
  Effects out
  Events in
```

Key invariants:

> **Workflow topology is system-defined; Agent progression is model-directed.**

> **A Stage hides its internal work and transitions only after required work and Adapters settle.**

> **Adapters transform or validate boundaries; they do not control topology or perform independent runtime actions.**

> **Nested Executions share memory resources through scoped views rather than copied memory hierarchies.**

> **Structured Memory is the explicit durable communication channel; Working Notes are temporary stack-based scratch context.**

> **Blocks run inside an Execution. `call` or `spawn` creates another Execution.**

> **One logical Harness manages many Executions.**

Open areas for future testing include non-blocking Effects, `fork()` semantics, explicit Working Note commit, richer Adapter attachment points, dynamic Workflow topology mutation, distributed scheduling, Skill/Definition convergence, and conformance tests.

> **Add runtime machinery only when it makes real applications easier to express, operate, or reason about.**
