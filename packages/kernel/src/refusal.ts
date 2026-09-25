/**
 * Refusals: what the Kernel records when it does not accept a request.
 *
 * A refusal is accepted evidence of its own - `execution-cycle.md`: "Record the reason; never
 * silently drop or endlessly retry it" - so it has a classification a caller can branch on, a reason
 * a person can read, and a retained position on the Execution it concerns.
 *
 * `duplicate_conflict` is shared: `identity.md` gives it one meaning - the same submitted identity
 * with different content - at every boundary that has an identity, the Outcome boundary included.
 * The Outcome-specific classifications (`malformed_envelope`, `stale_exchange`) use the K0.2 public
 * fixture's vocabulary, so the K1.4 port is wiring rather than translation.
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
  /** There is no unresolved Activation for this request to act on. */
  | "no_unresolved_exchange"
  /**
   * OA-3 whole-envelope validation refused an Outcome's content: a malformed value, a missing or
   * unknown field, a duplicate Emission key, an unsupported next step, or a proposed Effect before
   * K2 (EF-2). Nothing of the proposal was accepted.
   */
  | "malformed_envelope"
  /**
   * OA-3: the proposal or control names an Activation that is not the unresolved exchange, a writer
   * epoch that is not the current one, or a base progress revision the exchange was not pinned at.
   */
  | "stale_exchange"
  /** The unresolved exchange is recovery-held; continuing it is refused until the hold clears. */
  | "recovery_held"
  /**
   * K1.2-DEC-14: the caller can see the Execution but holds no control power over its scope.
   *
   * `evidence.md`: inspection privilege does not grant re-execution or settlement privilege. The
   * three exchange controls (takeover, recovery declaration, protocol-failure report) require the
   * Execution's scope in the caller's `controlScopes`; a visible but inspect-only principal is
   * refused here, with the Execution named (it passed visibility) and no control-state mutation.
   */
  | "unauthorized_control"
  /**
   * K1.2-DEC-15: the Driver did not establish safe replacement for a takeover.
   *
   * `identity.md#writer-epoch` and `recovery.md` require a separate Driver guarantee that native
   * continuation is exclusive or otherwise safe to replace before the writer fence advances. Absent,
   * denied, or throwing means the takeover is refused rather than assumed. Kernel fencing of stale
   * writes does not itself stop superseded native work.
   */
  | "unsafe_replacement"
  /**
   * K1.2-DEC-20: the Outcome proposal carries no submission authority for the current attempt.
   *
   * `evidence.md`: inspection privilege does not grant re-execution or settlement privilege, and
   * an Activation observed through inspection does not authorize answering it. The proposal named
   * the open exchange but did not present its attempt-bound grant, so it cannot win, clear holds,
   * or end the Execution. Exact replays and conflicts are answered before this check (OA-2 order)
   * because they return or refuse on retained evidence without accepting anything.
   */
  | "unauthorized_submission";

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
   * Where this refusal sits in the record order of the Execution it concerns.
   *
   * K11-R12-ID-01: this is the owning Execution's own refusal index — the first recorded refusal
   * against an Execution is 1, each later one consumes the next — and it shares no counter with
   * receipt positions, so acceptances cannot gap around refusals and refusals cannot gap around
   * acceptances. A refusal that names no Execution (`executionId` below is `null`) concerns no
   * record and therefore orders against nothing: its position is always 0, identically for a
   * hidden record and a missing one. It is a record position, not an acceptance: nothing was
   * accepted.
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
/**
 * Load-time `Object.freeze`: refusals are minted after caller-owned values have been observed,
 * and a capture-time side effect can replace the global before the mint runs. The runtime
 * immutability claim (K11-R2-EVID-01) must not depend on that global.
 */
const PrimordialObjectFreeze = Object.freeze;

export const mintRefusal = (
  classification: RefusalClassification,
  reason: string,
  position: number,
  executionId: string | null,
): RefusalRecord => PrimordialObjectFreeze({ classification, reason, position, executionId });
