import { randomUUID } from "node:crypto";
import {
  ControllerRegistry, assertValidDefinition, createAgentController, createWorkflowController,
  definitionRef, jsonIssues,
} from "@arrokothi/core";
import type {
  ActivationRecord, AgentControllerOptions, ExecutionContext, ExecutionDefinition, ExecutionDefinitionRef,
  ExecutionHandle, ExecutionId, WorkflowControllerOptions,
} from "@arrokothi/core";
import { DefinitionVersionConflictError, emptyCapabilityCatalog } from "@arrokothi/core/ports";
import type { ModelProviderLookup } from "@arrokothi/core/ports";
import {
  InMemoryDefinitionStore, InMemoryRuntimeStore, ModelProviderRegistry,
  StaticModelResolver, createActiveOperationViewResolver, createAdapterRegistry,
  createFunctionStageRegistry, createReferenceAgentExecutor, createRuntimeOperationAuthoritySource,
  createStructuredMemoryReadViewResolver, createStructuredMemoryWriteViewResolver, createSystemClock,
} from "@arrokothi/core/reference";
import type { AuthenticatedCaller, ExecutionCoordinator, ExecutionView, InputAccepted, Receipt } from "@arrokothi/kernel";
import { ApplicationHost } from "./host.ts";
import {
  INPUT_KINDS, PROGRESS_CODEC, RUNTIME_CONTRACT_REVISION, START_CODES, UnrepresentableValueError, encode,
} from "./legacy-bridge/codec.ts";
import { LegacyDriver, RootExistsError } from "./legacy-bridge/driver.ts";
import { legacyHarnessView } from "./legacy-bridge/harness-view.ts";
import type { LegacyHarnessView } from "./legacy-bridge/harness-view.ts";
import { preflight } from "./preflight.ts";
import type { PreflightContext } from "./preflight.ts";
import { ApplicationConfigurationError, ApplicationInputError, ApplicationStartError } from "./types.ts";
import type {
  ApplicationConfirmation, ApplicationInput, ApplicationOptions, ApplicationServices, PreflightReport, StartExecutionInput,
} from "./types.ts";

/** The Kernel's cancellation decision. */
export type CancellationDecision = Extract<ReturnType<ExecutionCoordinator["cancelExecution"]>, { readonly ok: true }>["value"];

export interface StartedExecution extends ExecutionHandle {
  readonly preflight: PreflightReport;
  /** The Kernel creation receipt. The native delivery of the initial input is the first exchange's `ingress_result` Emission. */
  readonly receipt: Receipt;
  /** True when this call replayed an earlier creation with the same `creationKey` and content. */
  readonly replayed: boolean;
}

export interface RunOptions {
  /** Host waiting budget, checked between exchanges; never cancels external work. Default 30s. */
  readonly timeoutMs?: number;
  /** Kernel exchanges this call may dispatch before it returns `activation_limit`. */
  readonly maxActivations?: number;
  /** The longest idle wait between checks of the host limits and due timers. */
  readonly pollIntervalMs?: number;
  /** Stops this host wait, not the Execution. Use `Application.cancel` for cancellation. */
  readonly signal?: AbortSignal;
}

export interface RunResult {
  readonly reason: "completed" | "failed" | "cancelled" | "input_required" |
    "confirmation_required" | "user_input_required" | "timeout" | "activation_limit" | "aborted";
  /** @deprecated The native root's view: a diagnostic. `kernel` is authoritative. */
  readonly execution: ExecutionContext;
  /** The Kernel's view of the Execution. */
  readonly kernel: ExecutionView;
  /** Kernel exchanges this call dispatched. */
  readonly activations: number;
  /** May be a called child whose confirmation or input blocks this Execution. */
  readonly waitingExecutionId?: ExecutionId;
}

export interface Application {
  /** @deprecated Native diagnostics only. Readers pass through; mutators refuse by name. */
  readonly harness: LegacyHarnessView;
  readonly services: ApplicationServices;
  /** Same bytes are a no-op. Changed bytes at the same version are a conflict. */
  register(...definitions: readonly ExecutionDefinition[]): Promise<readonly ExecutionDefinitionRef[]>;
  preflight(input: StartExecutionInput): Promise<PreflightReport>;
  /** Creates the Execution through the Kernel, atomically with its initial input. */
  start(input: StartExecutionInput): Promise<StartedExecution>;
  /** The next conversation turn or other input, accepted by the Kernel. */
  input(executionId: string, input: ApplicationInput): Promise<InputAccepted>;
  /** A decision for a pending confirmation, accepted by the Kernel as input. */
  resolveConfirmation(executionId: string, decision: ApplicationConfirmation): Promise<InputAccepted>;
  /** Cancels the Execution through the Kernel; the native lineage is cancelled with it. */
  cancel(executionId: string): Promise<CancellationDecision>;
  /** The Kernel's view of the Execution: authoritative state, Emissions and result. */
  inspect(executionId: string): ExecutionView;
  /** @deprecated Dispatches until nothing is READY and no exchange is mid-step. Idle means no runnable Activation, not completion. */
  runUntilIdle(): Promise<readonly ActivationRecord[]>;
  /** Drives the Kernel until the Execution reaches a host boundary or a limit. */
  runUntilBlocked(executionId: ExecutionId, options?: RunOptions): Promise<RunResult>;
}

const HOST_CALLER: AuthenticatedCaller = Object.freeze({
  namespace: "arrokothi.sdk", scopes: Object.freeze(["application"]), cancelScopes: Object.freeze(["application"]),
});
/** The Driver's own caller, used only to report a protocol failure (D01-CHK-03). Never returned. */
const CONTROL_CALLER: AuthenticatedCaller = Object.freeze({
  namespace: "arrokothi.sdk", scopes: Object.freeze(["application"]), controlScopes: Object.freeze(["application"]),
});
const SCOPE = "application";
const KEY_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;
const NATIVE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const TERMINAL_REASONS = { COMPLETED: "completed", FAILED: "failed", CANCELLED: "cancelled" } as const;

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${name} must be a positive safe integer`);
  return value;
}

const configurationError = (code: string, path: string, message: string): ApplicationConfigurationError =>
  new ApplicationConfigurationError({ ok: false, diagnostics: [{ severity: "error", code, path, message }] });

const definitionRevision = (ref: ExecutionDefinitionRef): string =>
  new TextDecoder().decode(encode({ id: ref.id, version: ref.version, integrity: ref.integrity }, "definition revision"));

/**
 * Trusted-local bootstrap over the Kernel and the legacy bridge. Every start, input, confirmation,
 * cancellation and run reaches the Kernel; the 0.8.x Harness is the legacy Driver's native Runtime.
 * No provider, permission, memory binding, spawn credit, background worker, or durability claim is
 * implicit.
 */
export function createApplication(options: ApplicationOptions = {}): Application {
  if (options.runtime?.scheduler !== undefined) {
    throw configurationError("scheduler_owned_by_bridge", "runtime.scheduler", "Kernel dispatch and the legacy bridge's lineage scheduler own native scheduling; remove runtime.scheduler.");
  }
  const humanWaitDeadlineMs = options.humanWaitDeadlineMs;
  if (humanWaitDeadlineMs !== undefined && (!Number.isSafeInteger(humanWaitDeadlineMs) || humanWaitDeadlineMs <= 0)) {
    throw configurationError("invalid_wait_deadline", "humanWaitDeadlineMs", "Expected a positive safe integer number of milliseconds.");
  }
  const store = options.runtime?.store ?? new InMemoryRuntimeStore();
  const definitions = options.runtime?.definitions ?? new InMemoryDefinitionStore();
  const clock = options.runtime?.clock ?? createSystemClock();
  const catalog = options.capabilities?.catalog ?? emptyCapabilityCatalog;
  const providers = options.models && (Array.isArray(options.models.providers)
    ? new ModelProviderRegistry(options.models.providers)
    : options.models.providers as ModelProviderLookup);
  const staticResolver = options.models?.bindings && new StaticModelResolver(options.models.bindings);
  const resolver = staticResolver ?? options.models?.resolver;
  const models = resolver && providers ? { resolver, providers } : undefined;
  const now = () => clock.now().getTime();

  // The services object is built before the Driver so the controller hook sees the same object
  // the application exposes; its scheduler is the Driver's lineage scheduler.
  const partial: { -readonly [K in keyof ApplicationServices]: ApplicationServices[K] } = {
    store, definitions, scheduler: undefined as never, catalog, models,
  };
  const overrides = options.controllers?.(partial);
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
  const { scheduler: _scheduler, maxActivationsPerRun: _ignored, ...runtime } = options.runtime ?? {};
  let host: ApplicationHost | undefined;
  const driver = new LegacyDriver({
    native: {
      ...runtime,
      store, definitions, clock,
      controllers: new ControllerRegistry([createAgentController(agent), createWorkflowController(workflow)]),
      capabilityCatalog: catalog, capabilities: options.capabilities?.executor,
      authorizer: options.authorizer, confirmationPolicy: options.confirmationPolicy,
    },
    ids: options.runtime?.ids ?? { next: prefix => `${prefix}_${randomUUID()}` },
    now,
    ...(humanWaitDeadlineMs !== undefined ? { humanWaitDeadlineMs } : {}),
    onChange: report => host?.noteExchange(report),
  });
  partial.scheduler = driver.scheduler;
  const services: ApplicationServices = partial;
  const kernelHost = new ApplicationHost(driver, now, HOST_CALLER, CONTROL_CALLER);
  host = kernelHost;
  const harness = legacyHarnessView(driver.harness);
  const context: PreflightContext = { options, services, agent, workflow, staticResolver, overrides };

  // Registration writes the native definition store, which is not transactional; keep batches serial.
  let registering: Promise<unknown> = Promise.resolve();
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const result = registering.then(work);
    registering = result.catch(() => undefined);
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

  function capture(value: unknown, what: string): Uint8Array {
    try {
      return encode(value, what);
    } catch (cause) {
      if (cause instanceof UnrepresentableValueError) throw new ApplicationInputError("value_unrepresentable", cause.message, { issues: cause.issues });
      throw cause;
    }
  }

  function requireKey(key: string | undefined): string {
    if (key === undefined) return randomUUID();
    if (typeof key !== "string" || !KEY_PATTERN.test(key)) {
      throw new ApplicationInputError("invalid_request_key", "requestKey must have 1 to 64 characters from [A-Za-z0-9._:-]");
    }
    return key;
  }

  function submit(executionId: string, kind: string, payload: Uint8Array, requestKey: string): InputAccepted {
    const answer = kernelHost.coordinator.submitInput(kernelHost.caller, { destination: executionId, requestKey, kind, payload, subscriptionClass: kind });
    if (!answer.ok) throw new ApplicationInputError(answer.error.classification, answer.error.reason, { refusal: answer.error });
    if (kernelHost.knownState(executionId) !== "RUNNING") kernelHost.setKnown(executionId, "unknown");
    return answer.value;
  }

  async function runResult(executionId: string, reason: RunResult["reason"], activations: number, waitingExecutionId?: string): Promise<RunResult> {
    if (reason === "cancelled") await driver.cancellationSettled(executionId);
    const execution = await driver.harness.inspect(executionId as ExecutionId);
    if (!execution) throw new Error(`Unknown native Execution ${executionId}`);
    return {
      reason, execution, kernel: kernelHost.inspect(executionId), activations,
      ...(waitingExecutionId ? { waitingExecutionId: waitingExecutionId as ExecutionId } : {}),
    };
  }

  const application: Application = {
    harness, services,
    async register(...items) {
      // Snapshot first; caller mutation cannot change the registered bytes.
      const snapshots = items.map(d => structuredClone(assertValidDefinition(d)));
      return serial(async () => {
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
      const { executionDeadline: deadline, ...data } = input;
      const issues = jsonIssues(data, "start");
      if (issues.length) throw new ApplicationConfigurationError({ ok: false, diagnostics: issues.map(issue => ({ severity: "error", code: "invalid_start_data", path: issue.path, message: issue.message })) });
      if (deadline !== undefined && (!(deadline instanceof Date) || !Number.isSafeInteger(deadline.getTime()))) {
        throw configurationError("invalid_execution_deadline", "executionDeadline", "Expected a valid Date: an absolute instant on the runtime clock.");
      }
      if (data.creationKey !== undefined && (typeof data.creationKey !== "string" || !KEY_PATTERN.test(data.creationKey))) {
        throw configurationError("invalid_creation_key", "creationKey", "A creation key has 1 to 64 characters from [A-Za-z0-9._:-].");
      }
      const snapshot = structuredClone(data);
      kernelHost.pump();
      const report = await preflight(context, snapshot);
      if (!report.ok) throw new ApplicationConfigurationError(report);
      const ref = "kind" in snapshot.definition ? await serial(() => registerOne(snapshot.definition as ExecutionDefinition)) : snapshot.definition;
      const stored = await definitions.get(ref);
      if (!stored) throw configurationError("definition_missing", "definition", `No stored definition for ${ref.id}@${ref.version}.`);
      const params = {
        ...(snapshot.operationAuthority !== undefined ? { operationAuthority: snapshot.operationAuthority } : {}),
        ...(snapshot.structuralSpawnBudget !== undefined ? { structuralSpawnBudget: snapshot.structuralSpawnBudget } : {}),
        ...(snapshot.structuredMemory !== undefined ? { structuredMemory: snapshot.structuredMemory } : {}),
      };
      const authorityContext = capture(params, "creation parameters");
      const initial = capture({ input: snapshot.input ?? null }, "initial input");
      const creation = kernelHost.coordinator.createExecution(kernelHost.caller, {
        creationKey: snapshot.creationKey ?? randomUUID(), scope: SCOPE,
        definitionRevision: definitionRevision(ref), runtimeContractRevision: RUNTIME_CONTRACT_REVISION, progressCodec: PROGRESS_CODEC,
        authorityContext, initialInput: { kind: INPUT_KINDS.start, payload: initial },
        ...(deadline !== undefined ? { executionDeadline: deadline.getTime() } : {}),
      });
      if (!creation.ok) {
        throw new ApplicationStartError(creation.error.classification, creation.error.reason, { refusal: creation.error });
      }
      const { executionId, receipt, replayed } = creation.value;
      const handle: ExecutionHandle = {
        executionId: executionId as ExecutionId, kind: stored.kind, definition: ref, ownerExecutionId: null, rootExecutionId: executionId as ExecutionId,
      };
      if (replayed) {
        // An exact replay never fails or cancels E because of native state (owner choice A).
        await driver.rootSettled(executionId);
        kernelHost.setKnown(executionId, "unknown");
        return { ...handle, preflight: report, receipt, replayed };
      }
      kernelHost.setKnown(executionId, "READY");
      try {
        await driver.createRoot(executionId, { definition: ref, ...params });
      } catch (cause) {
        kernelHost.coordinator.cancelExecution(kernelHost.caller, executionId);
        kernelHost.setKnown(executionId, "unknown");
        const code = cause instanceof RootExistsError ? START_CODES.nativeRootExists : START_CODES.nativeCreationFailed;
        throw new ApplicationStartError(code, `${cause instanceof Error ? cause.message : String(cause)}; created Execution ${executionId} was cancelled.`, { executionId, cause });
      }
      return { ...handle, preflight: report, receipt, replayed };
    },
    async input(executionId, request) {
      if (typeof request !== "object" || request === null) throw new ApplicationInputError("invalid_input", "Expected an input object.");
      if (typeof request.label !== "string" || request.label.length === 0) throw new ApplicationInputError("invalid_input_label", "Input needs a non-empty label.");
      for (const key of ["correlationId", "causationId"] as const) {
        const value = request[key];
        if (value !== undefined && value !== null && typeof value !== "string") throw new ApplicationInputError("invalid_input_correlation", `${key} must be a string or null.`);
      }
      if (request.destination !== undefined && (typeof request.destination !== "string" || !NATIVE_ID_PATTERN.test(request.destination))) {
        throw new ApplicationInputError("invalid_destination", "destination must be a native Execution ID.");
      }
      const requestKey = requireKey(request.requestKey);
      let destination = request.destination;
      if (destination === undefined) {
        const waiting = driver.latestPauses(executionId).filter(pause => pause.kind === "input");
        if (waiting.length > 1) throw new ApplicationInputError("destination_required", `Several members of ${executionId} wait for input; name one as destination.`);
        destination = waiting[0]?.executionId ?? executionId;
      }
      const payload = capture({
        label: request.label, destination,
        ...(request.payload !== undefined ? { payload: request.payload } : {}),
        ...(request.correlationId !== undefined ? { correlationId: request.correlationId } : {}),
        ...(request.causationId !== undefined ? { causationId: request.causationId } : {}),
      }, "input");
      kernelHost.pump();
      return submit(executionId, INPUT_KINDS.input, payload, requestKey);
    },
    async resolveConfirmation(executionId, request) {
      if (typeof request !== "object" || request === null || typeof request.confirmationId !== "string" || request.confirmationId.length === 0) {
        throw new ApplicationInputError("invalid_confirmation", "A confirmation decision needs a confirmationId.");
      }
      if (request.decision !== "approve" && request.decision !== "decline") throw new ApplicationInputError("invalid_decision", "decision must be approve or decline.");
      const requestKey = requireKey(request.requestKey);
      const payload = capture({ confirmationId: request.confirmationId, decision: request.decision }, "confirmation");
      kernelHost.pump();
      return submit(executionId, INPUT_KINDS.confirmation, payload, requestKey);
    },
    async cancel(executionId) {
      kernelHost.pump();
      const answer = kernelHost.coordinator.cancelExecution(kernelHost.caller, executionId);
      if (!answer.ok) throw new ApplicationInputError(answer.error.classification, answer.error.reason, { refusal: answer.error });
      kernelHost.setKnown(executionId, answer.value.state);
      await driver.cancellationSettled(executionId);
      await driver.cascade(executionId);
      return answer.value;
    },
    inspect: executionId => kernelHost.inspect(executionId),
    runUntilIdle: () => kernelHost.runUntilIdle(),
    async runUntilBlocked(executionId, runOptions = {}) {
      const timeoutMs = runOptions.timeoutMs ?? 30_000;
      if (!Number.isFinite(timeoutMs) || timeoutMs < 0) throw new TypeError("timeoutMs must be finite and nonnegative");
      const maxActivations = positiveInteger(runOptions.maxActivations ?? 1000, "maxActivations");
      const pollIntervalMs = positiveInteger(runOptions.pollIntervalMs ?? 10, "pollIntervalMs");
      const started = performance.now();
      let activations = 0;
      for (;;) {
        kernelHost.pump();
        if (runOptions.signal?.aborted) return runResult(executionId, "aborted", activations);
        const state = kernelHost.state(executionId);
        if (state === "COMPLETED" || state === "FAILED" || state === "CANCELLED") return runResult(executionId, TERMINAL_REASONS[state], activations);
        if (state === "WAITING") {
          // The reason comes only from the latest accepted pause Emission (D01-CHK-10).
          const [first] = driver.latestPauses(executionId);
          return runResult(executionId, first?.kind === "confirmation" ? "confirmation_required" : "input_required", activations, first?.executionId ?? executionId);
        }
        const elapsed = performance.now() - started;
        if (elapsed >= timeoutMs) return runResult(executionId, "timeout", activations);
        if (state === "READY" && activations >= maxActivations) return runResult(executionId, "activation_limit", activations);
        activations += kernelHost.dispatchReady(Math.max(0, maxActivations - activations));
        if (kernelHost.knownState(executionId) === "READY") continue;
        await kernelHost.idle(Math.min(pollIntervalMs, Math.max(0, timeoutMs - elapsed)), runOptions.signal);
      }
    },
  };
  return application;
}
