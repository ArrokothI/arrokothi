/**
 * K1.4-candidate — the deterministic fake Driver.
 *
 * The laboratory is the Runtime: it answers an Activation only when a later schedule step submits an
 * Outcome. So this Driver does no work of its own. It records what the Kernel handed it and nothing
 * else, and it never decides what the Kernel should have done.
 *
 * - `deliver` stores the Activation and the attempt's submission grant, reports `delivered()` at once
 *   and returns `undefined`. An immediate transport acknowledgment does not resolve the Activation:
 *   the exchange stays open until an Outcome is accepted.
 * - Grants are kept for the coordinator's lifetime, keyed by Execution, Activation ID and writer epoch.
 *   A stale attempt therefore presents its own retired grant, and the Kernel fences it.
 * - `isSafeToReplace` answers `true`, because this fake has no native session and no work a superseded
 *   attempt could continue. It shows nothing about a real Driver's takeover
 *   (`docs/development/017-known-limitations.md`).
 * - `requestCancellation` records the request. That is a record of a request, not of an interruption.
 */

import type { Activation, DeliverySettlement, ExecutionDriver, SubmissionGrant } from "@arrokothi/kernel";

/** One recorded delivery, in the order the Kernel made them. */
export interface RecordedDelivery {
  readonly activation: Activation;
  readonly grant: SubmissionGrant;
}

/** What the Kernel names when it asks the Driver to cancel. Structural, so no Kernel-internal type is needed. */
export interface RecordedCancellationRequest {
  readonly executionId: string;
  readonly cause: string;
}

export interface FakeDriver extends ExecutionDriver {
  /** The grant the Kernel delivered for exactly this attempt, or `null` when it delivered none. */
  grantFor(executionId: string, activationId: string, writerEpoch: number): SubmissionGrant | null;
  readonly deliveries: readonly RecordedDelivery[];
  readonly cancellationRequests: readonly RecordedCancellationRequest[];
}

const attemptKey = (executionId: string, activationId: string, writerEpoch: number): string =>
  JSON.stringify([executionId, activationId, writerEpoch]);

export function createFakeDriver(): FakeDriver {
  const grants = new Map<string, SubmissionGrant>();
  const deliveries: RecordedDelivery[] = [];
  const cancellationRequests: RecordedCancellationRequest[] = [];
  return {
    driverId: "k0-candidate-fake-driver",
    deliver(activation: Activation, settlement: DeliverySettlement, submission: SubmissionGrant): undefined {
      const key = attemptKey(activation.executionId, activation.activationId, activation.writerEpoch);
      // Ordinary redelivery repeats the attempt and its grant; the first record for an attempt stands.
      if (!grants.has(key)) grants.set(key, submission);
      deliveries.push({ activation, grant: submission });
      settlement.delivered();
      return undefined;
    },
    isSafeToReplace(): boolean {
      return true;
    },
    requestCancellation(request: RecordedCancellationRequest): undefined {
      cancellationRequests.push({ executionId: request.executionId, cause: request.cause });
      return undefined;
    },
    grantFor(executionId: string, activationId: string, writerEpoch: number): SubmissionGrant | null {
      return grants.get(attemptKey(executionId, activationId, writerEpoch)) ?? null;
    },
    deliveries,
    cancellationRequests,
  };
}
