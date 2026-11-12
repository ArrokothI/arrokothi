/**
 * The legacy Driver (K1.4 design 01, as changed by designs 02 and 03).
 *
 * The 0.8.x `Harness` is this Driver's native Runtime: a managed native job. Each Kernel Execution
 * E owns one native lineage whose root has the ID E. The Kernel sees only this Driver's public
 * protocol: `deliver` queues the Activation and returns `undefined`; the Driver's own task forwards
 * the batch, steps the lineage, classifies it (`classify.ts`) and submits one Outcome.
 *
 * This is the only module in `packages/sdk/src` that constructs a `Harness` (K14-3).
 *
 * Observation (design 03 §2): the lineage is read as a projection, and an `await` is committed only
 * when two consecutive collects are structurally equal, so it describes one instant of the store.
 * The native Runtime writes through a facade that signals the lineage after every transaction, and an
 * exchange registers for that signal before it reads, so no committed change is missed.
 *
 * Accounting (design 03 §4, owner choice 04): each exchange's `BatchLedger` gives every Event of
 * its batch exactly one `ingress_result` entry, on every exit, and is the only source of them.
 *
 * Termination (D01-CHK-01, design 03 §5; 017 L-36): once E is terminal, or a cancellation request
 * for E arrived, the sticky `ended` flag is set. The Driver then starts no further native step for E
 * and requests native cancellation of every non-terminal lineage member (`endLineage`, `cascade`).
 * A request does not prove an ended member. A READY or WAITING member ends at once. A RUNNING member
 * answers `cancellation_pending`, which only its own step applies; if that step fails, the member stays
 * RUNNING with the request pending, and the Driver starts no later step (017 L-36).
 *
 * An exchange that ends E requests cancellation before it closes the ledger and offers the Outcome: in
 * `submit` for a native terminal decision, through `terminate` for every other ending exit.
 * `requestCancellation` sets the flag synchronously and requests too. It swallows a rejected request,
 * and `app.cancel` then requests again (`cancel.application`).
 *
 * Only `terminate` turns a rejected request into a protocol hold. A rejection inside an exchange
 * reaches it directly, or through the exchange's `exception` exit, which requests once more; if
 * `terminate`'s request rejects, it reports the hold through the Kernel alone, with no native read,
 * scheduling or cascade on that path (design 04 §6, D04-CHK-02). The Kernel accepts that hold only for
 * E's unresolved Activation while E is not terminal, so no hold follows a Kernel cancellation. Outside
 * an exchange, a rejection at `cancel.root-created` fails `start`, which cancels E, and one at
 * `cancel.application` rejects `app.cancel`.
 *
 * Scheduling (design 04 §2, §6 D04-CHK-01): committed READY is the fact and a queue entry only a hint.
 * Whenever the lineage's decision is `continue`, the Driver schedules every READY member itself.
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
import { classifyLineage, isTerminalLifecycle, projectMember, sameObservation } from "./classify.ts";
import type { LineageDecision, LineageRecords, MemberRecords } from "./classify.ts";
import {
  EMISSION_KINDS, FAILURE_CODES, INPUT_KINDS, ProtocolShapeError, UnrepresentableValueError,
  encode, failureValue, readConfirmationPayload, readInputPayload, readProgress, readStartPayload,
} from "./codec.ts";
import type { BridgeProgress, IngressResult, Pause, PauseDeadline } from "./codec.ts";
import { CommitSignallingStore } from "./commit-signal-store.ts";
import { BatchLedger, INGRESS_REASONS, INGRESS_STATUS } from "./ledger.ts";
import { lineageWorker } from "./lineage-scheduler.ts";
import type { LineageScheduler } from "./lineage-scheduler.ts";
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
  /** The lineage scheduler, built before the controller hook runs (design 03 R1-04). */
  readonly scheduler: LineageScheduler;
  readonly ids: IdGenerator;
  /** The Kernel clock reading, for wait deadlines. */
  readonly now: () => number;
  readonly humanWaitDeadlineMs?: number;
  /** Called after each exchange's Outcome is submitted, and when a task's busy state changes. */
  readonly onChange: (report: ExchangeReport | null) => void;
}

/**
 * Named observation points (design 03 addendum, D03-CHK-03). `gate` returns `undefined` in
 * production, so no point adds an `await`; tests replace it on the prototype to hold a point.
 */
export type GatePoint =
  | "register.before" | "register.after" | "read.before" | "read.after" | "validated"
  | "submit.before" | "submit.after" | "park" | "signal";

export interface GateDetail {
  /** Which collect of this observation (1, 2, ...). */
  readonly collect?: number;
  /** The read's position within its collect, from 1. */
  readonly ordinal?: number;
  readonly record?: "context" | "operations" | "confirmations" | "resumptions" | "children";
  readonly member?: string;
}

/**
 * One label per call site that requests the end of a lineage (design 04 §3.1). B-TERM-CENSUS derives
 * the call sites from the source and requires this tuple, the labels used and B-TERM-ORACLE's table to
 * agree.
 */
export const TERMINATE_SITES = Object.freeze([
  "cancel.request", "cancel.root-created", "cancel.exchange-start", "cancel.forward-loop", "cancel.step-ended", "cancel.application",
  "progress", "root-missing", "timeout", "forward", "initial-input", "exception",
  "complete", "fail", "native-cancelled", "hold",
] as const);

export type TerminateSite = (typeof TERMINATE_SITES)[number];

/**
 * A member the store reports READY at a revision where the Driver already scheduled it and saw it
 * claimed without an Activation: the store broke atomic visibility (design 04 §2.8, D04-CHK-01).
 * Revision -1 names the lineage instead: a `continue` with nothing queued after reconciliation.
 */
export class UnschedulableReadyError extends Error {
  readonly member: string;
  readonly revision: number;
  constructor(member: string, revision: number) {
    super(revision < 0
      ? `lineage ${member} reported a READY member but has nothing queued after reconciliation`
      : `native member ${member} stays READY at revision ${revision} after a claim that ran no Activation`);
    this.name = "UnschedulableReadyError";
    this.member = member;
    this.revision = revision;
  }
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

const failure = (code: string, message: string): OutcomeNext => ({ step: "fail", error: encode({ code, message }, "failure") });

const pauseId = (pause: Pause, transitions: number): string =>
  pause.kind === "confirmation" ? `confirmation:${pause.confirmationId}` : `input:${pause.executionId}:${transitions}`;

type Disposition = Omit<IngressResult, "eventId" | "kind">;

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
  /** Per Execution, Events attempted in an exchange whose acknowledging Outcome was not accepted. */
  private readonly attempted = new Map<string, Set<string>>();
  private readonly stepListeners = new Set<(record: ActivationRecord) => void>();
  /** Member -> the revision at which the Driver scheduled it and its claim count then (D04-CHK-01). */
  private readonly scheduled = new Map<string, { readonly revision: number; readonly claims: number }>();
  private busyCount = 0;

  constructor(options: LegacyDriverOptions) {
    this.options = options;
    this.scheduler = options.scheduler;
    this.roots = new RootIdentityScope(options.ids);
    const store = new CommitSignallingStore(options.native.store, scope => this.signalled(scope));
    this.harness = new Harness({ ...options.native, store, scheduler: this.scheduler, ids: this.roots });
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

  /** A named observation point; production holds nothing (D03-CHK-03). */
  gate(_point: GatePoint, _executionId: string, _detail?: GateDetail): Promise<void> | undefined {
    return undefined;
  }

  /** Reads the accepted progress (a malformed value is a Kernel or Driver defect). */
  progressOf(activation: Activation): BridgeProgress {
    return readProgress(activation.acceptedProgress, activation.executionId);
  }

  /**
   * Requests native cancellation of E's lineage from `site` (`cascade`); B-TERM-ABLATION removes one
   * site at a time. Fulfilment means every request was made, not that every member ended (017 L-36).
   */
  endLineage(executionId: string, _site: TerminateSite): Promise<void> {
    return this.cascade(executionId);
  }

  // -- Native root creation (owner choice A) ----------------------------------

  /**
   * Creates E's native root after the Kernel accepted E's creation. A failure here is the caller's
   * to answer (`start` cancels E). A cancellation that arrived meanwhile requests the new root's
   * cancellation at once (`cancel.root-created`).
   */
  async createRoot(executionId: string, input: CreateExecutionInput): Promise<ExecutionHandle> {
    this.scheduler.learn(executionId, executionId);
    const creation = (async () => {
      if (await this.options.native.store.readExecution(executionId as ExecutionId)) throw new RootExistsError(executionId);
      return this.roots.withRoot(executionId, () => this.harness.createExecution(input));
    })();
    this.creating.set(executionId, creation.catch(() => undefined));
    try {
      const handle = await creation;
      if (handle.executionId !== executionId) throw new Error(`native root ${handle.executionId} does not carry the Kernel ID ${executionId}`);
      if (this.ended.has(executionId)) await this.endLineage(executionId, "cancel.root-created");
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

  /**
   * Sets E's sticky `ended` flag synchronously and requests native cancellation of its lineage
   * (`cancel.request`). A rejected request is swallowed: no hold follows it, and `app.cancel` requests
   * again (`cancel.application`).
   */
  requestCancellation(request: CancellationRequest): undefined {
    this.ended.add(request.executionId);
    this.scheduler.wake(request.executionId);
    this.cancelling.set(request.executionId, this.endLineage(request.executionId, "cancel.request").catch(() => undefined));
    return undefined;
  }

  /** Resolves once the cascade a cancellation request started for E has finished. */
  async cancellationSettled(executionId: string): Promise<void> {
    await this.cancelling.get(executionId);
  }

  /** Whether E's sticky `ended` flag is set: the Driver starts no further native step for E (017 L-36). */
  hasEnded(executionId: string): boolean {
    return this.ended.has(executionId);
  }

  /**
   * Calls native `cancelExecution` for every non-terminal member of E's lineage, descendants first. A
   * READY or WAITING member ends at once. A RUNNING member answers `cancellation_pending`, which this
   * does not check: only that member's own step applies it (017 L-36). A rejected read or call rejects.
   */
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

  /** A native transaction scoped to `scope` settled: wake its lineage (D03-CHK-01). Never throws. */
  private signalled(scope: string): void {
    const held = this.gate("signal", scope);
    if (held) void held.then(() => this.scheduler.signal(scope), () => this.scheduler.signal(scope));
    else this.scheduler.signal(scope);
  }

  private attemptedOf(executionId: string): Set<string> {
    let ids = this.attempted.get(executionId);
    if (!ids) this.attempted.set(executionId, ids = new Set());
    return ids;
  }

  private async exchange(activation: Activation, grant: SubmissionGrant): Promise<void> {
    const executionId = activation.executionId;
    const ledger = new BatchLedger(activation.events);
    let progress: BridgeProgress | null = null;
    try {
      await this.rootSettled(executionId);
      if (this.ended.has(executionId)) return void await this.endLineage(executionId, "cancel.exchange-start");
      try {
        progress = this.progressOf(activation);
      } catch (cause) {
        return await this.terminate(activation, grant, ledger, null, failure(FAILURE_CODES.nativeError, bounded(cause)), "progress");
      }
      if (!(await this.harness.inspect(executionId as ExecutionId))) {
        return await this.terminate(activation, grant, ledger, progress,
          failure(FAILURE_CODES.nativeSessionMissing, `native root ${executionId} is missing`), "root-missing");
      }

      const timeout = activation.events.find(event => event.sourceCategory === "kernel_timeout");
      if (timeout) {
        activation.events.forEach((event, index) => {
          if (event.sourceCategory === "kernel_timeout") ledger.record(index, { status: INGRESS_STATUS.ignored, reason: INGRESS_REASONS.kernelTimeout });
        });
        return await this.terminate(activation, grant, ledger, progress,
          failure(FAILURE_CODES.waitDeadlineExpired, `wait deadline ${timeout.deadline} expired`), "timeout");
      }
      const attempted = this.attemptedOf(executionId);
      for (const [index, event] of activation.events.entries()) {
        if (this.ended.has(executionId)) return void await this.endLineage(executionId, "cancel.forward-loop");
        if (ledger.isEmpty(index)) continue;
        // An Event a refused Outcome left attempted is never forwarded a second time (D03-CHK-02).
        if (attempted.has(event.eventId)) {
          ledger.unknown(index, INGRESS_REASONS.alreadyAttempted);
          continue;
        }
        ledger.attempting(index);
        attempted.add(event.eventId);
        let disposition: Disposition;
        try {
          disposition = await this.forward(executionId, event);
        } catch (cause) {
          // The native delivery may or may not have committed (owner choice 04).
          const detail = bounded(cause);
          ledger.unknown(index, INGRESS_REASONS.forwardFailed, detail);
          return await this.terminate(activation, grant, ledger, progress, failure(FAILURE_CODES.nativeError, detail), "forward");
        }
        ledger.record(index, disposition);
        if (event.kind === INPUT_KINDS.start && disposition.status === "rejected") {
          return await this.terminate(activation, grant, ledger, progress,
            failure(FAILURE_CODES.initialInputRejected, disposition.detail ?? "initial input rejected"), "initial-input");
        }
      }

      const carry = (await this.harness.emissionsOf(executionId as ExecutionId)).length > progress.emissionCursor;
      let decision: LineageDecision;
      if (carry) {
        decision = await this.observe(executionId);
      } else {
        const stepped = await this.step(executionId);
        if (stepped === null) return void await this.endLineage(executionId, "cancel.step-ended");
        decision = stepped;
      }
      await this.submit(activation, grant, progress, ledger, decision);
    } catch (cause) {
      const code = cause instanceof UnrepresentableValueError ? FAILURE_CODES.valueUnrepresentable : FAILURE_CODES.nativeError;
      try {
        await this.terminate(activation, grant, ledger, progress, failure(code, bounded(cause)), "exception");
      } catch (last) {
        // The last report needs only the Kernel (D04-CHK-02).
        this.ended.add(executionId);
        this.report(activation, `the legacy Driver could not end ${executionId}'s exchange after ${bounded(cause)}: ${bounded(last)}`);
      }
    } finally {
      this.setBusy(-1);
    }
  }

  /**
   * Runs native steps until the lineage reaches a decision the Kernel can record. Returns `null`
   * when E ended meanwhile. Only an `open` lineage parks the task, until its lineage signals a change;
   * a `continue` never does.
   */
  private async step(executionId: string): Promise<LineageDecision | null> {
    for (;;) {
      if (this.ended.has(executionId)) return null;
      const record = await this.harness.runOnce(lineageWorker(executionId));
      if (record) {
        for (const listener of this.stepListeners) listener(record);
      }
      if (this.ended.has(executionId)) return null;
      const before = this.gate("register.before", executionId);
      if (before) await before;
      // Registered before the first read: a commit visible later resolves `work` (design 03 §2.3).
      const work = this.scheduler.nextWork(executionId);
      const after = this.gate("register.after", executionId);
      if (after) await after;
      const decision = await this.observe(executionId);
      if (decision.kind !== "open" && decision.kind !== "continue") return decision;
      if (decision.kind === "continue") {
        // `observe` scheduled every READY member (design 04 §6, D04-CHK-01). A step just ran: give the
        // Kernel its turn (one step per continue, B-CONTINUE). Otherwise step what was scheduled.
        if (record) return decision;
        // A `continue` names a READY member, which `reconcile` just queued: an empty lineage queue here
        // is a Driver defect, failed explicitly rather than spun or parked.
        if (!this.scheduler.hasQueued(executionId)) throw new UnschedulableReadyError(executionId, -1);
        continue;
      }
      const park = this.gate("park", executionId);
      if (park) await park;
      this.setBusy(-1);
      await work;
      this.setBusy(1);
    }
  }

  /**
   * The lineage's decision. An `await` is returned only when a second collect equals the one it was
   * classified from; otherwise the newer collect is classified again (design 03 §2.3).
   */
  private async observe(executionId: string): Promise<LineageDecision> {
    let collects = 1;
    let first = await this.collect(executionId, collects);
    for (;;) {
      const decision = classifyLineage(first);
      if (decision.kind === "continue") this.reconcile(executionId, first);
      if (decision.kind !== "await") return decision;
      collects += 1;
      const second = await this.collect(executionId, collects);
      if (sameObservation(first, second)) {
        const validated = this.gate("validated", executionId);
        if (validated) await validated;
        return decision;
      }
      first = second;
    }
  }

  /**
   * Schedules every READY member of a `continue` collect into E's lineage, with no read (design 04
   * §2.1, §6 D04-CHK-01). Throws `UnschedulableReadyError` when a member is READY again at the revision
   * at which it was scheduled although it was claimed since: that claim ran no Activation.
   */
  reconcile(executionId: string, records: LineageRecords): void {
    for (const [member, record] of records.members) {
      if (record.context.lifecycle !== "READY") continue;
      const revision = record.context.revision;
      const claims = this.scheduler.claimsOf(member);
      const prior = this.scheduled.get(member);
      if (prior && prior.revision === revision) {
        if (claims > prior.claims) throw new UnschedulableReadyError(member, revision);
      } else {
        this.scheduled.set(member, { revision, claims });
      }
      this.scheduler.schedule(member, executionId);
    }
  }

  /** One BFS collect of E's lineage as the classifier's projection. */
  private async collect(rootExecutionId: string, collect: number): Promise<LineageRecords> {
    const members = new Map<string, MemberRecords>();
    let ordinal = 0;
    const read = async <T>(record: NonNullable<GateDetail["record"]>, member: string, work: () => Promise<T>): Promise<T> => {
      ordinal += 1;
      const detail: GateDetail = { collect, ordinal, record, member };
      const before = this.gate("read.before", rootExecutionId, detail);
      if (before) await before;
      const value = await work();
      const after = this.gate("read.after", rootExecutionId, detail);
      if (after) await after;
      return value;
    };
    const queue = [rootExecutionId];
    const seen = new Set<string>();
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const executionId = id as ExecutionId;
      const context = await read("context", id, () => this.harness.inspect(executionId));
      if (!context) continue;
      this.scheduler.learn(id, context.rootExecutionId);
      const pendingOperations = await read("operations", id, () => this.harness.pendingOperationsOf(executionId));
      const confirmations = await read("confirmations", id, () => this.harness.confirmationRequestsOf(executionId));
      const resumptions = await read("resumptions", id, () => this.harness.controllerResumptionsOf(executionId));
      const children = await read("children", id, () => this.harness.childExecutionLinksOf(executionId));
      members.set(id, projectMember({ context, pendingOperations, confirmations, resumptions, children }));
      for (const link of children) queue.push(link.childExecutionId);
    }
    return { rootExecutionId, members };
  }

  /** Forwards one Event natively and returns its disposition. */
  private async forward(executionId: string, event: ActivationEvent): Promise<Disposition> {
    if (event.sourceCategory !== "application_input") return { status: INGRESS_STATUS.ignored };
    try {
      if (event.kind === INPUT_KINDS.start) {
        const input = readStartPayload(event.payload);
        if (input === null) return { status: INGRESS_STATUS.ignored };
        return receiptFields(await this.harness.deliverExternalInput({ ...nativeInput(input), destination: executionId as ExecutionId }));
      }
      if (event.kind === INPUT_KINDS.input) {
        const input = readInputPayload(event.payload);
        const destination = input.destination ?? executionId;
        if (!(await this.inLineage(executionId, destination))) {
          return { status: "rejected", reason: "destination_outside_lineage", detail: `${destination} is not in ${executionId}'s native lineage` };
        }
        return receiptFields(await this.harness.deliverExternalInput({ ...nativeInput(input), destination: destination as ExecutionId }));
      }
      if (event.kind === INPUT_KINDS.confirmation) {
        const decision = readConfirmationPayload(event.payload);
        const request = await this.harness.confirmationRequest(decision.confirmationId);
        if (!request || !(await this.inLineage(executionId, request.executionId))) {
          return { status: "rejected", reason: "confirmation_outside_lineage", detail: `${decision.confirmationId} is not a confirmation of ${executionId}'s native lineage` };
        }
        const receipt = await this.harness.resolveConfirmation(decision);
        return { status: receipt.status, ...("reason" in receipt && typeof receipt.reason === "string" ? { reason: receipt.reason } : {}) };
      }
      return { status: "rejected", reason: "unknown_kind" };
    } catch (cause) {
      if (cause instanceof ProtocolShapeError) return { status: "rejected", reason: "malformed_payload", detail: cause.message };
      throw cause;
    }
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

  // -- Outcomes ------------------------------------------------------------------

  private async submit(
    activation: Activation, grant: SubmissionGrant, progress: BridgeProgress, ledger: BatchLedger, decision: LineageDecision,
  ): Promise<void> {
    const executionId = activation.executionId;
    const root = (await this.harness.inspect(executionId as ExecutionId)) as ExecutionContext;
    const fixed = ledger.hasEntries() ? 1 : 0;
    const native = (await this.harness.emissionsOf(executionId as ExecutionId)).slice(progress.emissionCursor);
    const room = EMISSIONS_PER_OUTCOME - fixed - (decision.kind === "await" ? 1 : 0);
    const fits = native.length <= room;
    const chunk = fits ? native : native.slice(0, EMISSIONS_PER_OUTCOME - fixed);
    let next: OutcomeNext = { step: "continue" };
    let pauses: readonly PauseDeadline[] = progress.pauses;
    let pauseEmission: EmissionProposal | null = null;
    // A terminal or await decision is submitted only when the whole carry fits (EMIT-01); until
    // then the Outcome is `continue`, and the next exchange carries the rest before any step.
    const terminal = fits && (decision.kind === "complete" || decision.kind === "fail" || decision.kind === "native_cancelled");
    if (terminal && decision.kind === "complete") {
      next = { step: "complete", result: encode(root.terminalResult, "terminal result") };
    } else if (terminal) {
      const failed = decision.kind === "fail" && root.failure
        ? failureValue(root.failure)
        : { code: FAILURE_CODES.nativeCancelled, message: "the native root was cancelled without a Kernel cancellation" };
      next = { step: "fail", error: encode(failed, "failure") };
    } else if (fits && decision.kind === "await") {
      const declared = await this.declareWait(decision.pauses, progress);
      pauses = declared.pauses;
      next = { step: "await", wait: declared.wait };
      pauseEmission = { emissionKey: `bridge.pause.${activation.activationId}`, value: encode({ kind: EMISSION_KINDS.pause, pauses: decision.pauses as unknown[] }, "pause Emission") };
    }
    if (terminal) {
      this.ended.add(executionId);
      await this.endLineage(executionId, decision.kind === "complete" ? "complete" : decision.kind === "fail" ? "fail" : "native-cancelled");
    }
    const ingress = this.ingressEmissions(activation, ledger, ledger.close(terminal));
    if (ingress === null) {
      this.ended.add(executionId);
      await this.endLineage(executionId, "hold");
      return this.hold(activation, `the ingress accounting of ${activation.activationId} cannot be encoded`);
    }
    const emissions = [...ingress, ...(pauseEmission ? [pauseEmission] : [])];
    for (const emission of chunk) {
      emissions.push({ emissionKey: `native.${emission.emissionId}`, value: encode({ kind: EMISSION_KINDS.native, emission }, `native Emission ${emission.emissionId}`) });
    }
    const advanced = { ...progress, emissionCursor: progress.emissionCursor + chunk.length, pauses };
    const before = this.gate("submit.before", executionId);
    if (before) await before;
    const accepted = this.offer(activation, grant, advanced, emissions, next);
    // The latest accepted pause Emission is the host's only source for reasons and the default
    // input destination (D01-CHK-10); any other accepted Outcome supersedes it.
    if (accepted && decision.kind === "await" && next.step === "await") this.lastPauses.set(executionId, decision.pauses);
    else if (accepted) this.lastPauses.delete(executionId);
    const after = this.gate("submit.after", executionId);
    if (after) await after;
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

  /** The batch's `ingress_result` Emission (none for an empty batch), or `null` when it cannot be encoded. */
  private ingressEmissions(activation: Activation, ledger: BatchLedger, results: readonly IngressResult[]): EmissionProposal[] | null {
    if (results.length === 0) return [];
    try {
      return [{ emissionKey: `bridge.ingress.${activation.activationId}`, value: ledger.encode(results) }];
    } catch {
      return null;
    }
  }

  /**
   * Ends the exchange from `site`: sets the flag, requests the lineage's cancellation, then closes the
   * ledger and offers the Outcome. A fulfilled request does not prove every member ended (017 L-36). If
   * the request rejects, this reports a protocol hold through the Kernel alone and acknowledges nothing
   * (D04-CHK-02); the Kernel records it only while this exchange is unresolved and E is not terminal.
   * If the batch's accounting cannot be encoded, nothing is acknowledged either: the exchange becomes a
   * protocol hold (design 03 addendum, D03-CHK-02).
   */
  private async terminate(
    activation: Activation, grant: SubmissionGrant, ledger: BatchLedger, progress: BridgeProgress | null, next: OutcomeNext, site: TerminateSite,
  ): Promise<void> {
    const executionId = activation.executionId;
    this.ended.add(executionId);
    try {
      await this.endLineage(executionId, site);
    } catch (cause) {
      // The lineage is stopped (`ended`) but its cleanup is unconfirmed: report that, through the
      // Kernel alone, and acknowledge nothing (D04-CHK-02).
      const ending = next.step === "fail" ? `; it was ending with ${new TextDecoder().decode(next.error)}` : "";
      return this.report(activation, `native cleanup at ${site} failed, so ${executionId}'s lineage is stopped but not confirmed ended: ${bounded(cause)}${ending}`);
    }
    const emissions = this.ingressEmissions(activation, ledger, ledger.close(true));
    if (emissions === null) return this.hold(activation, `the ingress accounting of ${activation.activationId} cannot be encoded`);
    const state = progress ?? { v: 1 as const, root: executionId, emissionCursor: 0, pauses: [] };
    this.offer(activation, grant, state, emissions, next);
  }

  /** `hold` that cannot throw: the last report of an exchange, needing nothing native (D04-CHK-02). */
  private report(activation: Activation, diagnostic: string): void {
    try {
      this.hold(activation, diagnostic.length > MAX_DIAGNOSTIC ? diagnostic.slice(0, MAX_DIAGNOSTIC) : diagnostic);
    } catch {
      // The Kernel itself failed; nothing else is left to report to.
    }
  }

  /** Reports a protocol failure: the Kernel holds the exchange, and its batch stays unacknowledged. */
  private hold(activation: Activation, diagnostic: string): void {
    this.coordinator!.reportProtocolFailure(this.controlCaller!, activation.executionId, {
      activationId: activation.activationId,
      writerEpoch: activation.writerEpoch,
      diagnostic,
    });
    this.options.onChange({ executionId: activation.executionId, activationId: activation.activationId, accepted: false, nextState: null });
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
      // The batch is acknowledged: none of its Events can be redelivered.
      this.attempted.delete(activation.executionId);
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

const receiptFields = (receipt: { readonly status: string; readonly reason?: string; readonly detail?: string }): Disposition => ({
  status: receipt.status,
  ...(receipt.reason !== undefined ? { reason: receipt.reason } : {}),
  ...(receipt.detail !== undefined ? { detail: receipt.detail } : {}),
});
