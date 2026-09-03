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
 * Within one collection, a `claimId` identifies **one** record, checked against both the already
 * stored claims and the earlier claims of the same incoming batch:
 *
 * - a `claimId` not seen before (stored or earlier in the batch) is stored once;
 * - the same **canonical-JSON-identical** claim seen again (stored, or earlier in the batch) is an
 *   idempotent no-op, reported once in `duplicates`;
 * - a **different** claim under a `claimId` already seen (stored, or earlier in the batch) is
 *   refused with `DerivedSemanticMemoryAppendConflictError` - no timing-dependent overwrite, no
 *   last-entry-wins, no silent destructive replacement;
 * - a batch that conflicts anywhere mutates **nothing** (the store is committed only after the
 *   whole batch has been staged without conflict).
 *
 * Contradictory claims coexist naturally because they have different ids: `A` ("Alice is on Team
 * Red") and `B` ("Alice is on Team Blue") are two records, both stored, both retrievable. The
 * provider performs no truth arbitration and no supersession ranking.
 *
 * ## Ownership
 *
 * The provider **owns** its stored records. Every claim it stores is a validated deep copy
 * (`cloneDerivedSemanticClaim`), and every claim it hands back through `retrieve` / `get` / `dump`
 * is a fresh deep copy too - mutating a caller's append input, or a retrieved/inspected result,
 * cannot reach provider state. Provenance arrays/objects are isolated by the same clone.
 */

import { canonicalJson } from "../util/hash.ts";
import type { DerivedSemanticClaim } from "../execution/derived-semantic-memory.ts";
import { cloneDerivedSemanticClaim, derivedSemanticClaimIssues } from "../execution/derived-semantic-memory.ts";
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

      // Stage the whole batch first. A `claimId` is checked against both the stored claims and the
      // claims already staged from this batch, so two entries with the same id in one call cannot
      // become a last-entry-wins overwrite. Nothing is committed to the store until the full batch
      // has staged without a conflict.
      const staged = new Map<string, DerivedSemanticClaim>();
      const duplicates = new Set<string>();
      for (const claim of request.claims) {
        const prior = staged.get(claim.claimId) ?? claims.get(claim.claimId);
        if (prior) {
          if (canonicalJson(prior) === canonicalJson(claim)) {
            duplicates.add(claim.claimId);
            continue;
          }
          throw new DerivedSemanticMemoryAppendConflictError(request.collection, claim.claimId);
        }
        staged.set(claim.claimId, cloneDerivedSemanticClaim(claim));
      }

      const appended: string[] = [];
      for (const [claimId, claim] of staged) {
        claims.set(claimId, claim);
        appended.push(claimId);
      }
      return { appended, duplicates: [...duplicates] };
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
        .map((entry) => cloneDerivedSemanticClaim(entry.claim));
    },

    get(collection: DerivedSemanticMemoryCollection, claimId: string): DerivedSemanticClaim | null {
      const stored = store.get(collection)?.get(claimId);
      return stored ? cloneDerivedSemanticClaim(stored) : null;
    },

    dump(collection: string): readonly DerivedSemanticClaim[] {
      return [...(store.get(collection)?.values() ?? [])].map(cloneDerivedSemanticClaim);
    },
  };
}
