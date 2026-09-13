/**
 * Architecture assertions for the published 0.8.x surface of `@arrokothi/core`.
 *
 * Renamed from `kernel-boundaries.test.ts` by K1.0 without changing what it asserts. The graph it
 * walks is the current Harness/controller implementation, which K1.0 classifies as the explicitly
 * legacy zone; calling it "the kernel" reinforced the ownership model the target architecture
 * replaces. Every assertion below is retained verbatim, including the vendor-neutrality guard, and
 * is now attributed to the zone it actually covers. The target Kernel zone has its own guard in
 * `kernel-landing-zone.test.ts`.
 *
 * The one behavioural change is the scanner: `specifiersIn` was a raw-text regex that read prose
 * ending in the preposition "from" before a quoted term as a bare import (K0.2-SELF-01). It is
 * replaced by the shared comment- and string-aware scanner, whose fidelity in both directions is
 * asserted by `import-scanner.test.ts`.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { importSpecifiersIn as specifiersIn } from "./module-graph.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CORE_SRC = resolve(REPO_ROOT, "packages/core/src");

/** Entry modules whose transitive graph must remain provider-neutral and dependency-free. */
const LEGACY_ENTRY_MODULES = [
  "execution-api.ts",
  "controllers/agent/controller.ts",
  "controllers/workflow/controller.ts",
  "ports/index.ts",
  "reference/index.ts",
  "runtime/harness.ts",
  "testing/scripted-controllers.ts",
  "testing/execution-harness.ts",
  "testing/workflow.ts",
  "testing/agent.ts",
  "testing/contracts/index.ts",
];

/** Directories and files the legacy core path owns. */
const LEGACY_CORE_OWNED = [
  "agent/",
  "controllers/",
  "definitions/",
  "effects/",
  "execution/",
  "interaction/",
  "model/",
  "operations/",
  "ports/",
  "reference/",
  "testing/contracts/",
  "workflow/",
];
const LEGACY_CORE_OWNED_FILES = [
  "execution-api.ts",
  "testing/workflow.ts",
  "testing/agent.ts",
  "runtime/activation.ts",
  "runtime/controller-registry.ts",
  "runtime/effect-processor.ts",
  "runtime/event-router.ts",
  "runtime/harness.ts",
  "runtime/resumption-processor.ts",
  "testing/scripted-controllers.ts",
  "testing/execution-harness.ts",
  "testing/structured-memory.ts",
  "testing/derived-semantic-memory.ts",
];

/**
 * Dependency-free leaves the legacy core path is allowed to reuse. The allowlist is explicit so
 * unrelated implementation code cannot drift into the semantic graph.
 */
const ALLOWED_LEAVES = ["schema/value-schema.ts", "util/hash.ts", "util/json.ts", "util/result.ts"];

const FORBIDDEN_VENDOR = [
  "@langchain/core",
  "@langchain/textsplitters",
  "@strands-agents/sdk",
  "@google/genai",
  "node:sqlite",
  "better-sqlite3",
  "@arrokothi/integration-strands",
  "@arrokothi/provider-gemini",
];

function isOwned(relativePath: string): boolean {
  return LEGACY_CORE_OWNED.some((dir) => relativePath.startsWith(dir)) || LEGACY_CORE_OWNED_FILES.includes(relativePath);
}

interface Graph {
  readonly files: Set<string>;
  readonly bare: Map<string, string[]>;
}

/** Transitive closure over relative imports, starting from the given modules. */
async function walkGraph(entries: readonly string[]): Promise<Graph> {
  const files = new Set<string>();
  const bare = new Map<string, string[]>();
  const queue = [...entries];

  while (queue.length > 0) {
    const relativePath = queue.pop()!;
    if (files.has(relativePath)) continue;
    files.add(relativePath);

    const absolute = resolve(CORE_SRC, relativePath);
    const source = await readFile(absolute, "utf8");
    for (const specifier of specifiersIn(source)) {
      if (!specifier.startsWith(".")) {
        bare.set(specifier, [...(bare.get(specifier) ?? []), relativePath]);
        continue;
      }
      queue.push(relative(CORE_SRC, resolve(dirname(absolute), specifier)));
    }
  }

  return { files, bare };
}

function walkLegacyGraph(): Promise<Graph> {
  return walkGraph(LEGACY_ENTRY_MODULES);
}

async function coreSourceFiles(): Promise<string[]> {
  return (await readdir(CORE_SRC, { recursive: true })).filter((path) => path.endsWith(".ts"));
}

describe("Legacy core (0.8.x) architecture boundaries", () => {
  test("the legacy core import graph reuses only the declared dependency-free leaves", async () => {
    const { files } = await walkLegacyGraph();
    const outside = [...files].filter((path) => !isOwned(path)).sort();
    assert.deepEqual(outside, [...ALLOWED_LEAVES].sort(), "reuse outside the legacy core graph is explicit and small");
  });

  test("the legacy core import graph has no external dependency at all", async () => {
    const { bare } = await walkLegacyGraph();
    assert.deepEqual(
      [...bare.keys()].sort(),
      [],
      `the legacy core path imports no package and no runtime builtin (found: ${[...bare.entries()].map(([s, f]) => `${s} in ${f.join(", ")}`).join("; ")})`,
    );
  });

  test("no vendor, storage, or application package name appears in legacy core sources", async () => {
    const { files } = await walkLegacyGraph();
    const violations: string[] = [];
    for (const path of files) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const vendor of FORBIDDEN_VENDOR) {
        if (source.includes(vendor)) violations.push(`${path} mentions ${vendor}`);
      }
    }
    assert.deepEqual(violations, []);
  });

  test("conformance tests use published package surfaces", async () => {
    const conformanceRoot = resolve(REPO_ROOT, "tests/conformance");
    const allowed = new Set([
      "@arrokothi/core",
      "@arrokothi/core/execution",
      // K1.0's landing-zone guard imports the target zone by its package specifier, which is what
      // proves the specifier resolves and that the declared entry exposes only the refusal. That is
      // a published package surface, not a reach into internals, and the same guard separately
      // asserts it is the only importer of the zone anywhere outside the zone.
      "@arrokothi/kernel",
      "@arrokothi/core/ports",
      "@arrokothi/core/reference",
      "@arrokothi/core/testing",
      // The retrieval conformance cases must exercise a real implementation of the capability and
      // local-resource ports, and proving the extraction is part of what they assert.
      "@arrokothi/retrieval-local",
      // The MCP conformance cases must exercise a real protocol adapter against a real MCP
      // client/server pair. "the server received zero calls" is only evidence when the server is
      // genuine, so the SDK is imported here deliberately - and nowhere else outside the adapter,
      // which `architecture/mcp-boundaries.test.ts` asserts repo-wide.
      "@arrokothi/integration-mcp",
      "@modelcontextprotocol/client",
      "@modelcontextprotocol/server",
    ]);
    const violations: string[] = [];

    for (const path of (await readdir(conformanceRoot, { recursive: true })).filter((p) => p.endsWith(".ts"))) {
      const source = await readFile(resolve(conformanceRoot, path), "utf8");
      for (const specifier of specifiersIn(source)) {
        if (specifier.startsWith("node:")) continue;
        // A relative import stays inside the conformance tree; shared fixtures live there.
        if (specifier.startsWith(".")) continue;
        if (allowed.has(specifier)) continue;
        violations.push(`${path} imports ${specifier}`);
      }
    }

    assert.deepEqual(violations, [], "conformance asserts semantics through published package surfaces only");
  });

  test("the controller boundary cannot reach an executor, policy, journal, or store", async () => {
    // Asserted on the import graph rather than on the shape of one object, because the claim is
    // about what a controller *could* be given, not about what today's Harness happens to pass.
    const { files } = await walkGraph(["ports/controller.ts"]);
    const forbidden = [
      "ports/capability-executor.ts",
      "ports/effect-authorizer.ts",
      "ports/runtime-store.ts",
      "ports/scheduler.ts",
      "ports/definition-store.ts",
      "ports/inline-wait.ts",
      "effects/journal.ts",
      "effects/pending.ts",
      "effects/authorization.ts",
      "effects/capability.ts",
      "runtime/harness.ts",
      "runtime/effect-processor.ts",
      "runtime/event-router.ts",
    ];
    assert.deepEqual(
      [...files].filter((path) => forbidden.includes(path)),
      [],
      "a controller proposes Effects as data; it is handed nothing that authorizes, dispatches, journals, persists, or schedules",
    );
  });

  test("no controller-reachable module mentions settlement ingress", async () => {
    // Belt and suspenders alongside the import-graph check above: `settleEffect` is trusted
    // runtime/integration ingress, never an Agent/Workflow/Stage capability. This greps text, not
    // just imports, so the rule survives
    // even a future refactor that moves `settleEffect` somewhere the import-graph check does not
    // yet name. It is written against `ports/controller.ts` specifically so it keeps protecting
    // the same boundary if the Stage execution context evolves.
    const { files } = await walkGraph(["ports/controller.ts"]);
    const violations: string[] = [];
    for (const path of files) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      if (source.includes("settleEffect")) violations.push(path);
    }
    assert.deepEqual(
      violations,
      [],
      "a controller may propose an Effect; only trusted runtime/integration ingress may report what happened to one",
    );
  });

  test("the capability boundary cannot reach Execution state, the store, or the Harness", async () => {
    const { files } = await walkGraph(["ports/capability-executor.ts"]);
    const forbidden = [
      "execution/context.ts",
      "execution/lifecycle.ts",
      "execution/terminal-result.ts",
      "execution/emission.ts",
      "ports/runtime-store.ts",
      "ports/scheduler.ts",
      "ports/controller.ts",
      "runtime/harness.ts",
      "runtime/effect-processor.ts",
      "effects/journal.ts",
      "effects/pending.ts",
    ];
    assert.deepEqual(
      [...files].filter((path) => forbidden.includes(path)),
      [],
      "an executor returns observations; it has no route to mutate an ExecutionContext, a mailbox, or a lifecycle",
    );
  });

  test("the authorization boundary sees requests, not runtime machinery", async () => {
    const { files } = await walkGraph(["ports/effect-authorizer.ts"]);
    const forbidden = [
      "ports/runtime-store.ts",
      "ports/scheduler.ts",
      "ports/capability-executor.ts",
      "runtime/harness.ts",
      "runtime/effect-processor.ts",
      "effects/journal.ts",
      "effects/pending.ts",
      "execution/context.ts",
    ];
    assert.deepEqual(
      [...files].filter((path) => forbidden.includes(path)),
      [],
      "policy decides about a described request and cannot reach what would carry it out",
    );
  });

  test("the model provider boundary cannot reach Effects, Execution state, or runtime machinery", async () => {
    const { files } = await walkGraph(["ports/model-provider.ts", "ports/model-resolver.ts"]);
    const forbiddenPrefixes = ["effects/", "execution/", "runtime/", "capabilities/"];
    const forbiddenFiles = [
      "ports/capability-executor.ts",
      "ports/effect-authorizer.ts",
      "ports/runtime-store.ts",
      "ports/scheduler.ts",
      "ports/controller.ts",
    ];
    assert.deepEqual(
      [...files].filter((path) => forbiddenFiles.includes(path) || forbiddenPrefixes.some((prefix) => path.startsWith(prefix))),
      [],
      "a model provider returns inference data and has no path to mutate, authorize, dispatch, persist, or schedule",
    );
  });

  test("model-call and capability-call data cannot dispatch a capability directly", async () => {
    const source = await readFile(resolve(CORE_SRC, "model/types.ts"), "utf8");
    for (const forbidden of ["CapabilityExecutor", "EffectProposal", "EffectRequest", "RuntimeStore", "Harness"]) {
      assert.equal(source.includes(forbidden), false, `portable model data must not mention ${forbidden}`);
    }
    assert.match(source, /no executor and grants no authority/);
  });

  test("Gemini implements the core port and core never imports Gemini", async () => {
    const geminiSource = await readFile(resolve(REPO_ROOT, "packages/models/gemini/src/index.ts"), "utf8");
    assert.equal(geminiSource.includes("@arrokothi/core/ports"), true);
    const reverseImports: string[] = [];
    for (const path of await coreSourceFiles()) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      if (specifiersIn(source).some((specifier) =>
        specifier === "@arrokothi/provider-gemini" || specifier.includes("packages/models/gemini"))) {
        reverseImports.push(path);
      }
    }
    assert.deepEqual(reverseImports, [], "the vendor adapter depends inward; the legacy core never depends outward on Gemini");
  });

  test("the published entry points are the ones the package exports", async () => {
    const manifest = JSON.parse(await readFile(resolve(REPO_ROOT, "packages/core/package.json"), "utf8")) as {
      exports: Record<string, string>;
    };
    assert.equal(manifest.exports["."], "./src/index.ts");
    assert.equal(manifest.exports["./execution"], "./src/execution-api.ts");
    assert.equal(manifest.exports["./ports"], "./src/ports/index.ts");
    assert.equal(manifest.exports["./reference"], "./src/reference/index.ts");
    assert.equal(manifest.exports["./testing"], "./src/testing/index.ts");
  });

  test("the package root and focused execution entry point expose the same semantic API", async () => {
    const rootApi = await import("@arrokothi/core");
    const executionApi = await import("@arrokothi/core/execution");
    assert.deepEqual(Object.keys(rootApi).sort(), Object.keys(executionApi).sort());
  });
});
