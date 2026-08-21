import type { Condition, ConditionTrace, FlowDefinition, Phase, TransitionEvaluation, TransitionTiming } from "./types.ts";
import type { SessionState, ToolResultRecord } from "../session/state.ts";
import { changedOnTurn } from "../memory/structured.ts";

/**
 * Condition evaluation.
 *
 * Pure, total, and explanatory: every evaluation returns a `ConditionTrace` saying exactly why the
 * condition held or did not. There is no expression parser and no code execution - the DSL is a
 * closed union, so a stored definition can never smuggle in behaviour.
 */

export interface ConditionInput {
  state: SessionState;
  /** Signals from this turn's interpretation pass. */
  signals: string[];
  /** Tool results from this turn, for `tool_succeeded` / `tool_failed`. */
  toolResults: ToolResultRecord[];
}

export function evaluateCondition(condition: Condition, input: ConditionInput): ConditionTrace {
  switch (condition.kind) {
    case "always":
      return { kind: "always", detail: "unconditional", result: true };

    case "memory_equals": {
      const entry = input.state.memory[condition.field];
      const actual = entry?.value;
      const result = Array.isArray(actual)
        ? false
        : typeof actual === "string" && typeof condition.value === "string"
          ? actual.toLowerCase() === condition.value.toLowerCase()
          : actual === condition.value;
      return {
        kind: "memory_equals",
        detail: `memory.${condition.field} = ${JSON.stringify(actual)}, expected ${JSON.stringify(condition.value)}`,
        result,
      };
    }

    case "memory_present": {
      const entry = input.state.memory[condition.field];
      const present = entry !== undefined && entry.value !== "" && !(Array.isArray(entry.value) && entry.value.length === 0);
      return { kind: "memory_present", detail: `memory.${condition.field} = ${JSON.stringify(entry?.value)}`, result: present };
    }

    case "memory_absent": {
      const entry = input.state.memory[condition.field];
      const present = entry !== undefined && entry.value !== "" && !(Array.isArray(entry.value) && entry.value.length === 0);
      return { kind: "memory_absent", detail: `memory.${condition.field} = ${JSON.stringify(entry?.value)}`, result: !present };
    }

    case "memory_changed": {
      const result = changedOnTurn(input.state.memory, condition.field, input.state.turn);
      return {
        kind: "memory_changed",
        detail: `memory.${condition.field} last written on turn ${input.state.memory[condition.field]?.turn ?? "never"} (current turn ${input.state.turn})`,
        result,
      };
    }

    case "signal": {
      const result = input.signals.includes(condition.name);
      return { kind: "signal", detail: `signal "${condition.name}" in [${input.signals.join(", ")}]`, result };
    }

    case "tool_succeeded": {
      const result = input.toolResults.some((r) => r.toolName === condition.tool && r.ok);
      return { kind: "tool_succeeded", detail: `results this turn: ${describeResults(input.toolResults)}`, result };
    }

    case "tool_failed": {
      const result = input.toolResults.some((r) => r.toolName === condition.tool && !r.ok);
      return { kind: "tool_failed", detail: `results this turn: ${describeResults(input.toolResults)}`, result };
    }

    case "all": {
      const children = condition.of.map((c) => evaluateCondition(c, input));
      return { kind: "all", detail: `${children.filter((c) => c.result).length}/${children.length} sub-conditions held`, result: children.every((c) => c.result), children };
    }

    case "any": {
      const children = condition.of.map((c) => evaluateCondition(c, input));
      return { kind: "any", detail: `${children.filter((c) => c.result).length}/${children.length} sub-conditions held`, result: children.some((c) => c.result), children };
    }

    case "not": {
      const child = evaluateCondition(condition.of, input);
      return { kind: "not", detail: `negating a condition that was ${child.result}`, result: !child.result, children: [child] };
    }
  }
}

function describeResults(results: ToolResultRecord[]): string {
  return results.length ? results.map((r) => `${r.toolName}=${r.ok ? "ok" : "failed"}`).join(", ") : "none";
}

export function findPhase(flow: FlowDefinition, phaseId: string | null): Phase | undefined {
  if (!phaseId) return undefined;
  return flow.phases.find((p) => p.id === phaseId);
}

/**
 * Evaluates outgoing transitions for the current phase at one timing point.
 *
 * The FIRST transition whose condition holds wins - declaration order is the priority order, which
 * keeps routing predictable and reviewable. Every candidate is returned, fired or not, so a trace
 * shows the ones that were considered and rejected.
 */
export function evaluateTransitions(
  flow: FlowDefinition,
  timing: TransitionTiming,
  input: ConditionInput,
): { evaluations: TransitionEvaluation[]; fired: TransitionEvaluation | null } {
  const current = findPhase(flow, input.state.phaseId);
  if (!current || current.terminal === true) return { evaluations: [], fired: null };

  const evaluations: TransitionEvaluation[] = [];
  let fired: TransitionEvaluation | null = null;

  for (const transition of current.transitions ?? []) {
    if (transition.on !== timing) continue;
    // Once one has fired, later transitions are not evaluated at all - recording them as
    // `fired: false` would misleadingly suggest their conditions were tested and failed.
    if (fired) break;
    const trace = evaluateCondition(transition.when, input);
    const evaluation: TransitionEvaluation = {
      from: current.id,
      to: transition.to,
      on: timing,
      label: transition.label,
      fired: trace.result && transition.to !== current.id,
      trace,
    };
    evaluations.push(evaluation);
    if (evaluation.fired) fired = evaluation;
  }

  return { evaluations, fired };
}
