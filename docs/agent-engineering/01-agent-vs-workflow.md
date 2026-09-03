# Choosing Between Workflows and Agents

This document distills Anthropic's guidance on the basic composition patterns for agentic systems.

## 1. Begin with the augmented LLM

The foundational unit is not necessarily an autonomous agent. It is an LLM augmented with capabilities such as:

- retrieval,
- tools,
- memory,
- access to environmental state.

The quality of the interfaces to those capabilities matters as much as their existence.

A useful progression is:

```text
plain LLM
   |
   v
augmented LLM
   |
   +--> fixed workflow
   |
   +--> model-directed agent
```

Complexity should be added only when the task demands it.

## 2. Workflow versus agent

Anthropic draws a practical architectural boundary:

### Workflow

A workflow uses LLMs and tools inside predefined code paths.

```text
input
  |
  v
step A --> gate --> step B --> step C
```

The system designer decides the possible semantic progression in advance.

### Agent

An agent lets the model dynamically choose the next step and tool usage.

```text
goal
  |
  v
model --> action --> observation
  ^                  |
  +------------------+
```

The model owns more of the semantic progression.

### The decision rule

Prefer a workflow when:

- the task can be cleanly decomposed in advance;
- branches and stopping points are predictable;
- deterministic control is valuable;
- cost, latency, or auditability matters more than open-ended flexibility.

Prefer an agent when:

- the required number or order of steps cannot be predicted;
- the system must adapt strategy based on intermediate observations;
- tool use depends on what the environment reveals;
- there is enough trust, testing, and containment to tolerate autonomous decisions.

The cost of agent autonomy is not only tokens. It includes more opportunities for compounding error, harder evaluation, and a larger safety surface.

## 3. The main workflow patterns

Anthropic identifies several recurring workflow forms.

### 3.1 Prompt chaining

Break a task into a known sequence of smaller LLM tasks.

```text
LLM A --> check --> LLM B --> check --> LLM C
```

Use it when the subtasks are fixed and making each inference narrower improves reliability.

Typical uses:

- outline -> critique -> draft;
- extract -> transform -> format;
- generate -> validate -> continue.

Add deterministic gates where a machine-checkable condition exists.

### 3.2 Routing

Classify the input and send it to a specialized downstream path.

```text
              +--> path A
input --> router
              +--> path B
              +--> path C
```

Use it when categories are meaningfully different and classification is reliable.

Routing can select:

- specialized prompts,
- specialized tools,
- different policies,
- different models or cost tiers.

Do not route merely to create architectural neatness. The branches should correspond to real behavioral differences.

### 3.3 Parallelization

Run independent work simultaneously and aggregate the results.

Two common forms are:

```text
Sectioning
task --> [subtask A | subtask B | subtask C] --> combine

Voting
task --> [attempt 1 | attempt 2 | attempt 3] --> decide
```

Use sectioning when the task naturally decomposes into independent concerns.

Use voting when diversity of attempts or independent judgments improves confidence.

Parallelization is most useful when the branches are sufficiently independent that serial execution provides no important information advantage.

### 3.4 Orchestrator-workers

A model dynamically decomposes the task, creates worker assignments, and synthesizes the results.

```text
             +--> worker A --+
orchestrator +--> worker B --+--> synthesis
             +--> worker C --+
```

This resembles parallelization structurally, but the important difference is that the subtasks are not predefined. The orchestrator decides them from the specific input.

Use it when:

- decomposition is necessary but cannot be fully predicted;
- subtasks can be delegated with clear boundaries;
- parallel search or analysis provides real benefit.

### 3.5 Evaluator-optimizer

One model produces work and another evaluates it, with feedback returning to the generator.

```text
generator --> candidate --> evaluator
    ^                         |
    +--------- feedback ------+
```

Use it when:

- the quality criteria can be articulated;
- feedback can reliably distinguish better from worse;
- repeated refinement is worth the additional latency and cost.

The evaluator must be calibrated. A nominally separate evaluator that rubber-stamps outputs does not create useful independence.

## 4. The autonomous agent loop

A basic agent is often simpler than its surrounding infrastructure:

```text
goal
  |
  v
model
  |
  v
choose tool/action
  |
  v
environment result
  |
  +--------> model
```

Three engineering requirements make this loop useful.

### 4.1 Ground truth

The model should repeatedly observe real environmental results.

Examples:

- compiler output,
- tests,
- database state,
- file contents,
- API results,
- browser state.

Do not make the model infer success when the environment can report it.

### 4.2 Stopping conditions

Open-ended loops need explicit limits or completion rules, such as:

- objective completion;
- maximum iterations;
- time or token budget;
- repeated lack of progress;
- safety escalation;
- request for human judgment.

### 4.3 Recoverability

Because a multi-step agent can make mistakes, the environment should support:

- validation before irreversible actions;
- checkpoints;
- rollback or version history where possible;
- retries with actionable error feedback.

## 5. Combining patterns

Real systems can mix workflows and agents.

For example:

```text
deterministic router
   |
   +--> fixed extraction workflow
   |
   +--> open-ended research agent
   |
   +--> generator/evaluator loop
```

The useful question is not "Is the whole product an agent?" It is:

> At which points does model-directed progression create value that predefined control flow cannot provide?

Keep deterministic structure around parts that are stable and well understood. Reserve autonomy for the uncertain parts.

## 6. Anti-patterns

### Making everything an agent

If the task has a fixed path, model-directed planning adds avoidable variance and cost.

### Making every step deterministic

If the task requires adapting to discoveries, an overly rigid workflow forces the designer to predict the unpredictable.

### Using a framework before understanding the loop

Frameworks can hide prompts, tool schemas, intermediate messages, and retry behavior. Abstraction is useful only when the underlying behavior remains inspectable.

### Treating model confidence as completion evidence

An agent saying "done" is not ground truth. Verify the environment.

## 7. Composition checklist

Before selecting a pattern:

- Is the task structure known in advance?
- Are there distinct categories that justify routing?
- Are important subtasks independent enough to parallelize?
- Does decomposition need to be chosen dynamically?
- Can a separate evaluator apply meaningful criteria?
- What environmental observations will tell the system whether it is progressing?
- What is the stopping condition?
- What cost and latency increase is acceptable?
- Can a simpler workflow achieve the same evaluated outcome?

If the last answer is yes, prefer the simpler workflow.
