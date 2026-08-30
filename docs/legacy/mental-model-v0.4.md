# Mental Model v0.4: A Kernel for Agents and Workflows

> **Status: canonical v0.4 mental model.**
>
> This document explains the conceptual model behind the Arrokoth Agent Kernel. It is intentionally written from coarse-grained ideas to finer implementation-facing concepts. Exact TypeScript APIs, storage layouts, executor implementations, and package boundaries belong in [`mental-model-to-implementation-model.md`](mental-model-to-implementation-model.md), not here.

## Overview

Most agent systems begin with one of two pictures.

The first is a function-like picture:

```text
input → model/tool work → output
```

The second is an agent-loop picture:

```text
model → tool → observation → model → ... → answer
```

Both are useful, but neither is broad enough to describe the system we want to build.

A function normally finishes. A conversational Agent may remain alive for months. A Workflow may spend most of its lifetime waiting for an approval or an external event. One Agent may ask another Agent a question without sharing its context. A Workflow may create several Agents and let them discuss with one another. A search Agent may discover and query thousands of specialized paper Agents. Some tasks are controlled by predefined process logic; others should let the model decide what happens next.

If every one of these cases gets its own special orchestration mechanism, the kernel quickly becomes a collection of unrelated abstractions.

Arrokoth instead starts from a smaller idea:

> **An `ExecutableDefinition` describes something Arrokoth can run. Instantiating it creates an addressable `Execution`. An Execution has bounded authority, private state, a mailbox, and a lifecycle. It receives Events, requests Effects through the runtime, and may either terminate or remain alive indefinitely.**

From that one abstraction we derive Agents, Workflows, LLM calls, functions, tool usage, RAG, memory, peer communication, durable waiting, and recursive composition.

The whole model can be summarized as:

```text
                     ┌───────────────────────┐
                     │       Execution       │
                     │ state / memory / auth │
                     └───────────┬───────────┘
                                 │
                         receives Events
                                 │
                                 ▼
                           controller
                                 │
                         requests Effects
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │   Runtime / Harness   │
                     │ authorize / persist   │
                     │ dispatch / correlate  │
                     └───────────┬───────────┘
                                 │
                   capability / environment /
                     another Execution
                                 │
                                 ▼
                               Event
```

Two kinds of composite execution sit on top of this substrate:

```text
Workflow → the system defines the semantic path
Agent    → the model chooses the semantic path
```

Everything else in this document follows from those two ideas.

---

## 1. Start with Executions, not with prompts or tool loops

The first design choice is to separate **what can run** from **one running instance of it**.

An `ExecutableDefinition` is reusable. It says what kind of thing this is, what interface it exposes, what authority it may request, which memory resources it expects, and the kind-specific information needed to run it.

An `Execution` is one concrete runtime instance of that definition.

```text
ExecutableDefinition
        │
        │ instantiate
        ▼
     Execution
```

This distinction sounds simple, but it changes the architecture significantly.

Suppose we define a customer-support Agent. The Agent definition may be reused for thousands of conversations. Each conversation is a different Execution with its own mailbox, memory, authority, lifecycle, pending operations, and trace.

Likewise, one paper-Agent definition may be instantiated once for every paper in a corpus. One Workflow definition may have many live cases moving through it at the same time.

The same Execution abstraction also covers short-lived work. A single LLM call or function call can be represented as a finite Execution that starts, computes, and terminates.

So the kernel does not begin with the assumption that everything is long-lived. It begins with the more general rule:

> **An Execution may be finite or long-lived.**

That lets the simple cases remain simple while avoiding a separate architecture for the harder cases.

### Executable kinds

We currently need four primary semantic kinds:

```text
ExecutableDefinition
├── Leaf
│   ├── LLM
│   └── Function / Code
│
└── Composite
    ├── Workflow
    └── Agent
```

An LLM and a Function are usually finite leaves. A Workflow and an Agent are usually composites that may create or interact with other Executions.

A Tool does not need to be a fifth executable kind. In the common case, tools, MCP servers, search engines, knowledge sources, browsers, filesystems, sandboxes, and external APIs are **Capabilities** available to an Execution.

This keeps a useful distinction:

```text
Executable → has its own execution identity/lifecycle/state
Capability → something an Execution is authorized to use
```

The same piece of code may be exposed either way depending on what semantics we need. A calculator is naturally a capability. A separately managed computation with its own lifecycle, authority, budget, mailbox, or trace may be better modeled as an Executable.

### Definitions are kind-specific

The shared Execution model does not mean every definition should have the same fields.

An LLM needs a prompt/model-call specification. A Function needs an implementation reference. An Agent needs a prompt and Agent policy. A Workflow needs its stage/transition topology.

There should therefore be no universal `instructions` field pretending these are all the same thing.

The mental rule is:

> **Share the execution substrate; keep the executable body specific to its kind.**

That gives us a common kernel without flattening meaningful differences.

---

## 2. An Execution is more general than `input → output`

Once we treat Agent and Workflow instances as Executions, the normal function interface becomes too narrow.

A function often looks like this:

```text
start input
    ↓
 function
    ↓
terminal result
```

But consider a conversational Agent:

```text
user message
     ↓
  respond
     ↓
   wait
     ↓
user message
     ↓
  respond
     ↓
   wait
     ↓
    ...
```

There may never be a meaningful moment where the Agent says, “I am done forever and will accept no future input.”

A monitoring Workflow has the same property. It may wait for a new document, process it, send a notification, and then wait again. The Workflow is doing useful work, but it is not moving toward a mandatory terminal value.

So an Executable interface should be understood through three possible channels:

```text
start input
  data used when the Execution is initially created

inbox
  Events/messages the Execution may receive while alive

terminal result
  optional final value produced if the Execution terminates successfully
```

A Function usually has a start input and a terminal result. An interactive Agent usually has an inbox and may have no terminal result at all.

This immediately gives us an important distinction:

> **A response is not the same thing as a result.**

When a chat Agent sends a response to a user, the Agent has produced an outbound message. It has not necessarily completed its Execution.

Likewise, when one Agent replies to another Agent, the reply is communication between two live Executions, not proof that either Execution is finished.

This distinction is what allows the same kernel to model both one-shot work and indefinitely interactive systems.

---

## 3. Events come in, Effects go out

Now that an Execution can remain alive across many interactions, we need a uniform way to describe what happens to it over time.

The simplest model is:

> **Events are observations delivered into an Execution. Effects are actions an Execution asks the runtime to perform.**

This gives us the central loop:

```text
Event
  ↓
Execution controller
  ↓
EffectRequest
  ↓
Runtime
  ↓
world / capability / another Execution
  ↓
Event
```

This is the core kernel loop.

### Events are what the Execution observes

Examples include:

```text
user sent a message
peer Agent replied
tool returned a result
knowledge retrieval completed
approval was granted
timer fired
remote request timed out
search service failed
child Execution completed
```

All of these are things that happened **to** or **for** the Execution.

The runtime may store them in richer typed forms, but conceptually they enter the Execution as observations.

This matters for truthfulness. The model can propose that a tool be called, but it does not establish the tool result. The tool result comes back as an Event from the environment.

Similarly, a model may claim that a message was sent, but the runtime and transport determine whether it was actually sent.

This leads to one of the kernel's most important rules:

> **Models propose. The runtime authorizes. Executors and the environment establish what actually happened.**

### Effects are requests, not declarations of truth

The Execution should have only a small number of ways to affect the outside world.

Conceptually:

```text
EffectRequest
├── UseCapability
├── SpawnExecution
├── SendMessage
└── WriteMemory
```

`UseCapability` covers tools, MCP, knowledge retrieval, search, browser use, APIs, sandboxes, and similar external work.

`SpawnExecution` creates another Execution from a definition.

`SendMessage` communicates with an already-existing authorized Execution.

`WriteMemory` proposes a persistent state update.

The small Effect vocabulary is deliberate. We do not want RAG, tool use, subagents, memory, and asynchronous jobs to grow into unrelated control-flow systems.

They are different kinds of interaction, but they all pass through the same runtime boundary where authorization, validation, persistence, correlation, and tracing can be enforced.

### Failure is usually an observation first

If a search API fails, the containing Agent should not automatically fail.

Instead:

```text
search request
    ↓
search service fails
    ↓
Failure Event
    ↓
Agent observes failure
    ↓
retry / use another source / ask a peer / explain limitation
```

The same principle applies to timeouts and rejected actions. An external failure becomes information the controller can react to. The Execution itself reaches terminal `FAILED` only when it can no longer validly continue or its controller/runtime explicitly terminates it as failed.

This makes the system adaptive without letting the model invent success.

---

## 4. Waiting is a lifecycle state, not an Agent action

Once work is event-driven, we no longer need the model to emit a special `yield` every time it has nothing more to do immediately.

Waiting is an operational property of the Execution.

A useful lifecycle is:

```text
              ┌──────────────────┐
              │                  │
              ▼                  │
CREATED → READY → RUNNING → WAITING
                  │   ▲          │
                  │   └──────────┘
                  │
                  ├──→ COMPLETED
                  ├──→ FAILED
                  └──→ CANCELLED
```

`READY` means there is runnable work. `RUNNING` means the controller is currently consuming compute. `WAITING` means there is no immediate runnable work, but the Execution may wake when a relevant Event arrives.

For example, a chat Agent may spend almost all of its lifetime in `WAITING`:

```text
WAITING
   ↓ user message
READY
   ↓
RUNNING
   ↓ response sent
WAITING
```

The same state is useful when waiting for:

```text
another Agent's reply
a tool result
knowledge retrieval
human approval
a timer
an external webhook
```

We do not need separate lifecycle concepts for each case. The runtime simply knows which pending operation or incoming Event may wake the Execution.

### Activations

A long-lived Execution should not be imagined as a process continuously spinning forever.

Instead, it wakes for an **Activation** when there is work to process:

```text
Execution lifetime
──────────────────────────────────────────────>

   [activation]      [activation]   [activation]
        │                 │              │
      waiting           waiting        waiting
```

An Agent may live for years while only consuming model/runtime compute during brief Activations.

This is important both conceptually and operationally. “Long-lived” means persistent identity and resumable state, not permanently occupied compute.

### Leaf completion is not composite completion

A long-lived Agent may invoke many LLM calls. Each LLM call is normally finite:

```text
prompt → inference → model result → LLM Execution completes
```

But the Agent that used that LLM result may remain alive.

So:

> **Leaf completion does not imply composite completion.**

This removes the need to say that intermediate LLM calls “yield.” They simply complete their own work. The outer Agent continues or waits according to its own lifecycle.

---

## 5. Authority answers “what may this Execution ever do?”

So far we have an Execution that can request Effects. The next question is: what is it allowed to request?

Arrokoth separates **authority** from **exposure**.

The three layers are:

```text
Capability Catalog
        ↓
Authority Envelope
        ↓
Active Capability View
```

The Capability Catalog is everything the runtime/application knows about: tools, knowledge sources, executable definitions, memory resources, communication routes, and so on.

The Authority Envelope is the maximum subset this Execution is permitted to use.

The Active Capability View is the smaller subset currently exposed to the controller/model.

These are deliberately different concepts.

### Authority is a hard boundary

An Execution cannot grant itself authority.

If a Workflow creates a child Agent, the child may receive only authority that the owner already possesses and delegates under runtime policy:

```text
child authority ⊆ owner authority
```

Authority may cover much more than tools. It can include rights such as:

```text
query these knowledge sources
use these APIs/tools
spawn these Executable definitions
message these Executions/classes/groups
read/write these memory resources
perform these consequential actions
```

This makes authority a general execution boundary rather than a tool-filtering feature.

### Exposure is context engineering

A large Agent may be authorized to use thousands of capabilities but should not see all of them in every model call.

For example, a research Agent might have authority to interact with one hundred thousand Paper Agents. Showing one hundred thousand handles and descriptions to the model would be unusable.

Instead, the current Active Capability View may contain only the few resources relevant to the current task.

```text
Active Capability View ⊆ Authority Envelope
```

If something is authorized but not currently exposed, discovery can bring it into the Active View without changing authority.

That is not privilege escalation. It is context selection.

If something lies outside the Authority Envelope, the Execution cannot simply request that the runtime “retrieve” or expose it as though the distinction were cosmetic. That is a genuine authority boundary and must be denied or handled through an explicit higher-authority path.

This separation gives us both safety and scale:

```text
large possible world
        ↓
hard authorized subset
        ↓
small relevant model-facing subset
```

---

## 6. Memory and context are related, but not the same thing

An Execution may live across many Activations, so it needs durable or semi-durable state. But not every piece of persistent state should be treated the same way, and not every piece of state needs to be placed into every model context.

Arrokoth therefore separates **memory** from **context**.

Memory is what the Execution retains.

Context is what the current Activation/model call is allowed and chosen to see.

### Memory

Useful memory forms include:

```text
Structured Memory
Working Notes
Artifact / File Memory
```

Structured Memory is schema-defined and inspectable. It is appropriate for things like a user profile, case status, budget, completed task ids, or other application state where validation and provenance matter.

Working Notes are looser, Agent-owned state such as hypotheses, rough planning, partial conclusions, or current focus. They are useful for continuity but should not automatically be treated as authoritative facts.

Artifact/File Memory covers persistent workspaces such as research notes, plans, reports, or code files.

These are storage/memory mechanisms, not new control-flow abstractions.

### Shared memory must be explicit

By default, each Execution's memory is private to that Execution.

If several Agents need a shared whiteboard, the application should bind an explicit shared memory resource:

```text
Agent A ─┐
Agent B ─┼── shared_board
Agent C ─┘
```

Communication alone does not imply shared memory.

This is a critical property for multi-agent systems because it lets Agents reason independently without accidentally inheriting each other's context.

### Context is compiled per Activation

When an Agent wakes, the model should not automatically receive the entire history of the Execution.

The runtime can compile an Activation-specific context from eligible information:

```text
Agent prompt
+ incoming Event(s)
+ selected conversation/history
+ selected structured memory
+ selected working notes/artifacts
+ recent observations
+ relevant retrieved knowledge
+ Active Capability View
        ↓
compiled model context
```

The kernel owns the visibility and authorization rules: what is eligible to be shown at all.

The selection machinery—ranking, retrieval, summarization, compression, token packing—can evolve independently.

So the relationship is:

```text
Execution state / memory / authorized resources
                 ↓
          ContextCompiler
                 ↓
        model-facing context
```

This keeps the Execution stable while allowing context engineering to improve over time.

---

## 7. Composition requires two graphs, not one

Once Executions can create other Executions, it is tempting to treat the execution tree as the whole relationship between them.

That is not enough.

We need to distinguish **ownership** from **communication**.

Suppose a Workflow creates three Agents:

```text
                    OWNERSHIP TREE

                     Workflow W
                    /     |     \
                   /      |      \
               Agent A Agent B Agent C
```

Ownership answers questions such as:

```text
Who created this Execution?
From whose authority was its authority derived?
Who allocated its budget?
Who may normally cancel it?
Where does it appear in lifecycle accounting and tracing?
```

But those same Agents may be allowed to talk directly to each other:

```text
                 COMMUNICATION GRAPH

               Agent A ←────→ Agent B
                  ↑   \       /   ↑
                  │    \     /    │
                  │     \   /     │
                  └──── Agent C ───┘
```

Communication answers different questions:

```text
Who may send messages to whom?
Who may ask whom a question?
Who may wait for whose reply?
Which groups/channels may receive messages?
```

The two graphs should remain independent.

```text
can message X   ≠ can cancel X
can message X   ≠ can inspect X's memory
owns X          ≠ must be the only entity allowed to talk to X
```

This separation is what makes richer multi-agent systems possible without collapsing all Agents into one shared context.

### Addressable Executions

A live Execution can be represented by an authorized handle/address.

That handle may permit operations such as sending or asking, without granting lifecycle control or memory inspection.

At a higher-level API, we may expose operations such as:

```text
spawn(definition) → create a new Execution and return a handle
send(handle, message) → send and continue
ask(handle, message, timeout) → request/reply
call(definition, input) → create finite work and wait for terminal result
```

But conceptually these reduce to a small core:

```text
ask  = send + correlation + wait for matching reply
call = spawn + wait for terminal result
```

### Example: an Agent meeting

A Workflow can create three Agents with different prompts and private memories, then authorize them to communicate directly.

```text
Workflow W
├── Agent A: optimistic analyst
├── Agent B: skeptic
└── Agent C: synthesizer
```

A sends a conclusion to B. B receives only that message plus B's own private context. B challenges it. C observes selected discussion messages and synthesizes.

No one needs to share a single context window.

The Workflow still owns the meeting's macro-process—for example, when discussion starts, when it ends, and when synthesis begins—while each Agent owns its own local reasoning.

This is an important theme of the kernel:

> **Composition does not require context merging.**

---

## 8. Workflow and Agent differ in who owns semantic control flow

At this point we have a common substrate: long-lived Executions, Events, Effects, authority, memory, context, and communication.

Now we can define Workflow and Agent very simply.

The distinction is not how many LLM calls they use. It is not whether they use tools. It is not whether they contain loops. It is not whether they are long-running.

The distinction is:

> **Who chooses the semantic next step?**

### Workflow: the system owns the topology

A Workflow has a predefined semantic control space.

```text
Gather evidence
      ↓
Enough evidence?
   ├── no  → Gather more
   └── yes → Analyze
                  ↓
                Draft
                  ↓
               Validate
```

Individual stages may use Functions, LLMs, Agents, or even other Workflows.

A transition may be deterministic, LLM-evaluated, or hybrid. An LLM choosing between predefined edges does not turn the Workflow into an Agent because the system still defined the allowed topology.

A useful summary is:

```text
Workflow: the system is the semantic transition function.
```

A Workflow may also contain cycles forever:

```text
monitor
  ↓ event
analyze
  ↓
notify
  ↓
monitor
  ↓
...
```

It does not need an End stage. It terminates only if its Workflow logic reaches a terminal condition.

### Agent: the model owns the topology

An Agent has no required predefined graph between semantic steps.

On an Activation, the model may decide to:

```text
answer a user
use a tool
retrieve knowledge
write memory
change focus
revise a plan
spawn another Agent
invoke a Workflow
message an existing Execution
ask a peer for critique
continue reasoning
propose termination
```

The runtime bounds what is legal, but it does not replace the model's semantic decision-making with a predefined process.

```text
Agent: the model is the semantic transition function.
```

The Agent/runtime relationship is therefore:

```text
model chooses/proposes
        ↓
runtime validates/authorizes
        ↓
executor/environment acts
        ↓
authoritative Event returns
        ↓
model chooses again
```

This preserves Agent autonomy without making the model the authority system or the source of external truth.

### Semantic completion vs operational termination

An Agent may believe its task is finished and propose a terminal result.

The runtime may still check hard requirements before actually terminating the Execution.

```text
Agent proposes terminal result
        ↓
Runtime checks hard conditions
        ├── valid   → COMPLETED
        └── invalid → steering/observation → continue
```

For long-lived Agents, this proposal may never occur. A normal chat response is usually just a message followed by `WAITING`.

---

## 9. Recursive composition becomes ordinary

Because Agent and Workflow are both Executions over the same substrate, they can contain and interact with each other naturally.

```text
Workflow
├── Function
├── Agent
│   ├── uses search capability
│   ├── messages peer Agent
│   └── invokes Workflow
│       ├── Function
│       └── Agent
└── Workflow
```

A subagent is not a special multi-agent framework. It is simply another Agent Execution created under bounded authority.

Likewise, a Workflow invoked by an Agent is not a tool-shaped exception. It is another Executable with its own lifecycle and control semantics.

This gives us a strong implementation principle:

> **Agent and Workflow should share execution, authority, memory, event, effect, durability, and communication infrastructure. They differ primarily in who owns semantic control flow.**

### Example: papers as Agents

Consider a large arXiv corpus.

Instead of putting every paper into one enormous retrieval context, we can represent each paper through a specialized Paper Agent:

```text
paper-001
paper-002
paper-003
...
paper-N
```

Each Paper Agent has its own private paper content, notes, citations, and interpretation.

A Search Agent first uses a discovery capability:

```text
find relevant paper agents("mechanistic interpretability")
        ↓
[paper-17, paper-91, paper-203]
```

Then it asks those Agents targeted questions:

```text
paper-17  → "What evidence does this paper provide for X?"
paper-91  → "How does this paper define Y?"
paper-203 → "Does this support or contradict paper-17?"
```

The Paper Agents reason independently and reply. The Search Agent synthesizes the responses.

The Search Agent never needed to load every paper's context.

Semantically, these are addressable Executions. Physically, an implementation may cold-store them and activate only the few that are queried. Long-lived identity does not imply always-resident compute.

This example shows how the same model scales from a single chat Agent to a distributed knowledge system.

---

## 10. Operational rules keep the model reliable

The semantic model stays small, but a real kernel still needs operational guarantees. These should be treated as orthogonal runtime rules rather than new semantic controllers.

### Budgets and deadlines

An Execution may have limits on model calls, tokens/cost, capability calls, spawned Executions, parallelism, or time.

Owned child Executions receive bounded allocations from their owner/application.

This is another reason ownership matters independently of communication: talking to an Execution does not automatically mean owning its lifecycle or budget.

### Cancellation

Cancellation authority normally follows ownership/supervision policy.

If Workflow W owns Agent A, W may be allowed to cancel A. If Agent B merely has permission to message A, that does not imply B may cancel it.

### Timeouts

Timeouts are often associated with operations rather than whole Executions.

If A asks B a question with a five-second timeout and B does not reply, A receives a timeout Event. B may remain alive.

### Durability

Because Executions may wait for long periods or survive process restarts, the runtime needs durable truth about important transitions.

At minimum it should be possible to reconstruct:

```text
Execution creation / ownership
incoming Events
requested Effects
authorization decisions
effect dispatch and result
message delivery
memory commits
lifecycle transitions
pending operations/correlations
terminal state if any
```

For consequential external effects, durability and idempotency are especially important. A restart must not accidentally send the same email, submit the same application, or make the same payment twice.

### Concurrency

A simple default is one logical controller Activation mutating an Execution at a time.

Many messages/results may arrive concurrently, and many Effects may run in parallel, but the Execution's mailbox can serialize or batch observations before controller state is updated.

This keeps memory and control-state races understandable without preventing asynchronous work.

These mechanisms make the kernel robust, but they do not redefine Agent or Workflow semantics.

---

## 11. One complete example

Putting the pieces together makes the model easier to see.

Suppose a user starts a research Workflow.

```text
User
 │
 │ Start Event
 ▼
Research Workflow W
```

W creates two Agents:

```text
W
├── Search Agent S
└── Critic Agent C
```

This creates an ownership tree. W allocates authority and budgets to S and C.

W also gives S and C permission to communicate:

```text
S ↔ C
```

That is the communication graph.

S begins with a research Activation. Its model sees the research goal, selected memory, current observations, and an Active Capability View containing search and paper-discovery capabilities.

S requests:

```text
UseCapability(search)
```

The runtime validates the request, dispatches it, and returns the search result as an Event.

S observes the result and decides it needs specialized paper expertise. It discovers several relevant Paper Agents:

```text
P17, P91, P203
```

S sends all three questions asynchronously:

```text
S → P17
S → P91
S → P203
```

The Paper Agents have private contexts. They wake independently, reason over their own paper state, and send replies.

While waiting, S may continue other work or enter `WAITING` depending on whether it has runnable tasks.

When replies arrive, they become Message Events in S's mailbox. S synthesizes them, then asks C:

```text
"Attack this conclusion and identify missing evidence."
```

C reasons independently and replies with criticism. S revises its conclusion.

Eventually S sends a research summary to W.

The Workflow's predefined topology says that when the research stage is sufficient, move to synthesis. W therefore enters its synthesis stage, perhaps invoking another Agent or Function.

At the end, W may produce a terminal report and complete.

Or it may transition into a monitoring stage and remain alive indefinitely, waking whenever new papers appear.

Nothing in this example required a second orchestration model for subagents, a special peer-agent protocol, a shared context window, or a mandatory completion signal.

It all followed from:

```text
ExecutableDefinitions
Executions
Events
Effects
Authority
Memory / Context
Ownership
Communication
Workflow / Agent controllers
Lifecycle
```

That is the purpose of the mental model: a small set of concepts that remains coherent as the system grows.

---

## 12. Side concepts should attach to the kernel, not compete with it

Several useful features can be layered on top without creating new control-flow systems.

A **Capability Profile** is a reusable way to help select an Active Capability View. It groups semantically related capabilities, but does not grant authority.

A **Skill** can package prompts, resources, scripts, assets, a root Agent or Workflow definition, and recommended capabilities. It is packaging, not a third execution controller.

A retrieval framework such as LangChain, an Agent executor such as Strands, a model provider, an MCP implementation, a storage backend, or a sandbox are implementation choices behind kernel contracts. They should not become the meaning of Agent, Workflow, Execution, memory, authority, or communication.

This gives us a useful architectural test:

> **If one implementation disappeared tomorrow, could another implementation satisfy the same kernel semantics without changing the application's conceptual definition?**

If yes, the boundary is probably healthy. If no, either the boundary is wrong or the concept is more fundamental than we admitted.

---

## 13. The mental model in one page

The entire model can now be restated compactly.

An `ExecutableDefinition` describes something Arrokoth knows how to run. It may describe an LLM, Function, Workflow, or Agent.

Instantiating a definition creates an `Execution`. The Execution has identity, bounded authority, private state, memory bindings, a mailbox, and a lifecycle. It may be finite or long-lived.

The Execution receives **Events**: user messages, peer messages, tool results, retrieval results, approvals, timers, failures, and other observations.

Its controller requests **Effects**: use a capability, spawn another Execution, send a message, or write memory.

The runtime sits between requested Effects and reality. It validates authority, persists important transitions, dispatches work, correlates results, and turns what actually happened back into Events.

An Execution that has no immediate work becomes `WAITING` and can wake later. It does not need to terminate, and it does not need to emit a semantic `yield` simply to stop consuming compute.

Authority and exposure are separate. The Authority Envelope defines what the Execution may ever do; the Active Capability View defines what is currently visible to its controller/model.

Memory and context are separate. Memory persists knowledge/state across Activations; context is the selected authorized view shown during one Activation.

Ownership and communication are separate. Ownership controls authority derivation, budgets, supervision, cancellation, and trace hierarchy. Communication may connect arbitrary authorized Executions without sharing their contexts or memories.

A **Workflow** uses this substrate with system-owned semantic topology.

An **Agent** uses the same substrate with model-owned semantic topology.

Everything else—subagents, Agent meetings, RAG, Paper Agents, long-running monitors, approvals, Skills, tool ecosystems, and recursive composition—builds on those primitives.

The shortest explanation is:

> **Arrokoth treats Agents and Workflows as addressable, potentially long-lived Executions. Events come in; Effects go out through a runtime that enforces authority and records reality. Workflows let the system choose the semantic path; Agents let the model choose it.**
