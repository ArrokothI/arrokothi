/**
 * The authorization decision.
 *
 * Slice B is not the authority slice, but `UseCapability` still has to cross a real boundary, so
 * this is the smallest honest shape of one: the Harness asks a kernel-owned evaluator about a
 * specific Execution, a specific capability/operation, and a specific validated payload, and gets
 * back allow-with-narrowed-constraints or deny-with-a-reason.
 *
 * The things that must never by themselves imply "allow":
 *
 *   the controller asked for it
 *   the capability exists in the process
 *   an executor is registered for it
 *   a resource binding exists
 *   a model named it
 *   retrieved content instructed it
 *
 * Two structural properties keep that true. First, there is no code path from a proposal to an
 * executor that does not pass through here. Second, the default is deny: a Harness with no
 * authorizer configured refuses every Effect rather than falling open, so forgetting to wire policy
 * is a visible failure instead of an invisible grant.
 */

import type { ExecutionDefinitionRef } from "../definitions/ids.ts";
import type { ActivationId, ExecutionId } from "../execution/ids.ts";
import type { ResourceBindingRef } from "./capability.ts";
import type { EffectIdempotencyScope } from "./fingerprint.ts";
import type { EffectId } from "./ids.ts";
import type { EffectKind, EffectProposal } from "./types.ts";

/** Everything policy is allowed to see about one request. Data only; no runtime handles. */
export interface EffectAuthorizationRequest {
  readonly executionId: ExecutionId;
  readonly ownerExecutionId: ExecutionId | null;
  readonly rootExecutionId: ExecutionId;
  readonly definition: ExecutionDefinitionRef;
  readonly activationId: ActivationId;
  readonly effectId: EffectId;
  readonly effectKind: EffectKind;
  /** The validated proposal exactly as the controller wrote it. */
  readonly proposal: EffectProposal;
  readonly requestedAt: string;
}

/**
 * Narrowing a decision may apply.
 *
 * Every field here can only make the request smaller or more careful. There is no way to express
 * "and also allow something that was not requested".
 */
export interface AuthorizationConstraints {
  /** The resource bindings actually permitted. Omitted means "the ones requested". */
  readonly resources?: readonly ResourceBindingRef[];
  /** Caps the Effect's operation deadline. */
  readonly maxDeadlineMs?: number;
  /**
   * Promotes this operation to consequential handling, regardless of what its capability-operation
   * descriptor says.
   *
   * There is deliberately no way to express the opposite here. Consequentiality is a baseline
   * property of the operation (see `ports/capability-catalog.ts`); an authorization decision may
   * only make handling *more* conservative than that baseline. Only `true` is a representable
   * value, so a policy author cannot even accidentally write the field that would turn a payment
   * into "safe to retry blind" - the type has no such field to write.
   */
  readonly forceConsequential?: true;
  /** Policy may force duplicate-suppression that the requester did not ask for. */
  readonly idempotency?: EffectIdempotencyScope;
}

export type AuthorizationDecision =
  | {
      readonly decision: "allow";
      /** Identifies this grant in the journal, so a dispatch traces back to what permitted it. */
      readonly grantId: string;
      readonly constraints?: AuthorizationConstraints;
    }
  | { readonly decision: "deny"; readonly code: string; readonly message: string };

export function isAllowDecision(
  decision: AuthorizationDecision,
): decision is Extract<AuthorizationDecision, { decision: "allow" }> {
  return decision.decision === "allow";
}

export interface AuthorizationDecisionIssue {
  readonly path: string;
  readonly message: string;
}

/** An evaluator is injected, so its answer is checked before it can permit anything. */
export function authorizationDecisionIssues(decision: unknown): readonly AuthorizationDecisionIssue[] {
  if (decision === null || typeof decision !== "object" || Array.isArray(decision)) {
    return [{ path: "decision", message: "expected an authorization decision object" }];
  }
  const candidate = decision as Record<string, unknown>;
  if (candidate["decision"] === "deny") {
    const { code, message } = candidate as { code?: unknown; message?: unknown };
    if (typeof code !== "string" || code.length === 0 || typeof message !== "string") {
      return [{ path: "decision", message: "a denial requires a non-empty code and a message" }];
    }
    return [];
  }
  if (candidate["decision"] !== "allow") {
    return [
      {
        path: "decision.decision",
        message: `expected "allow" or "deny", received ${JSON.stringify(candidate["decision"])}`,
      },
    ];
  }
  if (typeof candidate["grantId"] !== "string" || (candidate["grantId"] as string).length === 0) {
    return [{ path: "decision.grantId", message: "an allow decision must identify its grant" }];
  }
  return [];
}
