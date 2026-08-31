/**
 * A reference EffectAuthorizer: an explicit allow-list.
 *
 * Small on purpose. Slice B needs a boundary that is real, inspectable, and impossible for a
 * controller to talk its way past - not the full authority-envelope and delegation model, which
 * later slices own. So this evaluates one question: is this (capability, operation, resources)
 * triple listed for this Execution, and what narrowing applies?
 *
 * Everything it does is subtractive. It can deny, it can restrict the resource bindings a request
 * gets, it can cap the operation deadline, it can force duplicate-suppression, and it can declare an
 * operation consequential. It cannot grant anything that was not asked for, and there is no rule
 * shape that says "allow whatever the controller wanted".
 *
 * Effect kinds other than `UseCapability` are denied here too, though the Harness refuses them
 * before policy is ever consulted - which kind of Effect the runtime can perform is a kernel fact,
 * not a policy one. The branch stays because an authorizer is a public component that application
 * code may call directly, and it should not answer "allow" for something nothing can do.
 */

import type { AuthorizationDecision, EffectAuthorizationRequest } from "../effects/authorization.ts";
import type { ResourceAccessMode, ResourceBindingRef } from "../effects/capability.ts";
import type { EffectIdempotencyScope } from "../effects/fingerprint.ts";
import { resourceBindingId } from "../effects/ids.ts";
import type { EffectAuthorizer } from "../ports/effect-authorizer.ts";
import { isUseCapabilityProposal } from "../effects/types.ts";

export interface CapabilityGrantRule {
  /** Plain strings: this is application configuration, so the factory brands and validates. */
  readonly capability: string;
  /** Operations permitted on this capability. Omitted means every operation of it. */
  readonly operations?: readonly string[];
  /** Resource bindings permitted. Omitted means the capability needs none. */
  readonly resources?: readonly { readonly bindingId: string; readonly mode: ResourceAccessMode }[];
  /**
   * Whether this operation may change world state.
   *
   * Defaults to `true`, which is the safe direction: a lost response for an operation that might
   * have taken effect is an unknown outcome, not a failure. Declare `false` only for genuinely
   * read-only capabilities.
   */
  readonly consequential?: boolean;
  /** Forces duplicate-suppression regardless of what the requester asked for. */
  readonly idempotency?: EffectIdempotencyScope;
  readonly maxDeadlineMs?: number;
}

export interface AllowListAuthorizerOptions {
  readonly grants: readonly CapabilityGrantRule[];
  /** Restricts the whole allow-list to named Executions. Omitted means every Execution. */
  readonly executions?: readonly string[];
}

export function createAllowListAuthorizer(options: AllowListAuthorizerOptions): EffectAuthorizer {
  let issued = 0;

  return {
    authorize(request: EffectAuthorizationRequest): AuthorizationDecision {
      if (options.executions && !options.executions.includes(request.executionId)) {
        return {
          decision: "deny",
          code: "execution_not_authorized",
          message: `execution ${request.executionId} holds no capability authority under this policy`,
        };
      }

      if (!isUseCapabilityProposal(request.proposal)) {
        return {
          decision: "deny",
          code: "effect_kind_not_supported",
          message: `effect kind "${request.effectKind}" is accepted vocabulary but has no implementation in this slice; its owning slice will provide one`,
        };
      }

      const proposal = request.proposal;
      const rule = options.grants.find((candidate) => candidate.capability === (proposal.capability as string));
      if (!rule) {
        return {
          decision: "deny",
          code: "capability_not_authorized",
          message: `capability "${proposal.capability}" is not in this Execution's authority`,
        };
      }
      if (rule.operations && !rule.operations.includes(proposal.operation as string)) {
        return {
          decision: "deny",
          code: "operation_not_authorized",
          message: `operation "${proposal.operation}" is not authorized on capability "${proposal.capability}"`,
        };
      }

      const permitted: readonly ResourceBindingRef[] = (rule.resources ?? []).map((resource) => ({
        bindingId: resourceBindingId(resource.bindingId),
        mode: resource.mode,
      }));
      const requested = proposal.resources ?? [];
      const unauthorized = requested.filter(
        (bindingId) => !permitted.some((resource) => resource.bindingId === bindingId),
      );
      if (unauthorized.length > 0) {
        return {
          decision: "deny",
          code: "resource_not_authorized",
          message: `resource binding(s) ${unauthorized.join(", ")} are not bound to this Execution for "${proposal.capability}"`,
        };
      }

      // Narrowing, never widening: the grant carries only the bindings that were both requested and
      // permitted, so an executor cannot reach a resource the controller never asked about.
      const resources = permitted.filter((resource) => requested.includes(resource.bindingId));

      issued += 1;
      return {
        decision: "allow",
        grantId: `grant_${issued}`,
        constraints: {
          resources,
          consequential: rule.consequential ?? true,
          ...(rule.idempotency !== undefined ? { idempotency: rule.idempotency } : {}),
          ...(rule.maxDeadlineMs !== undefined ? { maxDeadlineMs: rule.maxDeadlineMs } : {}),
        },
      };
    },
  };
}
