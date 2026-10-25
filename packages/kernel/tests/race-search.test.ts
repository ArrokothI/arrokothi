/**
 * K13-9 — race schedules lose nothing: the declared bounded search's depth-2 slice, its oracle controls
 * and its class witnesses (design 01 § K13-9; addendum 01 §§ A2, A3). Corpus labels K13-A05, K13-A21.
 *
 * The whole declared search, 13^4 × 8 × 2 = 456,976 runs plus a 20,000-word supplementary walk, runs as
 * its own verify check (`race-search/run.ts`). This file runs, inside `npm test`:
 *
 * - the depth-2 slice: every two-letter word from every seed at both bounds (2,704 runs), compared with
 *   the reference model and the invariants after every step;
 * - each seed's prefix, validated against the state it declares;
 * - the oracle-positive control: S5 `d` at bound 1 reserves `[T1]` although `T1` is not eligible (INV-7's
 *   stated exception for the mandatory timeout);
 * - the negative controls: each corrupted observation must be rejected (A05's null payload; A21's omitted
 *   timer, renamed Event, copied receipt and corrupted cancellation field);
 * - every schedule class's witnesses and their expected outcomes.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { SEEDS, runWord, type Corruption } from "./race-search/harness.ts";
import { ALPHABET, type Letter } from "./race-search/model.ts";
import { exhaustive, supplementary } from "./race-search/run.ts";
import { CLASSES, checkWitnesses } from "./race-search/witnesses.ts";

const seed = (name: string) => SEEDS.find((candidate) => candidate.name === name)!;
const word = (text: string): Letter[] => (text === "" ? [] : (text.split(" ") as Letter[]));

describe("K13-9 the declared search's depth-2 slice", () => {
  test("every two-letter word from every seed at bounds 1 and 2 agrees with the model and keeps every invariant", () => {
    const result = exhaustive(2);
    assert.equal(result.runs, ALPHABET.length ** 2 * SEEDS.length * 2);
    assert.deepEqual(result.failures, []);
    // The full search must exercise every (letter, state) transition; the slice reaches fewer.
    assert.ok(result.transitions.size > 40, `${result.transitions.size} transitions exercised`);
  });

  test("a small supplementary walk agrees too (the verify check runs 20,000 words)", () => {
    const walk = supplementary(25, 12);
    assert.equal(walk.runs, 100);
    assert.deepEqual(walk.failures, []);
  });

  test("each seed's prefix reaches the state it declares", () => {
    for (const candidate of SEEDS) assert.equal(runWord(candidate, [], 1).failure, null, candidate.name);
  });
});

describe("K13-9 oracle controls (addendum 01 § A2)", () => {
  test("positive control: S5 d at bound 1 reserves [T1], the mandatory but ineligible timeout", () => {
    const run = runWord(seed("S5"), word("d"), 1);
    assert.equal(run.failure, null);
    assert.deepEqual(run.view!.activation!.batch.map(run.name), ["T1"]);
    const timeout = run.view!.mailbox.find((entry) => run.name(entry.eventId) === "T1")!;
    assert.equal(timeout.sourceCategory, "kernel_timeout", "a timeout is never eligible, and still travels");
  });

  const controls: readonly (readonly [string, Corruption, string, string, RegExp])[] = [
    ["K13-A05 retained input payload replaced with null after cancellation", "null-payload-after-cancel", "S7", "q", /view differs from the model|retained payload changed/],
    ["K13-A21 a pending timer omitted from the listing", "omit-pending-timer", "S0", "d w", /pendingTimers listed/],
    ["K13-A21 an existing Event renamed between views", "rename-event", "S0", "i", /view differs from the model|unmapped|lost from the mailbox/],
    ["K13-A21 a retry answered with an equal copy of the receipt", "retry-receipt-copy", "S7", "c r", /original receipt object/],
    ["K13-A21 a cancellation field corrupted beside an untouched delivery row", "corrupt-cancellation", "S7", "q", /view differs from the model/],
  ];
  for (const [name, corruption, seedName, letters, mismatch] of controls) {
    test(`negative control: ${name}`, () => {
      assert.equal(runWord(seed(seedName), word(letters), 1).failure, null, "the uncorrupted run passes");
      const corrupted = runWord(seed(seedName), word(letters), 1, corruption);
      assert.notEqual(corrupted.failure, null, "the comparison rejects the corrupted observation");
      assert.match(corrupted.failure!, mismatch, "and names the mismatch");
    });
  }
});

describe("K13-9 schedule classes: every class has a passing witness with its expected outcome", () => {
  test("all classes", () => {
    assert.equal(CLASSES.length, 20);
    assert.deepEqual(checkWitnesses(), []);
  });

  test("every witness lies inside the declared space: at most four letters, bounds 1 or 2, a declared seed", () => {
    for (const schedule of CLASSES) {
      for (const witness of schedule.witnesses) {
        assert.ok(word(witness.word).length <= 4 && [1, 2].includes(witness.bound) && SEEDS.some((candidate) => candidate.name === witness.seed), `${schedule.name}: ${witness.seed} ${witness.word}`);
      }
    }
  });
});
