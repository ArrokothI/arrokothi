# Minimal Execution-kernel example

The smallest honest application on the current ArrokothI Execution kernel: one Agent, one
capability operation, one Harness, assembled by hand from the **production-facing** surfaces.

It exists because every other example in this repository targets the legacy `@arrokothi/core` root
API, and the only other cohesive Execution-kernel assemblies live in the conformance suite (which is
written to prove semantics, not to model applications) and in a live-key canary.

```bash
npm run example:execution-kernel        # run it
npm run test:example:execution-kernel   # its deterministic tests
```

Deterministic and offline: no API key, no network, no timers.

## What it shows

The same application runs twice, changing exactly one thing — the Effect policy:

```text
run 1  an EffectAuthorizer allows docs.search
       proposed -> authorized -> dispatched -> settled, and the Agent answers from the result

run 2  no EffectAuthorizer at all
       proposed -> denied. Nothing reached the executor, and the Agent says it could not look it up
```

The definition, the operation ceiling, the exposure request, the catalog, the executor, and the
model script are identical across both runs, so the difference is attributable to the Harness:

> Requesting an Effect is never permission to perform it.

## Import surface

```text
@arrokothi/core/execution    definitions, Harness, controllers, Execution/Effect vocabulary
@arrokothi/core/ports        interfaces the application supplies or implements
@arrokothi/core/reference    dependency-free implementations of those ports
```

Deliberately absent from [`app.ts`](app.ts):

- **`@arrokothi/core`** (the package root) — it still carries the separate legacy Session/Flow API
  and exports a *different* `defineAgent` and `AgentDefinition`. Importing it here is the most
  common wrong turn available.
- **`@arrokothi/core/testing`** — appropriate in tests, prototypes, benchmark subjects, and eval
  harnesses; not in application runtime code, where it would hide the wiring an application should
  own. This example's own tests happen not to need it either.

## The seams

[`app.ts`](app.ts) is short on purpose, and reads as an inventory of the decisions an application
actually makes:

| Collaborator | Side | Note |
|---|---|---|
| `InMemoryDefinitionStore` | Harness | where published definitions live |
| `InMemoryRuntimeStore` | both | built first: the Harness writes authority into it, the controller's exposure resolver reads it back |
| `FifoScheduler` | Harness | scheduling strategy is policy |
| `ControllerRegistry` + `createAgentController` | Harness / controller | one controller per Definition kind |
| `createFixedClock` / `createDeterministicIds` | Harness | deterministic, so runs are reproducible |
| `createCapabilityCatalog` | controller + Harness | descriptive truth; grants nothing; unclassified means consequential |
| `createActiveOperationViewResolver` | controller | narrows authority into exposure; never widens |
| `StaticModelResolver` + `ScriptedModelProvider` | controller | deployment decides the concrete model; the definition names only a logical reference |
| `createReferenceAgentExecutor` | controller | invokes the resolved provider |
| `EffectAuthorizer` | **Harness** | **omit it and every Effect is denied** |
| `CapabilityExecutor` | Harness | where authorized work happens; given no store and no ExecutionContext |
| `operationAuthority` at `createExecution` | Harness | the runtime-owned ceiling; **omit it and nothing can be exposed** |

Two defaults are load-bearing and deliberately fail closed: no authorizer denies everything, and no
operation ceiling exposes nothing. "Nobody configured it" and "it was allowed" must never look the
same.

## What it is not

Not a template for a whole product, and not a polished composition API — the current Execution-kernel
developer surface is genuinely low-level, and this example shows that honestly rather than hiding it.

For deciding *what* to build — Workflow or Agent, which Stage kind, what belongs in Structured
Memory, when an action needs confirmation — see
[`docs/guides/agent-workflow-composition/`](../../docs/guides/agent-workflow-composition/README.md),
and in particular
[`current-authoring-surface.md`](../../docs/guides/agent-workflow-composition/current-authoring-surface.md),
which records what each stock surface can actually emit today.
