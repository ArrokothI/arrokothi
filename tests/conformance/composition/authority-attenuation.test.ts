/**
 * Child authority attenuation (Slice E.0).
 *
 * ```text
 * child effective operation authority
 *   = requested child operations
 *     ∩ the spawning Execution's CURRENT effective operation authority
 * ```
 *
 * Never wider than the parent. Never derived from the child's Definition. Never "inherit everything"
 * from an absent request. And read against the parent's *current* ceiling, so a stale request cannot
 * mint authority the parent no longer holds.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { authorizesOperation } from "@arrokothi/core/execution";
import type { RuntimeStore, RuntimeTransaction } from "@arrokothi/core/ports";
import {
  createActiveOperationViewResolver,
  createCapabilityCatalog,
  createRuntimeOperationAuthoritySource,
  InMemoryRuntimeStore,
} from "@arrokothi/core/reference";
import { createTestHarness } from "@arrokothi/core/testing";
import { agent, permissive, rig } from "./fixtures.ts";

const A = { capability: "knowledge.query", operation: "search" };
const B = { capability: "mail.send", operation: "send" };

describe("child authority attenuation", () => {
  test("a requested subset of the parent's authority reaches the child; the rest does not", async () => {
    const { harness, definitions } = rig();
    await definitions.save(agent("child", [{ do: "complete" }]));
    const rootRef = await definitions.save(
      agent("parent", [
        {
          do: "spawn",
          definitionId: "child",
          definitionVersion: 1,
          // Requests both A and B, plus one the parent never had.
          requestedOperations: [A, B, { capability: "secrets.read", operation: "get" }],
          await: false,
        },
        { do: "complete" },
      ]),
    );

    // Parent holds A only.
    const root = await harness.createExecution({
      definition: rootRef,
      structuralSpawnBudget: 1,
      operationAuthority: { operations: [A] },
    });
    await harness.runUntilIdle();

    const [link] = await harness.childExecutionLinksOf(root.executionId);
    const childAuthority = await harness.effectiveOperationAuthorityOf(link!.childExecutionId);
    assert.equal(childAuthority?.source, "delegated", "the child's ceiling is a delegation, not a root grant");
    assert.deepEqual(childAuthority?.operations, [A], "only the requested ∩ parent-effective operation reached the child");
    assert.equal(authorizesOperation(childAuthority ?? null, A), true);
    assert.equal(authorizesOperation(childAuthority ?? null, B), false, "B was requested but the parent did not hold it");
    assert.equal(
      authorizesOperation(childAuthority ?? null, { capability: "secrets.read", operation: "get" }),
      false,
      "a request outside the parent's authority cannot mint it",
    );
    assert.equal(childAuthority?.version, 1, "a fresh ceiling for a new Execution, not a narrowing of the parent's");
    assert.equal(childAuthority?.delegatedFrom?.executionId, root.executionId, "provenance points at the delegator");
  });

  test("an absent authority request means the child receives no operation authority", async () => {
    const { harness, definitions } = rig();
    await definitions.save(agent("child", [{ do: "complete" }]));
    const rootRef = await definitions.save(
      agent("parent", [{ do: "spawn", definitionId: "child", definitionVersion: 1, await: false }, { do: "complete" }]),
    );
    const root = await harness.createExecution({
      definition: rootRef,
      structuralSpawnBudget: 1,
      operationAuthority: { operations: [A, B] },
    });
    await harness.runUntilIdle();

    const [link] = await harness.childExecutionLinksOf(root.executionId);
    const childAuthority = await harness.effectiveOperationAuthorityOf(link!.childExecutionId);
    assert.deepEqual(childAuthority?.operations, [], "absent request is not 'inherit everything'");
  });

  test("a child Definition that declares operations cannot grant itself authority", async () => {
    const { harness, definitions } = rig();
    // The child Definition's own exposure request names A - a requirement, not a grant.
    const child = agent("child", [{ do: "complete" }]);
    (child.spec as { operations?: unknown }).operations = { refs: [A] };
    await definitions.save(child);
    const rootRef = await definitions.save(
      // The spawn requests nothing, and the parent holds A.
      agent("parent", [{ do: "spawn", definitionId: "child", definitionVersion: 1, await: false }, { do: "complete" }]),
    );
    const root = await harness.createExecution({
      definition: rootRef,
      structuralSpawnBudget: 1,
      operationAuthority: { operations: [A] },
    });
    await harness.runUntilIdle();

    const [link] = await harness.childExecutionLinksOf(root.executionId);
    const childAuthority = await harness.effectiveOperationAuthorityOf(link!.childExecutionId);
    assert.deepEqual(childAuthority?.operations, [], "the Definition asked for A; the spawn request did not; the child gets nothing");
  });

  test("a stale request cannot bypass the parent's current authority", async () => {
    /**
     * The parent prepares its spawn request while it still holds A and B, then its ceiling is
     * narrowed to A only *before* the spawn Effect is dispatched. v0.4 has no production API that
     * narrows a stored ceiling - delegation is exactly this slice - so the narrowing is modelled at
     * the store facet the gateway reads, which is where a real narrowing would land. The spawn still
     * carries the stale `[A, B]` request; the child receives only A.
     */
    class NarrowingStore implements RuntimeStore {
      readonly inner = new InMemoryRuntimeStore();
      narrowed = false;
      parentId = "";

      private wrap(tx: RuntimeTransaction): RuntimeTransaction {
        const narrowed = () => this.narrowed;
        const parentId = () => this.parentId;
        return {
          ...tx,
          operationAuthorities: {
            ...tx.operationAuthorities,
            get: async (executionId) => {
              const stored = await tx.operationAuthorities.get(executionId);
              if (!stored || !narrowed() || executionId !== parentId()) return stored;
              return { ...stored, version: stored.version + 1, operations: stored.operations.filter((op) => op.capability === A.capability) };
            },
          },
        };
      }

      transact: RuntimeStore["transact"] = (scope, work) => this.inner.transact(scope, (tx) => work(this.wrap(tx)));
      readExecution: RuntimeStore["readExecution"] = (id) => this.inner.readExecution(id);
      listExecutions: RuntimeStore["listExecutions"] = () => this.inner.listExecutions();
      listEmissions: RuntimeStore["listEmissions"] = (id) => this.inner.listEmissions(id);
      listTransitions: RuntimeStore["listTransitions"] = (id) => this.inner.listTransitions(id);
      listPendingOperations: RuntimeStore["listPendingOperations"] = (id) => this.inner.listPendingOperations(id);
      readPendingOperation: RuntimeStore["readPendingOperation"] = (id) => this.inner.readPendingOperation(id);
      listEffectJournal: RuntimeStore["listEffectJournal"] = (id) => this.inner.listEffectJournal(id);
      listControllerResumptions: RuntimeStore["listControllerResumptions"] = (id) => this.inner.listControllerResumptions(id);
      readControllerResumption: RuntimeStore["readControllerResumption"] = (id) => this.inner.readControllerResumption(id);
      findControllerResumptionByKey: RuntimeStore["findControllerResumptionByKey"] = (id, key) => this.inner.findControllerResumptionByKey(id, key);
      readOperationAuthority: RuntimeStore["readOperationAuthority"] = (id) => this.inner.readOperationAuthority(id);
      readLineageSpawnBudget: RuntimeStore["readLineageSpawnBudget"] = (id) => this.inner.readLineageSpawnBudget(id);
      readChildExecutionLink: RuntimeStore["readChildExecutionLink"] = (id) => this.inner.readChildExecutionLink(id);
      listChildExecutionLinks: RuntimeStore["listChildExecutionLinks"] = (id) => this.inner.listChildExecutionLinks(id);
      readPeerRequestLink: RuntimeStore["readPeerRequestLink"] = (id) => this.inner.readPeerRequestLink(id);
      listPeerRequestLinksByRequester: RuntimeStore["listPeerRequestLinksByRequester"] = (id) =>
        this.inner.listPeerRequestLinksByRequester(id);
      listPeerRequestLinksByResponder: RuntimeStore["listPeerRequestLinksByResponder"] = (id) =>
        this.inner.listPeerRequestLinksByResponder(id);
      readCancellationRequest: RuntimeStore["readCancellationRequest"] = (id) => this.inner.readCancellationRequest(id);
      readUserInputRequest: RuntimeStore["readUserInputRequest"] = (id) => this.inner.readUserInputRequest(id);
      listUserInputRequests: RuntimeStore["listUserInputRequests"] = (id) => this.inner.listUserInputRequests(id);
      listOpenUserInputRequests: RuntimeStore["listOpenUserInputRequests"] = () => this.inner.listOpenUserInputRequests();
      readConfirmationRequest: RuntimeStore["readConfirmationRequest"] = (id) => this.inner.readConfirmationRequest(id);
      listConfirmationRequests: RuntimeStore["listConfirmationRequests"] = (id) => this.inner.listConfirmationRequests(id);
      listPendingConfirmations: RuntimeStore["listPendingConfirmations"] = () => this.inner.listPendingConfirmations();
      readStructuredMemoryView: RuntimeStore["readStructuredMemoryView"] = (id) =>
        this.inner.readStructuredMemoryView(id);
    }

    const store = new NarrowingStore();
    const { harness, definitions } = createTestHarness({ store: store as unknown as InMemoryRuntimeStore, authorizer: permissive() });
    await definitions.save(agent("child", [{ do: "complete" }]));
    const rootRef = await definitions.save(
      agent("parent", [
        { do: "remember", key: "prepared", value: "request [A, B] is ready" },
        { do: "await", eventKinds: ["external.input"], correlationId: "go" },
        { do: "spawn", definitionId: "child", definitionVersion: 1, requestedOperations: [A, B], await: false },
        { do: "complete" },
      ]),
    );
    const root = await harness.createExecution({
      definition: rootRef,
      structuralSpawnBudget: 1,
      operationAuthority: { operations: [A, B] },
    });
    store.parentId = root.executionId;
    await harness.runUntilIdle();

    store.narrowed = true; // the parent's ceiling is now A only
    await harness.deliverExternalInput({ destination: root.executionId, label: "go", correlationId: "go" });
    await harness.runUntilIdle();

    const [link] = await harness.childExecutionLinksOf(root.executionId);
    const childAuthority = await harness.effectiveOperationAuthorityOf(link!.childExecutionId);
    assert.deepEqual(childAuthority?.operations, [A], "the stale request named B; the parent no longer held it, so the child never got it");
  });

  test("a spawn request naming an operation the parent never held yields only the intersection", async () => {
    const { harness, definitions } = rig();
    await definitions.save(agent("child", [{ do: "complete" }]));
    const rootRef = await definitions.save(
      agent("parent", [
        { do: "spawn", definitionId: "child", definitionVersion: 1, requestedOperations: [A, B], await: false },
        { do: "complete" },
      ]),
    );
    // Parent's CURRENT authority is A only.
    const root = await harness.createExecution({
      definition: rootRef,
      structuralSpawnBudget: 1,
      operationAuthority: { operations: [A] },
    });
    await harness.runUntilIdle();

    const [link] = await harness.childExecutionLinksOf(root.executionId);
    const childAuthority = await harness.effectiveOperationAuthorityOf(link!.childExecutionId);
    assert.deepEqual(childAuthority?.operations, [A], "the request named B; the parent's current ceiling did not include it");
  });

  test("the child's Active View derives from the child's own effective authority, not the parent's", async () => {
    const { harness, definitions, store } = rig(permissive());
    await definitions.save(agent("child", [{ do: "complete" }]));
    const rootRef = await definitions.save(
      agent("parent", [
        { do: "spawn", definitionId: "child", definitionVersion: 1, requestedOperations: [A], await: false },
        { do: "complete" },
      ]),
    );
    const root = await harness.createExecution({
      definition: rootRef,
      structuralSpawnBudget: 1,
      operationAuthority: { operations: [A, B] },
    });
    await harness.runUntilIdle();

    const [link] = await harness.childExecutionLinksOf(root.executionId);
    const catalog = createCapabilityCatalog([
      { capability: A.capability, operation: A.operation, consequential: false, description: "search", input: { kind: "object", fields: {} } },
      { capability: B.capability, operation: B.operation, consequential: true, description: "send", input: { kind: "object", fields: {} } },
    ]);
    const resolver = createActiveOperationViewResolver({
      authority: createRuntimeOperationAuthoritySource(store),
      catalog,
    });

    const parentView = await resolver.resolve({ executionId: root.executionId, exposure: { refs: [A, B] } });
    const childView = await resolver.resolve({ executionId: link!.childExecutionId, exposure: { refs: [A, B] } });

    assert.deepEqual(parentView.entries.map((e) => `${e.capability}/${e.operation}`).sort(), [
      "knowledge.query/search",
      "mail.send/send",
    ]);
    assert.deepEqual(
      childView.entries.map((e) => `${e.capability}/${e.operation}`),
      ["knowledge.query/search"],
      "the child projects only its own delegated authority; B is omitted as not-authorized",
    );
    const omittedB = childView.omitted.find((o) => o.capability === "mail.send");
    assert.ok(omittedB, "B appears in the child's omitted list");
    assert.ok(
      omittedB!.reason === "no_authority" || omittedB!.reason === "not_authorized",
      `B's omission is attributed to the child's ceiling (got ${omittedB!.reason})`,
    );
  });
});
