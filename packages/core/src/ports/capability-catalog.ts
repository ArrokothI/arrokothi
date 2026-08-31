/**
 * The capability-operation catalog: where consequentiality lives.
 *
 * Consequentiality answers one question: if this operation is dispatched and its response is
 * lost, could assuming failure and retrying duplicate or alter an externally meaningful effect?
 * `weather.get` is normally safe to retry blind; `payment.charge` and `world.move` are not. That is
 * a property of the *operation*, not of who is asking or what policy currently permits, so it does
 * not belong on a proposal (a controller cannot declare its own action harmless) and it does not
 * belong solely on an authorization decision either (see `ports/effect-authorizer.ts`, which can
 * only promote a decision toward consequential, never away from it).
 *
 * This catalog is where the baseline is declared. It is deliberately not a general capability
 * registry - no schemas, no descriptions, no versioning - because Slice B needs exactly one fact
 * about an operation and nothing else. A later slice may grow this into something richer; this
 * port only has to stay honest about the one property the gateway depends on today.
 */

import type { CapabilityId, OperationId } from "../effects/ids.ts";

export interface CapabilityOperationDescriptor {
  readonly capability: CapabilityId;
  readonly operation: OperationId;
  readonly consequential: boolean;
}

export interface CapabilityCatalog {
  /**
   * `undefined` means this operation is not classified.
   *
   * Unclassified is not "assume non-consequential" - the gateway treats an unknown operation as
   * consequential by default, so a catalog with a gap fails toward the safe interpretation rather
   * than the convenient one.
   */
  describe(capability: CapabilityId, operation: OperationId): CapabilityOperationDescriptor | undefined;
}

/** The conservative default: nothing is classified, so nothing is exempted from consequential handling. */
export const emptyCapabilityCatalog: CapabilityCatalog = {
  describe() {
    return undefined;
  },
};
