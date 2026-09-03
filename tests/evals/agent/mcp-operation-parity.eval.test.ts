/**
 * One adapter-specific behavioural case: does an imported MCP operation *behave* like a native one?
 *
 * The conformance suite proves the protocol seam - that an imported Tool travels the ordinary path
 * and that nothing about MCP can widen authority. This asks the behavioural question instead, and
 * only this one:
 *
 * > At the Agent semantic layer, is there any observable difference between a capability operation
 * > backed by local code and the same operation backed by a remote MCP server?
 *
 * The answer should be no, and "no" is asserted by running the *same* Agent configuration twice -
 * same definition, same instructions, same authority, same exposure, same scripted model - against
 * two executors, and comparing everything the Agent could possibly have observed. What differs
 * between the two runs is an implementation detail below the port; what must not differ is the
 * projection the model saw, the Effect that was proposed, the journal the Harness wrote, the
 * observation the projector rendered, or the answer the Agent gave.
 *
 * This is deliberately **one** case. The ten-case reference matrix in `reference-agent.eval.test.ts`
 * grades Agent usefulness and is not duplicated for MCP: conformance proves the seam, and a second
 * copy of the matrix would grade the same model script twice.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { fromJsonSchema, InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import type { AgentSpecInput, ExecutionId, JsonObject, OperationRef } from "@agent-sdk/core/execution";
import { defineAgent } from "@agent-sdk/core/execution";
import type { CapabilityExecutor } from "@agent-sdk/core/ports";
import {
  createAllowListAuthorizer,
  createCapabilityCatalog,
  createScriptedCapabilityExecutor,
  portableModelFeatures,
  ScriptedModelProvider,
  StaticModelResolver,
} from "@agent-sdk/core/reference";
import type { CapabilityCatalog } from "@agent-sdk/core/ports";
import { agentModelAccess, createAgentTestHarness, referenceAgentExecutor } from "@agent-sdk/core/testing";
import { importMcpTools } from "@agent-sdk/integration-mcp";

const OPERATION: OperationRef = { capability: "docs", operation: "lookup" };
const ALIAS = "docs_lookup";
const CODE = "ZULU-7";

/** The published contract, in the one form both sides have to agree on: JSON Schema on the wire. */
const INPUT_JSON_SCHEMA = {
  type: "object" as const,
  properties: { key: { type: "string" as const, description: "which record to look up" } },
  required: ["key"],
  additionalProperties: false,
};

const TITLE = "Look up a record";
const DESCRIPTION = "Return the stored code for a record key.";

/** The native descriptor. Its `input` is what `INPUT_JSON_SCHEMA` projects from. */
const NATIVE_CATALOG: CapabilityCatalog = createCapabilityCatalog([
  {
    capability: OPERATION.capability,
    operation: OPERATION.operation,
    consequential: false,
    title: TITLE,
    description: DESCRIPTION,
    input: {
      kind: "object",
      fields: { key: { required: true, schema: { kind: "string" }, description: "which record to look up" } },
      additionalProperties: false,
    },
  },
]);

function nativeExecutor(): CapabilityExecutor {
  return createScriptedCapabilityExecutor({
    handlers: {
      "docs:lookup": (request) => ({
        status: "success",
        observation: { key: (request.input as { key: string }).key, code: CODE },
      }),
    },
  });
}

/** The same operation, backed by a real MCP server reached through the real adapter. */
async function mcpBacked(): Promise<{ catalog: CapabilityCatalog; executor: CapabilityExecutor; close(): Promise<void> }> {
  const server = new McpServer({ name: "parity-server", version: "0.0.1" });
  server.registerTool(
    // The remote name is the server's vocabulary. The local identity is chosen by configuration
    // below, which is what lets the two runs be the same operation.
    "lookup_code",
    { title: TITLE, description: DESCRIPTION, inputSchema: fromJsonSchema<{ key: string }>(INPUT_JSON_SCHEMA) },
    async (args) => ({
      content: [{ type: "text", text: JSON.stringify({ key: args.key, code: CODE }) }],
      structuredContent: { key: args.key, code: CODE },
    }),
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "parity-client", version: "0.0.1" });
  await client.connect(clientTransport);

  const snapshot = await importMcpTools({
    capability: OPERATION.capability,
    client,
    tools: [{ tool: "lookup_code", operation: OPERATION.operation, consequential: false }],
  });
  assert.deepEqual(snapshot.issues, []);

  return {
    catalog: snapshot.catalog,
    executor: snapshot.executor,
    async close() {
      await client.close();
      await server.close();
    },
  };
}

interface Observed {
  readonly lifecycle: string;
  readonly aliases: readonly string[];
  readonly targets: readonly unknown[];
  readonly effectKinds: readonly string[];
  readonly journalPhases: readonly string[];
  readonly proposedInput: JsonObject | undefined;
  readonly observations: readonly { readonly capability?: string; readonly content: string }[];
  readonly responses: readonly string[];
  readonly modelCalls: number;
}

/** Runs the identical Agent configuration over one executor and reports everything it could observe. */
async function run(catalog: CapabilityCatalog, executor: CapabilityExecutor): Promise<Observed> {
  const provider = new ScriptedModelProvider({
    id: "eval",
    steps: [
      { output: { capabilityCalls: [{ id: "c1", capability: ALIAS, input: { key: "alpha" } }] } },
      { output: { text: `The code for alpha is ${CODE}.` } },
    ],
  });

  const bundle = createAgentTestHarness({
    catalog,
    models: agentModelAccess(
      new StaticModelResolver({
        primary: {
          provider: "eval",
          model: "scripted",
          portableFeatures: portableModelFeatures({ capabilityCalls: true, usageMetadata: true }),
        },
      }),
    ),
    executor: referenceAgentExecutor([provider]),
    authorizer: createAllowListAuthorizer({
      grants: [{ capability: OPERATION.capability, operations: [OPERATION.operation] }],
    }),
    capabilities: executor,
  });

  const definition = defineAgent({
    id: "mcp-parity",
    spec: {
      model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } },
      instructions: "Look the record up, then state its code.",
      operations: { refs: [OPERATION] },
    } satisfies AgentSpecInput,
  });
  const ref = await bundle.definitions.save(definition);
  const agent = await bundle.createAgent({ definition: ref, authority: [OPERATION] });
  await bundle.harness.deliverExternalInput({
    destination: agent.executionId,
    label: "task",
    payload: "What is the code for record alpha?",
  });

  let lifecycle = "MISSING";
  for (let turn = 0; turn < 12; turn++) {
    const activations = await bundle.harness.runUntilIdle();
    await bundle.harness.drainResumptions();
    await bundle.harness.drainEffects();
    const context = await bundle.harness.inspect(agent.executionId as ExecutionId);
    lifecycle = context?.lifecycle ?? "MISSING";
    if (!context || lifecycle === "COMPLETED" || lifecycle === "FAILED") break;
    if (activations.length === 0) break;
  }

  const journal = await bundle.harness.effectJournalOf(agent.executionId);
  const context = await bundle.harness.inspect(agent.executionId);
  const progress = JSON.parse(JSON.stringify(context!.control.progress)) as {
    messages: { role: string; content: string; capability?: string }[];
  };
  const emissions = await bundle.harness.emissionsOf(agent.executionId);

  return {
    lifecycle,
    aliases: bundle.trace.modelInvocations.flatMap((invocation) => invocation.callables.map((callable) => callable.alias)),
    targets: bundle.trace.modelInvocations.flatMap((invocation) => invocation.callables.map((callable) => callable.target)),
    effectKinds: [...new Set(journal.map((entry) => entry.effectKind))],
    journalPhases: journal.map((entry) => entry.phase),
    proposedInput: (journal.find((entry) => entry.phase === "requested")?.detail["proposal"] as { input?: JsonObject } | undefined)
      ?.input,
    observations: progress.messages
      .filter((message) => message.role === "capability")
      .map((message) => ({ capability: message.capability, content: message.content })),
    responses: emissions.map((emission) => (emission.body.kind === "text" ? emission.body.text : "")),
    modelCalls: bundle.trace.modelInvocations.length,
  };
}

describe("an imported MCP operation is indistinguishable from a native one at the Agent layer", () => {
  test("the same Agent configuration produces the same behaviour over either executor", async () => {
    const mcp = await mcpBacked();
    try {
      // The descriptors themselves agree first. Parity below would be uninteresting if the model
      // had been shown two different contracts.
      const native = NATIVE_CATALOG.describe(OPERATION.capability as never, OPERATION.operation as never)!;
      const imported = mcp.catalog.describe(OPERATION.capability as never, OPERATION.operation as never)!;
      assert.deepEqual(imported, native, "one operation, one identity, one description, one schema");

      const nativeRun = await run(NATIVE_CATALOG, nativeExecutor());
      const mcpRun = await run(mcp.catalog, mcp.executor);

      assert.deepEqual(mcpRun, nativeRun, "nothing an Agent can observe differs between the two backings");

      // And the shared result is the one the task actually required, so parity is not parity on
      // two identical failures.
      assert.equal(nativeRun.effectKinds.length, 1);
      assert.deepEqual(nativeRun.effectKinds, ["use_capability"]);
      assert.deepEqual(nativeRun.proposedInput, { key: "alpha" });
      assert.ok(nativeRun.journalPhases.includes("completed"));
      assert.equal(nativeRun.observations.length, 1);
      assert.match(nativeRun.observations[0]!.content, new RegExp(CODE));
      assert.ok(nativeRun.responses.some((response) => response.includes(CODE)));
    } finally {
      await mcp.close();
    }
  });
});
