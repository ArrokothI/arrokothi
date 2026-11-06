/**
 * The native Runtime's scheduler under the legacy Driver (K1.4 design 02, D01-CHK-07).
 *
 * One FIFO with the published Scheduler contract, plus a lineage-filtered claim. A worker named
 * `lineage:<E>` claims only work whose native root is E, so one exchange steps only its own
 * lineage. Any other worker claims the oldest entry overall, which keeps the published contract
 * suite passing unchanged; the bridge itself never uses such a worker.
 *
 * Each enqueue also wakes whoever waits for work in that lineage. That is how an exchange whose
 * lineage has work in flight learns that a settlement made it runnable again, without timers.
 */

import type { ExecutionId } from "@arrokothi/core";
import { UnknownClaimError } from "@arrokothi/core/ports";
import type { ActivationClaim, RuntimeStore, Scheduler } from "@arrokothi/core/ports";

export const LINEAGE_WORKER_PREFIX = "lineage:";

export const lineageWorker = (rootExecutionId: string): string => `${LINEAGE_WORKER_PREFIX}${rootExecutionId}`;

interface Entry {
  readonly executionId: ExecutionId;
  readonly lineage: string;
}

export class LineageScheduler implements Scheduler {
  private readonly queue: Entry[] = [];
  private readonly claimed = new Map<string, ActivationClaim & { readonly lineage: string }>();
  private readonly claimedExecutions = new Set<string>();
  /** Executions enqueued while claimed; requeued when the claim ends. */
  private readonly pendingRequeue = new Map<string, string>();
  private readonly waiters = new Map<string, Array<() => void>>();
  private nextClaim = 1;
  private readonly store: Pick<RuntimeStore, "readExecution"> | undefined;

  /** `store` resolves an Execution's native root; without one, every Execution is its own lineage. */
  constructor(store?: Pick<RuntimeStore, "readExecution">) {
    this.store = store;
  }

  async enqueue(executionId: ExecutionId): Promise<void> {
    const lineage = (await this.store?.readExecution(executionId))?.rootExecutionId ?? executionId;
    if (this.claimedExecutions.has(executionId)) {
      this.pendingRequeue.set(executionId, lineage);
    } else if (!this.queue.some(entry => entry.executionId === executionId)) {
      this.queue.push({ executionId, lineage });
    }
    this.wake(lineage);
  }

  async claim(workerId: string): Promise<ActivationClaim | undefined> {
    const only = workerId.startsWith(LINEAGE_WORKER_PREFIX) ? workerId.slice(LINEAGE_WORKER_PREFIX.length) : undefined;
    const index = this.queue.findIndex(entry =>
      !this.claimedExecutions.has(entry.executionId) && (only === undefined || entry.lineage === only));
    if (index === -1) return undefined;
    const [entry] = this.queue.splice(index, 1) as [Entry];
    const claim = { claimId: `clm_${this.nextClaim++}`, executionId: entry.executionId, workerId, lineage: entry.lineage };
    this.claimed.set(claim.claimId, claim);
    this.claimedExecutions.add(entry.executionId);
    return { claimId: claim.claimId, executionId: claim.executionId, workerId };
  }

  async ack(claim: ActivationClaim): Promise<void> {
    this.finish(claim, false);
  }

  async release(claim: ActivationClaim, options?: { readonly requeue?: boolean }): Promise<void> {
    this.finish(claim, options?.requeue === true);
  }

  async queuedCount(): Promise<number> {
    return this.queue.length;
  }

  /** Whether `lineage` has an unclaimed queued entry. */
  hasQueued(lineage: string): boolean {
    return this.queue.some(entry => entry.lineage === lineage && !this.claimedExecutions.has(entry.executionId));
  }

  /** Resolves at the next enqueue into `lineage`. */
  nextWork(lineage: string): Promise<void> {
    return new Promise(resolve => {
      const list = this.waiters.get(lineage) ?? [];
      list.push(resolve);
      this.waiters.set(lineage, list);
    });
  }

  /** Wakes every waiter of `lineage`, for example when its Execution is cancelled. */
  wake(lineage: string): void {
    const list = this.waiters.get(lineage);
    if (!list) return;
    this.waiters.delete(lineage);
    for (const resolve of list) resolve();
  }

  private finish(claim: ActivationClaim, requeue: boolean): void {
    const held = this.claimed.get(claim.claimId);
    if (!held) throw new UnknownClaimError(claim.claimId);
    this.claimed.delete(claim.claimId);
    this.claimedExecutions.delete(claim.executionId);
    const wanted = this.pendingRequeue.get(claim.executionId);
    this.pendingRequeue.delete(claim.executionId);
    if ((requeue || wanted !== undefined) && !this.queue.some(entry => entry.executionId === claim.executionId)) {
      this.queue.push({ executionId: claim.executionId, lineage: wanted ?? held.lineage });
      this.wake(wanted ?? held.lineage);
    }
  }
}
