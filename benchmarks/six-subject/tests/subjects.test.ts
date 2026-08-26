import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validateDefinition } from "@agent-sdk/core";
import { computeWallVolumeExecutor, createCraigAgent, wallVolumeM3 } from "../src/subjects/p01/application.ts";
import { createEstateAgent, createHandoffExecutor, sendLeadToTeam } from "../src/subjects/p02/application.ts";
import { ESTATE_PROPERTIES, ESTATE_ROOMS } from "../src/subjects/p02/records.ts";

const model = { providerId: "gemini", model: "test-model", temperature: 0.35, maxOutputTokens: 700 };
const executionContext = { sessionId: "s", turn: 1, requestId: "r", idempotencyKey: "test-key", memory: {}, hostContext: {} };

describe("six-subject P01 Arrokothai", () => {
  test("computes the product estimator deterministically", async () => {
    const result = await computeWallVolumeExecutor.execute({ wall_area_sq_ft: 420, wall_thickness_in: 10 }, executionContext);
    assert.equal(result.ok, true);
    assert.ok(result.ok);
    assert.equal(result.output["volume_m3"], 9.9);
    assert.equal(result.output["exact_volume_m3"], wallVolumeM3(420, 10));
    assert.equal(result.facts?.[0]?.key, "planning_wall_volume_m3");
  });

  test("rejects non-positive dimensions truthfully", async () => {
    const result = await computeWallVolumeExecutor.execute({ wall_area_sq_ft: 0, wall_thickness_in: -2 }, executionContext);
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error.code, "invalid_dimensions");
  });

  test("uses memory, Knowledge, and a declared read tool without a Workflow", () => {
    const definition = createCraigAgent(model);
    assert.equal(definition.memorySchema.fields.some((item) => item.key === "wall_area_sq_ft"), true);
    assert.equal(definition.knowledge[0]?.source.id, "craig_product_knowledge");
    assert.equal(definition.tools[0]?.definition.name, "compute_wall_volume");
    assert.equal(definition.flow, undefined);
    assert.deepEqual(validateDefinition(definition).filter((issue) => issue.severity === "error"), []);
  });
});

describe("six-subject P02 Arrokothai", () => {
  test("preserves the exact six-property and eight-room source set", () => {
    assert.equal(ESTATE_PROPERTIES.length, 6);
    assert.equal(ESTATE_ROOMS.length, 8);
    assert.deepEqual(
      ESTATE_PROPERTIES.map((record) => record["title"]),
      ["Skyline Penthouse", "The TriBeCa Loft", "Greenwich Townhouse", "Park Avenue Estate", "The Azure Vista", "Emerald Estate"],
    );
  });

  test("declares a confirmation-gated, once-per-session external action", () => {
    assert.equal(sendLeadToTeam.effect, "external_side_effect");
    assert.equal(sendLeadToTeam.confirmation, "required");
    assert.equal(sendLeadToTeam.idempotency, "once_per_session");
    assert.equal(sendLeadToTeam.argumentPolicies?.["phone"]?.kind, "authoritative_value");
  });

  test("the injected executor returns and records the exact payload", async () => {
    const handoff = createHandoffExecutor();
    const payload = { contact_name: "Taylor Kim", phone: "212-555-0133", intent: "buy", selected_property: "Skyline Penthouse" };
    const result = await handoff.executor.execute(payload, executionContext);
    assert.equal(result.ok, true);
    assert.deepEqual(handoff.calls, [payload]);
    assert.equal(result.ok && result.output["transport"], "dry_run");
    assert.equal(result.ok && result.output["visitor_contacted"], false);
    assert.equal(result.ok && result.output["follow_up_scheduled"], false);
    assert.equal(result.ok && result.output["future_outreach_guaranteed"], false);
  });

  test("the injected executor distinguishes failure and unknown outcome", async () => {
    const failed = await createHandoffExecutor("failure").executor.execute({ contact_name: "Taylor Kim", phone: "212-555-0133" }, executionContext);
    assert.equal(failed.ok, false);
    assert.equal(!failed.ok && failed.outcome, undefined);
    assert.equal(!failed.ok && failed.error.code, "handoff_rejected");

    const unknown = await createHandoffExecutor("unknown").executor.execute({ contact_name: "Taylor Kim", phone: "212-555-0133" }, executionContext);
    assert.equal(unknown.ok, false);
    assert.equal(!unknown.ok && unknown.outcome, "outcome_unknown");
    assert.equal(!unknown.ok && unknown.retryable, false);
  });

  test("uses record Knowledge, state, and the declared Action without adding a Workflow", () => {
    const definition = createEstateAgent(model);
    assert.equal(definition.memorySchema.fields.some((item) => item.key === "intent"), true);
    assert.equal(definition.knowledge.some((item) => item.source.id === "estate_properties"), true);
    assert.equal(definition.flow, undefined);
    assert.equal(definition.tools[0]?.definition.name, "send_lead_to_team");
    assert.deepEqual(validateDefinition(definition).filter((issue) => issue.severity === "error"), []);
  });
});
