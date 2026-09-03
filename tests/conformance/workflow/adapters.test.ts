/**
 * Adapters transform boundaries. They do not own topology and they cannot reach the world.
 *
 * ```text
 * Stage input -> input Adapter(s) -> Stage computation -> output Adapter(s) -> result / transition
 * ```
 *
 * The prohibitions are enforced by API shape rather than by convention, and that is what these cases
 * check. An `AdapterContext` has no Effect proposer, no capability handle, and no memory writer, so
 * there is nothing an Adapter could call. An `AdapterResult` has no `nextStage`, so there is nothing
 * it could return that redirects the Workflow - a rejection is data, and where a rejection *leads* is
 * predefined Workflow policy.
 *
 * An LLM Adapter is one bounded inference with no callables exposed. A provider that returns a
 * capability call at that boundary is returning something nobody asked for, and the provider
 * boundary refuses it before it can become anything.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineWorkflow } from "@arrokothi/core/execution";
import type { AdapterContext, AdapterResult } from "@arrokothi/core/ports";
import {
  ScriptedModelProvider,
  StaticModelResolver,
  createAdapterRegistry,
  createFunctionStageRegistry,
  createLocalResourceEnvironment,
  createScriptedCapabilityExecutor,
  createAllowListAuthorizer,
  portableModelFeatures,
} from "@arrokothi/core/reference";
import { createWorkflowTestHarness, modelAccess } from "@arrokothi/core/testing";

const seenContexts: AdapterContext[] = [];

const adapters = createAdapterRegistry({
  trim: (context) => {
    seenContexts.push(context);
    return { kind: "transform", value: (context.value ?? "").trim() };
  },
  shout: (context) => {
    seenContexts.push(context);
    return { kind: "transform", value: `${(context.value ?? "").toUpperCase()}!` };
  },
  pass: (context) => {
    seenContexts.push(context);
    return { kind: "pass" };
  },
  refuse: (context) => {
    seenContexts.push(context);
    return { kind: "reject", reason: `"${context.value}" is not acceptable` };
  },
  // A deliberately bad implementation: an Adapter that tries to own topology.
  steer: () => ({ kind: "transform", value: "x", nextStage: "somewhere-else" } as unknown as AdapterResult),
});

const functions = createFunctionStageRegistry({
  echo: (context) => ({ status: "completed", result: context.input }),
  greet: () => ({ status: "completed", result: "  hello  " }),
});

describe("Adapters", () => {
  test("input and output Function Adapters transform the value around the Stage body", async () => {
    seenContexts.length = 0;
    const { harness, definitions } = createWorkflowTestHarness({ functions, adapters });
    const ref = await definitions.save(
      defineWorkflow({
        id: "adapted",
        terminalResult: { schemaId: "text", schemaVersion: 1, schema: { kind: "string" } },
        spec: {
          entryStage: "greet",
          stages: [
            {
              id: "greet",
              kind: "function",
              implementationRef: "greet",
              outputAdapters: [{ kind: "function", implementationRef: "trim" }, { kind: "function", implementationRef: "shout" }],
              transitions: { kind: "always", next: { to: "stage", stage: "echo" } },
            },
            {
              id: "echo",
              kind: "function",
              implementationRef: "echo",
              inputAdapters: [{ kind: "function", implementationRef: "pass" }],
              transitions: { kind: "always", next: { to: "complete", terminal: { kind: "value", value: "done" } } },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(
      seenContexts.map((context) => `${context.stageId}:${context.position}:${JSON.stringify(context.value)}`),
      ['greet:output:"  hello  "', 'greet:output:"hello"', 'echo:input:"HELLO!"'],
      "Adapters run in declaration order and settle before the Stage boundary they guard",
    );
  });

  test("an AdapterContext has no way to request an Effect, use a capability, or write memory", async () => {
    seenContexts.length = 0;
    const { harness, definitions } = createWorkflowTestHarness({
      functions,
      adapters,
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "anything" }] }),
      capabilities: createScriptedCapabilityExecutor({ fallback: () => ({ status: "success", observation: null }) }),
      resources: createLocalResourceEnvironment([]),
    });
    const ref = await definitions.save(
      defineWorkflow({
        id: "adapter-shape",
        spec: {
          entryStage: "greet",
          stages: [
            {
              id: "greet",
              kind: "function",
              implementationRef: "greet",
              outputAdapters: [{ kind: "function", implementationRef: "pass" }],
              transitions: { kind: "always", next: { to: "complete" } },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = seenContexts[0]!;
    assert.deepEqual(
      Object.keys(context).sort(),
      ["config", "position", "resources", "stageId", "value", "visit"],
      "an Adapter receives a value, its authored config, read-only resource views, and where it is - nothing else",
    );
    for (const forbidden of [
      "requestEffect",
      "proposeEffect",
      "effects",
      "useCapability",
      "capabilities",
      "writeMemory",
      "memory",
      "spawn",
      "call",
      "send",
      "settleEffect",
      "harness",
      "store",
    ]) {
      assert.equal(forbidden in (context as unknown as Record<string, unknown>), false, `an Adapter must not receive "${forbidden}"`);
    }
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), [], "no Adapter caused an Effect");
  });

  test("an Adapter that tries to choose the next Stage is refused", async () => {
    const { harness, definitions } = createWorkflowTestHarness({ functions, adapters });
    const ref = await definitions.save(
      defineWorkflow({
        id: "adapter-topology",
        spec: {
          entryStage: "greet",
          stages: [
            {
              id: "greet",
              kind: "function",
              implementationRef: "greet",
              outputAdapters: [{ kind: "function", implementationRef: "steer" }],
              transitions: { kind: "always", next: { to: "complete" } },
            },
            { id: "somewhere-else", kind: "function", implementationRef: "echo", transitions: { kind: "always", next: { to: "complete" } } },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "invalid_adapter_result");
    assert.match(context!.failure!.message, /does not choose the next Stage/);
  });

  test("an Adapter rejection is deterministic: it fails by default, or takes a predefined path", async () => {
    const failing = createWorkflowTestHarness({ functions, adapters });
    const failingRef = await failing.definitions.save(
      defineWorkflow({
        id: "reject-default",
        spec: {
          entryStage: "greet",
          stages: [
            {
              id: "greet",
              kind: "function",
              implementationRef: "greet",
              outputAdapters: [{ kind: "function", implementationRef: "refuse" }],
              transitions: { kind: "always", next: { to: "complete" } },
            },
          ],
        },
      }),
    );
    const rejected = await failing.harness.createExecution({ definition: failingRef });
    await failing.harness.runUntilIdle();
    const failedContext = await failing.harness.inspect(rejected.executionId);
    assert.equal(failedContext?.lifecycle, "FAILED");
    assert.equal(failedContext?.failure?.code, "adapter_rejected");

    const routed = createWorkflowTestHarness({ functions, adapters });
    const routedRef = await routed.definitions.save(
      defineWorkflow({
        id: "reject-routed",
        spec: {
          entryStage: "greet",
          stages: [
            {
              id: "greet",
              kind: "function",
              implementationRef: "greet",
              outputAdapters: [{ kind: "function", implementationRef: "refuse" }],
              // Predefined Workflow policy decides where a rejection goes. The Adapter did not.
              onAdapterReject: { to: "stage", stage: "handle-rejection" },
              transitions: { kind: "always", next: { to: "complete" } },
            },
            {
              id: "handle-rejection",
              kind: "function",
              implementationRef: "echo",
              transitions: { kind: "always", next: { to: "complete" } },
            },
          ],
        },
      }),
    );
    const handled = await routed.harness.createExecution({ definition: routedRef });
    await routed.harness.runUntilIdle();
    assert.equal((await routed.harness.inspect(handled.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(routed.trace.transitions.map((entry) => `${entry.from}->${entry.to}`), [
      "greet->handle-rejection",
      "handle-rejection->complete",
    ]);
  });

  test("an LLM Adapter performs exactly one bounded inference", async () => {
    const provider = new ScriptedModelProvider({
      id: "scripted",
      steps: [{ output: { text: "normalized value" } }, { output: { text: "should never be reached" } }],
    });
    const { harness, definitions, trace } = createWorkflowTestHarness({
      functions,
      models: modelAccess(
        new StaticModelResolver({ tidy: { provider: "scripted", model: "tidy-1", portableFeatures: portableModelFeatures() } }),
        [provider],
      ),
    });
    const ref = await definitions.save(
      defineWorkflow({
        id: "llm-adapter",
        spec: {
          entryStage: "greet",
          stages: [
            {
              id: "greet",
              kind: "function",
              implementationRef: "greet",
              outputAdapters: [
                {
                  kind: "llm",
                  model: { logicalRef: "tidy", requirements: { text: true } },
                  system: "Normalize the value.",
                  prompt: "Normalize: {{value}}",
                },
              ],
              transitions: { kind: "always", next: { to: "complete" } },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal(provider.invocationCount, 1, "one bounded inference, not a loop");
    assert.deepEqual(trace.modelInvocations.map((invocation) => invocation.purpose), ["adapter"]);
    // The Adapter's request exposed no callables at all.
    assert.equal(provider.requests[0]?.capabilities, undefined);
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), []);
  });

  test("a capability call returned to an LLM Adapter is not dispatchable", async () => {
    const provider = new ScriptedModelProvider({
      id: "scripted",
      steps: [
        {
          // Nobody asked for this. The provider boundary refuses it before it can become an Effect.
          unsafeResponse: {
            output: { capabilityCalls: [{ capability: "exfiltrate", input: { to: "attacker.test" } }] },
            metadata: { provider: "scripted", model: "tidy-1" },
          },
        },
      ],
    });
    const { harness, definitions } = createWorkflowTestHarness({
      functions,
      models: modelAccess(
        new StaticModelResolver({ tidy: { provider: "scripted", model: "tidy-1", portableFeatures: portableModelFeatures() } }),
        [provider],
      ),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "exfiltrate" }] }),
      capabilities: createScriptedCapabilityExecutor({ fallback: () => ({ status: "success", observation: "sent" }) }),
    });
    const ref = await definitions.save(
      defineWorkflow({
        id: "adapter-capability-call",
        spec: {
          entryStage: "greet",
          stages: [
            {
              id: "greet",
              kind: "function",
              implementationRef: "greet",
              outputAdapters: [
                {
                  kind: "llm",
                  model: { logicalRef: "tidy", requirements: { text: true } },
                  system: "Normalize the value.",
                  prompt: "Normalize: {{value}}",
                },
              ],
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
    assert.equal(context?.failure?.code, "adapter_error");
    assert.match(context!.failure!.message, /capability call that was not requested/);
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), [], "nothing was journaled, let alone dispatched");
  });
});
