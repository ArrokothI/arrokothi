/** Typed action bindings persist identity without carrying permission. */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AgentControlState } from "@agent-sdk/core/execution";
import {
  createActiveModelActionView,
  createActiveStructuredMemoryWriteView,
  createModelActionProjection,
  isModelActionTarget,
  MODEL_ACTION_TARGET_KINDS,
  operationRefOfTarget,
  readAgentControlState,
  resolveProjectedAlias,
} from "@agent-sdk/core/execution";
import {
  createAllowListAuthorizer,
  createDeferredModelProvider,
  createNoInlineWaitBudget,
  createScriptedCapabilityExecutor,
} from "@agent-sdk/core/reference";
import { agentModelAccess, createAgentTestHarness, referenceAgentExecutor } from "@agent-sdk/core/testing";
import { DOCS_SEARCH, SEARCH_INPUT, testAgent, testCatalog, testModelResolver } from "./fixtures.ts";

function view(entries: readonly { readonly capability: string; readonly operation: string }[]) {
  return createActiveModelActionView({
    operations: {
      viewId: "aov_1",
      authorityId: "au_1",
      authorityVersion: 1,
      entries: entries.map((ref) => ({
        capability: ref.capability,
        operation: ref.operation,
        title: "Search",
        description: "Search the corpus.",
        input: SEARCH_INPUT,
        consequential: false,
        groups: [],
      })),
      omitted: [],
    },
    structuredMemoryWrites: createActiveStructuredMemoryWriteView([]),
  });
}

describe("a projection binding names a typed action target", () => {
  test("the target vocabulary has independent capability and Structured Memory arms", () => {
    assert.deepEqual(MODEL_ACTION_TARGET_KINDS, ["capability_operation", "structured_memory_write"]);
    assert.equal(isModelActionTarget({ kind: "capability_operation", capability: "docs", operation: "search" }), true);
    assert.equal(isModelActionTarget({ kind: "structured_memory_write", key: "profile" }), true);
    assert.equal(isModelActionTarget({ kind: "structured_memory_write", key: "profile", value: "x" }), false);
    assert.equal(isModelActionTarget({ kind: "write_memory", key: "profile" }), false);
    assert.deepEqual(operationRefOfTarget({ kind: "capability_operation", capability: "docs", operation: "search" }), DOCS_SEARCH);
    assert.equal(operationRefOfTarget({ kind: "structured_memory_write", key: "profile" }), null);
  });

  test("every binding originates in the heterogeneous Active Model Action View", () => {
    const activeView = createActiveModelActionView({
      operations: {
        viewId: "aov_1",
        authorityId: "au_1",
        authorityVersion: 1,
        entries: view([DOCS_SEARCH]).entries.filter((entry) => entry.kind === "capability_operation").map(({ kind: _kind, ...entry }) => entry),
        omitted: [],
      },
      structuredMemoryWrites: createActiveStructuredMemoryWriteView([
        {
          kind: "structured_memory_write",
          key: "profile",
          description: "Write the profile.",
          valueSchema: { kind: "string" },
        },
      ]),
    });
    const built = createModelActionProjection({ projectionId: "ag/step1/projection", view: activeView });
    assert.ok(built.ok);
    if (!built.ok) return;
    assert.equal(built.projection.viewId, activeView.viewId);
    assert.deepEqual(built.projection.bindings.map((binding) => binding.target), [
      { kind: "capability_operation", capability: "docs", operation: "search" },
      { kind: "structured_memory_write", key: "profile" },
    ]);
  });

  test("an alias resolves only through its snapshot", () => {
    const built = createModelActionProjection({ projectionId: "ag/step1/projection", view: view([DOCS_SEARCH]) });
    assert.ok(built.ok);
    if (!built.ok) return;
    assert.deepEqual((resolveProjectedAlias(built.projection, "docs_search") as { binding: { target: unknown } }).binding.target, {
      kind: "capability_operation",
      capability: "docs",
      operation: "search",
    });
    assert.equal(resolveProjectedAlias(built.projection, "docs_searchh").resolved, false);
  });

  test("a suspended invocation and its eventual pending call preserve the typed target", async () => {
    const provider = createDeferredModelProvider("test");
    const bundle = createAgentTestHarness({
      catalog: testCatalog(),
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
      capabilities: createScriptedCapabilityExecutor({
        handlers: { "docs:search": () => ({ status: "success", observation: { hits: 1 } }) },
      }),
      inlineWait: createNoInlineWaitBudget(),
    });
    const ref = await bundle.definitions.save(testAgent({ id: "targets", operations: { refs: [DOCS_SEARCH] } }));
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "search" });
    await bundle.harness.runUntilIdle();

    const suspended = await bundle.harness.inspect(agent.executionId);
    const stored = readAgentControlState(suspended!.control.progress);
    assert.equal(stored.status, "read");
    const state = (stored as { readonly state: AgentControlState }).state;
    assert.deepEqual(state.invocation!.projection.bindings[0]!.target, {
      kind: "capability_operation",
      capability: "docs",
      operation: "search",
    });

    provider.settle({ capabilityCalls: [{ id: "c1", capability: "docs_search", input: { query: "q" } }] });
    await bundle.harness.drainResumptions();
    await bundle.harness.runUntilIdle();
    const journal = await bundle.harness.effectJournalOf(agent.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "authorized", "dispatch_started", "completed"]);
    assert.equal(journal[1]!.detail["capability"], "docs");
    assert.equal(journal[1]!.detail["operation"], "search");
  });

  test("progress written by a different control-state version is refused", () => {
    const read = readAgentControlState({
      version: 1,
      step: 1,
      started: true,
      messages: [],
      pending: [{ correlationId: "ag/step1/call1", capability: "docs", operation: "search" }],
    } as never);
    assert.deepEqual(read, { status: "unsupported", version: 1 });
    assert.deepEqual(readAgentControlState({} as never), { status: "absent" });
  });
});
