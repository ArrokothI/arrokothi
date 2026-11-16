/**
 * K1.4-candidate: the bounded search over laboratory names (design 03 addendum 01 §A4).
 *
 * Two fixed command skeletons are run with every assignment of names that has **at most two
 * non-ordinary slots**. Nothing is sampled. Every run is judged by the independent oracle of
 * `identity-lab.ts`, which never reads the candidate's ledger.
 *
 * | Part                | Slot sizes                              | Runs  |
 * |---------------------|-----------------------------------------|-------|
 * | Skeleton E, honest  | 10, 6, 10, 7, 11, 11, 8, 11, 11         | 3,282 |
 * | Skeleton E, faults  | 86 assignments x 2 fires x 2 modes      |   344 |
 * | Skeleton X, honest  | 6, 7, 8, 8, 2, 3                        |   500 |
 * | Total               |                                         | 4,126 |
 *
 * A run counts only if it reached its declared end: every command of an honest run returned an
 * Observation or ended in its one legal throw, and a fault run reached its fault. The counts below are
 * asserted, so a truncated or empty search fails.
 *
 * What two slots do not reach, such as a fresh string whose `~2` variant is also taken, is covered by
 * the named witnesses in `identity-witnesses.ts`.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import type { Command, Observation } from "../k0/fixture.ts";
import { acceptCommand, AnswerContradiction, createCommand, dispatchCommand, judge, outcomeOf, startLab, timerCommand, waitDeclaration } from "./identity-lab.ts";
import type { ExecutionView, Faults, Lab, OracleCounts } from "./identity-lab.ts";
import { answerOnly, changedEverywhere, nativeTimeouts } from "./identity-witnesses.ts";

// -- Slots and assignments ------------------------------------------------------------------------------------

/** What a "copy" choice reads when its slot's command is issued. */
interface Context {
  previous: Observation | null;
  /** The last wait-generation string an Observation showed. */
  generation: string | null;
}

/** A name for a slot: fixed text, or read from the run so far. */
type Choice = (context: Context) => string;

interface Slot {
  readonly key: string;
  readonly ordinary: string;
  /** The non-ordinary choices, in the order addendum §A4 lists them. */
  readonly choices: readonly Choice[];
}

type Assignment = ReadonlyMap<string, Choice>;

const fixed = (text: string): Choice => () => text;
const copyEvent: Choice = (context) => {
  const shown = context.previous === null ? [] : [...context.previous.acknowledged, ...context.previous.queued];
  return shown.at(-1) ?? "nothing-shown-yet";
};
const copyGeneration: Choice = (context) => context.generation ?? "nothing-shown-yet";
const copyExecution: Choice = (context) => context.previous?.executionId ?? "nothing-shown-yet";

/** A slot's pool: the family's list, without the slot's own ordinary name and without excluded choices. */
const slot = (key: string, ordinary: string, pool: readonly (readonly [string, Choice])[], without: readonly string[] = []): Slot => ({
  key,
  ordinary,
  choices: pool.filter(([label]) => label !== ordinary && !without.includes(label)).map(([, choice]) => choice),
});

/** Every assignment with at most two non-ordinary slots: none, each single choice, each pair of choices. */
function assignments(slots: readonly Slot[], atMost: 1 | 2): Assignment[] {
  const out: Assignment[] = [new Map()];
  slots.forEach((first, i) => {
    for (const a of first.choices) {
      out.push(new Map([[first.key, a]]));
      if (atMost === 1) continue;
      for (const second of slots.slice(i + 1)) for (const b of second.choices) out.push(new Map([[first.key, a], [second.key, b]]));
    }
  });
  return out;
}

/** The addendum's formula, computed apart from the generator: `1 + sum(m) + sum(i<j) m_i * m_j`. */
const expectedCount = (sizes: readonly number[], atMost: 1 | 2): number => {
  const sum = sizes.reduce((total, size) => total + size, 0);
  const squares = sizes.reduce((total, size) => total + size * size, 0);
  return 1 + sum + (atMost === 2 ? (sum * sum - squares) / 2 : 0);
};

/** Issues commands and keeps the copy context. A run stops at the first command that returns no Observation. */
class Run {
  readonly lab: Lab;
  readonly observations: Observation[] = [];
  readonly context: Context = { previous: null, generation: null };
  readonly #assignment: Assignment;
  readonly #ordinary: ReadonlyMap<string, string>;
  stopped = false;

  constructor(slots: readonly Slot[], assignment: Assignment, faults?: Faults) {
    this.lab = faults === undefined ? startLab() : startLab({ faults });
    this.#assignment = assignment;
    this.#ordinary = new Map(slots.map((entry) => [entry.key, entry.ordinary]));
  }

  name(key: string): string {
    const choice = this.#assignment.get(key);
    return choice === undefined ? (this.#ordinary.get(key) as string) : choice(this.context);
  }

  /** Runs a command. Returns its Observation, or `null` when it threw. */
  step(command: Command): Observation | null {
    if (this.stopped) throw new Error("a stopped run was continued");
    const { observation } = this.lab.attempt(command);
    if (observation === null) return null;
    this.observations.push(observation);
    this.context.previous = observation;
    const generation = observation.liveWaitGeneration ?? observation.waitEndedReadiness[0]?.generation;
    if (generation !== undefined) this.context.generation = generation;
    return observation;
  }
}

// -- Skeleton E: one Execution, 14 commands, 9 slots -----------------------------------------------------------

interface CalibrationE {
  readonly timeouts: readonly string[];
  readonly counts: OracleCounts;
}

function slotsE(calibration: CalibrationE): Slot[] {
  const [, second, third] = calibration.timeouts as [string, string, string];
  const events: readonly (readonly [string, Choice])[] = [
    ["initial", fixed("initial")],
    ["ev-a", fixed("ev-a")],
    ["tm-1", fixed("tm-1")],
    ["to-gen-1", fixed("to-gen-1")],
    ["to-gen-2", fixed("to-gen-2")],
    ["fresh(T2)", fixed(`kernel-event:${second}`)],
    ["fresh(T3)", fixed(`kernel-event:${third}`)],
    ["fresh(T3)~2", fixed(`kernel-event:${third}~2`)],
    ["copy", copyEvent],
    ["__proto__", fixed("__proto__")],
    ["雪", fixed("雪")],
  ];
  const generations: readonly (readonly [string, Choice])[] = [
    ["gen-1", fixed("gen-1")],
    ["gen-2", fixed("gen-2")],
    ["fresh(2)", fixed("kernel-generation:2")],
    ["fresh(3)", fixed("kernel-generation:3")],
    ["fresh(3)~2", fixed("kernel-generation:3~2")],
    ["copy", copyGeneration],
    ["__proto__", fixed("__proto__")],
    ["雪", fixed("雪")],
  ];
  return [
    slot("a", "ev-a", events),
    slot("g1", "gen-1", generations, ["copy"]),
    slot("t1", "tm-1", events),
    slot("g2", "gen-2", generations),
    slot("t2", "tm-2", events),
    slot("b", "ev-b", events),
    slot("g3", "gen-3", generations),
    slot("t3", "tm-3", events),
    slot("t4", "tm-4", events),
  ];
}

/**
 * Skeleton E. `until` is the index of the last command to issue (13 for the whole skeleton). A reference
 * to a generation is the string the registering command's Observation showed.
 */
function runE(slots: readonly Slot[], assignment: Assignment, until = 13, faults?: Faults): Run {
  const run = new Run(slots, assignment, faults);
  const references = new Map<string, string>();
  const register = (key: string, deadline: number): (() => Observation | null)[] => [
    () => run.step(dispatchCommand("x")),
    () => {
      const open = run.context.previous as Observation;
      const registered = run.step({ kind: "submit_outcome", outcome: outcomeOf(open, { step: "await", wait: waitDeclaration(run.name(key), deadline) }) });
      if (registered !== null) references.set(key, run.context.generation as string);
      return registered;
    },
  ];
  const fire = (generation: string, key: string) => (): Observation | null => run.step(timerCommand("x", references.get(generation) as string, run.name(key)));
  const commands: (() => Observation | null)[] = [
    () => run.step(createCommand("x", "kx")), // E0
    () => run.step(acceptCommand(run.name("a"), "x", "ka")), // E1
    ...register("g1", 10), // E2, E3
    fire("g1", "t1"), // E4: expired
    ...register("g2", 5), // E5, E6: already due
    fire("g2", "t2"), // E7: duplicate
    () => run.step(acceptCommand(run.name("b"), "x", "kb")), // E8
    ...register("g3", 30), // E9, E10
    fire("g3", "t3"), // E11: expired
    fire("g3", "t4"), // E12: duplicate
    () => run.step({ kind: "accept_cancellation", executionId: "x" }), // E13
  ];
  assert.equal(commands.length, 14);
  for (const [index, command] of commands.entries()) {
    if (index > until) break;
    if (command() === null) {
      run.stopped = true;
      break;
    }
  }
  return run;
}

// -- Skeleton X: Executions, 11 commands, 6 slots ----------------------------------------------------------------

function slotsX(natives: readonly string[]): Slot[] {
  const [, second, third] = natives as [string, string, string];
  const executions: readonly (readonly [string, Choice])[] = [
    ["exec-1", fixed("exec-1")],
    ["exec-2", fixed("exec-2")],
    ["fresh(E2)", fixed(`kernel-execution:${second}`)],
    ["fresh(E3)", fixed(`kernel-execution:${third}`)],
    ["fresh(E3)~2", fixed(`kernel-execution:${third}~2`)],
    ["copy", copyExecution],
    ["__proto__", fixed("__proto__")],
    ["雪", fixed("雪")],
  ];
  const inputs: readonly (readonly [string, Choice])[] = [
    ["initial", fixed("initial")],
    ["in-1", fixed("in-1")],
    ["__proto__", fixed("__proto__")],
  ];
  return [
    slot("e1", "exec-1", executions, ["copy"]),
    slot("e2", "exec-2", executions),
    slot("e3", "exec-3", executions),
    slot("e4", "exec-4", executions),
    slot("n1", "in-1", inputs),
    slot("n2", "in-2", inputs),
  ];
}

/** Skeleton X. Returns the run and the native Execution IDs the three creations were answered with. */
function runX(slots: readonly Slot[], assignment: Assignment): { readonly run: Run; readonly natives: string[] } {
  const run = new Run(slots, assignment);
  const offered: string[] = [];
  const shown: string[] = [];
  const natives: string[] = [];
  const create = (key: string, requestKey: string, kind: "create" | "create_retry" = "create"): void => {
    const name = run.name(key);
    offered.push(name);
    const created = run.step(createCommand(name, requestKey, kind));
    assert.ok(created !== null, "a creation always returns an Observation");
    shown.push(created.executionId);
    if (kind === "create") natives.push((run.lab.records.at(-1)?.view as ExecutionView).executionId);
  };
  create("e1", "k1"); // X0
  create("e2", "k2"); // X1
  create("e3", "k3"); // X2
  create("e4", "k1", "create_retry"); // X3: a replay of the first Execution
  assert.ok(run.step(acceptCommand(run.name("n1"), shown[0] as string, "ka")) !== null); // X4
  assert.ok(run.step(acceptCommand(run.name("n2"), shown[1] as string, "ka")) !== null); // X5
  // X6 to X9: by the name each creation offered. The legal exit is its target or an unknown reference;
  // the oracle decides which, and the run goes on either way.
  for (const name of offered) run.step({ kind: "inspect", executionId: name });
  assert.ok(run.step({ kind: "inspect", executionId: shown[2] as string }) !== null); // X10
  return { run, natives };
}

// -- The search ----------------------------------------------------------------------------------------------

const noProblems = (lab: Lab, what: () => string): OracleCounts => {
  const judged = judge(lab);
  if (judged.problems.length > 0) assert.fail(`${what()}: ${judged.problems.join("; ")}`);
  return judged.counts;
};

describe("K1.4-candidate identity: the bounded search (addendum §A4)", () => {
  const calibrate = (): { slots: Slot[]; calibration: CalibrationE; ordinary: Run } => {
    const ordinary = runE(slotsE({ timeouts: ["", "", ""], counts: { commands: 0, observations: 0, unknownReferences: 0, contradictions: 0, pairs: 0 } }), new Map());
    const calibration = { timeouts: nativeTimeouts(ordinary.lab), counts: noProblems(ordinary.lab, () => "the calibration run") };
    assert.equal(calibration.timeouts.length, 3, "the skeleton mints three timeout Events");
    assert.deepEqual([calibration.counts.commands, calibration.counts.observations], [14, 14]);
    return { slots: slotsE(calibration), calibration, ordinary };
  };

  test("skeleton E, honest: 3,282 runs, each of 14 Observations, with no oracle problem", (t) => {
    const { slots, calibration } = calibrate();
    assert.deepEqual(slots.map((entry) => entry.choices.length), [10, 6, 10, 7, 11, 11, 8, 11, 11]);
    const all = assignments(slots, 2);
    assert.equal(all.length, 3282);
    assert.equal(all.length, expectedCount([10, 6, 10, 7, 11, 11, 8, 11, 11], 2));
    const started = process.hrtime.bigint();
    let completed = 0;
    let observations = 0;
    let fresh = 0;
    for (const [index, assignment] of all.entries()) {
      const run = runE(slots, assignment);
      assert.equal(run.observations.length, 14, `assignment ${index} reached the end of the skeleton`);
      assert.deepEqual(nativeTimeouts(run.lab), calibration.timeouts, `assignment ${index} minted the calibrated native IDs`);
      // The Kernel did the same thing in every run: the same commands, Observations and identity positions.
      assert.deepEqual(noProblems(run.lab, () => `assignment ${index} (${[...assignment.keys()].join("+") || "ordinary"})`), calibration.counts);
      completed += 1;
      observations += run.observations.length;
      if (run.observations.some((observation) => [...observation.acknowledged, ...observation.queued, observation.liveWaitGeneration ?? ""].some((text) => text.startsWith("kernel-")))) fresh += 1;
    }
    const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
    assert.deepEqual([completed, observations], [3282, 45948]);
    assert.ok(fresh > 1000, `the adversarial names reached the conflict paths in ${fresh} runs`);
    t.diagnostic(`skeleton E honest: ${completed} runs, ${observations} Observations, ${fresh} runs with a fresh string, ${Math.round(elapsed)} ms`);
  });

  test("skeleton E, faults: 344 runs, each reaching its fault at a duplicate fire of an already-shown timeout", (t) => {
    const { slots, calibration } = calibrate();
    const few = assignments(slots, 1);
    assert.equal(few.length, 86);
    assert.equal(few.length, expectedCount([10, 6, 10, 7, 11, 11, 8, 11, 11], 1));
    const started = process.hrtime.bigint();
    let reached = 0;
    let shownAnew = 0;
    let thrown = 0;
    for (const [index, assignment] of few.entries()) {
      const honest = runE(slots, assignment);
      // E7 is the duplicate fire of generation 2, E12 of generation 3. A fault run ends at its fault step.
      for (const [step, generation] of [[7, 2], [12, 3]] as const) {
        const everywhere = changedEverywhere((id) => `${id}-changed`, (fired) => fired === generation);
        const faulted = runE(slots, assignment, step, everywhere);
        const change = everywhere.changed();
        assert.ok(change !== null, `assignment ${index}, step ${step}: the fault was reached`);
        assert.equal(faulted.observations.length, step + 1);
        assert.deepEqual(faulted.observations.slice(0, step), honest.observations.slice(0, step), "the runs agree before the fault");
        noProblems(faulted.lab, () => `assignment ${index}, step ${step}, answer and view`);
        // Every field equals the honest run's, except the strings at the changed ID's positions, which are new.
        const before = new Set(faulted.observations.slice(0, step).flatMap((observation) => [...observation.acknowledged, ...observation.queued, ...observation.terminalDispositions]));
        const view = faulted.lab.records.at(-1)?.view as ExecutionView;
        const [after, same] = [faulted.observations[step] as Observation, honest.observations[step] as Observation];
        let positions = 0;
        for (const list of ["acknowledged", "queued", "terminalDispositions"] as const) {
          assert.equal(after[list].length, same[list].length);
          view[list].forEach((native, position) => {
            if (native !== change[1]) return assert.equal(after[list][position], same[list][position]);
            positions += 1;
            assert.notEqual(after[list][position], same[list][position], "the changed ID is not shown under its old string");
            assert.ok(!before.has(after[list][position] as string), "and its string is new to the run");
          });
        }
        assert.ok(positions > 0, "the changed ID is shown somewhere");
        assert.deepEqual({ ...after, acknowledged: same.acknowledged, queued: same.queued, terminalDispositions: same.terminalDispositions }, same, "no other field moved");
        reached += 1;
        shownAnew += 1;

        let answered = false;
        const only = answerOnly(
          (id) => {
            answered = true;
            return `${id}-changed`;
          },
          (fired) => fired === generation,
        );
        const contradicted = runE(slots, assignment, step, only);
        assert.ok(answered, `assignment ${index}, step ${step}: the answer-only fault was reached`);
        assert.equal(contradicted.observations.length, step, "the run ends at the fault step");
        const error = contradicted.lab.records.at(-1)?.thrown;
        assert.ok(error instanceof AnswerContradiction && error.code === "timeout_generation");
        assert.deepEqual(contradicted.observations, honest.observations.slice(0, step));
        assert.equal(noProblems(contradicted.lab, () => `assignment ${index}, step ${step}, answer only`).contradictions, 1);
        reached += 1;
        thrown += 1;
      }
      assert.deepEqual(nativeTimeouts(honest.lab), calibration.timeouts);
    }
    const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
    assert.deepEqual([reached, shownAnew, thrown], [344, 172, 172]);
    t.diagnostic(`skeleton E faults: ${reached} fault sites reached (${shownAnew} shown anew, ${thrown} contradictions), ${Math.round(elapsed)} ms`);
  });

  test("skeleton X, honest: 500 runs of 11 commands, each ending in an Observation or its one legal throw", (t) => {
    const ordinary = runX(slotsX(["", "", ""]), new Map());
    assert.equal(new Set(ordinary.natives).size, 3, "the skeleton creates three Executions");
    const slots = slotsX(ordinary.natives);
    assert.deepEqual(slots.map((entry) => entry.choices.length), [6, 7, 8, 8, 2, 3]);
    const all = assignments(slots, 2);
    assert.equal(all.length, 500);
    assert.equal(all.length, expectedCount([6, 7, 8, 8, 2, 3], 2));
    const started = process.hrtime.bigint();
    const totals = { commands: 0, observations: 0, unknownReferences: 0, contradictions: 0, pairs: 0 };
    let conflicts = 0;
    for (const [index, assignment] of all.entries()) {
      const { run, natives } = runX(slots, assignment);
      assert.deepEqual(natives, ordinary.natives, `assignment ${index} created the calibrated native Executions`);
      const counts = noProblems(run.lab, () => `assignment ${index} (${[...assignment.keys()].join("+") || "ordinary"})`);
      assert.equal(counts.commands, 11);
      assert.equal(counts.observations + counts.unknownReferences, 11, "every command ended in an Observation or the unknown-reference throw");
      assert.equal(counts.contradictions, 0);
      // Only X9 can be refused: a name offered for a new Execution always ends up denoting something, and
      // the replay at X3 offers its name for an Execution that already has a string.
      const refused = run.lab.records.flatMap((record, step) => (record.observation === null ? [step] : []));
      assert.ok(refused.length === 0 || (refused.length === 1 && refused[0] === 9), `assignment ${index}: only X9 may be an unknown reference, saw ${refused.join(",")}`);
      for (const key of Object.keys(totals) as (keyof OracleCounts)[]) totals[key] += counts[key];
      if (run.observations.some((observation) => observation.executionId.startsWith("kernel-execution:"))) conflicts += 1;
    }
    const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
    assert.equal(totals.commands, 5500);
    assert.equal(totals.observations + totals.unknownReferences, 5500);
    assert.deepEqual([totals.observations, totals.unknownReferences], EXPECTED_X_EXITS);
    assert.ok(conflicts > 100, `the adversarial names reached the conflict path in ${conflicts} runs`);
    t.diagnostic(`skeleton X honest: 500 runs, ${totals.observations} Observations, ${totals.unknownReferences} unknown-reference throws, ${conflicts} runs with a fresh Execution string, ${Math.round(elapsed)} ms`);
  });

  test("the search is 4,126 runs, as declared", () => {
    assert.equal(expectedCount([10, 6, 10, 7, 11, 11, 8, 11, 11], 2) + 4 * expectedCount([10, 6, 10, 7, 11, 11, 8, 11, 11], 1) + expectedCount([6, 7, 8, 8, 2, 3], 2), 4126);
  });
});

/**
 * Skeleton X's exits over the 500 runs: [Observations, unknown-reference throws]. The total is 5,500
 * commands. The split is pinned from the run and is deterministic; the test also checks, per run, that a
 * throw can only be X9's.
 */
const EXPECTED_X_EXITS = [5089, 411];
