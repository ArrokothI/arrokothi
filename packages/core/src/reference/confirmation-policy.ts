/**
 * A reference ConfirmationPolicy: require exact-payload confirmation for selected capability
 * operations.
 *
 * Small and deterministic, so a conformance run can prove the full exact-payload gate without a UI,
 * a provider, or natural-language interpretation. It answers one question: is this
 * `use_capability` proposal's (capability, operation) pair listed as needing a human decision?
 *
 * Everything else - `spawn_execution`, `send_message`, and (deliberately) every `request_user_input`
 * - is `not required`. The kernel gate is generic over the operational Effect kinds; this baseline
 * reference policy just does not exercise them, and it never recursively requires a user interaction
 * merely to ask the user a question.
 */

import type { ConfirmationPolicy, ConfirmationPolicyRequest, ConfirmationRequirement } from "../ports/confirmation-policy.ts";
import { isUseCapabilityProposal } from "../effects/types.ts";

export interface CapabilityConfirmationRule {
  readonly capability: string;
  /** Operations that require confirmation. Omitted means every operation of this capability. */
  readonly operations?: readonly string[];
  /** A human-readable reason surfaced on the ConfirmationRequest and in the audit trail. */
  readonly reason?: string;
}

export interface CapabilityConfirmationPolicyOptions {
  readonly rules: readonly CapabilityConfirmationRule[];
}

export function createCapabilityConfirmationPolicy(options: CapabilityConfirmationPolicyOptions): ConfirmationPolicy {
  return {
    requires(request: ConfirmationPolicyRequest): ConfirmationRequirement {
      if (!isUseCapabilityProposal(request.proposal)) return { required: false };
      const proposal = request.proposal;
      const rule = options.rules.find((candidate) =>
        candidate.capability === (proposal.capability as string) &&
        (candidate.operations === undefined || candidate.operations.includes(proposal.operation as string))
      );
      if (!rule) return { required: false };
      return {
        required: true,
        reason:
          rule.reason ??
          `${proposal.capability}/${proposal.operation} is a consequential operation that requires exact-payload confirmation`,
      };
    },
  };
}
