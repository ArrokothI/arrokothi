/**
 * The inverse of the reauthorization test, and the more important half.
 *
 * `harness-reauthorization.test.ts` proves that everything the Agent layers say yes to can still be
 * refused by policy. This file proves the other direction: that nothing the Agent layers say can
 * make an operation *run* when the Execution's current effective authority does not contain it.
 *
 * ```text
 * effective authority does NOT contain X
 * a deliberately buggy Active View resolver exposes X anyway
 * the projection contains X
 * the model selects X
 * the controller proposes UseCapability(X)
 * the EffectAuthorizer is deliberately permissive
 *   ->  nothing is dispatched, and the Agent is told why
 * ```
 *
 * That is what makes the four layers a narrowing rather than a chain of trust. An exposure bug costs
 * an operation a denial; it cannot buy one a dispatch.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { EffectiveOperationAuthority, ExecutionId, OperationRef } from "@arrokothi/core/execution";
import { effectRequestsIn } from "@arrokothi/core/execution";
import type { ActiveOperationView, ActiveOperationViewResolver, EffectAuthorizer } from "@arrokothi/core/ports";
import {
  createDeferredModelProvider,
  createNoInlineWaitBudget,
  createScriptedCapabilityExecutor,
  InMemoryRuntimeStore,
  ScriptedModelProvider,
} from "@arrokothi/core/reference";
import type { RecordingCapabilityExecutor } from "@arrokothi/core/reference";
import { agentModelAccess, createAgentTestHarness, referenceAgentExecutor } from "@arrokothi/core/testing";
import { DOCS_SEARCH, MAIL_SEND, SEND_INPUT, testAgent, testCatalog, testModelResolver } from "./fixtures.ts";

/** Policy that permits everything, so nothing below can be credited to policy doing the work. */
const permissive: EffectAuthorizer = {
  authorize: () => ({ decision: "allow", grantId: "grant_permissive" }),
};

/**
 * An Active View resolver that exposes an operation the ceiling does not contain.
 *
 * Not a plausible implementation - a deliberately broken one, which is the point. Custom exposure
 * resolvers are a supported extension point, so "a resolver got this wrong" is a case the runtime
 * has to survive rather than a case that cannot happen.
 */
function buggyResolver(entries: readonly OperationRef[]): ActiveOperationViewResolver {
  return {
    async resolve(): Promise<ActiveOperationView> {
      return {
        viewId: "aov_buggy",
        authorityId: "au_pretend",
        authorityVersion: 99,
        entries: entries.map((ref) => ({
          capability: ref.capability,
          operation: ref.operation,
          title: "Send mail",
          description: "Send an email to one recipient.",
          input: SEND_INPUT,
          consequential: true,
          groups: [],
        })),
        omitted: [],
      };
    },
  };
}

function mailSelectingProvider(): ScriptedModelProvider {
  return new ScriptedModelProvider({
    id: "test",
    steps: [
      { output: { capabilityCalls: [{ id: "c1", capability: "mail_send", input: { to: "rex", body: "hi" } }] } },
      { output: { text: "I reported what happened." } },
    ],
  });
}

async function settle(bundle: ReturnType<typeof createAgentTestHarness>, executionId: ExecutionId): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await bundle.harness.runUntilIdle();
    await bundle.harness.drainResumptions();
    const context = await bundle.harness.inspect(executionId);
    if (context && context.lifecycle !== "READY") break;
  }
}

describe("effective operation authority is a dispatch ceiling, not just an exposure filter", () => {
  test("a buggy Active View plus a permissive authorizer still dispatches nothing", async () => {
    const capabilities = createScriptedCapabilityExecutor({
      handlers: { "mail:send": () => ({ status: "success", observation: { messageId: "m-1" } }) },
    }) as RecordingCapabilityExecutor;

    const bundle = createAgentTestHarness({
      catalog: testCatalog(),
      // Exposure comes from the broken resolver rather than from the ceiling.
      views: buggyResolver([MAIL_SEND]),
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([mailSelectingProvider()]),
      authorizer: permissive,
      capabilities,
    });
    const ref = await bundle.definitions.save(testAgent({ id: "widened", operations: { refs: [MAIL_SEND] } }));
    // The ceiling contains docs.search and nothing else. mail.send was never granted.
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });

    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "email rex" });
    await settle(bundle, agent.executionId);

    // Every Agent-side layer did say yes: the view exposed it, the projection carried it, the model
    // named it, and the controller proposed it.
    assert.deepEqual(
      bundle.trace.modelInvocations[0]?.callables.map((callable) => callable.alias),
      ["mail_send"],
      "the broken resolver really did put it in front of the model",
    );
    assert.equal(effectRequestsIn(await bundle.harness.effectJournalOf(agent.executionId)).length, 1);

    // And nothing happened.
    assert.equal(capabilities.callCount, 0, "the capability implementation was never reached");
    const journal = await bundle.harness.effectJournalOf(agent.executionId);
    assert.deepEqual(
      journal.map((entry) => entry.phase),
      ["requested", "denied"],
      "there is no dispatch_started phase, so nothing was even attempted",
    );
    assert.equal(journal[1]!.detail["code"], "operation_outside_effective_authority");

    // The denial reaches the Agent as an ordinary observation, not as an Execution failure.
    const context = await bundle.harness.inspect(agent.executionId);
    assert.notEqual(context?.lifecycle, "FAILED");
    const observed = JSON.parse(JSON.stringify(context!.control.progress)) as {
      messages: { role: string; content: string }[];
    };
    assert.match(
      observed.messages.filter((message) => message.role === "capability")[0]!.content,
      /operation_outside_effective_authority/,
      "the Agent was told exactly why, which is what lets it recover rather than retry",
    );
  });

  test("the authorizer is not even consulted for an operation outside the ceiling", async () => {
    // Ordering matters as much as the outcome. Policy that is asked about an operation the ceiling
    // excludes is policy that could accidentally allow it; the ceiling is checked first so that
    // question is never posed.
    let asked = 0;
    const counting: EffectAuthorizer = {
      authorize() {
        asked += 1;
        return { decision: "allow", grantId: "grant_counting" };
      },
    };
    const bundle = createAgentTestHarness({
      catalog: testCatalog(),
      views: buggyResolver([MAIL_SEND]),
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([mailSelectingProvider()]),
      authorizer: counting,
      capabilities: createScriptedCapabilityExecutor({ handlers: { "mail:send": () => ({ status: "success", observation: {} }) } }),
    });
    const ref = await bundle.definitions.save(testAgent({ id: "unasked", operations: { refs: [MAIL_SEND] } }));
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "email rex" });
    await settle(bundle, agent.executionId);

    assert.equal(asked, 0, "the ceiling refused before policy was consulted");
  });

  test("an Execution created with no ceiling at all can dispatch nothing", async () => {
    // "Nobody granted anything" and "everything is granted" must not look the same at the gateway
    // either, not only at the exposure layer.
    const capabilities = createScriptedCapabilityExecutor({
      handlers: { "mail:send": () => ({ status: "success", observation: {} }) },
    }) as RecordingCapabilityExecutor;
    const bundle = createAgentTestHarness({
      catalog: testCatalog(),
      views: buggyResolver([MAIL_SEND]),
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([mailSelectingProvider()]),
      authorizer: permissive,
      capabilities,
    });
    const ref = await bundle.definitions.save(testAgent({ id: "ungranted", operations: { refs: [MAIL_SEND] } }));
    const agent = await bundle.createAgent({ definition: ref });

    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "email rex" });
    await settle(bundle, agent.executionId);

    assert.equal(capabilities.callCount, 0);
    const journal = await bundle.harness.effectJournalOf(agent.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "denied"]);
    assert.equal(journal[1]!.detail["code"], "no_effective_operation_authority");
  });

  test("a ceiling narrowed after the projection was built denies the dispatch it authorized", async () => {
    /**
     * A projection is a record of what the model was shown, never a credential.
     *
     * The narrowing has to land *between* the projection being built and the Effect being
     * dispatched, so the model call is made slow: one Activation resolves the view, builds the
     * projection, and suspends on a ControllerResumption; the ceiling changes; the resumed
     * Activation interprets the answer against that same stored projection and proposes the Effect.
     *
     * v0.4 has no production API that narrows a stored ceiling - delegation is the composition
     * slice - so the narrowing is modelled at the store port the runtime reads, which is where a
     * real narrowing would land. Nothing about the Agent path is altered to make this work: the
     * gateway simply reads the ceiling that is current at dispatch.
     */
    class NarrowingStore extends InMemoryRuntimeStore {
      narrowed = false;
      override async readOperationAuthority(executionId: ExecutionId): Promise<EffectiveOperationAuthority | undefined> {
        const stored = await super.readOperationAuthority(executionId);
        if (!stored || !this.narrowed) return stored;
        return { ...stored, version: stored.version + 1, operations: [] };
      }
    }

    const store = new NarrowingStore();
    const provider = createDeferredModelProvider("test");
    const capabilities = createScriptedCapabilityExecutor({
      handlers: { "mail:send": () => ({ status: "success", observation: { messageId: "m-1" } }) },
    }) as RecordingCapabilityExecutor;

    const bundle = createAgentTestHarness({
      store,
      catalog: testCatalog(),
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      authorizer: permissive,
      capabilities,
      inlineWait: createNoInlineWaitBudget(),
    });
    const ref = await bundle.definitions.save(testAgent({ id: "narrowed", operations: { refs: [MAIL_SEND] } }));
    // Granted at creation, so the real resolver exposes it and the projection is entirely legitimate.
    const agent = await bundle.createAgent({ definition: ref, authority: [MAIL_SEND] });

    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "email rex" });
    await bundle.harness.runUntilIdle();

    const suspended = await bundle.harness.inspect(agent.executionId);
    assert.equal(suspended?.lifecycle, "WAITING");
    assert.equal(suspended?.waitingFor?.kind, "controller_resumption", "the projection exists and the call is outstanding");

    // The world changes while the model is thinking.
    store.narrowed = true;

    provider.settle({ capabilityCalls: [{ id: "c1", capability: "mail_send", input: { to: "rex", body: "hi" } }] });
    await bundle.harness.drainResumptions();
    // One Activation: it interprets the stored answer against the stored projection, proposes the
    // Effect, and the gateway decides. The Agent's next step then suspends on the provider again,
    // which nothing here settles - the question was already answered by the journal below.
    await bundle.harness.runUntilIdle();

    assert.deepEqual(
      bundle.trace.modelInvocations[0]?.callables.map((callable) => callable.alias),
      ["mail_send"],
      "the model really was shown it, under the ceiling that was current then",
    );
    assert.equal(capabilities.callCount, 0, "and the ceiling current at dispatch is the one that decides");
    const journal = await bundle.harness.effectJournalOf(agent.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "denied"]);
    assert.equal(journal[1]!.detail["code"], "operation_outside_effective_authority");
  });
});
