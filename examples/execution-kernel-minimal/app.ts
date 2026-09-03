/**
 * The composition root: one Execution-kernel application, assembled by hand.
 *
 * This file exists to answer one question a builder actually has:
 *
 * > What is the minimum honest way to run a current Execution-kernel application, without
 * > importing the testing facade?
 *
 * So it imports only the production-facing surfaces:
 *
 * ```text
 * @arrokothi/core/execution   definitions, Harness, controllers, Execution/Effect vocabulary
 * @arrokothi/core/ports       the interfaces an application implements or supplies
 * @arrokothi/core/reference   dependency-free implementations of those ports
 * ```
 *
 * Nothing here comes from `@arrokothi/core/testing`, and nothing here comes from the package root
 * `@arrokothi/core`, which still carries the separate legacy Session/Flow API.
 *
 * Read it as an inventory of the seams. Each collaborator below is a real decision an application
 * makes, and the two most important ones are deny-by-default: with no `EffectAuthorizer` the
 * Harness refuses every Effect, and with no operation authority an Execution can expose nothing.
 *
 * See `docs/guides/agent-workflow-composition/` for how to decide *what* to build; this file is
 * only about how to wire it.
 */

import type {
  AgentDefinition,
  ExecutionContext,
  ExecutionId,
  ObjectSchema,
  OperationRef,
} from "@arrokothi/core/execution";
import {
  ControllerRegistry,
  Harness,
  createAgentController,
  defineAgent,
} from "@arrokothi/core/execution";
import type { AgentModelAccess } from "@arrokothi/core/execution";
import type { CapabilityCatalog, CapabilityExecutor, EffectAuthorizer } from "@arrokothi/core/ports";
import {
  FifoScheduler,
  InMemoryDefinitionStore,
  InMemoryRuntimeStore,
  ModelProviderRegistry,
  ScriptedModelProvider,
  StaticModelResolver,
  createActiveOperationViewResolver,
  createAllowListAuthorizer,
  createCapabilityCatalog,
  createDeterministicIds,
  createFixedClock,
  createReferenceAgentExecutor,
  createRuntimeOperationAuthoritySource,
  portableModelFeatures,
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
  // The store is built first because two different sides need it: the Harness writes runtime-owned
  // authority into it, and the controller's exposure resolver reads that authority back through a
  // narrow read-only port. Handing the controller its own store would let exposure disagree with
  // the ceiling the Harness enforces.
  const store = new InMemoryRuntimeStore();
  const definitions = new InMemoryDefinitionStore();
  const operations = catalog();

  // Deployment decides which concrete model a logical reference resolves to. The definition never
  // names a provider, which is what makes it portable.
  const models: AgentModelAccess = {
    resolver: new StaticModelResolver({
      primary: {
        provider: "scripted",
        model: "deterministic-1",
        portableFeatures: portableModelFeatures({ capabilityCalls: true }),
      },
    }),
  };
  const provider = new ScriptedModelProvider({ id: "scripted", steps: options.modelSteps });

  // Controller-side collaborators: derivational and semantic only. Note what is absent - no store,
  // no scheduler, no authorizer, no capability executor. Those belong to the Harness.
  const controller = createAgentController({
    views: createActiveOperationViewResolver({
      authority: createRuntimeOperationAuthoritySource(store),
      catalog: operations,
    }),
    models,
    executor: createReferenceAgentExecutor({ providers: new ModelProviderRegistry([provider]) }),
  });

  // Harness-side collaborators: operational and enforcing.
  const harness = new Harness({
    definitions,
    store,
    scheduler: new FifoScheduler(),
    controllers: new ControllerRegistry([controller]),
    clock: createFixedClock(),
    ids: createDeterministicIds(),
    capabilityCatalog: operations,
    capabilities: handbookExecutor(),
    ...(options.authorizer !== undefined ? { authorizer: options.authorizer } : {}),
  });

  return {
    harness,
    provider,
    async start(question: string): Promise<ExecutionId> {
      const ref = await definitions.save(supportAgent());
      const handle = await harness.createExecution({
        definition: ref,
        // The runtime-owned ceiling. Omit it and this Execution can expose nothing at all -
        // "nobody granted anything" and "everything is granted" must not look the same.
        operationAuthority: { operations: [DOCS_SEARCH] },
      });
      // Applications mint `external.input` and nothing else. A capability result is an Event the
      // Harness creates when it establishes what happened.
      await harness.deliverExternalInput({
        destination: handle.executionId,
        label: "question",
        payload: question,
      });
      return handle.executionId;
    },
    async settle(executionId: ExecutionId): Promise<ExecutionContext | undefined> {
      // Two drains, because two different things make an Execution runnable: a delivered Event, and
      // a settled controller-local resumption such as a slow model call. Bounded so a controller
      // that never settles fails the example rather than hanging it.
      for (let i = 0; i < 16; i++) {
        await harness.runUntilIdle();
        await harness.drainResumptions();
        const context = await harness.inspect(executionId);
        if (!context) return undefined;
        if (context.lifecycle === "COMPLETED" || context.lifecycle === "FAILED" || context.lifecycle === "CANCELLED") {
          return context;
        }
        // WAITING on an Event means the Agent answered and is waiting for whatever comes next.
        if (context.lifecycle === "WAITING" && context.waitingFor?.kind === "event") return context;
      }
      return harness.inspect(executionId);
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
