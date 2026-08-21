import type { HarnessImplementation, HarnessServices, HarnessTurnInput, HarnessTurnResult, TurnStopReason } from "./types.ts";
import type { MemoryWriteProposal, WorkingNote } from "../memory/types.ts";
import type { ModelToolSpec } from "../provider/types.ts";
import type { AuthorizeDeps } from "../tools/authorize.ts";
import type { TransitionTiming } from "../flow/types.ts";
import type { KnowledgeResult, RetrievalRequest } from "../knowledge/types.ts";
import type { DeterministicPlanner, TurnPlan } from "../planning/types.ts";
import { attemptToolCall, resolvePendingConfirmation } from "../tools/authorize.ts";
import { authorityFor, validateProposal } from "../memory/structured.ts";
import { compileContext, compilePlannerContext } from "../compiler/context-compiler.ts";
import { evaluateTransitions, findPhase } from "../flow/evaluate.ts";
import { ModelProviderError } from "../provider/types.ts";
import { ConservativeDeterministicPlanner, parseTurnPlan, turnPlanSchema } from "../planning/turn-plan.ts";
import { EMPTY_TURN_PLAN } from "../planning/types.ts";
import { CapabilityGateway } from "../capabilities/gateway.ts";

/**
 * The default workflow Harness: PreflightPlan, validate/route/retrieve, then Respond.
 *
 * The planner proposes. The runtime validates memory and retrieval requests. The response model
 * sees only the resulting state/evidence and remains free to use reactive tools.
 */

export interface TwoPassOptions {
  /** Signal names the planner is told about. Defaults to those referenced by Flow. */
  signalVocabulary?: string[];
  /** Optional code-injected deterministic seam used by deterministic/hybrid modes. */
  deterministicPlanner?: DeterministicPlanner;
  /** Compatibility switch. The primary agentic Harness always leaves this false. */
  preflightRetrieval?: boolean;
}

interface PlannedTurn {
  plan: TurnPlan;
  retrievedKnowledge: KnowledgeResult[];
}

/** @deprecated Use the primary AgentHarness with `strategy: "workflow"` for new applications. */
export class TwoPassHarness implements HarnessImplementation {
  readonly name: string = "two-pass-v0.2";
  private readonly options: TwoPassOptions;
  private readonly deterministicPlanner: DeterministicPlanner;

  constructor(options: TwoPassOptions = {}) {
    this.options = options;
    this.deterministicPlanner = options.deterministicPlanner ?? new ConservativeDeterministicPlanner();
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
    const gateway = new CapabilityGateway({ services, deps, harnessName: this.name, turn });

    // Resolve a durable PendingAction first and execute only its frozen payload.
    const confirmation = resolvePendingConfirmation(deps, userMessage, turn);
    if (confirmation.resolved && confirmation.decision === "confirm") {
      const outcome = await attemptToolCall(deps, confirmation.action.toolName, confirmation.action.args, turn, "runtime");
      if (outcome.kind === "executed" || outcome.kind === "replayed") {
        await this.applyTransitions(input, services, "action_result");
      }
    }

    // Pass 1: one bounded semantic plan when needed, followed by runtime-owned state changes.
    const plan = await this.interpretAndPlan(input, services, { includeRetrievalPlanning: this.options.preflightRetrieval ?? true });
    await this.applyTransitions(input, services, "pre_response");
    const retrievedKnowledge = await this.executeRetrievals(plan.retrievalRequests, input, services, gateway);

    // Pass 2: response/tool loop over already-retrieved evidence.
    return this.respond(input, services, gateway, { plan, retrievedKnowledge });
  }

  protected async interpretAndPlan(
    input: HarnessTurnInput,
    services: HarnessServices,
    options: { includeRetrievalPlanning?: boolean } = {},
  ): Promise<TurnPlan> {
    const { definition, knowledge } = services;
    const includeRetrievalPlanning = options.includeRetrievalPlanning ?? true;
    const phase = definition.flow ? findPhase(definition.flow, input.journal.state.phaseId) : undefined;
    const sourceCatalog = includeRetrievalPlanning
      ? knowledge.catalog(input.journal.state.phaseId ?? undefined, phase?.knowledgeSourceIds)
      : [];
    const signalVocabulary = this.options.signalVocabulary ?? collectSignalNames(services);
    const strategy = definition.planning?.mode ?? "llm";
    const deterministicInput = {
      userMessage: input.userMessage,
      state: input.journal.state,
      sourceCatalog,
      signalVocabulary,
      memoryFieldKeys: definition.memorySchema.fields.map((field) => field.key),
    };

    const extractsWorkingNotes = definition.planning?.extractWorkingNotes ?? true;
    const trivial = !definition.memorySchema.fields.length
      && !signalVocabulary.length
      && !extractsWorkingNotes
      && (!includeRetrievalPlanning || !sourceCatalog.length);
    if (trivial) {
      return this.acceptPlan(
        input,
        services,
        structuredClone(EMPTY_TURN_PLAN),
        strategy,
        "deterministic",
        "definition structure permits no memory, note, signal, or compatible retrieval change",
        includeRetrievalPlanning,
      );
    }

    if (strategy === "deterministic" || strategy === "hybrid") {
      const deterministic = await this.deterministicPlanner.plan(deterministicInput);
      if (deterministic.kind === "planned") {
        return this.acceptPlan(input, services, deterministic.plan, strategy, "deterministic", deterministic.reason, includeRetrievalPlanning);
      }
      if (strategy === "deterministic") {
        return this.acceptPlan(input, services, structuredClone(EMPTY_TURN_PLAN), strategy, "safe_empty", deterministic.reason, includeRetrievalPlanning);
      }
    }

    const planned = await this.planWithModel(input, services, sourceCatalog, signalVocabulary, includeRetrievalPlanning);
    if (!planned) {
      return this.acceptPlan(input, services, structuredClone(EMPTY_TURN_PLAN), strategy, "safe_empty", "planner failed or returned malformed structured output", includeRetrievalPlanning);
    }
    return this.acceptPlan(input, services, planned, strategy, "llm", undefined, includeRetrievalPlanning);
  }

  private async planWithModel(
    input: HarnessTurnInput,
    services: HarnessServices,
    sourceCatalog: ReturnType<HarnessServices["knowledge"]["catalog"]>,
    signalVocabulary: string[],
    includeRetrievalPlanning: boolean,
  ): Promise<TurnPlan | null> {
    const { definition, planningModel } = services;
    const fieldDoc = definition.memorySchema.fields.map((field) => {
      const schema = field.schema;
      const constraint = schema.kind === "enum" ? `one of ${schema.choices.join(" | ")}`
        : schema.kind === "number" ? `${schema.min !== undefined ? `min ${schema.min}` : ""}${schema.max !== undefined ? ` max ${schema.max}` : ""}`.trim()
        : schema.kind === "string_array" ? "list of strings"
        : schema.kind;
      return `- ${field.key} (${constraint})${field.description ? ` - ${field.description}` : ""}`;
    }).join("\n");
    const instruction = [
      "Interpret the latest user turn and produce a plan, not a conversational answer.",
      "Only memory_writes directly established by the latest user message are allowed. Put genuine inference in working_notes instead.",
      `Memory fields:\n${fieldDoc || "(none)"}`,
      signalVocabulary.length ? `Signals you may emit: ${signalVocabulary.join(", ")}` : "Emit no signals.",
      includeRetrievalPlanning
        ? "Compatibility mode only: choose logical knowledge sources from the catalog and emit zero retrieval requests when no evidence lookup is needed."
        : "Evidence acquisition, searches, record queries, tool calls, and task decomposition belong to the iterative agent loop. Emit no retrieval requests.",
      ...(includeRetrievalPlanning ? [
        "Rewrite every document query as a concise standalone query. Resolve references such as 'the second one' from the recent transcript.",
        "Use document_search only for document sources, web_search only for web sources, and record_query for exact filters/sorts/counts over record_set sources; never produce SQL.",
      ] : []),
      "Return exactly: {memory_writes, working_notes, signals, retrieval_requests}.",
    ].join("\n\n");
    const context = compilePlannerContext({
      definition,
      state: input.journal.state,
      sourceCatalog,
      taskInstruction: instruction,
      transcriptWindow: 6,
      now: services.clock.now(),
    });
    services.onContextCompiled?.(context, "plan");

    try {
      const policy = definition.planning?.model ?? definition.model;
      const started = Date.now();
      const response = await planningModel.generate({
        system: context.system,
        messages: context.messages,
        responseSchema: turnPlanSchema(definition.policies.maxRetrievalRequests),
        model: policy.model,
        temperature: policy.temperature ?? 0,
        maxOutputTokens: policy.maxOutputTokens,
        purpose: "plan",
      });
      input.journal.append({
        type: "ModelCallCompleted",
        turn: input.turn,
        payload: {
          purpose: "plan",
          providerId: response.providerId,
          model: response.model,
          usage: response.usage,
          finishReason: response.finishReason,
          durationMs: Date.now() - started,
        },
      });
      const parsed = parseTurnPlan(response.json, definition.policies.maxRetrievalRequests);
      if (!parsed.ok) {
        input.journal.append({
          type: "RuntimeError",
          turn: input.turn,
          payload: { code: "invalid_turn_plan", message: parsed.message, detail: "planner structured output was rejected; retrieval and memory writes were skipped" },
        });
        return null;
      }
      return parsed.plan;
    } catch (error) {
      input.journal.append({
        type: "RuntimeError",
        turn: input.turn,
        payload: {
          code: error instanceof ModelProviderError ? error.code : "planning_failed",
          message: error instanceof Error ? error.message : String(error),
          detail: "planning pass failed; the response continued without new memory or retrieval",
        },
      });
      return null;
    }
  }

  private acceptPlan(
    input: HarnessTurnInput,
    services: HarnessServices,
    proposed: TurnPlan,
    strategy: "llm" | "deterministic" | "hybrid",
    resolvedBy: "llm" | "deterministic" | "safe_empty",
    detail?: string,
    includeRetrievalPlanning = true,
  ): TurnPlan {
    const vocabulary = new Set(this.options.signalVocabulary ?? collectSignalNames(services));
    const plan: TurnPlan = {
      memoryProposals: proposed.memoryProposals.slice(0, services.definition.memorySchema.fields.length + 8),
      workingNotes: services.definition.planning?.extractWorkingNotes === false ? [] : proposed.workingNotes
        .filter((note) => typeof note.text === "string" && note.text.trim())
        .slice(0, 5)
        .map((note) => ({ ...note, text: note.text.trim() })),
      signals: [...new Set(proposed.signals.filter((signal) => vocabulary.has(signal)))].slice(0, 6),
      retrievalRequests: includeRetrievalPlanning ? proposed.retrievalRequests.slice() : [],
    };

    input.journal.append({ type: "TurnPlanCreated", turn: input.turn, payload: { strategy, resolvedBy, plan, detail } });
    for (const proposal of plan.memoryProposals) this.commitProposal(input, services, proposal);
    for (const proposal of plan.workingNotes) {
      const note: WorkingNote = {
        id: services.ids.next("note"),
        text: proposal.text,
        sourceEventIds: [input.userEventId],
        turn: input.turn,
        at: services.clock.now().toISOString(),
        confidence: proposal.confidence,
      };
      input.journal.append({ type: "WorkingNoteRecorded", turn: input.turn, payload: { note } });
    }
    if (plan.signals.length) {
      input.journal.append({ type: "SemanticSignalsObserved", turn: input.turn, payload: { signals: plan.signals } });
    }
    return plan;
  }

  private commitProposal(input: HarnessTurnInput, services: HarnessServices, proposal: MemoryWriteProposal): void {
    if (proposal.value === undefined || proposal.value === null || proposal.value === "") return;
    const provenance = { kind: "user_claimed" as const, sourceEventIds: [input.userEventId], sourceName: "latest_user_message" };
    const proposedEvent = input.journal.append({
      type: "MemoryWriteProposed",
      turn: input.turn,
      payload: {
        key: proposal.key,
        value: proposal.value,
        writeMechanism: "planner_proposal",
        provenance,
        confidence: proposal.confidence,
      },
    });
    const validation = validateProposal(services.definition.memorySchema, proposal, provenance.kind, { coerce: true });
    if (!validation.ok) {
      input.journal.append({
        type: "MemoryWriteRejected",
        turn: input.turn,
        payload: {
          key: proposal.key,
          value: proposal.value,
          code: validation.code,
          reason: validation.reason,
          writeMechanism: "planner_proposal",
          provenance,
          proposalEventId: proposedEvent.id,
        },
      });
      if (validation.code === "unknown_field" && !services.definition.policies.rejectUnknownMemoryFields) {
        const note: WorkingNote = {
          id: services.ids.next("note"),
          text: `${proposal.key}: ${String(proposal.value)}`,
          sourceEventIds: [input.userEventId, proposedEvent.id],
          turn: input.turn,
          at: services.clock.now().toISOString(),
          confidence: proposal.confidence,
        };
        input.journal.append({ type: "WorkingNoteRecorded", turn: input.turn, payload: { note } });
      }
      return;
    }
    const previous = input.journal.state.memory[proposal.key];
    if (previous && JSON.stringify(previous.value) === JSON.stringify(validation.value)) return;
    input.journal.append({
      type: "MemoryWriteCommitted",
      turn: input.turn,
      payload: {
        key: proposal.key,
        value: validation.value,
        previousValue: previous?.value,
        writeMechanism: "planner_proposal",
        provenance,
        authority: authorityFor(validation.field, provenance.kind),
        confidence: proposal.confidence,
        normalized: validation.normalized || undefined,
        proposalEventId: proposedEvent.id,
      },
    });
  }

  protected async executeRetrievals(
    requests: RetrievalRequest[],
    input: HarnessTurnInput,
    services: HarnessServices,
    gateway: CapabilityGateway,
  ): Promise<KnowledgeResult[]> {
    const results: KnowledgeResult[] = [];
    for (const [index, request] of requests.entries()) {
      if (index >= services.definition.policies.maxRetrievalRequests) {
        input.journal.append({ type: "RetrievalRequestRejected", turn: input.turn, payload: { request, error: {
          code: "retrieval_limit_exceeded",
          message: `PreflightPlan exceeds maxRetrievalRequests=${services.definition.policies.maxRetrievalRequests}`,
          requestIndex: index,
        } } });
        continue;
      }
      const outcome = await gateway.requestKnowledge(request, 0);
      if (outcome.kind === "completed" && outcome.knowledgeResult) results.push(outcome.knowledgeResult);
    }
    return results;
  }

  protected async applyTransitions(input: HarnessTurnInput, services: HarnessServices, timing: TransitionTiming): Promise<void> {
    const flow = services.definition.flow;
    if (!flow) return;
    const { fired } = evaluateTransitions(flow, timing, {
      state: input.journal.state,
      signals: input.journal.state.turnSignals,
      toolResults: input.journal.state.turnToolResults,
    });
    if (!fired) return;
    input.journal.append({
      type: "PhaseTransitioned",
      turn: input.turn,
      payload: { from: fired.from, to: fired.to, on: timing, label: fired.label, evaluation: fired },
    });
  }

  private async respond(
    input: HarnessTurnInput,
    services: HarnessServices,
    gateway: CapabilityGateway,
    planned: PlannedTurn,
  ): Promise<HarnessTurnResult> {
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
      const specs: ModelToolSpec[] = toolCalls >= definition.policies.maxToolCallsPerTurn ? [] : services.tools.toModelSpecs(available);
      const context = compileContext({
        definition,
        state: journal.state,
        now: services.clock.now(),
        retrievedKnowledge: planned.retrievedKnowledge,
        taskInstruction: awaitingConfirmationPrompt
          ? `You must now ask the user to confirm before anything is sent. Ask exactly this, in your own voice: ${awaitingConfirmationPrompt}`
          : undefined,
      });
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
          const outcome = await gateway.requestTool(call.name, call.args ?? {}, steps);
          if (outcome.kind === "awaiting_confirmation") awaitingConfirmationPrompt = outcome.promptText;
          else if (outcome.kind === "completed" && outcome.toolOutcome) await this.applyTransitions(input, services, "action_result");
        }
        continue;
      }

      const text = (response.text ?? "").trim();
      if (text) {
        const stop: TurnStopReason = journal.state.pendingAction ? "awaiting_confirmation" : "completed";
        return this.emit(input, text, stop, steps);
      }
      journal.append({
        type: "RuntimeError",
        turn,
        payload: { code: "empty_model_response", message: "model returned neither text nor a tool call", detail: `step ${steps}` },
      });
      return this.emit(input, "Sorry - I did not manage to put a reply together. Could you say that again?", "error", steps);
    }

    journal.append({
      type: "RuntimeError",
      turn,
      payload: {
        code: "max_steps_exceeded",
        message: `turn stopped after ${maxSteps} steps without producing a final reply`,
        detail: "the step limit is enforced by the runtime, not by the model",
      },
    });
    return this.emit(input, "This is taking more steps than I have available for one turn, so I have stopped rather than guess. Could you narrow down what you need?", "max_steps", steps);
  }

  protected emit(input: HarnessTurnInput, text: string, stopReason: TurnStopReason, steps: number): HarnessTurnResult {
    input.journal.append({ type: "AssistantMessageEmitted", turn: input.turn, payload: { text, stopReason } });
    return { replyText: text, stopReason, steps };
  }
}

/** Signal names referenced anywhere in Flow; no message regex or keyword routing is used. */
function collectSignalNames(services: HarnessServices): string[] {
  const names = new Set<string>();
  const walk = (condition: unknown): void => {
    if (!condition || typeof condition !== "object") return;
    const candidate = condition as { kind?: string; name?: string; of?: unknown };
    if (candidate.kind === "signal" && typeof candidate.name === "string") names.add(candidate.name);
    if (Array.isArray(candidate.of)) candidate.of.forEach(walk);
    else if (candidate.of) walk(candidate.of);
  };
  for (const phase of services.definition.flow?.phases ?? []) {
    for (const transition of phase.transitions ?? []) walk(transition.when);
  }
  return [...names];
}
