import {
  AgentRuntime,
  AgentHarness,
  InMemorySessionStore,
  KnowledgeIndex,
  ReferenceLoopEngine,
  ToolRegistry,
  createDeterministicIds,
  createFixedClock,
} from "@agent-sdk/core";
import { ScriptedModelProvider } from "@agent-sdk/core/testing";
import { computeWallVolume, computeWallVolumeExecutor, craigAgent } from "./agent.ts";

const model = new ScriptedModelProvider([
  {
    purpose: "plan",
    json: {
      memory_writes: {
        project_type: "backyard office",
        wall_area_sq_ft: 420,
        wall_thickness_in: 10,
        install_method: "precast_blocks",
        user_priority: "clean and fast installation",
      },
    },
  },
  {
    purpose: "agent_loop",
    toolCalls: [{ name: "compute_wall_volume", args: { wall_area_sq_ft: 420, wall_thickness_in: 10 } }],
  },
  {
    purpose: "agent_loop",
    text: "Your 420 sq ft of wall at 10 inches needs about 9.9 m3 of hemp-lime. Pre-cast blocks fit your clean, fast build priority; would you like to compare that with the cast-in-situ curing timeline?",
  },
]);

const tools = new ToolRegistry(craigAgent.tools);
tools.register(computeWallVolume.name, computeWallVolumeExecutor);

const sessions = new InMemorySessionStore();
const runtime = new AgentRuntime({
  definition: craigAgent,
  sessions,
  model,
  tools,
  knowledge: new KnowledgeIndex(craigAgent.knowledge),
  harness: new AgentHarness({ engine: new ReferenceLoopEngine() }),
  ids: createDeterministicIds(),
  clock: createFixedClock(),
});

const sessionId = await runtime.createSession("p01-craig-offline");
const result = await runtime.runTurn({
  sessionId,
  message: "I have 420 sq ft of wall, want 10-inch walls, and prefer a clean, fast backyard-office build.",
  hostContext: { locale: "en-US", current_site_section: "project estimator" },
});

console.log(result.reply);
console.log(`volume=${result.events.find((event) => event.type === "ToolExecutionSucceeded") ? "runtime-computed" : "missing"}`);
console.log(`model_calls=${result.metrics.totalModelCalls} (preflight=${result.metrics.preflightModelCalls}, loop=${result.metrics.agentLoopModelCalls})`);
