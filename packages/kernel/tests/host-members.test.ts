/**
 * Optional members of trusted host objects are never answered by an ambient built-in prototype.
 *
 * Implementer-found in the K1.2-correction-01 round-6 reconstruction, same mechanism as
 * K12C1-R9-HISTORY-01 (amendment 02): the Kernel read an optional member of an object that may not
 * own it, so `Object.prototype` answered for the host. The authenticated caller, the coordinator
 * options and the Driver are trusted host inputs; what the host put on them, including members a
 * class supplies, is still honored. Only a member the host left out is now absent rather than
 * whatever ambient state says (correction DEC-8).
 *
 * - `isSafeToReplace` (K1.2-DEC-15): a Driver without it establishes nothing, even when the takeover
 *   request's own getter installs an inherited one during observation.
 * - `controlScopes` (K1.2-DEC-14): residue pollution does not give a visibility-only caller control.
 * - `mailboxCapacity`, `emissionsPerOutcome`: residue pollution declares no limit.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ExecutionCoordinator,
  type Activation,
  type AuthenticatedCaller,
  type DeliverySettlement,
  type ExecutionDriver,
  type ExecutionView,
  type SubmissionGrant,
} from "../src/index.ts";
import { accepted, caller, createRequest, observer, outcomeFor, refused } from "./harness.ts";

const author = caller("host-members", "tenant-a");
const AVAILABLE = {
  definitionRevisions: ["weekly-report@3"],
  runtimeContractRevisions: ["runtime-contract@1"],
  progressCodecs: ["inline-json@1"],
};

/** Installs `value` as an inherited member of `holder` and returns the handle that removes it. */
function inherit(holder: object, key: string, descriptor: PropertyDescriptor): () => void {
  const saved = Object.getOwnPropertyDescriptor(holder, key);
  const installer = Object.create(null) as PropertyDescriptor;
  installer.configurable = true;
  if ("value" in descriptor) installer.value = descriptor.value;
  if (descriptor.get !== undefined) installer.get = descriptor.get;
  Object.defineProperty(holder, key, installer);
  return () => {
    if (saved === undefined) delete (holder as Record<string, unknown>)[key];
    else Object.defineProperty(holder, key, saved);
  };
}

/** A Driver that records deliveries and grants and declares nothing about replacement safety. */
function bareDriver(): ExecutionDriver & { readonly deliveries: Activation[]; readonly submissions: SubmissionGrant[] } {
  const deliveries: Activation[] = [];
  const submissions: SubmissionGrant[] = [];
  return {
    driverId: "fake-bare",
    deliveries,
    submissions,
    deliver(activation: Activation, settlement: DeliverySettlement, submission: SubmissionGrant): undefined {
      Object.defineProperty(deliveries, deliveries.length, { value: activation, writable: true, enumerable: true, configurable: true });
      Object.defineProperty(submissions, submissions.length, { value: submission, writable: true, enumerable: true, configurable: true });
      settlement.delivered();
      return undefined;
    },
  };
}

function opened(driver: ExecutionDriver, who: AuthenticatedCaller = author, options: { mailboxCapacity?: number } = {}) {
  const kernel = new ExecutionCoordinator({ driver, ...options });
  const { executionId } = accepted(kernel.createExecution(who, createRequest()));
  const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  return { kernel, executionId, open, view: (): ExecutionView => accepted(kernel.inspect(who, executionId)) };
}

describe("correction DEC-8 isSafeToReplace comes from the Driver, never from Object.prototype", () => {
  test("a Driver without the method is refused even when the request's getter installs an inherited one", () => {
    const driver = bareDriver();
    const { kernel, executionId, open, view } = opened(driver);
    const before = view();
    let calls = 0;
    let remove = (): void => {};
    const request = {
      get activationId(): string {
        remove = inherit(Object.prototype, "isSafeToReplace", {
          value: () => {
            calls += 1;
            return true;
          },
        });
        return open.activationId;
      },
      writerEpoch: 1,
    };
    let refusal;
    try {
      refusal = refused(kernel.requestTakeover(author, executionId, request));
    } finally {
      remove();
    }
    assert.equal(refusal.classification, "unsafe_replacement", "absent safety is not established by ambient state");
    assert.equal(calls, 0, "the inherited method never ran");
    const after = view();
    assert.equal(after.activation?.writerEpoch, 1);
    assert.deepEqual(after.receipts, before.receipts, "no takeover receipt");
    assert.deepEqual(after.activation?.deliveries, before.activation?.deliveries, "no new delivery");
    assert.equal(driver.deliveries.length, 1);
  });

  test("residue pollution left before the call establishes nothing either", () => {
    const driver = bareDriver();
    const { kernel, executionId, open } = opened(driver);
    const remove = inherit(Object.prototype, "isSafeToReplace", { value: () => true });
    let refusal;
    try {
      refusal = refused(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    } finally {
      remove();
    }
    assert.equal(refusal.classification, "unsafe_replacement");
  });

  test("a function-object Driver is not answered by Function.prototype", () => {
    const base = bareDriver();
    const driver = Object.assign(function driverFunction(): void {}, {
      driverId: base.driverId,
      deliver: base.deliver,
    }) as unknown as ExecutionDriver;
    const { kernel, executionId, open } = opened(driver);
    const remove = inherit(Function.prototype, "isSafeToReplace", { value: () => true });
    let refusal;
    try {
      refusal = refused(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    } finally {
      remove();
    }
    assert.equal(refusal.classification, "unsafe_replacement");
  });

  test("a class-based Driver's own prototype method is honored (trusted host structure)", () => {
    class ClassDriver implements ExecutionDriver {
      readonly driverId = "fake-class";
      readonly seen: Activation[] = [];
      deliver(activation: Activation, settlement: DeliverySettlement): undefined {
        Object.defineProperty(this.seen, this.seen.length, { value: activation, writable: true, enumerable: true, configurable: true });
        settlement.delivered();
        return undefined;
      }
      isSafeToReplace(activation: Activation): boolean {
        return activation.writerEpoch === 1;
      }
    }
    const driver = new ClassDriver();
    const { kernel, executionId, open } = opened(driver);
    const taken = accepted(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    assert.equal(taken.writerEpoch, 2);
    assert.equal(driver.seen.length, 2, "the new attempt was delivered");
  });

  test("a method inherited from the host's own prototype object is honored", () => {
    const shared = { isSafeToReplace: (): boolean => true };
    const driver = Object.assign(Object.create(shared) as object, bareDriver()) as ExecutionDriver;
    const { kernel, executionId, open } = opened(driver);
    assert.equal(accepted(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 })).writerEpoch, 2);
  });

  test("a class-based Driver without the method is not answered by Object.prototype", () => {
    class NoSafety implements ExecutionDriver {
      readonly driverId = "fake-class-no-safety";
      deliver(_activation: Activation, settlement: DeliverySettlement): undefined {
        settlement.delivered();
        return undefined;
      }
    }
    const { kernel, executionId, open } = opened(new NoSafety());
    const remove = inherit(Object.prototype, "isSafeToReplace", { value: () => true });
    let refusal;
    try {
      refusal = refused(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    } finally {
      remove();
    }
    assert.equal(refusal.classification, "unsafe_replacement");
  });
});

describe("correction DEC-8 controlScopes comes from the caller, never from Object.prototype", () => {
  const controls = [
    ["takeover", (kernel: ExecutionCoordinator, who: AuthenticatedCaller, executionId: string, activationId: string) =>
      kernel.requestTakeover(who, executionId, { activationId, writerEpoch: 1 })],
    ["recovery declaration", (kernel: ExecutionCoordinator, who: AuthenticatedCaller, executionId: string, activationId: string) =>
      kernel.recoverExecution(who, executionId, { activationId, available: { ...AVAILABLE, progressCodecs: [] } })],
    ["protocol-failure report", (kernel: ExecutionCoordinator, who: AuthenticatedCaller, executionId: string, activationId: string) =>
      kernel.reportProtocolFailure(who, executionId, { activationId, writerEpoch: 1, diagnostic: "residue" })],
  ] as const;
  for (const [name, control] of controls) {
    test(`residue Object.prototype.controlScopes gives a visibility-only caller no ${name}`, () => {
      const driver = bareDriver();
      (driver as { isSafeToReplace?: () => boolean }).isSafeToReplace = () => true;
      const { kernel, executionId, open, view } = opened(driver);
      const before = view();
      let reads = 0;
      const remove = inherit(Object.prototype, "controlScopes", {
        get: () => {
          reads += 1;
          return ["tenant-a"];
        },
      });
      let refusal;
      try {
        refusal = refused(control(kernel, observer("visible-only"), executionId, open.activationId));
      } finally {
        remove();
      }
      assert.equal(refusal.classification, "unauthorized_control");
      assert.equal(reads, 0, "the inherited accessor was never consulted");
      const after = view();
      assert.deepEqual(after.recoveryHolds, before.recoveryHolds, "no hold changed");
      assert.deepEqual(after.recoveryHistory, before.recoveryHistory, "no history appended");
      assert.deepEqual(after.receipts, before.receipts, "no receipt");
      assert.equal(after.activation?.writerEpoch, 1);
    });
  }

  test("controlScopes inherited from the host's own prototype object is still honored", () => {
    const hostPrototype = { controlScopes: ["tenant-a"] };
    const who = Object.assign(Object.create(hostPrototype) as object, { namespace: "host-members", scopes: ["tenant-a"] }) as AuthenticatedCaller;
    const { kernel, executionId, open } = opened(bareDriver(), who);
    const answer = accepted(kernel.reportProtocolFailure(who, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "own chain" }));
    assert.equal(answer.changed, true);
  });
});

describe("correction DEC-8 coordinator limits come from the options, never from Object.prototype", () => {
  test("residue mailboxCapacity and emissionsPerOutcome at construction declare nothing", () => {
    const removeCapacity = inherit(Object.prototype, "mailboxCapacity", { value: 1 });
    const removeEmissions = inherit(Object.prototype, "emissionsPerOutcome", { value: 1 });
    let kernel: ExecutionCoordinator;
    const driver = bareDriver();
    try {
      kernel = new ExecutionCoordinator({ driver });
    } finally {
      removeCapacity();
      removeEmissions();
    }
    const { executionId } = accepted(kernel.createExecution(author, createRequest()));
    // Default capacity 1,024: a second unacknowledged Event is queued, not refused.
    accepted(kernel.submitInput(author, { destination: executionId, requestKey: "second", kind: "k", payload: 1 }));
    const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    // Default Emission limit 256: two Emissions are accepted.
    const outcome = accepted(
      kernel.submitOutcome(
        author,
        outcomeFor(executionId, open, { emissions: [{ emissionKey: "a", value: 1 }, { emissionKey: "b", value: 2 }] }),
        driver.submissions[0] as SubmissionGrant,
      ),
    );
    assert.equal(outcome.emissionIds.length, 2);
  });

  test("a limit the host supplies through its own options prototype is honored", () => {
    class Options {
      readonly driver: ExecutionDriver;
      constructor(driver: ExecutionDriver) {
        this.driver = driver;
      }
      get mailboxCapacity(): number {
        return 1;
      }
    }
    const kernel = new ExecutionCoordinator(new Options(bareDriver()));
    const { executionId } = accepted(kernel.createExecution(author, createRequest()));
    const second = refused(kernel.submitInput(author, { destination: executionId, requestKey: "second", kind: "k", payload: 1 }));
    assert.equal(second.classification, "capacity_exhausted", "the class getter is the host's declared capacity");
  });
});
