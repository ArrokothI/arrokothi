/**
 * Agent spec validation.
 *
 * Runs at authoring, at deserialization, and at store time - the same three places Workflow
 * topology is checked - so an Agent that cannot be run is unpublishable rather than discovered
 * several Activations in.
 *
 * The checks are structural, and deliberately so. `definitions/validation.ts` already proves the
 * whole definition is plain JSON, which is what actually excludes a provider client, a store
 * handle, or a closure; a name-based hunt for "apiKey" would be theatre. What this file adds is
 * that the fields present are the ones an Agent has, that unknown fields are refused rather than
 * carried, and that the exposure request contains identities instead of descriptors or grants.
 */

import type { ModelRequirementLevel } from "../model/types.ts";
import { exposureRequestIssues } from "../operations/exposure.ts";
import type { AgentSpec } from "./spec.ts";
import { AGENT_COMPLETION_MODES } from "./spec.ts";

export type AgentSpecIssueCode =
  | "invalid_model"
  | "invalid_instructions"
  | "invalid_operations"
  | "invalid_structured_memory"
  | "invalid_limits"
  | "invalid_completion"
  | "unknown_field";

export interface AgentSpecIssue {
  readonly path: string;
  readonly code: AgentSpecIssueCode;
  readonly message: string;
}

export type AgentSpecValidation =
  | { readonly ok: true; readonly spec: AgentSpec }
  | { readonly ok: false; readonly issues: readonly AgentSpecIssue[] };

const KNOWN_FIELDS = new Set(["model", "instructions", "operations", "structuredMemory", "limits", "completion"]);
const REQUIREMENT_LEVELS = new Set<ModelRequirementLevel>(["required", "optional"]);
const LIMIT_FIELDS = ["maxModelCalls", "maxOperationCallsPerStep", "maxContextMessages"] as const;

function modelIssues(value: unknown): AgentSpecIssue[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [{ path: "spec.model", code: "invalid_model", message: "expected a logical model request" }];
  }
  const model = value as Record<string, unknown>;
  const issues: AgentSpecIssue[] = [];
  if (typeof model["logicalRef"] !== "string" || (model["logicalRef"] as string).length === 0) {
    issues.push({
      path: "spec.model.logicalRef",
      code: "invalid_model",
      message: "expected a non-empty logical model reference; a definition names a role, never a provider",
    });
  }
  const requirements = model["requirements"];
  if (requirements === null || typeof requirements !== "object" || Array.isArray(requirements)) {
    issues.push({ path: "spec.model.requirements", code: "invalid_model", message: "expected portable model requirements" });
    return issues;
  }
  const declared = requirements as Record<string, unknown>;
  if (declared["text"] !== true) {
    issues.push({
      path: "spec.model.requirements.text",
      code: "invalid_model",
      message: "portable text generation is the baseline and must be declared required",
    });
  }
  for (const feature of ["capabilityCalls", "structuredOutput", "cancellation", "usageMetadata"]) {
    const level = declared[feature];
    if (level !== undefined && !REQUIREMENT_LEVELS.has(level as ModelRequirementLevel)) {
      issues.push({
        path: `spec.model.requirements.${feature}`,
        code: "invalid_model",
        message: `expected "required" or "optional"`,
      });
    }
  }
  for (const key of Object.keys(declared)) {
    if (!["text", "capabilityCalls", "structuredOutput", "cancellation", "usageMetadata"].includes(key)) {
      issues.push({ path: `spec.model.requirements.${key}`, code: "invalid_model", message: `unknown portable feature "${key}"` });
    }
  }
  for (const key of Object.keys(model)) {
    if (key !== "logicalRef" && key !== "requirements") {
      issues.push({
        path: `spec.model.${key}`,
        code: "invalid_model",
        message: `"${key}" is deployment configuration, not authored semantics`,
      });
    }
  }
  return issues;
}

/**
 * Strict authored Structured Memory requests. Read and write are independent, each contains only a
 * non-empty unique list of non-empty keys, and neither grants anything.
 */
function structuredMemoryIssues(value: unknown): AgentSpecIssue[] {
  if (value === undefined) return [];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [{ path: "spec.structuredMemory", code: "invalid_structured_memory", message: "expected a Structured Memory spec object" }];
  }
  const issues: AgentSpecIssue[] = [];
  const spec = value as Record<string, unknown>;
  for (const key of Object.keys(spec)) {
    if (key !== "read" && key !== "write") {
      issues.push({
        path: `spec.structuredMemory.${key}`,
        code: "invalid_structured_memory",
        message: `unknown Structured Memory spec field "${key}"`,
      });
    }
  }

  for (const kind of ["read", "write"] as const) {
    const requestValue = spec[kind];
    if (requestValue === undefined) continue;
    if (requestValue === null || typeof requestValue !== "object" || Array.isArray(requestValue)) {
      issues.push({
        path: `spec.structuredMemory.${kind}`,
        code: "invalid_structured_memory",
        message: `expected a ${kind}-request object`,
      });
      continue;
    }
    const request = requestValue as Record<string, unknown>;
    for (const key of Object.keys(request)) {
      if (key !== "keys") {
        issues.push({
          path: `spec.structuredMemory.${kind}.${key}`,
          code: "invalid_structured_memory",
          message: `unknown ${kind}-request field "${key}"`,
        });
      }
    }
    const keys = request["keys"];
    if (!Array.isArray(keys) || keys.length === 0) {
      issues.push({
        path: `spec.structuredMemory.${kind}.keys`,
        code: "invalid_structured_memory",
        message: "expected a non-empty array of field keys",
      });
      continue;
    }
    const seen = new Set<string>();
    for (const [index, key] of keys.entries()) {
      if (typeof key !== "string" || key.trim().length === 0) {
        issues.push({
          path: `spec.structuredMemory.${kind}.keys[${index}]`,
          code: "invalid_structured_memory",
          message: "expected a non-empty field key",
        });
      } else if (seen.has(key)) {
        issues.push({
          path: `spec.structuredMemory.${kind}.keys[${index}]`,
          code: "invalid_structured_memory",
          message: `key "${key}" is requested more than once`,
        });
      } else {
        seen.add(key);
      }
    }
  }
  return issues;
}

function limitIssues(value: unknown): AgentSpecIssue[] {
  if (value === undefined) return [];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [{ path: "spec.limits", code: "invalid_limits", message: "expected an object of Agent bounds" }];
  }
  const limits = value as Record<string, unknown>;
  const issues: AgentSpecIssue[] = [];
  for (const [key, limit] of Object.entries(limits)) {
    if (!(LIMIT_FIELDS as readonly string[]).includes(key)) {
      issues.push({ path: `spec.limits.${key}`, code: "invalid_limits", message: `unknown bound "${key}"` });
      continue;
    }
    if (!Number.isInteger(limit) || (limit as number) < 1) {
      issues.push({ path: `spec.limits.${key}`, code: "invalid_limits", message: "expected an integer bound >= 1" });
    }
  }
  return issues;
}

export function validateAgentSpec(input: unknown): AgentSpecValidation {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, issues: [{ path: "spec", code: "invalid_model", message: "expected an Agent spec object" }] };
  }
  const candidate = input as Record<string, unknown>;
  const issues: AgentSpecIssue[] = [];

  issues.push(...modelIssues(candidate["model"]));

  if (typeof candidate["instructions"] !== "string" || (candidate["instructions"] as string).length === 0) {
    issues.push({ path: "spec.instructions", code: "invalid_instructions", message: "expected non-empty instructions" });
  }

  for (const issue of exposureRequestIssues(candidate["operations"], "spec.operations")) {
    issues.push({ path: issue.path, code: "invalid_operations", message: issue.message });
  }

  issues.push(...structuredMemoryIssues(candidate["structuredMemory"]));

  issues.push(...limitIssues(candidate["limits"]));

  const completion = candidate["completion"];
  if (completion !== undefined && !(AGENT_COMPLETION_MODES as readonly unknown[]).includes(completion)) {
    issues.push({
      path: "spec.completion",
      code: "invalid_completion",
      message: `expected one of ${AGENT_COMPLETION_MODES.join(", ")}`,
    });
  }

  for (const key of Object.keys(candidate)) {
    if (!KNOWN_FIELDS.has(key)) {
      issues.push({
        path: `spec.${key}`,
        code: "unknown_field",
        message:
          `"${key}" is not part of an Agent spec; catalogs, authority, Active Views, projections, provider schemas, ` +
          `executors, and credentials are owned by other layers`,
      });
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, spec: candidate as unknown as AgentSpec };
}
