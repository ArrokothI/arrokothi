/**
 * Deterministic tests for the minimal Execution-kernel example.
 *
 * These assert the two things the example exists to demonstrate: that an authorized Effect really
 * travels the whole path, and that an unconfigured Harness really refuses it. Both run offline.
 *
 * Note the import surface here versus in `app.ts`. Application code uses only the production
 * surfaces; a *test* may legitimately use `@arrokothi/core/testing` when it needs test scaffolding.
 * This file happens not to need any, which is itself worth demonstrating.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { effectRequestsIn } from "@arrokothi/core/execution";
import { DOCS_SEARCH, createApp, handbookAuthorizer, modelScript, supportAgent } from "./app.ts";
import type { App } from "./app.ts";

const QUESTION = "What is our refund policy?";

async function run(app: App): Promise<{
  readonly lifecycle: string;
  readonly phases: readonly string[];
  readonly proposals: number;
  readonly answer: string | undefined;
  /** What the Harness put in front of the model before its final answer. */
  readonly shown: string;
}> {
  const executionId = await app.start(QUESTION);
  const context = await app.settle(executionId);
  const journal = await app.harness.effectJournalOf(executionId);
  const emissions = await app.harness.emissionsOf(executionId);
  return {
    lifecycle: context?.lifecycle ?? "(gone)",
    phases: journal.map((entry) => entry.phase),
    proposals: effectRequestsIn(journal).length,
    answer: emissions.flatMap((e) => (e.body.kind === "text" ? [e.body.text] : [])).at(-1),
    shown: String(app.provider.requests.at(-1)?.messages.at(-1)?.content ?? ""),
  };
}

describe("the minimal Execution-kernel example", () => {
  test("the definition is portable authored data with no deployment identity in it", () => {
    const definition = supportAgent();
    const serialized = JSON.stringify(definition);
    assert.equal(definition.kind, "agent");
    assert.deepEqual(definition.spec.operations?.refs, [DOCS_SEARCH]);
    for (const forbidden of ["apiKey", "providerId", "scripted", "deterministic-1"]) {
      assert.equal(serialized.includes(forbidden), false, `a definition never carries "${forbidden}"`);
    }
  });

  test("authorized: the Effect is proposed, authorized, dispatched, and settles", async () => {
    const result = await run(createApp({ authorizer: handbookAuthorizer(), modelSteps: [...modelScript()] }));

    assert.equal(result.proposals, 1, "the model selected the one exposed operation");
    assert.ok(result.phases.includes("authorized"), `authorized, got ${result.phases.join(",")}`);
    assert.equal(result.phases.includes("denied"), false, "policy allowed it");
    assert.ok(result.phases.includes("dispatch_started"), `dispatched, got ${result.phases.join(",")}`);
    assert.ok(result.phases.includes("completed"), `completed, got ${result.phases.join(",")}`);
    assert.match(result.shown, /supervisor/, "and the handbook entry is what the model was shown");
  });

  test("deny-by-default: with no authorizer the same request is refused and nothing dispatches", async () => {
    const result = await run(createApp({ modelSteps: [...modelScript()] }));

    assert.equal(result.proposals, 1, "the controller still proposed - requesting is not permission");
    assert.ok(result.phases.includes("denied"), `denied, got ${result.phases.join(",")}`);
    assert.equal(result.phases.includes("dispatch_started"), false, "nothing reached the executor");
    assert.equal(result.phases.includes("completed"), false, "and nothing completed");
    assert.doesNotMatch(result.shown, /supervisor/, "and no handbook content ever reached the model");
  });

  test("the two runs differ ONLY in policy: same script, same answer, different journal", async () => {
    const permitted = await run(createApp({ authorizer: handbookAuthorizer(), modelSteps: [...modelScript()] }));
    const unconfigured = await run(createApp({ modelSteps: [...modelScript()] }));

    // Held constant: the model's behaviour, right down to the words it produced.
    assert.equal(permitted.proposals, unconfigured.proposals, "the same Effect was proposed both times");
    assert.equal(permitted.answer, unconfigured.answer, "and the same scripted model said the same thing");

    // Diverged: only what the Harness did, and therefore what the model was shown.
    assert.notDeepEqual(permitted.phases, unconfigured.phases, "the journal is where the runs differ");
    assert.notEqual(permitted.shown, unconfigured.shown, "as is the observation the model received");
  });

  test("an identical confident answer proves nothing; the journal does", async () => {
    const unconfigured = await run(createApp({ modelSteps: [...modelScript()] }));

    assert.match(unconfigured.answer ?? "", /supervisor/, "the model asserted a policy...");
    assert.equal(unconfigured.phases.includes("dispatch_started"), false, "...having looked nothing up");
  });
});
