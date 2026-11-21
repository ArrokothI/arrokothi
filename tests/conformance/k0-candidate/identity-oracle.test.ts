/**
 * K1.4-candidate: the identity oracle's declared matrix (design 05 §4 and §5) and design 05 addendum 01's controls.
 *
 * Everything the matrix expects is declared here before the oracle runs: the 75 cases with their class, row key
 * and number of calls; the 62 row keys, 26 slots and 3 delivery slots; the 15 operators with their domains and
 * codes; and each operator's count, computed from the declaration and also written out. Each mutation edits one
 * genuine laboratory record in one declared dimension and must get exactly its operator's code. No expected code
 * or count is read from the oracle.
 *
 * Addendum 01's missing-value and report-arity controls are reported separately and add nothing to the matrix.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";

import type { Command, Observation } from "../k0/fixture.ts";
import {
  acceptCommand,
  AnswerContradiction,
  COORDINATOR_METHODS,
  createCommand,
  dispatchCommand,
  judge,
  outcomeOf,
  registerWait,
  ROWS,
  startLab,
  timerCommand,
  UnknownLaboratoryReference,
  waitDeclaration,
} from "./identity-lab.ts";
import type { CallRecord, DeliverySettlement, ExecutionView, Lab, ReportRecord, StepRecord } from "./identity-lab.ts";

// -- The declaration ------------------------------------------------------------------------------------------------

/** Design 04 Table 1, written again here: the methods of each kind's row. The test checks the oracle's agrees. */
const TABLE_1: Readonly<Record<string, readonly string[]>> = {
  create: ["createExecution", "inspect"],
  create_retry: ["createExecution", "inspect"],
  accept_event: ["submitInput", "inspect"],
  dispatch: ["dispatch", "inspect"],
  redeliver_dispatch: ["redeliver", "inspect"],
  submit_outcome: ["submitOutcome", "inspect"],
  resubmit_outcome: ["submitOutcome", "inspect"],
  accept_cancellation: ["cancelExecution", "inspect"],
  deliver_timer: ["pendingTimers", "fireTimer", "inspect"],
  recover: ["inspect", "recoverExecution", "inspect"],
  takeover: ["inspect", "requestTakeover", "inspect"],
  inspect: ["inspect"],
};
const KINDS = Object.keys(TABLE_1);
/** The slots where the Kernel delivers to the Driver in an honest run (design 05 §4). */
const DELIVERY_SLOTS = ["dispatch@0", "redeliver_dispatch@0", "takeover@1"];
const DELIVERING_KINDS = ["dispatch", "redeliver_dispatch", "takeover"];

/** O: an Observation; X: a contradiction after the whole row; P: the early contradiction; U: an unknown reference; N: `answer`. */
type CaseClass = "O" | "X" | "P" | "U" | "N";
interface Case {
  readonly name: string;
  readonly cls: CaseClass;
  readonly kind: string;
  readonly row: string;
  /** The number of calls the case's last record makes, declared. */
  readonly calls: number;
  /** For N: which Execution a swallowing adapter would inspect. */
  readonly swallowAt?: "x" | "y";
  readonly records: readonly StepRecord[];
}

const rowLength = (kind: string): number => (TABLE_1[kind] as readonly string[]).length;

/** Design 05 §4, the main run: two Executions, 30 commands. */
function mainRun(): Case[] {
  const lab = startLab();
  const cases: Case[] = [];
  const step = (name: string, cls: "O" | "U", command: Command): Observation | null => {
    const record = lab.attempt(command);
    cases.push({ name, cls, kind: command.kind, row: `${command.kind} ${cls === "U" ? "unknown" : "observation"}`, calls: cls === "U" ? 0 : rowLength(command.kind), records: [...lab.records] });
    return record.observation;
  };
  step("M1 create x", "O", createCommand("x", "kx"));
  step("M2 create y", "O", createCommand("y", "ky"));
  step("M3 create_retry x, replay", "O", createCommand("x", "kx", "create_retry"));
  step("M4 create_retry x, duplicate_conflict", "O", createCommand("x", "kx", "create_retry", "other-initial"));
  step("M5 accept_event a to x", "O", acceptCommand("a", "x", "ka"));
  step("M6 inspect y", "O", { kind: "inspect", executionId: "y" });
  step("M7 dispatch x", "O", dispatchCommand("x"));
  step("M8 redeliver_dispatch x", "O", { kind: "redeliver_dispatch", executionId: "x" });
  step("M9 takeover x", "O", { kind: "takeover", executionId: "x" });
  const recovered = step("M10 recover x", "O", { kind: "recover", executionId: "x", availableDefinitionRevisions: ["identity-lab@1"] }) as Observation;
  step("M11 submit_outcome, malformed_envelope", "O", { kind: "submit_outcome", outcome: { ...outcomeOf(recovered, { step: "continue" }), emissions: [{ emissionId: "e", value: 1 }, { emissionId: "e", value: 2 }] } });
  const current = step("M12 inspect x", "O", { kind: "inspect", executionId: "x" }) as Observation;
  const awaited = outcomeOf(current, { step: "await", wait: waitDeclaration("g1", 10) });
  step("M13 submit_outcome await g1", "O", { kind: "submit_outcome", outcome: awaited });
  step("M14 resubmit_outcome, replay", "O", { kind: "resubmit_outcome", outcome: awaited });
  step("M15 deliver_timer x g1, expired", "O", timerCommand("x", "g1", "t1"));
  step("M16 deliver_timer x g1, duplicate", "O", timerCommand("x", "g1", "t1"));
  step("M17 inspect y", "O", { kind: "inspect", executionId: "y" });
  step("M18 dispatch nobody", "U", { kind: "dispatch", executionId: "nobody", bound: 1 });
  step("M19 redeliver_dispatch nobody", "U", { kind: "redeliver_dispatch", executionId: "nobody" });
  step("M20 accept_cancellation nobody", "U", { kind: "accept_cancellation", executionId: "nobody" });
  step("M21 recover nobody", "U", { kind: "recover", executionId: "nobody", availableDefinitionRevisions: [] });
  step("M22 takeover nobody", "U", { kind: "takeover", executionId: "nobody" });
  step("M23 inspect nobody", "U", { kind: "inspect", executionId: "nobody" });
  step("M24 accept_event b to nobody", "U", acceptCommand("b", "nobody", "kb"));
  step("M25 submit_outcome to nobody", "U", { kind: "submit_outcome", outcome: { ...awaited, executionId: "nobody" } });
  step("M26 resubmit_outcome to nobody", "U", { kind: "resubmit_outcome", outcome: { ...awaited, executionId: "nobody" } });
  step("M27 deliver_timer nobody g1", "U", timerCommand("nobody", "g1", "t9"));
  step("M28 deliver_timer x nogen", "U", timerCommand("x", "nogen", "t9"));
  step("M29 accept_cancellation x", "O", { kind: "accept_cancellation", executionId: "x" });
  step("M30 accept_event late to x, ingressRefused", "O", acceptCommand("late", "x", "kl"));
  return cases;
}

/** Design 05 §4's per-kind prefix on a fresh lab, and the kind's command. */
function prepare(lab: Lab, kind: string): Command {
  lab.apply(createCommand("x", "kx"));
  lab.apply(createCommand("y", "ky"));
  let open: Observation | null = null;
  if (["redeliver_dispatch", "submit_outcome", "resubmit_outcome", "recover", "takeover"].includes(kind)) open = lab.apply(dispatchCommand("x"));
  if (kind === "deliver_timer") registerWait(lab, "x", "g1", 10);
  const outcome = open === null ? null : outcomeOf(open, { step: "continue" });
  if (kind === "resubmit_outcome") lab.apply({ kind: "submit_outcome", outcome: outcome as NonNullable<typeof outcome> });
  switch (kind) {
    case "create":
      return createCommand("z", "kz");
    case "create_retry":
      return createCommand("x", "kx", "create_retry");
    case "accept_event":
      return acceptCommand("a", "x", "ka");
    case "dispatch":
      return dispatchCommand("x");
    case "submit_outcome":
    case "resubmit_outcome":
      return { kind, outcome: outcome as NonNullable<typeof outcome> };
    case "deliver_timer":
      return timerCommand("x", "g1", "t1");
    case "recover":
      return { kind, executionId: "x", availableDefinitionRevisions: ["identity-lab@1"] };
    default:
      return { kind, executionId: "x" } as Command;
  }
}

/** F1–F14: the command's inspection number `at` describes `<id>-other`. */
function faultCase(name: string, kind: string, at: number, preliminary: boolean): Case {
  let armed = false;
  let seen = 0;
  const lab = startLab({ faults: { view: (view) => (armed && seen++ === at ? ({ ...view, executionId: `${view.executionId}-other` } as ExecutionView) : view) } });
  const command = prepare(lab, kind);
  armed = true;
  lab.attempt(command);
  return { name, cls: preliminary ? "P" : "X", kind, row: `${kind} ${preliminary ? "preliminary" : "contradiction"}`, calls: preliminary ? 1 : rowLength(kind), records: [...lab.records] };
}

/** The laboratory's answer fault for A1–A26: a value outside the slot's continuing classes. */
const unprojectable = (method: string): unknown =>
  method === "pendingTimers"
    ? null
    : method === "fireTimer"
      ? { result: "unknown", reason: "lab fault", timeoutEventId: null }
      : { ok: false, error: { classification: "lab_fault", reason: "lab fault", position: 0, executionId: null } };

/** A run of `kind` whose answer at `slot` is replaced by `replacement(method)`. Returns the lab. */
function answerFaulted(kind: string, slot: number, replacement: (method: string) => unknown): Lab {
  let armed = false;
  let index = 0;
  const lab = startLab({ faults: { answer: (method, _args, answer) => (armed && index++ === slot ? replacement(method) : answer) } });
  const command = prepare(lab, kind);
  armed = true;
  lab.attempt(command);
  armed = false;
  return lab;
}

/** G1–G5: genuine Kernel answers outside the continuing classes. */
function genuineCases(): Case[] {
  const cases: Case[] = [];
  const take = (name: string, kind: string, slot: number, swallowAt: "x" | "y", body: (lab: Lab) => Command): void => {
    const lab = startLab();
    lab.apply(createCommand("x", "kx"));
    lab.apply(createCommand("y", "ky"));
    lab.attempt(body(lab));
    cases.push({ name, cls: "N", kind, row: `${kind} answer@${slot}`, calls: slot + 1, swallowAt, records: [...lab.records] });
  };
  take("G1 dispatch x again, exchange_unresolved", "dispatch", 0, "x", (lab) => {
    lab.apply(dispatchCommand("x"));
    return dispatchCommand("x");
  });
  take("G2 redeliver_dispatch y, no_unresolved_exchange", "redeliver_dispatch", 0, "y", () => ({ kind: "redeliver_dispatch", executionId: "y" }));
  take("G3 takeover x under a code hold, recovery_held", "takeover", 1, "x", (lab) => {
    lab.apply(dispatchCommand("x"));
    lab.apply({ kind: "recover", executionId: "x", availableDefinitionRevisions: [] });
    return { kind: "takeover", executionId: "x" };
  });
  take("G4 recover y, no open exchange", "recover", 0, "y", () => ({ kind: "recover", executionId: "y", availableDefinitionRevisions: ["identity-lab@1"] }));
  take("G5 takeover y, no open exchange", "takeover", 0, "y", () => ({ kind: "takeover", executionId: "y" }));
  return cases;
}

function corpus(): Case[] {
  const cases = mainRun();
  KINDS.forEach((kind, index) => cases.push(faultCase(`F${index + 1} ${kind}, final inspection`, kind, kind === "recover" || kind === "takeover" ? 1 : 0, false)));
  cases.push(faultCase("F13 recover, preliminary inspection", "recover", 0, true), faultCase("F14 takeover, preliminary inspection", "takeover", 0, true));
  let number = 0;
  for (const kind of KINDS) {
    for (let slot = 0; slot < rowLength(kind); slot += 1) {
      number += 1;
      const lab = answerFaulted(kind, slot, unprojectable);
      cases.push({ name: `A${number} ${kind} slot ${slot}`, cls: "N", kind, row: `${kind} answer@${slot}`, calls: slot + 1, swallowAt: "x", records: [...lab.records] });
    }
  }
  cases.push(...genuineCases());
  return cases;
}

// -- The operators ---------------------------------------------------------------------------------------------------

const COMPONENTS = ["command", "calls", "deliveries", "reports", "observation", "thrown"] as const;
type Component = (typeof COMPONENTS)[number];
const changedComponents = (a: StepRecord, b: StepRecord): Component[] => COMPONENTS.filter((key) => !isDeepStrictEqual(a[key], b[key]));

const retargeted = (call: CallRecord, other: string): CallRecord => {
  const args = [...call.args];
  if (call.method === "submitInput") args[1] = { ...(args[1] as object), destination: other };
  else if (call.method === "submitOutcome") args[1] = { ...(args[1] as object), executionId: other };
  else if (call.method === "fireTimer") args[0] = { ...(args[0] as object), executionId: other };
  else args[1] = other;
  return { ...call, args };
};

/** Each operator's count, from the declaration alone (design 05 §5). */
function declaredCounts(cases: readonly Case[]): Record<string, number> {
  const of = (...classes: CaseClass[]): Case[] => cases.filter((entry) => classes.includes(entry.cls));
  const sum = (list: readonly Case[], value: (entry: Case) => number): number => list.reduce((total, entry) => total + value(entry), 0);
  const whole = of("O", "X");
  const slots = whole.flatMap((entry) => (TABLE_1[entry.kind] as readonly string[]).map((method, index) => ({ method, final: index === rowLength(entry.kind) - 1 && entry.kind !== "inspect" })));
  const count = (method: string): number => slots.filter((slot) => slot.method === method).length;
  const retargetable = slots.filter((slot) => slot.method !== "createExecution" && slot.method !== "pendingTimers");
  return {
    "drop call-missing": sum(of("O", "X", "P", "N"), (entry) => entry.calls),
    "swap call-method": 12 * sum(whole, (entry) => entry.calls),
    "insert call-extra": 13 * (sum(whole, (entry) => entry.calls + 1) + of("P").length + of("U").length),
    "retarget target": retargetable.filter((slot) => !slot.final).length,
    "retarget inspection": retargetable.filter((slot) => slot.final).length,
    "arity target": count("pendingTimers"),
    "fire-generation target": count("fireTimer"),
    "fire-kind target": count("fireTimer"),
    "exchange-activation target": count("recoverExecution") + count("requestTakeover"),
    "exchange-epoch target": count("requestTakeover"),
    "other-inspection inspection": of("O").filter((entry) => entry.kind !== "inspect").length,
    "field inspection": 5 * of("O").length,
    "exit exit": 3 * of("O").length + 3 * of("X", "P").length + 2 * of("U").length,
    "swallow-inspect answer": of("N").length,
    "swallow-previous answer": of("N").length,
    "report-drop report-missing": whole.filter((entry) => DELIVERING_KINDS.includes(entry.kind)).length,
    "report-duplicate report-extra": whole.filter((entry) => DELIVERING_KINDS.includes(entry.kind)).length,
    "report-failed report-method": whole.filter((entry) => DELIVERING_KINDS.includes(entry.kind)).length,
    "report-owner report-delivery": whole.filter((entry) => DELIVERING_KINDS.includes(entry.kind)).length,
    "report-outside report-extra": whole.filter((entry) => DELIVERING_KINDS.includes(entry.kind)).length,
  };
}

/** Design 05 §5's table, written out. */
const WRITTEN_COUNTS: Readonly<Record<string, number>> = {
  "drop call-missing": 116,
  "swap call-method": 780,
  "insert call-extra": 1417,
  "retarget target": 29,
  "retarget inspection": 27,
  "arity target": 3,
  "fire-generation target": 3,
  "fire-kind target": 3,
  "exchange-activation target": 4,
  "exchange-epoch target": 2,
  "other-inspection inspection": 16,
  "field inspection": 95,
  "exit exit": 121,
  "swallow-inspect answer": 31,
  "swallow-previous answer": 31,
  "report-drop report-missing": 6,
  "report-duplicate report-extra": 6,
  "report-failed report-method": 6,
  "report-owner report-delivery": 6,
  "report-outside report-extra": 6,
};

const codesOf = (records: readonly StepRecord[]): string[] => judge({ records }).problems.map((problem) => problem.split(":")[0] as string);

describe("K1.4-candidate identity oracle: the declared matrix (design 05 §4 and §5)", () => {
  const cases = corpus();
  const x = ((cases[0] as Case).records[0] as StepRecord).view?.executionId as string;
  const y = ((cases[1] as Case).records[1] as StepRecord).view?.executionId as string;

  test("the declaration: Table 1 agrees with the oracle's, and the counts follow from the cases", () => {
    assert.deepEqual(Object.fromEntries(Object.entries(ROWS).map(([kind, row]) => [kind, row.map((slot) => slot.method)])), TABLE_1);
    const sizes = (["O", "X", "P", "U", "N"] as const).map((cls) => cases.filter((entry) => entry.cls === cls).length);
    assert.deepEqual(sizes, [19, 12, 2, 11, 31]);
    assert.deepEqual(declaredCounts(cases), WRITTEN_COUNTS);
    assert.equal(Object.values(WRITTEN_COUNTS).reduce((total, value) => total + value, 0), 2708);
  });

  test("pristine: every case has its declared row and calls, its prefix passes, and it reaches its declared exit", () => {
    const rows = new Set([
      ...KINDS.map((kind) => `${kind} observation`),
      ...KINDS.map((kind) => `${kind} contradiction`),
      ...KINDS.filter((kind) => !kind.startsWith("create")).map((kind) => `${kind} unknown`),
      "recover preliminary",
      "takeover preliminary",
      ...KINDS.flatMap((kind) => (TABLE_1[kind] as readonly string[]).map((_, slot) => `${kind} answer@${slot}`)),
    ]);
    assert.equal(rows.size, 62);
    assert.deepEqual(new Set(cases.map((entry) => entry.row)), rows);
    const slots = new Set<string>();
    const deliverySlots = new Set<string>();
    for (const entry of cases) {
      const record = entry.records.at(-1) as StepRecord;
      assert.equal(record.calls.length, entry.calls, `${entry.name}: its declared calls`);
      assert.deepEqual(codesOf(entry.records.slice(0, -1)), [], `${entry.name}: its prefix passes`);
      const before = judge({ records: entry.records.slice(0, -1) }).counts;
      const judged = judge({ records: entry.records });
      const moved = [judged.counts.observations - before.observations, judged.counts.contradictions - before.contradictions, judged.counts.unknownReferences - before.unknownReferences];
      if (entry.cls === "N") {
        assert.deepEqual(codesOf(entry.records), ["answer"], `${entry.name}: a declared failure`);
        assert.deepEqual(moved, [0, 0, 0], `${entry.name}: no Observation, contradiction or unknown reference is counted`);
        continue;
      }
      assert.deepEqual(judged.problems, [], `${entry.name}: passes`);
      assert.deepEqual(moved, entry.cls === "O" ? [1, 0, 0] : entry.cls === "U" ? [0, 0, 1] : [0, 1, 0], `${entry.name}: its exit`);
      if (entry.cls === "O" || entry.cls === "X") {
        record.calls.forEach((call, index) => {
          assert.equal(call.method, TABLE_1[entry.kind]?.[index], `${entry.name}: slot ${index}`);
          slots.add(`${entry.kind}@${index}`);
        });
        for (const delivery of record.deliveries) {
          assert.equal(record.reports.filter((report) => report.during === delivery.number).length, 1, `${entry.name}: delivery ${delivery.number} has its report`);
          deliverySlots.add(`${entry.kind}@${delivery.inCall}`);
        }
      }
    }
    assert.equal(slots.size, 26);
    assert.deepEqual([...deliverySlots].sort(), DELIVERY_SLOTS);
  });

  test("every operator over its declared domain: one mutation, exactly its code (2,708)", () => {
    const tally = new Map<string, number>();
    // The donors: the first O call of each method, the inspection being one of y; two constructed records.
    const donors = new Map<string, CallRecord>();
    for (const entry of cases.filter((candidate) => candidate.cls === "O")) {
      for (const call of (entry.records.at(-1) as StepRecord).calls) {
        if (!donors.has(call.method) && (call.method !== "inspect" || call.args[1] === y)) donors.set(call.method, call);
      }
    }
    for (const method of ["visibleExecutions", "reportProtocolFailure"]) donors.set(method, { method, args: [{}, y], answer: { ok: true, value: [] } });
    assert.deepEqual([...donors.keys()].sort(), [...COORDINATOR_METHODS].sort());
    const finalInspectionOf = new Map<string, StepRecord>();
    for (const name of ["M12 inspect x", "M17 inspect y"]) {
      const record = (cases.find((entry) => entry.name === name) as Case).records.at(-1) as StepRecord;
      finalInspectionOf.set(record.view?.executionId as string, record);
    }

    const expect = (operator: string, code: string, entry: Case, mutated: StepRecord, dimension: readonly Component[]): void => {
      const label = `${operator} on ${entry.name}`;
      const pristine = entry.records.at(-1) as StepRecord;
      assert.deepEqual(changedComponents(pristine, mutated), dimension, `${label}: changes only ${dimension.join(", ")}`);
      const judged = judge({ records: [...entry.records.slice(0, -1), mutated] });
      assert.equal(judged.counts.commands, entry.records.length, `${label}: every record was judged`);
      assert.equal(judged.counts.unjudged, 0, label);
      assert.deepEqual(judged.problems.map((problem) => problem.split(":")[0]), [code], label);
      tally.set(`${operator} ${code}`, (tally.get(`${operator} ${code}`) ?? 0) + 1);
    };

    for (const entry of cases) {
      const record = entry.records.at(-1) as StepRecord;
      const n = record.calls.length;
      const whole = entry.cls === "O" || entry.cls === "X";
      const own = (record.calls.findLast((call) => call.method === "inspect")?.args[1] as string | undefined) ?? x;
      const other = own === y ? x : y;
      const previous = entry.records.slice(0, -1).findLast((candidate) => candidate.observation !== null)?.observation ?? null;
      const withCalls = (calls: readonly CallRecord[]): StepRecord => ({ ...record, calls });
      const replaced = (j: number, call: CallRecord): StepRecord => withCalls(record.calls.map((current, index) => (index === j ? call : current)));

      if (entry.cls !== "U") for (let j = 0; j < n; j += 1) expect("drop", "call-missing", entry, withCalls(record.calls.filter((_, index) => index !== j)), ["calls"]);
      if (whole) {
        for (let j = 0; j < n; j += 1) {
          for (const method of COORDINATOR_METHODS) if (method !== record.calls[j]?.method) expect("swap", "call-method", entry, replaced(j, { ...(record.calls[j] as CallRecord), method }), ["calls"]);
        }
      }
      if (entry.cls !== "N") {
        const positions = whole ? [...Array(n + 1).keys()] : [n];
        for (const j of positions) {
          for (const method of COORDINATOR_METHODS) expect("insert", "call-extra", entry, withCalls([...record.calls.slice(0, j), donors.get(method) as CallRecord, ...record.calls.slice(j)]), ["calls"]);
        }
      }
      if (whole) {
        for (let j = 0; j < n; j += 1) {
          const call = record.calls[j] as CallRecord;
          const final = j === n - 1 && entry.kind !== "inspect";
          if (call.method === "pendingTimers") expect("arity", "target", entry, replaced(j, { ...call, args: [other] }), ["calls"]);
          else if (call.method !== "createExecution") expect("retarget", final ? "inspection" : "target", entry, replaced(j, retargeted(call, other)), ["calls"]);
          if (call.method === "fireTimer") {
            const key = call.args[0] as { readonly generation: number; readonly kind: string };
            expect("fire-generation", "target", entry, replaced(j, { ...call, args: [{ ...key, generation: key.generation + 7 }] }), ["calls"]);
            expect("fire-kind", "target", entry, replaced(j, { ...call, args: [{ ...key, kind: "execution_deadline" }] }), ["calls"]);
          }
          if (call.method === "recoverExecution" || call.method === "requestTakeover") {
            const exchange = call.args[2] as { readonly activationId: string; readonly writerEpoch?: number };
            expect("exchange-activation", "target", entry, replaced(j, { ...call, args: [call.args[0], call.args[1], { ...exchange, activationId: `${exchange.activationId}-other` }] }), ["calls"]);
            if (call.method === "requestTakeover") expect("exchange-epoch", "target", entry, replaced(j, { ...call, args: [call.args[0], call.args[1], { ...exchange, writerEpoch: (exchange.writerEpoch as number) + 1 }] }), ["calls"]);
          }
        }
      }
      if (entry.cls === "O") {
        const observation = record.observation as Observation;
        if (entry.kind !== "inspect") {
          const donor = finalInspectionOf.get(other) as StepRecord;
          expect("other-inspection", "inspection", entry, { ...record, calls: [...record.calls.slice(0, -1), ...donor.calls], observation: donor.observation }, ["calls", "observation"]);
        }
        const fields: [keyof Observation, unknown][] = [
          ["state", observation.state === "READY" ? "RUNNING" : "READY"],
          ["progressRevision", observation.progressRevision + 1],
          ["activationId", observation.activationId === null ? "lab-activation" : null],
          ["writerEpoch", observation.writerEpoch + 1],
          ["acceptedDeadline", observation.acceptedDeadline === null ? 999 : null],
        ];
        for (const [field, value] of fields) expect("field", "inspection", entry, { ...record, observation: { ...observation, [field]: value } as Observation }, ["observation"]);
        expect("exit", "exit", entry, { ...record, observation: null, thrown: new AnswerContradiction("timeout_generation", "spliced") }, ["observation", "thrown"]);
        expect("exit", "exit", entry, { ...record, observation: null, thrown: new UnknownLaboratoryReference("spliced") }, ["observation", "thrown"]);
        expect("exit", "exit", entry, { ...record, observation: null, thrown: new Error("spliced") }, ["observation", "thrown"]);
      } else if (entry.cls === "X" || entry.cls === "P") {
        const code = (record.thrown as AnswerContradiction).code;
        expect("exit", "exit", entry, { ...record, observation: previous, thrown: undefined }, ["observation", "thrown"]);
        expect("exit", "exit", entry, { ...record, thrown: new AnswerContradiction(code === "execution" ? "input_entry" : "execution", "spliced") }, ["thrown"]);
        expect("exit", "exit", entry, { ...record, thrown: new UnknownLaboratoryReference("spliced") }, ["thrown"]);
      } else if (entry.cls === "U") {
        expect("exit", "exit", entry, { ...record, observation: previous, thrown: undefined }, ["observation", "thrown"]);
        expect("exit", "exit", entry, { ...record, thrown: new AnswerContradiction("execution", "spliced") }, ["thrown"]);
      } else {
        const native = ((entry.records[entry.swallowAt === "y" ? 1 : 0] as StepRecord).view as ExecutionView).executionId;
        const donor = entry.records.slice(0, -1).findLast((candidate) => candidate.observation !== null && candidate.view?.executionId === native) as StepRecord;
        expect("swallow-inspect", "answer", entry, { ...record, calls: [...record.calls, donor.calls.at(-1) as CallRecord], observation: donor.observation, thrown: undefined }, ["calls", "observation", "thrown"]);
        expect("swallow-previous", "answer", entry, { ...record, observation: previous, thrown: undefined }, ["observation", "thrown"]);
      }
      if (whole && DELIVERING_KINDS.includes(entry.kind)) {
        const report = record.reports[0] as ReportRecord;
        const withReports = (reports: readonly ReportRecord[]): StepRecord => ({ ...record, reports });
        expect("report-drop", "report-missing", entry, withReports([]), ["reports"]);
        expect("report-duplicate", "report-extra", entry, withReports([report, report]), ["reports"]);
        expect("report-failed", "report-method", entry, withReports([{ ...report, method: "failed", args: ["lab"] }]), ["reports"]);
        expect("report-owner", "report-delivery", entry, withReports([{ ...report, owner: report.owner === 1 ? 2 : report.owner - 1 }]), ["reports"]);
        expect("report-outside", "report-extra", entry, withReports([{ ...report, during: null }]), ["reports"]);
      }
    }
    assert.deepEqual(Object.fromEntries([...tally].sort(([a], [b]) => (a < b ? -1 : 1))), Object.fromEntries(Object.entries(WRITTEN_COUNTS).sort(([a], [b]) => (a < b ? -1 : 1))));
  });
});

describe("K1.4-candidate identity oracle: design 05 addendum 01's controls (D05-CHK-01)", () => {
  /** The prefix's last genuine final inspection of x, with its Observation. */
  const genuineX = (records: readonly StepRecord[]): StepRecord => {
    const native = (records[0]?.view as ExecutionView).executionId;
    return records.findLast((record) => record.observation !== null && record.view?.executionId === native) as StepRecord;
  };

  const MISSING_VALUES: readonly (readonly [name: string, kind: string, slot: number, answer: unknown])[] = [
    ["V1 createExecution", "create", 0, { ok: true }],
    ["V2 submitInput", "accept_event", 0, { ok: true }],
    ["V3 submitOutcome", "submit_outcome", 0, { ok: true }],
    ["V4 recover, preliminary inspection, absent view", "recover", 0, { ok: true }],
    ["V5 recover, preliminary inspection, null view", "recover", 0, { ok: true, value: null }],
    ["V6 takeover, preliminary inspection, absent view", "takeover", 0, { ok: true }],
    ["V7 takeover, preliminary inspection, null view", "takeover", 0, { ok: true, value: null }],
    ["V8 dispatch, final inspection, absent view", "dispatch", 1, { ok: true }],
    ["V9 dispatch, final inspection, null view", "dispatch", 1, { ok: true, value: null }],
    ["V10 inspect, its one inspection, absent view", "inspect", 0, { ok: true }],
    ["V11 inspect, its one inspection, null view", "inspect", 0, { ok: true, value: null }],
  ];

  for (const [name, kind, slot, answer] of MISSING_VALUES) {
    test(`${name}: answer, thrown or swallowed; the valued answer passes`, () => {
      const honest = startLab();
      honest.attempt(prepare(honest, kind));
      assert.deepEqual(codesOf(honest.records), [], "the genuine, valued answer passes");

      const lab = answerFaulted(kind, slot, () => answer);
      const records = lab.records;
      const prefix = records.slice(0, -1);
      const record = records.at(-1) as StepRecord;
      assert.deepEqual(record.calls[slot]?.answer, answer, "the fault reached the slot");
      assert.notEqual(record.thrown, undefined, "the adapter threw");
      const previous = prefix.findLast((candidate) => candidate.observation !== null)?.observation ?? null;
      const donor = genuineX(prefix);
      const variants: [string, StepRecord][] = [
        ["as the adapter left it", record],
        ["the previous Observation substituted", { ...record, observation: previous, thrown: undefined }],
        ["a genuine inspection of x appended and its Observation substituted", { ...record, calls: [...record.calls, donor.calls.at(-1) as CallRecord], observation: donor.observation, thrown: undefined }],
      ];
      const before = judge({ records: prefix }).counts;
      for (const [variant, broken] of variants) {
        const judged = judge({ records: [...prefix, broken] });
        assert.deepEqual(judged.problems.map((problem) => problem.split(":")[0]), ["answer"], `${variant}`);
        assert.deepEqual([judged.counts.observations, judged.counts.contradictions], [before.observations, before.contradictions], `${variant}: nothing counted`);
      }
    });
  }

  test("report arity: delivered(\"lab\") with every other field kept is report-method; the bare delivered() passes", () => {
    const run = (argument: boolean): Lab => {
      const lab = startLab({
        tamper: {
          delivery: (context) =>
            context.forward(
              argument ? ({ delivered: () => (context.recording.delivered as (...args: unknown[]) => void)("lab"), failed: context.recording.failed } as DeliverySettlement) : context.recording,
            ),
        },
      });
      lab.apply(createCommand("x", "kx"));
      lab.attempt(dispatchCommand("x"));
      return lab;
    };
    const honest = run(false);
    const broken = run(true);
    assert.deepEqual(codesOf(honest.records), []);
    assert.deepEqual(codesOf(broken.records), ["report-method"]);
    const [kept, changed] = [(honest.records.at(-1) as StepRecord).reports[0] as ReportRecord, (broken.records.at(-1) as StepRecord).reports[0] as ReportRecord];
    assert.deepEqual(changed, { ...kept, args: ["lab"] }, "only the arguments differ");
  });
});
