/**
 * Architecture assertions for the Slice-C Workflow path.
 *
 * Naming discipline does not prove a boundary; an import graph does. These cases walk the actual
 * modules and assert the claims the slice makes: a Stage is not an Execution kind, Stage and Adapter
 * code cannot reach the Harness or the store, the WorkflowController cannot dispatch a capability,
 * a model provider cannot reach Effect dispatch, no vendor name appears in Workflow modules, core
 * carries no LangChain dependency, `packages/retrieval/local` depends inward on core and never the
 * reverse, and the new Workflow path imports nothing from legacy Flow.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CORE_SRC = resolve(REPO_ROOT, "packages/core/src");
const RETRIEVAL_SRC = resolve(REPO_ROOT, "packages/retrieval/local/src");
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g;

function specifiersIn(source: string): string[] {
  return [...source.matchAll(IMPORT_SPECIFIER)].map((match) => match[1]!);
}

interface Graph {
  readonly files: Set<string>;
  readonly bare: Set<string>;
}

async function walk(root: string, entries: readonly string[]): Promise<Graph> {
  const files = new Set<string>();
  const bare = new Set<string>();
  const queue = [...entries];
  while (queue.length > 0) {
    const relativePath = queue.pop()!;
    if (files.has(relativePath)) continue;
    files.add(relativePath);
    const absolute = resolve(root, relativePath);
    const source = await readFile(absolute, "utf8");
    for (const specifier of specifiersIn(source)) {
      if (!specifier.startsWith(".")) {
        bare.add(specifier);
        continue;
      }
      queue.push(relative(root, resolve(dirname(absolute), specifier)));
    }
  }
  return { files, bare };
}

async function filesUnder(root: string): Promise<string[]> {
  return (await readdir(root, { recursive: true })).filter((path) => path.endsWith(".ts"));
}

/** Everything the WorkflowController is built from. */
const WORKFLOW_ENTRY = ["controllers/workflow/controller.ts"];

/** The operational machinery no Workflow, Stage, or Adapter module may reach. */
const OPERATIONAL_MACHINERY = [
  "runtime/harness.ts",
  "runtime/effect-processor.ts",
  "runtime/event-router.ts",
  "runtime/activation.ts",
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

describe("Workflow architecture boundaries", () => {
  test("Stage is not an Execution kind", async () => {
    const definitions = await readFile(resolve(CORE_SRC, "definitions/types.ts"), "utf8");
    assert.match(definitions, /export type DefinitionKind = "agent" \| "workflow";/);
    assert.equal(definitions.includes('"stage"'), false, "adding a Stage definition kind would make Stage an Execution");

    // No Workflow module imports Execution identity, lifecycle, mailbox, or scheduling. A Stage id
    // is authored topology identity: it is not minted by the runtime id generator, nothing is
    // addressed to it, and no lifecycle attaches to it.
    const violations: string[] = [];
    for (const path of (await filesUnder(CORE_SRC)).filter((file) => file.startsWith("workflow/"))) {
      const absolute = resolve(CORE_SRC, path);
      const source = await readFile(absolute, "utf8");
      for (const specifier of specifiersIn(source)) {
        if (!specifier.startsWith(".")) continue;
        const target = relative(CORE_SRC, resolve(dirname(absolute), specifier));
        if (target.startsWith("execution/") || target.startsWith("interaction/") || target.startsWith("runtime/")) {
          violations.push(`${path} imports ${target}`);
        }
      }
    }
    assert.deepEqual(violations, [], "Stage topology is not runtime identity, lifecycle, or mailbox");
  });

  test("Workflow and Stage modules do not import Harness, store, or scheduler internals", async () => {
    const { files } = await walk(CORE_SRC, [...WORKFLOW_ENTRY, "workflow/spec.ts", "workflow/validation.ts", "workflow/control-state.ts"]);
    assert.deepEqual(
      [...files].filter((path) => OPERATIONAL_MACHINERY.includes(path)),
      [],
      "the WorkflowController owns semantic control; the Harness owns everything operational",
    );
  });

  test("the WorkflowController cannot dispatch a capability implementation", async () => {
    // The import graph proves the controller is never *handed* one...
    const { files } = await walk(CORE_SRC, WORKFLOW_ENTRY);
    assert.deepEqual([...files].filter((path) => OPERATIONAL_MACHINERY.includes(path)), []);

    // ...and the controller's own modules do not so much as name one, so a future refactor cannot
    // quietly reintroduce a dispatch path that the graph check would only catch afterwards.
    for (const path of (await filesUnder(CORE_SRC)).filter((file) => file.startsWith("controllers/"))) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const forbidden of ["CapabilityExecutor", "settleEffect", "EffectAuthorizer", "RuntimeStore", "Scheduler"]) {
        assert.equal(
          source.includes(forbidden),
          false,
          `${path} mentions ${forbidden}; a controller proposes Effects and never carries them out`,
        );
      }
    }
  });

  test("the Function Stage context cannot reach the Harness, the store, or a lifecycle", async () => {
    const { files } = await walk(CORE_SRC, ["ports/stage.ts"]);
    assert.deepEqual([...files].filter((path) => OPERATIONAL_MACHINERY.includes(path)), []);
    // Declarations, not prose: the file documents these absences by name, so the check has to look
    // for the field declarations rather than for the words.
    const source = await readFile(resolve(CORE_SRC, "ports/stage.ts"), "utf8");
    for (const forbidden of ["executionId", "lifecycle", "mailbox", "ownerExecutionId", "authorityEnvelope", "harness", "store"]) {
      assert.equal(
        new RegExp(`readonly\\s+${forbidden}\\s*[?:]`).test(source),
        false,
        `a StageExecutionContext must not declare "${forbidden}"`,
      );
    }
  });

  test("the Adapter context cannot reach an Effect proposal, a capability, or a dispatcher", async () => {
    const { files } = await walk(CORE_SRC, ["ports/adapter.ts"]);
    assert.deepEqual(
      [...files].filter((path) => path.startsWith("effects/") || OPERATIONAL_MACHINERY.includes(path)),
      [],
      "an Adapter transforms a boundary value; it has no route to the Effect gateway",
    );
    const source = await readFile(resolve(CORE_SRC, "ports/adapter.ts"), "utf8");
    for (const forbidden of ["EffectProposal", "EffectRequest", "CapabilityExecutor", "EffectProcessor", "useCapability"]) {
      assert.equal(source.includes(forbidden), false, `ports/adapter.ts must not mention ${forbidden}`);
    }
  });

  test("the Adapter runner reaches no executor or Effect processor", async () => {
    const { files } = await walk(CORE_SRC, ["controllers/workflow/adapters.ts"]);
    assert.deepEqual(
      [...files].filter((path) => path.startsWith("effects/") || OPERATIONAL_MACHINERY.includes(path)),
      [],
    );
  });

  test("the model provider boundary cannot reach Effect dispatch", async () => {
    const { files } = await walk(CORE_SRC, ["ports/model-provider.ts", "ports/model-resolver.ts"]);
    assert.deepEqual(
      [...files].filter((path) => path.startsWith("effects/") || path.startsWith("runtime/") || path.startsWith("execution/")),
      [],
    );
  });

  test("core Workflow modules mention no provider vendor or agent framework", async () => {
    const vendors = ["@google/genai", "gemini", "Gemini", "groq", "Groq", "strands", "Strands", "@langchain"];
    for (const path of (await filesUnder(CORE_SRC)).filter((file) => file.startsWith("workflow/") || file.startsWith("controllers/"))) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const vendor of vendors) {
        assert.equal(source.includes(vendor), false, `${path} mentions ${vendor}`);
      }
    }
  });

  test("core declares no LangChain dependency", async () => {
    const manifest = JSON.parse(await readFile(resolve(REPO_ROOT, "packages/core/package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const declared = { ...manifest.dependencies, ...manifest.devDependencies };
    for (const name of Object.keys(declared)) {
      assert.equal(name.startsWith("@langchain/"), false, `core still declares ${name}`);
    }
    // And nothing in core's sources reaches for one either.
    for (const path of await filesUnder(CORE_SRC)) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      assert.equal(source.includes("@langchain/"), false, `${path} imports LangChain`);
    }
  });

  test("packages/retrieval/local depends inward on core, and core never depends on it", async () => {
    const retrievalManifest = JSON.parse(await readFile(resolve(REPO_ROOT, "packages/retrieval/local/package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    assert.ok(retrievalManifest.dependencies["@arrokothi/core"], "the implementation depends on the kernel");
    assert.ok(retrievalManifest.dependencies["@langchain/core"], "and owns the retrieval framework dependency");

    let importsCore = false;
    for (const path of await filesUnder(RETRIEVAL_SRC)) {
      const source = await readFile(resolve(RETRIEVAL_SRC, path), "utf8");
      if (specifiersIn(source).some((specifier) => specifier.startsWith("@arrokothi/core"))) importsCore = true;
    }
    assert.equal(importsCore, true);

    for (const path of await filesUnder(CORE_SRC)) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      assert.equal(
        specifiersIn(source).some((specifier) => specifier.includes("retrieval")),
        false,
        `${path} depends outward on the retrieval package`,
      );
    }
  });

  test("a WorkflowDefinition can only contain serializable data", async () => {
    const { validateWorkflowSpec } = await import("@arrokothi/core/execution");
    const result = validateWorkflowSpec({
      entryStage: "a",
      stages: [
        {
          id: "a",
          kind: "function",
          implementationRef: "f",
          config: { client: new (class ProviderClient {})(), run: () => "nope" },
          transitions: { kind: "always", next: { to: "complete" } },
        },
      ],
    });
    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.issues.some((issue) => issue.code === "not_serializable"));
  });

  test("Agent and Workflow Stage handling never creates a child Execution", async () => {
    const files = (await filesUnder(CORE_SRC)).filter((file) => file.startsWith("controllers/") || file.startsWith("workflow/"));
    for (const path of files) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const forbidden of ["createExecution", "SpawnExecutionProposal", "spawn_execution"]) {
        assert.equal(source.includes(forbidden), false, `${path} mentions ${forbidden}; child composition is Slice E`);
      }
    }
  });

  test("the new Workflow path imports nothing from legacy Flow or WorkflowCoordinator", async () => {
    const { files } = await walk(CORE_SRC, WORKFLOW_ENTRY);
    assert.deepEqual(
      [...files].filter((path) => path.startsWith("flow/") || path.startsWith("harness/") || path.startsWith("session/")),
      [],
    );
    for (const path of files) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const legacy of ["WorkflowCoordinator", "PhaseId", "FlowDefinition", "SessionState"]) {
        assert.equal(source.includes(legacy), false, `${path} mentions legacy ${legacy}`);
      }
    }
  });
});
