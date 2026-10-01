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
 * Every public boundary is called at least once, with accepted, idempotent and refused exits: the
 * constructor, the eight coordinator methods, the delivery-report capability, the unsupported
 * surface and the value functions. Each call is a poison window. The catalog runs four times —
 * unpoisoned, then counting, throwing and re-entering — and must produce identical results with no
 * accessor reached from a zone frame and the poison demonstrably live in every window.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ExecutionCoordinator,
  boundaryValueIssues,
  canonicalize,
  isBoundaryValue,
  sameLogicalValue,
  type DeliverySettlement,
  type ExecutionDriver,
} from "../src/index.ts";
import { accepted, caller, createRequest, delayedDriver, observer, outcomeFor, recordingDriver, submissionFor, unsafeDriver } from "./harness.ts";
import { createPoison, digest, type PoisonController, type PoisonMode } from "./sweep/poison.ts";
import { DESCRIPTOR_FIELDS, zoneMemberNames } from "./sweep/zone-names.ts";

const ZONE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const NAMES = zoneMemberNames(ZONE_ROOT);
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
  call("submitInput: malformed payload", (k) => k.submitInput(who, { destination: id, requestKey: "bad", kind: "update", payload: Number.NaN as never }));
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
  call("cancelExecution", (k) => k.cancelExecution());

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
  call("submitOutcome: malformed progress", (k) => k.submitOutcome(who, outcome({ progress: Number.NaN }), grant));
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
  const values: [string, unknown][] = [
    ["plain record", { a: 1, b: [true, null, "x"], c: { d: -0 } }],
    ["null-prototype record", Object.assign(Object.create(null) as object, { k: "v" })],
    ["lone surrogate", "\ud800"],
    ["non-finite number", Number.POSITIVE_INFINITY],
    ["undefined member", { a: undefined }],
    ["accessor member", { get a(): number { return 1; } }],
    ["too long", "x".repeat(70_000)],
    ["a Proxy whose descriptor trap throws", proxy({ a: 1 }, { getOwnPropertyDescriptor: () => { throw new Error("no"); } })],
  ];
  for (const [label, value] of values) {
    step(`canonicalize: ${label}`, () => canonicalize(value));
    step(`boundaryValueIssues: ${label}`, () => boundaryValueIssues(value));
    step(`isBoundaryValue: ${label}`, () => isBoundaryValue(value));
  }
  const one = canonicalize({ a: 1, b: 2 });
  const two = canonicalize({ b: 2, a: 1 });
  if (one.ok && two.ok) step("sameLogicalValue", () => sameLogicalValue(one.value, two.value));
  return { trace, steps };
}

describe("correction DEC-8: the catalog under poisoned prototypes behaves exactly as without them", () => {
  const runs = new Map<PoisonMode, { catalog: Catalog; poison: PoisonController }>();
  for (const mode of ["off", "count", "throw", "reenter"] as const) {
    test(`${mode}: no zone frame reaches a poisoned member; every window was live`, () => {
      const poison = createPoison({ mode, names: NAMES, zoneRoot: ZONE_ROOT });
      const catalog = runCatalog(poison);
      runs.set(mode, { catalog, poison });
      assert.deepEqual(poison.zoneFirings, [], "no Kernel read reached Object.prototype or Function.prototype");
      assert.ok(catalog.steps > 100, `the catalog made ${catalog.steps} boundary calls`);
      assert.equal(poison.counts.windows, catalog.steps, "every boundary call was its own outermost window");
      if (mode !== "off") {
        assert.equal(poison.counts.liveProbes, poison.counts.windows, "the poison was live in every window");
        assert.equal(poison.counts.reentries, 0);
      }
    });
  }
  test("every poisoned run returned exactly what the unpoisoned run returned", () => {
    const off = runs.get("off")?.catalog.trace;
    assert.ok(off !== undefined && off.length > 100);
    for (const mode of ["count", "throw", "reenter"] as const) assert.deepEqual(runs.get(mode)?.catalog.trace, off, `${mode} results`);
  });
  test("the catalog poisons the complete name set, the descriptor fields included", () => {
    for (const field of DESCRIPTOR_FIELDS) assert.ok(NAMES.includes(field), field);
    assert.ok(NAMES.includes("resultingEpoch") && NAMES.includes("controlScopes") && NAMES.includes("isSafeToReplace"));
    assert.ok(NAMES.includes(Symbol.toPrimitive) && NAMES.includes(Symbol.iterator) && NAMES.includes("then"));
  });
});
