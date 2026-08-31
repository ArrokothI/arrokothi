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
const V04_OWNED = ["definitions/", "execution/", "interaction/", "ports/", "reference/", "testing/contracts/"];
const V04_OWNED_FILES = [
  "execution-api.ts",
  "runtime/activation.ts",
  "runtime/controller-registry.ts",
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

/** Transitive closure over relative imports, starting from the published v0.4 entry modules. */
async function walkV04Graph(): Promise<Graph> {
  const files = new Set<string>();
  const bare = new Map<string, string[]>();
  const queue = [...V04_ENTRY_MODULES];

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
