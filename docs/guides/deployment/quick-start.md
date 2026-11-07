# Quick start: from checkout to application

[Guide home](README.md). Use **`@arrokothi/sdk`** for ordinary application bootstrap. Since K1.4 the SDK
runs every Execution through the Kernel (`@arrokothi/kernel`, private): each start, input, confirmation,
cancellation and run is a Kernel call, and the 0.8.x Harness with its stock controllers is the native
Runtime of one legacy Execution Driver behind it. Copy the relevant
[runnable example](../../../examples/execution-kernel-minimal/README.md), then replace its domain code.
Upgrading from 0.8.x? Read [migrating from the 0.8.x SDK](#migrating-from-the-08x-sdk) first.

## Setup and imports

Run `npm install` at the workspace root with Node 26.10+. Examples use ESM, TypeScript `NodeNext`,
`import type`, `.ts` extensions on relative imports, and `node --experimental-strip-types`.
Package imports have no `.ts` suffix. Exports currently point to TypeScript source. Published
source packages require a consumer TypeScript build/bundler: stock Node will not strip `.ts` files
inside `node_modules`. This guide does not assume this checkout has been published to npm, and
`@arrokothi/sdk` is `"private": true` until a release packet decides how to publish it with the Kernel.

| Import | Use |
|---|---|
| `@arrokothi/sdk` | `createApplication`, `defineAgent`, `defineWorkflow`, `toCanonicalBytes`, application/preflight/run types and common definition/schema types |
| `@arrokothi/core` or `/execution` | Full 0.8.x data/Effect vocabulary, readers, and a direct `Harness` with custom controllers: preserved, but not routed through the Kernel |
| `@arrokothi/core/ports` | Application-supplied capability, policy, model, resource and storage contracts |
| `@arrokothi/core/reference` | Catalog/policy helpers, scripted providers, static model mappings and optional reference implementations |
| Concrete adapter packages | Gemini, Strands, local retrieval, MCP |
| `@arrokothi/core/testing` | Test scaffolds only; not application bootstrap |

## One application, many Executions

The [handbook app](../../../examples/execution-kernel-minimal/app.ts) is the smallest Agent example.
Its composition has three deployment concerns: models, capability implementation/catalog, and policy.
The definition requests operations; each start supplies its own operation ceiling. None implies the
others. The SDK creates the Kernel coordinator, the legacy Driver, native stores, the Driver's lineage
scheduler, both controllers, the reference Agent executor and the store-backed view resolver. Default IDs
use UUIDs and the default clock uses real time; the Kernel reads the same clock.

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
An application can deliberately omit them and inspect the refusal through `app.harness` readers.

`register(...definitions)` is idempotent for identical bytes and rejects changed bytes at an existing
version. It checks the entire batch for known version conflicts before writes; a failing external
DefinitionStore can still partially persist a batch because the store port has no transaction.
`start` registers a supplied definition, or resolves an already-registered integrity-pinned ref.
A changed definition needs a new version; existing Executions keep their pinned bytes.

`start` validates and preflights before creating anything. It then creates the Kernel Execution atomically
with its initial input, and creates the native root synchronously under the same ID before it returns. The
first exchange forwards the initial input to the native root; its result is the first
`arrokothi.bridge.ingress_result` Emission (`app.inspect(id).emissions`). Omitting input is deliberate: a
Workflow can begin with null; an Agent will wait for input.

| `start` option or result | Meaning |
|---|---|
| `creationKey` | Optional, at most 64 characters from `[A-Za-z0-9._:-]`; defaults to a UUID. An exact retry with the same key and content returns the same Execution with `replayed: true` and does no native work; changed content conflicts. Keys are application-global and last one coordinator lifetime |
| `executionDeadline` | Optional absolute `Date` on the `runtime.clock` scale. At expiry the Kernel cancels the Execution (cause `execution_deadline`) and the Driver cancels the native lineage |
| `receipt`, `replayed` | The Kernel creation receipt, and whether this call replayed an earlier creation |
| `ApplicationStartError` | The native root could not be created; the Kernel Execution was cancelled first. Code `arrokothi.bridge.native_root_exists` (a shared native store already holds that ID) or `arrokothi.bridge.native_creation_failed` |
| `ownerExecutionId` | Refused by name (`owner_unsupported`): Kernel composition is K4's |

## Defaults and extension points

| Concern | SDK default / explicit configuration |
|---|---|
| Runtime | One Kernel coordinator, `InMemoryRuntimeStore`, `InMemoryDefinitionStore`, the Driver's lineage scheduler, system clock, UUID IDs per application. `runtime.scheduler` is refused (`scheduler_owned_by_bridge`); `runtime.maxActivationsPerRun` is accepted, ignored and warned about (`option_ignored`) |
| Human-wait deadline | None unless `humanWaitDeadlineMs` is set; then each declared human pause expires that many milliseconds after it was first observed, and the Execution fails with `arrokothi.bridge.wait_deadline_expired` |
| Controllers | Stock Agent and Workflow; portable definitions unchanged |
| Models | Absent until configured; `models: { providers, bindings }` creates shared registry/resolver and reference Agent executor |
| Custom model routing | `models: { providers, resolver }`; runtime validates actual resolution |
| Capabilities | Explicit `{ catalog, executor }` pair; no automatically implemented or granted operation |
| Effect authorization | All denied unless `authorizer` is provided |
| Confirmation | No additional gate unless `confirmationPolicy` is provided; authorization is still required |
| Operation exposure | Shared-store ceiling ∩ authored request ∩ catalog; no default ceiling |
| Structured Memory | No binding/read/write grants by default; explicit start binding and application read/write-exposure grants |
| Function/Adapter code | `functions` / `adapters` records keyed by implementation ref |
| Advanced ports | `runtime` overrides native runtime services; `controllers(services)` overrides selected stock-controller strategies. `services.store` and `services.scheduler` are for reads: writing through them advances a lineage outside the Driver and is unsupported (L-34) |

Use `controllers(services)` to build a custom view resolver against `services.store`, provide a
Derived Memory resolver/information compiler, wire resources or tracing, or select a Strands executor.
Only properties you return override defaults. Explicitly returning `undefined` disables that property.
These are trusted deployment extension points; arbitrary custom controller implementations still use
`@arrokothi/core` directly, outside the Kernel. No SDK import enters core or any provider adapter.
Native Activations of different Executions may now run interleaved, so handlers, executors and
providers shared between Executions must be reentrant.

Memory grants in `memory.read` and `memory.writeExposure` apply to all Executions unless explicitly
scoped with `memory.executions`. They are deployment policy, never inferred from authored keys. For
per-user/current-state rules supply narrow resolvers through `controllers(services)`. Final
WriteMemory authorization remains independent. See the [memory chain](../execution/native/current-authoring-surface.md#structured-memory-wiring).

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

`runUntilBlocked(id, options)` dispatches READY Executions of this application through the Kernel and
waits until the target completes, fails, cancels, needs input or confirmation, or hits a host limit. Each
Kernel exchange runs one native step. Slow model or capability work keeps the exchange `RUNNING`, with no
Kernel wait; a human pause becomes a Kernel wait only once every native member of the lineage is paused.
`reason` comes from Kernel state and, for a wait, from the latest pause Emission; `waitingExecutionId`
names the native Execution, possibly a required called child, whose confirmation or input blocks the
target. Detached children create no completion dependency.

| `reason` | Host response |
|---|---|
| `completed` | Read `kernel.result`; Emissions are separate (`kernel.emissions`) |
| `failed`, `cancelled` | Inspect the failure or cancellation and the actual external outcomes |
| `input_required` | Send the next conversation input with `app.input(id, { label, payload })` |
| `confirmation_required` | Present the stored request through an authenticated UI, then `app.resolveConfirmation` |
| `user_input_required` | Unreachable with the stock controllers; typed user input is refused |
| `timeout`, `activation_limit`, `aborted` | Return pending status, inspect, and schedule another bounded run or cancel explicitly |

`RunResult.kernel` is the Kernel's `ExecutionView` and is authoritative. `RunResult.execution` is the
native root's view, kept as a deprecated diagnostic. `activations` counts the Kernel exchanges this call
dispatched. Defaults: 30s host wait, 1,000 exchanges, 10ms longest idle slice (`pollIntervalMs`); waits are
otherwise event-driven. A timeout or AbortSignal stops the host wait; it does not cancel a model, Effect,
or Execution. Deadlines take effect at the next host call: every `start`, `input`, `resolveConfirmation`,
`cancel` and run call fires due Kernel timers first. `runUntilIdle()` is deprecated: it dispatches until
nothing is READY and does not wait for in-flight native work.

Host actions are Kernel calls, each with a Kernel receipt; give a `requestKey` to make a retry exact:

| Action | Call |
|---|---|
| Next conversation input | `app.input(id, { requestKey?, label, payload?, destination?, correlationId?, causationId? })`. Without `destination`, the one input-waiting member the latest pause names receives it; when several wait, `destination` is required |
| Confirmation decision | `app.resolveConfirmation(id, { requestKey?, confirmationId, decision })` |
| Cancellation | `app.cancel(id)`: cancels the Kernel Execution and the whole native lineage, root and descendants. It does not undo completed external work |
| Kernel view | `app.inspect(id)`: state, accepted Emissions, the result, the wait and the mailbox |

Structural input errors (an empty label, a malformed destination or key, an unrepresentable payload) are
refused synchronously with `ApplicationInputError` and write nothing. Whether the native side delivered,
rejected or discarded an accepted input is reported in an `arrokothi.bridge.ingress_result` Emission.
Input queued while an exchange runs counts against the Kernel mailbox capacity of 1,024 unacknowledged
Events; beyond it `app.input` is refused as `capacity_exhausted`. Natural-language approval does not
resolve confirmation. Your transport authenticates callers, maps jobs and conversations to Execution IDs,
serializes chat turns, and tracks Emission cursors.

`app.harness` is a deprecated, read-only view: its readers return native diagnostics, and its mutators
(`deliverExternalInput`, `resolveConfirmation`, `cancelExecution`, `runOnce`, `submitUserInput`,
`settleEffect` and the rest) refuse with `LegacyHarnessMutationRefused`, naming the replacement.

Values crossing the boundary are canonical bytes; see [values at the boundary](values-at-the-boundary.md).
Default runtime state is in memory, and trusted-local mediation is not hostile-code containment.
Replacing one store does not provide crash recovery. Keep durable business facts, external idempotency
and uncertain-outcome reconciliation in the application.

## Migrating from the 0.8.x SDK

K1.4 keeps every SDK feature, migrates some, and refuses a few by name (K14-4's inventory,
`packages/sdk/tests/bridge-inventory.test.ts`, holds one test per row).

| Before (0.8.x) | After (K1.4) |
|---|---|
| `app.harness.deliverExternalInput({ destination, label, payload })` | `app.input(id, { label, payload, destination? })` |
| `app.harness.resolveConfirmation({ confirmationId, decision })` | `app.resolveConfirmation(id, { confirmationId, decision })` |
| `app.harness.cancelExecution({ executionId, reason })` (root only) | `app.cancel(id)`: the whole native lineage; the free-text reason is not recorded |
| `app.harness.runOnce`, `drainEffects`, `drainResumptions`, `runUntilIdle` | `app.runUntilBlocked(id)`; the Harness mutators refuse |
| `harness.submitUserInput`, `harness.settleEffect` | Refused: no stock controller requests typed user input, and the trusted result ingress is K2's |
| `StartedExecution.inputReceipt` | `StartedExecution.receipt` (Kernel) plus the first `ingress_result` Emission |
| A native rejection of initial input threw from `start` | The Execution fails with `arrokothi.bridge.initial_input_rejected`; malformed data and preflight errors still throw before creation |
| `RunResult.execution` | Still present, deprecated; read `RunResult.kernel` |
| `runtime.scheduler` | Refused; Kernel dispatch and the lineage scheduler own scheduling |
| `runtime.maxActivationsPerRun` | Ignored with a preflight warning; `maxActivations` per run remains |
| `start({ ownerExecutionId })` | Refused (`owner_unsupported`) |
| A native result, Emission or failure detail of any size | Over the core value limits, the Execution fails with `arrokothi.bridge.value_unrepresentable` after the native work ran; a failure keeps its code |
| One native Activation at a time across the application | Activations of different Executions interleave; shared handlers must be reentrant |
| A malformed input returned a `rejected` receipt | Refused synchronously with `ApplicationInputError` |

The examples under `examples/execution-kernel-minimal/` use the new calls.
