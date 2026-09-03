/**
 * The Active Operation View: deterministic narrowing, and nothing that can widen.
 *
 * A projection snapshot is only meaningful if the view it was cut from would be produced again
 * from the same inputs, so determinism here is a correctness requirement rather than a nicety.
 * These cases check that identical inputs produce structurally identical output, that every input
 * is subtractive, and that a resolver has no route to dispatch, authorize, or mutate anything.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createActiveOperationViewResolver,
  createCapabilityCatalog,
  createStaticOperationAuthoritySource,
} from "@arrokothi/core/reference";
import { DOCS_SEARCH, LEDGER_POST, MAIL_SEND, SEARCH_INPUT, testCatalog } from "./fixtures.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CORE_SRC = resolve(REPO_ROOT, "packages/core/src");
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g;

const EXECUTION = "exe_view";

/** A ceiling written the way the runtime writes one, so the resolver reads exactly what it would. */
function ceiling(operations: readonly { readonly capability: string; readonly operation: string }[]) {
  return createStaticOperationAuthoritySource({
    [EXECUTION]: {
      authorityId: "oau_1",
      executionId: EXECUTION,
      version: 1,
      operations: [...operations],
      source: "root_grant" as const,
      grantedAt: "2026-01-01T00:00:00.000Z",
    },
  });
}

function resolverOver(
  operations: readonly { readonly capability: string; readonly operation: string }[],
  catalog = testCatalog(),
) {
  return createActiveOperationViewResolver({ authority: ceiling(operations), catalog });
}

describe("the Active Operation View narrows deterministically", () => {
  test("identical inputs produce structurally identical, ordered output", async () => {
    const first = await resolverOver([MAIL_SEND, DOCS_SEARCH]).resolve({
      executionId: EXECUTION,
      exposure: { refs: [MAIL_SEND, DOCS_SEARCH] },
    });
    // Same request, opposite declaration order, a separately constructed resolver.
    const second = await resolverOver([DOCS_SEARCH, MAIL_SEND]).resolve({
      executionId: EXECUTION,
      exposure: { refs: [DOCS_SEARCH, MAIL_SEND] },
    });

    assert.deepEqual(first, second, "two resolutions over the same inputs are the same view");
    assert.equal(first.viewId, second.viewId, "including its content-derived identity");
    assert.deepEqual(
      first.entries.map((entry) => `${entry.capability}:${entry.operation}`),
      ["docs:search", "mail:send"],
      "ordered by identity, so ordering never depends on how the author listed them",
    );
    assert.deepEqual(JSON.parse(JSON.stringify(first)), first, "and the whole view is plain JSON");
  });

  test("the view is the intersection of request, authority, and catalog", async () => {
    const view = await resolverOver([DOCS_SEARCH, LEDGER_POST]).resolve({
      executionId: EXECUTION,
      // docs.search: authorized and describable. mail.send: requested but outside the ceiling.
      // ledger.post: authorized but the catalog cannot describe it to a model.
      // ghost.op: requested, and nothing anywhere declares it.
      exposure: { refs: [DOCS_SEARCH, MAIL_SEND, LEDGER_POST, { capability: "ghost", operation: "op" }] },
    });

    assert.deepEqual(view.entries.map((entry) => entry.capability), ["docs"]);
    assert.deepEqual(
      view.omitted.map((omission) => `${omission.capability}:${omission.reason}`).sort(),
      ["ghost:not_authorized", "ledger:not_projectable", "mail:not_authorized"],
      "every narrowing says why, and none of them is an error",
    );
  });

  test("groups, explicit refs, and the authored bound all behave deterministically", async () => {
    const resolver = resolverOver([DOCS_SEARCH, MAIL_SEND, LEDGER_POST]);

    const byGroup = await resolver.resolve({ executionId: EXECUTION, exposure: { groups: ["research"] } });
    assert.deepEqual(byGroup.entries.map((entry) => entry.capability), ["docs"]);

    const union = await resolver.resolve({
      executionId: EXECUTION,
      exposure: { refs: [MAIL_SEND], groups: ["research"] },
    });
    assert.deepEqual(union.entries.map((entry) => entry.capability), ["docs", "mail"], "refs and groups union, then narrow");

    const bounded = await resolver.resolve({
      executionId: EXECUTION,
      exposure: { refs: [MAIL_SEND], groups: ["research"], maxOperations: 1 },
    });
    assert.deepEqual(bounded.entries.map((entry) => entry.capability), ["docs"], "the bound applies after ordering");
    assert.deepEqual(
      bounded.omitted.map((omission) => `${omission.capability}:${omission.reason}`),
      ["mail:beyond_bound"],
    );

    const scoped = await resolver.resolve({
      executionId: EXECUTION,
      exposure: { refs: [DOCS_SEARCH, MAIL_SEND] },
      taskScope: ["outreach"],
    });
    assert.deepEqual(scoped.entries.map((entry) => entry.capability), ["mail"], "a task scope is one more intersection");
  });

  test("an absent exposure request exposes nothing", async () => {
    const view = await resolverOver([DOCS_SEARCH, MAIL_SEND]).resolve({ executionId: EXECUTION, exposure: {} });
    assert.deepEqual(view.entries, [], "authority is a ceiling, never an implicit exposure list");
    assert.deepEqual(view.omitted, []);
  });

  test("the view identity tracks what is exposed, not what happens to be authorized", async () => {
    const request = { executionId: EXECUTION, exposure: { refs: [DOCS_SEARCH] } };
    const base = await resolverOver([DOCS_SEARCH]).resolve(request);

    // A wider ceiling that changes nothing about the exposed subset is the same view. That is the
    // honest answer: a projection is cut from the exposure, so the identity has to describe the
    // exposure rather than the permission behind it.
    const widerCeiling = await resolverOver([DOCS_SEARCH, MAIL_SEND]).resolve(request);
    assert.equal(widerCeiling.viewId, base.viewId);

    // Changed membership is a different view.
    const wider = await resolverOver([DOCS_SEARCH, MAIL_SEND]).resolve({
      executionId: EXECUTION,
      exposure: { refs: [DOCS_SEARCH, MAIL_SEND] },
    });
    assert.notEqual(wider.viewId, base.viewId);

    // So is unchanged membership whose exposed metadata changed - the model would be shown
    // something different, which is exactly what a projection identity has to notice.
    const editedCatalog = createCapabilityCatalog([
      {
        capability: "docs",
        operation: "search",
        consequential: false,
        title: "Search documents",
        description: "A different description entirely.",
        input: SEARCH_INPUT,
        groups: ["research"],
      },
    ]);
    const edited = await resolverOver([DOCS_SEARCH], editedCatalog).resolve(request);
    assert.notEqual(edited.viewId, base.viewId);
    assert.equal(edited.entries.length, base.entries.length, "even though membership is the same");
  });

  test("a resolver has no dispatch, authorization, or mutation path", async () => {
    // Asserted on the import graph rather than on one object's shape, because the claim is about
    // what a resolver *could* be built from, not about what today's reference one happens to hold.
    const files = new Set<string>();
    const queue = ["reference/active-operation-view-resolver.ts", "ports/active-operation-view.ts"];
    while (queue.length > 0) {
      const relativePath = queue.pop()!;
      if (files.has(relativePath)) continue;
      files.add(relativePath);
      const absolute = resolve(CORE_SRC, relativePath);
      const source = await readFile(absolute, "utf8");
      for (const match of source.matchAll(IMPORT_SPECIFIER)) {
        const specifier = match[1]!;
        if (!specifier.startsWith(".")) continue;
        queue.push(relative(CORE_SRC, resolve(dirname(absolute), specifier)));
      }
    }

    const forbidden = [
      "ports/capability-executor.ts",
      "ports/effect-authorizer.ts",
      "ports/runtime-store.ts",
      "ports/scheduler.ts",
      "runtime/harness.ts",
      "runtime/effect-processor.ts",
      "effects/types.ts",
      "effects/journal.ts",
      "effects/pending.ts",
      "effects/authorization.ts",
      "effects/capability.ts",
    ];
    assert.deepEqual(
      [...files].filter((path) => forbidden.includes(path)),
      [],
      "exposure derivation reads a ceiling and a catalog; it cannot act on either",
    );

    // No selector model call. Deterministic exposure is the requirement; putting an inference in
    // front of every Agent turn to choose operations would be a different, expensive design.
    assert.deepEqual(
      [...files].filter((path) => path === "ports/model-provider.ts" || path === "ports/model-resolver.ts"),
      [],
      "constructing a view consults no model",
    );

    // And the port itself declares nothing that could widen a ceiling.
    const port = await readFile(resolve(CORE_SRC, "ports/active-operation-view.ts"), "utf8");
    for (const forbiddenName of ["grant", "authorize", "dispatch", "execute", "settle"]) {
      assert.equal(
        new RegExp(`\\b${forbiddenName}\\s*[(<]`).test(port),
        false,
        `an ActiveOperationViewResolver must declare no "${forbiddenName}"`,
      );
    }
  });
});
