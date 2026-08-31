/**
 * Deterministic FIFO scheduler.
 *
 * The only interesting behaviour is exclusion. An Execution that is claimed is skipped by every
 * other `claim` until the claim is acked or released, so two workers can never hold concurrent
 * Activations for one Execution - the guarantee a distributed queue would have to reproduce with
 * leases.
 *
 * `enqueue` is idempotent: an Execution that is already queued, or currently claimed and due to be
 * requeued, does not accumulate duplicate work items just because two Events arrived.
 */

import type { ExecutionId } from "../execution/ids.ts";
import type { ActivationClaim, Scheduler } from "../ports/scheduler.ts";
import { UnknownClaimError } from "../ports/scheduler.ts";

export class FifoScheduler implements Scheduler {
  private readonly queue: ExecutionId[] = [];
  private readonly claimed = new Map<string, ActivationClaim>();
  private readonly claimedExecutions = new Set<string>();
  /** Executions that were enqueued while claimed; requeued when the claim is released. */
  private readonly pendingRequeue = new Set<string>();
  private nextClaim = 1;

  async enqueue(executionId: ExecutionId): Promise<void> {
    if (this.claimedExecutions.has(executionId)) {
      this.pendingRequeue.add(executionId);
      return;
    }
    if (this.queue.includes(executionId)) return;
    this.queue.push(executionId);
  }

  async claim(workerId: string): Promise<ActivationClaim | undefined> {
    const index = this.queue.findIndex((id) => !this.claimedExecutions.has(id));
    if (index === -1) return undefined;
    const [executionId] = this.queue.splice(index, 1) as [ExecutionId];
    const claim: ActivationClaim = { claimId: `clm_${this.nextClaim++}`, executionId, workerId };
    this.claimed.set(claim.claimId, claim);
    this.claimedExecutions.add(executionId);
    return claim;
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

  /** Diagnostics: Executions with an outstanding claim. */
  activeClaims(): readonly ActivationClaim[] {
    return [...this.claimed.values()];
  }

  private finish(claim: ActivationClaim, requeue: boolean): void {
    if (!this.claimed.has(claim.claimId)) throw new UnknownClaimError(claim.claimId);
    this.claimed.delete(claim.claimId);
    this.claimedExecutions.delete(claim.executionId);
    const wanted = this.pendingRequeue.delete(claim.executionId);
    if ((requeue || wanted) && !this.queue.includes(claim.executionId)) {
      this.queue.push(claim.executionId);
    }
  }
}
