/**
 * What must commit together.
 *
 * The Effect gateway writes across several facets, and the combinations that must never be
 * observable are exactly the ones that span them:
 *
 *   a dispatch journaled with no pending operation to settle
 *   a pending operation marked settled with no result Event in the mailbox
 *   a result Event delivered while the operation still reads as unresolved
 *   an Execution woken by an observation that rolled back
 *
 * These are proved by breaking the store at each boundary and checking that what remains is a
 * consistent runtime state rather than a partial one - including the state nobody likes but
 * everybody needs: dispatched, no outcome, not retried.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { ExecutionId } from "@agent-sdk/core/execution";
import { ControllerRegistry, Harness } from "@agent-sdk/core/execution";
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
import { createScriptedAgentController, scriptedAgentDefinition } from "@agent-sdk/core/testing";

/** A store that lets a test break exactly one write and leave every other guarantee intact. */
class BreakableStore implements RuntimeStore {
  readonly inner = new InMemoryRuntimeStore();
  /** Return a message to make the named write throw; return null to let it through. */
  break: (facet: string, detail: string) => string | null = () => null;

  async transact<T>(scope: ExecutionId, work: (tx: RuntimeTransaction) => Promise<T>): Promise<T> {
    return this.inner.transact(scope, async (tx) => work(this.wrap(tx)));
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

  private wrap(tx: RuntimeTransaction): RuntimeTransaction {
    const guard = (facet: string, detail: string): void => {
      const message = this.break(facet, detail);
      if (message !== null) throw new Error(message);
    };
    return {
      ...tx,
      mailboxes: {
        ...tx.mailboxes,
        append: async (mailboxId, event, deliveredAt) => {
          guard("mailbox.append", event.kind);
          return tx.mailboxes.append(mailboxId, event, deliveredAt);
        },
      },
      pendingOperations: {
        ...tx.pendingOperations,
        insert: async (operation) => {
          guard("pending.insert", operation.effectKind);
          return tx.pendingOperations.insert(operation);
        },
        update: async (operation) => {
          guard("pending.update", operation.status);
          return tx.pendingOperations.update(operation);
        },
      },
      effectJournal: {
        ...tx.effectJournal,
        append: async (entry) => {
          guard("journal.append", entry.phase);
          return tx.effectJournal.append(entry);
        },
      },
    };
  }
}

interface Rig {
  readonly harness: Harness;
  readonly store: BreakableStore;
  readonly executor: ReturnType<typeof createScriptedCapabilityExecutor>;
  readonly definitions: InMemoryDefinitionStore;
}

function rig(): Rig {
  const definitions = new InMemoryDefinitionStore();
  const store = new BreakableStore();
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
  return { harness, store, executor, definitions };
}

const sender = () =>
  scriptedAgentDefinition({
    id: "sender",
    program: [
      { do: "use_capability", capability: "mail.send", operation: "send", input: { to: "team@example.com" }, requestKey: "send-1" },
      { do: "complete" },
    ],
  });

describe("Effect gateway transaction atomicity", () => {
  test("a failure while recording the dispatch leaves no pending operation and no dispatch", async () => {
    const { harness, store, executor, definitions } = rig();
    store.break = (facet, detail) => (facet === "journal.append" && detail === "dispatch_started" ? "store unavailable" : null);

    const ref = await definitions.save(sender());
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 0, "the intent to act could not be recorded, so nothing was attempted");
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), [], "no half-created operation");

    const journal = await harness.effectJournalOf(handle.executionId);
    assert.deepEqual(
      journal.map((entry) => entry.phase),
      ["requested"],
      "the authorization rolled back with the dispatch record it was committed alongside",
    );

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED", "the Activation failed rather than reporting progress the runtime cannot back up");
    assert.equal(context?.failure?.code, "effect_processing_failed");
  });

  test("a failure while inserting the pending operation rolls back its journal entries too", async () => {
    const { harness, store, executor, definitions } = rig();
    store.break = (facet) => (facet === "pending.insert" ? "store unavailable" : null);

    const ref = await definitions.save(sender());
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 0);
    assert.deepEqual(
      (await harness.effectJournalOf(handle.executionId)).map((entry) => entry.phase),
      ["requested"],
      "an authorization with nothing to settle is not a state the store can be left in",
    );
  });

  test("a failure while delivering the result leaves the operation unresolved, not falsely settled", async () => {
    const { harness, store, executor, definitions } = rig();
    store.break = (facet, detail) => (facet === "mailbox.append" && detail === "capability.completed" ? "mailbox unavailable" : null);

    const ref = await definitions.save(sender());
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 1, "the operation really did run");

    const [operation] = await harness.pendingOperationsOf(handle.executionId);
    assert.ok(operation);
    assert.equal(operation.status, "pending", "settlement rolled back with the observation it belonged to");
    assert.equal(operation.outcome, null, "so nothing claims to know the result the Execution never received");
    assert.equal(operation.dispatch, "dispatched", "while still recording that something may have happened");
    assert.equal(operation.resultEventId, null);

    const journal = await harness.effectJournalOf(handle.executionId);
    assert.deepEqual(
      journal.map((entry) => entry.phase),
      ["requested", "authorized", "dispatch_started"],
      "no terminal phase was fabricated for a result nobody could deliver",
    );
  });

  test("nothing automatically redispatches an operation left dispatched with no outcome", async () => {
    const { harness, store, executor, definitions } = rig();
    store.break = (facet, detail) => (facet === "mailbox.append" && detail === "capability.completed" ? "mailbox unavailable" : null);

    const ref = await definitions.save(sender());
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    assert.equal(executor.callCount, 1);

    // The store recovers, and the Execution is asked to try the same consequential thing again.
    store.break = () => null;
    const retryRef = await definitions.save(
      scriptedAgentDefinition({
        id: "sender",
        version: 2,
        program: [
          {
            do: "use_capability",
            capability: "mail.send",
            operation: "send",
            input: { to: "team@example.com" },
            requestKey: "send-2",
            idempotency: "per_input",
          },
          { do: "complete" },
        ],
      }),
    );
    const retry = await harness.createExecution({ definition: retryRef });
    await harness.runUntilIdle();

    // A different Execution, so a different duplicate-suppression scope: this one is allowed to run.
    assert.equal(executor.callCount, 2, "the guard is per Execution, not a global freeze");

    // But the original Execution's own unresolved dispatch was never retried on its behalf.
    const [stranded] = await harness.pendingOperationsOf(handle.executionId);
    assert.equal(stranded?.status, "pending");
    assert.equal(stranded?.dispatch, "dispatched");
    assert.equal((await harness.inspect(retry.executionId))?.lifecycle, "COMPLETED");
  });
});
