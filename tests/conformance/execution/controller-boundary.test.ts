/**
 * What a controller is not allowed to own.
 *
 * Semantic control and operational control are different. This file checks the boundary two ways:
 * by the shape of what a controller receives (no store, no scheduler, no lifecycle setter, nothing
 * mutable), and by what happens when a controller reports something the Harness must refuse.
 *
 * Slice C.1 added a second `activate` parameter, and the shape check is deliberately split rather
 * than relaxed. `ActivationInput` is still frozen pure data with no functions anywhere in it - that
 * is the invariant a resumption field would have destroyed, and it is why the scope is a separate
 * argument. The scope itself is then checked on its own terms: exactly one method, and no route
 * from it to a store, a scheduler, a lifecycle, the Effect gateway, or a settlement path.
 *
 * Slice F.1's read snapshot does *not* appear here: it is resolved by the AgentController from a
 * narrow read-only port when it builds a model invocation, never delivered per Activation.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ActivationInput,
  ActivationOutcome,
  ControllerResumptionScope,
  ExecutionController,
} from "@arrokothi/core/ports";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@arrokothi/core/testing";

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
  capturedScope: ControllerResumptionScope | null = null;

  activate(input: ActivationInput, resumptions: ControllerResumptionScope): ActivationOutcome {
    this.captured = input;
    this.capturedScope = resumptions;
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

  test("the resumption scope exposes one capability and no route to anything operational", async () => {
    const controller = new CapturingController();
    const { harness, definitions } = createTestHarness({ controllers: [controller] });
    const ref = await definitions.save(scriptedAgentDefinition({ id: "scoped", program: [{ do: "complete" }] }));
    await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const scope = controller.capturedScope;
    assert.ok(scope, "the controller received a resumption scope");

    // One method, and it is the only one. Everything a controller must not be able to do is absent
    // by there being nothing to call, not by a runtime check it could be refactored past.
    const names = new Set<string>();
    for (let object: object | null = scope; object && object !== Object.prototype; object = Object.getPrototypeOf(object)) {
      for (const name of Object.getOwnPropertyNames(object)) names.add(name);
    }
    names.delete("constructor");
    assert.deepEqual([...names].sort(), ["run"], "starting local work is the whole of what a scope can do");
    assert.equal(typeof scope!.run, "function");

    for (const forbidden of [
      "store",
      "runtimeStore",
      "transact",
      "scheduler",
      "enqueue",
      "claim",
      "harness",
      "transition",
      "lifecycle",
      "mailbox",
      "append",
      "effects",
      "propose",
      "authorize",
      "authorizer",
      "capabilities",
      "execute",
      "settle",
      "settleEffect",
      "settleResumption",
      "authority",
      "inlineWait",
      "budget",
      "drain",
    ]) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(scope as object, forbidden) || forbidden in (scope as object),
        false,
        `a resumption scope must expose no "${forbidden}"`,
      );
    }

    // And the input it accompanies is still exactly what it was: pure, frozen, function-free.
    assert.deepEqual(Object.keys(controller.captured!).sort(), ["activation", "definition", "events", "execution"]);
    const functions: string[] = [];
    findFunctions(controller.captured, "input", functions);
    assert.deepEqual(functions, [], "the scope is a separate argument precisely so this stays true");
  });

  test("the resumption scope is bound to one Execution and cannot be aimed elsewhere", async () => {
    const seen: { executionId: string; scope: ControllerResumptionScope }[] = [];
    const controller: ExecutionController = {
      kind: "agent",
      activate(input, resumptions) {
        seen.push({ executionId: input.execution.executionId, scope: resumptions });
        return { control: { kind: "agent", progress: {} }, next: { status: "complete" } };
      },
    };
    const { harness, definitions } = createTestHarness({ controllers: [controller] });
    const ref = await definitions.save(scriptedAgentDefinition({ id: "bound", program: [{ do: "complete" }] }));
    await harness.createExecution({ definition: ref });
    await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.equal(seen.length, 2);
    assert.notEqual(seen[0]!.executionId, seen[1]!.executionId);
    assert.notEqual(seen[0]!.scope, seen[1]!.scope, "each Activation gets its own scope, not a shared runtime handle");
    // `run` takes a key and a thunk and nothing else - there is no parameter naming an Execution,
    // so a controller cannot start work on somebody else's behalf.
    assert.equal(seen[0]!.scope.run.length, 2);
  });

  test("the controller port declares no store, scheduler, or lifecycle dependency", async () => {
    for (const path of ["packages/core/src/ports/controller.ts", "packages/core/src/ports/controller-resumption.ts"]) {
      const source = await readFile(resolve(REPO_ROOT, path), "utf8");
      for (const forbidden of [
        "runtime-store.ts",
        "scheduler.ts",
        "definition-store.ts",
        "harness.ts",
        "inline-wait.ts",
        "effect-authorizer.ts",
        "capability-executor.ts",
        "LifecycleState",
        "settleEffect",
      ]) {
        assert.ok(!source.includes(forbidden), `${path} must not reference ${forbidden}`);
      }
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
