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
 * result, isError: true         -> failure        the server itself reported an execution error
 * JSON-RPC -32600/-32601/-32602/-32700
 *                               -> failure        rejected before any handler ran
 * -32603, transport, timeout    -> unknown        when the operation is consequential
 *                               -> failure        when it is not
 * unsupported result content    -> failure        nothing was established, and nothing is discarded
 * ```
 *
 * The consequentiality split on the ambiguous arm is the honest one. For a consequential operation
 * the remote side may well have acted before the connection broke, so claiming definite failure
 * would be a lie the controller could act on. For a non-consequential operation there is no external
 * effect to have happened, so "it did not produce a result" is both true and useful. The relevant
 * flag arrives on the authorized request, where policy put it - the adapter does not decide it.
 *
 * The supported *success* shape is deliberately narrow for this first proof: `structuredContent`, or
 * text content. An image, audio, embedded-resource, or resource-link block is refused explicitly
 * rather than dropped, because silently returning `{ }` for a result that carried an image would
 * report success for an observation the Agent never received.
 */

import type { CallToolResult } from "@modelcontextprotocol/client";
import { ProtocolError } from "@modelcontextprotocol/client";
import type { CapabilityOutcome, JsonValue } from "@agent-sdk/core/ports";

/** JSON-RPC codes that mean the server rejected the request before a tool handler could run. */
const PRE_DISPATCH_JSONRPC_CODES = new Set([-32700, -32600, -32601, -32602]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
    // The peer answered and said the execution errored. That is a statement, not an ambiguity, so
    // `failure` is justified: this is not a lost response.
    const message = textOf(content);
    return {
      status: "failure",
      error: {
        code: "mcp_tool_error",
        message: message.length > 0 ? message : `the MCP server reported an execution error for tool "${input.tool}"`,
      },
    };
  }

  const unsupported = unsupportedBlockKinds(content);
  if (unsupported.length > 0) {
    return {
      status: "failure",
      error: {
        code: "mcp_unsupported_result_content",
        message:
          `tool "${input.tool}" returned content block kind(s) ${unsupported.join(", ")}; this proof supports ` +
          "structuredContent and text only, and refuses rather than discards the rest",
      },
    };
  }

  const structured = result["structuredContent"];
  if (structured !== undefined) {
    if (!isRecord(structured)) {
      return {
        status: "failure",
        error: {
          code: "mcp_unsupported_result_content",
          message: `tool "${input.tool}" returned a structuredContent that is not a JSON object`,
        },
      };
    }
    // Cloned so no SDK-owned object reference reaches an observation, and validated as JSON by the
    // Harness immediately afterwards.
    return { status: "success", observation: structuredClone(structured) as JsonValue };
  }

  if (content.length === 0) {
    return {
      status: "failure",
      error: {
        code: "mcp_empty_result",
        message: `tool "${input.tool}" returned neither structuredContent nor any content block`,
      },
    };
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
