/**
 * The model-facing observation projection: one semantic result, two renderings.
 *
 * The action path has always been layered - catalog, authority, view, projection - and the return
 * path needs the same property for a different reason. How an operation result *reads* to a model is
 * a strategy: concise or detailed, redacted, truncated, summarised, or rewritten so a failure says
 * what to do next. None of those is a semantic change, and none of them may become one.
 *
 * So the test is a comparison. The same Agent, the same catalog, the same authority, the same
 * policy, the same capability implementation, the same model script - and two observation
 * projectors. The Event is identical, the settled result is identical, the Effect journal is
 * identical, the capability implementation is called identically. Only what the model reads differs.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AgentObservationProjector, JsonValue } from "@agent-sdk/core/execution";
import { referenceAgentObservationProjector } from "@agent-sdk/core/execution";
import {
  createAllowListAuthorizer,
  createScriptedCapabilityExecutor,
  ScriptedModelProvider,
} from "@agent-sdk/core/reference";
import type { RecordingCapabilityExecutor } from "@agent-sdk/core/reference";
import { agentModelAccess, createAgentTestHarness, referenceAgentExecutor } from "@agent-sdk/core/testing";
import { DOCS_SEARCH, testAgent, testCatalog, testModelResolver } from "./fixtures.ts";

/** One line, no payload. The kind of thing a long-horizon strategy would want. */
const concise: AgentObservationProjector = {
  project(observation) {
    return {
      callId: observation.callId,
      alias: observation.alias,
      outcome: observation.outcome,
      content: `${observation.alias}: ${observation.outcome}`,
      value: { outcome: observation.outcome },
    };
  },
};

/** Everything the runtime established, spelled out. */
const detailed: AgentObservationProjector = {
  project(observation, context) {
    const body: JsonValue = {
      alias: observation.alias,
      outcome: observation.outcome,
      step: context?.step ?? null,
      result: observation.observation ?? null,
      error: observation.error ?? null,
    };
    return {
      callId: observation.callId,
      alias: observation.alias,
      outcome: observation.outcome,
      content: JSON.stringify(body),
      value: body,
    };
  },
};

interface Run {
  readonly journal: readonly string[];
  readonly executorCalls: number;
  readonly executorInput: unknown;
  readonly observedContent: readonly string[];
  readonly resultEvents: readonly JsonValue[];
}

async function runWith(projector: AgentObservationProjector | undefined, id: string): Promise<Run> {
  const provider = new ScriptedModelProvider({
    id: "test",
    steps: [
      { output: { capabilityCalls: [{ id: "c1", capability: "docs_search", input: { query: "kernels" } }] } },
      { output: { text: "Reported." } },
    ],
  });
  const capabilities = createScriptedCapabilityExecutor({
    handlers: { "docs:search": () => ({ status: "success", observation: { hits: 3 } }) },
  }) as RecordingCapabilityExecutor;

  const bundle = createAgentTestHarness({
    catalog: testCatalog(),
    models: agentModelAccess(testModelResolver()),
    executor: referenceAgentExecutor([provider]),
    authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
    capabilities,
    ...(projector ? { observations: projector } : {}),
  });
  const ref = await bundle.definitions.save(testAgent({ id, operations: { refs: [DOCS_SEARCH] } }));
  const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
  await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "search" });
  for (let i = 0; i < 6; i++) {
    await bundle.harness.runUntilIdle();
    await bundle.harness.drainResumptions();
    const context = await bundle.harness.inspect(agent.executionId);
    if (context && context.lifecycle !== "READY") break;
  }

  const context = await bundle.harness.inspect(agent.executionId);
  const progress = JSON.parse(JSON.stringify(context!.control.progress)) as {
    messages: { role: string; content: string }[];
  };
  const journalEntries = await bundle.harness.effectJournalOf(agent.executionId);
  return {
    journal: journalEntries.map((entry) => entry.phase),
    executorCalls: capabilities.callCount,
    executorInput: capabilities.calls[0]!.request.input,
    observedContent: progress.messages.filter((message) => message.role === "capability").map((m) => m.content),
    // What the runtime established, before any rendering: the settled outcome the Effect produced.
    resultEvents: journalEntries
      .filter((entry) => entry.phase === "completed")
      .map((entry) => entry.detail as unknown as JsonValue),
  };
}

describe("a settled operation result is not the same thing as how a model reads it", () => {
  test("two projectors over the same result change what the model reads and nothing else", async () => {
    const a = await runWith(concise, "concise");
    const b = await runWith(detailed, "detailed");

    // The rendering differs, which is the whole reason the seam exists.
    assert.deepEqual(a.observedContent, ["docs_search: completed"]);
    assert.deepEqual(
      JSON.parse(b.observedContent[0]!),
      { alias: "docs_search", outcome: "completed", step: 2, result: { hits: 3 }, error: null },
    );
    assert.notDeepEqual(a.observedContent, b.observedContent);

    // And nothing else does.
    assert.deepEqual(b.journal, a.journal, "the same Effect phases");
    assert.deepEqual(a.journal, ["requested", "authorized", "dispatch_started", "completed"]);
    assert.deepEqual(b.resultEvents, a.resultEvents, "the same settled result reached the runtime");
    assert.equal(b.executorCalls, a.executorCalls, "the capability implementation ran the same number of times");
    assert.deepEqual(b.executorInput, a.executorInput, "with the same input");
  });

  test("the reference projector is what the default behaviour is, not a special case", async () => {
    const wired = await runWith(referenceAgentObservationProjector, "explicit");
    const defaulted = await runWith(undefined, "defaulted");
    assert.deepEqual(defaulted.observedContent, wired.observedContent);
    assert.deepEqual(defaulted.observedContent, ['{"hits":3}']);
  });

  test("a projector renders a denial, a failure, and an unknown outcome distinguishably", () => {
    // Collapsing these is how a model retries a consequential operation nobody knows the result of.
    const base = {
      callId: "c1",
      alias: "mail_send",
      target: { kind: "capability_operation" as const, capability: "mail", operation: "send" },
    };
    const denied = referenceAgentObservationProjector.project({
      ...base,
      outcome: "denied",
      error: { code: "recipient_not_permitted", message: "no" },
    });
    const unknown = referenceAgentObservationProjector.project({
      ...base,
      outcome: "unknown",
      error: { code: "executor_threw", message: "lost" },
    });
    const failed = referenceAgentObservationProjector.project({
      ...base,
      outcome: "failed",
      error: { code: "smtp_down", message: "no route" },
    });

    assert.deepEqual([denied.outcome, unknown.outcome, failed.outcome], ["denied", "unknown", "failed"]);
    assert.notEqual(denied.content, unknown.content);
    assert.notEqual(unknown.content, failed.content);
    assert.match(unknown.content, /executor_threw/);
  });

  test("projecting is pure: the semantic observation is unchanged by rendering", () => {
    const semantic = {
      callId: "c1",
      alias: "docs_search",
      target: { kind: "capability_operation" as const, capability: "docs", operation: "search" },
      outcome: "completed" as const,
      observation: { hits: 3 },
    };
    const before = JSON.parse(JSON.stringify(semantic));
    concise.project(semantic);
    detailed.project(semantic);
    referenceAgentObservationProjector.project(semantic);
    assert.deepEqual(semantic, before, "a projector reads its input and returns a new value");
  });
});
