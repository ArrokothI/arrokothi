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
 * `B-4`: an Event not in the current batch "remains queued with its own independent disposition",
 * and `B-5` gives every still-unacknowledged Event an explicit record when the Execution ends rather
 * than deleting it or treating it as processed. Acknowledgment is the third disposition and arrives
 * with Outcome acceptance in K1.2; it is absent here because nothing in this packet can produce it.
 */
export type MailboxDisposition =
  | { readonly kind: "queued" }
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
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
  /** The exact reserved batch, in acceptance order. Reservation acknowledged none of it. */
  readonly batch: readonly string[];
  readonly receipt: Receipt;
  readonly deliveries: readonly DeliveryAttemptView[];
  /**
   * Whether accepted cancellation has fenced this exchange.
   *
   * A fenced exchange can no longer be redelivered and no Outcome may be accepted for it. Its
   * reserved batch keeps its terminal dispositions; it is never retroactively acknowledged.
   */
  readonly fenced: boolean;
}

/** Everything an authorized observer can learn about one Execution. */
export interface ExecutionView {
  readonly executionId: string;
  readonly state: ExecutionState;
  /** The authority scope bound at creation. Only a caller holding it can see this Execution. */
  readonly scope: string;
  /** The caller-scoped creation key that identifies the create request. */
  readonly creationKey: string;
  readonly definitionRevision: string;
  readonly runtimeContractRevision: string;
  /** The codec that can interpret accepted progress. Pinned at creation, never inferred. */
  readonly progressCodec: string;
  /** Runtime-owned continuation. Always `null` here: only Outcome acceptance installs it (K1.2). */
  readonly acceptedProgress: BoundaryValue | null;
  readonly progressRevision: number;
  readonly authorityContext: BoundaryValue;
  readonly activation: ActivationView | null;
  readonly mailbox: readonly MailboxEntryView[];
  /** Event IDs still unacknowledged and not terminally disposed, in acceptance order. */
  readonly queued: readonly string[];
  /** Event IDs the Runtime is on record as having accounted for. Always empty here (K1.2 owns it). */
  readonly acknowledged: readonly string[];
  /** Event IDs that received a `B-5` terminal disposition. */
  readonly terminalDispositions: readonly string[];
  /** Recorded refusals concerning this Execution, oldest first. */
  readonly refusals: readonly RefusalRecord[];
  /** Every receipt this Execution's accepted boundaries have minted, oldest first. */
  readonly receipts: readonly Receipt[];
}
