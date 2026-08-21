import type { AgentDefinition } from "../definition/types.ts";
import type { KnowledgeProvider, RetrievalRequest } from "../knowledge/types.ts";
import type { ToolRegistry } from "../tools/registry.ts";
import type { ObjectSchema } from "../schema/value-schema.ts";
import type { CapabilityCatalogSnapshot, CapabilityDefinition } from "./types.ts";
import { findPhase } from "../flow/evaluate.ts";
import { hashString } from "../util/hash.ts";

const FILTER_OPS = ["eq", "ne", "lt", "lte", "gt", "gte", "in", "contains", "starts_with"];

function safeName(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+/g, "_").slice(0, 32) || "source";
  return `${normalized}_${hashString(value).slice(0, 6)}`;
}

export function knowledgeCapabilityName(kind: RetrievalRequest["kind"], sourceId: string): string {
  return `knowledge_${kind}_${safeName(sourceId)}`;
}

function knowledgeInput(kind: RetrievalRequest["kind"]): ObjectSchema {
  if (kind === "document_search") {
    return {
      kind: "object",
      fields: {
        query: { required: true, description: "Standalone search query.", schema: { kind: "string", minLength: 1, maxLength: 500 } },
        top_k: { required: false, schema: { kind: "number", min: 1, integer: true } },
      },
    };
  }
  if (kind === "web_search") {
    return {
      kind: "object",
      fields: {
        query: { required: true, description: "Standalone web search query.", schema: { kind: "string", minLength: 1, maxLength: 500 } },
        max_results: { required: false, schema: { kind: "number", min: 1, integer: true } },
      },
    };
  }
  return {
    kind: "object",
    fields: {
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
  };
}

/** Builds only the current Phase's capability envelope. No executor is exposed. */
export function buildCapabilityCatalog(input: {
  definition: AgentDefinition;
  tools: ToolRegistry;
  knowledge: KnowledgeProvider;
  phaseId: string | null;
}): CapabilityCatalogSnapshot {
  const phase = input.definition.flow ? findPhase(input.definition.flow, input.phaseId) : undefined;
  const sources = input.knowledge.catalog(input.phaseId ?? undefined, phase?.knowledgeSourceIds);
  const capabilities: CapabilityDefinition[] = sources.map((source) => {
    const kind: RetrievalRequest["kind"] = source.type === "document" ? "document_search" : source.type === "record_set" ? "record_query" : "web_search";
    const scope = source.type === "web_search" && source.allowedDomains?.length
      ? ` Restricted to: ${source.allowedDomains.join(", ")}.`
      : "";
    return {
      name: knowledgeCapabilityName(kind, source.id),
      category: "knowledge" as const,
      readOnly: true,
      modelSpec: {
        name: knowledgeCapabilityName(kind, source.id),
        description: `${source.title}: ${source.description ?? "read-only evidence source"}.${scope}`,
        input: knowledgeInput(kind),
      },
      implementation: { kind: "knowledge" as const, sourceId: source.id, requestKind: kind },
    };
  });

  for (const tool of input.tools.availableIn(input.phaseId, phase?.toolNames)) {
    capabilities.push({
      name: tool.name,
      category: tool.effect === "read" ? "knowledge" : "action",
      readOnly: tool.effect === "read",
      modelSpec: { name: tool.name, description: tool.description, input: tool.input },
      implementation: { kind: "tool", toolName: tool.name, effect: tool.effect },
    });
  }

  return { phaseId: input.phaseId, capabilities };
}

export function retrievalFromCapability(capability: CapabilityDefinition, args: Record<string, unknown>): RetrievalRequest | null {
  if (capability.implementation.kind !== "knowledge") return null;
  const { sourceId, requestKind } = capability.implementation;
  if (requestKind === "document_search") {
    return {
      kind: requestKind,
      sourceId,
      query: String(args["query"] ?? ""),
      ...(args["top_k"] === undefined ? {} : { topK: Number(args["top_k"]) }),
    };
  }
  if (requestKind === "web_search") {
    return {
      kind: requestKind,
      sourceId,
      query: String(args["query"] ?? ""),
      ...(args["max_results"] === undefined ? {} : { maxResults: Number(args["max_results"]) }),
    };
  }
  return {
    kind: requestKind,
    sourceId,
    ...(Array.isArray(args["filters"]) ? { filters: args["filters"] as never } : {}),
    ...(Array.isArray(args["sort"]) ? { sort: args["sort"] as never } : {}),
    ...(args["limit"] === undefined ? {} : { limit: Number(args["limit"]) }),
  };
}
