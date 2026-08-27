import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateProposal } from "../src/memory/structured.ts";
import { ScriptedModelProvider } from "../src/testing/scripted-provider.ts";
import { buildRuntime, interpret, reply, testDefinition } from "./helpers.ts";

const schema = testDefinition().memorySchema;

/** INVARIANT 1 - structured memory type/min/max/enum validation. */
describe("invariant 1: structured memory validation", () => {
  test("accepts a well-typed value", () => {
    const result = validateProposal(schema, { key: "budget", value: 20_000_000 }, "user_claimed");
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.value, 20_000_000);
    assert.equal(result.ok && result.normalized, false);
  });

  test("rejects a wrong type", () => {
    const result = validateProposal(schema, { key: "budget", value: "twenty million" }, "user_claimed", { coerce: true });
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.code, "schema_violation");
    assert.match(!result.ok ? result.reason : "", /expected number/);
  });

  test("rejects a value above max", () => {
    const result = validateProposal(schema, { key: "budget", value: 500_000_000 }, "user_claimed");
    assert.equal(result.ok, false);
    assert.match(!result.ok ? result.reason : "", /expected <= 100000000/);
  });

  test("rejects a value below min", () => {
    const result = validateProposal(schema, { key: "bedrooms_needed", value: -2 }, "user_claimed");
    assert.equal(result.ok, false);
    assert.match(!result.ok ? result.reason : "", /expected >= 0/);
  });

  test("rejects a non-integer where an integer is declared", () => {
    const result = validateProposal(schema, { key: "bedrooms_needed", value: 2.5 }, "user_claimed");
    assert.equal(result.ok, false);
    assert.match(!result.ok ? result.reason : "", /integer/);
  });

  test("rejects a value outside the enum", () => {
    const result = validateProposal(schema, { key: "intent", value: "lease" }, "user_claimed", { coerce: true });
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.code, "schema_violation");
    assert.match(!result.ok ? result.reason : "", /buy \| rent \| sell/);
  });

  test("accepts an enum value differing only in case, and marks it normalized", () => {
    const result = validateProposal(schema, { key: "intent", value: "Buy" }, "user_claimed", { coerce: true });
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.value, "buy");
    assert.equal(result.ok && result.normalized, true);
  });

  test("normalizes a lossless numeric string but records that it did", () => {
    const result = validateProposal(schema, { key: "budget", value: "20000000" }, "user_claimed", { coerce: true });
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.value, 20_000_000);
    assert.equal(result.ok && result.normalized, true);
  });

  test("enforces string_array item type and maxItems", () => {
    const bad = validateProposal(schema, { key: "features_wanted", value: ["terrace", 7] }, "user_claimed");
    assert.equal(bad.ok, false);
    const tooMany = validateProposal(schema, { key: "features_wanted", value: ["a", "b", "c", "d", "e", "f"] }, "user_claimed");
    assert.equal(tooMany.ok, false);
    assert.match(!tooMany.ok ? tooMany.reason : "", /at most 5 items/);
  });

  test("rejects an undeclared field", () => {
    const result = validateProposal(schema, { key: "favourite_colour", value: "blue" }, "user_claimed");
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.code, "unknown_field");
  });
});

/** INVARIANT 2 - a bad model proposal is rejected AND evented, never silently repaired. */
describe("invariant 2: bad proposals are rejected and evented", () => {
  test("an out-of-range proposal produces MemoryWriteRejected with a reason, and no committed value", async () => {
    const model = new ScriptedModelProvider([
      interpret({ budget: 500_000_000, intent: "buy" }),
      reply("Understood."),
    ]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("s1");
    const result = await runtime.runTurn({ sessionId, message: "My budget is five hundred million." });

    const rejected = result.events.filter((e) => e.type === "MemoryWriteRejected");
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0]!.type === "MemoryWriteRejected" && rejected[0]!.payload.key, "budget");
    assert.match(rejected[0]!.type === "MemoryWriteRejected" ? rejected[0]!.payload.reason : "", /expected <= 100000000/);

    // The rejection did not become state, and the valid sibling field still committed.
    assert.equal(result.state.memory["budget"], undefined);
    assert.equal(result.state.memory["intent"]?.value, "buy");

    // A proposal event exists for BOTH, so the trace shows what the model actually said.
    const proposed = result.events.filter((e) => e.type === "MemoryWriteProposed");
    assert.equal(proposed.length, 2);
  });

  test("an undeclared field is rejected, and kept only as a non-authoritative note when policy allows", async () => {
    const definition = testDefinition({ policies: { ...testDefinition().policies, rejectUnknownMemoryFields: false } });
    const model = new ScriptedModelProvider([interpret({ favourite_colour: "blue" }), reply("Noted.")]);
    const { runtime } = buildRuntime(model, { definition });
    const sessionId = await runtime.createSession("s2");
    const result = await runtime.runTurn({ sessionId, message: "I like blue." });

    assert.equal(result.state.memory["favourite_colour"], undefined);
    const rejected = result.events.find((e) => e.type === "MemoryWriteRejected");
    assert.equal(rejected?.type === "MemoryWriteRejected" && rejected.payload.code, "unknown_field");
    // It survives only as a working note - explicitly non-authoritative.
    assert.equal(result.state.workingNotes.length, 1);
    assert.match(result.state.workingNotes[0]!.text, /favourite_colour/);
  });

  test("a correction replaces the prior value and records what it replaced", async () => {
    const model = new ScriptedModelProvider([
      interpret({ budget: 15_000_000, target_location: "TriBeCa" }),
      reply("Got it."),
      interpret({ budget: 25_000_000, target_location: "West Village" }),
      reply("Updated."),
    ]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("s3");
    await runtime.runTurn({ sessionId, message: "Buying in TriBeCa with $15M." });
    const result = await runtime.runTurn({ sessionId, message: "Actually make that $25M, and West Village." });

    assert.equal(result.state.memory["budget"]?.value, 25_000_000);
    assert.equal(result.state.memory["budget"]?.previousValue, 15_000_000);
    assert.equal(result.state.memory["target_location"]?.value, "West Village");
  });
});
