/** Slice F.1.1: model-directed Structured Memory writes through ordinary Effects. */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type {
  AgentControlState,
  StructuredMemoryBinding,
  StructuredMemoryView,
} from "@agent-sdk/core/execution";
import {
  createActiveStructuredMemoryWriteView,
  effectRequestsIn,
  readAgentControlState,
  validateAgentSpec,
} from "@agent-sdk/core/execution";
import type {
  ActiveStructuredMemoryWriteViewResolver,
  ConfirmationPolicy,
  EffectAuthorizer,
} from "@agent-sdk/core/ports";
import {
  createAllowListAuthorizer,
  createDeferredModelProvider,
  createNoInlineWaitBudget,
  createScriptedCapabilityExecutor,
  createStructuredMemoryWriteViewResolver,
  InMemoryRuntimeStore,
} from "@agent-sdk/core/reference";
import {
  agentModelAccess,
  createAgentTestHarness,
  createTestHarness,
  referenceAgentExecutor,
  scriptedAgentDefinition,
  seedStructuredMemory,
} from "@agent-sdk/core/testing";
import {
  DOCS_SEARCH,
  scriptedAgentExecutor,
  testAgent,
  testCatalog,
  testModelResolver,
} from "../agent/fixtures.ts";

const MEMORY = {
  fields: [
    {
      key: "profile",
      description: "The explicitly asserted application profile.",
      schema: {
        kind: "object",
        fields: { name: { required: true, schema: { kind: "string", minLength: 1 } } },
        additionalProperties: false,
      },
    },
    { key: "count", description: "A bounded integer.", schema: { kind: "number", integer: true, min: 0 } },
    { key: "flag", description: "A boolean.", schema: { kind: "boolean" } },
  ],
} as const satisfies StructuredMemoryBinding;

class CountingStore extends InMemoryRuntimeStore {
  viewReads = 0;
  executionReads = 0;

  override async readStructuredMemoryView(id: string): Promise<StructuredMemoryView | undefined> {
    this.viewReads += 1;
    return super.readStructuredMemoryView(id);
  }

  override async readExecution(id: Parameters<InMemoryRuntimeStore["readExecution"]>[0]) {
    this.executionReads += 1;
    return super.readExecution(id);
  }
}

const confirmWrites: ConfirmationPolicy = {
  requires(request) {
    return request.effectKind === "write_memory"
      ? { required: true, reason: "confirm this exact Structured Memory write" }
      : { required: false };
  },
};

function memorySelection(alias: string, value: unknown) {
  return {
    kind: "call_operations" as const,
    calls: [{ callId: "m1", alias, input: { value } as never }],
  };
}

describe("the authorized Structured Memory write-interface view", () => {
  async function boundExecution(store: InMemoryRuntimeStore) {
    const bundle = createTestHarness({ store });
    const ref = await bundle.definitions.save(
      scriptedAgentDefinition({ id: "write-view", program: [{ do: "complete" }] }),
    );
    const execution = await bundle.harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    return execution.executionId;
  }

  test("write authority is applied before any binding or memory-view read", async () => {
    const store = new CountingStore();
    const executionId = await boundExecution(store);
    store.executionReads = 0;
    store.viewReads = 0;
    const resolver = createStructuredMemoryWriteViewResolver({
      store,
      grants: { writableKeys: ["profile"] },
    });

    for (const keys of [["count"], ["not_declared"], ["count", "not_declared"]]) {
      assert.deepEqual((await resolver.resolve({ executionId, keys })).entries, []);
    }
    assert.equal(store.executionReads, 0, "denial does not even resolve the Execution binding");
    assert.equal(store.viewReads, 0, "a denied key guess cannot become a declaration-existence oracle");
  });

  test("the result is the exact request ∩ exposure grant ∩ bound declarations, with metadata only", async () => {
    const store = new CountingStore();
    const executionId = await boundExecution(store);
    store.executionReads = 0;
    store.viewReads = 0;
    const resolver = createStructuredMemoryWriteViewResolver({
      store,
      grants: { writableKeys: ["profile", "flag", "not_declared"] },
    });

    const view = await resolver.resolve({ executionId, keys: ["profile", "count", "not_declared"] });
    assert.deepEqual(view.entries.map((entry) => entry.key), ["profile"]);
    assert.deepEqual(Object.keys(view.entries[0]!).sort(), ["description", "key", "kind", "valueSchema"]);
    const serialized = JSON.stringify(view.entries[0]);
    assert.doesNotMatch(serialized, /memoryViewId|revision|current|value\"/);
    assert.equal(store.executionReads, 1);
    assert.equal(store.viewReads, 1);
  });

  test("a child Execution does not inherit its parent's write interfaces", async () => {
    const bundle = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [], spawn: true, memory: true }),
    });
    await bundle.definitions.save(scriptedAgentDefinition({ id: "child-no-memory", program: [{ do: "complete" }] }));
    const parentRef = await bundle.definitions.save(
      scriptedAgentDefinition({
        id: "parent-with-memory",
        program: [
          { do: "spawn", definitionId: "child-no-memory", definitionVersion: 1, requestKey: "child" },
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
    const resolver = createStructuredMemoryWriteViewResolver({ store: bundle.store, grants: true });

    assert.deepEqual((await resolver.resolve({ executionId: parent.executionId, keys: ["profile"] })).entries.map((e) => e.key), ["profile"]);
    assert.deepEqual((await resolver.resolve({ executionId: link!.childExecutionId, keys: ["profile"] })).entries, []);
  });
});

describe("Agent-authored Structured Memory write requests", () => {
  const base = {
    model: { logicalRef: "primary", requirements: { text: true as const } },
    instructions: "go",
  };

  test("read and write are independently strict request-only shapes", () => {
    assert.equal(validateAgentSpec({ ...base, structuredMemory: { write: { keys: ["profile", "count"] } } }).ok, true);
    assert.equal(validateAgentSpec({ ...base, structuredMemory: { read: { keys: ["profile"] }, write: { keys: ["count"] } } }).ok, true);
    for (const structuredMemory of [
      { write: { keys: [] } },
      { write: { keys: ["profile", "profile"] } },
      { write: { keys: [""] } },
      { write: { keys: "profile" } },
      { write: { keys: ["profile"], value: "forbidden" } },
      { write: { keys: ["profile"] }, grant: true },
    ]) {
      assert.equal(validateAgentSpec({ ...base, structuredMemory }).ok, false);
    }
  });

  test("no authored request means zero resolver calls, zero view reads, no action, and no Effect", async () => {
    const store = new CountingStore();
    const inner = createStructuredMemoryWriteViewResolver({ store, grants: true });
    let calls = 0;
    const resolver: ActiveStructuredMemoryWriteViewResolver = {
      resolve(request) {
        calls += 1;
        return inner.resolve(request);
      },
    };
    const executor = scriptedAgentExecutor([{ kind: "respond", text: "done" }]);
    const bundle = createAgentTestHarness({
      store,
      catalog: testCatalog(),
      models: agentModelAccess(testModelResolver()),
      executor,
      structuredMemoryWriteView: resolver,
      authorizer: createAllowListAuthorizer({
        grants: [{ capability: "docs", operations: ["search"] }],
        memory: true,
      }),
    });
    const ref = await bundle.definitions.save(
      testAgent({
        id: "no-write-request",
        completion: "complete_on_response",
        operations: { refs: [DOCS_SEARCH] },
      }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH], memory: MEMORY });
    store.executionReads = 0;
    store.viewReads = 0;
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "task", payload: "go" });
    await bundle.harness.runUntilIdle();

    assert.equal(calls, 0);
    assert.equal(store.viewReads, 0);
    assert.deepEqual(
      executor.requests[0]!.projection.bindings.map((binding) => binding.target),
      [{ kind: "capability_operation", capability: "docs", operation: "search" }],
      "the existing provider action surface is unchanged and gains no memory-write binding",
    );
    assert.deepEqual(executor.requests[0]!.capabilities.map((entry) => entry.name), ["docs_search"]);
    assert.deepEqual(effectRequestsIn(await bundle.harness.effectJournalOf(agent.executionId)), []);
  });

  test("request, exposure authority, and binding are all necessary", async () => {
    async function visible(options: { request: boolean; exposure: boolean; binding: boolean }) {
      const executor = scriptedAgentExecutor([{ kind: "respond", text: "done" }]);
      const bundle = createAgentTestHarness({
        models: agentModelAccess(testModelResolver()),
        executor,
        memoryWriteExposureGrants: options.exposure,
        authorizer: createAllowListAuthorizer({ grants: [], memory: true }),
      });
      const ref = await bundle.definitions.save(
        testAgent({
          id: `intersection-${Number(options.request)}${Number(options.exposure)}${Number(options.binding)}`,
          completion: "complete_on_response",
          ...(options.request ? { structuredMemory: { write: { keys: ["profile"] } } } : {}),
        }),
      );
      const agent = await bundle.createAgent({
        definition: ref,
        authority: [],
        ...(options.binding ? { memory: MEMORY } : {}),
      });
      await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "task", payload: "go" });
      await bundle.harness.runUntilIdle();
      return executor.requests[0]!.capabilities.map((capability) => capability.name);
    }

    assert.deepEqual(await visible({ request: true, exposure: true, binding: true }), ["memory_write_profile"]);
    assert.deepEqual(await visible({ request: false, exposure: true, binding: true }), []);
    assert.deepEqual(await visible({ request: true, exposure: false, binding: true }), []);
    assert.deepEqual(await visible({ request: true, exposure: true, binding: false }), []);
  });
});

describe("a model selection becomes an ordinary WriteMemory Effect", () => {
  test("an authorized selection commits and returns a minimal model observation", async () => {
    const executor = scriptedAgentExecutor([
      memorySelection("memory_write_profile", { name: "Ada" }),
      { kind: "respond", text: "saved" },
    ]);
    const bundle = createAgentTestHarness({
      models: agentModelAccess(testModelResolver()),
      executor,
      memoryWriteExposureGrants: { writableKeys: ["profile"] },
      authorizer: createAllowListAuthorizer({ grants: [], memory: { writableKeys: ["profile"] } }),
    });
    const ref = await bundle.definitions.save(
      testAgent({
        id: "model-write-success",
        completion: "complete_on_response",
        structuredMemory: { write: { keys: ["profile"] } },
      }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [], memory: MEMORY });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "task", payload: "remember Ada" });
    await bundle.harness.runUntilIdle();

    assert.deepEqual(executor.requests[0]!.projection.bindings[0]!.target, {
      kind: "structured_memory_write",
      key: "profile",
    });
    assert.deepEqual((await bundle.harness.structuredMemoryOf(agent.executionId))!.values["profile"]!.value, { name: "Ada" });
    const [requested] = effectRequestsIn(await bundle.harness.effectJournalOf(agent.executionId));
    assert.deepEqual(requested!.proposal, {
      kind: "write_memory",
      key: "profile",
      value: { name: "Ada" },
      requestKey: "ag/step1/call1",
    });
    assert.deepEqual(executor.requests[1]!.observations[0]!.value, { key: "profile", written: true });
    assert.doesNotMatch(executor.requests[1]!.observations[0]!.content, /smv_|memoryViewId|revision/);
  });

  test("the binding owns the key and the model must supply exactly a JSON `{ value }` wrapper", async () => {
    for (const [name, input] of [
      ["missing", {}],
      ["extra", { value: { name: "Ada" }, other: true }],
      ["key-substitution", { key: "count", value: { name: "Ada" } }],
    ] as const) {
      const executor = scriptedAgentExecutor([
        {
          kind: "call_operations",
          calls: [{ callId: "m1", alias: "memory_write_profile", input: input as never }],
        },
      ]);
      const bundle = createAgentTestHarness({
        models: agentModelAccess(testModelResolver()),
        executor,
        memoryWriteExposureGrants: true,
        authorizer: createAllowListAuthorizer({ grants: [], memory: true }),
      });
      const ref = await bundle.definitions.save(
        testAgent({ id: `bad-wrapper-${name}`, structuredMemory: { write: { keys: ["profile"] } } }),
      );
      const agent = await bundle.createAgent({ definition: ref, authority: [], memory: MEMORY });
      await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "task", payload: "go" });
      await bundle.harness.runUntilIdle();
      const context = await bundle.harness.inspect(agent.executionId);
      assert.equal(context?.failure?.code, "agent_structured_memory_write_input_invalid");
      assert.deepEqual(effectRequestsIn(await bundle.harness.effectJournalOf(agent.executionId)), []);
      assert.equal((await bundle.harness.structuredMemoryOf(agent.executionId))?.revision, 0);
    }
  });

  test("schema validation remains runtime-authoritative", async () => {
    const executor = scriptedAgentExecutor([
      memorySelection("memory_write_count", 1.5),
      { kind: "respond", text: "not saved" },
    ]);
    const bundle = createAgentTestHarness({
      models: agentModelAccess(testModelResolver()),
      executor,
      memoryWriteExposureGrants: true,
      authorizer: createAllowListAuthorizer({ grants: [], memory: true }),
    });
    const ref = await bundle.definitions.save(
      testAgent({
        id: "runtime-schema",
        completion: "complete_on_response",
        structuredMemory: { write: { keys: ["count"] } },
      }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [], memory: MEMORY });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "task", payload: "go" });
    await bundle.harness.runUntilIdle();

    assert.deepEqual((await bundle.harness.effectJournalOf(agent.executionId)).map((entry) => entry.phase), [
      "requested",
      "authorized",
      "rejected",
    ]);
    assert.equal(executor.requests[1]!.observations[0]!.outcome, "rejected");
    assert.equal((await bundle.harness.structuredMemoryOf(agent.executionId))?.revision, 0);
  });

  test("fresh dispatch authorization can revoke a write that was exposed and selected", async () => {
    let allowed = true;
    const authorizer: EffectAuthorizer = {
      authorize() {
        return allowed
          ? { decision: "allow", grantId: "memory-current" }
          : { decision: "deny", code: "memory_revoked", message: "memory write authority was revoked" };
      },
    };
    const provider = createDeferredModelProvider("test");
    const bundle = createAgentTestHarness({
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      memoryWriteExposureGrants: true,
      authorizer,
      inlineWait: createNoInlineWaitBudget(),
    });
    const ref = await bundle.definitions.save(
      testAgent({ id: "fresh-write-denial", structuredMemory: { write: { keys: ["profile"] } } }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [], memory: MEMORY });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "task", payload: "go" });
    await bundle.harness.runUntilIdle();
    assert.deepEqual((provider.requests[0]!.capabilities ?? []).map((entry) => entry.name), ["memory_write_profile"]);

    allowed = false;
    provider.settle({ capabilityCalls: [{ id: "m1", capability: "memory_write_profile", input: { value: { name: "Ada" } } }] });
    await bundle.harness.drainResumptions();
    await bundle.harness.runOnce();

    assert.deepEqual((await bundle.harness.effectJournalOf(agent.executionId)).map((entry) => entry.phase), ["requested", "denied"]);
    assert.equal((await bundle.harness.structuredMemoryOf(agent.executionId))?.revision, 0);
  });

  test("a deferred answer resolves through its persisted projection, then a new invocation re-evaluates exposure", async () => {
    let calls = 0;
    let expose = true;
    const resolver: ActiveStructuredMemoryWriteViewResolver = {
      resolve() {
        calls += 1;
        return createActiveStructuredMemoryWriteView(
          expose
            ? [{ kind: "structured_memory_write", key: "profile", description: "Write profile.", valueSchema: MEMORY.fields[0].schema }]
            : [],
        );
      },
    };
    const provider = createDeferredModelProvider("test");
    const bundle = createAgentTestHarness({
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      structuredMemoryWriteView: resolver,
      authorizer: createAllowListAuthorizer({ grants: [], memory: true }),
      inlineWait: createNoInlineWaitBudget(),
    });
    const ref = await bundle.definitions.save(
      testAgent({ id: "write-snapshot", structuredMemory: { write: { keys: ["profile"] } } }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [], memory: MEMORY });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "task", payload: "go" });
    await bundle.harness.runUntilIdle();
    const stored = readAgentControlState((await bundle.harness.inspect(agent.executionId))!.control.progress);
    assert.equal(stored.status, "read");
    const state = (stored as { state: AgentControlState }).state;
    assert.deepEqual(state.invocation!.projection.bindings[0]!.target, { kind: "structured_memory_write", key: "profile" });
    assert.equal(calls, 1);

    expose = false;
    provider.settle({ capabilityCalls: [{ id: "m1", capability: "memory_write_profile", input: { value: { name: "Ada" } } }] });
    await bundle.harness.drainResumptions();
    await bundle.harness.runOnce();
    assert.equal(calls, 1, "re-entry used the stored projection without resolving exposure again");
    assert.deepEqual((await bundle.harness.structuredMemoryOf(agent.executionId))!.values["profile"]!.value, { name: "Ada" });

    await bundle.harness.runOnce();
    assert.equal(calls, 2, "the next genuine model invocation evaluates current exposure again");
    assert.deepEqual(provider.requests[1]!.capabilities ?? [], []);
  });

  test("capability and memory actions coexist in one projection and become their own Effect kinds", async () => {
    const executor = scriptedAgentExecutor([
      {
        kind: "call_operations",
        calls: [
          { callId: "c1", alias: "docs_search", input: { query: "Ada" } },
          { callId: "m1", alias: "memory_write_profile", input: { value: { name: "Ada" } } },
        ],
      },
      { kind: "respond", text: "done" },
    ]);
    const bundle = createAgentTestHarness({
      catalog: testCatalog(),
      models: agentModelAccess(testModelResolver()),
      executor,
      memoryWriteExposureGrants: true,
      authorizer: createAllowListAuthorizer({
        grants: [{ capability: "docs", operations: ["search"] }],
        memory: true,
      }),
      capabilities: createScriptedCapabilityExecutor({
        handlers: { "docs:search": () => ({ status: "success", observation: { hits: 1 } }) },
      }),
    });
    const ref = await bundle.definitions.save(
      testAgent({
        id: "mixed-actions",
        completion: "complete_on_response",
        operations: { refs: [DOCS_SEARCH] },
        structuredMemory: { write: { keys: ["profile"] } },
      }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH], memory: MEMORY });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "task", payload: "search and save" });
    await bundle.harness.runUntilIdle();

    assert.deepEqual(executor.requests[0]!.projection.bindings.map((binding) => binding.target.kind), [
      "capability_operation",
      "structured_memory_write",
    ]);
    assert.deepEqual(effectRequestsIn(await bundle.harness.effectJournalOf(agent.executionId)).map((entry) => entry.proposal.kind), [
      "use_capability",
      "write_memory",
    ]);
    assert.deepEqual(executor.requests[1]!.observations.map((observation) => observation.outcome), ["completed", "completed"]);
  });
});

describe("read information and write actions stay independent", () => {
  test("all four read/write exposure combinations preserve their separate branches", async () => {
    async function modelView(input: { read: boolean; write: boolean; readGrant: boolean; writeGrant: boolean }) {
      const store = new InMemoryRuntimeStore();
      const executor = scriptedAgentExecutor([{ kind: "respond", text: "done" }]);
      const bundle = createAgentTestHarness({
        store,
        models: agentModelAccess(testModelResolver()),
        executor,
        memoryReadGrants: input.readGrant,
        memoryWriteExposureGrants: input.writeGrant,
        authorizer: createAllowListAuthorizer({ grants: [], memory: true }),
      });
      const structuredMemory = {
        ...(input.read ? { read: { keys: ["profile"] } } : {}),
        ...(input.write ? { write: { keys: ["profile"] } } : {}),
      };
      const ref = await bundle.definitions.save(
        testAgent({
          id: `rw-${Number(input.read)}${Number(input.write)}${Number(input.readGrant)}${Number(input.writeGrant)}`,
          completion: "complete_on_response",
          ...((input.read || input.write) ? { structuredMemory } : {}),
        }),
      );
      const agent = await bundle.createAgent({ definition: ref, authority: [], memory: MEMORY });
      await seedStructuredMemory(store, agent.executionId, [{ key: "profile", value: { name: "Ada" } }]);
      await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "task", payload: "go" });
      await bundle.harness.runUntilIdle();
      return {
        hasRead: executor.requests[0]!.information.system.includes("# Structured Memory"),
        hasWrite: executor.requests[0]!.capabilities.some((entry) => entry.name === "memory_write_profile"),
      };
    }

    assert.deepEqual(await modelView({ read: true, write: false, readGrant: true, writeGrant: true }), { hasRead: true, hasWrite: false });
    assert.deepEqual(await modelView({ read: false, write: true, readGrant: true, writeGrant: true }), { hasRead: false, hasWrite: true });
    assert.deepEqual(await modelView({ read: true, write: true, readGrant: true, writeGrant: false }), { hasRead: true, hasWrite: false });
    assert.deepEqual(await modelView({ read: true, write: true, readGrant: false, writeGrant: true }), { hasRead: false, hasWrite: true });
  });
});

describe("model-directed writes preserve the existing confirmation path", () => {
  async function confirmationRun(decision: "approve" | "decline") {
    const executor = scriptedAgentExecutor([
      memorySelection("memory_write_count", 7),
      { kind: "respond", text: "settled" },
    ]);
    const bundle = createAgentTestHarness({
      models: agentModelAccess(testModelResolver()),
      executor,
      memoryWriteExposureGrants: true,
      authorizer: createAllowListAuthorizer({ grants: [], memory: true }),
      confirmationPolicy: confirmWrites,
    });
    const ref = await bundle.definitions.save(
      testAgent({
        id: `model-confirm-${decision}`,
        completion: "complete_on_response",
        structuredMemory: { write: { keys: ["count"] } },
      }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [], memory: MEMORY });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "task", payload: "save seven" });
    await bundle.harness.runUntilIdle();
    const [confirmation] = await bundle.harness.confirmationRequestsOf(agent.executionId);
    assert.deepEqual(confirmation!.proposal, {
      kind: "write_memory",
      key: "count",
      value: 7,
      requestKey: "ag/step1/call1",
    });
    assert.equal((await bundle.harness.structuredMemoryOf(agent.executionId))!.revision, 0);
    await bundle.harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision });
    await bundle.harness.runUntilIdle();
    return { bundle, agent, executor };
  }

  test("approval commits the exact stored proposal and settles through memory.written", async () => {
    const run = await confirmationRun("approve");
    assert.equal((await run.bundle.harness.structuredMemoryOf(run.agent.executionId))!.values["count"]!.value, 7);
    assert.deepEqual(run.executor.requests[1]!.observations[0]!.value, { key: "count", written: true });
    assert.equal(effectRequestsIn(await run.bundle.harness.effectJournalOf(run.agent.executionId)).length, 1);
  });

  test("decline writes nothing and becomes an ordinary declined action observation", async () => {
    const run = await confirmationRun("decline");
    assert.equal((await run.bundle.harness.structuredMemoryOf(run.agent.executionId))!.revision, 0);
    assert.equal(run.executor.requests[1]!.observations[0]!.outcome, "declined");
    assert.equal(effectRequestsIn(await run.bundle.harness.effectJournalOf(run.agent.executionId)).length, 1);
  });
});
