/**
 * A reference EffectAuthorizer: an explicit allow-list.
 *
 * Small on purpose. Slice B needs a boundary that is real, inspectable, and impossible for a
 * controller to talk its way past - not the full authority-envelope and delegation model, which
 * later slices own. So this evaluates one question: is this (capability, operation, resources)
 * triple listed for this Execution, and what narrowing applies?
 *
 * Everything it does is subtractive. It can deny, it can restrict the resource bindings a request
 * gets, it can cap the operation deadline, and it can force duplicate-suppression. It cannot grant
 * anything that was not asked for, and there is no rule shape that says "allow whatever the
 * controller wanted".
 *
 * Consequentiality is deliberately not something a grant can turn off. Its baseline lives on a
 * `CapabilityCatalog` descriptor (see `ports/capability-catalog.ts`); a rule here may only set
 * `forceConsequential: true` to promote handling beyond that baseline, never to relax it. There is
 * no way to write a rule that downgrades a descriptor-declared consequential operation.
 *
 * Operational `SpawnExecution` and `SendMessage` proposals have their own explicit rules below.
 * Other non-capability Effect kinds are denied because their owning runtime slices have not made
 * them dispatchable; an authorizer is public and must not answer "allow" for unsupported work.
 */

import type { AuthorizationDecision, EffectAuthorizationRequest } from "../effects/authorization.ts";
import type { ResourceAccessMode, ResourceBindingRef } from "../effects/capability.ts";
import type { EffectIdempotencyScope } from "../effects/fingerprint.ts";
import { resourceBindingId } from "../effects/ids.ts";
import type { EffectAuthorizer } from "../ports/effect-authorizer.ts";
import { isSendMessageProposal, isSpawnExecutionProposal, isUseCapabilityProposal } from "../effects/types.ts";

export interface CapabilityGrantRule {
  /** Plain strings: this is application configuration, so the factory brands and validates. */
  readonly capability: string;
  /** Operations permitted on this capability. Omitted means every operation of it. */
  readonly operations?: readonly string[];
  /** Resource bindings permitted. Omitted means the capability needs none. */
  readonly resources?: readonly { readonly bindingId: string; readonly mode: ResourceAccessMode }[];
  /**
   * Promotes this operation to consequential handling beyond its catalog baseline.
   *
   * Only `true` does anything; there is no way to use this field to make a descriptor-declared
   * consequential operation non-consequential. Whether an operation is *normally* safe to retry
   * blind is declared on a `CapabilityCatalog` descriptor, not here.
   */
  readonly forceConsequential?: boolean;
  /** Forces duplicate-suppression regardless of what the requester asked for. */
  readonly idempotency?: EffectIdempotencyScope;
  readonly maxDeadlineMs?: number;
}

/**
 * Whether this policy permits `SpawnExecution`.
 *
 * `true` allows any child Definition; a `{ definitions }` list allows only those definition ids.
 * Omitted (the default) denies every spawn - "requested requirement is not a grant" applies to
 * child creation exactly as it does to capabilities.
 */
export type SpawnGrantRule = boolean | { readonly definitions: readonly string[] };

/**
 * Whether this policy permits `SendMessage` (`send` / `ask` / `reply`).
 *
 * `true` allows a message to any destination; a `{ destinations }` list allows only those Execution
 * ids. Omitted (the default) denies every send - "knowing a peer's ExecutionId is not permission to
 * message it". A `reply` is an outbound send and is checked here exactly like a fresh `send`: holding
 * request/correlation metadata does not bypass this rule. Peer destinations are deliberately *not*
 * modelled as capability operations - they are not operations - so this first peer-messaging runtime
 * treats the policy boundary itself as the effective decision for peer sends.
 */
export type MessageGrantRule = boolean | { readonly destinations: readonly string[] };

export interface AllowListAuthorizerOptions {
  readonly grants: readonly CapabilityGrantRule[];
  /** Restricts the whole allow-list to named Executions. Omitted means every Execution. */
  readonly executions?: readonly string[];
  /** Whether `SpawnExecution` is permitted, and for which child Definitions. Default: denied. */
  readonly spawn?: SpawnGrantRule;
  /** Whether `SendMessage` is permitted, and to which destinations. Default: denied. */
  readonly message?: MessageGrantRule;
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

      if (isSpawnExecutionProposal(request.proposal)) {
        const rule = options.spawn ?? false;
        const allowed =
          rule === true ||
          (typeof rule === "object" && rule.definitions.includes(request.proposal.definitionId));
        if (!allowed) {
          return {
            decision: "deny",
            code: "spawn_not_authorized",
            message:
              `execution ${request.executionId} is not authorized to spawn ` +
              `${request.proposal.definitionId}@${request.proposal.definitionVersion} under this policy`,
          };
        }
        issued += 1;
        return { decision: "allow", grantId: `grant_${issued}` };
      }

      if (isSendMessageProposal(request.proposal)) {
        const rule = options.message ?? false;
        // Replies name the concrete requester as `to`, so destination-scoped policy constrains them
        // before the runtime resolves the request link. Link resolution later verifies that `to`
        // matches runtime truth; policy authorization can never redirect the reply.
        const allowed =
          rule === true ||
          (typeof rule === "object" &&
            request.proposal.to !== undefined &&
            rule.destinations.includes(request.proposal.to));
        if (!allowed) {
          return {
            decision: "deny",
            code: "message_not_authorized",
            message:
              `execution ${request.executionId} is not authorized to send messages` +
              ` to ${request.proposal.to}` +
              " under this policy",
          };
        }
        issued += 1;
        return { decision: "allow", grantId: `grant_${issued}` };
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
          ...(rule.forceConsequential === true ? { forceConsequential: true } : {}),
          ...(rule.idempotency !== undefined ? { idempotency: rule.idempotency } : {}),
          ...(rule.maxDeadlineMs !== undefined ? { maxDeadlineMs: rule.maxDeadlineMs } : {}),
        },
      };
    },
  };
}
