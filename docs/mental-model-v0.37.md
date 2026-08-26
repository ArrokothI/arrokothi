# Agent SDK mental model — v0.37

This document captures the design mental model behind the current Agent SDK architecture and the
intended research direction after the frozen v0.37 P01/P02 baseline. It complements
[`architecture.md`](architecture.md) and [`v0.4-roadmap.md`](v0.4-roadmap.md); it is not a replacement
for either document and is not an API specification.

The core rule is:

> Models choose and propose. Runtime validates and authorizes. Executors and the environment
> establish truth.

The goal is not to make the model less agentic. The goal is to let the model be as autonomous as the
task permits while making consequential state transitions, side effects, and claims depend on
explicit authority and evidence.

---

## 1. Agent first, Workflow later

We use the architectural distinction described by Anthropic in
[Building effective agents](https://www.anthropic.com/engineering/building-effective-agents):

- a **Workflow** orchestrates LLMs and tools through predefined code paths;
- an **Agent** lets the LLM dynamically direct its own process and tool usage.

This distinction is important for Agent SDK.

The current research priority is the **Agent** path. The model should choose the next semantic step:
answer, retrieve knowledge, request an action, revise its approach, or continue reasoning from an
authoritative observation. Runtime code should bound what is legal, but it should not replace the
model's semantic decision-making with a hard-coded process unless the task itself calls for one.

A future Workflow runtime is still desirable for tasks whose macro-process is genuinely known in
advance. That is a later architecture layer, not the current focus.

### Naming note: today's `workflow` strategy is not that future Workflow runtime

The current public `AgentHarness({ strategy: "workflow" })` is the bounded preflight / retrieval /
response coordinator inherited from the earlier two-pass design. It is useful baseline behavior, but
it should not be confused conceptually with the future application-defined Workflow runtime described
in the roadmap.

The future Workflow concept is closer to:

```text
application-defined process
        ↓
  deterministic node / edge
        ↓
 bounded semantic model work
        ↓
  deterministic next step
```

with nodes such as Tool, Condition, Human approval, Set/Transform, Agent/LLM, and End if evidence later
justifies that runtime.

---

## 2. Why Preflight exists today

Preflight is not intended to prove that Agent SDK should become a Workflow system.

It exists because the current research target deliberately includes a relatively weak / inexpensive
backend model (`gemini-3.5-flash-lite` in the frozen v0.37 benchmark). Asking that model to do all of
the following perfectly in one step is unnecessarily difficult:

- reconcile user corrections with structured state;
- infer bounded memory updates;
- identify relevant knowledge;
- understand the user's current intent;
- reason about available capabilities;
- choose tools and arguments;
- react to tool results;
- maintain conversational quality.

Preflight decomposes part of that burden so each model call solves an easier semantic problem. This is
a **model-capability and context-engineering scaffold**, not the long-term definition of an Agent.

The intended research direction is therefore empirical:

```text
Full semantic Preflight
        ↓
Selective Preflight
        ↓
Minimal / no semantic Preflight
        ↓
more reasoning lives naturally inside the Agent loop
```

Collapse should happen only when context engineering, prompt / ACI quality, model capability, and
regression evidence show that the same correctness can be preserved with less architectural tax.

The target is not "fewer model calls" by itself. The target is the smallest architecture that retains
correctness, truthfulness, authority, and useful behavior at acceptable cost.

---

## 3. The Agent is the brain; the runtime is the control plane

The model and runtime have different jobs.

```text
Model / Agent brain
  chooses and proposes:
    - what to do next
    - retrieval requests
    - capability calls
    - candidate memory writes
    - responses
    - semantic transitions where the application permits them

Runtime / control plane
  validates and enforces:
    - schemas
    - current capability scope
    - authority
    - state invariants
    - confirmation policy
    - idempotency
    - execution lifecycle
    - provenance
    - durability

Executors / environment
  establish:
    - what actually happened
    - authoritative external results

Human
  grants:
    - authority at selected consequential boundaries
```

This separation is central. The model may be intelligent enough to propose an action, but intelligence
does not grant authority.

Likewise, runtime authorization does not mean the runtime is deciding the task semantically. It is
checking whether a proposed transition is allowed to become real.

---

## 4. The Rust analogy: expressive behavior inside strict safety boundaries

A useful mental analogy is Rust.

Rust is not valuable because it prevents programmers from doing powerful things. It is valuable
because the language and type system let programmers express powerful behavior while making broad
classes of invalid state transitions difficult or impossible.

Agent SDK should aim for a similar relationship between model autonomy and runtime authority.

The analogy is not literal, but the mapping is useful:

```text
Rust-like idea                  Agent SDK analogue
-----------------------------   ---------------------------------------------
expressive program              expressive model-driven Agent
static/runtime invariants       schemas, policy, capability and state checks
ownership / authority boundary  who may establish or mutate authoritative data
unsafe boundary                 consequential external side effect
compiler/runtime rejection      CapabilityGateway denial / validation failure
explicit opt-in                 user confirmation for selected consequences
observable execution result     ToolResult / KnowledgeResult / environment truth
```

The desired property is:

> Allow broad agent behavior, but make unauthorized or unsupported transitions fail at the control
> plane instead of relying on the model to remember every safety rule perfectly.

This is especially important when using smaller models. A weaker model can still be useful if the
system does not require it to be the sole keeper of authorization, persistence, truth, and safety.

---

## 5. Autonomy and safety are orthogonal

A system does not stop being an Agent because some proposed actions are rejected or require user
confirmation.

The key question for autonomy is:

> Who chooses the next semantic action?

For the Agent path, the answer should usually be **the model**.

The key question for safety is:

> Who decides whether that proposed action is legal, authorized, and allowed to affect the world?

For Agent SDK, the answer is **the runtime**.

These are separate axes.

For example:

```text
search permitted knowledge       → Agent may proceed
read allowed state               → Agent may proceed
reason / calculate               → Agent may proceed
write bounded working state      → Agent may proceed under declared policy

send an external message         → may cross an authority boundary
submit an application            → authority boundary
charge / pay / purchase          → authority boundary
delete consequential data        → authority boundary
```

The point of confirmation is therefore not "approve the Agent's reasoning." It is to grant authority
for a particular proposed consequence.

We should avoid designing the system as "consent everywhere." Confirmation is valuable when the
consequence deserves it; unnecessary confirmation would make the Agent less useful without improving
the underlying authority model.

---

## 6. `CapabilityGateway` is the authority boundary

The current architecture intentionally funnels knowledge and action requests through one runtime
boundary.

Conceptually:

```text
Agent decision
    ↓
capability proposal
    ↓
CapabilityGateway
    ├── validate current capability scope
    ├── validate arguments / schema
    ├── evaluate authority
    ├── apply confirmation policy
    ├── enforce idempotency / execution checkpoints
    └── dispatch if allowed
            ↓
      executor / environment
            ↓
     authoritative observation
            ↓
       next Agent decision
```

This boundary should remain narrow and mechanically understandable.

The model should not be able to grant itself a capability, declare an external action successful, or
turn an inferred fact into authoritative truth merely by stating it confidently.

---

## 7. Ground truth must come back into the Agent loop

An Agent is useful because it can adapt from observations, not because it can generate long plans.

Every consequential loop should therefore look approximately like:

```text
observe authoritative state
        ↓
model chooses next step
        ↓
runtime validates proposal
        ↓
executor / knowledge source runs
        ↓
authoritative result enters state/context
        ↓
model chooses again
```

This is why the v0.4 Phase/context correctness invariant matters. If a tool result or Phase transition
changes the authoritative state, the next model iteration must see a context and capability envelope
from the same state.

A stale prompt paired with fresh capabilities violates the control-plane model even if the tool call
itself is safe.

---

## 8. Context engineering and ACI are first-class architecture work

A stronger Agent should not automatically mean more orchestration layers.

Before adding architecture, improve the interface presented to the model:

- concise, authoritative system context;
- clear Phase objectives;
- well-designed capability names and descriptions;
- schemas that are easy for the model to produce correctly;
- explicit observations and failure reasons;
- useful examples only where they improve behavior;
- minimal ambiguity about what the runtime will and will not allow.

Anthropic's agent guidance emphasizes simple, composable systems and careful agent-computer interface
(ACI) / tool design. That aligns with our direction: make the model's environment easier to reason
about before compensating with more layers.

For the current research program, context engineering and prompt / ACI engineering should be treated
as serious systems work, not cosmetic prompt tuning.

---

## 9. Weak-model reliability is an intentional research target

The current priority is not merely to show that a very strong frontier model can operate the SDK.

A more interesting question is:

> Can a relatively inexpensive and weaker model become a reliable Agent when paired with a good
> control plane, authoritative observations, well-engineered context, and a strong ACI?

This motivates the present use of `gemini-3.5-flash-lite` in the frozen benchmark and explains why
some scaffolding exists today.

Success should be measured on multiple axes rather than by a single "agentic" score:

- task correctness;
- state/action-grounded correctness;
- truthfulness;
- correction handling;
- unsafe or invalid tool attempts;
- model calls per user turn;
- token cost where comparable;
- latency;
- direct-answer rate;
- conversational usefulness.

A system that is more autonomous but less truthful or less reliable is not automatically better.
A system that is more deterministic but cannot handle open-ended semantic work is not automatically
better either.

---

## 10. Future Workflow should solve a different problem

A real Workflow runtime becomes useful when the application already knows meaningful macro-ordering
that should not be delegated to the model.

For example:

```text
collect information
        ↓
validate documents
        ↓
[deterministic condition]
    ↙              ↘
 missing          complete
    ↓                ↓
request more      risk review
information          ↓
                 [approval]
                     ↓
                   submit
```

An Agent may still perform semantic work inside `risk review`, but it should not be able to decide
that the required approval node does not matter and skip directly to `submit`.

The eventual architecture can therefore support three related execution styles:

```text
Agent
  model selects next transition
  runtime bounds legality

Workflow
  application/process selects macro transition
  model performs bounded semantic work where needed

Hybrid
  deterministic macro-process
  + agentic local reasoning
```

This is deliberately later than the current Agent work. The roadmap's P03 evidence gate should decide
whether and when a true Workflow runtime is justified.

---

## 11. Current research priority order

The intended order is approximately:

```text
1. Make the current Agent correct and durable
2. Make the Agent work well with the current weaker model
3. Improve context engineering, prompts, tools, and ACI
4. Measure which Preflight calls purchase real correctness
5. Reduce / collapse semantic Preflight when evidence supports it
6. Regress the frozen P01/P02 behaviors without retuning them
7. Run prospective P03/P04 experiments
8. Add new architecture only when those experiments justify it
9. Study a true Workflow runtime later for deterministic process tasks
```

This order matters. We should not add Workflow, multi-agent machinery, or more semantic model passes
simply because those abstractions are fashionable.

---

## 12. Design checklist

When reviewing a proposed feature, ask:

1. **Who is making the semantic decision?**
   - If the model should choose dynamically, keep it in the Agent layer.
   - If the application genuinely knows the required macro-sequence, it may belong to a future
     Workflow layer.

2. **Who has authority to make the result real?**
   - Model confidence is not authority.
   - Runtime policy and the environment establish what is permitted and what actually happened.

3. **Can the invariant be enforced mechanically?**
   - Prefer schema, capability, state, provenance, idempotency, and confirmation checks over asking
     the model to remember another safety sentence.

4. **Is a new model call buying measurable correctness?**
   - If not, it may be architecture tax.

5. **Could better context / ACI solve the problem more simply?**
   - Improve the model interface before adding orchestration.

6. **Does this make the Agent less autonomous for no safety or correctness benefit?**
   - Avoid deterministic structure merely for architectural neatness.

7. **Does this increase autonomy without preserving truth and authority?**
   - Do not trade away the control plane merely to look more agentic.

---

## Summary

The Agent SDK mental model is:

> **Agent-first, authority-bounded, evidence-grounded.**
>
> Let the model choose the semantic next step. Let the runtime enforce what is legal and authorized.
> Let executors and the environment establish truth. Ask the human for authority only at boundaries
> whose consequences warrant it.

Preflight is currently scaffolding for model capability, not the final definition of the architecture.
The research direction is to make the Agent itself stronger through context and ACI engineering and to
remove scaffolding when evidence says it is no longer purchasing correctness.

A true Workflow runtime remains valuable, but for a different class of problem: tasks where the
application should own the macro-process. It should be added later, when prospective evidence justifies
it, rather than conflated with today's bounded Preflight path.

The long-term target is neither maximum autonomy nor maximum determinism. It is the smallest control
plane that lets an Agent act usefully, truthfully, and safely at acceptable inference cost.

---

## References

- Anthropic, [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents),
  December 19, 2024.
- [`architecture.md`](architecture.md)
- [`durability.md`](durability.md)
- [`v0.4-roadmap.md`](v0.4-roadmap.md)
