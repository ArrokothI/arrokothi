/**
 * Optional coarse flow.
 *
 * Phases are optional on purpose. An agent with no `flow` simply converses - ordinary conversation
 * must not become a ten-state form. When a flow is present it is coarse: a handful of phases with
 * an objective and optional scoping, not a slot-filling machine.
 */

/**
 * The condition DSL is a closed discriminated union, evaluated by a pure function that returns an
 * explanation. It is deliberately small and inspectable, and it contains **no** arbitrary code
 * execution - no expressions, no eval, no user-supplied functions. Everything here survives a
 * round trip through JSON.
 */
export type Condition =
  | { kind: "always" }
  | { kind: "memory_equals"; field: string; value: string | number | boolean }
  | { kind: "memory_present"; field: string }
  | { kind: "memory_absent"; field: string }
  /** True when the field was committed *this turn* - i.e. the user just supplied or corrected it. */
  | { kind: "memory_changed"; field: string }
  /** A semantic routing signal emitted by Interpret + Plan. Model understanding enters here. */
  | { kind: "signal"; name: string }
  | { kind: "tool_succeeded"; tool: string }
  | { kind: "tool_failed"; tool: string }
  | { kind: "all"; of: Condition[] }
  | { kind: "any"; of: Condition[] }
  | { kind: "not"; of: Condition };

/**
 * `pre_response`  - evaluated after planning/memory commits and BEFORE the reply is generated,
 *                   so "actually, I want to sell instead" reroutes the same turn that states it.
 * `action_result` - evaluated after a tool result, so a successful handoff can move to a terminal phase.
 */
export type TransitionTiming = "pre_response" | "action_result";

export interface Transition {
  to: string;
  on: TransitionTiming;
  when: Condition;
  label?: string;
}

export interface Phase {
  id: string;
  objective: string;
  instructions?: string;
  /** Explicitly suppresses named global defaults in this phase. Invariants cannot be overridden. */
  overrideRuleIds?: string[];
  /** Optional scoping. Absent means every bound source/tool is available in this phase. */
  knowledgeSourceIds?: string[];
  toolNames?: string[];
  transitions?: Transition[];
  /** A terminal phase evaluates no outgoing transitions. */
  terminal?: boolean;
}

export interface FlowDefinition {
  initialPhaseId: string;
  phases: Phase[];
}

/** Per-condition explanation, so a trace can show exactly why a transition did or did not fire. */
export interface ConditionTrace {
  kind: Condition["kind"];
  detail: string;
  result: boolean;
  children?: ConditionTrace[];
}

export interface TransitionEvaluation {
  from: string;
  to: string;
  on: TransitionTiming;
  label?: string;
  fired: boolean;
  trace: ConditionTrace;
}
