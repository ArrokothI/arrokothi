/** Semantic-fidelity checks for the provider-neutral ValueSchema -> JSON Schema projection. */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ObjectSchema } from "@agent-sdk/core/ports";
import { toJsonSchema } from "@agent-sdk/core/execution";

describe("ObjectSchema additionalProperties projection", () => {
  test("strict default and explicit false project false; explicit true projects true", () => {
    const strictDefault: ObjectSchema = { kind: "object", fields: {} };
    const strictExplicit: ObjectSchema = { kind: "object", fields: {}, additionalProperties: false };
    const permissive: ObjectSchema = { kind: "object", fields: {}, additionalProperties: true };

    assert.equal(toJsonSchema(strictDefault)["additionalProperties"], false);
    assert.equal(toJsonSchema(strictExplicit)["additionalProperties"], false);
    assert.equal(toJsonSchema(permissive)["additionalProperties"], true);
  });

  test("nested object strictness is projected at every object node", () => {
    const schema: ObjectSchema = {
      kind: "object",
      fields: {
        closed: { schema: { kind: "object", fields: { name: { schema: { kind: "string" } } } } },
        open: { schema: { kind: "object", fields: {}, additionalProperties: true } },
      },
    };

    const projected = toJsonSchema(schema) as {
      additionalProperties: boolean;
      properties: Record<string, { additionalProperties: boolean }>;
    };
    assert.equal(projected.additionalProperties, false);
    assert.equal(projected.properties["closed"]!.additionalProperties, false);
    assert.equal(projected.properties["open"]!.additionalProperties, true);
  });
});
