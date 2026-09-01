/**
 * `@agent-sdk/integration-mcp` - the Model Context Protocol adapter.
 *
 * This package exists so that MCP SDK and wire types live in exactly one place. `@agent-sdk/core`
 * has no MCP dependency and no MCP import; the dependency direction is one-way:
 *
 * ```text
 * MCP SDK (@modelcontextprotocol/client, @modelcontextprotocol/server)
 *        v
 * this adapter
 *        v
 * @agent-sdk/core   portable descriptors, CapabilityExecutor, value schema
 * ```
 *
 * Two narrow, synchronous directions are implemented and nothing else:
 *
 * ```text
 * import   an MCP Tool becomes an ordinary CapabilityOperationDescriptor plus a CapabilityExecutor
 * export   one explicitly named capability operation becomes one MCP Tool
 * ```
 *
 * MCP Resources, Prompts, Tasks, elicitation, subscriptions, notifications, sampling, and OAuth are
 * deliberately absent. So is any MCP-shaped Effect, Event, authority record, or AgentSpec field:
 * importing a Tool changes what an application *can* describe, never what an Execution may do.
 */

export type {
  McpSchemaIssue,
  McpSchemaIssueCode,
  McpSchemaTranslation,
} from "./schema/from-json-schema.ts";
export { describeSchemaIssues, objectSchemaFromJsonSchema } from "./schema/from-json-schema.ts";

export type {
  McpIdentityRefusal,
  McpIdentityResolution,
  McpToolBinding,
} from "./import/identity.ts";
export { resolveImportedOperationId } from "./import/identity.ts";

export type {
  McpAdvisoryToolMetadata,
  McpImportIssue,
  McpImportRefusalReason,
  McpImportedOperation,
  TranslateToolInput,
  TranslateToolResult,
} from "./import/descriptor.ts";
export { translateTool } from "./import/descriptor.ts";

export type { NormalizeErrorInput, NormalizeResultInput } from "./import/result.ts";
export { normalizeCallToolError, normalizeCallToolResult } from "./import/result.ts";

export type { McpImportOptions, McpImportSnapshot, McpToolClient } from "./import/importer.ts";
export { importMcpTools, importMcpToolsStrict, McpImportRefusedError } from "./import/importer.ts";

export type {
  McpExportHandler,
  McpExportInvocation,
  McpExportOptions,
  McpExportedTool,
  McpOperationExport,
} from "./export/tools.ts";
export { exportCapabilityOperationsAsMcpTools, McpExportError } from "./export/tools.ts";
