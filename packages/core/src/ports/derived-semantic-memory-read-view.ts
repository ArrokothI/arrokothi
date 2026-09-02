/**
 * The authorized Derived Semantic Memory retrieval seam.
 *
 * An Execution must never receive ambient access to all provider memory. It sees Derived Semantic
 * Memory only through this narrow, controller-neutral resolver - exactly the pattern F.1 established
 * for Structured Memory reads.
 *
 * The resolver owns:
 *
 * ```text
 * authorization / visibility        deny-by-default, decided BEFORE any provider retrieval
 * provider access                   the resolver holds the provider; the controller never does
 * the opaque collection token       scope/association, not permission
 * a plain bounded projection        model-facing claim views only
 * ```
 *
 * A controller that holds this port does **not** hold the `DerivedSemanticMemoryProvider`, a
 * `RuntimeStore`, the `Harness`, an `EffectAuthorizer`, provider credentials, or any vector/graph
 * handle. Derived read authority is its own thing: it does not imply Structured Memory read or write
 * authority, and neither of those implies it.
 *
 * No-oracle rule: a denied retrieval performs **zero** provider `retrieve` calls. Provider
 * existence or results never decide whether policy is checked.
 */

import type { DerivedSemanticMemoryReadView } from "../execution/derived-semantic-memory.ts";

export interface DerivedSemanticMemoryReadRequest {
  /** Addressing only; an Execution id is not a credential. */
  readonly executionId: string;
  /** The authored retrieval intent. */
  readonly query: string;
  /** Maximum claims the caller will accept. The resolver must not exceed it. */
  readonly limit: number;
  /** Byte ceiling for the returned snapshot's canonical JSON. The resolver must not exceed it. */
  readonly maxBytes: number;
}

export interface DerivedSemanticMemoryReadResolver {
  /**
   * Resolves the authorized, bounded snapshot, or `null`.
   *
   * `null` means "not authorized / not wired / no collection" - the controller adds no Derived
   * Memory context and (crucially) the provider was not consulted. A view with `claims: []` means
   * "authorized, provider consulted, nothing relevant" - also no context block, but not the same
   * situation.
   */
  resolve(
    request: DerivedSemanticMemoryReadRequest,
  ): Promise<DerivedSemanticMemoryReadView | null> | DerivedSemanticMemoryReadView | null;
}

/**
 * The fail-closed default: every request resolves to nothing.
 *
 * A deployment that wired no Derived Semantic Memory resolver has no configured Derived read
 * authority, and "nobody wired it" must not look like "this memory is readable".
 */
export const noDerivedSemanticMemoryRead: DerivedSemanticMemoryReadResolver = {
  resolve() {
    return null;
  },
};
