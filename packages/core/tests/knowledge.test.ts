import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { RecordSetSource } from "../src/knowledge/types.ts";
// The local retrieval implementation moved to `@arrokothi/retrieval-local` in Slice C. These remain
// legacy tests of legacy behaviour; they now reach the implementation through its new home.
import { queryRecords } from "@arrokothi/retrieval-local";
import { DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_SIZE, KnowledgeIndex, chunkDocument } from "@arrokothi/retrieval-local/legacy";
import { defineAgent, validateDefinition } from "../src/definition/definition.ts";
import { parseRecordQueryArgs, recordQueryTools } from "../src/tools/record-query-tool.ts";
import { ScriptedModelProvider } from "../src/testing/scripted-provider.ts";
import { PROPERTIES, buildRuntime, callTool, interpret, reply, testDefinition } from "./helpers.ts";

const listings = testDefinition().knowledge[0]!.source as RecordSetSource;

function metadataDefinition(fields: Record<string, unknown>) {
  return defineAgent({
    id: "record-metadata-validation",
    name: "Record Metadata Validation",
    goal: "Query synthetic inventory records.",
    model: { providerId: "scripted", model: "scripted-model", temperature: 0 },
    globalRules: [],
    memorySchema: { fields: [] },
    hostContextSchema: { fields: [] },
    knowledge: [{
      source: {
        id: "synthetic_inventory",
        kind: "record_set",
        title: "Synthetic inventory",
        fields: fields as RecordSetSource["fields"],
        records: [{ item_code: "A-1", score: 7, active: true, status: "ready" }],
      },
    }],
    tools: [],
    policies: {},
  });
}

function validationErrors(fields: Record<string, unknown>) {
  return validateDefinition(metadataDefinition(fields)).filter((issue) => issue.severity === "error");
}

/** INVARIANT 6 - deterministic record-set filtering, especially the numeric budget constraint. */
describe("invariant 6: deterministic record filtering", () => {
  test("price <= budget returns exactly the qualifying records", () => {
    const result = queryRecords(listings, { filters: [{ field: "price", op: "lte", value: 20_000_000 }] });
    assert.ok(result.ok);
    const titles = result.value.matches.map((m) => m["title"]).sort();
    assert.deepEqual(titles, ["Emerald Estate", "Skyline Penthouse", "The Azure Vista", "The TriBeCa Loft"]);
    assert.equal(result.value.totalMatched, 4);
    assert.equal(result.value.totalRecords, 6);
  });

  test("a constraint no record satisfies returns an honest empty result, not a near miss", () => {
    const result = queryRecords(listings, {
      filters: [
        { field: "price", op: "lte", value: 10_000_000 },
        { field: "beds", op: "gte", value: 5 },
        { field: "location", op: "contains", value: "Manhattan" },
      ],
    });
    assert.ok(result.ok);
    assert.equal(result.value.matches.length, 0);
    assert.equal(result.value.totalMatched, 0);
    assert.equal(result.value.totalRecords, 6);
  });

  test("combined filters compose with AND", () => {
    const result = queryRecords(listings, {
      filters: [
        { field: "price", op: "lte", value: 25_000_000 },
        { field: "beds", op: "gte", value: 5 },
      ],
    });
    assert.ok(result.ok);
    assert.deepEqual(result.value.matches.map((m) => m["title"]).sort(), ["Emerald Estate", "Greenwich Townhouse", "The Azure Vista"]);
  });

  test("location matching is case-insensitive", () => {
    const result = queryRecords(listings, { filters: [{ field: "location", op: "eq", value: "tribeca" }] });
    assert.ok(result.ok);
    assert.equal(result.value.matches.length, 1);
    assert.equal(result.value.matches[0]!["title"], "The TriBeCa Loft");
  });

  test("sorting and limiting are deterministic, and totalMatched reports the pre-limit truth", () => {
    const result = queryRecords(listings, {
      filters: [{ field: "price", op: "lte", value: 20_000_000 }],
      sort: [{ field: "price", direction: "desc" }],
      limit: 2,
    });
    assert.ok(result.ok);
    assert.deepEqual(result.value.matches.map((m) => m["price"]), [18_900_000, 15_750_000]);
    assert.equal(result.value.totalMatched, 4, "the limit must not distort the true match count");
  });

  test("an unknown field is an ERROR, never a misleading empty result", () => {
    const result = queryRecords(listings, { filters: [{ field: "pool", op: "eq", value: true }] });
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error.code, "unknown_field");
    assert.match(!result.ok ? result.error.message : "", /declared: id, title, location, price, beds, sqft/);
  });

  test("a comparison operator on a non-numeric field is refused", () => {
    const result = queryRecords(listings, { filters: [{ field: "title", op: "lt", value: 5 }] });
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error.code, "bad_operator");
  });

  test("sorting by an unknown field is refused", () => {
    const result = queryRecords(listings, { sort: [{ field: "nope", direction: "asc" }] });
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error.code, "unknown_field");
  });

  test("model argument shapes parse into the same typed query", () => {
    const asArray = parseRecordQueryArgs({ filters: [{ field: "price", op: "lte", value: 20_000_000 }] });
    const asObject = parseRecordQueryArgs({ filters: { a: { field: "price", operator: "lte", value: 20_000_000 } } });
    const asSingle = parseRecordQueryArgs({ filters: { field: "price", op: "lte", value: 20_000_000 } });
    assert.deepEqual(asArray.filters, asObject.filters);
    assert.deepEqual(asArray.filters, asSingle.filters);
  });
});

describe("record field metadata validation", () => {
  test("valid primitive metadata examples pass", () => {
    const errors = validationErrors({
      item_code: {
        schema: { kind: "string" },
        description: "Stable item code assigned by the synthetic inventory system.",
        examples: ["A-1", "B-2"],
      },
      score: {
        schema: { kind: "number", min: 0 },
        description: "Synthetic ranking score.",
        examples: [7, 11],
      },
      active: {
        schema: { kind: "boolean" },
        description: "Whether the synthetic item is active.",
        examples: [true, false],
      },
      status: {
        schema: { kind: "enum", choices: ["ready", "hold"] },
        description: "Synthetic processing state.",
        examples: ["ready"],
      },
    });

    assert.deepEqual(errors, []);
  });

  test("bare ValueSchema fields remain the concise form", () => {
    const errors = validationErrors({
      item_code: { kind: "string" },
      score: { kind: "number" },
      active: { kind: "boolean" },
      status: { kind: "enum", choices: ["ready", "hold"] },
    });

    assert.deepEqual(errors, []);
  });

  test("examples must match the declared field schema", () => {
    const errors = validationErrors({
      score: {
        schema: { kind: "number" },
        description: "Synthetic ranking score.",
        examples: ["high"],
      },
    });

    assert.ok(errors.some((issue) => issue.path === "knowledge.synthetic_inventory.fields.score.examples[0]" && /expected number/.test(issue.message)));
  });

  test("enum examples must be declared choices", () => {
    const errors = validationErrors({
      status: {
        schema: { kind: "enum", choices: ["ready", "hold"] },
        description: "Synthetic processing state.",
        examples: ["paused"],
      },
    });

    assert.ok(errors.some((issue) => issue.path === "knowledge.synthetic_inventory.fields.status.examples[0]" && /expected one of ready \| hold/.test(issue.message)));
  });

  test("blank and non-string descriptions are rejected", () => {
    const errors = validationErrors({
      blank_description: {
        schema: { kind: "string" },
        description: "   ",
        examples: ["A-1"],
      },
      invalid_description: {
        schema: { kind: "string" },
        description: 42,
        examples: ["B-2"],
      },
    });

    assert.ok(errors.some((issue) => issue.path === "knowledge.synthetic_inventory.fields.blank_description.description"));
    assert.ok(errors.some((issue) => issue.path === "knowledge.synthetic_inventory.fields.invalid_description.description"));
  });

  test("examples for schemas outside the primitive examples contract are rejected", () => {
    const errors = validationErrors({
      tags: {
        schema: { kind: "string_array" },
        description: "Synthetic tags attached to the item.",
        examples: ["fragile"],
      },
    });

    assert.ok(errors.some((issue) => issue.path === "knowledge.synthetic_inventory.fields.tags.examples[0]" && /expected string\[\]/.test(issue.message)));
  });
});

describe("record query as a tool", () => {
  test("the tool returns an authoritative match count the model did not compute", async () => {
    const knowledge = new KnowledgeIndex(testDefinition().knowledge);
    const [tool] = recordQueryTools(knowledge);
    assert.ok(tool);
    const result = await tool.executor.execute(
      { filters: [{ field: "price", op: "lte", value: 10_000_000 }] },
      { sessionId: "s", turn: 1, requestId: "r", idempotencyKey: "test-key", memory: {}, hostContext: {} },
    );
    assert.ok(result.ok);
    assert.equal(result.output["total_matched"], 1);
    assert.equal(result.facts?.[0]?.key, "listings_matches");
    assert.equal(result.facts?.[0]?.value, 1);
  });

  test("the authoritative count reaches the next compiled context labelled as authoritative", async () => {
    const model = new ScriptedModelProvider([
      interpret({ budget: 10_000_000, intent: "buy" }),
      callTool("query_listings", { filters: [{ field: "price", op: "lte", value: 10_000_000 }] }),
      reply("Only one property fits that budget."),
    ]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("k1");
    const result = await runtime.runTurn({ sessionId, message: "I'm buying with a $10M budget." });

    const last = result.contexts.at(-1)!.context.system;
    assert.match(last, /AUTHORITATIVE FACT listings_matches = 1/);
    assert.match(last, /query_listings: SUCCEEDED/);
  });

  test("a hallucinated field name fails loudly rather than silently returning nothing", async () => {
    const model = new ScriptedModelProvider([
      interpret({}),
      callTool("query_listings", { filters: [{ field: "has_pool", op: "eq", value: true }] }),
      reply("I can't filter on that."),
    ]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("k2");
    const result = await runtime.runTurn({ sessionId, message: "Which have a pool?" });

    const failed = result.events.find((e) => e.type === "ToolExecutionFailed");
    assert.ok(failed?.type === "ToolExecutionFailed");
    assert.equal(failed.payload.error.code, "unknown_field");
    assert.match(result.contexts.at(-1)!.context.system, /query_listings: FAILED/);
  });
});

describe("lexical retrieval", () => {
  test("document retrieval finds the relevant chunk and ignores irrelevant queries", async () => {
    const knowledge = new KnowledgeIndex([
      {
        source: {
          id: "faq",
          kind: "document",
          title: "Buyer FAQ",
          text: "Closing costs in New York typically run two to four percent.\n\nThe transfer tax applies above one million dollars.\n\nHempcrete is not relevant here.",
        },
      },
    ]);
    const hits = await knowledge.retrieve({ kind: "document_search", sourceId: "faq", query: "what are closing costs" });
    assert.ok(hits.length > 0);
    assert.match(hits[0]!.text, /Closing costs/);

    const none = await knowledge.retrieve({ kind: "document_search", sourceId: "faq", query: "zzzz" });
    assert.equal(none.length, 0);
  });

  test("RecursiveCharacterTextSplitter defaults keep a small document as one chunk", async () => {
    assert.equal(DEFAULT_CHUNK_SIZE, 1000);
    assert.equal(DEFAULT_CHUNK_OVERLAP, 200);
    const chunks = await chunkDocument({ id: "small", kind: "document", title: "Small", text: "A short source remains whole." });
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0]?.text, "A short source remains whole.");
  });

  test("large documents produce overlapping chunks with configurable LangChain splitting", async () => {
    const text = "abcdefghijklmnopqrstuvwxyz".repeat(8);
    const chunks = await chunkDocument({
      id: "large",
      kind: "document",
      title: "Large",
      text,
      chunking: { chunkSize: 50, chunkOverlap: 10 },
    });
    assert.ok(chunks.length > 1);
    assert.equal(chunks[0]!.text.slice(-10), chunks[1]!.text.slice(0, 10));
  });

  test("the LangChain-backed local retriever returns only SDK KnowledgeChunk fields", async () => {
    const knowledge = new KnowledgeIndex([
      { source: { id: "local", kind: "document", title: "Local", text: "Local lexical retrieval needs no embedding service or vector store." } },
    ]);
    const [hit] = await knowledge.retrieve({ kind: "document_search", sourceId: "local", query: "lexical retrieval" });
    assert.ok(hit);
    assert.deepEqual(Object.keys(hit).sort(), ["chunkId", "rank", "score", "sourceId", "sourceTitle", "text"]);
  });

  test("record sets use deterministic queries rather than document retrieval", () => {
    const knowledge = new KnowledgeIndex(testDefinition().knowledge);
    const result = knowledge.queryRecords({
      kind: "record_query",
      sourceId: "listings",
      filters: [{ field: "title", op: "eq", value: "The TriBeCa Loft" }],
    });
    assert.ok(result.ok);
    assert.equal(result.value.matches[0]?.["title"], "The TriBeCa Loft");
    assert.equal(result.value.matches[0]?.["price"], PROPERTIES[1]!.price);
  });
});
