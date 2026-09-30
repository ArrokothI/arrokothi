/**
 * Negative controls of the DEC-9 fault sweep's oracle (contract revision 10; K12C1-R12-ORACLE-01,
 * K12C1-R12-SCOPE-01).
 *
 * `sweep/fault-oracle.ts` judges each fault run by comparing a complete expected decision with what
 * the run left: the returned value, the whole view, the next refusal and acceptance positions, and
 * what the setup attempt's grant can still do. This file checks that the comparisons are live.
 *
 * It runs the sweep on a handful of scenarios with `--examples`, which returns, for each scenario, its
 * context (the no-call state, the reference decision, …) and the first run of every decision class.
 * Those real observations are then altered, one part at a time, and handed back to the oracle, which
 * must report every altered observation as a violation. The unaltered observations must reclassify
 * as recorded, and the sweep over the example scenarios must stay at zero violations.
 *
 * - **Review 12's three observations** (review-12-evidence/build-oracle-probe.py, oracle-probe.json):
 *   a refusal that revokes the setup grant, an accepted report returning the opposite hold answer,
 *   and a changed progress revision labelled as an Outcome apply fault by method name. The candidate
 *   the review examined accepted all three.
 * - **Every part of every permitted decision**: for each class the examples reach, the returned value,
 *   the view, both positions and the grant, altered in turn.
 * - **Every located exception**: the same state with the fault moved to another location.
 * - **The reference decision**: each check of the uninjected call, against an altered context.
 * - **The exit inventory**: a missing scenario, an exit not taken, an ambiguous declaration.
 *
 * `docs/development/work/K1.2-correction-01/oracle-mutants-09.mjs` disables each entry of the
 * oracle's `CHECKS` in turn and requires this file to fail.
 *
 * The test list is fixed: `EXAMPLE_CLASSES` names the decision classes each example scenario reaches
 * on clean code, and every lookup happens inside a test. A mutated Kernel or oracle can then only make
 * tests fail, never change how many there are, which the full-suite ablation runners require.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkContext,
  classify,
  exitInventory,
  sourceModel,
  type Attempt,
  type Context,
  type Expect,
  type Frame,
  type Observation,
  type ReferenceExits,
  type SourceModel,
  type State,
} from "./sweep/fault-oracle.ts";

const TESTS = dirname(fileURLToPath(import.meta.url));
const CHILD = resolve(TESTS, "sweep/fault-child.ts");
const MODEL = sourceModel(resolve(TESTS, "../src/coordinator.ts"));

const EXAMPLE_SCENARIOS = [
  "report: enter a protocol hold",
  "report: the same hold again",
  "report: refused malformed report",
  "report: refused, unknown Execution",
  "takeover: accepted, clearing a protocol hold",
  "takeover: refused, the safety callback took the exchange over itself",
  "outcome: continue",
  "outcome: exact replay",
];

interface Report {
  violations: number;
  results: { name: string; control: Context["control"]; declaredExit: [string, string]; violations: string[] }[];
  inventory: { exits: { id: string; takenBy: string[] }[]; violations: string[] } | null;
  examples?: Record<string, { context: Context; byClass: Record<string, Attempt> }>;
}

/** The decision classes each example scenario reaches on clean code (the sweep's own record). */
const EXAMPLE_CLASSES: Record<string, readonly string[]> = {
  "report: enter a protocol hold": ["threw: no-call state", "refused: exactly one refusal recorded", "accepted after a contained fault: the declared alternate", "completed"],
  "report: enter a protocol hold without a diagnostic": ["threw: no-call state", "refused: exactly one refusal recorded", "accepted after a contained fault: the uninjected decision", "completed"],
  "report: enter a protocol hold beside a code hold": ["threw: no-call state", "refused: exactly one refusal recorded", "accepted after a contained fault: the declared alternate", "completed"],
  "report: the same hold again (idempotent)": ["threw: no-call state", "refused: exactly one refusal recorded", "accepted after a contained fault: the uninjected decision", "completed"],
  "report: refused, unknown Execution": ["threw: no-call state", "completed"],
  "report: refused malformed report": ["threw: no-call state", "refused: exactly one refusal recorded", "completed"],
  "takeover: accepted, clearing a protocol hold": [
    "threw: no-call state",
    "refused: exactly one refusal recorded",
    "threw inside the declared takeover apply window: receipt appended, clearing record not",
    "threw while delivering after the commit: delivery row absent",
    "threw while delivering after the commit: delivery row pending",
    "accepted; the Driver's delivery failed after the commit",
    "completed",
  ],
  "takeover: refused, the safety callback took the exchange over itself": ["threw: no-call state", "refused: exactly one refusal recorded", "threw after the safety callback: its decision only", "completed"],
  "outcome: continue": ["refused without naming the Execution: nothing recorded", "threw: no-call state", "refused: exactly one refusal recorded", "threw inside the declared Outcome apply window: a permitted prefix", "completed"],
  "outcome: continue, ending a code and a protocol hold": ["refused without naming the Execution: nothing recorded", "threw: no-call state", "refused: exactly one refusal recorded", "threw inside the declared Outcome apply window: a permitted prefix", "completed"],
  "outcome: exact replay": ["refused without naming the Execution: nothing recorded", "threw: no-call state", "refused: exactly one refusal recorded", "completed"],
};

const child = (args: string[]): { status: number | null; failure: string | null; report: Report } => {
  const run = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", CHILD, ...args], {
    cwd: resolve(TESTS, "../../.."),
    encoding: "utf8",
    timeout: 300_000,
    maxBuffer: 256 * 1024 * 1024,
  });
  try {
    return { status: run.status, failure: run.error === undefined ? null : String(run.error), report: JSON.parse(run.stdout) as Report };
  } catch {
    return { status: run.status, failure: `no JSON report: ${String(run.error ?? "")} ${(run.stderr ?? "").slice(-2000)}`, report: { violations: -1, results: [], inventory: null } };
  }
};

const sweep = child(["--scenarios", EXAMPLE_SCENARIOS.join("|"), "--examples"]);
const examples = sweep.report.examples ?? {};
const inventoryRun = child(["--inventory-only"]);

const contextOf = (name: string): Context => {
  const entry = examples[name];
  assert.ok(entry !== undefined, `example scenario ${name}`);
  return entry.context;
};
const exampleOf = (name: string, kind: string): Attempt => {
  const attempt = examples[name]?.byClass[kind];
  assert.ok(attempt !== undefined, `${name} reached "${kind}"`);
  return attempt;
};
const judge = (context: Context, attempt: Attempt, model: SourceModel = MODEL) => classify(context, model, attempt);
const rejected = (context: Context, attempt: Attempt, what: string, model: SourceModel = MODEL): void => {
  const verdict = judge(context, attempt, model);
  assert.equal(verdict.ok, false, `${what}: the oracle accepted it as "${verdict.ok ? verdict.kind : ""}"`);
};
const withState = (attempt: Attempt, change: (state: State) => State): Attempt => ({
  ...attempt,
  observation: { ...attempt.observation, state: change(attempt.observation.state) },
});
const withObservation = (attempt: Attempt, observation: Observation): Attempt => ({ ...attempt, observation });
const withStack = (attempt: Attempt, change: (stack: readonly Frame[]) => Frame[]): Attempt => {
  assert.ok(attempt.fault !== null, "a located example");
  return { ...attempt, fault: { ...attempt.fault, stack: change(attempt.fault.stack) } };
};
/** A fault at the first operation of `context`'s reference run made through `label`. */
const faultAt = (context: Context, label: string, observation: Observation, stack: Frame[] = []): Attempt => {
  const k = context.labels.indexOf(label) + 1;
  assert.ok(k > 0, `${context.name} makes a ${label} call`);
  return { k, fired: true, counted: k, fault: { operation: k, label, stack }, callbackRan: false, observation };
};
const lineOf = (lines: readonly [number, number] | null | undefined): number => {
  assert.ok(lines !== null && lines !== undefined, "a statement the model located");
  return lines[0];
};

test("the example scenarios' sweep and the whole exit inventory are clean", () => {
  assert.equal(sweep.failure, null);
  assert.equal(inventoryRun.failure, null);
  const failures = sweep.report.results.flatMap((result) => result.violations.map((violation) => `${result.name}: ${violation}`));
  assert.deepEqual(failures, [], "the clean run stays at zero violations");
  assert.equal(sweep.status, 0);
  assert.equal(sweep.report.violations, 0);
  assert.equal(inventoryRun.status, 0);
  assert.deepEqual(inventoryRun.report.inventory?.violations, [], "each inventoried exit is taken, each scenario by its declared exit");
  assert.equal(MODEL.problems.length, 0, MODEL.problems.join("; "));
});

test("every recorded example reclassifies as recorded, and reaches exactly its declared classes", () => {
  assert.deepEqual(Object.keys(examples).sort(), Object.keys(EXAMPLE_CLASSES).sort());
  for (const [name, { context, byClass }] of Object.entries(examples)) {
    assert.deepEqual(checkContext(context, MODEL), [], `${name}: reference`);
    assert.deepEqual(Object.keys(byClass).sort(), [...(EXAMPLE_CLASSES[name] ?? [])].sort(), name);
    for (const [kind, attempt] of Object.entries(byClass)) {
      const verdict = judge(context, attempt);
      assert.ok(verdict.ok, `${name}: ${kind}: ${verdict.ok ? "" : verdict.violation}`);
      assert.equal(verdict.ok && verdict.kind, kind, name);
    }
  }
});

describe("review 12's three altered observations (K12C1-R12-ORACLE-01)", () => {
  test("a refusal that leaves the setup grant unauthorized is a violation", () => {
    const context = contextOf("report: enter a protocol hold");
    const refusal = contextOf("report: refused malformed report").reference;
    const attempt = faultAt(context, "Object.freeze", refusal);
    assert.equal(refusal.state.setupGrant, "accepted at 5", "the grant review 12 changed");
    const clean = judge(context, attempt);
    assert.ok(clean.ok && clean.kind === "refused: exactly one refusal recorded", "unaltered, the same refusal is a permitted decision");
    rejected(context, withState(attempt, (state) => ({ ...state, setupGrant: "unauthorized_submission" })), "review 12 observation 1");
  });

  test("an accepted report returning the opposite hold answer is a violation, after a fault and without one", () => {
    const context = contextOf("report: enter a protocol hold");
    const reference = context.reference;
    assert.equal(reference.returned.kind, "ok");
    const value = (reference.returned as { value: { changed: boolean; recoveryHolds: unknown[] } }).value;
    assert.equal(value.changed, true);
    assert.equal(value.recoveryHolds.length, 1);
    const opposite: Observation = { returned: { kind: "ok", value: { ...value, changed: false, recoveryHolds: [] } }, state: reference.state };
    rejected(context, faultAt(context, "Reflect.apply", opposite), "review 12 observation 2, contained fault");
    rejected(context, { k: context.n + 1, fired: false, counted: context.n, fault: null, callbackRan: false, observation: opposite }, "review 12 observation 2, no-fault repeat");
    assert.notDeepEqual(checkContext({ ...context, reference: opposite }, MODEL), [], "review 12 observation 2 as the reference decision");
  });

  test("a changed progress revision labelled as an Outcome apply fault by method name is a violation", () => {
    for (const name of ["outcome: continue", "report: enter a protocol hold"]) {
      const context = contextOf(name);
      const k = context.labels.indexOf("Reflect.apply") + 1;
      const corrupted: Observation = { returned: { kind: "threw", operation: k }, state: { ...context.s0, view: { ...context.s0.view, progressRevision: 123456 } } };
      rejected(context, faultAt(context, "Reflect.apply", corrupted), `review 12 observation 3 (${name})`);
    }
    const context = contextOf("outcome: continue");
    const receipts = MODEL.outcomeApply.find((entry) => entry.step === "receipts")?.lines;
    const k = context.labels.lastIndexOf("Object.defineProperty") + 1;
    const located: Attempt = {
      k,
      fired: true,
      counted: k,
      fault: { operation: k, label: "Object.defineProperty", stack: [{ file: "coordinator.ts", line: lineOf(receipts), fn: "#accept" }] },
      callbackRan: false,
      observation: { returned: { kind: "threw", operation: k }, state: { ...context.s0, view: { ...context.s0.view, progressRevision: 123456 } } },
    };
    rejected(context, located, "review 12 observation 3, located inside the apply window: not a permitted prefix");
  });
});

describe("every part of every permitted decision is compared", () => {
  const alterations: [string, (attempt: Attempt) => Attempt][] = [
    [
      "returned value",
      (attempt) => {
        const returned = attempt.observation.returned;
        const altered =
          returned.kind === "threw"
            ? { kind: "threw" as const, operation: (returned.operation ?? 0) + 1000 }
            : returned.kind === "ok"
              ? { kind: "ok" as const, value: { ...(returned.value as object), altered: true } }
              : { kind: "err" as const, refusal: { ...returned.refusal, reason: `${returned.refusal.reason} (altered)` } };
        return withObservation(attempt, { ...attempt.observation, returned: altered });
      },
    ],
    ["view", (attempt) => withState(attempt, (state) => ({ ...state, view: { ...state.view, progressRevision: state.view.progressRevision + 1000 } }))],
    ["next refusal position", (attempt) => withState(attempt, (state) => ({ ...state, nextRefusal: state.nextRefusal + 1000 }))],
    [
      "next acceptance position",
      (attempt) => withState(attempt, (state) => ({ ...state, nextAcceptance: typeof state.nextAcceptance === "number" ? state.nextAcceptance + 1000 : `${state.nextAcceptance} (altered)` })),
    ],
    ["setup grant", (attempt) => withState(attempt, (state) => ({ ...state, setupGrant: `${state.setupGrant} (altered)` }))],
  ];
  const classes = new Set<string>();
  for (const [name, kinds] of Object.entries(EXAMPLE_CLASSES)) {
    for (const kind of kinds) {
      classes.add(kind);
      for (const [part, alter] of alterations) {
        test(`${name} / ${kind} / ${part}`, () => rejected(contextOf(name), alter(exampleOf(name, kind)), `${part} altered`));
      }
    }
  }
  test("the examples reach every decision class a fault run reaches in the full sweep", () => {
    for (const kind of [
      "threw: no-call state",
      "threw after the safety callback: its decision only",
      "refused: exactly one refusal recorded",
      "refused without naming the Execution: nothing recorded",
      "accepted after a contained fault: the uninjected decision",
      "accepted after a contained fault: the declared alternate",
      "threw while delivering after the commit: delivery row absent",
      "threw while delivering after the commit: delivery row pending",
      "accepted; the Driver's delivery failed after the commit",
      "threw inside the declared takeover apply window: receipt appended, clearing record not",
      "threw inside the declared Outcome apply window: a permitted prefix",
      "completed",
    ]) {
      assert.ok(classes.has(kind), kind);
    }
  });
});

describe("a recorded refusal is this Execution's next one", () => {
  const context = (): Context => contextOf("report: enter a protocol hold");
  const replaced = (change: (refusal: Extract<Observation["returned"], { kind: "err" }>["refusal"]) => Extract<Observation["returned"], { kind: "err" }>["refusal"]): Attempt => {
    const attempt = exampleOf("report: enter a protocol hold", "refused: exactly one refusal recorded");
    const returned = attempt.observation.returned;
    assert.equal(returned.kind, "err");
    const refusal = change((returned as Extract<Observation["returned"], { kind: "err" }>).refusal);
    const state = attempt.observation.state;
    return withObservation(attempt, { returned: { kind: "err", refusal }, state: { ...state, view: { ...state.view, refusals: [...state.view.refusals.slice(0, -1), refusal] } } });
  };
  test("at another position, returned and retained alike", () => rejected(context(), replaced((refusal) => ({ ...refusal, position: refusal.position + 7 })), "refusal position"));
  test("naming another Execution, returned and retained alike", () => rejected(context(), replaced((refusal) => ({ ...refusal, executionId: "another-execution" })), "refusal Execution"));
});

describe("every located exception needs its location", () => {
  const TAKEOVER = "takeover: accepted, clearing a protocol hold";
  const takeover = (): Context => contextOf(TAKEOVER);
  const deliverySite = (site: string): number => lineOf(MODEL.deliverySites.find((entry) => entry.site === site)?.lines);
  const moveDeliverFrame = (attempt: Attempt, line: number): Attempt =>
    withStack(attempt, (stack) => {
      const call = stack.findIndex((frame) => frame.file === "coordinator.ts" && frame.line === lineOf(MODEL.takeoverDeliverCall));
      assert.ok(call > 0, "the fault is inside #deliver");
      return stack.map((frame, index) => (index === call - 1 ? { ...frame, line } : frame));
    });
  test("a delivery row left absent, at the capability's freeze", () =>
    rejected(takeover(), moveDeliverFrame(exampleOf(TAKEOVER, "threw while delivering after the commit: delivery row absent"), deliverySite("pending")), "absent row, pending location"));
  test("a delivery row left pending, at the row's append", () =>
    rejected(takeover(), moveDeliverFrame(exampleOf(TAKEOVER, "threw while delivering after the commit: delivery row pending"), deliverySite("absent")), "pending row, absent location"));
  test("a failed delivery, at the row's append", () =>
    rejected(takeover(), moveDeliverFrame(exampleOf(TAKEOVER, "accepted; the Driver's delivery failed after the commit"), deliverySite("absent")), "failed row, absent location"));
  test("a delivery state with no location", () =>
    rejected(takeover(), withStack(exampleOf(TAKEOVER, "threw while delivering after the commit: delivery row absent"), () => []), "delivery state, no location"));
  test("the takeover window's receipt-only state, outside the clearing append", () =>
    rejected(
      takeover(),
      withStack(exampleOf(TAKEOVER, "threw inside the declared takeover apply window: receipt appended, clearing record not"), (stack) =>
        stack.map((frame) => (frame.file === "coordinator.ts" && frame.line === lineOf(MODEL.takeoverClearingAppend) ? { ...frame, line: lineOf(MODEL.takeoverDeliverCall) } : frame)),
      ),
      "receipt only, outside the window",
    ));

  const OUTCOME = "outcome: continue, ending a code and a protocol hold";
  const outcome = (): Context => contextOf(OUTCOME);
  const inWindow = (): Attempt => exampleOf(OUTCOME, "threw inside the declared Outcome apply window: a permitted prefix");
  const steps = MODEL.outcomeApply.filter((entry) => entry.lines !== null);
  const stepLine = (frame: Frame) => steps.find((entry) => entry.lines !== null && frame.file === "coordinator.ts" && frame.line >= entry.lines[0] && frame.line <= entry.lines[1]);
  test("an Outcome prefix, outside the apply window", () =>
    rejected(outcome(), withStack(inWindow(), (stack) => stack.map((frame) => (stepLine(frame) !== undefined ? { ...frame, line: lineOf(MODEL.outcomeApply[0]?.lines) - 1 } : frame))), "prefix, outside the window"));
  test("an Outcome prefix, at another apply statement", () => {
    const own = inWindow().fault?.stack.map(stepLine).find((entry) => entry !== undefined);
    assert.ok(own !== undefined, "the example is located at an apply statement");
    const other = steps.find((entry) => entry.step !== own.step && ["acknowledge", "exchanges", "acceptedOutcomes", "receipts", "history"].includes(entry.step));
    assert.ok(other !== undefined);
    rejected(outcome(), withStack(inWindow(), (stack) => stack.map((frame) => (stepLine(frame) !== undefined ? { ...frame, line: lineOf(other.lines) } : frame))), `prefix at ${own.step}, located at ${other.step}`);
  });
  test("a declared apply sequence that no longer matches the source", () => {
    const model: SourceModel = { ...MODEL, problems: ["#accept: statement 2 of the declared sequence differs"] };
    rejected(outcome(), inWindow(), "apply window with a mismatched declaration", model);
    assert.notDeepEqual(checkContext(outcome(), model), [], "the reference check reports the mismatch");
  });

  test("a located exception in a scenario whose uninjected call does not accept", () => {
    const refusing = { refused: "stale_exchange" } as Expect;
    for (const kind of ["threw while delivering after the commit: delivery row absent", "threw inside the declared takeover apply window: receipt appended, clearing record not", "accepted; the Driver's delivery failed after the commit"]) {
      rejected({ ...takeover(), expect: refusing }, exampleOf(TAKEOVER, kind), `${kind}, refusing scenario`);
    }
    rejected({ ...outcome(), expect: refusing }, inWindow(), "Outcome prefix, refusing scenario");
  });
  test("a run whose faulted operation is not the reference run's", () => {
    const attempt = exampleOf(TAKEOVER, "threw: no-call state");
    rejected(takeover(), { ...attempt, fault: attempt.fault === null ? null : { ...attempt.fault, label: "Object.is" } }, "another operation");
    rejected({ ...takeover(), labels: takeover().labels.map(() => "Object.is") }, attempt, "another reference operation");
  });

  const REENTRY = "takeover: refused, the safety callback took the exchange over itself";
  const reentry = (): Context => contextOf(REENTRY);
  test("a fault after the safety callback, in a run where it did not run", () =>
    rejected(reentry(), { ...exampleOf(REENTRY, "threw after the safety callback: its decision only"), callbackRan: false }, "callback position"));
  test("a fault before the safety callback, in a run where it ran", () =>
    rejected(reentry(), { ...exampleOf(REENTRY, "threw: no-call state"), callbackRan: true }, "callback position"));
  test("a fault that did not fire, and a repeat in which one did", () => {
    rejected(reentry(), { ...exampleOf(REENTRY, "threw: no-call state"), fired: false }, "fault not fired");
    rejected(reentry(), { ...exampleOf(REENTRY, "completed"), fired: true }, "repeat fired");
  });
});

describe("the reference decision is checked", () => {
  const altered = (name: string, change: (context: Context) => Context, what: string): void => {
    const context = contextOf(name);
    assert.deepEqual(checkContext(context, MODEL), [], `${name} unaltered`);
    assert.notDeepEqual(checkContext(change(context), MODEL), [], what);
  };
  const withReferenceState = (context: Context, change: (state: State) => State): Context => ({ ...context, reference: { ...context.reference, state: change(context.reference.state) } });
  const withAnswer = (context: Context, change: (value: Record<string, unknown>) => Record<string, unknown>): Context => {
    assert.equal(context.reference.returned.kind, "ok");
    return { ...context, reference: { ...context.reference, returned: { kind: "ok", value: change((context.reference.returned as { value: Record<string, unknown> }).value) } } };
  };
  test("a refusal that also revokes the grant", () => altered("report: refused malformed report", (context) => withReferenceState(context, (state) => ({ ...state, setupGrant: "unauthorized_submission" })), "refusal + grant"));
  test("a refusal naming no Execution that consumes a position", () => altered("report: refused, unknown Execution", (context) => withReferenceState(context, (state) => ({ ...state, nextRefusal: state.nextRefusal + 1 })), "hidden mutation"));
  test("an idempotent answer that changed the history", () =>
    altered("report: the same hold again (idempotent)", (context) => withReferenceState(context, (state) => ({ ...state, view: { ...state.view, recoveryHistory: [...state.view.recoveryHistory, ...state.view.recoveryHistory] } })), "idempotent changed"));
  test("an exact replay returning another decision", () => altered("outcome: exact replay", (context) => withAnswer(context, (value) => ({ ...value, progressRevision: 99 })), "replay answer"));
  test("a recovery answer that disagrees with the holds it left", () => altered("report: enter a protocol hold", (context) => withAnswer(context, (value) => ({ ...value, recoveryHolds: [] })), "recovery answer"));
  test("a declared alternate whose answer disagrees with its state", () =>
    altered(
      "report: enter a protocol hold",
      (context) => ({ ...context, alternate: context.alternate === null ? null : { ...context.alternate, returned: { kind: "ok", value: { ...((context.alternate.returned as { value: object }).value), recoveryHolds: [] } } } }),
      "alternate answer",
    ));
  test("a takeover answer with another receipt", () =>
    altered("takeover: accepted, clearing a protocol hold", (context) => withAnswer(context, (value) => ({ ...value, receipt: { ...(value.receipt as object), position: 99 } })), "takeover answer"));
  test("an Outcome answer naming other Emissions", () => altered("outcome: continue", (context) => withAnswer(context, (value) => ({ ...value, emissionIds: ["emission-other"] })), "Outcome answer"));
  test("an Outcome decision the declared apply sequence cannot reproduce", () =>
    altered("outcome: continue", (context) => withReferenceState(context, (state) => ({ ...state, view: { ...state.view, scope: "another-scope" } })), "apply model"));
  test("an idempotent answer that disagrees with the holds it left", () =>
    altered("report: the same hold again (idempotent)", (context) => withAnswer(context, (value) => ({ ...value, recoveryHolds: [] })), "idempotent answer"));
  test("a safety-callback baseline without the callback's decision", () =>
    altered("takeover: refused, the safety callback took the exchange over itself", (context) => ({ ...context, callback: context.callback === null ? null : { ...context.callback, state: context.s0 } }), "callback baseline"));
  test("an uninjected call that did not take its declared exit", () => {
    altered("report: enter a protocol hold", (context) => ({ ...context, expect: { refused: "stale_exchange" } as Expect }), "accepted instead of refused");
    altered("report: refused malformed report", (context) => ({ ...context, expect: { refused: "stale_exchange" } as Expect }), "another refusal");
    altered("report: refused malformed report", (context) => ({ ...context, expect: "accepted" as Expect }), "refused instead of accepted");
  });
});

describe("the exit inventory", () => {
  const inventory = inventoryRun.report.inventory;
  const exitById = new Map(MODEL.exits.map((exit) => [exit.id, exit]));
  const runs = (): ReferenceExits[] =>
    inventoryRun.report.results.map((result) => {
      const taken = new Set((inventory?.exits ?? []).filter((exit) => exit.takenBy.includes(result.name)).map((exit) => exitById.get(exit.id)?.offset));
      return { name: result.name, control: result.control, exit: result.declaredExit, executed: (offset: number) => taken.has(offset) };
    });
  test("rebuilt from the child's record, it is clean", () => {
    assert.ok(inventory !== null);
    assert.equal(inventory.exits.length, MODEL.exits.length);
    assert.deepEqual(exitInventory(MODEL, runs()).violations, []);
  });
  test("an exit no scenario takes", () => {
    const without = runs().filter((run) => run.name !== "takeover: refused, the safety callback held the exchange's code");
    assert.ok(exitInventory(MODEL, without).violations.some((violation) => violation.startsWith("no scenario's uninjected call takes requestTakeover L")), "missing reentry exit");
  });
  test("a scenario that does not take its declared exit", () => {
    const altered = runs().map((run) => (run.name === "report: refused stale Activation" ? { ...run, executed: () => false } : run));
    assert.ok(exitInventory(MODEL, altered).violations.some((violation) => violation.startsWith("report: refused stale Activation:")), "declared exit not taken");
  });
  test("a declaration matching more than one return", () => {
    const altered = runs().map((run) => (run.name === "outcome: refused stale Activation" ? { ...run, exit: ["submitOutcome", "return err("] as const } : run));
    assert.ok(exitInventory(MODEL, altered).violations.some((violation) => violation.includes("matches")), "ambiguous declaration");
  });
});
