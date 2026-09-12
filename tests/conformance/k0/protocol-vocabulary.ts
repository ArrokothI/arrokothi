/**
 * K0.2 public fixture — target-protocol vocabulary.
 *
 * This module is deliberately dependency-free. It imports nothing from `@arrokothi/*` because it
 * describes the **target** Kernel protocol decided by K0.1, which the current 0.8.x packages do not
 * implement (`docs/development/002-implemented-kernel-baseline.md`). Importing the current
 * `ExecutionWait`/`ControllerProgress` vocabulary would bake legacy shapes into an oracle that exists
 * to judge the replacement; see `docs/development/013-structure-and-evidence-sequencing.md`.
 *
 * Every rule restated here is cited to its accepted owner:
 *   W = `docs/development/work/K0.1/protocol-worksheet.md` §5 (waits)
 *   B = the same worksheet §3 (batches), E = §1 (values), OA = §7, CX = §6, PC = §9.
 * Where this file and the worksheet disagree, the worksheet wins and this file needs a correction.
 *
 * Nothing here implements a Kernel. These are declarative types plus the small well-formedness and
 * eligibility predicates the fixture uses to check that its own scenarios agree with the accepted
 * rules (see `rule-agreement.test.ts`).
 */

// -- Lifecycle ---------------------------------------------------------------

/** kernel.md "Progress without understanding cognition". There is no externally visible CREATED. */
export type ExecutionState = "READY" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED";

export const TERMINAL_STATES: readonly ExecutionState[] = ["COMPLETED", "FAILED", "CANCELLED"];

export function isTerminal(state: ExecutionState): boolean {
  return TERMINAL_STATES.includes(state);
}

// -- Events ------------------------------------------------------------------

/**
 * W-1's source-category table. The category is fixed by trusted ingress/mint provenance, never by how
 * a kind happens to be spelled. This is the distinction that decides which matching rule, if any, can
 * make an Event eligible.
 */
export type EventSourceCategory =
  /** Accepted through the application-input ingress path. Eligible only via a declared subscription. */
  | "application_input"
  /** Minted by the Kernel from its own persisted deadline (W-9). Eligible via neither list. */
  | "kernel_timeout"
  /** Runtime-established results, settlements, child results, peer messages. Eligible via a dependency alternative. */
  | "kernel_event";

export interface FixtureEvent {
  readonly eventId: string;
  readonly destination: string;
  readonly kind: string;
  readonly category: EventSourceCategory;
  /** Correlation identity where the envelope carries one. */
  readonly correlation?: string;
  /**
   * For `application_input`, the declared subscription class this input belongs to. W-1 item 2:
   * subscriptions name a class of application input by its declared subscription identity, and that
   * label is **not** a fourth selector field on a dependency alternative.
   */
  readonly subscriptionClass?: string;
  /** For `kernel_timeout`, the wait generation whose deadline expired (W-9 exact generation correlation). */
  readonly waitGeneration?: string;
}

// -- Waits -------------------------------------------------------------------

/**
 * W-1's dependency-alternative selector grammar. Any non-empty subset of exactly three optional
 * fields; within one alternative the combinator is conjunction; between alternatives it is any-of.
 * Every comparison is equality. Payload/body is not selectable at all.
 */
export interface DependencyAlternative {
  readonly eventIdentity?: string;
  /** One kind, or a non-empty finite set of kinds. An empty supplied set is malformed, not "matches nothing". */
  readonly kinds?: readonly string[];
  readonly correlation?: string;
}

export interface InputSubscription {
  readonly subscriptionClass: string;
}

export interface WaitRecord {
  /** Finite, possibly empty (W-1 item 1). */
  readonly dependencies: readonly DependencyAlternative[];
  /** Finite, possibly empty (W-1 item 2). Both empty is malformed. */
  readonly subscriptions: readonly InputSubscription[];
  /** Optional durable deadline (§4). A deadline never rescues a literally empty declaration. */
  readonly deadline?: number;
  /** W-3. Distinct from the Execution ID and from the Activation ID that created it. */
  readonly generation: string;
}

export type WaitWellFormedness =
  | { readonly wellFormed: true }
  | { readonly wellFormed: false; readonly reason: string };

/**
 * W-1 well-formedness. A **structural** test and nothing more: it checks that the Runtime submitted a
 * well-shaped declaration. It deliberately does not prove that any Event will ever be eligible —
 * K0.1 promises structure, never satisfiability.
 */
export function checkWaitWellFormed(wait: WaitRecord): WaitWellFormedness {
  // Rule 1: structurally non-empty. Either list may be empty; not both. A deadline does not rescue it.
  if (wait.dependencies.length === 0 && wait.subscriptions.length === 0) {
    return { wellFormed: false, reason: "both dependency alternatives and subscriptions are empty" };
  }
  // Rule 2: every present alternative is grammar-valid.
  for (const alternative of wait.dependencies) {
    const supplied =
      (alternative.eventIdentity === undefined ? 0 : 1) +
      (alternative.kinds === undefined ? 0 : 1) +
      (alternative.correlation === undefined ? 0 : 1);
    if (supplied === 0) {
      return { wellFormed: false, reason: "dependency alternative supplies none of the three selector fields" };
    }
    if (alternative.kinds !== undefined && alternative.kinds.length === 0) {
      return { wellFormed: false, reason: "dependency alternative supplies an empty kind set" };
    }
  }
  // Rule 3: every present subscription is structurally a declared subscription identity.
  for (const subscription of wait.subscriptions) {
    if (subscription.subscriptionClass.length === 0) {
      return { wellFormed: false, reason: "declared subscription has an empty subscription identity" };
    }
  }
  return { wellFormed: true };
}

/** W-1's selector grammar: conjunction of the supplied fields, equality only. */
export function alternativeMatches(alternative: DependencyAlternative, event: FixtureEvent): boolean {
  if (alternative.eventIdentity !== undefined && alternative.eventIdentity !== event.eventId) return false;
  if (alternative.kinds !== undefined && !alternative.kinds.includes(event.kind)) return false;
  if (alternative.correlation !== undefined && alternative.correlation !== event.correlation) return false;
  return true;
}

/**
 * W-1's eligibility rule, stated once by its owner and cited everywhere else.
 *
 * While `WAITING`, an Event is eligible **iff** it is ordinary application input **and** matches at
 * least one declared input subscription; **or** it is a Kernel Event of neither of the other two
 * categories **and** matches at least one dependency alternative. Nothing else is eligible.
 *
 * In particular: a dependency alternative naming an application-input kind is inert, and the Kernel
 * timeout Event is made eligible by neither list — it arrives as B-7's mandatory member by
 * construction.
 */
export function isEligibleUnderWait(wait: WaitRecord, event: FixtureEvent): boolean {
  switch (event.category) {
    case "application_input":
      return wait.subscriptions.some((s) => s.subscriptionClass === event.subscriptionClass);
    case "kernel_timeout":
      return false;
    case "kernel_event":
      return wait.dependencies.some((alternative) => alternativeMatches(alternative, event));
  }
}

/**
 * §3's wait-ended batch rule:
 *
 *   { the species' mandatory member, if it has one } ∪ { Events eligible under the retired wait's rule }
 *
 * selected over the Events unacknowledged **at reservation**. Truncation is defined: retain the
 * mandatory member first, then fill remaining slots with the earliest-accepted remaining candidates.
 * Retaining the mandatory member is a selection rule, not an ordering rule — the batch is presented
 * in per-Execution acceptance order regardless of which member was mandatory.
 *
 * `unacknowledged` must be supplied in per-Execution acceptance order.
 */
export function selectWaitEndedBatch(
  retiredWait: WaitRecord,
  unacknowledged: readonly FixtureEvent[],
  bound: number,
  mandatoryMemberId?: string,
): readonly FixtureEvent[] {
  if (bound < 1) {
    // B-1: a bound of 0 would make B-6's and B-7's mandatory members unsatisfiable.
    throw new Error("K0.2 fixture: the implementation-owned batch bound is at least 1 (B-1)");
  }
  const selected: FixtureEvent[] = [];
  if (mandatoryMemberId !== undefined) {
    const mandatory = unacknowledged.find((event) => event.eventId === mandatoryMemberId);
    if (mandatory === undefined) {
      // B-6/B-7: "the mandatory member is always available at reservation".
      throw new Error(`K0.2 fixture: mandatory batch member ${mandatoryMemberId} absent at reservation`);
    }
    selected.push(mandatory);
  }
  for (const event of unacknowledged) {
    if (selected.length >= bound) break;
    if (selected.some((already) => already.eventId === event.eventId)) continue;
    if (!isEligibleUnderWait(retiredWait, event)) continue;
    selected.push(event);
  }
  const chosen = new Set(selected.map((event) => event.eventId));
  return unacknowledged.filter((event) => chosen.has(event.eventId));
}

/** B-2's ordinary-readiness rule: a bounded batch of all unacknowledged Events, in acceptance order. */
export function selectOrdinaryBatch(unacknowledged: readonly FixtureEvent[], bound: number): readonly FixtureEvent[] {
  if (bound < 1) throw new Error("K0.2 fixture: the implementation-owned batch bound is at least 1 (B-1)");
  return unacknowledged.slice(0, bound);
}

// -- Outcomes ----------------------------------------------------------------

export type OutcomeNext =
  | { readonly step: "continue" }
  | { readonly step: "await"; readonly wait: WaitRecord }
  | { readonly step: "complete"; readonly result: unknown }
  | { readonly step: "fail"; readonly error: { readonly code: string; readonly message: string } };

export interface OutcomeEnvelope {
  readonly executionId: string;
  readonly activationId: string;
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
  readonly progress: unknown;
  readonly emissions: readonly { readonly emissionId: string; readonly value: unknown }[];
  /**
   * K1 refuses Effects outright (EF-1/EF-2): an Outcome proposing one is rejected at whole-envelope
   * validation before any Effect intent, ID or proposal-key binding exists. The field is present in
   * the fixture vocabulary precisely so that refusal is observable.
   */
  readonly effects: readonly { readonly proposalKey: string; readonly operation: string; readonly input: unknown }[];
  readonly next: OutcomeNext;
}

/**
 * The rejection classifications a K0 candidate must be able to report. OA-5: a rejected Outcome is
 * recorded as a rejection with its reason, never silently dropped or auto-retried.
 *
 * **On reason strings, and what a fixture may make pass/fail.** The accepted decisions require that a
 * rejection be *recorded with an inspectable reason* (§11 row 4, OA-5); with one exception they do not
 * fix the text. The exception is CX-6, which names its reason — "cancellation accepted before Outcome
 * acceptance" — and so is pinned here as a genuine requirement. Every other reason string in this
 * fixture is a **representational convention** a candidate adopts in order to be judged, like the
 * receipt spellings: it distinguishes one rejection *condition* from another.
 *
 * What a fixture may never do is turn a choice between two canonically *equivalent* answers to the
 * same condition into a failure. Round-2 review finding K02-R2-01 is the worked example: an earlier
 * revision demanded a completion-specific reason for an envelope that proposes an Effect and requests
 * `complete`, and failed a candidate that reported the EF-2 refusal instead — but EF-1/EF-2 already
 * mandate the whole-envelope refusal and §11 row 4 leaves the text open, so both answers are correct
 * and the oracle was rejecting conforming work. Under-coverage lets a wrong candidate pass;
 * over-constraint fails a right one, which is worse. Every counterexample in `candidate.ts` therefore
 * has to name the decision it breaks, and that citation is checked.
 */
export type RejectionClassification =
  /** OA-3 whole-envelope validation: malformed value, bad wait record, proposed Effect at K1, etc. */
  | "malformed_envelope"
  /** OA-3: stale Activation ID, writer epoch or base progress revision. */
  | "stale_exchange"
  /** OA-2: same submitted identity, different content. */
  | "duplicate_conflict"
  /** CX-6: cancellation acceptance preceded this Outcome's acceptance. */
  | "cancellation_terminal_conflict";

export interface OutcomeRejection {
  readonly classification: RejectionClassification;
  readonly reason: string;
}

// -- Value bounds (E-6) ------------------------------------------------------

/**
 * E-6's four semantic bounds, recorded here so the fixture speaks the accepted numbers. E-6 assigns
 * the at-limit/one-past boundary matrix to "a K1 fixture"; K0.2's contract assigns that construction
 * to K1.2 and does not build it here.
 */
export const VALUE_BOUNDS = {
  /** Unicode scalar values per individual decoded string value or object member name. */
  decodedStringLength: 65_536,
  /** Direct children of one array or one object. */
  containerEntryCount: 4_096,
  /** Total recursive depth of each boundary-value root, including empty containers. */
  containerDepth: 32,
  /** Byte length of each E-1 boundary-value root canonicalized separately; no sum of siblings. */
  canonicalRootBytes: 1_048_576,
} as const;

/**
 * E-6's total depth definition: scalar 0; empty container 1; non-empty container 1 + max(child depth).
 * Object member names add no nesting level. Provided so the fixture's own sample values can be shown
 * to sit inside the accepted bounds; it is not the K1 boundary matrix.
 */
export function boundaryValueDepth(value: unknown): number {
  if (Array.isArray(value)) {
    if (value.length === 0) return 1;
    return 1 + Math.max(...value.map(boundaryValueDepth));
  }
  if (typeof value === "object" && value !== null) {
    const members = Object.values(value as Record<string, unknown>);
    if (members.length === 0) return 1;
    return 1 + Math.max(...members.map(boundaryValueDepth));
  }
  return 0;
}
