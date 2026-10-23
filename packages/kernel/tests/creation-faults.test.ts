/**
 * Review 01, CR1-R1-CREATION-01 (COORD-REFACTOR-01): creation's publications fault exactly as they did at
 * B. There is no exception here; every expectation below is B's outcome.
 *
 * Creation publishes the new record twice: in the Execution map, then in the creation-key index. The
 * Execution map is also the listing, so an Execution is listed exactly when `inspect` finds it, after a
 * fault in either publication, and a creation that publishes the same ID again keeps that ID's place.
 * `creation-faults-child.ts` faults each publication in turn and records the error, `inspect` and
 * `visibleExecutions`, a retry with the same key, and a creation with a different key followed by the
 * same-key retry. The same child run against unmodified B printed these observations.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TESTS = dirname(fileURLToPath(import.meta.url));
const run = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", resolve(TESTS, "creation-faults-child.ts")], {
  cwd: resolve(TESTS, "../../.."),
  encoding: "utf8",
  timeout: 120_000,
  maxBuffer: 16 * 1024 * 1024,
});

interface Observed {
  readonly listed: readonly string[];
  readonly executions: readonly { readonly executionId: string; readonly inspect: { readonly ok: boolean }; readonly listed: number }[];
}
type Case = Record<"faulted" | "retry" | "replay" | "otherFaulted" | "different" | "sameAfterDifferent", unknown> & Record<"afterFault" | "afterRetry" | "afterDifferent" | "afterBoth", Observed>;
const report = (): { ids: [string, string]; executionMap: Case; creationKey: Case } => {
  assert.equal(run.error, undefined);
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout) as ReturnType<typeof report>;
};

const THREW = { threw: "injected engine fault", fired: 1 };
const created = (executionId: string, replayed: boolean) => ({
  ok: true,
  executionId,
  replayed,
  receipt: { boundary: "creation", token: `crt:${executionId}:1`, position: 1 },
  initialEventId: executionId.replace(/^execution-/, "event-creation-"),
});
const ready = { ok: true, state: "READY", receipts: 1, mailbox: 1 };
const missing = { ok: false, classification: "unknown_destination" };
const view = (listed: readonly string[], [first, second]: readonly [string, string], inspects: readonly [object, object]): Observed => ({
  listed,
  executions: [
    { executionId: first, inspect: inspects[0] as { ok: boolean }, listed: listed.filter((id) => id === first).length },
    { executionId: second, inspect: inspects[1] as { ok: boolean }, listed: listed.filter((id) => id === second).length },
  ],
});

/** B's lookup/listing relationship: inspect succeeds exactly when the ID is listed, and once. */
const listedExactlyWhenFound = (observed: Observed): void => {
  for (const execution of observed.executions) assert.equal(execution.listed, execution.inspect.ok ? 1 : 0, execution.executionId);
};

test("the Execution-map publication faults: nothing is published, and either key then creates afresh", () => {
  const { ids, executionMap: path } = report();
  const [first, second] = ids;
  for (const observed of [path.afterFault, path.afterRetry, path.afterDifferent, path.afterBoth]) listedExactlyWhenFound(observed);
  assert.deepEqual(path.faulted, THREW);
  assert.deepEqual(path.afterFault, view([], ids, [missing, missing]));
  assert.deepEqual(path.retry, created(first, false));
  assert.deepEqual(path.afterRetry, view([first], ids, [ready, missing]));
  assert.deepEqual(path.replay, created(first, true));
  assert.deepEqual(path.otherFaulted, THREW);
  assert.deepEqual(path.different, created(second, false));
  assert.deepEqual(path.afterDifferent, view([second], ids, [missing, ready]));
  assert.deepEqual(path.sameAfterDifferent, created(first, false));
  assert.deepEqual(path.afterBoth, view([second, first], ids, [ready, ready]));
});

test("the creation-key publication faults: the Execution is found and listed; a same-key retry creates it again in its place", () => {
  const { ids, creationKey: path } = report();
  const [first, second] = ids;
  for (const observed of [path.afterFault, path.afterRetry, path.afterDifferent, path.afterBoth]) listedExactlyWhenFound(observed);
  assert.deepEqual(path.faulted, THREW);
  // At B the Execution map held the record, so `inspect` found it and the listing, which walks that
  // map, named it. A listing kept beside the map and published after the creation key dropped it.
  assert.deepEqual(path.afterFault, view([first], ids, [ready, missing]));
  // The key was never indexed, so the retry is a new creation of the same ID: not a replay.
  assert.deepEqual(path.retry, created(first, false));
  assert.deepEqual(path.afterRetry, view([first], ids, [ready, missing]));
  assert.deepEqual(path.replay, created(first, true));
  assert.deepEqual(path.otherFaulted, THREW);
  assert.deepEqual(path.different, created(second, false));
  assert.deepEqual(path.afterDifferent, view([first, second], ids, [ready, ready]));
  // Publishing the first ID again keeps its place in creation order and lists it once.
  assert.deepEqual(path.sameAfterDifferent, created(first, false));
  assert.deepEqual(path.afterBoth, view([first, second], ids, [ready, ready]));
});
