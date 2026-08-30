# Mental Model

> **Status: canonical conceptual model.**
>
> This document defines what Arrokoth means. It intentionally avoids detailed TypeScript APIs, persistence layouts, scheduler algorithms, or provider-specific mechanisms. Those belong in the lower-level documents.

## 1. The core idea

Arrokoth is an execution kernel for long-lived Agents and Workflows.

Its central runtime concept is an **Execution**:

> **An Execution is an independently managed runtime entity with identity, lifecycle, authority, state/memory bindings, pending work, and optional communication endpoints.**

In v0.4, the primary Execution kinds are:

```text
ExecutionDefinition
├── AgentDefinition
└── WorkflowDefinition
        ↓ instantiate
     Execution
```

Function calls and LLM inference are normally computations *inside* an Execution. They do not receive independent runtime identity merely because they are runnable.

This gives the first important rule:

> **Composition does not imply an Execution boundary. Independent runtime identity does.**

A future version may add another Execution kind if a real use case needs independent lifecycle/authority/state without naturally being an Agent or Workflow. v0.4 does not need such a kind.

---

## 2. Why Execution is a real boundary

The Execution boundary is where several concerns align:

```text
identity / addressability
lifecycle / waiting
authority
memory view
mailbox / Events
pending operations
cancellation
ownership
budget / deadline
durability / recovery
trace identity
```

A local function call does not normally need these semantics. A single LLM inference does not normally need them either.

This is why Arrokoth does **not** define every computation as an Execution and then rely on an implementation optimization to erase the simple cases. If identity, mailbox, lifecycle, and cancellation are part of the semantics, they cannot be optimized away while remaining observationally equivalent.

Instead:

```text
Workflow / Agent
  independently managed
  → Execution

Function / LLM / Adapter
  local computation inside an Execution
  → no independent Execution by default
```

`call` and `spawn` are the explicit operations that introduce child Execution boundaries.

### Does this deserve an Execution?

Ask whether this piece of work needs to **continue existing as an independently managed thing** after the current local computation.

If another part of the system may need to find it later, send it new input, wait for it, cancel it, give it separate permissions or limits, let it manage child work, or recover it after a restart, it probably deserves an Execution.

If it simply starts and finishes as part of its caller—such as an LLM inference, parser, retrieval step, or Adapter—it usually should stay inside the enclosing Execution.

---

## 3. Workflow and Agent are complementary

The central semantic distinction is who owns the possible progression of the program.

### Workflow

> **A Workflow has system-defined semantic topology.**

The application defines the possible stages and transitions. An LLM may still participate in the Workflow, including selecting among predefined branches.

Examples that remain Workflows:

```text
LLM → retrieval → LLM
```

```text
LLM classifier
  ├── route A
  └── route B
```

```text
draft → evaluator → revise → evaluator
```

The presence of LLMs, loops, tools, or model-based routing does not make a Workflow an Agent.

### Agent

> **An Agent has model-directed open-ended semantic progression inside hard runtime boundaries.**

The model repeatedly decides what semantic action(s) to take next based on observations.

```text
LLM
 ↓
choose actions
 ↓
Effects / child calls / messages
 ↓
observations
 ↓
LLM chooses again
```

The number of LLM calls does not define Agent-ness. A Workflow Stage may contain several predetermined LLM calls. What matters is whether the model owns an open-ended continuation space.

### Same task, different architecture

The same externally visible task may be implemented as a Workflow or an Agent.

For example, retrieval can be:

```text
Workflow:
  formulate query → retrieve → synthesize
```

or:

```text
Agent:
  model decides whether/when/how often to retrieve
```

The category describes control ownership, not task output.

---

## 4. Events and Effects

An Execution is advanced by a **controller** appropriate to its kind.

- A Workflow controller runs Stages and follows application-defined transitions. 
- An Agent controller runs the agentic loop in which the model chooses the next semantic action. .

When the controller needs to interact with the runtime or outside world, it requests an Effect. Results return to the Execution as Events.

```text
Event(s)
   ↓
Execution
   ↓
controller
   ├── local computation
   │   function / LLM / Adapter
   │
   └── EffectRequest(s), when needed
              ↓
           Harness
     authorize / coordinate
              ↓
    runtime-managed interaction
       ├── capability / resource
       ├── child or peer Execution
       └── user / external system
              ↓
       resulting Event(s)
              ↓
      relevant Execution(s)
```
### Event

An **Event** is an observation delivered to an Execution.

Examples:

```text
start input
user input
capability result
capability failure
child terminal result
peer message
confirmation decision
timer / timeout
cancellation/control event
```

### Effect

An **EffectRequest** is a requested interaction with the runtime or outside world.

The v0.4 vocabulary is deliberately small:

```text
EffectRequest
├── UseCapability
├── WriteMemory
├── SpawnExecution
├── SendMessage
└── RequestUserInput
```

Effects are proposals, not claims that something happened.

> **Models/controllers propose. The Harness authorizes and coordinates. Executors and the environment establish what actually happened.**

A tool failure therefore normally becomes an Event that the Agent or Workflow can respond to, rather than automatically failing the whole Execution.

---

## 5. Response is not completion

A long-lived Agent may send many responses while remaining alive.

```text
message
  ↓
Agent responds
  ↓
WAITING
  ↓
next message
```

Likewise, a child or peer may send a message without completing/termination.

Therefore:

> **A response/message is not a terminal result.**

An Execution may optionally produce a terminal result when it reaches `COMPLETED`, but it need not be designed around a mandatory `input → output` function shape.

A terminal result is definition/interface-specific and may be typed or schema-bound. It is independent from any Workflow-specific experiment about what value may cross a Stage transition.

---

## 6. Operational control and semantic control are different

The controller determines semantic work appropriate to its kind:

```text
Workflow controller
  follows system-defined topology

Agent controller
  allows model-directed semantic progression
```

The Harness owns operational control:

```text
scheduling
lifecycle transitions
Effect authorization
pending-operation tracking
wake-up
persistence/recovery
budgets/deadlines
mechanical confirmation
routing
```

An Agent does not decide that it is `WAITING`; the runtime derives that state from whether runnable work exists.

This separation is important:

> **Semantic control ≠ operational control.**

---

## 7. Authority and exposure are different

An Execution may be authorized to use more capabilities/resources than should appear in one model context.

Conceptually:

```text
available resources/capabilities
          ↓
   Authority Envelope
          ↓
   Active/Exposed View
```

The **Authority Envelope** answers:

> What may this Execution ever do or access?

The **Active/Exposed View** answers:

> What subset is currently visible or convenient to the controller/model?

```text
Active View ⊆ Authority Envelope
```

Changing exposure inside existing authority is context engineering, not privilege escalation.

Authority includes more than tools:

```text
Capability Authority
  which capabilities may be invoked

Resource Authority
  which bound resources may be read/written

Spawn Authority
  which Agent/Workflow Definitions may be instantiated

Message Authority
  which peer targets may receive messages
```

Definitions request authority; the Harness grants or narrows it. **Required authority** denied at creation means creation fails; **optional authority** may be omitted.

A child Execution must not receive authority beyond what its creator is allowed to delegate.

A child's Resource Authority controls which resources it may access directly. Separately, the runtime must control which information from the parent is exposed to the child. **A child should not automatically see all parent memory or Working Notes merely because it is a descendant.** Parent-to-child memory/context visibility must therefore be explicitly delegated or filtered.

---

## 8. Ownership and communication are different

The ownership graph and communication graph answer different questions.

```text
Ownership tree

Workflow W
├── Agent A
├── Agent B
└── Workflow C
```

```text
Communication graph

Agent A ↔ Agent B
    ↘     ↗
      Agent D
```

Ownership is useful for:

```text
authority derivation
budget/deadline allocation
cancellation propagation
supervision
trace ancestry
```

Communication permission only means a message may be sent.

Therefore:

```text
can message X ≠ owns X
can message X ≠ can cancel X
can message X ≠ can inspect X memory
```

---

## 9. Memory and context are different

**Memory** is information retained across computation/Activations.

**Context** is the selected information made available to a controller/model during the current computation.

```text
memory / Events / resources / instructions
                 ↓
          context compilation
                 ↓
          current model context
```

The current design uses three useful memory forms:

```text
Structured Memory
Working Notes
Artifacts / Files
```

### Structured Memory

Schema-defined, explicit information intended to survive and be shared where authorized.

Examples:

```text
preferred_language
research_sources
task_requirements
important_note
```

### Artifacts / Files

Larger persistent work products such as reports, code, datasets, or generated files.

### Working Notes

Temporary scratch context. The exact storage and labeling policy is runtime architecture rather than a foundational invariant.

The current v0.4 proposal uses stack-like ancestry with **explicitly delegated visibility** across Execution boundaries:

```text
parent Working Notes
        ↓
child visibility/delegation filter
        ↓
inherited read-only note view
        +
child-local writable frame
```

A child may therefore benefit from selected parent scratch context without automatically seeing every ancestral note or mutating parent frames.

> **Note ancestry does not imply visibility.**

The fundamental rule is:

> **Important cross-Execution or cross-Stage information should move through an explicit result, Structured Memory, Artifact/File, or authorized message rather than accidental scratch-memory sharing.**

History is not the same thing as semantic memory. Events, Effects, messages, lifecycle transitions, and traces form execution history and provenance.

---

## 10. Capabilities and bound resources

A **Capability** is something an Execution may ask the Harness to use.

Useful high-level classes are:

```text
Knowledge Retrieval
  web search
  database query
  file read
  vector retrieval
  bound-resource retrieval

Tool Usage
  execute code
  modify files
  send email
  invoke an external action API
```

A **bound resource** is the concrete object the capability operates on.

Examples:

```text
papers         → knowledge://project-papers
project_memory → memory://project
workspace      → workspace://run-123
```

Bindings answer **which resource**; authority answers **what may be done with it**.

Retrieval is usually a capability, not its own fundamental Execution kind.

---

## 11. Parent/child composition

`spawn` creates a new child Agent or Workflow Execution.

```text
Parent Execution
      ↓ spawn
Child Execution
```

`call` is conceptually:

```text
spawn
+ wait for child Terminal Result
```

The child receives its own identity, lifecycle, effective authority, mailbox, pending operations, execution-local/control data, and delegated memory/context view under the same logical Harness.

The parent normally receives the child's terminal result as an Event.

Peer communication is different:

```text
call child
  new Execution + wait for terminal result

ask peer
  existing Execution + send message + wait for reply
```

This distinction should remain explicit.

---

## 12. One logical Harness

Executions do not each own a separate Harness.

```text
                 Harness
          ┌────────┼────────┐
          ▼        ▼        ▼
       exec-1   exec-2   exec-3
```

The Harness is one logical runtime that may be implemented in-process or distributed across many workers.

Physical placement is not semantic. A child may execute remotely without changing the meaning of `spawn`, `call`, Event, or Effect.

A simple application may use the same architecture with an in-memory store and simple scheduler. More demanding deployments can progressively add durability, remote workers, richer policy, and distribution.

> **The same programming model should impose little overhead on simple programs and expose additional runtime mechanisms only when needed.**

---

## 13. Core invariants

The design should protect these distinctions aggressively:

```text
Definition       ≠ Execution
Event            ≠ Effect
response         ≠ terminal result
authority        ≠ exposure
memory           ≠ context
ownership        ≠ communication
semantic control ≠ operational control
Workflow         ≠ Agent
Stage            ≠ Execution
Capability       ≠ Execution
```

And these positive rules:

> **Execution means independent runtime identity.**

> **Workflow topology is system-defined.**

> **Agent progression is model-directed and open-ended.**

> **Models/controllers request; the runtime and environment establish reality.**

> **Composition alone does not imply another Execution boundary.**

> **Cross-Execution memory/context visibility is explicitly delegated; ancestry alone grants no visibility.**

The lower-level documents define Workflow Stage semantics, Adapter behavior, Working Notes policy, pending operations, durability, and implementation mapping without changing these fundamentals.
