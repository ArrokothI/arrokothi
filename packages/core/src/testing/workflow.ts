/**
 * Deterministic wiring for Workflow conformance.
 *
 * Workflow semantics need more collaborators than the Slice-A/B substrate did - a Function Stage
 * registry, an Adapter registry, model access, a local resource environment - and a conformance test
 * should spend its words on semantics rather than on construction. These helpers assemble exactly
 * that, over the dependency-free reference components, with no clock, no timer, and no network.
 *
 * The trace recorder is the other half. Provider and model identity are things a run may legitimately
 * *observe*; they are not Workflow control state and never enter it. Recording them here is how a
 * portability test can assert that the same definition resolved to a different deployment while the
 * definition, its digest, and its persisted progress stayed identical.
 */

import { createWorkflowController } from "../controllers/workflow/controller.ts";
import type {
  WorkflowModelAccess,
  WorkflowModelInvocation,
  WorkflowStageTransitionRecord,
  WorkflowTrace,
} from "../controllers/workflow/model-access.ts";
import type { AdapterRegistry } from "../ports/adapter.ts";
import type { ExecutionController } from "../ports/controller.ts";
import type { LocalResourceEnvironment } from "../ports/local-resource.ts";
import type { ModelProvider, ModelProviderLookup } from "../ports/model-provider.ts";
import type { ModelResolver } from "../ports/model-resolver.ts";
import type { FunctionStageRegistry } from "../ports/stage.ts";
import { ModelProviderRegistry } from "../reference/model-provider-registry.ts";
import { createTestHarness } from "./execution-harness.ts";
import type { TestHarnessBundle, TestHarnessOptions } from "./execution-harness.ts";

/** A trace sink that keeps what it was told, and does nothing else. */
export interface RecordingWorkflowTrace extends WorkflowTrace {
  readonly modelInvocations: readonly WorkflowModelInvocation[];
  readonly transitions: readonly WorkflowStageTransitionRecord[];
  /** `provider/model` for each invocation, which is the usual portability assertion. */
  deployments(): readonly string[];
}

export function recordingWorkflowTrace(): RecordingWorkflowTrace {
  const modelInvocations: WorkflowModelInvocation[] = [];
  const transitions: WorkflowStageTransitionRecord[] = [];
  return {
    modelInvocations,
    transitions,
    modelInvoked(record) {
      modelInvocations.push(record);
    },
    stageTransitioned(record) {
      transitions.push(record);
    },
    deployments() {
      return modelInvocations.map((invocation) => `${invocation.provider}/${invocation.model}`);
    },
  };
}

/** Assembles model access from a resolver plus one or more providers. */
export function modelAccess(resolver: ModelResolver, providers: readonly ModelProvider[]): WorkflowModelAccess {
  const registry: ModelProviderLookup = new ModelProviderRegistry(providers);
  return { resolver, providers: registry };
}

export interface WorkflowTestHarnessOptions extends Omit<TestHarnessOptions, "controllers"> {
  readonly functions?: FunctionStageRegistry;
  readonly adapters?: AdapterRegistry;
  readonly models?: WorkflowModelAccess;
  readonly resources?: LocalResourceEnvironment;
  readonly trace?: WorkflowTrace;
  readonly maxTransitions?: number;
  /** Extra controllers to register beside the WorkflowController - e.g. an Agent controller for an Agent Stage child. */
  readonly extraControllers?: readonly ExecutionController[];
}

export interface WorkflowTestHarnessBundle extends TestHarnessBundle {
  readonly trace: RecordingWorkflowTrace;
}

/**
 * One Harness running the real `WorkflowController`.
 *
 * Note what is *not* passed to the controller: the store, the scheduler, the authorizer, the
 * capability executor. Those go to the Harness. The controller receives only local semantic
 * dependencies, which is the boundary the whole slice is about.
 */
export function createWorkflowTestHarness(options: WorkflowTestHarnessOptions = {}): WorkflowTestHarnessBundle {
  const trace = (options.trace as RecordingWorkflowTrace | undefined) ?? recordingWorkflowTrace();
  const controller = createWorkflowController({
    ...(options.functions !== undefined ? { functions: options.functions } : {}),
    ...(options.adapters !== undefined ? { adapters: options.adapters } : {}),
    ...(options.models !== undefined ? { models: options.models } : {}),
    ...(options.resources !== undefined ? { resources: options.resources } : {}),
    trace,
    ...(options.maxTransitions !== undefined ? { maxTransitions: options.maxTransitions } : {}),
  });
  const bundle = createTestHarness({
    controllers: [controller, ...(options.extraControllers ?? [])],
    ...(options.activationBudget !== undefined ? { activationBudget: options.activationBudget } : {}),
    ...(options.maxActivationsPerRun !== undefined ? { maxActivationsPerRun: options.maxActivationsPerRun } : {}),
    ...(options.authorizer !== undefined ? { authorizer: options.authorizer } : {}),
    ...(options.confirmationPolicy !== undefined ? { confirmationPolicy: options.confirmationPolicy } : {}),
    ...(options.capabilityCatalog !== undefined ? { capabilityCatalog: options.capabilityCatalog } : {}),
    ...(options.capabilities !== undefined ? { capabilities: options.capabilities } : {}),
    ...(options.inlineWait !== undefined ? { inlineWait: options.inlineWait } : {}),
    ...(options.defaultEffectDeadlineMs !== undefined ? { defaultEffectDeadlineMs: options.defaultEffectDeadlineMs } : {}),
  });
  return { ...bundle, trace };
}
