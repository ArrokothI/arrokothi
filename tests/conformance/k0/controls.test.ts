/**
 * K0.2-C6: the unsafe/state-loss controls exist as negative tests, with the assertions their governing
 * decisions name by name.
 *
 * The accepted K0.1 worksheet fixes four controls in Decision M-1 and, for the cancellation control,
 * exactly what it must assert. Round-1 review finding K02-R1-01 added two more — W-8 case 6's
 * subscription-only deadline and §11 row 8's completion check — for obligations that were going
 * unobserved. M-1 is a floor, not a ceiling, so the set is checked as a superset of its four.
 * This file judges the *fixture*, not a Kernel.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  cancelVersusComplete,
  duplicateAndConflictingOutcome,
  missingCheckpointCode,
  staleTimerAndLostWake,
  UNSAFE_CONTROLS,
} from "./scenarios.ts";
import type { Scenario } from "./fixture.ts";

/** The four controls Decision M-1 names by hand. The fixture may carry more; it may not carry fewer. */
const M1_CONTROLS = [
  "control-duplicate-conflicting-outcome",
  "control-stale-timer-and-lost-wake",
  "control-cancel-versus-complete",
  "control-missing-checkpoint-code",
];

/** Concatenated `forbids` prose across a scenario, which is where the named obligations live. */
function forbidsText(scenario: Scenario): string {
  return scenario.steps.flatMap((step) => step.expect.forbids ?? []).join(" \n ");
}

function labels(scenario: Scenario): string {
  return scenario.steps.map((step) => step.expect.label).join(" \n ");
}

describe("K0 unsafe/state-loss controls: Decision M-1's set is complete", () => {
  test("Decision M-1's four named controls are all present", () => {
    // M-1 fixes a floor, not a ceiling: these four must exist. Round-1 review finding K02-R1-01 added
    // two more unsafe/state-loss controls for §11 obligations that were going unobserved, so the set
    // is asserted as a superset of M-1's rather than as an exact match.
    for (const required of M1_CONTROLS) {
      assert.ok(
        UNSAFE_CONTROLS.some((scenario) => scenario.id === required),
        `Decision M-1 requires control ${required}, which is missing`,
      );
    }
  });

  test("the controls added after round-1 review are declared and additional, not replacements", () => {
    assert.deepEqual(
      UNSAFE_CONTROLS.map((scenario) => scenario.id),
      [
        "control-duplicate-conflicting-outcome",
        "control-stale-timer-and-lost-wake",
        "control-subscription-wait-deadline",
        "control-cancel-versus-complete",
        "control-completion-obligations",
        "control-missing-checkpoint-code",
      ],
    );
  });

  // Phrasing note: `architecture/kernel-boundaries.test.ts` scans conformance sources for import
  // specifiers with a raw-text regex, so any prose ending in the preposition f-r-o-m immediately
  // before a string literal is parsed as a bare import and reported as a boundary violation. Titles
  // and comments in this directory are worded to avoid that shape. The fragility is a pre-existing
  // defect in the guard, recorded in this packet's report as K0.2-SELF-01 for a separate corrective
  // packet; it is deliberately not worked around by editing the guard from inside this packet.
  test("each control names its governing §11 row", () => {
    assert.deepEqual(duplicateAndConflictingOutcome.k0BoundaryRows, [3]);
    assert.ok(staleTimerAndLostWake.k0BoundaryRows.includes(5));
    assert.ok(cancelVersusComplete.k0BoundaryRows.includes(7));
    assert.deepEqual(missingCheckpointCode.k0BoundaryRows, [5, 9]);
  });

  test("each control cites the governing decision that requires it", () => {
    for (const control of UNSAFE_CONTROLS) {
      const cited = control.sources.join(" ");
      const required = M1_CONTROLS.includes(control.id) ? /Decision M-1/ : /W-8 case 6|§11 row 8/;
      assert.match(cited, required, `${control.id} does not cite the decision that requires it`);
    }
  });

  test("every control asserts forbidden mutations, not only eventual state", () => {
    for (const control of UNSAFE_CONTROLS) {
      const forbidding = control.steps.filter((step) => (step.expect.forbids ?? []).length > 0);
      assert.ok(forbidding.length > 0, `${control.id} asserts no forbidden mutation`);
    }
  });
});

describe("K0 cancellation control: M-1's named assertions are all present", () => {
  const forbids = forbidsText(cancelVersusComplete);
  const stepLabels = labels(cancelVersusComplete);

  test("CX-6 full rejection is asserted for `continue`, `complete` and a deadline-bearing `await`", () => {
    const commands = cancelVersusComplete.steps.map((step) => step.command);
    const fencedSubmissions = commands.filter(
      (command) => command.kind === "submit_outcome" && command.outcome.executionId === "exec-x",
    );
    const nextSteps = fencedSubmissions.map((command) =>
      command.kind === "submit_outcome" ? command.outcome.next.step : "",
    );
    assert.deepEqual(nextSteps, ["continue", "complete", "await"]);
    const losingAwait = fencedSubmissions.find(
      (command) => command.kind === "submit_outcome" && command.outcome.next.step === "await",
    );
    assert.ok(losingAwait && losingAwait.kind === "submit_outcome");
    const wait = losingAwait.outcome.next.step === "await" ? losingAwait.outcome.next.wait : null;
    assert.ok(wait && wait.deadline !== undefined, "the losing `await` must carry a wait with a deadline, or CX-6's zero-deadline clause has no schedule exercising it");
  });

  test("zero acknowledgment of the reserved batch is asserted", () => {
    assert.match(forbids, /acknowledged must stay empty/);
    assert.match(forbids, /acknowledges none of its reserved batch/);
  });

  test("no change to accepted progress or emissions is asserted", () => {
    assert.match(forbids, /progress must stay null/);
    assert.match(forbids, /progressRevision must stay 0/);
    assert.match(forbids, /emissions must stay empty/);
  });

  test("B-5 disposition at CANCELLED is asserted", () => {
    const fenced = cancelVersusComplete.steps.find((step) => step.command.kind === "accept_cancellation");
    assert.ok(fenced);
    assert.equal(fenced.expect.observation.state, "CANCELLED");
    assert.deepEqual(fenced.expect.observation.terminalDispositions, ["in-1"]);
    assert.deepEqual(fenced.expect.observation.acknowledged, []);
  });

  test("a deterministic recorded rejection on exact retry is asserted", () => {
    const retry = cancelVersusComplete.steps.find(
      (step) => step.command.kind === "resubmit_outcome" && step.command.outcome.executionId === "exec-x",
    );
    assert.ok(retry);
    assert.equal(retry.expect.observation.rejection?.classification, "cancellation_terminal_conflict");
    assert.equal(retry.expect.observation.rejection?.reason, "cancellation accepted before Outcome acceptance");
    assert.equal(retry.expect.observation.receipt, "receipt:create:req-x", "a rejected retry must not carry an Outcome receipt");
  });

  test("the reverse order is asserted: accepted completion remains terminal", () => {
    assert.match(stepLabels, /reverse order/);
    const laterCancel = cancelVersusComplete.steps.find(
      (step) => step.command.kind === "accept_cancellation" && step.command.executionId === "exec-y",
    );
    assert.ok(laterCancel);
    assert.equal(laterCancel.expect.observation.state, "COMPLETED");
    assert.match(forbids, /terminal states do not reopen/);
  });

  test("M-1's named failing variant is written down as a forbidden mutation", () => {
    assert.match(forbids, /suppressing only the next state while installing losing progress/i);
  });
});

describe("K0 remaining controls: their defining assertion is present", () => {
  test("duplicate control distinguishes replay from conflict", () => {
    const forbids = forbidsText(duplicateAndConflictingOutcome);
    assert.match(forbids, /duplicate delivery is permitted, duplicate progress acceptance is not/);
    assert.match(forbids, /never merged or patched/);
  });

  test("stale-timer control asserts both the lost wake and generation fencing", () => {
    const forbids = forbidsText(staleTimerAndLostWake);
    assert.match(forbids, /lost wake/);
    assert.match(forbids, /stale timer cannot wake a replacement wait/);
    assert.match(forbids, /at most one timeout Event exists per generation/);
    assert.match(forbids, /never proof the awaited work did not happen/);
  });

  test("missing-checkpoint control forbids the fresh-restored fabrication", () => {
    const forbids = forbidsText(missingCheckpointCode);
    assert.match(forbids, /never be presented as the restored one/);
    assert.match(forbids, /must not discard accepted progress or silently start over/);
    const held = missingCheckpointCode.steps.find((step) => step.expect.observation.recoveryHold !== null);
    assert.ok(held, "the control must actually reach an inspectable recovery hold");
    assert.match(held.expect.observation.recoveryHold?.reason ?? "", /unavailable/);
  });
});
