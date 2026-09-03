# Workflow, Agent, and Stage kinds

> **Application/developer guidance — not canonical architecture.**
> **Canonical owner:** [`../../composition.md`](../../composition.md), with the system-wide
> invariants in [`../../mental-model.md`](../../mental-model.md).
> Precedence, principles, and the end-to-end procedure are in [`README.md`](README.md).

This page covers builder step 4: who owns semantic progression, and which Stage body implements each
node. It does not tell you whether your chosen surface can *emit* the operations your design needs —
that is [current authoring surface](current-authoring-surface.md), and you should read it
immediately after this page.

---

## 1. The distinction

```text
Workflow
= system-defined semantic topology
  the application declares the Stages and the allowed transitions

Agent
= primarily model-directed semantic progression
  the model owns an open-ended continuation space inside runtime bounds
```

Two facts that decide most arguments:

- **The number of LLM calls does not matter.** An LLM Stage may make several model calls and remain
  a Workflow. An Agent with one model call is still an Agent.
- **A model choosing among declared transition labels is still Workflow semantics.** Model-driven
  *data* is fine; model-driven *topology* is Agent semantics, and dynamic topology mutation is out
  of scope for 0.8.x.

---

## 2. Decision procedure

Run this per requirement cluster, not once per product.

1. **Can code alone satisfy it?** Then no model is involved. Function Stage or host logic. Stop.
2. **Can you write down the complete set of semantic steps and the conditions between them?**
   If yes → **Workflow**. The steps become Stages; the conditions become declared transitions.
3. **Is the uncertainty about *which declared branch*, or about *what to do at all*?**
   - which declared branch → **Workflow** with labelled transitions; a classifier is an LLM Stage.
   - what to do at all → **Agent**.
4. **Does progression depend on what earlier observations reveal, in a way you cannot enumerate?**
   → **Agent** for that part only.
5. **Is the open-ended part a bounded sub-problem inside a knowable process?**
   → **Workflow** whose one Stage is an **Agent Stage** (a child Agent call). This is the default
   hybrid and it is usually the right answer for a real product.
6. **Would you struggle to write the stopping condition?** That is a signal the boundary is wrong.
   A Workflow's stopping condition is its topology; an Agent needs an explicit one (§5, and budgets
   in [capabilities](capabilities-effects-and-authority.md)).

---

## 3. Choosing the body for a Workflow Stage

Four Stage kinds exist, and exactly four. `router`, `classifier`, `gate`, `guard`, `retriever`,
`evaluator`, and `aggregator` are compositions of these plus transitions — not new kinds.

| Use | Kind | When |
|---|---|---|
| exact computation, validation, ranking, merging, record filtering; requesting capability/memory Effects programmatically | **Function Stage** | the answer is computable, or the program (not the model) decides an action must occur |
| a bounded, program-defined language task | **LLM Stage** | interpretation/summarisation/classification/composition with a *predetermined* number of model phases (`maxModelPhases`, default 1) |
| a bounded sub-problem needing open-ended model progression | **Agent Stage** | you want the Agent's terminal result as this Stage's output; the parent graph must not show the Agent's internal cycles |
| a reusable sub-process with its own topology | **Workflow Stage** | recursive composition without flattening the child graph into the parent |

Notes that matter in practice:

- An LLM Stage's model-callable operations are **declared in the definition** as
  `{ name, description, input, capability, operation }`. The model-facing `name` is vocabulary; the
  definition owns the identity. A returned name the Stage never declared resolves to nothing.
- `maxModelPhases` is enforced structurally: callables are exposed only while phases remain, so the
  last phase cannot ask for more work. There is no phase count that turns an LLM Stage into an
  Agent — that is a different Execution kind.
- A Function Stage cannot call an executor. It *returns* `awaitEffects` requests; the controller
  proposes them and the Harness performs them. Propose, do not perform.
- Agent and Workflow Stages take a `ChildDefinitionRef` plus `requestedOperations`. Requested is not
  granted, and `requestedOperations` narrows only capability-operation authority — see
  [composition](composition-children-and-concurrency.md) for what that does and does not cover.

**A Stage is not a mini-Execution.** It has no lifecycle, mailbox, authority envelope, or
cancellation of its own; those belong to the enclosing Workflow Execution. The canonical statement
of that boundary is in [`../../composition.md`](../../composition.md).

---

## 4. Hybrid shapes that work

```text
multi-turn conversation with exact gating
  Agent Execution (root, Structured Memory bound at creation)
  + read-only grounding capability
  + host code between turns reading structuredMemoryOf and applying the exact rule
  + EffectAuthorizer / ConfirmationPolicy gating the consequential capability

knowable process with one genuinely open sub-problem
  Workflow: Function Stage (prepare) → Agent Stage (investigate)
            → Function Stage (verify the child's terminal result) → complete

model interpretation that must become retained state
  Workflow: LLM Stage (interpret → text) → Function Stage (parse, validate, request WriteMemory)

open-ended work with reusable exact sub-processes
  Agent whose capabilities include a Workflow-backed operation implemented by the application
```

Each of these is worked out in [worked-examples.md](worked-examples.md).

---

## 5. Response is not completion

An Agent's default `completion` mode is `respond_and_wait`: a response is communication and the
Execution stays alive. `complete_on_response` makes a response the terminal answer — a deliberate
contract, appropriate for a one-shot Agent Stage child, wrong for a long-lived conversational
Execution. Choose it explicitly; do not let the default decide by accident.

This is also where an Agent's stopping condition lives in practice: a budget the Harness enforces
plus an instruction the model can act on. The budget is the part that actually holds.

---

## 6. When *not* to reach for an Agent

- The path is knowable and you are choosing an Agent for flexibility you cannot name.
- You cannot state a stopping condition or a budget.
- You cannot state what the environment will report to prove progress.
- The only thing you actually need is one bounded language task — that is an LLM Stage.

## 7. When to choose parallel Workflow branches

Only when the branches are genuinely independent and the latency is worth the coordination cost. The
current fork topology is deliberately narrow — check
[composition](composition-children-and-concurrency.md) before designing around it, because several
natural shapes are rejected at `defineWorkflow` time.
