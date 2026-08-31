/**
 * The canonical bounded RAG scenario, and why it is still a Workflow.
 *
 * ```text
 * LLM Stage
 *     -> bounded model output requests retrieval
 *     -> live retrieval Effect
 *     -> WAIT / collect result
 *     -> bounded model continuation
 *     -> StageResult
 *     -> predefined transition
 * ```
 *
 * The model participates - it decides *whether* to retrieve and with what query - and the construct
 * remains Workflow semantics because the continuation space is program-defined. The Stage declares
 * how many predetermined phases it may use and which operations it exposes, and the final phase is
 * structurally denied any callable, so it cannot ask for more work no matter what it wants.
 *
 * A `ModelCapabilityCall` is output data. It dispatches nothing. The Stage validates it against its
 * predefined exposed set, maps the model-facing name to a real capability/operation, and returns an
 * Effect *proposal*; the Harness decides everything after that.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineWorkflow, readWorkflowControlState } from "@agent-sdk/core/execution";
import type { WorkflowSpecInput } from "@agent-sdk/core/execution";
import {
  ScriptedModelProvider,
  StaticModelResolver,
  createAllowListAuthorizer,
  createDeferredCapabilityExecutor,
  createFunctionStageRegistry,
  portableModelFeatures,
} from "@agent-sdk/core/reference";
import { createWorkflowTestHarness, modelAccess } from "@agent-sdk/core/testing";
import {
  LOCAL_RETRIEVAL_CAPABILITY,
  LOCAL_RETRIEVAL_OPERATIONS,
  createLocalRetrievalExecutor,
} from "@agent-sdk/retrieval-local";

const PET_POLICY = {
  id: "pet-policies",
  title: "Pet policies",
  text: "Harbor View allows two cats or one dog under 40 pounds. Cedar Court does not allow pets of any kind.",
};

/** One definition, authored once, so neither run below can quietly differ from the other. */
const ragWorkflow: WorkflowSpecInput = {
  entryStage: "answer",
  stages: [
    {
      id: "answer",
      kind: "llm",
      model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } },
      system: "Answer using the pet policy corpus. Retrieve before answering.",
      prompt: "Question: {{input}}",
      // Two predetermined phases: one that may retrieve, and a final one that cannot.
      maxModelPhases: 2,
      callables: [
        {
          name: "lookup_policy",
          description: "Search the pet policy corpus.",
          input: { kind: "object", fields: { query: { required: true, schema: { kind: "string" } } } },
          capability: LOCAL_RETRIEVAL_CAPABILITY,
          operation: LOCAL_RETRIEVAL_OPERATIONS.search,
          resources: ["pet-policies"],
        },
      ],
      transitions: { kind: "always", next: { to: "stage", stage: "record" } },
    },
    { id: "record", kind: "function", implementationRef: "echo", transitions: { kind: "always", next: { to: "complete" } } },
  ],
};

const functions = createFunctionStageRegistry({ echo: (context) => ({ status: "completed", result: context.input }) });

const resolver = () =>
  new StaticModelResolver({
    primary: {
      provider: "scripted",
      model: "scripted-rag",
      portableFeatures: portableModelFeatures({ capabilityCalls: true }),
    },
  });

const script = () =>
  new ScriptedModelProvider({
    id: "scripted",
    steps: [
      // Phase 1: the model asks, using the Stage's predefined model-facing name.
      { output: { capabilityCalls: [{ id: "call-1", capability: "lookup_policy", input: { query: "dog weight limit" } }] } },
      // Phase 2: the final phase, which is never shown a callable.
      { output: { text: "One dog under 40 pounds is allowed at Harbor View." } },
    ],
  });

const policy = () =>
  createAllowListAuthorizer({
    grants: [
      {
        capability: LOCAL_RETRIEVAL_CAPABILITY,
        operations: [LOCAL_RETRIEVAL_OPERATIONS.search],
        resources: [{ bindingId: "pet-policies", mode: "read" }],
      },
    ],
  });

describe("LLM Stage to live RAG", () => {
  test("the Effect completing inline yields the Stage result and the predefined transition", async () => {
    const provider = script();
    const { harness, definitions, trace } = createWorkflowTestHarness({
      functions,
      models: modelAccess(resolver(), [provider]),
      authorizer: policy(),
      capabilities: createLocalRetrievalExecutor({ documents: [PET_POLICY] }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "bounded-rag", spec: ragWorkflow }));
    const handle = await harness.createExecution({ definition: ref });
    const records = await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.equal(
      readWorkflowControlState(context!.control.progress)!.provisionalResult,
      "One dog under 40 pounds is allowed at Harbor View.",
    );
    assert.equal(provider.invocationCount, 2, "exactly the declared number of predetermined phases");
    assert.equal(records.some((record) => record.lifecycleAfter === "WAITING"), false);

    // The callable was exposed on phase 1 and structurally absent on the final phase.
    assert.deepEqual(provider.requests[0]?.capabilities?.map((spec) => spec.name), ["lookup_policy"]);
    assert.equal(provider.requests[1]?.capabilities, undefined, "the final phase cannot ask for more work");

    // The model named a model-facing label; the definition's mapping decided what it meant.
    const journal = await harness.effectJournalOf(handle.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "authorized", "dispatch_started", "completed"]);
    const pending = await harness.pendingOperationsOf(handle.executionId);
    assert.equal(pending[0]?.correlationId, "wf/answer#1/phase1.call1");

    assert.deepEqual(trace.transitions.map((entry) => `${entry.from}->${entry.to}`), ["answer->record", "record->complete"]);
  });

  test("the same definition and the same Effect on the slow path produce identical semantics", async () => {
    const provider = script();
    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions, trace } = createWorkflowTestHarness({
      functions,
      models: modelAccess(resolver(), [provider]),
      authorizer: policy(),
      capabilities: executor,
    });
    const ref = await definitions.save(defineWorkflow({ id: "bounded-rag", spec: ragWorkflow }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    // The Workflow really waited: the Stage had not transitioned and the model had not continued.
    const waiting = await harness.inspect(handle.executionId);
    assert.equal(waiting?.lifecycle, "WAITING");
    assert.equal(readWorkflowControlState(waiting!.control.progress)!.currentStage, "answer");
    assert.equal(provider.invocationCount, 1, "the bounded continuation had not run yet");

    executor.completeAll({ chunks: [{ text: "Harbor View allows one dog under 40 pounds." }] });
    await harness.drainEffects();
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.equal(
      readWorkflowControlState(context!.control.progress)!.provisionalResult,
      "One dog under 40 pounds is allowed at Harbor View.",
      "the Stage result is the same as on the fast path",
    );
    assert.equal(provider.invocationCount, 2);
    assert.deepEqual(trace.transitions.map((entry) => `${entry.from}->${entry.to}`), ["answer->record", "record->complete"]);

    // The retrieval observation reached the model as a capability message, not as a fabricated
    // local value: the Stage could only see what the Harness delivered.
    const continuation = provider.requests[1]!;
    assert.equal(continuation.messages.at(-1)?.role, "capability");
    assert.equal(continuation.messages.at(-1)?.capability, "lookup_policy");
    assert.match(String(continuation.messages.at(-1)?.content), /Harbor View/);
  });

  test("a model call naming an operation the Stage does not expose never becomes an Effect", async () => {
    const provider = new ScriptedModelProvider({
      id: "scripted",
      steps: [
        {
          unsafeResponse: {
            output: { capabilityCalls: [{ capability: "payment.charge", input: { amount: 100 } }] },
            metadata: { provider: "scripted", model: "scripted-rag" },
          },
        },
      ],
    });
    const { harness, definitions } = createWorkflowTestHarness({
      functions,
      models: modelAccess(resolver(), [provider]),
      // Deliberately permissive policy, so the refusal cannot be mistaken for policy doing the work.
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "payment.charge" }] }),
      capabilities: createLocalRetrievalExecutor({ documents: [PET_POLICY] }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "bounded-rag", spec: ragWorkflow }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.match(context!.failure!.message, /unknown capability payment\.charge/);
    assert.deepEqual(
      await harness.effectJournalOf(handle.executionId),
      [],
      "exposure is not authority, and an unexposed name is not even a request",
    );
  });

  test("an LLM Stage that answers without retrieving still completes within its bound", async () => {
    const provider = new ScriptedModelProvider({
      id: "scripted",
      steps: [
        { output: { text: "No lookup needed." } },
        { output: { text: "Cedar Court does not allow pets." } },
      ],
    });
    const { harness, definitions } = createWorkflowTestHarness({
      functions,
      models: modelAccess(resolver(), [provider]),
      authorizer: policy(),
      capabilities: createLocalRetrievalExecutor({ documents: [PET_POLICY] }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "bounded-rag", spec: ragWorkflow }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.equal(readWorkflowControlState(context!.control.progress)!.provisionalResult, "No lookup needed.");
    assert.equal(provider.invocationCount, 1, "an unconditional Stage keeps the answer its first phase produced");
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), []);
  });
});
