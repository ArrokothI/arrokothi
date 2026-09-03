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
import { DOCS_SEARCH, createApp, deniedScript, handbookAuthorizer, modelScript, supportAgent } from "./app.ts";
import type { App } from "./app.ts";

const QUESTION = "What is our refund policy?";

async function run(app: App): Promise<{
  readonly lifecycle: string;
  readonly phases: readonly string[];
  readonly proposals: number;
  readonly answer: string | undefined;
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
    assert.match(result.answer ?? "", /supervisor/, "the Agent answered from the handbook result");
  });

  test("deny-by-default: with no authorizer the same request is refused and nothing dispatches", async () => {
    const result = await run(createApp({ modelSteps: [...deniedScript()] }));

    assert.equal(result.proposals, 1, "the controller still proposed - requesting is not permission");
    assert.ok(result.phases.includes("denied"), `denied, got ${result.phases.join(",")}`);
    assert.equal(result.phases.includes("dispatch_started"), false, "nothing reached the executor");
    assert.equal(result.phases.includes("completed"), false, "and nothing completed");
    assert.doesNotMatch(result.answer ?? "", /supervisor/, "and the Agent quoted no policy it never read");
  });

  test("the two runs differ only in policy, so the difference is attributable to the Harness", async () => {
    const permitted = await run(createApp({ authorizer: handbookAuthorizer(), modelSteps: [...modelScript()] }));
    const unconfigured = await run(createApp({ modelSteps: [...deniedScript()] }));

    assert.equal(permitted.proposals, unconfigured.proposals, "the same Effect was proposed both times");
    assert.notDeepEqual(permitted.phases, unconfigured.phases, "and only the journal diverged");
  });
});
