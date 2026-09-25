/**
 * The Activation the Kernel sends, and the Driver boundary it sends it through.
 *
 * `mental-model/mechanisms/execution-cycle.md` owns what an Activation pins;
 * `mental-model/driver.md` owns what a Driver is. Two things about this boundary are load-bearing
 * and are the reason it is this small:
 *
 * - **There is no Agent or Workflow discriminator.** Which code can interpret an Execution's
 *   progress is answered by the pinned Definition revision, Runtime contract revision and progress
 *   codec below, and by nothing else. The legacy closed `DefinitionKind` controller port is refused
 *   rather than carried forward (`DX-12`).
 * - **Delivery is not an exchange.** `deliver` returns nothing the Kernel interprets. An Outcome is
 *   submitted through its own boundary (`ExecutionCoordinator.submitOutcome`); a dispatch
 *   acknowledgment, a heartbeat or a diagnostic stream is operational traffic and is not an Outcome.
 */

import type { BoundaryValue } from "./values.ts";

/** One accepted Event as it is carried in a batch. */
export interface ActivationEvent {
  readonly eventId: string;
  readonly destination: string;
  readonly kind: string;
  readonly payload: BoundaryValue;
  /**
   * The trusted path that accepted or minted this Event. Only application input exists in this
   * packet; Kernel timeouts are K1.3's and trusted results are K2's.
   */
  readonly sourceCategory: "application_input";
  /** Present for application input that declared one; carried, never matched here. Matching is K1.3's. */
  readonly subscriptionClass?: string;
  /** Per-Execution acceptance position, which is the order a batch is presented in. */
  readonly acceptancePosition: number;
}

/**
 * One immutable semantic exchange asking a Runtime to advance an Execution.
 *
 * Every field is fixed when the dispatch intent is accepted and is identical on every ordinary
 * redelivery of that exchange.
 */
export interface Activation {
  readonly executionId: string;
  readonly activationId: string;
  /**
   * Which Runtime attempt may have an Outcome accepted for this exchange. 1 at each new exchange in
   * this binding; only an accepted takeover advances it, and then by one (K1.2-DEC-5).
   */
  readonly writerEpoch: number;
  /** The accepted progress revision this exchange starts from. */
  readonly baseProgressRevision: number;
  readonly runtimeContractRevision: string;
  readonly definitionRevision: string;
  /** The codec that can interpret `acceptedProgress`; pinned at creation, never inferred. */
  readonly progressCodec: string;
  /**
   * Runtime-owned continuation, returned unchanged.
   *
   * Only Outcome acceptance installs progress: the first exchange carries `null` at base revision 0,
   * and each later one the progress its predecessor's accepted Outcome proposed, exactly as captured.
   * `state.md`'s checkpoint and locator forms need a real Driver and are R1's; this binding carries
   * the inline form.
   */
  readonly acceptedProgress: BoundaryValue | null;
  /** The exact batch reserved for this exchange, in per-Execution acceptance order. */
  readonly events: readonly ActivationEvent[];
  /** The authorized execution view supplied to the Runtime; opaque application authority context. */
  readonly executionView: BoundaryValue;
}

/**
 * Adapts a Runtime to this boundary.
 *
 * `deliver` receives the Activation and a Kernel-owned reporting capability, and returns
 * only `undefined` (KC1-ARCH-1). The Driver reports delivery explicitly — during the call
 * or later — through `settlement.delivered()` or `settlement.failed(reason)`. Returning
 * normally is not an acknowledgment: without an explicit report the delivery attempt stays
 * `pending`. A synchronous throw is an implicit failure report through the same first-report
 * rule and changes no accepted state — the dispatch intent is already accepted and is what
 * a retry or a later takeover re-sends. The Driver owns its asynchronous work and handles
 * its own internal Promise rejections; the Kernel never observes the return value, creates
 * no Promise for reporting, and performs no Promise constructor/species sanitization.
 */
export interface DeliverySettlement {
  /** Records this attempt as delivered. Inert unless the bound attempt is still pending. */
  delivered(): void;
  /**
   * Records this attempt as failed with a bounded total diagnostic. Inert unless the bound
   * attempt is still pending. Never invokes caller-owned getters, coercions, or thenables;
   * non-string reasons collapse to a fixed text.
   */
  failed(reason: unknown): void;
}

/**
 * Unforgeable attempt-bound Outcome-submission authority (K1.2-DEC-20).
 *
 * The Kernel mints one grant per writer-epoch attempt, hands it to the Driver together with the
 * Activation, and requires that same grant back on `submitOutcome`. Authority is established by
 * reference identity against the exchange's current grant — never by comparing fields — so a
 * principal that merely inspected the Activation ID, writer epoch, and base revision cannot
 * fabricate a proposal, and a forged look-alike object is refused. Ordinary redelivery preserves
 * the attempt and therefore its grant; an authorized takeover mints a fresh grant for the new
 * epoch and retires the old one, so the superseded attempt cannot regain proposal power. Grants
 * are frozen at mint and never exposed through inspection.
 */
export interface SubmissionGrant {
  readonly executionId: string;
  readonly activationId: string;
  readonly writerEpoch: number;
}

export interface ExecutionDriver {
  readonly driverId: string;
  /**
   * Receives the Activation, a Kernel-owned delivery-reporting capability, and the current
   * attempt's submission grant, and returns only `undefined` (KC1-ARCH-1). The grant authorizes
   * Outcomes proposed as this attempt; the Driver presents it back when the Runtime answers.
   */
  deliver(activation: Activation, settlement: DeliverySettlement, submission: SubmissionGrant): undefined;
  /**
   * The Driver's phase-specific safe-replacement determination for takeover.
   *
   * Canonical owners: `identity.md#writer-epoch` ("authorizing takeover needs a separate guarantee
   * from the Driver that native continuation is exclusive or otherwise safe to replace; absent that
   * guarantee takeover is refused or held"), `recovery.md#decide-permission-before-replacing-work`
   * (permission before replacement and fencing), `driver.md` ("native mutation needs its own
   * exclusion or an explicit refusal to take over") and `kernel.md` ("the Driver must either exclude
   * that attempt's native work from the session or refuse the takeover. The first does not imply the
   * second").
   *
   * The Kernel rejects every later write from the superseded attempt; excluding its native work, or
   * refusing the takeover when that cannot be done, stays with the Driver. Kernel fencing does not
   * itself stop or exclude superseded native work. This is the in-process binding's owner for that
   * prerequisite (K1.2-DEC-15): the Kernel calls this synchronously during `requestTakeover` with the
   * current attempt's Activation, and advances the writer epoch only when it returns exactly `true`.
   * Absent, non-`true`, or throwing means no guarantee was established, and the takeover is refused
   * as `unsafe_replacement` rather than assumed. A `false` from a fake Driver in tests is the
   * distinguishing case for that refusal. Because this callback can synchronously reenter the
   * coordinator, the Kernel revalidates the same unresolved exchange, current epoch, and hold state
   * after it returns and before committing (K1.2-DEC-19).
   */
  isSafeToReplace?(activation: Activation): boolean;
}
