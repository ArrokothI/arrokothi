/**
 * Deterministic tests for the P02 benchmark subject.
 *
 * The model is a `ScriptedModelProvider`, so these assert the architecture — grounded retrieval,
 * committed-state persistence, correction supersession, intent change, deny-by-default handoff
 * authority, the three Effect outcomes kept apart, and duplicate suppression — never model quality.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import { validateDefinition } from "@arrokothi/core/execution";
import { ScriptedModelProvider } from "@arrokothi/core/reference";
import type { ScriptedModelStep } from "@arrokothi/core/reference";
import { LEAD_SUBMIT, PROPERTIES_SEARCH, createP02AgentDefinition } from "./agent.ts";
import { createP02App, p02Authorizer } from "./app.ts";
import { createFakeEmailProvider } from "./email.ts";
import type { FakeEmailMode } from "./email.ts";
import { P02_MEMORY_KEYS } from "./lead.ts";
import { searchProperties } from "./properties.ts";
import { P02_PROPERTIES } from "./catalog.ts";
import { parseP02CliRequest } from "./protocol.ts";
import { runP02Session } from "./subject.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const respond = (text: string): ScriptedModelStep => ({ output: { text } });
const writes = (fields: Record<string, string>): ScriptedModelStep => ({
  output: {
    capabilityCalls: Object.entries(fields).map(([key, value], i) => ({
      id: `w${i}-${key}`,
      capability: `memory_write_${key}`,
      input: { value },
    })),
  },
});
const search = (input: Record<string, string | number>): ScriptedModelStep => ({
  output: { capabilityCalls: [{ id: "s1", capability: "properties_search", input }] },
});
const submit = (analysis: string): ScriptedModelStep => ({
  output: { capabilityCalls: [{ id: "h1", capability: "lead_submit", input: { analysis } }] },
});

function scriptedApp(steps: ScriptedModelStep[], mode?: FakeEmailMode) {
  const email = createFakeEmailProvider(mode ? { mode } : {});
  const app = createP02App({
    model: new ScriptedModelProvider({ id: "scripted", steps }),
    providerId: "scripted",
    modelName: "deterministic-1",
    email,
  });
  return { app, email };
}

describe("deterministic property retrieval", () => {
  test("returns authoritative facts and never fabricates", () => {
    const r = searchProperties(P02_PROPERTIES, { location: "tribeca" });
    assert.equal(r.matches.length, 1);
    assert.equal(r.matches[0]!.title, "The TriBeCa Loft");
    assert.equal(r.matches[0]!.price, 7_250_000);
    assert.equal(r.matches[0]!.beds, 3);
  });

  test("ranks by price and caps results", () => {
    const r = searchProperties(P02_PROPERTIES, { location: "NY", limit: 2 });
    assert.deepEqual(r.matches.map((m) => m.price), [32_000_000, 24_500_000]);
  });

  test("a no-match search is truthful, not invented", () => {
    const r = searchProperties(P02_PROPERTIES, { location: "Austin, Texas" });
    assert.deepEqual(r.matches, []);
    assert.match(r.note ?? "", /No EstatePro listing matches/);
  });
});

describe("the P02 definition", () => {
  test("is a valid Agent exposing the two operations and the lead keys", () => {
    const definition = createP02AgentDefinition();
    assert.equal(validateDefinition(definition).ok, true);
    assert.deepEqual(definition.spec.operations?.refs, [PROPERTIES_SEARCH, LEAD_SUBMIT]);
    assert.deepEqual(definition.spec.structuredMemory?.read?.keys, [...P02_MEMORY_KEYS]);
    assert.deepEqual(
      definition.spec.structuredMemory?.write?.keys,
      definition.spec.structuredMemory?.read?.keys,
    );
  });
});

describe("the benchmark protocol", () => {
  test("accepts a well-formed request and rejects malformed ones", () => {
    const ok = parseP02CliRequest({
      protocolVersion: "1",
      generation: { provider: "gemini", model: "gemini-3.5-flash-lite", temperature: 0 },
      turns: [{ message: "hi" }],
    });
    assert.equal(ok.turns.length, 1);
    assert.throws(() => parseP02CliRequest({ turns: [] }), /non-empty array/);
    assert.throws(() => parseP02CliRequest({ turns: ["  "] }), /non-empty message/);
    assert.throws(
      () => parseP02CliRequest({ generation: { provider: "openai", model: "x" }, turns: ["hi"] }),
      /provider must be "gemini"/,
    );
  });
});

describe("lead state is deterministic across turns", () => {
  test("out-of-order facts accumulate on one record", async () => {
    const { app } = scriptedApp([
      writes({ budget: "up to $20M", location: "Upper West Side" }),
      respond("Great — and are you looking to buy, rent, or sell?"),
      writes({ intent: "buy" }),
      respond("Got it. What's your timeline?"),
    ]);
    const result = await runP02Session(app, [
      { message: "Budget is about $20M, ideally Upper West Side." },
      { message: "I want to buy." },
    ]);
    assert.equal(result.lead["budget"], "up to $20M");
    assert.equal(result.lead["location"], "Upper West Side");
    assert.equal(result.lead["intent"], "buy");
  });

  test("a correction supersedes the stale value, and a changed intent overwrites", async () => {
    const { app } = scriptedApp([
      writes({ intent: "buy", location: "Malibu" }),
      respond("A Malibu purchase — exciting. Pre-approved or paying cash?"),
      respond("No problem, take your time."),
      writes({ intent: "sell", zipCode: "06830" }),
      respond("Understood, you're selling. What's the property's ZIP?"),
    ]);
    const result = await runP02Session(app, [
      { message: "Buying in Malibu." },
      { message: "Just a general question first — is now a good time to sell?" },
      { message: "Actually I want to sell my place, ZIP 06830." },
    ]);
    assert.equal(result.lead["intent"], "sell");
    assert.equal(result.lead["zipCode"], "06830");
  });
});

describe("property grounding runs through the read-only capability", () => {
  test("the model is shown authoritative matches and records the chosen listing", async () => {
    const { app } = scriptedApp([
      writes({ intent: "buy", location: "TriBeCa", budget: "under $10M" }),
      search({ location: "tribeca", maxPrice: 10_000_000 }),
      respond("The TriBeCa Loft is $7,250,000 with original brickwork — worth a look?"),
      writes({ selectedProperty: "The TriBeCa Loft" }),
      respond("Great choice. Can I grab your name?"),
    ]);
    const result = await runP02Session(app, [
      { message: "Buying in TriBeCa, budget under 10 million." },
      { message: "Yes, that one." },
    ]);
    assert.ok(result.turns[0]!.effects.includes("use_capability"), "properties.search was called");
    assert.equal(result.lead["selectedProperty"], "The TriBeCa Loft");
  });
});

describe("synthetic probe A — front-loaded facts are not re-interviewed", () => {
  test("a one-message buyer brief is retained wholesale", async () => {
    const { app } = scriptedApp([
      writes({
        intent: "buy",
        location: "West Village",
        budget: "around $25M",
        timeline: "next quarter",
        financing: "paying cash",
        firstName: "Morgan",
      }),
      respond("Thanks Morgan — a cash purchase in the West Village around $25M, next quarter. Which listings should I pull up?"),
    ]);
    const result = await runP02Session(app, [
      { message: "Hi, I'm Morgan. Cash buyer, West Village, about $25M, hoping to close next quarter." },
    ]);
    assert.deepEqual(
      {
        intent: result.lead["intent"],
        location: result.lead["location"],
        budget: result.lead["budget"],
        timeline: result.lead["timeline"],
        financing: result.lead["financing"],
        firstName: result.lead["firstName"],
      },
      {
        intent: "buy",
        location: "West Village",
        budget: "around $25M",
        timeline: "next quarter",
        financing: "paying cash",
        firstName: "Morgan",
      },
    );
  });
});

describe("handoff authority is deny-by-default", () => {
  test("submit is refused before the required contact fields are recorded", async () => {
    const { app, email } = scriptedApp([
      writes({ intent: "buy", firstName: "Sam" }),
      submit("Eager buyer."),
      respond("I still need a cell number before I can pass this to the team."),
    ]);
    const result = await runP02Session(app, [{ message: "I'm Sam and I want to buy. Send me to an agent." }]);
    assert.equal(email.sent.length, 0, "nothing was dispatched");
    assert.equal(result.turns[0]!.handoff, "denied");
    assert.equal(result.handoff.outcome, "denied");
    assert.deepEqual(result.handoff.missingContactFields, ["phone"]);
  });

  test("declining optional email does not block an otherwise valid handoff", async () => {
    const { app, email } = scriptedApp([
      writes({
        intent: "buy",
        firstName: "Dana",
        phone: "555-0199",
        contactPreference: "call",
        bestTime: "weekday afternoons",
      }),
      submit("Warm buyer, prefers a call."),
      respond("Perfect, Dana — the team will call you on a weekday afternoon."),
    ]);
    const result = await runP02Session(app, [
      { message: "Dana here, 555-0199, no email please, just call me weekday afternoons." },
    ]);
    assert.equal(email.sent.length, 1);
    assert.equal(email.sent[0]!.lead && (email.sent[0]!.lead as Record<string, string>)["email"], undefined);
    assert.equal(result.turns[0]!.handoff, "delivered");
    assert.equal(result.handoff.outcome, "delivered");
  });
});

describe("the three Effect outcomes stay apart", () => {
  async function runHandoff(mode: FakeEmailMode) {
    const { app, email } = scriptedApp(
      [
        writes({
          intent: "rent",
          firstName: "Lee",
          phone: "555-0123",
          contactPreference: "text",
          bestTime: "tonight",
        }),
        submit("Renter, wants a text tonight."),
        respond("All set, Lee."),
      ],
      mode,
    );
    const result = await runP02Session(app, [{ message: "Lee, 555-0123, text me tonight." }]);
    return { result, email };
  }

  test("success is reported as delivered", async () => {
    const { result } = await runHandoff("success");
    assert.equal(result.handoff.outcome, "delivered");
    assert.equal(result.handoff.attempts, 1);
  });

  test("failure is not delivered and may be retried (gate not established)", async () => {
    const { result } = await runHandoff("failure");
    assert.equal(result.handoff.outcome, "failed");
    assert.equal(result.turns[0]!.handoff, "failed");
  });

  test("unknown is neither success nor failure, and is not retried", async () => {
    const { result } = await runHandoff("unknown");
    assert.equal(result.handoff.outcome, "unknown");
  });
});

describe("duplicate handoff prevention", () => {
  test("a second submit across turns is denied and nothing is re-sent", async () => {
    const { app, email } = scriptedApp([
      writes({
        intent: "buy",
        firstName: "Kit",
        phone: "555-0175",
        contactPreference: "text",
        bestTime: "morning",
      }),
      submit("First submission."),
      respond("Done, Kit."),
      submit("Trying again."),
      respond("You're already in the queue, Kit."),
    ]);
    const result = await runP02Session(app, [
      { message: "Kit, 555-0175, text me in the morning." },
      { message: "Did that go through? Send it again to be safe." },
    ]);
    assert.equal(email.sent.length, 1, "exactly one dispatch");
    assert.equal(result.turns[0]!.handoff, "delivered");
    assert.equal(result.turns[1]!.handoff, "denied");
  });
});

describe("synthetic probe B — intent flips, email declined, one handoff", () => {
  test("the corrected intent drives the single handoff and email never blocks", async () => {
    const { app, email } = scriptedApp([
      writes({ intent: "buy", location: "Malibu" }),
      respond("A Malibu purchase — are you pre-approved or paying cash?"),
      writes({ intent: "sell", zipCode: "90265" }),
      respond("Got it, you're selling in 90265. What should I know about the place?"),
      writes({ firstName: "Rae", phone: "555-0140" }),
      respond("Thanks Rae. What's the best email for you?"),
      writes({ contactPreference: "call", bestTime: "weekday mornings" }),
      respond("No problem, no email. A call on a weekday morning it is."),
      submit("Seller in 90265, prefers a weekday-morning call. Warm."),
      respond("All set, Rae — the team will call you on a weekday morning."),
      submit("(retry attempt)"),
      respond("You're already in the queue."),
    ]);
    const result = await runP02Session(app, [
      { message: "I'm buying in Malibu." },
      { message: "Actually, scratch that — I want to sell. ZIP is 90265." },
      { message: "I'm Rae, call me at 555-0140." },
      { message: "I'd rather not share email. Call me weekday mornings." },
      { message: "Sounds good." },
      { message: "Wait, did that send? Try again." },
    ]);
    assert.equal(result.lead["intent"], "sell");
    assert.equal(result.lead["zipCode"], "90265");
    assert.equal(result.lead["email"], undefined);
    assert.equal(email.sent.length, 1, "exactly one handoff for the whole conversation");
    assert.equal(email.sent[0]!.lead && (email.sent[0]!.lead as Record<string, string>)["intent"], "sell");
    assert.equal(result.handoff.outcome, "delivered");
  });
});

describe("the Execution-lifetime model-call budget", () => {
  test("the definition ceiling is high enough for a long qualification conversation", () => {
    const ceiling = createP02AgentDefinition().spec.limits?.maxModelCalls ?? 0;
    // Derived from synthetic measurement: a clean qualification session spends ~2.5 model calls per
    // turn (a write plus a response, plus a grounding search / handoff round-trip on some turns).
    // This ceiling covers a long conversation with corrections and re-searches, absorbs one
    // pathological multi-fact turn, and still bounds a runaway loop.
    assert.ok(ceiling >= 32, `expected a healthy multi-turn ceiling, got ${ceiling}`);
  });

  test("diagnostics report the real model-call count, per turn and in total", async () => {
    const { app } = scriptedApp([
      writes({ intent: "buy", location: "Tribeca" }),
      search({ location: "Tribeca" }),
      respond("Here is a Tribeca listing. What's your budget?"),
      writes({ budget: "3M" }),
      respond("Noted. Timeline?"),
    ]);
    const result = await runP02Session(app, [
      { message: "Buying in Tribeca." },
      { message: "Budget about 3 million." },
    ]);
    assert.deepEqual(result.diagnostics.modelCallsByTurn, [3, 2]);
    assert.equal(result.diagnostics.totalModelCalls, 5);
    assert.equal(
      result.diagnostics.maxModelCalls,
      createP02AgentDefinition().spec.limits?.maxModelCalls,
    );
  });

  test("a long synthetic qualification session stays under the ceiling and answers every turn", async () => {
    const steps: ScriptedModelStep[] = [];
    const turns: { message: string }[] = [];
    for (let i = 0; i < 14; i++) {
      steps.push(writes({ budget: `${1_000_000 + i * 50_000}` }));
      steps.push(respond(`Recorded a budget update. What else can I help with? (turn ${i + 1})`));
      turns.push({ message: `Change my budget to ${1_000_000 + i * 50_000}.` });
    }
    const result = await runP02Session(scriptedApp(steps).app, turns);
    for (const turn of result.turns) {
      assert.equal(turn.lifecycle, "WAITING", `turn ${turn.turn} kept waiting`);
      assert.ok(turn.assistant.trim().length > 0, `turn ${turn.turn} answered`);
    }
    assert.equal(result.lead["budget"], "1650000", "the last correction wins");
    assert.ok(
      result.diagnostics.totalModelCalls < result.diagnostics.maxModelCalls,
      `spent ${result.diagnostics.totalModelCalls} of ${result.diagnostics.maxModelCalls}`,
    );
  });

  test("exhausting the lifetime budget fails loudly rather than emitting empty turns", async () => {
    const ceiling = createP02AgentDefinition().spec.limits?.maxModelCalls ?? 0;
    const steps: ScriptedModelStep[] = [];
    const turns: { message: string }[] = [];
    for (let i = 0; i < ceiling + 3; i++) {
      steps.push(respond(`answer ${i + 1}`));
      turns.push({ message: `question ${i + 1}` });
    }
    await assert.rejects(
      runP02Session(scriptedApp(steps).app, turns),
      (error: Error) =>
        error.message.includes(`turn ${ceiling + 1}`) &&
        error.message.includes("agent_model_call_budget_exhausted"),
    );
  });
});

describe("no hidden model calls", () => {
  test("runtime files only wire the injected provider", async () => {
    for (const file of ["main.ts", "app.ts", "subject.ts", "agent.ts", "properties.ts", "email.ts", "lead.ts"]) {
      const source = await readFile(resolve(HERE, file), "utf8");
      assert.doesNotMatch(source, /openai|anthropic|claude|gpt-|gemini-.*-pro/i, `${file} names no secondary model`);
    }
    const main = await readFile(resolve(HERE, "main.ts"), "utf8");
    assert.match(main, /createGeminiModelProviderFromEnv/);
    assert.doesNotMatch(main, /new .*Provider\(|ScriptedModelProvider/);
  });

  test("p02Authorizer denies a premature submit, allows an eligible one, then denies repeats", async () => {
    let lead: Record<string, string> = {};
    const email = createFakeEmailProvider();
    const authorizer = p02Authorizer({ readLead: async () => lead, email });
    const req = {
      executionId: "e1", ownerExecutionId: null, rootExecutionId: "e1",
      definition: { id: "d", version: 1 }, activationId: "a1", effectId: "f1",
      effectKind: "use_capability" as const, requestedAt: "t",
      proposal: { kind: "use_capability" as const, capability: "lead", operation: "submit", input: {} },
    };
    assert.equal((await authorizer.authorize(req as never)).decision, "deny");
    lead = { firstName: "A", phone: "555-0100" };
    assert.equal((await authorizer.authorize(req as never)).decision, "allow");
    await email.execute({ input: {}, idempotencyKey: "k" } as never, {} as never);
    assert.equal((await authorizer.authorize(req as never)).decision, "deny");
  });
});
