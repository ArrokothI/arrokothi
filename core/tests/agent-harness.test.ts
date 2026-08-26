import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentHarness, ReferenceLoopEngine } from "../src/index.ts";
import { ScriptedModelProvider } from "../src/testing/scripted-provider.ts";
import { buildRuntime, testDefinition } from "./helpers.ts";

describe("primary AgentHarness", () => {
  it("structurally skips semantic Preflight and records a one-call direct path", async () => {
    const model = new ScriptedModelProvider([{ purpose: "agent_loop", text: "One model call." }]);
    const definition = testDefinition({
      planning: { mode: "llm", extractWorkingNotes: false },
      memorySchema: { fields: [] },
      knowledge: [],
      tools: [],
      flow: undefined,
    });
    const built = buildRuntime(model, {
      definition,
      harness: new AgentHarness({ engine: new ReferenceLoopEngine() }),
    });
    const sessionId = await built.runtime.createSession("agent-harness-skip");
    const result = await built.runtime.runTurn({ sessionId, message: "Hello" });

    assert.equal(result.reply, "One model call.");
    assert.deepEqual(result.metrics, {
      preflightModelCalls: 0,
      agentLoopModelCalls: 1,
      conversationSummaryModelCalls: 0,
      guideRetryModelCalls: 0,
      totalModelCalls: 1,
    });
    assert.equal(model.requests.length, 1);
    assert.ok(result.events.some((event) => event.type === "TurnPlanCreated"));
  });

  it("uses semantic Preflight only for state synchronization and leaves retrieval to the loop", async () => {
    const model = new ScriptedModelProvider([
      {
        purpose: "plan",
        json: {
          memory_writes: { target_location: "Malibu" },
          working_notes: [],
          signals: [],
          retrieval_requests: [{ kind: "record_query", source_id: "listings" }],
        },
      },
      { purpose: "agent_loop", text: "I can help with Malibu." },
    ]);
    const definition = testDefinition({ planning: { mode: "llm" } });
    const built = buildRuntime(model, {
      definition,
      harness: new AgentHarness({ engine: new ReferenceLoopEngine() }),
    });
    const sessionId = await built.runtime.createSession("agent-harness-preflight");
    const result = await built.runtime.runTurn({ sessionId, message: "I want Malibu." });

    assert.equal(result.state.memory["target_location"]?.value, "Malibu");
    assert.deepEqual(result.state.turnPlan?.retrievalRequests, []);
    assert.equal(result.events.filter((event) => event.type === "KnowledgeRetrieved").length, 0);
    assert.equal(result.metrics.preflightModelCalls, 1);
    assert.equal(result.metrics.agentLoopModelCalls, 1);
    assert.equal(result.metrics.totalModelCalls, 2);
  });

  it("keeps planning-only and response-only instructions in separate compiled sections", async () => {
    const model = new ScriptedModelProvider([
      { purpose: "plan", json: { memory_writes: {}, working_notes: [], signals: [], retrieval_requests: [] } },
      { purpose: "agent_loop", text: "Done." },
    ]);
    const definition = testDefinition({
      globalRules: [
        { id: "first-party", text: "Prefer first-party sources.", kind: "default", scope: "planner" },
        { id: "truth", text: "Never claim an unobserved action.", kind: "invariant", scope: "both" },
        { id: "clean-language", text: "Do not swear.", kind: "invariant", scope: "response" },
      ],
    });
    const built = buildRuntime(model, {
      definition,
      harness: new AgentHarness({ engine: new ReferenceLoopEngine() }),
    });
    const sessionId = await built.runtime.createSession("agent-harness-scopes");
    const result = await built.runtime.runTurn({ sessionId, message: "Help" });
    const planner = result.contexts.find((entry) => entry.purpose === "plan")!.context.system;
    const loop = result.contexts.find((entry) => entry.purpose === "agent-loop:start")!.context.system;

    assert.match(planner, /Planning \/ execution instructions[\s\S]*Prefer first-party sources/);
    assert.match(planner, /Never claim an unobserved action/);
    assert.doesNotMatch(planner, /Do not swear/);
    assert.match(loop, /Planning \/ execution instructions[\s\S]*Prefer first-party sources/);
    assert.match(loop, /Instructions for planning and final response[\s\S]*Never claim an unobserved action/);
    assert.equal(loop.match(/Never claim an unobserved action/g)?.length, 1);
    assert.match(loop, /Final response instructions[\s\S]*Do not swear/);
  });
});
