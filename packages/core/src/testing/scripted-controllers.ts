/**
 * Scripted Agent and Workflow controllers.
 *
 * Slice A proves the *shape* of the semantic spine, so these stand in for real controllers: they
 * consume delivered Events, keep progress across Activations, emit without completing, report a
 * wake dependency, propose terminal results, fail, and - deliberately - misreport, so conformance
 * can show the Harness refusing them.
 *
 * The script lives in the definition's `spec`, which means it is ordinary serializable authored
 * data. That is not a test convenience: it is the same constraint every real Agent or Workflow spec
 * will be under, and it keeps these controllers from becoming a back door for runtime objects.
 *
 * One Activation executes one step. The step cursor lives in controller progress, so "the same
 * Execution resumed where it left off" is observable rather than assumed.
 */

import type { AgentDefinition, WorkflowDefinition, TerminalResultSchema } from "../definitions/types.ts";
import { defineAgent, defineWorkflow } from "../definitions/validation.ts";
import type { DefinitionKind } from "../definitions/types.ts";
import { eventSatisfiesWake } from "../interaction/event-envelope.ts";
import type { WakeCondition } from "../interaction/event-envelope.ts";
import type { ActivationInput, ActivationOutcome, ExecutionController } from "../ports/controller.ts";
import type { EmissionProposal } from "../execution/emission.ts";
import type { JsonObject, JsonValue } from "../util/json.ts";

export type ScriptedControllerStep =
  /** Produce nonterminal output. The Execution stays alive and schedulable. */
  | { readonly do: "emit"; readonly text?: string; readonly data?: JsonValue }
  /** Local work that changes nothing observable; the Execution remains runnable. */
  | { readonly do: "continue" }
  /** Write into controller progress, so progress carried across Activations is checkable. */
  | { readonly do: "remember"; readonly key: string; readonly value: JsonValue }
  /** Report a wake dependency. The Harness, not this step, decides whether that means WAITING. */
  | { readonly do: "await"; readonly eventKinds?: readonly string[]; readonly correlationId?: string; readonly note?: string }
  /** Propose semantic completion. The Harness validates the value against the pinned schema. */
  | { readonly do: "complete"; readonly result?: JsonValue }
  | { readonly do: "fail"; readonly code: string; readonly message: string }
  /** Return an outcome the Harness must reject. */
  | { readonly do: "misreport"; readonly as: "wrong_kind" | "lifecycle_status" | "unserializable_progress" };

export interface ScriptedProgress extends JsonObject {
  step: number;
  awaiting: boolean;
  /** Every Event id this Execution has ever consumed, in order. */
  seenEvents: string[];
  notes: JsonObject;
}

const EMPTY: ScriptedProgress = { step: 0, awaiting: false, seenEvents: [], notes: {} };

function readProgress(value: JsonObject): ScriptedProgress {
  const step = typeof value["step"] === "number" ? (value["step"] as number) : 0;
  const awaiting = value["awaiting"] === true;
  const seenEvents = Array.isArray(value["seenEvents"]) ? ([...(value["seenEvents"] as JsonValue[])] as string[]) : [];
  const notes = (value["notes"] ?? {}) as JsonObject;
  return { step, awaiting, seenEvents, notes: { ...notes } };
}

function readProgram(spec: JsonObject): readonly ScriptedControllerStep[] {
  const program = spec["program"];
  return Array.isArray(program) ? (program as unknown as readonly ScriptedControllerStep[]) : [];
}

class ScriptedController implements ExecutionController {
  readonly kind: DefinitionKind;

  constructor(kind: DefinitionKind) {
    this.kind = kind;
  }

  activate(input: ActivationInput): ActivationOutcome {
    const progress = readProgress(input.execution.control.progress);
    for (const event of input.events) progress.seenEvents.push(event.eventId);

    const program = readProgram(input.definition.spec);
    const step = program[progress.step];

    if (step === undefined) {
      return this.outcome(progress, {
        status: "fail",
        failure: { code: "script_exhausted", message: `no step ${progress.step} in the scripted program` },
      });
    }

    switch (step.do) {
      case "emit": {
        progress.step += 1;
        const body: EmissionProposal["body"] =
          step.data !== undefined ? { kind: "data", data: step.data } : { kind: "text", text: step.text ?? "" };
        return this.outcome(progress, { status: "continue" }, [{ body }]);
      }

      case "continue": {
        progress.step += 1;
        return this.outcome(progress, { status: "continue" });
      }

      case "remember": {
        progress.step += 1;
        progress.notes[step.key] = step.value;
        return this.outcome(progress, { status: "continue" });
      }

      case "await": {
        const wake: WakeCondition = {
          eventKinds: step.eventKinds ? [...step.eventKinds] : [],
          correlationId: step.correlationId ?? null,
          ...(step.note !== undefined ? { description: step.note } : {}),
        };
        // An Event already delivered into this Activation is an answer, not something still owed.
        // Reporting a dependency that the controller can already satisfy would make the Harness
        // derive WAITING for work that is actually runnable.
        if (input.events.some((event) => eventSatisfiesWake(event, wake))) {
          progress.awaiting = false;
          progress.step += 1;
          return this.outcome(progress, { status: "continue" });
        }
        progress.awaiting = true;
        return this.outcome(progress, { status: "await_event", wake });
      }

      case "complete": {
        progress.step += 1;
        return this.outcome(
          progress,
          step.result === undefined ? { status: "complete" } : { status: "complete", result: { value: step.result } },
        );
      }

      case "fail": {
        progress.step += 1;
        return this.outcome(progress, { status: "fail", failure: { code: step.code, message: step.message } });
      }

      case "misreport": {
        progress.step += 1;
        if (step.as === "wrong_kind") {
          const other: DefinitionKind = this.kind === "agent" ? "workflow" : "agent";
          return { control: { kind: other, progress }, next: { status: "continue" } } as ActivationOutcome;
        }
        if (step.as === "lifecycle_status") {
          // A controller must not be able to name an operational state at all.
          return { control: { kind: this.kind, progress }, next: { status: "WAITING" } } as unknown as ActivationOutcome;
        }
        const poisoned = { ...progress, callback: () => undefined } as unknown as JsonObject;
        return { control: { kind: this.kind, progress: poisoned }, next: { status: "continue" } } as ActivationOutcome;
      }
    }
  }

  private outcome(
    progress: ScriptedProgress,
    next: ActivationOutcome["next"],
    emissions: readonly EmissionProposal[] = [],
  ): ActivationOutcome {
    return { control: { kind: this.kind, progress } as ActivationOutcome["control"], emissions, next };
  }
}

export function createScriptedAgentController(): ExecutionController {
  return new ScriptedController("agent");
}

export function createScriptedWorkflowController(): ExecutionController {
  return new ScriptedController("workflow");
}

export interface ScriptedDefinitionInput {
  readonly id: string;
  readonly version?: number;
  readonly name?: string;
  readonly program: readonly ScriptedControllerStep[];
  readonly terminalResult?: TerminalResultSchema;
}

function spec(program: readonly ScriptedControllerStep[]): JsonObject {
  return { program: program as unknown as JsonValue } as JsonObject;
}

export function scriptedAgentDefinition(input: ScriptedDefinitionInput): AgentDefinition {
  return defineAgent({
    id: input.id,
    ...(input.version !== undefined ? { version: input.version } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.terminalResult !== undefined ? { terminalResult: input.terminalResult } : {}),
    spec: spec(input.program),
  });
}

export function scriptedWorkflowDefinition(input: ScriptedDefinitionInput): WorkflowDefinition {
  return defineWorkflow({
    id: input.id,
    ...(input.version !== undefined ? { version: input.version } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.terminalResult !== undefined ? { terminalResult: input.terminalResult } : {}),
    spec: spec(input.program),
  });
}

export function readScriptedProgress(progress: JsonObject): ScriptedProgress {
  return readProgress(progress);
}

export const INITIAL_SCRIPTED_PROGRESS: ScriptedProgress = EMPTY;
