/**
 * The P01 session runner: drive one Agent Execution across an ordered list of user turns and
 * collect the benchmark-shaped result.
 *
 * Each turn is host orchestration — `deliverExternalInput`, drain, read the newest text emission.
 * Between turns nothing special happens: the Agent's own Structured Memory read view gives the
 * model the current project state on the next turn, which is what makes corrections and
 * out-of-order inputs behave deterministically (latest committed write wins).
 */

import type { ExecutionId, StructuredMemoryView } from "@arrokothi/core/execution";
import { effectRequestsIn, readAgentControlState } from "@arrokothi/core/execution";
import type { P01App } from "./app.ts";
import { P01_WELCOME_MESSAGE, createP01AgentDefinition } from "./agent.ts";

export interface P01Turn {
  readonly message: string;
}

export interface P01ConversationEntry {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export interface P01TurnResult {
  readonly turn: number;
  readonly user: string;
  readonly assistant: string;
  readonly lifecycle: string;
  /** Effect proposals made during this turn (kind only), for tests and diagnostics. */
  readonly effects: readonly string[];
  /**
   * BENCHMARK-DIAGNOSTIC. Model invocations this Agent spent on this user turn, derived from the
   * controller's own persisted `step` counter (`readAgentControlState`). Metadata only — not shown
   * to the user, never read by any execution decision. A step is one Gemini request: an initial
   * reasoning call plus one continuation per capability/memory Effect round-trip.
   */
  readonly modelCalls: number;
}

export interface P01SessionResult {
  readonly protocolVersion: "1";
  readonly subject: "p01";
  readonly sessionId: string;
  readonly initialMessage: string;
  readonly conversation: readonly P01ConversationEntry[];
  readonly turns: readonly P01TurnResult[];
  /** Final committed project state: field key -> value. */
  readonly projectState: Record<string, unknown>;
  /**
   * BENCHMARK-DIAGNOSTIC. Whole-session model-call accounting, derived from runtime state only.
   * `totalModelCalls` is the controller's final `step` counter — the exact number of Gemini
   * requests this Execution made. `maxModelCalls` is the definition's Execution-lifetime ceiling.
   * Present so the benchmark can record真actual provider usage instead of estimating it; it is not
   * requests this Execution made, and is not part of the evaluated conversation.
   */
  readonly diagnostics: {
    readonly benchmarkDiagnostic: true;
    readonly totalModelCalls: number;
    readonly modelCallsByTurn: readonly number[];
    readonly maxModelCalls: number;
  };
}

const MAX_DRAIN_ROUNDS = 32;

/**
 * A mid-session Execution failure (provider rate limit, model-call budget exhausted, ...) must not
 * be recorded as a conversation with empty assistant turns. Surface it so the CLI reports an error
 * and the benchmark runner can retry (transient) or fail loudly (a real ceiling/config problem)
 * instead of silently accepting truncated data.
 */
async function assertNoFailure(app: P01App, executionId: ExecutionId, turn: number): Promise<void> {
  const context = await app.harness.inspect(executionId);
  const failure = context?.failure;
  if (context?.lifecycle === "FAILED" && failure) {
    throw new Error(`P01 execution failed on turn ${turn}: ${failure.code}: ${failure.message}`);
  }
}

/** Reads the controller's persisted model-invocation counter. Returns 0 before the first step. */
async function modelCallsSoFar(app: P01App, executionId: ExecutionId): Promise<number> {
  const context = await app.harness.inspect(executionId);
  if (!context) return 0;
  const read = readAgentControlState(context.control.progress);
  return read.status === "read" ? read.state.step : 0;
}

async function settle(app: P01App, executionId: ExecutionId): Promise<string> {
  for (let round = 0; round < MAX_DRAIN_ROUNDS; round++) {
    await app.harness.runUntilIdle();
    await app.harness.drainResumptions();
    const context = await app.harness.inspect(executionId);
    if (!context) return "GONE";
    const done =
      context.lifecycle === "COMPLETED" ||
      context.lifecycle === "FAILED" ||
      context.lifecycle === "CANCELLED" ||
      (context.lifecycle === "WAITING" && context.waitingFor?.kind === "event");
    if (done) return context.lifecycle;
  }
  return (await app.harness.inspect(executionId))?.lifecycle ?? "UNKNOWN";
}

function newestText(emissions: readonly { body: { kind: string; text?: string } }[], from: number): string {
  for (let i = emissions.length - 1; i >= from; i--) {
    const body = emissions[i]!.body;
    if (body.kind === "text" && typeof body.text === "string" && body.text.trim()) return body.text;
  }
  return "";
}

function stateOf(view: StructuredMemoryView | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, committed] of Object.entries(view?.values ?? {})) {
    out[key] = (committed as { value: unknown }).value;
  }
  return out;
}

export async function runP01Session(
  app: P01App,
  turns: readonly P01Turn[],
  sessionId = "p01-session",
): Promise<P01SessionResult> {
  if (!turns.length) throw new Error("P01 requires at least one user turn.");

  const executionId = await app.createSession();
  // `conversation` is the strict user/assistant alternation the harness compares against. The
  // opening welcome line is product copy, surfaced separately as `initialMessage`.
  const conversation: P01ConversationEntry[] = [];
  const turnResults: P01TurnResult[] = [];
  let modelCallsBefore = 0;

  for (const [index, turn] of turns.entries()) {
    const message = turn.message?.trim();
    if (!message) throw new Error(`P01 turn ${index + 1} requires a non-empty message.`);

    const emissionsBefore = (await app.harness.emissionsOf(executionId)).length;
    const journalBefore = (await app.harness.effectJournalOf(executionId)).length;

    await app.harness.deliverExternalInput({ destination: executionId, label: "user", payload: message });
    const lifecycle = await settle(app, executionId);
    await assertNoFailure(app, executionId, index + 1);

    const emissions = await app.harness.emissionsOf(executionId);
    const assistant = newestText(emissions, emissionsBefore);
    const journal = await app.harness.effectJournalOf(executionId);
    const effects = effectRequestsIn(journal.slice(journalBefore)).map((entry) => entry.proposal.kind);
    const modelCallsAfter = await modelCallsSoFar(app, executionId);
    const modelCalls = Math.max(0, modelCallsAfter - modelCallsBefore);
    modelCallsBefore = modelCallsAfter;

    conversation.push({ role: "user", content: message }, { role: "assistant", content: assistant });
    turnResults.push({ turn: index + 1, user: message, assistant, lifecycle, effects, modelCalls });
  }

  return {
    protocolVersion: "1",
    subject: "p01",
    sessionId,
    initialMessage: P01_WELCOME_MESSAGE,
    conversation,
    turns: turnResults,
    projectState: stateOf(await app.harness.structuredMemoryOf(executionId)),
    diagnostics: {
      benchmarkDiagnostic: true,
      totalModelCalls: modelCallsBefore,
      modelCallsByTurn: turnResults.map((entry) => entry.modelCalls),
      maxModelCalls: createP01AgentDefinition().spec.limits?.maxModelCalls ?? 0,
    },
  };
}
