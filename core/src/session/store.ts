import type { SessionEvent, SessionEventType } from "./events.ts";
import type { SessionSnapshot } from "./state.ts";

/**
 * Storage interfaces.
 *
 * Core defines them and ships an in-memory implementation. SQLite, Postgres, or anything else lives
 * outside core behind this adapter - `apps/studio` implements exactly these two interfaces over
 * `node:sqlite`, and the runtime cannot tell which one it was given.
 */

/** A draft carries everything except `seq`, which only the store may assign. */
export interface DraftEvent {
  id: string;
  turn: number;
  at: string;
  type: SessionEventType;
  payload: unknown;
}

export interface SessionRecord {
  sessionId: string;
  agentId: string;
  agentVersion: number;
  createdAt: string;
  updatedAt: string;
  /** Optional projection cache. Correctness never depends on it. */
  snapshot?: SessionSnapshot;
  /** Free-form label for the Studio's session list. */
  label?: string;
}

export interface CreateSessionInput {
  sessionId: string;
  agentId: string;
  agentVersion: number;
  createdAt: string;
  label?: string;
}

export interface SessionStore {
  createSession(input: CreateSessionInput): Promise<SessionRecord>;
  getSession(sessionId: string): Promise<SessionRecord | undefined>;
  listSessions(agentId?: string): Promise<SessionRecord[]>;
  /**
   * Appends atomically, assigning gapless `seq` values, and returns the stored events.
   *
   * When `expectedSeq` is supplied, comparison and append are one store operation: the append
   * succeeds only when the current durable stream sequence still equals `expectedSeq`.
   */
  append(sessionId: string, drafts: DraftEvent[], options?: AppendEventsOptions): Promise<SessionEvent[]>;
  /** Events with `seq > fromSeq`, ascending. Omitting `fromSeq` returns the whole stream. */
  readEvents(sessionId: string, fromSeq?: number): Promise<SessionEvent[]>;
  saveSnapshot(sessionId: string, snapshot: SessionSnapshot): Promise<void>;
  loadSnapshot(sessionId: string): Promise<SessionSnapshot | undefined>;
  deleteSession?(sessionId: string): Promise<void>;
}

export interface AppendEventsOptions {
  expectedSeq?: number;
}

export class SessionConcurrencyConflictError extends Error {
  readonly code = "session_concurrency_conflict";
  readonly sessionId: string;
  readonly expectedSeq: number;
  readonly actualSeq: number;

  constructor(sessionId: string, expectedSeq: number, actualSeq: number) {
    super(`session "${sessionId}" changed concurrently: expected seq ${expectedSeq}, found ${actualSeq}`);
    this.name = "SessionConcurrencyConflictError";
    this.sessionId = sessionId;
    this.expectedSeq = expectedSeq;
    this.actualSeq = actualSeq;
  }
}

export function isSessionConcurrencyConflictError(error: unknown): error is SessionConcurrencyConflictError {
  return error instanceof SessionConcurrencyConflictError
    || (typeof error === "object" && error !== null && (error as { code?: unknown }).code === "session_concurrency_conflict");
}

/** Reference implementation. Used by tests, examples, and benchmarks; holds nothing on disk. */
export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly events = new Map<string, SessionEvent[]>();

  async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    if (this.sessions.has(input.sessionId)) throw new Error(`session "${input.sessionId}" already exists`);
    const record: SessionRecord = {
      sessionId: input.sessionId,
      agentId: input.agentId,
      agentVersion: input.agentVersion,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      label: input.label,
    };
    this.sessions.set(record.sessionId, record);
    this.events.set(record.sessionId, []);
    return record;
  }

  async getSession(sessionId: string): Promise<SessionRecord | undefined> {
    return this.sessions.get(sessionId);
  }

  async listSessions(agentId?: string): Promise<SessionRecord[]> {
    return [...this.sessions.values()]
      .filter((s) => !agentId || s.agentId === agentId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async append(sessionId: string, drafts: DraftEvent[], options: AppendEventsOptions = {}): Promise<SessionEvent[]> {
    const record = this.sessions.get(sessionId);
    if (!record) throw new Error(`unknown session "${sessionId}"`);
    const stream = this.events.get(sessionId) ?? [];
    if (options.expectedSeq !== undefined && stream.length !== options.expectedSeq) {
      throw new SessionConcurrencyConflictError(sessionId, options.expectedSeq, stream.length);
    }
    const stored = drafts.map((draft, i) => ({
      ...draft,
      seq: stream.length + i + 1,
      sessionId,
    })) as SessionEvent[];
    stream.push(...stored);
    this.events.set(sessionId, stream);
    if (stored.length) record.updatedAt = stored[stored.length - 1]!.at;
    return stored;
  }

  async readEvents(sessionId: string, fromSeq = 0): Promise<SessionEvent[]> {
    return (this.events.get(sessionId) ?? []).filter((e) => e.seq > fromSeq);
  }

  async saveSnapshot(sessionId: string, snapshot: SessionSnapshot): Promise<void> {
    const record = this.sessions.get(sessionId);
    if (!record) throw new Error(`unknown session "${sessionId}"`);
    record.snapshot = snapshot;
  }

  async loadSnapshot(sessionId: string): Promise<SessionSnapshot | undefined> {
    return this.sessions.get(sessionId)?.snapshot;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    this.events.delete(sessionId);
  }
}
