/**
 * Local identity for an imported MCP Tool, and why the remote server has no say in it.
 *
 * An MCP server publishes a tool *name*. That name is a string in the server's own namespace: it is
 * not an Arrokoth capability, not an operation identity, and above all not a claim about where the
 * operation belongs in the importing application's authority model. So the identity of an imported
 * operation is composed here, from two sources with very different trust:
 *
 * ```text
 * local application configuration   ->  capability     (always; never negotiable)
 * local application configuration   ->  operation      (when it names one)
 * remote tool name                  ->  operation      (only when it is already a valid OperationId)
 * ```
 *
 * The second line is the important one. A server that returns `{"name": "../../admin"}`, or a name
 * that merely *looks* like an existing local operation, gets the same treatment as any other
 * unusable name: it is refused. There is no slugifying, no truncation, no normalization, and no
 * "close enough" match, because every one of those turns an attacker-chosen string into an identity
 * that authority is checked against.
 *
 * ```text
 * local capability   "external.lookup"
 * remote tool        "lookup_code"
 * Arrokoth identity   external.lookup / lookup_code
 * ```
 *
 * That pair - and only that pair - is what an `EffectiveOperationAuthority` grants, what an Active
 * View exposes, and what `UseCapability` names. The remote name survives afterwards purely as the
 * adapter's own routing key back to `tools/call`, which is a detail of one executor rather than an
 * identity anything else can see.
 */

import { isOperationId } from "@agent-sdk/core/execution";

/** How one remote tool is bound to a local operation. Written by the importing application. */
export interface McpToolBinding {
  /** The remote MCP Tool name, exactly as the server published it. */
  readonly tool: string;
  /**
   * The local operation id to import it as.
   *
   * Absent means "use the tool name", which is honoured only when that name is already a valid
   * `OperationId`. It is never repaired into one.
   */
  readonly operation?: string;
  /**
   * Consequentiality, from trusted local configuration.
   *
   * Absent means the adapter's conservative default. A remote annotation never reaches this field;
   * see `descriptor.ts` for why.
   */
  readonly consequential?: boolean;
  /** Authored group labels, from local configuration. Exposure vocabulary, never permission. */
  readonly groups?: readonly string[];
}

export type McpIdentityRefusal =
  /** The remote tool name is not a usable `OperationId` and no local override supplied one. */
  | "tool_name_not_an_operation_id"
  /** The locally configured operation id is itself invalid. */
  | "configured_operation_id_invalid";

export type McpIdentityResolution =
  | { readonly ok: true; readonly operation: string; readonly source: "local_configuration" | "remote_tool_name" }
  | { readonly ok: false; readonly reason: McpIdentityRefusal; readonly message: string };

/**
 * Resolves the local operation id for one remote tool.
 *
 * Refuses rather than repairs, in both directions: a misconfigured local id is as much a wiring
 * error as an unusable remote one, and neither may be silently massaged into something that
 * validates.
 */
export function resolveImportedOperationId(binding: McpToolBinding): McpIdentityResolution {
  if (binding.operation !== undefined) {
    return isOperationId(binding.operation)
      ? { ok: true, operation: binding.operation, source: "local_configuration" }
      : {
          ok: false,
          reason: "configured_operation_id_invalid",
          message: `the configured operation id ${JSON.stringify(binding.operation)} is not a valid OperationId`,
        };
  }
  if (isOperationId(binding.tool)) {
    return { ok: true, operation: binding.tool, source: "remote_tool_name" };
  }
  return {
    ok: false,
    reason: "tool_name_not_an_operation_id",
    message:
      `the MCP tool name ${JSON.stringify(binding.tool)} is not a valid OperationId, and this adapter does not ` +
      "normalize, slugify, or truncate a remote name into a local identity; configure an explicit operation id instead",
  };
}
