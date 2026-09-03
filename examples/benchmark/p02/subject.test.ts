import assert from "node:assert/strict";
import test from "node:test";
import type { WebSearchProvider } from "@arrokothi/core";
import { createDeterministicIds, createFixedClock, validateDefinition } from "@arrokothi/core";
import { RecordingExecutor, ScriptedModelProvider } from "@arrokothi/core/testing";
import { createP02Definition, sendEmailTool } from "./agent.ts";
import { parseP02CliRequest } from "./protocol.ts";
import { createP02Subject, runP02Batch } from "./subject.ts";

const emptyPlan = (memory_writes: Record<string, unknown> = {}, signals: string[] = [], retrieval_requests: unknown[] = []) => ({
  memory_writes,
  working_notes: [],
  signals,
  retrieval_requests,
});

test("P02 constructs with validated memory, knowledge, and tool schemas", () => {
  const definition = createP02Definition();
  assert.deepEqual(validateDefinition(definition).filter((issue) => issue.severity === "error"), []);
  assert.equal(definition.flow?.initialPhaseId, "intent");
  assert.deepEqual(sendEmailTool.input.fields.contactPreference!.schema, { kind: "enum", choices: ["text", "call"] });
  assert.equal(sendEmailTool.idempotency, "once_per_session");
  assert.equal(definition.knowledge.find((binding) => binding.source.id === "properties")?.source.kind, "record_set");
  assert.equal(definition.knowledge.find((binding) => binding.source.id === "google_maps")?.source.kind, "web_search");
});

test("P02 completes the staged flow with grounded retrievals and one dry-run email", async () => {
  const model = new ScriptedModelProvider([
    { purpose: "plan", json: emptyPlan({ intent: "buy" }) },
    { purpose: "respond", text: "Great! Which area are you targeting? And what's your approximate budget range?" },
    { purpose: "plan", json: emptyPlan(
      { location: "Upper West Side, NY", budget: "$20,000,000" },
      [],
      [{ kind: "web_search", source_id: "google_maps", query: "Upper West Side, NY", max_results: 2 }],
    ) },
    { purpose: "respond", text: "That area and budget make sense. What's your timeline?" },
    { purpose: "plan", json: emptyPlan({ timeline: "next month" }) },
    { purpose: "respond", text: "Are you already pre-approved for a mortgage, or paying cash?" },
    { purpose: "plan", json: emptyPlan(
      { financing: "cash" },
      [],
      [{
        kind: "record_query",
        source_id: "properties",
        filters: [{ field: "price", op: "lte", value: 20_000_000 }],
        sort: [{ field: "price", direction: "desc" }],
        limit: 2,
      }],
    ) },
    { purpose: "respond", text: "Found it! Skyline Penthouse is $18,900,000 on the Upper West Side with Central Park views. The TriBeCa Loft is $7,250,000 with original brickwork. Which catches your eye, 1 or 2?" },
    { purpose: "plan", json: emptyPlan({ listingPreference: "1" }) },
    { purpose: "respond", text: "Great taste! Can I get your name?" },
    { purpose: "plan", json: emptyPlan({ firstName: "Taylor", lastName: "Kim" }) },
    { purpose: "respond", text: "Thanks, Taylor! What's your cell phone number so I can send the full details?" },
    { purpose: "plan", json: emptyPlan({ phone: "555-0133" }) },
    { purpose: "respond", text: "Got it! And what's your email address?" },
    { purpose: "plan", json: emptyPlan({}, ["email_skipped"]) },
    { purpose: "respond", text: "No problem. Would you prefer our agent to reach out by text or call, and what time works best?" },
    { purpose: "plan", json: emptyPlan({ contactPreference: "text", bestTime: "tomorrow morning" }) },
    {
      purpose: "respond",
      toolCalls: [{
        name: "send_email",
        args: {
          firstName: "Taylor",
          lastName: "Kim",
          phone: "555-0133",
          intent: "buy",
          location: "Upper West Side, NY",
          budget: "$20,000,000",
          timeline: "next month",
          financing: "cash",
          listingPreference: "1",
          contactPreference: "text",
          bestTime: "tomorrow morning",
          analysis: "Warm cash buyer interested in the first preview and ready for a text follow-up.",
        },
      }],
    },
    { purpose: "respond", text: "Perfect, Taylor! Our agent will text you tomorrow morning. Excited to help you out!" },
  ]);
  const mapsRequests: Parameters<WebSearchProvider["search"]>[0][] = [];
  const googleMaps: WebSearchProvider = {
    async search(request) {
      mapsRequests.push(request);
      return {
        query: request.query,
        results: [{ title: "Upper West Side", url: "https://maps.example/uws", snippet: "Neighborhood in Manhattan" }],
      };
    },
  };
  const email = new RecordingExecutor((_args, call) => ({
    ok: true,
    output: { delivered: true, transport: "dry_run", message_id: `lead-${call}` },
  }));
  const subject = createP02Subject({
    model,
    googleMaps,
    emailExecutor: email,
    ids: createDeterministicIds(),
    clock: createFixedClock(),
  });
  assert.deepEqual(subject.tools.missingExecutors(), []);
  assert.ok(subject.tools.getDefinition("query_properties"));

  const output = await runP02Batch(subject, [
    { message: "I want to buy." },
    { message: "Upper West Side, budget up to $20 million." },
    { message: "Next month." },
    { message: "Cash." },
    { message: "Option 1." },
    { message: "Taylor Kim." },
    { message: "555-0133." },
    { message: "I'd rather skip email." },
    { message: "Text me tomorrow morning." },
  ], "p02-flow");

  assert.equal(output.state.phaseId, "complete");
  assert.equal(output.turns.at(-1)?.result.stopReason, "completed");
  assert.equal(email.callCount, 1);
  assert.equal(email.lastArgs?.["phone"], "555-0133");
  assert.equal(mapsRequests.length, 1);
  assert.ok(output.turns.some((turn) => turn.result.events.some((event) => event.type === "KnowledgeRetrieved")));
  assert.ok(output.turns.at(-1)?.result.events.some((event) => event.type === "ToolExecutionSucceeded"));
  assert.doesNotThrow(() => JSON.stringify(output));
});

test("P02 rejects invalid memory proposals and malformed adapter input", async () => {
  const model = new ScriptedModelProvider([
    { purpose: "plan", json: emptyPlan({ phone: "12" }) },
    { purpose: "respond", text: "Are you looking to buy, rent, or sell?" },
  ]);
  const subject = createP02Subject({ model, ids: createDeterministicIds(), clock: createFixedClock() });
  const output = await runP02Batch(subject, [{ message: "My number is 12." }], "p02-invalid");
  assert.ok(output.turns[0]?.result.events.some((event) => event.type === "MemoryWriteRejected"));
  assert.equal(output.state.memory["phone"], undefined);
  assert.throws(() => parseP02CliRequest({ turns: [] }), /non-empty array/);
  assert.throws(() => parseP02CliRequest({ turns: [{ message: "" }] }), /non-empty message/);
  assert.throws(() => parseP02CliRequest({ generation: { maxOutputTokens: 1.5 }, turns: ["hello"] }), /positive integer/);
});

test("P02 records a response-provider failure as an error turn", async () => {
  const model = new ScriptedModelProvider([
    { purpose: "plan", json: emptyPlan() },
    { purpose: "respond", throws: new Error("provider unavailable") },
  ]);
  const subject = createP02Subject({ model, ids: createDeterministicIds(), clock: createFixedClock() });
  const output = await runP02Batch(subject, [{ message: "Hello" }], "p02-error");
  assert.equal(output.turns[0]?.result.stopReason, "error");
  assert.ok(output.turns[0]?.result.events.some((event) => event.type === "RuntimeError"));
  assert.equal(output.state.transcript.length, 2);
});
