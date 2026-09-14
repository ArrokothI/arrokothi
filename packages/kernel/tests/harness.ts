/**
 * Controlled fakes for the K1.1 cases.
 *
 * 012's deterministic-execution method asks for "controlled fakes and explicit barriers": the
 * Drivers here never do work of their own, and the one that delays holds its promise until a test
 * releases it, so "the coordinator did not wait" is an observed fact rather than a timing accident.
 *
 * Nothing here re-derives protocol behaviour. A fake that decided what the Kernel should have done
 * could excuse the implementation; these only record what they were handed.
 */

import type { Activation, AuthenticatedCaller, CreateExecutionRequest, ExecutionDriver } from "../src/index.ts";

export const caller = (namespace: string, ...scopes: string[]): AuthenticatedCaller => ({
  namespace,
  scopes: scopes.length > 0 ? scopes : ["tenant-a"],
});

/** A complete create request with one obvious thing varied per test. */
export const createRequest = (overrides: Partial<CreateExecutionRequest> = {}): CreateExecutionRequest => ({
  creationKey: "report-17",
  scope: "tenant-a",
  definitionRevision: "weekly-report@3",
  runtimeContractRevision: "runtime-contract@1",
  progressCodec: "inline-json@1",
  authorityContext: { tenant: "a" },
  initialInput: { kind: "application.request", payload: { text: "report for week 37" } },
  ...overrides,
});

export interface RecordingDriver extends ExecutionDriver {
  readonly seen: Activation[];
}

/** Records every Activation handed to it and returns nothing. */
export function recordingDriver(driverId = "fake-recording"): RecordingDriver {
  const seen: Activation[] = [];
  return {
    driverId,
    seen,
    deliver(activation: Activation): void {
      seen.push(activation);
    },
  };
}

export interface DelayedDriver extends ExecutionDriver {
  readonly seen: Activation[];
  /** Settles every promise this Driver has returned so far. */
  release(): void;
}

/**
 * Returns a promise that never settles until `release` is called.
 *
 * This is the barrier behind "a delayed fake A does not prevent B dispatch on the same
 * coordinator": while the promise is outstanding, the coordinator has demonstrably not awaited it.
 */
export function delayedDriver(driverId = "fake-delayed"): DelayedDriver {
  const seen: Activation[] = [];
  const pending: (() => void)[] = [];
  return {
    driverId,
    seen,
    deliver(activation: Activation): Promise<void> {
      seen.push(activation);
      return new Promise<void>((resolve) => pending.push(resolve));
    },
    release(): void {
      while (pending.length > 0) (pending.pop() as () => void)();
    },
  };
}

/** Throws synchronously from `deliver`. */
export const throwingDriver = (driverId = "fake-throwing"): ExecutionDriver => ({
  driverId,
  deliver(): never {
    throw new Error("native submit refused");
  },
});

/** Returns an already-rejected promise from `deliver`. */
export const rejectingDriver = (driverId = "fake-rejecting"): ExecutionDriver => ({
  driverId,
  deliver(): Promise<void> {
    return Promise.reject(new Error("native submit lost"));
  },
});

/** Unwraps an accepted result, failing loudly with the refusal when it was refused instead. */
export function accepted<T>(result: { ok: true; value: T } | { ok: false; error: { classification: string; reason: string } }): T {
  if (!result.ok) throw new Error(`expected acceptance, got ${result.error.classification}: ${result.error.reason}`);
  return result.value;
}

/** Unwraps a refusal, failing loudly when the request was accepted instead. */
export function refused<E>(result: { ok: true; value: unknown } | { ok: false; error: E }): E {
  if (result.ok) throw new Error("expected a refusal, but the request was accepted");
  return result.error;
}
