/**
 * Slice F.1 (as corrected by the F.1 review): the authorized Structured Memory read path.
 *
 * ```text
 * authored Agent information request         spec.structuredMemory.read.keys
 *   ↓ request only, never authority
 * read authority / grant narrowing
 *   ↓
 * bound Structured Memory view                resolved only for an authorized key
 *   ↓
 * authorized read snapshot
 *   ↓
 * context compilation (information branch)
 *   ↓
 * the model reads memory
 * ```
 *
 * The corrected design: the AgentController holds a narrow `StructuredMemoryReadViewResolver` the
 * way it holds the exposure resolver, and calls it *only* when it builds a new model invocation and
 * *only* if the Agent authored a read request. There is no `ActivationInput.memory` and no
 * per-Activation resolution. Read authority stays separate from `WriteMemory` authority; a read is
 * never an Effect.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import type { StructuredMemoryReadView, StructuredMemoryReadViewResolver } from "@agent-sdk/core/ports";
import {
  agentInformationSelectionId,
  compileAgentInformation,
  projectStructuredMemoryReadView,
  validateAgentSpec,
} from "@agent-sdk/core/execution";
import type { StructuredMemoryBinding, StructuredMemoryView } from "@agent-sdk/core/execution";
import type { StructuredMemoryReadGrantRule } from "@agent-sdk/core/reference";
import {
  createAllowListAuthorizer,
  createDeferredModelProvider,
  createNoInlineWaitBudget,
  createStructuredMemoryReadViewResolver,
  InMemoryRuntimeStore,
  ScriptedModelProvider,
} from "@agent-sdk/core/reference";
import {
  agentModelAccess,
  createAgentTestHarness,
  createTestHarness,
  referenceAgentExecutor,
  scriptedAgentDefinition,
  scriptedWorkflowDefinition,
  seedStructuredMemory,
} from "@agent-sdk/core/testing";
import { testAgent, testModelResolver } from "../agent/fixtures.ts";

const CORE_SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../../../packages/core/src");

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

const INSTRUCTIONS = "Use the operations you were given, then answer.";

/** A store that counts every Structured Memory read it serves. */
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

/** Wraps a resolver to count calls and record what each one saw. */
function countingResolver(inner: StructuredMemoryReadViewResolver) {
  const calls: { keys: readonly string[]; snapshot: StructuredMemoryReadView | null }[] = [];
  return {
    calls,
    get count() {
      return calls.length;
    },
    resolver: {
      async resolve(request: Parameters<StructuredMemoryReadViewResolver["resolve"]>[0]) {
        const snapshot = (await inner.resolve(request)) ?? null;
        calls.push({ keys: request.keys, snapshot });
        return snapshot;
      },
    } satisfies StructuredMemoryReadViewResolver,
  };
}

// -- the read snapshot is plain, narrowed data ------------------------------

describe("projectStructuredMemoryReadView keeps only readable fields and their current value", () => {
  const view: StructuredMemoryView = {
    memoryViewId: "smv_1",
    executionId: "exec_1" as StructuredMemoryView["executionId"],
    fields: [
      { key: "count", schema: { kind: "number", integer: true } },
      { key: "profile", description: "the profile", schema: { kind: "object", fields: {} } },
    ],
    values: {
      profile: {
        memoryViewId: "smv_1",
        key: "profile",
        value: { name: "Ada" },
        writerExecutionId: "exec_1" as StructuredMemoryView["executionId"],
        effectId: "eff_1" as never,
        activationId: null,
        writtenAt: "2026-01-01T00:00:00.000Z",
        revision: 1,
      },
    },
    writes: [],
    revision: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  test("a committed field carries its value; an unset one is undefined; no revision is exposed", () => {
    const snapshot = projectStructuredMemoryReadView(view, new Set(["profile", "count"]));
    assert.deepEqual(snapshot.fields, [
      { key: "count", schema: { kind: "number", integer: true }, value: undefined },
      { key: "profile", description: "the profile", schema: { kind: "object", fields: {} }, value: { name: "Ada" } },
    ]);
    assert.equal(snapshot.memoryViewId, "smv_1");
    assert.equal("revision" in snapshot, false, "no whole-view revision on the snapshot");
    for (const field of snapshot.fields) {
      assert.equal("revision" in field, false, "and none per field");
    }
  });

  test("a write to an unreadable field does not change the snapshot for a readable one", () => {
    const before = projectStructuredMemoryReadView(view, new Set(["profile"]));
    // The whole-view revision advances and an unreadable field gains a value.
    const after = projectStructuredMemoryReadView(
      {
        ...view,
        revision: 7,
        values: {
          ...view.values,
          count: { ...view.values["profile"]!, key: "count", value: 99, revision: 7 },
        },
      },
      new Set(["profile"]),
    );
    assert.deepEqual(after, before, "the profile snapshot is structurally identical");
  });

  test("a field outside the readable set never appears, and an unknown readable key is ignored", () => {
    const snapshot = projectStructuredMemoryReadView(view, new Set(["profile", "not_declared"]));
    assert.deepEqual(snapshot.fields.map((field) => field.key), ["profile"]);
  });
});

// -- the authored read request -------------------------------------------------

describe("AgentSpec.structuredMemory.read is a strictly validated request, not authority", () => {
  const base = {
    model: { logicalRef: "primary", requirements: { text: true } },
    instructions: "go",
  };
  const check = (structuredMemory: unknown) => validateAgentSpec({ ...base, structuredMemory });

  test("absent request is valid and means no memory read", () => {
    assert.equal(validateAgentSpec(base).ok, true);
  });

  test("a present request needs at least one non-empty unique key", () => {
    assert.equal(check({ read: { keys: ["profile", "count"] } }).ok, true);
    assert.equal(check({ read: { keys: [] } }).ok, false);
    assert.equal(check({ read: { keys: ["profile", "profile"] } }).ok, false);
    assert.equal(check({ read: { keys: ["profile", ""] } }).ok, false);
    assert.equal(check({ read: { keys: "profile" } }).ok, false);
  });

  test("unknown properties are rejected at every level", () => {
    assert.equal(check({ read: { keys: ["a"] }, write: {} }).ok, false);
    assert.equal(check({ read: { keys: ["a"], limit: 1 } }).ok, false);
    assert.equal(check({ readable: ["a"] }).ok, false);
  });
});

// -- the read resolver: deny-by-default, ordering, independence -----------------

describe("the reference read resolver applies the grant before any Structured Memory view read", () => {
  async function boundExecution(store: InMemoryRuntimeStore) {
    const bundle = createTestHarness({ store, authorizer: createAllowListAuthorizer({ grants: [], memory: true }) });
    const ref = await bundle.definitions.save(
      scriptedAgentDefinition({
        id: "writer",
        program: [
          { do: "propose_effect", effect: { kind: "write_memory", key: "profile", value: { name: "Ada" }, requestKey: "w1" } },
          { do: "complete" },
        ],
      }),
    );
    const handle = await bundle.harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await bundle.harness.runUntilIdle();
    return handle.executionId;
  }

  test("an unauthorized key - declared or unknown - resolves to null with zero view reads", async () => {
    const store = new CountingStore();
    const executionId = await boundExecution(store);
    store.viewReads = 0;
    store.executionReads = 0;
    const resolver = createStructuredMemoryReadViewResolver({ store, grants: { readableKeys: ["profile"] } });

    assert.equal(await resolver.resolve({ executionId, keys: ["count"] }), null, "declared but ungranted");
    assert.equal(await resolver.resolve({ executionId, keys: ["does_not_exist"] }), null, "unknown");
    assert.equal(await resolver.resolve({ executionId, keys: ["count", "does_not_exist"] }), null);
    assert.equal(store.viewReads, 0, "grant denial reads no Structured Memory view");
    assert.equal(store.executionReads, 0, "grant denial reads no Execution context either");
  });

  test("an authorized key does read the view, and existence is resolved there", async () => {
    const store = new CountingStore();
    const executionId = await boundExecution(store);
    store.viewReads = 0;
    const resolver = createStructuredMemoryReadViewResolver({ store, grants: { readableKeys: ["profile", "count"] } });

    const snapshot = await resolver.resolve({ executionId, keys: ["profile", "count"] });
    assert.deepEqual(snapshot?.fields.map((f) => ({ key: f.key, value: f.value })), [
      { key: "count", value: undefined },
      { key: "profile", value: { name: "Ada" } },
    ]);
    assert.ok(store.viewReads >= 1, "an authorized request resolves the bound view");
  });

  test("read grants and WriteMemory grants are independent", async () => {
    // read yes / write no: the writer's write_memory is denied by policy even though reads are granted.
    const bundle = createTestHarness({ authorizer: createAllowListAuthorizer({ grants: [], memory: false }) });
    const ref = await bundle.definitions.save(
      scriptedAgentDefinition({
        id: "read-not-write",
        program: [
          { do: "propose_effect", effect: { kind: "write_memory", key: "profile", value: { name: "Ada" }, requestKey: "w1" } },
          { do: "complete" },
        ],
      }),
    );
    const handle = await bundle.harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await bundle.harness.runUntilIdle();
    const journal = await bundle.harness.effectJournalOf(handle.executionId);
    assert.ok(journal.some((entry) => entry.phase === "denied"), "the write was denied");
    assert.equal((await bundle.harness.structuredMemoryOf(handle.executionId))?.revision, 0, "nothing committed");
  });
});

// -- the AgentController resolves the read view, per new invocation only --------

describe("the AgentController resolves the read view exactly once per new model invocation", () => {
  interface RunOptions {
    readonly request?: readonly string[];
    readonly grants?: StructuredMemoryReadGrantRule;
    readonly bind?: boolean;
    readonly seed?: readonly { key: string; value: unknown }[];
    readonly steps?: readonly { output: Record<string, unknown> }[];
  }

  async function runAgent(options: RunOptions) {
    const store = new CountingStore();
    const provider = new ScriptedModelProvider({
      id: "test",
      steps: options.steps ?? [{ output: { text: "answer" } }],
    });
    const wrapped = options.grants !== undefined
      ? countingResolver(createStructuredMemoryReadViewResolver({ store, grants: options.grants }))
      : null;
    const bundle = createAgentTestHarness({
      store,
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      ...(wrapped ? { structuredMemoryReadView: wrapped.resolver } : {}),
    });
    const ref = await bundle.definitions.save(
      testAgent({
        id: `read-${Math.random().toString(36).slice(2)}`,
        instructions: INSTRUCTIONS,
        ...(options.request ? { structuredMemory: { read: { keys: options.request } } } : {}),
      }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [], ...(options.bind ? { memory: MEMORY } : {}) });
    if (options.seed) {
      await seedStructuredMemory(store, agent.executionId, options.seed as { key: string; value: never }[]);
    }
    store.viewReads = 0;
    store.executionReads = 0;
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "hello" });
    await bundle.harness.runUntilIdle();
    await bundle.harness.drainResumptions();
    return { store, provider, bundle, agent, resolver: wrapped };
  }

  test("no authored read request: zero resolver calls, zero view reads, unchanged information", async () => {
    // The Execution has a binding, a write-enabled deployment, and a wired read resolver - and the
    // Agent still pays nothing, because it did not ask.
    const withWrite = createAllowListAuthorizer({ grants: [], memory: true });
    const run = await (async () => {
      const store = new CountingStore();
      const provider = new ScriptedModelProvider({ id: "test", steps: [{ output: { text: "answer" } }] });
      const wrapped = countingResolver(createStructuredMemoryReadViewResolver({ store, grants: true }));
      const bundle = createAgentTestHarness({
        store,
        authorizer: withWrite,
        models: agentModelAccess(testModelResolver()),
        executor: referenceAgentExecutor([provider]),
        structuredMemoryReadView: wrapped.resolver,
      });
      const ref = await bundle.definitions.save(testAgent({ id: "no-request", instructions: INSTRUCTIONS }));
      const agent = await bundle.createAgent({ definition: ref, authority: [], memory: MEMORY });
      await seedStructuredMemory(store, agent.executionId, [{ key: "profile", value: { name: "Ada" } }]);
      store.viewReads = 0;
      await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "hello" });
      await bundle.harness.runUntilIdle();
      return { store, provider, wrapped };
    })();

    assert.equal(run.wrapped.count, 0, "the resolver was never called");
    assert.equal(run.store.viewReads, 0, "no Structured Memory view was read");
    assert.equal(run.provider.requests[0]!.system, INSTRUCTIONS, "the system prompt is exactly the instructions");
  });

  test("an authored request for an unauthorized key resolves to null and reads no view", async () => {
    const run = await runAgent({
      request: ["count"],
      grants: { readableKeys: ["profile"] },
      bind: true,
      seed: [{ key: "count", value: 3 }],
    });
    assert.equal(run.resolver!.count, 1, "one resolution for the one new invocation");
    assert.equal(run.resolver!.calls[0]!.snapshot, null, "it resolved to no snapshot");
    assert.equal(run.store.viewReads, 0, "grant denial happened before any view read");
    assert.equal(run.provider.requests[0]!.system, INSTRUCTIONS);
  });

  test("request keys are intersected with read authority and with the bound view", async () => {
    // bound view: profile, count, flag
    // authored request: profile, count
    // read grant permits: profile, flag
    // model receives: profile only
    const run = await runAgent({
      request: ["profile", "count"],
      grants: { readableKeys: ["profile", "flag"] },
      bind: true,
      seed: [{ key: "profile", value: { name: "Ada" } }],
    });
    const system = run.provider.requests[0]!.system;
    assert.match(system, /profile — .*\{"name":"Ada"\}/);
    assert.doesNotMatch(system, /\bcount\b/, "count was requested but not read-authorized");
    assert.doesNotMatch(system, /\bflag\b/, "flag was read-authorized but not requested");
  });

  test("one resolution per new invocation; zero on re-entry; a later invocation sees newer authorized state", async () => {
    const store = new CountingStore();
    const provider = createDeferredModelProvider("test");
    let failNext = false;
    const inner = createStructuredMemoryReadViewResolver({ store, grants: true });
    const wrapped = countingResolver({
      async resolve(request) {
        if (failNext) throw new Error("the read resolver must not be called on re-entry");
        return inner.resolve(request);
      },
    });
    const bundle = createAgentTestHarness({
      store,
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      structuredMemoryReadView: wrapped.resolver,
      inlineWait: createNoInlineWaitBudget(),
    });
    const ref = await bundle.definitions.save(
      testAgent({ id: "reentry", instructions: INSTRUCTIONS, structuredMemory: { read: { keys: ["profile"] } } }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [], memory: MEMORY });
    await seedStructuredMemory(store, agent.executionId, [{ key: "profile", value: { name: "Ada" } }]);

    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "one" });
    await bundle.harness.runUntilIdle();
    assert.equal(wrapped.count, 1, "step 1 resolved the read view once");
    assert.deepEqual(wrapped.calls[0]!.snapshot?.fields.map((f) => f.value), [{ name: "Ada" }], "and saw the old value");

    // The value changes while the model call is outstanding.
    await seedStructuredMemory(store, agent.executionId, [{ key: "profile", value: { name: "Bo" } }]);
    failNext = true;
    provider.settle({ text: "first" });
    await bundle.harness.drainResumptions();
    await bundle.harness.runUntilIdle();
    assert.equal(wrapped.count, 1, "re-entry re-resolved nothing");
    assert.equal(provider.invocationCount, 1, "and recompiled nothing: the provider saw one request");
    assert.match(provider.requests[0]!.system, /\{"name":"Ada"\}/, "the frozen invocation still shows the old value");

    // The next genuine new invocation resolves again and sees the newer authorized state.
    failNext = false;
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "two" });
    await bundle.harness.runUntilIdle();
    assert.equal(wrapped.count, 2, "a new invocation resolved once more");
    assert.deepEqual(wrapped.calls[1]!.snapshot?.fields.map((f) => f.value), [{ name: "Bo" }]);
    provider.settle({ text: "second" });
    await bundle.harness.drainResumptions();
    await bundle.harness.runUntilIdle();
    assert.match(provider.requests[1]!.system, /\{"name":"Bo"\}/, "step 2 sees the new value");
  });
});

// -- rendering ---------------------------------------------------------------

describe("the reference Agent information compiler renders authorized Structured Memory as data", () => {
  async function system(options: {
    request?: readonly string[];
    grants?: StructuredMemoryReadGrantRule;
    seed?: readonly { key: string; value: unknown }[];
  }) {
    const store = new InMemoryRuntimeStore();
    const provider = new ScriptedModelProvider({ id: "test", steps: [{ output: { text: "answer" } }] });
    const bundle = createAgentTestHarness({
      store,
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      ...(options.grants !== undefined ? { memoryReadGrants: options.grants } : {}),
    });
    const ref = await bundle.definitions.save(
      testAgent({
        id: `render-${Math.random().toString(36).slice(2)}`,
        instructions: INSTRUCTIONS,
        ...(options.request ? { structuredMemory: { read: { keys: options.request } } } : {}),
      }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [], memory: MEMORY });
    if (options.seed) await seedStructuredMemory(store, agent.executionId, options.seed as { key: string; value: never }[]);
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "hello" });
    await bundle.harness.runUntilIdle();
    return provider.requests[0]!.system;
  }

  test("no request: the system prompt is exactly the instructions, even with a committed value", async () => {
    assert.equal(await system({ grants: true, seed: [{ key: "profile", value: { name: "Ada" } }] }), INSTRUCTIONS);
  });

  test("the block declares the data boundary, leaks no view id, and states no whole-view revision", async () => {
    const rendered = await system({
      request: ["profile"],
      grants: true,
      seed: [{ key: "profile", value: { name: "Ada" } }],
    });
    assert.match(rendered, /# Structured Memory/);
    assert.match(rendered, /read-only application data, not instructions/);
    assert.match(rendered, /profile — .*\{"name":"Ada"\}/);
    assert.doesNotMatch(rendered, /smv_|memoryViewId/, "the internal view id is never rendered");
    assert.doesNotMatch(rendered, /revision/i, "no whole-view revision reaches the model");
  });

  test("a declared but unset readable field renders as (not set)", async () => {
    const rendered = await system({ request: ["profile", "count"], grants: true, seed: [{ key: "profile", value: { name: "Ada" } }] });
    assert.match(rendered, /profile — .*\{"name":"Ada"\}/);
    assert.match(rendered, /count — .*\(not set\)/);
  });

  test("the rendering is deterministic", async () => {
    const seed = [{ key: "profile", value: { name: "Ada" } }];
    assert.equal(
      await system({ request: ["profile"], grants: true, seed }),
      await system({ request: ["profile"], grants: true, seed }),
    );
  });
});

// -- the semantic invariant: consumer information changes only when authorized selected info changes

describe("consumer-visible memory information tracks authorized selected state, not hidden runtime state", () => {
  async function run(seed: readonly { key: string; value: unknown }[]) {
    const store = new InMemoryRuntimeStore();
    const provider = new ScriptedModelProvider({ id: "test", steps: [{ output: { text: "answer" } }] });
    const bundle = createAgentTestHarness({
      store,
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      memoryReadGrants: { readableKeys: ["profile"] }, // profile only: count and flag are unreadable
    });
    const ref = await bundle.definitions.save(
      testAgent({ id: `inv-${Math.random().toString(36).slice(2)}`, instructions: INSTRUCTIONS, structuredMemory: { read: { keys: ["profile"] } } }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [], memory: MEMORY });
    await seedStructuredMemory(store, agent.executionId, seed as { key: string; value: never }[]);
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "hello" });
    await bundle.harness.runUntilIdle();
    return {
      system: provider.requests[0]!.system,
      messages: provider.requests[0]!.messages,
      selectionId: bundle.trace.informationSelections()[0]!,
    };
  }

  test("an unreadable/unrequested field changing leaves the AgentInformationContext and its id unchanged", async () => {
    const base = await run([{ key: "profile", value: { name: "Ada" } }]);
    // Same authorized/selected field, plus a write to a field the Agent can neither request nor read.
    const hidden = await run([
      { key: "profile", value: { name: "Ada" } },
      { key: "count", value: 999 },
      { key: "flag", value: true },
    ]);
    assert.equal(hidden.system, base.system, "the compiled system prompt is byte-identical");
    assert.deepEqual(hidden.messages, base.messages, "and so are the messages");
    assert.equal(hidden.selectionId, base.selectionId, "so the information-selection id is unchanged");
  });

  test("the authorized/requested field changing does change the context and its id", async () => {
    const base = await run([{ key: "profile", value: { name: "Ada" } }]);
    const changed = await run([{ key: "profile", value: { name: "Bo" } }]);
    assert.notEqual(changed.system, base.system, "the selected value is different");
    assert.notEqual(changed.selectionId, base.selectionId, "so the information-selection id changes");
  });

  test("directly: the compiler and its id are a function of the snapshot's readable fields only", () => {
    const readable = new Set(["profile"]);
    const base: StructuredMemoryView = {
      memoryViewId: "smv_x",
      executionId: "exec_x" as StructuredMemoryView["executionId"],
      fields: MEMORY.fields as unknown as StructuredMemoryView["fields"],
      values: {
        profile: { memoryViewId: "smv_x", key: "profile", value: { name: "Ada" }, writerExecutionId: "exec_x" as never, effectId: "e" as never, activationId: null, writtenAt: "t", revision: 1 },
      },
      writes: [],
      revision: 1,
      createdAt: "t",
      updatedAt: "t",
    };
    const hiddenChanged: StructuredMemoryView = {
      ...base,
      revision: 5,
      values: { ...base.values, count: { ...base.values["profile"]!, key: "count", value: 42, revision: 5 } },
    };
    const selectedChanged: StructuredMemoryView = {
      ...base,
      revision: 5,
      values: { profile: { ...base.values["profile"]!, value: { name: "Bo" }, revision: 5 } },
    };
    const input = (view: StructuredMemoryView) => ({
      instructions: "go",
      messages: [] as never[],
      maxMessages: 8,
      memory: projectStructuredMemoryReadView(view, readable),
    });

    assert.deepEqual(compileAgentInformation(input(hiddenChanged)), compileAgentInformation(input(base)));
    assert.equal(
      agentInformationSelectionId(compileAgentInformation(input(hiddenChanged))),
      agentInformationSelectionId(compileAgentInformation(input(base))),
    );
    assert.notEqual(
      agentInformationSelectionId(compileAgentInformation(input(selectedChanged))),
      agentInformationSelectionId(compileAgentInformation(input(base))),
    );
  });
});

// -- controller-neutral seam; Agent is the only F.1 consumer -------------------

describe("the read seam stays controller-neutral while F.1 wires only the Agent", () => {
  test("the shared read modules name no controller concept", async () => {
    for (const path of [
      "execution/structured-memory-read.ts",
      "ports/structured-memory-read-view.ts",
      "reference/structured-memory-read-view-resolver.ts",
    ]) {
      const code = (await readFile(resolve(CORE_SRC, path), "utf8")).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      for (const term of ["Agent", "Workflow", "Stage", "projection", "step"]) {
        assert.ok(!new RegExp(`\\b${term}\\b`).test(code), `${path} must not mention "${term}"`);
      }
    }
  });

  test("only the AgentController is wired to the resolver; the WorkflowController is not", async () => {
    const agent = await readFile(resolve(CORE_SRC, "controllers/agent/controller.ts"), "utf8");
    const workflow = await readFile(resolve(CORE_SRC, "controllers/workflow/controller.ts"), "utf8");
    assert.ok(agent.includes("StructuredMemoryReadViewResolver"), "the Agent controller holds the resolver");
    assert.ok(!workflow.includes("StructuredMemoryRead"), "the Workflow controller has no memory read wiring in F.1");
  });

  test("a Workflow with a Structured Memory binding runs without any read", async () => {
    const store = new CountingStore();
    const bundle = createTestHarness({
      store,
      authorizer: createAllowListAuthorizer({ grants: [], memory: true }),
    });
    const ref = await bundle.definitions.save(scriptedWorkflowDefinition({ id: "wf-mem", program: [{ do: "complete" }] }));
    const handle = await bundle.harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    store.viewReads = 0;
    await bundle.harness.runUntilIdle();
    const context = await bundle.harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.equal(store.viewReads, 0, "no F.1 consumer means no read");
  });
});
