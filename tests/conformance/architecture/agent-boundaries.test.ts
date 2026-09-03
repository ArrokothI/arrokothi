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

/**
 * A module with its comments removed.
 *
 * These files explain their boundaries in prose - "no Harness, no store, no dispatcher" - so a
 * name-grep over the raw text would fail on the sentence that documents the rule it is checking.
 * What must not contain the name is the code.
 */
function codeOf(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
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
    //
    // Slice F.1 briefly delivered a read-memory snapshot here per Activation; the F.1 review
    // reverted that. The authorized Structured Memory snapshot is resolved by the AgentController
    // from a narrow read-only port when it builds a model invocation - not delivered here, and not
    // as a handle, a resolver, an authority ref, or a store on `ActivationInput`.
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
      "ModelActionProjection",
      "ModelProvider",
      "ModelResolver",
      // The read snapshot and its resolver belong to the controller, never to ActivationInput.
      "StructuredMemoryReadView",
      "StructuredMemoryReadViewResolver",
      "ActiveStructuredMemoryWriteView",
      "ActiveStructuredMemoryWriteViewResolver",
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

  test("the Agent controller holds narrow Structured Memory view resolvers, not runtime state", async () => {
    const controller = codeOf(await readFile(resolve(CORE_SRC, "controllers/agent/controller.ts"), "utf8"));
    assert.ok(controller.includes("StructuredMemoryReadViewResolver"));
    assert.ok(controller.includes("ActiveStructuredMemoryWriteViewResolver"));
    for (const forbidden of ["RuntimeStore", "Harness", "EffectAuthorizer", "StructuredMemoryViewRef"]) {
      assert.equal(controller.includes(forbidden), false, `the AgentController must not name ${forbidden}`);
    }

    for (const entry of [
      "ports/structured-memory-read-view.ts",
      "ports/active-structured-memory-write-view.ts",
    ]) {
      const portFiles = await walk([entry]);
      assert.deepEqual([...portFiles].filter((path) => OPERATIONAL_MACHINERY.includes(path)), []);
    }

    const resolver = codeOf(
      await readFile(resolve(CORE_SRC, "reference/structured-memory-write-view-resolver.ts"), "utf8"),
    );
    for (const forbidden of ["transact", ".update(", ".insert(", "EffectProposal", "writeMemory(", "dispatch", "settle"]) {
      assert.equal(resolver.includes(forbidden), false, `the write-view resolver must not ${forbidden}`);
    }
  });

  test("the Agent controller holds only the narrow Derived Semantic Memory resolver, not the provider or extractor", async () => {
    const controller = codeOf(await readFile(resolve(CORE_SRC, "controllers/agent/controller.ts"), "utf8"));
    assert.ok(controller.includes("DerivedSemanticMemoryReadResolver"), "the controller holds the read resolver port");
    for (const forbidden of [
      "DerivedSemanticMemoryProvider",
      "DerivedMemoryExtractor",
      "deriveClaims",
      "createInMemoryDerivedSemanticMemory",
      "groundDerivedClaimCandidate",
    ]) {
      assert.equal(controller.includes(forbidden), false, `the AgentController must not name ${forbidden}`);
    }

    // The read-view port reaches nothing operational, and the controller's whole import graph never
    // reaches a provider, an extractor, or the reference implementations of either.
    const portFiles = await walk(["ports/derived-semantic-memory-read-view.ts"]);
    assert.deepEqual([...portFiles].filter((path) => OPERATIONAL_MACHINERY.includes(path)), []);

    const controllerFiles = await walk(["controllers/agent/controller.ts"]);
    for (const forbidden of [
      "ports/derived-semantic-memory-provider.ts",
      "ports/derived-memory-extractor.ts",
      "reference/in-memory-derived-semantic-memory.ts",
      "reference/derived-memory-extractor.ts",
      "reference/derived-semantic-memory-read-resolver.ts",
    ]) {
      assert.equal(controllerFiles.has(forbidden), false, `the AgentController graph must not reach ${forbidden}`);
    }
  });

  test("Derived Semantic Memory is a dependency-free execution leaf, and its ports reach nothing operational", async () => {
    const leaf = await walk(["execution/derived-semantic-memory.ts"]);
    for (const path of leaf) {
      for (const specifier of specifiersIn(await readFile(resolve(CORE_SRC, path), "utf8"))) {
        assert.ok(
          specifier.startsWith("."),
          `execution/derived-semantic-memory.ts graph imports only relative modules (${specifier})`,
        );
      }
    }
    const AUTHORITY_AND_RUNTIME = [
      ...OPERATIONAL_MACHINERY,
      "operations/authority.ts",
      "operations/active-view.ts",
      "operations/projection.ts",
      "operations/model-action-view.ts",
      "operations/local-model-control.ts",
    ];
    assert.deepEqual([...leaf].filter((path) => AUTHORITY_AND_RUNTIME.includes(path)), []);

    for (const port of [
      "ports/derived-memory-extractor.ts",
      "ports/derived-semantic-memory-provider.ts",
      "ports/derived-semantic-memory-read-view.ts",
    ]) {
      const files = await walk([port]);
      assert.deepEqual(
        [...files].filter((path) => AUTHORITY_AND_RUNTIME.includes(path)),
        [],
        `${port} reaches no runtime, authority, Active View, or Effect machinery`,
      );
    }

    // deriveClaims is not called from any controller: extraction is an application concern.
    for (const path of await filesUnder(["controllers/"])) {
      const code = codeOf(await readFile(resolve(CORE_SRC, path), "utf8"));
      assert.equal(code.includes("deriveClaims"), false, `${path} must not run extraction`);
    }
  });

  test("the information compiler may read a Derived claim snapshot but cannot retrieve, write, or promote", async () => {
    const files = await walk(["controllers/agent/information.ts"]);
    for (const forbidden of [
      "ports/derived-semantic-memory-read-view.ts",
      "ports/derived-semantic-memory-provider.ts",
      "ports/derived-memory-extractor.ts",
      "reference/derived-semantic-memory-read-resolver.ts",
    ]) {
      assert.equal(files.has(forbidden), false, `the information compiler must not reach ${forbidden}`);
    }
    const code = codeOf(await readFile(resolve(CORE_SRC, "controllers/agent/information.ts"), "utf8"));
    for (const forbidden of ["deriveClaims", "promoteDerivedClaim", ".retrieve(", "DerivedSemanticMemoryProvider"]) {
      assert.equal(code.includes(forbidden), false, `an information compiler renders claims; it does not ${forbidden}`);
    }
  });

  test("Derived Semantic Memory adds no Effect kind, no Event kind, and no model action / local control", async () => {
    const effects = await readFile(resolve(CORE_SRC, "effects/types.ts"), "utf8");
    const kinds = effects.slice(effects.indexOf("export const EFFECT_KINDS"));
    assert.equal(/derived|semantic_memory|promote/i.test(kinds.slice(0, kinds.indexOf("]"))), false, "no Effect kind for Derived Memory");
    // Promotion is an ordinary WriteMemory with an optional provenance datum - not a new proposal kind.
    assert.ok(effects.includes("promoteDerivedClaim"), "the promotion helper builds a WriteMemory");
    assert.ok(effects.includes('kind: "write_memory"'), "promoteDerivedClaim returns a write_memory proposal");

    const events = codeOf(await readFile(resolve(CORE_SRC, "interaction/events.ts"), "utf8"));
    assert.equal(/derived|promoted/i.test(events), false, "no derived.* Event kind");

    const actionTarget = codeOf(await readFile(resolve(CORE_SRC, "operations/action-target.ts"), "utf8"));
    const localControl = codeOf(await readFile(resolve(CORE_SRC, "operations/local-model-control.ts"), "utf8"));
    assert.equal(/derived/i.test(actionTarget), false, "Derived Memory is never a ModelActionTarget");
    assert.equal(/derived/i.test(localControl), false, "Derived Memory is never a local model control");

    // The SpawnExecution proposal gains no derived-memory field: there is no parent -> child handoff.
    const spawnProposal = effects.slice(effects.indexOf("export interface SpawnExecutionProposal"));
    assert.equal(/derived/i.test(spawnProposal.slice(0, spawnProposal.indexOf("\n}"))), false);

    const pending = await readFile(resolve(CORE_SRC, "effects/pending.ts"), "utf8");
    assert.equal(/derived/i.test(pending), false, "Derived retrieval is not a PendingOperation kind");
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
    // Holds for the port and the reference strategy alike: an information compiler selects
    // information, and has no route to what the Agent is permitted or shown as available.
    const files = await walk(["controllers/agent/information.ts"]);
    const forbidden = [
      "operations/active-view.ts",
      "operations/authority.ts",
      "operations/exposure.ts",
      "operations/projection.ts",
      "operations/model-action-view.ts",
      "operations/refs.ts",
      "execution/structured-memory-write-view.ts",
      "ports/active-operation-view.ts",
      "ports/effective-operation-authority.ts",
      "ports/capability-catalog.ts",
      "ports/active-structured-memory-write-view.ts",
    ];
    assert.deepEqual(
      [...files].filter((path) => forbidden.includes(path)),
      [],
      "an information compiler selects information; it does not choose operations or read authority",
    );
  });

  test("an observation projector reaches no authority, dispatch, or runtime state", async () => {
    // A projector decides how a result reads to a model. Rendering is not permission, is not
    // durable memory, and cannot cause anything to happen - so the import graph must contain no
    // route to any of it, and the module must not name a provider or framework type either.
    const files = await walk(["agent/observation-projection.ts"]);
    const forbidden = [
      ...OPERATIONAL_MACHINERY,
      "operations/authority.ts",
      "operations/active-view.ts",
      "operations/projection.ts",
      "ports/effective-operation-authority.ts",
      "ports/active-operation-view.ts",
      "ports/capability-catalog.ts",
      "ports/model-provider.ts",
      "effects/types.ts",
      "execution/context.ts",
    ];
    assert.deepEqual(
      [...files].filter((path) => forbidden.includes(path)),
      [],
      "an observation projector is handed data and returns data",
    );

    const code = codeOf(await readFile(resolve(CORE_SRC, "agent/observation-projection.ts"), "utf8"));
    for (const name of ["Harness", "RuntimeStore", "EffectProposal", "CapabilityExecutor", "EffectAuthorizer", "useCapability"]) {
      assert.equal(code.includes(name), false, `an observation projector must not name ${name}`);
    }
  });

  test("model action targets are identity only, with the two authority-governed arms", async () => {
    const code = codeOf(await readFile(resolve(CORE_SRC, "operations/action-target.ts"), "utf8"));
    const declared = [...code.matchAll(/readonly kind: "(\w+)"/g)].map((match) => match[1]!);
    assert.deepEqual(
      [...new Set(declared)],
      ["capability_operation", "structured_memory_write"],
      "the authority-governed target vocabulary; working_notes_set is a separate local-control category",
    );
    assert.equal(code.includes("working_notes_set"), false, "a local control is never a ModelActionTarget");
    for (const forbidden of ["grant", "authorize", "Harness", "Executor", "credential", "token"]) {
      assert.equal(code.includes(forbidden), false, `an action target must not carry "${forbidden}"`);
    }

    // And the binding that persists it reaches nothing that could act on it.
    const files = await walk(["operations/action-target.ts"]);
    assert.deepEqual(
      [...files].filter((path) => OPERATIONAL_MACHINERY.includes(path)),
      [],
    );
  });

  test("the action branch does not depend on context compilation or memory reads", async () => {
    const files = await walk([
      "operations/active-view.ts",
      "operations/model-action-view.ts",
      "operations/projection.ts",
      "execution/structured-memory-write-view.ts",
      "reference/active-operation-view-resolver.ts",
      "reference/structured-memory-write-view-resolver.ts",
    ]);
    const forbidden = [
      "controllers/agent/information.ts",
      "controllers/agent/controller.ts",
      "agent/control-state.ts",
      "execution/structured-memory-read.ts",
      "ports/structured-memory-read-view.ts",
    ];
    assert.deepEqual(
      [...files].filter((path) => forbidden.includes(path)),
      [],
      "an exposure resolver and a projector own no instructions, transcript, or memory selection",
    );
  });

  test("Working Notes state and the local-control view/projection reach nothing operational", async () => {
    // No runtime, no policy, no authority *implementation*, no Effect machinery in any of these graphs.
    const AUTHORITY_AND_RUNTIME = [
      ...OPERATIONAL_MACHINERY,
      "operations/authority.ts",
      "reference/active-operation-view-resolver.ts",
      "reference/operation-authority.ts",
      "reference/structured-memory-write-view-resolver.ts",
      "reference/structured-memory-read-view-resolver.ts",
      "ports/effective-operation-authority.ts",
      "ports/active-operation-view.ts",
      "ports/active-structured-memory-write-view.ts",
    ];
    // The two leaves reach nothing beyond `util/*` and their own type modules.
    for (const entry of ["execution/working-notes.ts", "operations/local-model-control.ts"]) {
      const files = await walk([entry]);
      assert.deepEqual(
        [...files].filter((path) => [...AUTHORITY_AND_RUNTIME, "operations/active-view.ts"].includes(path)),
        [],
        `${entry} graph reaches no runtime, authority, Active View, or Effect machinery`,
      );
      for (const path of files) {
        for (const specifier of specifiersIn(await readFile(resolve(CORE_SRC, path), "utf8"))) {
          assert.ok(specifier.startsWith("."), `${entry} graph imports only relative modules (${specifier})`);
        }
      }
    }
    // The invocation-interface composer may name the two projection *types* it merges, but reaches
    // no authority implementation, resolver, runtime, or Effect machinery.
    const ifaceFiles = await walk(["operations/model-invocation-interface.ts"]);
    assert.deepEqual(
      [...ifaceFiles].filter((path) => AUTHORITY_AND_RUNTIME.includes(path)),
      [],
      "the callable-namespace composer only rearranges two projections it is handed",
    );
    for (const entry of [
      "execution/working-notes.ts",
      "operations/local-model-control.ts",
      "operations/model-invocation-interface.ts",
    ]) {
      const code = codeOf(await readFile(resolve(CORE_SRC, entry), "utf8"));
      for (const forbidden of ["RuntimeStore", "Harness", "EffectAuthorizer", "EffectProposal", "CapabilityExecutor"]) {
        assert.equal(code.includes(forbidden), false, `${entry} must not name ${forbidden}`);
      }
    }
  });

  test("working_notes_set is a local control, not a member of any authority-governed view", async () => {
    // Not a ModelActionTarget.
    const actionTarget = codeOf(await readFile(resolve(CORE_SRC, "operations/action-target.ts"), "utf8"));
    assert.equal(actionTarget.includes("working_notes_set"), false);
    // Not in the Active Model Action View.
    const actionView = codeOf(await readFile(resolve(CORE_SRC, "operations/model-action-view.ts"), "utf8"));
    assert.equal(actionView.includes("working_notes_set"), false);
    assert.equal(actionView.includes("localControl"), false, "the Active View knows nothing about local controls");
    // The ModelActionProjection is cut only from the Active Model Action View.
    const projection = codeOf(await readFile(resolve(CORE_SRC, "operations/projection.ts"), "utf8"));
    assert.equal(projection.includes("working_notes_set"), false);
    assert.equal(projection.includes("LocalModelControl"), false);
    // The local-control module does not depend on the authority-governed projection or view.
    const localFiles = await walk(["operations/local-model-control.ts"]);
    for (const forbidden of ["operations/projection.ts", "operations/model-action-view.ts", "operations/active-view.ts"]) {
      assert.equal(localFiles.has(forbidden), false, `local-model-control must not reach ${forbidden}`);
    }
  });

  test("the model-invocation trace records local controls distinctly from Effect proposals", async () => {
    const modelAccess = codeOf(await readFile(resolve(CORE_SRC, "controllers/agent/model-access.ts"), "utf8"));
    // A local control application record exists and is not an AgentActionProposalRecord.
    assert.ok(modelAccess.includes("AgentLocalControlApplicationRecord"));
    assert.ok(modelAccess.includes("AgentProjectedCallableRecord"));
    // The trace module reaches nothing operational and names no Effect/dispatch machinery.
    const files = await walk(["controllers/agent/model-access.ts"]);
    assert.deepEqual([...files].filter((path) => OPERATIONAL_MACHINERY.includes(path)), []);
    for (const forbidden of ["EffectProposal", "useCapability", "writeMemory", "RuntimeStore", "EffectAuthorizer"]) {
      assert.equal(modelAccess.includes(forbidden), false, `the trace contract must not name ${forbidden}`);
    }
    // The controller has a dedicated local-control application record builder, distinct from
    // proposalRecords (which filters local controls out).
    const controller = codeOf(await readFile(resolve(CORE_SRC, "controllers/agent/controller.ts"), "utf8"));
    assert.ok(controller.includes("localControlApplicationRecords"));
    const defStart = controller.indexOf("private proposalRecords(");
    const proposalFn = controller.slice(defStart, controller.indexOf("private ", defStart + 1));
    assert.ok(
      proposalFn.includes('"working_notes_set"') && proposalFn.includes("continue"),
      "proposalRecords skips local controls",
    );
  });

  test("the local Working Notes control is not an Effect or Event; the F.2b handoff is only spawn data", async () => {
    const effects = await readFile(resolve(CORE_SRC, "effects/types.ts"), "utf8");
    const kinds = effects.slice(effects.indexOf("export const EFFECT_KINDS"));
    const list = kinds.slice(0, kinds.indexOf("]"));
    assert.equal(/working[_ ]?notes/i.test(list), false, "no sixth Effect for Working Notes");
    // F.2a: the `working_notes_set` *local control* is never an Effect proposal field of any kind.
    assert.equal(effects.includes("working_notes_set"), false, "working_notes_set is a local control, never an Effect field");
    // F.2b: an explicit Working Notes *handoff* rides SpawnExecution as plain data - a snapshot
    // attached to an already-authorized child-spawn proposal, not a new operation.
    const spawnProposal = effects.slice(effects.indexOf("export interface SpawnExecutionProposal"));
    const spawnBody = spawnProposal.slice(0, spawnProposal.indexOf("\n}"));
    assert.ok(spawnBody.includes("workingNotes?: WorkingNotesHandoff"), "SpawnExecution carries an optional handoff snapshot");
    assert.ok(
      /WorkingNotesHandoff/.test(effects) && !/working_notes\./.test(effects),
      "the handoff is a plain-data field, never a working_notes.* Effect/Event kind",
    );

    const events = await readFile(resolve(CORE_SRC, "interaction/events.ts"), "utf8");
    assert.equal(/working[_ ]?notes/i.test(events), false, "no working_notes.* Event kind was invented for the handoff");

    // And the handoff creates no new PendingOperation kind - it settles nothing of its own.
    const pending = await readFile(resolve(CORE_SRC, "effects/pending.ts"), "utf8");
    assert.equal(/working[_ ]?notes/i.test(pending), false, "the handoff is not a PendingOperation kind");
  });

  test("the Agent controller owns the local Working Notes update; the Workflow controller does not", async () => {
    const agent = codeOf(await readFile(resolve(CORE_SRC, "controllers/agent/controller.ts"), "utf8"));
    assert.ok(agent.includes("setWorkingNote") && agent.includes("validateWorkingNoteUpdate"), "the Agent applies the update locally");
    assert.ok(
      agent.includes("createLocalModelControlView") && agent.includes("createLocalModelControlProjection"),
      "and builds the local-control snapshot from authored enablement",
    );

    const workflow = codeOf(await readFile(resolve(CORE_SRC, "controllers/workflow/controller.ts"), "utf8"));
    for (const forbidden of ["workingNotes", "WorkingNote", "working_notes", "LocalModelControl", "ModelInvocationInterface"]) {
      assert.equal(workflow.includes(forbidden), false, `the Workflow controller is untouched as a local-control / Working Notes consumer (${forbidden})`);
    }
  });

  test("the information compiler may read a Working Notes frame but cannot mutate it or choose actions", async () => {
    const files = await walk(["controllers/agent/information.ts"]);
    for (const forbidden of [
      "operations/model-action-view.ts",
      "operations/projection.ts",
      "operations/active-view.ts",
      "operations/local-model-control.ts",
      "operations/model-invocation-interface.ts",
    ]) {
      assert.equal(files.has(forbidden), false, `the information compiler must not reach ${forbidden}`);
    }
    const code = codeOf(await readFile(resolve(CORE_SRC, "controllers/agent/information.ts"), "utf8"));
    for (const mutator of ["setWorkingNote", "workingNotesBudgetIssue", "validateWorkingNoteUpdate"]) {
      assert.equal(code.includes(mutator), false, `an information compiler renders notes; it does not ${mutator}`);
    }
  });

  test("projection has no AgentSpec side channel, and only the Agent consumes write exposure", async () => {
    const projectionFiles = await walk(["operations/projection.ts"]);
    assert.equal(projectionFiles.has("agent/spec.ts"), false, "projection cannot read an authored write request");
    const projection = codeOf(await readFile(resolve(CORE_SRC, "operations/projection.ts"), "utf8"));
    for (const forbidden of ["AgentSpec", "structuredMemory.write", "AgentStructuredMemoryWrite"]) {
      assert.equal(projection.includes(forbidden), false, `projection must not synthesize from ${forbidden}`);
    }

    const agent = await readFile(resolve(CORE_SRC, "controllers/agent/controller.ts"), "utf8");
    const workflow = await readFile(resolve(CORE_SRC, "controllers/workflow/controller.ts"), "utf8");
    assert.ok(agent.includes("ActiveStructuredMemoryWriteViewResolver"));
    assert.equal(workflow.includes("ActiveStructuredMemoryWriteViewResolver"), false);
    assert.equal(workflow.includes("createActiveModelActionView"), false);
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
      "operations/model-action-view.ts",
      "operations/action-target.ts",
      "execution/structured-memory-write-view.ts",
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

  test("only the runtime Effect gateway may read effective authority at dispatch", async () => {
    // Enforcing the ceiling is operational, so it belongs exactly where dispatch happens - and
    // nowhere a controller can reach. The gateway reads the runtime-owned store facet directly
    // rather than through a second authority source, so the ceiling that governs a dispatch and the
    // one an Active View was cut from cannot become two different answers.
    const gateway = await readFile(resolve(CORE_SRC, "runtime/effect-processor.ts"), "utf8");
    assert.ok(gateway.includes("authorizesOperation"), "the gateway checks the ceiling itself");
    assert.ok(gateway.includes("readOperationAuthority"), "from the runtime-owned facet");
    assert.equal(
      gateway.includes("EffectiveOperationAuthoritySource"),
      false,
      "and not through the read-only exposure port, which is the resolver's window",
    );

    // No controller gained that ability alongside it. A controller's graph does reach the
    // authority *record* - an Execution context holds a typed ref to one - so the assertion is
    // about the two things that read a ceiling: the read-only source port, and the reading itself.
    for (const entry of ["controllers/agent/controller.ts", "controllers/workflow/controller.ts"]) {
      const files = await walk([entry]);
      assert.equal(
        files.has("ports/effective-operation-authority.ts"),
        false,
        `${entry} must not hold the effective-authority read port`,
      );
    }
    for (const path of await filesUnder(["controllers/"])) {
      const code = codeOf(await readFile(resolve(CORE_SRC, path), "utf8"));
      for (const reader of ["authorizesOperation", "readOperationAuthority", "effectiveOperationAuthority"]) {
        assert.equal(code.includes(reader), false, `${path} reads a ceiling; only the Effect gateway may`);
      }
    }
  });

  test("the Agent path adds no external dependency to core", async () => {
    const files = await walk([
      "controllers/agent/controller.ts",
      "controllers/agent/information.ts",
      "agent/observation-projection.ts",
      "operations/action-target.ts",
      "operations/model-action-view.ts",
      "reference/active-operation-view-resolver.ts",
      "reference/structured-memory-write-view-resolver.ts",
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
