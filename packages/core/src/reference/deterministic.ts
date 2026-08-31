/**
 * Deterministic Clock and IdGenerator.
 *
 * Reference implementations of kernel ports, not the semantics themselves. Every conformance case
 * runs on these so a whole Execution lifetime - creation, Activations, waiting, an Event arriving,
 * completion - replays identically without sleeps, randomness, or wall-clock dependence.
 */

import type { Clock } from "../ports/clock.ts";
import type { IdGenerator } from "../ports/ids.ts";

/** Monotonic counter per prefix: `exe_1`, `act_1`, `evt_1`. */
export function createDeterministicIds(seed = 0): IdGenerator {
  const counters = new Map<string, number>();
  return {
    next(prefix) {
      const n = (counters.get(prefix) ?? seed) + 1;
      counters.set(prefix, n);
      return `${prefix}_${n}`;
    },
  };
}

/** Advances a fixed step on each read, so timestamps are ordered but reproducible. */
export function createFixedClock(startIso = "2026-01-01T00:00:00.000Z", stepMs = 1000): Clock {
  let t = new Date(startIso).getTime();
  return {
    now() {
      const at = new Date(t);
      t += stepMs;
      return at;
    },
  };
}

export function createSystemClock(): Clock {
  return { now: () => new Date() };
}
