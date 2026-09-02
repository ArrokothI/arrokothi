/**
 * Architecture assertions for the MCP adapter boundary.
 *
 * The claim this slice makes is not "MCP works". It is that MCP works *without becoming a kernel
 * concern*, and only an import graph can prove that. These cases walk the real files and the real
 * manifests:
 *
 * ```text
 * @modelcontextprotocol/*  ->  packages/interoperability/mcp  ->  @agent-sdk/core
 * ```
 *
 * and never the reverse. They also check the two ways a protocol can leak into a kernel without a
 * dependency edge: a wire type copied into core by hand, and a new Effect or Event arm added to make
 * a protocol convenient.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CORE_SRC = resolve(REPO_ROOT, "packages/core/src");
const MCP_SRC = resolve(REPO_ROOT, "packages/interoperability/mcp/src");
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g;

/**
 * Import specifiers in a module's *code*.
 *
 * Comments are stripped first. These files explain themselves in prose, and an English sentence can
 * easily put an import-looking keyword immediately before a quoted phrase - which would make a
 * scanner over raw text report a paragraph as a dependency.
 */
function specifiersIn(source: string): string[] {
  return [...codeOf(source).matchAll(IMPORT_SPECIFIER)].map((match) => match[1]!);
}

/**
 * A module with its comments removed.
 *
 * These files explain their own boundaries in prose, so a name-grep over the raw text would fail on
 * the very sentence that documents the rule it is checking.
 */
function codeOf(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

async function tsFilesUnder(root: string): Promise<string[]> {
  return (await readdir(root, { recursive: true })).filter((path) => path.endsWith(".ts"));
}

async function manifest(relativePath: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(resolve(REPO_ROOT, relativePath), "utf8")) as Record<string, unknown>;
}

/** Transitive closure over relative imports inside one package's source tree. */
async function walk(root: string, entries: readonly string[]): Promise<{ files: Set<string>; bare: Map<string, string[]> }> {
  const files = new Set<string>();
  const bare = new Map<string, string[]>();
  const queue = [...entries];
  while (queue.length > 0) {
    const relativePath = queue.pop()!;
    if (files.has(relativePath)) continue;
    files.add(relativePath);
    const absolute = resolve(root, relativePath);
    const source = await readFile(absolute, "utf8");
    for (const specifier of specifiersIn(source)) {
      if (!specifier.startsWith(".")) {
        bare.set(specifier, [...(bare.get(specifier) ?? []), relativePath]);
        continue;
      }
      queue.push(relative(root, resolve(dirname(absolute), specifier)));
    }
  }
  return { files, bare };
}

const MCP_PACKAGE_NAMES = [
  "@modelcontextprotocol/sdk",
  "@modelcontextprotocol/client",
  "@modelcontextprotocol/server",
  "@modelcontextprotocol/core",
];

describe("MCP is an adapter dependency, never a kernel one", () => {
  test("no core source file imports or names an MCP package", async () => {
    const violations: string[] = [];
    for (const path of await tsFilesUnder(CORE_SRC)) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const specifier of specifiersIn(source)) {
        if (specifier.startsWith("@modelcontextprotocol")) violations.push(`${path} imports ${specifier}`);
      }
      const code = codeOf(source);
      for (const name of ["@modelcontextprotocol", "McpServer", "InMemoryTransport", "CallToolResult", "ListToolsResult"]) {
        if (code.includes(name)) violations.push(`${path} names ${name}`);
      }
    }
    assert.deepEqual(violations, [], "MCP SDK and wire types stay outside packages/core");
  });

  test("core's manifest declares no MCP dependency", async () => {
    const core = await manifest("packages/core/package.json");
    for (const section of ["dependencies", "peerDependencies", "optionalDependencies", "devDependencies"]) {
      const declared = Object.keys((core[section] as Record<string, string> | undefined) ?? {});
      for (const mcp of MCP_PACKAGE_NAMES) {
        assert.equal(declared.includes(mcp), false, `packages/core declares ${mcp} under ${section}`);
      }
    }
  });

  test("the adapter depends inward, and is the only workspace package that declares MCP", async () => {
    const adapter = await manifest("packages/interoperability/mcp/package.json");
    assert.equal(adapter["name"], "@agent-sdk/integration-mcp");
    const dependencies = adapter["dependencies"] as Record<string, string>;
    assert.equal(dependencies["@agent-sdk/core"], "*", "the adapter depends on the kernel");
    assert.equal(dependencies["@modelcontextprotocol/client"], "2.0.0");
    assert.equal(dependencies["@modelcontextprotocol/server"], "2.0.0");
    assert.equal(
      "@modelcontextprotocol/sdk" in dependencies,
      false,
      "the legacy v1 monolithic SDK is not used; v2's split packages are the stable line",
    );

    const root = await manifest("package.json");
    const workspaces = root["workspaces"] as string[];
    assert.ok(workspaces.includes("packages/interoperability/mcp"), "the adapter is a workspace member");

    const others: string[] = [];
    for (const workspace of workspaces) {
      if (workspace === "packages/interoperability/mcp") continue;
      const other = await manifest(`${workspace}/package.json`);
      for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
        const declared = Object.keys((other[section] as Record<string, string> | undefined) ?? {});
        for (const mcp of MCP_PACKAGE_NAMES) {
          if (declared.includes(mcp)) others.push(`${workspace} declares ${mcp}`);
        }
      }
    }
    assert.deepEqual(others, [], "exactly one package holds the protocol dependency");
  });

  test("the adapter's only package dependencies are the kernel surface and the MCP SDK", async () => {
    const { bare } = await walk(MCP_SRC, ["index.ts"]);
    assert.deepEqual(
      [...bare.keys()].sort(),
      [
        "@agent-sdk/core/execution",
        "@agent-sdk/core/ports",
        "@agent-sdk/core/reference",
        "@modelcontextprotocol/client",
        "@modelcontextprotocol/server",
      ],
      "no HTTP framework, no transport library, no validator, and no second kernel entry point",
    );
  });

  test("the adapter reaches the kernel only through its published entry points", async () => {
    const violations: string[] = [];
    for (const path of await tsFilesUnder(MCP_SRC)) {
      const source = await readFile(resolve(MCP_SRC, path), "utf8");
      for (const specifier of specifiersIn(source)) {
        if (specifier.startsWith("@agent-sdk/core") || specifier.startsWith(".") || specifier.startsWith("@modelcontextprotocol")) {
          continue;
        }
        violations.push(`${path} imports ${specifier}`);
      }
      if (source.includes("packages/core/src")) violations.push(`${path} reaches into core's source layout`);
    }
    assert.deepEqual(violations, []);
  });

  test("the export path holds no dispatcher, policy evaluator, grant, store, or Harness", async () => {
    // An inbound external call must not be able to become an authorized Arrokoth Effect. The
    // strongest form of that claim is that the module has nothing to make one with.
    const code = codeOf(await readFile(resolve(MCP_SRC, "export/tools.ts"), "utf8"));
    for (const forbidden of [
      "CapabilityExecutor",
      "AuthorizedCapabilityRequest",
      "AuthorizedGrant",
      "EffectAuthorizer",
      "EffectiveOperationAuthority",
      "RuntimeStore",
      "Harness",
      "createExecution",
      "useCapability",
      "ExecutionId",
    ]) {
      assert.equal(code.includes(forbidden), false, `the export path must not name ${forbidden}`);
    }
  });

  test("the import path holds no runtime state, authority, or exposure machinery", async () => {
    // An executor is allowed to hold an MCP client. It is not allowed to hold anything that would
    // let it observe or change what the Execution is permitted to do.
    for (const path of ["import/importer.ts", "import/descriptor.ts", "import/identity.ts", "import/result.ts"]) {
      const code = codeOf(await readFile(resolve(MCP_SRC, path), "utf8"));
      for (const forbidden of [
        "RuntimeStore",
        "Harness",
        "EffectAuthorizer",
        "EffectiveOperationAuthority",
        "ActiveOperationView",
        "ModelActionProjection",
        "AgentSpec",
        "AgentController",
        "AgentExecutor",
        "Scheduler",
        "settleEffect",
      ]) {
        assert.equal(code.includes(forbidden), false, `${path} must not name ${forbidden}`);
      }
    }
  });

  test("no MCP Effect or Event vocabulary was introduced", async () => {
    // Checked at the source of truth for both vocabularies rather than by inspecting a run: a new
    // arm would have to appear in one of these two unions.
    const events = await readFile(resolve(CORE_SRC, "interaction/events.ts"), "utf8");
    const effects = await readFile(resolve(CORE_SRC, "effects/types.ts"), "utf8");
    const declared = events.slice(events.indexOf("export const EVENT_KINDS"));
    const eventKinds = [...declared.slice(0, declared.indexOf("];")).matchAll(/"([a-z_.]+)"/g)].map((match) => match[1]!);
    assert.deepEqual(
      [...eventKinds].sort(),
      [
        "capability.completed",
        "capability.failed",
        "capability.unknown",
        // Slice E.0 added the child-composition kinds and E.1 added child.cancelled + the peer
        // messaging kinds; the MCP slice added nothing.
        "child.cancelled",
        "child.completed",
        "child.failed",
        "child.spawned",
        // Slice E.2 added confirmation.declined for mechanical confirmation and user.input for the
        // RequestUserInput runtime; the MCP slice added nothing.
        "confirmation.declined",
        "effect.denied",
        "effect.rejected",
        "external.input",
        // Slice F.0 added this kernel-owned Structured Memory result; MCP still added nothing.
        "memory.written",
        "message.sent",
        "peer.message",
        "user.input",
      ],
      "the Event vocabulary carries only kernel kinds - no MCP arm",
    );
    for (const source of [events, effects]) {
      for (const forbidden of ["mcp", "Mcp", "MCP", "tools/call", "tools/list", "structuredContent"]) {
        assert.equal(codeOf(source).includes(forbidden), false, `Effect/Event vocabulary must not mention ${forbidden}`);
      }
    }
  });

  test("no AgentSpec, controller, or Agent executor gained an MCP field", async () => {
    for (const path of [
      "agent/spec.ts",
      "agent/validation.ts",
      "controllers/agent/controller.ts",
      "reference/agent-executor.ts",
      "ports/agent-executor.ts",
      "ports/capability-catalog.ts",
      "ports/capability-executor.ts",
    ]) {
      const code = codeOf(await readFile(resolve(CORE_SRC, path), "utf8"));
      for (const forbidden of ["mcp", "Mcp", "MCP", "Tool", "toolName"]) {
        assert.equal(code.includes(forbidden), false, `${path} must not mention ${forbidden}`);
      }
    }
  });

  test("the protocol dependency appears only where it belongs", async () => {
    // A repo-wide sweep, so a future convenience import somewhere unexpected is a failing test
    // rather than a silent widening of the boundary.
    const allowed = [
      "packages/interoperability/mcp/",
      "tests/conformance/mcp/",
      // Exactly one behavioural case, which needs a real MCP server to compare against a native
      // executor. The ten-case reference matrix is deliberately not duplicated for MCP.
      "tests/evals/agent/mcp-operation-parity.eval.test.ts",
      "scripts/mcp-gemini-canary.ts",
    ];
    const roots = ["packages", "apps", "examples", "scripts", "tests"];
    const violations: string[] = [];
    for (const root of roots) {
      const absolute = resolve(REPO_ROOT, root);
      for (const path of (await readdir(absolute, { recursive: true })).filter((entry) => entry.endsWith(".ts"))) {
        const relativePath = `${root}/${path}`;
        if (relativePath.includes("node_modules/")) continue;
        const source = await readFile(resolve(absolute, path), "utf8");
        if (!specifiersIn(source).some((specifier) => specifier.startsWith("@modelcontextprotocol"))) continue;
        if (allowed.some((prefix) => relativePath.startsWith(prefix))) continue;
        violations.push(relativePath);
      }
    }
    assert.deepEqual(violations, [], "only the adapter, its conformance cases, and the live canary import the SDK");
  });
});
