import type { ToolDefinition, ToolExecutor } from "./types.ts";
import type { KnowledgeIndex } from "../knowledge/in-memory.ts";
import type { RecordFilterOp, RecordQuery, RecordSetSource } from "../knowledge/types.ts";
import { recordFieldDescription, recordFieldExamples, recordFieldSchema } from "../knowledge/types.ts";

/**
 * Exposes a record set to the model as a deterministic READ tool.
 *
 * The model supplies the filter; the runtime computes the answer. "Which of these are at or under
 * $20M" therefore produces an authoritative tool result that shows up in the event stream and the
 * trace - the same class of fact as "the email was sent" - instead of being prose arithmetic the
 * model performed silently and might have got wrong.
 */

const FILTER_OPS: RecordFilterOp[] = ["eq", "ne", "lt", "lte", "gt", "gte", "in", "contains", "starts_with"];

export function recordQueryToolName(sourceId: string): string {
  return `query_${sourceId}`;
}

export function createRecordQueryToolDefinition(source: RecordSetSource): ToolDefinition {
  const fieldList = Object.entries(source.fields)
    .map(([key, field]) => {
      const description = recordFieldDescription(field);
      const examples = recordFieldExamples(field);
      return `${key} (${recordFieldSchema(field).kind})${description ? ` — ${description}` : ""}${examples?.length ? ` [examples: ${examples.map((value) => JSON.stringify(value)).join(", ")}]` : ""}`;
    })
    .join(", ");

  return {
    name: recordQueryToolName(source.id),
    label: `query ${source.title}`,
    description:
      `Deterministically filter and sort "${source.title}". Use this instead of reasoning over listings by hand ` +
      `whenever a numeric or exact constraint is involved (budget, bedroom count, location match). ` +
      `Available fields: ${fieldList}. Returns matching records plus the true total match count.`,
    effect: "read",
    confirmation: "none",
    idempotency: "per_input",
    input: {
      kind: "object",
      fields: {
        filters: {
          required: false,
          description: `Filter list. Every filter must hold (AND). Operators: ${FILTER_OPS.join(", ")}.`,
          schema: {
            kind: "array",
            maxItems: 8,
            items: {
              kind: "object",
              fields: {
                field: { required: true, description: `One of: ${Object.keys(source.fields).join(", ")}`, schema: { kind: "string" } },
                op: { required: true, schema: { kind: "enum", choices: [...FILTER_OPS] } },
                // Polymorphic by nature: the correct type depends on the field being filtered.
                // `queryRecords` validates it against that field's DECLARED type, which is stricter
                // than anything this layer could say.
                value: { required: true, description: "The value to compare against.", schema: { kind: "any" } },
              },
            },
          },
        },
        sort_field: { required: false, description: "Field to sort by.", schema: { kind: "string" } },
        sort_direction: { required: false, description: "Sort direction.", schema: { kind: "enum", choices: ["asc", "desc"] } },
        limit: { required: false, description: "Maximum records to return.", schema: { kind: "number", min: 1, max: 50, integer: true } },
      },
    },
    output: {
      kind: "object",
      additionalProperties: true,
      fields: {
        matches: {
          required: true,
          description: "Records satisfying every filter.",
          schema: { kind: "array", items: { kind: "object", additionalProperties: true, fields: {} } },
        },
        total_matched: { required: true, description: "How many records matched before the limit.", schema: { kind: "number" } },
        total_records: { required: true, description: "How many records exist in total.", schema: { kind: "number" } },
      },
    },
  };
}

/**
 * Parses the loose shape a model actually emits into a typed RecordQuery.
 *
 * Models emit filters as an array, an object map, or a single object. Accepting all three is
 * tolerance about *syntax* only - an unknown field or a bad operator still fails loudly downstream
 * in `queryRecords`, because that is a claim about the data, not a formatting quirk.
 */
export function parseRecordQueryArgs(args: Record<string, unknown>): RecordQuery {
  const raw = args["filters"];
  const filters: RecordQuery["filters"] = [];

  const pushFilter = (candidate: unknown) => {
    if (!candidate || typeof candidate !== "object") return;
    const obj = candidate as Record<string, unknown>;
    const field = obj["field"];
    const op = obj["op"] ?? obj["operator"];
    if (typeof field !== "string" || typeof op !== "string") return;
    filters.push({ field, op: op as RecordFilterOp, value: obj["value"] });
  };

  if (Array.isArray(raw)) raw.forEach(pushFilter);
  else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj["field"] === "string") pushFilter(obj);
    else for (const value of Object.values(obj)) pushFilter(value);
  }

  const query: RecordQuery = { filters };
  const sortField = args["sort_field"];
  if (typeof sortField === "string" && sortField) {
    const direction = args["sort_direction"] === "desc" ? "desc" : "asc";
    query.sort = [{ field: sortField, direction }];
  }
  const limit = args["limit"];
  if (typeof limit === "number" && Number.isFinite(limit)) query.limit = Math.trunc(limit);
  return query;
}

export function createRecordQueryExecutor(knowledge: KnowledgeIndex, sourceId: string): ToolExecutor {
  return {
    async execute(args) {
      const result = knowledge.queryRecords({ kind: "record_query", sourceId, ...parseRecordQueryArgs(args) });
      if (!result.ok) {
        return { ok: false, error: { code: result.error.code, message: result.error.message } };
      }
      const { matches, totalMatched, totalRecords } = result.value;
      const source = knowledge.getRecordSet(sourceId)!;
      return {
        ok: true,
        output: { matches, total_matched: totalMatched, total_records: totalRecords },
        facts: [
          {
            key: `${sourceId}_matches`,
            value: totalMatched,
            description: `${totalMatched} of ${totalRecords} records in "${source.title}" satisfy the stated constraints. This count is computed by the runtime and is authoritative.`,
          },
        ],
      };
    },
  };
}

/** Registers a query tool for every record set that has not opted out via `exposeQueryTool: false`. */
export function recordQueryTools(knowledge: KnowledgeIndex): { definition: ToolDefinition; executor: ToolExecutor }[] {
  return knowledge
    .recordSets()
    .filter((source) => knowledge.getBinding(source.id)?.exposeQueryTool !== false)
    .map((source) => ({
      definition: createRecordQueryToolDefinition(source),
      executor: createRecordQueryExecutor(knowledge, source.id),
    }));
}
