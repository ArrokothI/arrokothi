/**
 * The LLM Stage: bounded, program-defined model work.
 *
 * The distinction this file has to keep true is the Workflow/Agent one. An LLM Stage may contain
 * several predetermined model phases, may retrieve, and may let the model pick among predefined
 * branches - none of that makes it an Agent. What would make it an Agent is an open-ended
 * continuation space, so there is deliberately no loop here that runs "while the model wants more".
 *
 * The bound is structural rather than hopeful:
 *
 * ```text
 * phase i < N   callables exposed; the model may request predefined operations
 * phase N       no callables at all; this phase produces the Stage's answer
 * ```
 *
 * Because the final phase cannot see a callable, it cannot ask for more work, so the Stage
 * terminates after at most N model calls whatever the model does. A Stage that reaches its final
 * phase produces a result; it cannot choose to keep going, cannot choose a Stage that is not
 * declared, cannot rewrite topology, and cannot add a callable that was not authored.
 *
 * The capability path is the other half:
 *
 * ```text
 * model output (ModelCapabilityCall)
 *     -> validated against this Stage's predefined exposed set
 *     -> mapped from model-facing name to capability/operation identity
 *     -> returned upward as an Effect proposal
 *     -> Harness authorizes and dispatches
 * ```
 *
 * A `ModelCapabilityCall` is output data. It dispatches nothing. The provider never touches a
 * capability executor, and the model-facing name is never treated as an authority-bearing
 * identifier - the definition's explicit mapping decides what a name means, so a provider echoing an
 * unexpected string resolves to nothing rather than to whatever capability shares it.
 */

import type { ModelCapabilitySpec, ModelMessage, ModelStructuredOutputRequest } from "../../model/types.ts";
import type { FunctionStageOutcome, StageExecutionContext } from "../../ports/stage.ts";
import type { ObjectSchema } from "../../schema/value-schema.ts";
import type { JsonObject, JsonValue } from "../../util/json.ts";
import type { LLMStageDefinition, ModelCallableDeclaration } from "../../workflow/spec.ts";
import { transitionLabels } from "../../workflow/spec.ts";
import type { StageCapabilityRequest } from "../../workflow/observations.ts";
import { describeStageResult } from "../../workflow/stage-result.ts";
import type { WorkflowModelAccess, WorkflowTrace } from "./model-access.ts";
import { invokeStageModel } from "./model-access.ts";

/**
 * The most capability calls one phase may produce.
 *
 * A bound on fan-out, not on strategy. Without it a single model turn could enqueue an unbounded
 * number of required operations, which is amplification rather than open-ended continuation but is
 * just as unwelcome inside a Stage that claims to be bounded.
 */
export const MAX_CAPABILITY_CALLS_PER_PHASE = 8;

interface PendingCall {
  readonly key: string;
  readonly name: string;
  readonly callId: string | null;
}

interface LLMStageProgress {
  readonly phase: number;
  readonly messages: readonly ModelMessage[];
  readonly pending: readonly PendingCall[];
}

function readProgress(progress: JsonObject, stage: LLMStageDefinition, input: string): LLMStageProgress {
  const phase = typeof progress["phase"] === "number" ? (progress["phase"] as number) : 0;
  const messages = Array.isArray(progress["messages"])
    ? (progress["messages"] as unknown as ModelMessage[])
    : [{ role: "user" as const, content: renderPrompt(stage.prompt, input) }];
  const pending = Array.isArray(progress["pending"]) ? (progress["pending"] as unknown as PendingCall[]) : [];
  return { phase, messages, pending };
}

function writeProgress(progress: LLMStageProgress): JsonObject {
  return {
    phase: progress.phase,
    messages: progress.messages as unknown as JsonValue,
    pending: progress.pending as unknown as JsonValue,
  };
}

function renderPrompt(template: string, input: string): string {
  return template.replaceAll("{{input}}", input);
}

function callableSpecs(callables: readonly ModelCallableDeclaration[]): readonly ModelCapabilitySpec[] {
  return callables.map((callable) => ({
    name: callable.name,
    description: callable.description,
    input: callable.input,
  }));
}

/**
 * The structured shape a branching Stage asks its final phase for.
 *
 * `transition` is an enum over the labels the *definition* declares, so the model chooses among
 * predefined branches and can express nothing else. It cannot return a Stage id, and a value outside
 * the enum fails provider-boundary validation before the controller ever sees it.
 */
function transitionSchema(labels: readonly string[]): ObjectSchema {
  return {
    kind: "object",
    fields: {
      result: {
        required: false,
        description: "Text handed to the next Stage. Omit when this Stage passes nothing along.",
        schema: { kind: "string" },
      },
      transition: {
        required: true,
        description: "Which predefined transition this Workflow should take next.",
        schema: { kind: "enum", choices: [...labels] },
      },
    },
  };
}

function observationContent(value: JsonValue | undefined, error: { code: string; message: string } | undefined): string {
  if (error) return JSON.stringify({ error });
  return typeof value === "string" ? value : JSON.stringify(value ?? null);
}

/**
 * Runs one LLM Stage step.
 *
 * "Step" means: everything this Stage can do locally until it either finishes or needs a required
 * Effect. Several model phases may happen inside one Activation, because model inference is local
 * computation and does not cross the Harness. Only a required Effect ends the step.
 */
export async function runLLMStage(
  stage: LLMStageDefinition,
  context: StageExecutionContext,
  models: WorkflowModelAccess | undefined,
  trace: WorkflowTrace | undefined,
): Promise<FunctionStageOutcome> {
  const maxPhases = stage.maxModelPhases ?? 1;
  const labels = transitionLabels(stage.transitions);
  const branching = labels.length > 0;
  const callables = stage.callables ?? [];

  let progress = readProgress(context.progress, stage, describeStageResult(context.input));

  // Results of the previous phase's required operations re-enter as capability observations. A
  // denial, failure, or unknown outcome is reported to the model as faithfully as a success: the
  // Stage must be able to say what actually happened, not quietly present a non-event as data.
  if (progress.pending.length > 0) {
    const messages = [...progress.messages];
    for (const pending of progress.pending) {
      const observation = context.observations.find((candidate) => candidate.key === pending.key);
      if (!observation) {
        return {
          status: "failed",
          code: "stage_barrier_incomplete",
          message: `LLM stage "${stage.id}" resumed without an observation for required request "${pending.key}"`,
        };
      }
      messages.push({
        role: "capability",
        content:
          observation.outcome === "completed"
            ? observationContent(observation.observation, undefined)
            : observationContent(undefined, { code: observation.outcome, message: observation.error?.message ?? observation.outcome }),
        capability: pending.name,
        ...(pending.callId ? { capabilityCallId: pending.callId } : {}),
      });
    }
    progress = { phase: progress.phase, messages, pending: [] };
  }

  for (;;) {
    if (progress.phase >= maxPhases) {
      return {
        status: "failed",
        code: "llm_stage_phase_budget_exhausted",
        message: `LLM stage "${stage.id}" used its ${maxPhases} predetermined model phase(s) without producing a result`,
      };
    }

    const isFinalPhase = progress.phase + 1 >= maxPhases;
    const exposed: readonly ModelCapabilitySpec[] = isFinalPhase ? [] : callableSpecs(callables);
    const structured: ModelStructuredOutputRequest | undefined =
      isFinalPhase && branching
        ? { schema: transitionSchema(labels), name: "stage_outcome", description: `Result and predefined transition for stage "${stage.id}".` }
        : undefined;

    const { resolved, response } = await invokeStageModel(models, stage.model, {
      system: stage.system,
      messages: progress.messages,
      ...(exposed.length ? { capabilities: exposed } : {}),
      ...(structured ? { structuredOutput: structured } : {}),
      purpose: `stage:${stage.id}`,
    });

    const calls = response.output.capabilityCalls ?? [];
    trace?.modelInvoked?.({
      stageId: stage.id,
      visit: context.visit,
      purpose: "stage",
      phase: progress.phase + 1,
      logicalRef: stage.model.logicalRef,
      provider: resolved.provider,
      model: resolved.model,
      ...(response.metadata.finishReason !== undefined ? { finishReason: response.metadata.finishReason } : {}),
      capabilityCallCount: calls.length,
    });

    const messages = [...progress.messages];
    if (typeof response.output.text === "string" && response.output.text.length > 0) {
      messages.push({ role: "assistant", content: response.output.text });
    }
    progress = { phase: progress.phase + 1, messages, pending: [] };

    if (!isFinalPhase && calls.length > 0) {
      if (calls.length > MAX_CAPABILITY_CALLS_PER_PHASE) {
        return {
          status: "failed",
          code: "llm_stage_capability_fanout_exceeded",
          message: `LLM stage "${stage.id}" requested ${calls.length} operations in one phase; at most ${MAX_CAPABILITY_CALLS_PER_PHASE} are permitted`,
        };
      }
      const effects: StageCapabilityRequest[] = [];
      const pending: PendingCall[] = [];
      for (const [index, call] of calls.entries()) {
        const declared = callables.find((callable) => callable.name === call.capability);
        if (!declared) {
          // Defence in depth: the provider boundary already refuses an unrequested callable name.
          // A name is vocabulary, never identity, so an unmapped one resolves to nothing at all.
          return {
            status: "failed",
            code: "llm_stage_callable_not_exposed",
            message: `LLM stage "${stage.id}" received a call for "${call.capability}", which it does not expose`,
          };
        }
        const key = `phase${progress.phase}.call${index + 1}`;
        effects.push({
          key,
          capability: declared.capability,
          operation: declared.operation,
          input: call.input,
          ...(declared.resources ? { resources: declared.resources } : {}),
          ...(declared.deadlineMs !== undefined ? { deadlineMs: declared.deadlineMs } : {}),
        });
        pending.push({ key, name: declared.name, callId: call.id ?? null });
      }
      return { status: "awaitEffects", effects, progress: writeProgress({ ...progress, pending }) };
    }

    if (!isFinalPhase) {
      // The model asked for nothing. A Stage with an unconditional transition already has its
      // answer; a branching Stage still needs the structured choice, so it takes its final phase.
      if (!branching && typeof response.output.text === "string") {
        return { status: "completed", result: response.output.text, progress: writeProgress(progress) };
      }
      progress = { ...progress, phase: maxPhases - 1 };
      continue;
    }

    if (branching) {
      const structuredOutput = response.output.structured;
      if (!structuredOutput) {
        return {
          status: "failed",
          code: "llm_stage_missing_transition",
          message: `LLM stage "${stage.id}" branches but its model returned no structured transition choice`,
        };
      }
      const chosen = structuredOutput["transition"];
      const text = structuredOutput["result"];
      return {
        status: "completed",
        result: typeof text === "string" ? text : null,
        ...(typeof chosen === "string" ? { transition: chosen } : {}),
        progress: writeProgress(progress),
      };
    }

    return {
      status: "completed",
      result: typeof response.output.text === "string" ? response.output.text : null,
      progress: writeProgress(progress),
    };
  }
}
