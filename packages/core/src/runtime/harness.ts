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
 *
 * Slow *controller-local* work - a model-provider call - follows the same fast/slow principle
 * through an entirely separate path. The Harness hands each Activation a `ControllerResumptionScope`
 * (see [`resumption-processor.ts`](resumption-processor.ts)); work that settles inside the inline
 * budget simply returns to the controller, and work that does not leaves a `ControllerResumption`,
 * the Execution waits on *that record* rather than on an Event, and the settling promise makes it
 * READY again. No Event, no Effect, no PendingOperation, and no mailbox append is involved, because
 * a model result is not an observation delivered through the runtime boundary.
 */

import type { ExecutionDefinitionRef } from "../definitions/ids.ts";
import type { ExecutionDefinition } from "../definitions/types.ts";
import type { CancellationRequest } from "../execution/cancellation-request.ts";
import { createCancellationRequest, markCancellationApplied } from "../execution/cancellation-request.ts";
import type { ConfirmationRequest } from "../execution/confirmation-request.ts";
import { markConfirmationAbandoned } from "../execution/confirmation-request.ts";
import type { ChildExecutionLink } from "../execution/child-link.ts";
import { markChildLinkAbandoned, markChildLinkSettled } from "../execution/child-link.ts";
import type { PeerRequestLink } from "../execution/peer-request-link.ts";
import { markPeerRequestLinkAbandoned } from "../execution/peer-request-link.ts";
import type { UserInputRequest } from "../execution/user-input-request.ts";
import { markUserInputAbandoned } from "../execution/user-input-request.ts";
import type { WaitForEdge } from "../execution/wait-for.ts";
import type { ExecutionContext, ExecutionWait } from "../execution/context.ts";
import {
  controllerResumptionWait,
  createExecutionContext,
  eventWait,
  toExecutionView,
  transitionContext,
} from "../execution/context.ts";
import type { ExecutionEmission } from "../execution/emission.ts";
import type { ActivationId, ControllerResumptionId, ExecutionId } from "../execution/ids.ts";
import { activationId as toActivationId, executionId as toExecutionId } from "../execution/ids.ts";
import type { ControllerResumption } from "../execution/resumption.ts";
import { invalidateControllerResumptionAtSuspension } from "../execution/resumption.ts";
import type { LineageSpawnBudget } from "../execution/structural-budget.ts";
import { createLineageSpawnBudget, spawnBudgetCapacityIssues } from "../execution/structural-budget.ts";
import type { EffectiveOperationAuthority, OperationAuthorityGrant } from "../operations/authority.ts";
import { createEffectiveOperationAuthority, operationAuthorityGrantIssues } from "../operations/authority.ts";
import type { LifecycleState, LifecycleTransitionRecord } from "../execution/lifecycle.ts";
import { isTerminalLifecycle } from "../execution/lifecycle.ts";
import type { ExecutionFailure, TerminalResultEnvelope } from "../execution/terminal-result.ts";
import { validateTerminalResult } from "../execution/terminal-result.ts";
import type { EffectId, PendingOperationId } from "../effects/ids.ts";
import type { EffectJournalEntry } from "../effects/journal.ts";
import type { PendingOperation } from "../effects/pending.ts";
import { markAbandoned, markSettled } from "../effects/pending.ts";
import { hashValue } from "../util/hash.ts";
import type { SecurityProfile } from "../effects/capability.ts";
import type { DeliveredEvent, EventEnvelope, EventId, WakeCondition } from "../interaction/event-envelope.ts";
import { eventSatisfiesWake } from "../interaction/event-envelope.ts";
import type { CapabilityExecutor } from "../ports/capability-executor.ts";
import type { CapabilityCatalog } from "../ports/capability-catalog.ts";
import { emptyCapabilityCatalog } from "../ports/capability-catalog.ts";
import type { EffectAuthorizer } from "../ports/effect-authorizer.ts";
import { denyAllEffects } from "../ports/effect-authorizer.ts";
import type { ConfirmationPolicy } from "../ports/confirmation-policy.ts";
import { confirmationNotRequired } from "../ports/confirmation-policy.ts";
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
import type {
  EffectDispatchRecord,
  ResolveConfirmationInput,
  ResolveConfirmationReceipt,
  SettleEffectInput,
  SettleEffectReceipt,
  SubmitUserInputInput,
  SubmitUserInputReceipt,
} from "./effect-processor.ts";
import { EffectProcessor } from "./effect-processor.ts";
import { routeEvent } from "./event-router.ts";
import type { ActivationResumptions, ResumptionDependency } from "./resumption-processor.ts";
import { ControllerResumptionProcessor } from "./resumption-processor.ts";

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
   * The exact-payload mechanical-confirmation gate.
   *
   * Omitting it means no Effect requires confirmation - the correct baseline, not a stub. Unlike the
   * authorizer's fail-closed default, this default is permissive because confirmation is an optional
   * *extra* gate that runs strictly after authorization.
   */
  readonly confirmationPolicy?: ConfirmationPolicy;
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
   * Creates an owned Execution under an existing one, through trusted application wiring.
   *
   * This assigns ownership and root identity only. It is deliberately *not* the autonomous
   * `spawn`/`call` path: it does not attenuate authority, does not spend a structural spawn credit,
   * and registers no child-completion dependency. An Execution creating a child *itself* proposes a
   * `SpawnExecution` Effect, which the gateway mediates; this parameter is for a programmer
   * constructing an initial ownership tree by hand.
   */
  readonly ownerExecutionId?: ExecutionId;
  /**
   * The finite structural spawn budget this Execution's whole lineage shares.
   *
   * Only meaningful when creating a root Execution: it fixes how many autonomous descendants the
   * lineage may ever create through `SpawnExecution`. Omitted means the lineage has no budget, and
   * an Execution with no budget can spawn nothing - "nobody granted spawn capacity" is not
   * "unlimited spawn capacity". A descendant cannot enlarge it.
   */
  readonly structuralSpawnBudget?: number;
  /**
   * The root operation grant application/deployment policy supplies for this Execution.
   *
   * The Harness turns it into a runtime-owned effective-authority record and hands out only a
   * reference to it. Omitting it means no ceiling is configured, and an Execution with no ceiling
   * can expose nothing - "nobody granted anything" and "everything is granted" must never look the
   * same. A grant is not delegation: attenuating one for a child belongs to the composition slice.
   */
  readonly operationAuthority?: OperationAuthorityGrant;
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

export interface CancelExecutionInput {
  readonly executionId: ExecutionId;
  /** Recorded on the request, surfaced in the `child.cancelled` Event and the audit trail. */
  readonly reason?: string | null;
}

export type CancelExecutionReceipt =
  /** A `CREATED` / `READY` / `WAITING` Execution reached `CANCELLED` synchronously. */
  | { readonly status: "cancelled"; readonly executionId: ExecutionId }
  /** A `RUNNING` Execution will reach `CANCELLED` when its current Activation reaches a safe boundary. */
  | { readonly status: "cancellation_pending"; readonly executionId: ExecutionId }
  | { readonly status: "already_terminal"; readonly executionId: ExecutionId; readonly lifecycle: LifecycleState }
  | { readonly status: "unknown_execution"; readonly executionId: ExecutionId };

export class UnknownDefinitionError extends Error {
  constructor(ref: ExecutionDefinitionRef) {
    super(`no stored definition for ${ref.id}@${ref.version}`);
    this.name = "UnknownDefinitionError";
  }
}

export class InvalidOperationAuthorityError extends Error {
  constructor(detail: string) {
    super(`invalid operation authority grant: ${detail}`);
    this.name = "InvalidOperationAuthorityError";
  }
}

export class InvalidStructuralSpawnBudgetError extends Error {
  constructor(detail: string) {
    super(`invalid structural spawn budget: ${detail}`);
    this.name = "InvalidStructuralSpawnBudgetError";
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
  private readonly resumptions: ControllerResumptionProcessor;

  constructor(options: HarnessOptions) {
    this.options = options;
    this.maxActivationsPerRun = options.maxActivationsPerRun ?? 1000;
    this.resumptions = new ControllerResumptionProcessor({
      store: options.store,
      clock: options.clock,
      ids: options.ids,
      // The same budget the Effect gateway uses. It decides only how long *this Activation* stays
      // occupied - never how long the underlying model call may take.
      inlineWait: options.inlineWait ?? microtaskInlineWaitBudget(),
      wake: async (executionId) => {
        await options.scheduler.enqueue(executionId);
      },
      recordTransition: async (tx, executionId, from, to, at, reason) => {
        await this.record(tx, executionId, from, to, at, null, reason);
      },
    });
    this.effects = new EffectProcessor({
      store: options.store,
      clock: options.clock,
      ids: options.ids,
      definitions: options.definitions,
      // A child whose Definition kind has no registered controller is refused before any runtime
      // state exists for it, exactly as `createExecution` fails before inserting an Execution record.
      hasController: (kind) => options.controllers.has(kind),
      // Fail closed. An unconfigured Harness denies every Effect rather than permitting them.
      authorizer: options.authorizer ?? denyAllEffects,
      // Permissive default: confirmation is an optional extra gate, so an unconfigured workload pays
      // only one branch per dispatchable Effect.
      confirmationPolicy: options.confirmationPolicy ?? confirmationNotRequired,
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

    // The ceiling is computed before anything is written, so a malformed grant refuses creation
    // rather than producing an Execution whose authority nobody can account for.
    let authority: EffectiveOperationAuthority | null = null;
    if (input.operationAuthority !== undefined) {
      const issues = operationAuthorityGrantIssues(input.operationAuthority);
      if (issues.length > 0) {
        throw new InvalidOperationAuthorityError(issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "));
      }
      authority = createEffectiveOperationAuthority({
        authorityId: this.options.ids.next(ID_PREFIXES.operationAuthority),
        executionId: id,
        grant: input.operationAuthority,
        grantedAt: createdAt,
      });
    }

    // A lineage structural spawn budget is fixed at the root. A descendant does not start a new
    // lineage and cannot be handed a separate budget here.
    let spawnBudget: LineageSpawnBudget | null = null;
    if (input.structuralSpawnBudget !== undefined) {
      if (input.ownerExecutionId !== undefined) {
        throw new InvalidStructuralSpawnBudgetError("a structural spawn budget belongs to a lineage and may only be set on a root Execution");
      }
      const issues = spawnBudgetCapacityIssues(input.structuralSpawnBudget);
      if (issues.length > 0) {
        throw new InvalidStructuralSpawnBudgetError(issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "));
      }
      spawnBudget = createLineageSpawnBudget({ rootExecutionId: id, capacity: input.structuralSpawnBudget, grantedAt: createdAt });
    }

    const created = createExecutionContext({
      executionId: id,
      kind: definition.kind,
      definition: input.definition,
      ownerExecutionId,
      rootExecutionId,
      mailboxId,
      createdAt,
      ...(authority ? { authority: { authorityId: authority.authorityId } } : {}),
    });

    await this.options.store.transact(id, async (tx) => {
      // One transaction: an Execution whose context committed without its ceiling would read as
      // having no authority at all, and a ceiling without its Execution would permit nothing.
      if (authority) await tx.operationAuthorities.insert(authority);
      if (spawnBudget) await tx.lineageSpawnBudgets.insert(spawnBudget);
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
   * Delivers a trusted response to an open `RequestUserInput`.
   *
   * A trusted runtime entry point at the same level as `settleEffect`, `deliverExternalInput`, and
   * `cancelExecution`. An internet-facing deployment authenticates the human/application *before* it
   * reaches here; the `requestId` itself grants nothing. The runtime validates the value against the
   * request's stored schema, settles the exact PendingOperation, marks the request responded, and
   * routes one correlated `user.input` Event - which is *not* deliverable through the generic
   * `external.input` path.
   */
  async submitUserInput(input: SubmitUserInputInput): Promise<SubmitUserInputReceipt> {
    return this.effects.submitUserInput(input);
  }

  /** Every user-input request one Execution proposed. Read-only; a controller never receives one. */
  async userInputRequestsOf(executionId: ExecutionId): Promise<readonly UserInputRequest[]> {
    return this.options.store.listUserInputRequests(executionId);
  }

  async userInputRequest(requestId: string): Promise<UserInputRequest | undefined> {
    return this.options.store.readUserInputRequest(requestId);
  }

  /** Every currently-open user-input request, so an application/UI can discover pending questions. */
  async openUserInputRequests(): Promise<readonly UserInputRequest[]> {
    return this.options.store.listOpenUserInputRequests();
  }

  /**
   * Resolves one pending exact-payload mechanical confirmation with a trusted `approve` / `decline`.
   *
   * A trusted runtime entry point at the same level as `settleEffect` / `submitUserInput`. The
   * `confirmationId` grants nothing, the decision is never free prose, and approval never widens or
   * replaces authority: an approved dispatch re-checks the *current* authority ceiling on the stored
   * exact payload before it runs, so an old approval cannot override a revocation that happened while
   * it waited. A duplicate approval cannot dispatch twice; an approve/decline race linearizes to one
   * decision.
   */
  async resolveConfirmation(input: ResolveConfirmationInput): Promise<ResolveConfirmationReceipt> {
    return this.effects.resolveConfirmation(input);
  }

  /** Every confirmation request one Execution's Effects triggered. Read-only diagnostics. */
  async confirmationRequestsOf(executionId: ExecutionId): Promise<readonly ConfirmationRequest[]> {
    return this.options.store.listConfirmationRequests(executionId);
  }

  async confirmationRequest(confirmationId: string): Promise<ConfirmationRequest | undefined> {
    return this.options.store.readConfirmationRequest(confirmationId);
  }

  /** Every currently-pending confirmation, so an application/UI can discover what needs a decision. */
  async pendingConfirmations(): Promise<readonly ConfirmationRequest[]> {
    return this.options.store.listPendingConfirmations();
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

  // -- controller-local resumptions -------------------------------------------

  /**
   * Resolves once every controller-local continuation in flight has settled.
   *
   * The deterministic counterpart to `drainEffects`, and deliberately a separate method: these are
   * different kinds of work with different settlement paths, and a conformance run that could not
   * advance one without the other could not prove they stay separate.
   *
   * Note what is absent beside it. There is no public way to *settle* a resumption. A caller who
   * could would be able to hand a controller a model result that no model produced.
   */
  async drainResumptions(): Promise<void> {
    await this.resumptions.drain();
  }

  /** Controller-local resumptions belonging to one Execution. Read-only diagnostics. */
  async controllerResumptionsOf(executionId: ExecutionId): Promise<readonly ControllerResumption[]> {
    return this.options.store.listControllerResumptions(executionId);
  }

  async controllerResumption(resumptionId: ControllerResumptionId): Promise<ControllerResumption | undefined> {
    return this.options.store.readControllerResumption(resumptionId);
  }

  // -- effective operation authority -----------------------------------------

  /**
   * One Execution's effective operation authority.
   *
   * Read-only, and read-only in a stronger sense than the other inspectors: there is no method
   * beside it that widens, replaces, or revokes one. Exposure resolution reads this through a
   * narrow port; a controller reads it through nothing.
   */
  async effectiveOperationAuthorityOf(executionId: ExecutionId): Promise<EffectiveOperationAuthority | undefined> {
    return this.options.store.readOperationAuthority(executionId);
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

    type ClaimResult =
      | null
      | { readonly kind: "run"; readonly running: ExecutionContext; readonly events: readonly DeliveredEvent[] }
      | { readonly kind: "cancelled"; readonly context: ExecutionContext; readonly reason: string | null };

    const started: ClaimResult = await this.options.store.transact(executionId, async (tx): Promise<ClaimResult> => {
      const context = await tx.executions.get(executionId);
      if (!context) throw new UnknownExecutionError(executionId);
      if (context.lifecycle !== "READY") return null;

      // A pending cancellation request claims a READY Execution before it ever runs an Activation.
      // No controller work happens; it goes straight to CANCELLED.
      const cancelRequest = await tx.cancellationRequests.get(executionId);
      if (cancelRequest !== undefined && cancelRequest.state === "pending") {
        const cancelled = transitionContext(context, "CANCELLED", startedAt);
        await tx.executions.update(cancelled, context.revision);
        await tx.cancellationRequests.update(markCancellationApplied(cancelRequest, startedAt));
        await this.record(tx, executionId, context.lifecycle, "CANCELLED", startedAt, activationId, "cancellation requested");
        await this.abandonOutgoingDependencies(tx, executionId, startedAt, "execution CANCELLED");
        return { kind: "cancelled", context: cancelled, reason: cancelRequest.reason };
      }

      const running = transitionContext(context, "RUNNING", startedAt);
      await tx.executions.update(running, context.revision);
      await this.record(tx, executionId, context.lifecycle, "RUNNING", startedAt, activationId, `claim ${claim.claimId}`);
      const events = await tx.mailboxes.consume(context.mailbox.mailboxId);
      return { kind: "run", running, events };
    });

    if (!started) {
      await this.options.scheduler.ack(claim);
      return null;
    }

    if (started.kind === "cancelled") {
      await this.settleOwnerOnChildTerminal(started.context, "CANCELLED", null, null, startedAt, started.reason);
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
    // Bound to this Execution and this Activation, and holding nothing else. Created before the
    // controller runs, but creating it commits to nothing: a registration becomes a durable record
    // only if the controller reports the matching dependency and the Harness accepts the outcome.
    const resumptions = this.resumptions.beginActivation(running, activationId);
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
      raw = await controller.activate(input, resumptions.scope);
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

    return this.applyOutcome(
      running,
      definition,
      validated.outcome,
      activationId,
      startedAt,
      deliveredEventIds,
      setRequeue,
      resumptions,
    );
  }

  private async applyOutcome(
    running: ExecutionContext,
    definition: ExecutionDefinition,
    outcome: ActivationOutcome,
    activationId: ActivationId,
    startedAt: string,
    deliveredEventIds: readonly string[],
    setRequeue: (value: boolean) => void,
    resumptions: ActivationResumptions,
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

    // A controller reports a dependency; it does not get to name one that does not exist. Resolved
    // before the transaction opens, because an illegal id must fail the Activation rather than roll
    // back a half-written one.
    let dependency: ResumptionDependency | null = null;
    if (next.status === "await_resumption") {
      try {
        dependency = await resumptions.resolve(next.resumptionId, finishedAt);
      } catch (error) {
        // The runtime could not establish whether this dependency is real. Failing is the only
        // honest answer: parking an Execution on an unverified id is how a wake goes missing.
        return this.failActivation(running, activationId, startedAt, deliveredEventIds, {
          code: "resumption_dependency_unresolvable",
          message: error instanceof Error ? error.message : String(error),
        });
      }
      if (dependency.status === "invalid") {
        return this.failActivation(running, activationId, startedAt, deliveredEventIds, {
          code: "invalid_controller_outcome:invalid_resumption",
          message: `controller resumption ${dependency.detail}`,
        });
      }
    }

    const applied = await this.options.store.transact(executionId, async (tx) => {
      // The wake dependency is only real if nothing already satisfies it. Events that arrived while
      // the controller was running are runnable local work, so WAITING would be wrong.
      let to: LifecycleState = "CANCELLED";
      let terminalResult: TerminalResultEnvelope | null = null;
      let failure: ExecutionFailure | null = null;
      let waitingFor: ExecutionWait | null = null;
      let result: ActivationResultKind = "cancelled";
      let rejection: string | null = null;
      let requeue = false;
      let cancellationReason: string | null = null;
      let attachResumption = false;
      let emissionIds: readonly string[] = [];

      // A cancellation request that arrived while this Activation was running is applied at this
      // safe boundary: future semantic progression stops. If the request committed first, every
      // controller report loses, including complete/fail, and no emission is published.
      const cancelRequest = await tx.cancellationRequests.get(executionId);
      const cancelling = cancelRequest !== undefined && cancelRequest.state === "pending";
      if (cancelling) {
        to = "CANCELLED";
        result = "cancelled";
        cancellationReason = cancelRequest!.reason;
        await tx.cancellationRequests.update(markCancellationApplied(cancelRequest!, finishedAt));
      } else {
        emissionIds = await this.persistEmissions(tx, running, activationId, outcome, finishedAt);
      }

      if (!cancelling && next.status === "continue") {
        to = "READY";
        result = "continued";
        requeue = true;
      } else if (!cancelling && next.status === "await_event") {
        const pending = await tx.mailboxes.peek(running.mailbox.mailboxId);
        // Either the primary dependency or, when the controller opted in, an interleave Event that
        // is already in the mailbox is runnable local work - so WAITING would be wrong.
        const satisfied =
          pending.some((event) => eventSatisfiesWake(event, next.wake)) ||
          (next.interleave !== undefined && pending.some((event) => eventSatisfiesWake(event, next.interleave!)));
        if (satisfied) {
          to = "READY";
          result = "continued";
          requeue = true;
        } else {
          to = "WAITING";
          waitingFor = eventWait(next.wake, next.interleave);
          result = "waiting";
        }
      } else if (!cancelling && next.status === "await_resumption") {
        // One transaction: the controller's progress, the pending resumption record, and WAITING.
        // Splitting these would leave either a record nothing waits on or an Execution waiting on a
        // record that does not exist. A recovered dependency already has its record and needs only
        // the wait.
        const pending =
          next.interleave !== undefined ? await tx.mailboxes.peek(running.mailbox.mailboxId) : [];
        const interleaveEvent =
          next.interleave !== undefined
            ? pending.find((event) => eventSatisfiesWake(event, next.interleave!))
            : undefined;
        if (interleaveEvent !== undefined) {
          // The Event committed while this Activation was still RUNNING, before the suspension
          // boundary. The pre-Event continuation must never become reusable. A new record is
          // inserted directly as invalidated; a recovered record is invalidated in place. This
          // also covers the narrow case where its promise settled after the Event but before this
          // transaction - the Event still won the semantic ordering.
          const current =
            dependency!.status === "new"
              ? dependency!.record
              : await tx.controllerResumptions.get(next.resumptionId);
          if (current !== undefined) {
            const invalidated = invalidateControllerResumptionAtSuspension(
              current,
              finishedAt,
              interleaveEvent.eventId,
              running.revision,
            );
            if (dependency!.status === "new") await tx.controllerResumptions.insert(invalidated);
            else await tx.controllerResumptions.update(invalidated);
          }
          to = "READY";
          result = "continued";
          requeue = true;
        } else {
          if (dependency!.status === "new") await tx.controllerResumptions.insert(dependency!.record);
          to = "WAITING";
          waitingFor = controllerResumptionWait(next.resumptionId, next.interleave);
          result = "waiting";
          attachResumption = true;
        }
      } else if (!cancelling && next.status === "complete") {
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
      } else if (!cancelling && next.status === "fail") {
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

      if (isTerminalLifecycle(to)) {
        await this.abandonOutgoingDependencies(tx, executionId, finishedAt, `execution ${to}`);
      }

      return { emissionIds, to, result, rejection, requeue, terminalResult, failure, cancellationReason, attachResumption };
    });

    setRequeue(applied.requeue);

    // A child reaching a terminal state settles the exact dependency its `call` parent registered,
    // through the ordinary PendingOperation/Event path. Post-commit, like every other wake.
    if (applied.to === "COMPLETED" || applied.to === "FAILED" || applied.to === "CANCELLED") {
      await this.settleOwnerOnChildTerminal(
        running,
        applied.to,
        applied.terminalResult,
        applied.failure,
        finishedAt,
        applied.cancellationReason,
      );
    }

    // Only now, with the WAITING record durable, does anything start following the promise. A
    // continuation attached earlier could have settled - and tried to wake an Execution that was
    // still RUNNING - before the record it settles existed. Everything else this Activation
    // registered is abandoned by never being attached, and can no longer wake anything. A cancelled
    // Execution is terminal, so nothing is followed.
    if (next.status === "await_resumption" && applied.attachResumption) resumptions.attach(next.resumptionId);

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

  /**
   * Closes cross-Execution dependencies whose source can no longer observe a result.
   *
   * This is diagnostic/runtime cleanup only: the peer or child remains independently managed and
   * is not cancelled. `abandoned` is distinct from `settled` because no semantic reply/child result
   * was delivered.
   */
  private async abandonOutgoingDependencies(
    tx: RuntimeTransaction,
    executionId: ExecutionId,
    at: string,
    reason: string,
  ): Promise<void> {
    // Keep the no-feature terminal path cheap: if no live cross-Execution, user-input, or gated
    // operation exists, do not touch any feature-specific facet. The pending-operation facet is the
    // shared dependency index; a gated confirmation is the only persisted `not_dispatched` operation.
    const allPending = (await tx.pendingOperations.listByExecution(executionId)).filter(
      (operation) => operation.status === "pending",
    );
    const pendingDependencies = allPending.filter(
      (operation) =>
        operation.effectKind === "send_message" ||
        operation.effectKind === "spawn_execution" ||
        operation.effectKind === "request_user_input",
    );
    const gatedOperations = allPending.filter((operation) => operation.dispatch === "not_dispatched");

    if (gatedOperations.length > 0) {
      // A confirmation still pending when its Execution terminalizes can never be dispatched: the
      // Effect PendingOperation and the ConfirmationRequest are both abandoned, and a late
      // approve/decline does nothing (both resolve paths re-check the requester's lifecycle).
      const gatedById = new Map(gatedOperations.map((operation) => [operation.pendingOperationId, operation]));
      for (const confirmation of await tx.confirmationRequests.listByExecution(executionId)) {
        if (confirmation.state !== "pending") continue;
        const pending = gatedById.get(confirmation.pendingOperationId);
        if (pending !== undefined) {
          await tx.pendingOperations.update(markAbandoned(pending, at));
          await tx.effectJournal.append({
            effectId: confirmation.effectId,
            executionId,
            effectKind: confirmation.effectKind,
            phase: "abandoned",
            activationId: null,
            pendingOperationId: pending.pendingOperationId,
            at,
            detail: { reason, confirmationId: confirmation.confirmationId },
          });
        }
        await tx.confirmationRequests.update(markConfirmationAbandoned(confirmation, at));
      }
    }

    if (pendingDependencies.length === 0) return;
    const pendingById = new Map(pendingDependencies.map((operation) => [operation.pendingOperationId, operation]));

    if (pendingDependencies.some((operation) => operation.effectKind === "send_message")) {
      for (const link of await tx.peerRequestLinks.listByRequester(executionId)) {
        if (link.state !== "open") continue;
        const pending = pendingById.get(link.requestPendingOperationId);
        if (pending !== undefined) {
          await tx.pendingOperations.update(markAbandoned(pending, at));
          await tx.effectJournal.append({
            effectId: link.requestEffectId,
            executionId,
            effectKind: "send_message",
            phase: "abandoned",
            activationId: null,
            pendingOperationId: pending.pendingOperationId,
            at,
            detail: { reason, responderExecutionId: link.responderExecutionId },
          });
        }
        await tx.peerRequestLinks.update(markPeerRequestLinkAbandoned(link, at));
      }
    }

    if (pendingDependencies.some((operation) => operation.effectKind === "spawn_execution")) {
      for (const link of await tx.childExecutionLinks.listByParent(executionId)) {
        if (link.state !== "active" || link.pendingOperationId === null) continue;
        const pending = pendingById.get(link.pendingOperationId);
        if (pending !== undefined) {
          await tx.pendingOperations.update(markAbandoned(pending, at));
          await tx.effectJournal.append({
            effectId: link.effectId,
            executionId,
            effectKind: "spawn_execution",
            phase: "abandoned",
            activationId: null,
            pendingOperationId: pending.pendingOperationId,
            at,
            detail: { reason, childExecutionId: link.childExecutionId },
          });
        }
        await tx.childExecutionLinks.update(markChildLinkAbandoned(link, at));
      }
    }

    // An open `RequestUserInput` whose Execution terminalized can never be answered. The
    // PendingOperation and the UserInputRequest are both abandoned; a later response wakes nothing.
    if (pendingDependencies.some((operation) => operation.effectKind === "request_user_input")) {
      for (const request of await tx.userInputRequests.listByExecution(executionId)) {
        if (request.state !== "open") continue;
        const pending = pendingById.get(request.pendingOperationId);
        if (pending !== undefined) {
          await tx.pendingOperations.update(markAbandoned(pending, at));
          await tx.effectJournal.append({
            effectId: request.effectId,
            executionId,
            effectKind: "request_user_input",
            phase: "abandoned",
            activationId: null,
            pendingOperationId: pending.pendingOperationId,
            at,
            detail: { reason, requestId: request.requestId },
          });
        }
        await tx.userInputRequests.update(markUserInputAbandoned(request, at));
      }
    }
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
    const applied = await this.options.store.transact(running.executionId, async (tx) => {
      const cancelRequest = await tx.cancellationRequests.get(running.executionId);
      const cancelling = cancelRequest !== undefined && cancelRequest.state === "pending";
      const to = cancelling ? "CANCELLED" as const : "FAILED" as const;
      const recordedFailure = cancelling
        ? null
        : { ...failure, failedByActivationId: activationId, failedAt: finishedAt };
      const terminal = transitionContext(running, to, finishedAt, { failure: recordedFailure });
      await tx.executions.update(terminal, running.revision);
      if (cancelling) await tx.cancellationRequests.update(markCancellationApplied(cancelRequest, finishedAt));
      await this.record(
        tx,
        running.executionId,
        "RUNNING",
        to,
        finishedAt,
        activationId,
        cancelling ? "cancellation requested" : failure.code,
      );
      await this.abandonOutgoingDependencies(tx, running.executionId, finishedAt, `execution ${to}`);
      return { to, recordedFailure, cancellationReason: cancelling ? cancelRequest.reason : null };
    });

    // A child the Harness itself refused to trust still terminated; a `call` parent must be told.
    await this.settleOwnerOnChildTerminal(
      running,
      applied.to,
      null,
      applied.recordedFailure,
      finishedAt,
      applied.cancellationReason,
    );

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
      lifecycleAfter: applied.to,
      result: applied.to === "CANCELLED" ? "cancelled" : "failed",
      rejection: applied.to === "CANCELLED" ? null : `${failure.code}: ${failure.message}`,
    };
  }

  /**
   * Settles a `call` parent's dependency when the child it called reaches a terminal state.
   *
   * ```text
   * child COMPLETED / FAILED / CANCELLED
   *        ↓ ChildExecutionLink names the parent PendingOperation
   *   one transaction:
   *     journal completed / failed / cancelled on the parent's Effect
   *     markSettled the PendingOperation  (outcome success | failure | cancelled)
   *     markChildLinkSettled the link          <- duplicate delivery is refused here and by the
   *     route child.completed / .failed / .cancelled   PendingOperation status check
   *        ↓
   *   parent WAITING -> READY, if it was waiting on this
   * ```
   *
   * A plain `spawn` recorded `pendingOperationId: null`, so nothing settles - it observed
   * `child.spawned` and nothing else, and the parent's own lifecycle is untouched by the child's.
   * A child created through trusted `createExecution` wiring has no link and is likewise ignored.
   *
   * `child.cancelled` is a *distinct* kind from `child.failed`, and the PendingOperation outcome is
   * `cancelled`, not `failure`: cancellation is a terminal outcome in its own right. Cancellation
   * does not propagate to this parent - it settles a dependency, it does not fail the parent.
   *
   * This is *not* a `ControllerResumption`: the child's terminal result is runtime-mediated
   * semantic work, and it settles through a PendingOperation and a correlated Event. There is a
   * crash window between the child's terminal commit and this settlement; recovering it is Slice I's
   * durable-outbox work, exactly as for an inline Effect result that woke a waiting Execution.
   */
  private async settleOwnerOnChildTerminal(
    child: ExecutionContext,
    terminal: "COMPLETED" | "FAILED" | "CANCELLED",
    terminalResult: TerminalResultEnvelope | null,
    failure: ExecutionFailure | null,
    at: string,
    cancellationReason: string | null = null,
  ): Promise<void> {
    if (child.ownerExecutionId === null) return;
    const link = await this.options.store.readChildExecutionLink(child.executionId);
    if (!link || link.pendingOperationId === null || link.state !== "active") return;

    const parentId = link.parentExecutionId;
    const eventId = this.options.ids.next(ID_PREFIXES.event) as EventId;
    const phase: "completed" | "failed" | "cancelled" =
      terminal === "COMPLETED" ? "completed" : terminal === "FAILED" ? "failed" : "cancelled";
    const outcome: "success" | "failure" | "cancelled" =
      terminal === "COMPLETED" ? "success" : terminal === "FAILED" ? "failure" : "cancelled";

    const woke = await this.options.store.transact(parentId, async (tx): Promise<ExecutionId | null> => {
      const currentLink = await tx.childExecutionLinks.get(child.executionId);
      if (!currentLink || currentLink.state !== "active" || currentLink.pendingOperationId === null) return null;
      const pending = await tx.pendingOperations.get(currentLink.pendingOperationId);
      if (!pending || pending.status !== "pending") return null;

      const parent = await tx.executions.get(parentId);
      if (!parent) return null;

      if (isTerminalLifecycle(parent.lifecycle)) {
        // The parent cannot observe anything. Record honestly; deliver nothing.
        await tx.pendingOperations.update(markAbandoned(pending, at));
        await tx.childExecutionLinks.update(markChildLinkSettled(currentLink, at));
        await tx.effectJournal.append({
          effectId: currentLink.effectId,
          executionId: parentId,
          effectKind: "spawn_execution",
          phase: "abandoned",
          activationId: null,
          pendingOperationId: pending.pendingOperationId,
          at,
          detail: { reason: `parent ${parent.lifecycle}`, childExecutionId: child.executionId },
        });
        return null;
      }

      await tx.effectJournal.append({
        effectId: currentLink.effectId,
        executionId: parentId,
        effectKind: "spawn_execution",
        phase,
        activationId: null,
        pendingOperationId: pending.pendingOperationId,
        at,
        detail: { childExecutionId: child.executionId, resultEventId: eventId },
      });
      await tx.pendingOperations.update(markSettled(pending, outcome, eventId, at));
      await tx.childExecutionLinks.update(markChildLinkSettled(currentLink, at));

      const shared = {
        effectId: currentLink.effectId,
        effectKind: "spawn_execution" as const,
        pendingOperationId: pending.pendingOperationId,
        childExecutionId: child.executionId,
        rootExecutionId: currentLink.rootExecutionId,
        definitionId: currentLink.definition.id,
        definitionVersion: currentLink.definition.version,
      };
      const base = {
        eventId,
        destination: { executionId: parentId },
        correlationId: currentLink.resultCorrelationId,
        causationId: currentLink.effectId,
        occurredAt: at,
      } as const;
      const envelope: EventEnvelope =
        terminal === "COMPLETED"
          ? {
              ...base,
              kind: "child.completed",
              body: {
                ...shared,
                terminalResult: {
                  schemaId: terminalResult?.schema?.schemaId ?? null,
                  schemaVersion: terminalResult?.schema?.schemaVersion ?? null,
                  value: terminalResult?.value ?? null,
                  valueDigest: terminalResult?.valueDigest ?? hashValue(null),
                },
              },
            }
          : terminal === "FAILED"
            ? {
                ...base,
                kind: "child.failed",
                body: { ...shared, failure: { code: failure?.code ?? "child_failed", message: failure?.message ?? "" } },
              }
            : {
                ...base,
                kind: "child.cancelled",
                body: { ...shared, reason: cancellationReason },
              };

      const routed = await routeEvent({
        tx,
        envelope,
        deliveredAt: at,
        recordTransition: async (id, from, to, when, why) => {
          await tx.transitions.append({ executionId: id, from, to, at: when, activationId: null, reason: why });
        },
      });
      return routed.status === "delivered" && routed.wokeExecution ? parentId : null;
    });

    if (woke) await this.options.scheduler.enqueue(woke);
  }

  // -- child composition (read-only diagnostics) ----------------------------

  /** One lineage's structural spawn budget: capacity, consumed, remaining. */
  async lineageSpawnBudgetOf(rootExecutionId: ExecutionId): Promise<LineageSpawnBudget | undefined> {
    return this.options.store.readLineageSpawnBudget(rootExecutionId);
  }

  /** Every child one Execution spawned, and whether each `call` dependency has settled. */
  async childExecutionLinksOf(parentExecutionId: ExecutionId): Promise<readonly ChildExecutionLink[]> {
    return this.options.store.listChildExecutionLinks(parentExecutionId);
  }

  async childExecutionLink(childExecutionId: ExecutionId): Promise<ChildExecutionLink | undefined> {
    return this.options.store.readChildExecutionLink(childExecutionId);
  }

  // -- peer messaging (read-only diagnostics) -------------------------------

  /** One peer request link by message id. Runtime state; a controller never receives one. */
  async peerRequestLink(messageId: string): Promise<PeerRequestLink | undefined> {
    return this.options.store.readPeerRequestLink(messageId);
  }

  /** Every `ask` one Execution sent. Read-only. */
  async peerRequestLinksOf(requesterExecutionId: ExecutionId): Promise<readonly PeerRequestLink[]> {
    return this.options.store.listPeerRequestLinksByRequester(requesterExecutionId);
  }

  /** Every `ask` one Execution is the expected responder for. Read-only. */
  async peerRequestLinksTo(responderExecutionId: ExecutionId): Promise<readonly PeerRequestLink[]> {
    return this.options.store.listPeerRequestLinksByResponder(responderExecutionId);
  }

  // -- cross-Execution wait-for diagnostics --------------------------------

  /**
   * The required-wait edges *out of* one Execution: which children/peers it is currently blocked on.
   *
   * Derived from the child-call and peer-ask links, not a third stored graph. A cycle across these
   * edges is a deadlock *candidate* for diagnostics - the runtime never terminates one. Once a
   * dependency settles or is abandoned its edge disappears from this view.
   */
  async waitForEdgesFrom(executionId: ExecutionId): Promise<readonly WaitForEdge[]> {
    const edges: WaitForEdge[] = [];
    for (const link of await this.options.store.listChildExecutionLinks(executionId)) {
      if (link.state === "active" && link.pendingOperationId !== null) {
        edges.push({
          sourceExecutionId: executionId,
          targetExecutionId: link.childExecutionId,
          kind: "child_call",
          pendingOperationId: link.pendingOperationId,
          correlationId: link.resultCorrelationId,
        });
      }
    }
    for (const link of await this.options.store.listPeerRequestLinksByRequester(executionId)) {
      if (link.state === "open") {
        edges.push({
          sourceExecutionId: executionId,
          targetExecutionId: link.responderExecutionId,
          kind: "peer_ask",
          pendingOperationId: link.requestPendingOperationId,
          correlationId: link.requestCorrelationId,
        });
      }
    }
    return edges;
  }

  // -- cancellation (trusted runtime control) -----------------------------

  /**
   * The trusted runtime-control entry point for child/Execution cancellation.
   *
   * This is *not* a model action and *not* an Effect - it sits at the same trust level as
   * `settleEffect` and `deliverExternalInput`. An internet-facing deployment authenticates the
   * caller before it reaches here, exactly as for creating or messaging an Execution.
   *
   * ```text
   * CREATED / READY / WAITING child   -> straight to CANCELLED now
   * RUNNING child                     -> a CancellationRequest is recorded; the current Activation
   *                                      reaches a safe boundary and the Harness applies CANCELLED
   *                                      instead of the controller's reported next
   * already terminal                  -> idempotent no-op
   * ```
   *
   * A `call` parent's exact PendingOperation settles as `cancelled` (never `failure`) with one
   * correlated `child.cancelled` Event. Cancellation does not propagate: the parent is not
   * cancelled, siblings are not cancelled, and descendants are not cancelled. A detached `spawn`
   * has no terminal-result dependency, so nothing is delivered to its parent.
   */
  async cancelExecution(input: CancelExecutionInput): Promise<CancelExecutionReceipt> {
    const executionId = input.executionId;
    const reason = input.reason ?? null;

    const existing = await this.options.store.readExecution(executionId);
    if (!existing) return { status: "unknown_execution", executionId };
    if (isTerminalLifecycle(existing.lifecycle)) {
      return { status: "already_terminal", executionId, lifecycle: existing.lifecycle };
    }

    const outcome = await this.options.store.transact(executionId, async (tx) => {
      const current = await tx.executions.get(executionId);
      if (!current || isTerminalLifecycle(current.lifecycle)) {
        return { status: "already_terminal" as const, lifecycle: current?.lifecycle ?? "CANCELLED", child: null, reason };
      }

      const prior = await tx.cancellationRequests.get(executionId);
      if (prior !== undefined) {
        // Idempotent: a second cancel while one is already in flight changes nothing.
        return { status: "cancellation_pending" as const, lifecycle: current.lifecycle, child: null, reason: prior.reason };
      }

      const at = nowIso(this.options.clock);
      const request = createCancellationRequest({ executionId, reason, requestedAt: at });
      await tx.cancellationRequests.insert(request);

      if (current.lifecycle === "RUNNING") {
        // The current Activation cannot be safely interrupted. `applyOutcome` will see this record.
        return { status: "cancellation_pending" as const, lifecycle: "RUNNING", child: null, reason };
      }

      const cancelled = transitionContext(current, "CANCELLED", at);
      await tx.executions.update(cancelled, current.revision);
      await tx.cancellationRequests.update(markCancellationApplied(request, at));
      await this.record(
        tx,
        executionId,
        current.lifecycle,
        "CANCELLED",
        at,
        null,
        reason !== null ? `cancelled: ${reason}` : "cancelled",
      );
      await this.abandonOutgoingDependencies(tx, executionId, at, "execution CANCELLED");
      return { status: "cancelled" as const, lifecycle: "CANCELLED", child: cancelled as ExecutionContext, reason };
    });

    if (outcome.status === "cancelled" && outcome.child !== null) {
      await this.settleOwnerOnChildTerminal(
        outcome.child,
        "CANCELLED",
        null,
        null,
        nowIso(this.options.clock),
        outcome.reason,
      );
    }

    if (outcome.status === "already_terminal") {
      return { status: "already_terminal", executionId, lifecycle: outcome.lifecycle };
    }
    return { status: outcome.status, executionId };
  }

  /** One Execution's pending/applied cancellation request, if the runtime recorded one. Read-only. */
  async cancellationRequestOf(executionId: ExecutionId): Promise<CancellationRequest | undefined> {
    return this.options.store.readCancellationRequest(executionId);
  }
}
