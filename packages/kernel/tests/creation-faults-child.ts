/**
 * Creation's two publications, each faulted in turn, run in their own process (COORD-REFACTOR-01 review 01,
 * CR1-R1-CREATION-01).
 *
 * Before the Kernel loads, `Reflect.apply` is replaced by a wrapper that throws once, when armed, at the
 * chosen `Map.prototype.set` whose value is the new Execution record: the first is the Execution-map
 * publication, the second the creation-key publication. Every zone module captures `Reflect.apply` at load,
 * so the zone's own `mapSet` goes through the wrapper. Each case records the call's error, `inspect` and
 * `visibleExecutions` for every Execution ID involved, then a creation retry with the same key, and, on a
 * fresh coordinator, a creation with a different key followed by the same-key retry. The process prints the
 * observations as one JSON document; the test pins them to B's outcome.
 *
 * Usage: node --experimental-strip-types packages/kernel/tests/creation-faults-child.ts
 */

const realApply = Reflect.apply;
const realMapSet = Map.prototype.set;
const hasOwn = (value: object, key: string): boolean => realApply(Object.prototype.hasOwnProperty, value, [key]) as boolean;
let armed: number | null = null;
let fired = 0;
Reflect.apply = function apply(target: Function, thisArgument: unknown, argumentsList: ArrayLike<unknown>): unknown {
  if (armed !== null && target === realMapSet) {
    const value = argumentsList[1];
    if (typeof value === "object" && value !== null && hasOwn(value, "creationReceipt") && hasOwn(value, "mailbox")) {
      armed -= 1;
      if (armed === 0) {
        armed = null;
        fired += 1;
        throw new Error("injected engine fault");
      }
    }
  }
  return realApply(target, thisArgument, argumentsList);
} as typeof Reflect.apply;

const harness = await import("./harness.ts");
const { ExecutionCoordinator } = await import("./binding-facade.ts");
const { caller, createRequest, recordingDriver } = harness;
type Kernel = InstanceType<typeof ExecutionCoordinator>;

const author = caller("app-a", "tenant-a");
const FIRST = "report-17";
const SECOND = "report-18";

/** Creates with `key`, the `nth` record publication armed to throw; reports what the call did. */
const create = (kernel: Kernel, key: string, nth: number | null): unknown => {
  const before = fired;
  armed = nth;
  try {
    const result = kernel.createExecution(author, createRequest({ creationKey: key }));
    return result.ok
      ? { ok: true, executionId: result.value.executionId, replayed: result.value.replayed, receipt: result.value.receipt, initialEventId: result.value.initialEventId }
      : { ok: false, classification: result.error.classification };
  } catch (error) {
    return { threw: error instanceof Error ? error.message : String(error), fired: fired - before };
  } finally {
    armed = null;
  }
};

/** `inspect` and listing for each ID, and whether each ID is inspectable exactly when it is listed. */
const observe = (kernel: Kernel, ids: readonly string[]): unknown => {
  const listed = [...kernel.visibleExecutions(author)];
  const executions = ids.map((executionId) => {
    const inspected = kernel.inspect(author, executionId);
    return {
      executionId,
      inspect: inspected.ok ? { ok: true, state: inspected.value.state, receipts: inspected.value.receipts.length, mailbox: inspected.value.mailbox.length } : { ok: false, classification: inspected.error.classification },
      listed: listed.filter((id) => id === executionId).length,
    };
  });
  return { listed, executions };
};

const idOf = (key: string): string => {
  const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
  const result = kernel.createExecution(author, createRequest({ creationKey: key }));
  if (!result.ok) throw new Error("control creation refused");
  return result.value.executionId;
};
const ids = [idOf(FIRST), idOf(SECOND)];

/** One publication faulted: the faulting call, then a same-key retry; and, separately, a different key first. */
function faultAt(nth: number) {
  const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
  const faulted = create(kernel, FIRST, nth);
  const afterFault = observe(kernel, ids);
  const retry = create(kernel, FIRST, null);
  const afterRetry = observe(kernel, ids);
  const replay = create(kernel, FIRST, null);

  const other = new ExecutionCoordinator({ driver: recordingDriver() });
  const otherFaulted = create(other, FIRST, nth);
  const different = create(other, SECOND, null);
  const afterDifferent = observe(other, ids);
  const sameAfterDifferent = create(other, FIRST, null);
  const afterBoth = observe(other, ids);
  return { faulted, afterFault, retry, afterRetry, replay, otherFaulted, different, afterDifferent, sameAfterDifferent, afterBoth };
}

console.log(JSON.stringify({ ids, executionMap: faultAt(1), creationKey: faultAt(2) }));
