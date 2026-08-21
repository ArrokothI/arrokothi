import type { ObjectSchema } from "../schema/value-schema.ts";
import { describeIssues, validateObject } from "../schema/value-schema.ts";
import type { DeterministicPlanner, TurnPlan } from "./types.ts";
import { EMPTY_TURN_PLAN } from "./types.ts";

const FILTER_OPS = ["eq", "ne", "lt", "lte", "gt", "gte", "in", "contains", "starts_with"];

/** Provider-neutral structured-output schema for the single semantic planning call. */
export function turnPlanSchema(maxRetrievalRequests: number): ObjectSchema {
  return {
    kind: "object",
    fields: {
      memory_writes: {
        required: false,
        description: "Facts established by the latest user message. Never infer or guess.",
        schema: { kind: "object", additionalProperties: true, fields: {} },
      },
      working_notes: {
        required: false,
        description: "Short unverified observations; these can never authorize an action.",
        schema: { kind: "string_array", maxItems: 5 },
      },
      signals: {
        required: false,
        description: "Only routing signals from the supplied vocabulary.",
        schema: { kind: "string_array", maxItems: 6 },
      },
      retrieval_requests: {
        required: false,
        description: "Zero or more explicit document searches or deterministic record queries.",
        schema: {
          kind: "array",
          maxItems: maxRetrievalRequests,
          items: {
            kind: "object",
            fields: {
              kind: { required: true, schema: { kind: "enum", choices: ["document_search", "record_query"] } },
              source_id: { required: true, schema: { kind: "string", minLength: 1 } },
              query: { required: false, schema: { kind: "string", minLength: 1, maxLength: 500 } },
              top_k: { required: false, schema: { kind: "number", min: 1, integer: true } },
              filters: {
                required: false,
                schema: {
                  kind: "array",
                  maxItems: 8,
                  items: {
                    kind: "object",
                    fields: {
                      field: { required: true, schema: { kind: "string", minLength: 1 } },
                      op: { required: true, schema: { kind: "enum", choices: FILTER_OPS } },
                      value: { required: true, schema: { kind: "any" } },
                    },
                  },
                },
              },
              sort: {
                required: false,
                schema: {
                  kind: "array",
                  maxItems: 4,
                  items: {
                    kind: "object",
                    fields: {
                      field: { required: true, schema: { kind: "string", minLength: 1 } },
                      direction: { required: true, schema: { kind: "enum", choices: ["asc", "desc"] } },
                    },
                  },
                },
              },
              limit: { required: false, schema: { kind: "number", min: 1, integer: true } },
            },
          },
        },
      },
    },
  };
}

export type ParsedTurnPlan = { ok: true; plan: TurnPlan } | { ok: false; message: string };

/** Parses syntax only. Source/kind/record-field authority is validated when retrieval executes. */
export function parseTurnPlan(value: unknown, maxRetrievalRequests: number): ParsedTurnPlan {
  const validation = validateObject(turnPlanSchema(maxRetrievalRequests), value, { coerce: false });
  if (!validation.ok) return { ok: false, message: describeIssues(validation.issues) };
  const parsed = validation.value as Record<string, unknown>;
  const writes = (parsed["memory_writes"] ?? {}) as Record<string, unknown>;
  const workingNotes = (parsed["working_notes"] ?? []) as string[];
  const signals = (parsed["signals"] ?? []) as string[];
  const requests = (parsed["retrieval_requests"] ?? []) as Record<string, unknown>[];

  for (const [index, request] of requests.entries()) {
    if (request["kind"] === "document_search") {
      if (typeof request["query"] !== "string") {
        return { ok: false, message: `retrieval_requests[${index}].query is required for document_search` };
      }
      if (request["filters"] !== undefined || request["sort"] !== undefined || request["limit"] !== undefined) {
        return { ok: false, message: `retrieval_requests[${index}] mixes record-query fields into document_search` };
      }
    } else if (request["query"] !== undefined || request["top_k"] !== undefined) {
      return { ok: false, message: `retrieval_requests[${index}] mixes document-search fields into record_query` };
    }
  }

  return {
    ok: true,
    plan: {
      memoryProposals: Object.entries(writes).map(([key, proposalValue]) => ({ key, value: proposalValue })),
      workingNotes: workingNotes.map((text) => ({ text })),
      signals,
      retrievalRequests: requests.map((request) => {
        if (request["kind"] === "document_search") {
          return {
            kind: "document_search" as const,
            sourceId: String(request["source_id"]),
            query: String(request["query"] ?? ""),
            ...(request["top_k"] === undefined ? {} : { topK: request["top_k"] as number }),
          };
        }
        return {
          kind: "record_query" as const,
          sourceId: String(request["source_id"]),
          ...((request["filters"] as never[] | undefined)?.length ? { filters: request["filters"] as never } : {}),
          ...((request["sort"] as never[] | undefined)?.length ? { sort: request["sort"] as never } : {}),
          ...(request["limit"] === undefined ? {} : { limit: request["limit"] as number }),
        };
      }),
    },
  };
}

/** Default deterministic strategy: only a provably trivial turn is conclusive. */
export class ConservativeDeterministicPlanner implements DeterministicPlanner {
  plan(input: Parameters<DeterministicPlanner["plan"]>[0]) {
    if (!input.sourceCatalog.length && !input.signalVocabulary.length && !input.memoryFieldKeys.length) {
      return { kind: "planned" as const, plan: structuredClone(EMPTY_TURN_PLAN), reason: "no planning inputs exist" };
    }
    return { kind: "unknown" as const, reason: "semantic interpretation is not deterministically decidable" };
  }
}
