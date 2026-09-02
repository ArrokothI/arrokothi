/**
 * Dependency-free reference implementations of kernel ports.
 *
 * These exist so the semantics can be executed and tested with no database, network, provider, or
 * sandbox. They are replaceable: a durable store, a distributed queue, or a real clock must satisfy
 * the same ports and pass the same contract suites. Reference behaviour is never the definition of
 * a semantic - if a conformance test does not require it, it is an implementation detail.
 */

export { createDeterministicIds, createFixedClock, createSystemClock } from "./deterministic.ts";
export { InMemoryDefinitionStore } from "./in-memory-definition-store.ts";
export { InMemoryRuntimeStore } from "./in-memory-runtime-store.ts";
export { FifoScheduler } from "./fifo-scheduler.ts";
export { createAllowListAuthorizer } from "./allow-list-authorizer.ts";
export type {
  AllowListAuthorizerOptions,
  CapabilityGrantRule,
  MemoryGrantRule,
  MessageGrantRule,
  SpawnGrantRule,
} from "./allow-list-authorizer.ts";
export { createCapabilityConfirmationPolicy } from "./confirmation-policy.ts";
export type {
  CapabilityConfirmationPolicyOptions,
  CapabilityConfirmationRule,
} from "./confirmation-policy.ts";
export { createCapabilityCatalog } from "./capability-catalog.ts";
export type { CapabilityOperationDescriptorInput } from "./capability-catalog.ts";
export {
  createRuntimeOperationAuthoritySource,
  createStaticOperationAuthoritySource,
} from "./operation-authority.ts";
export { createActiveOperationViewResolver } from "./active-operation-view-resolver.ts";
export type { ActiveOperationViewResolverOptions } from "./active-operation-view-resolver.ts";
export { createReferenceAgentExecutor } from "./agent-executor.ts";
export type { ReferenceAgentExecutorOptions } from "./agent-executor.ts";
export { createNoInlineWaitBudget, createTimeoutInlineBudget } from "./inline-wait.ts";
export { createDeferredCapabilityExecutor, createScriptedCapabilityExecutor } from "./scripted-capability-executor.ts";
export type {
  DeferredCapabilityCall,
  DeferredCapabilityExecutor,
  RecordedCapabilityCall,
  RecordingCapabilityExecutor,
  ScriptedCapabilityExecutorOptions,
  ScriptedCapabilityHandler,
} from "./scripted-capability-executor.ts";

export { createFunctionStageRegistry, createAdapterRegistry } from "./workflow-registries.ts";
export type { AdapterHandler, FunctionStageHandler } from "./workflow-registries.ts";
export { createLocalResourceEnvironment } from "./local-resource-environment.ts";

export { StaticModelResolver, portableModelFeatures } from "./static-model-resolver.ts";
export type { StaticModelMapping } from "./static-model-resolver.ts";
export { ModelProviderRegistry } from "./model-provider-registry.ts";
export { ScriptedModelProvider } from "./scripted-model-provider.ts";
export { createDeferredModelProvider } from "./deferred-model-provider.ts";
export type { DeferredModelCall, DeferredModelProvider } from "./deferred-model-provider.ts";
export type {
  ScriptedModelProviderOptions,
  ScriptedModelStep,
} from "./scripted-model-provider.ts";
