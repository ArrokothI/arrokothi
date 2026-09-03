import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { LogicalModelRequest, ModelProviderRequest } from "@arrokothi/core/ports";
import {
  ModelProviderRegistry,
  ScriptedModelProvider,
  StaticModelResolver,
  portableModelFeatures,
} from "@arrokothi/core/reference";

describe("portable model execution", () => {
  test("runs one semantic request against two providers without changing its logical ref", async () => {
    const semantic: LogicalModelRequest = {
      logicalRef: "primary",
      requirements: { text: true, usageMetadata: "required" },
    };
    const features = portableModelFeatures({ usageMetadata: true });
    const resolverA = new StaticModelResolver({ primary: { provider: "provider-a", model: "model-a", portableFeatures: features } });
    const resolverB = new StaticModelResolver({ primary: { provider: "provider-b", model: "model-b", portableFeatures: features } });
    const providerA = new ScriptedModelProvider({
      id: "provider-a",
      steps: [{ output: { text: "portable" }, metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }],
    });
    const providerB = new ScriptedModelProvider({
      id: "provider-b",
      steps: [{
        output: { text: "portable" },
        metadata: { usage: { inputTokens: 1, outputTokens: 1 } },
        diagnostics: { provider: { host: "different" } },
      }],
    });
    const registry = new ModelProviderRegistry([providerA, providerB]);

    const invoke = async (resolver: StaticModelResolver) => {
      const resolved = await resolver.resolve(semantic);
      const request: ModelProviderRequest = {
        model: resolved,
        requirements: semantic.requirements,
        system: "Return portable text.",
        messages: [{ role: "user", content: "Go." }],
      };
      return registry.providerFor(resolved).generate(request);
    };

    const [a, b] = await Promise.all([invoke(resolverA), invoke(resolverB)]);
    assert.equal(resolverA.requests[0]?.logicalRef, "primary");
    assert.equal(resolverB.requests[0]?.logicalRef, "primary");
    assert.deepEqual(a.output, b.output);
    assert.deepEqual(a.metadata.usage, b.metadata.usage);
    assert.notDeepEqual(a.diagnostics, b.diagnostics);
  });

  test("required portable feature negotiation behaves equivalently across providers", async () => {
    for (const provider of ["gemini", "groq"] as const) {
      const resolver = new StaticModelResolver({
        primary: {
          provider,
          model: `${provider}-model`,
          portableFeatures: portableModelFeatures({ structuredOutput: true }),
        },
      });
      const resolved = await resolver.resolve({
        logicalRef: "primary",
        requirements: { text: true, structuredOutput: "required" },
      });
      assert.equal(resolved.portableFeatures.structuredOutput, true);
      assert.deepEqual(resolved.unavailableOptionalFeatures, []);
    }
  });
});
