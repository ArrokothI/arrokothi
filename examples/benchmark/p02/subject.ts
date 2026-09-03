/**
 * The P02 session runner: drive one concierge Agent Execution across an ordered list of user turns.
 *
 * Each turn is host orchestration — `deliverExternalInput`, drain, read the newest text emission.
 * The handoff decision is not here: the async `EffectAuthorizer` (`app.ts`) reads committed
 * Structured Memory to gate `lead.submit`, stages the authoritative lead into the transport, and
 * the transport enforces send-once. This runner only reports the ground-truth outcome from the
 * Effect journal — never the model's prose — and the final committed lead.
 *
 * The benchmark replays every turn from scratch on each invocation; "submit once" survives that
 * because the transport settles once and the authorizer then denies further submits.
 */

import type { ExecutionId } from "@arrokothi/core/execution";
import { effectRequestsIn, latestPhase, readAgentControlState } from "@arrokothi/core/execution";
import type { EffectJournalEntry, EffectJournalPhase } from "@arrokothi/core/execution";
import type { P02App } from "./app.ts";
import { P02_WELCOME_MESSAGE, createP02AgentDefinition } from "./agent.ts";
import { leadFromMemory, missingContactFields } from "./lead.ts";
import type { LeadRecord } from "./lead.ts";

export interface P02Turn {
  readonly message: string;
}

export interface P02ConversationEntry {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export type HandoffOutcome = "delivered" | "failed" | "unknown" | "denied" | "duplicate_suppressed" | "none";

export interface P02TurnResult {
  readonly turn: number;
  readonly user: string;
  readonly assistant: string;
  readonly lifecycle: string;
  /** Effect proposals made during this turn (kind only). */
  readonly effects: readonly string[];
  /** The handoff outcome established during this turn, if any. */
  readonly handoff: HandoffOutcome;
  /**
   * BENCHMARK-DIAGNOSTIC. Model invocations this Agent spent on this user turn, derived from the
   * controller's own persisted `step` counter. Metadata only — not shown to the user, never read
   * by any execution decision.
   */
  readonly modelCalls: number;
}

export interface P02SessionResult {
  readonly protocolVersion: "1";
  readonly subject: "p02";
  readonly sessionId: string;
  readonly initialMessage: string;
  readonly conversation: readonly P02ConversationEntry[];
  readonly turns: readonly P02TurnResult[];
  /** Final committed lead record: field key -> value. */
  readonly lead: LeadRecord;
  /** Ground truth for the handoff, read from the Effect journal — not the model's prose. */
  readonly handoff: {
    readonly attempts: number;
    readonly outcome: HandoffOutcome;
    readonly missingContactFields: readonly string[];
  };
  /**
   * BENCHMARK-DIAGNOSTIC. Whole-session model-call accounting, derived from runtime state only.
   * `totalModelCalls` is the controller's final `step` counter — the exact number of Gemini
   * requests this Execution made. Present so the benchmark can record actual provider usage
   * instead of estimating it; it is not part of the evaluated conversation.
   */
  readonly diagnostics: {
    readonly benchmarkDiagnostic: true;
    readonly totalModelCalls: number;
    readonly modelCallsByTurn: readonly number[];
    readonly maxModelCalls: number;
  };
}

const MAX_DRAIN_ROUNDS = 40;

function newestText(emissions: readonly { body: { kind: string; text?: string } }[], from: number): string {
  for (let i = emissions.length - 1; i >= from; i--) {
    const body = emissions[i]!.body;
    if (body.kind === "text" && typeof body.text === "string" && body.text.trim()) return body.text;
  }
  return "";
}

function phaseToOutcome(phase: EffectJournalPhase | null): HandoffOutcome {
  switch (phase) {
    case "completed":
      return "delivered";
    case "failed":
      return "failed";
    case "unknown_outcome":
      return "unknown";
    case "denied":
    case "rejected":
      return "denied";
    case "replayed":
      return "duplicate_suppressed";
    default:
      return "none";
  }
}

/** The handoff outcome recorded in the journal slice, and whether it is terminal-good. */
function handoffOutcomeIn(journal: readonly EffectJournalEntry[], from: number): HandoffOutcome {
  const slice = journal.slice(from);
  const submitIds = new Set(
    effectRequestsIn(slice)
      .filter((r) => r.kind === "use_capability" && String((r.proposal as { capability?: unknown }).capability) === "lead")
      .map((r) => r.effectId),
  );
  let outcome: HandoffOutcome = "none";
  for (const id of submitIds) {
    const resolved = phaseToOutcome(latestPhase(journal, id));
    if (resolved !== "none") outcome = resolved;
  }
  return outcome;
}

/**
 * A mid-session Execution failure (provider rate limit, model-call budget exhausted, ...) must not
 * be recorded as a conversation with empty assistant turns. Surface it so the CLI reports an error
 * and the benchmark runner can retry (transient) or fail loudly (a real ceiling/config problem).
 */
async function assertNoFailure(app: P02App, executionId: ExecutionId, turn: number): Promise<void> {
  const context = await app.harness.inspect(executionId);
  const failure = context?.failure;
  if (context?.lifecycle === "FAILED" && failure) {
    throw new Error(`P02 execution failed on turn ${turn}: ${failure.code}: ${failure.message}`);
  }
}

/** Reads the controller's persisted model-invocation counter. Returns 0 before the first step. */
async function modelCallsSoFar(app: P02App, executionId: ExecutionId): Promise<number> {
  const context = await app.harness.inspect(executionId);
  if (!context) return 0;
  const read = readAgentControlState(context.control.progress);
  return read.status === "read" ? read.state.step : 0;
}

async function settle(app: P02App, executionId: ExecutionId): Promise<string> {
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

export async function runP02Session(
  app: P02App,
  turns: readonly P02Turn[],
  sessionId = "p02-session",
): Promise<P02SessionResult> {
  if (!turns.length) throw new Error("P02 requires at least one user turn.");

  const executionId = await app.createSession();
  const conversation: P02ConversationEntry[] = [];
  const turnResults: P02TurnResult[] = [];
  let attempts = 0;
  let lastOutcome: HandoffOutcome = "none";
  let modelCallsBefore = 0;

  for (const [index, turn] of turns.entries()) {
    const message = turn.message?.trim();
    if (!message) throw new Error(`P02 turn ${index + 1} requires a non-empty message.`);

    const emissionsBefore = (await app.harness.emissionsOf(executionId)).length;
    const journalBefore = (await app.harness.effectJournalOf(executionId)).length;

    await app.harness.deliverExternalInput({ destination: executionId, label: "user", payload: message });
    const lifecycle = await settle(app, executionId);
    await assertNoFailure(app, executionId, index + 1);

    const emissions = await app.harness.emissionsOf(executionId);
    const assistant = newestText(emissions, emissionsBefore);
    const journal = await app.harness.effectJournalOf(executionId);
    const slice = journal.slice(journalBefore);
    const effects = effectRequestsIn(slice).map((entry) => entry.kind);

    attempts = app.email.sent.length;
    const outcome = handoffOutcomeIn(journal, journalBefore);
    if (outcome === "delivered" || outcome === "unknown") lastOutcome = outcome;
    else if (outcome !== "none" && lastOutcome === "none") lastOutcome = outcome;

    const modelCallsAfter = await modelCallsSoFar(app, executionId);
    const modelCalls = Math.max(0, modelCallsAfter - modelCallsBefore);
    modelCallsBefore = modelCallsAfter;

    conversation.push({ role: "user", content: message }, { role: "assistant", content: assistant });
    turnResults.push({ turn: index + 1, user: message, assistant, lifecycle, effects, handoff: outcome, modelCalls });
  }

  const finalLead = leadFromMemory(await app.harness.structuredMemoryOf(executionId));
  return {
    protocolVersion: "1",
    subject: "p02",
    sessionId,
    initialMessage: P02_WELCOME_MESSAGE,
    conversation,
    turns: turnResults,
    lead: finalLead,
    handoff: {
      attempts,
      outcome: lastOutcome,
      missingContactFields: missingContactFields(finalLead),
    },
    diagnostics: {
      benchmarkDiagnostic: true,
      totalModelCalls: modelCallsBefore,
      modelCallsByTurn: turnResults.map((entry) => entry.modelCalls),
      maxModelCalls: createP02AgentDefinition().spec.limits?.maxModelCalls ?? 0,
    },
  };
}
