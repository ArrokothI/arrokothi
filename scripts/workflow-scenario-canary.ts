/**
 * Optional live canary for the v0.4 **Workflow** path. Never part of the CI suite.
 *
 * This is deliberately not a provider test. `gemini-provider-canary.ts` proves the Gemini provider
 * contract against a live request; this proves *Workflow Stage semantics* while using the provider
 * foundation underneath:
 *
 * ```text
 * LLM Stage (bounded, 2 predetermined phases)
 *     -> model requests the Stage's one predefined callable
 *     -> UseCapability Effect
 *     -> Harness authorization
 *     -> local retrieval executor
 *     -> capability.completed Event
 *     -> Stage barrier settles
 *     -> bounded model continuation
 *     -> StageResult
 *     -> predefined transition
 * -> Function Stage
 * -> complete
 * ```
 *
 * Everything except the model call is deterministic and local: retrieval runs against a small
 * in-process corpus through the real capability gateway, so the Effect/Event boundary is exercised
 * without a second network dependency. At most two live model requests are made, which keeps this
 * inside a modest daily request budget.
 *
 * No credential is printed, logged, or written anywhere. Without a key this exits `skipped`.
 */

import {
  ControllerRegistry,
  Harness,
  createWorkflowController,
  defineWorkflow,
  readWorkflowControlState,
} from "@agent-sdk/core/execution";
import type { WorkflowSpecInput } from "@agent-sdk/core/execution";
import {
  FifoScheduler,
  InMemoryDefinitionStore,
  InMemoryRuntimeStore,
  StaticModelResolver,
  createAllowListAuthorizer,
  createDeterministicIds,
  createFunctionStageRegistry,
  createSystemClock,
  ModelProviderRegistry,
  portableModelFeatures,
} from "@agent-sdk/core/reference";
import { GeminiModelProvider, geminiApiKeyFromEnv } from "@agent-sdk/provider-gemini";
import {
  LOCAL_RETRIEVAL_CAPABILITY,
  LOCAL_RETRIEVAL_OPERATIONS,
  createLocalRetrievalExecutor,
} from "@agent-sdk/retrieval-local";

const requestedModel = process.env["GEMINI_MODEL"] ?? "gemini-3.5-flash-lite";
const apiKey = geminiApiKeyFromEnv();
const timestamp = new Date().toISOString();

function report(payload: Record<string, unknown>): void {
  console.log(JSON.stringify({ scenario: "v0.4 workflow: bounded LLM Stage with live retrieval", timestamp, ...payload }, null, 2));
}

if (!apiKey) {
  report({
    status: "skipped",
    reason: "missing_credentials",
    message: "No Gemini API key found. Set GEMINI_API_KEY, GOOGLE_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY.",
    requestedModel,
  });
  process.exit(0);
}

const PET_POLICY = {
  id: "pet-policies",
  title: "Building pet policies",
  text:
    "Harbor View permits two cats, or one dog weighing under 40 pounds, with a one-time pet deposit of 500 dollars. " +
    "Cedar Court does not permit pets of any kind. Lakeside Commons permits one cat and no dogs.",
};

/** Authored once, with no provider or model identity anywhere in it. */
const spec: WorkflowSpecInput = {
  entryStage: "answer",
  stages: [
    {
      id: "answer",
      kind: "llm",
      model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } },
      system:
        "You answer questions about building pet policies. Use the lookup_policy tool to retrieve the policy text " +
        "before answering. Answer in one short sentence.",
      prompt: "Question: {{input}}",
      maxModelPhases: 2,
      callables: [
        {
          name: "lookup_policy",
          description: "Search the building pet policy corpus.",
          input: { kind: "object", fields: { query: { required: true, schema: { kind: "string" } } } },
          capability: LOCAL_RETRIEVAL_CAPABILITY,
          operation: LOCAL_RETRIEVAL_OPERATIONS.search,
          resources: ["pet-policies"],
        },
      ],
      transitions: { kind: "always", next: { to: "stage", stage: "record" } },
    },
    {
      id: "record",
      kind: "function",
      implementationRef: "record-answer",
      transitions: { kind: "always", next: { to: "complete" } },
    },
  ],
};

const definitions = new InMemoryDefinitionStore();
const store = new InMemoryRuntimeStore();

const invocations: { provider: string; model: string; phase: number; capabilityCalls: number }[] = [];

const harness = new Harness({
  definitions,
  store,
  scheduler: new FifoScheduler(),
  controllers: new ControllerRegistry([
    createWorkflowController({
      functions: createFunctionStageRegistry({
        "record-answer": (context) => ({ status: "completed", result: context.input }),
      }),
      models: {
        resolver: new StaticModelResolver({
          primary: {
            provider: "gemini",
            model: requestedModel,
            portableFeatures: portableModelFeatures({ capabilityCalls: true, structuredOutput: true, cancellation: true, usageMetadata: true }),
          },
        }),
        providers: new ModelProviderRegistry([new GeminiModelProvider({ apiKey, maxRetries: 0 })]),
      },
      trace: {
        modelInvoked(record) {
          invocations.push({
            provider: record.provider,
            model: record.model,
            phase: record.phase,
            capabilityCalls: record.capabilityCallCount,
          });
        },
      },
    }),
  ]),
  clock: createSystemClock(),
  ids: createDeterministicIds(),
  authorizer: createAllowListAuthorizer({
    grants: [
      {
        capability: LOCAL_RETRIEVAL_CAPABILITY,
        operations: [LOCAL_RETRIEVAL_OPERATIONS.search],
        resources: [{ bindingId: "pet-policies", mode: "read" }],
      },
    ],
  }),
  capabilities: createLocalRetrievalExecutor({ documents: [PET_POLICY] }),
});

const started = Date.now();
try {
  const ref = await definitions.save(defineWorkflow({ id: "pet-policy-answer", spec }));
  const handle = await harness.createExecution({
    definition: ref,
    // The runtime-owned ceiling. Policy decides the concrete request; this decides whether the
    // operation is inside what this Execution may use at all, and it is re-read at dispatch.
    operationAuthority: {
      operations: [{ capability: LOCAL_RETRIEVAL_CAPABILITY, operation: LOCAL_RETRIEVAL_OPERATIONS.search }],
    },
  });
  await harness.deliverExternalInput({ destination: handle.executionId, label: "question", payload: "Can I keep a dog at Harbor View?" });
  const records = await harness.runUntilIdle();

  const context = await harness.inspect(handle.executionId);
  const state = readWorkflowControlState(context!.control.progress);
  const journal = await harness.effectJournalOf(handle.executionId);
  const pending = await harness.pendingOperationsOf(handle.executionId);

  const retrieved = journal.some((entry) => entry.phase === "completed");
  const status = context?.lifecycle === "COMPLETED" ? "passed" : "failed";

  report({
    status,
    requestedModel,
    durationMs: Date.now() - started,
    lifecycle: context?.lifecycle,
    activations: records.length,
    stageResult: state?.provisionalResult,
    finalStage: state?.currentStage,
    liveRetrieval: {
      crossedTheEffectGateway: retrieved,
      journalPhases: journal.map((entry) => entry.phase),
      correlations: pending.map((operation) => operation.correlationId),
    },
    modelInvocations: invocations,
    failure: context?.failure ?? null,
  });
  process.exit(status === "passed" ? 0 : 1);
} catch (error) {
  // Never surface a credential or a raw request. The stable failure taxonomy is what matters here.
  const described = error as { name?: string; code?: string; message?: string };
  report({
    status: "failed",
    requestedModel,
    durationMs: Date.now() - started,
    failureCategory: described.code ?? described.name ?? "unknown",
    message: (described.message ?? String(error)).slice(0, 400),
    modelInvocations: invocations,
  });
  process.exit(1);
}
