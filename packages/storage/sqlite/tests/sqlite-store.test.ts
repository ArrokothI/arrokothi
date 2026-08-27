import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { SessionConcurrencyConflictError, type DraftEvent, type SessionEventInput } from "@agent-sdk/core";
import { openDatabase, SqliteSessionStore } from "../src/index.ts";

describe("SqliteSessionStore expected-sequence contract", () => {
  test("rejects a stale expected sequence without changing the stream", async () => {
    const db = openDatabase(":memory:");
    const store = new SqliteSessionStore(db);
    try {
      await store.createSession({
        sessionId: "sqlite-cas",
        agentId: "a",
        agentVersion: 1,
        createdAt: "2026-06-01T00:00:00.000Z",
      });
      await store.append("sqlite-cas", [draft("evt-1", {
        type: "UserMessageReceived",
        turn: 1,
        payload: { text: "one" },
      })], { expectedSeq: 0 });

      await assert.rejects(
        () => store.append("sqlite-cas", [draft("evt-2", {
          type: "UserMessageReceived",
          turn: 2,
          payload: { text: "two" },
        })], { expectedSeq: 0 }),
        (error) => error instanceof SessionConcurrencyConflictError
          && error.code === "session_concurrency_conflict",
      );
      assert.deepEqual((await store.readEvents("sqlite-cas")).map((item) => item.id), ["evt-1"]);
    } finally {
      db.close();
    }
  });
});

function draft(id: string, input: SessionEventInput): DraftEvent {
  return {
    id,
    turn: input.turn,
    at: "2026-06-01T00:00:00.000Z",
    type: input.type,
    payload: input.payload,
  };
}
