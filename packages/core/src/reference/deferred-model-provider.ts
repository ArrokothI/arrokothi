/**
 * A model provider whose calls resolve only when a test says so.
 *
 * `ScriptedModelProvider` answers immediately, which makes it useless for proving anything about
 * slow model work: an inference that settles inside the Activation's inline budget never yields,
 * never creates a `ControllerResumption`, and never lets another Execution run. This provider makes
 * the slow path real rather than simulated - the call genuinely outlives the Activation, and the
 * conformance run advances it explicitly instead of sleeping.
 *
 * ```text
 * harness.runUntilIdle()      A1 starts the call and yields; the Execution is WAITING
 * provider.settle(...)        the provider answers
 * harness.drainResumptions()  the runtime settles the resumption; the Execution is READY
 * harness.runUntilIdle()      A2 resumes the same semantic call
 * ```
 *
 * It is the model-side counterpart to `createDeferredCapabilityExecutor`, and it validates its
 * request and response exactly as the scripted provider does, so a slow call is not also a laxer
 * one.
 */

import { ModelInvocationError } from "../model/errors.ts";
import type { ModelOutput, ModelProviderRequest, ModelProviderResponse } from "../model/types.ts";
import { assertModelProviderRequest, validateModelProviderResponse } from "../model/validation.ts";
import type { ModelProvider } from "../ports/model-provider.ts";

export interface DeferredModelCall {
  readonly request: ModelProviderRequest;
  readonly settled: boolean;
}

export interface DeferredModelProvider extends ModelProvider {
  /** Every request this provider received, in order. */
  readonly requests: readonly ModelProviderRequest[];
  /** How many times the provider was actually invoked. The redispatch assertion reads this. */
  readonly invocationCount: number;
  readonly outstanding: readonly DeferredModelCall[];
  /** Answers the oldest unanswered call. */
  settle(output: ModelOutput, metadata?: { readonly finishReason?: string }): void;
  /** Answers every unanswered call with the same output. */
  settleAll(output: ModelOutput, metadata?: { readonly finishReason?: string }): void;
  /** Fails the oldest unanswered call, as a provider that rejects would. */
  reject(error: Error): void;
}

interface Waiter {
  readonly request: ModelProviderRequest;
  readonly resolve: (response: ModelProviderResponse) => void;
  readonly reject: (error: unknown) => void;
  settled: boolean;
}

class DeferredProvider implements DeferredModelProvider {
  readonly id: string;
  readonly requests: ModelProviderRequest[] = [];
  private readonly waiters: Waiter[] = [];

  constructor(id: string) {
    this.id = id;
  }

  get invocationCount(): number {
    return this.requests.length;
  }

  get outstanding(): readonly DeferredModelCall[] {
    return this.waiters.filter((waiter) => !waiter.settled).map((waiter) => ({ request: waiter.request, settled: false }));
  }

  async generate(request: ModelProviderRequest): Promise<ModelProviderResponse> {
    assertModelProviderRequest(request, this.id);
    this.requests.push(request);
    return new Promise<ModelProviderResponse>((resolve, reject) => {
      this.waiters.push({ request, resolve, reject, settled: false });
    });
  }

  settle(output: ModelOutput, metadata?: { readonly finishReason?: string }): void {
    const waiter = this.next();
    waiter.settled = true;
    waiter.resolve(this.responseFor(waiter.request, output, metadata));
  }

  settleAll(output: ModelOutput, metadata?: { readonly finishReason?: string }): void {
    for (const waiter of this.waiters) {
      if (waiter.settled) continue;
      waiter.settled = true;
      waiter.resolve(this.responseFor(waiter.request, output, metadata));
    }
  }

  reject(error: Error): void {
    const waiter = this.next();
    waiter.settled = true;
    waiter.reject(error);
  }

  private next(): Waiter {
    const waiter = this.waiters.find((candidate) => !candidate.settled);
    if (!waiter) throw new Error(`${this.id} has no outstanding model call to answer`);
    return waiter;
  }

  private responseFor(
    request: ModelProviderRequest,
    output: ModelOutput,
    metadata?: { readonly finishReason?: string },
  ): ModelProviderResponse {
    return validateModelProviderResponse(request, {
      output,
      metadata: {
        provider: this.id,
        model: request.model.model,
        ...(metadata?.finishReason !== undefined ? { finishReason: metadata.finishReason } : {}),
      },
    });
  }
}

export function createDeferredModelProvider(id: string): DeferredModelProvider {
  if (!id.trim()) throw new ModelInvocationError("invalid_request", "a deferred model provider needs a non-empty id", {
    provider: id,
    model: "",
  });
  return new DeferredProvider(id);
}
