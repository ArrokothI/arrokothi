/**
 * A slow Agent model step yields its Activation, and stays the same step.
 *
 * The distinction under test is the one the substrate established and the Agent path has to
 * inherit: a model call is *controller-local* work. It is not an Effect, it is not authorized, it
 * produces no Event, and it creates no PendingOperation - so when it outlives its Activation the
 * Execution waits on a resumption record and nothing else.
 *
 * The Agent-specific half is the projection. A resumed Activation must interpret the answer with
 * exactly the snapshot the model was shown, not with whatever the current Active View would produce
 * now - so the view is deliberately changed underneath a suspended call, and the answer still means
 * what it meant.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ActiveOperationView, AgentControlState } from "@agent-sdk/core/execution";
import { effectRequestsIn, readAgentControlState } from "@agent-sdk/core/execution";
import { ModelInvocationError } from "@agent-sdk/core/ports";
import type { ActiveOperationViewResolver, EffectAuthorizer } from "@agent-sdk/core/ports";
import {
  createAllowListAuthorizer,
  createDeferredModelProvider,
  createNoInlineWaitBudget,
  createScriptedCapabilityExecutor,
  ScriptedModelProvider,
} from "@agent-sdk/core/reference";
import type { DeferredModelProvider } from "@agent-sdk/core/reference";
import { agentModelAccess, createAgentTestHarness, referenceAgentExecutor } from "@agent-sdk/core/testing";
import type { AgentTestHarnessBundle } from "@agent-sdk/core/testing";
import { DOCS_SEARCH, SEARCH_INPUT, testAgent, testCatalog, testModelResolver } from "./fixtures.ts";

interface SlowRig {
  readonly bundle: AgentTestHarnessBundle;
  readonly provider: DeferredModelProvider;
  readonly authorizerCalls: { count: number };
}

/** An Agent whose model genuinely does not answer until the test says so. */
function slowRig(options: { readonly views?: ActiveOperationViewResolver } = {}): SlowRig {
  const provider = createDeferredModelProvider("test");
  const authorizerCalls = { count: 0 };
  const inner = createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] });
  const authorizer: EffectAuthorizer = {
    authorize(request) {
      authorizerCalls.count += 1;
      return inner.authorize(request);
    },
  };
  const bundle = createAgentTestHarness({
    catalog: testCatalog(),
    models: agentModelAccess(testModelResolver()),
    executor: referenceAgentExecutor([provider]),
    authorizer,
    capabilities: createScriptedCapabilityExecutor({
      handlers: { "docs:search": () => ({ status: "success", observation: { hits: 1 } }) },
    }),
    ...(options.views ? { views: options.views } : {}),
  });
  return { bundle, provider, authorizerCalls };
}

function stateOf(progress: Record<string, unknown>): AgentControlState {
  const read = readAgentControlState(progress as never);
  assert.equal(read.status, "read", "this build understands the progress it wrote");
  return (read as { readonly state: AgentControlState }).state;
}

describe("a slow Agent model step suspends without becoming an Event", () => {
  test("the Execution waits on the resumption, and nothing else about it moves", async () => {
    const rig = slowRig();
    const ref = await rig.bundle.definitions.save(testAgent({ id: "slow", operations: { refs: [DOCS_SEARCH] } }));
    const agent = await rig.bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await rig.bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "search" });
    await rig.bundle.harness.runUntilIdle();

    const waiting = await rig.bundle.harness.inspect(agent.executionId);
    assert.equal(waiting?.lifecycle, "WAITING", "the Activation yielded rather than holding its claim");
    assert.equal(waiting?.waitingFor?.kind, "controller_resumption", "and it waits on the resumption, not on an Event");

    const records = await rig.bundle.harness.controllerResumptionsOf(agent.executionId);
    assert.equal(records.length, 1);
    assert.equal(records[0]!.key, "ag/step1/model", "keyed by the persisted Agent step, never by an object identity");
    assert.equal(records[0]!.state, "pending");

    // None of the runtime-mediated machinery was touched, because none of it applies to local work.
    assert.deepEqual(await rig.bundle.harness.effectJournalOf(agent.executionId), [], "no Effect journal entry");
    assert.deepEqual(await rig.bundle.harness.pendingOperationsOf(agent.executionId), [], "no PendingOperation");
    assert.equal(rig.authorizerCalls.count, 0, "and policy was never consulted about a model call");
    assert.deepEqual(
      await rig.bundle.store.peekMailbox(waiting!.mailbox.mailboxId),
      [],
      "and no model-result Event was appended",
    );

    // The step counter has not advanced: this invocation has not been interpreted yet.
    const state = stateOf(waiting!.control.progress);
    assert.equal(state.step, 0);
    assert.equal(state.invocation?.step, 1, "but the invocation it is waiting on is written down");
  });

  test("the scheduler claim is released, so another Execution runs while the first is suspended", async () => {
    const rig = slowRig();
    const slowRef = await rig.bundle.definitions.save(testAgent({ id: "slow-one", operations: { refs: [DOCS_SEARCH] } }));
    const first = await rig.bundle.createAgent({ definition: slowRef, authority: [DOCS_SEARCH] });
    await rig.bundle.harness.deliverExternalInput({ destination: first.executionId, label: "ask", payload: "one" });
    await rig.bundle.harness.runUntilIdle();
    assert.equal((await rig.bundle.harness.inspect(first.executionId))?.lifecycle, "WAITING");

    const second = await rig.bundle.createAgent({ definition: slowRef, authority: [DOCS_SEARCH] });
    await rig.bundle.harness.deliverExternalInput({ destination: second.executionId, label: "ask", payload: "two" });
    const records = await rig.bundle.harness.runUntilIdle();

    assert.ok(
      records.some((record) => record.executionId === second.executionId),
      "the second Execution was activated while the first was still waiting",
    );
    assert.equal((await rig.bundle.harness.inspect(first.executionId))?.lifecycle, "WAITING", "and the first did not move");
    assert.equal(rig.provider.invocationCount, 2, "each Execution issued its own call, once");
  });

  test("an Event arriving during suspension is queued and does not change the in-flight invocation", async () => {
    const rig = slowRig();
    const ref = await rig.bundle.definitions.save(testAgent({ id: "queued", operations: { refs: [DOCS_SEARCH] } }));
    const agent = await rig.bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await rig.bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "first" });
    await rig.bundle.harness.runUntilIdle();

    const suspended = (await rig.bundle.harness.inspect(agent.executionId))!;
    const frozen = stateOf(suspended.control.progress).invocation!;

    await rig.bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "second" });
    const still = (await rig.bundle.harness.inspect(agent.executionId))!;
    assert.equal(still.lifecycle, "WAITING", "the Event did not wake an Execution suspended on local work");
    assert.deepEqual(
      stateOf(still.control.progress).invocation,
      frozen,
      "and what the in-flight invocation was shown is unchanged",
    );

    // When it resumes, the answer is interpreted first, and the queued input is seen afterwards.
    rig.provider.settle({ text: "done with the first question" });
    await rig.bundle.harness.drainResumptions();
    await rig.bundle.harness.runUntilIdle();

    const resumed = stateOf((await rig.bundle.harness.inspect(agent.executionId))!.control.progress);
    assert.deepEqual(
      resumed.messages.map((message) => `${message.role}:${message.content}`),
      ["user:first", "assistant:done with the first question", "user:second"],
      "the queued input influences a later step, never the one already issued",
    );
  });

  test("resuming does not re-dispatch the provider call", async () => {
    const rig = slowRig();
    const ref = await rig.bundle.definitions.save(testAgent({ id: "once", operations: { refs: [DOCS_SEARCH] } }));
    const agent = await rig.bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await rig.bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "search" });
    await rig.bundle.harness.runUntilIdle();
    assert.equal(rig.provider.invocationCount, 1);

    rig.provider.settle({ text: "answer" });
    await rig.bundle.harness.drainResumptions();
    await rig.bundle.harness.runUntilIdle();

    assert.equal(rig.provider.invocationCount, 1, "the resumed Activation recovered the stored outcome by key");
    const context = await rig.bundle.harness.inspect(agent.executionId);
    assert.equal(stateOf(context!.control.progress).step, 1);
    assert.equal((await rig.bundle.harness.controllerResumptionsOf(agent.executionId))[0]!.state, "settled");
  });

  test("the resumed Activation uses the exact persisted projection, not the current view", async () => {
    // A resolver that narrows to nothing after the first call. If the controller re-resolved before
    // interpreting the answer, the model's selection would resolve against an empty view.
    let calls = 0;
    const views: ActiveOperationViewResolver = {
      async resolve(): Promise<ActiveOperationView> {
        calls += 1;
        if (calls > 1) return { viewId: "aov_empty", authorityId: "oau_1", authorityVersion: 1, entries: [], omitted: [] };
        return {
          viewId: "aov_first",
          authorityId: "oau_1",
          authorityVersion: 1,
          entries: [
            {
              capability: "docs",
              operation: "search",
              title: "Search documents",
              description: "Search the project corpus.",
              input: SEARCH_INPUT,
              consequential: false,
              groups: ["research"],
            },
          ],
          omitted: [],
        };
      },
    };

    const rig = slowRig({ views });
    const ref = await rig.bundle.definitions.save(testAgent({ id: "stale-view", operations: { refs: [DOCS_SEARCH] } }));
    const agent = await rig.bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await rig.bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "search" });
    await rig.bundle.harness.runUntilIdle();

    const suspended = stateOf((await rig.bundle.harness.inspect(agent.executionId))!.control.progress);
    const firstActionViewId = suspended.invocation!.projection.viewId;
    assert.match(firstActionViewId, /^amav_/);
    assert.deepEqual(suspended.invocation!.projection.bindings.map((binding) => binding.alias), ["docs_search"]);

    // The model answers with the name it was shown, long after the view stopped exposing it.
    rig.provider.settle({ capabilityCalls: [{ id: "c1", capability: "docs_search", input: { query: "kernels" } }] });
    await rig.bundle.harness.drainResumptions();
    await rig.bundle.harness.runUntilIdle();

    const requested = effectRequestsIn(await rig.bundle.harness.effectJournalOf(agent.executionId));
    assert.equal(requested.length, 1, "the answer resolved, against the snapshot it was given");
    const proposal = requested[0]!.proposal;
    assert.ok(proposal.kind === "use_capability");
    assert.deepEqual(
      { capability: proposal.capability as string, operation: proposal.operation as string },
      { capability: "docs", operation: "search" },
    );

    // The view really had stopped exposing it: the *next* step, which does resolve afresh, sees
    // nothing. Had the resumed Activation re-resolved before interpreting, the answer would have
    // resolved against this empty view and produced a deterministic failure instead of an Effect.
    const after = stateOf((await rig.bundle.harness.inspect(agent.executionId))!.control.progress);
    assert.equal(after.invocation?.step, 2);
    assert.notEqual(after.invocation?.projection.viewId, firstActionViewId);
    assert.deepEqual(after.invocation?.projection.bindings, []);
    assert.equal((await rig.bundle.harness.inspect(agent.executionId))?.lifecycle, "WAITING");
  });

  test("a provider rejection behaves the same whether it is fast or slow", async () => {
    const rejection = () =>
      new ModelInvocationError("transport", "provider exploded", { provider: "test", model: "model-a" });

    const fast = createAgentTestHarness({
      catalog: testCatalog(),
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([new ScriptedModelProvider({ id: "test", steps: [{ error: rejection() }] })]),
    });
    const fastRef = await fast.definitions.save(testAgent({ id: "fast-reject" }));
    const fastAgent = await fast.createAgent({ definition: fastRef, authority: [] });
    await fast.harness.deliverExternalInput({ destination: fastAgent.executionId, label: "ask", payload: "go" });
    await fast.harness.runUntilIdle();
    const fastContext = await fast.harness.inspect(fastAgent.executionId);

    const slow = slowRig();
    const slowRef = await slow.bundle.definitions.save(testAgent({ id: "slow-reject" }));
    const slowAgent = await slow.bundle.createAgent({ definition: slowRef, authority: [] });
    await slow.bundle.harness.deliverExternalInput({ destination: slowAgent.executionId, label: "ask", payload: "go" });
    await slow.bundle.harness.runUntilIdle();
    slow.provider.reject(rejection());
    await slow.bundle.harness.drainResumptions();
    await slow.bundle.harness.runUntilIdle();
    const slowContext = await slow.bundle.harness.inspect(slowAgent.executionId);

    assert.equal(fastContext?.lifecycle, "FAILED");
    assert.equal(slowContext?.lifecycle, "FAILED");
    assert.equal(slowContext?.failure?.code, fastContext?.failure?.code, "the same failure, whichever path it took");
    assert.equal(slowContext?.failure?.message, fastContext?.failure?.message);
    assert.deepEqual(await slow.bundle.harness.effectJournalOf(slowAgent.executionId), [], "and never an Effect");
    assert.deepEqual(await slow.bundle.harness.pendingOperationsOf(slowAgent.executionId), []);
  });

  test("forcing every model step to yield changes nothing but the Activation count", async () => {
    const build = async (id: string, inline: boolean) => {
      const provider = new ScriptedModelProvider({
        id: "test",
        steps: [
          { output: { capabilityCalls: [{ id: "c1", capability: "docs_search", input: { query: "q" } }] } },
          { output: { text: "final" } },
        ],
      });
      const bundle = createAgentTestHarness({
        catalog: testCatalog(),
        models: agentModelAccess(testModelResolver()),
        executor: referenceAgentExecutor([provider]),
        authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
        capabilities: createScriptedCapabilityExecutor({
          handlers: { "docs:search": () => ({ status: "success", observation: { hits: 1 } }) },
        }),
        ...(inline ? {} : { inlineWait: createNoInlineWaitBudget() }),
      });
      const ref = await bundle.definitions.save(testAgent({ id, operations: { refs: [DOCS_SEARCH] } }));
      const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
      await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "go" });
      for (let i = 0; i < 10; i++) {
        await bundle.harness.runUntilIdle();
        await bundle.harness.drainResumptions();
        const context = await bundle.harness.inspect(agent.executionId);
        if (context?.lifecycle === "WAITING" && context.waitingFor?.kind === "event") break;
      }
      const context = (await bundle.harness.inspect(agent.executionId))!;
      return {
        state: stateOf(context.control.progress),
        journal: (await bundle.harness.effectJournalOf(agent.executionId)).map((entry) => entry.phase),
        emissions: (await bundle.harness.emissionsOf(agent.executionId)).map((emission) => emission.body),
        projections: bundle.trace.projections(),
        providerCalls: provider.invocationCount,
      };
    };

    const fast = await build("equivalence-fast", true);
    const slow = await build("equivalence-slow", false);

    assert.deepEqual(slow.state.messages, fast.state.messages);
    assert.equal(slow.state.step, fast.state.step);
    assert.deepEqual(slow.journal, fast.journal);
    assert.deepEqual(slow.emissions, fast.emissions);
    assert.deepEqual(slow.projections, fast.projections);
    assert.equal(slow.providerCalls, fast.providerCalls);
  });
});
