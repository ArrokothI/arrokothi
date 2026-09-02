/**
 * The Derived Semantic Memory provider port: store validated claims, retrieve by a semantic query.
 *
 * This is where a retrieval mechanism lives - lexical, embeddings, graph, temporal, metadata
 * filters, reranking, application heuristics, or any combination. The kernel owns the
 * epistemic / provenance / visibility distinctions; the provider owns *how* claims are ranked and
 * returned. `../../docs/memory.md` §14: retrieval strategy is replaceable and is **not** defined as
 * vector search.
 *
 * What a provider may not do:
 *
 * - make an authority decision (that is the resolver's job, and it happens *before* the provider is
 *   ever called);
 * - redefine what a claim, an Event, or Structured Memory means;
 * - require an embedding backend, a graph database, or a network call as part of the contract;
 * - leak a provider-specific object, client, or handle back across this boundary - claims in,
 *   claims out, plain JSON.
 *
 * `collection` is an **opaque** token the resolver hands in. It is a sharing/association dimension,
 * not a permission (`../../docs/memory.md` §11, §26 of the F.3 task): holding one does not authorise
 * a read. There is no ambient "all claims for this user" call.
 */

import type { DerivedSemanticClaim } from "../execution/derived-semantic-memory.ts";
import { derivedSemanticClaimIssues } from "../execution/derived-semantic-memory.ts";

/** An opaque provider collection/namespace token. Identity, never authority. */
export type DerivedSemanticMemoryCollection = string;

export interface DerivedSemanticMemoryAppendRequest {
  readonly collection: DerivedSemanticMemoryCollection;
  readonly claims: readonly DerivedSemanticClaim[];
}

export interface DerivedSemanticMemoryAppendResult {
  /** Claim ids that were newly stored. */
  readonly appended: readonly string[];
  /** Claim ids whose exact record was already present (an idempotent no-op). */
  readonly duplicates: readonly string[];
}

export interface DerivedSemanticMemoryRetrieveRequest {
  readonly collection: DerivedSemanticMemoryCollection;
  readonly query: string;
  /** Maximum claims to return. The provider must not exceed it. */
  readonly limit: number;
}

export interface DerivedSemanticMemoryProvider {
  /**
   * Appends validated claims to a collection. Additive: an existing claim is never destructively
   * rewritten because another arrived. The provider decides its own identity/dedup rule (see the
   * reference provider for the one this slice uses).
   */
  append(
    request: DerivedSemanticMemoryAppendRequest,
  ): Promise<DerivedSemanticMemoryAppendResult> | DerivedSemanticMemoryAppendResult;
  /**
   * Retrieves up to `limit` claims for a semantic query, in the provider's own ranked order.
   *
   * An empty result is a legitimate answer ("nothing relevant"), not an error.
   */
  retrieve(
    request: DerivedSemanticMemoryRetrieveRequest,
  ): Promise<readonly DerivedSemanticClaim[]> | readonly DerivedSemanticClaim[];
  /**
   * Reads one exact claim by id, when a caller (e.g. a promotion decision) needs the full record.
   * Optional: a provider that cannot address a single claim omits it.
   */
  get?(
    collection: DerivedSemanticMemoryCollection,
    claimId: string,
  ): Promise<DerivedSemanticClaim | null> | DerivedSemanticClaim | null;
}

/**
 * Deterministic boundary validation of what a provider returned from `retrieve`.
 *
 * A resolver runs this before it trusts a provider result: a malformed claim in the array is a
 * fail-closed condition, not something to pack into model context. Empty means the array is fine.
 */
export function derivedSemanticMemoryRetrieveResultIssues(
  value: unknown,
  limit: number,
): readonly string[] {
  if (!Array.isArray(value)) return ["the provider returned a non-array from retrieve()"];
  const issues: string[] = [];
  if (value.length > limit) {
    issues.push(`the provider returned ${value.length} claims for a limit of ${limit}`);
  }
  value.forEach((claim, index) => {
    issues.push(...derivedSemanticClaimIssues(claim, `retrieve()[${index}]`));
  });
  return issues;
}
