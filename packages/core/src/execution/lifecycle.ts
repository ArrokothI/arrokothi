/**
 * Operational lifecycle.
 *
 * These states belong to the Harness, not to a controller. A controller reports what semantic
 * progress it made; the Harness decides what that means for scheduling. In particular nothing here
 * lets a controller declare itself `WAITING` - that state is *derived* from the absence of runnable
 * local work plus a recorded wake dependency.
 *
 * The transition table is a pure function so it can be tested without a store, a scheduler, or a
 * clock, and so that every illegal edge fails in one place.
 */

import type { ActivationId, ExecutionId } from "./ids.ts";

export type LifecycleState =
  | "CREATED"
  | "READY"
  | "RUNNING"
  | "WAITING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export const LIFECYCLE_STATES: readonly LifecycleState[] = [
  "CREATED",
  "READY",
  "RUNNING",
  "WAITING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

export const TERMINAL_LIFECYCLE_STATES: readonly LifecycleState[] = ["COMPLETED", "FAILED", "CANCELLED"];

/**
 * Allowed edges.
 *
 * - `CREATED` only becomes schedulable, or is cancelled before it ever runs.
 * - `READY -> RUNNING` is the scheduler claiming an Activation.
 * - `RUNNING` is the only state that can reach `COMPLETED`/`FAILED`: a terminal outcome is always
 *   the validated result of an Activation, never an out-of-band write.
 * - `WAITING -> READY` is an Event arriving, never the persistence layer or a save.
 * - Terminal states have no outgoing edges at all.
 */
const ALLOWED: Readonly<Record<LifecycleState, readonly LifecycleState[]>> = {
  CREATED: ["READY", "CANCELLED"],
  READY: ["RUNNING", "CANCELLED"],
  RUNNING: ["READY", "WAITING", "COMPLETED", "FAILED", "CANCELLED"],
  WAITING: ["READY", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export function isLifecycleState(value: unknown): value is LifecycleState {
  return typeof value === "string" && (LIFECYCLE_STATES as readonly string[]).includes(value);
}

export function isTerminalLifecycle(state: LifecycleState): boolean {
  return (TERMINAL_LIFECYCLE_STATES as readonly string[]).includes(state);
}

export function allowedTransitionsFrom(state: LifecycleState): readonly LifecycleState[] {
  return ALLOWED[state];
}

export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  return ALLOWED[from].includes(to);
}

export class LifecycleTransitionError extends Error {
  readonly from: LifecycleState;
  readonly to: LifecycleState;
  constructor(from: LifecycleState, to: LifecycleState) {
    const reason = isTerminalLifecycle(from)
      ? `${from} is terminal and cannot resume`
      : `allowed: ${ALLOWED[from].join(", ") || "none"}`;
    super(`illegal lifecycle transition ${from} -> ${to} (${reason})`);
    this.name = "LifecycleTransitionError";
    this.from = from;
    this.to = to;
  }
}

export function assertTransition(from: LifecycleState, to: LifecycleState): LifecycleState {
  if (!canTransition(from, to)) throw new LifecycleTransitionError(from, to);
  return to;
}

/**
 * A lifecycle change that happened.
 *
 * This is an audit record, not a runtime Event. It is never routed to a mailbox and never reaches
 * a controller: an Execution learns about the world through delivered Events, and a transition of
 * its own operational state is not an observation it is entitled to consume.
 */
export interface LifecycleTransitionRecord {
  readonly executionId: ExecutionId;
  readonly from: LifecycleState;
  readonly to: LifecycleState;
  readonly at: string;
  /** The Activation that caused it, when a controller run was responsible. */
  readonly activationId: ActivationId | null;
  readonly reason: string;
}
