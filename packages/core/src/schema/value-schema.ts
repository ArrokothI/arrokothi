/**
 * A deliberately tiny value-schema language.
 *
 * Core has zero dependencies, so there is no Zod/Ajv here. That is not just dependency hygiene:
 * every schema must be *serializable JSON*, because agent definitions are stored in a database,
 * exported, diffed, and projected into a model's structured-output schema. A validator built from
 * closures could not do any of that.
 *
 * The v0 type set is exactly what the mission requires: string, number, boolean, enum, string[],
 * plus `object` so tool inputs/outputs can nest one level of structure.
 */

export type ValueSchema =
  | { kind: "string"; minLength?: number; maxLength?: number; pattern?: string }
  | { kind: "number"; min?: number; max?: number; integer?: boolean }
  | { kind: "boolean" }
  | { kind: "enum"; choices: string[] }
  | { kind: "string_array"; maxItems?: number; choices?: string[] }
  /** A typed list. Needed for tool inputs such as a filter list; NOT permitted in memory fields. */
  | { kind: "array"; items: ValueSchema; maxItems?: number }
  /**
   * An unvalidated JSON value.
   *
   * Used only where the shape is genuinely polymorphic - a record filter's comparand may be a
   * number, a string, a boolean, or a list, and which one is correct depends on the field being
   * filtered. `record-query.ts` validates it against the DECLARED field type instead, which is a
   * stronger check than anything this schema layer could express. Never use it to dodge typing.
   */
  | { kind: "any" }
  | ObjectSchema;

export interface FieldSpec {
  schema: ValueSchema;
  required?: boolean;
  description?: string;
}

export interface ObjectSchema {
  kind: "object";
  fields: Record<string, FieldSpec>;
  /** Default false. Unknown keys are an error, never silently dropped. */
  additionalProperties?: boolean;
}

export interface SchemaIssue {
  /** Dotted path to the offending value, `""` for the root. */
  path: string;
  code:
    | "wrong_type"
    | "not_in_enum"
    | "below_min"
    | "above_max"
    | "not_integer"
    | "too_short"
    | "too_long"
    | "too_many_items"
    | "pattern_mismatch"
    | "missing_required"
    | "unknown_field";
  message: string;
}

export interface ValidateOptions {
  /**
   * Allow *lossless* normalization of a model's output shape: the numeric string "420" becomes 420,
   * "true" becomes true, a lone string becomes a one-element array.
   *
   * This is not "silently fixing the model". Anything ambiguous or lossy ("twenty million", "about
   * 400") still fails, and callers that enable coercion record `normalized: true` on the committed
   * value so the trace shows the original proposal.
   */
  coerce?: boolean;
}

export type ValidationResult =
  | { ok: true; value: unknown; normalized: boolean }
  | { ok: false; issues: SchemaIssue[] };

const issue = (path: string, code: SchemaIssue["code"], message: string): SchemaIssue => ({ path, code, message });

/** Strings that are unambiguously one number. Rejects "", "abc", "1,2", "twenty". */
function parseStrictNumber(text: string): number | null {
  const trimmed = text.trim().replace(/,/g, "");
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function validateInner(schema: ValueSchema, value: unknown, path: string, opts: ValidateOptions): ValidationResult {
  const coerce = opts.coerce === true;
  let normalized = false;
  let v = value;

  switch (schema.kind) {
    case "string": {
      if (typeof v !== "string") {
        if (coerce && (typeof v === "number" || typeof v === "boolean")) {
          v = String(v);
          normalized = true;
        } else {
          return { ok: false, issues: [issue(path, "wrong_type", `expected string, received ${typeName(value)}`)] };
        }
      }
      const s = v as string;
      const issues: SchemaIssue[] = [];
      if (schema.minLength !== undefined && s.length < schema.minLength) {
        issues.push(issue(path, "too_short", `expected at least ${schema.minLength} characters, received ${s.length}`));
      }
      if (schema.maxLength !== undefined && s.length > schema.maxLength) {
        issues.push(issue(path, "too_long", `expected at most ${schema.maxLength} characters, received ${s.length}`));
      }
      if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(s)) {
        issues.push(issue(path, "pattern_mismatch", `expected to match /${schema.pattern}/`));
      }
      return issues.length ? { ok: false, issues } : { ok: true, value: s, normalized };
    }

    case "number": {
      if (typeof v !== "number" || !Number.isFinite(v)) {
        const parsed = coerce && typeof v === "string" ? parseStrictNumber(v) : null;
        if (parsed === null) {
          return { ok: false, issues: [issue(path, "wrong_type", `expected number, received ${typeName(value)}`)] };
        }
        v = parsed;
        normalized = true;
      }
      const n = v as number;
      const issues: SchemaIssue[] = [];
      if (schema.integer === true && !Number.isInteger(n)) {
        issues.push(issue(path, "not_integer", `expected an integer, received ${n}`));
      }
      if (schema.min !== undefined && n < schema.min) {
        issues.push(issue(path, "below_min", `expected >= ${schema.min}, received ${n}`));
      }
      if (schema.max !== undefined && n > schema.max) {
        issues.push(issue(path, "above_max", `expected <= ${schema.max}, received ${n}`));
      }
      return issues.length ? { ok: false, issues } : { ok: true, value: n, normalized };
    }

    case "boolean": {
      if (typeof v !== "boolean") {
        if (coerce && (v === "true" || v === "false")) {
          v = v === "true";
          normalized = true;
        } else {
          return { ok: false, issues: [issue(path, "wrong_type", `expected boolean, received ${typeName(value)}`)] };
        }
      }
      return { ok: true, value: v as boolean, normalized };
    }

    case "enum": {
      if (typeof v !== "string") {
        return { ok: false, issues: [issue(path, "wrong_type", `expected one of ${schema.choices.join(" | ")}, received ${typeName(value)}`)] };
      }
      const candidate: string = v;
      if (schema.choices.includes(candidate)) return { ok: true, value: candidate, normalized };
      if (coerce) {
        // Case-insensitive match only. "Buy" for choice "buy" is a formatting difference, not a
        // different answer. Anything beyond that is a genuine mismatch and stays a rejection.
        const match = schema.choices.find((c) => c.toLowerCase() === candidate.toLowerCase());
        if (match !== undefined) return { ok: true, value: match, normalized: true };
      }
      return { ok: false, issues: [issue(path, "not_in_enum", `expected one of ${schema.choices.join(" | ")}, received ${JSON.stringify(candidate)}`)] };
    }

    case "string_array": {
      if (!Array.isArray(v)) {
        if (coerce && typeof v === "string") {
          v = [v];
          normalized = true;
        } else {
          return { ok: false, issues: [issue(path, "wrong_type", `expected string[], received ${typeName(value)}`)] };
        }
      }
      const arr = v as unknown[];
      const issues: SchemaIssue[] = [];
      arr.forEach((item, i) => {
        if (typeof item !== "string") {
          issues.push(issue(`${path}[${i}]`, "wrong_type", `expected string, received ${typeName(item)}`));
        } else if (schema.choices && !schema.choices.includes(item)) {
          issues.push(issue(`${path}[${i}]`, "not_in_enum", `expected one of ${schema.choices.join(" | ")}, received ${JSON.stringify(item)}`));
        }
      });
      if (schema.maxItems !== undefined && arr.length > schema.maxItems) {
        issues.push(issue(path, "too_many_items", `expected at most ${schema.maxItems} items, received ${arr.length}`));
      }
      return issues.length ? { ok: false, issues } : { ok: true, value: arr as string[], normalized };
    }

    case "array": {
      if (!Array.isArray(v)) {
        if (coerce && v !== undefined && v !== null && typeof v === "object") {
          // Models sometimes emit a keyed map where a list was asked for. Taking its values is a
          // shape fix, not a content fix, so it is lossless and recorded as a normalization.
          v = Object.values(v as Record<string, unknown>);
          normalized = true;
        } else {
          return { ok: false, issues: [issue(path, "wrong_type", `expected array, received ${typeName(value)}`)] };
        }
      }
      const arr = v as unknown[];
      const issues: SchemaIssue[] = [];
      const out: unknown[] = [];
      arr.forEach((item, i) => {
        const res = validateInner(schema.items, item, `${path}[${i}]`, opts);
        if (res.ok) {
          out.push(res.value);
          normalized = normalized || res.normalized;
        } else {
          issues.push(...res.issues);
        }
      });
      if (schema.maxItems !== undefined && arr.length > schema.maxItems) {
        issues.push(issue(path, "too_many_items", `expected at most ${schema.maxItems} items, received ${arr.length}`));
      }
      return issues.length ? { ok: false, issues } : { ok: true, value: out, normalized };
    }

    case "any":
      return { ok: true, value: v, normalized };

    case "object":
      return validateObjectInner(schema, v, path, opts);
  }
}

function validateObjectInner(schema: ObjectSchema, value: unknown, path: string, opts: ValidateOptions): ValidationResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, issues: [issue(path, "wrong_type", `expected object, received ${typeName(value)}`)] };
  }
  const input = value as Record<string, unknown>;
  const issues: SchemaIssue[] = [];
  const out: Record<string, unknown> = {};
  let normalized = false;

  for (const [key, spec] of Object.entries(schema.fields)) {
    const childPath = path ? `${path}.${key}` : key;
    const present = Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined && input[key] !== null;
    if (!present) {
      if (spec.required === true) issues.push(issue(childPath, "missing_required", `required field "${key}" is missing`));
      continue;
    }
    const res = validateInner(spec.schema, input[key], childPath, opts);
    if (res.ok) {
      out[key] = res.value;
      normalized = normalized || res.normalized;
    } else {
      issues.push(...res.issues);
    }
  }

  if (schema.additionalProperties !== true) {
    for (const key of Object.keys(input)) {
      if (!Object.prototype.hasOwnProperty.call(schema.fields, key)) {
        issues.push(issue(path ? `${path}.${key}` : key, "unknown_field", `unknown field "${key}"`));
      }
    }
  } else {
    for (const [key, val] of Object.entries(input)) {
      if (!Object.prototype.hasOwnProperty.call(schema.fields, key)) out[key] = val;
    }
  }

  return issues.length ? { ok: false, issues } : { ok: true, value: out, normalized };
}

function typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function validateValue(schema: ValueSchema, value: unknown, opts: ValidateOptions = {}): ValidationResult {
  return validateInner(schema, value, "", opts);
}

export function validateObject(schema: ObjectSchema, value: unknown, opts: ValidateOptions = {}): ValidationResult {
  return validateObjectInner(schema, value, "", opts);
}

export function describeIssues(issues: SchemaIssue[]): string {
  return issues.map((i) => (i.path ? `${i.path}: ${i.message}` : i.message)).join("; ");
}

/**
 * Project to JSON Schema for providers that support structured output / function calling.
 *
 * Core does not import any provider SDK, but it can hand a provider adapter a standard shape.
 */
export function toJsonSchema(schema: ValueSchema): Record<string, unknown> {
  switch (schema.kind) {
    case "string": {
      const out: Record<string, unknown> = { type: "string" };
      if (schema.minLength !== undefined) out["minLength"] = schema.minLength;
      if (schema.maxLength !== undefined) out["maxLength"] = schema.maxLength;
      if (schema.pattern !== undefined) out["pattern"] = schema.pattern;
      return out;
    }
    case "number": {
      const out: Record<string, unknown> = { type: schema.integer === true ? "integer" : "number" };
      if (schema.min !== undefined) out["minimum"] = schema.min;
      if (schema.max !== undefined) out["maximum"] = schema.max;
      return out;
    }
    case "boolean":
      return { type: "boolean" };
    case "enum":
      return { type: "string", enum: [...schema.choices] };
    case "string_array": {
      const items: Record<string, unknown> = { type: "string" };
      if (schema.choices) items["enum"] = [...schema.choices];
      const out: Record<string, unknown> = { type: "array", items };
      if (schema.maxItems !== undefined) out["maxItems"] = schema.maxItems;
      return out;
    }
    case "array": {
      const out: Record<string, unknown> = { type: "array", items: toJsonSchema(schema.items) };
      if (schema.maxItems !== undefined) out["maxItems"] = schema.maxItems;
      return out;
    }
    case "any":
      return {
        anyOf: [
          { type: "string" },
          { type: "number" },
          { type: "boolean" },
          {
            type: "array",
            items: {
              anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
            },
          },
        ],
      };
    case "object": {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [key, spec] of Object.entries(schema.fields)) {
        const child = toJsonSchema(spec.schema);
        if (spec.description) child["description"] = spec.description;
        properties[key] = child;
        if (spec.required === true) required.push(key);
      }
      const out: Record<string, unknown> = { type: "object", properties };
      if (required.length) out["required"] = required;
      // JSON Schema defaults this keyword to `true`, while ObjectSchema defaults it to `false`.
      // Always project the Arrokoth value explicitly so the acceptance set survives the boundary.
      out["additionalProperties"] = schema.additionalProperties === true;
      return out;
    }
  }
}

// ---------------------------------------------------------------------------
// Structural validation of a schema itself
// ---------------------------------------------------------------------------

/**
 * A problem with an authored *schema*, as opposed to a problem with a value.
 *
 * Definitions carry schemas as data, so a stored definition can contain a malformed schema tree the
 * same way it can contain a malformed anything else. Checking that tree is a different question
 * from checking a value against it, and both callers - terminal-result declarations and Workflow
 * Stage authoring - need the same answer, so it lives beside the language it describes.
 */
export interface SchemaStructureIssue {
  readonly path: string;
  readonly message: string;
}

const SCHEMA_KINDS = new Set(["string", "number", "boolean", "enum", "string_array", "array", "any", "object"]);

/** Collects every reason `schema` is not a well-formed `ValueSchema` tree. Empty means it is. */
export function valueSchemaIssues(schema: unknown, path: string): SchemaStructureIssue[] {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) {
    return [{ path, message: "expected a ValueSchema object" }];
  }
  const kind = (schema as { kind?: unknown }).kind;
  if (typeof kind !== "string" || !SCHEMA_KINDS.has(kind)) {
    return [{ path: `${path}.kind`, message: `unknown schema kind ${JSON.stringify(kind)}` }];
  }
  if (kind === "enum") {
    const choices = (schema as { choices?: unknown }).choices;
    if (!Array.isArray(choices) || choices.length === 0 || choices.some((choice) => typeof choice !== "string")) {
      return [{ path: `${path}.choices`, message: "enum requires a non-empty string[] of choices" }];
    }
  }
  if (kind === "array") {
    return valueSchemaIssues((schema as { items?: unknown }).items, `${path}.items`);
  }
  if (kind === "object") {
    const fields = (schema as { fields?: unknown }).fields;
    if (fields === null || typeof fields !== "object" || Array.isArray(fields)) {
      return [{ path: `${path}.fields`, message: "object schema requires a fields record" }];
    }
    const issues: SchemaStructureIssue[] = [];
    for (const [key, spec] of Object.entries(fields as Record<string, unknown>)) {
      if (spec === null || typeof spec !== "object" || Array.isArray(spec)) {
        issues.push({ path: `${path}.fields.${key}`, message: "expected a FieldSpec object" });
        continue;
      }
      issues.push(...valueSchemaIssues((spec as { schema?: unknown }).schema, `${path}.fields.${key}.schema`));
    }
    return issues;
  }
  return [];
}

/** The same check, narrowed to an `object` schema - what capability and callable inputs must be. */
export function objectSchemaIssues(schema: unknown, path: string): SchemaStructureIssue[] {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema) || (schema as { kind?: unknown }).kind !== "object") {
    return [{ path, message: "expected an object schema" }];
  }
  return valueSchemaIssues(schema, path);
}
