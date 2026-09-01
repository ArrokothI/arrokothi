/**
 * The adapter against a real MCP client/server pair, over the official in-memory transport.
 *
 * No hand-rolled JSON-RPC and no mocked protocol: an actual `McpServer` registers actual tools, an
 * actual `Client` performs an actual initialize handshake, and `tools/list` / `tools/call` are real
 * protocol round trips. What makes it deterministic is the transport, not a simulation - the linked
 * pair has no socket, no process, and no timing.
 *
 * These are adapter-level cases. They deliberately do *not* claim to prove the Agent path: the
 * end-to-end proof, where an operation reaches `tools/call` only after the Harness has authorized
 * it, lives in `tests/conformance/mcp/`. Calling an executor directly, as two of these do, proves
 * translation and routing and nothing about authority.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { fromJsonSchema, InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import type { AuthorizedCapabilityRequest, CapabilityExecutionEnvironment } from "@agent-sdk/core/ports";
import { toJsonSchema } from "@agent-sdk/core/execution";
import { createCapabilityCatalog } from "@agent-sdk/core/reference";
import { exportCapabilityOperationsAsMcpTools, importMcpTools, McpExportError } from "@agent-sdk/integration-mcp";

const ENVIRONMENT: CapabilityExecutionEnvironment = { profile: "trusted-local", dispatchedAt: "2026-09-01T00:00:00.000Z" };

/** An authorized request, as the Harness would hand one over. Built here only to call an executor. */
function authorized(overrides: {
  capability: string;
  operation: string;
  input: Record<string, unknown>;
  consequential?: boolean;
}): AuthorizedCapabilityRequest {
  return {
    executionId: "exec_test" as never,
    effectId: "eff_test" as never,
    pendingOperationId: "pop_test" as never,
    correlationId: "corr_test",
    causationId: null,
    capability: overrides.capability as never,
    operation: overrides.operation as never,
    input: overrides.input as never,
    resources: [],
    deadline: "2026-09-01T00:01:00.000Z",
    idempotencyKey: "idem_test" as never,
    authorization: { grantId: "grant_test", resources: [], consequential: overrides.consequential ?? true },
    cancellation: { cancelled: false, reason: null },
  };
}

/**
 * A server publishing one synchronous lookup tool, plus a linked, connected client.
 *
 * Both halves of the pair come from one package's `InMemoryTransport`, which is what the SDK
 * requires: the two transports share private state, so mixing a client-package half with a
 * server-package half would connect two objects that cannot talk to each other.
 */
async function connectedPair(register: (server: McpServer) => void): Promise<{
  readonly client: Client;
  readonly server: McpServer;
  close(): Promise<void>;
}> {
  const server = new McpServer({ name: "arrokoth-test-server", version: "0.0.1" });
  register(server);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "arrokoth-test-client", version: "0.0.1" });
  await client.connect(clientTransport);
  return {
    client,
    server,
    async close() {
      await client.close();
      await server.close();
    },
  };
}

const LOOKUP_INPUT = {
  type: "object" as const,
  properties: { key: { type: "string" as const, description: "the key to look up" } },
  required: ["key"],
};

describe("import: a real MCP Tool becomes an ordinary descriptor and executes over the protocol", () => {
  test("discovery produces the existing descriptor shape, with local identity", async () => {
    const pair = await connectedPair((server) => {
      server.registerTool(
        "lookup_code",
        {
          title: "Look up a code",
          description: "Return the proof code for a key.",
          inputSchema: fromJsonSchema<{ key: string }>(LOOKUP_INPUT),
        },
        async (args) => ({ structuredContent: { key: args.key, code: "ZULU-7" }, content: [] }),
      );
    });

    try {
      const snapshot = await importMcpTools({ capability: "external.lookup", client: pair.client });
      assert.deepEqual(snapshot.refs(), [{ capability: "external.lookup", operation: "lookup_code" }]);

      const descriptor = snapshot.catalog.describe("external.lookup" as never, "lookup_code" as never);
      assert.equal(descriptor?.title, "Look up a code");
      assert.equal(descriptor?.description, "Return the proof code for a key.");
      assert.equal(descriptor?.consequential, true, "conservative by default, whatever the server hinted");
      assert.deepEqual(toJsonSchema(descriptor!.input!), LOOKUP_INPUT, "the published schema survives the trip exactly");
    } finally {
      await pair.close();
    }
  });

  test("the imported executor performs a real tools/call and returns a plain observation", async () => {
    const seen: unknown[] = [];
    const pair = await connectedPair((server) => {
      server.registerTool(
        "lookup_code",
        { description: "Return the proof code for a key.", inputSchema: fromJsonSchema<{ key: string }>(LOOKUP_INPUT) },
        async (args) => {
          seen.push(args);
          return { structuredContent: { key: args.key, code: "ZULU-7" }, content: [] };
        },
      );
    });

    try {
      const snapshot = await importMcpTools({ capability: "external.lookup", client: pair.client });
      const outcome = await snapshot.executor.execute(
        authorized({ capability: "external.lookup", operation: "lookup_code", input: { key: "alpha" } }),
        ENVIRONMENT,
      );

      assert.deepEqual(seen, [{ key: "alpha" }], "the server received the arguments exactly once, unchanged");
      assert.deepEqual(outcome, { status: "success", observation: { key: "alpha", code: "ZULU-7" } });
      assert.equal(JSON.parse(JSON.stringify(outcome)).status, "success", "the outcome is plain serializable JSON");
    } finally {
      await pair.close();
    }
  });

  test("a server-reported tool error becomes an ordinary failure observation", async () => {
    const pair = await connectedPair((server) => {
      server.registerTool(
        "lookup_code",
        { description: "Return the proof code for a key.", inputSchema: fromJsonSchema<{ key: string }>(LOOKUP_INPUT) },
        async () => ({ content: [{ type: "text", text: "no such key" }], isError: true }),
      );
    });

    try {
      const snapshot = await importMcpTools({ capability: "external.lookup", client: pair.client });
      const outcome = await snapshot.executor.execute(
        authorized({ capability: "external.lookup", operation: "lookup_code", input: { key: "missing" } }),
        ENVIRONMENT,
      );
      assert.equal(outcome.status, "failure");
      assert.match((outcome as { error: { message: string } }).error.message, /no such key/);
    } finally {
      await pair.close();
    }
  });
});

describe("export: one explicitly named operation becomes one MCP Tool", () => {
  const catalog = createCapabilityCatalog([
    {
      capability: "docs",
      operation: "search",
      consequential: false,
      title: "Search documents",
      description: "Search the project corpus and return matching passages.",
      input: {
        kind: "object",
        fields: {
          query: { required: true, schema: { kind: "string" }, description: "what to look for" },
          limit: { schema: { kind: "number", integer: true, min: 1, max: 25 } },
        },
      },
    },
    {
      capability: "ledger",
      operation: "post",
      consequential: true,
      title: "Post a ledger entry",
      description: "Write an entry to the ledger.",
      input: { kind: "object", fields: { amount: { required: true, schema: { kind: "number" } } } },
    },
  ]);

  test("the exported tool advertises the descriptor's own schema and reaches the supplied handler", async () => {
    const handled: unknown[] = [];
    const pair = await connectedPair((server) => {
      const registered = exportCapabilityOperationsAsMcpTools(server, {
        catalog,
        exports: [
          {
            ref: { capability: "docs", operation: "search" },
            toolName: "search_documents",
            handler: (input, invocation) => {
              handled.push({ input, invocation });
              return { passages: [`hit for ${String((input as { query: string }).query)}`] };
            },
          },
        ],
      });
      assert.deepEqual(registered, [{ ref: { capability: "docs", operation: "search" }, toolName: "search_documents" }]);
    });

    try {
      const listed = await pair.client.listTools();
      assert.deepEqual(
        listed.tools.map((tool) => tool.name),
        ["search_documents"],
        "only the named operation is published; the catalog is never enumerated",
      );
      assert.deepEqual(listed.tools[0]!.inputSchema, toJsonSchema(catalog.describe("docs" as never, "search" as never)!.input!));
      assert.equal(listed.tools[0]!.description, "Search the project corpus and return matching passages.");

      const called = await pair.client.callTool({ name: "search_documents", arguments: { query: "arrokoth" } });
      assert.deepEqual((called as { structuredContent?: unknown }).structuredContent, { passages: ["hit for arrokoth"] });
      assert.deepEqual(handled, [
        {
          input: { query: "arrokoth" },
          invocation: { ref: { capability: "docs", operation: "search" }, toolName: "search_documents" },
        },
      ]);
    } finally {
      await pair.close();
    }
  });

  test("an operation nobody exported is absent from tools/list and cannot be invoked", async () => {
    const pair = await connectedPair((server) => {
      exportCapabilityOperationsAsMcpTools(server, {
        catalog,
        exports: [{ ref: { capability: "docs", operation: "search" }, handler: () => ({ passages: [] }) }],
      });
    });

    try {
      const listed = await pair.client.listTools();
      assert.deepEqual(listed.tools.map((tool) => tool.name), ["search"]);
      assert.equal(
        listed.tools.some((tool) => tool.name.includes("post") || tool.name.includes("ledger")),
        false,
        "ledger.post exists in the catalog and is invisible here",
      );
      await assert.rejects(() => pair.client.callTool({ name: "post", arguments: { amount: 1 } }));
      await assert.rejects(() => pair.client.callTool({ name: "ledger_post", arguments: { amount: 1 } }));
      // And no raw Effect vocabulary is published either.
      await assert.rejects(() => pair.client.callTool({ name: "use_capability", arguments: {} }));
    } finally {
      await pair.close();
    }
  });

  test("a handler failure is a tool error, not a protocol fault", async () => {
    const pair = await connectedPair((server) => {
      exportCapabilityOperationsAsMcpTools(server, {
        catalog,
        exports: [
          {
            ref: { capability: "docs", operation: "search" },
            handler: () => {
              throw new Error("the corpus is offline");
            },
          },
        ],
      });
    });

    try {
      const called = await pair.client.callTool({ name: "search", arguments: { query: "x" } });
      assert.equal((called as { isError?: boolean }).isError, true);
      assert.match(JSON.stringify(called), /the corpus is offline/);
    } finally {
      await pair.close();
    }
  });

  test("exporting an operation the catalog cannot describe is refused at registration", () => {
    const thin = createCapabilityCatalog([{ capability: "ledger", operation: "post", consequential: true }]);
    const server = new McpServer({ name: "arrokoth-test-server", version: "0.0.1" });
    assert.throws(
      () =>
        exportCapabilityOperationsAsMcpTools(server, {
          catalog: thin,
          exports: [{ ref: { capability: "ledger", operation: "post" }, handler: () => null }],
        }),
      McpExportError,
    );
    assert.throws(
      () =>
        exportCapabilityOperationsAsMcpTools(server, {
          catalog: thin,
          exports: [{ ref: { capability: "nope", operation: "missing" }, handler: () => null }],
        }),
      McpExportError,
    );
  });
});

describe("round trip: an exported operation can be imported back unchanged", () => {
  test("name, schema, and arguments survive both directions exactly", async () => {
    const catalog = createCapabilityCatalog([
      {
        capability: "docs",
        operation: "search",
        consequential: false,
        title: "Search documents",
        description: "Search the project corpus and return matching passages.",
        input: {
          kind: "object",
          fields: {
            query: { required: true, schema: { kind: "string", minLength: 1 }, description: "what to look for" },
            scopes: { schema: { kind: "array", items: { kind: "enum", choices: ["docs", "code"] } } },
          },
        },
      },
    ]);

    const received: unknown[] = [];
    const pair = await connectedPair((server) => {
      exportCapabilityOperationsAsMcpTools(server, {
        catalog,
        exports: [
          {
            ref: { capability: "docs", operation: "search" },
            handler: (input) => {
              received.push(input);
              return { passages: ["one"] };
            },
          },
        ],
      });
    });

    try {
      const snapshot = await importMcpTools({
        capability: "remote.docs",
        client: pair.client,
        tools: [{ tool: "search", consequential: false }],
      });

      const reimported = snapshot.catalog.describe("remote.docs" as never, "search" as never);
      assert.deepEqual(
        toJsonSchema(reimported!.input!),
        toJsonSchema(catalog.describe("docs" as never, "search" as never)!.input!),
        "the JSON Schema on the wire is identical in both directions",
      );
      assert.equal(reimported!.description, "Search the project corpus and return matching passages.");
      // Identity does NOT round-trip, and must not: the re-import lands in the capability namespace
      // the importing application chose, not the one the exporting side happened to use.
      assert.equal(reimported!.capability, "remote.docs");

      const outcome = await snapshot.executor.execute(
        authorized({
          capability: "remote.docs",
          operation: "search",
          input: { query: "arrokoth", scopes: ["docs"] },
          consequential: false,
        }),
        ENVIRONMENT,
      );
      assert.deepEqual(received, [{ query: "arrokoth", scopes: ["docs"] }], "the arguments arrive exactly as sent");
      assert.deepEqual(outcome, { status: "success", observation: { passages: ["one"] } });
    } finally {
      await pair.close();
    }
  });
});
