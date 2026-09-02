/**
 * Slice F.1: the authorized read-only Structured Memory snapshot, and the Agent reading it.
 *
 * F.0 made Structured Memory writable through the Effect gateway but unreadable by any model. F.1
 * adds the read path, and only the read path:
 *
 * ```text
 * authorized Structured Memory
 *   -> read-only memory information view   (Harness resolves it, deny-by-default)
 *   -> context compilation                (the information branch selects from it)
 *   -> the model reads memory
 * ```
 *
 * The canonical distinctions this slice keeps:
 *   - memory != context: the compiler *selects* the snapshot into context and could select none;
 *   - information selection != operation projection: nothing here touches the Active View;
 *   - read authority != write authority: a `WriteMemory` grant is not a read grant and vice versa;
 *   - no `ReadMemory` Effect: a read never crosses the Effect gateway;
 *   - the seam is controller-neutral; F.1 wires only the Agent as a consumer.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import type {
  ActivationInput,
  ActivationOutcome,
  ControllerResumptionScope,
  ExecutionController,
  StructuredMemoryReadView,
} from "@agent-sdk/core/ports";
import { projectStructuredMemoryReadView } from "@agent-sdk/core/execution";
import type { StructuredMemoryBinding, StructuredMemoryView } from "@agent-sdk/core/execution";
import type { StructuredMemoryReadGrantRule } from "@agent-sdk/core/reference";
import {
  createAllowListAuthorizer,
  createStructuredMemoryReadViewResolver,
} from "@agent-sdk/core/reference";
import {
  agentModelAccess,
  createAgentTestHarness,
  createTestHarness,
  scriptedAgentDefinition,
  scriptedWorkflowDefinition,
  seedStructuredMemory,
} from "@agent-sdk/core/testing";
import { scriptedAgentExecutor, testAgent, testModelResolver } from "../agent/fixtures.ts";

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
  ],
} as const satisfies StructuredMemoryBinding;

const INSTRUCTIONS = "Use the operations you were given, then answer.";

/** Captures what the Harness handed one Activation, then completes. Parametrised by kind. */
class CapturingController implements ExecutionController {
  captured: ActivationInput | null = null;
  readonly kind: "agent" | "workflow";
  constructor(kind: "agent" | "workflow") {
    this.kind = kind;
  }
  activate(input: ActivationInput, _resumptions: ControllerResumptionScope): ActivationOutcome {
    this.captured = input;
    return { control: { kind: this.kind, progress: {} }, next: { status: "complete" } };
  }
}

// -- the read snapshot is plain, narrowed data -------------------------------

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

  test("a committed field carries its value and revision; an unset one is undefined", () => {
    const snapshot = projectStructuredMemoryReadView(view, new Set(["profile", "count"]));
    assert.deepEqual(snapshot.fields, [
      { key: "count", schema: { kind: "number", integer: true }, value: undefined, revision: undefined },
      { key: "profile", description: "the profile", schema: { kind: "object", fields: {} }, value: { name: "Ada" }, revision: 1 },
    ]);
    assert.equal(snapshot.memoryViewId, "smv_1");
    assert.equal(snapshot.revision, 1);
  });

  test("a field outside the readable set never appears, and an unknown readable key is ignored", () => {
    const snapshot = projectStructuredMemoryReadView(view, new Set(["profile", "not_declared"]));
    assert.deepEqual(snapshot.fields.map((field) => field.key), ["profile"]);
  });
});

// -- the resolver applies read grants, deny-by-default -----------------------

describe("the Structured Memory read resolver is deny-by-default and separate from WriteMemory", () => {
  async function writerBundle(grants: Parameters<typeof createStructuredMemoryReadViewResolver>[0]["grants"]) {
    const bundle = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [], memory: true }),
    });
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
    const resolver = createStructuredMemoryReadViewResolver({ store: bundle.store, grants });
    return { resolver, executionId: handle.executionId };
  }

  test("no grant resolves to null even when a value is committed", async () => {
    const { resolver, executionId } = await writerBundle(false);
    assert.equal(await resolver.resolve({ executionId, keys: ["profile", "count"] }), null);
  });

  test("a per-key grant returns only that field", async () => {
    const { resolver, executionId } = await writerBundle({ readableKeys: ["profile"] });
    const snapshot = await resolver.resolve({ executionId, keys: ["profile", "count"] });
    assert.deepEqual(snapshot?.fields.map((field) => field.key), ["profile"]);
    assert.deepEqual(snapshot?.fields[0]?.value, { name: "Ada" });
  });

  test("an Execution with no memory binding resolves to null", async () => {
    const bundle = createTestHarness();
    const ref = await bundle.definitions.save(scriptedAgentDefinition({ id: "bare", program: [{ do: "complete" }] }));
    const handle = await bundle.harness.createExecution({ definition: ref });
    const resolver = createStructuredMemoryReadViewResolver({ store: bundle.store, grants: true });
    assert.equal(await resolver.resolve({ executionId: handle.executionId, keys: ["profile"] }), null);
  });

  test("read grants and WriteMemory grants are independent knobs", async () => {
    // A read grant does not authorize a write: the writer's `write_memory` is denied by policy.
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

// -- the Harness delivers the snapshot to any controller, unchanged ----------

describe("the Harness resolves the snapshot and delivers it on ActivationInput.memory", () => {
  async function capture(kind: "agent" | "workflow", options: { grant: boolean; bind: boolean }) {
    const controller = new CapturingController(kind);
    const store = createTestHarness().store;
    const bundle = createTestHarness({
      controllers: [controller],
      store,
      ...(options.grant
        ? { structuredMemoryReadView: createStructuredMemoryReadViewResolver({ store, grants: true }) }
        : {}),
    });
    const definition =
      kind === "agent"
        ? scriptedAgentDefinition({ id: `cap-${kind}`, program: [{ do: "complete" }] })
        : scriptedWorkflowDefinition({ id: `cap-${kind}`, program: [{ do: "complete" }] });
    const ref = await bundle.definitions.save(definition);
    const handle = await bundle.harness.createExecution({
      definition: ref,
      ...(options.bind ? { structuredMemory: MEMORY } : {}),
    });
    if (options.bind) await seedStructuredMemory(bundle.store, handle.executionId, [{ key: "profile", value: { name: "Ada" } }]);
    await bundle.harness.runUntilIdle();
    return controller.captured;
  }

  test("ActivationInput.memory is null with no binding, and null with a binding but no resolver", async () => {
    assert.equal((await capture("agent", { grant: true, bind: false }))?.memory, null);
    assert.equal((await capture("agent", { grant: false, bind: true }))?.memory, null);
  });

  test("a bound Execution with a read grant receives the authorized snapshot - Agent and Workflow alike", async () => {
    for (const kind of ["agent", "workflow"] as const) {
      const input = await capture(kind, { grant: true, bind: true });
      const memory = input?.memory as StructuredMemoryReadView;
      assert.ok(memory, `${kind} received the snapshot`);
      assert.equal(memory.revision, 1);
      assert.deepEqual(
        memory.fields.map((field) => ({ key: field.key, value: field.value })),
        [
          { key: "count", value: undefined },
          { key: "profile", value: { name: "Ada" } },
        ],
        `${kind} sees the same controller-neutral snapshot`,
      );
    }
  });

  test("the shared read modules name no controller concept", async () => {
    for (const path of ["execution/structured-memory-read.ts", "ports/structured-memory-read-view.ts", "reference/structured-memory-read-view-resolver.ts"]) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const term of ["Agent", "Workflow", "Stage", "projection", "step"]) {
        assert.ok(!new RegExp(`\\b${term}\\b`).test(source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), `${path} must not mention "${term}"`);
      }
    }
  });
});

// -- the reference Agent information branch renders it -----------------------

describe("the reference Agent information compiler renders authorized Structured Memory", () => {
  async function runAgent(options: {
    memoryReadGrants?: StructuredMemoryReadGrantRule;
    bind?: boolean;
    seed?: readonly { key: string; value: unknown }[];
  }) {
    const executor = scriptedAgentExecutor([
      { kind: "respond", text: "one" },
      { kind: "respond", text: "two" },
    ]);
    const bundle = createAgentTestHarness({
      models: agentModelAccess(testModelResolver()),
      executor,
      ...(options.memoryReadGrants !== undefined ? { memoryReadGrants: options.memoryReadGrants } : {}),
    });
    const ref = await bundle.definitions.save(testAgent({ id: `read-${Math.random().toString(36).slice(2)}`, instructions: INSTRUCTIONS }));
    const agent = await bundle.createAgent({
      definition: ref,
      authority: [],
      ...(options.bind ? { memory: MEMORY } : {}),
    });
    if (options.seed) {
      await seedStructuredMemory(bundle.store, agent.executionId, options.seed as { key: string; value: never }[]);
    }
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "hello" });
    await bundle.harness.runUntilIdle();
    await bundle.harness.drainResumptions();
    return { executor, bundle, agent };
  }

  test("no read grant: the system prompt is exactly the instructions, even with a committed value", async () => {
    const { executor } = await runAgent({ bind: true, seed: [{ key: "profile", value: { name: "Ada" } }] });
    assert.equal(executor.requests[0]!.information.system, INSTRUCTIONS);
  });

  test("a granted key and its value are rendered; an ungranted key is absent", async () => {
    const { executor } = await runAgent({
      bind: true,
      memoryReadGrants: { readableKeys: ["profile"] },
      seed: [{ key: "profile", value: { name: "Ada" } }],
    });
    const system = executor.requests[0]!.information.system;
    assert.match(system, /# Structured Memory/);
    assert.match(system, /profile — .*: \{"name":"Ada"\}/);
    assert.doesNotMatch(system, /\bcount\b/, "count was not granted");
  });

  test("a declared but unset readable field renders as (not set)", async () => {
    const { executor } = await runAgent({ bind: true, memoryReadGrants: true, seed: [{ key: "profile", value: { name: "Ada" } }] });
    const system = executor.requests[0]!.information.system;
    assert.match(system, /profile — .*: \{"name":"Ada"\}/);
    assert.match(system, /count — .*: \(not set\)/);
  });

  test("the rendering is deterministic and the selection identity reflects it", async () => {
    const a = await runAgent({ bind: true, memoryReadGrants: true, seed: [{ key: "profile", value: { name: "Ada" } }] });
    const b = await runAgent({ bind: true, memoryReadGrants: true, seed: [{ key: "profile", value: { name: "Ada" } }] });
    assert.equal(a.executor.requests[0]!.information.system, b.executor.requests[0]!.information.system);
    assert.deepEqual(a.bundle.trace.informationSelections()[0], b.bundle.trace.informationSelections()[0]);

    const c = await runAgent({ bind: true, memoryReadGrants: true, seed: [{ key: "profile", value: { name: "Bo" } }] });
    assert.notEqual(a.bundle.trace.informationSelections()[0], c.bundle.trace.informationSelections()[0], "a different value is a different selection");
  });

  test("a value committed after step 1 is visible to step 2, not retroactively to step 1", async () => {
    const { executor, bundle, agent } = await runAgent({ bind: true, memoryReadGrants: true });
    const stepOneSystem = executor.requests[0]!.information.system;
    assert.match(stepOneSystem, /profile — .*: \(not set\)/, "profile is unset at step 1");

    await seedStructuredMemory(bundle.store, agent.executionId, [{ key: "profile", value: { name: "Ada" } }]);
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "again" });
    await bundle.harness.runUntilIdle();
    await bundle.harness.drainResumptions();

    assert.equal(executor.requests[0]!.information.system, stepOneSystem, "step 1's frozen context is unchanged");
    assert.match(executor.requests[1]!.information.system, /profile — .*: \{"name":"Ada"\}/, "step 2 sees the new value");
  });
});
