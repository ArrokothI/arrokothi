import type { AgentDefinition } from "../definition/types.ts";
import type { SessionStore } from "../session/store.ts";
import type { SessionEvent } from "../session/events.ts";
import type { SessionState, SessionSnapshot } from "../session/state.ts";
import type { ModelProvider } from "../provider/types.ts";
import type { ToolRegistry } from "../tools/registry.ts";
import type { KnowledgeProvider } from "../knowledge/types.ts";
import type { ConfirmationResolver } from "../confirmation/types.ts";
import type { HarnessImplementation, HarnessServices, TurnModelCallMetrics, TurnStopReason } from "../harness/types.ts";
import type { CompiledContext } from "../compiler/context-compiler.ts";
import type { HostContextInput } from "../context/types.ts";
import type { Clock, IdGenerator } from "../util/ids.ts";
import { initialState, project, resume, snapshotOf } from "../session/state.ts";
import { isSessionConcurrencyConflictError } from "../session/store.ts";
import { observeHostContext as validateHostContext } from "../context/host-context.ts";
import type { ContextObservation } from "../context/host-context.ts";
import { TurnJournal } from "./journal.ts";
import type { TurnDurability } from "./journal.ts";
import { ConservativeConfirmationResolver } from "../confirmation/resolver.ts";
import { AgentHarness } from "../harness/agent-harness.ts";
import { assertValidDefinition } from "../definition/definition.ts";
import { createRandomIds, createSystemClock } from "../util/ids.ts";
import { DEFAULT_POLICIES } from "../definition/types.ts";

/**
 * The request-scoped runtime.
 *
 * Construct it, run one turn, and throw it away. It holds no cross-request state: everything durable
 * lives in the session store. That is what makes the SESSION rather than the PROCESS the persistent
 * thing, and it is why a turn can be served by any process, in any order, after any restart.
 */

export interface AgentRuntimeConfig {
  definition: AgentDefinition;
  sessions: SessionStore;
  model: ModelProvider;
  /** Optional separate provider for planning. Defaults to `model`. */
  planningModel?: ModelProvider;
  tools: ToolRegistry;
  knowledge: KnowledgeProvider;
  harness?: HarnessImplementation;
  confirmationResolver?: ConfirmationResolver;
  ids?: IdGenerator;
  clock?: Clock;
  /** Persist a snapshot after each turn. Correctness never depends on it. */
  useSnapshots?: boolean;
  onContextCompiled?: (context: CompiledContext, purpose: string) => void;
}

export interface RunTurnInput {
  sessionId: string;
  message: string;
  /** Raw host context for this turn. Validated against the declared schema before it is stored. */
  hostContext?: HostContextInput;
  signal?: AbortSignal;
}

export interface RunTurnResult {
  reply: string;
  stopReason: TurnStopReason;
  steps: number;
  state: SessionState;
  /** Events produced by this turn only. */
  events: SessionEvent[];
  /** Compiled contexts for this turn, in order, for traces and tests. */
  contexts: { purpose: string; context: CompiledContext }[];
  metrics: TurnModelCallMetrics;
}

export interface ObserveHostContextInput {
  sessionId: string;
  hostContext: HostContextInput;
}

export interface ObserveHostContextResult {
  state: SessionState;
  observation: ContextObservation;
  events: SessionEvent[];
}

export class TurnPersistenceError extends Error {
  readonly code = "turn_persistence_failed";
  readonly phase: "checkpoint" | "final";
  override readonly cause: unknown;

  constructor(phase: "checkpoint" | "final", cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`failed to persist ${phase} events: ${message}`);
    this.name = "TurnPersistenceError";
    this.phase = phase;
    this.cause = cause;
  }
}

function isTurnPersistenceError(error: unknown): error is TurnPersistenceError {
  return error instanceof TurnPersistenceError
    || (typeof error === "object" && error !== null && (error as { code?: unknown }).code === "turn_persistence_failed");
}

export class AgentRuntime {
  private readonly config: AgentRuntimeConfig;
  private readonly harness: HarnessImplementation;
  private readonly ids: IdGenerator;
  private readonly clock: Clock;

  constructor(config: AgentRuntimeConfig) {
    const definition: AgentDefinition = {
      ...config.definition,
      policies: { ...DEFAULT_POLICIES, ...config.definition.policies },
    };
    assertValidDefinition(definition);
    this.config = { ...config, definition };
    // The bounded workflow strategy preserves the historical default behavior while routing all
    // new construction through the primary Harness. Legacy Harness classes remain available only
    // for explicit compatibility use.
    this.harness = config.harness ?? new AgentHarness({ strategy: "workflow" });
    this.ids = config.ids ?? createRandomIds();
    this.clock = config.clock ?? createSystemClock();
  }

  /** Creates a session bound to this definition's id AND version. */
  async createSession(sessionId?: string, label?: string): Promise<string> {
    const id = sessionId ?? this.ids.next("ses");
    await this.config.sessions.createSession({
      sessionId: id,
      agentId: this.config.definition.id,
      agentVersion: this.config.definition.version,
      createdAt: this.clock.now().toISOString(),
      label,
    });
    return id;
  }

  /**
   * Loads current state: snapshot plus later events when a snapshot exists, full projection when it
   * does not. `resume(snapshot, later)` and `project(all)` must agree - that equality is tested.
   */
  async loadState(sessionId: string): Promise<SessionState> {
    const record = await this.config.sessions.getSession(sessionId);
    if (!record) throw new Error(`unknown session "${sessionId}"`);

    const base = initialState({
      sessionId,
      agentId: record.agentId,
      agentVersion: record.agentVersion,
      initialPhaseId: this.config.definition.flow?.initialPhaseId ?? null,
      createdAt: record.createdAt,
    });

    const snapshot = await this.config.sessions.loadSnapshot(sessionId);
    if (snapshot) {
      const later = await this.config.sessions.readEvents(sessionId, snapshot.throughSeq);
      return resume(snapshot, later);
    }
    return project(base, await this.config.sessions.readEvents(sessionId));
  }

  /** Full replay from events, ignoring any snapshot. The reference implementation of "what is true". */
  async replay(sessionId: string): Promise<SessionState> {
    const record = await this.config.sessions.getSession(sessionId);
    if (!record) throw new Error(`unknown session "${sessionId}"`);
    const base = initialState({
      sessionId,
      agentId: record.agentId,
      agentVersion: record.agentVersion,
      initialPhaseId: this.config.definition.flow?.initialPhaseId ?? null,
      createdAt: record.createdAt,
    });
    return project(base, await this.config.sessions.readEvents(sessionId));
  }

  /**
   * Runs one turn: load, process, persist, disappear.
   *
   * Ordinary events are buffered until the final append. Consequential external executions flush
   * explicit durable checkpoints before dispatch and after terminal outcomes.
   */
  async runTurn(input: RunTurnInput): Promise<RunTurnResult> {
    const state = await this.loadState(input.sessionId);
    const turn = state.turn + 1;
    const journal = new TurnJournal(state, this.ids, this.clock);
    const contexts: { purpose: string; context: CompiledContext }[] = [];

    // The initial phase is recorded as an event so that a replay reproduces it rather than
    // depending on the definition being re-read the same way.
    if (this.config.definition.flow && state.phaseId === null) {
      journal.append({
        type: "PhaseTransitioned",
        turn,
        payload: { from: null, to: this.config.definition.flow.initialPhaseId, on: "initial" },
      });
    }

    const userEvent = journal.append({ type: "UserMessageReceived", turn, payload: { text: input.message } });

    if (input.hostContext && Object.keys(input.hostContext).length) {
      const observation = validateHostContext(
        this.config.definition.hostContextSchema,
        input.hostContext,
        turn,
        this.clock.now().toISOString(),
      );
      journal.append({ type: "HostContextObserved", turn, payload: observation });
    }

    const durability: TurnDurability = {
      persistCheckpoint: (target) => this.persist(input.sessionId, target, "checkpoint"),
    };

    const services: HarnessServices = {
      definition: this.config.definition,
      model: this.config.model,
      planningModel: this.config.planningModel ?? this.config.model,
      tools: this.config.tools,
      knowledge: this.config.knowledge,
      confirmationResolver: this.config.confirmationResolver ?? new ConservativeConfirmationResolver(),
      ids: this.ids,
      clock: this.clock,
      durability,
      onContextCompiled: (context, purpose) => {
        contexts.push({ purpose, context });
        this.config.onContextCompiled?.(context, purpose);
      },
    };

    let result;
    try {
      result = await this.harness.runTurn({ journal, userMessage: input.message, turn, userEventId: userEvent.id, signal: input.signal }, services);
    } catch (error) {
      if (isSessionConcurrencyConflictError(error)) {
        return this.stoppedForConcurrencyConflict(input.sessionId, journal, contexts);
      }
      if (isTurnPersistenceError(error)) {
        return this.stoppedForPersistenceFailure(input.sessionId, journal, contexts);
      }
      // A harness that throws is a runtime error, recorded truthfully. The user gets an honest
      // message and the events written so far are still persisted, so the failure is inspectable.
      const message = error instanceof Error ? error.message : String(error);
      journal.append({ type: "RuntimeError", turn, payload: { code: "harness_threw", message } });
      const text = "Something went wrong on my side and I could not complete that. Please check the session trace for any action results before retrying.";
      journal.append({ type: "AssistantMessageEmitted", turn, payload: { text, stopReason: "error" } });
      result = { replyText: text, stopReason: "error" as TurnStopReason, steps: 0 };
    }

    try {
      await this.persist(input.sessionId, journal, "final");
    } catch (error) {
      if (isSessionConcurrencyConflictError(error)) {
        return this.stoppedForConcurrencyConflict(input.sessionId, journal, contexts);
      }
      if (isTurnPersistenceError(error)) {
        return this.stoppedForPersistenceFailure(input.sessionId, journal, contexts);
      }
      throw error;
    }

    return {
      reply: result.replyText,
      stopReason: result.stopReason,
      steps: result.steps,
      state: journal.state,
      events: journal.events,
      contexts,
      metrics: result.metrics ?? metricsFromEvents(journal.events),
    };
  }

  /**
   * Records host observations without a user message or model/Harness invocation.
   * Out-of-band values are tagged for the next user turn, so a turn-lifecycle page selection is
   * available to the later "this one" message and then expires normally.
   */
  async observeHostContext(input: ObserveHostContextInput): Promise<ObserveHostContextResult> {
    const state = await this.loadState(input.sessionId);
    const journal = new TurnJournal(state, this.ids, this.clock);
    const observation = validateHostContext(
      this.config.definition.hostContextSchema,
      input.hostContext,
      state.turn + 1,
      this.clock.now().toISOString(),
    );
    journal.append({ type: "HostContextObserved", turn: state.turn, payload: observation });
    const events = await this.persist(input.sessionId, journal, "final");
    return { state: journal.state, observation, events };
  }

  /**
   * Persists the journal's currently unpersisted drafts with expected-sequence protection and,
   * optionally, saves a snapshot after the event write succeeds.
   */
  private async persist(sessionId: string, journal: TurnJournal, phase: "checkpoint" | "final"): Promise<SessionEvent[]> {
    const drafts = journal.pendingDrafts;
    if (!drafts.length) return [];
    let stored: SessionEvent[];
    try {
      stored = await this.config.sessions.append(sessionId, drafts, { expectedSeq: journal.expectedSeq });
    } catch (error) {
      journal.discardPending();
      if (isSessionConcurrencyConflictError(error)) throw error;
      throw new TurnPersistenceError(phase, error);
    }

    journal.markPersisted(stored);

    if (this.config.useSnapshots !== false) {
      const snapshot: SessionSnapshot = snapshotOf(journal.state);
      try {
        await this.config.sessions.saveSnapshot(sessionId, snapshot);
      } catch {
        // A snapshot is a cache. Event durability is the safety boundary; a cache write must not
        // change whether an already-durable checkpoint may proceed.
      }
    }
    return stored;
  }

  private async stoppedForConcurrencyConflict(
    sessionId: string,
    journal: TurnJournal,
    contexts: { purpose: string; context: CompiledContext }[],
  ): Promise<RunTurnResult> {
    const state = await this.loadState(sessionId);
    const text = "This session changed while I was working, so I stopped before committing a stale turn. Reload the current session state before trying again.";
    return {
      reply: text,
      stopReason: "error",
      steps: 0,
      state,
      events: journal.events,
      contexts,
      metrics: metricsFromEvents(journal.events),
    };
  }

  private async stoppedForPersistenceFailure(
    sessionId: string,
    journal: TurnJournal,
    contexts: { purpose: string; context: CompiledContext }[],
  ): Promise<RunTurnResult> {
    const state = await this.loadState(sessionId);
    const text = "I could not durably record the latest execution checkpoint. Check the session trace before retrying; ambiguous external outcomes are not retried automatically.";
    return {
      reply: text,
      stopReason: "error",
      steps: 0,
      state,
      events: journal.events,
      contexts,
      metrics: metricsFromEvents(journal.events),
    };
  }
}

function metricsFromEvents(events: SessionEvent[]): TurnModelCallMetrics {
  const preflightModelCalls = events.filter((event) => event.type === "ModelCallCompleted" && event.payload.purpose === "plan").length;
  const conversationSummaryModelCalls = events.filter((event) => event.type === "ModelCallCompleted" && event.payload.purpose === "conversation_summary").length;
  const agentLoopModelCalls = events.filter((event) => event.type === "ModelCallCompleted" && event.payload.purpose.startsWith("agent_loop")).length;
  const totalModelCalls = events.filter((event) => event.type === "ModelCallCompleted").length;
  return { preflightModelCalls, agentLoopModelCalls, conversationSummaryModelCalls, guideRetryModelCalls: 0, totalModelCalls };
}
