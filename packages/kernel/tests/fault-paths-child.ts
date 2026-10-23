/**
 * Owner choice 01's three engine-fault paths, run in their own process (COORD-REFACTOR-01).
 *
 * Before the Kernel loads, `Object.freeze` is replaced by a wrapper that throws once, when armed, at the
 * freeze of one chosen value: the new Activation (dispatch), the new entry's facts (input), or a
 * settlement plan (`failed(reason)` and `delivered()`). Every zone module captures `Object.freeze` at load,
 * so the zone's own freezes go through the wrapper. Each path is run twice on fresh coordinators with the
 * same setup: once with the faulting call and once without it. The process prints both runs' observations
 * (the whole view, and the answers of the decisions that follow) as one JSON document; the test compares
 * them and pins the historical outcome beside the new one.
 *
 * Usage: node --experimental-strip-types packages/kernel/tests/fault-paths-child.ts
 */

const realFreeze = Object.freeze;
let trigger: ((value: unknown) => boolean) | null = null;
let fired = 0;
Object.freeze = function freeze<T>(value: T): Readonly<T> {
  if (trigger !== null && trigger(value)) {
    trigger = null;
    fired += 1;
    throw new Error("injected engine fault");
  }
  return realFreeze(value);
} as typeof Object.freeze;

const harness = await import("./harness.ts");
const { ExecutionCoordinator } = await import("./binding-facade.ts");
const { accepted, caller, createRequest, delayedDriver, recordingDriver, refused } = harness;
type Kernel = InstanceType<typeof ExecutionCoordinator>;

const author = caller("app-a", "tenant-a");
const has = (value: unknown, ...keys: string[]): boolean => typeof value === "object" && value !== null && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const kindIs = (value: unknown, kind: string): boolean => has(value, "kind") && (value as { kind: unknown }).kind === kind;

/** Runs `call` with the fault armed for the first frozen value `chosen` accepts; reports whether it threw that fault. */
const faulting = (chosen: (value: unknown) => boolean, call: () => unknown): { threw: boolean; fired: number } => {
  const before = fired;
  trigger = chosen;
  let threw = false;
  try {
    call();
  } catch (error) {
    threw = error instanceof Error && error.message === "injected engine fault";
  } finally {
    trigger = null;
  }
  return { threw, fired: fired - before };
};

const view = (kernel: Kernel, executionId: string): unknown => JSON.parse(JSON.stringify(accepted(kernel.inspect(author, executionId))));

// -- Path 1: dispatch and submitInput consume nothing when their build faults ----------------------

function dispatchRun(withFault: boolean) {
  const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
  const executionId = accepted(kernel.createExecution(author, createRequest())).executionId;
  const fault = withFault ? faulting((value) => has(value, "writerEpoch", "events", "executionView"), () => kernel.dispatch(author, executionId, { bound: 1 })) : null;
  const afterFault = view(kernel, executionId);
  const next = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
  const input = accepted(kernel.submitInput(author, { destination: executionId, requestKey: "after", kind: "application.note", payload: { n: 1 } }));
  const refusal = refused(kernel.submitInput(author, { destination: executionId, requestKey: "after", kind: "application.note", payload: { n: 2 } }));
  return { fault, afterFault, next: { activationId: next.activationId, receipt: next.receipt, batch: next.batch }, input: { receipt: input.receipt, eventId: input.eventId }, refusalPosition: refusal.position, final: view(kernel, executionId) };
}

function inputRun(withFault: boolean) {
  const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
  const executionId = accepted(kernel.createExecution(author, createRequest())).executionId;
  const fault = withFault ? faulting((value) => has(value, "contentIdentity", "acceptancePosition", "receipt", "inputId"), () => kernel.submitInput(author, { destination: executionId, requestKey: "faulted", kind: "application.note", payload: { n: 0 } })) : null;
  const afterFault = view(kernel, executionId);
  const input = accepted(kernel.submitInput(author, { destination: executionId, requestKey: "after", kind: "application.note", payload: { n: 1 } }));
  const next = accepted(kernel.dispatch(author, executionId, { bound: 4 }));
  return { fault, afterFault, input: { receipt: input.receipt, acceptancePosition: input.acceptancePosition }, next: { activationId: next.activationId, receipt: next.receipt }, final: view(kernel, executionId) };
}

// -- Paths 2 and 3: a report whose plan cannot be built changes nothing -----------------------------

function reportRun(withFault: boolean, report: "failed" | "delivered") {
  const driver = delayedDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const executionId = accepted(kernel.createExecution(author, createRequest())).executionId;
  accepted(kernel.dispatch(author, executionId, { bound: 1 }));
  const settlement = driver.settlements[0]!;
  const fault = withFault ? faulting((value) => kindIs(value, "settlement"), () => (report === "failed" ? settlement.failed("native submit refused") : settlement.delivered())) : null;
  const afterFault = view(kernel, executionId);
  // The next decision: a later report on the same attempt, then a redelivery.
  settlement.delivered();
  const afterReport = view(kernel, executionId);
  const resent = accepted(kernel.redeliver(author, executionId));
  return { fault, afterFault, afterReport, resent: { activationId: resent.activationId, writerEpoch: resent.writerEpoch, receipt: resent.receipt }, final: view(kernel, executionId) };
}

console.log(
  JSON.stringify({
    dispatch: { faulted: dispatchRun(true), control: dispatchRun(false) },
    input: { faulted: inputRun(true), control: inputRun(false) },
    failed: { faulted: reportRun(true, "failed"), control: reportRun(false, "failed") },
    delivered: { faulted: reportRun(true, "delivered"), control: reportRun(false, "delivered") },
  }),
);
