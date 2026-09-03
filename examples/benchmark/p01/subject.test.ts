/**
 * Deterministic tests for the P01 benchmark subject.
 *
 * The model is a `ScriptedModelProvider`, so these assert the architecture — deterministic
 * arithmetic, committed-state persistence, correction supersession, out-of-order inputs,
 * deny-by-default authority — and never model quality.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import { validateDefinition } from "@arrokothi/core/execution";
import { createAllowListAuthorizer, ScriptedModelProvider } from "@arrokothi/core/reference";
import type { ScriptedModelStep } from "@arrokothi/core/reference";
import { ESTIMATE_VOLUME, createP01AgentDefinition } from "./agent.ts";
import { createP01App } from "./app.ts";
import { parseP01CliRequest } from "./protocol.ts";
import { runP01Session } from "./subject.ts";
import { estimateHempcreteVolume } from "./volume.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

function scriptedApp(steps: ScriptedModelStep[], authorizer?: ReturnType<typeof createAllowListAuthorizer>) {
  const model = new ScriptedModelProvider({ id: "scripted", steps });
  const app = createP01App({ model, providerId: "scripted", modelName: "deterministic-1", ...(authorizer ? { authorizer } : {}) });
  return { app, model };
}

const respond = (text: string): ScriptedModelStep => ({ output: { text } });
const write = (key: string, value: number | string): ScriptedModelStep => ({
  output: { capabilityCalls: [{ id: `w-${key}`, capability: `memory_write_${key}`, input: { value } }] },
});
const callEstimate = (area: number, thickness: number): ScriptedModelStep => ({
  output: {
    capabilityCalls: [
      { id: "e1", capability: "hempcrete_estimate_volume", input: { area_sq_ft: area, thickness_in: thickness } },
    ],
  },
});

describe("deterministic volume arithmetic", () => {
  test("matches the pinned formula", () => {
    const a = estimateHempcreteVolume({ area_sq_ft: 360, thickness_in: 7 });
    assert.equal(a.ok && a.estimate.volume_m3, 5.95);
    const b = estimateHempcreteVolume({ area_sq_ft: 325, thickness_in: 4 });
    assert.equal(b.ok && b.estimate.volume_m3, 3.07);
  });

  test("rejects obviously invalid dimensions instead of computing", () => {
    for (const bad of [
      { area_sq_ft: 0, thickness_in: 6 },
      { area_sq_ft: -20, thickness_in: 6 },
      { area_sq_ft: 300, thickness_in: 0 },
      { area_sq_ft: 300, thickness_in: 500 },
      { area_sq_ft: Number.NaN, thickness_in: 6 },
    ]) {
      assert.equal(estimateHempcreteVolume(bad).ok, false);
    }
  });
});

describe("the P01 definition", () => {
  test("is a valid Agent that exposes exactly one read-only operation and the three memory keys", () => {
    const definition = createP01AgentDefinition();
    assert.equal(validateDefinition(definition).ok, true);
    assert.equal(definition.spec.model.logicalRef, "primary");
    assert.deepEqual(definition.spec.operations?.refs, [ESTIMATE_VOLUME]);
    assert.deepEqual(definition.spec.structuredMemory?.read?.keys, [
      "construction_context",
      "wall_area_sq_ft",
      "layer_thickness_in",
    ]);
    assert.deepEqual(
      definition.spec.structuredMemory?.write?.keys,
      definition.spec.structuredMemory?.read?.keys,
    );
  });
});

describe("the benchmark protocol", () => {
  test("accepts a well-formed request and rejects malformed ones", () => {
    const ok = parseP01CliRequest({
      protocolVersion: "1",
      generation: { provider: "gemini", model: "gemini-3.5-flash-lite", temperature: 0 },
      turns: [{ message: "hi" }],
    });
    assert.equal(ok.turns.length, 1);
    assert.throws(() => parseP01CliRequest({ turns: [] }), /non-empty array/);
    assert.throws(() => parseP01CliRequest({ turns: ["  "] }), /non-empty message/);
    assert.throws(
      () => parseP01CliRequest({ generation: { provider: "openai", model: "x" }, turns: ["hi"] }),
      /provider must be "gemini"/,
    );
    assert.throws(
      () => parseP01CliRequest({ generation: { provider: "gemini" }, turns: ["hi"] }),
      /generation.model/,
    );
  });
});

describe("conversational state is deterministic where it must be", () => {
  test("retains an earlier thickness and combines it with a later area (out of order)", async () => {
    const { app } = scriptedApp([
      // turn 1: only thickness is known
      write("layer_thickness_in", 7),
      respond("A 7-inch hemp-lime layer noted. What's the wall area in square feet?"),
      // turn 2: area arrives; both values now known, so the estimate tool runs
      write("wall_area_sq_ft", 360),
      callEstimate(360, 7),
      respond("At 360 sq ft and 7 inches that's about 5.95 m3 of hemp-lime. Is this new-build infill or a retrofit?"),
    ]);

    const result = await runP01Session(app, [
      { message: "My wall will use a 7-inch hempcrete layer." },
      { message: "The wall area is 360 square feet." },
    ]);

    assert.equal(result.projectState["layer_thickness_in"], 7);
    assert.equal(result.projectState["wall_area_sq_ft"], 360);
    assert.ok(result.turns[1]!.effects.includes("use_capability"), "the estimate tool was called");
    assert.match(result.turns[1]!.assistant, /5\.95 m3/);
  });

  test("a correction supersedes the stale value across an unrelated intervening turn", async () => {
    const { app } = scriptedApp([
      // turn 1
      write("wall_area_sq_ft", 275),
      write("layer_thickness_in", 4),
      respond("275 sq ft at 4 inches noted. Interior retrofit or new wall?"),
      // turn 2: unrelated question, no writes
      respond("Hempcrete is legal hemp-lime with 0% THC and is non-load-bearing infill; the frame carries loads. What's the existing wall surface?"),
      // turn 3: area correction
      write("wall_area_sq_ft", 325),
      respond("Updated to 325 sq ft. Want me to re-run the volume estimate?"),
    ]);

    const result = await runP01Session(app, [
      { message: "275 sq ft wall, 4 inch layer." },
      { message: "Is hempcrete even legal?" },
      { message: "Actually the wall area is 325 square feet." },
    ]);

    assert.equal(result.projectState["wall_area_sq_ft"], 325);
    assert.equal(result.projectState["layer_thickness_in"], 4);
  });
});

describe("deny-by-default authority", () => {
  test("with no memory grant a scripted write is refused and nothing is committed", async () => {
    const { app } = scriptedApp(
      [write("wall_area_sq_ft", 400), respond("Noted. What thickness are you considering?")],
      createAllowListAuthorizer({
        grants: [{ capability: ESTIMATE_VOLUME.capability, operations: [ESTIMATE_VOLUME.operation] }],
      }),
    );

    const result = await runP01Session(app, [{ message: "400 sq ft wall." }]);

    assert.notEqual(result.turns[0]!.lifecycle, "FAILED");
    assert.deepEqual(result.projectState, {});
  });
});

describe("no hidden model calls", () => {
  test("main.ts and app.ts only wire the injected provider", async () => {
    for (const file of ["main.ts", "app.ts", "subject.ts", "agent.ts"]) {
      const source = await readFile(resolve(HERE, file), "utf8");
      assert.doesNotMatch(source, /openai|anthropic|claude|gpt-|gemini-.*-pro/i, `${file} names no secondary model`);
    }
    const main = await readFile(resolve(HERE, "main.ts"), "utf8");
    assert.match(main, /createGeminiModelProviderFromEnv/);
    assert.doesNotMatch(main, /new .*Provider\(|ScriptedModelProvider/);
  });
});
