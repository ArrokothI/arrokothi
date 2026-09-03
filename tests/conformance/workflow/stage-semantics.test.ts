/**
 * What a Stage is, and what it is not.
 *
 * ```text
 * Stage != Execution
 * StageResult = text | none
 * StageResult != terminal result
 * emission != completion
 * ```
 *
 * Each of those is asserted against a running Workflow rather than against a type. A Function Stage
 * does local work and hands text to the next Stage; an LLM Stage runs through logical model
 * resolution; neither acquires an ExecutionId, a lifecycle, a mailbox, or an authority envelope; and
 * text crossing a Stage boundary never becomes what the Execution returns.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineWorkflow, readWorkflowControlState } from "@arrokothi/core/execution";
import type { StageExecutionContext, FunctionStageOutcome } from "@arrokothi/core/ports";
import {
  ScriptedModelProvider,
  StaticModelResolver,
  createFunctionStageRegistry,
  portableModelFeatures,
} from "@arrokothi/core/reference";
import { createWorkflowTestHarness, modelAccess } from "@arrokothi/core/testing";

const seen: StageExecutionContext[] = [];

function record(handler: (context: StageExecutionContext) => FunctionStageOutcome) {
  return (context: StageExecutionContext): FunctionStageOutcome => {
    seen.push(context);
    return handler(context);
  };
}

const functions = createFunctionStageRegistry({
  "upper": record((context) => ({ status: "completed", result: (context.input ?? "").toUpperCase() })),
  "count": record((context) => ({ status: "completed", result: `${(context.input ?? "").length} characters` })),
  "silent": record(() => ({ status: "completed", result: null })),
  "chatty": record((context) => ({
    status: "completed",
    result: context.input,
    emissions: [{ body: { kind: "text", text: "I found some evidence" } }],
  })),
  "leaky": record(() => ({ status: "completed", result: { not: "text" } } as unknown as FunctionStageOutcome)),
});

describe("Stage semantics", () => {
  test("a Function Stage runs locally and hands text to the next Stage", async () => {
    seen.length = 0;
    const { harness, definitions } = createWorkflowTestHarness({ functions });
    const ref = await definitions.save(
      defineWorkflow({
        id: "linear",
        spec: {
          entryStage: "upper",
          stages: [
            { id: "upper", kind: "function", implementationRef: "upper", transitions: { kind: "always", next: { to: "stage", stage: "count" } } },
            { id: "count", kind: "function", implementationRef: "count", transitions: { kind: "always", next: { to: "complete" } } },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    // The entry Stage is given `none`: nothing has produced a Stage result yet.
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.deepEqual(seen.map((entry) => entry.stageId), ["upper", "count"]);
    assert.equal(seen[0]?.input, null, "the entry Stage receives none, not an empty string");
    assert.equal(seen[1]?.input, "", "the previous Stage's result crossed the boundary");

    const state = readWorkflowControlState(context!.control.progress);
    assert.equal(state?.currentStage, "count");
    assert.equal(state?.provisionalResult, "0 characters");
    // No Effect was needed: this Stage is local computation from start to finish.
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), []);
  });

  test("the entry Stage receives application start input, and only text", async () => {
    for (const [label, payload, expected] of [
      ["text", "find the pet policy", "find the pet policy"],
      ["structured", { question: "find the pet policy" }, null],
      ["absent", undefined, null],
    ] as const) {
      seen.length = 0;
      const { harness, definitions } = createWorkflowTestHarness({ functions });
      const ref = await definitions.save(
        defineWorkflow({
          id: `start-${label}`,
          spec: {
            entryStage: "count",
            stages: [{ id: "count", kind: "function", implementationRef: "count", transitions: { kind: "always", next: { to: "complete" } } }],
          },
        }),
      );
      const handle = await harness.createExecution({ definition: ref });
      if (payload !== undefined) {
        await harness.deliverExternalInput({ destination: handle.executionId, label: "question", payload });
      }
      await harness.runUntilIdle();

      assert.equal(
        seen[0]?.input,
        expected,
        `${label} start input: a Stage result is text or none, so a structured payload is not squeezed into one`,
      );
    }
  });

  test("a Stage has no Execution identity, lifecycle, mailbox, or authority", async () => {
    seen.length = 0;
    const { harness, definitions } = createWorkflowTestHarness({ functions });
    const ref = await definitions.save(
      defineWorkflow({
        id: "no-identity",
        spec: {
          entryStage: "upper",
          stages: [{ id: "upper", kind: "function", implementationRef: "upper", transitions: { kind: "always", next: { to: "complete" } } }],
        },
      }),
    );
    await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = seen[0]!;
    for (const forbidden of [
      "executionId",
      "ownerExecutionId",
      "rootExecutionId",
      "lifecycle",
      "mailbox",
      "authority",
      "authorityEnvelope",
      "cancel",
      "settleEffect",
      "store",
      "harness",
      "scheduler",
    ]) {
      assert.equal(
        forbidden in (context as unknown as Record<string, unknown>),
        false,
        `Stage-local computation must not receive "${forbidden}"; a Stage is Workflow structure, not a mini-Execution`,
      );
    }
    assert.equal(typeof context.visit, "number", "a Stage gets a visit number, which is controller progress");
  });

  test("StageResult is text or none, and nothing else", async () => {
    seen.length = 0;
    const { harness, definitions } = createWorkflowTestHarness({ functions });

    const noneRef = await definitions.save(
      defineWorkflow({
        id: "none-result",
        spec: {
          entryStage: "silent",
          stages: [
            { id: "silent", kind: "function", implementationRef: "silent", transitions: { kind: "always", next: { to: "stage", stage: "count" } } },
            { id: "count", kind: "function", implementationRef: "count", transitions: { kind: "always", next: { to: "complete" } } },
          ],
        },
      }),
    );
    const none = await harness.createExecution({ definition: noneRef });
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(none.executionId))?.lifecycle, "COMPLETED");
    assert.equal(seen[1]?.input, null, "a Stage that produces nothing hands `none` onward");

    const leakyRef = await definitions.save(
      defineWorkflow({
        id: "structured-result",
        spec: {
          entryStage: "leaky",
          stages: [{ id: "leaky", kind: "function", implementationRef: "leaky", transitions: { kind: "always", next: { to: "complete" } } }],
        },
      }),
    );
    const leaky = await harness.createExecution({ definition: leakyRef });
    await harness.runUntilIdle();
    const failed = await harness.inspect(leaky.executionId);
    assert.equal(failed?.lifecycle, "FAILED");
    assert.equal(failed?.failure?.code, "invalid_function_stage_outcome");
  });

  test("the final StageResult does not become the Execution's terminal result", async () => {
    const { harness, definitions } = createWorkflowTestHarness({ functions });
    const ref = await definitions.save(
      defineWorkflow({
        id: "declared-result",
        terminalResult: { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } },
        spec: {
          entryStage: "upper",
          // The completion transition proposes no terminal value, so the Workflow completing with
          // Stage text in hand is still not a validated Execution result.
          stages: [{ id: "upper", kind: "function", implementationRef: "upper", transitions: { kind: "always", next: { to: "complete" } } }],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "invalid_terminal_result:missing_result");
    assert.equal(context?.terminalResult, null, "Stage text never silently becomes a terminal result");
  });

  test("a completion transition may propose a terminal result explicitly, and the Harness validates it", async () => {
    const { harness, definitions } = createWorkflowTestHarness({ functions });
    const ref = await definitions.save(
      defineWorkflow({
        id: "explicit-terminal",
        terminalResult: { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } },
        spec: {
          entryStage: "upper",
          stages: [
            {
              id: "upper",
              kind: "function",
              implementationRef: "upper",
              transitions: { kind: "always", next: { to: "complete", terminal: { kind: "value", value: "published" } } },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.equal(context?.terminalResult?.value, "published");
  });

  test("an emission does not terminate the Workflow", async () => {
    const { harness, definitions } = createWorkflowTestHarness({ functions });
    const ref = await definitions.save(
      defineWorkflow({
        id: "emits",
        spec: {
          entryStage: "chatty",
          stages: [
            { id: "chatty", kind: "function", implementationRef: "chatty", transitions: { kind: "always", next: { to: "stage", stage: "count" } } },
            { id: "count", kind: "function", implementationRef: "count", transitions: { kind: "always", next: { to: "complete" } } },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    const records = await harness.runUntilIdle();

    const emissions = await harness.emissionsOf(handle.executionId);
    assert.equal(emissions.length, 1);
    assert.equal(emissions[0]?.body.kind === "text" ? emissions[0].body.text : null, "I found some evidence");

    const emitting = records.find((record) => record.emissionIds.length > 0)!;
    assert.equal(emitting.lifecycleAfter, "READY", "the Workflow stayed alive and moved on to Stage B");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });

  test("an LLM Stage runs through logical model resolution, never a provider named in the definition", async () => {
    const resolver = new StaticModelResolver({
      primary: { provider: "scripted", model: "scripted-small", portableFeatures: portableModelFeatures() },
    });
    const provider = new ScriptedModelProvider({
      id: "scripted",
      steps: [{ output: { text: "a summary of the document" } }],
    });
    const { harness, definitions, trace } = createWorkflowTestHarness({
      models: modelAccess(resolver, [provider]),
    });

    const ref = await definitions.save(
      defineWorkflow({
        id: "one-call",
        spec: {
          entryStage: "summarize",
          stages: [
            {
              id: "summarize",
              kind: "llm",
              model: { logicalRef: "primary", requirements: { text: true } },
              system: "Summarize.",
              prompt: "Summarize this: {{input}}",
              transitions: { kind: "always", next: { to: "complete" } },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal(provider.invocationCount, 1, "one predetermined phase is one model call");
    assert.deepEqual(resolver.requests.map((request) => request.logicalRef), ["primary"]);
    assert.deepEqual(trace.deployments(), ["scripted/scripted-small"]);

    // Model inference is local computation. It is not journaled as an Effect and creates no
    // pending operation.
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), []);
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), []);

    const state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress);
    assert.equal(state?.provisionalResult, "a summary of the document");
  });
});
