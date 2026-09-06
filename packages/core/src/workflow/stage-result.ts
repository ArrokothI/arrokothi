/**
 * What one Stage hands to the next.
 *
 * ```text
 * StageResult = text | none
 * ```
 *
 * This is deliberately the smallest useful edge value in the whole kernel, and it is a hypothesis
 * the conformance suite is meant to test rather than a convenience that grew. Widening it to
 * arbitrary JSON the first time an implementation wants structured transfer would quietly turn
 * Workflow transitions into a second general-purpose shared-state mechanism, at which point the
 * graph stops describing the data flow. Structured or persistent cross-Stage information belongs in
 * Structured Memory, Artifacts, or bound resources - none of which exist yet, which is exactly why
 * current scenarios are shaped to need only text.
 *
 * Two things it is not:
 *
 *   not the enclosing Execution's terminal result
 *     Terminal results are definition-typed and Harness-validated (see
 *     `execution/terminal-result.ts`). A Stage producing text does not complete anything.
 *
 *   not a place to smuggle data
 *     `null` means *none*, not "empty string" and not "unknown".
 */

export type StageResult = string | null;

export function isStageResult(value: unknown): value is StageResult {
  return value === null || typeof value === "string";
}

/** Renders a Stage result for a prompt or a trace. `none` is stated, never silently blank. */
export function describeStageResult(result: StageResult): string {
  return result === null ? "(none)" : result;
}
