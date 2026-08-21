import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition, ModelProvider, SessionEvent, ToolExecutor } from "@agent-sdk/core";
import {
  AgentRuntime,
  InMemorySessionStore,
  KnowledgeIndex,
  ToolRegistry,
  createRandomIds,
  createSystemClock,
  definitionHash,
  recordQueryTools,
} from "@agent-sdk/core";
import type { BenchmarkRun, BenchmarkScenario, CanonicalFields, ScenarioResult } from "./types.ts";
import type { RunRecord } from "./grade.ts";
import { checkAssertionsExecutable, grade, tally } from "./grade.ts";

/**
 * The benchmark runner.
 *
 * Two modes, and the distinction is not cosmetic:
 *
 *   harness_selfcheck - a scripted model answers. This proves the ADAPTER works: scenarios load,
 *                       state projects into canonical field names, tool events are captured, and
 *                       grading runs. It says nothing about agent quality, and the written result
 *                       carries a disclaimer saying so.
 *   live              - a real provider answers every turn. Only this is a measurement.
 *
 * No production side effect is ever performed in either mode: the consequential action is always a
 * dry-run transport that records its payload.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
export const RESULTS_DIR = join(HERE, "..", "results");

export interface BenchmarkAgent {
  definition: AgentDefinition;
  /** Executors for the definition's declared tools, always fakes/dry runs. */
  executors: (mode: "success" | "fail") => Record<string, ToolExecutor>;
  /** Projects SDK runtime state into the canonical benchmark field names. */
  project: (state: ProjectionInput) => CanonicalFields;
  /** Maps an SDK tool name onto the canonical action name used by the stored artifacts. */
  canonicalAction: (toolName: string) => string | null;
}

export interface ProjectionInput {
  memory: Record<string, { value: string | number | boolean | string[] }>;
  phaseId: string | null;
}

export interface RunOptions {
  project: BenchmarkRun["project"];
  runId: string;
  label: string;
  mode: BenchmarkRun["mode"];
  agent: BenchmarkAgent;
  scenarios: BenchmarkScenario[];
  /** Built per scenario, so a scripted provider can carry that scenario's own script. */
  makeProvider: (scenario: BenchmarkScenario) => ModelProvider;
  /** Milliseconds between turns. Free-tier providers need pacing; a scripted one does not. */
  paceMs?: number;
  outputFile: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runBenchmark(options: RunOptions): Promise<BenchmarkRun> {
  const results: ScenarioResult[] = [];
  const paceMs = options.paceMs ?? 0;

  for (const scenario of options.scenarios) {
    if (!scenario.turns.length) continue;
    process.stdout.write(`  ${scenario.id.padEnd(14)} `);
    const result = await runScenario(scenario, options, paceMs);
    results.push(result);
    const mark = { pass: "PASS", soft_fail: "SOFT", hard_fail: "HARD", inconclusive: "INCONCL" }[result.outcome];
    const detail = result.adapterCheck
      ? result.adapterCheck.threw.length
        ? `ADAPTER BROKEN: ${result.adapterCheck.threw.map((t) => t.id).join(", ")}`
        : `${result.adapterCheck.assertionsRun} assertions executable, state projected (${Object.entries(result.fields).filter(([, v]) => v !== undefined).length} fields)`
      : (result.reason ?? `${result.assertions.filter((a) => a.passed).length}/${result.assertions.filter((a) => a.applicable).length} assertions`);
    console.log(`${mark}  ${detail}`);
  }

  const first = results[0];
  const run: BenchmarkRun = {
    runId: options.runId,
    project: options.project,
    mode: options.mode,
    label: options.label,
    generatedAt: new Date().toISOString(),
    sdk: {
      agentId: options.agent.definition.id,
      agentVersion: options.agent.definition.version,
      definitionHash: definitionHash(options.agent.definition),
      harness: "two-pass-v0",
    },
    provider: { id: first?.providers[0]?.providerId ?? "unknown", model: first?.providers[0]?.model ?? "unknown" },
    paceMs,
    totals: tally(results),
    results,
  };

  if (options.mode === "harness_selfcheck") {
    const broken = results.flatMap((r) => (r.adapterCheck?.threw ?? []).map((t) => `${r.id}:${t.id}`));
    run.disclaimer =
      "HARNESS SELF-CHECK ONLY. No model was consulted, so every scenario is graded `inconclusive` - " +
      "which is the correct grading outcome for a run no model answered, and is NOT an agent result. " +
      "These numbers must never be compared against the stored P01/P02 measurements. What this run " +
      "does establish is in each result's `adapterCheck`: that the scenario loads, state projects into " +
      "canonical field names, tool events are captured, and every assertion executes. " +
      (broken.length ? `ADAPTER PROBLEMS: ${broken.join(", ")}.` : "All assertions executed cleanly.") +
      " Run with --live and a real key to produce a comparable measurement.";
  }

  mkdirSync(RESULTS_DIR, { recursive: true });
  const path = join(RESULTS_DIR, options.outputFile);
  writeFileSync(path, `${JSON.stringify(run, null, 2)}\n`);
  console.log(`\n  totals: ${JSON.stringify(run.totals)}`);
  console.log(`  written: ${path}\n`);
  return run;
}

async function runScenario(scenario: BenchmarkScenario, options: RunOptions, paceMs: number): Promise<ScenarioResult> {
  const selfCheck = options.mode === "harness_selfcheck";
  const { agent } = options;
  const definition = agent.definition;
  const sessions = new InMemorySessionStore();
  const knowledge = new KnowledgeIndex(definition.knowledge);
  const tools = new ToolRegistry(definition.tools);
  for (const { definition: toolDef, executor } of recordQueryTools(knowledge)) tools.add(toolDef, executor);
  for (const [name, executor] of Object.entries(agent.executors(scenario.mockTransportMode ?? "success"))) {
    tools.register(name, executor);
  }

  const runtime = new AgentRuntime({
    definition,
    sessions,
    model: options.makeProvider(scenario),
    tools,
    knowledge,
    ids: createRandomIds(),
    clock: createSystemClock(),
  });

  const replies: string[] = [];
  const providers: ScenarioResult["providers"] = [];
  const toolEvents: ScenarioResult["toolEvents"] = [];
  const actionsAttempted: string[] = [];
  const modelBacked: boolean[] = [];
  let actionSuccess: boolean | null = null;
  let modelCalls = 0;
  let harnessError: string | undefined;
  let finalState: ProjectionInput = { memory: {}, phaseId: null };

  try {
    const sessionId = await runtime.createSession(undefined, scenario.id);
    for (const [index, message] of scenario.turns.entries()) {
      if (paceMs && index > 0) await sleep(paceMs);
      const turn = await runtime.runTurn({ sessionId, message });
      replies.push(turn.reply);
      finalState = { memory: turn.state.memory, phaseId: turn.state.phaseId };

      const calls = turn.events.filter((e) => e.type === "ModelCallCompleted");
      modelCalls += calls.length;
      for (const call of calls) {
        if (call.type !== "ModelCallCompleted") continue;
        providers.push({ turn: index, providerId: call.payload.providerId, model: call.payload.model, purpose: call.payload.purpose });
      }
      // A turn is model-backed when a real response call happened and the runtime did not have to
      // fall back. A degraded turn is recorded, never quietly graded as if the model had answered.
      const respondFailed = turn.events.some(
        (e) => e.type === "RuntimeError" && ["model_call_failed", "empty_model_response"].includes(e.payload.code),
      );
      const respondCalls = calls.filter((c) => c.type === "ModelCallCompleted" && c.payload.purpose === "respond");
      // On a self-check no REAL model answered, whatever the stub provider reports. Recording the
      // turn as not model-backed is what makes grading return `inconclusive` rather than scoring a
      // stub's placeholder text as an agent failure.
      modelBacked.push(!selfCheck && respondCalls.length > 0 && !respondFailed);

      collectToolEvents(turn.events, index, agent, toolEvents, actionsAttempted, (ok) => {
        // The FIRST consequential result wins: a replayed duplicate must not overwrite the record
        // of what actually happened.
        if (actionSuccess === null) actionSuccess = ok;
      });
    }
  } catch (error) {
    harnessError = error instanceof Error ? error.message : String(error);
  }

  const fields = agent.project(finalState);
  const record: RunRecord = {
    replies,
    fields,
    phaseId: finalState.phaseId,
    actionsAttempted,
    actionSuccess,
    modelBacked,
    harnessError,
  };
  const graded = grade(scenario, record);
  // What a self-check can genuinely establish: every assertion executes against a real projected
  // state. Grading cannot say this, because it (correctly) stops at `inconclusive`.
  const adapterCheck = selfCheck ? checkAssertionsExecutable(scenario, record) : undefined;

  return {
    id: scenario.id,
    specId: scenario.specId,
    title: scenario.title,
    evidence: scenario.evidence,
    requirement: scenario.requirement,
    stresses: scenario.stresses,
    note: scenario.note,
    turns: scenario.turns,
    outcome: graded.outcome,
    reason: graded.reason,
    replies,
    fields,
    phaseId: finalState.phaseId,
    actionsAttempted,
    actionSuccess,
    toolEvents,
    providers,
    assertions: graded.assertions,
    modelCalls,
    harnessError,
    adapterCheck,
  };
}

function collectToolEvents(
  events: SessionEvent[],
  turnIndex: number,
  agent: BenchmarkAgent,
  toolEvents: ScenarioResult["toolEvents"],
  actionsAttempted: string[],
  onConsequentialResult: (ok: boolean) => void,
): void {
  for (const event of events) {
    switch (event.type) {
      case "ToolExecutionStarted": {
        const canonical = agent.canonicalAction(event.payload.toolName);
        toolEvents.push({ turn: turnIndex, type: "started", toolName: event.payload.toolName, detail: JSON.stringify(event.payload.args) });
        // Only a genuine dispatch counts as an attempt. A replay is recorded separately below, so
        // "exactly one dispatch" stays a checkable fact.
        if (canonical) actionsAttempted.push(canonical);
        break;
      }
      case "ToolExecutionSucceeded": {
        const canonical = agent.canonicalAction(event.payload.toolName);
        toolEvents.push({
          turn: turnIndex,
          type: event.payload.replayed ? "replayed" : "succeeded",
          toolName: event.payload.toolName,
          detail: event.payload.replayed ? "idempotent replay - not re-executed" : JSON.stringify(event.payload.output).slice(0, 300),
        });
        if (canonical && !event.payload.replayed) onConsequentialResult(true);
        break;
      }
      case "ToolExecutionFailed": {
        const canonical = agent.canonicalAction(event.payload.toolName);
        toolEvents.push({ turn: turnIndex, type: "failed", toolName: event.payload.toolName, detail: `${event.payload.error.code}: ${event.payload.error.message}` });
        if (canonical) onConsequentialResult(false);
        break;
      }
      case "ToolCallRejected":
        toolEvents.push({ turn: turnIndex, type: "rejected", toolName: event.payload.toolName, detail: `${event.payload.reason}: ${event.payload.message}` });
        break;
      case "ConfirmationRequested":
        toolEvents.push({ turn: turnIndex, type: "confirmation_requested", toolName: event.payload.toolName, detail: event.payload.requestId });
        break;
      case "ConfirmationResolved":
        toolEvents.push({ turn: turnIndex, type: "confirmation_resolved", toolName: "-", detail: `${event.payload.decision} [${event.payload.rule}] ${event.payload.reason}` });
        break;
      default:
        break;
    }
  }
}
