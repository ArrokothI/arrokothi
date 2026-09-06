import assert from "node:assert/strict";
import { test } from "node:test";
import { ControllerRegistry, Harness, createAgentController, defineAgent } from "@arrokothi/core";
import { FifoScheduler, InMemoryDefinitionStore, InMemoryRuntimeStore, createDeterministicIds, createFixedClock } from "@arrokothi/core/reference";
import { geminiWiring } from "./provider-wiring.ts";
import { settleOffline } from "./settle.ts";

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
    const definitions = new InMemoryDefinitionStore();
    const harness = new Harness({
      definitions, store: new InMemoryRuntimeStore(), scheduler: new FifoScheduler(),
      clock: createFixedClock(), ids: createDeterministicIds(),
      controllers: new ControllerRegistry([createAgentController({ models: wiring.agentModels, executor: wiring[executor] })]),
    });
    const definition = await definitions.save(defineAgent({
      id: "provider-wiring", terminalResult: { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } },
      spec: { model: { logicalRef: "primary", requirements: { text: true } }, instructions: "Answer concisely.", completion: "complete_on_response" },
    }));
    const { executionId } = await harness.createExecution({ definition });
    await harness.deliverExternalInput({ destination: executionId, label: "user", payload: "Hello" });
    const context = await settleOffline(harness, executionId);
    assert.equal(context.lifecycle, "COMPLETED");
    assert.equal(context.terminalResult?.value, "A verified response");
    assert.equal(requests, 1);
  });
}
