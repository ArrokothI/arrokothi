/** Application-owned assembly: multi-turn drafting and a fixed review/publish Workflow. */
import {
  ControllerRegistry, Harness, createAgentController, createWorkflowController,
  defineAgent, defineWorkflow,
} from "@arrokothi/core/execution";
import type { ObjectSchema, StructuredMemoryBinding } from "@arrokothi/core/execution";
import type { CapabilityExecutor, EffectAuthorizer } from "@arrokothi/core/ports";
import {
  FifoScheduler, InMemoryDefinitionStore, InMemoryRuntimeStore, ModelProviderRegistry,
  ScriptedModelProvider, StaticModelResolver, createActiveOperationViewResolver,
  createAllowListAuthorizer, createCapabilityCatalog, createCapabilityConfirmationPolicy,
  createDeterministicIds, createFixedClock, createFunctionStageRegistry,
  createReferenceAgentExecutor, createRuntimeOperationAuthoritySource,
  createStructuredMemoryReadViewResolver, createStructuredMemoryWriteViewResolver, portableModelFeatures,
} from "@arrokothi/core/reference";
import type { ScriptedModelStep } from "@arrokothi/core/reference";

export const PUBLISH = { capability: "articles", operation: "publish" } as const;
const TITLE = { kind: "string", minLength: 3, maxLength: 100 } as const;
const PUBLISH_INPUT: ObjectSchema = {
  kind: "object", additionalProperties: false,
  fields: { title: { required: true, schema: TITLE } },
};
const MEMORY: StructuredMemoryBinding = {
  fields: [{ key: "title", schema: TITLE, description: "The user's current draft title; publication requires separate confirmation." }],
};

export function draftingAgent(maxModelCalls = 12) {
  return defineAgent({
    id: "drafting-assistant",
    spec: {
      model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } },
      instructions: "Collect the user's title and save it. Publish only when requested. Report publication only after a successful operation observation. If denied or declined, explain and wait for the user.",
      operations: { refs: [PUBLISH] },
      structuredMemory: { read: { keys: ["title"] }, write: { keys: ["title"] } },
      completion: "respond_and_wait",
      limits: { maxModelCalls, maxOperationCallsPerStep: 1, maxContextMessages: 8 },
    },
  });
}

export function reviewerAgent() {
  return defineAgent({
    id: "title-reviewer",
    terminalResult: { schemaId: "reviewed-title", schemaVersion: 1, schema: TITLE },
    spec: {
      model: { logicalRef: "primary", requirements: { text: true } },
      instructions: "Return only a concise, accurate article title for the supplied topic.",
      completion: "complete_on_response", // Both this AND the terminal schema are needed for text return.
      limits: { maxModelCalls: 2 },
    },
  });
}

export function publishingWorkflow() {
  return defineWorkflow({
    id: "review-and-publish",
    spec: {
      entryStage: "review",
      stages: [
        {
          id: "review", kind: "agent",
          child: { definitionId: "title-reviewer", definitionVersion: 1 },
          // No operations delegated: this child only drafts text.
          transitions: { kind: "always", next: { to: "stage", stage: "publish" } },
        },
        {
          id: "publish", kind: "function", implementationRef: "publish-reviewed-title",
          transitions: { kind: "always", next: { to: "complete" } },
        },
      ],
    },
  });
}

/** Offline, key-free assembly. The article Map is an observable fake external system, not durability. */
export function createPatternApp(steps: readonly ScriptedModelStep[]) {
  const store = new InMemoryRuntimeStore();
  const definitions = new InMemoryDefinitionStore();
  const provider = new ScriptedModelProvider({ id: "scripted", steps });
  const providers = new ModelProviderRegistry([provider]);
  const resolver = new StaticModelResolver({ primary: {
    provider: provider.id, model: "offline", portableFeatures: portableModelFeatures({ capabilityCalls: true }),
  } });
  const articles = new Map<string, string>();
  const publisherCalls: string[] = [];
  const catalog = createCapabilityCatalog([{ ...PUBLISH, consequential: true,
    title: "Publish an article", description: "Create one article per exact title, after human confirmation. Repeating the same title returns its existing receipt.", input: PUBLISH_INPUT,
  }]);
  const base = createAllowListAuthorizer({
    grants: [{ capability: PUBLISH.capability, operations: [PUBLISH.operation], idempotency: "per_input" }],
    memory: { writableKeys: ["title"] },
    spawn: { definitions: ["title-reviewer"] },
  });
  // This is trusted host wiring. Read current committed state on EACH authorization, including
  // after approval; a cached flag computed between turns could authorize a stale title.
  const authorizer: EffectAuthorizer = {
    async authorize(request) {
      if (request.proposal.kind === "use_capability" && request.definition.id === "drafting-assistant") {
        const memory = await harness.structuredMemoryOf(request.executionId);
        const title = (request.proposal.input as { title?: unknown } | undefined)?.title;
        if (typeof title !== "string" || title !== memory?.values["title"]?.value) {
          return { decision: "deny", code: "title_not_current", message: "Save the current title before publishing it." };
        }
      }
      return base.authorize(request);
    },
  };
  const capabilities: CapabilityExecutor = {
    async execute(request) {
      // Dispatch explicitly; an executor is not automatically a per-operation registry.
      if (request.capability !== PUBLISH.capability || request.operation !== PUBLISH.operation) {
        return { status: "failure", error: { code: "unsupported_operation", message: "Only articles/publish is implemented." }, retryable: false };
      }
      const title = (request.input as { title?: unknown } | undefined)?.title;
      if (typeof title !== "string" || title.length < 3 || title.length > 100) {
        return { status: "failure", error: { code: "invalid_title", message: "Supply a title of 3–100 characters." }, retryable: false };
      }
      publisherCalls.push(title);
      // Fake external idempotency: this sample defines exact title as a unique article key.
      // A real publisher normally uses a durable application request ID + atomic conditional insert.
      // This guard matters even in-process: confirmed proposals currently bypass kernel replay.
      const existing = [...articles].find(([, publishedTitle]) => publishedTitle === title);
      if (existing) return { status: "success", observation: { id: existing[0], title } };
      const id = `article-${articles.size + 1}`;
      articles.set(id, title);
      return { status: "success", observation: { id, title } };
    },
  };
  const functions = createFunctionStageRegistry({
    "publish-reviewed-title": (context) => {
      const answer = context.observations.find((observation) => observation.key === "publication");
      if (answer) {
        if (answer.outcome !== "completed") {
          // A settled barrier is not success. Unknown requires reconciliation, never a blind retry.
          return { status: "failed", code: `publication_${answer.outcome}`, message: answer.error?.message ?? answer.outcome };
        }
        const receipt = JSON.stringify(answer.observation);
        return { status: "completed", result: receipt, emissions: [{ body: { kind: "text", text: receipt } }] };
      }
      const title = context.input?.trim();
      if (!title || title.length < 3 || title.length > 100) {
        return { status: "failed", code: "invalid_review", message: "The reviewer must return a title of 3–100 characters." };
      }
      return { status: "awaitEffects", effects: [{
        key: "publication", ...PUBLISH, input: { title }, idempotency: "per_input", deadlineMs: 30_000,
      }] };
    },
  });
  const harness = new Harness({
    definitions, store, scheduler: new FifoScheduler(),
    clock: createFixedClock("2026-01-01T00:00:00.000Z", 0), ids: createDeterministicIds(),
    capabilityCatalog: catalog, capabilities, authorizer,
    confirmationPolicy: createCapabilityConfirmationPolicy({ rules: [{ capability: PUBLISH.capability, operations: [PUBLISH.operation] }] }),
    controllers: new ControllerRegistry([
      createAgentController({
        models: { resolver }, executor: createReferenceAgentExecutor({ providers }),
        views: createActiveOperationViewResolver({ catalog, authority: createRuntimeOperationAuthoritySource(store) }),
        structuredMemoryReadView: createStructuredMemoryReadViewResolver({ store, grants: { readableKeys: ["title"] } }),
        structuredMemoryWriteView: createStructuredMemoryWriteViewResolver({ store, grants: { writableKeys: ["title"] } }),
      }),
      createWorkflowController({ functions, models: { resolver, providers } }),
    ]),
  });
  return {
    harness, provider, articles, publisherCalls,
    async startConversation(text: string, maxModelCalls = 12) {
      const definition = await definitions.save(draftingAgent(maxModelCalls));
      const { executionId } = await harness.createExecution({ definition, structuredMemory: MEMORY, operationAuthority: { operations: [PUBLISH] } });
      await harness.deliverExternalInput({ destination: executionId, label: "user", payload: text });
      return executionId;
    },
    async startWorkflow(topic: string, structuralSpawnBudget = 1) {
      await definitions.save(reviewerAgent());
      const definition = await definitions.save(publishingWorkflow());
      const { executionId } = await harness.createExecution({ definition, structuralSpawnBudget, operationAuthority: { operations: [PUBLISH] } });
      // Deliver start input BEFORE running: the stock Workflow starts even without an input.
      await harness.deliverExternalInput({ destination: executionId, label: "topic", payload: topic });
      return executionId;
    },
  };
}
