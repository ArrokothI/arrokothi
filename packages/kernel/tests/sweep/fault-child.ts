/**
 * Fault-injection sweep for correction DEC-9, run in its own process (contract revision 10).
 *
 * DEC-9: `recoverExecution`, `reportProtocolFailure` and `requestTakeover` build every record and
 * answer their decision retains or returns before they change anything. The sweep checks the runtime
 * consequence on its scenarios: an exception at any intercepted operation of such a call leaves a
 * complete decision the contract permits. It checks Outcome acceptance (DEC-10) the same way.
 *
 * ## Mechanism
 *
 * Before the Kernel is imported, every built-in *method* the zone captures at load time is replaced
 * by a counting wrapper, so the zone's own load-time references are the wrappers. The list is derived
 * from the zone sources: every top-level `const` whose initializer is a member chain rooted at a
 * global (`Object.freeze`, `Map.prototype.set`, `String.prototype.charCodeAt`, …) and that resolves
 * to a function with no `prototype` (a method, not a constructor), plus the Array iterator's `next`,
 * which `values.ts` captures from an iterator rather than through a chain. The serializer window
 * reinstalls those same references for the `canonicalize` dependency, so its calls are counted too.
 *
 * For each scenario (`fault-scenarios.ts`) the sweep runs the target call once with no fault to count
 * its operations `N` (the reference run), then `N` more times on a fresh coordinator, throwing at
 * operation `k` for `k = 1..N`, and finally once more with `k = N + 1`, when the call completes. A
 * thrown fault records its own zone stack, so the oracle can locate it. After each run the sweep
 * observes the Execution: the whole inspection view, the position the next refusal receives, the
 * position the next accepted input receives (or its refusal once the Execution is terminal), and
 * what the setup attempt's grant can still do.
 *
 * In the five safety-callback scenarios the Driver's `isSafeToReplace` makes a nested decision. The
 * sweep suspends injection while it runs, so the swept operations are the takeover's own: a fault
 * before the callback is judged against the no-call state, and a fault after it against the state
 * the callback's decision leaves.
 *
 * ## Oracle and scope
 *
 * `fault-oracle.ts` judges each run (the permitted complete decisions and the three located
 * exceptions) and the reference decision itself. The scope is the scenario list in
 * `fault-scenarios.ts`. With no `--scenarios` filter the sweep also builds the exit inventory: V8
 * block coverage of each reference run (the safety callback's own calls excluded) shows which
 * `return` of the swept methods it executed, and each exit `fault-oracle.ts` finds in
 * `coordinator.ts` must be taken by some scenario, each scenario by its declared exit.
 *
 * Faults are injected only at intercepted operations. Allocation, property access and string building
 * are engine operations the sweep cannot interrupt, and an engine fault there is outside this
 * in-memory packet's claim, as is a change invisible at the boundary.
 *
 * Usage: node --experimental-strip-types packages/kernel/tests/sweep/fault-child.ts [--scenarios a|b] [--summary] [--examples] [--inventory-only]
 * - `--scenarios` keeps scenarios whose name contains one of the `|`-separated parts, or equals a
 *   part written `=name` (no inventory).
 * - `--summary` prints one line per scenario instead of the JSON document.
 * - `--examples` adds, for each scenario, its context and the first run of every decision class, for
 *   the oracle's negative controls (`fault-oracle.test.ts`).
 * - `--inventory-only` runs only the reference calls and the exit inventory.
 * Exit 0 when nothing is violated.
 */

import { readFileSync } from "node:fs";
import { Session } from "node:inspector";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import ts from "typescript";
import { checkContext, classify, coverageExecuted, exitInventory, outcomeLadder, sourceModel, type Attempt, type Context, type Fault, type Frame, type Inventory, type Observation, type Returned } from "./fault-oracle.ts";

const SWEEP_ROOT = dirname(fileURLToPath(import.meta.url));
const ZONE_ROOT = resolve(SWEEP_ROOT, "../../src");
const COORDINATOR = resolve(ZONE_ROOT, "coordinator.ts");
const HARNESS = pathToFileURL(resolve(SWEEP_ROOT, "../harness.ts")).href;
const INDEX = pathToFileURL(resolve(ZONE_ROOT, "index.ts")).href;
const SCENARIO_MODULE = pathToFileURL(resolve(SWEEP_ROOT, "fault-scenarios.ts")).href;

const selected = (() => {
  const index = process.argv.indexOf("--scenarios");
  return index === -1 ? undefined : (process.argv[index + 1] ?? "").split("|");
})();
const inventoryOnly = process.argv.includes("--inventory-only");
const withExamples = process.argv.includes("--examples");

// -- Coverage, started before the Kernel is compiled -------------------------------------------

const session = new Session();
session.connect();
const post = <T>(method: string, params: object = {}): T => {
  let settled = false;
  let failure: unknown = null;
  let result: unknown;
  session.post(method, params, (error, value) => {
    settled = true;
    failure = error;
    result = value;
  });
  if (!settled) throw new Error(`inspector call ${method} did not complete synchronously`);
  if (failure !== null) throw failure;
  return result as T;
};
interface CoverageRange {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly count: number;
}
let coverageOn = true;
post("Profiler.enable");
post("Profiler.startPreciseCoverage", { callCount: true, detailed: true });
const COORDINATOR_URL = pathToFileURL(COORDINATOR).href;
const takeCoverage = (): CoverageRange[] => {
  const taken = post<{ result: { url: string; functions: { ranges: CoverageRange[] }[] }[] }>("Profiler.takePreciseCoverage");
  return taken.result.filter((script) => script.url === COORDINATOR_URL).flatMap((script) => script.functions.flatMap((fn) => fn.ranges));
};

// -- Interception -------------------------------------------------------------

const originalApply = Reflect.apply;
const originalDefineProperty = Object.defineProperty;
const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const originalCaptureStackTrace = Error.captureStackTrace;
const originalHasOwn = Object.prototype.hasOwnProperty;

/** Raised at the targeted operation. */
class InjectedFault extends Error {
  readonly operation: number;
  readonly label: string;
  constructor(operation: number, label: string) {
    super(`injected fault at operation ${operation} (${label})`);
    this.operation = operation;
    this.label = label;
  }
}

let armed = false;
let counted = 0;
let target = 0;
let fired = false;
let fault: Fault | null = null;
let siteLog: { label: string; site: string }[] | undefined;
let callbackRan = false;
let callbackAt: number | null = null;
let armedBeforeCallback = false;
let coverageSegments: CoverageRange[][] | null = null;

/** The zone frames above the current operation, innermost first. Must run unarmed. */
const zoneStack = (): Frame[] => {
  const holder: { stack?: unknown } = {};
  const prepare = (Error as unknown as { prepareStackTrace?: unknown }).prepareStackTrace;
  const limit = Error.stackTraceLimit;
  (Error as unknown as { prepareStackTrace?: unknown }).prepareStackTrace = (_e: unknown, sites: NodeJS.CallSite[]) => sites;
  Error.stackTraceLimit = 80;
  try {
    originalCaptureStackTrace(holder);
    const frames: Frame[] = [];
    for (const site of holder.stack as NodeJS.CallSite[]) {
      const file = site.getFileName();
      if (typeof file === "string" && file.includes("/packages/kernel/src/")) {
        frames.push({ file: file.slice(file.indexOf("/packages/kernel/src/") + 21), line: site.getLineNumber() ?? 0, fn: site.getFunctionName() ?? "<anonymous>" });
      }
    }
    return frames;
  } finally {
    (Error as unknown as { prepareStackTrace?: unknown }).prepareStackTrace = prepare;
    Error.stackTraceLimit = limit;
  }
};
const siteOf = (stack: readonly Frame[]): string => {
  const top = stack[0];
  return top === undefined ? "outside the zone" : `${top.file}:${top.line} ${top.fn}`;
};

const tick = (label: string): void => {
  if (!armed) return;
  counted += 1;
  if (siteLog !== undefined) {
    armed = false;
    try {
      siteLog.push({ label, site: siteOf(zoneStack()) });
    } finally {
      armed = true;
    }
  }
  if (counted === target) {
    armed = false;
    fired = true;
    fault = { operation: counted, label, stack: zoneStack() };
    throw new InjectedFault(counted, label);
  }
};

/** The top-level member chains the zone captures at load, as `[holder expression, key]` spellings. */
function zoneCaptures(): { spelling: string; holder: object; key: PropertyKey; value: unknown }[] {
  const found: { spelling: string; holder: object; key: PropertyKey; value: unknown }[] = [];
  const evaluate = (expression: ts.Expression): { holder: object; key: PropertyKey; value: unknown } | undefined => {
    if (ts.isIdentifier(expression)) {
      if (!(expression.text in globalThis)) return undefined;
      return { holder: globalThis, key: expression.text, value: (globalThis as Record<string, unknown>)[expression.text] };
    }
    let key: PropertyKey | undefined;
    let base: ts.Expression;
    if (ts.isPropertyAccessExpression(expression)) {
      key = expression.name.text;
      base = expression.expression;
    } else if (ts.isElementAccessExpression(expression)) {
      const argument = expression.argumentExpression;
      if (ts.isStringLiteral(argument)) key = argument.text;
      else if (ts.isPropertyAccessExpression(argument) && ts.isIdentifier(argument.expression) && argument.expression.text === "Symbol") {
        key = (Symbol as unknown as Record<string, symbol>)[argument.name.text];
      }
      base = expression.expression;
    } else return undefined;
    if (key === undefined) return undefined;
    const holder = evaluate(base);
    if (holder === undefined || (typeof holder.value !== "object" && typeof holder.value !== "function") || holder.value === null) return undefined;
    return { holder: holder.value as object, key, value: (holder.value as Record<PropertyKey, unknown>)[key] };
  };
  for (const name of ts.sys.readDirectory(ZONE_ROOT, [".ts"], undefined, undefined, 1).sort()) {
    const source = ts.createSourceFile(name, readFileSync(name, "utf8"), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        const initializer = declaration.initializer;
        if (initializer === undefined) continue;
        const resolved = evaluate(initializer);
        if (resolved !== undefined) found.push({ spelling: initializer.getText(), ...resolved });
      }
    }
  }
  return found;
}

/** Installs a counting wrapper over `holder[key]`, keeping its attributes. */
const wrapMethod = (holder: object, key: PropertyKey, label: string): boolean => {
  const descriptor = originalGetOwnPropertyDescriptor(holder, key);
  if (descriptor === undefined || !originalApply(originalHasOwn, descriptor, ["value"])) return false;
  const method = descriptor.value as (...args: unknown[]) => unknown;
  const wrapper = function (this: unknown, ...args: unknown[]): unknown {
    tick(label);
    return originalApply(method, this, args);
  };
  originalDefineProperty(holder, key, { ...descriptor, value: wrapper });
  return true;
};

const intercepted: string[] = [];
const notIntercepted: string[] = [];
const wrappedValues = new Set<unknown>();
for (const capture of zoneCaptures()) {
  // A member of a built-in holder (`Object.freeze`, `Buffer.byteLength`) is a method; a bare global
  // is one only if it is not a constructor (`isNaN`, not `Map`). `Function.prototype` is callable but
  // is a holder the zone compares against, never a method it calls.
  const member = capture.spelling.includes(".") || capture.spelling.includes("[");
  const isMethod = typeof capture.value === "function" && capture.value !== Function.prototype && (member || !Object.hasOwn(capture.value, "prototype"));
  if (!isMethod) {
    notIntercepted.push(capture.spelling);
    continue;
  }
  if (wrappedValues.has(capture.value)) continue;
  wrappedValues.add(capture.value);
  if (wrapMethod(capture.holder, capture.key, capture.spelling)) intercepted.push(capture.spelling);
}
// `values.ts` captures the Array iterator's `next` from an iterator object, not through a chain.
const arrayIteratorPrototype = Object.getPrototypeOf([][Symbol.iterator]()) as object;
if (wrapMethod(arrayIteratorPrototype, "next", "ArrayIteratorPrototype.next")) intercepted.push("ArrayIteratorPrototype.next");

// -- The Kernel, imported through the wrappers --------------------------------

const kernelModule = (await import(INDEX)) as typeof import("../../src/index.ts");
const harness = (await import(HARNESS)) as typeof import("../harness.ts");
const { faultKit } = (await import(SCENARIO_MODULE)) as typeof import("./fault-scenarios.ts");
type Scenario = import("./fault-scenarios.ts").Scenario;

const kit = faultKit(kernelModule, harness, {
  // The safety callback is Driver code: no fault lands in it, and its nested calls are not the
  // scenario's exits.
  enterCallback(): void {
    callbackRan = true;
    if (callbackAt === null) callbackAt = counted;
    armedBeforeCallback = armed;
    armed = false;
    if (coverageSegments !== null) coverageSegments.push(takeCoverage());
  },
  exitCallback(): void {
    if (coverageSegments !== null) takeCoverage();
    armed = armedBeforeCallback;
  },
});
const model = sourceModel(COORDINATOR);
const unnamedRefusal = kit.unnamedRefusal();
const deliveryFailure = kit.deliveryFailure();

// -- Runs --------------------------------------------------------------------

type Outcome = { kind: "threw"; error: unknown } | { kind: "returned"; result: { ok: boolean; value?: unknown; error?: unknown } };

const normalized = (outcome: Outcome): Returned => {
  if (outcome.kind === "threw") {
    return outcome.error instanceof InjectedFault ? { kind: "threw", operation: outcome.error.operation } : { kind: "threw", operation: null, error: String(outcome.error) };
  }
  const result = outcome.result;
  return result.ok ? { kind: "ok", value: result.value } : { kind: "err", refusal: result.error as import("../../src/index.ts").RefusalRecord };
};

interface Run {
  readonly attempt: Attempt;
  readonly callbackAt: number | null;
  readonly coverage: CoverageRange[][] | null;
}

const run = (scenario: Scenario, at: number, sites?: { label: string; site: string }[], measure = false): Run => {
  const env = kit.fresh(scenario);
  const setupGrant = kit.setupGrantOf(env);
  const invoke = scenario.call(env);
  let outcome: Outcome;
  counted = 0;
  target = at;
  fired = false;
  fault = null;
  callbackRan = false;
  callbackAt = null;
  siteLog = sites;
  coverageSegments = measure && coverageOn ? [] : null;
  if (coverageSegments !== null) takeCoverage();
  armed = true;
  try {
    outcome = { kind: "returned", result: invoke() };
  } catch (error) {
    outcome = { kind: "threw", error };
  } finally {
    armed = false;
    siteLog = undefined;
  }
  const segments = coverageSegments;
  if (segments !== null) segments.push(takeCoverage());
  coverageSegments = null;
  const observation: Observation = { returned: normalized(outcome), state: kit.observe(env, setupGrant) };
  return { attempt: { k: at, fired, counted, fault, callbackRan, observation }, callbackAt, coverage: segments };
};

interface Prepared {
  readonly scenario: Scenario;
  readonly context: Context;
  readonly sites: { label: string; site: string }[];
  readonly executed: (offset: number) => boolean;
  readonly referenceViolations: string[];
}

const prepare = (scenario: Scenario): Prepared => {
  const baseline = kit.fresh(scenario);
  const s0 = kit.observe(baseline, kit.setupGrantOf(baseline));
  const sites: { label: string; site: string }[] = [];
  const reference = run(scenario, Number.POSITIVE_INFINITY, sites, true);
  const alternate = scenario.alternate === undefined
    ? null
    : (() => {
        const env = kit.fresh(scenario);
        const setupGrant = kit.setupGrantOf(env);
        const result = (scenario.alternate as NonNullable<Scenario["alternate"]>)(env)();
        return { returned: normalized({ kind: "returned", result }), state: kit.observe(env, setupGrant) };
      })();
  const context: Context = {
    name: scenario.name,
    control: scenario.control,
    expect: scenario.expect,
    executionId: baseline.executionId,
    n: reference.attempt.counted,
    labels: sites.map(({ label }) => label),
    s0,
    reference: reference.attempt.observation,
    alternate,
    callback: scenario.callback === undefined ? null : { state: kit.callbackBaseline(scenario), at: reference.callbackAt ?? -1 },
    setupAnswer: baseline.setupAnswer,
    unnamedRefusal,
    deliveryFailure,
  };
  const segments = (reference.coverage ?? []).map((ranges) => coverageExecuted(ranges));
  const referenceViolations = checkContext(context, model).map((violation) => `reference: ${violation}`);
  return { scenario, context, sites, executed: (offset) => segments.some((executed) => executed(offset)), referenceViolations };
};

interface ScenarioResult {
  name: string;
  control: string;
  expect: unknown;
  /** The exit the scenario declares, and the inventory's id for it (none without the inventory). */
  declaredExit: readonly [string, string];
  exit: string | null;
  operations: number;
  classes: Record<string, number>;
  operationKinds: Record<string, number>;
  violations: string[];
  details: string[];
  seed?: unknown;
}

function sweep(prepared: Prepared, exitId: string | null, examples: Record<string, Attempt> | null): ScenarioResult {
  const { scenario, context, sites } = prepared;
  const n = context.n;
  const result: ScenarioResult = { name: scenario.name, control: scenario.control, expect: scenario.expect, declaredExit: scenario.exit, exit: exitId, operations: n, classes: {}, operationKinds: {}, violations: [...prepared.referenceViolations], details: prepared.referenceViolations.map(() => "") };
  for (const { label } of sites) result.operationKinds[label] = (result.operationKinds[label] ?? 0) + 1;
  const ladder = context.control === "submitOutcome" && context.expect === "accepted" ? outcomeLadder(context) : [];
  for (let k = 1; k <= n + 1; k += 1) {
    const { attempt } = run(scenario, k);
    const where = k <= n ? `operation ${k}/${n} (${sites[k - 1]?.label} at ${sites[k - 1]?.site})` : "no fault";
    const verdict = classify(context, model, attempt, ladder);
    if (verdict.ok) {
      result.classes[verdict.kind] = (result.classes[verdict.kind] ?? 0) + 1;
      if (examples !== null && examples[verdict.kind] === undefined) examples[verdict.kind] = attempt;
    } else {
      result.violations.push(`${where}: ${verdict.violation}`);
      result.details.push(verdict.detail);
    }
  }
  // Review 11's fault probe: an exception immediately before the new Activation is built.
  if (scenario.name === "takeover: accepted (review 11's seed)") {
    const coordinator = readFileSync(COORDINATOR, "utf8").split("\n");
    const index = sites.findIndex(({ label, site }) => {
      const match = /^coordinator\.ts:(\d+) /.exec(site);
      return label === "Object.freeze" && match !== null && (coordinator[Number(match[1]) - 1] ?? "").includes("PrimordialObjectFreeze({ ...exchange.activation, writerEpoch })");
    });
    if (index === -1) result.violations.push("review 11's seed: no freeze of the new Activation was intercepted");
    else {
      const { attempt } = run(scenario, index + 1);
      const seed = {
        operation: index + 1,
        threw: attempt.observation.returned.kind === "threw",
        viewUnchanged: isDeepStrictEqual(attempt.observation.state.view, context.s0.view),
        nextAcceptance: attempt.observation.state.nextAcceptance,
        noCallNextAcceptance: context.s0.nextAcceptance,
      };
      result.seed = seed;
      // Review 11 recorded position 3 for clean H and 4 for both mutants.
      if (!seed.threw || !seed.viewUnchanged || seed.nextAcceptance !== 3 || context.s0.nextAcceptance !== 3) result.violations.push(`review 11's seed failed: ${JSON.stringify(seed)}`);
    }
  }
  return result;
}

// -- Main --------------------------------------------------------------------

const chosen = kit.SCENARIOS.filter((scenario) => selected === undefined || selected.some((part) => (part.startsWith("=") ? scenario.name === part.slice(1) : scenario.name.includes(part))));
const prepared = chosen.map(prepare);
coverageOn = false;
post("Profiler.stopPreciseCoverage");
post("Profiler.disable");

let inventory: Inventory | null = null;
if (selected === undefined) {
  inventory = exitInventory(model, prepared.map(({ scenario, executed }) => ({ name: scenario.name, control: scenario.control, exit: scenario.exit, executed })));
}
const exitOf = (name: string): string | null => inventory?.scenarios.find((entry) => entry.name === name)?.declared ?? null;

const results: ScenarioResult[] = [];
const examples: Record<string, { context: Context; byClass: Record<string, Attempt> }> = {};
for (const entry of prepared) {
  if (inventoryOnly) {
    results.push({ name: entry.scenario.name, control: entry.scenario.control, expect: entry.scenario.expect, declaredExit: entry.scenario.exit, exit: exitOf(entry.scenario.name), operations: entry.context.n, classes: {}, operationKinds: {}, violations: entry.referenceViolations, details: entry.referenceViolations.map(() => "") });
    continue;
  }
  const byClass: Record<string, Attempt> = {};
  results.push(sweep(entry, exitOf(entry.scenario.name), withExamples ? byClass : null));
  if (withExamples) examples[entry.scenario.name] = { context: entry.context, byClass };
}
const inventoryViolations = inventory?.violations.length ?? 0;
const violations = results.reduce((total, result) => total + result.violations.length, 0) + inventoryViolations;
const runs = inventoryOnly ? results.length : results.reduce((total, result) => total + result.operations + 1, 0);
if (process.argv.includes("--summary")) {
  // A reader's view of the same result; the JSON document is the raw evidence.
  for (const result of results) {
    const classes = Object.entries(result.classes).map(([kind, count]) => `${count} ${kind}`).join("; ");
    process.stdout.write(`${result.violations.length === 0 ? "PASS" : "FAIL"} ${result.name} [${result.exit ?? "exit not inventoried"}]: ${result.operations} operations; ${classes}\n`);
    for (const violation of result.violations.slice(0, 5)) process.stdout.write(`  VIOLATION ${violation}\n`);
  }
  if (inventory !== null) {
    process.stdout.write(`EXIT INVENTORY: ${inventory.exits.length} exits, ${inventory.exits.filter((exit) => exit.takenBy.length > 0).length} taken, ${inventory.violations.length} violations\n`);
    for (const violation of inventory.violations) process.stdout.write(`  VIOLATION ${violation}\n`);
  }
  process.stdout.write(`FAULT SWEEP ${violations === 0 ? "PASSED" : "FAILED"}: ${results.length} scenarios, ${runs} runs, ${violations} violations; ${intercepted.length} intercepted operations\n`);
} else {
  process.stdout.write(`${JSON.stringify({ intercepted, notIntercepted, scenarios: results.length, runs, violations, inventory, results, ...(withExamples ? { examples } : {}) }, null, 1)}\n`);
}
process.exitCode = violations === 0 ? 0 : 1;
