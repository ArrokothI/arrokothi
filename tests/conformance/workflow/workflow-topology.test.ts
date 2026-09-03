/**
 * Workflow topology is system-defined.
 *
 * The application declares the possible Stages and transitions. A Stage - or a model inside one -
 * may choose *among* declared labels; it can never return a Stage id, invent a label, or otherwise
 * reach past the graph. Loops are allowed because they are declared; graph mutation is not, because
 * there is no way to express it.
 *
 * The cases below cover the four things that must be true of every transition:
 * every target exists, labels are unambiguous, an undeclared label fails, and a required label that
 * is missing fails. Plus the one thing that must be true of completion: a Workflow completes only
 * from a declared completion transition.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineWorkflow, readWorkflowControlState } from "@arrokothi/core/execution";
import type { FunctionStageOutcome, StageExecutionContext } from "@arrokothi/core/ports";
import { createFunctionStageRegistry } from "@arrokothi/core/reference";
import { createWorkflowTestHarness } from "@arrokothi/core/testing";

/** Returns whatever transition label its config names, so a test can aim it anywhere. */
function labelled(context: StageExecutionContext): FunctionStageOutcome {
  const label = context.config["label"];
  return {
    status: "completed",
    result: `${context.stageId}@${context.visit}`,
    ...(typeof label === "string" ? { transition: label } : {}),
  };
}

/** Loops until the Workflow has entered as many Stages as its config says. */
function revising(context: StageExecutionContext): FunctionStageOutcome {
  const until = typeof context.config["until"] === "number" ? (context.config["until"] as number) : 2;
  return {
    status: "completed",
    result: `visit ${context.visit}`,
    transition: context.visit < until ? "revise" : "publish",
  };
}

const functions = createFunctionStageRegistry({
  labelled,
  revising,
  plain: (context) => ({ status: "completed", result: context.input ?? "start" }),
});

describe("Workflow topology", () => {
  test("a linear Workflow runs its declared Stage sequence", async () => {
    const { harness, definitions, trace } = createWorkflowTestHarness({ functions });
    const ref = await definitions.save(
      defineWorkflow({
        id: "linear",
        spec: {
          entryStage: "a",
          stages: [
            { id: "a", kind: "function", implementationRef: "plain", transitions: { kind: "always", next: { to: "stage", stage: "b" } } },
            { id: "b", kind: "function", implementationRef: "plain", transitions: { kind: "always", next: { to: "stage", stage: "c" } } },
            { id: "c", kind: "function", implementationRef: "plain", transitions: { kind: "always", next: { to: "complete" } } },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(trace.transitions.map((entry) => `${entry.from}->${entry.to}`), ["a->b", "b->c", "c->complete"]);
    assert.deepEqual(trace.transitions.map((entry) => entry.label), [null, null, null], "a single successor needs no label");
  });

  test("a predefined branch is selected by the label the Stage produced", async () => {
    for (const [label, expected] of [["left", "left-end"], ["right", "right-end"]] as const) {
      const { harness, definitions, trace } = createWorkflowTestHarness({ functions });
      const ref = await definitions.save(
        defineWorkflow({
          id: `branch-${label}`,
          spec: {
            entryStage: "choose",
            stages: [
              {
                id: "choose",
                kind: "function",
                implementationRef: "labelled",
                config: { label },
                transitions: {
                  kind: "labeled",
                  cases: [
                    { label: "left", next: { to: "stage", stage: "left-end" } },
                    { label: "right", next: { to: "stage", stage: "right-end" } },
                  ],
                },
              },
              { id: "left-end", kind: "function", implementationRef: "plain", transitions: { kind: "always", next: { to: "complete" } } },
              { id: "right-end", kind: "function", implementationRef: "plain", transitions: { kind: "always", next: { to: "complete" } } },
            ],
          },
        }),
      );
      const handle = await harness.createExecution({ definition: ref });
      await harness.runUntilIdle();
      assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
      assert.equal(trace.transitions[0]?.to, expected);
      assert.equal(trace.transitions[0]?.label, label);
    }
  });

  test("a Stage cannot jump to an undeclared Stage by naming an unknown label", async () => {
    const { harness, definitions } = createWorkflowTestHarness({ functions });
    const ref = await definitions.save(
      defineWorkflow({
        id: "unknown-label",
        spec: {
          entryStage: "choose",
          stages: [
            {
              id: "choose",
              kind: "function",
              implementationRef: "labelled",
              // The declared graph offers only "left"; the Stage will name a target it invented.
              config: { label: "secret-admin-stage" },
              transitions: { kind: "labeled", cases: [{ label: "left", next: { to: "complete" } }] },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "unknown_transition_label");
    assert.match(context!.failure!.message, /secret-admin-stage/);
  });

  test("a branching Stage that produces no label fails rather than picking one", async () => {
    const { harness, definitions } = createWorkflowTestHarness({ functions });
    const ref = await definitions.save(
      defineWorkflow({
        id: "missing-label",
        spec: {
          entryStage: "choose",
          stages: [
            {
              id: "choose",
              kind: "function",
              implementationRef: "plain",
              transitions: {
                kind: "labeled",
                cases: [
                  { label: "left", next: { to: "complete" } },
                  { label: "right", next: { to: "complete" } },
                ],
              },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "missing_transition_label");
  });

  test("a label under a single unconditional transition names nothing and is refused", async () => {
    const { harness, definitions } = createWorkflowTestHarness({ functions });
    const ref = await definitions.save(
      defineWorkflow({
        id: "unexpected-label",
        spec: {
          entryStage: "choose",
          stages: [
            {
              id: "choose",
              kind: "function",
              implementationRef: "labelled",
              config: { label: "elsewhere" },
              transitions: { kind: "always", next: { to: "complete" } },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "unexpected_transition_label");
  });

  test("a declared loop revisits a Stage safely, with a new visit each time", async () => {
    const { harness, definitions, trace } = createWorkflowTestHarness({ functions });
    const ref = await definitions.save(
      defineWorkflow({
        id: "evaluate-revise",
        spec: {
          entryStage: "evaluate",
          stages: [
            {
              id: "evaluate",
              kind: "function",
              implementationRef: "revising",
              config: { until: 5 },
              transitions: {
                kind: "labeled",
                cases: [
                  { label: "revise", next: { to: "stage", stage: "revise" } },
                  { label: "publish", next: { to: "complete" } },
                ],
              },
            },
            { id: "revise", kind: "function", implementationRef: "plain", transitions: { kind: "always", next: { to: "stage", stage: "evaluate" } } },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.deepEqual(
      trace.transitions.map((entry) => `${entry.from}->${entry.to}`),
      ["evaluate->revise", "revise->evaluate", "evaluate->revise", "revise->evaluate", "evaluate->complete"],
    );
    const state = readWorkflowControlState(context!.control.progress)!;
    assert.equal(state.visit, 5, "each Stage entry is a distinct visit, including a repeated one");
    assert.equal(state.transitions, 5);
  });

  test("a loop that never reaches a completion transition is bounded, not infinite", async () => {
    const { harness, definitions } = createWorkflowTestHarness({ functions, maxTransitions: 6 });
    const ref = await definitions.save(
      defineWorkflow({
        id: "forever",
        spec: {
          entryStage: "a",
          stages: [
            { id: "a", kind: "function", implementationRef: "plain", transitions: { kind: "always", next: { to: "stage", stage: "b" } } },
            { id: "b", kind: "function", implementationRef: "plain", transitions: { kind: "always", next: { to: "stage", stage: "a" } } },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "workflow_transition_limit");
  });

  test("a Workflow completes only when topology resolves to a completion target", async () => {
    const { harness, definitions } = createWorkflowTestHarness({ functions });
    const ref = await definitions.save(
      defineWorkflow({
        id: "not-yet",
        spec: {
          entryStage: "a",
          stages: [
            { id: "a", kind: "function", implementationRef: "plain", transitions: { kind: "always", next: { to: "stage", stage: "b" } } },
            { id: "b", kind: "function", implementationRef: "plain", transitions: { kind: "always", next: { to: "complete" } } },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    const records = await harness.runUntilIdle();

    // Stage `a` produced text and the Activation ended; that is not completion.
    const afterFirstStage = records[0]!;
    assert.equal(afterFirstStage.result, "continued");
    assert.equal(afterFirstStage.lifecycleAfter, "READY");
    assert.equal(records.at(-1)!.lifecycleAfter, "COMPLETED");
  });
});
