/**
 * The projection snapshot: what one model call was shown, and what its answer therefore means.
 *
 * ```text
 * invocation N sees      docs_search_v2 -> docs.search / v2
 * the view later changes docs_search_v2 -> docs / search.v2
 * the answer to N says   docs_search_v2
 * it MUST resolve to     docs.search / v2
 * ```
 *
 * That is the whole invariant, and it is why resolution is a lookup in an immutable object rather
 * than a search of the current world. These cases also check the two ways a projection can be
 * wrong - an ambiguous name, and a name nobody exposed - and that neither is repaired by guessing.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ActiveOperationEntry, ActiveOperationView, ObjectSchema } from "@agent-sdk/core/execution";
import {
  createModelOperationProjection,
  modelCapabilitySpecs,
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

function view(entries: readonly ActiveOperationEntry[], viewId = "aov_test"): ActiveOperationView {
  return { viewId, authorityId: "oau_1", authorityVersion: 1, entries, omitted: [] };
}

describe("a model invocation projection is an immutable binding snapshot", () => {
  test("it is plain JSON, deterministically identified, and derives the provider-facing specs", () => {
    const built = createModelOperationProjection({
      projectionId: "ag/step1/projection",
      view: view([entry("docs", "search"), entry("mail", "send", "Send mail.")]),
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const projection = built.projection;

    assert.deepEqual(JSON.parse(JSON.stringify(projection)), projection, "the whole snapshot survives a JSON round trip");
    assert.equal(projection.projectionId, "ag/step1/projection", "derived from Agent coordinates, never minted");
    assert.equal(projection.viewId, "aov_test");
    assert.deepEqual(
      projection.bindings.map((binding) => binding.bindingId),
      ["ag/step1/projection/b1", "ag/step1/projection/b2"],
      "binding identity is deterministic and positional",
    );

    // The provider sees model vocabulary only. The mapping back to an operation identity never
    // leaves the kernel, which is why a provider echoing a name cannot address anything by it.
    const specs = modelCapabilitySpecs(projection);
    assert.deepEqual(specs.map((spec) => Object.keys(spec).sort()), [
      ["description", "input", "name"],
      ["description", "input", "name"],
    ]);
    assert.deepEqual(specs.map((spec) => spec.name), ["docs_search", "mail_send"]);
    assert.equal(JSON.stringify(specs).includes("capability"), false, "no operation identity is handed to the provider");
  });

  test("a duplicate model-facing name is refused at construction, never resolved by guessing", () => {
    // Two genuinely different identities that flatten to the same provider-safe name.
    assert.equal(modelOperationAlias({ capability: "docs.search", operation: "v2" }), "docs_search_v2");
    assert.equal(modelOperationAlias({ capability: "docs", operation: "search.v2" }), "docs_search_v2");

    const built = createModelOperationProjection({
      projectionId: "ag/step1/projection",
      view: view([entry("docs.search", "v2"), entry("docs", "search.v2")]),
    });
    assert.equal(built.ok, false);
    assert.ok(
      !built.ok && built.issues.some((issue) => /would mean both/.test(issue.message)),
      "an ambiguous projection cannot resolve a response, so it never comes into existence",
    );
  });

  test("an unknown returned name resolves to nothing, deterministically", () => {
    const built = createModelOperationProjection({
      projectionId: "ag/step1/projection",
      view: view([entry("docs", "search")]),
    });
    assert.ok(built.ok);
    if (!built.ok) return;

    assert.deepEqual(resolveProjectedAlias(built.projection, "docs_search"), {
      resolved: true,
      binding: built.projection.bindings[0],
    });
    for (const name of ["mail_send", "docs_search ", "DOCS_SEARCH", "docs.search", ""]) {
      assert.deepEqual(
        resolveProjectedAlias(built.projection, name),
        { resolved: false, alias: name },
        `"${name}" is not in this snapshot, and nothing looks for a nearest match`,
      );
    }
  });

  test("a response from an old projection resolves against that projection, not the current one", () => {
    const first = createModelOperationProjection({
      projectionId: "ag/step1/projection",
      view: view([entry("docs.search", "v2")], "aov_first"),
    });
    const second = createModelOperationProjection({
      projectionId: "ag/step2/projection",
      view: view([entry("docs", "search.v2")], "aov_second"),
    });
    assert.ok(first.ok && second.ok);
    if (!first.ok || !second.ok) return;

    // The same string means two different operations in the two snapshots.
    assert.equal(first.projection.bindings[0]!.alias, "docs_search_v2");
    assert.equal(second.projection.bindings[0]!.alias, "docs_search_v2");

    const answer = "docs_search_v2";
    const fromFirst = resolveProjectedAlias(first.projection, answer);
    assert.ok(fromFirst.resolved);
    assert.deepEqual(
      fromFirst.binding.target,
      { kind: "capability_operation", capability: "docs.search", operation: "v2" },
      "an answer to invocation 1 keeps meaning what invocation 1 was shown",
    );

    const fromSecond = resolveProjectedAlias(second.projection, answer);
    assert.ok(fromSecond.resolved);
    assert.deepEqual(
      fromSecond.binding.target,
      { kind: "capability_operation", capability: "docs", operation: "search.v2" },
      "and the later snapshot means what it means, without rewriting the earlier one",
    );

    // The snapshots are separate objects, so nothing about the second reaches into the first.
    assert.notEqual(first.projection.projectionId, second.projection.projectionId);
    assert.notEqual(first.projection.viewId, second.projection.viewId);
  });

  test("projection, binding, and view identities carry no authority", () => {
    const built = createModelOperationProjection({
      projectionId: "ag/step1/projection",
      view: view([entry("docs", "search")]),
    });
    assert.ok(built.ok);
    if (!built.ok) return;
    const projection = built.projection;

    // There is nothing on a snapshot that acts. It has no executor, no grant, no deadline, no
    // resource binding, and no settlement path - it is a description of what a model was shown.
    const serialized = JSON.stringify(projection);
    for (const forbidden of ["grant", "authorize", "execute", "settle", "credential", "token", "executor"]) {
      assert.equal(serialized.includes(forbidden), false, `a projection must not carry "${forbidden}"`);
    }
    assert.deepEqual(
      Object.keys(projection).sort(),
      ["bindings", "projectionId", "viewId", "viewRevision"],
      "and it has no field beyond the binding snapshot and its source view",
    );
    assert.deepEqual(
      Object.keys(projection.bindings[0]!).sort(),
      ["alias", "bindingId", "description", "input", "target"],
      "a binding maps a name to a typed target, and carries nothing that could perform it",
    );
    assert.deepEqual(
      projection.bindings[0]!.target,
      { kind: "capability_operation", capability: "docs", operation: "search" },
      "v0.4 mints exactly one target kind, and it is discriminated rather than implied",
    );
  });

  test("a per-invocation narrowing may shrink the view, and cannot reach past it", () => {
    const source = view([entry("docs", "search"), entry("mail", "send", "Send mail.")]);
    const built = createModelOperationProjection({
      projectionId: "ag/step1/projection",
      view: source,
      operations: [{ capability: "docs", operation: "search" }],
    });
    assert.ok(built.ok);
    if (!built.ok) return;
    assert.deepEqual(built.projection.bindings.map((binding) => binding.alias), ["docs_search"]);
    assert.deepEqual(
      resolveProjectedAlias(built.projection, "mail_send"),
      { resolved: false, alias: "mail_send" },
      "an operation the Active View contained but this call was not shown resolves to nothing",
    );

    // The projection still truthfully names the view it was cut from, and every surviving binding
    // is one of that view's entries.
    assert.equal(built.projection.viewId, source.viewId);
    for (const binding of built.projection.bindings) {
      assert.ok(
        source.entries.some(
          (e) => e.capability === binding.target.capability && e.operation === binding.target.operation,
        ),
      );
    }
  });

  test("a narrowing ref outside the Active View is rejected, not projected from caller data", () => {
    const source = view([entry("docs", "search")]);
    const built = createModelOperationProjection({
      projectionId: "ag/step1/projection",
      view: source,
      operations: [
        { capability: "docs", operation: "search" },
        { capability: "mail", operation: "send" },
      ],
    });
    assert.equal(built.ok, false);
    assert.ok(
      !built.ok && built.issues.some((issue) => /not exposed by Active View/.test(issue.message)),
      "asking for an operation the view never exposed cannot conjure a binding",
    );
  });

  test("a narrowing ref cannot substitute its own description or schema for the Active View entry", () => {
    // The Active View is the only source of binding metadata. `operations` carries an identity and
    // nothing else, so even the type has no room for a forged description or input schema — and the
    // projected binding is byte-for-byte the view's entry.
    const canonical = entry("docs", "search", "The canonical Active View description.");
    const source = view([canonical]);
    const built = createModelOperationProjection({
      projectionId: "ag/step1/projection",
      view: source,
      operations: [{ capability: "docs", operation: "search" }],
    });
    assert.ok(built.ok);
    if (!built.ok) return;
    assert.equal(built.projection.bindings[0]!.description, "The canonical Active View description.");
    assert.deepEqual(built.projection.bindings[0]!.input, canonical.input);
    assert.deepEqual(modelCapabilitySpecs(built.projection), [
      { name: "docs_search", description: "The canonical Active View description.", input: canonical.input },
    ]);
  });

  test("a genuine subset still projects, and an alias collision is still refused under narrowing", () => {
    const source = view([entry("docs", "search"), entry("mail", "send", "Send mail.")]);
    const subset = createModelOperationProjection({
      projectionId: "ag/step1/projection",
      view: source,
      operations: [{ capability: "mail", operation: "send" }, { capability: "docs", operation: "search" }],
    });
    assert.ok(subset.ok);
    if (!subset.ok) return;
    assert.deepEqual(subset.projection.bindings.map((b) => b.alias).sort(), ["docs_search", "mail_send"]);

    // Two genuinely different identities that both live in the view and flatten to one alias remain
    // an ambiguity, whether or not a narrowing selected them.
    const colliding = view([entry("docs.search", "v2"), entry("docs", "search.v2")]);
    const built = createModelOperationProjection({
      projectionId: "ag/step2/projection",
      view: colliding,
      operations: [
        { capability: "docs.search", operation: "v2" },
        { capability: "docs", operation: "search.v2" },
      ],
    });
    assert.equal(built.ok, false);
    assert.ok(!built.ok && built.issues.some((issue) => /would mean both/.test(issue.message)));
  });
});
