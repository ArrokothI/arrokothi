/**
 * What crosses the capability boundary, in both directions.
 *
 * The request side is the interesting half. An `AuthorizedCapabilityRequest` is what the Harness
 * hands to an executor *after* a policy decision, and its contents are chosen by subtraction: it
 * carries logical names and validated data, and it carries no way to get anywhere else. There is no
 * tenant, no user object, no secret, no provider client, no database connection, no `RuntimeStore`,
 * and no `Harness`. An executor that wanted to reach the Execution's memory or lifecycle has
 * nothing here to reach it with, which is the point - `CapabilityOutcome` returns observations, and
 * the Harness alone turns observations into Events.
 *
 * `ResourceBindingRef` is likewise a logical name plus an access mode. Binding says an Execution is
 * *eligible* to use a resource; the executor resolves the name to a credential or connection behind
 * the port, where semantic code cannot see it.
 */

import type { ExecutionId } from "../execution/ids.ts";
import type { JsonObject } from "../util/json.ts";
import type { AuthorizationEvidence } from "./types.ts";
import type {
  CapabilityId,
  EffectId,
  IdempotencyKey,
  OperationId,
  PendingOperationId,
  ResourceBindingId,
} from "./ids.ts";

export type ResourceAccessMode = "read" | "write";

/** A logical binding: which resource, and in what mode. Never a credential or a transport. */
export interface ResourceBindingRef {
  readonly bindingId: ResourceBindingId;
  readonly mode: ResourceAccessMode;
}

/**
 * The narrowed grant an authorization decision produced.
 *
 * The executor sees what was *allowed*, not what was asked for. `grantId` makes a dispatch
 * traceable back to the decision that permitted it.
 */
export interface AuthorizedGrant {
  readonly grantId: string;
  /** Resource bindings policy actually permitted, which may be narrower than the request. */
  readonly resources: readonly ResourceBindingRef[];
  /**
   * Whether this operation may change world state.
   *
   * Owned by policy, never by the requester: a controller cannot declare its own action harmless.
   * It decides how a lost response is interpreted - a consequential operation whose result never
   * arrives is an *unknown* outcome, not a failure, because the effect may well have happened.
   */
  readonly consequential: boolean;
  /** Evidence policy considered, recorded so a decision can be reviewed later. */
  readonly evidence?: AuthorizationEvidence;
}

/** Cancellation as data, mirroring the controller port: an executor is told, not handed a channel. */
export interface CapabilityCancellation {
  readonly cancelled: boolean;
  readonly reason: string | null;
}

export interface AuthorizedCapabilityRequest {
  readonly executionId: ExecutionId;
  readonly effectId: EffectId;
  readonly pendingOperationId: PendingOperationId;
  /** The label the eventual result Event will carry. */
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly capability: CapabilityId;
  readonly operation: OperationId;
  /** Validated request payload. Plain JSON by construction. */
  readonly input: JsonObject;
  readonly resources: readonly ResourceBindingRef[];
  /**
   * When this operation stops being allowed to remain unresolved.
   *
   * This is the Effect's own deadline. It is not the Activation's inline wait budget, and it does
   * not shorten because the Activation decided to yield.
   */
  readonly deadline: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly authorization: AuthorizedGrant;
  readonly cancellation: CapabilityCancellation;
}

/** Deployment trust posture, so an executor can refuse work its environment cannot honestly do. */
export type SecurityProfile = "trusted-local";

/**
 * Ambient facts about the environment a dispatch happens in.
 *
 * Data only, for the same reason as the request: an environment context containing a handle would
 * be a path around the Harness.
 */
export interface CapabilityExecutionEnvironment {
  readonly profile: SecurityProfile;
  readonly dispatchedAt: string;
}
