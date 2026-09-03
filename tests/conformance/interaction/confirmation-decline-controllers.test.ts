/**
 * `confirmation.declined` is an Effect result that the reference controllers must consume (E.2.1).
 *
 * E.2 routes exactly one `confirmation.declined` Event when a human declines an exact-payload
 * mechanical confirmation, and settles the gated `PendingOperation` `declined`. But the reference
 * Agent and Workflow result collectors did not map that Event to a semantic observation, so the
 * controller-side dependency (an `AgentPendingCall`, a Stage barrier entry) stayed unsettled while
 * the runtime record was already settled. This proves both controllers now consume it:
 *
 *   Agent    -> the pending call settles `declined`; the Agent makes its next model decision
 *   Workflow -> the Effect barrier settles `declined`; the Workflow does not stay WAITING
 *
 * `declined` is rendered truthfully - not as `denied` (policy) or `failed` (capability).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineWorkflow, referenceAgentObservationProjector } from "@arrokothi/core/execution";
import type { AgentObservationOutcome } from "@arrokothi/core/execution";
import type { FunctionStageOutcome, StageExecutionContext } from "@arrokothi/core/ports";
import {
  createAllowListAuthorizer,
  createCapabilityConfirmationPolicy,
  createFunctionStageRegistry,
  createScriptedCapabilityExecutor,
  ScriptedModelProvider,
} from "@arrokothi/core/reference";
import type { RecordingCapabilityExecutor } from "@arrokothi/core/reference";
import {
  agentModelAccess,
  createAgentTestHarness,
  createWorkflowTestHarness,
  referenceAgentExecutor,
} from "@arrokothi/core/testing";
import { DOCS_SEARCH, testAgent, testCatalog, testModelResolver } from "../agent/fixtures.ts";

describe("a confirmation decline settles the reference Agent's pending call", () => {
  test("the Agent settles the call `declined`, renders it truthfully, and makes its next model step", async () => {
    const provider = new ScriptedModelProvider({
      id: "test",
      steps: [
        { output: { capabilityCalls: [{ id: "call-a", capability: "docs_search", input: { query: "kernels" } }] } },
        { output: { text: "I could not run the search, so here is what I already know." } },
      ],
    });
    const capabilities = createScriptedCapabilityExecutor({
      handlers: { "docs:search": () => ({ status: "success", observation: { hits: 3 } }) },
    });
    const projectedOutcomes: AgentObservationOutcome[] = [];
    const bundle = createAgentTestHarness({
      catalog: testCatalog(),
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
      confirmationPolicy: createCapabilityConfirmationPolicy({ rules: [{ capability: "docs", operations: ["search"], reason: "review the query" }] }),
      capabilities,
      observations: {
        project(observation, context) {
          projectedOutcomes.push(observation.outcome);
          return referenceAgentObservationProjector.project(observation, context);
        },
      },
    });
    const recording = capabilities as RecordingCapabilityExecutor;

    const ref = await bundle.definitions.save(testAgent({ id: "asker", operations: { refs: [DOCS_SEARCH] } }));
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "find kernels" });
    await bundle.harness.runUntilIdle();
    await bundle.harness.drainResumptions();

    // The Agent proposed a capability call; the gate fired; the Agent is waiting on the confirmation.
    const [confirmation] = await bundle.harness.confirmationRequestsOf(agent.executionId);
    assert.ok(confirmation, "the capability call was gated for confirmation");
    assert.equal(confirmation!.effectKind, "use_capability");
    assert.equal(recording.callCount, 0, "nothing dispatched while the confirmation is pending");

    const receipt = await bundle.harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "decline" });
    assert.equal(receipt.status, "declined");

    for (let i = 0; i < 8; i += 1) {
      await bundle.harness.runUntilIdle();
      await bundle.harness.drainResumptions();
      const ctx = await bundle.harness.inspect(agent.executionId);
      if (ctx && ctx.lifecycle !== "READY") break;
    }

    const context = await bundle.harness.inspect(agent.executionId);
    assert.equal(recording.callCount, 0, "the executor was never called");

    // No permanent outstanding pending call: the gated PendingOperation is settled `declined`.
    const pending = await bundle.harness.pendingOperationsOf(agent.executionId);
    assert.ok(!pending.some((p) => p.status === "pending"), "no outstanding AgentPendingCall / PendingOperation");
    const declined = pending.find((p) => p.effectKind === "use_capability");
    assert.equal(declined?.outcome, "declined");

    // The Agent consumed the decline and made its next model decision: a second step ran and produced
    // a response. (Without a completion rule the reference Agent then awaits further input - which is
    // a decision, not a stuck barrier.)
    const progress = JSON.parse(JSON.stringify(context!.control.progress)) as {
      step: number;
      responses: number;
      pending: unknown[];
      messages: { role: string; content: string }[];
    };
    assert.equal(progress.step, 2, "a second model step ran after the decline");
    assert.equal(progress.responses, 1, "the Agent responded");
    assert.deepEqual(progress.pending, [], "nothing outstanding in controller state");

    // The projector was asked to render `declined` - truthfully, not `denied` / `failed`.
    assert.ok(projectedOutcomes.includes("declined"), "the observation projector saw a `declined` outcome");
    assert.ok(!projectedOutcomes.includes("denied"), "not relabelled as a policy denial");
    const rendered = progress.messages.filter((m) => m.role === "capability").map((m) => m.content).join(" ");
    assert.match(rendered, /declined|confirmation_declined/, "the model was told the human declined");
  });
});

describe("a confirmation decline settles a Workflow Effect barrier", () => {
  interface ProbeConfig {
    readonly key: string;
    readonly capability: string;
    readonly operation: string;
  }

  function probe(context: StageExecutionContext): FunctionStageOutcome {
    const config = context.config as unknown as ProbeConfig;
    if (context.progress["requested"] !== true) {
      return {
        status: "awaitEffects",
        progress: { requested: true },
        effects: [{ key: config.key, capability: config.capability, operation: config.operation, input: { q: config.key } }],
      };
    }
    const observation = context.observations.find((o) => o.key === config.key);
    return { status: "completed", result: `${config.key}=${observation?.outcome ?? "missing"}` };
  }

  test("the barrier settles `declined`, the Stage observes `declined`, and the Workflow does not stay WAITING", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({ probe, echo: (ctx) => ({ status: "completed", result: ctx.input }) }),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.query", operations: ["search"] }] }),
      capabilities: createScriptedCapabilityExecutor({ handlers: { "knowledge.query:search": () => ({ status: "success", observation: { hits: 1 } }) } }),
      confirmationPolicy: createCapabilityConfirmationPolicy({ rules: [{ capability: "knowledge.query", operations: ["search"], reason: "review" }] }),
    });

    const ref = await definitions.save(
      defineWorkflow({
        id: "gated-stage",
        spec: {
          entryStage: "gather",
          stages: [
            {
              id: "gather",
              kind: "function",
              implementationRef: "probe",
              config: { key: "retrieval", capability: "knowledge.query", operation: "search" },
              transitions: { kind: "always", next: { to: "stage", stage: "report" } },
            },
            { id: "report", kind: "function", implementationRef: "echo", transitions: { kind: "always", next: { to: "complete", terminal: { kind: "none" } } } },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({
      definition: ref,
      operationAuthority: { operations: [{ capability: "knowledge.query", operation: "search" }] },
    });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING", "gated on the confirmation");
    const [confirmation] = await harness.confirmationRequestsOf(handle.executionId);
    assert.ok(confirmation);
    const gatedPendingId = confirmation!.pendingOperationId;

    const receipt = await harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "decline" });
    assert.equal(receipt.status, "declined");

    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED", "the Workflow did not remain WAITING on the old correlation");

    const record = (await harness.pendingOperationsOf(handle.executionId)).find((p) => p.pendingOperationId === gatedPendingId);
    assert.equal(record?.outcome, "declined", "the gated PendingOperation settled `declined`");

    // The Stage body read its observation for the required key and saw `declined`.
    const journal = await harness.effectJournalOf(handle.executionId);
    assert.ok(journal.some((e) => e.phase === "declined"), "the decline is journaled against the Effect");
    assert.match(
      JSON.stringify(context!.control.progress),
      /retrieval=declined/,
      "the Stage observed the required operation as `declined`",
    );
  });
});
