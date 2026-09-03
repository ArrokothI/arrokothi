/**
 * Shared wiring for the MCP conformance cases.
 *
 * The point of these fixtures is that there is a *real* MCP server on the other side of every case.
 * The linked in-memory transport gives a genuine initialize handshake and genuine `tools/list` /
 * `tools/call` round trips with no socket, no child process, and no timing, so "the server received
 * zero calls" is a fact about a protocol peer rather than about a mock.
 *
 * Note which side of the ArrokothI boundary each piece lands on, because several cases pass or fail
 * for the wrong reason otherwise. The imported *catalog* is descriptive and reaches the exposure
 * resolver. The imported *executor* reaches the Harness, and only the Harness. Nothing here hands a
 * controller an MCP client.
 */

import { Client } from "@modelcontextprotocol/client";
import { fromJsonSchema, InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import type {
  AuthorizedCapabilityRequest,
  CapabilityExecutionEnvironment,
  CapabilityExecutor,
  CapabilityOutcome,
  JsonObject,
} from "@arrokothi/core/ports";
import type { AgentDefinition, AgentSpecInput } from "@arrokothi/core/execution";
import { defineAgent } from "@arrokothi/core/execution";
import { portableModelFeatures, ScriptedModelProvider, StaticModelResolver } from "@arrokothi/core/reference";

/** The one deterministic fact only the MCP server knows. An Agent cannot answer without calling it. */
export const PROOF_CODE = "ZULU-7";

export const LOOKUP_TOOL = "lookup_code";

/** What the server publishes as its tool input contract, in ordinary JSON Schema. */
export const LOOKUP_INPUT_SCHEMA = {
  type: "object" as const,
  properties: { key: { type: "string" as const, description: "which record to look up" } },
  required: ["key"],
  additionalProperties: false,
};

export interface RegisteredCall {
  readonly tool: string;
  readonly arguments: Record<string, unknown>;
}

export interface McpTestServer {
  readonly server: McpServer;
  /** Every `tools/call` this server actually handled, in order. Empty means it was never asked. */
  readonly calls: readonly RegisteredCall[];
}

export interface McpTestPair extends McpTestServer {
  readonly client: Client;
  close(): Promise<void>;
}

export interface LookupServerOptions {
  /** Overrides the published description, for the untrusted-content case. */
  readonly description?: string;
  /** Overrides the published tool annotations, for the "annotations are not grants" case. */
  readonly annotations?: Record<string, unknown>;
  /** Registers a second tool as well, so "discovered but not authorized" has something to discover. */
  readonly alsoRegister?: readonly string[];
}

/**
 * A server publishing one synchronous lookup tool that answers from a fixed table.
 *
 * Lookup rather than arithmetic on purpose: the live canary needs a task whose answer a model
 * cannot reach by thinking, so that "the Agent produced the code" is evidence the tool ran.
 */
export function lookupServer(options: LookupServerOptions = {}): McpTestServer {
  const server = new McpServer({ name: "arrokothi-conformance-server", version: "0.0.1" });
  const calls: RegisteredCall[] = [];

  const register = (tool: string): void => {
    server.registerTool(
      tool,
      {
        title: "Look up a code",
        description: options.description ?? "Return the stored proof code for a record key.",
        inputSchema: fromJsonSchema<{ key: string }>(LOOKUP_INPUT_SCHEMA),
        ...(options.annotations !== undefined ? { annotations: options.annotations as never } : {}),
      },
      async (args) => {
        calls.push({ tool, arguments: { ...args } });
        return {
          content: [{ type: "text", text: JSON.stringify({ key: args.key, code: PROOF_CODE }) }],
          structuredContent: { key: args.key, code: PROOF_CODE },
        };
      },
    );
  };

  register(LOOKUP_TOOL);
  for (const extra of options.alsoRegister ?? []) register(extra);

  return { server, calls };
}

/**
 * Connects a client to a server over one linked in-memory transport pair.
 *
 * Both halves come from the same package's `InMemoryTransport`, as the SDK requires: the pair shares
 * private state, so a client-package half wired to a server-package half would be two objects that
 * cannot reach each other.
 */
export async function connect(made: McpTestServer): Promise<McpTestPair> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await made.server.connect(serverTransport);
  const client = new Client({ name: "arrokothi-conformance-client", version: "0.0.1" });
  await client.connect(clientTransport);
  return {
    ...made,
    client,
    async close() {
      await client.close();
      await made.server.close();
    },
  };
}

export interface CountingCapabilityExecutor extends CapabilityExecutor {
  /** Every dispatch the Harness handed to the MCP-backed executor. */
  readonly dispatches: readonly AuthorizedCapabilityRequest[];
}

/**
 * A pass-through decorator that records what the Harness dispatched.
 *
 * A decorator rather than a replacement: the real MCP executor still does the work, so a case can
 * assert both "the Harness reached the executor" and "the server saw the call" without either being
 * inferred from the other.
 */
export function counting(inner: CapabilityExecutor): CountingCapabilityExecutor {
  const dispatches: AuthorizedCapabilityRequest[] = [];
  return {
    dispatches,
    async execute(
      request: AuthorizedCapabilityRequest,
      environment: CapabilityExecutionEnvironment,
    ): Promise<CapabilityOutcome> {
      dispatches.push(request);
      return inner.execute(request, environment);
    },
  };
}

export function testModelResolver(): StaticModelResolver {
  return new StaticModelResolver({
    primary: {
      provider: "test",
      model: "model-a",
      portableFeatures: portableModelFeatures({ capabilityCalls: true }),
    },
  });
}

/** A model that selects one alias with one argument set, then reports what it learned. */
export function selectingProvider(alias: string, input: JsonObject, answer = "done"): ScriptedModelProvider {
  return new ScriptedModelProvider({
    id: "test",
    steps: [
      { output: { capabilityCalls: [{ id: "call-1", capability: alias, input }] } },
      { output: { text: answer } },
    ],
  });
}

export interface McpAgentDefinitionInput {
  readonly id: string;
  readonly operations?: AgentSpecInput["operations"];
  readonly instructions?: string;
}

/**
 * Advances an Agent until it stops making progress.
 *
 * Three drains rather than one, because there are three kinds of outstanding work and they settle
 * separately by design: Activations, controller-local model resumptions, and dispatched Effects. A
 * real MCP round trip loses the deterministic inline-wait race, so the operation takes the slow
 * path - which is exactly the path this proof should be exercising anyway. The loop stops on a
 * terminal lifecycle or on a turn that changed nothing, so an Agent that waits for its next input
 * is a result rather than a hang.
 */
export async function settleAgent(
  harness: {
    runUntilIdle(): Promise<readonly unknown[]>;
    drainResumptions(): Promise<void>;
    drainEffects(): Promise<void>;
    inspect(executionId: never): Promise<{ readonly lifecycle: string } | undefined>;
  },
  executionId: string,
  maxTurns = 12,
): Promise<void> {
  for (let turn = 0; turn < maxTurns; turn++) {
    const activations = await harness.runUntilIdle();
    await harness.drainResumptions();
    await harness.drainEffects();
    const context = await harness.inspect(executionId as never);
    if (!context || context.lifecycle === "COMPLETED" || context.lifecycle === "FAILED") return;
    if (activations.length === 0) return;
  }
}

export function mcpAgent(input: McpAgentDefinitionInput): AgentDefinition {
  return defineAgent({
    id: input.id,
    spec: {
      model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } },
      instructions: input.instructions ?? "Use the operation you were given to answer the question.",
      ...(input.operations !== undefined ? { operations: input.operations } : {}),
    },
  });
}
