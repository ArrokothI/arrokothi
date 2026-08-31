/**
 * The Effect gateway: everything between a controller's proposal and a delivered observation.
 *
 * The sequence is fixed and there is no way around it:
 *
 *   proposal            controller data, already structurally validated
 *        ↓ journal      requested
 *   authorization       kernel-owned decision; deny is the default with no policy present
 *        ↓ journal      authorized | denied
 *   pending operation   created and committed
 *        ↓ journal      dispatch_started        <- committed BEFORE the irreversible call
 *   executor            the only place external work happens
 *        ↓ journal      completed | failed | unknown_outcome
 *   result Event        routed to the requesting Execution's mailbox
 *
 * Three properties are worth stating because they are easy to lose:
 *
 * **Requesting is not permission.** There is exactly one call site for `executor.execute`, and it
 * is downstream of an `allow` decision. A denied Effect produces an observation and no dispatch.
 *
 * **Dispatched is not completed.** `dispatch_started` is committed before the call, so a crash in
 * that window leaves evidence that something may have happened. Nothing in this slice automatically
 * redispatches such an operation, and a repeat request for a consequential operation whose outcome
 * is unresolved or unknown is refused rather than retried - the legacy runtime learned that the hard
 * way, and the rule survives here in Effect terms.
 *
 * **Fast is not different.** The inline wait budget decides only whether *this Activation* stays
 * occupied. Whether the result arrives inline or hours later, it is the same journal phases, the
 * same pending operation, the same correlation, and the same Event body. The controller cannot tell
 * the difference, which is the whole point of separating the Activation's budget from the Effect's
 * deadline.
 */

import type { ExecutionDefinitionRef } from "../definitions/ids.ts";
import type { AuthorizationConstraints, AuthorizationDecision } from "../effects/authorization.ts";
import { authorizationDecisionIssues } from "../effects/authorization.ts";
import type {
  AuthorizedCapabilityRequest,
  AuthorizedGrant,
  CapabilityExecutionEnvironment,
  ResourceBindingRef,
  SecurityProfile,
} from "../effects/capability.ts";
import type { CapabilityOutcome } from "../effects/outcome.ts";
import { capabilityOutcomeIssues } from "../effects/outcome.ts";
import type { EffectIdempotencyScope } from "../effects/fingerprint.ts";
import { effectIdempotencyKey } from "../effects/fingerprint.ts";
import type { CapabilityId, EffectId, IdempotencyKey, OperationId, PendingOperationId } from "../effects/ids.ts";
import { EFFECT_ID_PREFIXES } from "../effects/ids.ts";
import type { EffectJournalPhase } from "../effects/journal.ts";
import type { PendingOperation } from "../effects/pending.ts";
import { createPendingOperation, markAbandoned, markDispatched, markSettled } from "../effects/pending.ts";
import type { EffectKind, EffectProposal, UseCapabilityProposal } from "../effects/types.ts";
import { DISPATCHABLE_EFFECT_KINDS } from "../effects/types.ts";
import type { ExecutionContext } from "../execution/context.ts";
import type { ActivationId, ExecutionId } from "../execution/ids.ts";
import { isTerminalLifecycle } from "../execution/lifecycle.ts";
import type { EventEnvelope, EventId } from "../interaction/event-envelope.ts";
import type { EventKind } from "../interaction/events.ts";
import type { Clock } from "../ports/clock.ts";
import { nowIso } from "../ports/clock.ts";
import type { CapabilityExecutor } from "../ports/capability-executor.ts";
import { UnknownCapabilityError } from "../ports/capability-executor.ts";
import type { EffectAuthorizer } from "../ports/effect-authorizer.ts";
import type { IdGenerator } from "../ports/ids.ts";
import { ID_PREFIXES } from "../ports/ids.ts";
import type { InlineWaitBudget } from "../ports/inline-wait.ts";
import type { RuntimeStore, RuntimeTransaction } from "../ports/runtime-store.ts";
import type { JsonObject, JsonValue } from "../util/json.ts";
import type { EventRoutingResult } from "./event-router.ts";
import { routeEvent } from "./event-router.ts";

/** The request facts a result Event needs, recovered from the journal at settlement time. */
interface RequestFacts {
  readonly capability: CapabilityId;
  readonly operation: OperationId;
  readonly consequential: boolean;
}

/** What the Harness gets back per proposal, for the Activation record and for diagnostics. */
export interface EffectDispatchRecord {
  readonly effectId: EffectId;
  readonly effectKind: EffectKind;
  readonly correlationId: string;
  readonly pendingOperationId: PendingOperationId | null;
  /** The last journal phase this Effect reached during the Activation that proposed it. */
  readonly phase: EffectJournalPhase;
  /** True when the result Event was already in the mailbox before the Activation finished. */
  readonly settledInline: boolean;
}

export type SettleEffectReceipt =
  | {
      readonly status: "settled";
      readonly pendingOperationId: PendingOperationId;
      readonly executionId: ExecutionId;
      readonly eventId: EventId;
      readonly wokeExecution: boolean;
    }
  /** A second result for an operation that already produced one. No second observation is created. */
  | { readonly status: "already_settled"; readonly pendingOperationId: PendingOperationId }
  | {
      readonly status: "rejected";
      readonly reason: "unknown_pending_operation" | "effect_mismatch" | "execution_terminal";
      readonly detail: string;
    };

export interface SettleEffectInput {
  readonly pendingOperationId: PendingOperationId;
  /**
   * The Effect this result claims to answer.
   *
   * Checked against the stored operation, so a result carrying the wrong correlation cannot settle
   * somebody else's pending work.
   */
  readonly effectId: EffectId;
  readonly outcome: CapabilityOutcome;
}

export interface EffectProcessorDeps {
  readonly store: RuntimeStore;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly authorizer: EffectAuthorizer;
  /** `null` means this deployment has no capability execution at all; requests are refused. */
  readonly capabilities: CapabilityExecutor | null;
  readonly inlineWait: InlineWaitBudget;
  /** Applied when a proposal declares no deadline of its own. */
  readonly defaultEffectDeadlineMs: number;
  readonly profile: SecurityProfile;
  /** Enqueues an Execution whose wake dependency an arriving result satisfied. Post-commit. */
  readonly wake: (executionId: ExecutionId) => Promise<void>;
}

export interface ProcessEffectsInput {
  readonly context: ExecutionContext;
  readonly definition: ExecutionDefinitionRef;
  readonly activationId: ActivationId;
  readonly proposals: readonly EffectProposal[];
}

export class EffectProcessor {
  private readonly deps: EffectProcessorDeps;
  /** Dispatches whose promise has not resolved yet. Only the reference runtime inspects this. */
  private readonly inFlight = new Set<Promise<void>>();

  constructor(deps: EffectProcessorDeps) {
    this.deps = deps;
  }

  /**
   * Processes every proposal from one Activation, in order.
   *
   * Sequential rather than concurrent: the journal is the record of what the runtime decided and in
   * what order, and interleaving two authorizations would make that record harder to read for no
   * semantic gain in this slice.
   */
  async processActivationEffects(input: ProcessEffectsInput): Promise<readonly EffectDispatchRecord[]> {
    const records: EffectDispatchRecord[] = [];
    for (const proposal of input.proposals) {
      records.push(await this.processOne(input, proposal));
    }
    return records;
  }

  /** Resolves once every dispatch currently in flight has settled. Reference/testing affordance. */
  async drain(): Promise<void> {
    while (this.inFlight.size > 0) {
      await Promise.all([...this.inFlight]);
    }
  }

  /**
   * Delivers an outcome for a pending operation from outside the dispatch that created it.
   *
   * This is the path a recovered runtime, a callback transport, or a conformance test uses. It is
   * the same funnel the in-process continuation uses, so out-of-band settlement cannot take a
   * shortcut past correlation checks, idempotency, journaling, or routing.
   */
  async settleEffect(input: SettleEffectInput): Promise<SettleEffectReceipt> {
    const existing = await this.deps.store.readPendingOperation(input.pendingOperationId);
    if (!existing) {
      return {
        status: "rejected",
        reason: "unknown_pending_operation",
        detail: `no pending operation ${input.pendingOperationId}`,
      };
    }
    const consequential = await this.consequentialityOf(existing);
    return this.settle(input.pendingOperationId, input.effectId, this.normalize(input.outcome, consequential));
  }

  // -- one proposal ----------------------------------------------------------

  private async processOne(input: ProcessEffectsInput, proposal: EffectProposal): Promise<EffectDispatchRecord> {
    const executionId = input.context.executionId;
    const effectId = this.deps.ids.next(EFFECT_ID_PREFIXES.effect) as EffectId;
    const correlationId = proposal.requestKey ?? effectId;
    const requestedAt = nowIso(this.deps.clock);

    const collision = await this.deps.store.transact(executionId, async (tx) => {
      await this.journal(tx, {
        effectId,
        executionId,
        effectKind: proposal.kind,
        phase: "requested",
        activationId: input.activationId,
        pendingOperationId: null,
        at: requestedAt,
        // The proposal is persisted verbatim. Later phases record what policy decided and what the
        // world did; this is the record of what was actually asked for, which is the only thing that
        // makes those decisions reviewable afterwards.
        detail: {
          correlationId,
          requestedAt,
          proposal: proposal as unknown as JsonValue,
        },
      });
      // A request key names one outstanding operation. Reusing a live one would make two results
      // indistinguishable to the controller waiting on it.
      const live = await tx.pendingOperations.listByExecution(executionId);
      return live.some((operation) => operation.status === "pending" && operation.correlationId === correlationId);
    });

    if (collision) {
      return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
        code: "duplicate_request_key",
        message: `request key "${correlationId}" already names an unresolved pending operation for this Execution`,
      });
    }

    if (!(DISPATCHABLE_EFFECT_KINDS as readonly string[]).includes(proposal.kind)) {
      // Accepted vocabulary, no implementation yet. An explicit refusal, never a silent no-op: a
      // controller that asked to send a message must not be left believing that it did.
      return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
        code: "effect_kind_not_supported",
        message: `effect kind "${proposal.kind}" is accepted v0.4 vocabulary but is not implemented in this slice`,
      });
    }

    const decision = await this.decide(input, proposal, effectId, requestedAt);
    if (decision.decision === "deny") {
      return this.refuse(input, proposal, effectId, correlationId, "effect.denied", {
        code: decision.code,
        message: decision.message,
        phase: "denied",
      });
    }

    if (this.deps.capabilities === null) {
      return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
        code: "capability_execution_unavailable",
        message: "this deployment has no CapabilityExecutor, so an authorized capability still cannot be performed",
      });
    }

    return this.dispatchCapability(input, proposal as UseCapabilityProposal, effectId, correlationId, decision);
  }

  private async decide(
    input: ProcessEffectsInput,
    proposal: EffectProposal,
    effectId: EffectId,
    requestedAt: string,
  ): Promise<AuthorizationDecision> {
    let raw: unknown;
    try {
      raw = await this.deps.authorizer.authorize({
        executionId: input.context.executionId,
        ownerExecutionId: input.context.ownerExecutionId,
        rootExecutionId: input.context.rootExecutionId,
        definition: input.definition,
        activationId: input.activationId,
        effectId,
        effectKind: proposal.kind,
        proposal,
        requestedAt,
      });
    } catch (error) {
      // An evaluator that fails cannot be read as consent.
      return {
        decision: "deny",
        code: "authorizer_error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
    const issues = authorizationDecisionIssues(raw);
    if (issues.length > 0) {
      return {
        decision: "deny",
        code: "invalid_authorization_decision",
        message: issues.map((i) => `${i.path}: ${i.message}`).join("; "),
      };
    }
    return raw as AuthorizationDecision;
  }

  // -- capability dispatch ---------------------------------------------------

  private async dispatchCapability(
    input: ProcessEffectsInput,
    proposal: UseCapabilityProposal,
    effectId: EffectId,
    correlationId: string,
    decision: Extract<AuthorizationDecision, { decision: "allow" }>,
  ): Promise<EffectDispatchRecord> {
    const executionId = input.context.executionId;
    const constraints: AuthorizationConstraints = decision.constraints ?? {};
    const consequential = constraints.consequential ?? true;
    const scope: EffectIdempotencyScope = constraints.idempotency ?? proposal.idempotency ?? "none";
    const idempotencyKey = effectIdempotencyKey({
      scope,
      executionId,
      effectId,
      capability: proposal.capability,
      operation: proposal.operation,
      input: proposal.input,
    });

    const guard = await this.checkPriorOperations(executionId, idempotencyKey, consequential);
    if (guard.kind === "refuse") {
      return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
        code: guard.code,
        message: guard.message,
      });
    }
    if (guard.kind === "replay") {
      return this.replay(input, proposal, effectId, correlationId, guard.operation, guard.observation);
    }

    const pendingOperationId = this.deps.ids.next(EFFECT_ID_PREFIXES.pendingOperation) as PendingOperationId;
    const dispatchedAt = nowIso(this.deps.clock);
    const deadline = this.deadlineFor(proposal, constraints, dispatchedAt);
    // A decision that names no resource narrowing has authorized what was asked for; the fallback
    // is the request itself, never a wider set. It cannot add a binding the controller did not name.
    const resources: readonly ResourceBindingRef[] =
      constraints.resources ?? (proposal.resources ?? []).map((bindingId) => ({ bindingId, mode: "read" as const }));
    const grant: AuthorizedGrant = {
      grantId: decision.grantId,
      resources,
      consequential,
      ...(proposal.authorizationEvidence !== undefined ? { evidence: proposal.authorizationEvidence } : {}),
    };

    // One transaction: the grant, the pending operation, and the intent to dispatch commit together
    // and commit *before* the call. If this throws, nothing exists and nothing was attempted.
    const operation = await this.deps.store.transact(executionId, async (tx) => {
      await this.journal(tx, {
        effectId,
        executionId,
        effectKind: proposal.kind,
        phase: "authorized",
        activationId: input.activationId,
        pendingOperationId,
        at: dispatchedAt,
        detail: {
          grantId: decision.grantId,
          capability: proposal.capability,
          operation: proposal.operation,
          consequential,
          idempotency: scope,
          idempotencyKey,
          deadline,
          resources: resources.map((resource) => `${resource.bindingId}:${resource.mode}`),
        },
      });
      const created = createPendingOperation({
        pendingOperationId,
        executionId,
        effectId,
        effectKind: proposal.kind,
        correlationId,
        causationId: input.activationId,
        idempotencyKey,
        createdAt: dispatchedAt,
        deadline,
      });
      const dispatched = markDispatched(created, dispatchedAt);
      await tx.pendingOperations.insert(dispatched);
      await this.journal(tx, {
        effectId,
        executionId,
        effectKind: proposal.kind,
        phase: "dispatch_started",
        activationId: input.activationId,
        pendingOperationId,
        at: dispatchedAt,
        detail: { capability: proposal.capability, operation: proposal.operation, consequential },
      });
      return dispatched;
    });

    const request: AuthorizedCapabilityRequest = {
      executionId,
      effectId,
      pendingOperationId: operation.pendingOperationId,
      correlationId,
      causationId: input.activationId,
      capability: proposal.capability,
      operation: proposal.operation,
      input: proposal.input,
      resources,
      deadline,
      idempotencyKey,
      authorization: grant,
      cancellation: { cancelled: false, reason: null },
    };
    const environment: CapabilityExecutionEnvironment = { profile: this.deps.profile, dispatchedAt };

    const work = this.invoke(request, environment, consequential);
    const raced = await this.deps.inlineWait.race(work);

    if (raced.settled) {
      await this.settle(operation.pendingOperationId, effectId, raced.value);
      return {
        effectId,
        effectKind: proposal.kind,
        correlationId,
        pendingOperationId: operation.pendingOperationId,
        phase: this.phaseFor(raced.value),
        settledInline: true,
      };
    }

    // The Activation stopped waiting. The operation did not stop being valid: it keeps its deadline
    // and its correlation, and it settles through the same funnel whenever the executor answers.
    this.track(work, operation.pendingOperationId, effectId);

    return {
      effectId,
      effectKind: proposal.kind,
      correlationId,
      pendingOperationId: operation.pendingOperationId,
      phase: "dispatch_started",
      settledInline: false,
    };
  }

  /**
   * Calls the executor and converts every abnormal reply into an explicit outcome.
   *
   * A thrown error from a consequential operation is `unknown`, not `failure`: the request may well
   * have taken effect before the response was lost, and calling that a definite failure is how a
   * runtime sends the same email twice. `UnknownCapabilityError` is the exception, because the port
   * defines it as raised before anything is attempted.
   */
  private async invoke(
    request: AuthorizedCapabilityRequest,
    environment: CapabilityExecutionEnvironment,
    consequential: boolean,
  ): Promise<CapabilityOutcome> {
    try {
      const raw = await this.deps.capabilities!.execute(request, environment);
      return this.normalize(raw, consequential);
    } catch (error) {
      if (error instanceof UnknownCapabilityError) {
        return {
          status: "failure",
          error: { code: "capability_unavailable", message: error.message },
          retryable: false,
        };
      }
      const failure = {
        code: "executor_threw",
        message: error instanceof Error ? error.message : String(error),
      };
      return consequential ? { status: "unknown", error: failure } : { status: "failure", error: failure, retryable: true };
    }
  }

  /** Rejects an executor reply that is not persistable data, without inventing a success. */
  private normalize(outcome: unknown, consequential: boolean): CapabilityOutcome {
    const issues = capabilityOutcomeIssues(outcome);
    if (issues.length === 0) return outcome as CapabilityOutcome;
    const error = {
      code: "invalid_capability_outcome",
      message: `the executor returned something that is not a capability outcome: ${issues
        .map((i) => `${i.path}: ${i.message}`)
        .join("; ")}`,
    };
    return consequential ? { status: "unknown", error } : { status: "failure", error, retryable: false };
  }

  // -- settlement ------------------------------------------------------------

  private async settle(
    pendingOperationId: PendingOperationId,
    effectId: EffectId,
    outcome: CapabilityOutcome,
  ): Promise<SettleEffectReceipt> {
    const known = await this.deps.store.readPendingOperation(pendingOperationId);
    if (!known) {
      return {
        status: "rejected",
        reason: "unknown_pending_operation",
        detail: `no pending operation ${pendingOperationId}`,
      };
    }

    const settledAt = nowIso(this.deps.clock);
    const eventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;

    type SettleCommit =
      | { readonly done: true; readonly receipt: SettleEffectReceipt }
      | { readonly done: false; readonly operation: PendingOperation; readonly routed: EventRoutingResult };

    const result = await this.deps.store.transact(known.executionId, async (tx): Promise<SettleCommit> => {
      // Re-read inside the transaction: the check and the write must see the same record, or two
      // deliveries of the same result could both pass "is it still pending?".
      const operation = await tx.pendingOperations.get(pendingOperationId);
      if (!operation) {
        return {
          done: true,
          receipt: {
            status: "rejected",
            reason: "unknown_pending_operation",
            detail: `no pending operation ${pendingOperationId}`,
          },
        };
      }
      if (operation.effectId !== effectId) {
        // Correlation is checked against persisted runtime truth, not against what the caller says.
        return {
          done: true,
          receipt: {
            status: "rejected",
            reason: "effect_mismatch",
            detail: `pending operation ${pendingOperationId} answers effect ${operation.effectId}, not ${effectId}`,
          },
        };
      }
      if (operation.status !== "pending") {
        return { done: true, receipt: { status: "already_settled", pendingOperationId } };
      }

      const request = await this.requestFacts(tx, operation);
      const context = await tx.executions.get(operation.executionId);
      if (!context || isTerminalLifecycle(context.lifecycle)) {
        const abandoned = markAbandoned(operation, settledAt);
        await tx.pendingOperations.update(abandoned);
        await this.journal(tx, {
          effectId,
          executionId: operation.executionId,
          effectKind: operation.effectKind,
          phase: "abandoned",
          activationId: null,
          pendingOperationId,
          at: settledAt,
          detail: { reason: context ? `execution ${context.lifecycle}` : "execution missing" },
        });
        return {
          done: true,
          receipt: {
            status: "rejected",
            reason: "execution_terminal",
            detail: `execution ${operation.executionId} cannot observe this result`,
          },
        };
      }

      await this.journal(tx, {
        effectId,
        executionId: operation.executionId,
        effectKind: operation.effectKind,
        phase: this.phaseFor(outcome),
        activationId: null,
        pendingOperationId,
        at: settledAt,
        detail: this.outcomeDetail(outcome, eventId),
      });
      await tx.pendingOperations.update(markSettled(operation, outcome.status, eventId, settledAt));

      const routed = await routeEvent({
        tx,
        envelope: this.resultEnvelope(eventId, operation, request, outcome, settledAt),
        deliveredAt: settledAt,
        recordTransition: async (executionId, from, to, at, reason) => {
          await tx.transitions.append({ executionId, from, to, at, activationId: null, reason });
        },
      });
      return { done: false, operation, routed };
    });

    if (result.done) return result.receipt;

    const { operation, routed } = result;
    const woke = routed.status === "delivered" && routed.wokeExecution;
    // Scheduling happens after the commit: an Execution is only made runnable once the observation
    // that made it runnable is durable.
    if (woke) await this.deps.wake(operation.executionId);
    return { status: "settled", pendingOperationId, executionId: operation.executionId, eventId, wokeExecution: woke };
  }

  // -- refusals and replays --------------------------------------------------

  /**
   * Turns a request the runtime will not perform into an observation.
   *
   * A refusal is still an answer. The Execution is told, through the same mailbox as any other
   * observation, and no executor was reached.
   */
  private async refuse(
    input: ProcessEffectsInput,
    proposal: EffectProposal,
    effectId: EffectId,
    correlationId: string,
    kind: Extract<EventKind, "effect.denied" | "effect.rejected">,
    reason: { readonly code: string; readonly message: string; readonly phase?: EffectJournalPhase },
  ): Promise<EffectDispatchRecord> {
    const at = nowIso(this.deps.clock);
    const eventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;
    const phase: EffectJournalPhase = reason.phase ?? "rejected";
    const executionId = input.context.executionId;

    await this.deps.store.transact(executionId, async (tx) => {
      await this.journal(tx, {
        effectId,
        executionId,
        effectKind: proposal.kind,
        phase,
        activationId: input.activationId,
        pendingOperationId: null,
        at,
        detail: { code: reason.code, message: reason.message, resultEventId: eventId },
      });
      const envelope: EventEnvelope = {
        eventId,
        destination: { executionId },
        kind,
        body: { effectId, effectKind: proposal.kind, code: reason.code, message: reason.message },
        correlationId,
        causationId: effectId,
        occurredAt: at,
      };
      await routeEvent({
        tx,
        envelope,
        deliveredAt: at,
        recordTransition: async (id, from, to, when, why) => {
          await tx.transitions.append({ executionId: id, from, to, at: when, activationId: null, reason: why });
        },
      });
    });

    return { effectId, effectKind: proposal.kind, correlationId, pendingOperationId: null, phase, settledInline: true };
  }

  /**
   * Answers a duplicate request from the prior authoritative outcome.
   *
   * The point of duplicate suppression is that a repeated request does not cause a second external
   * effect - and also that it does not produce a second, possibly different, account of what
   * happened. The Execution observes the original observation again, flagged as a replay.
   */
  private async replay(
    input: ProcessEffectsInput,
    proposal: UseCapabilityProposal,
    effectId: EffectId,
    correlationId: string,
    prior: PendingOperation,
    observation: JsonValue,
  ): Promise<EffectDispatchRecord> {
    const at = nowIso(this.deps.clock);
    const eventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;
    const executionId = input.context.executionId;

    await this.deps.store.transact(executionId, async (tx) => {
      await this.journal(tx, {
        effectId,
        executionId,
        effectKind: proposal.kind,
        phase: "replayed",
        activationId: input.activationId,
        pendingOperationId: prior.pendingOperationId,
        at,
        detail: {
          replayedFromEffectId: prior.effectId,
          idempotencyKey: prior.idempotencyKey,
          resultEventId: eventId,
        },
      });
      const envelope: EventEnvelope = {
        eventId,
        destination: { executionId },
        kind: "capability.completed",
        body: {
          effectId,
          effectKind: proposal.kind,
          pendingOperationId: prior.pendingOperationId,
          capability: proposal.capability,
          operation: proposal.operation,
          observation,
          replayed: true,
        },
        correlationId,
        causationId: effectId,
        occurredAt: at,
      };
      await routeEvent({
        tx,
        envelope,
        deliveredAt: at,
        recordTransition: async (id, from, to, when, why) => {
          await tx.transitions.append({ executionId: id, from, to, at: when, activationId: null, reason: why });
        },
      });
    });

    return {
      effectId,
      effectKind: proposal.kind,
      correlationId,
      pendingOperationId: prior.pendingOperationId,
      phase: "replayed",
      settledInline: true,
    };
  }

  /**
   * The duplicate/unresolved guard, mined from the legacy runtime's external-execution rules.
   *
   * A prior success replays. A prior *definite* failure does not block anything - suppressing
   * retries would turn a transient failure into a permanent one. A prior unknown outcome, or a
   * dispatch that was never resolved, blocks automatic redispatch of a consequential operation,
   * because "we do not know whether it happened" is not a licence to do it again.
   */
  private async checkPriorOperations(
    executionId: ExecutionId,
    idempotencyKey: IdempotencyKey,
    consequential: boolean,
  ): Promise<
    | { readonly kind: "proceed" }
    | { readonly kind: "refuse"; readonly code: string; readonly message: string }
    | { readonly kind: "replay"; readonly operation: PendingOperation; readonly observation: JsonValue }
  > {
    return this.deps.store.transact(executionId, async (tx) => {
      const prior = await tx.pendingOperations.findByIdempotencyKey(executionId, idempotencyKey);
      if (prior.length === 0) return { kind: "proceed" } as const;

      const succeeded = prior.find((operation) => operation.status === "settled" && operation.outcome === "success");
      if (succeeded) {
        const entries = await tx.effectJournal.listByEffect(succeeded.effectId);
        const completed = entries.find((entry) => entry.phase === "completed");
        return {
          kind: "replay",
          operation: succeeded,
          observation: (completed?.detail["observation"] ?? null) as JsonValue,
        } as const;
      }

      if (!consequential) return { kind: "proceed" } as const;

      const unresolved = prior.find((operation) => operation.status === "pending" && operation.dispatch === "dispatched");
      if (unresolved) {
        return {
          kind: "refuse",
          code: "prior_dispatch_unresolved",
          message: `an earlier dispatch of this exact operation (${unresolved.effectId}) has not resolved; automatic redispatch of a consequential operation is not authorized`,
        } as const;
      }

      const unknown = prior.find((operation) => operation.outcome === "unknown");
      if (unknown) {
        return {
          kind: "refuse",
          code: "prior_outcome_unknown",
          message: `the outcome of an earlier dispatch of this exact operation (${unknown.effectId}) is unknown; automatic retry is not authorized`,
        } as const;
      }

      return { kind: "proceed" } as const;
    });
  }

  // -- helpers ---------------------------------------------------------------

  /**
   * What the request was, recovered from the journal rather than from memory.
   *
   * The `authorized` entry is persisted runtime truth, so a settlement that arrives after a
   * reconstruction produces exactly the same Event body as one that arrives inline. Holding these
   * facts in a process-local map would have made the fast path and the recovered path differ.
   */
  private async requestFacts(tx: RuntimeTransaction, operation: PendingOperation): Promise<RequestFacts> {
    const entries = await tx.effectJournal.listByEffect(operation.effectId);
    const authorized = entries.find((entry) => entry.phase === "authorized");
    return {
      capability: String(authorized?.detail["capability"] ?? "unknown") as CapabilityId,
      operation: String(authorized?.detail["operation"] ?? "unknown") as OperationId,
      consequential: authorized?.detail["consequential"] !== false,
    };
  }

  private resultEnvelope(
    eventId: EventId,
    operation: PendingOperation,
    request: RequestFacts,
    outcome: CapabilityOutcome,
    at: string,
  ): EventEnvelope {
    const base = {
      eventId,
      destination: { executionId: operation.executionId },
      correlationId: operation.correlationId,
      causationId: operation.effectId,
      occurredAt: at,
    } as const;
    const shared = {
      effectId: operation.effectId,
      effectKind: operation.effectKind,
      pendingOperationId: operation.pendingOperationId,
      capability: request.capability,
      operation: request.operation,
    } as const;

    if (outcome.status === "success") {
      return { ...base, kind: "capability.completed", body: { ...shared, observation: outcome.observation, replayed: false } };
    }
    if (outcome.status === "failure") {
      return {
        ...base,
        kind: "capability.failed",
        body: { ...shared, error: outcome.error, retryable: outcome.retryable ?? false },
      };
    }
    return { ...base, kind: "capability.unknown", body: { ...shared, error: outcome.error } };
  }

  private phaseFor(outcome: CapabilityOutcome): EffectJournalPhase {
    if (outcome.status === "success") return "completed";
    return outcome.status === "failure" ? "failed" : "unknown_outcome";
  }

  private outcomeDetail(outcome: CapabilityOutcome, eventId: EventId): JsonObject {
    if (outcome.status === "success") return { observation: outcome.observation, resultEventId: eventId };
    return {
      error: { code: outcome.error.code, message: outcome.error.message },
      ...(outcome.status === "failure" ? { retryable: outcome.retryable ?? false } : {}),
      resultEventId: eventId,
    };
  }

  private deadlineFor(proposal: UseCapabilityProposal, constraints: AuthorizationConstraints, from: string): string {
    const requested = proposal.deadlineMs ?? this.deps.defaultEffectDeadlineMs;
    const capped = constraints.maxDeadlineMs !== undefined ? Math.min(requested, constraints.maxDeadlineMs) : requested;
    return new Date(new Date(from).getTime() + capped).toISOString();
  }

  private async consequentialityOf(operation: PendingOperation): Promise<boolean> {
    const entries = await this.deps.store.listEffectJournal(operation.executionId);
    const authorized = entries.find((entry) => entry.effectId === operation.effectId && entry.phase === "authorized");
    return authorized?.detail["consequential"] !== false;
  }

  private async journal(tx: RuntimeTransaction, entry: Parameters<RuntimeTransaction["effectJournal"]["append"]>[0]): Promise<void> {
    await tx.effectJournal.append(entry);
  }

  /**
   * Follows a dispatch that outlived its Activation.
   *
   * A failure while recording the settlement is deliberately not rethrown here: there is nobody to
   * throw to - the Activation that requested this ended long ago - and an unhandled rejection would
   * take down a runtime for one unwritable record. What it leaves behind is the honest state: a
   * pending operation still marked dispatched with no outcome, which is exactly the "something may
   * have happened" record the journal exists to preserve. Nothing redispatches it, and Slice I owns
   * turning that record into recovery.
   */
  private track(work: Promise<CapabilityOutcome>, pendingOperationId: PendingOperationId, effectId: EffectId): void {
    const tracked = work
      .then(async (outcome) => {
        await this.settle(pendingOperationId, effectId, outcome);
      })
      .catch(() => undefined)
      .finally(() => {
        this.inFlight.delete(tracked);
      });
    this.inFlight.add(tracked);
  }
}
