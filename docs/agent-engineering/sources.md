# Anthropic Source Index

This index lists the Anthropic engineering articles and Claude documentation used to build the guides in this directory.

The documents in this directory are a synthesis, not an Anthropic publication. When precision matters, consult the primary source.

Last verified: **2026-09-03**.

## Foundations

### Building effective agents — December 19, 2024

https://www.anthropic.com/engineering/building-effective-agents

Primary ideas used here:

- workflows versus agents;
- augmented LLMs;
- prompt chaining;
- routing;
- parallelization;
- orchestrator-workers;
- evaluator-optimizer;
- autonomous tool-use loops;
- ground truth and stopping conditions;
- start with the simplest approach that works.

### Prompt engineering overview — living documentation

https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview

Primary ideas used here:

- define success criteria before optimizing prompts;
- establish empirical evaluation before prompt iteration.

### Prompting best practices — living documentation

https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices

Primary ideas used here:

- clear instructions and examples;
- agentic prompting;
- long-horizon state tracking;
- multi-context workflows;
- saving structured state before context transitions.

### Best practices for prompt engineering — November 10, 2025

https://claude.com/blog/best-practices-for-prompt-engineering

Primary ideas used here:

- clarity and explicitness;
- context and motivation;
- structured prompting as a foundation for context engineering.

## Tools, context, and skills

### Writing effective tools for agents — with agents — September 11, 2025

https://www.anthropic.com/engineering/writing-tools-for-agents

Primary ideas used here:

- agent affordances differ from traditional software;
- avoid blindly wrapping API endpoints;
- give tools distinct purposes;
- namespace large tool sets;
- return high-signal context;
- make errors actionable;
- treat descriptions and schemas as prompt surfaces;
- evaluate tools empirically.

### Effective context engineering for AI agents — September 29, 2025

https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

Primary ideas used here:

- context engineering versus prompt engineering;
- context as a finite resource;
- just-in-time retrieval;
- lightweight identifiers and progressive disclosure;
- compaction;
- tool-result clearing;
- structured note-taking;
- context isolation through multi-agent architectures.

### Equipping agents for the real world with Agent Skills — October 16, 2025

https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills

Primary ideas used here:

- procedural knowledge packaged as instructions, scripts, and resources;
- skill metadata;
- progressive disclosure;
- loading detailed skill content only when relevant.

### Code execution with MCP: Building more efficient agents — November 4, 2025

https://www.anthropic.com/engineering/code-execution-with-mcp

Primary ideas used here:

- large tool catalogs overload context when loaded upfront;
- load tool definitions on demand;
- filter and transform large tool results before they reach the model;
- express loops, conditions, joins, and orchestration in code when appropriate;
- keep some intermediate sensitive data outside model context;
- code execution requires a secure runtime.

### Introducing advanced tool use on the Claude Developer Platform — November 24, 2025

https://www.anthropic.com/engineering/advanced-tool-use

Primary ideas used here:

- dynamic tool discovery;
- programmatic tool calling;
- tool-use examples;
- progressive disclosure for very large tool libraries.

## Long-running and multi-agent systems

### How we built our multi-agent research system — June 13, 2025

https://www.anthropic.com/engineering/multi-agent-research-system

Primary ideas used here:

- lead-agent / subagent architecture;
- explicit delegation instructions;
- scaling effort to query complexity;
- parallel agents and parallel tool calls;
- context isolation;
- token economics of multi-agent systems;
- emergent coordination failures.

### Effective harnesses for long-running agents — November 26, 2025

https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

Primary ideas used here:

- initializer versus continuation sessions;
- feature/task inventories;
- progress notes;
- git history;
- startup scripts;
- incremental work;
- verification before marking progress complete;
- rebuilding state in a fresh context window.

### Harness design for long-running application development — March 24, 2026

https://www.anthropic.com/engineering/harness-design-long-running-apps

Primary ideas used here:

- planner, generator, evaluator roles;
- explicit grading criteria;
- evaluator calibration;
- verification against running applications;
- evaluator usefulness depends on model capability and task difficulty;
- harness structure should change as models improve.

### Scaling Managed Agents: Decoupling the brain from the hands — April 8, 2026

https://www.anthropic.com/engineering/managed-agents

Primary ideas used here:

- harness assumptions can become stale;
- separate model/harness "brain" from execution "hands";
- durable session log separate from active context;
- recoverable context history;
- stable interfaces around replaceable implementations;
- lazy provisioning and multiple execution environments.

## Safety, authority, and containment

### Beyond permission prompts: making Claude Code more secure and autonomous — October 20, 2025

https://www.anthropic.com/engineering/claude-code-sandboxing

Primary ideas used here:

- filesystem isolation;
- network isolation;
- fewer approval prompts inside deterministic boundaries;
- sandbox descendant processes, not only direct commands.

### How we built Claude Code auto mode: a safer way to skip permissions — March 25, 2026

https://www.anthropic.com/engineering/claude-code-auto-mode

Primary ideas used here:

- approval fatigue;
- input-layer injection screening;
- action classification;
- evaluate real-world action impact;
- user intent is narrower than every action that might help the goal;
- defense in depth across tool inputs and tool outputs/actions.

### How we contain Claude across products — May 25, 2026

https://www.anthropic.com/engineering/how-we-contain-claude

Primary ideas used here:

- risk includes both failure probability and blast radius;
- containment limits what the agent can do, not merely what it chooses to do;
- deterministic environment boundaries complement probabilistic model safeguards;
- credential isolation and egress controls;
- external tool content is an attack surface.

## Evaluation

### Demystifying evals for AI agents — January 9, 2026

https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents

Primary ideas used here:

- task, trial, transcript/trajectory, outcome, grader;
- agent harness versus evaluation harness;
- outcome verification;
- code-based, model-based, and human graders;
- operational metrics such as turns, tool calls, tokens, and latency;
- realistic agent evals and careful debugging of eval failures.

## Suggested primary-source reading order

```text
Building effective agents
        |
        v
Writing effective tools for agents
        |
        v
Effective context engineering
        |
        v
Agent Skills
        |
        v
Multi-agent research system
        |
        v
Effective harnesses for long-running agents
        |
        v
Code execution with MCP
        |
        v
Advanced tool use
        |
        v
Harness design for long-running apps
        |
        v
Managed Agents
        |
        v
Sandboxing / Auto Mode / Containment
        |
        v
Demystifying evals for AI agents
```

Prompt-engineering documentation is best treated as a living reference alongside this sequence.
