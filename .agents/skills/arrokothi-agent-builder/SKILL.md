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

**The procedure lives in `docs/guides/agent-workflow-composition.md`.** Load it and follow its
13-step builder procedure (§13). This file is the entry point: what to load, what traps to avoid,
when to escalate. It is not a second copy of the manual.

## What to load

```text
docs/guides/agent-workflow-composition.md        the decision procedure — read this
docs/development/002-implemented-kernel-baseline.md   what is actually implemented
docs/README.md → the owning canonical doc        semantic truth for a concept in play
docs/development/001-current-status-and-roadmap.md    what is only planned (tranches H–N)
docs/agent-engineering/                          external, framework-neutral engineering guidance;
                                                 a design reference, never ArrokothI semantics
examples/execution-kernel-minimal/               a runnable, offline, production-surface assembly
```

Read the guide before designing; read the canonical owner before asserting what a concept means.
The canonical owner overrides both the guide and this skill. Using either does not justify editing
it.

## Guardrails to preserve

```text
observable requirements before abstractions
hard requirement → code / schema / state / gate / authority, never merely prompt text
known semantic topology → Workflow;  unpredictable progression → Agent
exact deterministic transform → deterministic code
model interpretation ≠ environmental truth;  schema validity ≠ factual truth
memory ≠ context;  Working Notes ≠ authority;  Derived Semantic Memory ≠ asserted truth
exposure ≠ permission;  model selection ≠ authorization
consequential external action → Harness-authorized Effect
eval/benchmark failure ≠ justification for a kernel change
```

## Traps that cost the most

1. **Kernel Effect vocabulary ≠ what your chosen surface can emit.** Read the guide's §2.4 matrix
   *before* sketching a composition. In particular: an LLM Stage cannot write Structured Memory; a
   stock Agent cannot spawn, message, or request user input; Agent/Workflow Stages express only a
   child `call`; and a stock Workflow consumes `external.input` only once, so it is not multi-turn.
2. **No controller-side code can read Structured Memory.** Not Stage code, not a
   `CapabilityExecutor`. Committed values reach the model via an Agent's read keys, and reach code
   only via host `Harness.structuredMemoryOf`. Deterministic gates over committed facts are host
   work.
3. **Import surface.** Application code uses `@arrokothi/core/execution`, `/ports`, `/reference`.
   The package root `@arrokothi/core` is the legacy Session/Flow API and exports a *different*
   `defineAgent` and `AgentDefinition`; every example except `examples/execution-kernel-minimal/`
   targets it. `@arrokothi/core/testing` is right for tests, prototypes, benchmark subjects, and
   eval harnesses — not for application runtime code.
4. **Canonical ≠ implemented.** `Artifact/File` has no 0.8.x mechanism. Derived claims carry no
   supersession field. Deadlines and idempotency scopes are `UseCapability` properties, not
   universal ones. Cancellation does not cascade. There is no crash durability and no progressive
   action discovery.
5. **Deny-by-default defaults are load-bearing.** No authorizer denies every Effect; no operation
   ceiling exposes nothing; an unclassified operation is consequential. Several distinct
   misconfigurations all present as "nothing happened".

## Workflow

1. Extract observable requirements; classify each as deterministic or qualitative.
2. Establish current repository truth for every mechanism you intend to use.
3. Decide Workflow/Agent boundaries and the surface for each part — then check §2.4 that the
   surface can emit what the design needs. If it cannot, work down the guide's §2.5 ladder:
   another existing composition, host orchestration, or an application-supplied port. A custom
   controller is the last option, not the first.
4. Assign state to memory forms; design capabilities, Effects, authority, exposure, confirmation,
   budgets, and context per the guide.
5. Implement the smallest working composition against a deterministic offline provider.
6. Write deterministic tests first, then behavioural evals that grade the world, not the transcript.
7. Classify every failure — composition, prompt/context, tool interface, model, ergonomics,
   missing kernel contract, or grader — and fix at that layer.

## Escalation

A missing capability is documented, not implemented. Record it in
`docs/development/007-application-builder-ergonomics-findings.md` at the correct classification
(documentation / ergonomics-API / effectiveness strategy / possible semantic gap) and stop. Changing
a kernel contract is `arrokothi-architecture` work, and needs its own authorization.

## Validation

Application code: its own deterministic tests, then `npm run typecheck`. Add `npm test` when
anything under `packages/` or `tests/conformance/` was touched, and `npm run test:evals` only when
Agent behaviour is in scope. Documentation-only work validates its own artifacts and links. Local
runs are not CI; do not report them as such.
