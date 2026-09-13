/** Predicate counterexamples keep the independent W-3/B-8 lifecycle writers coherent. */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { VIOLATIONS } from "./candidate.ts";
import { ALL_SCENARIOS } from "./scenarios.ts";
import type { Observation } from "./fixture.ts";

function coherent(o: Observation): void {
  assert.equal(o.liveWaitGeneration !== null, o.state === "WAITING", "W-3 live iff WAITING");
  if (o.state !== "READY") assert.deepEqual(o.waitEndedReadiness, [], "B-8 readiness requires READY");
  for (const r of o.waitEndedReadiness) assert.notEqual(r.generation, o.liveWaitGeneration, "readiness requires retirement");
}

describe("round-15 selector counterexample isolation", () => {
  test("the reviewed selector inventory cannot silently lose its isolation check", () => {
    assert.deepEqual(VIOLATIONS.filter(v => v.isolation === "selector").map(v => v.id), ["clauses/r5-k1", "clauses/r5-k1b", "clauses/r5-k2"]);
  });
  for (const v of VIOLATIONS.filter(v => v.isolation === "selector")) {
    test(`${v.id} flips eligibility through a coherent B-6 branch`, () => {
      const scenario = ALL_SCENARIOS.find(s => s.id === v.scenarioId)!;
      const expected = scenario.steps[v.stepIndex]!.expect.observation;
      const mutated = v.mutate(expected);
      coherent(expected); coherent(mutated);
      assert.notEqual(mutated.state, expected.state);
      assert.notEqual(mutated.liveWaitGeneration, expected.liveWaitGeneration);
      assert.notDeepEqual(mutated.waitEndedReadiness, expected.waitEndedReadiness);
      for (const key of Object.keys(expected) as (keyof Observation)[]) {
        if (["state", "liveWaitGeneration", "waitEndedReadiness"].includes(key)) continue;
        assert.deepEqual(mutated[key], expected[key], `${v.id} independently changes ${key}`);
      }
      const wait = scenario.steps.slice(0, v.stepIndex + 1).map(s => s.command).filter(c => c.kind === "submit_outcome" && c.outcome.next.step === "await").at(-1)!;
      assert.ok(wait.kind === "submit_outcome" && wait.outcome.next.step === "await");
      const generation = wait.outcome.next.wait.generation;
      if (mutated.state === "WAITING") assert.equal(mutated.liveWaitGeneration, generation);
      else assert.deepEqual(mutated.waitEndedReadiness, [{ generation, species: "event" }]);
    });
  }
  test("both C14 W-3-contaminated constructions fail independently of the oracle", () => {
    const s = ALL_SCENARIOS.find(s => s.id === "cited-decision-edges")!;
    assert.throws(() => coherent({ ...s.steps[8]!.expect.observation, liveWaitGeneration: null }), /W-3/);
    assert.throws(() => coherent({ ...s.steps[9]!.expect.observation, liveWaitGeneration: "edge-g2" }), /W-3/);
  });
});

describe("round-15 reservation counterexample isolation", () => {
  test("empty-batch refusal preserves Activation/batch existence and READY lifecycle", () => {
    const v = VIOLATIONS.find(v => v.id === "clauses/r5-j2b")!;
    const s = ALL_SCENARIOS.find(s => s.id === v.scenarioId)!;
    const o = v.mutate(s.steps[v.stepIndex]!.expect.observation);
    coherent(o);
    assert.equal(o.state, "READY");
    assert.equal(o.activationId, null);
    assert.equal(o.dispatchedBatch, null);
    assert.deepEqual(o.progress, s.steps[v.stepIndex]!.expect.observation.progress);
  });
  test("premature reservation acknowledgment preserves exclusive Event disposition", () => {
    const v = VIOLATIONS.find(v => v.id === "clauses/r5-j5")!;
    const s = ALL_SCENARIOS.find(s => s.id === v.scenarioId)!;
    const o = v.mutate(s.steps[v.stepIndex]!.expect.observation);
    assert.ok(o.acknowledged.includes("early"));
    assert.ok(!o.queued.includes("early"));
    assert.deepEqual(o.dispatchedBatch, s.steps[v.stepIndex]!.expect.observation.dispatchedBatch);
    for (const id of o.acknowledged) assert.ok(!o.queued.includes(id), `double disposition ${id}`);
  });
});
