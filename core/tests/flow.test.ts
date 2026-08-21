import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { AgentDefinition } from "../src/definition/types.ts";
import { evaluateCondition } from "../src/flow/evaluate.ts";
import { ScriptedModelProvider } from "../src/testing/scripted-provider.ts";
import { emailDryRun } from "../src/testing/fake-executors.ts";
import { buildRuntime, callTool, interpret, reply, testDefinition } from "./helpers.ts";
import { initialState } from "../src/session/state.ts";

/**
 * A three-phase flow, deliberately coarse: qualify -> handoff -> done, plus a `selling` branch.
 * Ordinary conversation stays inside one phase; only a real change of intent moves it.
 */
function flowDefinition(): AgentDefinition {
  return testDefinition({
    flow: {
      initialPhaseId: "qualify",
      phases: [
        {
          id: "qualify",
          objective: "Understand what the visitor is looking for.",
          transitions: [
            {
              to: "selling",
              on: "pre_response",
              label: "visitor switched to selling",
              when: { kind: "any", of: [{ kind: "signal", name: "intent_changed_to_sell" }, { kind: "memory_equals", field: "intent", value: "sell" }] },
            },
            {
              to: "handoff",
              on: "pre_response",
              label: "ready for a human",
              when: { kind: "all", of: [{ kind: "memory_present", field: "contact_name" }, { kind: "memory_present", field: "phone" }] },
            },
          ],
        },
        {
          id: "selling",
          objective: "Route the seller to a valuation specialist. Do not pitch purchase listings.",
          toolNames: [],
          transitions: [{ to: "qualify", on: "pre_response", when: { kind: "memory_equals", field: "intent", value: "buy" } }],
        },
        {
          id: "handoff",
          objective: "Confirm the details and pass them to the team.",
          transitions: [
            { to: "done", on: "action_result", label: "handoff succeeded", when: { kind: "tool_succeeded", tool: "send_email" } },
            { to: "qualify", on: "action_result", label: "handoff failed, keep working", when: { kind: "tool_failed", tool: "send_email" } },
          ],
        },
        { id: "done", objective: "The handoff is complete. Do not send anything again.", terminal: true, transitions: [] },
      ],
    },
  });
}

describe("condition DSL", () => {
  const base = initialState({ sessionId: "s", agentId: "a", agentVersion: 1, createdAt: "2026-01-01T00:00:00.000Z" });
  const state = {
    ...base,
    turn: 2,
    memory: {
      intent: { key: "intent", value: "sell", source: "model_proposal" as const, authority: "authoritative" as const, turn: 2, eventId: "e", at: "t" },
      budget: { key: "budget", value: 20, source: "model_proposal" as const, authority: "authoritative" as const, turn: 1, eventId: "e", at: "t" },
    },
  };
  const input = { state, signals: ["intent_changed_to_sell"], toolResults: [] };

  test("memory_equals is case-insensitive for strings and reports what it saw", () => {
    const trace = evaluateCondition({ kind: "memory_equals", field: "intent", value: "SELL" }, input);
    assert.equal(trace.result, true);
    assert.match(trace.detail, /memory.intent = "sell"/);
  });

  test("memory_changed distinguishes this turn from an earlier one", () => {
    assert.equal(evaluateCondition({ kind: "memory_changed", field: "intent" }, input).result, true);
    assert.equal(evaluateCondition({ kind: "memory_changed", field: "budget" }, input).result, false);
  });

  test("memory_present / memory_absent", () => {
    assert.equal(evaluateCondition({ kind: "memory_present", field: "intent" }, input).result, true);
    assert.equal(evaluateCondition({ kind: "memory_absent", field: "phone" }, input).result, true);
  });

  test("all / any / not compose and record child traces", () => {
    const trace = evaluateCondition(
      { kind: "all", of: [{ kind: "signal", name: "intent_changed_to_sell" }, { kind: "not", of: { kind: "memory_present", field: "phone" } }] },
      input,
    );
    assert.equal(trace.result, true);
    assert.equal(trace.children?.length, 2);
  });
});

/** INVARIANT 10 - a change of intent transitions BEFORE the response is generated. */
describe("invariant 10: pre-response transition on intent change", () => {
  test("buy -> sell reroutes on the same turn that states it", async () => {
    const model = new ScriptedModelProvider([
      interpret({ intent: "buy", target_location: "Manhattan", budget: 20_000_000 }),
      reply("Here is what fits in Manhattan."),
      interpret({ intent: "sell" }, ["intent_changed_to_sell"]),
      reply("Let me connect you with a valuation specialist."),
    ]);
    const { runtime } = buildRuntime(model, { definition: flowDefinition() });
    const sessionId = await runtime.createSession("f1");

    const first = await runtime.runTurn({ sessionId, message: "I'm buying in Manhattan, budget $20M." });
    assert.equal(first.state.phaseId, "qualify");

    const second = await runtime.runTurn({ sessionId, message: "Forget buying. I need to sell my place in 10011." });
    assert.equal(second.state.phaseId, "selling");

    const transition = second.events.find((e) => e.type === "PhaseTransitioned" && e.payload.on === "pre_response");
    assert.ok(transition?.type === "PhaseTransitioned");
    assert.equal(transition.payload.from, "qualify");
    assert.equal(transition.payload.to, "selling");
    assert.equal(transition.payload.evaluation?.trace.result, true);

    // The transition happened BEFORE the reply, so the reply pass saw the selling objective.
    const respondContext = second.contexts.find((c) => c.purpose.startsWith("respond"))!.context;
    assert.equal(respondContext.phaseId, "selling");
    assert.match(respondContext.system, /Route the seller to a valuation specialist/);
  });

  test("the selling phase scopes tools to none, so a purchase-flow tool cannot fire there", async () => {
    const model = new ScriptedModelProvider([
      interpret({ intent: "sell" }, ["intent_changed_to_sell"]),
      callTool("query_listings", { filters: [{ field: "price", op: "lte", value: 20_000_000 }] }),
      reply("Let's get you a valuation instead."),
    ]);
    const { runtime } = buildRuntime(model, { definition: flowDefinition() });
    const sessionId = await runtime.createSession("f2");
    const result = await runtime.runTurn({ sessionId, message: "I want to sell my townhouse." });

    const rejected = result.events.find((e) => e.type === "ToolCallRejected");
    assert.ok(rejected?.type === "ToolCallRejected");
    assert.equal(rejected.payload.reason, "not_permitted_in_phase");
  });

  test("ordinary conversation does not move the phase", async () => {
    const model = new ScriptedModelProvider([
      interpret({ intent: "buy", target_location: "TriBeCa" }),
      reply("TriBeCa it is."),
      interpret({}),
      reply("It was built in 1910."),
    ]);
    const { runtime } = buildRuntime(model, { definition: flowDefinition() });
    const sessionId = await runtime.createSession("f3");
    await runtime.runTurn({ sessionId, message: "Buying in TriBeCa." });
    const second = await runtime.runTurn({ sessionId, message: "How old is that building?" });
    assert.equal(second.state.phaseId, "qualify", "a plain question must not advance a phase");
    assert.ok(!second.events.some((e) => e.type === "PhaseTransitioned"));
  });
});

/** INVARIANT 11 - a successful action transitions AFTER the tool result. */
describe("invariant 11: action_result transition", () => {
  test("a successful handoff moves to the terminal phase", async () => {
    const email = emailDryRun("success");
    const model = new ScriptedModelProvider([
      interpret({ intent: "buy", contact_name: "Sam Park", phone: "555-0122" }),
      callTool("send_email", { contact_name: "Sam Park", phone: "555-0122" }),
      reply("Can you confirm those details?"),
      interpret({}),
      reply("Sent - the team will be in touch."),
    ]);
    const { runtime } = buildRuntime(model, { definition: flowDefinition(), registerTools: (r) => r.register("send_email", email) });
    const sessionId = await runtime.createSession("f4");

    const first = await runtime.runTurn({ sessionId, message: "I'm Sam Park, 555-0122, buying." });
    assert.equal(first.state.phaseId, "handoff", "contact details move the flow to handoff pre-response");

    const second = await runtime.runTurn({ sessionId, message: "Yes, go ahead." });
    assert.equal(email.callCount, 1);
    assert.equal(second.state.phaseId, "done");

    const transition = second.events.find((e) => e.type === "PhaseTransitioned" && e.payload.on === "action_result");
    assert.ok(transition?.type === "PhaseTransitioned");
    assert.equal(transition.payload.label, "handoff succeeded");
  });

  test("a FAILED handoff routes back to qualify rather than to done", async () => {
    const email = emailDryRun("fail");
    const model = new ScriptedModelProvider([
      interpret({ intent: "buy", contact_name: "Sam Park", phone: "555-0122" }),
      callTool("send_email", { contact_name: "Sam Park", phone: "555-0122" }),
      reply("Confirm?"),
      interpret({}),
      reply("That didn't go through - let me try another way."),
    ]);
    const { runtime } = buildRuntime(model, { definition: flowDefinition(), registerTools: (r) => r.register("send_email", email) });
    const sessionId = await runtime.createSession("f5");
    await runtime.runTurn({ sessionId, message: "I'm Sam Park, 555-0122, buying." });
    const second = await runtime.runTurn({ sessionId, message: "Yes, go ahead." });

    const transitions = second.events.filter((e) => e.type === "PhaseTransitioned");
    const afterAction = transitions.find((e) => e.type === "PhaseTransitioned" && e.payload.on === "action_result");
    assert.ok(afterAction?.type === "PhaseTransitioned");
    assert.equal(afterAction.payload.label, "handoff failed, keep working");
    assert.equal(afterAction.payload.to, "qualify");

    // The terminal phase is the thing a failure must never reach - a "done" here would be the
    // runtime asserting a completion that did not happen.
    assert.ok(!transitions.some((e) => e.type === "PhaseTransitioned" && e.payload.to === "done"));
    assert.notEqual(second.state.phaseId, "done");

    // The two timings then interact exactly as declared: back in `qualify`, the pre-response rule
    // sees contact details still on file and re-enters `handoff` so the send can be retried. That
    // is this flow's intent, and it is visible as a second, separately-traced transition.
    assert.equal(second.state.phaseId, "handoff");
    assert.equal(transitions.filter((e) => e.type === "PhaseTransitioned" && e.payload.on === "pre_response").length, 1);
  });
});
