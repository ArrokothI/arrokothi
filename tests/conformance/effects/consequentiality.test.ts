/**
 * Consequentiality: a baseline property of the operation, not a policy opinion.
 *
 * The question it answers: if this operation is dispatched and its response is lost, could
 * assuming failure and retrying duplicate or alter an externally meaningful effect? `weather.get`
 * is normally safe to retry blind - `world.move` and `payment.charge` are not. That is a fact about
 * the capability operation, not about who is asking or what an authorization decision currently
 * permits, so a controller cannot declare its own action harmless and a decision cannot declare a
 * genuinely consequential operation safe.
 *
 * The rule is a one-way ratchet: `effectiveConsequential = descriptorConsequential ||
 * forceConsequential`. A descriptor may only be promoted toward consequential handling by policy,
 * never relaxed away from it, and an operation nobody classified defaults to the conservative
 * reading.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { AuthorizationDecision, EffectAuthorizationRequest } from "@agent-sdk/core/ports";
import { createAllowListAuthorizer, createCapabilityCatalog, createScriptedCapabilityExecutor } from "@agent-sdk/core/reference";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@agent-sdk/core/testing";

const attempts = (capability: string, operation: string) =>
  scriptedAgentDefinition({
    id: `tries-${capability}-${operation}`,
    program: [
      { do: "use_capability", capability, operation, input: {}, requestKey: "attempt-1" },
      { do: "complete" },
    ],
  });

/** An executor whose response is always lost, so the outcome is entirely a function of consequentiality. */
const lossyExecutor = () =>
  createScriptedCapabilityExecutor({
    fallback: () => {
      throw new Error("response lost after the request was accepted");
    },
  });

describe("consequentiality belongs to the capability operation", () => {
  test("world.move is consequential by descriptor; a lost response is unknown, never a definite failure", async () => {
    const catalog = createCapabilityCatalog([{ capability: "world.move", operation: "move", consequential: true }]);
    const { harness, definitions } = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "world.move", operations: ["move"] }] }),
      capabilityCatalog: catalog,
      capabilities: lossyExecutor(),
    });
    const ref = await definitions.save(attempts("world.move", "move"));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(
      progress.seenKinds,
      ["capability.unknown"],
      "movement may have happened before the response was lost; retrying blind could move it twice",
    );
  });

  test("weather.get is non-consequential by descriptor; a lost response is a definite failure", async () => {
    const catalog = createCapabilityCatalog([{ capability: "weather.get", operation: "current", consequential: false }]);
    const { harness, definitions } = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "weather.get", operations: ["current"] }] }),
      capabilityCatalog: catalog,
      capabilities: lossyExecutor(),
    });
    const ref = await definitions.save(attempts("weather.get", "current"));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(
      progress.seenKinds,
      ["capability.failed"],
      "reading the weather again is always safe; nothing about a lost response is ambiguous",
    );
    assert.equal((progress.observations[0] as { retryable: boolean }).retryable, true);
  });

  test("a descriptor-declared consequential operation cannot be downgraded by an authorization decision", async () => {
    const catalog = createCapabilityCatalog([{ capability: "world.move", operation: "move", consequential: true }]);
    // A decision that tries to say "treat this as safe" anyway. The type has no field that would
    // even express that, so this is what an authorizer's answer looks like when it tries.
    const downgrading = {
      authorize: (): AuthorizationDecision => ({
        decision: "allow",
        grantId: "grant_1",
        constraints: { resources: [] },
      }),
    };
    const { harness, definitions } = createTestHarness({
      authorizer: downgrading,
      capabilityCatalog: catalog,
      capabilities: lossyExecutor(),
    });
    const ref = await definitions.save(attempts("world.move", "move"));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.unknown"], "the descriptor's baseline held regardless of what policy wanted");
  });

  test("policy may promote a non-consequential operation, but never relax a consequential one", async () => {
    // weather.get: non-consequential by descriptor, promoted by policy.
    const promoted = createTestHarness({
      authorizer: createAllowListAuthorizer({
        grants: [{ capability: "weather.get", operations: ["current"], forceConsequential: true }],
      }),
      capabilityCatalog: createCapabilityCatalog([{ capability: "weather.get", operation: "current", consequential: false }]),
      capabilities: lossyExecutor(),
    });
    const promotedRef = await promoted.definitions.save(attempts("weather.get", "current"));
    const promotedHandle = await promoted.harness.createExecution({ definition: promotedRef });
    await promoted.harness.runUntilIdle();
    const promotedProgress = readScriptedProgress(
      (await promoted.harness.inspect(promotedHandle.executionId))!.control.progress,
    );
    assert.deepEqual(
      promotedProgress.seenKinds,
      ["capability.unknown"],
      "policy is allowed to be more careful than the descriptor's baseline",
    );

    // world.move: consequential by descriptor. Asking to promote it further changes nothing, because
    // there is no direction left to promote it in, and there is no way to ask for the opposite.
    const alreadyConsequential = createTestHarness({
      authorizer: createAllowListAuthorizer({
        grants: [{ capability: "world.move", operations: ["move"], forceConsequential: true }],
      }),
      capabilityCatalog: createCapabilityCatalog([{ capability: "world.move", operation: "move", consequential: true }]),
      capabilities: lossyExecutor(),
    });
    const consequentialRef = await alreadyConsequential.definitions.save(attempts("world.move", "move"));
    const consequentialHandle = await alreadyConsequential.harness.createExecution({ definition: consequentialRef });
    await alreadyConsequential.harness.runUntilIdle();
    const consequentialProgress = readScriptedProgress(
      (await alreadyConsequential.harness.inspect(consequentialHandle.executionId))!.control.progress,
    );
    assert.deepEqual(consequentialProgress.seenKinds, ["capability.unknown"]);
  });

  test("an unclassified operation defaults to consequential", async () => {
    // No capabilityCatalog at all: nothing is classified.
    const { harness, definitions } = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "custom.unclassified", operations: ["run"] }] }),
      capabilities: lossyExecutor(),
    });
    const ref = await definitions.save(attempts("custom.unclassified", "run"));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(
      progress.seenKinds,
      ["capability.unknown"],
      "an operation nobody classified is treated as though retrying it could duplicate a real effect",
    );
  });

  test("a catalog that classifies other operations still defaults the unclassified ones to consequential", async () => {
    const catalog = createCapabilityCatalog([{ capability: "weather.get", operation: "current", consequential: false }]);
    const { harness, definitions } = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "world.move", operations: ["move"] }] }),
      capabilityCatalog: catalog,
      capabilities: lossyExecutor(),
    });
    const ref = await definitions.save(attempts("world.move", "move"));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.unknown"], "a gap in the catalog is not read as 'safe'");
  });

  test("a controller cannot declare its own operation harmless", async () => {
    // UseCapabilityProposal simply has no field for this. Prove it structurally: a proposal built
    // from a plain object carrying an extra "consequential" property is unaffected by it, because
    // nothing downstream ever reads such a field off the proposal.
    const catalog = createCapabilityCatalog([{ capability: "world.move", operation: "move", consequential: true }]);
    let captured: EffectAuthorizationRequest | null = null;
    const capturingAuthorizer = {
      authorize: (request: EffectAuthorizationRequest): AuthorizationDecision => {
        captured = request;
        return { decision: "allow", grantId: "grant_1" };
      },
    };
    const { harness, definitions } = createTestHarness({
      authorizer: capturingAuthorizer,
      capabilityCatalog: catalog,
      capabilities: lossyExecutor(),
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "self-declares-harmless",
        program: [
          {
            do: "use_capability",
            capability: "world.move",
            operation: "move",
            // A model-authored payload attempting to smuggle a claim of harmlessness into `input`.
            input: { consequential: false, direction: "east" },
            requestKey: "attempt-1",
          },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.ok(captured, "the authorizer ran");
    assert.deepEqual(
      Object.keys(captured! as object).sort(),
      ["activationId", "definition", "effectId", "effectKind", "ownerExecutionId", "proposal", "requestedAt", "rootExecutionId", "executionId"].sort(),
      "the proposal is opaque data to the gateway; there is no separate 'consequential' channel for a controller to write",
    );
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(
      progress.seenKinds,
      ["capability.unknown"],
      "a value the model put inside `input` never reaches the effective-consequentiality computation",
    );
  });
});
