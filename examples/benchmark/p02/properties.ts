/**
 * The one deterministic transform in P02: grounded property retrieval.
 *
 * Property facts have a single right answer for a given set of criteria, so filtering, ranking, and
 * capping are ordinary code and never model work. This function is pure and is reached only through
 * the read-only `properties.search` capability (see `app.ts`); the model never states a price, bed
 * count, or square footage it did not receive from a result here.
 *
 * No listing is ever invented. An unmatched search returns an empty match set with a note, and the
 * model is instructed to say so plainly rather than manufacture inventory.
 */

import type { EstatePropertyRecord } from "./catalog.ts";

export interface PropertyQuery {
  /** Case-insensitive substring over the listing's location (e.g. "tribeca", "NY", "malibu"). */
  readonly location?: string;
  /** Upper bound on sale price, in whole U.S. dollars. */
  readonly maxPrice?: number;
  /** Lower bound on sale price, in whole U.S. dollars. */
  readonly minPrice?: number;
  /** Minimum bedroom count. */
  readonly minBeds?: number;
  /** Exact listing type. */
  readonly type?: EstatePropertyRecord["type"];
  /** Result cap. Defaults to 3, hard-capped at 6 (the whole catalog). */
  readonly limit?: number;
}

export interface PropertyMatch {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly location: string;
  readonly price: number;
  readonly priceLabel: string;
  readonly beds: number;
  readonly baths: number;
  readonly sqft: number;
  readonly description: string;
  readonly highlights: readonly string[];
}

export interface PropertySearchResult {
  readonly matches: readonly PropertyMatch[];
  /** Present only when nothing matched, so the model has an explicit "say no" signal. */
  readonly note?: string;
}

const MAX_LIMIT = 6;
const DEFAULT_LIMIT = 3;

function usd(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

function toMatch(record: EstatePropertyRecord): PropertyMatch {
  return {
    id: record.id,
    title: record.title,
    type: record.type,
    location: record.location,
    price: record.price,
    priceLabel: usd(record.price),
    beds: record.beds,
    baths: record.baths,
    sqft: record.sqft,
    description: record.description,
    highlights: record.highlights,
  };
}

/** Deterministically filter and rank the authoritative catalog. Pure: no clock, no randomness, no I/O. */
export function searchProperties(
  catalog: readonly EstatePropertyRecord[],
  query: PropertyQuery,
): PropertySearchResult {
  const location = query.location?.trim().toLowerCase();
  const limit = Math.max(1, Math.min(MAX_LIMIT, Math.trunc(query.limit ?? DEFAULT_LIMIT)));

  const matches = catalog
    .filter((record) => {
      if (location && !record.location.toLowerCase().includes(location)) return false;
      if (typeof query.maxPrice === "number" && record.price > query.maxPrice) return false;
      if (typeof query.minPrice === "number" && record.price < query.minPrice) return false;
      if (typeof query.minBeds === "number" && record.beds < query.minBeds) return false;
      if (query.type && record.type !== query.type) return false;
      return true;
    })
    .sort((a, b) => b.price - a.price)
    .slice(0, limit)
    .map(toMatch);

  if (matches.length === 0) {
    return {
      matches: [],
      note: "No EstatePro listing matches those criteria. Tell the visitor plainly and ask which requirement to relax.",
    };
  }
  return { matches };
}
