/**
 * Execution lifecycle states.
 *
 * `mental-model/mechanisms/lifecycle.md` owns the transitions. The full set of states is named here
 * because it is settled vocabulary, but this packet reaches only two of them: creation makes an
 * Execution `READY` and an accepted dispatch intent makes it `RUNNING`. `CANCELLED` requires
 * accepted out-of-band cancellation (K1.3); `WAITING` requires an accepted Outcome declaring a
 * wait (K1.2 and K1.3); `COMPLETED` and `FAILED` require an accepted terminal Outcome (K1.2).
 * K1.1 owns the rule that new ordinary input to a terminal destination is refused, but no
 * terminal state is reachable here, so that branch is specified-but-unexercised until K1.3.
 *
 * There is no `CREATED`. `creation.md`: creation "becomes `READY`; there is no externally visible
 * intermediate `CREATED` state."
 */

export type ExecutionState = "READY" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED";

export const TERMINAL_STATES: readonly ExecutionState[] = ["COMPLETED", "FAILED", "CANCELLED"];

/**
 * A terminal lifetime never reopens; intentional re-execution creates a new identity.
 *
 * Compared with an index loop, not `TERMINAL_STATES.includes(state)`: `isTerminal` runs after
 * caller-owned values have been observed in the same tick, and a capture-time side effect can
 * replace `Array.prototype.includes` before this line runs (K11-R5-STATE-01).
 */
export const isTerminal = (state: ExecutionState): boolean => {
  for (let index = 0; index < TERMINAL_STATES.length; index += 1) {
    if (TERMINAL_STATES[index] === state) return true;
  }
  return false;
};
