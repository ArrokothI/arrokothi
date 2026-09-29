/**
 * Fault-injection sweep for correction DEC-9, run in its own process (contract revision 9).
 *
 * DEC-9: `recoverExecution`, `reportProtocolFailure` and `requestTakeover` build every record and
 * answer their decision retains or returns before they change anything. The runtime consequence the
 * sweep checks is that no exception, wherever it strikes inside such a call, can leave accepted
 * state that no complete decision explains; in particular it can leave no invisible change that only
 * a *later* receipt would reveal (review 11's K12C1-R11-COMMIT-01 mutants).
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
 * For each scenario the sweep runs the target call once unarmed to count its operations `N`, then
 * `N` more times on a fresh coordinator, throwing at operation `k` for `k = 1..N`, and finally once
 * more with `k = N + 1`, when the call completes. After each run it observes the Execution: the whole
 * inspection view, the position the next refusal receives and the position the next accepted input
 * receives (or its refusal once the Execution is terminal).
 *
 * ## Oracle
 *
 * Each run must leave a state some complete decision explains:
 *
 * - the call threw: the no-call state `S0` exactly (views, both next positions);
 * - the call returned a refusal (the fault was contained as an unobservable field or an unsafe
 *   replacement): `S0` plus exactly that one refusal record;
 * - the call returned acceptance: the uninjected result `S1` (or a declared alternate: the
 *   fallback diagnostic of a protocol-failure report whose diagnostic could not be read);
 * - a takeover whose delivery failed after the commit: `S1` with its own delivery row absent,
 *   pending or failed. The decision is recorded first; the Driver is handed it afterwards.
 *
 * Two contract-declared qualifications are reported, not hidden. A takeover that clears a protocol
 * hold appends its receipt and then its clearing record, so a fault between those two appends leaves
 * exactly the receipt (`takeover-apply-window`). Outcome acceptance applies its prebuilt records in a
 * sequence of appends and writes, so a fault inside that sequence leaves a prefix
 * (`outcome-apply-window`). Both are engine resource exhaustion inside the apply phase, which DEC-9
 * and DEC-10 exclude, and both are accepted only at an apply-kind operation (a define, own-descriptor
 * read, own check, `Reflect.apply` or `Map.set`), never at a construction such as `Object.freeze`.
 * An early mutation followed by construction therefore shows up as a partial state at a freeze.
 *
 * ## Scope
 *
 * The scenarios below: every exit of the three recovery controls (accepted, idempotent and each
 * refusal), and the accepted and refused exits of Outcome acceptance. Faults are injected only at
 * intercepted operations; allocation, property access and string building are engine operations the
 * sweep cannot interrupt, and an engine fault there is outside this in-memory packet's claim.
 *
 * Usage: node --experimental-strip-types packages/kernel/tests/sweep/fault-child.ts [--scenarios a|b] [--summary]
 * `--scenarios` keeps scenarios whose name contains one of the `|`-separated parts. Prints one JSON
 * document (or, with `--summary`, one line per scenario); exit 0 when no scenario has a violation.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import ts from "typescript";

const SWEEP_ROOT = dirname(fileURLToPath(import.meta.url));
const ZONE_ROOT = resolve(SWEEP_ROOT, "../../src");
const HARNESS = pathToFileURL(resolve(SWEEP_ROOT, "../harness.ts")).href;
const INDEX = pathToFileURL(resolve(ZONE_ROOT, "index.ts")).href;

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
let siteLog: { label: string; site: string }[] | undefined;

const zoneSite = (): string => {
  const holder: { stack?: unknown } = {};
  const prepare = (Error as unknown as { prepareStackTrace?: unknown }).prepareStackTrace;
  const limit = Error.stackTraceLimit;
  (Error as unknown as { prepareStackTrace?: unknown }).prepareStackTrace = (_e: unknown, sites: NodeJS.CallSite[]) => sites;
  Error.stackTraceLimit = 40;
  try {
    originalCaptureStackTrace(holder);
    const sites = holder.stack as NodeJS.CallSite[];
    for (const site of sites) {
      const file = site.getFileName();
      if (typeof file === "string" && file.includes("/packages/kernel/src/")) {
        return `${file.slice(file.indexOf("/packages/kernel/src/") + 21)}:${site.getLineNumber()} ${site.getFunctionName() ?? "<anonymous>"}`;
      }
    }
    return "outside the zone";
  } finally {
    (Error as unknown as { prepareStackTrace?: unknown }).prepareStackTrace = prepare;
    Error.stackTraceLimit = limit;
  }
};

const tick = (label: string): void => {
  if (!armed) return;
  counted += 1;
  if (siteLog !== undefined) {
    armed = false;
    try {
      siteLog.push({ label, site: zoneSite() });
    } finally {
      armed = true;
    }
  }
  if (counted === target) {
    armed = false;
    fired = true;
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
const { ExecutionCoordinator } = kernelModule;
type Kernel = InstanceType<typeof ExecutionCoordinator>;
type View = import("../../src/index.ts").ExecutionView;
type Refusal = import("../../src/index.ts").RefusalRecord;

// -- Scenarios ---------------------------------------------------------------

type Oracle = "strict" | "takeover" | "outcome";

interface Env {
  readonly kernel: Kernel;
  readonly driver: ReturnType<typeof harness.recordingDriver>;
  readonly who: ReturnType<typeof harness.caller>;
  readonly executionId: string;
  readonly open: { activationId: string; writerEpoch: number; baseProgressRevision: number } | null;
}

type Call = () => { ok: boolean; value?: unknown; error?: unknown };

interface Scenario {
  readonly name: string;
  readonly control: "recoverExecution" | "reportProtocolFailure" | "requestTakeover" | "submitOutcome";
  readonly oracle: Oracle;
  readonly setup: (env: Env) => void;
  /** Builds the call's arguments (unarmed) and returns the call itself. */
  readonly call: (env: Env) => Call;
  /** A request the same call may legitimately be answered as when a contained fault makes a field unreadable. */
  readonly alternate?: (env: Env) => Call;
  readonly unsafeDriver?: boolean;
  readonly emissionsPerOutcome?: number;
  /** Review 11's exact setup: no input accepted after the reservation. */
  readonly bare?: boolean;
}

const AVAILABLE = { definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] };
const MISSING_DEFINITION = { ...AVAILABLE, definitionRevisions: [] as string[] };
const MISSING_CODEC = { ...AVAILABLE, progressCodecs: [] as string[] };
const current = (env: Env) => env.open as NonNullable<Env["open"]>;
const codeHold = (env: Env, available = MISSING_DEFINITION): void => {
  harness.accepted(env.kernel.recoverExecution(env.who, env.executionId, { activationId: current(env).activationId, available }));
};
const protocolHold = (env: Env): void => {
  harness.accepted(env.kernel.reportProtocolFailure(env.who, env.executionId, { activationId: current(env).activationId, writerEpoch: 1, diagnostic: "setup" }));
};
const outcome = (env: Env, overrides: Record<string, unknown> = {}) => harness.outcomeFor(env.executionId, current(env), overrides);
const grant = (env: Env) => harness.submissionFor(env.driver, current(env).activationId);
const recover = (available: typeof AVAILABLE, activationId?: string) => (env: Env): Call => {
  const request = { activationId: activationId ?? current(env).activationId, available };
  return () => env.kernel.recoverExecution(env.who, env.executionId, request);
};
const report = (fields: Record<string, unknown> = { diagnostic: "unclassifiable" }) => (env: Env): Call => {
  const request = { activationId: current(env).activationId, writerEpoch: 1, ...fields } as never;
  return () => env.kernel.reportProtocolFailure(env.who, env.executionId, request);
};
const takeover = (writerEpoch = 1) => (env: Env): Call => {
  const request = { activationId: current(env).activationId, writerEpoch };
  return () => env.kernel.requestTakeover(env.who, env.executionId, request);
};
/** An Outcome submission whose envelope and grant are built before the call. */
const submit = (overrides: Record<string, unknown> = {}, copyGrant = false) => (env: Env): Call => {
  const envelope = outcome(env, overrides);
  const presented = copyGrant ? { ...grant(env) } : grant(env);
  return () => env.kernel.submitOutcome(env.who, envelope, presented);
};
/** A control call from a caller that can see the Execution but holds no control power. */
const asObserver = (control: "recoverExecution" | "reportProtocolFailure" | "requestTakeover") => (env: Env): Call => {
  const who = harness.observer("fault");
  const activationId = current(env).activationId;
  if (control === "recoverExecution") return () => env.kernel.recoverExecution(who, env.executionId, { activationId, available: MISSING_DEFINITION });
  if (control === "reportProtocolFailure") return () => env.kernel.reportProtocolFailure(who, env.executionId, { activationId, writerEpoch: 1, diagnostic: "x" });
  return () => env.kernel.requestTakeover(who, env.executionId, { activationId, writerEpoch: 1 });
};
const nothing = (): void => {};

export const SCENARIOS: readonly Scenario[] = [
  // recoverExecution: every exit.
  { name: "recover: enter a code hold", control: "recoverExecution", oracle: "strict", setup: nothing, call: recover(MISSING_DEFINITION) },
  { name: "recover: update a code hold", control: "recoverExecution", oracle: "strict", setup: (env) => codeHold(env), call: recover(MISSING_CODEC) },
  { name: "recover: clear a code hold", control: "recoverExecution", oracle: "strict", setup: (env) => codeHold(env), call: recover(AVAILABLE) },
  { name: "recover: nothing to change", control: "recoverExecution", oracle: "strict", setup: nothing, call: recover(AVAILABLE) },
  { name: "recover: the same hold again (idempotent)", control: "recoverExecution", oracle: "strict", setup: (env) => codeHold(env), call: recover(MISSING_DEFINITION) },
  { name: "recover: enter a code hold beside a protocol hold", control: "recoverExecution", oracle: "strict", setup: protocolHold, call: recover(MISSING_DEFINITION) },
  { name: "recover: clear a code hold beside a protocol hold", control: "recoverExecution", oracle: "strict", setup: (env) => { protocolHold(env); codeHold(env); }, call: recover(AVAILABLE) },
  { name: "recover: refused without control power", control: "recoverExecution", oracle: "strict", setup: nothing, call: asObserver("recoverExecution") },
  { name: "recover: refused malformed request", control: "recoverExecution", oracle: "strict", setup: nothing, call: (env) => { const request = { activationId: current(env).activationId } as never; return () => env.kernel.recoverExecution(env.who, env.executionId, request); } },
  { name: "recover: refused stale Activation", control: "recoverExecution", oracle: "strict", setup: nothing, call: recover(MISSING_DEFINITION, "no-such-activation") },
  { name: "recover: refused with no unresolved exchange", control: "recoverExecution", oracle: "strict", setup: (env) => { harness.accepted(env.kernel.submitOutcome(env.who, outcome(env), grant(env))); }, call: recover(MISSING_DEFINITION) },
  { name: "recover: refused after the Execution ended", control: "recoverExecution", oracle: "strict", setup: (env) => { harness.accepted(env.kernel.submitOutcome(env.who, outcome(env, { next: { step: "complete", result: { done: true } } }), grant(env))); }, call: recover(MISSING_DEFINITION) },
  // reportProtocolFailure: every exit.
  { name: "report: enter a protocol hold", control: "reportProtocolFailure", oracle: "strict", setup: nothing, call: report(), alternate: report({ diagnostic: 0 }) },
  { name: "report: enter a protocol hold without a diagnostic", control: "reportProtocolFailure", oracle: "strict", setup: nothing, call: report({}) },
  { name: "report: enter a protocol hold beside a code hold", control: "reportProtocolFailure", oracle: "strict", setup: (env) => codeHold(env), call: report(), alternate: report({ diagnostic: 0 }) },
  { name: "report: the same hold again (idempotent)", control: "reportProtocolFailure", oracle: "strict", setup: protocolHold, call: report() },
  { name: "report: refused stale writer epoch", control: "reportProtocolFailure", oracle: "strict", setup: nothing, call: report({ writerEpoch: 2, diagnostic: "stale" }) },
  { name: "report: refused without control power", control: "reportProtocolFailure", oracle: "strict", setup: nothing, call: asObserver("reportProtocolFailure") },
  { name: "report: refused malformed report", control: "reportProtocolFailure", oracle: "strict", setup: nothing, call: report({ writerEpoch: "one" }) },
  // requestTakeover: every exit.
  { name: "takeover: accepted (review 11's seed)", control: "requestTakeover", oracle: "takeover", setup: nothing, call: takeover(), bare: true },
  { name: "takeover: accepted, clearing a protocol hold", control: "requestTakeover", oracle: "takeover", setup: protocolHold, call: takeover() },
  { name: "takeover: refused stale writer epoch", control: "requestTakeover", oracle: "strict", setup: nothing, call: takeover(2) },
  { name: "takeover: refused while a code hold stands", control: "requestTakeover", oracle: "strict", setup: (env) => codeHold(env), call: takeover() },
  { name: "takeover: refused by a Driver that cannot replace safely", control: "requestTakeover", oracle: "strict", setup: nothing, call: takeover(), unsafeDriver: true },
  { name: "takeover: refused without control power", control: "requestTakeover", oracle: "strict", setup: nothing, call: asObserver("requestTakeover") },
  { name: "takeover: refused malformed request", control: "requestTakeover", oracle: "strict", setup: nothing, call: (env) => { const request = { activationId: current(env).activationId } as never; return () => env.kernel.requestTakeover(env.who, env.executionId, request); } },
  { name: "takeover: refused with no unresolved exchange", control: "requestTakeover", oracle: "strict", setup: (env) => { harness.accepted(env.kernel.submitOutcome(env.who, outcome(env), grant(env))); }, call: takeover() },
  // Outcome acceptance.
  { name: "outcome: continue", control: "submitOutcome", oracle: "outcome", setup: nothing, call: submit() },
  { name: "outcome: complete with an Emission and a queued outside-batch input", control: "submitOutcome", oracle: "outcome", setup: nothing, call: submit({ next: { step: "complete", result: { done: true } }, emissions: [{ emissionKey: "e", value: { output: true } }] }) },
  { name: "outcome: fail", control: "submitOutcome", oracle: "outcome", setup: nothing, call: submit({ next: { step: "fail", error: { reason: "x" } } }) },
  { name: "outcome: continue, ending a code and a protocol hold", control: "submitOutcome", oracle: "outcome", setup: (env) => { codeHold(env); protocolHold(env); }, call: submit() },
  { name: "outcome: exact replay", control: "submitOutcome", oracle: "strict", setup: (env) => { harness.accepted(env.kernel.submitOutcome(env.who, outcome(env), grant(env))); }, call: submit() },
  { name: "outcome: refused conflicting replay", control: "submitOutcome", oracle: "strict", setup: (env) => { harness.accepted(env.kernel.submitOutcome(env.who, outcome(env), grant(env))); }, call: submit({ progress: { phase: "other" } }) },
  { name: "outcome: refused stale writer epoch", control: "submitOutcome", oracle: "strict", setup: nothing, call: submit({ writerEpoch: 2 }) },
  { name: "outcome: refused without the attempt's grant", control: "submitOutcome", oracle: "strict", setup: nothing, call: submit({}, true) },
  { name: "outcome: refused malformed content", control: "submitOutcome", oracle: "strict", setup: nothing, call: submit({ progress: Number.NaN }) },
  { name: "outcome: refused over the Emission capacity", control: "submitOutcome", oracle: "strict", setup: nothing, emissionsPerOutcome: 1, call: submit({ emissions: [{ emissionKey: "a", value: 1 }, { emissionKey: "b", value: 2 }] }) },
];

// -- Runs --------------------------------------------------------------------

interface State {
  readonly view: View;
  readonly nextRefusal: number;
  readonly nextAcceptance: number | string;
  /** What the setup exchange's attempt can still do with the grant the Driver received for it. */
  readonly setupGrant: string;
}

const fresh = (scenario: Scenario): Env => {
  const driver = scenario.unsafeDriver === true ? (harness.unsafeDriver() as unknown as ReturnType<typeof harness.recordingDriver>) : harness.recordingDriver();
  const kernel = new ExecutionCoordinator(scenario.emissionsPerOutcome === undefined ? { driver } : { driver, emissionsPerOutcome: scenario.emissionsPerOutcome });
  const who = harness.caller("fault", "tenant-a");
  const { executionId } = harness.accepted(kernel.createExecution(who, harness.createRequest()));
  const open = harness.accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  // An input accepted after reservation, so terminal Outcomes have an outside-batch Event to dispose.
  if (scenario.bare !== true) {
    harness.accepted(kernel.submitInput(who, { destination: executionId, requestKey: "outside-batch", kind: "update", payload: { newer: true } }));
  }
  const env: Env = { kernel, driver, who, executionId, open };
  scenario.setup(env);
  return env;
};

/**
 * The Execution's retained state as far as the boundary can show it: the whole view; the positions
 * the next refusal and the next accepted input receive (neither index is in the view); and what the
 * grant the Driver received at setup can still do, since the current grant is not in the view either
 * (a `continue` Outcome for the setup exchange at its first epoch, presented with that grant).
 */
const observe = (env: Env, setupGrant: import("../../src/index.ts").SubmissionGrant | undefined): State => {
  const view = harness.accepted(env.kernel.inspect(env.who, env.executionId));
  const refusal = env.kernel.submitInput(env.who, { destination: env.executionId, requestKey: "probe-refusal", kind: 42 as never, payload: null });
  if (refusal.ok) throw new Error("the refusal probe was accepted");
  const acceptance = env.kernel.submitInput(env.who, { destination: env.executionId, requestKey: "probe-acceptance", kind: "probe", payload: null });
  let grant = "no setup exchange";
  if (env.open !== null && setupGrant !== undefined) {
    const answer = env.kernel.submitOutcome(env.who, harness.outcomeFor(env.executionId, env.open, { progress: { probe: true } }), setupGrant);
    grant = answer.ok ? `accepted at ${answer.value.receipt.position}` : answer.error.classification;
  }
  return {
    view,
    nextRefusal: refusal.error.position,
    nextAcceptance: acceptance.ok ? acceptance.value.receipt.position : acceptance.error.classification,
    setupGrant: grant,
  };
};

/** The grant the Driver received with the setup exchange's first attempt. */
const setupGrantOf = (env: Env) => (env.open === null ? undefined : env.driver.submissions[0]);

type Outcome = { kind: "threw"; error: unknown } | { kind: "returned"; result: { ok: boolean; value?: unknown; error?: unknown } };

const run = (scenario: Scenario, at: number, sites?: { label: string; site: string }[]): { outcome: Outcome; state: State; counted: number; fired: boolean; label: string } => {
  const env = fresh(scenario);
  const setupGrant = setupGrantOf(env);
  const invoke = scenario.call(env);
  let outcome: Outcome;
  counted = 0;
  target = at;
  fired = false;
  siteLog = sites;
  armed = true;
  try {
    outcome = { kind: "returned", result: invoke() };
  } catch (error) {
    outcome = { kind: "threw", error };
  } finally {
    armed = false;
    siteLog = undefined;
  }
  const label = outcome.kind === "threw" && outcome.error instanceof InjectedFault ? outcome.error.label : "";
  return { outcome, state: observe(env, setupGrant), counted, fired, label };
};

const withoutLast = <T>(list: readonly T[]): T[] => list.slice(0, -1);
const refusalAdded = (state: State, s0: State, refusal: Refusal): boolean =>
  isDeepStrictEqual({ ...state.view, refusals: withoutLast(state.view.refusals) }, s0.view) &&
  isDeepStrictEqual(state.view.refusals.at(-1), refusal) &&
  refusal.position === s0.nextRefusal &&
  state.nextRefusal === s0.nextRefusal + 1 &&
  state.nextAcceptance === s0.nextAcceptance;

/** A takeover's state with its own delivery row removed, for the post-commit delivery faults. */
const withoutNewDelivery = (state: State, epoch: number): unknown => {
  const activation = state.view.activation;
  if (activation === null) return state;
  return { ...state, view: { ...state.view, activation: { ...activation, deliveries: activation.deliveries.filter((row) => row.writerEpoch !== epoch) } } };
};

const APPLY_KINDS = new Set(["Object.defineProperty", "Object.create", "Object.getOwnPropertyDescriptor", "Object.prototype.hasOwnProperty", "Reflect.apply", "Map.prototype.set"]);

interface ScenarioResult {
  name: string;
  control: string;
  operations: number;
  classes: Record<string, number>;
  operationKinds: Record<string, number>;
  violations: string[];
  seed?: unknown;
}

function sweep(scenario: Scenario): ScenarioResult {
  const s0 = (() => {
    const env = fresh(scenario);
    return observe(env, setupGrantOf(env));
  })();
  const sites: { label: string; site: string }[] = [];
  const reference = run(scenario, Number.POSITIVE_INFINITY, sites);
  const s1 = reference.state;
  const alternate = scenario.alternate === undefined ? undefined : (() => {
    const env = fresh(scenario);
    const setupGrant = setupGrantOf(env);
    (scenario.alternate as NonNullable<Scenario["alternate"]>)(env)();
    return observe(env, setupGrant);
  })();
  const n = reference.counted;
  const result: ScenarioResult = { name: scenario.name, control: scenario.control, operations: n, classes: {}, operationKinds: {}, violations: [] };
  for (const { label } of sites) result.operationKinds[label] = (result.operationKinds[label] ?? 0) + 1;
  if (reference.outcome.kind === "threw") result.violations.push(`the uninjected call threw: ${String((reference.outcome as { error: unknown }).error)}`);
  const newEpoch = scenario.control === "requestTakeover" && s1.view.activation !== null ? s1.view.activation.writerEpoch : -1;
  const classify = (kind: string): void => {
    result.classes[kind] = (result.classes[kind] ?? 0) + 1;
  };
  for (let k = 1; k <= n + 1; k += 1) {
    const attempt = run(scenario, k);
    const where = k <= n ? `operation ${k}/${n} (${sites[k - 1]?.label} at ${sites[k - 1]?.site})` : "no fault";
    if (k <= n && !attempt.fired) {
      result.violations.push(`${where}: the fault did not fire (the call made ${attempt.counted} operations)`);
      continue;
    }
    if (k === n + 1 && attempt.fired) {
      result.violations.push(`${where}: a fault fired past the reference count`);
      continue;
    }
    const state = attempt.state;
    const outcome = attempt.outcome;
    if (k === n + 1) {
      // The call with no fault is the reference call again: it must reach the same state.
      if (isDeepStrictEqual(state, s1)) classify("completed");
      else result.violations.push(`${where}: the call without a fault reached a different state than the reference run`);
      continue;
    }
    if (outcome.kind === "threw") {
      if (!(outcome.error instanceof InjectedFault)) {
        result.violations.push(`${where}: threw something other than the injected fault: ${String(outcome.error)}`);
        continue;
      }
      if (isDeepStrictEqual(state, s0)) {
        classify("threw: no-call state");
        continue;
      }
      if (scenario.oracle === "takeover" && isDeepStrictEqual(withoutNewDelivery(state, newEpoch), withoutNewDelivery(s1, newEpoch))) {
        classify("threw after the commit: decision recorded, delivery incomplete");
        continue;
      }
      const receiptOnly = { ...s0, view: { ...s0.view, receipts: [...s0.view.receipts, s1.view.receipts.at(-1)] } };
      if (scenario.oracle === "takeover" && APPLY_KINDS.has(attempt.label) && isDeepStrictEqual(state, receiptOnly)) {
        classify("threw inside the declared takeover apply window: receipt appended, clearing record not");
        continue;
      }
      if (scenario.oracle === "outcome" && APPLY_KINDS.has(attempt.label)) {
        classify("threw inside the declared Outcome apply window");
        continue;
      }
      result.violations.push(`${where}: threw and left a state no complete decision explains`);
      continue;
    }
    const answer = outcome.result;
    if (!answer.ok) {
      const refusal = answer.error as Refusal;
      // A refusal that names no Execution (an unobservable destination) is returned, never retained.
      if (refusal.executionId === null && refusal.position === 0 && isDeepStrictEqual(state, s0)) classify("refused without naming the Execution: nothing recorded");
      else if (refusalAdded(state, s0, refusal)) classify("refused: exactly one refusal recorded");
      else result.violations.push(`${where}: refused and left a state other than the no-call state plus that refusal`);
      continue;
    }
    if (isDeepStrictEqual(state, s1)) {
      classify("accepted after a contained fault: the uninjected decision");
      continue;
    }
    if (alternate !== undefined && isDeepStrictEqual(state, alternate)) {
      classify("accepted after a contained fault: the declared alternate");
      continue;
    }
    if (scenario.oracle === "takeover" && isDeepStrictEqual(withoutNewDelivery(state, newEpoch), withoutNewDelivery(s1, newEpoch))) {
      classify("accepted; the Driver's delivery failed after the commit");
      continue;
    }
    result.violations.push(`${where}: accepted and left a state other than the uninjected decision`);
  }
  // Review 11's fault probe: an exception immediately before the new Activation is built.
  if (scenario.name === "takeover: accepted (review 11's seed)") {
    const coordinator = readFileSync(resolve(ZONE_ROOT, "coordinator.ts"), "utf8").split("\n");
    const index = sites.findIndex(({ label, site }) => {
      const match = /^coordinator\.ts:(\d+) /.exec(site);
      return label === "Object.freeze" && match !== null && (coordinator[Number(match[1]) - 1] ?? "").includes("PrimordialObjectFreeze({ ...exchange.activation, writerEpoch })");
    });
    if (index === -1) result.violations.push("review 11's seed: no freeze of the new Activation was intercepted");
    else {
      const attempt = run(scenario, index + 1);
      const seed = { operation: index + 1, threw: attempt.outcome.kind === "threw", viewUnchanged: isDeepStrictEqual(attempt.state.view, s0.view), nextAcceptance: attempt.state.nextAcceptance, noCallNextAcceptance: s0.nextAcceptance };
      result.seed = seed;
      // Review 11 recorded position 3 for clean H and 4 for both mutants.
      if (!seed.threw || !seed.viewUnchanged || seed.nextAcceptance !== 3 || s0.nextAcceptance !== 3) result.violations.push(`review 11's seed failed: ${JSON.stringify(seed)}`);
    }
  }
  return result;
}

const selected = (() => {
  const index = process.argv.indexOf("--scenarios");
  return index === -1 ? undefined : (process.argv[index + 1] ?? "").split("|");
})();
const results: ScenarioResult[] = [];
for (const scenario of SCENARIOS) {
  if (selected !== undefined && !selected.some((part) => scenario.name.includes(part))) continue;
  results.push(sweep(scenario));
}
const violations = results.reduce((total, result) => total + result.violations.length, 0);
const runs = results.reduce((total, result) => total + result.operations + 1, 0);
if (process.argv.includes("--summary")) {
  // A reader's view of the same result; the JSON document is the raw evidence.
  for (const result of results) {
    const classes = Object.entries(result.classes).map(([kind, count]) => `${count} ${kind}`).join("; ");
    process.stdout.write(`${result.violations.length === 0 ? "PASS" : "FAIL"} ${result.name}: ${result.operations} operations; ${classes}\n`);
    for (const violation of result.violations.slice(0, 5)) process.stdout.write(`  VIOLATION ${violation}\n`);
  }
  process.stdout.write(`FAULT SWEEP ${violations === 0 ? "PASSED" : "FAILED"}: ${results.length} scenarios, ${runs} runs, ${violations} violations; ${intercepted.length} intercepted operations\n`);
} else {
  process.stdout.write(`${JSON.stringify({ intercepted, notIntercepted, scenarios: results.length, runs, violations, results }, null, 1)}\n`);
}
process.exitCode = violations === 0 ? 0 : 1;
