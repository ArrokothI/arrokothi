/**
 * Live Agent -> MCP canary. Never part of the offline suite.
 *
 * Conformance proves the seam; this proves the seam works with a real model on one end and a real
 * MCP server on the other. It is a canary, not a benchmark and not a conformance case: one run, one
 * task, honest reporting, and no architectural consequence if the provider is unavailable.
 *
 * ```text
 * an in-memory MCP server publishing one harmless lookup Tool
 *        v  the real adapter, over a real client/server handshake
 * an ordinary CapabilityOperationDescriptor
 *        v  explicit authority for exactly that operation
 * the reference Agent path + the real Gemini provider
 *        v
 * UseCapability -> Harness ceiling -> policy -> MCP-backed executor -> tools/call
 *        v
 * observation -> the Agent's final answer
 * ```
 *
 * The task is a *lookup*, not arithmetic. A model can compute a sum without a tool, so a sum would
 * prove nothing; the proof code below exists only inside the MCP server's own table, so an answer
 * containing it is evidence the tool actually ran.
 *
 * Credentials are read from the environment by name and never printed. `GEMINI_API_KEY` and
 * `GEMINI_MODEL` are the only two this script knows about; the model id is read rather than
 * hardcoded, so a provider/model availability problem is reported as itself instead of being
 * papered over with a substitution.
 */

import { randomUUID } from "node:crypto";
import type { EffectAuthorizer, OperationRef } from "@agent-sdk/core/ports";
import type { AgentSpecInput } from "@agent-sdk/core/execution";
import { defineAgent } from "@agent-sdk/core/execution";
import {
  createAllowListAuthorizer,
  portableModelFeatures,
  StaticModelResolver,
} from "@agent-sdk/core/reference";
import { agentModelAccess, createAgentTestHarness, referenceAgentExecutor } from "@agent-sdk/core/testing";
import { GeminiModelProvider, geminiApiKeyFromEnv } from "@agent-sdk/provider-gemini";
import { Client } from "@modelcontextprotocol/client";
import { fromJsonSchema, InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import { importMcpTools } from "@agent-sdk/integration-mcp";

const requestedModel = process.env["GEMINI_MODEL"];
const apiKey = geminiApiKeyFromEnv();
const timestamp = new Date().toISOString();

/** Generated per run, so a passing answer cannot have come from a cached transcript or the weights. */
const PROOF_CODE = `ARK-${randomUUID().slice(0, 8).toUpperCase()}`;
const RECORD_KEY = "alpha";

const IMPORTED: OperationRef = { capability: "external.lookup", operation: "lookup_code" };
const ALIAS = "external_lookup_lookup_code";

function report(body: Record<string, unknown>): never {
  console.log(JSON.stringify({ timestamp, requestedModel: requestedModel ?? null, ...body }, null, 2));
  process.exit(body["status"] === "passed" ? 0 : body["status"] === "skipped" ? 0 : 1);
}

/** Redacts the credential from any message before it can reach stdout. */
function sanitize(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return (apiKey ? message.split(apiKey).join("[redacted]") : message).slice(0, 400);
}

if (!apiKey) {
  report({
    status: "skipped",
    reason: "missing_credentials",
    message: "No Gemini API key in the environment. Set GEMINI_API_KEY.",
  });
}
if (!requestedModel) {
  report({
    status: "skipped",
    reason: "missing_model",
    message: "GEMINI_MODEL is not set. The canary reads the model id rather than hardcoding one.",
  });
}

// -- the MCP server ----------------------------------------------------------

const toolCalls: { readonly key: unknown }[] = [];
const server = new McpServer({ name: "arrokoth-canary-server", version: "0.0.1" });
server.registerTool(
  "lookup_code",
  {
    title: "Look up a record code",
    description: "Return the stored proof code for a record key. The code cannot be derived; it must be looked up.",
    inputSchema: fromJsonSchema<{ key: string }>({
      type: "object",
      properties: { key: { type: "string", description: "the record key to look up" } },
      required: ["key"],
      additionalProperties: false,
    }),
  },
  async (args) => {
    toolCalls.push({ key: args.key });
    const code = args.key === RECORD_KEY ? PROOF_CODE : "UNKNOWN";
    return {
      content: [{ type: "text", text: JSON.stringify({ key: args.key, code }) }],
      structuredContent: { key: args.key, code },
    };
  },
);

const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);
const client = new Client({ name: "arrokoth-canary-client", version: "0.0.1" });
await client.connect(clientTransport);

// -- import through the real adapter -----------------------------------------

const snapshot = await importMcpTools({
  capability: IMPORTED.capability,
  client,
  tools: [{ tool: "lookup_code", consequential: false }],
});
if (snapshot.issues.length > 0 || snapshot.operations.length !== 1) {
  await client.close();
  await server.close();
  report({ status: "failed", reason: "import_refused", issues: snapshot.issues });
}

// -- the Agent ---------------------------------------------------------------

const provider = new GeminiModelProvider({ apiKey, maxRetries: 0 });
const resolver = new StaticModelResolver({
  primary: {
    provider: "gemini",
    model: requestedModel,
    portableFeatures: portableModelFeatures({ capabilityCalls: true, usageMetadata: true }),
  },
});
const policy: EffectAuthorizer = createAllowListAuthorizer({
  grants: [{ capability: IMPORTED.capability, operations: [IMPORTED.operation] }],
});

const bundle = createAgentTestHarness({
  catalog: snapshot.catalog,
  models: agentModelAccess(resolver),
  executor: referenceAgentExecutor([provider]),
  authorizer: policy,
  capabilities: snapshot.executor,
});

const definition = defineAgent({
  id: "mcp-gemini-canary",
  spec: {
    model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } },
    instructions:
      "You answer questions about stored records. You cannot know a record's code without looking it up, " +
      "so use the available operation to retrieve it, then state the code exactly as returned.",
    operations: { refs: [IMPORTED] },
    limits: { maxModelCalls: 4, maxOperationCallsPerStep: 1, maxContextMessages: 32 },
  } satisfies AgentSpecInput,
});

let failure: string | null = null;
let lifecycle = "MISSING";
let answer = "";
let executionFailure: { code: string; message: string } | null = null;

try {
  const ref = await bundle.definitions.save(definition);
  // Explicit authority for exactly that imported operation. Discovery granted nothing.
  const agent = await bundle.createAgent({ definition: ref, authority: [IMPORTED] });
  await bundle.harness.deliverExternalInput({
    destination: agent.executionId,
    label: "task",
    payload: `What is the code for record "${RECORD_KEY}"? Reply with the code.`,
  });

  for (let turn = 0; turn < 12; turn++) {
    const activations = await bundle.harness.runUntilIdle();
    await bundle.harness.drainResumptions();
    await bundle.harness.drainEffects();
    const context = await bundle.harness.inspect(agent.executionId);
    lifecycle = context?.lifecycle ?? "MISSING";
    executionFailure = context?.failure
      ? { code: context.failure.code, message: sanitize(context.failure.message) }
      : null;
    if (!context || lifecycle === "COMPLETED" || lifecycle === "FAILED") break;
    if (activations.length === 0) break;
  }

  const emissions = await bundle.harness.emissionsOf(agent.executionId);
  answer = emissions
    .map((emission) => (emission.body.kind === "text" ? emission.body.text : ""))
    .filter((text) => text.length > 0)
    .join("\n");

  const journal = await bundle.harness.effectJournalOf(agent.executionId);
  const invoked = toolCalls.length;
  const observed = answer.includes(PROOF_CODE);

  const checks = {
    mcp_tool_invoked: invoked === 1,
    mcp_tool_received_expected_key: toolCalls[0]?.key === RECORD_KEY,
    only_use_capability_proposed: journal.every((entry) => entry.effectKind === "use_capability"),
    dispatch_authorized: journal.some((entry) => entry.phase === "authorized"),
    observation_reached_agent: journal.some((entry) => entry.phase === "completed"),
    final_answer_contains_code: observed,
  };
  const passed = Object.values(checks).every(Boolean);

  await client.close();
  await server.close();
  report({
    status: passed ? "passed" : "failed",
    envVarsUsed: ["GEMINI_API_KEY", "GEMINI_MODEL"],
    lifecycle,
    executionFailure,
    checks,
    mcpToolCalls: invoked,
    modelCalls: bundle.trace.modelInvocations.length,
    exposedAlias: bundle.trace.modelInvocations[0]?.callables.map((callable) => callable.alias) ?? [],
    providerReportedModel: bundle.trace.modelInvocations[0]?.metadata?.model ?? null,
    journalPhases: journal.map((entry) => entry.phase),
    // The generated code is printed so a reader can confirm the answer matched it. It is a
    // per-run fixture value, not a secret.
    proofCode: PROOF_CODE,
    answerContainsProofCode: observed,
    answerLength: answer.length,
  });
} catch (error) {
  failure = sanitize(error);
  await client.close().catch(() => undefined);
  await server.close().catch(() => undefined);
  report({
    status: "failed",
    reason: "unexpected_failure",
    envVarsUsed: ["GEMINI_API_KEY", "GEMINI_MODEL"],
    lifecycle,
    message: failure,
    mcpToolCalls: toolCalls.length,
    exposedAlias: [ALIAS],
  });
}
