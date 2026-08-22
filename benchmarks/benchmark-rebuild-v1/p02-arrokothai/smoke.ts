import { resolve } from "node:path";
import { liveModelEnvironment } from "../shared/model.ts";
import { runArrokothaiSmoke } from "../shared/raw-run.ts";
import { createEstateAgent, createHandoffExecutor, sendLeadToTeam } from "./application.ts";

const model = liveModelEnvironment();
const outputArg = process.argv.find((arg) => arg.startsWith("--output="))?.slice("--output=".length);
const outputFile = resolve(outputArg ?? "benchmarks/benchmark-rebuild-v1/results/p02-arrokothai-smoke.json");
const handoff = createHandoffExecutor();

const artifact = await runArrokothaiSmoke({
  applicationId: "p02",
  scenarioId: "p02-representative-property-and-handoff",
  definition: createEstateAgent(model.policy),
  turns: [
    { content: "I'm looking to buy on the Upper West Side with a budget of $20 million, at least four bedrooms, and I'm paying cash. Which recorded property matches?" },
    { content: "Please connect me with a representative about Skyline Penthouse. I'm Taylor Kim, my phone is 212-555-0133, I prefer a text tomorrow afternoon, and I don't want to share email." },
    { content: "Yes, send those exact details." },
  ],
  executors: { [sendLeadToTeam.name]: handoff.executor },
  projectState: (state) => ({
    intent: state.memory["intent"]?.value,
    target_location: state.memory["target_location"]?.value,
    budget: state.memory["budget"]?.value,
    bedrooms_needed: state.memory["bedrooms_needed"]?.value,
    financing: state.memory["financing"]?.value,
    selected_property: state.memory["selected_property"]?.value,
    contact_name: state.memory["contact_name"]?.value,
    phone: state.memory["phone"]?.value,
    email: state.memory["email"]?.value,
    contact_preference: state.memory["contact_preference"]?.value,
    best_contact_time: state.memory["best_contact_time"]?.value,
  }),
  outputFile,
});

console.log(JSON.stringify({
  outputFile,
  model: artifact.model,
  stopReason: artifact.stopReason,
  canonicalState: artifact.canonicalState,
  actionDispatchCount: artifact.actions.dispatchCount,
  assistant: artifact.conversation.at(-1)?.assistant,
}, null, 2));
