/**
 * Provider selection is deployment configuration, not Workflow authoring.
 *
 * ```text
 * LLM Stage A -> predefined transition -> LLM Stage B -> complete
 * ```
 *
 * One unchanged definition is run under two different resolver mappings. Topology, Stage semantics,
 * Stage results, and the definition digest must all be identical; only the provider and model
 * metadata may differ, and that difference must be *observable* somewhere other than Workflow
 * control state.
 *
 * Two predetermined model calls also do not make this an Agent. The number of inferences has never
 * been the distinction - who owns the continuation space is.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineWorkflow, definitionIntegrity, readWorkflowControlState } from "@arrokothi/core/execution";
import type { WorkflowDefinition, WorkflowSpecInput } from "@arrokothi/core/execution";
import { ModelResolutionError } from "@arrokothi/core/ports";
import {
  ScriptedModelProvider,
  StaticModelResolver,
  portableModelFeatures,
} from "@arrokothi/core/reference";
import { createWorkflowTestHarness, modelAccess } from "@arrokothi/core/testing";

/** Draft, then review. Authored once; never edited between deployments. */
const twoLLMWorkflow: WorkflowSpecInput = {
  entryStage: "draft",
  stages: [
    {
      id: "draft",
      kind: "llm",
      model: { logicalRef: "writer", requirements: { text: true } },
      system: "Write a one-line draft.",
      prompt: "Topic: {{input}}",
      transitions: { kind: "always", next: { to: "stage", stage: "review" } },
    },
    {
      id: "review",
      kind: "llm",
      model: { logicalRef: "reviewer", requirements: { text: true } },
      system: "Review the draft.",
      prompt: "Draft: {{input}}",
      transitions: { kind: "always", next: { to: "complete" } },
    },
  ],
};

const definition: WorkflowDefinition = defineWorkflow({ id: "draft-review", spec: twoLLMWorkflow });

function scripted(id: string) {
  return new ScriptedModelProvider({
    id,
    steps: [{ output: { text: "a draft line" } }, { output: { text: "approved" } }],
  });
}

interface RunOutcome {
  readonly lifecycle: string;
  readonly stageSequence: readonly string[];
  readonly stageResult: string | null;
  readonly deployments: readonly string[];
  readonly progress: unknown;
}

async function runUnder(mapping: Record<string, { provider: string; model: string }>, providerId: string): Promise<RunOutcome> {
  const resolver = new StaticModelResolver(
    Object.fromEntries(
      Object.entries(mapping).map(([logicalRef, target]) => [
        logicalRef,
        { provider: target.provider, model: target.model, portableFeatures: portableModelFeatures() },
      ]),
    ),
  );
  const { harness, definitions, trace } = createWorkflowTestHarness({
    models: modelAccess(resolver, [scripted(providerId)]),
  });
  const ref = await definitions.save(definition);
  const handle = await harness.createExecution({ definition: ref });
  await harness.runUntilIdle();

  const context = await harness.inspect(handle.executionId);
  const state = readWorkflowControlState(context!.control.progress)!;
  return {
    lifecycle: context!.lifecycle,
    stageSequence: trace.transitions.map((entry) => `${entry.from}->${entry.to}`),
    stageResult: state.provisionalResult,
    deployments: trace.deployments(),
    progress: JSON.parse(JSON.stringify(state)) as unknown,
  };
}

describe("provider portability", () => {
  test("the same Workflow definition runs under two resolver mappings", async () => {
    const first = await runUnder({ writer: { provider: "alpha", model: "alpha-fast" }, reviewer: { provider: "alpha", model: "alpha-fast" } }, "alpha");
    const second = await runUnder({ writer: { provider: "beta", model: "beta-large" }, reviewer: { provider: "beta", model: "beta-large" } }, "beta");

    assert.equal(first.lifecycle, "COMPLETED");
    assert.equal(second.lifecycle, "COMPLETED");
    assert.deepEqual(first.stageSequence, ["draft->review", "review->complete"]);
    assert.deepEqual(second.stageSequence, first.stageSequence, "topology is unchanged");
    assert.equal(second.stageResult, first.stageResult, "Stage semantics are unchanged");
    assert.deepEqual(second.progress, first.progress, "Workflow control state is byte-identical");

    // Only the deployment differs, and it differs where it belongs: in observation, not in state.
    assert.deepEqual(first.deployments, ["alpha/alpha-fast", "alpha/alpha-fast"]);
    assert.deepEqual(second.deployments, ["beta/beta-large", "beta/beta-large"]);
  });

  test("the definition and its digest are untouched by deployment configuration", async () => {
    const before = definitionIntegrity(definition);
    await runUnder({ writer: { provider: "alpha", model: "alpha-fast" }, reviewer: { provider: "alpha", model: "alpha-fast" } }, "alpha");
    await runUnder({ writer: { provider: "beta", model: "beta-large" }, reviewer: { provider: "beta", model: "beta-large" } }, "beta");
    assert.equal(definitionIntegrity(definition), before);
    assert.equal(JSON.stringify(definition).includes("alpha"), false, "no provider identity is anywhere in the definition");
    assert.equal(JSON.stringify(definition).includes("beta"), false);
  });

  test("one logical reference per Stage may resolve to different deployments", async () => {
    const outcome = await runUnder(
      { writer: { provider: "alpha", model: "alpha-fast" }, reviewer: { provider: "alpha", model: "alpha-thorough" } },
      "alpha",
    );
    assert.deepEqual(outcome.deployments, ["alpha/alpha-fast", "alpha/alpha-thorough"]);
    assert.deepEqual(outcome.stageSequence, ["draft->review", "review->complete"]);
  });

  test("a required feature the deployment cannot supply fails before the provider is invoked", async () => {
    const provider = new ScriptedModelProvider({ id: "alpha", steps: [{ output: { text: "should never run" } }] });
    const { harness, definitions } = createWorkflowTestHarness({
      models: modelAccess(
        new StaticModelResolver({
          // Text only: this deployment cannot do structured output.
          picky: { provider: "alpha", model: "alpha-fast", portableFeatures: portableModelFeatures() },
        }),
        [provider],
      ),
    });
    const ref = await definitions.save(
      defineWorkflow({
        id: "needs-structured",
        spec: {
          entryStage: "classify",
          stages: [
            {
              id: "classify",
              kind: "llm",
              model: { logicalRef: "picky", requirements: { text: true, structuredOutput: "required" } },
              system: "Classify.",
              prompt: "{{input}}",
              transitions: { kind: "labeled", cases: [{ label: "done", next: { to: "complete" } }] },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "stage_error");
    assert.match(context!.failure!.message, /does not support required feature structuredOutput/);
    assert.equal(provider.invocationCount, 0, "resolution failed first; there is no silent prompt fallback");
    assert.ok(new ModelResolutionError("required_feature_unsupported", "x").code === "required_feature_unsupported");
  });

  test("provider diagnostics and raw payloads never enter Workflow control state", async () => {
    const provider = new ScriptedModelProvider({
      id: "alpha",
      steps: [
        {
          output: { text: "a draft line" },
          metadata: { usage: { inputTokens: 11, outputTokens: 3 }, finishReason: "STOP" },
          diagnostics: { provider: { rawCandidates: [{ safetyRatings: ["NEGLIGIBLE"] }], requestId: "req-9" } },
        },
        { output: { text: "approved" } },
      ],
    });
    const { harness, definitions, trace } = createWorkflowTestHarness({
      models: modelAccess(
        new StaticModelResolver({
          writer: { provider: "alpha", model: "alpha-fast", portableFeatures: portableModelFeatures() },
          reviewer: { provider: "alpha", model: "alpha-fast", portableFeatures: portableModelFeatures() },
        }),
        [provider],
      ),
    });
    const ref = await definitions.save(definition);
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const serialized = JSON.stringify(readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress));
    for (const leak of ["rawCandidates", "safetyRatings", "req-9", "alpha-fast", "alpha", "STOP"]) {
      assert.equal(serialized.includes(leak), false, `provider detail "${leak}" must not enter Workflow control state`);
    }
    // It is observable, just not as semantic progress.
    assert.equal(trace.modelInvocations[0]?.finishReason, "STOP");
    assert.deepEqual(trace.deployments(), ["alpha/alpha-fast", "alpha/alpha-fast"]);
  });
});
