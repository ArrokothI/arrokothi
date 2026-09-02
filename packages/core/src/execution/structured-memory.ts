/**
 * Execution-kernel Structured Memory.
 *
 * This is intentionally separate from `memory/structured.ts`, which belongs to the legacy
 * Session/Flow projection. The Execution kernel stores one explicit schema-bound view as runtime
 * state, and an Execution holds only a reference to it. The record contains no authorization flag:
 * a view id, an owner relationship, and a committed value are all data, never permission.
 */

import type { EffectId } from "../effects/ids.ts";
import type { ActivationId, ExecutionId } from "./ids.ts";
import type { ValueSchema } from "../schema/value-schema.ts";
import { describeIssues, validateValue, valueSchemaIssues } from "../schema/value-schema.ts";
import type { JsonValue } from "../util/json.ts";
import { jsonIssues } from "../util/json.ts";

/** A typed address into runtime-owned Structured Memory state. Holding it grants nothing. */
export interface StructuredMemoryViewRef {
  readonly memoryViewId: string;
}

export function structuredMemoryViewRef(memoryViewId: string): StructuredMemoryViewRef {
  if (typeof memoryViewId !== "string" || memoryViewId.length === 0) {
    throw new TypeError("a Structured Memory view ref needs a non-empty id");
  }
  return { memoryViewId };
}

/** One application-declared top-level field in an Execution-local Structured Memory view. */
export interface StructuredMemoryFieldDefinition {
  readonly key: string;
  readonly schema: ValueSchema;
  readonly description?: string;
}

/** Trusted application configuration supplied when an Execution is created. */
export interface StructuredMemoryBinding {
  readonly fields: readonly StructuredMemoryFieldDefinition[];
}

/** Runtime-established provenance for one committed field value. */
export interface StructuredMemoryCommittedValue {
  readonly memoryViewId: string;
  readonly key: string;
  readonly value: JsonValue;
  readonly writerExecutionId: ExecutionId;
  readonly effectId: EffectId;
  readonly activationId: ActivationId | null;
  readonly writtenAt: string;
  /** The view revision established by this write. */
  readonly revision: number;
}

/**
 * Runtime-owned state for one Execution-local view.
 *
 * `values` is the current schema-bound state. `writes` is append-only attribution history for this
 * reference implementation; it is audit/provenance data, not a stream of controller Events.
 */
export interface StructuredMemoryView {
  readonly memoryViewId: string;
  readonly executionId: ExecutionId;
  readonly fields: readonly StructuredMemoryFieldDefinition[];
  readonly values: Readonly<Record<string, StructuredMemoryCommittedValue>>;
  readonly writes: readonly StructuredMemoryCommittedValue[];
  /** Starts at zero and advances exactly once for every committed write. */
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StructuredMemoryBindingIssue {
  readonly path: string;
  readonly message: string;
}

function unboundedSchemaPaths(schema: ValueSchema, path: string): string[] {
  if (schema.kind === "any") return [path];
  if (schema.kind === "array") return unboundedSchemaPaths(schema.items, `${path}.items`);
  if (schema.kind !== "object") return [];
  return Object.entries(schema.fields).flatMap(([key, spec]) =>
    unboundedSchemaPaths(spec.schema, `${path}.fields.${key}.schema`)
  );
}

function boundedSchemaIssues(schema: ValueSchema, path: string): StructuredMemoryBindingIssue[] {
  const issues: StructuredMemoryBindingIssue[] = [];
  const record = schema as unknown as Record<string, unknown>;
  const allowed = new Set<string>(["kind"]);
  const nonNegativeInteger = (name: string): void => {
    allowed.add(name);
    const value = record[name];
    if (value !== undefined && (!Number.isInteger(value) || (value as number) < 0)) {
      issues.push({ path: `${path}.${name}`, message: "expected a non-negative integer when present" });
    }
  };
  const finiteNumber = (name: string): void => {
    allowed.add(name);
    const value = record[name];
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
      issues.push({ path: `${path}.${name}`, message: "expected a finite number when present" });
    }
  };

  switch (schema.kind) {
    case "string":
      nonNegativeInteger("minLength");
      nonNegativeInteger("maxLength");
      allowed.add("pattern");
      if (schema.pattern !== undefined) {
        if (typeof schema.pattern !== "string") {
          issues.push({ path: `${path}.pattern`, message: "expected a regular-expression string" });
        } else {
          try {
            new RegExp(schema.pattern);
          } catch {
            issues.push({ path: `${path}.pattern`, message: "expected a valid regular expression" });
          }
        }
      }
      if (
        typeof schema.minLength === "number" &&
        typeof schema.maxLength === "number" &&
        schema.minLength > schema.maxLength
      ) {
        issues.push({ path, message: "minLength must not exceed maxLength" });
      }
      break;
    case "number":
      finiteNumber("min");
      finiteNumber("max");
      allowed.add("integer");
      if (schema.integer !== undefined && typeof schema.integer !== "boolean") {
        issues.push({ path: `${path}.integer`, message: "expected a boolean when present" });
      }
      if (typeof schema.min === "number" && typeof schema.max === "number" && schema.min > schema.max) {
        issues.push({ path, message: "min must not exceed max" });
      }
      break;
    case "enum":
      allowed.add("choices");
      if (new Set(schema.choices).size !== schema.choices.length) {
        issues.push({ path: `${path}.choices`, message: "enum choices must be unique" });
      }
      break;
    case "string_array":
      nonNegativeInteger("maxItems");
      allowed.add("choices");
      if (
        schema.choices !== undefined &&
        (!Array.isArray(schema.choices) || schema.choices.some((choice) => typeof choice !== "string"))
      ) {
        issues.push({ path: `${path}.choices`, message: "expected a string[] when present" });
      }
      break;
    case "array":
      allowed.add("items");
      nonNegativeInteger("maxItems");
      issues.push(...boundedSchemaIssues(schema.items, `${path}.items`));
      break;
    case "object":
      allowed.add("fields");
      allowed.add("additionalProperties");
      if (schema.additionalProperties !== undefined && typeof schema.additionalProperties !== "boolean") {
        issues.push({ path: `${path}.additionalProperties`, message: "expected a boolean when present" });
      }
      for (const [key, spec] of Object.entries(schema.fields)) {
        const fieldPath = `${path}.fields.${key}`;
        if (key.length === 0) issues.push({ path: fieldPath, message: "object field keys must be non-empty" });
        if (spec.required !== undefined && typeof spec.required !== "boolean") {
          issues.push({ path: `${fieldPath}.required`, message: "expected a boolean when present" });
        }
        if (spec.description !== undefined && typeof spec.description !== "string") {
          issues.push({ path: `${fieldPath}.description`, message: "expected a string when present" });
        }
        for (const extra of Object.keys(spec).filter((name) => !["schema", "required", "description"].includes(name))) {
          issues.push({ path: `${fieldPath}.${extra}`, message: `unknown FieldSpec property "${extra}"` });
        }
        issues.push(...boundedSchemaIssues(spec.schema, `${fieldPath}.schema`));
      }
      break;
    case "any":
    case "boolean":
      break;
  }

  for (const extra of Object.keys(record).filter((name) => !allowed.has(name))) {
    issues.push({ path: `${path}.${extra}`, message: `unknown ${schema.kind} schema property "${extra}"` });
  }
  return issues;
}

/** Validates trusted application configuration before any runtime record is created. */
export function structuredMemoryBindingIssues(binding: unknown): readonly StructuredMemoryBindingIssue[] {
  if (binding === null || typeof binding !== "object" || Array.isArray(binding)) {
    return [{ path: "structuredMemory", message: "expected a Structured Memory binding object" }];
  }
  const fields = (binding as { fields?: unknown }).fields;
  if (!Array.isArray(fields) || fields.length === 0) {
    return [{ path: "structuredMemory.fields", message: "expected at least one declared field" }];
  }

  const issues: StructuredMemoryBindingIssue[] = [];
  for (const extra of Object.keys(binding as Record<string, unknown>).filter((key) => key !== "fields")) {
    issues.push({ path: `structuredMemory.${extra}`, message: `unknown binding property "${extra}"` });
  }
  const keys = new Set<string>();
  for (const [index, candidate] of fields.entries()) {
    const path = `structuredMemory.fields[${index}]`;
    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
      issues.push({ path, message: "expected a field declaration object" });
      continue;
    }
    const field = candidate as Record<string, unknown>;
    for (const extra of Object.keys(field).filter((key) => !["key", "schema", "description"].includes(key))) {
      issues.push({ path: `${path}.${extra}`, message: `unknown field-declaration property "${extra}"` });
    }
    const key = field["key"];
    if (typeof key !== "string" || key.trim().length === 0) {
      issues.push({ path: `${path}.key`, message: "expected a non-empty field key" });
    } else if (keys.has(key)) {
      issues.push({ path: `${path}.key`, message: `field key "${key}" is declared more than once` });
    } else {
      keys.add(key);
    }
    if (field["description"] !== undefined &&
        (typeof field["description"] !== "string" || (field["description"] as string).trim().length === 0)) {
      issues.push({ path: `${path}.description`, message: "expected a non-empty description when present" });
    }
    const schemaIssues = valueSchemaIssues(field["schema"], `${path}.schema`);
    issues.push(...schemaIssues);
    if (schemaIssues.length === 0) {
      issues.push(...boundedSchemaIssues(field["schema"] as ValueSchema, `${path}.schema`));
      for (const unboundedPath of unboundedSchemaPaths(field["schema"] as ValueSchema, `${path}.schema`)) {
        issues.push({
          path: unboundedPath,
          message: "Structured Memory fields must be schema-bound; the unvalidated `any` schema is not permitted",
        });
      }
    }
  }
  issues.push(...jsonIssues(binding, "structuredMemory"));
  return issues;
}

export interface CreateStructuredMemoryViewInput {
  readonly memoryViewId: string;
  readonly executionId: ExecutionId;
  readonly binding: StructuredMemoryBinding;
  readonly createdAt: string;
}

export function createStructuredMemoryView(input: CreateStructuredMemoryViewInput): StructuredMemoryView {
  const fields = structuredClone([...input.binding.fields]).sort((a, b) => a.key.localeCompare(b.key));
  return {
    memoryViewId: input.memoryViewId,
    executionId: input.executionId,
    fields,
    values: {},
    writes: [],
    revision: 0,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

export type StructuredMemoryWriteValidation =
  | { readonly ok: true; readonly field: StructuredMemoryFieldDefinition; readonly value: JsonValue }
  | { readonly ok: false; readonly code: "unknown_memory_field" | "memory_schema_violation"; readonly message: string };

/** Strict validation: no coercion and no controller-supplied trust/provenance fields. */
export function validateStructuredMemoryWrite(
  view: StructuredMemoryView,
  key: string,
  value: JsonValue,
): StructuredMemoryWriteValidation {
  const field = view.fields.find((candidate) => candidate.key === key);
  if (!field) {
    return {
      ok: false,
      code: "unknown_memory_field",
      message: `field "${key}" is not declared in Structured Memory view ${view.memoryViewId}`,
    };
  }
  const validation = validateValue(field.schema, value);
  if (!validation.ok) {
    return {
      ok: false,
      code: "memory_schema_violation",
      message: `value for field "${key}" violates its schema: ${describeIssues(validation.issues)}`,
    };
  }
  return { ok: true, field, value: validation.value as JsonValue };
}

export interface CommitStructuredMemoryWriteInput {
  readonly key: string;
  readonly value: JsonValue;
  readonly writerExecutionId: ExecutionId;
  readonly effectId: EffectId;
  readonly activationId: ActivationId | null;
  readonly writtenAt: string;
}

/** Pure current-value replacement plus append-only attribution, advancing the view revision once. */
export function commitStructuredMemoryWrite(
  view: StructuredMemoryView,
  input: CommitStructuredMemoryWriteInput,
): StructuredMemoryView {
  const revision = view.revision + 1;
  const committed: StructuredMemoryCommittedValue = {
    memoryViewId: view.memoryViewId,
    key: input.key,
    value: structuredClone(input.value),
    writerExecutionId: input.writerExecutionId,
    effectId: input.effectId,
    activationId: input.activationId,
    writtenAt: input.writtenAt,
    revision,
  };
  const values = Object.fromEntries([
    ...Object.entries(view.values).filter(([key]) => key !== input.key),
    [input.key, committed],
  ]);
  return {
    ...view,
    values,
    writes: [...view.writes, committed],
    revision,
    updatedAt: input.writtenAt,
  };
}
