import type { ModelProvider, ModelRequest, ModelResponse, ModelToolCall } from "../provider/types.ts";

/**
 * Deterministic model doubles.
 *
 * These ship inside core (documented as a deliberate deviation in the design doc) because core's
 * whole value proposition is that the runtime is testable without a live model. They perform no I/O
 * and add no dependencies.
 */

export interface ScriptedStep {
  /** JSON for a planning call, text and/or tool calls for a response call. */
  json?: unknown;
  text?: string;
  toolCalls?: ModelToolCall[];
  /** Only match a request whose `purpose` equals this. Lets a script target one pass. */
  /** `interpret` is retained as a test-fixture alias for the v0.2 `plan` purpose. */
  purpose?: "plan" | "interpret" | "respond" | "agent" | "agent_loop";
  finishReason?: string;
  /** Throw instead of responding, to exercise provider-failure handling. */
  throws?: Error;
}

/**
 * Replays a fixed script. Every request is recorded, so a test can assert on the exact compiled
 * context the runtime produced - the prompt is an observable output, not a side effect.
 */
export class ScriptedModelProvider implements ModelProvider {
  readonly id: string;
  readonly requests: ModelRequest[] = [];
  private readonly steps: ScriptedStep[];
  private cursor = 0;
  private readonly model: string;

  constructor(steps: ScriptedStep[], options: { id?: string; model?: string } = {}) {
    this.steps = steps;
    this.id = options.id ?? "scripted";
    this.model = options.model ?? "scripted-model";
  }

  get remaining(): number {
    return this.steps.length - this.cursor;
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    this.requests.push(request);

    // Skip steps scripted for a different pass, so a script can describe only the calls it cares
    // about without having to pad the other pass with placeholders.
    while (this.cursor < this.steps.length) {
      const candidate = this.steps[this.cursor]!;
      const candidatePurpose = candidate.purpose === "interpret" ? "plan" : candidate.purpose;
      if (candidatePurpose && candidatePurpose !== request.purpose) {
        this.cursor++;
        continue;
      }
      break;
    }

    const step = this.steps[this.cursor];
    if (!step) {
      // Running out of script is a test authoring error for a response call, but harmless for an
      // planning call - so return an empty plan rather than failing the run.
      if (request.purpose === "plan") {
        return { json: {}, providerId: this.id, model: this.model };
      }
      throw new Error(`ScriptedModelProvider exhausted after ${this.cursor} steps (purpose "${request.purpose}")`);
    }
    this.cursor++;

    if (step.throws) throw step.throws;
    return {
      text: step.text,
      toolCalls: step.toolCalls,
      json: step.json,
      providerId: this.id,
      model: this.model,
      finishReason: step.finishReason,
      usage: { inputTokens: request.system.length, outputTokens: (step.text ?? "").length },
    };
  }
}

/**
 * A provider that always echoes a fixed reply and never proposes memory writes or tool calls.
 * Useful for exercising storage, replay, and compilation without scripting every step.
 */
export class StaticModelProvider implements ModelProvider {
  readonly id = "static";
  readonly requests: ModelRequest[] = [];
  private readonly reply: string;

  constructor(reply = "Understood.") {
    this.reply = reply;
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    this.requests.push(request);
    if (request.purpose === "plan") return { json: {}, providerId: this.id, model: "static-model" };
    return { text: this.reply, providerId: this.id, model: "static-model" };
  }
}
