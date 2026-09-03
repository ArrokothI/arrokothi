/**
 * The test the whole slice exists to make pass.
 *
 * ```text
 * authority allows X  ->  the Active View contains X  ->  the projection exposes X
 *   ->  the model selects X  ->  the controller proposes UseCapability(X)
 *   ->  the Harness authorizes the CONCRETE request, from current policy
 *   ->  allowed: it runs        denied: it does not, and the Agent is told
 * ```
 *
 * If any Agent-layer membership could make the Harness skip that last check, the architecture would
 * be wrong: exposure would have become permission. So the interesting case is the one where every
 * Agent-side layer says yes and policy says no, and nothing happens.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { effectRequestsIn, formatModelActionTarget } from "@arrokothi/core/execution";
import type { EffectAuthorizer } from "@arrokothi/core/ports";
import {
  createAllowListAuthorizer,
  createScriptedCapabilityExecutor,
  ScriptedModelProvider,
} from "@arrokothi/core/reference";
import type { RecordingCapabilityExecutor } from "@arrokothi/core/reference";
import { agentModelAccess, createAgentTestHarness, referenceAgentExecutor } from "@arrokothi/core/testing";
import { MAIL_SEND, testAgent, testCatalog, testModelResolver } from "./fixtures.ts";

/**
 * One Agent whose ceiling, view, and projection all contain `mail.send`, and whose model selects it.
 *
 * Only the dispatch-time policy differs between the two runs below.
 */
async function runSelectingAgent(authorizer: EffectAuthorizer, id: string) {
  const provider = new ScriptedModelProvider({
    id: "test",
    steps: [
      { output: { capabilityCalls: [{ id: "c1", capability: "mail_send", input: { to: "rex", body: "hello" } }] } },
      { output: { text: "I have reported what happened." } },
    ],
  });
  const capabilities = createScriptedCapabilityExecutor({
    handlers: { "mail:send": () => ({ status: "success", observation: { messageId: "m-1" } }) },
  }) as RecordingCapabilityExecutor;

  const bundle = createAgentTestHarness({
    catalog: testCatalog(),
    models: agentModelAccess(testModelResolver()),
    executor: referenceAgentExecutor([provider]),
    authorizer,
    capabilities,
  });
  const ref = await bundle.definitions.save(testAgent({ id, operations: { refs: [MAIL_SEND] } }));
  const agent = await bundle.createAgent({ definition: ref, authority: [MAIL_SEND] });

  await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "email rex" });
  for (let i = 0; i < 6; i++) {
    await bundle.harness.runUntilIdle();
    await bundle.harness.drainResumptions();
    const context = await bundle.harness.inspect(agent.executionId);
    if (context && context.lifecycle !== "READY") break;
  }
  return { bundle, agent, capabilities, provider };
}

describe("the Harness authorizes the concrete Effect, whatever the Agent layers said", () => {
  test("an exposed, selected, proposed operation can still be denied at dispatch", async () => {
    // Policy that permits nothing. Authority, exposure, and projection are all unchanged.
    const deny: EffectAuthorizer = {
      authorize() {
        return { decision: "deny", code: "recipient_not_permitted", message: "this Execution may not mail that recipient" };
      },
    };
    const { bundle, agent, capabilities } = await runSelectingAgent(deny, "denied");

    // The Agent layers did their job: the operation was exposed and proposed.
    assert.deepEqual(bundle.trace.proposals.map((record) => formatModelActionTarget(record.target)), ["mail/send"]);
    const requested = effectRequestsIn(await bundle.harness.effectJournalOf(agent.executionId));
    assert.equal(requested.length, 1, "the controller proposed it");

    // And then nothing happened.
    assert.equal(capabilities.callCount, 0, "the capability implementation was never reached");
    const journal = await bundle.harness.effectJournalOf(agent.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "denied"], "no dispatch phase exists");

    // The denial reaches the Agent through the ordinary Effect-result vocabulary.
    const context = await bundle.harness.inspect(agent.executionId);
    assert.notEqual(context?.lifecycle, "FAILED", "a denied operation is an observation, not an Execution failure");
    const state = JSON.parse(JSON.stringify(context!.control.progress)) as { messages: { role: string; content: string }[] };
    const observed = state.messages.filter((message) => message.role === "capability");
    assert.equal(observed.length, 1);
    assert.match(observed[0]!.content, /recipient_not_permitted/, "the Agent was told exactly what policy said");
  });

  test("the same selection executes when policy allows it", async () => {
    const allow = createAllowListAuthorizer({ grants: [{ capability: "mail", operations: ["send"] }] });
    const { bundle, agent, capabilities } = await runSelectingAgent(allow, "allowed");

    assert.equal(capabilities.callCount, 1, "the ordinary gateway carried it out");
    assert.equal(capabilities.calls[0]!.request.capability, "mail");
    assert.equal(capabilities.calls[0]!.request.operation, "send");
    assert.deepEqual(capabilities.calls[0]!.request.input, { to: "rex", body: "hello" });
    assert.equal(
      capabilities.calls[0]!.request.authorization.consequential,
      true,
      "and the catalog's consequentiality baseline still governed how it was handled",
    );

    const journal = await bundle.harness.effectJournalOf(agent.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "authorized", "dispatch_started", "completed"]);
  });

  test("an Agent with no policy configured gets nothing dispatched at all", async () => {
    // The fail-closed default. "Nobody wired policy" must not look like "policy allowed it", even
    // when the Agent's own ceiling, view, and projection are perfectly in order.
    const provider = new ScriptedModelProvider({
      id: "test",
      steps: [
        { output: { capabilityCalls: [{ capability: "mail_send", input: { to: "x", body: "y" } }] } },
        { output: { text: "reported" } },
      ],
    });
    const capabilities = createScriptedCapabilityExecutor({
      handlers: { "mail:send": () => ({ status: "success", observation: {} }) },
    }) as RecordingCapabilityExecutor;
    const bundle = createAgentTestHarness({
      catalog: testCatalog(),
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      capabilities,
    });
    const ref = await bundle.definitions.save(testAgent({ id: "unwired", operations: { refs: [MAIL_SEND] } }));
    const agent = await bundle.createAgent({ definition: ref, authority: [MAIL_SEND] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "mail" });
    await bundle.harness.runUntilIdle();

    assert.equal(capabilities.callCount, 0);
    const journal = await bundle.harness.effectJournalOf(agent.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "denied"]);
    assert.equal(journal[1]!.detail["code"], "no_authorizer_configured");
  });

  test("the Agent controller has no route to a capability implementation", async () => {
    // Behavioural counterpart to the import-graph assertion: with policy denying everything, the
    // implementation is registered and reachable by the Harness, and the Agent still cannot cause a
    // single call. There is no path from a projection binding to an executor.
    const { capabilities } = await runSelectingAgent(
      { authorize: () => ({ decision: "deny", code: "no", message: "no" }) },
      "no-route",
    );
    assert.equal(capabilities.callCount, 0);
  });
});
