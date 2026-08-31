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
  EmissionFacet,
  ExecutionRecordFacet,
  MailboxAppendResult,
  MailboxFacet,
  RuntimeStore,
  RuntimeTransaction,
  TransitionAuditFacet,
} from "./runtime-store.ts";
export { ExecutionAlreadyExistsError, RuntimeConcurrencyError, UnknownExecutionError } from "./runtime-store.ts";

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
