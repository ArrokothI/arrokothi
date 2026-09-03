/**
 * The Agent definition is authored data, and validation is what makes that true.
 *
 * The claim is not "we did not put a provider client in the spec". It is that a definition *cannot*
 * carry one: the spec is checked at authoring, at deserialization, and at store time; unknown fields
 * are refused rather than carried along; and the whole definition still has to survive a JSON round
 * trip unchanged. What is left is a logical model, instructions, bounds, and a request to expose
 * some operations - all of which are semantics, none of which is deployment.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  defineAgent,
  deserializeDefinition,
  InvalidDefinitionError,
  serializeDefinition,
  validateAgentSpec,
  validateDefinition,
} from "@arrokothi/core/execution";

describe("Agent definitions declare real, portable Agent semantics", () => {
  test("a well-formed spec validates and keeps exactly what was authored", () => {
    const definition = defineAgent({
      id: "researcher",
      spec: {
        model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } },
        instructions: "Search before answering.",
        operations: { refs: [{ capability: "docs", operation: "search" }], groups: ["research"], maxOperations: 3 },
        limits: { maxModelCalls: 4, maxOperationCallsPerStep: 2, maxContextMessages: 20 },
        completion: "complete_on_response",
      },
    });

    assert.equal(definition.kind, "agent");
    assert.equal(definition.spec.model.logicalRef, "primary");
    assert.equal(definition.spec.instructions, "Search before answering.");
    assert.deepEqual(definition.spec.operations?.refs, [{ capability: "docs", operation: "search" }]);
    assert.deepEqual(definition.spec.limits, { maxModelCalls: 4, maxOperationCallsPerStep: 2, maxContextMessages: 20 });
    assert.equal(definition.spec.completion, "complete_on_response");
  });

  test("logical model, instructions, bounds, and exposure round-trip through JSON", () => {
    const definition = defineAgent({
      id: "round-trip",
      spec: {
        model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "optional" } },
        instructions: "Be exact.",
        operations: { groups: ["research", "outreach"], maxOperations: 5 },
        limits: { maxModelCalls: 2 },
      },
    });

    const restored = deserializeDefinition(serializeDefinition(definition));
    assert.deepEqual(restored, definition, "every authored field survives unchanged");
    // And the serialized bytes name nothing about a deployment.
    assert.doesNotMatch(serializeDefinition(definition), /apiKey|providerId|credential|endpoint|sdkClient/);
  });

  test("a spec that is not an Agent spec is unpublishable", () => {
    assert.throws(() => defineAgent({ id: "no-model", spec: { instructions: "hi" } as never }), InvalidDefinitionError);
    assert.throws(
      () => defineAgent({ id: "no-instructions", spec: { model: { logicalRef: "p", requirements: { text: true } } } as never }),
      InvalidDefinitionError,
    );

    const named = validateDefinition({
      id: "named-provider",
      version: 1,
      kind: "agent",
      spec: { model: { logicalRef: "primary", requirements: { text: true }, provider: "some-vendor" }, instructions: "x" },
    });
    assert.equal(named.ok, false);
    assert.ok(
      !named.ok && named.issues.some((issue) => issue.path === "spec.model.provider"),
      "a definition names a logical role, never a deployment",
    );
  });

  test("provider clients, executors, catalogs, and grants cannot be embedded as runtime semantics", () => {
    // Structural: a live object fails the definition's plain-JSON rule outright.
    assert.throws(
      () =>
        defineAgent({
          id: "leaky",
          spec: {
            model: { logicalRef: "primary", requirements: { text: true } },
            instructions: "x",
            client: new (class ProviderClient {})(),
          } as never,
        }),
      InvalidDefinitionError,
    );

    // Semantic: even as plain data, a catalog, an authority grant, an Active View, a projection, a
    // provider tool schema, and an executor reference are all owned by other layers, and an Agent
    // spec has nowhere to put them.
    for (const field of ["catalog", "authority", "grants", "activeView", "projection", "tools", "executor", "credentials"]) {
      const result = validateAgentSpec({
        model: { logicalRef: "primary", requirements: { text: true } },
        instructions: "x",
        [field]: field === "grants" ? [] : {},
      });
      assert.equal(result.ok, false, `an Agent spec must refuse "${field}"`);
      assert.ok(!result.ok && result.issues.some((issue) => issue.code === "unknown_field"));
    }
  });

  test("an exposure request carries identities, never descriptors or grants", () => {
    const withDescriptor = validateAgentSpec({
      model: { logicalRef: "primary", requirements: { text: true } },
      instructions: "x",
      operations: {
        refs: [{ capability: "docs", operation: "search", description: "Search things.", consequential: false }],
      },
    });
    assert.equal(withDescriptor.ok, false);
    assert.ok(
      !withDescriptor.ok &&
        withDescriptor.issues.some((issue) => issue.path === "spec.operations.refs[0].description"),
      "a ref names an operation; description and consequentiality belong to the catalog",
    );

    const withGrant = validateAgentSpec({
      model: { logicalRef: "primary", requirements: { text: true } },
      instructions: "x",
      operations: { refs: [], allow: true },
    });
    assert.equal(withGrant.ok, false, "there is no field in an exposure request that grants anything");
  });

  test("bounds are integers and are separate from authority", () => {
    for (const limits of [{ maxModelCalls: 0 }, { maxModelCalls: 1.5 }, { unknownBudget: 3 }]) {
      const result = validateAgentSpec({
        model: { logicalRef: "primary", requirements: { text: true } },
        instructions: "x",
        limits,
      });
      assert.equal(result.ok, false, `${JSON.stringify(limits)} must be refused`);
    }
  });
});
