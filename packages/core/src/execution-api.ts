/**
 * The v0.4 Execution kernel: authoring definitions and running Executions.
 *
 * This is the curated semantic surface - what an application needs to define an Agent or Workflow,
 * create Executions, deliver Events, and observe results. It is published as
 * `@agent-sdk/core/execution` rather than at the package root only because the root still carries
 * the v0 Session/Flow API during migration, and the two occupy several of the same names. When the
 * legacy surface is removed, this becomes the root.
 *
 * Deliberately absent: lifecycle mutation (`transitionContext`, `assertTransition`), context
 * construction, controller-outcome validation, and every store facet. Applications create, observe,
 * and send Events to Executions; the Harness alone changes their operational state. Port interfaces
 * live under `/ports`, replaceable implementations under `/reference`, and scripted controllers and
 * contract suites under `/testing`.
 */

// -- definitions -------------------------------------------------------------
export type { DefinitionId, DefinitionVersion, ExecutionDefinitionRef } from "./definitions/ids.ts";
export { definitionId, formatDefinitionRef, isDefinitionId, isSameDefinitionRef } from "./definitions/ids.ts";
export type {
  AgentDefinition,
  AgentSpec,
  DefinitionBase,
  DefinitionKind,
  ExecutionDefinition,
  TerminalResultSchema,
  WorkflowDefinition,
  WorkflowSpec,
} from "./definitions/types.ts";

export { DEFINITION_KINDS, isAgentDefinition, isDefinitionKind, isWorkflowDefinition } from "./definitions/types.ts";
export type { DefinitionIssue, DefinitionValidation, DefineExecutionInput } from "./definitions/validation.ts";

export {
  assertValidDefinition,
  defineAgent,
  defineWorkflow,
  definitionIntegrity,
  definitionRef,
  deserializeDefinition,
  InvalidDefinitionError,
  nextDefinitionVersion,
  serializeDefinition,
  validateDefinition,
} from "./definitions/validation.ts";

// -- workflow topology -------------------------------------------------------
export type {
  AgentStageDefinition,
  ChildDefinitionRef,
  FunctionStageDefinition,
  ImplementationRef,
  LLMStageDefinition,
  ModelCallableDeclaration,
  StageDefinition,
  StageDefinitionBase,
  StageDefinitionInput,
  StageId,
  StageKind,
  StageTransitionCase,
  StageTransitions,
  StageTransitionsInput,
  TerminalProposal,
  TransitionTarget,
  TransitionTargetInput,
  WorkflowSpecInput,
  WorkflowStageDefinition,
} from "./workflow/spec.ts";
export { STAGE_KINDS, findStage, isImplementationRef, isStageId, isStageKind, stageId, transitionLabels } from "./workflow/spec.ts";
export type { AdapterDeclaration, AdapterKind, FunctionAdapterDeclaration, LLMAdapterDeclaration } from "./workflow/adapters.ts";
export { ADAPTER_KINDS, isAdapterKind } from "./workflow/adapters.ts";
export type { StageResult } from "./workflow/stage-result.ts";
export { describeStageResult, isStageResult } from "./workflow/stage-result.ts";
export type { StageCapabilityRequest, StageObservation, StageObservationOutcome } from "./workflow/observations.ts";
export { findObservation, isSuccessfulObservation } from "./workflow/observations.ts";
export type { WorkflowSpecIssue, WorkflowSpecIssueCode, WorkflowSpecValidation } from "./workflow/validation.ts";
export { MAX_MODEL_PHASES, validateWorkflowSpec } from "./workflow/validation.ts";
/**
 * Workflow control state is exported as *readable* shapes only.
 *
 * There is no barrier mutator here, and no way to write a Stage's progress from outside the
 * controller that owns it. An application inspects what a Workflow is doing; it does not reach in
 * and change where the Workflow thinks it is.
 */
export type { BarrierEntry, BarrierEntryKind, WorkflowBoundaryState, WorkflowControlState } from "./workflow/control-state.ts";
export { readWorkflowControlState, stageCorrelationId, WORKFLOW_CONTROL_STATE_VERSION } from "./workflow/control-state.ts";
export { stageAdapterResumptionKey, stageModelResumptionKey } from "./workflow/resumption-keys.ts";

// -- execution identity and lifecycle ----------------------------------------
export type { ActivationId, ControllerResumptionId, ExecutionId } from "./execution/ids.ts";
export {
  activationId,
  controllerResumptionId,
  executionId,
  isActivationId,
  isControllerResumptionId,
  isExecutionId,
} from "./execution/ids.ts";
export type { LifecycleState, LifecycleTransitionRecord } from "./execution/lifecycle.ts";
export {
  allowedTransitionsFrom,
  canTransition,
  isLifecycleState,
  isTerminalLifecycle,
  LIFECYCLE_STATES,
  LifecycleTransitionError,
  TERMINAL_LIFECYCLE_STATES,
} from "./execution/lifecycle.ts";
export type {
  ControllerProgress,
  DeferredSlots,
  ExecutionContext,
  ExecutionView,
  ExecutionWait,
  MailboxRef,
} from "./execution/context.ts";
/**
 * Controller-local resumptions are exported as *readable* shapes only.
 *
 * There is no settlement function here and there never will be: a caller who could settle one
 * could hand a controller a model result no model produced. Applications inspect what an Execution
 * is waiting on; only the runtime that started the work can report what it produced.
 */
export type {
  ControllerResumption,
  ControllerResumptionFailure,
  ControllerResumptionOutcome,
  ControllerResumptionState,
} from "./execution/resumption.ts";
export { isUnsettled, outcomeOfResumption } from "./execution/resumption.ts";
export type { EmissionBody, EmissionProposal, ExecutionEmission } from "./execution/emission.ts";
export type {
  ExecutionFailure,
  TerminalResultEnvelope,
  TerminalResultProposal,
  TerminalResultRejection,
} from "./execution/terminal-result.ts";

// -- events ------------------------------------------------------------------
export type {
  DeliveredEvent,
  EventDestination,
  EventEnvelope,
  EventId,
  WakeCondition,
} from "./interaction/event-envelope.ts";
export { eventSatisfiesWake } from "./interaction/event-envelope.ts";
export type {
  CapabilityCompletedBody,
  CapabilityFailedBody,
  CapabilityUnknownBody,
  EffectDeniedBody,
  EffectRejectedBody,
  EventBodies,
  EventKind,
  ExternalInputBody,
} from "./interaction/events.ts";
export {
  EFFECT_RESULT_EVENT_KINDS,
  EVENT_KINDS,
  isEffectResultEventKind,
  isEventKind,
} from "./interaction/events.ts";

// -- effects -----------------------------------------------------------------
export type {
  CapabilityId,
  EffectId,
  IdempotencyKey,
  OperationId,
  PendingOperationId,
  ResourceBindingId,
} from "./effects/ids.ts";
export { capabilityId, isCapabilityId, isOperationId, isResourceBindingId, operationId, resourceBindingId } from "./effects/ids.ts";
export type { EffectIdempotencyScope, IdempotencyKeyInput } from "./effects/fingerprint.ts";
export { isEffectIdempotencyScope } from "./effects/fingerprint.ts";
/**
 * Index-only: builds the key `findByIdempotencyKey` searches by, from a non-cryptographic
 * fingerprint. Two requests sharing this value are *candidates* for being the same logical
 * operation, never proof of it - see `effects/duplicate-detection.ts` for the exact comparison
 * that actually decides duplication.
 */
export { effectIdempotencyKey } from "./effects/fingerprint.ts";
export type {
  AuthorizationEvidence,
  EffectKind,
  EffectProposal,
  EffectRequest,
  RequestUserInputProposal,
  SendMessageProposal,
  SpawnExecutionProposal,
  UseCapabilityProposal,
  WriteMemoryProposal,
} from "./effects/types.ts";
export type { UseCapabilityInput } from "./effects/types.ts";
export { DISPATCHABLE_EFFECT_KINDS, EFFECT_KINDS, isEffectKind, isUseCapabilityProposal, useCapability } from "./effects/types.ts";
export type { ResourceAccessMode, ResourceBindingRef, SecurityProfile } from "./effects/capability.ts";
export type { CapabilityError, CapabilityOutcome } from "./effects/outcome.ts";
export type {
  AuthorizationConstraints,
  AuthorizationDecision,
  EffectAuthorizationRequest,
} from "./effects/authorization.ts";
export type {
  CreatePendingOperationInput,
  PendingDispatchState,
  PendingOperation,
  PendingOperationStatus,
  PendingOutcomeState,
} from "./effects/pending.ts";
export {
  createPendingOperation,
  isExpired,
  isUnresolved,
  isUnresolvedDispatch,
  markAbandoned,
  markDispatched,
  markSettled,
} from "./effects/pending.ts";
export type { EffectJournalEntry, EffectJournalPhase } from "./effects/journal.ts";
export { EFFECT_JOURNAL_PHASES, effectRequestsIn, isTerminalEffectPhase, latestPhase } from "./effects/journal.ts";

// -- runtime -----------------------------------------------------------------
export { ControllerRegistry, UnknownControllerKindError } from "./runtime/controller-registry.ts";
export type { ActivationRecord, ActivationResultKind } from "./runtime/activation.ts";
export { Harness, HarnessRunawayError, UnknownDefinitionError } from "./runtime/harness.ts";
export { createWorkflowController } from "./controllers/workflow/controller.ts";
export type { WorkflowControllerOptions } from "./controllers/workflow/controller.ts";
export type {
  ModelInvocationPurpose,
  WorkflowModelAccess,
  WorkflowModelInvocation,
  WorkflowStageTransitionRecord,
  WorkflowTrace,
} from "./controllers/workflow/model-access.ts";
export type {
  CreateExecutionInput,
  DeliverExternalInputInput,
  EventDeliveryReceipt,
  ExecutionHandle,
  HarnessOptions,
} from "./runtime/harness.ts";
export type { EffectDispatchRecord, SettleEffectInput, SettleEffectReceipt } from "./runtime/effect-processor.ts";

// -- shared value domain -----------------------------------------------------
export type { JsonObject, JsonPrimitive, JsonValue } from "./util/json.ts";
export type { FieldSpec, ObjectSchema, ValueSchema } from "./schema/value-schema.ts";
