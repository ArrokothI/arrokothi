/**
 * MCP JSON Schema -> Arrokoth `ObjectSchema`, for the subset whose acceptance set can be preserved.
 *
 * This is deliberately not a JSON Schema implementation. Arrokoth's value-schema language is small
 * on purpose (see `schema/value-schema.ts` in core), and the canonical interoperability document
 * already says a richer portable JSON Schema boundary is a *later* project. So this translator does
 * one thing: it accepts the forms the current vocabulary can hold **losslessly**, and it refuses
 * everything else with a reason.
 *
 * ```text
 * representable   -> translated, and `toJsonSchema` of the result is semantically equivalent
 * annotation      -> ignored, because it constrains no value
 * anything else   -> refused with a structured issue; never approximated, never widened
 * ```
 *
 * Refusal is the whole point. A translator that turned `oneOf` into `{ kind: "any" }` would let a
 * remote server publish a contract Arrokoth silently does not enforce, and the operation would look
 * validated when it was not. An operation whose schema cannot be represented is simply not imported,
 * so it never reaches a catalog, an Active View, a projection, or a dispatch.
 *
 * One default mismatch must be normalized explicitly. JSON Schema's default for
 * `additionalProperties` is permissive; Arrokoth's is strict. An absent JSON Schema keyword
 * therefore becomes `additionalProperties: true` in Arrokoth. Re-projecting it writes the keyword
 * explicitly, which is syntactically different and semantically identical.
 *
 * Nothing here reads authority, identity, credentials, or a transport. It is a pure function over
 * two data shapes.
 */

import type { FieldSpec, ObjectSchema, ValueSchema } from "@agent-sdk/core/ports";

export type McpSchemaIssueCode =
  /** The node is not a JSON object, so there is nothing to translate. */
  | "not_a_schema"
  /** The root of a capability operation input must be a JSON Schema `object`. */
  | "not_an_object_schema"
  /** `$schema` declares a dialect this translator has not been proven against. */
  | "unsupported_dialect"
  /** A keyword with real validation semantics that `ValueSchema` cannot express. */
  | "unsupported_keyword"
  /** A `type` (or `type` union) outside the representable set. */
  | "unsupported_type"
  /** An `enum` that is not a non-empty list of strings. */
  | "unsupported_enum"
  /** `additionalProperties` given as a schema rather than a boolean. */
  | "unsupported_additional_properties"
  /** `items` absent, or given in the tuple form. */
  | "unsupported_items"
  /** No `type` and nothing that lets one be inferred. */
  | "missing_type"
  /** `required` names a property that `properties` does not declare. */
  | "unknown_required_property";

export interface McpSchemaIssue {
  /** Dotted/bracketed path into the JSON Schema document, `""` for the root. */
  readonly path: string;
  readonly code: McpSchemaIssueCode;
  /** The keyword that caused the refusal, when one keyword is responsible. */
  readonly keyword?: string;
  readonly message: string;
}

export type McpSchemaTranslation =
  | { readonly ok: true; readonly schema: ObjectSchema }
  | { readonly ok: false; readonly issues: readonly McpSchemaIssue[] };

/**
 * Keywords that carry no validation semantics.
 *
 * Dropping one changes which values are accepted by exactly nothing, so ignoring them is not a
 * weakening. `description` is additionally *preserved* wherever Arrokoth has somewhere to put it -
 * a property's `FieldSpec` - and dropped only at a root, which has no such slot.
 */
const ANNOTATION_KEYWORDS = new Set(["title", "description", "$comment", "examples", "$schema", "deprecated"]);

/** Dialects this translator has actually been exercised against. Anything else is refused. */
const SUPPORTED_DIALECTS = new Set([
  "https://json-schema.org/draft/2020-12/schema",
  "http://json-schema.org/draft-07/schema#",
  "https://json-schema.org/draft-07/schema#",
]);

/**
 * Keywords with no representable meaning at *any* node.
 *
 * Checked before `type`, purely so the refusal names the real cause. `{ "oneOf": [...] }` has no
 * `type` either, and reporting "no type is declared" for it would send a reader looking for the
 * wrong problem. The leftover check below still catches everything not listed here.
 */
const NEVER_SUPPORTED_KEYWORDS = [
  "oneOf",
  "anyOf",
  "allOf",
  "not",
  "$ref",
  "$defs",
  "definitions",
  "if",
  "then",
  "else",
  "const",
  "prefixItems",
  "contains",
  "unevaluatedItems",
  "unevaluatedProperties",
  "dependentSchemas",
  "dependentRequired",
] as const;

const OBJECT_KEYWORDS = new Set(["type", "properties", "required", "additionalProperties"]);
const STRING_KEYWORDS = new Set(["type", "minLength", "maxLength", "pattern", "enum"]);
const NUMBER_KEYWORDS = new Set(["type", "minimum", "maximum"]);
const BOOLEAN_KEYWORDS = new Set(["type"]);
const ARRAY_KEYWORDS = new Set(["type", "items", "maxItems"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function issue(path: string, code: McpSchemaIssueCode, message: string, keyword?: string): McpSchemaIssue {
  return { path, code, ...(keyword !== undefined ? { keyword } : {}), message };
}

/**
 * Every keyword present at this node that is neither recognized for its type nor a pure annotation.
 *
 * Enumerating what is *left over* rather than checking a denylist is the load-bearing choice: a
 * keyword nobody thought about - a future JSON Schema addition, a vendor extension, a typo that
 * happens to be meaningful to the server - refuses by default instead of being silently dropped.
 */
function leftoverKeywords(node: Record<string, unknown>, recognized: ReadonlySet<string>): string[] {
  return Object.keys(node).filter((key) => !recognized.has(key) && !ANNOTATION_KEYWORDS.has(key));
}

function checkDialect(node: Record<string, unknown>, path: string, issues: McpSchemaIssue[]): void {
  const dialect = node["$schema"];
  if (dialect === undefined) return;
  if (typeof dialect !== "string" || !SUPPORTED_DIALECTS.has(dialect)) {
    issues.push(
      issue(
        path,
        "unsupported_dialect",
        `$schema ${JSON.stringify(dialect)} declares a dialect this translator has not been proven against`,
        "$schema",
      ),
    );
  }
}

/** A non-empty list of strings, which is the only enum shape `ValueSchema` can hold. */
function stringEnum(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  return value.every((choice) => typeof choice === "string") ? (value as string[]) : null;
}

function optionalNumber(node: Record<string, unknown>, keyword: string, path: string, issues: McpSchemaIssue[]): number | undefined {
  const raw = node[keyword];
  if (raw === undefined) return undefined;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    issues.push(issue(path, "unsupported_keyword", `${keyword} must be a finite number`, keyword));
    return undefined;
  }
  return raw;
}

function optionalString(node: Record<string, unknown>, keyword: string, path: string, issues: McpSchemaIssue[]): string | undefined {
  const raw = node[keyword];
  if (raw === undefined) return undefined;
  if (typeof raw !== "string") {
    issues.push(issue(path, "unsupported_keyword", `${keyword} must be a string`, keyword));
    return undefined;
  }
  return raw;
}

/** Translates one schema node. Returns `null` when it recorded an issue instead. */
function translateNode(node: unknown, path: string, issues: McpSchemaIssue[]): ValueSchema | null {
  if (!isRecord(node)) {
    issues.push(issue(path, "not_a_schema", "expected a JSON Schema object"));
    return null;
  }
  checkDialect(node, path, issues);

  const never = NEVER_SUPPORTED_KEYWORDS.filter((keyword) => node[keyword] !== undefined);
  if (never.length > 0) {
    for (const keyword of never) {
      issues.push(issue(path, "unsupported_keyword", `"${keyword}" has no lossless ValueSchema equivalent`, keyword));
    }
    return null;
  }

  const rawType = node["type"];
  if (Array.isArray(rawType)) {
    issues.push(
      issue(path, "unsupported_type", `a "type" union ${JSON.stringify(rawType)} has no single ValueSchema kind`, "type"),
    );
    return null;
  }
  if (rawType !== undefined && typeof rawType !== "string") {
    issues.push(issue(path, "unsupported_type", `"type" must be a string`, "type"));
    return null;
  }

  // A bare `enum` with no `type` is a common and unambiguous shape when every choice is a string.
  const enumChoices = node["enum"] === undefined ? null : stringEnum(node["enum"]);
  if (node["enum"] !== undefined && enumChoices === null) {
    issues.push(
      issue(path, "unsupported_enum", "enum must be a non-empty list of strings; other enum shapes are not representable", "enum"),
    );
    return null;
  }
  const type = rawType ?? (enumChoices !== null ? "string" : undefined);

  if (type === undefined) {
    issues.push(issue(path, "missing_type", `no "type" is declared and none can be inferred without guessing`, "type"));
    return null;
  }

  switch (type) {
    case "string": {
      const extra = leftoverKeywords(node, STRING_KEYWORDS);
      if (extra.length > 0) {
        for (const keyword of extra) {
          issues.push(issue(path, "unsupported_keyword", `"${keyword}" cannot be preserved by a string ValueSchema`, keyword));
        }
        return null;
      }
      if (enumChoices !== null) {
        // An enum plus a length/pattern constraint would lose the second half: `ValueSchema`'s enum
        // arm holds choices and nothing else. Refused rather than quietly dropped.
        const alsoConstrained = ["minLength", "maxLength", "pattern"].filter((keyword) => node[keyword] !== undefined);
        if (alsoConstrained.length > 0) {
          for (const keyword of alsoConstrained) {
            issues.push(
              issue(path, "unsupported_keyword", `"${keyword}" alongside enum cannot be preserved by a ValueSchema`, keyword),
            );
          }
          return null;
        }
        return { kind: "enum", choices: [...enumChoices] };
      }
      const minLength = optionalNumber(node, "minLength", path, issues);
      const maxLength = optionalNumber(node, "maxLength", path, issues);
      const pattern = optionalString(node, "pattern", path, issues);
      return {
        kind: "string",
        ...(minLength !== undefined ? { minLength } : {}),
        ...(maxLength !== undefined ? { maxLength } : {}),
        ...(pattern !== undefined ? { pattern } : {}),
      };
    }

    case "number":
    case "integer": {
      const extra = leftoverKeywords(node, NUMBER_KEYWORDS);
      if (extra.length > 0) {
        for (const keyword of extra) {
          issues.push(issue(path, "unsupported_keyword", `"${keyword}" cannot be preserved by a number ValueSchema`, keyword));
        }
        return null;
      }
      const min = optionalNumber(node, "minimum", path, issues);
      const max = optionalNumber(node, "maximum", path, issues);
      return {
        kind: "number",
        ...(type === "integer" ? { integer: true } : {}),
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
      };
    }

    case "boolean": {
      const extra = leftoverKeywords(node, BOOLEAN_KEYWORDS);
      if (extra.length > 0) {
        for (const keyword of extra) {
          issues.push(issue(path, "unsupported_keyword", `"${keyword}" cannot be preserved by a boolean ValueSchema`, keyword));
        }
        return null;
      }
      return { kind: "boolean" };
    }

    case "array": {
      const extra = leftoverKeywords(node, ARRAY_KEYWORDS);
      if (extra.length > 0) {
        for (const keyword of extra) {
          issues.push(issue(path, "unsupported_keyword", `"${keyword}" cannot be preserved by an array ValueSchema`, keyword));
        }
        return null;
      }
      const rawItems = node["items"];
      if (rawItems === undefined) {
        issues.push(issue(path, "unsupported_items", "an array without item constraints is not representable", "items"));
        return null;
      }
      if (Array.isArray(rawItems)) {
        issues.push(issue(path, "unsupported_items", "tuple items are not representable", "items"));
        return null;
      }
      const items = translateNode(rawItems, `${path}.items`, issues);
      if (items === null) return null;
      const maxItems = optionalNumber(node, "maxItems", path, issues);
      return { kind: "array", items, ...(maxItems !== undefined ? { maxItems } : {}) };
    }

    case "object":
      return translateObjectNode(node, path, issues);

    default:
      issues.push(issue(path, "unsupported_type", `type "${type}" has no ValueSchema kind`, "type"));
      return null;
  }
}

function translateObjectNode(node: Record<string, unknown>, path: string, issues: McpSchemaIssue[]): ObjectSchema | null {
  // Counted at entry rather than compared against zero, so a sibling's refusal elsewhere in the
  // document does not read as a defect in *this* node.
  const before = issues.length;
  const extra = leftoverKeywords(node, OBJECT_KEYWORDS);
  if (extra.length > 0) {
    for (const keyword of extra) {
      issues.push(issue(path, "unsupported_keyword", `"${keyword}" cannot be preserved by an object ValueSchema`, keyword));
    }
    return null;
  }

  const rawProperties = node["properties"];
  if (rawProperties !== undefined && !isRecord(rawProperties)) {
    issues.push(issue(path, "unsupported_keyword", "properties must be an object", "properties"));
    return null;
  }
  const properties = (rawProperties ?? {}) as Record<string, unknown>;

  const rawRequired = node["required"];
  let required: readonly string[] = [];
  if (rawRequired !== undefined) {
    if (!Array.isArray(rawRequired) || rawRequired.some((name) => typeof name !== "string")) {
      issues.push(issue(path, "unsupported_keyword", "required must be a list of property names", "required"));
      return null;
    }
    required = rawRequired as string[];
  }
  for (const name of required) {
    if (!Object.prototype.hasOwnProperty.call(properties, name)) {
      issues.push(
        issue(path, "unknown_required_property", `required names "${name}", which properties does not declare`, "required"),
      );
    }
  }

  // Only the boolean form. A schema-valued `additionalProperties` constrains the unknown keys it
  // admits, and `ObjectSchema` has no field that could hold that constraint.
  const rawAdditional = node["additionalProperties"];
  // JSON Schema omission means `true`; ObjectSchema omission means `false`. Store the source
  // semantics explicitly so importing never narrows the server's published acceptance set.
  let additionalProperties = true;
  if (rawAdditional !== undefined) {
    if (typeof rawAdditional !== "boolean") {
      issues.push(
        issue(
          path,
          "unsupported_additional_properties",
          "a schema-valued additionalProperties cannot be preserved; only true/false can",
          "additionalProperties",
        ),
      );
      return null;
    }
    additionalProperties = rawAdditional;
  }

  const fields: Record<string, FieldSpec> = {};
  for (const [name, child] of Object.entries(properties)) {
    const childPath = path ? `${path}.properties.${name}` : `properties.${name}`;
    const schema = translateNode(child, childPath, issues);
    if (schema === null) continue;
    const description = isRecord(child) && typeof child["description"] === "string" ? child["description"] : undefined;
    fields[name] = {
      schema,
      ...(required.includes(name) ? { required: true } : {}),
      ...(description !== undefined ? { description } : {}),
    };
  }

  if (issues.length > before) return null;
  return { kind: "object", fields, additionalProperties };
}

/**
 * Translates an MCP Tool `inputSchema` into the operation input contract the catalog already uses.
 *
 * The root must be an `object`, because that is what a capability operation input is: a named
 * argument set. A tool whose input is a bare string or an array is refused rather than wrapped,
 * since wrapping would invent an argument name the server never published.
 */
export function objectSchemaFromJsonSchema(schema: unknown): McpSchemaTranslation {
  const issues: McpSchemaIssue[] = [];
  if (!isRecord(schema)) {
    return { ok: false, issues: [issue("", "not_a_schema", "expected a JSON Schema object")] };
  }
  const type = schema["type"];
  if (type !== "object") {
    return {
      ok: false,
      issues: [
        issue(
          "",
          "not_an_object_schema",
          `a capability operation input must be a JSON Schema object; received type ${JSON.stringify(type)}`,
          "type",
        ),
      ],
    };
  }
  checkDialect(schema, "", issues);
  const translated = translateObjectNode(schema, "", issues);
  if (translated === null || issues.length > 0) return { ok: false, issues };
  return { ok: true, schema: translated };
}

/** Renders issues for a message or an assertion. Diagnostic text, never parsed back. */
export function describeSchemaIssues(issues: readonly McpSchemaIssue[]): string {
  return issues.map((entry) => (entry.path ? `${entry.path}: ${entry.message}` : entry.message)).join("; ");
}
