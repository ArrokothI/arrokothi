/**
 * The controller-local resumption scope: the one live capability a controller is handed.
 *
 * `ActivationInput` is frozen pure data and stays that way - a controller's input has no functions
 * in it, and the conformance suite checks that structurally. But a controller doing slow local work
 * needs a way to *start* that work and be told either its result or that it must yield, and a
 * value that can start work is by definition not pure data. So it arrives as a separate, narrowly
 * scoped second argument rather than as a field of the input.
 *
 * Read this port as a list of things it is not:
 *
 * ```text
 * no RuntimeStore              no Effect requester or processor
 * no Scheduler                 no EffectAuthorizer
 * no Harness                   no CapabilityExecutor
 * no lifecycle setter          no settlement entry point
 * no mailbox mutation          no authority mutator
 * no inline-wait budget        no general "runtime context"
 * ```
 *
 * There is exactly one method, and everything it does is owned by the runtime: the runtime races
 * the work against the Activation's inline wait budget, tracks the promise, persists the record,
 * and wakes the Execution. The controller supplies an opaque thunk and a stable key, and learns one
 * of three things.
 *
 * ```text
 * run(key, thunk)
 *   settled(value)         the work finished inside this Activation
 *   failed(failure)        the work threw or produced something unpersistable
 *   suspended(id)          the Activation's budget expired; report `await_resumption`
 * ```
 *
 * The thunk is ephemeral and is never persisted. The key is not: it is how a *later* Activation
 * reconstructing the same semantic call recovers the already-settled result instead of dispatching
 * a second time, so it must be derived from persisted controller coordinates rather than from
 * anything process-local.
 *
 * Reporting `suspended` is not the same as suspending. The controller must still persist its
 * semantic progress and return `{ status: "await_resumption", resumptionId }`; only then does the
 * Harness create the durable record and derive `WAITING`. Work registered by an Activation that
 * does not return the matching wait is abandoned and can never wake the Execution.
 */

import type { ControllerResumptionFailure } from "../execution/resumption.ts";
import type { ControllerResumptionId } from "../execution/ids.ts";
import type { JsonValue } from "../util/json.ts";

export type ControllerResumptionAttempt =
  /** The work finished within this Activation. The value has already crossed the JSON boundary. */
  | { readonly status: "settled"; readonly value: JsonValue }
  /** The work threw, rejected, or produced something that cannot be persisted. */
  | { readonly status: "failed"; readonly failure: ControllerResumptionFailure }
  /**
   * The Activation's inline budget expired.
   *
   * The work is untouched and still running; this Activation simply stopped waiting for it. Persist
   * semantic progress and report `await_resumption` with this id.
   */
  | { readonly status: "suspended"; readonly resumptionId: ControllerResumptionId };

/** Opaque controller-local work. Never persisted, never inspected, never re-created by the runtime. */
export type ControllerResumptionWork = () => unknown | Promise<unknown>;

/**
 * Bound to exactly one Execution and one Activation.
 *
 * A scope handed to a controller cannot be aimed at another Execution, cannot outlive its
 * Activation usefully, and cannot settle anything: settlement authority stays inside the runtime.
 */
export interface ControllerResumptionScope {
  /**
   * Runs controller-local work under this Activation's inline wait budget.
   *
   * Idempotent per key within an Execution: a key whose work already settled returns the stored
   * outcome without invoking `work` at all, and a key with an unresolved registration returns the
   * existing suspension rather than dispatching a second time.
   */
  run(key: string, work: ControllerResumptionWork): Promise<ControllerResumptionAttempt>;
}
