import assert from "node:assert/strict";
import { test } from "node:test";
import { createApplication, defineAgent } from "@arrokothi/sdk";
import { geminiWiring } from "./provider-wiring.ts";

for (const executor of ["referenceExecutor", "strandsExecutor"] as const) {
  test(`Gemini provider wiring via ${executor} executes offline with a fake HTTP transport`, async () => {
    let requests = 0;
    const wiring = geminiWiring({
      apiKey: "offline-test-key", model: "offline-test-model",
      fetchImpl: async () => {
        requests++;
        return new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: "A verified response" }] }, finishReason: "STOP" }] }), { status: 200 });
      },
    });
    const app = createApplication({ models: wiring.models, controllers: () => ({ agent: { executor: wiring[executor] } }) });
    const definition = defineAgent({
      id: "provider-wiring", terminalResult: { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } },
      spec: { model: { logicalRef: "primary", requirements: { text: true } }, instructions: "Answer concisely.", completion: "complete_on_response" },
    });
    const { executionId } = await app.start({ definition, input: { label: "user", payload: "Hello" } });
    const { execution: context } = await app.runUntilBlocked(executionId);
    assert.equal(context.lifecycle, "COMPLETED");
    assert.equal(context.terminalResult?.value, "A verified response");
    assert.equal(requests, 1);
  });
}
