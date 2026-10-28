/**
 * What a wait is, which Events can end it, and which Events the batch after it carries (K1.3).
 *
 * `mental-model/mechanisms/waits.md` owns these rules. This module holds only the pure parts: the
 * accepted wait's shape, eligibility, the W-1 alternative grammar and wait-ended batch selection. It
 * keeps no state and runs no callback. Reading a declaration from an Outcome is `outcome.ts`'s; when a
 * wait registers, wakes or expires is the coordinator's; the state owner records the results.
 *
 * ## Eligibility comes from the trusted path, not from the Event
 *
 * An Event's source category is written once, by the decision that accepted or minted it: input
 * ingress writes `application_input`, and only the expiry decision writes `kernel_timeout`. `eligible`
 * branches on that category before it consults any selector, so no `kind`, ID or payload an input
 * carries can make it look like a trusted result or a timeout (W-7). Application input can end a wait
 * only through an input subscription; a timeout never matches either list, because it ends its own
 * generation by expiry, not by matching. The category switch ends with a `never` check, so a category
 * K2 adds must be handled here before it can exist.
 *
 * Dependency alternatives are accepted, validated and retained in K1, but no live category reaches
 * them before K2 adds trusted non-timeout Events (017). `matchesAlternative` implements their W-1
 * grammar now, AND within an alternative and ANY-OF across them, and is checked on synthetic facts.
 *
 * ## The zone's rule
 *
 * Selection runs after caller-owned state has been observed in the same tick, so it follows the rule
 * `coordinator.ts` states: load-time references, own-data lists through `own-array.ts`, no iteration
 * protocol and no live prototype method.
 */

import { appendOwn, readAt } from "./own-array.ts";

const PrimordialObjectFreeze = Object.freeze;

// -- The declaration, as a Runtime proposes it ------------------------------

/** One dependency alternative: every field it supplies must match (AND). At least one is supplied. */
export interface DependencyAlternative {
  readonly eventIdentity?: string;
  /** A one-element list is "equal to one kind"; a longer list is "member of this set". Never empty. */
  readonly kinds?: readonly string[];
  readonly correlation?: string;
}

/** One input subscription: application input whose producer-declared subscription class is equal. */
export interface InputSubscription {
  readonly subscriptionClass: string;
}

/**
 * The wait an `await` Outcome declares.
 *
 * W-1: dependency alternatives and input subscriptions, at least one entry across the two lists, and
 * an optional deadline on the injected clock's scale. Absent and empty lists mean the same.
 */
export interface WaitDeclaration {
  readonly dependencies?: readonly DependencyAlternative[];
  readonly subscriptions?: readonly InputSubscription[];
  readonly deadline?: number;
}

// -- The accepted wait ------------------------------------------------------

/** One accepted alternative: each field's value, or `null` when it was not supplied. Frozen. */
export interface AcceptedAlternative {
  readonly eventIdentity: string | null;
  readonly kinds: readonly string[] | null;
  readonly correlation: string | null;
}

/** One accepted input subscription. Frozen. */
export interface AcceptedSubscription {
  readonly subscriptionClass: string;
}

/** An accepted wait: frozen own data, retained as the selector its generation is judged by. */
export interface AcceptedWait {
  readonly dependencies: readonly AcceptedAlternative[];
  readonly subscriptions: readonly AcceptedSubscription[];
  readonly deadline: number | null;
}

/** The trusted paths an Event can be accepted or minted through in K1. */
export type SourceCategory = "application_input" | "kernel_timeout";

/** What eligibility may consult about an Event: its trusted category and its subscription class. */
export interface EligibilityFacts {
  readonly sourceCategory: SourceCategory;
  /** The producer-declared subscription class of application input, or `null`. */
  readonly subscriptionClass: string | null;
}

/** The facts a trusted non-timeout Event will offer the W-1 grammar (K2). Synthetic in K1. */
export interface TrustedEventFacts {
  readonly eventId: string;
  readonly kind: string;
  readonly correlation: string | null;
}

/** Whether `event` can end a wait judged by `wait` (waits § Eligibility; W-1, W-7). */
export const eligible = (wait: AcceptedWait, event: EligibilityFacts): boolean => {
  const category = event.sourceCategory;
  if (category === "application_input") {
    const declared = event.subscriptionClass;
    if (declared === null) return false;
    let matched = false;
    for (let index = 0; index < wait.subscriptions.length; index += 1) {
      if ((readAt(wait.subscriptions, index) as AcceptedSubscription).subscriptionClass === declared) matched = true;
    }
    return matched;
  }
  if (category === "kernel_timeout") return false;
  const unreachable: never = category;
  return unreachable;
};

/**
 * Whether one alternative matches a trusted Event's facts: every supplied field, by equality (W-1).
 *
 * Inert in K1: no live category reaches it. The selector units check it on synthetic facts.
 */
export const matchesAlternative = (alternative: AcceptedAlternative, facts: TrustedEventFacts): boolean => {
  if (alternative.eventIdentity !== null && alternative.eventIdentity !== facts.eventId) return false;
  if (alternative.kinds !== null) {
    let member = false;
    for (let index = 0; index < alternative.kinds.length; index += 1) {
      if ((readAt(alternative.kinds, index) as string) === facts.kind) member = true;
    }
    if (!member) return false;
  }
  if (alternative.correlation !== null && alternative.correlation !== facts.correlation) return false;
  return alternative.eventIdentity !== null || alternative.kinds !== null || alternative.correlation !== null;
};

/** Whether any alternative matches (ANY-OF across alternatives). Inert in K1, like `matchesAlternative`. */
export const matchesAnyAlternative = (wait: AcceptedWait, facts: TrustedEventFacts): boolean => {
  let matched = false;
  for (let index = 0; index < wait.dependencies.length; index += 1) {
    if (matchesAlternative(readAt(wait.dependencies, index) as AcceptedAlternative, facts)) matched = true;
  }
  return matched;
};

// -- Wait-ended batch selection ---------------------------------------------

/** One queued Event as selection sees it, in acceptance order. */
export interface SelectableEntry extends EligibilityFacts {
  readonly eventId: string;
}

/** What wait-ended readiness says about the batch that follows it. */
export interface WaitEndedSelection {
  readonly species: "event" | "deadline";
  /** The retired generation's selector. */
  readonly selector: AcceptedWait;
  /** The exact timeout Event for deadline readiness; `null` for an Event wake. */
  readonly timeoutEventId: string | null;
}

/**
 * The batch after wait-ended readiness: positions into `queued`, in acceptance order (waits § Selecting).
 *
 * `queued` is every Event still unacknowledged **at reservation**, in acceptance order, so an eligible
 * arrival after the wake is a candidate and no candidate set is frozen at wake. Candidates are the
 * Events eligible under the retired selector; a timeout is never eligible, so other generations'
 * timeouts and ineligible backlog are never candidates, even with spare capacity. Then:
 *
 * 1. retain the mandatory member first: the earliest candidate for an Event wake, or the exact timeout
 *    Event for expiry, which is a member independently of matching;
 * 2. fill the remaining capacity with the earliest remaining candidates;
 * 3. present the selection in acceptance order.
 *
 * Returns `null` when the mandatory member is not queued, which no reachable state allows: only an
 * accepted Outcome acknowledges, none can be accepted between a wake and its reservation, and a
 * terminal decision discards readiness with everything else. The coordinator treats `null` as an
 * invariant violation.
 */
export const selectWaitEndedBatch = (queued: readonly SelectableEntry[], selection: WaitEndedSelection, bound: number): readonly number[] | null => {
  let mandatory = -1;
  if (selection.species === "deadline") {
    for (let index = 0; index < queued.length; index += 1) {
      if ((readAt(queued, index) as SelectableEntry).eventId === selection.timeoutEventId) mandatory = index;
    }
  } else {
    for (let index = 0; index < queued.length && mandatory === -1; index += 1) {
      if (eligible(selection.selector, readAt(queued, index) as SelectableEntry)) mandatory = index;
    }
  }
  if (mandatory === -1) return null;
  // One pass in acceptance order both fills and presents: the mandatory member is kept wherever it
  // sits, and the earliest other candidates take the remaining capacity.
  let spare = bound - 1;
  const positions: number[] = [];
  for (let index = 0; index < queued.length; index += 1) {
    if (index === mandatory) {
      appendOwn(positions, index);
    } else if (spare > 0 && eligible(selection.selector, readAt(queued, index) as SelectableEntry)) {
      appendOwn(positions, index);
      spare -= 1;
    }
  }
  return PrimordialObjectFreeze(positions);
};
