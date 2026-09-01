/**
 * Architecture assertions for the Slice-D Agent path.
 *
 * Naming discipline does not prove a boundary; an import graph does. These cases walk the actual
 * modules and assert the claims the slice makes: the controller boundary did not widen to make the
 * Agent convenient, the Agent controller cannot reach anything operational, the information branch
 * and the operation branch are genuinely independent, and no protocol, framework, or vendor type
 * entered core Agent semantics.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CORE_SRC = resolve(REPO_ROOT, "packages/core/src");
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g;

function specifiersIn(source: string): string[] {
  return [...source.matchAll(IMPORT_SPECIFIER)].map((match) => match[1]!);
}

async function walk(entries: readonly string[]): Promise<Set<string>> {
  const files = new Set<string>();
  const queue = [...entries];
  while (queue.length > 0) {
    const relativePath = queue.pop()!;
    if (files.has(relativePath)) continue;
    files.add(relativePath);
    const absolute = resolve(CORE_SRC, relativePath);
    const source = await readFile(absolute, "utf8");
    for (const specifier of specifiersIn(source)) {
      if (!specifier.startsWith(".")) continue;
      queue.push(relative(CORE_SRC, resolve(dirname(absolute), specifier)));
    }
  }
  return files;
}

async function filesUnder(prefixes: readonly string[]): Promise<string[]> {
  return (await readdir(CORE_SRC, { recursive: true }))
    .filter((path) => path.endsWith(".ts"))
    .filter((path) => prefixes.some((prefix) => path.startsWith(prefix)));
}

/** The operational machinery no Agent module may reach. */
const OPERATIONAL_MACHINERY = [
  "runtime/harness.ts",
  "runtime/effect-processor.ts",
  "runtime/event-router.ts",
  "runtime/activation.ts",
  "runtime/resumption-processor.ts",
  "ports/runtime-store.ts",
  "ports/scheduler.ts",
  "ports/capability-executor.ts",
  "ports/effect-authorizer.ts",
  "ports/definition-store.ts",
  "ports/inline-wait.ts",
  "effects/journal.ts",
  "effects/pending.ts",
  "effects/authorization.ts",
  "effects/capability.ts",
];

describe("Agent architecture boundaries", () => {
  test("ActivationInput is still exactly four fields and function-free", async () => {
    // Slice D had every reason to want an authority handle, an Active View, or a resolver in here.
    // It got none of them: the exposure resolver is a controller construction dependency, and the
    // one live capability a controller receives is still the resumption scope, as a second argument.
    const source = await readFile(resolve(CORE_SRC, "ports/controller.ts"), "utf8");
    const declaration = source.slice(source.indexOf("export interface ActivationInput"));
    const body = declaration.slice(0, declaration.indexOf("\n}"));
    const fields = [...body.matchAll(/readonly\s+(\w+)\s*:/g)].map((match) => match[1]!);
    assert.deepEqual(fields.sort(), ["activation", "definition", "events", "execution"]);

    for (const forbidden of [
      "ActiveOperationView",
      "ActiveOperationViewResolver",
      "EffectiveOperationAuthority",
      "OperationAuthorityRef",
      "AgentExecutor",
      "ModelOperationProjection",
      "ModelProvider",
      "ModelResolver",
    ]) {
      assert.equal(source.includes(forbidden), false, `ports/controller.ts must not mention ${forbidden}`);
    }

    // And ExecutionView still hands out no slot references at all.
    const context = await readFile(resolve(CORE_SRC, "execution/context.ts"), "utf8");
    const view = context.slice(context.indexOf("export interface ExecutionView"));
    assert.equal(view.slice(0, view.indexOf("\n}")).includes("slots"), false);
  });

  test("the Agent controller import graph reaches nothing operational", async () => {
    const files = await walk(["controllers/agent/controller.ts"]);
    assert.deepEqual(
      [...files].filter((path) => OPERATIONAL_MACHINERY.includes(path)),
      [],
      "the AgentController owns semantic control; the Harness owns everything operational",
    );
  });

  test("no Agent module names a dispatcher, policy evaluator, store, scheduler, or settlement path", async () => {
    const files = await filesUnder(["controllers/agent/", "agent/", "operations/"]);
    for (const path of files) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const forbidden of [
        "CapabilityExecutor",
        "EffectAuthorizer",
        "RuntimeStore",
        "Scheduler",
        "settleEffect",
        "EffectProcessor",
        "createExecution",
        "SpawnExecutionProposal",
        "spawn_execution",
      ]) {
        assert.equal(
          source.includes(forbidden),
          false,
          `${path} mentions ${forbidden}; an Agent proposes Effects and never carries them out`,
        );
      }
    }
  });

  test("the information branch does not depend on authority, exposure, or projection", async () => {
    const files = await walk(["controllers/agent/information.ts"]);
    const forbidden = [
      "operations/active-view.ts",
      "operations/authority.ts",
      "operations/exposure.ts",
      "operations/projection.ts",
      "operations/refs.ts",
      "ports/active-operation-view.ts",
      "ports/effective-operation-authority.ts",
      "ports/capability-catalog.ts",
    ];
    assert.deepEqual(
      [...files].filter((path) => forbidden.includes(path)),
      [],
      "an information compiler selects information; it does not choose operations or read authority",
    );
  });

  test("the operation branch does not depend on context compilation", async () => {
    const files = await walk([
      "operations/active-view.ts",
      "operations/projection.ts",
      "reference/active-operation-view-resolver.ts",
    ]);
    const forbidden = ["controllers/agent/information.ts", "controllers/agent/controller.ts", "agent/control-state.ts"];
    assert.deepEqual(
      [...files].filter((path) => forbidden.includes(path)),
      [],
      "an exposure resolver and a projector own no instructions, transcript, or memory selection",
    );
  });

  test("core Agent semantics mention no protocol, framework, or vendor type", async () => {
    const files = await filesUnder(["controllers/agent/", "agent/", "operations/", "ports/", "reference/"]);
    const forbidden = [
      "@modelcontextprotocol",
      "McpServer",
      "McpClient",
      "@strands-agents",
      "FunctionTool",
      "@google/genai",
      "GoogleModel",
      "@langchain",
      "OpenAPI",
      "openapi",
      "axios",
      "node:http",
    ];
    for (const path of files) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const vendor of forbidden) {
        assert.equal(source.includes(vendor), false, `${path} mentions ${vendor}`);
      }
    }
  });

  test("Agent definitions, progress, projections, and authority records are plain data", async () => {
    // Structural, on the modules that define them: none declares a method, a callback field, or a
    // class, so none of these records can carry a promise, a client, or a live resolver.
    for (const path of [
      "agent/spec.ts",
      "agent/control-state.ts",
      "operations/authority.ts",
      "operations/active-view.ts",
      "operations/projection.ts",
    ]) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      assert.equal(/^export (?:declare )?class /m.test(source), false, `${path} declares a class`);
      assert.equal(
        /readonly\s+\w+\s*:\s*\([^)]*\)\s*=>/.test(source),
        false,
        `${path} declares a callable field`,
      );
      for (const forbidden of ["Promise<", "AbortSignal", "() =>"]) {
        const declarationArea = source.split("export interface").slice(1).join("export interface");
        assert.equal(
          declarationArea.includes(forbidden),
          false,
          `${path} declares ${forbidden} inside a record`,
        );
      }
    }
  });

  test("the Agent path adds no external dependency to core", async () => {
    const files = await walk([
      "controllers/agent/controller.ts",
      "reference/active-operation-view-resolver.ts",
      "reference/agent-executor.ts",
      "reference/operation-authority.ts",
    ]);
    const bare: string[] = [];
    for (const path of files) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const specifier of specifiersIn(source)) {
        if (!specifier.startsWith(".")) bare.push(`${specifier} in ${path}`);
      }
    }
    assert.deepEqual(bare, [], "the Agent path imports no package and no runtime builtin");
  });
});
