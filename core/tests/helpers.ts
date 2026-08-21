import type { AgentDefinition } from "../src/definition/types.ts";
import type { ToolDefinition } from "../src/tools/types.ts";
import { defineAgent } from "../src/definition/definition.ts";
import { KnowledgeIndex } from "../src/knowledge/in-memory.ts";
import { ToolRegistry } from "../src/tools/registry.ts";
import { InMemorySessionStore } from "../src/session/store.ts";
import { AgentRuntime } from "../src/runtime/runtime.ts";
import { createDeterministicIds, createFixedClock } from "../src/util/ids.ts";
import type { ModelProvider } from "../src/provider/types.ts";
import { recordQueryTools } from "../src/tools/record-query-tool.ts";

/** Shared fixtures. Every test runs on a deterministic clock and id generator so runs are replayable. */

export const PROPERTIES = [
  { id: "p2", title: "Skyline Penthouse", location: "Upper West Side", price: 18_900_000, beds: 4, sqft: 5200 },
  { id: "p4", title: "The TriBeCa Loft", location: "TriBeCa", price: 7_250_000, beds: 3, sqft: 3400 },
  { id: "p5", title: "Greenwich Townhouse", location: "West Village", price: 24_500_000, beds: 6, sqft: 8400 },
  { id: "p6", title: "Park Avenue Estate", location: "Upper East Side", price: 32_000_000, beds: 5, sqft: 7200 },
  { id: "p1", title: "The Azure Vista", location: "Malibu", price: 12_500_000, beds: 5, sqft: 6200 },
  { id: "p3", title: "Emerald Estate", location: "Greenwich, Connecticut", price: 15_750_000, beds: 8, sqft: 12500 },
];

export const SEND_EMAIL: ToolDefinition = {
  name: "send_email",
  label: "send your details to the team",
  description: "Send the visitor's details to a human representative.",
  effect: "external_side_effect",
  confirmation: "required",
  idempotency: "once_per_session",
  input: {
    kind: "object",
    fields: {
      contact_name: { required: true, schema: { kind: "string" } },
      phone: { required: true, schema: { kind: "string" } },
      summary: { required: false, schema: { kind: "string" } },
    },
  },
  output: { kind: "object", additionalProperties: true, fields: {} },
};

export const LOOKUP: ToolDefinition = {
  name: "lookup_status",
  description: "Look up a reference status. Read-only.",
  effect: "read",
  confirmation: "none",
  idempotency: "per_input",
  input: { kind: "object", fields: { code: { required: true, schema: { kind: "string" } } } },
  output: { kind: "object", additionalProperties: true, fields: {} },
};

export function testDefinition(overrides: Partial<AgentDefinition> = {}): AgentDefinition {
  return defineAgent({
    id: "test-agent",
    name: "Test Agent",
    goal: "Help a visitor find a property and hand them to a human when they are ready.",
    model: { providerId: "scripted", model: "scripted-model", temperature: 0 },
    globalRules: ["Never claim an action happened unless the runtime reports it succeeded."],
    memorySchema: {
      fields: [
        { key: "intent", schema: { kind: "enum", choices: ["buy", "rent", "sell"] }, description: "What the visitor wants to do" },
        { key: "budget", schema: { kind: "number", min: 0, max: 100_000_000 }, description: "Budget in dollars" },
        { key: "target_location", schema: { kind: "string" }, description: "Where they are looking" },
        { key: "bedrooms_needed", schema: { kind: "number", min: 0, max: 20, integer: true } },
        { key: "contact_name", schema: { kind: "string" } },
        { key: "phone", schema: { kind: "string" } },
        { key: "email", schema: { kind: "string" } },
        { key: "cash_buyer", schema: { kind: "boolean" } },
        { key: "features_wanted", schema: { kind: "string_array", maxItems: 5 } },
        { key: "hunch", schema: { kind: "string" }, authority: "advisory" },
      ],
    },
    hostContextSchema: {
      fields: [
        { key: "page_url", schema: { kind: "string" }, lifecycle: "turn", visibility: "model", trust: "trusted_host" },
        { key: "locale", schema: { kind: "string" }, lifecycle: "session", visibility: "model", trust: "trusted_host" },
        { key: "crm_api_key", schema: { kind: "string" }, lifecycle: "fixed", visibility: "tools_only", trust: "trusted_host" },
        { key: "internal_risk_tier", schema: { kind: "string" }, lifecycle: "session", visibility: "runtime_only", trust: "trusted_host" },
        { key: "claimed_membership", schema: { kind: "string" }, lifecycle: "session", visibility: "model", trust: "user_claimed" },
      ],
    },
    knowledge: [
      {
        source: {
          id: "listings",
          kind: "record_set",
          title: "Available properties",
          displayField: "title",
          fields: {
            id: { kind: "string" },
            title: { kind: "string" },
            location: { kind: "string" },
            price: { kind: "number" },
            beds: { kind: "number" },
            sqft: { kind: "number" },
          },
          records: PROPERTIES,
        },
      },
    ],
    tools: [{ definition: SEND_EMAIL }, { definition: LOOKUP }],
    policies: { maxSteps: 5, maxToolCallsPerTurn: 3 },
    ...overrides,
  });
}

export interface Harnessed {
  runtime: AgentRuntime;
  sessions: InMemorySessionStore;
  tools: ToolRegistry;
  knowledge: KnowledgeIndex;
  definition: AgentDefinition;
}

/** Builds a runtime wired to deterministic ids/clock, with record-query tools auto-registered. */
export function buildRuntime(model: ModelProvider, options: { definition?: AgentDefinition; registerTools?: (r: ToolRegistry) => void } = {}): Harnessed {
  const definition = options.definition ?? testDefinition();
  const sessions = new InMemorySessionStore();
  const knowledge = new KnowledgeIndex(definition.knowledge);
  const tools = new ToolRegistry(definition.tools);
  for (const { definition: def, executor } of recordQueryTools(knowledge)) tools.add(def, executor);
  options.registerTools?.(tools);

  const runtime = new AgentRuntime({
    definition,
    sessions,
    model,
    tools,
    knowledge,
    ids: createDeterministicIds(),
    clock: createFixedClock(),
  });
  return { runtime, sessions, tools, knowledge, definition };
}

/** Convenience: interpretation-pass JSON for a scripted step. */
export const interpret = (memory_writes: Record<string, unknown>, signals: string[] = [], working_notes: string[] = []) => ({
  purpose: "interpret" as const,
  json: { memory_writes, signals, working_notes },
});

export const reply = (text: string) => ({ purpose: "respond" as const, text });

export const callTool = (name: string, args: Record<string, unknown>) => ({
  purpose: "respond" as const,
  toolCalls: [{ name, args }],
});
