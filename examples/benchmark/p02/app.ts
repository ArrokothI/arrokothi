/**
 * The P02 composition root: one Execution-kernel Agent application, assembled by hand from the
 * production-facing surfaces (`@arrokothi/core/execution`, `/ports`, `/reference`). Nothing here
 * comes from `@arrokothi/core/testing` or the legacy package root.
 *
 * The seams that matter, all deny-by-default:
 *
 *   - the operation ceiling at Execution creation is exactly `properties.search` + `lead.submit`;
 *   - the Structured Memory read/write view resolvers grant only the declared lead keys;
 *   - the `EffectAuthorizer` grants `WriteMemory` for the lead keys and `properties.search`
 *     unconditionally, but `lead.submit` ONLY while the host-owned handoff gate is open — the
 *     required contact fields are committed and no handoff has been established yet. It also forces
 *     `idempotency: "per_input"` on the submit, so a within-turn duplicate is suppressed by the
 *     runtime as well as by the gate.
 *
 * The model provider is injected: a `ScriptedModelProvider` in tests, the real Gemini provider in
 * `main.ts`. The definition names only the logical model "primary".
 */

import type { AgentModelAccess, ExecutionId, ObjectSchema } from "@arrokothi/core/execution";
import { ControllerRegistry, Harness, createAgentController } from "@arrokothi/core/execution";
import type {
  AuthorizationDecision,
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
import { LEAD_SUBMIT, PROPERTIES_SEARCH, P02_OPERATIONS, createP02AgentDefinition } from "./agent.ts";
import { P02_MEMORY, P02_MEMORY_KEYS, contactRequirementsMet, leadFromMemory } from "./lead.ts";
import type { LeadRecord } from "./lead.ts";
import { P02_PROPERTIES } from "./catalog.ts";
import { searchProperties } from "./properties.ts";
import { createFakeEmailProvider } from "./email.ts";
import type { FakeEmailProvider } from "./email.ts";

const PROPERTY_SEARCH_INPUT: ObjectSchema = {
  kind: "object",
  additionalProperties: false,
  fields: {
    location: { required: false, description: "Case-insensitive area substring.", schema: { kind: "string" } },
    maxPrice: { required: false, description: "Upper bound on sale price, whole USD.", schema: { kind: "number" } },
    minPrice: { required: false, description: "Lower bound on sale price, whole USD.", schema: { kind: "number" } },
    minBeds: { required: false, description: "Minimum bedroom count.", schema: { kind: "number" } },
    type: {
      required: false,
      description: "Exact listing type.",
      schema: { kind: "enum", choices: ["Villa", "Apartment", "Penthouse", "Mansion"] },
    },
    limit: { required: false, description: "Result cap (default 3, max 6).", schema: { kind: "number" } },
  },
};

const LEAD_SUBMIT_INPUT: ObjectSchema = {
  kind: "object",
  additionalProperties: false,
  fields: {
    analysis: {
      required: false,
      description: "Concise professional lead-quality and follow-up analysis. Free text; the only model-authored field.",
      schema: { kind: "string", maxLength: 2000 },
    },
  },
};

/** Descriptive operation truth. Grants nothing. `consequential` is an explicit declaration. */
export function p02Catalog(): CapabilityCatalog {
  return createCapabilityCatalog([
    {
      capability: PROPERTIES_SEARCH.capability,
      operation: PROPERTIES_SEARCH.operation,
      consequential: false,
      title: "Search EstatePro listings",
      description:
        "Filter the authoritative EstatePro sale catalog by location, price, bedrooms, or type and " +
        "return the matching listings, ranked by price. Returns an empty match set with a note when " +
        "nothing matches. Read-only; invent nothing.",
      input: PROPERTY_SEARCH_INPUT,
    },
    {
      capability: LEAD_SUBMIT.capability,
      operation: LEAD_SUBMIT.operation,
      consequential: true,
      title: "Hand the qualified lead to the EstatePro team",
      description:
        "Send the completed, recorded lead and a short analysis to the human team. Consequential and " +
        "external. Call once, only after the visitor's name and cell phone are recorded and their " +
        "contact preference and best time are known. The recorded lead is used; do not pass lead fields.",
      input: LEAD_SUBMIT_INPUT,
    },
  ]);
}

/** Routes a dispatched capability to its implementation. Given no store and no context, by design. */
export function p02CapabilityExecutor(email: CapabilityExecutor): CapabilityExecutor {
  return {
    async execute(request, environment) {
      if (String(request.capability) === PROPERTIES_SEARCH.capability) {
        const input = request.input as Record<string, unknown>;
        const result = searchProperties(P02_PROPERTIES, {
          ...(typeof input["location"] === "string" ? { location: input["location"] } : {}),
          ...(typeof input["maxPrice"] === "number" ? { maxPrice: input["maxPrice"] } : {}),
          ...(typeof input["minPrice"] === "number" ? { minPrice: input["minPrice"] } : {}),
          ...(typeof input["minBeds"] === "number" ? { minBeds: input["minBeds"] } : {}),
          ...(typeof input["type"] === "string" ? { type: input["type"] as never } : {}),
          ...(typeof input["limit"] === "number" ? { limit: input["limit"] } : {}),
        });
        return { status: "success", observation: JSON.parse(JSON.stringify(result)) };
      }
      if (String(request.capability) === LEAD_SUBMIT.capability) {
        return email.execute(request, environment);
      }
      return {
        status: "failure",
        error: { code: "unknown_capability", message: `no executor for "${String(request.capability)}"` },
        retryable: false,
      };
    },
  };
}

/**
 * The deterministic handoff gate, evaluated inside the `EffectAuthorizer` (guide §3.3: "a
 * deterministic gate over committed facts lives in host code, or in an EffectAuthorizer the host
 * wired"). The authorizer is allowed to be async, so it reads committed Structured Memory directly
 * and the model cannot route around a denial:
 *
 *   - `lead.submit` is denied unless the required contact fields (`firstName`, `phone`) are
 *     committed — enforcing the required-contact rule in code, not prose;
 *   - it is denied once the transport has settled as success or unknown, so a handoff never repeats;
 *   - on every allow it stages the authoritative committed lead into the transport, so what is sent
 *     is the recorded record, not the model's call arguments;
 *   - the grant also forces runtime `per_input` idempotency as a second layer.
 */
export interface HandoffGateDeps {
  /** Reads the current committed lead. Wired by `createP02App` once the Execution exists. */
  readLead(): Promise<LeadRecord>;
  readonly email: FakeEmailProvider;
}

export function p02Authorizer(deps: HandoffGateDeps): EffectAuthorizer {
  const base = createAllowListAuthorizer({
    grants: [
      { capability: PROPERTIES_SEARCH.capability, operations: [PROPERTIES_SEARCH.operation] },
      { capability: LEAD_SUBMIT.capability, operations: [LEAD_SUBMIT.operation], idempotency: "per_input" },
    ],
    memory: { writableKeys: [...P02_MEMORY_KEYS] },
  });
  return {
    async authorize(request): Promise<AuthorizationDecision> {
      const proposal = request.proposal;
      if (
        proposal.kind === "use_capability" &&
        String(proposal.capability) === LEAD_SUBMIT.capability &&
        String(proposal.operation) === LEAD_SUBMIT.operation
      ) {
        if (deps.email.hasSettled()) {
          return {
            decision: "deny",
            code: "handoff_already_established",
            message: "this lead has already been handed to the team; a second submission is not authorized",
          };
        }
        const lead = await deps.readLead();
        if (!contactRequirementsMet(lead)) {
          return {
            decision: "deny",
            code: "handoff_not_eligible",
            message: "the lead is missing a required contact field (name or cell phone); the handoff is not authorized yet",
          };
        }
        deps.email.setPendingLead(lead);
      }
      return base.authorize(request);
    },
  };
}

export interface P02AppOptions {
  readonly model: ModelProvider;
  readonly providerId?: string;
  readonly modelName?: string;
  /** Override the Effect policy (tests exercise deny-by-default). */
  readonly authorizer?: EffectAuthorizer;
  /** The dry-run lead transport. Defaults to a success-mode fake. */
  readonly email?: FakeEmailProvider;
}

export interface P02App {
  readonly harness: Harness;
  readonly email: FakeEmailProvider;
  createSession(): Promise<ExecutionId>;
}

export function createP02App(options: P02AppOptions): P02App {
  const providerId = options.providerId ?? options.model.id;
  const store = new InMemoryRuntimeStore();
  const definitions = new InMemoryDefinitionStore();
  const catalog = p02Catalog();
  const email = options.email ?? createFakeEmailProvider();
  let sessionExecutionId: ExecutionId | null = null;
  const readLead = async (): Promise<LeadRecord> =>
    sessionExecutionId ? leadFromMemory(await harness.structuredMemoryOf(sessionExecutionId)) : {};

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
      grants: { readableKeys: [...P02_MEMORY_KEYS] },
    }),
    structuredMemoryWriteView: createStructuredMemoryWriteViewResolver({
      store,
      grants: { writableKeys: [...P02_MEMORY_KEYS] },
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
    capabilities: p02CapabilityExecutor(email),
    authorizer: options.authorizer ?? p02Authorizer({ readLead, email }),
  });

  return {
    harness,
    email,
    async createSession(): Promise<ExecutionId> {
      const ref = await definitions.save(createP02AgentDefinition());
      const handle = await harness.createExecution({
        definition: ref,
        structuredMemory: P02_MEMORY,
        operationAuthority: { operations: [...P02_OPERATIONS] },
      });
      sessionExecutionId = handle.executionId;
      return handle.executionId;
    },
  };
}
