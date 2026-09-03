/**
 * MCP `tools/call` result -> ordinary `CapabilityOutcome`. Protocol shaping stops here.
 *
 * Two rules govern everything below.
 *
 * **Nothing MCP-shaped may survive.** What leaves this module is plain serializable JSON that the
 * Harness turns into an ordinary capability-result Event. No SDK object, no transport handle, no
 * content-block union, and no new Event or Effect vocabulary: an Agent that used an imported MCP
 * operation reads exactly what an Agent that used a native one reads.
 *
 * **`failure` and `unknown` are not the same answer.** Core states the distinction plainly:
 * `failure` means the operation definitely did not take effect, `unknown` means the runtime could
 * not establish what happened. Collapsing the second into the first is how a system charges a card
 * twice, so this adapter refuses to do it and maps as conservatively as the protocol allows:
 *
 * ```text
 * result, no isError            -> success        the server answered, and said it worked
 * result, isError: true         -> unknown        when the operation is consequential
 *                               -> failure        when it is not
 * JSON-RPC -32600/-32601/-32602/-32700
 *                               -> failure        rejected before any handler ran
 * -32603, transport, timeout    -> unknown        when the operation is consequential
 *                               -> failure        when it is not
 * unrepresentable result        -> unknown        when the operation is consequential
 *                               -> failure        when it is not
 * ```
 *
 * `isError` says the Tool ended in a Tool execution error. MCP deliberately uses it for input
 * validation, API, and business-logic errors; it does not say a consequential side effect rolled
 * back. Likewise, a completed call whose observation this adapter cannot represent may already have
 * changed the world. The relevant consequentiality flag arrives on the authorized request, where
 * policy put it - the adapter does not decide it.
 *
 * The supported *success* shape is deliberately narrow for this first proof: `structuredContent`, or
 * text content. An image, audio, embedded-resource, or resource-link block is refused explicitly
 * rather than dropped, because silently returning `{ }` for a result that carried an image would
 * report success for an observation the Agent never received.
 */

import type { CallToolResult } from "@modelcontextprotocol/client";
import { ProtocolError } from "@modelcontextprotocol/client";
import type { CapabilityOutcome, JsonValue } from "@arrokothi/core/ports";

/** JSON-RPC codes that mean the server rejected the request before a tool handler could run. */
const PRE_DISPATCH_JSONRPC_CODES = new Set([-32700, -32600, -32601, -32602]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

type JsonCloneResult =
  | { readonly ok: true; readonly value: JsonValue }
  | { readonly ok: false; readonly path: string; readonly reason: string };

/**
 * Clones the SDK-owned value while proving that every reachable value is actual JSON data.
 *
 * This stays local because core's JSON validator is intentionally not a public adapter convenience
 * API. A class instance, cycle, sparse array, `undefined`, non-finite number, function, symbol, or
 * bigint is refused instead of being silently dropped or escaping into an Event.
 */
function cloneJsonValue(value: unknown, path = "structuredContent", ancestors = new Set<object>()): JsonCloneResult {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return { ok: true, value };
  }
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? { ok: true, value }
      : { ok: false, path, reason: `expected a finite JSON number, received ${String(value)}` };
  }
  if (typeof value !== "object") {
    return { ok: false, path, reason: `expected JSON data, received ${typeof value}` };
  }
  if (ancestors.has(value)) return { ok: false, path, reason: "value contains a cycle" };
  ancestors.add(value);

  if (Array.isArray(value)) {
    const cloned: JsonValue[] = [];
    for (let index = 0; index < value.length; index++) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        ancestors.delete(value);
        return { ok: false, path: `${path}[${index}]`, reason: "sparse arrays are not JSON values" };
      }
      const child = cloneJsonValue(value[index], `${path}[${index}]`, ancestors);
      if (!child.ok) {
        ancestors.delete(value);
        return child;
      }
      cloned.push(child.value);
    }
    ancestors.delete(value);
    return { ok: true, value: cloned };
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    ancestors.delete(value);
    return {
      ok: false,
      path,
      reason: `expected a plain JSON object, received ${prototype?.constructor?.name ?? "object"} instance`,
    };
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    ancestors.delete(value);
    return { ok: false, path, reason: "symbol-keyed properties are not JSON data" };
  }

  const cloned: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      ancestors.delete(value);
      return { ok: false, path: `${path}.${key}`, reason: "accessor properties are not JSON data" };
    }
    const child = cloneJsonValue(descriptor.value, `${path}.${key}`, ancestors);
    if (!child.ok) {
      ancestors.delete(value);
      return child;
    }
    // Define rather than assign so a valid JSON key such as `__proto__` stays an own data property
    // instead of invoking Object.prototype's legacy setter and mutating the clone's prototype.
    Object.defineProperty(cloned, key, {
      value: child.value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  ancestors.delete(value);
  return { ok: true, value: cloned };
}

/** The text of every text block, joined. Used for both the success and the `isError` arms. */
function textOf(content: readonly unknown[]): string {
  return content
    .filter((block): block is { type: "text"; text: string } => isRecord(block) && block["type"] === "text" && typeof block["text"] === "string")
    .map((block) => block.text)
    .join("\n");
}

/** Every content block kind that is not `text`, so a refusal can name what it saw. */
function unsupportedBlockKinds(content: readonly unknown[]): readonly string[] {
  const kinds = new Set<string>();
  for (const block of content) {
    if (!isRecord(block)) {
      kinds.add("<malformed>");
      continue;
    }
    const kind = typeof block["type"] === "string" ? block["type"] : "<untyped>";
    if (kind !== "text") kinds.add(kind);
  }
  return [...kinds].sort();
}

export interface NormalizeResultInput {
  readonly result: CallToolResult;
  /** For the message only. Identity is already fixed; this just makes a failure readable. */
  readonly tool: string;
  /** The authorized operation's locally owned consequentiality classification. */
  readonly consequential: boolean;
}

function unrepresentableOutcome(
  consequential: boolean,
  code: string,
  message: string,
): CapabilityOutcome {
  return consequential
    ? { status: "unknown", error: { code, message } }
    : { status: "failure", error: { code, message } };
}

/**
 * Turns one settled `tools/call` reply into an outcome.
 *
 * `structuredContent` wins when both are present, because MCP defines the text blocks as a mirror of
 * it and two renderings of one result would be two answers to "what did the Agent observe".
 */
export function normalizeCallToolResult(input: NormalizeResultInput): CapabilityOutcome {
  const result = input.result as unknown as Record<string, unknown>;
  const content = Array.isArray(result["content"]) ? (result["content"] as unknown[]) : [];

  if (result["isError"] === true) {
    const message = textOf(content);
    const error = {
      code: "mcp_tool_error",
      message: message.length > 0 ? message : `the MCP server reported an execution error for tool "${input.tool}"`,
    };
    // MCP confirms an execution error, not rollback. Re-executing a consequential Tool could
    // duplicate a side effect that happened before the Tool produced this error result.
    return input.consequential ? { status: "unknown", error } : { status: "failure", error };
  }

  const unsupported = unsupportedBlockKinds(content);
  if (unsupported.length > 0) {
    return unrepresentableOutcome(
      input.consequential,
      "mcp_unsupported_result_content",
      `tool "${input.tool}" returned after remote execution with content block kind(s) ${unsupported.join(", ")}; ` +
        "this adapter version cannot safely represent that observation and refuses rather than discards it",
    );
  }

  const structured = result["structuredContent"];
  if (structured !== undefined) {
    const cloned = cloneJsonValue(structured);
    if (!cloned.ok) {
      return unrepresentableOutcome(
        input.consequential,
        "mcp_invalid_structured_content",
        `tool "${input.tool}" returned after remote execution, but its ${cloned.path} cannot be safely ` +
          `represented as ArrokothI JSON: ${cloned.reason}`,
      );
    }
    return { status: "success", observation: cloned.value };
  }

  if (content.length === 0) {
    // The call completed successfully; absence of display payload is not evidence of failure.
    return { status: "success", observation: null };
  }

  return { status: "success", observation: { text: textOf(content) } };
}

export interface NormalizeErrorInput {
  readonly error: unknown;
  readonly tool: string;
  /**
   * Whether policy classified this dispatch as world-changing.
   *
   * Read from the authorized request rather than decided here. It is the only input that separates
   * "this definitely did not happen" from "this may have happened and the answer was lost".
   */
  readonly consequential: boolean;
}

/**
 * Turns a thrown call into an outcome, preferring `unknown` wherever ambiguity is real.
 *
 * A pre-dispatch JSON-RPC rejection is the one case where the adapter can honestly say the tool did
 * not run: the server parsed the request and refused it by method or params. Everything else - an
 * internal server error, a closed transport, a timeout, an aborted connection - leaves the question
 * genuinely open, and a consequential operation therefore settles as `unknown`.
 */
export function normalizeCallToolError(input: NormalizeErrorInput): CapabilityOutcome {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  const code = input.error instanceof ProtocolError ? input.error.code : undefined;

  if (typeof code === "number" && PRE_DISPATCH_JSONRPC_CODES.has(code)) {
    return {
      status: "failure",
      error: {
        code: "mcp_request_rejected",
        message: `the MCP server rejected the request for tool "${input.tool}" before dispatch (JSON-RPC ${code}): ${message}`,
      },
      retryable: false,
    };
  }

  if (input.consequential) {
    return {
      status: "unknown",
      error: {
        code: "mcp_outcome_unknown",
        message:
          `the call to tool "${input.tool}" did not produce a result, and this adapter cannot establish whether the ` +
          `remote operation took effect: ${message}`,
      },
    };
  }

  return {
    status: "failure",
    error: {
      code: "mcp_call_failed",
      message: `the call to tool "${input.tool}" failed: ${message}`,
    },
    retryable: true,
  };
}
