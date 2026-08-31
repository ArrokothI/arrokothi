/**
 * Response is not completion.
 *
 * A long-lived Execution answers and keeps living. This is the invariant the previous architecture
 * violated most directly - a model turn ending was read as the unit of work finishing - so it is
 * checked at the level of stored state: emissions exist, `terminalResult` does not, and the
 * lifecycle is still one an Event can wake.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createTestHarness, scriptedAgentDefinition } from "@agent-sdk/core/testing";

describe("response is not a terminal result", () => {
  test("an Execution that emits repeatedly stays alive and uncompleted", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "chatty",
        program: [
          { do: "emit", text: "first answer" },
          { do: "emit", text: "second answer" },
          { do: "await", eventKinds: ["external.input"], note: "waiting for the next question" },
          { do: "emit", text: "third answer" },
          { do: "complete" },
        ],
      }),
    );

    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "WAITING", "producing output did not end the Execution");
    assert.equal(context?.terminalResult, null, "no emission populated the terminal result");
    assert.equal(context?.failure, null);

    const emissions = await harness.emissionsOf(handle.executionId);
    assert.deepEqual(
      emissions.map((e) => (e.body.kind === "text" ? e.body.text : null)),
      ["first answer", "second answer"],
    );
    assert.deepEqual(emissions.map((e) => e.sequence), [1, 2], "emissions are ordered without implying completion");

    await harness.deliverExternalInput({ destination: handle.executionId, label: "user.message", payload: { text: "and then?" } });
    await harness.runUntilIdle();

    const finished = await harness.inspect(handle.executionId);
    assert.equal(finished?.lifecycle, "COMPLETED");
    assert.equal((await harness.emissionsOf(handle.executionId)).length, 3);
  });

  test("emission and terminal result are different fields with different lifecycle behaviour", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "emit-then-complete",
        program: [{ do: "emit", text: "here is my answer" }, { do: "complete" }],
      }),
    );

    const handle = await harness.createExecution({ definition: ref });

    const first = await harness.runOnce();
    assert.equal(first?.result, "continued", "the emitting Activation did not terminate anything");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "READY");
    assert.equal((await harness.inspect(handle.executionId))?.terminalResult, null);

    const second = await harness.runOnce();
    assert.equal(second?.result, "completed");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");

    const emissions = await harness.emissionsOf(handle.executionId);
    assert.equal(emissions.length, 1, "completion did not turn the emission into a result, or vice versa");
    assert.equal(emissions[0]?.activationId, first?.activationId, "the emission is attributed to the Activation that made it");
  });
});
