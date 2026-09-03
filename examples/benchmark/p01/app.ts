/**
 * The P01 composition root: one Execution-kernel Agent application, assembled by hand from the
 * production-facing surfaces (`@arrokothi/core/execution`, `/ports`, `/reference`). Nothing here
 * comes from `@arrokothi/core/testing` or the legacy package root.
 *
 * The seams that matter, all deny-by-default:
 *
 *   - `EffectAuthorizer` grants exactly `hempcrete.estimate_volume` and `WriteMemory` for the three
 *     project fields. Every other Effect is refused.
 *   - the operation ceiling passed at Execution creation is the same single operation.
 *   - the Structured Memory read/write view resolvers grant only the three declared keys; without
 *     them the model would silently see no state and be offered no write action.
 *
 * The model provider is injected: a `ScriptedModelProvider` for deterministic tests, the real
 * `GeminiModelProvider` in `main.ts`. The definition names only a logical model ("primary"); the
 * `StaticModelResolver` here binds it to whatever provider was supplied.
 */

import type { AgentModelAccess, ExecutionId } from "@arrokothi/core/execution";
import {
  ControllerRegistry,
  Harness,
  createAgentController,
} from "@arrokothi/core/execution";
import type {
  CapabilityCatalog,
  CapabilityExecutor,
  EffectAuthorizer,
  ModelProvider,
} from "@arrokothi/core/ports";
import {
  FifoScheduler,
  InMemoryDefinitionStore,
  InMemoryRuntimeStore,
  ModelProviderRegistry,
  StaticModelResolver,
  createActiveOperationViewResolver,
  createAllowListAuthorizer,
  createCapabilityCatalog,
  createDeterministicIds,
  createReferenceAgentExecutor,
  createRuntimeOperationAuthoritySource,
  createStructuredMemoryReadViewResolver,
  createStructuredMemoryWriteViewResolver,
  createSystemClock,
  portableModelFeatures,
} from "@arrokothi/core/reference";
import { ESTIMATE_VOLUME, P01_MEMORY, P01_MEMORY_KEYS, createP01AgentDefinition } from "./agent.ts";
import { MAX_AREA_SQ_FT, MAX_THICKNESS_IN, estimateHempcreteVolume } from "./volume.ts";

const ESTIMATE_VOLUME_INPUT = {
  kind: "object",
  fields: {
    area_sq_ft: {
      required: true,
      description: `Wall or floor area the hemp-lime covers, in square feet (0-${MAX_AREA_SQ_FT}).`,
      schema: { kind: "number" },
    },
    thickness_in: {
      required: true,
      description: `Hemp-lime layer or wall thickness, in inches (0-${MAX_THICKNESS_IN}).`,
      schema: { kind: "number" },
    },
  },
  additionalProperties: false,
} as const;

/** Descriptive operation truth. Grants nothing; `consequential: false` is an explicit declaration. */
export function p01Catalog(): CapabilityCatalog {
  return createCapabilityCatalog([
    {
      capability: ESTIMATE_VOLUME.capability,
      operation: ESTIMATE_VOLUME.operation,
      consequential: false,
      title: "Estimate hemp-lime material volume",
      description:
        "Deterministically convert a wall/floor area (sq ft) and layer thickness (in) into hemp-lime " +
        "material volume in cubic metres. Rejects non-positive or out-of-range dimensions.",
      input: ESTIMATE_VOLUME_INPUT,
    },
  ]);
}

/** The only place `estimateHempcreteVolume` runs at request time. Given no store, by design. */
export function p01CapabilityExecutor(): CapabilityExecutor {
  return {
    async execute(request) {
      const input = request.input as { area_sq_ft?: unknown; thickness_in?: unknown };
      const result = estimateHempcreteVolume({
        area_sq_ft: Number(input.area_sq_ft),
        thickness_in: Number(input.thickness_in),
      });
      if (!result.ok) {
        return { status: "failure", error: { code: result.code, message: result.message }, retryable: false };
      }
      return { status: "success", observation: { ...result.estimate, formula: "area_sq_ft * thickness_in / 12 * 0.0283168" } };
    },
  };
}

/** P01 Effect policy: one read-only operation, and memory writes to the three declared fields. */
export function p01Authorizer(): EffectAuthorizer {
  return createAllowListAuthorizer({
    grants: [{ capability: ESTIMATE_VOLUME.capability, operations: [ESTIMATE_VOLUME.operation] }],
    memory: { writableKeys: [...P01_MEMORY_KEYS] },
  });
}

export interface P01AppOptions {
  /** Portable model provider. Its `id` must match `providerId`. */
  readonly model: ModelProvider;
  /** Provider id the logical model "primary" resolves to. Defaults to the provider's own id. */
  readonly providerId?: string;
  /** Concrete model name recorded in resolution metadata. */
  readonly modelName?: string;
  /** Override the Effect policy (tests exercise deny-by-default). Defaults to `p01Authorizer()`. */
  readonly authorizer?: EffectAuthorizer;
}

export interface P01App {
  readonly harness: Harness;
  /** Publish the definition and create one root Agent Execution with its memory binding + ceiling. */
  createSession(): Promise<ExecutionId>;
}

export function createP01App(options: P01AppOptions): P01App {
  const providerId = options.providerId ?? options.model.id;
  const store = new InMemoryRuntimeStore();
  const definitions = new InMemoryDefinitionStore();
  const catalog = p01Catalog();

  const models: AgentModelAccess = {
    resolver: new StaticModelResolver({
      primary: {
        provider: providerId,
        model: options.modelName ?? "primary",
        portableFeatures: portableModelFeatures({ capabilityCalls: true }),
      },
    }),
  };

  const controller = createAgentController({
    views: createActiveOperationViewResolver({
      authority: createRuntimeOperationAuthoritySource(store),
      catalog,
    }),
    models,
    executor: createReferenceAgentExecutor({
      providers: new ModelProviderRegistry([options.model]),
    }),
    structuredMemoryReadView: createStructuredMemoryReadViewResolver({
      store,
      grants: { readableKeys: [...P01_MEMORY_KEYS] },
    }),
    structuredMemoryWriteView: createStructuredMemoryWriteViewResolver({
      store,
      grants: { writableKeys: [...P01_MEMORY_KEYS] },
    }),
  });

  const harness = new Harness({
    definitions,
    store,
    scheduler: new FifoScheduler(),
    controllers: new ControllerRegistry([controller]),
    clock: createSystemClock(),
    ids: createDeterministicIds(),
    capabilityCatalog: catalog,
    capabilities: p01CapabilityExecutor(),
    authorizer: options.authorizer ?? p01Authorizer(),
  });

  return {
    harness,
    async createSession(): Promise<ExecutionId> {
      const ref = await definitions.save(createP01AgentDefinition());
      const handle = await harness.createExecution({
        definition: ref,
        structuredMemory: P01_MEMORY,
        operationAuthority: { operations: [ESTIMATE_VOLUME] },
      });
      return handle.executionId;
    },
  };
}
