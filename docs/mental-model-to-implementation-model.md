# Mental Model → Implementation Model

This document translates [`mental-model-v0.4.md`](mental-model-v0.4.md) into implementation concepts for Agent SDK.
It is intentionally an architecture guide rather than an API specification. Exact interfaces and package boundaries may change while the implementation is reviewed.

The main rule is:

> **Workflow and Agent share the same execution substrate. They differ primarily in who owns semantic control flow.**

---

## 1. Core execution model

The fundamental runtime object is an **Executable**.

```text
Executable
├── Leaf
│   ├── LLM call
│   ├── function / code
│   └── tool call
│
└── Composite
    ├── Workflow
    └── Agent
```

A leaf is opaque to the orchestration layer: it executes and returns a result.
A composite may create or invoke child Executables, including other composites.

Definitions and executions should remain separate:

```text
ExecutableDefinition
        ↓ instantiated by runtime
ExecutionRun
        ↓ executed by
Harness / Runtime
```

An `ExecutionRun` has an id, parent id, current state, effective authority, lifecycle status, child runs, trace, and result.
The definition describes what may be run; the run records what actually happened.

A useful common shape is conceptually:

```ts
interface ExecutableDefinition {
  id: string
  kind: "llm" | "function" | "tool" | "workflow" | "agent"
  instructions?: string
  requestedScope?: ScopeRequest
  memoryPolicy?: MemoryPolicy
  inputSchema?: Schema
  outputSchema?: Schema
}
```

This is illustrative only. A definition may request authority, but it never grants itself authority.

---

## 2. Authority, capability exposure, and child scope

Authority and capability exposure are separate concepts.

### Authority Envelope

The **Authority Envelope** is the maximum authority an execution node receives when it is created.
It is immutable for the lifetime of that run.

```text
child.authority ⊆ parent.authority
```

A child may narrow authority but may never widen it.

The effective child authority is derived by the runtime:

```text
child effective authority
=
parent authority
∩ child requested scope
∩ runtime/application policy
```

The model may propose a child scope. The runtime validates it.

If an execution needs authority it does not possess, it must return a blocked/denied result to its parent or request an explicit higher-level authorization path. It cannot grant itself new authority.

### Active Capability View

The **Active Capability View** is the set of tools and knowledge sources currently exposed to an LLM call.
It is dynamic and always remains inside the node's Authority Envelope.

```text
active view ⊆ authority envelope
```

Changing the Active View is context engineering, not privilege escalation.

This lets an agent with a large authority envelope work with only a small relevant tool set at any one time.

### Capability Profile

A **Capability Profile** is a reusable, human- or system-defined grouping of related capabilities, for example:

```text
Biomedical Research
├── PubMed search
├── ClinicalTrials search
├── paper fetch
└── biomedical knowledge sources
```

A profile does not grant authority. It helps select an Active View from authority the node already possesses.

Capability discovery may later use profiles, metadata filtering, keyword/embedding retrieval, or an optional model-assisted fallback. Discovery should not require an extra LLM call when deterministic retrieval is sufficient.

---

## 3. Memory

The current memory philosophy should be preserved.

### Structured Memory

Structured Memory remains schema-defined, inspectable state with provenance and authority.

Useful application fields include:

```text
name
email
budget
```

Agent-support fields may also be defined when useful:

```text
focus
completed_tasks
open_questions
```

The model proposes writes; runtime validation establishes whether they become committed state.
A model-inferred value is not automatically authoritative.

### Working Notes

Working Notes remain free-form, agent-owned, non-authoritative memory for things such as:

```text
hypotheses
partial conclusions
loose planning
intermediate observations
```

### Artifact / File Memory

A future memory form may expose persistent artifacts such as:

```text
plan.md
research.md
CLAUDE.md-like workspace files
```

These should be treated as another memory/storage mechanism rather than a new control-flow abstraction.

### Plan and Focus

`plan` and `focus` are not universal runtime concepts. They are agent-owned memory conventions.

A plan is mutable memory: an agent may write, revise, ignore, or never create one.
A focus is a more structured current-task marker. Agent policy may optionally require a short `focus` update before consequential actions, but it should remain inspectable task state rather than hidden chain-of-thought.

---

## 4. Workflow implementation

A Workflow is a composite Executable where the system owns the control topology.

Conceptually:

```ts
interface WorkflowStage {
  id: string
  instructions?: string
  requestedScope?: ScopeRequest
  executor: ExecutableRef
  transitions: Transition[]
}
```

A stage is a workflow scheduling frame around an Executable. The stage executor may therefore be:

```text
LLM
Tool / Function
Agent
Workflow
```

Transitions may be:

```text
deterministic
LLM-evaluated
hybrid
```

An LLM selecting among predefined edges does not turn the Workflow into an Agent.
The implementation may optimize an LLM stage and its LLM transition check into one call when safe, without changing the semantic model.

The existing `Phase` idea should not remain a second long-term control abstraction. Its useful pieces—objective/instructions, scoped capabilities, condition DSL, transition tracing—can be migrated into Workflow stages and transition evaluation.

---

## 5. Agent implementation

An Agent is a composite Executable where the LLM owns semantic control flow inside its immutable Authority Envelope.

Each agent iteration conceptually receives:

```text
goal / instructions
memory
observations
active capability view
```

and may produce:

```text
action(s)
memory proposals
optional focus update
semantic status
```

The model may decide to:

```text
use a tool
retrieve knowledge
keep or change focus
revise a plan
invoke a Workflow
spawn/invoke a child Agent
return a result
yield / block / complete
```

There is no required predefined transition graph between these semantic steps.

### Completion

Keep semantic completion separate from operational termination.

```text
Agent proposes COMPLETE / YIELD / BLOCKED / CONTINUE
        ↓
Harness validates hard runtime requirements
        ↓
accept termination or continue with steering
```

A second evaluator LLM is optional policy, not a mandatory step after every agent call.

---

## 6. Harness and Runtime

The Harness/Runtime is shared infrastructure around all Executables.
It should not own the Agent's semantic reasoning and should not encode Workflow topology that belongs in a Workflow definition.

Shared responsibilities include:

- instantiate execution runs;
- enforce parent/child authority inheritance;
- compile the context visible to a node;
- dispatch LLM/tool/code execution;
- maintain the Active Capability View;
- validate capability requests;
- persist memory, events, checkpoints, and results;
- create and track child runs;
- propagate cancellation and budgets;
- enforce operational termination;
- trace the execution tree.

A useful target shape is:

```text
ExecutionRuntime
      ↓
ExecutableRunner
      ├── Leaf executor
      ├── Workflow executor
      └── Agent executor
```

The exact class names are not important. The ownership boundaries are.

---

## 7. Skills

A Skill is not a third control-flow system.
It is a reusable capability package that resolves into existing runtime concepts.

```text
Skill
├── instructions
├── resources / references
├── scripts / assets
├── executable root (Agent or Workflow)
└── recommended Capability Profile / requested scope
```

The effective authority of a Skill invocation is still derived from the parent execution and runtime policy.
A Skill never grants authority by itself.

Several Skills may reuse the same Capability Profile.

---

## 8. Mapping from the current codebase

The current implementation already contains many reusable pieces.

```text
Current concept                  Target role
------------------------------   --------------------------------------------
AgentRuntime                     durable execution/session runtime
AgentHarness                     split shared harness from agent-specific work
AgentLoopEngine                  Agent composite executor
StrandsLoopEngine                Agent executor adapter
CapabilityGateway                shared authority/capability boundary
Structured Memory               preserve and expand
Working Notes                    preserve as non-authoritative agent memory
ContextCompiler                  generalize to per-node/per-run context views
WorkflowCoordinator              legacy bounded preflight workflow, not final Workflow
Flow / Phase                     migrate useful logic into Workflow stages
Session journal / durability     preserve; extend with execution-tree identity
```

The current semantic Preflight must be given an explicit home under the new model:

- remove it from the pure Agent path when it is only scaffolding; or
- represent it as an explicit Workflow / compatibility wrapper when the decomposition is intentionally desired.

It should not remain an invisible second definition of Agent execution.

---

## 9. Migration principle

We should reuse implementation where the concepts match and replace abstractions where they do not.

The goal is not a rewrite for aesthetic reasons. The goal is to prevent two incompatible mental models from surviving inside the core.

A compatibility adapter may translate older `Flow` / `Phase` definitions at the system boundary during migration, but the new core should have one vocabulary:

```text
Executable
├── Workflow: system-owned topology
└── Agent: model-owned topology

Authority: fixed per run, monotonically narrowed for children
Capability exposure: dynamic inside authority
Memory: structured / notes / artifacts
Skill: packaged executable + resources + profile
```

That is the implementation model future features should build on.
