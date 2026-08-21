import { chooseProvider, describeUsage } from "../shared/provider.ts";
import { runBenchmark } from "../shared/runner.ts";
import { makeEstateBenchmarkAgent } from "./agent.ts";
import { EXECUTABLE_SCENARIOS } from "./scenarios.ts";

/**
 * P02 / EstatePro runner.
 *
 *   node --experimental-strip-types benchmarks/p02-estate/run.ts          # adapter self-check
 *   GEMINI_API_KEY=... node --experimental-strip-types benchmarks/p02-estate/run.ts --live
 *
 * No real email is ever delivered in either mode: the transport is injected per scenario and only
 * records the payload it was handed.
 */

if (process.argv.includes("--help")) {
  console.log(describeUsage("benchmarks/p02-estate/run.ts"));
  process.exit(0);
}

const choice = chooseProvider(process.argv);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

console.log(`\nP02 / EstatePro - ${choice.label}`);
console.log(`${EXECUTABLE_SCENARIOS.length} executable scenarios, pace ${choice.paceMs}ms`);
console.log("Handoff transport is a benchmark-only dry run. No external email is ever sent.\n");
if (choice.mode === "harness_selfcheck") {
  console.log("  NOTE: no model is being consulted. These grades measure the ADAPTER, not the agent.\n");
}

await runBenchmark({
  project: "P02-ESTATE",
  runId: `P02-${choice.mode}-${stamp}`,
  label: choice.label,
  mode: choice.mode,
  agent: makeEstateBenchmarkAgent(),
  scenarios: EXECUTABLE_SCENARIOS,
  makeProvider: () => choice.make(),
  paceMs: choice.paceMs,
  outputFile: `p02-estate-${choice.mode}.json`,
});
