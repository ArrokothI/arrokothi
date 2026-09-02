/** The immutable heterogeneous action projection shown to one model invocation. */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ActiveOperationEntry, ObjectSchema } from "@agent-sdk/core/execution";
import {
  createActiveModelActionView,
  createActiveStructuredMemoryWriteView,
  createModelActionProjection,
  modelActionSpecs,
  modelOperationAlias,
  resolveProjectedAlias,
} from "@agent-sdk/core/execution";

const INPUT: ObjectSchema = { kind: "object", fields: { query: { required: true, schema: { kind: "string" } } } };

function entry(capability: string, operation: string, description = "Search."): ActiveOperationEntry {
  return {
    capability,
    operation,
    title: `${capability}.${operation}`,
    description,
    input: INPUT,
    consequential: false,
    groups: [],
  };
}

function view(
  operations: readonly ActiveOperationEntry[],
  writes: readonly { readonly key: string; readonly description: string }[] = [],
  operationViewId = "aov_test",
) {
  return createActiveModelActionView({
    operations: {
      viewId: operationViewId,
      authorityId: "oau_1",
      authorityVersion: 1,
      entries: operations,
      omitted: [],
    },
    structuredMemoryWrites: createActiveStructuredMemoryWriteView(
      writes.map((write) => ({
        kind: "structured_memory_write" as const,
        key: write.key,
        description: write.description,
        valueSchema: { kind: "string" as const },
      })),
    ),
  });
}

describe("a model invocation projection is an immutable heterogeneous binding snapshot", () => {
  test("it is plain JSON, deterministically identified, and derives provider-facing specs", () => {
    const source = view([entry("docs", "search"), entry("mail", "send", "Send mail.")], [
      { key: "profile", description: "Replace the profile." },
    ]);
    const built = createModelActionProjection({ projectionId: "ag/step1/projection", view: source });
    assert.ok(built.ok);
    if (!built.ok) return;

    const projection = built.projection;
    assert.deepEqual(JSON.parse(JSON.stringify(projection)), projection);
    assert.equal(projection.projectionId, "ag/step1/projection");
    assert.equal(projection.viewId, source.viewId);
    assert.deepEqual(
      projection.bindings.map((binding) => binding.bindingId),
      ["ag/step1/projection/b1", "ag/step1/projection/b2", "ag/step1/projection/b3"],
    );
    assert.deepEqual(modelActionSpecs(projection).map((spec) => spec.name), [
      "docs_search",
      "mail_send",
      "memory_write_profile",
    ]);
    assert.deepEqual(modelActionSpecs(projection)[2]!.input, {
      kind: "object",
      fields: { value: { required: true, schema: { kind: "string" } } },
      additionalProperties: false,
    });
  });

  test("collisions are refused within and across action families", () => {
    assert.equal(modelOperationAlias({ capability: "docs.search", operation: "v2" }), "docs_search_v2");
    assert.equal(modelOperationAlias({ capability: "docs", operation: "search.v2" }), "docs_search_v2");
    const within = createModelActionProjection({
      projectionId: "ag/step1/projection",
      view: view([entry("docs.search", "v2"), entry("docs", "search.v2")]),
    });
    assert.equal(within.ok, false);

    const cross = createModelActionProjection({
      projectionId: "ag/step1/projection",
      view: view([entry("memory", "write_profile")], [{ key: "profile", description: "Write profile." }]),
    });
    assert.equal(cross.ok, false);
    assert.ok(!cross.ok && cross.issues.some((issue) => /would mean both/.test(issue.message)));
  });

  test("an unknown returned name resolves to nothing", () => {
    const built = createModelActionProjection({
      projectionId: "ag/step1/projection",
      view: view([entry("docs", "search")]),
    });
    assert.ok(built.ok);
    if (!built.ok) return;
    assert.equal(resolveProjectedAlias(built.projection, "docs_search").resolved, true);
    for (const alias of ["mail_send", "docs_search ", "DOCS_SEARCH", "docs.search", ""]) {
      assert.deepEqual(resolveProjectedAlias(built.projection, alias), { resolved: false, alias });
    }
  });

  test("an old answer resolves through the exact projection snapshot it was shown", () => {
    const first = createModelActionProjection({
      projectionId: "ag/step1/projection",
      view: view([entry("docs.search", "v2")], [], "aov_first"),
    });
    const second = createModelActionProjection({
      projectionId: "ag/step2/projection",
      view: view([entry("docs", "search.v2")], [], "aov_second"),
    });
    assert.ok(first.ok && second.ok);
    if (!first.ok || !second.ok) return;
    assert.deepEqual((resolveProjectedAlias(first.projection, "docs_search_v2") as { binding: { target: unknown } }).binding.target, {
      kind: "capability_operation",
      capability: "docs.search",
      operation: "v2",
    });
    assert.deepEqual((resolveProjectedAlias(second.projection, "docs_search_v2") as { binding: { target: unknown } }).binding.target, {
      kind: "capability_operation",
      capability: "docs",
      operation: "search.v2",
    });
    assert.notEqual(first.projection.viewId, second.projection.viewId);
  });

  test("projection and binding identities carry no authority", () => {
    const built = createModelActionProjection({
      projectionId: "ag/step1/projection",
      view: view([entry("docs", "search")], [{ key: "profile", description: "Write profile." }]),
    });
    assert.ok(built.ok);
    if (!built.ok) return;
    const serialized = JSON.stringify(built.projection);
    for (const forbidden of ["grant", "authorize", "execute", "settle", "credential", "token", "executor"]) {
      assert.equal(serialized.includes(forbidden), false);
    }
    assert.deepEqual(Object.keys(built.projection).sort(), ["bindings", "projectionId", "viewId"]);
    assert.deepEqual(Object.keys(built.projection.bindings[0]!).sort(), ["alias", "bindingId", "description", "input", "target"]);
  });

  test("identity-only narrowing may shrink the view and cannot reach past it", () => {
    const source = view([entry("docs", "search"), entry("mail", "send")], [
      { key: "profile", description: "Write profile." },
    ]);
    const built = createModelActionProjection({
      projectionId: "ag/step1/projection",
      view: source,
      actions: [
        { kind: "capability_operation", capability: "docs", operation: "search" },
        { kind: "structured_memory_write", key: "profile" },
      ],
    });
    assert.ok(built.ok);
    if (!built.ok) return;
    assert.deepEqual(built.projection.bindings.map((binding) => binding.alias), ["docs_search", "memory_write_profile"]);

    const offView = createModelActionProjection({
      projectionId: "ag/offview/projection",
      view: source,
      actions: [{ kind: "structured_memory_write", key: "secret" }],
    });
    assert.equal(offView.ok, false);
    assert.ok(!offView.ok && offView.issues.some((issue) => /not exposed by Active Model Action View/.test(issue.message)));
  });

  test("narrowing always copies canonical metadata from the active action view", () => {
    const canonical = entry("docs", "search", "Canonical description.");
    const source = view([canonical]);
    const built = createModelActionProjection({
      projectionId: "ag/step1/projection",
      view: source,
      actions: [{ kind: "capability_operation", capability: "docs", operation: "search" }],
    });
    assert.ok(built.ok);
    if (!built.ok) return;
    assert.equal(built.projection.bindings[0]!.description, canonical.description);
    assert.deepEqual(built.projection.bindings[0]!.input, canonical.input);
  });
});
