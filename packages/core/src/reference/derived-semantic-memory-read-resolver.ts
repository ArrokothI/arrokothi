/**
 * A reference `DerivedSemanticMemoryReadResolver`: authorize, then retrieve, then bound.
 *
 * Deny-by-default, and the mirror of the Structured Memory read resolver. The ordering is the
 * whole point:
 *
 * ```text
 * request
 *   ↓ is this Execution in scope?            no  -> null, provider NOT called
 *   ↓ does the grant permit a Derived read?  no  -> null, provider NOT called
 *   ↓ resolve the opaque collection token    none -> null, provider NOT called
 *   ↓ does the empty { query, claims: [] }        no  -> null, provider NOT called
 *     envelope fit the byte budget?                     (no valid bounded snapshot exists; the
 *                                                        authored query is never truncated)
 *   ↓ provider.retrieve(collection, query, limit)
 *   ↓ validate every returned claim          malformed -> throw (fail closed)
 *   ↓ project into a bounded model-facing snapshot
 * ```
 *
 * A denied request performs zero `retrieve` calls: provider existence and provider results never
 * decide whether policy is checked. The `collection` token is opaque and is **not** authority - the
 * grant decides whether this Execution may retrieve at all; `collectionFor` only says *where* an
 * authorized read looks.
 *
 * This resolver holds the provider. It holds no `RuntimeStore`, `Harness`, `EffectAuthorizer`, or
 * credential, and it never writes, promotes, or extracts.
 */

import type {
  DerivedSemanticMemoryReadBudget,
  DerivedSemanticMemoryReadView,
} from "../execution/derived-semantic-memory.ts";
import {
  derivedSemanticMemoryEmptyEnvelopeFits,
  projectDerivedSemanticMemoryReadView,
} from "../execution/derived-semantic-memory.ts";
import type { DerivedSemanticMemoryProvider } from "../ports/derived-semantic-memory-provider.ts";
import { derivedSemanticMemoryRetrieveResultIssues } from "../ports/derived-semantic-memory-provider.ts";
import type {
  DerivedSemanticMemoryReadRequest,
  DerivedSemanticMemoryReadResolver,
} from "../ports/derived-semantic-memory-read-view.ts";

/**
 * Whether this policy permits reading Derived Semantic Memory into a context. Deny-by-default:
 * omitted or `false` denies every read; `true` permits it (subject to `executions` scoping).
 */
export type DerivedSemanticMemoryReadGrantRule = boolean;

export interface DerivedSemanticMemoryReadResolverOptions {
  readonly provider: DerivedSemanticMemoryProvider;
  /** Whether a Derived read is permitted. Default: denied. */
  readonly grant?: DerivedSemanticMemoryReadGrantRule;
  /** Restricts the grant to named Executions. Omitted means every Execution. */
  readonly executions?: readonly string[];
  /**
   * Maps an Execution to the opaque provider collection it may read. `null` means "no collection",
   * which resolves to `null` (no provider call). Default: the Execution id itself.
   */
  readonly collectionFor?: (executionId: string) => string | null;
  /** A hard ceiling the resolver applies on top of whatever `limit` the request carries. */
  readonly maxClaims?: number;
  /** A hard byte ceiling the resolver applies on top of the request's `maxBytes`. */
  readonly maxBytes?: number;
}

export function createDerivedSemanticMemoryReadResolver(
  options: DerivedSemanticMemoryReadResolverOptions,
): DerivedSemanticMemoryReadResolver {
  const grant = options.grant ?? false;
  const collectionFor = options.collectionFor ?? ((executionId: string) => executionId);

  return {
    async resolve(
      request: DerivedSemanticMemoryReadRequest,
    ): Promise<DerivedSemanticMemoryReadView | null> {
      if (options.executions && !options.executions.includes(request.executionId)) return null;
      if (grant !== true) return null;

      const collection = collectionFor(request.executionId);
      if (collection === null) return null;

      const budget: DerivedSemanticMemoryReadBudget = {
        maxClaims: Math.max(0, Math.min(request.limit, options.maxClaims ?? request.limit)),
        maxBytes: Math.max(1, Math.min(request.maxBytes, options.maxBytes ?? request.maxBytes)),
      };

      // If even the empty envelope cannot fit the byte budget, no valid bounded snapshot exists for
      // this query. Detected here, before any provider call, and returned deterministically as "no
      // snapshot" - the authored query is never truncated to make room.
      if (!derivedSemanticMemoryEmptyEnvelopeFits(request.query, budget.maxBytes)) return null;

      const claims = await options.provider.retrieve({
        collection,
        query: request.query,
        limit: budget.maxClaims,
      });
      const issues = derivedSemanticMemoryRetrieveResultIssues(claims, budget.maxClaims);
      if (issues.length > 0) {
        throw new Error(`the Derived Semantic Memory provider returned a malformed result: ${issues[0]}`);
      }

      return projectDerivedSemanticMemoryReadView(request.query, claims, budget);
    },
  };
}
