/**
 * Effective operation authority: the runtime-owned ceiling on what one Execution may use.
 *
 * This is layer two of the four, and the only one that is a *permission*. The catalog says what
 * exists, the Active View says what is exposed, the projection says what one model call saw; this
 * record says what the runtime has actually decided this Execution may legally use.
 *
 * ```text
 * application / deployment policy supplies root grants at creation
 *          ↓
 * the runtime computes and stores this record
 *          ↓ read-only
 * exposure resolution may narrow it, never widen it
 *          ↓
 * the concrete Effect is authorized again at dispatch, and that check is decisive
 * ```
 *
 * Ownership is the whole point. An Agent definition cannot contain one of these, cannot ask for
 * one, and cannot mutate one: it is written by the runtime when the Execution is created and read
 * by nothing that can dispatch. A controller never receives the record - it receives, at most, a
 * deterministic narrowing of it that is already plain data.
 *
 * Two things this record deliberately is not. It is not a policy language: the current kernel needs
 * an allow-set of operation identities and nothing more, and a general grant/constraint/expiry
 * vocabulary would be speculative. And it is not the decisive authorization: an
 * operation in this set may still be denied at dispatch, because authority may have changed or
 * because the concrete payload is not allowed. Exposure derived from a stale or buggy view can
 * therefore cause a denial; it can never cause a bypass.
 *
 * `version` exists so a later narrowing is observable rather than silent.
 */

import type { OperationRef } from "./refs.ts";
import { compareOperationRefs, formatOperationRef, isSameOperationRef } from "./refs.ts";

/**
 * A typed reference to a stored authority record.
 *
 * Held by the Execution record in place of an earlier opaque string. Holding one grants nothing:
 * it is an address into runtime-owned state, and there is no read path from a controller to it.
 */
export interface OperationAuthorityRef {
  readonly authorityId: string;
}

export function operationAuthorityRef(authorityId: string): OperationAuthorityRef {
  if (typeof authorityId !== "string" || authorityId.length === 0) {
    throw new TypeError("an operation authority ref needs a non-empty id");
  }
  return { authorityId };
}

/** What an application/deployment supplies when it creates a root Execution. */
export interface OperationAuthorityGrant {
  /** The operations this Execution may use. An empty list is a real answer: none. */
  readonly operations: readonly OperationRef[];
}

/**
 * The stored record.
 *
 * Plain JSON, like everything else that crosses an Activation, so a durable runtime stores it
 * without translation and a conformance run can assert it contains no handle of any kind.
 */
export interface EffectiveOperationAuthority {
  readonly authorityId: string;
  readonly executionId: string;
  /** Bumped by any later narrowing, so an Active View can record which ceiling it was cut from. */
  readonly version: number;
  /** Deduplicated and ordered, so two equal grants produce byte-identical records. */
  readonly operations: readonly OperationRef[];
  /**
   * Where this ceiling came from.
   *
   * `root_grant` is application/deployment policy at creation. `delegated` is a child ceiling the
   * runtime computed by attenuating a parent's *current* effective authority against a spawn
   * request - never wider than the parent, never derived from the child's Definition.
   */
  readonly source: "root_grant" | "delegated";
  /** Present only for `delegated`: the parent ceiling this was attenuated from, for provenance. */
  readonly delegatedFrom?: { readonly authorityId: string; readonly executionId: string };
  readonly grantedAt: string;
}

export interface CreateOperationAuthorityInput {
  readonly authorityId: string;
  readonly executionId: string;
  readonly grant: OperationAuthorityGrant;
  readonly grantedAt: string;
}

export function createEffectiveOperationAuthority(input: CreateOperationAuthorityInput): EffectiveOperationAuthority {
  const seen = new Set<string>();
  const operations: OperationRef[] = [];
  for (const ref of input.grant.operations) {
    const key = formatOperationRef(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    operations.push({ capability: ref.capability, operation: ref.operation });
  }
  operations.sort(compareOperationRefs);
  return {
    authorityId: input.authorityId,
    executionId: input.executionId,
    version: 1,
    operations,
    source: "root_grant",
    grantedAt: input.grantedAt,
  };
}

/**
 * Attenuate a spawn request against the parent's current effective authority.
 *
 * ```text
 * child operations = requestedOperations ∩ parent effective authority
 * ```
 *
 * `parent` is read fresh at spawn time, so a request prepared while an operation was still possible
 * yields nothing once the parent's ceiling has been narrowed. A `null` parent has no delegable
 * authority, so the result is empty whatever was requested. This is the whole of "delegable" in the
 * first implementation: only the parent's *current effective* authority is delegable, and the child
 * receives only the explicit requested intersection of it - there is no separate delegability flag
 * to widen that, and an empty request is never "everything".
 */
export function attenuateChildOperations(
  parent: EffectiveOperationAuthority | null | undefined,
  requestedOperations: readonly OperationRef[],
): readonly OperationRef[] {
  if (!parent) return [];
  const seen = new Set<string>();
  const attenuated: OperationRef[] = [];
  for (const ref of requestedOperations) {
    const key = formatOperationRef(ref);
    if (seen.has(key)) continue;
    if (!parent.operations.some((candidate) => isSameOperationRef(candidate, ref))) continue;
    seen.add(key);
    attenuated.push({ capability: ref.capability, operation: ref.operation });
  }
  attenuated.sort(compareOperationRefs);
  return attenuated;
}

export interface CreateDelegatedOperationAuthorityInput {
  readonly authorityId: string;
  readonly executionId: string;
  readonly operations: readonly OperationRef[];
  /** The parent ceiling this was attenuated from. Absent when the parent had no ceiling at all. */
  readonly delegatedFrom?: { readonly authorityId: string; readonly executionId: string };
  readonly grantedAt: string;
}

/**
 * The child's own effective operation authority record.
 *
 * `version` is 1: this is a fresh ceiling for a new Execution, not a narrowing of the parent's. The
 * Harness writes it; a child controller never does. `operations` is already the attenuated set - a
 * child Definition requesting more cannot enlarge it.
 */
export function createDelegatedOperationAuthority(
  input: CreateDelegatedOperationAuthorityInput,
): EffectiveOperationAuthority {
  const seen = new Set<string>();
  const operations: OperationRef[] = [];
  for (const ref of input.operations) {
    const key = formatOperationRef(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    operations.push({ capability: ref.capability, operation: ref.operation });
  }
  operations.sort(compareOperationRefs);
  return {
    authorityId: input.authorityId,
    executionId: input.executionId,
    version: 1,
    operations,
    source: "delegated",
    ...(input.delegatedFrom ? { delegatedFrom: input.delegatedFrom } : {}),
    grantedAt: input.grantedAt,
  };
}

/**
 * Whether one operation is inside the ceiling.
 *
 * `null` authority is not "unrestricted" - it is "nothing was configured", and it answers `false`.
 * An unconfigured Execution exposes nothing at all, for the same reason an unconfigured Harness
 * denies every Effect: forgetting to wire authority must be visible, not permissive.
 */
export function authorizesOperation(
  authority: EffectiveOperationAuthority | null | undefined,
  ref: OperationRef,
): boolean {
  if (!authority) return false;
  return authority.operations.some((candidate) => isSameOperationRef(candidate, ref));
}

export interface AuthorityIssue {
  readonly path: string;
  readonly message: string;
}

/** Structural check for an application-supplied grant, before the runtime stores anything. */
export function operationAuthorityGrantIssues(grant: unknown, path = "operationAuthority"): readonly AuthorityIssue[] {
  if (grant === null || typeof grant !== "object" || Array.isArray(grant)) {
    return [{ path, message: "expected an operation authority grant object" }];
  }
  const operations = (grant as { operations?: unknown }).operations;
  if (!Array.isArray(operations)) {
    return [{ path: `${path}.operations`, message: "expected an array of operation refs" }];
  }
  const issues: AuthorityIssue[] = [];
  operations.forEach((ref, index) => {
    const at = `${path}.operations[${index}]`;
    if (ref === null || typeof ref !== "object" || Array.isArray(ref)) {
      issues.push({ path: at, message: "expected an operation ref object" });
      return;
    }
    const candidate = ref as Record<string, unknown>;
    if (typeof candidate["capability"] !== "string" || (candidate["capability"] as string).length === 0) {
      issues.push({ path: `${at}.capability`, message: "expected a capability name" });
    }
    if (typeof candidate["operation"] !== "string" || (candidate["operation"] as string).length === 0) {
      issues.push({ path: `${at}.operation`, message: "expected an operation name" });
    }
  });
  return issues;
}
