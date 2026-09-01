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
  test("every JSON top-level kind in structuredContent becomes the observation", () => {
    const cases = [
      { label: "object", value: { key: "alpha", code: "ZULU-7" } },
      { label: "array", value: ["alpha", 7, false, null] },
      { label: "string", value: "hello" },
      { label: "number", value: 0 },
      { label: "boolean", value: false },
      { label: "null", value: null },
    ] as const;

    for (const fixture of cases) {
      const outcome = normalizeCallToolResult({
        tool: "lookup_code",
        consequential: true,
        result: result({ content: [{ type: "text", text: JSON.stringify(fixture.value) }], structuredContent: fixture.value }),
      });
      assert.deepEqual(outcome, { status: "success", observation: fixture.value }, fixture.label);
      if (fixture.value !== null && typeof fixture.value === "object") {
        assert.notEqual(
          (outcome as { observation: unknown }).observation,
          fixture.value,
          `${fixture.label}: no SDK-owned reference reaches an observation`,
        );
      }
    }
  });

  test("text-only content becomes a plain JSON observation", () => {
    const outcome = normalizeCallToolResult({
      tool: "lookup_code",
      consequential: false,
      result: result({ content: [{ type: "text", text: "first" }, { type: "text", text: "second" }] }),
    });
    assert.deepEqual(outcome, { status: "success", observation: { text: "first\nsecond" } });
  });

  test("JSON property names are cloned without mutating the observation prototype", () => {
    const structured = JSON.parse('{"__proto__":{"polluted":true},"constructor":"data"}') as Record<string, unknown>;
    const outcome = normalizeCallToolResult({
      tool: "lookup_code",
      consequential: false,
      result: result({ content: [], structuredContent: structured }),
    });
    assert.equal(outcome.status, "success");
    const observation = (outcome as { observation: Record<string, unknown> }).observation;
    assert.equal(Object.getPrototypeOf(observation), Object.prototype);
    assert.equal(Object.prototype.hasOwnProperty.call(observation, "__proto__"), true);
    assert.deepEqual(observation["__proto__"], { polluted: true });
    assert.equal(({} as { polluted?: boolean }).polluted, undefined);
  });

  test("isError is unknown for consequential work and failure for non-consequential work", () => {
    const consequential = normalizeCallToolResult({
      tool: "charge_card",
      consequential: true,
      result: result({ content: [{ type: "text", text: "card declined" }], isError: true }),
    });
    assert.equal(consequential.status, "unknown", "isError does not establish rollback");
    assert.equal((consequential as { error: { code: string } }).error.code, "mcp_tool_error");
    assert.match((consequential as { error: { message: string } }).error.message, /card declined/);

    const nonConsequential = normalizeCallToolResult({
      tool: "lookup_code",
      consequential: false,
      result: result({ content: [{ type: "text", text: "index rejected query" }], isError: true }),
    });
    assert.equal(nonConsequential.status, "failure");
    assert.equal((nonConsequential as { retryable?: boolean }).retryable, undefined, "isError alone is not retry advice");
  });

  test("unsupported rich content is refused without overstating consequential certainty", () => {
    for (const block of [
      { type: "image", data: "…", mimeType: "image/png" },
      { type: "audio", data: "…", mimeType: "audio/wav" },
      { type: "resource_link", uri: "file:///x" },
      { type: "resource", resource: { uri: "file:///x", text: "…" } },
    ]) {
      const consequential = normalizeCallToolResult({
        tool: "render",
        consequential: true,
        result: result({ content: [block] }),
      });
      const nonConsequential = normalizeCallToolResult({
        tool: "lookup_code",
        consequential: false,
        result: result({ content: [block] }),
      });
      assert.equal(consequential.status, "unknown");
      assert.equal(nonConsequential.status, "failure");
      assert.equal((consequential as { error: { code: string } }).error.code, "mcp_unsupported_result_content");
    }
  });

  test("an unsupported block is refused even when structuredContent is present", () => {
    // Otherwise the Agent would be told the call succeeded while an observation it was sent was
    // dropped on the floor.
    const outcome = normalizeCallToolResult({
      tool: "render_chart",
      consequential: true,
      result: result({ content: [{ type: "image", data: "…", mimeType: "image/png" }], structuredContent: { ok: true } }),
    });
    assert.equal(outcome.status, "unknown");
    assert.equal((outcome as { error: { code: string } }).error.code, "mcp_unsupported_result_content");
  });

  test("non-JSON structuredContent is refused with the consequentiality split", () => {
    const invalid = { when: new Date("2026-09-01T00:00:00.000Z") };
    const consequential = normalizeCallToolResult({
      tool: "write_record",
      consequential: true,
      result: result({ content: [], structuredContent: invalid }),
    });
    const nonConsequential = normalizeCallToolResult({
      tool: "read_record",
      consequential: false,
      result: result({ content: [], structuredContent: invalid }),
    });
    assert.equal(consequential.status, "unknown");
    assert.equal(nonConsequential.status, "failure");
    assert.equal((consequential as { error: { code: string } }).error.code, "mcp_invalid_structured_content");
  });

  test("an empty successful result is a successful null observation", () => {
    const outcome = normalizeCallToolResult({
      tool: "lookup_code",
      consequential: false,
      result: result({ content: [] }),
    });
    assert.deepEqual(outcome, { status: "success", observation: null });
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
