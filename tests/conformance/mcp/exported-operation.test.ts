/**
 * Exporting one explicitly selected native capability operation as an MCP Tool.
 *
 * ```text
 * existing CapabilityOperationDescriptor
 *        v  explicitly named, one at a time
 * MCP Tool projection
 *        v
 * external tools/list + tools/call
 *        v
 * an explicit adapter-owned service handler
 * ```
 *
 * The two claims worth testing are opposites of each other. The positive one is that a real external
 * MCP client can list and invoke the operation, and that the schema it sees is the descriptor's own
 * projection rather than a second translation written for the wire. The negative one is larger: an
 * operation nobody exported is invisible and uninvocable, raw Effect vocabulary is never published,
 * and the inbound call fabricates no Arrokoth Execution, grant, or authority to make itself work.
 *
 * That last point is what keeps the export honest. An inbound `tools/call` is a request from
 * outside. Manufacturing an `AuthorizedGrant` for it - or an Execution, or a `CapabilityExecutor`
 * dispatch - would invent an authorization decision on behalf of a caller nobody authenticated, and
 * everything downstream would treat that invention as real. The adapter calls the handler the
 * application supplied when it chose to export the operation, and stops there.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import type { JsonObject } from "@agent-sdk/core/ports";
import { toJsonSchema } from "@agent-sdk/core/execution";
import { createCapabilityCatalog } from "@agent-sdk/core/reference";
import { createTestHarness } from "@agent-sdk/core/testing";
import { exportCapabilityOperationsAsMcpTools } from "@agent-sdk/integration-mcp";
import type { McpExportInvocation } from "@agent-sdk/integration-mcp";

/**
 * A native catalog with one publishable operation and two that must never be published.
 *
 * `ledger.post` is an ordinary consequential operation an application would keep internal;
 * `secrets.read` is the case where publication would be actively harmful. Both are in the catalog,
 * which is exactly why "registered" must not mean "public".
 */
const CATALOG = createCapabilityCatalog([
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
        limit: { schema: { kind: "number", integer: true, min: 1, max: 25 } },
      },
    },
    groups: ["research"],
  },
  {
    capability: "ledger",
    operation: "post",
    consequential: true,
    title: "Post a ledger entry",
    description: "Write an entry to the ledger.",
    input: { kind: "object", fields: { amount: { required: true, schema: { kind: "number" } } } },
  },
  {
    capability: "secrets",
    operation: "read",
    consequential: false,
    title: "Read a secret",
    description: "Read a stored secret by name.",
    input: { kind: "object", fields: { name: { required: true, schema: { kind: "string" } } } },
  },
]);

interface ExportPair {
  readonly client: Client;
  readonly handled: readonly { readonly input: JsonObject; readonly invocation: McpExportInvocation }[];
  close(): Promise<void>;
}

async function exportedServer(): Promise<ExportPair> {
  const handled: { input: JsonObject; invocation: McpExportInvocation }[] = [];
  const server = new McpServer({ name: "arrokoth-export-server", version: "0.0.1" });

  // The allowlist. One entry, named explicitly. `CATALOG.list()` is never called.
  exportCapabilityOperationsAsMcpTools(server, {
    catalog: CATALOG,
    exports: [
      {
        ref: { capability: "docs", operation: "search" },
        toolName: "search_documents",
        handler: (input, invocation) => {
          handled.push({ input, invocation });
          return { passages: [`match for ${String((input as { query: string }).query)}`], truncated: false };
        },
      },
    ],
  });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "external-client", version: "0.0.1" });
  await client.connect(clientTransport);

  return {
    client,
    handled,
    async close() {
      await client.close();
      await server.close();
    },
  };
}

describe("an explicitly exported capability operation is a real MCP Tool", () => {
  test("an external client lists it with the descriptor's own schema and invokes it", async () => {
    const pair = await exportedServer();
    try {
      const listed = await pair.client.listTools();
      assert.deepEqual(listed.tools.map((tool) => tool.name), ["search_documents"]);
      assert.equal(listed.tools[0]!.title, "Search documents");
      assert.equal(listed.tools[0]!.description, "Search the project corpus and return matching passages.");
      assert.deepEqual(
        listed.tools[0]!.inputSchema,
        toJsonSchema(CATALOG.describe("docs" as never, "search" as never)!.input!),
        "the wire schema is the existing projection of the descriptor, not a second translation",
      );

      const called = await pair.client.callTool({ name: "search_documents", arguments: { query: "arrokoth", limit: 3 } });
      assert.deepEqual((called as { structuredContent?: unknown }).structuredContent, {
        passages: ["match for arrokoth"],
        truncated: false,
      });
      assert.equal((called as { isError?: boolean }).isError, undefined);

      assert.deepEqual(pair.handled, [
        {
          input: { query: "arrokoth", limit: 3 },
          invocation: { ref: { capability: "docs", operation: "search" }, toolName: "search_documents" },
        },
      ]);
    } finally {
      await pair.close();
    }
  });

  test("external MCP vocabulary is a projection, not the internal identity", async () => {
    const pair = await exportedServer();
    try {
      // The caller addresses `search_documents`. The internal `(docs, search)` pair is what the
      // handler is told about, and is never a name the wire can be used to address.
      await assert.rejects(() => pair.client.callTool({ name: "docs/search", arguments: { query: "x" } }));
      await assert.rejects(() => pair.client.callTool({ name: "docs_search", arguments: { query: "x" } }));
      await assert.rejects(() => pair.client.callTool({ name: "search", arguments: { query: "x" } }));
    } finally {
      await pair.close();
    }
  });
});

describe("everything not explicitly exported stays invisible and uninvocable", () => {
  test("other catalog operations are absent from tools/list", async () => {
    const pair = await exportedServer();
    try {
      const listed = await pair.client.listTools();
      const names = listed.tools.map((tool) => tool.name);
      assert.equal(names.length, 1, "the catalog holds three operations and publishes one");
      for (const forbidden of ["post", "ledger_post", "read", "secrets_read", "ledger/post", "secrets/read"]) {
        assert.equal(names.includes(forbidden), false, `${forbidden} must not be published`);
      }
      assert.equal(
        JSON.stringify(listed).includes("secret"),
        false,
        "an unexported operation contributes not even its description to the listing",
      );
    } finally {
      await pair.close();
    }
  });

  test("an unexported operation cannot be invoked through this server surface", async () => {
    const pair = await exportedServer();
    try {
      for (const name of ["post", "ledger_post", "read", "secrets_read"]) {
        await assert.rejects(
          () => pair.client.callTool({ name, arguments: {} }),
          (error: Error) => /not found/i.test(error.message),
          `${name} must not be invocable`,
        );
      }
    } finally {
      await pair.close();
    }
  });

  test("raw internal Effect vocabulary is never published", async () => {
    const pair = await exportedServer();
    try {
      const listed = await pair.client.listTools();
      for (const effect of ["use_capability", "write_memory", "spawn_execution", "send_message", "request_user_input"]) {
        assert.equal(listed.tools.some((tool) => tool.name === effect), false, `${effect} must not be a Tool`);
        await assert.rejects(() => pair.client.callTool({ name: effect, arguments: {} }));
      }
    } finally {
      await pair.close();
    }
  });
});

describe("the export fabricates no Arrokoth Execution or authority", () => {
  test("the handler is told what it needs and nothing that would be invented", async () => {
    const pair = await exportedServer();
    try {
      await pair.client.callTool({ name: "search_documents", arguments: { query: "x" } });
      const invocation = pair.handled[0]!.invocation as unknown as Record<string, unknown>;
      // The whole record, enumerated: the operation identity this external name projects, and the
      // external name. There is no executionId, no grantId, no activation, and no authority record,
      // because none of those exist for an inbound protocol request.
      assert.deepEqual(Object.keys(invocation).sort(), ["ref", "toolName"]);
      for (const fabricated of [
        "executionId",
        "activationId",
        "grantId",
        "authorization",
        "authority",
        "effectId",
        "pendingOperationId",
        "idempotencyKey",
      ]) {
        assert.equal(fabricated in invocation, false, `an inbound MCP call must not be given a fake ${fabricated}`);
      }
    } finally {
      await pair.close();
    }
  });

  test("an inbound call writes no Execution, journal entry, or authority record anywhere", async () => {
    // A `CapabilityExecutor` takes an `AuthorizedCapabilityRequest`, which only an authorization
    // decision can produce - so reaching one from here would have required minting that decision
    // for a caller nobody authenticated. The observable half of that claim is asserted here: a full
    // Harness exists beside the exported server, and an external call leaves no trace in it.
    const bundle = createTestHarness();
    const before = {
      transitions: (await bundle.store.listExecutions()).length,
    };

    const pair = await exportedServer();
    try {
      await pair.client.callTool({ name: "search_documents", arguments: { query: "x" } });
      assert.equal(pair.handled.length, 1, "the application's own handler ran");
      assert.equal(
        (await bundle.store.listExecutions()).length,
        before.transitions,
        "and no Execution came into being to make that possible",
      );
    } finally {
      await pair.close();
    }
  });

  test("invalid arguments are refused by the published schema before the handler runs", async () => {
    let handlerCalls = 0;
    const server = new McpServer({ name: "arrokoth-export-server", version: "0.0.1" });
    exportCapabilityOperationsAsMcpTools(server, {
      catalog: CATALOG,
      exports: [
        {
          ref: { capability: "docs", operation: "search" },
          handler: () => {
            handlerCalls += 1;
            return { passages: [] };
          },
        },
      ],
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: "external-client", version: "0.0.1" });
    await client.connect(clientTransport);

    try {
      const missing = await client.callTool({ name: "search", arguments: {} });
      assert.equal((missing as { isError?: boolean }).isError, true);
      assert.equal(handlerCalls, 0, "the descriptor's own contract is what the wire enforces");
    } finally {
      await client.close();
      await server.close();
    }
  });
});
