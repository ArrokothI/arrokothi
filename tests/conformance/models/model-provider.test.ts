import { describe, test } from "node:test";
import { ScriptedModelProvider, portableModelFeatures } from "@agent-sdk/core/reference";
import { modelProviderContract, type ModelProviderContractScenario } from "@agent-sdk/core/testing";
import type { ResolvedModel } from "@agent-sdk/core/ports";

const MODEL: ResolvedModel = {
  logicalRef: "primary",
  provider: "scripted",
  model: "scripted-model",
  portableFeatures: portableModelFeatures({
    capabilityCalls: true,
    structuredOutput: true,
    cancellation: true,
    usageMetadata: true,
  }),
  unavailableOptionalFeatures: [],
};

function step(scenario: ModelProviderContractScenario) {
  switch (scenario) {
    case "text":
      return { output: { text: "hello" } };
    case "structured":
      return { output: { structured: { answer: "ok" } } };
    case "capability_call":
      return { output: { capabilityCalls: [{ capability: "lookup", input: { key: "x" } }] } };
    case "metadata":
      return {
        output: { text: "hello" },
        metadata: {
          model: "provider-model",
          usage: { inputTokens: 3, outputTokens: 2, totalTokens: 5 },
          finishReason: "stop",
        },
      };
    case "invalid_response":
      return { unsafeResponse: { output: {}, metadata: { provider: "scripted", model: "scripted-model" } } };
    case "diagnostics":
      return { output: { text: "hello" }, diagnostics: { provider: { requestId: "debug-only" } } };
  }
}

describe("ModelProvider contract: scripted reference", () => {
  for (const contractCase of modelProviderContract((scenario) => ({
    provider: new ScriptedModelProvider({ id: "scripted", steps: [step(scenario)] }),
    model: MODEL,
  }))) {
    test(contractCase.name, contractCase.run);
  }
});
