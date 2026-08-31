import type {
  AgentDefinition,
  Clock,
  IdGenerator,
  ModelProvider,
  RunTurnResult,
  SessionState,
  SessionStore,
} from "@agent-sdk/core";
import { KnowledgeIndex } from "@agent-sdk/retrieval-local/legacy";
import {
  AgentHarness,
  AgentRuntime,
  InMemorySessionStore,
  ToolRegistry,
  definitionRef,
} from "@agent-sdk/core";
import { P01_WELCOME_MESSAGE, createP01Definition } from "./agent.ts";

export interface P01SubjectOptions {
  model: ModelProvider;
  definition?: AgentDefinition;
  sessions?: SessionStore;
  ids?: IdGenerator;
  clock?: Clock;
}

export interface P01Subject {
  definition: AgentDefinition;
  runtime: AgentRuntime;
  sessions: SessionStore;
  tools: ToolRegistry;
}

export interface P01BatchTurn {
  message: string;
}

export interface P01BatchResult {
  protocolVersion: "1";
  subject: "p01";
  agent: ReturnType<typeof definitionRef>;
  sessionId: string;
  initialMessage: string;
  conversation: Array<{ turn: number; role: "user" | "assistant"; content: string }>;
  turns: Array<{ input: P01BatchTurn; result: RunTurnResult }>;
  state: SessionState;
}

export function createP01Subject(options: P01SubjectOptions): P01Subject {
  const definition = options.definition ?? createP01Definition();
  const sessions = options.sessions ?? new InMemorySessionStore();
  const tools = new ToolRegistry(definition.tools);
  const runtime = new AgentRuntime({
    definition,
    sessions,
    model: options.model,
    tools,
    knowledge: new KnowledgeIndex(definition.knowledge),
    harness: new AgentHarness({ strategy: "workflow" }),
    ids: options.ids,
    clock: options.clock,
  });
  return { definition, runtime, sessions, tools };
}

export async function runP01Batch(
  subject: P01Subject,
  turns: P01BatchTurn[],
  sessionId?: string,
): Promise<P01BatchResult> {
  if (!turns.length) throw new Error("P01 requires at least one user turn.");
  const normalized = turns.map((turn, index) => {
    if (!turn || typeof turn.message !== "string" || !turn.message.trim()) {
      throw new Error(`P01 turn ${index + 1} requires a non-empty message.`);
    }
    return { message: turn.message };
  });

  const createdSessionId = await subject.runtime.createSession(sessionId);
  const results: P01BatchResult["turns"] = [];
  const conversation: P01BatchResult["conversation"] = [
    { turn: 0, role: "assistant", content: P01_WELCOME_MESSAGE },
  ];

  for (const [index, input] of normalized.entries()) {
    const result = await subject.runtime.runTurn({ sessionId: createdSessionId, message: input.message });
    results.push({ input, result });
    conversation.push(
      { turn: index + 1, role: "user", content: input.message },
      { turn: index + 1, role: "assistant", content: result.reply },
    );
  }

  return {
    protocolVersion: "1",
    subject: "p01",
    agent: definitionRef(subject.definition),
    sessionId: createdSessionId,
    initialMessage: P01_WELCOME_MESSAGE,
    conversation,
    turns: results,
    state: await subject.runtime.loadState(createdSessionId),
  };
}
