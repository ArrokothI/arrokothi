/**
 * Structural-budget contention under genuine concurrency (E.0.1 correction).
 *
 * The reference `InMemoryRuntimeStore` fully serializes `transact` calls, so a spawn's own
 * read-then-CAS-write inside one transaction can never race against itself through the ordinary
 * path - `structural-budget.test.ts`'s "two descendant paths" case only proves *sequential*
 * shared-budget behaviour, driven end to end by `runUntilIdle`. This file proves the behaviour a
 * real concurrent writer (a distributed/durable store) would force: a spawn transaction loses a
 * compare-and-set race on the lineage budget mid-flight.
 *
 * Two things are exercised together, deliberately:
 *
 *   genuine concurrency   two Executions' Activations run overlapped via two workers claiming
 *                         concurrently (`Promise.all`, not a sequential `runUntilIdle`)
 *   a real conflict       a thin store wrapper forces the *first* `lineageSpawnBudgets.update` call
 *                         to lose its compare-and-set by handing the real store a stale expected
 *                         revision - the same `SpawnBudgetConcurrencyError` class and the same
 *                         throw site a genuine competing writer would produce, not a stand-in error
 *
 * What must never happen, per `docs/execution-runtime.md` §14 and the E.0.1 review:
 *
 *   CAS conflict -> parent Execution FAILED
 *   CAS conflict -> budget overspent
 *   CAS conflict -> partial child/authority/link/pending record
 *   CAS conflict -> automatic duplicate child
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ControllerRegistry, Harness } from "@arrokothi/core/execution";
import type { ExecutionId } from "@arrokothi/core/execution";
import type { RuntimeStore, RuntimeTransaction } from "@arrokothi/core/ports";
import {
  createAllowListAuthorizer,
  createDeterministicIds,
  createFixedClock,
  FifoScheduler,
  InMemoryDefinitionStore,
  InMemoryRuntimeStore,
} from "@arrokothi/core/reference";
import { createScriptedAgentController } from "@arrokothi/core/testing";
import { agent, executionCount } from "./fixtures.ts";

/**
 * Forces exactly the first `lineageSpawnBudgets.update` call to lose its compare-and-set, by
 * handing the real store an off-by-one expected revision. From the caller's side this is
 * indistinguishable from another writer having genuinely committed first, and it is the real
 * store's own CAS logic - not a mocked error - that throws `SpawnBudgetConcurrencyError`. Every
 * later call passes through unmodified.
 */
class SingleConflictStore implements RuntimeStore {
  private readonly inner = new InMemoryRuntimeStore();
  private updateCalls = 0;
  /** How many update calls were actually forced to fail. */
  brokenCount = 0;

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
  readStructuredMemoryView: RuntimeStore["readStructuredMemoryView"] = (id) =>
    this.inner.readStructuredMemoryView(id);

  private wrap(tx: RuntimeTransaction): RuntimeTransaction {
    return {
      ...tx,
      lineageSpawnBudgets: {
        ...tx.lineageSpawnBudgets,
        update: (budget, expectedRevision) => {
          this.updateCalls += 1;
          if (this.updateCalls === 1) {
            this.brokenCount += 1;
            return tx.lineageSpawnBudgets.update(budget, expectedRevision - 1);
          }
          return tx.lineageSpawnBudgets.update(budget, expectedRevision);
        },
      },
    };
  }
}

interface Rig {
  readonly harness: Harness;
  readonly store: SingleConflictStore;
  readonly definitions: InMemoryDefinitionStore;
}

function rig(): Rig {
  const definitions = new InMemoryDefinitionStore();
  const store = new SingleConflictStore();
  const harness = new Harness({
    definitions,
    store,
    scheduler: new FifoScheduler(),
    controllers: new ControllerRegistry([createScriptedAgentController()]),
    clock: createFixedClock(),
    ids: createDeterministicIds(),
    authorizer: createAllowListAuthorizer({ grants: [], spawn: true }),
  });
  return { harness, store, definitions };
}

/** Claims and runs exactly one ready Execution's Activation to completion. */
async function runOne(harness: Harness, workerId: string) {
  const record = await harness.runOnce(workerId);
  assert.ok(record, `worker ${workerId} had a ready Execution to claim`);
  return record;
}

describe("structural spawn budget under genuine concurrency", () => {
  test("a conflict on the losing transaction resolves via the ordinary exhaustion refusal, not Activation failure", async () => {
    const { harness, store, definitions } = rig();
    await definitions.save(agent("leaf", [{ do: "complete" }]));
    const spawnerRef = await definitions.save(
      agent("spawner", [{ do: "spawn", definitionId: "leaf", definitionVersion: 1, requestKey: "s" }, { do: "complete" }]),
    );
    const rootRef = await definitions.save(agent("root", [{ do: "complete" }]));

    // Only one credit for the whole lineage: P1 and P2 genuinely contend for the last one.
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    const p1 = await harness.createExecution({ definition: spawnerRef, ownerExecutionId: root.executionId });
    const p2 = await harness.createExecution({ definition: spawnerRef, ownerExecutionId: root.executionId });

    // Two workers claim the two ready Executions and run their first Activations concurrently -
    // real Promise-level overlap, not a sequential `runUntilIdle` walk. That first Activation is
    // where the spawn is proposed and the CAS race actually happens. Whichever settles inline still
    // needs a follow-up Activation to consume the delivered Event and reach `complete`; draining
    // that afterwards touches neither budget nor link facet again, so it does not undermine the
    // concurrency this proves.
    await Promise.all([runOne(harness, "worker-1"), runOne(harness, "worker-2")]);
    await harness.runUntilIdle();

    assert.equal(store.brokenCount, 1, "the fault actually fired: a real SpawnBudgetConcurrencyError was thrown");

    const budget = await harness.lineageSpawnBudgetOf(root.executionId);
    assert.equal(budget?.capacity, 1);
    assert.equal(budget?.consumed, 1, "consumed never exceeds capacity");

    const p1Context = await harness.inspect(p1.executionId);
    const p2Context = await harness.inspect(p2.executionId);
    assert.notEqual(p1Context?.lifecycle, "FAILED", "losing the budget race does not fail the parent Execution");
    assert.notEqual(p2Context?.lifecycle, "FAILED", "losing the budget race does not fail the parent Execution");
    assert.equal(p1Context?.lifecycle, "COMPLETED");
    assert.equal(p2Context?.lifecycle, "COMPLETED");

    const p1Links = await harness.childExecutionLinksOf(p1.executionId);
    const p2Links = await harness.childExecutionLinksOf(p2.executionId);
    assert.equal(p1Links.length + p2Links.length, 1, "at most one corresponding child was created");

    // root + P1 + P2 + exactly one leaf: no partial child, no duplicate.
    assert.equal(await executionCount(store), 4, "no partial or duplicate child exists anywhere in the store");

    const journals = [...(await harness.effectJournalOf(p1.executionId)), ...(await harness.effectJournalOf(p2.executionId))];
    const exhausted = journals.filter((entry) => entry.phase === "rejected" && entry.detail["code"] === "structural_spawn_budget_exhausted");
    assert.equal(exhausted.length, 1, "the loser's retry observed real exhaustion through the ordinary spawn-refusal path");
    const contention = journals.filter((entry) => entry.phase === "rejected" && entry.detail["code"] === "spawn_budget_contention");
    assert.equal(contention.length, 0, "one bounded retry was enough; contention was resolved, not just given up on");
  });

  test("a conflict on a transaction that still has capacity retries into an ordinary created child", async () => {
    const { harness, store, definitions } = rig();
    await definitions.save(agent("leaf", [{ do: "complete" }]));
    const spawnerRef = await definitions.save(
      agent("spawner", [{ do: "spawn", definitionId: "leaf", definitionVersion: 1, requestKey: "s" }, { do: "complete" }]),
    );
    const rootRef = await definitions.save(agent("root", [{ do: "complete" }]));

    // Two credits for two contenders: whichever transaction loses the forced conflict still finds
    // capacity remaining once it re-reads fresh state, so contention resolves into two children,
    // not a refusal.
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 2 });
    await harness.runUntilIdle();

    const p1 = await harness.createExecution({ definition: spawnerRef, ownerExecutionId: root.executionId });
    const p2 = await harness.createExecution({ definition: spawnerRef, ownerExecutionId: root.executionId });

    await Promise.all([runOne(harness, "worker-1"), runOne(harness, "worker-2")]);
    await harness.runUntilIdle();

    assert.equal(store.brokenCount, 1, "the fault actually fired");

    const budget = await harness.lineageSpawnBudgetOf(root.executionId);
    assert.equal(budget?.capacity, 2);
    assert.equal(budget?.consumed, 2, "both credits were legitimately spent - never more than capacity");

    const p1Context = await harness.inspect(p1.executionId);
    const p2Context = await harness.inspect(p2.executionId);
    assert.equal(p1Context?.lifecycle, "COMPLETED", "losing the race does not fail the parent");
    assert.equal(p2Context?.lifecycle, "COMPLETED", "losing the race does not fail the parent");

    const p1Links = await harness.childExecutionLinksOf(p1.executionId);
    const p2Links = await harness.childExecutionLinksOf(p2.executionId);
    assert.equal(p1Links.length, 1, "P1 got exactly one child - never a duplicate from the retry");
    assert.equal(p2Links.length, 1, "P2 got exactly one child");

    // root + P1 + P2 + exactly two leaves.
    assert.equal(await executionCount(store), 5);

    const journals = [...(await harness.effectJournalOf(p1.executionId)), ...(await harness.effectJournalOf(p2.executionId))];
    const rejections = journals.filter((entry) => entry.phase === "rejected");
    assert.equal(rejections.length, 0, "the retry found capacity remaining, so it created a child rather than refusing");
  });
});
