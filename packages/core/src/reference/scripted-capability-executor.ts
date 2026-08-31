/**
 * Deterministic reference CapabilityExecutors.
 *
 * A conformance suite has to be able to say "complete this immediately" and "stay pending, then
 * complete later" about the *same* semantic request, without a sleep, a timer, a network call, or a
 * dependence on how fast the machine is. These provide exactly that, and nothing else.
 *
 * `createScriptedCapabilityExecutor` answers from a script keyed by capability/operation and
 * resolves immediately, so the Effect settles inside the Activation's inline wait budget.
 *
 * `createDeferredCapabilityExecutor` returns a promise that resolves only when the test calls
 * `complete`/`fail`/`unknown` for that request. The Effect therefore outlives the Activation, the
 * Execution has a real pending operation, and the slow path is exercised for real rather than
 * simulated.
 *
 * Both record what they were handed, which is how conformance proves a denied Effect never reached
 * an executor and that no Harness, store, or credential appears in an authorized request.
 */

import type { AuthorizedCapabilityRequest, CapabilityExecutionEnvironment } from "../effects/capability.ts";
import type { CapabilityOutcome } from "../effects/outcome.ts";
import type { CapabilityExecutor } from "../ports/capability-executor.ts";
import { UnknownCapabilityError } from "../ports/capability-executor.ts";
import type { JsonValue } from "../util/json.ts";

export interface RecordedCapabilityCall {
  readonly request: AuthorizedCapabilityRequest;
  readonly environment: CapabilityExecutionEnvironment;
}

export interface RecordingCapabilityExecutor extends CapabilityExecutor {
  /** Every dispatch this executor received, in order. Empty means nothing was ever dispatched. */
  readonly calls: readonly RecordedCapabilityCall[];
  readonly callCount: number;
}

export type ScriptedCapabilityHandler = (
  request: AuthorizedCapabilityRequest,
) => CapabilityOutcome | Promise<CapabilityOutcome>;

export interface ScriptedCapabilityExecutorOptions {
  /** Keyed by `"capability"` or `"capability:operation"`; the more specific key wins. */
  readonly handlers?: Readonly<Record<string, ScriptedCapabilityHandler>>;
  /** Answers any authorized capability the map does not name. */
  readonly fallback?: ScriptedCapabilityHandler;
}

function resolveHandler(
  handlers: Readonly<Record<string, ScriptedCapabilityHandler>>,
  request: AuthorizedCapabilityRequest,
): ScriptedCapabilityHandler | undefined {
  return handlers[`${request.capability}:${request.operation}`] ?? handlers[request.capability];
}

class ScriptedExecutor implements RecordingCapabilityExecutor {
  readonly calls: RecordedCapabilityCall[] = [];
  private readonly handlers: Readonly<Record<string, ScriptedCapabilityHandler>>;
  private readonly fallback: ScriptedCapabilityHandler | undefined;

  constructor(handlers: Readonly<Record<string, ScriptedCapabilityHandler>>, fallback?: ScriptedCapabilityHandler) {
    this.handlers = handlers;
    this.fallback = fallback;
  }

  get callCount(): number {
    return this.calls.length;
  }

  async execute(
    request: AuthorizedCapabilityRequest,
    environment: CapabilityExecutionEnvironment,
  ): Promise<CapabilityOutcome> {
    this.calls.push({ request, environment });
    const handler = resolveHandler(this.handlers, request) ?? this.fallback;
    // An authorized capability with no implementation is a wiring error, and it must be loud.
    // Returning a fabricated success here would let policy and reality disagree silently.
    if (!handler) throw new UnknownCapabilityError(request.capability);
    return handler(request);
  }
}

export function createScriptedCapabilityExecutor(
  options: ScriptedCapabilityExecutorOptions = {},
): RecordingCapabilityExecutor {
  return new ScriptedExecutor(options.handlers ?? {}, options.fallback);
}

export interface DeferredCapabilityCall extends RecordedCapabilityCall {
  readonly settled: boolean;
}

export interface DeferredCapabilityExecutor extends RecordingCapabilityExecutor {
  /** Dispatches this executor has received but not yet been told the outcome of. */
  readonly outstanding: readonly DeferredCapabilityCall[];
  complete(effectId: string, observation: JsonValue): void;
  fail(effectId: string, error: { readonly code: string; readonly message: string }, retryable?: boolean): void;
  unknown(effectId: string, error: { readonly code: string; readonly message: string }): void;
  /** Succeeds every outstanding dispatch with the same observation. */
  completeAll(observation: JsonValue): void;
}

interface Waiter {
  readonly call: RecordedCapabilityCall;
  readonly resolve: (outcome: CapabilityOutcome) => void;
  settled: boolean;
}

class DeferredExecutor implements DeferredCapabilityExecutor {
  readonly calls: RecordedCapabilityCall[] = [];
  private readonly waiters = new Map<string, Waiter>();

  get callCount(): number {
    return this.calls.length;
  }

  get outstanding(): readonly DeferredCapabilityCall[] {
    return [...this.waiters.values()]
      .filter((waiter) => !waiter.settled)
      .map((waiter) => ({ ...waiter.call, settled: false }));
  }

  async execute(
    request: AuthorizedCapabilityRequest,
    environment: CapabilityExecutionEnvironment,
  ): Promise<CapabilityOutcome> {
    const call: RecordedCapabilityCall = { request, environment };
    this.calls.push(call);
    return new Promise<CapabilityOutcome>((resolve) => {
      this.waiters.set(request.effectId, { call, resolve, settled: false });
    });
  }

  complete(effectId: string, observation: JsonValue): void {
    this.settle(effectId, { status: "success", observation });
  }

  fail(effectId: string, error: { readonly code: string; readonly message: string }, retryable = false): void {
    this.settle(effectId, { status: "failure", error, retryable });
  }

  unknown(effectId: string, error: { readonly code: string; readonly message: string }): void {
    this.settle(effectId, { status: "unknown", error });
  }

  completeAll(observation: JsonValue): void {
    for (const [effectId, waiter] of this.waiters) {
      if (!waiter.settled) this.settle(effectId, { status: "success", observation });
    }
  }

  private settle(effectId: string, outcome: CapabilityOutcome): void {
    const waiter = this.waiters.get(effectId);
    if (!waiter) throw new Error(`no outstanding capability dispatch for effect ${effectId}`);
    if (waiter.settled) throw new Error(`capability dispatch for effect ${effectId} was already settled`);
    waiter.settled = true;
    waiter.resolve(outcome);
  }
}

export function createDeferredCapabilityExecutor(): DeferredCapabilityExecutor {
  return new DeferredExecutor();
}
