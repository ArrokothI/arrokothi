import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ScriptedModelProvider } from "../src/testing/scripted-provider.ts";
import { emailDryRun } from "../src/testing/fake-executors.ts";
import { buildRuntime, callTool, interpret, reply } from "./helpers.ts";

const HOST_CONTEXT = {
  page_url: "/listings/skyline-penthouse",
  locale: "en-US",
  crm_api_key: "sk-live-SECRET-TOOLS-ONLY",
  internal_risk_tier: "tier-3-RUNTIME-ONLY",
  claimed_membership: "platinum",
};

/** INVARIANT 4 - turn-scoped, model-visible context reaches the compiled context. */
describe("invariant 4: model-visible context enters compiled context", () => {
  test("a turn-scoped model-visible value appears in the prompt", async () => {
    const model = new ScriptedModelProvider([interpret({}), reply("Looking at that one now.")]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("ctx1");
    const result = await runtime.runTurn({ sessionId, message: "Tell me about this one.", hostContext: HOST_CONTEXT });

    const respond = result.contexts.find((c) => c.purpose.startsWith("respond"));
    assert.ok(respond, "a response context must have been compiled");
    assert.match(respond.context.system, /page_url: \/listings\/skyline-penthouse/);
    assert.match(respond.context.system, /locale: en-US/);
  });

  test("a user_claimed value is labelled as claimed, not presented as fact", async () => {
    const model = new ScriptedModelProvider([interpret({}), reply("Noted.")]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("ctx2");
    const result = await runtime.runTurn({ sessionId, message: "Hi", hostContext: HOST_CONTEXT });
    const system = result.contexts.at(-1)!.context.system;
    assert.match(system, /claimed_membership: platinum \[claimed by user, unverified\]/);
  });

  test("a turn-scoped value does not survive into the next turn", async () => {
    const model = new ScriptedModelProvider([interpret({}), reply("One."), interpret({}), reply("Two.")]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("ctx3");
    await runtime.runTurn({ sessionId, message: "First", hostContext: HOST_CONTEXT });
    const second = await runtime.runTurn({ sessionId, message: "Second" });

    assert.equal(second.state.hostContext["page_url"], undefined, "turn-scoped context must expire");
    assert.equal(second.state.hostContext["locale"]?.value, "en-US", "session-scoped context must persist");
  });

  test("an undeclared or malformed host value is rejected and recorded, not stored", async () => {
    const model = new ScriptedModelProvider([interpret({}), reply("Ok.")]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("ctx4");
    const result = await runtime.runTurn({ sessionId, message: "Hi", hostContext: { not_declared: "x", locale: "en-GB" } });

    const observed = result.events.find((e) => e.type === "HostContextObserved");
    assert.ok(observed?.type === "HostContextObserved");
    assert.equal(observed.payload.rejected.length, 1);
    assert.equal(observed.payload.rejected[0]!.key, "not_declared");
    assert.equal(result.state.hostContext["not_declared"], undefined);
    assert.equal(result.state.hostContext["locale"]?.value, "en-GB");
  });
});

/** INVARIANT 5 - tools_only / runtime_only context NEVER enters model context. */
describe("invariant 5: restricted context never reaches the model", () => {
  test("tools_only and runtime_only values appear in no compiled context, in any pass", async () => {
    const model = new ScriptedModelProvider([interpret({}), reply("Sure.")]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("ctx5");
    const result = await runtime.runTurn({ sessionId, message: "What can you tell me?", hostContext: HOST_CONTEXT });

    assert.ok(result.contexts.length >= 2, "both passes should have compiled a context");
    for (const { purpose, context } of result.contexts) {
      assert.ok(!context.system.includes("SECRET-TOOLS-ONLY"), `tools_only value leaked into "${purpose}"`);
      assert.ok(!context.system.includes("RUNTIME-ONLY"), `runtime_only value leaked into "${purpose}"`);
      assert.ok(!context.system.includes("crm_api_key"), `tools_only key name leaked into "${purpose}"`);
      assert.ok(!context.system.includes("internal_risk_tier"), `runtime_only key name leaked into "${purpose}"`);
    }
  });

  test("the compiler reports what it withheld, so the filter is auditable", async () => {
    const model = new ScriptedModelProvider([interpret({}), reply("Sure.")]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("ctx6");
    const result = await runtime.runTurn({ sessionId, message: "Hi", hostContext: HOST_CONTEXT });

    const withheld = result.contexts.at(-1)!.context.withheldContextKeys;
    assert.deepEqual(
      withheld.map((w) => w.key).sort(),
      ["crm_api_key", "internal_risk_tier"],
    );
  });

  test("nothing leaks even after a tool result is folded into the context", async () => {
    // The executor receives tools_only context and echoes part of it back in its output. That
    // output is rendered into the next prompt, which is exactly where a leak would be easy to miss.
    const model = new ScriptedModelProvider([
      interpret({}),
      callTool("lookup_status", { code: "ABC" }),
      reply("Checked."),
    ]);
    const { runtime } = buildRuntime(model, {
      registerTools: (r) =>
        r.register("lookup_status", {
          async execute(_args, ctx) {
            const key = ctx.hostContext["crm_api_key"]?.value;
            assert.equal(key, "sk-live-SECRET-TOOLS-ONLY", "the executor SHOULD receive tools_only context");
            assert.equal(ctx.hostContext["internal_risk_tier"], undefined, "runtime_only is withheld even from tools");
            return { ok: true, output: { status: "ok", checked_with: "redacted" } };
          },
        }),
    });
    const sessionId = await runtime.createSession("ctx7");
    const result = await runtime.runTurn({ sessionId, message: "Check ABC", hostContext: HOST_CONTEXT });

    for (const { context } of result.contexts) {
      assert.ok(!context.system.includes("SECRET-TOOLS-ONLY"));
      assert.ok(!context.system.includes("RUNTIME-ONLY"));
    }
  });
});

/** INVARIANT 3 - a working note alone cannot authorize a side-effecting action. */
describe("invariant 3: a working note cannot authorize a side effect", () => {
  test("send_email is refused when a required argument exists only as a working note", async () => {
    const email = emailDryRun("success");
    const model = new ScriptedModelProvider([
      // The interpretation pass records the name only as an unverified NOTE - never as validated
      // structured memory - while the phone is properly committed.
      { purpose: "interpret", json: { memory_writes: { phone: "555-0100" }, working_notes: ["the visitor might be called Alex Rivera"] } },
      callTool("send_email", { contact_name: "Alex Rivera", phone: "555-0100" }),
      reply("Could you confirm your name before I pass this on?"),
    ]);
    const { runtime } = buildRuntime(model, { registerTools: (r) => r.register("send_email", email) });
    const sessionId = await runtime.createSession("note1");
    const result = await runtime.runTurn({ sessionId, message: "You can reach me on 555-0100." });

    assert.equal(email.callCount, 0, "an unverified note must never reach an external side effect");
    const rejected = result.events.find((e) => e.type === "ToolCallRejected");
    assert.ok(rejected?.type === "ToolCallRejected");
    assert.equal(rejected.payload.reason, "non_authoritative_argument_source");
    assert.match(rejected.payload.message, /contact_name/);

    // The note itself is still recorded - it is useful context, just not authority.
    assert.equal(result.state.workingNotes.length, 1);
  });

  test("the same call succeeds once the value is committed to structured memory", async () => {
    const email = emailDryRun("success");
    const model = new ScriptedModelProvider([
      interpret({ contact_name: "Alex Rivera", phone: "555-0100" }),
      callTool("send_email", { contact_name: "Alex Rivera", phone: "555-0100" }),
      reply("Confirm before I send?"),
      interpret({}),
      reply("Sent."),
    ]);
    const { runtime } = buildRuntime(model, { registerTools: (r) => r.register("send_email", email) });
    const sessionId = await runtime.createSession("note2");
    await runtime.runTurn({ sessionId, message: "I'm Alex Rivera, 555-0100." });
    await runtime.runTurn({ sessionId, message: "Yes, go ahead." });

    assert.equal(email.callCount, 1);
  });
});
