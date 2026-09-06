/**
 * Dependency-free RuntimeStore with real transaction semantics.
 *
 * "In memory" must not mean "weaker guarantees". `transact` runs the caller's work against a
 * private copy of the whole runtime state and installs it only if the work completes: a throw
 * anywhere leaves no partial mailbox consumption, no orphaned emission, and no lifecycle
 * transition without its matching Execution update. Transactions are serialized, so the atomicity
 * a conformance test observes here is the same atomicity a SQLite implementation must provide.
 *
 * Records are cloned on the way in and out. A test that mutated a returned context could otherwise
 * "prove" invariants that only hold because two callers happened to share one object.
 */

import type { EffectId, PendingOperationId } from "../effects/ids.ts";
import type { EffectJournalEntry } from "../effects/journal.ts";
import type { PendingOperation } from "../effects/pending.ts";
import type { CancellationRequest } from "../execution/cancellation-request.ts";
import type { ConfirmationRequest } from "../execution/confirmation-request.ts";
import type { ChildExecutionLink } from "../execution/child-link.ts";
import type { ExecutionContext } from "../execution/context.ts";
import type { ExecutionEmission } from "../execution/emission.ts";
import type { ControllerResumptionId, ExecutionId } from "../execution/ids.ts";
import type { PeerRequestLink } from "../execution/peer-request-link.ts";
import type { ControllerResumption } from "../execution/resumption.ts";
import type { LifecycleTransitionRecord } from "../execution/lifecycle.ts";
import type { LineageSpawnBudget } from "../execution/structural-budget.ts";
import type { UserInputRequest } from "../execution/user-input-request.ts";
import type { StructuredMemoryView } from "../execution/structured-memory.ts";
import type { EffectiveOperationAuthority } from "../operations/authority.ts";
import type { DeliveredEvent, EventEnvelope } from "../interaction/event-envelope.ts";
import type {
  MailboxAppendResult,
  RuntimeStore,
  RuntimeTransaction,
} from "../ports/runtime-store.ts";
import {
  ExecutionAlreadyExistsError,
  RuntimeConcurrencyError,
  SpawnBudgetConcurrencyError,
  StructuredMemoryConcurrencyError,
  UnknownControllerResumptionError,
  UnknownPendingOperationError,
} from "../ports/runtime-store.ts";

interface MailboxState {
  events: DeliveredEvent[];
  seen: Set<string>;
  /** How many of `events` an Activation has already consumed. */
  consumed: number;
  nextSequence: number;
}

interface RuntimeState {
  executions: Map<string, ExecutionContext>;
  mailboxes: Map<string, MailboxState>;
  emissions: Map<string, ExecutionEmission[]>;
  transitions: Map<string, LifecycleTransitionRecord[]>;
  pendingOperations: Map<string, PendingOperation>;
  effectJournal: Map<string, EffectJournalEntry[]>;
  controllerResumptions: Map<string, ControllerResumption>;
  operationAuthorities: Map<string, EffectiveOperationAuthority>;
  lineageSpawnBudgets: Map<string, LineageSpawnBudget>;
  childExecutionLinks: Map<string, ChildExecutionLink>;
  peerRequestLinks: Map<string, PeerRequestLink>;
  cancellationRequests: Map<string, CancellationRequest>;
  userInputRequests: Map<string, UserInputRequest>;
  confirmationRequests: Map<string, ConfirmationRequest>;
  structuredMemory: Map<string, StructuredMemoryView>;
}

function emptyState(): RuntimeState {
  return {
    executions: new Map(),
    mailboxes: new Map(),
    emissions: new Map(),
    transitions: new Map(),
    pendingOperations: new Map(),
    effectJournal: new Map(),
    controllerResumptions: new Map(),
    operationAuthorities: new Map(),
    lineageSpawnBudgets: new Map(),
    childExecutionLinks: new Map(),
    peerRequestLinks: new Map(),
    cancellationRequests: new Map(),
    userInputRequests: new Map(),
    confirmationRequests: new Map(),
    structuredMemory: new Map(),
  };
}

function mailbox(state: RuntimeState, mailboxId: string): MailboxState {
  const existing = state.mailboxes.get(mailboxId);
  if (existing) return existing;
  const created: MailboxState = { events: [], seen: new Set(), consumed: 0, nextSequence: 1 };
  state.mailboxes.set(mailboxId, created);
  return created;
}

/**
 * The *reusable* resumption record for one Execution's stable controller-local key.
 *
 * Interleaving may leave historical `invalidated` records for a key alongside a fresh one, so a plain
 * first-match lookup is not enough: an obsolete record must never be handed back as the reusable
 * result. `invalidated` records are skipped entirely; among what remains a `pending` record wins
 * (the recovery-as-suspension case), otherwise the most recently created `settled` one.
 */
function reusableResumptionByKey(
  state: RuntimeState,
  executionId: string,
  key: string,
): ControllerResumption | undefined {
  const matches = [...state.controllerResumptions.values()].filter(
    (resumption) =>
      resumption.executionId === executionId && resumption.key === key && resumption.state !== "invalidated",
  );
  if (matches.length === 0) return undefined;
  return (
    matches.find((resumption) => resumption.state === "pending") ??
    [...matches].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))[0]
  );
}

function makeTransaction(state: RuntimeState): RuntimeTransaction {
  return {
    executions: {
      async get(executionId) {
        const stored = state.executions.get(executionId);
        return stored ? structuredClone(stored) : undefined;
      },
      async insert(context) {
        if (state.executions.has(context.executionId)) {
          throw new ExecutionAlreadyExistsError(context.executionId);
        }
        state.executions.set(context.executionId, structuredClone(context));
      },
      async update(context, expectedRevision) {
        const stored = state.executions.get(context.executionId);
        if (!stored) throw new RuntimeConcurrencyError(context.executionId, expectedRevision, 0);
        if (stored.revision !== expectedRevision) {
          throw new RuntimeConcurrencyError(context.executionId, expectedRevision, stored.revision);
        }
        state.executions.set(context.executionId, structuredClone(context));
      },
    },

    mailboxes: {
      async append(mailboxId, event: EventEnvelope, deliveredAt): Promise<MailboxAppendResult> {
        const box = mailbox(state, mailboxId);
        if (box.seen.has(event.eventId)) return { accepted: false, reason: "duplicate" };
        const delivered: DeliveredEvent = { ...structuredClone(event), deliveredAt, sequence: box.nextSequence };
        box.nextSequence += 1;
        box.seen.add(event.eventId);
        box.events.push(delivered);
        return { accepted: true, event: structuredClone(delivered) };
      },
      async peek(mailboxId) {
        const box = state.mailboxes.get(mailboxId);
        if (!box) return [];
        return structuredClone(box.events.slice(box.consumed));
      },
      async consume(mailboxId) {
        const box = state.mailboxes.get(mailboxId);
        if (!box) return [];
        const pending = box.events.slice(box.consumed);
        box.consumed = box.events.length;
        return structuredClone(pending);
      },
    },

    emissions: {
      async append(emission) {
        const list = state.emissions.get(emission.executionId) ?? [];
        list.push(structuredClone(emission));
        state.emissions.set(emission.executionId, list);
      },
      async list(executionId) {
        return structuredClone(state.emissions.get(executionId) ?? []);
      },
      async nextSequence(executionId) {
        return (state.emissions.get(executionId)?.length ?? 0) + 1;
      },
    },

    transitions: {
      async append(record) {
        const list = state.transitions.get(record.executionId) ?? [];
        list.push(structuredClone(record));
        state.transitions.set(record.executionId, list);
      },
      async list(executionId) {
        return structuredClone(state.transitions.get(executionId) ?? []);
      },
    },

    pendingOperations: {
      async insert(operation) {
        if (state.pendingOperations.has(operation.pendingOperationId)) {
          throw new Error(`pending operation ${operation.pendingOperationId} already exists`);
        }
        state.pendingOperations.set(operation.pendingOperationId, structuredClone(operation));
      },
      async get(pendingOperationId) {
        const stored = state.pendingOperations.get(pendingOperationId);
        return stored ? structuredClone(stored) : undefined;
      },
      async update(operation) {
        if (!state.pendingOperations.has(operation.pendingOperationId)) {
          throw new UnknownPendingOperationError(operation.pendingOperationId);
        }
        state.pendingOperations.set(operation.pendingOperationId, structuredClone(operation));
      },
      async listByExecution(executionId) {
        return structuredClone(
          [...state.pendingOperations.values()].filter((operation) => operation.executionId === executionId),
        );
      },
      async findByIdempotencyKey(executionId, key) {
        return structuredClone(
          [...state.pendingOperations.values()]
            .filter((operation) => operation.executionId === executionId && operation.idempotencyKey === key)
            .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0)),
        );
      },
    },

    controllerResumptions: {
      async insert(resumption) {
        if (state.controllerResumptions.has(resumption.resumptionId)) {
          throw new Error(`controller resumption ${resumption.resumptionId} already exists`);
        }
        state.controllerResumptions.set(resumption.resumptionId, structuredClone(resumption));
      },
      async get(resumptionId) {
        const stored = state.controllerResumptions.get(resumptionId);
        return stored ? structuredClone(stored) : undefined;
      },
      async update(resumption) {
        if (!state.controllerResumptions.has(resumption.resumptionId)) {
          throw new UnknownControllerResumptionError(resumption.resumptionId);
        }
        state.controllerResumptions.set(resumption.resumptionId, structuredClone(resumption));
      },
      async listByExecution(executionId) {
        return structuredClone(
          [...state.controllerResumptions.values()].filter((resumption) => resumption.executionId === executionId),
        );
      },
      async findByKey(executionId, key) {
        return structuredClone(reusableResumptionByKey(state, executionId, key));
      },
    },

    operationAuthorities: {
      async insert(authority) {
        if (state.operationAuthorities.has(authority.executionId)) {
          throw new Error(`execution ${authority.executionId} already has an effective operation authority`);
        }
        state.operationAuthorities.set(authority.executionId, structuredClone(authority));
      },
      async get(executionId) {
        const stored = state.operationAuthorities.get(executionId);
        return stored ? structuredClone(stored) : undefined;
      },
    },

    lineageSpawnBudgets: {
      async insert(budget) {
        if (state.lineageSpawnBudgets.has(budget.rootExecutionId)) {
          throw new Error(`lineage ${budget.rootExecutionId} already has a structural spawn budget`);
        }
        state.lineageSpawnBudgets.set(budget.rootExecutionId, structuredClone(budget));
      },
      async get(rootExecutionId) {
        const stored = state.lineageSpawnBudgets.get(rootExecutionId);
        return stored ? structuredClone(stored) : undefined;
      },
      async update(budget, expectedRevision) {
        const stored = state.lineageSpawnBudgets.get(budget.rootExecutionId);
        if (!stored) throw new SpawnBudgetConcurrencyError(budget.rootExecutionId, expectedRevision, 0);
        if (stored.revision !== expectedRevision) {
          throw new SpawnBudgetConcurrencyError(budget.rootExecutionId, expectedRevision, stored.revision);
        }
        state.lineageSpawnBudgets.set(budget.rootExecutionId, structuredClone(budget));
      },
    },

    childExecutionLinks: {
      async insert(link) {
        if (state.childExecutionLinks.has(link.childExecutionId)) {
          throw new Error(`child execution ${link.childExecutionId} already has a link`);
        }
        state.childExecutionLinks.set(link.childExecutionId, structuredClone(link));
      },
      async get(childExecutionId) {
        const stored = state.childExecutionLinks.get(childExecutionId);
        return stored ? structuredClone(stored) : undefined;
      },
      async update(link) {
        if (!state.childExecutionLinks.has(link.childExecutionId)) {
          throw new Error(`unknown child execution link ${link.childExecutionId}`);
        }
        state.childExecutionLinks.set(link.childExecutionId, structuredClone(link));
      },
      async listByParent(parentExecutionId) {
        return structuredClone(
          [...state.childExecutionLinks.values()].filter((link) => link.parentExecutionId === parentExecutionId),
        );
      },
    },

    peerRequestLinks: {
      async insert(link) {
        if (state.peerRequestLinks.has(link.messageId)) {
          throw new Error(`peer request ${link.messageId} already has a link`);
        }
        state.peerRequestLinks.set(link.messageId, structuredClone(link));
      },
      async get(messageId) {
        const stored = state.peerRequestLinks.get(messageId);
        return stored ? structuredClone(stored) : undefined;
      },
      async update(link) {
        if (!state.peerRequestLinks.has(link.messageId)) {
          throw new Error(`unknown peer request link ${link.messageId}`);
        }
        state.peerRequestLinks.set(link.messageId, structuredClone(link));
      },
      async listByRequester(requesterExecutionId) {
        return structuredClone(
          [...state.peerRequestLinks.values()].filter((link) => link.requesterExecutionId === requesterExecutionId),
        );
      },
      async listByResponder(responderExecutionId) {
        return structuredClone(
          [...state.peerRequestLinks.values()].filter((link) => link.responderExecutionId === responderExecutionId),
        );
      },
    },

    cancellationRequests: {
      async insert(request) {
        if (state.cancellationRequests.has(request.executionId)) {
          throw new Error(`execution ${request.executionId} already has a cancellation request`);
        }
        state.cancellationRequests.set(request.executionId, structuredClone(request));
      },
      async get(executionId) {
        const stored = state.cancellationRequests.get(executionId);
        return stored ? structuredClone(stored) : undefined;
      },
      async update(request) {
        if (!state.cancellationRequests.has(request.executionId)) {
          throw new Error(`unknown cancellation request for ${request.executionId}`);
        }
        state.cancellationRequests.set(request.executionId, structuredClone(request));
      },
    },

    userInputRequests: {
      async insert(request) {
        if (state.userInputRequests.has(request.requestId)) {
          throw new Error(`user input request ${request.requestId} already exists`);
        }
        state.userInputRequests.set(request.requestId, structuredClone(request));
      },
      async get(requestId) {
        const stored = state.userInputRequests.get(requestId);
        return stored ? structuredClone(stored) : undefined;
      },
      async update(request) {
        if (!state.userInputRequests.has(request.requestId)) {
          throw new Error(`unknown user input request ${request.requestId}`);
        }
        state.userInputRequests.set(request.requestId, structuredClone(request));
      },
      async listByExecution(executionId) {
        return structuredClone(
          [...state.userInputRequests.values()].filter((request) => request.executionId === executionId),
        );
      },
    },

    confirmationRequests: {
      async insert(request) {
        if (state.confirmationRequests.has(request.confirmationId)) {
          throw new Error(`confirmation request ${request.confirmationId} already exists`);
        }
        state.confirmationRequests.set(request.confirmationId, structuredClone(request));
      },
      async get(confirmationId) {
        const stored = state.confirmationRequests.get(confirmationId);
        return stored ? structuredClone(stored) : undefined;
      },
      async update(request) {
        if (!state.confirmationRequests.has(request.confirmationId)) {
          throw new Error(`unknown confirmation request ${request.confirmationId}`);
        }
        state.confirmationRequests.set(request.confirmationId, structuredClone(request));
      },
      async listByExecution(executionId) {
        return structuredClone(
          [...state.confirmationRequests.values()].filter((request) => request.executionId === executionId),
        );
      },
    },

    structuredMemory: {
      async insert(view) {
        if (state.structuredMemory.has(view.memoryViewId)) {
          throw new Error(`Structured Memory view ${view.memoryViewId} already exists`);
        }
        state.structuredMemory.set(view.memoryViewId, structuredClone(view));
      },
      async get(memoryViewId) {
        const stored = state.structuredMemory.get(memoryViewId);
        return stored ? structuredClone(stored) : undefined;
      },
      async update(view, expectedRevision) {
        const stored = state.structuredMemory.get(view.memoryViewId);
        if (!stored) throw new StructuredMemoryConcurrencyError(view.memoryViewId, expectedRevision, 0);
        if (stored.revision !== expectedRevision) {
          throw new StructuredMemoryConcurrencyError(view.memoryViewId, expectedRevision, stored.revision);
        }
        state.structuredMemory.set(view.memoryViewId, structuredClone(view));
      },
    },

    effectJournal: {
      async append(draft) {
        const list = state.effectJournal.get(draft.executionId) ?? [];
        const entry: EffectJournalEntry = { ...structuredClone(draft), sequence: list.length + 1 };
        list.push(entry);
        state.effectJournal.set(draft.executionId, list);
        return structuredClone(entry);
      },
      async listByExecution(executionId) {
        return structuredClone(state.effectJournal.get(executionId) ?? []);
      },
      async listByEffect(effectId) {
        const matches: EffectJournalEntry[] = [];
        for (const list of state.effectJournal.values()) {
          for (const entry of list) if (entry.effectId === effectId) matches.push(entry);
        }
        return structuredClone(matches.sort((a, b) => a.sequence - b.sequence));
      },
    },
  };
}

export class InMemoryRuntimeStore implements RuntimeStore {
  private state: RuntimeState = emptyState();
  /** Serializes transactions so two snapshots can never race to install state. */
  private queue: Promise<unknown> = Promise.resolve();

  async transact<T>(_scope: ExecutionId, work: (tx: RuntimeTransaction) => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      const draft = structuredClone(this.state);
      const result = await work(makeTransaction(draft));
      this.state = draft;
      return result;
    };
    const next = this.queue.then(run, run);
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async readExecution(executionId: ExecutionId): Promise<ExecutionContext | undefined> {
    const stored = this.state.executions.get(executionId);
    return stored ? structuredClone(stored) : undefined;
  }

  async listExecutions(): Promise<readonly ExecutionContext[]> {
    return structuredClone([...this.state.executions.values()]);
  }

  async listEmissions(executionId: ExecutionId): Promise<readonly ExecutionEmission[]> {
    return structuredClone(this.state.emissions.get(executionId) ?? []);
  }

  async listTransitions(executionId: ExecutionId): Promise<readonly LifecycleTransitionRecord[]> {
    return structuredClone(this.state.transitions.get(executionId) ?? []);
  }

  async listPendingOperations(executionId: ExecutionId): Promise<readonly PendingOperation[]> {
    return structuredClone(
      [...this.state.pendingOperations.values()].filter((operation) => operation.executionId === executionId),
    );
  }

  async readPendingOperation(pendingOperationId: PendingOperationId): Promise<PendingOperation | undefined> {
    const stored = this.state.pendingOperations.get(pendingOperationId);
    return stored ? structuredClone(stored) : undefined;
  }

  async listEffectJournal(executionId: ExecutionId): Promise<readonly EffectJournalEntry[]> {
    return structuredClone(this.state.effectJournal.get(executionId) ?? []);
  }

  async listControllerResumptions(executionId: ExecutionId): Promise<readonly ControllerResumption[]> {
    return structuredClone(
      [...this.state.controllerResumptions.values()].filter((resumption) => resumption.executionId === executionId),
    );
  }

  async readControllerResumption(resumptionId: ControllerResumptionId): Promise<ControllerResumption | undefined> {
    const stored = this.state.controllerResumptions.get(resumptionId);
    return stored ? structuredClone(stored) : undefined;
  }

  async findControllerResumptionByKey(executionId: ExecutionId, key: string): Promise<ControllerResumption | undefined> {
    return structuredClone(reusableResumptionByKey(this.state, executionId, key));
  }

  async readOperationAuthority(executionId: ExecutionId): Promise<EffectiveOperationAuthority | undefined> {
    const stored = this.state.operationAuthorities.get(executionId);
    return stored ? structuredClone(stored) : undefined;
  }

  async readLineageSpawnBudget(rootExecutionId: ExecutionId): Promise<LineageSpawnBudget | undefined> {
    const stored = this.state.lineageSpawnBudgets.get(rootExecutionId);
    return stored ? structuredClone(stored) : undefined;
  }

  async readChildExecutionLink(childExecutionId: ExecutionId): Promise<ChildExecutionLink | undefined> {
    const stored = this.state.childExecutionLinks.get(childExecutionId);
    return stored ? structuredClone(stored) : undefined;
  }

  async listChildExecutionLinks(parentExecutionId: ExecutionId): Promise<readonly ChildExecutionLink[]> {
    return structuredClone(
      [...this.state.childExecutionLinks.values()].filter((link) => link.parentExecutionId === parentExecutionId),
    );
  }

  async readPeerRequestLink(messageId: string): Promise<PeerRequestLink | undefined> {
    const stored = this.state.peerRequestLinks.get(messageId);
    return stored ? structuredClone(stored) : undefined;
  }

  async listPeerRequestLinksByRequester(requesterExecutionId: ExecutionId): Promise<readonly PeerRequestLink[]> {
    return structuredClone(
      [...this.state.peerRequestLinks.values()].filter((link) => link.requesterExecutionId === requesterExecutionId),
    );
  }

  async listPeerRequestLinksByResponder(responderExecutionId: ExecutionId): Promise<readonly PeerRequestLink[]> {
    return structuredClone(
      [...this.state.peerRequestLinks.values()].filter((link) => link.responderExecutionId === responderExecutionId),
    );
  }

  async readCancellationRequest(executionId: ExecutionId): Promise<CancellationRequest | undefined> {
    const stored = this.state.cancellationRequests.get(executionId);
    return stored ? structuredClone(stored) : undefined;
  }

  async readUserInputRequest(requestId: string): Promise<UserInputRequest | undefined> {
    const stored = this.state.userInputRequests.get(requestId);
    return stored ? structuredClone(stored) : undefined;
  }

  async listUserInputRequests(executionId: ExecutionId): Promise<readonly UserInputRequest[]> {
    return structuredClone(
      [...this.state.userInputRequests.values()].filter((request) => request.executionId === executionId),
    );
  }

  async listOpenUserInputRequests(): Promise<readonly UserInputRequest[]> {
    return structuredClone([...this.state.userInputRequests.values()].filter((request) => request.state === "open"));
  }

  async readConfirmationRequest(confirmationId: string): Promise<ConfirmationRequest | undefined> {
    const stored = this.state.confirmationRequests.get(confirmationId);
    return stored ? structuredClone(stored) : undefined;
  }

  async listConfirmationRequests(executionId: ExecutionId): Promise<readonly ConfirmationRequest[]> {
    return structuredClone(
      [...this.state.confirmationRequests.values()].filter((request) => request.executionId === executionId),
    );
  }

  async listPendingConfirmations(): Promise<readonly ConfirmationRequest[]> {
    return structuredClone([...this.state.confirmationRequests.values()].filter((request) => request.state === "pending"));
  }

  async readStructuredMemoryView(memoryViewId: string): Promise<StructuredMemoryView | undefined> {
    const stored = this.state.structuredMemory.get(memoryViewId);
    return stored ? structuredClone(stored) : undefined;
  }

  /** Journal entries for one Effect, across Executions. Diagnostics and conformance assertions. */
  async listEffectJournalFor(effectId: EffectId): Promise<readonly EffectJournalEntry[]> {
    const matches: EffectJournalEntry[] = [];
    for (const list of this.state.effectJournal.values()) {
      for (const entry of list) if (entry.effectId === effectId) matches.push(entry);
    }
    return structuredClone(matches);
  }

  /** Undelivered-to-controller Events, for diagnostics and conformance assertions. */
  async peekMailbox(mailboxId: string): Promise<readonly DeliveredEvent[]> {
    const box = this.state.mailboxes.get(mailboxId);
    if (!box) return [];
    return structuredClone(box.events.slice(box.consumed));
  }
}
