/**
 * Reference inline wait budgets.
 *
 * Two alternatives to the deterministic default in `ports/inline-wait.ts`: never wait at all, and
 * wait by wall clock. The first exists so a conformance run can force an Effect that *could* have
 * settled inline onto the slow path and prove the semantics are unchanged. The second is what a
 * deployment actually wants.
 *
 * Neither ever disturbs the work it is racing. When the budget expires the promise keeps running and
 * the Harness settles the operation when it eventually resolves - the Activation stopped waiting,
 * the operation did not stop being valid.
 */

import type { InlineWaitBudget, InlineWaitResult } from "../ports/inline-wait.ts";

/** A sentinel that cannot collide with a caller's value. */
const YIELDED = Symbol("inline-wait-yielded");

/**
 * Never waits inline.
 *
 * Every Effect takes the slow path, which is how a test proves that an operation which *could* have
 * completed inline produces exactly the same semantics when it does not.
 */
export function createNoInlineWaitBudget(): InlineWaitBudget {
  return {
    async race<T>(_work: Promise<T>): Promise<InlineWaitResult<T>> {
      return { settled: false };
    },
  };
}

/**
 * Wall-clock budget, for deployments rather than conformance runs.
 *
 * The timer is unrefed where the runtime supports it so a pending inline wait cannot hold a process
 * open past its work.
 */
export function createTimeoutInlineBudget(milliseconds: number): InlineWaitBudget {
  return {
    async race<T>(work: Promise<T>): Promise<InlineWaitResult<T>> {
      let timer: unknown;
      const expiry = new Promise<typeof YIELDED>((resolve) => {
        timer = setTimeout(() => resolve(YIELDED), milliseconds);
        (timer as { unref?: () => void }).unref?.();
      });
      try {
        const outcome = await Promise.race([work, expiry]);
        return outcome === YIELDED ? { settled: false } : { settled: true, value: outcome as T };
      } finally {
        clearTimeout(timer as ReturnType<typeof setTimeout>);
      }
    },
  };
}
