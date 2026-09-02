/**
 * CancellationRequest: a narrow runtime-owned record that a RUNNING Execution should stop.
 *
 * Cancellation is runtime *control*, not peer messaging and not a sixth Effect. For a `CREATED`,
 * `READY`, or `WAITING` Execution the runtime transitions straight to `CANCELLED`. A `RUNNING`
 * Execution cannot be interrupted mid-Activation without racing an uncontrolled context mutation, so
 * the request is persisted here instead and the current Activation reaches a safe boundary:
 *
 * ```text
 * cancel() on a RUNNING Execution
 *   -> insert CancellationRequest { state: "pending" }        (separate facet, no context write, so
 *                                                              the in-flight Activation's revision
 *                                                              CAS is untouched)
 *   -> the Activation finishes; the Harness sees the pending request and moves it to CANCELLED
 *      instead of the controller's reported next, marking the request "applied"
 * ```
 *
 * Cancelling means: stop future semantic progression, and settle a `call` parent's dependency as
 * cancellation. It does not claim rollback of work the current Activation already dispatched.
 */

import type { ExecutionId } from "./ids.ts";

export type CancellationRequestState = "pending" | "applied";

export interface CancellationRequest {
  readonly executionId: ExecutionId;
  readonly reason: string | null;
  readonly requestedAt: string;
  readonly state: CancellationRequestState;
  /** When the runtime moved the Execution to CANCELLED because of this request. */
  readonly appliedAt: string | null;
}

export interface CreateCancellationRequestInput {
  readonly executionId: ExecutionId;
  readonly reason: string | null;
  readonly requestedAt: string;
}

export function createCancellationRequest(input: CreateCancellationRequestInput): CancellationRequest {
  return {
    executionId: input.executionId,
    reason: input.reason,
    requestedAt: input.requestedAt,
    state: "pending",
    appliedAt: null,
  };
}

/** Idempotent: an already-applied request is returned untouched. */
export function markCancellationApplied(request: CancellationRequest, at: string): CancellationRequest {
  if (request.state === "applied") return request;
  return { ...request, state: "applied", appliedAt: at };
}

export function isCancellationPending(request: CancellationRequest): boolean {
  return request.state === "pending";
}
