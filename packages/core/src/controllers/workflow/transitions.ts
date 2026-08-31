/**
 * Transition resolution: the only place a Workflow decides where to go next.
 *
 * Topology is system-defined, so this function's whole job is to refuse anything the definition did
 * not declare. A Stage - or a model inside one - produces a *label*; the definition maps labels to
 * targets. Nothing produces a Stage id, and there is no path by which a label that was not authored
 * resolves to anything at all.
 *
 * ```text
 * Stage completion
 *   result: text | none
 *   transitionKey?: string
 *
 * WorkflowSpec
 *   predefined transitionKey -> StageId | complete
 * ```
 *
 * A Stage with one unconditional successor is declared `always` and needs no label, because
 * inventing a ceremonial label for a linear edge proves nothing. Under `always`, *every* label is
 * undeclared, so naming one is an error rather than something quietly ignored - a Function Stage
 * that returns a label its Workflow never declared has a bug, and a Workflow that swallows it has a
 * worse one.
 */

import type { StageTransitions, TransitionTarget } from "../../workflow/spec.ts";
import { transitionLabels } from "../../workflow/spec.ts";

export type TransitionResolutionCode =
  | "unknown_transition_label"
  | "missing_transition_label"
  | "unexpected_transition_label";

export type TransitionResolution =
  | { readonly ok: true; readonly target: TransitionTarget }
  | { readonly ok: false; readonly code: TransitionResolutionCode; readonly message: string };

export function resolveTransition(
  stageId: string,
  transitions: StageTransitions,
  label: string | null,
): TransitionResolution {
  if (transitions.kind === "always") {
    if (label !== null) {
      return {
        ok: false,
        code: "unexpected_transition_label",
        message: `stage "${stageId}" declares a single unconditional transition, so the label ${JSON.stringify(label)} names nothing`,
      };
    }
    return { ok: true, target: transitions.next };
  }

  const declared = transitionLabels(transitions);
  if (label === null) {
    return {
      ok: false,
      code: "missing_transition_label",
      message: `stage "${stageId}" branches and produced no transition label; expected one of ${declared.join(", ")}`,
    };
  }
  const match = transitions.cases.find((entry) => entry.label === label);
  if (!match) {
    return {
      ok: false,
      code: "unknown_transition_label",
      message: `stage "${stageId}" produced transition label ${JSON.stringify(label)}, which it does not declare; expected one of ${declared.join(", ")}`,
    };
  }
  return { ok: true, target: match.next };
}
