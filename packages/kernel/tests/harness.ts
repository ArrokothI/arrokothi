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

import type {
  Activation,
  AuthenticatedCaller,
  CreateExecutionRequest,
  DeliverySettlement,
  ExecutionDriver,
  OutcomeEnvelope,
} from "../src/index.ts";
import { defineAt, restoreDescriptor } from "../src/own-array.ts";

/**
 * The `Object.prototype` state before descriptor-field pollution, so it can be restored exactly.
 *
 * `Object.prototype` normally owns none of the six descriptor fields; the saved descriptors make
 * that expectation checkable rather than assumed, and `restore` hands back exactly what was there.
 */
export interface DescriptorPollution {
  /** Restores every installed field to the descriptor it had before, including absence. */
  restore(): void;
}

/**
 * Installs inherited property-descriptor fields on `Object.prototype` (K11-R7-STATE-03).
 *
 * Each entry becomes an own data property of `Object.prototype`, so every ordinary descriptor
 * literal converted while the pollution is live observes both data and accessor fields and the
 * captured `Object.defineProperty` throws — unless the Kernel under test converts only
 * null-prototype descriptors. Plain assignment is the installer because `Object.prototype` has a
 * null prototype itself: the write creates own data with no chain to consult, and it works even
 * while earlier pollution from the same helper is already live (which a descriptor literal could
 * not survive). Always restore in a `finally`: the pollution is process-wide while installed.
 */
export function polluteDescriptorFields(fields: Record<string, unknown>): DescriptorPollution {
  const saved: { key: string; descriptor: PropertyDescriptor | undefined }[] = [];
  const names = Object.keys(fields);
  // All observations first, all mutations second. Installing `get` and then observing `set` would
  // read through the just-installed pollution; worse, an observer that cannot survive it would
  // throw mid-installation and leak the fields it already installed with no handle to remove them.
  for (let index = 0; index < names.length; index += 1) {
    const key = names[index] as string;
    recordOwn(saved, { key, descriptor: Object.getOwnPropertyDescriptor(Object.prototype, key) });
  }
  for (let index = 0; index < names.length; index += 1) {
    const key = names[index] as string;
    (Object.prototype as Record<string, unknown>)[key] = fields[key];
  }
  return {
    restore(): void {
      for (let index = saved.length - 1; index >= 0; index -= 1) {
        const entry = saved[index] as { key: string; descriptor: PropertyDescriptor | undefined };
        restoreDescriptor(Object.prototype, entry.key, entry.descriptor);
      }
    },
  };
}

/**
 * Installs one inherited descriptor field as an accessor, counting its executions (K11-R7-STATE-03).
 *
 * A data-descriptor installation that converts an ordinary literal must `[[Get]]` the inherited
 * field, which runs this getter. A Kernel that converts only null-prototype descriptors never
 * consults the prototype, so the count stays at zero across the whole boundary call.
 */
export function polluteDescriptorGetter(key: string, observed: { count: number }): DescriptorPollution {
  const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(Object.prototype, key);
  // Installed through a null-prototype descriptor so this helper itself works even while other
  // descriptor-field pollution from the same suite is already live (an ordinary literal would
  // throw out of its own conversion there).
  const installer = Object.create(null) as { get: unknown; configurable: boolean };
  installer.get = (): unknown => {
    observed.count += 1;
    return undefined;
  };
  installer.configurable = true;
  Object.defineProperty(Object.prototype, key, installer as PropertyDescriptor);
  return {
    restore(): void {
      restoreDescriptor(Object.prototype, key, descriptor);
    },
  };
}

/**
 * Whether descriptor conversion is genuinely hostile right now.
 *
 * Every case that installs descriptor-field pollution asserts this, so a green result cannot come
 * from pollution that was never installed or was restored too early. The probe is the exact H9
 * operation — a captured `defineProperty` with an ordinary data-descriptor literal — which must
 * throw while the pollution is live.
 */
export function descriptorConversionIsHostile(): boolean {
  try {
    Object.defineProperty([], "0", { value: "control-write", writable: true, enumerable: true, configurable: true });
    return false;
  } catch {
    return true;
  }
}

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
 *
 * K11-R7-STATE-03: the same instruments must also survive inherited *descriptor-field* pollution
 * on `Object.prototype`, which makes an ordinary descriptor literal throw out of `defineProperty`.
 * `recordOwn` therefore goes through the Kernel's own hardened `defineAt` (null-prototype
 * descriptor) rather than spelling its own literal — including inside trap setters that run while
 * that pollution is live.
 */
export const recordOwn = <T>(list: T[], item: T): void => {
  defineAt(list, list.length, item);
};

/**
 * A caller-owned value whose every observation throws, for totality cases (K11-R16-ID-01).
 *
 * `Array.isArray` on this value throws `TypeError`, and any property read throws as well, so a
 * diagnostic that classifies it without containment lets the exception escape the boundary
 * instead of returning the located refusal.
 */
export function revokedProxy(): unknown {
  const { proxy, revoke } = Proxy.revocable({}, {});
  revoke();
  return proxy;
}

/** Hostile ambient Promise-construction state, and the handle that restores it (K11-R16-DISP-01). */
export interface SpeciesPollution {
  /** Restores the exact descriptor that was there before, including absence. */
  restore(): void;
}

/**
 * Installs `getter` as `Promise[Symbol.species]`.
 *
 * A native `then` runs `SpeciesConstructor` before attaching continuations, so a throwing getter
 * here makes the attach itself throw before any rejection handler exists. Always restore in a
 * `finally`: the slot is process-wide while installed.
 */
export function pollutePromiseSpecies(getter: () => unknown): SpeciesPollution {
  const saved = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
  Object.defineProperty(Promise, Symbol.species, { get: getter, configurable: true });
  return {
    restore(): void {
      if (saved === undefined) delete (Promise as unknown as Record<symbol, unknown>)[Symbol.species];
      else Object.defineProperty(Promise, Symbol.species, saved);
    },
  };
}

/** Installs `value` as an own `constructor` on `Promise.prototype` (K11-R16-DISP-01). */
export function pollutePromiseConstructor(value: unknown): SpeciesPollution {
  const saved = Object.getOwnPropertyDescriptor(Promise.prototype, "constructor");
  Object.defineProperty(Promise.prototype, "constructor", { value, writable: true, enumerable: false, configurable: true });
  return {
    restore(): void {
      if (saved === undefined) delete (Promise.prototype as unknown as Record<string, unknown>)["constructor"];
      else Object.defineProperty(Promise.prototype, "constructor", saved);
    },
  };
}

/** Installs `value` as an own `Symbol.species` on `Object.prototype` (K11-R16-DISP-01). */
export function polluteObjectSpecies(value: unknown): SpeciesPollution {
  const saved = Object.getOwnPropertyDescriptor(Object.prototype, Symbol.species);
  Object.defineProperty(Object.prototype, Symbol.species, { value, writable: true, enumerable: false, configurable: true });
  return {
    restore(): void {
      if (saved === undefined) delete (Object.prototype as unknown as Record<symbol, unknown>)[Symbol.species];
      else Object.defineProperty(Object.prototype, Symbol.species, saved);
    },
  };
}

/**
 * Whether the throwing species getter is really live right now.
 *
 * Every case that installs one asserts this, so a green result cannot come from pollution that
 * was never installed or was restored too early.
 */
export function promiseSpeciesIsHostile(): boolean {
  try {
    void (Promise as unknown as Record<symbol, unknown>)[Symbol.species];
    return false;
  } catch {
    return true;
  }
}

/** A live inherited-indexed-accessor trap on `Array.prototype`, and the handle that removes it. */
export interface InheritedIndexTrap {  /** Every value the inherited setter swallowed, in the order it received them. */
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
    // Installed through a null-prototype descriptor: a case may install this trap while
    // descriptor-field pollution on `Object.prototype` is already live, under which an ordinary
    // accessor literal throws out of its own conversion (K11-R7-STATE-03).
    const installer = Object.create(null) as {
      configurable: boolean;
      set: (value: unknown) => void;
      get: () => unknown;
    };
    installer.configurable = true;
    installer.set = (value: unknown): void => {
      recordOwn(swallowed, value);
    };
    installer.get = (): unknown => substitute;
    Object.defineProperty(Array.prototype, index, installer as PropertyDescriptor);
  }
  return {
    swallowed,
    substitute,
    restore(): void {
      for (let position = saved.length - 1; position >= 0; position -= 1) {
        const entry = saved[position] as { index: string; descriptor: PropertyDescriptor | undefined };
        // Hardened restore: a case may combine this trap with descriptor-field pollution on
        // `Object.prototype`, under which an ordinary descriptor literal throws (K11-R7-STATE-03).
        restoreDescriptor(Array.prototype, entry.index, entry.descriptor);
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

/** Records every Activation handed to it and reports delivered synchronously. */
export function recordingDriver(driverId = "fake-recording"): RecordingDriver {
  const seen: Activation[] = [];
  return {
    driverId,
    seen,
    deliver(activation: Activation, settlement: DeliverySettlement): undefined {
      recordOwn(seen, activation);
      settlement.delivered();
      return undefined;
    },
  };
}

export interface DelayedDriver extends ExecutionDriver {
  readonly seen: Activation[];
  readonly settlements: DeliverySettlement[];
  /** Reports delivered for every captured settlement still outstanding. */
  release(): void;
}

/**
 * Captures the reporting capability and reports nothing until `release` is called.
 *
 * This is the barrier behind "a delayed fake A does not prevent B dispatch on the same
 * coordinator": while the report is outstanding, the coordinator has demonstrably not waited
 * for it.
 */
export function delayedDriver(driverId = "fake-delayed"): DelayedDriver {
  const seen: Activation[] = [];
  const settlements: DeliverySettlement[] = [];
  return {
    driverId,
    seen,
    settlements,
    deliver(activation: Activation, settlement: DeliverySettlement): undefined {
      recordOwn(seen, activation);
      recordOwn(settlements, settlement);
      return undefined;
    },
    release(): void {
      while (settlements.length > 0) (settlements.pop() as DeliverySettlement).delivered();
    },
  };
}

/** Throws synchronously from `deliver` (implicit failure report, no explicit report). */
export const throwingDriver = (driverId = "fake-throwing"): ExecutionDriver => ({
  driverId,
  deliver(): undefined {
    throw new Error("native submit refused");
  },
});

/** Reports failed synchronously with a primitive string reason (retained, bounded). */
export const failingDriver = (reason = "native submit lost", driverId = "fake-failing"): ExecutionDriver => ({
  driverId,
  deliver(_activation: Activation, settlement: DeliverySettlement): undefined {
    settlement.failed(reason);
    return undefined;
  },
});

/**
 * A conforming Driver with internal asynchronous work (KC1-ARCH-1).
 *
 * It returns `undefined` promptly, handles its own internal promise rejection, and reports
 * the failure through the capability. No promise crosses into Kernel observation, so no
 * unhandled rejection can escape from the reporting mechanism itself.
 */
export const asyncFailingDriver = (reason = "native submit lost", driverId = "fake-async-failing"): ExecutionDriver => ({
  driverId,
  deliver(_activation: Activation, settlement: DeliverySettlement): undefined {
    Promise.reject(new Error(reason)).then(
      () => {},
      (error: unknown) => {
        settlement.failed(error);
      },
    );
    return undefined;
  },
});

/** The holder of the Array iterator `next` the exact JCS call reads (K11-R16-VAL-01). */
export const arrayIteratorPrototype = (): object => Object.getPrototypeOf([][Symbol.iterator]()) as object;

/** A hostile `next` installed on the Array iterator prototype, and the handle that removes it. */
export interface IteratorNextPollution {
  /** Restores the exact descriptor that was there before, including absence. */
  restore(): void;
}

/**
 * Installs `next` as an own data property of the Array iterator prototype.
 *
 * The exact JCS implementation iterates `Object.keys(object).sort()` with `for...of`, so every
 * step reads this method. That is the shape a caller can install from inside a boundary
 * observation, and it is what makes restoring only `Array.prototype[Symbol.iterator]` leave the
 * serializer steerable. Always restore in a `finally`: the method is process-wide while installed.
 */
export function polluteIteratorNext(next: unknown): IteratorNextPollution {
  const holder = arrayIteratorPrototype();
  const saved = Object.getOwnPropertyDescriptor(holder, "next");
  Object.defineProperty(holder, "next", { value: next, writable: true, enumerable: false, configurable: true });
  return {
    restore(): void {
      if (saved === undefined) delete (holder as Record<string, unknown>).next;
      else Object.defineProperty(holder, "next", saved);
    },
  };
}

/**
 * Whether the hostile iterator `next` is really live right now.
 *
 * Every case that installs one asserts this, so a green result cannot come from pollution that was
 * never installed or was restored too early. The probe iterates a fresh one-element array: under
 * an omit-all `next` it yields nothing.
 */
export function iteratorNextIsHostile(): boolean {
  const seen: string[] = [];
  for (const key of ["probe"]) recordOwn(seen, key);
  return seen.length === 0;
}

/**
 * Installs an own data property on `Object.prototype`, for the iterator-result shadows
 * (`next`/`value`/`done`) the serializer window must also borrow (K11-R16-VAL-01).
 */
export function polluteObjectField(key: string, value: unknown): IteratorNextPollution {
  const saved = Object.getOwnPropertyDescriptor(Object.prototype, key);
  Object.defineProperty(Object.prototype, key, { value, writable: true, enumerable: false, configurable: true });
  return {
    restore(): void {
      if (saved === undefined) delete (Object.prototype as Record<string, unknown>)[key];
      else Object.defineProperty(Object.prototype, key, saved);
    },
  };
}

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

/** What an Outcome answers: the exchange and the attempt, as a dispatch or takeover reported them. */
export interface AnsweredExchange {
  readonly activationId: string;
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
}

/**
 * A well-formed `continue` Outcome answering `exchange`, with one thing varied per test.
 *
 * It names the exchange explicitly, as every submission must (PLAN-01); the builder never looks the
 * current exchange up, so a test that wants a stale answer passes the stale identities.
 */
export const outcomeFor = (
  executionId: string,
  exchange: AnsweredExchange,
  overrides: Partial<Record<keyof OutcomeEnvelope, unknown>> & Record<string, unknown> = {},
): OutcomeEnvelope =>
  ({
    executionId,
    activationId: exchange.activationId,
    writerEpoch: exchange.writerEpoch,
    baseProgressRevision: exchange.baseProgressRevision,
    progress: { phase: "draft", draftRef: "draft-1" },
    next: { step: "continue" },
    ...overrides,
  }) as OutcomeEnvelope;

