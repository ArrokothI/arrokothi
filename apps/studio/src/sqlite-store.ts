import { DatabaseSync } from "node:sqlite";
import type {
  AgentDefinition,
  CreateSessionInput,
  DefinitionStore,
  DraftEvent,
  SessionEvent,
  SessionRecord,
  SessionSnapshot,
  SessionStore,
} from "@agent-sdk/core";

/**
 * SQLite persistence for the Studio.
 *
 * This is the whole point of the storage adapter boundary: core defines `SessionStore` and
 * `DefinitionStore` and knows nothing about SQL. Everything here is replaceable without touching a
 * line of the kernel.
 *
 * `node:sqlite` is built into Node, so there is no native module to compile and no dependency to
 * install.
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS agent_definitions (
  id          TEXT NOT NULL,
  version     INTEGER NOT NULL,
  json        TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (id, version)
);

CREATE TABLE IF NOT EXISTS sessions (
  id             TEXT PRIMARY KEY,
  agent_id       TEXT NOT NULL,
  agent_version  INTEGER NOT NULL,
  label          TEXT,
  snapshot_json  TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_events (
  session_id  TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  id          TEXT NOT NULL,
  turn        INTEGER NOT NULL,
  event_type  TEXT NOT NULL,
  json        TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (session_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_events_session ON session_events (session_id, seq);
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions (agent_id, updated_at DESC);
`;

export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  return db;
}

export class SqliteDefinitionStore implements DefinitionStore {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async save(definition: AgentDefinition): Promise<void> {
    const existing = this.db
      .prepare("SELECT version FROM agent_definitions WHERE id = ? AND version = ?")
      .get(definition.id, definition.version);
    if (existing) {
      throw new Error(`definition "${definition.id}" version ${definition.version} already exists; bump the version instead of editing it`);
    }
    const now = new Date().toISOString();
    this.db
      .prepare("INSERT INTO agent_definitions (id, version, json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(definition.id, definition.version, JSON.stringify(definition), definition.createdAt ?? now, now);
  }

  async get(id: string, version?: number): Promise<AgentDefinition | undefined> {
    const row =
      version === undefined
        ? this.db.prepare("SELECT json FROM agent_definitions WHERE id = ? ORDER BY version DESC LIMIT 1").get(id)
        : this.db.prepare("SELECT json FROM agent_definitions WHERE id = ? AND version = ?").get(id, version);
    return row ? (JSON.parse(String(row["json"])) as AgentDefinition) : undefined;
  }

  async listVersions(id: string): Promise<number[]> {
    return this.db
      .prepare("SELECT version FROM agent_definitions WHERE id = ? ORDER BY version ASC")
      .all(id)
      .map((r) => Number(r["version"]));
  }

  async listLatest(): Promise<AgentDefinition[]> {
    const rows = this.db
      .prepare(
        `SELECT d.json FROM agent_definitions d
         JOIN (SELECT id, MAX(version) AS v FROM agent_definitions GROUP BY id) m
           ON d.id = m.id AND d.version = m.v
         ORDER BY d.updated_at DESC`,
      )
      .all();
    return rows.map((r) => JSON.parse(String(r["json"])) as AgentDefinition);
  }

  async delete(id: string, version?: number): Promise<void> {
    if (version === undefined) {
      this.db.prepare("DELETE FROM agent_definitions WHERE id = ?").run(id);
    } else {
      this.db.prepare("DELETE FROM agent_definitions WHERE id = ? AND version = ?").run(id, version);
    }
  }
}

export class SqliteSessionStore implements SessionStore {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    this.db
      .prepare("INSERT INTO sessions (id, agent_id, agent_version, label, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(input.sessionId, input.agentId, input.agentVersion, input.label ?? null, input.createdAt, input.createdAt);
    return {
      sessionId: input.sessionId,
      agentId: input.agentId,
      agentVersion: input.agentVersion,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      label: input.label,
    };
  }

  async getSession(sessionId: string): Promise<SessionRecord | undefined> {
    const row = this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
    return row ? this.toRecord(row) : undefined;
  }

  async listSessions(agentId?: string): Promise<SessionRecord[]> {
    const rows = agentId
      ? this.db.prepare("SELECT * FROM sessions WHERE agent_id = ? ORDER BY updated_at DESC").all(agentId)
      : this.db.prepare("SELECT * FROM sessions ORDER BY updated_at DESC").all();
    return rows.map((r) => this.toRecord(r));
  }

  /**
   * Appends atomically.
   *
   * The sequence number is derived inside the transaction (`MAX(seq) + 1`), so two writers cannot
   * both claim the same slot - the append is where gaplessness is actually enforced, not the caller.
   */
  async append(sessionId: string, drafts: DraftEvent[]): Promise<SessionEvent[]> {
    if (!drafts.length) return [];
    const stored: SessionEvent[] = [];

    this.db.exec("BEGIN IMMEDIATE");
    try {
      const maxRow = this.db.prepare("SELECT COALESCE(MAX(seq), 0) AS m FROM session_events WHERE session_id = ?").get(sessionId);
      let seq = Number(maxRow?.["m"] ?? 0);
      const insert = this.db.prepare(
        "INSERT INTO session_events (session_id, seq, id, turn, event_type, json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      );
      for (const draft of drafts) {
        seq += 1;
        const event = { ...draft, seq, sessionId } as SessionEvent;
        insert.run(sessionId, seq, draft.id, draft.turn, draft.type, JSON.stringify(draft.payload), draft.at);
        stored.push(event);
      }
      this.db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(drafts[drafts.length - 1]!.at, sessionId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return stored;
  }

  async readEvents(sessionId: string, fromSeq = 0): Promise<SessionEvent[]> {
    return this.db
      .prepare("SELECT * FROM session_events WHERE session_id = ? AND seq > ? ORDER BY seq ASC")
      .all(sessionId, fromSeq)
      .map(
        (row) =>
          ({
            seq: Number(row["seq"]),
            id: String(row["id"]),
            sessionId,
            turn: Number(row["turn"]),
            at: String(row["created_at"]),
            type: String(row["event_type"]),
            payload: JSON.parse(String(row["json"])),
          }) as SessionEvent,
      );
  }

  async saveSnapshot(sessionId: string, snapshot: SessionSnapshot): Promise<void> {
    this.db.prepare("UPDATE sessions SET snapshot_json = ? WHERE id = ?").run(JSON.stringify(snapshot), sessionId);
  }

  async loadSnapshot(sessionId: string): Promise<SessionSnapshot | undefined> {
    const row = this.db.prepare("SELECT snapshot_json FROM sessions WHERE id = ?").get(sessionId);
    const json = row?.["snapshot_json"];
    return json ? (JSON.parse(String(json)) as SessionSnapshot) : undefined;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM session_events WHERE session_id = ?").run(sessionId);
      this.db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  private toRecord(row: Record<string, unknown>): SessionRecord {
    return {
      sessionId: String(row["id"]),
      agentId: String(row["agent_id"]),
      agentVersion: Number(row["agent_version"]),
      label: row["label"] ? String(row["label"]) : undefined,
      createdAt: String(row["created_at"]),
      updatedAt: String(row["updated_at"]),
      snapshot: row["snapshot_json"] ? (JSON.parse(String(row["snapshot_json"])) as SessionSnapshot) : undefined,
    };
  }
}
