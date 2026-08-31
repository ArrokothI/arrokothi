# Composition Model

> **Status: current v0.4 composition semantics.**
>
> Read [`mental-model.md`](mental-model.md) first. This document owns how work composes inside and across Executions: Workflow Stages, Agent composition, local computation, structured parallelism, Effects as composition primitives, child Executions, peer interaction, Adapters, retrieval patterns, completion boundaries, and Skill packaging.
>
> Runtime lifecycle, scheduling, waiting/resumption, concurrency, structural budgets, deadlock, cancellation, and supervision are defined in [`execution-runtime.md`](execution-runtime.md). Authority/delegation/exposure are defined in [`authority.md`](authority.md). Memory forms/views/Working Notes/context compilation are defined in [`memory.md`](memory.md). Portable service/interface projection and protocol mapping are defined in [`interoperability.md`](interoperability.md). Security/trust implications belong in [`security-guarantees.md`](security-guarantees.md). Unresolved composition/runtime questions belong in [`future-plan.md`](future-plan.md).

## 1. Composition does not imply an Execution boundary

The mental model defines an Execution as an independently managed runtime entity. Composition is broader than that.

Inside one Execution, work may be composed from:

```text
local functions
LLM inference
Effects
Adapters
memory/resource access
result collection
```

When composition introduces a new Execution boundary in v0.4, it does so by creating or calling a child Agent or Workflow Execution. Existing Executions may also interact across boundaries through **messaging**, without forming a parent/child composition relationship.

The important distinction is:

```text
local composition
  work remains inside the enclosing Execution

child Execution composition
  call/spawn creates another independently managed runtime entity

peer interaction
  send/ask communicates with an already-existing Execution
```

Local does not mean physically synchronous. A model invocation or other controller-local operation may suspend and resume across Activations while remaining semantically inside one Execution. See [`execution-runtime.md`](execution-runtime.md).

---

## 2. Recap: Workflow and Agent composition

As defined in [`mental-model.md`](mental-model.md), Workflow and Agent differ mainly in who owns semantic progression:

```text
Workflow
  system-defined semantic topology

Agent
  model-directed open-ended progression
```

---

## 3. Workflow composition and Stage

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
├── call child Agent Execution
└── call child Workflow Execution
```

A Stage should not grow an independent mailbox, lifecycle, ownership tree, or authority envelope. If those semantics are needed, introduce a child Execution.

> **Stage is semantic Workflow structure, not a mini-Execution.**

### System-defined topology

A Workflow may branch and loop:

```text
             ┌──────────────┐
             ▼              │
collect → evaluate → revise ┘
             │
             └→ publish
```

An LLM may choose `revise` versus `publish` if those are predefined transitions. The construct remains a Workflow because the application defined the allowed control space.

Dynamic model-driven mutation of Workflow topology is out of scope for v0.4. Prefer model-driven changes to data over model-driven changes to the graph.

For example:

```text
Structured Memory:
  preferred_language = "ja"

Translation logic reads preferred_language
```

The program can adapt without allowing the model to rewrite the Workflow topology.

---

## 4. Stage transition contract

The current v0.4 proposal keeps direct Stage-to-Stage transfer deliberately small:

```text
StageResult = text | none
```

This is a hypothesis to test, not a permanent kernel restriction.

Structured or persistent information intended for later Stages should normally use explicit shared resources:

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

This keeps Workflow graph edges easy to inspect and avoids turning transitions into a second general-purpose shared-state mechanism.

Stage transition values are a Workflow-level interface. They do **not** constrain an Execution's terminal-result type, which may be independently typed or schema-bound.

---

## 5. Stage types

v0.4 uses four semantic Stage types:

```text
Stage
├── Function Stage
├── LLM Stage
├── Agent Stage
└── Workflow Stage
```

These describe the Stage's semantic body. They do not create four new kernel Execution kinds.

### 5.1 Function Stage

A Function Stage invokes application/program code.

It may perform arbitrary local computation and may programmatically request Effects through the enclosing Workflow Execution.

Examples include:

```text
parse / validate / rank / merge
invoke a capability
retrieve from a bound resource
write Structured Memory
request user input
call/spawn an Agent or Workflow when allowed
```

The complexity of the implementation does not determine whether it deserves an Execution boundary. A 500-line function can remain local if it does not need independent runtime identity.

The same underlying capability may appear in different control structures:

```text
Function Stage
  programmer decides the capability runs

Agent capability exposure
  model decides whether/when it runs
```

That is a semantic difference even when both eventually call the same implementation.

### 5.2 LLM Stage

An LLM Stage contains **bounded, program-defined LLM work**.

It may contain one or more predetermined model inferences and Effects.

Valid examples:

```text
LLM
 ↓
text output
```

```text
LLM
 ↓
retrieval Effect
 ↓
collect result
 ↓
Stage output
```

```text
LLM
 ↓
retrieval
 ↓
LLM
 ↓
Stage output
```

The number of LLM calls does not determine Agent-ness. The Stage remains Workflow-controlled if the continuation is program-defined.

For example:

```text
LLM evaluator
  ↓
"enough" | "need_more"
  ↓
predefined Workflow branch
```

is still Workflow semantics.

An LLM Stage may suspend while its provider request is in flight. That does not make the provider call another Execution or change the Workflow into an Agent.

### 5.3 Agent Stage

An Agent Stage uses a child Agent Execution behind one Workflow Stage boundary.

The normal v0.4 form is a child `call`, because the Stage depends on the Agent's terminal result:

```text
Workflow Execution
      ↓
Agent Stage
      ↓ call
Agent Execution
      ↓
open-ended model-directed work
      ↓
terminal result
      ↓
Stage collects/adapts result
      ↓
next Stage
```

The child Agent may internally perform many model/Effect/Event cycles. The parent Workflow does not expose those cycles as graph nodes.

From the Workflow's perspective, the Agent remains an abstraction used to implement one Stage.

A detached `spawn` whose result is not required for Stage completion is a different asynchronous pattern; its semantics remain intentionally conservative in v0.4.

### 5.4 Workflow Stage

A Workflow Stage similarly calls a child Workflow Execution:

```text
Parent Workflow Execution
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

## 6. Effects are shared composition primitives

Both Workflows and Agents request runtime/environment interactions through Effects.

```text
controller / local computation
        ↓
    EffectRequest
        ↓
      Harness
        ↓
 executor / environment
        ↓
       Event
```

An Effect is not automatically a Workflow graph node. It is a runtime interaction requested while an Agent or Workflow is doing semantic work.

Examples:

```text
UseCapability
WriteMemory
SpawnExecution
SendMessage
RequestUserInput
```

Even when deterministic Function Stage logic decides that an external action should occur, **the action itself is still requested through the Harness as an Effect**.

For example:

```text
Function Stage
  calculate total        # local computation
  parse JSON             # local computation
  decide email is needed
        ↓
  request send-email Effect
        ↓
      Harness
```

This keeps the distinction clear:

```text
semantic decision
  made by Workflow/Agent logic

runtime action
  authorized/coordinated through Harness
```

Effects remain attributed to the enclosing Execution. Local Stage or Agent-step structure does not become runtime ownership. The concrete Effect is authorized under the enclosing Execution's current authority as defined in [`authority.md`](authority.md).

### Portable operation projection

The same semantic action may also be described through a portable Operation for model-facing or external interfaces. For example, a capability operation, child invocation, memory write, or peer interaction may be projected as a model tool, MCP Tool, HTTP/OpenAPI operation, or typed SDK function.

```text
portable Operation
      ↓ model/authored/external selection
resolve to local computation or typed Effect
      ↓ when runtime-mediated
Harness
```

The projection does not create another Stage or Execution, and its description/schema does not grant authority. Interaction templates such as MCP Prompts are similarly reusable composition/context objects rather than Effects by themselves. See [`interoperability.md`](interoperability.md).

---

## 7. Pending work and semantic completion dependencies

An Effect, peer interaction, model invocation, or child operation may complete later. Whether semantic work can continue depends on which continuation or completion boundary requires the result.

### Required work

If the current Stage or Agent progression depends on the result:

```text
request operation
   ↓
result required for this continuation
   ↓
continuation suspends
   ↓
result/observation arrives
   ↓
continuation may resume
```

The enclosing Execution may operationally move to `WAITING` when nothing else is runnable. Runtime suspension, interleaving, wake-up, PendingOperation, and ControllerResumption semantics belong to [`execution-runtime.md`](execution-runtime.md).

The important composition rule is:

> **Waiting for one required result suspends the dependent continuation; it does not necessarily make the whole Execution semantically incapable of processing every other Event.**

For a long-lived Agent, another message or request may legitimately create runnable progression before the original wait has resolved. For a Workflow blocked inside a Stage with no handler for that Event, it may remain non-runnable.

### Future non-blocking Agent work

A future Agent may start work that is not required before its next semantic decision:

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
future progression may consume it
```

This needs careful rules for correlation, cancellation, context insertion, and terminal completion, so broad non-blocking semantics remain future work; see [`future-plan.md`](future-plan.md).

The shared concept is:

> **Pending work belongs to the Execution; composition boundaries identify the particular continuations/completion boundaries that depend on it.**

---

## 8. Fan-out, join, and structured parallelism

A Stage or Agent progression may request several independent operations in parallel:

```text
      ┌── Effect A
work ─┼── Effect B
      └── Effect C
```

If all that is needed is:

```text
wait for A/B/C
collect [resultA, resultB, resultC]
```

that is a **mechanical join**. It does not require a dedicated Aggregator Stage.

If results need semantic processing—ranking, deduplication, conflict resolution, synthesis—that work belongs in Function/LLM logic, either inside the current bounded Stage or as an explicit later Stage.

### Parallel Workflow branches

A Workflow may also have system-defined parallel branches:

```text
             ┌── Stage B ──┐
Stage A ─────┤             ├── Stage D
             └── Stage C ──┘
```

B and C may overlap in wall-clock time. Their model calls, Effects, child Executions, and other independent operations may all run concurrently.

This does **not** require two uncontrolled Workflow-controller writers mutating the same Workflow state simultaneously.

The intended model is structured parallelism:

```text
fork / branch boundary
      ↓
branch B progress    branch C progress
      │                    │
      ├─ in-flight work    ├─ in-flight work
      │                    │
      └──── results/deltas ─┘
               ↓
          explicit join
               ↓
           next progress
```

Branch progress may be represented separately inside controller state while the Workflow controller still commits state through serialized Activations.

### Parallel branches must not silently race on shared state

If two branches can update the same logical state, the result must not silently become timing-dependent “last writer wins.”

Prefer one of:

```text
branch-local result/delta
  → explicit merge/reducer at join

commutative update
  → defined associative/merge semantics

versioned/transactional shared resource
  → resource-level concurrency semantics

separate child Executions
  → independent state + explicit communication/results
```

For example:

```text
branch B produces evidence_B
branch C produces evidence_C
        ↓
join/reducer
        ↓
evidence = merge(evidence_B, evidence_C)
```

rather than both branches freely overwriting the same controller field.

> **Parallel execution is allowed; ambiguous shared-state mutation is not silently resolved by timing.**

The exact branch snapshot/delta/reducer API is not frozen in v0.4 and belongs in [`future-plan.md`](future-plan.md) until validated against real parallel Workflow programs.

> **Not every computation deserves a Stage, just as not every computation deserves an Execution.**

---

## 9. Stage completion barrier

A Workflow transition should occur only after the current Stage reaches a stable semantic boundary.

For v0.4:

1. required local computation is complete;
2. all Effects required for this Stage to complete have resolved;
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

Effects remain runtime operations of the enclosing Workflow Execution. The Stage only identifies which operations must settle before that Stage may complete.

This prevents a misleading sequence such as:

```text
Stage A
  starts evidence retrieval
  returns too early
        ↓
Stage B starts drafting
        ↓
old retrieval from A finishes later
and mutates evidence
```

The graph says `A → B`; semantically required work from A should therefore not continue changing the assumptions of B after the transition.

For a parallel branch join, the analogous rule is that all branch work required by the join must settle and any defined merge/reducer must complete before downstream topology observes the joined state.

Truly detached/non-blocking work needs explicit semantics and is not assumed by default in v0.4.

---

## 10. Agent composition

An Agent does not use Workflow Stages to express its internal open-ended progression. Its controller repeatedly composes model inference, observations, Effects, local transformations, and child composition.

Conceptually:

```text
eligible context / Events
        ↓
Input Adapter
        ↓
LLM inference
        ↓
Output Adapter
        ↓
controller interprets result
        ↓
choose next semantic action
        ↓
Effect / child call / message / stop
        ↓
observation
        └──────────────→ next agentic progression
```

The Agent may use deterministic functions internally. Those functions do not make it a Workflow. Conversely, repeated LLM calls do not by themselves make a Workflow an Agent.

The defining property remains:

> **The model owns an open-ended semantic continuation space.**

### Agent progression vs Agent Execution

These are different boundaries.

An Agent may suspend one progression while waiting for an observation and later remain alive for another message or another progression.

```text
progression A
  waits for child/peer/tool result

another processable Event arrives
  ↓
Agent may run another Activation/progression
  ↓
original dependency remains pending
```

Whether such interleaving is permitted depends on controller semantics and runtime safety rules. It must not become uncontrolled concurrent mutation of one Agent's controller state, and a resumed continuation must not silently commit stale assumptions after intervening progress.

A response or completed model turn does not imply terminal Execution completion.

---

## 11. Recursive child composition

Agent and Workflow Executions may compose recursively using child Executions.

```text
Workflow → Agent
Workflow → Workflow
Agent → Agent
Agent → Workflow
```

The child is independently managed by the Harness and receives its own runtime identity, lifecycle, authority, mailbox, pending operations, runtime budgets, and delegated memory/context view.

### `call`

Conceptually:

```text
spawn child
+ wait for child terminal result
```

Use `call` when the current semantic operation depends on the child's completion.

### `spawn`

`spawn` creates the child without inherently defining that the current semantic boundary must wait for terminal completion.

For v0.4, detached/background child semantics should be used conservatively. A Stage that semantically depends on a child should use `call` or otherwise mark the child's completion as required before Stage transition.

### Recursive Definition graphs are allowed

Composition is not required to form an acyclic Definition graph.

These can be legitimate designs:

```text
Agent A → Agent B → Agent A
Workflow A → Workflow B → Workflow A
```

as can recursive divide-and-conquer or recursive search.

Therefore:

> **A Definition appearing in its own indirect ancestry is not, by itself, an invalid composition.**

A static authoring tool may warn about recursive dependencies, but runtime safety must come from finite structural/runtime budgets rather than banning recursion.

The runtime owns lineage-scoped limits such as descendant/spawn budget, active-descendant limits, depth, and parallelism. A child may receive only a bounded share of the remaining structural budget and cannot mint unlimited new descendant capacity. See [`execution-runtime.md`](execution-runtime.md). Child permission attenuation belongs to [`authority.md`](authority.md), and child memory visibility belongs to [`memory.md`](memory.md).

---

## 12. Cyclic waits and peer/child interaction

Composition can also form **wait cycles**, which are different from recursive Definition graphs.

Example:

```text
A calls B
A waits for B terminal result

B asks A for clarification
B waits for A reply
```

This is not necessarily a deadlock.

If A can safely process B's message while its original child-completion continuation is suspended, the sequence can progress:

```text
A waits for B
B asks A
A handles message in a later Activation
A replies
B continues and completes
A receives B result
```

The composition rule is therefore:

> **A dependency suspends the continuation that requires it; it does not automatically forbid all other semantically valid progress by that Execution.**

Runtime `WAITING`, mailbox interleaving, wait-for dependency tracking, stale-continuation safety, and deadlock diagnostics are defined in [`execution-runtime.md`](execution-runtime.md).

### Semantic deadlocks remain possible

Some cycles are genuine contradictions:

```text
A cannot produce X until B produces Y
B cannot produce Y until A produces X
```

or resource dependencies may form an unbreakable cycle.

The kernel cannot invent a correct semantic answer. It can expose the wait graph, apply deadlines/cancellation policy, and surface diagnostics so Agent/Workflow/application logic can recover or fail deliberately.

This is why:

```text
recursive composition cycle ≠ wait cycle ≠ proven deadlock
```

---

## 13. Retrieval / RAG patterns

Retrieval is not one fixed architectural shape.

### Explicit Workflow Stage

Use a retrieval Function Stage when retrieval itself is a meaningful Workflow step:

```text
LLM Stage
  formulate query
      ↓
Retrieval Function Stage
      ↓
LLM Stage
  synthesize
```

This is useful when retrieval should be visible, separately tested, configured, or transitioned around.

### Retrieval Effect inside a Stage

Use retrieval as an Effect when it is an internal operation needed to complete a bounded Stage:

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

This is the preferred compact representation when retrieval does not deserve a separate semantic graph node.

### Agentic retrieval

Use Agent composition when the model should choose an open-ended retrieval strategy:

```text
LLM
 ↓
retrieve?
 ↓
inspect
 ↓
retrieve differently?
 ↓
ask peer?
 ↓
stop?
```

The distinction is not "RAG vs no RAG". It is who owns the continuation space and whether retrieval deserves an explicit semantic boundary.

Memory retrieval/provenance semantics belong to [`memory.md`](memory.md); live external access and portable Resource/Operation projection belong to [`interoperability.md`](interoperability.md).

---

## 14. Adapters are shared boundary transformations

An **Adapter** is a lightweight, boundary-attached computation that transforms or validates data without owning semantic topology or independently interacting with the environment.

Conceptually it may return:

```text
Pass(value)
Transform(value)
Reject(reason)
```

The Adapter reports a transformation or rejection; the enclosing Stage, Workflow, or Agent controller decides the resulting control flow. An Adapter does not independently choose the next semantic action.

### Stage Adapters

```text
Stage input
    ↓
Input Adapter
    ↓
Stage computation
    ↓
Output Adapter
    ↓
Stage result / transition
```

### Agent-loop Adapters

```text
Agent context
    ↓
Input Adapter
    ↓
LLM
    ↓
Output Adapter
    ↓
Agent controller interprets result
```

v0.4 allows:

```text
Function Adapter
  one local computation

LLM Adapter
  one bounded model inference
```

Adapters are intentionally narrow:

```text
no Effects
no capability/tool use
no memory write
no spawn/call
no messaging
```

They may receive read-only access to an explicitly exposed subset of memory/context.

> **Adapter visibility cannot exceed the enclosing context from which it is derived.**

If a transformation needs retrieval, tool use, memory writes, delegation, or open-ended continuation, it belongs in Stage/Agent logic rather than an Adapter.

The timing rule is symmetrical:

> **Stage Adapters settle before Stage transition; Agent-loop Adapters settle before the next agentic decision.**

---

## 15. Working Notes at composition boundaries

Working Notes are defined in [`memory.md`](memory.md). Composition needs two consequences of that memory policy.

### Across child Execution boundaries

Ownership ancestry does not automatically expose parent notes to a child. The child receives an explicitly delegated Working Note view.

```text
parent notes
   ↓ visibility/delegation policy
selected inherited read-only view
   + child-local writable frame
```

### Across sequential Workflow Stages

Sequential Stages are not parent/child Executions. The current v0.4 proposal is:

```text
default:
  do not pass Stage-local Working Notes to the next Stage

optional:
  explicitly hand off selected/all eligible notes
```

Default no-pass prevents Working Notes from becoming a hidden second Workflow data-flow system.

When handoff is enabled, treat it as a transfer into the next Stage's working frame rather than keeping an indefinitely growing stack of every previous Stage.

Important cross-Stage information should normally use:

```text
Stage result
Structured Memory
Artifact/File
```

Parallel branches should likewise avoid implicitly sharing mutable Working Notes. Branch-local scratch state should remain branch-local unless an explicit join/handoff rule promotes selected information.

---

## 16. Skill is a composition/package abstraction

A **Skill** is reusable packaging around instructions, resources, scripts/assets, bindings, and optionally Agent/Workflow composition. It is not a new Execution kind or Effect.

Conceptually:

```text
Skill
  descriptor
  input/default bindings
  instructions/templates
  resources/references/assets
  optional scripts
  requested/recommended capabilities/resources
  optional root composition
      Agent Definition
      or Workflow Definition
```

Two useful profiles are:

```text
instruction-only Skill
  enriches current Agent context/resources
  no child Execution required by default

composition-backed Skill
  invokes/calls/spawns root Agent or Workflow Definition
  may therefore create child Execution(s)
```

A Skill may request/recommend operations/resources, but those declarations do not grant authority; see [`authority.md`](authority.md). Mapping to the external Agent Skills format belongs in [`interoperability.md`](interoperability.md).

> **Skill ≠ Execution ≠ Effect.**

---

## 17. What is not a new Stage type

A DSL or UI may expose convenient semantic labels such as:

```text
gate
router
classifier
evaluator
aggregator
guard
retriever
```

These do not need to become kernel Stage kinds. They can usually compile to Function or LLM Stages plus predefined transitions.

This keeps the semantic vocabulary small while allowing richer authoring experiences.

---

## 18. Composition invariants

The implementation should preserve:

> **Composition does not imply an Execution boundary.**

> **Workflow composition uses system-defined semantic topology; Agent composition permits model-directed open-ended progression.**

> **A Stage is a semantic Workflow boundary, not another Execution.**

> **Semantically local work may still execute asynchronously; locality means no independent Execution identity.**

> **Effects are attributed to the enclosing Execution; local composition boundaries define completion/correlation requirements.**

> **All work required for the current Stage's semantic completion settles before transition.**

> **Parallel branches may overlap in execution, but shared state must merge through explicit semantics rather than timing-dependent last-write-wins.**

> **A mechanical join does not require an Aggregator Stage.**

> **A suspended dependency blocks its continuation, not automatically every possible future Event.**

> **Recursive Definition/Execution composition is legal; finite structural budget, not acyclicity, bounds autonomous expansion.**

> **A recursive composition cycle is different from a wait cycle, and a wait cycle is not automatically a deadlock.**

> **The number of LLM calls does not determine Workflow vs Agent.**

> **Adapters transform boundaries; they do not own topology or independent runtime actions.**

> **Skill is reusable composition/package metadata, not an Execution or Effect.**

> **Prefer explicit shared state/results over hidden scratch-memory coupling.**

Broad non-blocking semantics, detached child semantics, stale-continuation policy, exact parallel-branch snapshot/merge semantics, richer Skill packaging, Adapter permissions, and Working Notes handoff remain deliberately conservative or are tracked in [`future-plan.md`](future-plan.md).