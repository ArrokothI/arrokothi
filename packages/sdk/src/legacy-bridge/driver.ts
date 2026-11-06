/**
 * The legacy Driver (K1.4 design 01, as changed by design 02).
 *
 * The 0.8.x `Harness` is this Driver's native Runtime: a managed native job. Each Kernel Execution
 * E owns one native lineage whose root has the ID E. The Kernel sees only this Driver's public
 * protocol: `deliver` queues the Activation and returns `undefined`; the Driver's own task forwards
 * the batch, steps the lineage, classifies it (`classify.ts`) and submits one Outcome.
 *
 * This is the only module in `packages/sdk/src` that constructs a `Harness` (K14-3).
 *
 * Termination rule (D01-CHK-01): once E is terminal, or a cancellation request for E arrived, the
 * Driver starts no native work for E and ends the lineage. The `ended` flag is set synchronously
 * by `requestCancellation` and by the Driver before any Outcome that ends E, and every task checks
 * it before each forward and around each native step.
 */

import { Harness } from "@arrokothi/core";
import type {
  ActivationRecord, CreateExecutionInput, ExecutionContext, ExecutionHandle, ExecutionId, HarnessOptions,
} from "@arrokothi/core";
import type { IdGenerator } from "@arrokothi/core/ports";
import type {
  Activation, ActivationEvent, AuthenticatedCaller, DeliverySettlement, EmissionProposal, ExecutionCoordinator,
  ExecutionDriver, OutcomeEnvelope, OutcomeNext, SubmissionGrant, WaitDeclaration,
} from "@arrokothi/kernel";
import { classifyLineage, isTerminalLifecycle } from "./classify.ts";
import type { LineageDecision, LineageRecords, MemberRecords } from "./classify.ts";
import {
  EMISSION_KINDS, FAILURE_CODES, INPUT_KINDS, ProtocolShapeError, TIMEOUT_KIND, UnrepresentableValueError,
  encode, failureValue, readConfirmationPayload, readInputPayload, readProgress, readStartPayload,
} from "./codec.ts";
import type { BridgeProgress, IngressResult, Pause, PauseDeadline } from "./codec.ts";
import { LineageScheduler, lineageWorker } from "./lineage-scheduler.ts";
import { RootIdentityScope } from "./root-ids.ts";

type CancellationRequest = Parameters<NonNullable<ExecutionDriver["requestCancellation"]>>[0];

const EMISSIONS_PER_OUTCOME = 256;
const MAX_DIAGNOSTIC = 1_024;
const CANCEL_REASON = "arrokothi.bridge: the Kernel Execution ended";

/** What the host learns after each exchange: an accepted Outcome's next state, or a loss. */
export interface ExchangeReport {
  readonly executionId: string;
  readonly activationId: string;
  readonly accepted: boolean;
  /** The accepted Outcome's next Kernel state; `null` when the Outcome was not accepted. */
  readonly nextState: string | null;
}

export interface LegacyDriverOptions {
  /** The native Runtime's options, without the scheduler and ID generator the Driver supplies. */
  readonly native: Omit<HarnessOptions, "scheduler" | "ids">;
  readonly ids: IdGenerator;
  /** The Kernel clock reading, for wait deadlines. */
  readonly now: () => number;
  readonly humanWaitDeadlineMs?: number;
  /** Called after each exchange's Outcome is submitted, and when a task's busy state changes. */
  readonly onChange: (report: ExchangeReport | null) => void;
}

export class RootExistsError extends Error {
  constructor(executionId: string) {
    super(`a native Execution ${executionId} already exists; creation keys are application-global for one coordinator lifetime`);
    this.name = "RootExistsError";
  }
}

const bounded = (cause: unknown): string => {
  const text = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
  return text.length > MAX_DIAGNOSTIC ? text.slice(0, MAX_DIAGNOSTIC) : text;
};

const pauseId = (pause: Pause, transitions: number): string =>
  pause.kind === "confirmation" ? `confirmation:${pause.confirmationId}` : `input:${pause.executionId}:${transitions}`;

export class LegacyDriver implements ExecutionDriver {
  readonly driverId = "arrokothi.legacy-bridge";
  readonly harness: Harness;
  readonly scheduler: LineageScheduler;
  private readonly roots: RootIdentityScope;
  private readonly options: LegacyDriverOptions;
  private coordinator: ExecutionCoordinator | undefined;
  private hostCaller: AuthenticatedCaller | undefined;
  private controlCaller: AuthenticatedCaller | undefined;
  private readonly ended = new Set<string>();
  private readonly creating = new Map<string, Promise<unknown>>();
  private readonly cancelling = new Map<string, Promise<void>>();
  private readonly tasks = new Set<string>();
  private readonly lastPauses = new Map<string, readonly Pause[]>();
  private readonly stepListeners = new Set<(record: ActivationRecord) => void>();
  private busyCount = 0;

  constructor(options: LegacyDriverOptions) {
    this.options = options;
    this.scheduler = new LineageScheduler(options.native.store);
    this.roots = new RootIdentityScope(options.ids);
    this.harness = new Harness({ ...options.native, scheduler: this.scheduler, ids: this.roots });
  }

  /** Binds the coordinator this Driver serves (the Kernel takes the Driver at construction). */
  attach(coordinator: ExecutionCoordinator, hostCaller: AuthenticatedCaller, controlCaller: AuthenticatedCaller): void {
    if (this.coordinator) throw new Error("the legacy Driver is already attached");
    this.coordinator = coordinator;
    this.hostCaller = hostCaller;
    this.controlCaller = controlCaller;
  }

  /** Tasks currently forwarding or stepping, as opposed to parked waiting for native work. */
  get busy(): number {
    return this.busyCount;
  }

  /** The pauses of E's latest accepted `await` Outcome. */
  latestPauses(executionId: string): readonly Pause[] {
    return this.lastPauses.get(executionId) ?? [];
  }

  /** Observes each native step; returns the unsubscribe function. */
  onStep(listener: (record: ActivationRecord) => void): () => void {
    this.stepListeners.add(listener);
    return () => this.stepListeners.delete(listener);
  }

  // -- Native root creation (owner choice A) ----------------------------------

  /**
   * Creates E's native root after the Kernel accepted E's creation. A failure here is the caller's
   * to answer (`start` cancels E). A cancellation that arrived meanwhile ends the new root at once.
   */
  async createRoot(executionId: string, input: CreateExecutionInput): Promise<ExecutionHandle> {
    const creation = (async () => {
      if (await this.options.native.store.readExecution(executionId as ExecutionId)) throw new RootExistsError(executionId);
      return this.roots.withRoot(executionId, () => this.harness.createExecution(input));
    })();
    this.creating.set(executionId, creation.catch(() => undefined));
    try {
      const handle = await creation;
      if (handle.executionId !== executionId) throw new Error(`native root ${handle.executionId} does not carry the Kernel ID ${executionId}`);
      if (this.ended.has(executionId)) await this.cascade(executionId);
      return handle;
    } finally {
      this.creating.delete(executionId);
    }
  }

  /** Resolves once any in-progress root creation for E settled, whatever its result. */
  async rootSettled(executionId: string): Promise<void> {
    await this.creating.get(executionId);
  }

  // -- The Kernel's Driver protocol --------------------------------------------

  deliver(activation: Activation, settlement: DeliverySettlement, submission: SubmissionGrant): undefined {
    settlement.delivered();
    // A redelivered Activation is forwarded once, keyed by its ID (HOST-01).
    if (this.tasks.has(activation.activationId)) return undefined;
    this.tasks.add(activation.activationId);
    // Counted busy before the task starts, so a host never sees an idle gap after a dispatch.
    this.busyCount += 1;
    queueMicrotask(() => {
      void this.exchange(activation, submission).finally(() => this.tasks.delete(activation.activationId));
    });
    return undefined;
  }

  requestCancellation(request: CancellationRequest): undefined {
    this.ended.add(request.executionId);
    this.scheduler.wake(request.executionId);
    this.cancelling.set(request.executionId, this.cascade(request.executionId).catch(() => undefined));
    return undefined;
  }

  /** Resolves once the cascade a cancellation request started for E has finished. */
  async cancellationSettled(executionId: string): Promise<void> {
    await this.cancelling.get(executionId);
  }

  /** Whether the Driver has stopped native work for E. */
  hasEnded(executionId: string): boolean {
    return this.ended.has(executionId);
  }

  /** Cancels every non-terminal member of E's native lineage, descendants first. */
  async cascade(executionId: string): Promise<void> {
    const members = await this.lineageIds(executionId);
    for (const id of members.reverse()) {
      const context = await this.harness.inspect(id as ExecutionId);
      if (context && !isTerminalLifecycle(context.lifecycle)) {
        await this.harness.cancelExecution({ executionId: id as ExecutionId, reason: CANCEL_REASON });
      }
    }
  }

  // -- One exchange --------------------------------------------------------------

  private setBusy(delta: 1 | -1): void {
    this.busyCount += delta;
    this.options.onChange(null);
  }

  private async exchange(activation: Activation, grant: SubmissionGrant): Promise<void> {
    const executionId = activation.executionId;
    try {
      await this.rootSettled(executionId);
      if (this.ended.has(executionId)) return void await this.cascade(executionId);
      let progress: BridgeProgress;
      try {
        progress = readProgress(activation.acceptedProgress, executionId);
      } catch (cause) {
        return this.endWith(activation, grant, null, [], FAILURE_CODES.nativeError, bounded(cause));
      }
      if (!(await this.harness.inspect(executionId as ExecutionId))) {
        return this.endWith(activation, grant, progress, [], FAILURE_CODES.nativeSessionMissing, `native root ${executionId} is missing`);
      }

      const results: IngressResult[] = [];
      const timeout = activation.events.find(event => event.sourceCategory === "kernel_timeout");
      if (timeout) {
        for (const event of activation.events) {
          if (event.sourceCategory !== "kernel_timeout") results.push({ eventId: event.eventId, kind: event.kind, status: "discarded" });
        }
        return this.endWith(activation, grant, progress, results, FAILURE_CODES.waitDeadlineExpired, `wait deadline ${timeout.deadline} expired`);
      }
      for (const event of activation.events) {
        if (this.ended.has(executionId)) return void await this.cascade(executionId);
        const result = await this.forward(executionId, event);
        if (result === null) continue;
        results.push(result);
        if (event.kind === INPUT_KINDS.start && result.status === "rejected") {
          return this.endWith(activation, grant, progress, results, FAILURE_CODES.initialInputRejected, result.detail ?? "initial input rejected");
        }
      }

      const carry = (await this.harness.emissionsOf(executionId as ExecutionId)).length > progress.emissionCursor;
      let decision: LineageDecision;
      if (carry) {
        decision = await this.classify(executionId);
      } else {
        const stepped = await this.step(executionId);
        if (stepped === null) return void await this.cascade(executionId);
        decision = stepped;
      }
      await this.submit(activation, grant, progress, results, decision);
    } catch (cause) {
      const code = cause instanceof UnrepresentableValueError ? FAILURE_CODES.valueUnrepresentable : FAILURE_CODES.nativeError;
      await this.endWith(activation, grant, null, [], code, bounded(cause)).catch(() => undefined);
    } finally {
      this.setBusy(-1);
    }
  }

  /**
   * Runs native steps until the lineage reaches a decision the Kernel can record. Returns `null`
   * when E ended meanwhile. An `open` lineage parks the task until its lineage gets work.
   */
  private async step(executionId: string): Promise<LineageDecision | null> {
    let stepped = false;
    for (;;) {
      if (this.ended.has(executionId)) return null;
      const record = await this.harness.runOnce(lineageWorker(executionId));
      if (record) {
        stepped = true;
        for (const listener of this.stepListeners) listener(record);
      }
      if (this.ended.has(executionId)) return null;
      const work = this.scheduler.nextWork(executionId);
      const decision = await this.classify(executionId);
      if (decision.kind !== "open" && (stepped || decision.kind !== "continue")) return decision;
      if (decision.kind === "continue" && this.scheduler.hasQueued(executionId)) continue;
      this.setBusy(-1);
      await work;
      this.setBusy(1);
    }
  }

  /** Forwards one Event natively; `null` when there was nothing to forward (a start with no input). */
  private async forward(executionId: string, event: ActivationEvent): Promise<IngressResult | null> {
    const base = { eventId: event.eventId, kind: event.kind };
    if (event.sourceCategory !== "application_input") return { ...base, status: "ignored" };
    try {
      if (event.kind === INPUT_KINDS.start) {
        const input = readStartPayload(event.payload);
        if (input === null) return null;
        return { ...base, ...receiptFields(await this.harness.deliverExternalInput({ ...nativeInput(input), destination: executionId as ExecutionId })) };
      }
      if (event.kind === INPUT_KINDS.input) {
        const input = readInputPayload(event.payload);
        const destination = input.destination ?? executionId;
        if (!(await this.inLineage(executionId, destination))) {
          return { ...base, status: "rejected", reason: "destination_outside_lineage", detail: `${destination} is not in ${executionId}'s native lineage` };
        }
        return { ...base, ...receiptFields(await this.harness.deliverExternalInput({ ...nativeInput(input), destination: destination as ExecutionId })) };
      }
      if (event.kind === INPUT_KINDS.confirmation) {
        const decision = readConfirmationPayload(event.payload);
        const request = await this.harness.confirmationRequest(decision.confirmationId);
        if (!request || !(await this.inLineage(executionId, request.executionId))) {
          return { ...base, status: "rejected", reason: "confirmation_outside_lineage", detail: `${decision.confirmationId} is not a confirmation of ${executionId}'s native lineage` };
        }
        const receipt = await this.harness.resolveConfirmation(decision);
        return { ...base, status: receipt.status, ...("reason" in receipt && typeof receipt.reason === "string" ? { reason: receipt.reason } : {}) };
      }
      return { ...base, status: "rejected", reason: "unknown_kind" };
    } catch (cause) {
      if (cause instanceof ProtocolShapeError) return { ...base, status: "rejected", reason: "malformed_payload", detail: cause.message };
      throw cause;
    }
  }

  private async classify(executionId: string): Promise<LineageDecision> {
    return classifyLineage(await this.lineage(executionId));
  }

  private async lineageIds(rootExecutionId: string): Promise<string[]> {
    const ids: string[] = [];
    const queue = [rootExecutionId];
    const seen = new Set<string>();
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
      for (const link of await this.harness.childExecutionLinksOf(id as ExecutionId)) queue.push(link.childExecutionId);
    }
    return ids;
  }

  private async inLineage(rootExecutionId: string, executionId: string): Promise<boolean> {
    const context = await this.harness.inspect(executionId as ExecutionId);
    return context !== undefined && context.rootExecutionId === rootExecutionId;
  }

  private async lineage(rootExecutionId: string): Promise<LineageRecords> {
    const members = new Map<string, MemberRecords>();
    for (const id of await this.lineageIds(rootExecutionId)) {
      const executionId = id as ExecutionId;
      const context = await this.harness.inspect(executionId);
      if (!context) continue;
      members.set(id, {
        context,
        pendingOperations: await this.harness.pendingOperationsOf(executionId),
        confirmations: await this.harness.confirmationRequestsOf(executionId),
        resumptions: await this.harness.controllerResumptionsOf(executionId),
        children: await this.harness.childExecutionLinksOf(executionId),
      });
    }
    return { rootExecutionId, members };
  }

  // -- Outcomes ------------------------------------------------------------------

  private async submit(
    activation: Activation, grant: SubmissionGrant, progress: BridgeProgress, results: readonly IngressResult[], decision: LineageDecision,
  ): Promise<void> {
    const executionId = activation.executionId;
    const root = (await this.harness.inspect(executionId as ExecutionId)) as ExecutionContext;
    const fixed: EmissionProposal[] = [];
    if (results.length > 0) fixed.push(this.ingressEmission(activation, results));
    const native = (await this.harness.emissionsOf(executionId as ExecutionId)).slice(progress.emissionCursor);
    const room = EMISSIONS_PER_OUTCOME - fixed.length - (decision.kind === "await" ? 1 : 0);
    const fits = native.length <= room;
    const chunk = fits ? native : native.slice(0, EMISSIONS_PER_OUTCOME - fixed.length);
    const emissions = [...fixed];
    let next: OutcomeNext = { step: "continue" };
    let pauses: readonly PauseDeadline[] = progress.pauses;
    // A terminal or await decision is submitted only when the whole carry fits (EMIT-01); until
    // then the Outcome is `continue`, and the next exchange carries the rest before any step.
    if (fits && decision.kind === "complete") {
      next = { step: "complete", result: encode(root.terminalResult, "terminal result") };
      await this.cascadeDescendants(executionId);
    } else if (fits && (decision.kind === "fail" || decision.kind === "native_cancelled")) {
      const failure = decision.kind === "fail" && root.failure
        ? failureValue(root.failure)
        : { code: FAILURE_CODES.nativeCancelled, message: "the native root was cancelled without a Kernel cancellation" };
      next = { step: "fail", error: encode(failure, "failure") };
      await this.cascadeDescendants(executionId);
    } else if (fits && decision.kind === "await") {
      const declared = await this.declareWait(decision.pauses, progress);
      pauses = declared.pauses;
      next = { step: "await", wait: declared.wait };
      emissions.push({ emissionKey: `bridge.pause.${activation.activationId}`, value: encode({ kind: EMISSION_KINDS.pause, pauses: decision.pauses as unknown[] }, "pause Emission") });
    }
    for (const emission of chunk) {
      emissions.push({ emissionKey: `native.${emission.emissionId}`, value: encode({ kind: EMISSION_KINDS.native, emission }, `native Emission ${emission.emissionId}`) });
    }
    const advanced = { ...progress, emissionCursor: progress.emissionCursor + chunk.length, pauses };
    const accepted = this.offer(activation, grant, advanced, emissions, next);
    // The latest accepted pause Emission is the host's only source for reasons and the default
    // input destination (D01-CHK-10); any other accepted Outcome supersedes it.
    if (accepted && decision.kind === "await" && next.step === "await") this.lastPauses.set(executionId, decision.pauses);
    else if (accepted) this.lastPauses.delete(executionId);
  }

  private async declareWait(pauses: readonly Pause[], progress: BridgeProgress): Promise<{ wait: WaitDeclaration; pauses: PauseDeadline[] }> {
    const stored = new Map(progress.pauses.map(pause => [pause.id, pause.deadline]));
    const now = this.options.now();
    const out: PauseDeadline[] = [];
    let earliest: number | null = null;
    for (const pause of pauses) {
      const transitions = pause.kind === "input" ? (await this.harness.transitionsOf(pause.executionId as ExecutionId)).length : 0;
      const id = pauseId(pause, transitions);
      if (out.some(existing => existing.id === id)) continue;
      const deadline = stored.has(id) ? stored.get(id)! : this.options.humanWaitDeadlineMs === undefined ? null : now + this.options.humanWaitDeadlineMs;
      out.push({ id, deadline });
      if (deadline !== null && (earliest === null || deadline < earliest)) earliest = deadline;
    }
    const classes = new Set<string>();
    for (const pause of pauses) classes.add(pause.kind === "confirmation" ? INPUT_KINDS.confirmation : INPUT_KINDS.input);
    const wait: WaitDeclaration = {
      subscriptions: [...classes].sort().map(subscriptionClass => ({ subscriptionClass })),
      ...(earliest === null ? {} : { deadline: earliest }),
    };
    return { wait, pauses: out };
  }

  private ingressEmission(activation: Activation, results: readonly IngressResult[]): EmissionProposal {
    return {
      emissionKey: `bridge.ingress.${activation.activationId}`,
      value: encode({ kind: EMISSION_KINDS.ingress, results: results as unknown[] }, "ingress result"),
    };
  }

  /** Ends E with a Driver-originated failure: the lineage is cancelled first (D01-CHK-01). */
  private async endWith(
    activation: Activation, grant: SubmissionGrant, progress: BridgeProgress | null, results: readonly IngressResult[], code: string, message: string,
  ): Promise<void> {
    const state = progress ?? { v: 1 as const, root: activation.executionId, emissionCursor: 0, pauses: [] };
    return this.finish(activation, grant, state, results, { step: "fail", error: encode({ code, message }, "failure") });
  }

  private async finish(
    activation: Activation, grant: SubmissionGrant, progress: BridgeProgress, results: readonly IngressResult[], next: OutcomeNext,
  ): Promise<void> {
    this.ended.add(activation.executionId);
    await this.cascade(activation.executionId);
    let emissions: EmissionProposal[] = [];
    try {
      if (results.length > 0) emissions = [this.ingressEmission(activation, results)];
    } catch {
      emissions = [];
    }
    this.offer(activation, grant, progress, emissions, next);
  }

  private async cascadeDescendants(executionId: string): Promise<void> {
    this.ended.add(executionId);
    const members = await this.lineageIds(executionId);
    for (const id of members.slice(1).reverse()) {
      const context = await this.harness.inspect(id as ExecutionId);
      if (context && !isTerminalLifecycle(context.lifecycle)) await this.harness.cancelExecution({ executionId: id as ExecutionId, reason: CANCEL_REASON });
    }
  }

  /** Submits one Outcome. A refusal that is not a lost race becomes a protocol-failure hold (D01-CHK-03). */
  private offer(activation: Activation, grant: SubmissionGrant, progress: BridgeProgress, emissions: readonly EmissionProposal[], next: OutcomeNext): boolean {
    const coordinator = this.coordinator!;
    const envelope: OutcomeEnvelope = {
      executionId: activation.executionId,
      activationId: activation.activationId,
      writerEpoch: activation.writerEpoch,
      baseProgressRevision: activation.baseProgressRevision,
      progress: encode(progress, "progress"),
      ...(emissions.length > 0 ? { emissions } : {}),
      next,
    };
    const answer = coordinator.submitOutcome(this.hostCaller!, envelope, grant);
    if (answer.ok) {
      this.options.onChange({ executionId: activation.executionId, activationId: activation.activationId, accepted: true, nextState: answer.value.nextState });
      return true;
    }
    // A cancellation accepted first wins (CX-6): the losing Outcome changes nothing. Any other
    // refusal is a protocol defect, held where an operator can see it.
    if (!isCancellationLoss(coordinator, this.hostCaller!, activation.executionId)) {
      coordinator.reportProtocolFailure(this.controlCaller!, activation.executionId, {
        activationId: activation.activationId,
        writerEpoch: activation.writerEpoch,
        diagnostic: `the Kernel refused the legacy Driver's ${next.step} Outcome: ${answer.error.classification}: ${answer.error.reason}`,
      });
    }
    this.options.onChange({ executionId: activation.executionId, activationId: activation.activationId, accepted: false, nextState: null });
    return false;
  }
}

const isCancellationLoss = (coordinator: ExecutionCoordinator, caller: AuthenticatedCaller, executionId: string): boolean => {
  const view = coordinator.inspect(caller, executionId);
  return view.ok && view.value.state === "CANCELLED";
};

const nativeInput = (input: { readonly label: string; readonly payload?: unknown; readonly correlationId?: string | null; readonly causationId?: string | null }) => ({
  label: input.label,
  ...(input.payload !== undefined ? { payload: input.payload as never } : {}),
  ...(input.correlationId !== undefined ? { correlationId: input.correlationId } : {}),
  ...(input.causationId !== undefined ? { causationId: input.causationId } : {}),
});

const receiptFields = (receipt: { readonly status: string; readonly reason?: string; readonly detail?: string }): Omit<IngressResult, "eventId" | "kind"> => ({
  status: receipt.status,
  ...(receipt.reason !== undefined ? { reason: receipt.reason } : {}),
  ...(receipt.detail !== undefined ? { detail: receipt.detail } : {}),
});
