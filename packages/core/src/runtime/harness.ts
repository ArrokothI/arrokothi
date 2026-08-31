/**
 * The Harness: one logical runtime managing many Executions.
 *
 * There is no Harness-per-Agent and no Harness-per-request. One instance creates Agent and
 * Workflow Executions, pins their definitions, persists their contexts, schedules Activations,
 * invokes the controller registered for each kind, validates what that controller reported, and
 * owns every lifecycle transition that results.
 *
 * The division of labour is the point of the whole file:
 *
 *   controller   decides what should happen next, semantically
 *   Harness      decides what that means operationally, and makes it true
 *
 * So a controller reporting `await_event` does not become WAITING because it asked. It becomes
 * WAITING because the Harness checked the mailbox, found nothing that satisfies the dependency,
 * and recorded the dependency itself. A controller reporting `complete` does not become COMPLETED
 * because it proposed a value. It becomes COMPLETED because the Harness validated that value
 * against the schema declared by the definition the Execution pinned at creation. And a controller
 * proposing an Effect does not cause anything to happen in the world; the Harness authorizes it,
 * journals it, dispatches it, and delivers whatever actually happened back as an Event.
 *
 * Effects are processed after the controller returns and *before* the Harness derives the next
 * lifecycle state, which is what makes the fast and slow paths one path. A result that arrives
 * inline is already in the mailbox when the Harness checks whether the reported wake dependency is
 * genuinely unmet, so the Execution stays runnable; a result that does not arrive in time leaves a
 * pending operation, the Execution waits, and the identical Event wakes it later.
 */

import type { ExecutionDefinitionRef } from "../definitions/ids.ts";
import type { ExecutionDefinition } from "../definitions/types.ts";
import type { ExecutionContext } from "../execution/context.ts";
import { createExecutionContext, toExecutionView, transitionContext } from "../execution/context.ts";
import type { ExecutionEmission } from "../execution/emission.ts";
import type { ActivationId, ExecutionId } from "../execution/ids.ts";
import { activationId as toActivationId, executionId as toExecutionId } from "../execution/ids.ts";
import type { LifecycleState, LifecycleTransitionRecord } from "../execution/lifecycle.ts";
import { isTerminalLifecycle } from "../execution/lifecycle.ts";
import type { ExecutionFailure, TerminalResultEnvelope } from "../execution/terminal-result.ts";
import { validateTerminalResult } from "../execution/terminal-result.ts";
import type { EffectId, PendingOperationId } from "../effects/ids.ts";
import type { EffectJournalEntry } from "../effects/journal.ts";
import type { PendingOperation } from "../effects/pending.ts";
import type { SecurityProfile } from "../effects/capability.ts";
import type { DeliveredEvent, EventEnvelope, EventId, WakeCondition } from "../interaction/event-envelope.ts";
import { eventSatisfiesWake } from "../interaction/event-envelope.ts";
import type { CapabilityExecutor } from "../ports/capability-executor.ts";
import type { CapabilityCatalog } from "../ports/capability-catalog.ts";
import { emptyCapabilityCatalog } from "../ports/capability-catalog.ts";
import type { EffectAuthorizer } from "../ports/effect-authorizer.ts";
import { denyAllEffects } from "../ports/effect-authorizer.ts";
import type { InlineWaitBudget } from "../ports/inline-wait.ts";
import { microtaskInlineWaitBudget } from "../ports/inline-wait.ts";
import type { Clock } from "../ports/clock.ts";
import { nowIso } from "../ports/clock.ts";
import type { ActivationClaim, Scheduler } from "../ports/scheduler.ts";
import type { ActivationOutcome, ControllerNext } from "../ports/controller.ts";
import type { DefinitionStore } from "../ports/definition-store.ts";
import type { RuntimeStore, RuntimeTransaction } from "../ports/runtime-store.ts";
import { UnknownExecutionError } from "../ports/runtime-store.ts";
import type { IdGenerator } from "../ports/ids.ts";
import { ID_PREFIXES } from "../ports/ids.ts";
import type { JsonValue } from "../util/json.ts";
import type { ActivationRecord, ActivationResultKind } from "./activation.ts";
import { buildActivationInput, validateActivationOutcome } from "./activation.ts";
import type { ControllerRegistry } from "./controller-registry.ts";
import type { EffectDispatchRecord, SettleEffectInput, SettleEffectReceipt } from "./effect-processor.ts";
import { EffectProcessor } from "./effect-processor.ts";
import { routeEvent } from "./event-router.ts";

/** Thirty seconds. Long enough that an inline wait budget is obviously a different concept. */
const DEFAULT_EFFECT_DEADLINE_MS = 30_000;

export interface HarnessOptions {
  readonly definitions: DefinitionStore;
  readonly store: RuntimeStore;
  readonly scheduler: Scheduler;
  readonly controllers: ControllerRegistry;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  /** Advisory budget handed to every controller. Reported, not enforced. */
  readonly activationBudget?: { readonly maxSteps?: number | null; readonly deadlineMs?: number | null };
  /** Guards `runUntilIdle` against a controller that never settles. */
  readonly maxActivationsPerRun?: number;

  /**
   * Effect policy. Omitting it means every Effect is denied.
   *
   * That default is the correct behaviour, not a stub: "nobody configured policy" and "policy
   * allowed it" must never look the same.
   */
  readonly authorizer?: EffectAuthorizer;
  /**
   * Where capability-operation consequentiality is declared.
   *
   * Omitting it classifies nothing, and an unclassified operation is treated as consequential -
   * the conservative default, not a missing feature.
   */
  readonly capabilityCatalog?: CapabilityCatalog;
  /** Where authorized capability work actually happens. Omitting it refuses capability Effects. */
  readonly capabilities?: CapabilityExecutor;
  /**
   * How long an Activation is willing to stay occupied waiting for an Effect.
   *
   * A scheduling choice, never an operation deadline. Defaults to the deterministic microtask
   * budget, which lets an already-resolved dispatch settle inline without consulting a clock.
   */
  readonly inlineWait?: InlineWaitBudget;
  /** Applied to Effects that declare no deadline of their own. Defaults to 30 seconds. */
  readonly defaultEffectDeadlineMs?: number;
  /** The deployment trust posture reported to executors. */
  readonly securityProfile?: SecurityProfile;
}

export interface CreateExecutionInput {
  /** A pinned definition ref. The Execution runs against these exact bytes for its whole life. */
  readonly definition: ExecutionDefinitionRef;
  /**
   * Creates an owned Execution under an existing one.
   *
   * This assigns ownership and root identity only. Real `spawn`/`call` semantics - delegated
   * authority, memory visibility, child-completion Events - belong to Slice E; nothing here
   * pretends to provide them.
   */
  readonly ownerExecutionId?: ExecutionId;
}

export interface ExecutionHandle {
  readonly executionId: ExecutionId;
  readonly kind: ExecutionDefinition["kind"];
  readonly definition: ExecutionDefinitionRef;
  readonly ownerExecutionId: ExecutionId | null;
  readonly rootExecutionId: ExecutionId;
}

/**
 * An observation delivered from outside the kernel.
 *
 * Applications mint `external.input` and nothing else. Capability results, denials, and refusals
 * are Events the *Harness* creates when it establishes what happened - an application that could
 * hand-deliver a `capability.completed` Event could tell an Execution that an action succeeded
 * without any action having occurred.
 */
export interface DeliverExternalInputInput {
  readonly destination: ExecutionId;
  /** Application vocabulary for what kind of input this is. Never interpreted by the kernel. */
  readonly label: string;
  readonly payload?: JsonValue;
  readonly correlationId?: string | null;
  readonly causationId?: string | null;
}

export type EventDeliveryReceipt =
  | { readonly status: "delivered"; readonly eventId: EventId; readonly wokeExecution: boolean }
  | { readonly status: "duplicate"; readonly eventId: EventId }
  | {
      readonly status: "rejected";
      readonly eventId: EventId;
      readonly reason: "unknown_destination" | "execution_terminal" | "malformed_event" | "kind_not_deliverable";
      readonly detail: string;
    };

export class UnknownDefinitionError extends Error {
  constructor(ref: ExecutionDefinitionRef) {
    super(`no stored definition for ${ref.id}@${ref.version}`);
    this.name = "UnknownDefinitionError";
  }
}

export class HarnessRunawayError extends Error {
  constructor(limit: number) {
    super(`runUntilIdle exceeded ${limit} activations; a controller is not settling`);
    this.name = "HarnessRunawayError";
  }
}

export class Harness {
  private readonly options: HarnessOptions;
  private readonly maxActivationsPerRun: number;
  private readonly effects: EffectProcessor;

  constructor(options: HarnessOptions) {
    this.options = options;
    this.maxActivationsPerRun = options.maxActivationsPerRun ?? 1000;
    this.effects = new EffectProcessor({
      store: options.store,
      clock: options.clock,
      ids: options.ids,
      // Fail closed. An unconfigured Harness denies every Effect rather than permitting them.
      authorizer: options.authorizer ?? denyAllEffects,
      // Fail conservative. An unconfigured catalog classifies nothing, and nothing classified
      // means every capability operation is treated as consequential.
      catalog: options.capabilityCatalog ?? emptyCapabilityCatalog,
      capabilities: options.capabilities ?? null,
      inlineWait: options.inlineWait ?? microtaskInlineWaitBudget(),
      defaultEffectDeadlineMs: options.defaultEffectDeadlineMs ?? DEFAULT_EFFECT_DEADLINE_MS,
      profile: options.securityProfile ?? "trusted-local",
      wake: async (executionId) => {
        await options.scheduler.enqueue(executionId);
      },
    });
  }

  // -- creation --------------------------------------------------------------

  async createExecution(input: CreateExecutionInput): Promise<ExecutionHandle> {
    const definition = await this.options.definitions.get(input.definition);
    if (!definition) throw new UnknownDefinitionError(input.definition);
    // Fail before an Execution record exists rather than creating something nothing can advance.
    this.options.controllers.resolve(definition.kind);

    const id = toExecutionId(this.options.ids.next(ID_PREFIXES.execution));
    const mailboxId = this.options.ids.next(ID_PREFIXES.mailbox);
    const createdAt = nowIso(this.options.clock);

    let ownerExecutionId: ExecutionId | null = null;
    let rootExecutionId: ExecutionId = id;
    if (input.ownerExecutionId !== undefined) {
      const owner = await this.options.store.readExecution(input.ownerExecutionId);
      if (!owner) throw new UnknownExecutionError(input.ownerExecutionId);
      ownerExecutionId = owner.executionId;
      rootExecutionId = owner.rootExecutionId;
    }

    const created = createExecutionContext({
      executionId: id,
      kind: definition.kind,
      definition: input.definition,
      ownerExecutionId,
      rootExecutionId,
      mailboxId,
      createdAt,
    });

    await this.options.store.transact(id, async (tx) => {
      await tx.executions.insert(created);
      const ready = transitionContext(created, "READY", createdAt);
      await tx.executions.update(ready, created.revision);
      await this.record(tx, ready.executionId, "CREATED", "READY", createdAt, null, "created");
    });

    // Enqueue after the record is durable. A crash in this window leaves a READY Execution that is
    // not queued; recovering those on restart is Slice I's durable-outbox work, not a Slice A claim.
    await this.options.scheduler.enqueue(id);

    return {
      executionId: id,
      kind: definition.kind,
      definition: input.definition,
      ownerExecutionId,
      rootExecutionId,
    };
  }

  // -- event delivery --------------------------------------------------------

  /**
   * Mints an addressed `external.input` Event and routes it.
   *
   * This is the only Event an application creates. Everything else in the closed vocabulary
   * describes something the runtime itself established.
   */
  async deliverExternalInput(input: DeliverExternalInputInput): Promise<EventDeliveryReceipt> {
    const envelope: EventEnvelope = {
      eventId: this.options.ids.next(ID_PREFIXES.event) as EventId,
      destination: { executionId: input.destination },
      kind: "external.input",
      body: { label: input.label, payload: input.payload ?? null },
      correlationId: input.correlationId ?? null,
      causationId: input.causationId ?? null,
      occurredAt: nowIso(this.options.clock),
    };
    return this.deliverEnvelope(envelope);
  }

  /**
   * Routes an already-formed envelope from outside the kernel.
   *
   * Only `external.input` may be delivered this way. The rest of the vocabulary describes things
   * the runtime itself established - that a capability succeeded, that policy refused a request -
   * and a caller who could mint those could tell an Execution an action had happened when nothing
   * had. Results reach an Execution through `settleEffect`, which checks them against the pending
   * operation they claim to answer.
   *
   * Delivery is destination-checked and duplicate-safe, and an Event addressed to a terminal
   * Execution is refused rather than queued - terminal states do not resume. The receipt says the
   * Event was accepted and persisted. It does *not* say a controller observed it: consumption
   * happens when an Activation takes the Event out of the mailbox, and semantic handling happens
   * only when a controller decides what it meant.
   */
  async deliverEnvelope(envelope: EventEnvelope): Promise<EventDeliveryReceipt> {
    if (envelope.kind !== "external.input") {
      return {
        status: "rejected",
        eventId: envelope.eventId,
        reason: "kind_not_deliverable",
        detail: `"${envelope.kind}" describes something the runtime establishes; it cannot be delivered from outside`,
      };
    }
    const destination = envelope.destination.executionId;
    const deliveredAt = nowIso(this.options.clock);

    const receipt = await this.options.store.transact(destination, async (tx) =>
      routeEvent({
        tx,
        envelope,
        deliveredAt,
        recordTransition: async (executionId, from, to, at, reason) => {
          await this.record(tx, executionId, from, to, at, null, reason);
        },
      }),
    );

    // Waking is a scheduling act, so it happens after the mailbox write is committed.
    if (receipt.status === "delivered" && receipt.wokeExecution) {
      await this.options.scheduler.enqueue(destination);
    }
    return receipt;
  }

  // -- effects ---------------------------------------------------------------

  /**
   * Delivers an outcome for a pending operation from outside the dispatch that created it.
   *
   * The path a recovered runtime or an out-of-band completion transport uses. It goes through the
   * same funnel as an in-process completion, so it cannot skip the correlation check, the journal,
   * the idempotency rules, or routing. A second result for an operation that already produced one
   * is answered `already_settled` and creates no second observation, and a result naming the wrong
   * Effect cannot settle somebody else's work.
   *
   * This is a trusted runtime entry point, at the same level as a `CapabilityExecutor`: it is how a
   * result transport reports what the world did. Knowing a pending-operation id is not authorization
   * to call it - an Internet-facing deployment must authenticate the caller before it reaches here,
   * exactly as it must before creating or cancelling an Execution.
   */
  async settleEffect(input: SettleEffectInput): Promise<SettleEffectReceipt> {
    return this.effects.settleEffect(input);
  }

  /**
   * Resolves once every dispatch currently in flight has settled.
   *
   * A reference/testing affordance so a conformance run can advance the slow path deterministically
   * instead of sleeping. It will not return while an Effect genuinely has not completed, which is
   * correct: nothing here shortens an operation's deadline.
   */
  async drainEffects(): Promise<void> {
    await this.effects.drain();
  }

  /** Pending operations belonging to one Execution. Read-only; runtime state is never handed out. */
  async pendingOperationsOf(executionId: ExecutionId): Promise<readonly PendingOperation[]> {
    return this.options.store.listPendingOperations(executionId);
  }

  async pendingOperation(pendingOperationId: PendingOperationId): Promise<PendingOperation | undefined> {
    return this.options.store.readPendingOperation(pendingOperationId);
  }

  /**
   * The Effect journal for one Execution.
   *
   * Audit history. These records are never delivered to a controller and never enter a mailbox.
   */
  async effectJournalOf(executionId: ExecutionId): Promise<readonly EffectJournalEntry[]> {
    return this.options.store.listEffectJournal(executionId);
  }

  // -- scheduling ------------------------------------------------------------

  /**
   * Claims one unit of scheduled work and runs a single Activation.
   *
   * Returns `null` when nothing is runnable. Executions that were queued but are no longer READY
   * (cancelled, already terminal) are dropped from the queue rather than activated.
   */
  async runOnce(workerId = "worker"): Promise<ActivationRecord | null> {
    for (;;) {
      const claim = await this.options.scheduler.claim(workerId);
      if (!claim) return null;
      const record = await this.activate(claim);
      if (record) return record;
    }
  }

  async runUntilIdle(workerId = "worker"): Promise<readonly ActivationRecord[]> {
    const records: ActivationRecord[] = [];
    for (let i = 0; i < this.maxActivationsPerRun; i++) {
      const record = await this.runOnce(workerId);
      if (!record) return records;
      records.push(record);
    }
    throw new HarnessRunawayError(this.maxActivationsPerRun);
  }

  // -- read-only observation -------------------------------------------------

  async inspect(executionId: ExecutionId): Promise<ExecutionContext | undefined> {
    return this.options.store.readExecution(executionId);
  }

  async emissionsOf(executionId: ExecutionId): Promise<readonly ExecutionEmission[]> {
    return this.options.store.listEmissions(executionId);
  }

  /** Lifecycle audit history. These are records about the Execution, never Events delivered to it. */
  async transitionsOf(executionId: ExecutionId): Promise<readonly LifecycleTransitionRecord[]> {
    return this.options.store.listTransitions(executionId);
  }

  // -- internals -------------------------------------------------------------

  private async record(
    tx: RuntimeTransaction,
    executionId: ExecutionId,
    from: LifecycleState,
    to: LifecycleState,
    at: string,
    activationId: ActivationId | null,
    reason: string,
  ): Promise<void> {
    await tx.transitions.append({ executionId, from, to, at, activationId, reason });
  }

  /** Runs one Activation for a claimed Execution. Returns null when the claim was not activatable. */
  private async activate(claim: ActivationClaim): Promise<ActivationRecord | null> {
    const executionId = claim.executionId;
    const startedAt = nowIso(this.options.clock);
    const activationId = toActivationId(this.options.ids.next(ID_PREFIXES.activation));

    const started = await this.options.store.transact(executionId, async (tx) => {
      const context = await tx.executions.get(executionId);
      if (!context) throw new UnknownExecutionError(executionId);
      if (context.lifecycle !== "READY") return null;

      const running = transitionContext(context, "RUNNING", startedAt);
      await tx.executions.update(running, context.revision);
      await this.record(tx, executionId, context.lifecycle, "RUNNING", startedAt, activationId, `claim ${claim.claimId}`);
      const events = await tx.mailboxes.consume(context.mailbox.mailboxId);
      return { running, events };
    });

    if (!started) {
      await this.options.scheduler.ack(claim);
      return null;
    }

    let requeue = false;
    try {
      return await this.runController(activationId, startedAt, started.running, started.events, (value) => {
        requeue = value;
      });
    } finally {
      if (requeue) await this.options.scheduler.release(claim, { requeue: true });
      else await this.options.scheduler.ack(claim);
    }
  }

  private async runController(
    activationId: ActivationId,
    startedAt: string,
    running: ExecutionContext,
    events: readonly DeliveredEvent[],
    setRequeue: (value: boolean) => void,
  ): Promise<ActivationRecord> {
    const deliveredEventIds = events.map((event) => event.eventId as string);

    const definition = await this.options.definitions.get(running.definition);
    if (!definition) {
      return this.failActivation(running, activationId, startedAt, deliveredEventIds, {
        code: "definition_unavailable",
        message: `pinned definition ${running.definition.id}@${running.definition.version} could not be resolved`,
      });
    }

    const controller = this.options.controllers.resolve(definition.kind);
    const budget = this.options.activationBudget;
    const input = buildActivationInput({
      execution: toExecutionView(running),
      definition,
      events,
      activation: {
        activationId,
        startedAt,
        budget: {
          maxSteps: budget?.maxSteps ?? null,
          deadline: budget?.deadlineMs != null ? new Date(new Date(startedAt).getTime() + budget.deadlineMs).toISOString() : null,
        },
        cancellation: { cancelled: false, reason: null },
      },
    });

    let raw: unknown;
    try {
      raw = await controller.activate(input);
    } catch (error) {
      return this.failActivation(running, activationId, startedAt, deliveredEventIds, {
        code: "controller_error",
        message: error instanceof Error ? error.message : String(error),
      });
    }

    const validated = validateActivationOutcome(raw, definition.kind);
    if (!validated.ok) {
      return this.failActivation(running, activationId, startedAt, deliveredEventIds, {
        code: `invalid_controller_outcome:${validated.rejection.code}`,
        message: validated.rejection.message,
      });
    }

    return this.applyOutcome(running, definition, validated.outcome, activationId, startedAt, deliveredEventIds, setRequeue);
  }

  private async applyOutcome(
    running: ExecutionContext,
    definition: ExecutionDefinition,
    outcome: ActivationOutcome,
    activationId: ActivationId,
    startedAt: string,
    deliveredEventIds: readonly string[],
    setRequeue: (value: boolean) => void,
  ): Promise<ActivationRecord> {
    const executionId = running.executionId;
    const next: ControllerNext = outcome.next;

    // Effects are processed before the lifecycle is derived, and this ordering is load-bearing. A
    // result that settled inline is already in the mailbox when the wake dependency is checked
    // below, so the Execution stays runnable; one that did not leaves a pending operation and the
    // Execution waits for the identical Event. Neither the controller nor the Event body can tell
    // which happened.
    let dispatched: readonly EffectDispatchRecord[];
    try {
      dispatched = await this.effects.processActivationEffects({
        context: running,
        definition: running.definition,
        activationId,
        proposals: outcome.effects ?? [],
      });
    } catch (error) {
      // The gateway could not record what it was doing. Failing the Activation is the only honest
      // response: nothing partial was committed, and pretending the Activation succeeded would
      // leave controller progress describing Effects the runtime has no record of.
      return this.failActivation(running, activationId, startedAt, deliveredEventIds, {
        code: "effect_processing_failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }

    const finishedAt = nowIso(this.options.clock);

    const applied = await this.options.store.transact(executionId, async (tx) => {
      const emissionIds = await this.persistEmissions(tx, running, activationId, outcome, finishedAt);

      // The wake dependency is only real if nothing already satisfies it. Events that arrived while
      // the controller was running are runnable local work, so WAITING would be wrong.
      let to: LifecycleState;
      let terminalResult: TerminalResultEnvelope | null = null;
      let failure: ExecutionFailure | null = null;
      let waitingFor: WakeCondition | null = null;
      let result: ActivationResultKind;
      let rejection: string | null = null;
      let requeue = false;

      if (next.status === "continue") {
        to = "READY";
        result = "continued";
        requeue = true;
      } else if (next.status === "await_event") {
        const pending = await tx.mailboxes.peek(running.mailbox.mailboxId);
        const satisfied = pending.some((event) => eventSatisfiesWake(event, next.wake));
        if (satisfied) {
          to = "READY";
          result = "continued";
          requeue = true;
        } else {
          to = "WAITING";
          waitingFor = next.wake;
          result = "waiting";
        }
      } else if (next.status === "complete") {
        const validation = validateTerminalResult(definition.terminalResult, next.result, {
          activationId,
          completedAt: finishedAt,
        });
        if (validation.ok) {
          to = "COMPLETED";
          terminalResult = validation.envelope;
          result = "completed";
        } else {
          // A proposal is not a completion. An unvalidatable result never produces a COMPLETED
          // record; the Activation fails instead, and `terminalResult` stays null.
          to = "FAILED";
          result = "failed";
          rejection = `${validation.rejection.code}: ${validation.rejection.message}`;
          failure = {
            code: `invalid_terminal_result:${validation.rejection.code}`,
            message: validation.rejection.message,
            failedByActivationId: activationId,
            failedAt: finishedAt,
            details: validation.rejection.issues.length > 0 ? (validation.rejection.issues as unknown as JsonValue) : undefined,
          };
        }
      } else {
        to = "FAILED";
        result = "failed";
        failure = {
          code: next.failure.code,
          message: next.failure.message,
          failedByActivationId: activationId,
          failedAt: finishedAt,
          ...(next.failure.details !== undefined ? { details: next.failure.details } : {}),
        };
      }

      const updated = transitionContext(running, to, finishedAt, {
        control: outcome.control,
        waitingFor,
        terminalResult,
        failure,
      });
      await tx.executions.update(updated, running.revision);
      await this.record(tx, executionId, "RUNNING", to, finishedAt, activationId, `activation ${result}`);

      return { emissionIds, to, result, rejection, requeue };
    });

    setRequeue(applied.requeue);

    return {
      activationId,
      executionId,
      kind: definition.kind,
      startedAt,
      finishedAt,
      deliveredEventIds,
      emissionIds: applied.emissionIds,
      effects: dispatched,
      lifecycleBefore: "RUNNING",
      lifecycleAfter: applied.to,
      result: applied.result,
      rejection: applied.rejection,
    };
  }

  private async persistEmissions(
    tx: RuntimeTransaction,
    running: ExecutionContext,
    activationId: ActivationId,
    outcome: ActivationOutcome,
    at: string,
  ): Promise<readonly string[]> {
    const ids: string[] = [];
    for (const proposal of outcome.emissions ?? []) {
      const sequence = await tx.emissions.nextSequence(running.executionId);
      const emission: ExecutionEmission = {
        emissionId: this.options.ids.next(ID_PREFIXES.emission),
        executionId: running.executionId,
        activationId,
        sequence,
        body: proposal.body,
        emittedAt: at,
      };
      await tx.emissions.append(emission);
      ids.push(emission.emissionId);
    }
    return ids;
  }

  /** Terminates an Activation the Harness refuses to trust. Controller progress is not persisted. */
  private async failActivation(
    running: ExecutionContext,
    activationId: ActivationId,
    startedAt: string,
    deliveredEventIds: readonly string[],
    failure: { readonly code: string; readonly message: string },
  ): Promise<ActivationRecord> {
    const finishedAt = nowIso(this.options.clock);
    await this.options.store.transact(running.executionId, async (tx) => {
      const failed = transitionContext(running, "FAILED", finishedAt, {
        failure: { ...failure, failedByActivationId: activationId, failedAt: finishedAt },
      });
      await tx.executions.update(failed, running.revision);
      await this.record(tx, running.executionId, "RUNNING", "FAILED", finishedAt, activationId, failure.code);
    });

    return {
      activationId,
      executionId: running.executionId,
      kind: running.kind,
      startedAt,
      finishedAt,
      deliveredEventIds,
      emissionIds: [],
      effects: [],
      lifecycleBefore: "RUNNING",
      lifecycleAfter: "FAILED",
      result: "failed",
      rejection: `${failure.code}: ${failure.message}`,
    };
  }
}
