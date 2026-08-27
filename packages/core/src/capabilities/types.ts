import type { ModelToolSpec } from "../provider/types.ts";
import type { RetrievalRequest, KnowledgeResult } from "../knowledge/types.ts";
import type { ToolAttemptOutcome } from "../tools/authorize.ts";

export type CapabilityCategory = "knowledge" | "action";

export type CapabilityImplementation =
  | { kind: "knowledge"; sourceId: string; requestKind: RetrievalRequest["kind"] }
  | { kind: "tool"; toolName: string; effect: "read" | "write" | "external_side_effect" };

/** Internal/provider-neutral capability presented by an agentic Harness. */
export interface CapabilityDefinition {
  name: string;
  category: CapabilityCategory;
  readOnly: boolean;
  modelSpec: ModelToolSpec;
  implementation: CapabilityImplementation;
}

export interface CapabilityCatalogSnapshot {
  phaseId: string | null;
  capabilities: CapabilityDefinition[];
}

export type CapabilityOutcome =
  | {
      kind: "completed";
      category: CapabilityCategory;
      capabilityName: string;
      observation: Record<string, unknown>;
      knowledgeResult?: KnowledgeResult;
      toolOutcome?: Extract<ToolAttemptOutcome, { kind: "executed" | "replayed" }>;
    }
  | {
      kind: "awaiting_confirmation";
      category: "action";
      capabilityName: string;
      promptText: string;
      requestId: string;
    }
  | {
      kind: "rejected";
      category: CapabilityCategory;
      capabilityName: string;
      code: string;
      reason: string;
    };
