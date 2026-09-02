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
  /** One piece of controller-local asynchronous work. Never an Effect and never an Event. */
  resumption: "res",
  /** One Execution's effective operation authority record. An address, never a bearer token. */
  operationAuthority: "oau",
  /** One peer message. The identity a reply names; integrity data, never a capability. */
  message: "msg",
  /** One open user-input request. Correlation/integrity data, never a bearer credential. */
  userInputRequest: "uir",
  /** One exact-payload mechanical-confirmation request. Not an authority token. */
  confirmationRequest: "cnf",
  /** One runtime-owned Structured Memory view. An address, never an authorization credential. */
  structuredMemoryView: "smv",
} as const;
