# Agent and Workflow Engineering

This directory is a framework-neutral engineering guide for designing LLM workflows and agents.

It synthesizes Anthropic's public engineering articles and Claude documentation into reusable design knowledge. It intentionally does **not** define or depend on ArrokothI architecture. Treat these documents as external engineering guidance, not as canonical kernel semantics.

Last source verification: **2026-09-03**.

## Core mental model

An agentic system can be understood as a model operating inside a surrounding system:

```text
User goal
   |
   v
Context ---> Model ---> Action / tool interface ---> Environment
   ^           |                                  |
   |           +---------- next decision <--------+
   |
   +---- memory, retrieved state, tool results, instructions
```

The surrounding harness supplies the things a model cannot reliably provide by itself:

```text
Harness
├── context construction
├── tool exposure and routing
├── execution environment
├── persistence and recovery
├── budgets and stopping conditions
├── permissions and containment
└── observability and evaluation hooks
```

The most important architectural distinction is:

```text
Workflow
= code determines the semantic path

Agent
= the model dynamically determines the semantic path
```

Both are "agentic systems" in Anthropic's terminology. Neither is automatically better.

## Engineering principles

Use these as default rules unless evaluations show otherwise.

1. **Start with the simplest system that can solve the task.** Agentic systems trade additional cost and latency for flexibility and performance.
2. **Prefer workflows when the path is knowable.** Fixed decomposition, routing, parallel branches, or evaluation loops are easier to reason about when the task structure is predictable.
3. **Use an agent when the required sequence of steps cannot be known in advance.** The agent loop should repeatedly obtain ground truth from tools or the environment.
4. **Treat tool design as an agent-computer interface problem, not an API-wrapping exercise.** Tools should have distinct purposes, legible names, useful errors, and high-signal outputs.
5. **Treat context as a scarce working set.** The goal is not to expose everything; it is to expose the smallest high-signal set of tokens likely to produce the desired behavior.
6. **Use progressive disclosure.** Give the model lightweight identifiers or metadata first, then let it load detailed tools, files, skills, or data only when needed.
7. **Externalize continuity.** Long-running work should survive context resets through durable artifacts such as task lists, notes, tests, version history, and event/session logs.
8. **Use multi-agent systems only when parallelism, context isolation, or decomposition earns its cost.** Delegation itself must be engineered.
9. **Separate generation from evaluation when independent checking creates measurable lift.** A dedicated evaluator is most valuable near the boundary of what the generator can do reliably on its own.
10. **Bound autonomy with deterministic controls.** Sandboxes, filesystem boundaries, network controls, and egress policies should constrain blast radius even when model-level safeguards fail.
11. **Evaluate outcomes, not self-reports.** A successful transcript is not proof that the environment reached the required final state.
12. **Assume harness workarounds can become obsolete.** Keep stable interfaces around durable state and execution resources so the internal harness can evolve with model capability.

## Document map

| Document | Use it when |
|---|---|
| [`01-agent-vs-workflow.md`](01-agent-vs-workflow.md) | deciding whether to use a workflow, an agent, or a composition of both |
| [`02-context-tools-and-skills.md`](02-context-tools-and-skills.md) | designing prompts, context, tool surfaces, skills, MCP exposure, and progressive disclosure |
| [`03-long-running-and-multi-agent.md`](03-long-running-and-multi-agent.md) | designing long-horizon work, state handoffs, subagents, planners, generators, evaluators, or durable sessions |
| [`04-safety-and-evaluation.md`](04-safety-and-evaluation.md) | designing authority boundaries, containment, permission gates, tests, graders, and agent evals |
| [`sources.md`](sources.md) | tracing a claim back to the Anthropic article or Claude documentation that motivated it |

## Recommended reading order for builders

```text
01 Agent vs Workflow
        |
        v
02 Context, Tools, Skills
        |
        v
03 Long-Running and Multi-Agent
        |
        v
04 Safety and Evaluation
        |
        v
Sources / primary references
```

If you are building a small system, you may only need the first two documents plus the relevant safety and eval sections. Do not adopt every pattern simply because it exists.

## A compact design procedure

Before implementing an agentic system, answer these questions in order:

1. What observable outcome defines success?
2. Can a deterministic program solve the task?
3. If an LLM is needed, can the task be expressed as a fixed workflow?
4. Which parts genuinely require model-directed progression?
5. What environmental ground truth can the model observe after each important action?
6. What is the smallest tool and context surface needed for the next decision?
7. What state must survive beyond the current context window?
8. Which actions can be safely executed without human approval, and inside what containment boundary?
9. What stopping condition prevents runaway cost or compounding errors?
10. How will the system be evaluated against final outcomes, not just plausible-looking traces?

This sequence intentionally places success criteria and system simplification before autonomy.
