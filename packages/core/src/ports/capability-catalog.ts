/**
 * The capability-operation catalog: operation-intrinsic truth, and only that.
 *
 * Consequentiality answers one question: if this operation is dispatched and its response is
 * lost, could assuming failure and retrying duplicate or alter an externally meaningful effect?
 * `weather.get` is normally safe to retry blind; `payment.charge` and `world.move` are not. That is
 * a property of the *operation*, not of who is asking or what policy currently permits, so it does
 * not belong on a proposal (a controller cannot declare its own action harmless) and it does not
 * belong solely on an authorization decision either (see `ports/effect-authorizer.ts`, which can
 * only promote a decision toward consequential, never away from it).
 *
 * The catalog includes the descriptive facts a model-facing projection consumes - a title, a
 * description, an input schema, and authored group labels - and nothing else. They are additive and
 * optional, so a catalog that only classifies consequentiality stays valid. There is deliberately
 * no second ontology: no `AgentToolDescriptor`, no protocol tool type, no parallel registry. An
 * Agent's Active View, a future protocol import, and a future protocol export all derive from
 * *this* descriptor, so one operation has one identity, one description, one schema, and one
 * consequentiality baseline no matter which surface it is projected onto.
 *
 * What must never move in here:
 *
 * ```text
 * who may invoke it          currently exposed?        credentials/secrets
 * backend clients            tenant/user identity      settlement authority
 * ```
 *
 * Those belong to authority, exposure, and executor layers respectively. A descriptor describes;
 * it never permits.
 */

import type { CapabilityId, OperationId } from "../effects/ids.ts";
import type { ObjectSchema } from "../schema/value-schema.ts";

export interface CapabilityOperationDescriptor {
  readonly capability: CapabilityId;
  readonly operation: OperationId;
  readonly consequential: boolean;
  /** Short human/model-facing name. Vocabulary, never identity. */
  readonly title?: string;
  /** What the operation does, in the words a model call should receive. */
  readonly description?: string;
  /** The operation's input contract. Projected to a provider schema; never a permission. */
  readonly input?: ObjectSchema;
  /**
   * Authored grouping labels.
   *
   * Present because the first deterministic exposure resolver selects by them. A group is a label
   * on a descriptor, not a permission set: selecting a group narrows exposure inside authority and
   * can never reach an operation the Execution may not use.
   */
  readonly groups?: readonly string[];
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
  /**
   * Every declared descriptor.
   *
   * Enumeration exists because deterministic exposure by group needs it; it is read-only, it says
   * nothing about permission, and an implementation that cannot enumerate returns an empty list
   * rather than pretending. Group-based exposure over such a catalog then selects nothing, which
   * is the fail-closed answer.
   */
  list(): readonly CapabilityOperationDescriptor[];
}

/** The conservative default: nothing is classified, so nothing is exempted from consequential handling. */
export const emptyCapabilityCatalog: CapabilityCatalog = {
  describe() {
    return undefined;
  },
  list() {
    return [];
  },
};
