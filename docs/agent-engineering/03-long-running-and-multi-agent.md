# Long-Running, Multi-Agent, and Harness Design

Long-horizon work exposes a central weakness of LLM agents: logical work can span longer than a single context window or execution session. Anthropic's engineering work addresses this by moving continuity into the surrounding environment and by treating delegation and evaluation as explicit system design problems.

## 1. Long-running work is a continuity problem

A long task may be logically continuous while the model contexts are physically discontinuous.

```text
context A
   |
   | externalize state
   v
durable environment
   ^
   | reconstruct state
   |
context B
```

The goal is not to make the model remember everything internally. The goal is to make the next model session able to recover the state that matters.

## 2. Externalize task state

Anthropic's long-running coding experiments used several durable artifacts:

- a comprehensive feature/task list;
- a progress log;
- version-control history;
- an environment startup script;
- tests and end-to-end verification.

The general pattern is more important than the file names.

```text
requirements / task inventory
progress state
working artifacts
verification machinery
history / rollback points
```

These artifacts let a fresh context answer:

1. What is the objective?
2. What has already been completed?
3. What remains?
4. What is currently broken or uncertain?
5. How do I run and verify the system?
6. What was the last known-good state?

## 3. Separate initialization from continuation

The first session often has different responsibilities from later sessions.

### Initializer

The initializer creates the scaffolding for future work:

- expands the objective into a structured task inventory;
- establishes progress tracking;
- establishes a known execution/test procedure;
- creates an initial clean checkpoint.

### Continuation worker

Each later session:

- reconstructs the current state;
- chooses a bounded unit of work;
- implements it;
- verifies it;
- records progress;
- leaves a clean handoff.

This is a harness pattern, not a claim that every task requires two different model identities.

## 4. Make incremental progress

A long-running agent should avoid attempting the whole project in one context.

A strong iteration shape is:

```text
reconstruct state
     |
     v
choose one bounded objective
     |
     v
implement
     |
     v
verify against ground truth
     |
     v
checkpoint + progress note
     |
     v
next context / next objective
```

Incrementality limits the damage of mistakes and makes recovery easier.

"Done" should be tied to verified requirements, not to the model's impression that the project looks complete.

## 5. Treat verification as backpressure

Agents can generate work faster than they can reliably judge it.

Use environmental checks that can reject incorrect progress:

- unit tests;
- integration tests;
- end-to-end interaction;
- compilers;
- type checkers;
- linters;
- static analysis;
- browser automation;
- database assertions;
- deterministic validators.

These mechanisms turn the environment into a source of ground truth rather than relying on self-assessment.

## 6. Multi-agent systems add capacity, not magic

Anthropic's research system uses a lead agent that decomposes a research goal and delegates different aspects to subagents.

```text
                lead agent
             /      |       \
            v       v        v
        subagent subagent subagent
             \      |       /
              \     |      /
                synthesis
```

This design can help when:

- independent exploration can happen in parallel;
- separate context windows prevent unrelated information from competing for attention;
- the task benefits from greater total reasoning/tool-use budget;
- the orchestrator can define useful, non-overlapping assignments.

The cost includes:

- more tokens;
- more tool calls;
- harder debugging;
- coordination failures;
- duplicated work;
- more complex evaluation.

Do not add subagents merely because the task is "complex."

## 7. Delegation must be explicit

A good worker assignment should specify:

- objective;
- scope and boundaries;
- expected output format;
- relevant tools;
- preferred sources or evidence requirements;
- effort budget or stopping rule;
- what not to duplicate.

Vague delegation creates overlap and gaps.

A lead agent should also scale effort to task complexity. Simple fact-finding may not justify subagents at all.

## 8. Parallelism has two levels

Multi-agent systems can parallelize:

1. agents, and
2. tool calls inside each agent.

```text
lead
├── worker A -> parallel tool calls
├── worker B -> parallel tool calls
└── worker C -> parallel tool calls
```

Parallelism improves latency when branches are independent, but it can increase cost quickly. Budget it deliberately.

## 9. Context isolation is a design advantage

Each subagent can have a separate context window.

This can be valuable because:

- each worker sees only the information relevant to its subproblem;
- exploration branches do not pollute each other's working context;
- the system can spend a larger aggregate token budget than one context window allows.

However, the lead agent still needs a compact way to synthesize worker results. Subagents should return decision-relevant outputs, not raw internal histories.

## 10. Planner, generator, evaluator

For difficult application-building tasks, Anthropic explored a three-role structure:

```text
planner
   |
   v
generator <---- feedback ---- evaluator
   |
   v
environment
```

### Planner

The planner expands a short request into a more complete product or task specification.

A useful constraint is to define deliverables and high-level requirements without prematurely freezing detailed implementation choices that downstream work can discover more accurately.

### Generator

The generator performs the implementation.

Its job is to make progress against the specification and environmental feedback.

### Evaluator

The evaluator independently exercises the output and checks it against criteria.

It should have:

- explicit grading criteria;
- access to the environment needed to inspect real behavior;
- calibration examples when subjective judgment matters;
- enough independence to reject the generator's framing.

The evaluator is not automatically worth its cost. As model capability improves, some tasks that previously needed external checking may become reliable enough without it. Keep the evaluator where it creates measured lift.

## 11. Do not rely on same-agent self-evaluation alone

A generator has incentives and context that can make it overly charitable toward its own output.

Independent evaluation helps when:

- criteria are concrete;
- errors can be observed in the environment;
- the task is near the model's capability boundary;
- feedback produces better subsequent attempts.

For verifiable tasks, prefer real tests over model judgment whenever possible.

## 12. Durable session versus active context

Anthropic's Managed Agents work makes an important separation:

```text
durable session history
        |
        v
harness selects / transforms
        |
        v
active model context
```

The session can retain the recoverable event record even when the model sees only a slice or compacted representation.

This reduces the risk of making irreversible context-management decisions. A future harness can choose a different way to retrieve or transform the same durable history.

## 13. Decouple the brain from the hands

A useful infrastructure boundary is:

```text
brain
model + harness
   |
   | execute(name, input)
   v
hands
sandboxes / tools / external environments
```

The execution resource should not need to be permanently coupled to one model context.

Benefits include:

- lazy provisioning;
- multiple execution environments;
- replaceable sandbox implementations;
- stateless or horizontally scalable harness processes;
- reduced coupling between model assumptions and infrastructure.

The broader lesson is to keep stable interfaces around volatile implementation choices.

## 14. Harness assumptions are temporary

Harnesses often encode compensations for current model limitations.

Examples might include:

- extra planning prompts;
- forced context resets;
- repeated evaluation loops;
- rigid decomposition;
- explicit reminders to continue.

As models improve, some of these can become unnecessary overhead.

Therefore:

1. measure the value of each harness mechanism;
2. keep components separable;
3. periodically remove scaffolding and re-evaluate;
4. preserve stable state and execution interfaces even when the harness changes.

## 15. Long-horizon design checklist

- What state must survive a context reset?
- What artifact lets a fresh session reconstruct the objective?
- What is the smallest bounded unit of progress?
- How does the system know that unit is actually complete?
- What is the rollback strategy?
- Can work be parallelized without creating coordination debt?
- Are subagent tasks explicit and non-overlapping?
- Does the lead agent control effort and token budgets?
- Does an evaluator add measurable value beyond deterministic tests?
- Is the durable history recoverable even if the active context is compacted?
- Can execution environments be replaced or provisioned independently of the model harness?
- Which harness rules are compensations for current model behavior and should be periodically re-tested?
