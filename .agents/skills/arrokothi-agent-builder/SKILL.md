---
name: arrokothi-agent-builder
description: >-
  Use when building an application on ArrokothI: turning product requirements or a specification
  into an Agent/Workflow composition, choosing Workflow vs Agent, choosing a Function/LLM/Agent/
  Workflow Stage, deciding what belongs in Structured Memory, Working Notes, Derived Semantic
  Memory, context, or an external store, designing model-facing capabilities and Effects, setting
  authority/exposure/confirmation and budgets for an application, or redesigning an existing
  application composition for effectiveness. Not for changing kernel semantics (use
  arrokothi-architecture), adding or changing a provider/protocol adapter (use
  arrokothi-provider-integration), or implementing/auditing a development slice (use
  arrokothi-slice-audit).
---

# Building an application on ArrokothI

This skill builds **applications on top of** the kernel; it never changes kernel semantics.

**The procedure lives in `docs/guides/agent-workflow-composition/README.md`.** Load that front door
and follow its 13-step builder procedure. This file is the router: what to load, what traps to
avoid, when to escalate. It is not a second copy of the manual.

## What to load

Start with the front door, then load **only** the topic page for the decision in front of you:

```text
agent-workflow-composition/README.md          principles, requirements mapping, the 13-step
                                              procedure, and this router — start here

  requirements-and-control.md                 observable requirements; deterministic vs model;
                                              schema validity vs factual acceptance
  workflow-agent-and-stages.md                Workflow or Agent; which of the four Stage kinds
  current-authoring-surface.md                CAN my chosen surface emit this today? imports,
                                              legacy-root collision, /testing policy
  state-memory-and-context.md                 Structured / Derived / Working Notes / context /
                                              application storage; Artifact status; who can read
  capabilities-effects-and-authority.md       operation design, Effect lifecycle, authority chain,
                                              confirmation, deadlines, idempotency, budgets
  composition-children-and-concurrency.md     child Executions, handoff, return path, fork/join
  evaluation-and-diagnosis.md                 deterministic tests, evals, failure classification
  worked-examples.md                          concrete patterns
```

Repository truth, when a claim needs checking: `docs/development/002-implemented-kernel-baseline.md`
(what is implemented), `docs/README.md` → the owning canonical doc (what a concept means),
`docs/development/001-current-status-and-roadmap.md` (tranches H–N), `docs/future-plan.md` §14 (open
SDK-surface questions), and `examples/execution-kernel-minimal/` (a runnable production-surface
assembly). The canonical owner overrides both the guide and this skill; using either does not justify
editing it.

## Guardrails to preserve

```text
observable requirements before abstractions
hard requirement → code / schema / state / gate / authority, never merely prompt text
known topology → Workflow;  unpredictable progression → Agent;  exact transform → code
model interpretation ≠ environmental truth;  schema validity ≠ factual truth
memory ≠ context;  Working Notes ≠ authority;  Derived Semantic Memory ≠ asserted truth
exposure ≠ permission;  model selection ≠ authorization;  prompt text ≠ authority boundary
consequential external action → Harness-authorized Effect
eval/benchmark failure ≠ justification for a kernel change
```

## Traps that cost the most

1. **Kernel Effect vocabulary ≠ what your chosen surface can emit.** Read
   `current-authoring-surface.md` *before* sketching a composition. In particular: an LLM Stage
   cannot write Structured Memory; a stock Agent cannot spawn, message, or request user input;
   Agent/Workflow Stages express only a child `call`; and a stock Workflow consumes
   `external.input` only once, so it is not multi-turn.
2. **No controller-side code can read Structured Memory.** Not Stage code, not a
   `CapabilityExecutor`. Committed values reach the model via an Agent's read keys, and reach code
   only via host `Harness.structuredMemoryOf`. Deterministic gates over committed facts are host
   work.
3. **Import surface.** Application code uses `@arrokothi/core/execution`, `/ports`, `/reference`.
   The package root `@arrokothi/core` is the legacy Session/Flow API and exports a *different*
   `defineAgent` and `AgentDefinition`. `@arrokothi/core/testing` is right for tests, prototypes,
   benchmark subjects, and eval harnesses — not for application runtime code.
4. **Canonical ≠ implemented.** `Artifact/File` has no 0.8.x mechanism. Derived claims carry no
   supersession field. Deadlines and idempotency scopes are `UseCapability` properties, not
   universal ones. Cancellation does not cascade. There is no crash durability and no progressive
   action discovery.
5. **Deny-by-default defaults are load-bearing.** No authorizer denies every Effect; no operation
   ceiling exposes nothing; an unclassified operation is consequential. Several distinct
   misconfigurations all present as "nothing happened".

## How to work

Follow the 13-step procedure in `agent-workflow-composition/README.md`; it is the single
authoritative application-building procedure and is not repeated here. Two ordering rules the router
enforces:

- **Requirements before abstractions, and the surface check before implementation.** Deciding
  Workflow/Agent (step 4) is not done until `current-authoring-surface.md` confirms the surface can
  emit what the design needs (step 5).
- **Diagnose before adding complexity.** Classify a failure at its layer before changing the shape.

## Escalation

A missing capability is documented, not implemented. Record it in
`docs/development/007-application-builder-ergonomics-findings.md` at the correct classification
(documentation / ergonomics-API / effectiveness strategy / possible semantic gap) and stop. Changing
a kernel contract is `arrokothi-architecture` work, and needs its own authorization.

## Validation

Application code: its own deterministic tests, then `npm run typecheck`; add `npm test` when
anything under `packages/` or `tests/conformance/` was touched, and `npm run test:evals` only when
Agent behaviour is in scope. Documentation-only work validates its own artifacts and links. Local
runs are not CI.
