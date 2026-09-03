/**
 * Lifecycle ownership.
 *
 * The transition table is the Harness's, and it is total: every illegal edge is rejected in one
 * place, and terminal states have no outgoing edges at all. "Terminal states cannot resume" is
 * checked twice - as a pure rule, and end-to-end through a completed Execution that refuses both
 * new Events and new Activations.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  allowedTransitionsFrom,
  canTransition,
  isTerminalLifecycle,
  LIFECYCLE_STATES,
  TERMINAL_LIFECYCLE_STATES,
} from "@arrokothi/core/execution";
import type { LifecycleState } from "@arrokothi/core/execution";
import { createTestHarness, scriptedAgentDefinition } from "@arrokothi/core/testing";

describe("lifecycle", () => {
  test("the canonical path is allowed", () => {
    assert.ok(canTransition("CREATED", "READY"));
    assert.ok(canTransition("READY", "RUNNING"));
    assert.ok(canTransition("RUNNING", "WAITING"));
    assert.ok(canTransition("WAITING", "READY"));
    assert.ok(canTransition("RUNNING", "READY"));
    assert.ok(canTransition("RUNNING", "COMPLETED"));
    assert.ok(canTransition("RUNNING", "FAILED"));
  });

  test("invalid lifecycle transitions are rejected", () => {
    const illegal: readonly (readonly [LifecycleState, LifecycleState])[] = [
      ["CREATED", "RUNNING"],
      ["CREATED", "WAITING"],
      ["CREATED", "COMPLETED"],
      ["READY", "WAITING"],
      ["READY", "COMPLETED"],
      ["READY", "FAILED"],
      ["WAITING", "RUNNING"],
      ["WAITING", "COMPLETED"],
      ["RUNNING", "RUNNING"],
      ["READY", "READY"],
    ];
    for (const [from, to] of illegal) {
      assert.equal(canTransition(from, to), false, `${from} -> ${to} must be rejected`);
    }
  });

  test("only RUNNING can reach a terminal state", () => {
    for (const from of LIFECYCLE_STATES) {
      for (const terminal of ["COMPLETED", "FAILED"] as const) {
        if (from === "RUNNING") continue;
        assert.equal(canTransition(from, terminal), false, `${from} -> ${terminal} must require an Activation`);
      }
    }
  });

  test("terminal states have no outgoing transitions", () => {
    for (const terminal of TERMINAL_LIFECYCLE_STATES) {
      assert.ok(isTerminalLifecycle(terminal));
      assert.deepEqual(allowedTransitionsFrom(terminal), [], `${terminal} cannot resume`);
      for (const to of LIFECYCLE_STATES) {
        assert.equal(canTransition(terminal, to), false, `${terminal} -> ${to} must be rejected`);
      }
    }
  });

  test("a completed Execution accepts no Event and no further Activation", async () => {
    const { harness, definitions, scheduler } = createTestHarness();
    const ref = await definitions.save(scriptedAgentDefinition({ id: "short-lived", program: [{ do: "complete" }] }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");

    const receipt = await harness.deliverExternalInput({ destination: handle.executionId, label: "user.message" });
    assert.equal(receipt.status, "rejected");
    if (receipt.status === "rejected") assert.equal(receipt.reason, "execution_terminal");

    // Even a scheduler that was told to run it again produces no Activation.
    await scheduler.enqueue(handle.executionId);
    assert.equal(await harness.runOnce(), null, "a terminal Execution is dropped rather than activated");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });

  test("every lifecycle change is recorded as audit, not as a delivered Event", async () => {
    const { harness, definitions, store } = createTestHarness();
    const ref = await definitions.save(scriptedAgentDefinition({ id: "audited", program: [{ do: "complete" }] }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const transitions = await harness.transitionsOf(handle.executionId);
    assert.deepEqual(
      transitions.map((t) => `${t.from}->${t.to}`),
      ["CREATED->READY", "READY->RUNNING", "RUNNING->COMPLETED"],
    );

    const context = await harness.inspect(handle.executionId);
    assert.deepEqual(
      await store.peekMailbox(context!.mailbox.mailboxId),
      [],
      "lifecycle audit records never appear in the mailbox",
    );
  });
});
