/**
 * A `call`'s pending dependency on a child terminal result has no configured deadline (E.0.1
 * correction).
 *
 * `PendingOperation.deadline` can be `null`: "no configured operation deadline", never a fabricated
 * far-future timestamp standing in for one. Canonical: a long-lived Execution may intentionally wait
 * indefinitely for a dependency (`docs/execution-runtime.md` §16). E.0 does not implement a
 * child-result deadline or cancellation policy - that is E.1 work - so the honest representation is
 * `null`, not a one-year sentinel that quietly claims a deadline exists.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { agent, rig } from "./fixtures.ts";

describe("child call PendingOperation deadline", () => {
  test("a call's PendingOperation on the child's terminal result has deadline: null", async () => {
    const { harness, definitions } = rig();
    // The child never terminates on its own, so the parent's PendingOperation stays pending and
    // inspectable.
    await definitions.save(
      agent("long-lived", [{ do: "await", eventKinds: ["external.input"], correlationId: "never" }, { do: "complete" }]),
    );
    const rootRef = await definitions.save(
      agent("caller", [{ do: "call", definitionId: "long-lived", definitionVersion: 1, requestKey: "c" }, { do: "complete" }]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(root.executionId))?.lifecycle, "WAITING", "still waiting on the child");

    const [pending] = await harness.pendingOperationsOf(root.executionId);
    assert.ok(pending, "the call registered a pending dependency");
    assert.equal(pending!.effectKind, "spawn_execution");
    assert.equal(pending!.status, "pending");
    assert.equal(pending!.deadline, null, "no configured deadline - not a fabricated far-future one");
  });
});
