# Mental Model v0.4: Executable Nodes, Workflows, and Agents

This document describes the mental model we want to use when thinking about the Agent SDK. It is intentionally small. The goal is to make workflow and agent execution composable without pretending they are the same thing.

## 1. The basic unit: an executable node

Everything that can run is an **executable node**.

Each node has four core concerns:

1. **Goal / instructions** — what this node is supposed to accomplish.
2. **Scope / authorization** — what tools, memory, resources, and child capabilities it may access.
3. **Memory / state** — information available to the node and information it may persist.
4. **Execution** — how the node actually does the work.

Nodes form an execution tree:

```text
Executable Node
├── Leaf
│   ├── LLM call
│   ├── function / code
│   └── tool call
│
└── Composite
    ├── Workflow
    └── Agent
```

A leaf is opaque to the orchestration layer: it runs and returns a result. A composite can create and execute child nodes, including other composite nodes.

For every child:

```text
child authority ⊆ parent authority
```

A child may discover new information through authorized actions, but it cannot gain permissions that its parent did not have.

## 2. The harness

The **harness** is the shared runtime around every node. It is responsible for infrastructure, not for deciding the semantic task itself.

Typical harness responsibilities include:

- assemble context;
- enforce scope and permissions;
- execute LLM/tool/code calls;
- persist memory and state;
- create child executions;
- route observations/results;
- enforce budgets, retries, and lifecycle rules;
- trace the execution tree.

Workflow and agent should therefore reuse most of the same harness/runtime implementation.

## 3. Workflow: the system owns control flow

A **workflow** is a composite executable whose semantic control topology is defined outside the executing LLM.

A workflow defines stages and possible transitions:

```text
Stage A
   │
   ├── condition X → Stage B
   └── condition Y → Stage C
```

The transition itself may be deterministic, LLM-evaluated, or hybrid. This is still a workflow because the allowed control space was predefined.

For example:

```text
LLM Stage A
    ↓
LLM evaluates whether A is complete
    ↓
LLM Stage B
```

This is three LLM calls, but it is still a workflow.

The evaluation may sometimes be collapsed into the stage call:

```json
{
  "result": "...",
  "transition": "stage_b"
}
```

That still does not make it an agent. The LLM is selecting from transitions defined by the system.

A useful summary is:

```text
Workflow: the system defines the transition function.
```

## 4. Agent: the LLM owns semantic control flow

An **agent** is a composite executable where the LLM itself owns the semantic control flow within the authority given by the harness.

The system provides:

- the goal;
- the available tools/resources;
- memory;
- hard constraints and authorization.

The LLM decides things such as:

- what to do next;
- whether to keep or change its current focus;
- whether to create or revise a plan;
- whether to delegate to a child agent;
- whether to invoke a workflow;
- whether to revisit earlier work;
- whether it believes the task is complete.

There is no required predefined transition graph between semantic steps.

```text
Agent: the LLM is the transition function.
```

A plan is therefore different from a workflow graph. A workflow graph is normative control structure; an agent plan is mutable memory. The model may revise it, ignore it, or not create one at all.

We may expose a structured `focus` field because it is useful for continuity across turns, but `focus` is still agent-owned state, not a workflow stage imposed by the runtime. 

(Rex's comment: this can somehow serve as Chain of Thought, the LLM decide its current `focus` first, so the subsequent content would not bias this focus too much. My current instinct is to enforce each agent LLM to write this `focus` first.)

## 5. Completion: semantic vs operational

The agent should normally decide whether it believes its work is complete. Requiring a second evaluator LLM after every agent turn would unnecessarily turn the agent loop into an evaluator workflow.

Instead, separate two ideas:

- **Semantic completion** — the agent says `continue`, `complete`, `blocked`, `yield`, etc.
- **Operational termination** — the harness decides whether execution may actually stop.

Example:

```text
Agent: COMPLETE
   ↓
Harness checks hard requirements
   ├── valid → return result
   └── invalid → add steering information and continue
```

An evaluator LLM can be added when a task needs one, but it is an optional outer gate rather than a fundamental part of every agent turn.

For interactive agents, `yield` is useful: the execution can stop consuming compute while the session/state remains available for the user's next instruction.

## 6. Recursive composition

Because workflow and agent implement the same executable abstraction, they can contain each other:

```text
Workflow
├── LLM call
├── Agent
│   ├── Tool
│   └── Workflow
│       ├── Code
│       └── Agent
└── Code
```

Likewise, an agent action may target a workflow or another agent:

```text
Agent
  ├── search tool
  ├── valuation workflow
  └── research subagent
```

This gives us a simple implementation principle:

> **Workflow and agent should share the execution substrate and node interface, but differ in who owns semantic control flow.**

## 7. A small example

Suppose the goal is to research a biomedical topic and produce a report.

### Workflow version

```text
Gather sources
  ↓
Evidence sufficient?
  ├── no → Gather more
  └── yes → Analyze
               ↓
             Draft
               ↓
             Validate
```

The graph is explicit. Individual stages may themselves use LLMs or agents.

### Agent version

```text
Goal: research topic and produce report

LLM chooses focus → search → observe
LLM keeps focus   → read paper → observe
LLM changes focus → compare evidence → observe
LLM revises plan  → investigate missing issue
LLM decides task is complete → return
```

The harness enforces authorization and lifecycle, but the LLM decides the semantic path.

## 8. The boundary in one sentence

The amount of LLM usage does not define whether something is a workflow or an agent.

> **The key distinction is how much authority the LLM has over the execution topology: workflows externalize control flow; agents generate it during execution.**
