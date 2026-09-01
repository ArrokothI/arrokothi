/**
 * A model-visible action names a typed target, not a capability operation by assumption.
 *
 * v0.4 resolves exactly one target kind, and that is correct for the first Agent slice. What must
 * not be correct-by-accident is the *persisted* shape: a projection is written into an invocation
 * snapshot, so a flat `capability`/`operation` pair would have stored the claim that every
 * model-visible action is a capability operation - which canonical interoperability does not say,
 * and which would need migrating the moment a second action family became useful.
 *
 * ```text
 * v0.4 target kinds   capability_operation   ->  UseCapability
 * later, possibly     memory write, child execution, message, user input, local computation
 * ```
 *
 * So the assertions here are about shape and resolution: the snapshot carries a discriminated
 * target, an alias resolves to that exact target, an unknown alias resolves to nothing, and a later
 * Active View cannot reach back and change what an older snapshot meant.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ActiveOperationView, AgentControlState } from "@agent-sdk/core/execution";
import {
  createModelOperationProjection,
  MODEL_ACTION_TARGET_KINDS,
  isModelActionTarget,
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

function view(entries: readonly { readonly capability: string; readonly operation: string }[]): ActiveOperationView {
  return {
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
  };
}

describe("a projection binding names a typed action target", () => {
  test("v0.4 supports exactly one target kind, and says so", () => {
    assert.deepEqual(MODEL_ACTION_TARGET_KINDS, ["capability_operation"]);
    assert.equal(isModelActionTarget({ kind: "capability_operation", capability: "docs", operation: "search" }), true);
    assert.equal(isModelActionTarget({ kind: "write_memory", scope: "session" }), false, "no other kind is accepted");
    assert.equal(isModelActionTarget({ capability: "docs", operation: "search" }), false, "and an untagged pair is not one");
    assert.deepEqual(
      operationRefOfTarget({ kind: "capability_operation", capability: "docs", operation: "search" }),
      { capability: "docs", operation: "search" },
    );
  });

  test("the built snapshot carries the target, and an alias resolves to that exact one", () => {
    const built = createModelOperationProjection({
      projectionId: "ag/step1/projection",
      view: view([DOCS_SEARCH]),
    });
    assert.ok(built.ok);
    if (!built.ok) return;

    assert.deepEqual(built.projection.bindings[0]!.target, {
      kind: "capability_operation",
      capability: "docs",
      operation: "search",
    });

    const resolved = resolveProjectedAlias(built.projection, "docs_search");
    assert.ok(resolved.resolved);
    if (!resolved.resolved) return;
    assert.deepEqual(resolved.binding.target, {
      kind: "capability_operation",
      capability: "docs",
      operation: "search",
    });

    // Deterministic non-resolution: no nearest match, no catalog fallback.
    const unknown = resolveProjectedAlias(built.projection, "docs_searchh");
    assert.equal(unknown.resolved, false);
  });

  test("a later Active View cannot change what an older snapshot's alias means", () => {
    // Same flattened alias, two different identities, built from two different views.
    const first = createModelOperationProjection({
      projectionId: "ag/step1/projection",
      view: view([{ capability: "docs.search", operation: "v2" }]),
    });
    const second = createModelOperationProjection({
      projectionId: "ag/step2/projection",
      view: view([{ capability: "docs", operation: "search.v2" }]),
    });
    assert.ok(first.ok && second.ok);
    if (!first.ok || !second.ok) return;

    const answer = "docs_search_v2";
    assert.deepEqual((resolveProjectedAlias(first.projection, answer) as { binding: { target: unknown } }).binding.target, {
      kind: "capability_operation",
      capability: "docs.search",
      operation: "v2",
    });
    assert.deepEqual((resolveProjectedAlias(second.projection, answer) as { binding: { target: unknown } }).binding.target, {
      kind: "capability_operation",
      capability: "docs",
      operation: "search.v2",
    });
  });

  test("the persisted invocation snapshot and pending call both carry the target", async () => {
    // The point of the whole change: what a suspended invocation stores is the typed shape, so a
    // second action family later is a new arm rather than a migration of every stored projection.
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
    assert.equal(state.version, 2, "the stored shape is versioned honestly");
    assert.deepEqual(state.invocation!.projection.bindings[0]!.target, {
      kind: "capability_operation",
      capability: "docs",
      operation: "search",
    });
    assert.equal(
      JSON.stringify(state.invocation!.projection).includes('"capability":"docs","operation":"search"'),
      true,
      "the identity is still there - it is just inside the target rather than beside it",
    );

    provider.settle({ capabilityCalls: [{ id: "c1", capability: "docs_search", input: { query: "q" } }] });
    await bundle.harness.drainResumptions();
    await bundle.harness.runUntilIdle();

    // And it still became an ordinary UseCapability with the identity the target named.
    const journal = await bundle.harness.effectJournalOf(agent.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "authorized", "dispatch_started", "completed"]);
    assert.equal(journal[1]!.detail["capability"], "docs");
    assert.equal(journal[1]!.detail["operation"], "search");
  });

  test("progress written by a different control-state version is refused, not reinterpreted", () => {
    const read = readAgentControlState({
      version: 1,
      step: 1,
      started: true,
      messages: [],
      pending: [{ correlationId: "ag/step1/call1", capability: "docs", operation: "search" }],
    } as never);
    assert.deepEqual(read, { status: "unsupported", version: 1 }, "an old shape is reported, never coerced");
    assert.deepEqual(readAgentControlState({} as never), { status: "absent" }, "and empty progress is simply absent");
  });
});
