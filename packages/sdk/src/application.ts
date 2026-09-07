import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import {
  ControllerRegistry, Harness, assertValidDefinition, createAgentController, createWorkflowController,
  definitionRef, jsonIssues,
} from "@arrokothi/core";
import type {
  AgentControllerOptions, ExecutionContext, ExecutionDefinition, ExecutionDefinitionRef,
  ExecutionHandle, ExecutionId, EventDeliveryReceipt, WorkflowControllerOptions,
} from "@arrokothi/core";
import { DefinitionVersionConflictError, emptyCapabilityCatalog } from "@arrokothi/core/ports";
import type { ModelProviderLookup } from "@arrokothi/core/ports";
import {
  FifoScheduler, InMemoryDefinitionStore, InMemoryRuntimeStore, ModelProviderRegistry,
  StaticModelResolver, createActiveOperationViewResolver, createAdapterRegistry,
  createFunctionStageRegistry, createReferenceAgentExecutor, createRuntimeOperationAuthoritySource,
  createStructuredMemoryReadViewResolver, createStructuredMemoryWriteViewResolver, createSystemClock,
} from "@arrokothi/core/reference";
import { preflight } from "./preflight.ts";
import type { PreflightContext } from "./preflight.ts";
import { ApplicationConfigurationError } from "./types.ts";
import type { ApplicationOptions, ApplicationServices, PreflightReport, StartExecutionInput } from "./types.ts";

export interface StartedExecution extends ExecutionHandle {
  readonly preflight: PreflightReport;
  readonly inputReceipt?: EventDeliveryReceipt;
}

export interface RunOptions {
  /** Host waiting budget, checked between Activations; never cancels external work. Default 30s. */
  readonly timeoutMs?: number;
  readonly maxActivations?: number;
  readonly pollIntervalMs?: number;
  /** Stops this host wait, not the Execution. Use Harness.cancelExecution for cancellation. */
  readonly signal?: AbortSignal;
}

export interface RunResult {
  readonly reason: "completed" | "failed" | "cancelled" | "input_required" |
    "confirmation_required" | "user_input_required" | "timeout" | "activation_limit" | "aborted";
  readonly execution: ExecutionContext;
  readonly activations: number;
  /** May be a called child whose confirmation/input is blocking this Execution. */
  readonly waitingExecutionId?: ExecutionId;
}

export interface Application {
  /** Full kernel diagnostics and trusted ingress/confirmation/cancellation remain available. */
  readonly harness: Harness;
  readonly services: ApplicationServices;
  /** Same bytes are a no-op. Changed bytes at the same version are a conflict. */
  register(...definitions: readonly ExecutionDefinition[]): Promise<readonly ExecutionDefinitionRef[]>;
  preflight(input: StartExecutionInput): Promise<PreflightReport>;
  start(input: StartExecutionInput): Promise<StartedExecution>;
  /** One shared scheduler pass. Idle means no runnable Activation, not completion. */
  runUntilIdle(): ReturnType<Harness["runUntilIdle"]>;
  /** Drives the shared Harness, including children, until a meaningful host boundary or limit. */
  runUntilBlocked(executionId: ExecutionId, options?: RunOptions): Promise<RunResult>;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${name} must be a positive safe integer`);
  return value;
}

/**
 * Trusted-local bootstrap over the existing kernel. No provider, permission, memory binding,
 * spawn credit, background worker, second runtime, or durability claim is implicit.
 */
export function createApplication(options: ApplicationOptions = {}): Application {
  const store = options.runtime?.store ?? new InMemoryRuntimeStore();
  const definitions = options.runtime?.definitions ?? new InMemoryDefinitionStore();
  const scheduler = options.runtime?.scheduler ?? new FifoScheduler();
  const catalog = options.capabilities?.catalog ?? emptyCapabilityCatalog;
  const providers = options.models && (Array.isArray(options.models.providers)
    ? new ModelProviderRegistry(options.models.providers)
    : options.models.providers as ModelProviderLookup);
  const staticResolver = options.models?.bindings && new StaticModelResolver(options.models.bindings);
  const resolver = staticResolver ?? options.models?.resolver;
  const models = resolver && providers ? { resolver, providers } : undefined;
  const services: ApplicationServices = { store, definitions, scheduler, catalog, models };
  const overrides = options.controllers?.(services);
  const agent: AgentControllerOptions = {
    ...(models ? { models: { resolver: models.resolver }, executor: createReferenceAgentExecutor({ providers: models.providers }) } : {}),
    views: createActiveOperationViewResolver({ catalog, authority: createRuntimeOperationAuthoritySource(store) }),
    ...(options.memory?.read !== undefined ? { structuredMemoryReadView: createStructuredMemoryReadViewResolver({ store, grants: options.memory.read, executions: options.memory.executions }) } : {}),
    ...(options.memory?.writeExposure !== undefined ? { structuredMemoryWriteView: createStructuredMemoryWriteViewResolver({ store, grants: options.memory.writeExposure, executions: options.memory.executions }) } : {}),
    ...overrides?.agent,
  };
  const workflow: WorkflowControllerOptions = {
    functions: createFunctionStageRegistry(options.functions ?? {}),
    adapters: createAdapterRegistry(options.adapters ?? {}),
    ...(models ? { models } : {}),
    ...overrides?.workflow,
  };
  const harness = new Harness({
    ...options.runtime,
    store, definitions, scheduler,
    clock: options.runtime?.clock ?? createSystemClock(),
    ids: options.runtime?.ids ?? { next: prefix => `${prefix}_${randomUUID()}` },
    controllers: new ControllerRegistry([createAgentController(agent), createWorkflowController(workflow)]),
    capabilityCatalog: catalog, capabilities: options.capabilities?.executor,
    authorizer: options.authorizer, confirmationPolicy: options.confirmationPolicy,
  });
  const context: PreflightContext = { options, services, agent, workflow, staticResolver, overrides };
  // Serialize SDK creation/input with each Activation. Direct Harness workers are an advanced host
  // responsibility: do not run them concurrently with an SDK start's create-and-deliver sequence.
  let tail: Promise<unknown> = Promise.resolve();
  function exclusive<T>(work: () => Promise<T>): Promise<T> {
    const result = tail.then(work);
    tail = result.catch(() => undefined);
    return result;
  }
  async function registerOne(definition: ExecutionDefinition): Promise<ExecutionDefinitionRef> {
    const validated = assertValidDefinition(definition);
    const ref = definitionRef(validated);
    const existing = await definitions.getVersion(validated.id, validated.version);
    if (existing) {
      if (definitionRef(existing).integrity !== ref.integrity) throw new DefinitionVersionConflictError(ref.id, ref.version);
      return ref;
    }
    return definitions.save(validated);
  }

  async function hostBoundary(id: ExecutionId, visited = new Set<ExecutionId>()): Promise<Pick<RunResult, "reason" | "waitingExecutionId"> | undefined> {
    if (visited.has(id)) return undefined;
    visited.add(id);
    const execution = await harness.inspect(id);
    if (!execution) throw new Error(`Unknown Execution ${id}`);
    if (execution.lifecycle === "COMPLETED") return { reason: "completed" };
    if (execution.lifecycle === "FAILED") return { reason: "failed" };
    if (execution.lifecycle === "CANCELLED") return { reason: "cancelled" };
    // Only yield human waits after a runnable Activation has had a chance to consume prior input.
    if (execution.lifecycle !== "WAITING") return undefined;
    if ((await harness.confirmationRequestsOf(id)).some(r => r.state === "pending")) return { reason: "confirmation_required", waitingExecutionId: id };
    if ((await harness.userInputRequestsOf(id)).some(r => r.state === "open")) return { reason: "user_input_required", waitingExecutionId: id };
    if (execution.waitingFor?.kind === "event" && execution.waitingFor.wake.eventKinds.includes("external.input")) return { reason: "input_required", waitingExecutionId: id };
    // Required call dependencies only: a detached child must not block its parent host request.
    for (const link of await harness.childExecutionLinksOf(id)) {
      if (link.state !== "active" || link.pendingOperationId === null) continue;
      const boundary = await hostBoundary(link.childExecutionId, visited);
      if (boundary?.waitingExecutionId) return boundary;
    }
    return undefined;
  }

  const application: Application = {
    harness, services,
    async register(...items) {
      // Snapshot before waiting for the SDK lock; caller mutation cannot change the registered bytes.
      const snapshots = items.map(d => structuredClone(assertValidDefinition(d)));
      return exclusive(async () => {
        // Validate the whole batch for conflicts before the first write (stores are not transactional).
        const batch = new Map<string, string>();
        for (const d of snapshots) {
          const ref = definitionRef(d);
          const key = JSON.stringify([d.id, d.version]);
          const existing = await definitions.getVersion(d.id, d.version);
          if ((batch.has(key) && batch.get(key) !== ref.integrity) || (existing && definitionRef(existing).integrity !== ref.integrity)) throw new DefinitionVersionConflictError(d.id, d.version);
          batch.set(key, ref.integrity);
        }
        const refs: ExecutionDefinitionRef[] = [];
        for (const d of snapshots) refs.push(await registerOne(d));
        return refs;
      });
    },
    preflight: input => preflight(context, input),
    async start(input) {
      const issues = jsonIssues(input, "start");
      if (issues.length) throw new ApplicationConfigurationError({ ok: false, diagnostics: issues.map(issue => ({ severity: "error", code: "invalid_start_data", path: issue.path, message: issue.message })) });
      const snapshot = structuredClone(input);
      return exclusive(async () => {
        const report = await preflight(context, snapshot);
        if (!report.ok) throw new ApplicationConfigurationError(report);
        const ref = "kind" in snapshot.definition ? await registerOne(snapshot.definition) : snapshot.definition;
        const { definition: _definition, input: initialInput, ...creation } = snapshot;
        const handle = await harness.createExecution({ ...creation, definition: ref });
        const receipt = initialInput && await harness.deliverExternalInput({ ...initialInput, destination: handle.executionId });
        if (receipt?.status === "rejected") {
          await harness.cancelExecution({ executionId: handle.executionId, reason: "SDK initial input rejected" });
          throw new ApplicationConfigurationError({ ok: false, diagnostics: [{ severity: "error", code: "initial_input_rejected", path: "input", message: `${receipt.detail}; created Execution ${handle.executionId} was cancelled.` }] });
        }
        return { ...handle, preflight: report, ...(receipt ? { inputReceipt: receipt } : {}) };
      });
    },
    runUntilIdle: () => exclusive(() => harness.runUntilIdle()),
    async runUntilBlocked(executionId, runOptions = {}) {
      const timeoutMs = runOptions.timeoutMs ?? 30_000;
      if (!Number.isFinite(timeoutMs) || timeoutMs < 0) throw new TypeError("timeoutMs must be finite and nonnegative");
      const maxActivations = positiveInteger(runOptions.maxActivations ?? 1000, "maxActivations");
      const pollIntervalMs = positiveInteger(runOptions.pollIntervalMs ?? 10, "pollIntervalMs");
      const started = performance.now();
      let activations = 0;
      async function result(reason: RunResult["reason"], waitingExecutionId?: ExecutionId): Promise<RunResult> {
        const execution = await harness.inspect(executionId);
        if (!execution) throw new Error(`Unknown Execution ${executionId}`);
        return { reason, execution, activations, ...(waitingExecutionId ? { waitingExecutionId } : {}) };
      }
      for (;;) {
        if (runOptions.signal?.aborted) return result("aborted");
        const boundary = await hostBoundary(executionId);
        if (boundary) return result(boundary.reason, boundary.waitingExecutionId);
        if (performance.now() - started >= timeoutMs) return result("timeout");
        if (activations >= maxActivations) return result("activation_limit");
        const record = await exclusive(() => harness.runOnce());
        if (record) { activations++; continue; }
        try {
          await delay(Math.min(pollIntervalMs, Math.max(0, timeoutMs - (performance.now() - started))), undefined, { signal: runOptions.signal });
        } catch (cause) {
          if (runOptions.signal?.aborted) return result("aborted");
          throw cause;
        }
      }
    },
  };
  return application;
}
