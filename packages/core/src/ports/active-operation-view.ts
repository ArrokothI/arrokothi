/**
 * The Active Operation View resolver: deterministic narrowing, and nothing else.
 *
 * An Agent controller needs to know which authorized operations are exposed right now. It must not
 * receive the runtime state that answer is derived from, so the derivation sits behind this port
 * and the controller holds only the port and the plain-data result.
 *
 * Read the interface as a list of things a resolver cannot do:
 *
 * ```text
 * it cannot dispatch an operation          it cannot authorize an Effect
 * it cannot mutate or widen authority      it cannot settle anything
 * it cannot hand back an executor          it cannot hand back a credential
 * ```
 *
 * What it can do is intersect an authored exposure request with the Execution's runtime-owned
 * ceiling and the catalog, deterministically, and return plain JSON. Identical inputs must produce
 * a structurally identical view: exposure is a context decision, and a context decision that
 * changed under you between two Activations would make a projection snapshot meaningless.
 *
 * Unknown refs and unknown groups narrow to nothing. They never become permissions, and they never
 * fail the Execution - the view records them as omissions with a reason.
 */

import type { ActiveOperationView } from "../operations/active-view.ts";
import { unauthorizedActiveOperationView } from "../operations/active-view.ts";
import type { OperationExposureRequest } from "../operations/exposure.ts";

export interface ActiveOperationViewRequest {
  /**
   * Which Execution's ceiling to narrow inside.
   *
   * An address, not a credential. Resolving against an id returns that Execution's own already
   * narrowed view; it cannot produce authority that Execution does not have, and the resulting
   * Effect is authorized again at dispatch regardless.
   */
  readonly executionId: string;
  /** What the Agent definition asked to expose. Intersected, never trusted as a grant. */
  readonly exposure: OperationExposureRequest;
  /**
   * Optional deterministic task scope: authored group labels the application narrows to now.
   *
   * Applied as a further intersection, so it can only make the view smaller.
   */
  readonly taskScope?: readonly string[];
}

export interface ActiveOperationViewResolver {
  resolve(request: ActiveOperationViewRequest): Promise<ActiveOperationView> | ActiveOperationView;
}

/**
 * The fail-closed default: every request narrows to nothing.
 *
 * Not a stub. A controller wired without a resolver has no way to know what is authorized, and
 * "nobody wired exposure" must not look the same as "these operations are exposed".
 */
export const noActiveOperationView: ActiveOperationViewResolver = {
  resolve() {
    return unauthorizedActiveOperationView([]);
  },
};
