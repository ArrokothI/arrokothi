/**
 * Derived Semantic Memory: inferred, provenance-bearing claims for later retrieval and reasoning.
 *
 * This is a *different memory form* from the two this directory already owns, and the difference is
 * epistemic, not technological:
 *
 * ```text
 * Structured Memory        explicitly asserted, schema-bound application state   (structured-memory.ts)
 * Derived Semantic Memory   inferred from source material; may be stale,          (this file)
 *                           conflicting, or superseded; NOT authoritative by default
 * Working Notes             controller-local scratch                             (working-notes.ts)
 * ```
 *
 * A derived claim does not grant Effective Authority, does not enter an Active View, does not count
 * as mechanical confirmation, is not authorization evidence, and does not silently become Structured
 * Memory. Inference cannot create authority. See [`../../docs/memory.md`](../../docs/memory.md) §4,
 * §8-§10, §16 and [`../../docs/security-guarantees.md`](../../docs/security-guarantees.md) §6.
 *
 * ## What this module is, and is not
 *
 * It is a dependency-free leaf (util only). It owns the **reference claim/provenance shape**
 * the current implementation needs, deterministic validation of it, the separate notion of
 * *source material*, the pure grounding of an extractor *candidate* into a validated claim, and the
 * bounded model-facing projection.
 *
 * It is **not** the universal portable Derived-claim schema. `../../docs/future-plan.md` §3.1 keeps
 * the portable representation, the minimal provenance set, confidence/quality metadata, derivation
 * model/version metadata, correction/supersession links, temporal validity, and source
 * indexing/materialization deliberately unfrozen. This file chooses one small answer; a
 * later portable-schema slice may choose differently without contradicting canonical memory
 * semantics.
 *
 * It owns no retrieval algorithm. Retrieval mechanism (lexical / embeddings / graph / temporal /
 * metadata / reranking / heuristics) belongs to a provider; the kernel owns only the
 * epistemic / provenance / visibility distinctions.
 */

import { canonicalJson, utf8ByteLength } from "../util/hash.ts";
import type { JsonValue } from "../util/json.ts";
import { cloneJson, jsonIssues } from "../util/json.ts";

// -- source material ----------------------------------------------------------

/**
 * One explicitly supplied piece of source material an extractor may reason from.
 *
 * `sourceRef` is an opaque application/runtime reference - an Event id, a message id, a tool-result
 * id, a resource read, a document id, an external record. The vocabulary is **not** frozen (see
 * `../../docs/memory.md` §7): not every runtime observation becomes an `Episode`
 * object, and the kernel does not scan the Event journal, the mailbox, Working Notes, or the model
 * transcript for it. The extractor receives what a caller hands it, nothing more.
 */
export interface DerivedMemorySourceMaterial {
  readonly sourceRef: string;
  readonly content: JsonValue;
}

/** Deterministic structural validation of one supplied source-material item. */
export function derivedMemorySourceMaterialIssues(value: unknown, path = "material"): readonly string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [`${path}: expected a { sourceRef, content } object`];
  }
  const record = value as Record<string, unknown>;
  const issues: string[] = [];
  for (const extra of Object.keys(record).filter((key) => key !== "sourceRef" && key !== "content")) {
    issues.push(`${path}: unknown property "${extra}"`);
  }
  if (typeof record["sourceRef"] !== "string" || (record["sourceRef"] as string).trim().length === 0) {
    issues.push(`${path}.sourceRef: expected a non-empty string`);
  }
  if (!Object.prototype.hasOwnProperty.call(record, "content")) {
    issues.push(`${path}.content: required`);
  } else {
    for (const issue of jsonIssues(record["content"], `${path}.content`)) {
      issues.push(`${issue.path}: ${issue.message}`);
    }
  }
  return issues;
}

// -- the reference claim / provenance shape ----------------------------------

/**
 * How a claim was produced. Provenance metadata, never authority.
 *
 * `method` is a free string ("deterministic-rule", "fake-extractor", or a future model/version tag);
 * `version` is optional. The kernel does not model confidence, calibration, or a derivation-model registry.
 */
export interface DerivedMemoryDerivation {
  readonly method: string;
  readonly version?: string;
}

/** Why the system believes a claim, and when it inferred it. */
export interface DerivedMemoryProvenance {
  /** At least one explicit source reference, each non-empty and unique. */
  readonly sourceRefs: readonly string[];
  /**
   * When the claim was derived. Explicit trusted metadata supplied by the derivation pipeline -
   * never a value the model wrote into prose. The accepted format is an ISO-8601
   * instant (`YYYY-MM-DDTHH:MM:SS(.sss)?` with a `Z` or `±HH:MM` offset), parseable by `Date`.
   */
  readonly derivedAt: string;
  readonly derivation: DerivedMemoryDerivation;
}

/**
 * One validated Derived Semantic claim.
 *
 * The reference record, not a frozen portable schema. Deliberately absent: confidence,
 * valid-from/valid-until, reference/subject time, subjects/entities, contradiction or supersession
 * links, embeddings, scope refs. Contradictory claims simply coexist (they are separate records
 * with separate ids); a provider stores additively and never destructively rewrites one claim
 * because another arrived.
 */
export interface DerivedSemanticClaim {
  readonly claimId: string;
  readonly statement: string;
  readonly provenance: DerivedMemoryProvenance;
}

const CLAIM_KEYS = new Set(["claimId", "statement", "provenance"]);
const PROVENANCE_KEYS = new Set(["sourceRefs", "derivedAt", "derivation"]);
const DERIVATION_KEYS = new Set(["method", "version"]);

/** The accepted `derivedAt` timestamp format. */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

export function isAcceptedDerivedAt(value: unknown): value is string {
  return typeof value === "string" && ISO_INSTANT.test(value) && Number.isFinite(Date.parse(value));
}

function uniqueNonEmptyStringIssues(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value)) return [`${path}: expected an array`];
  if (value.length === 0) return [`${path}: expected at least one entry`];
  const issues: string[] = [];
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      issues.push(`${path}[${index}]: expected a non-empty string`);
      return;
    }
    if (seen.has(entry)) issues.push(`${path}[${index}]: "${entry}" is repeated`);
    seen.add(entry);
  });
  return issues;
}

function derivationIssues(value: unknown, path: string): readonly string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [`${path}: expected a { method, version? } object`];
  }
  const record = value as Record<string, unknown>;
  const issues: string[] = [];
  for (const extra of Object.keys(record).filter((key) => !DERIVATION_KEYS.has(key))) {
    issues.push(`${path}: unknown property "${extra}"`);
  }
  if (typeof record["method"] !== "string" || (record["method"] as string).trim().length === 0) {
    issues.push(`${path}.method: expected a non-empty string`);
  }
  if (
    record["version"] !== undefined &&
    (typeof record["version"] !== "string" || (record["version"] as string).trim().length === 0)
  ) {
    issues.push(`${path}.version: expected a non-empty string when present`);
  }
  return issues;
}

function provenanceIssues(value: unknown, path: string): readonly string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [`${path}: expected a provenance object`];
  }
  const record = value as Record<string, unknown>;
  const issues: string[] = [];
  for (const extra of Object.keys(record).filter((key) => !PROVENANCE_KEYS.has(key))) {
    issues.push(`${path}: unknown property "${extra}"`);
  }
  issues.push(...uniqueNonEmptyStringIssues(record["sourceRefs"], `${path}.sourceRefs`));
  if (!isAcceptedDerivedAt(record["derivedAt"])) {
    issues.push(`${path}.derivedAt: expected an ISO-8601 instant (trusted metadata, not model prose)`);
  }
  if (!Object.prototype.hasOwnProperty.call(record, "derivation")) {
    issues.push(`${path}.derivation: required`);
  } else {
    issues.push(...derivationIssues(record["derivation"], `${path}.derivation`));
  }
  return issues;
}

/**
 * Every reason `value` is not a well-formed `DerivedSemanticClaim`. Empty means it is.
 *
 * Runs at every public runtime boundary - a provider append, a resolver's validation of what a
 * provider returned, the promotion helper - because a static type is not a runtime guarantee.
 */
export function derivedSemanticClaimIssues(value: unknown, path = "claim"): readonly string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [`${path}: expected a Derived Semantic claim object`];
  }
  const record = value as Record<string, unknown>;
  const issues: string[] = [];
  for (const extra of Object.keys(record).filter((key) => !CLAIM_KEYS.has(key))) {
    issues.push(`${path}: unknown property "${extra}"`);
  }
  if (typeof record["claimId"] !== "string" || (record["claimId"] as string).trim().length === 0) {
    issues.push(`${path}.claimId: expected a non-empty string`);
  }
  if (typeof record["statement"] !== "string" || (record["statement"] as string).trim().length === 0) {
    issues.push(`${path}.statement: expected a non-empty string`);
  }
  if (!Object.prototype.hasOwnProperty.call(record, "provenance")) {
    issues.push(`${path}.provenance: required`);
  } else {
    issues.push(...provenanceIssues(record["provenance"], `${path}.provenance`));
  }
  issues.push(...jsonIssues(value, path).map((issue) => `${issue.path}: ${issue.message}`));
  return issues;
}

export function isDerivedSemanticClaim(value: unknown): value is DerivedSemanticClaim {
  return derivedSemanticClaimIssues(value).length === 0;
}

/**
 * A deep, alias-free copy of a claim, refusing a malformed input.
 *
 * Fail-closed, in the same discipline as `cloneWorkingNotesHandoff`: it **throws** rather than
 * return a `DerivedSemanticClaim` that violates its invariants, so no code path can launder a bad
 * record into a statically-typed-valid one.
 */
export function cloneDerivedSemanticClaim(claim: DerivedSemanticClaim): DerivedSemanticClaim {
  const issues = derivedSemanticClaimIssues(claim);
  if (issues.length > 0) {
    throw new TypeError(`cloneDerivedSemanticClaim was given a malformed claim: ${issues[0]}`);
  }
  return cloneJson(claim as unknown as JsonValue) as unknown as DerivedSemanticClaim;
}

/** A deterministic byte size for one claim: UTF-8 length of its canonical JSON. A budget input. */
export function derivedSemanticClaimBytes(claim: DerivedSemanticClaim): number {
  return utf8ByteLength(canonicalJson(claim));
}

// -- extractor candidates and their grounding -------------------------------

/**
 * A candidate claim an extractor proposes.
 *
 * Candidate inferred knowledge, not a stored claim: it has been neither validated nor grounded, it
 * grants nothing, and it authorizes nothing. Its `sourceRefs` are checked against the exact source
 * material the extractor was given - a candidate that cites a ref it was not handed is rejected
 * before it can reach a provider. `claimId` is optional; the grounding step mints a deterministic
 * one when it is absent. `derivedAt` is **not** a candidate field - the trusted pipeline stamps it,
 * so an extractor can never assert when a claim was derived.
 */
export interface DerivedMemoryClaimCandidate {
  readonly claimId?: string;
  readonly statement: string;
  readonly sourceRefs: readonly string[];
  readonly derivation: DerivedMemoryDerivation;
}

export type GroundDerivedClaimResult =
  | { readonly ok: true; readonly claim: DerivedSemanticClaim }
  | { readonly ok: false; readonly issues: readonly string[] };

export interface GroundDerivedClaimOptions {
  /** The sourceRefs the extractor was actually given. A candidate may cite only these. */
  readonly allowedSourceRefs: ReadonlySet<string>;
  /** Trusted timestamp for the grounded claim's provenance. */
  readonly derivedAt: string;
  /** Deterministic id to use when the candidate supplied none. */
  readonly claimId: string;
}

/**
 * Turns one extractor candidate into a validated, grounded `DerivedSemanticClaim`, or a list of
 * reasons it cannot be.
 *
 * Pure. The security-significant checks live here, before any provider is touched:
 *
 * - the candidate must be structurally well-formed;
 * - every cited `sourceRef` must be one the extractor was given (`allowedSourceRefs`);
 * - `derivedAt` is supplied by the trusted caller, never by the candidate;
 * - the assembled claim must itself pass `derivedSemanticClaimIssues`.
 */
export function groundDerivedClaimCandidate(
  candidate: unknown,
  options: GroundDerivedClaimOptions,
  path = "candidate",
): GroundDerivedClaimResult {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { ok: false, issues: [`${path}: expected a claim candidate object`] };
  }
  const record = candidate as Record<string, unknown>;
  const issues: string[] = [];
  for (const extra of Object.keys(record).filter(
    (key) => !["claimId", "statement", "sourceRefs", "derivation"].includes(key),
  )) {
    issues.push(`${path}: unknown property "${extra}"`);
  }
  if (
    record["claimId"] !== undefined &&
    (typeof record["claimId"] !== "string" || (record["claimId"] as string).trim().length === 0)
  ) {
    issues.push(`${path}.claimId: expected a non-empty string when present`);
  }
  if (typeof record["statement"] !== "string" || (record["statement"] as string).trim().length === 0) {
    issues.push(`${path}.statement: expected a non-empty string`);
  }
  const refIssues = uniqueNonEmptyStringIssues(record["sourceRefs"], `${path}.sourceRefs`);
  issues.push(...refIssues);
  if (refIssues.length === 0) {
    for (const [index, ref] of (record["sourceRefs"] as string[]).entries()) {
      if (!options.allowedSourceRefs.has(ref)) {
        issues.push(
          `${path}.sourceRefs[${index}]: "${ref}" was not in the source material the extractor was given`,
        );
      }
    }
  }
  issues.push(...derivationIssues(record["derivation"], `${path}.derivation`));
  if (!isAcceptedDerivedAt(options.derivedAt)) {
    issues.push(`derivedAt: the pipeline supplied a malformed trusted timestamp`);
  }
  if (issues.length > 0) return { ok: false, issues };

  const claim: DerivedSemanticClaim = {
    claimId:
      typeof record["claimId"] === "string" && record["claimId"].length > 0
        ? record["claimId"]
        : options.claimId,
    statement: record["statement"] as string,
    provenance: {
      sourceRefs: [...(record["sourceRefs"] as string[])],
      derivedAt: options.derivedAt,
      derivation: {
        method: (record["derivation"] as DerivedMemoryDerivation).method,
        ...((record["derivation"] as DerivedMemoryDerivation).version !== undefined
          ? { version: (record["derivation"] as DerivedMemoryDerivation).version }
          : {}),
      },
    },
  };
  const claimIssues = derivedSemanticClaimIssues(claim, path);
  if (claimIssues.length > 0) return { ok: false, issues: claimIssues };
  return { ok: true, claim };
}

/**
 * A deterministic claim id from the statement plus the material it was derived from.
 *
 * Used when a candidate supplies none. Two identical candidates over identical material produce the
 * same id, which is what lets an exact re-derivation be idempotent rather than a duplicate. Not
 * cryptographic - it only needs to make an accidental collision between genuinely different claims
 * unlikely.
 */
export function derivedClaimId(statement: string, sourceRefs: readonly string[]): string {
  const input = canonicalJson({ statement, sourceRefs: [...sourceRefs].sort() });
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `dsc_${(h >>> 0).toString(16).padStart(8, "0")}_${utf8ByteLength(input).toString(36)}`;
}

// -- the bounded model-facing projection ------------------------------------

/**
 * One inferred claim as the model is shown it.
 *
 * Minimal, and minimal on purpose: the statement, the claim id (useful for provenance/correlation),
 * and the source refs. No `derivedAt`, no derivation method/version, no provider score or handle -
 * none of that changes the claim's epistemic status for a reader, and hidden provider metadata must
 * not be able to alter the compiled context's identity.
 */
export interface DerivedSemanticMemoryClaimView {
  readonly claimId: string;
  readonly statement: string;
  readonly sourceRefs: readonly string[];
}

/**
 * The authorized, bounded snapshot of Derived Semantic Memory for one model invocation.
 *
 * `query` is the authored retrieval intent this snapshot answers - correlation, never authority.
 * `claims` is a deterministically bounded *subset*: the resolver/compiler is explicitly selecting a
 * subset that fits the claim-count and byte budgets, dropping whole claims (from the first that does
 * not fit onward) rather than truncating any statement.
 */
export interface DerivedSemanticMemoryReadView {
  readonly query: string;
  readonly claims: readonly DerivedSemanticMemoryClaimView[];
}

export interface DerivedSemanticMemoryReadBudget {
  readonly maxClaims: number;
  readonly maxBytes: number;
}

function claimView(claim: DerivedSemanticClaim): DerivedSemanticMemoryClaimView {
  return {
    claimId: claim.claimId,
    statement: claim.statement,
    sourceRefs: [...claim.provenance.sourceRefs],
  };
}

/** UTF-8 byte size of a read view's canonical JSON. Deterministic; a budget input, never a revision. */
export function derivedSemanticMemoryReadViewBytes(view: DerivedSemanticMemoryReadView): number {
  return utf8ByteLength(canonicalJson(view));
}

/**
 * Builds the bounded model-facing snapshot from a provider's ranked claims.
 *
 * Pure and total. Claims are taken in the order the provider returned them (its ranking is its
 * business) and added one at a time; selection stops at the **first** claim that would push the
 * result over `maxClaims` or over the canonical-JSON `maxBytes` - including the very first claim, if
 * it does not fit on its own (it is dropped, never truncated, and never inserted to manufacture an
 * over-budget snapshot). The same inputs always produce the same snapshot, so a resumed Activation
 * replaying a persisted context and the Activation that produced it agree.
 *
 * **Precondition:** the empty `{ query, claims: [] }` envelope is itself within `maxBytes`. A caller
 * that cannot guarantee that - an authored byte budget smaller than the query alone - must detect it
 * *before* calling this (the reference `DerivedSemanticMemoryReadResolver` does, before any provider
 * call). Given the precondition, every returned view passes `derivedSemanticMemoryReadViewIssue`
 * under the same budget.
 */
export function projectDerivedSemanticMemoryReadView(
  query: string,
  rankedClaims: readonly DerivedSemanticClaim[],
  budget: DerivedSemanticMemoryReadBudget,
): DerivedSemanticMemoryReadView {
  const claims: DerivedSemanticMemoryClaimView[] = [];
  for (const claim of rankedClaims) {
    if (claims.length >= budget.maxClaims) break;
    const candidate = [...claims, claimView(claim)];
    if (derivedSemanticMemoryReadViewBytes({ query, claims: candidate }) > budget.maxBytes) break;
    claims.push(claimView(claim));
  }
  return { query, claims };
}

/**
 * Whether even the empty `{ query, claims: [] }` envelope fits a byte budget.
 *
 * `false` means no valid bounded snapshot can be produced for this query under this budget - the
 * authored query must never be truncated to make room. The reference resolver checks this before
 * any provider call and returns no snapshot when it fails.
 */
export function derivedSemanticMemoryEmptyEnvelopeFits(query: string, maxBytes: number): boolean {
  return derivedSemanticMemoryReadViewBytes({ query, claims: [] }) <= maxBytes;
}

/**
 * Whether a snapshot handed back by a resolver is well-formed and within budget.
 *
 * The controller runs this on whatever a `DerivedSemanticMemoryReadResolver` returns before it
 * trusts it: a custom resolver that returns a malformed view, or one larger than the Agent's
 * bounds, is refused (a deterministic Agent failure) rather than silently packed into context.
 * `null` means the snapshot is acceptable.
 */
export function derivedSemanticMemoryReadViewIssue(
  value: unknown,
  budget: DerivedSemanticMemoryReadBudget,
): string | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return "expected a Derived Semantic Memory read view object";
  }
  const record = value as Record<string, unknown>;
  for (const extra of Object.keys(record).filter((key) => key !== "query" && key !== "claims")) {
    return `unknown read-view property "${extra}"`;
  }
  if (typeof record["query"] !== "string") return "read view is missing its query";
  const claims = record["claims"];
  if (!Array.isArray(claims)) return "read view `claims` must be an array";
  if (claims.length > budget.maxClaims) {
    return `read view carries ${claims.length} claims; the budget is ${budget.maxClaims}`;
  }
  const seen = new Set<string>();
  for (const [index, claim] of claims.entries()) {
    if (claim === null || typeof claim !== "object" || Array.isArray(claim)) {
      return `claims[${index}] must be an object`;
    }
    const c = claim as Record<string, unknown>;
    for (const extra of Object.keys(c).filter(
      (key) => key !== "claimId" && key !== "statement" && key !== "sourceRefs",
    )) {
      return `claims[${index}] has unknown property "${extra}"`;
    }
    if (typeof c["claimId"] !== "string" || (c["claimId"] as string).length === 0) {
      return `claims[${index}].claimId must be a non-empty string`;
    }
    if (seen.has(c["claimId"] as string)) return `claims[${index}].claimId is repeated`;
    seen.add(c["claimId"] as string);
    if (typeof c["statement"] !== "string" || (c["statement"] as string).length === 0) {
      return `claims[${index}].statement must be a non-empty string`;
    }
    for (const issue of uniqueNonEmptyStringIssues(c["sourceRefs"], `claims[${index}].sourceRefs`)) {
      return issue;
    }
  }
  for (const issue of jsonIssues(value, "readView")) return `${issue.path}: ${issue.message}`;
  const bytes = derivedSemanticMemoryReadViewBytes(value as DerivedSemanticMemoryReadView);
  if (bytes > budget.maxBytes) {
    return `read view is ${bytes} bytes; the budget is ${budget.maxBytes}`;
  }
  return null;
}
