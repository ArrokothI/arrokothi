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
import type { AcceptedWait } from "./waits.ts";

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

/**
 * One accepted Event in an Execution's mailbox: application input, or a Kernel timeout (K1.3).
 *
 * The two members share their field names, so a reader can list a mailbox without narrowing; a field
 * one category has no value for is `null`. `sourceCategory` is the trusted path that accepted or minted
 * the Event, and the only thing wait eligibility branches on first.
 */
export type MailboxEntryView = InputMailboxEntryView | TimeoutMailboxEntryView;

/** One accepted application-input Event. */
export interface InputMailboxEntryView {
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

/**
 * One Kernel timeout Event: the one Event a wait generation's expiry mints (W-9).
 *
 * Its kind is `kernel.wait.timeout` and its payload the canonical `null`. It has no Input ID, no
 * subscription class and no receipt: timeout acceptance is Kernel-internal and mints none (`identity.md`
 * names six receipt boundaries). It is acknowledged, ordered and disposed like any other Event.
 */
export interface TimeoutMailboxEntryView {
  readonly eventId: string;
  readonly inputId: null;
  readonly kind: string;
  readonly payload: null;
  readonly subscriptionClass: null;
  readonly sourceCategory: "kernel_timeout";
  /** The generation whose expiry minted it. */
  readonly waitGeneration: number;
  /** That generation's deadline, on the injected clock's scale. */
  readonly deadline: number;
  readonly acceptancePosition: number;
  readonly disposition: MailboxDisposition;
  readonly reserved: boolean;
  readonly receipt: null;
}

/** The live wait generation (`WAITING` only). */
export interface WaitView {
  readonly generation: number;
  /** The Activation whose accepted Outcome registered it. */
  readonly registeredBy: string;
  /** The accepted declaration: the selector the generation is judged by. Frozen. */
  readonly declaration: AcceptedWait;
  readonly deadline: number | null;
}

/** A retired generation and how it ended. Each generation retires exactly once. */
export interface RetiredWaitView {
  readonly generation: number;
  readonly registeredBy: string;
  readonly declaration: AcceptedWait;
  readonly deadline: number | null;
  /** An eligible Event, its deadline, or the Execution's cancellation. */
  readonly retiredBy: "event" | "deadline" | "cancellation";
  /** The eligible Event or the timeout Event that ended it; `null` for cancellation. */
  readonly endingEventId: string | null;
}

/** Wait-ended readiness, waiting for the next reservation (`core.md` § Readiness). */
export interface ReadinessView {
  readonly species: "event" | "deadline";
  /** The retired generation whose selector the next reservation evaluates. */
  readonly generation: number;
  /** The mandatory timeout Event for deadline readiness; `null` for an Event wake. */
  readonly timeoutEventId: string | null;
}

/** What one host timer fire resolved to. */
export type TimerFireResult = "expired" | "cancelled" | "duplicate" | "stale" | "not_due" | "clock_unavailable";

/**
 * One host timer fire, retained as operational evidence (K1.3).
 *
 * A fire is a hint the Kernel resolves against its own clock and state. Only `expired` (a wait
 * generation) and `cancelled` (the Execution deadline) came with a logical change. Every other result
 * changed no lifecycle state, mailbox entry, wait, readiness, progress or acceptance position.
 */
export interface TimerFireView {
  readonly timer: "wait_deadline" | "execution_deadline";
  /** The wait generation the key named; `null` for the Execution deadline. */
  readonly generation: number | null;
  /** The clock reading the fire was resolved against; `null` when it was unusable. */
  readonly observedAt: number | null;
  readonly result: TimerFireResult;
  readonly reason: string;
  /** The timeout Event an expiry minted, or the one a duplicate fire refers to; otherwise `null`. */
  readonly timeoutEventId: string | null;
}

/** One attempt to hand an Activation to the Driver. Operational traffic, not accepted state. */
export interface DeliveryAttemptView {
  readonly attempt: number;
  readonly status: "pending" | "delivered" | "failed";
  readonly failure: string | null;
  /**
   * K1.2-DEC-16: exact attribution to the Activation attempt/dispatch intent it delivered.
   *
   * `identity.md#dispatch-and-delivery`: always say what was delivered and to whom. Ordinary
   * redelivery keeps the same Activation ID and writer epoch; an authorized takeover keeps the
   * Activation ID and advances the epoch. Each retained row therefore names the Activation ID and
   * writer epoch it carried when it was sent, so a schedule with redeliveries before and after a
   * takeover (attempts 1,2 at epoch 1, then 3,4 at epoch 2) remains reconstructible after the
   * exchange's current epoch has moved on. A late report still settles only its own row.
   */
  readonly activationId: string;
  readonly writerEpoch: number;
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
 *
 * K1.2-DEC-17: each standing hold exposes its permitted next actions, computed from the same rules
 * that refuse the corresponding controls, so an authorized reader can discover the legal transitions
 * without probing with mutating operations. A code hold refuses redelivery and takeover and is
 * cleared by an availability declaration covering every pin; a protocol-failure hold refuses
 * redelivery but permits an authorized takeover; a valid Outcome from the current attempt ends
 * either hold by resolving the exchange. When both holds stand, takeover is not permitted until the
 * code hold clears. The vocabulary (`declare_code_availability`, `request_takeover`,
 * `submit_outcome`) names the existing K1.2 operations, not a universal recovery API.
 */
export interface RecoveryHoldView {
  readonly cause: "pinned_code_unavailable" | "protocol_failure";
  readonly reason: string;
  readonly activationId: string;
  /** The epoch that was current when the hold was recorded. */
  readonly writerEpoch: number;
  /** The mutating operations an authorized reader may use next without being refused for the hold. */
  readonly permittedNextActions: readonly string[];
}

/**
 * One accepted recovery/control decision, retained as Execution History.
 *
 * K1.2-DEC-18: `state.md` names recovery decisions as History, and `evidence.md` requires
 * authenticated recorded commands rather than ad-hoc stored-status edits. Each accepted decision
 * that enters, changes, or ends a hold is retained here, on the owning Execution, after the
 * standing hold changes or disappears — including after the exchange resolves and after the
 * Execution ends. Idempotent duplicates (`changed: false`) append nothing; they replay/reference
 * the existing record. This introduces no seventh receipt boundary: takeover and Outcome decisions
 * keep their existing `dispatch_intent` and `outcome_acceptance` receipts, which this history
 * references by causation (Activation ID and writer epoch) rather than duplicating.
 */
export interface RecoveryHistoryRecord {
  readonly activationId: string;
  /** The writer epoch current when the decision was made (for takeover clears, the superseded epoch). */
  readonly writerEpoch: number;
  readonly cause: "pinned_code_unavailable" | "protocol_failure";
  readonly transition: "entered" | "updated" | "cleared_by_declaration" | "cleared_by_takeover" | "ended_by_outcome";
  /** The hold reason at entry/update, or the clearing/ending explanation. */
  readonly reason: string;
  /**
   * Which authority made this decision valid (K1.2-DEC-18, K12-R3-HISTORY-02).
   *
   * `control` means the caller held control power over the Execution's scope (`controlScopes`,
   * checked by the Kernel): recovery declarations, protocol-failure reports, and takeovers.
   * `attempt_submission` means the accepted Outcome presented the current attempt's submission
   * grant (K1.2-DEC-20): a valid Runtime proposal, which is not by itself general control power.
   * The two are never conflated: a Runtime submitter without `controlScopes` is recorded as
   * `attempt_submission`, never as a control actor.
   */
  readonly authority: "control" | "attempt_submission";
  /** The authenticated actor: the caller's namespace as the host established it. */
  readonly actorNamespace: string;
  /**
   * The Execution's scope, recorded factually for causation and scoping.
   *
   * Control power over it was established only when `authority` is `control`; an
   * `attempt_submission` record asserts no such power.
   */
  readonly actorScope: string;
  /** For `cleared_by_takeover`, the new writer epoch the takeover advanced to. */
  readonly resultingEpoch?: number;
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
  /**
   * Accepted recovery/control decisions, oldest first (K1.2-DEC-18).
   *
   * Immutable, scoped to this Execution, and retained after the hold changes or disappears, after
   * the exchange resolves, and after the Execution ends. Explains entering, updating, and clearing
   * holds through declarations, takeovers, and accepted Outcomes, with the authenticated actor and
   * exchange/epoch causation.
   */
  readonly recoveryHistory: readonly RecoveryHistoryRecord[];
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
  /** The live wait generation, exactly while `WAITING`; otherwise `null`. */
  readonly wait: WaitView | null;
  /** Wait-ended readiness not yet consumed by a reservation; otherwise `null`. */
  readonly waitEndedReadiness: ReadinessView | null;
  /** Retired wait generations, in generation order. */
  readonly retiredWaits: readonly RetiredWaitView[];
  /** Every host timer fire that named this Execution, oldest first. */
  readonly timerFires: readonly TimerFireView[];
}
