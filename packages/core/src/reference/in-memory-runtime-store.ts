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
import type { ExecutionContext } from "../execution/context.ts";
import type { ExecutionEmission } from "../execution/emission.ts";
import type { ControllerResumptionId, ExecutionId } from "../execution/ids.ts";
import type { ControllerResumption } from "../execution/resumption.ts";
import type { LifecycleTransitionRecord } from "../execution/lifecycle.ts";
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
  };
}

function mailbox(state: RuntimeState, mailboxId: string): MailboxState {
  const existing = state.mailboxes.get(mailboxId);
  if (existing) return existing;
  const created: MailboxState = { events: [], seen: new Set(), consumed: 0, nextSequence: 1 };
  state.mailboxes.set(mailboxId, created);
  return created;
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
        const match = [...state.controllerResumptions.values()].find(
          (resumption) => resumption.executionId === executionId && resumption.key === key,
        );
        return match ? structuredClone(match) : undefined;
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
    const match = [...this.state.controllerResumptions.values()].find(
      (resumption) => resumption.executionId === executionId && resumption.key === key,
    );
    return match ? structuredClone(match) : undefined;
  }

  async readOperationAuthority(executionId: ExecutionId): Promise<EffectiveOperationAuthority | undefined> {
    const stored = this.state.operationAuthorities.get(executionId);
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
