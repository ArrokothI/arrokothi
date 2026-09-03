/**
 * Seeding Derived Semantic Memory for conformance tests.
 *
 * A test that wants to observe *retrieval* needs claims to retrieve, and how they got there is not
 * the point of that test. This appends already-validated claims straight to a provider collection -
 * the same additive `append` the extraction pipeline would call - without routing through
 * `deriveClaims`. It is deliberately test-only: an application derives claims from source material
 * through an extractor.
 */

import type { DerivedSemanticClaim } from "../execution/derived-semantic-memory.ts";
import type {
  DerivedSemanticMemoryCollection,
  DerivedSemanticMemoryProvider,
} from "../ports/derived-semantic-memory-provider.ts";

export async function seedDerivedSemanticMemory(
  provider: DerivedSemanticMemoryProvider,
  collection: DerivedSemanticMemoryCollection,
  claims: readonly DerivedSemanticClaim[],
): Promise<void> {
  await provider.append({ collection, claims });
}
