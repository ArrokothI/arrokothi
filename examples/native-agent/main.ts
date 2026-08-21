import {
  AgentRuntime,
  InMemorySessionStore,
  KnowledgeIndex,
  NativeAgentHarness,
  ToolRegistry,
  createDeterministicIds,
  createFixedClock,
  defineAgent,
  knowledgeCapabilityName,
} from "@agent-sdk/core";
import { GeminiProvider } from "@agent-sdk/provider-gemini";

/** Offline proof that the real Gemini adapter drives the provider-neutral iterative Harness. */
const definition = defineAgent({
  id: "gemini-native-example",
  name: "Gemini Native Agent",
  goal: "Answer from runtime-controlled evidence.",
  model: { providerId: "gemini", model: "gemini-offline-fixture" },
  planning: { mode: "deterministic" },
  execution: { harness: "native_agent", executionContextPolicy: "fresh_each_turn" },
  memorySchema: { fields: [] },
  hostContextSchema: { fields: [] },
  knowledge: [{
    source: {
      id: "product_docs",
      kind: "document",
      title: "Product docs",
      description: "Authoritative product policy.",
      text: "The Acme plan supports up to five projects.",
    },
  }],
});

const capability = knowledgeCapabilityName("document_search", "product_docs");
const fixtures = [
  { candidates: [{ content: { parts: [{ functionCall: { name: capability, args: { query: "Acme project limit" } } }] }, finishReason: "STOP" }], modelVersion: "gemini-offline-fixture" },
  { candidates: [{ content: { parts: [{ text: "The Acme plan supports up to five projects." }] }, finishReason: "STOP" }], modelVersion: "gemini-offline-fixture" },
];
const fetchImpl: typeof fetch = async () => new Response(JSON.stringify(fixtures.shift()), {
  status: 200,
  headers: { "content-type": "application/json" },
});
const model = new GeminiProvider({ apiKey: "offline-fixture", model: definition.model.model, fetchImpl, maxRetries: 0 });
const sessions = new InMemorySessionStore();
const runtime = new AgentRuntime({
  definition,
  sessions,
  model,
  harness: new NativeAgentHarness(),
  tools: new ToolRegistry(),
  knowledge: new KnowledgeIndex(definition.knowledge),
  ids: createDeterministicIds(),
  clock: createFixedClock(),
});

const sessionId = await runtime.createSession("gemini-native-demo");
const result = await runtime.runTurn({ sessionId, message: "What is the Acme project limit?" });
console.log(result.reply);
console.log(`iterations=${result.events.filter((event) => event.type === "AgentIterationStarted").length}`);
console.log(`knowledge_calls=${result.events.filter((event) => event.type === "KnowledgeRetrieved").length}`);
