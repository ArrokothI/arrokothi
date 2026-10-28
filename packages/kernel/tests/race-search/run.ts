/**
 * K13-9's declared bounded search, as a verify check (design 01 § K13-9; addendum 01 § A3).
 *
 *   node --experimental-strip-types packages/kernel/tests/race-search/run.ts [--depth N]
 *
 * **Exhaustive search (the claim).** Every word of exactly `N` letters (default 4) over the 13-letter
 * alphabet, from each of the 8 seeds, at batch bounds 1 and 2: 13^4 × 8 × 2 = 456,976 runs, each
 * compared with the reference model and checked against the invariants after every step, so every
 * shorter word is checked as a prefix. Seed prefixes are validated before any word runs.
 *
 * **Supplementary walk (outside the claim).** 20,000 random words of length 12 in total: 5,000 from
 * each of S0 and S1 at each bound, drawn by xorshift32 with a fixed seed per combination.
 *
 * **Classes.** Every schedule class's witnesses run, each checking its expected outcome.
 *
 * The report counts attempted words, failures, skipped steps per letter and exercised (letter, state)
 * transitions, for the two searches separately. Any failure or a class with no passing witness exits 1.
 */

import { SEEDS, runWord, type RunResult } from "./harness.ts";
import { ALPHABET, type Letter } from "./model.ts";
import { CLASSES, checkWitnesses } from "./witnesses.ts";

interface Tally {
  runs: number;
  failures: string[];
  readonly skips: Record<string, number>;
  readonly transitions: Set<string>;
}

const tally = (): Tally => ({ runs: 0, failures: [], skips: Object.fromEntries(ALPHABET.map((letter) => [letter, 0])), transitions: new Set() });

const record = (into: Tally, run: RunResult): void => {
  into.runs += 1;
  if (run.failure !== null) {
    if (into.failures.length < 20) into.failures.push(run.failure);
    return;
  }
  for (const step of run.steps) {
    if (step.skipped) into.skips[step.letter] = (into.skips[step.letter] ?? 0) + 1;
    else into.transitions.add(`${step.letter}@${step.stateBefore}`);
  }
};

/** xorshift32: a fixed, portable sequence for the supplementary walk. */
function xorshift32(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state;
  };
}

export function exhaustive(depth: number, onSeed?: (name: string, bound: number, tally: Tally) => void): Tally {
  const total = tally();
  const word: Letter[] = new Array(depth);
  for (const seed of SEEDS) {
    for (const bound of [1, 2]) {
      const local = tally();
      const visit = (position: number): void => {
        if (position === depth) {
          const run = runWord(seed, word, bound);
          record(local, run);
          record(total, run);
          return;
        }
        for (const letter of ALPHABET) {
          word[position] = letter;
          visit(position + 1);
        }
      };
      visit(0);
      onSeed?.(seed.name, bound, local);
    }
  }
  return total;
}

export const WALK_SEEDS: Readonly<Record<string, number>> = { "S0/1": 0x13a1, "S0/2": 0x13a2, "S1/1": 0x13b1, "S1/2": 0x13b2 };

export function supplementary(perCombination: number, length: number): Tally {
  const total = tally();
  for (const name of ["S0", "S1"]) {
    const seed = SEEDS.find((candidate) => candidate.name === name)!;
    for (const bound of [1, 2]) {
      const next = xorshift32(WALK_SEEDS[`${name}/${bound}`]!);
      for (let index = 0; index < perCombination; index += 1) {
        const word: Letter[] = [];
        for (let position = 0; position < length; position += 1) word.push(ALPHABET[next() % ALPHABET.length]!);
        record(total, runWord(seed, word, bound));
      }
    }
  }
  return total;
}

const summary = (t: Tally) => ({ runs: t.runs, failures: t.failures.length, skips: t.skips, transitions: t.transitions.size });

if (import.meta.main) {
  const depthFlag = process.argv.indexOf("--depth");
  const depth = depthFlag === -1 ? 4 : Number(process.argv[depthFlag + 1]);
  const started = performance.now();
  const perSeed: Record<string, number> = {};
  const search = exhaustive(depth, (name, bound, local) => {
    perSeed[`${name}/B${bound}`] = local.runs;
  });
  const walk = supplementary(5_000, 12);
  const witnessFailures = checkWitnesses();
  const report = {
    exhaustive: { depth, seeds: SEEDS.length, bounds: [1, 2], declared: ALPHABET.length ** depth * SEEDS.length * 2, ...summary(search), perSeed },
    supplementary: { words: 20_000, length: 12, rng: "xorshift32", seeds: WALK_SEEDS, ...summary(walk) },
    classes: { classes: CLASSES.length, witnesses: CLASSES.reduce((count, schedule) => count + schedule.witnesses.length, 0), failures: witnessFailures.length },
    seconds: Math.round((performance.now() - started) / 100) / 10,
  };
  console.log(JSON.stringify(report, null, 1));
  const failures = [...search.failures, ...walk.failures, ...witnessFailures];
  for (const failure of failures.slice(0, 10)) console.error(failure);
  // At the declared depth every letter is exercised from every one of the five lifecycle states.
  const unexercised = depth >= 4 && search.transitions.size !== ALPHABET.length * 5;
  if (unexercised) console.error(`only ${search.transitions.size} of ${ALPHABET.length * 5} (letter, state) transitions were exercised`);
  if (failures.length > 0 || search.runs !== report.exhaustive.declared || unexercised) {
    console.error(`K13-9 SEARCH FAILED: ${search.failures.length} exhaustive, ${walk.failures.length} supplementary, ${witnessFailures.length} witness failures`);
    process.exitCode = 1;
  } else {
    console.error(`K13-9 SEARCH PASSED: ${search.runs} exhaustive runs, ${walk.runs} supplementary words, ${report.classes.classes} classes`);
  }
}
