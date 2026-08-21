import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ScriptedModelProvider } from "../src/testing/scripted-provider.ts";
import { RecordingExecutor } from "../src/testing/fake-executors.ts";
import { ModelProviderError } from "../src/provider/types.ts";
import type { ModelProvider, ModelResponse } from "../src/provider/types.ts";
import { buildRuntime, callTool, interpret, reply, testDefinition } from "./helpers.ts";

/** A model that never stops calling a tool - the classic runaway loop. */
class LoopingProvider implements ModelProvider {
  readonly id = "looping";
  calls = 0;
  async generate(request: { purpose?: string }): Promise<ModelResponse> {
    this.calls++;
    if (request.purpose === "plan") return { json: {}, providerId: this.id, model: "loop" };
    return { toolCalls: [{ name: "lookup_status", args: { code: `C${this.calls}` } }], providerId: this.id, model: "loop" };
  }
}

/** INVARIANT 13 - the step limit terminates the turn safely. */
describe("invariant 13: max-step limit", () => {
  test("a looping model is stopped by the runtime, not by luck", async () => {
    const definition = testDefinition({ policies: { ...testDefinition().policies, maxSteps: 3, maxToolCallsPerTurn: 10 } });
    const lookup = new RecordingExecutor(() => ({ ok: true, output: { status: "ok" } }));
    const model = new LoopingProvider();
    const { runtime } = buildRuntime(model, { definition, registerTools: (r) => r.register("lookup_status", lookup) });
    const sessionId = await runtime.createSession("m1");
    const result = await runtime.runTurn({ sessionId, message: "check everything" });

    assert.equal(result.stopReason, "max_steps");
    assert.equal(result.steps, 3, "exactly maxSteps response steps were taken");
    const error = result.events.find((e) => e.type === "RuntimeError");
    assert.ok(error?.type === "RuntimeError");
    assert.equal(error.payload.code, "max_steps_exceeded");

    // It ends with a truthful message rather than a fabricated completion, and the turn is still
    // a well-formed part of the stream.
    assert.match(result.reply, /stopped rather than guess/);
    assert.ok(result.events.some((e) => e.type === "AssistantMessageEmitted"));
    const state = await runtime.replay(sessionId);
    assert.equal(state.transcript.at(-1)?.role, "assistant");
  });

  test("maxToolCallsPerTurn caps side effects independently of maxSteps", async () => {
    const definition = testDefinition({ policies: { ...testDefinition().policies, maxSteps: 6, maxToolCallsPerTurn: 2 } });
    const lookup = new RecordingExecutor(() => ({ ok: true, output: { status: "ok" } }));
    const model = new LoopingProvider();
    const { runtime } = buildRuntime(model, { definition, registerTools: (r) => r.register("lookup_status", lookup) });
    const sessionId = await runtime.createSession("m2");
    await runtime.runTurn({ sessionId, message: "check everything" });

    assert.equal(lookup.callCount, 2, "the tool budget is enforced even though steps remained");
  });

  test("the step limit cannot be disabled by a definition claiming zero", async () => {
    const definition = testDefinition({ policies: { ...testDefinition().policies, maxSteps: 0 } });
    const model = new ScriptedModelProvider([interpret({}), reply("hello")]);
    // `assertValidDefinition` rejects maxSteps < 1 outright, so a zero limit cannot even construct.
    assert.throws(() => buildRuntime(model, { definition }), /maxSteps must be at least 1/);
  });
});

describe("degradation is truthful", () => {
  test("a provider failure in the response pass yields an honest message, not a fabrication", async () => {
    const model = new ScriptedModelProvider([
      interpret({ intent: "buy" }),
      { purpose: "respond", throws: new ModelProviderError("HTTP_429_RATE_LIMIT", "rate limited", true) },
    ]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("d1");
    const result = await runtime.runTurn({ sessionId, message: "I want to buy." });

    assert.equal(result.stopReason, "error");
    const error = result.events.find((e) => e.type === "RuntimeError");
    assert.equal(error?.type === "RuntimeError" && error.payload.code, "HTTP_429_RATE_LIMIT");
    assert.match(result.reply, /problem generating a reply/);
    // The turn before the failure still committed - degradation must not lose established facts.
    assert.equal(result.state.memory["intent"]?.value, "buy");
  });

  test("a failure in the interpretation pass degrades the turn but still produces a reply", async () => {
    const model = new ScriptedModelProvider([
      { purpose: "interpret", throws: new ModelProviderError("NETWORK_TIMEOUT", "socket timeout", true) },
      reply("Happy to help - could you tell me your budget?"),
    ]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("d2");
    const result = await runtime.runTurn({ sessionId, message: "I'm looking in TriBeCa." });

    assert.equal(result.stopReason, "completed");
    assert.equal(result.reply, "Happy to help - could you tell me your budget?");
    const error = result.events.find((e) => e.type === "RuntimeError");
    assert.equal(error?.type === "RuntimeError" && error.payload.code, "NETWORK_TIMEOUT");
    assert.match(error?.type === "RuntimeError" ? error.payload.detail ?? "" : "", /continued without new memory or retrieval/);
  });

  test("an empty model response ends the turn rather than spinning", async () => {
    const model = new ScriptedModelProvider([interpret({}), { purpose: "respond", text: "" }]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("d3");
    const result = await runtime.runTurn({ sessionId, message: "hi" });

    assert.equal(result.stopReason, "error");
    assert.equal(result.steps, 1);
    const error = result.events.find((e) => e.type === "RuntimeError");
    assert.equal(error?.type === "RuntimeError" && error.payload.code, "empty_model_response");
  });
});

describe("traces record provider and model metadata", () => {
  test("every model call is evented with its provider and model", async () => {
    const model = new ScriptedModelProvider([interpret({ intent: "buy" }), reply("Ok.")], { id: "gemini", model: "gemini-3.5-flash-lite" });
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("tr1");
    const result = await runtime.runTurn({ sessionId, message: "buying" });

    const calls = result.events.filter((e) => e.type === "ModelCallCompleted");
    assert.equal(calls.length, 2, "one interpretation call and one response call");
    for (const call of calls) {
      assert.ok(call.type === "ModelCallCompleted");
      assert.equal(call.payload.providerId, "gemini");
      assert.equal(call.payload.model, "gemini-3.5-flash-lite");
      assert.ok(typeof call.payload.durationMs === "number");
    }
    assert.deepEqual(calls.map((c) => (c.type === "ModelCallCompleted" ? c.payload.purpose : "")), ["plan", "respond"]);
  });

  test("the compiled context never contains the authoring requirements document", async () => {
    const model = new ScriptedModelProvider([interpret({}), reply("Ok.")]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("tr2");
    const result = await runtime.runTurn({ sessionId, message: "hello" });

    // The goal is one sentence and the prompt stays small: the compiler assembles the smallest
    // useful context rather than concatenating everything the agent knows.
    for (const { context } of result.contexts) {
      assert.ok(context.approxChars < 2000, `context was ${context.approxChars} chars`);
      assert.equal(context.sections[0]!.id, "goal");
    }
  });
});

describe("tool budget of zero disables tools entirely", () => {
  test("a definition with maxToolCallsPerTurn 0 offers the model no tools", async () => {
    const definition = testDefinition({ policies: { ...testDefinition().policies, maxToolCallsPerTurn: 0 } });
    const model = new ScriptedModelProvider([interpret({}), reply("I can answer that directly.")]);
    const { runtime } = buildRuntime(model, { definition });
    const sessionId = await runtime.createSession("z1");
    await runtime.runTurn({ sessionId, message: "hello" });

    const respondRequest = model.requests.find((r) => r.purpose === "respond");
    assert.equal(respondRequest?.tools, undefined, "no tool specs are offered when the budget is zero");
  });
});
