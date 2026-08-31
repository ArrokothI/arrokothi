/**
 * Identity as an injected port.
 *
 * The kernel never calls `Math.random()` or `crypto` directly. Ids are generated through this port
 * so a conformance run produces the same `exe_1`, `act_1`, `evt_1` sequence every time, and so a
 * deployment can substitute collision-resistant ids without touching kernel semantics.
 */
export interface IdGenerator {
  next(prefix: string): string;
}

export const ID_PREFIXES = {
  execution: "exe",
  activation: "act",
  mailbox: "mbx",
  event: "evt",
  emission: "emi",
  claim: "clm",
} as const;
