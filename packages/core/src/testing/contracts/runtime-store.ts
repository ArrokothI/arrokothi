/**
 * RuntimeStore contract.
 *
 * The invariants a durable implementation must reproduce: compare-and-set on Execution revisions,
 * all-or-nothing transactions, duplicate-safe mailbox delivery, an honest consumption cursor,
 * pending operations and the Effect journal committing inside the same transaction as the mailbox
 * write they belong to, and audit records kept out of mailboxes entirely.
 *
 * The rollback case is the one that matters most for Slice B. A store that could commit "the Effect
 * was dispatched" without "there is a pending operation to settle", or "the result Event is in the
 * mailbox" without "the operation is no longer pending", would let an Execution be woken by an
 * observation the runtime does not believe in.
 *
 * Slice C.1 adds the controller-resumption facet on the same terms, with its own combination that
 * must never be observable: a resumption settled while the Execution it belongs to still reads as
 * WAITING on it. Lookup by the controller's stable key is contract rather than convenience - it is
 * what stops a resumed Activation dispatching a second provider call.
 *
 * Slice D adds effective operation authority, with the combination that must never be observable
 * being an Execution that exists without the ceiling its exposure will be derived from. The
 * fail-closed reading of a missing record is contract too: absent means nothing is authorized.
 */

import { createExecutionContext, transitionContext } from "../../execution/context.ts";
import type { ExecutionContext } from "../../execution/context.ts";
import type { ActivationId, ExecutionId } from "../../execution/ids.ts";
import type { EffectId, IdempotencyKey, PendingOperationId } from "../../effects/ids.ts";
import { createPendingOperation, markDispatched, markSettled } from "../../effects/pending.ts";
import type { PendingOperation } from "../../effects/pending.ts";
import type { ControllerResumptionId } from "../../execution/ids.ts";
import { createControllerResumption, settleControllerResumption } from "../../execution/resumption.ts";
import { createCancellationRequest, markCancellationApplied } from "../../execution/cancellation-request.ts";
import { createChildExecutionLink, markChildLinkSettled } from "../../execution/child-link.ts";
import { createPeerRequestLink, markPeerRequestLinkSettled } from "../../execution/peer-request-link.ts";
import { createUserInputRequest, markUserInputResponded } from "../../execution/user-input-request.ts";
import { createConfirmationRequest, markConfirmationApproved } from "../../execution/confirmation-request.ts";
import { consumeSpawnCredit, createLineageSpawnBudget } from "../../execution/structural-budget.ts";
import { createEffectiveOperationAuthority } from "../../operations/authority.ts";
import type { EventEnvelope, EventId } from "../../interaction/event-envelope.ts";
import type { RuntimeStore } from "../../ports/runtime-store.ts";
import type { ContractCase } from "./expect.ts";
import { assertDeepEqual, assertEqual, assertRejects, assertTrue } from "./expect.ts";

const EXECUTION = "exe_contract" as ExecutionId;
const MAILBOX = "mbx_contract";

/** Thrown to force a rollback, with a name a contract case can recognise. */
class RollbackProbe extends Error {
  constructor() {
    super("deliberate rollback");
    this.name = "RollbackProbe";
  }
}

function context(): ExecutionContext {
  return createExecutionContext({
    executionId: EXECUTION,
    kind: "agent",
    definition: { id: "contract-agent" as never, version: 1, integrity: "deadbeef" },
    ownerExecutionId: null,
    rootExecutionId: EXECUTION,
    mailboxId: MAILBOX,
    createdAt: "2026-01-01T00:00:00.000Z",
  });
}

function event(id: string, label = "test-input"): EventEnvelope {
  return {
    eventId: id as EventId,
    destination: { executionId: EXECUTION },
    kind: "external.input",
    body: { label, payload: { n: 1 } },
    correlationId: null,
    causationId: null,
    occurredAt: "2026-01-01T00:00:01.000Z",
  };
}

function pending(suffix = "1", key = "per_input:contract"): PendingOperation {
  return createPendingOperation({
    pendingOperationId: `pop_${suffix}` as PendingOperationId,
    executionId: EXECUTION,
    effectId: `eff_${suffix}` as EffectId,
    effectKind: "use_capability",
    correlationId: `req-${suffix}`,
    causationId: "act_1",
    idempotencyKey: key as IdempotencyKey,
    createdAt: "2026-01-01T00:00:02.000Z",
    deadline: "2026-01-01T00:00:32.000Z",
  });
}

export function runtimeStoreContract(factory: () => RuntimeStore): readonly ContractCase[] {
  return [
    {
      name: "an inserted Execution is readable and cannot be inserted twice",
      async run() {
        const store = factory();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(context()));
        const loaded = await store.readExecution(EXECUTION);
        assertEqual(loaded?.lifecycle, "CREATED", "the stored lifecycle is preserved");
        await assertRejects(
          () => store.transact(EXECUTION, async (tx) => tx.executions.insert(context())),
          "ExecutionAlreadyExistsError",
          "one Execution id maps to one record",
        );
      },
    },
    {
      name: "updates are compare-and-set on the revision the writer read",
      async run() {
        const store = factory();
        const created = context();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(created));

        const ready = transitionContext(created, "READY", "2026-01-01T00:00:01.000Z");
        await store.transact(EXECUTION, async (tx) => tx.executions.update(ready, created.revision));
        assertEqual((await store.readExecution(EXECUTION))?.revision, created.revision + 1, "revision advances once per write");

        const stale = transitionContext(created, "CANCELLED", "2026-01-01T00:00:02.000Z");
        await assertRejects(
          () => store.transact(EXECUTION, async (tx) => tx.executions.update(stale, created.revision)),
          "RuntimeConcurrencyError",
          "a stale writer cannot overwrite a newer revision",
        );
      },
    },
    {
      name: "a failed transaction commits nothing",
      async run() {
        const store = factory();
        const created = context();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(created));

        await assertRejects(
          () =>
            store.transact(EXECUTION, async (tx) => {
              await tx.mailboxes.append(MAILBOX, event("evt_rollback"), "2026-01-01T00:00:02.000Z");
              await tx.emissions.append({
                emissionId: "emi_rollback",
                executionId: EXECUTION,
                activationId: "act_1" as ActivationId,
                sequence: 1,
                body: { kind: "text", text: "should not survive" },
                emittedAt: "2026-01-01T00:00:02.000Z",
              });
              await tx.pendingOperations.insert(pending("rollback"));
              await tx.effectJournal.append({
                effectId: "eff_rollback" as EffectId,
                executionId: EXECUTION,
                effectKind: "use_capability",
                phase: "dispatch_started",
                activationId: "act_1" as ActivationId,
                pendingOperationId: "pop_rollback" as PendingOperationId,
                at: "2026-01-01T00:00:02.000Z",
                detail: {},
              });
              throw Object.assign(new Error("aborted"), { name: "AbortedForContract" });
            }),
          "AbortedForContract",
          "the transaction propagates its failure",
        );

        assertDeepEqual(await store.listEmissions(EXECUTION), [], "no emission survived the rollback");
        assertDeepEqual(await store.listPendingOperations(EXECUTION), [], "no pending operation survived the rollback");
        assertDeepEqual(await store.listEffectJournal(EXECUTION), [], "no journal entry survived the rollback");
        await store.transact(EXECUTION, async (tx) => {
          const queued = await tx.mailboxes.peek(MAILBOX);
          assertEqual(queued.length, 0, "no mailbox write survived the rollback");
        });
      },
    },
    {
      name: "mailbox delivery is duplicate-safe and cursored",
      async run() {
        const store = factory();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(context()));

        await store.transact(EXECUTION, async (tx) => {
          const first = await tx.mailboxes.append(MAILBOX, event("evt_1"), "2026-01-01T00:00:02.000Z");
          assertTrue(first.accepted, "a new event is accepted");
          const repeat = await tx.mailboxes.append(MAILBOX, event("evt_1"), "2026-01-01T00:00:03.000Z");
          assertTrue(!repeat.accepted, "the same event id is not observed twice");
          await tx.mailboxes.append(MAILBOX, event("evt_2"), "2026-01-01T00:00:04.000Z");
        });

        await store.transact(EXECUTION, async (tx) => {
          assertEqual((await tx.mailboxes.peek(MAILBOX)).length, 2, "both distinct events are pending");
          const consumed = await tx.mailboxes.consume(MAILBOX);
          assertDeepEqual(consumed.map((e) => e.eventId), ["evt_1", "evt_2"], "events are consumed in arrival order");
          assertEqual((await tx.mailboxes.peek(MAILBOX)).length, 0, "the cursor advanced past consumed events");
        });

        await store.transact(EXECUTION, async (tx) => {
          await tx.mailboxes.append(MAILBOX, event("evt_3"), "2026-01-01T00:00:05.000Z");
          const consumed = await tx.mailboxes.consume(MAILBOX);
          assertDeepEqual(consumed.map((e) => e.eventId), ["evt_3"], "consumption resumes from the cursor, not the start");
        });
      },
    },
    {
      name: "emissions are sequenced per Execution and kept apart from lifecycle audit",
      async run() {
        const store = factory();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(context()));
        await store.transact(EXECUTION, async (tx) => {
          for (const text of ["one", "two"]) {
            const sequence = await tx.emissions.nextSequence(EXECUTION);
            await tx.emissions.append({
              emissionId: `emi_${sequence}`,
              executionId: EXECUTION,
              activationId: "act_1" as ActivationId,
              sequence,
              body: { kind: "text", text },
              emittedAt: "2026-01-01T00:00:06.000Z",
            });
          }
          await tx.transitions.append({
            executionId: EXECUTION,
            from: "CREATED",
            to: "READY",
            at: "2026-01-01T00:00:06.000Z",
            activationId: null,
            reason: "contract",
          });
        });

        assertDeepEqual((await store.listEmissions(EXECUTION)).map((e) => e.sequence), [1, 2], "emissions are sequenced");
        assertEqual((await store.listTransitions(EXECUTION)).length, 1, "the lifecycle audit is stored separately");
        await store.transact(EXECUTION, async (tx) => {
          assertEqual((await tx.mailboxes.peek(MAILBOX)).length, 0, "audit records never enter a mailbox");
        });
      },
    },
    {
      name: "pending operations record dispatch and settlement separately",
      async run() {
        const store = factory();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(context()));

        await store.transact(EXECUTION, async (tx) => tx.pendingOperations.insert(pending()));
        const created = await store.readPendingOperation("pop_1" as PendingOperationId);
        assertEqual(created?.status, "pending", "a new operation is unresolved");
        assertEqual(created?.dispatch, "not_dispatched", "and has not been handed to the outside world");
        assertEqual(created?.outcome, null, "and nothing is known about what happened");
        assertEqual(created?.deadline, "2026-01-01T00:00:32.000Z", "its own deadline is stored, not derived");

        await store.transact(EXECUTION, async (tx) => {
          await tx.pendingOperations.update(markDispatched(created!, "2026-01-01T00:00:03.000Z"));
        });
        const dispatched = await store.readPendingOperation("pop_1" as PendingOperationId);
        assertEqual(dispatched?.dispatch, "dispatched", "dispatch is recorded");
        assertEqual(dispatched?.status, "pending", "and dispatched is still not completed");
        assertEqual(dispatched?.outcome, null, "the crash-sensitive state is representable, not inferred");

        await store.transact(EXECUTION, async (tx) => {
          await tx.pendingOperations.update(markSettled(dispatched!, "success", "evt_result" as EventId, "2026-01-01T00:00:04.000Z"));
        });
        const settled = await store.readPendingOperation("pop_1" as PendingOperationId);
        assertEqual(settled?.status, "settled", "settlement is terminal for the operation");
        assertEqual(settled?.outcome, "success", "and records what the world established");
        assertEqual(settled?.resultEventId, "evt_result", "linked to the observation the Execution received");
      },
    },
    {
      name: "pending operations are findable by duplicate-suppression key",
      async run() {
        const store = factory();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(context()));
        await store.transact(EXECUTION, async (tx) => {
          await tx.pendingOperations.insert(pending("1", "per_input:send"));
          await tx.pendingOperations.insert(pending("2", "per_input:other"));
          await tx.pendingOperations.insert(pending("3", "per_input:send"));
        });

        await store.transact(EXECUTION, async (tx) => {
          const matches = await tx.pendingOperations.findByIdempotencyKey(EXECUTION, "per_input:send" as IdempotencyKey);
          assertDeepEqual(matches.map((operation) => operation.pendingOperationId), ["pop_1", "pop_3"], "only same-key operations match");
          const none = await tx.pendingOperations.findByIdempotencyKey(EXECUTION, "per_input:absent" as IdempotencyKey);
          assertEqual(none.length, 0, "an unseen key matches nothing");
        });
        assertEqual((await store.listPendingOperations(EXECUTION)).length, 3, "all three belong to this Execution");
      },
    },
    {
      name: "the Effect journal is sequenced per Execution and never reaches a mailbox",
      async run() {
        const store = factory();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(context()));
        await store.transact(EXECUTION, async (tx) => {
          for (const phase of ["requested", "authorized", "dispatch_started", "completed"] as const) {
            await tx.effectJournal.append({
              effectId: "eff_1" as EffectId,
              executionId: EXECUTION,
              effectKind: "use_capability",
              phase,
              activationId: "act_1" as ActivationId,
              pendingOperationId: "pop_1" as PendingOperationId,
              at: "2026-01-01T00:00:05.000Z",
              detail: { phase },
            });
          }
        });

        const entries = await store.listEffectJournal(EXECUTION);
        assertDeepEqual(entries.map((entry) => entry.phase), ["requested", "authorized", "dispatch_started", "completed"], "phases are ordered");
        assertDeepEqual(entries.map((entry) => entry.sequence), [1, 2, 3, 4], "and sequenced");
        await store.transact(EXECUTION, async (tx) => {
          assertEqual((await tx.mailboxes.peek(MAILBOX)).length, 0, "journal entries are audit, not observations");
          const byEffect = await tx.effectJournal.listByEffect("eff_1" as EffectId);
          assertEqual(byEffect.length, 4, "one Effect's whole history is retrievable");
        });
      },
    },
    {
      name: "controller resumptions settle in the same transaction as the wake they cause",
      async run() {
        const store = factory();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(context()));

        const resumption = createControllerResumption({
          resumptionId: "res_1" as ControllerResumptionId,
          executionId: EXECUTION,
          key: "wf/draft#1/model/phase1",
          activationId: "act_1" as ActivationId,
          observedRevision: 3,
          createdAt: "2026-01-01T00:00:02.000Z",
        });

        await store.transact(EXECUTION, async (tx) => {
          await tx.controllerResumptions.insert(resumption);
        });

        assertEqual(
          (await store.readControllerResumption("res_1" as ControllerResumptionId))?.state,
          "pending",
          "an unresolved resumption reads as pending",
        );
        assertEqual((await store.listControllerResumptions(EXECUTION)).length, 1, "and it belongs to this Execution");

        // The key is how a resumed Activation recovers a result instead of starting the work again.
        await store.transact(EXECUTION, async (tx) => {
          const found = await tx.controllerResumptions.findByKey(EXECUTION, "wf/draft#1/model/phase1");
          assertEqual(found?.resumptionId, "res_1", "the controller's stable key finds its record");
          const absent = await tx.controllerResumptions.findByKey(EXECUTION, "wf/draft#2/model/phase1");
          assertEqual(absent, undefined, "and a key nothing was stored under finds nothing");
        });

        // Settlement and the lifecycle change commit together, or neither does.
        await assertRejects(
          () =>
            store.transact(EXECUTION, async (tx) => {
              const stored = await tx.controllerResumptions.get("res_1" as ControllerResumptionId);
              await tx.controllerResumptions.update(
                settleControllerResumption(stored!, { status: "settled", value: { text: "answer" } }, "2026-01-01T00:00:03.000Z"),
              );
              throw new RollbackProbe();
            }),
          "RollbackProbe",
          "a settlement whose transaction fails leaves the resumption pending",
        );
        assertEqual(
          (await store.readControllerResumption("res_1" as ControllerResumptionId))?.state,
          "pending",
          "a rolled-back settlement leaves nothing settled",
        );

        await store.transact(EXECUTION, async (tx) => {
          const stored = await tx.controllerResumptions.get("res_1" as ControllerResumptionId);
          await tx.controllerResumptions.update(
            settleControllerResumption(stored!, { status: "settled", value: { text: "answer" } }, "2026-01-01T00:00:04.000Z"),
          );
        });

        const settled = await store.readControllerResumption("res_1" as ControllerResumptionId);
        assertEqual(settled?.state, "settled", "and settled once its transaction commits");
        assertDeepEqual(settled?.value, { text: "answer" }, "the stored outcome is plain data");
        assertEqual(settled?.settledAt, "2026-01-01T00:00:04.000Z", "with the time it settled");
        await store.transact(EXECUTION, async (tx) => {
          assertEqual((await tx.mailboxes.peek(MAILBOX)).length, 0, "settling one appends no Event");
          assertEqual(
            await tx.pendingOperations.get("pop_1" as PendingOperationId),
            undefined,
            "and creates no pending operation",
          );
        });
        assertEqual((await store.listEffectJournal(EXECUTION)).length, 0, "and journals nothing as an Effect");
        assertEqual(
          (await store.readExecution(EXECUTION))?.revision,
          1,
          "settling a resumption does not itself rewrite the Execution record",
        );
      },
    },
    {
      name: "effective operation authority commits with the Execution it belongs to",
      async run() {
        const store = factory();

        assertEqual(
          await store.readOperationAuthority(EXECUTION),
          undefined,
          "an Execution with no configured ceiling has no record, which reads as nothing authorized",
        );

        const authority = createEffectiveOperationAuthority({
          authorityId: "oau_1",
          executionId: EXECUTION,
          grant: { operations: [{ capability: "mail", operation: "send" }, { capability: "docs", operation: "search" }] },
          grantedAt: "2026-01-01T00:00:00.000Z",
        });

        // The ceiling and the Execution appear together, or neither does. An Execution committed
        // without its ceiling would silently expose nothing; a ceiling without its Execution would
        // be a permission attached to nobody.
        await assertRejects(
          () =>
            store.transact(EXECUTION, async (tx) => {
              await tx.operationAuthorities.insert(authority);
              await tx.executions.insert(context());
              throw new RollbackProbe();
            }),
          "RollbackProbe",
          "a rolled-back creation leaves neither behind",
        );
        assertEqual(await store.readOperationAuthority(EXECUTION), undefined, "no ceiling was written");
        assertEqual(await store.readExecution(EXECUTION), undefined, "and no Execution either");

        await store.transact(EXECUTION, async (tx) => {
          await tx.operationAuthorities.insert(authority);
          await tx.executions.insert(context());
        });

        const stored = await store.readOperationAuthority(EXECUTION);
        assertEqual(stored?.authorityId, "oau_1", "the record is readable once its transaction commits");
        assertEqual(stored?.version, 1, "a root grant is version 1; narrowing for a child bumps it");
        assertEqual(stored?.source, "root_grant", "and records the origin of that ceiling");
        assertDeepEqual(
          stored?.operations,
          [{ capability: "docs", operation: "search" }, { capability: "mail", operation: "send" }],
          "operations are deduplicated and ordered, so two equal grants produce equal records",
        );

        // Inside a transaction it reads the same way, and it is not confused with anything else.
        await store.transact(EXECUTION, async (tx) => {
          assertEqual((await tx.operationAuthorities.get(EXECUTION))?.authorityId, "oau_1", "readable inside a transaction too");
          assertEqual(
            await tx.operationAuthorities.get("exe_other" as ExecutionId),
            undefined,
            "and scoped to one Execution",
          );
        });
        assertEqual((await store.listEffectJournal(EXECUTION)).length, 0, "storing a ceiling journals no Effect");
        assertEqual((await store.listPendingOperations(EXECUTION)).length, 0, "and creates no pending operation");

        // One ceiling per Execution: a second insert is a bug, not a silent replacement.
        await assertRejects(
          () => store.transact(EXECUTION, async (tx) => tx.operationAuthorities.insert(authority)),
          "Error",
          "authority is written once at creation, never quietly overwritten",
        );
      },
    },
    {
      name: "the lineage spawn budget is compare-and-set and cannot be over-spent concurrently",
      async run() {
        const store = factory();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(context()));

        const budget = createLineageSpawnBudget({ rootExecutionId: EXECUTION, capacity: 1, grantedAt: "2026-01-01T00:00:00.000Z" });
        await store.transact(EXECUTION, async (tx) => tx.lineageSpawnBudgets.insert(budget));
        assertEqual((await store.readLineageSpawnBudget(EXECUTION))?.capacity, 1, "the capacity is stored");
        assertEqual((await store.readLineageSpawnBudget(EXECUTION))?.consumed, 0, "nothing consumed yet");

        // Two writers both read revision 1 and both compute a spend; only the first commit succeeds.
        const beforeEither = (await store.readLineageSpawnBudget(EXECUTION))!;
        await store.transact(EXECUTION, async (tx) =>
          tx.lineageSpawnBudgets.update(consumeSpawnCredit(beforeEither), beforeEither.revision),
        );
        await assertRejects(
          () =>
            store.transact(EXECUTION, async (tx) =>
              tx.lineageSpawnBudgets.update(consumeSpawnCredit(beforeEither), beforeEither.revision),
            ),
          "SpawnBudgetConcurrencyError",
          "a writer that read the pre-spend revision cannot also spend the credit",
        );
        assertEqual((await store.readLineageSpawnBudget(EXECUTION))?.consumed, 1, "consumed never exceeds capacity");
      },
    },
    {
      name: "a child execution link records the wait-for edge and settles once",
      async run() {
        const store = factory();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(context()));

        const link = createChildExecutionLink({
          childExecutionId: "exe_child" as ExecutionId,
          parentExecutionId: EXECUTION,
          rootExecutionId: EXECUTION,
          definition: { id: "child" as never, version: 1, integrity: "abc" },
          effectId: "eff_spawn" as EffectId,
          spawnedByActivationId: "act_1" as ActivationId,
          pendingOperationId: "pop_1" as PendingOperationId,
          resultCorrelationId: "job-1",
          createdAt: "2026-01-01T00:00:02.000Z",
        });
        await store.transact(EXECUTION, async (tx) => tx.childExecutionLinks.insert(link));

        const stored = await store.readChildExecutionLink("exe_child" as ExecutionId);
        assertEqual(stored?.parentExecutionId, EXECUTION, "the link names its parent");
        assertEqual(stored?.pendingOperationId, "pop_1", "a call records its terminal-result dependency");
        assertEqual(stored?.state, "active", "a fresh link is active");

        const byParent = await store.listChildExecutionLinks(EXECUTION);
        assertEqual(byParent.length, 1, "the link is listable by parent");

        await store.transact(EXECUTION, async (tx) => {
          const current = await tx.childExecutionLinks.get("exe_child" as ExecutionId);
          await tx.childExecutionLinks.update(markChildLinkSettled(current!, "2026-01-01T00:00:03.000Z"));
        });
        const settled = await store.readChildExecutionLink("exe_child" as ExecutionId);
        assertEqual(settled?.state, "settled", "delivery marks the link settled");
        assertEqual(settled?.settledAt, "2026-01-01T00:00:03.000Z", "with the time it settled");
      },
    },
    {
      name: "a peer request link correlates an ask and settles once (Slice E.1)",
      async run() {
        const store = factory();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(context()));

        const link = createPeerRequestLink({
          messageId: "msg_1",
          requesterExecutionId: EXECUTION,
          responderExecutionId: "exe_peer" as ExecutionId,
          requestEffectId: "eff_ask" as EffectId,
          requestPendingOperationId: "pop_ask" as PendingOperationId,
          requestCorrelationId: "AB",
          createdAt: "2026-01-01T00:00:02.000Z",
        });
        await store.transact(EXECUTION, async (tx) => tx.peerRequestLinks.insert(link));

        assertEqual((await store.readPeerRequestLink("msg_1"))?.state, "open", "a fresh link is open");
        assertEqual((await store.listPeerRequestLinksByRequester(EXECUTION)).length, 1, "listable by requester");
        assertEqual(
          (await store.listPeerRequestLinksByResponder("exe_peer" as ExecutionId)).length,
          1,
          "and by responder",
        );

        await store.transact(EXECUTION, async (tx) => {
          const current = await tx.peerRequestLinks.get("msg_1");
          await tx.peerRequestLinks.update(markPeerRequestLinkSettled(current!, "2026-01-01T00:00:03.000Z"));
        });
        assertEqual((await store.readPeerRequestLink("msg_1"))?.state, "settled", "a reply closes the link");
        assertEqual((await store.listEffectJournal(EXECUTION)).length, 0, "a peer link journals no Effect");
      },
    },
    {
      name: "a cancellation request is a single per-Execution record, applied once (Slice E.1)",
      async run() {
        const store = factory();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(context()));

        assertEqual(await store.readCancellationRequest(EXECUTION), undefined, "none by default");
        const request = createCancellationRequest({
          executionId: EXECUTION,
          reason: "halt",
          requestedAt: "2026-01-01T00:00:02.000Z",
        });
        await store.transact(EXECUTION, async (tx) => tx.cancellationRequests.insert(request));
        assertEqual((await store.readCancellationRequest(EXECUTION))?.state, "pending", "recorded as pending");

        await assertRejects(
          () => store.transact(EXECUTION, async (tx) => tx.cancellationRequests.insert(request)),
          "Error",
          "one cancellation request per Execution, never a silent second",
        );

        await store.transact(EXECUTION, async (tx) => {
          const current = await tx.cancellationRequests.get(EXECUTION);
          await tx.cancellationRequests.update(markCancellationApplied(current!, "2026-01-01T00:00:03.000Z"));
        });
        assertEqual((await store.readCancellationRequest(EXECUTION))?.state, "applied", "moves to applied once");
      },
    },
    {
      name: "a user-input request is keyed by requestId, listable, and discoverable while open (Slice E.2)",
      async run() {
        const store = factory();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(context()));

        assertEqual((await store.listOpenUserInputRequests()).length, 0, "none open by default");
        const request = createUserInputRequest({
          requestId: "uir_1",
          executionId: EXECUTION,
          effectId: "eff_ui" as EffectId,
          pendingOperationId: "pop_ui" as PendingOperationId,
          correlationId: "which-env",
          prompt: "Which environment?",
          schema: { kind: "string" },
          createdAt: "2026-01-01T00:00:02.000Z",
        });
        await store.transact(EXECUTION, async (tx) => tx.userInputRequests.insert(request));

        assertEqual((await store.readUserInputRequest("uir_1"))?.state, "open", "a fresh request is open");
        assertEqual((await store.listUserInputRequests(EXECUTION)).length, 1, "listable by execution");
        assertEqual((await store.listOpenUserInputRequests()).length, 1, "and discoverable while open");
        assertEqual((await store.listEffectJournal(EXECUTION)).length, 0, "the record itself journals no Effect");

        await assertRejects(
          () => store.transact(EXECUTION, async (tx) => tx.userInputRequests.insert(request)),
          "Error",
          "one record per requestId, never a silent second",
        );

        await store.transact(EXECUTION, async (tx) => {
          const current = await tx.userInputRequests.get("uir_1");
          await tx.userInputRequests.update(markUserInputResponded(current!, "2026-01-01T00:00:03.000Z"));
        });
        assertEqual((await store.readUserInputRequest("uir_1"))?.state, "responded", "a response marks it responded");
        assertEqual((await store.listOpenUserInputRequests()).length, 0, "and it leaves the open set");
      },
    },
    {
      name: "a confirmation request binds one exact proposal + digest, resolved once (Slice E.2)",
      async run() {
        const store = factory();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(context()));

        assertEqual((await store.listPendingConfirmations()).length, 0, "none pending by default");
        const request = createConfirmationRequest({
          confirmationId: "cnf_1",
          executionId: EXECUTION,
          effectId: "eff_trade" as EffectId,
          effectKind: "use_capability",
          pendingOperationId: "pop_trade" as PendingOperationId,
          correlationId: "t1",
          proposal: {
            kind: "use_capability",
            capability: "world.trade" as never,
            operation: "execute" as never,
            input: { asset: "BTC", qty: 1 },
          },
          reason: "a live trade",
          createdAt: "2026-01-01T00:00:02.000Z",
        });
        await store.transact(EXECUTION, async (tx) => tx.confirmationRequests.insert(request));

        const stored = await store.readConfirmationRequest("cnf_1");
        assertEqual(stored?.state, "pending", "a fresh request is pending");
        assertTrue(
          typeof stored?.proposalDigest === "string" && stored.proposalDigest.length > 0,
          "it carries a canonical digest of the exact proposal",
        );
        assertEqual((await store.listConfirmationRequests(EXECUTION)).length, 1, "listable by execution");
        assertEqual((await store.listPendingConfirmations()).length, 1, "and discoverable while pending");
        assertEqual((await store.listEffectJournal(EXECUTION)).length, 0, "the record itself journals no Effect");

        await store.transact(EXECUTION, async (tx) => {
          const current = await tx.confirmationRequests.get("cnf_1");
          await tx.confirmationRequests.update(markConfirmationApproved(current!, "2026-01-01T00:00:03.000Z"));
        });
        assertEqual((await store.readConfirmationRequest("cnf_1"))?.state, "approved", "a decision resolves it once");
        assertEqual((await store.listPendingConfirmations()).length, 0, "and it leaves the pending set");
      },
    },
    {
      name: "returned records do not alias stored state",
      async run() {
        const store = factory();
        await store.transact(EXECUTION, async (tx) => tx.executions.insert(context()));
        const first = await store.readExecution(EXECUTION);
        const second = await store.readExecution(EXECUTION);
        assertTrue(first !== second, "each read returns its own record");
        assertDeepEqual(first, second, "reads are equal in value");
      },
    },
  ];
}
