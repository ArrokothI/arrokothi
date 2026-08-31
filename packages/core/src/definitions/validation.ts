/**
 * Definition validation, integrity, and the two authoring entry points.
 *
 * Validation answers one question mechanically: *is this definition portable data that a Harness
 * anywhere can pin, store, ship, and re-read unchanged?* It therefore checks identity, versioning,
 * kind, JSON-only content, and the declared terminal-result schema. It deliberately does not try
 * to detect "an API key" or "a tenant model" by property name - a name-based check would be
 * security theatre. The structural rule (plain JSON only, no instances, no closures) is the part
 * that actually holds, and it already excludes provider clients, store handles, and Harnesses.
 */

import type { ValueSchema } from "../schema/value-schema.ts";
import { hashValue } from "../util/hash.ts";
import { jsonIssues } from "../util/json.ts";
import type { ExecutionDefinitionRef } from "./ids.ts";
import { isDefinitionId, isDefinitionVersion } from "./ids.ts";
import type {
  AgentDefinition,
  AgentSpec,
  DefinitionKind,
  ExecutionDefinition,
  TerminalResultSchema,
  WorkflowDefinition,
  WorkflowSpec,
} from "./types.ts";
import { isDefinitionKind } from "./types.ts";

export interface DefinitionIssue {
  readonly path: string;
  readonly code:
    | "invalid_id"
    | "invalid_version"
    | "invalid_kind"
    | "invalid_spec"
    | "invalid_metadata"
    | "invalid_result_schema"
    | "not_serializable";
  readonly message: string;
}

export type DefinitionValidation =
  | { readonly ok: true; readonly definition: ExecutionDefinition }
  | { readonly ok: false; readonly issues: readonly DefinitionIssue[] };

const SCHEMA_KINDS = new Set(["string", "number", "boolean", "enum", "string_array", "array", "any", "object"]);

/** Structural check that a declared result schema is a well-formed `ValueSchema` tree. */
function valueSchemaIssues(schema: unknown, path: string): DefinitionIssue[] {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) {
    return [{ path, code: "invalid_result_schema", message: "expected a ValueSchema object" }];
  }
  const kind = (schema as { kind?: unknown }).kind;
  if (typeof kind !== "string" || !SCHEMA_KINDS.has(kind)) {
    return [{ path: `${path}.kind`, code: "invalid_result_schema", message: `unknown schema kind ${JSON.stringify(kind)}` }];
  }
  if (kind === "enum") {
    const choices = (schema as { choices?: unknown }).choices;
    if (!Array.isArray(choices) || choices.length === 0 || choices.some((c) => typeof c !== "string")) {
      return [{ path: `${path}.choices`, code: "invalid_result_schema", message: "enum requires a non-empty string[] of choices" }];
    }
  }
  if (kind === "array") {
    return valueSchemaIssues((schema as { items?: unknown }).items, `${path}.items`);
  }
  if (kind === "object") {
    const fields = (schema as { fields?: unknown }).fields;
    if (fields === null || typeof fields !== "object" || Array.isArray(fields)) {
      return [{ path: `${path}.fields`, code: "invalid_result_schema", message: "object schema requires a fields record" }];
    }
    const issues: DefinitionIssue[] = [];
    for (const [key, spec] of Object.entries(fields as Record<string, unknown>)) {
      if (spec === null || typeof spec !== "object" || Array.isArray(spec)) {
        issues.push({ path: `${path}.fields.${key}`, code: "invalid_result_schema", message: "expected a FieldSpec object" });
        continue;
      }
      issues.push(...valueSchemaIssues((spec as { schema?: unknown }).schema, `${path}.fields.${key}.schema`));
    }
    return issues;
  }
  return [];
}

function terminalResultIssues(declared: unknown): DefinitionIssue[] {
  if (declared === undefined) return [];
  if (declared === null || typeof declared !== "object" || Array.isArray(declared)) {
    return [{ path: "terminalResult", code: "invalid_result_schema", message: "expected a TerminalResultSchema object" }];
  }
  const value = declared as Partial<TerminalResultSchema>;
  const issues: DefinitionIssue[] = [];
  if (typeof value.schemaId !== "string" || value.schemaId.length === 0) {
    issues.push({ path: "terminalResult.schemaId", code: "invalid_result_schema", message: "expected a non-empty schema id" });
  }
  if (!Number.isInteger(value.schemaVersion) || (value.schemaVersion as number) < 1) {
    issues.push({ path: "terminalResult.schemaVersion", code: "invalid_result_schema", message: "expected an integer schema version >= 1" });
  }
  issues.push(...valueSchemaIssues(value.schema, "terminalResult.schema"));
  return issues;
}

export function validateDefinition(input: unknown): DefinitionValidation {
  const issues: DefinitionIssue[] = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, issues: [{ path: "", code: "not_serializable", message: "expected a definition object" }] };
  }
  const candidate = input as Record<string, unknown>;

  if (!isDefinitionId(candidate["id"])) {
    issues.push({ path: "id", code: "invalid_id", message: `invalid definition id ${JSON.stringify(candidate["id"])}` });
  }
  if (!isDefinitionVersion(candidate["version"])) {
    issues.push({ path: "version", code: "invalid_version", message: "expected an integer version >= 1" });
  }
  if (!isDefinitionKind(candidate["kind"])) {
    issues.push({
      path: "kind",
      code: "invalid_kind",
      message: `expected "agent" or "workflow"; Function, LLM, and Stage are computation inside an Execution, not Execution kinds`,
    });
  }

  const spec = candidate["spec"];
  if (spec === null || typeof spec !== "object" || Array.isArray(spec)) {
    issues.push({ path: "spec", code: "invalid_spec", message: "expected a spec object" });
  } else {
    for (const issue of jsonIssues(spec, "spec")) {
      issues.push({ path: issue.path, code: "invalid_spec", message: issue.message });
    }
  }

  const metadata = candidate["metadata"];
  if (metadata !== undefined) {
    if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) {
      issues.push({ path: "metadata", code: "invalid_metadata", message: "expected a metadata object" });
    } else {
      for (const issue of jsonIssues(metadata, "metadata")) {
        issues.push({ path: issue.path, code: "invalid_metadata", message: issue.message });
      }
    }
  }

  issues.push(...terminalResultIssues(candidate["terminalResult"]));

  // Everything the definition carries must survive a round trip, including fields this version of
  // the kernel does not know about yet.
  for (const issue of jsonIssues(candidate, "")) {
    if (issues.some((existing) => existing.path === issue.path)) continue;
    issues.push({ path: issue.path, code: "not_serializable", message: issue.message });
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, definition: candidate as unknown as ExecutionDefinition };
}

export class InvalidDefinitionError extends Error {
  readonly issues: readonly DefinitionIssue[];
  constructor(issues: readonly DefinitionIssue[]) {
    super(`invalid definition: ${issues.map((i) => (i.path ? `${i.path}: ${i.message}` : i.message)).join("; ")}`);
    this.name = "InvalidDefinitionError";
    this.issues = issues;
  }
}

export function assertValidDefinition(input: unknown): ExecutionDefinition {
  const result = validateDefinition(input);
  if (!result.ok) throw new InvalidDefinitionError(result.issues);
  return result.definition;
}

/** Content digest over the whole definition. Key order never changes the result. */
export function definitionIntegrity(definition: ExecutionDefinition): string {
  return hashValue(definition);
}

export function definitionRef(definition: ExecutionDefinition): ExecutionDefinitionRef {
  return { id: definition.id, version: definition.version, integrity: definitionIntegrity(definition) };
}

export interface DefineExecutionInput<TSpec> {
  readonly id: string;
  readonly version?: number;
  readonly name?: string;
  readonly description?: string;
  readonly metadata?: Record<string, unknown>;
  readonly terminalResult?: { readonly schemaId: string; readonly schemaVersion: number; readonly schema: ValueSchema };
  readonly spec: TSpec;
}

function build(kind: DefinitionKind, input: DefineExecutionInput<unknown>): ExecutionDefinition {
  const draft: Record<string, unknown> = {
    id: input.id,
    version: input.version ?? 1,
    kind,
    spec: input.spec,
  };
  if (input.name !== undefined) draft["name"] = input.name;
  if (input.description !== undefined) draft["description"] = input.description;
  if (input.metadata !== undefined) draft["metadata"] = input.metadata;
  if (input.terminalResult !== undefined) draft["terminalResult"] = input.terminalResult;
  return assertValidDefinition(draft);
}

export function defineAgent(input: DefineExecutionInput<AgentSpec>): AgentDefinition {
  return build("agent", input) as AgentDefinition;
}

export function defineWorkflow(input: DefineExecutionInput<WorkflowSpec>): WorkflowDefinition {
  return build("workflow", input) as WorkflowDefinition;
}

/** Next publishable version for a definition id, given the versions already stored. */
export function nextDefinitionVersion(existing: readonly number[]): number {
  return existing.length === 0 ? 1 : Math.max(...existing) + 1;
}

export function serializeDefinition(definition: ExecutionDefinition): string {
  return JSON.stringify(definition);
}

export function deserializeDefinition(json: string): ExecutionDefinition {
  return assertValidDefinition(JSON.parse(json) as unknown);
}
