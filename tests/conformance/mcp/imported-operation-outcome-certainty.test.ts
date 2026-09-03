/**
 * Post-proof safety correction: an MCP Tool error is not evidence that a consequential effect
 * rolled back. These cases cross the real protocol, importer, Harness, Event path, and Agent
 * observation seam so an adapter-only assertion cannot accidentally stand in for runtime safety.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { fromJsonSchema, InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import type { AgentActionObservation, AgentObservationProjector, OperationRef } from "@arrokothi/core/execution";
import { referenceAgentObservationProjector } from "@arrokothi/core/execution";
import { createAllowListAuthorizer } from "@arrokothi/core/reference";
import { agentModelAccess, createAgentTestHarness, referenceAgentExecutor } from "@arrokothi/core/testing";
import { importMcpTools } from "@arrokothi/integration-mcp";
import {
  counting,
  mcpAgent,
  selectingProvider,
  settleAgent,
  testModelResolver,
} from "./fixtures.ts";

const IMPORTED: OperationRef = { capability: "external.records", operation: "change_record" };
const INPUT_SCHEMA = {
  type: "object" as const,
  properties: { key: { type: "string" as const } },
  required: ["key"],
  additionalProperties: false,
};

type ToolReply =
  | { readonly content: readonly { readonly type: "text"; readonly text: string }[]; readonly isError: true }
  | { readonly content: readonly { readonly type: "image"; readonly data: string; readonly mimeType: string }[] };

async function runOutcomeCase(input: {
  readonly consequential: boolean;
  readonly reply: ToolReply;
}): Promise<{
  readonly serverCalls: number;
  readonly sideEffects: number;
  readonly dispatches: number;
  readonly phases: readonly string[];
  readonly pendingOutcome: string | null;
  readonly semanticObservations: readonly AgentActionObservation[];
  readonly providerCapabilityMessages: readonly string[];
}> {
  let serverCalls = 0;
  let sideEffects = 0;
  const server = new McpServer({ name: "arrokothi-outcome-server", version: "0.0.1" });
  server.registerTool(
    IMPORTED.operation,
    {
      description: "Change one record and report the remote Tool outcome.",
      inputSchema: fromJsonSchema<{ key: string }>(INPUT_SCHEMA),
    },
    async () => {
      serverCalls += 1;
      sideEffects += 1;
      return input.reply as never;
    },
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "arrokothi-outcome-client", version: "0.0.1" });
  await client.connect(clientTransport);

  try {
    const snapshot = await importMcpTools({
      capability: IMPORTED.capability,
      client,
      tools: [{ tool: IMPORTED.operation, consequential: input.consequential }],
    });
    const executor = counting(snapshot.executor);
    const provider = selectingProvider("external_records_change_record", { key: "alpha" }, "Outcome reported.");
    const semanticObservations: AgentActionObservation[] = [];
    const projector: AgentObservationProjector = {
      project(observation, context) {
        semanticObservations.push(structuredClone(observation));
        return referenceAgentObservationProjector.project(observation, context);
      },
    };
    const bundle = createAgentTestHarness({
      catalog: snapshot.catalog,
      models: agentModelAccess(testModelResolver()),
      executor: referenceAgentExecutor([provider]),
      observations: projector,
      authorizer: createAllowListAuthorizer({
        grants: [{ capability: IMPORTED.capability, operations: [IMPORTED.operation] }],
      }),
      capabilities: executor,
    });
    const ref = await bundle.definitions.save(
      mcpAgent({ id: `mcp-outcome-${input.consequential ? "consequential" : "read"}`, operations: { refs: [IMPORTED] } }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [IMPORTED] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "Change alpha." });
    await settleAgent(bundle.harness, agent.executionId);

    const journal = await bundle.harness.effectJournalOf(agent.executionId);
    const pending = await bundle.harness.pendingOperationsOf(agent.executionId);
    const capabilityMessages = provider.requests
      .flatMap((request) => request.messages)
      .filter((message) => message.role === "capability")
      .map((message) => message.content);
    return {
      serverCalls,
      sideEffects,
      dispatches: executor.dispatches.length,
      phases: journal.map((entry) => entry.phase),
      pendingOutcome: pending[0]?.outcome ?? null,
      semanticObservations,
      providerCapabilityMessages: capabilityMessages,
    };
  } finally {
    await client.close();
    await server.close();
  }
}

describe("MCP outcome certainty reaches the ordinary Harness and Agent semantics", () => {
  test("a consequential Tool can act and then return isError without becoming definite failure", async () => {
    const run = await runOutcomeCase({
      consequential: true,
      reply: { content: [{ type: "text", text: "write completed but receipt persistence failed" }], isError: true },
    });

    assert.equal(run.sideEffects, 1, "the remote side acted before reporting the Tool error");
    assert.equal(run.serverCalls, 1);
    assert.equal(run.dispatches, 1, "unknown is never an automatic retry licence");
    assert.deepEqual(run.phases, ["requested", "authorized", "dispatch_started", "unknown_outcome"]);
    assert.equal(run.phases.includes("failed"), false, "the journal contains no false definite-failure claim");
    assert.equal(run.pendingOutcome, "unknown");
    assert.deepEqual(run.semanticObservations.map((observation) => observation.outcome), ["unknown"]);
    assert.match(run.providerCapabilityMessages[0]!, /mcp_tool_error/, "the Agent receives the ordinary projected observation");
  });

  test("the same isError is a definite failure for a non-consequential operation", async () => {
    const run = await runOutcomeCase({
      consequential: false,
      reply: { content: [{ type: "text", text: "query rejected" }], isError: true },
    });

    assert.deepEqual(run.phases, ["requested", "authorized", "dispatch_started", "failed"]);
    assert.equal(run.pendingOutcome, "failure");
    assert.deepEqual(run.semanticObservations.map((observation) => observation.outcome), ["failed"]);
    assert.equal(run.serverCalls, 1);
    assert.equal(run.dispatches, 1);
  });

  test("unrepresentable rich content after consequential execution is unknown, not failed", async () => {
    const run = await runOutcomeCase({
      consequential: true,
      reply: { content: [{ type: "image", data: "AA==", mimeType: "image/png" }] },
    });

    assert.equal(run.sideEffects, 1);
    assert.equal(run.serverCalls, 1);
    assert.equal(run.dispatches, 1);
    assert.deepEqual(run.phases, ["requested", "authorized", "dispatch_started", "unknown_outcome"]);
    assert.equal(run.pendingOutcome, "unknown");
    assert.deepEqual(run.semanticObservations.map((observation) => observation.outcome), ["unknown"]);
    assert.match(run.providerCapabilityMessages[0]!, /mcp_unsupported_result_content/);
  });
});
