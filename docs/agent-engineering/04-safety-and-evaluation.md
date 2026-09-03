# Safety and Evaluation for Agentic Systems

Autonomy increases usefulness only if the system constrains what failures can do and measures whether the system actually succeeds.

Anthropic's engineering work treats safety and evaluation as properties of the surrounding system, not as prompt-only concerns.

## 1. Autonomy and blast radius are different variables

A system can allow the model to act freely inside a narrow boundary.

```text
higher autonomy
does not require
unbounded capability
```

The central security question is not only:

> Will the model choose the right action?

It is also:

> What is the maximum damage possible if the model, a tool result, or an attacker steers the system incorrectly?

That maximum impact is the blast radius.

## 2. Prefer deterministic containment for hard boundaries

Model instructions and classifiers are probabilistic. They can reduce risk but have non-zero failure rates.

Containment uses environment-level controls such as:

- process sandboxes;
- virtual machines;
- filesystem access boundaries;
- network allowlists;
- egress controls;
- credential isolation;
- resource limits.

The principle is:

```text
environment layer: hard capability boundary
model layer: behavioral steering inside that boundary
```

A model cannot exfiltrate credentials it cannot access.

## 3. Filesystem and network isolation are complementary

For code-running agents, both matter.

### Filesystem isolation

Restrict which paths the agent and its subprocesses can read or modify.

### Network isolation

Restrict which hosts or services the agent and its subprocesses can reach.

Using only one leaves important attack paths:

- unrestricted network can leak accessible files;
- unrestricted filesystem can expose credentials or system resources that enable escape or further access.

Contain all descendant processes, not just the top-level tool invocation.

## 4. Human approval is not a complete security boundary

Repeated permission prompts create approval fatigue. A user who reflexively approves prompts is not a reliable enforcement mechanism.

Approval is still useful for meaningful escalation, but it should not substitute for hard limits on routine autonomous work.

A better pattern is:

```text
safe bounded region
    -> allow automatically

boundary crossing / sensitive action
    -> policy check and possibly user approval
```

## 5. User goal is not blanket authorization

An agent may infer actions that are related to the user's objective but exceed what the user actually authorized.

A safety layer should distinguish:

```text
helpful-looking action
from
authorized action
```

When the user has not granted authority for a risky effect, the fact that it could help complete the task is not sufficient.

This is especially important for:

- deletion;
- publishing;
- sending messages;
- remote modifications;
- credential use;
- financial or account actions;
- broad filesystem or network access.

## 6. Inspect both inputs and actions

External content can carry prompt injection.

A defense-in-depth architecture can use separate checks:

```text
external tool result
   |
   v
input / injection screening
   |
   v
agent reasoning
   |
   v
proposed action
   |
   v
action policy / intent check
   |
   v
execution
```

The action gate should judge real-world impact, not merely whether the command string looks benign.

Tool outputs, web pages, repository files, and third-party connector data should all be considered untrusted inputs unless proven otherwise.

## 7. Keep secrets outside the model when possible

If an execution or proxy layer can perform an authenticated operation without exposing raw credentials to the model, prefer that design.

This can reduce the consequences of:

- prompt injection;
- accidental logging;
- tool misuse;
- context leakage.

Similarly, programmatic tool orchestration can sometimes move sensitive intermediate data between systems without placing the raw values into model context.

## 8. Evals begin with success criteria

Before tuning prompts or adding architecture, define:

- what success means;
- what failure means;
- how the environment can verify the difference.

Agent evals are harder than single-turn evals because the agent may take many valid trajectories to the same outcome.

Therefore, separate:

```text
trajectory / transcript
from
final outcome
```

The transcript tells you how the agent behaved.

The outcome tells you whether the world ended in the correct state.

## 9. Key eval objects

A practical vocabulary:

### Task

The specification given to the agent.

### Trial

One complete attempt at the task.

### Transcript or trajectory

The sequence of model messages, tool calls, tool results, and other intermediate actions.

### Outcome

The final environment state.

### Grader

The mechanism that scores some aspect of the transcript or outcome.

### Evaluation harness

The infrastructure that runs tasks, records trajectories, applies graders, and aggregates results.

### Agent harness

The infrastructure that lets the model act: inputs, context, tools, execution loop, and outputs.

When evaluating an "agent," the measured system is the model plus the agent harness.

## 10. Grade the outcome whenever possible

If a flight agent says that a booking succeeded, verify the reservation record.

If a coding agent says that a bug is fixed, run the tests.

If a browser agent says that a form was submitted, inspect the resulting application state.

Use self-report only when no stronger ground truth exists.

## 11. Combine grader types

No single grader type is sufficient for every property.

### Code-based graders

Examples:

- exact or fuzzy checks;
- unit tests;
- integration tests;
- static analysis;
- database assertions;
- tool-call parameter checks;
- token / turn / latency metrics.

Strengths: fast, cheap, reproducible, objective.

Weakness: can be brittle or too narrow.

### Model-based graders

Useful for properties that are difficult to specify deterministically, such as:

- explanation quality;
- stylistic adherence;
- completeness;
- nuanced judgment.

They need calibration and can drift.

### Human graders

Useful for:

- subjective quality;
- ambiguous edge cases;
- calibrating model graders;
- discovering failure modes not represented in the current suite.

They are expensive and slower, so they are often used selectively.

## 12. Separate quality from efficiency

An agent can solve the task while being inefficient.

Track both outcome quality and operational behavior:

```text
quality
├── task success
├── correctness
├── completeness
└── safety

efficiency
├── turns
├── tool calls
├── tokens
├── latency
└── cost
```

A new harness pattern is only an improvement if its additional cost buys enough quality or reliability.

## 13. Evaluate realistic trajectories

Agent evals should exercise the actual tools, environment, and failure modes the production system will encounter.

Important cases include:

- tool errors;
- partial results;
- stale state;
- adversarial or injected external content;
- ambiguous user requests;
- failed retries;
- long trajectories;
- context resets;
- delegation failures;
- irreversible actions.

A pristine happy-path benchmark can hide the problems that dominate production behavior.

## 14. Keep held-out tests

When prompts, tool descriptions, or harness rules are optimized against an eval set, maintain held-out tasks to detect overfitting.

This is especially important when agents themselves are used to improve prompts or tools.

## 15. Tune the evaluator too

A dedicated evaluator is an engineered component.

It may need:

- clearer criteria;
- examples of acceptable and unacceptable outcomes;
- access to better verification tools;
- instructions to probe edge cases;
- penalties for unsupported assumptions.

Do not assume that adding an evaluator automatically creates a reliable quality gate.

## 16. Safety and eval checklist

### Before execution

- What actions are possible?
- Which resources are reachable?
- What filesystem and network boundaries apply?
- Where are credentials stored?
- What requires explicit approval?
- Which external inputs are untrusted?

### During execution

- Are tool results screened or treated skeptically?
- Are actions checked against actual user authorization?
- Are subprocesses contained by the same policy?
- Are budgets and stopping conditions enforced?
- Is enough trace data retained for debugging?

### After execution

- Is the final environment state verified?
- Are safety invariants checked?
- Are quality and efficiency metrics both recorded?
- Can failures be replayed?
- Are held-out evals run before accepting prompt/tool/harness changes?

Safety and evaluation should be designed together: the same environment observability that verifies successful outcomes can also verify that forbidden effects did not occur.
