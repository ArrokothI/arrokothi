import { resolve } from "node:path";
import { liveModelEnvironment } from "../shared/model.ts";
import { runArrokothaiSmoke } from "../shared/raw-run.ts";
import { computeWallVolume, computeWallVolumeExecutor, createCraigAgent } from "./application.ts";

const model = liveModelEnvironment();
const outputArg = process.argv.find((arg) => arg.startsWith("--output="))?.slice("--output=".length);
const outputFile = resolve(outputArg ?? "benchmarks/benchmark-rebuild-v1/results/p01-arrokothai-smoke.json");

const artifact = await runArrokothaiSmoke({
  applicationId: "p01",
  scenarioId: "p01-representative-project-scope",
  definition: createCraigAgent(model.policy),
  turns: [{
    content: "I'm planning a cast-in-situ garden studio. The net wall area is 420 square feet and the wall will be 10 inches thick. What material volume should I plan for, and how long should curing take?",
  }],
  executors: { [computeWallVolume.name]: computeWallVolumeExecutor },
  projectState: (state) => ({
    project_type: state.memory["project_type"]?.value,
    wall_area_sq_ft: state.memory["wall_area_sq_ft"]?.value,
    wall_thickness_in: state.memory["wall_thickness_in"]?.value,
    install_method: state.memory["install_method"]?.value,
    user_priority: state.memory["user_priority"]?.value,
    planning_wall_volume_m3: state.allToolResults
      .flatMap((result) => result.facts ?? [])
      .find((fact) => fact.key === "planning_wall_volume_m3")?.value,
  }),
  outputFile,
});

console.log(JSON.stringify({
  outputFile,
  model: artifact.model,
  stopReason: artifact.stopReason,
  canonicalState: artifact.canonicalState,
  assistant: artifact.conversation.at(-1)?.assistant,
}, null, 2));

