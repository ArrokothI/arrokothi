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

/**
 * Appends to a list as the list's **own** data.
 *
 * The K11-R6-STATE-02 and K11-R6-VAL-04 cases deliberately install an inherited indexed accessor on
 * `Array.prototype` and leave it live across a Kernel call. A fake or a recorder that used `push`
 * or `list[list.length] = item` inside that window would have its own writes swallowed by the
 * accessor — and a setter that recorded with `push` would recurse into itself — so the instruments
 * could not report what the Kernel actually did.
 *
 * This is test instrumentation, not a second copy of the rule under test. The subject is
 * `packages/kernel/src/own-array.ts`; this only keeps the observers honest while it is exercised.
 */
export const recordOwn = <T>(list: T[], item: T): void => {
  Object.defineProperty(list, `${list.length}`, { value: item, writable: true, enumerable: true, configurable: true });
};

/** A live inherited-indexed-accessor trap on `Array.prototype`, and the handle that removes it. */
export interface InheritedIndexTrap {
  /** Every value the inherited setter swallowed, in the order it received them. */
  readonly swallowed: unknown[];
  /** What the inherited getter answers for a position the list does not own. */
  readonly substitute: unknown;
  /** Restores the exact descriptors that were there before, including their absence. */
  restore(): void;
}

/**
 * Installs an inherited accessor at each named index of `Array.prototype`.
 *
 * The setter drops the write and records it; the getter answers `substitute`. That is the exact
 * shape a caller can install from inside a boundary observation, and it is what makes
 * `list[list.length] = item` and `push` lose the Kernel's element while a later read of the same
 * position answers from the attacker. Always restore in a `finally`: the accessor is process-wide
 * while it is installed.
 */
export function trapInheritedIndices(indices: readonly string[], substitute: unknown = "inherited-substitute"): InheritedIndexTrap {
  const swallowed: unknown[] = [];
  const saved: { index: string; descriptor: PropertyDescriptor | undefined }[] = [];
  for (let position = 0; position < indices.length; position += 1) {
    const index = indices[position] as string;
    recordOwn(saved, { index, descriptor: Object.getOwnPropertyDescriptor(Array.prototype, index) });
    Object.defineProperty(Array.prototype, index, {
      configurable: true,
      set(value: unknown) {
        recordOwn(swallowed, value);
      },
      get() {
        return substitute;
      },
    });
  }
  return {
    swallowed,
    substitute,
    restore(): void {
      for (let position = saved.length - 1; position >= 0; position -= 1) {
        const entry = saved[position] as { index: string; descriptor: PropertyDescriptor | undefined };
        if (entry.descriptor === undefined) delete (Array.prototype as unknown as Record<string, unknown>)[entry.index];
        else Object.defineProperty(Array.prototype, entry.index, entry.descriptor);
      }
    },
  };
}

/**
 * Whether an inherited indexed accessor is really live right now.
 *
 * Every case that installs one asserts this, so a green result cannot come from a trap that was
 * never installed or was restored too early. The probe is an ordinary indexed write into a fresh
 * list: under a live setter it lands nowhere and leaves the list empty.
 */
export function inheritedIndexIsLive(index: number): boolean {
  const probe: unknown[] = [];
  probe[index] = "control-write";
  return probe.length === 0 || !Object.prototype.hasOwnProperty.call(probe, `${index}`);
}

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
      recordOwn(seen, activation);
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
      recordOwn(seen, activation);
      return new Promise<void>((resolve) => recordOwn(pending, resolve));
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
