/**
 * The confirmation-policy seam.
 *
 * This is deliberately *not* a third arm of `AuthorizationDecision`. Authorization stays
 * `allow | deny`. Confirmation is a separate gate evaluated strictly after an `allow`, on the exact
 * concrete Effect proposal, and strictly before dispatch:
 *
 * ```text
 * concrete Effect proposal
 *        ↓ EffectAuthorizer                 deny -> effect.denied
 *        ↓ allow
 * ConfirmationPolicy.requires(...)          not required -> dispatch now
 *        ↓ required
 * persist exact payload + digest + PendingOperation + ConfirmationRequest; wait for approve/decline
 * ```
 *
 * The default is `confirmationNotRequired`, so a workload that configures no policy pays nothing
 * beyond one branch per dispatchable Effect. A policy that throws fails *conservative* - the runtime
 * treats the Effect as requiring confirmation rather than dispatching it unreviewed - which is the
 * mirror of the authorizer failing closed toward deny.
 *
 * Policy lives behind this port so a deployment expresses which consequential actions need a human
 * decision without any provider- or UI-specific vocabulary entering kernel semantics. It never sees
 * a runtime handle, and it cannot grant, widen, or narrow authority.
 */

import type { ExecutionDefinitionRef } from "../definitions/ids.ts";
import type { ActivationId, ExecutionId } from "../execution/ids.ts";
import type { EffectId } from "../effects/ids.ts";
import type { EffectKind, EffectProposal } from "../effects/types.ts";

/** Everything a confirmation policy is allowed to see about one already-authorized request. */
export interface ConfirmationPolicyRequest {
  readonly executionId: ExecutionId;
  readonly ownerExecutionId: ExecutionId | null;
  readonly rootExecutionId: ExecutionId;
  readonly definition: ExecutionDefinitionRef;
  readonly activationId: ActivationId;
  readonly effectId: EffectId;
  readonly effectKind: EffectKind;
  /** The validated proposal exactly as the controller wrote it. */
  readonly proposal: EffectProposal;
  /** The grant the `EffectAuthorizer` just issued. Confirmation runs strictly after `allow`. */
  readonly grantId: string;
  readonly requestedAt: string;
}

export type ConfirmationRequirement =
  | { readonly required: false }
  | { readonly required: true; readonly reason?: string };

export interface ConfirmationPolicy {
  requires(request: ConfirmationPolicyRequest): ConfirmationRequirement | Promise<ConfirmationRequirement>;
}

/** The default: no Effect needs mechanical confirmation. Not a placeholder - the correct baseline. */
export const confirmationNotRequired: ConfirmationPolicy = {
  requires() {
    return { required: false };
  },
};

export interface ConfirmationRequirementIssue {
  readonly path: string;
  readonly message: string;
}

/** An injected policy is checked before it can be trusted, exactly like the authorizer. */
export function confirmationRequirementIssues(requirement: unknown): readonly ConfirmationRequirementIssue[] {
  if (requirement === null || typeof requirement !== "object" || Array.isArray(requirement)) {
    return [{ path: "requirement", message: "expected a confirmation requirement object" }];
  }
  const candidate = requirement as Record<string, unknown>;
  if (candidate["required"] !== true && candidate["required"] !== false) {
    return [{ path: "requirement.required", message: "expected a boolean" }];
  }
  if (candidate["required"] === true && candidate["reason"] !== undefined && typeof candidate["reason"] !== "string") {
    return [{ path: "requirement.reason", message: "expected a string when present" }];
  }
  return [];
}
