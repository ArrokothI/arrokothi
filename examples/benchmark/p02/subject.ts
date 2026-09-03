import type {
  AgentDefinition,
  Clock,
  IdGenerator,
  ModelProvider,
  RunTurnResult,
  SessionState,
  SessionStore,
  ToolExecutor,
  WebSearchProvider,
} from "@arrokothi/core";
import { KnowledgeIndex } from "@arrokothi/retrieval-local/legacy";
import {
  AgentHarness,
  AgentRuntime,
  InMemorySessionStore,
  ToolRegistry,
  definitionRef,
  recordQueryTools,
} from "@arrokothi/core";
import { P02_WELCOME_MESSAGE, createP02Definition } from "./agent.ts";

export interface P02SubjectOptions {
  model: ModelProvider;
  definition?: AgentDefinition;
  sessions?: SessionStore;
  emailExecutor?: ToolExecutor;
  googleMaps?: WebSearchProvider;
  ids?: IdGenerator;
  clock?: Clock;
}

export interface P02Subject {
  definition: AgentDefinition;
  runtime: AgentRuntime;
  sessions: SessionStore;
  tools: ToolRegistry;
  knowledge: KnowledgeIndex;
}

export interface P02BatchTurn {
  message: string;
}

export interface P02BatchResult {
  protocolVersion: "1";
  subject: "p02";
  agent: ReturnType<typeof definitionRef>;
  sessionId: string;
  initialMessage: string;
  conversation: Array<{ turn: number; role: "user" | "assistant"; content: string }>;
  turns: Array<{ input: P02BatchTurn; result: RunTurnResult }>;
  state: SessionState;
}

const emptyGoogleMaps: WebSearchProvider = {
  async search(request) {
    return { query: request.query, results: [] };
  },
};

export function createDryRunEmailExecutor(): ToolExecutor {
  return {
    async execute(_args, context) {
      return {
        ok: true,
        output: {
          delivered: true,
          transport: "dry_run",
          message_id: context.idempotencyKey,
        },
        facts: [{
          key: "lead_email_delivered",
          value: true,
          description: "The injected lead-email transport reported successful delivery.",
        }],
      };
    },
  };
}

export function createP02Subject(options: P02SubjectOptions): P02Subject {
  const definition = options.definition ?? createP02Definition();
  const sessions = options.sessions ?? new InMemorySessionStore();
  const knowledge = new KnowledgeIndex(definition.knowledge, {
    webSearch: options.googleMaps ?? emptyGoogleMaps,
  });
  const tools = new ToolRegistry(definition.tools);
  for (const { definition: tool, executor } of recordQueryTools(knowledge)) tools.add(tool, executor);
  tools.register("send_email", options.emailExecutor ?? createDryRunEmailExecutor());

  const runtime = new AgentRuntime({
    definition,
    sessions,
    model: options.model,
    tools,
    knowledge,
    harness: new AgentHarness({ strategy: "workflow" }),
    ids: options.ids,
    clock: options.clock,
  });
  return { definition, runtime, sessions, tools, knowledge };
}

export async function runP02Batch(
  subject: P02Subject,
  turns: P02BatchTurn[],
  sessionId?: string,
): Promise<P02BatchResult> {
  if (!turns.length) throw new Error("P02 requires at least one user turn.");
  const normalized = turns.map((turn, index) => {
    if (!turn || typeof turn.message !== "string" || !turn.message.trim()) {
      throw new Error(`P02 turn ${index + 1} requires a non-empty message.`);
    }
    return { message: turn.message };
  });

  const createdSessionId = await subject.runtime.createSession(sessionId);
  const results: P02BatchResult["turns"] = [];
  const conversation: P02BatchResult["conversation"] = [
    { turn: 0, role: "assistant", content: P02_WELCOME_MESSAGE },
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
    subject: "p02",
    agent: definitionRef(subject.definition),
    sessionId: createdSessionId,
    initialMessage: P02_WELCOME_MESSAGE,
    conversation,
    turns: results,
    state: await subject.runtime.loadState(createdSessionId),
  };
}
