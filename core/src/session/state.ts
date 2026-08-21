import type { SessionEvent } from "./events.ts";
import type { StructuredMemory, WorkingNote } from "../memory/types.ts";
import type { HostContextState } from "../context/types.ts";
import type { PendingAction } from "../confirmation/types.ts";
import type { ActionLedger } from "../tools/idempotency.ts";
import type { AuthoritativeFact } from "../tools/types.ts";
import { commitValue } from "../memory/structured.ts";
import { applyHostContext } from "../context/host-context.ts";

/**
 * The session projection.
 *
 * `project(events)` is a pure fold. A snapshot is only ever a cache of it, and
 * `resume(snapshot, later)` must equal `project(all)` - a tested invariant, not a convention.
 * Keeping this function pure and total is what makes a session reconstructable on any process.
 */

export interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
  turn: number;
  at: string;
}

export interface ToolResultRecord {
  requestId: string;
  toolName: string;
  turn: number;
  at: string;
  ok: boolean;
  output?: Record<string, unknown>;
  error?: { code: string; message: string };
  facts?: AuthoritativeFact[];
  replayed?: boolean;
}

export interface SessionState {
  sessionId: string;
  agentId: string;
  agentVersion: number;
  /** Highest turn number seen. Incremented by `UserMessageReceived`. */
  turn: number;
  /** Sequence number of the last event folded in. */
  lastSeq: number;
  memory: StructuredMemory;
  workingNotes: WorkingNote[];
  hostContext: HostContextState;
  phaseId: string | null;
  /** At most one outstanding confirmation. Non-null implies status "pending". */
  pendingAction: PendingAction | null;
  ledger: ActionLedger;
  transcript: TranscriptEntry[];
  /** Tool results from the CURRENT turn only - what the compiler labels as latest results. */
  turnToolResults: ToolResultRecord[];
  /** Semantic routing signals observed on the current turn. */
  turnSignals: string[];
  /** Every tool result in the session, for the Studio's action ledger view. */
  allToolResults: ToolResultRecord[];
  status: "active" | "error";
  createdAt: string;
  updatedAt: string;
}

export interface SessionSnapshot {
  state: SessionState;
  /** The snapshot is valid for events up to and including this seq. */
  throughSeq: number;
}

export function initialState(params: {
  sessionId: string;
  agentId: string;
  agentVersion: number;
  initialPhaseId?: string | null;
  createdAt: string;
}): SessionState {
  return {
    sessionId: params.sessionId,
    agentId: params.agentId,
    agentVersion: params.agentVersion,
    turn: 0,
    lastSeq: 0,
    memory: {},
    workingNotes: [],
    hostContext: {},
    phaseId: params.initialPhaseId ?? null,
    pendingAction: null,
    ledger: {},
    transcript: [],
    turnToolResults: [],
    turnSignals: [],
    allToolResults: [],
    status: "active",
    createdAt: params.createdAt,
    updatedAt: params.createdAt,
  };
}

/**
 * Folds one event into the state. Pure; never throws on an unexpected event.
 *
 * An event the reducer does not act on still advances `lastSeq`/`updatedAt`, so replay stays
 * aligned with storage even as new event types are added.
 */
export function applyEvent(state: SessionState, event: SessionEvent): SessionState {
  const base: SessionState = { ...state, lastSeq: event.seq, updatedAt: event.at };

  switch (event.type) {
    case "UserMessageReceived": {
      // A new turn clears per-turn scratch: tool results and signals belong to the turn that made
      // them. Turn-scoped host context expires HERE rather than on the next `HostContextObserved`,
      // because a turn that supplies no host context must still not inherit the previous turn's
      // page URL or other momentary facts.
      return {
        ...base,
        turn: event.turn,
        turnToolResults: [],
        turnSignals: [],
        hostContext: applyHostContext(base.hostContext, [], event.turn),
        transcript: [...base.transcript, { role: "user", text: event.payload.text, turn: event.turn, at: event.at }],
      };
    }

    case "HostContextObserved":
      return { ...base, hostContext: applyHostContext(base.hostContext, event.payload.accepted, event.turn) };

    case "SemanticSignalsObserved":
      return { ...base, turnSignals: [...new Set([...base.turnSignals, ...event.payload.signals])] };

    case "MemoryWriteCommitted": {
      const { key, value, source, authority, normalized } = event.payload;
      return {
        ...base,
        memory: commitValue(base.memory, {
          key,
          value,
          source,
          authority,
          turn: event.turn,
          eventId: event.id,
          at: event.at,
          normalized,
        }),
      };
    }

    case "WorkingNoteRecorded":
      return { ...base, workingNotes: [...base.workingNotes, event.payload.note] };

    case "PhaseTransitioned":
      return { ...base, phaseId: event.payload.to };

    case "ConfirmationRequested": {
      const pending: PendingAction = {
        requestId: event.payload.requestId,
        toolName: event.payload.toolName,
        args: event.payload.args,
        argsHash: event.payload.argsHash,
        promptEventId: event.id,
        promptText: event.payload.promptText,
        turn: event.turn,
        createdAt: event.at,
        status: "pending",
      };
      // A new request replaces any earlier one: consent to a superseded payload never carries over.
      return { ...base, pendingAction: pending };
    }

    case "ConfirmationResolved": {
      // Only the request that was actually resolved is cleared. A resolution naming some other
      // request must not silently discharge the outstanding one.
      if (base.pendingAction?.requestId !== event.payload.requestId) return base;
      if (event.payload.decision === "confirm" || event.payload.decision === "decline") {
        return { ...base, pendingAction: null };
      }
      return base; // `unrelated` / `ambiguous` leave the request outstanding.
    }

    case "ToolExecutionSucceeded": {
      const record: ToolResultRecord = {
        requestId: event.payload.requestId,
        toolName: event.payload.toolName,
        turn: event.turn,
        at: event.at,
        ok: true,
        output: event.payload.output,
        facts: event.payload.facts,
        replayed: event.payload.replayed,
      };
      const ledger: ActionLedger = event.payload.replayed
        ? base.ledger
        : {
            ...base.ledger,
            [event.payload.idempotencyKey]: {
              key: event.payload.idempotencyKey,
              toolName: event.payload.toolName,
              argsHash: event.payload.idempotencyKey,
              turn: event.turn,
              at: event.at,
              requestId: event.payload.requestId,
              result: { ok: true, output: event.payload.output, facts: event.payload.facts },
            },
          };
      return {
        ...base,
        ledger,
        turnToolResults: [...base.turnToolResults, record],
        allToolResults: [...base.allToolResults, record],
      };
    }

    case "ToolExecutionFailed": {
      const record: ToolResultRecord = {
        requestId: event.payload.requestId,
        toolName: event.payload.toolName,
        turn: event.turn,
        at: event.at,
        ok: false,
        error: event.payload.error,
      };
      // A failed attempt is NOT written to the idempotency ledger: the point of idempotency is to
      // prevent duplicate effects, not to make a transient failure permanent.
      return {
        ...base,
        turnToolResults: [...base.turnToolResults, record],
        allToolResults: [...base.allToolResults, record],
      };
    }

    case "AssistantMessageEmitted":
      return {
        ...base,
        transcript: [...base.transcript, { role: "assistant", text: event.payload.text, turn: event.turn, at: event.at }],
      };

    case "RuntimeError":
      return base;

    default:
      return base;
  }
}

/** Full projection from an empty session. */
export function project(initial: SessionState, events: SessionEvent[]): SessionState {
  return events.reduce(applyEvent, initial);
}

/**
 * Resume from a snapshot plus the events that came after it.
 *
 * Events at or below `throughSeq` are skipped, so passing the whole stream is safe and idempotent.
 */
export function resume(snapshot: SessionSnapshot, laterEvents: SessionEvent[]): SessionState {
  return laterEvents.filter((e) => e.seq > snapshot.throughSeq).reduce(applyEvent, snapshot.state);
}

export function snapshotOf(state: SessionState): SessionSnapshot {
  return { state: structuredClone(state), throughSeq: state.lastSeq };
}
