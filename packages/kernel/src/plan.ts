/**
 * The decisions the coordinator applies to accepted state: one closed union of plans (COORD-REFACTOR-01).
 *
 * Every state-changing operation first forms one plan from Kernel data, then hands it to the state owner
 * (`state.ts`), which is the only module that changes an Execution record. A plan is data: frozen, with
 * every member required (absence is `null`), and no function anywhere in it. It carries everything its
 * decision retains (receipts, history records, holds, the new Activation and grant) and, for a public
 * operation, the answer the operation returns. The answer is a fresh container the caller receives, so it
 * is the one member left unfrozen; the owner never reads it and never retains it.
 *
 * Each plan names the Execution it changes and the version of that Execution it was formed against
 * (`basis`). The owner refuses a plan whose Execution has changed since, so a plan cannot be applied to
 * state it was not decided on. The coordinator forms its plans after its last callback (caller accessor,
 * host member or Driver callback) and applies them before the next one.
 *
 * This module cannot name the owner's mutable records (`state-records.ts`): a plan type therefore cannot
 * hold one. It also holds the hold helpers that both the coordinator's answers and the owner's inspection
 * views derive from, so the two cannot drift apart (K1.2-DEC-17).
 */

import type { Activation, SubmissionGrant } from "./driver.ts";
import type { CreationRequestId, InputId, Receipt } from "./identity.ts";
import type {
  EmissionView,
  MailboxDisposition,
  RecoveryHistoryRecord,
  RecoveryHoldView,
  RetiredWaitView,
  TerminalResultView,
  TimerFireResult,
  TimerFireView,
  WaitView,
} from "./inspection.ts";
import type { ExecutionState } from "./lifecycle.ts";
import type { CapturedOutcome } from "./outcome.ts";
import { appendOwn } from "./own-array.ts";
import type { RefusalRecord } from "./refusal.ts";
import type { Ok } from "./result.ts";
import type { BoundaryValue, CanonicalValue } from "./value-types.ts";
import type { AcceptedWait } from "./waits.ts";

const PrimordialObjectFreeze = Object.freeze;

// -- Accepted answers ---------------------------------------------------------

export interface CreationAccepted {
  readonly executionId: string;
  readonly receipt: Receipt;
  /** True when this call returned an already-accepted decision rather than committing a new one. */
  readonly replayed: boolean;
  /** The Event the initial input was accepted as, in the same atomic decision. */
  readonly initialEventId: string;
}

export interface InputAccepted {
  readonly eventId: string;
  readonly receipt: Receipt;
  readonly replayed: boolean;
  readonly acceptancePosition: number;
  readonly disposition: MailboxDisposition;
}

export interface DispatchAccepted {
  readonly activationId: string;
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
  readonly batch: readonly string[];
  readonly receipt: Receipt;
  /** True when this call re-sent an already-accepted dispatch intent rather than accepting a new one. */
  readonly redelivered: boolean;
}

/**
 * What an accepted `await` did with its wait (`waits.md` § Registering a wait).
 *
 * `waiting`: the generation is live and the Execution is `WAITING`. `woken`: an eligible Event was
 * already queued, so the generation retired at registration with Event readiness. `expired`: nothing
 * eligible was queued and the deadline was already due, so the generation retired with its one timeout
 * Event and deadline readiness. Durable `WAITING` is never persisted for an expired deadline.
 */
export interface WaitOutcome {
  /** The generation this registration created; with the Execution ID it names the wait's timer. */
  readonly generation: number;
  readonly result: "waiting" | "woken" | "expired";
  /** The timeout Event minted at registration for `expired`; otherwise `null`. */
  readonly timeoutEventId: string | null;
}

/**
 * The answer to an accepted Outcome, and to every exact replay of it.
 *
 * Everything but `replayed` is the retained decision: a replay returns the same receipt object and
 * the same lists, never a reconstruction (OA-2).
 */
export interface OutcomeAccepted {
  /** The Outcome-acceptance receipt: evidence that this proposal was accepted, and of nothing it asked for. */
  readonly receipt: Receipt;
  /** True when this call returned the already-accepted decision rather than committing a new one. */
  readonly replayed: boolean;
  readonly activationId: string;
  /** The state the accepted Outcome's next step produced, which is not necessarily the current one. */
  readonly nextState: ExecutionState;
  /** The accepted progress revision this Outcome installed. */
  readonly progressRevision: number;
  /** The whole reserved batch, acknowledged by this decision. */
  readonly acknowledged: readonly string[];
  readonly emissionIds: readonly string[];
  /** The terminal result's ID for an accepted `complete` or `fail`; otherwise `null`. */
  readonly resultId: string | null;
  /** Events this decision gave a `B-5` terminal disposition. */
  readonly terminalDispositions: readonly string[];
  /** What an accepted `await` did with its wait; `null` for every other step. */
  readonly wait: WaitOutcome | null;
}

/** An accepted takeover: the same exchange, now answerable only by the new attempt. */
export interface TakeoverAccepted {
  readonly activationId: string;
  /** The epoch that was current and is now fenced. */
  readonly supersededEpoch: number;
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
  /** The same reserved batch; a takeover never re-selects. */
  readonly batch: readonly string[];
  /** The dispatch-intent receipt re-recording the exchange's current attempt (K1.2-DEC-6). */
  readonly receipt: Receipt;
}

/** What a recovery request or a protocol-failure report left in place. */
export interface RecoveryDecision {
  readonly activationId: string;
  readonly writerEpoch: number;
  /** The holds on the exchange after this request; empty when it can continue. */
  readonly recoveryHolds: readonly RecoveryHoldView[];
  /** False when the request found nothing to change. */
  readonly changed: boolean;
}

// -- Holds --------------------------------------------------------------------

/** A stored hold: the reason and causation. Permitted actions are computed at inspection, not stored. */
export interface StoredHold {
  readonly cause: "pinned_code_unavailable" | "protocol_failure";
  readonly reason: string;
  readonly activationId: string;
  readonly writerEpoch: number;
}

/** The two holds an unresolved exchange can carry, as stored or as a planned decision leaves them. */
export interface HoldState {
  readonly codeHold: StoredHold | null;
  readonly protocolFailureHold: StoredHold | null;
}

/**
 * The one `queued` disposition object, frozen and shared.
 *
 * A disposition is retained accepted state that inspection and both ingress answers expose. Every
 * entry accepted in this packet is `queued` and carries no per-entry data, so one immutable value
 * serves them all and no exposed reference can be edited into a different disposition. K1.2 and K1.3
 * record their own dispositions by *replacing* an entry's disposition with a new frozen value, which
 * is why a mailbox entry's disposition stays a writable field while the object it names does not.
 */
export const QUEUED: MailboxDisposition = PrimordialObjectFreeze({ kind: "queued" });

/**
 * K1.2-DEC-17: the single normative owner of held-exchange permitted actions.
 *
 * Both the enforcement in the coordinator (redeliver refused while any hold stands; takeover refused
 * while a code hold stands) and the inspection views (`holdsOf`) derive from this function, so they
 * cannot drift apart. The vocabulary names existing K1.2 operations only:
 * - `declare_code_availability`: `recoverExecution` with every pin covered;
 * - `request_takeover`: `requestTakeover` (only when no code hold stands);
 * - `submit_outcome`: a valid Outcome from the current attempt, which resolves the exchange and
 *   ends its holds (a hold never fences acceptance; only the epoch and terminal state do).
 */
const DECLARE_CODE_AVAILABILITY = "declare_code_availability";
const REQUEST_TAKEOVER = "request_takeover";
const SUBMIT_OUTCOME = "submit_outcome";

const permittedForHold = (cause: StoredHold["cause"], hasCodeHold: boolean): readonly string[] => {
  if (cause === "pinned_code_unavailable") {
    return PrimordialObjectFreeze([DECLARE_CODE_AVAILABILITY, SUBMIT_OUTCOME]);
  }
  // Protocol-failure hold: takeover permitted only when no code hold blocks it.
  if (hasCodeHold) {
    return PrimordialObjectFreeze([DECLARE_CODE_AVAILABILITY, SUBMIT_OUTCOME]);
  }
  return PrimordialObjectFreeze([REQUEST_TAKEOVER, SUBMIT_OUTCOME]);
};

/**
 * The holds on one unresolved exchange, code first, as own data with computed permitted actions.
 *
 * Takes the stored exchange for inspection and the idempotent answers, and a planned control
 * decision for the answer that decision will return, which is built before it is applied.
 */
export const holdsOf = (intent: HoldState): RecoveryHoldView[] => {
  const holds: RecoveryHoldView[] = [];
  const hasCodeHold = intent.codeHold !== null;
  if (intent.codeHold !== null) {
    const stored = intent.codeHold;
    appendOwn(
      holds,
      PrimordialObjectFreeze({
        cause: stored.cause,
        reason: stored.reason,
        activationId: stored.activationId,
        writerEpoch: stored.writerEpoch,
        permittedNextActions: permittedForHold(stored.cause, hasCodeHold),
      }),
    );
  }
  if (intent.protocolFailureHold !== null) {
    const stored = intent.protocolFailureHold;
    appendOwn(
      holds,
      PrimordialObjectFreeze({
        cause: stored.cause,
        reason: stored.reason,
        activationId: stored.activationId,
        writerEpoch: stored.writerEpoch,
        permittedNextActions: permittedForHold(stored.cause, hasCodeHold),
      }),
    );
  }
  return holds;
};

// -- Waits and timers (K1.3) ---------------------------------------------------

/** A live wait generation: what registered it, the selector it is judged by, and its deadline. */
export type LiveWait = WaitView;

/** A retired generation and how it ended. Each generation retires once. */
export type RetiredWait = RetiredWaitView;

/**
 * Wait-ended readiness (`core.md` § Readiness): the retired selector the next reservation evaluates.
 *
 * It lives for exactly one reservation. The dispatch plan consumes it, and a terminal decision
 * discards it, so it never spans two exchanges or re-arms.
 */
export interface Readiness {
  readonly species: "event" | "deadline";
  readonly generation: number;
  readonly selector: AcceptedWait;
  /** The exact timeout Event for deadline readiness; `null` for an Event wake. */
  readonly timeoutEventId: string | null;
}

/** One Kernel timeout Event's facts, as a plan carries them; the owner adds its disposition. */
export interface TimeoutFacts {
  readonly eventId: string;
  readonly destination: string;
  readonly generation: number;
  readonly deadline: number;
  /** The decision's acceptance position: the Outcome's own at registration, the next one at a fire. */
  readonly acceptancePosition: number;
}

/** One host timer fire, retained as operational evidence on its Execution. */
export type TimerFireRecord = TimerFireView;

/** The answer to `fireTimer`. `unknown` names no Execution and records nothing. */
export interface TimerFireAnswer {
  readonly result: TimerFireResult | "unknown";
  readonly reason: string;
  readonly timeoutEventId: string | null;
}

// -- The plans ----------------------------------------------------------------

/** One mailbox entry's accepted facts, as a plan carries them; the owner adds the mutable disposition. */
export interface EntryFacts {
  readonly eventId: string;
  readonly inputId: InputId;
  /** The injective packing of this input's content parts; equal identity means equal content. */
  readonly contentIdentity: string;
  readonly kind: string;
  readonly payload: CanonicalValue;
  readonly subscriptionClass: string | null;
  readonly acceptancePosition: number;
  readonly receipt: Receipt;
}

/** A new Execution with its initial input, accepted as one decision. */
export interface CreationPlan {
  readonly kind: "creation";
  readonly executionId: string;
  /** Always 0: no record has this Creation request ID yet, and the owner refuses the plan if one has. */
  readonly basis: number;
  readonly creationRequestId: CreationRequestId;
  readonly scope: string;
  readonly definitionRevision: string;
  readonly runtimeContractRevision: string;
  readonly progressCodec: string;
  readonly authorityContext: CanonicalValue;
  readonly creationIdentity: string;
  readonly receipt: Receipt;
  readonly initial: EntryFacts;
  readonly answer: Ok<CreationAccepted>;
}

/** One accepted post-creation input. */
export interface InputPlan {
  readonly kind: "input";
  readonly executionId: string;
  readonly basis: number;
  readonly entry: EntryFacts;
  /**
   * The live generation this input retires, when the Execution is `WAITING` and the input is eligible
   * under it (B-6 path B); otherwise `null`. The same decision records Event readiness and `READY`.
   */
  readonly woken: RetiredWait | null;
  readonly readiness: Readiness | null;
  readonly answer: Ok<InputAccepted>;
}

/**
 * One accepted dispatch intent: the pinned exchange, its reserved batch and its first attempt.
 *
 * The owner always clears wait-ended readiness with it: readiness lives for one reservation.
 */
export interface DispatchPlan {
  readonly kind: "dispatch";
  readonly executionId: string;
  readonly basis: number;
  /** The Execution's Activation count after this decision; the Activation ID is derived from it. */
  readonly activationsMinted: number;
  readonly receipt: Receipt;
  readonly activation: Activation;
  readonly submission: SubmissionGrant;
  readonly batch: readonly string[];
  readonly answer: Ok<DispatchAccepted>;
}

/** One delivery attempt of the unresolved exchange, recorded before the Driver is handed it. */
export interface DeliveryPlan {
  readonly kind: "delivery";
  readonly executionId: string;
  readonly basis: number;
  readonly activationId: string;
  readonly writerEpoch: number;
  /** The attempt's number within its exchange: one more than the attempts already recorded. */
  readonly attempt: number;
}

/** The first report on one delivery attempt, which settles that attempt's own row and nothing else. */
export interface SettlementPlan {
  readonly kind: "settlement";
  readonly executionId: string;
  readonly basis: number;
  readonly activationId: string;
  readonly attempt: number;
  readonly status: "delivered" | "failed";
  readonly failure: string | null;
}

/** The facts of the exchange an accepted Outcome resolves; the owner adds the exchange's delivery log. */
export interface ResolvedFacts {
  readonly activationId: string;
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
  readonly batch: readonly string[];
  readonly dispatchReceipt: Receipt;
  readonly outcomeReceipt: Receipt;
}

/** The retained decision an exact replay answers from (OA-2). */
export interface AcceptedOutcome {
  /** Owned bytes/text/count for every accepted root, retained privately for future byte readers. */
  readonly content: CapturedOutcome;
  /** The captured content's identity; equality is an exact duplicate. */
  readonly identity: string;
  /** Frozen; everything a replay returns except the `replayed` flag. */
  readonly decision: Omit<OutcomeAccepted, "replayed">;
}

/** One accepted Outcome (OA-4), whole. */
export interface OutcomePlan {
  readonly kind: "outcome";
  readonly executionId: string;
  readonly basis: number;
  readonly receipt: Receipt;
  /** Mailbox positions this decision acknowledges (the whole reserved batch still queued). */
  readonly acknowledgeAt: readonly number[];
  /** Mailbox positions this decision gives a `B-5` terminal disposition. */
  readonly endAt: readonly number[];
  readonly acknowledgment: MailboxDisposition;
  readonly ending: MailboxDisposition;
  readonly progressRevision: number;
  readonly emissions: readonly EmissionView[];
  readonly result: TerminalResultView | null;
  readonly resolved: ResolvedFacts;
  readonly stored: AcceptedOutcome;
  readonly history: readonly RecoveryHistoryRecord[];
  /** The Execution's registration count after this decision: one more for an accepted `await`. */
  readonly registrations: number;
  /** The generation left live, exactly when the next state is `WAITING`. */
  readonly liveWait: LiveWait | null;
  /** The generation an `await` created and retired in this same decision, or `null`. */
  readonly retired: RetiredWait | null;
  /** Readiness recorded when that generation retired at registration. */
  readonly readiness: Readiness | null;
  /** The timeout Event minted at registration for an already-due deadline. */
  readonly timeout: TimeoutFacts | null;
  readonly nextState: ExecutionState;
  readonly answer: OutcomeAccepted;
}

/** One authorized writer-epoch advance within the unresolved exchange (ID-3, ID-4). */
export interface TakeoverPlan {
  readonly kind: "takeover";
  readonly executionId: string;
  readonly basis: number;
  readonly receipt: Receipt;
  /** The `cleared_by_takeover` record when a protocol-failure hold is cleared, otherwise `null`. */
  readonly cleared: RecoveryHistoryRecord | null;
  readonly activation: Activation;
  readonly submission: SubmissionGrant;
  readonly answer: Ok<TakeoverAccepted>;
}

/** One recovery-control decision that enters, updates or clears a hold (K1.2-DEC-18; correction DEC-9). */
export interface ControlPlan {
  readonly kind: "control";
  readonly executionId: string;
  readonly basis: number;
  readonly history: RecoveryHistoryRecord;
  readonly codeHold: StoredHold | null;
  readonly protocolFailureHold: StoredHold | null;
  readonly answer: Ok<RecoveryDecision>;
}

/**
 * One accepted expiry of the live wait generation (W-9): its one timeout Event at the next acceptance
 * position, the generation retired, deadline readiness and `READY`, and the fire that caused it.
 */
export interface ExpiryPlan {
  readonly kind: "expiry";
  readonly executionId: string;
  readonly basis: number;
  readonly timeout: TimeoutFacts;
  readonly retired: RetiredWait;
  readonly readiness: Readiness;
  readonly fire: TimerFireRecord;
  readonly answer: TimerFireAnswer;
}

/** One timer fire that changes nothing logical: duplicate, stale, not due, or an unusable clock. */
export interface TimerDiscardPlan {
  readonly kind: "timer_discard";
  readonly executionId: string;
  readonly basis: number;
  readonly fire: TimerFireRecord;
  readonly answer: TimerFireAnswer;
}

/** One recorded refusal of a request that named a visible Execution; the refusal is also its answer. */
export interface RefusalPlan {
  readonly kind: "refusal";
  readonly executionId: string;
  readonly basis: number;
  readonly refusal: RefusalRecord;
}

/**
 * Data only: a function anywhere in `T` makes it `never`. Owned bytes (`Uint8Array`) and accepted
 * values are data by construction.
 */
export type DataOnly<T> = T extends (...args: never[]) => unknown
  ? never
  : T extends Uint8Array
    ? T
    : T extends BoundaryValue
      ? T
      : T extends readonly (infer E)[]
        ? readonly DataOnly<E>[]
        : T extends object
          ? { readonly [K in keyof T]: DataOnly<T[K]> }
          : T;

/** Every decision the owner applies. Closed: a new decision is a new variant and a new owner arm. */
export type Plan =
  | CreationPlan
  | InputPlan
  | DispatchPlan
  | DeliveryPlan
  | SettlementPlan
  | OutcomePlan
  | TakeoverPlan
  | ControlPlan
  | RefusalPlan
  | ExpiryPlan
  | TimerDiscardPlan;

type AssertTrue<T extends true> = T;
/** Compile-time proof that no plan variant holds a function anywhere (CR1-1). */
export type PlansAreData = AssertTrue<[Plan] extends [DataOnly<Plan>] ? true : false>;

/** The plan kinds, in the owner's dispatch order. */
export type PlanKind = Plan["kind"];
