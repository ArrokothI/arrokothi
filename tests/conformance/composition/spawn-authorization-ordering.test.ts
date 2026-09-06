/**
 * Spawn authorization happens before child-Definition resolution.
 *
 * A caller with no `SpawnExecution` authority must not be able to use the Effect as a
 * Definition-existence oracle: whether it names a real child Definition or a made-up one, a
 * policy-denied spawn must produce the same denial - and must never query the DefinitionStore to
 * find out which. This is information-disclosure hardening on an existing authorization boundary,
 * not a new authority dimension: `docs/authority.md` already requires final authorization on the
 * concrete Effect, and this only fixes the order two already-correct checks run in.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { DefinitionId, ExecutionDefinition, ExecutionDefinitionRef } from "@arrokothi/core/execution";
import type { DefinitionStore } from "@arrokothi/core/ports";
import { InMemoryDefinitionStore } from "@arrokothi/core/reference";
import { agent, executionCount, noSpawn, permissive, rig } from "./fixtures.ts";

/** Delegates every read/write to a real store while counting resolution reads. */
class CountingDefinitionStore implements DefinitionStore {
  private readonly inner = new InMemoryDefinitionStore();
  getVersionCalls = 0;

  save(definition: ExecutionDefinition): Promise<ExecutionDefinitionRef> {
    return this.inner.save(definition);
  }
  get(ref: ExecutionDefinitionRef): Promise<ExecutionDefinition | undefined> {
    return this.inner.get(ref);
  }
  getVersion(id: DefinitionId, version: number): Promise<ExecutionDefinition | undefined> {
    this.getVersionCalls += 1;
    return this.inner.getVersion(id, version);
  }
  getLatest(id: DefinitionId): Promise<ExecutionDefinition | undefined> {
    return this.inner.getLatest(id);
  }
  listVersions(id: DefinitionId): Promise<readonly number[]> {
    return this.inner.listVersions(id);
  }
}

describe("spawn authorization ordering", () => {
  test("a policy-denied spawn gives the same denial for an existing and a nonexistent child Definition", async () => {
    const counting = new CountingDefinitionStore();
    const { harness, definitions, store } = rig({ authorizer: noSpawn(), definitions: counting });
    await definitions.save(agent("known-child", [{ do: "complete" }]));

    const knownRef = await definitions.save(
      agent("wants-known", [{ do: "spawn", definitionId: "known-child", definitionVersion: 1, requestKey: "s" }, { do: "complete" }]),
    );
    const unknownRef = await definitions.save(
      agent("wants-unknown", [
        { do: "spawn", definitionId: "no-such-definition", definitionVersion: 1, requestKey: "s" },
        { do: "complete" },
      ]),
    );

    counting.getVersionCalls = 0; // only count reads caused by the two spawns below.
    const wantsKnown = await harness.createExecution({ definition: knownRef, structuralSpawnBudget: 1 });
    const wantsUnknown = await harness.createExecution({ definition: unknownRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    const knownJournal = await harness.effectJournalOf(wantsKnown.executionId);
    const unknownJournal = await harness.effectJournalOf(wantsUnknown.executionId);
    const knownDenial = knownJournal.find((entry) => entry.phase === "denied");
    const unknownDenial = unknownJournal.find((entry) => entry.phase === "denied");

    assert.ok(knownDenial, "the request naming a real Definition was denied");
    assert.ok(unknownDenial, "the request naming no real Definition was denied the same way");
    assert.equal(knownDenial!.detail["code"], "spawn_not_authorized");
    assert.equal(
      unknownDenial!.detail["code"],
      "spawn_not_authorized",
      "same policy-denial class - never spawn_definition_not_found for a denied caller",
    );

    // Neither request ever reached Definition resolution: a denied caller learns nothing about
    // whether the name it guessed exists.
    assert.equal(counting.getVersionCalls, 0, "the DefinitionStore was never queried for a denied spawn");

    assert.equal(await executionCount(store), 2, "root + root - no child was created for either request");
    assert.equal((await harness.inspect(wantsKnown.executionId))?.lifecycle, "COMPLETED");
    assert.equal((await harness.inspect(wantsUnknown.executionId))?.lifecycle, "COMPLETED");
  });

  test("control: an authorized spawn does distinguish an existing Definition from a nonexistent one", async () => {
    // Same two requests, but authorized - confirming the denied case above genuinely hides a real
    // difference rather than the two proposals being identical for some other reason.
    const { harness, definitions, store } = rig({ authorizer: permissive() });
    await definitions.save(agent("known-child", [{ do: "complete" }]));
    const knownRef = await definitions.save(
      agent("wants-known", [{ do: "spawn", definitionId: "known-child", definitionVersion: 1, requestKey: "s" }, { do: "complete" }]),
    );
    const unknownRef = await definitions.save(
      agent("wants-unknown", [
        { do: "spawn", definitionId: "no-such-definition", definitionVersion: 1, requestKey: "s" },
        { do: "complete" },
      ]),
    );

    const wantsKnown = await harness.createExecution({ definition: knownRef, structuralSpawnBudget: 1 });
    const wantsUnknown = await harness.createExecution({ definition: unknownRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    const knownJournal = await harness.effectJournalOf(wantsKnown.executionId);
    const unknownJournal = await harness.effectJournalOf(wantsUnknown.executionId);
    assert.ok(knownJournal.some((entry) => entry.phase === "authorized"), "the real Definition spawned a child");
    const rejected = unknownJournal.find((entry) => entry.phase === "rejected");
    assert.equal(rejected?.detail["code"], "spawn_definition_not_found", "an authorized caller does see the real difference");

    assert.equal(await executionCount(store), 3, "root wants-known + child + root wants-unknown, no child for the unknown name");
  });
});
