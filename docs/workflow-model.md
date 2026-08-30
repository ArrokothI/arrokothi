# Workflow Model

> **Status: current v0.4 Workflow semantics.**
>
> Read [`mental-model.md`](mental-model.md) first. This document refines the Workflow side of that model. It is more experimental than the mental model and may change as implementation evidence accumulates.

## 1. Workflow as system-defined topology

A Workflow is an Execution whose possible semantic paths are defined by the application.

```text
Stage A → Stage B → Stage C
```

The Workflow may branch or loop:

```text
             ┌──────────────┐
             ▼              │
collect → evaluate → revise ┘
             │
             └→ publish
```

An LLM may choose among predefined branches and the construct is still a Workflow. What matters is that the application defines the possible control space.

Dynamic mutation of Workflow topology by a model is out of scope for v0.4. Prefer model-driven changes to **data** over model-driven changes to the graph.

Example:

```text
Structured Memory:
  preferred_language = "ja"

Translation Adapter reads preferred_language
```

The Agent/LLM can change behavior by writing data without rewriting Workflow structure.

---

## 2. Stage is the Workflow semantic boundary

A **Stage** is a bounded semantic unit inside a Workflow. It participates in Workflow topology but is not independently managed as an Execution.

```text
Workflow Execution
  ↓
Stage A
  ↓
Stage B
```

A Stage may be internally complex:

```text
Stage
├── local functions
├── one or more predetermined LLM calls
├── Effects and result collection
├── Adapters
├── call Agent Execution
└── call Workflow Execution
```

A Stage should not grow an independent mailbox, lifecycle, ownership tree, or full authority envelope. If those semantics are needed, introduce a child Execution with `call` or `spawn`.

> **Stage is semantic Workflow structure, not a mini-Execution.**

---

## 3. Stage transition contract

The current v0.4 proposal keeps Stage-to-Stage transfer deliberately small:

```text
StageResult = text | none
```

This is a hypothesis to test, not an eternal rule. It keeps graph edges easy to inspect and avoids turning Workflow transitions into a second general-purpose state transport.

Structured or persistent information intended for later Stages should normally be written explicitly to:

```text
Structured Memory
Artifacts / Files
bound resources
```

Example:

```text
Research Stage
  writes structured_memory.evidence
  returns "evidence collected"
        ↓
Draft Stage
  reads structured_memory.evidence
```

The transition result is a small local value; the explicit memory/resource layer carries shared application data.

Stage transition values are a Workflow-level interface. They do not constrain an Execution's terminal-result type, which may be typed or schema-bound independently.

---

## 4. Stage types

v0.4 has four semantic Stage types:

```text
Stage
├── Function Stage
├── LLM Stage
├── Agent Stage
└── Workflow Stage
```

These describe who performs the Stage's work. They do not create four new kernel Execution kinds.

### 4.1 Function Stage

A Function Stage invokes application/program code.

It may perform arbitrary local deterministic computation and may programmatically request Effects through the enclosing Workflow Execution.

Examples:

```text
parse / validate / rank / merge
query a bound knowledge resource
invoke a capability
write Structured Memory
call/spawn an Agent or Workflow
request user input
```

The complexity of the function implementation does not determine whether it deserves an Execution boundary. A 500-line function can remain one Function Stage if it does not need independent runtime identity.

The same underlying capability can be used in two ways:

```text
Function Stage
  programmer decides the capability runs

Agent tool exposure
  model decides whether/when it runs
```

This is a semantic difference even if both eventually invoke the same code.

### 4.2 LLM Stage

An LLM Stage contains **bounded, program-defined LLM work**.

It may contain one or more predetermined model inferences and internal Effects.

Valid examples:

```text
LLM
 ↓
text output
```

```text
LLM
 ↓
RAG Effect
 ↓
collect retrieval result
 ↓
Stage output = model response + retrieval result
```

```text
LLM
 ↓
RAG
 ↓
LLM
 ↓
text output
```

The number of LLM calls does not make the Stage an Agent. It remains Workflow-controlled if the possible continuation is defined by the program.

For example:

```text
LLM evaluator
  ↓
"enough" | "need_more"
  ↓
predefined Workflow branch
```

is still Workflow semantics.

An Agent begins when the model has an open-ended ability to repeatedly choose the next semantic operation: retrieve again, use another capability, inspect memory, ask the user, delegate, stop, and so on.

### 4.3 Agent Stage

An Agent Stage introduces a child Agent Execution behind one Workflow Stage boundary.

```text
Workflow Execution
      ↓
Agent Stage
      ↓ call/spawn
Agent Execution
      ↓
terminal result
      ↓
Stage collects/adapts result
      ↓
next Workflow Stage
```

The Agent may internally run many model/Effect/Event cycles. The parent Workflow does not expose those cycles as graph nodes.

From the Workflow's perspective, the Agent remains an abstraction used to implement one Stage.

### 4.4 Workflow Stage

A Workflow Stage similarly invokes a child Workflow Execution:

```text
Parent Workflow
      ↓
Workflow Stage
      ↓ call
Child Workflow Execution
      ↓
terminal result
      ↓
next parent Stage
```

This provides recursive composition without flattening nested Workflow topology into the parent graph.

---

## 5. Effects live inside Stage execution

A Stage may request Effects, but Effects are not normally represented as Workflow graph nodes.

Example:

```text
LLM Stage
   ├── retrieve source A
   ├── retrieve source B
   └── WriteMemory
          ↓
       Harness
          ↓
      result Events
          ↓
       Stage collects
          ↓
       Stage result
```

This keeps two different concepts separate:

```text
Workflow Stage
  explicit semantic step chosen by programmer

Effect
  runtime interaction requested while that step runs
```

A consequential action still crosses the Harness Effect boundary even when a Function Stage deterministically decided to perform it.

### Fan-out and join

A single model inference or function invocation may request several Effects.

```text
Stage
  ├── Effect A
  ├── Effect B
  └── Effect C
```

The runtime can mechanically collect their results:

```text
[A, B, C]
```

A dedicated Aggregator Stage is unnecessary for a mechanical join.

If the results need semantic work—ranking, deduplication, conflict resolution, synthesis—use a Function or LLM Stage.

---

## 6. Stage completion barrier

A Workflow transition should occur only after the Stage reaches a stable boundary.

For v0.4:

1. required local computation is complete;
2. all **blocking Effects required for this Stage to complete** have resolved;
3. their Events/results have been collected;
4. child calls required for completion have returned;
5. Stage output Adapters have completed;
6. the final `text | none` Stage result is ready.

```text
┌──────────────────── Stage A ────────────────────┐
│ computation                                      │
│    ├── Effects                                   │
│    ├── child Execution calls                     │
│    └── result Events                             │
│             ↓                                    │
│        collect / settle                          │
│             ↓                                    │
│        output Adapter                            │
└──────────────────┬───────────────────────────────┘
                   │ text | none
                   ▼
                Stage B
```

This is the **Stage completion barrier**.

Effects remain owned/attributed at the enclosing Execution level. The Stage completion barrier merely identifies which pending operations are required for the current Stage to settle; it does not give the Stage runtime ownership.

This prevents Stage A from leaving semantically important background work that later mutates state after the Workflow has already advanced to Stage B.

---

## 7. Blocking and future non-blocking work

### Blocking work

For a Stage or Agent step that depends on a result:

```text
request Effect
   ↓
wait
   ↓
Event/result arrives
   ↓
continue
```

The Execution may operationally move to `WAITING`; the Stage abstraction simply resumes when the required Event is available.

### Non-blocking Agent work

A future Agent may request work that is not required before the next agentic step:

```text
LLM turn N
   ↓
start Effect A
   ↓
Agent continues
   ↓
Effect A later completes
   ↓
Event enters mailbox
   ↓
future agentic step may consume it
```

Non-blocking semantics need careful correlation and context rules and remain future work.

When an Agent sits behind an Agent Stage, **the Stage still does not transition until all pending work designated as required for Stage completion has settled**.

This distinction allows non-blocking work inside an Agent without making Workflow Stage completion ambiguous.

---

## 8. Retrieval / RAG patterns

RAG can be modeled in more than one valid way.

### Explicit Workflow step

Use an explicit retrieval Function Stage when retrieval is part of the application's semantic process:

```text
LLM Stage
  formulate query
      ↓
Retrieval Function Stage
      ↓
LLM Stage
  synthesize
```

This is useful when the retrieval step itself should be visible, testable, or independently configured in the Workflow graph.

### Retrieval as an Effect inside a Stage

Use a retrieval Effect when retrieval is merely an internal operation needed to complete a Stage:

```text
LLM Stage
  LLM
   ↓
  retrieval Effect
   ↓
  collect result
   ↓
  Stage output
```

This is generally the preferred compact representation when retrieval does not deserve a separate semantic Workflow node.

### Agentic retrieval

Use an Agent Stage when the model should decide an open-ended retrieval strategy:

```text
LLM
 ↓
retrieve?
 ↓
inspect result
 ↓
retrieve differently?
 ↓
ask peer?
 ↓
stop?
```

The distinction is not "RAG vs no RAG". It is who owns the continuation space.

---

## 9. Adapters

An **Adapter** is a lightweight, boundary-attached computation that transforms or validates data without owning Workflow topology or independently interacting with the environment.

```text
Stage
  input
    ↓
  Input Adapter
    ↓
  Stage computation
    ↓
  Output Adapter
    ↓
  adapted Stage result
    ↓
  transition
```

The Workflow transition sees only the adapted result.

An Adapter may conceptually return:

```text
Pass(value)
Transform(value)
Reject(reason)
```

If it rejects, the enclosing Stage/Workflow decides the control-flow consequence. The Adapter does not choose an arbitrary next Stage.

### Adapter implementations

v0.4 allows:

```text
Function Adapter
  one local function computation

LLM Adapter
  one bounded model inference
```

Adapters are intentionally narrower than Stages:

```text
Adapter
  no Effects
  no capability/tool use
  no memory write
  no spawn/call
  no messaging
```

They may receive read-only access to an explicitly exposed subset of memory.

> **Adapter authority/visibility cannot exceed its enclosing Stage/Execution.**

If a transformation needs retrieval, tool use, memory writes, delegation, or open-ended continuation, it should become Stage or Agent logic instead.

---

## 10. Adapters inside an Agentic loop

Adapters are not limited to outer Workflow boundaries. They can attach around each model-call boundary inside an Agent controller.

```text
Agent controller
      ↓
Input Adapter
      ↓
LLM inference
      ↓
Output Adapter
      ↓
Agent interprets adapted output
      ↓
Effects / next agentic step
```

This provides a clean place for:

```text
translation
input normalization
safety validation
structured output repair
policy checks
output transformation
```

without representing every check as a Workflow Stage.

The timing rule is symmetrical:

> **Stage Adapters settle before Stage transition; Agent-loop Adapters settle before the next agentic decision.**

---

## 11. Notes across Workflow Stages

Working Notes are runtime memory policy, described fully in [`runtime-architecture.md`](runtime-architecture.md), but Workflow transition needs one rule.

The current proposal is:

```text
default:
  do not pass Stage-local Working Notes to the next Stage

optional:
  explicitly hand them off to the next Stage
```

Default no-pass prevents Working Notes from becoming a hidden second data-flow system. Important information should normally use Stage result, Structured Memory, or Artifacts.

When pass is enabled, think of it as a handoff rather than indefinitely accumulating old Stage frames.

---

## 12. What is not a new Stage type

The UI or DSL may expose convenient semantic labels such as:

```text
gate
router
classifier
evaluator
aggregator
guard
retriever
```

These do not need to become kernel Stage kinds.

They can compile to Function or LLM Stages plus predefined transitions.

This keeps the kernel vocabulary small while allowing richer authoring experiences.

---

## 13. Workflow invariants

The implementation should preserve:

> **The application defines the possible Workflow topology.**

> **A Stage is a semantic Workflow boundary, not another Execution.**

> **A Stage may hide complex local work and Effects.**

> **All work required for the current Stage's completion settles before transition.**

> **Effects are attributed to the enclosing Execution; Stage completion only defines a completion/correlation scope.**

> **Effects are runtime interactions, not automatically graph nodes.**

> **The number of LLM calls does not determine Workflow vs Agent.**

> **Adapters transform boundaries; they do not own topology or independent runtime actions.**

> **Prefer explicit shared state over hidden cross-Stage scratch-memory coupling.**

The exact Stage result type, non-blocking Effect model, and Working Notes handoff policy should be validated through implementation and conformance tests before being treated as permanent.
