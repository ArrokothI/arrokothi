/**
 * K0.2-C1..C6 in aggregate: every K0 boundary is actually observed by a scenario.
 *
 * 001's K0 exit demands that each input/Outcome/Effect/wake/cancel boundary has "an observable
 * acceptance/rejection result". The accepted K0.1 worksheet enumerates those boundaries as ten §11
 * rows. This file checks the coverage map against the scenario set in both directions, so neither a
 * dropped scenario nor an aspirational map entry can survive.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { K0_BOUNDARY_COVERAGE } from "./coverage.ts";
import { ALL_SCENARIOS } from "./scenarios.ts";

const scenarioIds = new Set(ALL_SCENARIOS.map((scenario) => scenario.id));

describe("K0 boundary coverage", () => {
  test("all ten §11 rows are present exactly once, in order", () => {
    assert.deepEqual(
      K0_BOUNDARY_COVERAGE.map((entry) => entry.row),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    );
  });

  test("every row is observed by at least one scenario that actually exists", () => {
    for (const entry of K0_BOUNDARY_COVERAGE) {
      assert.ok(entry.observedBy.length > 0, `row ${entry.row} claims no observing scenario`);
      for (const id of entry.observedBy) {
        assert.ok(scenarioIds.has(id), `row ${entry.row} names unknown scenario ${id}`);
      }
    }
  });

  test("every scenario's own declared rows agree with the map", () => {
    // The map and the scenarios declare the relationship separately; disagreement means one of them
    // drifted, and a drifted coverage map is worse than none.
    for (const scenario of ALL_SCENARIOS) {
      for (const row of scenario.k0BoundaryRows) {
        const entry = K0_BOUNDARY_COVERAGE.find((candidate) => candidate.row === row);
        assert.ok(entry, `${scenario.id} claims unknown boundary row ${row}`);
        assert.ok(
          entry.observedBy.includes(scenario.id),
          `${scenario.id} claims row ${row} but the coverage map does not list it there`,
        );
      }
    }
  });

  test("every scenario is reachable from the map: none is dead weight", () => {
    const mapped = new Set(K0_BOUNDARY_COVERAGE.flatMap((entry) => entry.observedBy));
    for (const id of scenarioIds) {
      assert.ok(mapped.has(id), `${id} is not referenced by any boundary row`);
    }
  });

  test("each row states how it is observed, not merely that it is", () => {
    for (const entry of K0_BOUNDARY_COVERAGE) {
      assert.ok(entry.observable.length > 40, `row ${entry.row} has no substantive observation statement`);
      assert.ok(entry.boundary.length > 0);
    }
  });

  test("row 9 is the one boundary K0.1 assigns jointly to Kernel and Runtime/Driver", () => {
    const joint = K0_BOUNDARY_COVERAGE.filter((entry) => entry.owner === "Kernel + Runtime/Driver");
    assert.deepEqual(joint.map((entry) => entry.row), [9]);
  });

  test("every scenario declares at least one boundary row", () => {
    for (const scenario of ALL_SCENARIOS) {
      assert.ok(scenario.k0BoundaryRows.length > 0, `${scenario.id} declares no boundary row`);
      assert.ok(scenario.sources.length > 0, `${scenario.id} cites no governing source`);
      assert.ok(scenario.steps.length > 0, `${scenario.id} has no steps`);
    }
  });
});
