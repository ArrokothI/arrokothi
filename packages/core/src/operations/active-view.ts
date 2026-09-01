/**
 * The Active Operation View: the authorized subset that is exposed right now.
 *
 * Layer three of four. It is a *deterministic narrowing* and nothing else - there is no field here
 * that can widen anything, and membership in this object is not permission:
 *
 * ```text
 * catalog membership      ≠ permission
 * Active View membership  ≠ permission
 * model-visible tool      ≠ permission
 * ```
 *
 * The view is plain JSON with a stable order and a content-derived `viewId`, so two resolutions
 * over identical inputs are structurally identical and a changed ceiling or catalog produces a
 * visibly different view. That identity is correlation/integrity data: it explains which narrowing
 * a projection was cut from. It is not a credential, and nothing can be dispatched by knowing one.
 *
 * `omitted` is the honest half. An operation that was requested but is outside authority, absent
 * from the catalog, missing the description/schema a model call needs, or past the authored bound
 * is recorded with the reason it did not make it. That is diagnosis, not denial, and it is what
 * makes "the Agent asked for B and has authority only over A" observable instead of mysterious.
 */

import type { ObjectSchema } from "../schema/value-schema.ts";
import { hashValue } from "../util/hash.ts";
import type { OperationRef } from "./refs.ts";
import { compareOperationRefs } from "./refs.ts";

/**
 * One exposed operation.
 *
 * Everything here is copied from the catalog descriptor that owns it. The view does not invent
 * description or schema, and it carries no executor, no binding to a backend, and no authority.
 */
export interface ActiveOperationEntry {
  readonly capability: string;
  readonly operation: string;
  readonly title: string;
  readonly description: string;
  readonly input: ObjectSchema;
  /** Copied from the catalog so exposure never disagrees with the dispatch-time baseline. */
  readonly consequential: boolean;
  readonly groups: readonly string[];
}

export type OmittedExposureReason =
  /** No effective operation authority is configured for this Execution. Fails closed. */
  | "no_authority"
  /** Requested, but outside this Execution's ceiling. Asking is not receiving. */
  | "not_authorized"
  /** Authorized, but no catalog descriptor declares it. */
  | "not_in_catalog"
  /** Present, but missing the description or input schema a model projection requires. */
  | "not_projectable"
  /** Authorized and projectable, but past the authored `maxOperations` bound. */
  | "beyond_bound";

export interface OmittedExposure {
  readonly capability: string;
  readonly operation: string;
  readonly reason: OmittedExposureReason;
}

export interface ActiveOperationView {
  /** Content-derived identity. Correlation and integrity only; never authority. */
  readonly viewId: string;
  /** The ceiling this view was cut from, or `null` when none is configured. */
  readonly authorityId: string | null;
  readonly authorityVersion: number;
  /** Ordered by `(capability, operation)`, so identical inputs order identically. */
  readonly entries: readonly ActiveOperationEntry[];
  readonly omitted: readonly OmittedExposure[];
}

export function compareActiveOperationEntries(a: ActiveOperationEntry, b: ActiveOperationEntry): number {
  return compareOperationRefs(a, b);
}

export function activeOperationRefs(view: ActiveOperationView): readonly OperationRef[] {
  return view.entries.map((entry) => ({ capability: entry.capability, operation: entry.operation }));
}

export function findActiveOperation(view: ActiveOperationView, ref: OperationRef): ActiveOperationEntry | undefined {
  return view.entries.find((entry) => entry.capability === ref.capability && entry.operation === ref.operation);
}

/**
 * Builds the view, assigning its content-derived identity.
 *
 * The digest covers the ceiling it was cut from and every exposed entry, so a view whose authority
 * version changed, whose catalog metadata changed, or whose membership changed is a different view
 * even when it happens to expose the same names.
 */
export function createActiveOperationView(input: {
  readonly authorityId: string | null;
  readonly authorityVersion: number;
  readonly entries: readonly ActiveOperationEntry[];
  readonly omitted: readonly OmittedExposure[];
}): ActiveOperationView {
  const entries = [...input.entries].sort(compareActiveOperationEntries);
  const omitted = [...input.omitted].sort((a, b) =>
    compareOperationRefs(a, b) !== 0 ? compareOperationRefs(a, b) : a.reason < b.reason ? -1 : a.reason > b.reason ? 1 : 0,
  );
  const viewId = `aov_${hashValue({
    authorityId: input.authorityId,
    authorityVersion: input.authorityVersion,
    entries,
  })}`;
  return { viewId, authorityId: input.authorityId, authorityVersion: input.authorityVersion, entries, omitted };
}

/** The view an Execution with no configured ceiling gets: empty, and honest about why. */
export function unauthorizedActiveOperationView(omitted: readonly OmittedExposure[] = []): ActiveOperationView {
  return createActiveOperationView({ authorityId: null, authorityVersion: 0, entries: [], omitted });
}
