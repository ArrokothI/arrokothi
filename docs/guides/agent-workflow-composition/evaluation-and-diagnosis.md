# Evaluation and failure diagnosis

> **Application/developer guidance — not canonical architecture.**
> **Canonical owner:** none — this is engineering discipline, not a kernel concept. The active
> repository guidance it follows is
> [`../../development/003-agent-effectiveness-guidance.md`](../../development/003-agent-effectiveness-guidance.md).
> Precedence and the end-to-end procedure are in [`README.md`](README.md).

This page covers builder steps 12 and 13: proving the application works, and deciding what to change
when it does not.

```text
kernel conformance        does the RUNTIME preserve its semantic contract?     npm test
application effectiveness did THIS composition accomplish the task?            npm run test:evals
```

These answer different questions and must stay separate. A green conformance suite says nothing
about whether your Agent is useful; a passing eval says nothing about whether the kernel is correct.

---

## 1. Define success before tuning anything

Before the first prompt edit, write down for each requirement: what success is, what failure is, and
**how the environment can tell them apart**. If you cannot answer the third, you do not yet have a
requirement you can build against — go back to
[requirements and control](requirements-and-control.md).

---

## 2. Build deterministic tests first

Most hard requirements are testable without a model at all: schema rejection, transition correctness,
exact calculations, gate behaviour, authority denial, confirmation decline, conflict handling,
idempotency, budget exhaustion. Cover these with ordinary tests over your Function Stages, schemas,
policies, and topology. They are cheap, fast, offline, and they are what actually enforces the
specification.

Make progress increments bounded and verified:

```text
reconstruct state → choose ONE bounded objective → do it
    → verify against an environmental observation → record progress → next
```

"Done" is a verified requirement, not a model's impression. Use validators, schema validation,
committed memory values, capability outcomes, and tests as backpressure — an agent generates work
faster than it can reliably judge it.

---

## 3. Then evaluate behaviour, grading the world

Model the eval on the existing behavioural baseline (`tests/evals/agent/`): each case owns a small
deterministic world, and grading reads the world.

Record at least:

```text
task success                 did the required outcome occur?
hard requirement failures    which deterministic requirements were violated?
grounding failures           claims not supported by a record or observation
state correctness            are the committed Structured Memory values right?
tool/effect correctness      right operation, right arguments, right outcome handling?
model calls                  count
tool/action calls            count
turns                        count
context/token use            where the provider reports it
latency / cost               where available
```

Report quality and cost together. A strategy that improves success through unbounded context, extra
model turns, or full-catalog exposure has a real price.

**Grade the outcome, not the transcript.** An Agent that says it sent the message and sent nothing
has failed, whatever the prose looked like. An Agent that left the world correct but explained it
badly has passed the outcome check and failed the quality check — two separate measurements.

Include unhappy paths deliberately: capability failure, policy denial, confirmation decline, unknown
outcome, memory conflict, budget exhaustion, adversarial retrieved content, ambiguous user input. A
happy-path-only suite hides the failures that dominate production.

Keep held-out cases. Once prompts, descriptions, or exposure are tuned against a suite, that suite
has stopped measuring generalisation.

---

## 4. Classify every failure before changing anything

This is the most important discipline in the guide. Assign one class, then fix at that layer:

| Class | Symptom | Fix |
|---|---|---|
| application composition | wrong Workflow/Agent boundary, missing Stage, missing gate, requirement left to a prompt | [workflow](workflow-agent-and-stages.md), [requirements](requirements-and-control.md) |
| surface limitation | the design needs an emission the chosen stock surface cannot produce | [current authoring surface](current-authoring-surface.md) — work down its escalation ladder |
| prompt / context | the model lacked, or was swamped by, information | [state and memory](state-memory-and-context.md) |
| tool / interface | wrong operation chosen, ambiguous names, unusable results, unhelpful errors | [capabilities](capabilities-effects-and-authority.md) |
| model limitation | the task is beyond this model or this budget | change model, or decompose, or add determinism |
| framework ergonomics | correct design was hard to express or easy to misuse | record it in the findings note — do not bend the design around it silently |
| genuine missing kernel contract | the semantics you need do not exist | write it up as a candidate architecture issue; **do not implement it here** |
| evaluation / grader | the rubric was wrong, brittle, or measured the transcript | fix the grader |

> **A failing benchmark or eval never by itself justifies changing kernel semantics.** Exhaust the
> earlier classes first, then escalate through
> [`../../development/001-current-status-and-roadmap.md`](../../development/001-current-status-and-roadmap.md)
> and the owning canonical document. The evidence gate for promoting application friction into
> architecture is stated in [`../../future-plan.md`](../../future-plan.md) §14.9.

Record ergonomics and gap findings in
[`../../development/007-application-builder-ergonomics-findings.md`](../../development/007-application-builder-ergonomics-findings.md),
which also shows the classification format to use. The escalation rule is in
[`README.md`](README.md).

Resist the two standard reflexes: adding an Agent where a Stage would do, and adding instructions
where a gate would do.
