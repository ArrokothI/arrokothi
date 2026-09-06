# Current authoring surface and API map

[Guide home](README.md) · [Quick start](quick-start.md). Semantics belong to
[composition](../../composition.md), [runtime](../../execution-runtime.md), and [memory](../../memory.md).
This table describes the stock implementation, not everything the kernel can represent.

## What each surface can do

| Surface | Capabilities | Structured Memory | Children | Messaging / typed user input |
|---|---|---|---|---|
| Reference Agent controller | Model selects projected operations | Read authorized snapshot; model proposes write actions | Cannot call/spawn | Cannot send or emit `RequestUserInput`; ordinary chat replies work |
| Function Stage | Return `awaitEffects` capability requests | Return `write_memory` requests; no direct read handle | Cannot call/spawn | Cannot send/request |
| LLM Stage | Declared `callables`; enough model phases required | No built-in reads or writes | Cannot call/spawn | Cannot send/request |
| Agent / Workflow Stage | Child may use its own operations | No child memory binding | Exactly one child `call` | No Stage-level send/request |
| Application `ExecutionController` | Can propose all five Effect kinds | Must respect binding and authorization | `call` / `spawn` | `send` / `ask` / `reply`, `RequestUserInput` |
| Trusted host | Assembles executors and policies; no arbitrary public Effect-submit method | Inspect via `structuredMemoryOf`; no public setter | Create a root Execution, or drive an authored child composition | Deliver input, submit requested values, resolve confirmation, cancel |

A stock Workflow consumes external input once. Agent `respond_and_wait` supports subsequent turns.
Slow model inference is controller-local work, not a sixth Effect. Definitions contain JSON data,
not handlers, closures, credentials, provider clients, or stores.

## Public API map

All links below lead to definitions of public symbols. Import via the named entrypoint, not the linked
internal source path. [Package exports](../../../packages/core/package.json) are the allowed paths.

| Need | Import surface and symbols | Source |
|---|---|---|
| Definitions | root or `/execution`: `defineAgent`, `defineWorkflow`, definition inputs and terminal schemas | [definitions](../../../packages/core/src/definitions/types.ts), [Agent spec](../../../packages/core/src/agent/spec.ts), [Workflow spec](../../../packages/core/src/workflow/spec.ts) |
| Run, input, inspect, cancel | root or `/execution`: `Harness`, `HarnessOptions`, `CreateExecutionInput`, `ExecutionId` | [Harness](../../../packages/core/src/runtime/harness.ts) |
| Controller assembly | root or `/execution`: `ControllerRegistry`, `createAgentController`, `createWorkflowController` | [Agent options](../../../packages/core/src/controllers/agent/controller.ts), [Workflow options](../../../packages/core/src/controllers/workflow/controller.ts) |
| Stage handlers | `/ports`: `StageExecutionContext`, `FunctionStageOutcome`; `/reference`: `createFunctionStageRegistry` | [Stage port](../../../packages/core/src/ports/stage.ts), [requests and observations](../../../packages/core/src/workflow/observations.ts) |
| Operations | `/ports`: `CapabilityExecutor`, `CapabilityCatalog`; `/reference`: `createCapabilityCatalog`, `createAllowListAuthorizer` | [executor](../../../packages/core/src/ports/capability-executor.ts), [catalog](../../../packages/core/src/ports/capability-catalog.ts) |
| Portable schema | root, `/execution`, or `/ports`: `ObjectSchema`, `ValueSchema`; root or `/execution`: validation and JSON Schema helpers | [schema language](../../../packages/core/src/schema/value-schema.ts) |
| Memory binding and inspection | root or `/execution`: `StructuredMemoryBinding`, `StructuredMemoryView`, `readAgentControlState` | [Structured Memory](../../../packages/core/src/execution/structured-memory.ts), [Agent state](../../../packages/core/src/agent/control-state.ts) |
| Memory/context wiring | `/reference`: read/write view resolver factories; root or `/execution`: `AgentInformationCompiler`, `referenceAgentInformationCompiler` | [read resolver](../../../packages/core/src/reference/structured-memory-read-view-resolver.ts), [write resolver](../../../packages/core/src/reference/structured-memory-write-view-resolver.ts), [compiler](../../../packages/core/src/controllers/agent/information.ts) |
| Model integration | `/ports`: `ModelProvider`, `ModelResolver`, `AgentExecutor`; `/reference`: `StaticModelResolver`, `ModelProviderRegistry`, `createReferenceAgentExecutor` | [model types](../../../packages/core/src/model/types.ts), [executor port](../../../packages/core/src/ports/agent-executor.ts) |
| Advanced controller Effects | root or `/execution`: `useCapability`, `writeMemory`, `promoteDerivedClaim`, `callExecution`, `spawnExecution`, `send`, `ask`, `reply`, `requestUserInput` | [Effects](../../../packages/core/src/effects/types.ts), [communication helpers](../../../packages/core/src/execution-api.ts) |

`StageCapabilityRequest` is not `UseCapabilityProposal`: Stage code returns `{ key, capability,
operation, input }`; the controller creates runtime correlation. A memory request instead uses
`{ kind: 'write_memory', key, memoryKey, value, expectedRevision? }`. Do not cast a kernel proposal
into a Stage request. `ObjectSchema` uses `kind`, `fields`, field-level `required`, and `schema`;
raw JSON Schema uses a different vocabulary.

## Structured Memory wiring

Use [patterns.ts](../../../examples/execution-kernel-minimal/patterns.ts) as the compiled reference.
An Execution starts with declared **unset** fields, not initial values:

```text
Harness.createExecution({ structuredMemory: { fields } })
       + Agent spec.structuredMemory.read.keys
       + createAgentController({ structuredMemoryReadView:
           createStructuredMemoryReadViewResolver({ store, grants: { readableKeys } }) })
       → authorized snapshot → information compiler → model context

same binding
       + Agent spec.structuredMemory.write.keys
       + createAgentController({ structuredMemoryWriteView:
           createStructuredMemoryWriteViewResolver({ store, grants: { writableKeys } }) })
       → memory_write_<key> callable with { value }
       → model selection → WriteMemory proposal
       + Harness authorizer memory grant
       → schema/revision checks → commit
```

Both resolver options are denied by default. Read grants, write **exposure** grants, and final write
permission are independent. Authored keys alone do nothing. Resolver instances must use the runtime's
store. Static grants apply to every Execution unless restricted; tenant/user policy is host work.
Aliases in the example are deterministic for its tiny interface, but arbitrary catalogs can collide:
inspect the actual invocation projection rather than deriving aliases in application policy.

Host reads use `view.values[key]?.value`, not `view.values[key]` (which is a committed record with
provenance). The compiler sees a narrowed snapshot. Stage and capability ports carry no direct
Structured Memory handle; do not close over the store in a Stage to circumvent this boundary.

## Current limitations that affect design

- `StageResult = string | null`. Workflow completion transitions contain **literal** terminal values
  or none; no selector forwards the last Stage result to the terminal result. A child Workflow's
  computed output cannot simply be declared as its return value.
- Stock Agent completion returns response **text** when a terminal schema is declared; declaring an
  object schema does not parse model text into an object. Stock child Stages accept string/null
  terminal values only.
- No Artifact/File mechanism, cross-Execution Structured Memory scopes, or memory binding on spawned
  children. Use application storage and explicit references.
- No crash-durable Execution store/scheduler, hosted containment, or automatic external
  reconciliation.
- No generic discovery across services/resources/skills. MCP covers synchronous Tools only.
- UseCapability deadlines/idempotency do not apply uniformly to other Effects; see
  [action lifecycle](capabilities-effects-and-authority.md). Confirmed redispatch has a known replay
  gap; application idempotency is necessary.

## When the stock surface is insufficient

First prefer a supported shape: an Agent conversation; a Workflow around an Agent child; a Function
Stage consuming its own input/observations; or a host-owned database gate. For independent per-turn
jobs the host may create root Workflows and pass input explicitly; those do not inherit child lineage
or authority. A capability can call an external service, but hiding a second in-process Harness in it
does not create a kernel child relationship.

Replace a port when the need belongs at that boundary: information compiler, view resolver, policy,
capability executor, model adapter. Use a custom `ExecutionController` only when you need semantic
progression the stock controllers cannot express, with tests for resumptions, correlation, outcomes,
and cancellation. Record missing/awkward contracts in [findings](../../development/007-application-builder-ergonomics-findings.md)
and continue supported application work; do not redesign the kernel to make a diagram runnable.
