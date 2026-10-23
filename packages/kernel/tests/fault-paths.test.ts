/**
 * Owner choice 01 (COORD-REFACTOR-01): a decision or report that faults while it is being built commits
 * nothing. This is the bounded exception to CR1-3, for three engine-fault paths only:
 *
 * 1. `dispatch` and `submitInput` consume no acceptance position and no Activation ID when their build
 *    faults;
 * 2. `failed(reason)` leaves its row pending when its plan's build faults;
 * 3. every other settlement report, `delivered()` included, changes nothing when its plan's build faults.
 *
 * `fault-paths-child.ts` injects one engine fault into the chosen build and runs the same setup without
 * the faulting call. Each case pins the new outcome, the historical outcome it replaces (documented: that
 * code no longer exists to run), and that the whole view, receipts, IDs and the next decisions equal those
 * of the run without the faulting call. The complete-decision oracle and the sweeps are not involved and
 * are not changed.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TESTS = dirname(fileURLToPath(import.meta.url));
const run = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", resolve(TESTS, "fault-paths-child.ts")], {
  cwd: resolve(TESTS, "../../.."),
  encoding: "utf8",
  timeout: 120_000,
  maxBuffer: 16 * 1024 * 1024,
});

interface Fault {
  readonly threw: boolean;
  readonly fired: number;
}
interface Run {
  readonly fault: Fault | null;
  readonly afterFault: { readonly receipts: unknown[]; readonly activation: { readonly deliveries: { readonly attempt: number; readonly status: string; readonly failure: string | null; readonly activationId: string; readonly writerEpoch: number }[] } | null };
  readonly final: unknown;
  readonly [key: string]: unknown;
}
const report = (): Record<"dispatch" | "input" | "failed" | "delivered", { faulted: Run; control: Run }> => {
  assert.equal(run.error, undefined);
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout) as ReturnType<typeof report>;
};

/** The faulted run threw the injected fault, and after it everything equals the run without that call. */
const sameAsWithoutTheCall = (path: { faulted: Run; control: Run }): void => {
  const { fault, ...faulted } = path.faulted;
  const { fault: none, ...control } = path.control;
  assert.deepEqual(fault, { threw: true, fired: 1 }, "the injected fault fired once, inside the chosen build, and the call threw it");
  assert.equal(none, null);
  assert.deepEqual(faulted, control, "view, receipts, IDs and the next decisions equal the run without the faulting call");
};

test("path 1: a dispatch whose build faults consumes no acceptance position and no Activation ID", () => {
  const { dispatch } = report();
  sameAsWithoutTheCall(dispatch);
  const next = dispatch.faulted.next as { activationId: string; receipt: { position: number } };
  // New outcome: the next dispatch is the Execution's first Activation, at position 2.
  assert.match(next.activationId, /\/activation-1$/);
  assert.equal(next.receipt.position, 2);
  // Historical outcome (before COORD-REFACTOR-01, documented): `activationsMinted += 1` and `#mint` ran
  // before the Activation was frozen, so the faulted dispatch consumed `activation-1` and position 2, and
  // the next dispatch was `activation-2` at position 3.
  assert.doesNotMatch(next.activationId, /\/activation-2$/);
  assert.notEqual(next.receipt.position, 3);
});

test("path 1: an input whose build faults consumes no acceptance position", () => {
  const { input } = report();
  sameAsWithoutTheCall(input);
  const accepted = input.faulted.input as { acceptancePosition: number };
  // New outcome: the next accepted input is at position 2. Historical outcome (documented): `#mint`
  // advanced the index before the entry was built and installed, so a fault after it consumed position 2
  // and the next input was at 3.
  assert.equal(accepted.acceptancePosition, 2);
  assert.notEqual(accepted.acceptancePosition, 3);
});

test("path 2: failed(reason) whose plan cannot be built leaves its row pending, and a later report settles it", () => {
  const { failed } = report();
  sameAsWithoutTheCall(failed);
  const row = failed.faulted.afterFault.activation?.deliveries[0];
  // New outcome: the row is still pending after the faulting report. Historical outcome (documented): the
  // row was marked failed before the reason was bounded, so it stayed failed (with the bounded reason or,
  // on a bounding fault, the fallback) and a later delivered() was ignored.
  assert.deepEqual(row, { attempt: 1, status: "pending", failure: null, activationId: row?.activationId, writerEpoch: 1 });
  const after = (failed.faulted.afterReport as Run["afterFault"]).activation?.deliveries[0];
  assert.equal(after?.status, "delivered", "the later report won");
});

test("path 3: delivered() whose plan cannot be built changes nothing, and a later report settles the row", () => {
  const { delivered } = report();
  sameAsWithoutTheCall(delivered);
  const row = delivered.faulted.afterFault.activation?.deliveries[0];
  // New outcome: pending. Historical outcome (documented): delivered() was one plain status write with
  // nothing that could fault before it, so the row was delivered.
  assert.equal(row?.status, "pending");
  assert.equal((delivered.faulted.afterReport as Run["afterFault"]).activation?.deliveries[0]?.status, "delivered");
});
