# Future Plan

> **Status: roadmap and open design questions, not canonical semantics.**
>
> Read [`mental-model.md`](mental-model.md), [`workflow-model.md`](workflow-model.md), [`runtime-architecture.md`](runtime-architecture.md), and [`implementation-guide.md`](implementation-guide.md) first.

The immediate goal is to validate the current architecture through implementation rather than add more abstractions.

## 1. What is considered stable enough to build against

The following are the current target invariants:

```text
Execution = independently managed runtime identity

v0.4 Execution kinds:
  Agent
  Workflow

Workflow:
  system-defined semantic topology

Agent:
  model-directed open-ended semantic progression

Interaction:
  Events in
  Effects out

Runtime:
  one logical Harness manages many ExecutionContexts
```

Also preserve:

```text
Definition       ≠ Execution
Event            ≠ Effect
response         ≠ terminal result
authority        ≠ exposure
memory           ≠ context
ownership        ≠ communication
semantic control ≠ operational control
Stage            ≠ Execution
```

Function calls, LLM inference, and Adapters normally remain local computation inside an enclosing Execution.

---

## 2. Near-term implementation sequence

The preferred sequence is intentionally incremental.

### 2.1 Execution substrate

Build or normalize:

```text
ExecutionDefinition
AgentDefinition
WorkflowDefinition
ExecutionContext
LifecycleState
Activation
owner/root relationships
in-memory scheduler/store
```

The first conformance target is a long-lived Execution that can:

```text
RUNNING → WAITING
receive Event
WAITING → READY → RUNNING
respond without terminating
```

### 2.2 Event / Effect substrate

Normalize:

```text
Events
EffectRequests
Effect authorization
pending operations
correlation / causation
mailbox delivery
wake-up
```

Initial Effects:

```text
UseCapability
WriteMemory
SpawnExecution
SendMessage
RequestUserInput
```

### 2.3 Workflow controller

Implement:

```text
Function Stage
LLM Stage
Agent Stage
Workflow Stage
predefined transitions
Stage completion barrier
Adapters
text | none Stage result
```

Do not create child Executions for ordinary function/LLM Stage computation.

### 2.4 Agent controller

Align the Agent executor boundary around:

```text
context compilation
input Adapter
LLM/model-directed decision
output Adapter
Effect requests
result Events
repeated semantic continuation
```

The current primary Agent implementation may remain Strands where useful, but framework-specific semantics must stay behind an explicit Agent executor boundary.

### 2.5 Recursive composition

Implement:

```text
spawn
call
Agent Stage
Workflow Stage
child authority/budget derivation
child result Events
cancellation/supervision
```

### 2.6 Memory

Implement/test:

```text
Structured Memory views
Artifacts / Files
Working Note frames
provenance
Stage note handoff policy
context compilation
```

### 2.7 Messaging and human interaction

Implement:

```text
send
ask
peer Message Events
RequestUserInput
mechanical Effect confirmation
authorization evidence
```

### 2.8 Durability

After in-memory semantics are stable, add/reconcile:

```text
durable ExecutionContext
mailboxes
pending operations
Effect journal/idempotency
restart recovery
```

Avoid coupling the semantic refactor to distributed infrastructure too early.

---

## 3. Required conformance programs

Before declaring the model stable, implement and evaluate at least these programs:

1. **Simple RAG Workflow** — `LLM Stage → retrieval Effect → next LLM Stage`.
2. **Bounded multi-LLM Stage** — `LLM → retrieval → LLM` remains a Workflow Stage because continuation is predefined.
3. **Agentic research loop** — the model repeatedly chooses retrieve/tool/inspect/stop.
4. **Workflow containing child Agent** — child is an Agent Execution hidden behind one Agent Stage; Stage waits for required completion.
5. **Parent Agent spawning multiple children** — tests ownership, authority, results, Working Notes inheritance, and parallel pending work.
6. **Long-lived conversational Agent** — response does not imply terminal completion; Agent can wait and wake.
7. **Peer Agents** — messaging is independent from ownership and does not expose memory/cancellation rights.
8. **User-input + confirmation case** — semantic free-form user input and exact mechanical confirmation remain distinct.
9. **Memory visibility case** — explicit Structured Memory survives; popped child Working Notes do not silently become parent memory.
10. **Minimal runtime profile** — the same semantics run in-process without durable/distributed machinery.

Architecture changes should be justified against these scenarios rather than aesthetics alone.

---

## 4. Open design questions

### 4.1 Non-blocking Effects

Current semantics are strongest for blocking dependencies:

```text
Effect → wait → Event → continue
```

Future Agents may continue while Effects remain pending. We need to test:

```text
how results enter future context
which pending work blocks Agent step completion
which pending work blocks Stage completion
cancellation and timeout behavior
ordering/correlation
what happens when Agent decides to finish with work still pending
```

Do not expose a broad non-blocking API until these semantics are clear.

### 4.2 `fork()`

Working Notes stack inheritance was partly chosen because it offers a natural path to fork:

```text
parent visible note stack
        ↓ fork
branch A local frame
branch B local frame
```

Open questions:

```text
snapshot vs reference vs copy-on-write
Structured Memory behavior across branches
authority/budget inheritance
branch merge semantics
cancellation
trace representation
```

`spawn` remains the canonical primitive until fork proves necessary.

### 4.3 Explicit Working Note commit

v0.4 does not automatically merge child notes into parent notes.

Current recommendation:

```text
important information
  → terminal result
  → Structured Memory field
  → Artifact/File
  → explicit message
```

A future `commit note` mechanism may be useful, but it should be tested against the risk of making Working Notes a second implicit shared-memory system.

### 4.4 Stage result type

The current Workflow hypothesis is:

```text
StageResult = text | none
```

This keeps graph edges simple and pushes durable structure into explicit memory/resources.

Test whether real applications need richer typed Stage results. If so, prefer a small explicit extension rather than an unconstrained object graph.

### 4.5 More Adapter attachment points

v0.4 focuses on:

```text
Stage input/output
Agent-loop model input/output
```

Possible future boundaries:

```text
Event Adapter
memory-read Adapter
memory-write Adapter
Effect Adapter
```

Only add these after concrete use cases demonstrate value.

### 4.6 Adapter permissions

Current v0.4 policy is deliberately narrow:

```text
read selected memory
no Effects
no writes
no spawn/message
```

This should be validated with safety, translation, normalization, and structured-output examples.

### 4.7 Dynamic Workflow topology

Model-driven graph mutation is out of v0.4.

Prefer:

```text
model changes data
predefined graph reacts to data
```

Revisit only if fixed topology becomes a demonstrated limitation rather than an aesthetic constraint.

### 4.8 Workflow Stage messaging

Direct peer messaging is primarily an Agent capability in v0.4. Function/LLM Workflow Stages can use results, memory, child calls, and Effects without arbitrary peer messaging.

Test whether real Workflow programs need Stage-initiated peer messaging before exposing it broadly.

### 4.9 Execution kinds beyond Agent/Workflow

The mental model defines Execution by independent runtime identity, not permanently by a closed two-kind ontology.

Possible future examples:

```text
TrainingJob
BatchInference
RemoteBuild
Simulation
```

Do not add such kinds until a use case needs independent lifecycle/authority/state and cannot be naturally represented as a Workflow.

### 4.10 `ExecutionDefinition` naming

`ExecutionDefinition` may be clearer than `ExecutableDefinition` now that ordinary functions/LLM calls are not members of the top-level runtime union.

Treat this as a naming/API migration to validate after the semantic boundary is implemented.

---

## 5. Authority and confirmation research

### Semantic authorization evidence

An Effect may reference evidence such as:

```text
user Event
Structured Memory preference
application policy fact
```

The Harness decides whether this is sufficient.

Potential policy modes:

```text
none
semantic
mechanical
```

For consequential actions, exact-payload mechanical confirmation remains the least ambiguous baseline.

### Concurrency and Structured Memory

Once parallel child Executions become common, test:

```text
concurrent writes
optimistic versioning
field-level conflict policy
transactions
provenance-preserving merge
```

Do not solve distributed consistency before actual concurrency examples require it.

---

## 6. Scaling after semantics stabilize

Later work may include:

```text
persistent distributed scheduler
remote workers
large dormant Agent populations
capability/resource discovery
Active View retrieval
large knowledge collections
heterogeneous models/executors
MCP and additional tool transports
remote sandbox/computer use
OpenTelemetry/exporters
production databases/brokers
```

The requirement is that none of these change the application mental model.

```text
logical Harness
  ├── worker A
  ├── worker B
  └── worker C
```

must still behave like the same Harness/Execution/Event/Effect system.

---

## 7. Skills

Skills remain deliberately separate from ExecutionDefinition for now.

A future Skill may package:

```text
instructions/prompts
resources/references
scripts/assets
recommended capabilities
root Agent/Workflow Definition
```

A Skill should not become another controller or alternate execution substrate.

The exact Skill/Definition relationship remains open until real packaging/distribution use cases are clearer.

---

## 8. Evidence before abstraction

Architecture work should be evaluated with:

```text
conformance tests
failure/recovery tests
latency/cost measurements
Agent task quality
Workflow correctness
authority isolation
memory provenance
messaging isolation
context selection quality
retrieval quality
```

A new kernel abstraction should normally require at least one concrete application where existing primitives are awkward or semantically wrong.

> **Add runtime machinery only when it makes real applications easier to express, operate, or reason about.**
