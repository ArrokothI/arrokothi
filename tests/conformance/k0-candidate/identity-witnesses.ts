/**
 * K1.4-candidate: the targeted witnesses of the identity mechanism (design 03 addendum 01 §A4).
 *
 * One witness per row of `identity-mutants.ts`. A witness drives the candidate through the identity lab
 * and returns the names of the assertions that failed; an empty list is a pass. Two runners read them:
 * `identity.test.ts`, which requires every witness to pass in this tree and to fail on its row's edit,
 * and `identity-probe.mjs`, which the mutation registry runs.
 *
 * What counts as a failed assertion, and what does not:
 * - a wrong string, state or target, and any problem the oracle reports, is a failed assertion;
 * - an Observation that was expected and came back as `UnknownLaboratoryReference` or
 *   `AnswerContradiction`, or such a throw that was expected and did not happen, is a failed assertion;
 * - any other error is not caught here. It reaches the runner as a crash, which is an invalid run and
 *   never a kill.
 *
 * Test-side only. The candidate does not import this file.
 */

import type { Command, Observation } from "../k0/fixture.ts";
import { acceptCommand, AnswerContradiction, createCommand, dispatchCommand, judge, registerWait, shownGeneration, startLab, timerCommand, UnknownLaboratoryReference } from "./identity-lab.ts";
import type { ExecutionView, Faults, Lab, StepRecord } from "./identity-lab.ts";

/** Ends a witness after an assertion failed that later steps depend on. */
class Halt extends Error {}

export class Witness {
  readonly problems: string[] = [];
  readonly labs: Lab[] = [];

  lab(faults?: Faults): Lab {
    const lab = faults === undefined ? startLab() : startLab({ faults });
    this.labs.push(lab);
    return lab;
  }

  ok(name: string, condition: boolean, detail = ""): void {
    if (!condition) this.problems.push(detail === "" ? name : `${name}: ${detail}`);
  }

  equal(name: string, actual: unknown, expected: unknown): void {
    const [left, right] = [JSON.stringify(actual), JSON.stringify(expected)];
    this.ok(name, left === right, `expected ${right}, got ${left}`);
  }

  distinct(name: string, strings: readonly string[]): void {
    this.ok(name, new Set(strings).size === strings.length, `the strings are not distinct: ${JSON.stringify(strings)}`);
  }

  /** The Observation of a command that must succeed. A declared refusal is a failed assertion and ends the witness. */
  observe(name: string, lab: Lab, command: Command): Observation {
    const record = lab.attempt(command);
    if (record.observation !== null) return record.observation;
    if (record.thrown instanceof UnknownLaboratoryReference || record.thrown instanceof AnswerContradiction) {
      this.problems.push(`${name}: expected an Observation, and the candidate threw ${record.thrown.name}: ${record.thrown.message}`);
      throw new Halt();
    }
    throw record.thrown;
  }

  /** A command that must end in `AnswerContradiction` with this code. */
  contradiction(name: string, lab: Lab, command: Command, code: string): void {
    const record = lab.attempt(command);
    if (record.thrown instanceof AnswerContradiction) this.ok(name, record.thrown.code === code, `expected ${code}, got ${record.thrown.code}`);
    else if (record.observation !== null) this.problems.push(`${name}: expected AnswerContradiction (${code}), and the candidate returned an Observation`);
    else if (record.thrown instanceof UnknownLaboratoryReference) this.problems.push(`${name}: expected AnswerContradiction (${code}), and the candidate threw ${record.thrown.name}`);
    else throw record.thrown;
  }

  /** A reference that must be refused as denoting nothing. */
  unknown(name: string, lab: Lab, command: Command): void {
    const record = lab.attempt(command);
    if (record.thrown instanceof UnknownLaboratoryReference) return;
    if (record.observation !== null || record.thrown instanceof AnswerContradiction) this.problems.push(`${name}: expected UnknownLaboratoryReference`);
    else throw record.thrown;
  }
}

/** Runs a witness body and returns the failed assertions, including every problem the oracle reports. */
export function runWitness(body: (witness: Witness) => void): string[] {
  const witness = new Witness();
  try {
    body(witness);
  } catch (error) {
    if (!(error instanceof Halt)) throw error;
  }
  witness.labs.forEach((lab, index) => {
    for (const problem of judge(lab).problems) witness.problems.push(`oracle, lab ${index}: ${problem}`);
  });
  return witness.problems;
}

// -- Small readers of what the lab recorded -----------------------------------------------------------------

export const lastView = (lab: Lab): ExecutionView => {
  const record = lab.records.findLast((candidate) => candidate.view !== null);
  if (record === undefined || record.view === null) throw new Error("the lab has inspected nothing");
  return record.view;
};

/** The Kernel's timeout Event IDs in the last inspected mailbox, in mailbox order. */
export const nativeTimeouts = (lab: Lab): string[] =>
  lastView(lab)
    .mailbox.filter((entry) => entry.sourceCategory === "kernel_timeout")
    .map((entry) => entry.eventId);

/** The native generation the last `fireTimer` call named. */
export const lastFiredGeneration = (lab: Lab): number | null => {
  for (const record of lab.records.toReversed()) {
    const call = record.calls.find((candidate) => candidate.method === "fireTimer");
    if (call !== undefined) return (call.args[0] as { readonly generation: number }).generation;
  }
  return null;
};

export const eventStrings = (observation: Observation): string[] => [...observation.acknowledged, ...observation.queued, ...observation.terminalDispositions];

/** A fault that changes the timeout ID a duplicate fire answers with, and leaves every inspection alone. */
export const answerOnly = (change: (id: string) => string | null, at: (generation: number) => boolean = () => true): Faults => ({
  answer(method, args, answer) {
    const fired = answer as { readonly result?: string; readonly timeoutEventId?: string | null };
    if (method !== "fireTimer" || fired.result !== "duplicate" || typeof fired.timeoutEventId !== "string") return answer;
    if (!at((args[0] as { readonly generation: number }).generation)) return answer;
    return { ...fired, timeoutEventId: change(fired.timeoutEventId) };
  },
});

/**
 * A fault that changes one timeout ID from a duplicate fire on, in the fire's answer and consistently in
 * every inspection after it. `at` picks the fire by its native generation. This is a broken public
 * answer injected for the test, not a claim about the Kernel.
 */
export function changedEverywhere(rename: (id: string) => string, at: (generation: number) => boolean = () => true): Faults & { readonly changed: () => readonly [string, string] | null } {
  let changed: readonly [string, string] | null = null;
  const renamed = (id: string): string => (changed !== null && id === changed[0] ? changed[1] : id);
  return {
    changed: () => changed,
    answer(method, args, answer) {
      const fired = answer as { readonly result?: string; readonly timeoutEventId?: string | null };
      if (method !== "fireTimer" || fired.result !== "duplicate" || typeof fired.timeoutEventId !== "string") return answer;
      if (changed === null && at((args[0] as { readonly generation: number }).generation)) changed = [fired.timeoutEventId, rename(fired.timeoutEventId)];
      return { ...fired, timeoutEventId: renamed(fired.timeoutEventId) };
    },
    view(view) {
      if (changed === null) return view;
      return {
        ...view,
        mailbox: view.mailbox.map((entry) => ({ ...entry, eventId: renamed(entry.eventId) })),
        queued: view.queued.map(renamed),
        acknowledged: view.acknowledged.map(renamed),
        terminalDispositions: view.terminalDispositions.map(renamed),
        activation: view.activation === null ? null : { ...view.activation, batch: view.activation.batch.map(renamed) },
        waitEndedReadiness: view.waitEndedReadiness === null || view.waitEndedReadiness.timeoutEventId === null ? view.waitEndedReadiness : { ...view.waitEndedReadiness, timeoutEventId: renamed(view.waitEndedReadiness.timeoutEventId) },
        retiredWaits: view.retiredWaits.map((retired) => (retired.endingEventId === null ? retired : { ...retired, endingEventId: renamed(retired.endingEventId) })),
      } as ExecutionView;
    },
  };
}

// -- The seven witnesses ----------------------------------------------------------------------------------------

export const WITNESSES: Readonly<Record<string, () => string[]>> = {
  /** A fresh string is a ledger entry: it cannot name another ID, and it resolves. */
  M1: () =>
    runWitness((w) => {
      const lab = w.lab();
      lab.apply(createCommand("x", "kx"));
      registerWait(lab, "x", "alpha", 10);
      w.observe("first fire", lab, timerCommand("x", "alpha", "taken"));
      registerWait(lab, "x", "beta", 20);
      const second = w.observe("second fire under a taken name", lab, timerCommand("x", "beta", "taken"));
      const exposed = second.queued[0] as string;
      w.ok("the second timeout is not shown as the taken name", exposed !== "taken", exposed);
      registerWait(lab, "x", "gamma", 30);
      const third = w.observe("third fire under the copied fresh string", lab, timerCommand("x", "gamma", exposed));
      w.equal("the Kernel minted three timeout Events", new Set(nativeTimeouts(lab)).size, 3);
      w.distinct("three timeouts, three strings", eventStrings(third));

      const executions = w.lab();
      executions.apply(createCommand("dup", "k1"));
      const other = w.observe("a second Execution under a used name", executions, createCommand("dup", "k2"));
      w.ok("it is shown under a fresh string", other.executionId !== "dup", other.executionId);
      const again = w.observe("a reference by the fresh Execution string", executions, { kind: "inspect", executionId: other.executionId });
      w.equal("that reference shows the same Execution", again.executionId, other.executionId);

      const generations = w.lab();
      generations.apply(createCommand("x", "kx"));
      registerWait(generations, "x", "g", 10);
      w.observe("the first generation's fire", generations, timerCommand("x", "g", "t1"));
      const renewed = registerWait(generations, "x", "g", 20);
      const fresh = shownGeneration(renewed);
      w.ok("the second generation is shown under a fresh string", fresh !== "g", fresh);
      const fired = w.observe("a fire by the fresh generation string", generations, timerCommand("x", fresh, "t2"));
      w.equal("that fire reached the live generation", [lastFiredGeneration(generations), fired.state], [2, "READY"]);
    }),

  /** A fresh string is checked against the ledger, variant after variant. */
  M2: () =>
    runWitness((w) => {
      const calibration = startLab();
      calibration.apply(createCommand("x", "kx"));
      registerWait(calibration, "x", "alpha", 10);
      calibration.apply(timerCommand("x", "alpha", "first"));
      registerWait(calibration, "x", "beta", 20);
      calibration.apply(timerCommand("x", "beta", "second"));
      const predicted = `kernel-event:${nativeTimeouts(calibration)[1] as string}`;

      const lab = w.lab();
      lab.apply(createCommand("x", "kx"));
      registerWait(lab, "x", "alpha", 10);
      w.observe("the first timeout takes the second's predicted fresh string", lab, timerCommand("x", "alpha", predicted));
      w.observe("an input takes its ~2 variant", lab, acceptCommand(`${predicted}~2`, "x", "ka"));
      registerWait(lab, "x", "beta", 20);
      const second = w.observe("the second timeout is offered the taken name", lab, timerCommand("x", "beta", predicted));
      w.equal("the run minted the calibrated timeout IDs", nativeTimeouts(lab), nativeTimeouts(calibration));
      w.distinct("every Event string is distinct", eventStrings(second));
      w.equal("the fresh string is the first free variant", second.queued.at(-1), `${predicted}~3`);
    }),

  /** The Q2 b label is a ledger entry like any other name. */
  M3: () =>
    runWitness((w) => {
      const lab = w.lab();
      lab.apply(createCommand("x", "kx"));
      const due = registerWait(lab, "x", "g1", 1);
      w.equal("a wait already due is shown with its label", due.queued, ["to-g1"]);
      const input = w.observe("an input offered the label", lab, acceptCommand("to-g1", "x", "ka"));
      w.distinct("the label and the input are two strings", eventStrings(input));
      registerWait(lab, "x", "g2", 30);
      const fired = w.observe("a timeout offered the label", lab, timerCommand("x", "g2", "to-g1"));
      w.distinct("the label names one Event only", eventStrings(fired));
      w.equal("the labelled timeout kept its label", fired.acknowledged.includes("to-g1"), true);
    }),

  /** An input Event's string comes from the ledger, not from its payload. */
  M4: () =>
    runWitness((w) => {
      const inputs = w.lab();
      inputs.apply(createCommand("x", "kx"));
      w.observe("a first input", inputs, acceptCommand("same", "x", "k1"));
      const second = w.observe("a second input under the same name", inputs, acceptCommand("same", "x", "k2"));
      w.equal("the Kernel holds three input Events", lastView(inputs).mailbox.length, 3);
      w.distinct("two request keys, two strings", eventStrings(second));

      const timeoutFirst = w.lab();
      timeoutFirst.apply(createCommand("x", "kx"));
      registerWait(timeoutFirst, "x", "g1", 10);
      w.observe("a timeout named shared", timeoutFirst, timerCommand("x", "g1", "shared"));
      w.distinct("a timeout, then an input under its name", eventStrings(w.observe("an input named shared", timeoutFirst, acceptCommand("shared", "x", "ka"))));

      const inputFirst = w.lab();
      inputFirst.apply(createCommand("x", "kx"));
      w.observe("an input named shared", inputFirst, acceptCommand("shared", "x", "ka"));
      registerWait(inputFirst, "x", "g1", 10);
      w.distinct("an input, then a timeout under its name", eventStrings(w.observe("a timeout named shared", inputFirst, timerCommand("x", "g1", "shared"))));
    }),

  /** A reference resolves whatever an Observation showed: the old name and the fresh string alike. */
  M5: () =>
    runWitness((w) => {
      const lab = w.lab();
      lab.apply(createCommand("x", "kx"));
      registerWait(lab, "x", "g", 10);
      w.observe("the first generation's fire", lab, timerCommand("x", "g", "t1"));
      const renewed = registerWait(lab, "x", "g", 20);
      const fresh = shownGeneration(renewed);
      w.ok("the second generation is shown under a fresh string", fresh !== "g", fresh);
      const stale = w.observe("a fire by the old name", lab, timerCommand("x", "g", "late"));
      w.equal("the old name still means the first generation", [lastFiredGeneration(lab), stale.state], [1, "WAITING"]);
      const live = w.observe("a fire by the fresh string", lab, timerCommand("x", fresh, "t2"));
      w.equal("the fresh string means the second generation", [lastFiredGeneration(lab), live.state], [2, "READY"]);

      const executions = w.lab();
      const first = w.observe("an Execution named dup", executions, createCommand("dup", "k1"));
      const second = w.observe("a second Execution offered dup", executions, createCommand("dup", "k2"));
      w.ok("it is shown under a fresh string", second.executionId !== first.executionId, second.executionId);
      w.equal("the old name still means the first Execution", w.observe("inspect dup", executions, { kind: "inspect", executionId: "dup" }).executionId, "dup");
      w.equal("native target of the old name", lastView(executions).creationKey, "k1");
      const running = w.observe("the schedule continues on the fresh string", executions, dispatchCommand(second.executionId));
      w.equal("the fresh string means the second Execution", [running.executionId, running.state, lastView(executions).creationKey], [second.executionId, "RUNNING", "k2"]);
    }),

  /** A string an Observation has shown never changes. */
  M6: () =>
    runWitness((w) => {
      const lab = w.lab();
      lab.apply(createCommand("x", "kx"));
      const due = registerWait(lab, "x", "g1", 1);
      w.equal("a wait already due is shown with its label", due.queued, ["to-g1"]);
      const named = w.observe("its first explicit name", lab, timerCommand("x", "g1", "first-name"));
      w.equal("the label stays", named.queued, ["to-g1"]);
      w.equal("nothing else moved", named, due);
    }),

  /** An answer that contradicts the inspection ends the run. */
  M7: () =>
    runWitness((w) => {
      const absent = w.lab(answerOnly((id) => `${id}-absent`));
      absent.apply(createCommand("x", "kx"));
      registerWait(absent, "x", "g1", 10);
      w.observe("the honest first fire", absent, timerCommand("x", "g1", "t1"));
      w.contradiction("a duplicate fire answered with an ID the mailbox does not hold", absent, timerCommand("x", "g1", "t1"), "timeout_generation");

      let firstTimeout = "";
      const crossed = w.lab(answerOnly(() => firstTimeout));
      crossed.apply(createCommand("x", "kx"));
      registerWait(crossed, "x", "g1", 10);
      w.observe("the first generation's fire", crossed, timerCommand("x", "g1", "t1"));
      registerWait(crossed, "x", "g2", 20);
      w.observe("the second generation's fire", crossed, timerCommand("x", "g2", "t2"));
      firstTimeout = nativeTimeouts(crossed)[0] as string;
      w.contradiction("a duplicate fire of the second generation answered with the first's timeout", crossed, timerCommand("x", "g2", "t2"), "timeout_generation");
    }),
};

export type { StepRecord };
