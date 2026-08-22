import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { turnPlanSchema } from "@agent-sdk/core";
import { GeminiProvider, projectGeminiStructuredOutput } from "../src/index.ts";

describe("GeminiProvider structured output", () => {
  it("sends provider-neutral JSON Schema through responseJsonSchema", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fetchImpl: typeof fetch = async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify({
              memory_writes: {},
              working_notes: [],
              signals: [],
              retrieval_requests: [],
            }) }],
          },
          finishReason: "STOP",
        }],
        modelVersion: "gemini-test",
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
    const provider = new GeminiProvider({
      apiKey: "test-key",
      model: "gemini-test",
      fetchImpl,
      maxRetries: 0,
    });

    const result = await provider.generate({
      system: "Return a plan.",
      messages: [{ role: "user", content: "Plan this turn." }],
      model: "gemini-test",
      purpose: "plan",
      responseSchema: turnPlanSchema(4),
    });

    const generationConfig = capturedBody?.["generationConfig"] as Record<string, unknown>;
    assert.equal(generationConfig["responseMimeType"], "application/json");
    const responseJsonSchema = generationConfig["responseJsonSchema"] as {
      properties: {
        memory_writes: { additionalProperties?: boolean };
        retrieval_requests: {
          items: {
            properties: {
              query: Record<string, unknown>;
              filters: { items: { properties: { value: { type?: string; description?: string } } } };
            };
          };
        };
      };
    };
    assert.equal(responseJsonSchema.properties.memory_writes.additionalProperties, true);
    assert.equal(responseJsonSchema.properties.retrieval_requests.items.properties.query["minLength"], undefined);
    assert.equal(responseJsonSchema.properties.retrieval_requests.items.properties.query["maxLength"], undefined);
    assert.equal(responseJsonSchema.properties.retrieval_requests.items.properties.filters.items.properties.value.type, "string");
    assert.match(responseJsonSchema.properties.retrieval_requests.items.properties.filters.items.properties.value.description ?? "", /JSON-encoded/);
    assert.doesNotMatch(JSON.stringify(responseJsonSchema), /anyOf/);
    assert.equal(generationConfig["responseSchema"], undefined);
    assert.deepEqual(result.json, {
      memory_writes: {},
      working_notes: [],
      signals: [],
      retrieval_requests: [],
    });
  });

  it("normalizes Gemini's JSON-text record filter wire values before core validation", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const provider = new GeminiProvider({
      apiKey: "test-key",
      model: "gemini-test",
      maxRetries: 0,
      fetchImpl: async (_url, init) => {
        capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(JSON.stringify({
          candidates: [{
            content: { parts: [{ text: JSON.stringify({
              memory_writes: {},
              working_notes: [],
              signals: [],
              retrieval_requests: [{
                kind: "record_query",
                source_id: "inventory",
                filters: [
                  { field: "active", op: "eq", value: "true" },
                  { field: "threshold", op: "gte", value: "42" },
                  { field: "supplier_region", op: "in", value: "[\"north-sector\",\"south-sector\"]" },
                  { field: "scientific_category", op: "eq", value: "\"mineral\"" },
                ],
              }],
            }) }] },
            finishReason: "STOP",
          }],
          modelVersion: "gemini-test",
        }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });

    const result = await provider.generate({
      system: "Return a generic record query.",
      messages: [{ role: "user", content: "Query inventory." }],
      model: "gemini-test",
      purpose: "plan",
      responseSchema: turnPlanSchema(4),
    });

    const filters = ((result.json as Record<string, unknown>)["retrieval_requests"] as Record<string, unknown>[])[0]!["filters"];
    assert.deepEqual(filters, [
      { field: "active", op: "eq", value: true },
      { field: "threshold", op: "gte", value: 42 },
      { field: "supplier_region", op: "in", value: ["north-sector", "south-sector"] },
      { field: "scientific_category", op: "eq", value: "mineral" },
    ]);
    assert.doesNotMatch(JSON.stringify(capturedBody), /anyOf/);
  });

  it("projects and normalizes independently of transport", () => {
    const projection = projectGeminiStructuredOutput(turnPlanSchema(1));
    assert.doesNotMatch(JSON.stringify(projection.schema), /anyOf/);
    const normalized = projection.normalize({
      retrieval_requests: [{
        kind: "record_query",
        source_id: "inventory",
        filters: [{ field: "active", op: "eq", value: "false" }],
      }],
    });
    const filter = ((normalized as Record<string, unknown>)["retrieval_requests"] as Record<string, unknown>[])[0]!["filters"] as Record<string, unknown>[];
    assert.equal(filter[0]?.["value"], false);
  });

  it("projects the agentic planner without its unused polymorphic retrieval branch", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const provider = new GeminiProvider({
      apiKey: "test-key",
      model: "gemini-test",
      maxRetries: 0,
      fetchImpl: async (_url, init) => {
        capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: "{\"retrieval_requests\":[]}" }] }, finishReason: "STOP" }],
          modelVersion: "gemini-test",
        }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });

    await provider.generate({
      system: "Return an agentic preflight plan.",
      messages: [{ role: "user", content: "Plan without retrieval." }],
      model: "gemini-test",
      purpose: "plan",
      responseSchema: turnPlanSchema(4, false),
    });

    const generationConfig = capturedBody?.["generationConfig"] as Record<string, unknown>;
    const schema = generationConfig["responseJsonSchema"] as {
      properties: { retrieval_requests: Record<string, unknown> };
    };
    assert.equal(schema.properties.retrieval_requests["maxItems"], 0);
    assert.doesNotMatch(JSON.stringify(schema), /anyOf/);
  });
});
