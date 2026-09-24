/**
 * Execution lifecycle states.
 *
 * `mental-model/mechanisms/lifecycle.md` owns the transitions. The full set of states is named here
 * because it is settled vocabulary. Creation makes an Execution `READY`, an accepted dispatch intent
 * makes it `RUNNING`, and an accepted Outcome makes it `READY` (`continue`), `COMPLETED` or
 * `FAILED` (K1.2). `WAITING` requires an accepted wait registration and `CANCELLED` accepted
 * out-of-band cancellation, both K1.3's. A terminal state is reached only through an accepted
 * decision and never reopens.
 *
 * There is no `CREATED`. `creation.md`: creation "becomes `READY`; there is no externally visible
 * intermediate `CREATED` state."
 */

/**
 * Load-time `Object.freeze`: the terminal vocabulary below is frozen after caller-owned values may
 * already have been observed elsewhere in the process, so the immutability claim must not depend on
 * a live global (K11-R5-STATE-01).
 */
const PrimordialObjectFreeze = Object.freeze;

export type ExecutionState = "READY" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED";

/**
 * The three terminal states, frozen at load time through the load-time reference.
 *
 * The array literal is own data at construction, so no prototype is consulted to build or read it.
 * It is frozen as well because it is *exported* and `isTerminal` reads it at decision time: without
 * the freeze an ordinary caller could append `"READY"` to it and make the Kernel refuse ingress to
 * every live Execution, or empty it and defeat the terminal-destination rule entirely. `readonly`
 * is erased at run time and does not hold that. Self-found while auditing caller-mutable ambient
 * state for K11-R6-STATE-02; same family, separate provenance.
 */
export const TERMINAL_STATES: readonly ExecutionState[] = PrimordialObjectFreeze<readonly ExecutionState[]>([
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

/**
 * A terminal lifetime never reopens; intentional re-execution creates a new identity.
 *
 * Compared with an index loop, not `TERMINAL_STATES.includes(state)`: `isTerminal` runs after
 * caller-owned values have been observed in the same tick, and a capture-time side effect can
 * replace `Array.prototype.includes` before this line runs (K11-R5-STATE-01). The element reads are
 * own reads of a frozen literal, so they consult no prototype either (K11-R6-STATE-02).
 */
export const isTerminal = (state: ExecutionState): boolean => {
  for (let index = 0; index < TERMINAL_STATES.length; index += 1) {
    if (TERMINAL_STATES[index] === state) return true;
  }
  return false;
};
