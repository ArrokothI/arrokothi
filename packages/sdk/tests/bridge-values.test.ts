/**
 * K1.4 bridge corpus: values at the core limits, the Emission carry, synchronous input refusal, the
 * default destination, the deprecated Harness view and the option dispositions (design 02
 * D01-CHK-05, -13, -14).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ApplicationConfigurationError, ApplicationInputError, LegacyHarnessMutationRefused, createApplication, defineWorkflow,
} from "@arrokothi/sdk";
import type { StartExecutionInput } from "@arrokothi/sdk";
import { ScriptedModelProvider } from "@arrokothi/core/reference";
import type { CapabilityExecutor } from "@arrokothi/core/ports";
import { failureValue } from "../src/legacy-bridge/codec.ts";
import { LEGACY_HARNESS_MUTATORS, LEGACY_HARNESS_READERS } from "../src/legacy-bridge/harness-view.ts";
import {
  DOCS, allowDocs, answerAgent, callingWorkflow, catalog, chatAgent, confirmDocs, functionWorkflow, ingressResults, models, nativeBodies,
  pauseEmissions,
} from "./bridge-fixtures.ts";

const code = (value: unknown) => (value as { code?: string } | undefined)?.code;
const burst = (count: number) => Array.from({ length: count }, (_, index) => ({ body: { kind: "text" as const, text: `e${index}` } }));

test("B-VALUE-RESULT-70K: a native result over the core limits fails E by name after the native work ran", async () => {
  const app = createApplication({ models: models(new ScriptedModelProvider({ id: "s", steps: [{ output: { text: "x".repeat(70_000) } }] })) });
  const { executionId } = await app.start({ definition: answerAgent(), input: { label: "user", payload: "q" } });
  const run = await app.runUntilBlocked(executionId);
  assert.equal(run.reason, "failed");
  assert.equal(run.execution.lifecycle, "COMPLETED", "the native work completed before the value was refused");
  assert.equal(code(run.kernel.result?.value), "arrokothi.bridge.value_unrepresentable");
});

test("B-VALUE-ROWS-5000: a native Emission with more than 4,096 entries fails E by name", async () => {
  const rows = Array.from({ length: 5_000 }, (_, index) => index);
  const app = createApplication({ functions: { rows: () => ({ status: "completed", result: null, emissions: [{ body: { kind: "data", data: rows } }] }) } });
  const { executionId } = await app.start({ definition: functionWorkflow("rows", "rows") });
  const run = await app.runUntilBlocked(executionId);
  assert.equal(code(run.kernel.result?.value), "arrokothi.bridge.value_unrepresentable");
  assert.equal(nativeBodies(app, executionId).length, 0, "no partial Outcome: none of the native output was accepted");
});

test("B-VALUE-FAIL-DETAILS: a native failure keeps its code when its message or details exceed the limits", async () => {
  const app = createApplication({ functions: { big: () => ({ status: "failed", code: "big_failure", message: "m".repeat(70_000) }) } });
  const { executionId } = await app.start({ definition: functionWorkflow("big", "big") });
  const run = await app.runUntilBlocked(executionId);
  const value = run.kernel.result?.value as { code: string; message: string };
  assert.equal(value.code, run.execution.failure?.code);
  assert.ok(value.message.length <= 4_096);
  assert.deepEqual(failureValue({ code: "c", message: "m", details: { text: "d".repeat(70_000) } }), { code: "c", message: "m", detailsOmitted: true });
  assert.deepEqual(failureValue({ code: "c", message: "m", details: { small: 1 } }), { code: "c", message: "m", details: { small: 1 } });
});

test("B-VALUE-INPUT-REFUSED: an unrepresentable input is refused synchronously with no Kernel or native record", async () => {
  const app = createApplication({ models: models(new ScriptedModelProvider({ id: "s", steps: [{ output: { text: "One" } }] })) });
  await assert.rejects(app.start({ definition: chatAgent(), input: { label: "user", payload: "x".repeat(70_000) } }),
    (error: unknown) => error instanceof ApplicationInputError && error.code === "value_unrepresentable" && (error.issues?.length ?? 0) > 0);
  assert.equal((await app.services.store.listExecutions()).length, 0);
  const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hi" } });
  assert.equal((await app.runUntilBlocked(executionId)).reason, "input_required");
  const mailbox = app.inspect(executionId).mailbox.length;
  await assert.rejects(app.input(executionId, { label: "user", payload: "x".repeat(70_000) }),
    (error: unknown) => error instanceof ApplicationInputError && error.code === "value_unrepresentable");
  assert.equal(app.inspect(executionId).mailbox.length, mailbox);
});

test("B-VALUE-CARRY-TERMINAL and B-VALUE-CARRY-INPUT: 300 Emissions arrive in order over two exchanges; input joins the carry", async () => {
  const app = createApplication({ functions: { burst: () => ({ status: "completed", result: null, emissions: burst(300) }) } });
  const { executionId } = await app.start({ definition: functionWorkflow("burst", "burst") });
  const first = await app.runUntilBlocked(executionId, { maxActivations: 1 });
  assert.equal(first.reason, "activation_limit", "the terminal decision waits until the whole carry fits");
  assert.equal(nativeBodies(app, executionId).length, 256);
  const input = await app.input(executionId, { label: "late", payload: "carried" });
  const done = await app.runUntilBlocked(executionId);
  assert.equal(done.reason, "completed");
  assert.deepEqual(nativeBodies(app, executionId), burst(300).map(emission => emission.body));
  assert.equal(done.kernel.exchanges.length, 2);
  // The native root completed in the first step, so the carried input is forwarded, refused by the
  // native side, and accounted for in that exchange's ingress result (ACK-01).
  assert.deepEqual(ingressResults(app, executionId).map(result => [result.eventId, result.status, result.reason]), [[input.eventId, "rejected", "execution_terminal"]]);
});

test("B-VALUE-CARRY-AWAIT: an await is declared only once the carry fits, with its pause Emission", async () => {
  const workflow = defineWorkflow({ id: "burst-confirm", spec: { entryStage: "work", stages: [
    { id: "work", kind: "function", implementationRef: "burst", transitions: { kind: "always", next: { to: "complete" } } },
  ] } });
  const executor: CapabilityExecutor = { async execute() { return { status: "success", observation: "ok" }; } };
  const app = createApplication({ capabilities: { catalog, executor }, authorizer: allowDocs(), confirmationPolicy: confirmDocs(), functions: {
    burst: ctx => ctx.observations.some(observation => observation.key === "read")
      ? { status: "completed", result: null }
      : { status: "awaitEffects", effects: [{ key: "read", ...DOCS, input: {} }], emissions: burst(300) },
  } });
  const { executionId } = await app.start({ definition: workflow, operationAuthority: { operations: [DOCS] } });
  const run = await app.runUntilBlocked(executionId);
  assert.equal(run.reason, "confirmation_required");
  assert.equal(run.kernel.exchanges.length, 2);
  assert.equal(nativeBodies(app, executionId).length, 300);
  assert.equal(pauseEmissions(app, executionId).length, 1);
});

test("B-INGRESS-SYNC: structural input errors are refused synchronously and write nothing", async () => {
  const app = createApplication({ models: models(new ScriptedModelProvider({ id: "s", steps: [{ output: { text: "One" } }] })) });
  const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hi" } });
  await app.runUntilBlocked(executionId);
  const mailbox = app.inspect(executionId).mailbox.length;
  for (const [request, expected] of [
    [{ label: "" }, "invalid_input_label"],
    [{ label: "user", destination: "not an id!" }, "invalid_destination"],
    [{ label: "user", requestKey: "k".repeat(65) }, "invalid_request_key"],
    [{ label: "user", correlationId: 7 }, "invalid_input_correlation"],
  ] as const) {
    await assert.rejects(app.input(executionId, request as never), (error: unknown) => error instanceof ApplicationInputError && error.code === expected);
  }
  assert.equal(app.inspect(executionId).mailbox.length, mailbox);
});

test("B-INPUT-DEFAULT-DEST: without a destination, input goes to the one member the latest pause names", async () => {
  const provider = new ScriptedModelProvider({ id: "chat", steps: [{ output: { text: "One" } }, { output: { text: "Two" } }] });
  const app = createApplication({ models: models(provider), authorizer: allowDocs() });
  await app.register(chatAgent());
  const { executionId } = await app.start({ definition: callingWorkflow("chat"), structuralSpawnBudget: 1, input: { label: "user", payload: "hi" } });
  const waiting = await app.runUntilBlocked(executionId);
  assert.equal(waiting.reason, "input_required");
  assert.notEqual(waiting.waitingExecutionId, executionId);
  await app.input(executionId, { label: "user", payload: "more" });
  const again = await app.runUntilBlocked(executionId);
  assert.equal(again.reason, "input_required");
  assert.equal(again.waitingExecutionId, waiting.waitingExecutionId);
  assert.equal(provider.requests.length, 2, "the called child received the turn");
  assert.equal(ingressResults(app, executionId).at(-1)?.status, "delivered");
});

test("B-HARNESS: every deprecated mutator refuses by name with no native effect; every reader passes through", async () => {
  const app = createApplication({ functions: { up: () => ({ status: "completed", result: null }) } });
  const { executionId } = await app.start({ definition: functionWorkflow("up", "up") });
  const view = app.harness as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
  assert.equal(Object.isFrozen(app.harness), true);
  for (const [method, replacement] of Object.entries(LEGACY_HARNESS_MUTATORS)) {
    await assert.rejects(view[method]!({ executionId, destination: executionId, label: "x", confirmationId: "c", decision: "approve" }),
      (error: unknown) => error instanceof LegacyHarnessMutationRefused && error.method === method && error.replacement === replacement);
  }
  assert.equal((await app.harness.inspect(executionId))?.lifecycle, "READY", "no refused mutator changed the native root");
  assert.equal(app.inspect(executionId).state, "READY");
  for (const reader of LEGACY_HARNESS_READERS) assert.equal(typeof view[reader], "function", reader);
  assert.equal(LEGACY_HARNESS_READERS.length + Object.keys(LEGACY_HARNESS_MUTATORS).length, 35, "the view covers every public Harness method");
  assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
});

test("option dispositions: maxActivationsPerRun is ignored with a warning; ownerExecutionId and a malformed creation key are refused", async () => {
  const app = createApplication({ functions: { up: () => ({ status: "completed", result: null }) }, runtime: { maxActivationsPerRun: 3 } });
  const report = await app.preflight({ definition: functionWorkflow("up", "up") });
  assert.ok(report.diagnostics.some(diagnostic => diagnostic.code === "option_ignored" && diagnostic.severity === "warning"));
  await assert.rejects(app.start({ definition: functionWorkflow("up", "up"), ownerExecutionId: "exe_owner" } as unknown as StartExecutionInput),
    (error: unknown) => error instanceof ApplicationConfigurationError && error.diagnostics.some(diagnostic => diagnostic.code === "owner_unsupported"));
  for (const creationKey of ["k".repeat(65), "has space", ""]) {
    await assert.rejects(app.start({ definition: functionWorkflow("up", "up"), creationKey }),
      (error: unknown) => error instanceof ApplicationConfigurationError && error.diagnostics[0]?.code === "invalid_creation_key");
  }
  assert.equal((await app.services.store.listExecutions()).length, 0);
});
