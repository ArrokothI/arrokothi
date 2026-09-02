/**
 * Deterministic wiring for Agent conformance.
 *
 * Agent semantics need more collaborators than the substrate did - a capability catalog carrying
 * descriptive metadata, a runtime-owned authority ceiling, an exposure resolver, model resolution,
 * an executor - and a conformance test should spend its words on semantics rather than on
 * construction. These helpers assemble exactly that over the dependency-free reference components,
 * with no clock, no timer, and no network.
 *
 * Note which side of the boundary each collaborator lands on. The exposure resolver, model
 * resolution, and the executor go to the *controller*; policy, the capability implementation, and
 * the store go to the *Harness*. That split is what most of these tests are about, so the helper
 * must not quietly hand a controller something the architecture forbids. The resolver reads the
 * ceiling through the narrow read-only authority port over the same store the Harness writes it
 * into - which is why the store is constructed here first and handed to both.
 *
 * The trace recorder is the other half: which deployment answered a step, and which projection it
 * was shown, are legitimate things to observe and are deliberately not Agent control state.
 */

import { createAgentController } from "../controllers/agent/controller.ts";
import type { AgentInformationCompiler } from "../controllers/agent/information.ts";
import type {
  AgentModelAccess,
  AgentModelInvocation,
  AgentActionProposalRecord,
  AgentTrace,
} from "../controllers/agent/model-access.ts";
import type { AgentObservationProjector } from "../agent/observation-projection.ts";
import type { ExecutionDefinitionRef } from "../definitions/ids.ts";
import type { ExecutionId } from "../execution/ids.ts";
import type { StructuredMemoryBinding } from "../execution/structured-memory.ts";
import type { OperationRef } from "../operations/refs.ts";
import type { ActiveOperationViewResolver } from "../ports/active-operation-view.ts";
import type { StructuredMemoryReadViewResolver } from "../ports/structured-memory-read-view.ts";
import type { ActiveStructuredMemoryWriteViewResolver } from "../ports/active-structured-memory-write-view.ts";
import type { AgentExecutor } from "../ports/agent-executor.ts";
import type { CapabilityCatalog } from "../ports/capability-catalog.ts";
import { emptyCapabilityCatalog } from "../ports/capability-catalog.ts";
import type { ModelProvider, ModelProviderLookup } from "../ports/model-provider.ts";
import type { ModelResolver } from "../ports/model-resolver.ts";
import { createActiveOperationViewResolver } from "../reference/active-operation-view-resolver.ts";
import { createReferenceAgentExecutor } from "../reference/agent-executor.ts";
import { InMemoryRuntimeStore } from "../reference/in-memory-runtime-store.ts";
import { ModelProviderRegistry } from "../reference/model-provider-registry.ts";
import { createRuntimeOperationAuthoritySource } from "../reference/operation-authority.ts";
import type { StructuredMemoryReadGrantRule } from "../reference/structured-memory-read-view-resolver.ts";
import { createStructuredMemoryReadViewResolver } from "../reference/structured-memory-read-view-resolver.ts";
import type { StructuredMemoryWriteExposureGrantRule } from "../reference/structured-memory-write-view-resolver.ts";
import { createStructuredMemoryWriteViewResolver } from "../reference/structured-memory-write-view-resolver.ts";
import { createTestHarness } from "./execution-harness.ts";
import type { TestHarnessBundle, TestHarnessOptions } from "./execution-harness.ts";

/** A trace sink that keeps what it was told, and does nothing else. */
export interface RecordingAgentTrace extends AgentTrace {
  readonly modelInvocations: readonly AgentModelInvocation[];
  readonly proposals: readonly AgentActionProposalRecord[];
  /** `provider/model` for each step, which is the usual portability assertion. */
  deployments(): readonly string[];
  /** The projection identity each step was shown, which is the usual snapshot assertion. */
  projections(): readonly string[];
  /** The information-selection identity each step saw, for reproducibility assertions. */
  informationSelections(): readonly string[];
}

export function recordingAgentTrace(): RecordingAgentTrace {
  const modelInvocations: AgentModelInvocation[] = [];
  const proposals: AgentActionProposalRecord[] = [];
  return {
    modelInvocations,
    proposals,
    modelInvoked(record) {
      modelInvocations.push(record);
    },
    actionProposed(record) {
      proposals.push(record);
    },
    deployments() {
      return modelInvocations.map((invocation) => `${invocation.provider}/${invocation.model}`);
    },
    projections() {
      return modelInvocations.map((invocation) => invocation.projectionId);
    },
    informationSelections() {
      return modelInvocations.map((invocation) => invocation.informationSelectionId);
    },
  };
}

/** Assembles Agent model resolution. There is no provider here: invoking one is the executor's job. */
export function agentModelAccess(resolver: ModelResolver): AgentModelAccess {
  return { resolver };
}

/** Assembles the reference executor over one or more providers. */
export function referenceAgentExecutor(providers: readonly ModelProvider[]): AgentExecutor {
  const registry: ModelProviderLookup = new ModelProviderRegistry(providers);
  return createReferenceAgentExecutor({ providers: registry });
}

export interface AgentTestHarnessOptions extends Omit<TestHarnessOptions, "controllers" | "store"> {
  /** Descriptive operation truth. The exposure resolver reads it; it grants nothing. */
  readonly catalog?: CapabilityCatalog;
  /** Replaces the store-backed exposure resolver, for tests that drive exposure directly. */
  readonly views?: ActiveOperationViewResolver;
  readonly models?: AgentModelAccess;
  readonly executor?: AgentExecutor;
  /** Replaces the reference observation projector, for tests that compare rendering strategies. */
  readonly observations?: AgentObservationProjector;
  /** Replaces the reference information compiler, for tests that compare selection strategies. */
  readonly information?: AgentInformationCompiler;
  /**
   * Reuses a store the caller already built.
   *
   * The exposure resolver and the Effect gateway must read the same runtime-owned authority, so a
   * case that models a ceiling changing underneath a projection needs to own that store.
   */
  readonly store?: InMemoryRuntimeStore;
  readonly taskScope?: readonly string[];
  readonly trace?: AgentTrace;
  /**
   * The Structured Memory read resolver handed to the `AgentController`.
   *
   * Held by the controller the way the exposure resolver is - a narrow read-only port, not runtime
   * state. Omitting it (and `memoryReadGrants`) means the fail-closed default: no Structured Memory
   * reaches the model even for an Agent that authored a read request.
   */
  readonly structuredMemoryReadView?: StructuredMemoryReadViewResolver;
  /**
   * Convenience: builds the reference read resolver against the shared store with these grants.
   *
   * Deny-by-default like the real thing. Independent of `authorizer`: this grants reads, never
   * `WriteMemory`. A test that needs a custom resolver passes `structuredMemoryReadView` instead.
   */
  readonly memoryReadGrants?: StructuredMemoryReadGrantRule;
  /** Replaces the reference write-exposure resolver. It exposes metadata only, never values. */
  readonly structuredMemoryWriteView?: ActiveStructuredMemoryWriteViewResolver;
  /** Convenience: builds the reference write-exposure resolver against the shared store. */
  readonly memoryWriteExposureGrants?: StructuredMemoryWriteExposureGrantRule;
}

export interface CreateTestAgentInput {
  readonly definition: ExecutionDefinitionRef;
  /**
   * The root operation grant, supplied at creation by the application.
   *
   * Omitting it creates an Execution with no ceiling, which exposes nothing - the fail-closed case
   * a conformance run needs to be able to produce deliberately.
   */
  readonly authority?: readonly OperationRef[];
  /** One Execution-local Structured Memory binding. Grants no authority - reads and writes are separate. */
  readonly memory?: StructuredMemoryBinding;
}

export interface AgentTestHarnessBundle extends TestHarnessBundle {
  readonly trace: RecordingAgentTrace;
  readonly catalog: CapabilityCatalog;
  createAgent(input: CreateTestAgentInput): Promise<{ readonly executionId: ExecutionId }>;
}

/**
 * One Harness running the real `AgentController`.
 *
 * Note what is *not* passed to the controller: the store, the scheduler, policy, the capability
 * implementation. Those go to the Harness.
 */
export function createAgentTestHarness(options: AgentTestHarnessOptions = {}): AgentTestHarnessBundle {
  const trace = (options.trace as RecordingAgentTrace | undefined) ?? recordingAgentTrace();
  const catalog = options.catalog ?? options.capabilityCatalog ?? emptyCapabilityCatalog;
  const store = options.store ?? new InMemoryRuntimeStore();

  const views =
    options.views ??
    createActiveOperationViewResolver({
      authority: createRuntimeOperationAuthoritySource(store),
      catalog,
    });

  const structuredMemoryReadView =
    options.structuredMemoryReadView ??
    (options.memoryReadGrants !== undefined
      ? createStructuredMemoryReadViewResolver({ store, grants: options.memoryReadGrants })
      : undefined);

  const structuredMemoryWriteView =
    options.structuredMemoryWriteView ??
    (options.memoryWriteExposureGrants !== undefined
      ? createStructuredMemoryWriteViewResolver({ store, grants: options.memoryWriteExposureGrants })
      : undefined);

  const controller = createAgentController({
    views,
    ...(options.models !== undefined ? { models: options.models } : {}),
    ...(options.executor !== undefined ? { executor: options.executor } : {}),
    ...(options.observations !== undefined ? { observations: options.observations } : {}),
    ...(options.information !== undefined ? { information: options.information } : {}),
    ...(structuredMemoryReadView !== undefined ? { structuredMemoryReadView } : {}),
    ...(structuredMemoryWriteView !== undefined ? { structuredMemoryWriteView } : {}),
    ...(options.taskScope !== undefined ? { taskScope: options.taskScope } : {}),
    trace,
  });

  const bundle = createTestHarness({
    controllers: [controller],
    store,
    capabilityCatalog: options.capabilityCatalog ?? catalog,
    ...(options.activationBudget !== undefined ? { activationBudget: options.activationBudget } : {}),
    ...(options.maxActivationsPerRun !== undefined ? { maxActivationsPerRun: options.maxActivationsPerRun } : {}),
    ...(options.authorizer !== undefined ? { authorizer: options.authorizer } : {}),
    ...(options.confirmationPolicy !== undefined ? { confirmationPolicy: options.confirmationPolicy } : {}),
    ...(options.capabilities !== undefined ? { capabilities: options.capabilities } : {}),
    ...(options.inlineWait !== undefined ? { inlineWait: options.inlineWait } : {}),
    ...(options.defaultEffectDeadlineMs !== undefined ? { defaultEffectDeadlineMs: options.defaultEffectDeadlineMs } : {}),
  });

  return {
    ...bundle,
    trace,
    catalog,
    async createAgent(input: CreateTestAgentInput) {
      const handle = await bundle.harness.createExecution({
        definition: input.definition,
        ...(input.authority !== undefined ? { operationAuthority: { operations: [...input.authority] } } : {}),
        ...(input.memory !== undefined ? { structuredMemory: input.memory } : {}),
      });
      return { executionId: handle.executionId };
    },
  };
}
