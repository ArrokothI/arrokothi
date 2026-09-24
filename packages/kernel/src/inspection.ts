/**
 * What an authorized observer can read, and what reading does not do.
 *
 * `core.md`: "Reservation and mailbox reads acknowledge nothing." Every view here is a fresh
 * snapshot built at the moment of the call: holding one cannot mutate the Execution, and reading one
 * never records that a Runtime accounted for anything.
 *
 * The views are deliberately complete rather than convenient. A caller that can only see the
 * headline lifecycle state cannot tell a reserved-but-unacknowledged Event from an acknowledged one,
 * and that distinction is the whole of `B-3`.
 */

import type { InputId, Receipt } from "./identity.ts";
import type { ExecutionState } from "./lifecycle.ts";
import type { RefusalRecord } from "./refusal.ts";
import type { BoundaryValue } from "./values.ts";

/**
 * A mailbox entry's own disposition.
 *
 * `B-4`: an Event not in the current batch "remains queued with its own independent disposition".
 * `core.md` allows exactly two final dispositions besides that waiting one. **Acknowledgment**
 * records that an accepted Outcome accounted for the Event; it names the Activation whose accepted
 * Outcome acknowledged its whole batch (`B-3`). A **terminal disposition** records that the Execution
 * ended before anything processed the Event (`B-5`); K1.2 records it when an accepted `complete` or
 * `fail` ends the Execution, and K1.3 reuses the same shape for cancellation and Execution-deadline
 * expiry. A terminal disposition is never an acknowledgment: one says the Runtime accounted for the
 * Event, the other that nobody ever will.
 *
 * Each entry holds its own frozen disposition (K1.2-DEC-11), so recording one never touches another.
 */
export type MailboxDisposition =
  | { readonly kind: "queued" }
  | { readonly kind: "acknowledged"; readonly activationId: string }
  | { readonly kind: "terminal"; readonly reason: string };

/** One accepted Event in an Execution's mailbox. */
export interface MailboxEntryView {
  readonly eventId: string;
  /** The triple that identifies this input. Two producers' identical key text are different entries. */
  readonly inputId: InputId;
  readonly kind: string;
  readonly payload: BoundaryValue;
  readonly subscriptionClass: string | null;
  readonly sourceCategory: "application_input";
  /** Per-Execution acceptance position; the order a batch is selected and presented in. */
  readonly acceptancePosition: number;
  readonly disposition: MailboxDisposition;
  /** Whether this entry is pinned in the current unresolved Activation's batch. Not acknowledgment. */
  readonly reserved: boolean;
  /** The receipt of the boundary that accepted it: creation for the initial input, ingress after. */
  readonly receipt: Receipt;
}

/** One attempt to hand an Activation to the Driver. Operational traffic, not accepted state. */
export interface DeliveryAttemptView {
  readonly attempt: number;
  readonly status: "pending" | "delivered" | "failed";
  readonly failure: string | null;
}

/** The unresolved exchange, if there is one. */
export interface ActivationView {
  readonly activationId: string;
  /** The current attempt's epoch. Advanced only by an accepted takeover of this exchange. */
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
  /** The exact reserved batch, in acceptance order. Reservation acknowledged none of it. */
  readonly batch: readonly string[];
  /** The dispatch-intent receipt for the current attempt: the original dispatch, or the latest takeover. */
  readonly receipt: Receipt;
  /** Every delivery attempt of this exchange, across all of its Runtime attempts, oldest first. */
  readonly deliveries: readonly DeliveryAttemptView[];
}

/**
 * One exchange that an accepted Outcome resolved.
 *
 * Retained so a late Outcome for it can be answered from its record, and so a late delivery report
 * has an original record to settle: `execution-cycle.md` lets such a report update only that record,
 * never the current exchange or logical state.
 */
export interface ExchangeView {
  readonly activationId: string;
  /** The epoch whose Outcome was accepted. */
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
  /** The batch the accepted Outcome acknowledged, whole. */
  readonly batch: readonly string[];
  /** The last dispatch-intent receipt of the exchange. */
  readonly dispatchReceipt: Receipt;
  readonly outcomeReceipt: Receipt;
  readonly deliveries: readonly DeliveryAttemptView[];
}

/**
 * Why the unresolved exchange cannot safely continue (`state.md`: recovery-held).
 *
 * The lifecycle state stays `RUNNING`: the Activation is unresolved, nobody declared a wait, and the
 * native work may still be alive. `pinned_code_unavailable` comes from a recovery request whose
 * declaration lacked a pinned Definition revision, Runtime contract revision or progress codec;
 * `protocol_failure` from a report that the current attempt's response could not be classified
 * (OA-6). At most one hold of each cause exists at a time.
 */
export interface RecoveryHoldView {
  readonly cause: "pinned_code_unavailable" | "protocol_failure";
  readonly reason: string;
  readonly activationId: string;
  /** The epoch that was current when the hold was recorded. */
  readonly writerEpoch: number;
}

/**
 * One accepted Emission: nonterminal output an accepted Outcome carried.
 *
 * Its ID derives from its Execution, Activation and Emission key (K1.2-DEC-4), so a replayed Outcome
 * cannot mint another. The retained record is what discharges its output obligation; reads, replay
 * and cursors over it are K4.4's.
 */
export interface EmissionView {
  readonly emissionId: string;
  /** The Runtime's local name for it within its Outcome. */
  readonly emissionKey: string;
  readonly activationId: string;
  readonly value: BoundaryValue;
  /** The Outcome-acceptance receipt of the decision that accepted it. */
  readonly receipt: Receipt;
}

/** The typed terminal result recorded by an accepted `complete`, or the error by an accepted `fail`. */
export interface TerminalResultView {
  readonly resultId: string;
  readonly kind: "completed" | "failed";
  /** The `complete` result or the `fail` error, as captured. */
  readonly value: BoundaryValue;
  readonly activationId: string;
  readonly receipt: Receipt;
}

/** Everything an authorized observer can learn about one Execution. */
export interface ExecutionView {
  readonly executionId: string;
  readonly state: ExecutionState;
  /** The authority scope bound at creation. Only a caller holding it can see this Execution. */
  readonly scope: string;
  /** The caller-chosen creation-key text. */
  readonly creationKey: string;
  readonly definitionRevision: string;
  readonly runtimeContractRevision: string;
  /** The codec that can interpret accepted progress. Pinned at creation, never inferred. */
  readonly progressCodec: string;
  /**
   * Runtime-owned continuation, exactly as the last accepted Outcome proposed it; `null` before any.
   * The Kernel stores it and hands it back unchanged, and never reads it to decide anything.
   */
  readonly acceptedProgress: BoundaryValue | null;
  /** The accepted progress revision: 0 at creation, one more for each accepted Outcome. */
  readonly progressRevision: number;
  readonly authorityContext: BoundaryValue;
  readonly activation: ActivationView | null;
  /** Recovery holds on the unresolved exchange; empty when it can continue or when none is unresolved. */
  readonly recoveryHolds: readonly RecoveryHoldView[];
  /** Exchanges that accepted Outcomes resolved, oldest first. */
  readonly exchanges: readonly ExchangeView[];
  /** Accepted Emissions, in the order their Outcomes were accepted and, within one, as proposed. */
  readonly emissions: readonly EmissionView[];
  /** The terminal result or error, once an accepted `complete` or `fail` has ended the Execution. */
  readonly result: TerminalResultView | null;
  readonly mailbox: readonly MailboxEntryView[];
  /** Event IDs still unacknowledged and not terminally disposed, in acceptance order. */
  readonly queued: readonly string[];
  /** Event IDs an accepted Outcome acknowledged, in acceptance order. */
  readonly acknowledged: readonly string[];
  /** Event IDs that received a `B-5` terminal disposition, in acceptance order. */
  readonly terminalDispositions: readonly string[];
  /** Recorded refusals concerning this Execution, oldest first. */
  readonly refusals: readonly RefusalRecord[];
  /** Every receipt this Execution's accepted boundaries have minted, oldest first. */
  readonly receipts: readonly Receipt[];
}
