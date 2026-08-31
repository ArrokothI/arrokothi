/**
 * The ExecutionDefinition union.
 *
 * Agent and Workflow are the only definition kinds that instantiate an independently managed
 * Execution. Functions, LLM inferences, Stages, and Adapters are computation *inside* an
 * Execution, so they never appear here - adding `FunctionExecutionDefinition` or
 * `StageExecutionDefinition` would break the `composition != Execution boundary` invariant at the
 * type level.
 *
 * A definition is portable authored data. It declares *what* should run and what its terminal
 * result must look like. It never carries a provider client, an API key, a store, a scheduler, a
 * Harness, or an application tenant/session model; `validation.ts` enforces the structural half of
 * that rule.
 */

import type { ValueSchema } from "../schema/value-schema.ts";
import type { JsonObject } from "../util/json.ts";
import type { DefinitionId, DefinitionVersion } from "./ids.ts";

export type DefinitionKind = "agent" | "workflow";

export const DEFINITION_KINDS: readonly DefinitionKind[] = ["agent", "workflow"];

export function isDefinitionKind(value: unknown): value is DefinitionKind {
  return value === "agent" || value === "workflow";
}

/**
 * The declared shape of this definition's terminal result.
 *
 * This is Execution-level typing and is deliberately independent of the Workflow Stage transition
 * type. A Stage handing `text | none` to the next Stage says nothing about what the enclosing
 * Execution returns when it reaches `COMPLETED`.
 */
export interface TerminalResultSchema {
  readonly schemaId: string;
  readonly schemaVersion: number;
  readonly schema: ValueSchema;
}

export interface DefinitionBase {
  readonly id: DefinitionId;
  readonly version: DefinitionVersion;
  readonly kind: DefinitionKind;
  readonly name?: string;
  readonly description?: string;
  /** Author metadata. Data only; never a place to smuggle runtime objects. */
  readonly metadata?: JsonObject;
  /** Absent means this definition completes without a result value. */
  readonly terminalResult?: TerminalResultSchema;
}

/**
 * Slice A keeps the controller-specific body of a definition deliberately open: serializable data
 * that the kernel stores, pins, and hands to the controller registered for this kind without
 * interpreting it. Slice D narrows `AgentSpec` to the canonical Agent spec and Slice C narrows
 * `WorkflowSpec` to Stage topology. Freezing either now would guess at those slices.
 */
export type AgentSpec = JsonObject;
export type WorkflowSpec = JsonObject;

export interface AgentDefinition extends DefinitionBase {
  readonly kind: "agent";
  readonly spec: AgentSpec;
}

export interface WorkflowDefinition extends DefinitionBase {
  readonly kind: "workflow";
  readonly spec: WorkflowSpec;
}

export type ExecutionDefinition = AgentDefinition | WorkflowDefinition;

export function isAgentDefinition(definition: ExecutionDefinition): definition is AgentDefinition {
  return definition.kind === "agent";
}

export function isWorkflowDefinition(definition: ExecutionDefinition): definition is WorkflowDefinition {
  return definition.kind === "workflow";
}
