/**
 * The disposition of one Activation's whole Event batch (K1.4 design 03 §4, addendum D03-CHK-02,
 * owner choice 04).
 *
 * The ledger is the only source of `ingress_result` entries, and every Outcome the Driver submits
 * takes it. Each Event of the reserved batch that carries input ends with exactly one entry. A
 * creation Event whose initial input is `null` carries nothing to forward or discard and has none,
 * as before:
 *
 * ```text
 * forwarded   the native receipt's status (delivered, duplicate, rejected, ... )
 * rejected    SDK validation or a destination outside the lineage
 * ignored     nothing to forward: not application input, or a Kernel timeout
 * unknown     forward threw before its receipt (forward_failed): the native delivery may or may
 *             not have committed; or an Event a refused Outcome left attempted (already_attempted)
 * discarded   never attempted, because a terminal decision ended the exchange first
 * ```
 *
 * Every field is bounded (a batch has at most the host's dispatch bound of Events; reasons are at
 * most 64 characters and details at most 1,024, or omitted and marked), so the entry list encodes far
 * below the core limits. If it still cannot be encoded, the Driver acknowledges nothing.
 */

import { EMISSION_KINDS, INPUT_KINDS, encode, readStartPayload } from "./codec.ts";
import type { IngressResult } from "./codec.ts";

/** The parts of a Kernel Activation Event the ledger reads. */
export interface LedgerEvent {
  readonly eventId: string;
  readonly kind: string;
  readonly payload?: unknown;
}

export const INGRESS_STATUS = {
  ignored: "ignored",
  unknown: "unknown",
  discarded: "discarded",
} as const;

export const INGRESS_REASONS = {
  forwardFailed: "forward_failed",
  alreadyAttempted: "already_attempted",
  kernelTimeout: "kernel_timeout",
} as const;

const MAX_REASON = 64;
const MAX_DETAIL = 1_024;

/** Thrown when a non-terminal Outcome would leave an Event of its batch unaccounted. */
export class LedgerIncompleteError extends Error {
  constructor(eventId: string) {
    super(`the batch Event ${eventId} has no disposition, so the Outcome cannot acknowledge it`);
    this.name = "LedgerIncompleteError";
  }
}

type Slot =
  | { readonly state: "none" }
  | { readonly state: "unattempted" }
  | { readonly state: "attempting" }
  | { readonly state: "done"; readonly result: IngressResult };

const bounded = (result: IngressResult): IngressResult => {
  let omitted = false;
  const out: { -readonly [K in keyof IngressResult]: IngressResult[K] } & { detailsOmitted?: true } = {
    eventId: result.eventId, kind: result.kind, status: result.status,
  };
  if (result.reason !== undefined) {
    if (result.reason.length <= MAX_REASON) out.reason = result.reason;
    else omitted = true;
  }
  if (result.detail !== undefined) {
    if (result.detail.length <= MAX_DETAIL) out.detail = result.detail;
    else omitted = true;
  }
  if (out.status.length > MAX_REASON) {
    out.status = out.status.slice(0, MAX_REASON);
    omitted = true;
  }
  if (omitted) out.detailsOmitted = true;
  return out;
};

/** A creation Event whose initial input is `null`. A malformed start payload is not empty: it is rejected. */
const carriesNoInput = (event: LedgerEvent): boolean => {
  if (event.kind !== INPUT_KINDS.start) return false;
  try {
    return readStartPayload(event.payload as never) === null;
  } catch {
    return false;
  }
};

export class BatchLedger {
  readonly events: readonly LedgerEvent[];
  private readonly slots: Slot[];

  constructor(events: readonly LedgerEvent[]) {
    this.events = events;
    this.slots = events.map((event): Slot => (carriesNoInput(event) ? { state: "none" } : { state: "unattempted" }));
  }

  /** Whether any Event of the batch will have an entry, that is, whether the batch has an Emission. */
  hasEntries(): boolean {
    return this.slots.some(slot => slot.state !== "none");
  }

  /** Whether the Event at `index` carries nothing to account for. */
  isEmpty(index: number): boolean {
    return this.slots[index]!.state === "none";
  }

  /** The Event at `index` is about to be forwarded natively. */
  attempting(index: number): void {
    this.slots[index] = { state: "attempting" };
  }

  /** Records the Event's one disposition. */
  record(index: number, result: Omit<IngressResult, "eventId" | "kind">): void {
    const event = this.events[index]!;
    this.slots[index] = { state: "done", result: bounded({ eventId: event.eventId, kind: event.kind, ...result }) };
  }

  /** The Event's forward threw before its receipt: its native delivery is unknown (owner choice 04). */
  unknown(index: number, reason: string, detail?: string): void {
    this.record(index, { status: INGRESS_STATUS.unknown, reason, ...(detail !== undefined ? { detail } : {}) });
  }

  /**
   * Every entry, in batch order. With `terminal`, an Event never attempted is `discarded` and one
   * still being forwarded is `unknown`. Without it, every Event must already have its disposition.
   */
  close(terminal: boolean): IngressResult[] {
    return this.slots.flatMap((slot, index): IngressResult[] => {
      if (slot.state === "none") return [];
      if (slot.state === "done") return [slot.result];
      const event = this.events[index]!;
      if (!terminal) throw new LedgerIncompleteError(event.eventId);
      return [slot.state === "attempting"
        ? bounded({ eventId: event.eventId, kind: event.kind, status: INGRESS_STATUS.unknown, reason: INGRESS_REASONS.forwardFailed })
        : { eventId: event.eventId, kind: event.kind, status: INGRESS_STATUS.discarded }];
    });
  }

  /** The `ingress_result` Emission value's canonical bytes; throws when it cannot be encoded. */
  encode(results: readonly IngressResult[]): Uint8Array {
    return encode({ kind: EMISSION_KINDS.ingress, results: results as unknown[] }, "ingress result");
  }
}
