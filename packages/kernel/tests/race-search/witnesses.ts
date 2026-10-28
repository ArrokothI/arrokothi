/**
 * K13-9's schedule classes and their witnesses (design 01 § K13-9, "Classes and witnesses").
 *
 * Each class names witness words inside the declared space and the expected outcome the governing
 * sources fix for it. The search asserts every class is hit by running its witnesses, and each witness
 * checks its expected outcome directly, beside the model comparison every run makes.
 */

import type { ExecutionView } from "../../src/index.ts";
import { SEEDS, runWord, type RunResult } from "./harness.ts";
import type { Letter } from "./model.ts";

export interface Witness {
  readonly seed: string;
  readonly word: string;
  readonly bound: number;
  /** The expected outcome, checked on the run; `null` when it holds. */
  readonly expect: (run: RunResult, view: ExecutionView) => string | null;
}

export interface ScheduleClass {
  readonly name: string;
  /** The governing source of the expected outcome. */
  readonly source: string;
  readonly witnesses: readonly Witness[];
}

const answer = (run: RunResult, step: number): { ok?: boolean; value?: Record<string, unknown>; error?: { classification: string; reason: string }; result?: string } =>
  run.steps[step]?.answer as never;
const result = (run: RunResult, step: number): string | undefined => answer(run, step).result;
const refusal = (run: RunResult, step: number): string | undefined => answer(run, step).error?.classification;
const check = (condition: boolean, message: string): string | null => (condition ? null : message);
const timeouts = (view: ExecutionView) => view.mailbox.filter((entry) => entry.sourceCategory === "kernel_timeout");

export const CLASSES: readonly ScheduleClass[] = [
  { name: "eligible arrival before registration", source: "W-2 step 2", witnesses: [
    { seed: "S7", word: "e w", bound: 1, expect: (_r, v) => check(v.state === "READY" && v.waitEndedReadiness?.species === "event", "READY at registration with Event readiness") },
    { seed: "S7", word: "e w d", bound: 1, expect: (r, v) => check(v.activation?.batch.map(r.name).includes("in1") === true, "the next batch holds e") },
  ] },
  { name: "arrival inside the registering batch", source: "W-2 step 1", witnesses: [
    { seed: "S0", word: "e d w", bound: 2, expect: (_r, v) => check(v.state === "WAITING", "WAITING: the batch acknowledged e") },
  ] },
  { name: "the same arrival at bound 1", source: "W-2 step 2", witnesses: [
    { seed: "S0", word: "e d w", bound: 1, expect: (_r, v) => check(v.state === "READY" && v.waitEndedReadiness?.species === "event", "READY: e stayed queued and woke at registration") },
  ] },
  { name: "arrival while WAITING", source: "B-6 path B", witnesses: [
    { seed: "S2", word: "e", bound: 1, expect: (_r, v) => check(v.state === "READY", "READY on path B") },
    { seed: "S2", word: "e t", bound: 1, expect: (r) => check(result(r, 1) === "stale", "a later fire is stale") },
  ] },
  { name: "arrival after expiry", source: "B-8, W § Selecting", witnesses: [
    { seed: "S5", word: "e d", bound: 1, expect: (r, v) => check(JSON.stringify(v.activation?.batch.map(r.name)) === '["T1"]', "batch [T1] at bound 1") },
    { seed: "S5", word: "e d", bound: 2, expect: (r, v) => check(JSON.stringify(v.activation?.batch.map(r.name)) === '["T1","in1"]', "batch [T1, e] at bound 2") },
  ] },
  { name: "ineligible arrivals", source: "W-7", witnesses: [
    { seed: "S2", word: "i i", bound: 1, expect: (_r, v) => check(v.state === "WAITING" && v.queued.length === 2, "still WAITING; both queued") },
  ] },
  { name: "due at registration", source: "W-2 step 3", witnesses: [
    { seed: "S7", word: "z", bound: 1, expect: (_r, v) => check(v.state === "READY" && timeouts(v).length === 1, "one timeout, READY, never WAITING") },
    { seed: "S7", word: "e z", bound: 1, expect: (_r, v) => check(timeouts(v).length === 0 && v.waitEndedReadiness?.species === "event", "the queued Event wins; no timeout") },
  ] },
  { name: "a stale timer after a wake", source: "W-9 case 6", witnesses: [
    { seed: "S3", word: "t", bound: 1, expect: (r) => check(result(r, 0) === "stale", "stale") },
  ] },
  { name: "a stale timer after re-registration", source: "W-9 case 2", witnesses: [
    { seed: "S4", word: "s", bound: 1, expect: (r, v) => check(result(r, 0) === "stale" && v.wait?.generation === 2, "stale; g2 live and untouched") },
  ] },
  { name: "a duplicate fire", source: "W-9", witnesses: [
    { seed: "S2", word: "t t", bound: 1, expect: (r, v) => check(result(r, 1) === "duplicate" && timeouts(v).length === 1, "duplicate; one timeout") },
    { seed: "S5", word: "d t", bound: 1, expect: (r) => check(result(r, 1) === "duplicate", "duplicate after reservation") },
    { seed: "S5", word: "d c t", bound: 1, expect: (r, v) => check(result(r, 2) === "duplicate" && v.waitEndedReadiness === null, "duplicate after the next Outcome; no second readiness") },
  ] },
  { name: "eligible arrival against the deadline, in both orders", source: "W-9 cases 3-4", witnesses: [
    { seed: "S2", word: "e t", bound: 1, expect: (r, v) => check(result(r, 1) === "stale" && timeouts(v).length === 0, "the Event first: the fire is stale") },
    { seed: "S2", word: "t e", bound: 1, expect: (r, v) => check(result(r, 0) === "expired" && v.waitEndedReadiness?.species === "deadline", "the fire first: expiry stands; e creates no readiness") },
  ] },
  { name: "cancellation before the Outcome", source: "CX-6", witnesses: [
    { seed: "S7", word: "q k r", bound: 1, expect: (r, v) => check(v.state === "CANCELLED" && refusal(r, 1) === "cancellation_terminal_conflict" && answer(r, 2).error !== undefined && answer(r, 2).error === answer(r, 1).error, "k loses; r returns the same refusal") },
  ] },
  { name: "the Outcome before cancellation", source: "CX-2", witnesses: [
    { seed: "S7", word: "k q", bound: 1, expect: (r, v) => check(v.state === "COMPLETED" && answer(r, 1).value?.["changed"] === false, "COMPLETED reported unchanged") },
    { seed: "S7", word: "c q", bound: 1, expect: (_r, v) => check(v.state === "CANCELLED", "READY cancelled") },
  ] },
  { name: "cancellation in each nonterminal state", source: "lifecycle § Cancellation order, B-5", witnesses: [
    ...["S0", "S7", "S2", "S3"].map((seed): Witness => ({ seed, word: "q", bound: 1, expect: (_r, v) => check(v.state === "CANCELLED" && v.queued.length === 0, "cancelled; nothing queued") })),
    { seed: "S5", word: "q", bound: 1, expect: (r, v) => check(v.state === "CANCELLED" && v.cancellation?.terminalDispositions.map(r.name).includes("T1") === true && v.activation === null, "T1 disposed; nothing dispatched") },
  ] },
  { name: "repeated cancellation", source: "CX-2", witnesses: [
    { seed: "S0", word: "q q", bound: 1, expect: (r) => check(answer(r, 1).value?.["changed"] === false, "changed: false") },
  ] },
  { name: "a losing await with a deadline", source: "CX-6", witnesses: [
    { seed: "S7", word: "q w r", bound: 1, expect: (r, v) => check(v.wait === null && v.retiredWaits.length === 0 && answer(r, 2).error !== undefined && answer(r, 2).error === answer(r, 1).error, "no wait, deadline, readiness or generation; the same refusal") },
  ] },
  { name: "an accepted replay after cancellation", source: "OA-2", witnesses: [
    { seed: "S7", word: "c q r", bound: 1, expect: (r) => check(answer(r, 2).value?.["replayed"] === true, "the original receipt") },
  ] },
  { name: "the Execution deadline", source: "CL-1; owner choice 01", witnesses: [
    { seed: "S1", word: "x", bound: 1, expect: (r, v) => check(result(r, 0) === "cancelled" && v.cancellation?.cause === "execution_deadline", "cancelled by the deadline") },
    { seed: "S6", word: "x t", bound: 1, expect: (r) => check(result(r, 1) === "stale", "the wait fire is stale after it") },
    { seed: "S6", word: "t x", bound: 1, expect: (r, v) => check(v.mailbox.find((entry) => r.name(entry.eventId) === "T1")?.disposition.kind === "terminal", "T1 terminal-disposed when the wait fire came first") },
    { seed: "S1", word: "d x k", bound: 1, expect: (r) => check(refusal(r, 2) === "cancellation_terminal_conflict", "k loses") },
    { seed: "S1", word: "d k x", bound: 1, expect: (r) => check(result(r, 2) === "stale", "x after k is stale") },
  ] },
  { name: "a late report after cancellation", source: "D", witnesses: [
    { seed: "S7", word: "q p", bound: 1, expect: (_r, v) => check(v.cancellation?.deliveries[0]?.status === "delivered", "only the delivery row changes") },
  ] },
  { name: "unmatched backlog through a wait", source: "B-2, B-4", witnesses: [
    { seed: "S2", word: "i e d", bound: 2, expect: (r, v) => check(!v.activation!.batch.map(r.name).includes("in1"), "i is in no wait-ended batch") },
    { seed: "S3", word: "i d c d", bound: 1, expect: (r, v) => check(v.activation!.batch.map(r.name).includes("in2"), "the first ordinary batch after c carries i") },
  ] },
];

/** Runs every witness; each failure names its class and word. */
export function checkWitnesses(): string[] {
  const failures: string[] = [];
  for (const schedule of CLASSES) {
    for (const witness of schedule.witnesses) {
      const seed = SEEDS.find((candidate) => candidate.name === witness.seed)!;
      const run = runWord(seed, witness.word.split(" ") as Letter[], witness.bound);
      const label = `${schedule.name}: ${witness.seed} ${witness.word} B=${witness.bound}`;
      if (run.failure !== null) failures.push(`${label}: ${run.failure}`);
      else {
        const problem = witness.expect(run, run.view!);
        if (problem !== null) failures.push(`${label}: expected ${problem}`);
      }
    }
  }
  return failures;
}
