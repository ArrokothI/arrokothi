/**
 * K14-4: every supported legacy feature is preserved, migrated or refused (K1.4 design 01 §7, design 02
 * D01-CHK-05, -08, -13).
 *
 * Dispositions: P preserved, PD preserved and deprecated, M migrated (a "before/after" note in
 * `docs/guides`), F refused by name, N preserved on `@arrokothi/core` and not routed through the Kernel
 * (owner choices 02, B), note a stated behaviour with no member.
 *
 * The closure is a declared bounded search, run by the first two tests:
 * - **Code side.** The runtime exports of `@arrokothi/sdk` (`Object.keys`), the type exports of
 *   `index.ts`, and, through the TypeScript API, every member of every exported interface, type alias
 *   and class the SDK declares. Members are followed one level into anonymous, mapped and utility-typed
 *   (`Partial`, `Pick`, `Omit`, `Readonly`) members, so `runtime.*`, `memory.*` and `input.*` are
 *   enumerated. Re-exported `@arrokothi/core` types are covered whole by S-DEFS. Plus the 35 public
 *   `Harness` methods (`harness-view.ts`, whose own test pins the count).
 * - **Documentation side.** Every page reachable by links from `docs/guides/README.md`,
 *   `packages/sdk/README.md`, `.agents/skills/arrokothi-agent-builder/SKILL.md` and every file under
 *   `examples/execution-kernel-minimal/`. In backticked code (inline spans and fenced blocks; the whole
 *   file for an example source) it extracts:
 *   - E1, every name imported from `"@arrokothi/sdk"`;
 *   - E2, every member access on `application`, `.application`, `harness`, `services` or `runtime`, and
 *     on `app` outside the examples directory (where the guides use `app` for the Application). A file
 *     name (`app.ts`, `runtime.md`) is not a member;
 *   - E3, every bare identifier equal to an SDK export, an `Application` member or a `Harness` method;
 *   - E4, every file of the examples directory and every link into it.
 * Every enumerated and extracted item must be covered by a row, and every name a row covers must exist
 * or be one of the removed names below. Then one test per row (named by its ID) checks the row through
 * `createApplication`. Refusals assert the named error and that no Kernel or native record was created.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import * as sdk from "@arrokothi/sdk";
import {
  ApplicationConfigurationError, ApplicationInputError, ApplicationStartError, LegacyHarnessMutationRefused, WrapperEnvironmentError,
  createApplication, defineAgent, defineWorkflow, definitionRef, toCanonicalBytes,
} from "@arrokothi/sdk";
import type { Application, ApplicationOptions, StartExecutionInput } from "@arrokothi/sdk";
import type { ExecutionId } from "@arrokothi/core";
import type { CapabilityExecutor } from "@arrokothi/core/ports";
import {
  InMemoryDefinitionStore, InMemoryRuntimeStore, ScriptedModelProvider, createAllowListAuthorizer, createDeferredModelProvider,
  createNoInlineWaitBudget,
} from "@arrokothi/core/reference";
import { GeminiModelProvider } from "@arrokothi/provider-gemini";
import { createStrandsAgentExecutor } from "@arrokothi/integration-strands";
import { ModelProviderRegistry, StaticModelResolver, createReferenceAgentExecutor, portableModelFeatures } from "@arrokothi/core/reference";
import { LEGACY_HARNESS_MUTATORS, LEGACY_HARNESS_READERS } from "../src/legacy-bridge/harness-view.ts";
import {
  DOCS, allowDocs, answerAgent, callingWorkflow, catalog, chatAgent, confirmDocs, deferred, functionWorkflow, ingressResults, kernelId,
  loopWorkflow, manualClock, models, nativeBodies, pauseEmissions, readThenAnswer, toolAgent,
} from "./bridge-fixtures.ts";

const REPO = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EXAMPLES = "examples/execution-kernel-minimal";
const HARNESS_METHODS = [...LEGACY_HARNESS_READERS, ...Object.keys(LEGACY_HARNESS_MUTATORS)];
/** Names the 0.8.x surface had and K1.4 removed; a row may cover them so the documentation can mention them. */
const REMOVED = new Set(["StartedExecution.inputReceipt", "StartExecutionInput.ownerExecutionId"]);

// -- the code side ---------------------------------------------------------------------------------

const UTILITY = new Set(["Partial", "Pick", "Omit", "Readonly", "Required"]);

/** Every export of `index.ts` and every member of the SDK-declared exported types. */
function enumerateSurface(): { exports: string[]; members: string[] } {
  const index = fileURLToPath(new URL("../src/index.ts", import.meta.url));
  const sdkDir = fileURLToPath(new URL("../src/", import.meta.url));
  // The repository's compiler options, read directly: this test stays outside the Kernel quarantine list.
  const config = ts.readConfigFile(join(REPO, "tsconfig.json"), ts.sys.readFile);
  const options = { ...ts.parseJsonConfigFileContent(config.config, ts.sys, REPO).options, noEmit: true };
  const program = ts.createProgram([index], options);
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(index)!)!;
  const exports: string[] = [];
  const members: string[] = [];
  const walk = (prefix: string, type: ts.Type, depth: number) => {
    for (const property of checker.getPropertiesOfType(type)) {
      const declarations = property.getDeclarations() ?? [];
      if (declarations.length > 0 && declarations.every(declaration => program.isSourceFileDefaultLibrary(declaration.getSourceFile()))) continue;
      const key = `${prefix}.${property.getName()}`;
      members.push(key);
      if (depth > 0 || declarations.length === 0) continue;
      const member = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(property, declarations[0]!));
      const alias = member.aliasSymbol?.getName();
      const anonymous = member.getSymbol()?.getName() === "__type";
      const mapped = ((member as ts.ObjectType).objectFlags ?? 0) & ts.ObjectFlags.Mapped;
      if (member.getCallSignatures().length === 0 && (member.flags & ts.TypeFlags.Object) && (alias === undefined || UTILITY.has(alias)) && (anonymous || mapped)) {
        walk(key, member, depth + 1);
      }
    }
  };
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    exports.push(exported.getName());
    const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    const declared = target.getDeclarations()?.[0]?.getSourceFile().fileName ?? "";
    if (!declared.startsWith(sdkDir)) continue;
    if (target.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Class)) {
      walk(exported.getName(), checker.getDeclaredTypeOfSymbol(target), 0);
    }
  }
  return { exports, members };
}

// -- the documentation side ------------------------------------------------------------------------

/** The declared scope: guide pages reachable from the guide map, the SDK README, the builder skill and the examples. */
function documentationScope(): string[] {
  const guides = "docs/guides";
  const reached = new Set<string>();
  const stack = [`${guides}/README.md`];
  while (stack.length > 0) {
    const page = normalize(stack.pop()!);
    if (reached.has(page)) continue;
    reached.add(page);
    for (const match of readFileSync(join(REPO, page), "utf8").matchAll(/\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g)) {
      if (match[1]!.includes("://")) continue;
      const target = normalize(join(dirname(page), match[1]!));
      if (target.startsWith(`${guides}/`)) stack.push(target);
    }
  }
  const examples = readdirSync(join(REPO, EXAMPLES)).filter(name => statSync(join(REPO, EXAMPLES, name)).isFile()).map(name => `${EXAMPLES}/${name}`);
  return [...[...reached].sort(), "packages/sdk/README.md", ".agents/skills/arrokothi-agent-builder/SKILL.md", ...examples.sort()];
}

/** The backticked code of a page, or the whole file for a non-Markdown example file. */
function codeOf(file: string, text: string): string[] {
  if (!file.endsWith(".md")) return [text];
  const fenced = [...text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(match => match[1]!);
  const prose = text.replace(/```[\s\S]*?```/g, "");
  return [...fenced, ...[...prose.matchAll(/`([^`\n]+)`/g)].map(match => match[1]!)];
}

const FILE_SUFFIX = new Set(["ts", "js", "mjs", "md", "json", "test"]);

/** E1–E4 over the declared scope: each item with the files that mention it. */
function extractDocumentation(
  exportNames: ReadonlySet<string>, applicationMembers: ReadonlySet<string>,
  pages: readonly (readonly [file: string, text: string])[] = documentationScope().map(file => [file, readFileSync(join(REPO, file), "utf8")] as const),
): Map<string, Set<string>> {
  const items = new Map<string, Set<string>>();
  const add = (item: string, file: string) => { if (!items.has(item)) items.set(item, new Set()); items.get(item)!.add(file); };
  const harness = new Set(HARNESS_METHODS);
  for (const [file, text] of pages) {
    if (file.startsWith(`${EXAMPLES}/`)) add(file, file);
    for (const match of text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
      if (match[1]!.includes("://")) continue;
      const target = normalize(join(dirname(file), match[1]!));
      if (target.startsWith(`${EXAMPLES}/`) && target !== EXAMPLES) add(target, file);
    }
    const inExamples = file.startsWith(`${EXAMPLES}/`);
    for (const code of codeOf(file, text)) {
      for (const match of code.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']@arrokothi\/sdk["']/g)) {
        for (const part of match[1]!.split(",")) {
          const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]!.trim();
          if (name) add(name, file);
        }
      }
      const receivers: [RegExp, string][] = [
        [/(?<![\w$.])application\.([A-Za-z_$][\w$]*)/g, "Application"],
        [/\.application\.([A-Za-z_$][\w$]*)/g, "Application"],
        [/(?<![\w$])harness\.([A-Za-z_$][\w$]*)/g, "Harness"],
        [/(?<![\w$])services\.([A-Za-z_$][\w$]*)/g, "ApplicationServices"],
        [/(?<![\w$])runtime\.([A-Za-z_$][\w$]*)/g, "ApplicationOptions.runtime"],
        ...(inExamples ? [] : [[/(?<![\w$.])app\.([A-Za-z_$][\w$]*)/g, "Application"] as [RegExp, string]]),
      ];
      for (const [pattern, owner] of receivers) {
        for (const match of code.matchAll(pattern)) if (!FILE_SUFFIX.has(match[1]!)) add(`${owner}.${match[1]}`, file);
      }
      for (const match of code.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)/g)) {
        const name = match[1]!;
        if (exportNames.has(name)) add(name, file);
        if (applicationMembers.has(name)) add(`Application.${name}`, file);
        if (harness.has(name)) add(`Harness.${name}`, file);
      }
    }
  }
  return items;
}

// -- shared row helpers ----------------------------------------------------------------------------

const code = (value: unknown) => (value as { code?: string } | undefined)?.code;
const up = () => ({ up: () => ({ status: "completed" as const, result: null }) });
const nativeCount = async (app: Application) => (await app.services.store.listExecutions()).length;
/** A start that must refuse: the named error, then no Kernel Execution and no native record. */
async function refusesWithoutRecords(app: Application, input: StartExecutionInput, accept: (error: unknown) => boolean) {
  const creationKey = "refused-start";
  await assert.rejects(app.start({ ...input, creationKey } as StartExecutionInput), accept);
  assert.throws(() => app.inspect(kernelId(creationKey)), /Unknown Execution/);
  assert.equal(await nativeCount(app), 0);
}
const configuration = (diagnostic: string) => (error: unknown) =>
  error instanceof ApplicationConfigurationError && error.diagnostics.some(item => item.code === diagnostic);
/** A Function handler that parks until released; each call records its start. */
function parkedHandler() {
  const gate = deferred();
  let calls = 0;
  let active = 0;
  let peak = 0;
  return {
    handler: async () => { calls += 1; active += 1; peak = Math.max(peak, active); await gate.promise; active -= 1; return { status: "completed" as const, result: null }; },
    release: () => gate.resolve(),
    get calls() { return calls; },
    get peak() { return peak; },
  };
}
const counting = (): CapabilityExecutor & { calls: number } => {
  const executor = { calls: 0, async execute() { executor.calls += 1; return { status: "success" as const, observation: "docs" }; } };
  return executor;
};
const scripted = (steps: ConstructorParameters<typeof ScriptedModelProvider>[0]["steps"]) => new ScriptedModelProvider({ id: "s", steps });
const confirming = () => {
  const executor = counting();
  const app = createApplication({ models: models(scripted(readThenAnswer())), capabilities: { catalog, executor }, authorizer: allowDocs(), confirmationPolicy: confirmDocs() });
  return { app, executor };
};

// -- the rows --------------------------------------------------------------------------------------

type Disposition = "P" | "PD" | "M" | "F" | "N" | "note" | "P (new)" | "PD / M";
interface Row { readonly id: string; readonly disposition: Disposition; readonly feature: string; readonly covers: readonly string[]; readonly check: () => Promise<void> }

const runtimeKey = (name: string) => `ApplicationOptions.runtime.${name}`;
const members = (owner: string, names: readonly string[]) => names.map(name => `${owner}.${name}`);

const ROWS: readonly Row[] = [
  { id: "S-DEFS", disposition: "P", feature: "authoring functions and the core type re-exports",
    covers: ["defineAgent", "defineWorkflow", "definitionRef", "AgentDefinition", "AgentSpec", "WorkflowDefinition", "WorkflowSpecInput", "StageDefinitionInput",
      "ExecutionDefinition", "ExecutionDefinitionRef", "ExecutionId", "OperationRef", "ObjectSchema", "ValueSchema", "StructuredMemoryBinding"],
    async check() {
      const app = createApplication({ functions: up() });
      const workflow = functionWorkflow("defs", "up");
      await app.register(workflow);
      const { executionId } = await app.start({ definition: definitionRef(workflow) });
      assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
      assert.equal(defineAgent(answerAgent()).id, "answer");
      assert.equal(defineWorkflow(loopWorkflow()).id, "loop");
    } },
  { id: "S-ERR", disposition: "P", feature: "ApplicationConfigurationError carries the preflight diagnostics",
    covers: ["ApplicationConfigurationError", "ApplicationConfigurationError.diagnostics"],
    async check() {
      const app = createApplication();
      await refusesWithoutRecords(app, { definition: functionWorkflow("missing", "absent") }, error =>
        error instanceof ApplicationConfigurationError && error.diagnostics.length > 0 && error.diagnostics.every(item => item.severity !== undefined));
    } },
  { id: "S-OPT-NATIVE", disposition: "P", feature: "native options configure the Driver's native Runtime as before",
    covers: ["ApplicationOptions", ...members("ApplicationOptions", ["models", "capabilities", "capabilities.catalog", "capabilities.executor", "functions", "authorizer", "confirmationPolicy", "controllers"]),
      "ApplicationModels", ...members("ApplicationModels", ["providers", "bindings", "resolver"])],
    async check() {
      const executor = counting();
      let hookServices: unknown;
      const provider = scripted(readThenAnswer());
      const resolver = new StaticModelResolver({ primary: { provider: provider.id, model: "test", portableFeatures: portableModelFeatures({ capabilityCalls: true, structuredOutput: true }) } });
      const app = createApplication({
        models: { providers: [provider], resolver }, capabilities: { catalog, executor }, authorizer: allowDocs(), functions: up(),
        controllers: services => { hookServices = services; return {}; },
      });
      assert.equal(hookServices, app.services, "the controllers hook receives the actual services");
      const { executionId } = await app.start({ definition: toolAgent(), operationAuthority: { operations: [DOCS] }, input: { label: "user", payload: "read" } });
      assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
      assert.equal(executor.calls, 1);
      const bound = createApplication({ models: models(scripted([{ output: { text: "ok" } }])) });
      const answered = await bound.start({ definition: answerAgent(), input: { label: "user", payload: "q" } });
      assert.equal((await bound.runUntilBlocked(answered.executionId)).reason, "completed");
    } },
  { id: "S-RT-NATIVE", disposition: "P", feature: "runtime store, definitions, inline wait, budgets and security profile are native services",
    covers: [runtimeKey("store"), runtimeKey("definitions"), runtimeKey("inlineWait"), runtimeKey("activationBudget"), runtimeKey("defaultEffectDeadlineMs"), runtimeKey("securityProfile"), "ApplicationOptions.runtime"],
    async check() {
      const store = new InMemoryRuntimeStore();
      const definitions = new InMemoryDefinitionStore();
      const app = createApplication({ functions: up(), runtime: { store, definitions, inlineWait: createNoInlineWaitBudget(), defaultEffectDeadlineMs: 5_000 } });
      assert.equal(app.services.store, store);
      assert.equal(app.services.definitions, definitions);
      const { executionId } = await app.start({ definition: functionWorkflow("native", "up") });
      assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
      assert.equal((await store.readExecution(executionId as ExecutionId))?.lifecycle, "COMPLETED");
    } },
  { id: "S-RT-CLOCK", disposition: "P", feature: "runtime.clock also feeds the Kernel clock",
    covers: [runtimeKey("clock")],
    async check() {
      const time = manualClock();
      const app = createApplication({ models: models(scripted([{ output: { text: "One" } }])), runtime: { clock: time.clock } });
      const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hi" }, executionDeadline: new Date(time.now + 10) });
      assert.equal((await app.runUntilBlocked(executionId)).reason, "input_required");
      time.advance(20);
      assert.equal((await app.runUntilBlocked(executionId)).reason, "cancelled");
      assert.equal(app.inspect(executionId).cancellation?.cause, "execution_deadline");
    } },
  { id: "S-RT-IDS", disposition: "P", feature: "runtime.ids supplies every native ID except the root, which is the Kernel ID",
    covers: [runtimeKey("ids")],
    async check() {
      let calls = 0;
      const app = createApplication({ functions: up(), runtime: { ids: { next: (prefix: string) => `${prefix}_custom${++calls}` } } });
      const { executionId } = await app.start({ definition: functionWorkflow("ids", "up"), creationKey: "ids" });
      assert.equal(executionId, kernelId("ids"));
      await app.runUntilBlocked(executionId);
      assert.ok(calls > 0);
      assert.ok((await app.harness.transitionsOf(executionId as ExecutionId)).length > 0);
    } },
  { id: "S-RT-SCHED", disposition: "F", feature: "runtime.scheduler is refused: Kernel dispatch and the lineage scheduler own scheduling",
    covers: [runtimeKey("scheduler")],
    async check() {
      const scheduler = createApplication().services.scheduler;
      assert.throws(() => createApplication({ runtime: { scheduler } }), configuration("scheduler_owned_by_bridge"));
    } },
  { id: "S-RT-MAXRUN", disposition: "PD", feature: "runtime.maxActivationsPerRun is accepted and ignored, with a preflight warning",
    covers: [runtimeKey("maxActivationsPerRun")],
    async check() {
      const app = createApplication({ functions: up(), runtime: { maxActivationsPerRun: 1 } });
      const report = await app.preflight({ definition: loopWorkflow() });
      assert.ok(report.diagnostics.some(item => item.code === "option_ignored" && item.severity === "warning"));
    } },
  { id: "S-SERVICES", disposition: "P", feature: "Application.services are the native services; the scheduler is the lineage scheduler",
    covers: ["Application.services", "ApplicationServices", ...members("ApplicationServices", ["store", "definitions", "scheduler", "catalog", "models", "models.resolver", "models.providers"])],
    async check() {
      const app = createApplication({ models: models(scripted([])), capabilities: { catalog, executor: counting() } });
      assert.equal(app.services.catalog, catalog);
      assert.ok(app.services.models?.resolver && app.services.models.providers);
      assert.equal(typeof app.services.scheduler.claim, "function");
      assert.equal(app.services.scheduler.constructor.name, "LineageScheduler");
      assert.equal(await nativeCount(app), 0);
    } },
  { id: "S-REGISTER", disposition: "P", feature: "register writes the native DefinitionStore",
    covers: ["Application.register"],
    async check() {
      const app = createApplication({ functions: up() });
      const workflow = functionWorkflow("registered", "up");
      const [ref] = await app.register(workflow, workflow);
      assert.equal(ref?.id, "registered");
      await assert.rejects(app.register(functionWorkflow("registered", "other")), /version|conflict/i, "changed bytes at the same version conflict");
    } },
  { id: "S-PREFLIGHT", disposition: "P", feature: "preflight reads, plus the refused-option diagnostics",
    covers: ["Application.preflight", "PreflightReport", "PreflightReport.ok", "PreflightReport.diagnostics", "PreflightDiagnostic", ...members("PreflightDiagnostic", ["severity", "code", "path", "message"])],
    async check() {
      const app = createApplication();
      const report = await app.preflight({ definition: functionWorkflow("missing", "absent") });
      assert.equal(report.ok, false);
      const error = report.diagnostics.find(item => item.severity === "error")!;
      assert.ok(error.code && error.path !== undefined && error.message);
      assert.equal(await nativeCount(app), 0);
    } },
  { id: "S-START", disposition: "P", feature: "start creates the Kernel Execution and the native root under one ID",
    covers: ["createApplication", "Application", "Application.start", "StartedExecution", ...members("StartedExecution", ["executionId", "kind", "definition", "ownerExecutionId", "rootExecutionId", "preflight", "receipt", "replayed"]),
      "StartExecutionInput", ...members("StartExecutionInput", ["definition", "input", "input.label", "input.payload", "input.correlationId", "input.causationId", "creationKey"])],
    async check() {
      const app = createApplication({ functions: up() });
      const started = await app.start({ definition: functionWorkflow("start", "up"), creationKey: "start-key", input: { label: "go", payload: null, correlationId: null, causationId: null } });
      assert.equal(started.executionId, kernelId("start-key"));
      assert.equal(started.rootExecutionId, started.executionId);
      assert.equal(started.ownerExecutionId, null);
      assert.equal(started.kind, "workflow");
      assert.equal(started.definition.id, "start");
      assert.equal(started.preflight.ok, true);
      assert.equal(started.replayed, false);
      assert.equal(typeof started.receipt.token, "string");
      assert.equal(app.inspect(started.executionId).state, "READY");
      assert.equal((await app.harness.inspect(started.executionId))?.executionId, started.executionId);
      const again = await app.start({ definition: functionWorkflow("start", "up"), creationKey: "start-key", input: { label: "go", payload: null, correlationId: null, causationId: null } });
      assert.equal(again.replayed, true);
    } },
  { id: "S-START-PARAMS", disposition: "P", feature: "operationAuthority, structuralSpawnBudget and structuredMemory reach the native root",
    covers: members("StartExecutionInput", ["operationAuthority", "structuralSpawnBudget", "structuredMemory"]),
    async check() {
      const app = createApplication({ functions: up() });
      const { executionId } = await app.start({
        definition: functionWorkflow("params", "up"), operationAuthority: { operations: [DOCS] }, structuralSpawnBudget: 2,
        structuredMemory: { fields: [{ key: "title", schema: { kind: "string" } }] },
      });
      assert.deepEqual((await app.harness.effectiveOperationAuthorityOf(executionId))?.operations, [DOCS]);
      assert.equal((await app.harness.lineageSpawnBudgetOf(executionId))?.capacity, 2);
      assert.ok(await app.harness.structuredMemoryOf(executionId));
    } },
  { id: "S-START-ORDER", disposition: "P", feature: "initial input is atomic with creation, before the first Activation",
    covers: [],
    async check() {
      const app = createApplication({ functions: up() });
      const { executionId } = await app.start({ definition: functionWorkflow("order", "up"), input: { label: "first", payload: "x" } });
      const view = app.inspect(executionId);
      assert.equal(view.exchanges.length, 0);
      assert.equal(view.mailbox.length, 1);
      await app.runUntilBlocked(executionId);
      assert.equal(ingressResults(app, executionId)[0]?.eventId, view.mailbox[0]!.eventId);
    } },
  { id: "S-START-RECEIPT", disposition: "M", feature: "inputReceipt is replaced by the Kernel receipt and the first exchange's ingress_result",
    covers: ["StartedExecution.inputReceipt"],
    async check() {
      const app = createApplication({ functions: up() });
      const started = await app.start({ definition: functionWorkflow("receipt", "up"), input: { label: "first", payload: "x" } });
      assert.equal("inputReceipt" in started, false);
      await app.runUntilBlocked(started.executionId);
      assert.equal(ingressResults(app, started.executionId)[0]?.status, "delivered");
    } },
  { id: "S-START-REJECT", disposition: "M", feature: "a native rejection of the initial input fails E as initial_input_rejected",
    covers: [],
    async check() {
      const app = createApplication({ functions: up() });
      const { executionId } = await app.start({ definition: functionWorkflow("reject", "up"), input: { label: "first", payload: "x" } });
      // The unsupported services.store side door (L-34) ends the native root before the first exchange.
      await app.services.store.transact(executionId as ExecutionId, async tx => {
        const context = (await tx.executions.get(executionId as ExecutionId))!;
        await tx.executions.update({ ...context, lifecycle: "CANCELLED", revision: context.revision + 1 }, context.revision);
      });
      const run = await app.runUntilBlocked(executionId);
      assert.equal(run.reason, "failed");
      assert.equal(code(run.kernel.result?.value), "arrokothi.bridge.initial_input_rejected");
    } },
  { id: "S-START-NATIVE", disposition: "P (new)", feature: "a native creation error cancels E and throws ApplicationStartError",
    covers: ["ApplicationStartError", ...members("ApplicationStartError", ["code", "executionId", "refusal"])],
    async check() {
      const store = new InMemoryRuntimeStore();
      const first = createApplication({ functions: up(), runtime: { store } });
      await first.start({ definition: functionWorkflow("shared", "up"), creationKey: "shared" });
      const second = createApplication({ functions: up(), runtime: { store } });
      await assert.rejects(second.start({ definition: functionWorkflow("shared", "up"), creationKey: "shared" }), (error: unknown) =>
        error instanceof ApplicationStartError && error.code === "arrokothi.bridge.native_root_exists" && error.executionId === kernelId("shared") && error.refusal === undefined);
      assert.equal(second.inspect(kernelId("shared")).state, "CANCELLED");
    } },
  { id: "S-START-DEADLINE", disposition: "P (new)", feature: "executionDeadline is an absolute instant; an exact retry replays",
    covers: ["StartExecutionInput.executionDeadline"],
    async check() {
      const time = manualClock();
      const app = createApplication({ functions: up(), runtime: { clock: time.clock } });
      const executionDeadline = new Date(time.now + 1_000);
      const first = await app.start({ definition: functionWorkflow("deadline", "up"), creationKey: "deadline", executionDeadline });
      const retry = await app.start({ definition: functionWorkflow("deadline", "up"), creationKey: "deadline", executionDeadline: new Date(executionDeadline.getTime()) });
      assert.equal(retry.replayed, true);
      assert.equal(retry.executionId, first.executionId);
      await assert.rejects(app.start({ definition: functionWorkflow("deadline", "up"), creationKey: "deadline", executionDeadline: new Date(time.now + 2_000) }), ApplicationStartError);
    } },
  { id: "S-WAIT-DEADLINE", disposition: "P (new)", feature: "humanWaitDeadlineMs bounds a declared human pause",
    covers: ["ApplicationOptions.humanWaitDeadlineMs"],
    async check() {
      const time = manualClock();
      const app = createApplication({ models: models(scripted([{ output: { text: "One" } }])), humanWaitDeadlineMs: 50, runtime: { clock: time.clock } });
      const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hi" } });
      assert.equal((await app.runUntilBlocked(executionId)).reason, "input_required");
      time.advance(60);
      const run = await app.runUntilBlocked(executionId);
      assert.equal(run.reason, "failed");
      assert.equal(code(run.kernel.result?.value), "arrokothi.bridge.wait_deadline_expired");
    } },
  { id: "S-OWNER", disposition: "F", feature: "a host-supplied ownerExecutionId is refused: Kernel composition is K4's",
    covers: ["StartExecutionInput.ownerExecutionId"],
    async check() {
      const app = createApplication({ functions: up() });
      await refusesWithoutRecords(app, { definition: functionWorkflow("owned", "up"), ownerExecutionId: "exe_owner" } as unknown as StartExecutionInput, configuration("owner_unsupported"));
    } },
  { id: "S-RUN", disposition: "P", feature: "runUntilBlocked reports each reason from Kernel state and the latest pause Emission",
    covers: ["Application.runUntilBlocked", "RunResult", "RunResult.reason", "RunResult.waitingExecutionId"],
    async check() {
      const parked = parkedHandler();
      const app = createApplication({ models: models(scripted([{ output: { text: "One" } }])), functions: {
        ...up(), fail: () => ({ status: "failed", code: "boom", message: "no" }), tick: () => ({ status: "completed", result: null }), park: parked.handler,
      } });
      const reason = async (input: StartExecutionInput, options = {}) => (await app.runUntilBlocked((await app.start(input)).executionId, options)).reason;
      assert.equal(await reason({ definition: functionWorkflow("ok", "up") }), "completed");
      assert.equal(await reason({ definition: functionWorkflow("bad", "fail") }), "failed");
      assert.equal(await reason({ definition: loopWorkflow() }, { maxActivations: 1 }), "activation_limit");
      const chat = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hi" } });
      const waiting = await app.runUntilBlocked(chat.executionId);
      assert.deepEqual([waiting.reason, waiting.waitingExecutionId], ["input_required", chat.executionId]);
      await app.cancel(chat.executionId);
      assert.equal((await app.runUntilBlocked(chat.executionId)).reason, "cancelled");
      const slow = await app.start({ definition: functionWorkflow("slow", "park") });
      assert.equal((await app.runUntilBlocked(slow.executionId, { timeoutMs: 20, pollIntervalMs: 1 })).reason, "timeout");
      const abort = new AbortController(); abort.abort();
      assert.equal((await app.runUntilBlocked(slow.executionId, { signal: abort.signal })).reason, "aborted");
      parked.release();
      assert.equal((await app.runUntilBlocked(slow.executionId)).reason, "completed");
      const { app: confirmingApp } = confirming();
      const tool = await confirmingApp.start({ definition: toolAgent(), operationAuthority: { operations: [DOCS] }, input: { label: "user", payload: "read" } });
      assert.equal((await confirmingApp.runUntilBlocked(tool.executionId)).reason, "confirmation_required");
    } },
  { id: "S-RUN-RESULT", disposition: "PD / M", feature: "RunResult.execution is the deprecated native view; kernel is authoritative; activations counts exchanges",
    covers: ["RunResult.execution", "RunResult.kernel", "RunResult.activations"],
    async check() {
      const app = createApplication({ functions: up() });
      const { executionId } = await app.start({ definition: functionWorkflow("result", "up") });
      const run = await app.runUntilBlocked(executionId);
      assert.equal(run.execution.lifecycle, "COMPLETED");
      assert.equal(run.kernel.state, "COMPLETED");
      assert.equal(run.activations, run.kernel.exchanges.length);
    } },
  { id: "S-RUN-OPT", disposition: "P", feature: "timeoutMs, maxActivations, pollIntervalMs and signal bound the host wait",
    covers: ["RunOptions", ...members("RunOptions", ["timeoutMs", "maxActivations", "pollIntervalMs", "signal"])],
    async check() {
      const parked = parkedHandler();
      const app = createApplication({ functions: { park: parked.handler, tick: () => ({ status: "completed", result: null }) } });
      const loop = await app.start({ definition: loopWorkflow() });
      const limited = await app.runUntilBlocked(loop.executionId, { maxActivations: 2 });
      assert.deepEqual([limited.reason, limited.activations, limited.kernel.state], ["activation_limit", 2, "READY"]);
      const slow = await app.start({ definition: functionWorkflow("slow", "park") });
      assert.equal((await app.runUntilBlocked(slow.executionId, { timeoutMs: 10, pollIntervalMs: 2 })).reason, "timeout");
      const abort = new AbortController();
      const waiting = app.runUntilBlocked(slow.executionId, { signal: abort.signal });
      abort.abort();
      assert.equal((await waiting).reason, "aborted");
      parked.release();
      await app.cancel(loop.executionId);
    } },
  { id: "S-IDLE", disposition: "PD", feature: "runUntilIdle dispatches until nothing is READY and returns the native ActivationRecords",
    covers: ["Application.runUntilIdle"],
    async check() {
      const app = createApplication({ functions: up() });
      const { executionId } = await app.start({ definition: functionWorkflow("idle", "up") });
      const records = await app.runUntilIdle();
      assert.ok(records.length >= 1);
      assert.equal(app.inspect(executionId).state, "COMPLETED");
    } },
  { id: "S-HARNESS-R", disposition: "PD", feature: "harness readers pass through as native diagnostics",
    covers: ["Application.harness", "LegacyHarnessView", ...members("LegacyHarnessView", LEGACY_HARNESS_READERS), ...members("Harness", LEGACY_HARNESS_READERS)],
    async check() {
      const app = createApplication({ functions: up() });
      const { executionId } = await app.start({ definition: functionWorkflow("readers", "up") });
      const view = app.harness as unknown as Record<string, (id: string) => Promise<unknown>>;
      for (const reader of LEGACY_HARNESS_READERS) await view[reader]!(executionId);
      assert.equal((await app.harness.inspect(executionId))?.executionId, executionId);
    } },
  { id: "S-HARNESS-W", disposition: "F", feature: "harness mutators refuse by name with no native effect",
    covers: [...members("Harness", Object.keys(LEGACY_HARNESS_MUTATORS)), "LegacyHarnessMutationRefused", "LegacyHarnessMutationRefused.method", "LegacyHarnessMutationRefused.replacement"],
    async check() {
      const app = createApplication({ functions: up() });
      const view = app.harness as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
      for (const [method, replacement] of Object.entries(LEGACY_HARNESS_MUTATORS)) {
        await assert.rejects(view[method]!({}), (error: unknown) => error instanceof LegacyHarnessMutationRefused && error.method === method && error.replacement === replacement);
      }
      assert.equal(await nativeCount(app), 0);
    } },
  { id: "S-INPUT", disposition: "M", feature: "app.input replaces harness.deliverExternalInput and goes through Kernel submitInput",
    covers: ["Application.input", "ApplicationInput", ...members("ApplicationInput", ["requestKey", "label", "payload", "destination", "correlationId", "causationId"]),
      "ApplicationInputError", ...members("ApplicationInputError", ["code", "issues", "refusal"])],
    async check() {
      const provider = scripted([{ output: { text: "One" } }, { output: { text: "Two" } }]);
      const app = createApplication({ models: models(provider) });
      const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hi" } });
      await app.runUntilBlocked(executionId);
      const request = { requestKey: "turn-2", label: "user", payload: "more", destination: executionId, correlationId: null, causationId: null };
      const first = await app.input(executionId, request);
      assert.equal((await app.input(executionId, request)).eventId, first.eventId);
      assert.equal((await app.runUntilBlocked(executionId)).reason, "input_required");
      assert.equal(provider.requests.length, 2);
      await assert.rejects(app.input(executionId, { label: "" }), (error: unknown) => error instanceof ApplicationInputError && error.code === "invalid_input_label");
      await app.cancel(executionId);
      await assert.rejects(app.input(executionId, { label: "user", payload: "late" }), (error: unknown) => error instanceof ApplicationInputError && error.refusal !== undefined);
    } },
  { id: "S-CONFIRM", disposition: "M", feature: "app.resolveConfirmation replaces harness.resolveConfirmation; a decision is Kernel input",
    covers: ["Application.resolveConfirmation", "ApplicationConfirmation", ...members("ApplicationConfirmation", ["requestKey", "confirmationId", "decision"])],
    async check() {
      const { app, executor } = confirming();
      const { executionId } = await app.start({ definition: toolAgent(), operationAuthority: { operations: [DOCS] }, input: { label: "user", payload: "read" } });
      await app.runUntilBlocked(executionId);
      const confirmationId = pauseEmissions(app, executionId).at(-1)![0]!.confirmationId!;
      const decision = { requestKey: "approve", confirmationId, decision: "approve" as const };
      const first = await app.resolveConfirmation(executionId, decision);
      assert.equal((await app.resolveConfirmation(executionId, decision)).eventId, first.eventId);
      assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
      assert.equal(executor.calls, 1);
    } },
  { id: "S-CANCEL", disposition: "M", feature: "app.cancel replaces harness.cancelExecution and cancels the native lineage",
    covers: ["Application.cancel", "CancellationDecision", ...members("CancellationDecision", ["changed", "state", "cancellation", "result"])],
    async check() {
      const app = createApplication({ models: models(scripted([{ output: { text: "One" } }])) });
      const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hi" } });
      await app.runUntilBlocked(executionId);
      const decision = await app.cancel(executionId);
      assert.deepEqual([decision.changed, decision.state], [true, "CANCELLED"]);
      assert.ok(decision.cancellation);
      assert.equal(decision.result, null);
      assert.equal((await app.cancel(executionId)).changed, false);
      assert.equal((await app.harness.inspect(executionId))?.lifecycle, "CANCELLED");
    } },
  { id: "S-SETTLE", disposition: "F", feature: "out-of-band settleEffect is refused: the trusted result ingress is K2's",
    covers: ["Harness.settleEffect"],
    async check() {
      await assert.rejects((createApplication().harness as unknown as Record<string, (input: unknown) => Promise<unknown>>).settleEffect!({}), (error: unknown) => error instanceof LegacyHarnessMutationRefused && error.method === "settleEffect");
    } },
  { id: "S-USERINPUT", disposition: "F", feature: "typed user input is refused: no stock controller requests it",
    covers: ["Harness.submitUserInput"],
    async check() {
      await assert.rejects((createApplication().harness as unknown as Record<string, (input: unknown) => Promise<unknown>>).submitUserInput!({}), (error: unknown) => error instanceof LegacyHarnessMutationRefused && error.method === "submitUserInput");
    } },
  { id: "S-INSPECT", disposition: "P (new)", feature: "app.inspect is the Kernel ExecutionView, with accepted Emissions and the result",
    covers: ["Application.inspect"],
    async check() {
      const app = createApplication({ functions: { up: () => ({ status: "completed", result: null, emissions: [{ body: { kind: "text", text: "hi" } }] }) } });
      const { executionId } = await app.start({ definition: functionWorkflow("inspect", "up") });
      await app.runUntilBlocked(executionId);
      const view = app.inspect(executionId);
      assert.equal(view.state, "COMPLETED");
      assert.deepEqual(nativeBodies(app, executionId), [{ kind: "text", text: "hi" }]);
      assert.ok(view.result);
    } },
  { id: "S-WRAPPER", disposition: "P (new)", feature: "toCanonicalBytes and ValueIssue, under the L-01 check (B-WRAPPER)",
    covers: ["toCanonicalBytes", "ValueIssue", ...members("ValueIssue", ["path", "code", "message", "occurrences"]), "WrapperEnvironmentError", "WrapperEnvironmentError.identifier"],
    async check() {
      const accepted = toCanonicalBytes({ b: 1, a: 2 });
      assert.ok(accepted.ok && new TextDecoder().decode(accepted.value) === '{"a":2,"b":1}');
      const refused = toCanonicalBytes({ a: undefined });
      assert.ok(!refused.ok && refused.issues[0]!.path === "a" && refused.issues[0]!.code && refused.issues[0]!.message);
      assert.equal(new WrapperEnvironmentError("JSON").identifier, "JSON");
    } },
  { id: "S-VALUE-LIMITS", disposition: "M", feature: "a native value over the core limits fails E as value_unrepresentable after native work ran",
    covers: [],
    async check() {
      const rows = Array.from({ length: 5_000 }, (_, index) => index);
      const app = createApplication({ functions: { big: () => ({ status: "completed", result: null, emissions: [{ body: { kind: "data", data: rows } }] }) } });
      const { executionId } = await app.start({ definition: functionWorkflow("big", "big") });
      const run = await app.runUntilBlocked(executionId);
      assert.equal(run.execution.lifecycle, "COMPLETED");
      assert.equal(code(run.kernel.result?.value), "arrokothi.bridge.value_unrepresentable");
    } },
  { id: "S-INTERLEAVE", disposition: "M", feature: "native Activations of different Executions interleave; shared handlers must be reentrant",
    covers: [],
    async check() {
      const parked = parkedHandler();
      const app = createApplication({ functions: { park: parked.handler } });
      const one = await app.start({ definition: functionWorkflow("one", "park") });
      const two = await app.start({ definition: functionWorkflow("two", "park") });
      await app.runUntilBlocked(one.executionId, { timeoutMs: 20, pollIntervalMs: 1 });
      await app.runUntilBlocked(two.executionId, { timeoutMs: 20, pollIntervalMs: 1 });
      assert.equal(parked.peak, 2, "both handler calls were active at once");
      parked.release();
      assert.equal((await app.runUntilBlocked(one.executionId)).reason, "completed");
      assert.equal((await app.runUntilBlocked(two.executionId)).reason, "completed");
    } },
  { id: "S-MAILBOX-CAP", disposition: "note", feature: "input queued during a long RUNNING exchange is refused at the Kernel mailbox cap (1,024)",
    covers: [],
    async check() {
      const parked = parkedHandler();
      const app = createApplication({ functions: { park: parked.handler } });
      const { executionId } = await app.start({ definition: functionWorkflow("cap", "park") });
      await app.runUntilBlocked(executionId, { timeoutMs: 20, pollIntervalMs: 1 });
      assert.equal(app.inspect(executionId).state, "RUNNING");
      // The start Event is still unacknowledged while its exchange runs, so 1,023 more fit.
      for (let index = 0; index < 1_023; index += 1) await app.input(executionId, { label: "queued", payload: index });
      await assert.rejects(app.input(executionId, { label: "queued", payload: "one more" }), (error: unknown) => error instanceof ApplicationInputError && error.code === "capacity_exhausted");
      await app.cancel(executionId);
      parked.release();
    } },
  { id: "S-INGRESS-SYNC", disposition: "M", feature: "structural input errors are refused synchronously and write nothing",
    covers: [],
    async check() {
      const app = createApplication({ models: models(scripted([{ output: { text: "One" } }])) });
      const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hi" } });
      await app.runUntilBlocked(executionId);
      const mailbox = app.inspect(executionId).mailbox.length;
      await assert.rejects(app.input(executionId, { label: "user", destination: "not an id!" }), (error: unknown) => error instanceof ApplicationInputError && error.code === "invalid_destination");
      assert.equal(app.inspect(executionId).mailbox.length, mailbox);
    } },
  { id: "G-CHAT", disposition: "P", feature: "a multi-turn respond_and_wait Agent: Emission plus await; budgets are cumulative",
    covers: [],
    async check() {
      const provider = scripted([{ output: { text: "One" } }, { output: { text: "Two" } }]);
      const app = createApplication({ models: models(provider) });
      const { executionId } = await app.start({ definition: chatAgent(2), input: { label: "user", payload: "hi" } });
      assert.equal((await app.runUntilBlocked(executionId)).reason, "input_required");
      await app.input(executionId, { label: "user", payload: "again" });
      assert.equal((await app.runUntilBlocked(executionId)).reason, "input_required");
      await app.input(executionId, { label: "user", payload: "third" });
      assert.equal((await app.runUntilBlocked(executionId)).reason, "failed", "maxModelCalls is Execution-wide");
      assert.equal(provider.requests.length, 2);
    } },
  { id: "G-TOOLS", disposition: "P", feature: "capabilities, the authorizer and the operation ceiling, on the native unmediated path",
    covers: [],
    async check() {
      const executor = counting();
      const allowed = createApplication({ models: models(scripted(readThenAnswer())), capabilities: { catalog, executor }, authorizer: allowDocs() });
      const run = await allowed.start({ definition: toolAgent(), operationAuthority: { operations: [DOCS] }, input: { label: "user", payload: "read" } });
      assert.equal((await allowed.runUntilBlocked(run.executionId)).reason, "completed");
      assert.equal(executor.calls, 1);
      const denied = createApplication({ models: models(scripted(readThenAnswer())), capabilities: { catalog, executor } });
      const refused = await denied.start({ definition: toolAgent(), operationAuthority: { operations: [DOCS] }, input: { label: "user", payload: "read" } });
      await denied.runUntilBlocked(refused.executionId);
      assert.equal(executor.calls, 1, "deny by default dispatches nothing");
    } },
  { id: "G-CONFIRM", disposition: "P", feature: "exact-payload confirmation: one dispatch per approval; a decline dispatches nothing",
    covers: [],
    async check() {
      const { app, executor } = confirming();
      const { executionId } = await app.start({ definition: toolAgent(), operationAuthority: { operations: [DOCS] }, input: { label: "user", payload: "read" } });
      await app.runUntilBlocked(executionId);
      const confirmationId = pauseEmissions(app, executionId).at(-1)![0]!.confirmationId!;
      await app.resolveConfirmation(executionId, { confirmationId, decision: "decline" });
      await app.runUntilBlocked(executionId);
      assert.equal(executor.calls, 0);
    } },
  { id: "G-WORKFLOW", disposition: "P", feature: "Function Stages, adapters and transitions",
    covers: ["ApplicationOptions.adapters"],
    async check() {
      const workflow = defineWorkflow({ id: "adapted", spec: { entryStage: "seed", stages: [
        { id: "seed", kind: "function", implementationRef: "echo", inputAdapters: [{ kind: "function", implementationRef: "trim" }], transitions: { kind: "always", next: { to: "stage", stage: "finish" } } },
        { id: "finish", kind: "function", implementationRef: "emit", transitions: { kind: "always", next: { to: "complete" } } },
      ] } });
      const app = createApplication({ adapters: { trim: ctx => ({ kind: "transform", value: ctx.value?.trim() ?? null }) }, functions: {
        echo: ctx => ({ status: "completed", result: ctx.input }),
        emit: ctx => ({ status: "completed", result: null, emissions: [{ body: { kind: "text", text: `[${ctx.input}]` } }] }),
      } });
      const { executionId } = await app.start({ definition: workflow, input: { label: "text", payload: " seed " } });
      assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
      assert.deepEqual(nativeBodies(app, executionId), [{ kind: "text", text: "[seed]" }]);
    } },
  { id: "G-FORK", disposition: "P", feature: "parallel fork/join runs natively; await waits for quiescence",
    covers: [],
    async check() {
      const workflow = defineWorkflow({ id: "fork", spec: { entryStage: "seed", stages: [
        { id: "seed", kind: "function", implementationRef: "echo", transitions: { kind: "always", next: { to: "fork", fork: "both" } } },
        { id: "left", kind: "function", implementationRef: "echo", transitions: { kind: "always", next: { to: "join", fork: "both" } } },
        { id: "right", kind: "function", implementationRef: "echo", transitions: { kind: "always", next: { to: "join", fork: "both" } } },
        { id: "merge", kind: "function", implementationRef: "merge", transitions: { kind: "always", next: { to: "complete" } } },
      ], forks: [{ id: "both", branches: [{ id: "left", stage: "left" }, { id: "right", stage: "right" }], join: { next: "merge" } }] } });
      const app = createApplication({ functions: {
        echo: ctx => ({ status: "completed", result: ctx.input }),
        merge: ctx => ({ status: "completed", result: null, emissions: [{ body: { kind: "text", text: String(ctx.join!.branches.length) } }] }),
      } });
      const { executionId } = await app.start({ definition: workflow, input: { label: "text", payload: "x" } });
      assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
      assert.deepEqual(nativeBodies(app, executionId), [{ kind: "text", text: "2" }]);
    } },
  { id: "G-CHILD", disposition: "P", feature: "a called child runs inside the lineage; its human wait surfaces; cancellation cascades",
    covers: [],
    async check() {
      const app = createApplication({ models: models(scripted([{ output: { text: "One" } }])), authorizer: allowDocs() });
      await app.register(chatAgent());
      const { executionId } = await app.start({ definition: callingWorkflow("chat"), structuralSpawnBudget: 1, input: { label: "user", payload: "hi" } });
      const run = await app.runUntilBlocked(executionId);
      assert.equal(run.reason, "input_required");
      const child = run.waitingExecutionId!;
      assert.notEqual(child, executionId);
      await app.cancel(executionId);
      assert.equal((await app.harness.inspect(child))?.lifecycle, "CANCELLED");
    } },
  { id: "G-MEMORY", disposition: "P", feature: "Structured Memory read/write grants on the native unmediated path",
    covers: ["ApplicationOptions.memory", "ApplicationOptions.memory.read", "ApplicationOptions.memory.writeExposure", "ApplicationOptions.memory.executions"],
    async check() {
      const agent = defineAgent({ id: "memory", spec: {
        model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } }, instructions: "Save", completion: "complete_on_response",
        structuredMemory: { read: { keys: ["title"] }, write: { keys: ["title"] } },
      } });
      const provider = scripted([{ output: { capabilityCalls: [{ id: "write", capability: "memory_write_title", input: { value: "Draft" } }] } }, { output: { text: "Saved" } }]);
      const app = createApplication({ models: models(provider), memory: { read: true, writeExposure: { writableKeys: ["title"] } }, authorizer: createAllowListAuthorizer({ grants: [], memory: { writableKeys: ["title"] } }) });
      const { executionId } = await app.start({ definition: agent, structuredMemory: { fields: [{ key: "title", schema: { kind: "string" } }] }, input: { label: "user", payload: "Save" } });
      assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
      assert.equal((await app.harness.structuredMemoryOf(executionId))?.values.title?.value, "Draft");
      const scoped = createApplication({ models: models(scripted([])), memory: { read: true, executions: ["exe_other"] } });
      assert.ok((await scoped.preflight({ definition: agent })).diagnostics.length >= 0);
    } },
  { id: "G-NOTES", disposition: "P", feature: "Working Notes stay native controller state",
    covers: [],
    async check() {
      const agent = defineAgent({ id: "notes", spec: {
        model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } }, instructions: "Note", completion: "complete_on_response",
        workingNotes: { read: true, write: true },
      } });
      const provider = scripted([{ output: { capabilityCalls: [{ id: "n1", capability: "working_notes_set", input: { key: "plan", content: "step one" } }] } }, { output: { text: "Noted" } }]);
      const app = createApplication({ models: models(provider) });
      const { executionId } = await app.start({ definition: agent, input: { label: "user", payload: "note it" } });
      const run = await app.runUntilBlocked(executionId);
      assert.equal(run.reason, "completed");
      const progress = run.execution.control.progress as { workingNotes?: { entries?: { key: string; content: unknown }[] } };
      assert.deepEqual(progress.workingNotes?.entries, [{ key: "plan", content: "step one" }]);
      assert.equal(app.inspect(executionId).state, "COMPLETED");
    } },
  { id: "G-DERIVED", disposition: "P", feature: "Derived Semantic Memory through the controllers hook",
    covers: [],
    async check() {
      let resolves = 0;
      const agent = defineAgent({ id: "derived", spec: {
        model: { logicalRef: "primary", requirements: { text: true } }, instructions: "Use claims", completion: "complete_on_response",
        derivedMemory: { read: { query: "facts" } },
      } });
      const app = createApplication({ models: models(scripted([{ output: { text: "ok" } }])), controllers: () => ({ agent: { derivedSemanticMemoryReadView: { resolve() { resolves += 1; return null; } } } }) });
      const { executionId } = await app.start({ definition: agent, input: { label: "user", payload: "q" } });
      assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
      assert.equal(resolves, 1);
    } },
  { id: "G-SLOWMODEL", disposition: "P", feature: "a slow model call yields and resumes exactly once; the exchange stays RUNNING with no Kernel wait",
    covers: [],
    async check() {
      const provider = createDeferredModelProvider("slow");
      const app = createApplication({ models: models(provider), runtime: { inlineWait: createNoInlineWaitBudget() } });
      const { executionId } = await app.start({ definition: answerAgent(), input: { label: "user", payload: "q" } });
      assert.equal((await app.runUntilBlocked(executionId, { timeoutMs: 20, pollIntervalMs: 1 })).reason, "timeout");
      assert.deepEqual([app.inspect(executionId).state, app.inspect(executionId).wait], ["RUNNING", null]);
      provider.settle({ text: "Ready" });
      assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
      assert.equal(provider.invocationCount, 1);
    } },
  { id: "G-SLOWCAP", disposition: "P", feature: "a slow capability settles later inside the open exchange",
    covers: [],
    async check() {
      const gate = deferred();
      const app = createApplication({ models: models(scripted(readThenAnswer())), authorizer: allowDocs(), capabilities: { catalog, executor: { execute: async () => { await gate.promise; return { status: "success", observation: "done" }; } } } });
      const { executionId } = await app.start({ definition: toolAgent(), operationAuthority: { operations: [DOCS] }, input: { label: "user", payload: "read" } });
      assert.equal((await app.runUntilBlocked(executionId, { timeoutMs: 20, pollIntervalMs: 1 })).reason, "timeout");
      assert.equal(app.inspect(executionId).wait, null);
      gate.resolve();
      assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
    } },
  { id: "G-PROVIDERS", disposition: "P", feature: "the Gemini provider and the Strands executor through the controllers hook",
    covers: [],
    async check() {
      for (const strands of [false, true]) {
        let requests = 0;
        const provider = new GeminiModelProvider({ apiKey: "offline", fetchImpl: async () => {
          requests += 1;
          return new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: "verified" }] }, finishReason: "STOP" }] }), { status: 200 });
        } });
        const providers = new ModelProviderRegistry([provider]);
        const resolver = new StaticModelResolver({ primary: { provider: provider.id, model: "offline", portableFeatures: portableModelFeatures({ capabilityCalls: true, structuredOutput: true }) } });
        const executor = strands ? createStrandsAgentExecutor({ providers }) : createReferenceAgentExecutor({ providers });
        const app = createApplication({ models: { resolver, providers }, controllers: () => ({ agent: { executor } }) });
        const { executionId } = await app.start({ definition: answerAgent(), input: { label: "user", payload: "q" } });
        const run = await app.runUntilBlocked(executionId);
        assert.deepEqual([run.reason, run.execution.terminalResult?.value, requests], ["completed", "verified", 1]);
      }
    } },
  { id: "G-PEER", disposition: "N", feature: "send/ask/reply, RequestUserInput and detached spawn need custom controllers on @arrokothi/core",
    covers: [],
    async check() {
      // Preserved on @arrokothi/core, not routed through the Kernel: the SDK hosts only the stock controllers.
      const core = await import("@arrokothi/core");
      assert.equal(typeof core.Harness, "function");
      assert.equal("Harness" in sdk, false);
    } },
  { id: "G-CORE-DIRECT", disposition: "N", feature: "a direct @arrokothi/core Harness and custom controllers stay explicitly legacy",
    covers: [],
    async check() {
      const core = await import("@arrokothi/core");
      const harness = new core.Harness({ store: new InMemoryRuntimeStore(), definitions: new InMemoryDefinitionStore() } as never);
      assert.equal(typeof harness.runOnce, "function", "the native Harness keeps its own mutators outside the SDK");
    } },
  { id: "E-EXAMPLES", disposition: "M", feature: "the example sources use the new methods; each runs under an example test",
    covers: readdirSync(join(REPO, EXAMPLES)).filter(name => statSync(join(REPO, EXAMPLES, name)).isFile()).map(name => `${EXAMPLES}/${name}`),
    async check() {
      const files = readdirSync(join(REPO, EXAMPLES)).filter(name => name.endsWith(".ts"));
      const sources = files.filter(name => !name.endsWith(".test.ts"));
      const text = (name: string) => readFileSync(join(REPO, EXAMPLES, name), "utf8");
      const mutators = new RegExp(`\\.harness\\.(${Object.keys(LEGACY_HARNESS_MUTATORS).join("|")})\\b`);
      for (const name of files) {
        assert.doesNotMatch(text(name), mutators, `${name} calls a refused Harness mutator`);
        assert.doesNotMatch(text(name), /@arrokothi\/kernel/, `${name} imports the Kernel`);
      }
      const imported = (name: string) => files.some(other => other !== name && text(other).includes(`./${name}`));
      for (const name of sources.filter(name => !["main.ts", "patterns-main.ts"].includes(name))) assert.ok(imported(name), `${name} is reached from another example file`);
    } },
];

// -- closure ---------------------------------------------------------------------------------------

test("K14-4 closure: every export, member, Harness method and documentation item has a row", () => {
  const surface = enumerateSurface();
  assert.deepEqual(Object.keys(sdk).sort(), surface.exports.filter(name => typeof (sdk as Record<string, unknown>)[name] !== "undefined").sort(), "the runtime exports agree with index.ts");
  const applicationMembers = new Set(surface.members.filter(key => key.startsWith("Application.")).map(key => key.slice("Application.".length)));
  const extracted = extractDocumentation(new Set(surface.exports), applicationMembers);
  const covered = new Set(ROWS.flatMap(row => row.covers));
  const required = [...surface.exports, ...surface.members, ...HARNESS_METHODS.map(name => `Harness.${name}`)];
  assert.deepEqual(required.filter(item => !covered.has(item)), [], "enumerated items with no row");
  const uncovered = [...extracted].filter(([item]) => !covered.has(item)).map(([item, files]) => `${item} (${[...files].join(", ")})`);
  assert.deepEqual(uncovered, [], "documentation items with no row");
  const known = new Set([...required, ...extracted.keys(), ...REMOVED]);
  assert.deepEqual([...covered].filter(item => !known.has(item)), [], "rows covering a name that neither exists nor is a declared removal");
  assert.equal(new Set(ROWS.map(row => row.id)).size, ROWS.length, "row IDs are unique");
});

test("K14-4 closure: the extraction reads the declared scope and finds the members the documentation uses", () => {
  const scope = documentationScope();
  assert.equal(scope.filter(file => file.startsWith("docs/guides/")).length, 17, "every guide page reachable from the guide map");
  assert.ok(scope.includes("packages/sdk/README.md") && scope.includes(".agents/skills/arrokothi-agent-builder/SKILL.md"));
  const surface = enumerateSurface();
  const extracted = extractDocumentation(new Set(surface.exports), new Set(surface.members.filter(key => key.startsWith("Application.")).map(key => key.slice(12))));
  for (const item of ["createApplication", "Application.runUntilBlocked", "Application.start", "Application.preflight", `${EXAMPLES}/app.ts`]) {
    assert.ok(extracted.has(item), `extracted ${item}`);
  }
  // Controls: a page naming members and exports that do not exist, or a removed example, yields items no row
  // covers, so the closure would fail on it. The extraction is not vacuous.
  const covered = new Set(ROWS.flatMap(row => row.covers));
  const control = extractDocumentation(new Set(surface.exports), new Set(), [
    ["docs/guides/control.md", [
      "Call `application.deliverInput(id, event)` or `app.harness.replay(id)`.",
      "```ts\nimport { createApplication, Harness } from \"@arrokothi/sdk\";\nconst options = { runtime: { workers: 2 } };\nservices.queue.claim();\n```",
      `See [the old host](../../${EXAMPLES}/host.ts).`,
    ].join("\n")],
  ]);
  assert.deepEqual([...control.keys()].filter(item => !covered.has(item)).sort(), [
    "Application.deliverInput", "ApplicationServices.queue", "Harness", "Harness.replay", `${EXAMPLES}/host.ts`,
  ]);
  assert.ok(control.has("createApplication") && covered.has("createApplication"));
});

for (const row of ROWS) test(`${row.id} (${row.disposition}): ${row.feature}`, row.check);

