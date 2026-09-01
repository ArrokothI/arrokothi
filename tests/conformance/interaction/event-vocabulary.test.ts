/**
 * The closed Event vocabulary, and what is deliberately not in it.
 *
 * An Event means one thing: an observation delivered through an Execution boundary. The kernel
 * produces a small, fixed set of them, and everything else the runtime writes down about an
 * Execution - lifecycle transitions, Effect journal phases, Activation records, emissions - is a
 * record *about* it. Those never enter a mailbox and a controller never consumes them.
 *
 * The rule matters because the alternative is subtle. A runtime whose audit stream is also its
 * delivery stream lets an Execution be woken by its own bookkeeping, and makes retention policy and
 * delivery semantics impossible to evolve separately.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { EVENT_KINDS, EFFECT_RESULT_EVENT_KINDS, isEventKind } from "@agent-sdk/core/execution";
import { createAllowListAuthorizer, createScriptedCapabilityExecutor } from "@agent-sdk/core/reference";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@agent-sdk/core/testing";

/**
 * What this Execution is permitted to use at all.
 *
 * The runtime-owned ceiling, supplied when the Execution is created. It is checked again at dispatch
 * from current state, so an Execution created without one can reach no capability implementation
 * whatever a controller proposes and whatever policy would have said.
 */
const AUTHORITY = { operations: [{ capability: "knowledge.query", operation: "search" }] };

const busy = () =>
  scriptedAgentDefinition({
    id: "busy",
    program: [
      { do: "emit", text: "starting" },
      { do: "use_capability", capability: "knowledge.query", operation: "search", input: { q: "x" }, requestKey: "q1" },
      { do: "emit", text: "done" },
      { do: "complete" },
    ],
  });

const wired = () =>
  createTestHarness({
    authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.query" }] }),
    capabilities: createScriptedCapabilityExecutor({
      handlers: { "knowledge.query:search": () => ({ status: "success", observation: { hits: 1 } }) },
    }),
  });

describe("the Event vocabulary", () => {
  test("the vocabulary is closed and narrow", () => {
    assert.deepEqual(
      [...EVENT_KINDS].sort(),
      [
        "capability.completed",
        "capability.failed",
        "capability.unknown",
        // Slice E.0: the `SpawnExecution` Effect owns these three, and they arrive with it.
        "child.completed",
        "child.failed",
        "child.spawned",
        "effect.denied",
        "effect.rejected",
        "external.input",
      ],
      "kinds for Effects that later slices own arrive with those Effects, not before them",
    );
    for (const kind of ["tool.called", "memory.written", "message.received", "timer.fired", "child.cancelled"]) {
      assert.equal(isEventKind(kind), false, `${kind} is not yet kernel vocabulary`);
    }
    assert.ok(
      EFFECT_RESULT_EVENT_KINDS.every((kind) => EVENT_KINDS.includes(kind)),
      "every Effect-result kind is part of the same closed set",
    );
    assert.equal(
      EFFECT_RESULT_EVENT_KINDS.includes("external.input"),
      false,
      "an observation from outside the kernel is not an answer to an Effect",
    );
  });

  test("the three capability outcomes are separate kinds, not one kind with a status", () => {
    for (const kind of ["capability.completed", "capability.failed", "capability.unknown"] as const) {
      assert.ok(EVENT_KINDS.includes(kind));
    }
    // A controller can therefore wait for exactly the outcome it cares about, and "failed" can never
    // be read where "unknown" was meant.
    assert.notEqual("capability.failed", "capability.unknown");
  });

  test("audit and journal records never appear as mailbox Events", async () => {
    const { harness, definitions, store } = wired();
    const ref = await definitions.save(busy());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    const progress = readScriptedProgress(context!.control.progress);

    // Plenty of history was written.
    const transitions = await harness.transitionsOf(handle.executionId);
    const journal = await harness.effectJournalOf(handle.executionId);
    const emissions = await harness.emissionsOf(handle.executionId);
    assert.ok(transitions.length >= 4, "lifecycle history exists");
    assert.equal(journal.length, 4, "Effect history exists");
    assert.equal(emissions.length, 2, "emissions exist");

    // And exactly one thing was delivered.
    assert.deepEqual(progress.seenKinds, ["capability.completed"], "only the observation crossed the boundary");
    assert.equal(progress.seenEvents.length, 1);
    assert.equal((await store.peekMailbox(context!.mailbox.mailboxId)).length, 0, "and nothing else is queued");

    for (const record of [...transitions, ...journal, ...emissions] as unknown as Record<string, unknown>[]) {
      assert.ok(!("destination" in record), "an audit record has no destination, because it is not addressed");
      assert.equal(isEventKind(record["kind"]), false, "and does not claim an Event kind");
    }
  });

  test("an Execution is not woken by its own bookkeeping", async () => {
    const { harness, definitions } = wired();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "waits-forever-on-nothing",
        program: [{ do: "await", eventKinds: ["external.input"], correlationId: "never" }, { do: "complete" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING");

    const before = (await harness.transitionsOf(handle.executionId)).length;
    assert.ok(before > 0, "transitions were recorded while it got here");
    assert.equal(await harness.runOnce(), null, "and none of them made it runnable");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING");
  });

  test("no external implementation object reaches a public runtime record", async () => {
    class ProviderClient {
      readonly apiKey = "sk-live-secret";
      send(): void {}
    }

    const executor = createScriptedCapabilityExecutor({
      handlers: {
        // The executor holds its client, as a real one would, and returns only an observation.
        "knowledge.query:search": () => {
          const client = new ProviderClient();
          return { status: "success", observation: { hits: 1, via: client.constructor.name === "ProviderClient" } };
        },
      },
    });
    const { harness, definitions } = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.query" }] }),
      capabilities: executor,
    });
    const ref = await definitions.save(busy());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    // What the executor was handed contains logical names and validated data, and no route back.
    const request = executor.calls[0]!.request;
    assert.deepEqual(
      Object.keys(request).sort(),
      [
        "authorization",
        "cancellation",
        "capability",
        "causationId",
        "correlationId",
        "deadline",
        "effectId",
        "executionId",
        "idempotencyKey",
        "input",
        "operation",
        "pendingOperationId",
        "resources",
      ],
      "no harness, no store, no tenant, no user, no credential, no client",
    );
    assert.equal(JSON.stringify(request), JSON.stringify(JSON.parse(JSON.stringify(request))), "and it is plain data");

    // Every public runtime record survives a JSON round trip, which no class instance would.
    const records: unknown[] = [
      await harness.inspect(handle.executionId),
      await harness.transitionsOf(handle.executionId),
      await harness.effectJournalOf(handle.executionId),
      await harness.emissionsOf(handle.executionId),
      await harness.pendingOperationsOf(handle.executionId),
    ];
    for (const record of records) {
      assertPlainData(record, "record");
    }
    assert.ok(!JSON.stringify(records).includes("sk-live-secret"), "no credential reached a runtime record");
  });
});

function assertPlainData(value: unknown, path: string): void {
  if (value === null || typeof value !== "object") {
    assert.notEqual(typeof value, "function", `${path} must not be a function`);
    return;
  }
  const prototype = Object.getPrototypeOf(value);
  assert.ok(
    Array.isArray(value) || prototype === Object.prototype || prototype === null,
    `${path} must be plain data, found ${(value as object).constructor?.name}`,
  );
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    assertPlainData(child, `${path}.${key}`);
  }
}
