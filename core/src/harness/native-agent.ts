import type { HarnessServices, HarnessTurnInput, HarnessTurnResult } from "./types.ts";
import type { AuthorizeDeps } from "../tools/authorize.ts";
import type { CapabilityOutcome } from "../capabilities/types.ts";
import type { KnowledgeResult } from "../knowledge/types.ts";
import { TwoPassHarness, type TwoPassOptions } from "./two-pass.ts";
import { CapabilityGateway } from "../capabilities/gateway.ts";
import { attemptToolCall, resolvePendingConfirmation } from "../tools/authorize.ts";
import { compileContext } from "../compiler/context-compiler.ts";
import { ModelProviderError } from "../provider/types.ts";

export interface NativeAgentOptions extends TwoPassOptions {}

/** @deprecated Reference v0.3 handwritten loop. Use AgentHarness + StrandsLoopEngine. */
export class NativeAgentHarness extends TwoPassHarness {
  override readonly name = "native-agent-v0.3";

  constructor(options: NativeAgentOptions = {}) {
    super(options);
  }

  override async runTurn(input: HarnessTurnInput, services: HarnessServices): Promise<HarnessTurnResult> {
    const grants = new Set<string>();
    const deps: AuthorizeDeps = {
      definition: services.definition,
      tools: services.tools,
      journal: input.journal,
      confirmationResolver: services.confirmationResolver,
      ids: services.ids,
      clock: services.clock,
      durability: services.durability,
      grants,
    };
    const gateway = new CapabilityGateway({ services, deps, harnessName: this.name, turn: input.turn });

    const confirmation = resolvePendingConfirmation(deps, input.userMessage, input.turn);
    if (confirmation.resolved && confirmation.decision === "confirm") {
      const outcome = await attemptToolCall(deps, confirmation.action.toolName, confirmation.action.args, input.turn, "runtime");
      if (outcome.kind === "executed" || outcome.kind === "replayed") {
        await this.applyTransitions(input, services, "action_result");
      }
    }

    const preflight = await this.interpretAndPlan(input, services);
    await this.applyTransitions(input, services, "pre_response");
    const evidence = await this.executeRetrievals(preflight.retrievalRequests, input, services, gateway);
    return this.agentLoop(input, services, gateway, evidence);
  }

  private async agentLoop(
    input: HarnessTurnInput,
    services: HarnessServices,
    gateway: CapabilityGateway,
    evidence: KnowledgeResult[],
  ): Promise<HarnessTurnResult> {
    const maxIterations = Math.max(1, services.definition.policies.maxAgentIterations);
    let priorObservations: Record<string, unknown>[] = [];

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      if (input.signal?.aborted) {
        input.journal.append({ type: "RuntimeError", turn: input.turn, payload: { code: "cancelled", message: "agent execution was cancelled" } });
        return this.emit(input, "I stopped this run because it was cancelled.", "cancelled", iteration - 1);
      }

      const catalog = gateway.catalog();
      input.journal.append({
        type: "AgentIterationStarted",
        turn: input.turn,
        payload: { harness: this.name, iteration, phaseId: catalog.phaseId, capabilityNames: catalog.capabilities.map((capability) => capability.name) },
      });
      const instruction = [
        "Decide the next safe step inside the current phase capability envelope.",
        "You may request one or more offered capabilities, or return final user-facing text when evidence is sufficient.",
        "Knowledge calls can discover evidence that was not predicted by the PreflightPlan. Do not invent a capability or claim an action succeeded without its runtime observation.",
        priorObservations.length ? `Observations from the previous delegation batch:\n${JSON.stringify(priorObservations, null, 2)}` : "No inner-loop delegation has run yet.",
      ].join("\n\n");
      const context = compileContext({
        definition: services.definition,
        state: input.journal.state,
        now: services.clock.now(),
        retrievedKnowledge: evidence,
        taskInstruction: instruction,
      });
      services.onContextCompiled?.(context, `agent:${iteration}`);

      let response;
      try {
        const started = Date.now();
        response = await services.model.generate({
          system: context.system,
          messages: context.messages,
          tools: catalog.capabilities.length ? catalog.capabilities.map((capability) => capability.modelSpec) : undefined,
          model: services.definition.model.model,
          temperature: services.definition.model.temperature,
          maxOutputTokens: services.definition.model.maxOutputTokens,
          purpose: "agent",
          signal: input.signal,
        });
        input.journal.append({
          type: "ModelCallCompleted",
          turn: input.turn,
          payload: {
            purpose: `agent:${iteration}`,
            providerId: response.providerId,
            model: response.model,
            usage: response.usage,
            finishReason: response.finishReason,
            durationMs: Date.now() - started,
          },
        });
      } catch (error) {
        input.journal.append({
          type: "RuntimeError",
          turn: input.turn,
          payload: { code: error instanceof ModelProviderError ? error.code : "model_call_failed", message: error instanceof Error ? error.message : String(error), detail: `native agent iteration ${iteration}` },
        });
        this.completeIteration(input, iteration, 0, [], "error");
        return this.emit(input, "I ran into a problem while deciding the next step. Nothing unconfirmed was executed.", "error", iteration);
      }

      const calls = response.toolCalls ?? [];
      if (!calls.length) {
        const text = (response.text ?? "").trim();
        if (text) {
          this.completeIteration(input, iteration, 0, [], "completed");
          return this.emit(input, text, input.journal.state.pendingAction ? "awaiting_confirmation" : "completed", iteration);
        }
        input.journal.append({ type: "RuntimeError", turn: input.turn, payload: { code: "empty_model_response", message: "agent returned neither text nor a delegation", detail: `iteration ${iteration}` } });
        this.completeIteration(input, iteration, 0, [], "error");
        return this.emit(input, "I could not determine a safe next step. Could you clarify what you need?", "error", iteration);
      }

      const outcomes = await this.executeDelegations(calls, catalog, iteration, gateway, services.definition.policies.maxParallelReadCalls);
      for (const outcome of outcomes) {
        if (outcome.kind === "completed" && outcome.knowledgeResult) evidence.push(outcome.knowledgeResult);
        if (outcome.kind === "completed" && outcome.toolOutcome) await this.applyTransitions(input, services, "action_result");
      }
      this.completeIteration(input, iteration, calls.length, outcomes);

      const pending = outcomes.find((outcome): outcome is Extract<CapabilityOutcome, { kind: "awaiting_confirmation" }> => outcome.kind === "awaiting_confirmation");
      if (pending) return this.emit(input, pending.promptText, "awaiting_confirmation", iteration);
      priorObservations = outcomes.map(outcomeObservation);
    }

    input.journal.append({
      type: "RuntimeError",
      turn: input.turn,
      payload: { code: "max_agent_iterations_exceeded", message: `agent stopped after maxAgentIterations=${maxIterations}`, detail: "the runtime limit is authoritative" },
    });
    return this.emit(input, "I reached the safe iteration limit before I had enough evidence to finish. Please narrow the request or continue in a new turn.", "max_iterations", maxIterations);
  }

  private async executeDelegations(
    calls: { name: string; args: Record<string, unknown> }[],
    catalog: ReturnType<CapabilityGateway["catalog"]>,
    iteration: number,
    gateway: CapabilityGateway,
    maxParallel: number,
  ): Promise<CapabilityOutcome[]> {
    const outcomes = new Array<CapabilityOutcome>(calls.length);
    const parallelIndexes = calls
      .map((call, index) => ({ call, index, capability: catalog.capabilities.find((candidate) => candidate.name === call.name) }))
      .filter((item) => item.capability?.implementation.kind === "knowledge")
      .map((item) => item.index);
    const parallelSet = new Set(parallelIndexes);

    for (let start = 0; start < parallelIndexes.length; start += maxParallel) {
      const batch = parallelIndexes.slice(start, start + maxParallel);
      const completed = await Promise.all(batch.map((index) => gateway.requestByName(calls[index]!.name, calls[index]!.args ?? {}, iteration)));
      batch.forEach((index, offset) => { outcomes[index] = completed[offset]!; });
    }

    // Existing read Tools and every action remain conservative/sequential. Consequential calls are
    // never started concurrently merely because one model message contained several requests.
    for (const [index, call] of calls.entries()) {
      if (parallelSet.has(index)) continue;
      outcomes[index] = await gateway.requestByName(call.name, call.args ?? {}, iteration);
    }
    return outcomes;
  }

  private completeIteration(
    input: HarnessTurnInput,
    iteration: number,
    requested: number,
    outcomes: CapabilityOutcome[],
    stopReason?: string,
  ): void {
    input.journal.append({
      type: "AgentIterationCompleted",
      turn: input.turn,
      payload: {
        harness: this.name,
        iteration,
        requested,
        completed: outcomes.filter((outcome) => outcome.kind !== "rejected").length,
        rejected: outcomes.filter((outcome) => outcome.kind === "rejected").length,
        stopReason,
      },
    });
  }
}

function outcomeObservation(outcome: CapabilityOutcome): Record<string, unknown> {
  if (outcome.kind === "rejected") return { capability: outcome.capabilityName, ok: false, code: outcome.code, reason: outcome.reason };
  if (outcome.kind === "awaiting_confirmation") return { capability: outcome.capabilityName, ok: false, awaitingConfirmation: true, requestId: outcome.requestId };
  return { capability: outcome.capabilityName, ok: true, ...outcome.observation };
}
