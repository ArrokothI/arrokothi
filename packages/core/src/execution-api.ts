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

// -- execution identity and lifecycle ----------------------------------------
export type { ActivationId, ExecutionId } from "./execution/ids.ts";
export { activationId, executionId, isActivationId, isExecutionId } from "./execution/ids.ts";
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
export type { ControllerProgress, DeferredSlots, ExecutionContext, ExecutionView, MailboxRef } from "./execution/context.ts";
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
  EventKind,
  WakeCondition,
} from "./interaction/event-envelope.ts";
export { eventSatisfiesWake } from "./interaction/event-envelope.ts";

// -- runtime -----------------------------------------------------------------
export { ControllerRegistry, UnknownControllerKindError } from "./runtime/controller-registry.ts";
export type { ActivationRecord, ActivationResultKind } from "./runtime/activation.ts";
export { Harness, HarnessRunawayError, UnknownDefinitionError } from "./runtime/harness.ts";
export type {
  CreateExecutionInput,
  DeliverEventInput,
  EventDeliveryReceipt,
  ExecutionHandle,
  HarnessOptions,
} from "./runtime/harness.ts";

// -- shared value domain -----------------------------------------------------
export type { JsonObject, JsonPrimitive, JsonValue } from "./util/json.ts";
export type { FieldSpec, ObjectSchema, ValueSchema } from "./schema/value-schema.ts";
