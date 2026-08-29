# Kernel Architecture v0.4

> **Status: working v0.4 mental model.**
>
> This document describes the architecture of the Arrokoth Agent Kernel. It focuses on the semantic model rather than concrete TypeScript APIs or storage implementations.

## 1. Why an Agent Kernel?

Most agent systems begin from one of two useful abstractions:

```text
Agent
  model chooses what to do next

Workflow
  application defines what happens next
```

For small systems, either abstraction may be sufficient. The difficulty appears when real tasks require both. A research process may need open-ended investigation, but still require fixed review and publication stages. A coding Agent may decide how to solve a problem, while testing, approval, and deployment follow predefined procedures.

Treating Agent and Workflow as unrelated runtime models makes this composition harder than it needs to be. Arrokoth instead gives both a common execution substrate and keeps one distinction: **who owns the semantic control path**.

### 1.1 Move the right work out of the model

A more capable Harness does not necessarily increase the burden on the LLM. Its purpose is largely the opposite: move mechanical responsibilities out of model reasoning.

The model should not need to remember whether an API call is still pending, reconstruct process state after a restart, enforce a token budget, or decide whether it is authorized to use a capability. Those are runtime concerns.

```text
Model / controller
  semantic decisions

Harness
  scheduling
  authorization
  persistence
  routing
  correlation
  recovery
```

This increases runtime implementation complexity, but most of that work is conventional scheduling, storage, and validation rather than model inference. In typical server deployments, we expect this overhead to be small relative to model inference, but that assumption should be measured. On constrained or edge environments it may matter more; durability, distributed scheduling, rich tracing, and similar mechanisms should therefore remain optional when they are not needed.

### 1.2 Agent and Workflow should intersect

The useful boundary is not "intelligent" versus "deterministic."

Workflows may contain LLM decisions. Agents may invoke deterministic Functions and Workflows. The distinction is whether the application defines the surrounding semantic topology or leaves the next semantic step open to the model.

This resembles how organizations combine people with procedures. A standard operating procedure handles repeatable coordination; people contribute judgment where the path cannot be fully specified in advance. The goal is not to remove either side, but to place model intelligence at the points where it adds value.

### 1.3 From one Agent to a network of Executions

Once Agent, Workflow, LLM, and Function share the same execution substrate, composition becomes ordinary:

```text
Workflow
  ↓
Agent
  ↓
Workflow
  ↓
Function
```

Agents may also communicate without sharing their full context or memory. A larger system can therefore grow from one Agent into a network of specialized Executions while the Harness continues to provide the same runtime guarantees.

The additional architecture is justified only when these properties are useful. A one-shot model call should remain a one-shot model call; the kernel should not force long-lived or distributed machinery onto simple work.

---

## 2. The Kernel Model

### 2.1 Kernel Definition
The kernel defines the contract between **Execution** and **Harness**.

```text
                 AGENT KERNEL

        Execution                Harness
            │                       │
            │ EffectRequest         │
            ├──────────────────────▶│
            │                       │
            │               authorize
            │               dispatch
            │               track
            │               persist
            │                       │
            ◀───────────────────────┤
                    Event
```
1. **Execution** focuses on performing its work. A running Execution carries or uses:

* identity;
* lifecycle;
* input and Events;
* optional execution-local/control data;
* effective authority;
* bound resources;
* Effect requests;
* optional terminal result.

2. **Harness** provides the environment in which that work runs. It defines:

* instantiation;
* scheduling and Activation;
* authorization;
* Effect dispatch;
* pending-operation tracking;
* message routing;
* waiting and wake-up;
* persistence and recovery;
* cancellation and budgets;
* tracing and provenance.

For example:

```text
Agent decides: "search for this paper"
        ↓
EffectRequest
        ↓
Harness
  validate authority
  execute search
  track operation
        ↓
search result Event
        ↓
Agent continues
```

The separation is:

> **Execution determines what work should happen.
> Harness determines how that work is carried out and records what actually happened.**




### 2.2 Executable Kinds and Control

The kernel currently recognizes four executable kinds:

```text
ExecutableDefinition
├── LLM
├── Function / Code
├── Workflow
└── Agent
```

They share the same Execution substrate but do not use every mechanism equally. A simple LLM or Function is usually finite. A Workflow or Agent may be long-lived, receive Events, request Effects, and compose other Executions.

The main distinction between Workflow and Agent is control:

```text
Workflow
  application defines the semantic control topology

Agent
  model chooses the open-ended semantic path
  within Harness-enforced boundaries
```

A Workflow may still use LLMs for routing, evaluation, or stage decisions. An Agent may invoke deterministic Functions and Workflows. They are complementary controllers over the same runtime model.

Common patterns make the boundary concrete:

```text
prompt chaining        A → B → C                         Workflow
routing                router → one predefined branch    Workflow
parallelization        fan out → aggregate               Workflow
evaluator-optimizer    generate → evaluate → revise      Workflow
orchestrator-workers   delegate → collect → synthesize   usually Workflow
open-ended loop        model chooses next semantic step  Agent
```

The presence of an LLM does not make a system an Agent; the question is who defines the surrounding semantic control space.

---

### 2.3 Replaceable Mechanisms

Implementation mechanisms remain outside the kernel when replacing them does not change the semantics above.

Examples include:

* model providers;
* Agent-loop frameworks;
* retrieval frameworks;
* MCP and other tool transports;
* databases;
* message brokers;
* sandbox implementations;
* observability backends.

For example:

```text
Agent Execution
      ↓
AgentExecutor
      ↓
Strands / another implementation
```

or:

```text
UseCapability Effect
      ↓
Harness
      ↓
MCP / HTTP / local implementation
```

The architectural rule is:

> **The kernel defines what must remain true. Replaceable implementations decide how to make it true.**

---

## 3. ExecutableDefinition

### 3.1 Specification for creating Executions

Before an Execution exists, the Harness needs a specification describing what should be created:


```text
ExecutableDefinition
        │
        │ instantiate
        ▼
     Execution
```

A useful analogy is a factory specification.

For example:

```text
ResearchAgentDefinition
        ↓
ResearchAgent Execution A

ResearchAgentDefinition
        ↓
ResearchAgent Execution B
```

The two Executions share the same Definition but have different identities, inputs, bound resources, and runtime histories.

---

### 3.2 What a Definition describes

A Definition may include the following information. The final schema should be determined through implementation and testing:

* **id and version**;
* **executable kind**;
* **start-input, inbox, and terminal-result interfaces**;
* **authority requirements and requests**;
* **resource-binding requirements**;
* **budget defaults or limits**;
* **kind-specific configuration**.


The kind-specific configuration differs among the four execution instance types.

```text
1. LLM Definition
      prompt/template
      model configuration
      optional model-specific constraints

2. Function Definition
      implementation reference
      input/output contract

3. Workflow Definition
      stages
      transitions
      control topology

4. Agent Definition
      prompt/instructions
      model configuration
      Agent-specific behavior
```
For v0.4, semantic quality policy is not a general Harness responsibility. Requirements such as output quality, factuality, or task-specific acceptance are better represented as explicit Agent or Workflow logic—for example, an evaluation stage followed by revision. This boundary should be validated through implementation and testing.

---

### 3.3 Deterministic instantiation

Instantiation should be deterministic at the configuration level.

Conceptually:

```text
Definition
+ creation input/parameters
+ Harness policy
        ↓
resolved Execution configuration
```
Harness policy may include:
- timeout/deadline;
- cost/token limits;
- maximum parallelism;
- maximum spawned Executions;
- retry limits for infrastructure failures;
- persistence requirements;
- sandbox/environment selection;
- tracing level;
- whether consequential Effects require external confirmation;
- allowed capability or communication subsets.


Note that external APIs, model sampling, time, concurrent messages, and other environmental inputs may change what happens after creation.

The useful guarantee is:

> **Instantiation is reproducible; execution outcomes may not be.**

---

### 3.4 Required and optional authority

A Definition may request resources or authority, but it cannot grant them to itself.

Authority and resource requirements may be **required** or **optional**.

For example:

```text
ResearchAgentDefinition

required:
  read paper database

optional:
  web search
  spawn CriticAgent
```

During creation:

```text
Definition requirements
        ↓
Harness authorization
        ↓
required denied?
   ├── yes → do not create Execution
   └── no
        ↓
grant available optional authority
        ↓
create Execution
```

This allows creation with reduced optional authority.

If web search is optional and denied, the Agent can still be instantiated without it.

If access to the paper database is required and denied, creating the Agent would produce an Execution that cannot satisfy its declared contract, so instantiation should fail.

---

### 3.5 Definitions make composition reusable

Definitions provide stable units for composition.

For example:

```text
ResearchWorkflowDefinition
├── SearchAgentDefinition
├── CriticAgentDefinition
└── ReportWriterDefinition
```

At runtime:

```text
ResearchWorkflow Execution
        │
        ├→ SearchAgent Execution
        ├→ CriticAgent Execution
        └→ ReportWriter Execution
```

The parent Definition does not contain the live runtime data of these child Executions.

It only describes what may be instantiated and how.

The Harness creates the actual instances when needed.

---

### 3.6 Relationship to Agent Skills

There may be a future relationship between `ExecutableDefinition` and Agent Skills.

Both describe reusable units of behavior or configuration, but they currently serve different purposes.

```text
ExecutableDefinition
  something the kernel can instantiate and run

Skill
  reusable knowledge, instructions, resources, or behavior
  available to an Agent
```

A Skill may eventually reference one or more ExecutableDefinitions.

A Definition may also declare Skills or related resources that should be available to the resulting Execution.

Whether these concepts should converge further is still an open research question.

For v0.4, keeping them separate avoids adding an abstraction before its semantics are clear.

## 4. Execution

An **Execution** is one concrete runtime instance created from an `ExecutableDefinition`.

Different executable kinds use different parts of the model. A simple LLM or Function may only need input, lifecycle, and result. A Workflow or Agent may additionally use Events, memory, Effects, child Executions, messages, and repeated Activations.

The common model allows all four kinds to compose under the same Harness.

---

### 4.1 Execution Metadata

Every Execution has metadata that identifies what it is and where it came from.

```text
Execution
  id: exec-101
  definition: ResearchAgent@0.4
  created_at: 2026-01-01
```

Typical metadata includes:

* Execution ID;
* Definition ID and version;
* creation time;
* optional parent/root Execution ID;
* optional descriptive tags.

Metadata is different from control data. Metadata identifies the Execution; control data changes as the Execution progresses.

---

### 4.2 Lifecycle and Activation

A general lifecycle is:

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

A simple LLM or Function often follows:

```text
CREATED → READY → RUNNING → COMPLETED
```

A long-lived Agent or Workflow may repeat:

```text
READY → RUNNING → WAITING
                    ↓
                  Event
                    ↓
                  READY
```

`RUNNING` is the state in which the Execution actively consumes controller compute.

An **Activation** is one scheduled period of `RUNNING`.

```text
Harness schedules Execution
        ↓
     Activation
        ↓
      RUNNING
        ↓
 WAITING / COMPLETED / FAILED
```

When an Event arrives for a `WAITING` Execution, the Harness places it in the Execution mailbox, changes the Execution to `READY`, and schedules another Activation.

Long-lived therefore means persistent identity and resumability, not continuous CPU usage.

---

### 4.3 Input and Output Channels

An Execution may interact with its environment through four channels.

```text
INPUT

1. Start Input
   information supplied when the Execution is created

2. Events
   information delivered after the Execution already exists


OUTPUT

3. Effects
   actions proposed while the Execution is running

4. Terminal Result
   optional final value produced when the Execution completes
```

A simple Function may only use:

```text
Start Input → Function → Terminal Result
```

A simple LLM may similarly use:

```text
Start Input → LLM → Terminal Result
```

A Workflow or Agent may use all four.

Events and Effects are therefore available parts of the Execution model, not requirements for every executable kind.

---

### 4.4 Execution-local Data and Workflow Control Data

Some Executions need data that survives between Activations.

We call this **execution-local data**.

Examples:

```text
Agent
  current working objective
  optional executor continuation data

Workflow
  control data
    current stage
    completed stages
  transition information
```

For a Workflow, **control data** records where the Workflow currently is.

```text
current stage:
  review

completed stages:
  gather
  analyze
  draft
```

A simple LLM or Function may have no meaningful execution-local data.

Execution-local data is separate from semantic memory.

---

### 4.5 Authority

Authority defines what an Execution is allowed to request from the Harness.



```text
Capability Authority
  which tools/capabilities may be used

Resource Authority
  which bound resources may be accessed, and with what permissions

Spawn Authority
  which ExecutableDefinitions may be instantiated

Message Authority
  which Agent Executions may receive messages
```

Authority determines **what is permitted**.

Creation policy separately constrains operational limits such as cost, parallelism, or number of children.

---

### 4.6 Context

**Context** is the selected information available to the controller or model during the current Activation.

It may be built from:

```text
Definition prompt/instructions
Start Input
Events from mailbox
selected execution history
Structured Memory
Memory Notes
Artifacts / Files
selected results from Bound Knowledge
available capabilities
```

Conceptually:

```text
eligible information
        ↓
Context Compiler
        ↓
current Activation context
```

Context is temporary and Activation-specific.

The underlying information may come from persistent resources, Events, or execution history.

---

### 4.7 Bound Resources

A **bound resource** connects an Execution to a concrete resource.

Examples:

```text
papers → knowledge://arxiv-corpus

project_memory → memory://project-381

workspace → workspace://task-91
```

Common bound resources include:

```text
knowledge sources
Structured Memory
Memory Notes
Artifacts / Files
workspaces
```

Authority determines whether the Execution may access them.

Bindings determine **which concrete resource** is attached to this Execution. An Execution may request a retrieval capability against a bound knowledge resource and receive the result later as an Event.

Two Executions created from the same Definition may therefore use different resources.

---

### 4.8 Events and Mailbox

An **Event** is information delivered to an Execution after it already exists.

The Harness places incoming Events in the Execution's **mailbox**.

```text
external result
      ↓
Harness
      ↓
Execution mailbox
      ↓
next Activation
```

Typical Events include:

```text
capability result
capability failure
child Execution result
message received
user input
confirmation / denial
timer
approval
timeout
cancellation request
```

Two important sources are:

#### Child Result

```text
Parent
  ↓
spawn / call
  ↓
Child Execution
  ↓
Terminal Result
  ↓
Result Event
  ↓
Parent mailbox
```

The child may be an LLM, Function, Workflow, or Agent.

#### Agent Message

```text
Agent A
  ↓
SendMessage
  ↓
Message Event
  ↓
Agent B mailbox
```

Events are the main post-creation input channel of an Execution.

---

### 4.9 Memory

For v0.4, semantic memory is primarily used by **Agent and Workflow Executions**.

```text
Memory
├── Structured Memory
├── Memory Notes
└── Artifacts / Files
```

#### Structured Memory

Predefined fields with explicit structure.

```text
research_topic
known_constraints
verified_sources
```

#### Memory Notes

Looser persistent notes.

```text
"Paper A may contradict Paper B.
Check methodology before concluding."
```

#### Artifacts / Files

Persistent working material.

```text
report.md
source code
dataset
analysis.json
generated assets
```

Memory may be both **read and written** during execution.

```text
read memory
    ↓
context
    ↓
controller
    ↓
WriteMemory Effect
    ↓
Harness
    ↓
updated memory
```

Execution history is not memory.

```text
History
  Events
  Effects
  lifecycle changes
  messages
  traces

Memory
  explicitly retained semantic information
```

---

### 4.10 Pending Operations

Some requested actions complete during the current Activation. Others remain outstanding after the Activation ends. The Harness tracks these as **pending operations**.

Examples:

```text
waiting for capability result
waiting for remote API
waiting for GPU job
waiting for memory commit
waiting for child result
waiting for Agent reply
waiting for user input
waiting for Effect confirmation
```

Conceptually:

```text
Execution RUNNING
       ↓
requests Effect
       ↓
Harness dispatches
       ↓
result not ready
       ↓
Pending Operation
       ↓
Execution WAITING
```

When the operation completes:

```text
result
  ↓
Harness resolves pending operation
  ↓
creates Event
  ↓
puts Event in mailbox
```

Pending operations belong to the Harness because the Harness tracks what external work is actually still outstanding.

---

### 4.11 Execution Actions and Effects

An **Effect** is an action proposed by an Execution that requires the Harness to interact with something outside the Execution's own computation.

The initial Effect vocabulary is:

```text
EffectRequest
├── UseCapability
├── WriteMemory
├── SpawnExecution
├── SendMessage
└── RequestUserInput
```

#### UseCapability

For v0.4, capabilities fall into two broad classes:

```text
Knowledge Retrieval
  retrieves information for the Execution,
  optionally from a bound resource

Tool Usage
  performs an operation through an external tool or service
```

Examples:

```text
UseCapability(
  type = knowledge_retrieval,
  capability = web_search,
  input = "agent memory systems"
)
```

```text
UseCapability(
  type = knowledge_retrieval,
  capability = knowledge_query,
  resource = papers,
  input = "agent memory systems"
)
```

#### WriteMemory

```text
WriteMemory(
  resource = project_memory,
  update = ...
)
```

#### SpawnExecution

```text
SpawnExecution(
  definition = CriticAgent
)
```

#### SendMessage

```text
SendMessage(
  target = AgentB,
  type = ask,
  message = ...
)
```

For v0.4, direct messaging is primarily Agent-to-Agent communication.

#### RequestUserInput

An Agent or Workflow may need semantic input from a user rather than a simple yes/no authorization.

```text
RequestUserInput(
  prompt = "Here is the revised draft. What should I change, or should I send it?"
)
```

The Harness presents the request, tracks the wait, and returns the user's response as a `UserInput` Event. The Execution—not the Harness—interprets the meaning of the response.

Effects are requests:

```text
Execution proposes Effect
        ↓
Harness validates
        ↓
Harness performs, waits, or rejects
        ↓
Event records outcome
```

For v0.4, controller-facing Effect calls may use blocking/`await` semantics. Blocking does not mean the Execution remains `RUNNING`: the Harness may suspend it in `WAITING`, track the pending operation, and resume it when the result Event arrives. Non-blocking Effect semantics can be explored later.

---

### 4.12 Spawn, Call, and Fork

`SpawnExecution` creates another Execution from a Definition.

```text
Agent
  ↓
SpawnExecution(CriticAgent)
  ↓
CriticAgent Execution
```

The child receives its own metadata, lifecycle, authority, bindings, local data, mailbox, and result.

A higher-level `call` operation can be understood as:

```text
call
=
spawn
+ wait for child Terminal Result
```

For example:

```text
Workflow
  ↓
call(SummarizeFunction)
  ↓
Function Execution
  ↓
Terminal Result Event
  ↓
Workflow continues
```

A child may be any executable kind:

```text
LLM
Function
Workflow
Agent
```

#### Fork

Fork is currently considered a possible specialized form of Spawn:

```text
existing Execution
      ↓
     fork
      ↓
new Execution derived from existing Execution
```

The semantics are still unclear:

```text
what local data is copied?
what memory is shared?
what history is inherited?
what authority is inherited?
what happens to pending operations?
```

Spawn is therefore the main v0.4 primitive. Fork remains a research topic.

---

### 4.13 Message Send and Communication

Direct messaging allows one Agent Execution to communicate with another Agent Execution.

Sending a message is an Effect:

```text
Agent A
   ↓
SendMessage(B, message)
   ↓
Harness validates Message Authority
   ↓
Message Event
   ↓
Agent B mailbox
```

Two higher-level patterns are useful:

```text
send
  send message and continue

ask
  send message and wait for reply
```

Conceptually:

```text
ask
=
SendMessage
+ pending operation
+ correlated Message Event
```

Communication does not imply shared context or shared memory.

An Execution therefore typically receives information from other Executions in two ways:

```text
child Execution
  → Terminal Result Event (call in the previous section)

peer Agent
  → Message Event (ask)
```

---

### 4.14 Failure, Timeout, and Retry

External failure normally becomes an Event before the whole Execution fails.

```text
Agent
  ↓
UseCapability(search)
  ↓
search fails
  ↓
Failure Event
  ↓
Agent may retry, switch approach, continue, or report failure
```

Timeouts behave similarly.

```text
Agent A asks Agent B
        ↓
timeout
        ↓
Timeout Event delivered to A
```

Agent B may remain alive.

Retry should distinguish:

```text
Infrastructure retry
  Harness retries transient execution/transport failure

Semantic retry
  Execution decides to try another approach
```

---

### 4.15 Budgets, Deadlines, and Cancellation

Creation policy may constrain:

```text
token / cost budget
model-call limit
capability-call limit
maximum child Executions
parallelism
deadline
```

Authority determines:

```text
what may be done
```

Policy determines:

```text
how much may be done
```

Cancellation is enforced by the Harness.

A parent may normally be allowed to cancel a child it created, depending on application policy.

---

### 4.16 Durability and Idempotency

Long-lived Executions require enough persistent runtime information to recover after failure.

Important records may include:

```text
Execution metadata
Execution-local data
lifecycle
Events / mailbox
Effect requests
pending operations
memory commits
child relationships
message correlations
Terminal Result
```

Consequential Effects may also require idempotency.

```text
Effect dispatched
      ↓
process crashes
      ↓
system restarts
      ↓
Harness checks whether Effect already happened
```

This prevents duplicate external actions.

---

### 4.17 Provenance

Provenance records where an Event or memory value came from.

Two forms are useful.

#### Event Provenance

An Event may record:

```text
source Execution
source capability class
source capability
source bound resource
user
external system
causing EffectRequest
```

For capability results, we distinguish between the **capability class**, the concrete **capability**, and the optional **bound resource**.

Example: retrieval from a bound knowledge source.

```text
Event:
  paper retrieval result

capability class:
  knowledge_retrieval

capability:
  knowledge_query

bound resource:
  papers → knowledge://arxiv-corpus

caused by:
  EffectRequest #381
```

Example: web search.

```text
Event:
  web search result

capability class:
  knowledge_retrieval

capability:
  web_search

bound resource:
  none

caused by:
  EffectRequest #382
```

Example: tool usage.

```text
Event:
  sandbox execution result

capability class:
  tool

capability:
  sandbox_execute

caused by:
  EffectRequest #383
```

This keeps three concepts separate:

```text
Capability class
  what kind of interaction occurred

Capability
  which operation produced the result

Bound resource
  which attached resource was used, if any
```

#### Memory Provenance

A memory entry may record both **who wrote it** and **which evidence supported it**.

Possible evidence sources include:

```text
user Event
capability result
bound knowledge retrieval
child Execution result
peer Agent message
previous memory
```

For example:

```text
Memory:
  "Paper X was published in 2025"

written by:
  Execution exec-381

source:
  Event event-912

Event provenance:
  capability class = knowledge_retrieval
  capability = knowledge_query
  bound resource = arxiv-corpus
```

Memory provenance can therefore form a trace from retained information back to the Event and external source that produced it.

---

### 4.18 Execution in One Picture

```text
┌───────────────────────────────────────────────┐
│                   Execution                   │
│                                               │
│ Metadata                                      │
│ Lifecycle / Activation                        │
│ Execution-local / control data                │
│ Authority                                     │
│                                               │
│ INPUT                                         │
│   Start Input                                 │
│   Context                                     │
│     Bound Resources                           │
│     Events / Mailbox                          │
│     Memory                                    │
│                                               │
│             Controller / Computation          │
│                       │                       │
│ OUTPUT                │                       │
│   EffectRequests ◀─────┘                       │
│   Terminal Result                             │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
                     Harness
                        │
             tracks pending operations
                        │
          ┌─────────────┼──────────────┐
          ▼             ▼              ▼
     capabilities    child Execs     messages
     / resources                      / world
          │             │              │
          └─────────────┼──────────────┘
                        ▼
                      Events
                        │
                     mailbox
                        │
                        └────→ next Activation
```

A simple LLM or Function may use only:

```text
Start Input
    ↓
 RUNNING
    ↓
Terminal Result
```

A Workflow or Agent may use nearly the entire model.

The shared Execution abstraction allows the system to add these mechanisms only when they are useful, without introducing a different runtime model for each executable kind.


## 5. Harness

The **Harness** is the runtime that creates, schedules, and operates Executions.

It should remain primarily mechanical. It does not decide whether an answer is good, whether a research conclusion is correct, or what semantic step an Agent or Workflow should take next.

Its job is to make Execution behavior **authorized, routable, resumable, and observable**.

---

### 5.1 Harness Responsibilities

At a high level:

```text
                   Harness

ExecutableDefinition
        │
        ▼
      create
        │
        ▼
    Execution
        │
        ▼
     schedule
        │
        ▼
    Activation
        │
 EffectRequests
        ▼
 validate / dispatch / track
        │
        ▼
 external work
        │
        ▼
      Events
        │
        ▼
 mailbox / next Activation
```

The Harness coordinates this cycle without owning the semantic decisions inside the Execution.

---

### 5.2 Execution Creation

Creation resolves a reusable Definition into a concrete Execution.

Conceptually:

```text
create(
  executableDefinition,
  parameters,
  harnessPolicy
)
        ↓
Execution
```

The Harness resolves:

```text
Definition configuration
creation parameters
available resources
effective authority
runtime policy
        ↓
initial Execution
```

If required resources or authority cannot be satisfied, creation fails.

Optional resources or authority may be omitted while still producing a valid Execution.

Once creation succeeds, the Harness assigns identity, initializes runtime records, and places the Execution into the lifecycle.

---

### 5.3 Scheduler

The scheduler decides **which READY Execution runs next**.

Its basic loop is:

```text
READY Execution
      ↓
scheduler
      ↓
Activation
      ↓
RUNNING
```

The scheduler may consider operational factors such as:

```text
available compute
priority
deadline
fairness
parallelism limits
resource availability
```

The scheduler does not decide what the Execution should do.

It only decides **when it receives compute**.

Wake-up is therefore a coordination between Event delivery and scheduling: the Event Router places a relevant Event in a `WAITING` Execution's mailbox and makes it `READY`; the scheduler later starts the next Activation. The Runtime Store persists this state but does not itself wake the Execution.

For v0.4, scheduling in a simple local deployment may be little more than an in-process FIFO queue.

For larger deployments, the same contract may sit above workers, containers, or distributed queues, and may require more sophisticated scheduling.

---

### 5.4 Effect Gateway

All externally meaningful actions pass through the Harness.

```text
Execution
   ↓
EffectRequest
   ↓
Effect Gateway
   ↓
validate
resolve implementation
dispatch / hold
track
   ↓
external system
```

The gateway provides one controlled boundary for capability invocation, memory writes, Execution creation, message delivery, and user interaction.

Validation is primarily mechanical:

```text
is the request authorized?
does the target exist?
is the input structurally valid?
is the budget still available?
does this Effect require confirmation?
```

The Harness should generally not decide whether an answer is correct or whether a report is good enough. Semantic evaluation belongs in Agent or Workflow logic.

#### Effect Confirmation

Some consequential Effects may require explicit user confirmation.

A structured confirmation is a Harness-level gate:

```text
Execution proposes SendEmail
        ↓
Harness holds exact Effect
        ↓
[Confirm] [Deny]
```

If confirmed, the Harness dispatches that Effect. If denied, it returns a denial Event. Confirmation should normally bind to the exact Effect payload; changing the recipient or body invalidates the previous confirmation.

Free-form user instructions are different. If the system asks:

```text
"Here is the draft. What should I change, or should I send it?"
```

the response returns through `RequestUserInput` as a `UserInput` Event and is interpreted by the Agent or Workflow. This supports both application policies:

```text
strict:
  modify → show final Effect → confirm → send

conversational:
  user says "modify X, then send"
  → modify → send
```

The first is enforced mechanically by Harness policy. The second delegates the semantic instruction to the Execution.

---

### 5.5 Pending-Operation Manager

When an Effect cannot complete immediately, the Harness creates a pending-operation record.

```text
EffectRequest
     ↓
dispatch
     ↓
Pending Operation
```

The record connects:

```text
requesting Execution
EffectRequest
external operation
expected result
timeout / deadline
correlation information
optional confirmation or user-input request
```

When external work completes:

```text
external result
      ↓
pending-operation manager
      ↓
resolve correlation
      ↓
create Event
      ↓
target mailbox
```

This component is what allows a controller-facing operation to look synchronous:

```text
result = await search(...)
```

while the runtime behaves asynchronously:

```text
dispatch
→ WAITING
→ result arrives
→ Event
→ READY
→ resume
```

For v0.4, this blocking/`await` style is sufficient at the Execution interface even though the Harness internally suspends and resumes the Execution.

---

### 5.6 Event Router and Mailbox

The Harness owns Event delivery.

Incoming information may originate from:

```text
capability result
child Execution
peer Agent
user
timer
external system
runtime control
```

The Harness normalizes it into an Event and routes it to the correct mailbox.

```text
source
  ↓
Harness
  ↓
Event
  ↓
Execution mailbox
```

The mailbox separates Event arrival from controller execution.

Events may arrive while the Execution is not running.

The scheduler can process them later during the next Activation.

This separation is important for long-lived Executions because incoming work does not require a continuously running process.

---

### 5.7 Runtime State Store and Recovery

The Harness requires runtime state records when Executions must survive process failure or long periods of inactivity. The store preserves state; it is not the wake-up mechanism. Event routing and scheduling perform wake-up.

Conceptually:

```text
Runtime Store
├── Execution records
├── lifecycle
├── execution-local/control data
├── mailbox / Events
├── Effect records
├── pending operations
├── child relationships
└── terminal results
```

The physical storage mechanism is replaceable. A simple deployment may use an in-memory store; durable storage is required only when recovery across process or machine failure matters.

The Harness cares about the semantics:

```text
what happened?
what is still pending?
what can safely run again?
what must not run twice?
```

On restart:

```text
load runtime records
       ↓
reconstruct Executions
       ↓
resolve interrupted operations
       ↓
READY / WAITING / terminal
       ↓
continue
```

The goal is continuation from recorded runtime truth rather than restarting the entire task from the beginning.

---

### 5.8 Runtime Policy

Harness policy applies operational constraints to a particular Execution.

For example:

```text
deadline
token / cost limit
parallelism
maximum child Executions
retry limits
required persistence
confirmation requirements
allowed authority subset
```

Policy is supplied at creation rather than defining what the executable fundamentally is.

```text
create(
  definition,
  parameters,
  policy
)
```

This allows the same Definition to run under different deployment conditions.

```text
ResearchAgentDefinition

local development
  in-memory or lightweight persistence
  broad debugging trace

production
  strict budget
  durable persistence
  restricted capabilities
```

The Harness enforces these mechanical limits during runtime.

---

### 5.9 Failure and Recovery Boundary

The Harness distinguishes infrastructure failure from Execution-level semantic failure.

Examples of Harness-level failures include:

```text
network connection dropped
worker crashed
database temporarily unavailable
provider returned transient error
message delivery failed
```

The Harness may retry these according to runtime policy.

If the failure is relevant to the controller, it becomes an Event.

```text
external failure
      ↓
Harness
      ↓
retry if appropriate
      ↓
still failed
      ↓
Failure Event
      ↓
Execution decides what to do
```

This prevents infrastructure behavior from silently becoming semantic decision-making.

---

### 5.10 Harness Should Stay Small

The Harness will inevitably contain more code than a simple Agent loop because it manages scheduling, durability, authority, communication, and composition.

That does not mean every deployment must enable every mechanism.

A minimal configuration may effectively be:

```text
create
  ↓
run
  ↓
result
```

A richer deployment may enable:

```text
durability
mailboxes
long-lived waiting
child Executions
Agent messaging
persistent memory
distributed workers
```

The architectural goal is therefore not to minimize Harness functionality at all costs.

It is to keep the Harness composed of **simple runtime mechanisms with narrow responsibilities**, and to add those mechanisms only when the application requires them.

---

### 5.11 Harness in One Picture

```text
                  ExecutableDefinition
                         │
                         ▼
                       create
                         │
                         ▼
                 ┌───────────────┐
                 │   Execution   │
                 └───────┬───────┘
                         │
                       READY
                         │
                         ▼
                    Scheduler
                         │
                         ▼
                    Activation
                         │
                      RUNNING
                         │
                    EffectRequest
                         ▼
                ┌─────────────────┐
                │     Harness     │
                │                 │
                │ validate        │
                │ dispatch        │
                │ track           │
                │ persist         │
                │ correlate       │
                └────────┬────────┘
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
      capability      child Exec     message /
       / memory                      external
           │             │             │
           └─────────────┼─────────────┘
                         ▼
                       Event
                         │
                         ▼
                      mailbox
                         │
                         ▼
                    READY again
```

The Harness does not make the Agent intelligent or define the Workflow's semantics.

It provides the runtime substrate that lets different Executions run, wait, interact, fail, recover, and compose under one consistent model.

---

## 6. Summary and Open Questions

The v0.4 model reduces the kernel to three main concepts:

```text
ExecutableDefinition
  describes what may be instantiated

Execution
  one concrete running instance

Harness
  creates, schedules, authorizes, routes,
  persists, and resumes Executions
```

An Execution receives **Start Input** and later **Events**. While running, it may request **Effects** and may eventually produce a **Terminal Result**. LLMs and Functions can use the minimal form of this model; Agents and Workflows can use the richer lifecycle, memory, composition, communication, and durability mechanisms when needed.

The central control distinction remains:

```text
Workflow
  application owns the semantic topology

Agent
  model owns the open-ended semantic path

Harness
  owns neither;
  it enforces runtime mechanics
```

This gives Agent and Workflow a common substrate without making them the same abstraction. It also lets the architecture scale gradually: simple calls remain simple, while long-lived and multi-Execution systems add only the mechanisms they require.

Several questions should remain open until implementation and empirical testing provide evidence:

- the exact `ExecutableDefinition` schema;
- how far semantic policy should remain outside the Harness;
- non-blocking Effect semantics;
- precise Fork inheritance semantics;
- the future relationship between Skills and ExecutableDefinitions;
- distributed scheduling and lightweight edge-runtime profiles.

The v0.4 goal is therefore not to freeze every API. It is to establish a small set of semantics that can survive changes in model providers, Agent frameworks, retrieval systems, storage, and deployment architecture.
