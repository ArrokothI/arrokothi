import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { ProjectionInput } from "./shared/runner.ts";
import { computeVolumeExecutor, craigBenchmarkAgent, projectCraigFields, volumeM3 } from "./p01-craig/agent.ts";
import { makeEstateBenchmarkAgent, projectEstateFields } from "./p02-estate/agent.ts";
import { EXECUTABLE_SCENARIOS as CRAIG } from "./p01-craig/scenarios.ts";
import { EXECUTABLE_SCENARIOS as ESTATE } from "./p02-estate/scenarios.ts";
import { cubicMetres, dollarAmounts, statesVolume } from "./shared/grade.ts";
import { validateDefinition } from "@agent-sdk/core";

/**
 * Adapter verification.
 *
 * The self-check run proves the pipeline executes end to end; these tests prove the parts a
 * self-check cannot, because they need known inputs: that state projects onto the CANONICAL field
 * names, that the deterministic volume tool reproduces the product's own figures, and that the
 * ported detectors behave the way the canonical artifacts specify.
 */

const memory = (values: Record<string, string | number | boolean | string[]>): ProjectionInput => ({
  memory: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: v }])),
  phaseId: null,
});

describe("P01 Craig adapter", () => {
  test("the deterministic tool reproduces the product's published figures", async () => {
    const cases: [number, number, number][] = [
      [420, 10, 9.9],
      [300, 3, 2.1],
      [450, 12, 12.7],
      [510, 10, 12.0],
    ];
    for (const [area, thickness, displayed] of cases) {
      const result = await computeVolumeExecutor.execute({ wall_area_sq_ft: area, wall_thickness_in: thickness }, {
        sessionId: "s", turn: 1, requestId: "r", memory: {}, hostContext: {},
      });
      assert.ok(result.ok, `${area}x${thickness} should compute`);
      assert.equal(result.output["volume_m3"], displayed, `${area} sq ft at ${thickness} in`);
      assert.ok(Math.abs(volumeM3(area, thickness) - displayed) <= 0.05);
      assert.equal(result.facts?.[0]?.key, "planning_volume_m3");
      assert.equal(result.facts?.[0]?.value, displayed);
    }
  });

  test("the tool refuses nonsensical dimensions instead of returning a confident zero", async () => {
    for (const args of [{ wall_area_sq_ft: -200, wall_thickness_in: 0 }, { wall_area_sq_ft: 300, wall_thickness_in: 0 }]) {
      const result = await computeVolumeExecutor.execute(args, { sessionId: "s", turn: 1, requestId: "r", memory: {}, hostContext: {} });
      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.error.code, "invalid_dimensions");
    }
  });

  test("state projects onto the canonical benchmark field names", () => {
    const fields = projectCraigFields(memory({ wall_area_sq_ft: 510, wall_thickness_in: 10, project_type: "backyard office", install_method: "blocks" }));
    assert.equal(fields["wall_area_sq_ft"], 510);
    assert.equal(fields["wall_thickness_in"], 10);
    assert.equal(fields["project_type"], "backyard office");
    assert.equal(fields["install_method"], "blocks");
  });

  test("an uncommitted field projects as undefined, so a state assertion fails rather than passing on a coincidence", () => {
    const fields = projectCraigFields(memory({}));
    assert.equal(fields["wall_area_sq_ft"], undefined);
  });

  test("Craig maps no tool onto a canonical consequential action", () => {
    assert.equal(craigBenchmarkAgent.canonicalAction("compute_wall_volume"), null);
    assert.equal(craigBenchmarkAgent.canonicalAction("anything"), null);
  });

  test("the definition is structurally valid", () => {
    const errors = validateDefinition(craigBenchmarkAgent.definition).filter((i) => i.severity === "error");
    assert.deepEqual(errors, []);
  });
});

describe("P02 Estate adapter", () => {
  test("budget projects into the canonical $NNM string the stored assertions match on", () => {
    assert.equal(projectEstateFields(memory({ budget: 25_000_000 }))["budget"], "$25M");
    assert.equal(projectEstateFields(memory({ budget: 16_000_000 }))["budget"], "$16M");
    assert.equal(projectEstateFields(memory({ budget: 7_250_000 }))["budget"], "$7.25M");
    // The numeric value is preserved alongside it, so a numeric check is still possible.
    assert.equal(projectEstateFields(memory({ budget: 25_000_000 }))["budget_numeric"], 25_000_000);
  });

  test("a corrected budget no longer matches the superseded value", () => {
    const fields = projectEstateFields(memory({ budget: 16_000_000 }));
    assert.ok(String(fields["budget"]).includes("16"));
    assert.ok(!String(fields["budget"]).includes("12"), "the stale $12M must not survive the projection");
  });

  test("a declined optional field projects as absent, not as an empty string", () => {
    const fields = projectEstateFields(memory({ contact_name: "Taylor Kim", phone: "555-0133" }));
    assert.equal(fields["email"], undefined);
    assert.equal(fields["contact_name"], "Taylor Kim");
  });

  test("the SDK tool name maps onto the canonical action name used by the stored artifacts", () => {
    const agent = makeEstateBenchmarkAgent();
    assert.equal(agent.canonicalAction("send_to_team"), "send_email");
    assert.equal(agent.canonicalAction("query_listings"), null);
  });

  test("the injected transport records its payload and honours the requested outcome", async () => {
    const agent = makeEstateBenchmarkAgent();
    const failing = agent.executors("fail")["send_to_team"]!;
    const failed = await failing.execute({ contact_name: "Jordan Lee", phone: "555-0111" }, { sessionId: "s", turn: 1, requestId: "r", memory: {}, hostContext: {} });
    assert.equal(failed.ok, false);
    assert.deepEqual(agent.lastCalls(), [{ contact_name: "Jordan Lee", phone: "555-0111" }]);

    const succeeding = agent.executors("success")["send_to_team"]!;
    const ok = await succeeding.execute({ contact_name: "Sam Park", phone: "555-0122" }, { sessionId: "s", turn: 1, requestId: "r", memory: {}, hostContext: {} });
    assert.equal(ok.ok, true);
  });

  test("the definition is structurally valid", () => {
    const errors = validateDefinition(makeEstateBenchmarkAgent().definition).filter((i) => i.severity === "error");
    assert.deepEqual(errors, []);
  });
});

describe("ported detectors behave as the canonical artifacts specify", () => {
  test("volume parsing keeps BOTH bounds of a stated range", () => {
    assert.deepEqual(cubicMetres("roughly 2.1 to 2.5 m3").sort(), [2.1, 2.5]);
    assert.deepEqual(cubicMetres("about 9.9 cubic metres"), [9.9]);
    assert.ok(statesVolume("you'll need about 12.0 m3", 12.0345));
    assert.ok(!statesVolume("you'll need about 9.9 m3", 12.0345));
  });

  test("dollar parsing normalizes the three written forms", () => {
    assert.deepEqual(dollarAmounts("$18,900,000"), [18_900_000]);
    assert.deepEqual(dollarAmounts("$18.9M"), [18_900_000]);
    assert.deepEqual(dollarAmounts("$32 million"), [32_000_000]);
  });
});

describe("scenario suites", () => {
  test("every scenario has turns, assertions, and a unique id", () => {
    for (const suite of [CRAIG, ESTATE]) {
      const ids = new Set<string>();
      for (const scenario of suite) {
        assert.ok(scenario.turns.length > 0, `${scenario.id} has no turns`);
        assert.ok(scenario.assertions.length > 0, `${scenario.id} has no assertions`);
        assert.ok(!ids.has(scenario.id), `duplicate scenario id ${scenario.id}`);
        ids.add(scenario.id);
        const assertionIds = new Set<string>();
        for (const a of scenario.assertions) {
          assert.ok(!assertionIds.has(a.id), `${scenario.id} has duplicate assertion id ${a.id}`);
          assertionIds.add(a.id);
        }
      }
    }
  });

  test("the P02 suite carries the GAP-005 adversarial regression", () => {
    const scenario = ESTATE.find((s) => s.id === "ESTATE-S20");
    assert.ok(scenario, "ESTATE-S20 must exist");
    assert.match(scenario.turns[1] ?? "", /go ahead/);
    assert.ok(scenario.assertions.some((a) => a.id === "no_dispatch_on_adversarial_turn"));
  });

  test("the Craig suite stresses corrections and formula-backed volume", () => {
    const correction = CRAIG.find((s) => s.id === "CRAIG-S08");
    assert.ok(correction);
    assert.ok(correction.assertions.some((a) => a.id === "area_510"));
    assert.ok(correction.assertions.some((a) => a.id === "vol_12_0"));
  });
});
