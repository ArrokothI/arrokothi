/**
 * At most one active Activation per Execution.
 *
 * Two workers advancing one Execution would let two controllers write conflicting progress for a
 * single identity. Store compare-and-set can detect that afterwards; it cannot undo the semantic
 * damage, so the scheduler prevents it up front.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { ActivationInput, ActivationOutcome, ExecutionController } from "@agent-sdk/core/ports";
import { createTestHarness, scriptedAgentDefinition } from "@agent-sdk/core/testing";

/**
 * A controller that parks inside its Activation until the test lets it finish.
 *
 * `gatedExecutionId` keeps the park targeted: with it set, other Executions run normally, which is
 * how the second case can show that exclusion is per-Execution rather than a global stall.
 */
class GatedController implements ExecutionController {
  readonly kind = "agent" as const;
  gatedExecutionId: string | null = null;
  activations = 0;
  readonly entered: Promise<void>;
  private release!: () => void;
  private announceEntered!: () => void;
  private readonly gate: Promise<void>;

  constructor() {
    this.gate = new Promise<void>((resolve) => {
      this.release = resolve;
    });
    this.entered = new Promise<void>((resolve) => {
      this.announceEntered = resolve;
    });
  }

  async activate(input: ActivationInput): Promise<ActivationOutcome> {
    this.activations += 1;
    if (this.gatedExecutionId === null || input.execution.executionId === this.gatedExecutionId) {
      this.announceEntered();
      await this.gate;
    }
    return {
      control: { kind: "agent", progress: { ran: this.activations } },
      next: { status: "complete" },
    };
  }

  finish(): void {
    this.release();
  }
}

describe("scheduler exclusion", () => {
  test("a second worker cannot activate an Execution that is already RUNNING", async () => {
    const controller = new GatedController();
    const { harness, definitions, scheduler } = createTestHarness({ controllers: [controller] });
    const ref = await definitions.save(scriptedAgentDefinition({ id: "exclusive", program: [{ do: "complete" }] }));
    const handle = await harness.createExecution({ definition: ref });

    const workerA = harness.runOnce("worker-a");
    await controller.entered;

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "RUNNING");
    assert.equal(scheduler.activeClaims().length, 1, "exactly one claim is outstanding");

    const workerB = await harness.runOnce("worker-b");
    assert.equal(workerB, null, "a second worker finds nothing claimable for the same Execution");
    assert.equal(controller.activations, 1, "the controller was not entered twice");

    controller.finish();
    const record = await workerA;
    assert.equal(record?.result, "completed");
    assert.equal(scheduler.activeClaims().length, 0, "the claim is released when the Activation ends");
  });

  test("exclusion does not stall unrelated Executions", async () => {
    const controller = new GatedController();
    const { harness, definitions } = createTestHarness({ controllers: [controller] });
    const ref = await definitions.save(scriptedAgentDefinition({ id: "parallel", program: [{ do: "complete" }] }));
    const blocked = await harness.createExecution({ definition: ref });
    const other = await harness.createExecution({ definition: ref });
    controller.gatedExecutionId = blocked.executionId;

    const workerA = harness.runOnce("worker-a");
    await controller.entered;

    const workerB = await harness.runOnce("worker-b");
    assert.equal(workerB?.executionId, other.executionId, "another Execution is still claimable");
    assert.notEqual(workerB?.executionId, blocked.executionId);

    controller.finish();
    await workerA;
  });
});
