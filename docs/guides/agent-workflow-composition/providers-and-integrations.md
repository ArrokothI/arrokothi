# Provider and integration wiring

[Guide home](README.md). Provider choice belongs in deployment code. Existing integrations implement
kernel-owned [ports](../../../packages/core/src/ports/index.ts); adding a new adapter is separate from
using one in an application.

## Model provider versus Agent executor

```text
Agent definition.model.logicalRef
  → ModelResolver → resolved model
  → AgentExecutor → ModelProviderRegistry → ModelProvider.generate

LLM Stage.model.logicalRef
  → ModelResolver → ModelProviderRegistry → ModelProvider.generate
```

The reference Agent executor is a small, dependency-free implementation of `AgentExecutor`.
`createStrandsAgentExecutor` from `@arrokothi/integration-strands` is the current Strands integration
for that same port. Both receive the kernel's invocation snapshot and return outcomes/action
selections; they do not run the application's external capabilities independently. Do not use the
legacy `StrandsLoopEngine` / `createStrandsGeminiEngine` for Execution-kernel applications.

For an Agent, wire `models: { resolver }` on `createAgentController` and
`executor: createReferenceAgentExecutor({ providers })` (or `createStrandsAgentExecutor({ providers })`).
For LLM Stages, wire `models: { resolver, providers }` on `createWorkflowController`. Configuring a
provider only for the Agent does not make it available to the Workflow controller.

## Switch the offline example to a real model

Keep definitions unchanged. In the composition root:

1. Construct `GeminiModelProvider` from `@arrokothi/provider-gemini` with a deployment-supplied `apiKey`,
   or use `createGeminiModelProviderFromEnv`. These implement the current `ModelProvider` port;
   `GeminiProvider` is legacy.
2. Register that instance in `new ModelProviderRegistry([provider])`.
3. Map `primary` in `StaticModelResolver` to `{ provider: provider.id, model: configuredModelId,
   portableFeatures: portableModelFeatures({ capabilityCalls: true, structuredOutput: true }) }`.
   Advertise only features the chosen provider/model supports; requirements are validated, not
   silently downgraded. Model IDs and credentials are configuration, not portable Definition fields.
4. Keep catalogs, operation ceilings, policies, and memory resolvers. Changing providers grants no
   additional operation authority. A model generating prose when a callable is needed is a behavior
   problem to test, not evidence that policy should be loosened.
5. Replace the offline drain helper with your host's bounded worker loop and provider timeout policy.

[provider-wiring.ts](../../../examples/execution-kernel-minimal/provider-wiring.ts) contains compiled
factories for both executors and Workflow model access. Its
[offline test](../../../examples/execution-kernel-minimal/provider-wiring.test.ts) exercises the Gemini
adapter with a fake HTTP transport; no key or network is needed. For a real deployment, run a separate
live canary with your configured model before relying on feature claims. Offline scripts cannot
measure language quality or live service availability.

## Retrieval and local resources

For task-following retrieval, expose a small `search` capability returning IDs and snippets and a
`read` capability returning bounded detail. The executor owns database/network access and returns
`CapabilityOutcome`; model-visible results are data. Do deterministic filtering in the executor.

For standing inferred knowledge use `DerivedSemanticMemoryProvider`, extractor, and read resolver;
`AgentSpec.derivedMemory.read.query` is a fixed authored query, not a query generated each turn.
`@arrokothi/core/reference` supplies the in-memory derived provider and read resolver.
`@arrokothi/retrieval-local` supplies lexical retrieval, record queries, resources and a capability executor; its `/legacy` exports are for the
old knowledge API. See [state guidance](state-memory-and-context.md).

Function Stages can read pre-materialized local resources via declared `resourceViews` and a
`LocalResourceEnvironment`. This is explicit read-only access, not a general database handle or a
replacement for authority on external operations.

## MCP

`@arrokothi/integration-mcp` owns MCP wire types. `importMcpTools` produces a catalog, operation refs,
and a capability executor; the application still grants selected refs in `operationAuthority`,
requests exposure in the definition, and authorizes concrete Effects. Importing or discovering a Tool
is not a grant. The executor should be composed with your other capability executors by explicit
capability routing.

The current import/export is synchronous Tools only. Do not promise Resources, Prompts, Tasks,
elicitation, notifications, A2A services, or durable external handles. Use the
[adapter exports](../../../packages/interoperability/mcp/src/index.ts) and
[imported Tool Agent test](../../../tests/conformance/mcp/imported-operation-agent-path.test.ts) for
exact assembly; the tests may use `/testing` because they are tests.

## Storage and service boundaries

`InMemoryRuntimeStore` and `FifoScheduler` are useful reference mechanisms, not production crash
recovery. `@arrokothi/storage-sqlite` implements the legacy Session surface and is not a drop-in
`RuntimeStore`. Keep durable business facts, idempotency records, and uncertain-outcome reconciliation
in your application storage. Recreating an Execution after a crash is a new run, not automatic replay
or recovery of in-flight Effects.

Your web/API boundary authenticates users and binds them to owned Execution IDs and confirmation
requests. Kernel Execution identity is not the application's user identity; do not expose the trusted
Harness entrypoints as unauthenticated HTTP endpoints.
