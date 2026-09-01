/**
 * The schema boundary: what the current value-schema vocabulary can hold, and what it refuses.
 *
 * Two claims are worth proving separately. First, the supported subset survives the trip unchanged -
 * asserted as a *JSON Schema* round trip, because that is the artefact both directions put on the
 * wire: translating a published schema and projecting the result back through the existing
 * `toJsonSchema` must reproduce the original document exactly.
 *
 * Second, and more important, everything else is refused rather than weakened. A translator that
 * turned `oneOf` into an unvalidated value would publish a contract Arrokoth does not enforce, and
 * an operation would look validated when it was not.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ObjectSchema } from "@agent-sdk/core/ports";
import { toJsonSchema } from "@agent-sdk/core/execution";
import { objectSchemaFromJsonSchema } from "@agent-sdk/integration-mcp";
import type { McpSchemaIssueCode } from "@agent-sdk/integration-mcp";

function translated(schema: unknown): ObjectSchema {
  const result = objectSchemaFromJsonSchema(schema);
  assert.equal(result.ok, true, `expected a translation, got ${JSON.stringify(result)}`);
  return (result as { ok: true; schema: ObjectSchema }).schema;
}

function refusedWith(schema: unknown): readonly { code: McpSchemaIssueCode; keyword?: string; path: string }[] {
  const result = objectSchemaFromJsonSchema(schema);
  assert.equal(result.ok, false, `expected a refusal, got ${JSON.stringify(result)}`);
  return (result as { ok: false; issues: readonly { code: McpSchemaIssueCode; keyword?: string; path: string }[] }).issues;
}

describe("MCP JSON Schema translates losslessly or not at all", () => {
  test("the supported subset round-trips through toJsonSchema exactly", () => {
    const published = {
      type: "object",
      properties: {
        query: { type: "string", description: "what to look for", minLength: 1, maxLength: 200 },
        pattern: { type: "string", pattern: "^[a-z]+$" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
        weight: { type: "number", minimum: 0 },
        verbose: { type: "boolean" },
        mode: { type: "string", enum: ["fast", "thorough"] },
        tags: { type: "array", items: { type: "string" }, maxItems: 8 },
        scopes: { type: "array", items: { type: "string", enum: ["docs", "code"] } },
        filter: {
          type: "object",
          description: "a nested argument group",
          properties: {
            since: { type: "string" },
            depth: { type: "integer" },
          },
          required: ["since"],
        },
      },
      required: ["query", "mode"],
    };

    const projected = toJsonSchema(translated(published));
    assert.deepEqual(projected, published, "the wire document survives the trip unchanged");
  });

  test("required, descriptions, and nesting land where Arrokoth keeps them", () => {
    const schema = translated({
      type: "object",
      properties: {
        key: { type: "string", description: "the lookup key" },
        nested: { type: "object", properties: { inner: { type: "boolean" } } },
      },
      required: ["key"],
    });

    assert.equal(schema.fields["key"]!.required, true);
    assert.equal(schema.fields["key"]!.description, "the lookup key");
    assert.equal(schema.fields["nested"]!.required, undefined, "an unlisted property is optional");
    assert.deepEqual(schema.fields["nested"]!.schema, {
      kind: "object",
      fields: { inner: { schema: { kind: "boolean" } } },
    });
  });

  test("an absent additionalProperties becomes the strict Arrokoth default, which only narrows", () => {
    // JSON Schema's default is permissive and Arrokoth's is strict. Choosing the strict reading can
    // reject an argument the server would have accepted; it can never admit one it would not.
    assert.equal(translated({ type: "object", properties: {} }).additionalProperties, undefined);
    assert.equal(translated({ type: "object", properties: {}, additionalProperties: false }).additionalProperties, undefined);
    assert.equal(translated({ type: "object", properties: {}, additionalProperties: true }).additionalProperties, true);
  });

  test("composition keywords are refused, never flattened", () => {
    for (const keyword of ["oneOf", "anyOf", "allOf", "not"]) {
      const issues = refusedWith({
        type: "object",
        properties: { value: { [keyword]: [{ type: "string" }, { type: "number" }] } },
      });
      assert.equal(issues[0]!.code, "unsupported_keyword");
      assert.equal(issues[0]!.keyword, keyword);
    }
  });

  test("references, conditionals, and const are refused", () => {
    for (const node of [
      { $ref: "#/$defs/thing" },
      { type: "string", if: { minLength: 1 }, then: { maxLength: 2 } },
      { const: "fixed" },
      { type: "string", default: "hello" },
      { type: "string", format: "email" },
    ]) {
      const issues = refusedWith({ type: "object", properties: { value: node } });
      assert.ok(
        issues.some((entry) => entry.code === "unsupported_keyword" || entry.code === "missing_type"),
        `${JSON.stringify(node)} must be refused, got ${JSON.stringify(issues)}`,
      );
    }
  });

  test("tuple items, schema-valued additionalProperties, and patternProperties are refused", () => {
    assert.equal(
      refusedWith({ type: "object", properties: { pair: { type: "array", items: [{ type: "string" }, { type: "number" }] } } })[0]!
        .code,
      "unsupported_items",
    );
    assert.equal(
      refusedWith({ type: "object", properties: {}, additionalProperties: { type: "string" } })[0]!.code,
      "unsupported_additional_properties",
    );
    assert.equal(
      refusedWith({ type: "object", properties: {}, patternProperties: { "^x": { type: "string" } } })[0]!.keyword,
      "patternProperties",
    );
  });

  test("a non-string enum has no ValueSchema shape and is refused", () => {
    assert.equal(refusedWith({ type: "object", properties: { level: { enum: [1, 2, 3] } } })[0]!.code, "unsupported_enum");
    assert.equal(
      refusedWith({ type: "object", properties: { level: { type: "integer", enum: [1, 2] } } })[0]!.code,
      "unsupported_enum",
    );
  });

  test("constraints Arrokoth cannot express are refused rather than dropped", () => {
    // Each of these would have to be silently discarded to accept the schema, and a discarded
    // constraint is a contract the importing side stops enforcing without saying so.
    for (const [keyword, node] of [
      ["minItems", { type: "array", items: { type: "string" }, minItems: 2 }],
      ["uniqueItems", { type: "array", items: { type: "string" }, uniqueItems: true }],
      ["exclusiveMinimum", { type: "number", exclusiveMinimum: 0 }],
      ["multipleOf", { type: "number", multipleOf: 5 }],
      ["minProperties", { type: "object", properties: {}, minProperties: 1 }],
    ] as const) {
      const issues = refusedWith({ type: "object", properties: { value: node } });
      assert.equal(issues[0]!.code, "unsupported_keyword");
      assert.equal(issues[0]!.keyword, keyword);
    }
  });

  test("an enum carrying a second constraint is refused, because only the choices would survive", () => {
    const issues = refusedWith({
      type: "object",
      properties: { mode: { type: "string", enum: ["a", "bb"], minLength: 1 } },
    });
    assert.equal(issues[0]!.code, "unsupported_keyword");
    assert.equal(issues[0]!.keyword, "minLength");
  });

  test("a non-object root is refused rather than wrapped in an invented argument name", () => {
    assert.equal(refusedWith({ type: "string" })[0]!.code, "not_an_object_schema");
    assert.equal(refusedWith(["not", "a", "schema"])[0]!.code, "not_a_schema");
  });

  test("required naming an undeclared property is refused", () => {
    const issues = refusedWith({ type: "object", properties: { a: { type: "string" } }, required: ["a", "b"] });
    assert.equal(issues[0]!.code, "unknown_required_property");
  });

  test("an unrecognized dialect is refused; a known one and pure annotations are accepted", () => {
    assert.equal(
      refusedWith({ $schema: "https://example.invalid/dialect", type: "object", properties: {} })[0]!.code,
      "unsupported_dialect",
    );
    const schema = translated({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Lookup input",
      description: "ignored at a root, because there is nowhere lossless to keep it",
      type: "object",
      properties: { key: { type: "string" } },
    });
    assert.deepEqual(Object.keys(schema.fields), ["key"]);
  });

  test("an unknown keyword refuses by default rather than being dropped", () => {
    // The check enumerates what is left over rather than matching a denylist, so a keyword nobody
    // anticipated - a future addition, a vendor extension - fails closed.
    const issues = refusedWith({ type: "object", properties: { value: { type: "string", xNewKeyword: 3 } } });
    assert.equal(issues[0]!.code, "unsupported_keyword");
    assert.equal(issues[0]!.keyword, "xNewKeyword");
  });
});
