import type {
  RecordFilter,
  RecordQuery,
  RecordQueryError,
  RecordQueryResult,
  RecordSetSource,
} from "./types.ts";
import type { Result } from "../util/result.ts";
import { err, ok } from "../util/result.ts";
import { describeIssues, validateValue } from "../schema/value-schema.ts";

/**
 * Deterministic filtering and sorting over a typed record set.
 *
 * This exists because "which properties are at or under my budget" must not be answered by prose
 * reasoning over a pile of listings. The runtime computes it; the model reports it.
 *
 * Two deliberate strictness choices:
 *  - A filter on an undeclared field is an ERROR, not an empty result. A hallucinated field name
 *    must be visibly wrong, not silently indistinguishable from "nothing matched".
 *  - Comparison operators require the declared field to be numeric. Comparing strings with `<` is
 *    the kind of quiet nonsense that produces confidently wrong answers.
 */

const COMPARISON_OPS = new Set(["lt", "lte", "gt", "gte"]);
const STRING_OPS = new Set(["contains", "starts_with"]);
const ALL_OPS = new Set(["eq", "ne", "lt", "lte", "gt", "gte", "in", "contains", "starts_with"]);

function fieldKind(source: RecordSetSource, field: string): string | null {
  const schema = source.fields[field];
  return schema ? schema.kind : null;
}

function validateFilter(source: RecordSetSource, filter: RecordFilter): RecordQueryError | null {
  if (!filter || typeof filter !== "object" || typeof filter.field !== "string") {
    return { code: "bad_value", message: "every filter requires a string field name" };
  }
  if (!ALL_OPS.has(filter.op)) {
    return { code: "bad_operator", message: `unsupported record filter operator ${JSON.stringify(filter.op)}` };
  }
  const schema = source.fields[filter.field];
  const kind = schema?.kind ?? null;
  if (kind === null) {
    const declared = Object.keys(source.fields).join(", ");
    return { code: "unknown_field", message: `unknown field "${filter.field}" on record set "${source.id}" (declared: ${declared})` };
  }
  if (COMPARISON_OPS.has(filter.op)) {
    if (kind !== "number") {
      return { code: "bad_operator", message: `operator "${filter.op}" requires a numeric field; "${filter.field}" is ${kind}` };
    }
    if (typeof filter.value !== "number" || !Number.isFinite(filter.value)) {
      return { code: "bad_value", message: `operator "${filter.op}" on "${filter.field}" requires a finite number, received ${JSON.stringify(filter.value)}` };
    }
  }
  if (STRING_OPS.has(filter.op) && typeof filter.value !== "string") {
    return { code: "bad_value", message: `operator "${filter.op}" on "${filter.field}" requires a string, received ${JSON.stringify(filter.value)}` };
  }
  if (STRING_OPS.has(filter.op) && kind !== "string" && kind !== "string_array") {
    return { code: "bad_operator", message: `operator "${filter.op}" requires a string or string_array field; "${filter.field}" is ${kind}` };
  }
  if (filter.op === "in" && !Array.isArray(filter.value)) {
    return { code: "bad_value", message: `operator "in" on "${filter.field}" requires an array, received ${JSON.stringify(filter.value)}` };
  }
  if ((filter.op === "eq" || filter.op === "ne") && schema) {
    const validation = validateValue(schema, filter.value, { coerce: false });
    if (!validation.ok) {
      return { code: "bad_value", message: `value for "${filter.field}" is invalid: ${describeIssues(validation.issues)}` };
    }
  }
  if (filter.op === "in" && schema) {
    for (const candidate of filter.value as unknown[]) {
      const validation = validateValue(schema, candidate, { coerce: false });
      if (!validation.ok) {
        return { code: "bad_value", message: `value in "${filter.field}" list is invalid: ${describeIssues(validation.issues)}` };
      }
    }
  }
  return null;
}

function matchesFilter(record: Record<string, unknown>, filter: RecordFilter): boolean {
  const actual = record[filter.field];
  switch (filter.op) {
    case "eq":
      return looseEquals(actual, filter.value);
    case "ne":
      return !looseEquals(actual, filter.value);
    case "lt":
      return typeof actual === "number" && actual < (filter.value as number);
    case "lte":
      return typeof actual === "number" && actual <= (filter.value as number);
    case "gt":
      return typeof actual === "number" && actual > (filter.value as number);
    case "gte":
      return typeof actual === "number" && actual >= (filter.value as number);
    case "in":
      return (filter.value as unknown[]).some((v) => looseEquals(actual, v));
    case "contains": {
      const needle = (filter.value as string).toLowerCase();
      if (Array.isArray(actual)) return actual.some((v) => String(v).toLowerCase().includes(needle));
      return String(actual ?? "").toLowerCase().includes(needle);
    }
    case "starts_with":
      return String(actual ?? "").toLowerCase().startsWith((filter.value as string).toLowerCase());
  }
}

/** Strings compare case-insensitively; everything else is strict. "TriBeCa" should match "tribeca". */
function looseEquals(a: unknown, b: unknown): boolean {
  if (typeof a === "string" && typeof b === "string") return a.toLowerCase() === b.toLowerCase();
  return a === b;
}

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""));
}

/**
 * Runs a query. Returns an error (never a misleading empty result) when the query references a
 * field the record set does not declare.
 */
export function queryRecords(source: RecordSetSource, query: RecordQuery): Result<RecordQueryResult, RecordQueryError> {
  if (query.filters !== undefined && !Array.isArray(query.filters)) {
    return err({ code: "bad_value", message: "record query filters must be an array" });
  }
  if (query.sort !== undefined && !Array.isArray(query.sort)) {
    return err({ code: "bad_value", message: "record query sort must be an array" });
  }
  if (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 0)) {
    return err({ code: "bad_value", message: `record query limit must be a non-negative integer, received ${JSON.stringify(query.limit)}` });
  }

  const filters = query.filters ?? [];
  for (const filter of filters) {
    const problem = validateFilter(source, filter);
    if (problem) return err(problem);
  }
  for (const sort of query.sort ?? []) {
    if (!sort || typeof sort !== "object" || (sort.direction !== "asc" && sort.direction !== "desc")) {
      return err({ code: "bad_value", message: "every sort requires a field and direction of asc or desc" });
    }
    if (fieldKind(source, sort.field) === null) {
      const declared = Object.keys(source.fields).join(", ");
      return err({ code: "unknown_field", message: `cannot sort by unknown field "${sort.field}" on record set "${source.id}" (declared: ${declared})` });
    }
  }

  let matches = source.records.filter((record) => filters.every((f) => matchesFilter(record, f)));
  const totalMatched = matches.length;

  const sorts = query.sort ?? [];
  if (sorts.length) {
    matches = matches.slice().sort((a, b) => {
      for (const sort of sorts) {
        const cmp = compareValues(a[sort.field], b[sort.field]);
        if (cmp !== 0) return sort.direction === "desc" ? -cmp : cmp;
      }
      return 0;
    });
  }

  if (query.limit !== undefined && query.limit >= 0) matches = matches.slice(0, query.limit);

  return ok({
    sourceId: source.id,
    matches,
    totalMatched,
    totalRecords: source.records.length,
    query: { filters, sort: sorts, limit: query.limit },
  });
}
