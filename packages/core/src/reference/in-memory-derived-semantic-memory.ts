/**
 * A reference in-memory `DerivedSemanticMemoryProvider`.
 *
 * The smallest deterministic implementation that proves the semantics: additive storage, plain
 * claim records in and out, deterministic boundary validation, and a *deliberately simple* lexical
 * ranking for retrieval. It has no database, no network, no embedding model, and no second model
 * call.
 *
 * **The reference ranking is not canonical Derived Semantic Memory semantics.** A real provider may
 * rank with embeddings, graph traversal, temporal decay, metadata filters, or a cross-encoder; the
 * kernel does not care. This one scores by shared distinct lowercase word tokens between the query
 * and the claim statement, breaks ties by `claimId` ascending, and truncates to `limit`.
 *
 * ## Identity / dedup rule (the one this slice chose; see the F.3 task §24)
 *
 * Within one collection, a `claimId` identifies one claim:
 *
 * - appending a claim whose id is not present stores it;
 * - appending a claim whose id is present **and whose canonical JSON is identical** is an
 *   idempotent no-op (reported as a duplicate);
 * - appending a *different* claim under an id that is already present is refused - no
 *   timing-dependent overwrite, no silent destructive replacement.
 *
 * Contradictory claims coexist naturally because they have different ids: `A` ("Alice is on Team
 * Red") and `B` ("Alice is on Team Blue") are two records, both stored, both retrievable. The
 * provider performs no truth arbitration and no supersession ranking.
 */

import { canonicalJson } from "../util/hash.ts";
import type { DerivedSemanticClaim } from "../execution/derived-semantic-memory.ts";
import { derivedSemanticClaimIssues } from "../execution/derived-semantic-memory.ts";
import type {
  DerivedSemanticMemoryAppendRequest,
  DerivedSemanticMemoryAppendResult,
  DerivedSemanticMemoryCollection,
  DerivedSemanticMemoryProvider,
  DerivedSemanticMemoryRetrieveRequest,
} from "../ports/derived-semantic-memory-provider.ts";

/** The reference provider, with its operations concretely synchronous and `get` always present. */
export interface InMemoryDerivedSemanticMemory extends DerivedSemanticMemoryProvider {
  append(request: DerivedSemanticMemoryAppendRequest): DerivedSemanticMemoryAppendResult;
  retrieve(request: DerivedSemanticMemoryRetrieveRequest): readonly DerivedSemanticClaim[];
  get(collection: DerivedSemanticMemoryCollection, claimId: string): DerivedSemanticClaim | null;
  /** Every claim currently stored in a collection, in insertion order. Test/inspection only. */
  dump(collection: string): readonly DerivedSemanticClaim[];
}

export class DerivedSemanticMemoryAppendConflictError extends Error {
  readonly collection: string;
  readonly claimId: string;
  constructor(collection: string, claimId: string) {
    super(
      `a different Derived Semantic claim is already stored under id "${claimId}" in collection ` +
        `"${collection}"; the reference provider never destructively replaces a claim`,
    );
    this.name = "DerivedSemanticMemoryAppendConflictError";
    this.collection = collection;
    this.claimId = claimId;
  }
}

export class InvalidDerivedSemanticClaimError extends Error {
  readonly issues: readonly string[];
  constructor(issues: readonly string[]) {
    super(`the reference Derived Semantic Memory provider was given a malformed claim: ${issues[0]}`);
    this.name = "InvalidDerivedSemanticClaimError";
    this.issues = issues;
  }
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 0),
  );
}

function score(queryTokens: ReadonlySet<string>, claim: DerivedSemanticClaim): number {
  const statementTokens = tokenize(claim.statement);
  let shared = 0;
  for (const token of queryTokens) if (statementTokens.has(token)) shared += 1;
  return shared;
}

export function createInMemoryDerivedSemanticMemory(): InMemoryDerivedSemanticMemory {
  const store = new Map<string, Map<string, DerivedSemanticClaim>>();

  const collectionOf = (collection: DerivedSemanticMemoryCollection): Map<string, DerivedSemanticClaim> => {
    let claims = store.get(collection);
    if (!claims) {
      claims = new Map();
      store.set(collection, claims);
    }
    return claims;
  };

  return {
    append(request: DerivedSemanticMemoryAppendRequest): DerivedSemanticMemoryAppendResult {
      // Validate the whole batch before mutating anything: an append is all-or-nothing.
      request.claims.forEach((claim, index) => {
        const issues = derivedSemanticClaimIssues(claim, `claims[${index}]`);
        if (issues.length > 0) throw new InvalidDerivedSemanticClaimError(issues);
      });
      const claims = collectionOf(request.collection);
      const appended: string[] = [];
      const duplicates: string[] = [];
      const pending: DerivedSemanticClaim[] = [];
      for (const claim of request.claims) {
        const existing = claims.get(claim.claimId);
        if (existing) {
          if (canonicalJson(existing) === canonicalJson(claim)) {
            duplicates.push(claim.claimId);
            continue;
          }
          throw new DerivedSemanticMemoryAppendConflictError(request.collection, claim.claimId);
        }
        pending.push(claim);
      }
      for (const claim of pending) {
        claims.set(claim.claimId, claim);
        appended.push(claim.claimId);
      }
      return { appended, duplicates };
    },

    retrieve(request: DerivedSemanticMemoryRetrieveRequest): readonly DerivedSemanticClaim[] {
      const claims = store.get(request.collection);
      if (!claims || claims.size === 0) return [];
      const queryTokens = tokenize(request.query);
      if (queryTokens.size === 0) return [];
      return [...claims.values()]
        .map((claim) => ({ claim, s: score(queryTokens, claim) }))
        .filter((entry) => entry.s > 0)
        .sort((a, b) => (b.s - a.s) || (a.claim.claimId < b.claim.claimId ? -1 : 1))
        .slice(0, Math.max(0, request.limit))
        .map((entry) => entry.claim);
    },

    get(collection: DerivedSemanticMemoryCollection, claimId: string): DerivedSemanticClaim | null {
      return store.get(collection)?.get(claimId) ?? null;
    },

    dump(collection: string): readonly DerivedSemanticClaim[] {
      return [...(store.get(collection)?.values() ?? [])];
    },
  };
}
