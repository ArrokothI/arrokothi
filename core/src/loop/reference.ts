import type { ModelMessage } from "../provider/types.ts";
import type {
  AgentLoopCapabilityResult,
  AgentLoopEngine,
  AgentLoopInput,
  AgentLoopMetrics,
  AgentLoopResult,
} from "./types.ts";

/**
 * Small provider-neutral reference loop retained for deterministic tests and A/B comparisons.
 * It is deliberately non-primary: production agentic execution should inject StrandsLoopEngine.
 */
export class ReferenceLoopEngine implements AgentLoopEngine {
  readonly name = "reference-loop-v0.36";

  async run(input: AgentLoopInput): Promise<AgentLoopResult> {
    if (!input.modelProvider) throw new Error("ReferenceLoopEngine requires AgentLoopInput.modelProvider");
    const inner: ModelMessage[] = [];
    const metrics: AgentLoopMetrics = { iterations: 0, modelCalls: 0, guideRetryCalls: 0, conversationSummaryCalls: 0, toolRequests: 0 };

    for (let iteration = 1; iteration <= Math.max(1, input.limits.maxIterations); iteration++) {
      metrics.iterations = iteration;
      if (input.signal?.aborted) return this.finish(input, "I stopped this run because it was cancelled.", "cancelled", metrics);

      const catalog = input.capabilities();
      input.onTrace?.({ kind: "iteration_started", iteration, capabilityNames: catalog.capabilities.map((item) => item.name) });
      const started = Date.now();
      const response = await input.modelProvider.generate({
        system: input.context.system,
        messages: [...input.context.messages, ...inner],
        tools: catalog.capabilities.length ? catalog.capabilities.map((item) => item.modelSpec) : undefined,
        model: input.modelPolicy.model,
        temperature: input.modelPolicy.temperature,
        maxOutputTokens: input.modelPolicy.maxOutputTokens,
        purpose: "agent_loop",
        signal: input.signal,
      });
      metrics.modelCalls++;
      input.onTrace?.({
        kind: "model_call_completed",
        iteration,
        providerId: response.providerId,
        model: response.model,
        usage: response.usage,
        stopReason: response.finishReason,
        durationMs: Date.now() - started,
      });

      const calls = response.toolCalls ?? [];
      if (!calls.length) {
        const text = (response.text ?? "").trim();
        if (!text) return this.finish(input, "I could not determine a safe next step. Could you clarify what you need?", "error", metrics);
        const decision = await input.validateTerminalResponse?.(text) ?? { kind: "proceed" as const };
        input.onTrace?.({ kind: "runtime_decision", iteration, decision });
        if (decision.kind === "guide" && metrics.guideRetryCalls < input.limits.maxGuideRetries) {
          metrics.guideRetryCalls++;
          input.onTrace?.({ kind: "guide_retry", iteration, retry: metrics.guideRetryCalls, feedback: decision.feedback });
          inner.push({ role: "assistant", content: text }, { role: "user", content: decision.feedback });
          continue;
        }
        if (decision.kind === "deny") return this.finish(input, decision.reason, "denied", metrics);
        if (decision.kind === "transform") return this.finish(input, String(decision.input["text"] ?? text), "end_turn", metrics);
        return this.finish(input, text, "end_turn", metrics, response.finishReason);
      }

      inner.push({ role: "assistant", content: JSON.stringify({ capability_requests: calls }) });
      const results = await this.executeCalls(input, catalog, calls, iteration, metrics);
      for (const [index, result] of results.entries()) {
        const call = calls[index]!;
        if (result.decision.kind === "confirm") {
          return this.finish(input, result.decision.promptText, "awaiting_confirmation", metrics);
        }
        const observation = result.observation ?? decisionObservation(result);
        inner.push({ role: "tool", toolName: call.name, content: JSON.stringify(observation) });
      }
    }

    return this.finish(
      input,
      "I reached the safe iteration limit before I had enough evidence to finish. Please narrow the request or continue in a new turn.",
      "max_iterations",
      metrics,
    );
  }

  private async executeCalls(
    input: AgentLoopInput,
    catalog: ReturnType<AgentLoopInput["capabilities"]>,
    calls: { name: string; args: Record<string, unknown> }[],
    iteration: number,
    metrics: AgentLoopMetrics,
  ): Promise<AgentLoopCapabilityResult[]> {
    const output = new Array<AgentLoopCapabilityResult>(calls.length);
    const readIndexes = calls
      .map((call, index) => ({ index, capability: catalog.capabilities.find((item) => item.name === call.name) }))
      .filter((item) => item.capability?.readOnly)
      .map((item) => item.index);
    const reads = new Set(readIndexes);

    await Promise.all(readIndexes.map(async (index) => {
      const call = calls[index]!;
      metrics.toolRequests++;
      input.onTrace?.({ kind: "capability_requested", iteration, name: call.name });
      output[index] = await this.request(input, { name: call.name, input: call.args ?? {}, iteration });
      input.onTrace?.({ kind: "runtime_decision", iteration, name: call.name, decision: output[index]!.decision });
    }));
    for (const [index, call] of calls.entries()) {
      if (reads.has(index)) continue;
      metrics.toolRequests++;
      input.onTrace?.({ kind: "capability_requested", iteration, name: call.name });
      output[index] = await this.request(input, { name: call.name, input: call.args ?? {}, iteration });
      input.onTrace?.({ kind: "runtime_decision", iteration, name: call.name, decision: output[index]!.decision });
    }
    return output;
  }

  private async request(
    input: AgentLoopInput,
    request: Parameters<AgentLoopInput["requestCapability"]>[0],
  ): Promise<AgentLoopCapabilityResult> {
    const preliminary = await input.evaluateCapability?.(request) ?? { kind: "proceed" as const };
    if (preliminary.kind === "transform") {
      input.onTrace?.({ kind: "runtime_decision", iteration: request.iteration, name: request.name, decision: preliminary });
      return input.requestCapability({ ...request, input: preliminary.input });
    }
    if (preliminary.kind !== "proceed") return { decision: preliminary };
    return input.requestCapability(request);
  }

  private finish(
    input: AgentLoopInput,
    replyText: string,
    stopReason: AgentLoopResult["stopReason"],
    metrics: AgentLoopMetrics,
    providerStopReason?: string,
  ): AgentLoopResult {
    input.onTrace?.({ kind: "execution_terminated", stopReason });
    return { replyText, stopReason, metrics, providerStopReason };
  }
}

function decisionObservation(result: AgentLoopCapabilityResult): Record<string, unknown> {
  const decision = result.decision;
  if (decision.kind === "guide") return { ok: false, decision: "guide", code: decision.code, feedback: decision.feedback };
  if (decision.kind === "deny") return { ok: false, decision: "deny", code: decision.code, reason: decision.reason };
  if (decision.kind === "transform") return { ok: false, decision: "transform", reason: decision.reason, input: decision.input };
  return { ok: decision.kind === "proceed" };
}
