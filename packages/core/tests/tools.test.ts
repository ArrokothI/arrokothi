import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ScriptedModelProvider } from "../src/testing/scripted-provider.ts";
import { RecordingExecutor, emailDryRun, failureExecutor } from "../src/testing/fake-executors.ts";
import { buildRuntime, callTool, interpret, reply } from "./helpers.ts";

/** INVARIANT 7 - the ToolResult is authoritative about success and failure. */
describe("invariant 7: action success/failure is authoritative", () => {
  test("a failing executor produces ToolExecutionFailed and a failure statement in context", async () => {
    const email = failureExecutor("transport_unavailable", "the handoff could not be transmitted");
    const model = new ScriptedModelProvider([
      interpret({ contact_name: "Jordan Lee", phone: "555-0111" }),
      callTool("send_email", { contact_name: "Jordan Lee", phone: "555-0111" }),
      reply("Confirm and I'll send it."),
      interpret({}),
      reply("I couldn't get that through to the team - the send failed."),
    ]);
    const { runtime } = buildRuntime(model, { registerTools: (r) => r.register("send_email", email) });
    const sessionId = await runtime.createSession("t1");
    await runtime.runTurn({ sessionId, message: "I'm Jordan Lee, 555-0111." });
    const result = await runtime.runTurn({ sessionId, message: "Yes, go ahead." });

    assert.equal(email.callCount, 1, "the action was genuinely attempted");
    const failed = result.events.find((e) => e.type === "ToolExecutionFailed");
    assert.ok(failed?.type === "ToolExecutionFailed");
    assert.equal(failed.payload.error.code, "transport_unavailable");

    // The runtime's record is what the model is told, and it is told plainly.
    assert.match(result.contexts.at(-1)!.context.system, /send_email: FAILED.*Do not claim it succeeded/s);
    // A failure is NOT written to the idempotency ledger - it must stay retryable.
    assert.equal(Object.keys(result.state.ledger).length, 0);
    assert.equal(result.state.allToolResults.at(-1)?.ok, false);
  });

  test("an executor that throws is recorded as a failed action, never as ambiguous", async () => {
    const thrower = new RecordingExecutor(() => {
      throw new Error("socket hang up");
    });
    const model = new ScriptedModelProvider([interpret({}), callTool("lookup_status", { code: "X" }), reply("Couldn't check that.")]);
    const { runtime } = buildRuntime(model, { registerTools: (r) => r.register("lookup_status", thrower) });
    const sessionId = await runtime.createSession("t2");
    const result = await runtime.runTurn({ sessionId, message: "Check X" });

    const failed = result.events.find((e) => e.type === "ToolExecutionFailed");
    assert.ok(failed?.type === "ToolExecutionFailed");
    assert.equal(failed.payload.error.code, "executor_threw");
    assert.match(failed.payload.error.message, /socket hang up/);
  });

  test("a success carries authoritative facts into the compiled context", async () => {
    const email = emailDryRun("success");
    const model = new ScriptedModelProvider([
      interpret({ contact_name: "Taylor Kim", phone: "555-0133" }),
      callTool("send_email", { contact_name: "Taylor Kim", phone: "555-0133" }),
      reply("Confirm?"),
      interpret({}),
      reply("Done - the team has it."),
    ]);
    const { runtime } = buildRuntime(model, { registerTools: (r) => r.register("send_email", email) });
    const sessionId = await runtime.createSession("t3");
    await runtime.runTurn({ sessionId, message: "Taylor Kim, 555-0133." });
    const result = await runtime.runTurn({ sessionId, message: "Yes please." });

    assert.match(result.contexts.at(-1)!.context.system, /AUTHORITATIVE FACT handoff_transmitted = true/);
    assert.equal(result.state.allToolResults.at(-1)?.ok, true);
  });

  test("arguments failing the declared schema are rejected, not repaired", async () => {
    const email = emailDryRun("success");
    const model = new ScriptedModelProvider([
      interpret({ contact_name: "Sam Park", phone: "555-0122" }),
      // `phone` is required but missing, and an undeclared key is present.
      callTool("send_email", { contact_name: "Sam Park", nickname: "Sammy" }),
      reply("I need a phone number first."),
    ]);
    const { runtime } = buildRuntime(model, { registerTools: (r) => r.register("send_email", email) });
    const sessionId = await runtime.createSession("t4");
    const result = await runtime.runTurn({ sessionId, message: "Sam Park, 555-0122." });

    assert.equal(email.callCount, 0);
    const rejected = result.events.find((e) => e.type === "ToolCallRejected");
    assert.ok(rejected?.type === "ToolCallRejected");
    assert.equal(rejected.payload.reason, "invalid_arguments");
    assert.match(rejected.payload.message, /required field "phone" is missing/);
    assert.match(rejected.payload.message, /unknown field "nickname"/);
  });

  test("a tool with no registered executor is refused rather than silently skipped", async () => {
    const model = new ScriptedModelProvider([interpret({}), callTool("lookup_status", { code: "A" }), reply("Can't do that.")]);
    const { runtime } = buildRuntime(model); // lookup_status is declared but never registered
    const sessionId = await runtime.createSession("t5");
    const result = await runtime.runTurn({ sessionId, message: "Check A" });

    const rejected = result.events.find((e) => e.type === "ToolCallRejected");
    assert.equal(rejected?.type === "ToolCallRejected" && rejected.payload.reason, "no_executor");
  });

  test("a tool the agent does not declare cannot be invoked", async () => {
    const model = new ScriptedModelProvider([interpret({}), callTool("delete_everything", {}), reply("No.")]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("t6");
    const result = await runtime.runTurn({ sessionId, message: "wipe it" });

    const rejected = result.events.find((e) => e.type === "ToolCallRejected");
    assert.equal(rejected?.type === "ToolCallRejected" && rejected.payload.reason, "unknown_tool");
  });
});

/** INVARIANT 8 - once_per_session and per_input idempotency. */
describe("invariant 8: idempotency", () => {
  test("once_per_session: a second confirmed request replays instead of re-sending", async () => {
    const email = emailDryRun("success");
    const model = new ScriptedModelProvider([
      interpret({ contact_name: "Sam Park", phone: "555-0122" }),
      callTool("send_email", { contact_name: "Sam Park", phone: "555-0122" }),
      reply("Confirm?"),
      interpret({}),
      reply("Sent to the team."),
      // Turn 3: the model tries again with DIFFERENT arguments. `once_per_session` keys on the tool
      // name alone, so this must not produce a second dispatch.
      interpret({}),
      callTool("send_email", { contact_name: "Sam Park", phone: "555-0122", summary: "wants a call at 5pm" }),
      reply("Your details are already with the team - I've passed the extra note along."),
    ]);
    const { runtime } = buildRuntime(model, { registerTools: (r) => r.register("send_email", email) });
    const sessionId = await runtime.createSession("i1");
    await runtime.runTurn({ sessionId, message: "Sam Park, 555-0122." });
    await runtime.runTurn({ sessionId, message: "Yes, go ahead." });
    const result = await runtime.runTurn({ sessionId, message: "Also call me at 5pm tomorrow instead." });

    assert.equal(email.callCount, 1, "exactly ONE external dispatch across the whole session");
    const replayed = result.events.find((e) => e.type === "ToolExecutionSucceeded");
    assert.equal(replayed?.type === "ToolExecutionSucceeded" && replayed.payload.replayed, true);
    assert.match(result.contexts.at(-1)!.context.system, /already performed earlier in this session; not repeated/);
  });

  test("per_input: identical arguments replay, different arguments re-execute", async () => {
    const lookup = new RecordingExecutor((args, call) => ({ ok: true, output: { code: args["code"], call } }));
    const model = new ScriptedModelProvider([
      interpret({}),
      callTool("lookup_status", { code: "AAA" }),
      reply("First."),
      interpret({}),
      callTool("lookup_status", { code: "AAA" }),
      reply("Same as before."),
      interpret({}),
      callTool("lookup_status", { code: "BBB" }),
      reply("Different one."),
    ]);
    const { runtime } = buildRuntime(model, { registerTools: (r) => r.register("lookup_status", lookup) });
    const sessionId = await runtime.createSession("i2");
    await runtime.runTurn({ sessionId, message: "check AAA" });
    await runtime.runTurn({ sessionId, message: "check AAA again" });
    assert.equal(lookup.callCount, 1, "the identical call must replay, not re-execute");

    await runtime.runTurn({ sessionId, message: "now check BBB" });
    assert.equal(lookup.callCount, 2, "a different payload is a different action");
  });

  test("a FAILED action stays retryable rather than being locked in by the ledger", async () => {
    let attempt = 0;
    const flaky = new RecordingExecutor(() => {
      attempt++;
      return attempt === 1
        ? { ok: false, error: { code: "timeout", message: "upstream timed out" }, retryable: true }
        : { ok: true, output: { code: "AAA", attempt } };
    });
    const model = new ScriptedModelProvider([
      interpret({}),
      callTool("lookup_status", { code: "AAA" }),
      reply("That didn't work."),
      interpret({}),
      callTool("lookup_status", { code: "AAA" }),
      reply("Worked this time."),
    ]);
    const { runtime } = buildRuntime(model, { registerTools: (r) => r.register("lookup_status", flaky) });
    const sessionId = await runtime.createSession("i3");
    await runtime.runTurn({ sessionId, message: "check AAA" });
    const result = await runtime.runTurn({ sessionId, message: "try again" });

    assert.equal(flaky.callCount, 2, "idempotency must not make a transient failure permanent");
    assert.equal(result.state.allToolResults.at(-1)?.ok, true);
  });
});
