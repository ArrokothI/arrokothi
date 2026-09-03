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
 *
 * ## The other kind of waiting
 *
 * A slow *model* call is not that. It crosses no runtime boundary, produces no Event, and is
 * authorized by nobody - it is local computation that happens to take a long time. So it takes the
 * controller-local resumption path instead:
 *
 * ```text
 * Stage or Adapter starts a model call
 *     -> settles inside the Activation's inline budget?  keep going
 *     -> or not: persist the boundary position, report `await_resumption`
 *          Harness derives WAITING on that resumption; no Event, no Effect, no PendingOperation
 *     -> the provider answers -> READY -> a later Activation reconstructs the same call
 *          and is handed the stored result
 * ```
 *
 * The persisted position is what makes the second Activation cheap and correct. It records that the
 * Stage body already ran, which Adapter to run next, and which transition the body chose, so
 * resuming re-runs exactly the work that did not finish and nothing else.
 */

import type { DefinitionKind } from "../../definitions/types.ts";
import type { EmissionProposal } from "../../execution/emission.ts";
import type { EffectProposal } from "../../effects/types.ts";
import { callExecution, useCapability, writeMemory } from "../../effects/types.ts";
import type { DeliveredEvent, WakeCondition } from "../../interaction/event-envelope.ts";
import { EFFECT_RESULT_EVENT_KINDS, isEffectResultEventKind } from "../../interaction/events.ts";
import type { ChildCompletedBody } from "../../interaction/events.ts";
import type { ControllerResumptionId } from "../../execution/ids.ts";
import type { ActivationInput, ActivationOutcome, ExecutionController } from "../../ports/controller.ts";
import type { ControllerResumptionScope } from "../../ports/controller-resumption.ts";
import type { AdapterRegistry } from "../../ports/adapter.ts";
import { emptyAdapterRegistry } from "../../ports/adapter.ts";
import type { LocalResourceEnvironment, LocalResourceView } from "../../ports/local-resource.ts";
import { emptyLocalResourceEnvironment } from "../../ports/local-resource.ts";
import type { FunctionStageOutcome, FunctionStageRegistry, StageExecutionContext } from "../../ports/stage.ts";
import { emptyFunctionStageRegistry, functionStageOutcomeIssues } from "../../ports/stage.ts";
import type { JsonObject, JsonValue } from "../../util/json.ts";
import type {
  BarrierEntry,
  ChildBarrierEntry,
  ChildBarrierOutcome,
  WorkflowBoundaryState,
  WorkflowControlState,
} from "../../workflow/control-state.ts";
import {
  childBarrierEntry,
  initialWorkflowControlState,
  observationsOf,
  readWorkflowControlState,
  settleBarrierEntry,
  settleChildBarrierEntry,
  stageCorrelationId,
  toControllerProgress,
  unsettledEntries,
} from "../../workflow/control-state.ts";
import type { StageObservationOutcome } from "../../workflow/observations.ts";
import type {
  AgentStageDefinition,
  StageDefinition,
  StageId,
  TransitionTarget,
  WorkflowSpec,
  WorkflowStageDefinition,
} from "../../workflow/spec.ts";
import type { StageResult } from "../../workflow/stage-result.ts";
import { validateWorkflowSpec } from "../../workflow/validation.ts";
import { runAdapterChain } from "./adapters.ts";
import type { LLMStageOutcome } from "./llm-stage.ts";
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
  /** A model call outlived this Activation. The state carries enough to re-enter where it stopped. */
  | { readonly kind: "suspend"; readonly state: WorkflowControlState; readonly resumptionId: ControllerResumptionId; readonly emissions: readonly EmissionProposal[] }
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

/** Maps a delivered Effect-result Event to the effect-barrier vocabulary. Settled is not successful. */
function outcomeOf(event: DeliveredEvent): {
  readonly outcome: StageObservationOutcome;
  readonly observation?: JsonValue;
  readonly error?: { readonly code: string; readonly message: string };
} | null {
  switch (event.kind) {
    case "capability.completed":
      return { outcome: "completed", observation: event.body.observation };
    case "memory.written":
      return {
        outcome: "completed",
        observation: {
          effectKind: "write_memory",
          memoryViewId: event.body.memoryViewId,
          key: event.body.key,
          revision: event.body.revision,
        },
      };
    case "memory.write_conflict":
      // Slice G.0: a valid, authorized versioned WriteMemory whose optimistic precondition was stale.
      // The barrier settles `conflicted` - distinct from `rejected` / `denied` / `failed` - so the
      // Stage does not wait forever and Stage logic can re-read and decide.
      return {
        outcome: "conflicted",
        error: {
          code: "structured_memory_write_conflict",
          message:
            `the Structured Memory view is at revision ${event.body.actualRevision}, not the expected ` +
            `${event.body.expectedRevision}; the versioned write did not commit`,
        },
      };
    case "capability.failed":
      return { outcome: "failed", error: { code: event.body.error.code, message: event.body.error.message } };
    case "capability.unknown":
      return { outcome: "unknown", error: { code: event.body.error.code, message: event.body.error.message } };
    case "effect.denied":
      return { outcome: "denied", error: { code: event.body.code, message: event.body.message } };
    case "effect.rejected":
      return { outcome: "rejected", error: { code: event.body.code, message: event.body.message } };
    case "confirmation.declined":
      // A human declined the exact-payload confirmation for this required Effect. The barrier settles
      // `declined` - nothing dispatched, policy did not deny - so the Workflow does not wait forever.
      return {
        outcome: "declined",
        error: {
          code: "confirmation_declined",
          message: `a human declined the mechanical confirmation for this operation (${event.body.proposalDigest})`,
        },
      };
    default:
      return null;
  }
}

/**
 * Maps a delivered child-result Event to the child-barrier vocabulary.
 *
 * `child.completed` derives the cross-Stage `text | none` here. A structured/non-string terminal
 * value settles as `failed` - it is never JSON-stringified through the Stage edge. `effect.denied` /
 * `effect.rejected` mean the `SpawnExecution` request itself was refused, so no child ever existed.
 */
function childOutcomeOf(event: DeliveredEvent): {
  readonly outcome: ChildBarrierOutcome;
  readonly childResult?: string | null;
  readonly error?: { readonly code: string; readonly message: string };
} | null {
  switch (event.kind) {
    case "child.completed": {
      const terminal = (event.body as ChildCompletedBody).terminalResult;
      if (terminal.value === null) return { outcome: "completed", childResult: null };
      if (typeof terminal.value === "string") return { outcome: "completed", childResult: terminal.value };
      return {
        outcome: "failed",
        error: {
          code: "child_structured_terminal_result",
          message:
            "the child Execution produced a structured terminal result; the cross-Stage contract is text | none, " +
            "and structured data belongs in explicit shared resources, not hidden transition serialization",
        },
      };
    }
    case "child.failed":
      return { outcome: "failed", error: { code: event.body.failure.code, message: event.body.failure.message } };
    case "child.cancelled":
      return {
        outcome: "cancelled",
        error: {
          code: "child_cancelled",
          message: event.body.reason ?? "the child Execution was cancelled",
        },
      };
    case "effect.denied":
      return { outcome: "spawn_denied", error: { code: event.body.code, message: event.body.message } };
    case "effect.rejected":
      return { outcome: "spawn_rejected", error: { code: event.body.code, message: event.body.message } };
    case "confirmation.declined":
      // A human declined the exact-payload confirmation for the child `SpawnExecution`. No child was
      // created; distinct from a policy denial and from a runtime rejection.
      return {
        outcome: "spawn_declined",
        error: {
          code: "spawn_confirmation_declined",
          message: `a human declined the mechanical confirmation for this child call (${event.body.proposalDigest})`,
        },
      };
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

  async activate(input: ActivationInput, resumptions: ControllerResumptionScope): Promise<ActivationOutcome> {
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
      const entered = await this.enterStage(spec, spec.entryStage, startInput(input.events), 1, 0, resumptions);
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

    const step = await this.step(spec, state, input, resumptions);
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
      const target = next.barrier.find((entry) => entry.correlationId === event.correlationId);
      if (target === undefined) continue;
      if (target.kind === "child") {
        const mapped = childOutcomeOf(event);
        if (!mapped) continue;
        next = settleChildBarrierEntry(next, event.correlationId, {
          outcome: mapped.outcome,
          ...(mapped.childResult !== undefined ? { childResult: mapped.childResult } : {}),
          ...(mapped.error !== undefined ? { error: mapped.error } : {}),
        }).state;
        continue;
      }
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

  private async step(
    spec: WorkflowSpec,
    state: WorkflowControlState,
    input: ActivationInput,
    resumptions: ControllerResumptionScope,
  ): Promise<StepOutcome> {
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

    // Re-entry, before anything else. A boundary position means a previous Activation stopped part
    // way through this Stage's Adapters, and the work in front of that position has already been
    // done - the predecessor transition for an input boundary, the whole Stage body for an output
    // one. Running the ordinary path would redo it.
    const boundary = state.boundary;
    if (boundary !== null) {
      const resumed: WorkflowControlState = { ...state, boundary: null };
      return boundary.position === "input"
        ? this.runInputAdapters(spec, stage, resumed, boundary.adapterIndex, boundary.value, resumptions)
        : this.finishStage(
            spec,
            stage,
            resumed,
            boundary.value,
            boundary.transitionLabel,
            // The body's emissions were persisted by the Activation that ran it. Re-proposing them
            // here would deliver the same nonterminal output twice.
            [],
            boundary.adapterIndex,
            resumptions,
          );
    }

    // A settled child barrier: the Agent/Workflow Stage's one semantic operation - the child call -
    // has returned. Derive the Stage result from it and never re-propose the call.
    const settledChild = childBarrierEntry(state);
    if (settledChild !== undefined && settledChild.settled) {
      return this.finishChildStage(spec, stage, state, settledChild, resumptions);
    }

    const view = this.viewFor(stage);
    const body = await this.runBody(stage, state, view, input, resumptions);
    if (body.kind === "fail") return { kind: "fail", state, emissions: [], failure: body.failure };

    if (body.kind === "child") {
      // First visit of an Agent/Workflow Stage: propose exactly one child `call` and record one
      // child barrier entry. The Stage's adapted `StageResult` is the child's semantic input.
      const correlationId = stageCorrelationId(state.currentStage, state.visit, "child");
      const entry: ChildBarrierEntry = {
        kind: "child",
        key: "child",
        correlationId,
        childDefinitionId: body.child.definitionId,
        childDefinitionVersion: body.child.definitionVersion,
        childKind: body.child.childKind,
        requestedOperations: body.child.requestedOperations.map((ref) => ({
          capability: ref.capability,
          operation: ref.operation,
        })),
        settled: false,
        outcome: null,
        childResult: null,
        error: null,
      };
      const proposal: EffectProposal = callExecution({
        definitionId: body.child.definitionId,
        definitionVersion: body.child.definitionVersion,
        // `text` -> the child's input; `none` -> no input Event is delivered to the child.
        ...(body.child.input !== null ? { input: body.child.input } : {}),
        requestedOperations: body.child.requestedOperations,
        expectedChildKind: body.child.childKind,
        requestKey: correlationId,
      });
      return { kind: "awaitEffects", state: { ...state, barrier: [entry] }, proposals: [proposal], emissions: [] };
    }

    if (body.outcome.status === "suspended") {
      // The Stage body itself is mid-model-call. Its own progress is what re-entry needs; there is
      // no boundary position, because no Adapter is running.
      return {
        kind: "suspend",
        state: { ...state, stageProgress: body.outcome.progress },
        resumptionId: body.outcome.resumptionId,
        emissions: [],
      };
    }

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
        if (request.kind === "write_memory") {
          barrier.push({
            key: request.key,
            correlationId,
            kind: "effect",
            effectKind: "write_memory",
            memoryKey: request.memoryKey,
            settled: false,
            outcome: null,
            observation: null,
            error: null,
          });
          proposals.push(
            writeMemory({
              key: request.memoryKey,
              value: request.value,
              requestKey: correlationId,
              ...(request.expectedRevision !== undefined ? { expectedRevision: request.expectedRevision } : {}),
            }),
          );
        } else {
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
      }
      return { kind: "awaitEffects", state: { ...advanced, barrier }, proposals, emissions };
    }

    // The body is done. Output Adapters settle before any transition is resolved.
    return this.finishStage(spec, stage, advanced, body.outcome.result, body.outcome.transition ?? null, emissions, 0, resumptions);
  }

  /**
   * Everything after a Stage body completes: output Adapters, then the transition.
   *
   * Entered twice for one Stage visit when an output Adapter suspends - once from the Activation
   * that ran the body, once from the Activation that resumes - so it takes the body's result and
   * chosen label as arguments rather than reading them from a body it might not have run.
   */
  private async finishStage(
    spec: WorkflowSpec,
    stage: StageDefinition,
    state: WorkflowControlState,
    result: StageResult,
    label: string | null,
    emissions: readonly EmissionProposal[],
    startIndex: number,
    resumptions: ControllerResumptionScope,
  ): Promise<StepOutcome> {
    const adapted = await runAdapterChain({
      stageId: stage.id,
      visit: state.visit,
      position: "output",
      declarations: stage.outputAdapters ?? [],
      value: result,
      resources: this.viewFor(stage),
      adapters: this.adapters,
      models: this.models,
      trace: this.trace,
      resumptions,
      startIndex,
    });

    if (adapted.status === "suspended") {
      // Everything the resuming Activation must not redo, written down: the body's result is
      // already folded into the chain's current value, its transition choice is recorded, and the
      // Adapters before this index have run. Emissions produced by the body travel with this
      // outcome and are persisted now, so re-entry has nothing to duplicate.
      const boundary: WorkflowBoundaryState = {
        position: "output",
        adapterIndex: adapted.index,
        value: adapted.value,
        transitionLabel: label,
      };
      return { kind: "suspend", state: { ...state, boundary }, resumptionId: adapted.resumptionId, emissions };
    }
    if (adapted.status === "failed") {
      return { kind: "fail", state, emissions, failure: { code: adapted.code, message: adapted.message } };
    }
    if (adapted.status === "rejected") {
      return this.applyRejection(spec, stage, state, adapted.reason, "output", emissions, resumptions);
    }

    const resolution = resolveTransition(stage.id as string, stage.transitions, label);
    if (!resolution.ok) {
      return {
        kind: "fail",
        state: { ...state, provisionalResult: adapted.value },
        emissions,
        failure: { code: resolution.code, message: resolution.message },
      };
    }

    return this.applyTransition(spec, stage, state, resolution.target, adapted.value, label, emissions, resumptions);
  }

  /**
   * Everything after a settled child barrier: derive the Stage's own `text | none` result from the
   * child's terminal outcome, then run the ordinary output Adapters and transition.
   *
   * `child.failed` and `child.cancelled` fail the Stage explicitly, and cancellation keeps a
   * cancellation-specific reason - it is never relabelled as ordinary failure. A refused
   * `SpawnExecution` also fails the Stage, because the Stage's one required call received a terminal
   * answer even though no child exists, and each refusal keeps its own code: `effect.denied` ->
   * `<kind>_stage_spawn_denied`, `effect.rejected` -> `<kind>_stage_spawn_rejected`, and a declined
   * exact-payload confirmation (`confirmation.declined`, Slice E.2.1) -> `<kind>_stage_spawn_declined`.
   * A structured/non-string child terminal value fails the Stage rather than being smuggled through
   * the `text | none` edge.
   */
  private async finishChildStage(
    spec: WorkflowSpec,
    stage: StageDefinition,
    state: WorkflowControlState,
    entry: ChildBarrierEntry,
    resumptions: ControllerResumptionScope,
  ): Promise<StepOutcome> {
    const cleared: WorkflowControlState = { ...state, barrier: [] };
    const failure = (code: string, message: string): StepOutcome => ({ kind: "fail", state: cleared, emissions: [], failure: { code, message } });

    switch (entry.outcome) {
      case "completed":
        return this.finishStage(spec, stage, cleared, entry.childResult, null, [], 0, resumptions);
      case "failed":
        return failure(
          `${stage.kind}_stage_child_failed`,
          `stage "${stage.id}" child ${entry.childDefinitionId}@${entry.childDefinitionVersion} failed: ` +
            `${entry.error?.code ?? "child_failed"}: ${entry.error?.message ?? ""}`,
        );
      case "cancelled":
        return failure(
          `${stage.kind}_stage_child_cancelled`,
          `stage "${stage.id}" child ${entry.childDefinitionId}@${entry.childDefinitionVersion} was cancelled: ` +
            `${entry.error?.message ?? "the child Execution was cancelled"}`,
        );
      case "spawn_denied":
        return failure(
          `${stage.kind}_stage_spawn_denied`,
          `stage "${stage.id}" could not start its child ${entry.childDefinitionId}@${entry.childDefinitionVersion}: ` +
            `${entry.error?.code ?? "spawn_denied"}: ${entry.error?.message ?? ""}`,
        );
      case "spawn_declined":
        // A human declined the exact-payload confirmation for the child call. No child exists; this
        // is not a policy denial and not a runtime rejection, and it gets its own failure code.
        return failure(
          `${stage.kind}_stage_spawn_declined`,
          `stage "${stage.id}" child ${entry.childDefinitionId}@${entry.childDefinitionVersion} was not started: ` +
            `a human declined its mechanical confirmation` +
            (entry.error?.message ? ` (${entry.error.message})` : ""),
        );
      case "spawn_rejected":
      default:
        return failure(
          `${stage.kind}_stage_spawn_rejected`,
          `stage "${stage.id}" could not start its child ${entry.childDefinitionId}@${entry.childDefinitionVersion}: ` +
            `${entry.error?.code ?? "spawn_rejected"}: ${entry.error?.message ?? ""}`,
        );
    }
  }

  /**
   * The child call an Agent/Workflow Stage's first visit produces.
   *
   * Carries only what the call needs. The child Definition kind is checked at the Harness's
   * `SpawnExecution` boundary against `childKind`, not here - the controller has no DefinitionStore
   * and must not become an existence oracle.
   */
  private childCall(stage: AgentStageDefinition | WorkflowStageDefinition, input: StageResult): {
    readonly kind: "child";
    readonly child: {
      readonly definitionId: string;
      readonly definitionVersion: number;
      readonly childKind: "agent" | "workflow";
      readonly requestedOperations: readonly { readonly capability: string; readonly operation: string }[];
      readonly input: StageResult;
    };
  } {
    return {
      kind: "child",
      child: {
        definitionId: stage.child.definitionId,
        definitionVersion: stage.child.definitionVersion,
        childKind: stage.kind,
        requestedOperations: (stage.requestedOperations ?? []).map((ref) => ({
          capability: ref.capability,
          operation: ref.operation,
        })),
        input,
      },
    };
  }

  /** Runs the Stage body for its kind, or returns the child call an Agent/Workflow Stage requires. */
  private async runBody(
    stage: StageDefinition,
    state: WorkflowControlState,
    view: LocalResourceView,
    input: ActivationInput,
    resumptions: ControllerResumptionScope,
  ): Promise<
    | { readonly kind: "ok"; readonly outcome: LLMStageOutcome }
    | { readonly kind: "fail"; readonly failure: Failure }
    | ReturnType<WorkflowController["childCall"]>
  > {
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
          return { kind: "ok", outcome: await runLLMStage(stage, context, this.models, this.trace, resumptions) };
        case "agent":
        case "workflow":
          // One Workflow Stage boundary implemented by a child `call`. The controller *proposes* the
          // spawn - it never creates a child, fabricates a result, flattens the child's topology into
          // this graph, or runs the child definition as a local function.
          return this.childCall(stage, state.stageInput);
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
    resumptions: ControllerResumptionScope,
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
    const entered = await this.enterStage(spec, target.stage, result, state.visit + 1, transitions, resumptions);
    // The predecessor's emissions travel with whatever entering produced, including a suspension:
    // they are persisted by this Activation, and the one that resumes proposes none of its own.
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
    resumptions: ControllerResumptionScope,
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

    return this.runInputAdapters(spec, stage, state, 0, incoming, resumptions);
  }

  /**
   * Runs a target Stage's input Adapters from a position, and installs the adapted input.
   *
   * The sharp case in this slice. An input Adapter suspends *during* a transition, when the target
   * Stage is only half entered - so the state committed before yielding is already the target
   * Stage's own state, with its new visit, its transition count, and the partially adapted value.
   * The Activation that resumes re-enters here and neither re-runs the predecessor Stage, nor
   * re-resolves the transition, nor re-runs an input Adapter that already produced a value.
   */
  private async runInputAdapters(
    spec: WorkflowSpec,
    stage: StageDefinition,
    state: WorkflowControlState,
    startIndex: number,
    value: StageResult,
    resumptions: ControllerResumptionScope,
  ): Promise<StepOutcome> {
    const adapted = await runAdapterChain({
      stageId: stage.id,
      visit: state.visit,
      position: "input",
      declarations: stage.inputAdapters ?? [],
      value,
      resources: this.viewFor(stage),
      adapters: this.adapters,
      models: this.models,
      trace: this.trace,
      resumptions,
      startIndex,
    });

    if (adapted.status === "suspended") {
      const boundary: WorkflowBoundaryState = {
        position: "input",
        adapterIndex: adapted.index,
        value: adapted.value,
        transitionLabel: null,
      };
      return { kind: "suspend", state: { ...state, boundary }, resumptionId: adapted.resumptionId, emissions: [] };
    }
    if (adapted.status === "failed") {
      return { kind: "fail", state, emissions: [], failure: { code: adapted.code, message: adapted.message } };
    }
    if (adapted.status === "rejected") {
      return this.applyRejection(spec, stage, state, adapted.reason, "input", [], resumptions);
    }

    return { kind: "continue", state: { ...state, stageInput: adapted.value, boundary: null }, emissions: [] };
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
    resumptions: ControllerResumptionScope,
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
    return this.applyTransition(spec, stage, state, stage.onAdapterReject, reason, null, emissions, resumptions);
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
      case "suspend":
        // A dependency report, not a lifecycle instruction. The Harness checks that this Activation
        // registered the work, commits the progress and the resumption record together, and derives
        // WAITING itself - the same division of labour as `await_event`.
        return { control, ...emissions, next: { status: "await_resumption", resumptionId: step.resumptionId } };
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
