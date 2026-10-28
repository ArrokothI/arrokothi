/**
 * The Kernel's only source of time: a clock the host injects (K1.3).
 *
 * `mental-model/concepts/operations.md` ("Three clocks") separates accepted time, which decides
 * deadlines, from wall-clock reads anywhere else. This binding has no ambient time at all: nothing in
 * the zone reads `Date`, `performance`, a timer or the process (`ambient-time.test.ts`). The host
 * supplies a `KernelClock`, and the Kernel calls it at exactly two points: when an accepted `await`
 * registers a wait with a deadline, and when the host fires a timer (`ExecutionCoordinator.fireTimer`).
 *
 * A reading is a safe integer of at least 0 on a scale the host chooses (milliseconds recommended).
 * Nothing assumes monotonicity: a reading that goes back only delays an expiry, because a deadline is
 * due when `now >= deadline` and nothing is decided at any other time. A clock that throws, or answers
 * anything but such an integer, gives an unusable reading. The decision that needed it refuses as
 * `clock_unavailable`, or records a `clock_unavailable` timer fire; there is no fallback to ambient time.
 */

import { hostMember } from "./envelope.ts";

const PrimordialNumberIsSafeInteger = Number.isSafeInteger;
const PrimordialObjectFreeze = Object.freeze;
const PrimordialReflectApply = Reflect.apply;

/** The host's clock: a trusted host object like the Driver. */
export interface KernelClock {
  /** The current accepted-time reading: a safe integer of at least 0, on the host's scale. */
  now(): number;
}

/**
 * The Kernel's view of a host clock it holds: `now` may be missing, which is an unusable reading.
 *
 * `KernelClock` is the contract the host implements. The Kernel re-checks it at every reading rather
 * than trusting the shape it saw at construction, so `now` is optional here.
 */
export interface ClockHolder {
  readonly now?: unknown;
}

/** One reading: usable with its value, or unusable. */
export type ClockReading = { readonly usable: true; readonly now: number } | { readonly usable: false; readonly now: null };

const UNUSABLE: ClockReading = PrimordialObjectFreeze({ usable: false as const, now: null });

/**
 * Reads the clock once.
 *
 * `now` is resolved on the clock's own chain through `hostMember`, never on a built-in prototype, and
 * called with the load-time `Reflect.apply`, so ambient state cannot supply or replace it. The call is
 * trusted host code and may reenter the coordinator; every caller reads it before it reads the basis
 * of the plan it forms. An absent clock is an unusable reading.
 */
export function readClock(clock: ClockHolder | null): ClockReading {
  if (clock === null) return UNUSABLE;
  try {
    const now = hostMember(clock, "now");
    if (typeof now !== "function") return UNUSABLE;
    const reading: unknown = PrimordialReflectApply(now, clock, []);
    if (typeof reading !== "number" || !PrimordialNumberIsSafeInteger(reading) || reading < 0) return UNUSABLE;
    return PrimordialObjectFreeze({ usable: true as const, now: reading });
  } catch {
    return UNUSABLE;
  }
}

/** Whether a host object can serve as a clock: its own chain supplies a callable `now`. */
export function isClock(candidate: ClockHolder): boolean {
  return typeof hostMember(candidate, "now") === "function";
}
