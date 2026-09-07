import assert from "node:assert/strict";
import { test } from "node:test";
import { createApplication, defineAgent } from "@arrokothi/sdk";
import { createActiveOperationViewResolver, createRuntimeOperationAuthoritySource, ScriptedModelProvider, createCapabilityCatalog, portableModelFeatures } from "@arrokothi/core/reference";

test("distinct colon-bearing grants and Agent requests survive authority and view deduplication", async () => {
  const refs = [{ capability: "a:b", operation: "c" }, { capability: "a", operation: "b:c" }];
  const provider = new ScriptedModelProvider({ id: "test", steps: [{ output: { text: "done" } }] });
  const app = createApplication({
    models: { providers: [provider], bindings: { primary: { provider: provider.id, model: "test", portableFeatures: portableModelFeatures({ capabilityCalls: true }) } } },
    capabilities: { catalog: createCapabilityCatalog(refs.map(ref => ({ ...ref, consequential: false, description: "Separate operation", input: { kind: "object", fields: {} } }))), executor: { async execute() { throw new Error("No action selected"); } } },
  });
  const { executionId } = await app.start({
    definition: defineAgent({ id: "colon-names", spec: { model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } }, instructions: "Describe", operations: { refs }, completion: "complete_on_response" } }),
    operationAuthority: { operations: refs }, input: { label: "user", payload: "Describe" },
  });
  const result = await app.runUntilBlocked(executionId);
  assert.equal((await app.harness.effectiveOperationAuthorityOf(executionId))?.operations.length, 2);
  const view = await createActiveOperationViewResolver({ catalog: app.services.catalog, authority: createRuntimeOperationAuthoritySource(app.services.store) }).resolve({ executionId, exposure: { refs } });
  assert.equal(view.entries.length, 2);
  // Both are now represented honestly, so the existing projection collision check can refuse.
  assert.equal(result.execution.failure?.code, "agent_projection_ambiguous");
  assert.equal(provider.requests.length, 0);
});
