/**
 * Id and time generation are injected so that traces and tests are reproducible.
 *
 * Core never calls `Math.random()` or `Date.now()` directly - a runtime is constructed with a
 * `Clock` and an `IdGenerator`, and the deterministic implementations here are what make an entire
 * session replayable in a test.
 */

export interface IdGenerator {
  next(prefix: string): string;
}

export interface Clock {
  now(): Date;
}

/** Monotonic counter per prefix: `evt_1`, `evt_2`, `act_1`. Used by tests and benchmarks. */
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

/** Random-ish ids for real deployments. */
export function createRandomIds(): IdGenerator {
  return {
    next(prefix) {
      const rand = Math.random().toString(36).slice(2, 10);
      return `${prefix}_${Date.now().toString(36)}${rand}`;
    },
  };
}

export function createSystemClock(): Clock {
  return { now: () => new Date() };
}

/** Advances by a fixed step on each read, so event timestamps are ordered but deterministic. */
export function createFixedClock(startIso = "2026-01-01T00:00:00.000Z", stepMs = 1000): Clock {
  let t = new Date(startIso).getTime();
  return {
    now() {
      const d = new Date(t);
      t += stepMs;
      return d;
    },
  };
}
