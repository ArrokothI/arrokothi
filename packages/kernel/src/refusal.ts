/**
 * Refusals: what the Kernel records when it does not accept a request.
 *
 * A refusal is accepted evidence of its own - `execution-cycle.md`: "Record the reason; never
 * silently drop or endlessly retry it" - so it has a classification a caller can branch on, a reason
 * a person can read, and a retained position on the Execution it concerns.
 *
 * The classifications an Outcome can be refused under live with Outcome acceptance in K1.2.
 * `duplicate_conflict` is shared: `identity.md` gives it one meaning - the same submitted identity
 * with different content - at every boundary that has an identity.
 */

export type RefusalClassification =
  /** Same creation key or Input ID, different logical content. */
  | "duplicate_conflict"
  /** The request carried something that is not an acceptable boundary value. */
  | "malformed_value"
  /**
   * No Execution with that ID is visible to this caller.
   *
   * `identity.md`: "Refusal shape/timing must not distinguish another principal's hidden record from
   * a missing one." An Execution outside the caller's authority scope is refused under this
   * classification with this reason, identically to one that was never created.
   */
  | "unknown_destination"
  /** The destination Execution has ended; ordinary input is refused rather than queued. */
  | "terminal_destination"
  /** The caller asked to create an Execution in an authority scope it does not hold. */
  | "unauthorized_scope"
  /** Accepting would pass a declared capacity limit; refused before any acknowledgment. */
  | "capacity_exhausted"
  /** The requested batch bound is below one, which would dispatch a Runtime that cannot be told why. */
  | "invalid_batch_bound"
  /** An Activation for this Execution is still unresolved, and there may be only one. */
  | "exchange_unresolved"
  /** There is no unresolved Activation to redeliver. */
  | "no_unresolved_exchange";

/**
 * One refused request, retained and inspectable.
 *
 * Like a receipt, this is retained evidence: it is returned to the caller, pushed onto the
 * Execution's refusal list and reported again by inspection. `readonly` is a compile-time claim
 * only; `mintRefusal` below establishes the runtime one.
 */
export interface RefusalRecord {
  readonly classification: RefusalClassification;
  /** Human-readable and specific; the classification is what code should branch on. */
  readonly reason: string;
  /**
   * Where this refusal sits in the coordinator's record order.
   *
   * It shares one monotonic counter with receipt positions so refusals and acceptances can be read
   * in the order they happened. It is a record position, not an acceptance: nothing was accepted.
   */
  readonly position: number;
  /** The Execution the refusal concerns, when the caller was allowed to learn there is one. */
  readonly executionId: string | null;
}

/**
 * The single reason text for an invisible destination.
 *
 * Exported so the ingress, dispatch and inspection paths cannot drift into three subtly different
 * sentences, which would reintroduce exactly the distinction `unknown_destination` exists to erase.
 */
export const UNKNOWN_DESTINATION_REASON = "no Execution with that identifier is visible to this caller";

/**
 * The one place a refusal record comes into existence, and where its immutability is established.
 *
 * `execution-cycle.md` requires the reason to be *recorded*, and K1.1-C9 reports recorded refusals
 * through inspection. The coordinator retains the same object it returns to the caller, so a caller
 * that could edit the returned record would be editing the Kernel's retained classification and
 * reason, and inspection would then report the edited version (K11-R2-EVID-01). Freezing at the
 * single construction site makes that structurally impossible rather than relying on every exit
 * path to remember to copy.
 */
export const mintRefusal = (
  classification: RefusalClassification,
  reason: string,
  position: number,
  executionId: string | null,
): RefusalRecord => Object.freeze({ classification, reason, position, executionId });
