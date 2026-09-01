/**
 * Slow Workflow model work: same semantics, different scheduling.
 *
 * A model call is local computation that may take tens of seconds. Holding a scheduler claim for
 * that long stops every other Execution for no semantic reason, so the Activation yields and the
 * Execution waits on a `ControllerResumption` instead.
 *
 * ```text
 * A1  build the request, start the provider call, run out of inline budget
 *     persist semantic progress, report await_resumption
 *       -> WAITING on the resumption; no Event, no Effect, no PendingOperation
 * ...  another Execution runs
 * ...  the provider answers -> READY
 * A2  reconstruct the same call, receive the stored response, carry on
 * ```
 *
 * Each case here fixes one way that could go wrong: a different Stage result, a second dispatch, a
 * re-run Adapter, a re-run Stage body, a duplicated emission, a fabricated Event, or an Execution
 * that never released the scheduler at all.
 *
 * The two runs of every equivalence case use the *same* scripted semantics. Only the provider's
 * timing differs: `ScriptedModelProvider` answers within the Activation's inline budget, and
 * `createDeferredModelProvider` answers only when the test says so.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineWorkflow, readWorkflowControlState } from "@agent-sdk/core/execution";
import type { ExecutionContext, WorkflowSpecInput } from "@agent-sdk/core/execution";
import {
  createAdapterRegistry,
  createDeferredModelProvider,
  createFunctionStageRegistry,
  ScriptedModelProvider,
  StaticModelResolver,
  portableModelFeatures,
} from "@agent-sdk/core/reference";
import type { AdapterHandler, FunctionStageHandler } from "@agent-sdk/core/reference";
import { ModelInvocationError } from "@agent-sdk/core/ports";
import { createWorkflowTestHarness, modelAccess } from "@agent-sdk/core/testing";

const resolver = () =>
  new StaticModelResolver({
    writer: { provider: "alpha", model: "alpha-fast", portableFeatures: portableModelFeatures() },
  });

/** What a run produced, at the level of Workflow semantics rather than scheduling. */
interface RunOutcome {
  readonly lifecycle: string;
  readonly failure: string | null;
  readonly stageSequence: readonly string[];
  readonly stageResult: string | null;
  readonly deployments: readonly string[];
  readonly modelMessages: readonly unknown[];
  readonly terminal: unknown;
  readonly emissions: readonly unknown[];
  readonly events: readonly string[];
  readonly effectJournal: readonly unknown[];
  readonly pendingOperations: number;
  readonly adaptersRun: readonly string[];
  readonly bodiesRun: readonly string[];
  readonly providerInvocations: number;
  /** Scheduling detail, allowed to differ. */
  readonly activations: number;
  readonly resumptions: number;
}

interface RunOptions {
  readonly spec: WorkflowSpecInput;
  readonly id: string;
  /** Outputs the provider produces, in call order. */
  readonly outputs: readonly { readonly text: string }[];
  /** Fail the Nth (0-based) provider call instead of answering it. */
  readonly rejectAt?: number;
  readonly functions?: Record<string, FunctionStageHandler>;
  readonly adapters?: Record<string, AdapterHandler>;
}

/**
 * Runs one definition to a terminal state, either fast or slow.
 *
 * The slow run drives the provider explicitly - answer, drain, run - so nothing here depends on a
 * timer, a sleep, or how loaded the machine is.
 */
async function run(options: RunOptions, slow: boolean): Promise<RunOutcome> {
  const adaptersRun: string[] = [];
  const bodiesRun: string[] = [];
  const wrappedAdapters = Object.fromEntries(
    Object.entries(options.adapters ?? {}).map(([ref, handler]) => [
      ref,
      ((context) => {
        adaptersRun.push(`${context.stageId}#${context.visit}/${context.position}/${String(context.config["tag"] ?? ref)}`);
        return handler(context);
      }) satisfies AdapterHandler,
    ]),
  );
  const wrappedFunctions = Object.fromEntries(
    Object.entries(options.functions ?? {}).map(([ref, handler]) => [
      ref,
      ((context) => {
        bodiesRun.push(`${context.stageId}#${context.visit}`);
        return handler(context);
      }) satisfies FunctionStageHandler,
    ]),
  );

  const deferred = slow ? createDeferredModelProvider("alpha") : null;
  const scripted = slow
    ? null
    : new ScriptedModelProvider({
        id: "alpha",
        steps: options.outputs.map((output, index) =>
          index === options.rejectAt ? { error: providerFailure() } : { output },
        ),
      });

  const { harness, definitions, store, trace } = createWorkflowTestHarness({
    models: modelAccess(resolver(), [deferred ?? scripted!]),
    functions: createFunctionStageRegistry(wrappedFunctions),
    adapters: createAdapterRegistry(wrappedAdapters),
  });
  const ref = await definitions.save(defineWorkflow({ id: `${options.id}-${slow ? "slow" : "fast"}`, spec: options.spec }));
  const handle = await harness.createExecution({ definition: ref });

  let call = 0;
  for (let i = 0; i < 12; i++) {
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    if (!context || context.lifecycle === "COMPLETED" || context.lifecycle === "FAILED") break;
    if (deferred && deferred.outstanding.length > 0) {
      if (call === options.rejectAt) deferred.reject(providerFailure());
      else deferred.settle({ text: options.outputs[call]?.text ?? "" });
      call += 1;
      await harness.drainResumptions();
      continue;
    }
    break;
  }

  const context = (await harness.inspect(handle.executionId)) as ExecutionContext;
  const state = readWorkflowControlState(context.control.progress);
  const mailbox = await store.peekMailbox(context.mailbox.mailboxId);
  const transitions = await harness.transitionsOf(handle.executionId);

  return {
    lifecycle: context.lifecycle,
    failure: context.failure ? `${context.failure.code}: ${context.failure.message}` : null,
    stageSequence: trace.transitions.map((entry) => `${entry.from}->${entry.to}`),
    stageResult: state?.provisionalResult ?? null,
    deployments: trace.deployments(),
    modelMessages: (deferred ?? scripted!).requests.map((request) => ({
      system: request.system,
      messages: request.messages,
      purpose: request.purpose,
      capabilities: request.capabilities ?? null,
      structuredOutput: request.structuredOutput ?? null,
    })),
    terminal: context.terminalResult?.value ?? null,
    emissions: (await harness.emissionsOf(handle.executionId)).map((emission) => emission.body),
    events: mailbox.map((event) => event.kind),
    effectJournal: await harness.effectJournalOf(handle.executionId),
    pendingOperations: (await harness.pendingOperationsOf(handle.executionId)).length,
    adaptersRun,
    bodiesRun,
    providerInvocations: (deferred ?? scripted!).invocationCount,
    activations: transitions.filter((entry) => entry.to === "RUNNING").length,
    resumptions: (await harness.controllerResumptionsOf(handle.executionId)).length,
  };
}

/** The same provider failure on both paths, so only its timing differs. */
function providerFailure(): ModelInvocationError {
  return new ModelInvocationError("transport", "upstream model deployment is unavailable", {
    provider: "alpha",
    model: "alpha-fast",
  });
}

/** Everything two runs of one definition must agree on. Scheduling is deliberately excluded. */
function assertSameSemantics(fast: RunOutcome, slow: RunOutcome): void {
  assert.equal(slow.lifecycle, fast.lifecycle, "same lifecycle outcome");
  assert.equal(slow.failure, fast.failure, "same failure, if any");
  assert.deepEqual(slow.stageSequence, fast.stageSequence, "same topology walked");
  assert.equal(slow.stageResult, fast.stageResult, "same Stage result");
  assert.deepEqual(slow.deployments, fast.deployments, "same resolved provider/model");
  assert.deepEqual(slow.modelMessages, fast.modelMessages, "same model requests, message for message");
  assert.deepEqual(slow.terminal, fast.terminal, "same terminal result");
  assert.deepEqual(slow.emissions, fast.emissions, "same emissions, and no duplicates");
  assert.deepEqual(slow.events, fast.events, "same Events - which is to say, none invented");
  assert.deepEqual(slow.effectJournal, fast.effectJournal, "same Effect journal");
  assert.equal(slow.pendingOperations, fast.pendingOperations, "same pending operations");
  assert.deepEqual(slow.adaptersRun, fast.adaptersRun, "same Adapters run, the same number of times");
  assert.deepEqual(slow.bodiesRun, fast.bodiesRun, "same Stage bodies run, the same number of times");
  assert.equal(slow.providerInvocations, fast.providerInvocations, "the same number of provider calls");
}

// -- definitions ------------------------------------------------------------

const llmStageSpec: WorkflowSpecInput = {
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
      model: { logicalRef: "writer", requirements: { text: true } },
      system: "Review the draft.",
      prompt: "Draft: {{input}}",
      transitions: { kind: "always", next: { to: "complete" } },
    },
  ],
};

const tag: AdapterHandler = (context) => ({
  kind: "transform",
  value: `${context.value}+${String(context.config["tag"])}`,
});

const body: FunctionStageHandler = (context) => ({
  status: "completed",
  result: `body(${context.stageId})`,
  emissions: [{ body: { kind: "text", text: `emitted-by-${context.stageId}` } }],
});

const outputAdapterSpec: WorkflowSpecInput = {
  entryStage: "compute",
  stages: [
    {
      id: "compute",
      kind: "function",
      implementationRef: "body",
      outputAdapters: [
        { kind: "function", implementationRef: "tag", config: { tag: "before" } },
        { kind: "llm", model: { logicalRef: "writer", requirements: { text: true } }, system: "Rewrite.", prompt: "Value: {{value}}" },
        { kind: "function", implementationRef: "tag", config: { tag: "after" } },
      ],
      transitions: { kind: "always", next: { to: "complete" } },
    },
  ],
};

const inputAdapterSpec: WorkflowSpecInput = {
  entryStage: "first",
  stages: [
    {
      id: "first",
      kind: "function",
      implementationRef: "body",
      transitions: { kind: "always", next: { to: "stage", stage: "second" } },
    },
    {
      id: "second",
      kind: "function",
      implementationRef: "body",
      inputAdapters: [
        { kind: "function", implementationRef: "tag", config: { tag: "before" } },
        { kind: "llm", model: { logicalRef: "writer", requirements: { text: true } }, system: "Rewrite.", prompt: "Value: {{value}}" },
        { kind: "function", implementationRef: "tag", config: { tag: "after" } },
      ],
      transitions: { kind: "always", next: { to: "complete" } },
    },
  ],
};

describe("Workflow model work resumes without changing semantics", () => {
  test("an LLM Stage produces the same result fast or slow", async () => {
    const options: RunOptions = {
      spec: llmStageSpec,
      id: "llm-stage",
      outputs: [{ text: "a draft line" }, { text: "approved" }],
    };
    const fast = await run(options, false);
    const slow = await run(options, true);

    assert.equal(fast.lifecycle, "COMPLETED");
    assertSameSemantics(fast, slow);
    assert.deepEqual(fast.stageSequence, ["draft->review", "review->complete"]);
    assert.equal(fast.providerInvocations, 2, "one call per Stage, and no more on either path");

    // The only permitted differences: scheduling, and the record the slow path leaves behind.
    assert.equal(fast.resumptions, 0, "work that settled inline needs no durable record");
    assert.equal(slow.resumptions, 2, "work that outlived its Activation leaves exactly one each");
    assert.ok(slow.activations > fast.activations, "the slow path took more Activations to do the same thing");
  });

  test("an output LLM Adapter produces the same result fast or slow", async () => {
    const options: RunOptions = {
      spec: outputAdapterSpec,
      id: "output-adapter",
      outputs: [{ text: "REWRITTEN" }],
      functions: { body },
      adapters: { tag },
    };
    const fast = await run(options, false);
    const slow = await run(options, true);

    assert.equal(fast.lifecycle, "COMPLETED");
    assertSameSemantics(fast, slow);
    assert.equal(fast.stageResult, "REWRITTEN+after", "the chain continued past the Adapter that suspended");
    assert.deepEqual(fast.adaptersRun, ["compute#1/output/before", "compute#1/output/after"]);
    assert.deepEqual(fast.bodiesRun, ["compute#1"], "the Stage body ran exactly once");
    assert.deepEqual(fast.emissions, [{ kind: "text", text: "emitted-by-compute" }]);
  });

  test("an input LLM Adapter produces the same result fast or slow", async () => {
    const options: RunOptions = {
      spec: inputAdapterSpec,
      id: "input-adapter",
      outputs: [{ text: "REWRITTEN" }],
      functions: { body },
      adapters: { tag },
    };
    const fast = await run(options, false);
    const slow = await run(options, true);

    assert.equal(fast.lifecycle, "COMPLETED");
    assertSameSemantics(fast, slow);
    assert.deepEqual(fast.adaptersRun, ["second#2/input/before", "second#2/input/after"]);
    assert.deepEqual(fast.bodiesRun, ["first#1", "second#2"], "each Stage body ran exactly once");
    assert.deepEqual(fast.stageSequence, ["first->second", "second->complete"]);
  });

  test("a provider rejection becomes the same Workflow failure, not a capability Event", async () => {
    const options: RunOptions = {
      spec: llmStageSpec,
      id: "provider-rejects",
      outputs: [{ text: "unused" }, { text: "unused" }],
      rejectAt: 0,
    };
    const fast = await run(options, false);
    const slow = await run(options, true);

    assert.equal(fast.lifecycle, "FAILED");
    assertSameSemantics(fast, slow);
    assert.match(fast.failure ?? "", /^stage_error: /, "a failed model call is a Stage failure");
    assert.match(fast.failure ?? "", /upstream model deployment is unavailable/);
    assert.deepEqual(slow.events, [], "no capability.failed, and no Event of any kind, was manufactured");
    assert.deepEqual(slow.effectJournal, []);
    assert.equal(slow.pendingOperations, 0);
    assert.equal(slow.resumptions, 1, "the failure is recorded on the resumption, and nowhere else");
  });
});

describe("a suspended model call releases the scheduler", () => {
  test("another Execution runs while the first waits for its provider", async () => {
    const provider = createDeferredModelProvider("alpha");
    const { harness, definitions, scheduler } = createWorkflowTestHarness({ models: modelAccess(resolver(), [provider]) });
    const ref = await definitions.save(defineWorkflow({ id: "shared", spec: llmStageSpec }));

    const a = await harness.createExecution({ definition: ref });
    const b = await harness.createExecution({ definition: ref });

    // One Activation each: A starts a provider call and yields; B gets a turn regardless.
    await harness.runOnce("worker-1");
    const waitingA = await harness.inspect(a.executionId);
    assert.equal(waitingA?.lifecycle, "WAITING", "A stopped occupying the scheduler mid-provider-call");
    assert.equal(waitingA?.waitingFor?.kind, "controller_resumption");
    assert.deepEqual(scheduler.activeClaims(), [], "and no claim spans the provider latency");
    assert.equal(provider.outstanding.length, 1, "A's call is genuinely still outstanding");

    const recordB = await harness.runOnce("worker-1");
    assert.equal(recordB?.executionId, b.executionId, "the second Execution was activated while the first waited");
    assert.equal(provider.outstanding.length, 2, "and started a provider call of its own");
    assert.equal((await harness.inspect(a.executionId))?.lifecycle, "WAITING", "A is still waiting, untouched by B");

    // Now the providers answer. Readiness comes from the resumption settling, not from any Event.
    provider.settleAll({ text: "answer" });
    await harness.drainResumptions();
    assert.equal((await harness.inspect(a.executionId))?.lifecycle, "READY");
    assert.equal((await harness.inspect(b.executionId))?.lifecycle, "READY");

    for (let i = 0; i < 8; i++) {
      await harness.runUntilIdle();
      if (provider.outstanding.length === 0) break;
      provider.settleAll({ text: "answer" });
      await harness.drainResumptions();
    }

    for (const handle of [a, b]) {
      const context = await harness.inspect(handle.executionId);
      assert.equal(context?.lifecycle, "COMPLETED", "both Executions finished");
      assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), []);
      assert.deepEqual(await harness.effectJournalOf(handle.executionId), []);
    }
  });

  test("resuming reconstructs the same call rather than dispatching a second one", async () => {
    const provider = createDeferredModelProvider("alpha");
    const { harness, definitions } = createWorkflowTestHarness({ models: modelAccess(resolver(), [provider]) });
    const ref = await definitions.save(defineWorkflow({ id: "once", spec: llmStageSpec }));
    const handle = await harness.createExecution({ definition: ref });

    await harness.runUntilIdle();
    assert.equal(provider.invocationCount, 1, "the first Stage asked its provider once");
    const firstRequest = JSON.parse(JSON.stringify(provider.requests[0])) as unknown;

    provider.settle({ text: "a draft line" });
    await harness.drainResumptions();
    await harness.runUntilIdle();

    // A2 rebuilt the same key from persisted coordinates and was handed the stored response, so the
    // second invocation belongs to the *second* Stage rather than to a redispatch of the first.
    assert.equal(provider.invocationCount, 2);
    assert.deepEqual(JSON.parse(JSON.stringify(provider.requests[0])) as unknown, firstRequest, "the first request was not repeated");
    assert.equal(provider.requests[1]!.purpose, "stage:review");

    const records = await harness.controllerResumptionsOf(handle.executionId);
    assert.deepEqual(
      records.map((record) => record.key),
      ["wf/draft#1/model/phase1", "wf/review#2/model/phase1"],
      "keys are derived from persisted Stage/visit/phase coordinates, so they are reconstructible",
    );
    assert.equal(records[0]!.state, "settled");
  });
});

describe("resuming a Stage boundary re-runs only what did not finish", () => {
  async function suspendedAt(spec: WorkflowSpecInput, id: string) {
    const adaptersRun: string[] = [];
    const bodiesRun: string[] = [];
    const provider = createDeferredModelProvider("alpha");
    const { harness, definitions } = createWorkflowTestHarness({
      models: modelAccess(resolver(), [provider]),
      functions: createFunctionStageRegistry({
        body: (context) => {
          bodiesRun.push(`${context.stageId}#${context.visit}`);
          return body(context);
        },
      }),
      adapters: createAdapterRegistry({
        tag: (context) => {
          adaptersRun.push(`${context.stageId}#${context.visit}/${context.position}/${String(context.config["tag"])}`);
          return tag(context);
        },
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id, spec }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    return { harness, handle, provider, adaptersRun, bodiesRun };
  }

  test("an output-Adapter suspension does not re-run the Stage body or duplicate its emissions", async () => {
    const rig = await suspendedAt(outputAdapterSpec, "output-boundary");
    const { harness, handle } = rig;

    const state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.deepEqual(state.boundary, {
      position: "output",
      adapterIndex: 1,
      value: "body(compute)+before",
      transitionLabel: null,
    });
    assert.deepEqual(rig.bodiesRun, ["compute#1"]);
    assert.deepEqual(rig.adaptersRun, ["compute#1/output/before"]);
    assert.deepEqual(
      (await harness.emissionsOf(handle.executionId)).map((emission) => emission.body),
      [{ kind: "text", text: "emitted-by-compute" }],
      "the body's emission was persisted by the Activation that produced it",
    );

    rig.provider.settle({ text: "REWRITTEN" });
    await harness.drainResumptions();
    await harness.runUntilIdle();

    assert.deepEqual(rig.bodiesRun, ["compute#1"], "the completed Stage body did not run again");
    assert.deepEqual(
      rig.adaptersRun,
      ["compute#1/output/before", "compute#1/output/after"],
      "the Adapter that already ran did not run again; the chain continued from where it stopped",
    );
    assert.deepEqual(
      (await harness.emissionsOf(handle.executionId)).map((emission) => emission.body),
      [{ kind: "text", text: "emitted-by-compute" }],
      "and its emission was not produced a second time",
    );
    const done = await harness.inspect(handle.executionId);
    assert.equal(done?.lifecycle, "COMPLETED");
    assert.equal(readWorkflowControlState(done!.control.progress)?.boundary, null, "the boundary is cleared once passed");
  });

  test("an input-Adapter suspension does not re-run the predecessor Stage or its transition", async () => {
    const rig = await suspendedAt(inputAdapterSpec, "input-boundary");
    const { harness, handle } = rig;

    const context = await harness.inspect(handle.executionId);
    const state = readWorkflowControlState(context!.control.progress)!;
    assert.equal(context?.lifecycle, "WAITING");
    assert.equal(state.currentStage, "second", "the target Stage is already installed");
    assert.equal(state.visit, 2, "with its new visit number");
    assert.equal(state.transitions, 1, "and the transition already counted as resolved");
    assert.deepEqual(state.boundary, {
      position: "input",
      adapterIndex: 1,
      value: "body(first)+before",
      transitionLabel: null,
    });
    assert.deepEqual(rig.bodiesRun, ["first#1"]);
    assert.deepEqual(rig.adaptersRun, ["second#2/input/before"]);

    rig.provider.settle({ text: "REWRITTEN" });
    await harness.drainResumptions();
    await harness.runUntilIdle();

    assert.deepEqual(
      rig.bodiesRun,
      ["first#1", "second#2"],
      "the predecessor Stage did not run again; only the target Stage's body ran after re-entry",
    );
    assert.deepEqual(
      rig.adaptersRun,
      ["second#2/input/before", "second#2/input/after"],
      "the input Adapter that already ran did not run again",
    );
    const done = await harness.inspect(handle.executionId);
    assert.equal(done?.lifecycle, "COMPLETED");
    assert.deepEqual(
      (await harness.emissionsOf(handle.executionId)).map((emission) => emission.body),
      [{ kind: "text", text: "emitted-by-first" }, { kind: "text", text: "emitted-by-second" }],
      "each Stage emitted exactly once",
    );
  });

  test("stored resumption records carry only serializable data", async () => {
    const rig = await suspendedAt(outputAdapterSpec, "record-data");
    rig.provider.settle({ text: "REWRITTEN" });
    await rig.harness.drainResumptions();
    await rig.harness.runUntilIdle();

    const records = await rig.harness.controllerResumptionsOf(rig.handle.executionId);
    assert.equal(records.length, 1);
    assert.equal(records[0]!.key, "wf/compute#1/adapter/output/1");
    assert.deepEqual(JSON.parse(JSON.stringify(records)) as unknown, records, "a JSON round trip changes nothing");
    // The provider response is stored as data, not as a handle to the call that produced it.
    const value = records[0]!.value as { response?: { output?: { text?: string } } };
    assert.equal(value.response?.output?.text, "REWRITTEN");
  });
});
