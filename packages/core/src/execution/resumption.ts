/**
 * ControllerResumption: the runtime's record of one piece of controller-local asynchronous work.
 *
 * This is deliberately **not** a `PendingOperation`, and the difference is semantic rather than
 * organisational. A PendingOperation records runtime-mediated semantic work whose settlement
 * normally produces an Event; a ControllerResumption records work that never crossed the runtime
 * boundary at all - a model-provider call is local to the Execution in exactly the sense that
 * parsing a string is - and whose settlement only makes a controller continuation runnable again.
 *
 * Read the record as a list of things it does not have:
 *
 * ```text
 * no effectId            no idempotency key
 * no effectKind          no dispatch state
 * no resultEventId       no "unknown" outcome
 * no authorization       no journal phase
 * ```
 *
 * Every one of those belongs to work the world may have observed. Local work either produced a
 * value or threw, so `pending | settled` with a value or a normalized failure is the whole truth.
 * Nothing here is delivered to a mailbox and nothing here is an Event.
 *
 * `observedRevision` records the `ExecutionContext.revision` the suspending Activation read. It
 * carries **no policy in v0.4**: v0.4 suspends exclusively, so no Activation can intervene and
 * there is no stale continuation to detect. It is written now so that v0.5's stale-continuation
 * rule has something to check without migrating persisted records
 * (see [`../../../../docs/future-plan.md`](../../../../docs/future-plan.md) §1.2).
 *
 * Everything stored is plain JSON. A Promise, a thunk, a provider client, or an `AbortSignal` in
 * one of these records would make the runtime non-portable in the one place that most looks like it
 * could get away with it, so the value is validated and round-tripped before it is ever written.
 */

import type { JsonValue } from "../util/json.ts";
import { cloneJson, jsonIssues } from "../util/json.ts";
import type { ActivationId, ControllerResumptionId, ExecutionId } from "./ids.ts";

/** A normalized local failure. The same shape whether the work rejected fast or slow. */
export interface ControllerResumptionFailure {
  readonly code: string;
  readonly message: string;
}

/** What one piece of controller-local work produced. There is no `unknown` here, on purpose. */
export type ControllerResumptionOutcome =
  | { readonly status: "settled"; readonly value: JsonValue }
  | { readonly status: "failed"; readonly failure: ControllerResumptionFailure };

export type ControllerResumptionState = "pending" | "settled";

export interface ControllerResumption {
  readonly resumptionId: ControllerResumptionId;
  readonly executionId: ExecutionId;
  /**
   * The controller's stable key for this work.
   *
   * Derived from persisted controller coordinates only, so a later Activation reconstructing the
   * same semantic call reconstructs the same key and recovers the stored outcome instead of
   * dispatching a second time.
   */
  readonly key: string;
  /** The Activation that started the work and suspended on it. */
  readonly activationId: ActivationId;
  /** The controller revision that Activation read. No policy attached in v0.4. */
  readonly observedRevision: number;
  readonly state: ControllerResumptionState;
  /** Present only once `state` is `settled` and the work succeeded. */
  readonly value: JsonValue | null;
  /** Present only once `state` is `settled` and the work failed. */
  readonly failure: ControllerResumptionFailure | null;
  readonly createdAt: string;
  readonly settledAt: string | null;
}

export interface CreateControllerResumptionInput {
  readonly resumptionId: ControllerResumptionId;
  readonly executionId: ExecutionId;
  readonly key: string;
  readonly activationId: ActivationId;
  readonly observedRevision: number;
  readonly createdAt: string;
}

export function createControllerResumption(input: CreateControllerResumptionInput): ControllerResumption {
  return {
    resumptionId: input.resumptionId,
    executionId: input.executionId,
    key: input.key,
    activationId: input.activationId,
    observedRevision: input.observedRevision,
    state: "pending",
    value: null,
    failure: null,
    createdAt: input.createdAt,
    settledAt: null,
  };
}

export function isUnsettled(resumption: ControllerResumption): boolean {
  return resumption.state === "pending";
}

/** Applies an outcome. Already-settled records are returned untouched, so settlement is idempotent. */
export function settleControllerResumption(
  resumption: ControllerResumption,
  outcome: ControllerResumptionOutcome,
  at: string,
): ControllerResumption {
  if (resumption.state === "settled") return resumption;
  return outcome.status === "settled"
    ? { ...resumption, state: "settled", value: outcome.value, failure: null, settledAt: at }
    : { ...resumption, state: "settled", value: null, failure: outcome.failure, settledAt: at };
}

/** The stored outcome of a settled record, or `null` while it is still pending. */
export function outcomeOfResumption(resumption: ControllerResumption): ControllerResumptionOutcome | null {
  if (resumption.state !== "settled") return null;
  if (resumption.failure !== null) return { status: "failed", failure: resumption.failure };
  return { status: "settled", value: resumption.value };
}

/**
 * The single JSON boundary every controller-local result crosses.
 *
 * Applied identically on the fast and slow paths, which is what makes them interchangeable: a
 * result that could not be persisted must not be allowed to succeed merely because it happened to
 * settle inside the Activation that started it. A value that cannot survive the round trip becomes
 * a normalized failure, not a success with a hidden object graph in it.
 */
export function normalizeResumptionValue(value: unknown): ControllerResumptionOutcome {
  const issues = jsonIssues(value, "value");
  if (issues.length > 0) {
    return {
      status: "failed",
      failure: {
        code: "invalid_controller_resumption_value",
        message: `controller-local work produced something that cannot be persisted: ${issues
          .map((issue) => `${issue.path}: ${issue.message}`)
          .join("; ")}`,
      },
    };
  }
  return { status: "settled", value: cloneJson(value as JsonValue) };
}

/** Turns anything thrown by controller-local work into the one failure shape both paths use. */
export function normalizeResumptionError(error: unknown): ControllerResumptionOutcome {
  return {
    status: "failed",
    failure: {
      code: "controller_resumption_failed",
      message: error instanceof Error ? error.message : String(error),
    },
  };
}
