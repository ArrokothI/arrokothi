import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ModelInvocationError, type ResolvedModel } from "@arrokothi/core/ports";
import { portableModelFeatures } from "@arrokothi/core/reference";
import { modelProviderContract, type ModelProviderContractScenario } from "@arrokothi/core/testing";
import { GeminiModelProvider } from "../src/index.ts";

const MODEL: ResolvedModel = {
  logicalRef: "primary",
  provider: "gemini",
  model: "gemini-requested",
  portableFeatures: portableModelFeatures({
    capabilityCalls: true,
    structuredOutput: true,
    cancellation: true,
    usageMetadata: true,
  }),
  unavailableOptionalFeatures: [],
};

function payload(scenario: ModelProviderContractScenario): Record<string, unknown> {
  switch (scenario) {
    case "structured":
      return {
        candidates: [{ content: { parts: [{ text: JSON.stringify({ answer: "ok" }) }] }, finishReason: "STOP" }],
        modelVersion: "provider-model",
      };
    case "capability_call":
      return {
        candidates: [{ content: { parts: [{ functionCall: { name: "lookup", args: { key: "x" } } }] }, finishReason: "STOP" }],
        modelVersion: "provider-model",
      };
    case "metadata":
      return {
        candidates: [{ content: { parts: [{ text: "hello" }] }, finishReason: "stop" }],
        usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2 },
        modelVersion: "provider-model",
      };
    case "invalid_response":
      return { modelVersion: "provider-model" };
    case "text":
    case "diagnostics":
      return {
        candidates: [{ content: { parts: [{ text: "hello" }] }, finishReason: "STOP" }],
        modelVersion: "provider-model",
      };
  }
}

describe("ModelProvider contract: Gemini deterministic transport", () => {
  for (const contractCase of modelProviderContract((scenario) => ({
    provider: new GeminiModelProvider({
      apiKey: "test-key",
      maxRetries: 0,
      fetchImpl: async () => new Response(JSON.stringify(payload(scenario)), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    }),
    model: MODEL,
  }))) {
    test(contractCase.name, contractCase.run);
  }
});

describe("GeminiModelProvider projection and errors", () => {
  test("projects capability specs without carrying an executor or authority", async () => {
    let captured: Record<string, unknown> | undefined;
    const provider = new GeminiModelProvider({
      apiKey: "test-key",
      maxRetries: 0,
      fetchImpl: async (_url, init) => {
        captured = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ functionCall: { name: "lookup", args: { key: "x" } } }] } }],
          modelVersion: "provider-model",
        }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });

    await provider.generate({
      model: MODEL,
      requirements: { text: true, capabilityCalls: "required" },
      system: "Call lookup.",
      messages: [{ role: "user", content: "lookup x" }],
      capabilities: [{
        name: "lookup",
        description: "Read one value.",
        input: {
          kind: "object",
          fields: {
            key: { required: true, schema: { kind: "string" } },
            strictNested: { schema: { kind: "object", fields: {} } },
            openNested: { schema: { kind: "object", fields: {}, additionalProperties: true } },
          },
        },
      }],
    });

    const serialized = JSON.stringify(captured?.["tools"]);
    assert.match(serialized, /functionDeclarations/);
    assert.doesNotMatch(serialized, /executor|effect|authority|credential/i);
    const tools = captured?.["tools"] as [{
      functionDeclarations: [{
        parameters: {
          additionalProperties?: boolean;
          properties: Record<string, { additionalProperties?: boolean }>;
        };
      }];
    }];
    const parameters = tools[0].functionDeclarations[0].parameters;
    assert.equal(parameters.additionalProperties, undefined, "Gemini function declarations reject this keyword");
    assert.equal(parameters.properties["strictNested"]!.additionalProperties, undefined);
    assert.equal(parameters.properties["openNested"]!.additionalProperties, undefined);
    assert.equal(
      JSON.stringify(parameters).includes("additionalProperties"),
      false,
      "only the constrained provider projection omits it; Harness validation still uses ObjectSchema",
    );
  });

  test("normalizes authentication, rate-limit, transport, and rejection failures", async () => {
    const cases = [
      { status: 401, code: "authentication" },
      { status: 429, code: "rate_limit" },
      { status: 503, code: "transport" },
      { status: 400, code: "provider_rejected" },
    ] as const;
    for (const fixture of cases) {
      const provider = new GeminiModelProvider({
        apiKey: "test-key",
        maxRetries: 0,
        fetchImpl: async () => new Response("fixture failure", { status: fixture.status }),
      });
      await assert.rejects(
        () => provider.generate({
          model: MODEL,
          requirements: { text: true },
          system: "fixture",
          messages: [{ role: "user", content: "fixture" }],
        }),
        (error: unknown) => error instanceof ModelInvocationError && error.code === fixture.code,
      );
    }
  });
});
