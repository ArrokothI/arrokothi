import assert from "node:assert/strict";
import test from "node:test";
import { createDeterministicIds, createFixedClock, validateDefinition } from "@arrokothi/core";
import { ScriptedModelProvider } from "@arrokothi/core/testing";
import { createP01Definition } from "./agent.ts";
import { parseP01CliRequest } from "./protocol.ts";
import { createP01Subject, runP01Batch } from "./subject.ts";

test("P01 constructs with the reference generation policy and no tools", () => {
  const definition = createP01Definition();
  assert.deepEqual(validateDefinition(definition).filter((issue) => issue.severity === "error"), []);
  assert.deepEqual(definition.model, {
    providerId: "gemini",
    model: "gemini-3.5-flash",
    temperature: 0.35,
    maxOutputTokens: 720,
  });
  assert.equal(definition.policies.transcriptWindow, 10);
  assert.deepEqual(definition.tools, []);
});

test("P01 runs, terminates, traces, and serializes a representative turn", async () => {
  const model = new ScriptedModelProvider([
    { purpose: "respond", text: "A practical planning estimate starts with wall area and thickness. What dimensions are you considering?" },
  ]);
  const subject = createP01Subject({
    model,
    ids: createDeterministicIds(),
    clock: createFixedClock(),
  });
  assert.deepEqual(subject.tools.missingExecutors(), []);

  const output = await runP01Batch(subject, [{ message: "Help me estimate a hemp-lime wall." }], "p01-test");
  assert.equal(output.turns[0]?.result.stopReason, "completed");
  assert.equal(output.state.turn, 1);
  assert.equal(model.requests.length, 1, "P01 performs no unnecessary planning call");
  assert.equal(model.requests[0]?.purpose, "respond");
  assert.equal(model.requests[0]?.temperature, 0.35);
  assert.equal(model.requests[0]?.maxOutputTokens, 720);
  assert.match(model.requests[0]?.system ?? "", /Appendix BL/);
  assert.match(model.requests[0]?.system ?? "", /exactly one useful follow-up question/);
  assert.doesNotThrow(() => JSON.stringify(output));
});

test("P01 rejects malformed or empty benchmark input", () => {
  assert.throws(() => parseP01CliRequest({ turns: [] }), /non-empty array/);
  assert.throws(() => parseP01CliRequest({ turns: ["   "] }), /non-empty message/);
  assert.throws(() => parseP01CliRequest({ generation: { provider: "other" }, turns: ["hello"] }), /provider/);
});

test("P01 records provider failures without losing the turn", async () => {
  const model = new ScriptedModelProvider([{ purpose: "respond", throws: new Error("offline") }]);
  const subject = createP01Subject({ model, ids: createDeterministicIds(), clock: createFixedClock() });
  const output = await runP01Batch(subject, [{ message: "Hello" }], "p01-error");
  assert.equal(output.turns[0]?.result.stopReason, "error");
  assert.ok(output.turns[0]?.result.events.some((event) => event.type === "RuntimeError"));
  assert.equal(output.state.transcript.length, 2);
});
