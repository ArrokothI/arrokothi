/**
 * Duplicate recognition: what an idempotency key is allowed to prove, and what it is not.
 *
 * `effectIdempotencyKey` indexes candidates with a non-cryptographic fingerprint. It is fast and it
 * is a fine way to narrow a search; it is not, by itself, proof that two requests are the same
 * logical operation. The gateway therefore always follows an index hit with an exact comparison of
 * the persisted request before treating anything as a duplicate - so a coincidental (or, as proven
 * here, contrived) key collision can narrow the candidate list but can never merge two distinct
 * requests.
 *
 * The other half of the same decision: identical JSON input is not automatically the same logical
 * request. `world.move(east, 5)` sent twice is ordinarily two real movements, not one deduplicated
 * one, and the generic default idempotency (`none`) reflects that. `per_input` is an opt-in
 * strategy for operations that specifically want "the same payload means the same operation",
 * not the universal model.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createPendingOperation,
  effectIdempotencyKey,
  markDispatched,
  markSettled,
  useCapability,
} from "@arrokothi/core/execution";
import type { EffectId, EventId, IdempotencyKey, PendingOperationId } from "@arrokothi/core/execution";
import { createAllowListAuthorizer, createScriptedCapabilityExecutor } from "@arrokothi/core/reference";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@arrokothi/core/testing";

/**
 * What this Execution is permitted to use at all.
 *
 * The runtime-owned ceiling, supplied when the Execution is created. It is checked again at dispatch
 * from current state, so an Execution created without one can reach no capability implementation
 * whatever a controller proposes and whatever policy would have said.
 */
const AUTHORITY = { operations: [{ capability: "knowledge.query", operation: "search" }, { capability: "mail.send", operation: "send" }, { capability: "world.move", operation: "move" }] };

const worldPolicy = () => createAllowListAuthorizer({ grants: [{ capability: "world.move", operations: ["move"] }] });

describe("duplicate recognition compares the actual request, not just its key", () => {
  test("two intentional identical operations both dispatch under the default idempotency", async () => {
    const executor = createScriptedCapabilityExecutor({
      handlers: { "world.move:move": () => ({ status: "success", observation: { moved: true } }) },
    });
    const { harness, definitions } = createTestHarness({ authorizer: worldPolicy(), capabilities: executor });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "moves-twice-on-purpose",
        program: [
          {
            do: "use_capability",
            capability: "world.move",
            operation: "move",
            input: { direction: "east", steps: 5 },
            requestKey: "move-1",
          },
          {
            do: "use_capability",
            capability: "world.move",
            operation: "move",
            input: { direction: "east", steps: 5 },
            requestKey: "move-2",
          },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 2, "identical payloads are two real moves, not one deduplicated one");
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.completed", "capability.completed"]);
    assert.equal((progress.observations[0] as { replayed: boolean }).replayed, false);
    assert.equal((progress.observations[1] as { replayed: boolean }).replayed, false, "neither is a replay of the other");
  });

  test("per_input still recognises a genuine repeat of the same logical request", async () => {
    const executor = createScriptedCapabilityExecutor({
      handlers: { "world.move:move": () => ({ status: "success", observation: { moved: true } }) },
    });
    const { harness, definitions } = createTestHarness({ authorizer: worldPolicy(), capabilities: executor });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "retries-the-same-request",
        program: [
          {
            do: "use_capability",
            capability: "world.move",
            operation: "move",
            input: { direction: "east", steps: 5 },
            requestKey: "move-1",
            idempotency: "per_input",
          },
          {
            do: "use_capability",
            capability: "world.move",
            operation: "move",
            input: { direction: "east", steps: 5 },
            requestKey: "move-2",
            idempotency: "per_input",
          },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 1, "opting in to per_input recognises the second as the same operation");
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.completed", "capability.completed"]);
    assert.equal((progress.observations[1] as { replayed: boolean }).replayed, true);
  });

  test("resource bindings are part of logical identity: same input, different resources, is not a duplicate", async () => {
    const executor = createScriptedCapabilityExecutor({
      fallback: () => ({ status: "success", observation: { hits: [] } }),
    });
    const { harness, definitions } = createTestHarness({
      authorizer: createAllowListAuthorizer({
        grants: [
          {
            capability: "knowledge.query",
            operations: ["search"],
            resources: [
              { bindingId: "knowledge://public", mode: "read" },
              { bindingId: "knowledge://internal", mode: "read" },
            ],
          },
        ],
      }),
      capabilities: executor,
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "searches-different-corpora",
        program: [
          {
            do: "use_capability",
            capability: "knowledge.query",
            operation: "search",
            input: { q: "revenue" },
            resources: ["knowledge://public"],
            requestKey: "s1",
            idempotency: "per_input",
          },
          {
            do: "use_capability",
            capability: "knowledge.query",
            operation: "search",
            input: { q: "revenue" },
            resources: ["knowledge://internal"],
            requestKey: "s2",
            idempotency: "per_input",
          },
          { do: "complete" },
        ],
      }),
    );
    await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    assert.equal(
      executor.callCount,
      2,
      "the same query against a different resource binding is materially different external access",
    );
  });

  test("a forced idempotency-key collision does not merge two different logical requests", async () => {
    // Simulates what a genuine fingerprint collision would look like, without depending on one
    // actually occurring: a prior settled operation is seeded under the exact key the *real*
    // second request will compute, but the request it actually recorded had different input. The
    // gateway must notice the mismatch and dispatch normally rather than replay the seeded result.
    const executor = createScriptedCapabilityExecutor({
      handlers: { "mail.send:send": () => ({ status: "success", observation: { messageId: "real-msg" } }) },
    });
    const { harness, definitions, store } = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "mail.send", operations: ["send"] }] }),
      capabilities: executor,
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "sends-real-mail",
        program: [
          {
            do: "use_capability",
            capability: "mail.send",
            operation: "send",
            input: { to: "team@example.com" },
            requestKey: "send-1",
            idempotency: "per_input",
          },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });

    const realProposal = useCapability({
      capability: "mail.send",
      operation: "send",
      input: { to: "team@example.com" },
      idempotency: "per_input",
    });
    const collidingKey = effectIdempotencyKey({
      scope: "per_input",
      executionId: handle.executionId,
      effectId: "eff_real" as EffectId,
      capability: realProposal.capability,
      operation: realProposal.operation,
      input: realProposal.input,
    });

    // Seed a fake, already-settled prior operation under that exact key, but with a *different*
    // recorded request (a different recipient) - the collision.
    const forgedProposal = useCapability({
      capability: "mail.send",
      operation: "send",
      input: { to: "someone-else@example.com" },
    });
    await store.transact(handle.executionId, async (tx) => {
      await tx.effectJournal.append({
        effectId: "eff_forged" as EffectId,
        executionId: handle.executionId,
        effectKind: "use_capability",
        phase: "requested",
        activationId: null,
        pendingOperationId: null,
        at: "2026-01-01T00:00:00.000Z",
        detail: { correlationId: "forged-1", requestedAt: "2026-01-01T00:00:00.000Z", proposal: forgedProposal as never },
      });
      const seeded = createPendingOperation({
        pendingOperationId: "pop_forged" as PendingOperationId,
        executionId: handle.executionId,
        effectId: "eff_forged" as EffectId,
        effectKind: "use_capability",
        correlationId: "forged-1",
        causationId: null,
        idempotencyKey: collidingKey,
        createdAt: "2026-01-01T00:00:00.000Z",
        deadline: "2026-01-01T00:00:30.000Z",
      });
      await tx.pendingOperations.insert(
        markSettled(markDispatched(seeded, "2026-01-01T00:00:00.000Z"), "success", "evt_forged" as EventId, "2026-01-01T00:00:01.000Z"),
      );
      await tx.effectJournal.append({
        effectId: "eff_forged" as EffectId,
        executionId: handle.executionId,
        effectKind: "use_capability",
        phase: "completed",
        activationId: null,
        pendingOperationId: "pop_forged" as PendingOperationId,
        at: "2026-01-01T00:00:01.000Z",
        detail: { observation: { messageId: "forged-msg" }, resultEventId: "evt_forged" },
      });
    });

    await harness.runUntilIdle();

    assert.equal(executor.callCount, 1, "the real request was actually dispatched, not silently replayed");
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.completed"]);
    const observed = progress.observations[0] as { observation: { messageId: string }; replayed: boolean };
    assert.equal(observed.replayed, false, "a colliding key did not disguise a fresh dispatch as a replay");
    assert.deepEqual(
      observed.observation,
      { messageId: "real-msg" },
      "the genuine result was observed, not the forged one sitting under the same key",
    );
  });
});
