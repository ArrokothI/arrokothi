/** SDK composition root: portable definition, explicit deployment policy, shared runtime. */
import type {
  AgentDefinition,
  ExecutionContext,
  ExecutionId,
  ObjectSchema,
  OperationRef,
} from "@arrokothi/core";
import { createApplication, defineAgent } from "@arrokothi/sdk";
import type { Harness } from "@arrokothi/core";
import type { CapabilityCatalog, CapabilityExecutor, EffectAuthorizer } from "@arrokothi/core/ports";
import {
  ScriptedModelProvider, createAllowListAuthorizer, createCapabilityCatalog, portableModelFeatures,
} from "@arrokothi/core/reference";
import type { ScriptedModelStep } from "@arrokothi/core/reference";



// -- the one operation this application exposes ------------------------------

export const DOCS_SEARCH: OperationRef = { capability: "docs", operation: "search" };

const SEARCH_INPUT: ObjectSchema = {
  kind: "object",
  fields: { query: { required: true, schema: { kind: "string" }, description: "what to look up" } },
  additionalProperties: false,
};

/**
 * Descriptive operation truth. It grants nothing.
 *
 * `consequential: false` is a real declaration, not a default: an operation this catalog cannot
 * describe is treated as consequential, which is the conservative reading.
 */
export function catalog(): CapabilityCatalog {
  return createCapabilityCatalog([
    {
      capability: DOCS_SEARCH.capability,
      operation: DOCS_SEARCH.operation,
      consequential: false,
      title: "Search the handbook",
      description: "Search the support handbook and return the matching entry.",
      input: SEARCH_INPUT,
    },
  ]);
}

/** Where the authorized work actually happens. Given no store and no ExecutionContext, by design. */
export function handbookExecutor(): CapabilityExecutor {
  const handbook: Record<string, string> = {
    "password reset": "Send the customer a reset link from the admin console; links expire in 1 hour.",
    refunds: "Refunds under 50 are automatic; anything larger needs a supervisor.",
  };
  return {
    async execute(request) {
      const query = String((request.input as { query?: unknown }).query ?? "").toLowerCase();
      const hit = Object.entries(handbook).find(([topic]) => query.includes(topic));
      if (!hit) {
        // An actionable failure: it says what to do next, not just that something went wrong.
        return {
          status: "failure",
          error: { code: "not_found", message: `no handbook entry matches "${query}"; try "refunds" or "password reset"` },
          retryable: false,
        };
      }
      return { status: "success", observation: { topic: hit[0], entry: hit[1] } };
    },
  };
}

// -- the definition ----------------------------------------------------------

/**
 * Portable authored data. No provider id, no client, no key, no store, no Harness.
 *
 * `operations` is a *request* for exposure. It is intersected with the runtime-owned operation
 * ceiling supplied at Execution creation; writing a name here neither grants it nor makes it appear.
 */
export function supportAgent(): AgentDefinition {
  return defineAgent({
    id: "handbook-support",
    name: "Handbook support agent",
    description: "Answers a support question from the handbook, and says so when it cannot.",
    spec: {
      model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } },
      instructions: [
        "Answer the customer's question using the handbook operation you were given.",
        "If the operation is refused or fails, say plainly that you could not look it up.",
        "Never state a handbook policy you did not read from a successful result.",
      ].join(" "),
      operations: { refs: [DOCS_SEARCH] },
      limits: { maxModelCalls: 4 },
    },
  });
}

// -- the composition root ----------------------------------------------------

export interface AppOptions {
  /**
   * Effect policy.
   *
   * Omit it and the Harness denies every Effect. That is the correct behaviour rather than a stub:
   * "nobody configured policy" and "policy allowed it" must never look the same. `main.ts` runs the
   * application both ways to make the difference observable.
   */
  readonly authorizer?: EffectAuthorizer;
  /** Deterministic model script. One step per model call the Agent is expected to make. */
  readonly modelSteps: readonly ScriptedModelStep[];
}

export interface App {
  readonly harness: Harness;
  readonly provider: ScriptedModelProvider;
  /** Publishes the definition and creates one root Execution with its operation ceiling. */
  start(question: string): Promise<ExecutionId>;
  /** Runs until nothing is runnable, letting controller-local model work settle in between. */
  settle(executionId: ExecutionId): Promise<ExecutionContext | undefined>;
}

export function createApp(options: AppOptions): App {
  const provider = new ScriptedModelProvider({ id: "scripted", steps: options.modelSteps });
  const application = createApplication({
    models: {
      providers: [provider],
      bindings: { primary: { provider: provider.id, model: "deterministic-1",
        portableFeatures: portableModelFeatures({ capabilityCalls: true }) } },
    },
    capabilities: { catalog: catalog(), executor: handbookExecutor() },
    authorizer: options.authorizer,
  });
  return {
    harness: application.harness,
    provider,
    async start(question) {
      const { executionId } = await application.start({
        definition: supportAgent(),
        operationAuthority: { operations: [DOCS_SEARCH] },
        input: { label: "question", payload: question },
      });
      return executionId;
    },
    async settle(executionId) {
      const result = await application.runUntilBlocked(executionId);
      if (["timeout", "activation_limit", "aborted"].includes(result.reason)) throw new Error(`Host run stopped: ${result.reason}`);
      return result.execution;
    },
  };
}

/** The authorizer for the permitted run: exactly one operation, nothing else. */
export function handbookAuthorizer(): EffectAuthorizer {
  return createAllowListAuthorizer({
    grants: [{ capability: DOCS_SEARCH.capability, operations: [DOCS_SEARCH.operation] }],
  });
}

/**
 * The one model script. Both runs use it, unchanged.
 *
 * This is what makes the comparison controlled: the definition, the ceiling, the exposure request,
 * the catalog, the executor, and the model's behaviour are all held constant, so every difference
 * between the two runs is attributable to the `EffectAuthorizer` and to nothing else.
 *
 * It also demonstrates something the guide says elsewhere and this example can show directly. The
 * scripted model asserts the same confident sentence in both runs - including the run where the
 * lookup was refused and no executor ever ran. A model's prose is not evidence of what happened;
 * the Effect journal and the executor are. `main.ts` prints both so the divergence is visible under
 * an identical answer.
 */
export function modelScript(): readonly ScriptedModelStep[] {
  return [
    { output: { capabilityCalls: [{ id: "c1", capability: "docs_search", input: { query: "refunds" } }] } },
    { output: { text: "Refunds under 50 are automatic; anything larger needs a supervisor." } },
  ];
}
