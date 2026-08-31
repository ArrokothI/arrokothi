/**
 * Scheduler contract.
 *
 * The load-bearing case is exclusion: while an Execution is claimed, no other worker may claim it.
 * Everything else here - FIFO order, idempotent enqueue, requeue-on-release - exists so that
 * exclusion cannot be satisfied by simply losing work.
 */

import type { ExecutionId } from "../../execution/ids.ts";
import type { Scheduler } from "../../ports/scheduler.ts";
import type { ContractCase } from "./expect.ts";
import { assertEqual, assertRejects, assertTrue } from "./expect.ts";

const A = "exe_a" as ExecutionId;
const B = "exe_b" as ExecutionId;

export function schedulerContract(factory: () => Scheduler): readonly ContractCase[] {
  return [
    {
      name: "work is claimed in enqueue order",
      async run() {
        const scheduler = factory();
        await scheduler.enqueue(A);
        await scheduler.enqueue(B);
        assertEqual((await scheduler.claim("w1"))?.executionId, A, "the first enqueued Execution is claimed first");
        assertEqual((await scheduler.claim("w1"))?.executionId, B, "then the second");
        assertEqual(await scheduler.claim("w1"), undefined, "an empty queue yields nothing");
      },
    },
    {
      name: "enqueue is idempotent",
      async run() {
        const scheduler = factory();
        await scheduler.enqueue(A);
        await scheduler.enqueue(A);
        assertEqual(await scheduler.queuedCount(), 1, "one Execution is one unit of work");
        const claim = await scheduler.claim("w1");
        assertTrue(claim !== undefined, "the Execution is claimable");
        await scheduler.ack(claim!);
        assertEqual(await scheduler.claim("w1"), undefined, "no duplicate work item remains");
      },
    },
    {
      name: "a claimed Execution cannot be claimed by another worker",
      async run() {
        const scheduler = factory();
        await scheduler.enqueue(A);
        const first = await scheduler.claim("w1");
        assertTrue(first !== undefined, "the first worker claims it");
        assertEqual(await scheduler.claim("w2"), undefined, "a second worker cannot claim the same Execution");
        await scheduler.ack(first!);
      },
    },
    {
      name: "exclusion does not block unrelated Executions",
      async run() {
        const scheduler = factory();
        await scheduler.enqueue(A);
        await scheduler.enqueue(B);
        const first = await scheduler.claim("w1");
        assertEqual(first?.executionId, A, "the first worker takes A");
        assertEqual((await scheduler.claim("w2"))?.executionId, B, "a second worker takes B");
      },
    },
    {
      name: "release requeues in one step; ack does not",
      async run() {
        const scheduler = factory();
        await scheduler.enqueue(A);
        const first = await scheduler.claim("w1");
        await scheduler.release(first!, { requeue: true });
        const second = await scheduler.claim("w2");
        assertEqual(second?.executionId, A, "a released Execution becomes claimable again");
        await scheduler.ack(second!);
        assertEqual(await scheduler.claim("w2"), undefined, "an acked Execution is not rescheduled");
      },
    },
    {
      name: "an enqueue during an Activation is honoured after the claim ends",
      async run() {
        const scheduler = factory();
        await scheduler.enqueue(A);
        const claim = await scheduler.claim("w1");
        await scheduler.enqueue(A);
        assertEqual(await scheduler.claim("w2"), undefined, "the Execution stays excluded while claimed");
        await scheduler.ack(claim!);
        assertEqual((await scheduler.claim("w2"))?.executionId, A, "the Event that arrived mid-Activation is not lost");
      },
    },
    {
      name: "a stale claim cannot be finished twice",
      async run() {
        const scheduler = factory();
        await scheduler.enqueue(A);
        const claim = await scheduler.claim("w1");
        await scheduler.ack(claim!);
        await assertRejects(() => scheduler.ack(claim!), "UnknownClaimError", "an already-finished claim is rejected");
      },
    },
  ];
}
