/**
 * The Agent controller: model selection becomes an ordinary Effect proposal, and nothing more.
 *
 * The path under test is the whole slice, end to end:
 *
 * ```text
 * catalog + ceiling + exposure request -> Active View -> projection -> the model
 *   -> the model names one -> resolved through THAT projection -> UseCapability
 *   -> Harness authorizes and dispatches -> result Event -> the next model step
 * ```
 *
 * What matters at each hop is what the controller does *not* do: it does not dispatch, does not
 * look a returned name up in the catalog, does not re-resolve the view before interpreting an
 * answer, and does not treat a response as a conclusion.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AgentControlState } from "@agent-sdk/core/execution";
import { effectRequestsIn, readAgentControlState } from "@agent-sdk/core/execution";
import {
  createAllowListAuthorizer,
  createNoInlineWaitBudget,
  createScriptedCapabilityExecutor,
  ScriptedModelProvider,
} from "@agent-sdk/core/reference";
import type { RecordingCapabilityExecutor } from "@agent-sdk/core/reference";
import { agentModelAccess, createAgentTestHarness, referenceAgentExecutor } from "@agent-sdk/core/testing";
import type { AgentTestHarnessBundle } from "@agent-sdk/core/testing";
import type { InlineWaitBudget } from "@agent-sdk/core/ports";
import { DOCS_SEARCH, scriptedAgentExecutor, testAgent, testCatalog, testModelResolver } from "./fixtures.ts";

interface Rig {
  readonly bundle: AgentTestHarnessBundle;
  readonly capabilities: RecordingCapabilityExecutor;
  readonly provider: ScriptedModelProvider;
}

/** One Agent that may search the corpus, wired over a scripted provider. */
function searchRig(options: { readonly inlineWait?: InlineWaitBudget } = {}): Rig {
  const provider = new ScriptedModelProvider({
    id: "test",
    steps: [
      { output: { capabilityCalls: [{ id: "call-a", capability: "docs_search", input: { query: "kernels" } }] } },
      { output: { text: "Three passages mention kernels." } },
    ],
  });
  const capabilities = createScriptedCapabilityExecutor({
    handlers: { "docs:search": () => ({ status: "success", observation: { hits: 3 } }) },
  });
  const bundle = createAgentTestHarness({
    catalog: testCatalog(),
    models: agentModelAccess(testModelResolver()),
    executor: referenceAgentExecutor([provider]),
    authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
    capabilities,
    ...(options.inlineWait ? { inlineWait: options.inlineWait } : {}),
  });
  return { bundle, capabilities: capabilities as RecordingCapabilityExecutor, provider };
}

async function runSearchAgent(rig: Rig, id: string) {
  const ref = await rig.bundle.definitions.save(testAgent({ id, operations: { refs: [DOCS_SEARCH] } }));
  const agent = await rig.bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
  await rig.bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "find kernels" });

  // Bounded drive loop: run, let any controller-local work settle, run again.
  for (let i = 0; i < 8; i++) {
    await rig.bundle.harness.runUntilIdle();
    await rig.bundle.harness.drainResumptions();
    const context = await rig.bundle.harness.inspect(agent.executionId);
    if (context && (context.lifecycle === "WAITING" || context.lifecycle === "COMPLETED" || context.lifecycle === "FAILED")) {
      // WAITING on an Event means the Agent responded and is waiting for what comes next.
      if (context.lifecycle !== "WAITING" || context.waitingFor?.kind === "event") break;
    }
  }
  return agent;
}

function stateOf(progress: { readonly progress: Record<string, unknown> }): AgentControlState {
  return readAgentControlState(progress.progress as never)!;
}

describe("the Agent controller proposes Effects and never performs them", () => {
  test("a model-selected binding becomes the expected typed UseCapability", async () => {
    const rig = searchRig();
    const agent = await runSearchAgent(rig, "selects");

    const requested = effectRequestsIn(await rig.bundle.harness.effectJournalOf(agent.executionId));
    assert.equal(requested.length, 1, "one selection, one Effect");
    const proposal = requested[0]!.proposal;
    assert.equal(proposal.kind, "use_capability");
    assert.ok(proposal.kind === "use_capability");
    assert.deepEqual(
      { capability: proposal.capability as string, operation: proposal.operation as string },
      { capability: "docs", operation: "search" },
      "the identity comes from the binding, not from the string the model returned",
    );
    assert.deepEqual(proposal.input, { query: "kernels" });

    // The controller reached no executor; the Harness dispatched it.
    assert.equal(rig.capabilities.callCount, 1);
    assert.equal(rig.capabilities.calls[0]!.request.capability, "docs");
  });

  test("the request correlation is stable, explicit, and derived from Agent coordinates", async () => {
    const rig = searchRig();
    const agent = await runSearchAgent(rig, "correlates");

    const requested = effectRequestsIn(await rig.bundle.harness.effectJournalOf(agent.executionId));
    assert.equal(requested[0]!.correlationId, "ag/step1/call1", "step and call index, both persisted progress");

    const events = (await rig.bundle.harness.inspect(agent.executionId))!;
    const state = stateOf(events.control);
    assert.equal(state.step, 2, "two model steps ran");
    assert.deepEqual(state.pending, [], "the requested operation settled and was consumed");
    assert.equal(
      state.messages.filter((message) => message.role === "capability").length,
      1,
      "and its result reached the information branch exactly once",
    );
  });

  test("a returned name the projection never exposed is a deterministic failure, not a lookup", async () => {
    const bundle = createAgentTestHarness({
      catalog: testCatalog(),
      models: agentModelAccess(testModelResolver()),
      // A real provider could not produce this: the provider boundary already refuses an
      // unrequested name. Scripting it puts the case in front of the controller directly.
      executor: scriptedAgentExecutor([
        { kind: "call_operations", calls: [{ callId: "c1", alias: "mail_send", input: { to: "x", body: "y" } }] },
      ]),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
    });
    const ref = await bundle.definitions.save(testAgent({ id: "unknown-name", operations: { refs: [DOCS_SEARCH] } }));
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "go" });
    await bundle.harness.runUntilIdle();

    const context = await bundle.harness.inspect(agent.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "agent_operation_not_projected");
    assert.match(context!.failure!.message, /vocabulary, never an identity to look up/);
    assert.deepEqual(await bundle.harness.effectJournalOf(agent.executionId), [], "nothing was proposed");
  });

  test("a response is communication; completion is a separate, declared contract", async () => {
    const rig = searchRig();
    const agent = await runSearchAgent(rig, "responds");

    const context = await rig.bundle.harness.inspect(agent.executionId);
    assert.equal(context?.lifecycle, "WAITING", "the Agent answered and stayed alive");
    assert.equal(context?.waitingFor?.kind, "event");
    assert.equal(context?.terminalResult, null, "a response is not a terminal result");

    const emissions = await rig.bundle.harness.emissionsOf(agent.executionId);
    assert.deepEqual(
      emissions.map((emission) => emission.body),
      [{ kind: "text", text: "Three passages mention kernels." }],
      "the response reached the outside as nonterminal output",
    );
    assert.equal(stateOf(context!.control).responses, 1);
  });

  test("an Agent whose definition says a response is its answer completes on one", async () => {
    const provider = new ScriptedModelProvider({ id: "test", steps: [{ output: { text: "done" } }] });
    const bundle = createAgentTestHarness({
      catalog: testCatalog(),
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
    });
    const ref = await bundle.definitions.save(
      testAgent({
        id: "completes",
        completion: "complete_on_response",
        terminalResult: { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } },
      }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "go" });
    await bundle.harness.runUntilIdle();

    const context = await bundle.harness.inspect(agent.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.equal(context?.terminalResult?.value, "done", "and the Harness validated it against the pinned schema");
  });

  test("bounded progression is enforced by the runtime, not by the model changing its mind", async () => {
    const provider = new ScriptedModelProvider({
      id: "test",
      steps: Array.from({ length: 4 }, () => ({
        output: { capabilityCalls: [{ capability: "docs_search", input: { query: "again" } }] },
      })),
    });
    const bundle = createAgentTestHarness({
      catalog: testCatalog(),
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
      capabilities: createScriptedCapabilityExecutor({
        handlers: { "docs:search": () => ({ status: "success", observation: { hits: 0 } }) },
      }),
    });
    const ref = await bundle.definitions.save(
      testAgent({ id: "bounded", operations: { refs: [DOCS_SEARCH] }, limits: { maxModelCalls: 2 } }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "loop" });
    await bundle.harness.runUntilIdle();

    const context = await bundle.harness.inspect(agent.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "agent_model_call_budget_exhausted");
    assert.equal(provider.invocationCount, 2, "the budget stopped it at exactly its permitted calls");
  });

  test("inline and yielded model steps are semantically equivalent", async () => {
    const fast = searchRig();
    const fastAgent = await runSearchAgent(fast, "fast");
    const slow = searchRig({ inlineWait: createNoInlineWaitBudget() });
    const slowAgent = await runSearchAgent(slow, "slow");

    const fastContext = (await fast.bundle.harness.inspect(fastAgent.executionId))!;
    const slowContext = (await slow.bundle.harness.inspect(slowAgent.executionId))!;

    assert.equal(fastContext.lifecycle, slowContext.lifecycle);
    const fastState = stateOf(fastContext.control);
    const slowState = stateOf(slowContext.control);
    assert.deepEqual(slowState.messages, fastState.messages, "the same conversation resulted");
    assert.equal(slowState.step, fastState.step);
    assert.equal(slowState.responses, fastState.responses);

    assert.deepEqual(
      (await slow.bundle.harness.emissionsOf(slowAgent.executionId)).map((emission) => emission.body),
      (await fast.bundle.harness.emissionsOf(fastAgent.executionId)).map((emission) => emission.body),
    );
    const projectionOf = (rig: Rig) => rig.bundle.trace.projections();
    assert.deepEqual(projectionOf(slow), projectionOf(fast), "and each step saw the same projection identity");

    // Only the Activation count and whether WAITING was entered may differ.
    const waited = (await slow.bundle.harness.transitionsOf(slowAgent.executionId)).filter(
      (transition) => transition.to === "WAITING" && transition.reason.includes("waiting"),
    );
    assert.ok(waited.length > 0, "the slow path genuinely yielded");
    assert.equal(slow.provider.invocationCount, fast.provider.invocationCount, "and did not call the provider more often");
  });
});
