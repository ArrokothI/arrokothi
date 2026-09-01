/**
 * Information selection is replaceable, and independent of operation exposure.
 *
 * The canonical distinction the Agent path has to keep is:
 *
 * ```text
 * information selection   what the model reads
 * operation exposure      what the model may do
 * ```
 *
 * Compaction, retrieval, note-taking, fresh-context handoff, and model-specific packing are all
 * information strategies. They are worth comparing behaviourally, and none of them may be able to
 * change what the Agent is permitted or shown as available while it does so.
 *
 * So the test swaps the compiler and asserts both halves: what the model reads differs, and the
 * projection the model was shown is structurally identical - same view, same bindings, same aliases,
 * same targets - along with the authority and the Effect path underneath it.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AgentInformationCompiler } from "@agent-sdk/core/execution";
import { agentInformationSelectionId, compileAgentInformation, referenceAgentInformationCompiler } from "@agent-sdk/core/execution";
import {
  createAllowListAuthorizer,
  createScriptedCapabilityExecutor,
  ScriptedModelProvider,
} from "@agent-sdk/core/reference";
import { agentModelAccess, createAgentTestHarness, referenceAgentExecutor } from "@agent-sdk/core/testing";
import { DOCS_SEARCH, testAgent, testCatalog, testModelResolver } from "./fixtures.ts";

/** Only the newest message reaches the model, under a rewritten system prompt. */
const terse: AgentInformationCompiler = {
  compile(input) {
    return {
      system: `${input.instructions} Be brief.`,
      messages: input.messages.slice(-1),
    };
  },
};

/** Everything, with the transcript folded into the system prompt as a running summary. */
const summarising: AgentInformationCompiler = {
  compile(input) {
    const summary = input.messages.map((message) => `${message.role}: ${message.content}`).join(" | ");
    return {
      system: `${input.instructions}\n\nSo far: ${summary}`,
      messages: input.messages.slice(-input.maxMessages),
    };
  },
};

async function runWith(compiler: AgentInformationCompiler | undefined, id: string) {
  const provider = new ScriptedModelProvider({
    id: "test",
    steps: [
      { output: { capabilityCalls: [{ id: "c1", capability: "docs_search", input: { query: "kernels" } }] } },
      { output: { text: "Three passages mention kernels." } },
    ],
  });
  const bundle = createAgentTestHarness({
    catalog: testCatalog(),
    models: agentModelAccess(testModelResolver()),
    executor: referenceAgentExecutor([provider]),
    authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
    capabilities: createScriptedCapabilityExecutor({
      handlers: { "docs:search": () => ({ status: "success", observation: { hits: 3 } }) },
    }),
    ...(compiler ? { information: compiler } : {}),
  });
  const ref = await bundle.definitions.save(testAgent({ id, operations: { refs: [DOCS_SEARCH] } }));
  const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
  await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "find kernels" });
  for (let i = 0; i < 6; i++) {
    await bundle.harness.runUntilIdle();
    await bundle.harness.drainResumptions();
    const context = await bundle.harness.inspect(agent.executionId);
    if (context && context.lifecycle !== "READY") break;
  }

  return {
    // What the model actually saw.
    prompts: provider.requests.map((request) => request.system),
    messageCounts: provider.requests.map((request) => request.messages.length),
    toolSpecs: provider.requests.map((request) => request.capabilities ?? []),
    // What it was allowed to do.
    bindings: bundle.trace.modelInvocations.map((invocation) => invocation.bindings),
    views: bundle.trace.modelInvocations.map((invocation) => invocation.viewId),
    selections: bundle.trace.informationSelections(),
    journal: (await bundle.harness.effectJournalOf(agent.executionId)).map((entry) => entry.phase),
    authority: await bundle.harness.effectiveOperationAuthorityOf(agent.executionId),
  };
}

describe("an information compiler chooses what the model reads and nothing else", () => {
  test("two compilers change the context and leave the operation projection identical", async () => {
    const a = await runWith(terse, "terse");
    const b = await runWith(summarising, "summarising");

    // Different information.
    assert.notDeepEqual(b.prompts, a.prompts);
    assert.match(a.prompts[1]!, /Be brief\.$/);
    assert.match(b.prompts[1]!, /So far: user: find kernels/);
    assert.deepEqual(a.messageCounts, [1, 1], "the terse compiler kept one message per call");
    assert.deepEqual(b.messageCounts, [1, 2], "the summarising one kept the window: the question and the observation");
    assert.notDeepEqual(b.selections, a.selections, "and the selection digests say so");

    // Identical exposure.
    assert.deepEqual(b.bindings, a.bindings, "same bindings, same aliases, same targets");
    assert.deepEqual(b.views, a.views, "cut from the same Active View");
    assert.deepEqual(
      JSON.stringify(b.toolSpecs),
      JSON.stringify(a.toolSpecs),
      "and the provider was shown byte-identical operation specs",
    );

    // Identical everything downstream.
    assert.deepEqual(b.journal, a.journal);
    assert.deepEqual(a.journal, ["requested", "authorized", "dispatch_started", "completed"]);
    assert.deepEqual(b.authority?.operations, a.authority?.operations, "authority is untouched by context strategy");
  });

  test("the reference compiler is the default, not a special case", async () => {
    const wired = await runWith(referenceAgentInformationCompiler, "explicit-compiler");
    const defaulted = await runWith(undefined, "defaulted-compiler");
    assert.deepEqual(defaulted.prompts, wired.prompts);
    assert.deepEqual(defaulted.messageCounts, wired.messageCounts);
  });

  test("the reference compiler bounds the window, which is the one thing it is for", () => {
    const messages = Array.from({ length: 10 }, (_, index) => ({ role: "user" as const, content: `m${index}` }));
    const compiled = compileAgentInformation({ instructions: "go", messages, maxMessages: 3 });
    assert.deepEqual(compiled.messages.map((message) => message.content), ["m7", "m8", "m9"]);
    assert.deepEqual(compileAgentInformation({ instructions: "go", messages, maxMessages: 0 }).messages, []);
  });

  test("the selection identity is content-derived and stable", () => {
    const one = compileAgentInformation({ instructions: "go", messages: [{ role: "user", content: "a" }], maxMessages: 5 });
    const same = compileAgentInformation({ instructions: "go", messages: [{ role: "user", content: "a" }], maxMessages: 5 });
    const other = compileAgentInformation({ instructions: "go", messages: [{ role: "user", content: "b" }], maxMessages: 5 });

    assert.equal(agentInformationSelectionId(same), agentInformationSelectionId(one), "equal selections, equal identity");
    assert.notEqual(agentInformationSelectionId(other), agentInformationSelectionId(one));
    assert.match(agentInformationSelectionId(one), /^ic_[0-9a-f]+$/);
  });
});
