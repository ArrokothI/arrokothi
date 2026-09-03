/**
 * The model-invocation trace: enough to reconstruct an invocation, and no semantics at all.
 *
 * Two claims, and the second is the one that has to survive pressure.
 *
 * **Enough.** Usage, finish reason, and normalized provider diagnostics reach an observer instead of
 * being discarded inside the executor, together with which Execution and Activation ran the step,
 * which information selection it saw, which projection it was shown, what it produced, and what the
 * controller then decided. That is the set an evaluation deployment needs to compare strategies.
 *
 * **And nothing more.** Turning any of it on creates no Event, no journal entry, no PendingOperation,
 * no mailbox append, and no authority. A trace record is evidence; making a model result observable
 * must not make it semantic.
 *
 * ```text
 * trace record != Event
 * trace record != memory
 * trace identifier != authority
 * provider diagnostics != Agent observation
 * ```
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AgentModelInvocation } from "@agent-sdk/core/execution";
import {
  createAllowListAuthorizer,
  createDeferredModelProvider,
  createNoInlineWaitBudget,
  createScriptedCapabilityExecutor,
  ScriptedModelProvider,
} from "@agent-sdk/core/reference";
import { agentModelAccess, createAgentTestHarness, referenceAgentExecutor } from "@agent-sdk/core/testing";
import type { AgentTestHarnessBundle } from "@agent-sdk/core/testing";
import { DOCS_SEARCH, testAgent, testCatalog, testModelResolver } from "./fixtures.ts";

const REPORTING_PROVIDER = () =>
  new ScriptedModelProvider({
    id: "test",
    steps: [
      {
        output: { capabilityCalls: [{ id: "c1", capability: "docs_search", input: { query: "kernels" } }] },
        metadata: { usage: { inputTokens: 120, outputTokens: 18, totalTokens: 138 }, finishReason: "TOOL_USE" },
        diagnostics: { provider: { safetyRatings: [], candidateCount: 1 } },
      },
      {
        output: { text: "Three passages mention kernels." },
        metadata: { usage: { inputTokens: 200, outputTokens: 9, totalTokens: 209 }, finishReason: "STOP" },
      },
    ],
  });

function rig(id: string) {
  const bundle = createAgentTestHarness({
    catalog: testCatalog(),
    models: agentModelAccess(testModelResolver()),
    executor: referenceAgentExecutor([REPORTING_PROVIDER()]),
    authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
    capabilities: createScriptedCapabilityExecutor({
      handlers: { "docs:search": () => ({ status: "success", observation: { hits: 3 } }) },
    }),
  });
  return { bundle, id };
}

async function drive(bundle: AgentTestHarnessBundle, executionId: string): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await bundle.harness.runUntilIdle();
    await bundle.harness.drainResumptions();
    const context = await bundle.harness.inspect(executionId as never);
    if (context && context.lifecycle !== "READY") break;
  }
}

describe("model invocation is traceable without becoming semantic", () => {
  test("one record carries the whole invocation boundary", async () => {
    const { bundle } = rig("full");
    const ref = await bundle.definitions.save(testAgent({ id: "traced", operations: { refs: [DOCS_SEARCH] } }));
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "search" });
    await drive(bundle, agent.executionId);

    const [first, second] = bundle.trace.modelInvocations as readonly AgentModelInvocation[];
    assert.ok(first && second, "both steps were observed");

    // Identity: which Execution, which Activation, which step.
    assert.equal(first.executionId, agent.executionId);
    assert.match(first.activationId, /^act_/);
    assert.deepEqual([first.step, second.step], [1, 2]);
    assert.equal(first.reentered, false, "this one settled inside the Activation that issued it");

    // What it saw.
    assert.equal(first.logicalRef, "primary");
    assert.equal(`${first.provider}/${first.model}`, "test/model-a");
    assert.match(first.informationSelectionId, /^ic_/, "a digest of the selection, not the prompt");
    assert.equal(first.actionProjectionId, "ag/step1/projection");
    assert.equal(first.localControlProjectionId, "ag/step1/local-controls");
    assert.match(first.actionViewId, /^amav_/);
    assert.match(first.localControlViewId, /^lmcv_/);
    // Every callable the provider was shown, each tagged with its source.
    assert.deepEqual(first.callables, [
      {
        origin: "action",
        bindingId: "ag/step1/projection/b1",
        alias: "docs_search",
        target: { kind: "capability_operation", capability: "docs", operation: "search" },
      },
    ]);

    // What it produced, and what the controller then decided about it.
    assert.deepEqual([first.outcome, first.decision], ["call_operations", "call_operations"]);
    assert.deepEqual(first.proposals.map((proposal) => proposal.correlationId), ["ag/step1/call1"]);
    assert.deepEqual(first.proposals[0]!.target, {
      kind: "capability_operation",
      capability: "docs",
      operation: "search",
    });
    assert.deepEqual(first.localControlApplications, [], "no local control was applied");
    assert.deepEqual([second.outcome, second.decision], ["respond", "respond"]);
    assert.deepEqual(second.proposals, [], "a response proposes nothing");
    assert.deepEqual(second.localControlApplications, []);

    // What the provider reported. Discarding this is what the retrofit fixed.
    assert.deepEqual(first.metadata?.usage, { inputTokens: 120, outputTokens: 18, totalTokens: 138 });
    assert.equal(first.metadata?.finishReason, "TOOL_USE");
    assert.deepEqual(first.metadata?.diagnostics, { safetyRatings: [], candidateCount: 1 });
    assert.equal(second.metadata?.finishReason, "STOP");
    assert.ok(typeof first.metadata?.latencyMs === "number");

    // The whole record is data.
    assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  });

  test("two successive selections carry different information-selection identities", async () => {
    const { bundle } = rig("digest");
    const ref = await bundle.definitions.save(testAgent({ id: "digested", operations: { refs: [DOCS_SEARCH] } }));
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "search" });
    await drive(bundle, agent.executionId);

    const ids = bundle.trace.informationSelections();
    assert.equal(ids.length, 2);
    assert.notEqual(ids[0], ids[1], "the second call saw the observation the first one produced");
  });

  test("tracing creates no Event, no journal entry, and no pending work of its own", async () => {
    const { bundle } = rig("inert");
    const ref = await bundle.definitions.save(testAgent({ id: "inert", operations: { refs: [DOCS_SEARCH] } }));
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "search" });
    await drive(bundle, agent.executionId);

    // Exactly the Effect the model selected, and nothing that describes a model call.
    const journal = await bundle.harness.effectJournalOf(agent.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "authorized", "dispatch_started", "completed"]);
    assert.deepEqual(
      [...new Set(journal.map((entry) => entry.effectKind))],
      ["use_capability"],
      "no Effect kind was invented to carry a model result",
    );

    const context = await bundle.harness.inspect(agent.executionId);
    assert.deepEqual(await bundle.store.peekMailbox(context!.mailbox.mailboxId), [], "the mailbox is drained, not extended");

    // And nothing from the trace reached persisted progress.
    const progress = JSON.stringify(context!.control.progress);
    for (const leaked of ["finishReason", "TOOL_USE", "usage", "safetyRatings", "latencyMs", "informationSelectionId"]) {
      assert.equal(progress.includes(leaked), false, `provider evidence "${leaked}" must not enter control state`);
    }
  });

  test("an Agent with no trace installed behaves identically", async () => {
    // The seam is additive. Removing the observer removes evidence and no semantics.
    const provider = REPORTING_PROVIDER();
    const bundle = createAgentTestHarness({
      catalog: testCatalog(),
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
      capabilities: createScriptedCapabilityExecutor({
        handlers: { "docs:search": () => ({ status: "success", observation: { hits: 3 } }) },
      }),
      trace: {},
    });
    const ref = await bundle.definitions.save(testAgent({ id: "untraced", operations: { refs: [DOCS_SEARCH] } }));
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "search" });
    await drive(bundle, agent.executionId);

    const journal = await bundle.harness.effectJournalOf(agent.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "authorized", "dispatch_started", "completed"]);
    assert.equal((await bundle.harness.inspect(agent.executionId))?.lifecycle, "WAITING");
  });

  test("a forced resumption reports the same trace semantics as an inline call", async () => {
    // Which path the invocation took is operational. The evidence it produces is not allowed to
    // depend on it, so the metadata has to survive the JSON boundary a resumption crosses.
    const provider = createDeferredModelProvider("test");
    const bundle = createAgentTestHarness({
      catalog: testCatalog(),
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
      capabilities: createScriptedCapabilityExecutor({
        handlers: { "docs:search": () => ({ status: "success", observation: { hits: 3 } }) },
      }),
      inlineWait: createNoInlineWaitBudget(),
    });
    const ref = await bundle.definitions.save(testAgent({ id: "slow-trace", operations: { refs: [DOCS_SEARCH] } }));
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "search" });
    await bundle.harness.runUntilIdle();

    assert.equal(bundle.trace.modelInvocations.length, 0, "nothing is recorded until there is an answer to record");
    provider.settle(
      { capabilityCalls: [{ id: "c1", capability: "docs_search", input: { query: "kernels" } }] },
      { finishReason: "TOOL_USE" },
    );
    await bundle.harness.drainResumptions();
    await bundle.harness.runUntilIdle();

    const record = bundle.trace.modelInvocations[0]!;
    assert.equal(record.reentered, true, "a later Activation interpreted this one");
    assert.equal(record.step, 1, "and it is still the same step");
    assert.equal(record.outcome, "call_operations");
    assert.equal(record.decision, "call_operations");
    assert.equal(record.metadata?.finishReason, "TOOL_USE", "the provider's report crossed the resumption boundary");
    assert.equal(record.actionProjectionId, "ag/step1/projection");
    assert.equal(record.localControlProjectionId, "ag/step1/local-controls");
  });

  test("a provider rejection is traced as a failure without inventing usage", async () => {
    const provider = createDeferredModelProvider("test");
    const bundle = createAgentTestHarness({
      catalog: testCatalog(),
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
      inlineWait: createNoInlineWaitBudget(),
    });
    const ref = await bundle.definitions.save(testAgent({ id: "rejected", operations: { refs: [DOCS_SEARCH] } }));
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "search" });
    await bundle.harness.runUntilIdle();
    provider.reject(new Error("upstream refused"));
    await bundle.harness.drainResumptions();
    await bundle.harness.runUntilIdle();

    const record = bundle.trace.modelInvocations[0]!;
    assert.equal(record.outcome, "fail");
    assert.equal(record.decision, "fail");
    assert.equal(record.metadata?.failure?.message, "upstream refused");
    assert.equal(record.metadata?.usage, undefined, "no tokens were reported, so none are claimed");
    assert.equal(record.metadata?.finishReason, undefined);
  });
});
