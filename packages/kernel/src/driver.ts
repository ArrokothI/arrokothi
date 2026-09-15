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
 *   submitted through its own boundary, which K1.2 owns; a dispatch acknowledgment, a heartbeat or a
 *   diagnostic stream is operational traffic and is not an Outcome.
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
  /** Which Runtime attempt may have an Outcome accepted for this exchange. K1.1 never advances it. */
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
   * Progress is installed only by Outcome acceptance, which is K1.2's, so at this packet every
   * Activation carries `null` at base revision 0. `state.md`'s checkpoint and locator forms need a
   * real Driver and are R1's; K1's fake Runtime requires only the inline form.
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
 * `deliver` may return a promise, and the Kernel does not await it: slow native work stays inside the
 * Runtime, and one Execution's unfinished delivery must not delay another's dispatch. A rejected
 * promise or a synchronous throw is recorded as an operational delivery failure and changes no
 * accepted state - the dispatch intent is already accepted and is what a retry or a later takeover
 * re-sends.
 */
export interface ExecutionDriver {
  readonly driverId: string;
  deliver(activation: Activation): void | Promise<void>;
}
