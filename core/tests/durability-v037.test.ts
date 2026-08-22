import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { AgentDefinition } from "../src/definition/types.ts";
import type { HarnessImplementation, HarnessServices, HarnessTurnInput, HarnessTurnResult } from "../src/harness/types.ts";
import type { SessionEvent, SessionEventInput } from "../src/session/events.ts";
import type { AppendEventsOptions, CreateSessionInput, DraftEvent, SessionRecord, SessionStore } from "../src/session/store.ts";
import type { SessionSnapshot } from "../src/session/state.ts";
import type { ToolDefinition, ToolResult } from "../src/tools/types.ts";
import { AgentRuntime, InMemorySessionStore, SessionConcurrencyConflictError } from "../src/index.ts";
import { defineAgent } from "../src/definition/definition.ts";
import { KnowledgeIndex } from "../src/knowledge/in-memory.ts";
import { ToolRegistry } from "../src/tools/registry.ts";
import { attemptToolCall, grantKey, resolvePendingConfirmation } from "../src/tools/authorize.ts";
import { RecordingExecutor } from "../src/testing/fake-executors.ts";
import { StaticModelProvider } from "../src/testing/scripted-provider.ts";
import { createDeterministicIds, createFixedClock } from "../src/util/ids.ts";
import { hashValue } from "../src/util/hash.ts";
import { initialState, project, resume, snapshotOf } from "../src/session/state.ts";
import { openDatabase, SqliteSessionStore } from "../../apps/studio/src/sqlite-store.ts";

function actionDefinition(name = "send_external", confirmation: ToolDefinition["confirmation"] = "none"): ToolDefinition {
  return {
    name,
    label: "send external",
    description: "Synthetic external side effect.",
    effect: "external_side_effect",
    confirmation,
    idempotency: "per_input",
    argumentPolicies: { item_id: { kind: "model_composed" } },
    input: { kind: "object", fields: { item_id: { required: true, schema: { kind: "string" } } } },
    output: { kind: "object", additionalProperties: true, fields: {} },
  };
}

function definitionWith(action: ToolDefinition, policies: Partial<AgentDefinition["policies"]> = {}): AgentDefinition {
  return defineAgent({
    id: `durability-${action.name}`,
    name: "Durability Test Agent",
    goal: "Exercise durable execution safety using synthetic tools.",
    model: { providerId: "static", model: "static-model", temperature: 0 },
    globalRules: [],
    memorySchema: { fields: [] },
    hostContextSchema: { fields: [] },
    knowledge: [],
    tools: [{ definition: action }],
    planning: { mode: "deterministic", extractWorkingNotes: false },
    policies: {
      maxSteps: 2,
      maxToolCallsPerTurn: 3,
      maxActionRequestsPerTurn: 3,
      maxAgentIterations: 3,
      ...policies,
    },
  });
}

function buildRuntime(params: {
  definition: AgentDefinition;
  sessions: SessionStore;
  executor: RecordingExecutor;
  harness: HarnessImplementation;
  idSeed?: number;
}): AgentRuntime {
  const tools = new ToolRegistry(params.definition.tools);
  tools.register(params.definition.tools[0]!.definition.name, params.executor);
  return new AgentRuntime({
    definition: params.definition,
    sessions: params.sessions,
    model: new StaticModelProvider("ok"),
    tools,
    knowledge: new KnowledgeIndex([]),
    harness: params.harness,
    ids: createDeterministicIds(params.idSeed ?? 0),
    clock: createFixedClock("2026-06-01T00:00:00.000Z"),
  });
}

function depsFor(input: HarnessTurnInput, services: HarnessServices) {
  return {
    definition: services.definition,
    tools: services.tools,
    journal: input.journal,
    confirmationResolver: services.confirmationResolver,
    ids: services.ids,
    clock: services.clock,
    durability: services.durability,
    grants: new Set<string>(),
  };
}

class DirectExternalHarness implements HarnessImplementation {
  readonly name = "direct-external-v037";
  private readonly toolName: string;
  private readonly args: Record<string, unknown>;

  constructor(toolName: string, args: Record<string, unknown> = { item_id: "A-1" }) {
    this.toolName = toolName;
    this.args = args;
  }

  async runTurn(input: HarnessTurnInput, services: HarnessServices): Promise<HarnessTurnResult> {
    const outcome = await attemptToolCall(depsFor(input, services), this.toolName, this.args, input.turn, "model");
    const text = outcome.kind === "rejected" ? outcome.rejection.message : "done";
    input.journal.append({
      type: "AssistantMessageEmitted",
      turn: input.turn,
      payload: { text, stopReason: outcome.kind === "rejected" ? "error" : "completed" },
    });
    return { replyText: text, stopReason: outcome.kind === "rejected" ? "error" : "completed", steps: 1 };
  }
}

class ConfirmingExternalHarness implements HarnessImplementation {
  readonly name = "confirming-external-v037";
  private readonly toolName: string;
  private readonly args: Record<string, unknown>;

  constructor(toolName: string, args: Record<string, unknown> = { item_id: "A-1" }) {
    this.toolName = toolName;
    this.args = args;
  }

  async runTurn(input: HarnessTurnInput, services: HarnessServices): Promise<HarnessTurnResult> {
    const deps = depsFor(input, services);
    const confirmation = resolvePendingConfirmation(deps, input.userMessage, input.turn);
    if (confirmation.resolved && confirmation.decision === "confirm") {
      const key = grantKey(confirmation.action.toolName, confirmation.action.argsHash);
      deps.grants.add(key);
      const outcome = await attemptToolCall(deps, confirmation.action.toolName, confirmation.action.args, input.turn, "runtime");
      const text = outcome.kind === "rejected" ? outcome.rejection.message : "attempted";
      input.journal.append({ type: "AssistantMessageEmitted", turn: input.turn, payload: { text, stopReason: outcome.kind === "rejected" ? "error" : "completed" } });
      return { replyText: text, stopReason: outcome.kind === "rejected" ? "error" : "completed", steps: 1 };
    }

    const outcome = await attemptToolCall(deps, this.toolName, this.args, input.turn, "model");
    const text = outcome.kind === "awaiting_confirmation" ? outcome.promptText : "done";
    input.journal.append({
      type: "AssistantMessageEmitted",
      turn: input.turn,
      payload: { text, stopReason: outcome.kind === "awaiting_confirmation" ? "awaiting_confirmation" : "completed" },
    });
    return { replyText: text, stopReason: outcome.kind === "awaiting_confirmation" ? "awaiting_confirmation" : "completed", steps: 1 };
  }
}

class BarrierExternalHarness implements HarnessImplementation {
  readonly name = "barrier-external-v037";
  private readonly barrier: Barrier;
  private readonly toolName: string;

  constructor(barrier: Barrier, toolName: string) {
    this.barrier = barrier;
    this.toolName = toolName;
  }

  async runTurn(input: HarnessTurnInput, services: HarnessServices): Promise<HarnessTurnResult> {
    await this.barrier.wait();
    const outcome = await attemptToolCall(depsFor(input, services), this.toolName, { item_id: "RACE-1" }, input.turn, "model");
    const text = outcome.kind === "rejected" ? outcome.rejection.message : "done";
    input.journal.append({
      type: "AssistantMessageEmitted",
      turn: input.turn,
      payload: { text, stopReason: outcome.kind === "rejected" ? "error" : "completed" },
    });
    return { replyText: text, stopReason: outcome.kind === "rejected" ? "error" : "completed", steps: 1 };
  }
}

class OrdinaryBarrierHarness implements HarnessImplementation {
  readonly name = "ordinary-barrier-v037";
  private readonly barrier: Barrier;
  private readonly note: string;

  constructor(barrier: Barrier, note: string) {
    this.barrier = barrier;
    this.note = note;
  }

  async runTurn(input: HarnessTurnInput): Promise<HarnessTurnResult> {
    input.journal.append({
      type: "WorkingNoteRecorded",
      turn: input.turn,
      payload: { note: { id: `note-${this.note}`, text: this.note, turn: input.turn, at: "2026-06-01T00:00:00.000Z", sourceEventIds: [input.userEventId] } },
    });
    await this.barrier.wait();
    input.journal.append({ type: "AssistantMessageEmitted", turn: input.turn, payload: { text: this.note, stopReason: "completed" } });
    return { replyText: this.note, stopReason: "completed", steps: 1 };
  }
}

class CheckpointOrderingHarness implements HarnessImplementation {
  readonly name = "checkpoint-ordering-v037";
  private readonly toolName: string;

  constructor(toolName: string) {
    this.toolName = toolName;
  }

  async runTurn(input: HarnessTurnInput, services: HarnessServices): Promise<HarnessTurnResult> {
    input.journal.append({
      type: "WorkingNoteRecorded",
      turn: input.turn,
      payload: { note: { id: "before", text: "before", turn: input.turn, at: "2026-06-01T00:00:00.000Z", sourceEventIds: [input.userEventId] } },
    });
    await attemptToolCall(depsFor(input, services), this.toolName, { item_id: "ORDER-1" }, input.turn, "model");
    input.journal.append({
      type: "WorkingNoteRecorded",
      turn: input.turn,
      payload: { note: { id: "after", text: "after", turn: input.turn, at: "2026-06-01T00:00:01.000Z", sourceEventIds: [input.userEventId] } },
    });
    input.journal.append({ type: "AssistantMessageEmitted", turn: input.turn, payload: { text: "ordered", stopReason: "completed" } });
    return { replyText: "ordered", stopReason: "completed", steps: 1 };
  }
}

class ThrowAfterSuccessHarness implements HarnessImplementation {
  readonly name = "throw-after-success-v037";
  private readonly toolName: string;

  constructor(toolName: string) {
    this.toolName = toolName;
  }

  async runTurn(input: HarnessTurnInput, services: HarnessServices): Promise<HarnessTurnResult> {
    await attemptToolCall(depsFor(input, services), this.toolName, { item_id: "THROW-1" }, input.turn, "model");
    throw new Error("synthetic later harness failure");
  }
}

interface Barrier {
  wait(): Promise<void>;
}

function barrier(count: number): Barrier {
  let arrived = 0;
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    wait() {
      arrived++;
      if (arrived === count) release();
      return released;
    },
  };
}

class StoreWrapper implements SessionStore {
  readonly inner: SessionStore;

  constructor(inner: SessionStore) {
    this.inner = inner;
  }

  createSession(input: CreateSessionInput): Promise<SessionRecord> {
    return this.inner.createSession(input);
  }

  getSession(sessionId: string): Promise<SessionRecord | undefined> {
    return this.inner.getSession(sessionId);
  }

  listSessions(agentId?: string): Promise<SessionRecord[]> {
    return this.inner.listSessions(agentId);
  }

  append(sessionId: string, drafts: DraftEvent[], options?: AppendEventsOptions): Promise<SessionEvent[]> {
    return this.inner.append(sessionId, drafts, options);
  }

  readEvents(sessionId: string, fromSeq?: number): Promise<SessionEvent[]> {
    return this.inner.readEvents(sessionId, fromSeq);
  }

  saveSnapshot(sessionId: string, snapshot: SessionSnapshot): Promise<void> {
    return this.inner.saveSnapshot(sessionId, snapshot);
  }

  loadSnapshot(sessionId: string): Promise<SessionSnapshot | undefined> {
    return this.inner.loadSnapshot(sessionId);
  }
}

class CommitStartedThenThrowStore extends StoreWrapper {
  override async append(sessionId: string, drafts: DraftEvent[], options?: AppendEventsOptions): Promise<SessionEvent[]> {
    const stored = await this.inner.append(sessionId, drafts, options);
    if (drafts.some((draft) => draft.type === "ToolExecutionStarted")) {
      throw new Error("synthetic crash after durable started");
    }
    return stored;
  }
}

class DropTerminalStore extends StoreWrapper {
  override async append(sessionId: string, drafts: DraftEvent[], options?: AppendEventsOptions): Promise<SessionEvent[]> {
    if (drafts.some((draft) =>
      draft.type === "ToolExecutionSucceeded"
      || draft.type === "ToolExecutionFailed"
      || draft.type === "ToolExecutionOutcomeUnknown"
    )) {
      throw new Error("synthetic terminal persistence loss");
    }
    return this.inner.append(sessionId, drafts, options);
  }
}

describe("v0.37 durable external execution safety", () => {
  test("case 1: concurrent stale external turns dispatch only the CAS winner", async () => {
    const action = actionDefinition("race_external");
    const definition = definitionWith(action);
    const sessions = new InMemorySessionStore();
    const executor = new RecordingExecutor(() => ({ ok: true, output: { committed: true } }));
    const gate = barrier(2);
    const runtimeA = buildRuntime({ definition, sessions, executor, harness: new BarrierExternalHarness(gate, action.name), idSeed: 0 });
    const runtimeB = buildRuntime({ definition, sessions, executor, harness: new BarrierExternalHarness(gate, action.name), idSeed: 1000 });
    const sessionId = await runtimeA.createSession("race-external");

    const [a, b] = await Promise.all([
      runtimeA.runTurn({ sessionId, message: "send A" }),
      runtimeB.runTurn({ sessionId, message: "send B" }),
    ]);

    assert.equal(executor.callCount, 1, "the stale loser must not call the executor");
    assert.equal([a.stopReason, b.stopReason].filter((reason) => reason === "error").length, 1);
    const events = await sessions.readEvents(sessionId);
    assert.equal(events.filter((event) => event.type === "ToolExecutionStarted").length, 1);
    assert.equal(events.filter((event) => event.type === "ToolExecutionSucceeded").length, 1);
    events.forEach((event, index) => assert.equal(event.seq, index + 1));
  });

  test("case 2: durable Started before executor is replayed as unresolved and blocks retry", async () => {
    const action = actionDefinition("crash_before_executor");
    const definition = definitionWith(action);
    const base = new InMemorySessionStore();
    const crashStore = new CommitStartedThenThrowStore(base);
    const executor = new RecordingExecutor(() => ({ ok: true, output: { committed: true } }));
    const runtime = buildRuntime({ definition, sessions: crashStore, executor, harness: new DirectExternalHarness(action.name) });
    const sessionId = await runtime.createSession("started-before-executor");

    const crashed = await runtime.runTurn({ sessionId, message: "send it" });

    assert.equal(crashed.stopReason, "error");
    assert.equal(executor.callCount, 0, "executor must not run when the started checkpoint does not return safely");
    const durable = await base.readEvents(sessionId);
    assert.equal(durable.filter((event) => event.type === "ToolExecutionStarted").length, 1);
    assert.equal(durable.some((event) => event.type === "ToolExecutionSucceeded" || event.type === "ToolExecutionFailed"), false);

    const freshExecutor = new RecordingExecutor(() => ({ ok: true, output: { committed: true } }));
    const fresh = buildRuntime({ definition, sessions: base, executor: freshExecutor, harness: new DirectExternalHarness(action.name), idSeed: 2000 });
    const replayed = await fresh.replay(sessionId);
    assert.equal(replayed.unresolvedExternalExecution?.toolName, action.name);

    const retry = await fresh.runTurn({ sessionId, message: "try again" });
    assert.equal(retry.state.unresolvedExternalExecution?.toolName, action.name);
    assert.equal(freshExecutor.callCount, 0, "unresolved started execution is not automatically redispatched");
    assert.ok(retry.events.some((event) => event.type === "ToolCallRejected" && event.payload.reason === "external_outcome_unknown"));
  });

  test("case 3: terminal persistence loss after remote success does not redispatch on restart", async () => {
    const action = actionDefinition("lost_terminal_success");
    const definition = definitionWith(action);
    const base = new InMemorySessionStore();
    const lossy = new DropTerminalStore(base);
    const executor = new RecordingExecutor(() => ({ ok: true, output: { committed: true } }));
    const runtime = buildRuntime({ definition, sessions: lossy, executor, harness: new DirectExternalHarness(action.name) });
    const sessionId = await runtime.createSession("lost-terminal");

    const failed = await runtime.runTurn({ sessionId, message: "send it" });

    assert.equal(failed.stopReason, "error");
    assert.equal(executor.callCount, 1);
    const durable = await base.readEvents(sessionId);
    assert.equal(durable.filter((event) => event.type === "ToolExecutionStarted").length, 1);
    assert.equal(durable.some((event) => event.type === "ToolExecutionSucceeded"), false, "success was not fabricated durably");

    const freshExecutor = new RecordingExecutor(() => ({ ok: true, output: { committed: true } }));
    const fresh = buildRuntime({ definition, sessions: base, executor: freshExecutor, harness: new DirectExternalHarness(action.name), idSeed: 3000 });
    assert.equal((await fresh.replay(sessionId)).unresolvedExternalExecution?.toolName, action.name);
    await fresh.runTurn({ sessionId, message: "send it again" });
    assert.equal(freshExecutor.callCount, 0, "restart must not dispatch after started-without-terminal");
  });

  test("case 4: durable success remains authoritative when later harness work fails", async () => {
    const action = actionDefinition("success_then_throw");
    const definition = definitionWith(action);
    const sessions = new InMemorySessionStore();
    const executor = new RecordingExecutor(() => ({ ok: true, output: { committed: true } }));
    const runtime = buildRuntime({ definition, sessions, executor, harness: new ThrowAfterSuccessHarness(action.name) });
    const sessionId = await runtime.createSession("success-then-throw");

    const result = await runtime.runTurn({ sessionId, message: "send it" });

    assert.equal(result.stopReason, "error");
    assert.equal(executor.callCount, 1);
    assert.ok((await sessions.readEvents(sessionId)).some((event) => event.type === "ToolExecutionSucceeded"));
    assert.equal((await runtime.replay(sessionId)).allToolResults.at(-1)?.outcome, "success");
    assert.doesNotMatch(result.reply, /nothing (?:was )?(?:sent|saved|performed|executed)/i);
  });

  test("case 5: definite failure is retryable only through fresh confirmation with stable idempotency", async () => {
    const action = actionDefinition("definite_failure_retry", "required");
    const definition = definitionWith(action);
    const sessions = new InMemorySessionStore();
    const executor = new RecordingExecutor((_args, call) => call === 1
      ? { ok: false, outcome: "definite_failure", error: { code: "remote_rejected", message: "Rejected before commit." }, retryable: true }
      : { ok: true, output: { committed: true } });
    const runtime = buildRuntime({ definition, sessions, executor, harness: new ConfirmingExternalHarness(action.name) });
    const sessionId = await runtime.createSession("definite-retry");

    assert.equal((await runtime.runTurn({ sessionId, message: "send it" })).stopReason, "awaiting_confirmation");
    await runtime.runTurn({ sessionId, message: "yes, send it" });
    assert.equal(executor.callCount, 1);
    assert.equal((await runtime.replay(sessionId)).allToolResults.at(-1)?.outcome, "definite_failure");

    assert.equal((await runtime.runTurn({ sessionId, message: "retry it" })).stopReason, "awaiting_confirmation");
    assert.equal(executor.callCount, 1, "fresh confirmation is required before retry");
    await runtime.runTurn({ sessionId, message: "yes, retry that exact action" });
    assert.equal(executor.callCount, 2);
    assert.equal(executor.calls[0]!.context.idempotencyKey, executor.calls[1]!.context.idempotencyKey);
  });

  test("case 6: executor-produced outcome_unknown remains non-retryable", async () => {
    const action = actionDefinition("unknown_no_retry");
    const definition = definitionWith(action);
    const sessions = new InMemorySessionStore();
    const executor = new RecordingExecutor(() => ({ ok: false, outcome: "outcome_unknown", error: { code: "response_lost", message: "No terminal response." } }));
    const runtime = buildRuntime({ definition, sessions, executor, harness: new DirectExternalHarness(action.name) });
    const sessionId = await runtime.createSession("unknown-no-retry");

    await runtime.runTurn({ sessionId, message: "send it" });
    assert.equal(executor.callCount, 1);
    assert.equal((await runtime.replay(sessionId)).allToolResults.at(-1)?.outcome, "outcome_unknown");

    const retry = await runtime.runTurn({ sessionId, message: "send it again" });
    assert.equal(executor.callCount, 1);
    assert.ok(retry.events.some((event) => event.type === "ToolCallRejected" && event.payload.reason === "external_outcome_unknown"));
  });

  test("case 8: checkpoint and final persistence do not duplicate events", async () => {
    const action = actionDefinition("ordering_external");
    const definition = definitionWith(action);
    const sessions = new InMemorySessionStore();
    const executor = new RecordingExecutor(() => ({ ok: true, output: { committed: true } }));
    const runtime = buildRuntime({ definition, sessions, executor, harness: new CheckpointOrderingHarness(action.name) });
    const sessionId = await runtime.createSession("checkpoint-ordering");

    const result = await runtime.runTurn({ sessionId, message: "send it" });
    const events = await sessions.readEvents(sessionId);

    assert.deepEqual(result.events.map((event) => event.id), events.map((event) => event.id));
    assert.equal(new Set(events.map((event) => event.id)).size, events.length);
    assert.deepEqual(
      events.map((event) => event.type),
      [
        "UserMessageReceived",
        "WorkingNoteRecorded",
        "ToolRequested",
        "ToolExecutionStarted",
        "ToolExecutionSucceeded",
        "WorkingNoteRecorded",
        "AssistantMessageEmitted",
      ],
    );
  });
});

describe("v0.37 session concurrency and replay", () => {
  test("case 7: stale ordinary turn finalization fails CAS instead of appending", async () => {
    const action = actionDefinition("ordinary_placeholder");
    const definition = definitionWith(action);
    const sessions = new InMemorySessionStore();
    const executor = new RecordingExecutor();
    const gate = barrier(2);
    const runtimeA = buildRuntime({ definition, sessions, executor, harness: new OrdinaryBarrierHarness(gate, "first"), idSeed: 0 });
    const runtimeB = buildRuntime({ definition, sessions, executor, harness: new OrdinaryBarrierHarness(gate, "second"), idSeed: 1000 });
    const sessionId = await runtimeA.createSession("ordinary-race");

    const [a, b] = await Promise.all([
      runtimeA.runTurn({ sessionId, message: "ordinary A" }),
      runtimeB.runTurn({ sessionId, message: "ordinary B" }),
    ]);

    assert.equal([a.stopReason, b.stopReason].filter((reason) => reason === "error").length, 1);
    const events = await sessions.readEvents(sessionId);
    assert.equal(events.filter((event) => event.type === "UserMessageReceived").length, 1);
    events.forEach((event, index) => assert.equal(event.seq, index + 1));
  });

  test("case 9: project(all events) equals resume(snapshot, later) across checkpoints and orphan starts", () => {
    const base = initialState({
      sessionId: "snapshot-equivalence",
      agentId: "durability-equivalence",
      agentVersion: 1,
      createdAt: "2026-06-01T00:00:00.000Z",
    });
    const events: SessionEvent[] = [
      event(1, { type: "UserMessageReceived", turn: 1, payload: { text: "normal" } }),
      event(2, { type: "AssistantMessageEmitted", turn: 1, payload: { text: "ok", stopReason: "completed" } }),
      event(3, { type: "ToolExecutionStarted", turn: 2, payload: { requestId: "act-1", toolName: "external_a", args: { item_id: "A" }, actionKey: `external_a:${hashValue({ item_id: "A" })}`, idempotencyKey: "snapshot-equivalence:external_a", effect: "external_side_effect" } }),
      event(4, { type: "ToolExecutionSucceeded", turn: 2, payload: { requestId: "act-1", toolName: "external_a", output: { committed: true }, actionKey: `external_a:${hashValue({ item_id: "A" })}`, idempotencyKey: "snapshot-equivalence:external_a" } }),
      event(5, { type: "ToolExecutionStarted", turn: 3, payload: { requestId: "act-2", toolName: "external_b", args: { item_id: "B" }, actionKey: `external_b:${hashValue({ item_id: "B" })}`, idempotencyKey: "snapshot-equivalence:external_b", effect: "external_side_effect" } }),
      event(6, { type: "RuntimeError", turn: 3, payload: { code: "recovered_unresolved_execution", message: "interrupted before terminal outcome" } }),
    ];
    const full = project(base, events);

    for (let cut = 0; cut <= events.length; cut++) {
      const partial = project(base, events.slice(0, cut));
      const resumed = resume(snapshotOf(partial), events);
      assert.deepEqual(resumed, full, `snapshot cut ${cut} must resume to full projection`);
    }
    assert.equal(full.unresolvedExternalExecution?.toolName, "external_b");
    assert.equal(full.allToolResults.some((result) => result.requestId === "act-2"), false, "orphan start is unresolved, not a fabricated terminal result");
  });
});

describe("v0.37 SessionStore expected-sequence contract", () => {
  test("InMemorySessionStore rejects a stale expected sequence without changing the stream", async () => {
    const store = new InMemorySessionStore();
    await store.createSession({ sessionId: "memory-cas", agentId: "a", agentVersion: 1, createdAt: "2026-06-01T00:00:00.000Z" });
    await store.append("memory-cas", [draft("evt-1", { type: "UserMessageReceived", turn: 1, payload: { text: "one" } })], { expectedSeq: 0 });

    await assert.rejects(
      () => store.append("memory-cas", [draft("evt-2", { type: "UserMessageReceived", turn: 2, payload: { text: "two" } })], { expectedSeq: 0 }),
      (error) => error instanceof SessionConcurrencyConflictError && error.code === "session_concurrency_conflict",
    );
    assert.deepEqual((await store.readEvents("memory-cas")).map((item) => item.id), ["evt-1"]);
  });

  test("SqliteSessionStore rejects a stale expected sequence without changing the stream", async () => {
    const db = openDatabase(":memory:");
    const store = new SqliteSessionStore(db);
    await store.createSession({ sessionId: "sqlite-cas", agentId: "a", agentVersion: 1, createdAt: "2026-06-01T00:00:00.000Z" });
    await store.append("sqlite-cas", [draft("evt-1", { type: "UserMessageReceived", turn: 1, payload: { text: "one" } })], { expectedSeq: 0 });

    await assert.rejects(
      () => store.append("sqlite-cas", [draft("evt-2", { type: "UserMessageReceived", turn: 2, payload: { text: "two" } })], { expectedSeq: 0 }),
      (error) => error instanceof SessionConcurrencyConflictError && error.code === "session_concurrency_conflict",
    );
    assert.deepEqual((await store.readEvents("sqlite-cas")).map((item) => item.id), ["evt-1"]);
    db.close();
  });
});

function draft(id: string, input: SessionEventInput): DraftEvent {
  return { id, turn: input.turn, at: "2026-06-01T00:00:00.000Z", type: input.type, payload: input.payload };
}

function event(seq: number, input: SessionEventInput): SessionEvent {
  return {
    ...draft(`evt-${seq}`, input),
    seq,
    sessionId: "snapshot-equivalence",
  } as SessionEvent;
}
