import type { AssertionResult, BenchmarkScenario, Outcome, ScenarioResult, TurnContext } from "./types.ts";

/**
 * Grading.
 *
 * Faithfully ported from the canonical P01/P02 grading contract: hard failures dominate soft ones,
 * an assertion that cannot be judged is reported `inapplicable` rather than guessed, and a run that
 * never reached the model is `inconclusive` rather than scored against the agent.
 *
 * Grading never calls a model. It runs offline against stored transcripts, so a result can always be
 * re-graded after a detector fix without spending any quota.
 */

export interface RunRecord {
  replies: string[];
  fields: TurnContext["fields"];
  phaseId: string | null;
  actionsAttempted: string[];
  actionSuccess: boolean | null;
  /** Per-turn: did a real model answer? `false` means a degraded/fallback turn. */
  modelBacked: boolean[];
  harnessError?: string;
}

export interface GradeOutput {
  outcome: Outcome;
  reason: string | null;
  assertions: AssertionResult[];
}

export function grade(scenario: BenchmarkScenario, run: RunRecord): GradeOutput {
  if (run.harnessError) {
    return { outcome: "inconclusive", reason: `harness failure: ${run.harnessError}`, assertions: [] };
  }
  if (!run.replies.length) {
    return { outcome: "inconclusive", reason: "no replies produced", assertions: [] };
  }

  const anyModel = run.modelBacked.some(Boolean);
  if (!anyModel) {
    return {
      outcome: "inconclusive",
      reason: "no turn ran on a real model - this measures the harness, not the agent",
      assertions: [],
    };
  }

  const idx = (turn: number) => (turn === -1 ? run.replies.length - 1 : turn);
  const ctxAt = (turn: number): TurnContext => ({
    reply: run.replies[idx(turn)] ?? "",
    allReplies: run.replies.join("\n\n"),
    fields: run.fields,
    phaseId: run.phaseId,
    actionsAttempted: run.actionsAttempted,
    actionSuccess: run.actionSuccess,
  });

  const assertions: AssertionResult[] = [];
  const anyDegraded = run.modelBacked.some((m) => !m);

  for (const assertion of scenario.assertions) {
    const turnIndex = idx(assertion.turn);

    // A text assertion is unjudgeable when ITS OWN turn ran degraded. State is CUMULATIVE - built
    // across every turn - so one degraded turn anywhere means the final state may be missing an
    // extraction that never got a chance to run, and judging it would blame the agent for the
    // harness.
    const degraded =
      (assertion.kind === "text" && run.modelBacked[turnIndex] === false) ||
      ((assertion.kind === "state" || assertion.kind === "action") && anyDegraded);

    if (degraded) {
      assertions.push({
        id: assertion.id,
        label: assertion.label,
        kind: assertion.kind,
        severity: assertion.severity,
        applicable: false,
        passed: null,
        detail: `turn ${turnIndex} did not run on the model - not judgeable`,
      });
      continue;
    }

    let result: { passed: boolean; detail: string } | null;
    try {
      result = assertion.check(ctxAt(assertion.turn));
    } catch (error) {
      result = { passed: false, detail: `assertion threw: ${error instanceof Error ? error.message : String(error)}` };
    }

    if (result === null) {
      assertions.push({
        id: assertion.id,
        label: assertion.label,
        kind: assertion.kind,
        severity: assertion.severity,
        applicable: false,
        passed: null,
        detail: "not applicable to this implementation",
      });
      continue;
    }

    assertions.push({
      id: assertion.id,
      label: assertion.label,
      kind: assertion.kind,
      severity: assertion.severity,
      applicable: true,
      passed: result.passed,
      detail: result.detail,
    });
  }

  const applicable = assertions.filter((a) => a.applicable);
  if (!applicable.length) {
    return { outcome: "inconclusive", reason: "no assertion could be judged on this run", assertions };
  }

  const hardFails = applicable.filter((a) => a.severity === "hard" && !a.passed);
  const softFails = applicable.filter((a) => a.severity === "soft" && !a.passed);
  return {
    outcome: hardFails.length ? "hard_fail" : softFails.length ? "soft_fail" : "pass",
    reason: null,
    assertions,
  };
}

/**
 * Runs every assertion purely to see that it EXECUTES against a projected state.
 *
 * This is not grading and its pass/fail values are discarded: an assertion that throws means the
 * adapter is broken, which is exactly what a self-check needs to catch and what grading - correctly
 * returning `inconclusive` when no model answered - cannot tell you.
 */
export function checkAssertionsExecutable(
  scenario: BenchmarkScenario,
  run: RunRecord,
): { assertionsRun: number; threw: { id: string; error: string }[] } {
  const threw: { id: string; error: string }[] = [];
  const idx = (turn: number) => (turn === -1 ? run.replies.length - 1 : turn);

  for (const assertion of scenario.assertions) {
    try {
      assertion.check({
        reply: run.replies[idx(assertion.turn)] ?? "",
        allReplies: run.replies.join("\n\n"),
        fields: run.fields,
        phaseId: run.phaseId,
        actionsAttempted: run.actionsAttempted,
        actionSuccess: run.actionSuccess,
      });
    } catch (error) {
      threw.push({ id: assertion.id, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { assertionsRun: scenario.assertions.length, threw };
}

export function tally(results: ScenarioResult[]): Record<Outcome, number> {
  const totals: Record<Outcome, number> = { pass: 0, soft_fail: 0, hard_fail: 0, inconclusive: 0 };
  for (const result of results) totals[result.outcome]++;
  return totals;
}

// ---------------------------------------------------------------------------
// Shared detectors, ported verbatim in behaviour from the canonical artifacts.
// ---------------------------------------------------------------------------

export const has = (text: string, ...needles: (string | RegExp)[]): boolean =>
  needles.some((n) => (typeof n === "string" ? text.toLowerCase().includes(n.toLowerCase()) : n.test(text)));

/** Every number stated as cubic metres. Tolerant of m3 / cubic meters, and keeps BOTH range bounds. */
export function cubicMetres(text: string): number[] {
  const out = new Set<number>();
  const range = /(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*(?:m³|m3\b|cubic\s+met(?:er|re)s?)/gi;
  let m: RegExpExecArray | null;
  while ((m = range.exec(text))) {
    if (m[1]) out.add(Number(m[1]));
    if (m[2]) out.add(Number(m[2]));
  }
  const single = /(\d+(?:\.\d+)?)\s*(?:m³|m3\b|cubic\s+met(?:er|re)s?)/gi;
  while ((m = single.exec(text))) if (m[1]) out.add(Number(m[1]));
  return [...out];
}

/** Half the product's own 0.1 m3 display precision. Justified by display precision, not by tuning. */
export const VOLUME_TOLERANCE = 0.05;

export const statesVolume = (text: string, expected: number, tol = VOLUME_TOLERANCE): boolean =>
  cubicMetres(text).some((v) => Math.abs(v - expected) <= tol);

/** Every dollar figure, normalized ($18,900,000 / $18.9M / $18.9 million). */
export function dollarAmounts(text: string): number[] {
  const out: number[] = [];
  const millions = /\$\s?(\d+(?:\.\d+)?)\s*(?:m\b|million)/gi;
  let m: RegExpExecArray | null;
  while ((m = millions.exec(text))) if (m[1]) out.push(Math.round(Number(m[1]) * 1_000_000));
  const full = /\$\s?(\d{1,3}(?:,\d{3})+|\d{4,})(?!\s*(?:m\b|million))/gi;
  while ((m = full.exec(text))) if (m[1]) out.push(Number(m[1].replace(/,/g, "")));
  return out;
}
