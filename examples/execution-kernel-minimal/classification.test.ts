import assert from "node:assert/strict";
import { test } from "node:test";
import { ModelProviderRegistry, ScriptedModelProvider, StaticModelResolver, portableModelFeatures } from "@arrokothi/core/reference";
import { startClassification } from "./classification.ts";
import { settleOffline } from "./settle.ts";

for (const label of ["ready", "needs_review"]) {
  test(`a bounded LLM Stage selects the declared ${label} branch and records an exact category`, async () => {
    const provider = new ScriptedModelProvider({ id: "scripted", steps: [{ output: { structured: { transition: label, result: "The supplied draft fits this category." } } }] });
    const models = {
      resolver: new StaticModelResolver({ primary: { provider: provider.id, model: "offline", portableFeatures: portableModelFeatures({ structuredOutput: true }) } }),
      providers: new ModelProviderRegistry([provider]),
    };
    const { harness, executionId } = await startClassification(models, "An ordinary draft");
    assert.equal((await settleOffline(harness, executionId)).lifecycle, "COMPLETED");
    const [emission] = await harness.emissionsOf(executionId);
    assert.ok(emission?.body.kind === "text");
    assert.deepEqual(JSON.parse(emission.body.text), { category: label, reason: "The supplied draft fits this category." });
    assert.equal(provider.invocationCount, 1);
    assert.equal((await harness.effectJournalOf(executionId)).length, 0);
    assert.match(provider.requests[0]?.messages.at(-1)?.content ?? "", /An ordinary draft/);
  });
}
