/**
 * Effective operation authority: who owns it, and what asking for something does not do.
 *
 * The whole slice rests on one ownership rule. Application/deployment policy supplies a grant when
 * the Execution is created; the runtime computes and stores the ceiling; exposure reads it and can
 * only narrow. A definition cannot grant itself anything, an exposure request is a request, and an
 * identifier is an address rather than a bearer token.
 *
 * ```text
 * authority {A}  +  spec asks for {A, B}   ->  exposed {A}
 * authority {}   +  spec asks for {A}      ->  exposed {}
 * ```
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ExecutionId } from "@arrokothi/core/execution";
import { authorizesOperation } from "@arrokothi/core/execution";
import {
  createActiveOperationViewResolver,
  createRuntimeOperationAuthoritySource,
} from "@arrokothi/core/reference";
import { createAgentTestHarness } from "@arrokothi/core/testing";
import { DOCS_SEARCH, MAIL_SEND, testAgent, testCatalog } from "./fixtures.ts";

/** Creates one Agent Execution with a ceiling, and returns its resolved exposure. */
async function exposureFor(input: {
  readonly authority?: readonly { readonly capability: string; readonly operation: string }[];
  readonly requested: { readonly refs?: readonly { readonly capability: string; readonly operation: string }[]; readonly groups?: readonly string[] };
}) {
  const catalog = testCatalog();
  const bundle = createAgentTestHarness({ catalog });
  const ref = await bundle.definitions.save(testAgent({ id: "exposure", operations: input.requested }));
  const agent = await bundle.createAgent({
    definition: ref,
    ...(input.authority !== undefined ? { authority: input.authority } : {}),
  });

  // The same read-only path the controller's resolver uses, over the same store the Harness wrote
  // the ceiling into. Nothing here can write one.
  const resolver = createActiveOperationViewResolver({
    authority: createRuntimeOperationAuthoritySource(bundle.store),
    catalog,
  });
  const view = await resolver.resolve({ executionId: agent.executionId, exposure: input.requested });
  return { bundle, agent, view };
}

describe("effective operation authority is Harness-owned and only narrows", () => {
  test("a root Agent with authority {A} cannot expose {B}, even when its spec asks for B", async () => {
    const { view } = await exposureFor({
      authority: [DOCS_SEARCH],
      requested: { refs: [DOCS_SEARCH, MAIL_SEND] },
    });

    assert.deepEqual(
      view.entries.map((entry) => `${entry.capability}:${entry.operation}`),
      ["docs:search"],
      "the exposure request was intersected with the ceiling, not trusted as one",
    );
    assert.deepEqual(
      view.omitted.filter((omission) => omission.reason === "not_authorized").map((omission) => omission.capability),
      ["mail"],
      "and the operation outside the ceiling is reported as omitted rather than silently missing",
    );
  });

  test("an exposure request never grants authority", async () => {
    const { bundle, agent } = await exposureFor({ authority: [DOCS_SEARCH], requested: { refs: [MAIL_SEND] } });
    const authority = await bundle.harness.effectiveOperationAuthorityOf(agent.executionId);

    assert.ok(authority, "the runtime wrote the ceiling");
    assert.deepEqual(authority!.operations, [DOCS_SEARCH], "asking for mail.send did not add it");
    assert.equal(authorizesOperation(authority!, MAIL_SEND), false);
    assert.equal(authority!.source, "root_grant", "authority comes from the application grant, not the definition");
  });

  test("unknown refs and unknown groups narrow to nothing rather than granting", async () => {
    const { view } = await exposureFor({
      authority: [DOCS_SEARCH],
      requested: { refs: [{ capability: "nonexistent", operation: "op" }], groups: ["no-such-group"] },
    });

    assert.deepEqual(view.entries, [], "an identity nobody declared exposes nothing");
    assert.deepEqual(
      view.omitted.map((omission) => omission.reason),
      ["not_authorized"],
      "and it is reported as outside the ceiling, which is what it is",
    );
  });

  test("empty and unconfigured authority both fail closed", async () => {
    const unconfigured = await exposureFor({ requested: { refs: [DOCS_SEARCH] } });
    assert.deepEqual(unconfigured.view.entries, []);
    assert.equal(unconfigured.view.authorityId, null);
    assert.deepEqual(unconfigured.view.omitted.map((omission) => omission.reason), ["no_authority"]);
    assert.equal(
      await unconfigured.bundle.harness.effectiveOperationAuthorityOf(unconfigured.agent.executionId),
      undefined,
      "no grant means no record, not an empty permissive one",
    );

    const empty = await exposureFor({ authority: [], requested: { refs: [DOCS_SEARCH] } });
    assert.deepEqual(empty.view.entries, []);
    assert.deepEqual(empty.view.omitted.map((omission) => omission.reason), ["not_authorized"]);
  });

  test("operation refs, authority ids, and Execution ids are not bearer credentials", async () => {
    const catalog = testCatalog();
    const bundle = createAgentTestHarness({ catalog });
    const ref = await bundle.definitions.save(testAgent({ id: "identities", operations: { refs: [DOCS_SEARCH] } }));

    const granted = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    const ungranted = await bundle.createAgent({ definition: ref });

    const authority = await bundle.harness.effectiveOperationAuthorityOf(granted.executionId);
    assert.ok(authority);

    const resolver = createActiveOperationViewResolver({
      authority: createRuntimeOperationAuthoritySource(bundle.store),
      catalog,
    });

    // Knowing the granted Execution's id, its authority id, and the exact operation ref buys the
    // ungranted Execution nothing: resolution is per-Execution and reads runtime-owned state.
    const borrowed = await resolver.resolve({
      executionId: ungranted.executionId,
      exposure: { refs: [DOCS_SEARCH] },
    });
    assert.deepEqual(borrowed.entries, [], "an id names a record; it does not stand in for one");
    assert.equal(borrowed.authorityId, null);

    // And an authority id that belongs to nobody resolves to nothing at all.
    const stranger = await resolver.resolve({
      executionId: authority!.authorityId as unknown as ExecutionId,
      exposure: { refs: [DOCS_SEARCH] },
    });
    assert.deepEqual(stranger.entries, []);
  });

  test("a malformed grant refuses creation instead of producing an unaccountable Execution", async () => {
    const bundle = createAgentTestHarness({ catalog: testCatalog() });
    const ref = await bundle.definitions.save(testAgent({ id: "malformed" }));

    await assert.rejects(
      () =>
        bundle.harness.createExecution({
          definition: ref,
          operationAuthority: { operations: [{ capability: "", operation: "search" }] } as never,
        }),
      /invalid operation authority grant/,
    );
    assert.deepEqual(await bundle.store.listExecutions(), [], "nothing was created");
  });

  test("the stored ceiling is plain data with no handle in it", async () => {
    const bundle = createAgentTestHarness({ catalog: testCatalog() });
    const ref = await bundle.definitions.save(testAgent({ id: "plain" }));
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH, MAIL_SEND] });
    const authority = await bundle.harness.effectiveOperationAuthorityOf(agent.executionId);

    assert.deepEqual(JSON.parse(JSON.stringify(authority)), authority, "it survives a JSON round trip unchanged");
    assert.deepEqual(
      authority!.operations,
      [DOCS_SEARCH, MAIL_SEND].sort((a, b) => (a.capability < b.capability ? -1 : 1)),
      "and is stored in a stable order, so two equal grants produce equal records",
    );

    const context = await bundle.harness.inspect(agent.executionId);
    assert.deepEqual(context?.slots.authority, { authorityId: authority!.authorityId }, "the Execution holds a reference");
  });
});
