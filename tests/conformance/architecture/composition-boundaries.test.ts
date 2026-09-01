/**
 * Architecture boundaries for Slice E.0 child composition.
 *
 * The stated risk is a child implemented as an in-process call between controllers, or a controller
 * that reaches past the Effect gateway to construct runtime state directly. These walk the real
 * import graph and grep the real sources to prove neither happened:
 *
 *   controllers propose a `SpawnExecution`; they never construct a child, a delegated authority
 *   record, a lineage budget, or a child link
 *   the structural spawn budget is written in exactly two runtime modules and nowhere else
 *   child creation is mediated by the Effect gateway, which the controller boundary cannot reach
 *   the `SpawnExecution` proposal is plain data
 *   no provider, protocol, or storage package entered core with this slice
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { callExecution, spawnExecution } from "@agent-sdk/core/execution";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CORE_SRC = resolve(REPO_ROOT, "packages/core/src");
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g;

function specifiersIn(source: string): string[] {
  return [...source.matchAll(IMPORT_SPECIFIER)].map((match) => match[1]!);
}

async function walkGraph(entries: readonly string[]): Promise<{ files: Set<string>; bare: Set<string> }> {
  const files = new Set<string>();
  const bare = new Set<string>();
  const queue = [...entries];
  while (queue.length > 0) {
    const rel = queue.pop()!;
    if (files.has(rel)) continue;
    files.add(rel);
    const absolute = resolve(CORE_SRC, rel);
    const source = await readFile(absolute, "utf8");
    for (const specifier of specifiersIn(source)) {
      if (!specifier.startsWith(".")) {
        bare.add(specifier);
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

describe("Slice E.0 composition boundaries", () => {
  test("no controller module constructs a child, a delegated ceiling, a budget, or a link", async () => {
    const files = (await coreSourceFiles()).filter((path) => path.startsWith("controllers/"));
    const forbidden = [
      "createExecutionContext",
      "createDelegatedOperationAuthority",
      "createChildExecutionLink",
      "createLineageSpawnBudget",
      "consumeSpawnCredit",
      "lineageSpawnBudgets",
      "childExecutionLinks",
      "operationAuthorities",
      "attenuateChildOperations",
    ];
    for (const path of files) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const name of forbidden) {
        assert.equal(source.includes(name), false, `${path} mentions ${name}; a controller proposes a spawn, it does not perform one`);
      }
    }
  });

  test("the controller boundary cannot reach the child-creation machinery", async () => {
    const { files } = await walkGraph(["ports/controller.ts"]);
    const forbidden = [
      "ports/runtime-store.ts",
      "runtime/harness.ts",
      "runtime/effect-processor.ts",
      "execution/child-link.ts",
      "execution/structural-budget.ts",
    ];
    assert.deepEqual(
      [...files].filter((path) => forbidden.includes(path)),
      [],
      "a controller is handed nothing that resolves a Definition, attenuates authority, spends a budget, or inserts an Execution",
    );
  });

  test("the lineage structural spawn budget is written in exactly the runtime gateway and the Harness", async () => {
    const writers: string[] = [];
    for (const path of await coreSourceFiles()) {
      if (path.startsWith("reference/") || path.startsWith("testing/")) continue;
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      if (/lineageSpawnBudgets\.(insert|update)\b/.test(source)) writers.push(path);
    }
    assert.deepEqual(
      writers.sort(),
      ["runtime/effect-processor.ts", "runtime/harness.ts"],
      "capacity is fixed by the Harness at the root; only the gateway spends a credit; a Definition can reach neither",
    );
  });

  test("child Execution records are inserted only by the Harness and the Effect gateway", async () => {
    const inserters: string[] = [];
    for (const path of await coreSourceFiles()) {
      if (path.startsWith("reference/") || path.startsWith("testing/")) continue;
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      if (/\.executions\.insert\(/.test(source)) inserters.push(path);
    }
    assert.deepEqual(
      inserters.sort(),
      ["runtime/effect-processor.ts", "runtime/harness.ts"],
      "an Execution is created in one of two mediated places, never by a controller or an executor",
    );
  });

  test("the child-composition modules import no package and no builtin", async () => {
    const { bare } = await walkGraph([
      "execution/child-link.ts",
      "execution/structural-budget.ts",
      "runtime/effect-processor.ts",
    ]);
    assert.deepEqual([...bare].sort(), [], `child composition pulled in ${[...bare].join(", ")}`);
  });

  test("no MCP, provider, or storage package name appears in the child-composition sources", async () => {
    const { files } = await walkGraph([
      "execution/child-link.ts",
      "execution/structural-budget.ts",
      "runtime/effect-processor.ts",
      "runtime/harness.ts",
    ]);
    const forbidden = ["@modelcontextprotocol", "@agent-sdk/integration-mcp", "@agent-sdk/provider-gemini", "@agent-sdk/storage-sqlite", "mcp", "Mcp", "MCP", "A2A"];
    for (const path of files) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const name of forbidden) {
        assert.equal(source.includes(name), false, `${path} mentions ${name}`);
      }
    }
  });

  test("the SpawnExecution proposal is plain data", () => {
    for (const proposal of [
      spawnExecution({ definitionId: "child", definitionVersion: 1, requestedOperations: [{ capability: "a", operation: "b" }], input: { x: 1 } }),
      callExecution({ definitionId: "child", definitionVersion: 1 }),
    ]) {
      assert.equal(JSON.stringify(proposal), JSON.stringify(JSON.parse(JSON.stringify(proposal))), "round-trips JSON");
      for (const value of Object.values(proposal)) {
        assert.notEqual(typeof value, "function", "no field is a function");
      }
    }
  });

  test("Workflow Agent/Workflow Stages still report unsupported and never propose a spawn", async () => {
    const source = await readFile(resolve(CORE_SRC, "controllers/workflow/controller.ts"), "utf8");
    assert.ok(source.includes("stage_kind_unsupported"), "an Agent/Workflow Stage is still a Slice-E.2 gap");
    assert.equal(source.includes("spawnExecution"), false);
    assert.equal(source.includes("spawn_execution"), false);
  });
});
