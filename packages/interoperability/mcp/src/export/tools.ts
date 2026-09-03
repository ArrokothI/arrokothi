/**
 * Exporting one explicitly selected capability operation as an MCP Tool.
 *
 * ```text
 * existing CapabilityOperationDescriptor      (the same one the Agent path uses)
 *        | toJsonSchema + explicit external name
 * MCP Tool projection                          registered on an McpServer
 *        | external tools/list, tools/call
 * an explicit adapter-owned service handler    supplied by trusted application code
 * ```
 *
 * ## Why this is an allowlist and not an enumeration
 *
 * `CapabilityCatalog.list()` exists, and calling it here would have been one line. It is not called.
 * A catalog is the set of operations that *exist*, including ones an application built for internal
 * use, ones with sensitive backends, and ones no external caller should know the shape of.
 * Publishing all of them because they are enumerable would make "registered" mean "public", which is
 * exactly the collapse the exposure layers exist to prevent. So an export names the operations it
 * exports, one at a time, and an operation nobody named is invisible to `tools/list` and
 * uninvocable through this server.
 *
 * External MCP vocabulary is likewise a projection. `toolName` may differ from the operation id -
 * the protocol's namespace is not ArrokothI's - and the internal `(capability, operation)` identity
 * never appears on the wire as something a caller addresses.
 *
 * ## Why no Execution and no authority are fabricated
 *
 * An inbound `tools/call` is a request from outside. It is not an ArrokothI Execution, it carries no
 * ArrokothI authority, and MCP-level authentication is not Execution authority. This module therefore
 * does **not**:
 *
 * ```text
 * mint an AuthorizedGrant           create or resume an Execution
 * call a CapabilityExecutor         consult an EffectAuthorizer
 * read effective operation authority   emit an Effect or an Event
 * ```
 *
 * Doing any of those would mean inventing an authorization decision on behalf of a caller nobody
 * authenticated, and a fake grant is worse than no grant because everything downstream would treat
 * it as real. What happens instead is deliberately smaller and honest: the adapter calls a handler
 * the application supplied when it chose to export the operation. The application owns what that
 * handler does and what it is allowed to reach.
 *
 * Production external authentication, tenancy, rate limiting, and control-plane policy are outside
 * this proof. A deployment that exposes this server publicly must put them in front of it; the
 * adapter neither provides nor pretends to provide them.
 */

import type { McpServer } from "@modelcontextprotocol/server";
import { fromJsonSchema } from "@modelcontextprotocol/server";
import type { CapabilityCatalog, CapabilityOperationDescriptor, JsonObject, JsonValue, OperationRef } from "@arrokothi/core/ports";
import { capabilityId, operationId, toJsonSchema } from "@arrokothi/core/execution";

/**
 * Ambient facts a handler is told about one inbound external call.
 *
 * Deliberately thin. There is no Execution id, no activation, no grant, and no runtime handle,
 * because none of those exist for an inbound protocol request and manufacturing one would be a lie.
 */
export interface McpExportInvocation {
  /** The ArrokothI operation identity this external name projects. */
  readonly ref: OperationRef;
  /** The external MCP tool name the caller used. */
  readonly toolName: string;
}

/**
 * The application-supplied service handler.
 *
 * Returns plain JSON. It is called by the adapter and by nothing else; it is not a
 * `CapabilityExecutor`, is handed no `AuthorizedCapabilityRequest`, and is not on the Effect path.
 */
export type McpExportHandler = (
  input: JsonObject,
  invocation: McpExportInvocation,
) => JsonValue | Promise<JsonValue>;

/** One explicitly exported operation. Naming it here is the entire allowlist mechanism. */
export interface McpOperationExport {
  /** The exact operation to export. Named by the application; never discovered. */
  readonly ref: OperationRef;
  /**
   * The external MCP tool name.
   *
   * Absent means the operation id. Protocol vocabulary either way - not the identity anything
   * internal is addressed by.
   */
  readonly toolName?: string;
  readonly handler: McpExportHandler;
}

export interface McpExportOptions {
  /** Where the descriptors come from, so one operation keeps one description and one schema. */
  readonly catalog: CapabilityCatalog;
  /** The operations to publish. Nothing outside this list is registered. */
  readonly exports: readonly McpOperationExport[];
}

/** Raised when an export names something the catalog cannot describe well enough to publish. */
export class McpExportError extends Error {
  readonly ref: OperationRef;
  constructor(ref: OperationRef, detail: string) {
    super(`cannot export ${ref.capability}/${ref.operation} as an MCP Tool: ${detail}`);
    this.name = "McpExportError";
    this.ref = ref;
  }
}

/** What one registration produced, for assertions and for a deployment's own inventory. */
export interface McpExportedTool {
  readonly ref: OperationRef;
  readonly toolName: string;
}

function describedOrThrow(catalog: CapabilityCatalog, ref: OperationRef): CapabilityOperationDescriptor {
  const descriptor = catalog.describe(capabilityId(ref.capability), operationId(ref.operation));
  if (!descriptor) throw new McpExportError(ref, "no catalog descriptor declares it");
  if (typeof descriptor.description !== "string" || descriptor.description.length === 0) {
    throw new McpExportError(ref, "the descriptor carries no description, and an unexplained Tool is not publishable");
  }
  if (descriptor.input === undefined) {
    throw new McpExportError(ref, "the descriptor carries no input schema, and an unconstrained Tool is not publishable");
  }
  return descriptor;
}

/**
 * Registers each named operation on an `McpServer` as an MCP Tool.
 *
 * The input schema is the *existing* ArrokothI projection - `toJsonSchema` of the descriptor's own
 * `ObjectSchema` - rather than a second translation written for MCP. One operation therefore
 * publishes exactly the contract it already declares, and the wire schema and the model-facing
 * schema cannot drift apart.
 */
export function exportCapabilityOperationsAsMcpTools(
  server: McpServer,
  options: McpExportOptions,
): readonly McpExportedTool[] {
  const registered: McpExportedTool[] = [];
  const claimed = new Set<string>();

  for (const entry of options.exports) {
    const descriptor = describedOrThrow(options.catalog, entry.ref);
    const toolName = entry.toolName ?? entry.ref.operation;
    if (claimed.has(toolName)) {
      throw new McpExportError(entry.ref, `the external name "${toolName}" is already claimed by another export`);
    }
    claimed.add(toolName);

    const invocation: McpExportInvocation = {
      ref: { capability: entry.ref.capability, operation: entry.ref.operation },
      toolName,
    };

    server.registerTool(
      toolName,
      {
        ...(descriptor.title !== undefined ? { title: descriptor.title } : {}),
        description: descriptor.description as string,
        inputSchema: fromJsonSchema<Record<string, unknown>>(toJsonSchema(descriptor.input!)),
      },
      async (args: Record<string, unknown>) => {
        try {
          const produced = await entry.handler({ ...args } as JsonObject, invocation);
          const text = JSON.stringify(produced);
          return {
            content: [{ type: "text" as const, text: text ?? "null" }],
            // MCP 2026 permits every JSON top-level kind here. The handler already returns the
            // ArrokothI JsonValue domain, so preserve it instead of forcing arrays/scalars to text.
            structuredContent: produced,
          };
        } catch (error) {
          // The handler's failure is reported as a tool execution error rather than a protocol
          // fault: the request was well-formed and the server did receive it.
          return {
            content: [
              { type: "text" as const, text: error instanceof Error ? error.message : String(error) },
            ],
            isError: true,
          };
        }
      },
    );

    registered.push({ ref: invocation.ref, toolName });
  }

  return registered;
}
