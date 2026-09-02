/**
 * The AgentController: model-directed progression, one bounded step per Activation.
 *
 * This is a *new* controller. It does not adapt, wrap, or translate the legacy Session/turn Agent
 * loop, and it imports nothing from it: that loop's unit of progress was a request-scoped turn and
 * its unit of action was a direct gateway call, and mechanically translating either would have
 * carried the wrong ownership into the new path.
 *
 * ## What this owns, and what it must never touch
 *
 * ```text
 * AgentController                    Harness
 *   which step this Agent is on        Execution lifecycle and WAITING derivation
 *   what the model was shown           mailbox consumption
 *   how a returned name resolves       Effect authorization and dispatch
 *   which Effect to propose            persistence transaction and scheduling
 *   completion/failure proposal        terminal-result validation
 * ```
 *
 * It holds an exposure resolver, model resolution, an executor, and an optional trace sink. Every
 * one of those is *local semantic computation*. It holds no runtime state, no queue, no policy
 * evaluator, no capability dispatcher, no settlement path, and no lifecycle setter - and the
 * architecture suite walks the import graph and greps these modules to keep it that way.
 *
 * ## The four layers, in the order this file walks them
 *
 * ```text
 * catalog descriptors + effective authority + authored exposure request
 *        ↓ deterministic
 * Active Operation View + authored view-neutral memory-write exposure
 *        ↓ immutable, one per invocation
 * ModelOperationProjection            → ModelCapabilitySpec[] → the model
 *        ↓ the model answers with a name
 * resolved through THAT projection    → typed UseCapability proposal
 *        ↓
 * Harness authorizes the concrete request, from current authority
 * ```
 *
 * None of the middle layers is a permission. An operation can be authorized, exposed, projected,
 * selected, proposed - and still denied at dispatch, because authority may have changed or because
 * the concrete payload is not allowed. That denial arrives as an ordinary Effect-result Event, and
 * this controller reports it to the model like any other observation.
 *
 * ## The two kinds of waiting
 *
 * A slow *model* step crosses no runtime boundary: it produces no Event, is authorized by nobody,
 * and is local computation that happens to take a long time. It takes the controller-local
 * resumption path - persist the invocation, report `await_resumption`, and let a later Activation
 * be handed the stored outcome. A requested *operation* is the opposite: it is a proposal that
 * crosses the Harness, and its result comes back as a correlated Event.
 *
 * The persisted invocation is what makes resuming correct rather than merely possible. It records
 * the exact information and the exact projection that call was shown, so the Activation that
 * interprets the answer interprets it against what the model actually saw - never against whatever
 * the current Active View would produce now. Events that arrive while the step is outstanding are
 * queued, folded into the message history, and seen by the *next* step; they cannot reach backwards
 * into an invocation that has already been issued.
 *
 * ## Response is not completion
 *
 * A model producing text is communication. This Agent stays alive and waits for what comes next,
 * unless its definition explicitly declares that a response is its terminal answer.
 */

import type { DefinitionKind } from "../../definitions/types.ts";
import type { EffectProposal } from "../../effects/types.ts";
import { useCapability, writeMemory } from "../../effects/types.ts";
import type { EmissionProposal } from "../../execution/emission.ts";
import type { ControllerResumptionId } from "../../execution/ids.ts";
import type { DeliveredEvent, WakeCondition } from "../../interaction/event-envelope.ts";
import { EFFECT_RESULT_EVENT_KINDS, isEffectResultEventKind } from "../../interaction/events.ts";
import type { ModelMessage } from "../../model/types.ts";
import { agentCallCorrelationId, agentModelResumptionKey } from "../../agent/resumption-keys.ts";
import type {
  AgentControlState,
  AgentInvocationState,
  AgentPendingCall,
} from "../../agent/control-state.ts";
import {
  AGENT_CONTROL_STATE_VERSION,
  initialAgentControlState,
  readAgentControlState,
  settleAgentCall,
  toAgentControllerProgress,
  unsettledAgentCalls,
} from "../../agent/control-state.ts";
import type { AgentModelObservation, AgentObservationProjector } from "../../agent/observation-projection.ts";
import { projectAgentObservations, referenceAgentObservationProjector } from "../../agent/observation-projection.ts";
import type { AgentObservationOutcome, AgentOperationObservation } from "../../agent/observations.ts";
import type { AgentSpec } from "../../agent/spec.ts";
import { agentCompletionMode, agentLimits } from "../../agent/spec.ts";
import { agentInformationSelectionId } from "../../agent/information-context.ts";
import { validateAgentSpec } from "../../agent/validation.ts";
import type { ModelActionTarget } from "../../operations/action-target.ts";
import { createModelOperationProjection, modelCapabilitySpecs, resolveProjectedAlias } from "../../operations/projection.ts";
import { EMPTY_EXPOSURE_REQUEST } from "../../operations/exposure.ts";
import type { ActiveOperationViewResolver } from "../../ports/active-operation-view.ts";
import { noActiveOperationView } from "../../ports/active-operation-view.ts";
import type { AgentExecutor, AgentExecutorOutcome } from "../../ports/agent-executor.ts";
import { agentExecutorOutcomeIssues } from "../../ports/agent-executor.ts";
import type { ActivationInput, ActivationOutcome, ExecutionController } from "../../ports/controller.ts";
import type { ControllerResumptionScope } from "../../ports/controller-resumption.ts";
import type { JsonObject, JsonValue } from "../../util/json.ts";
import type { AgentInformationCompiler } from "./information.ts";
import { referenceAgentInformationCompiler } from "./information.ts";
import type {
  AgentControllerDecision,
  AgentModelAccess,
  AgentOperationProposalRecord,
  AgentStepInvocation,
  AgentTrace,
} from "./model-access.ts";
import { runAgentStep } from "./model-access.ts";

export interface AgentControllerOptions {
  /** Deterministic exposure. Absent means nothing is exposed, which is the fail-closed answer. */
  readonly views?: ActiveOperationViewResolver;
  /** Logical model resolution. Absent means no model step can run. */
  readonly models?: AgentModelAccess;
  /** Where one bounded semantic step happens. Absent means no model step can run. */
  readonly executor?: AgentExecutor;
  /**
   * How a settled operation result is shown to the model.
   *
   * A replaceable strategy. Swapping it changes what the model reads and nothing else - not the
   * Event, not the Effect, not the authorization, not the capability implementation. Absent means
   * the reference projector, which reports faithfully and shapes nothing.
   */
  readonly observations?: AgentObservationProjector;
  /**
   * How information is selected for one model call.
   *
   * The other replaceable strategy, and the independent one: an information compiler chooses what
   * the model reads and has no way to change what it may do. Absent means the reference compiler -
   * instructions plus a bounded window of recent messages.
   */
  readonly information?: AgentInformationCompiler;
  /**
   * Application task scope: authored group labels to narrow to now.
   *
   * A further intersection applied by the resolver, so it can only make the exposed set smaller.
   */
  readonly taskScope?: readonly string[];
  /** Optional local observation sink. Never persisted, never part of semantics. */
  readonly trace?: AgentTrace;
}

interface Failure {
  readonly code: string;
  readonly message: string;
  readonly details?: JsonValue;
}

type StepOutcome =
  | { readonly kind: "awaitEffects"; readonly state: AgentControlState; readonly proposals: readonly EffectProposal[]; readonly emissions: readonly EmissionProposal[] }
  /** A model step outlived this Activation. The state carries what re-entry must not recompute. */
  | { readonly kind: "suspend"; readonly state: AgentControlState; readonly resumptionId: ControllerResumptionId }
  | { readonly kind: "awaitInput"; readonly state: AgentControlState; readonly emissions: readonly EmissionProposal[] }
  | { readonly kind: "continue"; readonly state: AgentControlState; readonly emissions: readonly EmissionProposal[] }
  | { readonly kind: "complete"; readonly state: AgentControlState; readonly terminal: JsonValue | undefined; readonly hasTerminal: boolean; readonly emissions: readonly EmissionProposal[] }
  | { readonly kind: "fail"; readonly state: AgentControlState; readonly failure: Failure; readonly emissions: readonly EmissionProposal[] };

/**
 * How a step outcome reads as a controller decision, for the trace. Observation only.
 *
 * `suspend` is present because the map is total over the outcome union, not because it is reachable:
 * a suspended step returns before its answer exists, and there is nothing to record yet.
 */
const DECISION_OF: Record<StepOutcome["kind"], AgentControllerDecision> = {
  awaitEffects: "call_operations",
  suspend: "continue",
  awaitInput: "respond",
  continue: "continue",
  complete: "complete",
  fail: "fail",
};

/** The projection identity for one step. Derived from persisted coordinates, never minted. */
function agentProjectionId(step: number): string {
  return `ag/step${step}/projection`;
}

/** Text delivered from outside the kernel, which is how an Agent progression is started or continued. */
function externalText(event: DeliveredEvent): string | null {
  if (event.kind !== "external.input") return null;
  return typeof event.body.payload === "string" ? event.body.payload : null;
}

/** Maps a delivered Effect-result Event to the Agent observation vocabulary. Settled is not successful. */
function outcomeOf(event: DeliveredEvent): {
  readonly outcome: AgentObservationOutcome;
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
    case "capability.failed":
      return { outcome: "failed", error: { code: event.body.error.code, message: event.body.error.message } };
    case "capability.unknown":
      return { outcome: "unknown", error: { code: event.body.error.code, message: event.body.error.message } };
    case "effect.denied":
      return { outcome: "denied", error: { code: event.body.code, message: event.body.message } };
    case "effect.rejected":
      return { outcome: "rejected", error: { code: event.body.code, message: event.body.message } };
    case "confirmation.declined":
      // A human declined the exact-payload confirmation. Nothing dispatched, policy did not deny:
      // the call settles as `declined` and the Agent goes on to its next model decision.
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

class AgentController implements ExecutionController {
  readonly kind: DefinitionKind = "agent";

  private readonly views: ActiveOperationViewResolver;
  private readonly models: AgentModelAccess | undefined;
  private readonly executor: AgentExecutor | undefined;
  private readonly taskScope: readonly string[] | undefined;
  private readonly trace: AgentTrace | undefined;
  private readonly observations: AgentObservationProjector;
  private readonly information: AgentInformationCompiler;

  constructor(options: AgentControllerOptions) {
    this.views = options.views ?? noActiveOperationView;
    this.models = options.models;
    this.executor = options.executor;
    this.taskScope = options.taskScope;
    this.trace = options.trace;
    this.observations = options.observations ?? referenceAgentObservationProjector;
    this.information = options.information ?? referenceAgentInformationCompiler;
  }

  async activate(input: ActivationInput, resumptions: ControllerResumptionScope): Promise<ActivationOutcome> {
    const validation = validateAgentSpec(input.definition.spec);
    if (!validation.ok) {
      // Validated at authoring, at deserialization, and at store time. Reaching here means the
      // pinned bytes are not an Agent spec at all, which is a failure, never a guess.
      return this.failed(input.execution.control.progress, {
        code: "agent_spec_invalid",
        message: validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "),
      });
    }
    const spec = validation.spec;

    const stored = readAgentControlState(input.execution.control.progress);
    if (stored.status === "unsupported") {
      // A shape this build cannot interpret. Refused rather than coerced: reading old progress as
      // new progress would resolve a stored alias against a target that is not in it.
      return this.failed(input.execution.control.progress, {
        code: "agent_control_state_version_unsupported",
        message:
          `this Agent's persisted progress is version ${stored.version}, and this build writes ` +
          `version ${AGENT_CONTROL_STATE_VERSION}; interpreting it either way would be a guess`,
      });
    }
    let state = stored.status === "read" ? stored.state : initialAgentControlState();
    state = this.collect(state, input.events);

    if (!state.started) {
      const started = input.events.map(externalText).find((text): text is string => text !== null);
      if (started === undefined) {
        return {
          control: { kind: "agent", progress: toAgentControllerProgress(state) },
          next: {
            status: "await_event",
            wake: { eventKinds: ["external.input"], correlationId: null, description: "this Agent has nothing to work from yet" },
          },
        };
      }
      state = { ...state, started: true, messages: [...state.messages, { role: "user", content: started }] };
    }

    const outstanding = unsettledAgentCalls(state);
    if (outstanding.length > 0) {
      return {
        control: { kind: "agent", progress: toAgentControllerProgress(state) },
        next: { status: "await_event", wake: this.wakeFor(state, outstanding) },
      };
    }

    // Every requested operation has an answer. Project the semantic observations once, with this
    // controller's strategy, and use that one projection for both consumers: the transcript the
    // information branch compiles from, and the observations the executor is handed. Two renderings
    // of one result would be two answers to "what was the model told".
    let observations: readonly AgentModelObservation[] = [];
    if (state.pending.length > 0) {
      const semantic = state.pending.map((call) => this.observationOf(call));
      observations = projectAgentObservations(this.observations, semantic, { step: state.step + 1 });
      const messages: ModelMessage[] = [...state.messages];
      for (const projected of observations) {
        messages.push({
          role: "capability",
          content: projected.content,
          capability: projected.alias,
          ...(projected.callId ? { capabilityCallId: projected.callId } : {}),
        });
      }
      state = { ...state, messages, pending: [] };
    }

    const step = await this.step(spec, state, input, observations, resumptions);
    return this.finish(step);
  }

  // -- event collection ------------------------------------------------------

  /**
   * Folds delivered Events into Agent progress.
   *
   * Three properties fall out of doing it this way. A result whose correlation belongs to an earlier
   * step matches no entry and changes nothing, so an old answer cannot satisfy a new question. A
   * duplicate result finds its entry already settled and is ignored. And input that arrives while a
   * model step is outstanding is appended to the message history for the *next* step - it cannot
   * change what the in-flight invocation was shown, because that is already frozen in the persisted
   * invocation.
   */
  private collect(state: AgentControlState, events: readonly DeliveredEvent[]): AgentControlState {
    let next = state;
    for (const event of events) {
      if (isEffectResultEventKind(event.kind) && event.correlationId !== null) {
        const mapped = outcomeOf(event);
        if (!mapped) continue;
        next = settleAgentCall(next, event.correlationId, mapped.outcome, {
          ...(mapped.observation !== undefined ? { observation: mapped.observation } : {}),
          ...(mapped.error !== undefined ? { error: mapped.error } : {}),
        }).state;
        continue;
      }
      const text = externalText(event);
      // The first input starts the Agent and is folded in below, once, rather than twice here.
      if (text !== null && next.started) {
        next = { ...next, messages: [...next.messages, { role: "user", content: text }] };
      }
    }
    return next;
  }

  private observationOf(call: AgentPendingCall): AgentOperationObservation {
    return {
      callId: call.callId,
      alias: call.alias,
      target: call.target,
      outcome: call.outcome ?? "failed",
      ...(call.observation !== null ? { observation: call.observation } : {}),
      ...(call.error !== null ? { error: call.error } : {}),
    };
  }

  /**
   * What this Agent still needs.
   *
   * With one outstanding operation the condition names its correlation exactly. With several it
   * waits broadly on Effect-result kinds and re-checks after each wake, so several operations
   * requested in one step join without any per-operation machinery.
   */
  private wakeFor(state: AgentControlState, outstanding: readonly AgentPendingCall[]): WakeCondition {
    const single = outstanding.length === 1 ? outstanding[0]! : null;
    return {
      eventKinds: [...EFFECT_RESULT_EVENT_KINDS],
      correlationId: single ? single.correlationId : null,
      description: `agent step ${state.step + 1}: ${outstanding.length} requested operation(s) outstanding`,
    };
  }

  // -- one model step --------------------------------------------------------

  private async step(
    spec: AgentSpec,
    state: AgentControlState,
    input: ActivationInput,
    observations: readonly AgentModelObservation[],
    resumptions: ControllerResumptionScope,
  ): Promise<StepOutcome> {
    const limits = agentLimits(spec);

    // Re-entry first. A persisted invocation for the step about to run means a previous Activation
    // already resolved the view, built the projection, and compiled the information for it. Doing
    // any of that again would interpret this model's answer against a world it never saw.
    let invocation: AgentInvocationState | null =
      state.invocation !== null && state.invocation.step === state.step + 1 ? state.invocation : null;
    // Whether a previous Activation issued this call. Reported to the trace so a run can prove the
    // two paths are equivalent rather than assume it; nothing semantic reads it.
    const reentered = invocation !== null;

    if (!invocation) {
      if (state.step >= limits.maxModelCalls) {
        return {
          kind: "fail",
          state,
          emissions: [],
          failure: {
            code: "agent_model_call_budget_exhausted",
            message: `this Agent used its ${limits.maxModelCalls} permitted model call(s) without reaching a conclusion`,
          },
        };
      }

      const step = state.step + 1;
      const view = await this.views.resolve({
        executionId: input.execution.executionId,
        exposure: spec.operations ?? EMPTY_EXPOSURE_REQUEST,
        ...(this.taskScope ? { taskScope: this.taskScope } : {}),
      });
      const projected = createModelOperationProjection({
        projectionId: agentProjectionId(step),
        view,
        ...(spec.memoryWrite !== undefined ? { memoryWrite: spec.memoryWrite } : {}),
      });
      if (!projected.ok) {
        return {
          kind: "fail",
          state,
          emissions: [],
          failure: {
            code: "agent_projection_ambiguous",
            message: projected.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "),
          },
        };
      }
      invocation = {
        step,
        information: this.information.compile({
          instructions: spec.instructions,
          messages: state.messages,
          maxMessages: limits.maxContextMessages,
        }),
        projection: projected.projection,
        continuation: state.continuation,
        observations: [...observations],
        messageCount: state.messages.length,
      };
    }

    let attempt;
    try {
      attempt = await runAgentStep({
        resumptions,
        // Derived from the persisted step counter only, so the Activation that resumes rebuilds
        // this exact key and recovers the stored outcome rather than calling the model again.
        key: agentModelResumptionKey(invocation.step),
        access: this.models,
        executor: this.executor,
        model: spec.model,
        request: {
          requirements: spec.model.requirements,
          information: invocation.information,
          projection: invocation.projection,
          capabilities: modelCapabilitySpecs(invocation.projection),
          observations: invocation.observations,
          step: invocation.step,
          limits: { maxOperationCallsPerStep: limits.maxOperationCallsPerStep },
          continuation: invocation.continuation,
        },
      });
    } catch (error) {
      return {
        kind: "fail",
        state: { ...state, invocation: null },
        emissions: [],
        failure: { code: "agent_model_step_failed", message: error instanceof Error ? error.message : String(error) },
      };
    }

    if (attempt.status === "suspended") {
      // Persist what this invocation was shown. Nothing about the answer is known yet, so nothing
      // about it is written - and nothing that arrives meanwhile can change what is written here.
      return { kind: "suspend", state: { ...state, invocation }, resumptionId: attempt.resumptionId };
    }

    return this.interpret(spec, state, invocation, attempt.invocation, input, reentered);
  }

  /**
   * Turns one semantic outcome into Agent progress and, where the model selected work, proposals.
   *
   * The trace is emitted *after* the decision is known, so one record carries the whole invocation
   * boundary: what the model saw, what it produced, what the controller then decided, and what it
   * proposed. Emitting it earlier would have meant recording a question with no answer.
   */
  private interpret(
    spec: AgentSpec,
    state: AgentControlState,
    invocation: AgentInvocationState,
    step: AgentStepInvocation,
    input: ActivationInput,
    reentered: boolean,
  ): StepOutcome {
    const result = this.interpretOutcome(spec, state, invocation, step.outcome, input);
    this.record(invocation, step, input, reentered, result);
    return result;
  }

  /** The trace record for one invocation. Observation only: no Event, no journal, no state. */
  private record(
    invocation: AgentInvocationState,
    step: AgentStepInvocation,
    input: ActivationInput,
    reentered: boolean,
    result: StepOutcome,
  ): void {
    if (!this.trace?.modelInvoked) return;
    const proposals = result.kind === "awaitEffects" ? this.proposalRecords(invocation.step, result.state.pending) : [];
    this.trace.modelInvoked({
      executionId: input.execution.executionId,
      activationId: input.activation.activationId,
      step: invocation.step,
      reentered,
      logicalRef: step.resolved.logicalRef,
      provider: step.resolved.provider,
      model: step.resolved.model,
      ...(step.resolved.deploymentMetadata !== undefined ? { deployment: step.resolved.deploymentMetadata } : {}),
      informationSelectionId: agentInformationSelectionId(invocation.information),
      projectionId: invocation.projection.projectionId,
      viewId: invocation.projection.viewId,
      exposedOperations: invocation.projection.bindings.length,
      bindings: invocation.projection.bindings.map((binding) => ({
        bindingId: binding.bindingId,
        alias: binding.alias,
        target: binding.target,
      })),
      outcome: step.outcome.kind,
      decision: DECISION_OF[result.kind],
      proposals,
      ...(step.metadata !== undefined ? { metadata: step.metadata } : {}),
    });
  }

  private proposalRecords(step: number, pending: readonly AgentPendingCall[]): readonly AgentOperationProposalRecord[] {
    return pending.map((call) => ({
      step,
      correlationId: call.correlationId,
      bindingId: call.bindingId,
      alias: call.alias,
      target: call.target,
    }));
  }

  private interpretOutcome(
    spec: AgentSpec,
    state: AgentControlState,
    invocation: AgentInvocationState,
    outcome: AgentExecutorOutcome,
    input: ActivationInput,
  ): StepOutcome {
    const issues = agentExecutorOutcomeIssues(outcome);
    if (issues.length > 0) {
      return {
        kind: "fail",
        state: { ...state, step: invocation.step, invocation: null },
        emissions: [],
        failure: {
          code: "invalid_agent_executor_outcome",
          message: issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "),
        },
      };
    }

    const continuation = (outcome as { readonly continuation?: JsonValue }).continuation ?? null;
    const advanced: AgentControlState = { ...state, step: invocation.step, invocation: null, continuation };

    /**
     * Puts this invocation's output where it belongs in the transcript.
     *
     * Input that arrived while the call was outstanding has already been appended - it was consumed
     * from the mailbox and must not be dropped - so the answer is spliced in at the position the
     * history had when the call was issued rather than pushed onto the end.
     */
    const insertAt = Math.min(invocation.messageCount, advanced.messages.length);
    const withOutcome = (added: readonly ModelMessage[]): ModelMessage[] => [
      ...advanced.messages.slice(0, insertAt),
      ...added,
      ...advanced.messages.slice(insertAt),
    ];

    switch (outcome.kind) {
      case "fail":
        return {
          kind: "fail",
          state: advanced,
          emissions: [],
          failure: { code: outcome.code, message: outcome.message },
        };

      case "continue":
        return { kind: "continue", state: advanced, emissions: [] };

      case "respond": {
        const messages = withOutcome([{ role: "assistant", content: outcome.text }]);
        const responded: AgentControlState = { ...advanced, messages, responses: advanced.responses + 1 };
        const emissions: readonly EmissionProposal[] = [{ body: { kind: "text", text: outcome.text } }];
        // Communication, not conclusion. Completing here happens only when the definition says a
        // response *is* this Agent's answer.
        if (agentCompletionMode(spec) === "complete_on_response") {
          return this.completion(responded, outcome.text, emissions, input);
        }
        return { kind: "awaitInput", state: responded, emissions };
      }

      case "stop": {
        const text = outcome.text ?? "";
        const messages = withOutcome(text.length > 0 ? [{ role: "assistant", content: text }] : []);
        const emissions: readonly EmissionProposal[] = text.length > 0 ? [{ body: { kind: "text", text } }] : [];
        return this.completion({ ...advanced, messages }, text, emissions, input);
      }

      case "call_operations": {
        const messages = withOutcome(
          outcome.text !== undefined && outcome.text.length > 0
            ? [{ role: "assistant", content: outcome.text } as ModelMessage]
            : [],
        );

        const pending: AgentPendingCall[] = [];
        const proposals: EffectProposal[] = [];
        for (const [index, call] of outcome.calls.entries()) {
          // Resolved against the snapshot this model call was shown, and against nothing else. A
          // name that is not in it resolves to nothing - never to whatever the current view or the
          // catalog happens to call by the same string.
          const resolution = resolveProjectedAlias(invocation.projection, call.alias);
          if (!resolution.resolved) {
            return {
              kind: "fail",
              state: { ...advanced, messages },
              emissions: [],
              failure: {
                code: "agent_operation_not_projected",
                message:
                  `the model returned "${call.alias}", which projection ${invocation.projection.projectionId} ` +
                  `did not expose; a returned name is vocabulary, never an identity to look up`,
              },
            };
          }
          const binding = resolution.binding;
          // The binding's target decides which existing Effect this becomes. The default remains a
          // refusal so an unknown persisted arm is never guessed into one of the supported Effects.
          const target: ModelActionTarget = binding.target;
          if (target.kind !== "capability_operation" && target.kind !== "write_memory") {
            return {
              kind: "fail",
              state: { ...advanced, messages },
              emissions: [],
              failure: {
                code: "agent_action_target_not_supported",
                message:
                  `binding ${binding.bindingId} names target kind ` +
                  `"${(target as { readonly kind: string }).kind}", which this build does not resolve to an Effect`,
              },
            };
          }
          const correlationId = agentCallCorrelationId(invocation.step, index + 1);
          pending.push({
            correlationId,
            bindingId: binding.bindingId,
            alias: binding.alias,
            target,
            callId: call.callId,
            settled: false,
            outcome: null,
            observation: null,
            error: null,
          });
          if (target.kind === "capability_operation") {
            proposals.push(
              useCapability({
                capability: target.capability,
                operation: target.operation,
                input: call.input,
                requestKey: correlationId,
              }),
            );
          } else {
            const key = call.input["key"];
            if (typeof key !== "string" || key.length === 0 || !("value" in call.input)) {
              return {
                kind: "fail",
                state: { ...advanced, messages },
                emissions: [],
                failure: {
                  code: "agent_memory_write_call_invalid",
                  message: "the projected write_memory call requires a non-empty key and a JSON value",
                },
              };
            }
            proposals.push(writeMemory({ key, value: call.input["value"] as JsonValue, requestKey: correlationId }));
          }
          this.trace?.operationProposed?.({
            step: invocation.step,
            correlationId,
            bindingId: binding.bindingId,
            alias: binding.alias,
            target,
          });
        }

        return {
          kind: "awaitEffects",
          state: { ...advanced, messages, pending },
          proposals,
          emissions:
            outcome.text !== undefined && outcome.text.length > 0
              ? [{ body: { kind: "text", text: outcome.text } }]
              : [],
        };
      }
    }
  }

  /**
   * Proposes terminal completion.
   *
   * A terminal value appears only when the pinned definition declares a terminal-result schema; the
   * Harness validates it against that schema, and an Agent whose definition declares none completes
   * without one rather than inventing a shape for its last message.
   */
  private completion(
    state: AgentControlState,
    text: string,
    emissions: readonly EmissionProposal[],
    input: ActivationInput,
  ): StepOutcome {
    const declared = input.definition.terminalResult !== undefined;
    return { kind: "complete", state, terminal: declared ? text : undefined, hasTerminal: declared, emissions };
  }

  // -- outcome assembly ------------------------------------------------------

  private finish(step: StepOutcome): ActivationOutcome {
    const control = { kind: "agent" as const, progress: toAgentControllerProgress(step.state) };
    const emissions = step.kind !== "suspend" && step.emissions.length > 0 ? { emissions: step.emissions } : {};

    switch (step.kind) {
      case "awaitEffects":
        return {
          control,
          ...emissions,
          effects: step.proposals,
          next: { status: "await_event", wake: this.wakeFor(step.state, step.state.pending) },
        };
      case "suspend":
        // A dependency report, not a lifecycle instruction. The Harness checks that this Activation
        // registered the work, commits the progress and the resumption record together, and derives
        // WAITING itself - the same division of labour as `await_event`.
        return { control, next: { status: "await_resumption", resumptionId: step.resumptionId } };
      case "awaitInput":
        return {
          control,
          ...emissions,
          next: {
            status: "await_event",
            wake: {
              eventKinds: ["external.input"],
              correlationId: null,
              description: `agent responded ${step.state.responses} time(s) and is waiting for what comes next`,
            },
          },
        };
      case "continue":
        return { control, ...emissions, next: { status: "continue" } };
      case "complete":
        return {
          control,
          ...emissions,
          next: step.hasTerminal
            ? { status: "complete", result: { value: step.terminal as JsonValue } }
            : { status: "complete" },
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
      control: { kind: "agent", progress },
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

export function createAgentController(options: AgentControllerOptions = {}): ExecutionController {
  return new AgentController(options);
}
