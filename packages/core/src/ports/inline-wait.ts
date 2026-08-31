/**
 * The inline wait budget - how long *this Activation* is willing to stay occupied.
 *
 * This is a scheduling concern and nothing else, and separating it from the Effect's own deadline
 * is one of the load-bearing distinctions in the gateway:
 *
 *   inline wait budget   how long the current Activation waits before yielding
 *   Effect deadline      how long the operation itself may remain unresolved
 *
 * A budget of 50ms and a deadline of 30s are entirely consistent. When the budget expires the
 * Activation yields and the Execution may become WAITING; the operation is untouched - still valid,
 * still pending, still with its full deadline to produce a result. An implementation that failed
 * the Effect when the Activation got bored would be turning a scheduling decision into a semantic
 * one.
 *
 * It is a port because the right policy differs by deployment and because tests need it to be
 * deterministic. The default lives here rather than under `reference/` for the same reason
 * `denyAllEffects` does: it is pure, it imports nothing, and a Harness constructed without one
 * still needs correct behaviour. Alternatives - never wait inline, or a wall-clock budget - live
 * with the other reference implementations.
 */

export type InlineWaitResult<T> =
  | { readonly settled: true; readonly value: T }
  /** The budget expired first. The work is still running; the Activation stops waiting for it. */
  | { readonly settled: false };

export interface InlineWaitBudget {
  /**
   * Waits for `work` up to this budget.
   *
   * Must never cancel, reject, or otherwise disturb `work` when the budget expires: the Harness
   * still owns that promise and will settle the operation when it eventually resolves.
   */
  race<T>(work: Promise<T>): Promise<InlineWaitResult<T>>;
}

/** A sentinel that cannot collide with a caller's value. */
const YIELDED = Symbol("inline-wait-yielded");

async function ticks(count: number): Promise<typeof YIELDED> {
  for (let i = 0; i < count; i++) await Promise.resolve();
  return YIELDED;
}

/**
 * The default budget, measured in microtask turns rather than milliseconds.
 *
 * A wall-clock budget would make "did this Effect complete inline?" depend on how loaded the
 * machine is, which is exactly the kind of behaviour a conformance suite must not have. Counting
 * microtasks instead means work that is already resolved deterministically wins the race, and work
 * waiting on an external signal deterministically loses it. Sixteen turns is generous for an
 * executor that awaits a few internal promises and far too short for anything else.
 */
export function microtaskInlineWaitBudget(microtasks = 16): InlineWaitBudget {
  return {
    async race<T>(work: Promise<T>): Promise<InlineWaitResult<T>> {
      const outcome = await Promise.race([work, ticks(microtasks)]);
      return outcome === YIELDED ? { settled: false } : { settled: true, value: outcome as T };
    },
  };
}
