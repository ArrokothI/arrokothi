/**
 * RuntimeStore contract.
 *
 * The invariants a durable implementation must reproduce: compare-and-set on Execution revisions,
 * all-or-nothing transactions, duplicate-safe mailbox delivery, an honest consumption cursor, and
 * lifecycle audit records kept separate from Events.
 */

import { createExecutionContext, transitionContext } from "../../execution/context.ts";
import type { ExecutionContext } from "../../execution/context.ts";
import type { ActivationId, ExecutionId } from "../../execution/ids.ts";
import type { EventEnvelope, EventId } from "../../interaction/event-envelope.ts";
import type { RuntimeStore } from "../../ports/runtime-store.ts";
import type { ContractCase } from "./expect.ts";
import { assertDeepEqual, assertEqual, assertRejects, assertTrue } from "./expect.ts";

const EXECUTION = "exe_contract" as ExecutionId;
const MAILBOX = "mbx_contract";

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

function event(id: string, kind = "test.event"): EventEnvelope {
  return {
    eventId: id as EventId,
    destination: { executionId: EXECUTION },
    kind,
    body: { n: 1 },
    correlationId: null,
    causationId: null,
    occurredAt: "2026-01-01T00:00:01.000Z",
  };
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
              throw Object.assign(new Error("aborted"), { name: "AbortedForContract" });
            }),
          "AbortedForContract",
          "the transaction propagates its failure",
        );

        assertDeepEqual(await store.listEmissions(EXECUTION), [], "no emission survived the rollback");
        await store.transact(EXECUTION, async (tx) => {
          const pending = await tx.mailboxes.peek(MAILBOX);
          assertEqual(pending.length, 0, "no mailbox write survived the rollback");
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
