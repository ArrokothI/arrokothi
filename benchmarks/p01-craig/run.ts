import { chooseProvider, describeUsage } from "../shared/provider.ts";
import { runBenchmark } from "../shared/runner.ts";
import { craigBenchmarkAgent } from "./agent.ts";
import { EXECUTABLE_SCENARIOS } from "./scenarios.ts";

/**
 * P01 / Craig runner.
 *
 *   node --experimental-strip-types benchmarks/p01-craig/run.ts          # adapter self-check
 *   GEMINI_API_KEY=... node --experimental-strip-types benchmarks/p01-craig/run.ts --live
 */

if (process.argv.includes("--help")) {
  console.log(describeUsage("benchmarks/p01-craig/run.ts"));
  process.exit(0);
}

const choice = chooseProvider(process.argv);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

console.log(`\nP01 / Craig - ${choice.label}`);
console.log(`${EXECUTABLE_SCENARIOS.length} executable scenarios, pace ${choice.paceMs}ms\n`);
if (choice.mode === "harness_selfcheck") {
  console.log("  NOTE: no model is being consulted. These grades measure the ADAPTER, not the agent.\n");
}

await runBenchmark({
  project: "P01-CRAIG",
  runId: `P01-${choice.mode}-${stamp}`,
  label: choice.label,
  mode: choice.mode,
  agent: craigBenchmarkAgent,
  scenarios: EXECUTABLE_SCENARIOS,
  makeProvider: () => choice.make(),
  paceMs: choice.paceMs,
  outputFile: `p01-craig-${choice.mode}.json`,
});
