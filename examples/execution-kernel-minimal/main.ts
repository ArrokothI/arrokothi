/**
 * Runs the same application twice, changing exactly one thing: the Effect policy.
 *
 *   node --experimental-strip-types examples/execution-kernel-minimal/main.ts
 *
 * Deterministic and offline. No API key, no network, no clock, no timer.
 *
 * The point of running it twice is that the definition, the exposure request, the operation
 * ceiling, the catalog, the executor, and the model script are byte-identical across both runs.
 * The only difference is whether an `EffectAuthorizer` was configured, so the difference in what
 * happened is attributable to the Harness and to nothing else.
 */

import { effectRequestsIn } from "@arrokothi/core/execution";
import type { ExecutionId } from "@arrokothi/core/execution";
import { createApp, deniedScript, handbookAuthorizer, modelScript } from "./app.ts";
import type { App } from "./app.ts";

const QUESTION = "What is our refund policy?";

async function report(label: string, app: App, executionId: ExecutionId): Promise<void> {
  const context = await app.settle(executionId);
  const journal = await app.harness.effectJournalOf(executionId);
  const requested = effectRequestsIn(journal);
  const phases = journal.map((entry) => entry.phase);
  const emissions = await app.harness.emissionsOf(executionId);
  const answers = emissions.flatMap((emission) => (emission.body.kind === "text" ? [emission.body.text] : []));

  console.log(`\n--- ${label} ---`);
  console.log(`  lifecycle        ${context?.lifecycle ?? "(gone)"}`);
  console.log(`  Effects proposed ${requested.length}`);
  console.log(`  journal phases   ${phases.join(" -> ")}`);
  console.log(`  answer           ${answers.at(-1) ?? "(none)"}`);
}

// Run 1: one operation authorized. The Effect is proposed, authorized, dispatched, and settles.
const permitted = createApp({ authorizer: handbookAuthorizer(), modelSteps: [...modelScript()] });
await report("authorized: policy allows docs.search", permitted, await permitted.start(QUESTION));

// Run 2: no authorizer at all. The Harness falls back to denying every Effect, the Agent observes
// `effect.denied`, and it must answer without claiming it looked anything up. Nothing reached the
// executor, so the handbook was never read.
const unconfigured = createApp({ modelSteps: [...deniedScript()] });
await report("deny-by-default: no EffectAuthorizer configured", unconfigured, await unconfigured.start(QUESTION));

console.log(
  "\nSame definition, same ceiling, same exposure, same model script.\n" +
    "Requesting an Effect is never permission to perform it.\n",
);
