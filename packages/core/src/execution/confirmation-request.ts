/**
 * ConfirmationRequest: the runtime's record of one exact-payload mechanical confirmation.
 *
 * Mechanical confirmation is an *optional execution gate on one already-concrete Effect payload*, and
 * it sits strictly after authorization:
 *
 * ```text
 * concrete Effect proposal
 *        ↓ EffectAuthorizer                       deny  -> effect.denied (no confirmation)
 *        ↓ allow
 * confirmation policy                             not required -> dispatch immediately
 *        ↓ required
 * persist: exact proposal + its canonical digest, the Effect PendingOperation, this record
 *        ↓ trusted approve / decline
 * approve  -> re-check CURRENT authority, then dispatch the STORED exact proposal
 * decline  -> settle the dependency as a decline; nothing is dispatched
 * ```
 *
 * Read it as a list of things it is not:
 *
 * ```text
 * confirmationId is not an authority token   approval never widens or replaces authority; the
 *                                            runtime re-checks the current ceiling before dispatch
 * approval is not a bearer grant             an old approval cannot override a later revocation
 * this record is not RequestUserInput        it gates one concrete payload with a trusted
 *                                            approve/decline, never free prose
 * the digest binds the EXACT payload         a different payload is a different confirmation; an old
 *                                            approval can never be inherited by changed arguments
 * ```
 *
 * The digest is a canonical JSON hash of the stored proposal (`hashValue` / `canonicalJson`), so key
 * order and argument order never change it and two byte-equal payloads produce the same digest.
 */

import type { EffectId, PendingOperationId } from "../effects/ids.ts";
import type { EffectKind, EffectProposal } from "../effects/types.ts";
import { hashValue } from "../util/hash.ts";
import type { JsonValue } from "../util/json.ts";
import type { ExecutionId } from "./ids.ts";

export type ConfirmationRequestState = "pending" | "approved" | "declined" | "abandoned";

export interface ConfirmationRequest {
  /** Runtime-minted identity. Correlation/integrity data, never an authorization credential. */
  readonly confirmationId: string;
  readonly executionId: ExecutionId;
  readonly effectId: EffectId;
  readonly effectKind: EffectKind;
  /** The exact PendingOperation an approved dispatch settles, or a decline settles as `declined`. */
  readonly pendingOperationId: PendingOperationId;
  /** The correlation the eventual result / `confirmation.declined` Event carries. */
  readonly correlationId: string;
  /** The exact validated Effect proposal this confirmation gates. */
  readonly proposal: EffectProposal;
  /** Canonical digest of `proposal`. A different payload is a different confirmation. */
  readonly proposalDigest: string;
  /** The policy's stated reason confirmation was required, when it gave one. */
  readonly reason: string | null;
  readonly state: ConfirmationRequestState;
  readonly createdAt: string;
  /** Set once approved / declined / abandoned. */
  readonly resolvedAt: string | null;
}

export interface CreateConfirmationRequestInput {
  readonly confirmationId: string;
  readonly executionId: ExecutionId;
  readonly effectId: EffectId;
  readonly effectKind: EffectKind;
  readonly pendingOperationId: PendingOperationId;
  readonly correlationId: string;
  readonly proposal: EffectProposal;
  readonly reason?: string | null;
  readonly createdAt: string;
}

/** Canonical digest of an Effect proposal. Argument/key order never changes the result. */
export function proposalDigest(proposal: EffectProposal): string {
  return hashValue(proposal as unknown as JsonValue);
}

export function createConfirmationRequest(input: CreateConfirmationRequestInput): ConfirmationRequest {
  return {
    confirmationId: input.confirmationId,
    executionId: input.executionId,
    effectId: input.effectId,
    effectKind: input.effectKind,
    pendingOperationId: input.pendingOperationId,
    correlationId: input.correlationId,
    proposal: input.proposal,
    proposalDigest: proposalDigest(input.proposal),
    reason: input.reason ?? null,
    state: "pending",
    createdAt: input.createdAt,
    resolvedAt: null,
  };
}

/** Marks the human's decision. Idempotent, so an approve/decline race linearizes to one winner. */
export function markConfirmationApproved(request: ConfirmationRequest, at: string): ConfirmationRequest {
  if (request.state !== "pending") return request;
  return { ...request, state: "approved", resolvedAt: at };
}

export function markConfirmationDeclined(request: ConfirmationRequest, at: string): ConfirmationRequest {
  if (request.state !== "pending") return request;
  return { ...request, state: "declined", resolvedAt: at };
}

/** The requesting Execution terminalized before the confirmation was resolved. Idempotent. */
export function markConfirmationAbandoned(request: ConfirmationRequest, at: string): ConfirmationRequest {
  if (request.state !== "pending") return request;
  return { ...request, state: "abandoned", resolvedAt: at };
}

export function isPendingConfirmation(request: ConfirmationRequest): boolean {
  return request.state === "pending";
}
