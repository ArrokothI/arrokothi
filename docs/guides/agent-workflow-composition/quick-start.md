# Quick start: from checkout to application

[Guide home](README.md). Use **`@arrokothi/sdk`** for ordinary application bootstrap. It sits above
`@arrokothi/core`; definitions and runtime semantics still belong to the kernel. Copy the relevant
[runnable example](../../../examples/execution-kernel-minimal/README.md), then replace its domain code.

## Setup and imports

Run `npm install` at the workspace root with Node 22.9+. Examples use ESM, TypeScript `NodeNext`,
`import type`, `.ts` extensions on relative imports, and `node --experimental-strip-types`.
Package imports have no `.ts` suffix. Exports currently point to TypeScript source. Published
source packages require a consumer TypeScript build/bundler: stock Node will not strip `.ts` files
inside `node_modules`. This guide does not assume this checkout has been published to npm.

| Import | Use |
|---|---|
| `@arrokothi/sdk` | `createApplication`, `defineAgent`, `defineWorkflow`, application/preflight/run types and common definition/schema types |
| `@arrokothi/core` or `/execution` | Full kernel data/Effect vocabulary, readers, advanced `Harness` and custom-controller composition |
| `@arrokothi/core/ports` | Application-supplied capability, policy, model, resource and storage contracts |
| `@arrokothi/core/reference` | Catalog/policy helpers, scripted providers, static model mappings and optional reference implementations |
| Concrete adapter packages | Gemini, Strands, local retrieval, MCP |
| `@arrokothi/core/testing` | Test scaffolds only; not application bootstrap |

## One application, many Executions

The [handbook app](../../../examples/execution-kernel-minimal/app.ts) is the smallest Agent example.
Its composition has three deployment concerns: models, capability implementation/catalog, and policy.
The definition requests operations; each start supplies its own operation ceiling. None implies the
others. The SDK creates stores, scheduler, both controllers, reference Agent executor and the
store-backed view resolver. Default IDs use UUIDs and the default clock uses real time.

For a Function-only Workflow, `createApplication({ functions: { name: handler } })` is sufficient.
Definitions still name handlers using `implementationRef`; executable code stays in deployment wiring.
[Classification](../../../examples/execution-kernel-minimal/classification.ts) adds model services
for bounded inference and declared branches. [Patterns](../../../examples/execution-kernel-minimal/patterns.ts)
adds memory, current-state policy, exact confirmation, and a Workflow calling an Agent child.

The basic lifecycle is:

```ts
const app = createApplication({ models, capabilities, authorizer, functions });
await app.register(reviewer); // Definitions referenced by child Stages.
const started = await app.start({
  definition: workflow,
  input: { label: "topic", payload: "Explain the release process" },
  operationAuthority: { operations: permittedOperations },
  structuralSpawnBudget: 1,
});
const result = await app.runUntilBlocked(started.executionId, { timeoutMs: 5_000 });
```

Names such as `models` and `workflow` above refer to application configuration; see the linked source
for complete runnable declarations. No spawn capacity or operation grant is supplied automatically.
An application can deliberately omit them and inspect refusal through the Harness.

`register(...definitions)` is idempotent for identical bytes and rejects changed bytes at an existing
version. It checks the entire batch for known version conflicts before writes; a failing external
DefinitionStore can still partially persist a batch because the store port has no transaction.
`start` registers a supplied definition, or resolves an already-registered integrity-pinned ref.
A changed definition needs a new version; existing Executions keep their pinned bytes.

`start` preflights before creating state and delivers initial input before SDK-driven Activations.
Omitting input is deliberate: a Workflow can begin with null; an Agent will wait for input.
Initial input delivery receipts remain visible on `StartedExecution`. SDK starts and scheduler
operations serialize creation/input with Activations. Direct Harness workers must coordinate with
SDK starts themselves; this is not a multi-process create-and-deliver transaction.

## Defaults and extension points

| Concern | SDK default / explicit configuration |
|---|---|
| Runtime | One `InMemoryRuntimeStore`, `InMemoryDefinitionStore`, `FifoScheduler`, system clock, UUID IDs per application |
| Controllers | Stock Agent and Workflow; portable definitions unchanged |
| Models | Absent until configured; `models: { providers, bindings }` creates shared registry/resolver and reference Agent executor |
| Custom model routing | `models: { providers, resolver }`; runtime validates actual resolution |
| Capabilities | Explicit `{ catalog, executor }` pair; no automatically implemented or granted operation |
| Effect authorization | All denied unless `authorizer` is provided |
| Confirmation | No additional gate unless `confirmationPolicy` is provided; authorization is still required |
| Operation exposure | Shared-store ceiling ∩ authored request ∩ catalog; no default ceiling |
| Structured Memory | No binding/read/write grants by default; explicit start binding and application read/write-exposure grants |
| Function/Adapter code | `functions` / `adapters` records keyed by implementation ref |
| Advanced ports | `runtime` overrides runtime services; `controllers(services)` overrides selected stock-controller strategies |

Use `controllers(services)` to build a custom view resolver against `services.store`, provide a
Derived Memory resolver/information compiler, wire resources or tracing, or select a Strands executor.
Only properties you return override defaults. Explicitly returning `undefined` disables that property.
These are trusted deployment extension points; arbitrary custom controller implementations still use
`@arrokothi/core` directly. No SDK import enters core or any provider adapter.

Memory grants in `memory.read` and `memory.writeExposure` apply to all Executions unless explicitly
scoped with `memory.executions`. They are deployment policy, never inferred from authored keys. For
per-user/current-state rules supply narrow resolvers through `controllers(services)`. Final
WriteMemory authorization remains independent. See the [memory chain](current-authoring-surface.md#structured-memory-wiring).

## Preflight without granting anything

`await app.preflight(startOptions)` returns `{ ok, diagnostics }`. Each diagnostic has `severity`,
`code`, `path`, and `message`. `start` runs the same check, throws `ApplicationConfigurationError`
for errors, and includes warnings/info in `started.preflight`. Warnings do not prevent deliberately
denied applications from running.

Errors cover invalid definitions/topology, version/integrity conflicts, missing child definitions or
wrong child kinds, missing static model services/provider/features, missing Function/Adapter handlers,
invalid grants/bindings/budgets, and malformed initial data. Warnings explain absent catalog entries,
unprojectable operations, requested-but-ungranted operations, absent memory bindings/grants, no Effect
policy, missing spawn credits, and child response/terminal mismatches. Recursive definition graphs
are traversed with cycle detection, not rejected merely for recursion.

Preflight reads configuration, catalogs and stores. It never invokes a model, capability, handler,
policy, custom model resolver, or custom exposure resolver. Custom/dynamic routing is reported as
runtime-checked. It cannot predict payload-dependent permission, external availability, arbitrary
Function Effects, business correctness, dynamic resource contents, or exact termination of a loop.
It does not exhaustively prove reachability. The kernel validates topology, resolves actual models,
reauthorizes Effects, and establishes outcomes during execution.

## Drive and observe the host boundary

`runUntilIdle()` runs currently queued work. Idle does not mean complete; slow work may wake it later.
`runUntilBlocked(id, options)` drives the **shared** scheduler, including other Executions, and polls
settlement until the target completes, fails, cancels, needs input/confirmation, or hits a host limit.
It also surfaces human waits in required called children through `waitingExecutionId`; detached children
do not create a completion dependency. Returned `execution` is the target's inspected state.

| `reason` | Host response |
|---|---|
| `completed` | Read `execution.terminalResult`; emissions remain separate |
| `failed`, `cancelled` | Inspect failure/cancellation and actual external outcomes |
| `input_required` | Collect the next conversation input for `waitingExecutionId` |
| `confirmation_required`, `user_input_required` | Present the stored request through an authenticated UI |
| `timeout`, `activation_limit`, `aborted` | Return pending status, inspect, and schedule another bounded run or cancel explicitly |

Defaults: 30s host wait, 1,000 total scheduler Activations, 10ms polling. A timeout or AbortSignal
stops the host wait; it does not cancel a model, Effect, or Execution. Limits are checked **between**
Activations: trusted Function code, custom ports, or an outstanding SDK lock can delay return. Provider
and operation deadlines remain separate. No drain waits, permanent background loop, automatic retries,
or success-shaped conversion of timeout/unknown outcomes are hidden inside this helper.

Your transport authenticates callers, maps jobs/conversations to Execution IDs, serializes chat turns,
and tracks emission IDs/cursors. `harness.emissionsOf(id)` returns the whole history. Use
`deliverExternalInput`, `resolveConfirmation`, `submitUserInput`, and `cancelExecution` on the Harness;
check their receipts. Natural-language approval does not resolve confirmation. Cancellation does not
cascade or undo completed external work. Poll/back off from your host worker when further work remains.

Default runtime state is in memory, and trusted-local mediation is not hostile-code containment.
Replacing one store or scheduler does not provide crash recovery. Keep durable business facts,
external idempotency and uncertain-outcome reconciliation in the application.
