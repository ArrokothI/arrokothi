/**
 * The JSON value domain shared by every record that crosses a kernel boundary.
 *
 * Definitions, controller progress, Event bodies, emissions, and terminal results are all *data*:
 * they are persisted, replayed, shipped between workers, and inspected by humans. A provider
 * client, a store handle, a closure, or a class instance hiding inside one of those records would
 * silently make the kernel non-portable, so the boundary is enforced structurally rather than by
 * naming conventions. `assertPlainJson` is the mechanical half of the rule; the semantic half
 * ("no credentials, no tenant models") is a review rule that no runtime check can honestly claim.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface JsonIssue {
  /** Dotted path to the offending value, `""` for the root. */
  path: string;
  code: "not_serializable" | "cycle";
  message: string;
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") {
    const name = (value as object).constructor?.name;
    return name && name !== "Object" ? `${name} instance` : "object";
  }
  return typeof value;
}

function walk(value: unknown, path: string, seen: Set<object>, issues: JsonIssue[]): void {
  if (value === null) return;
  const type = typeof value;
  if (type === "string" || type === "boolean") return;
  if (type === "number") {
    if (!Number.isFinite(value as number)) {
      issues.push({ path, code: "not_serializable", message: `expected a finite number, received ${String(value)}` });
    }
    return;
  }
  if (type !== "object") {
    issues.push({ path, code: "not_serializable", message: `expected JSON data, received ${describe(value)}` });
    return;
  }

  const object = value as object;
  if (seen.has(object)) {
    issues.push({ path, code: "cycle", message: "value contains a cycle and cannot be serialized" });
    return;
  }
  seen.add(object);

  if (Array.isArray(object)) {
    object.forEach((item, index) => walk(item, `${path}[${index}]`, seen, issues));
  } else if (Object.getPrototypeOf(object) !== Object.prototype && Object.getPrototypeOf(object) !== null) {
    issues.push({ path, code: "not_serializable", message: `expected a plain object, received ${describe(object)}` });
  } else {
    for (const [key, child] of Object.entries(object as Record<string, unknown>)) {
      if (child === undefined) continue;
      walk(child, path ? `${path}.${key}` : key, seen, issues);
    }
  }

  seen.delete(object);
}

/** Collects every reason `value` could not survive a JSON round trip. Empty means it can. */
export function jsonIssues(value: unknown, path = ""): JsonIssue[] {
  const issues: JsonIssue[] = [];
  walk(value, path, new Set(), issues);
  return issues;
}

export function isJsonValue(value: unknown): value is JsonValue {
  return jsonIssues(value).length === 0;
}

export function isJsonObject(value: unknown): value is JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return jsonIssues(value).length === 0;
}

/** Structural clone through JSON, so a stored record can never alias a caller's object. */
export function cloneJson<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
