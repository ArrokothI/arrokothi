/**
 * Kernel-owned ports.
 *
 * Everything here is an interface the kernel defines and a deployment implements. The dependency
 * direction is one-way: implementations depend on these ports, never the reverse, so no provider,
 * database, framework, or sandbox type can reach kernel semantics.
 */

export type { Clock } from "./clock.ts";
export { nowIso } from "./clock.ts";

export type { IdGenerator } from "./ids.ts";
export { ID_PREFIXES } from "./ids.ts";

export type { DefinitionStore } from "./definition-store.ts";
export { DefinitionIntegrityError, DefinitionVersionConflictError } from "./definition-store.ts";

export type {
  ControllerResumptionFacet,
  EffectJournalFacet,
  EmissionFacet,
  ExecutionRecordFacet,
  MailboxAppendResult,
  MailboxFacet,
  PendingOperationFacet,
  RuntimeStore,
  RuntimeTransaction,
  TransitionAuditFacet,
} from "./runtime-store.ts";
export {
  ExecutionAlreadyExistsError,
  RuntimeConcurrencyError,
  UnknownControllerResumptionError,
  UnknownExecutionError,
  UnknownPendingOperationError,
} from "./runtime-store.ts";

export type { CapabilityExecutor } from "./capability-executor.ts";
export { UnknownCapabilityError } from "./capability-executor.ts";

// -- workflow stage, adapter, and local resource boundaries ------------------
export type {
  FunctionStageImplementation,
  FunctionStageOutcome,
  FunctionStageRegistry,
  StageActivationFacts,
  StageExecutionContext,
} from "./stage.ts";
export { emptyFunctionStageRegistry, functionStageOutcomeIssues } from "./stage.ts";
export type {
  AdapterContext,
  AdapterImplementation,
  AdapterPosition,
  AdapterRegistry,
  AdapterResult,
} from "./adapter.ts";
export { adapterResultIssues, emptyAdapterRegistry } from "./adapter.ts";
export type { LocalResource, LocalResourceEnvironment, LocalResourceView } from "./local-resource.ts";
export { emptyLocalResourceEnvironment, UnexposedLocalResourceError } from "./local-resource.ts";

export type { EffectAuthorizer } from "./effect-authorizer.ts";
export { denyAllEffects } from "./effect-authorizer.ts";

export type { CapabilityCatalog, CapabilityOperationDescriptor } from "./capability-catalog.ts";
export { emptyCapabilityCatalog } from "./capability-catalog.ts";

export type { InlineWaitBudget, InlineWaitResult } from "./inline-wait.ts";
export { microtaskInlineWaitBudget } from "./inline-wait.ts";

export type {
  AuthorizedCapabilityRequest,
  AuthorizedGrant,
  CapabilityCancellation,
  CapabilityExecutionEnvironment,
  ResourceAccessMode,
  ResourceBindingRef,
  SecurityProfile,
} from "../effects/capability.ts";
export type { CapabilityError, CapabilityOutcome } from "../effects/outcome.ts";
export { capabilityOutcomeIssues } from "../effects/outcome.ts";

export type {
  AuthorizationConstraints,
  AuthorizationDecision,
  EffectAuthorizationRequest,
} from "../effects/authorization.ts";

export type { ActivationClaim, Scheduler } from "./scheduler.ts";
export { UnknownClaimError } from "./scheduler.ts";

export type {
  ActivationBudget,
  ActivationInput,
  ActivationMetadata,
  ActivationOutcome,
  CancellationSignal,
  ControllerNext,
  ExecutionController,
} from "./controller.ts";

export type {
  ControllerResumptionAttempt,
  ControllerResumptionScope,
  ControllerResumptionWork,
} from "./controller-resumption.ts";
export type { ControllerResumptionFailure } from "../execution/resumption.ts";

// -- model resolution and provider invocation -------------------------------
export type { ModelResolver } from "./model-resolver.ts";
export type { ModelProvider, ModelProviderLookup } from "./model-provider.ts";
export type {
  LogicalModelRef,
  LogicalModelRequest,
  ModelCapabilityCall,
  ModelCapabilitySpec,
  ModelDiagnostics,
  ModelLimits,
  ModelMessage,
  ModelMessageRole,
  ModelOutput,
  ModelProviderRequest,
  ModelProviderResponse,
  ModelRequirementLevel,
  ModelRequirements,
  ModelResolutionRequest,
  ModelResponseMetadata,
  ModelStructuredOutputRequest,
  ModelUsage,
  PortableModelFeature,
  PortableModelFeatures,
  ResolvedModel,
} from "../model/types.ts";
export { PORTABLE_MODEL_FEATURES } from "../model/types.ts";
export type {
  ModelInvocationErrorCode,
  ModelInvocationErrorOptions,
  ModelResolutionErrorCode,
  ModelResolutionErrorOptions,
} from "../model/errors.ts";
export { ModelInvocationError, ModelResolutionError } from "../model/errors.ts";
export {
  assertModelProviderRequest,
  assertModelRequirementsSupported,
  optionalModelFeatures,
  requiredModelFeatures,
  unavailableOptionalModelFeatures,
  unsupportedRequiredModelFeatures,
  validateModelProviderResponse,
} from "../model/validation.ts";
