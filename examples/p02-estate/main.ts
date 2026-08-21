import {
  AgentRuntime,
  AgentHarness,
  InMemorySessionStore,
  KnowledgeIndex,
  ReferenceLoopEngine,
  ToolRegistry,
  createDeterministicIds,
  createFixedClock,
  knowledgeCapabilityName,
} from "@agent-sdk/core";
import { ScriptedModelProvider, emailDryRun } from "@agent-sdk/core/testing";
import { estateAgent, sendEstateLead } from "./agent.ts";

const model = new ScriptedModelProvider([
  {
    purpose: "plan",
    json: { memory_writes: { intent: "buy", target_location: "Manhattan", budget: 20_000_000, financing: "cash" } },
  },
  {
    purpose: "agent_loop",
    toolCalls: [{ name: knowledgeCapabilityName("record_query", "listings"), args: { filters: [{ field: "price", op: "lte", value: 20_000_000 }] } }],
  },
  {
    purpose: "agent_loop",
    text: "The Skyline Penthouse fits your $20M ceiling at $18,900,000; would you like its room details or human follow-up?",
  },
  {
    purpose: "plan",
    json: { memory_writes: { contact_name: "Taylor Kim", phone: "555-0133", contact_preference: "text" } },
  },
  {
    purpose: "agent_loop",
    toolCalls: [{ name: "send_to_team", args: { contact_name: "Taylor Kim", phone: "555-0133", contact_preference: "text", summary: "Cash buyer seeking Manhattan property up to $20M." } }],
  },
  {
    purpose: "agent_loop",
    text: "Before I send this: Taylor Kim at 555-0133, prefers text, cash buyer up to $20M in Manhattan. Shall I send these details?",
  },
  { purpose: "plan", json: { memory_writes: {} } },
  { purpose: "agent_loop", text: "The EstatePro team has your confirmed details and can follow up by text." },
]);

const sessions = new InMemorySessionStore();
const knowledge = new KnowledgeIndex(estateAgent.knowledge);
const tools = new ToolRegistry(estateAgent.tools);

const transport = emailDryRun("success");
tools.register(sendEstateLead.name, transport);

const runtime = new AgentRuntime({
  definition: estateAgent,
  sessions,
  model,
  tools,
  knowledge,
  harness: new AgentHarness({ engine: new ReferenceLoopEngine() }),
  ids: createDeterministicIds(),
  clock: createFixedClock(),
});

const sessionId = await runtime.createSession("p02-estate-offline");
for (const message of [
  "I'm buying in Manhattan, have a $20M budget, and I'm paying cash.",
  "Please connect me with the team. I'm Taylor Kim, phone 555-0133, and I prefer text.",
  "Yes, please send those exact details.",
]) {
  const result = await runtime.runTurn({ sessionId, message });
  console.log(`user  > ${message}`);
  console.log(`agent > ${result.reply}`);
  console.log(`calls > total=${result.metrics.totalModelCalls}, preflight=${result.metrics.preflightModelCalls}, loop=${result.metrics.agentLoopModelCalls}`);
}

console.log(`handoff_dispatches=${transport.callCount}`);
