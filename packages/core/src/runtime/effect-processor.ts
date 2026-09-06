/**
 * The Effect gateway: everything between a controller's proposal and a delivered observation.
 *
 * The sequence is fixed and there is no way around it:
 *
 *   proposal            controller data, already structurally validated
 *        ↓ journal      requested
 *   authority ceiling   is this operation inside the Execution's CURRENT effective authority?
 *        ↓ journal      denied, and no policy is consulted, when it is not
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
 * **Exposure is not permission either.** Before policy is consulted at all, the operation named by a
 * `UseCapability` proposal is checked against the Execution's *current* effective operation
 * authority - the runtime-owned ceiling written when the Execution was created. That check lives
 * here rather than in a controller because this is the only place a dispatch can happen. A buggy or
 * hostile Active View resolver can therefore expose an operation it should not, and the operation
 * still does not run - and a permissive authorizer is never even asked about it, because the ceiling
 * check refuses before policy is consulted. An Active View is a narrowing of the ceiling; it is
 * never a substitute for it, and neither layer replaces the other:
 *
 * ```text
 * effective authority   the hard runtime ceiling, read fresh at dispatch
 * EffectAuthorizer      the concrete policy decision inside that ceiling
 * ```
 *
 * A stale or wrong view can cost an operation an unnecessary denial. It can never make one execute.
 *
 * **Dispatched is not completed.** `dispatch_started` is committed before the call, so a crash in
 * that window leaves evidence that something may have happened. Nothing automatically
 * redispatches such an operation, and a repeat request for a consequential operation whose outcome
 * is unresolved or unknown is refused rather than retried.
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
import { sameLogicalCapabilityRequest } from "../effects/duplicate-detection.ts";
import type { CapabilityId, EffectId, IdempotencyKey, OperationId, PendingOperationId } from "../effects/ids.ts";
import { EFFECT_ID_PREFIXES } from "../effects/ids.ts";
import type { EffectJournalPhase } from "../effects/journal.ts";
import type { PendingOperation, PendingOutcomeState } from "../effects/pending.ts";
import { createPendingOperation, markAbandoned, markDispatched, markSettled } from "../effects/pending.ts";
import type {
  EffectKind,
  EffectProposal,
  RequestUserInputProposal,
  SendMessageProposal,
  SpawnExecutionProposal,
  UseCapabilityProposal,
  WriteMemoryProposal,
} from "../effects/types.ts";
import { DISPATCHABLE_EFFECT_KINDS } from "../effects/types.ts";
import type { DefinitionId } from "../definitions/ids.ts";
import { isDefinitionId } from "../definitions/ids.ts";
import type { DefinitionKind } from "../definitions/types.ts";
import { definitionRef } from "../definitions/validation.ts";
import { createChildExecutionLink } from "../execution/child-link.ts";
import type { ExecutionContext } from "../execution/context.ts";
import { createExecutionContext, transitionContext } from "../execution/context.ts";
import type { ActivationId, ExecutionId } from "../execution/ids.ts";
import { executionId as toExecutionId } from "../execution/ids.ts";
import { isTerminalLifecycle } from "../execution/lifecycle.ts";
import type { ConfirmationRequest, ConfirmationRequestState } from "../execution/confirmation-request.ts";
import {
  createConfirmationRequest,
  markConfirmationAbandoned,
  markConfirmationApproved,
  markConfirmationDeclined,
  proposalDigest,
} from "../execution/confirmation-request.ts";
import { createPeerRequestLink, markPeerRequestLinkSettled } from "../execution/peer-request-link.ts";
import { canConsumeSpawnCredit, consumeSpawnCredit } from "../execution/structural-budget.ts";
import { createUserInputRequest, markUserInputAbandoned, markUserInputResponded } from "../execution/user-input-request.ts";
import {
  commitStructuredMemoryWrite,
  validateStructuredMemoryWrite,
} from "../execution/structured-memory.ts";
import { cloneWorkingNotesHandoff, workingNotesHandoffBudgetIssue } from "../execution/working-notes.ts";
import type { EventEnvelope, EventId } from "../interaction/event-envelope.ts";
import type { EventKind } from "../interaction/events.ts";
import type { ValueSchema } from "../schema/value-schema.ts";
import { validateValue } from "../schema/value-schema.ts";
import { attenuateChildOperations, authorizesOperation, createDelegatedOperationAuthority } from "../operations/authority.ts";
import type { DefinitionStore } from "../ports/definition-store.ts";
import type { Clock } from "../ports/clock.ts";
import { nowIso } from "../ports/clock.ts";
import type { CapabilityExecutor } from "../ports/capability-executor.ts";
import { UnknownCapabilityError } from "../ports/capability-executor.ts";
import type { EffectAuthorizer } from "../ports/effect-authorizer.ts";
import type { ConfirmationPolicy, ConfirmationRequirement } from "../ports/confirmation-policy.ts";
import { confirmationNotRequired, confirmationRequirementIssues } from "../ports/confirmation-policy.ts";
import type { CapabilityCatalog } from "../ports/capability-catalog.ts";
import { emptyCapabilityCatalog } from "../ports/capability-catalog.ts";
import type { IdGenerator } from "../ports/ids.ts";
import { ID_PREFIXES } from "../ports/ids.ts";
import type { InlineWaitBudget } from "../ports/inline-wait.ts";
import type { RuntimeStore, RuntimeTransaction } from "../ports/runtime-store.ts";
import { SpawnBudgetConcurrencyError, StructuredMemoryConcurrencyError } from "../ports/runtime-store.ts";
import type { JsonObject, JsonValue } from "../util/json.ts";
import type { EventRoutingResult } from "./event-router.ts";
import { routeEvent } from "./event-router.ts";

/**
 * How many times a `SpawnExecution` re-evaluates the structural spawn budget from fresh runtime
 * state after losing a compare-and-set race on it.
 *
 * A losing attempt commits nothing - `store.transact` discards the whole draft when the callback
 * throws - so retrying is always safe: there is no partial child, no spent credit, and no
 * already-committed spawn to duplicate. Bounded so that persistent contention becomes an explicit
 * refusal instead of an unbounded retry loop or a reason to fail the parent Activation.
 */
const MAX_SPAWN_BUDGET_CONTENTION_ATTEMPTS = 3;

/** The request facts a result Event needs, recovered from the journal at settlement time. */
interface RequestFacts {
  readonly capability: CapabilityId;
  readonly operation: OperationId;
  readonly consequential: boolean;
}

interface CapabilityDispatchSafety {
  readonly constraints: AuthorizationConstraints;
  readonly consequential: boolean;
  readonly scope: EffectIdempotencyScope;
  readonly idempotencyKey: IdempotencyKey;
}

type PriorOperationGuard =
  | { readonly kind: "proceed" }
  | { readonly kind: "refuse"; readonly code: string; readonly message: string }
  | { readonly kind: "replay"; readonly operation: PendingOperation; readonly observation: JsonValue };

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
  /**
   * Set only on the confirmed-dispatch (`resume`) path when an approved Effect did not dispatch: the
   * gated PendingOperation was settled `denied` / `rejected` / `conflicted` and one correlated Event
   * routed. `resolveConfirmation` maps this to its receipt; it is never persisted in an Activation
   * record because the ordinary proposal path never sets it.
   *
   * `memory.write_conflict` is a distinct outcome, not a flavour of `effect.rejected`: an
   * approved versioned `WriteMemory` whose optimistic precondition was no longer true when its
   * dispatch resolved. Nothing reached Structured Memory.
   */
  readonly refusal?: {
    readonly kind: Extract<EventKind, "effect.denied" | "effect.rejected" | "memory.write_conflict">;
    readonly code: string;
    readonly message: string;
  };
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

export interface SubmitUserInputInput {
  /** The runtime-minted `UserInputRequest` id. Correlation/integrity data, not an authorization. */
  readonly requestId: string;
  /** Validated against the request's stored schema before it settles anything. */
  readonly value: JsonValue;
}

export type SubmitUserInputReceipt =
  | {
      readonly status: "accepted";
      readonly requestId: string;
      readonly executionId: ExecutionId;
      readonly pendingOperationId: PendingOperationId;
      readonly eventId: EventId;
      readonly wokeExecution: boolean;
    }
  /** A response already settled this request. No second Event, no second settlement. */
  | { readonly status: "already_responded"; readonly requestId: string }
  /** The requesting Execution terminalized first; this request can never be answered. */
  | { readonly status: "abandoned"; readonly requestId: string }
  | {
      readonly status: "rejected";
      readonly reason: "unknown_request" | "execution_unavailable" | "invalid_value";
      readonly detail: string;
      /** Present for `invalid_value`: the schema issues, so a UI can re-prompt. */
      readonly issues?: readonly { readonly path: string; readonly message: string }[];
    };

export interface ResolveConfirmationInput {
  /** The runtime-minted `ConfirmationRequest` id. Correlation/integrity data, never an authority. */
  readonly confirmationId: string;
  /** A trusted decision. Never free prose - natural-language-to-decision resolution is above this. */
  readonly decision: "approve" | "decline";
}

export type ResolveConfirmationReceipt =
  /** Approved, the current authority still permits it, and the stored exact payload was dispatched. */
  | {
      readonly status: "dispatched";
      readonly confirmationId: string;
      readonly executionId: ExecutionId;
      readonly pendingOperationId: PendingOperationId;
      readonly phase: EffectJournalPhase;
      readonly settledInline: boolean;
    }
  /** Approved and authorized, but answered from a prior successful operation; no external dispatch. */
  | {
      readonly status: "replayed";
      readonly confirmationId: string;
      readonly executionId: ExecutionId;
      readonly pendingOperationId: PendingOperationId;
      readonly phase: "replayed";
      readonly settledInline: true;
    }
  /** Approved, but the current authority now denies it. Nothing dispatched; an ordinary denial. */
  | {
      readonly status: "denied";
      readonly confirmationId: string;
      readonly executionId: ExecutionId;
      readonly pendingOperationId: PendingOperationId;
      readonly code: string;
      readonly message: string;
    }
  /**
   * Approved and still authorized, but the runtime could not dispatch the stored payload (missing or
   * kind-mismatched child Definition, exhausted structural spawn budget, invalid/terminal message
   * destination). Nothing dispatched; the gated PendingOperation settled `rejected` and one
   * correlated `effect.rejected` Event routed. Distinct from `denied` (authorization) and `declined`
   * (human).
   */
  | {
      readonly status: "rejected";
      readonly confirmationId: string;
      readonly executionId: ExecutionId;
      readonly pendingOperationId: PendingOperationId;
      readonly code: string;
      readonly message: string;
    }
  /**
   * Approved and still authorized, but an approved versioned `WriteMemory`'s optimistic
   * `expectedRevision` precondition was no longer true when its dispatch resolved.
   * Nothing reached Structured Memory: the gated PendingOperation settled `conflicted`
   * (`dispatch: not_dispatched`) and one correlated `memory.write_conflict` Event routed. Distinct
   * from `denied` (authorization), `rejected` (never dispatchable), and `declined` (human).
   */
  | {
      readonly status: "conflicted";
      readonly confirmationId: string;
      readonly executionId: ExecutionId;
      readonly pendingOperationId: PendingOperationId;
      readonly code: string;
      readonly message: string;
    }
  /** Declined. Nothing dispatched; the dependency settled and one `confirmation.declined` Event routed. */
  | {
      readonly status: "declined";
      readonly confirmationId: string;
      readonly executionId: ExecutionId;
      readonly pendingOperationId: PendingOperationId;
      readonly eventId: EventId;
      readonly wokeExecution: boolean;
    }
  /** An approve/decline race: another decision already resolved this confirmation. */
  | { readonly status: "already_resolved"; readonly confirmationId: string; readonly state: ConfirmationRequestState }
  /** The requesting Execution terminalized first; nothing dispatched. */
  | { readonly status: "abandoned"; readonly confirmationId: string }
  | { readonly status: "unknown_confirmation"; readonly confirmationId: string };

export interface EffectProcessorDeps {
  readonly store: RuntimeStore;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly authorizer: EffectAuthorizer;
  /**
   * The exact-payload mechanical-confirmation gate, evaluated strictly after an `allow` and strictly
   * before dispatch. Defaults to `confirmationNotRequired`, so an unconfigured workload pays only
   * one branch per dispatchable Effect.
   */
  readonly confirmationPolicy: ConfirmationPolicy;
  /** Resolves the Definition a `SpawnExecution` names. Read-only; a child pins whatever resolves. */
  readonly definitions: DefinitionStore;
  /** Whether a controller is registered for a kind, so a child with no controller is refused early. */
  readonly hasController: (kind: DefinitionKind) => boolean;
  /**
   * Where a capability operation's baseline consequentiality is declared.
   *
   * Defaults to `emptyCapabilityCatalog`, which classifies nothing - and an unclassified operation
   * is treated as consequential, so an unwired catalog fails toward the conservative reading rather
   * than the convenient one.
   */
  readonly catalog: CapabilityCatalog;
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
   * semantic gain.
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

  /**
   * Delivers a trusted response to an open `RequestUserInput`.
   *
   * The trust placement mirrors `settleEffect` / `deliverExternalInput` / `cancelExecution`: an
   * internet-facing application authenticates the human/application *before* this method is reached.
   * The `requestId` grants nothing - the runtime reads the exact `UserInputRequest`, checks that its
   * source Execution can still observe it, validates the value against the *stored* schema, and only
   * then settles the exact PendingOperation with one correlated `user.input` Event.
   *
   * ```text
   * unknown / already responded / abandoned request  -> settles nothing
   * value fails the stored schema                     -> explicit validation rejection; request open
   * requesting Execution terminal / cancelling        -> request abandoned; no Event
   * otherwise                                         -> PendingOperation settles success,
   *                                                     UserInputRequest -> responded,
   *                                                     one `user.input` Event, wake if it matched
   * ```
   *
   * A duplicate response produces no second Event and does not settle twice.
   */
  async submitUserInput(input: SubmitUserInputInput): Promise<SubmitUserInputReceipt> {
    const existing = await this.deps.store.readUserInputRequest(input.requestId);
    if (!existing) {
      return { status: "rejected", reason: "unknown_request", detail: `no user input request ${input.requestId}` };
    }
    if (existing.state === "responded") return { status: "already_responded", requestId: input.requestId };
    if (existing.state === "abandoned") return { status: "abandoned", requestId: input.requestId };

    // Validate against the STORED schema, strictly - a structured response to a text request is a
    // rejection, never a silent stringify. An invalid value settles nothing and leaves the request
    // open so a UI can re-prompt.
    const validation = validateValue(existing.schema, input.value);
    if (!validation.ok) {
      return {
        status: "rejected",
        reason: "invalid_value",
        detail: validation.issues.map((i) => (i.path ? `${i.path}: ${i.message}` : i.message)).join("; "),
        issues: validation.issues.map((i) => ({ path: i.path, message: i.message })),
      };
    }
    const value = validation.value as JsonValue;

    const settledAt = nowIso(this.deps.clock);
    const eventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;

    type SettleCommit =
      | { readonly done: true; readonly receipt: SubmitUserInputReceipt }
      | {
          readonly done: false;
          readonly executionId: ExecutionId;
          readonly pendingOperationId: PendingOperationId;
          readonly routed: EventRoutingResult;
        };

    const result = await this.deps.store.transact(existing.executionId, async (tx): Promise<SettleCommit> => {
      // Re-read inside the transaction: the check and the write must see the same record, so a
      // duplicate response cannot both pass "is it still open?".
      const request = await tx.userInputRequests.get(input.requestId);
      if (!request) {
        return { done: true, receipt: { status: "rejected", reason: "unknown_request", detail: `no user input request ${input.requestId}` } };
      }
      if (request.state === "responded") return { done: true, receipt: { status: "already_responded", requestId: input.requestId } };
      if (request.state === "abandoned") return { done: true, receipt: { status: "abandoned", requestId: input.requestId } };

      const operation = await tx.pendingOperations.get(request.pendingOperationId);
      if (!operation || operation.status !== "pending") {
        await tx.userInputRequests.update(markUserInputAbandoned(request, settledAt));
        return { done: true, receipt: { status: "abandoned", requestId: input.requestId } };
      }

      const context = await tx.executions.get(request.executionId);
      const cancelRequest = await tx.cancellationRequests.get(request.executionId);
      if (!context || isTerminalLifecycle(context.lifecycle) || cancelRequest?.state === "pending") {
        await tx.pendingOperations.update(markAbandoned(operation, settledAt));
        await tx.userInputRequests.update(markUserInputAbandoned(request, settledAt));
        await this.journal(tx, {
          effectId: request.effectId,
          executionId: request.executionId,
          effectKind: "request_user_input",
          phase: "abandoned",
          activationId: null,
          pendingOperationId: operation.pendingOperationId,
          at: settledAt,
          detail: {
            reason: !context
              ? "execution missing"
              : cancelRequest?.state === "pending"
                ? "execution cancellation pending"
                : `execution ${context.lifecycle}`,
            requestId: input.requestId,
          },
        });
        return {
          done: true,
          receipt: {
            status: "rejected",
            reason: "execution_unavailable",
            detail: `execution ${request.executionId} cannot observe this response`,
          },
        };
      }

      await this.journal(tx, {
        effectId: request.effectId,
        executionId: request.executionId,
        effectKind: "request_user_input",
        phase: "completed",
        activationId: null,
        pendingOperationId: operation.pendingOperationId,
        at: settledAt,
        detail: { requestId: input.requestId, resultEventId: eventId },
      });
      await tx.pendingOperations.update(markSettled(operation, "success", eventId, settledAt));
      await tx.userInputRequests.update(markUserInputResponded(request, settledAt));

      const routed = await routeEvent({
        tx,
        envelope: {
          eventId,
          destination: { executionId: request.executionId },
          kind: "user.input",
          body: {
            effectId: request.effectId,
            effectKind: "request_user_input",
            pendingOperationId: operation.pendingOperationId,
            requestId: request.requestId,
            value,
          },
          correlationId: request.correlationId,
          causationId: request.effectId,
          occurredAt: settledAt,
        },
        deliveredAt: settledAt,
        recordTransition: async (executionId, from, to, at, reason) => {
          await tx.transitions.append({ executionId, from, to, at, activationId: null, reason });
        },
      });
      return { done: false, executionId: request.executionId, pendingOperationId: operation.pendingOperationId, routed };
    });

    if (result.done) return result.receipt;
    const woke = result.routed.status === "delivered" && result.routed.wokeExecution;
    if (woke) await this.deps.wake(result.executionId);
    return {
      status: "accepted",
      requestId: input.requestId,
      executionId: result.executionId,
      pendingOperationId: result.pendingOperationId,
      eventId,
      wokeExecution: woke,
    };
  }

  // -- one proposal ----------------------------------------------------------

  private async processOne(input: ProcessEffectsInput, proposal: EffectProposal): Promise<EffectDispatchRecord> {
    const executionId = input.context.executionId;
    const effectId = this.deps.ids.next(EFFECT_ID_PREFIXES.effect) as EffectId;
    const correlationId = proposal.requestKey ?? effectId;
    const requestedAt = nowIso(this.deps.clock);

    const initial = await this.deps.store.transact(executionId, async (tx) => {
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
      if (await this.abandonIfCancellationPending(tx, input, proposal, effectId, requestedAt)) {
        return "cancelled" as const;
      }
      // A request key names one outstanding operation. Reusing a live one would make two results
      // indistinguishable to the controller waiting on it.
      const live = await tx.pendingOperations.listByExecution(executionId);
      return live.some((operation) => operation.status === "pending" && operation.correlationId === correlationId)
        ? "collision" as const
        : "clear" as const;
    });

    if (initial === "cancelled") {
      return { effectId, effectKind: proposal.kind, correlationId, pendingOperationId: null, phase: "abandoned", settledInline: false };
    }

    if (initial === "collision") {
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
        message: `effect kind "${proposal.kind}" is accepted vocabulary but is not implemented`,
      });
    }

    if (proposal.kind === "spawn_execution") {
      return this.dispatchSpawn(input, proposal, effectId, correlationId, requestedAt);
    }

    if (proposal.kind === "write_memory") {
      return this.dispatchWriteMemory(input, proposal, effectId, correlationId, requestedAt);
    }

    if (proposal.kind === "send_message") {
      return this.dispatchSendMessage(input, proposal, effectId, correlationId, requestedAt);
    }

    if (proposal.kind === "request_user_input") {
      return this.dispatchRequestUserInput(input, proposal, effectId, correlationId, requestedAt);
    }

    // The ceiling, before policy. An operation outside the Execution's CURRENT effective authority
    // never reaches the authorizer at all, so a permissive policy cannot be handed a question that
    // an Active View bug invented.
    const ceiling = await this.withinEffectiveAuthority(executionId, proposal as UseCapabilityProposal);
    if (ceiling !== null) {
      return this.refuse(input, proposal, effectId, correlationId, "effect.denied", {
        code: ceiling.code,
        message: ceiling.message,
        phase: "denied",
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

    const capabilityProposal = proposal as UseCapabilityProposal;
    const safety = this.capabilityDispatchSafety(executionId, effectId, capabilityProposal, decision);

    // Recognise an already-known duplicate before asking a human to approve work the runtime will
    // not dispatch. This is only an early answer: dispatchCapability repeats the guard in the same
    // transaction as dispatch intent so two proposals that became gated concurrently are safe too.
    const prior = await this.checkPriorOperations(
      executionId,
      safety.idempotencyKey,
      safety.consequential,
      capabilityProposal,
    );
    if (prior.kind === "refuse") {
      return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
        code: prior.code,
        message: prior.message,
      });
    }
    if (prior.kind === "replay") {
      return this.replay(input, capabilityProposal, effectId, correlationId, prior.operation, prior.observation);
    }

    // The confirmation gate, strictly after `allow` and strictly before dispatch. If it fires, the
    // exact payload is persisted and nothing runs until a trusted approve.
    const gated = await this.gateOrNull(input, proposal, effectId, correlationId, requestedAt, decision.grantId);
    if (gated) return gated;

    return this.dispatchCapability(input, capabilityProposal, effectId, correlationId, decision);
  }

  // -- mechanical confirmation gate --------------------------------------

  /**
   * Consults the confirmation policy for one authorized Effect, and gates it when required.
   *
   * Returns `null` to proceed to ordinary dispatch, or an `EffectDispatchRecord` when the Effect is
   * now waiting for an exact-payload confirmation. A policy that throws or answers malformedly fails
   * *conservative* - the Effect is gated rather than dispatched unreviewed - mirroring the
   * authorizer failing closed toward deny.
   */
  private async gateOrNull(
    input: ProcessEffectsInput,
    proposal: EffectProposal,
    effectId: EffectId,
    correlationId: string,
    requestedAt: string,
    grantId: string,
  ): Promise<EffectDispatchRecord | null> {
    let requirement: unknown;
    try {
      requirement = await this.deps.confirmationPolicy.requires({
        executionId: input.context.executionId,
        ownerExecutionId: input.context.ownerExecutionId,
        rootExecutionId: input.context.rootExecutionId,
        definition: input.definition,
        activationId: input.activationId,
        effectId,
        effectKind: proposal.kind,
        proposal,
        grantId,
        requestedAt,
      });
    } catch (error) {
      requirement = {
        required: true,
        reason: `confirmation policy error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    const issues = confirmationRequirementIssues(requirement);
    const resolved: ConfirmationRequirement =
      issues.length > 0
        ? { required: true, reason: `invalid confirmation requirement: ${issues.map((i) => `${i.path}: ${i.message}`).join("; ")}` }
        : (requirement as ConfirmationRequirement);
    if (!resolved.required) return null;
    return this.gateForConfirmation(input, proposal, effectId, correlationId, resolved.reason ?? null);
  }

  /**
   * Persists the exact payload, an Effect PendingOperation (not yet dispatched), and a
   * ConfirmationRequest - one transaction, so the gate is atomic.
   */
  private async gateForConfirmation(
    input: ProcessEffectsInput,
    proposal: EffectProposal,
    effectId: EffectId,
    correlationId: string,
    reason: string | null,
  ): Promise<EffectDispatchRecord> {
    const executionId = input.context.executionId;
    const digest = proposalDigest(proposal);

    type Commit =
      | { readonly kind: "abandoned" }
      | { readonly kind: "gated"; readonly pendingOperationId: PendingOperationId; readonly confirmationId: string };

    const commit = await this.deps.store.transact(executionId, async (tx): Promise<Commit> => {
      const now = nowIso(this.deps.clock);
      if (await this.abandonIfCancellationPending(tx, input, proposal, effectId, now)) return { kind: "abandoned" };
      const pendingOperationId = this.deps.ids.next(EFFECT_ID_PREFIXES.pendingOperation) as PendingOperationId;
      const confirmationId = this.deps.ids.next(ID_PREFIXES.confirmationRequest);

      await this.journal(tx, {
        effectId,
        executionId,
        effectKind: proposal.kind,
        phase: "authorized",
        activationId: input.activationId,
        pendingOperationId,
        at: now,
        detail: { confirmationRequired: true, confirmationId, proposalDigest: digest, ...(reason ? { reason } : {}) },
      });

      // Deliberately NOT markDispatched: the concrete payload is authorized, but its dispatch is
      // gated on a trusted approval.
      const pending = createPendingOperation({
        pendingOperationId,
        executionId,
        effectId,
        effectKind: proposal.kind,
        correlationId,
        causationId: input.activationId,
        idempotencyKey: `confirm:${effectId}` as IdempotencyKey,
        createdAt: now,
        // A human may take arbitrarily long, and may never decide.
        deadline: null,
      });
      await tx.pendingOperations.insert(pending);
      await this.journal(tx, {
        effectId,
        executionId,
        effectKind: proposal.kind,
        phase: "confirmation_pending",
        activationId: input.activationId,
        pendingOperationId,
        at: now,
        detail: { confirmationId, proposalDigest: digest },
      });
      await tx.confirmationRequests.insert(
        createConfirmationRequest({
          confirmationId,
          executionId,
          effectId,
          effectKind: proposal.kind,
          pendingOperationId,
          correlationId,
          proposal,
          reason,
          createdAt: now,
        }),
      );
      return { kind: "gated", pendingOperationId, confirmationId };
    });

    if (commit.kind === "abandoned") {
      return { effectId, effectKind: proposal.kind, correlationId, pendingOperationId: null, phase: "abandoned", settledInline: false };
    }
    return {
      effectId,
      effectKind: proposal.kind,
      correlationId,
      pendingOperationId: commit.pendingOperationId,
      phase: "confirmation_pending",
      settledInline: false,
    };
  }

  /**
   * Resolves one pending exact-payload confirmation.
   *
   * A trusted runtime entry point at the same level as `settleEffect` / `submitUserInput`. The
   * `confirmationId` grants nothing: an internet-facing application authenticates the human/UI before
   * reaching here, and the decision is a trusted `approve` / `decline`, never free prose.
   *
   * ```text
   * decline   -> ConfirmationRequest declined, PendingOperation settled `declined`, one correlated
   *              `confirmation.declined` Event; nothing dispatched
   * approve   -> ConfirmationRequest approved (linearization point), then the CURRENT authority is
   *              re-checked on the STORED proposal:
   *                still allowed -> apply the ordinary prior-operation guard, then either replay a
   *                                 prior success or dispatch the STORED exact payload, reusing and
   *                                 settling this confirmation's PendingOperation; no model turn
   *                now denied    -> nothing dispatched; an ordinary authorization denial
   * ```
   *
   * An approve/decline race linearizes on the ConfirmationRequest state: exactly one call moves it
   * off `pending`. A duplicate approval therefore cannot dispatch twice. A dispatch intent already
   * committed cannot be rolled back by a later contradictory decision.
   */
  async resolveConfirmation(input: ResolveConfirmationInput): Promise<ResolveConfirmationReceipt> {
    const existing = await this.deps.store.readConfirmationRequest(input.confirmationId);
    if (!existing) return { status: "unknown_confirmation", confirmationId: input.confirmationId };
    if (existing.state !== "pending") {
      return { status: "already_resolved", confirmationId: input.confirmationId, state: existing.state };
    }
    return input.decision === "decline" ? this.declineConfirmation(existing) : this.approveConfirmation(existing);
  }

  private async declineConfirmation(request: ConfirmationRequest): Promise<ResolveConfirmationReceipt> {
    const at = nowIso(this.deps.clock);
    const eventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;

    type Commit =
      | { readonly done: true; readonly receipt: ResolveConfirmationReceipt }
      | {
          readonly done: false;
          readonly executionId: ExecutionId;
          readonly pendingOperationId: PendingOperationId;
          readonly routed: EventRoutingResult;
        };

    const result = await this.deps.store.transact(request.executionId, async (tx): Promise<Commit> => {
      const current = await tx.confirmationRequests.get(request.confirmationId);
      if (!current || current.state !== "pending") {
        return { done: true, receipt: { status: "already_resolved", confirmationId: request.confirmationId, state: current?.state ?? "abandoned" } };
      }
      const operation = await tx.pendingOperations.get(current.pendingOperationId);
      if (!operation || operation.status !== "pending") {
        await tx.confirmationRequests.update(markConfirmationAbandoned(current, at));
        return { done: true, receipt: { status: "abandoned", confirmationId: request.confirmationId } };
      }
      const context = await tx.executions.get(request.executionId);
      const cancelRequest = await tx.cancellationRequests.get(request.executionId);
      if (!context || isTerminalLifecycle(context.lifecycle) || cancelRequest?.state === "pending") {
        await tx.pendingOperations.update(markAbandoned(operation, at));
        await tx.confirmationRequests.update(markConfirmationAbandoned(current, at));
        await this.journal(tx, {
          effectId: current.effectId,
          executionId: request.executionId,
          effectKind: current.effectKind,
          phase: "abandoned",
          activationId: null,
          pendingOperationId: operation.pendingOperationId,
          at,
          detail: { reason: "execution unavailable", confirmationId: current.confirmationId },
        });
        return { done: true, receipt: { status: "abandoned", confirmationId: request.confirmationId } };
      }

      await tx.confirmationRequests.update(markConfirmationDeclined(current, at));
      await this.journal(tx, {
        effectId: current.effectId,
        executionId: request.executionId,
        effectKind: current.effectKind,
        phase: "declined",
        activationId: null,
        pendingOperationId: operation.pendingOperationId,
        at,
        detail: { confirmationId: current.confirmationId, proposalDigest: current.proposalDigest, resultEventId: eventId },
      });
      await tx.pendingOperations.update(markSettled(operation, "declined", eventId, at));
      const routed = await routeEvent({
        tx,
        envelope: {
          eventId,
          destination: { executionId: request.executionId },
          kind: "confirmation.declined",
          body: {
            effectId: current.effectId,
            effectKind: current.effectKind,
            pendingOperationId: operation.pendingOperationId,
            confirmationId: current.confirmationId,
            proposalDigest: current.proposalDigest,
          },
          correlationId: current.correlationId,
          causationId: current.effectId,
          occurredAt: at,
        },
        deliveredAt: at,
        recordTransition: async (executionId, from, to, when, why) => {
          await tx.transitions.append({ executionId, from, to, at: when, activationId: null, reason: why });
        },
      });
      return { done: false, executionId: request.executionId, pendingOperationId: operation.pendingOperationId, routed };
    });

    if (result.done) return result.receipt;
    const woke = result.routed.status === "delivered" && result.routed.wokeExecution;
    if (woke) await this.deps.wake(result.executionId);
    return {
      status: "declined",
      confirmationId: request.confirmationId,
      executionId: result.executionId,
      pendingOperationId: result.pendingOperationId,
      eventId,
      wokeExecution: woke,
    };
  }

  private async approveConfirmation(request: ConfirmationRequest): Promise<ResolveConfirmationReceipt> {
    const claimedAt = nowIso(this.deps.clock);

    // Claim the approval atomically. This is the linearization point: exactly one approve/decline
    // moves the state off `pending`, so a duplicate approval cannot dispatch twice.
    type Claim =
      | { readonly ok: true; readonly operation: PendingOperation }
      | { readonly ok: false; readonly receipt: ResolveConfirmationReceipt };
    const claim = await this.deps.store.transact(request.executionId, async (tx): Promise<Claim> => {
      const current = await tx.confirmationRequests.get(request.confirmationId);
      if (!current || current.state !== "pending") {
        return { ok: false, receipt: { status: "already_resolved", confirmationId: request.confirmationId, state: current?.state ?? "abandoned" } };
      }
      const operation = await tx.pendingOperations.get(current.pendingOperationId);
      if (!operation || operation.status !== "pending" || operation.dispatch === "dispatched") {
        await tx.confirmationRequests.update(markConfirmationAbandoned(current, claimedAt));
        return { ok: false, receipt: { status: "abandoned", confirmationId: request.confirmationId } };
      }
      const context = await tx.executions.get(request.executionId);
      const cancelRequest = await tx.cancellationRequests.get(request.executionId);
      if (!context || isTerminalLifecycle(context.lifecycle) || cancelRequest?.state === "pending") {
        await tx.pendingOperations.update(markAbandoned(operation, claimedAt));
        await tx.confirmationRequests.update(markConfirmationAbandoned(current, claimedAt));
        await this.journal(tx, {
          effectId: current.effectId,
          executionId: request.executionId,
          effectKind: current.effectKind,
          phase: "abandoned",
          activationId: null,
          pendingOperationId: operation.pendingOperationId,
          at: claimedAt,
          detail: { reason: "execution unavailable", confirmationId: current.confirmationId },
        });
        return { ok: false, receipt: { status: "abandoned", confirmationId: request.confirmationId } };
      }
      // The human approved. The Effect outcome is decided by the CURRENT-authority re-check below.
      await tx.confirmationRequests.update(markConfirmationApproved(current, claimedAt));
      return { ok: true, operation };
    });
    if (!claim.ok) return claim.receipt;

    const operation = claim.operation;
    const context = await this.deps.store.readExecution(request.executionId);
    if (!context || isTerminalLifecycle(context.lifecycle)) {
      return this.abandonApprovedConfirmation(request, operation, "execution terminal after approval");
    }

    const resumeActivationId = (operation.causationId ?? request.effectId) as ActivationId;
    const resumeInput: ProcessEffectsInput = {
      context,
      definition: context.definition,
      activationId: resumeActivationId,
      proposals: [],
    };

    const resume = { pendingOperationId: operation.pendingOperationId, confirmationId: request.confirmationId } as const;

    // Re-establish current dispatch permission on the STORED exact proposal, then enter the resumed
    // dispatch path. Approval never widens or replaces authority - an old approval cannot override a
    // revocation that happened while it waited - and the resumed dispatch settles the SAME gated
    // PendingOperation for every outcome: dispatched, authorization-denied, or runtime-rejected.
    if (request.effectKind === "use_capability") {
      const proposal = request.proposal as UseCapabilityProposal;
      const ceiling = await this.withinEffectiveAuthority(request.executionId, proposal);
      if (ceiling !== null) return this.denyApprovedConfirmation(request, operation, ceiling.code, ceiling.message);
      const decision = await this.decide(resumeInput, proposal, request.effectId, nowIso(this.deps.clock));
      if (decision.decision === "deny") return this.denyApprovedConfirmation(request, operation, decision.code, decision.message);
      if (this.deps.capabilities === null) {
        return this.denyApprovedConfirmation(
          request,
          operation,
          "capability_execution_unavailable",
          "this deployment has no CapabilityExecutor, so an approved capability still cannot be performed",
        );
      }
      const record = await this.dispatchCapability(resumeInput, proposal, request.effectId, request.correlationId, decision, resume);
      await this.wakeRequesterIfReady(request.executionId);
      return this.receiptForResumedRecord(request, operation, record);
    }

    if (request.effectKind === "spawn_execution") {
      // No second `decide` here: `dispatchSpawn` owns the single fresh authorization check for the
      // resumed dispatch, and its refusal paths now settle this exact PendingOperation.
      const record = await this.dispatchSpawn(
        resumeInput,
        request.proposal as SpawnExecutionProposal,
        request.effectId,
        request.correlationId,
        nowIso(this.deps.clock),
        resume,
      );
      await this.wakeRequesterIfReady(request.executionId);
      return this.receiptForResumedRecord(request, operation, record);
    }

    if (request.effectKind === "write_memory") {
      const record = await this.dispatchWriteMemory(
        resumeInput,
        request.proposal as WriteMemoryProposal,
        request.effectId,
        request.correlationId,
        nowIso(this.deps.clock),
        resume,
      );
      await this.wakeRequesterIfReady(request.executionId);
      return this.receiptForResumedRecord(request, operation, record);
    }

    if (request.effectKind === "send_message") {
      const record = await this.dispatchSendMessage(
        resumeInput,
        request.proposal as SendMessageProposal,
        request.effectId,
        request.correlationId,
        nowIso(this.deps.clock),
        resume,
      );
      await this.wakeRequesterIfReady(request.executionId);
      return this.receiptForResumedRecord(request, operation, record);
    }

    return this.denyApprovedConfirmation(
      request,
      operation,
      "effect_kind_not_confirmable",
      `effect kind "${request.effectKind}" cannot be dispatched from an approved confirmation`,
    );
  }

  /**
   * Maps the record a resumed dispatch returned to a `resolveConfirmation` receipt.
   *
   * A refusal record (`refusal` set by `refuse` on the resume path, by `dispatchCapability`'s
   * in-transaction authority recheck, or by `dispatchWriteMemory`'s optimistic conflict path) means
   * the gated PendingOperation was already settled `denied` / `rejected` / `conflicted` and one
   * correlated Event routed - the receipt just reports which. An `abandoned` phase means the
   * requester terminalized mid-resume. A replay reports that no external dispatch occurred;
   * otherwise the stored payload dispatched.
   */
  private receiptForResumedRecord(
    request: ConfirmationRequest,
    operation: PendingOperation,
    record: EffectDispatchRecord,
  ): ResolveConfirmationReceipt {
    if (record.refusal) {
      const shared = {
        confirmationId: request.confirmationId,
        executionId: request.executionId,
        pendingOperationId: operation.pendingOperationId,
        code: record.refusal.code,
        message: record.refusal.message,
      } as const;
      if (record.refusal.kind === "effect.denied") return { status: "denied", ...shared };
      if (record.refusal.kind === "memory.write_conflict") return { status: "conflicted", ...shared };
      return { status: "rejected", ...shared };
    }
    if (record.phase === "abandoned") {
      return { status: "abandoned", confirmationId: request.confirmationId };
    }
    if (record.phase === "replayed") {
      return {
        status: "replayed",
        confirmationId: request.confirmationId,
        executionId: request.executionId,
        pendingOperationId: operation.pendingOperationId,
        phase: "replayed",
        settledInline: true,
      };
    }
    return this.dispatchedReceipt(request, operation, record);
  }

  private dispatchedReceipt(
    request: ConfirmationRequest,
    operation: PendingOperation,
    record: EffectDispatchRecord,
  ): ResolveConfirmationReceipt {
    return {
      status: "dispatched",
      confirmationId: request.confirmationId,
      executionId: request.executionId,
      pendingOperationId: operation.pendingOperationId,
      phase: record.phase,
      settledInline: record.settledInline,
    };
  }

  /**
   * The confirmed-dispatch path runs outside an Activation, so a result Event that transitioned the
   * requester WAITING -> READY inside a dispatch transaction still needs to be enqueued. (The
   * capability path settles through `settle()`, which already enqueues; this covers the
   * `spawn`/`send` acknowledgements.)
   */
  private async wakeRequesterIfReady(executionId: ExecutionId): Promise<void> {
    const context = await this.deps.store.readExecution(executionId);
    if (context?.lifecycle === "READY") await this.deps.wake(executionId);
  }

  /** Approved, but the current authority now denies it: an ordinary denial, nothing dispatched. */
  private async denyApprovedConfirmation(
    request: ConfirmationRequest,
    operation: PendingOperation,
    code: string,
    message: string,
  ): Promise<ResolveConfirmationReceipt> {
    const at = nowIso(this.deps.clock);
    const eventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;

    const woke = await this.deps.store.transact(request.executionId, async (tx): Promise<ExecutionId | null> => {
      const current = await tx.pendingOperations.get(operation.pendingOperationId);
      if (!current || current.status !== "pending") return null;
      const context = await tx.executions.get(request.executionId);
      if (!context || isTerminalLifecycle(context.lifecycle)) {
        await tx.pendingOperations.update(markAbandoned(current, at));
        return null;
      }
      await this.journal(tx, {
        effectId: request.effectId,
        executionId: request.executionId,
        effectKind: request.effectKind,
        phase: "denied",
        activationId: null,
        pendingOperationId: operation.pendingOperationId,
        at,
        detail: { code, message, confirmationId: request.confirmationId, resultEventId: eventId, reason: "authority changed while confirmation was pending" },
      });
      await tx.pendingOperations.update(markSettled(current, "denied", eventId, at));
      const routed = await routeEvent({
        tx,
        envelope: {
          eventId,
          destination: { executionId: request.executionId },
          kind: "effect.denied",
          body: { effectId: request.effectId, effectKind: request.effectKind, code, message },
          correlationId: request.correlationId,
          causationId: request.effectId,
          occurredAt: at,
        },
        deliveredAt: at,
        recordTransition: async (executionId, from, to, when, why) => {
          await tx.transitions.append({ executionId, from, to, at: when, activationId: null, reason: why });
        },
      });
      return routed.status === "delivered" && routed.wokeExecution ? request.executionId : null;
    });

    if (woke) await this.deps.wake(woke);
    return {
      status: "denied",
      confirmationId: request.confirmationId,
      executionId: request.executionId,
      pendingOperationId: operation.pendingOperationId,
      code,
      message,
    };
  }

  private async abandonApprovedConfirmation(
    request: ConfirmationRequest,
    operation: PendingOperation,
    reason: string,
  ): Promise<ResolveConfirmationReceipt> {
    const at = nowIso(this.deps.clock);
    await this.deps.store.transact(request.executionId, async (tx) => {
      const current = await tx.pendingOperations.get(operation.pendingOperationId);
      if (current && current.status === "pending") {
        await tx.pendingOperations.update(markAbandoned(current, at));
        await this.journal(tx, {
          effectId: request.effectId,
          executionId: request.executionId,
          effectKind: request.effectKind,
          phase: "abandoned",
          activationId: null,
          pendingOperationId: operation.pendingOperationId,
          at,
          detail: { reason, confirmationId: request.confirmationId },
        });
      }
    });
    return { status: "abandoned", confirmationId: request.confirmationId };
  }

  /**
   * The runtime-owned ceiling, read fresh from the store this Harness writes it into.
   *
   * Returns `null` when the operation is inside the ceiling, and a refusal reason otherwise. Two
   * distinct reasons, because they are two distinct mistakes: an Execution created without a grant
   * has no ceiling at all, and an Execution whose ceiling does not contain this operation was never
   * permitted it. Neither reads as "unrestricted" - an Execution with no configured authority can
   * dispatch nothing, exactly as an unconfigured authorizer permits nothing.
   *
   * There is deliberately no second source here and no cache. `readOperationAuthority` is the same
   * runtime-owned facet the read-only exposure port reads, so the ceiling that governs a dispatch
   * and the ceiling an Active View was cut from cannot drift into two different answers. A grant
   * narrowed after a projection was built is therefore *seen* by this check, which is what makes an
   * old projection a record of what the model was shown rather than a credential to dispatch with.
   */
  private async withinEffectiveAuthority(
    executionId: ExecutionId,
    proposal: UseCapabilityProposal,
  ): Promise<{ readonly code: string; readonly message: string } | null> {
    const authority = (await this.deps.store.readOperationAuthority(executionId)) ?? null;
    if (!authority) {
      return {
        code: "no_effective_operation_authority",
        message:
          `execution ${executionId} has no effective operation authority, so it cannot use ` +
          `${proposal.capability}/${proposal.operation}; nobody granting anything is not everybody granting everything`,
      };
    }
    if (!authorizesOperation(authority, { capability: proposal.capability, operation: proposal.operation })) {
      return {
        code: "operation_outside_effective_authority",
        message:
          `${proposal.capability}/${proposal.operation} is not in the current effective operation authority ` +
          `${authority.authorityId} (version ${authority.version}) for execution ${executionId}; ` +
          "being exposed, projected, or selected is never permission",
      };
    }
    return null;
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

  /**
   * The cancellation check that participates in every dispatch-intent transaction.
   *
   * A check outside that transaction is only an optimization: cancellation could commit between
   * the check and `dispatch_started`. This helper is therefore called again inside the atomic
   * capability, child-creation, and peer-delivery commits (and before refusal/replay Events).
   */
  private async abandonIfCancellationPending(
    tx: RuntimeTransaction,
    input: ProcessEffectsInput,
    proposal: EffectProposal,
    effectId: EffectId,
    at: string,
    resumePendingOperationId?: PendingOperationId,
  ): Promise<boolean> {
    const request = await tx.cancellationRequests.get(input.context.executionId);
    if (request === undefined || request.state !== "pending") return false;
    // On the confirmed-dispatch path a gated PendingOperation already exists; abandon it in the same
    // transaction rather than leaving it pending for terminal cleanup, so an approved confirmation
    // whose Execution is cancelling mid-resume still linearizes to exactly one terminal state.
    if (resumePendingOperationId !== undefined) {
      const pending = await tx.pendingOperations.get(resumePendingOperationId);
      if (pending && pending.status === "pending") {
        await tx.pendingOperations.update(markAbandoned(pending, at));
      }
    }
    await this.journal(tx, {
      effectId,
      executionId: input.context.executionId,
      effectKind: proposal.kind,
      phase: "abandoned",
      activationId: input.activationId,
      pendingOperationId: resumePendingOperationId ?? null,
      at,
      detail: { reason: "execution cancellation committed before dispatch" },
    });
    return true;
  }

  // -- spawn dispatch ------------------------------------------------------

  /**
   * Turns a `SpawnExecution` proposal into a real, independently managed child - or refuses, and
   * creates nothing.
   *
   * The order is fixed, and every refusal happens before any write:
   *
   * ```text
   * policy decision                  deny                    -> effect.denied
   * resolve the Definition           missing / no controller -> effect.rejected
   * one transaction, retried on structural-budget contention:
   *   structural spawn budget        exhausted / absent      -> effect.rejected, nothing written
   *   attenuate authority            requested ∩ parent CURRENT effective
   *   spend one lineage credit
   *   insert the child's delegated authority record
   *   insert the child context, CREATED -> READY
   *   deliver spawn input to the child (if any)
   *   register the parent PendingOperation and the child link
   *   spawn:  settle now, deliver child.spawned
   *   call:   leave the dependency pending for the terminal result
   * ```
   *
   * Policy runs *before* the Definition is resolved. The authorizer already receives the requested
   * `definitionId`/`definitionVersion` on the proposal, so resolving the actual stored Definition
   * first would let a caller with no spawn authority learn, from the shape of the refusal alone,
   * whether a guessed child Definition exists - an information-disclosure channel a denied caller
   * must not get. A policy `deny` therefore never touches the DefinitionStore.
   *
   * The child is a full Execution: its own id, mailbox, lifecycle, controller state, effective
   * authority, and place in the lineage. It is never an in-process call between controllers, and
   * `call` does not make it a different kind of Execution - it only adds the pending dependency.
   */
  private async dispatchSpawn(
    input: ProcessEffectsInput,
    proposal: SpawnExecutionProposal,
    effectId: EffectId,
    correlationId: string,
    requestedAt: string,
    resume?: { readonly pendingOperationId: PendingOperationId; readonly confirmationId: string },
  ): Promise<EffectDispatchRecord> {
    const parent = input.context;
    const parentId = parent.executionId;

    // Structural validation of the proposal already happened in `processOne` before this method was
    // ever called. Authorization comes next, and comes before Definition resolution - see the
    // docstring above.
    // On the confirmed-dispatch path this is the ONLY authorization decision for the approved spawn:
    // `approveConfirmation` no longer runs its own `decide` for spawn/send, so a stateful or
    // instrumented policy is not consulted twice for one approved dispatch.
    const decision = await this.decide(input, proposal, effectId, requestedAt);
    if (decision.decision === "deny") {
      return this.refuse(input, proposal, effectId, correlationId, "effect.denied", {
        code: decision.code,
        message: decision.message,
        phase: "denied",
      }, resume);
    }
    const grantId = decision.grantId;

    // The Working Notes handoff is data on the concrete SpawnExecution proposal - NOT a
    // separate operation, and it grants no authority and does not affect child operation attenuation.
    // The authorizer above (and the confirmation gate below) receive the WHOLE proposal, handoff
    // included, so current policy may legitimately deny (or gate) this concrete transfer because of
    // what it proposes to move; that is an ordinary `effect.denied` on the spawn, not a Working
    // Notes authority ontology. The envelope check here is a separate, bounded concern: a handoff
    // still must not cross the Harness unbounded. The envelope is trusted information the Harness has
    // without parsing Agent-internal limits, so an oversized handoff is refused atomically - before
    // any confirmation is even created: no child, no credit, no partial state, never truncated. A
    // child Definition with a tighter per-controller budget re-validates at initialization.
    if (proposal.workingNotes !== undefined) {
      const overBudget = workingNotesHandoffBudgetIssue(proposal.workingNotes);
      if (overBudget !== null) {
        return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
          code: "spawn_working_notes_handoff_over_budget",
          message:
            `the Working Notes handoff for ${proposal.definitionId}@${proposal.definitionVersion} exceeds the ` +
            `transfer envelope (${overBudget.message}); the spawn is refused whole rather than truncated`,
        }, resume);
      }
    }

    if (resume === undefined) {
      const gated = await this.gateOrNull(input, proposal, effectId, correlationId, requestedAt, grantId);
      if (gated) return gated;
    }

    const definition = isDefinitionId(proposal.definitionId)
      ? await this.deps.definitions.getVersion(proposal.definitionId as DefinitionId, proposal.definitionVersion)
      : undefined;
    if (!definition) {
      return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
        code: "spawn_definition_not_found",
        message: `no stored definition ${proposal.definitionId}@${proposal.definitionVersion}; a malformed child reference creates no runtime state`,
      }, resume);
    }
    if (!this.deps.hasController(definition.kind)) {
      return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
        code: "spawn_definition_kind_unsupported",
        message: `no controller is registered for definition kind "${definition.kind}"`,
      }, resume);
    }
    if (proposal.expectedChildKind !== undefined && definition.kind !== proposal.expectedChildKind) {
      // An Agent Stage / Workflow Stage refuses a mismatched child kind rather than running it under
      // the wrong Stage semantics. This is the ordinary SpawnExecution boundary, after authorization
      // and Definition resolution - never an existence oracle a denied caller could probe.
      return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
        code: "spawn_definition_kind_mismatch",
        message:
          `${proposal.definitionId}@${proposal.definitionVersion} is a ${definition.kind} definition, ` +
          `but a ${proposal.expectedChildKind} child was required`,
      }, resume);
    }

    const childDefinitionRef = definitionRef(definition);

    type SpawnCommit =
      | { readonly kind: "refused"; readonly code: string; readonly message: string }
      | { readonly kind: "abandoned" }
      | {
          readonly kind: "created";
          readonly childExecutionId: ExecutionId;
          readonly rootExecutionId: ExecutionId;
          readonly pendingOperationId: PendingOperationId;
          readonly awaited: boolean;
        };

    const attemptSpawn = async (at: string): Promise<SpawnCommit> =>
      this.deps.store.transact(parentId, async (tx): Promise<SpawnCommit> => {
      if (await this.abandonIfCancellationPending(tx, input, proposal, effectId, at, resume?.pendingOperationId)) {
        return { kind: "abandoned" };
      }
      // Structural budget, read fresh and checked before anything is written. A descendant cannot
      // enlarge it, and a lineage with no budget cannot spawn at all.
      const budget = await tx.lineageSpawnBudgets.get(parent.rootExecutionId);
      if (!budget) {
        return {
          kind: "refused",
          code: "no_structural_spawn_budget",
          message:
            `lineage ${parent.rootExecutionId} was created without a structural spawn budget; ` +
            "autonomous child creation is refused (an absent budget is not an unlimited one)",
        };
      }
      if (!canConsumeSpawnCredit(budget)) {
        return {
          kind: "refused",
          code: "structural_spawn_budget_exhausted",
          message:
            `lineage ${parent.rootExecutionId} has spent all ${budget.capacity} of its structural spawn ` +
            "credits; recursion is legal but finite, and a descendant cannot mint more",
        };
      }

      // Attenuation against the parent's CURRENT effective authority, read here inside the same
      // transaction. A request prepared while an operation was still possible yields nothing once
      // the parent's ceiling has been narrowed.
      const parentAuthority = (await tx.operationAuthorities.get(parentId)) ?? null;
      const granted = attenuateChildOperations(parentAuthority, proposal.requestedOperations ?? []);

      const childId = toExecutionId(this.deps.ids.next(ID_PREFIXES.execution));
      const childMailboxId = this.deps.ids.next(ID_PREFIXES.mailbox);
      const childAuthorityId = this.deps.ids.next(ID_PREFIXES.operationAuthority);
      const pendingOperationId =
        resume?.pendingOperationId ?? (this.deps.ids.next(EFFECT_ID_PREFIXES.pendingOperation) as PendingOperationId);
      const awaited = proposal.awaitTerminalResult === true;

      await tx.lineageSpawnBudgets.update(consumeSpawnCredit(budget), budget.revision);

      await tx.operationAuthorities.insert(
        createDelegatedOperationAuthority({
          authorityId: childAuthorityId,
          executionId: childId,
          operations: granted,
          ...(parentAuthority
            ? { delegatedFrom: { authorityId: parentAuthority.authorityId, executionId: parentId } }
            : {}),
          grantedAt: at,
        }),
      );

      const childContext = createExecutionContext({
        executionId: childId,
        kind: definition.kind,
        definition: childDefinitionRef,
        ownerExecutionId: parentId,
        rootExecutionId: parent.rootExecutionId,
        mailboxId: childMailboxId,
        createdAt: at,
        authority: { authorityId: childAuthorityId },
        // A deep, alias-free copy: the child's stored snapshot must not share structure with the
        // proposal object the journal also retains.
        ...(proposal.workingNotes !== undefined
          ? { workingNotesHandoff: cloneWorkingNotesHandoff(proposal.workingNotes) }
          : {}),
      });
      await tx.executions.insert(childContext);
      const readyChild = transitionContext(childContext, "READY", at);
      await tx.executions.update(readyChild, childContext.revision);
      await tx.transitions.append({
        executionId: childId,
        from: "CREATED",
        to: "READY",
        at,
        activationId: null,
        reason: `spawned by ${effectId}`,
      });

      if (proposal.input !== undefined) {
        await routeEvent({
          tx,
          envelope: {
            eventId: this.deps.ids.next(ID_PREFIXES.event) as EventId,
            destination: { executionId: childId },
            kind: "external.input",
            body: { label: "spawn", payload: proposal.input },
            correlationId: null,
            causationId: effectId,
            occurredAt: at,
          },
          deliveredAt: at,
          recordTransition: async (id, from, to, when, why) => {
            await tx.transitions.append({ executionId: id, from, to, at: when, activationId: null, reason: why });
          },
        });
      }

      const pending = markDispatched(
        createPendingOperation({
          pendingOperationId,
          executionId: parentId,
          effectId,
          effectKind: "spawn_execution",
          correlationId,
          causationId: input.activationId,
          idempotencyKey: `spawn:${effectId}` as IdempotencyKey,
          createdAt: at,
          // No configured deadline, not a far-future sentinel: a parent may legitimately wait
          // indefinitely for a child's terminal result (docs/execution-runtime.md §16). A fabricated
          // "long enough" timestamp would misrepresent an unconfigured deadline as a configured one.
          deadline: null,
        }),
        at,
      );
      if (resume) await tx.pendingOperations.update(pending);
      else await tx.pendingOperations.insert(pending);

      const grantedDetail = granted.map((ref) => `${ref.capability}/${ref.operation}`);
      await this.journal(tx, {
        effectId,
        executionId: parentId,
        effectKind: "spawn_execution",
        phase: "authorized",
        activationId: input.activationId,
        pendingOperationId,
        at,
        detail: {
          grantId,
          definitionId: proposal.definitionId,
          definitionVersion: proposal.definitionVersion,
          childExecutionId: childId,
          rootExecutionId: parent.rootExecutionId,
          requestedOperations: (proposal.requestedOperations ?? []).map((ref) => `${ref.capability}/${ref.operation}`),
          grantedOperations: grantedDetail,
          // Parent-side audit of what scratch information the parent chose to delegate. Keys only -
          // the parent selected them and the content is not a runtime concern.
          ...(proposal.workingNotes !== undefined
            ? { workingNotesHandoffKeys: proposal.workingNotes.entries.map((entry) => entry.key) }
            : {}),
          mode: awaited ? "call" : "spawn",
        },
      });
      await this.journal(tx, {
        effectId,
        executionId: parentId,
        effectKind: "spawn_execution",
        phase: "dispatch_started",
        activationId: input.activationId,
        pendingOperationId,
        at,
        detail: { childExecutionId: childId },
      });

      await tx.childExecutionLinks.insert(
        createChildExecutionLink({
          childExecutionId: childId,
          parentExecutionId: parentId,
          rootExecutionId: parent.rootExecutionId,
          definition: childDefinitionRef,
          effectId,
          spawnedByActivationId: input.activationId,
          pendingOperationId: awaited ? pendingOperationId : null,
          resultCorrelationId: correlationId,
          createdAt: at,
        }),
      );

      if (!awaited) {
        // spawn: the parent's dependency is "the child exists", and it does. Settle now with the
        // creation acknowledgement - a distinct Event kind from the terminal result it never waits
        // for.
        const spawnedEventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;
        await this.journal(tx, {
          effectId,
          executionId: parentId,
          effectKind: "spawn_execution",
          phase: "completed",
          activationId: input.activationId,
          pendingOperationId,
          at,
          detail: { childExecutionId: childId, resultEventId: spawnedEventId },
        });
        await tx.pendingOperations.update(markSettled(pending, "success", spawnedEventId, at));
        await routeEvent({
          tx,
          envelope: {
            eventId: spawnedEventId,
            destination: { executionId: parentId },
            kind: "child.spawned",
            body: {
              effectId,
              effectKind: "spawn_execution",
              pendingOperationId,
              childExecutionId: childId,
              rootExecutionId: parent.rootExecutionId,
              definitionId: proposal.definitionId,
              definitionVersion: proposal.definitionVersion,
              grantedOperations: granted.map((ref) => ({ capability: ref.capability, operation: ref.operation })),
            },
            correlationId,
            causationId: effectId,
            occurredAt: at,
          },
          deliveredAt: at,
          recordTransition: async (id, from, to, when, why) => {
            await tx.transitions.append({ executionId: id, from, to, at: when, activationId: null, reason: why });
          },
        });
      }

      return { kind: "created", childExecutionId: childId, rootExecutionId: parent.rootExecutionId, pendingOperationId, awaited };
    });

    // Bounded retry on a genuine budget CAS conflict. A loss here means another Execution's spawn
    // committed the same lineage credit first; it never means this transaction wrote anything -
    // `store.transact` discards the whole draft when the callback throws, so re-evaluating from
    // fresh state cannot overspend, cannot duplicate a child, and cannot leave a partial record. A
    // caller that merely lost the race is not a controller/Activation failure.
    let outcome: SpawnCommit | null = null;
    let lastConflict: SpawnBudgetConcurrencyError | null = null;
    for (let attempt = 1; attempt <= MAX_SPAWN_BUDGET_CONTENTION_ATTEMPTS; attempt += 1) {
      try {
        outcome = await attemptSpawn(nowIso(this.deps.clock));
        break;
      } catch (error) {
        if (!(error instanceof SpawnBudgetConcurrencyError)) throw error;
        lastConflict = error;
      }
    }

    if (outcome === null) {
      // Contention persisted past the retry limit. This is infrastructure contention, not a
      // controller semantic decision, so it is answered the same way every other spawn refusal is:
      // an explicit Event, no Activation failure, no child, no credit spent.
      return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
        code: "spawn_budget_contention",
        message:
          `the structural spawn budget for lineage ${parent.rootExecutionId} kept changing underneath ` +
          `${MAX_SPAWN_BUDGET_CONTENTION_ATTEMPTS} attempts to spend a credit` +
          (lastConflict ? ` (${lastConflict.message})` : "") +
          "; retry the spawn",
      }, resume);
    }

    if (outcome.kind === "refused") {
      return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
        code: outcome.code,
        message: outcome.message,
      }, resume);
    }

    if (outcome.kind === "abandoned") {
      return {
        effectId,
        effectKind: "spawn_execution",
        correlationId,
        pendingOperationId: resume?.pendingOperationId ?? null,
        phase: "abandoned",
        settledInline: false,
      };
    }

    // The child record is durable; make it runnable. Post-commit, exactly like an Effect result
    // that woke a waiting Execution.
    await this.deps.wake(outcome.childExecutionId);

    return {
      effectId,
      effectKind: "spawn_execution",
      correlationId,
      pendingOperationId: outcome.pendingOperationId,
      phase: outcome.awaited ? "dispatch_started" : "completed",
      settledInline: !outcome.awaited,
    };
  }

  // -- peer messaging ------------------------------------------------------

  /**
   * Turns a `SendMessage` proposal (`send` / `ask` / `reply`) into a delivered `peer.message` - or
   * refuses, and delivers nothing.
   *
   * ```text
   * policy decision                       deny                       -> effect.denied
   * (reply) resolve the open PeerRequestLink   missing / settled / not the addressee
   *                                                                  -> effect.rejected
   * resolve the destination Execution     missing / terminal         -> effect.rejected
   * one transaction:
   *   sender PendingOperation + journal
   *   route peer.message to the recipient (fromExecutionId is runtime-owned)
   *   reply: settle the asker's exact original PendingOperation, close the link
   *   ask:   leave the sender PendingOperation pending, insert the PeerRequestLink
   *   send/reply: settle the sender PendingOperation now, deliver message.sent
   * ```
   *
   * Policy runs *before* the destination is ever looked up. A denied sender must not be able to tell
   * an existing destination from a nonexistent one - through the refusal class or a pre-policy
   * runtime lookup. A message/correlation id is not a
   * credential: a `reply` is authorized as the responder's *own* outbound send, and it settles a
   * request only if the runtime holds an open link naming this Execution as the expected responder.
   */
  private async dispatchSendMessage(
    input: ProcessEffectsInput,
    proposal: SendMessageProposal,
    effectId: EffectId,
    correlationId: string,
    requestedAt: string,
    resume?: { readonly pendingOperationId: PendingOperationId; readonly confirmationId: string },
  ): Promise<EffectDispatchRecord> {
    const senderId = input.context.executionId;
    const isReply = proposal.inReplyToMessageId !== undefined;
    const awaited = !isReply && proposal.awaitReply === true;

    // On the confirmed-dispatch path this is the ONLY authorization decision for the approved send:
    // `approveConfirmation` no longer runs its own `decide` for spawn/send.
    const decision = await this.decide(input, proposal, effectId, requestedAt);
    if (decision.decision === "deny") {
      return this.refuse(input, proposal, effectId, correlationId, "effect.denied", {
        code: decision.code,
        message: decision.message,
        phase: "denied",
      }, resume);
    }
    const grantId = decision.grantId;

    if (resume === undefined) {
      const gated = await this.gateOrNull(input, proposal, effectId, correlationId, requestedAt, grantId);
      if (gated) return gated;
    }

    type MessageCommit =
      | { readonly kind: "refused"; readonly code: string; readonly message: string }
      | { readonly kind: "abandoned" }
      | {
          readonly kind: "sent";
          readonly pendingOperationId: PendingOperationId;
          readonly recipientId: ExecutionId;
          readonly recipientWoke: boolean;
          readonly settledNow: boolean;
        };

    const commit = await this.deps.store.transact(senderId, async (tx): Promise<MessageCommit> => {
      const now = nowIso(this.deps.clock);
      if (await this.abandonIfCancellationPending(tx, input, proposal, effectId, now, resume?.pendingOperationId)) {
        return { kind: "abandoned" };
      }
      const messageId = this.deps.ids.next(ID_PREFIXES.message);

      let recipientId: ExecutionId;
      let replyLink: Awaited<ReturnType<typeof tx.peerRequestLinks.get>> = undefined;
      let envelopeCorrelation: string | null = null;

      if (isReply) {
        const link = await tx.peerRequestLinks.get(proposal.inReplyToMessageId!);
        if (!link) {
          return { kind: "refused", code: "reply_no_such_request", message: `no peer request ${proposal.inReplyToMessageId}` };
        }
        if (link.state === "abandoned") {
          return { kind: "refused", code: "reply_request_abandoned", message: `peer request ${link.messageId} was abandoned` };
        }
        if (link.state !== "open") {
          return { kind: "refused", code: "reply_already_settled", message: `peer request ${link.messageId} was already answered` };
        }
        if (link.responderExecutionId !== senderId) {
          return {
            kind: "refused",
            code: "reply_not_addressee",
            message: `execution ${senderId} is not the peer that request ${link.messageId} expected a reply from`,
          };
        }
        replyLink = link;
        if (link.requesterExecutionId !== proposal.to) {
          return {
            kind: "refused",
            code: "reply_destination_mismatch",
            message: `reply destination ${proposal.to} does not match requester ${link.requesterExecutionId}`,
          };
        }
        recipientId = proposal.to as ExecutionId;
        envelopeCorrelation = link.requestCorrelationId;
      } else {
        recipientId = proposal.to as ExecutionId;
      }

      const recipient = await tx.executions.get(recipientId);
      if (!recipient) {
        return { kind: "refused", code: "message_destination_not_found", message: `no execution ${recipientId}` };
      }
      if (isTerminalLifecycle(recipient.lifecycle)) {
        return {
          kind: "refused",
          code: "message_destination_terminal",
          message: `execution ${recipientId} is ${recipient.lifecycle} and cannot receive a message`,
        };
      }

      const pendingOperationId =
        resume?.pendingOperationId ?? (this.deps.ids.next(EFFECT_ID_PREFIXES.pendingOperation) as PendingOperationId);
      const mode = isReply ? "reply" : awaited ? "ask" : "send";

      await this.journal(tx, {
        effectId,
        executionId: senderId,
        effectKind: "send_message",
        phase: "authorized",
        activationId: input.activationId,
        pendingOperationId,
        at: now,
        detail: {
          grantId,
          to: recipientId,
          messageId,
          mode,
          ...(isReply ? { inReplyToMessageId: replyLink!.messageId } : {}),
          ...(resume ? { viaConfirmation: resume.confirmationId } : {}),
        },
      });

      const pending = markDispatched(
        createPendingOperation({
          pendingOperationId,
          executionId: senderId,
          effectId,
          effectKind: "send_message",
          correlationId,
          causationId: input.activationId,
          idempotencyKey: `send:${effectId}` as IdempotencyKey,
          createdAt: now,
          // A peer may take arbitrarily long to reply; an `ask` legitimately waits indefinitely.
          deadline: null,
        }),
        now,
      );
      // On the confirmed-dispatch path the gated PendingOperation already exists; reuse it so the
      // controller's correlation stays stable across the confirmation.
      if (resume) await tx.pendingOperations.update(pending);
      else await tx.pendingOperations.insert(pending);
      await this.journal(tx, {
        effectId,
        executionId: senderId,
        effectKind: "send_message",
        phase: "dispatch_started",
        activationId: input.activationId,
        pendingOperationId,
        at: now,
        detail: { messageId, to: recipientId },
      });

      const peerEventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;
      const peerRouted = await routeEvent({
        tx,
        envelope: {
          eventId: peerEventId,
          destination: { executionId: recipientId },
          kind: "peer.message",
          body: {
            messageId,
            // Runtime-owned. Never a controller-provided `from` field.
            fromExecutionId: senderId,
            body: proposal.body,
            expectsReply: awaited,
            inReplyToMessageId: isReply ? replyLink!.messageId : null,
          },
          // A reply carries the asker's original correlation so its exact PendingOperation settles;
          // a fresh send/ask is an unsolicited observation and carries none.
          correlationId: envelopeCorrelation,
          causationId: effectId,
          occurredAt: now,
        },
        deliveredAt: now,
        recordTransition: async (id, from, to, when, why) => {
          await tx.transitions.append({ executionId: id, from, to, at: when, activationId: null, reason: why });
        },
      });
      const recipientWoke = peerRouted.status === "delivered" && peerRouted.wokeExecution;

      if (isReply) {
        // Settle the asker's exact original `ask` PendingOperation. Only this link's requester, only
        // its recorded PendingOperation, and only while it is still pending.
        const askerPending = await tx.pendingOperations.get(replyLink!.requestPendingOperationId);
        if (askerPending && askerPending.status === "pending") {
          await tx.pendingOperations.update(markSettled(askerPending, "success", peerEventId, now));
          await this.journal(tx, {
            effectId: replyLink!.requestEffectId,
            executionId: replyLink!.requesterExecutionId,
            effectKind: "send_message",
            phase: "completed",
            activationId: null,
            pendingOperationId: askerPending.pendingOperationId,
            at: now,
            detail: { messageId, replyEventId: peerEventId, viaEffectId: effectId },
          });
        }
        await tx.peerRequestLinks.update(markPeerRequestLinkSettled(replyLink!, now));
      }

      let settledNow: boolean;
      if (awaited && !isReply) {
        // ask: the sender stays owed a reply. Record the correlation link; no message.sent.
        await tx.peerRequestLinks.insert(
          createPeerRequestLink({
            messageId,
            requesterExecutionId: senderId,
            responderExecutionId: recipientId,
            requestEffectId: effectId,
            requestPendingOperationId: pendingOperationId,
            requestCorrelationId: correlationId,
            createdAt: now,
          }),
        );
        settledNow = false;
      } else {
        // send, or reply: "admitted for the destination" is the whole dependency, and it is met.
        const ackEventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;
        await this.journal(tx, {
          effectId,
          executionId: senderId,
          effectKind: "send_message",
          phase: "completed",
          activationId: input.activationId,
          pendingOperationId,
          at: now,
          detail: { messageId, resultEventId: ackEventId },
        });
        await tx.pendingOperations.update(markSettled(pending, "success", ackEventId, now));
        await routeEvent({
          tx,
          envelope: {
            eventId: ackEventId,
            destination: { executionId: senderId },
            kind: "message.sent",
            body: { effectId, effectKind: "send_message", pendingOperationId, messageId, to: recipientId },
            correlationId,
            causationId: effectId,
            occurredAt: now,
          },
          deliveredAt: now,
          recordTransition: async (id, from, to, when, why) => {
            await tx.transitions.append({ executionId: id, from, to, at: when, activationId: null, reason: why });
          },
        });
        settledNow = true;
      }

      return { kind: "sent", pendingOperationId, recipientId, recipientWoke, settledNow };
    });

    if (commit.kind === "refused") {
      return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
        code: commit.code,
        message: commit.message,
      }, resume);
    }

    if (commit.kind === "abandoned") {
      return {
        effectId,
        effectKind: "send_message",
        correlationId,
        pendingOperationId: resume?.pendingOperationId ?? null,
        phase: "abandoned",
        settledInline: false,
      };
    }

    // Scheduling is post-commit, exactly as for a capability result or a spawned child.
    if (commit.recipientWoke) await this.deps.wake(commit.recipientId);

    return {
      effectId,
      effectKind: "send_message",
      correlationId,
      pendingOperationId: commit.pendingOperationId,
      phase: commit.settledNow ? "completed" : "dispatch_started",
      settledInline: commit.settledNow,
    };
  }

  // -- Structured Memory -------------------------------------------------

  /**
   * Commits one schema-bound Execution-local Structured Memory value.
   *
   * Ordering is security-significant:
   *
   * ```text
   * structurally valid proposal
   *   -> authorize concrete WriteMemory
   *   -> optional exact-payload confirmation
   *   -> resolve current Execution memory-view ref + declared field/schema
   *   -> commit view revision + journal/result Event atomically
   * ```
   *
   * Policy denial therefore performs no memory-view lookup and cannot reveal whether a field or
   * schema exists. The local store write is atomic and creates no PendingOperation merely for
   * uniformity; when confirmation is enabled, it reuses and settles the gate's exact operation.
   */
  private async dispatchWriteMemory(
    input: ProcessEffectsInput,
    proposal: WriteMemoryProposal,
    effectId: EffectId,
    correlationId: string,
    requestedAt: string,
    resume?: { readonly pendingOperationId: PendingOperationId; readonly confirmationId: string },
  ): Promise<EffectDispatchRecord> {
    const executionId = input.context.executionId;

    // The one fresh policy decision for this dispatch attempt. Nothing about the concrete view is
    // resolved before it, on either the ordinary or confirmed path.
    const decision = await this.decide(input, proposal, effectId, requestedAt);
    if (decision.decision === "deny") {
      return this.refuse(
        input,
        proposal,
        effectId,
        correlationId,
        "effect.denied",
        { code: decision.code, message: decision.message, phase: "denied" },
        resume,
      );
    }

    if (resume === undefined) {
      const gated = await this.gateOrNull(
        input,
        proposal,
        effectId,
        correlationId,
        requestedAt,
        decision.grantId,
      );
      if (gated) return gated;
    }

    const eventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;
    type Commit =
      | { readonly kind: "abandoned" }
      | {
          readonly kind: "rejected";
          readonly code: string;
          readonly message: string;
          readonly routed: EventRoutingResult;
        }
      | {
          readonly kind: "conflicted";
          readonly memoryViewId: string;
          readonly expectedRevision: number;
          readonly actualRevision: number;
          readonly routed: EventRoutingResult;
        }
      | {
          readonly kind: "written";
          readonly memoryViewId: string;
          readonly revision: number;
          readonly routed: EventRoutingResult;
        };

    const commit = await this.deps.store.transact(executionId, async (tx): Promise<Commit> => {
      const at = nowIso(this.deps.clock);
      if (await this.abandonIfCancellationPending(tx, input, proposal, effectId, at, resume?.pendingOperationId)) {
        return { kind: "abandoned" };
      }

      const context = await tx.executions.get(executionId);
      if (!context || isTerminalLifecycle(context.lifecycle)) {
        if (resume) {
          const operation = await tx.pendingOperations.get(resume.pendingOperationId);
          if (operation?.status === "pending") await tx.pendingOperations.update(markAbandoned(operation, at));
        }
        await this.journal(tx, {
          effectId,
          executionId,
          effectKind: "write_memory",
          phase: "abandoned",
          activationId: input.activationId,
          pendingOperationId: resume?.pendingOperationId ?? null,
          at,
          detail: { reason: "execution unavailable before Structured Memory commit" },
        });
        return { kind: "abandoned" };
      }

      let gatedOperation: PendingOperation | undefined;
      if (resume) {
        gatedOperation = await tx.pendingOperations.get(resume.pendingOperationId);
        if (!gatedOperation || gatedOperation.status !== "pending" || gatedOperation.dispatch === "dispatched") {
          return { kind: "abandoned" };
        }
      }

      await this.journal(tx, {
        effectId,
        executionId,
        effectKind: "write_memory",
        phase: "authorized",
        activationId: input.activationId,
        pendingOperationId: resume?.pendingOperationId ?? null,
        at,
        detail: {
          grantId: decision.grantId,
          key: proposal.key,
          ...(resume ? { viaConfirmation: resume.confirmationId } : {}),
        },
      });

      const reject = async (code: string, message: string): Promise<Commit> => {
        await this.journal(tx, {
          effectId,
          executionId,
          effectKind: "write_memory",
          phase: "rejected",
          activationId: input.activationId,
          pendingOperationId: resume?.pendingOperationId ?? null,
          at,
          detail: { code, message, resultEventId: eventId },
        });
        if (gatedOperation) {
          // Nothing reached the memory state: dispatch remains `not_dispatched`.
          await tx.pendingOperations.update(markSettled(gatedOperation, "rejected", eventId, at));
        }
        const routed = await routeEvent({
          tx,
          envelope: {
            eventId,
            destination: { executionId },
            kind: "effect.rejected",
            body: { effectId, effectKind: "write_memory", code, message },
            correlationId,
            causationId: effectId,
            occurredAt: at,
          },
          deliveredAt: at,
          recordTransition: async (id, from, to, when, why) => {
            await tx.transitions.append({ executionId: id, from, to, at: when, activationId: null, reason: why });
          },
        });
        return { kind: "rejected", code, message, routed };
      };

      const viewRef = context.slots.memoryView;
      if (!viewRef) {
        return reject(
          "structured_memory_view_not_configured",
          `execution ${executionId} has no configured Structured Memory view`,
        );
      }
      const view = await tx.structuredMemory.get(viewRef.memoryViewId);
      if (!view || view.executionId !== executionId) {
        return reject(
          "structured_memory_view_unavailable",
          `the Structured Memory view bound to execution ${executionId} is unavailable`,
        );
      }

      /**
       * The optimistic-concurrency conflict path.
       *
       * A conflict is a *distinct* runtime observation, never a flavour of `effect.rejected`: the
       * request was valid, inside the effective-authority ceiling, authorized, and (where gated)
       * confirmed - it just lost a compare-and-set on the whole bound view revision. Nothing is
       * mutated: no value change, no `commitStructuredMemoryWrite`, no `structuredMemory.update`, no
       * revision advance, no write-history append. One `memory.write_conflict` Event, one terminal
       * `conflicted` journal phase, and - when gated - the exact PendingOperation settles
       * `conflicted` with `dispatch` still `not_dispatched`.
       */
      const conflict = async (
        expectedRevision: number,
        actualRevision: number,
        opts: { readonly reason?: string } = {},
      ): Promise<Commit> => {
        await this.journal(tx, {
          effectId,
          executionId,
          effectKind: "write_memory",
          phase: "conflicted",
          activationId: input.activationId,
          pendingOperationId: resume?.pendingOperationId ?? null,
          at,
          detail: {
            code: "structured_memory_write_conflict",
            memoryViewId: view.memoryViewId,
            key: proposal.key,
            expectedRevision,
            actualRevision,
            resultEventId: eventId,
            ...(opts.reason ? { reason: opts.reason } : {}),
          },
        });
        if (gatedOperation) {
          // Nothing reached Structured Memory: `dispatch` stays `not_dispatched`.
          await tx.pendingOperations.update(markSettled(gatedOperation, "conflicted", eventId, at));
        }
        const routed = await routeEvent({
          tx,
          envelope: {
            eventId,
            destination: { executionId },
            kind: "memory.write_conflict",
            body: {
              effectId,
              effectKind: "write_memory",
              pendingOperationId: resume?.pendingOperationId ?? null,
              memoryViewId: view.memoryViewId,
              key: proposal.key,
              expectedRevision,
              actualRevision,
            },
            correlationId,
            causationId: effectId,
            occurredAt: at,
          },
          deliveredAt: at,
          recordTransition: async (id, from, to, when, why) => {
            await tx.transitions.append({ executionId: id, from, to, at: when, activationId: null, reason: why });
          },
        });
        return { kind: "conflicted", memoryViewId: view.memoryViewId, expectedRevision, actualRevision, routed };
      };

      const validation = validateStructuredMemoryWrite(view, proposal.key, proposal.value);
      if (!validation.ok) return reject(validation.code, validation.message);

      // The semantic optimistic precondition. Absent means an unconditional write. Present
      // -> the whole bound view revision must still equal it, checked inside this same transaction as
      // the commit so the check and the write linearize together and the race cannot simply move.
      if (proposal.expectedRevision !== undefined && view.revision !== proposal.expectedRevision) {
        return conflict(proposal.expectedRevision, view.revision);
      }

      const written = commitStructuredMemoryWrite(view, {
        key: proposal.key,
        value: validation.value,
        writerExecutionId: executionId,
        effectId,
        activationId: input.activationId,
        writtenAt: at,
        // Caller-supplied provenance (direct source refs, and/or promoted Derived claim ids) rides
        // the exact proposal, so it is part of what confirmation digested and it is persisted with
        // the committed record. It is not authority and it does not reach the model observation.
        ...(proposal.provenance !== undefined ? { provenance: proposal.provenance } : {}),
      });

      await this.journal(tx, {
        effectId,
        executionId,
        effectKind: "write_memory",
        phase: "dispatch_started",
        activationId: input.activationId,
        pendingOperationId: resume?.pendingOperationId ?? null,
        at,
        detail: { memoryViewId: view.memoryViewId, key: proposal.key },
      });

      try {
        await tx.structuredMemory.update(written, view.revision);
      } catch (error) {
        if (error instanceof StructuredMemoryConcurrencyError) {
          // The physical persistence CAS refused *after* the semantic precondition matched (or was
          // absent). Fail closed: surface the SAME conflict semantics rather than retrying or letting
          // a stale write become last-write-wins. `structuredMemory.update` checks the revision before
          // it mutates, so the draft carries no committed value / advanced revision to roll back, and
          // the conflict journal + Event still commit with this transaction.
          return conflict(proposal.expectedRevision ?? error.expectedRevision, error.actualRevision, {
            reason: "physical persistence CAS refused after the semantic precondition matched",
          });
        }
        throw error;
      }
      await this.journal(tx, {
        effectId,
        executionId,
        effectKind: "write_memory",
        phase: "completed",
        activationId: input.activationId,
        pendingOperationId: resume?.pendingOperationId ?? null,
        at,
        detail: {
          memoryViewId: view.memoryViewId,
          key: proposal.key,
          revision: written.revision,
          resultEventId: eventId,
        },
      });
      if (gatedOperation) {
        await tx.pendingOperations.update(
          markSettled(markDispatched(gatedOperation, at), "success", eventId, at),
        );
      }
      const routed = await routeEvent({
        tx,
        envelope: {
          eventId,
          destination: { executionId },
          kind: "memory.written",
          body: {
            effectId,
            effectKind: "write_memory",
            pendingOperationId: resume?.pendingOperationId ?? null,
            memoryViewId: view.memoryViewId,
            key: proposal.key,
            revision: written.revision,
          },
          correlationId,
          causationId: effectId,
          occurredAt: at,
        },
        deliveredAt: at,
        recordTransition: async (id, from, to, when, why) => {
          await tx.transitions.append({ executionId: id, from, to, at: when, activationId: null, reason: why });
        },
      });
      return {
        kind: "written",
        memoryViewId: view.memoryViewId,
        revision: written.revision,
        routed,
      };
    });

    if (commit.kind === "abandoned") {
      return {
        effectId,
        effectKind: "write_memory",
        correlationId,
        pendingOperationId: resume?.pendingOperationId ?? null,
        phase: "abandoned",
        settledInline: false,
      };
    }

    const woke = commit.routed.status === "delivered" && commit.routed.wokeExecution;
    if (woke) await this.deps.wake(executionId);
    if (commit.kind === "rejected") {
      return {
        effectId,
        effectKind: "write_memory",
        correlationId,
        pendingOperationId: resume?.pendingOperationId ?? null,
        phase: "rejected",
        settledInline: true,
        ...(resume
          ? { refusal: { kind: "effect.rejected", code: commit.code, message: commit.message } as const }
          : {}),
      };
    }
    if (commit.kind === "conflicted") {
      return {
        effectId,
        effectKind: "write_memory",
        correlationId,
        pendingOperationId: resume?.pendingOperationId ?? null,
        phase: "conflicted",
        settledInline: true,
        ...(resume
          ? {
              refusal: {
                kind: "memory.write_conflict",
                code: "structured_memory_write_conflict",
                message:
                  `the Structured Memory view ${commit.memoryViewId} is at revision ${commit.actualRevision}, ` +
                  `not the expected ${commit.expectedRevision}; the versioned write did not commit`,
              } as const,
            }
          : {}),
      };
    }
    return {
      effectId,
      effectKind: "write_memory",
      correlationId,
      pendingOperationId: resume?.pendingOperationId ?? null,
      phase: "completed",
      settledInline: true,
    };
  }

  // -- user input ---------------------------------------------------------

  /**
   * Turns a `RequestUserInput` proposal into an open runtime-owned `UserInputRequest` - or refuses,
   * and records nothing.
   *
   * ```text
   * policy decision              deny -> effect.denied
   * one transaction:
   *   journal authorized + dispatch_started
   *   sender PendingOperation (deadline null - a user may never answer)
   *   UserInputRequest { state: open }, schema resolved (absent -> { kind: "string" })
   *   NO result Event - the user has not answered yet
   * ```
   *
   * A controller asking a question is still requesting a runtime interaction, so it crosses the
   * `EffectAuthorizer` (deny-by-default; the reference policy requires a narrow `userInput` grant).
   * "the model requested it", "the prompt says it is needed", "the user has interacted before", and
   * "the Execution knows a user identity" are none of them permission.
   */
  private async dispatchRequestUserInput(
    input: ProcessEffectsInput,
    proposal: RequestUserInputProposal,
    effectId: EffectId,
    correlationId: string,
    requestedAt: string,
  ): Promise<EffectDispatchRecord> {
    const executionId = input.context.executionId;

    const decision = await this.decide(input, proposal, effectId, requestedAt);
    if (decision.decision === "deny") {
      return this.refuse(input, proposal, effectId, correlationId, "effect.denied", {
        code: decision.code,
        message: decision.message,
        phase: "denied",
      });
    }
    const grantId = decision.grantId;

    // Absent schema resolves to ordinary text - never an unconstrained object, never a silent
    // stringify of structured input.
    const schema: ValueSchema = proposal.schema ?? { kind: "string" };

    type Commit =
      | { readonly kind: "abandoned" }
      | { readonly kind: "opened"; readonly pendingOperationId: PendingOperationId; readonly requestId: string };

    const commit = await this.deps.store.transact(executionId, async (tx): Promise<Commit> => {
      const now = nowIso(this.deps.clock);
      if (await this.abandonIfCancellationPending(tx, input, proposal, effectId, now)) {
        return { kind: "abandoned" };
      }
      const pendingOperationId = this.deps.ids.next(EFFECT_ID_PREFIXES.pendingOperation) as PendingOperationId;
      const requestId = this.deps.ids.next(ID_PREFIXES.userInputRequest);

      await this.journal(tx, {
        effectId,
        executionId,
        effectKind: "request_user_input",
        phase: "authorized",
        activationId: input.activationId,
        pendingOperationId,
        at: now,
        detail: { grantId, requestId, prompt: proposal.prompt, schemaSupplied: proposal.schema !== undefined },
      });

      const pending = markDispatched(
        createPendingOperation({
          pendingOperationId,
          executionId,
          effectId,
          effectKind: "request_user_input",
          correlationId,
          causationId: input.activationId,
          idempotencyKey: `user_input:${effectId}` as IdempotencyKey,
          createdAt: now,
          // A user may take arbitrarily long, and may never answer at all.
          deadline: null,
        }),
        now,
      );
      await tx.pendingOperations.insert(pending);
      await this.journal(tx, {
        effectId,
        executionId,
        effectKind: "request_user_input",
        phase: "dispatch_started",
        activationId: input.activationId,
        pendingOperationId,
        at: now,
        detail: { requestId },
      });

      await tx.userInputRequests.insert(
        createUserInputRequest({
          requestId,
          executionId,
          effectId,
          pendingOperationId,
          correlationId,
          prompt: proposal.prompt,
          schema,
          createdAt: now,
        }),
      );

      return { kind: "opened", pendingOperationId, requestId };
    });

    if (commit.kind === "abandoned") {
      return {
        effectId,
        effectKind: "request_user_input",
        correlationId,
        pendingOperationId: null,
        phase: "abandoned",
        settledInline: false,
      };
    }

    return {
      effectId,
      effectKind: "request_user_input",
      correlationId,
      pendingOperationId: commit.pendingOperationId,
      phase: "dispatch_started",
      settledInline: false,
    };
  }

  // -- capability dispatch ---------------------------------------------------

  private async dispatchCapability(
    input: ProcessEffectsInput,
    proposal: UseCapabilityProposal,
    effectId: EffectId,
    correlationId: string,
    decision: Extract<AuthorizationDecision, { decision: "allow" }>,
    resume?: { readonly pendingOperationId: PendingOperationId; readonly confirmationId: string },
  ): Promise<EffectDispatchRecord> {
    const executionId = input.context.executionId;
    const { constraints, consequential, scope, idempotencyKey } = this.capabilityDispatchSafety(
      executionId,
      effectId,
      proposal,
      decision,
    );

    const pendingOperationId =
      resume?.pendingOperationId ?? (this.deps.ids.next(EFFECT_ID_PREFIXES.pendingOperation) as PendingOperationId);
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

    type DispatchIntent =
      | { readonly kind: "dispatched"; readonly operation: PendingOperation }
      | { readonly kind: "abandoned" }
      | { readonly kind: "denied"; readonly code: string; readonly message: string }
      | Extract<PriorOperationGuard, { readonly kind: "refuse" | "replay" }>;

    // One transaction: the grant, the pending operation, and the intent to dispatch commit together
    // and commit *before* the call. If this throws, nothing exists and nothing was attempted.
    const intent = await this.deps.store.transact(executionId, async (tx): Promise<DispatchIntent> => {
      if (await this.abandonIfCancellationPending(tx, input, proposal, effectId, dispatchedAt, resume?.pendingOperationId)) {
        return { kind: "abandoned" };
      }

      // the runtime-owned hard operation-authority ceiling must linearize against
      // confirmed dispatch intent. On the resume path the ceiling was checked before this method, but
      // a store-owned revocation could have committed since; re-read it here, inside the same
      // transaction that commits `dispatch_started`, and refuse if the operation is no longer within
      // it. Paid only by the delayed confirmed path - the ordinary proposal path never sets `resume`.
      if (resume !== undefined) {
        const authority = (await tx.operationAuthorities.get(executionId)) ?? null;
        if (!authority || !authorizesOperation(authority, { capability: proposal.capability, operation: proposal.operation })) {
          const code = authority ? "operation_outside_effective_authority" : "no_effective_operation_authority";
          const message = authority
            ? `${proposal.capability}/${proposal.operation} is no longer in effective operation authority ` +
              `${authority.authorityId} (version ${authority.version}); an approval never widens authority`
            : `execution ${executionId} no longer has effective operation authority; an approval never widens authority`;
          const current = await tx.pendingOperations.get(pendingOperationId);
          if (current && current.status === "pending") {
            const denyEventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;
            await this.journal(tx, {
              effectId,
              executionId,
              effectKind: proposal.kind,
              phase: "denied",
              activationId: input.activationId,
              pendingOperationId,
              at: dispatchedAt,
              detail: {
                code,
                message,
                confirmationId: resume.confirmationId,
                resultEventId: denyEventId,
                reason: "operation authority revoked before confirmed dispatch intent",
              },
            });
            await tx.pendingOperations.update(markSettled(current, "denied", denyEventId, dispatchedAt));
            await routeEvent({
              tx,
              envelope: {
                eventId: denyEventId,
                destination: { executionId },
                kind: "effect.denied",
                body: { effectId, effectKind: proposal.kind, code, message },
                correlationId,
                causationId: effectId,
                occurredAt: dispatchedAt,
              },
              deliveredAt: dispatchedAt,
              recordTransition: async (id, from, to, when, why) => {
                await tx.transitions.append({ executionId: id, from, to, at: when, activationId: null, reason: why });
              },
            });
          }
          return { kind: "denied", code, message };
        }
      }

      // Duplicate classification and dispatch intent must linearize together. The early proposal
      // check avoids needless confirmation when possible, but only this in-transaction check closes
      // the race where two equivalent proposals were gated before either approval dispatched. The
      // approved confirmation's own not-yet-dispatched row is excluded so it cannot self-block.
      const guard = await this.checkPriorOperationsInTransaction(
        tx,
        executionId,
        idempotencyKey,
        consequential,
        proposal,
        resume?.pendingOperationId,
      );
      if (guard.kind !== "proceed") return guard;

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
          ...(resume ? { viaConfirmation: resume.confirmationId } : {}),
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
      // On the confirmed-dispatch path the gated PendingOperation already exists (state `pending`,
      // `not_dispatched`); reuse it, so the controller's correlation is stable across the
      // confirmation and there is only ever one PendingOperation for this Effect.
      if (resume) await tx.pendingOperations.update(dispatched);
      else await tx.pendingOperations.insert(dispatched);
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
      return { kind: "dispatched", operation: dispatched };
    });

    if (intent.kind === "abandoned") {
      return {
        effectId,
        effectKind: proposal.kind,
        correlationId,
        pendingOperationId: resume?.pendingOperationId ?? null,
        phase: "abandoned",
        settledInline: false,
      };
    }
    if (intent.kind === "denied") {
      return {
        effectId,
        effectKind: proposal.kind,
        correlationId,
        pendingOperationId: resume?.pendingOperationId ?? null,
        phase: "denied",
        settledInline: true,
        refusal: { kind: "effect.denied", code: intent.code, message: intent.message },
      };
    }
    if (intent.kind === "refuse") {
      return this.refuse(
        input,
        proposal,
        effectId,
        correlationId,
        "effect.rejected",
        { code: intent.code, message: intent.message },
        resume,
      );
    }
    if (intent.kind === "replay") {
      return this.replay(input, proposal, effectId, correlationId, intent.operation, intent.observation, resume);
    }
    const operation = intent.operation;

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
      const cancelRequest = await tx.cancellationRequests.get(operation.executionId);
      if (!context || isTerminalLifecycle(context.lifecycle) || cancelRequest?.state === "pending") {
        const abandoned = markAbandoned(operation, settledAt, outcome.status);
        await tx.pendingOperations.update(abandoned);
        await this.journal(tx, {
          effectId,
          executionId: operation.executionId,
          effectKind: operation.effectKind,
          phase: "abandoned",
          activationId: null,
          pendingOperationId,
          at: settledAt,
          detail: {
            reason: !context
              ? "execution missing"
              : cancelRequest?.state === "pending"
                ? "execution cancellation pending"
                : `execution ${context.lifecycle}`,
            outcome: outcome as unknown as JsonValue,
          },
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
    resume?: { readonly pendingOperationId: PendingOperationId; readonly confirmationId: string },
  ): Promise<EffectDispatchRecord> {
    const at = nowIso(this.deps.clock);
    const eventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;
    const phase: EffectJournalPhase = reason.phase ?? "rejected";
    const executionId = input.context.executionId;
    const refusal = { kind, code: reason.code, message: reason.message } as const;

    const envelope: EventEnvelope = {
      eventId,
      destination: { executionId },
      kind,
      body: { effectId, effectKind: proposal.kind, code: reason.code, message: reason.message },
      correlationId,
      causationId: effectId,
      occurredAt: at,
    };
    const routeInto = async (tx: RuntimeTransaction): Promise<void> => {
      await routeEvent({
        tx,
        envelope,
        deliveredAt: at,
        recordTransition: async (id, from, to, when, why) => {
          await tx.transitions.append({ executionId: id, from, to, at: when, activationId: null, reason: why });
        },
      });
    };

    // Confirmed-dispatch path: an approved Effect that is refused before it dispatched must settle
    // the SAME gated PendingOperation the confirmation gate created - never leave it pending, never
    // mint a second one, never report `pendingOperationId: null`. `effect.denied` settles it
    // `denied`; `effect.rejected` settles it `rejected` (distinct from failure / decline / cancel).
    if (resume !== undefined) {
      const outcome: Exclude<PendingOutcomeState, null> = kind === "effect.denied" ? "denied" : "rejected";
      type ResumeCommit = "abandoned" | "settled" | "gone";
      const committed = await this.deps.store.transact(executionId, async (tx): Promise<ResumeCommit> => {
        if (await this.abandonIfCancellationPending(tx, input, proposal, effectId, at, resume.pendingOperationId)) {
          return "abandoned";
        }
        const operation = await tx.pendingOperations.get(resume.pendingOperationId);
        // Already settled/abandoned by a concurrent path (terminal cleanup, a racing decision): there
        // is nothing left to settle and no second Event to route.
        if (!operation || operation.status !== "pending") return "gone";
        const context = await tx.executions.get(executionId);
        if (!context || isTerminalLifecycle(context.lifecycle)) {
          await tx.pendingOperations.update(markAbandoned(operation, at));
          return "abandoned";
        }
        await this.journal(tx, {
          effectId,
          executionId,
          effectKind: proposal.kind,
          phase,
          activationId: input.activationId,
          pendingOperationId: resume.pendingOperationId,
          at,
          detail: {
            code: reason.code,
            message: reason.message,
            confirmationId: resume.confirmationId,
            resultEventId: eventId,
            reason: "approved effect refused before dispatch",
          },
        });
        // markSettled leaves `dispatch` untouched: it stays `not_dispatched`, because nothing reached
        // the external world.
        await tx.pendingOperations.update(markSettled(operation, outcome, eventId, at));
        await routeInto(tx);
        return "settled";
      });
      if (committed !== "settled") {
        // abandoned or already-gone: no correlated refusal Event was routed here.
        return {
          effectId,
          effectKind: proposal.kind,
          correlationId,
          pendingOperationId: committed === "gone" ? resume.pendingOperationId : null,
          phase: "abandoned",
          settledInline: false,
        };
      }
      return {
        effectId,
        effectKind: proposal.kind,
        correlationId,
        pendingOperationId: resume.pendingOperationId,
        phase,
        settledInline: true,
        refusal,
      };
    }

    const abandoned = await this.deps.store.transact(executionId, async (tx): Promise<boolean> => {
      if (await this.abandonIfCancellationPending(tx, input, proposal, effectId, at)) return true;
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
      await routeInto(tx);
      return false;
    });

    return {
      effectId,
      effectKind: proposal.kind,
      correlationId,
      pendingOperationId: null,
      phase: abandoned ? "abandoned" : phase,
      settledInline: !abandoned,
    };
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
    resume?: { readonly pendingOperationId: PendingOperationId; readonly confirmationId: string },
  ): Promise<EffectDispatchRecord> {
    const at = nowIso(this.deps.clock);
    const eventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;
    const executionId = input.context.executionId;

    type ReplayCommit = "replayed" | "abandoned" | "gone";
    const committed = await this.deps.store.transact(executionId, async (tx): Promise<ReplayCommit> => {
      if (await this.abandonIfCancellationPending(tx, input, proposal, effectId, at, resume?.pendingOperationId)) {
        return "abandoned";
      }

      const replayOperation = resume ? await tx.pendingOperations.get(resume.pendingOperationId) : undefined;
      if (resume && (!replayOperation || replayOperation.status !== "pending")) return "gone";
      if (resume) {
        const context = await tx.executions.get(executionId);
        if (!context || isTerminalLifecycle(context.lifecycle)) {
          await tx.pendingOperations.update(markAbandoned(replayOperation!, at));
          return "abandoned";
        }
      }

      const resultPendingOperationId = replayOperation?.pendingOperationId ?? prior.pendingOperationId;
      await this.journal(tx, {
        effectId,
        executionId,
        effectKind: proposal.kind,
        phase: "replayed",
        activationId: input.activationId,
        pendingOperationId: resultPendingOperationId,
        at,
        detail: {
          replayedFromEffectId: prior.effectId,
          idempotencyKey: prior.idempotencyKey,
          resultEventId: eventId,
          ...(resume ? { confirmationId: resume.confirmationId } : {}),
        },
      });
      if (replayOperation) {
        // A confirmed replay answers the confirmation's own dependency. It never mutates or reuses
        // the prior operation record, and `dispatch` remains `not_dispatched` because no external
        // call occurred for this Effect.
        await tx.pendingOperations.update(markSettled(replayOperation, "success", eventId, at));
      }
      const envelope: EventEnvelope = {
        eventId,
        destination: { executionId },
        kind: "capability.completed",
        body: {
          effectId,
          effectKind: proposal.kind,
          pendingOperationId: resultPendingOperationId,
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
      return "replayed";
    });

    if (committed !== "replayed") {
      return {
        effectId,
        effectKind: proposal.kind,
        correlationId,
        pendingOperationId: committed === "gone" ? (resume?.pendingOperationId ?? null) : null,
        phase: "abandoned",
        settledInline: false,
      };
    }

    return {
      effectId,
      effectKind: proposal.kind,
      correlationId,
      pendingOperationId: resume?.pendingOperationId ?? prior.pendingOperationId,
      phase: "replayed",
      settledInline: true,
    };
  }

  /**
   * The duplicate/unresolved guard for consequential external operations.
   *
   * `idempotencyKey` only narrows candidates - it is built from a non-cryptographic fingerprint,
   * and a shared key does not by itself prove two requests are the same logical operation. Every
   * candidate is checked against the *persisted* request it actually recorded, with an exact
   * comparison of capability, operation, input, and resources, before it is treated as a duplicate.
   * A coincidental or contrived key collision can therefore never merge two different requests: it
   * can only make the candidate list slightly longer to filter.
   *
   * Once a candidate is confirmed identical: a prior success replays. A prior *definite* failure
   * does not block anything - suppressing retries would turn a transient failure into a permanent
   * one. A prior unknown outcome, or a dispatch that was never resolved, blocks automatic
   * redispatch of a consequential operation, because "we do not know whether it happened" is not a
   * licence to do it again.
   */
  private async checkPriorOperations(
    executionId: ExecutionId,
    idempotencyKey: IdempotencyKey,
    consequential: boolean,
    proposal: UseCapabilityProposal,
  ): Promise<PriorOperationGuard> {
    return this.deps.store.transact(executionId, (tx) =>
      this.checkPriorOperationsInTransaction(tx, executionId, idempotencyKey, consequential, proposal),
    );
  }

  private async checkPriorOperationsInTransaction(
    tx: RuntimeTransaction,
    executionId: ExecutionId,
    idempotencyKey: IdempotencyKey,
    consequential: boolean,
    proposal: UseCapabilityProposal,
    excludePendingOperationId?: PendingOperationId,
  ): Promise<PriorOperationGuard> {
    const candidates = (await tx.pendingOperations.findByIdempotencyKey(executionId, idempotencyKey)).filter(
      (candidate) => candidate.pendingOperationId !== excludePendingOperationId,
    );
    if (candidates.length === 0) return { kind: "proceed" };

    const prior: PendingOperation[] = [];
    for (const candidate of candidates) {
      const entries = await tx.effectJournal.listByEffect(candidate.effectId);
      const requested = entries.find((entry) => entry.phase === "requested");
      const recorded = requested?.detail["proposal"];
      if (recorded === undefined) continue;
      if (sameLogicalCapabilityRequest(recorded as unknown as UseCapabilityProposal, proposal)) {
        prior.push(candidate);
      }
    }
    if (prior.length === 0) return { kind: "proceed" };

    const succeeded = prior.find((operation) => operation.status === "settled" && operation.outcome === "success");
    if (succeeded) {
      const entries = await tx.effectJournal.listByEffect(succeeded.effectId);
      const completed = entries.find((entry) => entry.phase === "completed");
      return {
        kind: "replay",
        operation: succeeded,
        observation: (completed?.detail["observation"] ?? null) as JsonValue,
      };
    }

    if (!consequential) return { kind: "proceed" };

    const unresolved = prior.find((operation) => operation.status === "pending" && operation.dispatch === "dispatched");
    if (unresolved) {
      return {
        kind: "refuse",
        code: "prior_dispatch_unresolved",
        message: `an earlier dispatch of this exact operation (${unresolved.effectId}) has not resolved; automatic redispatch of a consequential operation is not authorized`,
      };
    }

    const unknown = prior.find((operation) => operation.outcome === "unknown");
    if (unknown) {
      return {
        kind: "refuse",
        code: "prior_outcome_unknown",
        message: `the outcome of an earlier dispatch of this exact operation (${unknown.effectId}) is unknown; automatic retry is not authorized`,
      };
    }

    return { kind: "proceed" };
  }

  private capabilityDispatchSafety(
    executionId: ExecutionId,
    effectId: EffectId,
    proposal: UseCapabilityProposal,
    decision: Extract<AuthorizationDecision, { decision: "allow" }>,
  ): CapabilityDispatchSafety {
    const constraints: AuthorizationConstraints = decision.constraints ?? {};

    // Consequentiality is a baseline property of the operation, not a policy opinion: the
    // descriptor sets the floor, and a decision may only raise it. An unclassified operation
    // defaults to consequential, so a catalog with a gap fails toward the safe interpretation.
    // There is structurally no way to read this as `false` when the descriptor says `true` - the
    // authorization type has no field that could express a downgrade.
    const descriptor = this.deps.catalog.describe(proposal.capability, proposal.operation);
    const descriptorConsequential = descriptor?.consequential ?? true;
    const consequential = descriptorConsequential || constraints.forceConsequential === true;
    const scope: EffectIdempotencyScope = constraints.idempotency ?? proposal.idempotency ?? "none";
    const idempotencyKey = effectIdempotencyKey({
      scope,
      executionId,
      effectId,
      capability: proposal.capability,
      operation: proposal.operation,
      input: proposal.input,
    });
    return { constraints, consequential, scope, idempotencyKey };
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
   * have happened" record the journal exists to preserve. Nothing automatically redispatches it;
   * production recovery remains future work.
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
