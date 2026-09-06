# Quick start: from checkout to application

[Guide home](README.md). The runnable source is the copyable example; this page explains its assembly
and lifecycle rather than maintaining a second copy of it.

## Setup and imports

Use the repository's npm workspaces (`npm install` at the root). The package exports point directly
to TypeScript source, use ESM, and need a runtime that understands it. The repository uses
`node --experimental-strip-types` and TypeScript `NodeNext`; see [tsconfig](../../../tsconfig.json).
Use `import type` for types and `.ts` extensions for relative source imports. Package imports have no
`.ts` suffix. This guide does not assume that the checkout's version has been published to npm.

| Import | Use |
|---|---|
| `@arrokothi/core` or `@arrokothi/core/execution` | `defineAgent`, `defineWorkflow`, `Harness`, `ControllerRegistry`, controllers, public data types, Effect constructors, state readers |
| `@arrokothi/core/ports` | Interfaces for capabilities, policy, models, storage, stages, context and view resolution |
| `@arrokothi/core/reference` | In-memory stores, scheduler, registries, reference resolvers/executor, scripted/deferred providers |
| `@arrokothi/core/testing` | Test harnesses and fixtures; inspect their defaults before copying expectations |

Use [package exports](../../../packages/core/package.json) and the
[public API map](current-authoring-surface.md#public-api-map) when autocomplete suggests an internal
source file. Do not deep-import `packages/core/src` into application code.

## Read one composition root

[app.ts](../../../examples/execution-kernel-minimal/app.ts) wires a read-only handbook Agent:

1. A catalog describes an operation; a `CapabilityExecutor` implements dispatch and outcomes.
2. A portable definition names a logical model, requests operations, and declares bounds.
3. Deployment maps the logical model using `StaticModelResolver`; a provider registry sits behind
   `createReferenceAgentExecutor`. Real-provider replacements are in [provider wiring](providers-and-integrations.md).
4. The Agent's view resolver reads operation authority from the **same store** the Harness uses.
5. The Harness receives definitions, store, scheduler, controllers, clock, IDs, catalog, executor,
   and explicit policy. No authorizer denies Effects; no operation grant exposes nothing.
6. Save the definition, create the Execution with its operation ceiling, deliver initial input,
   and drive the scheduler. Definition versions are immutable: change `version` when changing
   saved content; an existing Execution keeps its pinned definition.

For pure Function Workflows, skip model services entirely. Register Function implementations with
`createFunctionStageRegistry` and pass it to `createWorkflowController`. Register both controller
kinds when a Workflow calls an Agent. The [pattern assembly](../../../examples/execution-kernel-minimal/patterns.ts)
shows both, as well as the full memory and confirmation wiring.

The example clock/IDs are deterministic for offline testing. For a real process use
`createSystemClock()` and an application `IdGenerator`, e.g. `next: prefix => prefix + '_' + randomUUID()`
with `randomUUID` from `node:crypto`. Restarting a counter can reuse external identifiers. Neither
changing IDs nor swapping a clock supplies runtime crash recovery.

## Own the host loop

`createExecution` returns a handle, not a chat session object with `runTurn`. Your application maps an
authenticated conversation/job to an Execution ID and owns transport, UI, and request serialization.

- Deliver `external.input` using `deliverExternalInput({ destination, label, payload })` and check its
  receipt. A string is the simplest conversation or Workflow input. Deliver Workflow start input
  **before** the first scheduler run; it can start with `null` and ignores later input.
- `runUntilIdle()` runs currently queued Activations. Idle is not completion. Slow models or
  capabilities may still be running; a settlement schedules another Activation that the host must run.
- In finite offline scripts, `drainResumptions()` waits for model/local work and `drainEffects()` for
  dispatched capabilities. Then run the scheduler again. These drains can wait indefinitely on real
  work; they are not a production request timeout. Serve a waiting status and schedule further runs
  from your application's worker/pump with a bounded polling/backoff policy.
- Inspect `lifecycle` and `waitingFor`. Surface pending confirmations through a trusted UI; only an
  authenticated human decision should call `resolveConfirmation`. Do not infer approval from prose.
- Read `emissionsOf(id)` for UI responses, tracking emission IDs or an application cursor. The method
  returns the whole history, not just the latest turn. Read `terminalResult` only after `COMPLETED`.
- Serialize chat turns per Execution and distinguish a conversational input wait from an Effect or
  model wait. Cancel through `cancelExecution`; cancellation does not undo completed external work.

Keep runtime state in the Harness and business records in their proper store. Do not mutate
`inspect(...).control.progress` or seed memory using `/testing` in a running application. There is no
public host setter for committed Structured Memory: writes go through an Agent or Function Stage
Effect (or an explicitly designed controller).

## First adaptation

Replace the handbook catalog/executor and instructions with your domain, then test an authorized and
a denied request. For conversations with retained state or approval, adapt `patterns.ts`; for a fixed
process, adapt its Workflow and Function registry. Do not import either example as a framework SDK.
