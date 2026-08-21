import {
  AgentRuntime,
  InMemorySessionStore,
  KnowledgeIndex,
  ToolRegistry,
  createDeterministicIds,
  createFixedClock,
} from "@agent-sdk/core";
import { ScriptedModelProvider } from "@agent-sdk/core/testing";
import { minimalAgent } from "./agent.ts";

/**
 * Runs the minimal agent end to end with a scripted model, so it needs no API key and no network.
 *
 * Swap `ScriptedModelProvider` for `GeminiProvider` and this same code talks to a real model - that
 * substitutability is the whole point of the provider interface.
 *
 *   node --experimental-strip-types examples/minimal-agent/main.ts
 */

const model = new ScriptedModelProvider([
  { purpose: "plan", json: { memory_writes: { problem_summary: "checkout page returns a 500 for card payments", severity: "high" } } },
  { purpose: "respond", text: "That sounds disruptive. Roughly how many people are hitting it?" },
  { purpose: "plan", json: { memory_writes: { affected_users: "about 40" } } },
  { purpose: "respond", text: "Understood. When did you first notice it?" },
  { purpose: "plan", json: { memory_writes: { affected_users: 40, first_noticed: "this morning around 9am" } } },
  { purpose: "respond", text: "Thanks - I have enough for a colleague to pick this up: a high-severity checkout failure affecting about 40 people since 9am." },
]);

const definition = minimalAgent;
const sessions = new InMemorySessionStore();
const runtime = new AgentRuntime({
  definition,
  sessions,
  model,
  tools: new ToolRegistry(definition.tools),
  knowledge: new KnowledgeIndex(definition.knowledge),
  ids: createDeterministicIds(),
  clock: createFixedClock(),
});

const sessionId = await runtime.createSession("demo");
const turns = [
  { message: "Our checkout is throwing a 500 whenever anyone pays by card. It's bad.", hostContext: { plan_tier: "enterprise", current_page: "/checkout", account_secret: "never-show-this" } },
  { message: "Maybe forty people so far." },
  { message: "It started this morning, around nine." },
];

for (const turn of turns) {
  const result = await runtime.runTurn({ sessionId, ...turn });
  console.log(`\nuser  > ${turn.message}`);
  console.log(`agent > ${result.reply}`);
}

const state = await runtime.loadState(sessionId);

console.log("\n--- structured memory (validated, authoritative) ---");
for (const entry of Object.values(state.memory)) {
  const normalized = entry.normalized ? "  [normalized from the model's raw output]" : "";
  console.log(`  ${entry.key.padEnd(16)} ${JSON.stringify(entry.value)}${normalized}`);
}

// "about 40" was proposed for a number field on turn 2 and REJECTED; turn 3's clean 40 committed.
// Both are in the stream, which is what makes the model's miss visible rather than mysterious.
const events = await sessions.readEvents(sessionId);
const rejected = events.filter((e) => e.type === "MemoryWriteRejected");
console.log(`\n--- rejected proposals (${rejected.length}) ---`);
for (const event of rejected) {
  if (event.type !== "MemoryWriteRejected") continue;
  console.log(`  ${event.payload.key} = ${JSON.stringify(event.payload.value)}`);
  console.log(`    reason: ${event.payload.reason}`);
}

console.log("\n--- the runtime_only secret never reached the model ---");
const lastContext = (await runtime.runTurn({ sessionId, message: "Anything else you need?" })).contexts.at(-1);
console.log(`  compiled prompt contains "never-show-this": ${lastContext?.context.system.includes("never-show-this")}`);
console.log(`  withheld keys: ${JSON.stringify(lastContext?.context.withheldContextKeys)}`);
console.log(`\n  ${events.length} events recorded; session reconstructs from them alone.\n`);
