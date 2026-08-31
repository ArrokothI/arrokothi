/**
 * What a controller is not allowed to own.
 *
 * Semantic control and operational control are different. This file checks the boundary two ways:
 * by the shape of what a controller receives (no store, no scheduler, no lifecycle setter, nothing
 * mutable), and by what happens when a controller reports something the Harness must refuse.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ActivationInput, ActivationOutcome, ExecutionController } from "@agent-sdk/core/ports";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@agent-sdk/core/testing";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function findFunctions(value: unknown, path: string, found: string[], seen = new Set<object>()): void {
  if (typeof value === "function") {
    found.push(path);
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (seen.has(value as object)) return;
  seen.add(value as object);
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    findFunctions(child, `${path}.${key}`, found, seen);
  }
}

class CapturingController implements ExecutionController {
  readonly kind = "agent" as const;
  captured: ActivationInput | null = null;

  activate(input: ActivationInput): ActivationOutcome {
    this.captured = input;
    return { control: { kind: "agent", progress: { seen: true } }, next: { status: "complete" } };
  }
}

describe("controller ownership boundary", () => {
  test("a controller receives only a read-only view, its definition, its Events, and Activation metadata", async () => {
    const controller = new CapturingController();
    const { harness, definitions } = createTestHarness({ controllers: [controller] });
    const ref = await definitions.save(scriptedAgentDefinition({ id: "inspected", program: [{ do: "complete" }] }));
    await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const input = controller.captured;
    assert.ok(input, "the controller ran");
    assert.deepEqual(Object.keys(input!).sort(), ["activation", "definition", "events", "execution"]);

    const functions: string[] = [];
    findFunctions(input, "input", functions);
    assert.deepEqual(functions, [], "there is no store, scheduler, transaction, or lifecycle setter to call");

    assert.ok(Object.isFrozen(input), "the Activation input is frozen");
    assert.ok(Object.isFrozen(input!.execution), "so is the Execution view");
    assert.ok(Object.isFrozen(input!.definition));

    assert.equal(
      Object.prototype.hasOwnProperty.call(input!.execution, "mailbox"),
      false,
      "the view exposes no mailbox handle",
    );
    assert.equal(Object.prototype.hasOwnProperty.call(input!.execution, "revision"), false, "nor a persistence revision");
    assert.equal(Object.prototype.hasOwnProperty.call(input!.execution, "slots"), false, "nor authority or memory refs");
  });

  test("the controller port declares no store, scheduler, or lifecycle dependency", async () => {
    const source = await readFile(resolve(REPO_ROOT, "packages/core/src/ports/controller.ts"), "utf8");
    for (const forbidden of ["runtime-store.ts", "scheduler.ts", "definition-store.ts", "harness.ts", "LifecycleState"]) {
      assert.ok(!source.includes(forbidden), `the controller contract must not reference ${forbidden}`);
    }
  });

  test("a controller cannot name an operational lifecycle state", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedAgentDefinition({ id: "self-suspending", program: [{ do: "misreport", as: "lifecycle_status" }] }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED", "the Harness refused the outcome rather than adopting it");
    assert.equal(context?.failure?.code, "invalid_controller_outcome:invalid_next");
    assert.deepEqual(readScriptedProgress(context!.control.progress).notes, {}, "rejected progress was not persisted");
  });

  test("a controller cannot relabel whose progress it is writing", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedAgentDefinition({ id: "impostor", program: [{ do: "misreport", as: "wrong_kind" }] }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "invalid_controller_outcome:wrong_control_kind");
    assert.equal(context?.control.kind, "agent", "the Execution kind still comes from the pinned definition");
  });

  test("a controller cannot persist anything that is not serializable data", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedAgentDefinition({ id: "leaky", program: [{ do: "misreport", as: "unserializable_progress" }] }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "invalid_controller_outcome:invalid_progress");
  });

  test("a controller that throws fails its Execution instead of corrupting it", async () => {
    const exploding: ExecutionController = {
      kind: "agent",
      activate() {
        throw new Error("model client blew up");
      },
    };
    const { harness, definitions } = createTestHarness({ controllers: [exploding] });
    const ref = await definitions.save(scriptedAgentDefinition({ id: "explodes", program: [{ do: "complete" }] }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "controller_error");
    assert.match(context!.failure!.message, /model client blew up/);
    assert.equal(context?.terminalResult, null);
  });
});
