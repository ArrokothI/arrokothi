/**
 * Architecture assertions for the v0.4 path.
 *
 * The stated risk for this slice is "a superficially new API backed by legacy machinery", and no
 * amount of naming discipline detects that. So this test walks the actual import graph from the
 * v0.4 entry modules and proves what the new path is made of: nothing from Session, Flow, planning,
 * the old harness or runtime, and no external package at all - only two dependency-free leaves it
 * deliberately reuses.
 *
 * It also checks the boundary in the other direction (legacy code must not start depending on the
 * new substrate, so the old path stays deletable) and that the conformance suite speaks target
 * terminology rather than testing new semantics through legacy APIs.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CORE_SRC = resolve(REPO_ROOT, "packages/core/src");
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g;

/** Everything the v0.4 path is published through. */
const V04_ENTRY_MODULES = [
  "execution-api.ts",
  "ports/index.ts",
  "reference/index.ts",
  "runtime/harness.ts",
  "testing/scripted-controllers.ts",
  "testing/execution-harness.ts",
  "testing/contracts/index.ts",
];

/** Directories and files the v0.4 path owns. */
const V04_OWNED = [
  "definitions/",
  "effects/",
  "execution/",
  "interaction/",
  "model/",
  "ports/",
  "reference/",
  "testing/contracts/",
];
const V04_OWNED_FILES = [
  "execution-api.ts",
  "runtime/activation.ts",
  "runtime/controller-registry.ts",
  "runtime/effect-processor.ts",
  "runtime/event-router.ts",
  "runtime/harness.ts",
  "testing/scripted-controllers.ts",
  "testing/execution-harness.ts",
];

/**
 * Dependency-free leaves the new path is allowed to reuse.
 *
 * The migration plan calls for deliberately reusing the schema language and content hashing rather
 * than duplicating them. Both are pure, import nothing, and already sit at the right ownership
 * level; the allowlist is explicit so nothing else drifts in beside them.
 */
const ALLOWED_LEAVES = ["schema/value-schema.ts", "util/hash.ts", "util/json.ts"];

const FORBIDDEN_LEGACY = [
  "session/",
  "flow/",
  "planning/",
  "harness/",
  "runtime/runtime.ts",
  "runtime/journal.ts",
  "runtime/decision.ts",
  "definition/",
  "knowledge/",
  "tools/",
  "capabilities/",
  "loop/",
  "compiler/",
  "context/",
  "confirmation/",
  "memory/",
  "provider/",
  "trace/",
  "index.ts",
  "testing/index.ts",
  "testing/scripted-provider.ts",
  "testing/fake-executors.ts",
];

const FORBIDDEN_VENDOR = [
  "@langchain/core",
  "@langchain/textsplitters",
  "@strands-agents/sdk",
  "@google/genai",
  "node:sqlite",
  "better-sqlite3",
  "@agent-sdk/integration-strands",
  "@agent-sdk/provider-gemini",
  "@agent-sdk/storage-sqlite",
  "@agent-sdk/studio",
];

function specifiersIn(source: string): string[] {
  return [...source.matchAll(IMPORT_SPECIFIER)].map((match) => match[1]!);
}

function isOwned(relativePath: string): boolean {
  return V04_OWNED.some((dir) => relativePath.startsWith(dir)) || V04_OWNED_FILES.includes(relativePath);
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

function walkV04Graph(): Promise<Graph> {
  return walkGraph(V04_ENTRY_MODULES);
}

async function coreSourceFiles(): Promise<string[]> {
  return (await readdir(CORE_SRC, { recursive: true })).filter((path) => path.endsWith(".ts"));
}

describe("v0.4 architecture boundaries", () => {
  test("the v0.4 import graph reaches no legacy module", async () => {
    const { files } = await walkV04Graph();
    const violations = [...files].filter(
      (path) => !isOwned(path) && FORBIDDEN_LEGACY.some((legacy) => path === legacy || path.startsWith(legacy)),
    );
    assert.deepEqual(violations, [], "the new substrate is not built on Session, Flow, planning, or the old harness/runtime");
  });

  test("the v0.4 import graph reuses only the declared dependency-free leaves", async () => {
    const { files } = await walkV04Graph();
    const outside = [...files].filter((path) => !isOwned(path)).sort();
    assert.deepEqual(outside, [...ALLOWED_LEAVES].sort(), "reuse outside the new ownership area is explicit and small");
  });

  test("the v0.4 import graph has no external dependency at all", async () => {
    const { bare } = await walkV04Graph();
    assert.deepEqual(
      [...bare.keys()].sort(),
      [],
      `the kernel path imports no package and no runtime builtin (found: ${[...bare.entries()].map(([s, f]) => `${s} in ${f.join(", ")}`).join("; ")})`,
    );
  });

  test("no vendor, storage, or application package name appears in the v0.4 sources", async () => {
    const { files } = await walkV04Graph();
    const violations: string[] = [];
    for (const path of files) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const vendor of FORBIDDEN_VENDOR) {
        if (source.includes(vendor)) violations.push(`${path} mentions ${vendor}`);
      }
    }
    assert.deepEqual(violations, []);
  });

  test("legacy modules do not depend on the new substrate", async () => {
    // Keeps the boundary one-way so the legacy path stays independently deletable. The two barrels
    // that intentionally re-export both surfaces during migration are the only exceptions.
    const barrels = new Set(["execution-api.ts", "testing/index.ts"]);
    const violations: string[] = [];

    for (const path of await coreSourceFiles()) {
      if (isOwned(path) || barrels.has(path)) continue;
      const absolute = resolve(CORE_SRC, path);
      const source = await readFile(absolute, "utf8");
      for (const specifier of specifiersIn(source)) {
        if (!specifier.startsWith(".")) continue;
        const target = relative(CORE_SRC, resolve(dirname(absolute), specifier));
        if (isOwned(target)) violations.push(`${path} imports ${target}`);
      }
    }

    assert.deepEqual(violations, []);
  });

  test("conformance tests use the target surface, not legacy compatibility APIs", async () => {
    const conformanceRoot = resolve(REPO_ROOT, "tests/conformance");
    const allowed = new Set([
      "@agent-sdk/core/execution",
      "@agent-sdk/core/ports",
      "@agent-sdk/core/reference",
      "@agent-sdk/core/testing",
    ]);
    const violations: string[] = [];

    for (const path of (await readdir(conformanceRoot, { recursive: true })).filter((p) => p.endsWith(".ts"))) {
      const source = await readFile(resolve(conformanceRoot, path), "utf8");
      for (const specifier of specifiersIn(source)) {
        if (specifier.startsWith("node:")) continue;
        if (allowed.has(specifier)) continue;
        violations.push(`${path} imports ${specifier}`);
      }
    }

    assert.deepEqual(violations, [], "conformance asserts target semantics through the published v0.4 surface only");
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
    // runtime/integration ingress (see docs/development/005-slice-b-decisions.md, DEC-B02), never
    // an Agent/Workflow/Stage capability. This greps text, not just imports, so the rule survives
    // even a future refactor that moves `settleEffect` somewhere the import-graph check does not
    // yet name - and it is written against `ports/controller.ts` specifically so it keeps
    // protecting the same boundary once a Stage execution context exists in a later slice.
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
    assert.equal(geminiSource.includes("@agent-sdk/core/ports"), true);
    const reverseImports: string[] = [];
    for (const path of await coreSourceFiles()) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      if (specifiersIn(source).some((specifier) =>
        specifier === "@agent-sdk/provider-gemini" || specifier.includes("packages/models/gemini"))) {
        reverseImports.push(path);
      }
    }
    assert.deepEqual(reverseImports, [], "the vendor adapter depends inward; the kernel never depends outward on Gemini");
  });

  test("the published v0.4 entry points are the ones the package exports", async () => {
    const manifest = JSON.parse(await readFile(resolve(REPO_ROOT, "packages/core/package.json"), "utf8")) as {
      exports: Record<string, string>;
    };
    assert.equal(manifest.exports["./execution"], "./src/execution-api.ts");
    assert.equal(manifest.exports["./ports"], "./src/ports/index.ts");
    assert.equal(manifest.exports["./reference"], "./src/reference/index.ts");
    assert.equal(manifest.exports["./testing"], "./src/testing/index.ts");
  });
});
