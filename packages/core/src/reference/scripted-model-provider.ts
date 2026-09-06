/** Dependency-free scripted implementation of the ModelProvider port. */

import { ModelInvocationError } from "../model/errors.ts";
import type {
  ModelDiagnostics,
  ModelOutput,
  ModelProviderRequest,
  ModelProviderResponse,
  ModelResponseMetadata,
} from "../model/types.ts";
import { assertModelProviderRequest, validateModelProviderResponse } from "../model/validation.ts";
import type { ModelProvider } from "../ports/model-provider.ts";

export interface ScriptedModelStep {
  readonly output?: ModelOutput;
  readonly metadata?: Partial<Omit<ModelResponseMetadata, "provider" | "model">> & {
    readonly provider?: string;
    readonly model?: string;
  };
  readonly diagnostics?: ModelDiagnostics;
  readonly error?: ModelInvocationError;
  /** Wait deterministically for the request signal to abort; no timers or sleeps are involved. */
  readonly waitForCancellation?: boolean;
  /** Conformance-only escape hatch: validation still runs and must reject malformed data. */
  readonly unsafeResponse?: unknown;
}

export interface ScriptedModelProviderOptions {
  readonly id: string;
  readonly steps: readonly ScriptedModelStep[];
}

export class ScriptedModelProvider implements ModelProvider {
  readonly id: string;
  readonly requests: ModelProviderRequest[] = [];
  private readonly steps: readonly ScriptedModelStep[];
  private cursor = 0;

  constructor(options: ScriptedModelProviderOptions) {
    if (!options.id.trim()) throw new Error("ScriptedModelProvider id must be non-empty");
    this.id = options.id;
    this.steps = [...options.steps];
  }

  get invocationCount(): number {
    return this.cursor;
  }

  async generate(request: ModelProviderRequest): Promise<ModelProviderResponse> {
    assertModelProviderRequest(request, this.id);
    if (request.signal?.aborted) {
      throw new ModelInvocationError("cancelled", "model request was cancelled before invocation", {
        provider: this.id,
        model: request.model.model,
      });
    }

    const step = this.steps[this.cursor];
    if (!step) {
      throw new ModelInvocationError("invalid_response", `script exhausted after ${this.cursor} invocations`, {
        provider: this.id,
        model: request.model.model,
      });
    }
    this.cursor++;
    this.requests.push(request);
    if (step.error) throw step.error;

    if (step.waitForCancellation) {
      if (!request.signal) {
        throw new ModelInvocationError("invalid_request", "scripted cancellation step requires a signal", {
          provider: this.id,
          model: request.model.model,
        });
      }
      await new Promise<never>((_resolve, reject) => {
        request.signal!.addEventListener("abort", () => reject(new ModelInvocationError(
          "cancelled",
          "model request was cancelled during invocation",
          { provider: this.id, model: request.model.model },
        )), { once: true });
      });
    }

    const response = step.unsafeResponse ?? {
      output: step.output ?? { text: "scripted response" },
      metadata: {
        provider: step.metadata?.provider ?? this.id,
        model: step.metadata?.model ?? request.model.model,
        ...(step.metadata?.usage ? { usage: { ...step.metadata.usage } } : {}),
        ...(step.metadata?.finishReason ? { finishReason: step.metadata.finishReason } : {}),
      },
      ...(step.diagnostics ? { diagnostics: step.diagnostics } : {}),
    };
    return validateModelProviderResponse(request, response);
  }
}
