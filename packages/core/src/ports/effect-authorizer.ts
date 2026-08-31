/**
 * The Effect authorization port.
 *
 * The Harness consults this before every dispatch, and there is no other way to reach an executor.
 * Policy lives behind the port so an application can express its own rules - tenancy, world rules,
 * budgets, confirmation requirements - without any of that vocabulary entering kernel semantics.
 *
 * The default matters as much as the interface. A Harness constructed without an authorizer uses
 * `denyAllEffects`, so an unconfigured runtime refuses every Effect instead of quietly permitting
 * them. An unwired policy and a permissive policy must never look the same.
 */

import type { AuthorizationDecision, EffectAuthorizationRequest } from "../effects/authorization.ts";

export interface EffectAuthorizer {
  authorize(request: EffectAuthorizationRequest): Promise<AuthorizationDecision> | AuthorizationDecision;
}

/** The fail-closed default. Not a placeholder: it is the correct behaviour with no policy present. */
export const denyAllEffects: EffectAuthorizer = {
  authorize() {
    return {
      decision: "deny",
      code: "no_authorizer_configured",
      message:
        "this Harness has no EffectAuthorizer, so no Effect can be authorized; requesting an Effect is never permission to perform it",
    };
  },
};
