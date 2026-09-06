/**
 * Reference `DerivedMemoryExtractor` implementations - all deterministic, none model-backed.
 *
 * Derived-memory extraction does not need a real LLM to prove its semantics. These cover the two deterministic
 * shapes:
 *
 * - `createFakeDerivedMemoryExtractor` - returns a fixed list of candidates (optionally computed
 *   from the request). A test puts an exact candidate in front of `deriveClaims`, including a
 *   deliberately ungrounded one, and observes that grounding rejects it.
 * - `createSchemaBoundDerivedMemoryExtractor` - a rule that reads *typed* fields out of each source
 *   item's `content` and emits one candidate per configured rule. This is the "prefer deterministic
 *   extraction for schema-bound / verified inputs" path: no prose parsing, no regex over free text.
 *
 * A future open-world extractor may be model-backed. That is a separate, optional provider concern;
 * nothing here makes an extra model call mandatory.
 */

import type {
  DerivedMemoryClaimCandidate,
  DerivedMemoryDerivation,
} from "../execution/derived-semantic-memory.ts";
import type {
  DerivedMemoryExtractionRequest,
  DerivedMemoryExtractor,
} from "../ports/derived-memory-extractor.ts";
import type { JsonValue } from "../util/json.ts";

/**
 * An extractor that returns exactly what it is told to.
 *
 * `candidates` may be a fixed array or a function of the request (so a test can, for example, make
 * a candidate cite a ref that is *not* in `request.material` and check that grounding refuses it).
 */
export function createFakeDerivedMemoryExtractor(
  candidates:
    | readonly DerivedMemoryClaimCandidate[]
    | ((request: DerivedMemoryExtractionRequest) => readonly DerivedMemoryClaimCandidate[]),
): DerivedMemoryExtractor {
  return {
    extract(request) {
      return typeof candidates === "function" ? candidates(request) : candidates;
    },
  };
}

/** One deterministic rule: pull a value at `field` out of a source item's object `content`. */
export interface SchemaBoundExtractionRule {
  /** Which source items this rule applies to. A predicate over the item's `sourceRef`. */
  readonly appliesTo?: (sourceRef: string) => boolean;
  /** The property name to read from the item's `content` (which must be a JSON object). */
  readonly field: string;
  /** Turns the read value into a claim statement. */
  readonly statement: (value: JsonValue, sourceRef: string) => string;
  readonly derivation: DerivedMemoryDerivation;
}

/**
 * A deterministic rule-based extractor for schema-bound / verified source material.
 *
 * For each source item and each rule that applies, if the item's `content` is an object carrying
 * the rule's `field`, it emits one candidate citing that item's `sourceRef`. It never inspects free
 * text and never parses prose.
 */
export function createSchemaBoundDerivedMemoryExtractor(
  rules: readonly SchemaBoundExtractionRule[],
): DerivedMemoryExtractor {
  return {
    extract(request) {
      const candidates: DerivedMemoryClaimCandidate[] = [];
      for (const item of request.material) {
        const content = item.content;
        if (content === null || typeof content !== "object" || Array.isArray(content)) continue;
        for (const rule of rules) {
          if (rule.appliesTo && !rule.appliesTo(item.sourceRef)) continue;
          if (!Object.prototype.hasOwnProperty.call(content, rule.field)) continue;
          candidates.push({
            statement: rule.statement((content as Record<string, JsonValue>)[rule.field]!, item.sourceRef),
            sourceRefs: [item.sourceRef],
            derivation: rule.derivation,
          });
        }
      }
      return candidates;
    },
  };
}
