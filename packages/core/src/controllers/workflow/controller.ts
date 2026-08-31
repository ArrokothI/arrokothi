/**
 * The WorkflowController: system-defined semantic topology, advanced one Stage step per Activation.
 *
 * This is a *new* controller. It does not subclass, rename, wrap, or translate the legacy
 * Flow/Phase coordinator, and it imports nothing from it: Flow was a closed conversational state
 * machine and Stage is a Workflow composition boundary, so a mechanical translation would have
 * carried the wrong ownership into the new path.
 *
 * ## What this owns, and what it must never touch
 *
 * ```text
 * WorkflowController          Harness
 *   which Stage is current      Execution lifecycle and WAITING derivation
 *   bounded Stage work          mailbox consumption
 *   the completion barrier      Effect authorization and dispatch
 *   transition resolution       persistence transaction and scheduling
 *   completion/failure proposal terminal-result validation
 * ```
 *
 * It holds a Function Stage registry, an Adapter registry, model access, a local resource
 * environment, and an optional trace sink. Every one of those is *local semantic computation* -
 * the same category as parsing a string. It holds no runtime store, no scheduler, no mutable
 * execution context, no effect processor, no capability executor, no authorizer, no settlement
 * function, and no lifecycle setter - and the architecture tests walk the import graph, and grep
 * these modules for those type names, to keep it that way.
 *
 * ## Stage != Execution
 *
 * A Stage gets no ExecutionId, no lifecycle, no mailbox, no authority envelope, and no scheduler
 * entry. What it gets is a visit number in Workflow control state. The enclosing Workflow Execution
 * is the thing that waits; a Stage is only what the Workflow is currently doing.
 *
 * ## The barrier
 *
 * ```text
 * Stage proposes Effect(s)
 *     -> controller records required correlation(s)
 *     -> Harness processes Effects
 *          fast: result Event already in the mailbox -> READY
 *          slow: pending Effect -> WAITING -> result Event -> READY
 *     -> controller consumes matching results
 *     -> barrier settles -> Stage may transition
 * ```
 *
 * Both paths run through the identical code here, because the controller never learns which one
 * happened: it proposes, it reports what it still needs, and it re-checks its barrier on every wake.
 * There is no Stage mailbox and no second event-history system.
 */

import type { DefinitionKind } from "../../definitions/types.ts";
import type { EmissionProposal } from "../../execution/emission.ts";
import type { EffectProposal } from "../../effects/types.ts";
import { useCapability } from "../../effects/types.ts";
import type { DeliveredEvent, WakeCondition } from "../../interaction/event-envelope.ts";
import { EFFECT_RESULT_EVENT_KINDS, isEffectResultEventKind } from "../../interaction/events.ts";
import type { ActivationInput, ActivationOutcome, ExecutionController } from "../../ports/controller.ts";
import type { AdapterRegistry } from "../../ports/adapter.ts";
import { emptyAdapterRegistry } from "../../ports/adapter.ts";
import type { LocalResourceEnvironment, LocalResourceView } from "../../ports/local-resource.ts";
import { emptyLocalResourceEnvironment } from "../../ports/local-resource.ts";
import type { FunctionStageOutcome, FunctionStageRegistry, StageExecutionContext } from "../../ports/stage.ts";
import { emptyFunctionStageRegistry, functionStageOutcomeIssues } from "../../ports/stage.ts";
import type { JsonObject, JsonValue } from "../../util/json.ts";
import type { BarrierEntry, WorkflowControlState } from "../../workflow/control-state.ts";
import {
  initialWorkflowControlState,
  observationsOf,
  readWorkflowControlState,
  settleBarrierEntry,
  stageCorrelationId,
  toControllerProgress,
  unsettledEntries,
} from "../../workflow/control-state.ts";
import type { StageObservationOutcome } from "../../workflow/observations.ts";
import type { StageDefinition, StageId, TransitionTarget, WorkflowSpec } from "../../workflow/spec.ts";
import type { StageResult } from "../../workflow/stage-result.ts";
import { validateWorkflowSpec } from "../../workflow/validation.ts";
import { runAdapterChain } from "./adapters.ts";
import { runLLMStage } from "./llm-stage.ts";
import type { WorkflowModelAccess, WorkflowTrace } from "./model-access.ts";
import { resolveTransition } from "./transitions.ts";

/** Guards a definition whose declared loop never reaches a completion transition. */
const DEFAULT_MAX_TRANSITIONS = 200;

export interface WorkflowControllerOptions {
  /** Resolves Function Stage implementation refs to application-wired code. */
  readonly functions?: FunctionStageRegistry;
  readonly adapters?: AdapterRegistry;
  /** Logical model resolution plus provider lookup. Absent means no LLM Stage can run. */
  readonly models?: WorkflowModelAccess;
  /** Materialized read-only local resources. Absent means every resource is unexposed. */
  readonly resources?: LocalResourceEnvironment;
  /** Optional local observation sink. Never persisted, never part of semantics. */
  readonly trace?: WorkflowTrace;
  readonly maxTransitions?: number;
}

interface Failure {
  readonly code: string;
  readonly message: string;
  readonly details?: JsonValue;
}

type StepOutcome =
  | { readonly kind: "awaitEffects"; readonly state: WorkflowControlState; readonly proposals: readonly EffectProposal[]; readonly emissions: readonly EmissionProposal[] }
  | { readonly kind: "continue"; readonly state: WorkflowControlState; readonly emissions: readonly EmissionProposal[] }
  | { readonly kind: "complete"; readonly state: WorkflowControlState; readonly terminal: JsonValue | undefined; readonly hasTerminal: boolean; readonly emissions: readonly EmissionProposal[] }
  | { readonly kind: "fail"; readonly state: WorkflowControlState; readonly failure: Failure; readonly emissions: readonly EmissionProposal[] };

/**
 * The entry Stage's input, taken from application start input.
 *
 * A Workflow's first Stage has no predecessor, so its input comes from outside: the first
 * `external.input` Event delivered before its first Activation, when that Event carries text. A
 * non-text payload yields `none` rather than a stringified object, because `StageResult` is text or
 * nothing and a JSON blob squeezed into it would be structured cross-Stage data by the back door.
 *
 * Deliberately narrow. Later application input is not consumed here - an Execution that is already
 * running is answering its own topology, and selective, correlated user/application input is Slice G
 * work (see `docs/development/005-slice-b-decisions.md`, DEC-B01). An application that needs its
 * input to be seen should deliver it before the first Activation is scheduled.
 */
function startInput(events: readonly DeliveredEvent[]): StageResult {
  for (const event of events) {
    if (event.kind !== "external.input") continue;
    if (typeof event.body.payload === "string") return event.body.payload;
  }
  return null;
}

/** Maps a delivered Effect-result Event to the barrier vocabulary. Settled is not successful. */
function outcomeOf(event: DeliveredEvent): {
  readonly outcome: StageObservationOutcome;
  readonly observation?: JsonValue;
  readonly error?: { readonly code: string; readonly message: string };
} | null {
  switch (event.kind) {
    case "capability.completed":
      return { outcome: "completed", observation: event.body.observation };
    case "capability.failed":
      return { outcome: "failed", error: { code: event.body.error.code, message: event.body.error.message } };
    case "capability.unknown":
      return { outcome: "unknown", error: { code: event.body.error.code, message: event.body.error.message } };
    case "effect.denied":
      return { outcome: "denied", error: { code: event.body.code, message: event.body.message } };
    case "effect.rejected":
      return { outcome: "rejected", error: { code: event.body.code, message: event.body.message } };
    default:
      return null;
  }
}

class WorkflowController implements ExecutionController {
  readonly kind: DefinitionKind = "workflow";

  private readonly functions: FunctionStageRegistry;
  private readonly adapters: AdapterRegistry;
  private readonly models: WorkflowModelAccess | undefined;
  private readonly resources: LocalResourceEnvironment;
  private readonly trace: WorkflowTrace | undefined;
  private readonly maxTransitions: number;

  constructor(options: WorkflowControllerOptions) {
    this.functions = options.functions ?? emptyFunctionStageRegistry;
    this.adapters = options.adapters ?? emptyAdapterRegistry;
    this.models = options.models;
    this.resources = options.resources ?? emptyLocalResourceEnvironment;
    this.trace = options.trace;
    this.maxTransitions = options.maxTransitions ?? DEFAULT_MAX_TRANSITIONS;
  }

  async activate(input: ActivationInput): Promise<ActivationOutcome> {
    const validation = validateWorkflowSpec(input.definition.spec);
    if (!validation.ok) {
      // Topology is validated at authoring, at deserialization, and at store time. Reaching here
      // means the pinned bytes are not a Workflow at all, which is a failure, never a guess.
      return this.failed(input.execution.control.progress, {
        code: "workflow_spec_invalid",
        message: validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "),
      });
    }
    const spec = validation.spec;

    const persisted = readWorkflowControlState(input.execution.control.progress);
    let state: WorkflowControlState;
    if (persisted) {
      state = this.collect(persisted, input.events);
    } else {
      // First Activation: install the entry Stage, which runs its input Adapters. An Adapter that
      // rejects here resolves through the same predefined policy as one anywhere else.
      const entered = await this.enterStage(spec, spec.entryStage, startInput(input.events), 1, 0);
      if (entered.kind !== "continue") return this.finish(entered);
      state = entered.state;
    }

    const outstanding = unsettledEntries(state);
    if (outstanding.length > 0) {
      return {
        control: { kind: "workflow", progress: toControllerProgress(state) },
        next: { status: "await_event", wake: this.wakeFor(state, outstanding) },
      };
    }

    const step = await this.step(spec, state, input);
    return this.finish(step);
  }

  // -- event collection ------------------------------------------------------

  /**
   * Folds delivered Effect results into the current visit's barrier.
   *
   * Three properties fall out of doing it this way. A result whose correlation belongs to an earlier
   * visit of the same Stage matches no entry and changes nothing, so a loop cannot be satisfied by
   * its own history. A duplicate result finds its entry already settled and is ignored, so nothing
   * settles twice. And an Event that is not an Effect result is simply not barrier information -
   * the controller owns interpretation of what it was handed, and does not treat every arrival as
   * progress.
   */
  private collect(state: WorkflowControlState, events: readonly DeliveredEvent[]): WorkflowControlState {
    let next = state;
    for (const event of events) {
      if (!isEffectResultEventKind(event.kind) || event.correlationId === null) continue;
      const mapped = outcomeOf(event);
      if (!mapped) continue;
      next = settleBarrierEntry(next, event.correlationId, mapped.outcome, {
        ...(mapped.observation !== undefined ? { observation: mapped.observation } : {}),
        ...(mapped.error !== undefined ? { error: mapped.error } : {}),
      }).state;
    }
    return next;
  }

  /**
   * What the Workflow still needs.
   *
   * With one outstanding operation the condition names its correlation exactly. With several it
   * waits broadly on Effect-result kinds and re-checks the barrier after each wake, which is the
   * mechanical join: no `AggregatorStage`, no per-operation wake, just "wake, fold, re-check".
   */
  private wakeFor(state: WorkflowControlState, outstanding: readonly BarrierEntry[]): WakeCondition {
    const single = outstanding.length === 1 ? outstanding[0]! : null;
    return {
      eventKinds: [...EFFECT_RESULT_EVENT_KINDS],
      correlationId: single ? single.correlationId : null,
      description: `stage ${state.currentStage} visit ${state.visit}: ${outstanding.length} required operation(s) outstanding`,
    };
  }

  // -- one Stage step --------------------------------------------------------

  private async step(spec: WorkflowSpec, state: WorkflowControlState, input: ActivationInput): Promise<StepOutcome> {
    const stage = spec.stages.find((candidate) => candidate.id === state.currentStage);
    if (!stage) {
      return {
        kind: "fail",
        state,
        emissions: [],
        failure: {
          code: "workflow_stage_missing",
          message: `Workflow control state names stage "${state.currentStage}", which the pinned definition does not declare`,
        },
      };
    }

    const view = this.viewFor(stage);
    const body = await this.runBody(stage, state, view, input);
    if (body.kind === "fail") return { kind: "fail", state, emissions: [], failure: body.failure };

    const emissions = body.outcome.status === "failed" ? [] : (body.outcome.emissions ?? []);
    const progress = body.outcome.status === "failed" ? state.stageProgress : (body.outcome.progress ?? state.stageProgress);
    const advanced: WorkflowControlState = { ...state, stageProgress: progress };

    if (body.outcome.status === "failed") {
      return {
        kind: "fail",
        state: advanced,
        emissions: [],
        failure: { code: body.outcome.code, message: body.outcome.message },
      };
    }

    if (body.outcome.status === "awaitEffects") {
      const barrier: BarrierEntry[] = [];
      const proposals: EffectProposal[] = [];
      for (const request of body.outcome.effects) {
        const correlationId = stageCorrelationId(state.currentStage, state.visit, request.key);
        barrier.push({
          key: request.key,
          correlationId,
          kind: "effect",
          capability: request.capability,
          operation: request.operation,
          settled: false,
          outcome: null,
          observation: null,
          error: null,
        });
        proposals.push(
          useCapability({
            capability: request.capability,
            operation: request.operation,
            ...(request.input !== undefined ? { input: request.input } : {}),
            requestKey: correlationId,
            ...(request.resources !== undefined ? { resources: [...request.resources] } : {}),
            ...(request.deadlineMs !== undefined ? { deadlineMs: request.deadlineMs } : {}),
            ...(request.idempotency !== undefined ? { idempotency: request.idempotency } : {}),
          }),
        );
      }
      return { kind: "awaitEffects", state: { ...advanced, barrier }, proposals, emissions };
    }

    // The body is done. Output Adapters settle before any transition is resolved.
    const adapted = await runAdapterChain({
      stageId: stage.id,
      visit: state.visit,
      position: "output",
      declarations: stage.outputAdapters ?? [],
      value: body.outcome.result,
      resources: view,
      adapters: this.adapters,
      models: this.models,
      trace: this.trace,
    });

    if (adapted.status === "failed") {
      return { kind: "fail", state: advanced, emissions, failure: { code: adapted.code, message: adapted.message } };
    }
    if (adapted.status === "rejected") {
      return this.applyRejection(spec, stage, advanced, adapted.reason, "output", emissions);
    }

    const label = body.outcome.transition ?? null;
    const resolution = resolveTransition(stage.id as string, stage.transitions, label);
    if (!resolution.ok) {
      return {
        kind: "fail",
        state: { ...advanced, provisionalResult: adapted.value },
        emissions,
        failure: { code: resolution.code, message: resolution.message },
      };
    }

    return this.applyTransition(spec, stage, advanced, resolution.target, adapted.value, label, emissions);
  }

  /** Runs the Stage body for its kind. Agent and Workflow Stages are explicitly unsupported here. */
  private async runBody(
    stage: StageDefinition,
    state: WorkflowControlState,
    view: LocalResourceView,
    input: ActivationInput,
  ): Promise<{ readonly kind: "ok"; readonly outcome: FunctionStageOutcome } | { readonly kind: "fail"; readonly failure: Failure }> {
    const context: StageExecutionContext = {
      stage,
      stageId: stage.id,
      visit: state.visit,
      input: state.stageInput,
      config: stage.kind === "function" ? (stage.config ?? {}) : {},
      progress: state.stageProgress,
      observations: observationsOf(state),
      resources: view,
      activation: {
        cancelled: input.activation.cancellation.cancelled,
        cancellationReason: input.activation.cancellation.reason,
        deadline: input.activation.budget.deadline,
      },
    };

    try {
      switch (stage.kind) {
        case "function": {
          const implementation = this.functions.resolve(stage.implementationRef);
          if (!implementation) {
            return {
              kind: "fail",
              failure: {
                code: "function_stage_implementation_missing",
                message: `no Function Stage implementation is wired for logical ref "${stage.implementationRef}"`,
              },
            };
          }
          const outcome = await implementation.run(context);
          const issues = functionStageOutcomeIssues(outcome);
          if (issues.length > 0) {
            return {
              kind: "fail",
              failure: {
                code: "invalid_function_stage_outcome",
                message: issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "),
              },
            };
          }
          return { kind: "ok", outcome };
        }
        case "llm":
          return { kind: "ok", outcome: await runLLMStage(stage, context, this.models, this.trace) };
        case "agent":
        case "workflow":
          // Definition-valid, runtime unsupported. Slice E owns child composition, so this reports
          // an explicit unsupported result rather than doing any of the tempting wrong things:
          // creating a child Execution, fabricating a child result, flattening the child's topology
          // into this graph, running the child definition as if it were a local function, or
          // proposing the `SpawnExecution` Effect that nothing can currently dispatch.
          return {
            kind: "fail",
            failure: {
              code: "stage_kind_unsupported",
              message: `stage "${stage.id}" is a ${stage.kind} Stage; child Execution composition is not implemented in this slice`,
              details: {
                stageId: stage.id as string,
                stageKind: stage.kind,
                childDefinitionId: stage.child.definitionId,
                childDefinitionVersion: stage.child.definitionVersion,
                supportedFrom: "slice-e",
              },
            },
          };
      }
    } catch (error) {
      return {
        kind: "fail",
        failure: { code: "stage_error", message: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  // -- transitions -----------------------------------------------------------

  private async applyTransition(
    spec: WorkflowSpec,
    from: StageDefinition,
    state: WorkflowControlState,
    target: TransitionTarget,
    result: StageResult,
    label: string | null,
    emissions: readonly EmissionProposal[],
  ): Promise<StepOutcome> {
    const transitions = state.transitions + 1;
    if (transitions > this.maxTransitions) {
      return {
        kind: "fail",
        state,
        emissions,
        failure: {
          code: "workflow_transition_limit",
          message: `this Workflow resolved ${transitions} transitions without reaching a completion target`,
        },
      };
    }

    if (target.to === "complete") {
      this.trace?.stageTransitioned?.({ from: from.id, visit: state.visit, label, to: "complete" });
      const terminal = target.terminal;
      // A Stage producing text has produced a value for the *next Stage*. Whether this Execution
      // returns anything is a separate, definition-declared contract that the Harness validates, so
      // a terminal value appears only when the completion transition explicitly proposes one.
      const hasTerminal = terminal !== undefined && terminal.kind === "value";
      return {
        kind: "complete",
        state: { ...state, provisionalResult: result, transitions },
        terminal: hasTerminal ? (terminal as { kind: "value"; value: JsonValue }).value : undefined,
        hasTerminal,
        emissions,
      };
    }

    this.trace?.stageTransitioned?.({ from: from.id, visit: state.visit, label, to: target.stage });
    const entered = await this.enterStage(spec, target.stage, result, state.visit + 1, transitions);
    return { ...entered, emissions };
  }

  /**
   * Enters a Stage: runs its input Adapters and installs a fresh visit.
   *
   * A new visit means a new `visit` number, empty Stage-local progress, and an empty barrier. That
   * is what makes a loop safe: correlations from the previous visit of this same Stage can never
   * match anything in the new one.
   */
  private async enterStage(
    spec: WorkflowSpec,
    stageId: StageId,
    incoming: StageResult,
    visit: number,
    transitions: number,
  ): Promise<StepOutcome> {
    const stage = spec.stages.find((candidate) => candidate.id === stageId);
    const base = initialWorkflowControlState(stageId, incoming);
    const state: WorkflowControlState = { ...base, visit, transitions };
    if (!stage) {
      return {
        kind: "fail",
        state,
        emissions: [],
        failure: {
          code: "workflow_stage_missing",
          message: `transition target "${stageId}" is not declared by this Workflow`,
        },
      };
    }

    const adapted = await runAdapterChain({
      stageId: stage.id,
      visit,
      position: "input",
      declarations: stage.inputAdapters ?? [],
      value: incoming,
      resources: this.viewFor(stage),
      adapters: this.adapters,
      models: this.models,
      trace: this.trace,
    });

    if (adapted.status === "failed") {
      return { kind: "fail", state, emissions: [], failure: { code: adapted.code, message: adapted.message } };
    }
    if (adapted.status === "rejected") {
      return this.applyRejection(spec, stage, state, adapted.reason, "input", []);
    }

    return { kind: "continue", state: { ...state, stageInput: adapted.value }, emissions: [] };
  }

  /**
   * Applies predefined Workflow policy to an Adapter rejection.
   *
   * The Adapter said "no"; it did not say where to go. `onAdapterReject` is authored in the
   * definition, so the destination is part of the declared topology like every other edge, and the
   * rejection reason travels to it as an ordinary Stage result. With no such declaration the
   * Workflow fails, which is the deterministic default - not a silent pass.
   */
  private async applyRejection(
    spec: WorkflowSpec,
    stage: StageDefinition,
    state: WorkflowControlState,
    reason: string,
    position: "input" | "output",
    emissions: readonly EmissionProposal[],
  ): Promise<StepOutcome> {
    if (!stage.onAdapterReject) {
      return {
        kind: "fail",
        state,
        emissions,
        failure: {
          code: "adapter_rejected",
          message: `${position} adapter on stage "${stage.id}" rejected the value: ${reason}`,
        },
      };
    }
    return this.applyTransition(spec, stage, state, stage.onAdapterReject, reason, null, emissions);
  }

  // -- helpers ---------------------------------------------------------------

  /**
   * The resource view for one Stage.
   *
   * Built from the Stage definition's declared `resourceViews` and nothing else, so a Stage sees the
   * intersection of what the application materialized and what its definition was authored to see.
   * Anything outside that is unreachable rather than merely unmentioned.
   */
  private viewFor(stage: StageDefinition): LocalResourceView {
    return this.resources.viewFor(stage.resourceViews ?? []);
  }

  private finish(step: StepOutcome): ActivationOutcome {
    const control = { kind: "workflow" as const, progress: toControllerProgress(step.state) };
    const emissions = step.emissions.length > 0 ? { emissions: step.emissions } : {};

    switch (step.kind) {
      case "awaitEffects":
        return {
          control,
          ...emissions,
          effects: step.proposals,
          next: { status: "await_event", wake: this.wakeFor(step.state, unsettledEntries(step.state)) },
        };
      case "continue":
        return { control, ...emissions, next: { status: "continue" } };
      case "complete":
        return {
          control,
          ...emissions,
          next: step.hasTerminal ? { status: "complete", result: { value: step.terminal as JsonValue } } : { status: "complete" },
        };
      case "fail":
        return {
          control,
          ...emissions,
          next: {
            status: "fail",
            failure: {
              code: step.failure.code,
              message: step.failure.message,
              ...(step.failure.details !== undefined ? { details: step.failure.details } : {}),
            },
          },
        };
    }
  }

  private failed(progress: JsonObject, failure: Failure): ActivationOutcome {
    return {
      control: { kind: "workflow", progress },
      next: {
        status: "fail",
        failure: {
          code: failure.code,
          message: failure.message,
          ...(failure.details !== undefined ? { details: failure.details } : {}),
        },
      },
    };
  }
}

export function createWorkflowController(options: WorkflowControllerOptions = {}): ExecutionController {
  return new WorkflowController(options);
}
