/**
 * The Derived Semantic Memory extraction seam: explicit source material in, candidate claims out.
 *
 * ```text
 * explicit source material  +  authored derivation instructions
 *          ↓ DerivedMemoryExtractor  (replaceable: fake / deterministic-rule / future model-backed)
 * candidate claims                     inferred, ungrounded, unvalidated - grant nothing
 *          ↓ deriveClaims  (trusted pipeline: ground + validate every candidate)
 * validated provenance-bearing DerivedSemanticClaim records
 *          ↓ a caller chooses to append them
 * DerivedSemanticMemoryProvider
 * ```
 *
 * The rules this boundary enforces:
 *
 * - the extractor is handed **only** the source material a caller supplies. It does not scan the
 *   Event journal, the mailbox, Working Notes, Structured Memory, or the model transcript, and the
 *   kernel never materialises "all observations" for it.
 * - extractor output is *candidate inferred knowledge*. It does not write Structured Memory, does
 *   not grant authority, and does not authorise itself.
 * - a candidate may cite only `sourceRef`s that were in the supplied material. `deriveClaims`
 *   rejects an ungrounded candidate before it can reach a provider.
 * - `derivedAt` is stamped by the trusted pipeline, never by a candidate - an extractor cannot
 *   assert when a claim was derived.
 *
 * A future open-world extractor MAY be model-backed; that is a replaceable provider mechanism and
 * an optional cost. There is no hidden mandatory second model call, no embedding call, and no
 * regex parsing of assistant prose anywhere in this contract.
 */

import type {
  DerivedMemoryClaimCandidate,
  DerivedMemorySourceMaterial,
  DerivedSemanticClaim,
} from "../execution/derived-semantic-memory.ts";
import {
  derivedClaimId,
  derivedMemorySourceMaterialIssues,
  groundDerivedClaimCandidate,
} from "../execution/derived-semantic-memory.ts";
import type { JsonValue } from "../util/json.ts";

export interface DerivedMemoryExtractionRequest {
  /**
   * The source material to reason from. The extractor may cite only these `sourceRef`s.
   */
  readonly material: readonly DerivedMemorySourceMaterial[];
  /**
   * Opaque authored derivation instructions/metadata, forwarded to the extractor unchanged. The
   * kernel never inspects it. A deterministic rule-based extractor may read it as configuration; a
   * model-backed one may fold it into a system prompt.
   */
  readonly instructions?: JsonValue;
  /**
   * The trusted timestamp the pipeline stamps onto every grounded claim's provenance. Supplied by
   * the caller (normally from an injected `Clock`), never by the extractor.
   */
  readonly derivedAt: string;
}

export interface DerivedMemoryExtractor {
  /**
   * Proposes candidate claims from the supplied material.
   *
   * Returns candidates, not stored claims. The pipeline validates and grounds them.
   */
  extract(
    request: DerivedMemoryExtractionRequest,
  ): Promise<readonly DerivedMemoryClaimCandidate[]> | readonly DerivedMemoryClaimCandidate[];
}

export type DeriveClaimsResult =
  | { readonly ok: true; readonly claims: readonly DerivedSemanticClaim[] }
  | { readonly ok: false; readonly issues: readonly string[] };

/**
 * Runs one extraction and grounds every candidate into a validated `DerivedSemanticClaim`.
 *
 * The trusted half of the seam. It:
 *
 * 1. validates the supplied material (fail-closed - a malformed item aborts the whole extraction);
 * 2. calls the extractor;
 * 3. for each candidate, checks its shape, checks every cited `sourceRef` is one that was supplied,
 *    stamps the trusted `derivedAt`, and validates the assembled claim.
 *
 * Any failing candidate fails the whole call - a partially-grounded batch is never returned. This
 * is deliberately not called from any controller: extraction is an application/pipeline concern,
 * separate from retrieval and separate from promotion.
 */
export async function deriveClaims(
  extractor: DerivedMemoryExtractor,
  request: DerivedMemoryExtractionRequest,
): Promise<DeriveClaimsResult> {
  const issues: string[] = [];
  request.material.forEach((item, index) => {
    issues.push(...derivedMemorySourceMaterialIssues(item, `material[${index}]`));
  });
  const seenRefs = new Set<string>();
  for (const item of request.material) {
    if (seenRefs.has(item.sourceRef)) {
      issues.push(`material: sourceRef "${item.sourceRef}" is supplied more than once`);
    }
    seenRefs.add(item.sourceRef);
  }
  if (issues.length > 0) return { ok: false, issues };

  const allowedSourceRefs = new Set(request.material.map((item) => item.sourceRef));
  const candidates = await extractor.extract(request);
  if (!Array.isArray(candidates)) {
    return { ok: false, issues: ["the extractor returned a non-array of candidates"] };
  }

  const claims: DerivedSemanticClaim[] = [];
  candidates.forEach((candidate, index) => {
    const grounded = groundDerivedClaimCandidate(
      candidate,
      {
        allowedSourceRefs,
        derivedAt: request.derivedAt,
        // A deterministic fallback id when the candidate supplied none. `groundDerivedClaimCandidate`
        // rejects a malformed candidate whatever id it is handed, so a best-effort id here is safe.
        claimId: mintCandidateId(candidate, index),
      },
      `candidate[${index}]`,
    );
    if (grounded.ok) claims.push(grounded.claim);
    else issues.push(...grounded.issues);
  });
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, claims };
}

function mintCandidateId(candidate: unknown, index: number): string {
  if (candidate !== null && typeof candidate === "object" && !Array.isArray(candidate)) {
    const record = candidate as Partial<DerivedMemoryClaimCandidate>;
    if (typeof record.statement === "string") {
      return derivedClaimId(record.statement, Array.isArray(record.sourceRefs) ? record.sourceRefs : []);
    }
  }
  return `dsc_candidate_${index}`;
}
