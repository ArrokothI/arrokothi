/**
 * Scheduling.
 *
 * The scheduler decides *when* a READY Execution gets an Activation. Its one hard guarantee is
 * mutual exclusion: while a claim is outstanding for an Execution, no other worker can claim it.
 * Two workers advancing the same Execution concurrently would let two controllers write conflicting
 * progress for one identity, which no amount of store CAS can repair afterwards.
 *
 * A FIFO in-process implementation and a distributed durable queue must both satisfy this port
 * without changing any Execution semantics.
 */

import type { ExecutionId } from "../execution/ids.ts";

export interface ActivationClaim {
  readonly claimId: string;
  readonly executionId: ExecutionId;
  readonly workerId: string;
}

export interface Scheduler {
  /** Idempotent: an Execution already queued or claimed is not queued twice. */
  enqueue(executionId: ExecutionId): Promise<void>;
  /** Returns the next claimable Execution, or `undefined` when nothing is runnable. */
  claim(workerId: string): Promise<ActivationClaim | undefined>;
  /** The Activation finished; the Execution is no longer claimed and is not requeued. */
  ack(claim: ActivationClaim): Promise<void>;
  /** Releases the claim, optionally putting the Execution back in the queue in one step. */
  release(claim: ActivationClaim, options?: { readonly requeue?: boolean }): Promise<void>;
  /** Executions currently queued and not claimed. Diagnostics and idle detection. */
  queuedCount(): Promise<number>;
}

export class UnknownClaimError extends Error {
  constructor(claimId: string) {
    super(`unknown or already released activation claim ${claimId}`);
    this.name = "UnknownClaimError";
  }
}
