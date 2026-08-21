import type { AgentHarness, HarnessServices, HarnessTurnInput, HarnessTurnResult, TurnStopReason } from "./types.ts";
import type { ObjectSchema } from "../schema/value-schema.ts";
import type { MemoryWriteProposal, WorkingNote } from "../memory/types.ts";
import type { ModelToolSpec } from "../provider/types.ts";
import type { AuthorizeDeps } from "../tools/authorize.ts";
import type { TransitionTiming } from "../flow/types.ts";
import { attemptToolCall, resolvePendingConfirmation } from "../tools/authorize.ts";
import { validateProposal } from "../memory/structured.ts";
import { compileWithRetrieval } from "../compiler/context-compiler.ts";
import { evaluateTransitions, findPhase } from "../flow/evaluate.ts";
import { ModelProviderError } from "../provider/types.ts";

/**
 * The default harness: interpret, then respond.
 *
 * Pass 1 turns the user's turn into candidate structured writes and semantic routing signals, which
 * the runtime validates and commits or rejects. Pass 2 compiles context and runs the model/tool loop
 * to a final reply.
 *
 * Why two passes in v0: separating "what did the user just tell me" from "what should I say" means
 * the memory correction and any phase transition happen BEFORE the reply is generated, so the reply
 * is written against corrected state rather than against the stale transcript. A one-pass strategy
 * can be substituted wholesale by implementing `AgentHarness`.
 */

const INTERPRETATION_SCHEMA: ObjectSchema = {
  kind: "object",
  fields: {
    memory_writes: {
      required: false,
      description: "Facts the user has now established. Only include a field when the user's message actually supports it.",
      schema: { kind: "object", additionalProperties: true, fields: {} },
    },
    working_notes: {
      required: false,
      description: "Short unverified observations worth remembering. Never put a fact here that belongs in memory_writes.",
      schema: { kind: "string_array", maxItems: 5 },
    },
    signals: {
      required: false,
      description: "Routing signals that describe what the user is doing this turn.",
      schema: { kind: "string_array", maxItems: 6 },
    },
  },
};

export interface TwoPassOptions {
  /** Signal names the interpretation pass is told about. Defaults to those used by the flow. */
  signalVocabulary?: string[];
}

export class TwoPassHarness implements AgentHarness {
  readonly name = "two-pass-v0";
  private readonly options: TwoPassOptions;

  constructor(options: TwoPassOptions = {}) {
    this.options = options;
  }

  async runTurn(input: HarnessTurnInput, services: HarnessServices): Promise<HarnessTurnResult> {
    const { journal, turn, userMessage } = input;
    const { definition } = services;
    const grants = new Set<string>();
    const deps: AuthorizeDeps = {
      definition,
      tools: services.tools,
      journal,
      confirmationResolver: services.confirmationResolver,
      ids: services.ids,
      clock: services.clock,
      grants,
    };

    // ---- Confirmation first -------------------------------------------------
    // An outstanding request is resolved against this message BEFORE anything else, and a genuine
    // confirmation executes the STORED payload directly. The model never gets a chance to alter the
    // arguments between the moment consent was given and the moment the action runs.
    const confirmation = resolvePendingConfirmation(deps, userMessage, turn);
    if (confirmation.resolved && confirmation.decision === "confirm") {
      const outcome = await attemptToolCall(deps, confirmation.action.toolName, confirmation.action.args, turn, "runtime");
      if (outcome.kind === "executed" || outcome.kind === "replayed") {
        await this.applyTransitions(input, services, "action_result");
      }
    }

    // ---- Pass 1: interpret --------------------------------------------------
    await this.interpret(input, services);
    await this.applyTransitions(input, services, "pre_response");

    // ---- Pass 2: respond ----------------------------------------------------
    return this.respond(input, services, deps);
  }

  /** Pass 1. A model failure here degrades the turn rather than ending it: the reply pass still runs. */
  private async interpret(input: HarnessTurnInput, services: HarnessServices): Promise<void> {
    const { journal, turn } = input;
    const { definition } = services;
    if (!definition.memorySchema.fields.length && !this.options.signalVocabulary?.length) return;

    const fieldDoc = definition.memorySchema.fields
      .map((f) => {
        const s = f.schema;
        const constraint =
          s.kind === "enum" ? ` one of: ${s.choices.join(" | ")}`
          : s.kind === "number" ? `${s.min !== undefined ? ` min ${s.min}` : ""}${s.max !== undefined ? ` max ${s.max}` : ""}`
          : s.kind === "string_array" ? " a list of strings"
          : ` ${s.kind}`;
        return `- ${f.key} (${s.kind}):${constraint}${f.description ? ` - ${f.description}` : ""}`;
      })
      .join("\n");

    const signals = this.options.signalVocabulary ?? collectSignalNames(services);
    const instruction = [
      "Read ONLY the user's most recent message and extract what it establishes. Do not restate facts already recorded unless the user just changed them.",
      "",
      "Fields you may write:",
      fieldDoc || "(none)",
      "",
      signals.length ? `Signals you may emit: ${signals.join(", ")}` : "",
      "",
      "Rules: propose a value only when the user's message actually supports it; never guess. Use the exact field names above.",
      "For a correction, propose the NEW value - the runtime replaces the old one.",
      "Respond with JSON: {\"memory_writes\": {field: value}, \"working_notes\": [string], \"signals\": [string]}.",
    ]
      .filter(Boolean)
      .join("\n");

    const interpretPhase = definition.flow ? findPhase(definition.flow, journal.state.phaseId) : undefined;
    const context = await compileWithRetrieval(
      { definition, state: journal.state, now: services.clock.now(), taskInstruction: instruction, transcriptWindow: 4 },
      services.knowledge,
      interpretPhase?.knowledgeSourceIds,
    );
    services.onContextCompiled?.(context, "interpret");

    let json: unknown;
    try {
      const started = Date.now();
      const response = await services.model.generate({
        system: context.system,
        messages: context.messages,
        responseSchema: INTERPRETATION_SCHEMA,
        model: definition.model.model,
        temperature: definition.model.temperature ?? 0,
        maxOutputTokens: definition.model.maxOutputTokens,
        purpose: "interpret",
      });
      journal.append({
        type: "ModelCallCompleted",
        turn,
        payload: {
          purpose: "interpret",
          providerId: response.providerId,
          model: response.model,
          usage: response.usage,
          finishReason: response.finishReason,
          durationMs: Date.now() - started,
        },
      });
      json = response.json ?? (response.text ? safeParse(response.text) : undefined);
    } catch (error) {
      // Interpretation is best-effort. The turn continues with whatever state already exists, and
      // the failure is recorded rather than hidden.
      journal.append({
        type: "RuntimeError",
        turn,
        payload: {
          code: error instanceof ModelProviderError ? error.code : "interpret_failed",
          message: error instanceof Error ? error.message : String(error),
          detail: "interpretation pass failed; the turn continued without new structured writes",
        },
      });
      return;
    }

    if (!json || typeof json !== "object") return;
    const parsed = json as Record<string, unknown>;

    const writes = parsed["memory_writes"];
    if (writes && typeof writes === "object" && !Array.isArray(writes)) {
      for (const [key, value] of Object.entries(writes as Record<string, unknown>)) {
        if (value === undefined || value === null || value === "") continue;
        this.commitProposal(input, services, { key, value });
      }
    }

    const notes = parsed["working_notes"];
    if (Array.isArray(notes)) {
      for (const text of notes.slice(0, 5)) {
        if (typeof text !== "string" || !text.trim()) continue;
        const note: WorkingNote = {
          id: services.ids.next("note"),
          text: text.trim(),
          sourceEventIds: [],
          turn,
          at: services.clock.now().toISOString(),
        };
        journal.append({ type: "WorkingNoteRecorded", turn, payload: { note } });
      }
    }

    const emitted = parsed["signals"];
    if (Array.isArray(emitted)) {
      const clean = emitted.filter((s): s is string => typeof s === "string" && s.length > 0).slice(0, 6);
      if (clean.length) journal.append({ type: "SemanticSignalsObserved", turn, payload: { signals: clean } });
    }
  }

  /**
   * Validates one proposal and records the outcome.
   *
   * Both outcomes are events. A rejected proposal is never silently dropped and never repaired into
   * something the model did not say - the reason is stored so a bad extraction is visible in the
   * trace instead of showing up later as mysteriously wrong state.
   */
  private commitProposal(input: HarnessTurnInput, services: HarnessServices, proposal: MemoryWriteProposal): void {
    const { journal, turn } = input;
    const { definition } = services;

    const proposedEvent = journal.append({
      type: "MemoryWriteProposed",
      turn,
      payload: { key: proposal.key, value: proposal.value, source: "model_proposal", confidence: proposal.confidence },
    });

    const validation = validateProposal(definition.memorySchema, proposal, "model_proposal", { coerce: true });
    if (!validation.ok) {
      journal.append({
        type: "MemoryWriteRejected",
        turn,
        payload: {
          key: proposal.key,
          value: proposal.value,
          code: validation.code,
          reason: validation.reason,
          source: "model_proposal",
          proposalEventId: proposedEvent.id,
        },
      });
      // An undeclared field may still be worth remembering, but only as a non-authoritative note -
      // never as validated state. This is what `rejectUnknownMemoryFields: false` buys.
      if (validation.code === "unknown_field" && !definition.policies.rejectUnknownMemoryFields) {
        const note: WorkingNote = {
          id: services.ids.next("note"),
          text: `${proposal.key}: ${String(proposal.value)}`,
          sourceEventIds: [proposedEvent.id],
          turn,
          at: services.clock.now().toISOString(),
        };
        journal.append({ type: "WorkingNoteRecorded", turn, payload: { note } });
      }
      return;
    }

    const previous = journal.state.memory[proposal.key];
    if (previous && JSON.stringify(previous.value) === JSON.stringify(validation.value)) return;

    journal.append({
      type: "MemoryWriteCommitted",
      turn,
      payload: {
        key: proposal.key,
        value: validation.value,
        previousValue: previous?.value,
        source: "model_proposal",
        authority: validation.field.authority ?? "authoritative",
        normalized: validation.normalized || undefined,
        proposalEventId: proposedEvent.id,
      },
    });
  }

  /** Evaluates transitions at one timing point and emits `PhaseTransitioned` if one fires. */
  private async applyTransitions(input: HarnessTurnInput, services: HarnessServices, timing: TransitionTiming): Promise<void> {
    const { journal, turn } = input;
    const flow = services.definition.flow;
    if (!flow) return;

    const { fired } = evaluateTransitions(flow, timing, {
      state: journal.state,
      signals: journal.state.turnSignals,
      toolResults: journal.state.turnToolResults,
    });
    if (!fired) return;

    journal.append({
      type: "PhaseTransitioned",
      turn,
      payload: { from: fired.from, to: fired.to, on: timing, label: fired.label, evaluation: fired },
    });
  }

  /** Pass 2: the bounded model/tool loop. */
  private async respond(input: HarnessTurnInput, services: HarnessServices, deps: AuthorizeDeps): Promise<HarnessTurnResult> {
    const { journal, turn } = input;
    const { definition } = services;
    const maxSteps = Math.max(1, definition.policies.maxSteps);
    let steps = 0;
    let toolCalls = 0;
    let awaitingConfirmationPrompt: string | null = null;

    while (steps < maxSteps) {
      steps++;

      const phase = definition.flow ? findPhase(definition.flow, journal.state.phaseId) : undefined;
      const available = services.tools.availableIn(journal.state.phaseId, phase?.toolNames);
      const specs: ModelToolSpec[] =
        toolCalls >= definition.policies.maxToolCallsPerTurn ? [] : services.tools.toModelSpecs(available);

      const context = await compileWithRetrieval(
        {
          definition,
          state: journal.state,
          now: services.clock.now(),
          taskInstruction: awaitingConfirmationPrompt
            ? `You must now ask the user to confirm before anything is sent. Ask exactly this, in your own voice: ${awaitingConfirmationPrompt}`
            : undefined,
        },
        services.knowledge,
        phase?.knowledgeSourceIds,
      );
      services.onContextCompiled?.(context, `respond:${steps}`);

      let response;
      try {
        const started = Date.now();
        response = await services.model.generate({
          system: context.system,
          messages: context.messages,
          tools: specs.length ? specs : undefined,
          model: definition.model.model,
          temperature: definition.model.temperature,
          maxOutputTokens: definition.model.maxOutputTokens,
          purpose: "respond",
        });
        journal.append({
          type: "ModelCallCompleted",
          turn,
          payload: {
            purpose: "respond",
            providerId: response.providerId,
            model: response.model,
            usage: response.usage,
            finishReason: response.finishReason,
            durationMs: Date.now() - started,
          },
        });
      } catch (error) {
        // A provider failure must not become a fabricated reply. The turn ends truthfully.
        const message = error instanceof Error ? error.message : String(error);
        journal.append({
          type: "RuntimeError",
          turn,
          payload: { code: error instanceof ModelProviderError ? error.code : "model_call_failed", message, detail: "response pass" },
        });
        return this.emit(input, "I ran into a problem generating a reply just now. Could you try again in a moment?", "error", steps);
      }

      const calls = response.toolCalls ?? [];
      if (calls.length && toolCalls < definition.policies.maxToolCallsPerTurn) {
        for (const call of calls) {
          if (toolCalls >= definition.policies.maxToolCallsPerTurn) break;
          toolCalls++;
          const outcome = await attemptToolCall(deps, call.name, call.args ?? {}, turn, "model");
          if (outcome.kind === "awaiting_confirmation") {
            awaitingConfirmationPrompt = outcome.promptText;
          } else if (outcome.kind === "executed" || outcome.kind === "replayed") {
            await this.applyTransitions(input, services, "action_result");
          }
        }
        continue; // Re-compile with the new results in context and let the model respond to them.
      }

      const text = (response.text ?? "").trim();
      if (text) {
        const stop: TurnStopReason = journal.state.pendingAction ? "awaiting_confirmation" : "completed";
        return this.emit(input, text, stop, steps);
      }

      // Neither text nor an actionable tool call. Rather than looping on an empty response, stop.
      journal.append({
        type: "RuntimeError",
        turn,
        payload: { code: "empty_model_response", message: "model returned neither text nor a tool call", detail: `step ${steps}` },
      });
      return this.emit(input, "Sorry - I did not manage to put a reply together. Could you say that again?", "error", steps);
    }

    // Step limit reached. Terminate safely and truthfully; never invent a completion.
    journal.append({
      type: "RuntimeError",
      turn,
      payload: {
        code: "max_steps_exceeded",
        message: `turn stopped after ${maxSteps} steps without producing a final reply`,
        detail: "the step limit is enforced by the runtime, not by the model",
      },
    });
    return this.emit(
      input,
      "This is taking more steps than I have available for one turn, so I have stopped rather than guess. Could you narrow down what you need?",
      "max_steps",
      steps,
    );
  }

  private emit(input: HarnessTurnInput, text: string, stopReason: TurnStopReason, steps: number): HarnessTurnResult {
    input.journal.append({ type: "AssistantMessageEmitted", turn: input.turn, payload: { text, stopReason } });
    return { replyText: text, stopReason, steps };
  }
}

/** Signal names referenced anywhere in the flow, so the interpretation pass knows the vocabulary. */
function collectSignalNames(services: HarnessServices): string[] {
  const names = new Set<string>();
  const walk = (condition: unknown): void => {
    if (!condition || typeof condition !== "object") return;
    const c = condition as { kind?: string; name?: string; of?: unknown };
    if (c.kind === "signal" && typeof c.name === "string") names.add(c.name);
    if (Array.isArray(c.of)) c.of.forEach(walk);
    else if (c.of) walk(c.of);
  };
  for (const phase of services.definition.flow?.phases ?? []) {
    for (const transition of phase.transitions ?? []) walk(transition.when);
  }
  return [...names];
}

function safeParse(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    // Some models wrap JSON in prose. Take the outermost object rather than failing the whole pass.
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) return undefined;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return undefined;
    }
  }
}
