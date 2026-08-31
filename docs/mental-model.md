# Mental Model

> **Status: canonical conceptual overview for ArrokothI.**
>
> This document should be enough to understand the shape of the system. It defines the major concepts and the boundaries between them, but deliberately leaves tricky semantics to the dedicated concept documents. It does not define TypeScript APIs, storage layouts, scheduler algorithms, provider SDK behavior, or protocol wire formats.

## 1. The core idea

ArrokothI is an **execution kernel for long-lived Agents and Workflows**.

The central runtime entity is an **Execution**:

> **An Execution is a logically independent unit of runtime work with its own identity, lifecycle, authority, state/memory view, pending work, and runtime management.**

In v0.4, the primary Execution kinds are:

```text
ExecutionDefinition
├── AgentDefinition
└── WorkflowDefinition
        ↓ instantiate
     Execution
```

A Definition describes reusable work. An Execution is one live runtime instance of that definition.

Functions, LLM calls, retrieval, parsing, Adapters, and Workflow Stages do **not** become Executions merely because they are runnable or complex.

> **Composition does not imply an Execution boundary. Independent runtime identity does.**

A useful test is: does this piece of work need to keep existing as something the runtime may independently wait for, resume, message, cancel, supervise, recover, give separate authority to, or address later? If yes, it probably deserves an Execution. Otherwise it should usually remain local computation inside one.

---

## 2. Agent and Workflow are complementary

Agent and Workflow differ mainly in **who owns semantic progression**.

### Workflow

> **A Workflow has system-defined semantic topology.**

The application defines the possible Stages and transitions. An LLM may classify, branch, retrieve, revise, or loop inside those predefined possibilities without turning the Workflow into an Agent.

```text
collect → evaluate → revise
              │         │
              └→ publish┘
```

A **Stage** is Workflow structure inside one Workflow Execution. It is not a smaller Execution.

### Agent

> **An Agent has model-directed open-ended semantic progression inside hard runtime boundaries.**

The model repeatedly chooses what semantic action to take next from the observations and options made available to it.

```text
observe
  ↓
model decides
  ↓
action requests / child calls / messages
  ↓
new observations
  ↓
model decides again
```

The number of LLM calls does not define Agent-ness. What matters is whether the model owns an open-ended continuation space.

The same task may be expressed as a Workflow or an Agent. The distinction describes **control ownership**, not the output.

---

## 3. Events in, Effects out

An Execution advances through a controller appropriate to its kind:

```text
Workflow Execution → Workflow controller
Agent Execution    → Agent controller
```

The controller may perform local computation directly. When it needs the runtime or outside world to do something, it proposes an **Effect**.

Results and other observations enter an Execution as **Events**.

```text
Event(s)
   ↓
Execution
   ↓
controller
   ├── local computation
   │
   └── Effect proposal(s)
              ↓
           Harness
      authorize / coordinate
              ↓
       runtime / outside world
              ↓
            Event(s)
```

An **Event** says something was observed by an Execution.

Examples include user input, a capability result, a child result, a peer message, a timer, or cancellation.

An **Effect** is a request for runtime-mediated interaction. The v0.4 vocabulary is intentionally small:

```text
UseCapability
WriteMemory
SpawnExecution
SendMessage
RequestUserInput
```

Effects are proposals, not claims that something already happened.

> **Controllers request. The Harness authorizes and coordinates. Executors and the environment establish reality.**

This is why a failed tool call normally becomes an observation the program can react to rather than automatically meaning the whole Execution failed.

---

## 4. Semantic control and operational control are different

The controller owns **semantic control**:

```text
Workflow controller
  follows system-defined topology

Agent controller
  interprets model-directed progression
```

The **Harness** owns operational control for all Executions:

```text
lifecycle
scheduling
Event delivery
Effect authorization and coordination
pending work
wake-up
budgets / deadlines
cancellation / supervision
persistence / recovery
routing
mechanical confirmation
```

Executions do not each own a separate Harness.

```text
                 one logical Harness
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      Execution    Execution    Execution
```

The Harness may be implemented in one process or distributed across workers. Physical placement does not change the meaning of Execution, Event, Effect, `spawn`, or `call`.

The detailed runtime semantics live in [`execution-runtime.md`](execution-runtime.md).

---

## 5. Local composition, child composition, and peer communication

There are three different ways work combines:

```text
local composition
  function / LLM / Adapter / Stage-local work
  stays inside the current Execution

child composition
  spawn / call
  creates another Execution

peer communication
  send / ask
  talks to an already-existing Execution
```

`spawn` creates a child Agent or Workflow Execution.

`call` is conceptually:

```text
spawn
+ wait for the child's terminal result
```

`send` communicates with an existing peer. `ask` adds correlation and waits for a reply.

Ownership and communication are separate graphs:

```text
owns X      ≠ may message X
may message X ≠ may cancel X
may message X ≠ may inspect X memory
```

A future/reusable **Skill** is also a composition/package concept, not an Execution kind. A Skill may package instructions, resources, scripts, bindings, and optionally a root Agent/Workflow composition. Activating a Skill may create a child Execution when its composition requires one, or may simply enrich the current Agent when it is instruction-only.

The deeper composition rules belong in [`composition.md`](composition.md).

---

## 6. Authority is not exposure

An Execution receives **authority**, not ambient privilege.

Authority answers:

> What may this Execution do or access?

It can cover capabilities/operations, resources, spawning, messaging, and other runtime-controlled powers.

The model should usually see much less than the full authorized universe.

Conceptually:

```text
Catalog
  what exists
      ↓
Effective Authority
  what this Execution may use
      ↓
Active / Exposed View
  what is relevant and intentionally exposed now
      ↓
Model Invocation Projection
  what this exact model call receives
```

Each step may narrow the previous one. None of the later layers may enlarge authority.

This is important when an application knows about thousands of tools, resources, memory interfaces, Skills, or Agent/Workflow services. Arrokoth should discover and expose a small relevant subset instead of placing the whole catalog into model context.

> **Discovery, description, or model exposure never grants permission.**

The Harness still authorizes the resulting Effect at execution time.

Runtime identity is also not automatically application identity:

> **Execution identity ≠ application security principal identity.**

Application policy may consider a human, tenant, world, service identity, an Agent acting on behalf of someone, or other authenticated domain facts. Those facts may influence authority, but they do not redefine what an Execution is.

The detailed authority, delegation, Active View, and discovery model will live in the dedicated authority document during this documentation reorganization.

---

## 7. Memory is not context

**Memory** is retained information.

**Context** is the selected information presented to the current computation or model call.

```text
memory / Events / resources / instructions
                 ↓
          context selection
                 ↓
          current model context
```

Arrokoth distinguishes different forms of retained information because they have different trust and lifecycle semantics:

```text
Structured Memory
  explicit, schema-bound state

Derived Semantic Memory
  inferred/retrieval-oriented knowledge with provenance

Working Notes
  temporary scratch reasoning state

Artifacts / Files
  larger durable work products
```

Execution history—Events, Effects, messages, lifecycle transitions, traces—is important provenance, but history is not automatically semantic memory.

A derived claim is also not automatically authoritative structured state. In particular:

```text
retrieved/model/tool content
        ↓ may influence
Derived Semantic Memory
        ↓ may influence
future reasoning

but does not automatically become
  authority / consent / trusted Structured Memory
```

Cross-Execution visibility is explicit. A child does not see all parent memory or notes merely because it is a descendant.

The detailed memory forms, scopes, provenance, visibility, supersession, and context-selection rules will live in the dedicated memory document during this documentation reorganization.

---

## 8. Response is not completion

A long-lived Execution is not necessarily an `input → output` function.

An Agent may respond many times while remaining alive:

```text
message
  ↓
Agent responds
  ↓
waits
  ↓
next message
```

A **response/message** is communication.

A **terminal result** is the optional final result of a completed Execution.

```text
response ≠ terminal result
```

This distinction also matters for child composition: a peer or child may send messages without terminating.

---

## 9. Interoperability is a projection boundary

Arrokoth's kernel semantics should remain independent of any one external protocol while mapping naturally to standard interfaces.

```text
kernel semantics
  Execution / Event / Effect / authority / memory / lifecycle
        ↓
portable interface and composition semantics
  operations / resources / services / Skills /
  interaction templates / async handles / change signals
        ↓
protocol and client bindings
  MCP / A2A / Agent Skills / HTTP / SDK / UI protocols / future standards
```

The same semantic operation should be describable once and projected into multiple environments.

Examples:

```text
portable Operation
  → model tool
  → MCP Tool
  → HTTP/SDK operation

exported Agent/Workflow service
  → MCP service operation
  → A2A Agent/Task interaction
  → ordinary API

Skill
  → native Arrokoth composition package
  → Agent Skills-compatible profile where possible
```

External protocol objects do not replace kernel identities:

```text
Effect          ≠ protocol operation
Event           ≠ protocol notification
Execution       ≠ external task/job
PendingOperation≠ external async handle
```

And protocol discovery/authentication does not grant Arrokoth authority.

External standards are design references, not masters of the kernel. When they reveal a genuinely more general concept, Arrokoth should adopt the concept at the correct layer without making the wire format core truth.

Detailed mappings belong in [`interoperability.md`](interoperability.md).

---

## 10. Core invariants

The architecture should protect these distinctions aggressively:

```text
Definition        ≠ Execution
Workflow          ≠ Agent
Stage             ≠ Execution
Capability        ≠ Execution
Event             ≠ Effect
response          ≠ terminal result
semantic control  ≠ operational control
authority         ≠ exposure
Execution identity≠ application principal identity
memory            ≠ context
explicit memory   ≠ derived semantic memory
ownership         ≠ communication
Skill             ≠ Execution
Effect            ≠ protocol operation
Event             ≠ protocol notification
Execution         ≠ external task/job handle
protocol exposure ≠ authority grant
```

And these positive rules summarize the system:

> **Execution means independent runtime identity.**

> **Workflow progression is system-defined; Agent progression is model-directed and open-ended.**

> **Events are observations; Effects are proposals for runtime-mediated interaction.**

> **The Harness owns operational reality and authority enforcement.**

> **Composition alone does not create an Execution boundary.**

> **Authority is broader than what the model currently sees.**

> **Memory is broader than the current context, and inferred memory is not automatically trusted state.**

> **Ownership, communication, application identity, and authority are related but distinct.**

> **Kernel semantics are protocol-independent but intentionally projectable to standard interfaces.**

This is the whole picture. The deeper canonical documents should explain the difficult semantics without redefining these concepts.