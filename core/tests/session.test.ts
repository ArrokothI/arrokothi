import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AgentRuntime } from "../src/runtime/runtime.ts";
import { InMemorySessionStore } from "../src/session/store.ts";
import { KnowledgeIndex } from "../src/knowledge/in-memory.ts";
import { ToolRegistry } from "../src/tools/registry.ts";
import { ScriptedModelProvider } from "../src/testing/scripted-provider.ts";
import { emailDryRun } from "../src/testing/fake-executors.ts";
import { createDeterministicIds, createFixedClock } from "../src/util/ids.ts";
import { initialState, project, resume, snapshotOf } from "../src/session/state.ts";
import { recordQueryTools } from "../src/tools/record-query-tool.ts";
import { buildRuntime, callTool, interpret, reply, testDefinition } from "./helpers.ts";
import { definitionHash, deserializeDefinition, nextVersion, serializeDefinition, validateDefinition } from "../src/definition/definition.ts";

/** INVARIANT 12 - a session reconstructs from stored events, and a snapshot is only ever a cache. */
describe("invariant 12: reconstruction and resumption", () => {
  const script = () =>
    new ScriptedModelProvider([
      interpret({ intent: "buy", target_location: "TriBeCa", budget: 15_000_000 }),
      reply("TriBeCa, $15M - noted."),
      interpret({ budget: 25_000_000, target_location: "West Village" }),
      reply("Updated to $25M in the West Village."),
      interpret({ contact_name: "Sam Park", phone: "555-0122" }),
      callTool("send_email", { contact_name: "Sam Park", phone: "555-0122" }),
      reply("Confirm and I'll pass it on."),
      interpret({}),
      reply("Sent."),
    ]);

  async function runConversation(useSnapshots: boolean) {
    const definition = testDefinition();
    const sessions = new InMemorySessionStore();
    const knowledge = new KnowledgeIndex(definition.knowledge);
    const tools = new ToolRegistry(definition.tools);
    for (const { definition: d, executor } of recordQueryTools(knowledge)) tools.add(d, executor);
    tools.register("send_email", emailDryRun("success"));

    const runtime = new AgentRuntime({
      definition,
      sessions,
      model: script(),
      tools,
      knowledge,
      ids: createDeterministicIds(),
      clock: createFixedClock(),
      useSnapshots,
    });
    const sessionId = await runtime.createSession("r1");
    await runtime.runTurn({ sessionId, message: "Buying in TriBeCa, $15M.", hostContext: { locale: "en-US" } });
    await runtime.runTurn({ sessionId, message: "Actually $25M, and West Village." });
    await runtime.runTurn({ sessionId, message: "I'm Sam Park, 555-0122." });
    const last = await runtime.runTurn({ sessionId, message: "Yes, go ahead." });
    return { runtime, sessions, sessionId, definition, last };
  }

  test("full replay from events reproduces the live state exactly", async () => {
    const { runtime, sessionId, last } = await runConversation(true);
    const replayed = await runtime.replay(sessionId);
    assert.deepEqual(replayed, last.state);
  });

  test("resume(snapshot, later) equals project(all events)", async () => {
    const { sessions, sessionId, definition } = await runConversation(true);
    const events = await sessions.readEvents(sessionId);
    const record = (await sessions.getSession(sessionId))!;
    const base = initialState({
      sessionId,
      agentId: record.agentId,
      agentVersion: record.agentVersion,
      initialPhaseId: definition.flow?.initialPhaseId ?? null,
      createdAt: record.createdAt,
    });

    const full = project(base, events);
    // Take a snapshot at an arbitrary mid-point and resume from it.
    const cut = Math.floor(events.length / 2);
    const partial = project(base, events.slice(0, cut));
    const resumed = resume(snapshotOf(partial), events);
    assert.deepEqual(resumed, full);

    // And the snapshot the runtime actually saved agrees with a full projection.
    const saved = await sessions.loadSnapshot(sessionId);
    assert.ok(saved);
    assert.deepEqual(saved.state.memory, full.memory);
    assert.equal(saved.throughSeq, events.length);
  });

  test("a session with snapshots disabled produces identical state", async () => {
    const withSnap = await runConversation(true);
    const withoutSnap = await runConversation(false);
    assert.deepEqual(withoutSnap.last.state.memory, withSnap.last.state.memory);
    assert.deepEqual(withoutSnap.last.state.ledger, withSnap.last.state.ledger);
    assert.equal(withoutSnap.last.state.lastSeq, withSnap.last.state.lastSeq);
  });

  test("a fresh runtime process resumes an existing session and keeps corrected state", async () => {
    const { sessions, sessionId, definition } = await runConversation(true);

    // A different runtime object, as if the process had restarted. Nothing is carried in memory.
    const knowledge = new KnowledgeIndex(definition.knowledge);
    const tools = new ToolRegistry(definition.tools);
    tools.register("send_email", emailDryRun("success"));
    const revived = new AgentRuntime({
      definition,
      sessions,
      model: new ScriptedModelProvider([interpret({}), reply("Still $25M in the West Village.")]),
      tools,
      knowledge,
      ids: createDeterministicIds(500),
      clock: createFixedClock("2026-02-01T00:00:00.000Z"),
    });

    const state = await revived.loadState(sessionId);
    assert.equal(state.memory["budget"]?.value, 25_000_000, "the CORRECTED value survives");
    assert.equal(state.memory["budget"]?.previousValue, 15_000_000);
    assert.equal(state.memory["target_location"]?.value, "West Village");
    assert.equal(state.turn, 4);

    // The action ledger survives too, so the duplicate guard still holds after a restart.
    assert.equal(Object.keys(state.ledger).length, 1);
    const result = await revived.runTurn({ sessionId, message: "Where were we?" });
    assert.equal(result.state.turn, 5);
    assert.match(result.contexts.at(-1)!.context.system, /budget: 25000000.*CORRECTED/s);
  });

  test("event sequence numbers are gapless and monotonic across turns", async () => {
    const { sessions, sessionId } = await runConversation(true);
    const events = await sessions.readEvents(sessionId);
    assert.ok(events.length > 10);
    events.forEach((e, i) => {
      assert.equal(e.seq, i + 1, `event ${i} has seq ${e.seq}`);
      assert.equal(e.sessionId, sessionId);
    });
  });

  test("the stream records every required event family for a full handoff conversation", async () => {
    const { sessions, sessionId } = await runConversation(true);
    const types = new Set((await sessions.readEvents(sessionId)).map((e) => e.type));
    for (const required of [
      "UserMessageReceived",
      "HostContextObserved",
      "MemoryWriteProposed",
      "MemoryWriteCommitted",
      "ToolRequested",
      "ConfirmationRequested",
      "ConfirmationResolved",
      "ToolExecutionStarted",
      "ToolExecutionSucceeded",
      "AssistantMessageEmitted",
    ]) {
      assert.ok(types.has(required as never), `missing event family: ${required}`);
    }
  });
});

describe("definition versioning and serialization", () => {
  test("nextVersion clones and bumps without mutating the original", () => {
    const v1 = testDefinition();
    const v2 = nextVersion(v1, { goal: "A different goal." });
    assert.equal(v1.version, 1);
    assert.equal(v2.version, 2);
    assert.equal(v1.goal, "Help a visitor find a property and hand them to a human when they are ready.");
    assert.equal(v2.goal, "A different goal.");
    assert.notEqual(definitionHash(v1), definitionHash(v2));
  });

  test("a definition survives a JSON round trip unchanged", () => {
    const original = testDefinition();
    const restored = deserializeDefinition(serializeDefinition(original));
    assert.deepEqual(restored, original);
    assert.equal(definitionHash(restored), definitionHash(original));
  });

  test("validation catches structural errors and flags design smells", () => {
    const broken = testDefinition({
      flow: { initialPhaseId: "nope", phases: [{ id: "a", objective: "x", transitions: [{ to: "ghost", on: "pre_response", when: { kind: "always" } }] }] },
    });
    const issues = validateDefinition(broken);
    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    assert.ok(errors.some((m) => /initial phase "nope"/.test(m)));
    assert.ok(errors.some((m) => /unknown phase "ghost"/.test(m)));

    // A goal long enough to be a requirements document is a warning, not a silent acceptance.
    const bloated = testDefinition({ goal: "x".repeat(700) });
    assert.ok(validateDefinition(bloated).some((i) => i.severity === "warning" && /concise/.test(i.message)));
  });

  test("a stored version is immutable - saving over it is refused", async () => {
    const { InMemoryDefinitionStore } = await import("../src/definition/store.ts");
    const store = new InMemoryDefinitionStore();
    const def = testDefinition();
    await store.save(def);
    await assert.rejects(() => store.save(def), /already exists/);
    await store.save(nextVersion(def));
    assert.deepEqual(await store.listVersions(def.id), [1, 2]);
    assert.equal((await store.get(def.id))?.version, 2, "get without a version returns the latest");
  });
});

describe("runtime is request-scoped", () => {
  test("two runtimes sharing one store see the same session", async () => {
    const model = new ScriptedModelProvider([interpret({ intent: "buy" }), reply("Ok."), interpret({ budget: 9_000_000 }), reply("Noted.")]);
    const { runtime, sessions, definition } = buildRuntime(model);
    const sessionId = await runtime.createSession("shared");
    await runtime.runTurn({ sessionId, message: "I want to buy." });

    const second = new AgentRuntime({
      definition,
      sessions,
      model,
      tools: new ToolRegistry(definition.tools),
      knowledge: new KnowledgeIndex(definition.knowledge),
      ids: createDeterministicIds(900),
      clock: createFixedClock("2026-03-01T00:00:00.000Z"),
    });
    const result = await second.runTurn({ sessionId, message: "Budget is $9M." });
    assert.equal(result.state.memory["intent"]?.value, "buy", "state written by the first runtime is visible to the second");
    assert.equal(result.state.memory["budget"]?.value, 9_000_000);
  });
});
