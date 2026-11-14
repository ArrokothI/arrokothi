/**
 * The SDK host: it owns the in-process Kernel coordinator, dispatches READY Executions and pumps
 * due timers (K1.4 design 01 §4, as changed by design 02 D01-CHK-04 and HOST-01).
 *
 * There is no background loop. The host drives only inside host calls. It tracks each Execution's
 * Kernel state from the Kernel's own answers (creation, dispatch, accepted Outcomes, cancellation,
 * timer fires) and reads `inspect` only when an answer leaves the state unknown, or to build a
 * return value, so the host adds no per-iteration read of a history that grows (GROW-01).
 */

import { setTimeout as delay } from "node:timers/promises";
import { HarnessRunawayError } from "@arrokothi/core";
import type { ActivationRecord } from "@arrokothi/core";
import { ExecutionCoordinator, isTerminal } from "@arrokothi/kernel";
import type { AuthenticatedCaller, ExecutionState, ExecutionView } from "@arrokothi/kernel";
import type { ExchangeReport, LegacyDriver } from "./legacy-bridge/driver.ts";

/** The dispatch bound: how many queued Events one Activation may carry. */
export const DISPATCH_BOUND = 64;
/** `runUntilIdle` keeps the legacy default bound on how many native steps one call may run. */
export const IDLE_STEP_LIMIT = 1_000;

type Known = ExecutionState | "unknown";

/** A one-shot broadcast: `wait()` resolves at the next `notify()`. */
class Pulse {
  private waiters: Array<() => void> = [];
  wait(): Promise<void> {
    return new Promise(resolve => this.waiters.push(resolve));
  }
  notify(): void {
    const waiters = this.waiters;
    this.waiters = [];
    for (const resolve of waiters) resolve();
  }
}

export class ApplicationHost {
  readonly coordinator: ExecutionCoordinator;
  readonly caller: AuthenticatedCaller;
  private readonly driver: LegacyDriver;
  private readonly now: () => number;
  private readonly known = new Map<string, Known>();
  /** Executions that may be READY: the only ones a host iteration looks at. */
  private readonly candidates = new Set<string>();
  private readonly pulse = new Pulse();

  constructor(driver: LegacyDriver, now: () => number, caller: AuthenticatedCaller, controlCaller: AuthenticatedCaller) {
    this.driver = driver;
    this.now = now;
    this.caller = caller;
    this.coordinator = new ExecutionCoordinator({ driver, clock: { now } });
    driver.attach(this.coordinator, caller, controlCaller);
  }

  /** The Driver's change signal: an exchange ended, or a task parked or resumed. */
  noteExchange(report: ExchangeReport | null): void {
    if (report !== null) {
      const state = report.accepted ? (report.nextState as ExecutionState) : "unknown";
      this.setKnown(report.executionId, state);
    }
    this.pulse.notify();
  }

  /** Records what a host entry or answer says about E's state, and wakes any waiting run. */
  setKnown(executionId: string, state: Known): void {
    this.known.set(executionId, state);
    if (state === "READY" || state === "unknown") this.candidates.add(executionId);
    else this.candidates.delete(executionId);
    this.pulse.notify();
  }

  knownState(executionId: string): Known | undefined {
    return this.known.get(executionId);
  }

  /** Fires every timer due on the Kernel clock: live wait and Execution deadlines take effect at host calls (L-22). */
  pump(): void {
    const now = this.now();
    for (const timer of this.coordinator.pendingTimers()) {
      if (timer.deadline > now) continue;
      const answer = this.coordinator.fireTimer(timer);
      if (answer.result === "expired" || answer.result === "cancelled") this.setKnown(timer.executionId, "unknown");
    }
  }

  inspect(executionId: string): ExecutionView {
    const view = this.coordinator.inspect(this.caller, executionId);
    if (!view.ok) throw new Error(`Unknown Execution ${executionId}: ${view.error.reason}`);
    return view.value;
  }

  /** E's Kernel state, reading `inspect` only when the answers so far leave it unknown. */
  state(executionId: string): ExecutionState {
    const known = this.known.get(executionId);
    if (known !== undefined && known !== "unknown") return known;
    const state = this.inspect(executionId).state;
    this.setKnown(executionId, state);
    return state;
  }

  /** Dispatches every candidate that is READY; returns how many exchanges opened. */
  dispatchReady(limit = Number.POSITIVE_INFINITY): number {
    let opened = 0;
    for (const executionId of [...this.candidates]) {
      if (opened >= limit) break;
      if (this.state(executionId) !== "READY") continue;
      const answer = this.coordinator.dispatch(this.caller, executionId, { bound: DISPATCH_BOUND });
      if (answer.ok) {
        opened += 1;
        this.setKnown(executionId, "RUNNING");
        continue;
      }
      const classification = answer.error.classification;
      this.setKnown(executionId, classification === "exchange_unresolved" ? "RUNNING" : classification === "not_ready" ? "WAITING" : "unknown");
    }
    return opened;
  }

  /** Resolves at the next change signal, after `sliceMs`, or when `signal` aborts. */
  async idle(sliceMs: number, signal?: AbortSignal): Promise<void> {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      await Promise.race([
        this.pulse.wait(),
        delay(sliceMs, undefined, { signal: controller.signal }).catch(() => undefined),
      ]);
    } finally {
      controller.abort();
      signal?.removeEventListener("abort", onAbort);
    }
  }

  isTerminal(state: ExecutionState): boolean {
    return isTerminal(state);
  }

  /**
   * Dispatches and waits until no Execution is READY and no exchange is mid-step. Like the legacy
   * call, it does not wait for native work in flight. Returns the native steps it saw run.
   */
  async runUntilIdle(): Promise<readonly ActivationRecord[]> {
    const records: ActivationRecord[] = [];
    const unsubscribe = this.driver.onStep(record => records.push(record));
    try {
      for (;;) {
        this.pump();
        if (records.length > IDLE_STEP_LIMIT) throw new HarnessRunawayError(IDLE_STEP_LIMIT);
        const changed = this.pulse.wait();
        this.dispatchReady();
        if (this.candidates.size === 0 && this.driver.busy === 0) return records;
        await changed;
      }
    } finally {
      unsubscribe();
    }
  }
}
