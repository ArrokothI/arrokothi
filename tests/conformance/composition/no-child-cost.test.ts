/**
 * A no-feature Activation performs no feature-specific RuntimeStore work (014 simple-path cost check).
 *
 * `docs/development/014-v1-efficiency-and-developer-ergonomics-validation.md` §9's review discipline
 * for a slice that adds a new semantic guarantee: state what physical work the simple path that does
 * not use the new guarantee now pays for, and prove it stays zero. Child composition's guarantee is
 * recursive delegation under a bounded lineage budget; E.2 adds user-input requests and exact-payload
 * confirmations. The facets that exist purely to implement any of these must not be touched by an
 * ordinary Activation whose whole program is a capability call and which uses none of them. This is a
 * narrow instrumented regression, not a benchmark: it counts RuntimeStore facet calls, not wall time.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ControllerRegistry, Harness } from "@agent-sdk/core/execution";
import type { ExecutionId } from "@agent-sdk/core/execution";
import type { RuntimeStore, RuntimeTransaction } from "@agent-sdk/core/ports";
import {
  createAllowListAuthorizer,
  createDeterministicIds,
  createFixedClock,
  createScriptedCapabilityExecutor,
  FifoScheduler,
  InMemoryDefinitionStore,
  InMemoryRuntimeStore,
} from "@agent-sdk/core/reference";
import { createScriptedAgentController } from "@agent-sdk/core/testing";
import { agent } from "./fixtures.ts";

/** Counts calls per RuntimeTransaction facet method, without changing any behaviour. */
class CountingRuntimeStore implements RuntimeStore {
  private readonly inner = new InMemoryRuntimeStore();
  readonly counts: Record<string, number> = {};

  private bump(key: string): void {
    this.counts[key] = (this.counts[key] ?? 0) + 1;
  }

  transact<T>(scope: ExecutionId, work: (tx: RuntimeTransaction) => Promise<T>): Promise<T> {
    return this.inner.transact(scope, (tx) => work(this.wrap(tx)));
  }

  readExecution: RuntimeStore["readExecution"] = (id) => this.inner.readExecution(id);
  listExecutions: RuntimeStore["listExecutions"] = () => this.inner.listExecutions();
  listEmissions: RuntimeStore["listEmissions"] = (id) => this.inner.listEmissions(id);
  listTransitions: RuntimeStore["listTransitions"] = (id) => this.inner.listTransitions(id);
  listPendingOperations: RuntimeStore["listPendingOperations"] = (id) => this.inner.listPendingOperations(id);
  readPendingOperation: RuntimeStore["readPendingOperation"] = (id) => this.inner.readPendingOperation(id);
  listEffectJournal: RuntimeStore["listEffectJournal"] = (id) => this.inner.listEffectJournal(id);
  listControllerResumptions: RuntimeStore["listControllerResumptions"] = (id) => this.inner.listControllerResumptions(id);
  readControllerResumption: RuntimeStore["readControllerResumption"] = (id) => this.inner.readControllerResumption(id);
  findControllerResumptionByKey: RuntimeStore["findControllerResumptionByKey"] = (id, key) =>
    this.inner.findControllerResumptionByKey(id, key);
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

  private wrap(tx: RuntimeTransaction): RuntimeTransaction {
    return {
      ...tx,
      lineageSpawnBudgets: {
        insert: (budget) => {
          this.bump("lineageSpawnBudgets.insert");
          return tx.lineageSpawnBudgets.insert(budget);
        },
        get: (id) => {
          this.bump("lineageSpawnBudgets.get");
          return tx.lineageSpawnBudgets.get(id);
        },
        update: (budget, expectedRevision) => {
          this.bump("lineageSpawnBudgets.update");
          return tx.lineageSpawnBudgets.update(budget, expectedRevision);
        },
      },
      childExecutionLinks: {
        insert: (link) => {
          this.bump("childExecutionLinks.insert");
          return tx.childExecutionLinks.insert(link);
        },
        get: (id) => {
          this.bump("childExecutionLinks.get");
          return tx.childExecutionLinks.get(id);
        },
        update: (link) => {
          this.bump("childExecutionLinks.update");
          return tx.childExecutionLinks.update(link);
        },
        listByParent: (id) => {
          this.bump("childExecutionLinks.listByParent");
          return tx.childExecutionLinks.listByParent(id);
        },
      },
      operationAuthorities: {
        ...tx.operationAuthorities,
        insert: (authority) => {
          this.bump("operationAuthorities.insert");
          return tx.operationAuthorities.insert(authority);
        },
      },
      pendingOperations: {
        ...tx.pendingOperations,
        insert: (operation) => {
          this.bump("pendingOperations.insert");
          return tx.pendingOperations.insert(operation);
        },
      },
      userInputRequests: {
        insert: (request) => {
          this.bump("userInputRequests.insert");
          return tx.userInputRequests.insert(request);
        },
        get: (id) => {
          this.bump("userInputRequests.get");
          return tx.userInputRequests.get(id);
        },
        update: (request) => {
          this.bump("userInputRequests.update");
          return tx.userInputRequests.update(request);
        },
        listByExecution: (id) => {
          this.bump("userInputRequests.listByExecution");
          return tx.userInputRequests.listByExecution(id);
        },
      },
      confirmationRequests: {
        insert: (request) => {
          this.bump("confirmationRequests.insert");
          return tx.confirmationRequests.insert(request);
        },
        get: (id) => {
          this.bump("confirmationRequests.get");
          return tx.confirmationRequests.get(id);
        },
        update: (request) => {
          this.bump("confirmationRequests.update");
          return tx.confirmationRequests.update(request);
        },
        listByExecution: (id) => {
          this.bump("confirmationRequests.listByExecution");
          return tx.confirmationRequests.listByExecution(id);
        },
      },
    };
  }
}

describe("no-feature Activation performs no feature-specific store work", () => {
  test("a root with a spawn budget and authority that never spawns touches no child / user-input / confirmation facet during its Activation", async () => {
    const definitions = new InMemoryDefinitionStore();
    const store = new CountingRuntimeStore();
    const executor = createScriptedCapabilityExecutor({
      handlers: { "mail.send:send": () => ({ status: "success", observation: { messageId: "msg-1" } }) },
    });
    const harness = new Harness({
      definitions,
      store,
      scheduler: new FifoScheduler(),
      controllers: new ControllerRegistry([createScriptedAgentController()]),
      clock: createFixedClock(),
      ids: createDeterministicIds(),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "mail.send", operations: ["send"] }] }),
      capabilities: executor,
    });

    const ref = await definitions.save(
      agent("ordinary", [
        { do: "use_capability", capability: "mail.send", operation: "send", input: {}, requestKey: "s" },
        { do: "complete" },
      ]),
    );

    // A root that *could* spawn - it has both a budget and a granted authority - but whose whole
    // program is an ordinary capability call. Creation itself legitimately touches
    // `lineageSpawnBudgets.insert` and `operationAuthorities.insert` exactly once each; what must
    // stay zero is everything the Activation that follows does.
    await harness.createExecution({
      definition: ref,
      structuralSpawnBudget: 5,
      operationAuthority: { operations: [{ capability: "mail.send", operation: "send" }] },
    });
    assert.equal(store.counts["lineageSpawnBudgets.insert"], 1, "creation grants the lineage budget exactly once");
    assert.equal(store.counts["operationAuthorities.insert"], 1, "creation grants the root's own authority exactly once");
    assert.equal(store.counts["lineageSpawnBudgets.get"] ?? 0, 0, "creation does not read the budget back");

    for (const key of Object.keys(store.counts)) delete store.counts[key]; // isolate what the Activation itself does

    await harness.runUntilIdle();

    assert.equal((await store.listExecutions()).length, 1, "no child was created");
    assert.equal(store.counts["pendingOperations.insert"], 1, "exactly the one ordinary capability pending operation");

    for (const facet of ["lineageSpawnBudgets.get", "lineageSpawnBudgets.update", "lineageSpawnBudgets.insert"]) {
      assert.equal(store.counts[facet] ?? 0, 0, `no-child Activation must not touch ${facet}`);
    }
    for (const facet of [
      "childExecutionLinks.get",
      "childExecutionLinks.insert",
      "childExecutionLinks.update",
      "childExecutionLinks.listByParent",
    ]) {
      assert.equal(store.counts[facet] ?? 0, 0, `no-child Activation must not touch ${facet}`);
    }
    for (const facet of [
      "userInputRequests.insert",
      "userInputRequests.get",
      "userInputRequests.update",
      "userInputRequests.listByExecution",
      "confirmationRequests.insert",
      "confirmationRequests.get",
      "confirmationRequests.update",
      "confirmationRequests.listByExecution",
    ]) {
      assert.equal(store.counts[facet] ?? 0, 0, `an Activation that uses no E.2 feature must not touch ${facet}`);
    }
    assert.equal(store.counts["operationAuthorities.insert"] ?? 0, 0, "no child authority was created for a no-child Activation");
  });
});
