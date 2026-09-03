/**
 * MCP Tool -> the *existing* `CapabilityOperationDescriptor`. No second ontology.
 *
 * There is deliberately no `McpToolDescriptor` type in ArrokothI, no protocol tool registry, and no
 * parallel catalog. A discovered MCP Tool becomes the same descriptor a natively declared operation
 * becomes, which is what makes the rest of the system unable to tell them apart - the Active View
 * resolver, the model projection, the action target, the Effect gateway and the observation
 * projector all keep working on one shape.
 *
 * The translation is a partition of the remote descriptor into two very different piles:
 *
 * ```text
 * information (copied)      title, description, input schema
 * permission  (never)       consequentiality, groups, authority, exposure
 * ```
 *
 * `consequential` is the field that matters most, because it decides how a *lost* response is
 * interpreted: a consequential operation whose outcome is unknown must not be retried blind. Letting
 * a remote `annotations.readOnlyHint: true` set it would hand that decision to the party with the
 * most to gain from getting it wrong, so annotations never reach the descriptor at all. They are
 * kept beside it as advisory protocol metadata, for a human or a policy author to look at, and the
 * conformance suite asserts that a server claiming `readOnlyHint` changes nothing.
 *
 * ```text
 * remote says "this tool is read-only"
 *        -> advisory metadata
 *        -> NOT consequentiality
 *        -> NOT retry policy
 *        -> NOT authority
 * ```
 *
 * The default is `consequential: true`. An imported operation nobody has classified is treated as
 * one that could change the world, which is the same fail-safe direction the Effect gateway already
 * takes for an unclassified native operation.
 */

import type { Tool } from "@modelcontextprotocol/client";
import type { CapabilityOperationDescriptorInput } from "@arrokothi/core/reference";
import type { McpSchemaIssue } from "../schema/from-json-schema.ts";
import { objectSchemaFromJsonSchema } from "../schema/from-json-schema.ts";
import type { McpToolBinding } from "./identity.ts";
import { resolveImportedOperationId } from "./identity.ts";

/**
 * Advisory protocol metadata retained beside a descriptor.
 *
 * Kept because throwing it away would make a policy author unable to see what a server claimed, and
 * kept *outside* the descriptor because anything on the descriptor is consumed by the exposure and
 * dispatch path. Nothing in ArrokothI reads this; it is evidence, not input.
 */
export interface McpAdvisoryToolMetadata {
  /** The remote tool name, verbatim. The adapter's routing key, never an ArrokothI identity. */
  readonly tool: string;
  /** Whatever the server put in `annotations`. Claims, not grants. */
  readonly annotations?: Readonly<Record<string, unknown>>;
}

/** One successfully imported tool: an ordinary descriptor plus the routing/advisory facts. */
export interface McpImportedOperation {
  /** Exactly the input the native reference catalog takes. There is no MCP-shaped descriptor. */
  readonly descriptor: CapabilityOperationDescriptorInput;
  /** Where the operation id came from, so a review can see the remote never chose it. */
  readonly identitySource: "local_configuration" | "remote_tool_name";
  readonly advisory: McpAdvisoryToolMetadata;
}

export type McpImportRefusalReason =
  | "tool_name_not_an_operation_id"
  | "configured_operation_id_invalid"
  | "input_schema_not_translatable"
  | "input_schema_missing"
  | "tool_not_published";

/** One tool that was discovered or requested and deliberately not imported, with the reason. */
export interface McpImportIssue {
  /** The remote tool name this refusal is about. */
  readonly tool: string;
  readonly reason: McpImportRefusalReason;
  readonly message: string;
  /** Present when the refusal came from the schema translator. */
  readonly schemaIssues?: readonly McpSchemaIssue[];
}

export interface TranslateToolInput {
  /** The local capability namespace. Supplied by the importing application, never by the server. */
  readonly capability: string;
  readonly tool: Tool;
  readonly binding: McpToolBinding;
  /** The adapter's conservative default when local configuration classified nothing. */
  readonly defaultConsequential: boolean;
}

export type TranslateToolResult =
  | { readonly ok: true; readonly imported: McpImportedOperation }
  | { readonly ok: false; readonly issue: McpImportIssue };

/**
 * Translates one published tool into a descriptor, or refuses it with a reason.
 *
 * Every refusal is a *silent absence* from the catalog rather than a thrown error, because a server
 * publishing one unusable tool must not prevent the usable ones from being imported. Absence is
 * still refusal: an operation that is not in the catalog is not projectable, and the importer's
 * executor rejects a request for it even if something upstream manufactured one.
 */
export function translateTool(input: TranslateToolInput): TranslateToolResult {
  const identity = resolveImportedOperationId(input.binding);
  if (!identity.ok) {
    return { ok: false, issue: { tool: input.binding.tool, reason: identity.reason, message: identity.message } };
  }

  if (input.tool.inputSchema === undefined || input.tool.inputSchema === null) {
    return {
      ok: false,
      issue: {
        tool: input.binding.tool,
        reason: "input_schema_missing",
        message: "the server published no inputSchema, so there is no input contract to expose to a model",
      },
    };
  }

  const translated = objectSchemaFromJsonSchema(input.tool.inputSchema);
  if (!translated.ok) {
    return {
      ok: false,
      issue: {
        tool: input.binding.tool,
        reason: "input_schema_not_translatable",
        message:
          "the published inputSchema uses constructs the current ArrokothI value-schema vocabulary cannot hold " +
          "losslessly; it is refused rather than weakened",
        schemaIssues: translated.issues,
      },
    };
  }

  // Information, copied. `description` is what a model reads; it is not trusted, and it grants
  // nothing - a description containing instructions is untrusted content like any other.
  const description = typeof input.tool.description === "string" ? input.tool.description : undefined;
  const title = typeof input.tool.title === "string" ? input.tool.title : undefined;

  return {
    ok: true,
    imported: {
      descriptor: {
        capability: input.capability,
        operation: identity.operation,
        // Local configuration or the conservative default. Never the remote annotation.
        consequential: input.binding.consequential ?? input.defaultConsequential,
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        input: translated.schema,
        ...(input.binding.groups !== undefined ? { groups: [...input.binding.groups] } : {}),
      },
      identitySource: identity.source,
      advisory: {
        tool: input.tool.name,
        ...(input.tool.annotations !== undefined
          ? { annotations: structuredClone(input.tool.annotations) as Record<string, unknown> }
          : {}),
      },
    },
  };
}
