/**
 * K1.4-candidate KC-1: the five Kernel ablations, as data.
 *
 * Each row removes one Kernel decision and names the supported schedule that must then FAIL, the step,
 * the Observation fields and what the edited Kernel does instead (design 01 addendum 01 §A11, design
 * check 01 D01-CHK-09). The row is 012's registry record: site, obligation and the test that rejects it.
 *
 * Two runners read this one table, so they cannot drift apart:
 * - `ablations.test.ts`, the maintained test, which edits a temporary copy of the Kernel source;
 * - `ablation-probe.mjs`, which the mutation registry runs for the cases
 *   `k14-candidate.abl-1` to `-5` in `tests/fixtures/packet-tools/mutations.json` (owner choice 03).
 *   `ablations.test.ts` checks that each registered mutant is exactly its row's edit.
 *
 * This file is test-side data. It imports nothing, and the candidate does not import it.
 */

export interface Ablation {
  readonly id: string;
  /** File under `packages/kernel/src`. */
  readonly file: string;
  /** Text that must occur exactly once in that file. */
  readonly anchor: string;
  readonly edit: string;
  /** The decision the edit removes. */
  readonly obligation: string;
  /** A schedule the candidate supports. */
  readonly scenarioId: string;
  /** 0-based step at which the runner must first fail. */
  readonly step: number;
  /** Observation fields that step's failure must name. */
  readonly fields: readonly string[];
  /** What the edited Kernel does instead, as the run showed it. */
  readonly observed: RegExp;
}

export const ABLATIONS: readonly Ablation[] = [
  {
    id: "ABL-1",
    file: "coordinator.ts",
    anchor: "const already = record.acceptedOutcome(activationId);",
    edit: "const already = null;",
    obligation: "OA-2: an exact duplicate of an accepted Outcome is answered from its record, before fresh validation",
    scenarioId: "control-duplicate-conflicting-outcome",
    step: 3,
    fields: ["rejection"],
    observed: /expected no recorded rejection, observed \{"classification":"stale_exchange"/,
  },
  {
    id: "ABL-2",
    file: "coordinator.ts",
    anchor: "if (epochForCurrency !== null && epochForCurrency !== currentEpoch) {",
    edit: "if (false) {",
    obligation: "ID-4/OA-3: a proposal at a superseded writer epoch is refused as a stale exchange",
    scenarioId: "identity-create-and-activation",
    step: 7,
    fields: ["rejection"],
    // The grant fence still holds, so the stale Outcome does not commit: only the refusal's class changes.
    observed: /rejection classification: expected stale_exchange, observed unauthorized_submission/,
  },
  {
    id: "ABL-3",
    file: "coordinator.ts",
    anchor: '    if (record.state === "CANCELLED") {\n      if (identityUsable && capture.outcome !== null) return err(this.#refuseLosing(record, activationId, capture.outcome));',
    edit: "    if (false) {\n      if (identityUsable && capture.outcome !== null) return err(this.#refuseLosing(record, activationId, capture.outcome));",
    obligation: "CX-6: a proposal for a cancelled Execution loses with the cancellation classification and its fixed reason",
    scenarioId: "control-cancel-versus-complete",
    step: 3,
    fields: ["rejection"],
    observed: /rejection classification: expected cancellation_terminal_conflict, observed terminal_destination/,
  },
  {
    id: "ABL-4",
    file: "coordinator.ts",
    anchor: "    if (readiness === null) {\n      carriedEvents = record.queuedEvents(bound);",
    edit: "    if (true) {\n      carriedEvents = record.queuedEvents(bound);",
    obligation: "B-2/B-6: after wait-ended readiness the batch is selected by the retired wait's rule, not by acceptance order",
    scenarioId: "k0-trace",
    step: 7,
    fields: ["dispatchedBatch"],
    observed: /dispatchedBatch: expected \["cont-1"\], observed \["bq-1"\]/,
  },
  {
    id: "ABL-5",
    file: "outcome.ts",
    anchor: "  if (length !== null && length > 0) {\n    appendIssue(issues, {\n      path: \"effects\",",
    edit: "  if (false) {\n    appendIssue(issues, {\n      path: \"effects\",",
    obligation: "EF-1/EF-2: an Outcome proposing an Effect is refused whole at envelope validation",
    scenarioId: "effect-refusal-and-sink-attribution",
    step: 2,
    fields: ["state", "progressRevision", "progress", "emissions", "acknowledged", "queued", "dispatchedBatch", "activationId", "receipt", "rejection"],
    observed: /state: expected "RUNNING", observed "READY"/,
  },
];

/** What one FAIL result must show to count as the row's kill. Returns the reasons it does not. */
export function killProblems(
  ablation: Ablation,
  failures: readonly { readonly stepIndex: number; readonly detail: string }[],
): string[] {
  const problems: string[] = [];
  if (failures[0]?.stepIndex !== ablation.step) {
    problems.push(`the first failure is at step ${failures[0]?.stepIndex}, not the target step ${ablation.step}`);
  }
  const detail = failures
    .filter((failure) => failure.stepIndex === ablation.step)
    .map((failure) => failure.detail)
    .join("\n");
  if (/candidate threw/.test(detail)) problems.push("the step failed on a throw, not on an observation");
  for (const field of ablation.fields) {
    if (!new RegExp(`(^|[\\s;])${field}\\b`, "m").test(detail)) problems.push(`the failure does not name ${field}`);
  }
  if (!ablation.observed.test(detail)) problems.push(`the failure does not match ${ablation.observed}`);
  return problems;
}
