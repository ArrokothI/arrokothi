/**
 * The mutable records of accepted state (COORD-REFACTOR-01): the state module.
 *
 * Only the state owner (`state.ts`) may import this module, and it is the only module that builds or
 * changes these records. The coordinator sees them only through the owner's read-only readers, and a
 * plan (`plan.ts`) cannot name them. Every field is declared required and installed by one literal in the
 * owner, so a read of a declared member is a read of an own field (correction DEC-8).
 */

import type { Activation, SubmissionGrant } from "./driver.ts";
import type { CreationRequestId, InputId, Receipt } from "./identity.ts";
import type { CancellationView, EmissionView, LosingOutcomeView, MailboxDisposition, RecoveryHistoryRecord, TerminalResultView } from "./inspection.ts";
import type { ExecutionState } from "./lifecycle.ts";
import type { AcceptedOutcome, LiveWait, Readiness, RetiredWait, StoredHold, TimerFireRecord } from "./plan.ts";
import type { RefusalRecord } from "./refusal.ts";
import type { BoundaryValue, CanonicalValue } from "./value-types.ts";
import type { SourceCategory } from "./waits.ts";

/**
 * One accepted Event: application input, or a Kernel timeout (K1.3).
 *
 * One shape for both, every field required: a field one category has no value for is `null`. Input
 * owns its Input ID, content identity, payload and receipt; a timeout owns its wait generation and
 * deadline, and its payload is the canonical `null`.
 */
export interface MailboxEntry {
  readonly eventId: string;
  /** The trusted path that accepted or minted it; written once, never inferred from content. */
  readonly sourceCategory: SourceCategory;
  readonly inputId: InputId | null;
  readonly destination: string;
  /** The injective packing of this input's content parts; equal identity means equal content. `""` for a timeout. */
  readonly contentIdentity: string;
  readonly kind: string;
  /** The accepted payload; `null` is a timeout's canonical `null` payload. */
  readonly payload: CanonicalValue | null;
  readonly subscriptionClass: string | null;
  readonly waitGeneration: number | null;
  readonly deadline: number | null;
  readonly acceptancePosition: number;
  /** The receipt of the boundary that accepted it; `null` for a timeout, which mints none. */
  readonly receipt: Receipt | null;
  disposition: MailboxDisposition;
}

export interface DeliveryAttempt {
  readonly attempt: number;
  status: "pending" | "delivered" | "failed";
  failure: string | null;
  /**
   * K1.2-DEC-16: what this delivery carried and to whom, fixed when it was sent.
   *
   * Ordinary redelivery preserves both; a takeover preserves the Activation ID and advances the
   * epoch. Each row therefore identifies its exact Activation attempt, so inspection can attribute
   * every retained delivery across takeovers without assuming the exchange's current epoch.
   */
  readonly activationId: string;
  readonly writerEpoch: number;
}

/** The unresolved exchange: its current attempt, its pinned batch, its delivery log and its holds. */
export interface ActivationRecord {
  /** The current attempt's Activation. A takeover replaces it with the same exchange at the next epoch. */
  activation: Activation;
  /** The current attempt's dispatch-intent receipt. */
  receipt: Receipt;
  /**
   * The current attempt's submission grant (K1.2-DEC-20). Minted per writer epoch, handed to the
   * Driver with the Activation, and required back on `submitOutcome`. Redelivery preserves the
   * attempt and therefore its grant; a takeover mints a fresh one and retires this. Compared by
   * reference identity, never by fields, and never exposed through inspection.
   */
  submission: SubmissionGrant;
  readonly batch: readonly string[];
  /** Shared with the resolved-exchange record, so a late report still finds its original attempt. */
  readonly deliveries: DeliveryAttempt[];
  codeHold: StoredHold | null;
  protocolFailureHold: StoredHold | null;
}

/** An exchange an accepted Outcome resolved. */
export interface ResolvedExchange {
  readonly activationId: string;
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
  readonly batch: readonly string[];
  readonly dispatchReceipt: Receipt;
  readonly outcomeReceipt: Receipt;
  readonly deliveries: DeliveryAttempt[];
}

/** The accepted cancellation, with the ended exchange's delivery log shared so late reports settle there. */
export interface CancellationRecord {
  readonly facts: CancellationView;
  readonly deliveries: DeliveryAttempt[] | null;
}

export interface ExecutionRecord {
  readonly executionId: string;
  readonly scope: string;
  readonly creationRequestId: CreationRequestId;
  readonly definitionRevision: string;
  readonly runtimeContractRevision: string;
  readonly progressCodec: string;
  readonly authorityContext: CanonicalValue;
  /** The injective packing of the complete creation content this key is bound to. */
  readonly creationIdentity: string;
  /** The Execution deadline set at creation (K1.3), or `null`. Immutable. */
  readonly executionDeadline: number | null;
  readonly creationReceipt: Receipt;
  /** The Event the initial input was accepted as. Retained so a creation replay can name it. */
  readonly initialEventId: string;
  readonly mailbox: MailboxEntry[];
  /**
   * Post-creation ingress entries by Input ID, for replay/conflict lookup.
   *
   * The initial creation Event is deliberately absent: it was accepted by the creation boundary,
   * not by ingress, and indexing it here would let creation consume a producer-constructible
   * ingress identity (K11-R15-ID-01).
   */
  readonly byInputId: Map<string, MailboxEntry>;
  readonly refusals: RefusalRecord[];
  readonly receipts: Receipt[];
  state: ExecutionState;
  acceptedProgress: BoundaryValue | null;
  progressRevision: number;
  activation: ActivationRecord | null;
  /** Accepted Outcomes by Activation ID: at most one per exchange, and the replay/conflict index. */
  readonly acceptedOutcomes: Map<string, AcceptedOutcome>;
  readonly exchanges: ResolvedExchange[];
  readonly emissions: EmissionView[];
  result: TerminalResultView | null;
  /**
   * This Execution's own acceptance index. Creation consumes 1; each later accepted
   * input-ingress, dispatch-intent (including a takeover's) or Outcome-acceptance decision on
   * this Execution consumes the next. Replay and redelivery consume none: they return an
   * already-accepted decision. A recovery hold is not an acceptance and consumes none either.
   * Because the index advances only for decisions on this Execution, gaps in it reveal
   * only this Execution's own history — never activity elsewhere.
   */
  nextAcceptancePosition: number;
  /**
   * This Execution's own refusal index, sharing nothing with the acceptance index above.
   * The first recorded refusal against this Execution is 1. Refusals that name no
   * Execution never touch it (they carry position 0), so probing for hidden versus
   * missing records advances no observable sequence at all.
   */
  nextRefusalPosition: number;
  activationsMinted: number;
  /**
   * Accepted recovery/control decisions, oldest first (K1.2-DEC-18).
   *
   * `state.md` names recovery decisions as Execution History; `evidence.md` requires authenticated
   * recorded commands. Each accepted decision that enters, updates, or ends a hold appends one frozen
   * record here, on the owning Execution, so it survives the hold changing or disappearing, the
   * exchange resolving, and the Execution ending. Idempotent duplicates append nothing.
   */
  readonly recoveryHistory: RecoveryHistoryRecord[];
  /** Accepted `await` registrations so far; the next one creates generation `registrations + 1`. */
  registrations: number;
  /** The live wait generation, exactly while `WAITING`. */
  wait: LiveWait | null;
  /** Wait-ended readiness, from a retirement until the next reservation or a terminal decision. */
  readiness: Readiness | null;
  /** Retired generations in generation order: a generation retires once, before the next exists. */
  readonly retiredWaits: RetiredWait[];
  /** Every host timer fire that named this Execution, oldest first. */
  readonly timerFires: TimerFireRecord[];
  /** The accepted cancellation, once `CANCELLED`. */
  cancellation: CancellationRecord | null;
  /**
   * Outcome proposals that lost to the cancellation, by Activation ID and content identity: the
   * exact-retry index (CX-6) and, in insertion order, the retained losing records.
   */
  readonly losingIndex: Map<string, LosingOutcomeView>;
  /** The number of plans applied to this Execution: the basis a plan names. In no view or answer. */
  version: number;
}
