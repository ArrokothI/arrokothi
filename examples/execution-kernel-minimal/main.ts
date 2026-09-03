/**
 * Runs the same application twice, changing exactly one thing: the Effect policy.
 *
 *   node --experimental-strip-types examples/execution-kernel-minimal/main.ts
 *
 * Deterministic and offline. No API key, no network, no clock, no timer.
 *
 * The point of running it twice is that the definition, the exposure request, the operation
 * ceiling, the catalog, the executor, and the model script are byte-identical across both runs. The
 * only difference is whether an `EffectAuthorizer` was configured, so every difference in what
 * happened is attributable to the Harness and to nothing else.
 *
 * Watch the last two lines of each run together. The answer is the same sentence both times, because
 * the scripted model is the same; the journal is not. In the second run nothing was dispatched and
 * no executor ran, and the model said it anyway - which is exactly why a model's prose is not
 * evidence that an action occurred.
 */

import { effectRequestsIn } from "@arrokothi/core/execution";
import type { ExecutionId } from "@arrokothi/core/execution";
import { createApp, handbookAuthorizer, modelScript } from "./app.ts";
import type { App } from "./app.ts";

const QUESTION = "What is our refund policy?";

async function report(label: string, app: App, executionId: ExecutionId): Promise<void> {
  const context = await app.settle(executionId);
  const journal = await app.harness.effectJournalOf(executionId);
  const requested = effectRequestsIn(journal);
  const phases = journal.map((entry) => entry.phase);
  const emissions = await app.harness.emissionsOf(executionId);
  const answers = emissions.flatMap((emission) => (emission.body.kind === "text" ? [emission.body.text] : []));
  // What the model was actually shown before it answered: the observation the Harness produced.
  const shown = app.provider.requests.at(-1)?.messages.at(-1)?.content ?? "(nothing)";

  console.log(`\n--- ${label} ---`);
  console.log(`  lifecycle        ${context?.lifecycle ?? "(gone)"}`);
  console.log(`  Effects proposed ${requested.length}`);
  console.log(`  journal phases   ${phases.join(" -> ")}`);
  console.log(`  model was shown  ${shown}`);
  console.log(`  answer           ${answers.at(-1) ?? "(none)"}`);
}

// Run 1: one operation authorized. The Effect is proposed, authorized, dispatched, and settles.
const permitted = createApp({ authorizer: handbookAuthorizer(), modelSteps: [...modelScript()] });
await report("authorized: policy allows docs.search", permitted, await permitted.start(QUESTION));

// Run 2: the same script, and no authorizer at all. The Harness falls back to denying every Effect,
// the Agent is shown `effect.denied`, and nothing reaches the executor - the handbook is never read.
const unconfigured = createApp({ modelSteps: [...modelScript()] });
await report("deny-by-default: no EffectAuthorizer configured", unconfigured, await unconfigured.start(QUESTION));

console.log(
  "\nSame definition, same ceiling, same exposure, same model script, same answer.\n" +
    "Requesting an Effect is never permission to perform it,\n" +
    "and what the model says is never evidence that it happened.\n",
);
