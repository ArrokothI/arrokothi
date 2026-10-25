import { rawBytes } from "./binding-facade.ts";
/**
 * The DEC-8 poisoned-prototype sweep over a catalog of boundary calls (contract revision 9).
 *
 * `sweep/run-poison-sweep.ts` runs the whole maintained Kernel suite with poisoned prototypes. Two
 * things are outside its reach, and this catalog covers them inside the ordinary test run:
 *
 * - **The six property-descriptor fields** (`value`, `writable`, `get`, `set`, `enumerable`,
 *   `configurable`). Installing them on `Object.prototype` changes what the engine makes of every
 *   ordinary descriptor literal, and the suite's own hostile callbacks use such literals, so the
 *   whole-suite sweep leaves them out. Every callback in this catalog (getters that install
 *   pollution, Proxy traps) builds its descriptors on null-prototype objects, so here the complete
 *   name set is poisoned.
 * - **Paths the maintained suite never reaches**: a non-object initial input at creation, an Effect
 *   field that is not a list, an `available` that is not a record or holds a non-list, and lists whose
 *   `length` or elements cannot be observed.
 *
 * SDK capture is a separately declared source zone; its findings retain wrapper attribution.
 * Every public boundary is called at least once, with accepted, idempotent and refused exits: the
 * constructor, the coordinator methods (K1.3 adds `cancelExecution`, `pendingTimers` and `fireTimer`,
 * and `await` Outcomes), the delivery-report capability, the unsupported-surface mechanism and the
 * value functions. Each call is a poison window. The catalog runs four times —
 * unpoisoned, then counting, throwing and re-entering — and must produce identical results with no
 * accessor reached from a zone frame and the poison demonstrably live in every window.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { refuseUnsupportedSurface, type DeliverySettlement, type ExecutionDriver } from "../src/index.ts";
import { ExecutionCoordinator } from "./binding-facade.ts";
import { boundaryValueIssues, canonicalize, isBoundaryValue, sameLogicalValue } from "../../sdk/src/internal/value-capture.ts";
import { accepted, caller, createRequest, delayedDriver, observer, outcomeFor, recordingDriver, submissionFor, unsafeDriver } from "./harness.ts";
import { createPoison, digest, type PoisonController, type PoisonMode } from "./sweep/poison.ts";
import { DESCRIPTOR_FIELDS, zoneMemberNames } from "./sweep/zone-names.ts";

const ZONE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const CAPTURE_ROOT = resolve(ZONE_ROOT, "../../sdk/src/internal");
const NAMES = [...new Set([...zoneMemberNames(ZONE_ROOT), ...zoneMemberNames(CAPTURE_ROOT)])];
const AVAILABLE = { definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] };
const MISSING_DEFINITION = { ...AVAILABLE, definitionRevisions: [] as string[] };
const MISSING_CODEC = { ...AVAILABLE, progressCodecs: [] as string[] };

/** A descriptor on a null-prototype object: what every catalog callback hands the engine. */
const plain = (fields: Record<string, unknown>): PropertyDescriptor => {
  const descriptor = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(fields)) descriptor[key] = fields[key];
  return descriptor as PropertyDescriptor;
};

/** A copy of an own descriptor on a null-prototype object, for Proxy traps to return. */
const plainOwn = (target: object, key: PropertyKey): PropertyDescriptor | undefined => {
  const found = Reflect.getOwnPropertyDescriptor(target, key);
  if (found === undefined) return undefined;
  const copy = Object.create(null) as Record<string, unknown>;
  for (const field of Reflect.ownKeys(found) as string[]) copy[field] = (Reflect.getOwnPropertyDescriptor(found, field) as PropertyDescriptor).value;
  return copy as PropertyDescriptor;
};

interface Catalog {
  readonly trace: string[];
  readonly steps: number;
  /** What `canonicalize` answered, inside its poison window, for the entry that reaches capture's catch path. */
  readonly catchPath: unknown;
}

function runCatalog(poison: PoisonController): Catalog {
  const trace: string[] = [];
  let steps = 0;
  /** One boundary call as one poison window; its result or exception becomes one trace entry. */
  const step = (label: string, work: () => unknown, kernel?: ExecutionCoordinator, who?: ReturnType<typeof caller>): unknown => {
    steps += 1;
    const reentry =
      kernel === undefined || who === undefined
        ? undefined
        : (): void => {
            const ids = kernel.visibleExecutions(who);
            for (let index = 0; index < ids.length; index += 1) {
              kernel.submitInput(who, { destination: ids[index] as string, requestKey: `catalog-reentry-${index}`, kind: "poison.reentry", payload: null });
            }
          };
    try {
      const result = poison.within(label, work, reentry);
      trace.push(`${label}=${digest(result)}`);
      return result;
    } catch (error) {
      trace.push(`${label}!${(error as Error).constructor.name}:${(error as Error).message}`);
      return undefined;
    }
  };
  const proxy = <T extends object>(target: T, handler: ProxyHandler<T>): T => {
    poison.registerHandler(handler);
    return new Proxy(target, handler);
  };

  const who = caller("catalog", "tenant-a");
  const canceller = { ...who, cancelScopes: ["tenant-a"] };
  const watcher = observer("catalog-observer");

  // -- Construction, creation and ingress --------------------------------------------------------
  const driver = recordingDriver();
  const kernel = step("new ExecutionCoordinator", () => new ExecutionCoordinator({ driver })) as ExecutionCoordinator;
  step("new ExecutionCoordinator (limits on the host's own options prototype)", () => {
    const options = Object.create({ mailboxCapacity: 2, emissionsPerOutcome: 1 }) as { driver: ExecutionDriver };
    options.driver = recordingDriver();
    return new ExecutionCoordinator(options);
  });
  const call = (label: string, work: (k: ExecutionCoordinator) => unknown) => step(label, () => work(kernel), kernel, who);
  const created = call("createExecution: accepted", (k) => k.createExecution(who, createRequest())) as ReturnType<ExecutionCoordinator["createExecution"]>;
  const id = accepted(created).executionId;
  call("createExecution: exact replay", (k) => k.createExecution(who, createRequest()));
  call("createExecution: conflicting content", (k) => k.createExecution(who, createRequest({ definitionRevision: "weekly-report@4" })));
  call("createExecution: initial input that is not an object", (k) => k.createExecution(who, createRequest({ creationKey: "no-input", initialInput: 42 as never })));
  call("createExecution: a scope the caller does not hold", (k) => k.createExecution(who, createRequest({ creationKey: "elsewhere", scope: "tenant-b" })));
  call("createExecution: a creation key that is not text", (k) => k.createExecution(who, createRequest({ creationKey: 7 as never })));
  call("createExecution: a getter that installs pollution while it is observed", (k) =>
    k.createExecution(who, {
      ...createRequest({ creationKey: "hostile" }),
      get definitionRevision(): string {
        Object.defineProperty(Object.prototype, "progressCodec", plain({ value: "ambient@1", configurable: true }));
        return "weekly-report@3";
      },
    }),
  );
  delete (Object.prototype as Record<string, unknown>).progressCodec;
  call("submitInput: accepted", (k) => k.submitInput(who, { destination: id, requestKey: "first", kind: "update", payload: { n: 1 } }));
  call("submitInput: exact replay", (k) => k.submitInput(who, { destination: id, requestKey: "first", kind: "update", payload: { n: 1 } }));
  call("submitInput: conflicting content", (k) => k.submitInput(who, { destination: id, requestKey: "first", kind: "update", payload: { n: 2 } }));
  call("submitInput: malformed payload", (k) => k.submitInput(who, { destination: id, requestKey: "bad", kind: "update", payload: rawBytes("1e400") as never }));
  call("submitInput: unknown destination", (k) => k.submitInput(who, { destination: "no-such-execution", requestKey: "x", kind: "update", payload: null }));
  call("submitInput: an unobservable destination", (k) =>
    k.submitInput(who, proxy({ destination: id, requestKey: "x", kind: "update", payload: null }, { getOwnPropertyDescriptor: () => { throw new Error("unobservable"); } })),
  );

  // -- Dispatch, redelivery, inspection -------------------------------------------------------
  call("dispatch: a bound of zero", (k) => k.dispatch(who, id, { bound: 0 }));
  call("dispatch: a bound whose getter throws", (k) => k.dispatch(who, id, { get bound(): number { throw new Error("no bound"); } }));
  const open = accepted(call("dispatch: accepted", (k) => k.dispatch(who, id, { bound: 1 })) as ReturnType<ExecutionCoordinator["dispatch"]>);
  call("dispatch: an exchange is still unresolved", (k) => k.dispatch(who, id, { bound: 1 }));
  call("redeliver: accepted", (k) => k.redeliver(who, id));
  call("inspect", (k) => k.inspect(who, id));
  call("inspect: hidden from another scope", (k) => k.inspect(caller("elsewhere", "tenant-b"), id));
  call("visibleExecutions", (k) => k.visibleExecutions(who));
  call("cancelExecution: without cancel power", (k) => k.cancelExecution(who, id));
  call("cancelExecution: an Execution hidden from the caller", (k) => k.cancelExecution(caller("elsewhere", "tenant-b"), id));
  call("refuseUnsupportedSurface", () => refuseUnsupportedSurface("admitEffect", "K2"));

  // -- Recovery controls ---------------------------------------------------------------------
  const activationId = open.activationId;
  call("recoverExecution: available that is not a record", (k) => k.recoverExecution(who, id, { activationId, available: 5 as never }));
  call("recoverExecution: a list that is not a list", (k) => k.recoverExecution(who, id, { activationId, available: { ...AVAILABLE, progressCodecs: "inline-json@1" as never } }));
  call("recoverExecution: a list whose length cannot be observed", (k) =>
    k.recoverExecution(who, id, {
      activationId,
      available: { ...AVAILABLE, definitionRevisions: proxy(["weekly-report@3"], { getOwnPropertyDescriptor: (target, key) => { if (key === "length") throw new Error("no length"); return plainOwn(target, key); } }) },
    }),
  );
  call("recoverExecution: without control power", (k) => k.recoverExecution(watcher, id, { activationId, available: MISSING_DEFINITION }));
  call("recoverExecution: a stale Activation", (k) => k.recoverExecution(who, id, { activationId: "stale", available: MISSING_DEFINITION }));
  call("recoverExecution: nothing to change", (k) => k.recoverExecution(who, id, { activationId, available: AVAILABLE }));
  call("recoverExecution: enter a code hold", (k) => k.recoverExecution(who, id, { activationId, available: MISSING_DEFINITION }));
  call("recoverExecution: the same hold again", (k) => k.recoverExecution(who, id, { activationId, available: MISSING_DEFINITION }));
  call("recoverExecution: update the code hold", (k) => k.recoverExecution(who, id, { activationId, available: MISSING_CODEC }));
  call("redeliver: refused while held", (k) => k.redeliver(who, id));
  call("requestTakeover: refused while a code hold stands", (k) => k.requestTakeover(who, id, { activationId, writerEpoch: 1 }));
  call("recoverExecution: clear the code hold, with a getter that installs an inherited resultingEpoch", (k) =>
    k.recoverExecution(who, id, {
      get activationId(): string {
        Object.defineProperty(Object.prototype, "resultingEpoch", plain({ value: 777, configurable: true }));
        return activationId;
      },
      available: AVAILABLE,
    }),
  );
  delete (Object.prototype as Record<string, unknown>).resultingEpoch;
  call("reportProtocolFailure: without control power", (k) => k.reportProtocolFailure(watcher, id, { activationId, writerEpoch: 1, diagnostic: "x" }));
  call("reportProtocolFailure: a stale writer epoch", (k) => k.reportProtocolFailure(who, id, { activationId, writerEpoch: 2, diagnostic: "x" }));
  call("reportProtocolFailure: a malformed report", (k) => k.reportProtocolFailure(who, id, { activationId, writerEpoch: "one" as never, diagnostic: "x" }));
  call("reportProtocolFailure: a diagnostic that is not text", (k) => k.reportProtocolFailure(who, id, { activationId, writerEpoch: 1, diagnostic: { text: "object" } as never }));
  call("reportProtocolFailure: the same hold again", (k) => k.reportProtocolFailure(who, id, { activationId, writerEpoch: 1, diagnostic: "again" }));
  call("requestTakeover: without control power", (k) => k.requestTakeover(watcher, id, { activationId, writerEpoch: 1 }));
  call("requestTakeover: a stale writer epoch", (k) => k.requestTakeover(who, id, { activationId, writerEpoch: 2 }));
  call("requestTakeover: a malformed request", (k) => k.requestTakeover(who, id, { activationId } as never));
  call("requestTakeover: accepted, clearing the protocol hold, with a reentrant getter", (k) =>
    k.requestTakeover(who, id, {
      get activationId(): string {
        k.inspect(who, id);
        return activationId;
      },
      writerEpoch: 1,
    }),
  );
  const unsafe = step("new ExecutionCoordinator (unsafe Driver)", () => new ExecutionCoordinator({ driver: unsafeDriver() })) as ExecutionCoordinator;
  const unsafeId = accepted(unsafe.createExecution(who, createRequest({ creationKey: "unsafe" }))).executionId;
  const unsafeOpen = accepted(unsafe.dispatch(who, unsafeId, { bound: 1 }));
  step("requestTakeover: a Driver that cannot replace safely", () => unsafe.requestTakeover(who, unsafeId, { activationId: unsafeOpen.activationId, writerEpoch: 1 }), unsafe, who);

  // -- Outcome acceptance ---------------------------------------------------------------------
  const current = accepted(kernel.inspect(who, id)).activation as NonNullable<ReturnType<typeof accepted<import("../src/index.ts").ExecutionView>>["activation"]>;
  const exchange = { activationId: current.activationId, writerEpoch: current.writerEpoch, baseProgressRevision: current.baseProgressRevision };
  const grant = submissionFor(driver, exchange.activationId);
  const outcome = (overrides: Record<string, unknown> = {}) => outcomeFor(id, exchange, overrides);
  call("submitOutcome: a superseded writer epoch", (k) => k.submitOutcome(who, outcome({ writerEpoch: 1 }), grant));
  call("submitOutcome: no submission grant", (k) => k.submitOutcome(who, outcome(), { ...grant }));
  call("submitOutcome: malformed progress", (k) => k.submitOutcome(who, outcome({ progress: rawBytes("1e400") }), grant));
  call("submitOutcome: an Effect field that is not a list", (k) => k.submitOutcome(who, outcome({ effects: 3 }), grant));
  call("submitOutcome: proposed Effects", (k) => k.submitOutcome(who, outcome({ effects: [{ kind: "send" }] }), grant));
  call("submitOutcome: a wait", (k) => k.submitOutcome(who, outcome({ next: { step: "await", wait: {} } }), grant));
  call("submitOutcome: Emissions whose element cannot be observed", (k) =>
    k.submitOutcome(who, outcome({ emissions: proxy([{ emissionKey: "e", value: 1 }], { getOwnPropertyDescriptor: (target, key) => { if (key === "0") throw new Error("no element"); return plainOwn(target, key); } }) }), grant),
  );
  call("submitOutcome: Emissions whose length cannot be observed", (k) =>
    k.submitOutcome(who, outcome({ emissions: proxy([{ emissionKey: "e", value: 1 }], { getOwnPropertyDescriptor: (target, key) => { if (key === "length") throw new Error("no length"); return plainOwn(target, key); } }) }), grant),
  );
  call("submitOutcome: continue", (k) => k.submitOutcome(who, outcome({ emissions: [{ emissionKey: "e", value: { out: 1 } }] }), grant));
  call("submitOutcome: exact replay", (k) => k.submitOutcome(who, outcome({ emissions: [{ emissionKey: "e", value: { out: 1 } }] }), grant));
  call("submitOutcome: conflicting replay", (k) => k.submitOutcome(who, outcome(), grant));
  call("submitOutcome: no unresolved exchange", (k) => k.submitOutcome(who, outcome({ activationId: "no-such-activation" }), grant));
  call("redeliver: nothing to redeliver", (k) => k.redeliver(who, id));
  call("recoverExecution: no unresolved exchange", (k) => k.recoverExecution(who, id, { activationId, available: AVAILABLE }));
  const next = accepted(call("dispatch: the next exchange", (k) => k.dispatch(who, id, { bound: 4 })) as ReturnType<ExecutionCoordinator["dispatch"]>);
  call("submitInput: accepted outside the reserved batch", (k) => k.submitInput(who, { destination: id, requestKey: "late", kind: "update", payload: { n: 3 } }));
  call("submitOutcome: complete, disposing the outside-batch input", (k) =>
    k.submitOutcome(who, outcomeFor(id, next, { next: { step: "complete", result: { done: true } } }), submissionFor(driver, next.activationId)),
  );
  call("submitOutcome: after the Execution ended", (k) => k.submitOutcome(who, outcomeFor(id, next, { activationId: "no-such-activation" }), submissionFor(driver, next.activationId)));
  call("submitOutcome: a conflicting replay after the Execution ended", (k) => k.submitOutcome(who, outcomeFor(id, next), submissionFor(driver, next.activationId)));
  call("submitInput: after the Execution ended", (k) => k.submitInput(who, { destination: id, requestKey: "after", kind: "update", payload: null }));
  call("dispatch: after the Execution ended", (k) => k.dispatch(who, id, { bound: 1 }));
  call("requestTakeover: after the Execution ended", (k) => k.requestTakeover(who, id, { activationId: next.activationId, writerEpoch: 1 }));
  call("inspect: the ended Execution", (k) => k.inspect(who, id));
  call("cancelExecution: after the Execution completed (reported, unchanged)", (k) => k.cancelExecution(canceller, id));

  // -- Waits, timers and cancellation (K1.3) --------------------------------------------------
  let reading = 0;
  const clock = { now: (): number => reading };
  const asked: unknown[] = [];
  const cancelling = { ...recordingDriver(), requestCancellation(request: unknown): undefined { asked.push(request); return undefined; } };
  const timed = step("new ExecutionCoordinator (a clock and a cancellation request)", () => new ExecutionCoordinator({ driver: cancelling, clock })) as ExecutionCoordinator;
  step("new ExecutionCoordinator (a clock on the host's own options prototype)", () => {
    const options = Object.create({ clock }) as { driver: ExecutionDriver };
    options.driver = recordingDriver();
    return new ExecutionCoordinator(options);
  });
  const timedCall = (label: string, work: (k: ExecutionCoordinator) => unknown) => step(label, () => work(timed), timed, canceller);
  const timedId = accepted(timedCall("createExecution: with an Execution deadline", (k) => k.createExecution(canceller, createRequest({ creationKey: "timed", executionDeadline: 100 } as never))) as ReturnType<ExecutionCoordinator["createExecution"]>).executionId;
  timedCall("createExecution: a changed Execution deadline", (k) => k.createExecution(canceller, createRequest({ creationKey: "timed", executionDeadline: 101 } as never)));
  const first = accepted(timedCall("dispatch: the first exchange", (k) => k.dispatch(canceller, timedId, { bound: 1 })) as ReturnType<ExecutionCoordinator["dispatch"]>);
  const awaitWith = (deadline: number) => ({ step: "await", wait: { subscriptions: [{ subscriptionClass: "s" }], deadline } });
  timedCall("submitOutcome: await with a deadline (WAITING)", (k) => k.submitOutcome(canceller, outcomeFor(timedId, first, { next: awaitWith(10) }), submissionFor(cancelling, first.activationId)));
  timedCall("pendingTimers", (k) => k.pendingTimers());
  timedCall("dispatch: refused while WAITING", (k) => k.dispatch(canceller, timedId, { bound: 1 }));
  timedCall("fireTimer: not due", (k) => k.fireTimer({ executionId: timedId, kind: "wait_deadline", generation: 1 }));
  reading = 10;
  timedCall("fireTimer: a key whose getter installs pollution while it is observed", (k) =>
    k.fireTimer({
      get executionId(): string {
        Object.defineProperty(Object.prototype, "generation", plain({ value: 9, configurable: true }));
        return "no-such-execution";
      },
      kind: "wait_deadline",
    } as never),
  );
  delete (Object.prototype as Record<string, unknown>).generation;
  timedCall("fireTimer: expired", (k) => k.fireTimer({ executionId: timedId, kind: "wait_deadline", generation: 1 }));
  timedCall("fireTimer: duplicate", (k) => k.fireTimer({ executionId: timedId, kind: "wait_deadline", generation: 1 }));
  const waitEnded = accepted(timedCall("dispatch: the wait-ended batch", (k) => k.dispatch(canceller, timedId, { bound: 2 })) as ReturnType<ExecutionCoordinator["dispatch"]>);
  timedCall("submitOutcome: await, nothing due (WAITING)", (k) => k.submitOutcome(canceller, outcomeFor(timedId, waitEnded, { next: awaitWith(50) }), submissionFor(cancelling, waitEnded.activationId)));
  timedCall("submitInput: an eligible input wakes the wait", (k) => k.submitInput(canceller, { destination: timedId, requestKey: "wake", kind: "update", payload: null, subscriptionClass: "s" }));
  const third = accepted(timedCall("dispatch: after the wake", (k) => k.dispatch(canceller, timedId, { bound: 2 })) as ReturnType<ExecutionCoordinator["dispatch"]>);
  timedCall("cancelExecution: accepted while RUNNING", (k) => k.cancelExecution(canceller, timedId));
  timedCall("cancelExecution: repeated", (k) => k.cancelExecution(canceller, timedId));
  timedCall("submitOutcome: losing to the cancellation", (k) => k.submitOutcome(canceller, outcomeFor(timedId, third), submissionFor(cancelling, third.activationId)));
  timedCall("submitOutcome: the losing proposal's exact retry", (k) => k.submitOutcome(canceller, outcomeFor(timedId, third), submissionFor(cancelling, third.activationId)));
  timedCall("redeliver: after cancellation", (k) => k.redeliver(canceller, timedId));
  timedCall("fireTimer: the Execution deadline of a cancelled Execution", (k) => k.fireTimer({ executionId: timedId, kind: "execution_deadline", generation: null }));
  const expiring = accepted(timed.createExecution(canceller, createRequest({ creationKey: "expiring", executionDeadline: 5 } as never))).executionId;
  timedCall("fireTimer: the Execution deadline expires", (k) => k.fireTimer({ executionId: expiring, kind: "execution_deadline", generation: null }));
  timedCall("inspect: the cancelled Execution", (k) => k.inspect(canceller, timedId));
  if (asked.length !== 2) throw new Error(`expected two cancellation requests, saw ${asked.length}`);

  // -- Capacity, failure and the delivery-report capability ------------------------------------
  const small = step("new ExecutionCoordinator (capacity 1, one Emission)", () => new ExecutionCoordinator({ driver: recordingDriver(), mailboxCapacity: 1, emissionsPerOutcome: 1 })) as ExecutionCoordinator;
  const smallId = accepted(small.createExecution(who, createRequest({ creationKey: "small" }))).executionId;
  step("submitInput: at capacity", () => small.submitInput(who, { destination: smallId, requestKey: "over", kind: "update", payload: null }), small, who);
  const delayed = delayedDriver();
  const later = step("new ExecutionCoordinator (delayed Driver)", () => new ExecutionCoordinator({ driver: delayed })) as ExecutionCoordinator;
  const laterId = accepted(later.createExecution(who, createRequest({ creationKey: "later" }))).executionId;
  const laterOpen = accepted(later.dispatch(who, laterId, { bound: 1 }));
  const settlement = delayed.settlements[0] as DeliverySettlement;
  step("settlement.failed: a reason that is not text", () => settlement.failed({ message: "object" }), later, who);
  step("settlement.delivered: after the failure (inert)", () => settlement.delivered(), later, who);
  accepted(later.redeliver(who, laterId));
  const second = delayed.settlements[1] as DeliverySettlement;
  step("settlement.failed: a text reason", () => second.failed("native submit lost"), later, who);
  step("inspect: delivery rows", () => later.inspect(who, laterId), later, who);
  step("submitOutcome: fail", () => later.submitOutcome(who, outcomeFor(laterId, laterOpen, { next: { step: "fail", error: { reason: "x" } } }), submissionFor(delayed, laterOpen.activationId)), later, who);

  // -- The value functions -----------------------------------------------------------------------
  // K1.1-correction-03: capture refuses every Proxy before observing it (owner decision-01 item 2), so
  // the Proxy entry below no longer drives capture's catch path; it now covers the Proxy refusal under
  // poison. The entry after it reaches the catch path in-process without a Proxy value: the global of a
  // `node:vm` context whose sandbox is a Proxy with a throwing `ownKeys` trap. The global is not itself a
  // Proxy; its key listings are answered by the sandbox through host interceptors, so capture's own key
  // listing throws. Re-prototyped to null, it passes the plain-prototype test and reaches that listing.
  // Built here, per run, never at load time.
  const unlistableContext = vm.createContext(proxy({}, { ownKeys: () => { throw new Error("no keys"); } }));
  const unlistable = vm.runInContext("globalThis", unlistableContext) as object;
  Object.setPrototypeOf(unlistable, null);
  const values: [string, unknown][] = [
    ["plain record", { a: 1, b: [true, null, "x"], c: { d: -0 } }],
    ["null-prototype record", Object.assign(Object.create(null) as object, { k: "v" })],
    ["lone surrogate", "\ud800"],
    ["non-finite number", Number.POSITIVE_INFINITY],
    ["undefined member", { a: undefined }],
    ["accessor member", { get a(): number { return 1; } }],
    ["too long", "x".repeat(70_000)],
    ["a Proxy whose descriptor trap throws", proxy({ a: 1 }, { getOwnPropertyDescriptor: () => { throw new Error("no"); } })],
    ["a null-prototype vm global whose sandbox key listing throws", unlistable],
  ];
  let catchPath: unknown;
  for (const [label, value] of values) {
    const canonical = step(`canonicalize: ${label}`, () => canonicalize(value));
    if (value === unlistable) catchPath = canonical;
    step(`boundaryValueIssues: ${label}`, () => boundaryValueIssues(value));
    step(`isBoundaryValue: ${label}`, () => isBoundaryValue(value));
  }
  const one = canonicalize({ a: 1, b: 2 });
  const two = canonicalize({ b: 2, a: 1 });
  if (one.ok && two.ok) step("sameLogicalValue", () => sameLogicalValue(one.value, two.value));
  return { trace, steps, catchPath };
}

describe("correction DEC-8: the catalog under poisoned prototypes behaves exactly as without them", () => {
  // A plain record, not a Map: the describe body stays free of intrinsic references (the load-time rule).
  const runs: { [mode in PoisonMode]?: { catalog: Catalog; poison: PoisonController } } = {};
  for (const mode of ["off", "count", "throw", "reenter"] as const) {
    test(`${mode}: no zone frame reaches a poisoned member; every window was live`, () => {
      const poison = createPoison({ mode, names: NAMES, zoneRoot: ZONE_ROOT, captureRoot: CAPTURE_ROOT });
      const catalog = runCatalog(poison);
      runs[mode] = { catalog, poison };
      assert.deepEqual(poison.zoneFirings, [], "no Kernel read reached Object.prototype or Function.prototype");
      assert.deepEqual(
        catalog.catchPath,
        {
          ok: false,
          issues: [{ path: "", code: "unstable_representation", message: "observing this value's structure threw (object), so it presents no readable content" }],
        },
        "the vm-global entry reached capture's catch path inside its window",
      );
      assert.ok(catalog.steps > 100, `the catalog made ${catalog.steps} boundary calls`);
      assert.equal(poison.counts.windows, catalog.steps, "every boundary call was its own outermost window");
      if (mode !== "off") {
        assert.equal(poison.counts.liveProbes, poison.counts.windows, "the poison was live in every window");
        assert.equal(poison.counts.reentries, 0);
      }
    });
  }
  test("every poisoned run returned exactly what the unpoisoned run returned", () => {
    const off = runs.off?.catalog.trace;
    assert.ok(off !== undefined && off.length > 100);
    for (const mode of ["count", "throw", "reenter"] as const) assert.deepEqual(runs[mode]?.catalog.trace, off, `${mode} results`);
  });
  test("the catalog poisons the complete name set, the descriptor fields included", () => {
    for (const field of DESCRIPTOR_FIELDS) assert.ok(NAMES.includes(field), field);
    assert.ok(NAMES.includes("resultingEpoch") && NAMES.includes("controlScopes") && NAMES.includes("isSafeToReplace"));
    assert.ok(NAMES.includes(Symbol.toPrimitive) && NAMES.includes(Symbol.iterator) && NAMES.includes("then"));
  });
});
