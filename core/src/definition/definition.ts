import type { AgentDefinition, DefinitionIssue } from "./types.ts";
import { DEFAULT_POLICIES } from "./types.ts";
import { hashValue } from "../util/hash.ts";

/** A goal longer than this is almost certainly a requirements document leaking into every prompt. */
const GOAL_WARN_CHARS = 600;

export interface DefineAgentInput extends Omit<AgentDefinition, "version" | "policies" | "knowledge" | "tools" | "globalRules"> {
  version?: number;
  policies?: Partial<AgentDefinition["policies"]>;
  knowledge?: AgentDefinition["knowledge"];
  tools?: AgentDefinition["tools"];
  globalRules?: string[];
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

  if (def.policies.maxSteps < 1) error("policies.maxSteps", "maxSteps must be at least 1");
  if (def.policies.maxToolCallsPerTurn < 0) error("policies.maxToolCallsPerTurn", "maxToolCallsPerTurn cannot be negative");
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

  const sourceIds = new Set<string>();
  for (const binding of def.knowledge) {
    const src = binding.source;
    if (sourceIds.has(src.id)) error(`knowledge.${src.id}`, `duplicate knowledge source "${src.id}"`);
    sourceIds.add(src.id);
    if (src.kind === "record_set") {
      if (Object.keys(src.fields).length === 0) error(`knowledge.${src.id}`, "record_set declares no fields");
      for (const [i, record] of src.records.entries()) {
        for (const key of Object.keys(record)) {
          if (!Object.prototype.hasOwnProperty.call(src.fields, key)) {
            warn(`knowledge.${src.id}.records[${i}]`, `record has undeclared field "${key}"; it cannot be filtered or sorted on`);
          }
        }
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
  }

  if (def.flow) {
    const phaseIds = new Set(def.flow.phases.map((p) => p.id));
    if (!phaseIds.has(def.flow.initialPhaseId)) {
      error("flow.initialPhaseId", `initial phase "${def.flow.initialPhaseId}" is not among the declared phases`);
    }
    for (const phase of def.flow.phases) {
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
