/**
 * The MCP importer: discovery produces an immutable local snapshot, and nothing else.
 *
 * ```text
 * already-connected MCP client
 *        | tools/list
 * discovered tools
 *        | local identity + lossless schema translation
 * ordinary CapabilityOperationDescriptors  ->  ordinary CapabilityCatalog
 *        +
 * an MCP-backed CapabilityExecutor
 * ```
 *
 * What discovery is *not* is the entire point of this file. Importing a tool puts a descriptor in a
 * catalog; it grants nothing. The imported operation still has to be inside the Execution's
 * effective operation authority, still has to survive Active View resolution, still has to be
 * projected, selected, resolved through that exact projection, proposed as an ordinary
 * `UseCapability`, checked against the current ceiling by the Effect gateway, and allowed by the
 * `EffectAuthorizer` - before a single `tools/call` happens. None of that machinery knows MCP
 * exists, and none of it is touched here.
 *
 * ```text
 * protocol discovery   != authority
 * schema visibility    != authority
 * external identifier  != credential
 * ```
 *
 * The snapshot is immutable and taken once. There is no refresh, no `notifications/tools/list_changed`
 * subscription, and no dynamic descriptor invalidation in this slice: a catalog that could change
 * underneath an Active View would make a projection snapshot mean something different at dispatch,
 * and that is a separate design question from the one this proof answers.
 */

import type { Client, Tool } from "@modelcontextprotocol/client";
import type {
  AuthorizedCapabilityRequest,
  CapabilityCatalog,
  CapabilityExecutionEnvironment,
  CapabilityExecutor,
  CapabilityOutcome,
  OperationRef,
} from "@agent-sdk/core/ports";
import { capabilityId } from "@agent-sdk/core/execution";
import { createCapabilityCatalog } from "@agent-sdk/core/reference";
import type { McpImportIssue, McpImportedOperation } from "./descriptor.ts";
import { translateTool } from "./descriptor.ts";
import type { McpToolBinding } from "./identity.ts";
import { normalizeCallToolError, normalizeCallToolResult } from "./result.ts";

/**
 * The client edge.
 *
 * Structurally the two methods of the official `Client`, so a real connected client is passed
 * directly and a test double is a plain object. Deliberately *not* a re-declaration of the protocol
 * types: `Tool` and `CallToolResult` come from the SDK, at the only boundary where they belong.
 */
export type McpToolClient = Pick<Client, "listTools" | "callTool">;

export interface McpImportOptions {
  /**
   * The local Arrokoth capability namespace every imported tool lands in.
   *
   * Required, and supplied by the importing application. The remote server cannot choose it,
   * influence it, or overwrite it - which is what keeps `external.lookup/lookup_code` an identity
   * the application decided rather than one a peer announced.
   */
  readonly capability: string;
  /** An already-connected MCP client. Connection, transport, and auth are the caller's business. */
  readonly client: McpToolClient;
  /**
   * Which tools to import, and how.
   *
   * Absent means "every tool the server published", each under its own name when that name is
   * already a valid `OperationId`. Present means exactly these, which is the form an application
   * should prefer: it fixes identity and consequentiality locally before anything is discovered.
   */
  readonly tools?: readonly McpToolBinding[];
  /**
   * Consequentiality for an imported tool that local configuration did not classify.
   *
   * Defaults to `true`. An imported operation nobody classified is assumed to be able to change the
   * world, so a lost response is an unknown outcome rather than a retryable failure.
   */
  readonly defaultConsequential?: boolean;
}

/**
 * One discovery, frozen.
 *
 * Everything here is plain data except `executor`, which is the one object that legitimately holds
 * the MCP client - because that is what a `CapabilityExecutor` is for.
 */
export interface McpImportSnapshot {
  /** The local capability namespace these operations belong to. */
  readonly capability: string;
  /** Ordinary descriptors, ready for the ordinary catalog. */
  readonly operations: readonly McpImportedOperation[];
  /** Everything discovered or requested and deliberately not imported, with a reason. */
  readonly issues: readonly McpImportIssue[];
  /** A `CapabilityCatalog` over the imported descriptors, built by the reference factory. */
  readonly catalog: CapabilityCatalog;
  /** The MCP-backed executor. It implements the existing port and receives nothing else. */
  readonly executor: CapabilityExecutor;
  /** The identities that were imported, for wiring an authority grant or an exposure request. */
  refs(): readonly OperationRef[];
}

/** Raised when an application asked for strict import and the server published something unusable. */
export class McpImportRefusedError extends Error {
  readonly issues: readonly McpImportIssue[];
  constructor(issues: readonly McpImportIssue[]) {
    super(
      `the MCP import refused ${issues.length} tool(s): ` +
        issues.map((entry) => `${entry.tool} (${entry.reason})`).join(", "),
    );
    this.name = "McpImportRefusedError";
    this.issues = issues;
  }
}

/** The remote routing table: local operation id -> remote tool name. Never leaves the executor. */
type RoutingTable = ReadonlyMap<string, string>;

/**
 * The MCP-backed `CapabilityExecutor`.
 *
 * Read what it holds: a client, a capability name, and a routing table. It does not hold - and the
 * port gives it no way to obtain - a Harness, a runtime store, execution controller state, an Active
 * View, a model projection, or any authority record. It is handed an authorized request and answers
 * with an observation, exactly like every other executor.
 *
 * Two refusals happen before any network work, and both are about identity rather than policy. A
 * request naming a different capability, or an operation this snapshot never imported, is refused
 * outright: the routing table is the only route to a tool name, so nothing upstream can cause a
 * `tools/call` for a tool that was never imported - not a mis-wired authority grant, not a hostile
 * Active View, not a hand-built proposal.
 */
class McpCapabilityExecutor implements CapabilityExecutor {
  private readonly client: McpToolClient;
  private readonly capability: string;
  private readonly routes: RoutingTable;

  constructor(client: McpToolClient, capability: string, routes: RoutingTable) {
    this.client = client;
    this.capability = capability;
    this.routes = routes;
  }

  async execute(
    request: AuthorizedCapabilityRequest,
    _environment: CapabilityExecutionEnvironment,
  ): Promise<CapabilityOutcome> {
    if (request.capability !== this.capability) {
      return {
        status: "failure",
        error: {
          code: "mcp_capability_not_imported",
          message:
            `this executor backs capability "${this.capability}" and was asked for "${request.capability}"; ` +
            "an executor routes what it imported and never guesses at the rest",
        },
      };
    }

    const tool = this.routes.get(request.operation);
    if (tool === undefined) {
      return {
        status: "failure",
        error: {
          code: "mcp_operation_not_imported",
          message:
            `"${request.capability}/${request.operation}" is not in this import snapshot, so there is no remote tool ` +
            "to call; a request for it never reaches the server",
        },
      };
    }

    try {
      const result = await this.client.callTool({ name: tool, arguments: { ...request.input } });
      return normalizeCallToolResult({
        result,
        tool,
        consequential: request.authorization.consequential,
      });
    } catch (error) {
      // Consequentiality comes from the authorization decision, which is the only place that owns
      // it. The adapter reads it; it never asserts it.
      return normalizeCallToolError({ error, tool, consequential: request.authorization.consequential });
    }
  }
}

/**
 * Discovers an MCP server's tools and builds one immutable local snapshot.
 *
 * The whole function is discovery plus translation. It performs no `tools/call`, writes no authority,
 * touches no Execution, and returns nothing that can dispatch by itself.
 */
export async function importMcpTools(options: McpImportOptions): Promise<McpImportSnapshot> {
  // Validated locally and immediately: a capability namespace that would not brand is a wiring
  // error, and it must not become a descriptor nobody can grant.
  const capability = capabilityId(options.capability);
  const defaultConsequential = options.defaultConsequential ?? true;

  const listed = await options.client.listTools();
  const published = new Map<string, Tool>();
  for (const tool of listed.tools) published.set(tool.name, tool);

  const bindings: readonly McpToolBinding[] =
    options.tools ?? [...published.values()].map((tool) => ({ tool: tool.name }));

  const operations: McpImportedOperation[] = [];
  const issues: McpImportIssue[] = [];

  for (const binding of bindings) {
    const tool = published.get(binding.tool);
    if (tool === undefined) {
      issues.push({
        tool: binding.tool,
        reason: "tool_not_published",
        message: `the server's tools/list does not contain a tool named ${JSON.stringify(binding.tool)}`,
      });
      continue;
    }
    const translated = translateTool({ capability, tool, binding, defaultConsequential });
    if (translated.ok) operations.push(translated.imported);
    else issues.push(translated.issue);
  }

  const routes = new Map<string, string>();
  for (const imported of operations) routes.set(imported.descriptor.operation, imported.advisory.tool);

  const catalog = createCapabilityCatalog(operations.map((imported) => imported.descriptor));
  const executor = new McpCapabilityExecutor(options.client, capability, routes);
  const refs: readonly OperationRef[] = operations.map((imported) => ({
    capability,
    operation: imported.descriptor.operation,
  }));

  return {
    capability,
    operations: Object.freeze([...operations]),
    issues: Object.freeze([...issues]),
    catalog,
    executor,
    refs() {
      return refs;
    },
  };
}

/**
 * The strict form: the same import, but a refusal is an error rather than an absence.
 *
 * Useful when an application's wiring names exact tools and a missing or untranslatable one is a
 * deployment defect it wants to hear about at startup rather than discover as an Agent that never
 * saw the operation.
 */
export async function importMcpToolsStrict(options: McpImportOptions): Promise<McpImportSnapshot> {
  const snapshot = await importMcpTools(options);
  if (snapshot.issues.length > 0) throw new McpImportRefusedError(snapshot.issues);
  return snapshot;
}
