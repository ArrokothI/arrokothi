/**
 * K0.2-C7(a): the only candidate this packet ships against the real repository refuses every scenario.
 *
 * This test is the guard that stops a prepared fixture from being read as a passed gate. If someone
 * later wires a real Kernel in and this file starts reporting PASS, that is a K1 result and it must be
 * claimed as one in K1.4's report — not inherited silently from K0.2's acceptance.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { refusingCandidate } from "./candidate.ts";
import { createOperationSink } from "./operation-sink.ts";
import { runScenario, FIXTURE_VERSION } from "./fixture.ts";
import { ALL_SCENARIOS } from "./scenarios.ts";

describe("K0 public fixture: the current tree refuses the target protocol", () => {
  test("the fixture is versioned, so an external observer can pin what it ran", () => {
    assert.equal(FIXTURE_VERSION, "arrokothi-k0-public-fixture/1");
  });

  for (const scenario of ALL_SCENARIOS) {
    test(`${scenario.id} is REFUSED, not passed`, () => {
      const { sink, ledger } = createOperationSink();
      const result = runScenario(refusingCandidate, scenario, { sink, ledgerCount: () => ledger.count() });

      assert.equal(result.outcome, "REFUSED");
      assert.notEqual(result.outcome as string, "PASS");
      assert.match(
        result.outcome === "REFUSED" ? result.reason : "",
        /target Activation\/Outcome protocol/,
        "a refusal must name what is missing rather than return a plausible-looking empty result",
      );
      assert.equal(ledger.count(), 0, "a refusing candidate must not touch the operation sink");
    });
  }

  test("every scenario is refused: no scenario is silently exempted", () => {
    const { sink } = createOperationSink();
    const outcomes = ALL_SCENARIOS.map((scenario) => runScenario(refusingCandidate, scenario, { sink }).outcome);
    assert.deepEqual(new Set(outcomes), new Set(["REFUSED"]));
    assert.equal(outcomes.length, 7);
  });
});
