/**
 * Interleaving and peer/cancellation cost discipline (Slice E.1, `docs/development/014`).
 *
 * `014` §9: a slice that adds a new semantic guarantee must state what physical work the simple
 * path that uses none of it now pays for. E.1's guarantees are controlled interleaving,
 * stale-continuation safety, peer messaging, and a cancellation hook. This test:
 *
 *   1. proves an ordinary no-message / no-interleave / no-cancellation Activation touches none of
 *      the peer-request-link, cancellation-request, wait-graph, or resumption-invalidation
 *      machinery, and gains no invisible replacement model call;
 *   2. records - as observations for `014`, never as a kernel budget - the invalidated-resumption
 *      count, the fresh local-invocation count, and the Events-processed count for the accumulation
 *      fixture.
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
  createNoInlineWaitBudget,
  createScriptedCapabilityExecutor,
  FifoScheduler,
  InMemoryDefinitionStore,
  InMemoryRuntimeStore,
} from "@agent-sdk/core/reference";
import { createScriptedAgentController, scriptedAgentDefinition } from "@agent-sdk/core/testing";

/** Counts calls per RuntimeTransaction facet method and selected read-surface methods. */
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
  readPeerRequestLink: RuntimeStore["readPeerRequestLink"] = (id) => {
    this.bump("readPeerRequestLink");
    return this.inner.readPeerRequestLink(id);
  };
  listPeerRequestLinksByRequester: RuntimeStore["listPeerRequestLinksByRequester"] = (id) => {
    this.bump("listPeerRequestLinksByRequester");
    return this.inner.listPeerRequestLinksByRequester(id);
  };
  listPeerRequestLinksByResponder: RuntimeStore["listPeerRequestLinksByResponder"] = (id) => {
    this.bump("listPeerRequestLinksByResponder");
    return this.inner.listPeerRequestLinksByResponder(id);
  };
  readCancellationRequest: RuntimeStore["readCancellationRequest"] = (id) => this.inner.readCancellationRequest(id);
  readUserInputRequest: RuntimeStore["readUserInputRequest"] = (id) => this.inner.readUserInputRequest(id);
  listUserInputRequests: RuntimeStore["listUserInputRequests"] = (id) => this.inner.listUserInputRequests(id);
  listOpenUserInputRequests: RuntimeStore["listOpenUserInputRequests"] = () => this.inner.listOpenUserInputRequests();

  private wrap(tx: RuntimeTransaction): RuntimeTransaction {
    return {
      ...tx,
      peerRequestLinks: {
        insert: (l) => (this.bump("peerRequestLinks.insert"), tx.peerRequestLinks.insert(l)),
        get: (id) => (this.bump("peerRequestLinks.get"), tx.peerRequestLinks.get(id)),
        update: (l) => (this.bump("peerRequestLinks.update"), tx.peerRequestLinks.update(l)),
        listByRequester: (id) => (this.bump("peerRequestLinks.listByRequester"), tx.peerRequestLinks.listByRequester(id)),
        listByResponder: (id) => (this.bump("peerRequestLinks.listByResponder"), tx.peerRequestLinks.listByResponder(id)),
      },
      cancellationRequests: {
        insert: (r) => (this.bump("cancellationRequests.insert"), tx.cancellationRequests.insert(r)),
        get: (id) => (this.bump("cancellationRequests.get"), tx.cancellationRequests.get(id)),
        update: (r) => (this.bump("cancellationRequests.update"), tx.cancellationRequests.update(r)),
      },
      controllerResumptions: {
        ...tx.controllerResumptions,
        update: (r) => (this.bump(`controllerResumptions.update:${r.state}`), tx.controllerResumptions.update(r)),
      },
    };
  }
}

describe("interleaving cost discipline", () => {
  test("an ordinary Agent step touches no peer, wait-graph, invalidation, or cancellation machinery", async () => {
    const definitions = new InMemoryDefinitionStore();
    const store = new CountingRuntimeStore();
    const harness = new Harness({
      definitions,
      store,
      scheduler: new FifoScheduler(),
      controllers: new ControllerRegistry([createScriptedAgentController()]),
      clock: createFixedClock(),
      ids: createDeterministicIds(),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "mail.send", operations: ["send"] }] }),
      capabilities: createScriptedCapabilityExecutor({
        handlers: { "mail.send:send": () => ({ status: "success", observation: { id: 1 } }) },
      }),
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "ordinary",
        program: [
          { do: "emit", text: "hi" },
          { do: "use_capability", capability: "mail.send", operation: "send", input: {}, requestKey: "s" },
          { do: "await", eventKinds: ["external.input"], correlationId: "x" },
        ],
      }),
    );
    const handle = await harness.createExecution({
      definition: ref,
      operationAuthority: { operations: [{ capability: "mail.send", operation: "send" }] },
    });
    for (const key of Object.keys(store.counts)) delete store.counts[key];

    const records = await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING");

    for (const facet of [
      "peerRequestLinks.insert",
      "peerRequestLinks.get",
      "peerRequestLinks.update",
      "peerRequestLinks.listByRequester",
      "peerRequestLinks.listByResponder",
      "readPeerRequestLink",
      "listPeerRequestLinksByRequester",
      "listPeerRequestLinksByResponder",
      "cancellationRequests.insert",
      "cancellationRequests.update",
      "controllerResumptions.update:invalidated",
    ]) {
      assert.equal(store.counts[facet] ?? 0, 0, `no-message/no-interleave path must not touch ${facet}`);
    }
    // Cancellation is checked by key on claim/outcome and inside each Effect's requested and
    // dispatch-intent transactions. This is O(Activations + Effects), never a scan; the second
    // per-Effect check is what closes cancellation racing with irreversible dispatch.
    const effectCount = records.reduce((count, record) => count + record.effects.length, 0);
    assert.ok(
      (store.counts["cancellationRequests.get"] ?? 0) <= 2 * records.length + 2 * effectCount + 2,
      "cancellation checks are a small constant per Activation/Effect, not a scan",
    );
  });

  test("accumulation fixture: R1 pending, E1 invalidates, E2/E3 before replacement work", async () => {
    const definitions = new InMemoryDefinitionStore();
    const store = new CountingRuntimeStore();
    const gates = new Map<string, Array<() => void>>();
    const opened = new Set<string>();
    const harness = new Harness({
      definitions,
      store,
      scheduler: new FifoScheduler(),
      controllers: new ControllerRegistry([
        createScriptedAgentController({
          gate: (key) => {
            if (opened.has(key)) return;
            return new Promise<void>((resolve) => {
              const list = gates.get(key) ?? [];
              list.push(resolve);
              gates.set(key, list);
            });
          },
        }),
      ]),
      clock: createFixedClock(),
      ids: createDeterministicIds(),
      inlineWait: createNoInlineWaitBudget(),
    });
    const open = (key: string): void => {
      opened.add(key);
      for (const r of gates.get(key) ?? []) r();
      gates.delete(key);
    };

    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "accumulate",
        program: [
          { do: "local_work", key: "R", produces: "r1", interleave: { eventKinds: ["external.input"] } },
          { do: "observe" },
          { do: "local_work", key: "R2", produces: "r2" }, // the one deliberate replacement
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle(); // R1 pending

    const before = { ...store.counts };

    // E1 interleaves; E2/E3 arrive before the next Activation.
    await harness.deliverExternalInput({ destination: handle.executionId, label: "e1" });
    await harness.deliverExternalInput({ destination: handle.executionId, label: "e2" });
    await harness.deliverExternalInput({ destination: handle.executionId, label: "e3" });

    const invalidationsFromDelivery =
      (store.counts["controllerResumptions.update:invalidated"] ?? 0) -
      (before["controllerResumptions.update:invalidated"] ?? 0);
    assert.equal(invalidationsFromDelivery, 1, "exactly one old-resumption invalidation, from E1 only");

    // No provider/model (here: local-work resumption) work was started merely by Event delivery.
    const freshFromDelivery =
      (store.counts["controllerResumptions.update:pending"] ?? 0) - (before["controllerResumptions.update:pending"] ?? 0);
    assert.equal(freshFromDelivery, 0, "no fresh local invocation was caused by Event delivery");

    // One Activation consumes the whole burst, then the controller decides.
    const record = await harness.runOnce();
    assert.equal(record?.deliveredEventIds.length, 3, "the Activation processed all three accumulated Events");

    const resumptions = await harness.controllerResumptionsOf(handle.executionId);
    const invalidated = resumptions.filter((r) => r.state === "invalidated").length;
    const fresh = resumptions.filter((r) => r.state === "pending").length;

    // --- 014 observations (NOT a kernel budget) ---
    assert.equal(invalidated, 1, "invalidated controller resumptions: 1");
    assert.equal(fresh, 1, "fresh controller-local invocations after interleaving: 1 (the deliberate R2)");
    assert.equal(record?.deliveredEventIds.length, 3, "Events processed by the relevant Activation: 3");

    open("R");
    open("R2");
    for (let i = 0; i < 6 && (await harness.inspect(handle.executionId))?.lifecycle !== "COMPLETED"; i += 1) {
      await harness.drainResumptions();
      await harness.runUntilIdle();
    }
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });
});
