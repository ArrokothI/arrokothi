import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { defineAgent, serializeDefinition } from "@agent-sdk/core/execution";
import { ModelResolutionError, type LogicalModelRequest } from "@agent-sdk/core/ports";
import {
  ModelProviderRegistry,
  ScriptedModelProvider,
  StaticModelResolver,
  portableModelFeatures,
} from "@agent-sdk/core/reference";

describe("logical model resolution", () => {
  test("resolves a logical ref to observable provider/model deployment data", async () => {
    const resolver = new StaticModelResolver({
      primary: {
        provider: "gemini",
        model: "deployment-model-a",
        portableFeatures: portableModelFeatures({ structuredOutput: true, usageMetadata: true }),
        limits: { maxInputTokens: 32_000, maxOutputTokens: 4_096 },
        deploymentMetadata: { region: "us" },
      },
    });

    const resolved = await resolver.resolve({ logicalRef: "primary", requirements: { text: true } });
    assert.equal(resolved.logicalRef, "primary");
    assert.equal(resolved.provider, "gemini");
    assert.equal(resolved.model, "deployment-model-a");
    assert.equal(resolved.portableFeatures.structuredOutput, true);
    assert.deepEqual(resolved.limits, { maxInputTokens: 32_000, maxOutputTokens: 4_096 });
    assert.deepEqual(resolved.deploymentMetadata, { region: "us" });
  });

  test("the same logical ref maps to different providers under different deployment configuration", async () => {
    const gemini = new StaticModelResolver({
      primary: { provider: "gemini", model: "gemini-deployment", portableFeatures: portableModelFeatures() },
    });
    const groq = new StaticModelResolver({
      primary: { provider: "groq", model: "qwen/qwen3.8-27b", portableFeatures: portableModelFeatures() },
    });
    const semanticRequest = { logicalRef: "primary", requirements: { text: true as const } };

    assert.equal((await gemini.resolve(semanticRequest)).provider, "gemini");
    assert.equal((await groq.resolve(semanticRequest)).provider, "groq");
  });

  test("fails an unsupported required feature before provider invocation", async () => {
    const resolver = new StaticModelResolver({
      primary: { provider: "test", model: "text-only", portableFeatures: portableModelFeatures() },
    });
    const provider = new ScriptedModelProvider({ id: "test", steps: [{ output: { text: "must not run" } }] });

    await assert.rejects(
      async () => resolver.resolve({
        logicalRef: "primary",
        requirements: { text: true, structuredOutput: "required" },
      }),
      (error: unknown) => error instanceof ModelResolutionError
        && error.code === "required_feature_unsupported"
        && error.feature === "structuredOutput",
    );
    assert.equal(provider.invocationCount, 0);
  });

  test("reports missing logical mappings and unavailable concrete models distinctly", async () => {
    const resolver = new StaticModelResolver({
      offline: {
        provider: "local",
        model: "configured-but-absent",
        portableFeatures: portableModelFeatures(),
        available: false,
      },
    });
    await assert.rejects(
      async () => resolver.resolve({ logicalRef: "missing", requirements: { text: true } }),
      (error: unknown) => error instanceof ModelResolutionError && error.code === "logical_model_not_configured",
    );
    await assert.rejects(
      async () => resolver.resolve({ logicalRef: "offline", requirements: { text: true } }),
      (error: unknown) => error instanceof ModelResolutionError && error.code === "concrete_model_unavailable",
    );
  });

  test("makes optional feature absence explicit", async () => {
    const resolver = new StaticModelResolver({
      primary: { provider: "local", model: "text-only", portableFeatures: portableModelFeatures() },
    });
    const resolved = await resolver.resolve({
      logicalRef: "primary",
      requirements: { text: true, structuredOutput: "optional", usageMetadata: "optional" },
    });
    assert.deepEqual(resolved.unavailableOptionalFeatures, ["structuredOutput", "usageMetadata"]);
  });

  test("keeps provider registry lookup separate from model resolution", async () => {
    const resolver = new StaticModelResolver({
      primary: { provider: "unregistered", model: "model-a", portableFeatures: portableModelFeatures() },
    });
    const resolved = await resolver.resolve({ logicalRef: "primary", requirements: { text: true } });
    const registry = new ModelProviderRegistry([]);
    assert.throws(
      () => registry.providerFor(resolved),
      (error: unknown) => error instanceof ModelResolutionError && error.code === "provider_not_registered",
    );
  });

  test("definition-facing model data is only a logical ref plus portable requirements", () => {
    const model: LogicalModelRequest = {
      logicalRef: "primary",
      requirements: { text: true, capabilityCalls: "optional" },
    };
    const definition = defineAgent({
      id: "portable-model-definition",
      spec: { model: { logicalRef: model.logicalRef, requirements: { ...model.requirements } } },
    });
    const serialized = serializeDefinition(definition);
    assert.deepEqual(Object.keys(model).sort(), ["logicalRef", "requirements"]);
    assert.doesNotMatch(serialized, /apiKey|providerId|sdkClient|transport|credentials/);
  });

  test("represents Groq and future local mappings without hard-coding either in core", async () => {
    const resolver = new StaticModelResolver({
      reasoner: { provider: "groq", model: "qwen/qwen3.8-27b", portableFeatures: portableModelFeatures({ capabilityCalls: true }) },
      private: { provider: "local", model: "application-selected", portableFeatures: portableModelFeatures() },
    });
    assert.deepEqual(
      [
        await resolver.resolve({ logicalRef: "reasoner", requirements: { text: true } }),
        await resolver.resolve({ logicalRef: "private", requirements: { text: true } }),
      ].map(({ provider, model }) => ({ provider, model })),
      [
        { provider: "groq", model: "qwen/qwen3.8-27b" },
        { provider: "local", model: "application-selected" },
      ],
    );
  });
});
