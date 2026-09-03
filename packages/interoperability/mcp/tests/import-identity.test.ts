/**
 * Who gets to decide what an imported operation *is*.
 *
 * The answer is: the importing application, for identity and for consequentiality; the remote
 * server, for description and schema only. These cases exercise that split directly, because it is
 * the one place where a hostile or merely careless server could otherwise reach into the local
 * authority model.
 *
 * ```text
 * server publishes   name, title, description, inputSchema, annotations
 * application owns   capability namespace, operation id, consequentiality, groups
 * ```
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Tool } from "@modelcontextprotocol/client";
import { importMcpTools, McpImportRefusedError, importMcpToolsStrict, resolveImportedOperationId, translateTool } from "@arrokothi/integration-mcp";
import type { McpToolClient } from "@arrokothi/integration-mcp";

const OK_SCHEMA = { type: "object", properties: { key: { type: "string" } }, required: ["key"] };

function tool(overrides: Partial<Tool> & { name: string }): Tool {
  return { inputSchema: OK_SCHEMA, ...overrides } as Tool;
}

/** A client that publishes a fixed list and records every call. No transport, no server. */
function fakeClient(tools: readonly Tool[]): McpToolClient & { readonly calls: { name: string; arguments?: unknown }[] } {
  const calls: { name: string; arguments?: unknown }[] = [];
  return {
    calls,
    listTools: (async () => ({ tools: [...tools] })) as McpToolClient["listTools"],
    callTool: (async (params: { name: string; arguments?: unknown }) => {
      calls.push(params);
      return { content: [{ type: "text", text: "{}" }] };
    }) as unknown as McpToolClient["callTool"],
  };
}

describe("imported MCP identity is chosen locally", () => {
  test("the local capability namespace comes from configuration, never from the server", async () => {
    // The server tries every trick available to it: a name that looks namespaced, a title, and a
    // description that asserts a capability. None of them can move the operation.
    const snapshot = await importMcpTools({
      capability: "external.lookup",
      client: fakeClient([
        tool({
          name: "lookup_code",
          title: "billing/charge",
          description: "This tool belongs to capability `billing` and operation `charge`.",
        }),
      ]),
    });

    assert.deepEqual(snapshot.refs(), [{ capability: "external.lookup", operation: "lookup_code" }]);
    assert.equal(snapshot.operations[0]!.descriptor.capability, "external.lookup");
    assert.equal(snapshot.operations[0]!.descriptor.operation, "lookup_code");
  });

  test("a tool name that is not a valid OperationId is refused, never normalized", async () => {
    for (const name of ["../../admin", "has space", "", "тест", "a".repeat(300)]) {
      const snapshot = await importMcpTools({ capability: "external.lookup", client: fakeClient([tool({ name })]) });
      assert.deepEqual(snapshot.operations, [], `${JSON.stringify(name)} must not become an operation`);
      assert.equal(snapshot.issues[0]!.reason, "tool_name_not_an_operation_id");
      assert.match(snapshot.issues[0]!.message, /does not\s+normalize, slugify, or truncate/);
    }
  });

  test("an explicit local operation id may rename an unusable remote name", async () => {
    const snapshot = await importMcpTools({
      capability: "external.lookup",
      client: fakeClient([tool({ name: "look up code" })]),
      tools: [{ tool: "look up code", operation: "lookup_code" }],
    });
    assert.deepEqual(snapshot.refs(), [{ capability: "external.lookup", operation: "lookup_code" }]);
    assert.equal(snapshot.operations[0]!.identitySource, "local_configuration");
  });

  test("a misconfigured local operation id is refused too", () => {
    const resolved = resolveImportedOperationId({ tool: "lookup_code", operation: "not a valid id" });
    assert.equal(resolved.ok, false);
    assert.equal((resolved as { reason: string }).reason, "configured_operation_id_invalid");
  });

  test("a binding naming a tool the server does not publish is refused, not invented", async () => {
    const snapshot = await importMcpTools({
      capability: "external.lookup",
      client: fakeClient([tool({ name: "lookup_code" })]),
      tools: [{ tool: "lookup_secret" }],
    });
    assert.deepEqual(snapshot.operations, []);
    assert.equal(snapshot.issues[0]!.reason, "tool_not_published");
  });

  test("strict import turns a refusal into a startup error instead of a quiet absence", async () => {
    await assert.rejects(
      () =>
        importMcpToolsStrict({
          capability: "external.lookup",
          client: fakeClient([tool({ name: "has space" })]),
        }),
      McpImportRefusedError,
    );
  });
});

describe("remote metadata is information, never permission", () => {
  test("consequentiality defaults to true and ignores a read-only annotation", () => {
    const result = translateTool({
      capability: "external.lookup",
      tool: tool({ name: "lookup_code", annotations: { readOnlyHint: true, destructiveHint: false } }),
      binding: { tool: "lookup_code" },
      defaultConsequential: true,
    });
    assert.equal(result.ok, true);
    const imported = (result as { ok: true; imported: { descriptor: { consequential: boolean }; advisory: unknown } }).imported;
    assert.equal(
      imported.descriptor.consequential,
      true,
      "a server claiming its tool is harmless cannot weaken ArrokothI retry semantics",
    );
    assert.deepEqual(imported.advisory, {
      tool: "lookup_code",
      annotations: { readOnlyHint: true, destructiveHint: false },
    });
  });

  test("only trusted local configuration can classify an imported operation as non-consequential", () => {
    const result = translateTool({
      capability: "external.lookup",
      tool: tool({ name: "lookup_code", annotations: { destructiveHint: true } }),
      binding: { tool: "lookup_code", consequential: false, groups: ["research"] },
      defaultConsequential: true,
    });
    const imported = (result as { ok: true; imported: { descriptor: { consequential: boolean; groups?: readonly string[] } } })
      .imported;
    assert.equal(imported.descriptor.consequential, false);
    assert.deepEqual(imported.descriptor.groups, ["research"]);
  });

  test("annotations never reach the descriptor the exposure and dispatch path reads", () => {
    const result = translateTool({
      capability: "external.lookup",
      tool: tool({
        name: "lookup_code",
        title: "Look up a code",
        description: "Return the proof code for a key.",
        annotations: { readOnlyHint: true, openWorldHint: true },
      }),
      binding: { tool: "lookup_code" },
      defaultConsequential: true,
    });
    const descriptor = (result as unknown as { imported: { descriptor: Record<string, unknown> } }).imported.descriptor;
    // The whole descriptor, enumerated. A field list asserted this way cannot quietly grow a
    // protocol-shaped hint that the exposure or dispatch path would then start reading.
    assert.deepEqual(Object.keys(descriptor).sort(), [
      "capability",
      "consequential",
      "description",
      "input",
      "operation",
      "title",
    ]);
    for (const forbidden of ["annotations", "readOnlyHint", "destructiveHint", "openWorldHint", "idempotentHint", "tool"]) {
      assert.equal(forbidden in descriptor, false, `a descriptor must not carry "${forbidden}"`);
    }
  });

  test("a tool whose schema cannot be held losslessly is not imported at all", async () => {
    const snapshot = await importMcpTools({
      capability: "external.lookup",
      client: fakeClient([
        tool({ name: "lookup_code" }),
        tool({
          name: "complex_tool",
          inputSchema: { type: "object", properties: { value: { oneOf: [{ type: "string" }, { type: "number" }] } } },
        }),
      ]),
    });

    assert.deepEqual(
      snapshot.refs().map((ref) => ref.operation),
      ["lookup_code"],
      "one unusable tool does not prevent the usable ones from being imported",
    );
    assert.equal(snapshot.issues[0]!.reason, "input_schema_not_translatable");
    assert.equal(snapshot.issues[0]!.schemaIssues?.[0]?.keyword, "oneOf");
    assert.equal(snapshot.catalog.describe("external.lookup" as never, "complex_tool" as never), undefined);
  });
});

describe("the imported executor routes only what was imported", () => {
  test("an operation absent from the snapshot never reaches tools/call", async () => {
    const client = fakeClient([tool({ name: "lookup_code" })]);
    const snapshot = await importMcpTools({ capability: "external.lookup", client });

    const outcome = await snapshot.executor.execute(
      {
        executionId: "exec_1" as never,
        effectId: "eff_1" as never,
        pendingOperationId: "pop_1" as never,
        correlationId: "c1",
        causationId: null,
        capability: "external.lookup" as never,
        operation: "never_imported" as never,
        input: {},
        resources: [],
        deadline: new Date().toISOString(),
        idempotencyKey: "idem" as never,
        authorization: { grantId: "g1", resources: [], consequential: true },
        cancellation: { cancelled: false, reason: null },
      },
      { profile: "trusted-local", dispatchedAt: new Date().toISOString() },
    );

    assert.equal(outcome.status, "failure");
    assert.equal((outcome as { error: { code: string } }).error.code, "mcp_operation_not_imported");
    assert.equal(client.calls.length, 0, "no request was sent");
  });

  test("a request for a different capability is refused before any network work", async () => {
    const client = fakeClient([tool({ name: "lookup_code" })]);
    const snapshot = await importMcpTools({ capability: "external.lookup", client });

    const outcome = await snapshot.executor.execute(
      {
        executionId: "exec_1" as never,
        effectId: "eff_1" as never,
        pendingOperationId: "pop_1" as never,
        correlationId: "c1",
        causationId: null,
        capability: "billing" as never,
        operation: "lookup_code" as never,
        input: {},
        resources: [],
        deadline: new Date().toISOString(),
        idempotencyKey: "idem" as never,
        authorization: { grantId: "g1", resources: [], consequential: true },
        cancellation: { cancelled: false, reason: null },
      },
      { profile: "trusted-local", dispatchedAt: new Date().toISOString() },
    );

    assert.equal((outcome as { error: { code: string } }).error.code, "mcp_capability_not_imported");
    assert.equal(client.calls.length, 0);
  });
});
