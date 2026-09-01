/**
 * `failure` is not `unknown`, and this is where the adapter has to prove it means that.
 *
 * The kernel keeps the two strictly apart because collapsing them is how a system performs a
 * consequential action twice. An MCP adapter is exactly the place that temptation arrives: a broken
 * socket produces an exception, an exception looks like an error, and an error looks like a failure.
 * It is not. When the adapter cannot establish whether the remote side acted, the honest answer is
 * `unknown`, and the controller decides what an ambiguous observation means.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { CallToolResult } from "@modelcontextprotocol/client";
import { ProtocolError } from "@modelcontextprotocol/client";
import { normalizeCallToolError, normalizeCallToolResult } from "@agent-sdk/integration-mcp";

const result = (value: unknown): CallToolResult => value as CallToolResult;

describe("a settled MCP result becomes an ordinary CapabilityOutcome", () => {
  test("structuredContent becomes the observation, cloned rather than referenced", () => {
    const structured = { key: "alpha", code: "ZULU-7" };
    const outcome = normalizeCallToolResult({
      tool: "lookup_code",
      result: result({ content: [{ type: "text", text: "{}" }], structuredContent: structured }),
    });
    assert.deepEqual(outcome, { status: "success", observation: { key: "alpha", code: "ZULU-7" } });
    assert.notEqual(
      (outcome as { observation: unknown }).observation,
      structured,
      "no SDK-owned object reference reaches an observation",
    );
  });

  test("text-only content becomes a plain JSON observation", () => {
    const outcome = normalizeCallToolResult({
      tool: "lookup_code",
      result: result({ content: [{ type: "text", text: "first" }, { type: "text", text: "second" }] }),
    });
    assert.deepEqual(outcome, { status: "success", observation: { text: "first\nsecond" } });
  });

  test("a tool that reported an execution error is a failure, because the server said so", () => {
    // Not an ambiguity: the peer answered and stated the execution errored, so `failure` - "it
    // definitely did not take effect" - is the interpretation the protocol result justifies.
    const outcome = normalizeCallToolResult({
      tool: "charge_card",
      result: result({ content: [{ type: "text", text: "card declined" }], isError: true }),
    });
    assert.equal(outcome.status, "failure");
    assert.equal((outcome as { error: { code: string; message: string } }).error.code, "mcp_tool_error");
    assert.match((outcome as { error: { message: string } }).error.message, /card declined/);
  });

  test("an unsupported content block is refused explicitly, never silently discarded", () => {
    for (const block of [
      { type: "image", data: "…", mimeType: "image/png" },
      { type: "audio", data: "…", mimeType: "audio/wav" },
      { type: "resource_link", uri: "file:///x" },
      { type: "resource", resource: { uri: "file:///x", text: "…" } },
    ]) {
      const outcome = normalizeCallToolResult({ tool: "lookup_code", result: result({ content: [block] }) });
      assert.equal(outcome.status, "failure");
      assert.equal((outcome as { error: { code: string } }).error.code, "mcp_unsupported_result_content");
    }
  });

  test("an unsupported block is refused even when structuredContent is present", () => {
    // Otherwise the Agent would be told the call succeeded while an observation it was sent was
    // dropped on the floor.
    const outcome = normalizeCallToolResult({
      tool: "render_chart",
      result: result({ content: [{ type: "image", data: "…", mimeType: "image/png" }], structuredContent: { ok: true } }),
    });
    assert.equal(outcome.status, "failure");
    assert.equal((outcome as { error: { code: string } }).error.code, "mcp_unsupported_result_content");
  });

  test("an empty result is a failure rather than an invented success", () => {
    const outcome = normalizeCallToolResult({ tool: "lookup_code", result: result({ content: [] }) });
    assert.equal((outcome as { error: { code: string } }).error.code, "mcp_empty_result");
  });
});

describe("a thrown call prefers unknown wherever ambiguity is real", () => {
  test("a consequential operation whose call threw settles as unknown, not failure", () => {
    const outcome = normalizeCallToolError({
      tool: "charge_card",
      consequential: true,
      error: new Error("socket hang up"),
    });
    assert.equal(outcome.status, "unknown", "the remote side may have acted before the answer was lost");
    assert.equal((outcome as { error: { code: string } }).error.code, "mcp_outcome_unknown");
  });

  test("a non-consequential operation whose call threw settles as a retryable failure", () => {
    const outcome = normalizeCallToolError({
      tool: "lookup_code",
      consequential: false,
      error: new Error("socket hang up"),
    });
    assert.equal(outcome.status, "failure");
    assert.equal((outcome as { retryable?: boolean }).retryable, true);
  });

  test("a JSON-RPC rejection before dispatch is a definite failure even when consequential", () => {
    // The server parsed the request and refused it by method or params. Nothing ran, and saying
    // "unknown" here would be needlessly pessimistic in the one case the protocol makes certain.
    for (const code of [-32700, -32600, -32601, -32602]) {
      const outcome = normalizeCallToolError({
        tool: "charge_card",
        consequential: true,
        error: new ProtocolError(code, "Tool charge_card not found"),
      });
      assert.equal(outcome.status, "failure");
      assert.equal((outcome as { error: { code: string } }).error.code, "mcp_request_rejected");
      assert.equal((outcome as { retryable?: boolean }).retryable, false);
    }
  });

  test("an internal server error stays ambiguous for a consequential operation", () => {
    const outcome = normalizeCallToolError({
      tool: "charge_card",
      consequential: true,
      error: new ProtocolError(-32603, "internal error"),
    });
    assert.equal(outcome.status, "unknown", "-32603 says the handler was reached, so the effect may have happened");
  });
});
