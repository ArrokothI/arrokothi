import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  AgentHarness,
  AgentRuntime,
  InMemorySessionStore,
  KnowledgeIndex,
  ToolRegistry,
  type AgentDefinition,
  type SessionEvent,
  type SessionState,
  type ToolExecutor,
} from "@agent-sdk/core";
import { createStrandsGeminiEngine } from "@agent-sdk/integration-strands";
import { GeminiProvider } from "@agent-sdk/provider-gemini";
import { liveModelEnvironment } from "./model.ts";

export interface SmokeTurn {
  content: string;
}

export interface RawRunOptions {
  applicationId: "p01" | "p02";
  scenarioId: string;
  definition: AgentDefinition;
  turns: SmokeTurn[];
  executors: Record<string, ToolExecutor>;
  projectState: (state: SessionState) => Record<string, unknown>;
  outputFile: string;
}

function eventPayloads<T extends SessionEvent["type"]>(events: SessionEvent[], type: T) {
  return events
    .filter((event): event is Extract<SessionEvent, { type: T }> => event.type === type)
    .map((event) => ({ turn: event.turn, at: event.at, ...event.payload }));
}

function usageTotal(events: SessionEvent[]) {
  const calls = events.filter((event) => event.type === "ModelCallCompleted");
  return {
    available: calls.some((event) => event.payload.usage !== undefined),
    inputTokens: calls.reduce((sum, event) => sum + (event.payload.usage?.inputTokens ?? 0), 0),
    outputTokens: calls.reduce((sum, event) => sum + (event.payload.usage?.outputTokens ?? 0), 0),
  };
}

export async function runArrokothaiSubject(options: RawRunOptions) {
  const model = liveModelEnvironment();
  if (options.definition.model.model !== model.requestedModel) {
    throw new Error(
      `definition requested ${options.definition.model.model}, but GEMINI_MODEL requests ${model.requestedModel}`,
    );
  }

  const sessions = new InMemorySessionStore();
  const tools = new ToolRegistry(options.definition.tools);
  for (const [name, executor] of Object.entries(options.executors)) tools.register(name, executor);
  const provider = new GeminiProvider({ apiKey: model.apiKey, model: model.requestedModel });
  const runtime = new AgentRuntime({
    definition: options.definition,
    sessions,
    model: provider,
    planningModel: provider,
    tools,
    knowledge: new KnowledgeIndex(options.definition.knowledge),
    harness: new AgentHarness({ engine: createStrandsGeminiEngine({ apiKey: model.apiKey }) }),
  });

  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const sessionId = await runtime.createSession(
    `six-subject-${options.applicationId}-${Date.now()}`,
    options.scenarioId,
  );
  const turnResults: Array<{
    turn: number;
    user: string;
    assistant: string;
    stopReason: string;
    steps: number;
    elapsedMs: number;
    metrics: unknown;
    eventSeqs: number[];
  }> = [];

  for (const [index, turn] of options.turns.entries()) {
    const turnStarted = Date.now();
    const result = await runtime.runTurn({ sessionId, message: turn.content });
    turnResults.push({
      turn: index + 1,
      user: turn.content,
      assistant: result.reply,
      stopReason: result.stopReason,
      steps: result.steps,
      elapsedMs: Date.now() - turnStarted,
      metrics: result.metrics,
      eventSeqs: result.events.map((event) => event.seq),
    });
  }

  const events = await sessions.readEvents(sessionId);
  const finalState = await runtime.replay(sessionId);
  const modelCalls = events
    .filter((event) => event.type === "ModelCallCompleted")
    .map((event) => ({ turn: event.turn, at: event.at, ...event.payload }));
  const reportedModels = [...new Set(modelCalls.map((call) => call.model))];
  const externalStarts = events.filter(
    (event) => event.type === "ToolExecutionStarted" && event.payload.effect === "external_side_effect",
  );
  const completedAt = new Date().toISOString();
  const artifact = {
    schemaVersion: "benchmark-raw-run-v1",
    benchmarkId: "six-subject",
    benchmarkApplicationId: options.applicationId,
    implementationId: `${options.applicationId}-arrokothai`,
    framework: { id: "arrokothai", name: "Agent_SDK", version: "0.37.0" },
    scenarioRunId: options.scenarioId,
    timestamps: { startedAt, completedAt, elapsedMs: Date.now() - startedMs },
    conversation: turnResults,
    model: {
      provider: "gemini",
      requested: model.requestedModel,
      providerReported: reportedModels.length === 1 ? reportedModels[0] : reportedModels,
      temperature: options.definition.model.temperature,
      maxOutputTokens: options.definition.model.maxOutputTokens,
      thinking: model.thinking,
      calls: modelCalls,
      callCount: modelCalls.length,
      usage: usageTotal(events),
    },
    canonicalState: options.projectState(finalState),
    knowledge: {
      calls: eventPayloads(events, "KnowledgeRetrieved"),
      rejectedCalls: eventPayloads(events, "RetrievalRequestRejected"),
    },
    actions: {
      requests: eventPayloads(events, "ToolRequested"),
      confirmationsRequested: eventPayloads(events, "ConfirmationRequested"),
      confirmationsResolved: eventPayloads(events, "ConfirmationResolved"),
      executionStarted: eventPayloads(events, "ToolExecutionStarted"),
      succeeded: eventPayloads(events, "ToolExecutionSucceeded"),
      failed: eventPayloads(events, "ToolExecutionFailed"),
      outcomeUnknown: eventPayloads(events, "ToolExecutionOutcomeUnknown"),
      dispatchCount: externalStarts.length,
    },
    stopReason: turnResults.at(-1)?.stopReason ?? "not_started",
    runtimeErrors: eventPayloads(events, "RuntimeError"),
    nativeTrace: {
      eventStream: events,
      finalState,
    },
  };

  await mkdir(dirname(options.outputFile), { recursive: true });
  await writeFile(options.outputFile, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  if (artifact.stopReason === "error" || artifact.runtimeErrors.length > 0) {
    throw new Error(`live smoke failed; inspect ${options.outputFile}`);
  }
  return artifact;
}
