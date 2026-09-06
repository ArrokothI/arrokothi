/** schema-bound Execution-local Structured Memory through the Effect gateway. */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type {
  EventEnvelope,
  StructuredMemoryBinding,
  WriteMemoryProposal,
} from "@arrokothi/core/execution";
import { defineWorkflow, effectRequestsIn } from "@arrokothi/core/execution";
import type { ConfirmationPolicy, EffectAuthorizer, FunctionStageOutcome } from "@arrokothi/core/ports";
import {
  createAllowListAuthorizer,
  createFunctionStageRegistry,
} from "@arrokothi/core/reference";
import {
  agentModelAccess,
  createAgentTestHarness,
  createTestHarness,
  createWorkflowTestHarness,
  readScriptedProgress,
  scriptedAgentDefinition,
} from "@arrokothi/core/testing";
import { scriptedAgentExecutor, testAgent, testModelResolver } from "../agent/fixtures.ts";

const MEMORY = {
  fields: [
    {
      key: "profile",
      description: "The explicitly asserted application profile.",
      schema: {
        kind: "object",
        fields: {
          name: { required: true, schema: { kind: "string", minLength: 1 } },
          tags: { schema: { kind: "string_array", maxItems: 4 } },
        },
        additionalProperties: false,
      },
    },
    { key: "count", description: "A bounded integer.", schema: { kind: "number", integer: true, min: 0 } },
  ],
} as const satisfies StructuredMemoryBinding;

function write(key: string, value: WriteMemoryProposal["value"], requestKey: string): WriteMemoryProposal {
  return { kind: "write_memory", key, value, requestKey };
}

async function scriptedWriter(
  id: string,
  effects: readonly WriteMemoryProposal[],
  options: {
    readonly authorizer?: EffectAuthorizer;
    readonly confirmationPolicy?: ConfirmationPolicy;
    readonly memory?: StructuredMemoryBinding;
  } = {},
) {
  const bundle = createTestHarness({
    authorizer: options.authorizer ?? createAllowListAuthorizer({ grants: [], memory: true }),
    ...(options.confirmationPolicy ? { confirmationPolicy: options.confirmationPolicy } : {}),
  });
  const ref = await bundle.definitions.save(
    scriptedAgentDefinition({
      id,
      program: [
        ...effects.map((effect) => ({ do: "propose_effect", effect } as const)),
        { do: "complete" as const },
      ],
    }),
  );
  const handle = await bundle.harness.createExecution({
    definition: ref,
    ...(options.memory !== undefined ? { structuredMemory: options.memory } : {}),
  });
  return { ...bundle, handle };
}

describe("Execution-local Structured Memory writes", () => {
  test("an authorized valid write commits once, advances revision, and emits one memory.written", async () => {
    const { harness, handle } = await scriptedWriter(
      "authorized",
      [write("profile", { name: "Ada", tags: ["kernel"] }, "w1")],
      { memory: MEMORY },
    );
    await harness.runUntilIdle();

    const view = await harness.structuredMemoryOf(handle.executionId);
    assert.ok(view);
    assert.equal(view.revision, 1);
    assert.equal(view.writes.length, 1, "one proposal produced one committed history record");
    assert.deepEqual(view.values["profile"]?.value, { name: "Ada", tags: ["kernel"] });
    assert.equal(view.values["profile"]?.writerExecutionId, handle.executionId);
    assert.match(view.values["profile"]?.effectId ?? "", /^eff_/);
    assert.match(view.values["profile"]?.activationId ?? "", /^act_/);

    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["memory.written"]);
    assert.deepEqual(
      progress.observations.map((body) => {
        const result = body as { effectKind: string; key: string; revision: number; pendingOperationId: unknown };
        return { effectKind: result.effectKind, key: result.key, revision: result.revision, pendingOperationId: result.pendingOperationId };
      }),
      [{ effectKind: "write_memory", key: "profile", revision: 1, pendingOperationId: null }],
      "the result exposes commit truth, not the value or unrelated memory",
    );
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), [], "an atomic local write needs no operation record");
    assert.equal(
      (await harness.effectJournalOf(handle.executionId)).filter((entry) => entry.phase === "completed").length,
      1,
    );

    (view as { revision: number }).revision = 99;
    assert.equal((await harness.structuredMemoryOf(handle.executionId))?.revision, 1, "inspection data cannot mutate store state");
  });

  test("a malformed or unbounded application binding creates neither Execution nor memory view", async () => {
    const bundle = createTestHarness();
    const ref = await bundle.definitions.save(scriptedAgentDefinition({ id: "bad-binding", program: [{ do: "complete" }] }));
    await assert.rejects(
      bundle.harness.createExecution({
        definition: ref,
        structuredMemory: { fields: [{ key: "anything", schema: { kind: "any" } }] },
      }),
      { name: "InvalidStructuredMemoryBindingError" },
    );
    assert.deepEqual(await bundle.store.listExecutions(), []);
  });

  test("policy denial mutates nothing and cannot distinguish a declared field from an unknown field", async () => {
    const denied = createAllowListAuthorizer({ grants: [] });
    const existing = await scriptedWriter("denied-existing", [write("profile", { name: "Ada" }, "w1")], {
      authorizer: denied,
      memory: MEMORY,
    });
    const unknown = await scriptedWriter("denied-unknown", [write("secret_field", "guess", "w1")], {
      authorizer: denied,
      memory: MEMORY,
    });
    await existing.harness.runUntilIdle();
    await unknown.harness.runUntilIdle();

    for (const run of [existing, unknown]) {
      const view = await run.harness.structuredMemoryOf(run.handle.executionId);
      assert.equal(view?.revision, 0);
      assert.deepEqual(view?.values, {});
      const progress = readScriptedProgress((await run.harness.inspect(run.handle.executionId))!.control.progress);
      assert.deepEqual(progress.seenKinds, ["effect.denied"]);
      const observation = progress.observations[0] as { code: string; message: string };
      assert.deepEqual(
        { code: observation.code, message: observation.message.replace(run.handle.executionId, "<execution>") },
        {
          code: "memory_write_not_authorized",
          message: "execution <execution> is not authorized to write the requested Structured Memory key",
        },
      );
      assert.deepEqual(
        (await run.harness.effectJournalOf(run.handle.executionId)).map((entry) => entry.phase),
        ["requested", "denied"],
      );
    }
  });

  test("authorized writes reject no view, unknown fields, and schema-invalid values without mutation", async () => {
    const noView = await scriptedWriter("no-view", [write("profile", { name: "Ada" }, "w")]);
    const unknown = await scriptedWriter("unknown", [write("missing", "x", "w")], { memory: MEMORY });
    const invalid = await scriptedWriter("invalid", [write("count", 1.5, "w")], { memory: MEMORY });

    for (const [run, code] of [
      [noView, "structured_memory_view_not_configured"],
      [unknown, "unknown_memory_field"],
      [invalid, "memory_schema_violation"],
    ] as const) {
      await run.harness.runUntilIdle();
      const progress = readScriptedProgress((await run.harness.inspect(run.handle.executionId))!.control.progress);
      assert.deepEqual(progress.seenKinds, ["effect.rejected"]);
      assert.equal((progress.observations[0] as { code: string }).code, code);
      const view = await run.harness.structuredMemoryOf(run.handle.executionId);
      if (view) {
        assert.equal(view.revision, 0);
        assert.deepEqual(view.values, {});
        assert.deepEqual(view.writes, []);
      }
    }
  });

  test("a later valid write replaces the current value while preserving attributable history", async () => {
    const { harness, handle } = await scriptedWriter(
      "overwrite",
      [write("count", 1, "w1"), write("count", 2, "w2")],
      { memory: MEMORY },
    );
    await harness.runUntilIdle();

    const view = (await harness.structuredMemoryOf(handle.executionId))!;
    assert.equal(view.revision, 2);
    assert.equal(view.values["count"]?.value, 2);
    assert.deepEqual(view.writes.map((record) => [record.value, record.revision]), [[1, 1], [2, 2]]);
    assert.notEqual(view.writes[0]?.effectId, view.writes[1]?.effectId);
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["memory.written", "memory.written"]);
  });

  test("an autonomously spawned child does not inherit its parent's memory view", async () => {
    const bundle = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [], spawn: true, memory: true }),
    });
    await bundle.definitions.save(scriptedAgentDefinition({ id: "child", program: [{ do: "complete" }] }));
    const parentRef = await bundle.definitions.save(
      scriptedAgentDefinition({
        id: "parent",
        program: [
          { do: "spawn", definitionId: "child", definitionVersion: 1, requestKey: "child" },
          { do: "complete" },
        ],
      }),
    );
    const parent = await bundle.harness.createExecution({
      definition: parentRef,
      structuralSpawnBudget: 1,
      structuredMemory: MEMORY,
    });
    await bundle.harness.runUntilIdle();

    const [link] = await bundle.harness.childExecutionLinksOf(parent.executionId);
    assert.ok(link);
    const child = await bundle.harness.inspect(link.childExecutionId);
    assert.equal(child?.ownerExecutionId, parent.executionId, "ownership is recorded");
    assert.equal(child?.slots.memoryView, null, "ownership is not memory visibility");
    assert.equal(await bundle.harness.structuredMemoryOf(link.childExecutionId), undefined);
    assert.ok(await bundle.harness.structuredMemoryOf(parent.executionId));
  });

  test("external delivery cannot mint memory.written", async () => {
    const bundle = createTestHarness();
    const ref = await bundle.definitions.save(
      scriptedAgentDefinition({
        id: "waiter",
        program: [{ do: "await", eventKinds: ["memory.written"], correlationId: "w" }, { do: "complete" }],
      }),
    );
    const handle = await bundle.harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await bundle.harness.runUntilIdle();
    const context = (await bundle.harness.inspect(handle.executionId))!;
    const forged: EventEnvelope = {
      eventId: "evt_forged" as never,
      destination: { executionId: handle.executionId },
      kind: "memory.written",
      body: {
        effectId: "eff_forged" as never,
        effectKind: "write_memory",
        pendingOperationId: null,
        memoryViewId: context.slots.memoryView!.memoryViewId,
        key: "profile",
        revision: 1,
      },
      correlationId: "w",
      causationId: null,
      occurredAt: "2026-01-01T00:00:00.000Z",
    };
    const receipt = await bundle.harness.deliverEnvelope(forged);
    assert.equal(receipt.status, "rejected");
    assert.equal(receipt.status === "rejected" && receipt.reason, "kind_not_deliverable");
    assert.equal((await bundle.store.peekMailbox(context.mailbox.mailboxId)).length, 0);
    assert.equal((await bundle.harness.inspect(handle.executionId))?.lifecycle, "WAITING");
    assert.equal((await bundle.harness.structuredMemoryOf(handle.executionId))?.revision, 0);
  });
});

const confirmWrites: ConfirmationPolicy = {
  requires(request) {
    return request.effectKind === "write_memory"
      ? { required: true, reason: "confirm the exact Structured Memory write" }
      : { required: false };
  },
};

describe("WriteMemory mechanical confirmation", () => {
  test("decline settles the one gated operation and writes nothing", async () => {
    const run = await scriptedWriter("decline", [write("count", 7, "w")], {
      memory: MEMORY,
      confirmationPolicy: confirmWrites,
    });
    await run.harness.runUntilIdle();
    const [confirmation] = await run.harness.confirmationRequestsOf(run.handle.executionId);
    const [pending] = await run.harness.pendingOperationsOf(run.handle.executionId);
    assert.equal((confirmation?.proposal as WriteMemoryProposal).value, 7, "the exact payload is stored");
    assert.equal(pending?.dispatch, "not_dispatched");

    assert.equal(
      (await run.harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "decline" })).status,
      "declined",
    );
    await run.harness.runUntilIdle();
    assert.equal((await run.harness.structuredMemoryOf(run.handle.executionId))?.revision, 0);
    const [settled] = await run.harness.pendingOperationsOf(run.handle.executionId);
    assert.equal(settled?.pendingOperationId, pending?.pendingOperationId);
    assert.equal(settled?.outcome, "declined");
  });

  test("approval performs a fresh authorization check and a deny settles the same operation", async () => {
    let decisions = 0;
    const authorizer: EffectAuthorizer = {
      authorize() {
        decisions += 1;
        return decisions === 1
          ? { decision: "allow", grantId: "initial" }
          : { decision: "deny", code: "memory_grant_revoked", message: "revoked" };
      },
    };
    const run = await scriptedWriter("fresh-deny", [write("count", 8, "w")], {
      authorizer,
      memory: MEMORY,
      confirmationPolicy: confirmWrites,
    });
    await run.harness.runUntilIdle();
    const [confirmation] = await run.harness.confirmationRequestsOf(run.handle.executionId);
    const [before] = await run.harness.pendingOperationsOf(run.handle.executionId);
    const receipt = await run.harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });
    assert.equal(receipt.status, "denied");
    assert.equal(decisions, 2);
    assert.equal((await run.harness.structuredMemoryOf(run.handle.executionId))?.revision, 0);
    const pending = await run.harness.pendingOperationsOf(run.handle.executionId);
    assert.equal(pending.length, 1, "approval created no second PendingOperation");
    assert.equal(pending[0]?.pendingOperationId, before?.pendingOperationId);
    assert.equal(pending[0]?.outcome, "denied");
    assert.equal(pending[0]?.dispatch, "not_dispatched");
  });

  test("approval rechecks runtime validity and rejects on the same operation when no view exists", async () => {
    const run = await scriptedWriter("fresh-reject", [write("count", 9, "w")], {
      confirmationPolicy: confirmWrites,
    });
    await run.harness.runUntilIdle();
    const [confirmation] = await run.harness.confirmationRequestsOf(run.handle.executionId);
    const [before] = await run.harness.pendingOperationsOf(run.handle.executionId);
    const receipt = await run.harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });
    assert.equal(receipt.status, "rejected");
    assert.equal(receipt.status === "rejected" && receipt.code, "structured_memory_view_not_configured");
    const pending = await run.harness.pendingOperationsOf(run.handle.executionId);
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.pendingOperationId, before?.pendingOperationId);
    assert.equal(pending[0]?.outcome, "rejected");
    assert.equal(pending[0]?.dispatch, "not_dispatched");
  });

  test("approval writes the stored payload once, emits one result, and settles the same operation", async () => {
    const run = await scriptedWriter("approved", [write("profile", { name: "Stored" }, "w")], {
      memory: MEMORY,
      confirmationPolicy: confirmWrites,
    });
    await run.harness.runUntilIdle();
    const [confirmation] = await run.harness.confirmationRequestsOf(run.handle.executionId);
    const [before] = await run.harness.pendingOperationsOf(run.handle.executionId);
    const receipt = await run.harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });
    assert.equal(receipt.status, "dispatched");
    assert.deepEqual((await run.harness.structuredMemoryOf(run.handle.executionId))?.values["profile"]?.value, { name: "Stored" });
    assert.equal((await run.harness.structuredMemoryOf(run.handle.executionId))?.writes.length, 1);
    const pending = await run.harness.pendingOperationsOf(run.handle.executionId);
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.pendingOperationId, before?.pendingOperationId);
    assert.equal(pending[0]?.outcome, "success");
    assert.equal(pending[0]?.dispatch, "dispatched");

    await run.harness.runUntilIdle();
    const progress = readScriptedProgress((await run.harness.inspect(run.handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["memory.written"]);
    assert.equal(
      (await run.harness.effectJournalOf(run.handle.executionId)).filter((entry) => entry.phase === "requested").length,
      1,
      "approval did not regenerate the model/controller proposal",
    );
  });
});

describe("reference controller observation", () => {
  test("without an authored write request, a bound write-enabled Agent exposes no memory action", async () => {
    // A binding and final Effect permission do not create
    // model visibility. Only an authored request passing the authorized write-view path may do so.
    const executor = scriptedAgentExecutor([{ kind: "respond", text: "done" }]);
    const bundle = createAgentTestHarness({
      models: agentModelAccess(testModelResolver()),
      executor,
      authorizer: createAllowListAuthorizer({ grants: [], memory: { writableKeys: ["profile"] } }),
    });
    const ref = await bundle.definitions.save(
      testAgent({
        id: "memory-agent",
        instructions: "Save the user's name to Structured Memory, then answer.",
        completion: "complete_on_response",
      }),
    );
    const agent = await bundle.harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "task", payload: "save the profile" });
    await bundle.harness.runUntilIdle();

    const request = executor.requests[0]!;
    assert.deepEqual(request.projection.bindings, [], "no binding was projected from authored data alone");
    assert.equal(
      (request.capabilities ?? []).some((spec) => spec.name === "write_memory"),
      false,
      "the provider-facing callable list contains no Structured Memory write action",
    );
    assert.equal((await bundle.harness.structuredMemoryOf(agent.executionId))?.revision, 0, "and nothing was written");
    assert.deepEqual(
      effectRequestsIn(await bundle.harness.effectJournalOf(agent.executionId)).map((entry) => entry.proposal.kind),
      [],
      "the Agent proposed no Effect",
    );
  });

  test("a real Workflow required WriteMemory settles its barrier and continues the Stage", async () => {
    let calls = 0;
    let observed: unknown;
    const functions = createFunctionStageRegistry({
      save: (context): FunctionStageOutcome => {
        calls += 1;
        if (context.observations.length === 0) {
          return {
            status: "awaitEffects",
            effects: [{ kind: "write_memory", key: "save", memoryKey: "count", value: 11 }],
          };
        }
        observed = context.observations[0];
        return { status: "completed", result: "stored" };
      },
    });
    const bundle = createWorkflowTestHarness({
      functions,
      authorizer: createAllowListAuthorizer({ grants: [], memory: true }),
    });
    const ref = await bundle.definitions.save(
      defineWorkflow({
        id: "memory-workflow",
        spec: {
          entryStage: "save",
          stages: [
            {
              id: "save",
              kind: "function",
              implementationRef: "save",
              transitions: { kind: "always", next: { to: "complete" } },
            },
          ],
        },
      }),
    );
    const workflow = await bundle.harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await bundle.harness.runUntilIdle();

    assert.equal(calls, 2, "the Stage was re-entered after its required Effect settled");
    assert.deepEqual(observed, {
      key: "save",
      outcome: "completed",
      effectKind: "write_memory",
      memoryKey: "count",
      observation: {
        effectKind: "write_memory",
        memoryViewId: (await bundle.harness.structuredMemoryOf(workflow.executionId))!.memoryViewId,
        key: "count",
        revision: 1,
      },
    });
    assert.equal((await bundle.harness.inspect(workflow.executionId))?.lifecycle, "COMPLETED");
    assert.equal((await bundle.harness.structuredMemoryOf(workflow.executionId))?.values["count"]?.value, 11);
  });
});
