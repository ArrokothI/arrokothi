import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { KnowledgeIndex, validateDefinition } from "@agent-sdk/core";
import {
  computeWallVolumeExecutor,
  craigAgent,
  wallVolumeM3,
} from "./p01-craig/agent.ts";
import {
  estateAgent,
  ESTATE_PROPERTIES,
  sendEstateLead,
} from "./p02-estate/agent.ts";

const executionContext = {
  sessionId: "reference-build-test",
  turn: 1,
  requestId: "request-1",
  idempotencyKey: "reference-build-test-key",
  memory: {},
  hostContext: {},
};

describe("standalone P01 Agent_SDK build", () => {
  test("is a valid, serializable AgentDefinition with no consequential action", () => {
    assert.deepEqual(validateDefinition(craigAgent).filter((issue) => issue.severity === "error"), []);
    const roundTripped = JSON.parse(JSON.stringify(craigAgent));
    assert.deepEqual(validateDefinition(roundTripped).filter((issue) => issue.severity === "error"), []);
    assert.equal(roundTripped.id, craigAgent.id);
    assert.equal(craigAgent.id, "p01-craig-hempcrete");
    assert.equal(craigAgent.tools.every(({ definition }) => definition.effect === "read"), true);
  });

  test("computes wall volume deterministically and rejects invalid dimensions", async () => {
    const result = await computeWallVolumeExecutor.execute(
      { wall_area_sq_ft: 420, wall_thickness_in: 10 },
      executionContext,
    );
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.output["volume_m3"], 9.9);
    assert.ok(Math.abs(wallVolumeM3(420, 10) - 9.9) <= 0.05);

    const invalid = await computeWallVolumeExecutor.execute(
      { wall_area_sq_ft: 0, wall_thickness_in: 10 },
      executionContext,
    );
    assert.equal(invalid.ok, false);
    assert.equal(!invalid.ok && invalid.error.code, "invalid_dimensions");
  });
});

describe("standalone P02 Agent_SDK build", () => {
  test("is a valid, serializable AgentDefinition with the exact six-property record set", () => {
    assert.deepEqual(validateDefinition(estateAgent).filter((issue) => issue.severity === "error"), []);
    const roundTripped = JSON.parse(JSON.stringify(estateAgent));
    assert.deepEqual(validateDefinition(roundTripped).filter((issue) => issue.severity === "error"), []);
    assert.equal(roundTripped.id, estateAgent.id);
    assert.equal(estateAgent.id, "p02-estatepro");
    assert.equal(ESTATE_PROPERTIES.length, 6);
    assert.deepEqual(ESTATE_PROPERTIES.map(({ title }) => title).sort(), [
      "Emerald Estate",
      "Greenwich Townhouse",
      "Park Avenue Estate",
      "Skyline Penthouse",
      "The Azure Vista",
      "The TriBeCa Loft",
    ]);
  });

  test("uses deterministic record filtering for property constraints", () => {
    const knowledge = new KnowledgeIndex(estateAgent.knowledge);
    const result = knowledge.queryRecords({
      kind: "record_query",
      sourceId: "listings",
      filters: [
        { field: "city", op: "eq", value: "New York" },
        { field: "price", op: "lte", value: 20_000_000 },
      ],
    });
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.value.totalMatched, 2);
    assert.deepEqual(
      result.ok && result.value.matches.map((record) => record["title"]).sort(),
      ["Skyline Penthouse", "The TriBeCa Loft"],
    );
  });

  test("declares one exact-payload, confirmation-gated, idempotent external action", () => {
    assert.equal(sendEstateLead.effect, "external_side_effect");
    assert.equal(sendEstateLead.confirmation, "required");
    assert.equal(sendEstateLead.idempotency, "once_per_session");
    assert.deepEqual(sendEstateLead.argumentPolicies?.phone, {
      kind: "authoritative_value",
      sources: ["memory.phone"],
    });
    assert.deepEqual(estateAgent.tools[0]?.phaseIds, ["qualify", "selling", "handoff"]);
    const selling = estateAgent.flow?.phases.find((phase) => phase.id === "selling");
    assert.ok(selling?.transitions?.some((transition) => transition.to === "handoff"));
  });
});

test("reference builds do not depend on benchmark or source-project runtime code", async () => {
  const files = [
    new URL("./p01-craig/agent.ts", import.meta.url),
    new URL("./p02-estate/agent.ts", import.meta.url),
  ];
  for (const file of files) {
    const source = await readFile(fileURLToPath(file), "utf8");
    assert.doesNotMatch(source, /from ["'][^"']*benchmarks\//);
    assert.doesNotMatch(source, /Craig-Hempcrete-DemoSitee|EstatePro\/components|EstatePro\/api/);
  }
});
