import type { AgentDefinition, AgentRule, AgentRuleInput, DefinitionIssue } from "./types.ts";
import { DEFAULT_POLICIES } from "./types.ts";
import { hashValue } from "../util/hash.ts";

/** A goal longer than this is almost certainly a requirements document leaking into every prompt. */
const GOAL_WARN_CHARS = 600;

export interface DefineAgentInput extends Omit<AgentDefinition, "version" | "policies" | "knowledge" | "tools" | "globalRules"> {
  version?: number;
  policies?: Partial<AgentDefinition["policies"]>;
  knowledge?: AgentDefinition["knowledge"];
  tools?: AgentDefinition["tools"];
  globalRules?: AgentRuleInput[];
}

/** Legacy string rules remain non-overridable invariants; new definitions should use named rules. */
export function normalizeAgentRules(rules: AgentRuleInput[] = []): AgentRule[] {
  return rules.map((rule, index) =>
    typeof rule === "string"
      ? { id: `legacy-rule-${index + 1}`, text: rule, kind: "invariant", scope: "both" }
      : { ...rule, scope: rule.scope ?? "both" },
  );
}

/** Builds a definition with defaults filled in. Pure - no I/O, no clock unless the caller passes one. */
export function defineAgent(input: DefineAgentInput): AgentDefinition {
  return {
    id: input.id,
    version: input.version ?? 1,
    name: input.name,
    goal: input.goal,
    description: input.description,
    model: input.model,
    planning: input.planning,
    execution: input.execution,
    globalRules: input.globalRules ?? [],
    knowledge: input.knowledge ?? [],
    memorySchema: input.memorySchema,
    hostContextSchema: input.hostContextSchema,
    tools: input.tools ?? [],
    policies: { ...DEFAULT_POLICIES, ...(input.policies ?? {}) },
    flow: input.flow,
    createdAt: input.createdAt,
  };
}

/** Structural clone with `version + 1`. Definitions are immutable; a change is a new version. */
export function nextVersion(def: AgentDefinition, changes: Partial<Omit<AgentDefinition, "id" | "version">> = {}): AgentDefinition {
  const cloned = structuredClone(def) as AgentDefinition;
  return { ...cloned, ...changes, id: def.id, version: def.version + 1 };
}

/** Stable content hash, excluding `version`/`createdAt` so two identical bodies hash alike. */
export function definitionHash(def: AgentDefinition): string {
  const { version: _version, createdAt: _createdAt, ...body } = def;
  return hashValue(body);
}

export function definitionRef(def: AgentDefinition): { id: string; version: number; hash: string } {
  return { id: def.id, version: def.version, hash: definitionHash(def) };
}

/**
 * Validates internal consistency. Errors are structural problems that would make a run meaningless;
 * warnings are design smells the Studio surfaces but does not block on.
 */
export function validateDefinition(def: AgentDefinition): DefinitionIssue[] {
  const issues: DefinitionIssue[] = [];
  const error = (path: string, message: string) => issues.push({ severity: "error", path, message });
  const warn = (path: string, message: string) => issues.push({ severity: "warning", path, message });

  if (!def.id) error("id", "id is required");
  if (!Number.isInteger(def.version) || def.version < 1) error("version", "version must be a positive integer");
  if (!def.name) error("name", "name is required");
  if (!def.goal || !def.goal.trim()) error("goal", "goal is required");
  if (def.goal && def.goal.length > GOAL_WARN_CHARS) {
    warn("goal", `goal is ${def.goal.length} chars; it is compiled into every prompt. Keep it concise - move detail into knowledge sources or phase instructions.`);
  }
  if (!def.model?.providerId) error("model.providerId", "model.providerId is required");
  if (!def.model?.model) error("model.model", "model.model is required");
  if (def.planning?.mode && !["llm", "deterministic", "hybrid"].includes(def.planning.mode)) {
    error("planning.mode", `unknown planner mode "${String(def.planning.mode)}"`);
  }
  if (def.planning?.model && !def.planning.model.providerId) error("planning.model.providerId", "planner providerId is required");
  if (def.planning?.model && !def.planning.model.model) error("planning.model.model", "planner model is required");
  if (def.execution && !["agentic", "workflow", "two_pass", "native_agent", "claude_agent"].includes(def.execution.harness)) {
    error("execution.harness", `unknown Harness "${String(def.execution.harness)}"`);
  }
  if (def.execution?.executionContextPolicy === "resume") {
    error("execution.executionContextPolicy", "v0.35 supports only fresh_each_turn; resume is deferred to v0.4");
  }

  if (def.policies.maxSteps < 1) error("policies.maxSteps", "maxSteps must be at least 1");
  if (def.policies.maxToolCallsPerTurn < 0) error("policies.maxToolCallsPerTurn", "maxToolCallsPerTurn cannot be negative");
  if (!Number.isInteger(def.policies.maxRetrievalRequests) || def.policies.maxRetrievalRequests < 0) {
    error("policies.maxRetrievalRequests", "maxRetrievalRequests must be a non-negative integer");
  }
  if (!Number.isInteger(def.policies.maxDocumentChunks) || def.policies.maxDocumentChunks < 1) {
    error("policies.maxDocumentChunks", "maxDocumentChunks must be at least 1");
  }
  if (!Number.isInteger(def.policies.maxRecordRows) || def.policies.maxRecordRows < 1) {
    error("policies.maxRecordRows", "maxRecordRows must be at least 1");
  }
  if (!Number.isInteger(def.policies.maxKnowledgeChars) || def.policies.maxKnowledgeChars < 1) {
    error("policies.maxKnowledgeChars", "maxKnowledgeChars must be at least 1");
  }
  if (!Number.isInteger(def.policies.maxAgentIterations) || def.policies.maxAgentIterations < 1) {
    error("policies.maxAgentIterations", "maxAgentIterations must be at least 1");
  }
  if (!Number.isInteger(def.policies.maxKnowledgeCallsPerTurn) || def.policies.maxKnowledgeCallsPerTurn < 0) {
    error("policies.maxKnowledgeCallsPerTurn", "maxKnowledgeCallsPerTurn must be a non-negative integer");
  }
  if (!Number.isInteger(def.policies.maxActionRequestsPerTurn) || def.policies.maxActionRequestsPerTurn < 0) {
    error("policies.maxActionRequestsPerTurn", "maxActionRequestsPerTurn must be a non-negative integer");
  }
  if (!Number.isInteger(def.policies.maxParallelReadCalls) || def.policies.maxParallelReadCalls < 1) {
    error("policies.maxParallelReadCalls", "maxParallelReadCalls must be at least 1");
  }
  if (def.policies.allowUnconfirmedSideEffects) {
    warn("policies.allowUnconfirmedSideEffects", "confirmation gating is disabled; side-effecting tools will run without a resolved PendingAction");
  }

  const memoryKeys = new Set<string>();
  for (const field of def.memorySchema.fields) {
    if (memoryKeys.has(field.key)) error(`memorySchema.${field.key}`, `duplicate memory field "${field.key}"`);
    memoryKeys.add(field.key);
    if (field.schema.kind === "enum" && field.schema.choices.length === 0) {
      error(`memorySchema.${field.key}`, "enum field declares no choices");
    }
    if (field.schema.kind === "number") {
      const { min, max } = field.schema;
      if (min !== undefined && max !== undefined && min > max) {
        error(`memorySchema.${field.key}`, `min (${min}) is greater than max (${max})`);
      }
    }
  }

  const contextKeys = new Set<string>();
  for (const field of def.hostContextSchema.fields) {
    if (contextKeys.has(field.key)) error(`hostContextSchema.${field.key}`, `duplicate context field "${field.key}"`);
    contextKeys.add(field.key);
  }

  const rules = normalizeAgentRules(def.globalRules);
  const ruleIds = new Set<string>();
  for (const rule of rules) {
    if (!rule.id.trim()) error("globalRules", "rule id is required");
    if (!rule.text.trim()) error(`globalRules.${rule.id}`, "rule text is required");
    if (ruleIds.has(rule.id)) error(`globalRules.${rule.id}`, `duplicate rule id "${rule.id}"`);
    if (rule.scope && !["planner", "response", "both"].includes(rule.scope)) {
      error(`globalRules.${rule.id}.scope`, `unknown instruction scope "${String(rule.scope)}"`);
    }
    ruleIds.add(rule.id);
  }

  const sourceIds = new Set<string>();
  for (const binding of def.knowledge) {
    const src = binding.source;
    if (sourceIds.has(src.id)) error(`knowledge.${src.id}`, `duplicate knowledge source "${src.id}"`);
    sourceIds.add(src.id);
    if (!src.description?.trim()) warn(`knowledge.${src.id}.description`, "a concise description helps the planner select this source without seeing its contents");
    if (binding.topK !== undefined && (!Number.isInteger(binding.topK) || binding.topK < 1)) {
      error(`knowledge.${src.id}.topK`, "topK must be a positive integer");
    }
    if (src.kind === "record_set") {
      if (Object.keys(src.fields).length === 0) error(`knowledge.${src.id}`, "record_set declares no fields");
      for (const [i, record] of src.records.entries()) {
        for (const key of Object.keys(record)) {
          if (!Object.prototype.hasOwnProperty.call(src.fields, key)) {
            warn(`knowledge.${src.id}.records[${i}]`, `record has undeclared field "${key}"; it cannot be filtered or sorted on`);
          }
        }
      }
    } else if (src.kind === "document") {
      const chunkSize = src.chunking?.chunkSize ?? 1000;
      const chunkOverlap = src.chunking?.chunkOverlap ?? 200;
      if (!Number.isInteger(chunkSize) || chunkSize < 1) error(`knowledge.${src.id}.chunking.chunkSize`, "chunkSize must be a positive integer");
      if (!Number.isInteger(chunkOverlap) || chunkOverlap < 0) error(`knowledge.${src.id}.chunking.chunkOverlap`, "chunkOverlap must be a non-negative integer");
      if (chunkOverlap >= chunkSize) error(`knowledge.${src.id}.chunking`, "chunkOverlap must be smaller than chunkSize");
    } else {
      if (src.maxResults !== undefined && (!Number.isInteger(src.maxResults) || src.maxResults < 1)) {
        error(`knowledge.${src.id}.maxResults`, "maxResults must be a positive integer");
      }
      for (const [field, domains] of [["allowedDomains", src.allowedDomains], ["blockedDomains", src.blockedDomains]] as const) {
        if (domains?.some((domain) => !domain.trim() || domain.includes("/") || domain.includes(":"))) {
          error(`knowledge.${src.id}.${field}`, "domains must be bare host names such as example.com");
        }
      }
      const overlap = new Set(src.allowedDomains ?? []);
      if ((src.blockedDomains ?? []).some((domain) => overlap.has(domain))) {
        error(`knowledge.${src.id}`, "the same domain cannot be both allowed and blocked");
      }
    }
  }

  const toolNames = new Set<string>();
  for (const binding of def.tools) {
    const t = binding.definition;
    if (toolNames.has(t.name)) error(`tools.${t.name}`, `duplicate tool "${t.name}"`);
    toolNames.add(t.name);
    if (t.effect === "external_side_effect" && t.confirmation === "none") {
      warn(`tools.${t.name}`, "external side effect with confirmation:\"none\" will run without asking the user");
    }
    if (t.effect === "external_side_effect" && t.idempotency === "none") {
      warn(`tools.${t.name}`, "external side effect with idempotency:\"none\" can fire twice for the same request");
    }
    if (t.effect === "external_side_effect") {
      for (const argumentName of Object.keys(t.input.fields)) {
        if (!t.argumentPolicies?.[argumentName]) {
          error(`tools.${t.name}.argumentPolicies.${argumentName}`, "external side-effect arguments require an explicit authoritative_value or model_composed policy");
        }
      }
      for (const [argumentName, policy] of Object.entries(t.argumentPolicies ?? {})) {
        if (!Object.prototype.hasOwnProperty.call(t.input.fields, argumentName)) {
          error(`tools.${t.name}.argumentPolicies.${argumentName}`, `policy references unknown argument "${argumentName}"`);
          continue;
        }
        if (policy.kind === "authoritative_value" && !policy.sources.length) {
          error(`tools.${t.name}.argumentPolicies.${argumentName}`, "authoritative_value policy requires at least one source");
        }
        for (const source of policy.kind === "authoritative_value" ? policy.sources : []) {
          const [namespace, ...rest] = source.split(".");
          const key = rest.join(".");
          if (!key || !["memory", "host_context", "tool_fact"].includes(namespace ?? "")) {
            error(`tools.${t.name}.argumentPolicies.${argumentName}`, `invalid authoritative source "${source}"`);
          } else if (namespace === "memory" && !memoryKeys.has(key)) {
            error(`tools.${t.name}.argumentPolicies.${argumentName}`, `source references unknown memory field "${key}"`);
          } else if (namespace === "host_context" && !contextKeys.has(key)) {
            error(`tools.${t.name}.argumentPolicies.${argumentName}`, `source references unknown host-context field "${key}"`);
          }
        }
      }
    }
  }

  if (def.flow) {
    const phaseIds = new Set<string>();
    for (const phase of def.flow.phases) {
      if (phaseIds.has(phase.id)) error(`flow.${phase.id}`, `duplicate phase "${phase.id}"`);
      phaseIds.add(phase.id);
    }
    if (!phaseIds.has(def.flow.initialPhaseId)) {
      error("flow.initialPhaseId", `initial phase "${def.flow.initialPhaseId}" is not among the declared phases`);
    }
    for (const binding of def.knowledge) {
      for (const phaseId of binding.phaseIds ?? []) {
        if (!phaseIds.has(phaseId)) error(`knowledge.${binding.source.id}.phaseIds`, `source binding references unknown phase "${phaseId}"`);
      }
    }
    for (const binding of def.tools) {
      for (const phaseId of binding.phaseIds ?? []) {
        if (!phaseIds.has(phaseId)) error(`tools.${binding.definition.name}.phaseIds`, `tool binding references unknown phase "${phaseId}"`);
      }
    }
    for (const phase of def.flow.phases) {
      for (const ruleId of phase.overrideRuleIds ?? []) {
        const rule = rules.find((candidate) => candidate.id === ruleId);
        if (!rule) error(`flow.${phase.id}.overrideRuleIds`, `phase overrides unknown rule "${ruleId}"`);
        else if (rule.kind === "invariant") error(`flow.${phase.id}.overrideRuleIds`, `phase cannot override invariant rule "${ruleId}"`);
      }
      for (const [i, transition] of (phase.transitions ?? []).entries()) {
        if (!phaseIds.has(transition.to)) {
          error(`flow.${phase.id}.transitions[${i}]`, `transition targets unknown phase "${transition.to}"`);
        }
      }
      for (const name of phase.toolNames ?? []) {
        if (!toolNames.has(name)) error(`flow.${phase.id}.toolNames`, `phase scopes unknown tool "${name}"`);
      }
      for (const id of phase.knowledgeSourceIds ?? []) {
        if (!sourceIds.has(id)) error(`flow.${phase.id}.knowledgeSourceIds`, `phase scopes unknown knowledge source "${id}"`);
      }
      if (phase.terminal !== true && (phase.transitions ?? []).length === 0 && def.flow.phases.length > 1) {
        warn(`flow.${phase.id}`, "non-terminal phase has no outgoing transitions; a session entering it can never leave");
      }
    }
  }
  if (!def.flow) {
    for (const binding of def.knowledge) {
      if (binding.phaseIds?.length) error(`knowledge.${binding.source.id}.phaseIds`, "source binding is phase-scoped but the definition has no flow");
    }
    for (const binding of def.tools) {
      if (binding.phaseIds?.length) error(`tools.${binding.definition.name}.phaseIds`, "tool binding is phase-scoped but the definition has no flow");
    }
  }

  return issues;
}

export function assertValidDefinition(def: AgentDefinition): void {
  const errors = validateDefinition(def).filter((i) => i.severity === "error");
  if (errors.length) {
    throw new Error(`invalid AgentDefinition: ${errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`);
  }
}

/** Round-trip through JSON, proving the definition really is serializable. Used by import/export. */
export function serializeDefinition(def: AgentDefinition): string {
  return JSON.stringify(def, null, 2);
}

export function deserializeDefinition(json: string): AgentDefinition {
  const parsed = JSON.parse(json) as AgentDefinition;
  return defineAgent(parsed);
}
