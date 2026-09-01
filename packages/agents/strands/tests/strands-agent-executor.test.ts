/**
 * The Strands bridge, tested for the one property that matters: it cannot dispatch.
 *
 * Strands has a native tool loop. The whole point of this executor is that the loop is halted
 * before it ever runs a callback, so a model's tool use becomes an ArrokothI operation call that
 * the Harness authorizes - and the framework only ever sees the result the Harness established.
 *
 * ```text
 * projection -> FunctionTool specs -> model tool use
 *   -> BeforeToolCall interrupt (before native execution)
 *   -> semantic operation call + JSON snapshot
 *   -> [ ArrokothI: UseCapability -> Harness -> result Event ]
 *   -> resume the snapshot with that observation
 *   -> observation-only callback returns it to the model
 * ```
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AgentExecutorRequest,
  ModelOperationBinding,
  ModelOperationProjection,
  ObjectSchema,
  ResolvedModel,
} from "@agent-sdk/core/ports";
import {
  ModelProviderRegistry,
  portableModelFeatures,
  ScriptedModelProvider,
  StaticModelResolver,
} from "@agent-sdk/core/reference";
import { defineAgent, effectRequestsIn } from "@agent-sdk/core/execution";
import { createAllowListAuthorizer, createCapabilityCatalog, createScriptedCapabilityExecutor } from "@agent-sdk/core/reference";
import type { RecordingCapabilityExecutor } from "@agent-sdk/core/reference";
import { agentModelAccess, createAgentTestHarness } from "@agent-sdk/core/testing";
import { createStrandsAgentExecutor } from "../src/index.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const SEARCH_INPUT: ObjectSchema = {
  kind: "object",
  fields: { query: { required: true, schema: { kind: "string" } } },
};

const PROJECTION: ModelOperationProjection = {
  projectionId: "ag/step1/projection",
  viewId: "aov_1",
  viewRevision: 1,
  bindings: [
    {
      bindingId: "ag/step1/projection/b1",
      alias: "docs_search",
      capability: "docs",
      operation: "search",
      description: "Search the corpus.",
      input: SEARCH_INPUT,
    },
    {
      bindingId: "ag/step1/projection/b2",
      alias: "mail_send",
      capability: "mail",
      operation: "send",
      description: "Send mail.",
      input: { kind: "object", fields: { to: { required: true, schema: { kind: "string" } } } },
    },
  ],
};

async function resolvedModel(): Promise<ResolvedModel> {
  const resolver = new StaticModelResolver({
    primary: { provider: "test", model: "model-a", portableFeatures: portableModelFeatures({ capabilityCalls: true }) },
  });
  return resolver.resolve({ logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } });
}

function requestFor(
  model: ResolvedModel,
  overrides: Partial<AgentExecutorRequest> = {},
): AgentExecutorRequest {
  return {
    model,
    requirements: { text: true, capabilityCalls: "required" },
    information: { system: "Search before answering.", messages: [{ role: "user", content: "find kernels" }] },
    projection: PROJECTION,
    capabilities: PROJECTION.bindings.map((binding: ModelOperationBinding) => ({
      name: binding.alias,
      description: binding.description,
      input: binding.input,
    })),
    observations: [],
    step: 1,
    limits: { maxOperationCallsPerStep: 4 },
    continuation: null,
    ...overrides,
  };
}

describe("the Strands AgentExecutor satisfies the same semantic contract", () => {
  test("one model tool use becomes a semantic operation call, before any native execution", async () => {
    const provider = new ScriptedModelProvider({
      id: "test",
      steps: [{ output: { capabilityCalls: [{ id: "tool-1", capability: "docs_search", input: { query: "kernels" } }] } }],
    });
    const executor = createStrandsAgentExecutor({ providers: new ModelProviderRegistry([provider]) });
    const outcome = await executor.step(requestFor(await resolvedModel()));

    assert.equal(outcome.kind, "call_operations");
    assert.ok(outcome.kind === "call_operations");
    assert.equal(outcome.calls.length, 1);
    assert.equal(outcome.calls[0]!.alias, "docs_search", "the name the projection gave the model");
    assert.deepEqual(outcome.calls[0]!.input, { query: "kernels" });
    assert.equal(
      JSON.stringify(outcome.calls).includes('"capability"'),
      false,
      "the executor reports a name; resolving it to an operation identity is the controller's job",
    );

    // Exactly one provider round trip: the loop stopped rather than continuing past the tool use.
    assert.equal(provider.invocationCount, 1);
  });

  test("the continuation is a JSON snapshot that survives a round trip", async () => {
    const provider = new ScriptedModelProvider({
      id: "test",
      steps: [{ output: { capabilityCalls: [{ id: "tool-1", capability: "docs_search", input: { query: "q" } }] } }],
    });
    const executor = createStrandsAgentExecutor({ providers: new ModelProviderRegistry([provider]) });
    const outcome = await executor.step(requestFor(await resolvedModel()));
    assert.ok(outcome.kind === "call_operations");

    const continuation = outcome.continuation;
    assert.ok(continuation, "a framework continuation was carried out");
    assert.deepEqual(
      JSON.parse(JSON.stringify(continuation)),
      continuation,
      "which is plain data, because it crosses an Activation inside Agent control state",
    );
    const carried = continuation as { pending: { interruptId: string; toolUseId: string }[] };
    assert.equal(carried.pending.length, 1);
    assert.match(carried.pending[0]!.interruptId, /^hook:beforeToolCall:tool-1:/, "the pause point is recorded");
    assert.equal(carried.pending[0]!.toolUseId, "tool-1");
  });

  test("resuming with an observation feeds the model, and never re-runs the operation", async () => {
    const provider = new ScriptedModelProvider({
      id: "test",
      steps: [
        { output: { capabilityCalls: [{ id: "tool-1", capability: "docs_search", input: { query: "kernels" } }] } },
        { output: { text: "Three passages mention kernels." } },
      ],
    });
    const executor = createStrandsAgentExecutor({ providers: new ModelProviderRegistry([provider]) });
    const model = await resolvedModel();

    const first = await executor.step(requestFor(model));
    assert.ok(first.kind === "call_operations");

    // The controller's job happens here: the Harness authorized and executed the operation, and the
    // observation comes back correlated by the exact tool-use id the framework emitted.
    const second = await executor.step(
      requestFor(model, {
        step: 2,
        continuation: first.continuation ?? null,
        observations: [
          {
            callId: "tool-1",
            alias: "docs_search",
            capability: "docs",
            operation: "search",
            outcome: "completed",
            observation: { hits: 3 },
          },
        ],
      }),
    );

    assert.equal(second.kind, "respond");
    assert.ok(second.kind === "respond");
    assert.equal(second.text, "Three passages mention kernels.");
    assert.equal(provider.invocationCount, 2, "resuming continued the loop; it did not restart it");

    // The observation reached the model as a tool result, which is the only way a tool result can
    // ever appear: nothing else in this package produces one.
    const secondRequest = provider.requests[1]!;
    const observed = secondRequest.messages.filter((message) => message.role === "capability");
    assert.equal(observed.length, 1);
    assert.match(observed[0]!.content, /"hits":\s*3/);
    assert.equal(observed[0]!.capabilityCallId, "tool-1", "correlated to the exact call it answers");
  });

  test("a denial is reported to the model as faithfully as a success", async () => {
    const provider = new ScriptedModelProvider({
      id: "test",
      steps: [
        { output: { capabilityCalls: [{ id: "tool-1", capability: "mail_send", input: { to: "rex" } }] } },
        { output: { text: "I could not send that." } },
      ],
    });
    const executor = createStrandsAgentExecutor({ providers: new ModelProviderRegistry([provider]) });
    const model = await resolvedModel();
    const first = await executor.step(requestFor(model));
    assert.ok(first.kind === "call_operations");

    const second = await executor.step(
      requestFor(model, {
        step: 2,
        continuation: first.continuation ?? null,
        observations: [
          {
            callId: "tool-1",
            alias: "mail_send",
            capability: "mail",
            operation: "send",
            outcome: "denied",
            error: { code: "recipient_not_permitted", message: "not allowed" },
          },
        ],
      }),
    );

    assert.ok(second.kind === "respond");
    const observed = provider.requests[1]!.messages.filter((message) => message.role === "capability");
    assert.match(observed[0]!.content, /recipient_not_permitted/, "the model was told what actually happened");
  });

  test("several tool uses in one turn are captured together", async () => {
    const provider = new ScriptedModelProvider({
      id: "test",
      steps: [
        {
          output: {
            capabilityCalls: [
              { id: "tool-1", capability: "docs_search", input: { query: "a" } },
              { id: "tool-2", capability: "mail_send", input: { to: "rex" } },
            ],
          },
        },
      ],
    });
    const executor = createStrandsAgentExecutor({ providers: new ModelProviderRegistry([provider]) });
    const outcome = await executor.step(requestFor(await resolvedModel()));

    assert.ok(outcome.kind === "call_operations");
    assert.deepEqual(
      [...outcome.calls].map((call) => call.alias).sort(),
      ["docs_search", "mail_send"],
      "both were captured before either could execute natively",
    );
    assert.deepEqual([...outcome.calls].map((call) => call.callId).sort(), ["tool-1", "tool-2"]);
  });

  test("cancellation propagates where the framework supports it", async () => {
    const provider = new ScriptedModelProvider({ id: "test", steps: [{ output: { text: "unreached" } }] });
    const controller = new AbortController();
    controller.abort();
    const executor = createStrandsAgentExecutor({
      providers: new ModelProviderRegistry([provider]),
      cancelSignal: controller.signal,
    });
    const outcome = await executor.step(requestFor(await resolvedModel()));
    assert.equal(outcome.kind, "fail");
    assert.ok(outcome.kind === "fail");
    assert.match(outcome.code, /cancelled|failed/);
  });

  test("no callback in this package can reach the gateway, a dispatcher, or a settlement path", async () => {
    const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g;
    const imported: string[] = [];

    for (const file of ["agent-executor.ts", "model.ts"]) {
      const source = await readFile(resolve(HERE, "../src", file), "utf8");
      for (const forbidden of [
        "CapabilityExecutor",
        "CapabilityGateway",
        "settleEffect",
        "EffectAuthorizer",
        "useCapability",
        "EffectProposal",
        "EffectRequest",
        "RuntimeStore",
        "requestCapability",
        "new Harness",
      ]) {
        assert.equal(source.includes(forbidden), false, `${file} mentions ${forbidden}`);
      }
      // And no vendor model is constructed: model resolution is ArrokothI's, always.
      for (const vendor of ["GoogleModel", "@google/genai", "AnthropicModel", "OpenAIModel", "BedrockModel"]) {
        assert.equal(source.includes(vendor), false, `${file} constructs ${vendor}`);
      }
      for (const match of source.matchAll(IMPORT_SPECIFIER)) imported.push(match[1]!);
    }

    // The surface it is built on, stated exactly. `/ports` is the kernel contract; the one thing it
    // takes from `/execution` is the portable schema projection, which is presentation and grants
    // nothing. Anything else from core would be a route into semantics this package must not have.
    assert.deepEqual(
      [...new Set(imported)].sort(),
      ["./model.ts", "@agent-sdk/core/execution", "@agent-sdk/core/ports", "@strands-agents/sdk"],
    );
    const executorSource = await readFile(resolve(HERE, "../src/agent-executor.ts"), "utf8");
    const fromExecution = /import\s*\{([^}]*)\}\s*from\s*"@agent-sdk\/core\/execution"/.exec(executorSource);
    assert.deepEqual(fromExecution?.[1]?.split(",").map((name) => name.trim()), ["toJsonSchema"]);
  });

  test("the model bridge builds its specs from the projection, not from the framework registry", async () => {
    const provider = new ScriptedModelProvider({ id: "test", steps: [{ output: { text: "ok" } }] });
    const executor = createStrandsAgentExecutor({ providers: new ModelProviderRegistry([provider]) });
    await executor.step(requestFor(await resolvedModel()));

    const request = provider.requests[0]!;
    assert.deepEqual(
      request.capabilities?.map((spec) => spec.name),
      ["docs_search", "mail_send"],
      "exactly the projection's bindings reached the provider",
    );
    assert.equal(request.system, "Search before answering.", "and the information branch supplied the system prompt");
  });

  test("driven by the real AgentController, no operation reaches an executor without the Harness", async () => {
    // The whole path, with the framework in the middle of it: the model selects, the framework is
    // interrupted, the controller resolves the binding and proposes, the Harness authorizes and
    // dispatches, and the observation is fed back into the resumed framework loop.
    const provider = new ScriptedModelProvider({
      id: "test",
      steps: [
        { output: { capabilityCalls: [{ id: "tool-1", capability: "docs_search", input: { query: "kernels" } }] } },
        { output: { text: "Three passages mention kernels." } },
      ],
    });
    const capabilities = createScriptedCapabilityExecutor({
      handlers: { "docs:search": () => ({ status: "success", observation: { hits: 3 } }) },
    }) as RecordingCapabilityExecutor;

    const bundle = createAgentTestHarness({
      catalog: createCapabilityCatalog([
        {
          capability: "docs",
          operation: "search",
          consequential: false,
          title: "Search documents",
          description: "Search the corpus.",
          input: SEARCH_INPUT,
          groups: ["research"],
        },
      ]),
      models: agentModelAccess(
        new StaticModelResolver({
          primary: { provider: "test", model: "model-a", portableFeatures: portableModelFeatures({ capabilityCalls: true }) },
        }),
      ),
      executor: createStrandsAgentExecutor({ providers: new ModelProviderRegistry([provider]) }),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
      capabilities,
    });

    const ref = await bundle.definitions.save(
      defineAgent({
        id: "strands-agent",
        spec: {
          model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } },
          instructions: "Search before answering.",
          operations: { refs: [{ capability: "docs", operation: "search" }] },
        },
      }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [{ capability: "docs", operation: "search" }] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "find kernels" });

    for (let i = 0; i < 8; i++) {
      await bundle.harness.runUntilIdle();
      await bundle.harness.drainResumptions();
      const context = await bundle.harness.inspect(agent.executionId);
      if (context?.lifecycle === "WAITING" && context.waitingFor?.kind === "event") break;
      if (context?.lifecycle === "FAILED" || context?.lifecycle === "COMPLETED") break;
    }

    const context = await bundle.harness.inspect(agent.executionId);
    assert.equal(context?.lifecycle, "WAITING", "the Agent answered and stayed alive");

    // Exactly one operation, and it went through the gateway rather than the framework.
    const requested = effectRequestsIn(await bundle.harness.effectJournalOf(agent.executionId));
    assert.equal(requested.length, 1);
    const proposal = requested[0]!.proposal;
    assert.ok(proposal.kind === "use_capability");
    assert.deepEqual(
      { capability: proposal.capability as string, operation: proposal.operation as string },
      { capability: "docs", operation: "search" },
      "the framework's tool name was resolved through ArrokothI's own projection",
    );
    assert.equal(capabilities.callCount, 1, "and the implementation ran once, dispatched by the Harness");
    assert.equal(capabilities.calls[0]!.request.correlationId, "ag/step1/call1");

    assert.deepEqual(
      (await bundle.harness.emissionsOf(agent.executionId)).map((emission) => emission.body),
      [{ kind: "text", text: "Three passages mention kernels." }],
    );
  });
});
