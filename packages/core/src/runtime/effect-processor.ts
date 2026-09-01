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
import { sameLogicalCapabilityRequest } from "../effects/duplicate-detection.ts";
import type { CapabilityId, EffectId, IdempotencyKey, OperationId, PendingOperationId } from "../effects/ids.ts";
import { EFFECT_ID_PREFIXES } from "../effects/ids.ts";
import type { EffectJournalPhase } from "../effects/journal.ts";
import type { PendingOperation } from "../effects/pending.ts";
import { createPendingOperation, markAbandoned, markDispatched, markSettled } from "../effects/pending.ts";
import type {
  EffectKind,
  EffectProposal,
  SendMessageProposal,
  SpawnExecutionProposal,
  UseCapabilityProposal,
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
import { createPeerRequestLink, markPeerRequestLinkSettled } from "../execution/peer-request-link.ts";
import { canConsumeSpawnCredit, consumeSpawnCredit } from "../execution/structural-budget.ts";
import type { EventEnvelope, EventId } from "../interaction/event-envelope.ts";
import type { EventKind } from "../interaction/events.ts";
import { attenuateChildOperations, authorizesOperation, createDelegatedOperationAuthority } from "../operations/authority.ts";
import type { DefinitionStore } from "../ports/definition-store.ts";
import type { Clock } from "../ports/clock.ts";
import { nowIso } from "../ports/clock.ts";
import type { CapabilityExecutor } from "../ports/capability-executor.ts";
import { UnknownCapabilityError } from "../ports/capability-executor.ts";
import type { EffectAuthorizer } from "../ports/effect-authorizer.ts";
import type { CapabilityCatalog } from "../ports/capability-catalog.ts";
import { emptyCapabilityCatalog } from "../ports/capability-catalog.ts";
import type { IdGenerator } from "../ports/ids.ts";
import { ID_PREFIXES } from "../ports/ids.ts";
import type { InlineWaitBudget } from "../ports/inline-wait.ts";
import type { RuntimeStore, RuntimeTransaction } from "../ports/runtime-store.ts";
import { SpawnBudgetConcurrencyError } from "../ports/runtime-store.ts";
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
        message: `effect kind "${proposal.kind}" is accepted v0.4 vocabulary but is not implemented in this slice`,
      });
    }

    if (proposal.kind === "spawn_execution") {
      return this.dispatchSpawn(input, proposal, effectId, correlationId, requestedAt);
    }

    if (proposal.kind === "send_message") {
      return this.dispatchSendMessage(input, proposal, effectId, correlationId, requestedAt);
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

    return this.dispatchCapability(input, proposal as UseCapabilityProposal, effectId, correlationId, decision);
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
  ): Promise<boolean> {
    const request = await tx.cancellationRequests.get(input.context.executionId);
    if (request === undefined || request.state !== "pending") return false;
    await this.journal(tx, {
      effectId,
      executionId: input.context.executionId,
      effectKind: proposal.kind,
      phase: "abandoned",
      activationId: input.activationId,
      pendingOperationId: null,
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
  ): Promise<EffectDispatchRecord> {
    const parent = input.context;
    const parentId = parent.executionId;

    // Structural validation of the proposal already happened in `processOne` before this method was
    // ever called. Authorization comes next, and comes before Definition resolution - see the
    // docstring above.
    const decision = await this.decide(input, proposal, effectId, requestedAt);
    if (decision.decision === "deny") {
      return this.refuse(input, proposal, effectId, correlationId, "effect.denied", {
        code: decision.code,
        message: decision.message,
        phase: "denied",
      });
    }
    const grantId = decision.grantId;

    const definition = isDefinitionId(proposal.definitionId)
      ? await this.deps.definitions.getVersion(proposal.definitionId as DefinitionId, proposal.definitionVersion)
      : undefined;
    if (!definition) {
      return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
        code: "spawn_definition_not_found",
        message: `no stored definition ${proposal.definitionId}@${proposal.definitionVersion}; a malformed child reference creates no runtime state`,
      });
    }
    if (!this.deps.hasController(definition.kind)) {
      return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
        code: "spawn_definition_kind_unsupported",
        message: `no controller is registered for definition kind "${definition.kind}"`,
      });
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
      if (await this.abandonIfCancellationPending(tx, input, proposal, effectId, at)) {
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
      const pendingOperationId = this.deps.ids.next(EFFECT_ID_PREFIXES.pendingOperation) as PendingOperationId;
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
          // indefinitely for a child's terminal result (docs/execution-runtime.md §16), and E.0
          // implements no child-result deadline/cancellation policy - that is E.1 work. A fabricated
          // "long enough" timestamp would misrepresent an unconfigured deadline as a configured one.
          deadline: null,
        }),
        at,
      );
      await tx.pendingOperations.insert(pending);

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
      });
    }

    if (outcome.kind === "refused") {
      return this.refuse(input, proposal, effectId, correlationId, "effect.rejected", {
        code: outcome.code,
        message: outcome.message,
      });
    }

    if (outcome.kind === "abandoned") {
      return { effectId, effectKind: "spawn_execution", correlationId, pendingOperationId: null, phase: "abandoned", settledInline: false };
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
   * runtime lookup - exactly as with the E.0.1 spawn hardening. A message/correlation id is not a
   * credential: a `reply` is authorized as the responder's *own* outbound send, and it settles a
   * request only if the runtime holds an open link naming this Execution as the expected responder.
   */
  private async dispatchSendMessage(
    input: ProcessEffectsInput,
    proposal: SendMessageProposal,
    effectId: EffectId,
    correlationId: string,
    requestedAt: string,
  ): Promise<EffectDispatchRecord> {
    const senderId = input.context.executionId;
    const isReply = proposal.inReplyToMessageId !== undefined;
    const awaited = !isReply && proposal.awaitReply === true;

    const decision = await this.decide(input, proposal, effectId, requestedAt);
    if (decision.decision === "deny") {
      return this.refuse(input, proposal, effectId, correlationId, "effect.denied", {
        code: decision.code,
        message: decision.message,
        phase: "denied",
      });
    }
    const grantId = decision.grantId;

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
      if (await this.abandonIfCancellationPending(tx, input, proposal, effectId, now)) {
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

      const pendingOperationId = this.deps.ids.next(EFFECT_ID_PREFIXES.pendingOperation) as PendingOperationId;
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
      await tx.pendingOperations.insert(pending);
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
      });
    }

    if (commit.kind === "abandoned") {
      return { effectId, effectKind: "send_message", correlationId, pendingOperationId: null, phase: "abandoned", settledInline: false };
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

    const guard = await this.checkPriorOperations(executionId, idempotencyKey, consequential, proposal);
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
    const operation = await this.deps.store.transact(executionId, async (tx): Promise<PendingOperation | null> => {
      if (await this.abandonIfCancellationPending(tx, input, proposal, effectId, dispatchedAt)) return null;
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

    if (operation === null) {
      return { effectId, effectKind: proposal.kind, correlationId, pendingOperationId: null, phase: "abandoned", settledInline: false };
    }

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
  ): Promise<EffectDispatchRecord> {
    const at = nowIso(this.deps.clock);
    const eventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;
    const phase: EffectJournalPhase = reason.phase ?? "rejected";
    const executionId = input.context.executionId;

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
  ): Promise<EffectDispatchRecord> {
    const at = nowIso(this.deps.clock);
    const eventId = this.deps.ids.next(ID_PREFIXES.event) as EventId;
    const executionId = input.context.executionId;

    const abandoned = await this.deps.store.transact(executionId, async (tx): Promise<boolean> => {
      if (await this.abandonIfCancellationPending(tx, input, proposal, effectId, at)) return true;
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
      return false;
    });

    if (abandoned) {
      return { effectId, effectKind: proposal.kind, correlationId, pendingOperationId: null, phase: "abandoned", settledInline: false };
    }

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
  ): Promise<
    | { readonly kind: "proceed" }
    | { readonly kind: "refuse"; readonly code: string; readonly message: string }
    | { readonly kind: "replay"; readonly operation: PendingOperation; readonly observation: JsonValue }
  > {
    return this.deps.store.transact(executionId, async (tx) => {
      const candidates = await tx.pendingOperations.findByIdempotencyKey(executionId, idempotencyKey);
      if (candidates.length === 0) return { kind: "proceed" } as const;

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
