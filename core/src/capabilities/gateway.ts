import type { AuthorizeDeps, ToolAttemptOutcome } from "../tools/authorize.ts";
import type { HarnessServices } from "../harness/types.ts";
import type { KnowledgeResult, RetrievalRequest } from "../knowledge/types.ts";
import type { TurnPlanValidationError } from "../planning/types.ts";
import type { CapabilityCatalogSnapshot, CapabilityCategory, CapabilityOutcome } from "./types.ts";
import { attemptToolCall } from "../tools/authorize.ts";
import { buildCapabilityCatalog, knowledgeCapabilityName, retrievalFromCapability } from "./catalog.ts";
import { findPhase } from "../flow/evaluate.ts";

export interface CapabilityGatewayOptions {
  services: HarnessServices;
  deps: AuthorizeDeps;
  harnessName: string;
  turn: number;
}

/**
 * One runtime-owned authority gateway shared by provider-neutral and provider-specific Harnesses.
 * It owns deterministic limits, Phase checks, schema/retrieval validation, confirmation, and trace.
 */
export class CapabilityGateway {
  private readonly services: HarnessServices;
  private readonly deps: AuthorizeDeps;
  private readonly harnessName: string;
  private readonly turn: number;
  private knowledgeCalls = 0;
  private actionRequests = 0;
  private toolCalls = 0;
  private actionQueue: Promise<void> = Promise.resolve();

  constructor(options: CapabilityGatewayOptions) {
    this.services = options.services;
    this.deps = options.deps;
    this.harnessName = options.harnessName;
    this.turn = options.turn;
  }

  get counts(): { knowledgeCalls: number; actionRequests: number; toolCalls: number } {
    return { knowledgeCalls: this.knowledgeCalls, actionRequests: this.actionRequests, toolCalls: this.toolCalls };
  }

  catalog(): CapabilityCatalogSnapshot {
    return buildCapabilityCatalog({
      definition: this.services.definition,
      tools: this.services.tools,
      knowledge: this.services.knowledge,
      phaseId: this.deps.journal.state.phaseId,
    });
  }

  async requestByName(name: string, args: Record<string, unknown>, iteration: number): Promise<CapabilityOutcome> {
    const capability = this.catalog().capabilities.find((candidate) => candidate.name === name);
    if (!capability) {
      const tool = this.services.tools.getDefinition(name);
      const category: CapabilityCategory = tool?.effect === "read" ? "knowledge" : "action";
      this.requested(iteration, category, name, args);
      return this.rejected(iteration, category, name, "capability_not_available", `capability "${name}" is not available in phase "${this.deps.journal.state.phaseId}"`);
    }
    if (capability.implementation.kind === "knowledge") {
      return this.requestKnowledge(retrievalFromCapability(capability, args)!, iteration, capability.name);
    }
    return this.requestTool(capability.implementation.toolName, args, iteration, capability.category);
  }

  async requestKnowledge(request: RetrievalRequest, iteration: number, capabilityName = knowledgeCapabilityName(request.kind, request.sourceId)): Promise<CapabilityOutcome> {
    this.requested(iteration, "knowledge", capabilityName, structuredClone(request) as unknown as Record<string, unknown>);
    const policies = this.services.definition.policies;
    if (this.knowledgeCalls >= policies.maxKnowledgeCallsPerTurn) {
      return this.rejectKnowledge(request, iteration, capabilityName, {
        code: "knowledge_limit_exceeded",
        message: `turn exceeds maxKnowledgeCallsPerTurn=${policies.maxKnowledgeCallsPerTurn}`,
      });
    }
    this.knowledgeCalls++;

    const binding = this.services.definition.knowledge.find((candidate) => candidate.source.id === request.sourceId);
    if (!binding) {
      return this.rejectKnowledge(request, iteration, capabilityName, { code: "unknown_source", message: `unknown knowledge source "${request.sourceId}"` });
    }
    const phase = this.services.definition.flow ? findPhase(this.services.definition.flow, this.deps.journal.state.phaseId) : undefined;
    const permitted = (!phase?.knowledgeSourceIds || phase.knowledgeSourceIds.includes(request.sourceId))
      && (!binding.phaseIds || (!!this.deps.journal.state.phaseId && binding.phaseIds.includes(this.deps.journal.state.phaseId)));
    if (!permitted) {
      return this.rejectKnowledge(request, iteration, capabilityName, {
        code: "source_not_permitted_in_phase",
        message: `source "${request.sourceId}" is not permitted in phase "${this.deps.journal.state.phaseId}"`,
      });
    }

    if (request.kind === "document_search") {
      if (binding.source.kind !== "document") {
        return this.rejectKnowledge(request, iteration, capabilityName, { code: "wrong_source_kind", message: `source "${request.sourceId}" is not a document` });
      }
      const topK = request.topK ?? binding.topK ?? 3;
      if (!request.query.trim() || !Number.isInteger(topK) || topK < 1 || topK > policies.maxDocumentChunks) {
        return this.rejectKnowledge(request, iteration, capabilityName, {
          code: "invalid_document_query",
          message: `document query must be non-empty and topK must be within 1..${policies.maxDocumentChunks}`,
        });
      }
      try {
        const normalized = { ...request, query: request.query.trim(), topK };
        const chunks = (await this.services.knowledge.retrieve(normalized)).slice(0, policies.maxDocumentChunks);
        const result: KnowledgeResult = { kind: request.kind, sourceId: request.sourceId, sourceTitle: binding.source.title, query: normalized.query, chunks };
        this.deps.journal.append({
          type: "KnowledgeRetrieved",
          turn: this.turn,
          payload: { request: normalized, sourceId: request.sourceId, resultIds: chunks.map((chunk) => chunk.chunkId), scores: chunks.map((chunk) => chunk.score), returnedCount: chunks.length },
        });
        return this.completed(iteration, "knowledge", capabilityName, { returnedCount: chunks.length, resultIds: chunks.map((chunk) => chunk.chunkId) }, result);
      } catch (error) {
        return this.rejectKnowledge(request, iteration, capabilityName, { code: "invalid_document_query", message: error instanceof Error ? error.message : String(error) });
      }
    }

    if (request.kind === "record_query") {
      if (binding.source.kind !== "record_set") {
        return this.rejectKnowledge(request, iteration, capabilityName, { code: "wrong_source_kind", message: `source "${request.sourceId}" is not a record_set` });
      }
      if (request.limit !== undefined && request.limit > policies.maxRecordRows) {
        return this.rejectKnowledge(request, iteration, capabilityName, { code: "retrieval_limit_exceeded", message: `record query limit exceeds maxRecordRows=${policies.maxRecordRows}` });
      }
      const normalized = { ...request, limit: request.limit ?? policies.maxRecordRows };
      const queried = this.services.knowledge.queryRecords(normalized);
      if (!queried.ok) {
        return this.rejectKnowledge(request, iteration, capabilityName, { code: "invalid_record_query", message: queried.error.message });
      }
      const matches = queried.value.matches.slice(0, policies.maxRecordRows);
      const result: KnowledgeResult = {
        kind: request.kind,
        sourceId: request.sourceId,
        sourceTitle: binding.source.title,
        query: queried.value.query,
        matches,
        totalMatched: queried.value.totalMatched,
        totalRecords: queried.value.totalRecords,
      };
      const resultIds = matches.map((record, row) => `${request.sourceId}#${String(record["id"] ?? row)}`);
      this.deps.journal.append({
        type: "KnowledgeRetrieved",
        turn: this.turn,
        payload: { request: normalized, sourceId: request.sourceId, resultIds, returnedCount: matches.length, totalMatched: queried.value.totalMatched },
      });
      return this.completed(iteration, "knowledge", capabilityName, { returnedCount: matches.length, totalMatched: queried.value.totalMatched, resultIds }, result);
    }

    if (binding.source.kind !== "web_search") {
      return this.rejectKnowledge(request, iteration, capabilityName, { code: "wrong_source_kind", message: `source "${request.sourceId}" is not web_search` });
    }
    const maxResults = request.maxResults ?? binding.source.maxResults ?? 5;
    if (!request.query.trim() || !Number.isInteger(maxResults) || maxResults < 1 || (binding.source.maxResults !== undefined && maxResults > binding.source.maxResults)) {
      return this.rejectKnowledge(request, iteration, capabilityName, {
        code: "invalid_web_query",
        message: `web query must be non-empty and maxResults must respect the source limit${binding.source.maxResults ? ` (${binding.source.maxResults})` : ""}`,
      });
    }
    if (!this.services.knowledge.searchWeb) {
      return this.rejectKnowledge(request, iteration, capabilityName, { code: "web_search_unavailable", message: "no WebSearchProvider implementation was injected" });
    }
    try {
      const normalized = { ...request, query: request.query.trim(), maxResults };
      const result = await this.services.knowledge.searchWeb(normalized);
      this.deps.journal.append({
        type: "KnowledgeRetrieved",
        turn: this.turn,
        payload: { request: normalized, sourceId: request.sourceId, resultIds: result.results.map((item) => item.url), returnedCount: result.results.length },
      });
      return this.completed(iteration, "knowledge", capabilityName, { returnedCount: result.results.length, resultIds: result.results.map((item) => item.url), allowedDomains: result.allowedDomains }, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = /no WebSearchProvider/i.test(message) ? "web_search_unavailable" : "invalid_web_query";
      return this.rejectKnowledge(request, iteration, capabilityName, { code, message } as TurnPlanValidationError);
    }
  }

  async requestTool(toolName: string, args: Record<string, unknown>, iteration: number, category?: CapabilityCategory): Promise<CapabilityOutcome> {
    const definition = this.services.tools.getDefinition(toolName);
    const resolvedCategory = category ?? (definition?.effect === "read" ? "knowledge" : "action");
    this.requested(iteration, resolvedCategory, toolName, args);
    const policies = this.services.definition.policies;
    if (this.toolCalls >= policies.maxToolCallsPerTurn) {
      return this.rejected(iteration, resolvedCategory, toolName, "tool_limit_exceeded", `turn exceeds maxToolCallsPerTurn=${policies.maxToolCallsPerTurn}`);
    }
    if (resolvedCategory === "knowledge") {
      if (this.knowledgeCalls >= policies.maxKnowledgeCallsPerTurn) {
        return this.rejected(iteration, resolvedCategory, toolName, "knowledge_limit_exceeded", `turn exceeds maxKnowledgeCallsPerTurn=${policies.maxKnowledgeCallsPerTurn}`);
      }
      this.knowledgeCalls++;
    } else {
      if (this.actionRequests >= policies.maxActionRequestsPerTurn) {
        return this.rejected(iteration, resolvedCategory, toolName, "action_limit_exceeded", `turn exceeds maxActionRequestsPerTurn=${policies.maxActionRequestsPerTurn}`);
      }
      this.actionRequests++;
    }
    this.toolCalls++;
    const execute = () => attemptToolCall(this.deps, toolName, args, this.turn, "model");
    const outcome = resolvedCategory === "action" ? await this.runActionSequential(execute) : await execute();
    if (outcome.kind === "awaiting_confirmation") {
      this.deps.journal.append({
        type: "DelegationCompleted",
        turn: this.turn,
        payload: { harness: this.harnessName, iteration, category: "action", capabilityName: toolName, outcome: "awaiting_confirmation", summary: { requestId: outcome.requestId } },
      });
      return { kind: "awaiting_confirmation", category: "action", capabilityName: toolName, promptText: outcome.promptText, requestId: outcome.requestId };
    }
    if (outcome.kind === "rejected") {
      return this.rejected(iteration, resolvedCategory, toolName, outcome.rejection.reason, outcome.rejection.message);
    }
    const observation = outcome.result.ok
      ? { ok: true, output: outcome.result.output, facts: outcome.result.facts ?? [], replayed: outcome.kind === "replayed" }
      : { ok: false, error: outcome.result.error, retryable: outcome.result.retryable ?? false };
    this.deps.journal.append({
      type: "DelegationCompleted",
      turn: this.turn,
      payload: { harness: this.harnessName, iteration, category: resolvedCategory, capabilityName: toolName, outcome: outcome.kind === "replayed" ? "replayed" : "completed", summary: observation },
    });
    return { kind: "completed", category: resolvedCategory, capabilityName: toolName, observation, toolOutcome: outcome };
  }

  private requested(iteration: number, category: CapabilityCategory, capabilityName: string, input: Record<string, unknown>): void {
    this.deps.journal.append({ type: "DelegationRequested", turn: this.turn, payload: { harness: this.harnessName, iteration, category, capabilityName, input } });
  }

  private rejectKnowledge(request: RetrievalRequest, iteration: number, capabilityName: string, error: TurnPlanValidationError): CapabilityOutcome {
    this.deps.journal.append({ type: "RetrievalRequestRejected", turn: this.turn, payload: { request, error } });
    return this.rejected(iteration, "knowledge", capabilityName, error.code, error.message);
  }

  private rejected(iteration: number, category: CapabilityCategory, capabilityName: string, code: string, reason: string): CapabilityOutcome {
    this.deps.journal.append({ type: "DelegationRejected", turn: this.turn, payload: { harness: this.harnessName, iteration, category, capabilityName, code, reason } });
    return { kind: "rejected", category, capabilityName, code, reason };
  }

  private completed(
    iteration: number,
    category: CapabilityCategory,
    capabilityName: string,
    observation: Record<string, unknown>,
    knowledgeResult?: KnowledgeResult,
    toolOutcome?: Extract<ToolAttemptOutcome, { kind: "executed" | "replayed" }>,
  ): CapabilityOutcome {
    this.deps.journal.append({
      type: "DelegationCompleted",
      turn: this.turn,
      payload: { harness: this.harnessName, iteration, category, capabilityName, outcome: toolOutcome?.kind === "replayed" ? "replayed" : "completed", summary: observation },
    });
    return { kind: "completed", category, capabilityName, observation, knowledgeResult, toolOutcome };
  }

  private runActionSequential<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.actionQueue.then(operation, operation);
    this.actionQueue = run.then(() => undefined, () => undefined);
    return run;
  }
}
