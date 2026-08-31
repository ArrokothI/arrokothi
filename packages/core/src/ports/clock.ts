/**
 * Time as an injected port.
 *
 * Every timestamp the kernel writes - creation, transitions, delivery, completion - comes from
 * here, so a whole Execution lifetime can be replayed deterministically in a test without sleeps.
 */
export interface Clock {
  now(): Date;
}

export function nowIso(clock: Clock): string {
  return clock.now().toISOString();
}
