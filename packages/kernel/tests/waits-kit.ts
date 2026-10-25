/**
 * Controlled fakes for the K1.3 cases: a manual clock, a Driver that keeps every capability, and the
 * small steps the wait, timer and cancellation cases repeat.
 *
 * Like `harness.ts`, nothing here decides what the Kernel should have done: the clock answers what a
 * test set, counts its reads and can be told to fail or reenter; the Driver records what it was
 * handed and reports only when a test says so.
 */

import assert from "node:assert/strict";

import type { Activation, AuthenticatedCaller, DeliverySettlement, ExecutionDriver, ExecutionView, SubmissionGrant } from "../src/index.ts";
import { ExecutionCoordinator } from "./binding-facade.ts";
import { accepted, caller, createRequest, outcomeFor, recordOwn } from "./harness.ts";

/** A clock a test drives. `fail` makes the next readings unusable; `onRead` runs inside a reading. */
export interface ManualClock {
  now(): number;
  /** Sets the reading. */
  set(value: number): void;
  /** How many times the Kernel has read it. */
  reads: number;
  /** When set, a reading throws (`"throw"`) or answers a value that is not a usable reading. */
  fail: "throw" | "nan" | "negative" | "fraction" | "text" | null;
  /** When set, runs inside the next reading only (a reentrant host clock), then clears itself. */
  onRead: (() => void) | null;
}

export function manualClock(start = 0): ManualClock {
  let value = start;
  const clock: ManualClock = {
    reads: 0,
    fail: null,
    onRead: null,
    set(next: number): void {
      value = next;
    },
    now(): number {
      clock.reads += 1;
      const hook = clock.onRead;
      if (hook !== null) {
        clock.onRead = null;
        hook();
      }
      if (clock.fail === "throw") throw new Error("clock unavailable");
      if (clock.fail === "nan") return Number.NaN;
      if (clock.fail === "negative") return -1;
      if (clock.fail === "fraction") return value + 0.5;
      if (clock.fail === "text") return `${value}` as unknown as number;
      return value;
    },
  };
  return clock;
}

/** One cancellation request the Driver received (K1.3, owner choice 01). */
export interface SeenCancellation {
  readonly executionId: string;
  readonly cause: string;
  readonly attempt: { readonly activationId: string; readonly writerEpoch: number } | null;
}

/** A Driver that keeps every Activation, grant and capability, and reports nothing by itself. */
export interface KeepingDriver extends ExecutionDriver {
  readonly seen: Activation[];
  readonly submissions: SubmissionGrant[];
  readonly settlements: DeliverySettlement[];
  readonly cancellations: SeenCancellation[];
}

export function keepingDriver(options: { readonly reportAtOnce?: boolean } = {}): KeepingDriver {
  const seen: Activation[] = [];
  const submissions: SubmissionGrant[] = [];
  const settlements: DeliverySettlement[] = [];
  const cancellations: SeenCancellation[] = [];
  return {
    driverId: "fake-keeping",
    seen,
    submissions,
    settlements,
    cancellations,
    deliver(activation: Activation, settlement: DeliverySettlement, submission: SubmissionGrant): undefined {
      recordOwn(seen, activation);
      recordOwn(submissions, submission);
      recordOwn(settlements, settlement);
      if (options.reportAtOnce === true) settlement.delivered();
      return undefined;
    },
    isSafeToReplace(): boolean {
      return true;
    },
  };
}

export const author: AuthenticatedCaller = { ...caller("app-a", "tenant-a"), cancelScopes: ["tenant-a"] } as AuthenticatedCaller;

/** The newest grant the Driver received for an Activation. */
export function grantOf(driver: { readonly submissions: readonly SubmissionGrant[] }, activationId: string): SubmissionGrant {
  for (let index = driver.submissions.length - 1; index >= 0; index -= 1) {
    const grant = driver.submissions[index];
    if (grant !== undefined && grant.activationId === activationId) return grant;
  }
  throw new Error(`no grant for ${activationId}`);
}

export interface Opened {
  readonly kernel: ExecutionCoordinator;
  readonly driver: KeepingDriver;
  readonly clock: ManualClock;
  readonly executionId: string;
}

/** A coordinator with a manual clock and one Execution, `READY` with its initial input queued. */
export function created(options: { readonly clock?: ManualClock | null; readonly mailboxCapacity?: number; readonly driver?: KeepingDriver; readonly executionDeadline?: number } = {}): Opened {
  const driver = options.driver ?? keepingDriver({ reportAtOnce: true });
  const clock = options.clock === null ? manualClock() : (options.clock ?? manualClock());
  const kernel = new ExecutionCoordinator({
    driver,
    ...(options.clock === null ? {} : { clock }),
    ...(options.mailboxCapacity === undefined ? {} : { mailboxCapacity: options.mailboxCapacity }),
  });
  const request = options.executionDeadline === undefined ? createRequest() : { ...createRequest(), executionDeadline: options.executionDeadline };
  const { executionId } = accepted(kernel.createExecution(author, request));
  return { kernel, driver, clock, executionId };
}

export const view = (opened: { readonly kernel: ExecutionCoordinator; readonly executionId: string }): ExecutionView =>
  accepted(opened.kernel.inspect(author, opened.executionId));

export interface Exchange {
  readonly activationId: string;
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
  readonly batch: readonly string[];
}

export const dispatch = (opened: Opened, bound = 1): Exchange => accepted(opened.kernel.dispatch(author, opened.executionId, { bound }));

let inputCounter = 0;

/** Accepts one input; `subscriptionClass` makes it eligible under a wait subscribing to that class. */
export function input(opened: Opened, subscriptionClass?: string, payload: unknown = { n: (inputCounter += 1) }, requestKey = `input-${(inputCounter += 1)}`): string {
  const request = subscriptionClass === undefined
    ? { destination: opened.executionId, requestKey, kind: "application.note", payload }
    : { destination: opened.executionId, requestKey, kind: "application.note", payload, subscriptionClass };
  return accepted(opened.kernel.submitInput(author, request as never)).eventId;
}

/** A subscription-only wait on `subscriptionClass`, with an optional deadline. */
export const waitOn = (subscriptionClass: string, deadline?: number): Record<string, unknown> =>
  deadline === undefined ? { subscriptions: [{ subscriptionClass }] } : { subscriptions: [{ subscriptionClass }], deadline };

/** Submits an `await` for `exchange` with its current grant. */
export const submitAwait = (opened: Opened, exchange: Exchange, wait: unknown, overrides: Record<string, unknown> = {}) =>
  opened.kernel.submitOutcome(author, outcomeFor(opened.executionId, exchange, { next: { step: "await", wait }, ...overrides }), grantOf(opened.driver, exchange.activationId));

/** Submits a `continue` (or another next step) for `exchange` with its current grant. */
export const submitNext = (opened: Opened, exchange: Exchange, next: unknown = { step: "continue" }, overrides: Record<string, unknown> = {}) =>
  opened.kernel.submitOutcome(author, outcomeFor(opened.executionId, exchange, { next, ...overrides }), grantOf(opened.driver, exchange.activationId));

/** The key of a wait generation's timer. */
export const waitKey = (executionId: string, generation: number) => ({ executionId, kind: "wait_deadline" as const, generation });

/** Asserts the whole view is unchanged but for the listed members. */
export function sameExcept(before: ExecutionView, after: ExecutionView, members: readonly (keyof ExecutionView)[], message?: string): void {
  const strip = (v: ExecutionView): Record<string, unknown> => {
    const copy: Record<string, unknown> = { ...v };
    for (const member of members) delete copy[member];
    return copy;
  };
  assert.deepEqual(strip(after), strip(before), message);
}
